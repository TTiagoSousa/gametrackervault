# GameTracker Vault documentation

A portrait of the project: architecture, data model, API, interface and design.
The docs are written in English and describe the source code — when they disagree with
the code, the code wins.

The project has the foundation (login, your own account, user administration,
versions/updates, theme and languages), **game search** over the IGDB catalogue, the
**game page** (the IGDB record), the personal **shelf** (each user puts games in a
status, with hours, dates, rating and notes; Home shows it as four shelves, with a
**random game** on top), the shelf **stats**, the **assistant** (Claude, with each
user's own Anthropic key), the **Help** page, the **integrations** managed by the admin
(IGDB credentials) and the **Android app** (a WebView connected to the server, with the
APK served by the site itself).

## Index

### Foundations
| # | Document | What it answers |
|---|---|---|
| 01 | [Overview](./01-overview.md) | What the project is, which features and pieces it has, what it doesn't have yet |
| 02 | [Architecture](./02-architecture.md) | How the pieces connect, layers, security boundaries |
| 03 | [Data model](./03-data-model.md) | Tables, enums, migrations |

### Backend
| # | Document | What it answers |
|---|---|---|
| 04 | [Backend structure](./04-backend-structure.md) | Monorepo, anatomy of a module, layers, creating a new module |
| 05 | [Backend modules](./05-backend-modules.md) | One by one: what it does, which files it has, what it exposes |
| 06 | [API — endpoints](./06-api-endpoints.md) | Every route, with body, response and guards |

### Frontend
| # | Document | What it answers |
|---|---|---|
| 09 | [Frontend structure](./09-frontend-structure.md) | Folders, contexts, routes, guards, HTTP layer, i18n |
| 10 | [Pages and components](./10-frontend-pages.md) | Each screen (including the game page, Home with the shelf, Stats, the Assistant and Help), the top bar, each modal, each hook |
| 11 | [Design system](./11-design-system.md) | The Lombadas (spines) theme: design process, typography, shapes, mixins, the spine, the cover shelf, top bar and layout (including the game page's) |
| 12 | [Color palette](./12-color-palette.md) | Box grey (day, the default) and deep ultramarine (night), ultramarine accent, status and spine colors, tokens and usage rules |

### Cross-cutting
| # | Document | What it answers |
|---|---|---|
| 14 | [Main flows](./14-main-flows.md) | End-to-end journeys, step by step |
| 15 | [Deploy and environment](./15-deploy-and-environment.md) | Proxmox LXC (`deploy/proxmox`), variables, releases, local development |
| 16 | [Conventions and patterns](./16-conventions-and-patterns.md) | Naming, style, git, known debt |
| 17 | [Android app](./17-android-app.md) | The native app (a WebView connected to the server): why, structure, flows, the JS bridge, auto-update, building, signing and publishing the APK |

The numbering has gaps (07, 08, 13) on purpose: they were feature docs that didn't come
over to this project, and the numbers were kept so links don't break.

## How to use

- **"Where is this?"** → 05 (modules) or 10 (pages and hooks).
- **"How does X work end to end?"** → 14 (flows).
- **"Which color/font do I use here?"** → 12 and 11.
- **"Which route do I call?"** → 06.
- **"How does search / IGDB work?"** → 05 (`games/`, `integrations/`), 10 (Search page,
  `Igdb_Card`) and 14 (flows 5 and 6).
- **"How do the game page / the shelf work?"** → 03 (`Game`, `LibraryEntry`), 05
  (`games/`, `library/`), 06 (`/games/:id`, `/library`), 10 (Game and Home pages) and 14
  (flows 7 and 8).
- **"How do the stats / the random game work?"** → 03 (the `genres` and `ttb*` fields of
  `Game`), 05 (`library/`), 06 (`/library/stats`, `/library/discover`), 10 (Stats page,
  `Random_Pick`) and 14 (flows 10 and 11).
- **"How does the assistant (Claude) work?"** → 03 (`AiSettings`), 05 (`ai/`), 06
  (`/ai`), 10 (Assistant page, `Ai_Card`, `Markdown`) and 14 (flow 12).
- **"How does the Android app work / how do I publish a new APK?"** → 17, and 14 (flow 13).
- **"I'm going to create a new module"** → 04, then 16.
- **"How do I install, update or make a release?"** → 15, and `deploy/proxmox/README.md`.
