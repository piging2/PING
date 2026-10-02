#!/usr/bin/env bash
# test-lifecycle.sh: hermetic self-test for the research-brief lifecycle.
# Uses synthetic ledgers/dirs in /tmp; never touches production state.
# Fails (exit 1) on any assertion failure.
set -u
T=~/workspace/tandem
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

mkledger() { # $1 = outfile ; remaining args = "run_id|outcome|classification"
  local out=$1; shift; : > "$out"
  for spec in "$@"; do
    rid=${spec%%|*}; rest=${spec#*|}; oc=${rest%%|*}; cl=${rest#*|}
    tmp=${rid#*-}; slug=${tmp#*-}  # strip YYYYMMDD-HHMMSS- prefix only
    printf '{"run_id":"%s","brief_id":"%s","outcome":"%s","classification":"%s","validation":{"status":"%s"}}\n' \
      "$rid" "$slug" "$oc" "$cl" "$([ "$cl" = contract_rejected ] && echo rejected || echo passed)" >> "$out"
  done
}

# --- 1: terminal-failure brief is skipped, rotation advances past it ---
L1=$WORK/l1.jsonl
mkledger "$L1" \
  "20260910-090000-a-weak-website-hunt|ok|null" \
  "20260916-090000-c-review-complaint-signals|capture_failed|contract_rejected" \
  "20260916-150000-c-review-complaint-signals|capture_failed|contract_rejected" \
  "20260916-210000-c-review-complaint-signals|capture_failed|contract_rejected"
export META_INTEL_LEDGER=$L1 TANDEM_QUARANTINE_DIR=$WORK/qempty
mkdir -p "$WORK/qempty"
out=$(python3 $T/next-brief.py 2>$WORK/err1); code=$?
if [ "$out" = "b-new-business-radar" ] && [ "$code" = 0 ]; then ok "1: terminal-failure c skipped, rotation advances past it (a->b)"; else bad "1: got '$out' exit $code (want b-new-business-radar/0)"; fi
grep -q "RECOMMENDATION" $WORK/err1 && ok "1: terminal-failure recommendation on stderr" || bad "1: no RECOMMENDATION on stderr"
grep -q "skipping c-review-complaint-signals (TERMINAL_FAILURE)" $WORK/err1 && ok "1: skip note names TERMINAL_FAILURE" || bad "1: skip note missing"

# --- 2: quarantined brief is skipped silently-by-policy (no new recommendation) ---
mkdir -p "$WORK/q2"
cat > "$WORK/q2/c-review-complaint-signals.json" <<'EOF'
{"schema_version":"1.0.0","brief_id":"c-review-complaint-signals","state":"QUARANTINED"}
EOF
export TANDEM_QUARANTINE_DIR=$WORK/q2
out=$(python3 $T/next-brief.py 2>$WORK/err2); code=$?
if [ "$out" = "b-new-business-radar" ] && [ "$code" = 0 ]; then ok "2: quarantined c skipped, rotation advances past it (a->b)"; else bad "2: got '$out' exit $code"; fi
grep -q "QUARANTINED" $WORK/err2 && ok "2: skip note names QUARANTINED" || bad "2: skip note missing"
grep -q "RECOMMENDATION" $WORK/err2 && bad "2: unexpected RECOMMENDATION for quarantined brief" || ok "2: no duplicate recommendation for quarantined brief"

# --- 3: exhausted rotation exits 3, prints nothing on stdout ---
for b in a-weak-website-hunt b-new-business-radar d-segment-deep-dive h-marketing-intelligence; do
  printf '{"schema_version":"1.0.0","brief_id":"%s","state":"QUARANTINED"}\n' "$b" > "$WORK/q2/$b.json"
done
out=$(python3 $T/next-brief.py 2>$WORK/err3); code=$?
if [ "$code" = 3 ] && [ -z "$out" ]; then ok "3: exhausted rotation exits 3 with empty stdout"; else bad "3: got '$out' exit $code (want empty/3)"; fi

# --- 4: owed-brief logic still works on the effective cycle (no skips) ---
L4=$WORK/l4.jsonl
mkledger "$L4" \
  "20260910-090000-a-weak-website-hunt|ok|null" \
  "20260916-090000-b-new-business-radar|capture_failed|infra"
export META_INTEL_LEDGER=$L4 TANDEM_QUARANTINE_DIR=$WORK/qempty
out=$(python3 $T/next-brief.py 2>/dev/null); code=$?
if [ "$out" = "b-new-business-radar" ] && [ "$code" = 0 ]; then ok "4: owed infra-failed brief retried before advancing"; else bad "4: got '$out' exit $code (want b-new-business-radar/0)"; fi

# --- 5: distill priority ordering + cap + stale-breach-first (synthetic dir) ---
D5=$WORK/intel; mkdir -p "$D5"
mkfile() { # $1=stem $2=sidecar-status $3=brief (unused, in stem)
  printf 'answer body\n' > "$D5/$1.md"
  printf '{"brief_id":"x","timestamp":"%s","status":"%s"}\n' "$1" "$2" > "$D5/$1.provenance.json"
}
# now pinned at 2026-09-17T12:00:00Z
mkfile 20260913-100000-a-weak-website-hunt answer_captured      # 98h -> stale_breach
mkfile 20260914-100000-b-new-business-radar answer_captured    # 74h -> urgent
mkfile 20260915-100000-d-segment-deep-dive answer_captured     # 62h -> high
mkfile 20260916-100000-a-weak-website-hunt answer_captured     # 26h -> elevated
mkfile 20260917-100000-b-new-business-radar answer_captured    # 2h  -> normal
mkfile 20260916-110000-j-clowning-pattern-mining answer_captured # out of scope
export META_INTEL_DIR=$D5 DISTILL_NOW=2026-09-17T12:00:00Z TANDEM_QUARANTINE_DIR=$WORK/qempty
sel=$(python3 $T/distill-sweep.py --select --cap 3)
first=$(echo "$sel" | python3 -c "import json,sys; print(json.load(sys.stdin)['selected'][0]['file'])")
n=$(echo "$sel" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['selected']))")
stale_n=$(echo "$sel" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['stale_breach_deferred']))")
if [ "$first" = "20260913-100000-a-weak-website-hunt.md" ] && [ "$n" = 3 ] && [ "$stale_n" = 0 ]; then
  ok "5: stale_breach first, cap 3 respected, no stale deferred"
else bad "5: first=$first n=$n stale_deferred=$stale_n"; fi
order=$(echo "$sel" | python3 -c "import json,sys; print(' '.join(s['band'] for s in json.load(sys.stdin)['selected']))")
[ "$order" = "stale_breach urgent high" ] && ok "5: band order stale_breach>urgent>high" || bad "5: band order '$order'"
python3 $T/distill-sweep.py --queue | python3 -c "
import json,sys
q={i['file']:i for i in json.load(sys.stdin)}
assert not q['20260916-110000-j-clowning-pattern-mining.md']['eligible'], 'j must be excluded'
print('ok: 5b: out-of-scope brief excluded from distill')" || bad "5b: j/k exclusion"

# --- 6: live read-only check against production state ---
unset META_INTEL_LEDGER TANDEM_QUARANTINE_DIR META_INTEL_DIR DISTILL_NOW
out=$(python3 $T/next-brief.py 2>$WORK/err6); code=$?
if [ "$out" = "d-segment-deep-dive" ] && [ "$code" = 0 ]; then ok "6: production rotation now yields d-segment-deep-dive (c quarantined)"; else bad "6: got '$out' exit $code"; fi
python3 $T/brief-lifecycle.py --state c-review-complaint-signals | grep -q QUARANTINED \
  && ok "6: production lifecycle state of c is QUARANTINED" || bad "6: c state wrong"
python3 $T/distill-sweep.py --select --cap 5 | python3 -c "
import json,sys; d=json.load(sys.stdin)
assert d['eligible_total']==0, d
print('ok: 6b: production distill queue drained (all answers processed)') " || bad "6b: production queue not drained"

echo "---"
echo "passed=$PASS failed=$FAIL"
[ "$FAIL" = 0 ]
