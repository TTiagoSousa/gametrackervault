import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameDetail } from '../../../Hooks/Games/useGameDetail';
import { useLibraryEntry } from '../../../Hooks/Games/useLibraryEntry';
import Game_Shelf from '../../../Components/Game_Shelf/Game_Shelf';
import { dateLocale } from '../../../i18n';
import * as Icon from '../../../Imports/icons';
import Library_Panel from './Library_Panel';
import Time_To_Beat from './Time_To_Beat';
import './Game.scss';

// Summaries longer than this show truncated, with "Read more"
const SUMMARY_LIMIT = 480;

/**
 * Game page: the IGDB info sheet (cover, production, ratings, times, summary,
 * images, DLCs, series) and, beside it, "My shelf" to add, change or remove it.
 */
const Game = () => {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const params = useParams();
  const gameId = Number(params.id);
  const { game, error, loading } = useGameDetail(gameId);
  const library = useLibraryEntry(gameId);
  const [expanded, setExpanded] = useState<{ id: number; summary: boolean; story: boolean }>({ id: gameId, summary: false, story: false });
  // When the game changes, the "Read more" sections close again
  const open = expanded.id === gameId ? expanded : { id: gameId, summary: false, story: false };
  const toggle = (key: 'summary' | 'story') => setExpanded({ ...open, [key]: !open[key] });

  // Mobile and tablet: "My shelf" opens as a sheet over the page.
  // It stays open only for the game it was opened on.
  const { t: tl } = useTranslation('library');
  const [sheetFor, setSheetFor] = useState<number | null>(null);
  const sheetOpen = sheetFor === gameId;

  // With the sheet open the page doesn't scroll behind it, and Esc closes it
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetFor(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const back = (
    <button
      type='button'
      className='Game_Back'
      // Opened via a direct link there's nowhere to go back to in the app: go to search
      onClick={() => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/Vault/Search'))}
    >
      <Icon.Chevron />
      {t('back')}
    </button>
  );

  if (loading) {
    return <div className='Game'>{back}<p className='Game_Muted'>{t('loading')}</p></div>;
  }

  if (error || !game) {
    return (
      <div className='Game'>
        {back}
        <div className='Game_Error'>
          <h1>{t('errorTitle')}</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const ratingBlocks = [
    { key: 'total', label: t('ratingTotal'), value: game.ratings.total, count: game.ratings.totalCount },
    { key: 'critics', label: t('ratingCritics'), value: game.ratings.critics, count: game.ratings.criticsCount },
    { key: 'users', label: t('ratingUsers'), value: game.ratings.users, count: game.ratings.usersCount },
  ];

  const clip = (text: string, isOpen: boolean) =>
    isOpen || text.length <= SUMMARY_LIMIT ? text : `${text.slice(0, SUMMARY_LIMIT).trimEnd()}…`;

  const detailRows = [
    { label: t('released'), value: game.releaseDate ? new Date(`${game.releaseDate}T00:00:00Z`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : null },
    { label: t('type'), value: game.type },
    { label: t('series'), value: game.series.join(', ') || null },
    { label: t('franchises'), value: game.franchises.join(', ') || null },
    { label: t('themes'), value: game.themes.join(', ') || null },
    { label: t('modes'), value: game.modes.join(', ') || null },
    { label: t('perspectives'), value: game.perspectives.join(', ') || null },
  ].filter((row) => row.value);

  return (
    <div className='Game'>
      <div className='Game_Main'>
      {back}

      <div className='Game_Top'>
        <div className='Game_Cover'>
          {game.coverUrl ? <img src={game.coverUrl} alt={game.name} /> : <span className='Game_NoCover'>{game.name}</span>}
        </div>

        <div className='Game_Info'>
          <h1 className='Game_Title'>{game.name}</h1>
          <p className='Game_Subtitle'>
            {game.year && <span>{game.year}</span>}
            {game.developers.length > 0 && <span>{game.developers.join(', ')}</span>}
          </p>

          {game.parentGame && (
            <p className='Game_Parent'>
              {t('partOf')}{' '}
              <button type='button' className='Game_Link' onClick={() => navigate(`/Vault/Game/${game.parentGame!.id}`)}>
                {game.parentGame.name}
              </button>
            </p>
          )}

          <div className='Game_Ratings'>
            {ratingBlocks.map((block) => (
              <div key={block.key} className='Game_Rating'>
                <span className='Game_Rating_Value'>{block.value ?? '—'}</span>
                <span className='Game_Rating_Label'>{block.label}</span>
                <span className='Game_Rating_Count'>{block.value !== null ? t('ratingCount', { count: block.count }) : t('noRating')}</span>
              </div>
            ))}
          </div>

          <dl className='Game_Facts'>
            {game.developers.length > 0 && (<><dt>{t('developer')}</dt><dd>{game.developers.join(', ')}</dd></>)}
            {game.publishers.length > 0 && (<><dt>{t('publisher')}</dt><dd>{game.publishers.join(', ')}</dd></>)}
            {game.platforms.length > 0 && (<><dt>{t('platforms')}</dt><dd>{game.platforms.join(', ')}</dd></>)}
            {game.genres.length > 0 && (<><dt>{t('genres')}</dt><dd>{game.genres.join(', ')}</dd></>)}
          </dl>
        </div>
      </div>

      <div className='Game_Body'>
        <section className='Game_About'>
          <h2 className='Game_Section_Title'>{t('about')}</h2>
          {game.summary ? (
            <p className='Game_Text'>
              {clip(game.summary, open.summary)}
              {game.summary.length > SUMMARY_LIMIT && (
                <button type='button' className='Game_Link' onClick={() => toggle('summary')}>
                  {open.summary ? t('readLess') : t('readMore')}
                </button>
              )}
            </p>
          ) : (
            <p className='Game_Muted'>{t('noSummary')}</p>
          )}

          {game.storyline && (
            <>
              <h3 className='Game_Subsection_Title'>{t('storyline')}</h3>
              <p className='Game_Text'>
                {clip(game.storyline, open.story)}
                {game.storyline.length > SUMMARY_LIMIT && (
                  <button type='button' className='Game_Link' onClick={() => toggle('story')}>
                    {open.story ? t('readLess') : t('readMore')}
                  </button>
                )}
              </p>
            </>
          )}
        </section>

        <div className='Game_Side'>
        <Time_To_Beat timeToBeat={game.timeToBeat} yourHours={library.entry?.hoursPlayed ?? null} />

        {detailRows.length > 0 && (
          <section className='Game_Details'>
            <h2 className='Game_Section_Title'>{t('details')}</h2>
            <dl className='Game_Facts'>
              {detailRows.map((row) => (<div key={row.label} className='Game_Fact_Row'><dt>{row.label}</dt><dd>{row.value}</dd></div>))}
            </dl>
            {game.igdbUrl && (
              <a className='Game_Link' href={game.igdbUrl} target='_blank' rel='noreferrer'>{t('openIgdb')}</a>
            )}
          </section>
        )}
        </div>
      </div>

      {(game.screenshots.length > 0 || game.videos.length > 0) && (
        <section className='Game_Media'>
          <h2 className='Game_Section_Title'>{t('media')}</h2>
          <div className='Game_Media_Row'>
            {game.videos.map((video) => (
              <a
                key={video.youtubeId}
                className='Game_Video'
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target='_blank'
                rel='noreferrer'
                title={t('watchOnYoutube')}
              >
                <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.name ?? t('watchOnYoutube')} loading='lazy' />
                <span className='Game_Video_Play' aria-hidden='true' />
                {video.name && <span className='Game_Video_Name'>{video.name}</span>}
              </a>
            ))}
            {game.screenshots.map((src) => (
              <a key={src} className='Game_Screenshot' href={src} target='_blank' rel='noreferrer'>
                <img src={src} alt='' loading='lazy' />
              </a>
            ))}
          </div>
        </section>
      )}

      <Game_Shelf title={t('expansions')} games={game.expansions} />
      <Game_Shelf title={t('dlcs')} games={game.dlcs} />
      <Game_Shelf title={t('otherVersions')} games={game.otherVersions} />
      <Game_Shelf title={t('sameSeries')} games={game.sameSeries} />
      </div>

      {/* On desktop, right column pinned while scrolling (the wrapper doesn't
          exist for layout: display contents). On mobile and tablet, a
          sheet that opens on top from the "My shelf" bar.
          key: the draft resets when opening another game (e.g. a DLC) */}
      <div className={`Game_Dock${sheetOpen ? ' open' : ''}`} onClick={() => setSheetFor(null)}>
        <div className='Game_Dock_Sheet' role={sheetOpen ? 'dialog' : undefined} aria-modal={sheetOpen || undefined} onClick={(e) => e.stopPropagation()}>
          <div className='Game_Dock_Head'>
            <span className='Game_Dock_Handle' aria-hidden='true' />
            <button type='button' className='Game_Dock_Close' onClick={() => setSheetFor(null)}>
              {t('closeShelf')}
            </button>
          </div>
          <Library_Panel key={gameId} gameId={gameId} {...library} />
        </div>
      </div>

      <button type='button' className='Game_Dock_Trigger' onClick={() => setSheetFor(gameId)} aria-expanded={sheetOpen}>
        <span className='Game_Dock_Trigger_Title'>{tl('title')}</span>
        <span className={`Game_Dock_Trigger_Badge${library.entry ? ` status-${library.entry.status}` : ''}`}>
          {library.entry ? tl(`statusShort.${library.entry.status}`) : tl('add')}
        </span>
        <span className='Game_Dock_Trigger_Chevron' aria-hidden='true'><Icon.Chevron /></span>
      </button>
    </div>
  );
};

export default Game;
