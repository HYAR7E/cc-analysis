#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/pdf_cc_tracker-${STAMP}.sql"
LATEST="$BACKUP_DIR/pdf_cc_tracker-latest.sql"

mkdir -p "$BACKUP_DIR"
cd "$ROOT"

docker compose up -d postgres

until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

docker compose exec -T postgres pg_dump \
  -U postgres \
  -d pdf_cc_tracker \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  > "$FILE"

cp "$FILE" "$LATEST"

echo "Backup written to:"
echo "  $FILE"
echo "  $LATEST"
