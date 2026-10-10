/**
 * A app Android abre este mesmo site numa WebView: junta "GameTrackerVaultApp" ao
 * user agent e expõe window.GameTrackerApp (mudar de servidor, versão e, a partir
 * da 1.1.0, procurar atualizações). As funções novas são opcionais: uma app
 * antiga não as tem.
 */
interface AndroidBridge {
  changeServer(): void;
  version(): string;
  versionCode?: () => number;
  checkUpdate?: () => void;
}

declare global {
  interface Window {
    GameTrackerApp?: AndroidBridge;
  }
}

export const isAndroidApp = (): boolean => /GameTrackerVaultApp/.test(navigator.userAgent);

export const androidBridge = (): AndroidBridge | null => (isAndroidApp() ? window.GameTrackerApp ?? null : null);

/** O APK publicado com o site (public/downloads) e a ficha dele. */
export const ANDROID_APK_URL = '/downloads/gametracker-vault.apk';
export const ANDROID_INFO_URL = '/downloads/android.json';
// O mesmo APK no repositório (outro endereço: dentro da app abre no browser)
export const ANDROID_APK_REPO_URL =
  'https://forgejo.home-sousa.me/Tiago/gameTrackerVault/raw/branch/main/apps/frontend/public/downloads/gametracker-vault.apk';

export interface AndroidApkInfo {
  version: string;
  versionCode: number;
  size: number;
  sha256: string;
  builtAt: string;
}
