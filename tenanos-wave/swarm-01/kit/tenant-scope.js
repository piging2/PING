/**
 * Tenant scoping helpers for substrate read paths.
 *
 * Problem (proven 2026-09-23, swarm-01): the substrate's read APIs have no
 * tenant filter at all —
 *   - UnifiedEventRuntime.query supports eventType/source/since/limit but NOT
 *     namespace/tenant, so /events, /mc/* event widgets and countEvents() are
 *     structurally cross-tenant;
 *   - ping_missions has no tenant_id column; getPending/getActive/getStats are
 *     global, so /missions/* and /mc/missions/* leak across tenants;
 *   - Mission Control (/mc) route handlers take no tenant input whatsoever.
 *
 * These helpers give every read path the same predicate construction. They are
 * additive: query builders keep ownership of their SQL; they just append the
 * clause produced here. Interim mission filtering reads payload._tenant_id
 * (written by the bridge today) until a tenant_id column lands on ping_missions.
 */

const { tenantIdToNamespace, requireTenantContext } = require('./tenant-context');

/**
 * SQL predicate for namespace-scoped tables (ping_events).
 * @returns {{ clause: string, params: string[] }} — e.g. { clause: 'namespace = $3', params: ['tenant::acme'] }
 */
function namespacePredicate(ctx, paramIndex = 1) {
  const c = requireTenantContext(ctx);
  return { clause: `namespace = $${paramIndex}`, params: [c.namespace] };
}

/**
 * SQL predicate for tenant_id-column tables (canonical_events).
 */
function tenantIdPredicate(ctx, paramIndex = 1) {
  const c = requireTenantContext(ctx);
  return { clause: `tenant_id = $${paramIndex}`, params: [c.tenantId] };
}

/**
 * Interim in-memory filter for ping_missions rows whose tenant survives only
 * as payload._tenant_id. Rows with no tenant marker are treated as SYSTEM
 * scope and are visible only to a system (non-tenant) caller, never to a
 * tenant caller. Throws on cross-tenant access instead of returning [].
 */
function filterMissionsByTenant(missions, ctx) {
  const c = requireTenantContext(ctx);
  const wanted = tenantIdToNamespace(c.tenantId);
  return (missions || []).filter((m) => {
    let payload = m.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    const marker = payload && (payload._tenant_id || payload.tenant_id);
    if (!marker) return false; // unmarked missions are system scope: invisible to tenants
    const ns = String(marker).startsWith('tenant::') ? String(marker) : tenantIdToNamespace(String(marker));
    return ns === wanted;
  });
}

module.exports = { namespacePredicate, tenantIdPredicate, filterMissionsByTenant };
