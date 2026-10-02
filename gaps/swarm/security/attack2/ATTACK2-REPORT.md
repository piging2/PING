# PATCH ATTACKER REPORT — unguarded-routes P0 fix (attack2)

- PATCH SHA: `fcfc656ca6963092c137b6eadb231bce83ee59c3` (branch `fix/route-auth-p0-sweep`, BEFORE `9b076c6bc`)
- Worktree: `/home/nolan/ping/worktrees/route-auth-sweep-fix` (Pig WSL) — verified clean, HEAD matches, untouched by this attack
- Harness: independent (not the implementer's scripts), `final.cjs` + `probe.cjs` in this directory
- Composition fidelity: verbatim mount lines from patched `_mountRoutes`, real `ExteriorAuthMiddleware`,
  real route factories, real Express 4.22.2; stubbed services record handler execution; scratch only

## VERDICT: HOLDS — no bypass found

## Vectors tried (170 checks, 170 passed)

**Mode A — PG unreachable for auth (in-memory degraded creds), 12 mutation endpoints x 11:**
- no-auth, bad bearer, empty `Bearer `, bare `Bearer`, lowercase `bearer <valid>`,
  double-space `Bearer  <valid>`, key-in-query `?api_key=<valid>`, `X-API-Key` header
  → all 401, zero handler-service calls
- valid `Bearer <key>` and raw `<key>` (no scheme) → 200, handler reached (legit callers work)
- `Bearer <key> ` (trailing space) → 200: Node's HTTP parser strips trailing OWS per
  RFC 7230 before the app sees the header (proven via raw socket: app received exactly
  `Bearer <key>`); middleware itself does no trimming. Standard HTTP behavior, not a flaw.

**Path/method tricks (no auth):** `/IDENTITIES`, `/Identities/`, `//identities`, `/identities//`,
`/%69dentities`, `/identities/%2e`, `/runtime/../identities`, `/API/V1/REPOSITORY/OBJECTS`,
`/api/v1/repository//objects`, heartbeat traversal and case variants
→ 401/404, never handler-reached. OPTIONS → 200 preflight (no handler); HEAD/PATCH → 401.

**Mode B — PG-backed auth:** unknown key → 401 fail-closed; valid key → 200.

**Mode C — degraded stubs (faithful else-branch):** 11/12 → 503; `/identities` → 404.
Note: the real degraded branch has NO `/identities` stub (pre-existing; the 503 list omits it).
Both are fail-closed. The missing stub is an inconsistency worth a follow-up, not a bypass.

**Read-only mounts unchanged:** `GET /context/recent-events` and `GET /system/state` → 200 unauthenticated.

## Bypass hunt (step 3)
- Each factory mounted exactly once, each behind `services.exteriorAuthMiddleware.middleware()`
  (`gateway_runtime.js` lines 709/711/715/716). No second mount anywhere in the repo.
- `_mountRoutes` defined once, called once. No catch-all route before the mounts
  (only `express.json()` + the CORS preflight middleware, which short-circuits OPTIONS only).
- No `method-override` package or `X-HTTP-Method-Override` handling anywhere.
- Middleware `initialize()` is awaited before `_mountRoutes` (line 162 vs 845).

## Notable non-findings
- `GET /runtime/fingerprint` unauthenticated now 401s (the guarded `/runtime` mount, registered
  first, intercepts it). Proven via a BEFORE-order composition that it was NEVER reachable:
  pre-patch it was shadowed by the runtime router's `GET /:id` (id='fingerprint' → 500).
  No legitimate-caller breakage; the endpoint is dead code in both compositions.
- No legitimate caller of the four gated mounts breaks: valid-key requests reach handlers (200).

## Residual observations (not breaks)
1. Degraded-mode stub list omits `/identities` → 404 instead of 503 (fail-closed; consider adding the stub for consistency).
2. `GET /runtime/fingerprint` is permanently shadowed by `GET /runtime/:id` (mount order) — dead route with or without the patch.
3. Raw-key-without-`Bearer` is accepted by design (`extractApiKey` supports both); documented, not attacked as a flaw.

## Files
- `final.cjs` — full 170-check battery (verbatim patched mount lines, real middleware + factories)
- `probe.cjs` — raw-socket OWS proof, double-space case, BEFORE-composition fingerprint shadowing proof
- `final-run.log` — complete run output (170/170, exit 0)

BYPASS FOUND: NO
LEGITIMATE CALLERS BROKEN: NO
