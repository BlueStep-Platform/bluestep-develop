import * as vscode from 'vscode';
import { App } from '../App';
import { Util } from '../util/';
import { ScriptUrlParser } from "../util/data/ScriptUrlParser";
import { ScriptFactory } from '../util/script/ScriptFactory';
import { ScriptRoot } from '../util/script/ScriptRoot';
import { Alert } from '../util/ui/Alert';
import { ProgressHelper } from '../util/ui/ProgressHelper';
import { gitPull } from '../util/GitUtil';
/**
 * Pulls files from a WebDAV location to the local workspace.
 * @param overrideFormulaUri The URI to override the default formula URI.
 * @returns A promise that resolves when the pull is complete.
 */
export default async function (overrideFormulaUri?: string): Promise<void> {
  try {
    const scriptUrlParser = await getStartingParser(overrideFormulaUri);
    if (scriptUrlParser === null) {
      return;
    }

    // If this script already lives locally with a git-managed draft, use git pull instead
    // of the WebDAV pull.  getU() / getScriptName() results are cached, so the subsequent
    // WebDAV fetch will not repeat these network calls.
    const U = await scriptUrlParser.getU();
    const scriptName = await scriptUrlParser.getScriptName();
    const workspaceUri = Util.getActiveWorkspaceFolderUri();
    const potentialScriptRoot = ScriptRoot.fromRootUri(vscode.Uri.joinPath(workspaceUri, U, scriptName));
    const gitRepo = await potentialScriptRoot.getDraftGitRepository();
    if (gitRepo !== null) {
      App.logger.info(`Git repository detected (${gitRepo}); running git pull in script root folder.`);
      const rootPath = potentialScriptRoot.getRootUri().fsPath;
      const result = await gitPull(rootPath);
      App.logger.info(`git pull stdout: ${result.stdout}`);
      result.stderr && App.logger.info(`git pull stderr: ${result.stderr}`);
      Alert.popup(`Git pull complete!\n\n${result.stdout || result.stderr || 'No output.'}`);
      return;
    }

    const fetchedScriptObject = await scriptUrlParser.getScript();
    if (fetchedScriptObject === null) {
      App.logger.warn("fetchedScriptObject is null");
      return;
    }
    const ultimateUris: vscode.Uri[] = [];
    // Create tasks for progress helper
    const pullTasks = fetchedScriptObject.map(path => ({
      execute: async () => {
        const createdUri = await createOrUpdateIndividualNode(path.localPath, scriptUrlParser);
        ultimateUris.push(createdUri);
        return createdUri;
      },
      description: `scripts`
    }));

    await ProgressHelper.withProgress(pullTasks, {
      title: "Pulling Script...",
      cleanupMessage: "Cleaning up the local folder..."
    });

    const directory = ScriptFactory.createFolder(
      vscode.Uri.joinPath(
        Util.getActiveWorkspaceFolderUri(),
        await scriptUrlParser.getU(),          //NOTE this will have already been cached
        await scriptUrlParser.getScriptName(), //NOTE this will have already been cached
        "/"
      )
    );
    const flattenedDirectory = await Util.flattenDirectory(directory);
    await cleanUnusedLocalPaths(flattenedDirectory, ultimateUris);

    !(App.settings.get("squelch").pullComplete) && Alert.popup('Pull complete!');
  } catch (e) {
    Alert.error(`Error pulling files: ${e instanceof Error ? e.stack || e.message || e : e}`);
    throw e;
  }
}

/**
 * Cleans up unused paths by deleting them from the filesystem.
 * @param existingPaths 
 * @param validPaths 
 */
async function cleanUnusedLocalPaths(existingPaths: vscode.Uri[], validPaths: vscode.Uri[]) {
  // find all existing paths that are not in the valid paths list
  const toDelete: vscode.Uri[] = [];
  for (const ep of existingPaths) {
    const node = ScriptFactory.createNode(ep);
    if (await node.isInGitIgnore()) {
      continue;
    }
    if ([ScriptRoot.METADATA_FILENAME, ScriptRoot.GITIGNORE_FILENAME].some(special => ep.fsPath.endsWith(special))) {
      continue;
    }
    if (!validPaths.find(vp => vp.fsPath === ep.fsPath)) {
      toDelete.push(ep);
    }
  }
  if (toDelete.length !== 0) {
    const YES_OPTION = "Yes";
    const NO_OPTION = "No";
    const prompt = await Alert.prompt(
      `The pull operation has detected files that are no longer present in the source. Do you want to delete these files from your local workspace?
      
      ${toDelete.map(d => `\n- ${d.fsPath}`).join("")}
      `,
      [YES_OPTION, NO_OPTION],
    );
    if (prompt !== YES_OPTION) {
      Alert.info("User chose not to delete unused paths");
      return;
    }
    // delete all unused paths
    for (const del of toDelete) {
      App.logger.warn("Deleting unused path:" + del.fsPath);
      vscode.workspace.fs.delete(del, { recursive: true, useTrash: false });
    }
  }

}

/**
 * gets the URL for the pull operation. if we don't get an override URI we ask the user to provide one.
 * @param overrideFormulaUrl 
 * @returns 
 */
async function getStartingParser(overrideFormulaUrl?: string) {
  const formulaURL = overrideFormulaUrl || await vscode.window.showInputBox({ prompt: 'Paste in the desired formula URL' });
  if (formulaURL === undefined) {
    vscode.window.showErrorMessage('No formula URL provided');
    return null;
  }
  return new ScriptUrlParser(formulaURL);
}

async function createOrUpdateIndividualNode(localRest: string, parser: ScriptUrlParser): Promise<vscode.Uri> {
  if (App.isDebugMode()) {
    App.logger.debug("createOrUpdateIndividualNode for localRest:", localRest);
    App.logger.debug("with parser:", parser.toString());
  }
  const activePath = Util.getActiveWorkspaceFolderUri();
  const U = await parser.getU();
  const ultimatePath = vscode.Uri.joinPath(activePath, U, localRest);

  // this needs to be a forward slash because that is what the parser works on a raw URL string and produces the trailing
  // slash if it is a directory
  const isDirectory = ultimatePath.toString().endsWith("/");

  if (isDirectory) {
    let dirExists = false;
    try {
      const stat = await vscode.workspace.fs.stat(ultimatePath);
      dirExists = stat.type === vscode.FileType.Directory;
    } catch (e) {
      // swallow this error. We need to find a better way to determine
      // if the reason for this error is that the directory exists or not, but I couldn't
      // find some analog of `optFolderExists()`
    }
    if (!dirExists) {
      await vscode.workspace.fs.createDirectory(ultimatePath);
    }
  } else {
    const sf = ScriptFactory.createFile(ultimatePath);
    if (await sf.exists() && await sf.currentIntegrityMatches()) {
      App.logger.info("File integrity matches; skipping:", ultimatePath.fsPath);
      await sf.touch("lastPulled");
      return sf.uri();
    }
    await sf.download(parser);
  }
  return ultimatePath;
}

