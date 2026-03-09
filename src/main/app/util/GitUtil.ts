import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Result of a git operation.
 */
export type GitResult = {
  /** Standard output produced by the git process. */
  stdout: string;
  /** Standard error output produced by the git process (may contain informational messages). */
  stderr: string;
};

/**
 * Runs `git pull` in the given directory.
 *
 * @param cwd Absolute path to the working directory (the script root folder, e.g. `.../U######/<scriptName>`).
 * @returns The stdout and stderr from the git process.
 * @throws If git is not on PATH or the command exits with a non-zero code.
 * @lastreviewed null
 */
export async function gitPull(cwd: string): Promise<GitResult> {
  return execFileAsync('git', ['pull'], { cwd });
}
