import { execFile } from 'child_process';
import { resolve } from 'path';

/**
 * Raiz do repositório. No container vem do APP_DIR (unit systemd); em
 * desenvolvimento o backend corre em apps/backend, por isso sobe dois níveis.
 */
export function repoDir(): string {
  return process.env.APP_DIR ?? resolve(process.cwd(), '..', '..');
}

/** Corre um comando git na raiz do repositório e devolve o stdout aparado. */
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
