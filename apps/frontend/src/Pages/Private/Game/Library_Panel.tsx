import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { useLibraryEntry } from '../../../Hooks/Games/useLibraryEntry';
import type { LibraryEntry, LibraryStatus } from '../../../Hooks/Games/detailTypes';
import { dateLocale } from '../../../i18n';
import './Library_Panel.scss';

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// The statuses in two groups: what's still in progress and what's already done
const GROUPS: { key: 'groupActive' | 'groupDone'; statuses: LibraryStatus[] }[] = [
  { key: 'groupActive', statuses: ['PLAYING', 'PAUSED', 'PLAN_TO_PLAY', 'DROPPED'] },
  { key: 'groupDone', statuses: ['FINISHED_MAIN', 'FINISHED_EXTRAS', 'COMPLETED_100'] },
];

interface Draft {
  status: LibraryStatus | null;
  hoursPlayed: string;
  startedAt: string;
  finishedAt: string;
  rating: number | null;
  notes: string;
}

const EMPTY: Draft = { status: null, hoursPlayed: '', startedAt: '', finishedAt: '', rating: null, notes: '' };

const draftFrom = (entry: LibraryEntry | null): Draft => ({
  status: entry?.status ?? null,
  hoursPlayed: entry?.hoursPlayed != null ? String(entry.hoursPlayed) : '',
  startedAt: entry?.startedAt ?? '',
  finishedAt: entry?.finishedAt ?? '',
  rating: entry?.rating ?? null,
  notes: entry?.notes ?? '',
});

const sameDraft = (a: Draft, b: Draft) =>
  a.status === b.status &&
  a.hoursPlayed === b.hoursPlayed &&
  a.startedAt === b.startedAt &&
  a.finishedAt === b.finishedAt &&
  a.rating === b.rating &&
  a.notes === b.notes;

// The game page reads the entry (it needs the hours for the play times) and
// hands it over here, so it isn't fetched twice
type Library_Panel_Props = { gameId: number } & ReturnType<typeof useLibraryEntry>;

/**
 * "My shelf" on a game page, in three groups — Status, Progress and
 * Rating — with the actions in an always-visible footer.
 *
 * Everything can be undone: clicking the chosen status (or rating) again unselects it,
 * each group has "Clear", "Undo" goes back to what's saved and "Clear all"
 * empties the panel. Whatever comes and goes keeps its space — nothing jumps.
 */
const Library_Panel = ({ entry, loading, failed, retry, busy, save, remove }: Library_Panel_Props) => {
  const { t } = useTranslation('library');
  // The draft starts as the saved entry; until it's touched, it stands
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const saved = draftFrom(entry);
  const values = draft ?? saved;
  const dirty = draft !== null && !sameDraft(draft, saved);
  const empty = sameDraft(values, EMPTY);
  const hasProgress = Boolean(values.hoursPlayed || values.startedAt || values.finishedAt);
  const hasReview = values.rating !== null || Boolean(values.notes);

  // Always starts from the latest draft: several changes in a row (before the
  // component re-renders) don't overwrite each other
  const update = (patch: Partial<Draft>) =>
    setDraft((previous) => ({ ...(previous ?? draftFrom(entry)), ...patch }));

  const onSave = async () => {
    if (!values.status) return;
    const hours = values.hoursPlayed.trim() ? Number(values.hoursPlayed.replace(',', '.')) : null;
    const ok = await save({
      status: values.status,
      hoursPlayed: hours !== null && Number.isFinite(hours) ? hours : null,
      startedAt: values.startedAt || null,
      finishedAt: values.finishedAt || null,
      rating: values.rating,
      notes: values.notes.trim() || null,
    });
    if (ok) setDraft(null);
  };

  const onRemove = async () => {
    setConfirmRemove(false);
    if (await remove()) setDraft(null);
  };

  // A group's "Clear": always in place, only invisible when there's nothing to clear
  const clearLink = (visible: boolean, onClear: () => void) => (
    <button
      type='button'
      className={`Library_Clear${visible ? '' : ' hidden'}`}
      onClick={onClear}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      {t('clear')}
    </button>
  );

  if (failed) {
    return (
      <aside className='Library_Panel'>
        <div className='Library_Scroll'>
          <h2 className='Library_Title'>{t('title')}</h2>
          <p className='Library_Error'>{t('loadFailed')}</p>
        </div>
        <div className='Library_Footer'>
          <button type='button' className='Library_Save' onClick={retry}>{t('retry')}</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className='Library_Panel' aria-busy={loading}>
      <div className='Library_Scroll'>
        <header className='Library_Header'>
          <h2 className='Library_Title'>{t('title')}</h2>
          <span className={`Library_Badge${entry ? ` status-${entry.status}` : ''}`}>
            {entry ? t(`statusShort.${entry.status}`) : t('notInLibraryBadge')}
          </span>
        </header>
        <p className='Library_Hint'>
          {entry
            ? t('inLibrarySince', { date: new Date(entry.createdAt).toLocaleDateString(dateLocale()) })
            : t('notInLibrary')}
        </p>

        {/* --- Status --- */}
        <section className='Library_Group'>
          {GROUPS.map((group) => (
            <div key={group.key} className='Library_Status_Group' role='radiogroup' aria-label={t(group.key)}>
              <span className='Library_Label'>{t(group.key)}</span>
              <div className='Library_Status_Grid'>
                {group.statuses.map((status) => {
                  const active = values.status === status;
                  return (
                    <button
                      key={status}
                      type='button'
                      role='radio'
                      aria-checked={active}
                      className={`Library_Status status-${status}${active ? ' active' : ''}`}
                      onClick={() => update({ status: active ? null : status })}
                      title={active ? t('clickToUnselect') : t(`status.${status}`)}
                    >
                      <span className='Library_Status_Marker' aria-hidden='true' />
                      {t(`statusShort.${status}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* --- Progress --- */}
        <section className='Library_Group'>
          <div className='Library_Group_Head'>
            <span className='Library_Label'>{t('progress')}</span>
            {clearLink(hasProgress, () => update({ hoursPlayed: '', startedAt: '', finishedAt: '' }))}
          </div>
          <label className='Library_Field Library_Hours'>
            <span>{t('hours')}</span>
            <span className='Library_Suffix'>
              <input
                type='number'
                inputMode='decimal'
                min={0}
                step={0.5}
                placeholder='0'
                value={values.hoursPlayed}
                onChange={(e) => update({ hoursPlayed: e.target.value })}
              />
              <span aria-hidden='true'>{t('hoursSuffix')}</span>
            </span>
          </label>
          <div className='Library_Dates'>
            <label className='Library_Field'>
              <span>{t('started')}</span>
              <input type='date' value={values.startedAt} onChange={(e) => update({ startedAt: e.target.value })} />
            </label>
            <label className='Library_Field'>
              <span>{t('finished')}</span>
              <input type='date' value={values.finishedAt} onChange={(e) => update({ finishedAt: e.target.value })} />
            </label>
          </div>
        </section>

        {/* --- Rating --- */}
        <section className='Library_Group'>
          <div className='Library_Group_Head'>
            <span className='Library_Label'>{t('review')}</span>
            {clearLink(hasReview, () => update({ rating: null, notes: '' }))}
          </div>
          <div className='Library_Rating' role='radiogroup' aria-label={t('rating')}>
            {RATINGS.map((value) => (
              <button
                key={value}
                type='button'
                role='radio'
                aria-checked={values.rating === value}
                className={`Library_Rating_Value${values.rating === value ? ' active' : ''}`}
                onClick={() => update({ rating: values.rating === value ? null : value })}
                title={values.rating === value ? t('clickToUnselect') : undefined}
              >
                {value}
              </button>
            ))}
          </div>
          <textarea
            className='Library_Notes'
            rows={3}
            maxLength={2000}
            aria-label={t('notes')}
            placeholder={t('notesPlaceholder')}
            value={values.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </section>
      </div>

      {/* --- Footer: always visible at the bottom of the panel --- */}
      <div className='Library_Footer'>
        <button type='button' className='Library_Save' disabled={loading || !values.status || busy !== null} onClick={() => void onSave()}>
          {/* With no status the button says why, instead of a warning that takes up space */}
          {busy === 'save' ? t('saving') : !values.status ? t('pickStatus') : entry ? t('save') : t('add')}
        </button>

        {/* One fixed-height row: the actions or, when removing, the confirmation in the same place */}
        <div className='Library_Footer_Links'>
          {confirmRemove ? (
            <>
              <span className='Library_Question'>{t('removeQuestion')}</span>
              <button type='button' className='Library_Link danger strong' disabled={busy !== null} onClick={() => void onRemove()}>
                {t('confirmRemove')}
              </button>
              <button type='button' className='Library_Link' onClick={() => setConfirmRemove(false)}>{t('cancel')}</button>
            </>
          ) : (
            <>
              <button type='button' className={`Library_Link${dirty ? '' : ' hidden'}`} onClick={() => setDraft(null)} tabIndex={dirty ? 0 : -1} aria-hidden={!dirty}>
                {t('undo')}
              </button>
              <button type='button' className={`Library_Link${empty ? ' hidden' : ''}`} onClick={() => setDraft({ ...EMPTY })} tabIndex={empty ? -1 : 0} aria-hidden={empty}>
                {t('clearAll')}
              </button>
              <button
                type='button'
                className={`Library_Link danger push${entry ? '' : ' hidden'}`}
                disabled={busy !== null}
                onClick={() => setConfirmRemove(true)}
                tabIndex={entry ? 0 : -1}
                aria-hidden={!entry}
              >
                {t('remove')}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Library_Panel;
