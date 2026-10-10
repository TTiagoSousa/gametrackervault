import './Versions.scss';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReleases } from '../../../../Hooks/System/useReleases';
import { installedLabel } from '../../../../Hooks/System/types';
import { dateLocale } from '../../../../i18n';
import Release_Notes from '../../../../Components/Release_Notes/Release_Notes';
import Update_Modal from '../../../../Components/Modals/Update_Modal/Update_Modal';
import * as Icon from '../../../../Imports/icons';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(dateLocale(), { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * All releases with their notes. Any version newer than the installed one can be
 * installed — skipping versions is safe, all migrations get applied. Going
 * back isn't: the database doesn't undo migrations.
 */
const Versions = () => {
  const { t } = useTranslation('system');
  const navigate = useNavigate();
  const { list, loading, error, fetchReleases } = useReleases();
  const [target, setTarget] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (version: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });

  const installed = installedLabel(list?.installed);

  return (
    <div className='Versions'>
      <header>
        <div className='Right_Side'>
          <button type='button' className='Versions_back' onClick={() => navigate('/Vault/Admin')}>
            <Icon.Chevron />
            <span>{t('versions.back')}</span>
          </button>
          <span>{t('versions.title')}</span>
        </div>

        <div className='Left_Side'>
          <button type='button' className='Versions_refresh' disabled={loading} onClick={() => fetchReleases(true)}>
            <Icon.Refresh />
            <span>{loading ? t('versions.searching') : t('versions.refresh')}</span>
          </button>
        </div>
      </header>

      <div className='Versions_section'>
        <div className='Versions_summary'>
          {t('versions.installed')}: <em>{installed}</em>
          {list?.offline && <span className='Versions_offline'>{t('versions.offline')}</span>}
          {list && !list.updatesEnabled && <span className='Versions_offline'>{t('versions.serverOnly')}</span>}
        </div>

        {error && <p className='Versions_error'>{error}</p>}

        {list && list.releases.length === 0 && !loading && <p className='Versions_empty'>{t('versions.empty')}</p>}

        <div className='Versions_list'>
          {list?.releases.map((release) => {
            const expanded = open.has(release.version);
            return (
              <article
                key={release.version}
                className={`Versions_item${release.installed ? ' installed' : ''}${expanded ? ' expanded' : ''}`}
              >
                {/* Closed shows only the version and date; clicking opens the notes. */}
                <div
                  className='Versions_item_head'
                  role='button'
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => toggle(release.version)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(release.version);
                    }
                  }}
                >
                  <span className='Versions_item_chevron'>
                    <Icon.Chevron />
                  </span>
                  <div className='Versions_item_title'>
                    <span className='Versions_item_version'>{release.version}</span>
                    {release.installed && <span className='Versions_badge installed'>{t('versions.badgeInstalled')}</span>}
                    {release.newer && <span className='Versions_badge new'>{t('versions.badgeNew')}</span>}
                    <span className='Versions_item_date'>{formatDate(release.date)}</span>
                  </div>

                  {release.newer && list.updatesEnabled && (
                    <button
                      type='button'
                      className='Versions_install'
                      onClick={(e) => {
                        e.stopPropagation();
                        setTarget(release.version);
                      }}
                    >
                      {t('versions.install')}
                    </button>
                  )}
                </div>

                <div className='Versions_item_expand_wrapper'>
                  <div className='Versions_item_expand'>
                    <div className='Versions_item_body'>
                      {release.title && release.title !== release.version && (
                        <p className='Versions_item_headline'>{release.title}</p>
                      )}
                      <Release_Notes notes={release.notes} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {target && <Update_Modal version={target} from={installed} onClose={() => setTarget(null)} />}
    </div>
  );
};

export default Versions;
