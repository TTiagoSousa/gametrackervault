import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { GameDetail } from './detailTypes';

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

const messageOf = (err: ApiError) => {
  const message = err.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? err.message ?? 'error';
};

/** A ficha de um jogo (GET /games/:id). Muda de jogo quando o id muda. */
export const useGameDetail = (id: number) => {
  const [state, setState] = useState<{ id: number; game: GameDetail | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    http
      .get<GameDetail>(End_Points.Game_Detail_Endpoint(id))
      .then(({ data }) => {
        if (!cancelled) setState({ id, game: data, error: null });
      })
      .catch((err: ApiError) => {
        if (!cancelled) setState({ id, game: null, error: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Um resultado de outro jogo não conta — é o "a carregar" ao navegar entre jogos
  const current = state?.id === id ? state : null;
  return { game: current?.game ?? null, error: current?.error ?? null, loading: !current };
};
