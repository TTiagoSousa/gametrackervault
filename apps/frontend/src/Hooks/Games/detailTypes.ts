// Shapes of GET /games/:id and the /library routes

export interface GameRef {
  id: number;
  name: string;
  coverUrl: string | null;
  year: number | null;
}

export interface GameDetail {
  id: number;
  name: string;
  slug: string | null;
  igdbUrl: string | null;
  type: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  year: number | null;
  summary: string | null;
  storyline: string | null;
  platforms: string[];
  genres: string[];
  themes: string[];
  modes: string[];
  perspectives: string[];
  developers: string[];
  publishers: string[];
  series: string[];
  franchises: string[];
  ratings: {
    total: number | null;
    totalCount: number;
    critics: number | null;
    criticsCount: number;
    users: number | null;
    usersCount: number;
  };
  // Average times in hours (null when IGDB doesn't have enough data)
  timeToBeat: {
    main: number | null;
    mainExtras: number | null;
    completionist: number | null;
    count: number;
  } | null;
  screenshots: string[];
  videos: { youtubeId: string; name: string | null }[];
  parentGame: GameRef | null;
  dlcs: GameRef[];
  expansions: GameRef[];
  otherVersions: GameRef[];
  sameSeries: GameRef[];
}

// Shelf statuses — the order is the display order in the panel
export const LIBRARY_STATUSES = [
  'PLAYING',
  'PAUSED',
  'PLAN_TO_PLAY',
  'FINISHED_MAIN',
  'FINISHED_EXTRAS',
  'COMPLETED_100',
  'DROPPED',
] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

// The Home shelves, in this order; each status goes to one of them
export const SHELVES = ['playing', 'done', 'later', 'dropped'] as const;
export type Shelf = (typeof SHELVES)[number];
export const SHELF_OF: Record<LibraryStatus, Shelf> = {
  PLAYING: 'playing',
  PAUSED: 'playing',
  FINISHED_MAIN: 'done',
  FINISHED_EXTRAS: 'done',
  COMPLETED_100: 'done',
  PLAN_TO_PLAY: 'later',
  DROPPED: 'dropped',
};

export interface LibraryEntry {
  gameId: number;
  status: LibraryStatus;
  hoursPlayed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  game: GameRef & { platforms: string[] };
}

export interface LibraryEntryInput {
  status: LibraryStatus;
  hoursPlayed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  rating: number | null;
  notes: string | null;
}
