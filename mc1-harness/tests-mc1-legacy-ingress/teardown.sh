#!/usr/bin/env bash
#
# MC-1 harness teardown: drops the scratch database and verifies it is gone.
#
# Reads the same env vars as setup.sh (MC1_PGHOST, MC1_PGPORT, MC1_DBNAME,
# MC1_SETUP_USER / MC1_PGUSER, MC1_SETUP_PASSWORD / PGPASSWORD). The setup role
# (or the suite role, if identical) must be able to drop the database.
# Prints TEARDOWN_OK only after the database is confirmed absent.
#
set -euo pipefail
cd "$(dirname "$0")"

HOST="${MC1_PGHOST:-localhost}"
PORT="${MC1_PGPORT:-5433}"
DB="${MC1_DBNAME:-mc1_legacy_ingress_scratch}"
SETUP_USER="${MC1_SETUP_USER:-${MC1_PGUSER:-}}"

if [ -z "$SETUP_USER" ]; then
  echo "ERROR: set MC1_SETUP_USER (or MC1_PGUSER)." >&2
  exit 2
fi

export PGHOST="$HOST" PGPORT="$PORT" PGUSER="$SETUP_USER"
if [ -n "${MC1_SETUP_PASSWORD:-}" ]; then
  export PGPASSWORD="$MC1_SETUP_PASSWORD"
fi

echo "teardown: dropping database '$DB' ..."
dropdb --if-exists "$DB"

if psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
  echo "TEARDOWN_FAIL: database '$DB' still present after dropdb." >&2
  exit 1
fi

echo "TEARDOWN_OK: scratch database '$DB' is gone."
