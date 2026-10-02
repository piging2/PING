#!/usr/bin/env bash
# P1: DUPLICATE JOB SAFETY. Same job twice -> one execution.
#
# P1a (real machinery): compilation/runner/enqueue.js submitted twice with
# identical inputs -> zero new manifest lines, terminal statuses preserved.
# P1b (concurrent): two runners race one pending job -> atomic claim lets
# exactly one execute; the loser joins and executes nothing.
# P1c (crash): winner runner kill -9'd mid-worker -> resume reclaims the stale
# claim, re-executes, converges to exactly one committed result with
# content-identical digest (attempts accounting records the retry).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ENQ="$HERE/../compilation/runner/enqueue.js"
W="$HERE/work-r2/p1"
rm -rf "$W"; mkdir -p "$W/fix"
PASS=0; FAIL=0
note() { if [ "$2" = "ok" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; echo "[$2] $1"; }

echo '{"synthetic": true, "testing_only": true, "note": "chaos probe fixture"}' > "$W/fix/probe-fixture.json"

# ---------------- P1a: duplicate enqueue ----------------
node "$ENQ" --fixtures-dir "$W/fix" --out "$W/manifest.jsonl" --seeds 0,7 > "$W/enq1.log" 2>&1
LINES1=$(wc -l < "$W/manifest.jsonl")
note "P1a-1 first enqueue produced 2 jobs (lines=$LINES1)" "$([ "$LINES1" = "2" ] && echo ok || echo FAIL)"

# Simulate both jobs executed to done.
node -e "
const fs=require('fs');
const p='$W/manifest.jsonl';
const jobs=fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
jobs.forEach(j=>{j.status='done';j.updated_at=new Date().toISOString();});
fs.writeFileSync(p, jobs.map(j=>JSON.stringify(j)).join('\n')+'\n');
"
cp "$W/manifest.jsonl" "$W/manifest.done.jsonl"

# Duplicate submission: identical inputs.
node "$ENQ" --fixtures-dir "$W/fix" --out "$W/manifest.jsonl" --seeds 0,7 > "$W/enq2.log" 2>&1
if diff -q "$W/manifest.done.jsonl" "$W/manifest.jsonl" >/dev/null; then
  note "P1a-2 duplicate enqueue: manifest byte-identical, done statuses preserved" "ok"
else
  note "P1a-2 duplicate enqueue CHANGED the manifest" "FAIL"; diff "$W/manifest.done.jsonl" "$W/manifest.jsonl" | head -5
fi

# Enqueue with one added seed: only the new job is added.
node "$ENQ" --fixtures-dir "$W/fix" --out "$W/manifest.jsonl" --seeds 0,7,42 > "$W/enq3.log" 2>&1
LINES3=$(wc -l < "$W/manifest.jsonl")
DONE3=$(grep -c '"status":"done"' "$W/manifest.jsonl")
note "P1a-3 added seed: exactly 1 new job (lines=$LINES3), done preserved (done=$DONE3)" \
  "$([ "$LINES3" = "3" ] && [ "$DONE3" = "2" ] && echo ok || echo FAIL)"

# ---------------- P1b: concurrent double dispatch ----------------
B="$W/race"; mkdir -p "$B"
node "$ENQ" --fixtures-dir "$W/fix" --out "$B/manifest.jsonl" --seeds 0 > /dev/null 2>&1
JOB=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/manifest.jsonl','utf8').split('\n')[0]).job_id)")
node "$HERE/r2-runner.ts" --manifest "$B/manifest.jsonl" --results-dir "$B/results" \
  --exec-log "$B/exec.log" --worker "$HERE/r2-p1-worker.ts" --id "runner-A" --claims-dir "$B/claims" > "$B/A.log" 2>&1 &
PA=$!
node "$HERE/r2-runner.ts" --manifest "$B/manifest.jsonl" --results-dir "$B/results" \
  --exec-log "$B/exec.log" --worker "$HERE/r2-p1-worker.ts" --id "runner-B" --claims-dir "$B/claims" > "$B/B.log" 2>&1 &
PB=$!
wait $PA; RA=$?; wait $PB; RB=$?
EXECCOUNT=$(wc -l < "$B/exec.log" 2>/dev/null || echo 0)
RESCOUNT=$(ls "$B/results"/*.json 2>/dev/null | wc -l)
STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/manifest.jsonl','utf8').split('\n')[0]).status)")
JOINED=$(grep -l "executed nothing" "$B"/*.log 2>/dev/null | wc -l)
note "P1b-1 both runners exited clean (rc=$RA,$RB)" "$([ $RA -eq 0 ] && [ $RB -eq 0 ] && echo ok || echo FAIL)"
note "P1b-2 exactly ONE execution record (exec.log lines=$EXECCOUNT)" "$([ "$EXECCOUNT" = "1" ] && echo ok || echo FAIL)"
note "P1b-3 exactly one result file (count=$RESCOUNT), job done (status=$STATUS)" \
  "$([ "$RESCOUNT" = "1" ] && [ "$STATUS" = "done" ] && echo ok || echo FAIL)"
note "P1b-4 loser joined without executing (join notices=$JOINED)" "$([ "$JOINED" -ge 1 ] && echo ok || echo FAIL)"
DIGEST_B=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/results/$JOB.json','utf8')).work_digest)")
echo "$DIGEST_B" > "$W/digest.clean"

# Sequential re-run of a drained queue: no-op.
node "$HERE/r2-runner.ts" --manifest "$B/manifest.jsonl" --results-dir "$B/results" \
  --exec-log "$B/exec.log" --worker "$HERE/r2-p1-worker.ts" --id "runner-C" --claims-dir "$B/claims" > "$B/C.log" 2>&1
EXECCOUNT2=$(wc -l < "$B/exec.log")
note "P1b-5 re-run of drained queue executed nothing (exec lines still $EXECCOUNT2)" \
  "$([ "$EXECCOUNT2" = "1" ] && echo ok || echo FAIL)"

# ---------------- P1c: winner killed mid-worker, resume converges ----------------
C="$W/crash"; mkdir -p "$C"
node "$ENQ" --fixtures-dir "$W/fix" --out "$C/manifest.jsonl" --seeds 0 > /dev/null 2>&1
node "$HERE/r2-runner.ts" --manifest "$C/manifest.jsonl" --results-dir "$C/results" \
  --exec-log "$C/exec.log" --worker "$HERE/r2-p1-worker.ts" --id "runner-K" --claims-dir "$C/claims" > "$C/K.log" 2>&1 &
PK=$!
# Wait until the worker actually started executing, then SIGKILL the runner (not the worker).
for i in $(seq 1 100); do [ -d "$C/claims/$JOB" ] && break; sleep 0.05; done
sleep 0.15
kill -9 $PK 2>/dev/null; wait $PK 2>/dev/null
# The orphaned worker may still finish its atomic result write; now resume.
sleep 0.5
node "$HERE/r2-runner.ts" --manifest "$C/manifest.jsonl" --results-dir "$C/results" \
  --exec-log "$C/exec.log" --worker "$HERE/r2-p1-worker.ts" --id "runner-R" --claims-dir "$C/claims" > "$C/R.log" 2>&1
RR=$?
RESCOUNT_C=$(ls "$C/results"/*.json 2>/dev/null | wc -l)
STATUS_C=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$C/manifest.jsonl','utf8').split('\n')[0]).status)")
DIGEST_C=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$C/results/$JOB.json','utf8')).work_digest)")
DIGEST_CLEAN=$(cat "$W/digest.clean")
note "P1c-1 resume exited clean (rc=$RR)" "$([ $RR -eq 0 ] && echo ok || echo FAIL)"
note "P1c-2 exactly one committed result (files=$RESCOUNT_C), job done (status=$STATUS_C)" \
  "$([ "$RESCOUNT_C" = "1" ] && [ "$STATUS_C" = "done" ] && echo ok || echo FAIL)"
note "P1c-3 re-execution content-identical (digest match: ${DIGEST_C:0:12} vs ${DIGEST_CLEAN:0:12})" \
  "$([ "$DIGEST_C" = "$DIGEST_CLEAN" ] && echo ok || echo FAIL)"

VERDICT="PASS"; [ $FAIL -eq 0 ] || VERDICT="FAIL"
cat > "$W/verdict.json" <<EOF
{"probe": "P1 duplicate job safety", "verdict": "$VERDICT", "checks_passed": $PASS, "checks_failed": $FAIL}
EOF
echo "P1 verdict: $VERDICT ($PASS passed, $FAIL failed)"
[ "$VERDICT" = "PASS" ]
