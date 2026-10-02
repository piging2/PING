'use strict';
/**
 * Red-phase tests for the FL-20260922-002 invariant:
 * IF A GOVERNED EXECUTION FAILS, THE EXECUTION RESULT ITSELF MUST BE
 * SUFFICIENT TO DERIVE THE FAILURE RECORD.
 *
 * These tests construct execution results shaped exactly like the real
 * machinery's outputs (ping_missions row + scheduler dispatch outcome +
 * governing retry policy) and assert that deriveFailureRecord() produces a
 * complete, deterministic, ledger-shaped failure record from the result alone.
 *
 * Run: node --test failure_record.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { deriveFailureRecord } = require('./failure_record.js');

// Fixture: a ping_missions row exactly as MissionRuntime.failWithRetry leaves it.
function missionRow(overrides = {}) {
  return {
    mission_id: 'a1b2c3d4e5f60718',
    mission_type: 'LEAD_FOLLOWUP',
    status: 'retry_pending',
    payload: { event_id: 'evt-9', event_type: 'LEAD_CREATED', correlation_id: 'corr-1' },
    result: null,
    assigned_to: 'observation',
    created_by: 'event-to-mission-bridge',
    created_at: '2026-09-24T10:00:00.000Z',
    started_at: '2026-09-24T10:00:05.000Z',
    completed_at: '2026-09-24T10:00:07.000Z',
    error: 'worker returned failed status',
    retries: 1,
    retry_at: '2026-09-24T10:00:12.000Z',
    lease_until: null,
    claimed_at: '2026-09-24T10:00:05.000Z',
    ...overrides,
  };
}

function execResult(overrides = {}) {
  return {
    mission: missionRow(),
    dispatch: { outcome: 'worker_failed', worker: 'observation', error: 'worker returned failed status', effect_known: true },
    policy: { max_attempts: 3 },
    correlation_id: 'corr-1',
    causation_id: 'evt-9',
    ...overrides,
  };
}

const REQUIRED_KEYS = [
  'failure_id', 'first_seen', 'system', 'lane', 'what_failed', 'evidence',
  'failure_reason', 'classification', 'outcome', 'self_heal', 'replay', 'status',
];

test('invariant: every required field is derivable from the execution result alone', () => {
  const rec = deriveFailureRecord(execResult(), { now: '2026-09-24T10:00:07.000Z' });
  for (const k of REQUIRED_KEYS) {
    assert.ok(rec[k] !== undefined && rec[k] !== null, `field ${k} must be populated`);
  }
  // JSON round-trip must not silently drop undefined fields.
  const rt = JSON.parse(JSON.stringify(rec));
  for (const k of REQUIRED_KEYS) {
    assert.ok(rt[k] !== undefined, `field ${k} survived JSON round-trip`);
  }
});

test('invariant: derivation is deterministic (same result -> byte-identical record)', () => {
  const input = execResult();
  const a = JSON.stringify(deriveFailureRecord(input, { now: '2026-09-24T10:00:07.000Z' }));
  const b = JSON.stringify(deriveFailureRecord(input, { now: '2026-09-24T10:00:07.000Z' }));
  assert.equal(a, b);
});

test('invariant: failure_id is derived, never minted (stable across input key order)', () => {
  const r1 = execResult();
  const r2 = { policy: r1.policy, dispatch: r1.dispatch, mission: r1.mission, causation_id: r1.causation_id, correlation_id: r1.correlation_id };
  const a = deriveFailureRecord(r1, { now: '2026-09-24T10:00:07.000Z' });
  const b = deriveFailureRecord(r2, { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(a.failure_id, b.failure_id);
  assert.match(a.failure_id, /^fl-[0-9a-f]{12}$/);
});

test('exhausted failure -> outcome failed, DLQ routing in self_heal', () => {
  const rec = deriveFailureRecord(execResult({
    mission: missionRow({ status: 'failed', retries: 3, retry_at: null }),
    dispatch: { outcome: 'worker_threw', worker: 'observation', error: 'connection reset by peer', effect_known: true },
  }), { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec.outcome, 'failed');
  assert.equal(rec.status, 'OPEN');
  assert.match(rec.self_heal, /dead-letter/);
  assert.equal(rec.failure_reason, 'network');
  assert.equal(rec.classification, 'DEPENDENCY_FAILURE');
});

test('non-exhausted failure -> retry scheduled, never failed', () => {
  const rec = deriveFailureRecord(execResult(), { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec.outcome, 'retry_scheduled');
  assert.equal(rec.status, 'OPEN');
  assert.match(rec.self_heal, /attempt 2\/3/);
});

test('standing law: unknown outcome NEVER resolves to failed', () => {
  const rec = deriveFailureRecord(execResult({
    mission: missionRow({ status: 'running', error: null, completed_at: null }),
    dispatch: { outcome: 'unknown', worker: 'observation', error: 'dispatch timed out after 30000ms', effect_known: false },
  }), { now: '2026-09-24T10:05:00.000Z' });
  assert.equal(rec.outcome, 'unknown_hold');
  assert.equal(rec.status, 'HOLD_RECONCILE');
  assert.equal(rec.classification, 'UNKNOWN_EXECUTION');
  assert.equal(rec.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.notEqual(rec.outcome, 'failed');
  assert.match(rec.self_heal, /no automatic retry/i);
});

test('no worker matched -> ELIGIBILITY_EMPTY (config gap, not a worker failure)', () => {
  const rec = deriveFailureRecord(execResult({
    dispatch: { outcome: 'no_worker', worker: null, error: 'no worker matched event_type=LEAD_CREATED', effect_known: true },
  }), { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec.classification, 'ELIGIBILITY_EMPTY');
  assert.match(rec.what_failed, /no matching worker/);
});

test('MC-28: reason -> ledger classification mapping is total and documented', () => {
  const cases = [
    ['timeout', 'dispatch timed out', 'TEMPORARY_FAILURE'],
    ['network', 'connection reset by peer', 'DEPENDENCY_FAILURE'],
    ['rate_limit', 'rate limit exceeded (429)', 'RATE_LIMIT'],
    ['authorization', 'authorization denied for tenant', 'AUTH_FAILURE'],
    ['validation', 'invalid payload: missing documentId', 'TERMINAL_FAILURE'],
    ['constraint', 'duplicate key value violates unique constraint', 'TERMINAL_FAILURE'],
    ['not_found', 'worker not found in registry', 'TERMINAL_FAILURE'],
  ];
  for (const [reason, error, classification] of cases) {
    const rec = deriveFailureRecord(execResult({
      mission: missionRow({ status: 'failed', retries: 3, retry_at: null, error }),
      dispatch: { outcome: 'worker_failed', worker: 'observation', error, effect_known: true },
    }), { now: '2026-09-24T10:00:07.000Z' });
    assert.equal(rec.failure_reason, reason, `reason for: ${error}`);
    assert.equal(rec.classification, classification, `classification for: ${error}`);
  }
});

test('missing error text does not invent one; evidence marks the gap', () => {
  const rec = deriveFailureRecord(execResult({
    mission: missionRow({ error: null }),
    dispatch: { outcome: 'worker_failed', worker: 'observation', error: null, effect_known: true },
  }), { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec.evidence.error, null);
  assert.match(rec.what_failed, /no error text recorded/);
  assert.ok(REQUIRED_KEYS.every((k) => rec[k] !== undefined && rec[k] !== null));
});

test('fail-closed: missing mission identity throws a typed error, never a partial record', () => {
  assert.throws(() => deriveFailureRecord({ dispatch: { outcome: 'worker_failed', effect_known: true } }),
    (e) => e instanceof TypeError && /mission_id/.test(e.message));
  assert.throws(() => deriveFailureRecord(execResult({ dispatch: { outcome: 'ok', effect_known: true } })),
    (e) => e instanceof TypeError && /not a failure/.test(e.message));
  assert.throws(() => deriveFailureRecord(execResult({ dispatch: { outcome: 'succeeded-ish', effect_known: true } })),
    (e) => e instanceof TypeError && /unknown dispatch outcome/.test(e.message));
});

test('replay block carries exact reproduction inputs, incl. payload digest', () => {
  const rec = deriveFailureRecord(execResult(), { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec.replay.mission_id, 'a1b2c3d4e5f60718');
  assert.equal(rec.replay.mission_type, 'LEAD_FOLLOWUP');
  assert.match(rec.replay.payload_digest, /^[0-9a-f]{64}$/);
  assert.equal(rec.replay.worker, 'observation');
  // Same payload in different key order -> same digest (canonical JSON).
  const reordered = execResult({ mission: missionRow({ payload: { correlation_id: 'corr-1', event_type: 'LEAD_CREATED', event_id: 'evt-9' } }) });
  const rec2 = deriveFailureRecord(reordered, { now: '2026-09-24T10:00:07.000Z' });
  assert.equal(rec2.replay.payload_digest, rec.replay.payload_digest);
});
