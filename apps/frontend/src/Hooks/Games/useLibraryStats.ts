import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { LibraryStatus } from './detailTypes';

export interface StatsGame {
  gameId: number;
  name: string;
  coverUrl: string | null;
  status: LibraryStatus;
}

export interface LibraryStats {
  total: number;
  counts: Record<LibraryStatus, number>;
  finished: number;
  completionRate: number | null;
  hours: {
    total: number;
    logged: number;
    estimated: number;
    loggedGames: number;
    estimatedGames: number;
    missingGames: number;
  };
  backlog: { games: number; hours: number; missingGames: number };
  rating: { average: number | null; rated: number; distribution: number[] };
  finishedPerYear: { year: number; count: number }[];
  genres: { name: string; count: number }[];
  topRated: (StatsGame & { rating: number })[];
  mostPlayed: (StatsGame & { hours: number; estimated: boolean })[];
  factsComplete: boolean;
}

/** Shelf statistics (GET /library/stats). */
export const useLibraryStats = () => {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    http
      .get<LibraryStats>(End_Points.Library_Stats_Endpoint())
      .then(({ data }) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, failed };
};
