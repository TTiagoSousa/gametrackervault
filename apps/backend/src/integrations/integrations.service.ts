import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from 'src/generated/prisma/client/client';
import { PrismaIntegrationRepository } from './repositories/prisma/prisma-integration-repository';
import { IntegrationCredentialsService } from './integration-credentials.service';
import { SaveIgdbDto } from './dto/save-igdb.dto';
import { getIgdbStatus } from './helpers/getIgdbStatus';
import { saveIgdbCredentials } from './helpers/saveIgdbCredentials';
import { testIgdbCredentials } from './helpers/testIgdbCredentials';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly repository: PrismaIntegrationRepository,
    private readonly credentials: IntegrationCredentialsService,
  ) {}

  igdbStatus() {
    return getIgdbStatus(this.repository);
  }

  async saveIgdb(dto: SaveIgdbDto) {
    const status = await saveIgdbCredentials(dto, this.repository);
    this.credentials.invalidate(IntegrationProvider.IGDB);
    return status;
  }

  testIgdb() {
    return testIgdbCredentials(this.credentials);
  }

  async removeIgdb() {
    await this.repository.remove(IntegrationProvider.IGDB);
    this.credentials.invalidate(IntegrationProvider.IGDB);
    return getIgdbStatus(this.repository);
  }
}
