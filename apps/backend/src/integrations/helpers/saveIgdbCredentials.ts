import { BadRequestException } from '@nestjs/common';
import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { decryptToken, encryptToken } from 'src/utils/crypto/token-cipher';
import {
  requestTwitchToken,
  TwitchToken,
} from 'src/games/igdb/requestTwitchToken';
import { PrismaIntegrationRepository } from '../repositories/prisma/prisma-integration-repository';
import { SaveIgdbDto } from '../dto/save-igdb.dto';
import { getIgdbStatus } from './getIgdbStatus';

/**
 * Grava as credenciais do IGDB depois de confirmar com a Twitch que funcionam —
 * umas credenciais erradas nunca chegam a substituir as boas.
 */
export async function saveIgdbCredentials(
  dto: SaveIgdbDto,
  repository: PrismaIntegrationRepository,
) {
  let clientSecret = dto.clientSecret;
  if (!clientSecret) {
    const existing = await repository.find(IntegrationProvider.IGDB);
    if (!existing) {
      throw new BadRequestException('Falta o Client Secret.');
    }
    try {
      clientSecret = decryptToken(existing.secret);
    } catch {
      throw new BadRequestException(
        'O Client Secret guardado já não se consegue ler — introduz o Client Secret outra vez.',
      );
    }
  }

  let token: TwitchToken | null;
  try {
    token = await requestTwitchToken(dto.clientId, clientSecret);
  } catch {
    throw new BadRequestException(
      'Não foi possível contactar a Twitch para validar as credenciais.',
    );
  }
  if (!token) {
    throw new BadRequestException(
      'A Twitch rejeitou as credenciais — confirma o Client ID e o Client Secret.',
    );
  }

  await repository.save({
    provider: IntegrationProvider.IGDB,
    clientId: dto.clientId,
    secret: encryptToken(clientSecret),
  });
  return getIgdbStatus(repository);
}
