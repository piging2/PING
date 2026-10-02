#!/bin/bash
# pg-backup.sh -- bounded daily postgres backup for ping-postgres (ops lane 2026-09-24)
# Native pg_dump custom format + sha256 sidecar + pg_restore --list integrity check + 7-day retention.
# No credentials: relies on trust auth from inside the container (PG-001 loopback trust).
set -u
BACKUP_DIR=/opt/ping/backups
LOG=$BACKUP_DIR/backup.log
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILE=$BACKUP_DIR/ping-postgres-$TS.dump
LOCK=$BACKUP_DIR/.backup.lock
RETENTION=7

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

exec 9>"$LOCK"
flock -n 9 || { log "SKIP another backup run holds the lock"; exit 0; }

log "START ts=$TS"
T0=$(date +%s)

# 1. dump (custom format, compression 6) to tmp then atomic move
if ! docker exec ping-postgres pg_dump -U ping -d crx_runtime -Fc -Z6 > "$FILE.tmp" 2>>"$LOG"; then
  log "FAIL pg_dump failed"; rm -f "$FILE.tmp"; exit 1
fi
mv "$FILE.tmp" "$FILE"
SIZE=$(stat -c%s "$FILE")

# 2. checksum sidecar
sha256sum "$FILE" | sed "s|$BACKUP_DIR/||" > "$FILE.sha256"

# 3. integrity: archive TOC must parse
if ! pg_restore --list "$FILE" > /dev/null 2>>"$LOG"; then
  # fall back to container-side pg_restore if host lacks it
  if ! docker exec -i ping-postgres pg_restore --list < "$FILE" > /dev/null 2>>"$LOG"; then
    log "FAIL integrity check failed for $FILE"; exit 1
  fi
fi

# 4. re-verify checksum (read-back)
cd "$BACKUP_DIR"
if ! sha256sum -c "$(basename "$FILE.sha256")" >>"$LOG" 2>&1; then
  log "FAIL checksum re-verify failed for $FILE"; exit 1
fi

# 5. retention: keep newest $RETENTION dumps
ls -1t ping-postgres-*.dump 2>/dev/null | tail -n +$((RETENTION+1)) | while read -r old; do
  rm -f "$old" "$old.sha256"; log "PRUNE $old"
done

T1=$(date +%s)
log "OK file=$(basename "$FILE") size=$SIZE bytes duration=$((T1-T0))s retention=$RETENTION"
echo "OK $(basename "$FILE") size=$SIZE duration=$((T1-T0))s"
