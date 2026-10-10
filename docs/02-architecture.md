# 02 · Architecture

## Big picture

```
                BROWSER  or  ANDROID APP (WebView)
                             │
              httpOnly cookie │ access_token (JWT, 7 days)
                             ▼
    ┌─────────────────────────────────────────────────┐
    │  nginx :80 (static build + SPA fallback;        │
    │             /api/ → backend, prefix stripped)   │
    └─────────────────────────────────────────────────┘
                             │  REST   (127.0.0.1:3000)
                             ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      NestJS (one process)                    │
    │                                                              │
    │  Controllers ──► Services ──► helpers/ ──► repositories/     │
    │                                                │             │
    │                                                ▼             │
    │                                           PrismaService      │
    │                                                │             │
    │  SystemModule ── git (tags) ──┐                ▼             │
    │               └─ files in SYSTEM_UPDATES_DIR      PostgreSQL│
    │                               │                              │
    │  GamesModule ── IgdbClient (queue, 260 ms) ────────────────┐ │
    │  AiModule ── anthropic.client (fetch, SSE) ──────┐         │ │
    └───────────────────────────────┼──────────────────┼─────────┼─┘
                                    ▼                  ▼         ▼
                 gametracker-updater.path (root)   Anthropic  id.twitch.tv (token)
                         → update.sh               API        api.igdb.com/v4
```

Game covers and screenshots don't go through the backend: the browser loads them
directly from `images.igdb.com` (and video thumbnails from `i.ytimg.com`). The
`LibraryModule` reaches IGDB only through the `GamesService`; so does the `AiModule`
(Claude's tools run through the `GamesService`), and it reads the shelf through the
repository the `LibraryModule` exports.

The browser never talks to Anthropic: `POST /ai/chat` goes to the backend, which
decrypts the user's key, talks to the Anthropic API with streaming (SSE) and sends the
browser one JSON line per event (NDJSON) as the text arrives.

## The four backend layers

| Layer | Responsibility | Never does |
|---|---|---|
| **Controller** | Routes, guards, extracting `req.user.id`, validating via DTO | Business logic |
| **Service** | Routing to the right helper, injecting repositories | Touching Prisma |
| **Helper** | One business operation, one function per file | Being a class |
| **Repository** | Prisma access | Business rules |

`user/` follows the four layers to the letter. `system/` has no database: its helpers
talk to `git` and to files on disk, so there is no repository (see
[05](./05-backend-modules.md)). Neither does `games/`: its "repository" is the
`IgdbClient`, which the helpers receive as an argument just like they would a
repository. `integrations/` follows the four layers, plus a shared service
(`IntegrationCredentialsService`) that `games/` imports. `library/` follows the four
layers and imports the `GamesService` from `games/` to fetch from IGDB the minimal copy
of the games it stores (and, for the stats, the genres and average times). `ai/` has a
controller, service, helpers and a repository (`AiSettingsRepository`, a Prisma class
without a separate interface) and, like `games/`, an HTTP client
(`anthropic/anthropic.client.ts` — exported functions, not a class) for the Anthropic API.

## Structural decisions

### Updates without privileges
The backend runs as the `gametracker` user, without root, and **doesn't update anything
by itself**. `POST /system/update` only writes the requested version to
`$SYSTEM_UPDATES_DIR/request`. A systemd `.path` unit (root) sees the file appear and
runs `deploy/proxmox/update.sh --from-request`. Progress comes back in `status.json` and
the output in `update.log`, which the backend reads for the interface. See
[14 · Flows](./14-main-flows.md).

### Releases read from git
There's no versions table. The installed version comes from `git describe`; the releases
are the `vX.Y.Z` tags (`git for-each-ref`), and the notes come from
`releases/<version>/<language>.md` (first on `origin/main`, then on the tag), falling
back to English and finally to the tag message.

### External credentials in the database, encrypted
The IGDB credentials aren't in any environment file: the admin enters them in
Admin → Integrations and they go into the `Integration` table. The secret is encrypted
with AES-256-GCM (`utils/crypto/token-cipher.ts`) using the `TOKEN_ENCRYPTION_KEY` key,
which is the only thing kept in the environment. The plaintext secret only exists in the
backend's memory; only the last 4 characters reach the browser (`secretHint`). Changing
the key makes the stored secrets unreadable — they have to be entered again.

Each user's Anthropic key follows the same rule: `AiSettings` table, encrypted with the
same `TOKEN_ENCRYPTION_KEY`, tested against Anthropic before being saved, and only the
last 4 characters reach the browser (`keyHint`). Changing the `TOKEN_ENCRYPTION_KEY`
also forces each user to enter their key again.

### The session is confirmed against the database on every request
The JWT (`{ sub, username, role }`) only serves to say **who** you are.
`JwtStrategy.validate` reads the user from the database (`findById(sub)`) on every
authenticated request, and that's where `req.user`'s `username` and `role` come from.
This way changing the name, changing the role or deleting an account takes effect
immediately, without waiting for the token's 7 days: a deleted user gets 401
"Invalid session" on the next request. The cost is one query per request (by primary
key).

### Assistant streaming
`POST /ai/chat` doesn't return JSON: it writes to the response (`@Res()`) one line per
event (`application/x-ndjson`; `text`, `tool`, `error`, `done`) and sends it right away
(`flushHeaders`, `X-Accel-Buffering: no`; the CT's nginx already has
`proxy_buffering off`). An error before the first event goes out as a normal HTTP error;
midway, as an `error` line. If the browser closes the connection (stop, leaving the
page), an `AbortController` cancels the request to Anthropic.

### Android app: a WebView connected to the server
The Android app (`apps/android`) doesn't ship the interface inside the APK: it's a
WebView that opens the site of the server the user typed on first launch. To the backend
it's just another browser — same origin (`/` and `/api`), same httpOnly cookie, no CORS
nor new token — and the interface updates with the server. The only new piece on the
server side is the public `GET /health` (`{ app: 'gametracker-vault', ok: true }`),
which the app uses to confirm the address before saving it; the APK is a static frontend
file (`/downloads/`). See [17 · Android app](./17-android-app.md).

### Single-instance assumption (caution)
There are several pieces of state in process memory:

- `getReleases` — the time of the last `git fetch` (at most every 5 minutes) and a cache
  of the notes per commit;
- `listFilters` — the IGDB filter options, for 24 h (then still served while they're
  renewed in the background; loaded right at startup);
- `getGameDetail` — game records, 10 minutes each, up to 200;
- `IntegrationCredentialsService` — the decrypted credentials, until the admin changes
  them;
- `IgdbClient` — the Twitch token and the **queue** that spaces IGDB requests 260 ms
  apart (≈ 4 per second, the API limit).

With two instances each would do its own fetch and have its own cache (harmless), but
credential invalidation would only reach the instance that received the request, and
the two queues combined would exceed IGDB's 4 requests/s limit. Until there's more, the
rule is: **one process**. New features that keep state in memory or run on cron must
take this into account.

## Security boundaries

| Boundary | Mechanism |
|---|---|
| Browser to API | `access_token` cookie, httpOnly, `sameSite: strict`, `secure` when the request arrived over https (`req.secure`) |
| Real protocol behind the proxy | `main.ts` sets `trust proxy: 'loopback'`; the CT's nginx forwards Nginx Proxy Manager's `X-Forwarded-Proto` (or its own `$scheme`) |
| Private routes | `JwtAuthGuard` (extracts the JWT from the cookie, not the header); `JwtStrategy` confirms in the database that the user still exists and reads the name and role from there |
| Admin routes | `RolesGuard` plus `@Roles(Role.ADMIN)` — `GET/POST /user`, `PATCH/DELETE /user/:id`, all of `/system` and all of `/integrations` |
| Accounts | Changing your own password requires the current one; the admin can't delete themselves and the installation is never left without an administrator (neither by deleting nor by changing the role) |
| Integration secrets | Encrypted at rest (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`); the API only returns the `secretHint` (last 4 characters) |
| Anthropic key | Per user, encrypted like the integration secrets; only the `keyHint` goes out; the decrypted key only exists in the request to Anthropic. `POST /ai/models` receives the key in the body, never in the URL |
| Assistant text | The frontend's `Markdown` builds React elements (never raw HTML); it only follows `game:<id>`, `/Vault/…` and `http(s)` links |
| Search text | Escaped (`\` and `"`) before going into the Apicalypse query; filter ids validated as integers |
| Registration | `POST /auth/register` only with the users table empty; afterwards 403 |
| Public routes | Only `GET /`, `GET /health` (they say nothing beyond "this is a GameTracker Vault"), `POST /auth/register` and `POST /auth/login` |
| Android app | The WebView only loads the local pages and those of the saved server's host (everything else opens in the browser); the `window.GameTrackerApp` bridge only accepts `connect` (changing the saved server) from the local `setup.html` page — see [17](./17-android-app.md#the-bridge-windowgametrackerapp) |
| Backend in the CT | Listens only on `127.0.0.1` (`HOST`); the entry point is nginx |
| Updates | The backend only writes a request; the executor is a root unit that validates the `vX.Y.Z` format |

For each user's data, every helper has to confirm the owner's `userId` before reading or
writing (the `find<X>` pattern from [16](./16-conventions-and-patterns.md)). The shelf
(`library/`) does it in the query itself: the `userId` from `req.user.id` is in the key
of every read and write (`userId_gameId`), so no route reaches another user's entry. The
same goes for the stats, the random game and the assistant: they all read the shelf via
`listEntries(req.user.id)`, and `AiSettings` has `userId` as its primary key.
