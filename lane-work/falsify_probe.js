'use strict';
// Falsification probe: feed deriveFailureRecord() execution results shaped by
// the REAL code paths (MissionRuntime.failWithRetry row transitions +
// MissionScheduler._dispatch P0-3 outcomes) and check the invariant holds:
// every field of the failure record is derivable from the result alone.
const assert = require('node:assert/strict');
const { deriveFailureRecord } = require('/home/nolan/ping/ping-runtime/orchestration/failure_record.js');

// Path A: _dispatch worker threw 'connection reset', failWithRetry exhausted (3/3) -> failed row.
const exhausted = deriveFailureRecord({
  mission: {
    mission_id: 'deadbeef00112233', mission_type: 'INVOICE_FOLLOWUP', status: 'failed',
    payload: { event_id: 'evt-77', event_type: 'INVOICE_SENT', correlation_id: 'corr-77' },
    result: null, assigned_to: 'observation', created_by: 'event-to-mission-bridge',
    created_at: '2026-09-24T09:00:00.000Z', started_at: '2026-09-24T09:00:01.000Z',
    completed_at: '2026-09-24T09:00:04.000Z', error: 'connection reset by peer',
    retries: 3, retry_at: null, lease_until: null, claimed_at: '2026-09-24T09:00:01.000Z',
  },
  dispatch: { outcome: 'worker_threw', worker: 'observation', error: 'connection reset by peer', effect_known: true },
  policy: { max_attempts: 3 },
  correlation_id: 'corr-77', causation_id: 'evt-77',
});
assert.equal(exhausted.outcome, 'failed');
assert.equal(exhausted.classification, 'DEPENDENCY_FAILURE');
assert.match(exhausted.self_heal, /dead-letter/);
assert.ok(exhausted.replay.payload_digest.length === 64);
console.log('PATH A (exhausted worker_threw) OK:', exhausted.failure_id, exhausted.classification, exhausted.outcome);

// Path B: lease expired, reaper reset to created, redispatch outcome unknown (worker hung, effect unknown).
const unknownHold = deriveFailureRecord({
  mission: {
    mission_id: 'cafef00d44556677', mission_type: 'ESTIMATE_PREPARE', status: 'running',
    payload: { event_id: 'evt-78', event_type: 'ESTIMATE_CREATED', correlation_id: 'corr-78' },
    result: null, assigned_to: 'observation', created_by: 'event-to-mission-bridge',
    created_at: '2026-09-24T09:10:00.000Z', started_at: '2026-09-24T09:10:01.000Z',
    completed_at: null, error: null, retries: 0, retry_at: null,
    lease_until: '2026-09-24T09:11:01.000Z', claimed_at: '2026-09-24T09:10:01.000Z',
  },
  dispatch: { outcome: 'unknown', worker: 'observation', error: 'no heartbeat for 300s; effect unknowable', effect_known: false },
  policy: { max_attempts: 3 },
  correlation_id: 'corr-78', causation_id: 'evt-78',
});
assert.equal(unknownHold.outcome, 'unknown_hold');
assert.equal(unknownHold.status, 'HOLD_RECONCILE');
assert.equal(unknownHold.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
assert.notEqual(unknownHold.outcome, 'failed');
console.log('PATH B (unknown hold) OK:', unknownHold.failure_id, unknownHold.classification, unknownHold.outcome);

// Path C: null dispatch (no worker matched) on first attempt -> retry scheduled, ELIGIBILITY_EMPTY.
const noWorker = deriveFailureRecord({
  mission: {
    mission_id: '0badf00d88990011', mission_type: 'REVIEW_RESPONSE', status: 'retry_pending',
    payload: { event_id: 'evt-79', event_type: 'REVIEW_RECEIVED', correlation_id: 'corr-79' },
    result: null, assigned_to: null, created_by: 'event-to-mission-bridge',
    created_at: '2026-09-24T09:20:00.000Z', started_at: '2026-09-24T09:20:01.000Z',
    completed_at: null, error: 'no worker matched event_type=REVIEW_RECEIVED',
    retries: 1, retry_at: '2026-09-24T09:20:06.000Z', lease_until: null, claimed_at: null,
  },
  dispatch: { outcome: 'no_worker', worker: null, error: 'no worker matched event_type=REVIEW_RECEIVED', effect_known: true },
  policy: { max_attempts: 3 },
  correlation_id: 'corr-79', causation_id: 'evt-79',
});
assert.equal(noWorker.outcome, 'retry_scheduled');
assert.equal(noWorker.classification, 'ELIGIBILITY_EMPTY');
console.log('PATH C (no_worker) OK:', noWorker.failure_id, noWorker.classification, noWorker.outcome);

// Dependency check: the module must not import any PING machinery (pure derivation).
const src = require('fs').readFileSync('/home/nolan/ping/ping-runtime/orchestration/failure_record.js', 'utf8');
const requires = [...src.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
assert.deepEqual(requires, ['crypto'], 'only node:crypto may be required');
console.log('DEPENDENCY CHECK OK: requires =', JSON.stringify(requires));

console.log('FALSIFICATION PROBE: all real-path derivations hold the invariant.');
