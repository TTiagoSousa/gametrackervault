import { Injectable } from '@nestjs/common';
import { AiSettings } from 'src/generated/prisma/client/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** Each user's assistant key (already encrypted) and model. */
@Injectable()
export class AiSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(userId: string): Promise<AiSettings | null> {
    return this.prisma.aiSettings.findUnique({ where: { userId } });
  }

  save(
    userId: string,
    data: { apiKey: string; keyHint: string; model: string },
  ): Promise<AiSettings> {
    return this.prisma.aiSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  updateModel(userId: string, model: string): Promise<AiSettings> {
    return this.prisma.aiSettings.update({
      where: { userId },
      data: { model },
    });
  }

  async remove(userId: string): Promise<void> {
    await this.prisma.aiSettings.deleteMany({ where: { userId } });
  }
}
