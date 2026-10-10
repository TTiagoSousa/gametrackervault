# 15 · Deploy and environment

A single **LXC container on Proxmox** (Debian 13), without Docker or Coolify. The code is public
on GitHub (`https://github.com/TTiagoSousa/gametrackervault.git` — the URL the scripts
clone). The scripts live in
`deploy/proxmox/` — the full step-by-step is in **`deploy/proxmox/README.md`**
(Portuguese copy in `deploy/proxmox/README.pt-PT.md`); here is the summary and what
matters for the code.

---

## Production: the container

```
┌─────────────────────── CT (Debian 13, unprivileged) ─────────────────────────┐
│   nginx :80 ──┬── /        → /var/www/gametracker   (frontend, files)        │
│               ├── /downloads/ → …/downloads         (Android APK, no cache)  │
│               └── /api/*   → 127.0.0.1:3000         (backend, systemd)       │
│                                    │                                         │
│                               PostgreSQL (localhost only)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Script | Where it runs | What it does |
|---|---|---|
| `ct-create.sh` | Proxmox host | creates the CT, clones the repo and checks out the version (`VERSION`: `latest` = the most recent `vX.Y.Z` tag, the default; a tag such as `v1.1.0`; or the `staging`/`develop` branch for testing — `BRANCH` is still accepted; `REPO_TOKEN` for a private repo) into `/opt/gametracker` and calls `install.sh` |
| `install.sh` | inside the CT | packages, Node, PostgreSQL, env, build, migrations, systemd, nginx, updater, backups, first user |
| `update.sh` → `gametracker-update` | inside the CT | installs a release (or a branch): fetch, checkout, `npm ci`, build, migrations, frontend, units, nginx, restart; rollback on failure |
| `config.sh` → `gametracker-config` | inside the CT | settings menu (↑/↓, Enter edits, Save writes and asks whether to restart); for now it only shows `FRONTEND_URL`; it doesn't show the database, `JWT_SECRET` or `TOKEN_ENCRYPTION_KEY`; `--raw` (or without `whiptail`) opens the file in nano and **refuses** to save if `TOKEN_ENCRYPTION_KEY` changed — it restores the previous file |
| `backup.sh` | cron, 03:30 | daily `pg_dump` to `/var/backups/gametracker`, keeps 14 days |
| `create-admin.cjs` | called by `install.sh` | creates the first ADMIN directly in the database |
| `lib.sh` | `source`d by the others | paths, build, migrations, systemd units, nginx, updater, commands |

| Piece | Where |
|---|---|
| Code | `/opt/gametracker` (user `gametracker`) |
| Configuration | `/etc/gametracker/gametracker.env` |
| Service | `gametracker.service` — `node dist/src/main.js` in `apps/backend`, `127.0.0.1:3000` |
| Updater | `gametracker-updater.path` + `gametracker-updater.service` (root), folder `/var/lib/gametracker/updates` |
| Published frontend | `/var/www/gametracker` |
| Generated credentials | `/root/gametracker-credentials.txt` |
| Backups | `/var/backups/gametracker` (`/etc/cron.d/gametracker-backup`) |

### Things that are not optional

**Node 22 from the official tarball.** `install.sh` downloads `latest-v22.x` from
`nodejs.org`, verifies the checksum and extracts it to `/usr/local` (`NODE_MAJOR` changes
the version).

**Host time zone.** `ct-create.sh` reads the Proxmox host's time zone and passes it as
`TZ_NAME` to `install.sh` (default `Europe/Lisbon`; an invalid name falls back to
`Etc/UTC`), which installs `tzdata`, points `/etc/localtime` and writes `TZ` to the
environment file — "today" dates computed on the server are in local time.

**Frontend build with `VITE_API_URL=/api`.** nginx forwards `/api/` to the backend
(stripping the prefix), so the frontend and the API share the origin. The `/api/` block
passes `X-Forwarded-Proto` (the one from Nginx Proxy Manager, or the local `$scheme`) and
has `proxy_buffering off`, `proxy_cache off` and `proxy_read_timeout 1h`, which the
assistant chat (`POST /ai/chat`, streaming NDJSON) needs — the backend also sends
`X-Accel-Buffering: no`. Nothing needs to change in nginx for the assistant. `index.html`
and `env-config.js` are served without cache; `/assets/` with immutable cache;
`client_max_body_size 300m`.

**`/downloads/` for the Android app.** The APK (`gametracker-vault.apk`) and its info
file (`android.json`) are in git, in `apps/frontend/public/downloads/`, and the frontend
build copies them to `/var/www/gametracker/downloads/`. nginx's `location /downloads/`
block (in `lib.sh`, rewritten on every install and update) gives them the right type —
`application/vnd.android.package-archive` for `.apk`, `application/json` for `.json`,
without which Android doesn't offer to install — and `Cache-Control: no-cache`, so a new
APK arrives immediately; a missing file gives 404. The CT doesn't build anything Android:
the APK is made with `npm run build:android` on a machine with a JDK and the Android SDK
(see [17 · Android app](./17-android-app.md)). The app confirms the server at
`/api/health` (the backend's `GET /health`, through the `/api/` block).

**Migrations on every install/update.** `npx prisma migrate deploy` runs inside
`apps/backend` before the service restarts.

**`npm ci --include=dev`.** The environment file has `NODE_ENV=production`, and without
the flag npm would skip the Nest CLI, Vite and TypeScript that the build needs.

**First user.** At the end, if the `User` table is empty, the installer creates the
**ADMIN** user directly in the database (`create-admin.cjs`, password hashed with bcrypt
like the app) — by default `admin`/`admin` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). It
doesn't use `POST /auth/register` because that requires an 8-character password. The
default password must be changed before exposing the app. New accounts are created in
the Admin panel (`POST /user`).

**Encryption key and IGDB.** When generating the environment file, the installer also
generates `TOKEN_ENCRYPTION_KEY` (32 random bytes in base64), with a warning never to
change it, and copies it to `/root/gametracker-credentials.txt`. The IGDB credentials do
**not** go into any file: at the end, the installer summary reminds you to configure them
in the app, in Admin → Integrations (a Twitch application,
`https://dev.twitch.tv/console/apps`). Until then the game search answers 503. Since the
environment file is only generated when it doesn't exist yet, on an installation older
than this feature the key has to be added by hand (`gametracker-config --raw`) — neither
`install.sh` nor `update.sh` adds it. See
[14 · flow 6](./14-main-flows.md#6--configure-igdb-admin).

**Assistant (Claude).** There's no installation-wide Anthropic key: each user enters
their own in Settings → Assistant, and it's stored encrypted in the database with the
same `TOKEN_ENCRYPTION_KEY`. The CT only needs to reach `https://api.anthropic.com`
(outbound https). See
[14 · flow 12](./14-main-flows.md#12--chat-with-the-assistant-claude).

**Domain.** In Nginx Proxy Manager: `<domain>` → `http://<CT IP>:80`, with SSL.
`FRONTEND_URL` (in `gametracker-config`) must be that address.

The binary is at `dist/src/main.js` and not `dist/main.js`: `tsconfig.json` declares
neither `rootDir` nor `include`, so TypeScript infers the common root of all project
files — which includes `prisma.config.ts`, at the root of `apps/backend`. That's why both
`start:prod` and the service's `ExecStart` point to `dist/src/main.js`.

---

## Releases and updates

**Branch flow:** `develop` → `staging` → `main` (merge `--no-ff`), then the release on
`main`.

**Release** = annotated tag `vX.Y.Z` on `main`, made with `scripts/release.mjs`:

```bash
npm run release -- --prepare   # writes releases/<version>/en.md from the commits
# write releases/<version>/pt-PT.md and es.md (same headings), commit on main
npm run release -- --push      # creates the tag with en.md as the message and pushes
```

- The version is bumped from the commits since the last release: `!`/`BREAKING CHANGE` →
  major, `feat` → minor, the rest → patch. The first release is `v1.0.0`.
- Notes in sections `### Features` (`feat`), `### Fixes` (`fix`), `### Improvements`
  (`perf`, `refactor` and others); `chore`, `docs`, `ci`, `test`, `style`, `build` are
  left out.
- Other options: `--dry-run`, `--version vX.Y.Z`, `--title`, `--notes <file>`,
  `--allow-branch`.
- `releases/` has `v1.0.0`.

**In the app** (Admin → Version card and Versions page, ADMIN only): installed version,
latest release, list of versions with notes in the interface language and a button to
update to any newer version.

**How it runs:** the backend (unprivileged) writes `/var/lib/gametracker/updates/request`;
`gametracker-updater.path` (root) starts `gametracker-updater.service`, which runs
`update.sh --from-request`. Progress in `status.json`, output in `update.log`, one update
at a time (`flock`). If a step fails, it checks out the previous commit, rebuilds and
restarts — the app stays on the version it had.

On the CT command line:

```bash
gametracker-update              # latest release (no releases: follows main)
gametracker-update v1.4.0       # a specific release
gametracker-update develop      # a branch (testing)
FORCE=1 gametracker-update      # rebuilds even without changes
```

## Backend environment variables

Commented template in `apps/backend/.env.example`. In the CT, `install.sh` generates
`/etc/gametracker/gametracker.env` with `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` and the
database password — only when the file doesn't exist yet.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | no | picks the `.env.<NODE_ENV>` that gets loaded; `production` in the CT |
| `HOST` | no | default `0.0.0.0`; in the CT `127.0.0.1` (only nginx talks to the backend) |
| `PORT` | no | default 3000; in the CT 3000, in development 3200 |
| `TZ` | in the CT | host time zone (`TZ_NAME`), otherwise `Europe/Lisbon` |
| `DATABASE_URL` | yes | PostgreSQL connection |
| `JWT_SECRET` | yes | signs the session |
| `FRONTEND_URL` | yes | CORS origin — must be exactly the address the app is opened from |
| `TOKEN_ENCRYPTION_KEY` | for integrations | base64 of **32 bytes** (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`); encrypts with AES-256-GCM the secrets stored in the database (the IGDB Client Secret and each user's Anthropic key). The backend starts without it, but saving or reading credentials or keys gives 500. **Never change it** after configuring: stored secrets become unreadable and have to be entered again (IGDB in Admin → Integrations, each Anthropic key in Settings → Assistant) |
| `ANTHROPIC_API_URL` | no — **tests only** | base URL of the Anthropic API (default `https://api.anthropic.com/v1`); used to point the backend at a fake server in tests. Don't set it in production |

There are no IGDB/Twitch variables or Anthropic key: the IGDB credentials are in the
database, managed by the admin in the app, and each user stores their own assistant key.

Two more that are **not** in the environment file — the systemd unit passes them:

| Variable | Purpose |
|---|---|
| `APP_DIR` | repository root, for the `system` module's `git` (in development: two levels above `apps/backend`) |
| `SYSTEM_UPDATES_DIR` | folder for the update request/status; without it (development) updates are disabled and the card says so |

`ConfigModule` loads `.env.<NODE_ENV>` and then `.env`, in that order.

The session cookie (`src/auth/session-cookie.ts`) is `secure` when the request arrived
over https (`req.secure`, with `trust proxy: 'loopback'` in `main.ts`), not based on
`NODE_ENV`: the app can be opened through the proxy with SSL or via the CT's IP over
http, and a `secure` cookie over http is never stored.

---

## Frontend

### API URL
`src/config/urls.ts` reads `window.__ENV__?.VITE_API_URL` falling back to
`import.meta.env.VITE_API_URL`. The normal value comes from the build: `/api` in the CT,
`.env.local` in development. `public/env-config.js` leaves `window.__ENV__ = {}` empty —
it's only for pointing an existing build at another API without rebuilding.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | backend base URL, no trailing slash (`/api` in production) |

---

## Local development

Monorepo with npm workspaces and a single `package-lock.json` at the root — always
install from the root.

```bash
npm install                     # the three workspaces
cd apps/backend && npx prisma migrate dev && cd ../..
npm run dev                     # shared in watch + backend + frontend
```

| Side | Address | Configuration |
|---|---|---|
| Backend | `http://localhost:3200` | `apps/backend/.env` (copy from `.env.example`): `PORT=3200`, `FRONTEND_URL=http://localhost:5190`, `DATABASE_URL`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` |
| Frontend | `http://localhost:5190` | `apps/frontend/.env.local`: `VITE_API_URL=http://localhost:3200` |

Vite is pinned to 5190 with `strictPort` — it never jumps to another port, because the
backend only accepts that origin.

Empty database: `POST /auth/register` creates the first user, who becomes **ADMIN**;
after that registration closes.

In development the `system` module reads the version and tags from the local
repository; updates are disabled (no `SYSTEM_UPDATES_DIR`).

For game search to work in development: `TOKEN_ENCRYPTION_KEY` in `.env` and the
credentials of a Twitch application entered in Admin → Integrations (they're stored in
the local database). The IGDB API is free for non-commercial use (Twitch Developer
Service Agreement). For the assistant, an Anthropic key (with credit) in Settings →
Assistant — requests to Claude are paid by that key's account.

**Windows:** editing backend files with `nest --watch` running can leave it in a crash
loop with `EADDRINUSE`. Make the changes and do a single clean restart at the end.

---

## Scripts

### Root
| Command | What it does |
|---|---|
| `npm run dev` | builds shared and starts shared (watch) + backend + frontend with `concurrently` |
| `npm run dev:backend` / `dev:frontend` | only one side (builds shared first) |
| `npm run build` | shared → backend → frontend |
| `npm run build:shared` | only `@gametracker/shared` (CommonJS + ESM) |
| `npm run lint` | lint the backend and the frontend |
| `npm run release` | `scripts/release.mjs` (see above) |
| `npm run build:android` | `scripts/build-android.mjs`: builds and signs the APK (needs JDK 17+ and Android SDK 35) and publishes it to `apps/frontend/public/downloads/` with `android.json` — see [17](./17-android-app.md) |

`@gametracker/shared` must be built before the backend or the frontend import it; the
`dev*` and `build` scripts already do that.

### Backend (`-w @gametracker/backend`)
| Command | What it does |
|---|---|
| `npm run start:dev` | `nest start --watch` |
| `npm run build` | `prisma generate && nest build` |
| `npm run start:prod` | `node dist/src/main.js` |
| `npm run lint` | ESLint with `--fix` |
| `npm run format` | Prettier |
| `npm test` | Jest — one file, `src/games/helpers/buildSearchQuery.spec.ts` (8 tests) |

### Frontend (`-w @gametracker/frontend`)
| Command | What it does |
|---|---|
| `npm run dev` | Vite (port 5190) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | serves the build |
| `npm run lint` | ESLint |

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 401 on every request / CORS error | `FRONTEND_URL` doesn't match the origin; without `credentials: true` the cookie doesn't travel |
| Login "works" but the next request gives 401 | `secure` cookie on an http request — the proxy in front doesn't pass the correct `X-Forwarded-Proto`, or the app was opened through a path other than the CT's nginx |
| 403 on `POST /auth/register` | normal — a user already exists; create accounts in the Admin panel |
| Frontend won't start in dev | port 5190 in use (`strictPort`) |
| Backend/frontend can't find `@gametracker/shared` | shared not built — `npm run build:shared` |
| Version card says updates only work on the server installation | no `SYSTEM_UPDATES_DIR` — normal in development |
| Version card says "repository unreachable" | `git fetch --tags` failed (repo unreachable from the CT, or private without credentials) |
| Update in `failed` | see the log in the modal, or `/var/lib/gametracker/updates/update.log`; the previous version keeps running |
| Backend not responding in the CT | `journalctl -u gametracker -n 100` |
| Search: "A pesquisa de jogos não está configurada…" (503) | nobody entered the IGDB credentials — Admin → Integrations |
| Search: "A Twitch rejeitou as credenciais do IGDB…" (503) | secret revoked or regenerated in the Twitch console — save the new one in Admin |
| Search: "Não foi possível contactar a Twitch…" (503) | the CT can't reach `id.twitch.tv` (network/DNS) |
| Search: "O IGDB está a limitar os pedidos…" (503) | 429 from IGDB; clears by itself |
| Assistant: "A Anthropic rejeitou a chave da API…" | key deleted or miscopied at console.anthropic.com — enter another in Settings → Assistant |
| Assistant: "A conta da Anthropic não tem crédito…" | add credit at console.anthropic.com → Billing |
| Assistant: "O modelo escolhido não existe…" | model retired or no access — "Load models" and pick another |
| Assistant: "Não foi possível contactar a Anthropic." | the CT can't reach `api.anthropic.com` (network/DNS), or `ANTHROPIC_API_URL` was left set |
| Assistant: the reply only appears at the end, all at once | something between the browser and the backend buffers the response — check `proxy_buffering off` in nginx and in Nginx Proxy Manager |
| Android app: "That address answered, but it is not a GameTracker Vault." | the address doesn't have `GET /api/health` (nor `/health`) — another site, or the Vite dev server (frontend and API on different ports; the app needs the CT's nginx) |
| Android app: "Could not reach that address." | no network, wrong address, or a home-network address used outside it |
| Help: "This installation has no APK published yet." | `apps/frontend/public/downloads/android.json` is missing from the installed code — run `npm run build:android` and commit |
| The phone refuses to install the APK over the app | `APP_VERSION_CODE` wasn't bumped, or the APK was signed with another key (`~/.gametracker/` was lost) — in the second case, only by uninstalling the app |
| 500 when opening or saving the IGDB card or the assistant key | `TOKEN_ENCRYPTION_KEY` missing, of the wrong length, or different from the one that encrypted the stored secret — restore the key (copy in `/root/gametracker-credentials.txt`) or remove and re-enter the credentials |
