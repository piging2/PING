#!/usr/bin/env bash
# P6: FLAKY UPSTREAM + CRASH MID-BATCH. 500s, 429s (Retry-After), timeouts and
# DNS errors hit per a deterministic schedule; one mission always fails.
# The worker is SIGKILLed mid-batch; resume must finish the batch with every
# mission recorded exactly once, bounded attempts, typed failures.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$HERE/work-r2/p6"
rm -rf "$W"; mkdir -p "$W"
PASS=0; FAIL=0
note() { if [ "$2" = "ok" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; echo "[$2] $1"; }

R="$W/results.jsonl"
node "$HERE/r2-flaky.ts" --results "$R" --from 1 --to 40 --die-after 17 > "$W/run1.out" 2>&1 &
WPID=$!
# Wait for the SIGKILL to land (worker dies on its own right after mission 17).
wait "$WPID" 2>/dev/null; RC=$?
note "P6-1 worker SIGKILLed mid-batch (rc=$RC)" "$([ $RC -eq 137 ] && echo ok || echo FAIL)"

node "$HERE/r2-flaky.ts" --results "$R" --from 1 --to 40 > "$W/run2.out" 2>&1; RRC=$?
note "P6-2 resume exited 0 (rc=$RRC)" "$([ $RRC -eq 0 ] && echo ok || echo FAIL)"

python3 - "$R" > "$W/verify.log" 2>&1 <<'EOF'
import json, sys
p = sys.argv[1]
recs = []
with open(p) as f:
    for i, line in enumerate(f, 1):
        if not line.strip():
            print(f"FAIL: blank line {i}"); continue
        try:
            recs.append(json.loads(line))  # raises if not valid JSONL
        except Exception as e:
            print(f"FAIL: line {i} invalid JSON: {e}")
missions = [r["mission"] for r in recs]
by_id = {r["mission"]: r for r in recs}
ok = True
def check(cond, msg):
    global ok
    print(("ok " if cond else "FAIL ") + msg)
    ok = ok and cond
check(sorted(missions) == list(range(1, 41)), f"40 missions recorded exactly once (got {len(missions)})")
check(by_id[25]["outcome"] == "FAILED" and by_id[25]["attempts"] == 3 and by_id[25]["error_type"] == "upstream:e500",
      f"mission 25 typed failure: {by_id[25]}")
# fault schedule expectations: m%10==7 -> 3 attempts; ==3,9,5 -> 2 attempts; else 1 (25 already covered)
exp = {}
for m in range(1, 41):
    if m == 25: exp[m] = 3
    elif m % 10 == 7: exp[m] = 3
    elif m % 10 in (3, 9, 5): exp[m] = 2
    else: exp[m] = 1
bad = [m for m in exp if by_id[m]["attempts"] != exp[m]]
check(not bad, f"attempt counts match fault schedule (mismatches: {bad[:5]})")
check(all(r["outcome"] == "GENERATED" for m, r in by_id.items() if m != 25),
      "all non-25 missions GENERATED (no crash, no silent drop)")
print("VERIFY_ALL_OK" if ok else "VERIFY_FAILED")
EOF
cat "$W/verify.log"
if grep -q "VERIFY_ALL_OK" "$W/verify.log"; then note "P6-3 batch converged: exact-once, bounded attempts, typed failure" "ok";
else note "P6-3 verification FAILED" "FAIL"; fi

# No retry storm: total upstream calls bounded (<= 3 per mission).
CALLS=$(python3 -c "
import json
recs=[json.loads(l) for l in open('$R') if l.strip()]
print(sum(r['attempts'] for r in recs))")
note "P6-4 total upstream attempts bounded ($CALLS for 40 missions, max 120)" \
  "$([ "$CALLS" -le 120 ] && [ "$CALLS" -gt 40 ] && echo ok || echo FAIL)"

VERDICT="PASS"; [ $FAIL -eq 0 ] || VERDICT="FAIL"
cat > "$W/verdict.json" <<EOF
{"probe": "P6 flaky upstream + crash mid-batch", "verdict": "$VERDICT", "checks_passed": $PASS, "checks_failed": $FAIL}
EOF
echo "P6 verdict: $VERDICT ($PASS passed, $FAIL failed)"
[ "$VERDICT" = "PASS" ]
