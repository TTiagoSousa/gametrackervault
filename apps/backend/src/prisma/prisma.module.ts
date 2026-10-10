import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // recommended
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
