import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IntegrationProvider } from 'src/generated/prisma/client/client';
import {
  ClientCredentials,
  IntegrationCredentialsService,
} from 'src/integrations/integration-credentials.service';
import { requestTwitchToken, TwitchToken } from './requestTwitchToken';

const API_URL = 'https://api.igdb.com/v4';

// IGDB accepts 4 requests per second; 260 ms between requests keeps us below
const MIN_INTERVAL_MS = 260;

/**
 * IGDB API (v4) client. The credentials are the ones the admin saved in
 * Admin → Integrations; authentication is a Twitch app token that is
 * requested again when it expires, when the API responds 401 or when the admin
 * changes the credentials.
 *
 * Requests go through a queue that spaces them out, so they never hit the limit of
 * 4/s even with several concurrent searches.
 */
@Injectable()
export class IgdbClient {
  private token: (TwitchToken & { clientId: string; secret: string }) | null =
    null;
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(private readonly credentials: IntegrationCredentialsService) {}

  private async currentCredentials(): Promise<ClientCredentials> {
    const saved = await this.credentials.get(IntegrationProvider.IGDB);
    if (!saved) {
      throw new ServiceUnavailableException(
        'A pesquisa de jogos não está configurada. Um administrador tem de pôr as credenciais do IGDB em Admin → Integrações.',
      );
    }
    return saved;
  }

  private async accessToken(
    credentials: ClientCredentials,
    force: boolean,
  ): Promise<string> {
    const reusable =
      !force &&
      this.token &&
      this.token.clientId === credentials.clientId &&
      this.token.secret === credentials.clientSecret &&
      this.token.expiresAt > Date.now() + 60_000;
    if (reusable && this.token) return this.token.value;

    const token = await requestTwitchToken(
      credentials.clientId,
      credentials.clientSecret,
    ).catch(() => {
      throw new ServiceUnavailableException(
        'Não foi possível contactar a Twitch para autenticar no IGDB.',
      );
    });
    if (!token) {
      throw new ServiceUnavailableException(
        'A Twitch rejeitou as credenciais do IGDB — um administrador tem de as rever em Admin → Integrações.',
      );
    }
    this.token = {
      ...token,
      clientId: credentials.clientId,
      secret: credentials.clientSecret,
    };
    return token.value;
  }

  /** Waits its turn in the queue, ensuring the minimum interval between requests. */
  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastRequestAt = Date.now();
      return task();
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /**
   * Runs an Apicalypse query on an endpoint (e.g. "games", "platforms").
   * E.g.: query('games', 'search "zelda"; fields name; limit 10;')
   */
  query<T>(endpoint: string, body: string): Promise<T> {
    return this.schedule(() => this.send<T>(endpoint, body, false));
  }

  private async send<T>(
    endpoint: string,
    body: string,
    retried: boolean,
  ): Promise<T> {
    const credentials = await this.currentCredentials();
    const token = await this.accessToken(credentials, retried);
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': credentials.clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body,
    });

    // Token revoked or expired early: get a new one and try once more
    if (response.status === 401 && !retried) {
      return this.send<T>(endpoint, body, true);
    }
    if (response.status === 429) {
      throw new ServiceUnavailableException(
        'O IGDB está a limitar os pedidos. Tenta outra vez daqui a pouco.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `O IGDB respondeu com erro (${response.status}).`,
      );
    }
    return (await response.json()) as T;
  }
}
