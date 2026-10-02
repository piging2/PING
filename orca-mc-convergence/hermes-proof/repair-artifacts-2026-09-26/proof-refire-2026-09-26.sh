#!/bin/bash
# proof-refire-2026-09-26.sh — re-fire the 8-condition Hermes proof AFTER the
# P2 bridge repair (DEFECT-1 + DEFECT-2 closed, caveats 1-2 reconciled).
#
# The original cond2/cond5/cond6/cond8 scripts encode the PRE-repair state as
# assertions (they expect the cond1 127 artifact / missing venv / effect gap),
# so they report FAIL on stale expectations even though every live leg passes.
# This runner re-asserts each condition against the REPAIRED state.
# cond1/cond3/cond4/cond7 originals are state-independent and were re-run
# directly (cond1 now PASS exit 0; cond3/cond4/cond7 PASS).
# Harmless prompts only; no live effectful fire (same contract as the lane).
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof
EV=$HERE/evidence
OUTDIR=/tmp/hermes-repair/proof-refire
mkdir -p "$OUTDIR"
pig_ssh() {
  ssh -i /home/hatch/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=25 \
    -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts \
    -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
    nolan@100.79.154.43 "$@"
}
PASS_ALL=true
note() { echo "$1"; }

echo "=== COND2-RE (nonzero exit: exact code captured, no silent swallowing) ==="
C2=true
RC1=$(pig_ssh 'wsl -u nolan -- false' >/dev/null 2>&1; echo $?)
[ "$RC1" = "1" ] && note "2a channel exact code: wsl -- false -> ssh rc=1 PASS" || { note "2a FAIL rc=$RC1"; C2=false; }
LASTLINE=$(grep -v '^[[:space:]]*$' /home/hatch/workspace/bin/prompt-hermes.sh | tail -1)
case "$LASTLINE" in
  *NOLAN*"'wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh'"*)
    note "2b tail-call: script exit = ssh exit (persistent bridge path) PASS" ;;
  *) note "2b FAIL: $LASTLINE"; C2=false ;;
esac
grep -q '^set -u$' /home/hatch/workspace/bin/prompt-hermes.sh && ! grep -q '^set -e' /home/hatch/workspace/bin/prompt-hermes.sh \
  && note "2b set -u only, no set -e (no mangling) PASS" || { note "2b set flags FAIL"; C2=false; }
node -e "
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
(async () => {
  const r = await adapter.dispatchExecution({
    execution: { missionId: 'hermes-proof', runId: 'refire', executionId: 'c2re', attempt: '1' },
    agentId: 'hermes', capability: 'text.summarize', namespace: 'core::system',
    constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
    taskBrief: 'x', input: {}, evidenceDir: '/tmp/hermes-repair/proof-refire',
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 3, error: null, stdout: 'no json here', stderr: '' }),
  });
  const a = require('fs').readFileSync(r.artifactPath, 'utf8');
  const ok = r.outcome === 'escalated' && r.honestOutcome === 'unknown'
    && JSON.parse(a).exitCode === 3 && r.effect_state === 'effect_unknown' && r.outcome !== 'failed';
  console.log('2c adapter exact capture (exitCode=3 -> escalated/unknown/effect_unknown, never failed): ' + (ok ? 'PASS' : 'FAIL ' + JSON.stringify({outcome: r.outcome, effect_state: r.effect_state})));
  process.exit(ok ? 0 : 1);
})();" || C2=false
[ "$C2" = true ] && echo "COND2-RE_RESULT=PASS" || { echo "COND2-RE_RESULT=FAIL"; PASS_ALL=false; }

echo "=== COND5-RE (missing WSL: honest surfacing) ==="
C5=true
R5A=$(pig_ssh 'wsl -u nolan -- whoami' 2>/dev/null | tr -d '\000\r')
[ "$R5A" = "nolan" ] && note "5a WSL present, user nolan, rc=0 PASS" || { note "5a FAIL: $R5A"; C5=false; }
OUT5B=$(pig_ssh 'wsl -d no-such-distro-xyz -- hostname' 2>&1 | tr -d '\000\r' | head -c 120)
pig_ssh 'wsl -d no-such-distro-xyz -- hostname' >/dev/null 2>&1; RC5B=$?
{ [ "$RC5B" = "255" ] || [ "$RC5B" = "1" ]; } && case "$OUT5B" in *"no distribution"*) note "5b missing distro -> rc=$RC5B + stdout diagnostic PASS";; *) note "5b FAIL: $OUT5B"; C5=false;; esac || { note "5b rc FAIL: $RC5B"; C5=false; }
node -e "
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
(async () => {
  const r = await adapter.dispatchExecution({
    execution: { missionId: 'hermes-proof', runId: 'refire', executionId: 'c5re', attempt: '1' },
    agentId: 'hermes', capability: 'text.summarize', namespace: 'core::system',
    constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
    taskBrief: 'x', input: {}, evidenceDir: '/tmp/hermes-repair/proof-refire',
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 255, error: null,
      stdout: 'There is no distribution with the supplied name. Error code: Wsl/Service/WSL_E_DISTRO_NOT_FOUND', stderr: '' }),
  });
  const ok = r.outcome === 'escalated' && r.honestOutcome === 'unknown' && r.effect_state === 'effect_unknown';
  console.log('5c adapter trace (255/no-JSON -> escalated + honest unknown + effect_unknown): ' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})();" || C5=false
[ "$C5" = true ] && echo "COND5-RE_RESULT=PASS" || { echo "COND5-RE_RESULT=FAIL"; PASS_ALL=false; }

echo "=== COND6-RE (missing Hermes component: post-repair chain audit) ==="
C6=true
BR=/mnt/c/Users/nolan/hermes-bridge
HA=/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent
for f in "$BR/hermes-run.sh" "$BR/hermes-launch.py" "$HA/hermes_cli/main.py" "$HA/venv/Scripts/python.exe" /mnt/c/Users/nolan/AppData/Local/hermes/bin/hermes.exe; do
  if pig_ssh "wsl -u nolan -- test -f $f" >/dev/null 2>&1; then note "PRESENT  $f"
  else note "MISSING  $f"; C6=false; fi
done
PYHOME=$(pig_ssh 'wsl -u nolan -- head -1 /mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/pyvenv.cfg' 2>/dev/null | tr -d '\000\r')
case "$PYHOME" in *windows*) note "venv is a WINDOWS venv ($PYHOME) PASS";; *) note "venv home FAIL: $PYHOME"; C6=false;; esac
SM=$(pig_ssh "wsl -u nolan -- grep -c -- --safe-mode $BR/hermes-launch.py" 2>/dev/null | tr -d '\000\r')
[ "$SM" != "" ] && [ "$SM" -gt 0 ] && note "launcher passes --safe-mode PASS" || { note "launcher safe-mode FAIL"; C6=false; }
[ "$C6" = true ] && echo "COND6-RE_RESULT=PASS (no missing link; DEFECT-1 closed)" || { echo "COND6-RE_RESULT=FAIL"; PASS_ALL=false; }

echo "=== COND8-RE (effect boundary: DEFECT-2 closure verification) ==="
C8=true
grep -q "EFFECT_STATE" /home/hatch/workspace/orca-adapter/outcomes.js && note "8b-i EFFECT_STATE vocabulary in outcomes.js PASS" || { note "8b-i FAIL"; C8=false; }
node -e "
const { OUTCOME, EFFECT_STATE, terminalOutcome } = require('/home/hatch/workspace/orca-adapter/outcomes.js');
let threw = false;
try { terminalOutcome(OUTCOME.COMPLETED, {}); } catch (_) { threw = true; }
const r = terminalOutcome(OUTCOME.COMPLETED, { effect_state: EFFECT_STATE.UNKNOWN });
const ok = threw && r.effect_state === 'effect_unknown';
console.log('8b-ii COMPLETED-without-effect_state throws; verified completion records effect_unknown (never clean): ' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);" || C8=false
ES1=$(python3 -c "
import json
a = json.load(open('/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/result-cond1-a1.json'))
print(a.get('effect_state',''))")
[ "$ES1" = "effect_unknown" ] && note "8b-iii cond1 green artifact: effect_state=effect_unknown (verified completion, not clean) PASS" || { note "8b-iii FAIL: $ES1"; C8=false; }
node -e "
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
const p = adapter.buildWorkerPrompt({ work_order_id: 'w', context_pack_id: 'c', agent_id: 'hermes', capability: 'text.summarize', mission_id: 'm', task_id: 't', attempt: 1, input: {},
  constraints: { no_canonical_events: true, no_mission_state_writes: true } }, 'brief');
const ok = p.includes('Binding constraints') && p.includes('no_canonical_events: true') && p.includes('Never perform the violating action');
console.log('8b-iv constraints rendered into worker prompt (caveat-1): ' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);" || C8=false
grep -q "venv/Scripts/python.exe hermes_cli/main.py --safe-mode -z <prompt>" /home/hatch/workspace/orca-adapter/vendor/external_agent_adapter.js \
  && note "8b-v profile invocation reconciled to actual launcher (caveat-2) PASS" || { note "8b-v FAIL"; C8=false; }
[ "$C8" = true ] && echo "COND8-RE_RESULT=PASS (DEFECT-2 closed; caveats 1-2 reconciled)" || { echo "COND8-RE_RESULT=FAIL"; PASS_ALL=false; }

echo "=== SUMMARY ==="
[ "$PASS_ALL" = true ] && echo "REFIRE_8_CONDITIONS=ALL_PASS" || echo "REFIRE_8_CONDITIONS=SOME_FAIL"
[ "$PASS_ALL" = true ]
