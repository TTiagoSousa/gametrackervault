import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Admin.scss';
import { useUsers } from '../../../Hooks/Admin/useUsers';
import Admin_Create_User_Modal from '../../../Components/Modals/Admin_Create_User_Modal/Admin_Create_User_Modal';
import Version_Card from '../../../Components/Version_Card/Version_Card';
import { dateLocale } from '../../../i18n';
import * as Icon from '../../../Imports/icons';

const Admin = () => {
  const { t } = useTranslation('admin');
  const { users, fetchUsers } = useUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className='Admin'>
      <header>
        <div className='Right_Side'>
          <span>{t('title')}</span>
        </div>

        <div className='Left_Side'>
          <button onClick={() => setIsCreateOpen(true)}>
            <Icon.Plus />
            <span>{t('users.new')}</span>
          </button>
        </div>
      </header>

      {/* Versão instalada e atualizações. */}
      <Version_Card />

      <div className='Admin_List'>
        <div className='Admin_Row Admin_Row_Head'>
          <span>{t('users.username')}</span>
          <span>{t('users.role')}</span>
          <span>{t('users.createdAt')}</span>
        </div>

        {users.map((user) => (
          <div key={user.id} className='Admin_Row'>
            <span className='Admin_Row_Username'>
              <span className='Admin_Avatar' aria-hidden='true'>{user.username.charAt(0).toUpperCase()}</span>
              {user.username}
            </span>
            <span className={`Admin_Row_Role${user.role === 'ADMIN' ? ' admin' : ''}`}>
              {t(`users.roles.${user.role === 'ADMIN' ? 'ADMIN' : 'USER'}`)}
            </span>
            <span className='Admin_Row_Date'>{new Date(user.createdAt).toLocaleDateString(dateLocale())}</span>
          </div>
        ))}
      </div>

      {isCreateOpen && (
        <Admin_Create_User_Modal
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

export default Admin;
