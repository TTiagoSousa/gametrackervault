import { Injectable } from '@nestjs/common';
import { GamesService } from 'src/games/games.service';
import { PrismaLibraryRepository } from './repositories/prisma/prisma-library-repository';
import { SaveLibraryEntryDto } from './dto/save-library-entry.dto';
import { listLibrary } from './helpers/listLibrary';
import { getLibraryEntry } from './helpers/getLibraryEntry';
import { saveLibraryEntry } from './helpers/saveLibraryEntry';
import { removeLibraryEntry } from './helpers/removeLibraryEntry';
import { getLibraryStats } from './helpers/getLibraryStats';

@Injectable()
export class LibraryService {
  constructor(
    private readonly repository: PrismaLibraryRepository,
    private readonly games: GamesService,
  ) {}

  list(userId: string) {
    return listLibrary(userId, this.repository);
  }

  get(userId: string, gameId: number) {
    return getLibraryEntry(userId, gameId, this.repository);
  }

  save(userId: string, gameId: number, dto: SaveLibraryEntryDto) {
    return saveLibraryEntry(userId, gameId, dto, this.repository, this.games);
  }

  remove(userId: string, gameId: number) {
    return removeLibraryEntry(userId, gameId, this.repository);
  }

  stats(userId: string) {
    return getLibraryStats(userId, this.repository, this.games);
  }

  // A well-rated IGDB game the user doesn't have on their shelf yet
  async discover(userId: string) {
    const entries = await this.repository.listEntries(userId);
    return this.games.random(entries.map((e) => e.gameId));
  }
}
