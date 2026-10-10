import { GamesService } from 'src/games/games.service';
import {
  EntryWithGame,
  LibraryRepository,
} from '../repositories/library-repository';

// IGDB average times change slowly: once a week is enough
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Ensures these entries' games have IGDB genres and average times,
 * fetching (in batch) those never fetched or older than a week.
 * Updates the in-memory entries and the Game table. If IGDB fails, the numbers
 * are computed with what was already there — returns false so the page can say so.
 */
export async function refreshGameFacts(
  entries: EntryWithGame[],
  repository: LibraryRepository,
  games: GamesService,
): Promise<boolean> {
  const limit = Date.now() - MAX_AGE_MS;
  const stale = [
    ...new Set(
      entries
        .filter(
          (e) =>
            !e.game.factsCheckedAt || e.game.factsCheckedAt.getTime() < limit,
        )
        .map((e) => e.gameId),
    ),
  ];
  if (!stale.length) return true;

  try {
    const facts = await games.facts(stale);
    for (const [igdbId, fact] of facts) {
      await repository.saveGameFacts(igdbId, fact);
    }
    for (const entry of entries) {
      const fact = facts.get(entry.gameId);
      if (fact) Object.assign(entry.game, fact, { factsCheckedAt: new Date() });
    }
    return true;
  } catch {
    return false;
  }
}
