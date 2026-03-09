import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { LocalUriParser } from '../../main/app/util/data/LocalUriParser';
import { ScriptRoot } from '../../main/app/util/script/ScriptRoot';

suite('LocalUriParser Tests', () => {
  
  suite('Constructor - Valid URI Parsing', () => {
    
    test('should parse basic draft URI correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100001/12345/draft');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100001');
      assert.strictEqual(parser.scriptName, '12345');
      assert.strictEqual(parser.type, 'draft');
      assert.strictEqual(parser.rest, '');
      assert.strictEqual(parser.rawUri, uri);
    });

    test('should parse basic declarations URI correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100002/67890/declarations');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100002');
      assert.strictEqual(parser.scriptName, '67890');
      assert.strictEqual(parser.type, 'declarations');
      assert.strictEqual(parser.rest, '');
    });
    
    test('should parse metadata file URI correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100003/11111/.b6p_metadata.json');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100003');
      assert.strictEqual(parser.scriptName, '11111');
      assert.strictEqual(parser.type, 'metadata');
      assert.strictEqual(parser.rest, '');
    });
    test('should parse root file URI correctly', () => {
      const uri = vscode.Uri.file('/home/brendan/test/extensiontest/U900005/Fresh Test/');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'home' + path.sep + 'brendan' + path.sep + 'test' + path.sep + 'extensiontest' + path.sep + 'U900005');
      assert.strictEqual(parser.scriptName, 'Fresh Test');
      assert.strictEqual(parser.type, 'root');
      assert.strictEqual(parser.rest, '');
    });
    test('should parse root file URI correctly without trailing slash', () => {
      const uri = vscode.Uri.file('/home/brendan/test/extensiontest/U900005/Fresh Test');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'home' + path.sep + 'brendan' + path.sep + 'test' + path.sep + 'extensiontest' + path.sep + 'U900005');
      assert.strictEqual(parser.scriptName, 'Fresh Test');
      assert.strictEqual(parser.type, 'root');
      assert.strictEqual(parser.rest, '');
    });

    test('should parse gitignore file URI correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100004/22222/.gitignore');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100004');
      assert.strictEqual(parser.scriptName, '22222');
      assert.strictEqual(parser.type, 'metadata');
      assert.strictEqual(parser.rest, '');
    });

    test('should parse draft URI with nested file correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100005/44444/draft/subfolder/script.js');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100005');
      assert.strictEqual(parser.scriptName, '44444');
      assert.strictEqual(parser.type, 'draft');
      assert.strictEqual(parser.rest, 'subfolder' + path.sep + 'script.js');
    });

    test('should parse declarations URI with nested file correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100006/55555/declarations/types/interfaces.d.ts');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'workspace' + path.sep + 'U100006');
      assert.strictEqual(parser.scriptName, '55555');
      assert.strictEqual(parser.type, 'declarations');
      assert.strictEqual(parser.rest, 'types' + path.sep + 'interfaces.d.ts');
    });

    test('should handle deeply nested prepending path', () => {
      const uri = vscode.Uri.file('/very/deep/nested/workspace/folder/U100007/66666/draft/file.js');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.prependingPath, path.sep + 'very' + path.sep + 'deep' + path.sep + 'nested' + path.sep + 'workspace' + path.sep + 'folder' + path.sep + 'U100007');
      assert.strictEqual(parser.scriptName, '66666');
      assert.strictEqual(parser.type, 'draft');
      assert.strictEqual(parser.rest, 'file.js');
    });

    test('should handle empty prepending path - REMOVED - should throw error', () => {
      // This test was incorrect - the path /77777/draft is missing the U###### organization ID
      // The minimum valid structure is prependingPath/U######/scriptName/type
      const uri = vscode.Uri.file('/77777/draft');

      assert.throws(() => {
        new LocalUriParser(uri);
      }, /URI must contain a segment matching U###### pattern/);
    });
  });

  suite('Constructor - Error Cases', () => {

    test('should throw error for empty path', () => {
      const uri = vscode.Uri.file('');

      assert.throws(() => {
        new LocalUriParser(uri);
      }, /The provided URI does not conform to expected structure/);
    });

    test('should throw error for unrecognized type folder', () => {
      const uri = vscode.Uri.file('/workspace/U100008/12345/unknown');

      assert.throws(() => {
        new LocalUriParser(uri);
      }, /Invalid type segment: unknown/);
    });
  });

  suite('getShavedName Method', () => {

    test('should return correct shaved name for basic URI', () => {
      const uri = vscode.Uri.file('/workspace/U100009/12345/draft');
      const parser = new LocalUriParser(uri);

      const expected = path.sep + 'workspace' + path.sep + 'U100009' + path.sep + '12345';
      assert.strictEqual(parser.getShavedName(), expected);
    });

    test('should return correct shaved name for nested prepending path', () => {
      const uri = vscode.Uri.file('/very/deep/workspace/U100010/67890/declarations/file.d.ts');
      const parser = new LocalUriParser(uri);

      const expected = path.sep + 'very' + path.sep + 'deep' + path.sep + 'workspace' + path.sep + 'U100010' + path.sep + '67890';
      assert.strictEqual(parser.getShavedName(), expected);
    });

    test('should be consistent regardless of rest content', () => {
      const uri1 = vscode.Uri.file('/workspace/U100011/12345/draft');
      const uri2 = vscode.Uri.file('/workspace/U100011/12345/draft/deep/nested/file.js');

      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);

      assert.strictEqual(parser1.getShavedName(), parser2.getShavedName());
    });

    test('should be consistent regardless of type', () => {
      const uri1 = vscode.Uri.file('/workspace/U100012/12345/draft');
      const uri2 = vscode.Uri.file('/workspace/U100012/12345/declarations');
      const uri3 = vscode.Uri.file('/workspace/U100012/12345/.b6p_metadata.json');

      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);
      const parser3 = new LocalUriParser(uri3);

      const shavedName = parser1.getShavedName();
      assert.strictEqual(parser2.getShavedName(), shavedName);
      assert.strictEqual(parser3.getShavedName(), shavedName);
    });
  });

  suite('equals Method', () => {

    test('should return true for identical parsers', () => {
      const uri = vscode.Uri.file('/workspace/U100013/12345/draft/file.js');
      const parser1 = new LocalUriParser(uri);
      const parser2 = new LocalUriParser(uri);

      assert.strictEqual(parser1.equals(parser2), true);
    });

    test('should return false for different prepending paths', () => {
      const uri1 = vscode.Uri.file('/workspace1/U100014/12345/draft/file.js');
      const uri2 = vscode.Uri.file('/workspace2/U100014/12345/draft/file.js');
      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);

      assert.strictEqual(parser1.equals(parser2), false);
    });

    test('should return false for different WebDAV IDs', () => {
      const uri1 = vscode.Uri.file('/workspace/U100015/12345/draft/file.js');
      const uri2 = vscode.Uri.file('/workspace/U100015/67890/draft/file.js');
      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);

      assert.strictEqual(parser1.equals(parser2), false);
    });

    test('should return false for different types', () => {
      const uri1 = vscode.Uri.file('/workspace/U100016/12345/draft/file.js');
      const uri2 = vscode.Uri.file('/workspace/U100016/12345/declarations/file.js');
      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);

      assert.strictEqual(parser1.equals(parser2), false);
    });

    test('should return false for different rest paths', () => {
      const uri1 = vscode.Uri.file('/workspace/U100017/12345/draft/file1.js');
      const uri2 = vscode.Uri.file('/workspace/U100017/12345/draft/file2.js');
      const parser1 = new LocalUriParser(uri1);
      const parser2 = new LocalUriParser(uri2);

      assert.strictEqual(parser1.equals(parser2), false);
    });
  });

  suite('isDeclarationsOrDraft Method', () => {

    test('should return true for draft type', () => {
      const uri = vscode.Uri.file('/workspace/U100018/12345/draft/file.js');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.isDeclarationsOrDraft(), true);
    });

    test('should return true for declarations type', () => {
      const uri = vscode.Uri.file('/workspace/U100019/12345/declarations/types.d.ts');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.isDeclarationsOrDraft(), true);
    });

    test('should return false for metadata type (.b6p_metadata.json)', () => {
      const uri = vscode.Uri.file('/workspace/U100020/12345/.b6p_metadata.json');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.isDeclarationsOrDraft(), false);
    });

    test('should return false for metadata type (.gitignore)', () => {
      const uri = vscode.Uri.file('/workspace/U100021/12345/.gitignore');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.isDeclarationsOrDraft(), false);
    });
  });

  suite('prependingPathUri Method', () => {

    test('should return correct URI for basic prepending path', () => {
      const uri = vscode.Uri.file('/workspace/U100022/12345/draft');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();
      assert.strictEqual(prependingUri.fsPath, path.sep + 'workspace' + path.sep + 'U100022');
      assert.strictEqual(prependingUri.scheme, 'file');
    });

    test('should return correct URI for nested prepending path', () => {
      const uri = vscode.Uri.file('/very/deep/nested/workspace/folder/U100023/67890/declarations/file.d.ts');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();
      assert.strictEqual(prependingUri.fsPath, path.sep + 'very' + path.sep + 'deep' + path.sep + 'nested' + path.sep + 'workspace' + path.sep + 'folder' + path.sep + 'U100023');
      assert.strictEqual(prependingUri.scheme, 'file');
    });

    test('should return correct URI for empty prepending path - REMOVED - invalid structure', () => {
      // This test was incorrect - /77777/draft is missing the U###### organization ID
      const uri = vscode.Uri.file('/77777/draft');

      assert.throws(() => {
        new LocalUriParser(uri);
      }, /URI must contain a segment matching U###### pattern/);
    });

    test('should be consistent with prependingPath property', () => {
      const uri = vscode.Uri.file('/some/complex/path/structure/U100024/88888/draft/nested/file.js');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();
      assert.strictEqual(prependingUri.fsPath, parser.prependingPath);
    });


    test('should return valid URI that can be used for file operations', () => {
      const uri = vscode.Uri.file('/workspace/projects/U100025/99999/draft/script.js');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();

      // Should be able to create new URIs relative to this one
      const childUri = vscode.Uri.joinPath(prependingUri, 'subfolder', 'file.txt');
      assert.strictEqual(childUri.scheme, 'file');
      const expectedPath = path.join('workspace', 'projects', 'U100025');
      assert.strictEqual(childUri.fsPath.includes(expectedPath), true);
    });

    test('should handle metadata files correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100026/11111/.b6p_metadata.json');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();
      assert.strictEqual(prependingUri.fsPath, path.sep + 'workspace' + path.sep + 'U100026');
      assert.strictEqual(prependingUri.scheme, 'file');
    });

    test('should handle gitignore files correctly', () => {
      const uri = vscode.Uri.file('/workspace/U100027/22222/.gitignore');
      const parser = new LocalUriParser(uri);

      const prependingUri = parser.prependingPathUri();
      assert.strictEqual(prependingUri.fsPath, path.sep + 'workspace' + path.sep + 'U100027');
      assert.strictEqual(prependingUri.scheme, 'file');
    });

    test('should be consistent across different types from same root', () => {
      const draftUri = vscode.Uri.file('/workspace/U100028/12345/draft/file.js');
      const declarationsUri = vscode.Uri.file('/workspace/U100028/12345/declarations/types.d.ts');
      const metadataUri = vscode.Uri.file('/workspace/U100028/12345/.b6p_metadata.json');

      const draftParser = new LocalUriParser(draftUri);
      const declarationsParser = new LocalUriParser(declarationsUri);
      const metadataParser = new LocalUriParser(metadataUri);

      const draftPrependingUri = draftParser.prependingPathUri();
      const declarationsPrependingUri = declarationsParser.prependingPathUri();
      const metadataPrependingUri = metadataParser.prependingPathUri();

      assert.strictEqual(draftPrependingUri.fsPath, declarationsPrependingUri.fsPath);
      assert.strictEqual(draftPrependingUri.fsPath, metadataPrependingUri.fsPath);
      assert.strictEqual(draftPrependingUri.toString(), declarationsPrependingUri.toString());
      assert.strictEqual(draftPrependingUri.toString(), metadataPrependingUri.toString());
    });
  });

  suite('Integration with RemoteScriptRoot Constants', () => {

    test('should correctly identify metadata files using RemoteScriptRoot constants', () => {
      const metadataUri = vscode.Uri.file(`/workspace/U100029/12345/${ScriptRoot.METADATA_FILENAME}`);
      const gitignoreUri = vscode.Uri.file(`/workspace/U100029/12345/${ScriptRoot.GITIGNORE_FILENAME}`);

      const metadataParser = new LocalUriParser(metadataUri);
      const gitignoreParser = new LocalUriParser(gitignoreUri);

      assert.strictEqual(metadataParser.type, 'metadata');
      assert.strictEqual(gitignoreParser.type, 'metadata');
    });
  });


  suite('URL-Encoded Paths with Spaces', () => {

    test('should handle URL-encoded scriptName with spaces and .gitignore', () => {
      // This was the original issue: file:///c%3A/Users/jrigb/Bluestep/Organizations/U142023/Site%20Audit%20Post-Save/.gitignore
      const uri = vscode.Uri.parse('file:///c%3A/Users/jrigb/Bluestep/Organizations/U142023/Site%20Audit%20Post-Save/.gitignore');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.scriptName, 'Site Audit Post-Save');
      assert.strictEqual(parser.type, 'metadata');
      assert.strictEqual(parser.rest, '');
    });

    test('should handle scriptName with spaces in draft folder', () => {
      const uri = vscode.Uri.file('/workspace/U100030/My Script Name/draft/file.js');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.scriptName, 'My Script Name');
      assert.strictEqual(parser.type, 'draft');
      assert.strictEqual(parser.rest, 'file.js');
    });

    test('should handle scriptName with multiple spaces', () => {
      const uri = vscode.Uri.file('/workspace/U100031/Multi  Space   Name/declarations/types.d.ts');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.scriptName, 'Multi  Space   Name');
      assert.strictEqual(parser.type, 'declarations');
      assert.strictEqual(parser.rest, 'types.d.ts');
    });

    test('should handle special characters in scriptName', () => {
      const uri = vscode.Uri.file('/workspace/U100032/Script-Name_123 (v2)/draft/file.js');
      const parser = new LocalUriParser(uri);

      assert.strictEqual(parser.scriptName, 'Script-Name_123 (v2)');
      assert.strictEqual(parser.type, 'draft');
      assert.strictEqual(parser.rest, 'file.js');
    });
  });
});