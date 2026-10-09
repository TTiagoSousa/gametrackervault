import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Game } from 'src/generated/prisma/client/client';
import { GameSnapshot } from 'src/games/helpers/getGameSummary';
import { GameFacts } from 'src/games/helpers/getGameFacts';
import {
  EntryData,
  EntryWithGame,
  LibraryRepository,
} from '../library-repository';

@Injectable()
export class PrismaLibraryRepository implements LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGame(igdbId: number): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { igdbId } });
  }

  saveGame(snapshot: GameSnapshot): Promise<Game> {
    const { igdbId, ...data } = snapshot;
    return this.prisma.game.upsert({
      where: { igdbId },
      create: snapshot,
      update: data,
    });
  }

  findEntry(userId: string, gameId: number): Promise<EntryWithGame | null> {
    return this.prisma.libraryEntry.findUnique({
      where: { userId_gameId: { userId, gameId } },
      include: { game: true },
    });
  }

  listEntries(userId: string): Promise<EntryWithGame[]> {
    return this.prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  saveEntry(
    userId: string,
    gameId: number,
    data: EntryData,
  ): Promise<EntryWithGame> {
    return this.prisma.libraryEntry.upsert({
      where: { userId_gameId: { userId, gameId } },
      create: { userId, gameId, ...data },
      update: data,
      include: { game: true },
    });
  }

  async saveGameFacts(igdbId: number, facts: GameFacts): Promise<void> {
    await this.prisma.game.update({
      where: { igdbId },
      data: { ...facts, factsCheckedAt: new Date() },
    });
  }

  async removeEntry(userId: string, gameId: number): Promise<boolean> {
    const { count } = await this.prisma.libraryEntry.deleteMany({
      where: { userId, gameId },
    });
    return count > 0;
  }
}
