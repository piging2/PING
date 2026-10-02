#!/bin/bash
# PING nightly backup automation.
#
# *** DISABLED BY DEFAULT. This script does NOTHING unless explicitly enabled. ***
#
# Enablement gate (ALL of these must hold, otherwise the script exits 0 silently):
#   1. Environment variable PING_BACKUP_AUTOMATION=enabled is set for this run.
#   2. File /opt/ping/.backup-automation-enabled exists and contains the
#      operator name and date of authorization (human-created, mode 600).
#   3. No lock file at /tmp/ping-backup.lock (a restore test holds the lock).
#
# When enabled, it takes a Postgres dump, a Qdrant snapshot, writes checksums
# and a MANIFEST.json into /opt/ping/releases/<UTC>/, then applies the
# retention ladder from RETENTION_POLICY.md.
#
# Standing orders this script will NEVER violate:
#   - No off-host transfer. Backups stay on ping-core-01 until Nolan
#     authorizes a destination. This script has no upload step.
#   - No enabling of ping-oci-queue.timer or any other systemd timer.
#     Scheduling is a separate human decision.
#   - No writes to the live database; pg_dump is read-only.
#   - No gateway restarts, no live volume mounts, no live container touches.

set -u

ENABLED_FLAG="${PING_BACKUP_AUTOMATION:-disabled}"
AUTH_FILE="/opt/ping/.backup-automation-enabled"
LOCK="/tmp/ping-backup.lock"

if [ "$ENABLED_FLAG" != "enabled" ]; then
  echo "backup automation disabled (PING_BACKUP_AUTOMATION != enabled); exiting quietly."
  exit 0
fi
if [ ! -f "$AUTH_FILE" ]; then
  echo "backup automation disabled (no human authorization file at $AUTH_FILE); exiting."
  exit 0
fi
if [ -e "$LOCK" ]; then
  echo "backup automation skipped (lock present: $LOCK, likely a restore test in progress)."
  exit 0
fi

set -e
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

UTC=$(date -u +%Y%m%dT%H%M%SZ)
SETDIR="/opt/ping/releases/$UTC"
mkdir -p "$SETDIR/qdrant-snapshots-$UTC"
LOG="$SETDIR/backup.log"
exec >>"$LOG" 2>&1

echo "backup run $UTC authorized by: $(cat "$AUTH_FILE")"

# --- Postgres dump (read-only) ---
# Password is resolved at runtime from the deployment env and never logged.
PGPASS_SRC=""
for f in /opt/ping/infrastructure/oracle/.env /opt/ping/.env; do
  if [ -f "$f" ] && grep -qE '^POSTGRES_PASSWORD=' "$f"; then PGPASS_SRC="$f"; break; fi
done
[ -n "$PGPASS_SRC" ] || { echo "FATAL: no POSTGRES_PASSWORD found; aborting."; exit 1; }
PGPASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$PGPASS_SRC" | cut -d= -f2-)"
export PGPASSWORD
pg_dump -h 127.0.0.1 -U ping -d crx_runtime --no-owner --no-acl | gzip > "$SETDIR/pgdata-backup-$UTC.sql.gz"
unset PGPASSWORD
gzip -t "$SETDIR/pgdata-backup-$UTC.sql.gz" && echo "pg_dump gzip PASS"

# --- Qdrant snapshot ---
QDRANT_URL="http://127.0.0.1:6333"
SNAP_NAME=$(curl -sf -X POST "$QDRANT_URL/collections/knowledge/snapshots" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
[ -n "$SNAP_NAME" ] || { echo "FATAL: qdrant snapshot create failed; aborting."; exit 1; }
curl -sf -o "$SETDIR/qdrant-snapshots-$UTC/$SNAP_NAME" \
  "$QDRANT_URL/collections/knowledge/snapshots/$SNAP_NAME" && echo "qdrant snapshot PASS: $SNAP_NAME"
curl -sf -X DELETE "$QDRANT_URL/collections/knowledge/snapshots/$SNAP_NAME" >/dev/null

# --- Checksums + manifest ---
cd "$SETDIR"
sha256sum "pgdata-backup-$UTC.sql.gz" "qdrant-snapshots-$UTC/$SNAP_NAME" > "CHECKSUMS-$UTC.sha256"
export PGPASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$PGPASS_SRC" | cut -d= -f2-)"
EVENTS=$(psql -h 127.0.0.1 -U ping -d crx_runtime -Atc "select count(*) from ping_events")
MISSIONS=$(psql -h 127.0.0.1 -U ping -d crx_runtime -Atc "select count(*) from ping_missions")
TABLES=$(psql -h 127.0.0.1 -U ping -d crx_runtime -Atc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
unset PGPASSWORD
POINTS=$(curl -sf "$QDRANT_URL/collections/knowledge" | grep -o '"points_count":[0-9]*' | cut -d: -f2)
cat > MANIFEST.json <<EOF
{
  "utc_created": "$UTC",
  "host": "ping-core-01",
  "artifacts": [
    {"name": "pgdata-backup-$UTC.sql.gz", "sha256": "$(cut -d' ' -f1 CHECKSUMS-$UTC.sha256 | head -1)"},
    {"name": "qdrant-snapshots-$UTC/$SNAP_NAME", "sha256": "$(cut -d' ' -f1 CHECKSUMS-$UTC.sha256 | tail -1)"}
  ],
  "live_counts": {"ping_events": $EVENTS, "ping_missions": $MISSIONS, "tables": $TABLES, "qdrant_knowledge_points": ${POINTS:-null}}
}
EOF
echo "manifest written"

# --- Retention sweep (7 daily / 4 weekly / 3 monthly, never newest, convention dirs only) ---
cd /opt/ping/releases
NEWEST=$(ls -d 20*/ 2>/dev/null | sort | tail -1)
echo "retention: newest set kept unconditionally: ${NEWEST:-none}"
# Daily: keep newest 7 convention dirs
ls -d 20*/ 2>/dev/null | sort -r | tail -n +8 | while read -r d; do
  d="${d%/}"
  [ "$d" = "${NEWEST%/}" ] && continue
  # protect weekly (Sunday) and monthly (01st) sets: keep newest 4 Sundays, newest 3 month-starts
  echo "retention candidate: $d (weekly/monthly protection applied below in full deployment)"
  # NOTE: deletion is intentionally conservative here; the full weekly/monthly
  # protection ladder is applied by the operator at review time until the
  # automation is field-proven for 30 days.
done
echo "backup run $UTC complete"
