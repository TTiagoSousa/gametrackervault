import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLibraryStats, type LibraryStats, type StatsGame } from '../../../Hooks/Games/useLibraryStats';
import { LIBRARY_STATUSES } from '../../../Hooks/Games/detailTypes';
import { dateLocale } from '../../../i18n';
import './Stats.scss';

// Numa pilha de um ano cabem estas lombadas; o resto fica no número por cima
const MAX_STACK = 14;
// As listas de destaques têm sempre estas linhas (as que faltam ficam vazias)
const TOP_ROWS = 5;

const formatHours = (hours: number) =>
  hours.toLocaleString(dateLocale(), { maximumFractionDigits: hours < 10 ? 1 : 0 });

type T = ReturnType<typeof useTranslation>['t'];

/**
 * Estatísticas da estante, numa grelha regular: uma faixa de resumo com quatro
 * números e, por baixo, linhas de painéis com a mesma altura — horas e estante,
 * concluídos por ano, notas e géneros, e os destaques.
 */
const Stats = () => {
  const { t } = useTranslation('stats');
  const { t: tl } = useTranslation('library');
  const { stats, failed } = useLibraryStats();

  return (
    <div className='Stats'>
      <header className='Stats_Hero'>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      {failed && <p className='Stats_Error'>{t('loadFailed')}</p>}
      {!stats && !failed && <p className='Stats_Muted'>{t('loading')}</p>}

      {stats && stats.total === 0 && (
        <section className='Stats_Empty'>
          <p>{t('empty')}</p>
          <Link to='/Vault/Search' className='Stats_Button'>{t('emptyAction')}</Link>
        </section>
      )}

      {stats && stats.total > 0 && <Stats_Body stats={stats} t={t} tl={tl} />}
    </div>
  );
};

/** Um painel: título à esquerda, nota curta à direita, conteúdo por baixo. */
const Panel = ({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`Stats_Panel ${className}`}>
    <header className='Stats_Panel_Head'>
      <h2>{title}</h2>
      {aside && <span className='Stats_Panel_Aside'>{aside}</span>}
    </header>
    <div className='Stats_Panel_Body'>{children}</div>
  </section>
);

/** Lista de destaques com linhas de altura fixa: as duas listas ficam iguais. */
const Top_List = ({ games, value, empty }: { games: StatsGame[]; value: (index: number) => ReactNode; empty: string }) => {
  if (!games.length) return <p className='Stats_Text'>{empty}</p>;
  return (
    <ol className='Stats_Games'>
      {Array.from({ length: TOP_ROWS }, (_, i) => {
        const game = games[i];
        return game ? (
          <li key={game.gameId}>
            <Link to={`/Vault/Game/${game.gameId}`} className='Stats_Game'>
              <span className='Stats_Game_Rank'>{i + 1}</span>
              <span className={`Stats_Game_Cover status-${game.status}`}>
                {game.coverUrl && <img src={game.coverUrl} alt='' loading='lazy' />}
              </span>
              <span className='Stats_Game_Name'>{game.name}</span>
              <span className='Stats_Game_Value'>{value(i)}</span>
            </Link>
          </li>
        ) : (
          <li key={`empty-${i}`} className='Stats_Game empty' aria-hidden='true' />
        );
      })}
    </ol>
  );
};

const Stats_Body = ({ stats, t, tl }: { stats: LibraryStats; t: T; tl: T }) => {
  const { hours, backlog, rating } = stats;
  const loggedShare = hours.total > 0 ? (hours.logged / hours.total) * 100 : 0;
  const maxYear = Math.max(1, ...stats.finishedPerYear.map((y) => y.count));
  const maxRating = Math.max(1, ...rating.distribution);
  const maxGenre = Math.max(1, ...stats.genres.map((g) => g.count));

  // A faixa de resumo: quatro números com a mesma forma
  const summary = [
    { key: 'hours', value: `${formatHours(hours.total)} h`, label: t('summary.hours'), note: hours.estimated > 0 ? t('summary.hoursNote', { hours: formatHours(hours.estimated) }) : t('summary.hoursAllLogged') },
    { key: 'games', value: String(stats.total), label: t('summary.games'), note: t('summary.gamesNote', { count: stats.counts.PLAYING + stats.counts.PAUSED }) },
    { key: 'finished', value: String(stats.finished), label: t('summary.finished'), note: stats.completionRate !== null ? t('summary.finishedNote', { rate: stats.completionRate }) : t('summary.noneFinished') },
    { key: 'backlog', value: backlog.games > 0 ? `${formatHours(backlog.hours)} h` : '—', label: t('summary.backlog'), note: t('summary.backlogNote', { count: backlog.games }) },
  ];

  return (
    <>
      {!stats.factsComplete && <p className='Stats_Warning'>{t('factsIncomplete')}</p>}

      <section className='Stats_Summary' aria-label={t('summary.title')}>
        {summary.map((item) => (
          <div key={item.key} className='Stats_Summary_Item'>
            <span className='Stats_Summary_Label'>{item.label}</span>
            <strong className='Stats_Summary_Value'>{item.value}</strong>
            <span className='Stats_Summary_Note'>{item.note}</span>
          </div>
        ))}
      </section>

      <div className='Stats_Row'>
        <Panel title={t('hours.title')} aside={`${formatHours(hours.total)} h`}>
          <div className='Stats_Split' role='img' aria-label={t('hours.aria', { logged: formatHours(hours.logged), estimated: formatHours(hours.estimated) })}>
            <span className='logged' style={{ width: `${loggedShare}%` }} />
            <span className='estimated' style={{ width: `${100 - loggedShare}%` }} />
          </div>
          <ul className='Stats_Legend'>
            <li><span className='Stats_Key logged' />{t('hours.logged', { hours: formatHours(hours.logged), count: hours.loggedGames })}</li>
            <li><span className='Stats_Key estimated' />{t('hours.estimated', { hours: formatHours(hours.estimated), count: hours.estimatedGames })}</li>
            <li className={hours.missingGames ? '' : 'zero'}><span className='Stats_Key missing' />{t('hours.missing', { count: hours.missingGames })}</li>
          </ul>
        </Panel>

        <Panel title={t('shelf.title')} aside={t('shelf.games', { count: stats.total })}>
          <div className='Stats_Spines' role='img' aria-label={t('shelf.title')}>
            {LIBRARY_STATUSES.filter((s) => stats.counts[s] > 0).map((status) => (
              <span key={status} className={`status-${status}`} style={{ flexGrow: stats.counts[status] }} title={`${tl(`status.${status}`)}: ${stats.counts[status]}`} />
            ))}
          </div>
          <ul className='Stats_Legend columns'>
            {LIBRARY_STATUSES.map((status) => (
              <li key={status} className={stats.counts[status] ? '' : 'zero'}>
                <span className={`Stats_Key status-${status}`} />
                {tl(`statusShort.${status}`)}
                <b>{stats.counts[status]}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={t('years.title')} aside={t('years.count', { count: stats.finished })}>
        {stats.finishedPerYear.length ? (
          <div className='Stats_Years'>
            {stats.finishedPerYear.map(({ year, count }) => (
              <div key={year} className='Stats_Year' title={t('years.count', { count })}>
                <span className='Stats_Year_Count'>{count}</span>
                <span className='Stats_Year_Stack' style={{ height: `${(count / maxYear) * 100}%` }}>
                  {Array.from({ length: Math.min(count, MAX_STACK) }, (_, i) => <span key={i} />)}
                </span>
                <span className='Stats_Year_Label'>{year}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className='Stats_Text'>{t('years.empty')}</p>
        )}
      </Panel>

      <div className='Stats_Row'>
        <Panel
          title={t('rating.title')}
          aside={rating.average !== null ? t('rating.average', { average: rating.average.toLocaleString(dateLocale()), count: rating.rated }) : undefined}
        >
          {rating.rated ? (
            <div className='Stats_Ratings'>
              {rating.distribution.map((count, i) => (
                <div key={i} className='Stats_Rating' title={t('rating.count', { count, rating: i + 1 })}>
                  <span className='Stats_Rating_Count'>{count || ''}</span>
                  <span className='Stats_Rating_Bar' style={{ height: `${(count / maxRating) * 100}%` }} />
                  <span className='Stats_Rating_Label'>{i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className='Stats_Text'>{t('rating.empty')}</p>
          )}
        </Panel>

        <Panel title={t('genres.title')}>
          {stats.genres.length ? (
            <ul className='Stats_Bars'>
              {stats.genres.map((genre) => (
                <li key={genre.name}>
                  <span className='Stats_Bars_Name' title={genre.name}>{genre.name}</span>
                  <span className='Stats_Bars_Track'>
                    <span style={{ width: `${(genre.count / maxGenre) * 100}%` }} />
                  </span>
                  <b>{genre.count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className='Stats_Text'>{t('genres.empty')}</p>
          )}
        </Panel>
      </div>

      <div className='Stats_Row'>
        <Panel title={t('mostPlayed.title')}>
          <Top_List
            games={stats.mostPlayed}
            empty={t('mostPlayed.empty')}
            value={(i) => (
              <>
                {formatHours(stats.mostPlayed[i].hours)} h
                {stats.mostPlayed[i].estimated && <em>{t('mostPlayed.estimated')}</em>}
              </>
            )}
          />
        </Panel>

        <Panel title={t('topRated.title')}>
          <Top_List games={stats.topRated} empty={t('rating.empty')} value={(i) => `${stats.topRated[i].rating}/10`} />
        </Panel>
      </div>

      <p className='Stats_Note'>
        {t('note')} <Link to='/Vault/Help#stats'>{t('noteLink')}</Link>
      </p>
    </>
  );
};

export default Stats;
