#!/usr/bin/env bash
# P5: DROP TARGETS. The results directory is deleted mid-run -> the worker must
# fail typed (ENOENT, exit 3, never silent). Resume recreates the target,
# detects any checkpoint/file gap explicitly in the gaps log, replays, and
# converges to a complete, valid file with the loss documented.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$HERE/work-r2/p5"
rm -rf "$W"; mkdir -p "$W"
PASS=0; FAIL=0
note() { if [ "$2" = "ok" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; echo "[$2] $1"; }

# ---- Chaos: drop the entire target directory mid-run ----
R="$W/results.jsonl"
node "$HERE/r2-appender.ts" --results "$R" --from 1 --to 120 --attempt 1 --shard "p5" > "$W/run1.out" 2> "$W/run1.err" &
WPID=$!
# Synchronize: wait until the worker is genuinely mid-run (node .ts startup is
# slow; dropping before first write would miss the worker entirely).
STARTED=0
for i in $(seq 1 150); do
  if [ -f "$R" ] && [ "$(wc -l < "$R")" -ge 10 ]; then STARTED=1; break; fi
  if ! kill -0 "$WPID" 2>/dev/null; then break; fi  # worker already exited
  sleep 0.1
done
if [ "$STARTED" = "1" ]; then
  rm -rf "$W"          # the target is gone; do NOT recreate it: the worker must hit ENOENT
else
  echo "WARN: worker was not mid-run when the drop was due (started=$STARTED)"
fi
wait "$WPID" 2>/dev/null; RC=$?
note "P5-1 worker failed typed on dropped target (rc=$RC, want 3)" "$([ $RC -eq 3 ] && echo ok || echo FAIL)"
mkdir -p "$W"  # recreate work dir for the remaining steps (results.jsonl stays gone)

# ---- Deterministic typed-error proof (parent path is a file, stderr kept) ----
touch "$W/blocker"
node "$HERE/r2-appender.ts" --results "$W/blocker/results.jsonl" --from 1 --to 1 --attempt 1 > "$W/typed.out" 2> "$W/typed.err"; TRC=$?
TERR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$W/typed.err','utf8').trim().split('\n').pop()).error)" 2>/dev/null)
note "P5-2 unwritable target -> typed error, non-zero (rc=$TRC error=$TERR)" \
  "$([ $TRC -eq 3 ] && [ -n "$TERR" ] && echo ok || echo FAIL)"

# ---- Resume after the drop converges to a complete, valid file ----
node "$HERE/r2-appender.ts" --results "$W/results.jsonl" --from 1 --to 120 --attempt 2 --shard "p5" > "$W/resume.out" 2> "$W/resume.err"
RRC=$?
note "P5-3 resume exited 0 (rc=$RRC)" "$([ $RRC -eq 0 ] && echo ok || echo FAIL)"

python3 - "$W/results.jsonl" > "$W/resume_verify.log" 2>&1 <<'EOF'
import json, sys
p = sys.argv[1]
seqs, attempts = [], set()
with open(p) as f:
    for i, line in enumerate(f, 1):
        rec = json.loads(line)  # raises if any line is not valid JSONL
        seqs.append(rec["seq"]); attempts.add(rec["attempt"])
ok = seqs == list(range(1, 121)) and attempts == {2}
print("RESUME_FILE_OK" if ok else f"RESUME_FILE_BAD count={len(seqs)} attempts={attempts}")
EOF
cat "$W/resume_verify.log"
if grep -q "RESUME_FILE_OK" "$W/resume_verify.log"; then
  note "P5-4 resumed file: valid JSONL, seqs exactly 1..120, single attempt incarnation" "ok"
else
  note "P5-4 resumed file verification FAILED" "FAIL"
fi

# ---- Gap-detection unit proof: checkpoint ahead of file -> explicit record ----
mkdir -p "$W/gap"
node -e "
const fs=require('fs');
fs.writeFileSync('$W/gap/results.jsonl.checkpoint.json', JSON.stringify({last_seq: 50, attempt: 1})+'\n');
fs.writeFileSync('$W/gap/results.jsonl', Array.from({length: 20}, (_,i)=>JSON.stringify({seq:i+1})).join('\n')+'\n');
"
node "$HERE/r2-appender.ts" --results "$W/gap/results.jsonl" --from 1 --to 60 --attempt 2 --shard "p5gap" > "$W/gap.out" 2>&1
GAPINFO=$(node -e "
const r = JSON.parse(require('fs').readFileSync('$W/gap/results.jsonl.gaps.jsonl','utf8').split('\n')[0]);
console.log(r.type + ' lost=' + r.lost_records);
" 2>/dev/null || echo "none")
note "P5-5 checkpoint/file gap detected and logged explicitly ($GAPINFO)" \
  "$([ "$GAPINFO" = "GAP_DETECTED lost=30" ] && echo ok || echo FAIL)"

VERDICT="PASS"; [ $FAIL -eq 0 ] || VERDICT="FAIL"
cat > "$W/verdict.json" <<EOF
{"probe": "P5 drop targets", "verdict": "$VERDICT", "checks_passed": $PASS, "checks_failed": $FAIL}
EOF
echo "P5 verdict: $VERDICT ($PASS passed, $FAIL failed)"
[ "$VERDICT" = "PASS" ]
