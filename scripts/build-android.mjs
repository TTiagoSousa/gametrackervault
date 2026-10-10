#!/usr/bin/env node
// Builds the signed Android APK and publishes it with the web app.
//
//   npm run build:android
//
// 1. Finds the JDK (JAVA_HOME, or a Microsoft/Temurin JDK 17+ in the usual places)
//    and the Android SDK (ANDROID_HOME, or %LOCALAPPDATA%\Android\Sdk / ~/Android/Sdk).
// 2. The first time, creates the signing keystore OUTSIDE the repository, in
//    ~/.gametracker/ (android-release.jks + android-keystore.properties, random
//    password). Back that folder up: without the same keystore, phones cannot
//    update the app — they would have to uninstall it first.
// 3. Runs gradlew assembleRelease in apps/android.
// 4. Copies the APK to apps/frontend/public/downloads/gametracker-vault.apk (served by
//    the site at /downloads/gametracker-vault.apk) and writes android.json next to it
//    (version, size, sha256) for the app's download button.
//
// Each build bumps the APK version by itself (see "version" below):
//   npm run build:android                      1.0.0 → 1.0.1, code +1
//   npm run build:android -- --version 1.1.0   sets the version name, code +1
//   npm run build:android -- --keep-version    same version (e.g. to re-sign)
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'apps', 'android');
const downloadsDir = join(root, 'apps', 'frontend', 'public', 'downloads');
const windows = process.platform === 'win32';

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

// --- JDK and SDK ---------------------------------------------------------------------------

const findJdk = () => {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const bases = windows
    ? ['C:\\Program Files\\Microsoft', 'C:\\Program Files\\Eclipse Adoptium', 'C:\\Program Files\\Java']
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    const found = readdirSync(base)
      .filter((name) => /jdk-?(1[7-9]|2\d)/.test(name))
      .sort()
      .reverse()[0];
    if (found) {
      const home = join(base, found);
      return existsSync(join(home, 'Contents', 'Home')) ? join(home, 'Contents', 'Home') : home;
    }
  }
  return null;
};

const findSdk = () => {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    windows ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : join(homedir(), 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
  ];
  return candidates.find((path) => path && existsSync(join(path, 'platforms'))) ?? null;
};

const jdk = findJdk();
if (!jdk) fail('No JDK 17+ found. Install one (e.g. winget install Microsoft.OpenJDK.21) or set JAVA_HOME.');
const sdk = findSdk();
if (!sdk) fail('No Android SDK found. Install the command-line tools and "platforms;android-35", or set ANDROID_HOME.');

// Gradle reads the SDK path from local.properties (ignored by git)
writeFileSync(join(androidDir, 'local.properties'), `sdk.dir=${sdk.replace(/\\/g, '/')}\n`);

// --- signing keystore (outside the repository) -------------------------------------------

const keyDir = process.env.GAMETRACKER_KEYSTORE_DIR ?? join(homedir(), '.gametracker');
const keystore = join(keyDir, 'android-release.jks');
const keystoreProps = join(keyDir, 'android-keystore.properties');

if (!existsSync(keystoreProps)) {
  if (existsSync(keystore)) fail(`${keystore} exists but ${keystoreProps} is missing — restore it from your backup.`);
  mkdirSync(keyDir, { recursive: true });
  const password = randomBytes(24).toString('base64url');
  const keytool = join(jdk, 'bin', windows ? 'keytool.exe' : 'keytool');
  execFileSync(keytool, [
    '-genkeypair', '-noprompt',
    '-keystore', keystore,
    '-alias', 'gametracker',
    '-keyalg', 'RSA', '-keysize', '4096',
    '-validity', '36500',
    '-storepass', password, '-keypass', password,
    '-dname', 'CN=GameTracker Vault',
  ], { stdio: 'ignore' });
  writeFileSync(
    keystoreProps,
    [
      '# Signing key of the GameTracker Vault Android app. Back up this folder:',
      '# without this key, phones cannot update the app (they must uninstall first).',
      `storeFile=${keystore.replace(/\\/g, '/')}`,
      `storePassword=${password}`,
      'keyAlias=gametracker',
      `keyPassword=${password}`,
      '',
    ].join('\n'),
  );
  console.log(`✓ Created the signing key in ${keyDir} — back that folder up.`);
}

// --- version ------------------------------------------------------------------------------
// Every build is a new APK version: versionCode +1 (that's what installed apps compare
// to offer the update) and versionName patch +1, or the one given with --version x.y.z.
// --keep-version rebuilds without changing either. A failed build restores the file.

const propsFile = join(androidDir, 'gradle.properties');
const originalProps = readFileSync(propsFile, 'utf8');
const readProp = (text, name) => new RegExp(`^${name}=(.*)$`, 'm').exec(text)?.[1]?.trim();
const args = process.argv.slice(2);
const versionArg = args.includes('--version') ? args[args.indexOf('--version') + 1] : undefined;
if (versionArg && !/^\d+\.\d+\.\d+$/.test(versionArg)) fail(`--version must look like 1.2.3 (got "${versionArg}").`);

let nextProps = originalProps;
if (!args.includes('--keep-version')) {
  const code = Number(readProp(originalProps, 'APP_VERSION_CODE')) + 1;
  const [major, minor, patch] = readProp(originalProps, 'APP_VERSION_NAME').split('.').map(Number);
  const name = versionArg ?? `${major}.${minor}.${patch + 1}`;
  nextProps = originalProps
    .replace(/^APP_VERSION_CODE=.*$/m, `APP_VERSION_CODE=${code}`)
    .replace(/^APP_VERSION_NAME=.*$/m, `APP_VERSION_NAME=${name}`);
  writeFileSync(propsFile, nextProps);
  console.log(`➜ Version ${name} (code ${code})`);
}

// --- build ----------------------------------------------------------------------------------

console.log('➜ Building the APK (the first time Gradle downloads its tools)…');
// By its relative name, inside the folder: on Windows cmd splits paths with spaces
const gradlew = windows ? '.\\gradlew.bat' : './gradlew';
try {
  execFileSync(gradlew, ['assembleRelease', '--console=plain', '-q'], {
    cwd: androidDir,
    stdio: 'inherit',
    shell: windows,
    env: { ...process.env, JAVA_HOME: jdk, GAMETRACKER_KEYSTORE_PROPERTIES: keystoreProps },
  });
} catch {
  writeFileSync(propsFile, originalProps);
  fail('The build failed — the version in gradle.properties was put back.');
}

const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(apk)) fail(`The build did not produce ${apk} (is the keystore configured?).`);

// --- publish with the web app ------------------------------------------------------------

mkdirSync(downloadsDir, { recursive: true });
const target = join(downloadsDir, 'gametracker-vault.apk');
copyFileSync(apk, target);

const prop = (name) => readProp(nextProps, name);
const bytes = readFileSync(target);
const info = {
  version: prop('APP_VERSION_NAME'),
  versionCode: Number(prop('APP_VERSION_CODE')),
  size: statSync(target).size,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  builtAt: new Date().toISOString(),
};
writeFileSync(join(downloadsDir, 'android.json'), `${JSON.stringify(info, null, 2)}\n`);

console.log(`✓ APK ${info.version} (${(info.size / 1024).toFixed(0)} KB) → apps/frontend/public/downloads/gametracker-vault.apk`);
console.log(`  sha256 ${info.sha256}`);
