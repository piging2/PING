# PATCH ATTACK REPORT — /tenants P0 fix (unauthenticated mutation hole)

- **Role:** PATCH ATTACKER (asymmetric swarm; different worker from implementer; patch NOT modified)
- **Date:** 2026-10-01 ~18:37-18:45 MDT
- **Patch SHA:** `624220518c4977b976449dee5a7de9e60f93eaad`
- **Branch:** `fix/tenants-exterior-auth-p0`
- **Worktree:** `/home/nolan/ping/worktrees/tenants-auth-p0-fix` (on the Pig; verified untouched afterward — `git status` clean, HEAD unchanged)
- **Patch under test:** `gateway/bootstrap/gateway_runtime.js` line 714:
  `this._app.use('/tenants', services.exteriorAuthMiddleware.middleware(), createTenantRoutes(services.tenantRegistry));`

## Method

Live hostile-request battery against the exact patched composition, run as scratch on the Pig
(ports 18741-18743, mock Postgres pools only, mock tenant registry with per-route execution
instrumentation). Replicated the real `_setupMiddleware` globals (express.json + CORS/OPTIONS
preflight) so the composition is faithful. **Never touched the served container or served DB.**
Worktree left byte-identical.

Evidence: `results-degraded.json`, `results-pg.json` (same directory).

## Attack vectors tried

**Q6 exact replay, no auth (all six routes):** POST /tenants, GET /tenants, GET /tenants/:id,
PUT /tenants/:id, DELETE /tenants/:id, POST /tenants/:id/heartbeat → **401, zero handler execution** on all six, in both degraded and pg-backed modes.

**Header variants (12):** bad bearer key, `Basic` scheme, bare `Bearer` with no key, lowercase
`bearer` + valid key, double-space after Bearer + valid key, empty Authorization header, 10KB
garbage key → **all 401, zero handler execution**. Valid key (Bearer and raw, both supported by
design) → 200 with handler execution (positive controls green).

**Path tricks, no auth (15):** trailing slashes (`/tenants/`, `/heartbeat/`), case variants
(`/TENANTS`, `/Tenants/x`), double slashes (`/tenants//`, `//tenants`), encoded segments
(`/%74enants`, `/tenants/%2e%2e`, `/t%C3%A9nants`, `/tenants/./x`), suffix (`/tenants.json`),
semicolon (`/tenants;x`), query strings, HEAD → **all 401 or 404, zero handler execution.**
OPTIONS → 200 with zero handler execution (pre-existing global CORS preflight in
`_setupMiddleware`, unrelated to the patch — no route logic reachable).

**Duplicate `Authorization` headers (raw socket, 4):** Node's HTTP server takes the FIRST header
and drops the rest (verified via echo probe: parsed value is a plain string, first-wins).
Valid-first → authenticated 200 (correct: caller presented a valid key — no attacker advantage);
junk-first → 401, zero execution. Not a bypass; platform behavior, consistent ordering.

**Credential-state semantics (10):** degraded in-memory mode — valid env-seeded key works,
unknown/deactivated/expired keys → 401. PG-backed mode — unknown key (zero rows → empty
in-memory fallback) → 401; valid PG row → 200. Simulated mid-request PG outage after init →
previously-valid PG key now **401 fail-closed** (in-memory map empty in pg-seeded mode),
unknown/missing key → 401. Zero handler execution in every denied case.

## Bypass hunt (static)

- `createTenantRoutes` is mounted exactly **once** in production code (line 714, patched).
  The only other `/tenants` mount is line 725, the degraded-mode 503 stub inside the
  mutually-exclusive `else` branch — cannot compose with the patched mount.
- Only `gateway_runtime.js` requires `routes/tenants`; `_mountRoutes` called once.
- No in-repo HTTP callers of `/tenants` (no fetch/axios/http targeting it; the two test files
  and `test_runtime_tenant.js` exercise the registry in-process only).
- No wildcard/catch-all mounts, no method-override, no cors package before the mount.

## Sibling-route sanity

The diff touches exactly one line; mount order unchanged. Already-authed siblings verified
untouched and still guarded: `/events` (708), `/canonical-events` (713), `/ingest` (717),
`/orchestration` (819), `/missions` (829), `/ai` (832), `/connectors` (834).

## Results

- Degraded mode: 35/36 (the one "fail," D-1, was a wrong test expectation — valid key presented
  first is legitimately authenticated; re-probed as D-1b/D-2b, both correct).
- PG-backed mode: 33/34 (same D-1 explanation).
- Genuine bypasses found: **0**. Handler executions by unauthenticated callers: **0**.

## Flags (observations, NOT patch failures)

1. `/identities`, `/deployments`, `/runtime`, `/context`, `/system`, `/api/v1/repository` remain
   mounted WITHOUT the exterior auth middleware — pre-existing, outside this patch's scope,
   but adjacent unauthenticated surface worth a future Q.
2. `extractApiKey` accepts a raw key with no `Bearer` scheme (documented "direct <key>" support)
   and scheme matching is case-sensitive — by design, not a bypass.
3. OPTIONS on any route returns 200 pre-auth via the global CORS preflight — pre-existing,
   reveals nothing, executes no handler logic.

## Verdict

- **BYPASS FOUND: NO**
- **LEGITIMATE CALLERS BROKEN: NO** (no in-repo HTTP callers of /tenants; nothing in the
  gateway, workers, Mission Control, or tests calls it over HTTP)
- **VERDICT: HOLDS** — the one-line patch closes the Q6 hole. All six routes deny
  unauthenticated callers with 401 before handler logic; degraded and mid-outage paths fail
  closed; no second mount or internal caller bypasses or breaks on it.
