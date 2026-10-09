import { useCallback, useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { GameSearchPage, GameSummary } from './types';

interface SearchState {
  // A pesquisa a que este resultado responde — quando a pesquisa muda, o
  // resultado antigo deixa de contar e isso é o "a carregar"
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
 * Pesquisa de jogos. Recebe os parâmetros já em forma de query string (os mesmos
 * do URL da página) e volta a pesquisar sempre que mudam; "loadMore" acrescenta
 * a página seguinte aos resultados que já lá estão.
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
