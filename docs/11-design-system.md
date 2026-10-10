# 11 · Design system

The theme is called **Lombadas** (Portuguese for "spines" — the spines of boxes on a shelf): the
application is a shelf of game cases. The colours come
from the cases' plastic — a case-grey (cinza-caixa) background, the navy ink of the printed lettering,
ultramarine as the accent — and the visual motif is the **spine**: the vertical strip of a case
seen on the shelf, with the title printed vertically. The login shows a full shelf
(decorative); Home shows the user's shelf, with the cases of their games face
on (cover and a spine strip in the status colour); a game's page shows the case
face on, large; Stats draws the shelf and the games finished per year with
spines.

The colours are in [12 · Palette](./12-color-palette.md). Everything else is here.

## How a visual change is decided

Lombadas was designed through the following process, and it is the process to follow for any
visual change that is not a one-off tweak:

1. **Start from the subject** — a collection of games in cases, not a generic dashboard. The
   choices of colour, type and shape come from there.
2. **Plan before code** — palette (4–6 named hex values), typefaces and their roles, layout
   concept (prose and ASCII wireframes) and principles.
3. **Review the plan against the brief** and against the usual clichés of templated design
   (cream background with a terracotta accent, identical cards all with the same
   radius and the same shadow, uppercase eyebrows above headings, `→` arrows on buttons, mono for
   small captions). The previous design ("editorial paper") fell into exactly that.
4. **Build, then critique** — responsive down to mobile, visible focus,
   `prefers-reduced-motion` respected; remove one accessory before calling it done.

## Principles

1. **The spine is the motif.** It is the only bold piece: vivid colour, vertical title, the
   status label at the top. Everything around it is calm — flat surfaces, a thin
   line, navy ink.
2. **Game statuses have their own colour.** Playing is yellow, finished is green, beaten is
   magenta (`--game-status-*`), the same everywhere: spines, login legend,
   Home shelves and cover strips, shelf panel markers, play
   time bars, spine row, legend and covers in Stats. The accent is never used for a status, nor a status as the accent — with
   one current exception: "Play later" (`PLAN_TO_PLAY`) uses `--accent`, in the shelf
   panel marker and on the Home "Up next" shelf (see
   [Game page](#game-page)).
3. **The accent is ultramarine and there is only one.** It marks the primary action (`Solid_Button`), the
   active tab, focus, hover and the *Admin* role. There is no second accent nor a
   brand gradient.
4. **Radii by hierarchy, not one for everything.** Panels 14px, controls 10px, spines
   6px (almost square, like the cases).
5. **Flat by default, shadow only on what floats.** Panels sit on the page with a
   thin line (`--card-border`) and `--card-box-shadow: none`. Menus, modals and toasts
   float with `--float-shadow`.
6. **Hierarchy before restraint.** "Save" and "Cancel" do not carry the same weight: the
   primary action is `Solid_Button` (solid ultramarine), secondary ones `Ghost_Button`.

## Typography

Two clearly distinct text families, plus a utility mono, loaded from Google
Fonts in `Styles/Fonts.scss`:

| Family | Variable | Role |
|---|---|---|
| **Unbounded** 500–800 | `$font_family_display` | headings, brand, titles on spines, avatars, login sign-in button — wide and rounded, reminiscent of case lettering |
| **Instrument Sans** 400–700 | `$font_family_sans` | everything else: running text, labels, tabs, buttons — the `body` font |
| **JetBrains Mono** 400–500 | `$font_family_mono` | versions and commits (Versions, `Version_Card`, `Release_Notes`) and, by inheritance, the release date, the `Update_Modal` log, the error code in `Error_Boundary` and the language codes in Settings |

There are no other families or aliases. The mono is not for small captions in general — only
for what is genuinely technical.

### Scale

| Use | Family | Size | Weight | Letter spacing |
|---|---|---|---|---|
| Login stage heading (`h1`) | Display | `clamp(30px, 3.4vw, 46px)` | 700 | `-.02em` |
| Home greeting / Stats, Settings and Help heading (`h1`) | Display | `clamp(24px, 3.4vw, 40px)` | 700 | `-.02em` |
| Page title (`Page_Header`) | Display | `clamp(24px, 3vw, 34px)` | 700 | `-.02em` |
| Game page title (`h1`) | Display | `clamp(21px, 3.2vw, 42px)` | 700 | `-.02em` |
| Assistant title (conversation header) | Display | 18px (16px on mobile) | 700 | normal |
| Login form title (`h2`) | Display | 28px | 700 | `-.02em` |
| Readout number (`Version_Card`) | Display | 22px | 700 | normal |
| Modal title (shared, `App.scss`) | Display | 20px | 700 | `-.02em` |
| Settings group title (`Settings_section`) | Display (`Section_Title`) | 19px | 700 | `-.015em` |
| Shelf and random game title (Home) / row title (Settings) | Display | 17px | 700 | normal |
| Section title (`Section_Title`) | Display | 16px (17px in `Version_Card`) | 700 | `-.015em` |
| Brand (top bar / login) | Display | 15px (14px on mobile) / 16px | 700 | normal |
| Bottom bar label (`Bottom_Nav`) | Sans | 11px | 600 | normal |
| Login sign-in button | Display | 15px | 600 | normal |
| Title on spine | Display | 13px | 700 | `.01em` |
| Top bar tab | Sans | 15px | 600 | normal |
| Segmented option (Settings) | Sans | 14px | 700 | normal |
| Caption (`Caption`) | Sans | 12px (11px on labels) | 600 | `.01em` |
| Body | Sans | 14–16px on pages, 12.5–13px inside components | 400–600 | normal |
| Button (`Ghost_Button` / `Solid_Button`) | Sans | 13.5px (14px in `Simple_Button`) | 700 | normal |
| Versions and commits | Mono | 10.5–11.5px (16px for each release's version) | 400–500 (the 600/700 requested in Versions and in the notes are not loaded: the browser synthesises the bold) | normal |

Unbounded is wide; large headings get slightly negative letter spacing
(`-.02em`) and never more than that. **There is no forced uppercase** anywhere, nor
eyebrows above headings.

Page titles live in the `Page_Header` mixin; modal titles are grouped at the end of
`App.scss` in a selector list (`.Admin_Create_User_Modal_Title`,
`.Update_Modal_Title`) — on purpose, so the titles across the whole application change
together. A new modal adds its title there.

## Shapes

```scss
// Styles/Formats/Global.scss
$border-radius: 14px;  // panels and modals
$ctrl-radius:   10px;  // buttons, inputs, tabs
$spine-radius:  6px;   // spines
```

Exposed as `--border-radius`, `--ctrl-radius` and `--spine-radius` (fixed, the same in
both themes).

Radius scale used in practice:

| Radius | Where |
|---|---|
| `var(--border-radius)` = 14px | `Panel_Surface` (Home shelves, Settings list, Admin list, `Version_Card`, "My shelf" panel, game page error), Versions section, `Modal_Panel`, account menu, `Global_Dropdown` panel, `Error_Boundary` |
| `var(--ctrl-radius)` = 10px | `Solid_Button`, `Ghost_Button`, `Control_Surface`; top bar tabs, logo, theme button and avatar; segmented options (the track is `ctrl-radius + 4px`); Admin avatars; login fields, button, logo and theme toggle; `Global_Dropdown` options; Versions labels; modal buttons and log |
| `var(--spine-radius)` = 6px | spines (`Spine`) and cases seen face on: `Game_Result` cover, game page cover, `Game_Shelf` and Home covers |
| `50%` | spine status label, status dots (login legend, Home shelves), status markers in the shelf panel, video play button, theme swatches, toast icon, `Update_Modal` steps |
| literals | 18px on Versions items, 16px on the toast, 14px on the `Bottom_Nav` icon pill and on the top corners of the shelf sheet (mobile), 14px on the `Version_Card` readouts, 999px on the Admin role pill, 8px on account menu items, on the show-password button, on the toast close and on the shelf panel rating buttons, 6px on the `Game_Shelf` count and on the status label of Home covers, 4px on the bottom corners of the login board and on the play time bars |

Borders and shadows are theme-reactive tokens (`Styles/Formats/Tokens.scss`):
`--card-border` (1px in the theme's line colour), `--card-box-shadow` (`none` in both
themes — kept as a token so blocks can get a shadow back from a single place) and
`--float-shadow` (wide, soft, bluish shadow for what floats).

## Mixins (`Styles/Mixins.scss`)

### Structure
| Mixin | What it does |
|---|---|
| `Pages_Configs` | page base: full width, flex column, `gap: 28px`, sans font |
| `Page_Header` | header: `.Right_Side` (title in Display `clamp(24px, 3vw, 34px)`, 700, `line-height: 1.1`) on the left and `.Left_Side` (actions) on the right, vertically centred; wraps if space runs out. No line below. The side names are swapped — a legacy, do not touch without sweeping the pages |

### Text
| Mixin | What it does |
|---|---|
| `Caption($size: 12px)` | sans, 600, `.01em` — column headers, readout keys, metadata |
| `Section_Title($size: 16px)` | display, 700, `-.015em` — section title inside a panel |

### Surfaces
| Mixin | What it does |
|---|---|
| `Panel_Surface` | flat panel: `--surface`, `--card-border`, `--border-radius`. No shadow or glow |
| `Control_Surface` | base for any editable field: `--surface-2` background, `--line-strong` border, `--ctrl-radius`; on focus an `--accent` border with a 4px `--accent-soft` halo; disabled at 45% |
| `Ghost_Button` | secondary button: `--surface` background, `--line-strong` border, main text, `--ctrl-radius`; on hover it takes the accent (text, border and `--accent-soft` background) |
| `Solid_Button` | `Ghost_Button` in solid ultramarine: `--accent` background, no border, `--on-accent` text; on hover it becomes `--accent-bright` — the primary action |
| `Modal_Overlay` | `--overlay-scrim` scrim with `backdrop-filter: blur(6px)`, `z-index: 1000`, 16px margin |
| `Modal_Panel` | modal panel: `--surface`, `--card-border`, `--border-radius`, `--float-shadow` and the `vaultPop` animation |

Always use these mixins instead of repeating the declarations — that is what keeps the theme coherent.

## Vocabulary components

Recurring pieces that a new screen should reuse:

- **Spine** (`Components/Spine/Spine.tsx`) — the app's motif. See below.
- **Spine shelf** (login only) — a row of spines aligned at the bottom
  (`display: flex; align-items: flex-end`) above a board in the stage text colour
  (`--stage-text`). The row's height comes from the parent; each spine takes a fraction of it.
- **Home shelf** — a full-width `Panel_Surface` with the title (status
  dot + name in Display 17px) and the count, a row of face-on covers with a fixed
  height and horizontal scroll (grid of 144px columns, 116px below 720px) and,
  below, an 8px **board** in the shelf colour (`--shelf-color`:
  `--game-status-playing`, `--game-status-finished`, `--accent` or `--danger-color`).
  Each cover (3:4, `--spine-radius`) has a 6px spine strip in the status colour
  (`--status-color`: the shelf's, `--text-soft` for `PAUSED`, `--game-status-beaten`
  for `COMPLETED_100`), the name (700, 13.5px, up to two lines, space for two reserved)
  and a line with the status label (`--status-color` background, `--status-ink` text;
  `--on-accent` for `PAUSED`) and the hours in `--text-faint`. On hover the name turns
  `--accent`; on focus the cover gets an `--accent-soft` halo. When empty, the shelf is a low
  strip with a sentence in `--text-faint`.
- **Cover shelf** (`Components/Game_Shelf/`) — the cases seen face on, side
  by side: title in Display 18px with the count in a `--surface-2` pill, and a row
  in a grid of 140px columns with horizontal scroll (the height does not change with the number of
  games). Each case is the 3:4 cover with `--spine-radius` and a 6px **spine strip**
  in the ink colour (`--text-main`) stuck to the left, below it the name (700, up to two
  lines, always reserving space for two) and the year in `--text-faint`. On hover the name
  turns `--accent`; on focus the cover gets an `--accent-soft` halo. It is the same language as the
  search's `Game_Result` (7px strip) and the game page cover (10px
  strip).
- **Count spines** (Stats) — the shelf as a row of spines, one per
  status, with width proportional to the number of games (`flex-grow`), 48px tall,
  `--spine-radius` and the status colour (`--status-color`); and the
  games finished per year as **stacks** of lying-down spines (one per game, up to 14) on a
  6px `--game-status-finished` board. It is the spine serving as a chart — no axes or
  gridlines.
- **Striped estimate** — what is calculated (hours from the IGDB average) never looks
  the same as what the user entered: entered hours are solid `--accent`, the
  estimated ones diagonal stripes of `--accent` on transparent
  (`--estimated-fill: repeating-linear-gradient(135deg, …)`), games with no hours
  `--surface-3`.
- **Fixed-height result space** — the Home random game: a 128px
  `--surface-2` block (96px on mobile) that shows a sentence or the chosen game without
  changing size.
- **Page header** — `Page_Header`: title in Unbounded and actions on the right
  (Settings, Admin, Versions).
- **Panel** — `Panel_Surface`. Groups a page's content: the Home
  shelves, the Settings rows, the user list, the `Version_Card`.
- **Row inside a panel** — rows separated by `1px solid var(--line)` only between
  them (`& + &`), with no line above or below (`.Settings_row`, `.Admin_Row`).
- **Segmented control** — options on a `--surface-2` track with a `--line` border; the active one
  in solid ultramarine (`--accent` / `--on-accent`). In Settings
  (`.Settings_segmented`).
- **Avatar** — rounded square (`--ctrl-radius`) with the initial in Display. In the
  top bar in `--text-main` with `--surface` text (turns `--accent` on hover); in the
  Admin list in `--accent` with `--on-accent` text.
- **Role pill** — `--surface-2` background and soft text; the *Admin* one in
  `--accent-soft` + `--accent`.
- **Status dot** — circle in the `--game-status-*` colour (login legend) or in the
  shelf colour (title of each Home shelf).
- **Readout** — `--surface-2` block with a caption (`Caption`), value in Display and
  metadata in Mono (`Version_Card_stat`).
- **Login stage** — `--stage-bg` block (ultramarine by day, deep ultramarine at
  night) with `--stage-text` / `--stage-soft` text: the left half of the login.
- **Toast** (`Simple_Alert`) — `--surface` card with the icon in a circle of the type's colour
  (`--status-ink` text) and a 3px progress bar in the same colour. The colour marks the type
  without painting the whole card.
- **Page error** (`Error_Boundary`) — dashed `--danger-color` border on
  `--danger-color-soft`, title in Display and a `Ghost_Button`.
- **Inline confirmation** — deleting or removing does not open a modal: the buttons give way, in the
  same place and with the same width, to "Really delete" (red) / "Cancel" (Admin
  rows, `Ai_Card`, `Igdb_Card`, shelf panel).
- **Markdown text** (`Components/Markdown/`) — assistant replies and the Help
  body; links to games (`game:<id>`) get a dashed underline, which becomes
  solid on hover.

### The spine (`Spine`)

```tsx
<Spine tone={4} title="Ecos de Vidro" status="beaten" height={.94} />
<Spine empty height={.8} />
```

| Prop | What it does |
|---|---|
| `tone` (1–6, default 1) | case colour: `--spine-${tone}`. Tone 2 (toasted yellow) takes dark ink (`--spine-ink-dark`, class `light-ink`); the others white ink (`--spine-ink`) |
| `title` | title printed vertically, **bottom to top** (`writing-mode: vertical-rl` + `rotate(180deg)`), in Display 13px, truncated with an ellipsis |
| `status` (`playing` / `finished` / `beaten`) | 22px round label at the top, in the `--game-status-*` colour, with a ring in the ink colour |
| `empty` | empty slot: no colour or title, dashed outline `2px dashed var(--line-strong)`, `aria-hidden` |
| `height` (0.7–1, default 1) | height relative to the row (becomes `--spine-height` in %) — real cases are not all the same size |

Width 44px by default, `--spine-radius`, and a 2px crease in the ink colour at 18% next
to the left edge. The `GameStatus` type is exported from the same file. Today only the login
uses it (decorative shelf); Home shows the cases face on (see
[Home shelf](#vocabulary-components)).

### The top bar

`Top_Nav` is the edge of a shelf: a `position: sticky` bar (`top: 0`,
`z-index: 50`) 72px tall, plain `--surface` background and a thick **4px border in the
ink colour** (`--text-main`) at the bottom. No blur or transparency. The inside has the same
width as the content (1600px, 24px margin) and is a `1fr auto 1fr` grid:

- **Brand** on the left: logo in a 36px square (`--ctrl-radius`) in `--accent`
  with the drawing in `--on-accent`, and "GameTracker Vault" in Display 15px.
- **Tabs** in the centre: plain text, no track (15px, 600, `--text-soft`). Hover
  with a `--surface-2` background and main text; the active one with an `--accent-soft` background and
  `--accent` text.
- **Actions** on the right: the search magnifier and the theme button, both 40px icon
  buttons (`Top_Nav_Icon_Button`: `--ctrl-radius`, `--line-strong` outline; the magnifier, on
  `/Vault/Search`, becomes active with `--accent-soft`, `--accent` outline and icon; the theme button
  shows sun/moon depending on `isDark`) and the 40px avatar (`--text-main`, `--accent` on hover), which
  opens the account menu — a `--surface` panel with `--card-border`, `--border-radius` and
  `--float-shadow`: name, role, "My account", "Assistant (Claude)" and "Help"
  (each with its icon) and "Log out", which turns red on hover.

Below 760px the bar is 56px, on a single line (`1fr auto`), and the bottom border
drops to 3px: the brand (32px logo, name at 14px truncated with an ellipsis), the
theme button and the avatar, both 36px. The tabs and the magnifier are hidden — the
navigation moves to the bottom bar (see [Mobile](#mobile)). The account menu items
with `mobile-only` (Admin) only appear here.

## Layout

`Pages/Private/Main` stacks the top bar and the content (and, on mobile, the bottom
bar):

```scss
.Vault {
  --bottom-nav-height: 0px;   // calc(62px + env(safe-area-inset-bottom)) below 760px
  min-height: 100svh;
  box-sizing: border-box;     // the bottom padding (mobile) counts within 100svh
}
.Vault_Content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
```

Below 760px `.Vault` gets `padding-bottom: var(--bottom-nav-height)` and
`.Vault_Content` becomes `padding: 16px 16px 48px`. `<html>` has `overflow-y: scroll` (scrollbar always present), so the width never jumps when a page starts to scroll. General rule: whatever appears and disappears reserves its place (`visibility: hidden` instead of not rendering), so nothing pushes the rest. There are no
global columns: each page is a column (`Pages_Configs`) and organises itself internally (Home
stacks the four shelves full width, 20px apart).

The login is separate: a two-column grid (`1.1fr` stage, `minmax(380px, 1fr)`
form) that, below 900px, becomes one column with the stage reduced to a strip at the
top (see [10](./10-frontend-pages.md#publicindex--entry)).

### Game page

`Pages/Private/Game/Game.scss`. One column (`Pages_Configs`, `gap: 36px`) with these
blocks:

```
← Back
┌───────────┬───────────────────────────────┬──────────────────┐
│  COVER    │ Title                         │ My shelf         │  Game_Top
│  (case,   │ year · developer              │ (pinned while    │  280px · 1fr · 340px
│  10px     │ [rating] [critics] [players]  │  scrolling)      │
│  spine)   │ developer / publisher / …     │                  │
└───────────┴───────────────────────────────┴──────────────────┘
┌──────────────────┬─────────────────────────┬─────────────────┐
│ How long to      │ About the game          │ Details         │  Game_Body
│ beat (bars)      │ (Read more)             │ View on IGDB    │  1fr · 1.4fr · 1fr
└──────────────────┴─────────────────────────┴─────────────────┘
Images and videos  ▶ ▶ ▢ ▢ ▢ ▢ →                                  360px row, scroll
Expansions · DLCs · Other versions · Same series                   Game_Shelf
```

- **Page** — `1fr 360px` grid: content on the left, shelf panel on the right
  (`sticky`, `max-height` of what is left of the screen, own scroll). Below 1080px one
  column, and the panel moves into a sheet that opens from the bottom (see
  [Mobile](#mobile)).
- **Top** — cover (260px) + details; below 720px the cover is 104px next to the
  title (`104px 1fr` grid, the cover spanning three rows) and the ratings and facts move down
  to full width (the details become `display: contents`).
- **Cover** — 3:4, `--spine-radius`, `--surface-2` background, 10px spine strip in
  `--text-main`; without a cover, the name in Display `--text-faint`.
- **Title** in Display `clamp(21px, 3.2vw, 42px)`, 700, `-.02em`; the subtitle (year,
  developer) in 16px 600 `--text-soft`.
- **Ratings** — three blocks side by side (up to 560px), each `--surface` with
  `--card-border` and `--ctrl-radius`: the number in Display 28px, the label and the count in
  `--text-faint`. Below 720px, padding `10px 12px` and the number at 22px.
- **Facts** (`Game_Facts`) — a `dl` in a `max-content 1fr` grid: labels 600
  `--text-faint`, values `--text-main`.
- **Section titles** in Display 18px.
- **Summary text** at 15px, `line-height: 1.65`, up to 70ch, `white-space: pre-line`
  (keeps the IGDB paragraphs). "Read more" and links in `--accent`, underlined on
  hover.
- **Body** — the summary (`1.5fr`) and a side column (`minmax(260px, 1fr)`) with the
  play times and the details; below 860px one column.
- **Images and videos** — a row in a grid of 360px columns (260px below 720px), 16:9,
  `--ctrl-radius`. Videos get a 56px play circle in `--accent` with the
  triangle in `--on-accent`, and the name in an `--overlay-scrim` strip.

**"My shelf" panel** (`Library_Panel`, styles in `Library_Panel.scss`) —
`Panel_Surface` as a column: the content scrolls inside (18px padding) and the footer
(Save + line of links, separated by `--line`) always stays at the bottom; `position:
sticky` at `--top-nav-height + 20px`, with a `max-height` of what is left of the screen. Groups are
separated by a `--line` rule, with the title in 12.5px 700 `--text-soft` and "Clear"
in `--accent` on the right. The header label has its background in the status colour. Statuses
are 38px buttons in a two-column grid (13px, 600, 8px radius, `--line-strong`
border) with a round 12px **marker**: 2px ring in the status colour; the
selected one has the marker filled, a double border in the same colour and a `--surface-2` background.
Each status's colour (`--status-color`):

| Status | Marker colour |
|---|---|
| `PLAYING` | `--game-status-playing` |
| `FINISHED_MAIN`, `FINISHED_EXTRAS` | `--game-status-finished` |
| `COMPLETED_100` | `--game-status-beaten` |
| `PLAN_TO_PLAY` | `--accent` |
| `PAUSED` | `--text-soft` |
| `DROPPED` | `--danger-color` |

These are the same colours as Home: `PLAYING`, `FINISHED_*`, `PLAN_TO_PLAY` and `DROPPED` give the
colour to the four shelves, and `PAUSED` and `COMPLETED_100` to the strip and label of their
covers. `PLAN_TO_PLAY`, `PAUSED` and `DROPPED` have no status token of their own. Fields are 38px (`Control_Surface`); the rating is ten 32px buttons
in a grid, number in Display, the selected one in `--accent` / `--on-accent`. Save is a
full-width `Solid_Button` (44px); the footer links are 13px 600
`--text-soft`, "Remove from shelf" red on hover and "Yes, remove" always red.

**Play time** (`Time_To_Beat`) — each row has the label and value (Display 14px) on
top and a 12px bar (`--surface-2`, 4px radius) with a proportional fill: the
main story in `--game-status-playing`, main + side content in
`--game-status-finished`, 100% in `--game-status-beaten`. The user's hours are a
3px vertical tick in `--text-main`, slightly taller than the bar, over all
three.

### Stats, Assistant, Help and Settings

- **Stats** (`Stats.scss`) — regular grid: a summary strip (`Panel_Surface`
  with four equal cells separated by `--line` rules; numbers in Display 30px) and
  rows of two panels with the same height (`align-items: stretch`; one column below
  860px). Each panel has its header (Display 16px title + note on the right) separated from the
  body by a rule, and 22px of padding (`--panel-pad`). Rating bars (`--accent`,
  filling the panel) and genre bars (`--surface-2` with an `--accent` fill); highlights in
  5 fixed 52px rows, empty slots dashed. The highlight covers are small,
  with the spine strip in the status colour. Status colours come from the
  `status-<STATUS>` classes (`--status-color`), the same as in the shelf panel.
- **Assistant** (`Assistant.scss`) — the page is exactly the height of the screen (`100svh` minus the
  top bar, the bottom bar and the container spacing) and never scrolls. `1fr 300px` grid
  (below 980px only the conversation, with the suggestions inside the empty conversation, centred).
  The conversation is a `Panel_Surface` as a column: compact header (38px
  icon, Display 18px title, model in mono `--text-faint`), messages with their own scroll
  and the composer (52px) at the bottom, separated by rules. The right column has the
  suggestions as left-aligned `Ghost_Button` buttons. 32px avatars (`--ctrl-radius`): the user's in `--surface-3`, the
  assistant's in `--accent` with the `Sparkle` in `--on-accent`. Questions sit in a
  `--surface-2` block; replies have no box. IGDB searches are `--surface-2` pills
  with the magnifier.
- **Help** (`Help.scss`) — a column of `<details>` in a panel, with the title in Display,
  the "Admin" label and an arrow that rotates on open.
- **Settings** (`Settings.scss`) — `200px 1fr` grid: pinned index (links 14.5px 600
  `--text-soft`, `--surface-2` background on hover) and `Panel_Surface` cards with 28px of
  padding (20px below 720px), `Section_Title` 17px title; blocks are separated by
  `--line` rules. 44px `Control_Surface` fields (`--danger-color` border with
  `aria-invalid`); the password in a two-column grid; the rules with a 14px circle
  that fills with `--game-status-finished` and a `--status-ink` tick when met.
- **Random game** (Home) — `Panel_Surface` in two columns (one below 860px):
  text and buttons (`Solid_Button` + `Ghost_Button`, 42px) on the left, the result
  space on the right.

### Mobile

Below **760px** the app changes shape — this is also what the Android app shows. Tablet
(760–1080px) keeps the desktop layout, except for the shelf sheet.

- **Two bars.** At the top, the `Top_Nav` reduced to 56px (brand, theme, avatar). At the bottom,
  the `Bottom_Nav`: `position: fixed` at the bottom, `z-index: 60`, height
  `var(--bottom-nav-height)` (`62px + env(safe-area-inset-bottom)`, with the safe area
  as padding), `--surface` background and a `--line-strong` rule on top. Five equal
  columns, each with the icon (20px) in a 48×28px pill (14px radius) and the label
  in 11px 600, in `--text-faint`; the active one in `--accent` with the pill in
  `--accent-soft`. Focus with an `--accent-soft` halo on the pill.
- **One variable for the bottom.** Everything that needs to know about the bottom bar uses
  `--bottom-nav-height` (0 on desktop): the bottom padding of `.Vault`, the height of the
  Assistant and the position of the shelf bar. Nothing repeats the 62px.
- **Sheet that slides up** (game page, below 1080px) — a floating bar
  (`Game_Dock_Trigger`: 52px, 16px on each side, 12px above the bottom bar,
  `--surface`, `--line-strong`, `--ctrl-radius`, `--float-shadow`, `z-index: 55`) with the
  title in Display 15px, the status label (6px radius, in the status colour, as in the
  panel) and an arrow. It opens the `--overlay-scrim` backdrop (`z-index: 80`, above both
  bars) with the `--surface` sheet sitting at the bottom: up to `90svh`, 14px radius only on top,
  a 40×4px handle in `--line-strong` and "Close" in `--accent` (14px 700). The panel
  loses its border and radius and fills the sheet. On desktop the wrappers are
  `display: contents`.
- **Sizes.** Page titles from 24px (the `clamp`s go down to that), the
  game page one from 21px; container with 16px on top and on the sides; panels
  with 14–16px of padding (Home, Stats, Settings, Help); panel titles at
  15–16px; body at 13–14.5px. The Settings segmented controls become three
  equal-width buttons spanning the full width, and the save buttons go full width.

## The background

```scss
main {
  min-height: 100svh;
  background: var(--bg);
}
```

Plain case-grey by day, deep ultramarine at night. No halos, grids or
pseudo-elements — the panels sit directly on it.

## Animations

| Keyframe | Defined in | Used in |
|---|---|---|
| `vaultPop` | `App.scss` | entry of modals (`Modal_Panel`, .26s), the account menu (.18s) and the `Global_Dropdown` panel (.16s): rises 10px and scales from .985 |
| `sa-slide-in`, `sa-slide-out`, `sa-progress` | `Simple_Alert.scss` | toast entry, exit and progress bar |
| `Update_Modal_pulse` | `Update_Modal.scss` | update step in progress |

The login and Home are static: the shelf does not move (Home only draws the
shelves when the shelf data arrives, all at once). Transitions of 0.15–0.16s `ease`
on controls. With `prefers-reduced-motion`, a global rule at the end of `App.scss` reduces
all animations and transitions to ~0.

## Global details

- **Matching scrollbars**: 8px, thumb in `--line-strong` with 8px radius, `--accent` on
  hover, via `scrollbar-color` and `::-webkit-scrollbar`.
- **Text selection**: `--accent` background, `--on-accent` text.
- **Minimal reset**: `margin`/`padding` at zero, `scroll-behavior: smooth`,
  `text-decoration: none`, `-webkit-font-smoothing: antialiased`.

## SCSS naming

Classes in `Pascal_Snake_Case`, with the component name as a prefix:

```
.Version_Card_stat        .Versions_item_head        .Settings_segment
.Admin_Row_Username       .Simple_Alert__message     .Spine_Status
```

Each component has its sibling `.scss`, imported at the top of the `.tsx`. There are no CSS Modules —
separation is by prefix convention.

## Rules for new code

1. Never write a hex or `rgba()` colour in a component. Use a CSS var — and if it does not
   exist, create it in `Colors/Tokens.scss` with a value for **both** themes (exceptions
   documented in [12](./12-color-palette.md#exceptions)).
2. Prefer the mixin to the repeated declaration; radii always via `--border-radius` (panels),
   `--ctrl-radius` (controls) or `--spine-radius` (spines).
3. Flat panels; shadow only on what floats, and always via `--float-shadow`.
4. Game statuses only with `--game-status-*`; ultramarine is for action, focus and selection.
5. No eyebrows, no forced uppercase, no arrows on buttons. Versions and commits in
   `$font_family_mono`; captions in `Caption`; section titles in `Section_Title`.
6. Anything that moves must have a fallback under `prefers-reduced-motion`.
7. Mobile: a page's adjustments go in a `@media (max-width: 760px)` block at the end
   of its `.scss` (see [16](./16-conventions-and-patterns.md#phone)); anything fixed to the
   bottom of the screen subtracts `--bottom-nav-height`.
8. Major visual change → follow the design process above (plan, review against the
   brief, build, critique) before touching the code.
