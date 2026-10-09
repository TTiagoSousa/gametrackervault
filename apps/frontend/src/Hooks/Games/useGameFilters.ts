import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { GameFilters } from './types';

const STORAGE_KEY = 'game-filters:v1';
// Dentro desta janela nem se pergunta ao servidor (voltar à pesquisa é instantâneo)
const FRESH_MS = 60 * 60 * 1000;

// A última lista: em memória (a sessão) e no browser (entre visitas)
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
    // sem localStorage fica só a memória desta sessão
  }
};

/**
 * As opções de cada filtro (plataformas, géneros, …). Mudam raramente, por isso
 * a pesquisa abre logo com a última lista guardada (memória ou browser) e
 * renova-a em segundo plano; só a primeira visita de sempre espera pelo servidor.
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
        // Com uma lista guardada, um erro na renovação não estraga nada
        if (!cancelled && !memory) setError(err.response?.data?.message ?? err.message ?? 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { filters, error };
};
