import * as path from 'path';
import * as vscode from 'vscode';
import type { SourceOps } from '../../../../types';
import { App } from '../App';
import { SESSION_MANAGER as SM } from '../b6p_session/SessionManager';
import { Util } from '../util';
import { LocalUriParser } from '../util/data/LocalUriParser';
import { ScriptUrlParser } from '../util/data/ScriptUrlParser';
import { Err } from '../util/Err';
import { ScriptFactory } from '../util/script/ScriptFactory';
import { ScriptRoot } from '../util/script/ScriptRoot';
import { Alert } from '../util/ui/Alert';
import { ProgressHelper } from '../util/ui/ProgressHelper';

/**
 * Options for the {@link pushScript} function.
 */
interface PushScriptOptions {
  overrideFormulaUrl?: string;
  sourceOps?: SourceOps;
  skipMessage?: boolean;
  isSnapshot?: boolean;
  scriptRoot?: ScriptRoot;
  force?: boolean;
  onlyChanged?: boolean;
  /**
   * When `true`, the remote cleanup step (which may show a modal confirmation
   * prompt) is skipped entirely.  Use this for automated (non-interactive)
   * pushes such as the auto-save feature.
   */
  skipCleanup?: boolean;
}

/**
 * Pushes a script to a WebDAV location.
 * @param overrideFormulaUri The URI to override the default formula URI.
 * @param sourceOps The options for overriding the source location
 * @param skipCleanup When `true`, the remote cleanup step (which may show a
 *   modal confirmation prompt) is skipped entirely.  Use this for automated
 *   (non-interactive) pushes such as the auto-save feature.
 * @returns A promise that resolves when the push is complete.
 * @lastreviewed null
 */
export default async function ({ overrideFormulaUrl, sourceOps, skipMessage, isSnapshot, scriptRoot, force, onlyChanged, skipCleanup }: PushScriptOptions): Promise<void> {
  try {
    let sr: ScriptRoot;
    const targetFormulaOverride = overrideFormulaUrl || await vscode.window.showInputBox({ prompt: 'Paste in the target formula URI' });
    if (targetFormulaOverride === undefined) {
      Alert.error('No target formula URI provided');
      return;
    }
    if (scriptRoot) {
      sr = scriptRoot;
    } else {
      const sourceEditorUri = await Util.getLocalFileUri(sourceOps);
      if (sourceEditorUri === undefined) {
        Alert.error('No source path provided');
        return;
      }
      App.logger.info(Util.printLine({ ret: true }) as string + "Pushing script for: " + sourceEditorUri.toString());
      sr = ScriptFactory.createScriptRoot(sourceEditorUri);
    }

    const detectedIssues = await sr.preflightCheck();
    if (detectedIssues) {
      Alert.popup(detectedIssues);
      return;
    }
    const snList = await sr.getPushableNodes(isSnapshot, onlyChanged);

    // Create tasks for progress helper
    const pushTasks = snList.map(sn => ({
      execute: () => sn.upload({ remoteUrlOverrideString: targetFormulaOverride, isSnapshot, force }),
      description: `scripts`
    }));

    await ProgressHelper.withProgress(pushTasks, {
      title: "Pushing Script...",
      cleanupMessage: "Cleaning up the remote draft folder..."
    });

    if (!skipCleanup) {
      await cleanupUnusedRemotePaths(sr.getRootUri(), targetFormulaOverride, isSnapshot);
    }

    if (!skipMessage) {
      !(App.settings.get("squelch").pushComplete) && Alert.popup(isSnapshot ? 'Snapshot complete!' : 'Push complete!');
    }
  } catch (e) {
    if (!(e instanceof Err.AlreadyAlertedError)) {
      Alert.error(`Error pushing files: ${e}`);
    }
    throw e;
  }
}

/**
 * the objective of this function is to remove remote paths that no longer have a local counterpart
 * @param localRootFolderUri 
 * @param remoteRootUrlString 
 */
async function cleanupUnusedRemotePaths(localRootFolderUri?: vscode.Uri, remoteRootUrlString?: string, isSnapshot: boolean = false): Promise<void> {
  if (!localRootFolderUri || !remoteRootUrlString) {
    throw new Err.CleanupParametersError();
  }
  const remoteObj = new ScriptUrlParser(remoteRootUrlString);
  /**
   * this will give us a list of that are currently present on remote
   */
  const getScriptRet = await remoteObj.getScript();
  if (!getScriptRet) {
    throw new Err.CleanupScriptError();
  }
  const rawFilePaths = getScriptRet;
  const directory = ScriptFactory.createFolder(localRootFolderUri);
  const flattenedLocal = await Util.flattenDirectory(directory);
  // here's where the clever part comes in. We've just fetched the remote paths AFTER we pushed the new stuff.
  // which gives us the definitive list of what is remote and also where they should be located locally.
  // So we simply use what is local as a "source of truth" and then send a webdav DELETE request for
  // any unmatched brothers.

  const pathsToDelete = new Set<string>();
  for (const rawFilePath of rawFilePaths) {
    // note that the only thing with an undefined trailing should be the root itself
    const curPath = vscode.Uri.joinPath(localRootFolderUri, rawFilePath.trailing || path.sep);
    const localPath = flattenedLocal.find(dp => dp.fsPath === curPath.fsPath);
    if (!localPath) {
      // we don't want to delete stuff that is in gitignore
      const parser = new LocalUriParser(localRootFolderUri);
      const sf = ScriptFactory.createFile(vscode.Uri.joinPath(parser.prependingPathUri(), rawFilePath.localPath), directory.getScriptRoot());
      if (await sf.isInGitIgnore()) {
        App.logger.info(`File is in .gitignore; skipping deletion: ${rawFilePath.remotePath}`);
        continue;
      } else if (await sf.isInDraftInfoOrObjects()) {
        App.logger.info(`File is in Info or Objects folder; skipping deletion: ${rawFilePath.remotePath}`);
        continue;
      } else if (!isSnapshot) {
        const inBuildFolder = await sf.isInItsRespectiveBuildFolder();
        if (inBuildFolder) {
          App.logger.info(`File is in build folder; skipping deletion: ${rawFilePath.remotePath}`);
          continue;
        }
      } else if (isSnapshot) {
        //TODO check for snapshot versions to cleanup
      }
      
      // If there's no matching local path, we need to delete the remote path
      App.logger.info(`No matching local path found for remote path: ${rawFilePath.remotePath}. Deleting remote path.`);
      pathsToDelete.add(rawFilePath.remotePath);
    }
  }

  if (pathsToDelete.size === 0) {
    App.logger.info("No unused remote paths to delete.");
    return;
  }

  const YES_OPTION = "Yes";
  const NO_OPTION = "No";
  const prompt = await Alert.prompt(
    `The following remote paths are unused and will be deleted:
    
    ${Array.from(pathsToDelete).join('\n')}
    
    Do you wish to proceed?`,
    [YES_OPTION, NO_OPTION]
  );

  if (prompt !== YES_OPTION) {
    Alert.info("User chose not to delete unused remote paths. Consider cleaning up manually.");
    return;
  }

  const deleteResults = await Promise.allSettled(Array.from(pathsToDelete).map(async (remotePath) => {
    App.logger.info("Deleting unused remote path:" + remotePath);
    const response = await SM.fetch(remotePath, { method: "DELETE" });
    try {
      if (!response.ok) {
        throw new Error(`Failed to delete remote path: ${remotePath} (status ${response.status})`);
      }
    } finally {
      try {
        // Drain the response body to allow the underlying connection to be reused.
        await response.arrayBuffer();
      } catch {
        // Ignore errors while draining the body; the main error (if any) is thrown above.
      }
    }
  }));

  const failures = deleteResults.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    const messages = failures.map(f => (f.reason instanceof Error ? f.reason.message : String(f.reason)));
    messages.forEach(msg => App.logger.error(msg));
    throw new Error(`Some remote paths could not be deleted:\n${messages.join('\n')}`);
  }
}


