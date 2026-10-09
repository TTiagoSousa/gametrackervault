import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import type { LibraryEntry, LibraryStatus } from './detailTypes';

export interface LibraryList {
  items: LibraryEntry[];
  counts: Record<LibraryStatus, number>;
  total: number;
}

/** A estante inteira do utilizador (GET /library), para o Início. */
export const useLibrary = () => {
  const [library, setLibrary] = useState<LibraryList | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    http
      .get<LibraryList>(End_Points.Library_Endpoint())
      .then(({ data }) => {
        if (!cancelled) setLibrary(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { library, error };
};
