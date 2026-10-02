#!/usr/bin/env node
'use strict';
/**
 * ORCA-D mission 3 (extension): stale-rendezvous poisoning, T5/T6.
 *
 * Uses the REAL vendor objective-runtime (branch ae55b77ff) for all durable
 * state, plus VERBATIM replicas of the loop's glue (marked below):
 *   - collectRendezvousDrop (vendor-orca_control_loop.js:279)
 *   - dispatchHermes stdout preference: (rendezvous && rendezvous.stdout) || outcome.stdout
 *   - reconcileRunningWorkOrder's collect-then-read-then-accept sequence
 *   - verifyResultEnvelope (real vendor adapter)
 *
 * T5: attempt-1's drop is collected at timeout but IGNORED by the timeout
 *     path; it stays in the per-work-order result path. Attempt-2's worker
 *     exits fast with garbage stdout. dispatchHermes prefers the stale
 *     rendezvous stdout -> attempt-1's envelope is extracted as attempt-2's.
 * T6: same collected stale drop; coordinator SIGKILLed mid-attempt-2 before
 *     any attempt-2 drop exists. Restart reconcile reads the stale drop as
 *     attempt-2's result -> RENDEZVOUS_RECOVERED -> accepted.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const objRuntime = require('./vendor-objective-runtime.js');
const adapter = require('./vendor-ping-runtime/external-agent/external_agent_adapter.js');

const DATA_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-d-stale-'));
const OBJECTIVE_ID = 'obj-stale-test';
const WIN_TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-d-wintmp-'));

// --- verbatim glue from vendor-orca_control_loop.js ---
function rendezvousDropPath(attemptId) { return WIN_TMP + `/orca-rendezvous-${attemptId}.json`; }
function collectRendezvousDrop(attemptId, workOrderId) {           // :279 verbatim (WIN_TMP substituted)
  const drop = rendezvousDropPath(attemptId);
  if (!fs.existsSync(drop)) return false;
  const dest = objRuntime.rendezvousResultPath(DATA_ROOT, OBJECTIVE_ID, workOrderId);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { fs.renameSync(drop, dest); }
  catch (err) { fs.copyFileSync(drop, dest); fs.unlinkSync(drop); }
  return true;
}
// ---

function envelopeFor(marker) {
  return {
    work_order_id: null, // filled per work order below
    context_pack_id: 'ctx1', agent_id: 'hermes', capability: 'queue.summarize',
    status: 'completed', output: { marker }, evidence: { attemptMarker: marker }, error: null,
  };
}

const woId = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, 't1');
objRuntime.authorizeWorkOrder(DATA_ROOT, OBJECTIVE_ID, 't1', {});
const attemptId1 = objRuntime.deriveAttemptId(woId, 1);
const attemptId2 = objRuntime.deriveAttemptId(woId, 2);

// ---- attempt 1: worker completes at 179.9s; dispatcher writes drop; coordinator SIGKILLs at 180s ----
const env1 = envelopeFor('attempt-1-effect'); env1.work_order_id = woId;
const drop1 = {
  schema: 'orca-rendezvous/1', attempt_id: attemptId1, work_order_id: woId, objective_id: OBJECTIVE_ID,
  dispatch_started_at: new Date(Date.now() - 180000).toISOString(),
  stdout: JSON.stringify(env1), stderr: '', returncode: 0, timed_out: false,
};
fs.writeFileSync(rendezvousDropPath(attemptId1), JSON.stringify(drop1)); // dispatcher wrote it pre-kill
objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 1, last_attempt_id: attemptId1, dispatch_pid: 4242 });
// coordinator timeout path: collect runs even on timeout...
const collected1 = collectRendezvousDrop(attemptId1, woId);
// ...but the timeout branch ignores disp.rendezvous and uses timeoutEnvelope instead (T2)
const timeoutIgnoredRendezvous = true;
// retry path: state -> AUTHORIZED, last_attempt_id nulled; the stale drop REMAINS in the result path
objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'AUTHORIZED', dispatch_pid: null, last_attempt_id: null });
console.log(`T2 setup: attempt-1 drop collected=${collected1} but ignored by timeout path; stale drop remains at result path=${fs.existsSync(objRuntime.rendezvousResultPath(DATA_ROOT, OBJECTIVE_ID, woId))}`);

// ---- T5: attempt-2 worker exits immediately with garbage stdout ----
objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 2, last_attempt_id: attemptId2, dispatch_pid: 4343 });
collectRendezvousDrop(attemptId2, woId); // nothing for attempt-2
const rendezvous2 = objRuntime.readRendezvousResult(DATA_ROOT, OBJECTIVE_ID, woId); // STALE attempt-1 drop!
const workerStdout2 = 'worker crashed instantly; traceback garbage, no envelope';
// verbatim stdout preference from dispatchHermes return:
const effectiveStdout = (rendezvous2 && rendezvous2.stdout) || workerStdout2 || '';
const usesStale = effectiveStdout.includes('attempt-1-effect');
console.log(`T5: attempt-2 effective stdout sourced from stale attempt-1 drop: ${usesStale}`);
const wo2 = { work_order_id: woId, context_pack_id: 'ctx1', agent_id: 'hermes', capability: 'queue.summarize', deadline: new Date(Date.now() + 600000).toISOString(), mission_id: 'm1', task_id: 't1', attempt: 2, namespace: 'core::system' };
const ext = JSON.parse(effectiveStdout.slice(effectiveStdout.indexOf('{')));
const v5 = adapter.verifyResultEnvelope(ext, wo2, { invokedAgentId: 'hermes', verifiedAt: new Date().toISOString() });
console.log(`T5: stale attempt-1 envelope verified as attempt-2 result: ${v5.valid} ${v5.valid ? '' : v5.reason}`);

// ---- T6: reset; coordinator SIGKILLed mid-attempt-2; restart reconcile ----
objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 2, last_attempt_id: attemptId2, dispatch_pid: 99999 /* dead pid */ });
// reconcileRunningWorkOrder sequence (verbatim order): collect(current attempt) -> read -> accept
const collected2 = collectRendezvousDrop(attemptId2, woId);
const rec = objRuntime.readRendezvousResult(DATA_ROOT, OBJECTIVE_ID, woId);
const recovered = !!(rec && rec.stdout);
const staleAccepted = recovered && rec.stdout.includes('attempt-1-effect');
console.log(`T6: reconcile collected fresh drop=${collected2}; recovered result present=${recovered}; result is STALE attempt-1 evidence=${staleAccepted}`);
if (staleAccepted) {
  const env = JSON.parse(rec.stdout.slice(rec.stdout.indexOf('{')));
  const v6 = adapter.verifyResultEnvelope(env, wo2, { invokedAgentId: 'hermes', verifiedAt: new Date().toISOString() });
  console.log(`T6: stale envelope passes verification as attempt-2's result: ${v6.valid} (would emit WORKER_COMPLETED keyed to attempt 2 on attempt-1's evidence)`);
}

console.log('\nROOT CAUSE (both): result path is keyed per work order and never cleared between attempts;');
console.log('drop metadata (attempt_id, dispatch_started_at) is never compared to the current attempt;');
console.log('the envelope carries no attempt field and verifyResultEnvelope has no attempt binding.');
