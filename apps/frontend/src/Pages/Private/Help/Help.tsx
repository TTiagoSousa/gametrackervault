import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import Markdown from '../../../Components/Markdown/Markdown';
import * as Icon from '../../../Imports/icons';
import './Help.scss';

// As secções, por esta ordem. As de admin só aparecem a administradores.
const SECTIONS: { id: string; adminOnly?: boolean }[] = [
  { id: 'claude' },
  { id: 'models' },
  { id: 'stats' },
  { id: 'shelf' },
  { id: 'account' },
  { id: 'igdb', adminOnly: true },
  { id: 'forgejo', adminOnly: true },
];

/**
 * Ajuda: uma secção que abre e fecha por tema. O texto de cada uma está em
 * help:<id>.body (Markdown). Um endereço com #<id> abre logo essa secção.
 */
const Help = () => {
  const { t } = useTranslation('help');
  const { role } = useAuth();
  const { hash } = useLocation();
  const visible = SECTIONS.filter((s) => !s.adminOnly || role === 'ADMIN');
  const target = hash.slice(1);
  // O que o utilizador abriu ou fechou; o resto segue o endereço (#<id> abre-a)
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === target;

  // Ao chegar com #<id> (ex.: a partir das Definições), mostra essa secção
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
              <Markdown text={t(`${id}.body`)} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default Help;
