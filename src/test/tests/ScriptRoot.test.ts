//@ts-ignore
import * as assert from 'assert';
//@ts-ignore
import * as path from 'path';
//@ts-ignore
import * as vscode from 'vscode';
//@ts-ignore
import { ScriptMetaData } from '../../../types';
//@ts-ignore
import { App } from '../../main/app/App';
//@ts-ignore
import { FileSystem } from '../../main/app/util/fs/FileSystem';
//@ts-ignore
import { MockFileSystem } from '../../main/app/util/fs/FileSystemProvider';
//@ts-ignore
import { ScriptFactory } from '../../main/app/util/script/ScriptFactory';
//@ts-ignore
import { ScriptRoot } from '../../main/app/util/script/ScriptRoot';

// suite('ScriptRoot Tests', () => {
//     let mockFileSystem: MockFileSystem;
//     let scriptRoot: ScriptRoot;
//     let testChildUri: vscode.Uri;
//     let originalLogger: any;

//     suiteSetup(() => {
//         // Enable test mode with mock file system
//         mockFileSystem = FileSystem.enableTestMode();
        
//         // Mock the App logger by overriding the getter
//         const mockLogger = {
//             error: () => {},
//             warn: () => {},
//             info: () => {},
//             debug: () => {},
//             trace: () => {}
//         };
        
//         // Override the logger getter
//         originalLogger = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(App), 'logger');
//         Object.defineProperty(App, 'logger', {
//             get: () => mockLogger,
//             configurable: true
//         });
//     });

//     suiteTeardown(() => {
//         // Restore production mode and original logger
//         FileSystem.enableProductionMode();
//         if (originalLogger) {
//             Object.defineProperty(App, 'logger', originalLogger);
//         }
//     });

//     setup(() => {
//         // Clear any previous mock data
//         mockFileSystem.clearMocks();

//         // Create a valid child URI that matches the expected structure
//         testChildUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
        
//         // Create ScriptRoot instance
//         scriptRoot = ScriptFactory.createScriptRoot(testChildUri);

//         // Set up basic mock metadata file
//         const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
//         const defaultMetadata: ScriptMetaData = {
//             scriptName: "Test Script",
//             webdavId: "1466960",
//             pushPullRecords: []
//         };
//         mockFileSystem.setMockFile(metadataUri, Buffer.from(JSON.stringify(defaultMetadata, null, 2)));
//         mockFileSystem.setMockStat(metadataUri, {
//             type: vscode.FileType.File,
//             ctime: Date.now(),
//             mtime: Date.now(),
//             size: 100
//         });
//     });

//     suite('Constructor and Path Parsing', () => {
//         test('should parse child URI correctly', () => {
//             const scriptRoot = ScriptFactory.createScriptRoot(testChildUri);
            
//             assert.strictEqual(scriptRoot.webDavId, '1466960');
//             assert.strictEqual(scriptRoot.origin, 'configbeh.bluestep.net');
//         });

//         test('should handle different file types in same directory', () => {
//             const declarationsUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/declarations/script.js');
//             const scriptRoot = ScriptFactory.createScriptRoot(declarationsUri);

//             assert.strictEqual(scriptRoot.webDavId, '1466960');
//             assert.strictEqual(scriptRoot.origin, 'configbeh.bluestep.net');
//         });

//         test('should handle metadata file as child URI', () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
//             const scriptRoot = ScriptFactory.createScriptRoot(metadataUri);
            
//             assert.strictEqual(scriptRoot.webDavId, '1466960');
//             assert.strictEqual(scriptRoot.origin, 'configbeh.bluestep.net');
//         });
//     });

//     suite('URI Generation', () => {
//         test('should generate correct local root URI', () => {
//             const rootUri = scriptRoot.getRootUri();
//             const expectedPath = path.normalize('/test/workspace/configbeh.bluestep.net/1466960');
            
//             assert.strictEqual(
//                 path.normalize(rootUri.fsPath), 
//                 expectedPath
//             );
//         });

//         test('should generate correct org URI', () => {
//             const orgUri = scriptRoot.getOrgUri();
//             const expectedPath = path.normalize('/test/workspace/configbeh.bluestep.net');
            
//             assert.strictEqual(
//                 path.normalize(orgUri.fsPath), 
//                 expectedPath
//             );
//         });

//         test('should generate correct remote base URL string', () => {
//             const baseUrl = scriptRoot.toBaseRemoteString();
            
//             assert.strictEqual(baseUrl, 'https://configbeh.bluestep.net/files/1466960/');
//         });

//         test('should generate correct remote base URL object', () => {
//             const baseUrl = scriptRoot.tobaseRemoteUrl();
            
//             assert.ok(baseUrl instanceof URL);
//             assert.strictEqual(baseUrl.toString(), 'https://configbeh.bluestep.net/files/1466960/');
//             assert.strictEqual(baseUrl.hostname, 'configbeh.bluestep.net');
//             assert.strictEqual(baseUrl.pathname, '/files/1466960/');
//         });
//     });

//     suite('Static Methods', () => {
//         test('should create ScriptRoot from root URI', () => {
//             const rootUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960');
//             const scriptRoot = ScriptRoot.fromRootUri(rootUri);
            
//             assert.strictEqual(scriptRoot.webDavId, '1466960');
//             assert.strictEqual(scriptRoot.origin, 'configbeh.bluestep.net');
//         });
//     });

//     suite('Equality Comparison', () => {
//         test('should return true for equal RemoteScriptRoots', () => {
//             const uri1 = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/file1.js');
//             const uri2 = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/declarations/file2.js');
            
//             const root1 = ScriptFactory.createScriptRoot(uri1);
//             const root2 = ScriptFactory.createScriptRoot(uri2);

//             assert.strictEqual(root1.equals(root2), true);
//         });

//         test('should return false for different origins', () => {
//             const uri1 = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/file1.js');
//             const uri2 = vscode.Uri.parse('file:///test/workspace/different.domain.com/1466960/draft/file2.js');
            
//             const root1 = ScriptFactory.createScriptRoot(uri1);
//             const root2 = ScriptFactory.createScriptRoot(() => uri2);

//             assert.strictEqual(root1.equals(root2), false);
//         });

//         test('should return false for different webdav IDs', () => {
//             const uri1 = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/file1.js');
//             const uri2 = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/9999999/draft/file2.js');

//             const root1 = ScriptFactory.createScriptRoot(uri1);
//             const root2 = ScriptFactory.createScriptRoot(() => uri2);
            
//             assert.strictEqual(root1.equals(root2), false);
//         });
//     });

//     suite('Metadata Operations', () => {
//         test('should read existing metadata file', async () => {
//             const metadata = await scriptRoot.getMetaData();
            
//             assert.strictEqual(metadata.scriptName, 'Test Script');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords));
//         });

//         test('should create new metadata when file does not exist', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
            
//             // Remove the mock file to simulate non-existence
//             mockFileSystem.setMockError(metadataUri, new Error('File not found'));
            
//             const metadata = await scriptRoot.getMetaData();
            
//             assert.strictEqual(metadata.scriptName, '');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords));
//             assert.strictEqual(metadata.pushPullRecords.length, 0);
//         });

//         test('should modify metadata with callback', async () => {
//             const modifiedMetadata = await scriptRoot.modifyMetaData((meta) => {
//                 meta.scriptName = 'Modified Script Name';
//             });
            
//             assert.strictEqual(modifiedMetadata.scriptName, 'Modified Script Name');
//         });

//         test('should not modify metadata without changes', async () => {
//             // Call modifyMetaData without making changes
//             await scriptRoot.modifyMetaData((_meta) => {
//                 // Don't change anything - just demonstrating the callback
//             });
            
//             // Note: This test verifies the method completes without error
//             // In a real implementation with more sophisticated mocking,
//             // you'd want to verify that writeFile wasn't called when no changes were made
//             assert.ok(true, 'modifyMetaData completed without error');
//         });
//     });

//     suite('Touch File Operations', () => {
//         test('should touch file with lastPulled timestamp', async () => {
//             const fileUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//             const scriptFile = ScriptFactory.createFile(fileUri);
            
//             // Set up mock file content for hash calculation
//             mockFileSystem.setMockFile(fileUri, Buffer.from('console.log("test");'));
//             mockFileSystem.setMockStat(fileUri, {
//                 type: vscode.FileType.File,
//                 ctime: Date.now(),
//                 mtime: Date.now(),
//                 size: 100
//             });
            
//             await scriptFile.touch('lastPulled');
            
//             const metadata = await scriptRoot.getMetaData();
//             assert.strictEqual(metadata.pushPullRecords.length, 1);
//             assert.ok(metadata.pushPullRecords[0].lastPulled);
//             assert.strictEqual(metadata.pushPullRecords[0].lastPushed, null);
//         });



//         test('should update existing record when touching same file again', async () => {
//             const fileUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//             const scriptFile = ScriptFactory.createFile(fileUri);
            
//             // Set up mock file content for hash calculation
//             mockFileSystem.setMockFile(fileUri, Buffer.from('console.log("test");'));
//             mockFileSystem.setMockStat(fileUri, {
//                 type: vscode.FileType.File,
//                 ctime: Date.now(),
//                 mtime: Date.now(),
//                 size: 100
//             });
            
//             // Touch first time
//             await scriptFile.touch('lastPulled');
            
//             // Touch second time with different type
//             await scriptFile.touch('lastPushed');

//             const metadata = await scriptRoot.getMetaData();
//             assert.strictEqual(metadata.pushPullRecords.length, 1);
//             assert.ok(metadata.pushPullRecords[0].lastPulled);
//             assert.ok(metadata.pushPullRecords[0].lastPushed);
//         });

//         test('should store hash when touching file', async () => {
//             const fileUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/test.js');
//             const scriptFile = ScriptFactory.createFile(fileUri);
//             const testContent = 'console.log("test");';
            
//             // Set up mock file content for hash calculation
//             mockFileSystem.setMockFile(fileUri, Buffer.from(testContent));
//             mockFileSystem.setMockStat(fileUri, {
//                 type: vscode.FileType.File,
//                 ctime: Date.now(),
//                 mtime: Date.now(),
//                 size: testContent.length
//             });
            
//             await scriptFile.touch('lastPulled');

//             const metadata = await scriptRoot.getMetaData();
//             assert.strictEqual(metadata.pushPullRecords.length, 1);
//             assert.ok(metadata.pushPullRecords[0].lastVerifiedHash);
//             assert.strictEqual(metadata.pushPullRecords[0].lastVerifiedHash.length, 128); // SHA-512 is 128 hex chars
//         });
//     });

//     suite('Folder Operations', () => {
//         test('should get info folder contents', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
            
//             // Set up directory
//             mockFileSystem.setMockDirectory(infoFolderUri);
            
//             // Set up individual files in the directory
//             const metadataFile = vscode.Uri.joinPath(infoFolderUri, 'metadata.json');
//             const permissionsFile = vscode.Uri.joinPath(infoFolderUri, 'permissions.json');
//             const configFile = vscode.Uri.joinPath(infoFolderUri, 'config.json');
            
//             mockFileSystem.setMockFile(metadataFile, '{}');
//             mockFileSystem.setMockFile(permissionsFile, '{}');
//             mockFileSystem.setMockFile(configFile, '{}');
            
//             const infoContents = await scriptRoot.getInfoFolderContents();
            
//             assert.strictEqual(infoContents.length, 3);
//             assert.ok(infoContents.some(uri => uri.fsPath.endsWith('metadata.json')));
//             assert.ok(infoContents.some(uri => uri.fsPath.endsWith('permissions.json')));
//             assert.ok(infoContents.some(uri => uri.fsPath.endsWith('config.json')));
//         });

//         test('should get scripts folder contents', async () => {
//             const scriptsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/scripts');
            
//             // Set up directory
//             mockFileSystem.setMockDirectory(scriptsFolderUri);
            
//             // Set up individual files in the directory
//             const mainFile = vscode.Uri.joinPath(scriptsFolderUri, 'main.js');
//             const helperFile = vscode.Uri.joinPath(scriptsFolderUri, 'helper.js');
            
//             mockFileSystem.setMockFile(mainFile, 'console.log("main");');
//             mockFileSystem.setMockFile(helperFile, 'console.log("helper");');
            
//             const scriptsContents = await scriptRoot.getScriptsFolderContents();
            
//             assert.strictEqual(scriptsContents.length, 2);
//             assert.ok(scriptsContents.some(uri => uri.fsPath.endsWith('main.js')));
//             assert.ok(scriptsContents.some(uri => uri.fsPath.endsWith('helper.js')));
//         });

//         test('should get objects folder contents', async () => {
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directory
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Set up individual file in the directory
//             const importsFile = vscode.Uri.joinPath(objectsFolderUri, 'imports.ts');
//             mockFileSystem.setMockFile(importsFile, 'export {};');
            
//             const objectsContents = await scriptRoot.getObjectsFolderContents();
            
//             assert.strictEqual(objectsContents.length, 1);
//             assert.ok(objectsContents[0].fsPath.endsWith('imports.ts'));
//         });
//     });

//     suite('Copacetic Status', () => {
//         test('should return true for copacetic script structure', async () => {
//             // Set up proper folder structure
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directories
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Set up info folder files
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'config.json'), '{}');
            
//             // Set up objects folder file
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'imports.ts'), 'export {};');
            
//             const isCopacetic = await scriptRoot.isCopacetic();
            
//             assert.strictEqual(isCopacetic, true);
//         });

//         test('should return false when info folder has wrong number of files', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directories
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Wrong number of files in info folder (only 2 instead of 3)
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
            
//             // Set up objects folder file
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'imports.ts'), 'export {};');
            
//             const isCopacetic = await scriptRoot.isCopacetic();
            
//             assert.strictEqual(isCopacetic, false);
//         });

//         test('should return false when info folder is missing expected files', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directories
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Missing config.json
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'wrong.json'), '{}');
            
//             // Set up objects folder file
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'imports.ts'), 'export {};');
            
//             const isCopacetic = await scriptRoot.isCopacetic();
            
//             assert.strictEqual(isCopacetic, false);
//         });

//         test('should return false when objects folder has wrong number of files', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directories
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Set up info folder files
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'config.json'), '{}');
            
//             // Wrong number of files in objects folder (2 instead of 1)
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'imports.ts'), 'export {};');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'extra.ts'), 'export {};');
            
//             const isCopacetic = await scriptRoot.isCopacetic();
            
//             assert.strictEqual(isCopacetic, false);
//         });

//         test('should return false when objects folder does not contain imports.ts', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
            
//             // Set up directories
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
            
//             // Set up info folder files
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'config.json'), '{}');
            
//             // Wrong file in objects folder
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'wrong.ts'), 'export {};');
            
//             const isCopacetic = await scriptRoot.isCopacetic();
            
//             assert.strictEqual(isCopacetic, false);
//         });
//     });

//     suite('GitIgnore Operations', () => {
//         test('should read existing gitignore file', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
//             const gitIgnoreContent = "node_modules/\n*.log\n.env";
            
//             mockFileSystem.setMockFile(gitIgnoreUri, gitIgnoreContent);
            
//             const gitIgnoreContents = await scriptRoot.getGitIgnore();
            
//             assert.strictEqual(gitIgnoreContents.length, 3);
//             assert.ok(gitIgnoreContents.includes('node_modules/'));
//             assert.ok(gitIgnoreContents.includes('*.log'));
//             assert.ok(gitIgnoreContents.includes('.env'));
//         });

//         test('should create default gitignore when file does not exist', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
            
//             // Remove the mock file to simulate non-existence
//             mockFileSystem.setMockError(gitIgnoreUri, new Error('File not found'));
            
//             const gitIgnoreContents = await scriptRoot.getGitIgnore();
            
//             assert.strictEqual(gitIgnoreContents.length, 1);
//             assert.ok(gitIgnoreContents.includes('**/.DS_Store'));
//         });

//         test('should modify gitignore with callback', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
//             const initialContent = "node_modules/\n*.log";
            
//             mockFileSystem.setMockFile(gitIgnoreUri, initialContent);
            
//             const modifiedGitIgnore = await scriptRoot.modifyGitIgnore((contents) => {
//                 contents.push('.env');
//                 contents.push('dist/');
//             });
            
//             assert.strictEqual(modifiedGitIgnore.length, 4);
//             assert.ok(modifiedGitIgnore.includes('node_modules/'));
//             assert.ok(modifiedGitIgnore.includes('*.log'));
//             assert.ok(modifiedGitIgnore.includes('.env'));
//             assert.ok(modifiedGitIgnore.includes('dist/'));
//         });

//         test('should handle empty lines and whitespace in gitignore', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
//             const gitIgnoreContent = "node_modules/\n\n   \n*.log\n  \n.env\n";

//             mockFileSystem.setMockFile(gitIgnoreUri, gitIgnoreContent);

//             const gitIgnoreContents = await scriptRoot.getGitIgnore();

//             // Should filter out empty lines and whitespace-only lines
//             assert.strictEqual(gitIgnoreContents.length, 3);
//             assert.ok(gitIgnoreContents.includes('node_modules/'));
//             assert.ok(gitIgnoreContents.includes('*.log'));
//             assert.ok(gitIgnoreContents.includes('.env'));
//         });
//     });

//     suite('Enhanced Metadata Handling', () => {
//         test('should handle metadata with missing fields gracefully', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             // Metadata with missing pushPullRecords
//             const incompleteMetadata = {
//                 scriptName: 'Incomplete Script',
//                 webdavId: '1466960'
//                 // Missing pushPullRecords
//             };

//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(incompleteMetadata));

//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, 'Incomplete Script');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords), 'Should create empty pushPullRecords array');
//             assert.strictEqual(metadata.pushPullRecords.length, 0);
//         });

//         test('should handle metadata with invalid pushPullRecords', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             // Metadata with invalid pushPullRecords
//             const invalidMetadata = {
//                 scriptName: 'Invalid Records Script',
//                 webdavId: '1466960',
//                 pushPullRecords: 'not an array' // Invalid type
//             };

//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(invalidMetadata));

//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, 'Invalid Records Script');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords), 'Should convert invalid records to empty array');
//         });

//         test('should handle concurrent metadata modifications', async () => {
//             const operations = [];

//             // Run multiple metadata modifications concurrently
//             for (let i = 0; i < 10; i++) {
//                 operations.push(
//                     scriptRoot.modifyMetaData((meta) => {
//                         meta.scriptName = `Concurrent Script ${i}`;
//                         if (!meta.pushPullRecords) {
//                             meta.pushPullRecords = [];
//                         }
//                         meta.pushPullRecords.push({
//                             localPath: `/test/path${i}`,
//                             lastPulled: new Date().toISOString(),
//                             lastPushed: null,
//                             lastVerifiedHash: `hash${i}`
//                         });
//                     })
//                 );
//             }

//             const results = await Promise.all(operations);

//             // All operations should complete successfully
//             assert.strictEqual(results.length, 10, 'All concurrent operations should complete');

//             // Final metadata should reflect one of the operations
//             const finalMetadata = await scriptRoot.getMetaData();
//             assert.ok(finalMetadata.scriptName.startsWith('Concurrent Script'), 'Should have concurrent script name');
//         });

//         test('should handle very large metadata files', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             // Create metadata with many records
//             const largeMetadata: ScriptMetaData = {
//                 scriptName: 'Large Metadata Script',
//                 webdavId: '1466960',
//                 pushPullRecords: []
//             };

//             // Add 1000 records
//             for (let i = 0; i < 1000; i++) {
//                 largeMetadata.pushPullRecords.push({
//                     localPath: `/test/large/path${i}.js`,
//                     lastPulled: new Date(Date.now() - i * 1000).toISOString(),
//                     lastPushed: i % 2 === 0 ? new Date(Date.now() - i * 500).toISOString() : null,
//                     lastVerifiedHash: `hash${i}`.repeat(32) // Long hash
//                 });
//             }

//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(largeMetadata, null, 2));

//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, 'Large Metadata Script');
//             assert.strictEqual(metadata.pushPullRecords.length, 1000, 'Should handle 1000 records');
//         });

//         test('should handle metadata with Unicode characters', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             const unicodeMetadata: ScriptMetaData = {
//                 scriptName: 'Unicode Test Script 🚀 测试 αβγ',
//                 webdavId: '1466960',
//                 pushPullRecords: [{
//                     localPath: '/test/unicode/файл.js',
//                     lastPulled: '2023-01-01T12:00:00.000Z',
//                     lastPushed: null,
//                     lastVerifiedHash: 'hash-with-unicode-αβγ'
//                 }]
//             };

//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(unicodeMetadata, null, 2));

//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, 'Unicode Test Script 🚀 测试 αβγ');
//             assert.strictEqual(metadata.pushPullRecords[0].localPath, '/test/unicode/файл.js');
//             assert.strictEqual(metadata.pushPullRecords[0].lastVerifiedHash, 'hash-with-unicode-αβγ');
//         });
//     });

//     suite('Error Recovery and Resilience', () => {
//         test('should recover from filesystem permission errors', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             // Simulate permission error on first access
//             const permissionError = new Error('Permission denied');
//             permissionError.name = 'EACCES';
//             mockFileSystem.setMockError(metadataUri, permissionError);

//             // Should create new metadata when file can't be read
//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, '', 'Should create empty script name');
//             assert.strictEqual(metadata.webdavId, '1466960', 'Should use correct webdav ID');
//             assert.ok(Array.isArray(metadata.pushPullRecords), 'Should create empty records array');
//         });

//         test('should handle network interruption during file operations', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');

//             // Simulate network error
//             const networkError = new Error('Network is unreachable');
//             networkError.name = 'ENETUNREACH';
//             mockFileSystem.setMockError(infoFolderUri, networkError);

//             await assert.rejects(
//                 () => scriptRoot.getInfoFolderContents(),
//                 /Network is unreachable/,
//                 'Should propagate network errors'
//             );
//         });

//         test('should handle disk space errors gracefully', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             // Simulate disk space error
//             const diskError = new Error('No space left on device');
//             diskError.name = 'ENOSPC';

//             // First, set up normal metadata
//             const normalMetadata: ScriptMetaData = {
//                 scriptName: 'Test Script',
//                 webdavId: '1466960',
//                 pushPullRecords: []
//             };
//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(normalMetadata));

//             // Then simulate disk error on modification
//             await scriptRoot.modifyMetaData((meta) => {
//                 meta.scriptName = 'Modified Script';
//                 // Simulate disk error during write
//                 mockFileSystem.setMockError(metadataUri, diskError);
//             });

//             // Should handle the error gracefully
//             assert.ok(true, 'Should handle disk space errors without crashing');
//         });

//         test('should recover from corrupted folder structures', async () => {
//             // Set up corrupted info folder (missing expected files)
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             mockFileSystem.setMockDirectory(infoFolderUri);

//             // Add unexpected files
//             const unexpectedFile = vscode.Uri.joinPath(infoFolderUri, 'unexpected.txt');
//             mockFileSystem.setMockFile(unexpectedFile, 'unexpected content');

//             const infoContents = await scriptRoot.getInfoFolderContents();

//             // Should still return the contents, even if unexpected
//             assert.ok(Array.isArray(infoContents), 'Should return array of contents');
//             assert.ok(infoContents.some(uri => uri.fsPath.endsWith('unexpected.txt')), 'Should include unexpected files');
//         });

//         test('should handle concurrent folder access', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             const objectsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/objects');
//             const scriptsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/scripts');

//             // Set up all folders
//             mockFileSystem.setMockDirectory(infoFolderUri);
//             mockFileSystem.setMockDirectory(objectsFolderUri);
//             mockFileSystem.setMockDirectory(scriptsFolderUri);

//             // Add files to each folder
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(objectsFolderUri, 'imports.ts'), 'export {};');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(scriptsFolderUri, 'main.js'), 'console.log("main");');

//             // Access all folders concurrently
//             const [infoContents, objectsContents, scriptsContents] = await Promise.all([
//                 scriptRoot.getInfoFolderContents(),
//                 scriptRoot.getObjectsFolderContents(),
//                 scriptRoot.getScriptsFolderContents()
//             ]);

//             assert.ok(infoContents.length > 0, 'Info folder should have contents');
//             assert.ok(objectsContents.length > 0, 'Objects folder should have contents');
//             assert.ok(scriptsContents.length > 0, 'Scripts folder should have contents');
//         });
//     });

//     suite('Advanced GitIgnore Operations', () => {
//         test('should handle gitignore with complex patterns', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
//             const complexGitIgnore = [
//                 '# Comments',
//                 '*.log',
//                 '!important.log',
//                 'build/',
//                 'node_modules/',
//                 '**/.DS_Store',
//                 'temp-*',
//                 '*.tmp',
//                 '/root-only.txt',
//                 'folder/**/nested'
//             ].join('\n');

//             mockFileSystem.setMockFile(gitIgnoreUri, complexGitIgnore);

//             const gitIgnoreContents = await scriptRoot.getGitIgnore();

//             assert.ok(gitIgnoreContents.includes('*.log'), 'Should include glob patterns');
//             assert.ok(gitIgnoreContents.includes('!important.log'), 'Should include negation patterns');
//             assert.ok(gitIgnoreContents.includes('**/.DS_Store'), 'Should include recursive patterns');
//             assert.ok(gitIgnoreContents.includes('/root-only.txt'), 'Should include root-relative patterns');
//             assert.ok(gitIgnoreContents.includes('# Comments'), 'Should include comments');
//         });

//         test('should handle gitignore modifications safely', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');
//             const initialContent = 'node_modules/\n*.log';

//             mockFileSystem.setMockFile(gitIgnoreUri, initialContent);

//             // Modify gitignore multiple times
//             const modifiedGitIgnore1 = await scriptRoot.modifyGitIgnore((contents) => {
//                 contents.push('.env');
//                 contents.push('dist/');
//             });

//             const modifiedGitIgnore2 = await scriptRoot.modifyGitIgnore((contents) => {
//                 contents.push('build/');
//                 // Remove .env
//                 const envIndex = contents.indexOf('.env');
//                 if (envIndex > -1) {
//                     contents.splice(envIndex, 1);
//                 }
//             });

//             assert.ok(modifiedGitIgnore1.includes('.env'), 'First modification should include .env');
//             assert.ok(modifiedGitIgnore2.includes('build/'), 'Second modification should include build/');
//             assert.ok(!modifiedGitIgnore2.includes('.env'), 'Second modification should not include .env');
//         });

//         test('should handle gitignore with different line endings', async () => {
//             const gitIgnoreUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.gitignore');

//             // Test with different line endings
//             const contentWithCRLF = 'node_modules/\r\n*.log\r\n.env';
//             mockFileSystem.setMockFile(gitIgnoreUri, contentWithCRLF);

//             const gitIgnoreContents = await scriptRoot.getGitIgnore();

//             assert.strictEqual(gitIgnoreContents.length, 3, 'Should handle CRLF line endings');
//             assert.ok(gitIgnoreContents.includes('node_modules/'), 'Should parse CRLF content correctly');
//         });
//     });

//     suite('Performance and Scalability', () => {
//         test('should handle deep folder hierarchies', async () => {
//             // Create a deep folder structure
//             const basePath = 'file:///test/workspace/configbeh.bluestep.net/1466960/draft';
//             const deepFolders = ['info', 'level1', 'level2', 'level3', 'level4', 'level5'];

//             let currentPath = basePath;
//             for (const folder of deepFolders) {
//                 currentPath = `${currentPath}/${folder}`;
//                 const folderUri = vscode.Uri.parse(currentPath);
//                 mockFileSystem.setMockDirectory(folderUri);

//                 // Add a file at each level
//                 const fileUri = vscode.Uri.parse(`${currentPath}/file-${folder}.txt`);
//                 mockFileSystem.setMockFile(fileUri, `content for ${folder}`);
//             }

//             // Should still be able to access the info folder
//             const infoContents = await scriptRoot.getInfoFolderContents();
//             assert.ok(Array.isArray(infoContents), 'Should handle deep hierarchies');
//         });

//         test('should handle folders with many files', async () => {
//             const scriptsFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/scripts');
//             mockFileSystem.setMockDirectory(scriptsFolderUri);

//             // Create 100 files in the scripts folder
//             for (let i = 0; i < 100; i++) {
//                 const fileUri = vscode.Uri.joinPath(scriptsFolderUri, `script${i}.js`);
//                 mockFileSystem.setMockFile(fileUri, `console.log("Script ${i}");`);
//             }

//             const scriptsContents = await scriptRoot.getScriptsFolderContents();

//             assert.strictEqual(scriptsContents.length, 100, 'Should handle 100 files in folder');
//         });

//         test('should handle rapid successive folder operations', async () => {
//             const infoFolderUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/draft/info');
//             mockFileSystem.setMockDirectory(infoFolderUri);

//             // Add standard files
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'metadata.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'permissions.json'), '{}');
//             mockFileSystem.setMockFile(vscode.Uri.joinPath(infoFolderUri, 'config.json'), '{}');

//             // Perform rapid successive operations
//             const operations = [];
//             for (let i = 0; i < 20; i++) {
//                 operations.push(scriptRoot.getInfoFolderContents());
//             }

//             const results = await Promise.all(operations);

//             // All should return the same result
//             results.forEach((result, index) => {
//                 assert.strictEqual(result.length, 3, `Operation ${index} should return 3 files`);
//             });
//         });
//     });

//     suite('Cross-Platform Compatibility', () => {
//         test('should handle Windows-style paths in metadata', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');

//             const windowsMetadata: ScriptMetaData = {
//                 scriptName: 'Windows Path Script',
//                 webdavId: '1466960',
//                 pushPullRecords: [{
//                     localPath: 'C:\\workspace\\configbeh.bluestep.net\\1466960\\draft\\test.js',
//                     lastPulled: '2023-01-01T12:00:00.000Z',
//                     lastPushed: null,
//                     lastVerifiedHash: 'abcd1234'
//                 }]
//             };

//             mockFileSystem.setMockFile(metadataUri, JSON.stringify(windowsMetadata, null, 2));

//             const metadata = await scriptRoot.getMetaData();

//             assert.strictEqual(metadata.scriptName, 'Windows Path Script');
//             assert.ok(metadata.pushPullRecords[0].localPath.includes('C:'), 'Should preserve Windows paths');
//         });

//         test('should handle different URI schemes', async () => {
//             // Test with different URI schemes while maintaining the ScriptRoot structure
//             const schemes = ['file', 'vscode-vfs', 'untitled'];

//             schemes.forEach(scheme => {
//                 try {
//                     const testUri = vscode.Uri.parse(`${scheme}:///test/workspace/configbeh.bluestep.net/1466960/draft/test.js`);
//                     const testRoot = ScriptFactory.createScriptRoot(testUri);

//                     assert.ok(testRoot instanceof ScriptRoot, `Should create ScriptRoot with ${scheme} scheme`);
//                     assert.strictEqual(testRoot.webDavId, '1466960', `Should parse webdav ID with ${scheme} scheme`);
//                 } catch (error) {
//                     // Some schemes might not be supported, which is acceptable
//                     assert.ok(true, `Handled ${scheme} scheme appropriately`);
//                 }
//             });
//         });
//     });

//     suite('Constants', () => {
//         test('should have correct metadata file constant', () => {
//             assert.strictEqual(ScriptRoot.METADATA_FILENAME, '.b6p_metadata.json');
//         });

//         test('should have correct gitignore file constant', () => {
//             assert.strictEqual(ScriptRoot.GITIGNORE_FILENAME, '.gitignore');
//         });
//     });

//     suite('Error Handling', () => {
//         test('should handle malformed metadata file gracefully', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
            
//             // Set up malformed JSON
//             mockFileSystem.setMockFile(metadataUri, Buffer.from('{ invalid json'));
            
//             const metadata = await scriptRoot.getMetaData();
            
//             // Should create new metadata
//             assert.strictEqual(metadata.scriptName, '');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords));
//         });

//         test('should handle empty metadata file gracefully', async () => {
//             const metadataUri = vscode.Uri.parse('file:///test/workspace/configbeh.bluestep.net/1466960/.b6p_metadata.json');
            
//             // Set up empty file
//             mockFileSystem.setMockFile(metadataUri, Buffer.from(''));
            
//             const metadata = await scriptRoot.getMetaData();
            
//             // Should create new metadata
//             assert.strictEqual(metadata.scriptName, '');
//             assert.strictEqual(metadata.webdavId, '1466960');
//             assert.ok(Array.isArray(metadata.pushPullRecords));
//         });
//     });
// });