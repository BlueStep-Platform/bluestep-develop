import * as vscode from 'vscode';
import { App } from '../App';
import { Util } from '../util';
import { ScriptFactory } from '../util/script/ScriptFactory';
import { Alert } from '../util/ui/Alert';
import pushScript from './push';
import { Err } from '../util/Err';
import type { ScriptRoot } from '../util/script/ScriptRoot';


/**
 * Pushes the current file (the one the editor is currently open to) to its associated WebDAV location.
 * @returns 
 */
export default async function (args? : {isSnapshot: boolean, sr: ScriptRoot}): Promise<void> {

  try {
    let actual_sr: ScriptRoot;
    if (args?.sr) {
      actual_sr = args.sr;
    } else {
      const activeEditorUri = Util.getActiveEditorUri();
      if (activeEditorUri === undefined) {
        return;
      }
      actual_sr = ScriptFactory.createScriptRoot(activeEditorUri);
    }
    const dirtyDocs = await Util.getDirtyDocs(actual_sr.getRootUri());
    if (dirtyDocs.length > 0) {
      const SAVE_AND_PUSH = 'Save and Push';
      const CANCEL = 'Cancel';
      const save = await vscode.window.showWarningMessage(
        `${dirtyDocs.length} files have unsaved changes. Save before pushing?\n ${dirtyDocs.map(doc => doc.uri.fsPath).join('\n ')}`,
        SAVE_AND_PUSH,
        CANCEL
      );
      if (save === SAVE_AND_PUSH) {
        await Promise.all(dirtyDocs.map(doc => doc.save()));
      } else if (save === CANCEL) {
        // we may want to save the current state of affairs here in order to implement some kind of "resume from..." functionality,
        // but for now just exit
        return;
      } else {
        return;
      }
    }
    const overrideFormulaUrl = await actual_sr.toScriptBaseRemoteString();
    await pushScript({ overrideFormulaUrl, isSnapshot: args?.isSnapshot });
  } catch(e) {
    if (e instanceof Err.AlreadyAlertedError) {
      return; // do nothing, already handled
    }
    if (e instanceof Error) { 
      Alert.error(`Error pushing current file: ${e.message}`);
      App.logger.error(e);
    } else {
      Alert.error(`Error pushing current file: ${e}`);
      App.logger.error('Push current file error: ' + e);
    }
  }
}
