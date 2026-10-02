/**
 * HOSTILE TEST (P1): tenant spoof at the first protected PING ingress.
 *
 * Attack: an authenticated-or-not caller acting for Tenant A sends
 * tenant_id = Tenant B through body / query / header / mission payload.
 * REQUIRED: Tenant B is NEVER selected from untrusted request material.
 * Trusted routing (operator per-source map) or the server default resolves
 * the context instead.
 *
 * The ingress under test is POST /ingest, the single HTTP boundary for the
 * CanonicalizationService ("if it wasn't canonicalized, it doesn't exist").
 * Service-level tests use the REAL CanonicalizationService + REAL
 * UnifiedEventRuntime. HTTP tests use the REAL route + REAL service over
 * HTTP on an ephemeral port; the event runtime is a test double ONLY for
 * the persistence boundary (no database in this harness), which sits
 * downstream of namespace selection and is not the code under test.
 *
 * Run: cd gateway && node test_tenant_spoof_ingress.js
 * Exit 0 = spoof impossible. Exit 1 = Tenant B selectable (VULNERABLE).
 */

const assert = require('assert');
const express = require('express');
const http = require('http');

const { UnifiedEventRuntime } = require('../ping-runtime/events/unified_event_runtime');
const { CanonicalizationService, DEFAULT_NAMESPACE } = require('../ping-runtime/canonicalization/canonicalization_service');
const createIngestRoutes = require('./routes/ingest');

// ── Fixtures ──────────────────────────────────────────────────────────────
class MockValidator {
  constructor(types) { this._types = new Set(types); }
  validateEventType(eventType) {
    if (this._types.has(eventType)) return { valid: true, error: null };
    return { valid: false, error: 'Unknown event_type: ' + eventType };
  }
}

// Mirrors gateway_runtime.js: operator-registered per-source map (TRUSTED).
const OPERATOR_NAMESPACES = {
  'review-authority': 'tenant::hpp',
  'customer-authority': 'tenant::hpp',
  'project-authority': 'tenant::hpp',
  'email-connector': 'tenant::hpp',
  'sms-connector': 'tenant::hpp',
  'google-connector': 'tenant::hpp',
  'github-connector': 'tenant::hpp',
};

const TENANT_A_SOURCE = 'email-connector'; // Tenant A's operator (bound to tenant::hpp)
const TENANT_B = 'tenant::victim-b';       // the spoof target: must NEVER be selected

function buildService() {
  const runtime = new UnifiedEventRuntime({ eventValidator: new MockValidator(['OBSERVATION_CREATED']) });
  const service = new CanonicalizationService({ eventRuntime: runtime, namespaces: OPERATOR_NAMESPACES });
  return { runtime, service };
}

// Fake ONLY the persistence boundary (downstream of namespace selection).
function buildHttpService() {
  let seq = 0;
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => ({
      status: 'ok',
      eventId: 'evt-test-' + (++seq),
      event: { event_type: eventType, source, namespace: options.namespace },
    }),
  };
  const service = new CanonicalizationService({ eventRuntime: fakeRuntime, namespaces: OPERATOR_NAMESPACES });
  return { service };
}

function startServer(service) {
  const app = express();
  app.use(express.json());
  app.use('/ingest', createIngestRoutes(service));
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function post(port, path, body, headers) {
  return fetch('http://127.0.0.1:' + port + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: JSON.stringify(body),
  });
}

// ── Runner ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== P1 Hostile: tenant spoof at POST /ingest ===\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('PASS ' + name);
      passed++;
    } catch (err) {
      console.log('FAIL ' + name);
      console.log('     ' + err.message.split('\n')[0]);
      failed++;
    }
  }
  console.log('\n=== Summary: ' + passed + ' passed, ' + failed + ' failed ===');
  console.log(failed > 0 ? 'VERDICT: VULNERABLE - Tenant B selectable from untrusted material'
                         : 'VERDICT: SECURE - Tenant B never selected from untrusted material');
  process.exit(failed > 0 ? 1 : 0);
}

// ── Service-level: untrusted requested namespace is never honored ──────────

test('resolveNamespace: Tenant A source + Tenant B override -> trusted per-source map, never Tenant B', () => {
  const { service } = buildService();
  const ns = service.resolveNamespace(TENANT_A_SOURCE, TENANT_B);
  assert.notStrictEqual(ns, TENANT_B, 'SPOOF: untrusted override was honored');
  assert.strictEqual(ns, 'tenant::hpp');
});

test('resolveNamespace: unmapped source + Tenant B override -> server default, never Tenant B', () => {
  const { service } = buildService();
  const ns = service.resolveNamespace('attacker-cli', TENANT_B);
  assert.notStrictEqual(ns, TENANT_B, 'SPOOF: untrusted override was honored');
  assert.strictEqual(ns, DEFAULT_NAMESPACE);
});

test('authorizeNamespace: Tenant B override for Tenant A source -> NOT authorized', () => {
  const { service } = buildService();
  const auth = service.authorizeNamespace(TENANT_A_SOURCE, TENANT_B);
  assert.strictEqual(auth.authorized, false, 'SPOOF: unbound override reported authorized');
  assert.match(auth.reason, /not bound/);
});

test('authorizeNamespace: bound override (source claims its own bound namespace) stays authorized', () => {
  const { service } = buildService();
  const auth = service.authorizeNamespace(TENANT_A_SOURCE, 'tenant::hpp');
  assert.deepStrictEqual(auth, { authorized: true, namespace: 'tenant::hpp' });
});

test('authorizeNamespace: no override -> trusted per-source map, authorized', () => {
  const { service } = buildService();
  const auth = service.authorizeNamespace(TENANT_A_SOURCE);
  assert.deepStrictEqual(auth, { authorized: true, namespace: 'tenant::hpp' });
});

test('resolveNamespace: falsy override (empty string) behaves as absent (byte-identical)', () => {
  const { service } = buildService();
  assert.strictEqual(service.resolveNamespace(TENANT_A_SOURCE, ''), 'tenant::hpp');
  assert.strictEqual(service.resolveNamespace('attacker-cli', ''), DEFAULT_NAMESPACE);
});

// ── HTTP ingress: POST /ingest ────────────────────────────────────────────

test('POST /ingest: body namespace=Tenant B -> rejected, Tenant B never selected', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'spoof-body' },
      namespace: TENANT_B,
    });
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, TENANT_B, 'SPOOF: response carried Tenant B namespace');
    assert.strictEqual(resp.status, 400, 'expected unbound override to be rejected at the route guard');
  } finally {
    server.close();
  }
});

test('POST /ingest: second tenant id variant (tenant::other-corp) -> rejected', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'spoof-body-2' },
      namespace: 'tenant::other-corp',
    });
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, 'tenant::other-corp', 'SPOOF: response carried spoofed namespace');
    assert.strictEqual(resp.status, 400);
  } finally {
    server.close();
  }
});

test('POST /ingest: tenant smuggled via query string -> ignored, trusted routing wins', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest?namespace=' + encodeURIComponent(TENANT_B), {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'spoof-query' },
    });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, TENANT_B);
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

test('POST /ingest: tenant smuggled via header -> ignored, trusted routing wins', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'spoof-header' },
    }, { 'x-tenant-id': TENANT_B });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, TENANT_B);
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

test('POST /ingest: tenant smuggled via body tenant_id field -> ignored, trusted routing wins', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'spoof-tenant-id-field' },
      tenant_id: TENANT_B,
    });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, TENANT_B);
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

test('POST /ingest: tenant smuggled inside mission payload -> never influences namespace', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { mission: { tenant_id: TENANT_B, action: 'escalate' } },
    });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.notStrictEqual(body.namespace, TENANT_B);
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

// ── Legitimate single-tenant behavior stays byte-identical ─────────────────

test('POST /ingest: no namespace supplied -> 201 with trusted per-source namespace', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'legit' },
    });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

test('POST /ingest: bound explicit namespace -> 201, honored (byte-identical)', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: { probe: 'legit-bound' },
      namespace: 'tenant::hpp',
    });
    assert.strictEqual(resp.status, 201);
    const body = await resp.json();
    assert.strictEqual(body.namespace, 'tenant::hpp');
  } finally {
    server.close();
  }
});

test('POST /ingest: malformed namespace shape still 400', async () => {
  const { service } = buildHttpService();
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', {
      source: TENANT_A_SOURCE,
      eventType: 'OBSERVATION_CREATED',
      payload: {},
      namespace: 'not-a-namespace',
    });
    assert.strictEqual(resp.status, 400);
  } finally {
    server.close();
  }
});

run();
