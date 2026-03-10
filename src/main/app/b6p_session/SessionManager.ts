import type { SessionData } from "../../../../types";
import type { App } from "../App";
import { Auth } from "../authentication";
import { AuthManager } from "../authentication/AuthManager";
import { AuthObject } from "../authentication/AuthObject";
import { ContextNode } from "../context/ContextNode";
import { ApiEndpoints, Http } from "../../resources/constants";
import { Util } from "../util";
import { Err } from "../util/Err";
import { HttpClient } from "../util/network/HttpClient";
import { ResponseCodes } from "../util/network/StatusCodes";
import { PrivateGenericMap, PrivateKeys } from "../util/PseudoMaps";
import { Alert } from "../util/ui/Alert";
import { ORG_CACHE as OC } from "../cache/OrgCache";

/**
 * The session manager is responsible for managing individual sessions with BlueStep servers.
 */
export const SESSION_MANAGER = new class extends ContextNode {


  /**
   * Number of milliseconds in a minute. Useful for shorthanding some things in this class.
   */
  private readonly MILLIS_IN_A_MINUTE = 1000 * 60;

  /**
   * Maximum duration of a session before it is considered expired and needs to be re-authenticated.
   */
  private readonly MAX_SESSION_DURATION = this.MILLIS_IN_A_MINUTE * 30; // 30 minutes

  /**
   * Maximum number of retry attempts for fetch requests that fail due to network issues or authentication problems.
   */
  private readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Maximum age of a CSRF token before it is considered stale and needs to be refreshed.
   * 
   * //TODO: re-enable this once we have a better sense of how often tokens actually expire.
   */
  //private readonly MAX_CSRF_TOKEN_AGE = this.MILLIS_IN_A_MINUTE * 1; // 1 minutes

  /**
   * The AuthManager used for authentication.
   */
  private _authManager: AuthManager<AuthObject> | null = null;

  /**
   * Returns the persistence map for the session data.
   * @returns The persistence map for the session data.
   */
  protected map() {
    return this.sessions;
  }

  /**
   * The persistence map for the session data. Largely used as alias for the `persistence()` method.
   */
  private _sessions: PrivateGenericMap<SessionData> | null = null;

  /**
   * The ancestor context node that is used to instantiate this manager
   */
  private _parent: typeof App | null = null;

  /**
   * Initializes the session manager.
   * @param parent The ancestor context node that is used to instantiate this manager.
   * @returns The initialized session manager.
   */
  init(parent: typeof App) {
    this._parent = parent;
    if (this._sessions) {
      throw new Err.DuplicateInitializationError("session manager");
    }
    this._sessions = new PrivateGenericMap<SessionData>(PrivateKeys.SESSIONS, this.context);
    this.triggerNextCleanup(5_000); // TODO rethink if 5s is even needed
    Auth.initManagers(this);
    OC.init(this);
    this._authManager = Auth.determineManager();
    return this;
  }

  /**
   * The AuthManager used for authentication.
   */
  public get authManager() {
    if (!this._authManager) {
      throw new Err.ManagerNotInitializedError("AuthManager");
    }
    return this._authManager;
  }

  /**
   * The parent App instance.
   */
  public get parent() {
    if (!this._parent) {
      throw new Err.ManagerNotInitializedError("SessionManager");
    }
    return this._parent;
  }

  /**
   * The vscode extension context from the ancestor context node.
   */
  public get context() {
    if (!this.parent.context) {
      throw new Err.ManagerNotInitializedError("SessionManager");
    }
    return this.parent.context;
  }

  /**
   * The persistence map for the session data.
   */
  private get sessions() {
    if (!this._sessions) {
      throw new Err.ManagerNotInitializedError("SessionManager");
    }
    return this._sessions;
  }

  /**
   * Performs the normal managed fetch, however, wraps it with additional CSRF management,
   * complete with retries.
   * @param url 
   * @param options 
   * @param retries  the number of retries left. defaults to {@link MAX_RETRY_ATTEMPTS}
   */
  public async csrfFetch(url: string | URL, options?: RequestInit, retries = this.MAX_RETRY_ATTEMPTS): Promise<Response> {
    url = new URL(url);
    const origin = url.origin;
    if (!this.sessions.has(origin)) {
      await this.login(url);
    }
    const session = this.sessions.get(origin);
    if (!session) {
      throw new Err.SessionNotFoundError(origin);
    }

    try {
      //TODO somewhere we aren't managing the CSRF token properly
      // this is likely because we aren't updating it on every request
      // but rather only on certain ones. We may need to update it more often
      // or have a better way of determining when it needs to be updated.
      // For now, we'll just always fetch a new token every time.
      //if (!session.lastCsrfToken || session.lastTouched < (Date.now() - this.MAX_CSRF_TOKEN_AGE)) {
      const tokenValue = await this.fetch(`${origin}${ApiEndpoints.CSRF_TOKEN}`).then(r => r.text());
      session.lastCsrfToken = tokenValue;
      await this.sessions.set(origin, session);
      await this.sessions.store(); // TODO find why this keeps being needed
      //}

      options = options || {};
      options.headers = options.headers || {};

      (options.headers as Record<string, string>)[Http.Headers.B6P_CSRF_TOKEN] =
        session.lastCsrfToken
        || (() => { throw new Err.CsrfTokenNotFoundError(); })();
      let response = await this.fetch(url, options);
      // TODO: figure out why the get here is always returning empty
      // and why the for loop is needed
      let newToken = response.headers.get(Http.Headers.B6P_CSRF_TOKEN);
      for (const [key, value] of Object.entries(response.headers)) {
        if (key === Http.Headers.B6P_CSRF_TOKEN) {
          newToken = value;
        }
      }
      if (!newToken) {
        throw new Err.CsrfTokenNotFoundError();
      }
      session.lastCsrfToken = newToken;
      await this.sessions.set(origin, session);
      return response;
    } catch (e) {
      if (retries <= 0) {
        console.trace(e);
        throw new Err.RetryAttemptsExhaustedError(e instanceof Error ? e.stack || e.message : String(e));
      }
      // Handle specific error types
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          throw new Err.RequestTimeoutError();
        }
        if (e instanceof Err.UnauthorizedError) {
          await this.sessions.delete(origin);
          Alert.info(e.stack || e.message || String(e));
          Alert.info("Session expired/etc, attempting to re-authenticate...");
          await Util.sleep((this.MAX_RETRY_ATTEMPTS + 1 - retries) * 1_000); // (expanding) pause before retrying
          return await this.csrfFetch(url, options, retries - 1);
        }
        if (retries > 0) {
          session.lastCsrfToken = null; // force a refresh
          Alert.info(`Request didn't work, retrying... (${retries} attempts left)`);
          await this.sessions.delete(origin);
          await Util.sleep((this.MAX_RETRY_ATTEMPTS + 1 - retries) * 1_000); // (expanding) pause before retrying
          return await this.csrfFetch(url, options, retries - 1);
        }
      }
      throw e;
    }
  }

  /**
   * Common code for processing and storing session data from a fetch response.
   * 
   * This includes extracting cookies and CSRF tokens from the response headers
   * and updating the session data accordingly.
   * @param response 
   * @returns 
   */
  private async processResponse(response: Response): Promise<Response> {
    if (response.status === ResponseCodes.FORBIDDEN) {
      throw new Err.UnauthorizedError(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    const cookies = response.headers.get(Http.Headers.SET_COOKIE);
    const responderUrl = new URL(response.url);
    if (cookies) {
      const cookieMap = this.parseCookies(response.headers);
      const sessionData: SessionData = {
        lastTouched: Date.now(),
        [Http.Cookies.JSESSIONID]: cookieMap.get(Http.Cookies.JSESSIONID)
          || this.sessions.get(responderUrl.origin)?.JSESSIONID
          || (() => { throw new Err.SessionIdMissingError(); })(),
        [Http.Cookies.INGRESSCOOKIE]: cookieMap.get(Http.Cookies.INGRESSCOOKIE)
          || this.sessions.get(responderUrl.origin)?.INGRESSCOOKIE
          || null,
        lastCsrfToken: response.headers.get(Http.Headers.B6P_CSRF_TOKEN)
          || this.sessions.get(responderUrl.origin)?.lastCsrfToken
          || null
      };
      await this.sessions.set(responderUrl.origin, sessionData);
    } else {
      const existing = this.sessions.get(responderUrl.origin);
      if (!existing) {
        throw new Err.SessionDataMissingError();
      }
      existing.lastTouched = Date.now();
      existing.lastCsrfToken = response.headers.get(Http.Headers.B6P_CSRF_TOKEN) || existing.lastCsrfToken;
      await this.sessions.set(responderUrl.origin, existing);
    }

    return response;
  }

  /**
   * Ensures a valid session exists for the given URL's origin, logging in if necessary.
   * Call this before spawning parallel fetch operations to avoid redundant concurrent logins.
   * @param url Any URL belonging to the target origin.
   */
  public async ensureSession(url: string | URL): Promise<void> {
    url = new URL(url);
    const hasValid = await this.hasValidSession(url);
    if (!hasValid) {
      await this.login(url);
    }
  }

  /**
   * performs a managed fetch. This is simply a wrapper for the standard `node.fetch(..args)`
   * where we merely append and manage the session cookies.
   *
   * Does not automatically retry.
   * @param url
   * @param options
   * @returns
   * @lastreviewed null
   */
  public async fetch(url: string | URL, options?: RequestInit): Promise<Response> {
    url = new URL(url);
    const sessionData = this.sessions.get(url.origin);
    if (sessionData && (sessionData.JSESSIONID) && (sessionData.lastTouched > (Date.now() - this.MAX_SESSION_DURATION))) {
      this.parent.isDebugMode() && this.parent.logger.info("using existing session for fetch to:" + url.href + "\n " + JSON.stringify(sessionData));
      options = {
        ...options,
        headers: {
          ...options?.headers,
          [Http.Headers.COOKIE]: `${Http.Cookies.JSESSIONID}=${sessionData.JSESSIONID}; ${Http.Cookies.INGRESSCOOKIE}=${sessionData.INGRESSCOOKIE}`,
        }
      };
      const response = await HttpClient.getInstance().fetch(url, options);
      return await this.processResponse(response);
    } else {
      await this.login(url);
      return await this.fetch(url, options);

    }
  }

  private async login(url: URL) {
    this.parent.logger.info("performing login to:" + url.origin);
    //TODO have this moved use the proper login servlet instead of this dummy endpoint
    const response = await HttpClient.getInstance().fetch(url.origin + ApiEndpoints.LOOKUP_TEST, {
      method: Http.Methods.POST,
      headers: {
        [Http.Headers.AUTHORIZATION]: `${await this.authManager.authHeaderValue()}`,
      }
    });
    this.parent.logger.info("login status:" + response.status);
    if (response.status >= ResponseCodes.BAD_REQUEST) {
      throw new Err.HttpResponseError(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    await this.processResponse(response);
  }

  /**
   * Clears the session data for a specific origin. Parses any URL strings and
   * extracts the origin as needed.
   * @param param0 The origin for which to clear the session data.
   */
  public clearSession({ origin }: { origin: string | URL }) {
    this.sessions.delete(new URL(origin).origin);
  }

  /**
   * Checks if there is a valid session for a specific origin.
   * @param param0 The origin to check for a valid session.
   * @returns True if a valid session exists, false otherwise.
   */
  public hasValidSession({ origin }: { origin: string | URL }): boolean {
    const session = this.sessions.get(new URL(origin).origin);
    return !!session && (session.lastTouched > (Date.now() - this.MAX_SESSION_DURATION));
  }

  /**
   * NOTE: this is not a proper cookie parser since we
   * do not care about attributes like `Secure` and `HttpOnly`
   * in this extension (yet). In the event that we do need such parsing
   * we should implement a more robust method and/or find some external library
   * @param cookies
   * @returns
   */
  private parseCookies(headers: Headers): Map<string, string> {
    const cookieMap = new Map<string, string>();
    const setCookies = headers.getSetCookie();
    setCookies.forEach(cookieString => {
      const parts = cookieString.split(";").map(part => part.trim());

      if (parts.length > 0) {
        const cookiePart = parts[0];
        const equalIndex = cookiePart.indexOf("=");

        if (equalIndex > 0) {
          const name = cookiePart.substring(0, equalIndex).trim();
          const value = cookiePart.substring(equalIndex + 1).trim();

          // we only care about name=value pairs
          if (name && value) {
            cookieMap.set(name, value);
          }
        }
      }
    });
    return cookieMap;
  }

  /**
   * Triggers the next cleanup of expired sessions.
   * @param delay The delay before the next cleanup is triggered; defaults to {@link MAX_SESSION_DURATION}.
   */
  private triggerNextCleanup(delay: number = this.MAX_SESSION_DURATION) {
    setTimeout(() => {
      const now = Date.now();
      this.sessions.forEach((session, origin, sessions) => {
        if (now - session.lastTouched > this.MAX_SESSION_DURATION) {
          sessions.delete(origin);
        }
      });
      this.triggerNextCleanup();
    }, delay);
  }
}();

