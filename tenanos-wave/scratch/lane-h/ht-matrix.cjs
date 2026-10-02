/**
 * LANE H hostile matrix (Nolan, 2026-09-24). Results with evidence.
 * Executable probes ran on the Pig against REAL current modules with
 * isolated synthetic stubs. No network, no database, no live tenants.
 * GATE-SECRET-001 (a): M5 used the EXISTING TokenStore mechanism on an
 * EMPTY instance only. No credential minted. No secret values read, set,
 * or printed.
 */
'use strict';
const R = [
  ['M1', 'A cannot spoof B through body/query/header tenant_id', 'OPEN',
   'gateway has no inbound auth middleware (gateway_runtime.js); /canonical-events trusts req.body.tenant_id and req.query.tenant_id; /ingest override gated only by caller-supplied source.'],
  ['M2', 'A cannot read B private object', 'OPEN',
   'UnifiedEventRuntime.query() has no namespace filter; canonical-events GET trusts caller tenant_id; /tenants CRUD unauthenticated.'],
  ['M3', 'A cannot retrieve B unique vector text', 'PASS',
   'PROVEN 2026-09-24 on Pig: real assembleContextPack with tenant::b item + tenant::a request -> leaked=false, dropped_cross_namespace=1, item_count=1.'],
  ['M4', 'mission cannot switch tenant on retry', 'OPEN',
   'recover.ts DeadAttempt/RecoveryPlan carry no tenantId; redrive scoped to wrong tenant not structurally prevented.'],
  ['M5', 'worker cannot receive B credential', 'CONDITIONAL',
   'PROVEN 2026-09-24 on Pig: TokenStore get/set take providerName only (no tenant param); list() on empty store exposes 0 keys; gateway wires exactly 1 TokenStore instance (gateway_runtime.js:288). Mechanism is tenant-blind: in multi-tenant, A and B share one slot per provider. Isolation requires per-tenant store instances (not present). No credential minted; no secret read/set/printed.'],
  ['M6', 'cache key cannot cross tenant boundary', 'OPEN',
   'BullMQ adapter queue names and job payloads carry no tenant reference; no tenant-scoped idempotency/cache key found.'],
  ['M7', 'A cannot fetch B artifact by guessed ID/path', 'UNKNOWN',
   'no artifact-specific route located in the inspected gateway route list; NOT IMPLEMENTED or unmapped.'],
  ['M8', 'private fact cannot leak into public projection', 'CONDITIONAL',
   'tenant isolation and object visibility are separate dimensions (doctrine). context-pack enforces namespace (M3 PASS); PingObjectReader.visibleTo() enforces private-object visibility per viewer; FYD-Q2 6/6 PASS for address traversal.'],
  ['M9', 'cross-tenant admin action requires explicit capability plus audit', 'OPEN',
   '/tenants CRUD and POST /connectors/:name/apikey unauthenticated; tool-safety audit entries carry no tenant.'],
];
for (const [id, label, status, ev] of R) {
  console.log(`[${status}] ${id}: ${label}\n       ${ev}`);
}
const c = s => R.filter(r => r[2] === s).length;
console.log(`\nMATRIX: ${c('PASS')} PASS, ${c('OPEN')} OPEN, ${c('CONDITIONAL')} CONDITIONAL, ${c('UNKNOWN')} UNKNOWN`);
