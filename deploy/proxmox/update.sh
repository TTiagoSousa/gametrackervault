#!/usr/bin/env bash
# gametracker-update — installs a release (or a branch) and runs it: fetch, checkout,
# dependencies, build, migrations, frontend, systemd units, nginx, restart.
#
# Usage (inside the container, as root):
#   gametracker-update               # the latest release (vX.Y.Z tag)
#   gametracker-update v1.4.0        # a specific release
#   gametracker-update develop       # a branch (testing)
#   FORCE=1 gametracker-update       # rebuild even if nothing changed
#
# The app's "Update" button writes the version to $UPDATES_DIR/request; a systemd
# .path unit then runs this script with --from-request. Progress goes to
# status.json (read by the app) and the output to update.log.
#
# If a step fails, the previous version is checked out, rebuilt and restarted, so the
# app keeps running on the version it had.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_root
export LANG=C.UTF-8 LC_ALL=C.UTF-8 PATH="/usr/local/bin:$PATH"
export npm_config_update_notifier=false PRISMA_HIDE_UPDATE_MESSAGE=1
cd "$APP_DIR"

STATUS_FILE="$UPDATES_DIR/status.json"
LOG_FILE="$UPDATES_DIR/update.log"

json() { # escapes a string for JSON
  local s="$1"
  s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//$'\n'/ }"; s="${s//$'\r'/}"
  printf '"%s"' "$s"
}

# status STATE STEP MESSAGE — written atomically; the app polls it.
status() {
  local finished=null
  case "$1" in success|failed) finished="$(json "$(date -Is)")" ;; esac
  {
    printf '{"state":%s,"target":%s,"from":%s,"step":%s,"message":%s,' \
      "$(json "$1")" "$(json "${TARGET_LABEL:-}")" "$(json "${FROM_LABEL:-}")" "$(json "$2")" "$(json "$3")"
    printf '"startedAt":%s,"finishedAt":%s}\n' "$(json "${STARTED_AT:-}")" "$finished"
  } > "$STATUS_FILE.tmp"
  chmod 644 "$STATUS_FILE.tmp"
  mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

installed_label() { # vX.Y.Z when HEAD is a release, else the short commit
  as_app git describe --tags --exact-match --match 'v*' HEAD 2>/dev/null || as_app git rev-parse --short HEAD
}

# ======================================================================================
# Stage 1 — work out the target, check it out, then run the *new* copy of this script:
# the checkout may have changed lib.sh or this file.
# ======================================================================================
if [ "${GAMETRACKER_STAGE:-1}" = 1 ]; then
  mkdir -p "$UPDATES_DIR"
  chown "$APP_USER:$APP_USER" "$UPDATES_DIR"

  # One update at a time (the lock is inherited by stage 2).
  exec 9>"$UPDATES_DIR/.lock"
  flock -n 9 || die "Another update is already running."

  TARGET="${1:-latest}"
  if [ "$TARGET" = "--from-request" ]; then
    [ -f "$UPDATES_DIR/request" ] || exit 0
    TARGET="$(tr -d '[:space:]' < "$UPDATES_DIR/request")"
    # Removed straight away: while it exists, the .path unit keeps re-triggering.
    rm -f "$UPDATES_DIR/request"
    if ! [[ "$TARGET" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      STARTED_AT="$(date -Is)"
      status failed request "Invalid update request: '$TARGET'"
      die "Invalid update request: '$TARGET'"
    fi
  fi

  : > "$LOG_FILE"
  chmod 644 "$LOG_FILE"
  exec > >(tee -a "$LOG_FILE") 2>&1

  STARTED_AT="$(date -Is)"
  FROM_LABEL="$(installed_label)"
  TARGET_LABEL="$TARGET"
  status running fetch "Fetching releases"
  # Nothing has changed yet at this stage — just record the failure for the app.
  set -E
  trap 'status failed fetch "Could not fetch or check out ${TARGET_LABEL} (see update.log)"' ERR

  msg "Fetching from origin…"
  as_app git fetch --quiet --tags --force origin
  if [ "$TARGET" = latest ]; then
    TARGET="$(as_app git tag -l 'v*' --sort=-v:refname | head -1)"
    # No release yet: follow main.
    [ -n "$TARGET" ] || TARGET=main
  fi
  TARGET_LABEL="$TARGET"

  BEFORE="$(as_app git rev-parse HEAD)"
  if [[ "$TARGET" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    as_app git rev-parse -q --verify "refs/tags/$TARGET" >/dev/null \
      || { status failed fetch "Release $TARGET does not exist"; die "Release $TARGET does not exist."; }
    msg "Checking out release $TARGET…"
    as_app git checkout --quiet --force "refs/tags/$TARGET"
  else
    as_app git rev-parse -q --verify "refs/remotes/origin/$TARGET" >/dev/null \
      || { status failed fetch "Branch $TARGET does not exist"; die "Branch $TARGET does not exist."; }
    msg "Checking out branch $TARGET…"
    as_app git checkout --quiet --force "$TARGET" 2>/dev/null \
      || as_app git checkout --quiet --force -b "$TARGET" "origin/$TARGET"
    as_app git reset --quiet --hard "origin/$TARGET"
  fi

  GAMETRACKER_STAGE=2 BEFORE="$BEFORE" TARGET_LABEL="$TARGET_LABEL" FROM_LABEL="$FROM_LABEL" \
    STARTED_AT="$STARTED_AT" exec bash "$SCRIPT_DIR/update.sh"
fi

# ======================================================================================
# Stage 2 — build and switch to the new code; roll back if anything fails.
# ======================================================================================
AFTER="$(as_app git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ] && [ "${FORCE:-}" != "1" ]; then
  msg "Already up to date (${TARGET_LABEL}). To rebuild anyway: FORCE=1 gametracker-update"
  status success "done" "Already on $TARGET_LABEL"
  exit 0
fi

msg "Updating ${FROM_LABEL} → ${TARGET_LABEL}"
as_app git log --oneline "$BEFORE..$AFTER" 2>/dev/null | head -20 || true

STEP=""
rollback() {
  local failed_step="$STEP"
  trap - ERR
  set +e
  warn "Step '$failed_step' failed — rolling back to $FROM_LABEL."
  status running rollback "Step '$failed_step' failed — restoring $FROM_LABEL"
  if as_app git checkout --quiet --force "$BEFORE" \
      && build_app && publish_frontend && restart_backend; then
    status failed "$failed_step" "Update to $TARGET_LABEL failed at '$failed_step'. Still running $FROM_LABEL."
  else
    status failed "$failed_step" "Update failed at '$failed_step' and the rollback failed too. Check update.log."
  fi
  exit 1
}
set -E
trap rollback ERR

step() { STEP="$1"; status running "$1" "$2"; }

step build "Installing dependencies and building";   build_app
step migrate "Applying database migrations";          migrate_db
step publish "Publishing the frontend";                publish_frontend
step configure "Updating services and nginx";         ensure_encryption_key; configure_service; configure_updater; install_commands
step restart "Restarting the backend";                 restart_backend
configure_nginx

trap - ERR
status success "done" "Updated to $TARGET_LABEL"
msg "Updated to $TARGET_LABEL."
