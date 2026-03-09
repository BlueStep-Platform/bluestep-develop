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

/** Timeout in milliseconds for `git pull` operations (30 seconds). */
const GIT_PULL_TIMEOUT_MS = 30_000;

/** Maximum bytes of combined stdout+stderr buffered from `git pull` (10 MB). */
const GIT_PULL_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Runs `git pull --ff-only` in the given directory.
 *
 * Uses `--ff-only` to prevent interactive merge commits (fails fast if a merge would be required).
 * A {@link GIT_PULL_TIMEOUT_MS 30-second} timeout and a {@link GIT_PULL_MAX_BUFFER 10 MB} output
 * cap are applied so the extension host cannot stall or exhaust memory on a slow/hung network call.
 *
 * @param cwd Absolute path to the working directory (the script root folder, e.g. `.../U######/<scriptName>`).
 * @returns The stdout and stderr from the git process.
 * @throws If git is not on PATH, the command times out, or the command exits with a non-zero code.
 * @lastreviewed null
 */
export async function gitPull(cwd: string): Promise<GitResult> {
  return execFileAsync('git', ['pull', '--ff-only'], {
    cwd,
    timeout: GIT_PULL_TIMEOUT_MS,
    maxBuffer: GIT_PULL_MAX_BUFFER,
  });
}
