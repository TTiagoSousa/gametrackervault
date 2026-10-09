import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import { useAlert } from '../../Contexts/Alert_Context';
import i18n from '../../i18n';

export interface IgdbStatus {
  configured: boolean;
  // Guardado mas impossível de decifrar (a TOKEN_ENCRYPTION_KEY mudou ou falta)
  unreadable: boolean;
  clientId: string | null;
  // Só os últimos 4 caracteres — o secret inteiro nunca vem do backend
  secretHint: string | null;
  updatedAt: string | null;
}

type TestResult = { ok: true } | { ok: false; reason: 'not-configured' | 'unreadable' | 'rejected' | 'unreachable' };

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

const messageOf = (err: unknown) => {
  const e = err as ApiError;
  const message = e.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? e.message ?? i18n.t('common:errors.generic');
};

/** Credenciais do IGDB da instalação (Admin → Integrações). */
export const useIgdbIntegration = () => {
  const [status, setStatus] = useState<IgdbStatus | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null);
  const { setAlert } = useAlert();

  useEffect(() => {
    let cancelled = false;
    http
      .get<IgdbStatus>(End_Points.Integration_Igdb_Endpoint())
      .then(({ data }) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) setAlert({ open: true, message: messageOf(err), type: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [setAlert]);

  const save = async (clientId: string, clientSecret: string) => {
    setBusy('save');
    try {
      const { data } = await http.put<IgdbStatus>(End_Points.Integration_Igdb_Endpoint(), {
        clientId: clientId.trim(),
        ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
      });
      setStatus(data);
      setAlert({ open: true, message: i18n.t('admin:igdb.saved'), type: 'success' });
      return true;
    } catch (err) {
      setAlert({ open: true, message: messageOf(err), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    try {
      const { data } = await http.post<TestResult>(End_Points.Integration_Igdb_Test_Endpoint());
      if (data.ok) setAlert({ open: true, message: i18n.t('admin:igdb.testOk'), type: 'success' });
      else setAlert({ open: true, message: i18n.t(`admin:igdb.testFail.${data.reason}`), type: 'error' });
    } catch (err) {
      setAlert({ open: true, message: messageOf(err), type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      const { data } = await http.delete<IgdbStatus>(End_Points.Integration_Igdb_Endpoint());
      setStatus(data);
      setAlert({ open: true, message: i18n.t('admin:igdb.removed'), type: 'success' });
    } catch (err) {
      setAlert({ open: true, message: messageOf(err), type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return { status, busy, save, test, remove };
};
