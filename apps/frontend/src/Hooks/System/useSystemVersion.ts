import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "../../i18n";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { errorMessage, type VersionOverview } from "./types";

/** Installed version, latest release and whether an update is available — for the Admin card. */
export const useSystemVersion = () => {
  const [overview, setOverview] = useState<VersionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVersion = async () => {
    setLoading(true);
    try {
      const response = await http.get<VersionOverview>(End_Points.System_Version_Endpoint(), {
        params: { lang: currentLanguage() },
        withCredentials: true,
      });
      setOverview(response.data);
      setError('');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // The latest version's notes come in the UI language: when the language changes, fetch again.
  const { i18n } = useTranslation();
  useEffect(() => {
    fetchVersion();
  }, [i18n.language]);

  return { overview, loading, error, fetchVersion };
};
