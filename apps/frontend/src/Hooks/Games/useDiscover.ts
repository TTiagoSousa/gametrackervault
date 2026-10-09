import { useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import { apiMessage } from '../apiMessage';
import type { GameSummary } from './types';

/** Um jogo bem avaliado do IGDB, ao calhas, que ainda não está na estante. */
export const useDiscover = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discover = async (): Promise<GameSummary | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get<GameSummary>(End_Points.Library_Discover_Endpoint());
      return data;
    } catch (err) {
      setError(apiMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, discover };
};
