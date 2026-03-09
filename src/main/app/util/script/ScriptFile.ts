import * as path from 'path';
import { Uri } from 'vscode';
import { CryptoAlgorithms, FileExtensions, FolderNames, Http, MimeTypes, SpecialFiles } from '../../../resources/constants';
import { App } from "../../App";
import { SESSION_MANAGER as SM } from '../../b6p_session/SessionManager';
import { ScriptUrlParser } from "../data/ScriptUrlParser";
import { Err } from "../Err";
import { FileSystem } from "../fs/FileSystem";
import { ResponseCodes } from "../network/StatusCodes";
import { Alert } from '../ui/Alert';
import { ScriptNode } from "./ScriptNode";
import { TsConfig } from './TsConfig';
const fs = FileSystem.getInstance;

/**
 * Represents a script file within the system. This is very similar to the webapps "RemoteObject" concept
 * where this object is only a shell around the concept of the file, but does not actually contain the file data itself.
 */
export class ScriptFile extends ScriptNode {

  /**
   * Regex specifically for myassn document key patterns:
   */
  private static ComplexEtagPattern = /^"?\d{10,13}-\{.*?"class":\s*"myassn\.document\.(Proxy|LibraryServlet)MemoryDocumentKey".*?"classId":\s*\d+.*?\}"?$/;

  /**
   * Regex for standard etags (SHA-512 hashes).
   */
  private static EtagPattern = /^"[a-f0-9]{128}"$/;

  /**
   * Regex for "weak" etags (SHA-512 hashes).
   */
  private static WeakEtagPattern = /^W\/"[a-f0-9]{128}"$/;

  public createFamilial(localUri: Uri): ScriptFile {
    if (!this.scriptRoot.getAsFolder().contains(localUri)) {
      throw new Err.ScriptOperationError("The provided URI is not a proper sibling within the same script root.");
    }
    return new ScriptFile(localUri, this.scriptRoot);
  }

  /**
   * Indicates whether this script file is an external model; this is cached after the first check.
   */
  private _isExternalModel: boolean | undefined;

  /**
   * Caches the reason to not push this file, if determined.
   */
  private _reasonToNotPush: string | undefined | null;

  /**
   * Gets the lowercased SHA-512 hash of the local file.
   * @lastreviewed 2025-09-15
   */
  public async getHash(): Promise<string | null> {
    await this.requireExists();
    const bufferSource = await fs().readFile(this.uri());
    const localHashBuffer = await crypto.subtle.digest(CryptoAlgorithms.SHA_512, bufferSource);
    const hexArray = Array.from(new Uint8Array(localHashBuffer));
    if (hexArray.length !== 64) {
      throw new Err.HashCalculationError();
    }
    return hexArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
  }

  /**
   * Gets the hash of the remote file, or `null` if it doesn't exist.
   * Extracts SHA-512 hash from the ETag header, handling both standard and weak ETags.
   * Complex ETags (from memory documents) are not supported and return null.
   * 
   * @param ops.required If true, throws an error when remote hash cannot be determined
   * @param ops.remoteOverride Optional override URL to check instead of the default remote URL
   * @returns The SHA-512 hash string in lowercase, or `null` if file doesn't exist or has complex ETag
   * @lastreviewed 2025-09-15
   */
  public async getRemoteHash(ops?: { required?: boolean, remoteOverride?: URL; }): Promise<string | null> {
    const response = await SM.fetch(ops?.remoteOverride || await this.remoteUrl(), {
      method: Http.Methods.HEAD
    });
    const etagHeader = response.headers.get(Http.Headers.ETAG);

    //some etags will come back with a complex pattern (the memory documents) and so we skip the etag check on them
    let etag: string | null = null;
    if (ScriptFile.EtagPattern.test(etagHeader || "")) {
      etag = JSON.parse(etagHeader?.toLowerCase() || "null");
    } else if (ScriptFile.WeakEtagPattern.test(etagHeader || "")) {
      // weak etags are prefixed with W/ and we ignore the weakness for our purposes
      App.isDebugMode() && console.log("weak etagHeader:", etagHeader);
      etag = JSON.parse(etagHeader?.substring(2).toLowerCase() || "null");
    } else {
      App.isDebugMode() && console.log("complex etagHeader:", etagHeader);
    }
    if (!etag) {
      if (ops?.required) {
        throw new Err.HashCalculationError();
      }
      //TODO determine if there is a legitimate reason that this could be undefined and we should throw an error instead
      // otherwise we can only assume it just doesn't exist on remote
      return null;
    }
    return etag.toLowerCase();
  }

  /**
   * Returns whether the local file content has changed since it was last pushed to remote.
   *
   * Computes the current SHA-512 hash of the local file and compares it against the
   * `lastVerifiedHash` stored in `pushPullRecords` by {@link touch}.  No network call is
   * needed — the comparison is entirely local.
   *
   * Returns `true` (push required) when:
   * - the file has never been pushed (no metadata record exists), or
   * - the current hash differs from `lastVerifiedHash`.
   * @lastreviewed null
   */
  public override async hasLocallyChangedSinceLastPush(): Promise<boolean> {
    const lastVerifiedHash = await this.getLastVerifiedHash();
    if (!lastVerifiedHash) {
      // No record means never pushed — must push.
      return true;
    }
    const currentHash = await this.getHash();
    return currentHash !== lastVerifiedHash;
  }

  /**
   * Gets the last verified hash from the metadata for this node, or `null` if not found.
   */
  public async getLastVerifiedHash(): Promise<string | null> {
    await this.requireExists();
    const md = await this.getScriptRoot().getMetaData();
    if (!md) {
      return null;
    }
    const record = md.pushPullRecords.find(record => record.localPath === this.uri().fsPath);
    return record ? record.lastVerifiedHash : null;
  }


  /**
   * Checks if the local file's integrity matches the remote file.
   * Compares SHA-512 hashes between local and remote versions.
   * 
   * @param ops.remoteOverride Optional override {@link URL} to check against instead of the default remote {@link URL}
   * @lastreviewed 2025-09-15
   */
  public async currentIntegrityMatches(ops?: { remoteOverride?: URL; }): Promise<boolean> {
    const localHash = await this.getHash();
    const remoteHash = await this.getRemoteHash(ops);
    const matches = localHash === remoteHash;
    App.isDebugMode() && console.log("filename:", this.name(), "\n", "matches:", matches, "\n", "local:", localHash, "\n", "remote:", remoteHash);
    return matches;
  }

  /**
   * Checks if the last verified hash from metadata matches the remote file's hash; this is to allow us to check
   * if the remote file was changed since the last time we touched it.
   * @param ops Optional override {@link URL} to check against instead of the default remote {@link URL}
   * @returns Whether the old integrity matches
   */
  public async oldIntegrityMatches(ops?: { remoteOverride?: URL; }): Promise<boolean> {
    const lastHash = await this.getLastVerifiedHash();
    if (!lastHash) {
      return false;
    }
    const remoteHash = await this.getRemoteHash(ops);
    const matches = lastHash === remoteHash;
    App.isDebugMode() && console.log("filename:", this.name(), "\n", "matches:", matches, "\n", "local:", lastHash, "\n", "remote:", remoteHash);
    return matches;
  }

  /**
   * Downloads the file from the remote location and writes it to the local file system.
   * Performs integrity verification using ETag headers and updates the lastPulled timestamp.
   * Skips download if the file is in .gitignore and removes it from metadata instead.
   * 
   * @returns Response object with status 418 if file is in .gitignore, otherwise the actual HTTP response
   * @throws an {@link Err.HttpResponseError} When the download fails due to a bad response
   * @throws an {@link Err.FileIntegrityError} When the downloaded file's integrity check fails
   * @throws an {@link Err.EtagParsingError} When the ETag header cannot be parsed
   * @lastreviewed 2025-10-01
   */
  public async download(parser?: ScriptUrlParser): Promise<Response> {
    const ignore = await super.isInGitIgnore();
    if (ignore) {
      App.logger.info(`not downloading \`${this.name()}\` because in .gitignore`);
      await this.deleteFromMetadata();
      return new Response("", { status: ResponseCodes.TEAPOT });
    }
    const lookupUri = await this.remoteUrl(parser);
    App.logger.info("downloading from:" + lookupUri);
    const response = await SM.fetch(lookupUri, {
      method: Http.Methods.GET,
      headers: {
        [Http.Headers.ACCEPT]: Http.Headers.ACCEPT_ALL,
      }
    });
    if (response.status >= ResponseCodes.BAD_REQUEST) {
      App.logger.error(`Error fetching file ${lookupUri.toString()}: ${response.status} ${response.statusText}`);
      throw new Err.HttpResponseError(`Error fetching file ${lookupUri.toString()}: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await this.writeContent(buffer);
    const etagHeader = response.headers.get(Http.Headers.ETAG);

    //TODO merge this with the other etag parsing code elsewhere in this class
    //some etags will come back with a complex pattern (the memory documents) and so we skip the etag check on them
    if (ScriptFile.EtagPattern.test(etagHeader || "")) {
      const etag = JSON.parse(etagHeader?.toLowerCase() || "null");
      const hash = await this.getHash();
      if (hash !== etag) {
        throw new Err.FileIntegrityError();
      }
    } else if (ScriptFile.WeakEtagPattern.test(etagHeader || "")) {
      // weak etags are prefixed with W/ and we ignore the weakness for our purposes
      App.isDebugMode() && console.log("weak etagHeader:", etagHeader);
      const etag = JSON.parse(etagHeader?.substring(2).toLowerCase() || "null");
      const hash = await this.getHash();
      if (hash !== etag) {
        throw new Err.FileIntegrityError();
      }
    } else if (ScriptFile.ComplexEtagPattern.test(etagHeader || "")) {
      App.isDebugMode() && console.log("complex etagHeader:", etagHeader);
      // complex etags are from the illusory document files and we skip the integrity check on them
    } else {
      throw new Err.EtagParsingError(etagHeader || 'null');
    }

    // touch the lastPulled time
    await this.touch("lastPulled");
    return response;
  }
  /**
  * Removes this file's record from the metadata push/pull tracking.
  * @lastreviewed 2025-09-15
  */
  private async deleteFromMetadata() {
    await this.getScriptRoot().modifyMetaData((md) => {
      const index = md.pushPullRecords.findIndex(record => record.localPath === this.uri().fsPath);
      if (index !== -1) {
        md.pushPullRecords.splice(index, 1);
      }
    });
  }
  /**
   * Deletes the script file from metadata and the local file system.
   * @throws {Error} When the file does not exist
   * @lastreviewed 2025-09-18
   */
  public async delete() {
    await super.delete();
    await this.deleteFromMetadata();
  }

  /**
   * Gets the file name from the local URI.
   * @lastreviewed 2025-10-01
   */
  public name(): string {
    return path.parse(this.uri().fsPath).base;
  }
  /**
   * Returns the {@link URL} for the proper remote file.
   * Constructs the appropriate WebDAV {@link URL} based on the file type (root, metadata, declarations, or draft).
   * @lastreviewed 2025-10-01
   */
  public async remoteUrl(parser?: ScriptUrlParser): Promise<URL> {

    const remoteBaseUrl = await this.getScriptRoot(parser).toScriptBaseRemoteUrl();
    App.isDebugMode() && console.log("base remote URL:", remoteBaseUrl.toString());
    const newUrl = new URL(remoteBaseUrl);
    if (this.parser.type === "root") {
      return newUrl;
    } else if (this.parser.type === "metadata") {
      const fileName = this.name();
      if (fileName === SpecialFiles.B6P_METADATA) {
        throw new Err.MetadataFileOperationError("convert to remote URL");
      }
      newUrl.pathname = remoteBaseUrl.pathname + fileName;
    } else if (this.parser.isInDefinedFolders()) {
      newUrl.pathname = remoteBaseUrl.pathname + this.parser.type + "/" + this.parser.rest;
    } else {
      throw new Err.InvalidFileTypeForUrlError(this.parser.type);
    }

    return newUrl;
  }
  /**
   * Determines a reason to not push this file to remote.
   * Checks various conditions including metadata files, declarations, external models, 
   * .gitignore patterns, info/objects folders, and integrity matching.
   * 
   * @param ops.remoteOverride Optional override URL to check against instead of the default remote URL
   * @returns Empty string if the file can be pushed, otherwise a descriptive reason why not
   * @lastreviewed 2025-09-15
   */
  public async getReasonToNotPush(ops?: { remoteOverride?: URL }): Promise<string | null> {
    if (this._reasonToNotPush !== undefined) {
      return this._reasonToNotPush;
    }
    return await this.setReasonToNotPush(ops);
  }

  /**
   * Sets the reason to not push this file (so it can be cached)
   * and returns it.
   */
  private async setReasonToNotPush(ops?: { remoteOverride?: URL }): Promise<string | null> {
    if (this.parser.type === "root") {
      this._reasonToNotPush = "Node is the root folder";
    } else if (this.name() === SpecialFiles.B6P_METADATA) {
      this._reasonToNotPush = "Node is a metadata file";
    } else if (this.isInDeclarations()) {
      this._reasonToNotPush = "Node is in declarations";
    } else if (await this.isExternalModel()) {
      this._reasonToNotPush = "Node is an external model";
    } else if (await this.isInGitIgnore()) {
      this._reasonToNotPush = "Node is ignored by .gitignore";
    } else if (await this.isInDraftInfoOrObjects()) {
      this._reasonToNotPush = "Node is in info or objects";
    } else if ((await this.isFile()) && await this.currentIntegrityMatches(ops)) {
      this._reasonToNotPush = "File integrity matches";
    } else if (!this._reasonToNotPush) {
      this._reasonToNotPush = null;
    }
    return this._reasonToNotPush;
  }

  /**
   * Determines if the file is an external model.
   * 
   * External models are defined in the config.json file, and are not to be pushed or pulled.
   * @lastreviewed 2025-09-15
   */
  public async isExternalModel(): Promise<boolean> {
    const config = await this.getConfigDotJson();
    if (this._isExternalModel) {
      return true;
    }
    if (config.models?.map(m => m.name).includes(this.name())) {
      this._isExternalModel = true;
      return true;
    }
    return false;
  }

  public shouldCopyRaw() {
    return path.extname(this.name()).toLowerCase() !== FileExtensions.TYPESCRIPT;
  }

  public get extension() {
    return path.extname(this.name()).toLowerCase();
  }

  public isTypescript(): boolean {
    return [FileExtensions.TYPESCRIPT, FileExtensions.TYPESCRIPT_JSX].includes(this.extension);
  }

  public isNotTypescript(): boolean {
    return !this.isTypescript();
  }

  async upload(arg?: { remoteUrlOverrideString?: string, isSnapshot?: boolean, force?: boolean; }): Promise<Response | void> {
    if (await this.isFolder()) {
      //TODO remove this when we are confident it isn't needed anymore
      throw new Err.ScriptOperationError("somehow a folder got created to upload with this method. ");
    }
    App.logger.info("Preparing to send file:", this.uri().fsPath);
    App.logger.info("To target formula URI:", arg?.remoteUrlOverrideString);
    const thisRemote = await this.remoteUrl();
    const remoteOverride = new URL(arg?.remoteUrlOverrideString || thisRemote.toString());
    remoteOverride.pathname = thisRemote.pathname;
    // we skip snapshots/builds because when they go to be uploaded
    // they will always have been freshly created.
    // we also skip the integrity check when force is true (e.g. auto-save).
    if (!arg?.force && !this.isInSnapshot() && !(await this.isInItsRespectiveBuildFolder()) && !(await this.oldIntegrityMatches())) {
      const OVERWRITE = 'Overwrite';
      const CANCEL = 'Cancel';
      const overwrite = await Alert.prompt(
        `The remote file (${remoteOverride}) has changed since the last time you pushed or pulled. Do you wish to overwrite it?`,
        [
          OVERWRITE,
          CANCEL
        ]
      );
      if (overwrite !== OVERWRITE) {
        await Alert.popup((arg?.isSnapshot ? "Snapshot" : "Push") + " cancelled by user.");
        throw new Err.UserCancelledError(`User ${overwrite ? overwrite + "ed" : "cancelled"} push due to remote file change`);
      }
    }
    const reason = await this.getReasonToNotPush({ remoteOverride });

    if (reason) {
      App.logger.info(`${reason}; not pushing file:`, this.uri().fsPath);
      return;
    }
    App.logger.info("Destination:", remoteOverride.toString());

    //TODO investigate if this can be done via streaming
    const fileContents = await fs().readFile(this.uri());
    const requestOptions = {
      method: Http.Methods.PUT,
      headers: {
        [Http.Headers.CONTENT_TYPE]: MimeTypes.APPLICATION_JSON,
      },
      body: fileContents
    };
    let resp = await SM.fetch(remoteOverride, requestOptions);
    if (!resp.ok) {
      const details = await getDetails(resp);
      throw new Err.FileSendError(details);
    }
    // to snapshot we simply need to reupload the exact same file but to the snapshot folder instead
    if (arg?.isSnapshot) {
      if (this.parser.type !== FolderNames.DRAFT) {
        throw new Err.ScriptOperationError("This should never happen, this is here as a safetycheck and should be removed when we're confident.");
      }
      const snapshotOverride = new URL(remoteOverride);
      snapshotOverride.pathname = snapshotOverride.pathname.replace(new RegExp(FolderNames.DRAFT), FolderNames.SNAPSHOT);

      resp = await SM.fetch(snapshotOverride, requestOptions);
    }
    await this.touch("lastPushed");
    App.logger.info("File sent successfully:", this.uri().fsPath);
    return resp;
    async function getDetails(resp: Response) {
      return `
  ========
  ========
  status: ${resp.status}
  statusText: ${resp.statusText}
  ========
  ========
  text: ${await resp.text()}
  ========
  ========`;
    }
  }

  /**
   * Determines if the file is a tsconfig.json file.
   */
  public isTsConfig(): boolean {
    return this.name() === TsConfig.NAME;
  }

  /**
   * Determines if the file is a markdown file based on its extension.
   */
  public isMarkdown(): boolean {
    return this.extension === FileExtensions.MARKDOWN;
  }

  /**
 * Gets the content of the local file as UTF-8 text.
 * @lastreviewed 2025-09-15
 */
  public async getLocalContent(): Promise<string> {
    await this.requireExists();
    const localUri = this.uri();
    try {
      const fileData = await fs().readFile(localUri);
      return Buffer.from(fileData).toString('utf8');
    } catch (e) {
      if (e instanceof Error || typeof e === 'string') {
        App.logger.error(e);
      } else {
        App.logger.error(`Error reading local file: ${e}`);
      }
      throw new Err.FileReadError(`Error reading local file: ${e}`);
    }
  }

  /**
   * Touches a file by updating its last pulled or pushed timestamp.
   * Updates the metadata to track when the file was last synchronized and its hash.
   * 
   * @param file The file to touch
   * @param touchType The type of touch to perform - either "lastPulled" or "lastPushed"
   * @lastreviewed 2025-09-15
   */
  async touch(touchType: "lastPulled" | "lastPushed"): Promise<void> {
    await this.requireExists();
    const lastHash = await this.getHash();
    const metaData = await this.getScriptRoot().modifyMetaData(md => {
      const localPath = this.uri().fsPath;
      const existingEntryIndex = md.pushPullRecords.findIndex(entry => entry.localPath === localPath);
      if (existingEntryIndex !== -1) {
        const newDateString = new Date().toUTCString();

        md.pushPullRecords[existingEntryIndex][touchType] = newDateString;
        md.pushPullRecords[existingEntryIndex].lastVerifiedHash = lastHash;
      } else {

        const now = new Date().toUTCString();
        md.pushPullRecords.push({
          localPath,
          lastPushed: touchType === "lastPushed" ? now : null,
          lastPulled: touchType === "lastPulled" ? now : null,
          lastVerifiedHash: lastHash
        });
      }
    });
    App.isDebugMode() && console.log("Updated metadata:", metaData);
    return void 0;
  }

  /**
   * Common function to ensure the file exists before performing operations.
   * @throws {Err.FileNotFoundError} When the file does not exist
   * @lastreviewed 2025-10-08
   */
  private async requireExists(): Promise<void> {
    if (!await this.exists()) {
      throw new Err.FileNotFoundError(this.uri().fsPath);
    }
  }
}