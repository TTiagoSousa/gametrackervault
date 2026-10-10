# 10 · Pages and components

## Pages

### `Public/Index` — entry
The page with the most character: the brand's shelf. Two halves side by side:

- **Stage** (`Login_Stage`, on the left): an ultramarine block (`--stage-bg`) with the brand
  (logo in a `--stage-text` square and "GameTracker Vault"), the heading
  `auth:stage.headline` and the text `auth:stage.text`, a **shelf of 12 spines** of
  made-up games (`Spine` with title, tone, status and height; the `SHELF` constant in
  `Index.tsx` itself, titles not translated because they are proper names) resting on a
  `--stage-text` board, and the legend of the three statuses (`auth:stage.status.*`, dots in
  `--game-status-*`). The shelf is `aria-hidden`. There are no animations.
- **Form** (`Login_Panel`, on the right, on `--surface`): theme toggle at the top,
  title `auth:login.title` and `auth:login.description` (no eyebrow), username,
  password with a show/hide button, sign-in button (no arrow) and
  `auth:login.note` (accounts are created by the admin).

Below 900px the grid becomes a single column: the stage turns into a **strip at the top** with only the
brand and the shelf (120px tall; heading, text and legend hidden), and the
theme toggle disappears.

It uses the shared tokens (`Colors/Tokens.scss`): the stage in `--stage-*`, the spines in
`--spine-1..6`, the form with fields in `--bg` / `--line-strong` and focus in `--accent`,
the sign-in button in `--accent` / `--on-accent` (hover `--accent-bright`). Headings in
Unbounded (`$font_family_display`). The login does not use the control mixins — it has its own
`Login_Field` and `Login_Submit`. It uses `useSignin`, which validates empty fields, calls `POST /auth/login`
and, with a 300 ms delay so the toast can be seen, does `window.location.href = '/Vault'` —
a full reload on purpose, so the `AuthProvider` re-evaluates the session from scratch.

> The field is called `signInEmail` and the label says "Username": the backend authenticates by
> username. It is a naming leftover, not a bug.

### `Private/Main` — shell
A `div.Vault` with three children: the `Top_Nav` (`sticky` top bar), the
`div.Vault_Content` — centred, up to 1600px, `padding: 32px 24px 64px` (`16px 16px 48px`
below 760px) — with `Private_Routes` inside an `Error_Boundary`, and the `Bottom_Nav`
(only visible below 760px). `.Vault` defines `--bottom-nav-height` (0 on desktop,
`62px + env(safe-area-inset-bottom)` on mobile) and, on mobile, reserves that space
with `padding-bottom` (with `box-sizing: border-box`, so it fits within `100svh`). See
[11](./11-design-system.md#layout).

### `Private/Home` — home
The user's shelf, with real data from `useLibrary` (`GET /library`):

- **Opening** (`Home_Hero`): the greeting (`home:greeting` with the name from `useAuth`, or
  `home:title` without a name) in Unbounded and, below it, `home:subtitle` — or, with an empty
  shelf (`total === 0`), `home:empty.description` (find games in the search and add them to the
  shelf from each game's page). No date or eyebrow.
- **Error** (`Home_Error`): if the request fails, `home:loadFailed` in a
  `--danger-color-soft` strip, above the shelves.
- **Random game** (`Random_Pick.tsx`, only once the shelf has arrived): "Not sure what
  to play?" (`home:random.*`) in a two-column `Panel_Surface` (one column below
  860px). On the left, the text and two buttons: **From my list (N)** (`Icon.Dice`,
  `Solid_Button`) picks one of the `PLAN_TO_PLAY` or `PAUSED` games in the browser (without
  repeating the previous one when there is more than one; empty list → `random.emptyList`); **Discover a
  new one** (`Icon.Sparkle`, `Ghost_Button`) calls `useDiscover` (`GET /library/discover`)
  and shows "Searching…" while it waits. On the right, a **fixed-height** space (128px,
  `--surface-2`) with the result — cover, the source ("From your list" / "Discovered on
  IGDB"), the name, the status or year · genres · rating, and "Open the game" (`Link` to
  `/Vault/Game/:id`) — or a sentence (`random.placeholder`, the empty list or the API
  error).
- **Shelves** (`Home_Shelves`): four panels (`Panel_Surface`) stacked, full
  width, in the order of `SHELVES` (`detailTypes.ts`). Each status goes into one of them via
  `SHELF_OF` (`Record<LibraryStatus, Shelf>`), so **every** game appears:

  | Shelf | Name | Statuses | Colour (dot and board) |
  |---|---|---|---|
  | `playing` | Playing | `PLAYING`, `PAUSED` | `--game-status-playing` |
  | `done` | Finished | `FINISHED_MAIN`, `FINISHED_EXTRAS`, `COMPLETED_100` | `--game-status-finished` |
  | `later` | Up next | `PLAN_TO_PLAY` | `--accent` |
  | `dropped` | Dropped | `DROPPED` | `--danger-color` |

  Each panel has in its header a dot in the shelf's colour, the name (`home:shelves.*`) and
  the count (`home:count_one` / `home:count_other`); below, the row of games resting
  on an 8px board in the same colour. Games go from most recent to oldest
  (`updatedAt` desc, sorted on the client), with no limit: the row has a **fixed height** and scrolls
  horizontally.
  - **A game** (`Home_Game`, `Link` to `/Vault/Game/:id`): the front cover
    (`Home_Game_Case`, 3:4, 144px wide — 116px below 720px —, `--spine-radius`,
    `loading="lazy"`; without a cover, the name) with a 6px spine strip on the left in the
    status colour; the name (up to two lines, `title` with the full name); and a line with the
    status label (`library:statusShort.*`, only for `PAUSED`, `FINISHED_MAIN`,
    `FINISHED_EXTRAS` and `COMPLETED_100` — the ones that share a shelf with others) and the
    hours (`home:hours`, if any). The status colour (strip and label) is the
    shelf's, except `PAUSED` (`--text-soft`) and `COMPLETED_100`
    (`--game-status-beaten`).
  - **Empty shelf** (`.empty`): a low strip with only `home:emptyShelf.<shelf>`.

The random game and the shelves are only drawn once the shelf has arrived — all at
once, so nothing grows or shrinks afterwards. There are no big numbers or highlighted
counters (those are in Stats). Home does not use `Spine`.

**On mobile** (below 760px) everything is more compact: heading from 24px,
shelves with 14px padding and 15px headings, and the random game with the two buttons
side by side (40px tall) and the result space at 96px instead of 128px.

### `Private/Search` — game search
`/Vault/Search`, opened from the magnifier in the `Top_Nav` (on mobile, from "Search" in the
`Bottom_Nav`). Searches the IGDB catalogue (via
`GET /games/search`). Each result opens the game's page, where it is added to the shelf.
Three files: `Search.tsx` (page), `Filter_Panel.tsx`, `Game_Result.tsx`, plus
`Search.scss`.

**All state lives in the URL** (`useSearchParams`): `q`, the lists `platforms`,
`genres`, `themes`, `modes`, `perspectives`, `types` (comma-separated ids),
`yearFrom`, `yearTo`, `minRating` and `sort` (absent = `popular`). Reloading, going
back or sharing the link restores the same search. Changes use `replace: true`, so
they do not fill up the history.

- **Fixed bar** (`Search_Toolbar`, `sticky` just below the `Top_Nav`, opaque
  `--bg` background) — the search field, the "Filters" button (mobile only) and the
  **Sort by** selector. Below 900px it breaks into two lines. It rises over the
  container's top padding (negative `margin-top`: `-16px` below 760px, where the
  container has 16px on top).
- **Search field** (`Search_Field`, 48px) — magnifier, `autoFocus`, clear button. The
  text lives in local state and only goes into the URL's `q` after **400 ms** without
  typing (debounce).
- **Measured heights:** the `Top_Nav` publishes its height in `--top-nav-height` (on
  `<html>`, with `ResizeObserver`) and the page publishes the fixed bar's in
  `--search-toolbar-height`. The bar sticks below the former and the filter panel
  below both, with a `max-height` of what is left of the screen — nothing ends up behind the
  top and the end of the panel is never cut off.
- **Filters** (`Search_Filters`, a 300px column pinned below the fixed bar, screen height, no card — separated by a line — and with its own scroll) — header with "Clear
  filters" (only with active filters) and the `Filter_Panel`. Below 900px the grid becomes
  one column and the filters turn into a side drawer, opened by the "Filters" button (with the
  count of active filters) and closed by the ✕ or the backdrop (`Search_Scrim`,
  `--overlay-scrim`).
- **Results header** (`Search_Results_Head`, also `sticky`, just below the
  fixed bar, fixed 60px height) — the count (`search:results_one`/`_other`, or
  "Searching…", in `aria-live`), the chips for **all** active filters — lists, "From
  {{year}}", "Until {{year}}", "Rating {{n}}+" (`search:chipYearFrom`/`chipYearTo`/`chipRating`),
  each with ✕ — scrolling horizontally if they do not fit, and the **Remove all** button
  (`search:removeAll`), always in place and only invisible without filters. The **Sort
  by** selector is in the fixed bar (native `<select>`).
- **Page bottom:** `.Search` cancels the bottom margin of `.Vault_Content`
  (`margin-bottom: -64px`, `-48px` on mobile) and the results column takes that space
  as `padding`. Without this, at the end of the scroll, the filter column and the pinned rows were
  pushed up by the margin left outside.
- **Grid** (`Search_Grid`, `auto-fill` of 160px; 120px on mobile) of
  `Game_Result`. While a new search arrives the previous results stay
  as they are, without fading (`aria-busy`). No results: `search:noResultsTitle`/`Text` and, if there are
  filters, "Clear filters". On error: `search:errorTitle`, the API message (e.g. the
  503 for an unconfigured IGDB) and "Try again" (`retry`).
- **"Show more"** — while `items.length < total`, appends the next page
  (`loadMore`).

The query sent to the API (`apiQuery`) is derived from the URL, leaving out whatever is not
valid: years outside 1950–2100 and `minRating` 0 are not sent; `sort` is only sent without text.

#### `Filter_Panel`
Groups in `<details>`/`<summary>`, each with the count of selected items in the `summary`
(visible even when closed):

- **Platforms** (always open) — there are ~200, so it is a checkbox list with
  **internal search** (filters by name); the selected ones always appear first.
- **Genres, Themes, Game modes, Perspective, Type** — groups of **chips**
  (`Filter_Chip`, `aria-pressed`; the active one in `--accent`). Genres is open by default; the
  others open if they have something selected.
- **Release year** — "From" and "To", `<input type="number">` 1950–2100.
- **Minimum rating** — `<input type="range">` from 0 to 95, step 5; 0 shows "Any",
  the rest "N+".

While the options have not arrived it shows `search:searching`.

#### `Game_Result`
A `Link` to `/Vault/Game/:id` with the front of a game case: the cover (`coverUrl` from the IGDB CDN, `loading="lazy"`,
3:4 ratio, radius `--spine-radius`) with a 7px **spine strip** stuck to the
left, in the ink colour (`--text-main` — navy by day, almost white at night),
and a **rating badge**
in the top-right corner (`--surface`, Unbounded 12px; only with `rating`). Without a cover,
`search:noCover`. Below, the name, the year and up to three platforms (abbreviated; "…" if
there are more).

Texts in `search:*`.

### `Private/Game` — a game's page
`/Vault/Game/:id` (the IGDB id), opened from a search result, a
Home cover, the random game, Stats, a link in an
assistant reply or a cover on another game page. No tab in the `Top_Nav`; in the
`Bottom_Nav` it counts as "Search".
Five files: `Game.tsx` (page), `Time_To_Beat.tsx`, `Game.scss` (shared by the
two), `Library_Panel.tsx` and `Library_Panel.scss`. It uses `useGameDetail(id)` for the details and
`useLibraryEntry(id)` for the shelf entry — read once in the page and handed to the
panel and to the times (which need the user's hours).

**Two columns:** on the left (`Game_Main`) all the game's content; on the right the
`Library_Panel`, pinned top to bottom while scrolling. The page goes down to the bottom (it cancels the
container's bottom margin, like the search): without that, at the end of the scroll the panel was
pushed up. Below 1080px it is one column and the panel becomes a sheet
(see below).

**"My shelf" on mobile and tablet.** The panel lives inside two wrappers,
`Game_Dock` (the backdrop) and `Game_Dock_Sheet` (the sheet). On desktop both are
`display: contents` — they do not exist for layout and the panel remains the right
column, pinned while scrolling. Below 1080px:

- **Bar** (`Game_Dock_Trigger`) — fixed at the bottom, 16px on each side and 12px above the
  `Bottom_Nav` (`bottom: calc(var(--bottom-nav-height) + 12px)`; on tablet the variable is
  0): `library:title`, the label of the saved status (`library:statusShort.*`, in the
  status colour) or "Add to shelf" (`library:add`) and an up arrow. It opens the sheet
  (`aria-expanded`).
- **Sheet** — the `Game_Dock` covers the screen with `--overlay-scrim` and the sheet sits at the
  bottom, up to `90svh`, top corners rounded; above it, a decorative handle and
  **Close** (`game:closeShelf`). The panel fills the sheet (scrolls inside, footer at the
  bottom). It closes with Close, a click on the backdrop or Esc; while it is open the
  `body` does not scroll (`overflow: hidden`, restored on close). The sheet only stays open for the
  game it was opened on (`sheetFor === gameId`): opening another game closes it.
- `Game_Main` gets `--main-pad-bottom: 140px` (64px on desktop), so the end of the
  page is not hidden behind the bar.

- **Back** (`Game_Back`) — always at the top (`game:back`): goes back in history or,
  with the page opened via a direct link, goes to the search.
- **Loading** — `game:loading`. **Error** (`Game_Error`, panel) — `game:errorTitle`
  and the API message (e.g. the 404 "Jogo não encontrado no IGDB." or the 503 for an
  unconfigured IGDB).
- **Top** (`Game_Top`, cover + details):
  - **The case** (`Game_Cover`) — large cover (`t_cover_big_2x`) with the spine strip
    on the left; without a cover, the game's name in its place.
  - **The details** (`Game_Info`) — the title (`h1`), the year and the developers; "Part of
    {base game}" (`game:partOf`, a button to the `parentGame` page) on DLCs and
    expansions; three rating blocks — overall, critics, players (`game:ratingTotal` /
    `ratingCritics` / `ratingUsers`) — with the number (or "—") and "N ratings"
    (`game:ratingCount_*`) or `game:noRating`; and a short list (`Game_Facts`) of
    developer, publisher, platforms and genres (only those with a value).
- **Body** (`Game_Body`): the summary on the left, on the right a column (`Game_Side`) with the
  play times and the details:
  - **How long to beat** — the `Time_To_Beat` (below).
  - **About the game** — the summary and, if any, the story (`game:storyline`). Texts with
    more than **480** characters (`SUMMARY_LIMIT`) appear truncated with "…" and a
    **Read more** / **Read less** button (`game:readMore` / `readLess`), one per text; when
    switching games they collapse again. Without a summary, `game:noSummary`.
  - **Details** — release (full date in the interface language), type, series,
    franchise, themes, modes and perspective (only rows with a value; the section disappears
    when there are none) and the **View on IGDB** link (`igdbUrl`, new window).
- **Images and videos** (`Game_Media`, only if any) — a horizontal scrolling row:
  first the videos, as YouTube thumbnails (`i.ytimg.com/vi/<id>/hqdefault.jpg`)
  with a play button drawn on top and the video's name below, each one a
  link to `youtube.com/watch?v=<id>` in a new window (no embedded player); then the
  screenshots, each one a link to the image in a new window.
- **Related shelves** — four `Game_Shelf`, in this order: Expansions, DLCs,
  Other versions (remakes and remasters), Same series. Empty ones do not appear.

Below 720px the body becomes one column and the top changes shape: the cover becomes small
(104px) next to the title, the year and the developers, and the ratings and facts move
below both, full width (`Game_Info` becomes `display: contents`, so its
children join the top grid). The title starts at 21px and the rating blocks get
smaller. Texts in `game:*` (the panel uses `library:*`).

#### `Library_Panel`
The **"My shelf"** panel (`aside`, `Panel_Surface`, right column pinned
below the `Top_Nav` while scrolling — below 1080px, inside the sheet —, with
`key={gameId}`). It receives `gameId` and everything
`useLibraryEntry` returns (`entry`, `loading`, `failed`, `retry`, `busy`, `save`,
`remove`). With `failed` (the entry could not be read) it shows only the
`library:loadFailed` warning and **Try again** — saving over it would wipe what is there.

In three groups — **Status**, **Progress** and **Rating** — that scroll inside
(`Library_Scroll`), with the actions in an **always-visible footer** at the bottom of the panel.

- **Header** — `library:title` with a label for the saved status
  (`statusShort.<STATUS>`, in the status colour) or "Not on shelf" (`notInLibraryBadge`);
  below it "On your shelf since {date}" (`inLibrarySince`) or `notInLibrary`.
- **Status** — two groups of compact buttons (`role="radio"`), in two columns: **In
  progress** (`groupActive`: playing, paused, later, dropped) and **Finished**
  (`groupDone`: main story, with side content, 100%). Short names in
  `library:statusShort.*` (the full name, `status.*`, goes in the `title`). Clicking the selected
  one again **deselects it** (`clickToUnselect`).
- **Progress** — hours played (`type="number"`, step 0.5, accepts a comma, with "h"
  inside) and the start and end dates side by side.
- **Rating** — the score from 1 to 10 (clicking the selected one removes it) and the notes (`textarea`,
  `maxLength` 2000).
- **Clear** — Progress and Rating have "Clear" (`library:clear`) next to the heading,
  which empties only that group.
- **Footer** — **Add to shelf** (`add`) / **Save changes** (`save`), only enabled with a
  status; without a status the button itself says "Pick a status to save" (`pickStatus`).
  Below, a fixed-height line: **Undo** (`undo`, back to what is saved), **Clear
  all** (`clearAll`) and, with an entry, **Remove from shelf**; when removing, the same line becomes
  "Remove from shelf? **Yes, remove** / **No**" (`removeQuestion`, `confirmRemove`,
  `cancel`).

Nothing moves: "Clear", "Undo", "Clear all" and "Remove from shelf" are
always in place and only become invisible (`visibility: hidden`) when there is nothing to do.

**Draft.** The panel keeps a local `draft` that starts as `null`: while nobody touches it,
the fields show the saved entry (`draftFrom(entry)`). Each change is a
**functional** update (`setDraft(previous => ({ ...(previous ?? draftFrom(entry)),
...patch }))`), so several changes in a row — before the component re-renders —
do not wipe each other out. Saving sends the whole entry (the `PUT` replaces:
empty fields become `null`) and, if it succeeds, the draft goes back to `null` and the panel
shows what the API returned; removing does the same. The page gives the panel
`key={gameId}`: opening another game (a DLC, one from the same series) mounts a new panel, without the
previous one's draft or confirmation.

#### `Time_To_Beat`
"How long to beat" (`game:timeTitle`). It receives `timeToBeat` from the details and `yourHours` (the
entry's `hoursPlayed`, or `null`).

- One row per time that exists — **Main story** (`main`), **Main + side
  content** (`mainExtras`), **100%** (`completionist`) — with the label, the value
  ("{{hours}} h") and a **proportional** bar: the largest of all (also counting the
  user's hours) takes the full width.
- With user hours (> 0), a **vertical tick** in the ink colour marks them over
  the bars, and below appears "Your hours: N h" (`timeYours`).
- Below, "Average of N players on IGDB" (`timeBasedOn_*`). Without times,
  `game:timeNone`.

### `Private/Stats` — statistics
`/Vault/Stats` ("Stats" tab). It uses `useLibraryStats` (`GET /library/stats`).
Texts in `stats:*` (status names in `library:*`).

A regular grid: the summary strip and, below it, rows of two panels with **the same
height** (`Stats_Row`, one column below 860px) or one full-width panel. All
panels (`Panel`, a local component) have the same header — title on the left, a short
note on the right (`Stats_Panel_Aside`), rule below — and the same spacing.

- **Opening** (`Stats_Hero`) — `stats:title` and `subtitle`. Loading,
  `stats:loading`; error, `stats:loadFailed`. Empty shelf: a panel with `stats:empty`
  and the button to the search (`emptyAction`).
- **Warning** — with `factsComplete: false`, `stats:factsIncomplete` (IGDB did not respond and
  averages may be missing).
- **Summary** (`Stats_Summary`) — a panel with four equal cells separated by
  rules (two per row below 900px), each with label, number and a note:
  hours played (how many estimated), games on the shelf (how many in progress), finished (the
  completion rate) and the time to finish the "Later" list (`summary.*`).
- **Hours** | **The shelf** — the bar split between **entered** hours (solid `--accent`) and
  **estimated** hours (striped), with the legend of the three cases (entered, estimated, no
  hours — faded when zero); and the row of **spines** by status (width
  proportional to the count) with the legend of the seven statuses in two columns. The bar and the
  row have the same height (48px), so the two panels line up.
- **Finished per year** (full width) — a **stack of spines** per year, height
  proportional to the largest, up to 14 spines drawn (the exact number on top), on a
  `--game-status-finished` board.
- **Your ratings** | **Genres** — ten columns (1 to 10) that fill the panel, with the
  count on top (the average and how many have a rating in the header); and the 8 most
  frequent genres in horizontal bars.
- **Most hours** | **Highest rated** — `Top_List`: always **5 rows** of 52px
  (position, small cover with the status strip, name, value); missing ones remain as
  dashed empty slots, so both lists have the same height. Hours are marked
  "estimated" when they are the IGDB average.
- **Final note** — `stats:note` and a link to `/Vault/Help#stats` (how they are
  calculated).

On mobile (below 760px) the panels have 16px of padding (`--panel-pad`), the
summary numbers 24px, the two-column legends become one, and the charts for
ratings and years and the highlight rows (48px) get shorter.

### `Private/Assistant` — assistant (Claude)
`/Vault/Assistant` ("Assistant" tab). **Exactly the size of the screen — the page never
scrolls**: the height is the screen minus the top bar, the bottom bar
(`--bottom-nav-height`, mobile only) and the container spacing (whose bottom margin is
cancelled). Two columns: the conversation (`Assistant_Chat`) and, on the right, a 300px column
(`Assistant_Side`, with its own scroll if it does not fit); below 980px only the conversation, and the
suggestions move inside the empty conversation.
It uses `useAiSettings` (to know whether there is a key) and `useAssistantChat(username)`. Texts in
`assistant:*`.

- **Conversation header** (`Assistant_Head`) — the `Sparkle`, `assistant:title`, the model
  in use (or `side.noKey`) and **New conversation** (clears the conversation; disabled without
  messages). Error reading the settings: `errors.settings`.
- **No key** — the `Ai_Card` with the title `setup.title` fills the conversation body
  (`Assistant_Setup`, with its own scroll).
- **Messages** (`Assistant_Messages`, own scroll, `aria-live="polite"`) — when empty,
  the `intro` text in the centre and, below 980px (when the right column disappears),
  below it the five suggestions (`Assistant_Intro_Suggestions`, `Ghost_Button`
  buttons that send on click). Each message: avatar (the user's initial,
  or the `Sparkle`) and the bubble; on replies, above, the searches made on IGDB
  (`tools.search_games` / `tools.get_game`), the text through `Markdown` (`game:<id>`
  links open the game's page), `thinking` while no text has arrived and the error, if
  any. The list only follows the reply downward if the user was already at the bottom.
- **Composer** (`Assistant_Composer`, always at the bottom) — `textarea` (up to 12,000
  characters); Enter sends, Shift+Enter adds a new line; **Send** (`Icon.Send`) or, during
  the reply, **Stop** (`stop`).
- **Right column** — **Try asking** (`side.suggestions`): the five
  questions (`suggestions.next`, `similar`, `backlog`, `short`, `hidden`), always at hand,
  that send on click (disabled without a key or during a reply); and **What the
  assistant reads** (`side.privacy`) with the links to `/Vault/Settings#assistant` and
  `/Vault/Help#claude`.

On mobile (below 760px) the header, the messages (28px avatars) and the
composer (46px) get more compact, and the top and bottom padding drops to 16px and
12px. The narrow-screen rules (hide the column, show the suggestions in the conversation)
are at the **end** of `Assistant.scss`: further up, the `display: flex` of the base rule for
`.Assistant_Side` (which comes later and has the same specificity) won and the column
stayed visible.

### `Private/Help` — help
`/Vault/Help`, opened from the account menu ("Help") and from links in Stats, the
Assistant and the `Ai_Card`, and from "Android app" in the account menu (`#android`). A list
of `<details>` (`Help_Section`), one per topic, in the order of `SECTIONS`: `android` (the Android
app: install, first run, day to day, updating the app), `claude` (setting the Claude key), `models` (which model to pick),
`stats` (how the statistics are calculated), `shelf` (the shelf and the random game),
`account` (account and users) and, **admin only** (with the `help:adminOnly` label),
`igdb` (setting the IGDB key) and `code` (code and updates on GitHub). The title comes from
`help:<id>.title` and the body from `help:<id>.body`, which is **Markdown** rendered by
`Markdown`. In the `android` section, the `Android_Download` card comes before the text.

An address with `#<id>` opens that section and scrolls to it; after that, what the
user opens and closes rules (`toggled` state). On mobile the section titles
drop to 15px and the padding to 16px. Texts in `help:*`.

### `Private/Settings` — settings
`/Vault/Settings`. An **index** on the left (200px, pinned while scrolling; hidden below
900px) with links to the sections and, on the right (up to 920px), **one card per section
with the same shape**: title and description at the top, blocks separated by rules below.
The anchors `#appearance`, `#account` and `#assistant` (used by the account menu and by
Help) land below the top bar (`scroll-margin-top`). Texts in `settings:*`.

- **Appearance** (`appearanceDescription`) — two inline blocks (text on the left,
  segmented control on the right): **Theme** (Day, Night, Automatic, with the colour swatch)
  and **Language** (the three, with their code). They are stored in the browser.
- **Account** (`Account_Section.tsx`, `account.description`):
  - **Name** — the field and **Save name** on the same line (the button is only enabled with a
    different name, 3 to 32 characters); `PATCH /user/me` and `refreshUser`.
  - **Password** — **Show passwords** next to the heading (switches the three fields to
    text); the **current** one on the first line, the **new** and the **repeated** side by side (one
    column below 560px); below, the **rules** ticked as you type
    (`ruleLength`: at least 8 characters; `ruleMatch`: both the same — in red, with
    the field in `aria-invalid`, when they differ) and **Change password** on the right, only enabled
    when everything is met. There is a hidden username field for the password manager. After
    changing, the fields are emptied. `PUT /user/me/password`.
- **Assistant** — the `Ai_Card` (it already has the title "Assistant (Claude)" and the description).

On mobile (below 760px) the cards have 16px of padding, Theme and Language become
three equal-width buttons spanning the full width (instead of the segmented control on the right) and
the save buttons take the full width.

### `Private/Admin`
Protected by `Admin_Check` **and** by the `RolesGuard` on the backend. In order:

1. Header (`Page_Header`) with "+ New user" (`Solid_Button`, opens the
   `Admin_Create_User_Modal`).
2. `Version_Card` — installed version and updates.
3. `Igdb_Card` — IGDB credentials (Admin → Integrations).
4. List of users from `useUsers` in a panel (`Panel_Surface`), with rows
   separated by thin lines and a header row in `Caption`: each row has a
   square ultramarine avatar (`--accent`, `--ctrl-radius`) with the initial and the username
   (plus the `admin:users.you` label on your own account), the role in a pill (the
   *Admin* one in `--accent-soft` + `--accent`), the creation date and, in a fixed-width
   column, the **actions**: **Edit** (`Icon.Pencil`, opens the `Admin_Create_User_Modal` with
   that user) and **Delete** (`Icon.Trash`, red; invisible and disabled on your
   own account). Delete asks for confirmation in the row itself — the buttons give way to
   "Really delete" / "Cancel" — and, if it succeeds, reloads the list. Hover in
   `--surface-2`. Below 600px the date disappears.

The modal has a single state: `null` (closed), `'new'` (create) or the user being edited.
The actions use `useUser` (`createUser`, `updateUser`, `deleteUser`). The backend refuses
to delete your own account and to be left without administrators; those messages arrive as a toast.

### `Private/Admin/Versions`
List of all releases (`useReleases`), from most recent backwards. Header with
back to Admin and "Check for updates" (`fetchReleases(true)`, forces the `git fetch`). A
summary line with the installed version (`installedLabel`), and warnings for no network or "server
only" (`updatesEnabled: false`).

Each release is an accordion: closed it shows the version, *Installed* / *New* labels and
date; open it shows the title and the `Release_Notes`. Those newer than the installed one
have "Install" (only with `updatesEnabled`), which opens the `Update_Modal`. Without releases,
`system:versions.empty`. Texts in `system:versions.*`.

---

## Components

### `Version_Card`
On the Admin page, a flat full-width panel (`Panel_Surface`, 28px of padding). Three
readouts (`--surface-2` blocks with the value in Unbounded) — installed (version and date), latest release, status
("N updates" or "up to date") — and, when there is something new, a summary of the latest's notes
(`Release_Notes` with `limit={3}`, in an `--accent-soft` block) and the "Update
to vX.Y.Z" button (`Solid_Button`). A "View versions" link (`Ghost_Button`) to `/Vault/Admin/Versions`. If on opening there is already a `queued` or
`running` update (requested in another tab), it opens the `Update_Modal` in `resume` mode. Without
`SYSTEM_UPDATES_DIR` it shows `system:card.serverOnly`.

### `Igdb_Card`
`Components/Igdb_Card/`. On the Admin page, after the `Version_Card` (`Panel_Surface`).
IGDB credentials **for the installation** — one key serves all users. It uses
`useIgdbIntegration`.

- **Header** — title `admin:igdb.title`, description and a status pill
  ("Connected" / "Not configured").
- **Form** — Client ID (text; starts with the saved one) and Client Secret
  (`password`, always empty). When configured, the secret's placeholder says it is saved and
  ends in `secretHint` ("Leave blank to keep it"). **Save** (`Solid_Button`)
  only enabled with a Client ID and, if nothing is saved yet, a secret. After saving
  it clears the secret.
- **Test connection** and **Remove credentials** — only when configured. Remove asks for
  inline confirmation ("Really remove" / "Cancel").
- **Help** — "The credentials come from a Twitch application (Confidential type)" with
  a link to `https://dev.twitch.tv/console/apps`, and the date of the last change
  (`updatedAt`).

The full secret never reaches the browser — only the last 4 characters. Texts in
`admin:igdb.*` (including `testFail.not-configured` / `rejected` / `unreachable`).

### `Ai_Card`
`Components/Ai_Card/`. The Anthropic key and the assistant model **for this
user**. Used in Settings → Assistant and on the Assistant page when there is no
key yet (with a different `title`). It receives everything `useAiSettings` returns
(`settings`, `models`, `busy`, `loadModels`, `save`, `remove`) plus `title?`.

- **Header** — title (`assistant:settings.title`, or the given `title`), description and a
  status pill ("Connected" / "Not configured").
- **Provider** — a disabled `<select>` with only "Claude (Anthropic)".
- **API key** — `password`, always empty; with a saved key, the placeholder says it
  is saved and ends in `keyHint` (`settings.keyKept`); without one, `sk-ant-…`.
- **Model** — a `<select>` that starts with the suggested models (`claude-opus-5-5`,
  `claude-sonnet-5-5`, `claude-haiku-5-5`) and, after **Load models**
  (`loadModels`, with the typed key or the saved one; needs one of the two), switches to
  the account's models ("Name (id)"). The chosen model always appears, even if it is not
  in the list. Below, `settings.modelHint` or "N models loaded".
- **Save** — only enabled with a model and, without a saved key, with a typed key. The key is
  tested by the backend before saving; afterwards the field is cleared.
- **Remove key** — always in place, invisible without a saved key; asks for
  inline confirmation ("Really remove" / "Cancel").
- **Help** — `settings.help` with a link to `/Vault/Help#claude` and the date of the last
  change.

The full key never reaches the browser. Texts in `assistant:settings.*`.

### `Android_Download`
`Components/Android_Download/`. The Android app card, at the top of the Help `android`
section: the brand icon in an ultramarine square, a text and a button. Two forms:

- **In the browser** — reads `/downloads/android.json` (`fetch`, `cache: no-cache`) and shows
  "GameTracker Vault — Android" with `help:androidDownload.details` (version, size in KB,
  publication date in `dateLocale()`) and the **Download APK** button (`<a download>`
  to `/downloads/gametracker-vault.apk`). Without the manifest (non-ok response or error), it shows
  `androidDownload.notAvailable` and the button is disabled (`disabled`, no `href`).
- **Inside the app** (`isAndroidApp()`) — "You are using the Android app"
  (`androidDownload.inApp`) and the installed version (`version()` from the bridge,
  `androidDownload.version`). It also reads `android.json`: if the `versionCode` there is
  greater than the bridge's `versionCode()` (0 in an app without it), it shows
  `androidDownload.updateAvailable` instead ("You have version X — Y is available"). The button depends on the app:
  - with `checkUpdate` (1.1.0 or newer) — **Update app**
    (`androidDownload.update`, solid button) when there is a new version, otherwise **Check for
    updates** (`androidDownload.checkUpdate`, ghost). Both call
    `checkUpdate()`, and the result appears in a native app dialog;
  - without `checkUpdate` (1.0.0) and with a new version — the **Download APK** link to the APK
    on GitHub (`ANDROID_APK_REPO_URL`, new window): since it is another host, the
    app opens it in the phone's browser, which downloads it (the 1.0.0 WebView does not
    download files);
  - without `checkUpdate` and without a new version — none.

  Next to it, always, the **Change server** link (`androidDownload.changeServer`,
  `Android_Download_Link`), in addition to the account menu and the "No connection" screen.

The URLs and the manifest type come from `Service/androidApp.ts`. Texts in
`help:androidDownload.*`. See [17](./17-android-app.md).

### `Markdown`
`Components/Markdown/`. Minimal Markdown for the assistant's replies and for the
Help texts: headings (`#`/`##` → `h3`, `###`/`####` → `h4`), paragraphs, lists (with `-`,
`*`, `•` or numbers, and indented continuation lines), code blocks (between three
backticks),
**bold**, *italic* (asterisks only, so as not to catch names with underscores),
`code` and links. It builds React elements, never raw HTML — the model's text cannot
inject anything.

Links: `game:<id>` → `Link` to `/Vault/Game/<id>` (class `Markdown_Game`,
dashed underline); `/Vault/…` → internal `Link`; `http(s)://` → new window
(`rel="noreferrer"`); any other scheme stays as plain text. No tables, quotes,
images or nested lists.

### `Update_Modal`
Requests the update (`useSystemUpdate().start`) or just follows it (`follow`, with
`resume`). It shows the `update.sh` steps in order — `fetch`, `build`, `migrate`,
`publish`, `configure`, `restart` — each one pending, in progress, done or failed; the
`rollback` appears in the `restart` step. Collapsible log with the last lines. **It does not close
midway**: the backend is going to restart. When it finishes, it reloads the page after 2.5 s (or
immediately, with the button). If it fails, it shows the message and that the previous version is still running.

### `Release_Notes`
A release's notes by section (`features`, `fixes`, `improvements`, `other`), with
a counter and, with `limit`, "+N more". Converts `**scope**` into `<strong>`. Without notes,
`system:notes.empty`.

### `Error_Boundary`
Class component. `Main.tsx` wraps `<Private_Routes />` in
`<Error_Boundary key={pathname}>`: a render error shows "This page failed", the
error message and "Try again" inside the page, instead of leaving the app black;
changing page resets it (via the `key`). Visually it is a dashed-border block in
`--danger-color` on `--danger-color-soft`, with the button as a `Ghost_Button`. It logs the error to the console with
`[GameTracker Vault]`. Texts in `common:errors.pageTitle` / `pageText` / `retry`.

### `Global_Dropdown`
Replaces the native `<select>` (used in the user creation modal for the role). The
panel is rendered in a **portal** to `document.body`, positioned with
`getBoundingClientRect`, and repositions itself on scroll and resize — without that it was cut off
inside modals with `overflow`.

Optional search, height limited to N options (computed from `OPTION_HEIGHT`), closes on
an outside click or `Escape`. Closing always clears the search — done in the `close()` function and
not in an effect.

### `Simple_Alert`
A single toast at the top of `App`. It takes a *snapshot* of the message and immediately closes the
alert in the context, so a second alert can arrive while this one is still leaving. Entry,
3 s, 300 ms exit, progress bar. It clears the timers on unmount.

Visually it is a `--surface` card (top-right corner; full width below
600px) with the icon (✓ ✕ ⚠ ℹ) in a circle of the type's colour, label and message, a close
button and a 3px progress bar in the same colour. The type colour comes from
`--alert-*-background` and only paints the circle and the bar.

### Modals
`Admin_Create_User_Modal` (username ≥ 3, password ≥ 8, role from `ROLES`) and
`Update_Modal`.

`Admin_Create_User_Modal` creates **and** edits: without the `user` prop it creates (title
`admin:createUser.title`, password required, `POST /user`); with `user` it edits (title
`admin:editUser.title`, fields already filled in, "New password" blank — it only changes if you
type one with 8+ characters —, `PATCH /user/:id` with the name, the role and, if present, the password).

The `Admin_Create_User_Modal` contract, to be followed by new modals: it receives `onClose` and
`onSaved` (and, optionally, the record to edit), and the parent decides what to reload. No modal knows about the page it lives on.
`Update_Modal` breaks the contract on purpose: it receives `version`, `from`, `resume` and
`onClose`, and reloads the page by itself at the end.

### Simple
`Global_Input` (takes 100% of its parent, the size always comes from the outer div; it is a
`Control_Surface` — inset background, border and accent halo on focus, no underline),
`Simple_Button` (a `Solid_Button` filling its parent; no screen uses it today — the login has
its own `Login_Submit`),
`Theme_Toggle` (at the top of the login form; sun or moon depending on `isDark`),
`Loading_Page`.

### `Spine`
`Components/Spine/`. The spine of a game case — the app's visual motif. Props
`tone` (1–6, colour `--spine-N`), `title` (printed vertically, bottom to top), `status`
(`playing` / `finished` / `beaten`, round label at the top), `empty` (dashed empty
slot, no colour or title) and `height` (0.7–1, height relative to the parent's row).
It also exports the `GameStatus` type. Today only the login uses it (decorative shelf). Visual
detail in [11](./11-design-system.md#the-spine-spine).

### `Game_Shelf`
`Components/Game_Shelf/`. A shelf of cases: title (`h2`) with the count in a
pill, and the covers side by side in a horizontally scrolling row (140px columns). Each
item is a `Link` to `/Vault/Game/:id` with the cover (`coverUrl`, `loading="lazy"`, spine
strip on the left; without a cover, the name), the name (up to two lines) and the year. Props
`title` and `games: GameRef[]`; with no games it renders nothing. Used on a game's page
(expansions, DLCs, other versions, same series).

### `Top_Nav`
`Containers/Navigation/Top_Nav/`. Top bar of the authenticated app, in three zones:

- **Left** — the brand (logo in an ultramarine square and "GameTracker Vault"),
  a link to `/Vault`.
- **Centre** — the tabs, in plain text (the active one with an `--accent-soft` background and
  `--accent` text). They come from `Menu_Items.ts`
  (`{ id, labelKey, path, adminOnly? }`, no icons): Home (`/Vault`), Stats
  (`/Vault/Stats`), Assistant (`/Vault/Assistant`), Settings (`/Vault/Settings`),
  Admin (`/Vault/Admin`, `adminOnly`), filtered by role. The active one is
  the one with the longest path that is a prefix of `location.pathname`, except Home, which only
  counts with the **exact** path (`/Vault` or `/Vault/`) — otherwise it would be active on pages
  without a tab, like the search or a game's page. It gets the `active` class and `aria-current="page"`. There are no
  submenus.
- **Right** — the **magnifier** (`Icon.Search`, link to `/Vault/Search`, `title` and
  `aria-label` `nav:sidebar.search`; it becomes `active` on `/Vault/Search*`), the icon-only theme
  button (sun or moon depending on `isDark`; toggles between night and day) and the avatar with the initial (square, in the ink colour; ultramarine on
  hover), which opens the account menu: name, role
  (`admin:users.roles.*`), three links — **My account** (`Icon.Profile`,
  `/Vault/Settings#account`), **Assistant (Claude)** (`Icon.Sparkle`,
  `/Vault/Settings#assistant`) and **Help** (`Icon.Help`, `/Vault/Help`), each one closes
  the menu —, an Android app entry and "Log out" (`useAuth().logout`). The
  app entry depends on where it runs: in the browser it is **Android app** (`Icon.Logo`,
  `/Vault/Help#android`, closes the menu); inside the app (`androidBridge()` is not `null`) it is
  **Change server** (`Icon.World`), which calls the bridge's `changeServer()` and leads to the app's
  "Connect to server" screen. The menu closes on an outside click or
  `Escape`. For admins, the menu also has **Admin** (`Icon.Settings`, `/Vault/Admin`,
  `nav:menu.admin`), with the `mobile-only` class: it only appears below 760px.

**On mobile** (below 760px) the bar is 56px tall and a single line: the brand (with the
name truncated with an ellipsis if it does not fit), the theme button and the avatar (36px). The
tabs and the magnifier are hidden — the sections move to the `Bottom_Nav` and Admin to the
avatar menu (see [11](./11-design-system.md#the-top-bar)).

Texts in `nav:menu.*` (tab labels) and `nav:sidebar.*` (`menu` — the
`aria-label` of the `<nav>` —, `search`, `lightMode`, `darkMode`, `account`, `assistantKey`,
`help`, `androidApp`, `changeServer`, `logout`). The
`sidebar` prefix is a leftover from the previous layout.

### `Bottom_Nav`
`Containers/Navigation/Bottom_Nav/`. The mobile navigation: a bar fixed at the bottom
of the screen, as in native apps. It only appears below 760px (above, `display: none`);
on desktop the `Top_Nav` tabs are in charge. It is also what the Android app shows
(see [17](./17-android-app.md)).

- **Five fixed sections** (`ITEMS` constant, no role filter), each one icon +
  label: **Home** (`Icon.Home`, `/Vault`, `nav:menu.home`), **Search**
  (`Icon.Search`, `/Vault/Search`, `nav:sidebar.search`), **Stats**
  (`Icon.Chart`, `/Vault/Stats`, `nav:menu.stats`), **Assistant** (`Icon.Sparkle`,
  `/Vault/Assistant`, `nav:menu.assistant`) and **Settings** (`Icon.Settings`,
  `/Vault/Settings`, `nav:menu.settings`). Admin does not fit: it stays in the avatar menu.
- **Active** — Home only with the exact path (`/Vault`, `/Vault/` or `/`); Search
  also on `/Vault/Game/*` (a game's page counts as search); the others by
  prefix. The active one gets `active` and `aria-current="page"`.
- **Height** — `var(--bottom-nav-height)` (defined in `Main.scss`: `62px +
  env(safe-area-inset-bottom)`), with that safe area as `padding-bottom`, so the
  buttons do not end up under the system gesture bar.

The `<nav>` uses `nav:sidebar.menu` as its `aria-label`.

---

## Hook index

| Hook | Endpoint | Returns |
|---|---|---|
| `useSignin` | `POST /auth/login` | `signInEmail`, `signInpassword` (+ setters), `signin`, `loading` |
| `useUsers` | `GET /user` | `users`, `loading`, `error`, `fetchUsers` |
| `useUser` | `POST /user`, `PATCH`/`DELETE /user/:id` | `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)`, `loading` |
| `useAccount` | `PATCH /user/me`, `PUT /user/me/password` | `busy` (`'username'`·`'password'`·`null`), `changeUsername(username)`, `changePassword(current, next)` |
| `useSystemVersion` | `GET /system/version?lang=` | `overview`, `loading`, `error`, `fetchVersion` |
| `useReleases` | `GET /system/releases?lang=&refresh=` | `list`, `loading`, `error`, `fetchReleases(refresh?)` |
| `useSystemUpdate` | `POST /system/update`, `GET /system/update/status`, `GET /system/version` | `status`, `restarting`, `done`, `error`, `start(version)`, `follow(version)` |
| `useGameSearch(query)` | `GET /games/search?…` | `items`, `total`, `error`, `loading`, `hasMore`, `loadingMore`, `loadMore`, `retry` |
| `useGameFilters` | `GET /games/filters` | `filters`, `error` |
| `useGameDetail(id)` | `GET /games/:id` | `game`, `error`, `loading` |
| `useLibrary` | `GET /library` | `library` (`{ items, counts, total }` or `null`), `error` |
| `useLibraryEntry(gameId)` | `GET`/`PUT`/`DELETE /library/:gameId` | `entry`, `loading`, `busy` (`'save'`·`'remove'`·`null`), `save(input)`, `remove` |
| `useIgdbIntegration` | `GET`/`PUT`/`DELETE /integrations/igdb`, `POST /integrations/igdb/test` | `status`, `busy` (`'save'`·`'test'`·`'remove'`·`null`), `save(clientId, clientSecret)`, `test`, `remove` |
| `useLibraryStats` | `GET /library/stats` | `stats` (`LibraryStats` or `null`), `failed` |
| `useDiscover` | `GET /library/discover` | `discover()` (→ `GameSummary` or `null`), `loading`, `error` |
| `useAiSettings` | `GET`/`PUT`/`DELETE /ai/settings`, `POST /ai/models` | `settings`, `failed`, `models`, `busy` (`'save'`·`'models'`·`'remove'`·`null`), `loadModels(apiKey?)`, `save(model, apiKey?)`, `remove` |
| `useAssistantChat(username)` | `POST /ai/chat` (`fetch`, streaming) | `messages`, `streaming`, `send(text)`, `stop`, `reset` |

`Hooks/System/types.ts` has the shapes of `/system/*` (`VersionOverview`, `ReleaseList`,
`UpdateStatus`, …), `installedLabel(installed)` (the release, or `base+branch (commit)`) and
`errorMessage(error)`.

`useSystemUpdate` polls every 2 s. While the backend restarts the requests
fail and that counts as `restarting`, not as an error. It ignores the previous update's
`status.json` (it compares `startedAt`) so an old `failed` does not pass for
this one's result, and it only reports `done` when the status is `success` **and** `/system/version` already
responds with the requested version.

`Hooks/Games/types.ts` has the shapes of `/games/*` (`GameSummary`, `GameSearchPage`,
`FilterOption`, `GameFilters`) and the constants `LIST_FILTERS` (the six list filters,
with the parameter name in the URL and in the API) and `SORTS` (without `relevance`, which only exists with
text).

`useGameSearch` searches again whenever the query changes. Each result stores the
query it answers (`key`): while the current query has no response, `loading` is
`true` and the previous results stay visible (the page fades them). Responses that
arrive after the query has changed are ignored. `loadMore` appends the next page;
`retry` repeats the request. Errors go into `error` (the first message, if it comes as an array),
without a toast.

`useGameFilters` opens right away with the last saved list (in memory during the session and in
`localStorage`, key `game-filters:v1`) and refreshes it in the background; if the saved one is
less than an hour old it does not even ask the server. Only the very first visit waits for
`GET /games/filters` (which the backend caches for 24 h). An error during the refresh, when there is a
saved list, is not shown.

`Hooks/Games/detailTypes.ts` has the shapes of `GET /games/:id` and of `/library`
(`GameRef`, `GameDetail`, `LibraryEntry`, `LibraryEntryInput`), the
`LIBRARY_STATUSES` list (the seven statuses, in panel order), the `LibraryStatus` type, and the
Home shelves: `SHELVES` (`playing`·`done`·`later`·`dropped`, in page
order), the `Shelf` type and `SHELF_OF` (status → shelf; every status has one).

`useGameDetail` and `useLibraryEntry` store the result together with the id it answers:
when navigating from one game to another, the previous result does not count (`loading` goes back to
`true`) and responses that arrive after the id has changed are ignored. `useGameDetail` puts
the API message in `error` (the first one, if it comes as an array), without a toast.

`useLibraryEntry` reads the entry without a toast — if the read fails, it treats the game as not on the
shelf (`entry: null`). `save(input)` does a `PUT` with the whole entry and `remove` does a
`DELETE`; both return `true`/`false`, update `entry` with the response and show a toast
(`library:saved` / `library:removed`, or the API message).

`useLibrary` requests the shelf once when Home mounts; no reload. Errors only set
`error: true`, without a toast.

`useIgdbIntegration` reads the status on mount (error → toast) and exposes `save` (only sends
`clientSecret` if it is not blank; returns `true`/`false`), `test` (toast with
`admin:igdb.testOk` or `admin:igdb.testFail.<reason>`) and `remove`. All writes show a
toast.

`useUser` and `useAccount` show a toast in both cases (`admin:createUser.created` /
`admin:editUser.saved` / `admin:users.deleted`; `settings:account.usernameSaved` /
`passwordSaved`; or the API message via `apiMessage`) and return `true`/`false`.
`changeUsername` calls `refreshUser()` from `Auth_Context` so the new name appears right away
(`refreshUser` only treats a 401 as "no session"; on other errors it tries twice more,
after 1.5 s and 3 s — see [09](./09-frontend-structure.md#auth_context)).

`useLibraryStats` requests the statistics once when the page mounts; no reload, no
toast (`failed: true` on error). The shapes (`LibraryStats`, `StatsGame`) live in the
hook itself.

`useDiscover` does not load anything by itself: `discover()` makes the request and returns the game, or
`null` with the API message in `error` (no toast — `Random_Pick` shows it in place
of the result).

`useAiSettings` reads the settings on mount (error → `failed`, no toast). `loadModels`
sends the typed key (if any) and stores the list in `models`; `save` sends the model and,
if present, the key; `remove` deletes and forgets the list. The three writes show a toast
(`assistant:settings.saved` / `removed`, or the API message). The Assistant page and
Settings each have their own instance.

`useAssistantChat(username)` stores the conversation in `sessionStorage` under
`assistant-chat:<username>` (only when it is not in the middle of a reply): it survives
reloading and changing page, but not closing the tab, nor does it carry over to another one. `send`
appends the question and an empty reply, and sends the last **40** messages with text and
no error (`HISTORY`) and the interface language. It reads the response line by line: `text`
appends to the last message, `tool` adds the search to the list, `error` sets the error. An
HTTP error response (before streaming) puts the backend's `message` into the message.
`stop` aborts the `fetch` (no text yet → `assistant:errors.stopped`); no network →
`errors.network`; leaving the page also aborts. `reset` aborts and empties the conversation.
