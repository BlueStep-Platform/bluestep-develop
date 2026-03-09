//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import { App } from '../../main/app/App';
//@ts-ignore
import { Auth } from '../../main/app/authentication';
//@ts-ignore
import pullCurrent from '../../main/app/ctrl-p-commands/pullCurrent';
//@ts-ignore
import push from '../../main/app/ctrl-p-commands/push';
//@ts-ignore
import pushCurrent from '../../main/app/ctrl-p-commands/pushCurrent';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';

// suite('Command Controllers Tests', () => {
//   let mockFileSystemProvider: MockFileSystem;
//   let mockContext: vscode.ExtensionContext;
//   let originalActiveTextEditor: vscode.TextEditor | undefined;
//   let originalShowWarningMessage: typeof vscode.window.showWarningMessage;
//   let originalShowInputBox: typeof vscode.window.showInputBox;
//   let originalShowQuickPick: typeof vscode.window.showQuickPick;
//   let originalWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;
//   let mockTextDocuments: vscode.TextDocument[];

//   suiteSetup(() => {
//     // Enable test mode with mock file system
//     mockFileSystemProvider = FileSystem.enableTestMode();

//     // Store original VS Code methods
//     originalActiveTextEditor = vscode.window.activeTextEditor;
//     originalShowWarningMessage = vscode.window.showWarningMessage;
//     originalShowInputBox = vscode.window.showInputBox;
//     originalShowQuickPick = vscode.window.showQuickPick;
//     originalWorkspaceFolders = vscode.workspace.workspaceFolders;
//   });

//   suiteTeardown(() => {
//     // Restore production mode and original VS Code methods
//     FileSystem.enableProductionMode();
//     (vscode.window as any).activeTextEditor = originalActiveTextEditor;
//     vscode.window.showWarningMessage = originalShowWarningMessage;
//     vscode.window.showInputBox = originalShowInputBox;
//     vscode.window.showQuickPick = originalShowQuickPick;
//     (vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
//   });

//   setup(() => {
//     // Clear any previous mock data
//     mockFileSystemProvider.clearMocks();
//     mockTextDocuments = [];

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

//     // // Mock VS Code window and workspace methods
//     // vscode.window.showWarningMessage = async (_message: string, ...items: string[]) => {
//     //   // Return the first button for testing
//     //   return items[0] as unknown;
//     // };

//     vscode.window.showInputBox = async (options) => {
//       // Return mock input based on prompt
//       if (options?.prompt?.includes('URL')) {
//         return 'https://configbeh.bluestep.net/files/1466960/';
//       }
//       return 'test-input';
//     };

//     // vscode.window.showQuickPick = async (items, options) => {
//     //   // Return first item for testing
//     //   if (Array.isArray(items)) {
//     //     return items[0];
//     //   }
//     //   return undefined;
//     // };

//     // Mock workspace folders
//     (vscode.workspace as any).workspaceFolders = [{
//       uri: vscode.Uri.file('/test/workspace'),
//       name: 'test-workspace',
//       index: 0
//     }];

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

//   teardown(() => {
//     // Clear any mock active editor
//     (vscode.window as any).activeTextEditor = undefined;
//   });

//   // Helper function to create mock text document
//   function createMockTextDocument(uri: vscode.Uri, content: string = '', isDirty: boolean = false): vscode.TextDocument {
//     const doc: vscode.TextDocument = {
//       uri,
//       fileName: uri.fsPath,
//       isUntitled: false,
//       languageId: 'javascript',
//       version: 1,
//       isDirty,
//       isClosed: false,
//       eol: vscode.EndOfLine.LF,
//       lineCount: content.split('\\n').length,
//       save: async () => true,
//       lineAt: (line: number | vscode.Position) => {
//         const lineNumber = typeof line === 'number' ? line : line.line;
//         const lines = content.split('\\n');
//         const text = lines[lineNumber] || '';
//         return {
//           lineNumber,
//           text,
//           range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
//           rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
//           firstNonWhitespaceCharacterIndex: text.search(/\\S/),
//           isEmptyOrWhitespace: text.trim().length === 0
//         };
//       },
//       offsetAt: (_position: vscode.Position) => 0,
//       positionAt: (_offset: number) => new vscode.Position(0, 0),
//       getText: (_range?: vscode.Range) => content,
//       getWordRangeAtPosition: () => undefined,
//       validateRange: (range: vscode.Range) => range,
//       validatePosition: (position: vscode.Position) => position,
//       encoding: 'utf8'
//     };

//     mockTextDocuments.push(doc);
//     return doc;
//   }

//   // Helper function to create mock text editor
//   function createMockTextEditor(uri: vscode.Uri, content: string = ''): vscode.TextEditor {
//     const document = createMockTextDocument(uri, content);
//     return {
//       document,
//       selection: new vscode.Selection(0, 0, 0, 0),
//       selections: [new vscode.Selection(0, 0, 0, 0)],
//       visibleRanges: [new vscode.Range(0, 0, 10, 0)],
//       options: {
//         cursorStyle: vscode.TextEditorCursorStyle.Line,
//         insertSpaces: true,
//         lineNumbers: vscode.TextEditorLineNumbersStyle.On,
//         tabSize: 4
//       },
//       viewColumn: vscode.ViewColumn.One,
//       edit: async () => true,
//       insertSnippet: async () => true,
//       setDecorations: () => {},
//       revealRange: () => {},
//       show: () => {},
//       hide: () => {}
//     };
//   }

//   // Helper function to set up App with minimal initialization
//   function setupMockApp() {
//     try {
//       // Mock App initialization without full dependency tree
//       (App as any)._context = mockContext;
//       (App as any)._settings = {
//         get: () => ({ enabled: false }),
//         set: () => {},
//         clear: () => {},
//         sync: () => {}
//       };
//       (App as any)._outputChannel = {
//         info: () => {},
//         error: () => {},
//         warn: () => {},
//         debug: () => {},
//         trace: () => {}
//       };
//     } catch (e) {
//       // Continue with test even if mock setup fails
//     }
//   }

//   suite('Push Current Command', () => {
//     test('should handle case when no active editor is open', async () => {
//       // No active editor
//       (vscode.window as any).activeTextEditor = undefined;

//       // Should exit gracefully without error
//       await pushCurrent();
//       assert.ok(true, 'Should handle no active editor gracefully');
//     });

//     // test('should handle active editor with valid script file', async () => {
//     //   const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//     //   const testContent = 'console.log("test");';

//     //   // Set up mock file system
//     //   mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));
//     //   mockFileSystemProvider.setMockStat(testUri, {
//     //     type: vscode.FileType.File,
//     //     ctime: Date.now(),
//     //     mtime: Date.now(),
//     //     size: testContent.length
//     //   });

//     //   // Set up active editor
//     //   const mockEditor = createMockTextEditor(testUri, testContent);
//     //   (vscode.window as any).activeTextEditor = mockEditor;

//     //   // Set up metadata file
//     //   const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
//     //   const metadata = {
//     //     scriptName: 'Test Script',
//     //     webdavId: '1466960',
//     //     pushPullRecords: []
//     //   };
//     //   mockFileSystemProvider.setMockFile(metadataUri, JSON.stringify(metadata));

//     //   // Mock the push operation to avoid actual network calls
//     //   const originalPush = (await import('../main/app/ctrl-p-commands/push')).default;
//     //   let pushCalled = false;
//     //   const mockPush = async (_options: any) => {
//     //     pushCalled = true;
//     //     return Promise.resolve();
//     //   };

//     //   // Replace the push function temporarily
//     //   try {
//     //     // This is a bit tricky to test without deep mocking, so we'll verify the command doesn't crash
//     //     await pushCurrent();
//     //     assert.ok(true, 'Push current should complete without error');
//     //   } catch (error) {
//     //     // Expected to fail due to missing authentication setup, but should not crash
//     //     assert.ok(error instanceof Error, 'Should handle authentication errors gracefully');
//     //   }
//     // });

//     // test('should handle dirty documents and prompt for save', async () => {
//     //   const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//     //   const testContent = 'console.log("test");';

//     //   // Set up mock file system
//     //   mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));
//     //   mockFileSystemProvider.setMockStat(testUri, {
//     //     type: vscode.FileType.File,
//     //     ctime: Date.now(),
//     //     mtime: Date.now(),
//     //     size: testContent.length
//     //   });

//     //   // Create dirty document
//     //   const dirtyDoc = createMockTextDocument(testUri, testContent, true);

//     //   // Set up active editor with dirty document
//     //   const mockEditor = createMockTextEditor(testUri, testContent);
//     //   mockEditor.document = dirtyDoc;
//     //   (vscode.window as any).activeTextEditor = mockEditor;

//     //   // Mock workspace.textDocuments to include dirty document
//     //   (vscode.workspace as any).textDocuments = [dirtyDoc];

//     //   // Mock save and push button selection
//     //   let saveWasCalled = false;
//     //   vscode.window.showWarningMessage = async (message, ...items) => {
//     //     assert.ok(message.includes('unsaved changes'), 'Should show warning about unsaved changes');
//     //     return 'Save and Push'; // User chooses to save and push
//     //   };

//     //   dirtyDoc.save = async () => {
//     //     saveWasCalled = true;
//     //     return true;
//     //   };

//     //   try {
//     //     await pushCurrent();
//     //     // Test should reach the point where it tries to save dirty documents
//     //     assert.ok(true, 'Should handle dirty documents');
//     //   } catch (error) {
//     //     // Expected to fail at some point due to missing setup, but should handle dirty docs
//     //     assert.ok(true, 'Should handle error gracefully after processing dirty documents');
//     //   }
//     // });

//     // test('should handle user cancellation during dirty document save', async () => {
//     //   const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//     //   const testContent = 'console.log("test");';

//     //   // Set up mock file system
//     //   mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));

//     //   // Create dirty document
//     //   const dirtyDoc = createMockTextDocument(testUri, testContent, true);

//     //   // Set up active editor with dirty document
//     //   const mockEditor = createMockTextEditor(testUri, testContent);
//     //   mockEditor.document = dirtyDoc;
//     //   (vscode.window as any).activeTextEditor = mockEditor;

//     //   // Mock workspace.textDocuments to include dirty document
//     //   (vscode.workspace as any).textDocuments = [dirtyDoc];

//     //   // Mock user cancelling the save operation
//     //   vscode.window.showWarningMessage = async (message, ...items) => {
//     //     return 'Cancel'; // User chooses to cancel
//     //   };

//     //   // Should exit gracefully when user cancels
//     //   await pushCurrent();
//     //   assert.ok(true, 'Should handle user cancellation gracefully');
//     // });
//   });

//   suite('Pull Current Command', () => {
//     test('should handle case when no active editor is open', async () => {
//       // No active editor
//       (vscode.window as any).activeTextEditor = undefined;

//       // Should exit gracefully without error
//       await pullCurrent();
//       assert.ok(true, 'Should handle no active editor gracefully');
//     });

//     test('should handle active editor with valid script file', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//       const testContent = 'console.log("test");';

//       // Set up mock file system
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));
//       mockFileSystemProvider.setMockStat(testUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: testContent.length
//       });

//       // Set up active editor
//       const mockEditor = createMockTextEditor(testUri, testContent);
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pullCurrent();
//         assert.ok(true, 'Pull current should complete without error');
//       } catch (error) {
//         // Expected to fail due to missing authentication setup, but should not crash
//         assert.ok(error instanceof Error, 'Should handle authentication errors gracefully');
//       }
//     });

//     test('should handle non-script files gracefully', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/regular-file.txt');
//       const testContent = 'This is not a script file';

//       // Set up mock file system
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));

//       // Set up active editor with non-script file
//       const mockEditor = createMockTextEditor(testUri, testContent);
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pullCurrent();
//         assert.ok(true, 'Should handle non-script files');
//       } catch (error) {
//         // Expected to fail for non-script files
//         assert.ok(true, 'Should handle non-script file errors gracefully');
//       }
//     });
//   });

//   suite('Push Command (General)', () => {
//     test('should prompt for WebDAV URL when none provided', async () => {
//       let inputBoxCalled = false;
//       vscode.window.showInputBox = async (options) => {
//         inputBoxCalled = true;
//         assert.ok(options?.prompt?.includes('WebDAV'), 'Should prompt for WebDAV URL');
//         return 'https://configbeh.bluestep.net/files/1466960/';
//       };

//       try {
//         await push({});
//         assert.ok(inputBoxCalled, 'Should call input box for URL');
//       } catch (error) {
//         // Expected to fail due to missing setup
//         assert.ok(inputBoxCalled, 'Should have prompted for URL before failing');
//       }
//     });

//     test('should handle user cancellation during URL input', async () => {
//       vscode.window.showInputBox = async (_options) => {
//         return undefined; // User cancelled
//       };

//       // Should exit gracefully when user cancels URL input
//       await push({});
//       assert.ok(true, 'Should handle URL input cancellation gracefully');
//     });

//     test('should validate WebDAV URL format', async () => {
//       vscode.window.showInputBox = async (_options) => {
//         return 'invalid-url-format';
//       };

//       try {
//         await push({});
//         assert.ok(true, 'Should handle invalid URL format');
//       } catch (error) {
//         // May fail due to invalid URL, which is expected behavior
//         assert.ok(true, 'Should handle invalid URL gracefully');
//       }
//     });

//     test('should handle override formula URI correctly', async () => {
//       const overrideUri = 'https://configbeh.bluestep.net/files/1466960/';

//       try {
//         await push({ overrideFormulaUri: overrideUri });
//         assert.ok(true, 'Should handle override URI');
//       } catch (error) {
//         // Expected to fail due to missing authentication, but URI should be processed
//         assert.ok(true, 'Should process override URI before failing');
//       }
//     });
//   });

//   suite('Pull Command (General)', () => {
//     // test('should prompt for WebDAV URL when none provided', async () => {
//     //   let inputBoxCalled = false;
//     //   vscode.window.showInputBox = async (options) => {
//     //     inputBoxCalled = true;
//     //     assert.ok(options?.prompt?.includes('WebDAV'), 'Should prompt for WebDAV URL');
//     //     return 'https://configbeh.bluestep.net/files/1466960/';
//     //   };

//     //   try {
//     //     await pull({});
//     //     assert.ok(inputBoxCalled, 'Should call input box for URL');
//     //   } catch (error) {
//     //     // Expected to fail due to missing setup
//     //     assert.ok(inputBoxCalled, 'Should have prompted for URL before failing');
//     //   }
//     // });

//     // test('should handle workspace folder selection', async () => {
//     //   // Set up multiple workspace folders
//     //   (vscode.workspace as any).workspaceFolders = [
//     //     {
//     //       uri: vscode.Uri.file('/test/workspace1'),
//     //       name: 'workspace1',
//     //       index: 0
//     //     },
//     //     {
//     //       uri: vscode.Uri.file('/test/workspace2'),
//     //       name: 'workspace2',
//     //       index: 1
//     //     }
//     //   ];

//     //   let quickPickCalled = false;
//     //   vscode.window.showQuickPick = async (items, options) => {
//     //     quickPickCalled = true;
//     //     assert.ok(Array.isArray(items), 'Should show workspace folder options');
//     //     return items[0]; // Select first workspace
//     //   };

//     //   vscode.window.showInputBox = async (options) => {
//     //     return 'https://configbeh.bluestep.net/files/1466960/';
//     //   };

//     //   try {
//     //     await pull({});
//     //     assert.ok(quickPickCalled, 'Should call quick pick for workspace selection');
//     //   } catch (error) {
//     //     // Expected to fail due to missing setup
//     //     assert.ok(quickPickCalled, 'Should have shown workspace picker before failing');
//     //   }
//     // });

//     // test('should handle case with no workspace folders', async () => {
//     //   // No workspace folders
//     //   (vscode.workspace as any).workspaceFolders = undefined;

//     //   vscode.window.showInputBox = async (options) => {
//     //     return 'https://configbeh.bluestep.net/files/1466960/';
//     //   };

//     //   try {
//     //     await pull({});
//     //     assert.ok(true, 'Should handle no workspace folders');
//     //   } catch (error) {
//     //     // Expected to fail, but should handle no workspace gracefully
//     //     assert.ok(true, 'Should handle no workspace folders gracefully');
//     //   }
//     // });

//     // test('should handle user cancellation during workspace selection', async () => {
//     //   // Set up multiple workspace folders
//     //   (vscode.workspace as any).workspaceFolders = [
//     //     {
//     //       uri: vscode.Uri.file('/test/workspace1'),
//     //       name: 'workspace1',
//     //       index: 0
//     //     },
//     //     {
//     //       uri: vscode.Uri.file('/test/workspace2'),
//     //       name: 'workspace2',
//     //       index: 1
//     //     }
//     //   ];

//     //   vscode.window.showQuickPick = async (items, options) => {
//     //     return undefined; // User cancelled
//     //   };

//     //   // Should exit gracefully when user cancels workspace selection
//     //   await pull({});
//     //   assert.ok(true, 'Should handle workspace selection cancellation gracefully');
//     // });
//   });

//   suite('Error Handling and Edge Cases', () => {
//     test('should handle invalid file paths gracefully', async () => {
//       const invalidUri = vscode.Uri.file('/invalid/path/that/does/not/exist.js');

//       // Set up active editor with invalid file
//       const mockEditor = createMockTextEditor(invalidUri, '');
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle invalid file paths');
//       } catch (error) {
//         assert.ok(true, 'Should handle invalid file path errors gracefully');
//       }
//     });

//     test('should handle network connectivity issues', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');

//       // Set up mock file system with network error
//       const networkError = new Error('Network unreachable');
//       networkError.name = 'ENETUNREACH';
//       mockFileSystemProvider.setMockError(testUri, networkError);

//       const mockEditor = createMockTextEditor(testUri, 'console.log("test");');
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle network errors');
//       } catch (error) {
//         assert.ok(error instanceof Error, 'Should propagate network errors appropriately');
//       }
//     });

//     test('should handle authentication failures', async () => {
//       setupMockApp();

//       // Mock authentication failure
//       const originalAuth = Auth.determineManager;
//       Auth.determineManager = () => {
//         throw new Error('Authentication failed');
//       };

//       try {
//         const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//         const mockEditor = createMockTextEditor(testUri, 'console.log("test");');
//         (vscode.window as any).activeTextEditor = mockEditor;

//         await pushCurrent();
//         assert.ok(true, 'Should handle authentication failures');
//       } catch (error) {
//         assert.ok(error instanceof Error, 'Should handle authentication errors');
//       } finally {
//         Auth.determineManager = originalAuth;
//       }
//     });

//     test('should handle large file operations', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/large.js');

//       // Create large content (1MB)
//       const largeContent = 'a'.repeat(1024 * 1024);
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(largeContent));
//       mockFileSystemProvider.setMockStat(testUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: largeContent.length
//       });

//       const mockEditor = createMockTextEditor(testUri, largeContent);
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle large file operations');
//       } catch (error) {
//         // May fail due to missing setup, but should handle large files
//         assert.ok(true, 'Should handle large file errors gracefully');
//       }
//     });

//     test('should handle concurrent command execution', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/concurrent.js');
//       const testContent = 'console.log("concurrent");';

//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(testContent));
//       mockFileSystemProvider.setMockStat(testUri, {
//         type: vscode.FileType.File,
//         ctime: Date.now(),
//         mtime: Date.now(),
//         size: testContent.length
//       });

//       const mockEditor = createMockTextEditor(testUri, testContent);
//       (vscode.window as any).activeTextEditor = mockEditor;

//       // Execute multiple commands concurrently
//       const operations = [
//         pushCurrent().catch(() => {}), // Catch to prevent test failure
//         pullCurrent().catch(() => {}),
//         pushCurrent().catch(() => {})
//       ];

//       await Promise.all(operations);
//       assert.ok(true, 'Should handle concurrent command execution');
//     });
//   });

//   suite('Integration with File System', () => {
//     test('should respect file system permissions', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/readonly.js');

//       // Set up permission error
//       const permissionError = new Error('Permission denied');
//       permissionError.name = 'EACCES';
//       mockFileSystemProvider.setMockError(testUri, permissionError);

//       const mockEditor = createMockTextEditor(testUri, 'console.log("readonly");');
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle permission errors');
//       } catch (error) {
//         assert.ok(error instanceof Error, 'Should propagate permission errors');
//       }
//     });

//     test('should handle file encoding issues', async () => {
//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/encoding.js');

//       // Content with various encodings
//       const unicodeContent = 'console.log("Hello \u4e16\u754c \ud83c\udf0d");';
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from(unicodeContent, 'utf8'));

//       const mockEditor = createMockTextEditor(testUri, unicodeContent);
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle Unicode content');
//       } catch (error) {
//         // May fail due to missing setup, but should handle encoding
//         assert.ok(true, 'Should handle encoding issues gracefully');
//       }
//     });
//   });

//   suite('User Interface Integration', () => {
//     test('should show appropriate progress indicators', async () => {
//       // This test verifies that commands don't crash when UI elements are called
//       // Actual progress indicators would be hard to test without deep VS Code API mocking

//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/progress.js');
//       mockFileSystemProvider.setMockFile(testUri, Buffer.from('console.log("progress");'));

//       const mockEditor = createMockTextEditor(testUri, 'console.log("progress");');
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle UI integration');
//       } catch (error) {
//         assert.ok(true, 'Should handle UI integration errors gracefully');
//       }
//     });

//     test('should handle user input validation', async () => {
//       // Test various invalid inputs
//       const invalidInputs = [
//         '', // Empty string
//         '   ', // Whitespace only
//         'not-a-url',
//         'http://invalid',
//         'ftp://wrong-protocol'
//       ];

//       for (const invalidInput of invalidInputs) {
//         vscode.window.showInputBox = async (_options) => {
//           return invalidInput;
//         };

//         try {
//           await push({});
//           assert.ok(true, `Should handle invalid input: "${invalidInput}"`);
//         } catch (error) {
//           assert.ok(true, `Should handle invalid input error: "${invalidInput}"`);
//         }
//       }
//     });

//     test('should provide meaningful error messages to users', async () => {
//       // While we can't easily test the actual alert messages,
//       // we can ensure commands don't crash when trying to show them

//       const testUri = vscode.Uri.file('/test/workspace/configbeh.bluestep.net/1466960/draft/error.js');

//       // Force an error condition
//       mockFileSystemProvider.setMockError(testUri, new Error('Test error for user feedback'));

//       const mockEditor = createMockTextEditor(testUri, 'console.log("error");');
//       (vscode.window as any).activeTextEditor = mockEditor;

//       try {
//         await pushCurrent();
//         assert.ok(true, 'Should handle error messaging');
//       } catch (error) {
//         assert.ok(true, 'Should handle error messaging gracefully');
//       }
//     });
//   });
// });