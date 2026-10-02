# AUDIT UPDATE CLAIM — INVENTORY (corrected language)
2026-10-01. Inspected both lines; no file modified.

## Corrected claim (use this wording in all audit language)

> No UPDATE in the normal append/write path was found; one initializer
> UPDATE exists for historical tenant backfill
> (ping-runtime/events/unified_event_runtime.js:142).

## Evidence

**Integrated line** (`/home/nolan/ping/ping-runtime/events/unified_event_runtime.js`):
- `grep -ci UPDATE` = 1. The single hit is line 142, inside `initialize()`:
  `UPDATE ping_events SET tenant_id = 'UNKNOWN' WHERE tenant_id IS NULL;`
- Context (lines 120-145): the statement sits in the DDL/bootstrap block —
  `CREATE TABLE IF NOT EXISTS ping_events`, `ADD COLUMN IF NOT EXISTS
  tenant_id`, then the backfill, then `ALTER COLUMN tenant_id SET DEFAULT
  'UNKNOWN'`. It runs at startup, not per-emit.
- The file's own comment: "Lane L: historical backfill is EXACTLY
  'UNKNOWN'. Never infer tenant from namespace; namespace is not a
  trusted execution context."
- Idempotency: the statement is a pure backfill — re-running it changes
  nothing once all rows have a tenant_id (the WHERE clause no longer
  matches). It does not touch event_id, payload, or metadata.
- The write path (`emit()`, line ~290): single
  `INSERT ... VALUES (...) ON CONFLICT (event_id) DO NOTHING`. No UPDATE,
  no upsert, no read-modify-write.

**Deployed line** (image `ping-gateway:security-p0-20261001`, extracted to
/tmp/deployed-uer.js for inspection):
- `grep -ci UPDATE` = 2, but the second hit (line 198) is
  `crypto.createHash('sha256').update(...)` — a Node crypto call, not SQL.
- Exactly one SQL UPDATE: line 138, the same initializer backfill.
- Write path (line ~283): the same single
  `INSERT ... ON CONFLICT (event_id) DO NOTHING`.

## Why it matters for P0-A

The backfill UPDATE is tenant-labeling on rows that predate the
`tenant_id` column; it cannot change an event's identity, payload, or
canonical bytes. It is therefore out of scope for the serializer fix and
for the conflict-semantics protocol (which keys on event_id). It is
inventoried here — not removed, not altered — because an earlier audit
claimed "zero UPDATE on ping_events" without the initializer scoping,
and precision matters when the claim is about write-path integrity.
