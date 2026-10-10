import { BadRequestException } from '@nestjs/common';
import { decryptToken, encryptToken } from 'src/utils/crypto/token-cipher';
import { listModels } from '../anthropic/anthropic.client';
import { AiSettingsRepository } from '../repositories/ai-settings-repository';
import { SaveAiSettingsDto } from '../dto/ai.dto';

// The suggested model when the user hasn't picked one yet
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** What the browser may know: whether there is a key, its last characters and the model. */
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

/** The stored key, decrypted — only for talking to Anthropic, never leaves here. */
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
 * Saves the key (tested against Anthropic first) and the model. Without a new key,
 * only changes the model.
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

  // A key that Anthropic rejects is never saved
  await listModels(apiKey);
  await repository.save(userId, {
    apiKey: encryptToken(apiKey),
    keyHint: apiKey.slice(-4),
    model: dto.model,
  });
  return getAiSettings(userId, repository);
}

/** The models available with the given key or, without one, with the stored one. */
export async function listAiModels(
  userId: string,
  apiKey: string | undefined,
  repository: AiSettingsRepository,
) {
  const key = apiKey?.trim() || (await savedApiKey(userId, repository)).apiKey;
  return listModels(key);
}
