import { fork } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { App } from "../../App";
import { Err } from "../Err";
import type { ScriptNode } from "./ScriptNode";

interface TranspilerInput {
  tsConfigPath: string;
  filePaths: string[];
}

interface TranspilerOutput {
  emittedFiles: string[];
  diagnostics: string[];
}

/**
 * Compiler for TypeScript files in script projects.
 * Manages compilation of multiple TypeScript files organized by their tsconfig.json files.
 * Compilation is delegated to a child process to avoid bundling the TypeScript compiler
 * into the main extension bundle.
 * @lastreviewed null
 */
export class ScriptTranspiler {
  private projects: Map<string, ScriptNode[]> = new Map();

  /**
   * Creates a new ScriptCompiler instance.
   * @lastreviewed 2025-10-01
   */
  constructor() {}

  /**
   * Adds a {@link ScriptNode} to the compilation queue. Duplicates,
   * or nodes that happen to be folders, will be ignored.
   *
   * NOTE: Added nodes need not be siblings, nor share a common ancestor.
   * @throws an {@link Err.ScriptNotCopaceticError} when the file is not in a good state.
   * @lastreviewed 2025-10-01
   */
  public async addFile(sn: ScriptNode): Promise<void> {
    if (await sn.isFolder()) {
      App.logger.warn("Ignoring folder node in ScriptCompiler.addFile:", sn.path());
      return void 0;
    }
    if (!(await sn.isCopacetic())) {
      throw new Err.ScriptNotCopaceticError();
    }
    const newTsConfigFile = await sn.getClosestTsConfigFile();
    const vals = this.projects.get(newTsConfigFile.path()) || [];
    if (!vals.some(existingSn => existingSn.path() === sn.path())) {
      vals.push(sn);
    } else {
      App.logger.warn("Ignoring duplicate file in ScriptCompiler.addFile:", sn.path());
    }
    this.projects.set(newTsConfigFile.path(), vals);
  }

  /**
   * Compiles all added TypeScript files grouped by their tsconfig.json configurations.
   * Shows compilation results and diagnostics to the user.
   * Compilation runs in a child process via {@link runWorker}.
   *
   * @returns A Promise that resolves to an array of emitted file paths.
   * @lastreviewed null
   */
  public async transpile(): Promise<string[]> {
    const emittedFiles: string[] = [];
    for (const [tsConfigPath, sfList] of this.projects.entries()) {
      if (sfList.length === 0) {
        throw new Err.NoFilesToCompileError(tsConfigPath);
      }
      const result = await this.runWorker({
        tsConfigPath,
        filePaths: sfList.map(sn => sn.uri().fsPath),
      });
      emittedFiles.push(...result.emittedFiles);

      if (result.diagnostics.length > 0) {
        //TODO these errors need to be handled appropriately by ultimately fixing the B typedoc problems
        App.logger.error("TypeScript compilation errors:\n" + result.diagnostics.join("\n"));
      } else {
        vscode.window.showInformationMessage('TypeScript compiled successfully.');
      }
    }
    return emittedFiles;
  }

  /**
   * Spawns a child process to run the TypeScript compiler worker and returns its output.
   * @lastreviewed null
   */
  private runWorker(input: TranspilerInput): Promise<TranspilerOutput> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, "transpiler-worker.js");
      const child = fork(workerPath, [], { silent: true });
      let settled = false;

      child.on("message", (result: TranspilerOutput) => {
        settled = true;
        resolve(result);
      });
      child.on("error", (err) => {
        if (!settled) { settled = true; reject(err); }
      });
      child.on("exit", (code) => {
        if (!settled) {
          settled = true;
          reject(new Error(`Transpiler worker exited with code ${code} without sending result`));
        }
      });
      child.send(input);
    });
  }
}
