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
  // The IGDB client (games module) reads the credentials through here
  exports: [IntegrationCredentialsService],
})
export class IntegrationsModule {}
