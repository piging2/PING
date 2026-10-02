'use strict';
/**
 * orca_unknown_block.js — H5 unknown-block wiring for the ORCA control loop
 * (harvest spec H5, orca-b VERDICTS.md record 7).
 *
 * Rule: work that crossed a side-effect boundary with an indeterminate
 * outcome must be blocked from auto-claim and auto-retry; only an explicit
 * recorded decision (or idempotent-keyed reconcile) releases it.
 *
 * What this module owns:
 *   1. classifyDispatchOutcome() — pure: a coordinator timeout lands AFTER
 *      the dispatch crossed the side-effect boundary (the dispatcher spawned
 *      the exterior worker), so its outcome is indeterminate: the worker may
 *      have completed (rendezvous collected or not), may still be running
 *      and complete later, or may never have run — the coordinator cannot
 *      distinguish these. -> POST_BOUNDARY_UNKNOWN. A transport failure
 *      where the dispatcher never ran is pre-boundary -> PRE_BOUNDARY
 *      (the loop's existing bounded re-plan path stays valid there).
 *   2. The durable blocked set `blockedWorkOrderIds`: persisted as
 *      objectives/<objective_id>/blocked-work-orders.json
 *      { blocked: { <workOrderId>: entry }, decisions: [ ... ] }.
 *      The loop consults it on the reconcile path (reconcileStartup) and the
 *      pre-dispatch path (delegate): a blocked id is never auto-claimed,
 *      even when its durable state reads AUTHORIZED.
 *   3. releaseBlockedWorkOrder() — the ONLY writer that moves a work order
 *      out of OUTCOME_UNKNOWN. The release requires an explicit recorded
 *      decision ('cancel' or 'retry-after-reconcile'); the decision is
 *      appended to the durable decisions log. No automatic path calls this.
 *
 * Durable-state mapping (the branch has no run record; the durable
 * work-order record is the branch's analog of the W2 run record):
 *   OUTCOME_UNKNOWN is terminal for every automatic path
 *   (WORK_ORDER_TERMINAL_STATES). Release outcomes:
 *     'cancel'               -> state BLOCKED, terminal.status
 *                               'cancelled-after-outcome-unknown'
 *                               (abandoned with a recorded decision)
 *     'retry-after-reconcile'-> state AUTHORIZED (a NEW attempt may dispatch
 *                               within the durable attempt budget; the
 *                               unknown attempt stays honestly recorded in
 *                               attempt_history)
 * Crash-order safety: the work-order update is written before the blocked
 * file. Either order fails closed — a crash between the two leaves either
 * (blocked + OUTCOME_UNKNOWN) which the loop's terminal check escalates, or
 * (unblocked + OUTCOME_UNKNOWN) which is impossible because the file write
 * follows the state write... precisely: if the state write lands and the
 * file write does not, the id is still in the blocked set (file unchanged)
 * and the state is AUTHORIZED -> the loop's blocked check refuses dispatch.
 * If the state write itself fails, updateWorkOrder throws and the blocked
 * file is untouched. No interleaving auto-dispatches.
 *
 * Operator release (branch worktree, operator-run only — never an automatic
 * path; DATA_ROOT/OBJECTIVE_ID come from the loop's environment):
 *   node -e "const u=require('/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_unknown_block.js');
 *   const rt=require('/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js');
 *   console.log(JSON.stringify(u.releaseBlockedWorkOrder(rt, DATA_ROOT, OBJECTIVE_ID, WO_ID,
 *     { decision:'cancel', reason:'...', operator:'nolan', maxAttempts:2 }), null, 2))"
 *
 * PING-side only: no canonical events, no new event store, no mission
 * authority. All functions take `rt`, the objective-runtime module shape
 * { atomicWrite, readJson, objectiveDir, loadWorkOrder, updateWorkOrder }.
 */

// ---------------------------------------------------------------------------
// Durable work-order terminal vocabulary. OUTCOME_UNKNOWN is terminal for
// every automatic path; the only exit is releaseBlockedWorkOrder() with a
// recorded decision (the W2 "terminal-except-administrative-cancel"
// semantics, mapped onto the branch's durable work-order record).
const WORK_ORDER_TERMINAL_STATES = Object.freeze([
  'COMPLETED',
  'FAILED',
  'VERIFICATION_FAILED',
  'BLOCKED',
  'OUTCOME_UNKNOWN',
]);

function isTerminalWorkOrderState(state) {
  return !!state && WORK_ORDER_TERMINAL_STATES.includes(state);
}

const BLOCKED_WORK_ORDERS_FILE = 'blocked-work-orders.json';

function blockedPath(rt, dataRoot, objectiveId) {
  const path = require('path');
  return path.join(rt.objectiveDir(dataRoot, objectiveId), BLOCKED_WORK_ORDERS_FILE);
}

function emptyBlockedFile() {
  return { blocked: {}, decisions: [] };
}

/**
 * Load the blocked set. Returns { blocked, decisions }; never throws on a
 * missing file (no blocked work = empty set). A corrupt file throws: a
 * half-written blocked set must not silently read as empty.
 */
function loadBlocked(rt, dataRoot, objectiveId) {
  const raw = rt.readJson(blockedPath(rt, dataRoot, objectiveId));
  if (!raw) return emptyBlockedFile();
  return {
    blocked: raw.blocked && typeof raw.blocked === 'object' ? raw.blocked : {},
    decisions: Array.isArray(raw.decisions) ? raw.decisions : [],
  };
}

function saveBlocked(rt, dataRoot, objectiveId, doc) {
  rt.atomicWrite(blockedPath(rt, dataRoot, objectiveId), JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

function isWorkOrderBlocked(rt, dataRoot, objectiveId, workOrderId) {
  if (!workOrderId) return false;
  return Object.prototype.hasOwnProperty.call(loadBlocked(rt, dataRoot, objectiveId).blocked, workOrderId);
}

function blockEntry(rt, dataRoot, objectiveId, workOrderId) {
  const entry = loadBlocked(rt, dataRoot, objectiveId).blocked[workOrderId];
  return entry || null;
}

/**
 * Add a work order to the blocked set. Idempotent: the FIRST block entry
 * wins; a second block of the same id preserves the original evidence.
 * Entry must carry blocked_at, run_id, attempt_id, reason, evidence.
 */
function blockWorkOrder(rt, dataRoot, objectiveId, workOrderId, entry) {
  if (!workOrderId || typeof workOrderId !== 'string') {
    throw new Error('blockWorkOrder: workOrderId required');
  }
  const required = ['blocked_at', 'run_id', 'attempt_id', 'reason', 'evidence'];
  for (const k of required) {
    if (entry == null || entry[k] == null || entry[k] === '') {
      throw new Error(`blockWorkOrder: entry.${k} required`);
    }
  }
  const doc = loadBlocked(rt, dataRoot, objectiveId);
  if (Object.prototype.hasOwnProperty.call(doc.blocked, workOrderId)) {
    return { blocked: true, already: true, entry: doc.blocked[workOrderId] };
  }
  doc.blocked[workOrderId] = Object.assign({}, entry);
  saveBlocked(rt, dataRoot, objectiveId, doc);
  return { blocked: true, already: false, entry: doc.blocked[workOrderId] };
}

/**
 * Pure dispatch-outcome classifier (the T1-T4 timeout matrix decision).
 * Input is the dispatchHermes() transport outcome shape:
 *   { timedOut, transportError, rendezvousCollected }
 * Returns:
 *   'POST_BOUNDARY_UNKNOWN' — the dispatcher spawned (the side-effect
 *     boundary was crossed) and the coordinator killed it on timeout. The
 *     worker may have completed (with or without a collected rendezvous),
 *     may still be running, or may never have run: indeterminate.
 *     The loop must mark OUTCOME_UNKNOWN, block the work order, and
 *     escalate — never auto-retry, never mark success, never fabricate a
 *     failed envelope.
 *   'PRE_BOUNDARY' — the dispatcher never ran (transport error, no
 *     rendezvous): nothing could have executed; the loop's existing bounded
 *     re-plan path stays valid.
 *   'KNOWN' — transport completed without timeout; the result path decides.
 */
function classifyDispatchOutcome(outcome) {
  const o = outcome || {};
  if (o.transportError && !o.rendezvousCollected && !o.rendezvous) return 'PRE_BOUNDARY';
  if (o.timedOut) return 'POST_BOUNDARY_UNKNOWN';
  return 'KNOWN';
}

/**
 * Release a blocked work order. THE ONLY writer that moves a work order out
 * of OUTCOME_UNKNOWN. Requires an explicit recorded decision; the decision
 * is appended to the durable decisions log (auditability), and the id is
 * removed from the blocked set in the same atomic file write.
 *
 * decision:
 *   'cancel' — administrative cancel. Durable state -> BLOCKED with
 *     terminal.status 'cancelled-after-outcome-unknown' (abandoned with a
 *     recorded decision; still terminal for all automatic paths).
 *   'retry-after-reconcile' — the operator (or an idempotent-keyed
 *     reconcile of a recovered rendezvous result) examined the unknown
 *     attempt and decided a fresh attempt is safe. Durable state ->
 *     AUTHORIZED, dispatch_pid/last_attempt_id cleared; the unknown attempt
 *     stays honestly recorded in attempt_history and still counts against
 *     the durable attempt budget. Refused when the budget is exhausted
 *     (fail closed: stays blocked).
 *
 * Returns { released: true, decision, workOrder } or
 * { released: false, reason } — never throws for policy refusals (throws
 * only for missing work order / persistence failure).
 */
function releaseBlockedWorkOrder(rt, dataRoot, objectiveId, workOrderId, opts = {}) {
  const { decision, reason, operator, maxAttempts } = opts;
  if (decision !== 'cancel' && decision !== 'retry-after-reconcile') {
    return { released: false, reason: 'unknown-decision' };
  }
  if (!reason || typeof reason !== 'string' || reason.length === 0) {
    return { released: false, reason: 'reason-required' };
  }
  const doc = loadBlocked(rt, dataRoot, objectiveId);
  if (!Object.prototype.hasOwnProperty.call(doc.blocked, workOrderId)) {
    return { released: false, reason: 'not-blocked' };
  }
  const dwo = rt.loadWorkOrder(dataRoot, objectiveId, workOrderId);
  if (!dwo) throw new Error('releaseBlockedWorkOrder: unknown work order ' + workOrderId);
  if (dwo.state !== 'OUTCOME_UNKNOWN') {
    // Fail closed: something else already moved this work order; the block
    // entry is stale, not an authorization.
    return { released: false, reason: 'unexpected-state:' + dwo.state };
  }
  const now = new Date().toISOString();
  let workOrder;
  if (decision === 'cancel') {
    workOrder = rt.updateWorkOrder(dataRoot, objectiveId, workOrderId, {
      state: 'BLOCKED',
      dispatch_pid: null,
      terminal: {
        status: 'cancelled-after-outcome-unknown',
        attempts: dwo.attempt_count || 0,
        reason,
        decided_by: operator || 'operator',
        decided_at: now,
        prior_state: 'OUTCOME_UNKNOWN',
        at: now,
      },
    });
  } else {
    const attempts = dwo.attempt_count || 0;
    const limit = Number.isInteger(maxAttempts) ? maxAttempts : 2;
    if (attempts >= limit) {
      return { released: false, reason: 'attempt-budget-exhausted' };
    }
    workOrder = rt.updateWorkOrder(dataRoot, objectiveId, workOrderId, {
      state: 'AUTHORIZED',
      dispatch_pid: null,
      last_attempt_id: null,
      reconcile_note: `released from OUTCOME_UNKNOWN by recorded operator decision (${operator || 'operator'}): ${reason}`,
      reconciled_at: now,
    });
  }
  delete doc.blocked[workOrderId];
  doc.decisions.push({
    work_order_id: workOrderId,
    decision,
    reason,
    operator: operator || 'operator',
    decided_at: now,
    prior_state: 'OUTCOME_UNKNOWN',
    new_state: workOrder.state,
  });
  saveBlocked(rt, dataRoot, objectiveId, doc);
  return { released: true, decision, workOrder };
}

module.exports = {
  WORK_ORDER_TERMINAL_STATES,
  isTerminalWorkOrderState,
  BLOCKED_WORK_ORDERS_FILE,
  blockedPath,
  loadBlocked,
  isWorkOrderBlocked,
  blockEntry,
  blockWorkOrder,
  classifyDispatchOutcome,
  releaseBlockedWorkOrder,
};
