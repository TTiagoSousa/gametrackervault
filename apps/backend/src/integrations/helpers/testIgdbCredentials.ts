import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { requestTwitchToken } from 'src/games/igdb/requestTwitchToken';
import { IntegrationCredentialsService } from '../integration-credentials.service';

export type IgdbTestResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not-configured' | 'unreadable' | 'rejected' | 'unreachable';
    };

/** Confirms with Twitch that the stored credentials are still valid. */
export async function testIgdbCredentials(
  credentials: IntegrationCredentialsService,
): Promise<IgdbTestResult> {
  const saved = await credentials
    .get(IntegrationProvider.IGDB)
    .catch(() => 'unreadable' as const);
  if (saved === 'unreadable') return { ok: false, reason: 'unreadable' };
  if (!saved) return { ok: false, reason: 'not-configured' };
  try {
    const token = await requestTwitchToken(saved.clientId, saved.clientSecret);
    return token ? { ok: true } : { ok: false, reason: 'rejected' };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
