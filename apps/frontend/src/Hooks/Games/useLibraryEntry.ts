import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import { useAlert } from '../../Contexts/Alert_Context';
import i18n from '../../i18n';
import type { LibraryEntry, LibraryEntryInput } from './detailTypes';

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

const messageOf = (err: unknown) => {
  const e = err as ApiError;
  const message = e.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? e.message ?? i18n.t('common:errors.generic');
};

/** A entrada de um jogo na estante do utilizador: ler, guardar e remover. */
export const useLibraryEntry = (gameId: number) => {
  // "failed": não se conseguiu saber se o jogo está na estante. O painel fica
  // bloqueado — gravar por cima apagaria a entrada que lá estiver (o PUT
  // substitui tudo).
  const [state, setState] = useState<{ gameId: number; entry: LibraryEntry | null; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const { setAlert } = useAlert();

  useEffect(() => {
    let cancelled = false;
    http
      .get<{ entry: LibraryEntry | null }>(End_Points.Library_Entry_Endpoint(gameId))
      .then(({ data }) => {
        if (!cancelled) setState({ gameId, entry: data.entry, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ gameId, entry: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, attempt]);

  const save = async (input: LibraryEntryInput) => {
    setBusy('save');
    try {
      const { data } = await http.put<{ entry: LibraryEntry }>(End_Points.Library_Entry_Endpoint(gameId), input);
      setState({ gameId, entry: data.entry, failed: false });
      setAlert({ open: true, message: i18n.t('library:saved'), type: 'success' });
      return true;
    } catch (err) {
      setAlert({ open: true, message: messageOf(err), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await http.delete(End_Points.Library_Entry_Endpoint(gameId));
      setState({ gameId, entry: null, failed: false });
      setAlert({ open: true, message: i18n.t('library:removed'), type: 'success' });
      return true;
    } catch (err) {
      setAlert({ open: true, message: messageOf(err), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const current = state?.gameId === gameId ? state : null;
  return {
    entry: current?.entry ?? null,
    loading: !current,
    failed: current?.failed ?? false,
    retry: () => setAttempt((value) => value + 1),
    busy,
    save,
    remove,
  };
};
