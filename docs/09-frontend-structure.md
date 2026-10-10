# 09 · Frontend structure

React 19, Vite, TypeScript, plain SCSS. No Tailwind, no state library, no react-query —
data lives in custom hooks on top of axios.

## Tree

The frontend is the `@gametracker/frontend` workspace of the monorepo (`apps/frontend`,
next to `apps/backend` and `packages/shared` — see [04](./04-backend-structure.md)).

```
apps/frontend/
├── index.html
├── .env.local              VITE_API_URL=http://localhost:3200 (outside git)
├── public/
│   ├── env-config.js       optional override of the API URL (empty)
│   ├── favicon.svg
│   └── downloads/          gametracker-vault.apk + android.json (written by npm run build:android, in git)
├── src/
│   ├── main.tsx            provider tree
│   ├── App.tsx             two routes: public and everything else
│   ├── App.scss            reset, app background, scrollbars, vaultPop, modal titles
│   │
│   ├── Routes/
│   │   └── Private_Routes.tsx
│   ├── Authentication/     Authentication_Check · Admin_Check · Guest_Check
│   ├── Contexts/           Auth · Theme · Alert
│   ├── Hooks/              Auth/ · Admin/ · Account/ · Ai/ · System/ · Games/ · apiMessage.ts
│   ├── Pages/
│   │   ├── Public/Index/           login
│   │   ├── Private/Main/           shell: top bar + centered content + bottom bar (phone)
│   │   ├── Private/Home/           home (random game — Random_Pick — and the shelf: four shelves of covers)
│   │   ├── Private/Search/         IGDB game search (Search · Filter_Panel · Game_Result)
│   │   ├── Private/Game/           game page (Game · Library_Panel · Time_To_Beat)
│   │   ├── Private/Stats/          shelf stats
│   │   ├── Private/Assistant/      chat with the assistant (Claude)
│   │   ├── Private/Help/           help: collapsible sections
│   │   ├── Private/Settings/       appearance (theme and language), account (Account_Section) and assistant (Ai_Card)
│   │   ├── Private/Admin/          users (create, edit, delete) + version card + IGDB card
│   │   ├── Private/Admin/Versions/ list of releases
│   │   └── Intermediary/Loading_Page/
│   ├── Components/
│   │   ├── Alerts/ Buttons/ Inputs/ Modals/ Toggles/
│   │   ├── Ai_Card/        the assistant's Anthropic key and model (Settings and Assistant)
│   │   ├── Android_Download/ APK download card, or the app in use (Help's android section)
│   │   ├── Error_Boundary/ catches a page's render errors (in Main.tsx)
│   │   ├── Game_Shelf/     horizontal shelf of covers that open each game's page
│   │   ├── Igdb_Card/      IGDB credentials (Admin page)
│   │   ├── Markdown/       safe Markdown (assistant answers and Help texts)
│   │   ├── Release_Notes/  a release's notes by section
│   │   ├── Spine/          the spine of a game box (login only)
│   │   └── Version_Card/   installed version and update (Admin page)
│   ├── Containers/
│   │   ├── Navigation/Top_Nav/   Top_Nav · Menu_Items
│   │   └── Navigation/Bottom_Nav/ navigation fixed at the bottom, only below 760px
│   ├── Assets/Icons/       22 icons, one SVG component each
│   ├── Imports/            barrels: icons · publicPages · privatePages · intermediaryPages
│   ├── Service/            httpService (axios) · endPoints · androidApp (Android app detection and the bridge)
│   ├── Styles/             Colors/ · Formats/ · Fonts · Mixins
│   ├── config/             urls
│   └── i18n/               i18next: index.ts + locales/<language>/<namespace>.json
└── vite.config.ts          port 5190 with strictPort
```

`ROLES` (the options of the role dropdown in the create/edit user modal) comes from
`@gametracker/shared`.

## Provider tree

```tsx
<StrictMode>
  <BrowserRouter>
    <ThemeProvider>        theme mode, class on the body
      <AlertProvider>      one-toast queue
        <AuthProvider>     session; does GET /auth/me on mount
          <App />
```

The order matters: `AuthProvider` is the innermost because it uses `http`, which can fire
alerts; and `ThemeProvider` is the outermost because the loading page already needs the
colors.

## Routes

`App.tsx` has two entries:

```tsx
<Route index element={<Guest_Check><Index /></Guest_Check>} />
<Route path="/*" element={<Authentication_Check><Main /></Authentication_Check>} />
```

`Main` is the `div.Vault` — the `Top_Nav` (`sticky` top bar), below it the centered
`.Vault_Content` (up to 1600px) and, finally, the `Bottom_Nav` (bar fixed at the bottom,
phone only) — and delegates to `Private_Routes`. `.Vault` defines
`--bottom-nav-height` (`0px` on desktop, `62px + env(safe-area-inset-bottom)` below
760px), is `box-sizing: border-box` and, on the phone, takes that value as
`padding-bottom`, so the end of each page sits above the bar. Full-screen pages (the
Assistant) and fixed bars (the shelf bar on the game page) subtract the same variable
(see [10](./10-frontend-pages.md#bottom_nav)):

| Path | Page |
|---|---|
| `/` (inside Main) | Home |
| `/Vault` | Home |
| `/Vault/Search` | Search (state in the query string: `?q=…&genres=…&sort=…`) |
| `/Vault/Game/:id` | Game (`:id` is the IGDB id) |
| `/Vault/Stats` | Stats |
| `/Vault/Assistant` | Assistant |
| `/Vault/Help` | Help (`#<section>` opens that section) |
| `/Vault/Settings` | Settings (anchors `#appearance`, `#account`, `#assistant`) |
| `/Vault/Admin` | Admin (inside `Admin_Check`) |
| `/Vault/Admin/Versions` | Versions (inside `Admin_Check`) |

`Main.tsx` wraps `<Private_Routes />` in `<Error_Boundary key={pathname}>`: a render
error in a page shows inside it, the navigation bars keep working, and changing page
resets the boundary. No page is loaded with `React.lazy`.

## Guards

| Guard | While loading | If it fails |
|---|---|---|
| `Authentication_Check` | `Loading_Page` | `navigate('/')` |
| `Admin_Check` | `Loading_Page` | `navigate('/Vault')` |
| `Guest_Check` | `Loading_Page` | `<Navigate to="/Vault" replace />` |

The first two redirect in a `useEffect` and return `null` in the meantime; the third
redirects during render, because it doesn't need to wait for anything.

## HTTP layer

`Service/httpService.ts` — axios instance with `baseURL` and `withCredentials: true`.

```ts
const http = axios.create({ baseURL: BASE_URL, withCredentials: true });
```

The response interceptor exists but **does nothing**: both branches return
`Promise.reject(error)`. It's the place prepared for a global redirect on 401, which was
never wired up.

`Service/endPoints.ts` is the list of routes, as functions (`Sign_In_Endpoint`,
`Logout_Endpoint`, `User_Endpoint` → `/auth/me`, `Admin_Users_Endpoint`,
`System_Version_Endpoint`, `System_Releases_Endpoint`, `System_Update_Endpoint`,
`System_Update_Status_Endpoint`, `Games_Search_Endpoint`, `Games_Filters_Endpoint`,
`Game_Detail_Endpoint(id)`, `Library_Endpoint`, `Library_Entry_Endpoint(gameId)`,
`Integration_Igdb_Endpoint`, `Integration_Igdb_Test_Endpoint`, `Library_Stats_Endpoint`,
`Library_Discover_Endpoint`, `Account_Endpoint` → `/user/me`,
`Account_Password_Endpoint`, `Admin_User_Endpoint(id)`, `Ai_Settings_Endpoint`,
`Ai_Models_Endpoint`, `Ai_Chat_Endpoint`). No component builds an API path by hand (the
search only appends the query string to `Games_Search_Endpoint()`). Internal links to a
game page (`/Vault/Game/${id}`) are frontend routes, written where they're used
(`Game_Result`, `Game_Shelf`, Home, `Random_Pick`, Stats, `Game`, `Markdown`).

The only exception to axios is the assistant chat: `useAssistantChat` uses `fetch`
(`${BASE_URL}${Ai_Chat_Endpoint()}`, `credentials: 'include'`) to read the streamed
response, line by line, and an `AbortController` to stop it.

## API URL configuration

```ts
const BASE_URL = window.__ENV__?.VITE_API_URL || import.meta.env.VITE_API_URL;
```

The normal value comes from the build: in the CT the frontend is compiled with
`VITE_API_URL=/api` (nginx forwards `/api/` to the backend, on the same origin); in
development it comes from `.env.local`. `public/env-config.js` leaves
`window.__ENV__ = {}` empty — it only serves to point an already-built bundle at another
API without recompiling.

## Inside the Android app

The Android app (see [17](./17-android-app.md)) opens this same site in a WebView.
`Service/androidApp.ts` gathers what the frontend needs to know about it:

- `isAndroidApp()` — the user agent contains `GameTrackerVaultApp` (the app appends
  ` GameTrackerVaultApp/<version> (Android)`).
- `androidBridge()` — `window.GameTrackerApp` (`changeServer()`, `version()` and, since
  app version 1.1.0, the optional `versionCode()` and `checkUpdate()`) only inside the
  app; `null` in the browser.
- `ANDROID_APK_URL` (`/downloads/gametracker-vault.apk`), `ANDROID_INFO_URL`
  (`/downloads/android.json`) and the `AndroidApkInfo` type (`version`, `versionCode`,
  `size`, `sha256`, `builtAt`).

The two files in `public/downloads/` are static: Vite copies them to `dist/` and nginx
serves them (they don't go through the API, so they use absolute paths and not
`BASE_URL`). They're written by `npm run build:android`; without them the Help card says
the APK isn't available. `Android_Download` and the `Top_Nav` account menu use this (see
[10](./10-frontend-pages.md)).

## Contexts

### `Auth_Context`
`{ authenticated, setAuthenticated, isLoading, username, role, refreshUser, logout }`.
Does `GET /auth/me` on mount; a 401 is a normal case (visitor), not an error. Only a 401
means "no session": any other failure (no network, server restarting, phone waking up)
retries the request two more times, after 1.5 s and 3 s — so as not to show the login to
someone with a valid session. If all three fail, it ends up without a session (login), as
with a 401. `logout` clears the state in a `finally`, even if the request fails.

### `ThemeContext`
`mode: 'dark' | 'light' | 'auto'`, persisted in `localStorage` under the `mode` key.
With nothing stored, the initial mode is **`light`** — light is the Vault's original
theme. It writes the class **on the `body`**: `Dark_Mode` or `Light_Mode`. In `auto`
mode, dark from 8 pm to 7 am — evaluated when the mode changes, not continuously.

Exposes `{ mode, isDark, handleDarkMode, handleLightMode, handleAutoMode }`. `isDark` is
the theme actually on screen (resolves `auto` by the time, computed on every render):
it's what `Top_Nav` and `Theme_Toggle` use to pick the icon and the next theme —
toggling from `auto` stores an explicit `dark` or `light`. Settings uses `mode`, to mark
the active option of the segmented control.

### `Alert_Context`
`{ alert: { open, message, type }, setAlert }`. A single `Simple_Alert` at the top of
`App` consumes it: it keeps a *snapshot* of the message, closes the alert in the context
right after, and runs its own enter and exit animation over 3 s.

## Hook pattern

Two families, always with the same shape.

**Plural — reading.** `useUsers`, `useReleases`, `useSystemVersion`.

```ts
const { <recurso>, loading, error, fetch<Recurso> } = useX();
```
They load on their own in a `useEffect` and return the reload function. Errors go into
`error`, **without a toast** — a screen with several lists can't fire several toasts.

**Singular — writing.** `useUser`, `useAccount`.

```ts
const { createUser, updateUser, deleteUser, loading } = useUser();
```
They return `true`/`false` (or the result, or `null`) and **fire a toast** via
`useAlert()`.

The split is deliberate: whoever reads doesn't interrupt, whoever writes confirms.

Outside these families: `useSignin` (login form), `useSystemUpdate` (requests the update
and follows it by polling), the search hooks `useGameSearch` (receives the query string,
paginates with `loadMore`, `retry`) and `useGameFilters` (`{ filters, error }`, no
reload) — reading without toast —, the game page and shelf hooks `useGameDetail`
(`{ game, error, loading }`, by id) and `useLibrary` (`{ library, error }`, no reload) —
also reading without toast —, `useLibraryEntry` (reads a game's entry without toast and
writes with toast: `save`/`remove`) and `useIgdbIntegration` (reads and writes the IGDB
credentials; toast on writes **and** on the initial read error), `useLibraryStats`
(`{ stats, failed }`, reading without toast or reload), `useDiscover` (`discover()`
requests a random game; error in `error`, no toast), `useAiSettings` (reads without
toast — error in `failed` — and writes with toast: `loadModels`, `save`, `remove`) and
`useAssistantChat` (the streamed chat, kept in `sessionStorage`). See
[10](./10-frontend-pages.md).

The newer hooks' error message comes from `Hooks/apiMessage.ts`: `apiMessage(error)`
returns the backend's `message` (the first one, if it comes as an array), otherwise the
error's, otherwise `common:errors.generic`.

## i18n

Interface in **pt-PT** (source and fallback language), **en** and **es**, with
`i18next` + `react-i18next`, set up in `src/i18n/index.ts` (imported in `main.tsx`).

- Texts in `src/i18n/locales/<language>/<namespace>.json`, all loaded with
  `import.meta.glob`. Namespaces: `common`, `nav`, `auth`, `ui`, `home`, `search`,
  `game` (game page), `library` ("My shelf" panel and status names), `stats` (Stats),
  `assistant` (Assistant and `Ai_Card`), `help` (Help — each section's `body` is
  Markdown), `settings`, `admin`, `system`. The three languages have the same keys. The
  namespaces registered in i18next are the files that exist in `pt-PT` — a new namespace
  only needs the file in the three languages.
- Components: `const { t } = useTranslation('<ns>')`; keys from another namespace with
  `t('common:actions.close')`. Outside components (alerts in hooks):
  `i18n.t('<ns>:key')`. Plurals with `_one`/`_other` and `count` (e.g. `home:count_one` /
  `home:count_other`, the count of each Home shelf).
- Constants with labels (menu, dropdown options) store the **key**, translated where
  they're drawn — so they change when the language changes.
- Dates: `toLocaleDateString(dateLocale())` (`pt-PT`, `en-GB`, `es-ES`).
- The language is chosen in Settings → Language (`setLanguage`, stored in `localStorage`
  under `language`); with no choice, it follows the browser's (`pt*` → pt-PT, `es*` → es,
  everything else → en).
- Release notes arrive from the backend already in the interface language (`?lang=`);
  the `useReleases` and `useSystemVersion` hooks request again when the language changes.
- Still in Portuguese, because they come from the backend: API error messages (including
  those from search, IGDB, the shelf, the account and the assistant/Anthropic). The
  assistant's answers come in the interface language (the request carries `language`);
  genre names in Stats come from IGDB in English. The filter option names (platforms,
  genres, …) and all the content of a game record (summary, storyline, genres, themes,
  type, video names) come from IGDB in English and aren't translated.
