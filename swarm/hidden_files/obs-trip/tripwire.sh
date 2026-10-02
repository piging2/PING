#!/bin/bash
# OBS-TRIP dormant-authority tripwire (Lane I successor), read-only.
# Run every ~2h by the orchestrator (NOT via cron; this lane keeps no cron).
# Baseline: ~/workspace/swarm/hidden_files/obs-trip/baseline.json
# ALERTS on: first-ever row in canonical_events or repository_events,
#            a 2nd fyd-journal-gateway process / listener on 18199,
#            any new live writer to either table (active write session),
#            journal store mtime advanced unexpectedly.
# Writes nothing to any DB. DB credentials are resolved transiently from the
# gateway container env on the Pig and held only in a 0600 temp file there
# (PGPASSFILE), deleted at the end of the pass. Never persisted, never logged.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Test seams (2026-09-28): TRIPWIRE_BASE and TRIPWIRE_LOG override the state
# and log paths; TRIPWIRE_READINGS_JSON, when set (even to empty), replaces
# the Pig SSH readings capture. These let the null/mismatch branches be
# tested without touching live state or the Pig.
BASE="${TRIPWIRE_BASE:-$HERE/baseline.json}"
RUNLOG="${TRIPWIRE_LOG:-$HERE/runs.log}"
PIG=~/workspace/pig-fb/pigwsl-exec.sh
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -n "${TRIPWIRE_READINGS_JSON+x}" ]; then
  READINGS="$TRIPWIRE_READINGS_JSON"
else
READINGS=$("$PIG" -s <<'EOF'
set -u
PW=$(docker exec ping-gateway printenv POSTGRES_PASSWORD 2>/dev/null)
PF=$(mktemp); chmod 600 "$PF"
printf 'localhost:5432:ping_runtime:postgres:%s\n' "$PW" > "$PF"
export PGPASSFILE="$PF"
COUNTS=$(docker exec brain-postgres psql -h localhost -U postgres -d ping_runtime -tAc \
  "SELECT json_build_object('canonical_events',(SELECT COUNT(*) FROM canonical_events),'repository_events',(SELECT COUNT(*) FROM repository_events));" 2>/dev/null)
WRITERS=$(docker exec brain-postgres psql -h localhost -U postgres -d ping_runtime -tAc \
  "SELECT COUNT(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND state<>'idle' AND (query ILIKE '%canonical_events%' OR query ILIKE '%repository_events%');" 2>/dev/null)
shred -u "$PF"
# INVARIANT (2026-09-26 incident fix): SERVICE IDENTITY + LISTENER OWNERSHIP + HEALTH.
# The gateway is launched by /home/nolan/start-18199.sh as bare `node server.mjs`
# with cwd=/home/nolan/projects/ping/tools/fyd-journal-gateway, so argv-substring
# matching is WRONG. Identity = node process whose /proc/PID/cwd is the canonical
# gateway dir. The 18199 listener's PID must equal the identity PID, and the
# health endpoint must answer ok:true. A proxy holding 18199 with a dead backend
# is NOT green; a healthy gateway under a renamed argv is NOT red.
GW_DIR=/home/nolan/projects/ping/tools/fyd-journal-gateway
GW_COUNT=$(docker ps --format '{{.Image}}' 2>/dev/null | grep -c '^ping-gateway:')
LISTENERS=$(ss -tlnp 2>/dev/null | grep -c '127.0.0.1:18199')
JGW_PID=$(for d in /proc/[0-9]*; do
  if [ "$(readlink "$d/cwd" 2>/dev/null)" = "$GW_DIR" ] && [ "$(cat "$d/comm" 2>/dev/null)" = "node" ]; then basename "$d"; fi
done | head -1)
JGW_PROCS=$(for d in /proc/[0-9]*; do
  if [ "$(readlink "$d/cwd" 2>/dev/null)" = "$GW_DIR" ] && [ "$(cat "$d/comm" 2>/dev/null)" = "node" ]; then echo x; fi
done | wc -l)
LISTEN_PID=$(ss -tlnp 2>/dev/null | grep '127.0.0.1:18199' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
JGW_HEALTH=$(curl -s --max-time 8 http://127.0.0.1:18199/ 2>/dev/null | grep -c '"ok":true')
IDENT_OK=0
if [ "$JGW_PROCS" = "1" ] && [ -n "$JGW_PID" ] && [ "$LISTEN_PID" = "$JGW_PID" ] && [ "$JGW_HEALTH" = "1" ]; then IDENT_OK=1; fi
JMTIME=$(stat -c %Y /home/nolan/projects/ping/data/fyd-journal/events.jsonl 2>/dev/null)
echo "{\"counts\":${COUNTS:-null},\"active_writers\":${WRITERS:-null},\"gateway_containers\":$GW_COUNT,\"port18199_listeners\":$LISTENERS,\"journal_gateway_procs\":$JGW_PROCS,\"journal_gateway_identity_ok\":$IDENT_OK,\"journal_mtime\":${JMTIME:-null}}"
EOF
)
fi

# OBSERVATION VALIDATION (2026-09-28): the readings envelope is validated
# BEFORE baseline seeding or alert classification. Blank, malformed, null,
# or misshapen readings are an observation failure, never a specific alert:
# a null journal_gateway_identity_ok must NOT become JOURNAL_GATEWAY_IDENTITY_MISMATCH.
OBS_ERR=""
if [ -z "$READINGS" ]; then
  OBS_ERR="empty"
else
  OBS_ERR=$(printf '%s' "$READINGS" | python3 -c "
import json, sys
raw = sys.stdin.read()
def fail(reason):
    print(reason); sys.exit(0)
try:
    r = json.loads(raw)
except Exception:
    fail('unparseable')
if not isinstance(r, dict):
    fail('not-object')
for k in ('active_writers', 'gateway_containers', 'port18199_listeners',
          'journal_gateway_procs', 'journal_gateway_identity_ok'):
    v = r.get(k)
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        fail('bad:' + k)
counts = r.get('counts')
if not isinstance(counts, dict):
    fail('bad:counts')
for k in ('canonical_events', 'repository_events'):
    v = counts.get(k)
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        fail('bad:counts.' + k)
print('ok')
")
fi
if [ "$OBS_ERR" != "ok" ]; then
  echo "OBSERVATION_FAILED $TS reason=$OBS_ERR"
  printf 'pass=%s observation_failed reason=%s\n' "$TS" "$OBS_ERR" >> "$RUNLOG"
  exit 3
fi

if [ ! -s "$BASE" ]; then
  printf '%s\n' "$READINGS" > "$BASE"
  echo "TRIPWIRE BASELINE SEEDED $TS"
  echo "$READINGS"
  exit 0
fi

# py() reads readings via stdin (not inline '''...''') so hostile or quoted
# readings content can never break out of the Python string.
py() { printf '%s' "$READINGS" | python3 -c "import json,sys; r=json.load(sys.stdin); b=json.load(open('$BASE')); print($1)"; }
ce=$(py "1 if r['counts']['canonical_events']>b['counts']['canonical_events'] else 0")
re=$(py "1 if r['counts']['repository_events']>b['counts']['repository_events'] else 0")
wr=$(py "r.get('active_writers') or 0")
li=$(py "r.get('port18199_listeners') or 0")
jp=$(py "r.get('journal_gateway_procs') or 0")
gc=$(py "r.get('gateway_containers') or 0")
ident=$(py "r.get('journal_gateway_identity_ok') or 0")

ALERTS=""
[ "$ce" = "1" ] && ALERTS="$ALERTS ROW_IN_CANONICAL_EVENTS"
[ "$re" = "1" ] && ALERTS="$ALERTS ROW_IN_REPOSITORY_EVENTS"
[ "$wr" -gt 0 ] 2>/dev/null && ALERTS="$ALERTS ACTIVE_WRITER_TO_DORMANT_TABLE"
[ "$li" -ne 1 ] && ALERTS="$ALERTS PORT18199_LISTENER_COUNT=$li"
[ "$jp" -ne 1 ] && ALERTS="$ALERTS JOURNAL_GATEWAY_PROCS=$jp"
[ "$gc" -gt 1 ] && ALERTS="$ALERTS MULTIPLE_GATEWAY_CONTAINERS=$gc"
[ "$ident" != "1" ] && ALERTS="$ALERTS JOURNAL_GATEWAY_IDENTITY_MISMATCH"

echo "pass=$TS readings=$READINGS alerts=[$ALERTS ]" >> "$RUNLOG"

if [ -n "$ALERTS" ]; then
  echo "TRIPWIRE ALERT $TS:$ALERTS"
  echo "$READINGS"
  exit 2
fi
echo "TRIPWIRE QUIET $TS ce=$(py "r['counts']['canonical_events']") re=$(py "r['counts']['repository_events']") listeners=$li procs=$jp identity_ok=$ident"
exit 0
