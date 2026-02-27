import * as vscode from 'vscode';
import { App } from '../App';
import pushScript from '../ctrl-p-commands/push';
import { Err } from '../util/Err';
import { ScriptFactory } from '../util/script/ScriptFactory';

/**
 * Milliseconds to wait after the last save event for a given document before
 * the push+snapshot operation is triggered.  Any additional save events that
 * arrive during this window reset the timer ("latest save wins").
 */
const DEBOUNCE_DELAY_MS = 300;

/**
 * Per-document debounce timers.  Keyed by the string form of the saved
 * document's URI.
 */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Tracks in-flight and pending push+snapshot operations per script root.
 *
 * - `running`: an operation is currently executing for this root.
 * - `pending`: the most-recently queued document that is waiting to be
 *              processed once `running` becomes false.  Only the latest
 *              document is kept; earlier pending ones are dropped.
 */
interface RootSerialState {
  running: boolean;
  pending: vscode.TextDocument | null;
}

/**
 * Per-script-root serialization state.  Keyed by `ScriptRoot.rootUri.toString()`.
 */
const rootSerialStates = new Map<string, RootSerialState>();

/**
 * Performs the actual push + compile-draft + snapshot sequence for one document.
 * All errors are handled internally; this function never rejects.
 *
 * @param document The document to push and snapshot.
 * @lastreviewed null
 */
async function executeAutoSave(document: vscode.TextDocument): Promise<void> {
  try {
    const sr = ScriptFactory.createScriptRoot(document.uri);
    const overrideFormulaUrl = await sr.toScriptBaseRemoteString();

    App.logger.info(`Auto-save: pushing ${document.uri.fsPath}`);

    // Regular push (silent – no completion popup)
    await pushScript({ overrideFormulaUrl, skipMessage: true, scriptRoot: sr });

    App.logger.info(`Auto-save: snapshotting ${document.uri.fsPath}`);

    // Compile draft folder, then push as snapshot (silent)
    await sr.compileDraftFolder();
    await pushScript({ overrideFormulaUrl, skipMessage: true, isSnapshot: true, scriptRoot: sr });

    App.logger.info(`Auto-save: completed for ${document.uri.fsPath}`);
  } catch (e) {
    if (e instanceof Err.AlreadyAlertedError) {
      // Error was already surfaced to the user by a lower-level call; nothing more to do.
      return;
    }
    // Silently skip files that are not part of a B6P script root.
    // In debug mode, log the reason so developers can diagnose unexpected failures.
    App.isDebugMode() && App.logger.info(`Auto-save: skipping ${document.uri.fsPath}: ${e}`);
  }
}

/**
 * Runs the auto-save operation for `document`, then drains any pending document
 * that arrived while this operation was running.  Cleans up `rootSerialStates`
 * once the queue is empty.
 *
 * @param rootKey  `ScriptRoot.rootUri.toString()` for the owning script root.
 * @param document The document that triggered this execution.
 * @lastreviewed null
 */
async function runSerially(rootKey: string, document: vscode.TextDocument): Promise<void> {
  await executeAutoSave(document);

  // Drain any pending document that arrived while we were running.
  let state = rootSerialStates.get(rootKey);
  while (state !== undefined && state.pending !== null) {
    const next = state.pending;
    state.pending = null;
    await executeAutoSave(next);
    // Re-read state in case a new pending was set during the await above.
    state = rootSerialStates.get(rootKey);
  }

  rootSerialStates.delete(rootKey);
}

/**
 * Handles the auto-save feature.  When enabled via the
 * `bsjs-push-pull.autoSave.enabled` setting, a push and snapshot are triggered
 * automatically every time a B6P script file is saved.
 *
 * Rapid successive saves are debounced per document ({@link DEBOUNCE_DELAY_MS}).
 * Overlapping operations against the same script root are serialized with a
 * single-slot pending queue (latest save wins): if an operation is already
 * running for a root, the incoming document replaces any previously queued
 * pending document and will be processed once the running operation finishes.
 *
 * Non-B6P files are silently ignored so that normal VS Code saves are
 * unaffected.
 *
 * @param document The document that was just saved.
 * @lastreviewed null
 */
export function handleAutoSave(document: vscode.TextDocument): void {
  if (!App.settings.get('autoSave').enabled) {
    return;
  }

  const docKey = document.uri.toString();

  // Clear any existing debounce timer for this document.
  const existingTimer = debounceTimers.get(docKey);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
  }

  // (Re-)start the debounce timer.  Only the most recent save within the
  // DEBOUNCE_DELAY_MS window will proceed to the serial-execution stage.
  const timer = setTimeout(() => {
    debounceTimers.delete(docKey);

    // Resolve the script-root key synchronously so we can key per root.
    // createScriptRoot throws for non-B6P files; catch and bail out silently.
    let rootKey: string;
    try {
      const sr = ScriptFactory.createScriptRoot(document.uri);
      rootKey = sr.rootUri.toString();
    } catch {
      return;
    }

    const existing = rootSerialStates.get(rootKey);
    if (existing?.running) {
      // An operation is already in flight for this root.  Stash this document
      // as the pending "next" work, replacing any previously pending document.
      existing.pending = document;
      return;
    }

    // No operation running – start one.
    const state: RootSerialState = { running: true, pending: null };
    rootSerialStates.set(rootKey, state);
    void runSerially(rootKey, document);
  }, DEBOUNCE_DELAY_MS);

  debounceTimers.set(docKey, timer);
}
