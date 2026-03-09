import { SourceOps } from "../../../../types";
import { App } from "../App";
import { Util } from "../util";
import { ScriptFactory } from "../util/script/ScriptFactory";
//import { FileSystem } from "../util/fs/FileSystemFactory";
import { Alert } from "../util/ui/Alert";

//const fs = FileSystem.getInstance;
export default async function snapshot({ overrideFormulaUri, sourceOps }: { overrideFormulaUri?: string, sourceOps?: SourceOps } = {}) {
  
  try {
    //TODO remove when done
    App.logger.info("Snapshot command called with:", overrideFormulaUri, sourceOps);
    if (overrideFormulaUri === undefined && sourceOps === undefined) {
      App.logger.info("Snapshot command called with no arguments, assuming current context");
    }
    // "contextual" meaning currently open or determined from sourceOps
    const contextualUri = await Util.getLocalFileUri(sourceOps);
    App.logger.info("Contextual URI determined to be:", contextualUri?.toString() ?? "undefined");
    const sf = ScriptFactory.createFile(contextualUri);
    sf.getScriptRoot().snapshot();
    // console.log("sf.getScriptRoot().getDraftBuildFolderUri())", sf.getScriptRoot().getDraftBuildFolderUri());
    // await fs().delete(sf.getScriptRoot().getDraftBuildFolderUri()).catch(e => {console.error(e);});
    // console.log("Deleted draft build folder");
  } catch (e) {
    Alert.error("Error during snapshot: " + (e instanceof Error ? e.message : e));
  }
  
}