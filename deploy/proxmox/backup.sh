#!/usr/bin/env bash
# Compressed database dump to /var/backups/gametracker, keeping 14 days.
# Run by cron (/etc/cron.d/gametracker-backup); can also be run by hand.
#
# Restore:  gunzip -c <file> | runuser -u postgres -- psql -d gametracker
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

file="$BACKUP_DIR/gametracker-$(date +%Y%m%d-%H%M).sql.gz"
runuser -u postgres -- pg_dump --clean --if-exists gametracker | gzip > "$file.tmp"
mv "$file.tmp" "$file"
chmod 600 "$file"

find "$BACKUP_DIR" -name 'gametracker-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
msg "Backup: $file ($(du -h "$file" | cut -f1))"
