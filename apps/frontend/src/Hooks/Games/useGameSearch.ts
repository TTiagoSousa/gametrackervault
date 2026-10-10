import { useCallback, useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { GameSearchPage, GameSummary } from './types';

interface SearchState {
  // The search this result answers — when the search changes, the
  // old result stops counting and that is the "loading" state
  key: string;
  items: GameSummary[];
  total: number;
  page: number;
  error: string | null;
}

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

const messageOf = (err: ApiError) => {
  const message = err.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? err.message ?? 'error';
};

/**
 * Game search. Takes the parameters already as a query string (the same as
 * the page URL) and searches again whenever they change; "loadMore" appends
 * the next page to the results already there.
 */
export const useGameSearch = (query: string) => {
  const [state, setState] = useState<SearchState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    http
      .get<GameSearchPage>(`${End_Points.Games_Search_Endpoint()}?${query}`)
      .then(({ data }) => {
        if (!cancelled) setState({ key: query, items: data.items, total: data.total, page: data.page, error: null });
      })
      .catch((err: ApiError) => {
        if (!cancelled) setState({ key: query, items: [], total: 0, page: 1, error: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [query, attempt]);

  const current = state?.key === query ? state : null;

  const loadMore = useCallback(async () => {
    if (!current || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams(query);
    params.set('page', String(current.page + 1));
    try {
      const { data } = await http.get<GameSearchPage>(`${End_Points.Games_Search_Endpoint()}?${params.toString()}`);
      setState((previous) =>
        previous && previous.key === query
          ? { ...previous, items: [...previous.items, ...data.items], total: data.total, page: data.page }
          : previous,
      );
    } catch (err) {
      setState((previous) => (previous ? { ...previous, error: messageOf(err as ApiError) } : previous));
    } finally {
      setLoadingMore(false);
    }
  }, [current, loadingMore, query]);

  return {
    items: current?.items ?? [],
    total: current?.total ?? 0,
    error: current?.error ?? null,
    loading: !current,
    hasMore: current ? current.items.length < current.total : false,
    loadingMore,
    loadMore,
    retry: () => setAttempt((value) => value + 1),
  };
};
