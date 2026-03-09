import ts from "typescript";
import * as vscode from "vscode";
import { FolderNames } from "../../../resources/constants";
import { App } from "../../App";
import { Err } from "../Err";
import { FileSystem } from "../fs/FileSystem";
import { ScriptFactory } from "./ScriptFactory";
import type { ScriptNode } from "./ScriptNode";
import type { ScriptRoot } from "./ScriptRoot";
const fs = FileSystem.getInstance;

/**
 * Compiler for TypeScript files in script projects.
 * Manages compilation of multiple TypeScript files organized by their tsconfig.json files.
 * @lastreviewed 2025-10-01
 */
export class ScriptTranspiler {
  private projects: Map<string, ScriptNode[]> = new Map();
  private static DEFAULT_TS_CONFIG: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    outDir: FolderNames.DOT_BUILD,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    sourceMap: false,
    inlineSourceMap: false,
    allowJs: false,
    noEmitOnError: false,
    suppressOutputPathCheck: true,
    declarationDir: undefined,
    declaration: false,
    listEmittedFiles: true,
  };

  /**
   * Creates a new ScriptCompiler instance.
   * @lastreviewed 2025-10-01
   */
  constructor() {}

  /**
   * Gets default TypeScript compiler options for a file.
   * @param sf The file to get default options for
   * @returns Default TypeScript compiler options
   * @throws an {@link Err.InvalidStateError} Always throws as this method is deprecated
   * @lastreviewed 2025-10-01
   */
  private getDefaultOptions(sf: ScriptNode): ts.CompilerOptions {
    throw new Err.InvalidStateError("did not find a tsconfig for " + sf.path() + ".");
    const LOCAL_CONFIG = ScriptTranspiler.DEFAULT_TS_CONFIG;
    LOCAL_CONFIG.rootDir = sf.getScriptRoot().getDraftFolder().path();
    return LOCAL_CONFIG;
  }

  /**
   * Gets TypeScript compiler options from the closest tsconfig.json file.
   * @param sn The node to get compiler options for
   * @returns A Promise that resolves to TypeScript compiler options
   * @lastreviewed 2025-10-01
   */
  private async getCompilerOptions(sn: ScriptNode): Promise<ts.CompilerOptions> {
    const tsConfigFile = await sn.getClosestTsConfigFile();
    if (!tsConfigFile) {
      App.logger.info("No tsconfig.json found, using default compiler options.");
      return this.getDefaultOptions(sn);
    }

    const tsconfigTextArray = await fs().readFile(tsConfigFile.uri());
    const pseudoParsedConfig = ts.parseConfigFileTextToJson(tsConfigFile.path(), Buffer.from(tsconfigTextArray).toString('utf-8'));
    if (pseudoParsedConfig.error) {
      const message = ts.flattenDiagnosticMessageText(pseudoParsedConfig.error.messageText, '\n');
      throw new Err.CompilationError(`Error parsing tsconfig.json at ${tsConfigFile.path()}: ${message}`);
    }
    // Parse the configuration but ignore file discovery errors.
    // We provide files explicitly to ts.createProgram, so file discovery via include/exclude is not needed.
    // rootDir is intentionally NOT overridden here so that the tsconfig.json's own rootDir setting
    // (or TypeScript's inference from the provided files) is respected. Overriding rootDir caused
    // compiled output to appear in incorrect subdirectories when the tsconfig specified a rootDir
    // different from its containing folder.
    const parsedConfig = ts.parseJsonConfigFileContent(
      pseudoParsedConfig.config,
      {
        ...ts.sys,
        // Override readDirectory to return empty array - we don't want TS to validate include/exclude
        readDirectory: () => []
      },
      tsConfigFile.folder().path(),
      undefined,
      tsConfigFile.path()
    );
    App.logger.info("Using tsconfig.json compiler options from:", tsConfigFile.path());
    // Ensure listEmittedFiles is always enabled so we can track emitted files
    parsedConfig.options.listEmittedFiles = true;
    return parsedConfig.options;
  }

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
   * 
   * @param sharedRoot An optional shared ScriptRoot for all files being compiled;
   * if provided, this root will be used for all created ScriptFile instances;
   *  Otherwise each file will generate its own ScriptRoot.
   * @returns A Promise that resolves to an array of emitted file paths.
   * @lastreviewed 2025-10-01
   */
  public async transpile(sharedRoot?: ScriptRoot): Promise<string[]> {
    const emittedFiles: string[] = [];
    for (const [tsConfigPath, sfList] of this.projects.entries()) {
      if (sfList.length === 0) {
        throw new Err.NoFilesToCompileError(tsConfigPath);
      }
      const sf = ScriptFactory.createFile(vscode.Uri.file(tsConfigPath), sharedRoot);
      const compilerOptions = await this.getCompilerOptions(sf);
      const sfUris = sfList.map(sf => sf.uri());
      const program = ts.createProgram(sfUris.map(uri => uri.fsPath), compilerOptions);
      const emitResult = program.emit();
      emittedFiles.push(...(emitResult.emittedFiles || []));

      // Handle diagnostics
      const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
      if (allDiagnostics.length > 0) {
        const diagnosticMessages = allDiagnostics.map(diagnostic => {
          if (diagnostic.file) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
          } else {
            return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          }
        }).join('\n');
        //TODO these errors need to be handled appropriately by ultimately fixing the B typedoc problems
        App.logger.error("TypeScript compilation errors:\n" + diagnosticMessages);
        //vscode.window.showErrorMessage(`TypeScript compilation errors:\n${diagnosticMessages}`);
      } else {
        vscode.window.showInformationMessage('TypeScript compiled successfully.');
      }
    };
    return emittedFiles;
  }
}