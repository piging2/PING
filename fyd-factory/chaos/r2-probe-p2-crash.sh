#!/usr/bin/env bash
# P2: WORKER CRASH RECOVERY. kill -9 mid-append -> resume loses nothing,
# results.jsonl stays valid JSONL.
#
# Scenario A (deterministic torn write): worker writes half a record, fsyncs,
# then SIGKILLs itself. Resume must truncate the torn tail and continue.
# Scenario B (external kill -9): driver kills the worker at an arbitrary
# moment. Resume must converge to the same final state.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$HERE/work-r2/p2"
rm -rf "$W"; mkdir -p "$W/A" "$W/B"
PASS=0; FAIL=0
note() { if [ "$2" = "ok" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; echo "[$2] $1"; }

# ---- Scenario A: deterministic torn write + self SIGKILL ----
R="$W/A/results.jsonl"
node "$HERE/r2-appender.ts" --results "$R" --from 1 --to 60 --die-at 37 --die-mode partial --attempt 1 --shard "p2a" > "$W/A/run1.out" 2> "$W/A/run1.err"
RC=$?
note "A1 worker died by SIGKILL (rc=$RC)" "$([ $RC -eq 137 ] && echo ok || echo FAIL)"
TAIL_OK="no"
[ -n "$(tail -c 1 "$R" | tr -d '\n')" ] && TAIL_OK="yes-partial-tail-present" || TAIL_OK="no"
note "A2 torn tail present after kill (no trailing newline)" "$([ "$TAIL_OK" = "yes-partial-tail-present" ] && echo ok || echo FAIL)"

node "$HERE/r2-appender.ts" --results "$R" --from 1 --to 60 --attempt 2 --shard "p2a" > "$W/A/run2.out" 2> "$W/A/run2.err"
RC=$?
note "A3 resume exited 0 (rc=$RC)" "$([ $RC -eq 0 ] && echo ok || echo FAIL)"
REPAIRED=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$W/A/run2.out','utf8')).repaired_bytes)")
note "A4 resume repaired torn bytes (repaired_bytes=$REPAIRED > 0)" "$([ "$REPAIRED" -gt 0 ] && echo ok || echo FAIL)"

# ---- Scenario B: external kill -9 at an arbitrary moment ----
R="$W/B/results.jsonl"
node "$HERE/r2-appender.ts" --results "$R" --from 1 --to 200 --attempt 1 --shard "p2b" > "$W/B/run1.out" 2>&1 &
WPID=$!
sleep 0.4
kill -9 "$WPID" 2>/dev/null
wait "$WPID" 2>/dev/null; RC=$?
note "B1 external kill -9 landed (rc=$RC)" "$([ $RC -eq 137 ] && echo ok || echo FAIL)"

node "$HERE/r2-appender.ts" --results "$R" --from 1 --to 200 --attempt 2 --shard "p2b" > "$W/B/run2.out" 2> "$W/B/run2.err"
RC=$?
note "B2 resume after external kill exited 0 (rc=$RC)" "$([ $RC -eq 0 ] && echo ok || echo FAIL)"

# ---- Verification (both scenarios): valid JSONL, seqs exactly 1..N, no dupes ----
python3 - "$W" > "$W/verify.log" 2>&1 <<'EOF'
import json, sys
w = sys.argv[1]
ok = True
for scen, n in (("A", 60), ("B", 200)):
    p = f"{w}/{scen}/results.jsonl"
    seqs = []
    with open(p) as f:
        for i, line in enumerate(f, 1):
            if not line.strip():
                print(f"FAIL {scen}: blank line {i}"); ok = False; continue
            try:
                rec = json.loads(line)
            except Exception as e:
                print(f"FAIL {scen}: line {i} not valid JSON: {e}"); ok = False; continue
            seqs.append(rec["seq"])
    if seqs != list(range(1, n + 1)):
        missing = sorted(set(range(1, n + 1)) - set(seqs))
        dupes = sorted(s for s in set(seqs) if seqs.count(s) > 1)
        print(f"FAIL {scen}: seqs != 1..{n} missing={missing[:5]} dupes={dupes[:5]} count={len(seqs)}")
        ok = False
    else:
        print(f"ok {scen}: {n} records, seqs exactly 1..{n}, every line valid JSON, no duplicates")
print("VERIFY_ALL_OK" if ok else "VERIFY_FAILED")
EOF
cat "$W/verify.log"
if grep -q "VERIFY_ALL_OK" "$W/verify.log"; then note "V python verification: valid JSONL, exact seqs, no dupes" "ok"; else note "V python verification FAILED" "FAIL"; fi

VERDICT="PASS"; [ $FAIL -eq 0 ] || VERDICT="FAIL"
cat > "$W/verdict.json" <<EOF
{"probe": "P2 worker crash recovery (kill -9 mid-append)", "verdict": "$VERDICT", "checks_passed": $PASS, "checks_failed": $FAIL}
EOF
echo "P2 verdict: $VERDICT ($PASS passed, $FAIL failed)"
[ "$VERDICT" = "PASS" ]
