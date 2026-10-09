import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { menuItems } from './Menu_Items';
import { useTheme } from '../../../Contexts/ThemeContext';
import { useAuth } from '../../../Contexts/Auth_Context';
import * as Icon from '../../../Imports/icons';
import './Top_Nav.scss';

// Barra de topo da app autenticada: marca à esquerda, separadores ao centro e, à
// direita, o tema e o avatar com o menu da conta. No telemóvel os separadores
// passam para uma linha própria por baixo.
const Top_Nav = () => {
  const { t } = useTranslation('nav');
  const { t: tAdmin } = useTranslation('admin');
  const { pathname } = useLocation();
  const { isDark, handleDarkMode, handleLightMode } = useTheme();
  const { username, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);

  // Publica a altura real da barra em --top-nav-height: o que fica colado por
  // baixo dela (a barra da pesquisa, o painel de filtros) usa-a como topo. No
  // telemóvel a barra tem duas linhas, por isso não serve um valor fixo.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () =>
      document.documentElement.style.setProperty('--top-nav-height', `${bar.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  const visibleItems = menuItems.filter((item) => !item.adminOnly || role === 'ADMIN');

  // O separador ativo é o de caminho mais comprido que bate com a rota. O /Vault
  // (início) é prefixo de todos os outros, por isso só conta quando é exato — senão
  // ficaria ativo em páginas sem separador, como a pesquisa.
  const matches = (path: string) =>
    path === '/Vault' ? pathname === '/Vault' || pathname === '/Vault/' : pathname.startsWith(path);
  const activeId = visibleItems
    .filter((item) => matches(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.id;

  // Fecha o menu da conta ao clicar fora ou ao carregar em Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    if (isDark) handleLightMode();
    else handleDarkMode();
  };

  const initial = (username ?? '?').charAt(0).toUpperCase();

  return (
    <header className="Top_Nav" ref={barRef}>
      <div className="Top_Nav_Inner">
        <Link to="/Vault" className="Top_Nav_Brand">
          <span className="Top_Nav_Logo"><Icon.Logo color="var(--on-accent)" /></span>
          <span className="Top_Nav_Name">GameTracker Vault</span>
        </Link>

        <nav className="Top_Nav_Tabs" aria-label={t('sidebar.menu')}>
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              to={item.path || '#'}
              className={`Top_Nav_Tab${activeId === item.id ? ' active' : ''}`}
              aria-current={activeId === item.id ? 'page' : undefined}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="Top_Nav_Actions">
          <Link
            to="/Vault/Search"
            className={`Top_Nav_Icon_Button${pathname.startsWith('/Vault/Search') ? ' active' : ''}`}
            title={t('sidebar.search')}
            aria-label={t('sidebar.search')}
          >
            <Icon.Search />
          </Link>

          <button
            type="button"
            className="Top_Nav_Icon_Button"
            onClick={toggleTheme}
            title={isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            aria-label={isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {isDark ? <Icon.Sun /> : <Icon.Moon />}
          </button>

          <div className="Top_Nav_Account" ref={menuRef}>
            <button
              type="button"
              className="Top_Nav_Avatar"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={username ?? ''}
            >
              {initial}
            </button>

            {menuOpen && (
              <div className="Top_Nav_Menu" role="menu">
                <div className="Top_Nav_Menu_User">
                  <span className="Top_Nav_Menu_Name">{username}</span>
                  {role && <span className="Top_Nav_Menu_Role">{tAdmin(`users.roles.${role === 'ADMIN' ? 'ADMIN' : 'USER'}`)}</span>}
                </div>
                <Link to="/Vault/Settings#account" role="menuitem" className="Top_Nav_Menu_Item" onClick={() => setMenuOpen(false)}>
                  <Icon.Profile />
                  <span>{t('sidebar.account')}</span>
                </Link>
                <Link to="/Vault/Settings#assistant" role="menuitem" className="Top_Nav_Menu_Item" onClick={() => setMenuOpen(false)}>
                  <Icon.Sparkle />
                  <span>{t('sidebar.assistantKey')}</span>
                </Link>
                <Link to="/Vault/Help" role="menuitem" className="Top_Nav_Menu_Item" onClick={() => setMenuOpen(false)}>
                  <Icon.Help />
                  <span>{t('sidebar.help')}</span>
                </Link>
                <button type="button" role="menuitem" className="Top_Nav_Menu_Item danger" onClick={logout}>
                  <Icon.Logout />
                  <span>{t('sidebar.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Top_Nav;
