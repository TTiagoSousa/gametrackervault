import {
  Integration,
  IntegrationProvider,
} from 'src/generated/prisma/client/client';

export interface IntegrationRepository {
  find(provider: IntegrationProvider): Promise<Integration | null>;
  save(data: {
    provider: IntegrationProvider;
    clientId: string;
    secret: string;
  }): Promise<Integration>;
  remove(provider: IntegrationProvider): Promise<void>;
}
