import { IgdbClient } from '../igdb/igdb.client';

export interface GameFacts {
  genres: string[];
  ttbMain: number | null;
  ttbExtras: number | null;
  ttbCompletionist: number | null;
}

// IGDB returns at most 500 rows per request
const BATCH = 500;

const hours = (seconds?: number) =>
  seconds ? Math.round((seconds / 3600) * 10) / 10 : null;

/**
 * Genres and average times to beat for several games at once (two requests
 * per 500 games). Games without times on IGDB get null.
 */
export async function getGameFacts(
  ids: number[],
  igdb: IgdbClient,
): Promise<Map<number, GameFacts>> {
  const facts = new Map<number, GameFacts>();
  for (const id of ids) {
    facts.set(id, {
      genres: [],
      ttbMain: null,
      ttbExtras: null,
      ttbCompletionist: null,
    });
  }

  for (let i = 0; i < ids.length; i += BATCH) {
    const list = ids.slice(i, i + BATCH).join(',');
    const [games, times] = await Promise.all([
      igdb.query<{ id: number; genres?: { name: string }[] }[]>(
        'games',
        `fields genres.name; where id = (${list}); limit ${BATCH};`,
      ),
      igdb.query<
        {
          game_id: number;
          hastily?: number;
          normally?: number;
          completely?: number;
        }[]
      >(
        'game_time_to_beats',
        `fields game_id,hastily,normally,completely; where game_id = (${list}); limit ${BATCH};`,
      ),
    ]);
    for (const game of games) {
      const entry = facts.get(game.id);
      if (entry) entry.genres = (game.genres ?? []).map((g) => g.name);
    }
    for (const time of times) {
      const entry = facts.get(time.game_id);
      if (!entry) continue;
      entry.ttbMain = hours(time.hastily);
      entry.ttbExtras = hours(time.normally);
      entry.ttbCompletionist = hours(time.completely);
    }
  }
  return facts;
}
