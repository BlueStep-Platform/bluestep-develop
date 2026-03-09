import path from 'path';
import * as vscode from 'vscode';
import { Util } from '../';
import { App } from '../../App';
import { Err } from '../Err';
import { ResponseCodes } from '../network/StatusCodes';
import { ScriptPathElement } from './PathElement';
import { ScriptFactory } from './ScriptFactory';
import type { ScriptFile } from './ScriptFile';
import { ScriptNode } from './ScriptNode';
import { TsConfig } from './TsConfig';
/**
 * Represents a folder in the script project structure.
 */
export class ScriptFolder extends ScriptNode {

  public createFamilial(localUri: vscode.Uri): ScriptFolder {
    if (!this.scriptRoot.getAsFolder().contains(localUri)) {
      throw new Err.ScriptOperationError("The provided URI is not a sibling within the same script root.");
    }
    return new ScriptFolder(localUri, this.scriptRoot);
  }

  /**
   * The upload method is not implemented for {@link ScriptFolder} since individual files
   * automatically create parent folders on remote, so this really should only be called when
   * the folder is empty. We are not going to bother uploading empty folders right now, so this is a no-op
   * as of this time.
   * @lastreviewed 2025-10-01
   * @param _remoteUrlOverrideString NOT USED
   */
  public async upload(_arg?: { remoteUrlOverrideString?: string, isSnapshot?: boolean, force?: boolean; }): Promise<Response | void> {
    App.logger.info(`ScriptFolder.upload() called on ${this.path()}; no action taken.`);
    return;
  }

  async getReasonToNotPush(_arg?: { remoteOverride?: URL, isSnapshot?: boolean; }): Promise<string | null> {
    return `Node (${this.path()}) is a folder`;
  }

  /**
   * The download method is required to be implemented for {@link ScriptFolder} since individual files
   * automatically create their (real) local parent folders, so this really should only be called when
   * the folder is empty. We are not going to bother downloading empty folders right now, so this is a no-op
   * as of this time.
   * @lastreviewed 2025-10-01
   */
  public async download(): Promise<Response> {
    return new Response(null, { status: ResponseCodes.TEAPOT, statusText: "No Content" });
  }

  /**
   * Finds all tsconfig.json files within this folder and its subdirectories.
   * @returns A Promise that resolves to an array of {@link TsConfig} instances
   * @lastreviewed 2025-09-29
   */
  public async findAllTsConfigFiles(): Promise<TsConfig[]> {
    const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(this.uri(), '**/tsconfig.json'));
    return uris.map(uri => ScriptFactory.createTsConfig(uri, this.scriptRoot));
  }

  /**
   * Checks if this {@link ScriptFolder} is equal to another folder by comparing their file system paths.
   * @param other The folder to compare with
   * @returns True if both elements are {@link ScriptFolder} instances and they have the same path, false otherwise
   * @lastreviewed 2025-09-29
   */
  public equals(other: ScriptFolder): boolean {
    if (!(other instanceof ScriptFolder)) {
      return false;
    }
    // Normalize paths for cross-platform comparison
    const thisPath = path.normalize(this.uri().fsPath);
    const otherPath = path.normalize(other.uri().fsPath);
    return thisPath === otherPath;
  }

  /**
   * Gets the file system path of this {@link ScriptFolder}.
   * @returns The file system path as a string
   * @lastreviewed 2025-09-29
   */
  public path(): string {
    return this.uri().fsPath;
  }

  /**
   * Gets the URI of this {@link ScriptFolder}.
   * @returns The folder's {@link vscode.Uri}
   * @lastreviewed 2025-09-29
   */
  public uri(): vscode.Uri {
    return super.uri();
  }

  /**
   * Creates a new {@link ScriptFolder} instance for a child folder within this one.
   * 
   * This can also be used to create non-direct children, or even ancestors, but that is not the intended use.
   * @lastreviewed 2025-09-29
   */
  public getChildFolder(folderName: string): ScriptFolder {
    return ScriptFactory.createFolder(vscode.Uri.joinPath(this.uri(), folderName), this.scriptRoot);
  }

  /**
   * Checks if this folder contains another PathElement by comparing their paths.
   * @param other The {@link ScriptPathElement} to check if it's contained within this folder
   * @lastreviewed 2025-09-29
   */
  public contains(other: ScriptPathElement | vscode.Uri): boolean {
    const thisPath = path.normalize(this.path());
    const otherPath = path.normalize(other instanceof vscode.Uri ? other.fsPath : other.path());

    // Check if otherPath starts with thisPath followed by a separator, or is equal to thisPath
    return otherPath === thisPath || otherPath.startsWith(thisPath + path.sep);
  }

  /**
   * Recursively flattens all files in this folder and returns them as ScriptFile instances with a shared root.
   * @lastreviewed 2025-09-29
   */
  public async flatten(): Promise<ScriptNode[]> {
    const rawUris = await this.flattenRaw();
    const mappedUris = rawUris.map(uri => ScriptFactory.createNode(uri, this.scriptRoot));
    return mappedUris;
  }

  /**
   * Recursively flattens all files in this folder and returns their URIs.
   * @lastreviewed 2025-09-29
   */
  public async flattenRaw(): Promise<vscode.Uri[]> {
    return Util.flattenDirectory(this);
  }

  /**
   * Gets the name of this folder. Literally just its own name.
   */
  public name(): string {
    return path.basename(this.path());
  }

  /**
   * Not implemented. {@link ScriptFolder} does not yet need to do this.
   * @throws an {@link Err.MethodNotImplementedError} 
   * @lastreviewed 2025-09-29
   */
  public currentIntegrityMatches(_ops?: { remoteOverride?: URL; }): Promise<boolean> {
    throw new Err.MethodNotImplementedError();
  }

  /**
   * Not implemented. {@link ScriptFolder} does not yet need to do this.
   * @throws an {@link Err.MethodNotImplementedError} 
   * @lastreviewed 2025-09-29
   */
  remoteUrl(): Promise<URL> {
    throw new Err.MethodNotImplementedError();
  }

  /**
   * Gets an immediate child node (file or folder) by name.
   */
  getImmediateChildNode(name: string): ScriptNode {
    return ScriptFactory.createNode(vscode.Uri.joinPath(this.uri(), name), this.scriptRoot);
  }

  /**
   * Gets an immediate child file by name.
   */
  getImmediateChildFile(name: string): ScriptFile {
    return ScriptFactory.createFile(vscode.Uri.joinPath(this.uri(), name), this.scriptRoot);
  }

  /**
   * Gets an immediate child folder by name.
   */
  getImmediateChildFolder(name: string): ScriptFolder {
    return ScriptFactory.createFolder(vscode.Uri.joinPath(this.uri(), name), this.scriptRoot);
  }

}