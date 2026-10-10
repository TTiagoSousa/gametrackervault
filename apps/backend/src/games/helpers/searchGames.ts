import { IgdbClient } from '../igdb/igdb.client';
import { SearchGamesDto } from '../dto/search-games.dto';
import { buildSearchQuery } from './buildSearchQuery';
import { IgdbGame, mapGame } from './mapGame';

/** IGDB search: one page of results and the total available. */
export async function searchGames(dto: SearchGamesDto, igdb: IgdbClient) {
  const { query, countQuery, page, pageSize } = buildSearchQuery(dto);

  const games = await igdb.query<IgdbGame[]>('games', query);
  const { count } = await igdb.query<{ count: number }>(
    'games/count',
    countQuery,
  );

  return {
    items: games.map(mapGame),
    total: count,
    page,
    pageSize,
  };
}
