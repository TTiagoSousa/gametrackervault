import { useCallback, useEffect, useRef, useState } from "react";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { errorMessage, type UpdateStatus, type VersionOverview } from "./types";

const POLL_MS = 2000;

/**
 * Requests an update and follows it to the end. Midway, the backend restarts:
 * requests fail for a few seconds and that is normal — it counts as "restarting".
 * Done when the state is success and the backend responds with the requested version.
 */
export const useSystemUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);
  const target = useRef<string | null>(null);
  // The previous update's status.json: until the updater writes the new one,
  // that is what gets read, and an old "failed" must not pass for this one's result.
  const previousRun = useRef<string | null>(null);

  // The next cycle calls the current version of poll through a ref (poll cannot
  // refer to itself in its own definition).
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
        // Confirms the new backend is the one responding before reloading.
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
      // The backend is restarting.
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

  /** Resumes following an update that was already running. */
  const follow = (version: string | null) => {
    target.current = version;
    previousRun.current = null;
    stop();
    void poll();
  };

  useEffect(() => stop, []);

  return { status, restarting, done, error, start, follow };
};
