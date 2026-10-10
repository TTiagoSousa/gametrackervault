#!/usr/bin/env bash
# Installs GameTracker Vault inside a Debian 13 container (ct-create.sh calls it; it can
# also be run by hand inside the CT). Runs as root, from the already cloned repo.
#
# Leaves running: local PostgreSQL, the backend as a systemd service (127.0.0.1:3000) and
# nginx on port 80 serving the frontend and proxying /api to the backend.
#
# Safe to run again: existing secrets and database are left as they are.
#
# Variables (all optional):
#   APP_URL         address the app is opened at (default: http://<CT IP>)
#   ADMIN_USERNAME  first user, becomes ADMIN (default: admin)
#   ADMIN_PASSWORD  their password (default: admin — change it after installing)
#   NODE_MAJOR      Node version (default: 22)
#   TZ_NAME         time zone, e.g. Europe/Lisbon (default: Europe/Lisbon)
set -euo pipefail

# The Debian template only ships the C locale; a LANG inherited from the host shell
# (e.g. en_US.UTF-8) makes perl/apt print locale warnings on every command.
export LANG=C.UTF-8 LC_ALL=C.UTF-8
# pct exec does not always include /usr/local/bin, where Node is installed.
export PATH="/usr/local/bin:$PATH"
# Silence the "new version available" banners of npm and Prisma.
export npm_config_update_notifier=false PRISMA_HIDE_UPDATE_MESSAGE=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_root

NODE_MAJOR="${NODE_MAJOR:-22}"
DB_NAME="gametracker"
DB_USER="gametracker"
CREDS_FILE="/root/gametracker-credentials.txt"
# Container time zone: the Proxmox host's (ct-create passes it) or Europe/Lisbon
TZ_NAME="${TZ_NAME:-Europe/Lisbon}"
[ -e "/usr/share/zoneinfo/$TZ_NAME" ] || TZ_NAME="Etc/UTC"

ip_address() { hostname -I 2>/dev/null | awk '{print $1}'; }
APP_URL="${APP_URL:-http://$(ip_address)}"
APP_URL="${APP_URL%/}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

random_secret() { openssl rand -base64 "$1" | tr -d '\n'; }

# --- system -------------------------------------------------------------------------

msg "Installing system packages…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# postgresql-common first: otherwise the postgresql package's debconf script runs
# before pg_lsclusters exists and prints a (harmless) "not found" line.
apt-get install -y -qq postgresql-common >/dev/null
apt-get install -y -qq \
  ca-certificates curl git xz-utils openssl \
  nginx postgresql \
  build-essential python3 \
  tzdata cron >/dev/null

# "Today's" dates and times depend on the process time zone; without this the
# container stays on UTC.
msg "Timezone: $TZ_NAME"
ln -sf "/usr/share/zoneinfo/$TZ_NAME" /etc/localtime
echo "$TZ_NAME" > /etc/timezone

# --- Node ---------------------------------------------------------------------------

install_node() {
  local arch tarball
  case "$(uname -m)" in
    x86_64) arch="x64" ;;
    aarch64) arch="arm64" ;;
    *) die "Unsupported architecture: $(uname -m)" ;;
  esac
  local base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
  tarball="$(curl -fsSL "$base/SHASUMS256.txt" | awk -v a="linux-${arch}.tar.xz" '$2 ~ a {print $2; exit}')"
  [ -n "$tarball" ] || die "Node ${NODE_MAJOR} for linux-${arch} not found."
  msg "Installing ${tarball%.tar.xz}…"
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "$base/$tarball" -o "$tmp/$tarball"
  ( cd "$tmp" && curl -fsSL "$base/SHASUMS256.txt" | grep " $tarball\$" | sha256sum -c - >/dev/null ) \
    || die "Node checksum does not match."
  tar -xJf "$tmp/$tarball" -C /usr/local --strip-components=1 \
    --exclude='*/CHANGELOG.md' --exclude='*/LICENSE' --exclude='*/README.md'
  rm -rf "$tmp"
}

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]; then
  install_node
fi
msg "Node $(node -v), npm $(npm -v)"

# --- app user -----------------------------------------------------------------------

if ! id "$APP_USER" >/dev/null 2>&1; then
  msg "Creating system user $APP_USER…"
  useradd --system --home-dir "$APP_HOME" --create-home --shell /usr/sbin/nologin "$APP_USER"
fi
mkdir -p "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$APP_HOME" "$APP_DIR"

# --- PostgreSQL ---------------------------------------------------------------------

msg "Setting up PostgreSQL…"
systemctl enable --now postgresql >/dev/null

mkdir -p /etc/gametracker
chmod 750 /etc/gametracker

if [ -f "$ENV_FILE" ]; then
  msg "Existing configuration in $ENV_FILE — kept (secrets and database)."
  # Reuse the database password in case the role has to be recreated.
  DB_PASS="$(sed -n 's#^DATABASE_URL="postgresql://[^:]*:\([^@]*\)@.*#\1#p' "$ENV_FILE")"
else
  DB_PASS="$(random_secret 24 | tr -d '/+=')"
fi

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  runuser -u postgres -- psql -qc "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
fi
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  runuser -u postgres -- psql -qc "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

# --- backend configuration ----------------------------------------------------------

if [ ! -f "$ENV_FILE" ]; then
  msg "Generating $ENV_FILE…"
  cat > "$ENV_FILE" <<EOF
# GameTracker Vault configuration. Edit with:  gametracker-config
# (it opens this file and restarts the backend if anything changed)

NODE_ENV=production
HOST=127.0.0.1
PORT=${BACKEND_PORT}
TZ=${TZ_NAME}

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

# Address the app is opened on (the origin accepted by CORS).
FRONTEND_URL="${APP_URL}"

JWT_SECRET="$(random_secret 48)"

# ⚠ DO NOT CHANGE: encrypts the integration secrets stored in the database
# (e.g. the IGDB Client Secret, entered by the admin in the app). If it changes,
# they must all be entered again. Copy in ${CREDS_FILE}.
TOKEN_ENCRYPTION_KEY="$(random_secret 32)"

EOF
fi
# Reinstall over an old file that lacks the encryption key
ensure_encryption_key
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

# --- build and database -------------------------------------------------------------

build_app
migrate_db
publish_frontend

# --- systemd service and nginx (lib.sh) ---------------------------------------------

configure_service
configure_updater
restart_backend
configure_nginx

# --- maintenance commands and backups -----------------------------------------------

msg "Installing the gametracker-update and gametracker-config commands…"
install_commands

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
cat > /etc/cron.d/gametracker-backup <<EOF
# Daily database dump at 03:30 (keeps 14 days). A container snapshot taken
# with Postgres running is not always consistent; the dump is.
30 3 * * * root ${SCRIPT_DIR}/backup.sh >/var/log/gametracker-backup.log 2>&1
EOF
systemctl enable --now cron >/dev/null

# --- first user ---------------------------------------------------------------------

# Directly in the database (create-admin.cjs) rather than via POST /auth/register: the
# default is admin/admin and registration requires an 8-character password.
USERS="$(runuser -u postgres -- psql -d "$DB_NAME" -tAc 'SELECT count(*) FROM "User"')"
ADMIN_CREATED=""
if [ "$USERS" = "0" ]; then
  msg "Creating the ${ADMIN_USERNAME} account (ADMIN)…"
  load_env
  if ( cd "$APP_DIR/apps/backend" && as_app env DATABASE_URL="$DATABASE_URL" \
        ADMIN_USERNAME="$ADMIN_USERNAME" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        node "$SCRIPT_DIR/create-admin.cjs" ); then
    ADMIN_CREATED="yes"
  else
    warn "Could not create the ${ADMIN_USERNAME} account."
  fi
fi

# --- credentials --------------------------------------------------------------------

if [ -n "$ADMIN_CREATED" ] || [ ! -f "$CREDS_FILE" ]; then
  load_env
  {
    echo "GameTracker Vault — credentials generated at install time ($(date '+%Y-%m-%d %H:%M'))"
    echo
    echo "App:                  ${APP_URL}"
    [ -n "$ADMIN_CREATED" ] && echo "User:                 ${ADMIN_USERNAME}"
    [ -n "$ADMIN_CREATED" ] && echo "Password:             ${ADMIN_PASSWORD}"
    echo
    echo "Database:             ${DATABASE_URL}"
    echo "TOKEN_ENCRYPTION_KEY: ${TOKEN_ENCRYPTION_KEY}   (never change it)"
  } > "$CREDS_FILE"
  chmod 600 "$CREDS_FILE"
fi

# --- summary ------------------------------------------------------------------------

cat <<EOF

$(printf '\033[1;32m')GameTracker Vault installed.$(printf '\033[0m')

  App:            ${APP_URL}
$( [ -n "$ADMIN_CREATED" ] && printf '  User:           %s\n  Password:       %s\n' "$ADMIN_USERNAME" "$ADMIN_PASSWORD")
  Credentials:    ${CREDS_FILE}   (root only)
  Configure:      gametracker-config     (edits ${ENV_FILE} and restarts)
  Update:         gametracker-update     (git pull, build, migrations, restart)
  Logs:           journalctl -u ${SERVICE} -f
  Backups:        ${BACKUP_DIR}   (daily at 03:30)

$( [ -n "$ADMIN_CREATED" ] && [ "$ADMIN_PASSWORD" = "admin" ] && printf '  \033[1;33m⚠ The admin password is "admin". Change it before exposing the app to the internet.\033[0m\n\n')
  Still to configure, in the app (Admin → Integrations):
    - IGDB Client ID and Client Secret for the game search
      (a Twitch application: https://dev.twitch.tv/console/apps)

EOF
