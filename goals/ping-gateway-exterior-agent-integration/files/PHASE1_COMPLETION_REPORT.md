# PHASE 1 — COMPLETION REPORT

**Date:** 2026-09-12
**Status:** COMPLETE ✅

## Summary

The gateway data path is fixed. The operational L1/L2 keys now authenticate through PostgreSQL-backed credentials. The gateway connects to the real `ping_runtime` database (not degraded in-memory mode).

## Changes made (authorized)

### 1. Database: 2-row credential update (ONE transaction)

**Table:** `ping-postgres` → `ping_runtime` → `exterior_agent_credentials`

**Before fingerprints (SHA-256, for rollback):**
- `muse`: `1635135fcd858925e3ff2d410d058838de86727fc0cf8454623411a45b37cf26`
- `muse-level-2`: `460044beac11303e4cdc1d00d2c1ef73fd82098452016c580398b4d6786c879e`

**After fingerprints (SHA-256):**
- `muse`: `204353114b09e594ec2fded72494e9c10f8872fe8b13714462a8129d4dabd06b` (matches operational L1)
- `muse-level-2`: `d6e5876baa952001a0b2d12d08511f9abe2133cecdf12fa70cbdee4ca6162ce8` (matches operational L2)

**Verified:** Exactly 2 rows updated, only the `api_key` column changed. Agent IDs, names, active flags, timestamps unchanged. No schema changes.

### 2. Gateway: Recreated with correct PostgreSQL settings

**Before:**
- POSTGRES_HOST=host.docker.internal
- POSTGRES_PORT=5432 (wrong)
- POSTGRES_USER=ping_user (wrong)
- POSTGRES_DB=ping_db (wrong)
- POSTGRES_PASSWORD=(wrong/empty)

**After:**
- POSTGRES_HOST=host.docker.internal (unchanged)
- POSTGRES_PORT=5433 (correct)
- POSTGRES_USER=postgres (correct)
- POSTGRES_DB=ping_runtime (correct)
- POSTGRES_PASSWORD=(real ping-postgres password, set)

**Preserved:** Image (`curious-squid-gateway:latest`), port mapping (8080:8080), volume (`muse-workspace:/app/workspace/muse`), network (bridge), restart policy (`no`, Phase 4 will update), all other env vars.

## Verification results

| Check | Result |
|-------|--------|
| Gateway PostgreSQL connection | `PostgreSQL: CONNECTED` (not UNVAILABLE) |
| Auth middleware mode | `Initialized with Postgres backing` (not degraded) |
| L1 authentication | ✅ status: ok |
| L2 authentication | ✅ status: ok |
| knowledge.search | ✅ status: ok (reaches constitutional DB) |
| event.search | ✅ status: ok (reaches constitutional DB) |
| Durable audit | ✅ 4 capability_requests written to PG in last 10 min |
| FK dependencies | ✅ None (verified before update) |
| Unrelated rows | ✅ None modified |
| brain-postgres | ✅ Untouched |
| Canonical PING repo | ✅ Untouched |
| Schema changes | ✅ None |

## Rollback information

**Database rollback (if needed):**
```sql
BEGIN;
UPDATE exterior_agent_credentials SET api_key = '<original_muse_key>' WHERE agent_id = 'muse';
UPDATE exterior_agent_credentials SET api_key = '<original_l2_key>' WHERE agent_id = 'muse-level-2';
COMMIT;
```
Original key fingerprints are recorded above. The original key VALUES were never exposed and were not needed for the update (we overwrote them with operational keys).

**Gateway rollback (if needed):**
Recreate with the old (wrong) PG settings. The old container config was captured in `/tmp/ping-gateway-inspect-before.json` (on the investigation machine).

## Success condition met

`Muse current operational L1/L2 keys` → `exterior_agent_credentials` → `ping_runtime` → `gateway` is now one consistent authoritative path, with PostgreSQL active and no degraded credential fallback.

**Phase 1 is complete. Ready for Phase 2 authorization.**
