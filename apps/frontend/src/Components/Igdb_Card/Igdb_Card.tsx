import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIgdbIntegration } from '../../Hooks/Admin/useIgdbIntegration';
import { dateLocale } from '../../i18n';
import './Igdb_Card.scss';

const TWITCH_CONSOLE = 'https://dev.twitch.tv/console/apps';

/**
 * Credenciais do IGDB da instalação, na página Admin. Uma chave serve todos os
 * utilizadores; o secret guardado nunca volta ao browser (só os 4 últimos
 * caracteres, para se saber qual está lá).
 */
const Igdb_Card = () => {
  const { t } = useTranslation('admin');
  const { status, busy, save, test, remove } = useIgdbIntegration();
  // O Client ID começa com o que está guardado; enquanto não se escreve nada,
  // vale o guardado
  const [clientIdDraft, setClientIdDraft] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const clientId = clientIdDraft ?? status?.clientId ?? '';
  const configured = Boolean(status?.configured);
  // Com o secret ilegível é preciso escrever um novo; senão, em branco mantém o guardado
  const secretRequired = !configured || Boolean(status?.unreadable);
  const canSave = clientId.trim().length > 0 && (!secretRequired || clientSecret.trim().length > 0) && !busy;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    if (await save(clientId, clientSecret)) {
      setClientSecret('');
      setClientIdDraft(null);
    }
  };

  return (
    <section className='Igdb_Card'>
      <div className='Igdb_Card_Head'>
        <div>
          <h2 className='Igdb_Card_Title'>{t('igdb.title')}</h2>
          <p className='Igdb_Card_Description'>{t('igdb.description')}</p>
        </div>
        {status && (
          <span className={`Igdb_Card_Status${configured ? ' on' : ''}`}>
            {configured ? t('igdb.connected') : t('igdb.notConfigured')}
          </span>
        )}
      </div>

      {status?.unreadable && <p className='Igdb_Card_Warning'>{t('igdb.unreadable')}</p>}

      <form className='Igdb_Card_Form' onSubmit={(e) => void onSubmit(e)}>
        <label>
          <span>{t('igdb.clientId')}</span>
          <input
            type='text'
            autoComplete='off'
            spellCheck={false}
            value={clientId}
            onChange={(e) => setClientIdDraft(e.target.value)}
          />
        </label>

        <label>
          <span>{t('igdb.clientSecret')}</span>
          <input
            type='password'
            autoComplete='new-password'
            spellCheck={false}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={configured && !status?.unreadable && status?.secretHint ? t('igdb.secretKept', { hint: status.secretHint }) : ''}
          />
        </label>

        <div className='Igdb_Card_Actions'>
          <button type='submit' className='Igdb_Card_Save' disabled={!canSave}>
            {busy === 'save' ? t('igdb.saving') : t('igdb.save')}
          </button>

          {configured && (
            <button type='button' className='Igdb_Card_Button' disabled={Boolean(busy)} onClick={() => void test()}>
              {busy === 'test' ? t('igdb.testing') : t('igdb.test')}
            </button>
          )}

          {configured && (confirmRemove ? (
            <span className='Igdb_Card_Confirm'>
              <button type='button' className='Igdb_Card_Danger' disabled={Boolean(busy)} onClick={() => { setConfirmRemove(false); void remove(); }}>
                {t('igdb.confirmRemove')}
              </button>
              <button type='button' className='Igdb_Card_Link' onClick={() => setConfirmRemove(false)}>
                {t('igdb.cancel')}
              </button>
            </span>
          ) : (
            <button type='button' className='Igdb_Card_Link danger' disabled={Boolean(busy)} onClick={() => setConfirmRemove(true)}>
              {t('igdb.remove')}
            </button>
          ))}
        </div>
      </form>

      <p className='Igdb_Card_Help'>
        {t('igdb.help')}{' '}
        <a href={TWITCH_CONSOLE} target='_blank' rel='noreferrer'>{t('igdb.helpLink')}</a>
        {status?.updatedAt && (
          <span className='Igdb_Card_Updated'>
            {t('igdb.updatedAt', { date: new Date(status.updatedAt).toLocaleDateString(dateLocale()) })}
          </span>
        )}
      </p>
    </section>
  );
};

export default Igdb_Card;
