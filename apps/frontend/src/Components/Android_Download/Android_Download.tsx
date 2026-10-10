import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANDROID_APK_REPO_URL,
  ANDROID_APK_URL,
  ANDROID_INFO_URL,
  androidBridge,
  isAndroidApp,
  type AndroidApkInfo,
} from '../../Service/androidApp';
import { dateLocale } from '../../i18n';
import * as Icon from '../../Imports/icons';
import './Android_Download.scss';

/**
 * O cartão de download da app Android (na Ajuda). Lê a ficha do APK publicado
 * com o site (versão, tamanho); sem APK nesta instalação, diz isso. Dentro da
 * própria app mostra a versão e "Mudar de servidor" em vez do download.
 */
const Android_Download = () => {
  const { t } = useTranslation('help');
  const inApp = isAndroidApp();
  const [info, setInfo] = useState<AndroidApkInfo | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(ANDROID_INFO_URL, { cache: 'no-cache' })
      .then((response) => (response.ok ? (response.json() as Promise<AndroidApkInfo>) : Promise.reject(new Error('missing'))))
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (inApp) {
    const bridge = androidBridge();
    const installedCode = bridge?.versionCode?.() ?? 0;
    const updateAvailable = Boolean(info && info.versionCode > installedCode);
    const canSelfUpdate = Boolean(bridge?.checkUpdate);
    return (
      <div className='Android_Download'>
        <span className='Android_Download_Icon' aria-hidden='true'><Icon.Logo color='var(--on-accent)' /></span>
        <div className='Android_Download_Text'>
          <strong>{t('androidDownload.inApp')}</strong>
          {bridge && (
            <span>
              {updateAvailable && info
                ? t('androidDownload.updateAvailable', { installed: bridge.version(), latest: info.version })
                : t('androidDownload.version', { version: bridge.version() })}
            </span>
          )}
        </div>
        {/* A partir da 1.1.0 a app atualiza-se sozinha; uma mais antiga só pelo download */}
        {bridge && canSelfUpdate && (
          <button
            type='button'
            className={`Android_Download_Button${updateAvailable ? '' : ' ghost'}`}
            onClick={() => bridge.checkUpdate?.()}
          >
            {updateAvailable ? t('androidDownload.update') : t('androidDownload.checkUpdate')}
          </button>
        )}
        {/* Uma app antiga não descarrega ficheiros dentro dela: a ligação do
            repositório é de outro endereço, por isso abre no browser do telemóvel */}
        {bridge && !canSelfUpdate && updateAvailable && (
          <a className='Android_Download_Button' href={ANDROID_APK_REPO_URL} target='_blank' rel='noreferrer'>
            {t('androidDownload.button')}
          </a>
        )}
        {bridge && (
          <button type='button' className='Android_Download_Link' onClick={() => bridge.changeServer()}>
            {t('androidDownload.changeServer')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className='Android_Download'>
      <span className='Android_Download_Icon' aria-hidden='true'><Icon.Logo color='var(--on-accent)' /></span>
      <div className='Android_Download_Text'>
        <strong>GameTracker Vault — Android</strong>
        <span>
          {missing
            ? t('androidDownload.notAvailable')
            : info
              ? t('androidDownload.details', {
                  version: info.version,
                  size: (info.size / 1024).toLocaleString(dateLocale(), { maximumFractionDigits: 0 }),
                  date: new Date(info.builtAt).toLocaleDateString(dateLocale()),
                })
              : ' '}
        </span>
      </div>
      <a
        className={`Android_Download_Button${missing ? ' disabled' : ''}`}
        href={missing ? undefined : ANDROID_APK_URL}
        download='gametracker-vault.apk'
        aria-disabled={missing}
      >
        {t('androidDownload.button')}
      </a>
    </div>
  );
};

export default Android_Download;
