import { GamesService } from 'src/games/games.service';
import { ToolDefinition } from '../anthropic/anthropic.client';

/** The tools Claude can use: search IGDB and open game details. */
export const GAME_TOOLS: ToolDefinition[] = [
  {
    name: 'search_games',
    description:
      'Search the IGDB video game database by name. Returns up to 8 matches with their IGDB id, release year, genres, platforms and rating (0–100). Use it to find ids for links or to check facts about games.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Game name or part of it' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_game',
    description:
      'Get details of one game from IGDB by id: summary, genres, themes, platforms, release date, ratings, average time to beat (hours) and related games (DLCs, expansions, same series).',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'IGDB game id' },
      },
      required: ['id'],
    },
  },
];

/** Runs a tool and returns the result as JSON (text) for the model. */
export async function runGameTool(
  name: string,
  input: Record<string, unknown>,
  games: GamesService,
): Promise<string> {
  if (name === 'search_games') {
    const query = (typeof input.query === 'string' ? input.query : '').slice(
      0,
      100,
    );
    const { items } = await games.search({ q: query, pageSize: 8 });
    return JSON.stringify(
      items.map((g) => ({
        id: g.id,
        name: g.name,
        year: g.year,
        type: g.type,
        genres: g.genres,
        platforms: g.platforms.slice(0, 8),
        rating: g.rating,
        ratingCount: g.ratingCount,
      })),
    );
  }

  if (name === 'get_game') {
    const id = Number(input.id);
    if (!Number.isInteger(id) || id <= 0)
      return JSON.stringify({ error: 'invalid id' });
    const game = await games.detail(id);
    const ref = (list: { id: number; name: string; year: number | null }[]) =>
      list.slice(0, 12).map((g) => ({ id: g.id, name: g.name, year: g.year }));
    return JSON.stringify({
      id: game.id,
      name: game.name,
      summary: game.summary?.slice(0, 1500) ?? null,
      releaseDate: game.releaseDate,
      genres: game.genres,
      themes: game.themes,
      platforms: game.platforms,
      developers: game.developers,
      ratings: game.ratings,
      timeToBeatHours: game.timeToBeat,
      parentGame: game.parentGame,
      expansions: ref(game.expansions),
      dlcs: ref(game.dlcs),
      sameSeries: ref(game.sameSeries),
    });
  }

  return JSON.stringify({ error: `unknown tool ${name}` });
}
