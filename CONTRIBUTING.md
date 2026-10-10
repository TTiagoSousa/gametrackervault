# Contributing to GameTracker Vault

GameTracker Vault is a personal game log: what you're playing, what you've finished and
what you've dropped. Besides the groundwork (login, accounts, user administration,
versions/updates, theme and languages) it has IGDB search, a page for each game, a
personal shelf, stats, a random game picker, an assistant powered by Claude (each user
brings their own Anthropic API key) and a Help page.

The full documentation lives in [`docs/`](./docs) — start with its `README.md`. When you
change behaviour, update the corresponding doc in the same commit.

## Structure

```
apps/backend     NestJS 11 + Prisma 7 + PostgreSQL     (@gametracker/backend)
apps/frontend    React 19 + Vite + SCSS                 (@gametracker/frontend)
apps/android     Android app: native WebView (Java)     (Gradle project, outside npm)
packages/shared  types and constants used by both sides (@gametracker/shared)
deploy/proxmox   LXC installer (creates the CT, installs everything, updates)
releases         release notes
docs             project documentation
```

npm workspaces, with a single `package-lock.json` at the root. Always install from the
root.

## Commands (at the root)

| Command | What it does |
|---|---|
| `npm install` | installs the three workspaces |
| `npm run dev` | shared in watch mode + backend + frontend |
| `npm run dev:backend` / `dev:frontend` | only one side |
| `npm run build` | shared → backend → frontend |
| `npm run lint` | lints both apps |
| `npm run build:android` | builds and signs the APK and publishes it to `apps/frontend/public/downloads/` (see below) |

`@gametracker/shared` must be built (`npm run build:shared`) before the backend or the
frontend import it; the `dev*` and `build` scripts already do that. If you change shared
while the backend is stopped, run `build:shared` again.

## Local development

- Backend on **http://localhost:3200**, frontend on **http://localhost:5190** (the
  defaults; Vite uses `strictPort`, so it never jumps to another port — the backend only
  accepts that origin).
- `apps/backend/.env` — `PORT=3200`, `FRONTEND_URL=http://localhost:5190`,
  `DATABASE_URL`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`. Template in
  `apps/backend/.env.example`.
- `apps/frontend/.env.local` — `VITE_API_URL=http://localhost:3200`.
- **Windows:** editing backend files with `nest --watch` running can leave it in a crash
  loop with `EADDRINUSE`. Make your changes and do a single clean restart at the end.

Details, including what game search and the assistant need in development, are in
[`docs/15-deploy-and-environment.md`](./docs/15-deploy-and-environment.md).

## Database

- Changing the schema → `npx prisma migrate dev --name <name>` inside `apps/backend`.
  Against a shared database, prefer generating the SQL with
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`,
  reviewing it and applying it with `prisma migrate deploy` (`migrate dev` may ask for a
  reset).
- `npx prisma generate` after touching the schema (`build` already does it).
- The first user (ADMIN) is created with `POST /auth/register` on an empty database;
  after that registration closes and new accounts are created in the Admin panel.

## Languages (i18n)

- The interface is in **pt-PT** (source language), **en** and **es**, with i18next. The
  choice is made in Settings → Language (stored in the browser, like the theme).
- Texts live in `apps/frontend/src/i18n/locales/<language>/<namespace>.json`, one
  namespace per area (`common`, `nav`, `auth`, `ui`, `home`, `search`, `game`,
  `library`, `stats`, `assistant`, `help`, `settings`, `admin`, `system`). The three
  files of a namespace have the same keys.
- Components: `const { t } = useTranslation('<ns>')`. Outside components:
  `i18n.t('<ns>:key')` (imported from `src/i18n`). Dates:
  `toLocaleDateString(dateLocale())`.
- **Never** write visible text directly in JSX — add the key in all three languages.
- Release notes: `releases/<version>/{en,pt-PT,es}.md` (see Releases).
- Still in Portuguese, coming from the backend: API error messages.

## Conventions

- Commits in **English**, Conventional Commits with a scope: `feat(game): …`.
- Code comments and documentation in **English**.
- Repo READMEs (`README.md`, `deploy/proxmox/README.md`) in **English**, with a
  `README.pt-PT.md` translation alongside — changing one means changing both.
- Backend in four layers: controller → service → helper (one function per file) →
  repository. See
  [`docs/16-conventions-and-patterns.md`](./docs/16-conventions-and-patterns.md).
- No secrets in git: `.env` and `.env.*` are in `.gitignore`.

## Android app

`apps/android` is a native shell (a WebView, no AndroidX) that opens the site of the
server chosen on first launch — the interface always comes from the server. Full doc in
[`docs/17-android-app.md`](./docs/17-android-app.md).

- Build: `npm run build:android` (needs JDK 17+ and the Android SDK with
  `platforms;android-35`). Every build bumps the version by itself in
  `apps/android/gradle.properties` (`APP_VERSION_CODE` +1, `APP_VERSION_NAME` patch +1);
  `-- --version x.y.z` picks the name (the code is still bumped), `-- --keep-version`
  changes neither. Nothing to bump by hand.
- The APK, the `android.json` in `apps/frontend/public/downloads/` and
  `gradle.properties` go into the commit; the site serves them at `/downloads/` and the
  Help page has the download button.
- Since 1.1.0 the app updates itself (`Updater.java`): on opening it reads
  `<server>/downloads/android.json` and, if the `versionCode` is higher, offers to
  install the new APK. The APK only changes when the native shell changes; the content
  always follows the server.
- The signing key lives in `~/.gametracker/` (outside git) — it must be backed up.
- Not yet tested on a phone or an emulator.

## Deploy

Proxmox LXC, without Docker or Coolify: see
[`deploy/proxmox/README.md`](./deploy/proxmox/README.md) (Portuguese copy in
`README.pt-PT.md` alongside). The CT runs Node, PostgreSQL, nginx and the backend as a
systemd service; nginx serves the frontend and proxies `/api` to the backend. Commands
in the CT: `gametracker-update`, `gametracker-config`.

## Releases and updates

- Flow: `develop` → `staging` → `main` (merge `--no-ff`), then the release on `main`.
- Release = annotated tag `vX.Y.Z`. Notes in `releases/<version>/{en,pt-PT,es}.md`:
  `npm run release -- --prepare` generates `en.md` from the commits; write `pt-PT.md` and
  `es.md` (same `### Features/Fixes/Improvements` headings), commit on `main`, then
  `npm run release -- --push`. The app shows the notes in the interface language
  (English as fallback, then the tag message).
- The admin updates from Admin → Version card / Versions page (only to newer versions;
  never backwards). Under the hood: the backend writes `SYSTEM_UPDATES_DIR/request`, a
  `.path` unit (root) runs `deploy/proxmox/update.sh --from-request`, which rolls back if
  anything fails.
- `apps/backend/src/system` module (ADMIN only): `/system/version`, `/system/releases`,
  `/system/update`, `/system/update/status`.
