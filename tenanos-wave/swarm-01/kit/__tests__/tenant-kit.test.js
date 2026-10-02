/**
 * Tenant boundary kit tests (swarm-01).
 * Plain JS, no transform needed. Covers the additive kit only; the attack
 * scripts in ~/workspace/tenanos-wave/swarm-01/tests cover the existing
 * substrate code paths they harden.
 */
const {
  TENANT_SLUG_PATTERN,
  TenantBoundaryError,
  tenantIdToNamespace,
  namespaceToTenantId,
  bindTenantContext,
  requireTenantContext,
  assertSameTenant,
} = require('../tenant-context');
const { createNamespaceBinder } = require('../namespace-binding');
const { namespaceForTenantId, emitOptionsForCanonicalRow } = require('../bridge-tenant');
const { namespacePredicate, tenantIdPredicate, filterMissionsByTenant } = require('../tenant-scope');

describe('tenant-context', () => {
  test('canonical mapping tenant slug <-> namespace', () => {
    expect(tenantIdToNamespace('acme')).toBe('tenant::acme');
    expect(namespaceToTenantId('tenant::acme')).toBe('acme');
    expect(namespaceToTenantId('core::system')).toBeNull();
  });
  test('invalid slugs fail closed', () => {
    expect(() => tenantIdToNamespace('ACME')).toThrow(TenantBoundaryError);
    expect(() => tenantIdToNamespace('../../etc')).toThrow(TenantBoundaryError);
    expect(() => tenantIdToNamespace('')).toThrow(TenantBoundaryError);
  });
  test('bind/require round-trip; tampered context refused', () => {
    const ctx = bindTenantContext({ tenantId: 'acme', actorId: 'op-1' });
    expect(requireTenantContext(ctx).tenantId).toBe('acme');
    expect(() => requireTenantContext(null)).toThrow(TenantBoundaryError);
    expect(() => requireTenantContext({ ...ctx, namespace: 'tenant::victim' })).toThrow(TenantBoundaryError);
  });
  test('assertSameTenant refuses cross-tenant, never empty', () => {
    const ctx = bindTenantContext({ tenantId: 'acme' });
    expect(assertSameTenant(ctx, 'acme').tenantId).toBe('acme');
    expect(() => assertSameTenant(ctx, 'victim')).toThrow(TenantBoundaryError);
    try {
      assertSameTenant(ctx, 'victim');
    } catch (e) {
      expect(e.code).toBe('CROSS_TENANT_REFERENCE');
    }
  });
});

describe('namespace-binding', () => {
  test('unbound explicit override is DENIED (the honor-system fix)', () => {
    const binder = createNamespaceBinder({ bindings: { 'review-emitter': ['tenant::acme'] } });
    const denied = binder.authorize('attacker-source', 'tenant::victim');
    expect(denied.authorized).toBe(false);
    expect(denied.reason).toMatch(/not bound/);
  });
  test('bound override allowed; per-source default; global default', () => {
    const binder = createNamespaceBinder({ bindings: { 'review-emitter': ['tenant::acme'] } });
    expect(binder.authorize('review-emitter', 'tenant::acme')).toEqual({ authorized: true, namespace: 'tenant::acme' });
    expect(binder.authorize('review-emitter')).toEqual({ authorized: true, namespace: 'tenant::acme' });
    expect(binder.authorize('unknown-source')).toEqual({ authorized: true, namespace: 'core::owner' });
  });
  test('malformed namespace denied, not coerced', () => {
    const binder = createNamespaceBinder({});
    expect(binder.authorize('s', 'not a namespace').authorized).toBe(false);
  });
  test('bindSourceToTenant maps slug to canonical namespace', () => {
    const binder = createNamespaceBinder({});
    binder.bindSourceToTenant('billing-emitter', 'acme');
    expect(binder.authorize('billing-emitter', 'tenant::acme').authorized).toBe(true);
    expect(binder.authorize('billing-emitter', 'tenant::victim').authorized).toBe(false);
  });
});

describe('bridge-tenant', () => {
  test('canonical row tenant_id becomes enforced namespace', () => {
    const opts = emitOptionsForCanonicalRow({ tenant_id: 'tenant::acme' }, { _skipGovernance: true });
    expect(opts.namespace).toBe('tenant::acme');
    expect(opts._skipGovernance).toBe(true);
    expect(opts.metadata.tenant_unknown).toBeUndefined();
  });
  test('bare slug tenant_id is canonicalized', () => {
    expect(namespaceForTenantId('acme').namespace).toBe('tenant::acme');
  });
  test('unknown tenant stays system-scoped but OBSERVABLE', () => {
    const opts = emitOptionsForCanonicalRow({ tenant_id: null }, {});
    expect(opts.namespace).toBe('core::system');
    expect(opts.metadata.tenant_unknown).toBe(true);
  });
});

describe('tenant-scope', () => {
  const ctx = bindTenantContext({ tenantId: 'acme' });
  test('predicates build the right clauses', () => {
    expect(namespacePredicate(ctx, 3)).toEqual({ clause: 'namespace = $3', params: ['tenant::acme'] });
    expect(tenantIdPredicate(ctx, 2)).toEqual({ clause: 'tenant_id = $2', params: ['acme'] });
  });
  test('mission filter keeps own tenant, drops others and unmarked', () => {
    const missions = [
      { mission_id: 'm1', payload: JSON.stringify({ _tenant_id: 'tenant::acme' }) },
      { mission_id: 'm2', payload: JSON.stringify({ _tenant_id: 'tenant::victim' }) },
      { mission_id: 'm3', payload: JSON.stringify({}) },
    ];
    const kept = filterMissionsByTenant(missions, ctx);
    expect(kept.map((m) => m.mission_id)).toEqual(['m1']);
  });
  test('scope helpers fail closed without context', () => {
    expect(() => namespacePredicate(null)).toThrow(TenantBoundaryError);
    expect(() => filterMissionsByTenant([], null)).toThrow(TenantBoundaryError);
  });
});
