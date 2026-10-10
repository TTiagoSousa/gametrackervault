import { useState } from "react";
import { End_Points } from "../../Service/endPoints";
import http from "../../Service/httpService";
import { useAlert } from "../../Contexts/Alert_Context";
import type { UserRole } from "../../Contexts/Auth_Context";
import i18n from '../../i18n';
import { apiMessage } from '../apiMessage';

export interface CreateUserPayload {
  username: string;
  password: string;
  role?: UserRole;
}

// When editing everything is optional: the password only changes if filled in
export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: UserRole;
}

/** Admin actions on accounts: create, edit and delete. */
export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const { setAlert } = useAlert();

  const run = async (request: () => Promise<unknown>, successKey: string) => {
    setLoading(true);
    try {
      await request();
      setAlert({ open: true, message: i18n.t(successKey), type: 'success' });
      return true;
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createUser = (data: CreateUserPayload) =>
    run(() => http.post(End_Points.Admin_Users_Endpoint(), data), 'admin:createUser.created');

  const updateUser = (id: string, data: UpdateUserPayload) =>
    run(() => http.patch(End_Points.Admin_User_Endpoint(id), data), 'admin:editUser.saved');

  const deleteUser = (id: string) =>
    run(() => http.delete(End_Points.Admin_User_Endpoint(id)), 'admin:users.deleted');

  return { createUser, updateUser, deleteUser, loading };
};
