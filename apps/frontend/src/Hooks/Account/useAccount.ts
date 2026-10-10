import { useState } from 'react';
import http from '../../Service/httpService';
import { End_Points } from '../../Service/endPoints';
import { useAlert } from '../../Contexts/Alert_Context';
import { useAuth } from '../../Contexts/Auth_Context';
import i18n from '../../i18n';
import { apiMessage } from '../apiMessage';

/** The user's own account: change name and password. */
export const useAccount = () => {
  const [busy, setBusy] = useState<'username' | 'password' | null>(null);
  const { setAlert } = useAlert();
  const { refreshUser } = useAuth();

  const changeUsername = async (username: string) => {
    setBusy('username');
    try {
      await http.patch(End_Points.Account_Endpoint(), { username: username.trim() });
      await refreshUser();
      setAlert({ open: true, message: i18n.t('settings:account.usernameSaved'), type: 'success' });
      return true;
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setBusy('password');
    try {
      await http.put(End_Points.Account_Password_Endpoint(), { currentPassword, newPassword });
      setAlert({ open: true, message: i18n.t('settings:account.passwordSaved'), type: 'success' });
      return true;
    } catch (error) {
      setAlert({ open: true, message: apiMessage(error), type: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  return { busy, changeUsername, changePassword };
};
