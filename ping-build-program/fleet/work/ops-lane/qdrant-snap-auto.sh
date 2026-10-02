#!/bin/bash
# qdrant-snap-auto.sh -- bounded daily qdrant snapshot (ops lane 2026-09-24)
# Snapshot API + download + sha256 sidecar + 7-day retention. No credentials.
set -u
SNAPDIR=/opt/ping/backups/qdrant
LOG=/opt/ping/backups/qdrant-snapshots.log
LOCK=$SNAPDIR/.snap.lock
TS=$(date -u +%Y%m%dT%H%M%SZ)
RETENTION=7

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }
mkdir -p "$SNAPDIR"

exec 9>"$LOCK"
flock -n 9 || { log "SKIP another snapshot run holds the lock"; exit 0; }

log "START ts=$TS"
T0=$(date +%s)

RESP=$(curl -s -X POST http://127.0.0.1:6333/collections/knowledge/snapshots)
SNAME=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['name'])" 2>/dev/null)
if [ -z "$SNAME" ]; then log "FAIL snapshot create failed: $RESP"; exit 1; fi

FILE=$SNAPDIR/knowledge-$TS.snapshot
curl -s -o "$FILE" "http://127.0.0.1:6333/collections/knowledge/snapshots/$SNAME"
SIZE=$(stat -c%s "$FILE")
sha256sum "$FILE" | sed "s|$SNAPDIR/||" > "$FILE.sha256"
cd "$SNAPDIR"
if ! sha256sum -c "$(basename "$FILE.sha256")" >>"$LOG" 2>&1; then
  log "FAIL checksum re-verify failed"; exit 1
fi

ls -1t knowledge-*.snapshot 2>/dev/null | tail -n +$((RETENTION+1)) | while read -r old; do
  rm -f "$old" "$old.sha256"; log "PRUNE $old"
done

T1=$(date +%s)
log "OK file=$(basename "$FILE") size=$SIZE bytes duration=$((T1-T0))s retention=$RETENTION"
echo "OK $(basename "$FILE") size=$SIZE duration=$((T1-T0))s"
