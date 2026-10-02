'use strict';
/**
 * W2 harness driver for the ce002 MissionRuntime reaper seam.
 *
 * HARNESS ONLY - NOT PRODUCT CODE. Drives the REAL ce002 MissionRuntime
 * (the reached runtime's local mirror) against a SQL-text-driven FakePool
 * with a controllable clock. The pool evaluates WHERE conditions FROM THE
 * SQL TEXT the implementation sends (never invented), so the harness is
 * honest across the wide->narrowed predicate change.
 *
 * Scenario = T-05 fixture-02 (lease expiration after possible effect):
 * a started mission with an expired lease must NOT be reset to 'created';
 * a never-started assigned mission with an expired lease MUST be reclaimed.
 */
const path = require('path');

const IMPL = process.env.W2_IMPL ||
  '/home/hatch/workspace/ping-24h/sprint/writers/w2-reaper/ce002-port/src/mission_runtime.js';
const { MissionRuntime } = require(IMPL);

class FakePool {
  constructor(opts = {}) {
    this.missions = new Map();
    this._now = typeof opts.now === 'function' ? opts.now : () => Date.now();
  }
  _iso(ms) { return new Date(ms === undefined ? this._now() : ms).toISOString(); }

  // WHERE evaluation, driven strictly by the SQL text the implementation sent.
  _whereAllows(sql, row) {
    const inList = sql.match(/status IN \(([^)]+)\)/);
    if (inList) {
      const vals = inList[1].split(',').map(s => s.trim().replace(/'/g, ''));
      if (!vals.includes(row.status)) return false;
    }
    const eqStatus = sql.match(/AND status = '([a-z_]+)'/);
    if (eqStatus && row.status !== eqStatus[1]) return false;
    if (/started_at IS NULL/.test(sql) && row.started_at !== null) return false;
    if (/started_at IS NOT NULL/.test(sql) && row.started_at === null) return false;
    if (/lease_until IS NOT NULL/.test(sql) && row.lease_until === null) return false;
    if (/lease_until < NOW\(\)/.test(sql) &&
        !(row.lease_until && Date.parse(row.lease_until) < this._now())) return false;
    return true;
  }

  _applySet(row, setClause, params) {
    const assignments = setClause.match(/(?:[^,'"]|'[^']*'|"[^"]*")+/g) || [];
    for (const a of assignments) {
      const eq = a.indexOf('=');
      if (eq < 0) continue;
      const col = a.slice(0, eq).trim();
      const expr = a.slice(eq + 1).trim();
      let m;
      if (/^NULL$/i.test(expr)) row[col] = null;
      else if ((m = expr.match(/^\$(\d+)$/))) row[col] = params[parseInt(m[1], 10) - 1];
      else if (/^NOW\(\) \+ INTERVAL '(\d+) seconds'$/.test(expr)) {
        const secs = parseInt(expr.match(/INTERVAL '(\d+) seconds'/)[1], 10);
        row[col] = this._iso(this._now() + secs * 1000);
      }
      else if (/^NOW\(\)$/i.test(expr)) row[col] = this._iso();
      else if (/^attempts \+ 1$/.test(expr)) row.attempts = (row.attempts || 0) + 1;
      else if (/^'.*'$/.test(expr)) row[col] = expr.slice(1, -1);
      else if (/^-?\d+$/.test(expr)) row[col] = parseInt(expr, 10);
      else throw new Error(`FakePool: unhandled SET expr: ${expr}`);
    }
  }

  async query(sql, params = []) {
    const S = sql.replace(/\s+/g, ' ').trim();
    if (/^(CREATE|ALTER)/.test(S)) return { rows: [], rowCount: 0 };

    if (S.includes('INSERT INTO ping_missions')) {
      const id = params[0];
      if (this.missions.has(id)) return { rows: [], rowCount: 0 }; // ON CONFLICT DO NOTHING
      this.missions.set(id, {
        mission_id: id, mission_type: params[1], payload: params[2],
        priority: params[3] || 0, created_by: params[4] || null,
        status: 'created', result: null, assigned_to: null,
        created_at: this._iso(), started_at: null, completed_at: null,
        error: null, retries: 0, retry_at: null, lease_until: null,
        claimed_at: null, attempts: 1,
      });
      return { rows: [], rowCount: 1 };
    }

    if (S.startsWith('UPDATE ping_missions')) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      const idMatch = S.match(/mission_id = \$(\d+)/);
      let targets;
      if (idMatch) {
        const row = this.missions.get(params[parseInt(idMatch[1], 10) - 1]);
        targets = row ? [row] : [];
      } else {
        targets = [...this.missions.values()]; // reaper: table scan
      }
      const out = [];
      for (const row of targets) {
        if (!this._whereAllows(S, row)) continue;
        this._applySet(row, setClause, params);
        out.push({ mission_id: row.mission_id });
      }
      const returning = /RETURNING mission_id/.test(S);
      return { rows: returning ? out : [], rowCount: out.length };
    }

    throw new Error(`FakePool: unhandled SQL: ${S.slice(0, 160)}`);
  }
}

function rig() {
  let now = Date.now();
  const pool = new FakePool({ now: () => now });
  const mr = new MissionRuntime({ pool });
  const advance = (ms) => { now += ms; };
  const row = (id) => pool.missions.get(id);
  return { pool, mr, advance, row, now: () => now };
}

function ev(list, ok, text) { list.push(`${ok ? 'OK  ' : 'FAIL'} ${text}`); return ok; }

/**
 * Fixture-02 scenario against the ce002 reaper seam.
 * Returns { verdict, evidence[] }.
 * CORRECT = no hostile outcome: started row never reset to 'created',
 *           never-started expired-lease row still reclaimed, live leases untouched.
 */
async function f02() {
  const r = rig(); const E = []; let pass = true;
  await r.mr.initialize();

  // Row A: assigned AND started (worker invoked, effect UNKNOWN), lease expires.
  const a = await r.mr.create('email.send', { event_id: 'w2-f2a' });
  ev(E, (await r.mr.assign(a, 'w1')) === 1, `A assigned (claim won)`);
  ev(E, (await r.mr.start(a, 'w1')) === 1, `A started (worker invoked)`);
  r.advance(61 * 1000); // 60s lease TTL expires
  const reapedA = await r.mr.reapExpiredLeases();
  const ra = r.row(a);
  if (reapedA > 0 || ra.status === 'created') {
    E.push(`HOSTILE reaper reset a possibly-executed mission to 'created' ` +
      `(reaped=${reapedA}, status=${ra.status}) — automatic retry of an unknown-outcome mission`);
    pass = false;
  } else {
    ev(E, reapedA === 0, `reaper reclaimed 0 rows for the started mission`);
  }
  pass = ev(E, ra.status === 'running', `started row stays 'running' (got ${ra.status})`) && pass;
  pass = ev(E, ra.started_at !== null, `started_at preserved on the orphaned row`) && pass;

  // Control B: NEVER-STARTED assigned row, expired lease -> legitimate reclaim.
  const b = await r.mr.create('email.send', { event_id: 'w2-f2b' });
  await r.mr.assign(b, 'w1'); // no start(): worker never invoked
  r.advance(61 * 1000);
  const reapedB = await r.mr.reapExpiredLeases();
  pass = ev(E, reapedB === 1 && r.row(b).status === 'created',
    `never-started expired-lease row reclaimed to created (legitimate case preserved)`) && pass;

  // Control C: live lease -> reaper touches nothing.
  const c = await r.mr.create('email.send', { event_id: 'w2-f2c' });
  await r.mr.assign(c, 'w1'); await r.mr.start(c, 'w1');
  const reapedC = await r.mr.reapExpiredLeases();
  pass = ev(E, reapedC === 0 && r.row(c).status === 'running',
    `live-lease running row untouched by reaper`) && pass;

  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/** Targeted predicate unit tests: every (status, started, lease) cell. */
async function targeted() {
  const E = []; let pass = true;
  const cases = [
    // [label, startIt, advanceMs, expectReaped, expectStatus]
    ['assigned+started+expired', true, 61000, false, 'running'],
    ['assigned+never-started+expired', false, 61000, true, 'created'],
    ['assigned+started+live', true, 1000, false, 'running'],
    ['assigned+never-started+live', false, 1000, false, 'assigned'],
    ['created+no-lease', null, 61000, false, 'created'],
  ];
  for (const [label, startIt, adv, expectReaped, expectStatus] of cases) {
    const r = rig(); await r.mr.initialize();
    const id = await r.mr.create('t.ping', { event_id: `w2-t-${label}` });
    if (startIt !== null) {
      await r.mr.assign(id, 'w1');
      if (startIt) await r.mr.start(id, 'w1');
    }
    r.advance(adv);
    const before = JSON.stringify(r.row(id));
    const n = await r.mr.reapExpiredLeases();
    const m = r.row(id);
    const reaped = n === 1;
    const ok = (reaped === expectReaped) && m.status === expectStatus;
    if (!ok) E.push(`FAIL ${label}: reaped=${reaped} (want ${expectReaped}), status=${m.status} (want ${expectStatus})`);
    else E.push(`OK   ${label}: reaped=${reaped}, status=${m.status}`);
    pass = ok && pass;
    void before;
  }
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

module.exports = { f02, targeted, IMPL };
