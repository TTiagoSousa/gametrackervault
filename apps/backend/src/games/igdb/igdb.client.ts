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

// O IGDB aceita 4 pedidos por segundo; com 260 ms entre pedidos fica-se abaixo
const MIN_INTERVAL_MS = 260;

/**
 * Cliente da API do IGDB (v4). As credenciais são as que o admin guardou em
 * Admin → Integrações; a autenticação é um token de aplicação da Twitch que é
 * pedido outra vez quando expira, quando a API responde 401 ou quando o admin
 * muda as credenciais.
 *
 * Os pedidos passam por uma fila que os espaça, para nunca bater no limite de
 * 4/s mesmo com várias pesquisas ao mesmo tempo.
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

  /** Espera a vez na fila, garantindo o intervalo mínimo entre pedidos. */
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
   * Corre uma consulta Apicalypse num endpoint (ex. "games", "platforms").
   * Ex.: query('games', 'search "zelda"; fields name; limit 10;')
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

    // Token revogado ou expirado antes do previsto: um novo e mais uma tentativa
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
