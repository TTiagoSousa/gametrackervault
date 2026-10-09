import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { decryptToken } from 'src/utils/crypto/token-cipher';
import { PrismaIntegrationRepository } from './repositories/prisma/prisma-integration-repository';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * As credenciais em claro, para quem fala com o serviço externo (o cliente do
 * IGDB). Ficam em memória até alguém as mudar no Admin — a pesquisa não vai à
 * base de dados em cada pedido.
 */
@Injectable()
export class IntegrationCredentialsService {
  private cache = new Map<IntegrationProvider, ClientCredentials | null>();

  constructor(private readonly repository: PrismaIntegrationRepository) {}

  async get(provider: IntegrationProvider): Promise<ClientCredentials | null> {
    if (this.cache.has(provider)) return this.cache.get(provider) ?? null;
    const row = await this.repository.find(provider);
    if (!row) {
      this.cache.set(provider, null);
      return null;
    }
    let clientSecret: string;
    try {
      clientSecret = decryptToken(row.secret);
    } catch {
      // Não fica em cache: assim que o admin gravar de novo, volta a funcionar
      throw new ServiceUnavailableException(
        'Não foi possível ler as credenciais guardadas (a TOKEN_ENCRYPTION_KEY mudou ou falta). Um administrador tem de as introduzir outra vez em Admin → Integrações.',
      );
    }
    const credentials = { clientId: row.clientId, clientSecret };
    this.cache.set(provider, credentials);
    return credentials;
  }

  invalidate(provider: IntegrationProvider) {
    this.cache.delete(provider);
  }
}
