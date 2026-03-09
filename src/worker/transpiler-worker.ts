import ts from "typescript";
import * as nodeFs from "fs";
import * as path from "path";

interface TranspilerInput {
  tsConfigPath: string;
  filePaths: string[];
}

interface TranspilerOutput {
  emittedFiles: string[];
  diagnostics: string[];
}

function compile(input: TranspilerInput): TranspilerOutput {
  const { tsConfigPath, filePaths } = input;
  const configText = nodeFs.readFileSync(tsConfigPath, "utf-8");
  const pseudoParsed = ts.parseConfigFileTextToJson(tsConfigPath, configText);

  if (pseudoParsed.error) {
    const message = ts.flattenDiagnosticMessageText(pseudoParsed.error.messageText, "\n");
    throw new Error(`Error parsing tsconfig.json at ${tsConfigPath}: ${message}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    pseudoParsed.config,
    {
      ...ts.sys,
      readDirectory: () => [],
    },
    path.dirname(tsConfigPath),
    undefined,
    tsConfigPath
  );
  parsedConfig.options.listEmittedFiles = true;

  const program = ts.createProgram(filePaths, parsedConfig.options);
  const emitResult = program.emit();

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  const diagnostics = allDiagnostics.map((d) => {
    if (d.file) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start!);
      const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      return `${d.file.fileName} (${line + 1},${character + 1}): ${message}`;
    }
    return ts.flattenDiagnosticMessageText(d.messageText, "\n");
  });

  return {
    emittedFiles: emitResult.emittedFiles ?? [],
    diagnostics,
  };
}

process.on("message", (input: TranspilerInput) => {
  try {
    const result = compile(input);
    process.send!(result);
  } catch (e) {
    const result: TranspilerOutput = {
      emittedFiles: [],
      diagnostics: [e instanceof Error ? e.message : String(e)],
    };
    process.send!(result);
  }
  process.exit(0);
});
