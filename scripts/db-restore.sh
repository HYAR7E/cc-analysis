#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-$ROOT/backups/pdf_cc_tracker-latest.sql}"

if [[ ! -f "$FILE" ]]; then
  echo "Backup file not found: $FILE" >&2
  echo "Usage: $0 [path/to/backup.sql]" >&2
  exit 1
fi

cd "$ROOT"

docker compose up -d postgres

until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pdf_cc_tracker' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

cat "$FILE" | docker compose exec -T postgres psql -U postgres -d pdf_cc_tracker -v ON_ERROR_STOP=1

echo "Restored database from:"
echo "  $FILE"
echo
echo "Next steps:"
echo "  cp .env.example .env"
echo "  npm install"
echo "  npx prisma generate"
echo "  npm run dev"
