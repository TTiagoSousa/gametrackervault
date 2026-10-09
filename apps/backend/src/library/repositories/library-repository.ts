import {
  Game,
  LibraryEntry,
  LibraryStatus,
} from 'src/generated/prisma/client/client';
import { GameSnapshot } from 'src/games/helpers/getGameSummary';
import { GameFacts } from 'src/games/helpers/getGameFacts';

export type EntryWithGame = LibraryEntry & { game: Game };

export interface EntryData {
  status: LibraryStatus;
  hoursPlayed: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  rating: number | null;
  notes: string | null;
}

export interface LibraryRepository {
  findGame(igdbId: number): Promise<Game | null>;
  saveGame(snapshot: GameSnapshot): Promise<Game>;
  findEntry(userId: string, gameId: number): Promise<EntryWithGame | null>;
  listEntries(userId: string): Promise<EntryWithGame[]>;
  saveEntry(
    userId: string,
    gameId: number,
    data: EntryData,
  ): Promise<EntryWithGame>;
  removeEntry(userId: string, gameId: number): Promise<boolean>;
  saveGameFacts(igdbId: number, facts: GameFacts): Promise<void>;
}
