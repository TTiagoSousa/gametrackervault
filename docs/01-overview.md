# 01 · Overview

## What it is

GameTracker Vault is a personal game log: what you're playing, what you finished and
what you beat. Accessed through the browser, installed in a Proxmox LXC container.

**Current state: foundation + search + game page + shelf + stats + assistant + Android
app.** Games come from the IGDB catalogue: you search, open a game's page and put it on
your personal shelf, with a status, hours, dates, rating and notes. What's there:

- **Session** — login with username and password, httpOnly cookie with a JWT. The token
  only says who you are: the name and role are read from the database on every request.
- **Your own account** (Settings → Account) — each user changes their name and their
  password (with the current one).
- **Users** — `USER` and `ADMIN` roles; the admin lists, creates, edits (name, role, new
  password) and deletes accounts — never their own nor that of the last administrator.
- **Versions and updates** — the admin sees the installed version, the releases with
  notes, and updates the installation from inside the app.
- **Preferences** — theme (night, day, automatic) and language (pt-PT, en, es), saved
  in the browser.
- **Game search** (`/Vault/Search`) — text and filters (platform, genre, theme, mode,
  perspective, type, year, minimum rating) over the IGDB API; covers from the IGDB CDN,
  nothing stored locally. Each result opens the game page.
- **Game page** (`/Vault/Game/:id`) — the IGDB record: cover, production, ratings
  (overall, critics, players), average time to beat (story, with extras, 100%), summary
  and storyline, details, images and videos (YouTube), and shelves of expansions, DLCs,
  other versions and games from the same series. Beside it, the **"My shelf"** panel.
- **Shelf** — each user puts a game in one of seven statuses (playing, paused, play
  later, main story finished, with extras, 100%, dropped), with hours played, start and
  finish dates, a 1–10 rating and notes. Only a minimal copy of the game is stored
  (name, cover, year, platforms, genres and the average times to beat); the rest of the
  record always comes from IGDB.
- **Integrations** — the admin stores the IGDB credentials (a Twitch application) in
  Admin; the secret is encrypted in the database.
- **Home** (`/Vault`) — "Not sure what to play?" (a random game from your own list —
  play later and paused — or a well-rated IGDB game that isn't on the shelf yet) and,
  below, the shelf as four shelves (playing, finished, up next, dropped), with each
  game's cover, which opens its page.
- **Stats** (`/Vault/Stats`) — hours (the ones entered and, for finished games without
  hours, the IGDB average, marked as estimated), games per status, completion rate,
  what's left to play, finished per year, ratings, most played genres, the most played
  and the best rated.
- **Assistant** (`/Vault/Assistant`) — a chat with Claude that knows the user's shelf
  and searches IGDB to recommend and answer questions about games. Each user enters
  their own Anthropic key (Settings → Assistant); the key is encrypted in the database.
- **Help** (`/Vault/Help`) — collapsible sections: the Android app (with the download
  button), Claude and the key, the models, the stats, the shelf, the account and, for
  admins only, IGDB and the code (GitHub).
- **Android app** (`apps/android`) — a native shell (Java, one WebView) that opens the
  site of the server the user picks on first launch; login is the same cookie as the
  browser and the interface updates with the server. The APK (~19 KB) is built with
  `npm run build:android`, goes into git with the frontend and is downloaded from Help.
  Not yet tested on a phone — see [17 · Android app](./17-android-app.md).

The IGDB API is free for non-commercial use, under the terms of the Twitch Developer
Service Agreement — each installation uses its own Twitch application.

## Pieces

A single repository (public on GitHub, `TTiagoSousa/gametrackervault`), a monorepo with npm workspaces:

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  apps/frontend               │        │  apps/backend                │
│  React 19 · Vite · SCSS      │◄──────►│  NestJS 11 · Prisma 7        │
│  nginx in production         │  REST  │  PostgreSQL                  │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
               └──────── packages/shared ──────────────┘
                         (types and constants: ROLES)

┌──────────────────────────────┐
│  apps/android                │  WebView that opens the server's site
│  Java · no AndroidX          │  (same origin: / and /api)
└──────────────────────────────┘
```

| Folder | Workspace | What |
|---|---|---|
| `apps/backend` | `@gametracker/backend` | API: modules `prisma`, `auth`, `user`, `system`, `games`, `integrations`, `library`, `ai` |
| `apps/frontend` | `@gametracker/frontend` | SPA: login, Home, Search, Game, Stats, Assistant, Help, Settings, Admin, Versions |
| `packages/shared` | `@gametracker/shared` | shared constants (for now only `ROLES`/`Role`) |
| `apps/android` | — (Gradle project; no `package.json`, npm ignores it) | Android app: WebView connected to the server — see [17](./17-android-app.md) |
| `deploy/proxmox` | — | LXC installer — see [15 · Deploy and environment](./15-deploy-and-environment.md) |
| `scripts/release.mjs` | — | creates the releases (`vX.Y.Z` tags) |
| `scripts/build-android.mjs` | — | `npm run build:android`: builds, signs and publishes the APK to `apps/frontend/public/downloads/` |
| `releases/` | — | notes for each version (`v1.0.0`) |

## Numbers

| | Backend | Frontend |
|---|---|---|
| Lines of TS/TSX | ~4,500 (excluding the generated Prisma client) | ~5,800 (plus ~5,500 of SCSS) |
| Source files | 99 (+1 spec) | 95 |
| Modules / Pages | 8 modules | 11 pages (Index, Main, Home, Search, Game, Stats, Assistant, Help, Settings, Admin, Versions) |
| Tests | 1 file, 8 tests (`buildSearchQuery.spec.ts`) | 0 |

## What it is **not** (yet)

- It isn't an IGDB mirror: the database has `User`, `Integration`, `Game` (the minimal
  copy of games that are on some shelf), `LibraryEntry` and `AiSettings` (each user's
  assistant key and model). Search and the game page always go to the API; there's no
  play-session history nor custom lists beyond the shelf.
- Assistant conversations aren't kept on the server: they live in the browser tab
  (`sessionStorage`) and are lost when it's closed.
- Two external services: IGDB (via Twitch, installation credentials) and the Anthropic
  API (each user's key, only for the assistant). No schedulers or background work — the
  games' genres and average times are refreshed when the stats are opened or when
  talking to the assistant.
- It doesn't scale horizontally without work: the releases cache (`getReleases`), the
  filter options cache (`listFilters`), the game records cache (`getGameDetail`), the
  credentials cache (`IntegrationCredentialsService`),
  the Twitch token and the IGDB request queue all live in process memory — see
  [02 · Architecture](./02-architecture.md).
