# HANDOFF — LANE B: mount-line auth for /tenants (SEC-001) and /mc (SEC-002)

**To:** sprint coordinator (Lane A owns sequencing of `gateway/bootstrap/gateway_runtime.js`)
**From:** LANE B (tenant registry + /mc business-data security)
**Date:** 2026-09-19
**Do NOT commit this file's diff from Lane B** — `gateway_runtime.js` is shared with Lane A.
Lane B commits: `gateway/exterior_auth_middleware.js` (new, verbatim port of the
production mechanism from `~/ping-gateway-src`) + `tests/security/*`.

**Base:** verified 2026-09-19 against `gateway/bootstrap/gateway_runtime.js` at
`9c0009b31` (Lane A: terminal STARTUP_BLOCKED). All 6 diff anchors match the
post-Lane-A file exactly, `node --check` is clean, and the mount-wiring contract
is 5/5 GREEN against the patched copy (verified on a `/tmp` copy; the worktree
file was not touched by Lane B).

## Provenance

- Defect source-proven in both trees:
  - ERA-R (live, `~/ping-gateway-src/gateway/bootstrap/gateway_runtime.js`): line 795
    `this._app.use('/tenants', createTenantRoutes(services.tenantRegistry));` and
    line 921 `this._app.use('/mc', createMissionControlRoutes(services));` carry no
    `exteriorAuthMiddleware`, while neighbors (`/events`, `/canonical-events`,
    `/ingest`, `/missions`, `/ai`, `/connectors`) all do.
  - ERA-C (this worktree): `_buildPgHandlers` line 109 `'/tenants':
    routes.tenants(services.tenantRegistry)` and `_mountRoutes` line 155
    `this._app.use('/mc', routes.missionControl({...}))` — no auth mechanism exists
    anywhere in the worktree (zero hits for `exteriorAuthMiddleware`,
    `authenticatedAgent`, `exterior_agent_credentials`).
- Live read-only reproduction (GET only, no mutations): `GET
  /mc/business/who-needs-followup` → 200, `GET /tenants` → 200 against the running
  Pig gateway. Write-side exposure follows from source (POST/PUT/DELETE share the
  same unauthenticated router; the audit's accidental probe already demonstrated it
  once — not repeated).
- Fix reuses the EXISTING mechanism: `ExteriorAuthMiddleware` (Bearer API key →
  `exterior_agent_credentials` → agent identity; 401 fail-closed; in-memory
  degraded mode when Postgres is down). Ported to
  `gateway/exterior_auth_middleware.js` with ONE deliberate security divergence
  from the ERA-R copy: generated key material is never logged (ERA-R prints
  generated keys to stdout at both seed sites; the port redacts them per the
  never-expose-secrets rule). Covered by two new unit tests.
- Tests: `tests/security/test_exterior_auth_middleware.js` (8 unit),
  `tests/security/test_tenants_mc_auth.js` (35 endpoints × 3 auth states + 2
  payload spot-checks = 107), `tests/security/test_mount_wiring_contract.js`
  (4 assertions; RED before this diff, GREEN after).

## Scope decision

All 35 endpoints become AUTHENTICATED (401 without a valid key). AUTHORIZED /
NAMESPACE_SCOPED are deliberately NOT introduced: TEN-001 (no agent↔tenant
binding exists anywhere) is a genuine operator decision pending Nolan; inventing
a tenant authority here would violate the lane's constraints. Classification of
every endpoint is in `EVIDENCE_fail_before_2026-09-19.md`.

### TEN-001 investigation (2026-09-19): existing authorization primitives in ERA-R

Searched the production tree for a reusable authenticated-agent authorization /
namespace-binding mechanism. Findings:

1. `exterior_agent_credentials` (authn only): columns are `api_key`,
   `agent_id`, `agent_name`, timestamps, `is_active`. **No scope, role, or
   tenant column.** A credential identifies WHO, never WHAT they may touch.
2. `gateway/capability_authority.js`: hardcoded `_agentProfiles` for `muse`
   (level 1) and `muse-level-2` (level 2) with `allowedCapabilities` lists
   (`fs.*`, `git.*`, `knowledge.search`, `event.search`, ...), `deniedPaths`,
   and limits. `authorize()` is fail-closed (unknown agent denied, capability
   must be in the profile, workspace boundaries enforced). **No tenant
   concept anywhere in profiles or capabilities.**
3. `gateway/workspace_registry.js` (`agent_workspaces` table): binds
   `agent_id` → `workspace_path` / `repository_id`. This IS an agent→namespace
   binding primitive, but its namespace is filesystem workspaces/repositories,
   not tenants.

Conclusion: the *pattern* for agent→namespace binding exists
(`agent_workspaces`) and the fail-closed authorize shape exists
(`CapabilityAuthority.authorize`), but **no tenant authority exists to populate
either**. There is no machine-readable statement of "agent X may act for tenant
Y" anywhere, and no owner/role model for tenants. Extending either mechanism to
tenants would invent tenant authority — explicitly out of scope for this lane.
TEN-001 stays BLOCKED pending Nolan's decision on: which agents may read `/mc`
business data, which may mutate the tenant registry, and how an agent is bound
to a tenant namespace. (Note CG-001: tenant owner is the default human decision
authority — but no agent→owner binding exists to enforce it.)

## Proposed diff (apply to gateway/bootstrap/gateway_runtime.js)

```diff
--- a/gateway/bootstrap/gateway_runtime.js
+++ b/gateway/bootstrap/gateway_runtime.js
@@ const express = require('express');
+const ExteriorAuthMiddleware = require('../exterior_auth_middleware');
 const routes = {

@@   async _initializeServices() {
     if (!this._pool) {
       const { Pool } = require('pg');
       this._pool = new Pool({ ... });
       console.log('[GatewayRuntime] Created default PostgreSQL pool');
     }
+    // LANE B (SEC-001/SEC-002): exterior agent authentication. Fail-closed
+    // (401) for unknown agents; degrades to in-memory credentials when
+    // Postgres is unavailable. Same mechanism guarding /events, /ingest,
+    // /missions, /ai, /connectors in the production gateway.
+    this._exteriorAuthMiddleware = new ExteriorAuthMiddleware(this._pool);
+    await this._exteriorAuthMiddleware.initialize();
     let pgAvailable = false;

@@   async _initializeServices() {  (services object)
-    return { pool: this._pool, ...integrations, ...optional, ...core };
+    return { pool: this._pool, exteriorAuthMiddleware: this._exteriorAuthMiddleware, ...integrations, ...optional, ...core };

@@   _buildPgHandlers(services) {
+    // LANE B (SEC-001): /tenants CRUD was mounted public. Wrap with the
+    // exterior auth middleware (neighbor pattern). Fail closed when the
+    // middleware is absent: never serve the registry unauthenticated.
+    const authMw = this._exteriorAuthMiddleware ? this._exteriorAuthMiddleware.middleware() : null;
+    const requireAuth = (handler) => (req, res, next) => authMw
+      ? authMw(req, res, (err) => (err ? next(err) : handler(req, res, next)))
+      : res.status(503).json({ error: 'Auth not initialized', denied: true });
     return {
       '/events': routes.events(services.eventReadAuthority, services.unifiedEventRuntime, services.pool),
       '/context': routes.context(services.eventReadAuthority),
       '/api/v1/repository': routes.repository(services.repoStore),
       '/system': routes.system(services.eventReadAuthority),
       '/canonical-events': routes.canonicalEvents(services.canonicalEventEnvelope),
-      '/tenants': routes.tenants(services.tenantRegistry),
+      '/tenants': requireAuth(routes.tenants(services.tenantRegistry)),
       '/deployments': routes.deployments(services.deploymentRegistry),
       '/runtime': routes.runtime(services.runtimeRegistry),
       '/ingest': routes.ingest(services.canonicalizationService),
     };
   }

@@   _mountRoutes(services) {
-    this._app.use('/ai', routes.ai(services.aiRuntime, services.ollamaProvider)); this._app.use('/connectors', routes.connectors(services.connectorRegistry, services.capabilityRegistry, services.oauthManager)); this._app.use('/mc', routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));
+    this._app.use('/ai', routes.ai(services.aiRuntime, services.ollamaProvider));
+    this._app.use('/connectors', routes.connectors(services.connectorRegistry, services.capabilityRegistry, services.oauthManager));
+    // LANE B (SEC-002): /mc business-intelligence surfaces were mounted public.
+    // Same neighbor pattern as /ai and /connectors. Fail closed when the
+    // middleware is absent (e.g. _mountRoutes invoked without _initializeServices,
+    // as in gateway/test_pg_recovery.js).
+    const mcAuth = this._exteriorAuthMiddleware
+      ? this._exteriorAuthMiddleware.middleware()
+      : ((req, res) => res.status(503).json({ error: 'Auth not initialized', denied: true }));
+    this._app.use('/mc', mcAuth, routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));
```

The wiring-contract test (`tests/security/test_mount_wiring_contract.js`) encodes
this exact contract: it resolves the `/mc` mount's auth identifier (e.g. `mcAuth`)
and requires it to be backed by `ExteriorAuthMiddleware`; it requires the
`/tenants` entry in `_buildPgHandlers` to be wrapped in `requireAuth` backed by
the same middleware. Keep the test green if the shape is adjusted.

## Coordinator checklist before/after applying

1. `node tests/security/test_mount_wiring_contract.js` must go GREEN (it is RED now).
2. Run the full lane suite: `test_exterior_auth_middleware.js` (8),
   `test_tenants_mc_auth.js` (107) — both GREEN before and after (they prove the
   composed behavior, independent of the mount lines).
3. New required module `gateway/exterior_auth_middleware.js`: confirm the closure
   certifier / `runtime-manifest.json` allowlist covers it (PING Runtime
   Distribution v1: build fails on out-of-distribution imports).
4. Behavior change: `/mc` and `/tenants` return 401 without
   `Authorization: Bearer <key>`. No in-process callers exist (bridge/scheduler
   use runtimes directly); external dashboards need a key from
   `exterior_agent_credentials`.
5. Do NOT backfill: no agent↔tenant binding is introduced (TEN-001 stays a grill
   item for Nolan).

## Out of scope (flagged, not fixed)

- `/context`, `/api/v1/repository`, `/system`, `/deployments`, `/runtime`,
  `/api/v1/ollama`, `/knowledge` (POST), `/canonical-events` (ERA-C has no auth
  at all) — adjacent public surfaces; SEC-003/SEC-004/SEC-005 class. Lane B owns
  only `/tenants` + `/mc`; the same `requireAuth`/`mcAuth` pattern extends to
  them trivially if the coordinator wants a follow-up lane.
- TEN-001/002/003/004 (tenant identity model) — needs Nolan's decision, not a patch.
- SEC-006 (worker identity self-assertion), SEC-007 (credential expiry) — recorded,
  not in lane scope.
