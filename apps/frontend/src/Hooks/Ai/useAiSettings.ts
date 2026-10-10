import { useEffect, useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import { useAlert } from '../../Contexts/Alert_Context';
import i18n from '../../i18n';
import { apiMessage } from '../apiMessage';

export interface AiSettings {
  provider: 'ANTHROPIC';
  configured: boolean;
  // Only the last 4 characters — the full key never returns to the browser
  keyHint: string | null;
  model: string;
  updatedAt: string | null;
}

export interface AiModel {
  id: string;
  name: string;
  createdAt: string | null;
}

/** This user's assistant key and model. */
export const useAiSettings = () => {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [models, setModels] = useState<AiModel[] | null>(null);
  const [busy, setBusy] = useState<'save' | 'models' | 'remove' | null>(null);
  const { setAlert } = useAlert();

  useEffect(() => {
    let cancelled = false;
    http
      .get<AiSettings>(End_Points.Ai_Settings_Endpoint())
      .then(({ data }) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The models the key has access to (the typed one or, failing that, the stored one)
  const loadModels = async (apiKey?: string) => {
    setBusy('models');
    try {
      const { data } = await http.post<AiModel[]>(End_Points.Ai_Models_Endpoint(), apiKey ? { apiKey } : {});
      setModels(data);
      return true;
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = async (model: string, apiKey?: string) => {
    setBusy('save');
    try {
      const { data } = await http.put<AiSettings>(End_Points.Ai_Settings_Endpoint(), {
        model,
        ...(apiKey ? { apiKey } : {}),
      });
      setSettings(data);
      setAlert({ open: true, message: i18n.t('assistant:settings.saved'), type: 'success' });
      return true;
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      const { data } = await http.delete<AiSettings>(End_Points.Ai_Settings_Endpoint());
      setSettings(data);
      setModels(null);
      setAlert({ open: true, message: i18n.t('assistant:settings.removed'), type: 'success' });
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return { settings, failed, models, busy, loadModels, save, remove };
};
