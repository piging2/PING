# Phase 1 — Fix the Gateway Data Path

**STATUS:** BLOCKED
**Date:** 2026-09-12

## What was authorized

Reconfigure/recreate only `ping-gateway` so it reaches the actual `ping-postgres`. Do not modify `ping-postgres`, `brain-postgres`, or the canonical PING repo.

## Before state (captured, unchanged)

`ping-gateway` (still running, untouched):
- Image: `curious-squid-gateway:latest` (sha256:794c6cc2c7a9f89a51d2aed8c77f5716a2030648d67ebccefa877cc7314d8b2d)
- Restart policy: `no`
- Ports: `8080:8080`
- Mount: volume `muse-workspace` -> `/app/workspace/muse`
- Network: `bridge` (172.17.0.6)
- Env PG settings: `POSTGRES_HOST=host.docker.internal`, `POSTGRES_PORT=5432`, `POSTGRES_USER=ping_user`, `POSTGRES_DB=ping_db`, plus `POSTGRES_PASSWORD`, `MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY` (values not recorded here)
- Full inspect saved at `/tmp/ping-gateway-inspect-before.json` (build machine)

## Investigation findings (read-only)

### 1. The gateway's PG env was wrong on every count, not just the port

Actual `ping-postgres` (compose project `constitutional-runtime`, container created 2026-07-28):
- `POSTGRES_HOST=host.docker.internal` (correct as-is)
- `POSTGRES_PORT=5433` (gateway had 5432 -> brain-postgres)
- `POSTGRES_USER=postgres` (gateway had `ping_user`, which does not exist)
- `POSTGRES_DB=ping_runtime` (gateway had `ping_db`, which does not exist)
- `POSTGRES_PASSWORD` = 8-char value from `constitutional-runtime/.env.base`, matching the container env

Verified with a live connection test from inside the gateway container (node `pg` driver, same image and network): `CONNECT: OK` to `ping_runtime` as `postgres`. Transport via `host.docker.internal:5433` from the `bridge` network is proven.

The database contains 50 public tables including the full constitutional schema (`canonical_events`, `knowledge_nodes`, `knowledge_edges`, etc.). It is the correct target.

### 2. The credential-table key mismatch (the blocker)

`exterior_agent_credentials` in `ping_runtime` already has 2 rows:
- `muse` (active, created 2026-09-11T21:17:28Z, never used)
- `muse-level-2` (active, created 2026-09-11T21:17:28Z, never used)

The stored `api_key` values do **not** match the gateway's current `MUSE_LEVEL_1_KEY` / `MUSE_LEVEL_2_KEY` env values (verified: key-lookup count = 0 for both current keys).

Auth middleware behavior (`exterior_auth_middleware.js`, verified in the running image):
- `initialize()`: if PG connects, it creates tables and seeds defaults **only if the table is empty**. Table has 2 rows, so no seeding. The in-memory credential map is **only** populated in the PG-failure (degraded) path.
- `authenticate()`: tries PG first; on zero rows falls back to the in-memory map, which is empty when PG is up.

Consequence: if the gateway is pointed at the real PG now, the current L1/L2 bearer keys return 401 `INVALID_CREDENTIAL`. The already-proven Muse <-> SSH <-> Gateway path breaks. I would lose the ability to verify the rest of Phase 1 (audit init, knowledge.search, event.search).

### 3. Why the mismatch exists (inferred)

On 2026-09-11 something connected this codebase to PG with a different key pair and seeded the table (rows never used). The gateway was later recreated with the current key pair while PG was unreachable, so it has been running in degraded in-memory mode with the current keys ever since.

## Changes made

None. The gateway, PG, and all other infrastructure are untouched. All probing was read-only (`docker inspect`, `docker exec` with SELECT-only queries, connection tests).

## Regression check

- `ping-gateway` still running, still serving L1/L2 in degraded mode (not re-verified by API call in this phase to avoid noise; container state unchanged).
- `ping-postgres` untouched and healthy.
- No files modified on the Pig.

## Rollback

Not applicable. Nothing was changed. Prior state is fully preserved and the pre-change inspect is saved.

## Decision required (BLOCKED)

To complete Phase 1 without breaking gateway authentication, the key sets must be aligned. Options:

**Option A (recommended):** Update the two `api_key` values in `ping-postgres.exterior_agent_credentials` to the gateway's current, verified `MUSE_LEVEL_1_KEY` / `MUSE_LEVEL_2_KEY`. This is a minimal surgical write (2 rows, no schema change). It aligns the authoritative store with the operational keys. **Requires explicit authorization** because it writes to `ping-postgres`, which Phase 1 forbade.

**Option B:** Change the gateway's `MUSE_LEVEL_1_KEY` / `MUSE_LEVEL_2_KEY` to the values stored in the DB. Gateway-only change (within authorized scope), but it retires the verified operational keys in favor of a pair that has never been used, and I would need to adopt the new key values.

**Option C:** Leave Phase 1 blocked; gateway stays in degraded mode (no durable audit, no knowledge.search).

## Next

Awaiting Nolan's call on Option A / B / C before touching anything. Phases 2-8 are queued behind this decision.
