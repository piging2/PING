/**
 * Tenant propagation for the canonical -> spine event bridge.
 *
 * Problem (proven 2026-09-23, swarm-01): EventBridge._bridgeCanonicalEvents
 * reads tenant_id from canonical_events, stashes it in payload._tenant_id and
 * metadata.tenant_id, then calls UnifiedEventRuntime.emit WITHOUT options.namespace.
 * UnifiedEventRuntime.emit resolves `options.namespace || 'core::system'`, so
 * every bridged tenant event is re-namespaced to core::system: system-namespace
 * laundering. Downstream (event->mission bridge, scheduler, workers) then
 * faithfully preserves the WRONG namespace via payload.namespace / BaseWorker._emit.
 *
 * This module derives the emit options the bridge must pass so the tenant
 * survives as the enforced namespace, not just as inert metadata.
 *
 * Unknown-tenant policy: when row.tenant_id is null/empty the bridge cannot
 * invent a tenant. It keeps the 'core::system' default (current behavior) but
 * tags metadata.tenant_unknown=true so the laundering is OBSERVABLE instead
 * of silent. A fail-closed refusal here would wedge the background worker;
 * observability is the correct worker posture.
 */

import { tenantIdToNamespace, NAMESPACE_RE } from './tenant-context';

export const SYSTEM_NAMESPACE = 'core::system';

export interface TenantNamespaceResolution {
  namespace: string;
  tenantUnknown: boolean;
}

/**
 * Map a canonical_events tenant_id value to the enforced namespace.
 * Accepts both the canonical 'tenant::<slug>' form and a bare slug.
 */
export function namespaceForTenantId(tenantId: unknown): TenantNamespaceResolution {
  if (tenantId === null || tenantId === undefined || tenantId === '') {
    return { namespace: SYSTEM_NAMESPACE, tenantUnknown: true };
  }
  const raw = String(tenantId);
  if (NAMESPACE_RE.test(raw)) return { namespace: raw, tenantUnknown: false };
  try {
    return { namespace: tenantIdToNamespace(raw), tenantUnknown: false };
  } catch {
    return { namespace: SYSTEM_NAMESPACE, tenantUnknown: true };
  }
}

export interface CanonicalEventRow {
  tenant_id: unknown;
}

export interface EmitBaseOptions {
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build the options object for UnifiedEventRuntime.emit from a canonical_events
 * row, preserving the tenant as the enforced namespace.
 *
 * Integration (event_bridge.js, _bridgeCanonicalEvents): pass the returned
 * `namespace` into the existing emit options object alongside _skipGovernance.
 */
export function emitOptionsForCanonicalRow<TBase extends EmitBaseOptions>(
  row: CanonicalEventRow,
  baseOptions: TBase = {} as TBase,
): TBase & { namespace: string; metadata: Record<string, unknown> } {
  const { namespace, tenantUnknown } = namespaceForTenantId(row.tenant_id);
  const metadata: Record<string, unknown> = { ...(baseOptions.metadata ?? {}) };
  if (tenantUnknown) metadata.tenant_unknown = true;
  return { ...baseOptions, namespace, metadata };
}
