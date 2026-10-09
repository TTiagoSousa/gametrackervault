import { NotFoundException } from '@nestjs/common';
import { IgdbClient } from '../igdb/igdb.client';
import { GAME_FIELDS } from './buildSearchQuery';
import { IgdbGame, mapGame } from './mapGame';

// Só jogos principais (game_type 0) já lançados, bem avaliados por bastante gente
// e com capa: um "ao calhas" que vale a pena
const MIN_RATING = 75;
const MIN_RATINGS = 40;

// O IGDB não aceita offsets acima disto
const MAX_OFFSET = 9_999;

/**
 * Um jogo ao calhas do catálogo do IGDB, fora dos que o utilizador já tem na
 * estante (`exclude`). Conta quantos há com os critérios e salta para um ao
 * acaso.
 */
export async function getRandomGame(exclude: number[], igdb: IgdbClient) {
  const now = Math.floor(Date.now() / 1000);
  const conditions = [
    'game_type = 0',
    `total_rating >= ${MIN_RATING}`,
    `total_rating_count >= ${MIN_RATINGS}`,
    'cover != null',
    `first_release_date < ${now}`,
    exclude.length ? `id != (${exclude.join(',')})` : null,
  ].filter(Boolean);
  const where = conditions.join(' & ');

  const { count } = await igdb.query<{ count: number }>(
    'games/count',
    `where ${where};`,
  );
  if (!count) throw new NotFoundException('Não há jogos para sugerir.');

  const offset = Math.floor(Math.random() * Math.min(count, MAX_OFFSET + 1));
  const [game] = await igdb.query<IgdbGame[]>(
    'games',
    `fields ${GAME_FIELDS}; where ${where}; sort id asc; limit 1; offset ${offset};`,
  );
  if (!game) throw new NotFoundException('Não há jogos para sugerir.');
  return mapGame(game);
}
