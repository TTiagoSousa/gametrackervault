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
 * Pede a atualização para uma release. Só para a frente: voltar a uma versão
 * anterior não desfaz as migrações da base de dados e podia deixar a app partida.
 * Saltar versões é seguro — as migrações aplicam-se todas de seguida.
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
