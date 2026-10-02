'use strict';
/**
 * Regression tests — F-01 bounded retry repair + stuck-running watchdog.
 *
 * F-01 (reproduced against pristine HEAD in /tmp/f01-repro.js): a mission
 * whose worker threw entered retry_pending, and every subsequent poll
 * re-dispatched it to the worker with ZERO state progress — retries frozen
 * at 1, exhaustion unreachable, infinite identical re-execution. Root cause
 * chain:
 *   1. getPending() returned due retry_pending rows directly;
 *   2. _dispatch() ignored assign()'s rowCount, so the P0-1 conditional claim
 *      never gated dispatch (assign/start silently no-opped on the row);
 *   3. failWithRetry()'s retry-branch UPDATE matched only
 *      status IN ('running','assigned'), so a failure recorded against an
 *      already-retry_pending row updated zero rows — the counter never moved.
 *
 * These tests prove the repaired behavior: retries make state progress
 * (attempt counting, backoff gates, terminal exhaustion), dispatch is
 * claim-gated, dispatch timeouts and stuck-running missions PARK durably as
 * HOLD (never FAILED on timeout), lease expiry never turns an unknown-outcome
 * mission back into created, and the fail path derives failure records for
 * KNOWN outcomes via the proven derivation (Nolan 2026-09-24: the human word
 * arrived — the derivation is wired through the proven F-01 state model, and
 * the fail path still never emits HOLD reconciliations).
 *
 * Constitutional PARK/HOLD (Nolan 2026-09-24): DISPATCHED → outcome uncertain
 * → PARKED/HOLD → reconciliation → proven-safe decision. TIMEOUT != FAILED.
 * No automatic re-execution after UNKNOWN unless the exact operation carries
 * a proven idempotency contract.
 *
 * Run: node --test mission_scheduler.retry_watchdog.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { MissionRuntime } = require('./mission_runtime.js');
const { MissionScheduler } = require('./mission_scheduler.js');

// ── Controllable clock ──────────────────────────────────────────────
// Both the fake pool's NOW() and the runtime's Date.now() (retry_at,
// started_at, ...) follow this clock. It is reset for every harness so
// time advances in one test never leak into the next.
let fakeNow = Date.now();
const realDateNow = Date.now;
Date.now = () => fakeNow;
const iso = () => new Date(fakeNow).toISOString();

class FakePool {
  constructor() { this.missions = new Map(); }
  _inList(sql) {
    const m = sql.match(/status IN \(([^)]+)\)/);
    return m ? m[1].split(',').map(s => s.trim().replace(/'/g, '')) : null;
  }
  async query(sql, params = []) {
    const S = sql.replace(/\s+/g, ' ').trim();
    if (/^(CREATE|ALTER)/.test(S)) return { rows: [], rowCount: 0 };
    const byId = (id) => this.missions.get(id);

    if (S.includes('INSERT INTO ping_missions')) {
      const id = params[0];
      if (this.missions.has(id)) return { rows: [], rowCount: 0 };
      this.missions.set(id, {
        mission_id: id, mission_type: params[1], payload: params[2],
        priority: params[3] || 0, created_by: params[4] || null,
        status: 'created', result: null, assigned_to: null,
        created_at: iso(), started_at: null, completed_at: null,
        error: null, retries: 0, retry_at: null, lease_until: null, claimed_at: null,
        hold_record: null,
      });
      return { rows: [], rowCount: 1 };
    }
    if (S.includes('SELECT retries FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ retries: m.retries }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT started_at FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ started_at: m.started_at }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT * FROM ping_missions') && S.includes('WHERE mission_id')) {
      const m = byId(params[0]);
      return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes("SET status = 'assigned'")) {
      const m = byId(params[1]);
      if (!m || m.status !== 'created') return { rows: [], rowCount: 0 };
      m.status = 'assigned'; m.assigned_to = params[0];
      m.claimed_at = iso(); m.lease_until = new Date(fakeNow + 60000).toISOString();
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    if (S.includes("SET status = 'running'")) {
      const m = byId(params[0]);
      if (!m || m.status !== 'assigned') return { rows: [], rowCount: 0 };
      m.status = 'running'; m.started_at = iso();
      return { rows: [], rowCount: 1 };
    }
    if (S.includes("SET status = 'completed'")) {
      const m = byId(params[1]);
      if (!m || m.status !== 'running') return { rows: [], rowCount: 0 };
      m.status = 'completed'; m.result = params[0]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    if (S.includes("SET status = 'retry_pending'")) {
      const m = byId(params[3]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'retry_pending'; m.error = params[0]; m.retries = params[1]; m.retry_at = params[2];
      return { rows: [], rowCount: 1 };
    }
    if (S.includes("SET status = 'failed'") && S.includes('retries')) {
      const m = byId(params[2]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'failed'; m.error = params[0]; m.retries = params[1]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // reconcileHold('fail'): hold -> failed (constitutional PARK/HOLD exit).
    // Placed before the generic 'failed' handlers: params[0] is the mission id here.
    if (S.includes("SET status = 'failed'") && S.includes("status = 'hold'")) {
      const m = byId(params[0]);
      if (!m || m.status !== 'hold') return { rows: [], rowCount: 0 };
      m.status = 'failed'; m.error = params[1]; m.completed_at = iso();
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    if (S.includes("SET status = 'failed'")) {
      const m = byId(params[1]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'failed'; m.error = params[0]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // parkHold(): running/assigned -> hold (durable PARK). Conditional: only
    // active rows park; a second park on status='hold' parks zero rows.
    if (S.includes("SET status = 'hold'")) {
      const m = byId(params[0]);
      if (!m || !['running', 'assigned'].includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'hold'; m.hold_record = params[1]; m.lease_until = null;
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    // reclaimRetryPending(): retry_pending + due retry_at -> created (retries kept)
    // reconcileHold('retry'): hold -> created. Placed before reclaim: the SQL
    // also sets retry_at = NULL, so match the hold predicate first.
    if (S.includes("SET status = 'created'") && S.includes("status = 'hold'")) {
      const m = byId(params[0]);
      if (!m || m.status !== 'hold') return { rows: [], rowCount: 0 };
      m.status = 'created'; m.assigned_to = null; m.lease_until = null;
      m.claimed_at = null; m.retry_at = null;
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    if (S.includes("SET status = 'created'") && S.includes('retry_at = NULL')) {
      const out = [];
      for (const m of this.missions.values()) {
        if (m.status === 'retry_pending' && m.retry_at && Date.parse(m.retry_at) <= fakeNow) {
          m.status = 'created'; m.assigned_to = null; m.lease_until = null;
          m.claimed_at = null; m.retry_at = null;
          out.push({ mission_id: m.mission_id });
        }
      }
      return { rows: out, rowCount: out.length };
    }
    // reapExpiredLeases(): constitutional PARK/HOLD narrowing — ONLY
    // "abandoned, known not to have started" (assigned + started_at IS NULL +
    // expired lease) returns to created. A mission that reached 'running' may
    // have produced an external effect: lease expiry NEVER resets it.
    if (S.includes("SET status = 'created'")) {
      const out = [];
      const narrowed = S.includes('started_at IS NULL');
      for (const m of this.missions.values()) {
        if (narrowed) {
          if (m.status === 'assigned' && !m.started_at && m.lease_until && Date.parse(m.lease_until) < fakeNow) {
            m.status = 'created'; m.assigned_to = null; m.lease_until = null;
            m.claimed_at = null; m.retry_at = iso();
            out.push({ mission_id: m.mission_id });
          }
        } else if (['running', 'assigned'].includes(m.status) && m.lease_until && Date.parse(m.lease_until) < fakeNow) {
          m.status = 'created'; m.assigned_to = null; m.lease_until = null;
          m.claimed_at = null; m.retry_at = iso();
          out.push({ mission_id: m.mission_id });
        }
      }
      return { rows: out, rowCount: out.length };
    }
    if (S.includes('SET lease_until = NOW()')) {
      const m = byId(params[1]);
      if (!m || !['running', 'assigned'].includes(m.status) || !m.lease_until) return { rows: [], rowCount: 0 };
      m.lease_until = new Date(fakeNow + params[0] * 1000).toISOString();
      return { rows: [], rowCount: 1 };
    }
    // findStuckRunning()
    if (S.includes('COALESCE(started_at')) {
      const cutoff = Date.parse(params[0]);
      const rows = [...this.missions.values()].filter(m =>
        ['running', 'assigned'].includes(m.status) &&
        Date.parse(m.started_at || m.claimed_at || m.created_at) < cutoff);
      return { rows, rowCount: rows.length };
    }
    // findOrphanedRunning(): running (effect unknown) + expired lease.
    // These escalate to HOLD — never back to created.
    if (S.includes('started_at IS NOT NULL')) {
      const rows = [...this.missions.values()].filter(m =>
        ['running', 'assigned'].includes(m.status) &&
        m.started_at && m.lease_until && Date.parse(m.lease_until) < fakeNow);
      return { rows, rowCount: rows.length };
    }
    // getPending(): created ONLY (repaired semantics)
    if (S.includes('WHERE status =') && S.includes('LIMIT')) {
      const limit = params[0] || 10;
      const rows = [...this.missions.values()]
        .filter(m => m.status === 'created')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, limit);
      return { rows, rowCount: rows.length };
    }
    throw new Error(`FakePool: unhandled SQL: ${S.slice(0, 140)}`);
  }
}

function makeHarness(opts = {}) {
  fakeNow = realDateNow(); // fresh clock per harness — no cross-test leakage
  const pool = new FakePool();
  const emitted = [];
  const eventRuntime = {
    emitted,
    async emit(type, source, payload = {}) { emitted.push({ type, source, payload }); return { status: 'ok' }; },
  };
  const harness = { pool, events: eventRuntime, workerInvocations: 0, dlqRecords: [] };
  const behaviors = {
    throwing: async () => { harness.workerInvocations++; throw new Error('worker boom'); },
    hanging: () => { harness.workerInvocations++; return new Promise(() => {}); },
    ok: async () => { harness.workerInvocations++; return { status: 'ok' }; },
  };
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    dispatch: behaviors[opts.worker || 'throwing'],
  };
  const deadLetterAuthority = {
    async recordDeadLetter(job, error) {
      harness.dlqRecords.push({ job, error: String((error && error.message) || error) });
    },
  };
  const mr = new MissionRuntime({ pool, eventRuntime });
  const sched = new MissionScheduler({
    missionRuntime: mr,
    workerRuntime,
    eventRuntime,
    deadLetterAuthority,
    retryPolicy: opts.retryPolicy || { max_attempts: 3, backoff_delay_ms: 5000 },
    pollIntervalMs: 3600000, // manual _poll() only
    dispatchTimeoutMs: opts.dispatchTimeoutMs,
    stuckThresholdMs: opts.stuckThresholdMs,
  });
  harness.mr = mr;
  harness.sched = sched;
  harness.advance = (ms) => { fakeNow += ms; };
  harness.now = () => fakeNow;
  return harness;
}

function holds(h) {
  return h.events.emitted.filter(e => e.type === 'MISSION_RECONCILE_HOLD');
}

// ── F-01: bounded retry ─────────────────────────────────────────────

test('F-01: retries make state progress — counted attempts, backoff gates, terminal exhaustion', async () => {
  const h = makeHarness({ worker: 'throwing', retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 } });
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t1', event_type: 'LEAD_CREATED', correlation_id: 'corr-t1',
  });

  // Attempt 1: created -> assigned -> running -> throw -> retry_pending
  await h.sched._poll();
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 1);
  assert.equal(h.workerInvocations, 1);

  // Backoff gate holds: a poll before retry_at does NOT re-dispatch
  await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'no re-dispatch before the backoff gate elapses');
  assert.equal(h.pool.missions.get(id).status, 'retry_pending');

  // Attempt 2 (past backoff): reclaim -> created -> claim -> dispatch -> throw
  h.advance(6000);
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 2, 'attempt counter advanced — state progress');
  assert.equal(h.workerInvocations, 2);

  // Attempt 3 (past backoff): exhaustion -> failed + DLQ
  h.advance(6000);
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'failed', 'terminal state reached');
  assert.equal(m.retries, 3);
  assert.equal(h.workerInvocations, 3, 'worker invoked exactly once per attempt — no infinite re-execution');
  assert.equal(h.dlqRecords.length, 1);
  assert.equal(h.dlqRecords[0].job.job_id, id);

  // Terminal: further polls never touch it again
  h.advance(60000);
  await h.sched._poll();
  assert.equal(h.workerInvocations, 3);
  assert.equal(h.pool.missions.get(id).status, 'failed');

  // Re-entry was observable: one MISSION_RETRY_RECLAIMED per reclaimed attempt
  const reclaims = h.events.emitted.filter(e => e.type === 'MISSION_RETRY_RECLAIMED');
  assert.equal(reclaims.length, 2);
});

test('F-01: _dispatch never invokes the worker for a non-claimable row', async () => {
  const h = makeHarness({ worker: 'throwing' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t2', event_type: 'LEAD_CREATED' });
  // A concurrent scheduler wins the claim first; this scheduler holds a stale snapshot.
  assert.equal(await h.mr.assign(id, 'other-scheduler'), 1);
  const staleRow = {
    mission_id: id, mission_type: 'LEAD_FOLLOWUP', status: 'created',
    payload: JSON.stringify({ event_id: 'evt-t2', event_type: 'LEAD_CREATED' }),
    priority: 0, created_at: iso(),
  };
  await h.sched._dispatch(staleRow);
  assert.equal(h.workerInvocations, 0, 'worker must not run when the claim guard rejects the row');
  assert.equal(h.sched.getStats().skipped, 1);
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'assigned');
  assert.equal(m.assigned_to, 'other-scheduler');
});

test('F-01: failWithRetry on an already-retry_pending row advances the counter (no silent no-op)', async () => {
  const h = makeHarness({ worker: 'throwing' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t7', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  await h.mr.start(id);
  await h.mr.failWithRetry(id, 'boom', { max_attempts: 5, backoff_delay_ms: 5000 });
  // A second failure recorded directly against the retry_pending row (the old F-01 shape)
  const next = await h.mr.failWithRetry(id, 'boom again', { max_attempts: 5, backoff_delay_ms: 5000 });
  assert.equal(next, 2);
  const m = h.pool.missions.get(id);
  assert.equal(m.retries, 2, 'every failure makes state progress');
  assert.equal(m.status, 'retry_pending');
});

test('reclaimRetryPending: backoff-gated re-entry, attempt counting preserved', async () => {
  const h = makeHarness({ worker: 'throwing', retryPolicy: { max_attempts: 5, backoff_delay_ms: 5000 } });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t6', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  await h.mr.start(id);
  await h.mr.failWithRetry(id, 'boom', { max_attempts: 5, backoff_delay_ms: 5000 });
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 1);

  assert.equal(await h.mr.reclaimRetryPending(), 0, 'nothing reclaimed before the backoff gate');
  assert.equal(h.pool.missions.get(id).status, 'retry_pending');

  h.advance(6000);
  assert.equal(await h.mr.reclaimRetryPending(), 1);
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'created');
  assert.equal(m.retries, 1, 'attempt counting persists across reclaims');
  assert.equal(m.retry_at, null);
  assert.equal(h.events.emitted.filter(e => e.type === 'MISSION_RETRY_RECLAIMED').length, 1);
});

// ── Watchdog ────────────────────────────────────────────────────────

test('watchdog: dispatch timeout emits HOLD reconciliation — never FAILED', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t3', event_type: 'LEAD_CREATED', correlation_id: 'corr-t3',
  });

  // The dispatch timeout uses an unref'd timer (it must never hold the
  // process open in production). Keep a ref'd handle alive for the test so
  // the event loop survives until the timer fires.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll(); // dispatch hangs -> 50ms timeout -> HOLD
  } finally {
    clearInterval(keepAlive);
  }

  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'hold', 'unknown outcome is PARKED durably — never FAILED, never silently re-dispatched');
  assert.ok(m.hold_record, 'the derived HOLD record is persisted on the row');
  const parked = JSON.parse(m.hold_record);
  assert.equal(parked.status, 'HOLD_RECONCILE');
  assert.equal(parked.outcome, 'unknown_hold');
  assert.equal(m.retries, 0, 'no retry scheduled for an unknown outcome');

  const hs = holds(h);
  assert.equal(hs.length, 1, 'exactly one reconciliation record emitted');
  const record = hs[0].payload.record;
  assert.equal(hs[0].payload.missionId, id);
  assert.equal(record.status, 'HOLD_RECONCILE');
  assert.equal(record.outcome, 'unknown_hold');
  assert.equal(record.classification, 'UNKNOWN_EXECUTION');
  assert.equal(record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.match(record.failure_id, /^fl-[0-9a-f]{12}$/);
  assert.equal(record.evidence.mission_id, id);
  assert.ok(record.replay.correlation_id, 'replay carries correlation identity');

  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'no MISSION_FAILED on timeout');
  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_RETRY_RECLAIMED'), 'no retry re-entry on timeout');

  const log = h.sched.getReconciliationLog();
  assert.equal(log.length, 1);
  assert.equal(log[0].mission_id, id);
  assert.equal(log[0].record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.equal(h.sched.getStats().reconciled, 1);
});

test('watchdog: stuck-running scan reconciles old missions once; skips fresh and in-processing ones', async () => {
  const h = makeHarness({ worker: 'ok', stuckThresholdMs: 600000 });

  const oldId = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t4a', event_type: 'LEAD_CREATED', correlation_id: 'corr-t4a',
  });
  await h.mr.assign(oldId, 'observation');
  await h.mr.start(oldId);
  h.pool.missions.get(oldId).started_at = new Date(h.now() - 20 * 60000).toISOString();

  const freshId = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t4b', event_type: 'LEAD_CREATED' });
  await h.mr.assign(freshId, 'observation');
  await h.mr.start(freshId);

  const n = await h.sched.reconcileStuckRunning();
  assert.equal(n, 1, 'only the old mission is reconciled');
  const hs = holds(h);
  assert.equal(hs.length, 1);
  assert.equal(hs[0].payload.missionId, oldId);
  assert.equal(hs[0].payload.record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.equal(h.pool.missions.get(oldId).status, 'hold', 'stuck mission is PARKED durably');
  assert.ok(h.pool.missions.get(oldId).hold_record, 'HOLD record persisted');
  assert.equal(h.sched.getStats().watchdogScans, 1);

  // Dedupe: a second scan emits nothing new for the same mission
  assert.equal(await h.sched.reconcileStuckRunning(), 0);
  assert.equal(holds(h).length, 1);

  // Missions the scheduler is actively processing are skipped even when old
  const procId = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t4c', event_type: 'LEAD_CREATED' });
  await h.mr.assign(procId, 'observation');
  await h.mr.start(procId);
  h.pool.missions.get(procId).started_at = new Date(h.now() - 30 * 60000).toISOString();
  h.sched._processing.add(procId);
  try {
    assert.equal(await h.sched.reconcileStuckRunning(), 0, 'in-processing missions are owned by lease renewal, not the watchdog');
  } finally {
    h.sched._processing.delete(procId);
  }
  assert.equal(holds(h).length, 1);
});

// ── Boundary: deriveFailureRecord wired through the proven fail path ──
// (Nolan 2026-09-24: the human word arrived — the derivation is wired ONLY as
// part of the proven F-01 state model, never as an isolated patch.)

test('boundary: the fail path derives failure records for KNOWN outcomes — never HOLD', async () => {
  const h = makeHarness({ worker: 'throwing', retryPolicy: { max_attempts: 1, backoff_delay_ms: 5000 } });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t5', event_type: 'LEAD_CREATED' });
  await h.sched._poll(); // throw -> failWithRetry -> exhausted (max_attempts=1) -> failed + DLQ
  assert.ok(h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'normal failures still emit MISSION_FAILED');
  assert.equal(holds(h).length, 0, 'no HOLD from the fail path — HOLD is exclusive to unknown outcomes');
  assert.equal(h.sched.getReconciliationLog().length, 0);

  const derived = h.events.emitted.filter(e => e.type === 'MISSION_FAILURE_DERIVED');
  assert.equal(derived.length, 1, 'one derived failure record for the known failure');
  const record = derived[0].payload.record;
  assert.equal(derived[0].payload.missionId, id);
  assert.equal(record.outcome, 'failed', 'known failure resolves to failed — never unknown_hold');
  assert.notEqual(record.classification, 'UNKNOWN_EXECUTION');
  assert.equal(record.evidence.mission_id, id);
  assert.match(record.failure_id, /^fl-[0-9a-f]{12}$/, 'failure_id derived, never minted');
  assert.equal(h.pool.missions.get(id).status, 'failed');

  // Exhaustion carries the derived record into the dead letter as evidence
  assert.equal(h.dlqRecords.length, 1);
  assert.ok(h.dlqRecords[0].job.failure_record, 'DLQ carries the derived failure record');
  assert.equal(h.dlqRecords[0].job.failure_record.failure_id, record.failure_id);
});

test('boundary: unmapped mission type is skipped before any failure path', async () => {
  const h = makeHarness({ worker: 'throwing' });
  await h.mr.create('UNKNOWN_MISSION_TYPE', { event_id: 'evt-t8', event_type: 'WHATEVER' });
  await h.sched._poll();
  assert.equal(holds(h).length, 0);
  assert.equal(h.events.emitted.filter(e => e.type === 'MISSION_FAILURE_DERIVED').length, 0);
  assert.equal(h.sched.getStats().skipped, 1, 'unmapped mission type is skipped before any failure path');
});

// ── Constitutional PARK/HOLD: the full chain ────────────────────────
// hung execution → dispatch deadline → UNKNOWN → durable HOLD → lease expiry
// → NO redispatch (even across restarts) → evidence → deterministic,
// proof-gated recovery decision.

function makeSecondScheduler(h) {
  // A "fresh process": new scheduler + runtime instances over the SAME pool,
  // with an empty in-memory _reconciled set. Durability must come from the
  // row, never from process memory.
  const mr2 = new MissionRuntime({ pool: h.pool, eventRuntime: h.events });
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    dispatch: async () => { h.workerInvocations++; return { status: 'ok' }; },
  };
  return new MissionScheduler({
    missionRuntime: mr2,
    workerRuntime,
    eventRuntime: h.events,
    pollIntervalMs: 3600000,
    dispatchTimeoutMs: 50,
    stuckThresholdMs: 600000,
  });
}

test('PARK/HOLD: timeout parks durably; lease expiry never re-dispatches; recovery is proof-gated', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  // NOTE: harness registers only the 'observation' worker, so LEAD_FOLLOWUP
  // is used; the HOLD semantics are worker-agnostic.
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-h1', event_type: 'CLAIM_GENERATED', correlation_id: 'corr-h1',
  });

  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll(); // dispatch hangs -> 50ms deadline -> UNKNOWN -> PARK
  } finally {
    clearInterval(keepAlive);
  }

  // 1. Hung execution → deadline → durable HOLD
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'hold', 'PARKED: running -> hold');
  assert.equal(h.workerInvocations, 1, 'worker invoked exactly once');
  const parked = JSON.parse(m.hold_record);
  assert.equal(parked.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.equal(holds(h).length, 1);

  // 2. Lease expiry passes: the reaper must NOT touch the parked mission…
  h.advance(10 * 60000);
  assert.equal(await h.mr.reapExpiredLeases(), 0, 'reaper reclaims nothing from hold');
  assert.equal(h.pool.missions.get(id).status, 'hold');

  // …and the orphan escalator must NOT re-dispatch it either (already parked)
  assert.deepEqual(await h.mr.findOrphanedRunning(), [], 'parked missions are not orphaned-running');

  // 3. Across a "restart": a fresh scheduler cannot silently re-dispatch it
  const sched2 = makeSecondScheduler(h);
  const invocationsBefore = h.workerInvocations;
  await sched2._poll();
  assert.equal(h.workerInvocations, invocationsBefore, 'NO duplicate uncontrolled execution after restart');
  assert.equal(h.pool.missions.get(id).status, 'hold', 'hold survives the restart');
  assert.equal(holds(h).length, 1, 'no second HOLD emission — the conditional park dedups');
  assert.notEqual(h.pool.missions.get(id).status, 'created', 'never reset to created');

  // 4. Recovery without an idempotency proof is refused — fail closed
  await assert.rejects(
    sched2.reconcileHold(id, 'retry'),
    /idempotency/i,
    'retry without a proven idempotency contract throws'
  );
  await assert.rejects(
    sched2.reconcileHold(id, 'retry', { idempotencyProof: '   ' }),
    /idempotency/i,
    'an empty proof is not a proof'
  );
  assert.equal(h.pool.missions.get(id).status, 'hold', 'refused retry changes nothing');

  // 5. Recovery WITH proof: controlled, evidence-gated re-entry through the claim path
  const resolved = await sched2.reconcileHold(id, 'retry', {
    idempotencyProof: 'test-harness: stub worker keyed on event_id; duplicate dispatch cannot create a second semantic effect (verified by this test)',
  });
  assert.equal(resolved, true);
  assert.equal(h.pool.missions.get(id).status, 'created', 'hold -> created via the ONLY exit');
  const resolvedEvents = h.events.emitted.filter(e => e.type === 'MISSION_HOLD_RESOLVED');
  assert.equal(resolvedEvents.length, 1);
  assert.equal(resolvedEvents[0].payload.decision, 'retry');

  // 6. The re-entry is a normal claimed dispatch — exactly one more execution, counted
  await sched2._poll();
  assert.equal(h.workerInvocations, invocationsBefore + 1, 'exactly one controlled re-execution');
  assert.equal(h.pool.missions.get(id).status, 'completed');
});

test('PARK/HOLD: orphaned running mission (crashed scheduler) escalates to HOLD, never created', async () => {
  const h = makeHarness({ worker: 'ok', stuckThresholdMs: 600000 });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-h2', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  await h.mr.start(id);
  // The scheduler crashed mid-dispatch: lease expired, nobody renewing.
  // started_at is recent (inside the 10-minute watchdog window) so only the
  // orphan escalator — not the stuck scan — can catch it.
  h.pool.missions.get(id).lease_until = new Date(h.now() - 65000).toISOString();

  const invocationsBefore = h.workerInvocations;
  await h.sched._poll();

  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'hold', 'orphaned running mission is PARKED, not reset to created');
  assert.ok(m.hold_record, 'HOLD record persisted');
  assert.equal(h.workerInvocations, invocationsBefore, 'no silent re-dispatch of a possibly-executed mission');
  assert.equal(holds(h).length, 1);
  assert.match(JSON.parse(m.hold_record).evidence.error, /orphaned/);
});

test('PARK/HOLD: reaper still reclaims abandoned-not-started (assigned, never invoked)', async () => {
  const h = makeHarness({ worker: 'ok' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-h3', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  // Claimed but the worker was never invoked: started_at stays null.
  h.pool.missions.get(id).lease_until = new Date(h.now() - 65000).toISOString();

  assert.equal(await h.mr.reapExpiredLeases(), 1, 'abandoned-not-started IS reclaimed');
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'created');
  assert.equal(m.assigned_to, null);
  assert.equal(holds(h).length, 0, 'no HOLD for a mission known not to have started');
});

test('PARK/HOLD: reconcileHold "fail" is terminal and keeps the evidence trail', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-h4', event_type: 'LEAD_CREATED' });
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll();
  } finally {
    clearInterval(keepAlive);
  }
  assert.equal(h.pool.missions.get(id).status, 'hold');

  const resolved = await h.sched.reconcileHold(id, 'fail', { note: 'downstream confirmed the lead was handled manually' });
  assert.equal(resolved, true);
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'failed', 'terminal');
  assert.match(m.error, /manually/);
  assert.ok(m.hold_record, 'hold_record kept as the evidence trail');
  assert.ok(m.completed_at, 'completed_at set');

  // Terminal: further polls never touch it; unknown decisions throw
  h.advance(60000);
  await h.sched._poll();
  assert.equal(h.pool.missions.get(id).status, 'failed');
  await assert.rejects(h.sched.reconcileHold(id, 'cancel'), /unknown decision/);
  assert.equal(await h.sched.reconcileHold(id, 'fail', { note: 'x' }), false, 'not in hold -> not resolved');
});
