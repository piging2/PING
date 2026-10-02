'use strict';
/**
 * CE-001 completion-identity determinism suite.
 *
 * Uses the REAL MissionRuntime, the REAL UnifiedEventRuntime (now at
 * ping-runtime/events/unified_event_runtime.js, owned by the dedicated
 * collision-enforcement lane), and the REAL IdentityAuthority against an
 * in-memory mock PostgreSQL pool (no network, no database server). Proves
 * the deterministic completion identity:
 *
 *   logical_id = { kind: 'mission-completion', mission_id: missionId }
 *
 * and that duration_ms / completed_at stay payload metadata only.
 *
 * CE-002 COMPOSITION: complete() is attempt-fenced, so every call site in
 * this suite presents the fencing token minted by its winning claim
 * (via getFencingToken). The mock pool enforces the attempts condition
 * exactly like production. Identity assertions are unchanged: fencing is
 * attribution at the transition, identity stays attempt-blind by design.
 *
 * COMPOSITION WITH THE COLLISION LANE: the UER commit layer now enforces
 * the collision law (commit_collision.js): same event_id +
 * canonical-equivalent content -> idempotent dedup no-op (no dispatch);
 * same event_id + different semantic content -> EVENT_IDENTITY_CONFLICT,
 * fail closed. This suite USES that mechanism and does not duplicate it:
 * collision-gate assertions belong to the collision lane. What CE-001
 * asserts: the logical_id is passed on every MISSION_COMPLETED emit, the
 * event_id is deterministic across the scenarios below, clock values never
 * enter the identity preimage, and the reconciler repairs lost completions
 * idempotently.
 *
 * Consequence for the scenarios: a re-emission of the same logical
 * completion with DIFFERENT content is the collision lane's adversarial
 * case (fail-closed by their design), so the retry scenario here is the
 * genuine retry flow (fail -> retry -> complete exactly once), and
 * duplicate-delivery scenarios re-emit IDENTICAL content (at-least-once
 * redelivery -> dedup no-op). The gate now excludes declared volatile
 * metadata (duration_ms, completed_at) from the collision comparison
 * preimage, so a retry differing only in volatile metadata dedups; the
 * suite asserts the identity-level facts that hold under this design.
 *
 * Cases:
 *   1   clock-independence: same logical completion at T and T+1h (different
 *       duration_ms) -> same event_id, one row, logical_id on both emits.
 *   2   retry: attempt 1 fails -> mission retried -> attempt 2 completes
 *       exactly once with the deterministic identity.
 *   3   lease-expiry reclaim: reapExpiredLeases -> created -> complete ->
 *       deterministic identity holds.
 *   4   restart duplicate delivery: identical redelivery of the same logical
 *       completion -> same event_id, dedup no-op, one row.
 *   5a  crash-after-accept (a): crash between dispatchResult and complete()
 *       -> mission never completed -> reclaim via lease expiry -> completes
 *       with the deterministic identity.
 *   5b  crash-after-accept (b): crash between the DB UPDATE and the emit ->
 *       startup reconciler re-emits by deterministic identity -> one row;
 *       re-run is a dedup no-op.
 *   6   reconciliation idempotency: reconciler on already-reconciled and
 *       via MissionScheduler.start(); never a second row; no reminting.
 *   7   no over-collapsing: different missions, different namespaces,
 *       MISSION_FAILED vs MISSION_COMPLETED, logical_id vs payload-derived
 *       all yield different event_ids; every MISSION_COMPLETED emit carries
 *       the logical_id.
 *
 * Run: node ce001_completion_identity.js            (all cases)
 *      node ce001_completion_identity.js 1           (case 1 only)
 */
const path = require('path');
const assert = require('assert');
const ROOT = '/home/nolan/worktrees/constitutional-convergence';
const { identityAuthority } = require(path.join(ROOT, 'ping-runtime/authorities/identity_authority.js'));
const { MissionRuntime } = require(path.join(ROOT, 'ping-runtime/orchestration/mission_runtime.js'));
const { UnifiedEventRuntime } = require(path.join(ROOT, 'ping-runtime/events/unified_event_runtime.js'));
const { MissionScheduler } = require(path.join(ROOT, 'ping-runtime/orchestration/mission_scheduler.js'));

/* ------------------------------------------------------------------ */
/* In-memory mock PostgreSQL pool. Mirrors the CURRENT ping_events     */
/* schema: (event_id, event_type, source, timestamp, payload,          */
/* metadata, namespace); payload/metadata stored as JSON strings and  */
/* parsed back (jsonb round-trip); ON CONFLICT DO NOTHING.             */
/* ------------------------------------------------------------------ */
class MockPool {
  constructor() {
    this._db = { missions: [], events: [], seq: 0 };
    this.completions = []; // captured MISSION_COMPLETED emissions
  }
  async query(text, params = []) {
    const pool = this;
    const norm = (v) => (v && typeof v === 'object' && v !== null && typeof v.toISOString === 'function')
      ? v.toISOString() : v;
    const parseJson = (v) => {
      try { return typeof v === 'string' ? JSON.parse(v) : (v == null ? {} : v); }
      catch (e) { return {}; }
    };
    const t = String(text);

    if (/INSERT INTO ping_missions/.test(t)) {
      // Real shape: (mission_id, mission_type, payload, priority, created_by)
      // with ON CONFLICT (mission_id) DO NOTHING; status defaults to 'created'.
      const mission_id = norm(params[0]);
      if (pool._db.missions.find((r) => r.mission_id === mission_id)) {
        return { rows: [], rowCount: 0 }; // ON CONFLICT DO NOTHING
      }
      const m = {
        mission_id,
        mission_type: norm(params[1]),
        status: 'created',
        payload: parseJson(params[2]),
        priority: norm(params[3]) || 0,
        created_by: norm(params[4]) || null,
        result: null, worker_id: null, assigned_to: null, lease_until: null,
        attempts: 0, created_at: new Date().toISOString(),
        started_at: null, completed_at: null, error: null,
      };
      pool._db.missions.push(m);
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    if (/INSERT INTO ping_events/.test(t)) {
      const event_id = norm(params[0]);
      if (pool._db.events.find((r) => r.event_id === event_id)) {
        return { rows: [], rowCount: 0 }; // ON CONFLICT DO NOTHING
      }
      pool._db.seq += 1;
      const row = {
        sequence: pool._db.seq,
        event_id,
        event_type: norm(params[1]),
        source: norm(params[2]),
        timestamp: norm(params[3]),
        payload: parseJson(params[4]),
        metadata: parseJson(params[5]),
        namespace: norm(params[6]) || 'core::system',
      };
      pool._db.events.push(row);
      return { rows: [{ sequence: row.sequence }], rowCount: 1 };
    }
    if (/UPDATE ping_missions/.test(t)) {
      // reapExpiredLeases(): no mission_id filter; reclaim expired leases.
      if (/SET status = 'created'/.test(t) && /lease_until < NOW\(\)/.test(t) && !/mission_id = \$/.test(t)) {
        const now = Date.now();
        const hit = pool._db.missions.filter((r) =>
          (r.status === 'running' || r.status === 'assigned') &&
          r.lease_until && new Date(r.lease_until).getTime() < now);
        for (const r of hit) { r.status = 'created'; r.worker_id = null; r.lease_until = null; }
        return { rows: hit.map((r) => ({ mission_id: r.mission_id })), rowCount: hit.length };
      }
      const mEq = /WHERE mission_id = \$(\d+)/.exec(t);
      const id = mEq ? norm(params[+mEq[1] - 1]) : null;
      const m = pool._db.missions.find((r) => r.mission_id === id);
      if (!m) return { rows: [], rowCount: 0 };
      let updated = false;
      const guard = /AND status = '(\w+)'/.exec(t);
      if (guard && m.status !== guard[1]) return { rows: [], rowCount: 0 };
      // CE-002: the mock enforces the fencing condition exactly like
      // production: the UPDATE only matches when attempts equals the
      // presented token.
      const attGuard = /AND attempts = \$(\d+)/.exec(t);
      if (attGuard && m.attempts !== norm(params[+attGuard[1] - 1])) return { rows: [], rowCount: 0 };
      const inGuard = /AND status IN \(([^)]+)\)/.exec(t);
      if (inGuard) {
        const allowed = inGuard[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
        if (!allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      }
      const setRe = /SET\s+(.*?)(?:\s+WHERE|\s+RETURNING|$)/s.exec(t);
      const setPart = setRe ? setRe[1] : '';
      const applySet = (re, fn) => {
        let mm;
        while ((mm = re.exec(setPart)) !== null) fn(mm);
      };
      const applyCol = (col, val) => {
        if (col === 'status') { m.status = val; updated = true; }
        else if (col === 'worker_id' || col === 'assigned_to') { m.assigned_to = val; m.worker_id = val; updated = true; }
        else if (col === 'lease_until') { m.lease_until = val; updated = true; }
        else if (col === 'started_at') { m.started_at = val; updated = true; }
        else if (col === 'completed_at') { m.completed_at = val; updated = true; }
        else if (col === 'result' || col === 'result_jsonb') {
          try { m.result = typeof val === 'string' ? JSON.parse(val) : val; }
          catch (e) { m.result = val; }
          updated = true;
        }
        else if (col === 'error') { m.error = val; updated = true; }
      };
      applySet(/(\w+)\s*=\s*\$(\d+)/g, (mm) => applyCol(mm[1], norm(params[+mm[2] - 1])));
      applySet(/(\w+)\s*=\s*'([^']*)'/g, (mm) => applyCol(mm[1], mm[2]));
      applySet(/(\w+)\s*=\s*NULL/g, (mm) => applyCol(mm[1], null));
      applySet(/(\w+)\s*=\s*NOW\(\)/g, (mm) => applyCol(mm[1], new Date().toISOString()));
      applySet(/attempts\s*=\s*attempts\s*\+\s*1/g, () => { m.attempts += 1; updated = true; });
      if (!updated) return { rows: [], rowCount: 0 };
      const ret = /RETURNING (\w+)/.exec(t);
      if (ret) { const o = {}; o[ret[1]] = m[ret[1]]; return { rows: [o], rowCount: 1 }; }
      return { rows: [], rowCount: 1 };
    }
    if (/SELECT 1 AS one FROM ping_events/.test(t)) {
      const id = norm(params[0]);
      return { rows: pool._db.events.filter((r) => r.event_id === id).map(() => ({ one: 1 })) };
    }
    if (/FROM ping_events/.test(t)) {
      const mEq = /WHERE event_id = \$(\d+)/.exec(t);
      if (mEq) {
        const id = norm(params[+mEq[1] - 1]);
        return { rows: pool._db.events.filter((r) => r.event_id === id) };
      }
      const tEq = /WHERE event_type = '([^']+)'/.exec(t);
      if (tEq) return { rows: pool._db.events.filter((r) => r.event_type === tEq[1]) };
      return { rows: pool._db.events.map((r) => ({ ...r })) };
    }
    if (/FROM pg_agent_queue/.test(t)) return { rows: [] };
    if (/FROM ping_missions/.test(t)) {
      let rows = pool._db.missions.map((m) => ({ ...m }));
      const mEq = /WHERE mission_id = \$(\d+)/.exec(t);
      if (mEq) rows = rows.filter((r) => r.mission_id === norm(params[+mEq[1] - 1]));
      const sEq = /status = '(\w+)'/.exec(t);
      if (sEq) rows = rows.filter((r) => r.status === sEq[1]);
      if (/lease_until IS NOT NULL AND lease_until < NOW\(\)/.test(t)) {
        const now = Date.now();
        rows = rows.filter((r) => r.lease_until && new Date(r.lease_until).getTime() < now);
      }
      if (/ORDER BY/.test(t) && /lease_until/.test(t)) {
        rows = rows.slice().sort((a, b) => new Date(a.lease_until) - new Date(b.lease_until));
      }
      const limEq = /LIMIT \$(\d+)/.exec(t);
      if (limEq) rows = rows.slice(0, +norm(params[+limEq[1] - 1]));
      return { rows };
    }
    if (/SELECT 1/.test(t)) return { rows: [{ '?column?': 1 }] };
    return { rows: [], rowCount: 0 };
  }
}

function makeStack() {
  const pool = new MockPool();
  const uer = new UnifiedEventRuntime({ pool });
  const rt = new MissionRuntime({ pool, eventRuntime: uer });
  // Capture the MISSION_COMPLETED emit path exactly as UER reported it.
  // New UER return contract: { status, eventId, event, sequence,
  // deduplicated? } or { status: 'error', code, error, eventId }.
  const origEmit = uer.emit.bind(uer);
  uer.emit = async (eventType, source, payload, options = {}) => {
    const res = await origEmit(eventType, source, payload, options);
    if (eventType === 'MISSION_COMPLETED') {
      pool.completions.push({
        eventId: res.eventId || (res.event && res.event.event_id) || null,
        status: res.status,
        code: res.code || null,
        deduplicated: !!res.deduplicated,
        event_type: eventType,
        source,
        payload: res.event ? res.event.payload : payload,
        options: JSON.parse(JSON.stringify(options || {})),
      });
    }
    return res;
  };
  return { pool, uer, rt };
}

/* Deterministic completion identity, mirroring the reconciler's preimage:
 * event_type + source + default namespace + logical_id. */
function completionEventId(missionId) {
  return identityAuthority.generateId('event', {
    event_type: 'MISSION_COMPLETED',
    source: 'mission-runtime',
    namespace: 'core::system',
    logical_id: MissionRuntime.completionLogicalId(missionId),
  });
}

function logicalIdFor(missionId) {
  return { kind: 'mission-completion', mission_id: missionId };
}

function assertLogicalId(caseTag, completions, missionId) {
  assert.ok(completions.length > 0, `[${caseTag}] expected at least one captured MISSION_COMPLETED emission`);
  for (const c of completions) {
    assert.deepStrictEqual(
      c.options.logical_id, logicalIdFor(missionId),
      `[${caseTag}] emit must carry the deterministic logical_id (got ${JSON.stringify(c.options.logical_id)})`
    );
  }
}

function completionsOfType(pool, missionId) {
  return pool.completions.filter((c) => c.payload && c.payload.missionId === missionId);
}

let passed = 0;
let failed = 0;
function check(tag, cond, detail) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL [${tag}]: ${detail}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Case 1: clock-independence                                         */
/* ------------------------------------------------------------------ */
async function case1() {
  console.log('Case 1: clock-independence');
  const { pool, uer, rt } = makeStack();
  const realNow = Date.now;
  const T1 = 1780000000000; // fixed "now"
  const T2 = T1 + 3600_000; // one hour later

  Date.now = () => T1;
  const m = await rt.create('ping', { case: 1 });
  await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1');
  const r1 = await rt._eventRuntime.emit(
    'MISSION_COMPLETED', 'mission-runtime',
    { missionId: m, result: { out: 1 }, duration_ms: 111 },
    { logical_id: MissionRuntime.completionLogicalId(m) }
  );

  Date.now = () => T2;
  // Same logical completion one hour later; only clock metadata differs.
  const r2 = await rt._eventRuntime.emit(
    'MISSION_COMPLETED', 'mission-runtime',
    { missionId: m, result: { out: 1 }, duration_ms: 222 },
    { logical_id: MissionRuntime.completionLogicalId(m) }
  );
  Date.now = realNow;

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  const em = completionsOfType(pool, m);
  check('1', em.length === 2, `expected 2 captured emissions (got ${em.length})`);
  assertLogicalId('1', em, m);
  check('1', r1.eventId === r2.eventId,
    `same logical completion at T and T+1h -> same event_id (got ${r1.eventId} vs ${r2.eventId})`);
  check('1', r1.eventId === completionEventId(m),
    `event_id equals the deterministic completion identity (got ${r1.eventId}, want ${completionEventId(m)})`);
  check('1', rows.rows.length === 1, `exactly one canonical MISSION_COMPLETED row (got ${rows.rows.length})`);
  // Clock metadata must still be observable in the payload (not dropped).
  check('1', rows.rows[0] && rows.rows[0].payload && rows.rows[0].payload.duration_ms === 111,
    'duration_ms remains in the payload as observation metadata');
  // Informational: the collision lane's current gate compares whole-payload
  // content, so the second emit (different duration_ms) is a semantic
  // collision under their implementation, not a dedup. Identity-level facts
  // above hold either way; the gate verdict is their lane's assertion.
  console.log(`  [info 1] gate verdict on clock-differing re-emit: status=${r2.status} code=${r2.code || '-'}`);
  console.log('Case 1 done');
}

/* ------------------------------------------------------------------ */
/* Case 2: retry (fail -> retry -> complete exactly once)              */
/* ------------------------------------------------------------------ */
async function case2() {
  console.log('Case 2: retry');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 2 });
  await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1');

  // Attempt 1 fails; the mission is retried and attempt 2 completes.
  await rt.fail(m, 'worker exploded');
  await pool.query(
    'UPDATE ping_missions SET status = $1, worker_id = $2, error = $3 WHERE mission_id = $4',
    ['created', null, null, m]
  );
  await rt.assign(m, 'w2', 60000); await rt.start(m, 'w2');
  await rt.complete(m, { attempt: 2 }, await rt.getFencingToken(m));

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  const em = completionsOfType(pool, m);
  assertLogicalId('2', em, m);
  check('2', em.length === 1, `exactly one MISSION_COMPLETED emission after retry (got ${em.length})`);
  check('2', em[0].status === 'ok' && !em[0].deduplicated, 'retry completion accepted (not a dedup)');
  check('2', em[0].eventId === completionEventId(m), 'retry identity equals the deterministic identity');
  check('2', rows.rows.length === 1, `one canonical row after retry (got ${rows.rows.length})`);
  const dbRow = (await pool.query('SELECT result FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('2', dbRow && dbRow.result && dbRow.result.attempt === 2,
    'DB result is the winning attempt\'s (attempt 2)');
  console.log('Case 2 done');
}

/* ------------------------------------------------------------------ */
/* Case 3: lease-expiry reclaim then complete                         */
/* ------------------------------------------------------------------ */
async function case3() {
  console.log('Case 3: lease expiry');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 3 });
  await rt.assign(m, 'w-dead', 60000); await rt.start(m, 'w-dead');
  // Simulate the lease expiring while the worker is gone.
  const row = pool._db.missions.find((r) => r.mission_id === m);
  row.lease_until = new Date(Date.now() - 60000).toISOString();

  const reaped = await rt.reapExpiredLeases();
  check('3', reaped === 1, `expired lease reaped back to created (reclaimed=${reaped})`);
  await rt.assign(m, 'w-new', 60000); await rt.start(m, 'w-new');
  await rt.complete(m, { reclaimed: true }, await rt.getFencingToken(m));

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  const em = completionsOfType(pool, m);
  assertLogicalId('3', em, m);
  check('3', em.length === 1, `one emission after lease reclaim (got ${em.length})`);
  check('3', em[0].eventId === completionEventId(m), 'lease-reclaim identity equals the deterministic identity');
  check('3', rows.rows.length === 1, `one canonical row (got ${rows.rows.length})`);
  console.log('Case 3 done');
}

/* ------------------------------------------------------------------ */
/* Case 4: restart duplicate delivery (identical at-least-once         */
/* redelivery -> dedup no-op)                                         */
/* ------------------------------------------------------------------ */
async function case4() {
  console.log('Case 4: restart duplicate delivery');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 4 });
  await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1');
  await rt.complete(m, { out: 1 }, await rt.getFencingToken(m));
  const first = completionsOfType(pool, m)[0];

  // Post-restart: a second runtime over the same pool receives an
  // at-least-once redelivery of the IDENTICAL emission and re-emits it.
  const rtB = new MissionRuntime({ pool, eventRuntime: new UnifiedEventRuntime({ pool }) });
  const dup = await rtB._eventRuntime.emit(
    'MISSION_COMPLETED', 'mission-runtime',
    JSON.parse(JSON.stringify(first.payload)),
    { logical_id: MissionRuntime.completionLogicalId(m) }
  );

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('4', dup.status === 'ok' && dup.deduplicated === true,
    `identical redelivery -> dedup no-op (got status=${dup.status} deduplicated=${dup.deduplicated})`);
  check('4', dup.eventId === first.eventId,
    `restart duplicate delivery -> same event_id (got ${dup.eventId} vs ${first.eventId})`);
  check('4', first.eventId === completionEventId(m), 'restart identity equals the deterministic identity');
  check('4', rows.rows.length === 1, `still one canonical row (got ${rows.rows.length})`);
  console.log('Case 4 done');
}

/* ------------------------------------------------------------------ */
/* Case 5a: crash between dispatchResult and complete()                */
/* ------------------------------------------------------------------ */
async function case5a() {
  console.log('Case 5a: crash between dispatchResult and complete()');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: '5a' });
  await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1');

  // Crash: dispatchResult ran, complete() never did -> row stays running,
  // lease still held by the dead worker.
  const row = pool._db.missions.find((r) => r.mission_id === m);
  row.lease_until = new Date(Date.now() - 60000).toISOString();

  const reaped = await rt.reapExpiredLeases();
  check('5a', reaped === 1, `crashed mission reaped back to created (reclaimed=${reaped})`);
  await rt.assign(m, 'w2', 60000); await rt.start(m, 'w2');
  await rt.complete(m, { recovered: true }, await rt.getFencingToken(m));

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  const em = completionsOfType(pool, m);
  assertLogicalId('5a', em, m);
  check('5a', em.length === 1, `one emission after recovery (got ${em.length})`);
  check('5a', em[0].eventId === completionEventId(m), 'recovery identity equals the deterministic identity');
  check('5a', rows.rows.length === 1, `one canonical row (got ${rows.rows.length})`);
  console.log('Case 5a done');
}

/* ------------------------------------------------------------------ */
/* Case 5b: crash between DB UPDATE and emit (lost completion)        */
/* ------------------------------------------------------------------ */
async function case5b() {
  console.log('Case 5b: crash between DB UPDATE and emit');
  const { pool, uer, rt } = makeStack();

  const m = await rt.create('ping', { case: '5b' });
  await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1');

  // Crash between the mission row UPDATE and the MISSION_COMPLETED emit:
  // simulate by patching the emit to throw after the UPDATE succeeded.
  const crashingEmit = async (eventType, source, payload, options) => {
    if (eventType === 'MISSION_COMPLETED') throw new Error('simulated crash between DB update and emit');
    return uer.emit(eventType, source, payload, options);
  };
  const healthyEmit = uer.emit;
  uer.emit = crashingEmit;

  let crashed = false;
  try {
    await rt.complete(m, { out: 42 }, await rt.getFencingToken(m));
  } catch (e) {
    crashed = /simulated crash/.test(e.message);
  }
  uer.emit = healthyEmit; // "restart": emit path is healthy again

  check('5b', crashed, 'simulated crash propagated out of complete()');
  const dbRow = (await pool.query('SELECT status FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('5b', dbRow && dbRow.status === 'completed', 'mission row is completed in the DB');
  check('5b', pool.completions.length === 0, `zero MISSION_COMPLETED events persisted (got ${pool.completions.length})`);

  // Startup reconciliation: the reconciler must exist and must repair the
  // lost completion using the deterministic identity.
  check('5b', typeof rt.reconcileLostCompletions === 'function',
    'startup reconciler exists (reconcileLostCompletions)');
  if (typeof rt.reconcileLostCompletions !== 'function') {
    console.log('Case 5b done (reconciler absent: gap documented, remaining checks skipped)');
    return;
  }
  const report = await rt.reconcileLostCompletions();
  check('5b', report.checked === 1 && report.reEmitted === 1 && report.alreadyPresent === 0,
    `reconciler repaired the lost completion (report=${JSON.stringify(report)})`);

  const rows = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('5b', rows.rows.length === 1, `exactly one MISSION_COMPLETED row after reconciliation (got ${rows.rows.length})`);
  check('5b', rows.rows[0] && rows.rows[0].event_id === completionEventId(m),
    'reconciled event_id equals the deterministic completion identity');
  const em = completionsOfType(pool, m);
  assertLogicalId('5b', em, m);
  check('5b', em[0].status === 'ok' && !em[0].deduplicated, 'reconciled emission accepted as the canonical event');
  // Reconciliation is idempotent: a second run must be a no-op.
  const report2 = await rt.reconcileLostCompletions();
  check('5b', report2.checked === 1 && report2.reEmitted === 0 && report2.alreadyPresent === 1,
    `second reconciliation is a dedup no-op (report=${JSON.stringify(report2)})`);
  const rows2 = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('5b', rows2.rows.length === 1, 'still one row after second reconciliation');
  console.log('Case 5b done');
}

/* ------------------------------------------------------------------ */
/* Case 6: reconciliation idempotency + scheduler wiring              */
/* ------------------------------------------------------------------ */
async function case6() {
  console.log('Case 6: reconciliation idempotency');
  const { pool, uer, rt } = makeStack();

  // 6a: reconciler on an already-reconciled completion is a no-op.
  const m1 = await rt.create('ping', { case: '6a' });
  await rt.assign(m1, 'w1', 60000); await rt.start(m1, 'w1');
  await rt.complete(m1, { out: 1 }, await rt.getFencingToken(m1));
  const rep1 = await rt.reconcileLostCompletions();
  check('6', rep1.checked === 1 && rep1.reEmitted === 0 && rep1.alreadyPresent === 1,
    `reconciler no-op on already-present completion (report=${JSON.stringify(rep1)})`);
  const rows1 = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('6', rows1.rows.length === 1, `no second row from reconciler (got ${rows1.rows.length})`);

  // 6b: MissionScheduler.start() triggers reconciliation (non-fatal path).
  // Simulate a lost completion: completed row, zero events.
  const m2 = await rt.create('ping', { case: '6b' });
  await rt.assign(m2, 'w1', 60000); await rt.start(m2, 'w1');
  await pool.query(
    "UPDATE ping_missions SET status = 'completed', completed_at = $1, result = $2 WHERE mission_id = $3",
    [new Date().toISOString(), { out: 7 }, m2]
  );
  const before = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('6', before.rows.length === 1, 'setup: only m1\'s completion event exists');

  const scheduler = new MissionScheduler({ pool, missionRuntime: rt, workerRuntime: {}, pollIntervalMs: 60000 });
  scheduler._poll = async () => {}; // isolate: only the reconciliation path under test
  scheduler.start();
  await sleep(300);
  scheduler.stop();

  const after = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('6', after.rows.length === 2, `scheduler startup reconciled the lost completion (got ${after.rows.length} rows)`);
  const m2row = after.rows.find((r) => r.event_id === completionEventId(m2));
  check('6', !!m2row, 'reconciled event carries the deterministic completion identity');
  const em2 = completionsOfType(pool, m2);
  assertLogicalId('6', em2, m2);

  // 6c: reconciliation never mints a new mission identity (no reminting).
  check('6', MissionRuntime.completionLogicalId(m2).mission_id === m2,
    'reconciler keys on the existing mission_id; no new identity minted');
  console.log('Case 6 done');
}

/* ------------------------------------------------------------------ */
/* Case 7: no over-collapsing                                         */
/* ------------------------------------------------------------------ */
async function case7() {
  console.log('Case 7: no over-collapsing');
  const { pool, uer, rt } = makeStack();

  // 7a: different missions -> different identities.
  const m1 = await rt.create('ping', { case: '7a-1' });
  const m2 = await rt.create('ping', { case: '7a-2' });
  for (const m of [m1, m2]) { await rt.assign(m, 'w1', 60000); await rt.start(m, 'w1'); await rt.complete(m, { out: 1 }, await rt.getFencingToken(m)); }
  const e1 = completionsOfType(pool, m1)[0].eventId;
  const e2 = completionsOfType(pool, m2)[0].eventId;
  check('7', e1 !== e2, 'different missions -> different event_ids');
  check('7', e1 === completionEventId(m1) && e2 === completionEventId(m2), 'both equal their deterministic identities');

  // 7b: same mission, different namespace -> different identities.
  const m3 = await rt.create('ping', { case: '7b' });
  await rt.assign(m3, 'w1', 60000); await rt.start(m3, 'w1');
  await rt.complete(m3, { out: 1 }, await rt.getFencingToken(m3));
  const tenantRes = await uer.emit(
    'MISSION_COMPLETED', 'mission-runtime',
    { missionId: m3, result: { out: 1 }, duration_ms: 1 },
    { namespace: 'tenant::acme', logical_id: MissionRuntime.completionLogicalId(m3) }
  );
  check('7', tenantRes.eventId !== completionEventId(m3),
    'same mission in a different namespace -> different event_id');
  const rows3 = await pool.query("SELECT * FROM ping_events WHERE event_type = 'MISSION_COMPLETED'");
  check('7', rows3.rows.length === 4, `namespaced completion persists as its own row (got ${rows3.rows.length})`);

  // 7c: MISSION_FAILED with the same logical_id shape -> different identity.
  const failRes = await uer.emit(
    'MISSION_FAILED', 'mission-runtime',
    { missionId: m3, error: 'boom' },
    { logical_id: MissionRuntime.completionLogicalId(m3) }
  );
  check('7', failRes.eventId !== completionEventId(m3),
    'MISSION_FAILED with same logical_id shape -> different event_id (event_type in preimage)');

  // 7d: logical_id present vs payload-derived (no logical_id) -> different.
  const m4 = await rt.create('ping', { case: '7d' });
  await rt.assign(m4, 'w1', 60000); await rt.start(m4, 'w1');
  await rt.complete(m4, { out: 1 }, await rt.getFencingToken(m4));
  const bareRes = await uer.emit(
    'MISSION_COMPLETED', 'mission-runtime',
    { missionId: m4, result: { out: 1 }, duration_ms: 1 }
  );
  check('7', bareRes.eventId !== completionEventId(m4),
    'payload-derived identity differs from logical_id identity (preimage branches stay separate)');

  // 7e: every complete()-driven MISSION_COMPLETED emit carried the deterministic
  // logical_id. (The 7b namespaced emit also carries it by construction; the
  // 7d bare emit intentionally does not, so scope this to the first emission
  // per mission, which is the complete() one.)
  for (const m of [m1, m2, m3, m4]) {
    const first = completionsOfType(pool, m)[0];
    assert.deepStrictEqual(
      first.options.logical_id, logicalIdFor(m),
      `[7] complete() emit must carry the deterministic logical_id (got ${JSON.stringify(first.options.logical_id)})`
    );
  }
  check('7', true, 'all complete()-driven MISSION_COMPLETED emissions carried the deterministic logical_id');
  console.log('Case 7 done');
}

/* ------------------------------------------------------------------ */
/* Runner                                                             */
/* ------------------------------------------------------------------ */
const ALL = { 1: case1, 2: case2, 3: case3, 4: case4, '5a': case5a, '5b': case5b, 6: case6, 7: case7 };

(async () => {
  const only = process.argv[2];
  const keys = only ? [only] : Object.keys(ALL);
  for (const k of keys) {
    const fn = ALL[k];
    if (!fn) { console.error(`unknown case: ${k}`); process.exit(2); }
    try {
      await fn();
    } catch (e) {
      failed++;
      console.error(`  EXCEPTION [${k}]: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`);
    }
  }
  console.log(`\nCE-001 completion identity: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
