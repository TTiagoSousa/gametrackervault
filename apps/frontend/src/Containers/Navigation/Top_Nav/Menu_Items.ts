interface MenuItem {
  id: string;
  // Chave de tradução (namespace 'nav'), traduzida onde é mostrada
  labelKey: string;
  path: string;
  adminOnly?: boolean;
}

export const menuItems: MenuItem[] = [
  { id: 'home', labelKey: 'menu.home', path: '/Vault' },
  { id: 'stats', labelKey: 'menu.stats', path: '/Vault/Stats' },
  { id: 'assistant', labelKey: 'menu.assistant', path: '/Vault/Assistant' },
  { id: 'settings', labelKey: 'menu.settings', path: '/Vault/Settings' },
  { id: 'admin', labelKey: 'menu.admin', path: '/Vault/Admin', adminOnly: true },
];
