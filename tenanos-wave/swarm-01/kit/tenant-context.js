/**
 * TenantContext carrier for the TenantOS execution substrate.
 *
 * The substrate has two parallel tenant mechanisms with no canonical mapping:
 *   (a) `tenant_id` columns  (canonical_events, tenant_registry, ...)
 *   (b) `tenant::<id>` namespace strings (ingest, knowledge, memory, evidence)
 * This module defines the ONE canonical mapping between them and the
 * fail-closed context object every substrate hop must carry.
 *
 * Canonical rule: the tenant identity string IS `tenant::<slug>`.
 *   tenantIdToNamespace('acme')      -> 'tenant::acme'
 *   namespaceToTenantId('tenant::acme') -> 'acme'
 *   namespaceToTenantId('core::system') -> null  (system scope, not a tenant)
 *
 * Fail-closed: a missing or mismatched context throws TenantBoundaryError.
 * A cross-tenant reference is REFUSED, never answered with an empty result.
 */

const TENANT_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

class TenantBoundaryError extends Error {
  /**
   * @param {'TENANT_CONTEXT_MISSING'|'CROSS_TENANT_REFERENCE'|'INVALID_TENANT_ID'} code
   * @param {string} message - names the boundary, never the other tenant's data
   */
  constructor(code, message) {
    super(message);
    this.name = 'TenantBoundaryError';
    this.code = code;
  }
}

/**
 * Canonical mapping: tenant slug -> namespace string.
 * Throws INVALID_TENANT_ID on a malformed slug (fail closed, no silent coerce).
 */
function tenantIdToNamespace(tenantId) {
  if (typeof tenantId !== 'string' || !TENANT_SLUG_PATTERN.test(tenantId)) {
    throw new TenantBoundaryError('INVALID_TENANT_ID', `invalid tenant id (must match ${TENANT_SLUG_PATTERN})`);
  }
  return `tenant::${tenantId}`;
}

/**
 * Canonical mapping: namespace string -> tenant slug, or null for core::*.
 * Returns null (not throw) for core::* — system scope is a valid non-tenant scope.
 */
function namespaceToTenantId(namespace) {
  if (typeof namespace !== 'string' || !NAMESPACE_RE.test(namespace)) {
    throw new TenantBoundaryError('INVALID_TENANT_ID', 'invalid namespace (must be core::<name> or tenant::<id>)');
  }
  const [kind, id] = namespace.split('::');
  if (kind !== 'tenant') return null;
  if (!TENANT_SLUG_PATTERN.test(id)) {
    throw new TenantBoundaryError('INVALID_TENANT_ID', 'tenant namespace id is not a valid tenant slug');
  }
  return id;
}

/**
 * Create a TenantContext from TRUSTED inputs only (server-side resolution:
 * authenticated principal -> tenant registry). Never build one from a raw
 * request body field.
 */
function bindTenantContext({ tenantId, actorId } = {}) {
  const namespace = tenantIdToNamespace(tenantId); // throws on bad input
  return Object.freeze({ tenantId, namespace, actorId: actorId || null });
}

/**
 * Fail-closed accessor: throws TENANT_CONTEXT_MISSING unless ctx is a
 * well-formed TenantContext. Every substrate hop calls this before touching
 * tenant-owned state.
 */
function requireTenantContext(ctx) {
  if (!ctx || typeof ctx !== 'object') {
    throw new TenantBoundaryError('TENANT_CONTEXT_MISSING', 'tenant context is required and was not provided');
  }
  // Re-validate: never trust a context object that was not built by bindTenantContext.
  const namespace = tenantIdToNamespace(ctx.tenantId);
  if (ctx.namespace !== namespace) {
    throw new TenantBoundaryError('TENANT_CONTEXT_MISSING', 'tenant context failed integrity check');
  }
  return ctx;
}

/**
 * Refuse cross-tenant access. Throws CROSS_TENANT_REFERENCE on mismatch;
 * never returns an empty result as a hiding place (SOUL #11).
 */
function assertSameTenant(ctx, tenantId) {
  const c = requireTenantContext(ctx);
  if (c.tenantId !== tenantId) {
    throw new TenantBoundaryError('CROSS_TENANT_REFERENCE', 'tenant boundary refusal: context tenant does not match target tenant');
  }
  return c;
}

module.exports = {
  TENANT_SLUG_PATTERN,
  NAMESPACE_RE,
  TenantBoundaryError,
  tenantIdToNamespace,
  namespaceToTenantId,
  bindTenantContext,
  requireTenantContext,
  assertSameTenant,
};
