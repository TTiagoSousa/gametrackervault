import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationCredentialsService } from './integration-credentials.service';
import { PrismaIntegrationRepository } from './repositories/prisma/prisma-integration-repository';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationCredentialsService,
    PrismaIntegrationRepository,
  ],
  // O cliente do IGDB (módulo games) lê as credenciais por aqui
  exports: [IntegrationCredentialsService],
})
export class IntegrationsModule {}
