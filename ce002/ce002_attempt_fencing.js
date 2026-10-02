'use strict';
/**
 * CE-002 attempt/lease fencing suite.
 *
 * Defect (from forensics): a stale worker may complete a mission after its
 * lease was reassigned, because attempt fencing is absent. complete() only
 * conditions on status='running', so a superseded attempt's late complete()
 * can win the row transition and its MISSION_COMPLETED is emitted as the
 * mission's completion. Retry, lease expiry, restart, and crash scenarios
 * can remit completion identity; CE-001 fixed identity determinism, but
 * nothing stops a superseded attempt's completion from landing.
 *
 * Fencing design under test:
 *   - ping_missions.attempts: monotonic counter, DEFAULT 1, bumped by
 *     exactly 1 inside the atomic assign() UPDATE (the lease-grant point).
 *   - The bumped value is the fencing token for that lease grant.
 *   - complete(missionId, result, fencingToken) requires attempts = token
 *     in the conditional UPDATE. A superseded (or missing/invalid) token
 *     fails closed with typed STALE_ATTEMPT: no row write, no emit.
 *   - The accepted completion carries payload.attempt naming the attempt
 *     that produced it (attribution; identity alone is attempt-blind).
 *   - reconcileLostCompletions() is the privileged recovery path: it never
 *     calls complete(), re-emits with the row's own attempts value, and
 *     needs no token.
 *
 * Token construction used below: attempts defaults to 1 on INSERT and each
 * successful assign() bumps it by 1, so after A's successful assign the
 * token is 2 and after B's it is 3. F0 self-validates this against the
 * runtime's getFencingToken() when the fenced API exists.
 *
 * Uses the REAL MissionRuntime, the REAL UnifiedEventRuntime, and the REAL
 * IdentityAuthority against an in-memory mock PostgreSQL pool (no network,
 * no database server). The mock mirrors the CE-001 suite's mock plus the
 * attempts column and the attempts-equality guard on complete()'s UPDATE.
 *
 * Fail-before: FB-A, FB-B, F0, F1, F2 (and the attempt assertion in F6)
 * MUST FAIL on unpatched code, each demonstrating the fenced behavior that
 * is absent. F3/F4/F5 pass pre-fix (legitimate flows are preserved); F6's
 * completion still lands pre-fix (unfenced) but unattributed.
 *
 * Run: node ce002_attempt_fencing.js            (all cases)
 *      node ce002_attempt_fencing.js F1          (one case)
 */
const path = require('path');
const assert = require('assert');
const ROOT = '/home/nolan/worktrees/constitutional-convergence';
const { identityAuthority } = require(path.join(ROOT, 'ping-runtime/authorities/identity_authority.js'));
const { MissionRuntime } = require(path.join(ROOT, 'ping-runtime/orchestration/mission_runtime.js'));
const { UnifiedEventRuntime } = require(path.join(ROOT, 'ping-runtime/events/unified_event_runtime.js'));
const { MissionScheduler } = require(path.join(ROOT, 'ping-runtime/orchestration/mission_scheduler.js'));

/* ------------------------------------------------------------------ */
/* In-memory mock PostgreSQL pool. Mirrors ping_missions with the      */
/* attempts fencing column (DEFAULT 1, bumped by assign) and           */
/* ping_events with ON CONFLICT DO NOTHING + jsonb round trip.         */
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
        result: null, assigned_to: null, lease_until: null,
        attempts: 1, // mirrors the DEFAULT 1 on ping_missions.attempts
        created_at: new Date().toISOString(),
        started_at: null, completed_at: null, error: null,
        retries: 0, retry_at: null,
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
        for (const r of hit) { r.status = 'created'; r.assigned_to = null; r.lease_until = null; }
        return { rows: hit.map((r) => ({ mission_id: r.mission_id })), rowCount: hit.length };
      }
      const mEq = /WHERE mission_id = \$(\d+)/.exec(t);
      const id = mEq ? norm(params[+mEq[1] - 1]) : null;
      const m = pool._db.missions.find((r) => r.mission_id === id);
      if (!m) return { rows: [], rowCount: 0 };
      let updated = false;
      const guard = /AND status = '(\w+)'/.exec(t);
      if (guard && m.status !== guard[1]) return { rows: [], rowCount: 0 };
      const inGuard = /AND status IN \(([^)]+)\)/.exec(t);
      if (inGuard) {
        const allowed = inGuard[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
        if (!allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      }
      // CE-002: the fencing guard on complete()'s UPDATE. Dormant on
      // unpatched code (its SQL carries no attempts predicate).
      const attEq = /AND attempts = \$(\d+)/.exec(t);
      if (attEq && m.attempts !== +norm(params[+attEq[1] - 1])) {
        return { rows: [], rowCount: 0 };
      }
      const setRe = /SET\s+(.*?)(?:\s+WHERE|\s+RETURNING|$)/s.exec(t);
      const setPart = setRe ? setRe[1] : '';
      const applySet = (re, fn) => {
        let mm;
        while ((mm = re.exec(setPart)) !== null) fn(mm);
      };
      const applyCol = (col, val) => {
        if (col === 'status') { m.status = val; updated = true; }
        else if (col === 'assigned_to') { m.assigned_to = val; updated = true; }
        else if (col === 'lease_until') { m.lease_until = val; updated = true; }
        else if (col === 'started_at') { m.started_at = val; updated = true; }
        else if (col === 'completed_at') { m.completed_at = val; updated = true; }
        else if (col === 'result') {
          try { m.result = typeof val === 'string' ? JSON.parse(val) : val; }
          catch (e) { m.result = val; }
          updated = true;
        }
        else if (col === 'error') { m.error = val; updated = true; }
        else if (col === 'retries') { m.retries = val; updated = true; }
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
    if (/FROM ping_missions/.test(t)) {
      let rows = pool._db.missions.map((m) => ({ ...m }));
      const mEq = /WHERE mission_id = \$(\d+)/.exec(t);
      if (mEq) rows = rows.filter((r) => r.mission_id === norm(params[+mEq[1] - 1]));
      const sEq = /status = '(\w+)'/.exec(t);
      if (sEq) rows = rows.filter((r) => r.status === sEq[1]);
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
  const origEmit = uer.emit.bind(uer);
  uer.emit = async (eventType, source, payload, options = {}) => {
    const res = await origEmit(eventType, source, payload, options);
    if (eventType === 'MISSION_COMPLETED') {
      pool.completions.push({
        eventId: res.eventId || (res.event && res.event.event_id) || null,
        status: res.status,
        code: res.code || null,
        deduplicated: !!res.deduplicated,
        payload: res.event ? res.event.payload : payload,
        options: JSON.parse(JSON.stringify(options || {})),
      });
    }
    return res;
  };
  return { pool, uer, rt };
}

function completionEventId(missionId) {
  return identityAuthority.generateId('event', {
    event_type: 'MISSION_COMPLETED',
    source: 'mission-runtime',
    namespace: 'core::system',
    logical_id: MissionRuntime.completionLogicalId(missionId),
  });
}

function completionsOf(pool, missionId) {
  return pool.completions.filter((c) => c.payload && c.payload.missionId === missionId);
}

// Token construction: attempts DEFAULT 1, +1 per successful assign().
// After A's successful assign the fencing token is 2, after B's it is 3.
const TOK_A = 2;
const TOK_B = 3;

let passed = 0;
let failed = 0;
function check(tag, cond, detail) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL [${tag}]: ${detail}`); }
}
function expireLease(pool, missionId) {
  const row = pool._db.missions.find((r) => r.mission_id === missionId);
  row.lease_until = new Date(Date.now() - 60000).toISOString();
}
// The lease-reassignment race: A holds the lease, it expires, the reaper
// reclaims, B claims and starts. Returns { m, pool, rt } with B running.
async function setupReassignedLease() {
  const { pool, uer, rt } = makeStack();
  const m = await rt.create('ping', { scenario: 'stale-completion' });
  await rt.assign(m, 'worker-A');
  await rt.start(m, 'worker-A');
  expireLease(pool, m);
  const reaped = await rt.reapExpiredLeases();
  assert.strictEqual(reaped, 1, 'setup: expired lease reaped');
  await rt.assign(m, 'worker-B');
  await rt.start(m, 'worker-B');
  return { m, pool, uer, rt };
}

/* ------------------------------------------------------------------ */
/* F0: fencing-token API presence and issuance                        */
/* ------------------------------------------------------------------ */
async function caseF0() {
  console.log('Case F0: fencing-token API');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F0' });
  await rt.assign(m, 'worker-A');
  if (typeof rt.getFencingToken !== 'function') {
    check('F0', false, 'getFencingToken() absent: no fencing-token API on unpatched code (pre-fix gap)');
    return;
  }
  const tok = await rt.getFencingToken(m);
  check('F0', tok === TOK_A, `fencing token after one successful assign is ${TOK_A} (got ${tok})`);
  const missing = await rt.getFencingToken('no-such-mission');
  check('F0', missing === null, `unknown mission -> null token (got ${missing})`);
  console.log('Case F0 done');
}

/* ------------------------------------------------------------------ */
/* FB-A (fail-before a): stale worker completion accepted after the   */
/* lease was reassigned. A's superseded attempt completes first; on   */
/* unpatched code its completion wins the row and is emitted.         */
/* ------------------------------------------------------------------ */
async function caseFBA() {
  console.log('Case FB-A: stale completion accepted after lease reassignment');
  const { m, pool, rt } = await setupReassignedLease();

  // Stale worker A presents its superseded token and lands FIRST.
  const staleRes = await rt.complete(m, { out: 'stale-A' }, TOK_A);
  // Legitimate worker B completes with the current token.
  const legitRes = await rt.complete(m, { out: 'legit-B' }, TOK_B);

  check('FB-A', staleRes && staleRes.code === 'STALE_ATTEMPT' && staleRes.completed === false,
    `stale attempt fails closed with STALE_ATTEMPT (got ${JSON.stringify(staleRes)})`);
  const em = completionsOf(pool, m);
  check('FB-A', em.length === 1, `exactly one accepted completion (got ${em.length})`);
  check('FB-A', em[0] && em[0].payload && em[0].payload.result && em[0].payload.result.out === 'legit-B',
    `the accepted completion is the legitimate attempt's (got out=${em[0] && em[0].payload && em[0].payload.result && em[0].payload.result.out})`);
  check('FB-A', em[0] && em[0].payload && em[0].payload.attempt === TOK_B,
    `the accepted completion names the current attempt (got attempt=${em[0] && em[0].payload && em[0].payload.attempt})`);
  check('FB-A', legitRes && legitRes.completed === true,
    `legitimate current-attempt completion accepted (got ${JSON.stringify(legitRes)})`);
  const dbRow = (await pool.query('SELECT result, status FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('FB-A', dbRow && dbRow.result && dbRow.result.out === 'legit-B',
    `DB row holds the legitimate attempt's result (got out=${dbRow && dbRow.result && dbRow.result.out})`);
  console.log('Case FB-A done');
}

/* ------------------------------------------------------------------ */
/* FB-B (fail-before b): the accepted stale completion is             */
/* indistinguishable from the legitimate one. The deterministic        */
/* identity (CE-001) is attempt-blind by design, so without fencing   */
/* nothing names the producing attempt.                               */
/* ------------------------------------------------------------------ */
async function caseFBB() {
  console.log('Case FB-B: stale completion indistinguishable from legitimate');
  const { m, pool, rt } = await setupReassignedLease();

  const staleRes = await rt.complete(m, { out: 'stale-A' }, TOK_A);
  const em = completionsOf(pool, m);

  // The CE-001 property: identity cannot distinguish attempts. Pre-fix
  // a stale completion IS accepted, and it must carry the deterministic
  // completion identity (attempt-blind: same event_id for any attempt) -
  // that is WHY fencing must exist at the transition. Post-fix no stale
  // completion exists at all, so there is nothing to compare.
  if (em.length === 1) {
    check('FB-B', em[0].eventId === completionEventId(m),
      'deterministic completion identity is attempt-blind (same event_id for any attempt)');
  } else {
    check('FB-B', em.length === 0,
      `no stale completion exists (fencing rejected it; got ${em.length} emissions)`);
  }
  // Pre-fix the journal carries the stale worker's result with no
  // attempt attribution; post-fix no stale completion exists at all.
  const staleEmissions = em.filter((c) => c.payload && c.payload.result && c.payload.result.out === 'stale-A');
  check('FB-B', staleEmissions.length === 0,
    `no accepted completion carries the superseded attempt's result (got ${staleEmissions.length})`);
  check('FB-B', staleRes && staleRes.code === 'STALE_ATTEMPT',
    `stale attempt failed closed (got ${JSON.stringify(staleRes)})`);
  console.log('Case FB-B done');
}

/* ------------------------------------------------------------------ */
/* F1: stale attempt fails closed; row untouched; nothing emitted      */
/* ------------------------------------------------------------------ */
async function caseF1() {
  console.log('Case F1: stale attempt fail-closed, row untouched');
  const { m, pool, rt } = await setupReassignedLease();

  const staleRes = await rt.complete(m, { out: 'stale-A' }, TOK_A);
  check('F1', staleRes && staleRes.status === 'stale' && staleRes.code === 'STALE_ATTEMPT' && staleRes.completed === false,
    `typed STALE_ATTEMPT, completed=false (got ${JSON.stringify(staleRes)})`);
  check('F1', pool.completions.length === 0,
    `zero MISSION_COMPLETED emissions from the stale attempt (got ${pool.completions.length})`);
  const row = (await pool.query('SELECT status, assigned_to, result FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('F1', row && row.status === 'running', `mission still running (got ${row && row.status})`);
  check('F1', row && row.assigned_to === 'worker-B', `still held by worker-B (got ${row && row.assigned_to})`);
  check('F1', row && row.result === null, `no result written by the stale attempt (got ${JSON.stringify(row && row.result)})`);

  // The legitimate holder then completes normally through the CE-001 path.
  const legitRes = await rt.complete(m, { out: 'legit-B' }, TOK_B);
  check('F1', legitRes && legitRes.completed === true && legitRes.status === 'ok',
    `legitimate completion accepted after the rejected stale one (got ${JSON.stringify(legitRes)})`);
  const em = completionsOf(pool, m);
  check('F1', em.length === 1 && em[0].eventId === completionEventId(m),
    'exactly one emission, carrying the deterministic completion identity');
  console.log('Case F1 done');
}

/* ------------------------------------------------------------------ */
/* F2: missing / invalid token fails closed                           */
/* ------------------------------------------------------------------ */
async function caseF2() {
  console.log('Case F2: missing or invalid token fails closed');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F2' });
  await rt.assign(m, 'worker-A');
  await rt.start(m, 'worker-A');

  for (const [label, bad] of [['undefined', undefined], ['null', null], ['zero', 0], ['negative', -1], ['string', '2'], ['float', 2.5]]) {
    const res = await rt.complete(m, { out: 'x' }, bad);
    check('F2', res && res.code === 'STALE_ATTEMPT' && res.completed === false,
      `token ${label} fails closed with STALE_ATTEMPT (got ${JSON.stringify(res)})`);
  }
  check('F2', pool.completions.length === 0, `no emissions from tokenless attempts (got ${pool.completions.length})`);
  const row = (await pool.query('SELECT status FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('F2', row && row.status === 'running', `mission still running after rejected attempts (got ${row && row.status})`);
  console.log('Case F2 done');
}

/* ------------------------------------------------------------------ */
/* F3: legitimate retry through the fenced API                        */
/* ------------------------------------------------------------------ */
async function caseF3() {
  console.log('Case F3: legitimate retry with fencing');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F3' });
  await rt.assign(m, 'w1');
  await rt.start(m, 'w1');
  await rt.fail(m, 'worker exploded');
  // Retry re-enters through the atomic claim lifecycle (as the scheduler
  // does via reclaimRetryPending -> created).
  await pool.query(
    'UPDATE ping_missions SET status = $1 WHERE mission_id = $2',
    ['created', m]
  );
  await rt.assign(m, 'w2');
  await rt.start(m, 'w2');
  const tok = (typeof rt.getFencingToken === 'function') ? await rt.getFencingToken(m) : TOK_B;
  const res = await rt.complete(m, { attempt: 2 }, tok);

  check('F3', res && res.completed === true, `retry completion accepted (got ${JSON.stringify(res)})`);
  const em = completionsOf(pool, m);
  check('F3', em.length === 1, `exactly one MISSION_COMPLETED emission after retry (got ${em.length})`);
  check('F3', em[0].status === 'ok' && !em[0].deduplicated, 'retry completion accepted, not a dedup');
  check('F3', em[0].eventId === completionEventId(m), 'retry identity equals the deterministic identity');
  console.log('Case F3 done');
}

/* ------------------------------------------------------------------ */
/* F4: current-holder double complete -> second is a no-op            */
/* ------------------------------------------------------------------ */
async function caseF4() {
  console.log('Case F4: idempotent double complete by the current holder');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F4' });
  await rt.assign(m, 'w1');
  await rt.start(m, 'w1');
  const tok = (typeof rt.getFencingToken === 'function') ? await rt.getFencingToken(m) : TOK_A;

  const first = await rt.complete(m, { out: 1 }, tok);
  const second = await rt.complete(m, { out: 2 }, tok);
  check('F4', first && first.completed === true, `first completion accepted (got ${JSON.stringify(first)})`);
  check('F4', second && second.completed === false && second.code !== 'STALE_ATTEMPT',
    `second completion is a no-op, not a stale rejection (got ${JSON.stringify(second)})`);
  const em = completionsOf(pool, m);
  check('F4', em.length === 1, `one emission total (got ${em.length})`);
  const row = (await pool.query('SELECT result FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('F4', row && row.result && row.result.out === 1, 'first result wins; no overwrite by the redelivery');
  console.log('Case F4 done');
}

/* ------------------------------------------------------------------ */
/* F5: reconciler is the privileged recovery path (no token needed)   */
/* ------------------------------------------------------------------ */
async function caseF5() {
  console.log('Case F5: reconciler privileged path unaffected by fencing');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F5' });
  await rt.assign(m, 'w1');
  await rt.start(m, 'w1');
  // Crash between the DB UPDATE and the emit: row completed, no event.
  // Simulate by completing through the row directly (as CE-001 5b does
  // via a throwing emit).
  const tok = (typeof rt.getFencingToken === 'function') ? await rt.getFencingToken(m) : TOK_A;
  await pool.query(
    "UPDATE ping_missions SET status = 'completed', result = $1 WHERE mission_id = $2",
    [JSON.stringify({ out: 9 }), m]
  );

  const report = await rt.reconcileLostCompletions();
  check('F5', report.checked === 1 && report.reEmitted === 1,
    `reconciler repaired the lost completion (report=${JSON.stringify(report)})`);
  const em = completionsOf(pool, m);
  check('F5', em.length === 1 && em[0].eventId === completionEventId(m),
    'reconciled emission carries the deterministic completion identity');
  const rowAttempts = (await pool.query('SELECT attempts FROM ping_missions WHERE mission_id = $1', [m])).rows[0].attempts;
  check('F5', em[0].payload && em[0].payload.attempt === rowAttempts && rowAttempts === tok,
    `reconciled emission names the row's own attempt (payload.attempt=${em[0].payload && em[0].payload.attempt}, row=${rowAttempts}, holder token=${tok})`);
  const report2 = await rt.reconcileLostCompletions();
  check('F5', report2.reEmitted === 0 && report2.alreadyPresent === 1, 'second reconciliation is a dedup no-op');
  console.log('Case F5 done');
}

/* ------------------------------------------------------------------ */
/* F6: scheduler _dispatch threads the token end to end               */
/* ------------------------------------------------------------------ */
async function caseF6() {
  console.log('Case F6: scheduler dispatches with fencing');
  const { pool, uer, rt } = makeStack();
  const workerRuntime = {
    getStats: () => ({ workers: { observation: { eventTypes: ['PING_F6'] } } }),
    dispatch: async () => ({ status: 'ok' }),
  };
  const scheduler = new MissionScheduler({ pool, missionRuntime: rt, workerRuntime, pollIntervalMs: 60000 });
  const m = await rt.create('DOCUMENT_IMPORT', { event_type: 'PING_F6' });

  await scheduler._dispatch({ mission_id: m, mission_type: 'DOCUMENT_IMPORT', payload: { event_type: 'PING_F6' } });

  const em = completionsOf(pool, m);
  check('F6', em.length === 1, `one MISSION_COMPLETED emission from the scheduler path (got ${em.length})`);
  check('F6', em[0] && em[0].status === 'ok', `emission accepted (got status=${em[0] && em[0].status})`);
  check('F6', em[0] && em[0].payload && em[0].payload.attempt === TOK_A,
    `scheduler-threaded completion names the granted attempt (got ${em[0] && em[0].payload && em[0].payload.attempt})`);
  check('F6', em[0] && em[0].eventId === completionEventId(m), 'deterministic completion identity preserved');
  check('F6', scheduler.getStats().completed === 1, `scheduler counted one completion (got ${scheduler.getStats().completed})`);
  const row = (await pool.query('SELECT status FROM ping_missions WHERE mission_id = $1', [m])).rows[0];
  check('F6', row && row.status === 'completed', `mission row completed (got ${row && row.status})`);
  console.log('Case F6 done');
}

/* ------------------------------------------------------------------ */
/* F7: renewLease does not rotate the fencing token                   */
/* ------------------------------------------------------------------ */
async function caseF7() {
  console.log('Case F7: lease renewal keeps the token');
  const { pool, rt } = makeStack();
  const m = await rt.create('ping', { case: 'F7' });
  await rt.assign(m, 'w1');
  await rt.start(m, 'w1');
  const before = (typeof rt.getFencingToken === 'function') ? await rt.getFencingToken(m) : TOK_A;
  await rt.renewLease(m, 120);
  const after = (typeof rt.getFencingToken === 'function') ? await rt.getFencingToken(m) : TOK_A;
  check('F7', before === after && before === TOK_A, `token unchanged by renewal (before=${before}, after=${after})`);
  const res = await rt.complete(m, { out: 1 }, after);
  check('F7', res && res.completed === true, `completion with the renewed-lease token accepted (got ${JSON.stringify(res)})`);
  console.log('Case F7 done');
}

/* ------------------------------------------------------------------ */
/* Runner                                                             */
/* ------------------------------------------------------------------ */
const CASES = { F0: caseF0, 'FB-A': caseFBA, 'FB-B': caseFBB, F1: caseF1, F2: caseF2, F3: caseF3, F4: caseF4, F5: caseF5, F6: caseF6, F7: caseF7 };

async function main() {
  const only = process.argv[2];
  const names = only ? [only] : Object.keys(CASES);
  for (const name of names) {
    const fn = CASES[name];
    if (!fn) { console.error(`unknown case: ${name}`); process.exit(2); }
    await fn();
  }
  console.log(`\nCE-002: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
