# Effect Class 03: Database Mutation

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `/home/nolan/ping/adapters/postgres_adapter.js` (lines 40-60),
`gateway/canonical_event_envelope.js` (lines 72-105, 174-178),
`gateway/filesystem_authority.js:300`, `gateway/git_persistence_backend.js`,
`ping-runtime/runtime/deployment_registry.js:77`, `database/events.sql`,
`database/canonical_events.sql`, `database/ping_objects.sql`,
`database/fix_pipeline_blockers.sql:28-38`, `gateway/event_outbox.js`,
`ping-runtime/events/unified_event_runtime.js:73/224`,
`adapters/qdrant_adapter.js`, `adapters/redis_adapter.js`,
`/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs`,
`/home/nolan/projects/ping/src/fyd/customize/server.ts`,
`/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/route.ts`.

## Who writes rows

`adapters/postgres_adapter.js`: `save()` = raw `INSERT` with **no ON
CONFLICT** (lines 40-60); `load/query/update/delete` are plain CRUD. Real
idempotency lives in four specialized sites:
1. `gateway/canonical_event_envelope.js:174-178` — `INSERT INTO
   canonical_events ... ON CONFLICT (tenant_id, sequence) DO NOTHING`;
   `event_id` = deterministic UUID v5 from `(tenant_id, event_type,
   timestamp, sequence)` (lines 72-88); sequence = `SELECT
   COALESCE(MAX(sequence),0)+1` per tenant (lines 95-105). Schema:
   `canonical_events.event_id UUID PRIMARY KEY`, `UNIQUE (tenant_id,
   sequence)` (`database/canonical_events.sql:4-42`).
2. `gateway/filesystem_authority.js:300` — `ON CONFLICT (repo_id) DO UPDATE`.
3. `gateway/git_persistence_backend.js` — `ON CONFLICT (commit_id) DO UPDATE`.
4. `ping-runtime/runtime/deployment_registry.js:77` — `ON CONFLICT
   (tenant_id, version) DO UPDATE` on register.
Append-only protections: `database/events.sql` has `prevent_event_updates` /
`prevent_event_deletes` triggers on `events`; `database/ping_objects.sql`
has the same on `ping_transitions`. Note: plain `events` has BIGSERIAL PK
only — NO event-identity unique constraint; duplicate emits would duplicate
rows there.
Tracking tables: `event_processing` (`event_id PK, processed, worker,
retries, last_error` — `fix_pipeline_blockers.sql:28-38`; the gateway
pipeline writes to `repository_events`, not `events` — FK deliberately not
applied). `gateway/event_outbox.js`: transactional `write()`,
immediate+durable `publish()`, sweeper with 5-attempt cap,
`getUnpublishedEvents`, `getFailedEvents`, `retryFailedEvent`, and
**`cleanOldEvents(7)` which DELETES published outbox rows older than 7
days** — a reconciliation-evidence TTL. No inbox table exists anywhere.
`UnifiedEventRuntime.emit/query`
(`ping-runtime/events/unified_event_runtime.js:73/224`) is the
accept/query interface. Qdrant: `adapters/qdrant_adapter.js` `upsert()` =
HTTP `PUT /collections/{name}/points` — Qdrant upsert is natively idempotent
per point ID, but the adapter sends no key and assigns no deterministic point
IDs itself. Redis: `adapters/redis_adapter.js` `set()` = last-writer-wins,
TTL-optional, no history.
**Doc-fiction warning:** `gateway/IDEMPOTENCY_IMPLEMENTATION.md` describes an
`IdempotencyManager` (`idempotency_keys` table, `executeIdempotent`), but no
implementation file exists and no caller references it — that design is
UNIMPLEMENTED. Consolidate on the real mechanisms, not the doc.

## FYD journal writes (the live effect path for owner customization)

- **SitePatch approve** (`src/fyd/customize/server.ts:emitOverlayEvent`):
  POST one `FYD_SITE_OVERLAY` event to the demo journal
  (`http://127.0.0.1:18199/events`). The directive id IS deterministic:
  `"pi-" + sha256(siteId + "|" + proposalDigest)[0:16]`. BUT the journal
  gateway mints the accepted `event_id` as
  `fyd-ovl-<time36>-<random>` (`tools/fyd-journal-gateway/server.mjs:73-76`)
  — RANDOM, NO DEDUP. A retried emit = a DUPLICATE `FYD_SITE_OVERLAY` event
  in the journal. Whether the projection dedups by intentId is UNVERIFIED.
  Fail-closed on the write side: the function throws on non-OK/rejection
  ("an unrecorded approval is never reported as recorded") — but a
  timeout-AFTER-accept still creates the duplicate.
- **Owner overrides** (`src/app/api/fyd/objects/[objectId]/overrides/route.ts`):
  `applyOwnerCommand` appends ONE provenance-backed event to the object's
  log; the read model re-projects from the log. Approval is DIGEST-BOUND:
  after the first apply the base digests move, so a blind retry 409s with
  stale-digest — a natural dedup guard. Presentation-tier commands get a
  pre-bound inverse (undo); factual changes supersede via newer assertions.

- **Q1 Identity:** MIXED. Strongest: `canonical_events` — deterministic UUID
  v5 + `UNIQUE (tenant_id, sequence)` + `ON CONFLICT DO NOTHING`. Weakest:
  generic `postgres_adapter.save()` (no key, no conflict handling) and the
  unimplemented `IdempotencyManager`. FYD journal: deterministic intentId
  on the envelope, random event_id on acceptance (split identity).
  CAVEAT: timestamp inside the UUID v5 means a redispatch at a new timestamp
  mints a NEW event_id; the DB-level guard is `(tenant_id, sequence)`, and
  the sequence comes from a racy read-modify-write (`MAX+1`).
- **Q2 Provider idempotency key:** no native driver/HTTP key support.
  Implemented equivalents are the four per-table `ON CONFLICT` clauses
  above; `idempotency_keys` is designed but unimplemented.
- **Q3 Queryable:** YES, excellent. `canonical_events` (by event_id, tenant,
  sequence, correlation/causation), `event_outbox` (published,
  publish_attempts), `event_processing` (processed, worker, retries,
  last_error), append-only triggers as a backstop against silent mutation.
- **Q4 Reconcile:** Probe = `SELECT` by event_id or natural key;
  `event_processing.processed` + `worker`; outbox published flag;
  `retryFailedEvent(outboxId)` exists. The event_id is re-derivable from
  `(tenant_id, event_type, timestamp, sequence)` if the original inputs are
  known. PROBE GAP: no code path today re-derives the UUID from a partial
  attempt (the timestamp must be recovered from the attempt record). FYD
  journal probe: query journal events for an existing `FYD_SITE_OVERLAY`
  with the same intentId — BUILDABLE, unbuilt.
- **Q5 Reversible:** `canonical_events`/`events`/`ping_transitions` are
  effectively irreversible (append-only triggers); correction only via
  compensating events. Projections (`ping_objects`), Qdrant
  (delete/re-upsert by point ID), Redis (overwrite) are reversible/mutable.
- **Q6 UNKNOWN means:** the write-then-publish split makes this the sharpest
  class. A crash between `INSERT` and outbox-publish leaves a
  present-but-unpublished row; a crash mid-insert leaves nothing. Re-insert
  is DB-safe for `canonical_events` (`DO NOTHING`) but **silently keeps the
  FIRST payload** — if the retry's payload differs, divergence is MASKED,
  not resolved. Plus `cleanOldEvents(7)` deletes outbox evidence for old
  attempts. FYD journal: a timeout-after-accept leaves a duplicate overlay
  event (projection behavior on duplicates unverified).
- **Q7 Retry safe:** when the INSERT carries the full deterministic identity
  (same event_id, or same `(tenant_id, sequence)`) with `ON CONFLICT DO
  NOTHING`/`DO UPDATE` AND the payload is byte-identical to the first attempt
  (or the conflict clause compares/merges); or a pre-check `SELECT` on the
  natural key finds no row while a unique constraint covers the logical key.
  NOT safe today through generic `postgres_adapter.save()` — retry there
  duplicates. FYD journal: retry safe only after the intentId probe, or when
  the projection is proven intentId-idempotent.
- **Q8 HOLD:** when the write path lacks an `ON CONFLICT` target covering the
  logical operation (generic save); when the retry's payload may differ from
  the first attempt's (`DO NOTHING` would mask divergence — compare payloads
  first); when the sequence was assigned via the racy `MAX+1` (re-read before
  assigning); or when downstream consumers already acted on the first row
  (reconcile via compensating event, never re-insert).

Confidence: HIGH on mechanisms (code-read); MEDIUM-HIGH on reconcile probes
(one buildable gap: UUID re-derivation from partial attempts).

## Port guidance

Timestamp-in-identity is the recurring anti-pattern (UUID v5 includes
timestamp; the FYD journal acceptance id is random). The port's stable
idempotency key must be supplied by the CALLER (mission/run/attempt-derived)
and carried through as the natural key with a UNIQUE constraint — not minted
at write time. Give the FYD journal a dedup on intentId (or prove the
projection already dedups). Do not implement the doc-only IdempotencyManager
as a second authority; promote the existing ON CONFLICT sites into one
registry view.
