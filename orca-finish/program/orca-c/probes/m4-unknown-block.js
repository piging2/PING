'use strict';
// ORCA-C mission 4 probe: branch movement — the uncommitted H5 unknown-block
// wiring in the A5 worktree (orca_unknown_block.js + control-loop/status-model
// diffs). Tests the REAL new module (read-only copy) + real objective-runtime.
// Questions: does the block hold? idempotent? budget-respecting release?
// crash-order between state write and blocked-file write fail closed?
const fs = require('fs');
const os = require('os');
const path = require('path');
const rt = require('../src/objective-runtime.js');
const ub = require('../src/orca_unknown_block.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}
function freshEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-c-m4-'));
  const oid = rt.deriveObjectiveId({ namespace: 'orca-c-m4', objectiveText: 'm4-' + root });
  rt.registerObjective(root, 'orca-c-m4', 'm4-' + root, { maxWorkOrders: 2 });
  return { root, oid };
}
const entry = (woId, n) => ({
  blocked_at: new Date().toISOString(), run_id: 'run-1', attempt_id: woId + '-attempt-' + n,
  attempt_number: n, reason: 'coordinator timeout after dispatch; outcome indeterminate',
  evidence: 'dispatch-t-a' + n + '.json',
});

// 1. classifier matrix
check('timeout -> POST_BOUNDARY_UNKNOWN',
  ub.classifyDispatchOutcome({ timedOut: true }) === 'POST_BOUNDARY_UNKNOWN');
check('transport error, dispatcher never ran -> PRE_BOUNDARY',
  ub.classifyDispatchOutcome({ transportError: 'spawn ENOENT' }) === 'PRE_BOUNDARY');
check('clean completion -> KNOWN',
  ub.classifyDispatchOutcome({ timedOut: false }) === 'KNOWN');
check('transport error WITH rendezvous collected -> not pre-boundary (result path decides)',
  ub.classifyDispatchOutcome({ transportError: 'x', rendezvousCollected: true }) === 'KNOWN');

// 2. block: idempotent, first-wins, field validation
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  const b1 = ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 1));
  check('block ok', b1.blocked === true && ub.isWorkOrderBlocked(rt, root, oid, woId) === true);
  const b2 = ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 2));
  check('re-block idempotent, first entry wins', b2.already === true && b2.entry.attempt_number === 1);
  let threw = false;
  try { ub.blockWorkOrder(rt, root, oid, rt.deriveWorkOrderId(oid, 't2'), { blocked_at: 'x' }); }
  catch (e) { threw = /entry\./.test(e.message); }
  check('block entry schema enforced (missing fields throw)', threw);
}
// 3. release paths
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'OUTCOME_UNKNOWN', attempt_count: 1, dispatch_pid: null });
  ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 1));
  const r = ub.releaseBlockedWorkOrder(rt, root, oid, woId, { decision: 'cancel', reason: 'operator reviewed; worker never ran', operator: 'nolan' });
  const wo = rt.loadWorkOrder(root, oid, woId);
  check('release cancel -> BLOCKED terminal, decision logged, unblocked',
    r.released === true && wo.state === 'BLOCKED' && wo.terminal.status === 'cancelled-after-outcome-unknown' &&
    ub.isWorkOrderBlocked(rt, root, oid, woId) === false);
  const doc = ub.loadBlocked(rt, root, oid);
  check('decision appended to durable decisions log',
    doc.decisions.length === 1 && doc.decisions[0].decision === 'cancel');
}
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'OUTCOME_UNKNOWN', attempt_count: 1, dispatch_pid: null });
  ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 1));
  const r = ub.releaseBlockedWorkOrder(rt, root, oid, woId, { decision: 'retry-after-reconcile', reason: 'rendezvous recovered; idempotent key ok', operator: 'nolan', maxAttempts: 2 });
  const wo = rt.loadWorkOrder(root, oid, woId);
  check('release retry -> AUTHORIZED fresh attempt, history preserved',
    r.released === true && wo.state === 'AUTHORIZED' && wo.last_attempt_id === null && wo.attempt_count === 1);
}
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'OUTCOME_UNKNOWN', attempt_count: 2, dispatch_pid: null });
  ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 2));
  const r = ub.releaseBlockedWorkOrder(rt, root, oid, woId, { decision: 'retry-after-reconcile', reason: 'x', operator: 'nolan', maxAttempts: 2 });
  check('release retry refused when attempt budget exhausted (fail closed)',
    r.released === false && r.reason === 'attempt-budget-exhausted' && ub.isWorkOrderBlocked(rt, root, oid, woId));
}
// 4. stale block entry: state moved on -> release refused
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'OUTCOME_UNKNOWN', attempt_count: 1 });
  ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 1));
  rt.updateWorkOrder(root, oid, woId, { state: 'COMPLETED', terminal: { status: 'completed' } }); // someone moved it
  const r = ub.releaseBlockedWorkOrder(rt, root, oid, woId, { decision: 'retry-after-reconcile', reason: 'x', operator: 'nolan' });
  check('release refused when state is no longer OUTCOME_UNKNOWN (stale entry not an authorization)',
    r.released === false && /unexpected-state/.test(r.reason));
}
// 5. crash-order: the loop writes the blocked FILE first, then the work-order
//    state (see control-loop diff). SIGKILL between them leaves (blocked +
//    state RUNNING). Both guards must refuse: reconcile skips blocked ids
//    before any state handling; delegate's pre-dispatch blocked check fires
//    before the terminal-state check.
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'RUNNING', attempt_count: 1, last_attempt_id: woId + '-attempt-1', dispatch_pid: 99999999 });
  ub.blockWorkOrder(rt, root, oid, woId, entry(woId, 1)); // file written...
  // ...state write to OUTCOME_UNKNOWN never landed (crash)
  const dwo = rt.loadWorkOrder(root, oid, woId);
  const reconcileSkips = ub.isWorkOrderBlocked(rt, root, oid, woId) === true; // checked before state handling
  const delegateRefuses = ub.isWorkOrderBlocked(rt, root, oid, woId) === true; // pre-dispatch check fires first
  check('crash window (blocked + RUNNING): reconcile skips, delegate refuses (fail closed)',
    reconcileSkips && delegateRefuses && dwo.state === 'RUNNING');
}
// 5b. reverse window (state OUTCOME_UNKNOWN, file missing) is also closed:
// OUTCOME_UNKNOWN is in the terminal set, so the delegate's terminal check
// escalates even without the blocked entry.
{
  const { root, oid } = freshEnv();
  const woId = rt.deriveWorkOrderId(oid, 't1');
  rt.authorizeWorkOrder(root, oid, 't1', {});
  rt.updateWorkOrder(root, oid, woId, { state: 'OUTCOME_UNKNOWN', attempt_count: 1, dispatch_pid: null,
    terminal: { status: 'outcome-unknown' } });
  const blockedCheck = ub.isWorkOrderBlocked(rt, root, oid, woId);
  const dwo = rt.loadWorkOrder(root, oid, woId);
  const terminalCheck = ub.isTerminalWorkOrderState(dwo.state);
  check('reverse window: blocked file absent, but OUTCOME_UNKNOWN is terminal -> delegate refuses (fail closed)',
    blockedCheck === false && terminalCheck === true);
}
// 6. corrupt blocked file -> fail LOUD (consistent with substrate readJson on
//    corrupt work-order files; nothing proceeds silently)
{
  const { root, oid } = freshEnv();
  const p = ub.blockedPath(rt, root, oid);
  fs.writeFileSync(p, '{corrupt json');
  let threw = false;
  try { ub.isWorkOrderBlocked(rt, root, oid, 'x'); } catch (e) { threw = true; }
  check('corrupt blocked file -> throws (fail loud, loop dispatches nothing)', threw);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
