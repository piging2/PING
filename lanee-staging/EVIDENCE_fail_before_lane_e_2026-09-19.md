# LANE E (SEC-003/004/005) — fail-before evidence, 2026-09-19

Base: worktree HEAD 6396113a7 (Lane B SEC-001/SEC-002 applied, /health startup
surfacing applied). All probes read-only unless noted.

## 1. Source verification (pre-fix): all 8 surfaces mounted WITHOUT auth

gateway/bootstrap/gateway_runtime.js at 6396113a7:

| surface | mount site | pre-fix wiring |
|---|---|---|
| /context | _buildPgHandlers | `'/context': routes.context(services.eventReadAuthority)` — public via `_pgRoute` |
| /api/v1/repository | _buildPgHandlers | `'/api/v1/repository': routes.repository(services.repoStore)` — public |
| /system | _buildPgHandlers | `'/system': routes.system(services.eventReadAuthority)` — public |
| /deployments | _buildPgHandlers | `'/deployments': routes.deployments(services.deploymentRegistry)` — public |
| /runtime | _buildPgHandlers | `'/runtime': routes.runtime(services.runtimeRegistry)` — public |
| /canonical-events | _buildPgHandlers | `'/canonical-events': routes.canonicalEvents(services.canonicalEventEnvelope)` — public |
| /api/v1/ollama | _mountRoutes L150 | `this._app.use('/api/v1/ollama', routes.ollama(...))` — public |
| /knowledge | _mountRoutes L182 | `this._app.use('/knowledge', routes.knowledge(...))` — public |

Single mount point each (grep of gateway/ confirms no duplicate mounts).
No in-process HTTP callers of these paths inside gateway/, ping-runtime/,
infrastructure/ (ui-next build-artifact references only; its
/api/v1/ollama/jobs/* path does not exist in this gateway).

Production (ERA-R) comparison: ~/ping-gateway-src mounts /context,
/api/v1/repository, /system, /deployments, /runtime, /api/v1/ollama,
/knowledge public too; only /canonical-events carries
exteriorAuthMiddleware there (line 794). ERA-C is behind production on
/canonical-events and matches production's public posture on the other 7;
the lane fixes all 8 to AUTHENTICATED per the task scope.

## 2. Live read-only probes (Pig gateway, production image 8400deecf2a9, GET only)

Unauthenticated GETs, 2026-09-19 ~20:52 MDT:

- 200 /context/recent-events?limit=1
- 200 /api/v1/repository/objects
- 200 /system/state
- 200 /deployments/tenant/probe-neg-e
- 200 /runtime/tenant/probe-neg-e/unhealthy
- 200 /api/v1/ollama/models
- 200 /knowledge/stats
- 401 /canonical-events/stats (authed in the production image, per ERA-R)
- /health reachable unauthenticated (503: Qdrant/embedding deps down, known
  FL-20260919-005 — a status response, NOT an auth gate; confirms public by design)

## 3. Contract test RED (pre-fix)

`node tests/security/test_mount_wiring_contract_sec003_005.js`
=> 2 passed, 8 failed. The 8 failures name each open surface; the
/health-stays-public and startup-check assertions PASS pre-fix (guardrails).

## 4. HTTP negative test RED (pre-fix)

`test_sec003_005_auth.js` composed WITHOUT the auth middleware (public
composition mirroring the pre-fix mounts), run as
`test_sec003_005_auth_NOAUTH_TMP.js`:
=> 45 passed, 86 failed. All 86 unauthenticated/wrong-key -> 401 assertions
FAIL (routes returned 200/404/500, never 401). All 43 valid-key "not 401"
assertions plus both payload spot-checks PASS (fixtures and routes are sound;
only the auth wiring is missing).

## 5. Fix (applied post-evidence)

gateway/bootstrap/gateway_runtime.js, 5 exact-match splices:
- R1: wrap the six _buildPgHandlers entries in the existing requireAuth helper
- R2: extend the Lane B comment (Lane E scope note)
- R3: hoist mcAuth to the top of _mountRoutes; auth the /api/v1/ollama mount
- R4: remove the old mcAuth definition; /mc keeps the hoisted identifier
- R5: auth the /knowledge mount

AUTHENTICATED-only (401 fail-closed); 503 fail-closed when the middleware is
absent (same as Lane B). TEN-001 authorization deliberately not invented.
/health untouched (still `this._app.use('/health', routes.health(healthAuthority))`).
