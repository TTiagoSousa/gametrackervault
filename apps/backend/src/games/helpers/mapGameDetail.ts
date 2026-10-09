// Ficha completa de um jogo: o formato do IGDB e o da app

interface IgdbRef {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
}

export interface IgdbGameDetail extends IgdbRef {
  slug?: string;
  summary?: string;
  storyline?: string;
  url?: string;
  game_type?: { type: string };
  platforms?: { name: string; abbreviation?: string }[];
  genres?: { name: string }[];
  themes?: { name: string }[];
  game_modes?: { name: string }[];
  player_perspectives?: { name: string }[];
  involved_companies?: {
    company?: { name: string };
    developer?: boolean;
    publisher?: boolean;
  }[];
  collections?: { id: number; name: string }[];
  franchises?: { name: string }[];
  total_rating?: number;
  total_rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  screenshots?: { image_id: string }[];
  artworks?: { image_id: string }[];
  videos?: { video_id: string; name?: string }[];
  dlcs?: IgdbRef[];
  expansions?: IgdbRef[];
  standalone_expansions?: IgdbRef[];
  remakes?: IgdbRef[];
  remasters?: IgdbRef[];
  parent_game?: IgdbRef;
}

export interface IgdbTimeToBeat {
  hastily?: number;
  normally?: number;
  completely?: number;
  count?: number;
}

export interface GameRef {
  id: number;
  name: string;
  coverUrl: string | null;
  year: number | null;
}

const image = (size: string, id: string) =>
  `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg`;

const yearOf = (unix?: number) =>
  unix ? new Date(unix * 1000).getUTCFullYear() : null;

const round = (value?: number) =>
  value !== undefined ? Math.round(value) : null;

// Segundos → horas com uma casa decimal (os tempos do IGDB vêm em segundos)
const hours = (seconds?: number) =>
  seconds ? Math.round((seconds / 3600) * 10) / 10 : null;

export const mapRef = (ref: IgdbRef): GameRef => ({
  id: ref.id,
  name: ref.name,
  coverUrl: ref.cover?.image_id
    ? image('t_cover_big', ref.cover.image_id)
    : null,
  year: yearOf(ref.first_release_date),
});

const byYear = (a: GameRef, b: GameRef) =>
  (a.year ?? 9999) - (b.year ?? 9999) || a.name.localeCompare(b.name);

const names = (list?: { name: string }[]) => (list ?? []).map((x) => x.name);

/** Formato do IGDB → formato da app, com os relacionados já separados. */
export function mapGameDetail(
  game: IgdbGameDetail,
  timeToBeat: IgdbTimeToBeat | null,
  series: GameRef[],
) {
  const companies = game.involved_companies ?? [];
  const companyNames = (role: 'developer' | 'publisher') => [
    ...new Set(
      companies
        .filter((c) => c[role] && c.company?.name)
        .map((c) => c.company!.name),
    ),
  ];

  return {
    id: game.id,
    name: game.name,
    slug: game.slug ?? null,
    igdbUrl: game.url ?? null,
    type: game.game_type?.type ?? null,
    coverUrl: game.cover?.image_id
      ? image('t_cover_big_2x', game.cover.image_id)
      : null,
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    year: yearOf(game.first_release_date),
    summary: game.summary ?? null,
    storyline: game.storyline ?? null,
    platforms: (game.platforms ?? []).map((p) => p.name),
    genres: names(game.genres),
    themes: names(game.themes),
    modes: names(game.game_modes),
    perspectives: names(game.player_perspectives),
    developers: companyNames('developer'),
    publishers: companyNames('publisher'),
    series: names(game.collections),
    franchises: names(game.franchises),
    ratings: {
      total: round(game.total_rating),
      totalCount: game.total_rating_count ?? 0,
      critics: round(game.aggregated_rating),
      criticsCount: game.aggregated_rating_count ?? 0,
      users: round(game.rating),
      usersCount: game.rating_count ?? 0,
    },
    // Tempos médios dos jogadores do IGDB, em horas: só a história principal,
    // principal + extras, e 100%
    timeToBeat: timeToBeat
      ? {
          main: hours(timeToBeat.hastily),
          mainExtras: hours(timeToBeat.normally),
          completionist: hours(timeToBeat.completely),
          count: timeToBeat.count ?? 0,
        }
      : null,
    screenshots: (game.screenshots ?? [])
      .slice(0, 12)
      .map((s) => image('t_screenshot_big', s.image_id)),
    videos: (game.videos ?? []).slice(0, 4).map((v) => ({
      youtubeId: v.video_id,
      name: v.name ?? null,
    })),
    parentGame: game.parent_game ? mapRef(game.parent_game) : null,
    dlcs: (game.dlcs ?? []).map(mapRef).sort(byYear),
    expansions: [
      ...(game.expansions ?? []),
      ...(game.standalone_expansions ?? []),
    ]
      .map(mapRef)
      .sort(byYear),
    otherVersions: [...(game.remakes ?? []), ...(game.remasters ?? [])]
      .map(mapRef)
      .sort(byYear),
    sameSeries: series,
  };
}

export type GameDetail = ReturnType<typeof mapGameDetail>;
