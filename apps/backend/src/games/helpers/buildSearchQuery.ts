import { SearchGamesDto, Sort } from '../dto/search-games.dto';

export const DEFAULT_PAGE_SIZE = 24;

// Na ordem "melhor nota", só entram jogos com pelo menos isto de avaliações
export const MIN_RATINGS_FOR_TOP = 25;

// Separado para os testes poderem fixar o "agora"
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

// 1 de janeiro do ano, em segundos (o IGDB guarda datas em Unix time)
const startOfYear = (year: number) => Date.UTC(year, 0, 1) / 1000;

// As aspas e as barras do texto não podem fechar a string do Apicalypse
const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const anyOf = (field: string, ids?: number[]) =>
  ids && ids.length ? `${field} = (${ids.join(',')})` : null;

/**
 * Traduz os filtros da pesquisa para duas consultas Apicalypse: a dos
 * resultados (com campos, ordem e página) e a da contagem total.
 *
 * Com texto, o IGDB ordena por relevância e não aceita outra ordem — a ordem
 * escolhida só se aplica quando se navega só com filtros.
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

  // Sem texto, algumas ordens precisam de um mínimo de dados para fazer sentido:
  // a melhor nota seria ganha por jogos com uma só avaliação de 100, e os mais
  // recentes seriam anúncios com datas de 2040. A popularidade não filtra nada —
  // o IGDB põe os jogos sem avaliações no fim, por isso a contagem é a do
  // catálogo inteiro e a ordem continua a abrir pelos mais populares.
  // "relevance" só existe com texto; sem texto vale como popularidade
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
