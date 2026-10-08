import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
      max: 20,
    });
    super({ adapter });
  }
}
