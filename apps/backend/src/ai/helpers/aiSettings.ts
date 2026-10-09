import { BadRequestException } from '@nestjs/common';
import { decryptToken, encryptToken } from 'src/utils/crypto/token-cipher';
import { listModels } from '../anthropic/anthropic.client';
import { AiSettingsRepository } from '../repositories/ai-settings-repository';
import { SaveAiSettingsDto } from '../dto/ai.dto';

// O modelo sugerido quando o utilizador ainda não escolheu nenhum
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** O que o browser pode saber: se há chave, os últimos caracteres e o modelo. */
export async function getAiSettings(
  userId: string,
  repository: AiSettingsRepository,
) {
  const settings = await repository.find(userId);
  return {
    provider: 'ANTHROPIC' as const,
    configured: Boolean(settings),
    keyHint: settings?.keyHint ?? null,
    model: settings?.model ?? DEFAULT_MODEL,
    updatedAt: settings?.updatedAt ?? null,
  };
}

/** A chave guardada, decifrada — só para falar com a Anthropic, nunca sai daqui. */
export async function savedApiKey(
  userId: string,
  repository: AiSettingsRepository,
) {
  const settings = await repository.find(userId);
  if (!settings) {
    throw new BadRequestException(
      'Ainda não puseste a chave do Claude. Vai a Definições → Assistente.',
    );
  }
  return { apiKey: decryptToken(settings.apiKey), model: settings.model };
}

/**
 * Guarda a chave (testada primeiro na Anthropic) e o modelo. Sem chave nova,
 * muda só o modelo.
 */
export async function saveAiSettings(
  userId: string,
  dto: SaveAiSettingsDto,
  repository: AiSettingsRepository,
) {
  const apiKey = dto.apiKey?.trim();
  if (!apiKey) {
    if (!(await repository.find(userId))) {
      throw new BadRequestException('Falta a chave da API.');
    }
    await repository.updateModel(userId, dto.model);
    return getAiSettings(userId, repository);
  }

  // Uma chave que a Anthropic rejeita nunca chega a ser guardada
  await listModels(apiKey);
  await repository.save(userId, {
    apiKey: encryptToken(apiKey),
    keyHint: apiKey.slice(-4),
    model: dto.model,
  });
  return getAiSettings(userId, repository);
}

/** Os modelos disponíveis com a chave dada ou, sem ela, com a guardada. */
export async function listAiModels(
  userId: string,
  apiKey: string | undefined,
  repository: AiSettingsRepository,
) {
  const key = apiKey?.trim() || (await savedApiKey(userId, repository)).apiKey;
  return listModels(key);
}
