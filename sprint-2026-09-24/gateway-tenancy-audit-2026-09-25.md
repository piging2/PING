# Decision 4 — gateway tenancy audit (2026-09-25, kernel-harvest lane)

READ-ONLY. No code changed.

## Scope

- /home/nolan/ping/gateway/ (canonical gateway: routes/*.js, canonical_event_envelope.js)
- /home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs (FYD journal gateway)

## Finding: tenant is invented per-route everywhere; no Authenticated Principal exists

Every audited route takes the tenant from caller-supplied material:

| Route surface | Read path | Write path | Enforcement |
|---|---|---|---|
| canonical_events.js | `tenant_id` from req.query (destructured), shape-validated | `tenant_id` from req.body, shape-validated | `_requireTenantId` at storage authority; SQL WHERE tenant_id = $1 |
| events.js (Lane L) | `?tenant=` required (400 tenant_required) | immutable body tenant_id; 400 on contradiction | filter at read; immutability check at write |
| missions.js | `?tenant=` required on reads | body tenant_id required; requireMissionTenantId fail-closed | runtime fail-closed |
| fyd-journal-gateway server.mjs | `?tenant=` required (400 tenant_required) | body tenant_id required + immutable; aggregate_id must equal `fyd-site:<tenant_id>`; request_id bound to first-using tenant (cross-tenant reuse -> 400 request_id_tenant_conflict, zero disclosure) | filter + anti-spoof bindings |
| tenants.js (registry) | — | register/update/delete/heartbeat | NO auth gating observed |

What exists and is good:
- Fail-closed on missing/invalid tenant at every seam (400s, never unscoped defaults).
- Enforcement at the storage authority, not just the route (defense in depth).
- Write-side anti-spoof bindings in the journal gateway (aggregate binding,
  request_id tenant binding with zero disclosure).
- Hostile suite gateway/test_tenant_spoof_ingress.js: 15/15 PASS
  ("Tenant B never selected from untrusted material").

What is missing (the latent defect):
- There is NO authenticated principal anywhere in the route path: no auth
  middleware, no req.user / req.principal, no token verification. The
  envelope comment "Tenant authority comes from the authenticated execution
  context" is aspirational — no such context is wired.
- Tenant identity is therefore self-asserted: any caller who knows (or
  guesses) tenant B's id can read B's rows. The spoof test proves the
  filter is applied, not that identity is proven.
- Single-tenant deployment today makes this latent, not exploitable. It
  becomes a real cross-tenant read primitive the moment a second tenant
  exists.

## Recommendation: ONE tenant-resolution primitive

Conceptual pipeline:

Request -> Authenticated Principal -> Tenant Context -> Capability Context -> Handler.

Concretely:
1. Introduce ONE primitive, e.g. `resolveTenantContext(req)`, used by every
   route. It does, in order:
   a. Authenticate the caller (bearer token / API key -> principal).
      Unauthenticated -> 401, never a tenant.
   b. Map principal -> authorized tenant set (from the tenant registry).
   c. Intersect with any caller-asserted tenant (?tenant= / body tenant_id);
      mismatch or assertion outside the authorized set -> 403 fail-closed.
   d. Attach `req.tenantContext = { tenantId, capabilities }`.
2. Routes receive the resolved context. They NEVER read req.query.tenant /
   body.tenant_id directly again.
3. Keep enforcement at the storage authority (already the right layer);
   the authority should accept the resolved context, not a raw string.
4. The tenant registry's own write routes (register/update/delete) get the
   SECURITY/ADMIN consequence class: operator authorization + audit.

Do NOT sprinkle req.tenantId / header / query-param tenant logic through
handlers. One primitive, one place, fail-closed.

## Status

AUDITED, NOT FIXED. Fix before second tenant. No code changes made in this pass.
