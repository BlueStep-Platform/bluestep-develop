import path from 'path';
import { OrgWorker } from '../app/util/data/OrgWorker';
import { FileSystem } from '../app/util/fs/FileSystem';
import { ScriptFactory } from "../app/util/script/ScriptFactory";
import { Converter } from "./Converter";
import * as vscode from 'vscode';
import { Alert } from '../app/util/ui/Alert';
const fs = FileSystem.getInstance;
export class Converter1_0_1_to_1_1_0 extends Converter {
  public fromVersion = "1.0.1";
  public toVersion = "1.1.0";
  async convert(): Promise<void> {
    try {
      const metaDataFiles = await fs().findFiles("**/.b6p_metadata.json");
      await Promise.all(metaDataFiles.map(async (file) => {
        const sf = ScriptFactory.createFile(file);
        const sr = sf.getScriptRoot();
        const metaDataDotJson = await sr.getAsFolder().getMetadataDotJson();
        const baseRemoteUrl = await sr.toScriptBaseRemoteUrl();

        const displayName = metaDataDotJson.displayName || (() => { throw new Error("Missing displayName in metadata"); })();
        const U = await new OrgWorker(baseRemoteUrl).getU();
        await sr.modifyMetaData(meta => {
          meta.U = U;
          meta.scriptName = displayName;
        });
        const srf = sr.getAsFolder();

        await srf.rename(displayName);
        const srUri = sr.getRootUri();
        const orgFolderUri = vscode.Uri.joinPath(srUri, "..");
        const orgFolderName = path.basename(orgFolderUri.fsPath);
        if (orgFolderName !== U) {
          fs().rename(orgFolderUri, vscode.Uri.joinPath(orgFolderUri, "../" + U));
        }
      }));
    } catch (e) {
      Alert.popup("Error during conversion from 1.0.1 to 1.1.0: " + (e instanceof Error ? e.message : String(e)));
    }
  }
}