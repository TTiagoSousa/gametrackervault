import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * UI languages. Translations live in ./locales/<language>/<namespace>.json —
 * one namespace per app area (common, nav, home, admin, …). A component uses
 * `const { t } = useTranslation('<namespace>')`; outside components (hooks that
 * show alerts), `i18n.t('<namespace>:<key>')`.
 *
 * Portuguese is the source language: a key missing in another language falls back to it.
 */
export const LANGUAGES = [
  { code: 'pt-PT', name: 'Português', region: 'Portugal' },
  { code: 'en', name: 'English', region: 'International' },
  { code: 'es', name: 'Español', region: 'España' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'pt-PT';
const STORAGE_KEY = 'language';

const files = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, data] of Object.entries(files)) {
  const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (!match) continue;
  const [, language, namespace] = match;
  resources[language] ??= {};
  resources[language][namespace] = data;
}

const isLanguage = (value: string | null | undefined): value is LanguageCode =>
  LANGUAGES.some((l) => l.code === value);

// Stored choice; otherwise the browser's (pt-BR/pt → pt-PT, es-* → es, rest → en).
const initialLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // localStorage blocked: fall through to the browser
  }
  const browser = (navigator.language || '').toLowerCase();
  if (browser.startsWith('pt')) return 'pt-PT';
  if (browser.startsWith('es')) return 'es';
  if (browser) return 'en';
  return DEFAULT_LANGUAGE;
};

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: Object.keys(resources[DEFAULT_LANGUAGE] ?? { common: {} }),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

document.documentElement.lang = i18n.language;

export const currentLanguage = (): LanguageCode =>
  isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;

export const setLanguage = async (code: LanguageCode) => {
  await i18n.changeLanguage(code);
  document.documentElement.lang = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // without localStorage the choice only lasts until reload
  }
};

/** Locale for dates and numbers (Intl): English uses the European date format. */
export const dateLocale = (): string => {
  const language = currentLanguage();
  if (language === 'en') return 'en-GB';
  if (language === 'es') return 'es-ES';
  return 'pt-PT';
};

export default i18n;
