import { SearchGamesDto, Sort } from '../dto/search-games.dto';

export const DEFAULT_PAGE_SIZE = 24;

// When sorting by "top rated", only games with at least this many ratings are included
export const MIN_RATINGS_FOR_TOP = 25;

// Separate so tests can pin "now"
export const now = () => Date.now();

export const GAME_FIELDS = [
  'name',
  'slug',
  'cover.image_id',
  'first_release_date',
  'platforms.name',
  'platforms.abbreviation',
  'genres.name',
  'total_rating',
  'total_rating_count',
  'game_type.type',
].join(',');

const SORT_CLAUSE: Record<Exclude<Sort, 'relevance'>, string> = {
  popular: 'total_rating_count desc',
  rating: 'total_rating desc',
  newest: 'first_release_date desc',
  oldest: 'first_release_date asc',
  name: 'name asc',
};

// January 1st of the year, in seconds (IGDB stores dates as Unix time)
const startOfYear = (year: number) => Date.UTC(year, 0, 1) / 1000;

// Quotes and backslashes in the text must not close the Apicalypse string
const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const anyOf = (field: string, ids?: number[]) =>
  ids && ids.length ? `${field} = (${ids.join(',')})` : null;

/**
 * Translates the search filters into two Apicalypse queries: the
 * results one (with fields, order and page) and the total count one.
 *
 * With text, IGDB sorts by relevance and accepts no other order — the chosen
 * order only applies when browsing with filters alone.
 */
export function buildSearchQuery(dto: SearchGamesDto) {
  const pageSize = dto.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = dto.page ?? 1;
  const text = dto.q?.trim();

  const conditions = [
    anyOf('platforms', dto.platforms),
    anyOf('genres', dto.genres),
    anyOf('themes', dto.themes),
    anyOf('game_modes', dto.modes),
    anyOf('player_perspectives', dto.perspectives),
    anyOf('game_type', dto.types),
    dto.yearFrom ? `first_release_date >= ${startOfYear(dto.yearFrom)}` : null,
    dto.yearTo ? `first_release_date < ${startOfYear(dto.yearTo + 1)}` : null,
    dto.minRating !== undefined ? `total_rating >= ${dto.minRating}` : null,
  ].filter((condition): condition is string => Boolean(condition));

  // Without text, some orders need a minimum of data to make sense:
  // top rated would be won by games with a single 100 rating, and the newest
  // would be announcements dated 2040. Popularity doesn't filter anything —
  // IGDB puts unrated games at the end, so the count is that of the
  // whole catalogue and the order still starts with the most popular.
  // "relevance" only exists with text; without text it counts as popularity
  const browseSort: Exclude<Sort, 'relevance'> =
    dto.sort && dto.sort !== 'relevance' ? dto.sort : 'popular';

  if (!text) {
    const sortKey = browseSort;
    if (sortKey === 'rating') {
      conditions.push(`total_rating_count >= ${MIN_RATINGS_FOR_TOP}`);
    }
    if (sortKey === 'newest') {
      conditions.push(`first_release_date <= ${Math.floor(now() / 1000)}`);
    }
  }

  const search = text ? `search "${escapeText(text)}";` : '';
  const where = conditions.length ? `where ${conditions.join(' & ')};` : '';
  const sort = text ? '' : `sort ${SORT_CLAUSE[browseSort]};`;

  const query = [
    `fields ${GAME_FIELDS};`,
    search,
    where,
    sort,
    `limit ${pageSize};`,
    `offset ${(page - 1) * pageSize};`,
  ]
    .filter(Boolean)
    .join(' ');

  const countQuery = [search, where].filter(Boolean).join(' ');

  return { query, countQuery, page, pageSize };
}
