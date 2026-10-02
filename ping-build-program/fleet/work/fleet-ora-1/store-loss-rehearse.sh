#!/bin/bash
# store-loss-rehearse.sh -- sandbox-local store-loss recovery drill.
# For each store analog (postgres pgdata-style, qdrant segment-style):
#   1. build canonical source data + canonical digest manifest (sha256 per file)
#   2. populate the "live" scratch store from canonical sources; snapshot a backup
#   3. WIPE the live store (total data loss; sandbox-local only, never the live host)
#   4. rebuild from the backup within an RTO budget; measure elapsed
#   5. verify: per-file digests match canonical manifest; no missing/extra files
# PASS: rebuild within RTO and digests match. Evidence -> store-loss-evidence.log
set -u
WD="$(cd "$(dirname "$0")" && pwd)/store-loss-sandbox"
LOG="$WD/store-loss-evidence.log"
RTO_BUDGET_S=60
rm -rf "$WD"; mkdir -p "$WD"
ts() { date -u +%FT%TZ; }
say() { echo "[$(ts)] $*" | tee -a "$LOG"; }
fail() { say "FAIL: $*"; exit 1; }

drill() { # $1 = store name, $2 = file count, $3 = file size KB
  local name="$1" nfiles="$2" fkb="$3"
  local S="$WD/$name"
  say "=== drill: $name ($nfiles files x ${fkb}KB) ==="
  mkdir -p "$S/canonical" "$S/live" "$S/backup"
  # 1. canonical source data (deterministic content)
  for i in $(seq 1 "$nfiles"); do
    python3 -c "
import hashlib
h = hashlib.sha256(b'$name-seed-$i').digest()
with open('$S/canonical/part-$i.dat','wb') as f:
    for _ in range($fkb): f.write(h)
" || fail "$name: canonical build failed"
  done
  (cd "$S/canonical" && sha256sum part-*.dat | sort > "$S/MANIFEST.sha256")
  say "canonical manifest: $(wc -l < "$S/MANIFEST.sha256") files"
  # 2. populate live store + take backup
  cp "$S/canonical"/part-*.dat "$S/live/"
  tar --no-same-owner -czf "$S/backup.tar.gz" -C "$S/canonical" . || fail "$name: backup failed"
  say "live store populated; backup snapshot taken ($(du -h "$S/backup.tar.gz" | cut -f1))"
  # 3. WIPE live store (total loss, sandbox-local)
  rm -rf "$S/live"; mkdir -p "$S/live"
  [ -z "$(ls -A "$S/live")" ] && say "live store WIPED (total data loss simulated)" || fail "$name: wipe incomplete"
  # 4. rebuild from backup within RTO
  local t0=$(date +%s)
  tar --no-same-owner -xzf "$S/backup.tar.gz" -C "$S/live" || fail "$name: rebuild failed"
  local t1=$(date +%s); local elapsed=$((t1-t0))
  say "rebuild completed in ${elapsed}s (RTO budget ${RTO_BUDGET_S}s)"
  [ "$elapsed" -le "$RTO_BUDGET_S" ] || fail "$name: RTO exceeded"
  # 5. verify against canonical digest
  (cd "$S/live" && sha256sum -c "$S/MANIFEST.sha256" > "$S/verify.out" 2>&1) || fail "$name: digest mismatch (see verify.out)"
  local ok=$(grep -c ': OK$' "$S/verify.out"); local total=$(wc -l < "$S/MANIFEST.sha256")
  [ "$ok" -eq "$total" ] || fail "$name: only $ok/$total digests OK"
  local extra=$(ls "$S/live" | wc -l)
  [ "$extra" -eq "$total" ] || fail "$name: file count mismatch ($extra vs $total)"
  say "$name: $ok/$total digests OK, no missing/extra files"
  say "=== drill $name: PASS ==="
}

say "START store-loss sandbox drill (sandbox-local; live Oracle host untouched)"
drill postgres 20 64      # pgdata-style: 20 relations x 64KB
drill qdrant 12 128       # segment-style: 12 segments x 128KB
say "ALL DRILLS PASS: wipe -> rebuild within RTO -> digests match canonical manifest"
say "END"
