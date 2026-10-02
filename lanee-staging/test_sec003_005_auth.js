/**
 * LANE E (SEC-003/004/005) — HTTP integration tests: adjacent-surface auth wiring.
 *
 * Mounts the REAL route modules behind the REAL ExteriorAuthMiddleware,
 * composed EXACTLY as the Lane E gateway_runtime.js patch does:
 *
 *   _buildPgHandlers (via requireAuth): /context, /api/v1/repository, /system,
 *                                       /deployments, /runtime, /canonical-events
 *   _mountRoutes (via mcAuth):          /api/v1/ollama, /knowledge
 *
 * (The requireAuth wrapper chains authMw before the router; composing
 *  app.use(path, authMw, router) is behaviorally identical for auth decisions,
 *  the same composition Lane B's test uses for /tenants.)
 *
 * All service dependencies are isolated fakes. No production state touched.
 *
 * Contract under test:
 *   - unauthenticated request       -> 401 (rejected)
 *   - authenticated with wrong key -> 401 (rejected)
 *   - authenticated with valid key -> NOT 401 (authorized succeeds)
 *
 * Fail-before: the companion contract test
 * (test_mount_wiring_contract_sec003_005.js) reads gateway_runtime.js source
 * and is RED on the pre-fix tree. This file proves the composed pattern
 * itself behaves (401 fail-closed; valid keys pass).
 *
 * Run: NODE_PATH=/tmp/laneb-test/node_modules node tests/security/test_sec003_005_auth.js
 */
'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');

const express = require('express');
const GW = path.join(__dirname, '..', '..', 'gateway');
const ExteriorAuthMiddleware = require(path.join(GW, 'exterior_auth_middleware.js'));
const createContextRoutes = require(path.join(GW, 'routes', 'context.js'));
const createRepositoryRoutes = require(path.join(GW, 'routes', 'repository.js'));
const createSystemRoutes = require(path.join(GW, 'routes', 'system.js'));
const createDeploymentRoutes = require(path.join(GW, 'routes', 'deployments.js'));
const createRuntimeRoutes = require(path.join(GW, 'routes', 'runtime.js'));
const createOllamaRoutes = require(path.join(GW, 'routes', 'ollama.js'));
const createKnowledgeRoutes = require(path.join(GW, 'routes', 'knowledge.js'));
const createCanonicalEventRoutes = require(path.join(GW, 'routes', 'canonical_events.js'));

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

const VALID_KEY = 'lanee-test-key-1';

function makePool() {
  const rows = [{
    api_key: VALID_KEY,
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

function makeEventReadAuthority() {
  const impl = {
    getRecentEventsForContext: async () => [{ event_id: 'e1', event_type: 'X' }],
    getWorkerStatusForContext: async () => ({ workers: 1 }),
    getDailyActivityForContext: async () => ({ days: 1 }),
    getLatestSummariesForContext: async () => [{ id: 's1' }],
    getRecentFailuresForContext: async () => [],
    getModelMetricsForContext: async () => ({ models: 1 }),
    getEventsByType: async () => [],
    getAllEvents: async () => [],
  };
  return new Proxy(impl, { get: (t, k) => (k in t ? t[k] : (async () => [])) });
}

function makeRepoStore() {
  const objs = new Map([['obj-1', { object_id: 'obj-1', kind: 'note', data: { a: 1 } }]]);
  return {
    append: async (o) => { const id = o.object_id || 'obj-new'; objs.set(id, { object_id: id, ...o }); return id; },
    load: async (id) => objs.get(id) || null,
    search: async () => Array.from(objs.values()),
    delete: async (id) => { objs.delete(id); },
  };
}

function makeDeploymentRegistry() {
  const deps = new Map([['dep-1', { deployment_id: 'dep-1', tenant_id: 'acme', version: '1.0.0', status: 'active' }]]);
  return {
    executeRegisterDeployment: async (d) => { const row = { deployment_id: 'dep-new', ...d }; deps.set(row.deployment_id, row); return row; },
    executeResolveDeployment: async (id) => deps.get(id) || null,
    executeListDeployments: async () => Array.from(deps.values()),
    executeResolveActiveDeployment: async (tid) => Array.from(deps.values()).find((d) => d.tenant_id === tid) || null,
    executeTransitionStatus: async (id, status) => { const d = deps.get(id); if (!d) return null; d.status = status; return d; },
    executeCompleteDeployment: async (id) => { const d = deps.get(id); if (d) d.status = 'complete'; return d || null; },
    executeFailDeployment: async (id) => { const d = deps.get(id); if (d) d.status = 'failed'; return d || null; },
    executeRollbackDeployment: async (id) => { const d = deps.get(id); if (d) d.status = 'rolled_back'; return d || null; },
  };
}

function makeRuntimeRegistry() {
  const comps = new Map([['rt-1', { component_id: 'rt-1', tenant_id: 'acme', component_type: 'worker', component_name: 'w1', status: 'healthy' }]]);
  return {
    executeRegisterComponent: async (c) => { const row = { component_id: 'rt-new', ...c }; comps.set(row.component_id, row); return row; },
    executeResolveComponent: async (id) => comps.get(id) || null,
    executeListComponents: async () => Array.from(comps.values()),
    executeTransitionStatus: async () => ({ status: 'healthy' }),
    executeRecordHeartbeat: async () => true,
    executeRemoveComponent: async () => {},
    executeDetectUnhealthy: async () => [],
  };
}

function makeOllama() {
  return {
    aiRuntime: { chat: async (prompt) => ({ status: 'ok', text: `echo:${prompt.slice(0, 20)}`, model: 'qwen2.5-coder:7b' }) },
    ollamaProvider: { health: async () => ({ status: 'healthy', models: ['qwen2.5-coder:7b'] }) },
  };
}

function makeKnowledge() {
  return {
    knowledgeGraph: {
      getStats: async () => ({ nodes: 1, edges: 0 }),
      queryNodes: async () => [{ node_id: 'n1' }],
      getNeighborhood: async () => ({ nodes: [{ node_id: 'n1' }], edges: [] }),
      addNode: async () => 'n-new',
      addEdge: async () => 'e-new',
    },
    hybridSearch: { search: async () => ({ results: [{ node_id: 'n1', score: 0.9 }], count: 1 }) },
  };
}

function makeCanonicalEventEnvelope() {
  return {
    executeEmitEvent: async (e) => ({ event_id: 'ce-new', ...e }),
    executeQueryEvents: async () => ({ events: [{ event_id: 'ce-1' }], count: 1 }),
    executeGetStats: async () => ({ total: 1 }),
    executeGetUnprocessed: async () => [{ event_id: 'ce-1' }],
    executeMarkProcessed: async () => ({ ok: true }),
    executeMarkFailed: async () => ({ ok: true }),
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
const BAD_AUTH = { authorization: 'Bearer <redacted>' };
const GOOD_AUTH = { authorization: `Bearer ${VALID_KEY}` };

// Every case: [label, method, path, body]. Composition mirrors the Lane E
// gateway_runtime.js patch exactly (auth middleware before each router).
const CASES = [
  // /context
  ['CONTEXT', 'GET', '/context/recent-events?limit=1', null],
  ['CONTEXT', 'GET', '/context/worker-status', null],
  ['CONTEXT', 'GET', '/context/runtime-digest', null],
  ['CONTEXT', 'GET', '/context/latest-summaries', null],
  ['CONTEXT', 'GET', '/context/recent-failures', null],
  ['CONTEXT', 'GET', '/context/model-metrics', null],
  ['CONTEXT', 'GET', '/context/daily-activity', null],
  // /api/v1/repository
  ['REPOSITORY', 'GET', '/api/v1/repository/objects', null],
  ['REPOSITORY', 'GET', '/api/v1/repository/objects/obj-1', null],
  ['REPOSITORY', 'POST', '/api/v1/repository/objects', { kind: 'note', data: { x: 1 } }],
  ['REPOSITORY', 'DELETE', '/api/v1/repository/objects/obj-1', null],
  // /system
  ['SYSTEM', 'GET', '/system/state', null],
  ['SYSTEM', 'GET', '/system/cache/drive_index.json', null],
  ['SYSTEM', 'GET', '/system/logs/sync.log', null],
  // /deployments
  ['DEPLOYMENTS', 'POST', '/deployments', { tenant_id: 'acme', version: '1.0.0', git_sha: 'abc123' }],
  ['DEPLOYMENTS', 'GET', '/deployments/dep-1', null],
  ['DEPLOYMENTS', 'GET', '/deployments/tenant/acme/active', null],
  ['DEPLOYMENTS', 'PUT', '/deployments/dep-1/status', { status: 'active' }],
  ['DEPLOYMENTS', 'POST', '/deployments/dep-1/complete', {}],
  ['DEPLOYMENTS', 'POST', '/deployments/dep-1/fail', {}],
  ['DEPLOYMENTS', 'POST', '/deployments/dep-1/rollback', {}],
  // /runtime
  ['RUNTIME', 'POST', '/runtime', { tenant_id: 'acme', component_type: 'worker', component_name: 'w1' }],
  ['RUNTIME', 'GET', '/runtime/rt-1', null],
  ['RUNTIME', 'GET', '/runtime/tenant/acme', null],
  ['RUNTIME', 'PUT', '/runtime/tenant/acme/type/worker/name/w1/status', { status: 'healthy' }],
  ['RUNTIME', 'POST', '/runtime/tenant/acme/type/worker/name/w1/heartbeat', {}],
  ['RUNTIME', 'DELETE', '/runtime/tenant/acme/type/worker/name/w1', null],
  ['RUNTIME', 'GET', '/runtime/tenant/acme/unhealthy', null],
  // /api/v1/ollama
  ['OLLAMA', 'GET', '/api/v1/ollama/models', null],
  ['OLLAMA', 'POST', '/api/v1/ollama/chat', { messages: ['hello'] }],
  ['OLLAMA', 'POST', '/api/v1/ollama/autocomplete', { messages: ['hel'] }],
  // /knowledge
  ['KNOWLEDGE', 'GET', '/knowledge/stats', null],
  ['KNOWLEDGE', 'GET', '/knowledge/nodes', null],
  ['KNOWLEDGE', 'GET', '/knowledge/nodes/n1/neighborhood', null],
  ['KNOWLEDGE', 'POST', '/knowledge/search', { query: 'q', namespace: 'ns' }],
  ['KNOWLEDGE', 'POST', '/knowledge/nodes', { nodeType: 't', label: 'l' }],
  ['KNOWLEDGE', 'POST', '/knowledge/edges', { sourceId: 'n1', targetId: 'n2', edgeType: 'rel' }],
  // /canonical-events
  ['CANONICAL', 'GET', '/canonical-events/stats', null],
  ['CANONICAL', 'GET', '/canonical-events/unprocessed?tenant_id=acme', null],
  ['CANONICAL', 'GET', '/canonical-events', null],
  ['CANONICAL', 'POST', '/canonical-events', { tenant_id: 'acme', event_type: 'E', source: 's', actor: 'a', payload: {} }],
  ['CANONICAL', 'POST', '/canonical-events/ce-1/processed', {}],
  ['CANONICAL', 'POST', '/canonical-events/ce-1/failed', {}],
];

async function run() {
  console.log('SEC-003/004/005 auth wiring tests (isolated fixtures, real route modules)');

  const auth = new ExteriorAuthMiddleware(makePool());
  await auth.initialize();
  const authMw = auth.middleware();

  const eventReadAuthority = makeEventReadAuthority();
  const { aiRuntime, ollamaProvider } = makeOllama();
  const { knowledgeGraph, hybridSearch } = makeKnowledge();

  const app = express();
  app.use(express.json());
  // Mount composition mirrors the Lane E gateway_runtime.js patch exactly.
  app.use('/context', authMw, createContextRoutes(eventReadAuthority));
  app.use('/api/v1/repository', authMw, createRepositoryRoutes(makeRepoStore()));
  app.use('/system', authMw, createSystemRoutes(eventReadAuthority));
  app.use('/deployments', authMw, createDeploymentRoutes(makeDeploymentRegistry()));
  app.use('/runtime', authMw, createRuntimeRoutes(makeRuntimeRegistry()));
  app.use('/api/v1/ollama', authMw, createOllamaRoutes(aiRuntime, ollamaProvider));
  app.use('/knowledge', authMw, createKnowledgeRoutes(knowledgeGraph, { hybridSearch }));
  app.use('/canonical-events', authMw, createCanonicalEventRoutes(makeCanonicalEventEnvelope()));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  try {
    for (const [label, method, p, body] of CASES) {
      await test(`${label} unauthenticated ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, NO_AUTH, body);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}: ${r.body.slice(0, 120)}`);
      });
      await test(`${label} wrong key ${method} ${p} -> 401`, async () => {
        const r = await request(port, method, p, BAD_AUTH, body);
        assert.strictEqual(r.status, 401, `expected 401 got ${r.status}`);
      });
      await test(`${label} valid key ${method} ${p} -> authorized (not 401)`, async () => {
        const r = await request(port, method, p, GOOD_AUTH, body);
        assert.notStrictEqual(r.status, 401, `authorized request rejected: ${r.body.slice(0, 120)}`);
      });
    }

    // Spot-check that authorized responses carry the expected payload shapes.
    await test('CANONICAL valid key POST /canonical-events emits an event', async () => {
      const r = await request(port, 'POST', '/canonical-events', GOOD_AUTH,
        { tenant_id: 'acme', event_type: 'E', source: 's', actor: 'a', payload: {} });
      assert.strictEqual(r.status, 200, `expected 200 got ${r.status}: ${r.body.slice(0, 120)}`);
      const j = JSON.parse(r.body);
      assert.ok(j.event && j.event.event_id, 'expected event with event_id');
    });

    await test('KNOWLEDGE valid key POST /knowledge/search returns results', async () => {
      const r = await request(port, 'POST', '/knowledge/search', GOOD_AUTH, { query: 'q', namespace: 'ns' });
      assert.strictEqual(r.status, 200, `expected 200 got ${r.status}: ${r.body.slice(0, 120)}`);
      const j = JSON.parse(r.body);
      assert.ok(Array.isArray(j.results) && j.results.length > 0, 'expected search results');
    });
  } finally {
    server.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log('FAILURES:', failures.join(' | ')); process.exit(1); }
}

run().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
