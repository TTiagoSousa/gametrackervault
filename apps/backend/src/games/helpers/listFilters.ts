import { IgdbClient } from '../igdb/igdb.client';

export interface FilterOption {
  id: number;
  name: string;
}

export interface GameFilters {
  platforms: FilterOption[];
  genres: FilterOption[];
  themes: FilterOption[];
  modes: FilterOption[];
  perspectives: FilterOption[];
  types: FilterOption[];
}

// The lists rarely change (a new platform now and then): they stay in memory for a day
// and, after that, keep being served while they refresh in the
// background — nobody ever waits for IGDB except the very first time.
const CACHE_MS = 24 * 60 * 60 * 1000;
let cache: { value: GameFilters; at: number } | null = null;
// The in-flight request, so concurrent requests don't all hit IGDB
let inFlight: Promise<GameFilters> | null = null;

const byName = (a: FilterOption, b: FilterOption) =>
  a.name.localeCompare(b.name);

async function fetchFilters(igdb: IgdbClient): Promise<GameFilters> {
  const named = (endpoint: string) =>
    igdb.query<FilterOption[]>(
      endpoint,
      'fields name; limit 500; sort name asc;',
    );

  // In parallel: the IgdbClient queue already spaces them out to stay under the limit
  const [platforms, genres, themes, modes, perspectives, types] =
    await Promise.all([
      named('platforms'),
      named('genres'),
      named('themes'),
      named('game_modes'),
      named('player_perspectives'),
      // Types (main game, DLC, expansion, remake…) have their name in "type"
      igdb.query<{ id: number; type: string }[]>(
        'game_types',
        'fields type; limit 100;',
      ),
    ]);

  const value: GameFilters = {
    platforms,
    genres,
    themes,
    modes,
    perspectives,
    types: types.map((t) => ({ id: t.id, name: t.type })).sort(byName),
  };
  cache = { value, at: Date.now() };
  return value;
}

function refresh(igdb: IgdbClient): Promise<GameFilters> {
  inFlight ??= fetchFilters(igdb).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * All filter options IGDB knows, with the ids the search uses.
 * With an expired cache it still returns it and refreshes it in the background.
 */
export async function listFilters(igdb: IgdbClient): Promise<GameFilters> {
  if (!cache) return refresh(igdb);
  if (Date.now() - cache.at >= CACHE_MS) {
    // If the refresh fails, the old list stays until the next attempt
    refresh(igdb).catch(() => undefined);
  }
  return cache.value;
}
