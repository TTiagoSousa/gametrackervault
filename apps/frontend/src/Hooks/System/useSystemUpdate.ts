import { useCallback, useEffect, useRef, useState } from "react";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { errorMessage, type UpdateStatus, type VersionOverview } from "./types";

const POLL_MS = 2000;

/**
 * Pede uma atualização e acompanha-a até ao fim. A meio, o backend reinicia: os
 * pedidos falham durante uns segundos e isso é normal — conta como "a reiniciar".
 * Acaba quando o estado é success e o backend já responde com a versão pedida.
 */
export const useSystemUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);
  const target = useRef<string | null>(null);
  // O status.json da atualização anterior: enquanto o atualizador não escreve o novo,
  // é ele que se lê, e um "failed" antigo não pode passar por resultado desta.
  const previousRun = useRef<string | null>(null);

  // O próximo ciclo chama a versão atual do poll através de uma ref (o poll não se
  // pode referir a si próprio na sua definição).
  const pollRef = useRef<() => void>(() => {});
  const schedule = () => {
    timer.current = window.setTimeout(() => pollRef.current(), POLL_MS);
  };
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const poll = useCallback(async () => {
    try {
      const response = await http.get<UpdateStatus>(End_Points.System_Update_Status_Endpoint(), {
        withCredentials: true,
      });
      let next = response.data;
      if (previousRun.current && next.startedAt === previousRun.current) {
        next = { ...next, state: 'queued', target: target.current, step: null, message: null, log: [] };
      }
      setStatus(next);
      setRestarting(false);

      if (next.state === 'failed') {
        stop();
        return;
      }
      if (next.state === 'success') {
        // Confirma que quem responde já é o backend novo antes de recarregar.
        const version = await http.get<VersionOverview>(End_Points.System_Version_Endpoint(), {
          withCredentials: true,
        });
        if (!target.current || version.data.installed.version === target.current) {
          stop();
          setDone(true);
          return;
        }
      }
    } catch {
      // O backend está a reiniciar.
      setRestarting(true);
    }
    schedule();
  }, []);

  useEffect(() => {
    pollRef.current = () => void poll();
  }, [poll]);

  const start = async (version: string) => {
    setError('');
    setDone(false);
    target.current = version;
    try {
      const before = await http.get<UpdateStatus>(End_Points.System_Update_Status_Endpoint(), {
        withCredentials: true,
      });
      previousRun.current = before.data.startedAt;
      const response = await http.post<UpdateStatus>(
        End_Points.System_Update_Endpoint(),
        { version },
        { withCredentials: true },
      );
      setStatus(response.data);
      schedule();
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    }
  };

  /** Retoma o acompanhamento de uma atualização que já estava a correr. */
  const follow = (version: string | null) => {
    target.current = version;
    previousRun.current = null;
    stop();
    void poll();
  };

  useEffect(() => stop, []);

  return { status, restarting, done, error, start, follow };
};
