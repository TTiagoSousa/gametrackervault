import './Release_Notes.scss';
import { useTranslation } from 'react-i18next';
import type { ReleaseNotes } from '../../Hooks/System/types';

// Notes arrive from the backend already in the interface language (with English as fallback);
// the section titles come from the interface.
const SECTIONS: (keyof ReleaseNotes)[] = ['features', 'fixes', 'improvements', 'other'];

// "**auth**: add X" → <strong>auth</strong>: add X
const renderItem = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );

interface Release_Notes_Props {
  notes: ReleaseNotes;
  /** Max lines per section (the card shows only a summary). */
  limit?: number;
}

const Release_Notes = ({ notes, limit }: Release_Notes_Props) => {
  const { t } = useTranslation('system');
  const sections = SECTIONS.filter((key) => notes[key].length > 0);
  if (sections.length === 0) return <p className='Release_Notes_empty'>{t('notes.empty')}</p>;

  return (
    <div className='Release_Notes'>
      {sections.map((section) => {
        const items = notes[section];
        const shown = limit ? items.slice(0, limit) : items;
        return (
          <div key={section} className={`Release_Notes_section ${section}`}>
            <span className='Release_Notes_label'>
              {t(`notes.${section}`)} <em>{items.length}</em>
            </span>
            <ul>
              {shown.map((item, i) => (
                <li key={i}>{renderItem(item)}</li>
              ))}
              {limit && items.length > limit && <li className='more'>{t('notes.more', { count: items.length - limit })}</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default Release_Notes;
