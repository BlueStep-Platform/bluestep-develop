//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import type { SessionData } from '../../../types';
//@ts-ignore
import { App } from '../../main/app/App';
//@ts-ignore
import { Auth } from '../../main/app/authentication';
//@ts-ignore
import { SESSION_MANAGER } from '../../main/app/b6p_session/SessionManager';
//@ts-ignore
import { Err } from '../../main/app/util/Err';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';
//@ts-ignore
import { ResponseCodes } from '../../main/app/util/network/StatusCodes';
//@ts-ignore
import { HttpClient } from '../../main/app/util/network/HttpClient';

// suite('SessionManager Tests', () => {
//   let mockFileSystemProvider: MockFileSystem;
//   let mockContext: vscode.ExtensionContext;
//   let originalFetch: typeof globalThis.fetch;
//   let fetchCalls: Array<{ url: string; options?: RequestInit }>;
//   let mockApp: typeof App;

//   suiteSetup(() => {
//     // Enable test mode with mock file system
//     mockFileSystemProvider = FileSystem.enableTestMode();

//     // Store original fetch for restoration
//     originalFetch = globalThis.fetch;
//   });

//   suiteTeardown(() => {
//     // Restore production mode
//     FileSystem.enableProductionMode();
//     HttpClient.enableProductionMode();
//   });

//   setup(() => {
//     // Clear any previous mock data
//     mockFileSystemProvider.clearMocks();
//
//     // Enable HTTP test mode
//     const mockHttp = HttpClient.enableTestMode();

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
//         packageJSON: { version: '1.0.0-test' },
//         extensionKind: vscode.ExtensionKind.Workspace,
//         exports: undefined,
//         activate: async () => undefined
//       }
//     } as unknown as vscode.ExtensionContext;

//     // Mock App singleton for testing
//     mockApp = {
//       context: mockContext,
//       logger: {
//         info: () => {},
//         error: () => {},
//         warn: () => {},
//         debug: () => {},
//         trace: () => {}
//       },
//       isDebugMode: () => false
//     } as unknown as typeof App;

//     // Mock fetch function
//     globalThis.fetch = async (url: string | URL| Request, options?: RequestInit): Promise<Response> => {
//       fetchCalls.push({ url: url.toString(), options });
//       return createMockResponse(url.toString(), options);
//     };

//     // Reset SESSION_MANAGER state
//     try {
//       (SESSION_MANAGER as any)._sessions = null;
//       (SESSION_MANAGER as any)._parent = null;
//       (SESSION_MANAGER as any)._authManager = null;
//     } catch (e) {
//       // Ignore reset errors
//     }
//   });

//   teardown(() => {
//     // Clear any timers that might be running
//     clearAllTimers();
//   });

//   // Helper function to create mock responses
//   function createMockResponse(url: string, options?: RequestInit): Response {
//     const urlObj = new URL(url);

//     // Mock CSRF token endpoint
//     if (urlObj.pathname === '/csrf-token') {
//       return new Response('mock-csrf-token-12345', {
//         status: 200,
//         headers: new Headers({
//           'Content-Type': 'text/plain'
//         })
//       });
//     }

//     // Mock login endpoint
//     if (urlObj.pathname === '/lookup/test' && options?.method === 'POST') {
//       const headers = new Headers({
//         'Set-Cookie': [
//           'JSESSIONID=ABCD1234; Path=/; HttpOnly',
//           'INGRESSCOOKIE=EFGH5678; Path=/; HttpOnly'
//         ].join(', '),
//         'b6p-csrf-token': 'response-csrf-token-67890'
//       });

//       return new Response('OK', {
//         status: 200,
//         headers
//       });
//     }

//     // Mock WebDAV operation
//     if (urlObj.pathname.startsWith('/files/')) {
//       const headers = new Headers({
//         'b6p-csrf-token': 'updated-csrf-token-11111'
//       });

//       return new Response('WebDAV Success', {
//         status: 200,
//         headers
//       });
//     }

//     // Default mock response
//     return new Response('Not Found', {
//       status: 404,
//     });
//   }

//   // Helper function to create mock AuthManager
//   function createMockAuthManager() {
//     return {
//       authHeaderValue: async () => 'Basic dGVzdDp0ZXN0', // test:test in base64
//       authLoginBodyValue: async () => '_postEvent=commit&_postFormClass=myassn.user.UserLoginWebView&rememberMe=false&myUserName=test&myPassword=test'
//     };
//   }

//   // Helper to clear any running timers
//   function clearAllTimers() {
//     // This is a simplified cleanup - in real tests you might need more sophisticated timer management
//   }

//   suite('Initialization and State Management', () => {
//     test('should initialize correctly with App parent', () => {
//       const sessionManager = SESSION_MANAGER.init(mockApp);

//       assert.strictEqual(sessionManager, SESSION_MANAGER, 'init should return the session manager instance');
//       assert.strictEqual(SESSION_MANAGER.parent, mockApp, 'Parent should be set to App');
//       assert.strictEqual(SESSION_MANAGER.context, mockContext, 'Context should be inherited from parent');
//     });

//     test('should throw error on double initialization', () => {
//       SESSION_MANAGER.init(mockApp);

//       assert.throws(() => {
//         SESSION_MANAGER.init(mockApp);
//       }, Err.DuplicateInitializationError, 'Should throw error on double initialization');
//     });

//     test('should throw error when accessing parent before initialization', () => {
//       assert.throws(() => {
//         SESSION_MANAGER.parent;
//       }, Err.ManagerNotInitializedError);
//     });

//     test('should throw error when accessing context before initialization', () => {
//       assert.throws(() => {
//         SESSION_MANAGER.context;
//       }, Err.ManagerNotInitializedError);
//     });

//     test('should initialize auth managers during initialization', () => {
//       // Mock Auth.initManagers and Auth.determineManager
//       let initManagersCalled = false;
//       let determineManagerCalled = false;

//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = (sessionManager: any) => {
//         initManagersCalled = true;
//         assert.strictEqual(sessionManager, SESSION_MANAGER, 'Should pass session manager to auth init');
//       };

//       Auth.determineManager = () => {
//         determineManagerCalled = true;
//         return createMockAuthManager() as any;
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         assert.strictEqual(initManagersCalled, true, 'Auth.initManagers should be called');
//         assert.strictEqual(determineManagerCalled, true, 'Auth.determineManager should be called');
//         assert.ok(SESSION_MANAGER.authManager, 'AuthManager should be available');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Basic Fetch Operations', () => {
//     test('should perform login and create session on first fetch', async () => {
//       // Mock Auth methods
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         const response = await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test.js');

//         assert.strictEqual(response.status, 200, 'Response should be successful');

//         // Should have made login call
//         const loginCall = fetchCalls.find(call => call.url.includes('/lookup/test'));
//         assert.ok(loginCall, 'Login call should have been made');
//         assert.strictEqual(loginCall.options?.method, 'POST', 'Login should be POST request');

//         // Should have made the actual fetch call with session cookies
//         const fetchCall = fetchCalls.find(call => call.url.includes('/files/123/test.js'));
//         assert.ok(fetchCall, 'Fetch call should have been made');
//         const headers = fetchCall.options?.headers as Record<string, string> | undefined;
//         const cookieHeader = headers?.['Cookie'];
//         assert.ok(cookieHeader?.includes('JSESSIONID=ABCD1234'), 'Should include JSESSIONID cookie');
//         assert.ok(cookieHeader?.includes('INGRESSCOOKIE=EFGH5678'), 'Should include INGRESSCOOKIE cookie');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should reuse existing session when valid', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // First call creates session
//         await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test1.js');

//         // Clear fetch calls to track second call
//         fetchCalls.length = 0;

//         // Second call should reuse session
//         await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test2.js');

//         // Should not have made another login call
//         const loginCall = fetchCalls.find(call => call.url.includes('/lookup/test'));
//         assert.strictEqual(loginCall, undefined, 'Should not make another login call');

//         // Should only make the fetch call
//         assert.strictEqual(fetchCalls.length, 1, 'Should only make one fetch call');
//         assert.ok(fetchCalls[0].url.includes('/files/123/test2.js'), 'Should fetch the correct resource');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle session expiration and re-authenticate', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // First call creates session
//         await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test1.js');

//         // Manually expire the session by setting lastTouched to old time
//         const sessions = (SESSION_MANAGER as any).sessions;
//         const sessionData = sessions.get('https://test.bluestep.net');
//         if (sessionData) {
//           sessionData.lastTouched = Date.now() - (31 * 60 * 1000); // 31 minutes ago
//           await sessions.set('https://test.bluestep.net', sessionData);
//         }

//         fetchCalls.length = 0; // Clear previous calls

//         // Second call should trigger re-authentication
//         await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test2.js');

//         // Should have made a new login call
//         const loginCall = fetchCalls.find(call => call.url.includes('/lookup/test'));
//         assert.ok(loginCall, 'Should make new login call for expired session');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('CSRF Token Management', () => {
//     test('should fetch and use CSRF tokens in csrfFetch', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         const response = await SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test.js');

//         assert.strictEqual(response.status, 200, 'CSRF fetch should be successful');

//         // Should have fetched CSRF token first
//         const csrfCall = fetchCalls.find(call => call.url.includes('/csrf-token'));
//         assert.ok(csrfCall, 'Should fetch CSRF token');

//         // Should have included CSRF token in the main request
//         const mainCall = fetchCalls.find(call => {
//           if (!call.url.includes('/files/123/test.js')) {return false;}

//           const headers = call.options?.headers as Record<string, string> | undefined;
//           return headers?.['b6p-csrf-token'] !== undefined;
//         });
//         assert.ok(mainCall, 'Main request should include CSRF token header');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle CSRF token refresh', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // First CSRF fetch
//         await SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test1.js');

//         fetchCalls.length = 0; // Clear calls

//         // Second CSRF fetch should refresh token
//         await SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test2.js');

//         // Should have fetched new CSRF token
//         const csrfCall = fetchCalls.find(call => call.url.includes('/csrf-token'));
//         assert.ok(csrfCall, 'Should fetch fresh CSRF token on each csrfFetch');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should throw error when CSRF token is missing', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       // Override fetch to return response without CSRF token
//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });

//         if (url.toString().includes('/csrf-token')) {
//           return new Response('', { status: 200 }); // Empty token
//         }

//         return new Response('OK', {
//           status: 200,
//           headers: new Headers() // No CSRF token in response
//         });
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         await assert.rejects(
//           () => SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test.js'),
//           Err.CsrfTokenNotFoundError,
//           'Should throw when CSRF token is missing'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Retry Logic and Error Handling', () => {
//     test('should retry on authentication errors', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       let callCount = 0;
//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });
//         callCount++;

//         if (url.toString().includes('/csrf-token')) {
//           return new Response('mock-csrf-token', { status: 200 });
//         }

//         if (callCount === 1) {
//           // First call fails with 403
//           return new Response('Forbidden', { status: ResponseCodes.FORBIDDEN });
//         }

//         // Subsequent calls succeed
//         return new Response('OK', {
//           status: 200,
//           headers: new Headers({
//             'b6p-csrf-token': 'new-token'
//           })
//         });
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         const response = await SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test.js');

//         assert.strictEqual(response.status, 200, 'Should eventually succeed after retry');
//         assert.ok(callCount > 1, 'Should have retried the request');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should exhaust retry attempts and throw error', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });

//         if (url.toString().includes('/csrf-token')) {
//           return new Response('mock-csrf-token', { status: 200 });
//         }

//         // Always fail to test retry exhaustion
//         throw new Error('Network failure');
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         await assert.rejects(
//           () => SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test.js'),
//           Err.RetryAttemptsExhaustedError,
//           'Should throw when retry attempts are exhausted'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle timeout errors correctly', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });

//         if (url.toString().includes('/csrf-token')) {
//           return new Response('mock-csrf-token', { status: 200 });
//         }

//         // Simulate timeout
//         const abortError = new Error('Request timed out');
//         abortError.name = 'AbortError';
//         throw abortError;
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         await assert.rejects(
//           () => SESSION_MANAGER.csrfFetch('https://test.bluestep.net/files/123/test.js'),
//           Err.RequestTimeoutError,
//           'Should throw RequestTimeoutError for abort errors'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Session Management Operations', () => {
//     test('should check for valid session correctly', () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // No session initially
//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: 'https://test.bluestep.net' }),
//           false,
//           'Should have no valid session initially'
//         );

//         // Manually create a valid session
//         const sessions = (SESSION_MANAGER as any).sessions;
//         const sessionData: SessionData = {
//           JSESSIONID: 'test-session',
//           INGRESSCOOKIE: 'test-ingress',
//           lastCsrfToken: 'test-token',
//           lastTouched: Date.now()
//         };
//         sessions.set('https://test.bluestep.net', sessionData);

//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: 'https://test.bluestep.net' }),
//           true,
//           'Should have valid session after setting'
//         );

//         // Expire the session
//         sessionData.lastTouched = Date.now() - (31 * 60 * 1000); // 31 minutes ago
//         sessions.set('https://test.bluestep.net', sessionData);

//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: 'https://test.bluestep.net' }),
//           false,
//           'Should not have valid session when expired'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should clear specific session correctly', () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // Create sessions for multiple origins
//         const sessions = (SESSION_MANAGER as any).sessions;
//         const sessionData: SessionData = {
//           JSESSIONID: 'test-session',
//           INGRESSCOOKIE: 'test-ingress',
//           lastCsrfToken: 'test-token',
//           lastTouched: Date.now()
//         };

//         sessions.set('https://test1.bluestep.net', sessionData);
//         sessions.set('https://test2.bluestep.net', sessionData);

//         // Clear one session
//         SESSION_MANAGER.clearSession({ origin: 'https://test1.bluestep.net' });

//         // Check that only the specified session was cleared
//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: 'https://test1.bluestep.net' }),
//           false,
//           'Cleared session should be invalid'
//         );
//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: 'https://test2.bluestep.net' }),
//           true,
//           'Other session should remain valid'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle URL objects in session operations', () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         const url = new URL('https://test.bluestep.net/some/path');

//         // Test with URL object
//         assert.strictEqual(
//           SESSION_MANAGER.hasValidSession({ origin: url }),
//           false,
//           'Should handle URL objects correctly'
//         );

//         SESSION_MANAGER.clearSession({ origin: url });
//         // Should not throw error
//         assert.ok(true, 'Should handle URL objects in clearSession');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Cookie Parsing', () => {
//     test('should parse Set-Cookie headers correctly', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       // Custom fetch to test cookie parsing
//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });

//         if (url.toString().includes('/lookup/test')) {
//           // Use getSetCookie to properly set multiple cookies
//           const response = new Response('OK', {
//             status: 200,
//             headers: new Headers()
//           });

//           // Manually set the headers to test parsing
//           const setCookieHeader = [
//             'JSESSIONID=ABC123XYZ; Path=/; HttpOnly; Secure',
//             'INGRESSCOOKIE=DEF456UVW; Path=/; HttpOnly',
//             'OTHER=value; Path=/test'
//           ];

//           // Mock the response to have multiple Set-Cookie headers
//           Object.defineProperty(response, 'headers', {
//             value: {
//               get: (name: string) => {
//                 if (name.toLowerCase() === 'set-cookie') {
//                   return setCookieHeader.join(', ');
//                 }
//                 return null;
//               },
//               getSetCookie: () => setCookieHeader
//             }
//           });

//           return response;
//         }

//         return new Response('OK', { status: 200 });
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         await SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test.js');

//         // Verify session was created with correct cookie values
//         const sessions = (SESSION_MANAGER as any).sessions;
//         const sessionData = sessions.get('https://test.bluestep.net');

//         assert.ok(sessionData, 'Session should be created');
//         assert.strictEqual(sessionData.JSESSIONID, 'ABC123XYZ', 'JSESSIONID should be parsed correctly');
//         assert.strictEqual(sessionData.INGRESSCOOKIE, 'DEF456UVW', 'INGRESSCOOKIE should be parsed correctly');
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle malformed cookie headers gracefully', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       globalThis.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
//         fetchCalls.push({ url: url.toString(), options });

//         if (url.toString().includes('/lookup/test')) {
//           const response = new Response('OK', { status: 200 });

//           // Mock malformed cookie headers
//           Object.defineProperty(response, 'headers', {
//             value: {
//               get: (name: string) => {
//                 if (name.toLowerCase() === 'set-cookie') {
//                   return 'malformed=; =value; =; incomplete';
//                 }
//                 return null;
//               },
//               getSetCookie: () => ['malformed=', '=value', '=', 'incomplete']
//             }
//           });

//           return response;
//         }

//         return new Response('OK', { status: 200 });
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // This should not throw even with malformed cookies
//         await assert.rejects(
//           () => SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test.js'),
//           Error, // Should throw SessionIdMissingError due to missing JSESSIONID
//           'Should handle malformed cookies but fail due to missing session ID'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Session Cleanup and Maintenance', () => {
//     test('should clean up expired sessions automatically', (done) => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         const sessions = (SESSION_MANAGER as any).sessions;

//         // Create an expired session
//         const expiredSessionData: SessionData = {
//           JSESSIONID: 'expired-session',
//           INGRESSCOOKIE: 'expired-ingress',
//           lastCsrfToken: 'expired-token',
//           lastTouched: Date.now() - (35 * 60 * 1000) // 35 minutes ago (expired)
//         };

//         const validSessionData: SessionData = {
//           JSESSIONID: 'valid-session',
//           INGRESSCOOKIE: 'valid-ingress',
//           lastCsrfToken: 'valid-token',
//           lastTouched: Date.now() // Current time (valid)
//         };

//         sessions.set('https://expired.bluestep.net', expiredSessionData);
//         sessions.set('https://valid.bluestep.net', validSessionData);

//         // Verify both sessions exist initially
//         assert.strictEqual(sessions.has('https://expired.bluestep.net'), true);
//         assert.strictEqual(sessions.has('https://valid.bluestep.net'), true);

//         // Trigger cleanup manually by calling the private method
//         // In a real scenario, this would happen automatically via setTimeout
//         setTimeout(() => {
//           try {
//             const now = Date.now();
//             const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

//             sessions.forEach((session: SessionData, origin: string, sessionMap: any) => {
//               if (now - session.lastTouched > MAX_SESSION_DURATION) {
//                 sessionMap.delete(origin);
//               }
//             });

//             // Verify expired session was cleaned up
//             assert.strictEqual(sessions.has('https://expired.bluestep.net'), false, 'Expired session should be cleaned up');
//             assert.strictEqual(sessions.has('https://valid.bluestep.net'), true, 'Valid session should remain');

//             done();
//           } catch (error) {
//             done(error);
//           }
//         }, 10);
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle concurrent session operations', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // Create multiple concurrent session operations
//         const operations = [];
//         for (let i = 0; i < 5; i++) {
//           operations.push(
//             SESSION_MANAGER.fetch(`https://test${i}.bluestep.net/files/123/test.js`)
//               .catch(() => {}) // Ignore errors for this test
//           );
//         }

//         await Promise.all(operations);

//         // Verify that all sessions were created without conflicts
//         for (let i = 0; i < 5; i++) {
//           // Sessions might not all be created due to auth errors, but the manager should handle concurrency
//           assert.ok(true, 'Concurrent operations should complete without deadlocks');
//         }
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });

//   suite('Error Scenarios and Edge Cases', () => {
//     test('should handle network failures gracefully', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       globalThis.fetch = async () => {
//         throw new Error('Network connection failed');
//       };

//       try {
//         SESSION_MANAGER.init(mockApp);

//         await assert.rejects(
//           () => SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test.js'),
//           Error,
//           'Should handle network failures'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle invalid URLs gracefully', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // Test with invalid URL
//         await assert.rejects(
//           () => SESSION_MANAGER.fetch('not-a-valid-url'),
//           Error,
//           'Should handle invalid URLs'
//         );
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });

//     test('should handle session storage failures', async () => {
//       const originalInitManagers = Auth.initManagers;
//       const originalDetermineManager = Auth.determineManager;

//       Auth.initManagers = () => {};
//       Auth.determineManager = () => createMockAuthManager() as any;

//       try {
//         SESSION_MANAGER.init(mockApp);

//         // Mock the sessions map to throw errors
//         const sessions = (SESSION_MANAGER as any).sessions;
//         const originalSet = sessions.set;
//         sessions.set = () => {
//           throw new Error('Storage failure');
//         };

//         await assert.rejects(
//           () => SESSION_MANAGER.fetch('https://test.bluestep.net/files/123/test.js'),
//           Error,
//           'Should handle session storage failures'
//         );

//         // Restore original method
//         sessions.set = originalSet;
//       } finally {
//         Auth.initManagers = originalInitManagers;
//         Auth.determineManager = originalDetermineManager;
//       }
//     });
//   });
// });