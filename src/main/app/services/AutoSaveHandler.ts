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
 * Tracks in-flight push+snapshot operations per script root using a
 * promise-chain design.
 *
 * - `latestDocument`: the most-recently requested document for this root.
 *   Updated by {@link scheduleForRoot} whenever a new save arrives while an
 *   operation is already running.  The drain loop compares its own snapshot of
 *   the document against this field after each `await`; if they differ, the
 *   loop iterates for the newer document ("latest save wins").
 * - `tail`: the Promise representing the currently running chain.  Held here
 *   so the entry is never deleted before the chain has completed.
 *
 * The entry is created when the first save for a root arrives and deleted
 * inside the same synchronous continuation that detects an empty queue, so
 * there is no window in which a newly enqueued document can be silently dropped.
 */
interface RootQueue {
  latestDocument: vscode.TextDocument;
  tail: Promise<void>;
}

/**
 * Per-script-root operation queues.  Keyed by `ScriptRoot.rootUri.toString()`.
 */
const rootQueues = new Map<string, RootQueue>();

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
 * Enqueues an auto-save operation for the given `rootKey`.
 *
 * If no chain exists for the root, a new one is created and started.
 * If a chain is already running, `queue.latestDocument` is updated and the
 * running drain loop will pick up the change after its current `await`
 * settles — without any separate flags or delete-then-check steps.
 *
 * The entry in {@link rootQueues} is removed inside the same synchronous
 * continuation that detects an empty queue (i.e., right after the while
 * condition evaluates to false), so there is no window between "queue looks
 * empty" and "entry deleted" during which a new arrival could be lost.
 *
 * @param rootKey  `ScriptRoot.rootUri.toString()` for the owning script root.
 * @param document The document that triggered this execution.
 * @lastreviewed null
 */
function scheduleForRoot(rootKey: string, document: vscode.TextDocument): void {
  const existing = rootQueues.get(rootKey);

  if (existing !== undefined) {
    // A chain is already running for this root.  Update the latest-document
    // slot; the drain loop will process it after the current operation settles.
    existing.latestDocument = document;
    return;
  }

  // No chain running – create one and start it.
  const queue: RootQueue = { latestDocument: document, tail: Promise.resolve() };
  rootQueues.set(rootKey, queue);

  /**
   * Drain loop: keep executing as long as a newer document was queued while
   * the previous execution was in flight.  Cleans up {@link rootQueues} once
   * the queue is truly empty.
   */
  const drainQueue = async (): Promise<void> => {
    let lastProcessed: vscode.TextDocument | null = null;

    while (queue.latestDocument !== lastProcessed) {
      lastProcessed = queue.latestDocument;
      await executeAutoSave(lastProcessed);
      // After the await, `queue.latestDocument` may have been updated by a
      // concurrent debounce timer.  If so, the while condition re-enters the
      // loop for the newer document.
    }

    // The queue is empty.  Remove the entry in the same synchronous tick so
    // that any macrotask arriving after this point creates a fresh chain.
    rootQueues.delete(rootKey);
  };

  queue.tail = drainQueue();
}

/**
 * Handles the auto-save feature.  When enabled via the
 * `bsjs-push-pull.autoSave.enabled` setting, a push and snapshot are triggered
 * automatically every time a B6P script file is saved.
 *
 * Rapid successive saves are debounced per document ({@link DEBOUNCE_DELAY_MS}).
 * Overlapping operations against the same script root are serialized via a
 * promise-chain per root (see {@link scheduleForRoot}): the chain's drain loop
 * holds the latest-requested document in {@link RootQueue.latestDocument} and
 * continues executing until no newer document arrived during the last operation,
 * at which point the queue entry is removed atomically within the same
 * synchronous continuation — eliminating the window in which a newly queued
 * document could be silently dropped.
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

    scheduleForRoot(rootKey, document);
  }, DEBOUNCE_DELAY_MS);

  debounceTimers.set(docKey, timer);
}
