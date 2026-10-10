import { NotFoundException } from '@nestjs/common';
import { IgdbClient } from '../igdb/igdb.client';
import {
  GameDetail,
  GameRef,
  IgdbGameDetail,
  IgdbTimeToBeat,
  mapGameDetail,
  mapRef,
} from './mapGameDetail';

// Related games (DLCs, expansions, versions) only need what the grid shows
const REF = (field: string) =>
  ['name', 'cover.image_id', 'first_release_date']
    .map((f) => `${field}.${f}`)
    .join(',');

const DETAIL_FIELDS = [
  'name',
  'slug',
  'summary',
  'storyline',
  'url',
  'cover.image_id',
  'first_release_date',
  'game_type.type',
  'platforms.name',
  'platforms.abbreviation',
  'genres.name',
  'themes.name',
  'game_modes.name',
  'player_perspectives.name',
  'involved_companies.company.name',
  'involved_companies.developer',
  'involved_companies.publisher',
  'collections.name',
  'franchises.name',
  'total_rating',
  'total_rating_count',
  'aggregated_rating',
  'aggregated_rating_count',
  'rating',
  'rating_count',
  'screenshots.image_id',
  'videos.video_id',
  'videos.name',
  REF('dlcs'),
  REF('expansions'),
  REF('standalone_expansions'),
  REF('remakes'),
  REF('remasters'),
  REF('parent_game'),
].join(',');

// A game's details rarely change: ten minutes in memory save three requests to
// IGDB every time someone returns to the same page
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<number, { value: GameDetail; at: number }>();

/**
 * A game's full details: the IGDB data, the average time to beat it
 * (game_time_to_beats) and the main games of the same series.
 */
export async function getGameDetail(
  id: number,
  igdb: IgdbClient,
): Promise<GameDetail> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const [game] = await igdb.query<IgdbGameDetail[]>(
    'games',
    `fields ${DETAIL_FIELDS}; where id = ${id};`,
  );
  if (!game) throw new NotFoundException('Jogo não encontrado no IGDB.');

  // If one of the secondary queries fails, the page opens without that part, but
  // that incomplete version isn't cached
  let partial = false;

  // Playtimes don't always exist (recent or rarely played games)
  const [timeToBeat] = await igdb
    .query<IgdbTimeToBeat[]>(
      'game_time_to_beats',
      `fields hastily,normally,completely,count; where game_id = ${id};`,
    )
    .catch(() => {
      partial = true;
      return [] as IgdbTimeToBeat[];
    });

  // Same series: main games only (game_type 0), by release order
  let series: GameRef[] = [];
  const collectionIds = (game.collections ?? []).map((c) => c.id);
  if (collectionIds.length) {
    const related = await igdb
      .query<IgdbGameDetail[]>(
        'games',
        `fields name,cover.image_id,first_release_date; where collections = (${collectionIds.join(',')}) & game_type = 0 & id != ${id}; sort first_release_date asc; limit 50;`,
      )
      .catch(() => {
        partial = true;
        return [] as IgdbGameDetail[];
      });
    series = related.map(mapRef);
  }

  const value = mapGameDetail(game, timeToBeat ?? null, series);
  if (partial) return value;
  // Map keeps insertion order: the first key is the oldest
  if (cache.size >= CACHE_MAX) {
    const [oldest] = cache.keys();
    cache.delete(oldest);
  }
  cache.set(id, { value, at: Date.now() });
  return value;
}
