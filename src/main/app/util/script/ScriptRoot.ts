import * as vscode from 'vscode';
import { Util } from '..';
import { ScriptMetaData, ScriptPackageJson } from '../../../../../types';
import { FileExtensions, FolderNames, SpecialFiles } from '../../../resources/constants';
import { App } from '../../App';
import { ORG_CACHE as OC } from '../../cache/OrgCache';
import pushCurrent from '../../ctrl-p-commands/pushCurrent';
import { LocalUriParser } from '../data/LocalUriParser';
import { OrgWorker } from '../data/OrgWorker';
import { ScriptUrlParser } from '../data/ScriptUrlParser';
import { Err } from '../Err';
import { FileSystem } from '../fs/FileSystem';
import { ScriptFactory } from './ScriptFactory';
import { ScriptFile } from './ScriptFile';
import type { ScriptFolder } from './ScriptFolder';
import { ScriptNode } from './ScriptNode';
import { ScriptTranspiler } from './ScriptTranspiler';
import { TsConfig } from './TsConfig';
const fs = FileSystem.getInstance;

/**
 * Object representing the root of an individual script on the filesystem.
 * 
 * This originally was the webdavid root file.
 * @lastreviewed 2025-09-15
 */
export class ScriptRoot {
  private static readonly ScriptContentFolders = [FolderNames.INFO, FolderNames.SCRIPTS, FolderNames.OBJECTS] as const;
  public static readonly METADATA_FILENAME = SpecialFiles.B6P_METADATA;
  public static readonly GITIGNORE_FILENAME = SpecialFiles.GITIGNORE;
  private _orgWorker: OrgWorker | null;
  public readonly rootUri: vscode.Uri;
  private parser: LocalUriParser;
  private scriptParser: ScriptUrlParser | null;
  /**
   * Creates a script root utilizing any of the children in said script.
   * 
   * The objective here is to use literally any file within the script's local
   * folder to extrapolate the root of the script.
   * 
   * @param childUri Any file within the local root folder
   * @lastreviewed 2025-09-15
   */
  constructor(public readonly uri: vscode.Uri) {
    this.parser = new LocalUriParser(uri);
    const shavedName = this.parser.getShavedName();
    this.rootUri = vscode.Uri.joinPath(vscode.Uri.file(shavedName), "/");
    this._orgWorker = null;
    this.scriptParser = null;
  }

  public orgWorker(): OrgWorker {
    if (this._orgWorker === null) {
      if (this.scriptParser !== null) {
        this._orgWorker = this.scriptParser.orgWorker();
        return this._orgWorker;
      }
      throw new Err.InvalidStateError("OrgWorker not initialized");
    }
    return this._orgWorker;
  }

  /**
   * Gets where the metadata file *should* be located.
   * @lastreviewed 2025-09-15
   */
  private getMetadataFileUri() {
    const localRoot = this.getRootUri();
    return vscode.Uri.joinPath(localRoot, ScriptRoot.METADATA_FILENAME);
  }

  /**
   * Gets where the .gitignore file *should* be located.
   * @lastreviewed 2025-09-15
   */
  private getGitIgnoreFileUri() {
    const localRoot = this.getRootUri();
    return vscode.Uri.joinPath(localRoot, SpecialFiles.GITIGNORE);
  }

  /**
   * Modifies the metadata for the script root.
   * It will also save any changes you make to the object passed to the callback function.
   * Creates a new metadata file with default values if it doesn't exist or is malformed.
   * Includes retry logic for file system operations.
   * 
   * @param callBack Optional callback function to modify the metadata object
   * @returns The current or modified metadata object
   * @throws {Err.FileNotFoundError} When file system operations fail after retries or for unexpected errors
   * @lastreviewed 2025-09-15
   */
  public async modifyMetaData(callBack?: ((meta: ScriptMetaData) => void)): Promise<ScriptMetaData> {
    const metadataFileUri = this.getMetadataFileUri();
    let contentObj: ScriptMetaData | undefined;
    let modified = false;
    try {
      try {
        await fs().stat(metadataFileUri);
      } catch (e) {
        throw new Err.FileNotFoundError("Metadata file does not exist");
      }
      // Retry mechanism for file reading
      let fileContents: Uint8Array;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          fileContents = await fs().readFile(metadataFileUri);

          // Check if we got valid contents
          if (fileContents && fileContents.length > 0) {
            const fileString = Buffer.from(fileContents).toString('utf-8');

            // Ensure we have a valid JSON string
            if (fileString.trim()) {
              try {
                contentObj = JSON.parse(fileString) as ScriptMetaData;
                break; // Successfully read and parsed
              } catch (jsonError) {
                // JSON parsing error - don't retry, treat as malformed file
                App.logger.warn("Malformed JSON in metadata file, creating new metadata");
                throw new Err.FileReadError("Malformed JSON in metadata file");
              }
            } else {
              // Empty string content - treat as malformed file
              App.logger.warn("Empty content in metadata file, creating new metadata");
              throw new Err.FileReadError("Empty content in metadata file");
            }
          } else {
            // Empty file - treat as malformed file 
            App.logger.warn("Empty metadata file, creating new metadata");
            throw new Err.FileReadError("Empty metadata file");
          }
        } catch (readError) {
          // Check if this is a JSON parsing error or file content error
          if (readError instanceof Err.FileReadError) {
            // Don't retry content/parsing errors, fall through to create new metadata
            throw readError;
          }

          // For other file system errors, retry
          attempts++;
          if (attempts >= maxAttempts) {
            throw readError; // Re-throw if we've exhausted retries
          }
          console.error(`File read error, retrying... (attempt ${attempts}/${maxAttempts}):`, readError);
          await Util.sleep(1_000); // Wait 1000ms before retry
        }
      }

      // If we get here without contentObj, we exhausted retries on file system errors
      if (!contentObj) {
        throw new Err.FileReadError("Failed to read file after multiple attempts");
      }

    } catch (e) {
      App.logger.error("Error reading metadata file: " + e);
      if (!(e instanceof Err.FileNotFoundError) && !(e instanceof Err.FileReadError)) {
        throw e;
      }
      App.logger.warn("Metadata file does not exist or is invalid; creating a new one.");
      let scriptName: string;
      let U: string;
      let webdavId: string;
      let scriptKey: { seqnum: string; classid: string; };

      if (this.scriptParser === null) {
        // the absence of a parser indicates that this is coming from a local file, thus these elements should exist
        // this should only happen if the user somehow deletes the `.b6p_metadata.json`
        const metaDataDotJson = await this.getAsFolder().getMetadataDotJson();
        scriptName = metaDataDotJson.displayName.replaceAll(/\/|\\/g, '_') || (() => { throw new Err.FileReadError("Missing displayName in metadata"); })();
        U = await this.getU() || (() => { throw new Err.FileReadError("Missing U in metadata"); })();
        webdavId = await this.getWebdavId() || (() => { throw new Err.FileReadError("Missing webdavId in metadata"); })();
        scriptKey = await this.getScriptKey() || (() => { throw new Err.FileReadError("Missing scriptKey in metadata"); })();
      } else {
        //only time this should be happening is on initial download
        scriptName = await this.scriptParser.getScriptName() || (() => { throw new Err.FileReadError("Missing script name and no parser available"); })();
        U = await this.scriptParser.getU() || (() => { throw new Err.FileReadError("Missing U and no parser available"); })();
        webdavId = this.scriptParser.webDavId || (() => { throw new Err.FileReadError("Missing webdavId and no parser available"); })();
        scriptKey = await this.scriptParser.getScriptBaseKey() || (() => { throw new Err.FileReadError("Missing scriptKey and no parser available"); })();
      }

      contentObj = {
        scriptName,
        U,
        webdavId,
        pushPullRecords: [],
        scriptKey,
      };
      modified = true;
    }
    if (callBack) {
      const preModified = JSON.parse(JSON.stringify(contentObj));
      callBack(contentObj);
      Util.isDeepEqual(preModified, contentObj) || (modified = true);
    }
    if (modified) {
      await fs().writeFile(this.getMetadataFileUri(), Buffer.from(JSON.stringify(contentObj, null, 2)));
    }
    return contentObj;
  }

  withParser(parser: ScriptUrlParser) {
    this.scriptParser = parser;
  }

  /**
   * Gets the metadata for the script root.
   * @lastreviewed 2025-09-15
   */
  public async getMetaData(): Promise<ScriptMetaData | null> {
    try {
      return await this.modifyMetaData();
    } catch (e) {
      if (e instanceof Err.ConfigFileError) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Modifies the .gitignore file, and creates a default if it does not exist.
   * Default .gitignore includes common patterns like .DS_Store files.
   * 
   * @param callBack Optional callback function to modify the current contents
   * @returns The modified contents of the .gitignore file as an array of strings
   * @lastreviewed 2025-09-15
   */
  public async modifyGitIgnore(callBack?: (currentContents: string[]) => void): Promise<string[]> {
    const gitIgnoreUri = this.getGitIgnoreFileUri();
    let currentContents: string[] = [];
    let modified = false;
    try {
      try {
        await fs().stat(gitIgnoreUri);
      } catch (e) {
        throw new Err.FileNotFoundError("Gitignore file does not exist at: `" + gitIgnoreUri.fsPath + "`");
      }
      const fileContents = await fs().readFile(gitIgnoreUri);
      const fileString = Buffer.from(fileContents).toString('utf-8');
      currentContents = fileString.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    } catch (e) {
      App.logger.error("Error reading .gitignore file: " + e);
      if (!(e instanceof Err.FileNotFoundError)) {
        throw e;
      }
      App.logger.warn(".gitignore file does not exist; creating a new one.");
      // set a default .gitignore
      currentContents = [
        "**/.DS_Store",
      ];
      modified = true;
    }
    const preModified = JSON.parse(JSON.stringify(currentContents));
    if (callBack) {
      callBack(currentContents);
      Util.isDeepEqual(preModified, currentContents) || (modified = true);
    }
    if (modified) {
      await fs().writeFile(this.getGitIgnoreFileUri(), Buffer.from(currentContents.join("\n") + "\n"));
    }
    return currentContents;
  }

  /**
   * Gets the contents of the .gitignore file for this script root as an array of strings.
   * @lastreviewed 2025-09-15
   */
  public async getGitIgnore(): Promise<string[]> {
    return await this.modifyGitIgnore();
  }

  /**
   * Gets the {@link vscode.Uri} for the local root folder.
   * @lastreviewed 2025-09-15
   */
  public getRootUri() {
    return this.rootUri;
  }

  /**
   * Gets the {@link vscode.Uri Uri} for the local U folder.
   *
   * @lastreviewed 2025-10-09
   */
  public getOrgUri() {
    return vscode.Uri.joinPath(this.getRootUri(), "..");
  }

  /**
   * The WebDAV ID extracted from the metadata file.
   * @throws an {@link Err.FileNotFoundError} if the metadata file is missing or malformed.
   * @lastreviewed 2025-10-09
   */
  async getWebdavId() {
    if (this.scriptParser !== null) {
      return this.scriptParser.webDavId;
    }
    const metadata = await this.getMetaData();
    if (!metadata) {
      throw new Err.InvalidStateError("Missing metadata");
    }
    return metadata.webdavId || (() => { throw new Err.InvalidStateError("Missing webdavId in metadata"); })();
  }

  /**
   * Gets the script key from 
   * - the script parser (if available)
   * - the metadata file (if available)
   * - by instantiating a script parser from the remote URL (if a webdavId is available)
   */
  async getScriptKey() {
    if (this.scriptParser !== null) {
      return this.scriptParser.getScriptBaseKey();
    }
    const metadata = await this.getMetaData();
    if (!metadata) {
      throw new Err.InvalidStateError("Missing metadata");
    }
    const potentialKey = metadata.scriptKey;
    if (potentialKey) {
      return potentialKey;
    }
    try {
      // this will fail if there is no webdavId.
      this.scriptParser = new ScriptUrlParser((await this.toScriptBaseRemoteUrl()).toString());
      const key = await this.scriptParser.getScriptBaseKey();
      await this.modifyMetaData(meta => {
        meta.scriptKey = key;
      });
      return key;
    } catch (e) {
      throw new Err.FileReadError("Can't obtain scriptKey in metadata, even after trying to instantiate a scriptParser.");
    }
  }

  /**
   * The WebDAV ID extracted from the metadata file.
   * @throws an {@link Err.FileNotFoundError} if the metadata file is missing or malformed.
   * @lastreviewed 2025-10-09
   */
  async getU() {
    const metadata = await this.getMetaData();
    if (!metadata) {
      return await this.orgWorker().getU();
    }
    return metadata.U || (() => { throw new Err.InvalidStateError("Missing origin in metadata"); })();
  }

  /**
   * The domain extracted from the file path.
   *
   * @lastreviewed 2025-10-15
   */
  public async anyOrigin() {
    return await OC.getAnyBaseUrl(await this.getU());
  }

  public getAsFolder(): ScriptFolder {
    return ScriptFactory.createFolder(vscode.Uri.joinPath(this.getRootUri(), "/"), this);
  }

  /**
   * Returns a base URL string suitable for pull and push operations to the appropriate org.
   * @lastreviewed 2025-09-15
   */
  public async toScriptBaseRemoteString() {
    const origin = await this.anyOrigin();
    const webdavId = await this.getWebdavId();
    return `${origin.toString()}files/${webdavId}/`;
  }

  /**
   * Returns a base {@link URL} suitable for pull and push operations.
   * @lastreviewed 2025-09-15
   */
  public async toScriptBaseRemoteUrl(): Promise<URL> {
    const urlString = await this.toScriptBaseRemoteString();
    return new URL(urlString);
  }

  /**
   * Creates a ScriptRoot from a root {@link vscode.Uri}.
   * @param rootUri The root {@link vscode.Uri} to create the ScriptRoot from
   * @lastreviewed 2025-09-15
   */
  static fromRootUri(rootUri: vscode.Uri) {
    return ScriptFactory.createScriptRoot(vscode.Uri.joinPath(rootUri, "/"));
  }


  /**
   * Generic helper to get the contents of a folder.
   * @param folderName The name of the folder to read contents from
   * @returns Array of URIs for files and folders within the specified folder
   * @lastreviewed 2025-09-15
   */
  private async getDraftFolderContents(folderName: typeof ScriptRoot.ScriptContentFolders[number]): Promise<vscode.Uri[]> {
    const folder = this.getDraftFolder().getChildFolder(folderName);
    const dirContents = await fs().readDirectory(folder);
    return dirContents.map(([name, _type]) => vscode.Uri.joinPath(folder.uri(), name));
  }

  /**
   * Gets the info {@link ScriptFolder} in the draft directory.
   */
  public async getDraftInfoFolder() {
    return this.getDraftFolder().getChildFolder("info");
  }

  /**
   * Gets the contents of the info  in the draft directory.
   * @lastreviewed 2025-09-15
   */
  public async getDraftInfoFolderContents() {
    return this.getDraftFolderContents("info");
  }

  /**
   * Gets the scripts {@link ScriptFolder} in the draft directory.
   * @lastreviewed 2025-10-01
   */
  public async getDraftScriptsFolder() {
    return this.getDraftFolder().getChildFolder("scripts");
  }


  /**
   * Gets the {@link vscode.Uri}s of the scripts folder.
   * @lastreviewed 2025-10-01
   */
  public async getScriptsFolderContents() {
    return this.getDraftFolderContents("scripts");
  }

  public async getObjectsFolder() {
    return this.getDraftFolder().getChildFolder("objects");
  }

  /**
   * Gets the {@link vscode.Uri}s of the objects folder.
   * @lastreviewed 2025-10-01
   */
  public async getDraftObjectsFolderContents() {
    return this.getDraftFolderContents("objects");
  }

  /**
   * Determines if this script root is for a file that is in good condition.
   * Validates that the info folder contains exactly 3 required files (metadata.json, permissions.json, config.json)
   * and that the objects folder contains exactly one file (imports.ts).
   * @lastreviewed 2025-10-01
   */
  public async isCopacetic(): Promise<boolean> {
    const infoContent = await this.getDraftInfoFolderContents();
    const objectsContent = await this.getDraftObjectsFolderContents();
    const reasonsWhyBad: string[] = [];
    if (infoContent.length !== 3) {
      reasonsWhyBad.push("`info` folder must have 3 elements");
    }
    SpecialFiles.SCRIPT_FILES.forEach(expectedFile => {
      if (!infoContent.some(file => file.path.endsWith(expectedFile))) {
        reasonsWhyBad.push(`Info folder is missing expected file: ${expectedFile}`);
      }
    });
    if (objectsContent.length !== 1) {
      reasonsWhyBad.push("`objects` folder must have exactly one file");
    }
    if (!objectsContent.map(v => v.path).some(path => path.endsWith("imports.ts"))) {
      reasonsWhyBad.push("`objects` folder must contain an imports.ts file");
    }
    if (reasonsWhyBad.length > 0) {
      App.logger.warn(`Script at ${this.getRootUri().fsPath} is not copacetic:`);
      reasonsWhyBad.forEach(reason => App.logger.warn(` - ${reason}`));
    }
    if (reasonsWhyBad.length === 0) {
      return true;
    }
    App.logger.warn("Script is not copacetic" + reasonsWhyBad.join("; "));
    return false;
  }

  /**
   * Checks if this {@link ScriptRoot} is morally equivalent to another {@link ScriptRoot}.
   * Compares origin, WebDAV ID, local root path, and remote URL.
   * 
   * @param b The other ScriptRoot to compare against
   * @lastreviewed 2025-09-15
   */
  equals(b: ScriptRoot) {
    return this.rootUri.fsPath === b.rootUri.fsPath;
  }

  /**
   * Performs the "snapshot" operation by compiling the draft folder and pushing
   * its contents to the server.
   * 
   * @lastreviewed 2025-10-13
   */
  public async snapshot() {
    await this.compileDraftFolder();
    await pushCurrent({ isSnapshot: true, sr: this });
  }

  /**
   * Deletes the relevant build folder (e.g. ".build") within the draft directory and its subcomponents.
   * Ignores FileNotFound errors if the folder doesn't exist.
   * 
   * @lastreviewed 2025-10-01
   */
  public async deleteBuildFolder() {
    try {
      return await fs().delete(await this.getDraftBuildFolder(), { recursive: true });
    } catch (error) {
      // Ignore FileNotFound errors - the folder doesn't exist, which is fine
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
        console.log("Build folder doesn't exist (this is fine)");
        return;
      }
      // Re-throw other unknown errors (like permission issues)
      throw error;
    }
  }

  /**
   * Compiles all TypeScript files in the draft folder and copies non-TypeScript files to its 
   * respective build folder.
   * 
   * Deletes the existing build folder first, then compiles TypeScript files using {@link ScriptTranspiler},
   * copies other relevant files, and cleans up any orphaned files in the build directory.
   * 
   * @lastreviewed 2025-09-15
   */
  public async compileDraftFolder(): Promise<void> {
    //TODO see if we can optimize this to only compile changed files
    await this.deleteBuildFolder();
    const draftFolder = this.getDraftFolder();
    const allDraftFiles = await draftFolder.flatten();
    const transpiler = new ScriptTranspiler();
    for (const file of allDraftFiles) {
      if (await file.isFile() && (file as ScriptFile).isMarkdown() ||
        await file.isInItsRespectiveBuildFolder() ||
        await file.isInDraftInfo() || // TODO delete this after this is obviated
        await file.isFolder()) {
        continue;
      }

      if ([FileExtensions.TYPESCRIPT, FileExtensions.TYPESCRIPT_JSX].some(ext => file.path().endsWith(ext))) {
        await transpiler.addFile(file);
      }
    }
    const emittedEntries = await transpiler.transpile();
    App.logger.info(`Transpiled ${emittedEntries.length} TypeScript files.`);
    App.logger.info(`Emitted Files: \n${emittedEntries.join("\n")}`);
    const emittedScriptNodes = emittedEntries.map(e => ScriptFactory.createNode(vscode.Uri.file(e), this));
    App.logger.info(`Emitted ScriptNodes: \n${emittedScriptNodes.map(n => n.path()).join("\n")}`);
    await this.tidyMetadataFile();
  }

  /**
   * Removes stale push/pull records from metadata that reference files no longer in the draft folder.
   * This ensures the metadata stays synchronized with the actual file system state.
   * 
   * @lastreviewed 2025-10-01
   */
  private async tidyMetadataFile() {
    const draftFolder = this.getDraftFolder();
    const draftFiles = (await draftFolder.flattenRaw()).map(uri => uri.fsPath);
    await this.modifyMetaData((meta) => {
      meta.pushPullRecords = meta.pushPullRecords.filter(record => {
        return draftFiles.includes(record.localPath);
      });
    });
  }

  /**
   * Gets the draft {@link ScriptFolder} within the script root.
   * @lastreviewed 2025-10-01
   */
  public getDraftFolder() {
    return ScriptFactory.createFolder(vscode.Uri.joinPath(this.rootUri, FolderNames.DRAFT), this);
  }

  /**
   * Attempts to read and parse `draft/package.json`.
   * Returns `null` if the file does not exist or cannot be parsed.
   * @lastreviewed null
   */
  public async getDraftPackageJson(): Promise<ScriptPackageJson | null> {
    const packageJsonUri = vscode.Uri.joinPath(this.getDraftFolder().uri(), SpecialFiles.PACKAGE_JSON);
    try {
      const bytes = await fs().readFile(packageJsonUri);
      const text = Buffer.from(bytes).toString('utf-8');
      return JSON.parse(text) as ScriptPackageJson;
    } catch {
      return null;
    }
  }

  /**
   * Returns the git repository URL declared in `draft/package.json`, or `null` if:
   * - the file does not exist,
   * - it cannot be parsed, or
   * - it has no `repository` field.
   *
   * Handles both the string shorthand (`"repository": "https://..."`) and the object form
   * (`"repository": { "url": "https://..." }`).
   * @lastreviewed null
   */
  public async getDraftGitRepository(): Promise<string | null> {
    const pkg = await this.getDraftPackageJson();
    if (!pkg) {
      return null;
    }
    const repo = pkg.repository;
    if (!repo) {
      return null;
    }
    if (typeof repo === 'string') {
      return repo;
    }
    return repo.url ?? null;
  }

  /**
   * Gets the build {@link ScriptFolder} within the draft folder.
   * @lastreviewed 2025-10-01
   */
  public async getDraftBuildFolder() {
    const tsConfig = await this.getDraftTsConfig();

    return tsConfig.getBuildFolder();
  }

  public async getDraftBuildObjectsFolder() {
    const buildFolder = await this.getDraftBuildFolder();
    return buildFolder.getChildFolder(FolderNames.OBJECTS);
  }

  /**
   * Gets the declarations {@link ScriptFolder} within the script root.
   * @lastreviewed 2025-10-01
   */
  public getDeclarationsFolder() {
    return ScriptFactory.createFolder(vscode.Uri.joinPath(this.rootUri, FolderNames.DECLARATIONS), this);
  }

  /**
   * Finds all tsconfig.json files within the draft folder and its subdirectories.
   * 
   * @returns A Promise that resolves to an array of {@link TsConfig} instances
   * @lastreviewed 2025-10-01
   */
  public async findTsConfigFiles(): Promise<TsConfig[]> {
    const tsConfigFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(this.getDraftFolder().uri(), '**/' + TsConfig.NAME));
    return tsConfigFiles.map(f => ScriptFactory.createTsConfig(f, this));
  }

  /**
   * Identifies TypeScript configuration files that are not in a copacetic (valid) state.
   * 
   * @returns A Promise that resolves to an array of file paths for invalid tsconfig.json files
   * @lastreviewed 2025-10-01
   */
  public async getBadTsFiles(): Promise<string[]> {

    const tsConfigFiles = this.findTsConfigFiles();
    const badFiles: string[] = [];
    for (const tsConfig of await tsConfigFiles) {
      if (!(await tsConfig.isCopacetic())) {
        badFiles.push(tsConfig.path());
      }
    }
    return badFiles;
  }

  /**
   * Gets all draft folder nodes that are eligible for pushing (excludes build folder contents when not snapshot).
   * 
   * @lastreviewed 2025-10-01
   */
  /**
   * Gets all draft folder nodes that are eligible for pushing.
   *
   * @param snapshot When `true`, build-folder contents are included (snapshot pushes include compiled output).
   * @param onlyChanged When `true`, files whose local hash matches their last-pushed `lastVerifiedHash` are
   *   silently skipped.  This avoids redundant network requests for unchanged files and is the right default
   *   for automated operations such as auto-save.  Manual pushes leave this `false` so that every file is
   *   always (re-)sent, regardless of local-change state.
   * @lastreviewed null
   */
  public async getPushableNodes(snapshot: boolean = false, onlyChanged: boolean = false): Promise<ScriptNode[]> {
    const flattenedDraft = await this.getDraftFolder().flatten();

    // Run all per-file async checks in parallel across every file at once,
    // rather than sequentially awaiting each one inside a loop.
    const results = await Promise.all(
      flattenedDraft.map(async f => {
        const reason = await f.getReasonToNotPush();
        // Only check build-folder membership when needed (not a snapshot, and no other exclusion reason).
        const isInBuild = (!reason && !snapshot) ? await f.isInItsRespectiveBuildFolder() : false;
        // Only perform the (purely local) hash check when the caller has opted in.
        const hasChanged = (!reason && !isInBuild && onlyChanged) ? await f.hasLocallyChangedSinceLastPush() : true;
        return { f, reason, isInBuild, hasChanged };
      })
    );

    const pushableNodes: ScriptNode[] = [];
    for (const { f, reason, isInBuild, hasChanged } of results) {
      if (reason) {
        App.logger.info(`Excluding draft file from push: ${f.path()} (${reason})`);
        continue;
      }
      if (isInBuild) {
        App.logger.info(`Excluding file in build folder from push: ${f.path()}`);
        continue;
      }
      if (!hasChanged) {
        App.logger.info(`Skipping unchanged local file: ${f.path()}`);
        continue;
      }
      pushableNodes.push(f);
    }

    return pushableNodes;
  }

  /**
   * Performs pre-deployment validation checks on the script root.
   * Verifies the script is copacetic and all TypeScript configuration files are valid.
   * 
   * @returns A Promise that resolves to an empty string if all checks pass, or an error message describing issues
   * @throws {Err.ScriptNotCopaceticError} When the script root is not in a copacetic state
   * @lastreviewed 2025-10-01
   */
  public async preflightCheck(): Promise<string> {
    if (!(await this.isCopacetic())) {
      throw new Err.ScriptNotCopaceticError();
    }
    const badTsFiles = await this.getBadTsFiles();
    if (badTsFiles.length > 0) {
      return `The following tsconfig files are invalid:\n\n${badTsFiles.join("\n")}\n\n
      SPECIFICALLY: ensure that there are no trailing commas in the JSON files; the IDE does not flag this with
      red squigglies, but it renders the JSON invalid and the webapp cannot parse it properly.`;
    }
    return "";
  }

  /**
   * Gets the root-level tsconfig.json file if it exists and is valid.
   * 
   * @returns A Promise that resolves to the root TsConfig instance
   * @throws an {@link Err.ScriptOperationError} When the root tsconfig.json file is missing or invalid
   * @lastreviewed 2025-10-13
   */
  public async getDraftTsConfig(): Promise<TsConfig> {
    const draftFolderUri = this.getDraftFolder().uri();
    const uri = vscode.Uri.joinPath(draftFolderUri, TsConfig.NAME);
    const tsConfig = ScriptFactory.createTsConfig(uri);
    if (!(await tsConfig.isCopacetic())) {
      throw new Err.ScriptOperationError(`No ${TsConfig.NAME} file found in script root.`);
    }
    return tsConfig;
  }
}
