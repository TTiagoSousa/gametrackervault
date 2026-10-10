import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getInstalledVersion } from './getInstalledVersion';
import { getReleases } from './getReleases';
import { compareVersions } from './semver';
import {
  readUpdateStatus,
  updatesDir,
  writeUpdateRequest,
} from './updateFiles';

/**
 * Requests the update to a release. Forward only: going back to an earlier
 * version doesn't undo database migrations and could leave the app broken.
 * Skipping versions is safe — migrations are all applied in sequence.
 */
export async function requestUpdate(version: string) {
  if (!updatesDir()) {
    throw new ServiceUnavailableException(
      'As atualizações só funcionam na instalação do servidor.',
    );
  }

  const status = await readUpdateStatus(0);
  if (status.state === 'queued' || status.state === 'running') {
    throw new ConflictException('Já há uma atualização em curso.');
  }

  const { releases } = await getReleases(true);
  if (!releases.some((r) => r.version === version)) {
    throw new BadRequestException(`A versão ${version} não existe.`);
  }

  const installed = await getInstalledVersion();
  const reference = installed.version ?? installed.baseVersion;
  if (reference && compareVersions(version, reference) <= 0) {
    throw new BadRequestException(
      `A ${version} não é mais recente do que a instalada (${reference}).`,
    );
  }

  await writeUpdateRequest(version);
  return readUpdateStatus(0);
}
