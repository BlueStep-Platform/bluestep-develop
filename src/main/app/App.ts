import * as vscode from 'vscode';
import { type ExtensionPackageJson, type ReadOnlyMap } from '../../../types';
import { OutputChannels, SettingsKeys } from '../resources/constants';
import { Auth } from './authentication';
import { SESSION_MANAGER as SM } from './b6p_session/SessionManager';
import { ORG_CACHE as OC } from './cache/OrgCache';
import { ContextNode } from './context/ContextNode';
import ctrlPCommands from './ctrl-p-commands';
import { handleAutoBuild, handleAutoSave } from './services/AutoSaveHandler';
import readOnlyCheck from './services/ReadOnlyChecker';
import { UPDATE_MANAGER as UM } from './services/UpdateManager';
import { Err } from './util/Err';
import { SettingsWrapper } from './util/PseudoMaps';
import { Alert } from './util/ui/Alert';



export const App = new class extends ContextNode {
  private _context: vscode.ExtensionContext | null = null;
  private _settings: SettingsWrapper | null = null;
  private _outputChannel: vscode.LogOutputChannel | null = null;
  public readonly appKey = SettingsKeys.APP_KEY;
  parent: ContextNode | null = null;

  /**
   * a read-only map interceptor for command registrations
   */
  disposables = new class implements ReadOnlyMap<vscode.Disposable> {

    #map = new Map<string, vscode.Disposable>([
      ['bluestep-develop.pushScript', vscode.commands.registerCommand('bluestep-develop.pushScript', ctrlPCommands.pushScript)],
      ['bluestep-develop.pullScript', vscode.commands.registerCommand('bluestep-develop.pullScript', ctrlPCommands.pullScript)],
      ['bluestep-develop.pullCurrent', vscode.commands.registerCommand('bluestep-develop.pullCurrent', ctrlPCommands.pullCurrent)],
      ['bluestep-develop.pushCurrent', vscode.commands.registerCommand('bluestep-develop.pushCurrent', ctrlPCommands.pushCurrent)],
      ['bluestep-develop.updateCredentials', vscode.commands.registerCommand('bluestep-develop.updateCredentials', ctrlPCommands.updateCredentials)],
      ['bluestep-develop.runTask', vscode.commands.registerCommand('bluestep-develop.runTask', ctrlPCommands.runTask)],
      ['bluestep-develop.checkForUpdates', vscode.commands.registerCommand('bluestep-develop.checkForUpdates', ctrlPCommands.checkForUpdates)],
      ['bluestep-develop.notify', vscode.commands.registerCommand('bluestep-develop.notify', ctrlPCommands.notify)],
      ['bluestep-develop.quickDeploy', vscode.commands.registerCommand('bluestep-develop.quickDeploy', ctrlPCommands.quickDeploy)],
      ['bluestep-develop.testTask', vscode.commands.registerCommand('bluestep-develop.testTask', ctrlPCommands.testTask)],
      ['bluestep-develop.snapshot', vscode.commands.registerCommand('bluestep-develop.snapshot', ctrlPCommands.snapshot)],
      ['bluestep-develop.report', vscode.commands.registerCommand('bluestep-develop.report', async () => {
        //Alert.info("Settings: " + App.settings.toJSON(), { modal: false });
        Alert.info("NOT IMPLEMENTED YET");
      })],
      ['bluestep-develop.clearSettings', vscode.commands.registerCommand('bluestep-develop.clearSettings', async () => {
        Alert.info("Reverting to default settings");
        App.clearMap();
      })],
      ['bluestep-develop.clearSessions', vscode.commands.registerCommand('bluestep-develop.clearSessions', async () => {
        Alert.info("Clearing all Sessions");
        SM.clearMap();
        OC.clearCache();
      })],
      ['bluestep-develop.clearAll', vscode.commands.registerCommand('bluestep-develop.clearAll', async () => {
        Alert.info("Clearing Sessions, Auth Managers, and Settings");
        App.clearMap(true);
        SM.clearMap();
        OC.clearCache();
        Auth.clearManagers();
      })],
      ['bluestep-develop.toggleDebug', vscode.commands.registerCommand('bluestep-develop.toggleDebug', async () => {
        App.toggleDebugMode();
      })],
      ['bluestep-develop.openSettings', vscode.commands.registerCommand('bluestep-develop.openSettings', async () => {
        vscode.commands.executeCommand('workbench.action.openSettings', "@ext:bluestep-systems.bluestep-develop");
      })]
    ]);
    constructor() {}
    forEach(callback: (disposable: vscode.Disposable, key: string, map: this) => void) {
      this.#map.forEach((disposable, key) => callback(disposable, key, this));
    }
    get(key: string): vscode.Disposable | undefined {
      return this.#map.get(key);
    }
    has(key: string): boolean {
      return this.#map.has(key);
    }
  }();

  /**
   * //TODO remove if unneccessary
   * 
   * Checks if the app is initialized
   * @returns true if the app is initialized, false otherwise.
   */
  public isInitialized(): boolean {
    return this._context !== null;
  }

  public get context(): vscode.ExtensionContext {
    if (!this.isInitialized()) {
      throw new Err.ContextNotSetError('Extension context');
    }
    return this._context!;
  }

  protected map() {
    return this.settings;
  }

  public get settings() {
    if (this._settings === null) {
      throw new Err.ContextNotSetError('Settings map');
    }
    return this._settings!;
  }

  /**
   * the output channel for logging. logs to a channel named "B6P" in the vscode output pane.
   */
  public get logger() {
    if (this._outputChannel === null) {
      throw new Err.ContextNotSetError('Output channel');
    }
    return this._outputChannel;
  }

  public init(context: vscode.ExtensionContext) {
    if (this._context !== null) {
      throw new Err.ContextAlreadySetError('Extension context');
    }
    this._context = context;
    // for some reason we can't perform the truncated version of this. I.Err.
    // `.forEach(context.subscriptions.push)`
    this.disposables.forEach(disposable => this.context.subscriptions.push(disposable));
    this._outputChannel = vscode.window.createOutputChannel(OutputChannels.B6P, {
      log: true,
    });
    this.context.subscriptions.push(this._outputChannel);
    this._settings = new SettingsWrapper();
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        readOnlyCheck();
      } else {
        //TODO figure out why this is triggering multiple times
        // console.log('No active editor.');
      }
    }, this, this.context.subscriptions);
    // Register the settings change listener
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(App.appKey)) {
        this.isDebugMode() && console.log("Configuration changed, updating settings map");
        this.settings.sync();
      }

    });
    this.settings.sync();
    readOnlyCheck(); // run it once on startup

    // Register the auto-save listener
    vscode.workspace.onDidSaveTextDocument(document => {
      handleAutoSave(document);
    }, undefined, this.context.subscriptions);

    // Register the auto-build listener
    vscode.tasks.onDidStartTask(event => {
      handleAutoBuild(event.execution.task);
    }, undefined, this.context.subscriptions);

    // Initialize dependancies
    SM.init(this);
    UM.init(this);

    return this;
  }

  public clearMap(alreadyAlerted: boolean = false) {
    this.settings.clear();
    !alreadyAlerted && Alert.info("Cleared all Settings");
    this.settings.set('debugMode', SettingsWrapper.DEFAULT.debugMode);

  }

  public isDebugMode() {
    if (this._settings === null) {
      return false;
    }
    return this.settings.get('debugMode').enabled;
  }

  public toggleDebugMode() {
    console.log("Toggling debug mode");
    this.settings.set('debugMode', { 
      enabled: !this.settings.get('debugMode').enabled, 
      anyDomainOverrideUrl: this.settings.get('debugMode').anyDomainOverrideUrl,
      versionOverride: this.settings.get('debugMode').versionOverride 
    });
    Alert.info(`Debug mode ${this.settings.get('debugMode').enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Gets the extension's package.json data as a typed object.
   * @lastreviewed null
   */
  private getPackageJson(): ExtensionPackageJson {
    return this.context.extension.packageJSON as ExtensionPackageJson;
  }

  /**
   * Gets the current extension version from VS Code extension API
   * @lastreviewed 2025-10-01
   */
  public getVersion(): string {
    return this.getPackageJson().version;
  }

  /**
   * Gets the repository URL from the extension's package.json.
   * @returns The URL string, e.g. "https://github.com/BlueStep-Platform/bluestep-develop"
   * @lastreviewed null
   */
  public getRepositoryUrl(): string {
    return this.getPackageJson().repository.url;
  }

  public runConverts() {
    Alert.info("Not implemented yet");
  }
}();
