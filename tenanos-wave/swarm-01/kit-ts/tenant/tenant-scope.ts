/**
 * Tenant scoping helpers for substrate read paths.
 *
 * Backend half of the P-20260923-088 contract (swarm-08 PROJECTION-WIRING.md):
 * the 088 spec requires every projection query to take a resolved tenant_id
 * and enforce it (default-deny on the event query; tenant_id column or
 * payload->>'namespace' scoping on missions; namespace passed to knowledge
 * queries). These helpers give every read path the same predicate
 * construction. They are additive: query builders keep ownership of their
 * SQL; they just append the clause produced here.
 *
 * Interim mission filtering reads payload._tenant_id (written by the bridge
 * today) until a tenant_id column lands on ping_missions.
 */

import {
  tenantIdToNamespace,
  requireTenantContext,
  TenantContext,
} from './tenant-context';

export interface SqlPredicate {
  clause: string;
  params: string[];
}

/**
 * SQL predicate for namespace-scoped tables (ping_events).
 * e.g. { clause: 'namespace = $3', params: ['tenant::acme'] }
 */
export function namespacePredicate(ctx: unknown, paramIndex = 1): SqlPredicate {
  const c: TenantContext = requireTenantContext(ctx);
  return { clause: `namespace = $${paramIndex}`, params: [c.namespace] };
}

/**
 * SQL predicate for tenant_id-column tables (canonical_events).
 */
export function tenantIdPredicate(ctx: unknown, paramIndex = 1): SqlPredicate {
  const c: TenantContext = requireTenantContext(ctx);
  return { clause: `tenant_id = $${paramIndex}`, params: [c.tenantId] };
}

export interface MissionRow {
  mission_id?: string;
  payload?: unknown;
}

/**
 * Interim in-memory filter for ping_missions rows whose tenant survives only
 * as payload._tenant_id. Rows with no tenant marker are treated as SYSTEM
 * scope and are visible only to a system (non-tenant) caller, never to a
 * tenant caller. Throws on cross-tenant access instead of returning [].
 */
export function filterMissionsByTenant(
  missions: MissionRow[] | null | undefined,
  ctx: unknown,
): MissionRow[] {
  const c: TenantContext = requireTenantContext(ctx);
  const wanted = tenantIdToNamespace(c.tenantId);
  return (missions ?? []).filter((m) => {
    let payload: unknown = m.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }
    const record =
      payload !== null && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const marker = record._tenant_id ?? record.tenant_id;
    if (marker === undefined || marker === null || marker === '') return false; // unmarked missions are system scope: invisible to tenants
    const markerStr = String(marker);
    const ns = markerStr.startsWith('tenant::')
      ? markerStr
      : tenantIdToNamespace(markerStr);
    return ns === wanted;
  });
}
