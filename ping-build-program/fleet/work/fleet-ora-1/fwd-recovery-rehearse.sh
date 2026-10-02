#!/bin/bash
# fwd-recovery-rehearse.sh -- sandbox-local forward-recovery rehearsal for SIGKILL (exit-137) service death.
# Pattern rehearsed (stand-in service, no docker on this worker):
#   1. run stand-in service writing journal lines + state file (scratch store analog)
#   2. SIGKILL it (kill -9; exit-137 analog)
#   3. preserve forensics BEFORE any restart: copy journal + state + exit record to forensics dir
#   4. restore service forward from preserved state (no rollback; no destructive snapshot restore)
#   5. verify: serving resumed, forensics intact (hashes match), no evidence destroyed
# Live Oracle host is never touched. Evidence -> fwd-recovery-evidence.log
set -u
WD="$(cd "$(dirname "$0")" && pwd)/fwd-recovery-sandbox"
LOG="$WD/fwd-recovery-evidence.log"
rm -rf "$WD"; mkdir -p "$WD/svc" "$WD/forensics"
ts() { date -u +%FT%TZ; }
say() { echo "[$(ts)] $*" | tee -a "$LOG"; }

say "START forward-recovery rehearsal (sandbox-local, stand-in service)"
say "live host untouched by construction (no ssh, no docker calls in this script)"

# ---- 1. start stand-in service ----
cat > "$WD/svc/service.sh" <<'EOF'
#!/bin/bash
# stand-in service: appends journal lines, keeps state counter
J="$1/journal.log"; S="$1/state"
n=$(cat "$S" 2>/dev/null || echo 0)
while true; do n=$((n+1)); echo "$(date -u +%FT%TZ) event-$n applied" >> "$J"; echo "$n" > "$S"; sleep 0.2; done
EOF
chmod +x "$WD/svc/service.sh"
"$WD/svc/service.sh" "$WD/svc" & SRV=$!
sleep 2
say "service started pid=$SRV"
[ -d /proc/$SRV ] && say "service running: YES" || { say "FAIL: service did not start"; exit 1; }
N_BEFORE=$(cat "$WD/svc/state")
say "events applied before death: $N_BEFORE"

# ---- 2. SIGKILL (exit-137 analog) ----
kill -9 $SRV; wait $SRV 2>/dev/null; RC=$?
say "kill -9 sent; wait rc=$RC (137 = SIGKILL)"
[ -d /proc/$SRV ] && { say "FAIL: service survived SIGKILL"; exit 1; } || say "service dead: YES"

# ---- 3. preserve forensics BEFORE restart ----
J_HASH_BEFORE=$(sha256sum "$WD/svc/journal.log" | cut -d' ' -f1)
S_HASH_BEFORE=$(sha256sum "$WD/svc/state" | cut -d' ' -f1)
J_LINES_BEFORE=$(wc -l < "$WD/svc/journal.log")
cp "$WD/svc/journal.log" "$WD/forensics/journal.log"
cp "$WD/svc/state" "$WD/forensics/state"
echo "died $(ts); signal=SIGKILL; journal_lines=$J_LINES_BEFORE; journal_sha=$J_HASH_BEFORE; state_sha=$S_HASH_BEFORE" > "$WD/forensics/exit-record.txt"
say "forensics preserved: journal_lines=$J_LINES_BEFORE journal_sha=$J_HASH_BEFORE state_sha=$S_HASH_BEFORE"

# ---- 4. restore forward (no rollback) ----
"$WD/svc/service.sh" "$WD/svc" & SRV2=$!
sleep 2
say "service restored pid=$SRV2 (forward from preserved state, no rollback)"
[ -d /proc/$SRV2 ] && say "service serving: YES" || { say "FAIL: restore failed"; exit 1; }
N_AFTER=$(cat "$WD/svc/state")
say "events applied after restore: $N_AFTER (was $N_BEFORE; resumed from $N_BEFORE, no replay loss)"

# ---- 5. verify forensics intact ----
J_HASH_AFTER=$(sha256sum "$WD/forensics/journal.log" | cut -d' ' -f1)
S_HASH_AFTER=$(sha256sum "$WD/forensics/state" | cut -d' ' -f1)
J_LINES_AFTER=$(wc -l < "$WD/forensics/journal.log")
[ "$J_HASH_BEFORE" = "$J_HASH_AFTER" ] && say "forensics journal hash: MATCH" || { say "FAIL: journal altered"; exit 1; }
[ "$S_HASH_BEFORE" = "$S_HASH_AFTER" ] && say "forensics state hash: MATCH" || { say "FAIL: state altered"; exit 1; }
[ "$J_LINES_BEFORE" = "$J_LINES_AFTER" ] && say "forensics journal lines: $J_LINES_AFTER (unchanged)" || { say "FAIL: lines changed"; exit 1; }
[ "$N_AFTER" -gt "$N_BEFORE" ] && say "service advanced state after restore: YES ($N_BEFORE -> $N_AFTER)" || { say "FAIL: no progress"; exit 1; }

kill $SRV2 2>/dev/null; wait $SRV2 2>/dev/null
say "REHEARSAL PASS: SIGKILL death -> forensics preserved (hashes match) -> service restored forward -> serving resumed"
say "END"
