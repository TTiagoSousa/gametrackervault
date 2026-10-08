import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "../../i18n";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { errorMessage, type ReleaseList } from "./types";

/** Todas as releases, da mais recente para a mais antiga. `refresh` força o fetch das tags. */
export const useReleases = () => {
  const [list, setList] = useState<ReleaseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReleases = async (refresh = false) => {
    setLoading(true);
    try {
      const response = await http.get<ReleaseList>(End_Points.System_Releases_Endpoint(), {
        params: { lang: currentLanguage(), ...(refresh ? { refresh: 1 } : {}) },
        withCredentials: true,
      });
      setList(response.data);
      setError('');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // As notas vêm na língua da interface: muda a língua, volta a pedir.
  const { i18n } = useTranslation();
  useEffect(() => {
    fetchReleases();
  }, [i18n.language]);

  return { list, loading, error, fetchReleases };
};
