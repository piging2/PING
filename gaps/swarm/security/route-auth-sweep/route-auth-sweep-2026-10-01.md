# Route-auth mount-table sweep — unauthenticated sibling routes of /tenants

- **Date:** 2026-10-01 ~18:45-19:05 MDT
- **Role:** READ-ONLY forensics probe. No mutations, no requests to served systems.
- **Source tree:** `/home/nolan/ping/worktrees/research-p0` (served-image source tree per task; HEAD `9b076c6bc`), read via read-only SSH to the Pig. No files modified; `git status` untouched.
- **Mount table:** `gateway/bootstrap/gateway_runtime.js` (research-p0), lines 703-836.

## Auth baseline

- The only auth mechanism in the gateway is `services.exteriorAuthMiddleware.middleware()` (`gateway/exterior_auth_middleware.js`, required at `gateway_runtime.js:20`), applied per-mount on: `/events` (708), `/canonical-events` (713), `/ingest` (717), `/orchestration` (819), `/missions` (829), `/ai` (832), `/connectors` (834).
- `gateway/route_middleware.js` `asyncHandler()` does request logging + error formatting only. No auth.
- Global middleware (`_setupMiddleware`, lines 118-119): `express.json()` + CORS/OPTIONS preflight. No auth.
- NOTE: in this tree `/tenants` (line 714) is also mounted WITHOUT the auth middleware — the `/tenants` P0 patch lives on branch `fix/tenants-exterior-auth-p0` (worktree `p0-tenants-auth`), not in research-p0. That is the known patched hole; the six routes below are its unpatched siblings.

## Per-route classification

| Route | Mount (file:line) | Auth middleware | Handlers | Mutation-capable | Classification |
|---|---|---|---|---|---|
| `/identities` | `gateway/bootstrap/gateway_runtime.js:709` | NONE | GET `/` (routes/identities.js:72, sanitized list); POST `/` (routes/identities.js:101, mint identity) | POST `/` | **UNGUARDED-MUTATION** |
| `/deployments` | `gateway/bootstrap/gateway_runtime.js:715` | NONE | POST `/` (21); GET `/:id` (44); GET `/tenant/:tenantId` (51); PUT `/:id/status` (61); POST `/:id/complete` (69); POST `/:id/fail` (77); POST `/:id/rollback` (85); GET `/tenant/:tenantId/active` (92) | POST `/`, PUT `/:id/status`, POST `/:id/complete`, POST `/:id/fail`, POST `/:id/rollback` | **UNGUARDED-MUTATION** |
| `/runtime` | `gateway/bootstrap/gateway_runtime.js:716` | NONE | POST `/` (20); GET `/:id` (54); GET `/tenant/:tenantId` (61); PUT `/tenant/:tenantId/type/:type/name/:name/status` (71); POST `.../heartbeat` (79); DELETE `/tenant/:tenantId/type/:type/name/:name` (86); GET `/tenant/:tenantId/unhealthy` (92) | POST `/`, PUT `.../status`, POST `.../heartbeat`, DELETE `...` | **UNGUARDED-MUTATION** |
| `/context` | `gateway/bootstrap/gateway_runtime.js:710` | NONE | 7x GET only: `/recent-events` (14), `/worker-status` (20), `/runtime-digest` (25), `/latest-summaries` (31), `/recent-failures` (37), `/model-metrics` (43), `/daily-activity` (48) | none | **UNGUARDED-READ-ONLY** |
| `/system` | `gateway/bootstrap/gateway_runtime.js:712` | NONE | 6x GET only: `/cache/drive_index.json` (21), `/config/placements.json` (29), `/content/manifest.json` (37), `/logs/sync.log` (45), `/logs/audit.json` (53), `/state` (61, `SystemAuthority.getSystemState()` — collectors only, read-only) | none | **UNGUARDED-READ-ONLY** |
| `/api/v1/repository` | `gateway/bootstrap/gateway_runtime.js:711` | NONE | POST `/objects` (13); GET `/objects/:id` (22); GET `/objects` (28); DELETE `/objects/:id` (37) | POST `/objects`, DELETE `/objects/:id` | **UNGUARDED-MUTATION** |

All line refs in `gateway/routes/*.js` are within research-p0. Each `create*Routes` factory is mounted exactly once in production code (grep across repo, excluding the route files themselves, returns only the gateway_runtime.js lines above). No wildcard/catch-all or method-override that would alter this table.

## Mutation handlers: what they do + non-HTTP callers

### `/identities` — POST `/` (routes/identities.js:101)
- **Does:** mints a PING identity via the One IdentityAuthority (`IdentityAuthority.generateId('identity', {display_name, public_key})`), then emits a canonical `OBJECT_CREATED` event with `ping.identity@1` schema and a **gateway-genesis attestation proof** into the event journal via `unifiedEventRuntime.emit(...)`. Idempotent on (display_name, public_key) only — any new key mints a new identity.
- **Effect:** writes CANONICAL TRUTH (canonical journal, the converged single journal). Unauthenticated caller can mint arbitrary identities carrying valid gateway attestation.
- **Non-HTTP callers:** the identity-mint-and-emit flow has no production non-HTTP caller (emit path is the shared journal writer, but the minting HTTP handler is the only producer of `ping.identity@1` genesis events; `generateId` is deterministic, no bypass). No legit caller would break by adding auth (only consumers read `GET /identities`, sanitized).

### `/deployments` (routes/deployments.js) — POST `/`, PUT `/:id/status`, POST `/:id/complete`, POST `/:id/fail`, POST `/:id/rollback`
- **Does:** register deployment (tenant_id, version, git_sha required) / transition status with arbitrary body / mark complete / mark failed / roll back — all via `DeploymentRegistry.execute*`, which runs `INSERT ... ON CONFLICT (tenant_id, version) DO UPDATE` and `UPDATE deployment_registry` directly against Postgres (`ping-runtime/runtime/deployment_registry.js:73,161`).
- **Effect:** unauthenticated write/poison of the deployment truth store (`deployment_registry` table) that Mission Control projects and the deploy path resolves.
- **Non-HTTP callers:** none in production — the `execute*` methods are called only from `gateway/routes/deployments.js` (plus internal chaining within the registry and `gateway/test_*.js` test files). Nothing legitimate breaks if gated.

### `/runtime` (routes/runtime.js) — POST `/`, PUT `.../status`, POST `.../heartbeat`, DELETE `...`
- **Does:** register component / transition component status with arbitrary body / record heartbeat+metrics / remove component — via `RuntimeRegistry.execute*`, direct Postgres (`INSERT ... ON CONFLICT (tenant_id, component_type, component_name) DO UPDATE`, `UPDATE`, `DELETE FROM runtime_registry` at `ping-runtime/runtime/runtime_registry.js:82,199,225,241`).
- **Effect:** unauthenticated caller can register phantom components, flip real component statuses, spoof heartbeats (defeats `/tenant/:tenantId/unhealthy` detection), or delete components outright from `runtime_registry`.
- **Non-HTTP callers:** none in production — only `gateway/routes/runtime.js` + tests. Nothing legitimate breaks if gated.

### `/api/v1/repository` — POST `/objects` (routes/repository.js:13), DELETE `/objects/:id` (routes/repository.js:37)
- **Does:** `repoStore.append(...)` → `INSERT INTO repository_objects ... ON CONFLICT (object_id) DO UPDATE SET` (`ping-runtime/events/repository_store.js:92-94`); `repoStore.delete(...)` → `DELETE FROM repository_objects WHERE object_id = $1` (`:172`). No schema/auth; `client: null`.
- **Effect:** unauthenticated arbitrary object write/upsert and delete in the repository object store.
- **Non-HTTP callers:** internal writers exist on separate authority paths (`AppendOrchestrator`, `authority_registry.js`, harnesses) — they do not depend on the HTTP route's auth state, so gating the HTTP route does not break them.

## UNGUARDED-READ-ONLY notes (disclosure, not mutation)

- `/context`: all 7 GETs read via `eventReadAuthority` — recent events, worker status, digests, summaries, failures, model metrics, daily activity. Unauthenticated operational disclosure.
- `/system`: all GETs read-only; serves fixed-path files (`cache/drive_index.json`, `config/placements.json`, `content/manifest.json`, `logs/sync.log`, `logs/audit.json` — hardcoded paths, no traversal) plus `/system/state` collector output. Unauthenticated internal-state disclosure. (`/runtime/fingerprint` at gateway_runtime.js:749 is a separate mount on a distinct path, not part of this route.)
- Degraded-mode branch (lines 720-728) replaces these with 503 stubs — only when Postgres is down; same shape as the `/tenants` degraded stub noted in the patch attack report.

## Ranked next-P0 list

1. **POST /identities (routes/identities.js:101) — highest.** Writes to the CANONICAL EVENT JOURNAL with gateway-genesis attestation. This is identity-authority bypass: anyone can mint identities the system then treats as gateway-attested truth. Directly undercuts the journal-truth convergence work (single canonical journal now polluted by design if reachable). Fix shape: same one-line `exteriorAuthMiddleware.middleware()` composition as the /tenants patch.
2. **`/deployments` mutation set (routes/deployments.js:21,61,69,77,85) — high.** Unauthenticated poisoning of deployment truth in Postgres; can fabricate deployments, mark real ones failed, trigger rollback records. Feeds Mission Control projections and deploy resolution.
3. **`/runtime` mutation set (routes/runtime.js:20,71,79,86) — high.** Unauthenticated registration/spoofing/deletion of runtime components and heartbeats; defeats unhealthy-component detection; phantom components pollute the operational projection.
4. **`/api/v1/repository` POST+DELETE (routes/repository.js:13,37) — medium-high.** Arbitrary write/delete of repository objects; no provenance, `client: null`. Consequential for anything consuming the object store, but below identity/deployment truth in severity.

`/context` and `/system` (UNGUARDED-READ-ONLY) are disclosure hygiene, not P0-class.

## Method note

Mount table read from the served-image tree; route files read in full; registry backends verified (`deployment_registry.js`, `runtime_registry.js`, `repository_store.js`) to confirm SQL writes; non-HTTP caller search via repo-wide grep for each `execute*` method and `repoStore` (excluding node_modules and the route files themselves). No unauthenticated requests were sent to any served system.
