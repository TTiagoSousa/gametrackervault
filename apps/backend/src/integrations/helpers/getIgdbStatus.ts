import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { decryptToken } from 'src/utils/crypto/token-cipher';
import { PrismaIntegrationRepository } from '../repositories/prisma/prisma-integration-repository';

/**
 * O estado para o Admin: se está configurado, o Client ID e só os últimos 4
 * caracteres do secret — o secret inteiro nunca volta ao browser.
 *
 * Se o secret guardado não se conseguir decifrar (a TOKEN_ENCRYPTION_KEY mudou
 * ou falta), o estado diz-o em "unreadable" em vez de falhar: o admin tem de
 * conseguir abrir o cartão para o introduzir outra vez.
 */
export async function getIgdbStatus(repository: PrismaIntegrationRepository) {
  const row = await repository.find(IntegrationProvider.IGDB);
  if (!row) {
    return {
      configured: false,
      unreadable: false,
      clientId: null,
      secretHint: null,
      updatedAt: null,
    };
  }
  let secretHint: string | null = null;
  try {
    secretHint = decryptToken(row.secret).slice(-4);
  } catch {
    secretHint = null;
  }
  return {
    configured: true,
    unreadable: secretHint === null,
    clientId: row.clientId,
    secretHint,
    updatedAt: row.updatedAt,
  };
}
