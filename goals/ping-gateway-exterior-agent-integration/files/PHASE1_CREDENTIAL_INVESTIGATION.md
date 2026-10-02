# PHASE 1 — CREDENTIAL BLOCKER INVESTIGATION

**Date:** 2026-09-12
**Status:** Investigation complete (read-only). Awaiting Docker recovery and Nolan's authorization for the 2-row update.

## Critical infrastructure event

**Docker Desktop on the Pig is DOWN.** The daemon reports "unable to start" as of ~12:20 PM MDT today. All containers (including `ping-gateway` and `ping-postgres`) are unreachable. This was NOT caused by this investigation (all operations were read-only: `docker inspect`, `docker exec` with SELECT-only queries). The gateway is currently down. I am not authorized to restart Docker Desktop. This blocks all further Phase 1 work until Docker recovers.

## Proven facts

### Credential table schema
From `exterior_auth_middleware.js` (the authoritative source; it creates the table):
- `api_key VARCHAR(128) PRIMARY KEY`
- `agent_id VARCHAR(255) NOT NULL UNIQUE`
- `agent_name VARCHAR(255)`
- `created_at TIMESTAMP DEFAULT NOW()`
- `last_used_at TIMESTAMP`
- `expires_at TIMESTAMP`
- `is_active BOOLEAN DEFAULT true`
- Indexes on `agent_id` and `(is_active, expires_at)`
- No foreign keys defined in the creation code.

### Row metadata (verified via live query before outage)
- `muse`: active=true, created 2026-09-11T21:17:28.565Z, last_used_at=null, key is 67-char `pk_` format
- `muse-level-2`: active=true, created 2026-09-11T21:17:28.565Z, last_used_at=null, key is 67-char `pk_` format
- Neither row has ever been used.

### Provenance
- ONLY `exterior_auth_middleware.js` references `exterior_agent_credentials` or `MUSE_LEVEL_*` keys in the entire gateway codebase (verified via recursive search).
- Rows were created by `_seedDefaultCredentials()` on 2026-09-11.
- A `.env.muse` file exists in the gateway worktree (created 9/11/2026 9:12:07 PM) with `MUSE_LEVEL_1_KEY` and `MUSE_LEVEL_2_KEY`.
- `.env.muse` key fingerprints (SHA-256, first 16 hex): L1 `204353114b09e594...`, L2 `d6e5876baa952001...`
- The `.env.muse` was created AFTER the DB rows, suggesting it holds the current operational keys.

### Current operational keys
- The keys in the running gateway's env (used for all verified L1/L2 auth) do NOT match the DB rows (key lookup count = 0 for both).

## Dependency analysis

From code review (the middleware is the sole referencer):
- The table is ONLY used for the `authenticate()` lookup (`WHERE api_key = $1 AND is_active = true`).
- The `agent_id` values flow into `req.authenticatedAgent` for capability profile lookup.
- The `api_key` values are never used except for the lookup. Changing them has no semantic effect beyond authentication.
- **Unverified due to outage:** Whether any other table has FKs to this table, or whether other tables store these agent_ids. Code suggests no, but DB-level check is pending.

## Auth control-flow proof

From the running image's `exterior_auth_middleware.js`:

1. **PG reachable** → `initialize()` runs `_createTables()` + `_seedDefaultCredentials()`. Seeding is skipped if rows exist. In-memory map stays EMPTY.
2. **Lookup** → `SELECT ... WHERE api_key = $1 AND is_active = true` on every `authenticate()` call (no caching).
3. **Match** → expiration check, `last_used_at` update, return identity.
4. **Zero rows** → falls back to `_authenticateInMemory()`, which is empty when PG is up → 401.
5. **Env keys while PG healthy** → NEVER consulted.
6. **After DB update** → current keys authenticate immediately. A gateway recreate is needed for the new PG env vars, but the credential check itself is live per-request.

## Gateway-only alternatives considered

**None exist without code changes.** The middleware has no flag to merge env keys with PG keys, force in-memory mode, or use a different table. A code change (Phase 2 territory) would be required. Using a different/empty database would require creating it (modifying ping-postgres, forbidden) and would lose the knowledge tables.

## Recommendation

**Option A remains recommended:** Update the 2 `api_key` values to the current operational keys. The stored keys were seeded by a transient process and never used. The change is minimal and semantically safe.

**Caveat:** Re-verify FK dependencies once Docker recovers, before executing.

## Exact 2-row mutation plan (NOT EXECUTED)

**Preconditions:** Docker running, ping-postgres healthy, ping-gateway stopped.

**Precondition checks:**
1. Confirm 2 rows exist with agent_ids `muse`, `muse-level-2`.
2. Confirm no FKs reference the table.
3. Confirm operational key fingerprints.

**Mutation (single transaction):**
```sql
BEGIN;
UPDATE exterior_agent_credentials SET api_key = $1 WHERE agent_id = 'muse';
UPDATE exterior_agent_credentials SET api_key = $2 WHERE agent_id = 'muse-level-2';
SELECT agent_id FROM exterior_agent_credentials WHERE (agent_id='muse' AND api_key=$1) OR (agent_id='muse-level-2' AND api_key=$2);
COMMIT;
```
($1, $2 = current operational keys from gateway env; values never printed.)

**Post-write verification:**
1. Fingerprint check (in-DB SHA-256, no key exposure).
2. Recreate gateway with corrected PG env.
3. L1 auth test → expect success.
4. L2 auth test → expect success.
5. Logs show PG-connected (not degraded).
6. knowledge.search functional.

**Rollback:**
```sql
BEGIN;
UPDATE exterior_agent_credentials SET api_key = $orig1 WHERE agent_id = 'muse';
UPDATE exterior_agent_credentials SET api_key = $orig2 WHERE agent_id = 'muse-level-2';
COMMIT;
```
(Original values captured securely before the update.)

**Minimality proof:** Only `api_key` column, only 2 rows, no schema change, no other tables, atomic transaction.

## Remaining uncertainty

1. Docker Desktop is down; recovery time unknown; restart not authorized.
2. FK/dependency DB-level verification pending Docker recovery.
3. `.env.muse` vs DB vs container key alignment pending fingerprint comparison (needs Docker).
