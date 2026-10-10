/**
 * The Android app opens this same site in a WebView: it appends "GameTrackerVaultApp" to the
 * user agent and exposes window.GameTrackerApp (change server, version and, since
 * 1.1.0, check for updates). The newer functions are optional: an older app
 * doesn't have them.
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

/** The APK published with the site (public/downloads) and its metadata. */
export const ANDROID_APK_URL = '/downloads/gametracker-vault.apk';
export const ANDROID_INFO_URL = '/downloads/android.json';
// The same APK in the repository (a different address: inside the app it opens in the browser)
export const ANDROID_APK_REPO_URL =
  'https://github.com/TTiagoSousa/gametrackervault/raw/main/apps/frontend/public/downloads/gametracker-vault.apk';

export interface AndroidApkInfo {
  version: string;
  versionCode: number;
  size: number;
  sha256: string;
  builtAt: string;
}
