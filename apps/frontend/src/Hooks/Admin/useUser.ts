import { useState } from "react";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { useAlert } from "../../Contexts/Alert_Context";
import type { UserRole } from "../../Contexts/Auth_Context";
import i18n from '../../i18n';

export interface CreateUserPayload {
  username: string;
  password: string;
  role?: UserRole;
}

export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const { setAlert } = useAlert();

  const createUser = async (data: CreateUserPayload) => {
    setLoading(true);
    try {
      await http.post(End_Points.Admin_Users_Endpoint(), data, { withCredentials: true });
      setAlert({ open: true, message: i18n.t('admin:createUser.created'), type: 'success' });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || i18n.t("common:errors.generic");
      setAlert({ open: true, message: msg, type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading };
};
