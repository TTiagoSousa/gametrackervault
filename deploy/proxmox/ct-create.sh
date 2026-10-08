#!/usr/bin/env bash
# GameTracker Vault — LXC installer for Proxmox VE.
#
# Run on the Proxmox HOST shell, as root:
#
#   bash -c "$(curl -fsSL https://forgejo.home-sousa.me/Tiago/gameTrackerVault/raw/branch/main/deploy/proxmox/ct-create.sh)"
#
# Creates a Debian 13 container and installs GameTracker Vault inside it (Node, PostgreSQL,
# nginx, the backend as a systemd service). The database lives in the container.
#
# Unattended mode: NONINTERACTIVE=1 plus any of these variables:
#   CTID CT_HOSTNAME STORAGE TEMPLATE_STORAGE DISK_GB CORES RAM_MB SWAP_MB
#   BRIDGE NET_MODE (dhcp|static) IP (e.g. 192.168.0.60/24) GATEWAY VLAN DNS
#   ONBOOT (1|0) BRANCH REPO_URL REPO_TOKEN APP_URL ADMIN_USERNAME ADMIN_PASSWORD
# The check_* validators are only called indirectly, through ask().
# shellcheck disable=SC2329
set -euo pipefail

APP="GameTracker Vault"
BACKTITLE="$APP · Proxmox VE LXC installer"

# --- output ---------------------------------------------------------------------------

BOLD=$'\033[1m'; DIM=$'\033[2m'; CYAN=$'\033[1;36m'; GREEN=$'\033[1;32m'
YELLOW=$'\033[1;33m'; RED=$'\033[1;31m'; RESET=$'\033[0m'

msg()  { printf '%s ➜%s %s\n' "$CYAN" "$RESET" "$*"; }
ok()   { printf '%s ✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s !%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die()  { printf '%s ✗%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

header() {
  clear 2>/dev/null || true
  cat <<EOF
${CYAN}
    ____                      _____               _
   / ___| __ _ _ __ ___   ___|_   _| __ __ _  ___| | _____ _ __
  | |  _ / _\` | '_ \` _ \ / _ \ | || '__/ _\` |/ __| |/ / _ \ '__|
  | |_| | (_| | | | | | |  __/ | || | | (_| | (__|   <  __/ |
   \____|\__,_|_| |_| |_|\___| |_||_|  \__,_|\___|_|\_\___|_|   Vault${RESET}
  ${DIM}Personal game tracker · Proxmox VE LXC installer${RESET}

EOF
}

# --- checks ---------------------------------------------------------------------------

[ "$(id -u)" -eq 0 ] || die "Run this as root on the Proxmox VE host."
command -v pct >/dev/null || die "pct not found — this must run on the Proxmox VE host, not inside a container."

# --- helpers --------------------------------------------------------------------------

valid_ipv4() {
  local ip="$1" IFS=. octets
  [[ "$ip" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || return 1
  read -r -a octets <<<"$ip"
  for o in "${octets[@]}"; do [ "$o" -le 255 ] || return 1; done
}
valid_cidr() {
  [[ "$1" == */* ]] || return 1
  valid_ipv4 "${1%/*}" && [[ "${1#*/}" =~ ^[0-9]{1,2}$ ]] && [ "${1#*/}" -ge 1 ] && [ "${1#*/}" -le 32 ]
}
valid_hostname() { [[ "$1" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$ ]]; }
valid_int() { [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge "$2" ] && [ "$1" -le "$3" ]; }
ctid_taken() { pct status "$1" >/dev/null 2>&1 || qm status "$1" >/dev/null 2>&1; }

active_storages() { # active_storages <content> → "name type free"
  pvesm status -content "$1" 2>/dev/null \
    | awk 'NR>1 && $3=="active" {printf "%s %s %.1fG\n", $1, $2, $6/1024/1024}'
}
first_storage() { active_storages "$1" | awk 'NR==1 {print $1}'; }
bridges() { ip -o link show type bridge 2>/dev/null | awk -F': ' '{print $2}' | cut -d@ -f1; }
host_dns() { awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf; }

# --- defaults -------------------------------------------------------------------------

CTID="${CTID:-$(pvesh get /cluster/nextid)}"
CT_HOSTNAME="${CT_HOSTNAME:-gametracker}"
STORAGE="${STORAGE:-$(first_storage rootdir)}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-$(first_storage vztmpl)}"
DISK_GB="${DISK_GB:-16}"
CORES="${CORES:-2}"
RAM_MB="${RAM_MB:-2048}"
SWAP_MB="${SWAP_MB:-512}"
BRIDGE="${BRIDGE:-$(bridges | head -1)}"
BRIDGE="${BRIDGE:-vmbr0}"
NET_MODE="${NET_MODE:-$([ -n "${IP:-}" ] && [ "${IP:-}" != dhcp ] && echo static || echo dhcp)}"
IP="${IP:-}"
GATEWAY="${GATEWAY:-}"
VLAN="${VLAN:-}"
DNS="${DNS:-}"
ONBOOT="${ONBOOT:-1}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-https://forgejo.home-sousa.me/Tiago/gameTrackerVault.git}"
REPO_TOKEN="${REPO_TOKEN:-}"
APP_URL="${APP_URL:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

# --- dialogs --------------------------------------------------------------------------

# whiptail writes the answer to stderr; swap it with stdout to capture it.
wt() { whiptail --backtitle "$BACKTITLE" "$@" 3>&1 1>&2 2>&3; }

# Dialog sizes follow the terminal: the Proxmox web shell is often 24 rows or less,
# and a box bigger than the screen makes whiptail fail instead of drawing.
TERM_COLS="$(tput cols 2>/dev/null || echo 80)"
TERM_ROWS="$(tput lines 2>/dev/null || echo 24)"
W=$(( TERM_COLS - 4 < 76 ? TERM_COLS - 4 : 76 ))
H() { local h="$1" max=$(( TERM_ROWS - 3 )); [ "$h" -le "$max" ] || h="$max"; echo "$h"; }

# abort "dialog title" exit-code — 1 is Cancel; 255 is Esc or whiptail failing to draw.
abort() {
  local where="${1:-installer}" rc="${2:-1}"
  clear 2>/dev/null || true
  if [ "$rc" = 255 ]; then
    die "Stopped at \"$where\" — Esc was pressed or the dialog did not fit the terminal (${TERM_COLS}x${TERM_ROWS}). Nothing was created."
  fi
  die "Cancelled at \"$where\" — nothing was created."
}
invalid() { wt --title "Invalid value" --msgbox "$1" "$(H 9)" "$W" || true; }

# ask VAR "title" "text" validator [args…] — keeps asking until the validator accepts.
ask() {
  local var="$1" title="$2" text="$3" value; shift 3
  while :; do
    value="$(wt --title "$title" --inputbox "$text" "$(H 11)" "$W" "${!var}")" || abort "$title" $?
    if [ $# -eq 0 ] || "$@" "$value"; then printf -v "$var" '%s' "$value"; return; fi
    invalid "\"$value\" is not valid for: $title"
  done
}

# radio VAR "title" "text" tag description [tag description …] — radiolist with the
# current value pre-selected.
radio() {
  local var="$1" title="$2" text="$3" items=() n=0 choice; shift 3
  while [ $# -ge 2 ]; do
    items+=("$1" "$2" "$([ "$1" = "${!var}" ] && echo ON || echo OFF)"); shift 2; n=$((n + 1))
  done
  choice="$(wt --title "$title" --radiolist "$text\n\n(Space selects, Enter confirms)" \
    "$(H $((n + 10)))" "$W" "$n" "${items[@]}")" || abort "$title" $?
  printf -v "$var" '%s' "$choice"
}

# Validators, called indirectly through ask().
check_ctid() { valid_int "$1" 100 999999999 && ! ctid_taken "$1"; }
check_cores() { valid_int "$1" 1 128; }
check_ram() { valid_int "$1" 512 1048576; }
check_swap() { valid_int "$1" 0 1048576; }
check_disk() { valid_int "$1" 8 10000; }
check_vlan() { [ -z "$1" ] || valid_int "$1" 1 4094; }
check_url() { [[ "$1" =~ ^https?://[^/[:space:]]+$ ]]; }
check_nonempty() { [ -n "$1" ]; }
check_dns() { local d; for d in $1; do valid_ipv4 "$d" || return 1; done; [ -n "$1" ]; }

# pick_storage VAR content "title" "explanation" — with a single candidate there is
# nothing to choose, so it is taken without showing the dialog.
pick_storage() {
  local var="$1" args=() name type free
  while read -r name type free; do args+=("$name" "$type · ${free} free"); done < <(active_storages "$2")
  [ ${#args[@]} -gt 0 ] || die "No active storage accepts '$2'."
  if [ ${#args[@]} -eq 2 ]; then printf -v "$var" '%s' "${args[0]}"; return; fi
  radio "$var" "$3" "$4" "${args[@]}"
}

advanced_settings() {
  ask CTID "Container ID" "Container ID (must be free)." check_ctid
  ask CT_HOSTNAME "Hostname" "Hostname of the container." valid_hostname

  pick_storage STORAGE rootdir "Container storage" "Where the container disk (system, app and database) is created."
  pick_storage TEMPLATE_STORAGE vztmpl "Template storage" "Where the Debian 13 template is kept. Only used to create the container."

  ask DISK_GB "Disk size" "Disk size in GB. The database lives inside the container (16 GB is plenty)." check_disk
  ask CORES "CPU cores" "Number of CPU cores." check_cores
  ask RAM_MB "Memory" "RAM in MB." check_ram
  ask SWAP_MB "Swap" "Swap in MB (0 to disable)." check_swap

  local bridge_args=() b
  while read -r b; do bridge_args+=("$b" "Linux bridge"); done < <(bridges)
  if [ ${#bridge_args[@]} -eq 2 ]; then
    BRIDGE="${bridge_args[0]}"
  elif [ ${#bridge_args[@]} -gt 2 ]; then
    radio BRIDGE "Network bridge" "Proxmox bridge for the container's network card." "${bridge_args[@]}"
  else
    ask BRIDGE "Network bridge" "Proxmox bridge for the container's network card." check_nonempty
  fi

  radio NET_MODE "IPv4 address" "How should the container get its IP?" \
    dhcp "Automatic (DHCP)" \
    static "Static IP"
  if [ "$NET_MODE" = static ]; then
    ask IP "Static IP" "IPv4 address with prefix, e.g. 192.168.0.60/24" valid_cidr
    [ -n "$GATEWAY" ] || GATEWAY="$(printf '%s' "${IP%/*}" | awk -F. '{print $1"."$2"."$3".1"}')"
    ask GATEWAY "Gateway" "IPv4 gateway, e.g. 192.168.0.1" valid_ipv4
  else
    IP=""; GATEWAY=""
  fi
  ask VLAN "VLAN tag" "VLAN tag (leave empty for none)." check_vlan

  local dns_mode
  dns_mode="$([ -n "$DNS" ] && echo custom || echo host)"
  radio dns_mode "DNS" "Which DNS server should the container use?" \
    host "Same as the Proxmox host ($(host_dns))" \
    custom "Custom DNS server(s)"
  if [ "$dns_mode" = custom ]; then
    [ -n "$DNS" ] || DNS="$(host_dns)"
    ask DNS "DNS servers" "One or more IPv4 addresses, separated by spaces." check_dns
  else
    DNS=""
  fi

  local boot_args=() rc=0
  [ "$ONBOOT" = 1 ] || boot_args+=(--defaultno)
  wt "${boot_args[@]}" --title "Start on boot" --yesno "Start the container when the Proxmox host boots?" "$(H 8)" "$W" || rc=$?
  case "$rc" in 0) ONBOOT=1 ;; 1) ONBOOT=0 ;; *) abort "Start on boot" "$rc" ;; esac

  local url_mode
  url_mode="$([ -n "$APP_URL" ] && echo domain || echo ip)"
  radio url_mode "App address" "How will you open GameTracker Vault?" \
    ip "Container IP over http" \
    domain "Own domain (e.g. behind Nginx Proxy Manager)"
  if [ "$url_mode" = domain ]; then
    [ -n "$APP_URL" ] || APP_URL="https://gametracker.home-sousa.me"
    ask APP_URL "App address" "Full address with scheme, no trailing slash. Decides whether the session cookie is secure (https)." check_url
  else
    APP_URL=""
  fi

  ask ADMIN_USERNAME "Admin user" "Username of the first (admin) account." valid_hostname
  local pw
  pw="$(wt --title "Admin password" --passwordbox "Password for '$ADMIN_USERNAME'. Leave empty for the default: admin" "$(H 9)" "$W" "")" \
    || abort "Admin password" $?
  ADMIN_PASSWORD="${pw:-admin}"

  radio BRANCH "Version" "Which branch to install?" \
    main "Stable" \
    staging "Release candidate" \
    develop "Latest development"

  rc=0
  wt --title "Repository" --yesno "Is the repository public?\n\n$REPO_URL" "$(H 10)" "$W" || rc=$?
  case "$rc" in
    0) REPO_TOKEN="" ;;
    1) REPO_TOKEN="$(wt --title "Repository token" --passwordbox "Read-only access token for the private repository." "$(H 9)" "$W" "")" \
         || abort "Repository token" $? ;;
    *) abort "Repository" "$rc" ;;
  esac
}

settings_text() {
  local net
  if [ "$NET_MODE" = static ]; then net="static $IP, gw $GATEWAY"; else net="DHCP"; fi
  printf '%s\n' \
    "ID / hostname   $CTID / $CT_HOSTNAME" \
    "Storage         $STORAGE (templates: $TEMPLATE_STORAGE)" \
    "CPU / RAM       $CORES cores, ${RAM_MB} MB (+${SWAP_MB} MB swap)" \
    "Disk            ${DISK_GB} GB" \
    "Network         $BRIDGE, $net${VLAN:+, VLAN $VLAN}" \
    "DNS             ${DNS:-same as host}" \
    "Start on boot   $([ "$ONBOOT" = 1 ] && echo yes || echo no)" \
    "App address     ${APP_URL:-http://<container IP>}" \
    "Admin           $ADMIN_USERNAME / $([ "$ADMIN_PASSWORD" = admin ] && echo 'admin (default)' || echo '(custom)')" \
    "Version         $BRANCH"
}

interactive() {
  local mode rc
  mode="$(wt --title "$APP" --menu "Creates a Debian 13 LXC with $APP, PostgreSQL and nginx.\n\nHow do you want to set it up?" \
    "$(H 13)" "$W" 2 \
    "Default" "Default settings" \
    "Advanced" "Advanced settings")" || abort "$APP" $?
  [ "$mode" = Advanced ] && advanced_settings

  while :; do
    rc=0
    wt --title "Review" --yes-button "Create" --no-button "Edit" \
      --yesno "$(settings_text)" "$(H 16)" "$W" || rc=$?
    case "$rc" in
      0) return ;;
      1) advanced_settings ;;
      *) abort "Review" "$rc" ;;
    esac
  done
}

# --- configuration --------------------------------------------------------------------

header
# FORCE_DIALOGS=1 shows the dialogs without a terminal (used to test the installer).
if [ "${NONINTERACTIVE:-}" != "1" ] && { [ -t 0 ] || [ "${FORCE_DIALOGS:-}" = 1 ]; } && command -v whiptail >/dev/null; then
  interactive
  header
else
  msg "Unattended mode — using environment variables."
fi

# Same checks for both modes (the unattended one never went through the dialogs).
check_ctid "$CTID" || die "Container ID $CTID is invalid or already in use."
valid_hostname "$CT_HOSTNAME" || die "Invalid hostname: $CT_HOSTNAME"
[ -n "$STORAGE" ] || die "No storage for the container disk (STORAGE)."
[ -n "$TEMPLATE_STORAGE" ] || die "No storage for templates (TEMPLATE_STORAGE)."
if [ "$NET_MODE" = static ]; then
  valid_cidr "$IP" || die "Invalid static IP '$IP' — use an IPv4 address with prefix, e.g. 192.168.0.60/24."
  valid_ipv4 "$GATEWAY" || die "Static IP needs a valid GATEWAY (got '$GATEWAY')."
fi
check_vlan "$VLAN" || die "Invalid VLAN tag: $VLAN"
if [ -n "$APP_URL" ]; then APP_URL="${APP_URL%/}"; check_url "$APP_URL" || die "Invalid APP_URL: $APP_URL"; fi

printf '%s\n' "${BOLD}Settings${RESET}"; settings_text | sed 's/^/  /'; echo

# --- template -------------------------------------------------------------------------

msg "Looking for the Debian 13 template…"
pveam update >/dev/null
# The catalogue lists every architecture (amd64 and arm64); a template for another
# architecture creates fine but the container never starts.
HOST_ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
TEMPLATE="$(pveam available --section system \
  | awk -v arch="_${HOST_ARCH}." '/debian-13-standard/ && index($2, arch) {print $2}' \
  | sort -V | tail -1)"
[ -n "$TEMPLATE" ] || die "No debian-13-standard template for ${HOST_ARCH} available (pveam available)."
if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
  msg "Downloading $TEMPLATE…"
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" >/dev/null
fi
ok "Template $TEMPLATE"

# --- container ------------------------------------------------------------------------

NET="name=eth0,bridge=${BRIDGE}"
if [ "$NET_MODE" = static ]; then NET="${NET},ip=${IP},gw=${GATEWAY}"; else NET="${NET},ip=dhcp"; fi
[ -n "$VLAN" ] && NET="${NET},tag=${VLAN}"

msg "Creating container $CTID ($CT_HOSTNAME)…"
create_args=(
  --hostname "$CT_HOSTNAME"
  --cores "$CORES" --memory "$RAM_MB" --swap "$SWAP_MB"
  --rootfs "${STORAGE}:${DISK_GB}"
  --net0 "$NET"
  --unprivileged 1 --features nesting=1
  --onboot "$ONBOOT" --ostype debian
  --tags gametracker
  --description "$APP — installed by deploy/proxmox/ct-create.sh"
)
[ -n "$DNS" ] && create_args+=(--nameserver "$DNS")
pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" "${create_args[@]}" >/dev/null

# A container that never started is useless — remove it. If a later step fails the
# container stays (its logs explain why) and the exit message says how to remove it.
if ! pct start "$CTID"; then
  warn "Container $CTID did not start — removing it."
  pct destroy "$CTID" --purge >/dev/null 2>&1 || true
  die "Container $CTID failed to start and was removed. The reason is in the host log: journalctl -xe"
fi
on_exit() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    warn "Install failed. Container $CTID was kept so you can look inside: pct enter $CTID"
    warn "To remove it: pct stop $CTID; pct destroy $CTID --purge"
  fi
}
trap on_exit EXIT
ok "Container $CTID created and started"

msg "Waiting for network…"
for _ in $(seq 1 60); do
  if pct exec "$CTID" -- getent hosts deb.debian.org >/dev/null 2>&1; then break; fi
  sleep 2
done
pct exec "$CTID" -- getent hosts deb.debian.org >/dev/null 2>&1 \
  || die "The container has no network/DNS. Check the bridge, IP and gateway (pct config $CTID)."
CT_IP="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"
APP_URL="${APP_URL:-http://$CT_IP}"
ok "Network up: $CT_IP"

# --- code and install -----------------------------------------------------------------

# With a token it goes into the clone's remote URL, so gametracker-update can pull.
# It stays inside the container (.git/config of the repo).
CLONE_URL="$REPO_URL"
if [ -n "$REPO_TOKEN" ]; then
  CLONE_URL="$(printf '%s' "$REPO_URL" | sed -E "s#^https://#https://oauth2:${REPO_TOKEN}@#")"
fi

msg "Cloning $APP ($BRANCH)…"
# C.UTF-8 always exists in the template; the host's LANG (e.g. en_US.UTF-8) does not,
# and every perl/apt call would print locale warnings.
CT_ENV=(env LANG=C.UTF-8 LC_ALL=C.UTF-8)
pct exec "$CTID" -- "${CT_ENV[@]}" bash -c "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq git ca-certificates >/dev/null"
pct exec "$CTID" -- "${CT_ENV[@]}" git clone --quiet --branch "$BRANCH" "$CLONE_URL" /opt/gametracker
ok "Code in /opt/gametracker"

msg "Installing inside the container (a few minutes)…"
pct exec "$CTID" -- "${CT_ENV[@]}" \
  APP_URL="$APP_URL" \
  ADMIN_USERNAME="$ADMIN_USERNAME" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  bash /opt/gametracker/deploy/proxmox/install.sh

cat <<EOF

${GREEN}${APP} is ready.${RESET}

  Open:         ${BOLD}${APP_URL}${RESET}
  Login:        ${ADMIN_USERNAME} / $([ "$ADMIN_PASSWORD" = admin ] && echo admin || echo '(the password you chose)')
  Container:    $CTID ($CT_IP)
  Credentials:  pct exec $CTID -- cat /root/gametracker-credentials.txt
  Configure:    pct enter $CTID  →  gametracker-config
  Update:       pct enter $CTID  →  gametracker-update

EOF
[ "$ADMIN_PASSWORD" = admin ] && warn "The admin password is 'admin'. Change it before exposing the app to the internet."
exit 0
