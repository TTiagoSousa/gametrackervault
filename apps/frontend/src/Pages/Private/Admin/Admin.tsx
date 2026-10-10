import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Admin.scss';
import { useUsers, type AdminUser } from '../../../Hooks/Admin/useUsers';
import { useUser } from '../../../Hooks/Admin/useUser';
import { useAuth } from '../../../Contexts/Auth_Context';
import Admin_Create_User_Modal from '../../../Components/Modals/Admin_Create_User_Modal/Admin_Create_User_Modal';
import Version_Card from '../../../Components/Version_Card/Version_Card';
import Igdb_Card from '../../../Components/Igdb_Card/Igdb_Card';
import { dateLocale } from '../../../i18n';
import * as Icon from '../../../Imports/icons';

const Admin = () => {
  const { t } = useTranslation('admin');
  const { username: me } = useAuth();
  const { users, fetchUsers } = useUsers();
  const { deleteUser, loading } = useUser();
  // null = closed; 'new' = create; a user = edit them
  const [modal, setModal] = useState<AdminUser | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    setConfirmDelete(null);
    if (await deleteUser(id)) fetchUsers();
  };

  return (
    <div className='Admin'>
      <header>
        <div className='Right_Side'>
          <span>{t('title')}</span>
        </div>

        <div className='Left_Side'>
          <button onClick={() => setModal('new')}>
            <Icon.Plus />
            <span>{t('users.new')}</span>
          </button>
        </div>
      </header>

      {/* Installed version and updates. */}
      <Version_Card />

      {/* IGDB credentials, used by the game search across the whole install */}
      <Igdb_Card />

      <div className='Admin_List'>
        <div className='Admin_Row Admin_Row_Head'>
          <span>{t('users.username')}</span>
          <span>{t('users.role')}</span>
          <span>{t('users.createdAt')}</span>
          <span className='Admin_Row_Actions_Head'>{t('users.actions')}</span>
        </div>

        {users.map((user) => {
          const isMe = user.username === me;
          return (
            <div key={user.id} className='Admin_Row'>
              <span className='Admin_Row_Username'>
                <span className='Admin_Avatar' aria-hidden='true'>{user.username.charAt(0).toUpperCase()}</span>
                {user.username}
                {isMe && <span className='Admin_Row_Me'>{t('users.you')}</span>}
              </span>
              <span className={`Admin_Row_Role${user.role === 'ADMIN' ? ' admin' : ''}`}>
                {t(`users.roles.${user.role === 'ADMIN' ? 'ADMIN' : 'USER'}`)}
              </span>
              <span className='Admin_Row_Date'>{new Date(user.createdAt).toLocaleDateString(dateLocale())}</span>

              {/* Fixed width: the confirmation takes the buttons' place */}
              <span className='Admin_Row_Actions'>
                {confirmDelete === user.id ? (
                  <>
                    <button type='button' className='Admin_Row_Danger' disabled={loading} onClick={() => void onDelete(user.id)}>
                      {t('users.confirmDelete')}
                    </button>
                    <button type='button' className='Admin_Row_Link' onClick={() => setConfirmDelete(null)}>
                      {t('common:actions.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button type='button' className='Admin_Row_Icon' onClick={() => setModal(user)} title={t('users.edit')} aria-label={t('users.edit')}>
                      <Icon.Pencil />
                    </button>
                    <button
                      type='button'
                      className={`Admin_Row_Icon danger${isMe ? ' hidden' : ''}`}
                      onClick={() => setConfirmDelete(user.id)}
                      title={t('users.delete')}
                      aria-label={t('users.delete')}
                      disabled={isMe}
                      aria-hidden={isMe}
                    >
                      <Icon.Trash />
                    </button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {modal && (
        <Admin_Create_User_Modal
          user={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

export default Admin;
