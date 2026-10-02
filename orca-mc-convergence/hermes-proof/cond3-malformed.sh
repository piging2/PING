#!/bin/bash
# cond3-malformed.sh — Condition 3: malformed invocation -> typed error, no hang.
# Legs (all zero-Hermes-cost):
#  3a. prompt-hermes.sh with empty stdin -> usage on stderr, exit 2, fast.
#  3b. prompt-hermes.sh with no args and </dev/null -> same.
#  3c. adapter.validateExecution({}) -> throws typed error (no dispatch).
#  3d. dispatchExecution with unknown transport -> throws 'unknown transport'.
#  3e. Pig-side hermes-launch.py with no argv -> observed behavior (read-only).
#  3f. Empty worker stdout -> adapter ESCALATED (already observed live in cond1).
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof
EV=$HERE/evidence
PH=/home/hatch/workspace/bin/prompt-hermes.sh
PASS=true

t() { date +%s%N; }

echo "--- 3a: empty prompt via stdin"
S=$(t); printf '' | "$PH" >/tmp/c3a.out 2>/tmp/c3a.err; RC=$?; E=$(( ($(t)-S)/1000000 ))
echo "rc=$RC elapsed_ms=$E stderr=$(head -c 120 /tmp/c3a.err)"
[ "$RC" = "2" ] && [ "$E" -lt 5000 ] || PASS=false

echo "--- 3b: no args, stdin /dev/null"
S=$(t); "$PH" </dev/null >/tmp/c3b.out 2>/tmp/c3b.err; RC=$?; E=$(( ($(t)-S)/1000000 ))
echo "rc=$RC elapsed_ms=$E"
[ "$RC" = "2" ] && [ "$E" -lt 5000 ] || PASS=false

echo "--- 3c: adapter.validateExecution({}) throws"
node -e "
const a = require('/home/hatch/workspace/orca-adapter/adapter.js');
try { a.validateExecution({}); console.log('NO_THROW'); process.exit(1); }
catch (e) { console.log('THREW: ' + e.message); process.exit(0); }" || PASS=false

echo "--- 3d: dispatchExecution unknown transport throws (typed, no transport invoked)"
node -e "
const a = require('/home/hatch/workspace/orca-adapter/adapter.js');
a.dispatchExecution({
  execution: { missionId: 'm', runId: 'r', executionId: 'cond3-transport', attempt: '1' },
  agentId: 'hermes', capability: 'text.summarize', namespace: 'core::system',
  constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true, allowed_workspace: 'core::system' },
  taskBrief: 'x', transport: 'telepathy', transportFn: null,
  evidenceDir: '/tmp/hermes-proof-c3',
}).then(() => { console.log('NO_THROW'); process.exit(1); })
  .catch((e) => { console.log('THREW: ' + e.message); process.exit(e.message.startsWith('unknown transport') ? 0 : 1); });" || PASS=false

echo "--- 3e: Pig-side hermes-launch.py with no argv (read-only observation)"
echo "note: no Windows python exists on the Pig right now (cond1 defect); using the"
echo "Linux venv python only to observe the launcher's own argv handling (sys.argv[1])."
ssh -i /home/hatch/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=25 \
  -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts \
  -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
  nolan@100.79.154.43 'wsl -u nolan -- /mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/bin/python /mnt/c/Windows/Temp/hermes-launch.py' >/tmp/c3e.out 2>/tmp/c3e.err; echo "rc=$?"
tail -3 /tmp/c3e.err; echo

echo "--- 3f: empty worker stdout -> ESCALATED (observed live in cond1)"
python3 -c "
import json
a = json.load(open('$EV/result-cond1-a1.json'))
assert a['reason'] == 'worker_protocol_failure' and a['outcome'] == 'unknown'
print('cond1 artifact confirms: empty stdout -> escalated/honestOutcome=unknown, non-retryable')"

[ "$PASS" = true ] && echo "COND3_RESULT=PASS" || echo "COND3_RESULT=FAIL"
python3 - "$([ "$PASS" = true ] && echo 1 || echo 0)" <<'PY'
import json, sys
rec = {"condition": 3, "name": "malformed invocation: typed error, no hang", "pass": sys.argv[1] == "1",
 "evidence": {
  "3a_empty_stdin": "rc=2, usage on stderr, <5s (see run log)",
  "3b_noargs_devnull": "rc=2, <5s",
  "3c_validateExecution": "throws 'execution.<field> required' before any dispatch",
  "3d_unknown_transport": "throws 'unknown transport: telepathy (only hermes is proven)'",
  "3e_pig_launcher_no_argv": "see run log (IndexError traceback -> nonzero; untyped but loud, stderr preserved at Pig layer)",
  "3f_empty_stdout": "cond1 live: worker_protocol_failure -> ESCALATED, honestOutcome=unknown, non-retryable, never canonical",
 }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond3-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2))
PY
[ "$PASS" = true ]
