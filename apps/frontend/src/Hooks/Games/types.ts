// Shapes returned by GET /games/search and GET /games/filters

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

export interface GameSearchPage {
  items: GameSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterOption {
  id: number;
  name: string;
}

export interface GameFilters {
  platforms: FilterOption[];
  genres: FilterOption[];
  themes: FilterOption[];
  modes: FilterOption[];
  perspectives: FilterOption[];
  types: FilterOption[];
}

// Filters that are id lists — the name is the URL and API parameter name
export const LIST_FILTERS = ['platforms', 'genres', 'themes', 'modes', 'perspectives', 'types'] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export const SORTS = ['popular', 'rating', 'newest', 'oldest', 'name'] as const;
export type Sort = (typeof SORTS)[number];
