/**
 * LANE B (SEC-001/SEC-002) — Unit tests for ExteriorAuthMiddleware.
 *
 * The middleware is the EXISTING production authentication mechanism
 * (ported verbatim from the live gateway tree ~/ping-gateway-src).
 * These tests run against isolated fixtures (fake pg pool), never
 * production state.
 *
 * Run: NODE_PATH=/tmp/laneb-test/node_modules node tests/security/test_exterior_auth_middleware.js
 */
'use strict';

const assert = require('assert');
const path = require('path');

const ExteriorAuthMiddleware = require(path.join(__dirname, '..', '..', 'gateway', 'exterior_auth_middleware.js'));

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

function fakeReq(headers) {
  return { headers: headers || {}, method: 'GET', path: '/' };
}

function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

/**
 * Fake pg pool. `rows` = exterior_agent_credentials rows.
 * Records every query for assertions. Throws when `down` is true.
 */
function makePool(rows, opts) {
  opts = opts || {};
  const pool = {
    queries: [],
    query: async (sql, params) => {
      pool.queries.push({ sql, params });
      if (opts.down) throw new Error('pg down (fixture)');
      if (/CREATE TABLE|CREATE INDEX|ALTER TABLE/.test(sql)) return { rows: [] };
      if (/SELECT COUNT\(\*\)/.test(sql)) return { rows: [{ count: String(rows.length) }] };
      if (/INSERT INTO exterior_agent_credentials/.test(sql)) return { rows: [] };
      if (/FROM exterior_agent_credentials/.test(sql) && /WHERE api_key/.test(sql)) {
        const row = rows.find((r) => r.api_key === params[0] && r.is_active);
        return { rows: row ? [row] : [] };
      }
      if (/UPDATE exterior_agent_credentials/.test(sql)) return { rows: [] };
      return { rows: [] };
    },
  };
  return pool;
}

function credRow(overrides) {
  return Object.assign({
    api_key: 'key-valid-1',
    agent_id: 'test-agent',
    agent_name: 'Test Agent',
    is_active: true,
    expires_at: null,
  }, overrides || {});
}

async function run() {
  console.log('ExteriorAuthMiddleware unit tests (isolated fixtures)');

  await test('missing Authorization header -> 401 MISSING_AUTH, next not called', async () => {
    const pool = makePool([credRow()]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({});
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401, `expected 401 got ${res.statusCode}`);
    assert.strictEqual(res.body.code, 'MISSING_AUTH');
    assert.strictEqual(nextCalled, false);
  });

  await test('unknown API key -> 401 INVALID_CREDENTIAL, next not called', async () => {
    const pool = makePool([credRow()]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({ authorization: 'Bearer nope-not-a-key' });
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'INVALID_CREDENTIAL');
    assert.strictEqual(nextCalled, false);
  });

  await test('valid Bearer key -> next called, req.authenticatedAgent attached', async () => {
    const pool = makePool([credRow()]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({ authorization: 'Bearer key-valid-1' });
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'next() was not called');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(req.authenticatedAgent, { agentId: 'test-agent', agentName: 'Test Agent' });
  });

  await test('raw key without Bearer prefix is accepted', async () => {
    const pool = makePool([credRow()]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({ authorization: 'key-valid-1' });
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.authenticatedAgent.agentId, 'test-agent');
  });

  await test('expired credential -> 401', async () => {
    const pool = makePool([credRow({ api_key: 'key-expired', expires_at: new Date(Date.now() - 1000).toISOString() })]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({ authorization: 'Bearer key-expired' });
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
  });

  await test('inactive credential -> 401', async () => {
    const pool = makePool([credRow({ api_key: 'key-inactive', is_active: false })]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    const req = fakeReq({ authorization: 'Bearer key-inactive' });
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
  });

  await test('successful auth updates last_used_at (no silent skip)', async () => {
    const pool = makePool([credRow()]);
    const m = new ExteriorAuthMiddleware(pool);
    await m.initialize();
    const mw = m.middleware();
    let nextCalled = false;
    await mw(fakeReq({ authorization: 'Bearer key-valid-1' }), fakeRes(), () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    const updated = pool.queries.some((q) => /UPDATE exterior_agent_credentials/.test(q.sql) && /last_used_at/.test(q.sql));
    assert.strictEqual(updated, true, 'last_used_at UPDATE was not issued');
  });

  await test('degraded in-memory mode (pg down): env key accepted, unknown denied', async () => {
    const saved1 = process.env.MUSE_LEVEL_1_KEY;
    const saved2 = process.env.MUSE_LEVEL_2_KEY;
    process.env.MUSE_LEVEL_1_KEY = 'env-degraded-key-1';
    process.env.MUSE_LEVEL_2_KEY = 'env-degraded-key-2';
    try {
      const pool = makePool([], { down: true });
      const m = new ExteriorAuthMiddleware(pool);
      await m.initialize(); // must not throw; falls back to in-memory
      const mw = m.middleware();

      let ok = false;
      await mw(fakeReq({ authorization: 'Bearer env-degraded-key-1' }), fakeRes(), () => { ok = true; });
      assert.strictEqual(ok, true, 'env key rejected in degraded mode');

      const res = fakeRes();
      let bad = false;
      await mw(fakeReq({ authorization: 'Bearer wrong' }), res, () => { bad = true; });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(bad, false);
    } finally {
      if (saved1 === undefined) delete process.env.MUSE_LEVEL_1_KEY; else process.env.MUSE_LEVEL_1_KEY = saved1;
      if (saved2 === undefined) delete process.env.MUSE_LEVEL_2_KEY; else process.env.MUSE_LEVEL_2_KEY = saved2;
    }
  });

  await test('generated key material is never written to logs (Postgres seed path)', async () => {
    const saved1 = process.env.MUSE_LEVEL_1_KEY;
    const saved2 = process.env.MUSE_LEVEL_2_KEY;
    delete process.env.MUSE_LEVEL_1_KEY;
    delete process.env.MUSE_LEVEL_2_KEY;
    const logged = [];
    const origLog = console.log;
    console.log = (...a) => { logged.push(a.join(' ')); };
    try {
      const pool = makePool([]); // zero rows -> seeding runs, keys generated
      const m = new ExteriorAuthMiddleware(pool);
      await m.initialize();
    } finally {
      console.log = origLog;
      if (saved1 === undefined) delete process.env.MUSE_LEVEL_1_KEY; else process.env.MUSE_LEVEL_1_KEY = saved1;
      if (saved2 === undefined) delete process.env.MUSE_LEVEL_2_KEY; else process.env.MUSE_LEVEL_2_KEY = saved2;
    }
    const out = logged.join('\n');
    assert(/source: generated/.test(out), 'expected generated-source seed log, got: ' + out);
    assert(!/pk_[0-9a-f]{16,}/.test(out), 'generated key material leaked to logs:\n' + out);
  });

  await test('generated key material is never written to logs (in-memory degraded path)', async () => {
    const saved1 = process.env.MUSE_LEVEL_1_KEY;
    const saved2 = process.env.MUSE_LEVEL_2_KEY;
    delete process.env.MUSE_LEVEL_1_KEY;
    delete process.env.MUSE_LEVEL_2_KEY;
    const logged = [];
    const origLog = console.log;
    console.log = (...a) => { logged.push(a.join(' ')); };
    try {
      const pool = makePool([], { down: true }); // pg down -> in-memory seed path
      const m = new ExteriorAuthMiddleware(pool);
      await m.initialize();
    } finally {
      console.log = origLog;
      if (saved1 === undefined) delete process.env.MUSE_LEVEL_1_KEY; else process.env.MUSE_LEVEL_1_KEY = saved1;
      if (saved2 === undefined) delete process.env.MUSE_LEVEL_2_KEY; else process.env.MUSE_LEVEL_2_KEY = saved2;
    }
    const out = logged.join('\n');
    assert(/source: generated/.test(out), 'expected generated-source seed log, got: ' + out);
    assert(!/pk_[0-9a-f]{16,}/.test(out), 'generated key material leaked to logs:\n' + out);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log('FAILURES:', failures.join(', ')); process.exit(1); }
}

run().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
