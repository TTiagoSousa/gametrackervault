#!/usr/bin/env bash
# Funções partilhadas pelo install.sh, update.sh e config.sh. Corre dentro do CT,
# como root. Não se executa sozinho: faz-se `source`.

# Usadas pelos scripts que fazem source deste ficheiro.
# shellcheck disable=SC2034
APP_USER="${APP_USER:-gametracker}"
APP_DIR="${APP_DIR:-/opt/gametracker}"
APP_HOME="/var/lib/gametracker"
ENV_FILE="${ENV_FILE:-/etc/gametracker/gametracker.env}"
WEB_ROOT="/var/www/gametracker"
SERVICE="gametracker"
BACKUP_DIR="/var/backups/gametracker"
BACKEND_PORT=3000
# Where the app asks for updates and reads their progress (see configure_updater).
UPDATES_DIR="$APP_HOME/updates"

msg()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

require_root() { [ "$(id -u)" -eq 0 ] || die "Run this as root."; }

# Corre um comando como o utilizador da app, na pasta do repo, com o HOME dele (é
# lá que fica a cache do npm — fora do repo).
as_app() {
  runuser -u "$APP_USER" -- env HOME="$APP_HOME" PATH="/usr/local/bin:/usr/bin:/bin" "$@"
}

# Carrega o ficheiro de ambiente para os comandos seguintes (o Prisma precisa do
# DATABASE_URL nas migrações).
load_env() {
  [ -f "$ENV_FILE" ] || die "Missing $ENV_FILE — run install.sh first."
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

# Dependências, shared, backend e frontend. O frontend é compilado para a API em
# /api, que o nginx encaminha para o backend.
build_app() {
  msg "Installing dependencies (npm ci)…"
  # --include=dev: o build precisa do Nest CLI, do Vite e do TypeScript, e o
  # NODE_ENV=production do ficheiro de ambiente faria o npm saltá-los.
  ( cd "$APP_DIR" && as_app npm ci --include=dev --no-audit --no-fund )
  msg "Building the shared package, backend and frontend…"
  load_env
  ( cd "$APP_DIR" && as_app npm run build:shared )
  # O prisma.config.ts lê o DATABASE_URL mesmo só para gerar o cliente.
  ( cd "$APP_DIR" && as_app env DATABASE_URL="$DATABASE_URL" npm run build -w @gametracker/backend )
  ( cd "$APP_DIR" && as_app env VITE_API_URL=/api npm run build -w @gametracker/frontend )
}

migrate_db() {
  msg "Applying database migrations…"
  load_env
  ( cd "$APP_DIR/apps/backend" && as_app env DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy )
}

publish_frontend() {
  msg "Publishing the frontend to $WEB_ROOT…"
  mkdir -p "$WEB_ROOT"
  rm -rf "${WEB_ROOT:?}"/*
  cp -r "$APP_DIR/apps/frontend/dist/." "$WEB_ROOT/"
  chown -R root:root "$WEB_ROOT"
  chmod -R a+rX "$WEB_ROOT"
}

restart_backend() {
  msg "Restarting the backend…"
  systemctl restart "$SERVICE"
  wait_backend
}

# Espera até o backend responder (o Nest demora uns segundos a arrancar).
wait_backend() {
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  warn "The backend did not answer within 60 s. Logs: journalctl -u $SERVICE -n 100"
  return 1
}

# The systemd unit and the nginx site are (re)written by install.sh and by
# gametracker-update, so changes to them in the repo reach installed containers.
configure_service() {
msg "Configuring the $SERVICE service…"
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=GameTracker Vault (backend)
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/apps/backend
EnvironmentFile=${ENV_FILE}
Environment=APP_DIR=${APP_DIR}
Environment=SYSTEM_UPDATES_DIR=${UPDATES_DIR}
ExecStart=/usr/local/bin/node dist/src/main.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
}

configure_nginx() {
msg "Configuring nginx…"
cat > /etc/nginx/sites-available/gametracker <<EOF
# The protocol the browser really used: Nginx Proxy Manager terminates https and
# sends X-Forwarded-Proto; opened by IP there is no header and it is this nginx's.
# The backend uses it to decide whether the session cookie is "secure".
map \$http_x_forwarded_proto \$gametracker_proto {
    default \$http_x_forwarded_proto;
    ""      \$scheme;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root ${WEB_ROOT};
    index index.html;

    # Uploads grandes (imagens, importações) passam pelo backend.
    client_max_body_size 300m;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$gametracker_proto;
        proxy_set_header Connection "";

        # Sem buffering e com ligação longa: respostas em streaming (SSE) chegam ao
        # browser à medida que saem do backend.
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }

    # Ficheiros com hash no nome: podem ficar em cache para sempre.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location = /env-config.js { add_header Cache-Control "no-store"; }
    location = /index.html   { add_header Cache-Control "no-cache"; }

    # SPA: qualquer rota volta ao index.html.
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sf /etc/nginx/sites-available/gametracker /etc/nginx/sites-enabled/gametracker
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || { nginx -t; die "Invalid nginx configuration."; }
systemctl enable --now nginx >/dev/null
systemctl reload nginx
}

# In-app updates. The backend runs unprivileged and only writes $UPDATES_DIR/request
# with the version to install; this .path unit (root) sees the file appear and runs
# update.sh, which writes its progress to status.json and its output to update.log.
configure_updater() {
  msg "Configuring in-app updates…"
  mkdir -p "$UPDATES_DIR"
  chown "$APP_USER:$APP_USER" "$UPDATES_DIR"
  chmod 755 "$UPDATES_DIR"

  cat > /etc/systemd/system/gametracker-updater.path <<EOF
[Unit]
Description=GameTracker Vault — watch for update requests from the app

[Path]
PathExists=${UPDATES_DIR}/request
Unit=gametracker-updater.service

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/gametracker-updater.service <<EOF
[Unit]
Description=GameTracker Vault — update requested from the app

[Service]
Type=oneshot
Environment=LANG=C.UTF-8 LC_ALL=C.UTF-8
ExecStart=/usr/bin/bash ${APP_DIR}/deploy/proxmox/update.sh --from-request
EOF

  systemctl daemon-reload
  systemctl enable --now gametracker-updater.path >/dev/null 2>&1
}

# gametracker-update / gametracker-config. In /usr/bin and not /usr/local/bin: the shell
# opened by `pct enter` / `pct exec` does not always have /usr/local/bin in its PATH.
install_commands() {
  local dir; dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
  chmod +x "$dir"/*.sh
  ln -sf "$dir/update.sh" /usr/bin/gametracker-update
  ln -sf "$dir/config.sh" /usr/bin/gametracker-config
  rm -f /usr/local/bin/gametracker-update /usr/local/bin/gametracker-config
}
