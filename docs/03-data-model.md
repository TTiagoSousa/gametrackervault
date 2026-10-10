# 03 · Data model

PostgreSQL via Prisma 7 with a driver adapter (`@prisma/adapter-pg`, pool of 20
connections). Client generated to `src/generated/prisma/client` — types are imported
**from there**, never from `@prisma/client`.

File: `apps/backend/prisma/schema.prisma`

## Enums

| Enum | Values | Where it's used |
|---|---|---|
| `Role` | `USER`, `ADMIN` | `User.role`, `RolesGuard`; mirrored in `ROLES` from `@gametracker/shared` |
| `IntegrationProvider` | `IGDB` | `Integration.provider` — one value per external service |
| `LibraryStatus` | `PLAYING`, `PAUSED`, `PLAN_TO_PLAY`, `FINISHED_MAIN`, `FINISHED_EXTRAS`, `COMPLETED_100`, `DROPPED` | `LibraryEntry.status`; validated in `SaveLibraryEntryDto`; mirrored in `LIBRARY_STATUSES` in `Hooks/Games/detailTypes.ts` (the frontend doesn't import it from the backend) |
| `AiProvider` | `ANTHROPIC` | `AiSettings.provider` — the assistant's provider; for now only Claude |

Home's four shelves group the statuses: **playing** = `PLAYING` and `PAUSED`;
**finished** = `FINISHED_MAIN`, `FINISHED_EXTRAS` and `COMPLETED_100`; **up next** =
`PLAN_TO_PLAY`; **dropped** = `DROPPED`. Every status has a shelf (`SHELVES` and
`SHELF_OF` in the frontend).

## Tables

### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `username` | String unique | also with `@@index([username])` |
| `hashedPassword` | String | bcrypt, 12 rounds |
| `role` | Role | default `USER`; the **first** user becomes `ADMIN` |
| `createdAt` / `updatedAt` | DateTime | |

The password never leaves through the API: the repository returns users with a `select`
without `hashedPassword` (`PUBLIC_FIELDS`, type `PublicUser`), and the creation helpers
strip it from the result. Only `findByIdWithPassword` reads it, to confirm the current
password when changing it.

Deleting a user (`DELETE /user/:id`) cascades to the shelf (`LibraryEntry`) and the
assistant key (`AiSettings`). `JwtStrategy` reads the row on every authenticated
request, so the session's name and role are always the database's.

### `Integration`
Credentials for external services **of the installation** (not of a user) — for now only
IGDB's. One row per provider.

| Field | Type | Notes |
|---|---|---|
| `provider` | IntegrationProvider PK | the key is the provider itself: at most one row per service |
| `clientId` | String | in plaintext (the Twitch application's Client ID) |
| `secret` | String | the Client Secret **encrypted** with AES-256-GCM and the `TOKEN_ENCRYPTION_KEY` key, in the format `iv.authTag.data` (each part in base64) |
| `updatedAt` | DateTime | `@updatedAt`; shown on the Admin card |

No `createdAt` nor `userId`. Encryption happens in the helpers (`encryptToken` /
`decryptToken` from `utils/crypto/token-cipher.ts`); the repository receives and returns
the secret already encrypted and knows nothing about encryption. The plaintext secret
never leaves the backend.

### `Game`
A **minimal** copy of an IGDB game — only what the shelf, the stats and the assistant
need without going to the API. Shared by all users. The full record (game page) and
search always go to IGDB; covers always come from the IGDB CDN.

| Field | Type | Notes |
|---|---|---|
| `igdbId` | Int PK | the game's id on IGDB — the same number as in the `/games/:id` and `/library/:gameId` routes |
| `name` | String | |
| `slug` | String? | |
| `coverImageId` | String? | the cover's `image_id`; the URL (`t_cover_big`) is built in `mapEntry` |
| `releaseYear` | Int? | year of `first_release_date`, in UTC |
| `platforms` | String[] | abbreviations when they exist, otherwise the name |
| `genres` | String[] | default `[]`; IGDB genre names (in English) — for the stats and the assistant |
| `ttbMain` | Float? | average time to beat the main story, in hours (one decimal place) — `hastily` from IGDB's `game_time_to_beats` |
| `ttbExtras` | Float? | main + side content (`normally`) |
| `ttbCompletionist` | Float? | 100% (`completely`) |
| `factsCheckedAt` | DateTime? | when the genres and times were read from IGDB; `null` = never |
| `updatedAt` | DateTime | `@updatedAt` — decides when to refresh the summary |

The summary (name, cover, year, platforms, genres) is written when a shelf entry is saved
(`saveLibraryEntry`): if there's no row or it's older than **7 days**, it's requested
from IGDB (`GamesService.summary` → `getGameSummary`) and upserted. The **facts** (genres
and average times) are refreshed separately, in batch, by `refreshGameFacts` — when the
stats are requested (`GET /library/stats`) or when talking to the assistant — for games
with `factsCheckedAt` `null` or older than **7 days** (`saveGameFacts` stores them and
sets `factsCheckedAt`). The data always comes from IGDB, never from the browser. No
`createdAt`; rows aren't deleted when the last user removes the game from their shelf.

### `LibraryEntry`
A game on a user's shelf. One row per user–game pair.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | not exposed by the API — the entry is identified by `gameId` |
| `userId` | String | FK `User`, `onDelete: Cascade` |
| `gameId` | Int | FK `Game.igdbId` (no cascade: `RESTRICT`) |
| `status` | LibraryStatus | required |
| `hoursPlayed` | Float? | up to two decimal places, 0–100,000 (validated in the DTO) |
| `startedAt` / `finishedAt` | DateTime? `@db.Date` | day only; the API receives and returns `YYYY-MM-DD`. `finishedAt` can't be earlier than `startedAt` (validated in the helper) |
| `rating` | Int? | personal rating from 1 to 10 |
| `notes` | String? | up to 2000 characters; stored trimmed, empty → `null` |
| `createdAt` / `updatedAt` | DateTime | `createdAt` is the "on your shelf since"; the list is ordered by `updatedAt desc` |

Indexes: `@@unique([userId, gameId])` (the upsert and reads use the composite key
`userId_gameId`) and `@@index([userId, status])`.

Ownership is in the queries themselves: all of them carry the `userId` from
`req.user.id` in the key (`findUnique`/`upsert` by `userId_gameId`, `deleteMany` by
`{ userId, gameId }`), so nobody reads or touches someone else's entry.

### `AiSettings`
The API key and assistant model **of each user** — each one uses their own Anthropic
account. At most one row per user.

| Field | Type | Notes |
|---|---|---|
| `userId` | String PK | FK `User`, `onDelete: Cascade` — the primary key is the user itself |
| `provider` | AiProvider | default `ANTHROPIC` |
| `apiKey` | String | the key **encrypted** with AES-256-GCM and the `TOKEN_ENCRYPTION_KEY` (format `iv.authTag.data`, like `Integration.secret`); never leaves the backend |
| `keyHint` | String | the key's last 4 characters, to show which one is stored |
| `model` | String | Claude model id (e.g. `claude-sonnet-5-5`, the suggested default) |
| `updatedAt` | DateTime | `@updatedAt`; shown in `Ai_Card` |

Encryption happens in the helper (`saveAiSettings` with `encryptToken`; `savedApiKey`
with `decryptToken`); `AiSettingsRepository` only stores and returns the encrypted text
(`find`, `save` = upsert, `updateModel`, `remove` = `deleteMany`). Without a row, the API
answers `configured: false` with the suggested model.

### Rules for new tables

Domain models follow these rules (`LibraryEntry` and `AiSettings` already follow them,
except for manual ordering, which neither has):

- everything that belongs to a user carries `userId` with `onDelete: Cascade` — deleting
  a user deletes what's theirs;
- indexes on the fields used for listing (`[userId, …]`);
- manually sortable lists with an `order: Int`.

## Migrations

Four migrations in `prisma/migrations/`:

| Migration | What it does |
|---|---|
| `20261008000000_init` | `Role` enum and `User` table |
| `20261008120000_add_integration` | `IntegrationProvider` enum and `Integration` table |
| `20261009090000_add_library` | `LibraryStatus` enum, `Game` and `LibraryEntry` tables, unique index `(userId, gameId)`, index `(userId, status)` and the two foreign keys (`userId` cascade, `gameId` restrict) |
| `20261009120000_add_stats_and_ai` | columns `genres` (default `{}`), `ttbMain`, `ttbExtras`, `ttbCompletionist` and `factsCheckedAt` on `Game`; `AiProvider` enum and `AiSettings` table (foreign key `userId` cascade) |

Rule: migrations are **generated** (`npx prisma migrate dev --name <name>` inside
`apps/backend`), not hand-written. After touching the schema, `npx prisma generate` is
mandatory — the backend's `npm run build` already does it. In production they're applied
with `npx prisma migrate deploy`, which the installer and `gametracker-update` run.
