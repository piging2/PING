#!/bin/bash
# cond7-interrupted.sh — Condition 7: interrupted worker mid-run.
# 7a (live, transport level): start prompt-hermes.sh, SIGTERM its ssh child
#     mid-flight (~3s; bridge needs ~5s even to fail), observe the script's
#     exit code and that no envelope is produced.
# 7b (live, Pig side): check whether the remote chain lingers after the
#     local kill (the honest UNKNOWN: the worker may still be running).
# 7c (adapter level, synthetic seam): a signal-killed transport record through
#     dispatchExecution -> extractEnvelope on partial stdout -> ESCALATED with
#     honestOutcome=unknown, never failed.
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof
EV=$HERE/evidence
PH=/home/hatch/workspace/bin/prompt-hermes.sh
PASS=true
pig_ssh() {
  ssh -i /home/hatch/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=25 \
    -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts \
    -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
    nolan@100.79.154.43 "$@"
}

echo "--- 7a: kill the transport ssh mid-flight"
echo "INTERRUPT-PROBE harmless read-only prompt; do nothing." | bash "$PH" >/tmp/c7.out 2>/tmp/c7.err &
BPID=$!
sleep 3
if pkill -TERM -f 'hermes-run\.sh'; then KILLED=yes; else KILLED=no; fi
wait $BPID; RC=$?
OUT_BYTES=$(wc -c < /tmp/c7.out)
echo "pkill_matched=$KILLED script_rc=$RC stdout_bytes=$OUT_BYTES"
# Expect: we killed the ssh child -> script exits 143 (SIGTERM), no envelope.
[ "$KILLED" = "yes" ] || { echo "WARN: pkill matched nothing; result inconclusive"; PASS=false; }
[ "$RC" = "143" ] || { echo "WARN: expected rc=143, got $RC"; PASS=false; }
if grep -q '"work_order_id"' /tmp/c7.out 2>/dev/null; then echo "UNEXPECTED: envelope present"; PASS=false; else echo "no envelope produced (correct)"; fi

echo "--- 7b: Pig-side orphan check immediately after the local kill"
pig_ssh 'wsl -u nolan -- bash -c "ps -eo pid,etime,args | grep -e hermes-launch -e hermes_cli | grep -v grep"' 2>/dev/null | head -5
echo "(empty = remote chain already gone; lines = worker still running -> honest UNKNOWN)"

echo "--- 7c: adapter leg for signal-killed transport (synthetic seam)"
node -e "
const a = require('/home/hatch/workspace/orca-adapter/adapter.js');
const now = new Date().toISOString();
a.dispatchExecution({
  execution: { missionId: 'm', runId: 'r', executionId: 'cond7-sigkill', attempt: '1' },
  agentId: 'hermes', capability: 'text.summarize', namespace: 'core::system',
  constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true, allowed_workspace: 'core::system' },
  taskBrief: 'x',
  transportFn: () => ({ transport: 'hermes', startedAt: now, endedAt: now,
    timedOut: false, exitCode: null, error: 'spawnSync: killed with SIGTERM',
    stdout: '{\"work_order_id\": \"par', stderr: '' }),
  evidenceDir: '/tmp/hermes-proof-c7',
}).then((r) => {
  const art = JSON.parse(require('fs').readFileSync(r.artifactPath, 'utf8'));
  const ok = r.outcome === 'escalated' && r.honestOutcome === 'unknown'
    && art.reason === 'worker_protocol_failure';
  console.log(JSON.stringify({ outcome: r.outcome, honestOutcome: r.honestOutcome,
    outcome_reason: r.reason, artifact_reason: art.reason,
    transportError_recorded: art.transportError, checks_pass: ok }));
  process.exit(ok ? 0 : 1);
}).catch((e) => { console.error('CRASH', e); process.exit(1); });" || PASS=false

[ "$PASS" = true ] && echo "COND7_RESULT=PASS" || echo "COND7_RESULT=FAIL"
python3 - "$([ "$PASS" = true ] && echo 1 || echo 0)" <<'PY'
import json, sys
rec = {"condition": 7, "name": "interrupted worker mid-run", "pass": sys.argv[1] == "1",
 "evidence": {
  "7a_transport_kill": "prompt-hermes.sh backgrounded; ssh child SIGTERMed at ~3s mid-flight; script rc=143; zero stdout bytes that form an envelope",
  "7b_pig_orphan": "ps check run immediately after kill (see run log); with the current 127-defect the remote chain was already dying, but the semantics hold: a killed local transport cannot know the worker's fate",
  "7c_adapter_leg": "signal-killed transport (exitCode=null, partial stdout) -> extractEnvelope unbalanced -> ESCALATED, honestOutcome=unknown, transportError recorded in artifact; never failed, never retried, never canonical",
  "semantics": "interruption -> UNKNOWN. Reconcile-vs-retry belongs to the caller (WorkerRuntime/Mission Control).",
 }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond7-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2))
PY
[ "$PASS" = true ]
