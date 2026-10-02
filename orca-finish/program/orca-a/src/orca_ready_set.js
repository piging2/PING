'use strict';
/**
 * orca_ready_set.js — dependency-determined ready work (mechanism-map
 * record 3, O-4 ADAPT).
 *
 * Lane W2-IMPL-STATE (ORCA FINISH, Wave 2). New file; the branch
 * `feature/orca-autonomy` is read-only for this lane.
 *
 * The query is the mechanism: dependency edges as data, a pure function
 * deciding readiness. No scheduler import. A work order is ready (claimable
 * for dispatch) when ALL of the following hold:
 *   1. it is in a claimable state: AUTHORIZED — neither terminally
 *      completed (COMPLETED, FAILED, VERIFICATION_FAILED, BLOCKED,
 *      CANCELLED) nor already in flight (RUNNING). Re-claiming a RUNNING
 *      work order would double-dispatch; the branch's delegate() refuses
 *      exactly that ("refusing to redispatch while an attempt may be in
 *      flight", orca_control_loop.js). Unknown states are never claimable
 *      (fail closed).
 *   2. every work order named in its `depends_on` list is in
 *      terminal-success (durable state COMPLETED);
 *   3. it is not in the unresolved-unknown set (a work order whose latest
 *      attempt crossed a side-effect boundary and was classified
 *      OUTCOME_UNKNOWN must never be auto-claimed or auto-unblocked;
 *      replacement requires an explicit decision or idempotent-keyed
 *      reconcile — mechanism-map record 8).
 *
 * Input shape (duck-typed; works over the branch's durable work-order
 * records as returned by objective-runtime.listWorkOrders):
 *   { work_order_id: string, state: string, depends_on?: string[] }
 *
 * Degradation rules (fail closed, never hang):
 *   - missing dependency row  -> not ready (unknown is not success);
 *   - self-dependency         -> not ready;
 *   - dependency cycle        -> the cycle never becomes ready (safe
 *     deadlock: no wrong execution, no infinite loop);
 *   - work order without `depends_on` -> treated as no dependencies.
 */

const SETTLED_WORK_ORDER_STATES = Object.freeze([
  'COMPLETED',
  'FAILED',
  'VERIFICATION_FAILED',
  'BLOCKED',
  'CANCELLED',
]);

// The only state a work order can be claimed from. The branch's
// reconcileRunningWorkOrder returns lost attempts to AUTHORIZED before a new
// attempt may dispatch, confirming AUTHORIZED is the claimable state.
const CLAIMABLE_WORK_ORDER_STATES = Object.freeze(['AUTHORIZED']);

const TERMINAL_SUCCESS_STATE = 'COMPLETED';

function isSettled(state) {
  return SETTLED_WORK_ORDER_STATES.includes(state);
}

function isClaimable(state) {
  return CLAIMABLE_WORK_ORDER_STATES.includes(state);
}

/**
 * Pure ready-set query.
 * @param {Array<Object>} workOrders - durable work-order records
 * @param {Object} [opts]
 * @param {Array<string>} [opts.blockedWorkOrderIds] - work orders with an
 *   unresolved OUTCOME_UNKNOWN attempt: never ready until reconciled
 * @returns {Array<Object>} the ready work orders (input order preserved)
 */
function readyWorkOrders(workOrders, opts = {}) {
  const blocked = new Set(
    Array.isArray(opts.blockedWorkOrderIds) ? opts.blockedWorkOrderIds : []
  );
  const byId = new Map();
  for (const w of workOrders || []) {
    if (w && typeof w.work_order_id === 'string') byId.set(w.work_order_id, w);
  }
  const ready = [];
  for (const w of workOrders || []) {
    if (!w || typeof w.work_order_id !== 'string') continue;
    if (!isClaimable(w.state)) continue;              // (1) claimable only
    if (blocked.has(w.work_order_id)) continue;       // (3) unresolved unknown
    const deps = Array.isArray(w.depends_on) ? w.depends_on : [];
    let satisfied = true;
    for (const depId of deps) {                           // (2) deps terminal-success
      const dep = byId.get(depId);
      if (!dep || dep.state !== TERMINAL_SUCCESS_STATE) {
        satisfied = false;
        break;
      }
    }
    if (satisfied) ready.push(w);
  }
  return ready;
}

module.exports = {
  SETTLED_WORK_ORDER_STATES,
  CLAIMABLE_WORK_ORDER_STATES,
  TERMINAL_SUCCESS_STATE,
  isSettled,
  isClaimable,
  readyWorkOrders,
};
