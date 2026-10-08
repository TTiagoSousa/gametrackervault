import './Version_Card.scss';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSystemVersion } from '../../Hooks/System/useSystemVersion';
import { installedLabel } from '../../Hooks/System/types';
import { dateLocale } from '../../i18n';
import Release_Notes from '../Release_Notes/Release_Notes';
import Update_Modal from '../Modals/Update_Modal/Update_Modal';

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Versão instalada, a última release e o botão para atualizar. Vive na página Admin
 * (as rotas /system/* também só respondem a administradores).
 */
const Version_Card = () => {
  const { t } = useTranslation('system');
  const navigate = useNavigate();
  const { overview, loading, error } = useSystemVersion();
  const [chosen, setChosen] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Uma atualização já a correr (pedida noutro separador, por exemplo) abre o progresso.
  const inProgress =
    (overview?.update.state === 'running' || overview?.update.state === 'queued') && overview.update.target
      ? overview.update.target
      : null;
  const updating = chosen
    ? { version: chosen, resume: false }
    : inProgress && !dismissed
      ? { version: inProgress, resume: true }
      : null;
  const closeUpdate = () => {
    setChosen(null);
    setDismissed(true);
  };

  const installed = installedLabel(overview?.installed);
  const latest = overview?.latest;

  return (
    <div className='Version_Card'>
      <div className='Version_Card_head'>
        <div>
          <div className='Version_Card_title'>{t('card.title')}</div>
          <p className='Version_Card_description'>{t('card.description')}</p>
        </div>
        <button type='button' className='Version_Card_link' onClick={() => navigate('/Vault/Admin/Versions')}>
          {t('card.seeVersions')}
        </button>
      </div>

      {loading && !overview ? (
        <p className='Version_Card_muted'>{t('card.checking')}</p>
      ) : error ? (
        <p className='Version_Card_error'>{error}</p>
      ) : overview ? (
        <>
          <div className='Version_Card_grid'>
            <div className='Version_Card_stat'>
              <span>{t('card.installed')}</span>
              <em>{installed}</em>
              <small>{formatDate(overview.installed.date)}</small>
            </div>
            <div className='Version_Card_stat'>
              <span>{t('card.latest')}</span>
              <em className={overview.updateAvailable ? 'new' : ''}>{latest?.version ?? '—'}</em>
              <small>
                {latest ? formatDate(latest.date) : t('card.noReleases')}
                {overview.offline && ` (${t('card.offline')})`}
              </small>
            </div>
            <div className='Version_Card_stat'>
              <span>{t('card.status')}</span>
              <em className={overview.updateAvailable ? 'new' : 'ok'}>
                {overview.updateAvailable ? t('card.updates', { count: overview.newerCount }) : t('card.upToDate')}
              </em>
              <small>{overview.updateAvailable ? t('card.canSkip') : t('card.nothingToInstall')}</small>
            </div>
          </div>

          {overview.updateAvailable && latest && (
            <div className='Version_Card_latest'>
              <span className='Version_Card_latest_title'>
                {t('card.whatsNew', { version: latest.version })}
                {latest.title && latest.title !== latest.version ? ` — ${latest.title}` : ''}
              </span>
              <Release_Notes notes={latest.notes} limit={3} />
            </div>
          )}

          <div className='Version_Card_actions'>
            {overview.updatesEnabled ? (
              overview.updateAvailable &&
              latest && (
                <button type='button' className='Version_Card_update' onClick={() => setChosen(latest.version)}>
                  {t('card.updateTo', { version: latest.version })}
                </button>
              )
            ) : (
              <p className='Version_Card_muted'>{t('card.serverOnly')}</p>
            )}
          </div>
        </>
      ) : null}

      {updating && (
        <Update_Modal
          version={updating.version}
          from={installed}
          resume={updating.resume}
          onClose={closeUpdate}
        />
      )}
    </div>
  );
};

export default Version_Card;
