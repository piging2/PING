# TenantOS Isolation Proof Plan — DRAFT

Source: Ollama qwen2.5-coder:7b via prompt-ollama.sh, 2026-09-25 ~15:35 MDT.
Status: draft design input only. NOT grounded in the actual TenantOS codebase yet.
Next step before use: map each property to the real TenantOS modules/routes/authority checks,
then turn the assertions into executable tests.

## 1. Data Separation
- Setup: two tenants, TenantA with data "apple", TenantB with data "banana".
- Action: attempt to read TenantA's data from TenantB's context.
- Pass/fail: FAIL if TenantB can read TenantA's data.

## 2. Authority Separation
- Setup: different authority levels (read-only vs full access) on the same resource.
- Action: as the lower-privilege tenant, attempt a higher-privilege action.
- Pass/fail: FAIL if the low-privilege tenant succeeds.

## 3. Route Scoping
- Setup: isolated routes per tenant.
- Action: attempt to access another tenant's route.
- Pass/fail: FAIL if the request is not blocked or redirected.

## 4. Tenant Metadata Isolation
- Setup: two tenants with distinct metadata (e.g. geographical location).
- Action: attempt to query or use another tenant's metadata.
- Pass/fail: FAIL if cross-tenant metadata is accessible.

## Minimal second-tenant CI fixture (sketch)
```json
{
  "tenants": [
    { "id": "T1", "name": "TestTenantA", "data": "apple", "authorityLevel": "admin" },
    { "id": "T2", "name": "TestTenantB", "data": "banana", "authorityLevel": "read-only" }
  ],
  "routes": [
    { "path": "/tenantA", "tenantId": "T1" },
    { "path": "/tenantB", "tenantId": "T2" }
  ]
}
```

## Most likely silent regression (TypeScript)
A route-handling or authority check gets bypassed (e.g. a validation step removed
without a covering unit test), allowing cross-tenant data access through an
unintended route. The test that catches it: a tenant attempts cross-tenant access
through a non-obvious path and must fail closed.

## Known limits of this draft
- Generic placeholders (apple/banana), not tied to real TenantOS entities.
- Does not cover: tenant provisioning/deprovisioning lifecycle, shared-infrastructure
  side channels (caches, logs, search indexes), or the stripped-gate regression class
  found in tenanos-int-tree on 2026-09-25 (a gate-removal test belongs here explicitly).
