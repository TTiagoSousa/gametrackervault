import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import { useAccount } from '../../../Hooks/Account/useAccount';
import * as Icon from '../../../Imports/icons';

const MIN_PASSWORD = 8;

/**
 * The user's own account, in a card with two blocks: the name (field and button on the same
 * row) and the password (the current one on top, the new and repeated side by side, the
 * rules ticked off as you type and the button at the end).
 */
const Account_Section = () => {
  const { t } = useTranslation('settings');
  const { username } = useAuth();
  const { busy, changeUsername, changePassword } = useAccount();
  // The name starts as the current one; until something is typed, it stands
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const name = nameDraft ?? username ?? '';
  const nameChanged = name.trim() !== (username ?? '') && name.trim().length >= 3;

  const longEnough = next.length >= MIN_PASSWORD;
  const matches = next.length > 0 && next === confirm;
  const canChangePassword = current.length > 0 && longEnough && matches && busy === null;

  const onName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameChanged || busy) return;
    if (await changeUsername(name)) setNameDraft(null);
  };

  const onPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canChangePassword) return;
    if (await changePassword(current, next)) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setShow(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <section className='Settings_Card' id='account'>
      <header className='Settings_Card_Head'>
        <h2>{t('sections.account')}</h2>
        <p>{t('account.description')}</p>
      </header>

      {/* --- Name --- */}
      <form className='Settings_Block' onSubmit={(e) => void onName(e)}>
        <div className='Settings_Block_Text'>
          <h3>{t('account.usernameTitle')}</h3>
          <p>{t('account.usernameDescription')}</p>
        </div>
        <div className='Settings_Inline'>
          <label className='Settings_Field grow'>
            <span>{t('account.username')}</span>
            <input type='text' autoComplete='username' value={name} onChange={(e) => setNameDraft(e.target.value)} maxLength={32} />
          </label>
          <button type='submit' className='Settings_Save' disabled={!nameChanged || busy !== null}>
            {busy === 'username' ? t('account.saving') : t('account.saveUsername')}
          </button>
        </div>
      </form>

      {/* --- Password --- */}
      <form className='Settings_Block' onSubmit={(e) => void onPassword(e)}>
        <div className='Settings_Block_Text with-action'>
          <div>
            <h3>{t('account.passwordTitle')}</h3>
            <p>{t('account.passwordDescription')}</p>
          </div>
          <button type='button' className='Settings_Show' onClick={() => setShow((value) => !value)} aria-pressed={show}>
            <Icon.Eye />
            {show ? t('account.hidePasswords') : t('account.showPasswords')}
          </button>
        </div>

        {/* The hidden username helps the password manager know which account it is */}
        <input type='text' autoComplete='username' value={username ?? ''} readOnly hidden />

        <div className='Settings_Grid'>
          <label className='Settings_Field'>
            <span>{t('account.currentPassword')}</span>
            <input type={type} autoComplete='current-password' value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <span className='Settings_Grid_Spacer' aria-hidden='true' />
          <label className='Settings_Field'>
            <span>{t('account.newPassword')}</span>
            <input type={type} autoComplete='new-password' value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className='Settings_Field'>
            <span>{t('account.confirmPassword')}</span>
            <input
              type={type}
              autoComplete='new-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={confirm.length > 0 && !matches}
            />
          </label>
        </div>

        <div className='Settings_Footer'>
          <ul className='Settings_Rules' aria-live='polite'>
            <li className={longEnough ? 'ok' : ''}>
              <span className='Settings_Rule_Mark' aria-hidden='true' />
              {t('account.ruleLength', { count: MIN_PASSWORD })}
            </li>
            <li className={matches ? 'ok' : confirm.length > 0 ? 'bad' : ''}>
              <span className='Settings_Rule_Mark' aria-hidden='true' />
              {t('account.ruleMatch')}
            </li>
          </ul>
          <button type='submit' className='Settings_Save' disabled={!canChangePassword}>
            {busy === 'password' ? t('account.saving') : t('account.savePassword')}
          </button>
        </div>
      </form>
    </section>
  );
};

export default Account_Section;
