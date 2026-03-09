import * as path from 'path';
import * as vscode from 'vscode';
import { Err } from '../Err';
import { ScriptRoot } from '../script/ScriptRoot';
import { FolderNames } from '../../../resources/constants';

/**
 * A utility class to parse local URIs into their components.
 */
export class LocalUriParser {


  /**
   * The type of the local file: "draft", "declarations", or "metadata" (for .b6p_metadata.json files)
   */
  public readonly type: "draft" | "declarations" | "metadata" | "root" | "snapshot";

  /**
   * the "rest" of the path after the type folder (draft, declarations, or .b6p_metadata.json)
   */
  public readonly rest: string;

  /**
   * the path portion before the WebDAV ID
   *
   * This is everything from the start of the path up to (but not including) the WebDAV ID
   */
  public readonly prependingPath: string;

  /**
   * the scriptName portion of the path
   *
   * This is the numeric ID that comes after the prepending path and before the type folder
   * e.g. in /some/path/12345/draft/script.b6p, the scriptName is "12345"
   *
   */
  public readonly scriptName: string;

  constructor(readonly rawUri: vscode.Uri) {
    // Use Uri.fsPath to get the properly decoded, platform-specific path
    const fsPath = rawUri.fsPath;
    const isAbsolute = path.isAbsolute(fsPath);

    // Split path into segments, filtering out empty strings
    const segments = fsPath.split(path.sep).filter(s => s !== '');

    if (segments.length < 2) {
      throw new Err.InvalidUriStructureError(
        rawUri.toString()
      );
    }

    // Parse forward from the start:
    // Structure: prependingPath/U######/scriptName/[type]/[rest...]
    // Strategy: Find the U###### segment, then scriptName is next, then type indicator

    const orgIdPattern = /^U\d{6}$/;
    let orgIdIndex = -1;
    let scriptNameIndex = -1;
    let typeIndex = -1;

    // Step 1: Find the organization ID (U######) segment
    for (let i = 0; i < segments.length; i++) {
      if (orgIdPattern.test(segments[i])) {
        orgIdIndex = i;
        break;
      }
    }

    // Validate that we found an organization ID
    if (orgIdIndex === -1) {
      throw new Err.InvalidUriStructureError(
        `URI must contain a segment matching U###### pattern: ${rawUri.toString()}`
      );
    }

    // Step 2: ScriptName must be the segment immediately after the organization ID
    if (orgIdIndex + 1 >= segments.length) {
      throw new Err.InvalidUriStructureError(
        `URI must have a scriptName after organization ID: ${rawUri.toString()}`
      );
    }
    scriptNameIndex = orgIdIndex + 1;

    // Step 3: Check if there's a type indicator after the scriptName
    if (scriptNameIndex + 1 < segments.length) {
      const potentialTypeSegment = segments[scriptNameIndex + 1];

      if (potentialTypeSegment === ScriptRoot.METADATA_FILENAME
        || potentialTypeSegment === ScriptRoot.GITIGNORE_FILENAME
        || potentialTypeSegment === FolderNames.DRAFT
        || potentialTypeSegment === FolderNames.DECLARATIONS
        || potentialTypeSegment === FolderNames.SNAPSHOT) {
        typeIndex = scriptNameIndex + 1;
      } else {
        // There's a segment after scriptName but it's not a valid type
        throw new Err.InvalidUriStructureError(
          `Invalid type segment: ${potentialTypeSegment} in ${rawUri.toString()}`
        );
      }
    }

    // Step 4: Extract components based on positions
    // Prepending path: everything up to and including the organization ID
    const prependingSegments = segments.slice(0, orgIdIndex + 1);
    this.prependingPath = (isAbsolute ? path.sep : '') + prependingSegments.join(path.sep);

    // ScriptName: the segment at scriptNameIndex
    this.scriptName = segments[scriptNameIndex];

    // Type and rest: everything after scriptName
    if (typeIndex === -1) {
      // Root type: no type or rest
      this.type = "root";
      this.rest = "";
    } else {
      const typeSegment = segments[typeIndex];
      const restSegments = segments.slice(typeIndex + 1);

      if (typeSegment === ScriptRoot.METADATA_FILENAME || typeSegment === ScriptRoot.GITIGNORE_FILENAME) {
        this.type = "metadata";
        this.rest = "";
      } else if (typeSegment === FolderNames.DRAFT || typeSegment === FolderNames.DECLARATIONS || typeSegment === FolderNames.SNAPSHOT) {
        this.type = typeSegment;
        this.rest = restSegments.join(path.sep);
      } else {
        throw new Err.InvalidUriStructureError(rawUri.toString());
      }
    }
  }

  /**
   * Returns the portion of the URI string from after "file://" up to the type folder
   *
   * This reconstructs the path using the extracted components instead of substring operations
   */
  public getShavedName(): string {
    return path.join(this.prependingPath, this.scriptName);
  }

  /**
   * Compares this parser with another for equality.
   * @param other The other parser to compare against.
   * @returns True if the parsers are equal, false otherwise.
   */
  public equals(other: LocalUriParser): boolean {
    return this.prependingPath === other.prependingPath &&
      this.scriptName === other.scriptName &&
      this.type === other.type &&
      this.rest === other.rest;
  }

  /**
   * Checks if the current parser is for a declarations or draft file.
   * @returns `true` if the parser is for a declarations or draft file, `false` otherwise.
   */
  public isDeclarationsOrDraft(): boolean {
    return [FolderNames.DRAFT, FolderNames.DECLARATIONS].includes(this.type);
  }

  public isInDefinedFolders(): boolean {
    return [FolderNames.DRAFT, FolderNames.DECLARATIONS, FolderNames.SNAPSHOT].includes(this.type);
  }

  /**
   * Returns the {@link vscode.Uri} wrapper for the prepending path.
   */
  public prependingPathUri(): vscode.Uri {
    return vscode.Uri.file(this.prependingPath);
  }
}
