# 14 · Main flows

End-to-end paths, from the click to the database. The game flows: search (5), the IGDB
configuration everything depends on (6), opening a game page (7), adding, changing or
removing a game from the shelf (8), stats (10) and the random game (11). Account and
users in (9); the assistant (Claude) in (12); the Android app in (13).

---

## 1 · Sign in

```
Index.tsx  →  useSignin.signin()
    POST /auth/login { username, password }
        LocalAuthGuard → LocalStrategy.validate
            AuthService.validateUser → validateUser → userRepository.findByUsername
                bcrypt.compare
                    returns the user without hashedPassword   (otherwise 401 "Credenciais inválidas")
        AuthService.login → loginUser → jwt.sign({ sub, username, role })   (7 days)
        res.cookie('access_token', token, { ...sessionCookieOptions(req), maxAge: 7 days })
            secure = req.secure  (https from the proxy, via trust proxy + X-Forwarded-Proto)
    ← 200 { message }

    toast + 300 ms + window.location.href = '/Vault'
        full reload → AuthProvider mounts → GET /auth/me
            JwtAuthGuard → JwtStrategy reads the cookie → findById(sub) in the database
                → { id, username, role } from the database   (deleted account → 401)
        ← { id, username, role }   →  authenticated = true
```

The full reload is deliberate: it makes the `AuthProvider` re-evaluate the session from
scratch instead of trusting local state.

---

## 2 · First user

```
Installation in the CT (install.sh)
    SELECT count(*) FROM "User" = 0 ?
        create-admin.cjs  →  INSERT ADMIN (bcrypt 12)   default admin/admin

Development (empty database)
    POST /auth/register { username, password }
        registerFirstUser
            userRepository.count() > 0  →  403 "O registo está fechado…"
            otherwise createUser        →  first user = ADMIN

From then on
    Admin → "+ New user" → Admin_Create_User_Modal
        POST /user { username, password, role }   (JWT + RolesGuard ADMIN)
            createUserByAdmin → 409 if the username exists
        onSaved → fetchUsers()
    (editing and deleting accounts: flow 9)
```

The installer doesn't use `POST /auth/register` because the default password (`admin`)
doesn't pass the 8-character validation. It must be changed before exposing the app.

---

## 3 · Update the installation from the app

```
browser                                backend (unprivileged)               CT (root)
──────────────────────────────────────────────────────────────────────────────────────────
Admin → Version_Card
  GET /system/version?lang=  ───────►  getVersionOverview
                                         getInstalledVersion  (git describe)
                                         getReleases          (git fetch ≤ 5 min, tags v*)
                                         readUpdateStatus(0)
  ◄────────────────────────────────── { installed, latest, updateAvailable, … }

"Update to vX.Y.Z" → Update_Modal
  GET /system/update/status  ───────►  (keeps the startedAt of the previous run)
  POST /system/update {version} ────►  requestUpdate
                                         503 without SYSTEM_UPDATES_DIR
                                         409 if queued/running
                                         400 if it doesn't exist or isn't newer
                                         writeUpdateRequest → $DIR/request
  ◄────────────────────────────────── 202 { state: 'queued' }
                                                              gametracker-updater.path
                                                                sees the request
                                                              update.sh --from-request
                                                                deletes the request, flock
                                                                fetch → checkout the tag
                                                                build → migrate → publish
                                                                → configure → restart
                                                                status.json at each step
  every 2 s:
  GET /system/update/status  ───────►  readUpdateStatus (status.json + update.log)
     (failure during the restart → "restarting", not an error)
  state = success?
     GET /system/version  ──────────►  installed.version === target?
  done → reloads the page after 2.5 s
```

If a step fails, `update.sh` checks out the previous commit, rebuilds, publishes and
restarts — the app stays on the version it had, and `status.json` says `failed` with the
step.

Forward only: the backend refuses versions equal to or older than the installed one,
because database migrations can't be undone.

---

## 4 · Change theme and language

```
Startup
    ThemeProvider: mode = 'light'   →  localStorage.mode, if present, overrides it

Settings → Day/Night/Auto segmented control
(or Top_Nav → sun/moon button: toggles between day and night based on isDark)
    useTheme().handleXMode()
        localStorage.mode = 'dark' | 'light' | 'auto'
        body.className = Dark_Mode | Light_Mode   (auto: dark from 20:00 to 07:00)
            every var(--token) changes value

Settings → language segmented control
    setLanguage(code)
        i18n.changeLanguage, <html lang>, localStorage.language
            components with useTranslation re-render
            useReleases / useSystemVersion fetch again (notes in the new language)
```

Nothing goes to the server: both preferences live in the browser.

---

## 5 · Search games

```
Top_Nav → magnifier  →  /Vault/Search?…        (all state in the query string)
  (phone: Bottom_Nav → Search)

Search mounts
    useGameFilters  →  shows the saved list immediately (memory / localStorage)
                    saved < 1 h ago?  →  requests nothing
                    otherwise GET /games/filters (JWT), in the background
        listFilters: cached?  →  returns it (if > 24 h old, refreshes behind the scenes)
        otherwise 6 IGDB queries (platforms, genres, themes, game_modes,
              player_perspectives, game_types) through the IgdbClient queue → cache
        (the backend already loaded it at startup, so there's almost never a wait)
    ◄── { platforms, genres, … }  →  Filter_Panel and names of the active chips

Type "zelda"
    local state  →  400 ms without keystrokes  →  setParams({ q: 'zelda' }, replace)
Pick a filter / year / rating / order
    setParams(...) directly, replace

URL changes  →  apiQuery (valid values only; sort only without text)
    useGameSearch(apiQuery)  →  GET /games/search?q=zelda&platforms=130
        ValidationPipe → SearchGamesDto  (400 if invalid)
        searchGames → buildSearchQuery
            with text:    search "zelda"; where platforms = (130);  (no sort)
            without text: where … & <order condition>; sort …;
                        popular → (none: the whole catalogue)
                        rating  → total_rating_count >= 25
                        newest  → first_release_date <= now
        IgdbClient.query('games', query)          ┐ each one through the queue (≥ 260 ms
        IgdbClient.query('games/count', count)    ┘ between requests)
            credentials ← IntegrationCredentialsService (cache)   503 if none
            Twitch token in memory (new one if it expires, if the credentials change
                                    or if IGDB answers 401 → retries once)
            POST https://api.igdb.com/v4/<endpoint>   (Client-ID + Bearer)
                429 → 503 · other error → 502
        mapGame → coverUrl = images.igdb.com/…/t_cover_big/<id>.jpg
    ◄── { items, total, page, pageSize }

    Game_Result grid  →  the browser fetches the covers from the IGDB CDN
"Show more"  →  loadMore → same query with page+1 → appends to items
```

Results of an old query that arrive late are ignored (each result keeps the query it
answers). With IGDB not configured, the page shows the 503 error with the message asking
an admin to configure it.

---

## 6 · Configure IGDB (admin)

```
Prerequisite: an application in the Twitch console (dev.twitch.tv/console/apps),
type Confidential → Client ID + Client Secret.

Admin → Igdb_Card
    useIgdbIntegration  →  GET /integrations/igdb     (JWT + ADMIN)
        getIgdbStatus: find(IGDB) → decrypt → last 4
    ◄── { configured, clientId, secretHint, updatedAt }

"Save"  →  PUT /integrations/igdb { clientId, clientSecret? }
    SaveIgdbDto: /^[a-z0-9]{20,64}$/                        (400 if it doesn't match)
    saveIgdbCredentials
        secret blank?  →  decrypts the stored one  (400 "Falta o Client Secret." if none)
        requestTwitchToken(clientId, secret)
            network error → 400 "Não foi possível contactar a Twitch…"
            400/401/403   → 400 "A Twitch rejeitou as credenciais…"
        encryptToken(secret)  (AES-256-GCM, TOKEN_ENCRYPTION_KEY)
        upsert Integration { provider: IGDB, clientId, secret: iv.tag.data }
    IntegrationsService → credentials.invalidate(IGDB)
    ◄── IgdbStatus  →  toast "IGDB credentials saved"

Next search
    IntegrationCredentialsService reads from the database again and decrypts
    IgdbClient sees credentials different from the token's → requests a new Twitch token

"Test connection"  →  POST /integrations/igdb/test
    testIgdbCredentials → requestTwitchToken with the stored ones
    ◄── 200 { ok: true } | { ok: false, reason }   →  toast

"Remove credentials" → confirm  →  DELETE /integrations/igdb
    deleteMany + invalidate  →  search starts returning 503
```

Credentials don't go through environment files: the only thing in the environment is
`TOKEN_ENCRYPTION_KEY`, generated by the installer (see
[15](./15-deploy-and-environment.md)).

---

## 7 · Open a game page

```
Search → Game_Result (Link)              ┐
Home → cover on a shelf (Link)           ├─→  /Vault/Game/1942
Game page → cover in a Game_Shelf        │
            or "Part of …"               │
Random game, Stats, a game:<id> link     │
  in an assistant reply                  ┘

Game mounts  (gameId = Number(params.id))
    useGameDetail(1942)   →  GET /games/1942          (JWT)
        ParseIntPipe  (400 if not an integer)
        getGameDetail
            cache < 10 min?  →  returns it
            IgdbClient.query('games', fields DETAIL_FIELDS; where id = 1942;)
                no result  →  404 "Jogo não encontrado no IGDB."
            IgdbClient.query('game_time_to_beats', … where game_id = 1942;)
                error or empty  →  timeToBeat = null
            has collections?
                IgdbClient.query('games', where collections = (…) & game_type = 0
                                 & id != 1942; sort first_release_date asc; limit 50)
            mapGameDetail  (hours = seconds / 3600; up to 12 screenshots, 4 videos;
                            expansions + standalone; remakes + remasters)
            cache.set  (at 200 games, the oldest goes)
    ◄── GameDetail

    useLibraryEntry(1942)  →  GET /library/1942       (JWT, in parallel)
        findEntry(req.user.id, 1942)
    ◄── { entry } | { entry: null }

    renders: cover, info, ratings, Library_Panel (key=1942),
             Time_To_Beat (with the entry's hours), summary, details,
             images and videos (the browser goes to the IGDB CDN and i.ytimg.com),
             Game_Shelf × 4

Click another cover  →  /Vault/Game/<other>
    both hooks see the id change: the previous result no longer counts (loading)
    Library_Panel with another key → mounts again, no draft
    "Read more" collapse again · the shelf sheet (phone) closes
```

Videos don't play in the app: each thumbnail is a link to YouTube in a new window.
"Back" is `navigate(-1)` — the browser history.

---

## 8 · Add, change and remove a game from the shelf

```
Game page → Library_Panel
    (below 1080px: "My shelf" bar at the bottom → sheet over the page;
     closes with Close, a click on the backdrop or Esc — the draft stays, it's the same panel)
    entry = null  →  "This game isn't on your shelf yet."
    pick status, hours, dates, rating, notes
        each change: setDraft(prev => ({ ...(prev ?? draftFrom(entry)), ...patch }))

"Add to shelf" / "Save changes"   (only with a status picked)
    useLibraryEntry.save(input)   (hours with comma → dot; empty → null)
        PUT /library/1942 { status, hoursPlayed, startedAt, finishedAt, rating, notes }
            JwtAuthGuard · ParseIntPipe · ValidationPipe → SaveLibraryEntryDto (400)
            saveLibraryEntry(req.user.id, 1942, dto)
                finishedAt < startedAt?  →  400 "A data em que acabaste não pode ser
                                                 anterior à data em que começaste."
                repository.findGame(1942)
                    missing, or updatedAt > 7 days?
                        games.summary(1942)  →  IgdbClient.query('games', GAME_FIELDS …)
                            404 if IGDB doesn't have it · 503/502 from IGDB
                        repository.saveGame  →  upsert Game { igdbId, name, slug,
                                                 coverImageId, releaseYear, platforms }
                repository.saveEntry  →  upsert LibraryEntry by (userId, gameId)
                                         (the whole entry: whatever isn't sent becomes null)
            mapEntry
        ◄── { entry }
    entry updated · draft → null · toast "Shelf updated"
    Time_To_Beat now marks the new hours

"Remove from shelf" → "Remove it"
    useLibraryEntry.remove()
        DELETE /library/1942
            removeLibraryEntry → deleteMany { userId, gameId }
                nothing deleted  →  404 "Este jogo não está na tua estante."
        ◄── { entry: null }
    entry = null · draft → null · toast "Game removed from shelf"
    (the Game row stays)

Home (/Vault)
    useLibrary  →  GET /library
        listLibrary → findMany { userId } by updatedAt desc
        counts with the seven statuses
    ◄── { items, counts, total }
    error  →  home:loadFailed (no shelves)
    sorts by updatedAt desc and groups by SHELF_OF (every status has a shelf):
        PLAYING/PAUSED → playing · FINISHED_MAIN/FINISHED_EXTRAS/COMPLETED_100 → finished
        PLAN_TO_PLAY → to play · DROPPED → dropped
    renders the four shelves at once
    each shelf: all covers (strip in the status colour, Link to the game), fixed-height
                row with horizontal scroll; empty → home:emptyShelf.<shelf>
```

An error on the `PUT` or the `DELETE` shows a toast with the API message and leaves the
draft as it was, so it can be fixed and retried.

---

## 9 · Manage the account and users

```
Top_Nav → account menu → "My account"  →  /Vault/Settings#account
    Account_Section (useAccount)

"Save name"
    PATCH /user/me { username }             (JWT)
        UpdateUsernameDto: 3–32, letters/numbers/._-   (400 if it doesn't match)
        updateOwnUsername → findByUsername → 409 if it belongs to another account
                          → repository.update(id, { username })
    ◄── user without password
    refreshUser() → GET /auth/me → the top bar shows the new name

"Save password"   (current + new 8+ + matching confirmation)
    PUT /user/me/password { currentPassword, newPassword }
        changeOwnPassword → findByIdWithPassword → comparePasswords
            wrong → 400 "A password atual está errada."
            bcrypt.hash(new, 12) → repository.update
    ◄── 200 { message }   → fields cleared, toast

Admin → a user's row
    pencil → Admin_Create_User_Modal (user=…)
        PATCH /user/:id { username, role, password? }    (JWT + ADMIN, ParseUUIDPipe)
            updateUserByAdmin: only what changed
                duplicate name → 409
                removing ADMIN from the last administrator → 400
        onSaved → fetchUsers()
    bin → "Delete it"
        DELETE /user/:id
            deleteUserByAdmin
                yourself → 400 · doesn't exist → 404 · last ADMIN → 400
                repository.delete → LibraryEntry and AiSettings cascade
        fetchUsers()

Next request from a changed or deleted account
    JwtAuthGuard → JwtStrategy.validate(payload)
        users.findById(payload.sub)
            doesn't exist → 401 "Sessão inválida"
            exists        → req.user = { id, username, role } from the database (new name and role)
```

The token isn't reissued: it stays valid until it expires, but the name and role always
come from the database, so a change takes effect on the next request.

---

## 10 · View the stats

```
Top_Nav → "Stats"  →  /Vault/Stats
    useLibraryStats  →  GET /library/stats          (JWT)
        getLibraryStats(req.user.id)
            repository.listEntries(userId)            (with each one's Game)
            refreshGameFacts(entries)
                games with factsCheckedAt null or > 7 days?
                    games.facts(ids)  →  getGameFacts, in batches of 500:
                        IgdbClient.query('games', genres.name …)              ┐ in
                        IgdbClient.query('game_time_to_beats', hastily,       ┘ parallel
                                         normally, completely …)
                    repository.saveGameFacts(id, facts)  →  Game.genres, ttb*, factsCheckedAt
                IGDB failed → factsComplete = false (carries on with what there was)
            per entry:
                PLAN_TO_PLAY → backlog += ttbMain (without it: missingGames)
                others       → estimateHours(entry, game)
                                   hoursPlayed? → logged
                                   otherwise FINISHED_MAIN → ttbMain
                                             FINISHED_EXTRAS → ttbExtras ?? ttbMain
                                             COMPLETED_100 → ttbCompletionist ?? ttbExtras ?? ttbMain
                                             rest → no hours
                               ratings 1–10 · finished per year (finishedAt ?? updatedAt)
                               genres
            completionRate, top 8 genres, top 5 by rating, top 5 by hours
    ◄── LibraryStats

    renders: hours (solid = logged, stripes = estimated), spines by status,
             backlog, stacks per year, ratings, genres, highlights (Link to each game)
    factsComplete = false → stats:factsIncomplete warning
```

No scheduler: facts are refreshed when someone opens the stats (or talks to the
assistant), and only for games with missing data or data older than a week.

---

## 11 · Random game

```
Home → "Not sure what to play?" (Random_Pick, with the shelf already loaded)

"From my list (N)"
    in the browser: PLAN_TO_PLAY + PAUSED entries, without repeating the last one
    empty → home:random.emptyList

"Discover a new one"
    useDiscover.discover()  →  GET /library/discover     (JWT)
        LibraryService.discover
            repository.listEntries(userId) → shelf ids
            games.random(ids)  →  getRandomGame
                where game_type = 0 & total_rating >= 75 & total_rating_count >= 40
                      & cover != null & first_release_date < now & id != (ids)
                IgdbClient.query('games/count', where …)       → count (0 → 404)
                offset = random in [0, min(count, 10 000))
                IgdbClient.query('games', fields GAME_FIELDS; where …;
                                 sort id asc; limit 1; offset …)
                mapGame
    ◄── GameSummary   (error → message in place of the result)

result: cover, source, name, status or year · genres · rating → Link /Vault/Game/:id
```

---

## 12 · Chat with the assistant (Claude)

```
Prerequisite: an API key from console.anthropic.com, with credit.

Settings → Assistant  (or /Vault/Assistant without a key → the same Ai_Card)
    useAiSettings  →  GET /ai/settings
    ◄── { configured, keyHint, model, … }
    "Load models"  →  POST /ai/models { apiKey? }
        listAiModels → listModels(typed or stored key)
            GET https://api.anthropic.com/v1/models   (x-api-key)
    "Save"  →  PUT /ai/settings { apiKey?, model }
        saveAiSettings
            new key → listModels(key)   (rejected → 400, nothing saved)
                    → encryptToken(key), keyHint = last 4
                    → upsert AiSettings (userId)
            no key  → updateModel (400 if there's none at all)
    ◄── AiSettings  →  toast

/Vault/Assistant → type and Enter (or a suggestion)
    useAssistantChat.send(text)
        messages += question + empty reply
        fetch POST /ai/chat { messages: last 40, language }   (credentials: include)
            AiController.chat (@Res)
                streamChat
                    savedApiKey → decryptToken      (no key → normal 400, JSON)
                    listEntries + refreshGameFacts
                    buildSystemPrompt(username, language, shelf up to 400 games)
                    round 1..6:
                        streamMessage → POST /v1/messages (stream: true, tools)
                            SSE: content_block_delta text  →  emit {type:'text'}
                                                           →  NDJSON line to the browser
                        stop_reason = tool_use?
                            emit {type:'tool', name, query}
                            runGameTool → GamesService.search / detail → IGDB
                            messages += request + tool_result → new round
                        otherwise → end
                    (7th round without tools: it has to answer)
                    emit {type:'done'}
                error before the 1st event → HTTP status + { message }
                error midway               → {type:'error'} line
        reads line by line: text → appends · tool → "Searching…" pill · error
        Markdown renders the reply; [Name](game:1942) → Link /Vault/Game/1942
        at the end: sessionStorage['assistant-chat:<username>'] = conversation

"Stop" / leaving the page
    AbortController.abort() → the fetch closes
        backend: res 'close' → controller.abort() → the Anthropic request is cancelled
"New conversation" → aborts and clears
```

The conversation is never stored on the server: it is sent in full with every question
and stays in the tab's `sessionStorage`. The shelf goes in the instructions of each
request, with the user's own key.

---

## 13 · Use the Android app

```
Build and publish (development machine)
    npm run build:android [-- --version x.y.z | --keep-version]  →  scripts/build-android.mjs
        JDK 17+ and Android SDK → apps/android/local.properties
        1st time: ~/.gametracker/android-release.jks + android-keystore.properties
        gradle.properties: APP_VERSION_CODE +1, APP_VERSION_NAME patch +1 (or --version)
        gradlew assembleRelease   (signs with GAMETRACKER_KEYSTORE_PROPERTIES;
                                   if it fails, restores gradle.properties)
        → apps/frontend/public/downloads/gametracker-vault.apk + android.json
    commit (code + gradle.properties + APK) → develop → staging → main → release
    gametracker-update in the CT → vite build copies public/downloads/ → /var/www/gametracker

Install (phone, in the browser)
    account menu → "Android app" → /Vault/Help#android
        Android_Download → GET /downloads/android.json   (nginx, no cache)
        "Download APK" → /downloads/gametracker-vault.apk
            (application/vnd.android.package-archive) → install

First launch
    MainActivity → no server_url → assets/setup.html ("Connect to your server")
        "Connect" → GameTrackerApp.connect(text)     (only accepted from the local page)
            normalize → https:// if missing, no trailing slash
            GET <server>/api/health → nginx → AppController.health
                ◄── { app: "gametracker-vault", ok: true }
            (otherwise GET <server>/health; failing: invalid · not-gametracker · unreachable
             → window.onConnectResult(code) → message in the form)
        saves server_url (SharedPreferences) → loadUrl(<server>/)
            → Updater.check(server)   (see Update the app)
    the normal site: login → access_token cookie in the CookieManager (flow 1)

Later launches
    loadUrl(<server>/) → AuthProvider → GET /api/auth/me   (saved cookie)
        401 → login · other failure → 2 more attempts (1.5 s, 3 s)
    same-host links → in the WebView · others → Intent (browser)
    Back → webView.goBack()
    onPause → CookieManager.flush()

No connection
    error on the main page → assets/offline.html
        "Try again" → retry() → loadUrl(<server>/)
        "Change server" → changeServer()

Change server   (offline.html or the account menu, inside the app)
    GameTrackerApp.changeServer() → deletes server_url, clears history → setup.html

Update the app   (since 1.1.0; 1.0.0 installs 1.1.0 by hand once)
    MainActivity.onCreate / connect "ok" → Updater.check   (once per launch)
    Help → Android_Download → "Update app" / "Check for updates"
        → GameTrackerApp.checkUpdate() → manual Updater.check (always reports the result)
    GET <server>/downloads/android.json
        versionCode > BuildConfig.VERSION_CODE → "Update" · "Later" dialog
            ("Later" holds until the app is closed)
        otherwise → nothing (manual: "you already have the latest version" / "couldn't check")
    "Update" → GET /downloads/gametracker-vault.apk → PackageInstaller session
        sha256 ≠ android.json → abandons ("damaged file")
        commit → broadcast with the status
            PENDING_USER_ACTION → Android confirmation screen
                (1st time: allow installing apps from GameTracker Vault)
            SUCCESS → Android replaces the app · failure → dialog with the reason
        Android 12+: USER_ACTION_NOT_REQUIRED — once the app is the installer, later
        updates can install without asking
```

The backend doesn't know the app exists: to it, it's just another browser, on the same
origin. Only `GET /health` was added for it. See
[17 · Android app](./17-android-app.md).
