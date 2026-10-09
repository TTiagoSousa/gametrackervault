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

// Os relacionados (DLCs, expansões, versões) só precisam do que a grelha mostra
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

// A ficha de um jogo muda pouco: dez minutos em memória poupam três pedidos ao
// IGDB cada vez que alguém volta à mesma página
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<number, { value: GameDetail; at: number }>();

/**
 * A ficha completa de um jogo: os dados do IGDB, o tempo médio para o acabar
 * (game_time_to_beats) e os jogos principais da mesma saga.
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

  // Se uma das consultas secundárias falhar, a página abre sem essa parte, mas
  // essa versão incompleta não fica em cache
  let partial = false;

  // Os tempos de jogo nem sempre existem (jogos recentes ou pouco jogados)
  const [timeToBeat] = await igdb
    .query<IgdbTimeToBeat[]>(
      'game_time_to_beats',
      `fields hastily,normally,completely,count; where game_id = ${id};`,
    )
    .catch(() => {
      partial = true;
      return [] as IgdbTimeToBeat[];
    });

  // Mesma saga: só jogos principais (game_type 0), por ordem de lançamento
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
  // O Map guarda a ordem de entrada: a primeira chave é a mais antiga
  if (cache.size >= CACHE_MAX) {
    const [oldest] = cache.keys();
    cache.delete(oldest);
  }
  cache.set(id, { value, at: Date.now() });
  return value;
}
