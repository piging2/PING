# Q6 — SECURITY SWARM — /tenants unauthenticated write — FAIL / P0 — 2026-10-01 ~18:25 MDT

## PROPOSITION
An unauthenticated caller can mutate the live /tenants route (the Tenant Registry HTTP interface).

## EXACT SHA / SERVED IMAGE
- Served image: `ping-gateway:research-p0-20260930`, created 2026-10-01T00:29:54Z (NOTE: differs from the archaeology doc's `repair-cert-20260924`; the served container was replaced).
- Container: `ping-gateway`, listening 0.0.0.0:8080.
- Served route source: `/app/gateway/routes/tenants.js` inside the container (read via docker exec). Contains six routes, zero auth middleware on any of them.
- PLANE: SERVED (live production container), not repo prose.

## COMMAND / REQUEST (exact)
```
POST http://127.0.0.1:8080/tenants
Content-Type: application/json
{"tenant_id":"swarm-probe-20261001-q6","name":"SWARM PROBE INERT"}
```
(no Authorization header, no credentials of any kind)

## OBSERVED RESULT
- HTTP 200. Response: registered tenant record with status "active", registered_at "2026-10-02T00:25:09.292Z" (UTC).
- Read-after-write: GET /tenants returned `{"tenants":[...scratch record...],"count":1}` — mutation persisted (registry was `count:0` before).
- DELETE /tenants/<scratch-id> (no auth): HTTP 500 `{"error":"Cannot read properties of undefined (reading 'query')"}` — reached handler logic and threw server-side (a separate code defect in the registry's remove path), NOT an auth rejection. Unauthenticated DELETE is routable; it just crashes.
- PUT /tenants/<scratch-id> (no auth): HTTP 500 `{"error":"Tenant ... not found"}` — again server-side error, not auth rejection.
- Scratch tenant remains in the registry, marked inactive in metadata as `probe: swarm-q6-20261001` (inert; registry was empty before the probe; requires a working remove path or a direct DB delete to fully clear).

## PASS / FAIL / UNKNOWN
**FAIL — P0.** Unauthenticated mutation of the Tenant Registry succeeded against the served gateway. Stop condition met; lane stopped before Q7/Q8/Q9/Q26 per swarm rules.

## CONFIRMS / KILLS
- CONFIRMS Nolan's first-pass claim (Q06 FAIL) as reproduced against SERVED code, not repo prose.
- CORRECTS the archaeology doc's claim that the served image is `repair-cert-20260924` — live is `research-p0-20260930` (built 2026-10-01 ~00:29 UTC). The defect survives the image swap.

## EVIDENCE LOCATION
- This file: ~/workspace/gaps/swarm/security/q06-tenants-unauthenticated-write.md
- Served route source (no auth middleware): read from container `/app/gateway/routes/tenants.js` at probe time (routes: POST /tenants, GET /tenants, GET /tenants/:id, PUT /tenants/:id, DELETE /tenants/:id, POST /tenants/:id/heartbeat — all unauthenticated).

## SMALLEST FIX IF FAIL
Do not implement under swarm read-only/hostile mandate; recommend to coordinator: (a) add bearer auth (reuse exterior_auth_middleware.js) to all six /tenants routes, or (b) remove the route from the served gateway entirely; (c) repair the crashing PUT/DELETE paths (thrown as 500s, not handled errors). Fix needs Nolan's word on auth design vs removal.
