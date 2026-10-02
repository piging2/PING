#!/usr/bin/env bash
#
# MC-1 harness setup: creates the scratch database and the ingress schema.
#
# Creates MC1_DBNAME (default mc1_legacy_ingress_scratch) on MC1_PGHOST:MC1_PGPORT
# and applies schema.sql (canonical_events). ping_events is intentionally NOT
# created here; UnifiedEventRuntime.initialize() creates and owns it, exactly
# as in production bootstrap.
#
# The setup role (MC1_SETUP_USER, default = MC1_PGUSER) needs CREATEDB.
# If the suite will run as a DIFFERENT, less-privileged role (the original
# 2026-09-18 cert ran the suite as an unprivileged mc1_cert role), setup
# grants that role full rights on the scratch DB, including on tables created
# later by runtime.initialize().
#
# Env vars (all optional; no credentials are stored anywhere by this script):
#   MC1_PGHOST         default: localhost
#   MC1_PGPORT         default: 5433
#   MC1_DBNAME         default: mc1_legacy_ingress_scratch
#   MC1_SETUP_USER     role used for createdb/schema/grants; default: $MC1_PGUSER
#   MC1_SETUP_PASSWORD password for the setup role (falls back to PGPASSWORD)
#   MC1_PGUSER         role the suite runs as; default: same as MC1_SETUP_USER
#   MC1_PGPASSWORD     password for the suite role (falls back to PGPASSWORD)
#
# Example (single privileged role):
#   export MC1_PGHOST=localhost MC1_PGPORT=5433 MC1_PGUSER=postgres
#   read -rsp 'postgres password: ' PGPASSWORD; export PGPASSWORD; echo
#   ./setup.sh
#
# Example (two roles, mirroring the original certification):
#   export MC1_PGHOST=localhost MC1_PGPORT=5433
#   export MC1_SETUP_USER=postgres MC1_PGUSER=mc1_cert
#   read -rsp 'postgres password: ' MC1_SETUP_PASSWORD; export MC1_SETUP_PASSWORD; echo
#   read -rsp 'mc1_cert password: ' MC1_PGPASSWORD; export MC1_PGPASSWORD; echo
#   ./setup.sh
#
set -euo pipefail
cd "$(dirname "$0")"

HOST="${MC1_PGHOST:-localhost}"
PORT="${MC1_PGPORT:-5433}"
DB="${MC1_DBNAME:-mc1_legacy_ingress_scratch}"
SETUP_USER="${MC1_SETUP_USER:-${MC1_PGUSER:-}}"
SUITE_USER="${MC1_PGUSER:-${MC1_SETUP_USER:-}}"

if [ -z "$SETUP_USER" ]; then
  echo "ERROR: set MC1_SETUP_USER (or MC1_PGUSER); a role with CREATEDB is required." >&2
  exit 2
fi

export PGHOST="$HOST" PGPORT="$PORT" PGUSER="$SETUP_USER"
if [ -n "${MC1_SETUP_PASSWORD:-}" ]; then
  export PGPASSWORD="$MC1_SETUP_PASSWORD"
fi

echo "setup: creating database '$DB' as role '$SETUP_USER' on $HOST:$PORT ..."
if psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
  echo "setup: database '$DB' already exists; leaving it in place."
else
  createdb "$DB"
  echo "setup: database '$DB' created."
fi

echo "setup: applying schema.sql (canonical_events) ..."
psql -d "$DB" -v ON_ERROR_STOP=1 -f schema.sql
echo "setup: schema applied."

if [ -n "$SUITE_USER" ] && [ "$SUITE_USER" != "$SETUP_USER" ]; then
  echo "setup: granting '$SUITE_USER' full rights on scratch DB '$DB' ..."
  psql -d "$DB" -v ON_ERROR_STOP=1 <<EOF
GRANT ALL PRIVILEGES ON DATABASE "$DB" TO "$SUITE_USER";
GRANT ALL PRIVILEGES ON SCHEMA public TO "$SUITE_USER";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$SUITE_USER";
ALTER DEFAULT PRIVILEGES FOR ROLE "$SETUP_USER" IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "$SUITE_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$SUITE_USER";
ALTER DEFAULT PRIVILEGES FOR ROLE "$SETUP_USER" IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "$SUITE_USER";
EOF
  echo "setup: grants complete."
fi

echo "setup: OK. Run the suite with: node run-cert.js"
echo "setup: then remove everything with: ./teardown.sh"
