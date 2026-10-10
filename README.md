# GameTracker Vault

*[Português](./README.pt-PT.md)*

A self-hosted personal game tracker. Everyone gets their own shelf — what they're
playing, what they've finished, what they dropped and what they want to play — with
hours, dates, a rating and notes, and every game's details come from the IGDB catalogue.
It runs in a Proxmox container (or on a Debian machine) with the database inside, so your
data never leaves your server.

![GameTracker Vault home: the shelf with the games you are playing and a random-game picker](./docs/screenshots/desktop-home.webp)

## Features

- **IGDB search** with filters (platforms, genres, themes, modes, years, rating…) and a
  page for every game: cover, summary, gallery, videos, average time to beat.
- **Personal shelf** on four rows: playing, to play, finished and dropped.
- **Stats**: hours, games by status, genre and year, and your ratings. Where you didn't
  log hours, it uses IGDB's average times.
- **Random game**: one from your list, or a well-rated one you don't have yet.
- **Claude assistant** (optional): chat about games and get recommendations based on
  your shelf and ratings. Each user brings their own Anthropic key.
- **Multiple users**, each with their own shelf; the admin creates the accounts.
- **Android app** connected to your server, which updates itself.
- **One-click updates** from the Admin panel, rolling back automatically if anything
  fails.
- Interface in English, Portuguese and Spanish, light and dark themes, built for phones
  too.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="./docs/screenshots/desktop-game.webp" alt="A game page with your shelf panel"></td>
    <td width="50%"><img src="./docs/screenshots/desktop-stats.webp" alt="Stats"></td>
  </tr>
  <tr>
    <td align="center">A game page with your shelf panel</td>
    <td align="center">Stats</td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/desktop-search.webp" alt="IGDB search with filters"></td>
    <td><img src="./docs/screenshots/desktop-home-dark.webp" alt="Dark theme"></td>
  </tr>
  <tr>
    <td align="center">IGDB search with filters</td>
    <td align="center">Dark theme</td>
  </tr>
</table>

<table>
  <tr>
    <td width="25%"><img src="./docs/screenshots/phone-home.webp" alt="Phone: home"></td>
    <td width="25%"><img src="./docs/screenshots/phone-game.webp" alt="Phone: game page"></td>
    <td width="25%"><img src="./docs/screenshots/phone-stats.webp" alt="Phone: stats"></td>
    <td width="25%"><img src="./docs/screenshots/android-setup.webp" alt="Android app: first launch"></td>
  </tr>
  <tr>
    <td align="center">Phone: home</td>
    <td align="center">Phone: game page</td>
    <td align="center">Phone: stats</td>
    <td align="center">Android app: first launch</td>
  </tr>
</table>

## Install

**You need:** a Proxmox VE host with internet access. The default container gets
2 CPUs, 2 GB of RAM and a 16 GB disk.

In the Proxmox host's Shell (Datacenter → node → Shell):

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/TTiagoSousa/gametrackervault/main/deploy/proxmox/ct-create.sh)"
```

A menu asks for the essentials (or takes all the defaults), creates a Debian 13
container and installs the latest release: PostgreSQL, Node, nginx and the backend as a
service. At the end it shows the app's address.

No Proxmox? On a Debian 13 VM or server, see
[Without Proxmox](./deploy/proxmox/README.md#without-proxmox-debian-13-vm-or-server).
The full guide — static IP, VLAN, domain, configuration, maintenance — is in
[`deploy/proxmox/README.md`](./deploy/proxmox/README.md).

## First steps

1. **Sign in with `admin` / `admin`** and change the password straight away in
   **Settings → Account**.
2. **Connect the game catalogue.** Search doesn't work without it. Create an application
   in the [Twitch developer console](https://dev.twitch.tv/console/apps) (type
   *Confidential*; IGDB uses Twitch accounts) and enter the Client ID and Client Secret
   in **Admin → Game catalogue (IGDB)**. It's free, one key for the whole installation.
3. **Create accounts** for everyone else in **Admin → Users**.
4. **Assistant (optional).** Each user adds their own
   [Anthropic](https://console.anthropic.com/) key in **Settings → Assistant** and picks
   a model.
5. **Domain and HTTPS (optional).** Point a reverse proxy (Nginx Proxy Manager, Caddy,
   Traefik…) at `http://<container IP>:80` and change the app's address with
   `gametracker-config` inside the container.

The app's **Help** page walks through each of these steps in more detail.

## Updates and backups

- **Updating:** **Admin → Version → Update**, or `gametracker-update` inside the
  container. It follows published releases (`vX.Y.Z` tags); each release's notes show up
  in the app and live in [`releases/`](./releases).
- **Backups:** the database is dumped every day at 03:30 to `/var/backups/gametracker`
  (kept for 14 days). To restore, see
  [Maintenance](./deploy/proxmox/README.md#5-maintenance).
- **Don't lose** `/root/gametracker-credentials.txt` (inside the container): it holds
  the key that encrypts stored secrets (the IGDB key, the assistant keys).

## Android app

**[Download the APK](https://github.com/TTiagoSousa/gametrackervault/raw/main/apps/frontend/public/downloads/gametracker-vault.apk)**
(Android 8 or newer), or from the app itself under **Help → Android app**, served by
your server.

Open the file on your phone, allow installs from that source if Android asks, and tap
**Install**. The first time, enter your server's address (the same one you use in the
browser). The interface always comes from the server; when a new APK is out, the app
offers to update itself.

## Privacy

Everything you enter stays in your server's database. The only things that go out are:

- requests to **IGDB** (searches and game details), made by the server;
- cover images and videos, loaded by the browser from IGDB and YouTube;
- conversations with the **assistant**, sent to Anthropic with the key of whoever uses
  it — and only if that person sets it up. They include that person's shelf, for the
  recommendations.

## Development

```bash
npm install
cp apps/backend/.env.example apps/backend/.env   # and fill it in
npm run dev
```

Requires Node 22+ and PostgreSQL. Backend in NestJS + Prisma, frontend in React + Vite,
Android app in Java (WebView). Commands, conventions and the release flow are in
[`CONTRIBUTING.md`](./CONTRIBUTING.md); technical documentation is in
[`docs/`](./docs/README.md).

| Folder | What |
|---|---|
| `apps/backend` | NestJS + Prisma + PostgreSQL API |
| `apps/frontend` | React + Vite SPA |
| `apps/android` | Android app (a WebView connected to your server) |
| `packages/shared` | types and constants used by both |
| `deploy/proxmox` | installer (LXC container or Debian 13) and updates |
| `releases` | notes for each release (en, pt-PT, es) |
| `docs` | technical documentation and the screenshots |

## License

[PolyForm Noncommercial 1.0.0](./LICENSE.md). You're free to self-host it, use it and
change it for any noncommercial purpose — at home, for friends, in a club or school.
Selling it, offering it as a paid service or using it inside a commercial product is not
allowed. If you share it or a modified version, keep the license and the copyright
notice and point back to this repository; the easiest way is to fork it.
