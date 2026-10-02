#!/bin/bash
# LANE-D independent crash-window proof.
# Phase 1: coordinator stand-in -> dispatcher -> mid-flight executor.
# The executor performs ONE physical effect, then hangs mid-flight.
# Controller SIGKILLs the EXECUTOR mid-flight plus the dispatcher and the
# coordinator (dispatcher dead, no rendezvous = indeterminate dispatch).
# Phase 2: restart -> REAL reconcileStartup() from the REAL loop source.
# Asserts: OUTCOME_UNKNOWN + blocked, zero re-dispatch, zero emits,
# exactly ONE physical effect; second restart proves no resurrection.
set -u
TDIR=/home/nolan/orca-crash-test/20260925-laneD
CP=/home/nolan/worktrees/orca-autonomy/orca/control-loop/crash-proof
EVIDDIR=/home/nolan/worktrees/orca-autonomy/orca/control-loop/evidence
SCRATCH="$TDIR/data"
rm -rf "$SCRATCH"; mkdir -p "$SCRATCH"
MARKER="$SCRATCH/effects.log"
FAIL=0

ls "$EVIDDIR" > "$SCRATCH/evid-before.txt" 2>/dev/null || true

node "$TDIR/spawn.js" "$SCRATCH" "$MARKER" > "$SCRATCH/spawn.json" 2> "$SCRATCH/spawn.err" &
DRIVER=$!
for i in $(seq 1 100); do
  [ -f "$MARKER" ] && [ "$(wc -l < "$MARKER" 2>/dev/null)" -ge 1 ] && break
  sleep 0.2
done
if [ ! -f "$MARKER" ]; then echo 'SETUP-FAIL: no effect marker'; cat "$SCRATCH/spawn.err"; kill -9 $DRIVER 2>/dev/null; exit 1; fi
DISP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).dispatcherPid)")
WO=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).woId)")
OBJ=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).objectiveId)")
ATTEMPT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).attemptId)")
WORKER=$(cat "$SCRATCH/worker.pid")
for p in $DRIVER $DISP $WORKER; do kill -0 $p 2>/dev/null || { echo "SETUP-FAIL: pid $p not alive pre-kill"; exit 1; }; done
echo "dispatch: wo=$WO"
echo "dispatch: attempt=$ATTEMPT"
echo "pids: coordinator=$DRIVER dispatcher=$DISP executor=$WORKER"
echo "effect observed (boundary crossed): $(cat "$MARKER")"
sleep 1 # executor mid-flight
KILL_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "KILL POINT: $KILL_AT — SIGKILL executor(mid-flight)=$WORKER dispatcher=$DISP coordinator=$DRIVER"
kill -9 $WORKER 2>/dev/null
kill -9 $DISP 2>/dev/null
kill -9 $DRIVER 2>/dev/null
sleep 1
for p in $WORKER $DISP $DRIVER; do
  if [ -d "/proc/$p" ]; then echo "KILL-FAIL: pid $p still alive"; FAIL=1; else echo "dead confirmed: pid $p"; fi
done
wait $DRIVER 2>/dev/null
echo "effects observed before restart: $(wc -l < "$MARKER")"

node "$CP/driver.js" reconcile "$SCRATCH" "$OBJ" "$WO" "$MARKER" > "$SCRATCH/reconcile1.json" 2> "$SCRATCH/reconcile1.err"
echo "reconcile-1 exit: $?"
node "$CP/driver.js" reconcile "$SCRATCH" "$OBJ" "$WO" "$MARKER" > "$SCRATCH/reconcile2.json" 2> "$SCRATCH/reconcile2.err"
echo "reconcile-2 exit: $?"

node -e "
const fs = require('fs');
const S = '$SCRATCH';
const r1 = JSON.parse(fs.readFileSync(S + '/reconcile1.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync(S + '/reconcile2.json', 'utf8'));
let fail = 0;
const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + n + (c ? '' : ' :: ' + JSON.stringify(d))); if (!c) fail++; };
check('L-1 state is OUTCOME_UNKNOWN (not FAILED, not AUTHORIZED)', r1.state === 'OUTCOME_UNKNOWN', r1.state);
check('L-2 work order is blocked', r1.blocked === true, r1.blocked);
check('L-3 block classification POST_BOUNDARY_UNKNOWN', r1.blockEntry && r1.blockEntry.classification === 'POST_BOUNDARY_UNKNOWN', r1.blockEntry && r1.blockEntry.classification);
check('L-4 attempt recorded as DISPATCH_LOST_UNKNOWN', (r1.attemptHistory || []).some(a => a.outcome === 'DISPATCH_LOST_UNKNOWN'), r1.attemptHistory);
check('L-5 no rendezvous collected', r1.blockEntry && r1.blockEntry.rendezvous_collected === false, r1.blockEntry);
check('L-6 zero canonical emits on reconcile', r1.emits === 0, r1.emits);
check('L-7 exactly ONE physical effect', r1.effectCount === 1, r1.effectCount);
check('L-8 no new attempt dispatched (attempt_history length still 1)', (r1.attemptHistory || []).length === 1, (r1.attemptHistory || []).length);
check('L-9 second restart: still OUTCOME_UNKNOWN', r2.state === 'OUTCOME_UNKNOWN', r2.state);
check('L-10 second restart: still blocked, same block entry (no resurrection)', r2.blocked === true && r2.blockEntry && r2.blockEntry.blocked_at === r1.blockEntry.blocked_at, r2.blockEntry && r2.blockEntry.blocked_at);
check('L-11 second restart: still exactly ONE effect', r2.effectCount === 1, r2.effectCount);
check('L-12 dispatch_pid cleared (no live-dispatch confusion)', r1.dispatchPid === null, r1.dispatchPid);
check('L-13 terminal record honest', r1.terminal && r1.terminal.status === 'outcome-unknown', r1.terminal);
process.exit(fail ? 1 : 0);
" || FAIL=1

echo '--- guard + evidence checks (real modules, durable files) ---'
node -e "
const path = require('path');
const CD = '/home/nolan/worktrees/orca-autonomy/orca/control-loop';
const rt = require(path.join(CD, 'objective-runtime.js'));
const u = require(path.join(CD, 'orca_unknown_block.js'));
const fs = require('fs');
const S = '$SCRATCH';
const OBJ = $(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).objectiveId))");
const WO = $(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$SCRATCH/spawn.json','utf8')).woId))");
let fail = 0;
const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + n + (c ? '' : ' :: ' + JSON.stringify(d))); if (!c) fail++; };
check('L-14 blocked id not auto-claimable (isWorkOrderBlocked)', u.isWorkOrderBlocked(rt, S, OBJ, WO) === true, null);
check('L-15 OUTCOME_UNKNOWN terminal for automatic paths', u.isTerminalWorkOrderState('OUTCOME_UNKNOWN') === true, null);
const doc = u.loadBlocked(rt, S, OBJ);
check('L-16 no automatic operator decision recorded (decisions log empty)', Array.isArray(doc.decisions) && doc.decisions.length === 0, doc.decisions);
const dwo = rt.loadWorkOrder(S, OBJ, WO);
check('L-17 durable state OUTCOME_UNKNOWN, attempt_count still 1', dwo.state === 'OUTCOME_UNKNOWN' && dwo.attempt_count === 1, { state: dwo.state, attempt_count: dwo.attempt_count });
process.exit(fail ? 1 : 0);
" || FAIL=1

echo '--- reconcile evidence files (new run dirs) ---'
ls "$EVIDDIR" > "$SCRATCH/evid-after.txt" 2>/dev/null || true
comm -13 <(sort "$SCRATCH/evid-before.txt") <(sort "$SCRATCH/evid-after.txt") > "$SCRATCH/evid-new.txt" || true
cat "$SCRATCH/evid-new.txt"
for d in $(cat "$SCRATCH/evid-new.txt"); do
  if [ -f "$EVIDDIR/$d/reconcile-startup.json" ]; then
    cp "$EVIDDIR/$d/reconcile-startup.json" "$SCRATCH/reconcile-startup-$d.json"
    echo "--- $d/reconcile-startup.json workOrders:"
    node -e "const r=require('$SCRATCH/reconcile-startup-$d.json'); console.log(JSON.stringify(r.workOrders, null, 1));"
  fi
done

echo "physical effects at end: $(wc -l < "$MARKER")"
[ "$(wc -l < "$MARKER")" -eq 1 ] || { echo 'FAIL duplicate physical effects'; FAIL=1; }
[ "$FAIL" -eq 0 ] && echo 'LANE-D-CRASH-WINDOW: ALL GREEN' || echo 'LANE-D-CRASH-WINDOW: FAILURES PRESENT'
exit $FAIL
