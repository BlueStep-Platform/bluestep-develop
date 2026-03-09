import * as vscode from 'vscode';
import { ClientInfo, GithubRelease, UpdateInfo } from '../../../../types';
import type { App } from '../App';
import { ContextNode } from '../context/ContextNode';
import { FileExtensions, GitHubUrls, Http, SettingsKeys } from '../../resources/constants';
import { FileSystem } from '../util/fs/FileSystem';
import { PrivateKeys, TypedPersistable } from '../util/PseudoMaps';
import { PrivateTypedPersistable } from '../util/PseudoMaps/TypedPrivatePersistable';
import { Err } from '../util/Err';
import { showReleaseNotesPanel } from '../util/ui/ReleaseNotesWebview';
const fs = FileSystem.getInstance;
/**
 * Singleton update checker for the BlueStep VS Code extension.
 * Checks for new releases on GitHub and notifies users when updates are available.
 * @lastreviewed 2025-10-15
 */
export const UPDATE_MANAGER = new class extends ContextNode {
  private readonly LAST_CHECKED_KEY = 'lastChecked';
  private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Derives the GitHub API base URL for this extension's repository
   * directly from the repository URL in package.json.
   * e.g. "https://github.com/BlueStep-Platform/bluestep-develop"
   *   -> "https://api.github.com/repos/BlueStep-Platform/bluestep-develop"
   * @lastreviewed null
   */
  private get repoApiBase(): string {
    return this.parent.getRepositoryUrl()
      .replace(`${GitHubUrls.BASE}/`, `${GitHubUrls.API_BASE}${GitHubUrls.REPOS_PATH}`);
  }

  /**
   * The ancestor context node that is used to instantiate this manager
   */
  private _parent: typeof App | null = null;

  private _state: TypedPersistable<ClientInfo> | null = null;

  /**
   * Initializes the update checker, and also starts automatic update checking.
   * @param parent The ancestor context node that is used to instantiate this manager
   * @lastreviewed 2025-09-18
   */

  init(parent: typeof App): this {
    this._parent = parent;
    const version = parent.getVersion();
    // we're going to leave this as a private persistable in case we 
    // end up needing the githubtoken again later.
    this._state = new PrivateTypedPersistable<ClientInfo>({
      key: PrivateKeys.GITHUB_STATE,
      context: this.context,
      defaultValue: { version, lastChecked: 0, githubToken: null, setupShown: false }
    });

    setTimeout(async () => {
      try {
        this.parent.logger.info("B6P: Starting automatic update check...");
        await this.checkForUpdatesIfNeeded();
      } catch (error) {
        this.parent.logger.error("B6P: Update check failed: " + (error instanceof Error ? error.stack : error));
      }
    }, 10_000); // Delay 10 seconds to allow other startup tasks to complete. 
    //TODO make this delay configurable? And convert the inits to promises so it can simply be awaited
    // rather than hoping it resolves on time.
    return this;
  }



  public get parent(): typeof App {
    if (!this._parent) {
      throw new Err.ManagerNotInitializedError("UpdateChecker");
    }
    return this._parent;
  }


  public get context(): vscode.ExtensionContext {
    if (!this._parent) {
      throw new Err.ManagerNotInitializedError("UpdateChecker");
    }
    return this._parent.context;
  }

  /**
   * The Github information map for storing update check data
   */
  protected map(): TypedPersistable<ClientInfo> {
    return this.state;
  }

  /**
   * Gets the Client Information state, which represents things like version, last update, etc.
   */
  private get state(): TypedPersistable<ClientInfo> {
    if (!this._state) {
      throw new Err.ManagerNotInitializedError("UpdateChecker");
    }
    return this._state;
  }

  /**
   * Get GitHub authentication headers if token is available.
   * @returns Headers object with authentication if configured
   * @lastreviewed null
   */
  private getGitHubHeaders(): Record<string, string> {
    return {
      [Http.Headers.USER_AGENT]: Http.Headers.USER_AGENT_B6P,
      [Http.Headers.ACCEPT]: Http.Headers.GITHUB_API_ACCEPT
    };
  }

  /**
   * Converts an unknown GitHub fetch error into the appropriate typed error and throws it.
   * Centralises the duplicated error handling across all GitHub API calls.
   * @lastreviewed null
   */
  private handleGitHubFetchError(error: unknown): never {
    if (error instanceof Error) {
      if (error.name === 'AbortError') throw new Err.UpdateCheckTimeoutError();
      throw new Err.GraphQLFetchError(error.message);
    }
    throw new Err.DataParsingError(`Failed to parse GitHub API response: ${error}`);
  }

  /**
   * Check for updates if enough time has passed since last check
   * @lastreviewed null
   */
  public async checkForUpdatesIfNeeded(): Promise<void> {
    try {
      const updateCheck = this.parent.settings.get('updateCheck');
      const updateCheckEnabled = updateCheck.enabled;

      if (!updateCheckEnabled) {
        return;
      }

      const lastCheck = this.state.get(this.LAST_CHECKED_KEY) || 0;
      const now = Date.now();

      if (now - lastCheck < this.UPDATE_INTERVAL) {
        this.parent.logger.info("B6P: Skipping update check - not enough time has passed since last check.");
        return; // Not enough time has passed
      }

      await this.checkForUpdates();
      this.state.set(this.LAST_CHECKED_KEY, now);
    } catch (error) {
      this.parent.logger.error('B6P: Error checking for updates: ' + (error instanceof Error ? error.stack : error));
    }
  }

  /**
   * Force check for updates regardless of timing
   * @returns UpdateInfo if a newer version is available, null otherwise
   * @lastreviewed 2025-10-15
   */
  public async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const currentVersion = this.getCurrentVersion();
      const latestRelease = await this.getLatestRelease();

      if (!latestRelease) {
        return null;
      }

      const latestVersion = this.parseVersionParts(latestRelease.tag_name).join('.');

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        const updateInfo: UpdateInfo = {
          version: latestVersion,
          downloadUrl: this.getDownloadUrl(latestRelease),
          releaseNotes: latestRelease.body,
          publishedAt: latestRelease.published_at
        };

        await this.notifyUserAndInstallUpdate(updateInfo);
        return updateInfo;
      }

      return null;
    } catch (error) {
      this.parent.logger.error('B6P: Error checking for updates: ' + (error instanceof Error ? error.stack : error));
      throw error;
    }
  }

  /**
   * Get current extension version from App singleton
   * @returns Current extension version string
   * @lastreviewed 2025-10-15
   */
  private getCurrentVersion(): string {
    if (this.parent.isDebugMode()) {
      const versionOverride = this.parent.settings.get('debugMode').versionOverride;
      if (versionOverride) {
        this.parent.logger.info(`B6P: Using debug mode version override: ${versionOverride}`);
        return versionOverride;
      }
    }
    return this.parent.getVersion();
  }

  /**
   * Performs a GET request against the GitHub API, parses the JSON response as `T`,
   * and maps any network/parse errors to the appropriate typed errors.
   * @param nullStatuses HTTP status codes that should resolve to `null` instead of throwing.
   * @lastreviewed null
   */
  private async githubFetch<T>(url: string, nullStatuses: number[] = []): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method: Http.Methods.GET,
        headers: this.getGitHubHeaders(),
        signal: AbortSignal.timeout(10_000),
      });
      if (nullStatuses.includes(response.status)) { return null; }
      if (!response.ok) { throw new Err.GitHubApiError(response.status); }
      return await response.json() as T;
    } catch (error) {
      this.handleGitHubFetchError(error);
    }
  }

  /**
   * Get the latest release from GitHub API
   * @returns The latest non-draft, non-prerelease GitHub release or null if none found
   * @lastreviewed 2025-10-15
   */
  private async getLatestRelease(): Promise<GithubRelease | null> {
    const release = await this.githubFetch<GithubRelease>(
      `${this.repoApiBase}${GitHubUrls.RELEASES_LATEST_PATH}`,
      [404]
    );
    if (!release || release.draft || release.prerelease) { return null; }
    return release;
  }

  /**
   * Compare version strings to determine if newVersion is newer than currentVersion
   * @param newVersion The new version string to compare
   * @param currentVersion The current version string to compare against
   * @returns True if newVersion is newer than currentVersion
   * @lastreviewed 2025-10-15
   */
  /**
   * Parses a version string (with optional leading 'v') into an array of numeric parts.
   * e.g. "v1.2.3" or "1.2.3" → [1, 2, 3]
   * @lastreviewed null
   */
  private parseVersionParts(version: string): number[] {
    return version.replace(/^v/, '').split('.').map(n => parseInt(n, 10));
  }

  /**
   * Compares two version strings. Returns a positive number if `a` is newer,
   * negative if `a` is older, and 0 if they are equal.
   * @lastreviewed null
   */
  private compareVersions(a: string, b: string): number {
    const aParts = this.parseVersionParts(a);
    const bParts = this.parseVersionParts(b);
    const len = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    return this.compareVersions(newVersion, currentVersion) > 0;
  }

  /**
   * Get download URL for the extension package from release assets
   * @param release The GitHub release object
   * @returns The download URL for the .vsix file or the release page
   * @lastreviewed 2025-10-15
   */
  private getDownloadUrl(release: GithubRelease): string {
    // Look for .vsix file in assets
    const vsixAsset = release.assets.find(asset => asset.name.endsWith(FileExtensions.VSIX));
    if (vsixAsset) {
      return vsixAsset.browser_download_url;
    }

    // Fallback to release page
    return `${this.parent.getRepositoryUrl()}/releases/tag/${release.tag_name}`;
  }

  /**
   * Show update notification to user
   * @param updateInfo Information about the available update
   * @lastreviewed 2025-10-15
   */
  private async notifyUserAndInstallUpdate(updateInfo: UpdateInfo): Promise<void> {
    const config = this.parent.settings;
    const showNotifications = config.get('updateCheck').showNotifications;

    if (!showNotifications) {
      return;
    }

    const message = `B6P Extension v${updateInfo.version} is available. You have v${this.getCurrentVersion()}.`;
    const Actions = {
      INSTALL: "Install",
      VIEW_NOTES: "View Release Notes",
      DISABLE: "Disable Auto-Check"
    };
    const actions = Object.values(Actions);

    const selection = await vscode.window.showInformationMessage(message, ...actions);

    switch (selection) {
      case Actions.INSTALL:
        await this.autoInstallUpdate(updateInfo);
        break;
      case Actions.VIEW_NOTES:
        showReleaseNotesPanel(updateInfo);
        break;
      case Actions.DISABLE:
        await this.disableUpdateChecking();
        break;
      // 'Remind Later' or no selection - do nothing
    }
  }

  /**
   * Automatically download and install the extension update
   * @param updateInfo Information about the available update
   * @lastreviewed 2025-10-15
   */
  private async autoInstallUpdate(updateInfo: UpdateInfo): Promise<void> {
    try {
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing B6P Extension v${updateInfo.version}`,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "Downloading..." });

        // Check if the download URL is a .vsix file
        if (!updateInfo.downloadUrl.endsWith(FileExtensions.VSIX)) {
          throw new Err.AutoInstallRequiresDirectLinkError();
        }

        // Download the .vsix file
        progress.report({ increment: 30, message: "Downloading extension..." });
        const vsixPath = await this.downloadVsixFile(updateInfo.downloadUrl, updateInfo.version);

        // Install the extension
        progress.report({ increment: 70, message: "Installing extension..." });
        await this.installVsixFile(vsixPath);

        progress.report({ increment: 100, message: "Installation complete!" });
      });

      // Prompt user to reload VS Code
      const reloadAction = "Reload Now";
      const selection = await vscode.window.showInformationMessage(
        `B6P Extension v${updateInfo.version} has been installed successfully! Please reload VS Code to activate the new version.`,
        reloadAction,
        "Later"
      );

      if (selection === reloadAction) {
        await this.state.set('version', updateInfo.version);
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }

    } catch (error) {
      this.parent.logger.error('B6P: Auto-install failed: ' + (error instanceof Error ? error.stack : error));
      vscode.window.showErrorMessage(
        `Failed to auto-install extension: ${error instanceof Error ? error.message : error}. Please download and install manually.`
      );
      // Fallback to opening download URL
      await this.openDownloadUrl(updateInfo.downloadUrl);
    }
  }

  /**
   * Download the .vsix file to a temporary location
   * @param downloadUrl URL to download the .vsix file from
   * @param version Version string for temporary file naming
   * @returns Path to the downloaded .vsix file
   * @lastreviewed 2025-10-15
   */
  private async downloadVsixFile(downloadUrl: string, version: string): Promise<string> {
    try {
      const response = await fetch(downloadUrl, {
        method: Http.Methods.GET,
        headers: {
          [Http.Headers.USER_AGENT]: Http.Headers.USER_AGENT_B6P,
        },
        signal: AbortSignal.timeout(30_000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Err.ExtensionDownloadError(response.status);
      }

      // Create temporary file path
      const tempDir = this.context.globalStorageUri.fsPath;
      const tempFileName = `${SettingsKeys.APP_KEY}-${version}${FileExtensions.VSIX}`;
      const tempFilePath = vscode.Uri.joinPath(this.context.globalStorageUri, tempFileName);

      // Ensure the directory exists
      try {
        await fs().createDirectory(vscode.Uri.file(tempDir));
      } catch {
        // Directory might already exist, ignore error
      }

      // Write the file
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await fs().writeFile(tempFilePath, uint8Array);

      return tempFilePath.fsPath;

    } catch (error) {
      if (error instanceof Err.ExtensionDownloadError) throw error;
      throw new Err.ExtensionDownloadError(500);
    }
  }

  /**
   * Install a .vsix file using VS Code's extension API
   * @param vsixPath Local file path to the .vsix file
   * @lastreviewed 2025-10-15
   */
  private async installVsixFile(vsixPath: string): Promise<void> {
    try {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(vsixPath));
    } catch (error) {
      throw new Err.ExtensionInstallationError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Open the download URL in default browser
   * @param url The URL to open
   * @lastreviewed 2025-10-15
   */
  private async openDownloadUrl(url: string): Promise<void> {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error) {
      this.parent.logger.error('B6P: Failed to open download URL: ' + (error instanceof Error ? error.stack : error));
      vscode.window.showErrorMessage('Failed to open download URL. Please visit the GitHub releases page manually.');
    }
  }

  /**
   * Disable automatic update checking
   * @lastreviewed 2025-10-15
   */
  private async disableUpdateChecking(): Promise<void> {
    const curUpdateSettings = this.parent.settings.get('updateCheck');
    this.parent.settings.set('updateCheck', { ...curUpdateSettings, ...{ enabled: false } });

    const selection = await vscode.window.showInformationMessage(
      'Automatic update checking has been disabled. You can re-enable it in the extension settings.',
      'Open Settings'
    );
    if (selection === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', `${this.parent.appKey}.updateCheck`);
    }
  }

  /**
   * Get all available releases (for manual checking)
   * @param includePrerelease Whether to include prerelease versions
   * @returns Array of GitHub releases
   * @lastreviewed null
   */
  public async getAllReleases(includePrerelease = false): Promise<GithubRelease[]> {
    const releases = await this.githubFetch<GithubRelease[]>(`${this.repoApiBase}${GitHubUrls.RELEASES_PATH}`) ?? [];
    return releases.filter(r => !r.draft && (includePrerelease || !r.prerelease));
  }
}();
