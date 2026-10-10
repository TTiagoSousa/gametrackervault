import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { decryptToken } from 'src/utils/crypto/token-cipher';
import { PrismaIntegrationRepository } from '../repositories/prisma/prisma-integration-repository';

/**
 * The status for Admin: whether it is configured, the Client ID and only the last 4
 * characters of the secret — the full secret never goes back to the browser.
 *
 * If the stored secret can't be decrypted (TOKEN_ENCRYPTION_KEY changed
 * or is missing), the status says so in "unreadable" instead of failing: the admin must
 * be able to open the card to enter it again.
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
