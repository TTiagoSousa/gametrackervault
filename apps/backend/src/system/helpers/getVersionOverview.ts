import { getInstalledVersion } from './getInstalledVersion';
import { getReleases, NoteLanguage, Release } from './getReleases';
import { compareVersions } from './semver';
import { readUpdateStatus, updatesDir } from './updateFiles';

/**
 * Para o card da página Admin: o que está instalado, a última release (com as notas
 * na língua pedida), se há atualização e o estado de uma atualização em curso.
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

/** A lista completa, com cada release marcada como instalada ou mais recente. */
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
