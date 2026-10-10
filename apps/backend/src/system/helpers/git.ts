import { execFile } from 'child_process';
import { resolve } from 'path';

/**
 * Repository root. In the container it comes from APP_DIR (systemd unit); in
 * development the backend runs in apps/backend, so it goes up two levels.
 */
export function repoDir(): string {
  return process.env.APP_DIR ?? resolve(process.cwd(), '..', '..');
}

/** Runs a git command at the repository root and returns the trimmed stdout. */
export function git(args: string[], timeoutMs = 20_000): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      'git',
      args,
      { cwd: repoDir(), timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => {
        if (error) reject(new Error(`git ${args[0]} failed: ${error.message}`));
        else resolvePromise(stdout.trim());
      },
    );
  });
}
