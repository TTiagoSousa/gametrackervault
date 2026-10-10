import { git } from './git';
import { isVersion } from './semver';

export interface InstalledVersion {
  /** vX.Y.Z when the installed code is exactly a release; null otherwise. */
  version: string | null;
  /** The latest release the code is based on (to compare with newer ones). */
  baseVersion: string | null;
  commit: string;
  date: string | null;
  /** Branch, when not a release (development or branch install). */
  branch: string | null;
}

/**
 * What is installed, read from git. A release install sits on a tag
 * (vX.Y.Z); in development or on a branch it is the release it is based on.
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
