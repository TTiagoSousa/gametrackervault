import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Admin_Create_User_Modal.scss';
import Global_Input from '../../Inputs/Global_Input/Global_Input';
import Global_Dropdown from '../../Inputs/Global_Dropdown/Global_Dropdown';
import { useUser } from '../../../Hooks/Admin/useUser';
import type { AdminUser } from '../../../Hooks/Admin/useUsers';
import type { UserRole } from '../../../Contexts/Auth_Context';
import { ROLES } from '@gametracker/shared';

interface Admin_Create_User_Modal_Props {
  // With a user, edits it; without one, creates a new one
  user?: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create or edit an account (Admin). When editing, the password is blank and only
 * changes if a new one is typed.
 */
const Admin_Create_User_Modal = ({ user, onClose, onSaved }: Admin_Create_User_Modal_Props) => {
  const editing = Boolean(user);
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'USER');
  const { createUser, updateUser, loading } = useUser();
  const { t } = useTranslation('admin');
  const roleOptions = ROLES.map((value) => ({ value, label: t(`users.roles.${value}`) }));

  const canSave = username.trim().length >= 3 && (editing ? password.length === 0 || password.length >= 8 : password.length >= 8);

  const handleSave = async () => {
    if (!canSave) return;

    const success = user
      ? await updateUser(user.id, {
          username: username.trim(),
          role,
          ...(password ? { password } : {}),
        })
      : await createUser({ username: username.trim(), password, role });
    if (success) onSaved();
  };

  return (
    <div className="Admin_Create_User_Modal_Overlay" onClick={onClose}>
      <div className="Admin_Create_User_Modal" onClick={(e) => e.stopPropagation()}>
        <span className="Admin_Create_User_Modal_Title">{editing ? t('editUser.title') : t('createUser.title')}</span>

        <div className="Admin_Create_User_Modal_Field">
          <label htmlFor="admin-user-username">{t('createUser.username')}</label>
          <Global_Input
            id="admin-user-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('createUser.usernamePlaceholder')}
          />
        </div>

        <div className="Admin_Create_User_Modal_Field">
          <label htmlFor="admin-user-password">{editing ? t('editUser.newPassword') : t('createUser.password')}</label>
          <Global_Input
            id="admin-user-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={editing ? t('editUser.passwordPlaceholder') : t('createUser.passwordPlaceholder')}
          />
        </div>

        <div className="Admin_Create_User_Modal_Field">
          <label>{t('createUser.role')}</label>
          <Global_Dropdown
            value={role}
            options={roleOptions}
            onChange={(value) => setRole(value as UserRole)}
            searchable={false}
          />
        </div>

        <div className="Admin_Create_User_Modal_Actions">
          <button className="Cancel_Button" onClick={onClose} disabled={loading}>
            {t('common:actions.cancel')}
          </button>
          <button className="Save_Button" onClick={handleSave} disabled={loading || !canSave}>
            {t('common:actions.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin_Create_User_Modal;
