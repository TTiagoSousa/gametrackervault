import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import { useLibrary } from '../../../Hooks/Games/useLibrary';
import { SHELF_OF, SHELVES, type LibraryEntry, type LibraryStatus, type Shelf } from '../../../Hooks/Games/detailTypes';
import Random_Pick from './Random_Pick';
import './Home.scss';

// Label under the name: only when the shelf combines different statuses
const TAGGED: Partial<Record<LibraryStatus, true>> = {
  PAUSED: true,
  FINISHED_MAIN: true,
  FINISHED_EXTRAS: true,
  COMPLETED_100: true,
};

// Home: one shelf per status group, with the game covers facing out.
const Home = () => {
  const { t } = useTranslation('home');
  const { t: tl } = useTranslation('library');
  const { username } = useAuth();
  const { library, error } = useLibrary();

  // Most recent first
  const byShelf = useMemo(() => {
    const groups: Record<Shelf, LibraryEntry[]> = { playing: [], done: [], later: [], dropped: [] };
    const items = [...(library?.items ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const entry of items) groups[SHELF_OF[entry.status]].push(entry);
    return groups;
  }, [library]);

  return (
    <div className='Home'>
      <header className='Home_Hero'>
        <h1>{username ? t('greeting', { name: username }) : t('title')}</h1>
        <p>{library && library.total === 0 ? t('empty.description') : t('subtitle')}</p>
      </header>

      {error && <p className='Home_Error'>{t('loadFailed')}</p>}

      {/* Everything renders at once when the shelf arrives: nothing grows or shrinks afterwards */}
      {library && <Random_Pick entries={library.items} />}

      {library && (
      <div className='Home_Shelves'>
        {SHELVES.map((shelf) => {
          const entries = byShelf[shelf];
          return (
            <section key={shelf} className={`Home_Shelf ${shelf}${entries.length ? '' : ' empty'}`}>
              <div className='Home_Shelf_Head'>
                <h2>
                  <span className='Home_Shelf_Dot' aria-hidden='true' />
                  {t(`shelves.${shelf}`)}
                </h2>
                <span className='Home_Shelf_Count'>{t('count', { count: entries.length })}</span>
              </div>

              <div className='Home_Shelf_Row'>
                {entries.map((entry) => (
                  <Link key={entry.gameId} to={`/Vault/Game/${entry.gameId}`} className={`Home_Game status-${entry.status}`}>
                    <span className='Home_Game_Case'>
                      {entry.game.coverUrl
                        ? <img src={entry.game.coverUrl} alt='' loading='lazy' />
                        : <span className='Home_Game_NoCover'>{entry.game.name}</span>}
                    </span>
                    <span className='Home_Game_Name' title={entry.game.name}>{entry.game.name}</span>
                    <span className='Home_Game_Meta'>
                      {TAGGED[entry.status] && <span className='Home_Game_Tag'>{tl(`statusShort.${entry.status}`)}</span>}
                      {entry.hoursPlayed != null && <span>{t('hours', { hours: entry.hoursPlayed })}</span>}
                    </span>
                  </Link>
                ))}
                {entries.length === 0 && <p className='Home_Shelf_Empty'>{t(`emptyShelf.${shelf}`)}</p>}
              </div>
              <div className='Home_Shelf_Board' />
            </section>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default Home;
