# Install on Proxmox (LXC)

*[Português](./README.pt-PT.md)*

A script on the Proxmox host creates a Debian 13 container and installs everything the
app needs inside it. No Docker, no Coolify.

```
┌─────────────────────── CT (Debian 13, unprivileged) ───────────────────────┐
│                                                                             │
│   nginx :80 ──┬── /        → /var/www/gametracker (frontend, static files)  │
│               └── /api/*   → 127.0.0.1:3000       (backend, systemd)        │
│                                    │                                        │
│                               PostgreSQL 17 (localhost only)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Piece | Where |
|---|---|
| Code | `/opt/gametracker` (clone of the repo, user `gametracker`) |
| Configuration | `/etc/gametracker/gametracker.env` |
| Service | `gametracker.service` (`node dist/src/main.js`) |
| Published frontend | `/var/www/gametracker` |
| Database | local PostgreSQL, database and user `gametracker` |
| Backups | `/var/backups/gametracker`, daily at 03:30, kept 14 days |
| Generated credentials | `/root/gametracker-credentials.txt` |

## 1. Create and install

In the Proxmox **host Shell** (Datacenter → node → Shell), one line:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/TTiagoSousa/gametrackervault/main/deploy/proxmox/ct-create.sh)"
```

It opens a menu in the style of the community-scripts:

- **Default settings** — next free CT ID, first active storage, 16 GB, 2 CPUs,
  2 GB of RAM, DHCP, the host's DNS, address `http://<CT IP>`, the latest release, the
  host's timezone.
- **Advanced settings** — screen by screen, prefilled with the suggestion:
  - ID and hostname (checks the ID is free);
  - disk and template storage, picked from a list showing free space;
  - disk, CPUs, RAM, swap;
  - bridge (list), **DHCP or static IP** (IP/prefix + gateway), optional VLAN;
  - the host's DNS or your own servers;
  - start with the host;
  - app address: the container's IP or your own domain;
  - admin username and password (blank = `admin`);
  - version: **the latest release** (newest `vX.Y.Z` tag, the default) or, for
    testing, the `staging` or `develop` branch; a token only if the repo is private.
    Updates always follow releases.

An invalid value is asked again instead of aborting. At the end the **Review** screen
shows everything you chose: *Create the container*, *Edit settings* or *Cancel*.

**Initial user: `admin` / `admin`.** Change the password before exposing the app to
the internet.

Without menus (automation): `NONINTERACTIVE=1` plus any variables you want to change —
the list is in the header of `ct-create.sh`:

```bash
NONINTERACTIVE=1 STORAGE=zfs_pool NET_MODE=static IP=192.168.0.61/24 GATEWAY=192.168.0.1 APP_URL=https://gametracker.example.com bash -c "$(curl -fsSL https://raw.githubusercontent.com/TTiagoSousa/gametrackervault/main/deploy/proxmox/ct-create.sh)"
```

### Without Proxmox (Debian 13 VM or server)

`install.sh` doesn't depend on Proxmox. On a clean Debian 13 machine (VM, mini-PC…),
as root:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/TTiagoSousa/gametrackervault.git /opt/gametracker
git -C /opt/gametracker checkout "$(git -C /opt/gametracker tag -l 'v*' --sort=-v:refname | head -1)"
APP_URL=http://<machine IP> TZ_NAME=Europe/London bash /opt/gametracker/deploy/proxmox/install.sh
```

It installs the same as in the container (PostgreSQL, Node, nginx on port 80, systemd
service, backups) and takes over port 80 — on a machine that already runs a web server,
use a dedicated container or VM. Optional variables are listed in the header of
`install.sh`. Tested in LXC; the procedure on a VM is the same.

## 2. Domain and SSL

In Nginx Proxy Manager (or any reverse proxy): `gametracker.example.com` (your domain) →
`http://<CT IP>:80`, with SSL.

`APP_URL` must be the address you open the app on: it's the origin accepted by CORS
and decides whether the session cookie is `secure` (only with `https`). If you change it
later, update `FRONTEND_URL` with `gametracker-config`.

## 3. Configure

Inside the CT (`pct enter <CTID>`):

```bash
gametracker-config
```

It opens a menu with the settings and each one's current value (secrets masked):
↑/↓ selects, Enter opens a box to change it, **Save** writes and asks whether to restart
the backend to apply. Changed settings are marked with `*`; **Quit** leaves without
saving. The database and `JWT_SECRET` don't appear in the menu.
`gametracker-config --raw` opens the whole file in nano.

### Game search (IGDB)

The IGDB key doesn't go in the configuration file: the admin enters it in the app, under
**Admin → Game catalogue (IGDB)**, with the Client ID and Client Secret of a Twitch
application (https://dev.twitch.tv/console/apps, type *Confidential*). The app checks
them with Twitch before saving and stores the secret encrypted in the database.

> ⚠ **Never change `TOKEN_ENCRYPTION_KEY`.** The installer generates it (copy in
> `/root/gametracker-credentials.txt`) and it encrypts the stored secrets (IGDB, the
> users' assistant keys). With a different key, they all have to be entered again.
> `gametracker-config` refuses to save a change to that line; older installs without it
> get one on their first update.

## 4. Update

**From the app (admin):** **Admin** page → **Version** card → *Update to vX.Y.Z*, or
the **Versions** page for the list with each release's notes, to pick any newer version.
Skipping versions is safe (all migrations are applied); going back is not allowed. The
dialog shows progress and reloads the page at the end.

**From the console (inside the CT):**

```bash
gametracker-update             # the latest release (vX.Y.Z tag)
gametracker-update v1.4.1      # a specific release
gametracker-update develop     # a branch (testing)
FORCE=1 gametracker-update     # rebuild even with nothing new
```

It fetches, checks out the version, runs `npm ci`, builds, migrates, publishes the
frontend, rewrites the units and the nginx config and restarts the backend. **If a step
fails, it rolls back to the previous version by itself** (checkout, build, restart) and
the app keeps working.

How the button works: the backend runs unprivileged and only writes
`/var/lib/gametracker/updates/request` with the version; the
`gametracker-updater.path` unit (root) sees the file and runs
`update.sh --from-request`, which writes progress to `status.json` and the output to
`update.log` in the same folder. Logs: `journalctl -u gametracker-updater`.

## Releases

A release is an annotated `vX.Y.Z` tag on `main`. Notes live in
`releases/<version>/{en,pt-PT,es}.md` and the app shows the ones in the chosen language
(English as fallback, then the tag message). To release, on an up-to-date `main`:

```bash
npm run release -- --dry-run   # preview the version and notes
npm run release -- --prepare   # writes releases/<version>/en.md from the commits
# write pt-PT.md and es.md next to it, commit on main
npm run release -- --push      # creates the tag (message = en.md) and pushes it
```

The version is bumped from the commits since the last release: `feat` → minor,
`fix`/`perf`/`refactor` → patch, `!` or `BREAKING CHANGE` → major. Notes are grouped
into *Features*, *Fixes* and *Improvements* (`chore`/`docs`/`ci` are left out).
`--title "…"` adds a headline above the notes; `--notes file.md` uses hand-written
notes; `--version vX.Y.Z` forces a version.

## 5. Maintenance

```bash
journalctl -u gametracker -f          # backend logs
systemctl status gametracker nginx postgresql
/opt/gametracker/deploy/proxmox/backup.sh            # back up now
gunzip -c /var/backups/gametracker/<file>.sql.gz | runuser -u postgres -- psql -d gametracker   # restore
```

Proxmox backups (vzdump) capture the whole container, but a snapshot taken with
Postgres running isn't always consistent — the daily dump is what guarantees the
database.

## Users

The installer creates the first user (ADMIN, `admin`/`admin` by default). From then on
public sign-up is closed: new accounts are created in the app's Admin panel.

## Reinstalling over an existing install

`bash /opt/gametracker/deploy/proxmox/install.sh` inside the CT can run again: the
existing configuration, secrets and database stay as they are.
