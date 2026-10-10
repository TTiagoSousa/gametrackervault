# 06 · API — endpoints

No global prefix: routes live at the root. Base in development:
`http://localhost:3200`; in production nginx serves them at `/api/…` and strips the
prefix before forwarding.

**Authentication**: `access_token` cookie (httpOnly, `sameSite: strict`, 7 days). Every
frontend request carries `withCredentials: true` (`POST /ai/chat`, which is read as a
stream with `fetch`, carries `credentials: 'include'`). The *Guard* column says what
protects each route.

The mirror of these paths in the frontend is in `src/Service/endPoints.ts` — when adding
a route, add it there too.

The API's error messages are in Portuguese (see the end of this doc); they are quoted
here in English translation.

---

## Root

| Method | Route | Guard | Response |
|---|---|---|---|
| GET | `/` | — | `"GameTracker Vault API"` — the installer uses it to wait for startup |
| GET | `/health` | — | `{ app: "gametracker-vault", ok: true }` — the Android app uses it to confirm that the typed address is a GameTracker Vault (through the CT's nginx: `/api/health`) |

## Authentication · `/auth`

| Method | Route | Guard | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ username, password }` | user without password; **403** if there are already users |
| POST | `/auth/login` | Local | `{ username, password }` | `{ message }` + **Set-Cookie** |
| POST | `/auth/logout` | JWT | — | `{ message }` + clears the cookie |
| GET | `/auth/me` | JWT | — | `{ id, username, role }` — read from the database by `JwtStrategy` (the JWT only gives the id) |

`register`: minimum 3 characters for the username, 8 for the password. Only works while
there are no users (`registerFirstUser`): creates the first one, who becomes `ADMIN`.
From then on it returns 403 and new accounts are created via `POST /user`. `login`,
`logout` and `register` return 200, not 201.

## Users · `/user`

| Method | Route | Guard | Body | Response |
|---|---|---|---|---|
| GET | `/user/me` | JWT | — | `{ id, username, role, createdAt, updatedAt }` |
| PATCH | `/user/me` | JWT | `{ username }` | the updated user (same shape); **409** "That name is already in use." |
| PUT | `/user/me/password` | JWT | `{ currentPassword, newPassword }` | **200** `{ message: "Password alterada" }`; **400** "The current password is wrong." |
| GET | `/user` | JWT + **ADMIN** | — | list with the same shape, by `createdAt` asc |
| POST | `/user` | JWT + **ADMIN** | `{ username, password, role? }` | created user, without password; 409 if the username exists |
| PATCH | `/user/:id` | JWT + **ADMIN** | `{ username?, password?, role? }` | the updated user; 404 if it doesn't exist; 409 duplicate name; **400** "There must be at least one administrator." when removing the role from the last ADMIN |
| DELETE | `/user/:id` | JWT + **ADMIN** | — | `{ message: "Utilizador apagado" }`; **400** "You can't delete your own account." or "There must be at least one administrator."; 404 if it doesn't exist |

`:id` is a uuid (`ParseUUIDPipe`, 400 if it isn't). Name (`PATCH`): 3–32 characters,
only letters, digits, `.`, `-` and `_`, trimmed; unique in the installation. New
passwords: 8–128 characters. In `PATCH /user/:id` every field is optional and only
changes if it comes in different; a blank password isn't sent. Deleting an account
deletes its shelf and assistant key, and that account's session stops being valid on the
next request (401).

## System · `/system` (ADMIN only)

All accept `?lang=pt-PT|en|es` where there are notes (any other value gives English).

| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/system/version?lang=` | — | `{ updatesEnabled, installed, latest, updateAvailable, newerCount, offline, update }`; `installed = { version, baseVersion, commit, date, branch }` — `version` is the tag when the installed code is a release |
| GET | `/system/releases?refresh=1&lang=` | — | `{ updatesEnabled, installed, offline, releases[] }` — from the newest backwards, each `{ version, date, title, notes: { features, fixes, improvements, other }, installed, newer }`; `refresh=1` forces `git fetch --tags` (otherwise at most every 5 min) |
| POST | `/system/update` | `{ version: "vX.Y.Z" }` | **202** `UpdateStatus`; 400 if the format is invalid, if it doesn't exist or isn't newer; 409 if one is already in progress; 503 without `SYSTEM_UPDATES_DIR` (development) |
| GET | `/system/update/status` | — | `{ state: idle·queued·running·success·failed, target, from, step, message, startedAt, finishedAt, log[] }` (last 40 lines of `update.log`) |

`step` follows the steps of `update.sh`: `fetch`, `build`, `migrate`, `publish`,
`configure`, `restart` (and `rollback` if something fails).

There are no routes to go back to a previous version: database migrations aren't undone.

## Games · `/games`

The IGDB catalogue. Guard **JWT** (any user with a session). All three routes fail with
503 until an admin configures IGDB at `/integrations/igdb`.

| Method | Route | Query | Response |
|---|---|---|---|
| GET | `/games/search` | `SearchGamesDto` (below) | `{ items: GameSummary[], total, page, pageSize }` |
| GET | `/games/filters` | — | `{ platforms, genres, themes, modes, perspectives, types }`, each `{ id, name }[]` in alphabetical order; 24 h cache in the backend |
| GET | `/games/:id` | — | `GameDetail` (below); 10 min cache in the backend. **400** if `:id` isn't an integer (`ParseIntPipe`, Nest's message in English); **404** "Game not found on IGDB." |

`GameSummary` = `{ id, name, slug, coverUrl, year, platforms: string[], genres: string[],
rating, ratingCount, type }` — `coverUrl` points to the IGDB CDN (`t_cover_big`) or is
`null`; `rating` is the rounded `total_rating` (0–100) or `null`; `year`, `slug` and
`type` can be `null`.

**`GET /games/search` parameters** (all optional):

| Parameter | Validation | Notes |
|---|---|---|
| `q` | string, ≤ 100 characters | with text, ordered by relevance and `sort` is ignored |
| `platforms`, `genres`, `themes`, `modes`, `perspectives`, `types` | comma-separated list of integers (`6,48,130`) | ids from `/games/filters`; "any of" within a list, "and" between lists |
| `yearFrom`, `yearTo` | integer 1950–2100 | inclusive range of release years |
| `minRating` | integer 0–100 | `total_rating >= N` |
| `sort` | `relevance`·`popular`·`rating`·`newest`·`oldest`·`name` | only without text; default `popular`. `popular` requires ≥ 1 rating, `rating` ≥ 25, `newest` excludes unreleased games |
| `page` | integer 1–500 | default 1 |
| `pageSize` | integer 1–50 | default 24 |

Parameters outside the DTO are discarded (`whitelist`). Errors: **400** if a parameter
doesn't validate; **503** IGDB unconfigured, Twitch unreachable or rejecting the
credentials, IGDB rate-limiting (429); **502** another IGDB error. Messages in
[05](./05-backend-modules.md#igdbclient).

**`GameDetail`** (response of `GET /games/:id`; how it's built in
[05](./05-backend-modules.md#game-record-getgamedetail)):

```ts
{
  id, name, slug, igdbUrl, type,        // slug, igdbUrl and type can be null
  coverUrl,                             // t_cover_big_2x, or null
  releaseDate,                          // "YYYY-MM-DD" or null
  year,                                 // or null
  summary, storyline,                   // or null
  platforms, genres, themes, modes, perspectives,
  developers, publishers, series, franchises,   // string[] (series = collections)
  ratings: {
    total, totalCount,                  // total_rating (0–100, rounded) or null; count 0 without data
    critics, criticsCount,              // aggregated_rating
    users, usersCount,                  // rating
  },
  timeToBeat: {                         // or null without IGDB data
    main, mainExtras, completionist,    // hours with 1 decimal place, or null
    count,                              // players in the average
  } | null,
  screenshots: string[],                // up to 12, t_screenshot_big
  videos: { youtubeId, name }[],        // up to 4
  parentGame: GameRef | null,           // the base game of a DLC/expansion
  dlcs: GameRef[],
  expansions: GameRef[],                // expansions + standalone
  otherVersions: GameRef[],             // remakes + remasters
  sameSeries: GameRef[],                // main games of the same series, by release
}
```

`GameRef` = `{ id, name, coverUrl (t_cover_big or null), year }`. `dlcs`, `expansions`
and `otherVersions` come by year and name; `sameSeries` by release date.

## Shelf · `/library`

The signed-in user's shelf. Guard **JWT**; each user only sees their own (the `userId`
comes from the cookie, never from the request). `:gameId` is the IGDB id, validated by
`ParseIntPipe` (400 if it isn't an integer).

`LibraryEntry` =

```ts
{
  gameId, status,                       // status: LibraryStatus
  hoursPlayed, rating, notes,           // or null
  startedAt, finishedAt,                // "YYYY-MM-DD" or null
  createdAt, updatedAt,                 // ISO
  game: { id, name, coverUrl, year, platforms },   // the minimal copy from the Game table
}
```

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/library` | — | `{ items: LibraryEntry[], counts, total }` — `items` by `updatedAt` desc; `counts` has **all seven** statuses (`{ PLAYING: n, PAUSED: n, … }`, 0 for empty ones) |
| GET | `/library/stats` | — | `LibraryStats` (below). Before answering it refreshes from IGDB the genres and average times that are missing or older than 7 days; if IGDB fails it doesn't error — `factsComplete: false` |
| GET | `/library/discover` | — | `GameSummary` of a well-rated IGDB game (main, released, with a cover, rating ≥ 75 with ≥ 40 ratings) that is **not** on the shelf; **404** "There are no games to suggest."; IGDB 503/502 |
| GET | `/library/:gameId` | — | `{ entry: LibraryEntry \| null }` — `null` if the game isn't on the shelf (not a 404) |
| PUT | `/library/:gameId` | `SaveLibraryEntryDto` (below) | `{ entry: LibraryEntry }` — creates or **replaces** the entry |
| DELETE | `/library/:gameId` | — | `{ entry: null }`; **404** "This game isn't on your shelf." if it wasn't |

**`PUT` body** — replaces the whole entry: whatever isn't sent (or is sent as `null`)
ends up empty.

| Field | Validation |
|---|---|
| `status` | required: `PLAYING`·`PAUSED`·`PLAN_TO_PLAY`·`FINISHED_MAIN`·`FINISHED_EXTRAS`·`COMPLETED_100`·`DROPPED` |
| `hoursPlayed` | number ≥ 0 and ≤ 100,000, up to 2 decimal places |
| `startedAt`, `finishedAt` | `YYYY-MM-DD` ("startedAt must be YYYY-MM-DD" / "finishedAt must be YYYY-MM-DD") |
| `rating` | integer 1–10 |
| `notes` | string ≤ 2000 characters; trimmed, and empty becomes `null` |

`PUT` errors: **400** if the DTO doesn't validate, or "The date you finished can't be
earlier than the date you started."; **404** "Game not found on IGDB." (an id that
doesn't exist on IGDB); IGDB **503**/**502** when the game copy has to be fetched (it
doesn't exist or is older than 7 days).

**`LibraryStats`** (response of `GET /library/stats`; rules in
[05](./05-backend-modules.md#stats-getlibrarystats)):

```ts
{
  total, finished,                      // finished = FINISHED_MAIN + FINISHED_EXTRAS + COMPLETED_100
  counts,                               // the seven statuses, 0 for empty ones
  completionRate,                       // % finished / (finished + dropped), or null
  hours: {
    total, logged, estimated,           // hours, 1 decimal; estimated = IGDB averages
    loggedGames, estimatedGames, missingGames,
  },
  backlog: { games, hours, missingGames },        // PLAN_TO_PLAY, by the main story average
  rating: { average, rated, distribution },       // distribution: 10 counts (ratings 1–10)
  finishedPerYear: { year, count }[],             // by ascending year
  genres: { name, count }[],                      // the 8 most frequent
  topRated:   (StatsGame & { rating })[],         // up to 5
  mostPlayed: (StatsGame & { hours, estimated })[],   // up to 5
  factsComplete,                        // false if IGDB failed during the refresh
}
```

`StatsGame` = `{ gameId, name, coverUrl, status }`.

## Assistant · `/ai`

Each user's assistant (Claude). Guard **JWT**; each one has their own key and model.
The key is never returned — only `keyHint`, the last 4 characters.

`AiSettings` = `{ provider: 'ANTHROPIC', configured, keyHint, model, updatedAt }` (with
no stored key: `configured: false`, `keyHint` and `updatedAt` `null`, `model` =
`claude-sonnet-5-5`).

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/ai/settings` | — | `AiSettings` |
| PUT | `/ai/settings` | `{ apiKey?, model }` | `AiSettings` after saving. With `apiKey`, tests it against Anthropic **before** saving (a rejected key never replaces the stored one); without it only changes the model (400 "The API key is missing." if there's no key) |
| DELETE | `/ai/settings` | — | `AiSettings` (already `configured: false`); doesn't fail if there's nothing |
| POST | `/ai/models` | `{ apiKey? }` | **200** `{ id, name, createdAt }[]` — the models the key has access to (the given one or, without it, the stored one). POST so the key doesn't end up in the URL |
| POST | `/ai/chat` | `{ messages, language? }` | **200** streamed, `application/x-ndjson` (below) |

Validation: `apiKey` 20–400 characters ("The API key looks incomplete."); `model` up to
100, `/^[a-z0-9][a-z0-9.\-_@]*$/i` ("Invalid model name."); `messages` 1–60, each
`{ role: 'user' | 'assistant', content }` with 1–12,000 characters; `language`
`pt-PT`·`en`·`es` (default `pt-PT`) — the language of the answer.

**`POST /ai/chat`.** The whole history goes in every request (the server doesn't store
conversations). The response is one JSON line per event, sent as it arrives:

| Event | When |
|---|---|
| `{ "type": "text", "text": "…" }` | a chunk of the answer (Markdown) |
| `{ "type": "tool", "name": "search_games" \| "get_game", "query": "…" }` | Claude is searching IGDB (`query` = searched text or the id) |
| `{ "type": "error", "message": "…" }` | error midway through the answer |
| `{ "type": "done" }` | end |

In answers, games with a known id come as Markdown links `[Name](game:<IGDB id>)`, which
the frontend turns into links to `/Vault/Game/<id>`. Errors **before** the stream starts
arrive as a normal HTTP response (`{ statusCode, message }`): 400 without a key ("You
haven't added your Claude key yet. Go to Settings → Assistant."), rejected key,
nonexistent model or no credit; 429 Anthropic rate-limiting; 503 unavailable; 502 other
error. Messages in [05](./05-backend-modules.md#ai). If the client closes the
connection, the request to Anthropic is cancelled.

## Integrations · `/integrations` (ADMIN only)

The installation's IGDB credentials. Guard **JWT + ADMIN** on the class. The Client
Secret is never returned — only `secretHint`, its last 4 characters.

`IgdbStatus` = `{ configured, clientId, secretHint, updatedAt }` (the last three `null`
when it isn't configured).

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/integrations/igdb` | — | `IgdbStatus` |
| PUT | `/integrations/igdb` | `{ clientId, clientSecret? }` | `IgdbStatus` after saving. Validates the credentials with Twitch **before** saving. A blank/omitted `clientSecret` keeps the stored one |
| POST | `/integrations/igdb/test` | — | **200** `{ ok: true }` or `{ ok: false, reason: 'not-configured' \| 'rejected' \| 'unreachable' }` — never an HTTP error for bad credentials |
| DELETE | `/integrations/igdb` | — | `IgdbStatus` (already `configured: false`); doesn't fail if there's nothing |

`clientId` and `clientSecret` follow `/^[a-z0-9]{20,64}$/` (messages "The Client ID
doesn't have Twitch's format" / "The Client Secret doesn't have Twitch's format"). `PUT`
errors (400): "The Client Secret is missing." (blank secret with none stored), "Couldn't
reach Twitch to validate the credentials.", "Twitch rejected the credentials — check the
Client ID and the Client Secret." Without a valid `TOKEN_ENCRYPTION_KEY`, `GET` (with
stored credentials) and `PUT` give 500.

---

## Error codes

| Code | When |
|---|---|
| 400 | Invalid DTO; non-integer id in `/games/:id` or `/library/:gameId`, or non-uuid in `/user/:id`; finish date earlier than start date on the shelf; requested version nonexistent or not newer; IGDB credentials rejected by Twitch or Twitch unreachable when saving; wrong current password; deleting your own account or leaving no administrator; assistant without a key, key or model rejected by Anthropic, account without credit |
| 401 | no cookie, expired cookie, invalid credentials; "Invalid session" if the token's account no longer exists |
| 403 | `RolesGuard` — authenticated but without the required role; `POST /auth/register` after the first user |
| 404 | `PATCH`/`DELETE /user/:id` of an account that doesn't exist; `GET /games/:id` or `PUT /library/:gameId` with an id IGDB doesn't have; `DELETE /library/:gameId` of a game that isn't on the shelf; `GET /library/discover` with no games to suggest |
| 409 | duplicate username (create, change your own name, edit by the admin); update already in progress |
| 429 | `/ai/*` — Anthropic is rate-limiting the key's requests |
| 502 | `/games/*`, `GET /library/discover` and `PUT /library/:gameId` (when it fetches the game copy) — IGDB responded with an error; `/ai/*` — Anthropic responded with another error |
| 503 | `POST /system/update` without `SYSTEM_UPDATES_DIR`; `/games/*`, `GET /library/discover` and `PUT /library/:gameId` (same) with IGDB unconfigured, Twitch unreachable or rejecting the credentials, or IGDB rate-limiting; `/ai/*` with Anthropic unreachable, overloaded or down |

The API's error messages are in Portuguese (Nest's `{ statusCode, message }`); the
frontend shows the `message`
as it comes.
