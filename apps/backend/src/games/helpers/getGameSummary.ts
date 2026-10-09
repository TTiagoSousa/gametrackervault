import { NotFoundException } from '@nestjs/common';
import { IgdbClient } from '../igdb/igdb.client';
import { GAME_FIELDS } from './buildSearchQuery';
import { IgdbGame } from './mapGame';

export interface GameSnapshot {
  igdbId: number;
  name: string;
  slug: string | null;
  coverImageId: string | null;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
}

/**
 * O mínimo de um jogo para o guardar na estante (tabela Game): nome, capa, ano,
 * plataformas e géneros. Vem sempre do IGDB, nunca do browser.
 */
export async function getGameSummary(
  id: number,
  igdb: IgdbClient,
): Promise<GameSnapshot> {
  const [game] = await igdb.query<IgdbGame[]>(
    'games',
    `fields ${GAME_FIELDS}; where id = ${id};`,
  );
  if (!game) throw new NotFoundException('Jogo não encontrado no IGDB.');
  return {
    igdbId: game.id,
    name: game.name,
    slug: game.slug ?? null,
    coverImageId: game.cover?.image_id ?? null,
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    platforms: (game.platforms ?? []).map((p) => p.abbreviation || p.name),
    genres: (game.genres ?? []).map((g) => g.name),
  };
}
