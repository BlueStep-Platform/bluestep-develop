//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import { App } from '../../main/app/App';
//@ts-ignore
import { Auth } from '../../main/app/authentication';
//@ts-ignore
import { SESSION_MANAGER } from '../../main/app/b6p_session/SessionManager';
//@ts-ignore
import { UPDATE_MANAGER } from '../../main/app/services/UpdateManager';
//@ts-ignore
import { Err } from '../../main/app/util/Err';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';

// suite('App Singleton Tests', () => {

//   let mockFileSystemProvider: MockFileSystem;
//   let mockContext: vscode.ExtensionContext;
//   //@ts-ignore
//   let originalDisposables: any;

//   suiteSetup(() => {
//     // Enable test mode with mock file system
//     mockFileSystemProvider = FileSystem.enableTestMode();
//   });

//   suiteTeardown(() => {
//     // Restore production mode
//     FileSystem.enableProductionMode();
//   });

//   setup(() => {
//     // Clear any previous mock data
//     mockFileSystemProvider.clearMocks();

//     // Create a comprehensive mock ExtensionContext
//     mockContext = {
//       subscriptions: [],
//       workspaceState: {
//         get: () => undefined,
//         update: async () => undefined,
//         keys: () => []
//       },
//       globalState: {
//         get: () => undefined,
//         update: async () => undefined,
//         setKeysForSync: () => undefined,
//         keys: () => []
//       },
//       secrets: {
//         get: async () => undefined,
//         store: async () => undefined,
//         delete: async () => undefined,
//         onDidChange: new vscode.EventEmitter().event
//       },
//       extensionUri: vscode.Uri.file('/test/extension'),
//       extensionPath: '/test/extension',
//       environmentVariableCollection: {} as any,
//       asAbsolutePath: (relativePath: string) => `/test/extension/${relativePath}`,
//       storageUri: vscode.Uri.file('/test/storage'),
//       globalStorageUri: vscode.Uri.file('/test/globalStorage'),
//       logUri: vscode.Uri.file('/test/logs'),
//       extensionMode: vscode.ExtensionMode.Test,
//       extension: {
//         id: 'bluestep-systems.bluestep-develop',
//         extensionUri: vscode.Uri.file('/test/extension'),
//         extensionPath: '/test/extension',
//         isActive: true,
//         packageJSON: {
//           version: '1.0.0-test',
//           name: 'bluestep-develop'
//         },
//         extensionKind: vscode.ExtensionKind.Workspace,
//         exports: undefined,
//         activate: async () => undefined
//       }
//     } as unknown as vscode.ExtensionContext;

//     // Store original disposables for restoration
//     originalDisposables = (App as any).disposables;
//   });

//   teardown(() => {
//     // Reset App state by clearing internal state if possible
//     try {
//       if ((App as any)._context) {
//         (App as any)._context = null;
//       }
//       if ((App as any)._settings) {
//         (App as any)._settings = null;
//       }
//       if ((App as any)._outputChannel) {
//         (App as any)._outputChannel = null;
//       }
//     } catch (e) {
//       // Ignore errors during cleanup
//     }
//   });

//   suite('Initialization and State Management', () => {
//     test('should start uninitialized', () => {
//       // Before initialization, App should not be initialized
//       assert.strictEqual(App.isInitialized(), false);
//     });

//     test('should throw ContextNotSetError when accessing context before initialization', () => {
//       assert.throws(() => {
//         App.context;
//       }, Err.ContextNotSetError);
//     });

//     test('should throw ContextNotSetError when accessing settings before initialization', () => {
//       assert.throws(() => {
//         App.settings;
//       }, Err.ContextNotSetError);
//     });

//     test('should throw ContextNotSetError when accessing logger before initialization', () => {
//       assert.throws(() => {
//         App.logger;
//       }, Err.ContextNotSetError);
//     });

//     test('should initialize correctly with valid context', () => {
//       const initializedApp = App.init(mockContext);

//       assert.strictEqual(App.isInitialized(), true);
//       assert.strictEqual(initializedApp, App, 'init should return the App instance');
//       assert.strictEqual(App.context, mockContext);
//       assert.ok(App.settings, 'Settings should be initialized');
//       assert.ok(App.logger, 'Logger should be initialized');
//     });

//     test('should throw ContextAlreadySetError on double initialization', () => {
//       App.init(mockContext);

//       assert.throws(() => {
//         App.init(mockContext);
//       }, Err.ContextAlreadySetError);
//     });

//     test('should register all commands during initialization', () => {
//       App.init(mockContext);

//       // Verify that disposables were added to context subscriptions
//       assert.ok(mockContext.subscriptions.length > 0, 'Commands should be registered');

//       // Verify specific commands are registered
//       const expectedCommands = [
//         'bluestep-develop.pushScript',
//         'bluestep-develop.pullScript',
//         'bluestep-develop.pullCurrent',
//         'bluestep-develop.pushCurrent',
//         'bluestep-develop.updateCredentials',
//         'bluestep-develop.runTask',
//         'bluestep-develop.checkForUpdates',
//         'bluestep-develop.notify',
//         'bluestep-develop.quickDeploy',
//         'bluestep-develop.testTask',
//         'bluestep-develop.snapshot'
//       ];

//       expectedCommands.forEach(commandName => {
//         assert.ok(App.disposables.has(commandName), `Command ${commandName} should be registered`);
//       });
//     });

//     test('should create output channel with correct name and configuration', () => {
//       App.init(mockContext);

//       const logger = App.logger;
//       assert.ok(logger, 'Logger should be created');
//       // Note: We can't easily test the channel name in unit tests, but we verify it exists
//     });
//   });

//   suite('Command Registration and Disposables', () => {
//     test('should have all expected disposables in the map', () => {
//       const expectedCommands = [
//         'bluestep-develop.pushScript',
//         'bluestep-develop.pullScript',
//         'bluestep-develop.pullCurrent',
//         'bluestep-develop.pushCurrent',
//         'bluestep-develop.updateCredentials',
//         'bluestep-develop.runTask',
//         'bluestep-develop.checkForUpdates',
//         'bluestep-develop.notify',
//         'bluestep-develop.quickDeploy',
//         'bluestep-develop.testTask',
//         'bluestep-develop.snapshot',
//         'bluestep-develop.report',
//         'bluestep-develop.clearSettings',
//         'bluestep-develop.clearSessions',
//         'bluestep-develop.clearAll',
//         'bluestep-develop.toggleDebug'
//       ];

//       expectedCommands.forEach(commandName => {
//         assert.ok(App.disposables.has(commandName), `Command ${commandName} should exist in disposables`);
//         assert.ok(App.disposables.get(commandName), `Command ${commandName} should have a disposable`);
//       });
//     });

//     test('should allow iteration over disposables', () => {
//       let count = 0;
//       App.disposables.forEach((disposable, key, map) => {
//         assert.ok(disposable, `Disposable for ${key} should exist`);
//         assert.strictEqual(typeof key, 'string', 'Key should be a string');
//         assert.strictEqual(map, App.disposables, 'Map should be the disposables object');
//         count++;
//       });

//       assert.ok(count > 0, 'Should have iterated over disposables');
//     });

//     test('should handle missing disposables gracefully', () => {
//       const missingDisposable = App.disposables.get('non-existent-command');
//       assert.strictEqual(missingDisposable, undefined);
//       assert.strictEqual(App.disposables.has('non-existent-command'), false);
//     });
//   });

//   suite('Settings Management', () => {
//     test('should initialize settings after initialization', () => {
//       App.init(mockContext);

//       const settings = App.settings;
//       assert.ok(settings, 'Settings should be initialized');
//       assert.strictEqual(typeof settings.get, 'function', 'Settings should have get method');
//       assert.strictEqual(typeof settings.set, 'function', 'Settings should have set method');
//       assert.strictEqual(typeof settings.clear, 'function', 'Settings should have clear method');
//     });

//     test('should clear settings and maintain debug mode structure', () => {
//       App.init(mockContext);

//       App.clearMap();

//       // Debug mode should be set to disabled after clearing
//       const debugMode = App.settings.get('debugMode');
//       assert.strictEqual(debugMode.enabled, false);
//     });

//     test('should manage debug mode correctly', () => {
//       App.init(mockContext);

//       // Initially debug mode should be false
//       assert.strictEqual(App.isDebugMode(), false);

//       // Toggle debug mode
//       App.toggleDebugMode();
//       assert.strictEqual(App.isDebugMode(), true);

//       // Toggle back
//       App.toggleDebugMode();
//       assert.strictEqual(App.isDebugMode(), false);
//     });

//     test('should handle debug mode when settings not initialized', () => {
//       // Before initialization, debug mode should return false
//       assert.strictEqual(App.isDebugMode(), false);
//     });
//   });

//   suite('Version Management', () => {
//     // test('should return extension version from VS Code API', () => {
//     //   // Mock the vscode.extensions API
//     //   const originalGetExtension = vscode.extensions.getExtension;
//     //   vscode.extensions.getExtension = () => ({
//     //     id: 'bluestep-systems.bluestep-develop',
//     //     extensionUri: vscode.Uri.file('/test'),
//     //     extensionPath: '/test',
//     //     isActive: true,
//     //     packageJSON: {
//     //       version: '1.2.3-test'
//     //     },
//     //     extensionKind: vscode.ExtensionKind.Workspace,
//     //     exports: undefined,
//     //     activate: async () => undefined
//     //   });

//     //   try {
//     //     const version = App.getVersion();
//     //     assert.strictEqual(version, '1.2.3-test');
//     //   } finally {
//     //     vscode.extensions.getExtension = originalGetExtension;
//     //   }
//     // });

//     test('should throw PackageJsonNotFoundError when extension not found', () => {
//       const originalGetExtension = vscode.extensions.getExtension;
//       vscode.extensions.getExtension = () => undefined;

//       try {
//         assert.throws(() => {
//           App.getVersion();
//         }, Err.PackageJsonNotFoundError);
//       } finally {
//         vscode.extensions.getExtension = originalGetExtension;
//       }
//     });

//     // test('should throw PackageJsonNotFoundError when packageJSON missing', () => {
//     //   const originalGetExtension = vscode.extensions.getExtension;
//     //   vscode.extensions.getExtension = () => ({
//     //     id: 'bluestep-systems.bluestep-develop',
//     //     extensionUri: vscode.Uri.file('/test'),
//     //     extensionPath: '/test',
//     //     isActive: true,
//     //     packageJSON: null,
//     //     extensionKind: vscode.ExtensionKind.Workspace,
//     //     exports: undefined,
//     //     activate: async () => undefined
//     //   });

//     //   try {
//     //     assert.throws(() => {
//     //       App.getVersion();
//     //     }, Err.PackageJsonNotFoundError);
//     //   } finally {
//     //     vscode.extensions.getExtension = originalGetExtension;
//     //   }
//     // });

//     // test('should throw PackageJsonNotFoundError when version missing', () => {
//     //   const originalGetExtension = vscode.extensions.getExtension;
//     //   vscode.extensions.getExtension = () => ({
//     //     id: 'bluestep-systems.bluestep-develop',
//     //     extensionUri: vscode.Uri.file('/test'),
//     //     extensionPath: '/test',
//     //     isActive: true,
//     //     packageJSON: {},
//     //     extensionKind: vscode.ExtensionKind.Workspace,
//     //     exports: undefined,
//     //     activate: async () => undefined
//     //   });

//     //   try {
//     //     assert.throws(() => {
//     //       App.getVersion();
//     //     }, Err.PackageJsonNotFoundError);
//     //   } finally {
//     //     vscode.extensions.getExtension = originalGetExtension;
//     //   }
//     // });
//   });

//   suite('Dependency Initialization', () => {
//     test('should initialize SessionManager during app initialization', () => {
//       // Mock SessionManager init method
//       let sessionManagerInitCalled = false;
//       const originalInit = SESSION_MANAGER.init;
//       (SESSION_MANAGER as any).init = (parent: any) => {
//         sessionManagerInitCalled = true;
//         assert.strictEqual(parent, App, 'SessionManager should be initialized with App as parent');
//         return SESSION_MANAGER;
//       };

//       try {
//         App.init(mockContext);
//         assert.strictEqual(sessionManagerInitCalled, true, 'SessionManager init should be called');
//       } finally {
//         (SESSION_MANAGER as any).init = originalInit;
//       }
//     });

//     test('should initialize UpdateManager during app initialization', () => {
//       // Mock UpdateManager init method
//       let updateManagerInitCalled = false;
//       const originalInit = UPDATE_MANAGER.init;
//       (UPDATE_MANAGER as any).init = (parent: any) => {
//         updateManagerInitCalled = true;
//         assert.strictEqual(parent, App, 'UpdateManager should be initialized with App as parent');
//         return UPDATE_MANAGER;
//       };

//       try {
//         App.init(mockContext);
//         assert.strictEqual(updateManagerInitCalled, true, 'UpdateManager init should be called');
//       } finally {
//         (UPDATE_MANAGER as any).init = originalInit;
//       }
//     });
//   });

//   suite('Error Handling and Edge Cases', () => {
//     test('should handle settings sync during configuration changes', () => {
//       App.init(mockContext);

//       // Mock settings sync method
//       let syncCalled = false;
//       const originalSync = App.settings.sync;
//       App.settings.sync = () => {
//         syncCalled = true;
//       };

//       try {
//         // Simulate configuration change event
//         const configEvent = {
//           affectsConfiguration: (section: string) => section === App.appKey
//         };

//         // This would normally be triggered by VS Code's configuration change event
//         // We simulate it by checking the logic would work
//         if (configEvent.affectsConfiguration(App.appKey)) {
//           App.settings.sync();
//         }

//         assert.strictEqual(syncCalled, true, 'Settings sync should be called on configuration change');
//       } finally {
//         App.settings.sync = originalSync;
//       }
//     });

//     test('should handle clear operations correctly', () => {
//       App.init(mockContext);

//       // Mock clear methods
//       let settingsClearCalled = false;
//       let sessionsClearCalled = false;
//       let authClearCalled = false;

//       const originalSettingsClear = App.settings.clear;
//       const originalSessionsClear = SESSION_MANAGER.clearMap;
//       const originalAuthClear = Auth.clearManagers;

//       App.settings.clear = () => {
//         settingsClearCalled = true;
//         originalSettingsClear.call(App.settings);
//       };

//       (SESSION_MANAGER as any).clearMap = () => {
//         sessionsClearCalled = true;
//       };

//       (Auth as any).clearManagers = () => {
//         authClearCalled = true;
//       };

//       try {
//         // Test clearMap with already alerted flag
//         App.clearMap(true);
//         assert.strictEqual(settingsClearCalled, true, 'Settings clear should be called');

//         // Reset and test clear all
//         settingsClearCalled = false;
//         App.settings.clear = () => {
//           settingsClearCalled = true;
//           originalSettingsClear.call(App.settings);
//         };

//         // This would simulate the clearAll command
//         App.clearMap(true);
//         SESSION_MANAGER.clearMap();
//         Auth.clearManagers();

//         assert.strictEqual(settingsClearCalled, true, 'Settings should be cleared in clearAll');
//         assert.strictEqual(sessionsClearCalled, true, 'Sessions should be cleared in clearAll');
//         assert.strictEqual(authClearCalled, true, 'Auth managers should be cleared in clearAll');
//       } finally {
//         App.settings.clear = originalSettingsClear;
//         (SESSION_MANAGER as any).clearMap = originalSessionsClear;
//         (Auth as any).clearManagers = originalAuthClear;
//       }
//     });

//     test('should maintain singleton pattern', () => {
//       const app1 = App;
//       const app2 = App;

//       assert.strictEqual(app1, app2, 'App should be a singleton');
//       assert.strictEqual(app1.appKey, app2.appKey, 'App properties should be shared');
//     });

//     test('should handle multiple disposable forEach calls', () => {
//       let callCount = 0;

//       App.disposables.forEach(() => {
//         callCount++;
//       });

//       const firstCallCount = callCount;
//       callCount = 0;

//       App.disposables.forEach(() => {
//         callCount++;
//       });

//       assert.strictEqual(callCount, firstCallCount, 'forEach should be consistent');
//       assert.ok(callCount > 0, 'Should have disposables to iterate over');
//     });
//   });

//   suite('App Key and Constants', () => {
//     test('should have correct app key', () => {
//       assert.strictEqual(App.appKey, 'bluestep-develop');
//     });

//     test('should use app key consistently across methods', () => {
//       // The app key should be used for settings prefixing and configuration checks
//       assert.strictEqual(App.appKey, 'bluestep-develop', 'App key should be consistent');
//     });
//   });

//   suite('Integration with VS Code Event System', () => {
//     // test('should register text editor change listener during initialization', () => {
//     //   let editorChangeListenerRegistered = false;
//     //   const originalOnDidChange = vscode.window.onDidChangeActiveTextEditor;

//     //   vscode.window.onDidChangeActiveTextEditor = (listener: any, thisArg: any, disposables: any) => {
//     //     editorChangeListenerRegistered = true;
//     //     assert.strictEqual(thisArg, App, 'Event listener should be bound to App');
//     //     assert.strictEqual(disposables, mockContext.subscriptions, 'Should use context subscriptions');
//     //     return { dispose: () => {} } as vscode.Disposable;
//     //   };

//     //   try {
//     //     App.init(mockContext);
//     //     assert.strictEqual(editorChangeListenerRegistered, true, 'Text editor change listener should be registered');
//     //   } finally {
//     //     vscode.window.onDidChangeActiveTextEditor = originalOnDidChange;
//     //   }
//     // });

//     // test('should register configuration change listener during initialization', () => {
//     //   let configChangeListenerRegistered = false;
//     //   const originalOnDidChange = vscode.workspace.onDidChangeConfiguration;

//     //   vscode.workspace.onDidChangeConfiguration = (listener: any) => {
//     //     configChangeListenerRegistered = true;
//     //     assert.strictEqual(typeof listener, 'function', 'Configuration change listener should be a function');
//     //     return { dispose: () => {} } as vscode.Disposable;
//     //   };

//     //   try {
//     //     App.init(mockContext);
//     //     assert.strictEqual(configChangeListenerRegistered, true, 'Configuration change listener should be registered');
//     //   } finally {
//     //     vscode.workspace.onDidChangeConfiguration = originalOnDidChange;
//     //   }
//     // });
//   });
// });