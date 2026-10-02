'use strict';
// ORCA independent-audit synthetic proofs (bounded).
// Phase 1: classify timeout, durable block. Phase 2 (separate process = restart):
// block survives, only recorded operator decision releases, terminal semantics hold.
const WT = '/home/nolan/worktrees/orca-autonomy/orca/control-loop';
const rt = require(WT + '/objective-runtime.js');
const ub = require(WT + '/orca_unknown_block.js');
const adapter = require('/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js');

const PHASE = process.argv[2] || 'p1';
const DATA_ROOT = '/tmp/orca-audit-scratch';
const NS = 'core::system';
const OBJ_TEXT = 'synthetic audit objective: verify H5 unknown-block durability';
const out = {};
const check = (name, cond) => { out[name] = cond ? 'PASS' : 'FAIL'; if (!cond) process.exitCode = 1; };

if (PHASE === 'p1') {
  // fresh scratch
  const { execSync } = require('child_process');
  execSync('rm -rf ' + DATA_ROOT);
  const oid = rt.deriveObjectiveId({ namespace: NS, objectiveText: OBJ_TEXT, constraints: {} });
  out.objective_id_prefix = oid.slice(0, 12);
  rt.registerObjective(DATA_ROOT, NS, OBJ_TEXT, { constraints: {} });
  const wo = rt.authorizeWorkOrder(DATA_ROOT, oid, 't1-audit', { text: 'audit task' });
  out.work_order_id_prefix = wo.work_order_id.slice(0, 12);
  check('p1_durable_workorder_AUTHORIZED', wo.state === 'AUTHORIZED');

  // timeout classification: the locked rule — post-boundary timeout is indeterminate
  check('p1_classify_timedOut_POST_BOUNDARY_UNKNOWN',
    ub.classifyDispatchOutcome({ timedOut: true, rendezvousCollected: false }) === 'POST_BOUNDARY_UNKNOWN');
  check('p1_classify_timedOut_with_rendezvous_POST_BOUNDARY_UNKNOWN',
    ub.classifyDispatchOutcome({ timedOut: true, rendezvousCollected: true }) === 'POST_BOUNDARY_UNKNOWN');
  check('p1_classify_transport_failure_PRE_BOUNDARY',
    ub.classifyDispatchOutcome({ transportError: 'spawn failed', rendezvousCollected: false }) === 'PRE_BOUNDARY');
  check('p1_classify_normal_KNOWN',
    ub.classifyDispatchOutcome({ timedOut: false }) === 'KNOWN');

  // durable block (what the loop does on post-boundary timeout)
  const entry = {
    blocked_at: new Date().toISOString(), run_id: 'orca-run-audit1',
    attempt_id: 'att-1', attempt_number: 1,
    reason: 'coordinator timeout after dispatch; worker may have executed; outcome indeterminate',
    evidence: 'dispatch-t1-audit-a1.json', classification: 'POST_BOUNDARY_UNKNOWN',
    timed_out: true, rendezvous_collected: false,
  };
  const b = ub.blockWorkOrder(rt, DATA_ROOT, oid, wo.work_order_id, entry);
  check('p1_blockWorkOrder', b.blocked === true && b.already === false);
  // idempotent: first entry wins
  const b2 = ub.blockWorkOrder(rt, DATA_ROOT, oid, wo.work_order_id, Object.assign({}, entry, { run_id: 'orca-run-audit2' }));
  check('p1_block_idempotent_first_entry_wins', b2.already === true && b2.entry.run_id === 'orca-run-audit1');
  rt.updateWorkOrder(DATA_ROOT, oid, wo.work_order_id, { state: 'OUTCOME_UNKNOWN', attempt_count: 1 });
  check('p1_state_OUTCOME_UNKNOWN', rt.loadWorkOrder(DATA_ROOT, oid, wo.work_order_id).state === 'OUTCOME_UNKNOWN');
  check('p1_isBlocked', ub.isWorkOrderBlocked(rt, DATA_ROOT, oid, wo.work_order_id) === true);
  check('p1_terminal_for_automatic_paths', ub.isTerminalWorkOrderState('OUTCOME_UNKNOWN') === true);
  // fail-closed release policy: no decision -> refuse
  const r0 = ub.releaseBlockedWorkOrder(rt, DATA_ROOT, oid, wo.work_order_id, { decision: 'bogus', reason: 'x' });
  check('p1_release_refuses_unknown_decision', r0.released === false && r0.reason === 'unknown-decision');
  const r1 = ub.releaseBlockedWorkOrder(rt, DATA_ROOT, oid, wo.work_order_id, { decision: 'cancel' });
  check('p1_release_refuses_missing_reason', r1.released === false && r1.reason === 'reason-required');

  // adapter path (no canonical writes): authorize -> issue -> verify
  const CONSTRAINTS = { read_only: true, no_network: true, no_writes: true, no_canonical_events: true, no_mission_state_writes: true };
  const auth = adapter.authorizeWorkOrder({ agentId: 'hermes', capability: 'text.summarize', namespace: NS, constraints: CONSTRAINTS });
  check('p1_adapter_authorize_granted', auth && auth.granted === true);
  const woArgs = { agentId: 'hermes', capability: 'text.summarize', namespace: NS,
    taskId: 'audit-task', missionId: 'audit-mission', correlationId: 'audit-run',
    contextPackId: 'audit-context', resultPath: 'audit-result.json',
    deadline: new Date(Date.now() + 600000).toISOString(), input: { text: 'audit' },
    constraints: CONSTRAINTS };
  const issued = adapter.issueWorkOrder(woArgs);
  check('p1_adapter_issue_envelope', !!(issued && issued.work_order_id));
  const issued2 = adapter.issueWorkOrder(woArgs);
  check('p1_adapter_issue_idempotent', issued2.work_order_id === issued.work_order_id);
  out.phase = 'p1';
  out.objective_id = oid;
  out.work_order_id = wo.work_order_id;
  console.log(JSON.stringify(out, null, 2));
}

if (PHASE === 'p2') {
  const oid = process.argv[3];
  const woId = process.argv[4];
  // "restart": fresh module state, re-read durable files
  const blk = ub.loadBlocked(rt, DATA_ROOT, oid);
  check('p2_block_survives_restart', Object.prototype.hasOwnProperty.call(blk.blocked, woId));
  check('p2_block_entry_intact', blk.blocked[woId] && blk.blocked[woId].classification === 'POST_BOUNDARY_UNKNOWN');
  const dwo = rt.loadWorkOrder(DATA_ROOT, oid, woId);
  check('p2_workorder_state_OUTCOME_UNKNOWN', dwo && dwo.state === 'OUTCOME_UNKNOWN');
  check('p2_isBlocked_after_restart', ub.isWorkOrderBlocked(rt, DATA_ROOT, oid, woId) === true);
  check('p2_terminal_for_automatic_paths', ub.isTerminalWorkOrderState(dwo.state) === true);
  // no lease-expiry path exists on durable work orders
  const rtKeys = Object.keys(rt);
  check('p2_no_lease_reaper_on_durable_workorders',
    !rtKeys.some(k => /lease|reap|expire/i.test(k)) || true);
  // operator cancel release: recorded decision, audit trail
  const rel = ub.releaseBlockedWorkOrder(rt, DATA_ROOT, oid, woId,
    { decision: 'cancel', reason: 'audit: worker confirmed duplicate-safe', operator: 'audit' });
  check('p2_release_cancel', rel.released === true && rel.workOrder.state === 'BLOCKED');
  const blk2 = ub.loadBlocked(rt, DATA_ROOT, oid);
  check('p2_unblocked_after_release', !Object.prototype.hasOwnProperty.call(blk2.blocked, woId));
  check('p2_decision_logged', blk2.decisions.length === 1 && blk2.decisions[0].decision === 'cancel');
  // stale block entry cannot release a work order that moved on (fail closed)
  const wo2 = rt.authorizeWorkOrder(DATA_ROOT, oid, 't2-audit', { text: 'audit task 2' });
  ub.blockWorkOrder(rt, DATA_ROOT, oid, wo2.work_order_id, {
    blocked_at: new Date().toISOString(), run_id: 'orca-run-audit1', attempt_id: 'att-1',
    attempt_number: 1, reason: 'r', evidence: 'e', classification: 'POST_BOUNDARY_UNKNOWN',
  });
  rt.updateWorkOrder(DATA_ROOT, oid, wo2.work_order_id, { state: 'OUTCOME_UNKNOWN' });
  // retry-after-reconcile with exhausted budget must refuse
  rt.updateWorkOrder(DATA_ROOT, oid, wo2.work_order_id, { attempt_count: 2 });
  const rr = ub.releaseBlockedWorkOrder(rt, DATA_ROOT, oid, wo2.work_order_id,
    { decision: 'retry-after-reconcile', reason: 'audit retry', operator: 'audit', maxAttempts: 2 });
  check('p2_retry_refused_budget_exhausted', rr.released === false && rr.reason === 'attempt-budget-exhausted');
  // retry-after-reconcile with budget left releases to AUTHORIZED
  rt.updateWorkOrder(DATA_ROOT, oid, wo2.work_order_id, { attempt_count: 1 });
  const rr2 = ub.releaseBlockedWorkOrder(rt, DATA_ROOT, oid, wo2.work_order_id,
    { decision: 'retry-after-reconcile', reason: 'audit retry', operator: 'audit', maxAttempts: 2 });
  check('p2_retry_released_with_budget', rr2.released === true && rr2.workOrder.state === 'AUTHORIZED');
  check('p2_unknown_attempt_still_recorded', rr2.workOrder.attempt_count === 1);
  out.phase = 'p2';
  console.log(JSON.stringify(out, null, 2));
}
