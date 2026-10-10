import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icon from '../../../Imports/icons';
import './Bottom_Nav.scss';

// The five main sections, with icons. Admin lives in the avatar menu.
const ITEMS = [
  { id: 'home', path: '/Vault', icon: Icon.Home, label: 'menu.home' },
  { id: 'search', path: '/Vault/Search', icon: Icon.Search, label: 'sidebar.search' },
  { id: 'stats', path: '/Vault/Stats', icon: Icon.Chart, label: 'menu.stats' },
  { id: 'assistant', path: '/Vault/Assistant', icon: Icon.Sparkle, label: 'menu.assistant' },
  { id: 'settings', path: '/Vault/Settings', icon: Icon.Settings, label: 'menu.settings' },
] as const;

/**
 * Mobile navigation: a bar fixed at the bottom of the screen, as in native
 * apps (only shown below 760px; on desktop the top bar tabs are used
 * instead). A game page counts as "Search".
 */
const Bottom_Nav = () => {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();

  const active = (path: string) => {
    if (path === '/Vault') return pathname === '/Vault' || pathname === '/Vault/' || pathname === '/';
    if (path === '/Vault/Search') return pathname.startsWith('/Vault/Search') || pathname.startsWith('/Vault/Game');
    return pathname.startsWith(path);
  };

  return (
    <nav className='Bottom_Nav' aria-label={t('sidebar.menu')}>
      {ITEMS.map(({ id, path, icon: ItemIcon, label }) => (
        <Link key={id} to={path} className={`Bottom_Nav_Item${active(path) ? ' active' : ''}`} aria-current={active(path) ? 'page' : undefined}>
          <span className='Bottom_Nav_Icon' aria-hidden='true'><ItemIcon /></span>
          <span className='Bottom_Nav_Label'>{t(label)}</span>
        </Link>
      ))}
    </nav>
  );
};

export default Bottom_Nav;
