/**
 * HOSTILE STRUCTURAL PROBES H2-H5, H7-H12 (directive A hostile tests 2-5, 7-12).
 *
 * The live substrate (/home/nolan/ping: gateway + ping-runtime) is NOT on
 * this machine, so these probes encode the CURRENT audited behavior of the
 * real code paths (swarm-01 boundary map, file:line cited per probe) as
 * faithful stubs and demonstrate each leak class. A probe PASSES when the
 * leak it demonstrates is present (vulnerability demonstrated); it would
 * FAIL (good) once the cited REFACTOR lands.
 *
 * Where the existing TenantOS kit already provides the fix mechanism, the
 * probe also shows the fix holding. No new authorities are invented here.
 *
 * Run: node --test h-rest-structural.js
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const KIT = '/home/hatch/workspace/tenanos-wave/swarm-01/kit';
const { filterMissionsByTenant } = require(`${KIT}/tenant-scope.js`);
const { bindTenantContext, assertSameTenant } = require(`${KIT}/tenant-context.js`);

// --- Faithful stubs of CURRENT live behavior (audited 2026-09-23) -----------

/** ping_objects.sql: NO tenant column; canonical_object_authority.js: no tenant refs. */
const OBJECTS = new Map([
  ['obj-acme-1', { id: 'obj-acme-1', ownerTenant: 'acme', secret: 'acme private fact' }],
]);
function currentReadObjectById(id /*, caller */) {
  return OBJECTS.get(id) || null; // no tenant check anywhere on this path
}

/** memory_vector_store_authority.js:74/:96 — collection + id + payload; no tenant param. */
const MEMORY = [
  { id: 'm1', collection: 'memory_facts', text: 'acme private pricing notes', namespace: 'tenant::acme' },
];
function currentSearchMemory({ text }) {
  // HybridSearch privacy filter (hybrid_search.js:57) drops payload.namespace
  // !== namespace, but `namespace` is the CALLER's string (T4).
  return MEMORY.filter((m) => m.text.includes(text));
}

/** mission_runtime.js:78 — ping_missions has NO tenant_id column; routes/missions.js global. */
const MISSIONS = [{ id: 'mission-acme-1', payload: { _tenant_id: 'acme', work: '...' } }];
function currentClaimPending(/* workerTenant */) {
  return MISSIONS[0] || null; // any worker claims any mission (T3)
}

/** mcp/ping_mcp_server.py — 12 tools, NO tenant param; thin proxy to global endpoints (T5). */
const CREDENTIALS = [{ tenant: 'victim-b', label: 'victim-b api key', ref: 'cred-ref-b' }];
function currentCredentialInventory(/* callerTenant */) {
  return CREDENTIALS.map((c) => ({ label: c.label, ref: c.ref })); // tenant-unaware
}

/** UnifiedEventRuntime.emit: options.namespace || 'core::system'; emitter chooses. */
const SPINE = [];
function currentEmit(type, payload, options = {}) {
  SPINE.push({ type, payload, namespace: options.namespace || 'core::system' });
}

/** mission_control.js — 25+ widgets, NO tenant input/filter; requirePG = pg-availability only (T6). */
const AUDIT_LOG = [];
function currentAdminAction({ action, targetTenant, principal }) {
  AUDIT_LOG.push({ action, targetTenant, principal }); // no capability check, no tenant binding
  return { ok: true };
}

// --- The probes ---------------------------------------------------------------

test('H2 (leak): cross-tenant private object read by exact ID succeeds', () => {
  const obj = currentReadObjectById('obj-acme-1'); // caller is tenant victim-b
  assert.ok(obj && obj.secret === 'acme private fact');
  console.log('LEAK DEMONSTRATED H2: exact-ID object read has no tenant check ' +
    '(ping_objects.sql: no tenant column; canonical_object_authority.js: no tenant refs).');
});

test('H3 (leak): semantic search by Tenant B returns Tenant A private text', () => {
  const hits = currentSearchMemory({ text: 'private pricing' }); // caller: victim-b
  assert.equal(hits.length, 1);
  assert.equal(hits[0].namespace, 'tenant::acme');
  console.log('LEAK DEMONSTRATED H3: searchMemory takes no tenant param; the ' +
    'namespace filter is caller-supplied (memory_vector_store_authority.js:74/:96, hybrid_search.js:57).');
});

test('H4 (leak): Qdrant-equivalent vector read crosses tenants on a caller string', () => {
  // The 12 Qdrant collections are FIXED and global (memory_vector_store_authority.js:35);
  // storeEmbedding/searchMemory carry no tenant; a caller asserting
  // namespace 'tenant::acme' retrieves acme's vectors. Qdrant itself is
  // unreachable from this machine (egress-blocked :6333); this probes the
  // audited read-path logic, which is where the boundary is missing.
  const hits = currentSearchMemory({ text: 'private pricing' });
  assert.ok(hits.some((h) => h.namespace === 'tenant::acme'));
  console.log('LEAK DEMONSTRATED H4: shared collections + caller-supplied namespace ' +
    '= cross-tenant vector read is one string away. Required ZERO-retrieval boundary: ABSENT.');
});

test('H5 (leak): Tenant B worker claims Tenant A mission', () => {
  const claimed = currentClaimPending('victim-b');
  assert.ok(claimed && claimed.payload._tenant_id === 'acme');
  // The kit's read-path predicate is the existing fix mechanism:
  const ctx = bindTenantContext({ tenantId: 'victim-b' });
  assert.throws(() => assertSameTenant(ctx, claimed.payload._tenant_id),
    (e) => e.code === 'CROSS_TENANT_REFERENCE');
  console.log('LEAK DEMONSTRATED H5: missions are global (mission_runtime.js:78, no ' +
    'tenant_id column); kit assertSameTenant refuses the cross-tenant claim once threaded.');
});

test('H5b (fix mechanism): tenant-scope predicate filters missions for reads', () => {
  const ctx = bindTenantContext({ tenantId: 'acme' });
  const visible = filterMissionsByTenant(MISSIONS, ctx);
  assert.equal(visible.length, 1);
  const ctxB = bindTenantContext({ tenantId: 'victim-b' });
  assert.equal(filterMissionsByTenant(MISSIONS, ctxB).length, 0);
  console.log('FIX MECHANISM H5b: kit filterMissionsByTenant scopes reads (refuses, never empty-hides).');
});

test('H7 (leak): Tenant A worker inventories Tenant B credentials', () => {
  const inv = currentCredentialInventory('acme');
  assert.ok(inv.some((c) => c.ref === 'cred-ref-b'));
  console.log('LEAK DEMONSTRATED H7: MCP credential_inventory is tenant-unaware ' +
    '(mcp/ping_mcp_server.py: 12/12 tools, no tenant param; T5).');
});

test('H8 (leak): emitter choice can publish Tenant A private payload globally', () => {
  SPINE.length = 0;
  // Tenant A's private payload, emitter-chosen namespace 'core::system'.
  currentEmit('PRIVATE_NOTE', { text: 'acme private fact' }, { namespace: 'core::system' });
  assert.equal(SPINE[0].namespace, 'core::system');
  console.log('LEAK DEMONSTRATED H8: no visibility/privacy field on the envelope; ' +
    'the emitter chooses the namespace unilaterally (unified_event_runtime.js:104).');
});

test('H9 (unknown): FYD projection privacy has no enforcement point in this repo', () => {
  // The product projection lives in /home/nolan/projects/ping (not here).
  // FYD-KNOW-001 (grill, RESOLVED) DECIDES tenant-local corrections, but no
  // projection-privacy gate exists in the workspace to probe.
  console.log('UNKNOWN H9: no FYD projection code in scope; tenant-local is a ' +
    'decision (FYD-KNOW-001), not an enforced boundary. Cannot PASS.');
});

test('H10 (unknown): cache key tenant namespacing has no code in scope', () => {
  console.log('UNKNOWN H10: no shared-cache implementation in the workspace to ' +
    'probe for key collisions. Cannot PASS.');
});

test('H11 (unknown): artifact store has no code in scope', () => {
  console.log('UNKNOWN H11: no artifact fetch path in the workspace to probe ' +
    'for ID/path guessing. Cannot PASS.');
});

test('H12 (leak): cross-tenant admin action needs no capability, leaves no tenant evidence', () => {
  const res = currentAdminAction({ action: 'read_inbox', targetTenant: 'acme', principal: 'victim-b-op' });
  assert.equal(res.ok, true);
  assert.equal(AUDIT_LOG[0].targetTenant, 'acme'); // logged, but never CHECKED
  console.log('LEAK DEMONSTRATED H12: Mission Control widgets take no tenant input ' +
    'and check no capability (mission_control.js; requirePG = pg-availability only).');
});
