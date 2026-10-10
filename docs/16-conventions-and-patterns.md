# 16 · Conventions and patterns

---

## Language

| What | Language |
|---|---|
| File, class, function and variable names | English |
| Commit messages | English, format `type(scope): description` |
| Release notes | `en.md` generated, `pt-PT.md` and `es.md` written by hand |
| Code comments | **English** |
| Interface text | pt-PT (source language), en and es through i18n — never text written directly in JSX |
| Android app local pages (`assets/setup.html`, `offline.html`) | pt, es and en in a `TEXT` object inside each page, by the phone's language — outside i18next, because they run before there's a server |
| API error messages | **European Portuguese** |
| Documentation (`docs/`) | **English** |
| Repo READMEs (`README.md`, `deploy/proxmox/README.md`) | **English**, with a `README.pt-PT.md` translation alongside — changing one means changing both |

## Comments

The code says **what**; the comment says **why**. The house pattern is to record the
decision and the alternative that failed:

```ts
// In the container requests arrive through the local nginx; trusting only it (loopback)
// makes req.secure reflect the https of Nginx Proxy Manager, which decides the secure cookie.
// Direct connections from other IPs still can't fake the protocol.
app.set('trust proxy', 'loopback');
```

What **not** to write:

```ts
// increments the counter        ← says what the line already says
counter += 1;
```

Block comments before a class or function explain its role in the system, not the
implementation. Warnings ("DO NOT set z-index…") sit next to the code that breaks.

---

## Naming

### Backend
| Thing | Form | Example |
|---|---|---|
| Module file | `kebab-case.type.ts` | `user.service.ts` |
| Helper | `camelCase.ts`, the function name | `createUserByAdmin.ts` |
| DTO | `kebab-case.dto.ts` | `admin-create-user.dto.ts` |
| Repository interface | `kebab-case-repository.ts` | `user-repository.ts` |
| Implementation | `prisma/prisma-<x>-repository.ts` | `prisma-user-repository.ts` |
| Class | `PascalCase` | `PrismaUserRepository` |
| Function | `camelCase`, verb first | `getInstalledVersion` |
| Module constant | `SCREAMING_SNAKE` | `SESSION_COOKIE`, `FETCH_EVERY_MS` |

### Frontend
| Thing | Form | Example |
|---|---|---|
| Component and file | `Pascal_Snake_Case` | `Admin_Create_User_Modal.tsx` |
| Component folder | same as the component | `Admin_Create_User_Modal/` |
| Sibling SCSS | same name | `Admin_Create_User_Modal.scss` |
| Hook | `camelCase` with `use` | `useSystemUpdate` |
| CSS class | `Component_prefix_element` | `.Version_Card_stat` |
| Props type/interface | `Name_Props` | `Update_Modal_Props` |
| Endpoint | `Name_Endpoint` | `System_Update_Status_Endpoint` |

One blank line between logical blocks; section comments with `// --- Title ---` in long
files.

---

## Backend patterns

### Four layers
Controller → service → helper → repository (see [02](./02-architecture.md) and
[04](./04-backend-structure.md)). `user/` is the example to copy.

### One helper, one function, one file
Everything through arguments, no state, no class. Repositories come in as parameters —
that's what makes the helper callable from anywhere (a service, another helper, a future
scheduler).

### `find<X>` is the ownership guard
In domain modules, every operation that touches a resource starts with a
`find<X>(id, userId, repo)` that throws 404 if the resource doesn't exist **or doesn't
belong to the user**. Never trust a `userId` coming from the request body — it always
comes from `req.user.id`.

When the resource is identified by the user–thing pair (like the shelf, by
`userId` + `gameId`), the guard can live in the query itself: `library/` has no separate
`find<X>` — every repository query carries the `userId` in the key (`userId_gameId`, or
`{ userId, gameId }` in `deleteMany`), and "doesn't exist" comes from the result
(`entry: null` on read, 404 on `DELETE`).

### Route order
Literal routes before parametric ones: `@Patch('reorder')` before `@Patch(':id')`.

### DTOs
`class-validator` on everything. `Update…Dto` is `PartialType(Create…Dto)`. The global
`ValidationPipe` has `whitelist: true` — undeclared fields silently disappear from the
body.

### External services
One `@Injectable()` client per service (like `IgdbClient`) that concentrates
authentication, rate limiting and translation of HTTP errors into Nest exceptions (503
when the service isn't configured or is unavailable, 502 when it answers with an error).
External service credentials go into the `Integration` table, managed by the admin, with
the secret encrypted by `encryptToken` — never into the environment file, and never
returned to the browser (at most a hint, like `secretHint`). Saving credentials validates
them with the service first. Per-user keys (the Anthropic one) follow the same rules in a
table with `userId` (`AiSettings`, `keyHint`); keys received for testing go in the body
of a `POST`, never in the query string.

### Tests
Pure helpers (no I/O) get a `<helper>.spec.ts` next to them, in Jest —
`buildSearchQuery.spec.ts` is the example. Descriptions in English.

### Errors
Nest exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`,
`ForbiddenException`, `ServiceUnavailableException`) with a message in Portuguese that
says **what to do**, not just what failed.

---

## Frontend patterns

### Hooks: plural reads, singular writes
Plural returns `{ resource, loading, error, fetchX }` and does **not** fire a toast.
Singular returns `true`/`false` (or the result, or `null`) and **does** fire a toast.
Batch write functions should accept `silent = true`, and the caller announces the total
once.

### Errors
```ts
const msg = error.response?.data?.message || error.message || i18n.t('common:errors.generic');
```
The `System/` hooks use `errorMessage(error)` from `Hooks/System/types.ts`, which also
joins the array messages from `ValidationPipe`. The newer hooks (account, admin,
assistant, random game) use `apiMessage(error)` from `Hooks/apiMessage.ts` — the first
backend message, otherwise the error's, otherwise `common:errors.generic`. This is the
pattern to follow.

### Modals
They receive `onClose` and `onSaved` (and, for editing, the record — like the `user` of
`Admin_Create_User_Modal`); the parent decides what to reload. No modal knows the page it
lives on. Delete confirmations are inline, in place of the buttons, not modals.

### Text
No visible text written in JSX: a new key in the three languages, in the area's
namespace.

### Themes
Never a hex in a component: always `var(--token)`, defined in `Colors/Tokens.scss` for
**both** themes, named by role (see [12](./12-color-palette.md)). Cards, buttons and
fields come from the Vault mixins (`Panel_Surface`, `Solid_Button`, `Ghost_Button`,
`Control_Surface` — see [11](./11-design-system.md)). Flat panels, radii by hierarchy
(`--border-radius`, `--ctrl-radius`, `--spine-radius`); shadow only on what floats, via
`--float-shadow`. Game statuses always with `--game-status-*`. Larger visual changes must
keep the Vault's own identity (see [11](./11-design-system.md)) rather than generic,
templated defaults.

### Phone
The phone breakpoint is **760px** (the same as `Top_Nav`, `Bottom_Nav` and
`Main.scss`). A page's phone adjustments go in a single
`@media (max-width: 760px)` block at the **end** of its `.scss` (`// --- Telemóvel ---`):
the rules have the same specificity as those above, so they only win if they come
after. A `@media` in the middle of the file loses against a base rule written further
down — that's how the Assistant's right column stayed visible below 980px. Media queries
for other breakpoints (980px, 1080px) that hide or show blocks follow the same rule.
Anything fixed at the bottom of the screen, or taking the full screen, subtracts
`var(--bottom-nav-height)` instead of repeating the bar's height. The JSX is the same at
every size: what only exists at one of them is always rendered and CSS hides it
(`Bottom_Nav`, the shelf bar, the suggestions inside the conversation, the `mobile-only`
class in the avatar menu) — no `matchMedia` in JavaScript.

---

## Git

A single repository (monorepo, public on GitHub: `TTiagoSousa/gametrackervault`). Branches
`develop` → `staging` → `main`; releases are annotated `vX.Y.Z` tags on `main` (see
[15](./15-deploy-and-environment.md)). Backend, frontend, Android app (`apps/android`,
with the APK in `apps/frontend/public/downloads/`), `packages/shared`, `deploy/proxmox`,
`releases/` and this documentation (`docs/`) are all versioned together.

Conventional Commits in English, with a scope:

```
feat(game): add the game library page
fix(auth): clear the session cookie with the same options it was set with
refactor(system): read release notes from releases/<version>
docs(docs): describe the update flow
```

The type decides the release: `feat` → minor, `fix`/`perf`/`refactor` → patch, `!` →
major; `chore`, `docs`, `ci`, `test`, `style`, `build` don't go into the notes.

A change that spans backend and frontend goes in a single commit; when it touches a type
or constant used on both sides, its place is `packages/shared`. New behaviour comes with
the update to the corresponding doc in the same commit.

---

## Known debt

Found while reading the code. None of this is broken; they're loose ends.

### Frontend
| Item | Detail |
|---|---|
| axios interceptor | both branches `reject` — it's a no-op |
| `useSignin` | fields named `signInEmail` but the backend authenticates by username |
| Unused tokens | `--stage-line` is defined, no component reads it (see [12](./12-color-palette.md#currently-unused)) |
| Unused `Simple_Button` | no screen imports it (the login has its own `Login_Submit`) |
| Literal radii | some components still use fixed radii instead of tokens: Versions items (18px), toast (16px), `Version_Card` readouts (14px), Admin role pill (999px), status label on the Home covers (6px) |
| Unused icon | `Star` is in `Imports/icons.ts` but nothing draws it (`Home` and `Settings` are now used by `Bottom_Nav` and by Admin in the avatar menu, `Profile` and `Pencil` by the account menu and Admin, and `World` by the Android app's "Change server") |
| Phone not tested on a device | the phone layout (bottom bar, shelf sheet, `env(safe-area-inset-bottom)`, `100svh` with the browser bar appearing and disappearing, keyboard over the Assistant's input box) has only been seen in the desktop browser at reduced width, not on a phone nor in the Android app |
| Shelf sheet without focus management | the game page's sheet (below 1080px) has `role="dialog"` and `aria-modal`, but doesn't move focus inside on open, doesn't trap it and doesn't return it to the bar on close; it can't be closed by dragging the handle (it's decorative only) |
| Admin in the menu with the Settings icon | the `mobile-only` Admin item uses `Icon.Settings`, the same as Settings in the bottom bar |
| `nav:sidebar.*` keys | `menu`, `search`, `lightMode`, `darkMode`, `account`, `assistantKey`, `help`, `androidApp`, `changeServer` and `logout` are used by `Top_Nav` (`menu` and `search` also by `Bottom_Nav`); the prefix is a leftover from the sidebar that no longer exists |
| Native controls in search | "Sort by" is a native `<select>` and the year filter `<input type="number">`, instead of `Global_Dropdown` / `Global_Input`; a year outside 1950–2100 stays in the URL but is silently ignored |
| Literal radii (search and IGDB) | the `Game_Result` rating badge and the `Igdb_Card` status pill use a fixed 8px |
| Hooks outside the families | `useGameSearch`/`useGameFilters`/`useGameDetail`/`useLibrary` don't follow the `{ resource, loading, error, fetchX }` shape (`useLibrary` has neither `loading` nor reload); `useIgdbIntegration` mixes reading and writing and toasts on read errors; `useLibraryEntry` also mixes (reads without toast, writes with toast), as does `useAiSettings`; `useLibraryStats` returns `{ stats, failed }` without `loading` or reload; `useDiscover` and `useAssistantChat` have their own shapes |
| Status colours outside the tokens | in the shelf panel and on Home, `PLAN_TO_PLAY` uses `--accent` (against the "never the accent for a status" rule; on Home it's the colour of the "To play" shelf), `PAUSED` `--text-soft` and `DROPPED` `--danger-color` ("Dropped" shelf) — there's no `--game-status-*` for these three |
| Play time colours | the `Time_To_Beat` bars use the status colours with another meaning: "Main story" in `--game-status-playing` (yellow), although the `FINISHED_MAIN` status is `--game-status-finished` (green) |
| Duplicated statuses | `LIBRARY_STATUSES` (frontend, `detailTypes.ts`) copies the Prisma `LibraryStatus` enum by hand, instead of coming from `packages/shared` like `ROLES` |
| Literal radii (game page) | shelf panel rating buttons (8px), `Game_Shelf` count (6px), play time bars (4px) |
| Literal radii (new pages) | Stats legend keys (3px), spines of the per-year stacks (3px), hours and ratings bars (4px), Assistant search pills and the Help "Admin only" label (6px) |
| Conversation only in the browser | the assistant history lives in `sessionStorage` (`assistant-chat:<username>`): it's lost when the tab closes, doesn't move to another device and there's no conversation list. Each question resends the last 40 messages in full |
| Minimal `Markdown` | no tables, quotes, images, nested lists or HTML; a model reply with a table shows as text with pipes |
| Native controls in `Ai_Card` | provider and model are native `<select>`s, not `Global_Dropdown`; the account and `Ai_Card` fields are `<input>`s with `Control_Surface`, not `Global_Input` |
| Retries in `Auth_Context` | `refreshUser` repeats `GET /auth/me` twice (1.5 s and 3 s) on any error other than 401; with the server down, the loading page stays up to ~4.5 s and ends at the login, without saying the problem is the connection. It also delays `changeUsername` when the network fails |
| Two `useAiSettings` instances | Settings and Assistant each read the settings; saving in one only shows in the other when it's reopened |

### Backend
| Item | Detail |
|---|---|
| Few tests | Jest configured (with `src/…` mapped); two `.spec.ts`: `buildSearchQuery` and `estimateHours` (15 tests in total). The rest of the helpers have no tests — including the pure `mapGameDetail`, `mapEntry` and `buildSystemPrompt`, the date rule in `saveLibraryEntry`, the maths in `getLibraryStats`, the "last administrator" rules in `updateUserByAdmin`/`deleteUserByAdmin` and the tool loop in `streamChat` (and the SSE parser in `anthropic.client`) |
| Game detail cache by insertion order | at 200 games the first one in goes out, not the least used; expired entries aren't removed — they take up space until replaced (the same id requested again) or they reach the front of the queue |
| Unused field | `IgdbGameDetail.artworks` is declared in `mapGameDetail.ts` but isn't requested in `DETAIL_FIELDS` nor used |
| Orphaned game copies | `Game` rows are never deleted — removing the last user of a game leaves the copy (and the `RESTRICT` FK would prevent deleting it while entries existed) |
| 401 retry outside the queue | when IGDB answers 401, `IgdbClient` retries the request immediately, within the same queue turn, without waiting the 260 ms |
| `LoginDto` | exists but the controller uses `LocalAuthGuard`, which reads from the body directly |
| `compare.passwords.ts` | `comparePasswords` is only used by `changeOwnPassword`; `validateUser` still calls `bcrypt.compare` directly |
| `ai/` outside the four layers | `AiSettingsRepository` is a Prisma class without an interface (`repositories/ai-settings-repository.ts`, no `prisma/`); the Anthropic client is loose functions, not an injectable provider; `aiSettings.ts` has four functions in one file |
| Logic in the service | `LibraryService.discover` reads the shelf and calls `games.random` without its own helper |
| Inconsistent name validation | `PATCH /user/me` and `PATCH /user/:id` require 3–32 characters without spaces (`/^[\p{L}\p{N}._-]+$/u`), but `register` and `POST /user` only require 3 characters — you can create a name that then can't be saved without changing it |
| One query per request | `JwtStrategy` reads the user from the database on every authenticated request (by primary key — cheap, but uncached) |
| Facts refreshed on a GET | the first `GET /library/stats` (or the first question to the assistant) for a large shelf goes to IGDB and saves the facts one by one (`saveGameFacts` per game, no transaction) before answering |
| Random game query | `getRandomGame` puts all shelf ids in an `id != (…)`; with very large shelves the Apicalypse query grows without limit |
| Whole shelf in the prompt | `buildSystemPrompt` sends up to 400 games with every question — token cost to the user's account, without prompt caching |

### Cross-cutting
| Item | Detail |
|---|---|
| Single instance | see [02 · Architecture](./02-architecture.md) |
| Android app not tested on a device | the APK was built and the signature verified (`apksigner`, `aapt2`), but it never ran on a phone or emulator — first launch, login, offline mode, "Change server", the Android 15 insets and automatic updates (`Updater`: dialog, `PackageInstaller`, sha256, system confirmation) are still to be checked. There are no automated tests for the app ([17](./17-android-app.md#tests)) |
| APK in git | `apps/frontend/public/downloads/gametracker-vault.apk` is a versioned binary: each new app version adds ~27 KB to the history. It's the price of the CT not needing a JDK or Android SDK |
| Every build bumps the app version | `npm run build:android` always bumps `APP_VERSION_CODE` and `APP_VERSION_NAME` (except with `--keep-version`), so building several times before publishing skips numbers; `gradle.properties` must go in the commit with the APK |
| Signing key on a single machine | the keystore lives in the builder's `~/.gametracker/`; without a backup, losing it forces every phone to uninstall the app ([17](./17-android-app.md#npm-run-buildandroid)) |
| Hard-coded suggested models | `DEFAULT_MODEL` (`claude-sonnet-5-5`, backend) and `SUGGESTED_MODELS` (`Ai_Card`, frontend) are written by hand in two places; when Anthropic retires these ids they must be changed in both (or moved to `packages/shared`) |

---

## Before opening a PR

- [ ] `npm run lint` passes (at the root: backend and frontend — the frontend still has 13 errors inherited from MyHomeLab, all in contexts and hooks: 6 `react-hooks/set-state-in-effect` in the fetch hooks, 4 `no-explicit-any` and 3 `react-refresh/only-export-components`)
- [ ] `npm run build` passes (at the root: shared → backend → frontend; the backend runs `prisma generate` first)
- [ ] `npm test -w @gametracker/backend` passes
- [ ] No new hex outside `Colors/Tokens.scss`
- [ ] New endpoints registered in `Service/endPoints.ts` and in [06](./06-api-endpoints.md)
- [ ] New texts in the three languages (`pt-PT`, `en`, `es`)
- [ ] New comments and docs in English; new comments explain the why
- [ ] Touched the schema? Migration generated and `prisma generate` run
- [ ] Touched `apps/android`? `npm run build:android` run (it bumps the version by itself) and the new APK, `android.json` and `gradle.properties` go in the same commit
