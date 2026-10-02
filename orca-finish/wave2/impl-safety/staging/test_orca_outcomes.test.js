/**
 * Tests for orca_outcomes.js — OUTCOME_UNKNOWN fail-closed semantics.
 * Run: node --test lib/orca/test/
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const o = require('../orca_outcomes.js');

const BRANCH_OBJECTIVE_RUNTIME = '/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js';

function tryRequire(p) {
  try { return require(p); } catch { return null; }
}

const EVIDENCE_ACK = { kind: 'provider_ack', observedAt: '2026-09-23T19:00:00Z', detail: 'provider ack id ack-123' };
const EVIDENCE_NONE_DISPATCHED = { kind: 'no_dispatch_recorded', observedAt: '2026-09-23T19:00:00Z', detail: 'dispatch log empty' };

test('timeout AFTER an observed effect settles UNKNOWN, not FAILED, not retried', () => {
  const cls = o.classifyFailure({ dispatchObserved: true, ackObserved: true, lastObservedEvidence: EVIDENCE_ACK });
  assert.equal(cls, o.OUTCOMES.OUTCOME_UNKNOWN);
});

test('dispatch observed but no ack (cannot prove uncrossed) settles UNKNOWN', () => {
  const cls = o.classifyFailure({
    dispatchObserved: true, ackObserved: false,
    lastObservedEvidence: { kind: 'transport_ack', observedAt: '2026-09-23T19:00:00Z', detail: 'bytes left socket, no provider ack' },
  });
  assert.equal(cls, o.OUTCOMES.OUTCOME_UNKNOWN);
});

test('provably pre-boundary failure is FAILED (safe to requeue)', () => {
  const cls = o.classifyFailure({ dispatchObserved: false, ackObserved: false, lastObservedEvidence: EVIDENCE_NONE_DISPATCHED });
  assert.equal(cls, o.OUTCOMES.FAILED);
});

test('UNKNOWN without evidence citation is refused (evidence-free unknown closed)', () => {
  assert.throws(
    () => o.classifyFailure({ dispatchObserved: true, ackObserved: true, lastObservedEvidence: null }),
    o.ErrMissingEvidence
  );
  assert.throws(
    () => o.writeUnknown({ tenantId: 't1', attemptId: 'a1', effectId: 'e1', effectClass: o.EFFECT_CLASSES.TRANSACTIONAL, lastObservedEvidence: {} }),
    o.ErrMissingEvidence
  );
});

test('writeUnknown produces a terminal, non-replayed record citing evidence', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.AT_LEAST_ONCE_EXTERNAL,
    writerId: 'w1', lastObservedEvidence: EVIDENCE_ACK,
  });
  assert.equal(r.outcome, o.OUTCOMES.OUTCOME_UNKNOWN);
  assert.equal(r.replayed, false);
  assert.equal(r.lastObservedEvidence.kind, 'provider_ack');
  assert.equal(r.note, 'outcome is unknown and was not replayed');
});

test('blind retry of an UNKNOWN effect is a thrown error', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.TRANSACTIONAL, lastObservedEvidence: EVIDENCE_ACK,
  });
  assert.throws(() => o.retryEffect(r), (e) => {
    assert.ok(e instanceof o.ErrBlindRetry);
    assert.match(e.message, /reconcileUnknown/);
    return true;
  });
});

test('retry of FAILED (pre-boundary) is allowed; SUCCEEDED retry refused', () => {
  const r = o.retryEffect({ outcome: 'FAILED', effectId: 'e2' });
  assert.deepEqual(r, { retryable: true, effectId: 'e2' });
  assert.throws(() => o.retryEffect({ outcome: 'SUCCEEDED', effectId: 'e3' }), o.ErrBadRecord);
});

test('reconcileUnknown: verified present -> SUCCEEDED (verified, not claimed)', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.IDEMPOTENT_EXTERNAL, lastObservedEvidence: EVIDENCE_ACK,
  });
  const out = o.reconcileUnknown(r, {
    verifyWorld: () => ({ observed: true }), idempotencyKey: 'idem-1', reconcilerId: 'rec1',
  });
  assert.equal(out.outcome, o.OUTCOMES.SUCCEEDED);
  assert.equal(out.verified, true);
});

test('reconcileUnknown: verified absent -> FAILED, never silently SUCCEEDED', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.IDEMPOTENT_EXTERNAL, lastObservedEvidence: EVIDENCE_ACK,
  });
  const out = o.reconcileUnknown(r, {
    verifyWorld: () => ({ observed: false }), idempotencyKey: 'idem-1', reconcilerId: 'rec1',
  });
  assert.equal(out.outcome, o.OUTCOMES.FAILED);
  assert.equal(out.verified, true);
});

test('reconcileUnknown: inconclusive verification keeps UNKNOWN', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.TRANSACTIONAL, lastObservedEvidence: EVIDENCE_ACK,
  });
  const out = o.reconcileUnknown(r, {
    verifyWorld: () => { throw new Error('world unreadable'); }, reconcilerId: 'rec1',
  });
  assert.equal(out.outcome, o.OUTCOMES.OUTCOME_UNKNOWN);
});

test('reconcileUnknown requires idempotency key for idempotent-external effects', () => {
  const r = o.writeUnknown({
    tenantId: 't1', attemptId: 'a1', effectId: 'e1',
    effectClass: o.EFFECT_CLASSES.IDEMPOTENT_EXTERNAL, lastObservedEvidence: EVIDENCE_ACK,
  });
  assert.throws(() => o.reconcileUnknown(r, { verifyWorld: () => ({ observed: true }) }), o.ErrBadRecord);
});

test('recordStep: writer spoofing refused; tenant mandatory', () => {
  assert.throws(
    () => o.recordStep({ tenantId: 't1', writerId: 'mallory', stepOwner: 'worker-1', stepId: 's1', attemptId: 'a1', outcome: 'SUCCEEDED', effectClass: 'TRANSACTIONAL' }),
    o.ErrWriterMismatch
  );
  assert.throws(
    () => o.recordStep({ tenantId: '', writerId: 'w', stepOwner: 'w', stepId: 's1', attemptId: 'a1', outcome: 'SUCCEEDED', effectClass: 'TRANSACTIONAL' }),
    o.ErrBadRecord
  );
});

test('recordStep: at-least-once external success without idempotency key is labeled claim', () => {
  const r = o.recordStep({
    tenantId: 't1', writerId: 'w', stepOwner: 'w', stepId: 's1', attemptId: 'a1',
    outcome: 'SUCCEEDED', effectClass: o.EFFECT_CLASSES.AT_LEAST_ONCE_EXTERNAL,
  });
  assert.equal(r.verified, false);
  assert.match(r.claim, /claimed-done/);
});

// --- Branch integration: stable work_order_id as the idempotency key ---

const branchRuntime = tryRequire(BRANCH_OBJECTIVE_RUNTIME);

test('branch: deriveWorkOrderId is stable per (objective_id, task_key)',
  { skip: !branchRuntime ? 'branch worktree absent' : false }, () => {
    const k1 = o.idempotencyKeyFor(branchRuntime.deriveWorkOrderId, 'obj-1', 'task-a');
    const k2 = o.idempotencyKeyFor(branchRuntime.deriveWorkOrderId, 'obj-1', 'task-a');
    const k3 = o.idempotencyKeyFor(branchRuntime.deriveWorkOrderId, 'obj-1', 'task-b');
    assert.equal(k1, k2, 'restart rediscovers the same id: no duplicate effect identity');
    assert.notEqual(k1, k3, 'different tasks get different keys');
    assert.match(k1, /^[0-9a-f]{64}$/);
  });
