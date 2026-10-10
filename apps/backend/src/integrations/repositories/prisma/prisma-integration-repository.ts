import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IntegrationRepository } from '../integration-repository';
import {
  Integration,
  IntegrationProvider,
} from 'src/generated/prisma/client/client';

// The secret arrives here already encrypted — the repository knows nothing about encryption
@Injectable()
export class PrismaIntegrationRepository implements IntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(provider: IntegrationProvider): Promise<Integration | null> {
    return this.prisma.integration.findUnique({ where: { provider } });
  }

  save(data: {
    provider: IntegrationProvider;
    clientId: string;
    secret: string;
  }): Promise<Integration> {
    return this.prisma.integration.upsert({
      where: { provider: data.provider },
      create: data,
      update: { clientId: data.clientId, secret: data.secret },
    });
  }

  async remove(provider: IntegrationProvider): Promise<void> {
    await this.prisma.integration.deleteMany({ where: { provider } });
  }
}
