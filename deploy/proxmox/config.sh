#!/usr/bin/env bash
# gametracker-config — edit the backend settings from a menu.
#
# Arrow keys pick a setting (for now only FRONTEND_URL), Enter edits it; "Save" writes the file and offers to
# restart the backend (Nest only reads the settings at start-up). The database URL
# and JWT_SECRET are not offered: changing them by mistake breaks the connection to
# the database or logs everyone out.
#
#   gametracker-config          menu
#   gametracker-config --raw    open the whole file in $EDITOR (nano) instead
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_root
[ -f "$ENV_FILE" ] || die "Missing $ENV_FILE — run install.sh first."
export LANG=C.UTF-8 LC_ALL=C.UTF-8 PATH="/usr/local/bin:$PATH"

ok() { printf '\033[1;32m ✓\033[0m %s\n' "$*"; }

# --- raw mode: the whole file in an editor ---------------------------------------------

raw_edit() {
  cp -p "$ENV_FILE" "$ENV_FILE.bak"
  ${EDITOR:-nano} "$ENV_FILE"
  if cmp -s "$ENV_FILE" "$ENV_FILE.bak"; then msg "No changes."; exit 0; fi
  restart_backend && ok "Configuration applied, backend restarted."
  exit 0
}

if [ "${1:-}" = "--raw" ] || ! command -v whiptail >/dev/null; then raw_edit; fi

# --- settings shown in the menu --------------------------------------------------------

# KEY|description|kind — kind: url, secret or text.
SETTINGS=(
  "FRONTEND_URL|Address the app is opened at, e.g. https://gametracker.example.com|url"
)

# --- reading and writing the env file --------------------------------------------------

get_value() { # value of KEY in the file, without the surrounding quotes
  local line
  line="$(grep -m1 "^$1=" "$ENV_FILE" || true)"
  line="${line#*=}"
  line="${line%\"}"; line="${line#\"}"
  printf '%s' "$line"
}

set_value() { # set_value FILE KEY VALUE — replaces the line, or appends it
  K="$2" V="$3" awk '
    BEGIN { k = ENVIRON["K"]; v = ENVIRON["V"] }
    index($0, k "=") == 1 && !done { print k "=\"" v "\""; done = 1; next }
    { print }
    END { if (!done) print k "=\"" v "\"" }
  ' "$1" > "$1.new" && cat "$1.new" > "$1" && rm -f "$1.new"
}

declare -A CURRENT=() PENDING=()
for entry in "${SETTINGS[@]}"; do
  key="${entry%%|*}"
  CURRENT[$key]="$(get_value "$key")"
done

value_of() { if [ -n "${PENDING[$1]+x}" ]; then printf '%s' "${PENDING[$1]}"; else printf '%s' "${CURRENT[$1]}"; fi; }

shown() { # how a value appears in the list
  local value="$1" kind="$2"
  if [ -z "$value" ]; then echo "(empty)"; return; fi
  if [ "$kind" = secret ]; then
    if [ "${#value}" -gt 10 ]; then echo "${value:0:4}…${value: -4}"; else echo "(set)"; fi
    return
  fi
  if [ "${#value}" -gt 50 ]; then echo "${value:0:47}…"; else echo "$value"; fi
}

# --- dialogs ---------------------------------------------------------------------------

BACKTITLE="GameTracker Vault · settings"
wt() { whiptail --backtitle "$BACKTITLE" "$@" 3>&1 1>&2 2>&3; }
TERM_COLS="$(tput cols 2>/dev/null || echo 80)"
TERM_ROWS="$(tput lines 2>/dev/null || echo 24)"
W=$(( TERM_COLS - 4 < 96 ? TERM_COLS - 4 : 96 ))
H() { local h="$1" max=$(( TERM_ROWS - 3 )); [ "$h" -le "$max" ] || h="$max"; echo "$h"; }

valid_url() { [[ "$1" =~ ^https?://[^/[:space:]]+(/[^[:space:]]*)?$ ]]; }

stage() { # stage KEY VALUE — remembers a change, or forgets it if back to the saved value
  if [ "$2" = "${CURRENT[$1]}" ]; then unset "PENDING[$1]"; else PENDING[$1]="$2"; fi
}

edit_setting() { # edit_setting KEY description kind
  local key="$1" text="$2" kind="$3" value rc
  while :; do
    rc=0
    value="$(wt --title "$key" --inputbox "$text\n\nEmpty clears it. Paste with the right mouse button." \
      "$(H 12)" "$W" "$(value_of "$key")")" || rc=$?
    [ "$rc" -eq 0 ] || return 0          # Cancel/Esc keeps the previous value
    value="$(printf '%s' "$value" | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    if [[ "$value" == *'"'* ]]; then
      wt --title "Invalid value" --msgbox "Values cannot contain double quotes." "$(H 8)" "$W" || true
      continue
    fi
    if [ "$kind" = url ] && [ -n "$value" ]; then
      value="${value%/}"
      if ! valid_url "$value"; then
        wt --title "Invalid value" --msgbox "Use a full address with http:// or https://\ne.g. https://gametracker.example.com" "$(H 9)" "$W" || true
        continue
      fi
    fi
    break
  done
  stage "$key" "$value"
}

save_and_restart() {
  local key summary=""
  cp -p "$ENV_FILE" "$ENV_FILE.bak"
  for key in "${!PENDING[@]}"; do
    set_value "$ENV_FILE" "$key" "${PENDING[$key]}"
    summary+="  • $key\n"
  done
  chown root:"$APP_USER" "$ENV_FILE"
  chmod 640 "$ENV_FILE"

  if wt --title "Saved" --yes-button "Restart" --no-button "Later" \
      --yesno "Saved ${#PENDING[@]} change(s):\n\n$summary\nThe backend only reads its settings when it starts.\nRestart it now to apply them?" "$(H 16)" "$W"; then
    clear 2>/dev/null || true
    ok "Saved. Previous file kept as $ENV_FILE.bak"
    restart_backend && ok "Backend restarted — the new settings are active."
  else
    clear 2>/dev/null || true
    ok "Saved. Previous file kept as $ENV_FILE.bak"
    warn "Not applied yet. Restart when you are ready: systemctl restart $SERVICE"
  fi
}

choice=""
while :; do
  items=()
  for entry in "${SETTINGS[@]}"; do
    IFS='|' read -r key _ kind <<<"$entry"
    mark=" "; [ -n "${PENDING[$key]+x}" ] && mark="*"
    items+=("$key" "$mark $(shown "$(value_of "$key")" "$kind")")
  done
  pending=${#PENDING[@]}
  save_label="  Save and restart"
  [ "$pending" -eq 0 ] || save_label="  Save the $pending change(s) and restart"
  items+=("Save" "$save_label" \
          "Raw" "  Edit the whole file in nano" \
          "Quit" "  Leave without saving")

  rc=0
  choice="$(wt --title "GameTracker Vault settings" --ok-button "Select" --cancel-button "Quit" \
    --default-item "$choice" \
    --menu "↑/↓ move · Enter edits · changed settings are marked with *" \
    "$(H 21)" "$W" "$(H 12)" "${items[@]}")" || rc=$?
  [ "$rc" -eq 0 ] || choice="Quit"

  case "$choice" in
    Save)
      if [ "$pending" -eq 0 ]; then
        wt --title "Nothing to save" --msgbox "No setting was changed." "$(H 8)" "$W" || true
      else
        save_and_restart
        exit 0
      fi ;;
    Quit)
      if [ "$pending" -gt 0 ] && ! wt --title "Unsaved changes" --defaultno \
          --yesno "$pending change(s) not saved. Leave anyway?" "$(H 8)" "$W"; then
        choice=""
        continue
      fi
      clear 2>/dev/null || true
      msg "Nothing saved."
      exit 0 ;;
    Raw)
      clear 2>/dev/null || true
      raw_edit ;;
    *)
      for entry in "${SETTINGS[@]}"; do
        IFS='|' read -r key text kind <<<"$entry"
        if [ "$key" = "$choice" ]; then edit_setting "$key" "$text" "$kind"; break; fi
      done ;;
  esac
done
