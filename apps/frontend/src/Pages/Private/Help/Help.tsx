import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import Markdown from '../../../Components/Markdown/Markdown';
import Android_Download from '../../../Components/Android_Download/Android_Download';
import * as Icon from '../../../Imports/icons';
import './Help.scss';

// The sections, in this order. The admin ones only show to administrators.
const SECTIONS: { id: string; adminOnly?: boolean }[] = [
  { id: 'android' },
  { id: 'claude' },
  { id: 'models' },
  { id: 'stats' },
  { id: 'shelf' },
  { id: 'account' },
  { id: 'igdb', adminOnly: true },
  { id: 'code', adminOnly: true },
];

/**
 * Help: one section per topic that opens and closes. Each one's text is in
 * help:<id>.body (Markdown). A URL with #<id> opens that section right away.
 */
const Help = () => {
  const { t } = useTranslation('help');
  const { role } = useAuth();
  const { hash } = useLocation();
  const visible = SECTIONS.filter((s) => !s.adminOnly || role === 'ADMIN');
  const target = hash.slice(1);
  // What the user opened or closed; the rest follows the URL (#<id> opens it)
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === target;

  // When arriving with #<id> (e.g. from Settings), shows that section
  useEffect(() => {
    if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }));
  }, [target]);

  const toggle = (id: string, open: boolean) =>
    setToggled((previous) => (previous[id] === open ? previous : { ...previous, [id]: open }));

  return (
    <div className='Help'>
      <header className='Help_Hero'>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      <div className='Help_List'>
        {visible.map(({ id, adminOnly }) => (
          <details
            key={id}
            id={id}
            className='Help_Section'
            open={isOpen(id)}
            onToggle={(e) => toggle(id, (e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>
              <span className='Help_Section_Title'>{t(`${id}.title`)}</span>
              {adminOnly && <span className='Help_Section_Tag'>{t('adminOnly')}</span>}
              <span className='Help_Section_Chevron' aria-hidden='true'><Icon.Chevron /></span>
            </summary>
            <div className='Help_Section_Body'>
              {id === 'android' && <Android_Download />}
              <Markdown text={t(`${id}.body`)} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default Help;
