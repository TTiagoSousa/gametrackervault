import './Settings.scss';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../Contexts/ThemeContext';
import { LANGUAGES, currentLanguage, setLanguage } from '../../../i18n';

// O que se escolhe aqui é o tema e a língua; ficam guardados no browser.
const THEMES = ['light', 'dark', 'auto'] as const;

const Settings = () => {
  // O useTranslation volta a desenhar o componente quando a língua muda.
  const { t } = useTranslation('settings');
  const { mode, handleDarkMode, handleLightMode, handleAutoMode } = useTheme();
  const language = currentLanguage();

  const apply = (key: string) => {
    if (key === 'dark') handleDarkMode();
    else if (key === 'light') handleLightMode();
    else handleAutoMode();
  };

  return (
    <div className='Settings'>
      <header>
        <div className='Right_Side'>
          <span>{t('title')}</span>
        </div>
      </header>

      <div className='Settings_list'>
        <div className='Settings_row'>
          <div className='Settings_row_text'>
            <span className='Settings_row_title'>{t('theme.title')}</span>
            <p className='Settings_row_description'>{t('theme.description')}</p>
          </div>

          <div className='Settings_segmented' role='radiogroup' aria-label={t('theme.title')}>
            {THEMES.map((key) => (
              <button
                key={key}
                type='button'
                role='radio'
                aria-checked={mode === key}
                className={`Settings_segment${mode === key ? ' active' : ''}`}
                onClick={() => apply(key)}
                title={t(`theme.${key}.hint`)}
              >
                <span className={`Settings_swatch ${key}`} aria-hidden='true' />
                {t(`theme.${key}.name`)}
              </button>
            ))}
          </div>
        </div>

        <div className='Settings_row'>
          <div className='Settings_row_text'>
            <span className='Settings_row_title'>{t('language.title')}</span>
            <p className='Settings_row_description'>{t('language.description')}</p>
          </div>

          <div className='Settings_segmented' role='radiogroup' aria-label={t('language.title')}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type='button'
                role='radio'
                aria-checked={language === lang.code}
                className={`Settings_segment${language === lang.code ? ' active' : ''}`}
                onClick={() => void setLanguage(lang.code)}
                lang={lang.code}
                title={lang.region}
              >
                <span className='Settings_code' aria-hidden='true'>{lang.code.slice(0, 2).toUpperCase()}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
