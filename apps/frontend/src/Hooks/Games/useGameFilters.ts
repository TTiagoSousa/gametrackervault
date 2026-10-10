import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { GameFilters } from './types';

const STORAGE_KEY = 'game-filters:v1';
// Within this window the server isn't even asked (returning to search is instant)
const FRESH_MS = 60 * 60 * 1000;

// The last list: in memory (the session) and in the browser (between visits)
let memory: { value: GameFilters; at: number } | null = null;

const stored = (): { value: GameFilters; at: number } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { value: GameFilters; at: number }) : null;
  } catch {
    return null;
  }
};

const remember = (value: GameFilters) => {
  memory = { value, at: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // without localStorage only this session's memory remains
  }
};

/**
 * The options for each filter (platforms, genres, …). They rarely change, so
 * search opens straight away with the last stored list (memory or browser) and
 * refreshes it in the background; only the very first visit waits for the server.
 */
export const useGameFilters = () => {
  const [filters, setFilters] = useState<GameFilters | null>(() => {
    memory ??= stored();
    return memory?.value ?? null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memory && Date.now() - memory.at < FRESH_MS) return;
    let cancelled = false;
    http
      .get<GameFilters>(End_Points.Games_Filters_Endpoint())
      .then((response) => {
        remember(response.data);
        if (!cancelled) setFilters(response.data);
      })
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        // With a stored list, a refresh error breaks nothing
        if (!cancelled && !memory) setError(err.response?.data?.message ?? err.message ?? 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { filters, error };
};
