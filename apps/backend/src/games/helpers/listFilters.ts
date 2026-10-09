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

// As listas mudam raramente (uma plataforma nova de vez em quando): ficam um dia
// em memória e, depois disso, continuam a ser servidas enquanto se renovam por
// trás — nunca ninguém espera pelo IGDB a não ser na primeiríssima vez.
const CACHE_MS = 24 * 60 * 60 * 1000;
let cache: { value: GameFilters; at: number } | null = null;
// O pedido em curso, para vários pedidos ao mesmo tempo não irem todos ao IGDB
let inFlight: Promise<GameFilters> | null = null;

const byName = (a: FilterOption, b: FilterOption) =>
  a.name.localeCompare(b.name);

async function fetchFilters(igdb: IgdbClient): Promise<GameFilters> {
  const named = (endpoint: string) =>
    igdb.query<FilterOption[]>(
      endpoint,
      'fields name; limit 500; sort name asc;',
    );

  // Em paralelo: a fila do IgdbClient já os espaça para não passar o limite
  const [platforms, genres, themes, modes, perspectives, types] =
    await Promise.all([
      named('platforms'),
      named('genres'),
      named('themes'),
      named('game_modes'),
      named('player_perspectives'),
      // Os tipos (jogo principal, DLC, expansão, remake…) têm o nome em "type"
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
 * Todas as opções de filtro que o IGDB conhece, com os ids que a pesquisa usa.
 * Com a cache expirada devolve-a na mesma e renova-a em segundo plano.
 */
export async function listFilters(igdb: IgdbClient): Promise<GameFilters> {
  if (!cache) return refresh(igdb);
  if (Date.now() - cache.at >= CACHE_MS) {
    // Se a renovação falhar, fica a lista antiga até à próxima tentativa
    refresh(igdb).catch(() => undefined);
  }
  return cache.value;
}
