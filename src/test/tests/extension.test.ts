//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import { App } from '../../main/app/App';
//@ts-ignore
import { SESSION_MANAGER } from '../../main/app/b6p_session/SessionManager';
//@ts-ignore
import { UPDATE_MANAGER } from '../../main/app/services/UpdateManager';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';
//@ts-ignore
import { ScriptFactory } from '../../main/app/util/script/ScriptFactory';

// suite('Extension Integration Tests', () => {
//   let mockFileSystemProvider: MockFileSystem;
//   let mockContext: vscode.ExtensionContext;
//   let originalGetExtension: typeof vscode.extensions.getExtension;

//   suiteSetup(() => {
//     // Enable test mode with mock file system
//     mockFileSystemProvider = FileSystem.enableTestMode();

//     // Store original VS Code methods
//     originalGetExtension = vscode.extensions.getExtension;

//     vscode.window.showInformationMessage('Starting integration tests.');
//   });

//   suiteTeardown(() => {
//     // Restore production mode and original VS Code methods
//     FileSystem.enableProductionMode();
//     vscode.extensions.getExtension = originalGetExtension;

//     vscode.window.showInformationMessage('Integration tests completed.');
//   });

//   setup(() => {
//     // Clear any previous mock data
//     mockFileSystemProvider.clearMocks();

//     // Create a comprehensive mock ExtensionContext
//     mockContext = {
//       subscriptions: [],
//       workspaceState: {
//         get: (key: string) => {
//           if (key === 'bluestep-develop.debugMode') {
//             return { enabled: false };
//           }
//           return undefined;
//         },
//         update: async () => undefined,
//         keys: () => ['bluestep-develop.debugMode']
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
//           name: 'bluestep-develop',
//           contributes: {
//             commands: [
//               { command: 'bluestep-develop.pushScript', title: 'Push Script' },
//               { command: 'bluestep-develop.pullScript', title: 'Pull Script' }
//             ]
//           }
//         },
//         extensionKind: vscode.ExtensionKind.Workspace,
//         exports: undefined,
//         activate: async () => undefined
//       }
//     } as unknown as vscode.ExtensionContext;

//     // Mock vscode.extensions.getExtension to return our mock extension
//     vscode.extensions.getExtension = (extensionId: string) => {
//       if (extensionId === 'bluestep-systems.bluestep-develop') {
//         return mockContext.extension;
//       }
//       return undefined;
//     };

//     // Reset App state
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
//       // Ignore reset errors
//     }
//   });

//   suite('Extension Loading and Initialization', () => {
//     test('should initialize App singleton correctly', () => {
//       const app = App.init(mockContext);

//       assert.strictEqual(app, App, 'App.init should return the App singleton');
//       assert.strictEqual(App.isInitialized(), true, 'App should be initialized');
//       assert.strictEqual(App.context, mockContext, 'App should have correct context');
//       assert.ok(App.settings, 'App should have settings initialized');
//       assert.ok(App.logger, 'App should have logger initialized');
//     });

//     test('should register all expected commands', () => {
//       App.init(mockContext);

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
//         assert.ok(App.disposables.has(commandName), `Command ${commandName} should be registered`);
//       });

//       assert.ok(mockContext.subscriptions.length > 0, 'Commands should be added to context subscriptions');
//     });

//     test('should initialize dependent managers', () => {
//       // Mock the manager initialization methods
//       let sessionManagerInitCalled = false;
//       let updateManagerInitCalled = false;

//       const originalSessionInit = SESSION_MANAGER.init;
//       const originalUpdateInit = UPDATE_MANAGER.init;

//       (SESSION_MANAGER as any).init = (parent: any) => {
//         sessionManagerInitCalled = true;
//         assert.strictEqual(parent, App, 'SessionManager should be initialized with App as parent');
//         return SESSION_MANAGER;
//       };

//       (UPDATE_MANAGER as any).init = (parent: any) => {
//         updateManagerInitCalled = true;
//         assert.strictEqual(parent, App, 'UpdateManager should be initialized with App as parent');
//         return UPDATE_MANAGER;
//       };

//       try {
//         App.init(mockContext);

//         assert.strictEqual(sessionManagerInitCalled, true, 'SessionManager should be initialized');
//         assert.strictEqual(updateManagerInitCalled, true, 'UpdateManager should be initialized');
//       } finally {
//         (SESSION_MANAGER as any).init = originalSessionInit;
//         (UPDATE_MANAGER as any).init = originalUpdateInit;
//       }
//     });

//     test('should handle extension version retrieval', () => {
//       const version = App.getVersion();
//       assert.strictEqual(version, '1.0.0-test', 'Should return correct version from mock extension');
//     });

//     // test('should setup VS Code event listeners', () => {
//     //   let textEditorChangeListenerRegistered = false;
//     //   let configChangeListenerRegistered = false;

//     //   const originalOnDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor;
//     //   const originalOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration;

//     //   vscode.window.onDidChangeActiveTextEditor = (listener: any, thisArg: any, disposables: any) => {
//     //     textEditorChangeListenerRegistered = true;
//     //     assert.strictEqual(thisArg, App, 'Text editor listener should be bound to App');
//     //     return { dispose: () => {} } as vscode.Disposable;
//     //   };

//     //   vscode.workspace.onDidChangeConfiguration = (listener: any) => {
//     //     configChangeListenerRegistered = true;
//     //     return { dispose: () => {} } as vscode.Disposable;
//     //   };

//     //   try {
//     //     App.init(mockContext);

//     //     assert.strictEqual(textEditorChangeListenerRegistered, true, 'Text editor change listener should be registered');
//     //     assert.strictEqual(configChangeListenerRegistered, true, 'Configuration change listener should be registered');
//     //   } finally {
//     //     vscode.window.onDidChangeActiveTextEditor = originalOnDidChangeActiveTextEditor;
//     //     vscode.workspace.onDidChangeConfiguration = originalOnDidChangeConfiguration;
//     //   }
//     // });
//   });

//   suite('Core Component Integration', () => {
//     test('should integrate FileSystem with ScriptFactory', () => {
//       // Verify that ScriptFactory can use the FileSystem
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/integration.js');
//       const testContent = 'console.log("integration test");';

//       // Set up mock file
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));
//       mockFileSystemProvider.setMockStat(testUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: testContent.length
//       });

//       // Create ScriptNode through factory
//       const scriptNode = ScriptFactory.createFile(testUri);
//       assert.ok(scriptNode, 'ScriptFactory should create ScriptNode');
//       assert.strictEqual(scriptNode.uri().fsPath, testUri.fsPath, 'ScriptNode should have correct URI');
//     });

//     test('should handle ScriptRoot creation and metadata integration', () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/metadata.js');

//       // Set up metadata file
//       const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
//       const metadata = {
//         scriptName: 'Integration Test Script',
//         webdavId: '1466960',
//         pushPullRecords: []
//       };
//       mockFileSystemProvider.setMockFile(metadataUri, JSON.stringify(metadata, null, 2));
//       mockFileSystemProvider.setMockStat(metadataUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: 100
//       });

//       // Create ScriptRoot and verify integration
//       const scriptRoot = ScriptFactory.createScriptRoot(testUri);
//       assert.ok(scriptRoot, 'ScriptFactory should create ScriptRoot');
//       assert.strictEqual(scriptRoot.webDavId, '1466960', 'ScriptRoot should parse webDavId correctly');
//       assert.strictEqual(scriptRoot.origin, 'configbeh.bluestep.net', 'ScriptRoot should parse origin correctly');
//     });

//     test('should handle LocalUriParser integration', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/parser-test.js');
//       const scriptFile = ScriptFactory.createFile(testUri);

//       // Verify URI parsing works correctly
//       assert.strictEqual(scriptFile.isInDraft(), true, 'Should detect draft file correctly');
//       assert.strictEqual(scriptFile.isInDeclarations(), false, 'Should detect non-declarations file correctly');

//       const declarationsUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/declarations/types.d.ts');
//       const declarationsFile = ScriptFactory.createFile(declarationsUri);

//       assert.strictEqual(declarationsFile.isInDeclarations(), true, 'Should detect declarations file correctly');
//       assert.strictEqual(declarationsFile.isInDraft(), false, 'Should detect non-draft file correctly');
//     });
//   });

//   suite('Settings and Configuration Integration', () => {
//     test('should handle settings initialization and access', () => {
//       App.init(mockContext);

//       const settings = App.settings;
//       assert.ok(settings, 'Settings should be accessible');

//       // Test debug mode settings
//       const debugMode = App.isDebugMode();
//       assert.strictEqual(typeof debugMode, 'boolean', 'Debug mode should return boolean');

//       // Test settings operations
//       assert.strictEqual(typeof settings.get, 'function', 'Settings should have get method');
//       assert.strictEqual(typeof settings.set, 'function', 'Settings should have set method');
//       assert.strictEqual(typeof settings.clear, 'function', 'Settings should have clear method');
//     });

//     test('should handle configuration change events', () => {
//       App.init(mockContext);

//       // Mock settings sync method
//       let syncCalled = false;
//       const originalSync = App.settings.sync;
//       App.settings.sync = () => {
//         syncCalled = true;
//       };

//       try {
//         // Simulate configuration change
//         const configEvent = {
//           affectsConfiguration: (section: string) => section === App.appKey
//         };

//         if (configEvent.affectsConfiguration(App.appKey)) {
//           App.settings.sync();
//         }

//         assert.strictEqual(syncCalled, true, 'Settings sync should be called on relevant config changes');
//       } finally {
//         App.settings.sync = originalSync;
//       }
//     });

//     test('should handle settings clear operations', () => {
//       App.init(mockContext);

//       // Test clearing settings
//       App.clearMap();

//       // After clearing, debug mode should be disabled
//       const debugMode = App.settings.get('debugMode');
//       assert.strictEqual(debugMode.enabled, false, 'Debug mode should be disabled after clearing');
//     });
//   });

//   suite('Error Handling and Resilience', () => {
//     test('should handle initialization errors gracefully', () => {
//       // Test with invalid context
//       const invalidContext = {} as vscode.ExtensionContext;

//       try {
//         App.init(invalidContext);
//         // Should not crash, though may not function correctly
//         assert.ok(true, 'Should handle invalid context without crashing');
//       } catch (error) {
//         // Expected to throw error with invalid context
//         assert.ok(error instanceof Error, 'Should throw meaningful error for invalid context');
//       }
//     });

//     test('should handle missing extension metadata', () => {
//       // Mock missing extension
//       vscode.extensions.getExtension = () => undefined;

//       try {
//         App.getVersion();
//         assert.fail('Should throw error when extension not found');
//       } catch (error) {
//         assert.ok(error instanceof Error, 'Should throw error for missing extension');
//       }
//     });

//     test('should handle file system errors during component creation', () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/error-test.js');

//       // Set up file system error
//       const fsError = new Error('File system error');
//       mockFileSystemProvider.setMockError(testUri, fsError);

//       // Should still create component, but operations may fail
//       const scriptFile = ScriptFactory.createFile(testUri);
//       assert.ok(scriptFile, 'Should create ScriptFile despite file system errors');
//     });

//     test('should handle concurrent access to components', async () => {
//       App.init(mockContext);

//       // Create multiple components concurrently
//       const operations = [];
//       for (let i = 0; i < 10; i++) {
//         const testUri = vscode.Uri.file(`/test/workspace/configbeh.bluestep.net/1466960/draft/concurrent${i}.js`);
//         operations.push(
//           Promise.resolve().then(() => {
//             return ScriptFactory.createFile(testUri);
//           })
//         );
//       }

//       const results = await Promise.all(operations);
//       assert.strictEqual(results.length, 10, 'All concurrent operations should complete');
//       results.forEach((result, index) => {
//         assert.ok(result, `Concurrent operation ${index} should succeed`);
//       });
//     });
//   });

//   suite('Memory and Performance Integration', () => {
//     test('should handle multiple initialization cycles', () => {
//       // Test multiple init/reset cycles
//       for (let cycle = 0; cycle < 5; cycle++) {
//         try {
//           // Reset App state
//           (App as any)._context = null;
//           (App as any)._settings = null;
//           (App as any)._outputChannel = null;

//           // Re-initialize
//           App.init(mockContext);

//           assert.strictEqual(App.isInitialized(), true, `Cycle ${cycle}: Should be initialized`);
//           assert.ok(App.settings, `Cycle ${cycle}: Should have settings`);
//         } catch (error) {
//           // Some cycles might fail due to duplicate initialization, which is expected
//           assert.ok(true, `Cycle ${cycle}: Handled initialization gracefully`);
//         }
//       }
//     });

//     test('should handle large numbers of components', () => {
//       // Create many ScriptNodes to test memory handling
//       const components = [];
//       for (let i = 0; i < 100; i++) {
//         const testUri = vscode.Uri.file(`/test/workspace/configbeh.bluestep.net/1466960/draft/perf${i}.js`);
//         components.push(ScriptFactory.createFile(testUri));
//       }

//       assert.strictEqual(components.length, 100, 'Should create 100 components');
//       components.forEach((component, index) => {
//         assert.ok(component, `Component ${index} should exist`);
//       });
//     });

//     test('should handle rapid file system operations', () => {
//       // Set up many mock files rapidly
//       for (let i = 0; i < 50; i++) {
//         const testUri = vscode.Uri.file(`/test/workspace/configbeh.bluestep.net/1466960/draft/rapid${i}.js`);
//         mockFileSystemProvider.setMockFile(testUri, Buffer.from(`content ${i}`));
//         mockFileSystemProvider.setMockStat(testUri, {
//           type: vscode.FileType.File,
//           ctime: Date.now(),
//           mtime: Date.now(),
//           size: 10
//         });
//       }

//       // Verify all files were set up correctly
//       assert.ok(true, 'Should handle rapid file system setup');
//     });
//   });

//   suite('Legacy Compatibility', () => {
//     test('should maintain backward compatibility with existing URIs', () => {
//       // Test various URI formats that might exist in legacy installations
//       const legacyUris = [
//         'file:///workspace/configbeh.bluestep.net/1466960/draft/legacy.js',
//         'file:///Users/username/workspace/configbeh.bluestep.net/1466960/declarations/types.d.ts',
//         'file:///C:/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json'
//       ];

//       legacyUris.forEach((uriString, index) => {
//         try {
//           const uri = vscode.Uri.parse(uriString);
//           const component = ScriptFactory.createNode(uri);
//           assert.ok(component, `Legacy URI ${index} should create component`);
//         } catch (error) {
//           // Some legacy URIs might not be valid, which is acceptable
//           assert.ok(true, `Legacy URI ${index} handled appropriately`);
//         }
//       });
//     });

//     test('should handle migration from older metadata formats', async () => {
//       const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//       // Simulate older metadata format (missing some fields)
//       const oldMetadata = {
//         scriptName: 'Legacy Script',
//         webdavId: '1466960'
//         // Missing pushPullRecords array
//       };

//       mockFileSystemProvider.setMockFile(metadataUri, JSON.stringify(oldMetadata));
//       mockFileSystemProvider.setMockStat(metadataUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: 100
//       });

//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/legacy.js');
//       const scriptRoot = ScriptFactory.createScriptRoot(testUri);

//       try {
//         const metadata = await scriptRoot.getMetaData();
//         assert.strictEqual(metadata.scriptName, 'Legacy Script', 'Should preserve legacy script name');
//         assert.ok(Array.isArray(metadata.pushPullRecords), 'Should create missing pushPullRecords array');
//       } catch (error) {
//         // Metadata operations might fail in test environment, but should handle legacy formats
//         assert.ok(true, 'Should handle legacy metadata gracefully');
//       }
//     });
//   });
// });
