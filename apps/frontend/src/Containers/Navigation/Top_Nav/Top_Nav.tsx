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

  const visibleItems = menuItems.filter((item) => !item.adminOnly || role === 'ADMIN');

  // O separador ativo é o de caminho mais comprido que bate com a rota: o /Vault
  // (início) é prefixo de todos os outros.
  const activeId = visibleItems
    .filter((item) => item.path && pathname.startsWith(item.path))
    .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0]?.id;

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
    <header className="Top_Nav">
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
