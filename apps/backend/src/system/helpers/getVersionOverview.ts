import { getInstalledVersion } from './getInstalledVersion';
import { getReleases, NoteLanguage, Release } from './getReleases';
import { compareVersions } from './semver';
import { readUpdateStatus, updatesDir } from './updateFiles';

/**
 * For the Admin page card: what is installed, the latest release (with notes
 * in the requested language), whether an update exists and the status of an ongoing update.
 */
export async function getVersionOverview(language: NoteLanguage) {
  const [installed, { releases, offline }, update] = await Promise.all([
    getInstalledVersion(),
    getReleases(false, language),
    readUpdateStatus(0),
  ]);

  const latest: Release | null = releases[0] ?? null;
  const reference = installed.version ?? installed.baseVersion;
  const newer = releases.filter(
    (r) => !reference || compareVersions(r.version, reference) > 0,
  );

  return {
    updatesEnabled: Boolean(updatesDir()),
    installed,
    latest,
    updateAvailable: newer.length > 0,
    newerCount: newer.length,
    offline,
    update,
  };
}

/** The full list, with each release marked as installed or newer. */
export async function listReleases(force: boolean, language: NoteLanguage) {
  const [installed, { releases, offline }] = await Promise.all([
    getInstalledVersion(),
    getReleases(force, language),
  ]);
  const reference = installed.version ?? installed.baseVersion;

  return {
    updatesEnabled: Boolean(updatesDir()),
    installed,
    offline,
    releases: releases.map((release) => ({
      ...release,
      installed: release.version === installed.version,
      newer: !reference || compareVersions(release.version, reference) > 0,
    })),
  };
}
