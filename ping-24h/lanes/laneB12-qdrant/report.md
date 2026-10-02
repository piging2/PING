# Lane B12, Qdrant Bounded Task, Report

Date: 2026-09-28 ~15:40 MDT (T+1.25). Lane: B12 (subagent cd4dfa63). Scope: BOUNDED. Read-only except as noted. No pushes, no gateway touches, no :3100 restart, no jev-scheduler missions touched.

## Verdict

QDRANT = DEGRADED/OFFLINE. VECTOR SEARCH = UNAVAILABLE. ORCA falls back to non-vector knowledge paths. Do not block FYD on Qdrant.

The intended credential was NOT found in any existing mechanism. No authenticated-operation test was run (no key to test with; inventing one is forbidden). The probe fix was NOT landed (disposition below).

## Credential search outcome: NOT FOUND

Searched read-only, in order:

1. Workspace env/compose files: `docker-compose.oracle.yml` (ping-overnight/oracle-deploy) defines `ping-qdrant` with NO api-key env; the gateway service gets only `QDRANT_HOST`/`QDRANT_PORT`/`QDRANT_URL`. No `QDRANT_API_KEY` anywhere in workspace configs.
2. Pig containers (read-only `docker inspect`, presence checks only, no values printed/logged/persisted):
   - `ping-qdrant`: `QDRANT__SERVICE__API_KEY` IS SET (presence confirmed, value never read out). No published ports.
   - `brain-qdrant`: NO api-key env. Publishes 6333/6334 to 0.0.0.0.
   - `ping-gateway`: env has `QDRANT_URL=http://ping-qdrant:6333`, `QDRANT_HOST=ping-qdrant`, `QDRANT_PORT=6333`. `QDRANT_API_KEY` is ABSENT.
3. Gateway source on the Pig (`/home/nolan/ping-gateway-src`): no `.env` files in `gateway/`; Dockerfile has no QDRANT entries; no script or compose file on the Pig defines `QDRANT_API_KEY` as an active credential (only doc mentions in FAILURE_LEDGER copies, the 2026-09-23 SECURITY-POSTURE-REVIEW, and CAPABILITY-MATRIX).
4. Secret broker (`~/projects/ping/src/lib/secrets/secret-broker.ts`): no qdrant entry.

The intended credential mechanism IS defined in code: `ping-runtime/search/qdrant_adapter.js` (the exact client ORCA uses) reads `options.apiKey || process.env.QDRANT_API_KEY`; `gateway/qdrant_client.js` reads `QDRANT_API_KEY` the same way. The gateway constructs `new QdrantAdapter()` with no options, so it depends entirely on the env var, which is not set.

## Failure mechanism (proven by code plus config, no mutation performed)

- Between the 2026-09-23 posture review (ping-qdrant auth-free by design, loopback/internal only) and now, `ping-qdrant` was recreated with `QDRANT__SERVICE__API_KEY` set. The matching client key was never wired into `ping-gateway`.
- Every API path on ping-qdrant, including `/` (which `QdrantAdapter.health()` calls), now requires the key. The gateway sends no `api-key` header, so the real init path 401s and embedding init stays `not_initialized` (as seen in the gateway /health body).
- The 2026-09-23 CAPABILITY-MATRIX had already flagged the broad shared-env injection that placed key-shaped vars on ping-qdrant; the key is now actually enforced server-side with no client counterpart.

## Authenticated-operation test result: BLOCKED

Blocker: no intended credential exists in any legitimate mechanism. Without `QDRANT_API_KEY` there is nothing to test with, and inventing a key is explicitly forbidden. The single real-operation test (collection access or search through ORCA's `QdrantAdapter`) was therefore not run. Status of that test: NOT EXECUTED, blocked on missing credential.

## Recorded status

- QDRANT = DEGRADED/OFFLINE
- VECTOR SEARCH = UNAVAILABLE
- ORCA knowledge path: falls back to non-vector paths (PG-backed pipeline continues; gateway comment in code states init failure must not disable the PG-backed pipeline, and it is surfaced and scoped).
- FYD is not blocked on Qdrant.

## Correction B applied (scrubs the universal-bypass claim)

Correction: do NOT claim Qdrant `/healthz`/`/readyz` universally bypass API-key auth. The current Qdrant API reference shows API-key auth on those endpoints (true at least for Qdrant Cloud); several self-hosted charts do exempt them, so it is deployment-dependent. The operational conclusion stands unchanged: a 200 on an authless/host-level probe does NOT establish that ORCA's actual collection/search path is authenticated and usable. Note the trap found here: the MC technology probe hits `127.0.0.1:6333`, which is answered by `brain-qdrant` (authless, different instance), while ORCA's client is configured for `ping-qdrant` (keyed, 401s). A green probe against the wrong instance is worse than no probe.

This also answers lane09 open question 7: `:6333` is answered by `brain-qdrant`, not `ping-qdrant`. `brain-qdrant` holds collections `constitutional_documents`, `constitutional_memory`, `knowledge` (read 2026-09-28 ~15:38 MDT via authless `/collections`).

## Probe-fix disposition: NOT LANDED

The fix (probe must test a real authenticated collection/search operation through ORCA's actual client, against `ping-qdrant`, not the authless `:6333` root) is permitted only on an isolated branch meeting all Phase-16 pre-authorization conditions AND only if the credential is found. The credential was not found, so the fix was not attempted. The defect is recorded here for a future authorized lane:

- File: `~/projects/ping/src/app/api/mc/technology/route.ts` (on the Pig), service check `{ id: "svc:qdrant", url: "http://127.0.0.1:6333/" }` marks PROVEN on any HTTP 200, and the collections detail probes the same wrong-instance URL. A correct probe would call the gateway's own `qdrant` health check (which exercises `QdrantAdapter.health()` against `ping-qdrant`) or perform one authenticated `POST /collections/knowledge/points/count` through the adapter, and report DEGRADED/OFFLINE on 401.

## Least-privilege guidance (conditional, for when access is restored)

No rotation performed by this lane. If Nolan restores access: prefer a read-only, collection-scoped key for the gateway/ORCA read path (Qdrant supports granular keys); keep the server-side service key out of client envs; scope env per service (the 2026-09-23 review already flagged the shared-env-injection pattern). Rotate nothing until Nolan directs it.

## What Nolan must decide (surfaced, not executed)

Restoring vector search requires a production mutation, which this lane did not make: either (a) retrieve the `QDRANT__SERVICE__API_KEY` value from whoever set it on `ping-qdrant` and wire it as `QDRANT_API_KEY` on `ping-gateway` (container recreate), or (b) remove the API key from `ping-qdrant` to restore the prior auth-free posture (a security-policy change). Both need Nolan's explicit call. Until then, the recorded OFFLINE status stands and nothing retries around it.

## Constraints observed

Read-only throughout. No secret material printed, logged, or persisted (presence checks only). No gateway mutation, no container creation, no :3100 interaction, no jev-scheduler missions touched, no push, no deploy, no dirty-tree contact. UNKNOWN states kept as UNKNOWN.
