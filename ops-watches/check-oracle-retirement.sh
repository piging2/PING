#!/usr/bin/env bash
# check: oracle-retirement — assert the Oracle plane's intended read-only state.
#
# Nolan's binding direction (2026-09-30 ~13:15 MDT, supersedes the stop+rename):
# Oracle stays RUNNING, OBSERVABLE, READ-ONLY, zero write authority, for the
# 7-day evidence/rollback window. The correct watch is not "container healthy"
# and not "container stopped" — it is "read-only running state holds".
#
# How read-only is enforced (2026-09-30 ~13:25 MDT):
#   ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on;
# The gateway connects as role ping (superuser, so REVOKE would be meaningless;
# the transaction mode binds even superusers for the app's connection pattern —
# the app never issues SET/START TRANSACTION). The append-only trigger remains
# as defense-in-depth. Verified: INSERT -> "cannot execute INSERT in a
# read-only transaction"; SELECT works; the gateway boots into its own
# degraded mode (PG services skipped, /health overall "unhealthy" with the
# gateway component "healthy") — that degraded signal is EXPECTED, not an
# incident. Do not "fix" it by restoring writes.
#
# Invariants asserted (every run):
#   1. Container `ping-gateway` exists and is running. Missing or stopped -> CRIT.
#   2. Restart policy = unless-stopped (keeps the plane observable across
#      host reboots; a deliberate stop is still respected). Drift -> WARN.
#   3. Read-only enforced: fresh ping@crx_runtime session reports
#      default_transaction_read_only=on. Off -> CRIT (write authority restored).
#   4. Journal sealed: crx_runtime.ping_events count=2557, max(sequence)=91,
#      max(created_at)=2026-09-21 12:05:37.688276+00. Any write -> CRIT.
#   5. Gateway observable: http://127.0.0.1:8080/health reachable (any HTTP
#      code; the body honestly reports degraded while PG is read-only).
#      Unreachable -> WARN (plane not observable; journal seal still checked).
#
# Semantics (Nolan 2026-09-27): UNKNOWN is a legitimate state. The remote
# script prints SENTINEL=ORACLE_OK first; a missing sentinel means the script
# never executed on the Oracle host, so the check emits UNKNOWN (exit 1),
# never a false held/broken claim. All remote access is read-only.
set -u
. "$(dirname "$0")/lib.sh"
. "$(dirname "$0")/gateway-classify.sh"  # for type_transport_from_stderr only; no network

SEALED_COUNT=2557
SEALED_MAXSEQ=91
SEALED_MAXCREATED='2026-09-21 12:05:37.688276+00'

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
echo "gw=$(docker inspect -f '{{.State.Status}}|{{.HostConfig.RestartPolicy.Name}}' ping-gateway 2>/dev/null || echo GW_MISSING)"
echo "ronly=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc 'SHOW default_transaction_read_only;' 2>/dev/null || echo QFAIL)"
echo "rcount=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc 'SELECT count(*) FROM ping_events;' 2>/dev/null || echo QFAIL)"
echo "rmaxseq=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc 'SELECT max(sequence) FROM ping_events;' 2>/dev/null || echo QFAIL)"
echo "rmaxcreated=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc 'SELECT max(created_at) FROM ping_events;' 2>/dev/null || echo QFAIL)"
echo "healthcode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:8080/health 2>/dev/null || echo 000)"
EOF
)

OUT_F="/tmp/oracle-ret.$$.out"; ERR_F="/tmp/oracle-ret.$$.err"
trap 'rm -f "$OUT_F" "$ERR_F"' EXIT

run_remote2 "$REMOTE" "$ERR_F" >"$OUT_F"
if ! grep -q '^SENTINEL=ORACLE_OK$' "$OUT_F" 2>/dev/null; then
  type_transport_from_stderr "$ERR_F"
  emit oracle-retirement UNKNOWN "probe transport failed (${GW_LAYER_REASON}); read-only state UNKNOWN, not proven held or broken"; exit 1
fi

GW="$(sed -n 's/^gw=//p' "$OUT_F" | head -n 1)"
RONLY="$(sed -n 's/^ronly=//p' "$OUT_F" | head -n 1 | tr -d ' ')"
RCOUNT="$(sed -n 's/^rcount=//p' "$OUT_F" | head -n 1 | tr -d ' ')"
RMAXSEQ="$(sed -n 's/^rmaxseq=//p' "$OUT_F" | head -n 1 | tr -d ' ')"
RMAXCREATED="$(sed -n 's/^rmaxcreated=//p' "$OUT_F" | head -n 1 | sed 's/^ *//;s/ *$//')"
HEALTHCODE="$(sed -n 's/^healthcode=//p' "$OUT_F" | head -n 1 | tr -d ' ')"

CRIT=""; WARN=""
if [ "$GW" = "GW_MISSING" ]; then
  CRIT="${CRIT} container ping-gateway missing;"
else
  GSTATUS="${GW%%|*}"; GRESTART="${GW##*|}"
  [ "$GSTATUS" != "running" ] && CRIT="${CRIT} ping-gateway state=${GSTATUS} (expected running);"
  [ "$GRESTART" != "unless-stopped" ] && WARN="${WARN} ping-gateway restart=${GRESTART} (expected unless-stopped);"
fi
[ "$RONLY" != "on" ] && CRIT="${CRIT} default_transaction_read_only=${RONLY} (expected on; write authority not removed);"
if [ "$RCOUNT" = "QFAIL" ] || [ "$RMAXSEQ" = "QFAIL" ] || [ "$RMAXCREATED" = "QFAIL" ]; then
  CRIT="${CRIT} journal seal unreadable (postgres query failed);"
else
  [ "$RCOUNT" != "$SEALED_COUNT" ] && CRIT="${CRIT} journal count=${RCOUNT} (sealed ${SEALED_COUNT});"
  [ "$RMAXSEQ" != "$SEALED_MAXSEQ" ] && CRIT="${CRIT} journal max(sequence)=${RMAXSEQ} (sealed ${SEALED_MAXSEQ});"
  [ "$RMAXCREATED" != "$SEALED_MAXCREATED" ] && CRIT="${CRIT} journal max(created_at)=${RMAXCREATED} (sealed ${SEALED_MAXCREATED});"
fi
[ "$HEALTHCODE" = "000" ] && WARN="${WARN} gateway /health unreachable (plane not observable via HTTP);"

if [ -n "$CRIT" ]; then
  emit oracle-retirement CRIT "read-only state BROKEN:${CRIT}"; exit 2
fi
if [ -n "$WARN" ]; then
  emit oracle-retirement WARN "read-only state holds with drift:${WARN} journal sealed at ${RCOUNT} rows seq ${RMAXSEQ}"; exit 1
fi
emit oracle-retirement OK "read-only running state holds: ping-gateway running, writes blocked at DB, journal sealed at ${RCOUNT} rows max(seq)=${RMAXSEQ}, /health=${HEALTHCODE}"; exit 0
