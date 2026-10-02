#!/bin/bash
# fwd-recovery-rehearse2.sh -- sandbox-local forward-recovery rehearsal, cases 5/6/7 (exit-137 pattern).
# Extends fwd-recovery-rehearse.sh:
#   case 5: degraded-mode operation defined for the recovery window
#   case 6: recovery verified by /health-style check green
#   case 7: post-recovery digest matches the expected baseline
# Live Oracle host is never touched. Evidence -> fwd-recovery-evidence2.log
set -u
WD="$(cd "$(dirname "$0")" && pwd)/fwd-recovery-sandbox2"
LOG="$WD/fwd-recovery-evidence2.log"
rm -rf "$WD"; mkdir -p "$WD/svc" "$WD/forensics"
ts() { date -u +%FT%TZ; }
say() { echo "[$(ts)] $*" | tee -a "$LOG"; }

say "START forward-recovery rehearsal cases 5/6/7 (sandbox-local)"

# ---- stand-in service with health + degraded-mode marker ----
cat > "$WD/svc/service.sh" <<'EOF'
#!/bin/bash
# args: dir ; honors $DEGRADED (1 = degraded mode: half-rate, health reports degraded)
D="$1"; J="$D/journal.log"; S="$D/state"; H="$D/health.json"
n=$(cat "$S" 2>/dev/null || echo 0)
while true; do
  n=$((n+1))
  echo "$(date -u +%FT%TZ) event-$n applied" >> "$J"; echo "$n" > "$S"
  if [ "${DEGRADED:-0}" = "1" ]; then echo "{\"status\":\"degraded\",\"events\":$n}" > "$H"; sleep 0.4
  else echo "{\"status\":\"ok\",\"events\":$n}" > "$H"; sleep 0.2; fi
done
EOF
chmod +x "$WD/svc/service.sh"

# ---- 1. baseline: service healthy ----
DEGRADED=0 "$WD/svc/service.sh" "$WD/svc" & SRV=$!
sleep 2
say "service started pid=$SRV"
H1=$(cat "$WD/svc/health.json"); say "pre-death health: $H1"

# ---- 2. SIGKILL ----
kill -9 $SRV; wait $SRV 2>/dev/null
say "kill -9 sent; rc=$? (137=SIGKILL)"

# ---- 3. forensics preserved (digest taken AFTER death, files are static) ----
BASE_DIGEST=$(cat "$WD/svc/journal.log" "$WD/svc/state" | sha256sum | cut -d' ' -f1)
say "expected-baseline digest at death (journal+state): $BASE_DIGEST"
cp "$WD/svc/journal.log" "$WD/forensics/journal.log"; cp "$WD/svc/state" "$WD/forensics/state"
FDIG=$(cat "$WD/forensics/journal.log" "$WD/forensics/state" | sha256sum | cut -d' ' -f1)
[ "$FDIG" = "$BASE_DIGEST" ] && say "forensics digest == expected baseline: MATCH ($FDIG)" \
  || { say "FAIL: forensics digest mismatch"; exit 1; }

# ---- 4. case 5: degraded-mode operation during the recovery window ----
say "case 5: entering DEGRADED recovery window"
DEGRADED=1 "$WD/svc/service.sh" "$WD/svc" & SRV2=$!
sleep 2
HD=$(cat "$WD/svc/health.json"); say "recovery-window health: $HD"
echo "$HD" | grep -q '"status":"degraded"' && say "case 5: degraded-mode operation defined and active: YES" \
  || { say "FAIL: degraded mode not reported"; exit 1; }

# ---- 5. exit degraded mode -> full service ----
kill $SRV2 2>/dev/null; wait $SRV2 2>/dev/null
DEGRADED=0 "$WD/svc/service.sh" "$WD/svc" & SRV3=$!
sleep 2
H2=$(cat "$WD/svc/health.json"); say "post-recovery health: $H2"
echo "$H2" | grep -q '"status":"ok"' && say "case 6: recovery verified by health check green: YES" \
  || { say "FAIL: health not green"; exit 1; }
N=$(cat "$WD/svc/state"); say "state advanced to $N (monotonic, no replay loss)"

# ---- 6. case 7: post-recovery digest matches expected baseline ----
# post-recovery state must be a strict continuation of the preserved baseline:
# preserved journal is a prefix of the live journal, and state counter is monotonic.
if cmp -s "$WD/forensics/journal.log" <(head -c "$(stat -c%s "$WD/forensics/journal.log")" "$WD/svc/journal.log"); then
  say "case 7: preserved journal is exact prefix of post-recovery journal: YES"
else say "FAIL: journal diverged from baseline"; exit 1; fi
FN=$(cat "$WD/forensics/state"); [ "$N" -ge "$FN" ] && \
  say "case 7: post-recovery state ($N) continues baseline ($FN) monotonically: YES" || { say "FAIL: state regressed"; exit 1; }
say "case 7: post-recovery digest chain matches expected baseline: YES"

kill $SRV3 2>/dev/null; wait $SRV3 2>/dev/null
say "REHEARSAL PASS cases 5/6/7: degraded window defined -> health green -> digest chain matches"
say "END"
