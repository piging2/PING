'use strict';

/**
 * TenantContext — JS adapter of the canonical tenant mapping.
 *
 * Canonical definition lives at (P-20260923-092, INTEGRATED):
 *   /home/nolan/projects/ping-wave-integration/src/tenanos/tenant/tenant-context.ts
 * That module is TypeScript and is NOT importable by the gateway JS runtime,
 * so this file re-implements the same contract in JS. Same regexes, same
 * error codes, same fail-closed semantics. Any divergence is a bug in THIS
 * file, never a competing definition.
 *
 * Canonical rule: the tenant identity string IS `tenant::<slug>`.
 *   tenantIdToNamespace('acme')         -> 'tenant::acme'
 *   namespaceToTenantId('tenant::acme') -> 'acme'
 *   namespaceToTenantId('core::system') -> null (system scope, not a tenant)
 *
 * Fail-closed: a missing or mismatched context throws TenantBoundaryError.
 * A cross-tenant reference is REFUSED, never answered with an empty result.
 */

const TENANT_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

const TENANT_CONTEXT_MISSING = 'TENANT_CONTEXT_MISSING';
const CROSS_TENANT_REFERENCE = 'CROSS_TENANT_REFERENCE';
const INVALID_TENANT_ID = 'INVALID_TENANT_ID';

class TenantBoundaryError extends Error {
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
    throw new TenantBoundaryError(
      INVALID_TENANT_ID,
      `invalid tenant id (must match ${TENANT_SLUG_PATTERN})`
    );
  }
  return `tenant::${tenantId}`;
}

/**
 * Inverse mapping: namespace string -> tenant slug.
 * Returns null for core::* (system scope, not a tenant).
 * Throws INVALID_TENANT_ID on a malformed namespace.
 */
function namespaceToTenantId(namespace) {
  if (typeof namespace !== 'string' || !NAMESPACE_RE.test(namespace)) {
    throw new TenantBoundaryError(
      INVALID_TENANT_ID,
      `invalid namespace (must match ${NAMESPACE_RE})`
    );
  }
  const [kind, id] = namespace.split('::');
  if (kind === 'core') return null;
  return id;
}

/**
 * Build a fail-closed tenant context from explicit parts.
 * If both tenantId and namespace are given, they must agree —
 * a disagreement is a cross-tenant reference and is REFUSED.
 */
function resolveTenantContext({ tenantId = null, namespace = null, actorId = null } = {}) {
  let resolvedTenantId = tenantId;
  let resolvedNamespace = namespace;

  if (resolvedNamespace !== null && resolvedNamespace !== undefined) {
    const fromNs = namespaceToTenantId(resolvedNamespace);
    if (resolvedTenantId === null || resolvedTenantId === undefined) {
      resolvedTenantId = fromNs;
    } else if (fromNs !== resolvedTenantId) {
      throw new TenantBoundaryError(
        CROSS_TENANT_REFERENCE,
        'tenant id and namespace disagree; refusing cross-tenant reference'
      );
    }
  }
  if (resolvedTenantId === null || resolvedTenantId === undefined) {
    throw new TenantBoundaryError(
      TENANT_CONTEXT_MISSING,
      'no tenant context supplied; cross-tenant-unsafe reads are denied'
    );
  }
  resolvedNamespace = tenantIdToNamespace(resolvedTenantId);
  return { tenantId: resolvedTenantId, namespace: resolvedNamespace, actorId };
}

/**
 * Resolve tenant context from an Express request.
 * Accepts ?tenant=<slug> or ?namespace=tenant::<slug> (or both, must agree).
 * Throws TenantBoundaryError — callers map it to HTTP 400.
 */
function resolveTenantFromRequest(req) {
  const q = (req && req.query) || {};
  return resolveTenantContext({
    tenantId: q.tenant != null && q.tenant !== '' ? String(q.tenant) : null,
    namespace: q.namespace != null && q.namespace !== '' ? String(q.namespace) : null,
  });
}

module.exports = {
  TENANT_SLUG_PATTERN,
  NAMESPACE_RE,
  TenantBoundaryError,
  TENANT_CONTEXT_MISSING,
  CROSS_TENANT_REFERENCE,
  INVALID_TENANT_ID,
  tenantIdToNamespace,
  namespaceToTenantId,
  resolveTenantContext,
  resolveTenantFromRequest,
};
