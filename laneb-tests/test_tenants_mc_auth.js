/**
 * LANE B (SEC-001/SEC-002) — HTTP integration tests: /tenants + /mc auth wiring.
 *
 * Mounts the REAL route modules (gateway/routes/tenants.js,
 * gateway/routes/mission_control.js) behind the REAL ExteriorAuthMiddleware,
 * composed EXACTLY as the proposed gateway_runtime.js mount lines do:
 *
 *   app.use('/tenants', authMw, createTenantRoutes(registry))
 *   app.use('/mc',      authMw, createMissionControlRoutes(services))
 *
 * All service dependencies are isolated fakes. No production state touched.
 *
 * Contract under test:
 *   - unauthenticated request            -> 401 (rejected)
 *   - authenticated with wrong key      -> 401 (rejected)
 *   - authenticated with valid key      -> NOT 401 (authorized succeeds)
 *
 * Run: NODE_PATH=/tmp/laneb-test/node_modules node tests/security/test_tenants_mc_auth.js
 */
'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');

const express = require('express');
const ExteriorAuthMiddleware = require(path.join(__dirname, '..', '..', 'gateway', 'exterior_auth_middleware.js'));
const createTenantRoutes = require(path.join(__dirname, '..', '..', 'gateway', 'routes', 'tenants.js'));
const createMissionControlRoutes = require(path.join(__dirname, '..', '..', 'gateway', 'routes', 'mission_control.js'));

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

// ─── Isolated fixtures ──────────────────────────────────────────────

const VALID_KEY = 'laneb-test-key-1';

function makePool() {
  const rows = [{
    api_key: VALID_KEY, agent_id: 'laneb-test-agent', agent_name: 'Lane B Test',
    is_active: true, expires_at: null,
  }];
  return {
    query: async (sql, params) => {
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
}

function makeTenantRegistry() {
  const map = new Map();
  map.set('acme', { tenant_id: 'acme', name: 'Acme Corp', status: 'active' });
  return {
    executeRegisterTenant: async (t) => { const row = { status: 'active', ...t, tenant_id: t.tenantId }; map.set(t.tenantId, row); return row; },
    executeListTenants: async () => Array.from(map.values()),
    executeResolveTenant: async (id) => map.get(id) || null,
    executeUpdateTenant: async (id, updates) => { const cur = map.get(id); if (!cur) return null; const next = { ...cur, ...updates }; map.set(id, next); return next; },
    executeRemoveTenant: async (id) => { map.delete(id); },
    executeRecordHeartbeat: async () => true,
  };
}

const NOW = Date.now();
const ISO = (msAgo) => new Date(NOW - msAgo).toISOString();
const CANNED_EVENTS = [
  { event_id: 'e-lead-1', event_type: 'LEAD_CREATED', timestamp: ISO(3600000), source: 'website', namespace: 'tenant::hpp', payload: { lead_id: 'lead_001', description: 'Kitchen remodel estimate request' } },
  { event_id: 'e-est-1', event_type: 'ESTIMATE_SENT', timestamp: ISO(7200000), source: 'system', namespace: 'tenant::hpp', payload: { estimate_id: 'est_001', amount: 45000, sent_to: 'sarah@example.com' } },
  { event_id: 'e-rev-1', event_type: 'REVIEW_RECEIVED', timestamp: ISO(10800000), source: 'google', namespace: 'tenant::hpp', payload: { review_id: 'rev_001', rating: 5, text: 'Excellent work, highly recommend.', customer_id: 'cust_001' } },
  { event_id: 'e-inv-1', event_type: 'INVOICE_SENT', timestamp: ISO(14400000), source: 'system', namespace: 'tenant::hpp', payload: { invoice_id: 'inv_001', amount: 22500, sent_to: 'sarah@example.com' } },
  { event_id: 'e-proj-1', event_type: 'PROJECT_CREATED', timestamp: ISO(40 * 86400000), source: 'system', namespace: 'tenant::hpp', payload: { project_id: 'proj_001', name: 'Kitchen Remodel - Chen', type: 'remodel', customer_id: 'cust_001' } },
  { event_id: 'e-rec-1', event_type: 'RECOMMENDATION_CREATED', timestamp: ISO(1800000), source: 'worker', namespace: 'tenant::hpp', payload: { documentId: 'd1', recommendation: { action: 'Follow up lead_001', reason: 'High value', priority: 'high', confidence: 0.9, evidence: 'e-lead-1' } } },
  { event_id: 'e-rep-1', event_type: 'REPLAY_COMPLETED', timestamp: ISO(900000), source: 'replay', namespace: 'core::system', payload: { replay: { verified: true, reason: 'ok' }, authority: 'replay' } },
  { event_id: 'e-wit-1', event_type: 'WITNESS_CREATED', timestamp: ISO(800000), source: 'witness', namespace: 'core::system', payload: { upstreamEventId: 'e-rep-1', witness: { root: 'abc123' }, reason: 'ok' } },
];

function makeMcServices() {
  return {
    isCanonicalReady: () => true,
    unifiedEventRuntime: {
      _pool: { query: async () => ({ rows: [{ count: String(CANNED_EVENTS.length) }] }) },
      query: async (opts) => {
        let events = CANNED_EVENTS.slice();
        if (opts.eventType) events = events.filter((e) => e.event_type === opts.eventType);
        if (opts.since) events = events.filter((e) => e.timestamp >= opts.since);
        const limit = opts.limit || 100;
        return { events: events.slice(0, limit), count: events.length };
      },
      getCorrelationGroup: async () => ({ events: CANNED_EVENTS.filter((e) => e.event_type === 'REPLAY_COMPLETED' || e.event_type === 'WITNESS_CREATED') }),
    },
    missionRuntime: {
      getStats: async () => ({ active: 1, pending: 2 }),
      getPending: async () => [{ mission_id: 'm1', mission_type: 'observe', priority: 1, created_at: ISO(60000) }],
      getActive: async () => [{ mission_id: 'm2', mission_type: 'execute', status: 'running', assigned_to: 'w1', priority: 2, started_at: ISO(120000) }],
      getTrace: async (id) => (id === 'm1' ? { mission_id: 'm1', trace: [] } : null),
    },
    knowledgeGraph: { queryNodes: async () => [{ node_id: 'n1' }] },
    aiRuntime: { healthCheckAll: async () => ({ status: 'ok' }) },
    googleConnector: { health: async () => ({ status: 'ok' }) },
    workerRuntime: { getStats: () => ({ workers: 2 }) },
    missionScheduler: { getStats: () => ({ scheduled: 1 }) },
    eventBridge: { getStats: () => ({ bridged: 0 }) },
    eventToMissionBridge: { getStats: () => ({ triggered: 3 }) },
    legacyIngressAdapter: { getStats: () => ({ ingested: 0 }) },
    replayProvider: { _engineVersion: 'v1', getStats: () => ({ replays: 1, events: 5, failures: 0 }) },
    deadLetterAuthority: {
      getStats: async () => ({ total: 0 }),
      getDeadLettersByJobType: async () => [],
      getDeadLettersByMission: async (id) => (id === 'm1' ? [{ id: 'dl1' }] : []),
    },
  };
}

// ─── HTTP helper ────────────────────────────────────────────────────

function request(port, method, p, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: p,
      headers: Object.assign({},
        headers || {},
        data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const NO_AUTH = {};
const BAD_AUTH = { authorization: 'Bearer wrong-key' };
const GOOD_AUTH = { authorization: `Bearer ${VALID_KEY}` };

// Every /tenants endpoint: method, path, body
const TENANT_CASES = [
  ['GET', '/tenants', null],
  ['POST', '/tenants', { tenant_id: 'probe-neg-1', name: 'Negative Probe' }],
  ['GET', '/tenants/acme', null],
  ['PUT', '/tenants/acme', { name: 'Acme Updated' }],
  ['POST', '/tenants/acme/heartbeat', {}],
  ['DELETE', '/tenants/probe-neg-1', null], // created by the authed POST above
];

// Every /mc endpoint (all 29 in mission_control.js): method, path
const MC_CASES = [
  ['GET', '/mc/dashboard'],
  ['GET', '/mc/business/who-needs-followup'],
  ['GET', '/mc/business/stalled-estimates'],
  ['GET', '/mc/business/pending-reviews'],
  ['GET', '/mc/business/ai-recommendations'],
  ['GET', '/mc/business/today-work'],
  ['GET', '/mc/business/unpaid-invoices'],
  ['GET', '/mc/business/at-risk-projects'],
  ['GET', '/mc/business/marketing'],
  ['GET', '/mc/inbox'],
  ['GET', '/mc/queues'],
  ['GET', '/mc/queues/LEAD_CREATED'],
  ['GET', '/mc/missions/active'],
  ['GET', '/mc/missions/pending'],
  ['GET', '/mc/missions/stats'],
  ['GET', '/mc/missions/m1/trace'],
  ['GET', '/mc/knowledge'],
  ['GET', '/mc/system'],
  ['GET', '/mc/activity'],
  ['GET', '/mc/bridge'],
  ['GET', '/mc/event-mission-bridge'],
  ['GET', '/mc/scheduler'],
  ['GET', '/mc/workers'],
  ['GET', '/mc/replay/stats'],
  ['GET', '/mc/witness/stats'],
  ['GET', '/mc/replay/trace/corr-1'],
  ['GET', '/mc/dead-letters'],
  ['GET', '/mc/dead-letters/stats'],
  ['GET', '/mc/dead-letters/m1'],
];

async function run() {
  console.log('tenants + mc auth wiring tests (isolated fixtures, real route modules)');

  const auth = new ExteriorAuthMiddleware(makePool());
  await auth.initialize();
  const authMw = auth.middleware();

  const app = express();
  app.use(express.json());
  // Mount composition mirrors the proposed gateway_runtime.js mount lines exactly.
  app.use('/tenants', authMw, createTenantRoutes(makeTenantRegistry()));
  app.use('/mc', authMw, createMissionControlRoutes(makeMcServices()));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  try {
    for (const [method, p, body] of TENANT_CASES) {
      await test(`TENANTS unauthenticated ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, NO_AUTH, body);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}: ${r.body.slice(0, 120)}`);
      });
      await test(`TENANTS wrong key ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, BAD_AUTH, body);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}`);
      });
      await test(`TENANTS valid key ${method} ${p} -> authorized (not 401)`, async () => {
        const b = (method === 'POST' && p === '/tenants') ? { tenant_id: 'probe-neg-2', name: 'Probe 2' } : body;
        const r = await request(port, method, p === '/tenants/probe-neg-1' && method === 'DELETE' ? p : p, GOOD_AUTH, b);
        assert.notStrictEqual(r.status, 401, `authorized request rejected: ${r.body.slice(0, 120)}`);
      });
    }

    for (const [method, p] of MC_CASES) {
      await test(`MC unauthenticated ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, NO_AUTH, null);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}: ${r.body.slice(0, 120)}`);
      });
      await test(`MC wrong key ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, BAD_AUTH, null);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}`);
      });
      await test(`MC valid key ${method} ${p} -> authorized (not 401)`, async () => {
        const r = await request(port, method, p, GOOD_AUTH, null);
        assert.notStrictEqual(r.status, 401, `authorized request rejected: ${r.body.slice(0, 120)}`);
      });
    }

    // Spot-check that authorized responses carry the expected business payload shape.
    await test('MC valid key /mc/business/who-needs-followup returns business items', async () => {
      const r = await request(port, 'GET', '/mc/business/who-needs-followup', GOOD_AUTH, null);
      assert.strictEqual(r.status, 200);
      const j = JSON.parse(r.body);
      assert.strictEqual(j.status, 'ok');
      assert.ok(Array.isArray(j.items) && j.items.length > 0, 'expected business items');
    });

    await test('TENANTS valid key POST /tenants creates tenant (mutation works when authorized)', async () => {
      const r = await request(port, 'POST', '/tenants', GOOD_AUTH, { tenant_id: 'probe-neg-3', name: 'Probe 3' });
      assert.strictEqual(r.status, 200, `expected 200 got ${r.status}: ${r.body.slice(0, 120)}`);
      const j = JSON.parse(r.body);
      assert.ok(j.tenant, 'expected tenant in response');
    });
  } finally {
    server.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log('FAILURES:', failures.join(' | ')); process.exit(1); }
}

run().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
