import { XMLParser } from "fast-xml-parser";
import { GqlParentNameResp, XMLResponse } from "../../../../../types";
import { ApiEndpoints, FolderNames, Http, MimeTypes, WebDAVElements } from "../../../resources/constants";
import { SESSION_MANAGER as SM } from "../../b6p_session/SessionManager";
import { Err } from "../Err";
import { Alert } from "../ui/Alert";
import { OrgWorker } from "./OrgWorker";

type GetScriptRet = { remotePath: string; localPath: string; trailing?: string; }[] | null;
type RawFiles = { remotePath: string; localPath: string; trailing?: string; }[];
export class ScriptUrlParser {

  /**
   * The valid types of URL paths we can parse.
   */
  static readonly URL_TYPES = ['files', 'public'] as const;

  /**
   * The resultant URL object from the provided string.
   */
  url: URL;

  filesOrPublic: typeof ScriptUrlParser.URL_TYPES[number];

  /**
   * The WebDAV ID parsed from the URL.
   */
  webDavId: string;
  /**
   * The part of the path after the WebDAV ID, if any. will be something like `.gitignore` or `draft/objects/`, `declarations/scriptlibrary.d.ts` etc.
   * 
   * specifically, this does NOT include the leading slash.
   */
  trailing?: string;

  /**
   * If the trailing path includes a folder (i.e. has a slash in it), this is the first folder name.
   * For example, if the trailing path is `draft/objects/`, this will be `draft`.
   * If the trailing path is `declarations/scriptlibrary.d.ts`, this will be `declarations`.
   * If the trailing path is a file in the root (i.e. no slash), this will be `undefined`.
   */
  trailingFolder?: string;

  /**
   * The script name, as fetched from metadata.json. Will be `null` if not yet fetched.
   * 
   * This primarily exists to cache the result of getScriptName so we don't have to fetch it multiple times.
   */
  private _scriptName: string | null;

  /**
   * The OrgWorker instance used to fetch organization-specific data. Initialized on first use.
   */
  private _orgWorker: OrgWorker | null;

  private _scriptKey: { seqnum: string; classid: string; } | null;

  constructor(public readonly rawUrlString: string) {
    this._scriptName = null;
    this._orgWorker = null;
    this._scriptKey = null;
    if (!rawUrlString || !rawUrlString.trim()) {
      throw new Err.UrlParsingError("URL string cannot be empty");
    }
    const str = rawUrlString.trim();
    try {
      this.url = new URL(str);
    } catch (error) {
      throw new Err.UrlParsingError(`Invalid URL format: ${str}`);
    }

    const pathRegex = /^\/(files|public)\/(\d+)(?:\/(.*))?$/;
    const match = this.url.pathname.match(pathRegex);
    if (!match) {
      throw new Err.UrlParsingError(`URL does not match expected BlueStep format: ${str}`);
    }
    const [, type, webDavId, trailing] = match;


    if (!/^\d+$/.test(webDavId) || webDavId.length > 10) {
      throw new Err.UrlParsingError("the parsed WebDAV ID is probably too large to be legitimate");
    }

    // note that the typeguard informs TS of the type here
    if (!this.isValidType(type)) {
      throw new Err.UrlParsingError(`Invalid path type: ${type}. Expected: ${ScriptUrlParser.URL_TYPES.join(', ')}`);
    }
    this.filesOrPublic = type as typeof ScriptUrlParser.URL_TYPES[number];
    this.webDavId = webDavId;
    this.trailing = trailing;
    this.trailingFolder = trailing?.includes('/') ? trailing.split('/')[0] : undefined;
  }

  /**
   * Checks to see if the provided type is on the list of valid types.
   */
  private isValidType(type: string): type is typeof ScriptUrlParser.URL_TYPES[number] {
    return ScriptUrlParser.URL_TYPES.includes(type as typeof ScriptUrlParser.URL_TYPES[number]);
  }

  /**
   * Fetches the "U" parameter for the organization associated with this URL.
   */
  public async getU(): Promise<string> {
    return await this.orgWorker().getU();
  }

  public async getScriptBaseKey(): Promise<{ seqnum: string; classid: string; }> {
    if (this._scriptKey !== null) {
      return this._scriptKey;
    }
    await this.getGrandparentInfo();
    if (this._scriptKey === null) {
      throw new Err.ScriptUrlParserError("Failed to fetch script key");
    }
    return this._scriptKey;
  }

  public async getScriptName(): Promise<string> {
    if (this._scriptName !== null) {
      return this._scriptName;
    }
    await this.getGrandparentInfo();
    if (this._scriptName === null) {
      throw new Err.ScriptUrlParserError("Failed to fetch script name");
    }
    return this._scriptName;
  }

  /**
   * Fetches the script name from the metadata.json file associated with this script.
   */
  private async getGrandparentInfo(): Promise<void> {
    if (this._scriptName !== null || this._scriptKey !== null) {
      throw new Err.ScriptUrlParserError("Script name or key already fetched");
    }
    const gqlUrl = this.urlCopy();
    const scriptRootId = "530001___" + this.webDavId;
    const parentQuery = (id: string) => `{"query":"query ObjectData($id: String!) {\n  parents(childId: $id) {\n    id\n    displayName\n  }\n}","variables":{"id":"${id}"},"operationName":"ObjectData"}`;
    try {

      gqlUrl.pathname = `gql`;
      const res1 = await SM.csrfFetch(gqlUrl, {
        method: Http.Methods.POST,
        headers: {
          [Http.Headers.CONTENT_TYPE]: MimeTypes.APPLICATION_JSON,
        },
        body: parentQuery(scriptRootId)
      });
      if (!res1.ok) {
        throw new Err.ScriptUrlParserError(`Failed to fetch first parent for ${scriptRootId} from ${gqlUrl.href}: ${res1.status} ${res1.statusText}`);
      }
      const json1 = await res1.json() as GqlParentNameResp;
      //TODO type the error response as well
      const parents = json1?.data?.parents;
      if (!parents || parents.length !== 1) {
        throw new Err.ScriptUrlParserError(`Problem looking up parents for ${scriptRootId} from ${gqlUrl.href}, ${JSON.stringify(json1)}`);
      }
      const mediaLibraryId = parents[0].id;
      const res2 = await SM.csrfFetch(gqlUrl, {
        method: Http.Methods.POST,
        headers: {
          [Http.Headers.CONTENT_TYPE]: MimeTypes.APPLICATION_JSON,
        },
        body: parentQuery(mediaLibraryId)
      });

      if (!res2.ok) {
        throw new Err.ScriptUrlParserError(`Failed to fetch parent for mediaLibrary (${mediaLibraryId}) from ${gqlUrl.href}: ${res2.status} ${res2.statusText}`);
      }
      const json2 = await res2.json() as GqlParentNameResp;
      const parents2 = json2?.data?.parents;
      if (!parents2 || parents2.length !== 1) {
        throw new Err.ScriptUrlParserError(`Problem looking up parents for mediaLibrary (${mediaLibraryId}) from ${gqlUrl.href}, ${JSON.stringify(json2)}`);
      }
      const parts = parents2[0].id.split("___");
      if (parts.length !== 2) {
        throw new Err.ScriptUrlParserError(`Problem parsing script ID from ${gqlUrl.href}, got unexpected format: ${parents2[0].id}`);
      }
      this._scriptName = parents2[0].displayName.replaceAll(/[/\\:*?"<>|]/g, '_');
      this._scriptKey = { seqnum: parts[1], classid: parts[0] };
      return void 0;
    } catch (e) {
      throw new Err.ScriptUrlParserError(`Failed to parse metadata JSON from ${gqlUrl.href}: ${(e as Error).message}`);
    }
  }

  /**
   * Returns a copy of the URL object to prevent external modifications.
   */
  public urlCopy(): URL {
    return new URL(this.url);
  }

  /**
   * Returns an OrgWorker instance for organization-specific operations.
   */
  public orgWorker(): OrgWorker {
    if (this._orgWorker === null) {
      this._orgWorker = new OrgWorker(this.url);
    }
    return this._orgWorker;
  }


  /**
   * Fetches the script from the specified URL.
   * @returns The structure and raw file paths of the fetched script, or undefined if not found.
   */
  async getScript(): Promise<GetScriptRet> {
    try {
      const url = this.urlCopy();
      url.pathname = `${ApiEndpoints.FILES}${this.webDavId}/`;
      SM.parent.logger.info("Fetching script from URL:", url.href);
      const scriptName = await this.getScriptName();
      return await this.getSubScript(url, scriptName);
    } catch (e) {
      console.trace(e);
      throw e;
    }
  }

  async getSubScript(url: URL, scriptName: string, repository: RawFiles = []): Promise<RawFiles | null> {
    try {
      const response = await SM.fetch(url, {
        //TODO review these
        "headers": {
          [Http.Headers.ACCEPT]: Http.Headers.ACCEPT_ALL,
          [Http.Headers.ACCEPT_LANGUAGE]: Http.Headers.ACCEPT_LANGUAGE_EN_US,
          [Http.Headers.CACHE_CONTROL]: Http.Headers.NO_CACHE,
          [Http.Headers.PRAGMA]: Http.Headers.NO_CACHE,
          [Http.Headers.UPGRADE_INSECURE_REQUESTS]: "1",
        },
        "method": Http.Methods.PROPFIND
      });
      if (!response.ok) {
        Alert.error(`Failed to fetch sub-script at ${url.href}: ${response.status} ${response.statusText}`);
        return null;
      }
      const parser = new XMLParser();
      const responseObj: XMLResponse = parser.parse(await response.text());
      const dResponses = responseObj[WebDAVElements.MULTISTATUS][WebDAVElements.RESPONSE];
      if (!dResponses.filter) {
        //this happens when we call for a folder and there are no files in it, so we just short-circuit.
        return repository;
      }
      const firstLayer: RawFiles = await Promise.all(dResponses
        .map(terminal => new ScriptUrlParser(terminal[WebDAVElements.HREF]))
        .filter(parser => {
          let { trailing, trailingFolder } = parser;
          // this is the folder itself, not a file or subfolder so it is meaningless to us
          if (trailing === undefined) {
            return false;
          }
          if (trailingFolder && trailingFolder === FolderNames.SNAPSHOT) {
            // we never want to include snapshot files directly
            return false;
          }
          return true;
        })
        .map(async parser => {
          const { trailing, rawUrlString } = parser;
          const newPath = `${scriptName}/${trailing}`;
          return { remotePath: rawUrlString, localPath: newPath, trailing };
        }));

      for (const rawFile of firstLayer) {
        if (repository.find(rf => rf.remotePath === rawFile.remotePath)) {
          // Prevent duplicates
          continue;
        }
        if (rawFile.trailing?.endsWith('/')) {
          // This is a directory; recurse into it
          const subUrl = new URL(rawFile.remotePath);

          if (subUrl.toString() === url.toString()) {
            repository.push(rawFile);
            continue;
          }
          await this.getSubScript(subUrl, scriptName, repository);
        } else {
          repository.push(rawFile);
        }
      }
      return repository;
    } catch (e) {
      console.error("error getting url", url.toString());
      console.trace(e);
      throw e;
    }
  }

  toString(): string {
    return JSON.stringify({
      rawUrlString: this.rawUrlString,
      url: this.url.href,
      filesOrPublic: this.filesOrPublic,
      webDavId: this.webDavId,
      trailing: this.trailing,
      trailingFolder: this.trailingFolder,
      scriptName: this._scriptName,
      scriptKey: this._scriptKey,
    }, null, 2);
  }
}