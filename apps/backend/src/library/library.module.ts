import { Module } from '@nestjs/common';
import { GamesModule } from 'src/games/games.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { PrismaLibraryRepository } from './repositories/prisma/prisma-library-repository';

@Module({
  imports: [GamesModule],
  controllers: [LibraryController],
  providers: [LibraryService, PrismaLibraryRepository],
  // O assistente lê a estante para recomendar jogos
  exports: [PrismaLibraryRepository],
})
export class LibraryModule {}
