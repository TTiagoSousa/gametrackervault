import { LibraryStatus } from 'src/generated/prisma/client/client';
import { GamesService } from 'src/games/games.service';
import {
  EntryWithGame,
  LibraryRepository,
} from '../repositories/library-repository';
import { estimateHours } from './estimateHours';
import { refreshGameFacts } from './refreshGameFacts';
import { mapEntry } from './mapEntry';

const FINISHED: LibraryStatus[] = [
  LibraryStatus.FINISHED_MAIN,
  LibraryStatus.FINISHED_EXTRAS,
  LibraryStatus.COMPLETED_100,
];

const round = (value: number) => Math.round(value * 10) / 10;

const top = (counts: Map<string, number>, size: number) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, size)
    .map(([name, count]) => ({ name, count }));

const gameRef = (entry: EntryWithGame) => {
  const { game } = mapEntry(entry);
  return {
    gameId: entry.gameId,
    name: game.name,
    coverUrl: game.coverUrl,
    status: entry.status,
  };
};

/**
 * A user's shelf stats: games per status, hours (entered
 * and estimated from the IGDB average), ratings, games finished per year,
 * most played genres, the backlog and the highlights.
 */
export async function getLibraryStats(
  userId: string,
  repository: LibraryRepository,
  games: GamesService,
) {
  const entries = await repository.listEntries(userId);
  const factsComplete = await refreshGameFacts(entries, repository, games);

  const counts = Object.fromEntries(
    Object.values(LibraryStatus).map((status) => [status, 0]),
  ) as Record<LibraryStatus, number>;

  let logged = 0;
  let estimated = 0;
  let loggedGames = 0;
  let estimatedGames = 0;
  let missingGames = 0;
  let backlogHours = 0;
  let backlogMissing = 0;
  const ratings = Array.from({ length: 10 }, () => 0);
  const perYear = new Map<number, number>();
  const genres = new Map<string, number>();
  const withHours: {
    entry: EntryWithGame;
    hours: number;
    estimated: boolean;
  }[] = [];

  for (const entry of entries) {
    counts[entry.status] += 1;

    if (entry.status === LibraryStatus.PLAN_TO_PLAY) {
      // The backlog: each game's main story average
      if (entry.game.ttbMain != null) backlogHours += entry.game.ttbMain;
      else backlogMissing += 1;
      continue;
    }

    const estimate = estimateHours(entry, entry.game);
    if (estimate.hours == null) missingGames += 1;
    else if (estimate.estimated) {
      estimated += estimate.hours;
      estimatedGames += 1;
    } else {
      logged += estimate.hours;
      loggedGames += 1;
    }
    if (estimate.hours != null && estimate.hours > 0) {
      withHours.push({
        entry,
        hours: estimate.hours,
        estimated: estimate.estimated,
      });
    }

    if (entry.rating != null) ratings[entry.rating - 1] += 1;

    if (FINISHED.includes(entry.status)) {
      const year = (entry.finishedAt ?? entry.updatedAt).getUTCFullYear();
      perYear.set(year, (perYear.get(year) ?? 0) + 1);
    }

    for (const genre of entry.game.genres)
      genres.set(genre, (genres.get(genre) ?? 0) + 1);
  }

  const rated = ratings.reduce((sum, n) => sum + n, 0);
  const ratingSum = ratings.reduce((sum, n, i) => sum + n * (i + 1), 0);
  const finished = FINISHED.reduce((sum, status) => sum + counts[status], 0);

  return {
    total: entries.length,
    counts,
    finished,
    // Of the games that ended (finished or dropped): how many were played to the end
    completionRate:
      finished + counts.DROPPED > 0
        ? Math.round((finished / (finished + counts.DROPPED)) * 100)
        : null,
    hours: {
      total: round(logged + estimated),
      logged: round(logged),
      estimated: round(estimated),
      loggedGames,
      estimatedGames,
      missingGames,
    },
    backlog: {
      games: counts.PLAN_TO_PLAY,
      hours: round(backlogHours),
      missingGames: backlogMissing,
    },
    rating: {
      average: rated ? round(ratingSum / rated) : null,
      rated,
      distribution: ratings,
    },
    finishedPerYear: [...perYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count })),
    genres: top(genres, 8),
    topRated: entries
      .filter((e) => e.rating != null)
      .sort(
        (a, b) =>
          b.rating! - a.rating! ||
          b.updatedAt.getTime() - a.updatedAt.getTime(),
      )
      .slice(0, 5)
      .map((e) => ({ ...gameRef(e), rating: e.rating! })),
    mostPlayed: withHours
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map((h) => ({
        ...gameRef(h.entry),
        hours: round(h.hours),
        estimated: h.estimated,
      })),
    // false when IGDB didn't respond and some averages may be missing
    factsComplete,
  };
}
