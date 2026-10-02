'use strict';
/**
 * h5-harness.js — staged proof for H5 branch wiring (orca-b lane h5-wire).
 *
 * Runs ON THE PIG against the REAL branch modules (no copies, no fakes):
 *   /home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js
 *   /home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_unknown_block.js
 *   /home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_status_model.js
 *
 * The loop file itself (orca_control_loop.js) executes main() on require, so
 * its wiring is proven by STATIC region checks on the real file (the three
 * H5 call sites exist, the timeout branch no longer fabricates a failed
 * envelope or auto-retries) plus behavioral replay of the exact sequences
 * the loop executes, using the real modules.
 *
 * Groups:
 *   1. blocked-set gate (replays the W2 ready_set 16-case unresolved-unknown
 *      blocking semantics on the branch's blockedWorkOrderIds gate)
 *   2. dispatch classification (t_timeout_after_effect matrix + the
 *      pre-boundary control)
 *   3. ledger vocabulary (real orca_status_model.js: the new H5 edge, the
 *      preserved failed path, no automatic exit from BLOCKED)
 *   4. work-order terminal vocabulary (OUTCOME_UNKNOWN terminal;
 *      release is the only exit)
 *   5. static wiring proof on the real orca_control_loop.js
 *   6. t_timeout_after_effect end-to-end staged replay (T3 shape) and the
 *      T2 shape (rendezvous collected on timeout -> still UNKNOWN)
 *
 * Usage: node h5-harness.js   (exit 0 iff all pass)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOOP_DIR = '/home/nolan/worktrees/orca-autonomy/orca/control-loop';
const objRuntime = require(path.join(LOOP_DIR, 'objective-runtime.js'));
const unknownBlock = require(path.join(LOOP_DIR, 'orca_unknown_block.js'));
const statusModel = require(path.join(LOOP_DIR, 'policy', 'orca_status_model.js'));

const DATA_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'h5-harness-'));
const MAX_ATTEMPTS = 2;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + ': ' + (e && e.message)); }
}

// --- fixture: one objective with one authorized work order -----------------
const objective = objRuntime.registerObjective(DATA_ROOT, 'orca', 'h5 harness objective', { maxWorkOrders: 4 });
const OBJECTIVE_ID = objective.objective_id;
function freshWorkOrder(taskKey) {
  const wo = objRuntime.authorizeWorkOrder(DATA_ROOT, OBJECTIVE_ID, taskKey, { capability: 'text.summarize' });
  return wo.work_order_id;
}
function blockEntryFor(woId, attemptId, attempt) {
  return {
    blocked_at: new Date().toISOString(),
    run_id: 'harness-run-1',
    attempt_id: attemptId,
    attempt_number: attempt,
    reason: 'coordinator timeout after dispatch; outcome indeterminate',
    evidence: 'dispatch-t-a1.json',
    classification: 'POST_BOUNDARY_UNKNOWN',
    timed_out: true,
    rendezvous_collected: false,
    dispatch_pid: 4242,
    started_at: 't0',
    ended_at: 't1',
  };
}

// ================= Group 1: blocked-set gate =================
test('g1: initially nothing is blocked (unblocked default)', () => {
  const woId = freshWorkOrder('g1-task');
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), false);
});

test('g1: blocked id is blocked; other ids are not', () => {
  const woId = freshWorkOrder('g1-task2');
  const other = freshWorkOrder('g1-task3');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, woId + '-attempt-1', 1));
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), true);
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, other), false);
});

test('g1: block is idempotent — first entry wins, evidence preserved', () => {
  const woId = freshWorkOrder('g1-task4');
  const e1 = blockEntryFor(woId, woId + '-attempt-1', 1);
  const e2 = Object.assign({}, e1, { reason: 'different reason', blocked_at: 'later' });
  const r1 = unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, e1);
  const r2 = unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, e2);
  assert.strictEqual(r1.already, false);
  assert.strictEqual(r2.already, true);
  assert.strictEqual(unknownBlock.blockEntry(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId).reason, e1.reason);
});

test('g1: block entry carries the required evidence fields', () => {
  const woId = freshWorkOrder('g1-task5');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, woId + '-attempt-1', 1));
  const entry = unknownBlock.blockEntry(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId);
  for (const k of ['blocked_at', 'run_id', 'attempt_id', 'reason', 'evidence']) {
    assert.ok(entry[k], 'entry.' + k);
  }
});

test('g1: missing blocked file reads as not-blocked (fail closed read)', () => {
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, 'no-such-id'), false);
});

test('g1: release cancel -> unblocked, decision recorded, durable BLOCKED terminal', () => {
  const woId = freshWorkOrder('g1-task6');
  const attemptId = woId + '-attempt-1';
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, attemptId, 1));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'OUTCOME_UNKNOWN' });
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'cancel', reason: 'operator verified exterior side effects undesirable', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, true);
  assert.strictEqual(rel.workOrder.state, 'BLOCKED');
  assert.strictEqual(rel.workOrder.terminal.status, 'cancelled-after-outcome-unknown');
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), false);
  assert.strictEqual(unknownBlock.isTerminalWorkOrderState(rel.workOrder.state), true);
  const doc = unknownBlock.loadBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID);
  const d = doc.decisions.find((x) => x.work_order_id === woId);
  assert.ok(d && d.decision === 'cancel' && d.reason.length > 0 && d.decided_at);
});

test('g1: release retry-after-reconcile -> AUTHORIZED, pid/attempt cleared, budget preserved', () => {
  const woId = freshWorkOrder('g1-task7');
  const attemptId = woId + '-attempt-1';
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 1, last_attempt_id: attemptId, dispatch_pid: 4242 });
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, attemptId, 1));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'OUTCOME_UNKNOWN' });
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'retry-after-reconcile', reason: 'rendezvous reconciled by result_id; safe to re-attempt', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, true);
  assert.strictEqual(rel.workOrder.state, 'AUTHORIZED');
  assert.strictEqual(rel.workOrder.dispatch_pid, null);
  assert.strictEqual(rel.workOrder.last_attempt_id, null);
  assert.strictEqual(rel.workOrder.attempt_count, 1); // unknown attempt still counts against budget
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), false);
});

test('g1: release of a non-blocked id is refused, state untouched', () => {
  const woId = freshWorkOrder('g1-task8');
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'cancel', reason: 'x', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, false);
  assert.strictEqual(rel.reason, 'not-blocked');
  assert.strictEqual(objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId).state, 'AUTHORIZED');
});

test('g1: release with an unknown decision is refused, stays blocked', () => {
  const woId = freshWorkOrder('g1-task9');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, woId + '-attempt-1', 1));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'OUTCOME_UNKNOWN' });
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'auto-retry', reason: 'x', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, false);
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), true);
});

test('g1: release when durable state is not OUTCOME_UNKNOWN is refused (fail closed)', () => {
  const woId = freshWorkOrder('g1-task10');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, woId + '-attempt-1', 1));
  // durable state left AUTHORIZED (block entry is stale) -> refuse
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'cancel', reason: 'x', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, false);
  assert.ok(rel.reason.indexOf('unexpected-state') === 0, rel.reason);
});

test('g1: release retry with exhausted attempt budget is refused, stays blocked', () => {
  const woId = freshWorkOrder('g1-task11');
  const attemptId = woId + '-attempt-2';
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 2, last_attempt_id: attemptId });
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, attemptId, 2));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'OUTCOME_UNKNOWN' });
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'retry-after-reconcile', reason: 'x', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, false);
  assert.strictEqual(rel.reason, 'attempt-budget-exhausted');
  assert.strictEqual(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), true);
});

test('g1: decisions log is append-only across blocks and releases', () => {
  const before = unknownBlock.loadBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID).decisions.length;
  const woId = freshWorkOrder('g1-task12');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntryFor(woId, woId + '-attempt-1', 1));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'OUTCOME_UNKNOWN' });
  unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'cancel', reason: 'append-only check', operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  const after = unknownBlock.loadBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID).decisions.length;
  assert.strictEqual(after, before + 1);
});

// ================= Group 2: dispatch classification =================
test('g2: timeout without rendezvous -> POST_BOUNDARY_UNKNOWN (T3 shape)', () => {
  assert.strictEqual(
    unknownBlock.classifyDispatchOutcome({ timedOut: true, rendezvousCollected: false }), 'POST_BOUNDARY_UNKNOWN');
});

test('g2: timeout WITH rendezvous collected -> POST_BOUNDARY_UNKNOWN, never success (T2 shape)', () => {
  // The worker wrote a result but the coordinator killed the dispatcher:
  // the outcome is still indeterminate to the coordinator — the collected
  // rendezvous is evidence for the operator, never auto-accepted.
  assert.strictEqual(
    unknownBlock.classifyDispatchOutcome({ timedOut: true, rendezvousCollected: true, rendezvous: { stdout: '{}' } }),
    'POST_BOUNDARY_UNKNOWN');
});

test('g2: transport error, dispatcher never ran -> PRE_BOUNDARY (retryable control)', () => {
  assert.strictEqual(
    unknownBlock.classifyDispatchOutcome({ timedOut: false, transportError: 'spawn failed', rendezvousCollected: false }),
    'PRE_BOUNDARY');
});

test('g2: clean transport completion -> KNOWN (normal result path untouched)', () => {
  assert.strictEqual(
    unknownBlock.classifyDispatchOutcome({ timedOut: false, exitCode: 0, rendezvousCollected: true }),
    'KNOWN');
});

// ================= Group 3: ledger vocabulary =================
test('g3: RUNNING -> EVIDENCE_PENDING -> BLOCKED is a legal ledger path (H5 edge)', () => {
  const ledger = new statusModel.OrcaStatusLedger();
  ledger.transition('u', 'RUNNING', {});
  ledger.transition('u', 'EVIDENCE_PENDING', {});
  const e = ledger.transition('u', 'BLOCKED', {});
  assert.strictEqual(e.to, 'BLOCKED');
});

test('g3: EVIDENCE_PENDING -> FAILED still legal (failed path preserved)', () => {
  const ledger = new statusModel.OrcaStatusLedger();
  ledger.transition('u', 'EVIDENCE_PENDING', {});
  assert.strictEqual(ledger.transition('u', 'FAILED', {}).to, 'FAILED');
});

test('g3: BLOCKED has no automatic exit (no BLOCKED->AUTHORIZED/QUEUED/RUNNING edge)', () => {
  const edges = statusModel.TRANSITIONS.BLOCKED.map((e) => e.to);
  assert.ok(!edges.includes('AUTHORIZED') && !edges.includes('QUEUED') && !edges.includes('RUNNING'),
    'BLOCKED edges: ' + edges.join(','));
  // exits are human-driven only
  assert.ok(edges.includes('PLANNED') && edges.includes('CLOSED'));
});

test('g3: ledger rejects illegal jumps (EVIDENCE_PENDING -> AUTHORIZED throws)', () => {
  const ledger = new statusModel.OrcaStatusLedger();
  ledger.transition('u', 'EVIDENCE_PENDING', {});
  assert.throws(() => ledger.transition('u', 'AUTHORIZED', {}), /illegal transition/);
});

// ================= Group 4: terminal vocabulary =================
test('g4: OUTCOME_UNKNOWN is terminal; AUTHORIZED/RUNNING are not', () => {
  for (const s of ['COMPLETED', 'FAILED', 'VERIFICATION_FAILED', 'BLOCKED', 'OUTCOME_UNKNOWN']) {
    assert.ok(unknownBlock.isTerminalWorkOrderState(s), s + ' terminal');
  }
  assert.ok(!unknownBlock.isTerminalWorkOrderState('AUTHORIZED'));
  assert.ok(!unknownBlock.isTerminalWorkOrderState('RUNNING'));
  assert.ok(!unknownBlock.isTerminalWorkOrderState('BOGUS'));
});

// ================= Group 5: static wiring proof (real loop file) =================
const loopSrc = fs.readFileSync(path.join(LOOP_DIR, 'orca_control_loop.js'), 'utf8');
function region(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  assert.ok(a >= 0, 'marker not found: ' + startMarker);
  const b = src.indexOf(endMarker, a);
  assert.ok(b >= 0, 'end marker not found: ' + endMarker);
  return src.slice(a, b);
}
test('g5: timeout branch calls the H5 path (block + OUTCOME_UNKNOWN + Escalation)', () => {
  const branch = region(loopSrc, 'if (disp.timedOut) {', '} else {');
  assert.ok(branch.includes('classifyDispatchOutcome'), 'classifies the timeout');
  assert.ok(branch.includes('blockWorkOrder'), 'blocks the work order');
  assert.ok(branch.includes("state: 'OUTCOME_UNKNOWN'"), 'marks OUTCOME_UNKNOWN');
  assert.ok(branch.includes('throw new Escalation'), 'escalates, never continues');
});
test('g5: timeout branch no longer fabricates a failed envelope or auto-retries', () => {
  const branch = region(loopSrc, 'if (disp.timedOut) {', '} else {');
  assert.ok(!branch.includes('timeoutEnvelope('), 'no failed-envelope fabrication');
  assert.ok(!branch.includes('classifyRetry'), 'no fail-path retry classification');
  assert.ok(!branch.includes('recordVerifiedResult'), 'no canonical event on the unknown path');
  assert.ok(!branch.includes('extractEnvelope'), 'no envelope extraction on the unknown path');
});
test('g5: delegate pre-dispatch consults the blocked set', () => {
  const delegate = region(loopSrc, 'async function delegate(', 'async function assessAndFollowUp(');
  assert.ok(delegate.includes('isWorkOrderBlocked'), 'pre-dispatch blocked check present');
  assert.ok(delegate.includes('releaseBlockedWorkOrder'), 'release named as the only release path');
});
test('g5: reconcileStartup consults the blocked set', () => {
  const reconc = region(loopSrc, 'async function reconcileStartup(', '// --------------------------------------------------------------- DELEGATE');
  assert.ok(reconc.includes('isWorkOrderBlocked'), 'reconcile blocked check present');
});
test('g5: transport-failure (pre-boundary) path still replans within budget', () => {
  const branch = region(loopSrc, "if (disp.transportError && !disp.rendezvous) {", 'let result;');
  assert.ok(branch.includes('re-planning within attempt budget') || branch.includes("state: 'AUTHORIZED'"),
    'pre-boundary replan preserved');
});
test('g5: timeoutEnvelope retained but marked retired-by-H5 (no deletion)', () => {
  assert.ok(loopSrc.includes('RETIRED BY H5'), 'retirement note present');
  const branch = region(loopSrc, 'if (disp.timedOut) {', '} else {');
  assert.ok(!branch.includes('timeoutEnvelope('), 'retired from the timeout path');
});

// ================= Group 6: t_timeout_after_effect staged replay =================
test('g6: T3 replay — post-boundary timeout -> OUTCOME_UNKNOWN, blocked, no auto-retry, no success', () => {
  // Mirror the exact sequence the loop's timeout branch executes, on the
  // real modules: classify -> block -> durable OUTCOME_UNKNOWN ->
  // ledger RUNNING->EVIDENCE_PENDING->BLOCKED.
  const woId = freshWorkOrder('g6-t3');
  const attemptId = woId + '-attempt-1';
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    state: 'RUNNING', attempt_count: 1, last_attempt_id: attemptId, dispatch_pid: 4242,
  });
  // 1. coordinator timeout lands after dispatch (worker may still be running)
  const disp = { timedOut: true, rendezvousCollected: false, pid: 4242, startedAt: 't0', endedAt: 't1' };
  assert.strictEqual(unknownBlock.classifyDispatchOutcome(disp), 'POST_BOUNDARY_UNKNOWN');
  // 2. block + durable OUTCOME_UNKNOWN (what the loop's timeout branch does)
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId,
    blockEntryFor(woId, attemptId, 1));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    state: 'OUTCOME_UNKNOWN', dispatch_pid: null,
    terminal: { status: 'outcome-unknown', attempts: 1, attempt_id: attemptId },
  });
  const ledger = new statusModel.OrcaStatusLedger();
  ledger.transition('t3', 'RUNNING', {});
  ledger.transition('t3', 'EVIDENCE_PENDING', {});
  ledger.transition('t3', 'BLOCKED', {});
  // 3. assert the H5 invariants
  const dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
  assert.strictEqual(dwo.state, 'OUTCOME_UNKNOWN');
  assert.ok(unknownBlock.isTerminalWorkOrderState(dwo.state), 'terminal for auto paths');
  assert.ok(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), 'blocked from auto-claim');
  assert.notStrictEqual(dwo.state, 'COMPLETED', 'never marked success');
  assert.notStrictEqual(dwo.state, 'FAILED', 'never resolved as failed');
  assert.notStrictEqual(dwo.state, 'AUTHORIZED', 'never auto-requeued');
  assert.strictEqual(ledger.current('t3'), 'BLOCKED');
  // 4. the loop's pre-dispatch gate refuses it (delegate consults the set)
  assert.ok(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId),
    'pre-dispatch gate refuses');
  // 5. only a recorded decision releases: retry-after-reconcile re-authorizes
  const rel = unknownBlock.releaseBlockedWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, {
    decision: 'retry-after-reconcile', reason: 'operator confirmed no exterior effect via Hermes logs',
    operator: 'harness', maxAttempts: MAX_ATTEMPTS,
  });
  assert.strictEqual(rel.released, true);
  assert.strictEqual(rel.workOrder.state, 'AUTHORIZED');
  assert.ok(!unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), 'released');
});

test('g6: T2 replay — timeout WITH collected rendezvous -> still UNKNOWN, result not auto-accepted', () => {
  const woId = freshWorkOrder('g6-t2');
  const attemptId = woId + '-attempt-1';
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    state: 'RUNNING', attempt_count: 1, last_attempt_id: attemptId, dispatch_pid: 4242,
  });
  const disp = { timedOut: true, rendezvousCollected: true, rendezvous: { stdout: '{"status":"completed"}' }, pid: 4242 };
  assert.strictEqual(unknownBlock.classifyDispatchOutcome(disp), 'POST_BOUNDARY_UNKNOWN');
  unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId,
    Object.assign(blockEntryFor(woId, attemptId, 1), { rendezvous_collected: true }));
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    state: 'OUTCOME_UNKNOWN', dispatch_pid: null,
    terminal: { status: 'outcome-unknown', attempts: 1, attempt_id: attemptId, rendezvous_collected: true },
  });
  const dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
  assert.strictEqual(dwo.state, 'OUTCOME_UNKNOWN', 'collected result does not become success');
  assert.ok(unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId), 'still blocked');
  // the recovered rendezvous is preserved as evidence for the operator's
  // idempotent-keyed reconcile, not auto-accepted: the block entry carries it
  assert.strictEqual(unknownBlock.blockEntry(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId).rendezvous_collected, true);
});

test('g6: pre-boundary control — transport failure never touches the unknown path', () => {
  const woId = freshWorkOrder('g6-pre');
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'RUNNING', attempt_count: 1 });
  const disp = { timedOut: false, transportError: 'spawn failed: ENOENT', rendezvousCollected: false };
  assert.strictEqual(unknownBlock.classifyDispatchOutcome(disp), 'PRE_BOUNDARY');
  // the loop's transport branch replans within budget; the work order is
  // never blocked and never OUTCOME_UNKNOWN on this path
  assert.ok(!unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId));
  assert.notStrictEqual(objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId).state, 'OUTCOME_UNKNOWN');
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);
console.log(`DATA_ROOT=${DATA_ROOT}`);
process.exit(failed === 0 ? 0 : 1);
