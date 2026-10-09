// Formatos devolvidos por GET /games/search e GET /games/filters

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

// Os filtros que são listas de ids — o nome é o do parâmetro no URL e na API
export const LIST_FILTERS = ['platforms', 'genres', 'themes', 'modes', 'perspectives', 'types'] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export const SORTS = ['popular', 'rating', 'newest', 'oldest', 'name'] as const;
export type Sort = (typeof SORTS)[number];
