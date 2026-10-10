# 12 · Colour palette

Two complete palettes — **day** and **night** — not one inverted from the other. The
colours come from the plastic of game cases: **case grey** (cinza-caixa) as the background, the **navy
ink** of the printed lettering and **ultramarine** as the accent. The source theme is
day. Night is the same shelf in the dark: deep ultramarine, never neutral black.

The three game statuses have their own spine colours — **yellow** (playing), **green**
(finished) and **magenta** (beaten) — and the decorative spines six fixed colours, the same
in both themes, like real cases.

## How it works

```
Styles/Colors/Global.scss    SCSS variables — the raw palette
        ▼
Styles/Colors/Tokens.scss    $theme: (name: (night-value, day-value))  +  $fixed
        ▼
Styles/Colors/Theme.scss     @each → --name inside .Dark_Mode and .Light_Mode;
                             the $fixed ones go to :root
        ▼
ThemeContext                 writes the class on <body> (Light_Mode by default)
        ▼
components                   var(--name)
```

Switching theme means switching **one class on the `body`**. No component knows which themes
exist. Only `Tokens.scss` reads from `Global.scss`; components always use the tokens.

The pair in `$theme` is still `(night, day)` — the order is historical, it does not say which
theme is the default.

The same mechanism exists for shapes in `Styles/Formats/` (borders, shadows, radii — see
[11](./11-design-system.md#shapes)).

---

## Base palette — Day (case grey)

### Surfaces
| SCSS | Hex | Use |
|---|---|---|
| `$day-bg` | `#E9EBEF` | application background — the case grey |
| `$day-surface` | `#F7F8FA` | panels, top bar, account menu, modals, the form half of the login |
| `$day-surface-2` | `#DFE2E8` | inset surfaces: inputs, segmented control track, row and tab hover, readouts |
| `$day-surface-3` | `#D3D7DF` | surface hover |

### Lines
| SCSS | Value |
|---|---|
| `$day-line` | `rgba(15, 26, 60, .12)` |
| `$day-line-2` | `rgba(15, 26, 60, .22)` |

### Text
| SCSS | Hex | Use |
|---|---|---|
| `$day-text` | `#0F1A3C` | main text — the navy ink (also the top bar border and the avatar) |
| `$day-soft` | `#4A5576` | secondary |
| `$day-faint` | `#7F88A3` | tertiary, placeholders, counts |

### Accent
| SCSS | Hex | Use |
|---|---|---|
| `$day-accent` | `#2F3BE3` | ultramarine — base accent and login stage |
| `$day-accent-bright` | `#1F29C4` | highlight: `Solid_Button` hover, what is new (new versions, step in progress, scope in the notes) |
| `$day-accent-deep` | `#C9CCF8` | light tone (border of the installed release) |

> By day, `bright` is **darker** than the base: on a light background, highlighting works by
> contrast downwards, not upwards. `deep` swaps roles and becomes the light tone.

---

## Base palette — Night (deep ultramarine)

### Surfaces
| SCSS | Hex |
|---|---|
| `$night-bg` | `#0D1230` |
| `$night-surface` | `#151B42` |
| `$night-surface-2` | `#1C2352` |
| `$night-surface-3` | `#252D63` |

### Lines
| SCSS | Value |
|---|---|
| `$night-line` | `rgba(200, 208, 255, .12)` |
| `$night-line-2` | `rgba(200, 208, 255, .22)` |

### Text
| SCSS | Hex |
|---|---|
| `$night-text` | `#EEF0FF` |
| `$night-soft` | `#A7AED6` |
| `$night-faint` | `#6F78A8` |

### Accent
| SCSS | Hex |
|---|---|
| `$night-accent` | `#7C86FF` |
| `$night-accent-bright` | `#A5ACFF` |
| `$night-accent-deep` | `#2A3290` |

The night lines and text are lavender (`200, 208, 255`), not neutral whites — that is
what keeps night within the ultramarine family.

---

## Game statuses (`Global.scss`)

| SCSS | Night | Day | Status |
|---|---|---|---|
| `$playing-*` | `#FFD23F` | `#F5B700` | playing — yellow |
| `$finished-*` | `#3EDDB6` | `#13A383` | finished — green |
| `$beaten-*` | `#FF6FAE` | `#D6337F` | beaten — magenta |

## Semantic (`Global.scss`)

| SCSS | Night | Day | Meaning |
|---|---|---|---|
| `$success-*` | `#3EDDB6` | `#13865F` | good, done, up to date |
| `$warning-*` | `#FFD23F` | `#B98700` | attention, waiting |
| `$danger-*` | `#FF7A7A` | `#D33A3A` | error, delete, log out |
| `$info-*` | `#7C86FF` | `#2F3BE3` | information (the accent itself) |

---

## Tokens (CSS vars)

What components use. The names say the colour's **role**, not where it is used. Each
row has a night and a day value.

### Surfaces
| Token | Night | Day |
|---|---|---|
| `--bg` | `$night-bg` | `$day-bg` |
| `--surface` | `$night-surface` | `$day-surface` |
| `--surface-2` | `$night-surface-2` | `$day-surface-2` |
| `--surface-3` | `$night-surface-3` | `$day-surface-3` |

### Lines
| Token | Night | Day |
|---|---|---|
| `--line` | `$night-line` | `$day-line` |
| `--line-strong` | `$night-line-2` | `$day-line-2` |

`--line` separates rows inside a panel (Settings, Admin) and the user from the items
in the account menu. `--line-strong` is the border of controls and the dashed outline of empty
slots.

### Text
| Token | Night | Day |
|---|---|---|
| `--text-main` | `$night-text` | `$day-text` |
| `--text-soft` | `$night-soft` | `$day-soft` |
| `--text-faint` | `$night-faint` | `$day-faint` |

`--text-main` also paints the 4px border of the top bar and the bar's avatar (with
`--surface` on top).

### Accent
| Token | Night | Day |
|---|---|---|
| `--accent` | `$night-accent` | `$day-accent` |
| `--accent-bright` | `$night-accent-bright` | `$day-accent-bright` |
| `--accent-deep` | `$night-accent-deep` | `$day-accent-deep` |
| `--accent-soft` | `rgba(124, 134, 255, .18)` | `rgba(47, 59, 227, .10)` |
| `--on-accent` | `#0D1230` | `#FFFFFF` |

Ultramarine (`--accent`) belongs to the primary action (`Solid_Button`, the modals' save
buttons, the login sign-in button), the top bar logo, the active option of the
segmented control, the Admin avatars, focus, hover and the *Admin* role.
`--accent-soft` is the background of the active tab, of accent hovers and the focus halo.

`--on-accent` is what is written **on top of** the accent: white by day, deep ultramarine
at night (the night accent is too light for white text).

### Login stage
The left half of the login. It has its own family so it is always a strong ultramarine field,
independent of the surfaces.

| Token | Night | Day |
|---|---|---|
| `--stage-bg` | `#151B42` | `#2F3BE3` |
| `--stage-text` | `#EEF0FF` | `#FFFFFF` |
| `--stage-soft` | `#A7AED6` | `rgba(255, 255, 255, .78)` |
| `--stage-line` | `rgba(200, 208, 255, .14)` | `rgba(255, 255, 255, .22)` |

`--stage-text` paints the brand, the heading, the logo background, the shelf board and the
ring of the legend dots; `--stage-soft` the text and the legend.

### Game statuses
The same colours everywhere: the label at the top of the spines, the login legend, the dot and
board of the Home "Playing" and "Finished" shelves (the other two use `--accent`
and `--danger-color`), the strip and label of Home covers (`COMPLETED_100` in
`--game-status-beaten`), the status markers in the "My shelf" panel and
the play time bars on a game's page (see
[11](./11-design-system.md#game-page)).

| Token | Night | Day | Status |
|---|---|---|---|
| `--game-status-playing` | `$playing-night` | `$playing-day` | playing |
| `--game-status-finished` | `$finished-night` | `$finished-day` | finished |
| `--game-status-beaten` | `$beaten-night` | `$beaten-day` | beaten |

### Interface semantics
| Token | Night | Day | Use |
|---|---|---|---|
| `--success` | `$success-night` | `$success-day` | "up to date" (`Version_Card`), completed steps (`Update_Modal`), *Installed* label (Versions), fixes (`Release_Notes`) |
| `--danger-color` | `$danger-night` | `$danger-day` | errors, "Log out" hover |
| `--danger-color-soft` | `rgba(255, 122, 122, .14)` | `rgba(211, 58, 58, .10)` | `Error_Boundary` background, "Log out" hover |
| `--alert-success-background` | `$success-night` | `$success-day` | success toast |
| `--alert-warning-background` | `$warning-night` | `$warning-day` | warning toast |
| `--alert-error-background` | `$danger-night` | `$danger-day` | error toast |
| `--alert-info-background` | `$info-night` | `$info-day` | info toast |

In `Simple_Alert` these colours paint only the icon circle and the progress bar (via
`--alert-color`, defined locally by the type modifier) — never the card.

### Fixed (the same in both themes, in `:root`)
| Token | Value | Use |
|---|---|---|
| `--overlay-scrim` | `rgba(9, 13, 36, .55)` | modal backdrop |
| `--spine-1` | `#E4572E` | decorative spines — brick orange |
| `--spine-2` | `#F3A712` | 〃 — toasted yellow (takes dark ink) |
| `--spine-3` | `#29BF8E` | 〃 — green |
| `--spine-4` | `#6A4CFF` | 〃 — violet |
| `--spine-5` | `#E83F8B` | 〃 — pink |
| `--spine-6` | `#1F2A5C` | 〃 — navy |
| `--spine-ink` | `#FFFFFF` | title and label ring on the spines |
| `--spine-ink-dark` | `#0F1A3C` | the same, on the light spine (`tone={2}`) |
| `--status-ink` | `#0F1A3C` | text on top of status colours (toast icon) |

The spines are the same in both themes on purpose — like real cases, they do not change with the
light. `Spine` picks the colour with `style={{ '--spine-color': \`var(--spine-${tone})\` }}`.

### Shapes (`Styles/Formats/Tokens.scss`)
| Token | Night | Day |
|---|---|---|
| `--card-border` | `1px solid rgba(200, 208, 255, .12)` | `1px solid rgba(15, 26, 60, .12)` |
| `--card-box-shadow` | `none` | `none` |
| `--float-shadow` | `0 18px 44px rgba(4, 7, 26, .55)` | `0 16px 40px rgba(15, 26, 60, .18)` |
| `--border-radius` | 14px (fixed) | 〃 |
| `--ctrl-radius` | 10px (fixed) | 〃 |
| `--spine-radius` | 6px (fixed) | 〃 |

`--card-box-shadow` is `none` on purpose: panels sit on the page. Today only the
Versions section reads it. `--float-shadow` is for what floats — `Modal_Panel`, the account
menu, the `Global_Dropdown` panel and the toast.

### Currently unused
`--stage-line` is defined but no component reads it. (`--surface-3` is now
used: the user avatar in the Assistant, games with no hours in Stats and the background of the
random game cover.)

---

## Usage rules

1. **No hex outside `Colors/Tokens.scss`.** Components always use `var(--token)`.
   If the token does not exist, create it there **with a value for both themes** (or in `$fixed`,
   if it is genuinely the same in both). `Global.scss` is only read by `Tokens.scss`.
2. **Never set a colour in only one of the themes.** The `$theme` table is a pair; a missing value
   silently breaks the other theme.
3. **Ultramarine for action, focus and selection; nothing else is accent.** Interface states
   use `--success` / `--danger-color` / `--alert-*`, and game statuses
   `--game-status-*` — never the accent, and the accent never stands in for a status.
4. **Text on the accent is `--on-accent`**; on status colours it is `--status-ink`; on
   spines it is `--spine-ink` (or `--spine-ink-dark` on the light one); on the login stage it is
   `--stage-text`.
5. **Names by role.** A new token says what the colour does (`--surface-2`,
   `--danger-color-soft`), not where it appears. There are no per-component tokens.

## Exceptions

Places with a literal colour outside `Colors/Global.scss`, all on purpose:

| Where | Why |
|---|---|
| `Settings.scss` — theme swatches (`.Settings_swatch`) | they must show the **other** theme, not the one in use; so they copy the hex values of `$day-bg` (`#E9EBEF`) and `$night-bg` (`#0D1230`). If the palette changes, change them here too |
| `Colors/Tokens.scss` — `--accent-soft`, `--on-accent`, `--stage-*`, `--danger-color-soft`, `--overlay-scrim`, `--spine-*`, `--status-ink` | literals inside the token file itself, which is the right place for them |
| `Formats/Tokens.scss` — `--card-border`, `--float-shadow` | borders and shadows live in the shapes, not in the colours |
