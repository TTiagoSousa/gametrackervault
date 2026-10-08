import { useEffect, useState } from "react";
import { End_Points } from "../../Service/endPoints";
import i18n from "../../i18n";
import http from "../../Service/httpService";
import type { UserRole } from "../../Contexts/Auth_Context";

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await http.get(End_Points.Admin_Users_Endpoint(), {
        withCredentials: true,
      });
      setUsers(response.data);
      setError('');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || i18n.t("common:errors.generic");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, fetchUsers };
};
