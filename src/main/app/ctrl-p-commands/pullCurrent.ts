import * as vscode from 'vscode';
import { App } from '../App';
import { ScriptFactory } from '../util/script/ScriptFactory';
import { gitPull } from '../util/GitUtil';
import { Alert } from '../util/ui/Alert';
import pullScript from './pull';
export default async function (): Promise<void> {
  try {
    const workspaceUri = vscode.workspace.workspaceFolders![0]!.uri;
    const activeEditorUri = vscode.window.activeTextEditor!.document.uri;
    if (workspaceUri === undefined) {
      vscode.window.showErrorMessage('No source path provided');
      return;
    }
    const sr = ScriptFactory.createFile(activeEditorUri).getScriptRoot();

    // If the draft folder has a package.json with a `repository` field, use git pull instead
    // of the normal WebDAV pull.
    const gitRepo = await sr.getDraftGitRepository();
    if (gitRepo !== null) {
      App.logger.info(`Git repository detected (${gitRepo}); running git pull in script root folder.`);
      const rootPath = sr.getRootUri().fsPath;
      const result = await gitPull(rootPath);
      App.logger.info(`git pull stdout: ${result.stdout}`);
      result.stderr && App.logger.info(`git pull stderr: ${result.stderr}`);
      Alert.popup(`Git pull complete!\n\n${result.stdout || result.stderr || 'No output.'}`);
      return;
    }

    await pullScript(await sr.toScriptBaseRemoteString());
  } catch (e) {
    if (e instanceof Error) {
      vscode.window.showErrorMessage(`Error pulling current file: ${e.message}`);
      console.error('Pull current file error:', e.stack || e.message || e);
    } else {
      vscode.window.showErrorMessage(`Error pulling current file: ${e}`);
      console.error('Pull current file error:', e);
    }
    throw e;
  }
}