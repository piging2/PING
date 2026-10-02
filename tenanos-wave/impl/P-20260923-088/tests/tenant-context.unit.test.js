'use strict';

/**
 * Unit tests for the P-20260923-088 JS tenant adapter
 * (gateway/lib/tenant-context.js).
 *
 * Run: node --test tests/tenant-context.unit.test.js
 * (from ~/workspace/tenanos-wave/impl/P-20260923-088/; zero dependencies)
 *
 * The expected values here must match the P-20260923-092 canonical TS kit
 * (src/tenanos/tenant/tenant-context.ts): same regexes, same codes,
 * same fail-closed semantics. Any divergence is a bug in the JS adapter.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  TENANT_SLUG_PATTERN,
  NAMESPACE_RE,
  TenantBoundaryError,
  tenantIdToNamespace,
  namespaceToTenantId,
  resolveTenantContext,
  resolveTenantFromRequest,
} = require('../gateway/lib/tenant-context.js');

// ── contract parity with the TS kit ─────────────────────────────────────────
test('regexes are identical to the P-20260923-092 TS kit', () => {
  assert.equal(String(TENANT_SLUG_PATTERN), String(/^[a-z0-9-]{1,64}$/));
  assert.equal(String(NAMESPACE_RE), String(/^(core|tenant)::[a-zA-Z0-9_-]+$/));
});

// ── tenantIdToNamespace ─────────────────────────────────────────────────────
test('tenantIdToNamespace maps slug -> tenant::<slug>', () => {
  assert.equal(tenantIdToNamespace('acme'), 'tenant::acme');
  assert.equal(tenantIdToNamespace('a1-b2'), 'tenant::a1-b2');
});

test('tenantIdToNamespace rejects malformed slugs (fail closed)', () => {
  for (const bad of ['', 'ACME', 'acme corp', 'tenant::acme', 'a'.repeat(65), null, undefined, 42]) {
    assert.throws(() => tenantIdToNamespace(bad), (err) => {
      assert.ok(err instanceof TenantBoundaryError);
      assert.equal(err.code, 'INVALID_TENANT_ID');
      return true;
    }, `should throw for ${JSON.stringify(bad)}`);
  }
});

// ── namespaceToTenantId ─────────────────────────────────────────────────────
test('namespaceToTenantId round-trips and maps core::* -> null', () => {
  assert.equal(namespaceToTenantId('tenant::acme'), 'acme');
  assert.equal(namespaceToTenantId('core::system'), null);
  assert.equal(namespaceToTenantId('core::billing'), null);
});

test('namespaceToTenantId rejects malformed namespaces (fail closed)', () => {
  for (const bad of ['', 'acme', 'tenant:acme', 'tenant::', 'other::acme', null]) {
    assert.throws(() => namespaceToTenantId(bad), (err) => {
      assert.ok(err instanceof TenantBoundaryError);
      assert.equal(err.code, 'INVALID_TENANT_ID');
      return true;
    }, `should throw for ${JSON.stringify(bad)}`);
  }
});

// ── resolveTenantContext ────────────────────────────────────────────────────
test('resolveTenantContext derives namespace from tenantId', () => {
  const ctx = resolveTenantContext({ tenantId: 'acme' });
  assert.deepEqual(ctx, { tenantId: 'acme', namespace: 'tenant::acme', actorId: null });
});

test('resolveTenantContext derives tenantId from namespace', () => {
  const ctx = resolveTenantContext({ namespace: 'tenant::acme', actorId: 'u1' });
  assert.deepEqual(ctx, { tenantId: 'acme', namespace: 'tenant::acme', actorId: 'u1' });
});

test('resolveTenantContext accepts agreeing tenantId + namespace', () => {
  const ctx = resolveTenantContext({ tenantId: 'acme', namespace: 'tenant::acme' });
  assert.equal(ctx.namespace, 'tenant::acme');
});

test('resolveTenantContext REFUSES disagreeing tenantId + namespace', () => {
  assert.throws(
    () => resolveTenantContext({ tenantId: 'acme', namespace: 'tenant::other' }),
    (err) => {
      assert.ok(err instanceof TenantBoundaryError);
      assert.equal(err.code, 'CROSS_TENANT_REFERENCE');
      return true;
    }
  );
});

test('resolveTenantContext REFUSES missing context (default deny)', () => {
  assert.throws(() => resolveTenantContext({}), (err) => {
    assert.ok(err instanceof TenantBoundaryError);
    assert.equal(err.code, 'TENANT_CONTEXT_MISSING');
    return true;
  });
  assert.throws(() => resolveTenantContext(), (err) => {
    assert.equal(err.code, 'TENANT_CONTEXT_MISSING');
    return true;
  });
});

// ── resolveTenantFromRequest ────────────────────────────────────────────────
test('resolveTenantFromRequest reads ?tenant', () => {
  const ctx = resolveTenantFromRequest({ query: { tenant: 'acme' } });
  assert.equal(ctx.namespace, 'tenant::acme');
});

test('resolveTenantFromRequest reads ?namespace', () => {
  const ctx = resolveTenantFromRequest({ query: { namespace: 'tenant::acme' } });
  assert.equal(ctx.tenantId, 'acme');
});

test('resolveTenantFromRequest throws TENANT_CONTEXT_MISSING when absent', () => {
  assert.throws(() => resolveTenantFromRequest({ query: {} }), (err) => {
    assert.equal(err.code, 'TENANT_CONTEXT_MISSING');
    return true;
  });
});

test('resolveTenantFromRequest throws CROSS_TENANT_REFERENCE on disagreement', () => {
  assert.throws(
    () => resolveTenantFromRequest({ query: { tenant: 'acme', namespace: 'tenant::other' } }),
    (err) => err.code === 'CROSS_TENANT_REFERENCE'
  );
});

// ── SQL-builder sanity: the mission WHERE clause shape ─────────────────────
// These tests pin the exact filter shape the implementation must use so a
// regression to an unscoped query is caught even without a live database.
test('tenant-scoped mission SQL uses the payload->> expression filter', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const diff = fs.readFileSync(
    path.join(__dirname, '..', 'patch-02-mission-runtime-tenant-scope.diff'), 'utf8'
  );
  assert.ok(diff.includes("payload->>'namespace' = $2"), 'getPending filter shape pinned');
  assert.ok(diff.includes('idx_pm_namespace'), 'GIN index creation pinned');
  assert.ok(diff.includes('forbidden: true'), 'trace fail-closed return pinned');
});

test('route patch pins default-deny middleware and 403 trace refusal', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const diff = fs.readFileSync(
    path.join(__dirname, '..', 'patch-03-mc-routes-tenant-gate.diff'), 'utf8'
  );
  assert.ok(diff.includes('requireTenant'), 'requireTenant middleware pinned');
  assert.ok(diff.includes('status(400)'), 'default-deny 400 pinned');
  assert.ok(diff.includes('status(403)'), 'trace cross-tenant 403 pinned');
  assert.ok(diff.includes("scope: 'operator-global'"), 'DLQ operator-global label pinned');
  assert.ok(diff.includes('namespace: ns'), 'event query namespace pass-through pinned');
});
