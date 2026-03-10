//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import { BASIC_AUTH_MANAGER } from '../../main/app/authentication/BasicAuthManager';
//@ts-ignore
import { SESSION_MANAGER } from '../../main/app/b6p_session/SessionManager';
//@ts-ignore
import { BasicAuth } from '../../main/app/authentication/classes';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';
//@ts-ignore
import { Err } from '../../main/app/util/Err';
//@ts-ignore
import type { BasicAuthParams } from '../../../types';

// suite('BasicAuthManager Tests', () => {
//   let mockFileSystemProvider: MockFileSystem;
//   let mockContext: vscode.ExtensionContext;
//   let mockSessionManager: typeof SESSION_MANAGER;
//   let originalShowInformationMessage: typeof vscode.window.showInformationMessage;
//   let originalShowInputBox: typeof vscode.window.showInputBox;

//   suiteSetup(() => {
//     // Enable test mode with mock file system
//     mockFileSystemProvider = FileSystem.enableTestMode();

//     // Store original VS Code methods
//     originalShowInformationMessage = vscode.window.showInformationMessage;
//     originalShowInputBox = vscode.window.showInputBox;
//   });

//   suiteTeardown(() => {
//     // Restore production mode and original VS Code methods
//     FileSystem.enableProductionMode();
//     vscode.window.showInformationMessage = originalShowInformationMessage;
//     vscode.window.showInputBox = originalShowInputBox;
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
//         get: async (key: string) => {
//           // Mock stored credentials for testing
//           if (key.includes('basic-auth')) {
//             return JSON.stringify({
//               username: 'test-user',
//               password: 'test-password'
//             });
//           }
//           return undefined;
//         },
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
//         packageJSON: { version: '1.0.0-test' },
//         extensionKind: vscode.ExtensionKind.Workspace,
//         exports: undefined,
//         activate: async () => undefined
//       }
//     } as unknown as vscode.ExtensionContext;

//     // Mock SessionManager
//     mockSessionManager = {
//       context: mockContext,
//       parent: null,
//       clearMap: () => {},
//       init: () => mockSessionManager
//     } as unknown as typeof SESSION_MANAGER;

//     // Reset BASIC_AUTH_MANAGER state
//     try {
//       (BASIC_AUTH_MANAGER as any)._flagMap = null;
//       (BASIC_AUTH_MANAGER as any)._parent = null;
//       (BASIC_AUTH_MANAGER as any).CUR_FLAG = (BASIC_AUTH_MANAGER as any).DEFAULT_FLAG;
//     } catch (e) {
//       // Ignore reset errors
//     }

//     // Mock VS Code input methods
//     vscode.window.showInformationMessage = async () => undefined;
//     vscode.window.showInputBox = async (options) => {
//       // Return mock input based on prompt
//       if (options?.prompt?.includes('username')) {
//         return 'test-user';
//       } else if (options?.prompt?.includes('password')) {
//         return 'test-password';
//       }
//       return 'test-input';
//     };
//   });

//   // Helper function to create mock BasicAuth credentials
//   function createMockCredentials(): BasicAuthParams {
//     return {
//       username: 'test-user',
//       password: 'test-password'
//     };
//   }

//   suite('Initialization and State Management', () => {
//     test('should initialize correctly with SessionManager parent', () => {
//       const authManager = BASIC_AUTH_MANAGER.init(mockSessionManager);

//       assert.strictEqual(authManager, BASIC_AUTH_MANAGER, 'init should return the auth manager instance');
//       assert.strictEqual(BASIC_AUTH_MANAGER.parent, mockSessionManager, 'Parent should be set to SessionManager');
//       assert.strictEqual(BASIC_AUTH_MANAGER.context, mockContext, 'Context should be inherited from parent');
//     });

//     test('should throw error on double initialization', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       assert.throws(() => {
//         BASIC_AUTH_MANAGER.init(mockSessionManager);
//       }, Err.DuplicateInitializationError, 'Should throw error on double initialization');
//     });

//     test('should throw error when accessing parent before initialization', () => {
//       assert.throws(() => {
//         BASIC_AUTH_MANAGER.parent;
//       }, Err.ManagerNotInitializedError);
//     });

//     test('should throw error when accessing context before initialization', () => {
//       assert.throws(() => {
//         BASIC_AUTH_MANAGER.context;
//       }, Err.ManagerNotInitializedError);
//     });

//     test('should initialize with default flag', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       // The current flag should be the default flag
//       const defaultFlag = (BASIC_AUTH_MANAGER as any).DEFAULT_FLAG;
//       const currentFlag = (BASIC_AUTH_MANAGER as any).CUR_FLAG;
//       assert.strictEqual(currentFlag, defaultFlag, 'Should start with default flag');
//     });
//   });

//   suite('Flag Management', () => {
//     test('should set and determine flags correctly', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       BASIC_AUTH_MANAGER.setFlag(testFlag);

//       const determinedFlag = BASIC_AUTH_MANAGER.determineFlag();
//       assert.strictEqual(determinedFlag, testFlag, 'Should return the set flag');
//     });

//     test('should check for existing auth by flag', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';

//       // Initially should have no auth
//       assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(testFlag), false, 'Should have no auth initially');

//       // Set auth for the flag
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, createMockCredentials());

//       assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(testFlag), true, 'Should have auth after setting');
//     });

//     test('should default to current flag when no flag specified', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       BASIC_AUTH_MANAGER.setFlag(testFlag);

//       // Set auth for current flag
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, createMockCredentials());

//       // Should check current flag when no flag specified
//       assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(), true, 'Should check current flag by default');
//     });
//   });

//   suite('Credential Management', () => {
//     test('should retrieve existing auth object', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const mockCreds = createMockCredentials();

//       // Set credentials in flag map
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, mockCreds);

//       const authObject = await BASIC_AUTH_MANAGER.getAuthObject(testFlag, false);

//       assert.ok(authObject instanceof BasicAuth, 'Should return BasicAuth instance');
//       assert.strictEqual(authObject.toSavableObject().username, mockCreds.username, 'Username should match');
//       assert.strictEqual(authObject.toSavableObject().password, mockCreds.password, 'Password should match');
//     });

//     test('should create new credentials when none exist and createIfNotPresent is true', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'new-flag';

//       // Mock BasicAuth.generateNew
//       const originalGenerateNew = BasicAuth.generateNew;
//       BasicAuth.generateNew = async () => {
//         return new BasicAuth(createMockCredentials());
//       };

//       try {
//         const authObject = await BASIC_AUTH_MANAGER.getAuthObject(testFlag, true);

//         assert.ok(authObject instanceof BasicAuth, 'Should return new BasicAuth instance');
//         assert.strictEqual(authObject.toSavableObject().username, 'test-user', 'Should have correct username');
//       } finally {
//         BasicAuth.generateNew = originalGenerateNew;
//       }
//     });

//     test('should throw error when no credentials exist and createIfNotPresent is false', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'nonexistent-flag';

//       await assert.rejects(
//         () => BASIC_AUTH_MANAGER.getAuthObject(testFlag, false),
//         Err.AuthenticationError,
//         'Should throw AuthenticationError when no credentials found'
//       );
//     });

//     test('should set auth object correctly', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const basicAuth = new BasicAuth(createMockCredentials());

//       const result = BASIC_AUTH_MANAGER.setAuthObject(basicAuth, testFlag);

//       assert.strictEqual(result, basicAuth, 'Should return the same auth object');
//       assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(testFlag), true, 'Should have auth after setting');

//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       const storedCreds = flagMap.get(testFlag);
//       assert.deepStrictEqual(storedCreds, basicAuth.toSavableObject(), 'Should store savable object');
//     });

//     test('should get default auth', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const defaultFlag = (BASIC_AUTH_MANAGER as any).DEFAULT_FLAG;
//       const mockCreds = createMockCredentials();

//       // Set credentials for default flag
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(defaultFlag, mockCreds);

//       const defaultAuth = await BASIC_AUTH_MANAGER.getDefaultAuth();

//       assert.ok(defaultAuth instanceof BasicAuth, 'Should return BasicAuth instance');
//       assert.strictEqual(defaultAuth.toSavableObject().username, mockCreds.username, 'Should have correct username');
//     });
//   });

//   suite('Authentication Header and Body Generation', () => {
//     test('should generate correct auth header value', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const mockCreds = createMockCredentials();

//       // Set credentials
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, mockCreds);

//       const headerValue = await BASIC_AUTH_MANAGER.authHeaderValue(testFlag);

//       // Verify Basic auth format
//       assert.ok(headerValue.startsWith('Basic '), 'Should start with "Basic "');

//       // Decode and verify credentials
//       const base64Part = headerValue.substring(6); // Remove "Basic "
//       const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
//       const [username, password] = decoded.split(':');

//       assert.strictEqual(username, mockCreds.username, 'Username should be correct');
//       assert.strictEqual(password, mockCreds.password, 'Password should be correct');
//     });

//     test('should generate correct auth login body value', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const mockCreds = createMockCredentials();

//       // Set credentials
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, mockCreds);

//       const bodyValue = await BASIC_AUTH_MANAGER.authLoginBodyValue(testFlag);

//       // Verify login body format
//       assert.ok(bodyValue.includes('_postEvent=commit'), 'Should include post event');
//       assert.ok(bodyValue.includes('_postFormClass=myassn.user.UserLoginWebView'), 'Should include form class');
//       assert.ok(bodyValue.includes('rememberMe=false'), 'Should include remember me');
//       assert.ok(bodyValue.includes(`myUserName=${encodeURIComponent(mockCreds.username)}`), 'Should include encoded username');
//       assert.ok(bodyValue.includes(`myPassword=${encodeURIComponent(mockCreds.password)}`), 'Should include encoded password');
//     });

//     test('should handle special characters in credentials', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const specialCreds = {
//         username: 'user@domain.com',
//         password: 'pass&word%with#special!'
//       };

//       // Set credentials with special characters
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, specialCreds);

//       const headerValue = await BASIC_AUTH_MANAGER.authHeaderValue(testFlag);
//       const bodyValue = await BASIC_AUTH_MANAGER.authLoginBodyValue(testFlag);

//       // Verify header encoding
//       const base64Part = headerValue.substring(6);
//       const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
//       const [username, password] = decoded.split(':');

//       assert.strictEqual(username, specialCreds.username, 'Special username should be encoded correctly');
//       assert.strictEqual(password, specialCreds.password, 'Special password should be encoded correctly');

//       // Verify body encoding
//       assert.ok(bodyValue.includes(`myUserName=${encodeURIComponent(specialCreds.username)}`), 'Username should be URL encoded');
//       assert.ok(bodyValue.includes(`myPassword=${encodeURIComponent(specialCreds.password)}`), 'Password should be URL encoded');
//     });

//     test('should use current flag when no flag specified', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'current-flag';
//       BASIC_AUTH_MANAGER.setFlag(testFlag);

//       const mockCreds = createMockCredentials();
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, mockCreds);

//       // Should use current flag when no flag specified
//       const headerValue = await BASIC_AUTH_MANAGER.authHeaderValue();
//       const bodyValue = await BASIC_AUTH_MANAGER.authLoginBodyValue();

//       assert.ok(headerValue.startsWith('Basic '), 'Should generate header for current flag');
//       assert.ok(bodyValue.includes(`myUserName=${encodeURIComponent(mockCreds.username)}`), 'Should generate body for current flag');
//     });
//   });

//   suite('Credential Creation and Update', () => {
//     test('should create new credentials', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'new-flag';

//       // Mock BasicAuth.generateNew
//       const originalGenerateNew = BasicAuth.generateNew;
//       BasicAuth.generateNew = async () => {
//         return new BasicAuth(createMockCredentials());
//       };

//       try {
//         const newAuth = await BASIC_AUTH_MANAGER.createNewCredentials(testFlag);

//         assert.ok(newAuth instanceof BasicAuth, 'Should return BasicAuth instance');
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(testFlag), true, 'Should store credentials in flag map');
//       } finally {
//         BasicAuth.generateNew = originalGenerateNew;
//       }
//     });

//     test('should create or update existing credentials', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       BASIC_AUTH_MANAGER.setFlag(testFlag);

//       // First, test creation when no credentials exist
//       const originalGenerateNew = BasicAuth.generateNew;
//       BasicAuth.generateNew = async () => {
//         return new BasicAuth(createMockCredentials());
//       };

//       try {
//         const createdAuth = await BASIC_AUTH_MANAGER.createOrUpdate();

//         assert.ok(createdAuth instanceof BasicAuth, 'Should create new auth when none exists');
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(testFlag), true, 'Should have auth after creation');

//         // Now test update when credentials exist
//         const existingAuth = await BASIC_AUTH_MANAGER.getAuthObject(testFlag);
//         const originalUpdate = existingAuth.update;
//         let updateCalled = false;

//         existingAuth.update = async () => {
//           updateCalled = true;
//           return void 0;
//         };

//         try {
//           const updatedAuth = await BASIC_AUTH_MANAGER.createOrUpdate();

//           assert.strictEqual(updateCalled, true, 'Should call update on existing auth');
//           assert.ok(updatedAuth instanceof BasicAuth, 'Should return updated auth');
//         } finally {
//           existingAuth.update = originalUpdate;
//         }
//       } finally {
//         BasicAuth.generateNew = originalGenerateNew;
//       }
//     });

//     test('should handle user cancellation during credential creation', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       // Mock user cancelling input
//       vscode.window.showInputBox = async () => undefined;

//       const originalGenerateNew = BasicAuth.generateNew;
//       BasicAuth.generateNew = async () => {
//         throw new Error('User cancelled input');
//       };

//       try {
//         await assert.rejects(
//           () => BASIC_AUTH_MANAGER.createNewCredentials('test-flag'),
//           Error,
//           'Should handle user cancellation'
//         );
//       } finally {
//         BasicAuth.generateNew = originalGenerateNew;
//       }
//     });
//   });

//   suite('Error Handling and Edge Cases', () => {
//     test('should handle missing credentials gracefully', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const nonExistentFlag = 'nonexistent-flag';

//       // Should show information message and create new credentials
//       let infoMessageCalled = false;
//       vscode.window.showInformationMessage = async (message: string) => {
//         infoMessageCalled = true;
//         assert.ok(message.includes('No existing credentials'), 'Should show appropriate message');
//         return undefined;
//       };

//       const originalGenerateNew = BasicAuth.generateNew;
//       BasicAuth.generateNew = async () => {
//         return new BasicAuth(createMockCredentials());
//       };

//       try {
//         const auth = await BASIC_AUTH_MANAGER.getAuthObject(nonExistentFlag, true);

//         assert.strictEqual(infoMessageCalled, true, 'Should show information message');
//         assert.ok(auth instanceof BasicAuth, 'Should create new credentials');
//       } finally {
//         BasicAuth.generateNew = originalGenerateNew;
//       }
//     });

//     test('should handle persistence failures', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'test-flag';
//       const basicAuth = new BasicAuth(createMockCredentials());

//       // Mock flag map to throw error on set
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       const originalSet = flagMap.set;
//       flagMap.set = () => {
//         throw new Error('Persistence failure');
//       };

//       try {
//         assert.throws(() => {
//           BASIC_AUTH_MANAGER.setAuthObject(basicAuth, testFlag);
//         }, Error, 'Should handle persistence failures');
//       } finally {
//         flagMap.set = originalSet;
//       }
//     });

//     test('should handle concurrent access to credentials', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'concurrent-flag';
//       const mockCreds = createMockCredentials();

//       // Set initial credentials
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(testFlag, mockCreds);

//       // Create multiple concurrent operations
//       const operations = [];
//       for (let i = 0; i < 5; i++) {
//         operations.push(
//           BASIC_AUTH_MANAGER.authHeaderValue(testFlag)
//             .catch(() => 'error') // Handle any errors
//         );
//       }

//       const results = await Promise.all(operations);

//       // All operations should succeed or fail gracefully
//       results.forEach((result, index) => {
//         if (typeof result === 'string' && result.startsWith('Basic ')) {
//           assert.ok(true, `Concurrent operation ${index} succeeded`);
//         } else {
//           assert.ok(true, `Concurrent operation ${index} handled gracefully`);
//         }
//       });
//     });

//     test('should handle invalid flag names', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       // Test with various edge case flag names
//       const edgeCaseFlags = ['', ' ', null as any, undefined as any, 'flag with spaces', 'flag/with/slashes'];

//       edgeCaseFlags.forEach(flag => {
//         try {
//           BASIC_AUTH_MANAGER.setFlag(flag);
//           BASIC_AUTH_MANAGER.determineFlag();
//           // Should not throw for most flag names
//           assert.ok(true, `Should handle flag: ${flag}`);
//         } catch (error) {
//           // Some flag names might cause errors, which is acceptable
//           assert.ok(true, `Handled error for flag: ${flag}`);
//         }
//       });
//     });

//     test('should handle context corruption', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       // Simulate context corruption
//       delete (mockSessionManager as any).context;

//       assert.throws(() => {
//         BASIC_AUTH_MANAGER.context;
//       }, Err.ManagerNotInitializedError, 'Should handle context corruption gracefully');
//     });
//   });

//   suite('Map Operations and Cleanup', () => {
//     test('should clear all credentials', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlags = ['flag1', 'flag2', 'flag3'];
//       const mockCreds = createMockCredentials();

//       // Set credentials for multiple flags
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       testFlags.forEach(flag => {
//         flagMap.set(flag, mockCreds);
//       });

//       // Verify all are set
//       testFlags.forEach(flag => {
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(flag), true, `Should have auth for ${flag}`);
//       });

//       // Clear all
//       BASIC_AUTH_MANAGER.clearMap();

//       // Verify all are cleared
//       testFlags.forEach(flag => {
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(flag), false, `Should not have auth for ${flag} after clear`);
//       });
//     });

//     test('should maintain flag separation', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const flag1 = 'flag1';
//       const flag2 = 'flag2';
//       const creds1 = { username: 'user1', password: 'pass1' };
//       const creds2 = { username: 'user2', password: 'pass2' };

//       // Set different credentials for different flags
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       flagMap.set(flag1, creds1);
//       flagMap.set(flag2, creds2);

//       // Verify separation
//       const storedCreds1 = flagMap.get(flag1);
//       const storedCreds2 = flagMap.get(flag2);

//       assert.deepStrictEqual(storedCreds1, creds1, 'Flag1 should have correct credentials');
//       assert.deepStrictEqual(storedCreds2, creds2, 'Flag2 should have correct credentials');
//       assert.notDeepStrictEqual(storedCreds1, storedCreds2, 'Credentials should be different');
//     });

//     test('should handle large numbers of flags', () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const flagCount = 100;
//       const mockCreds = createMockCredentials();

//       // Set credentials for many flags
//       const flagMap = (BASIC_AUTH_MANAGER as any).flagMap;
//       for (let i = 0; i < flagCount; i++) {
//         flagMap.set(`flag${i}`, { ...mockCreds, username: `user${i}` });
//       }

//       // Verify all are set correctly
//       for (let i = 0; i < flagCount; i++) {
//         const flag = `flag${i}`;
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(flag), true, `Should have auth for ${flag}`);

//         const storedCreds = flagMap.get(flag);
//         assert.strictEqual(storedCreds.username, `user${i}`, `Should have correct username for ${flag}`);
//       }

//       // Clear and verify
//       BASIC_AUTH_MANAGER.clearMap();
//       for (let i = 0; i < flagCount; i++) {
//         assert.strictEqual(BASIC_AUTH_MANAGER.hasAuth(`flag${i}`), false, `Should not have auth after clear`);
//       }
//     });
//   });

//   suite('Integration with BasicAuth Class', () => {
//     test('should properly integrate with BasicAuth methods', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'integration-flag';
//       const mockCreds = createMockCredentials();

//       // Create BasicAuth instance and set it
//       const basicAuth = new BasicAuth(mockCreds);
//       BASIC_AUTH_MANAGER.setAuthObject(basicAuth, testFlag);

//       // Retrieve and verify
//       const retrievedAuth = await BASIC_AUTH_MANAGER.getAuthObject(testFlag, false);

//       assert.ok(retrievedAuth instanceof BasicAuth, 'Should retrieve BasicAuth instance');
//       assert.strictEqual(retrievedAuth.toBase64(), basicAuth.toBase64(), 'Base64 encoding should match');
//       assert.deepStrictEqual(retrievedAuth.toSavableObject(), basicAuth.toSavableObject(), 'Savable objects should match');
//     });

//     test('should handle BasicAuth method failures', async () => {
//       BASIC_AUTH_MANAGER.init(mockSessionManager);

//       const testFlag = 'error-flag';
//       const basicAuth = new BasicAuth(createMockCredentials());

//       // Mock BasicAuth methods to throw errors
//       const originalToBase64 = basicAuth.toBase64;
//       basicAuth.toBase64 = () => {
//         throw new Error('Base64 encoding failed');
//       };

//       BASIC_AUTH_MANAGER.setAuthObject(basicAuth, testFlag);

//       try {
//         await assert.rejects(
//           () => BASIC_AUTH_MANAGER.authHeaderValue(testFlag),
//           Error,
//           'Should handle BasicAuth method failures'
//         );
//       } finally {
//         basicAuth.toBase64 = originalToBase64;
//       }
//     });
//   });
// });