import { git } from './git';
import { isVersion } from './semver';

export interface InstalledVersion {
  /** vX.Y.Z quando o código instalado é exatamente uma release; null se não. */
  version: string | null;
  /** A release mais recente em que o código assenta (para comparar com as novas). */
  baseVersion: string | null;
  commit: string;
  date: string | null;
  /** Branch, quando não é uma release (desenvolvimento ou instalação por branch). */
  branch: string | null;
}

/**
 * O que está instalado, lido do git. Uma instalação por release está numa tag
 * (vX.Y.Z); em desenvolvimento ou num branch fica a release em que assenta.
 */
export async function getInstalledVersion(): Promise<InstalledVersion> {
  const commit = await git(['rev-parse', '--short', 'HEAD']).catch(() => '');
  const date = await git(['log', '-1', '--format=%cI']).catch(() => '');
  const exact = await git([
    'describe',
    '--tags',
    '--exact-match',
    '--match',
    'v*',
    'HEAD',
  ]).catch(() => '');
  const base = await git([
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v*',
    'HEAD',
  ]).catch(() => '');
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']).catch(
    () => '',
  );

  return {
    version: isVersion(exact) ? exact : null,
    baseVersion: isVersion(base) ? base : null,
    commit,
    date: date || null,
    branch: branch && branch !== 'HEAD' && !isVersion(exact) ? branch : null,
  };
}
