import { useTranslation } from 'react-i18next';
import type { GameDetail } from '../../../Hooks/Games/detailTypes';

interface Time_To_Beat_Props {
  timeToBeat: GameDetail['timeToBeat'];
  yourHours: number | null;
}

/**
 * Average time to beat the game, as proportional bars (the largest is 100%),
 * with the user's hours marked on top when they have them.
 */
const Time_To_Beat = ({ timeToBeat, yourHours }: Time_To_Beat_Props) => {
  const { t } = useTranslation('game');

  const rows = timeToBeat
    ? [
        { key: 'main', label: t('timeMain'), hours: timeToBeat.main },
        { key: 'extras', label: t('timeExtras'), hours: timeToBeat.mainExtras },
        { key: 'complete', label: t('timeComplete'), hours: timeToBeat.completionist },
      ].filter((row): row is { key: string; label: string; hours: number } => row.hours !== null)
    : [];

  const max = Math.max(...rows.map((r) => r.hours), yourHours ?? 0, 1);

  return (
    <section className='Time_To_Beat'>
      <h2 className='Game_Section_Title'>{t('timeTitle')}</h2>

      {rows.length === 0 ? (
        <p className='Game_Muted'>{t('timeNone')}</p>
      ) : (
        <>
          <div className='Time_To_Beat_Bars'>
            {rows.map((row) => (
              <div key={row.key} className={`Time_To_Beat_Row ${row.key}`}>
                <span className='Time_To_Beat_Label'>{row.label}</span>
                <span className='Time_To_Beat_Track'>
                  <span className='Time_To_Beat_Fill' style={{ width: `${(row.hours / max) * 100}%` }} />
                  {yourHours !== null && yourHours > 0 && (
                    <span className='Time_To_Beat_You' style={{ left: `${Math.min((yourHours / max) * 100, 100)}%` }} aria-hidden='true' />
                  )}
                </span>
                <span className='Time_To_Beat_Value'>{t('hoursShort', { hours: row.hours })}</span>
              </div>
            ))}
          </div>
          <p className='Game_Muted'>
            {t('timeBasedOn', { count: timeToBeat?.count ?? 0 })}
            {yourHours !== null && yourHours > 0 && <span className='Time_To_Beat_Yours'>{t('timeYours', { hours: yourHours })}</span>}
          </p>
        </>
      )}
    </section>
  );
};

export default Time_To_Beat;
