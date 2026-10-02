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
 *   tenantIdToNamespace('acme')          -> 'tenant::acme'
 *   namespaceToTenantId('tenant::acme')  -> 'acme'
 *   namespaceToTenantId('core::system')  -> null  (system scope, not a tenant)
 *
 * Fail-closed: a missing or mismatched context throws TenantBoundaryError.
 * A cross-tenant reference is REFUSED, never answered with an empty result.
 *
 * Harvested from the live substrate (swarm-01 BOUNDARY-MAP.md, 2026-09-23):
 *   - EvidenceAuthority's NAMESPACE_RE shape check (kept, not duplicated)
 *   - tenant_registry docstring `tenant://{id}` vs `tenant::<id>` vs bare
 *     `tenant_id`: three spellings collapsed to the canonical `tenant::<slug>`.
 */

export const TENANT_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
export const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

export type TenantBoundaryCode =
  | 'TENANT_CONTEXT_MISSING'
  | 'CROSS_TENANT_REFERENCE'
  | 'INVALID_TENANT_ID';

export class TenantBoundaryError extends Error {
  readonly code: TenantBoundaryCode;
  /**
   * @param code - the boundary violated
   * @param message - names the boundary, never the other tenant's data
   */
  constructor(code: TenantBoundaryCode, message: string) {
    super(message);
    this.name = 'TenantBoundaryError';
    this.code = code;
  }
}

export interface TenantContext {
  readonly tenantId: string;
  readonly namespace: string;
  readonly actorId: string | null;
}

/**
 * Canonical mapping: tenant slug -> namespace string.
 * Throws INVALID_TENANT_ID on a malformed slug (fail closed, no silent coerce).
 */
export function tenantIdToNamespace(tenantId: string): string {
  if (typeof tenantId !== 'string' || !TENANT_SLUG_PATTERN.test(tenantId)) {
    throw new TenantBoundaryError(
      'INVALID_TENANT_ID',
      `invalid tenant id (must match ${TENANT_SLUG_PATTERN})`,
    );
  }
  return `tenant::${tenantId}`;
}

/**
 * Canonical mapping: namespace string -> tenant slug, or null for core::*.
 * Returns null (not throw) for core::* — system scope is a valid non-tenant scope.
 */
export function namespaceToTenantId(namespace: string): string | null {
  if (typeof namespace !== 'string' || !NAMESPACE_RE.test(namespace)) {
    throw new TenantBoundaryError(
      'INVALID_TENANT_ID',
      'invalid namespace (must be core::<name> or tenant::<id>)',
    );
  }
  const [kind, id] = namespace.split('::');
  if (kind !== 'tenant') return null;
  if (typeof id !== 'string' || !TENANT_SLUG_PATTERN.test(id)) {
    throw new TenantBoundaryError(
      'INVALID_TENANT_ID',
      'tenant namespace id is not a valid tenant slug',
    );
  }
  return id;
}

export interface BindTenantContextOptions {
  tenantId: string;
  actorId?: string;
}

/**
 * Create a TenantContext from TRUSTED inputs only (server-side resolution:
 * authenticated principal -> tenant registry). Never build one from a raw
 * request body field.
 */
export function bindTenantContext(
  options: BindTenantContextOptions = {} as BindTenantContextOptions,
): TenantContext {
  const { tenantId, actorId } = options;
  const namespace = tenantIdToNamespace(tenantId); // throws on bad input
  return Object.freeze({ tenantId, namespace, actorId: actorId ?? null });
}

/**
 * Fail-closed accessor: throws TENANT_CONTEXT_MISSING unless ctx is a
 * well-formed TenantContext. Every substrate hop calls this before touching
 * tenant-owned state.
 */
export function requireTenantContext(ctx: unknown): TenantContext {
  if (!ctx || typeof ctx !== 'object') {
    throw new TenantBoundaryError(
      'TENANT_CONTEXT_MISSING',
      'tenant context is required and was not provided',
    );
  }
  // Re-validate: never trust a context object that was not built by bindTenantContext.
  const candidate = ctx as Partial<TenantContext>;
  if (typeof candidate.tenantId !== 'string') {
    throw new TenantBoundaryError(
      'TENANT_CONTEXT_MISSING',
      'tenant context carries no tenant id',
    );
  }
  const namespace = tenantIdToNamespace(candidate.tenantId);
  if (candidate.namespace !== namespace) {
    throw new TenantBoundaryError(
      'TENANT_CONTEXT_MISSING',
      'tenant context failed integrity check',
    );
  }
  return { tenantId: candidate.tenantId, namespace, actorId: candidate.actorId ?? null };
}

/**
 * Refuse cross-tenant access. Throws CROSS_TENANT_REFERENCE on mismatch;
 * never returns an empty result as a hiding place (SOUL #11).
 */
export function assertSameTenant(ctx: unknown, tenantId: string): TenantContext {
  const c = requireTenantContext(ctx);
  if (c.tenantId !== tenantId) {
    throw new TenantBoundaryError(
      'CROSS_TENANT_REFERENCE',
      'tenant boundary refusal: context tenant does not match target tenant',
    );
  }
  return c;
}
