// What IGDB returns for a game, with the fields requested in GAME_FIELDS
export interface IgdbGame {
  id: number;
  name: string;
  slug?: string;
  cover?: { image_id: string };
  first_release_date?: number;
  platforms?: { name: string; abbreviation?: string }[];
  genres?: { name: string }[];
  total_rating?: number;
  total_rating_count?: number;
  game_type?: { type: string };
}

export interface GameSummary {
  id: number;
  name: string;
  slug: string | null;
  coverUrl: string | null;
  year: number | null;
  platforms: string[];
  genres: string[];
  rating: number | null;
  ratingCount: number;
  type: string | null;
}

// Covers come from IGDB's CDN; t_cover_big is 264×374, enough for the grid
const coverUrl = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;

/** IGDB format → app format, without nested fields or Unix time. */
export function mapGame(game: IgdbGame): GameSummary {
  return {
    id: game.id,
    name: game.name,
    slug: game.slug ?? null,
    coverUrl: game.cover?.image_id ? coverUrl(game.cover.image_id) : null,
    year: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    platforms: (game.platforms ?? []).map((p) => p.abbreviation || p.name),
    genres: (game.genres ?? []).map((g) => g.name),
    rating:
      game.total_rating !== undefined ? Math.round(game.total_rating) : null,
    ratingCount: game.total_rating_count ?? 0,
    type: game.game_type?.type ?? null,
  };
}
