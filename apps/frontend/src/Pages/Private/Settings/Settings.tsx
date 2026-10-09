import './Settings.scss';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../Contexts/ThemeContext';
import { LANGUAGES, currentLanguage, setLanguage } from '../../../i18n';
import { useAiSettings } from '../../../Hooks/Ai/useAiSettings';
import Ai_Card from '../../../Components/Ai_Card/Ai_Card';
import Account_Section from './Account_Section';

const THEMES = ['light', 'dark', 'auto'] as const;
const SECTIONS = ['appearance', 'account', 'assistant'] as const;

/**
 * Definições: um índice à esquerda (fixo) e, à direita, um cartão por secção com
 * a mesma forma — título e descrição em cima, o conteúdo por baixo. Aparência
 * (tema e língua, guardados no browser), conta (nome e password) e assistente
 * (chave e modelo do Claude).
 */
const Settings = () => {
  // O useTranslation volta a desenhar o componente quando a língua muda.
  const { t } = useTranslation('settings');
  const { mode, handleDarkMode, handleLightMode, handleAutoMode } = useTheme();
  const language = currentLanguage();
  const ai = useAiSettings();

  const apply = (key: string) => {
    if (key === 'dark') handleDarkMode();
    else if (key === 'light') handleLightMode();
    else handleAutoMode();
  };

  return (
    <div className='Settings'>
      <header className='Settings_Hero'>
        <h1>{t('title')}</h1>
      </header>

      <div className='Settings_Layout'>
        <nav className='Settings_Nav' aria-label={t('title')}>
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`}>{t(`sections.${id}`)}</a>
          ))}
        </nav>

        <div className='Settings_Content'>
          {/* --- Aparência --- */}
          <section className='Settings_Card' id='appearance'>
            <header className='Settings_Card_Head'>
              <h2>{t('sections.appearance')}</h2>
              <p>{t('appearanceDescription')}</p>
            </header>

            <div className='Settings_Block row'>
              <div className='Settings_Block_Text'>
                <h3>{t('theme.title')}</h3>
                <p>{t('theme.description')}</p>
              </div>
              <div className='Settings_Segmented' role='radiogroup' aria-label={t('theme.title')}>
                {THEMES.map((key) => (
                  <button
                    key={key}
                    type='button'
                    role='radio'
                    aria-checked={mode === key}
                    className={`Settings_Segment${mode === key ? ' active' : ''}`}
                    onClick={() => apply(key)}
                    title={t(`theme.${key}.hint`)}
                  >
                    <span className={`Settings_Swatch ${key}`} aria-hidden='true' />
                    {t(`theme.${key}.name`)}
                  </button>
                ))}
              </div>
            </div>

            <div className='Settings_Block row'>
              <div className='Settings_Block_Text'>
                <h3>{t('language.title')}</h3>
                <p>{t('language.description')}</p>
              </div>
              <div className='Settings_Segmented' role='radiogroup' aria-label={t('language.title')}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type='button'
                    role='radio'
                    aria-checked={language === lang.code}
                    className={`Settings_Segment${language === lang.code ? ' active' : ''}`}
                    onClick={() => void setLanguage(lang.code)}
                    lang={lang.code}
                    title={lang.region}
                  >
                    <span className='Settings_Code' aria-hidden='true'>{lang.code.slice(0, 2).toUpperCase()}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Account_Section />

          {/* --- Assistente: o cartão já traz o título e a descrição --- */}
          <div id='assistant' className='Settings_Anchor'>
            <Ai_Card {...ai} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
