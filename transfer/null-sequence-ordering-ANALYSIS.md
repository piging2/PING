# NULL-Sequence Ordering Analysis

Lane: NULL-sequence projection ordering analysis. Analysis only. No repo writes, no Oracle mutations, no events emitted.
Date: 2026-09-20 (MDT). Repo: /home/nolan/ping @ d3ad88c39 (refactor/runtime-authority-convergence). Oracle: live, ping-gateway:candidate-84486f056.

## 1. Observed facts (live Oracle, read-only queries)

Live `ping_events` schema (relevant columns):
- `event_id varchar NOT NULL` (PK, no duplicates across 2,530 rows)
- `event_type varchar NOT NULL`
- `timestamp timestamptz NOT NULL DEFAULT now()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `sequence bigint NULL DEFAULT nextval('ping_events_sequence_seq'::regclass)`

Counts:
- Total rows: 2,530. With sequence: 61. NULL sequence: 2,469.
- Sequence range: 1 to 64. Missing numbers: 8, 44, 45 (nextval consumption gaps, e.g. rolled-back accepts; normal, not ordering evidence).

Time split (created_at):
- NULL rows: 2026-09-15T15:33:12.360Z to 2026-09-20T01:11:27.849Z
- Sequenced rows: 2026-09-20T01:49:41.299Z to 2026-09-21T01:50:51.248Z
- All NULL rows strictly precede all sequenced rows in created_at (~38-minute gap). Consistent with the `sequence` column being added after 2026-09-20T01:11Z, with the nextval default applying only to new inserts.

NULL-row event types (top): MISSION_STARTED/ASSIGNED/CREATED/COMPLETED (475/475/475/473), REPLAY_COMPLETED/WITNESS_CREATED/LINEAGE_CREATED (68 each), PROJECTION_CREATED (61), CLAIM_CREATED/CLASSIFICATION_CREATED/OBSERVATION_CREATED/RECOMMENDATION_CREATED (58 each), SYSTEM_HEALTH_CHECK (14), ENTITY_CREATED (9), TASK_STARTED (6), SNIPPET_APPROVED (5), REPLAY_VERIFY (5), LEAD_CREATED/EVIDENCE_RECORDED/CUSTOMER_CREATED/TASK_COMPLETED/TASK_FAILED (3 each), PROJECT_CREATED/REVIEW_RECEIVED (2 each).

Ordering-key candidates:
- `created_at`: UNIQUE across all 2,530 rows (zero duplicate groups). True total order, no ties.
- `timestamp`: also UNIQUE across all rows (zero duplicate groups).
- `event_id`: unique but random, carries no order.
- Minimum created_at gap among NULL rows: sub-millisecond (rounds to 0.0 ms; no actual ties). Median gap: 3.79 ms.

Ground-truth check (the 61 sequenced rows): ordering by `sequence ASC` vs `created_at ASC` agrees 100 percent. Zero inversions. In this deployment, created_at is a faithful proxy for the authoritative acceptance order (the PostgreSQL sequence) on the segment where both exist.

## 2. What the projector actually consumes

`runtime/constitutional/src/ping-projector.ts` (Patch 7B) consumes exactly three registered types:
- OBJECT_CREATED, OBJECT_UPDATED, RELATIONSHIP_CREATED. Legacy unregistered ping.create / ping.relate are rejected.

Live journal rows of these types:
- OBJECT_CREATED: 11 rows, all sequenced (47-64). NULL: 0.
- RELATIONSHIP_CREATED: 7 rows, all sequenced (54-63). NULL: 0.
- OBJECT_UPDATED: 0 rows total.

So there are ZERO NULL-sequence rows of any type the projector consumes.

Projector ordering behavior:
- rebuildObjects: `ORDER BY pe.sequence ASC NULLS LAST`, `ON CONFLICT (object_id) DO NOTHING` (first in acceptance order wins).
- rebuildRelationships: `DISTINCT ON (subject, predicate, object) ... ORDER BY subject, predicate, object, pe.sequence DESC NULLS LAST` (last in acceptance order wins).
- Comment at line 233: "NULL sequences (unknown acceptance order) sort after known ones."

Latent nondeterminism (cannot trigger today, matters for future NULL consumption): none of the three ORDER BY clauses has a tiebreaker after `sequence`. Two rows sharing the same conflict key (same object_id, or same subject/predicate/object) with BOTH sequences NULL would resolve arbitrarily (first-wins and last-wins become physical-order dependent). The current code is deterministic only because NULL rows of consumed types do not exist.

Live projection tables: `ping_objects`, `ping_relationships`, `ping_transitions` do NOT exist on the live Oracle (to_regclass returns null). Creating them is additive; there is no existing derived state to corrupt. The schema uses `CREATE TABLE IF NOT EXISTS`. The triggers in ping_objects.sql are append-only guards on ping_transitions (prevent UPDATE/DELETE); they do not fire on INSERT or TRUNCATE, so they do not conflict with a fresh populate.

## 3. Verdict

(a) SAFE TO PROCEED with the live Oracle social projection build, scoped as follows:

1. For the rebuild actually needed (PingProjector over OBJECT_CREATED / OBJECT_UPDATED / RELATIONSHIP_CREATED), no NULL-sequence ordering contract is required. All 18 consumed rows have real sequences; the NULL rows (2,469) are of types no projector consumes and cannot affect ping_objects / ping_relationships / ping_transitions.
2. Table creation on the live Oracle is additive, not a rebuild over existing state. Populate via the governed projector, then verify the result matches Lane A's proven snapshot digest (181efeaa837b4cce: 11 objects, 6 relationships, 18 transitions, 0 conflicts).

(b) For future projectors that consume NULL-bearing types (ENTITY_CREATED, OBSERVATION_CREATED, MISSION_*, etc.), the recommended NULL ordering contract as policy is:

`(sequence ASC NULLS LAST, created_at ASC, event_id ASC)`

Evidence it is deterministic: created_at is a total order (no ties over 2,530 rows); event_id is the final unique tiebreaker. Evidence it approximates acceptance order: 100 percent agreement with the authoritative sequence on the 61-row ground-truth segment; strict NULL-before-sequenced split in created_at.

Explicit caveat (why this is policy, not constitutional proof): created_at is an insert-time proxy (now() default), not the standing acceptance authority (the PostgreSQL sequence is). For the NULL segment there is no ground truth to verify against. The Sept 13 degraded in-memory window (R3, 7 events lost) means some inserts' created_at could in principle invert true acceptance order; this is unfalsifiable from available evidence. Do not present the NULL contract as proven acceptance order. Present it as the best available deterministic total order.

Required code change before any NULL-bearing type is consumed by a projector: add the tiebreaker to the three ORDER BY clauses in ping-projector.ts (rebuildObjects INSERT...SELECT, rebuildObjects OBJECT_UPDATED select, rebuildRelationships). Without it, duplicate-key NULL pairs resolve arbitrarily.

## 4. Fail-before test sketch (next lane implements; throwaway postgres only)

Setup: `docker run --rm postgres:17-alpine`, init ping_objects.sql schema, synthetic ping_events containing:
- sequenced OBJECT_CREATED / RELATIONSHIP_CREATED rows (control),
- NULL-sequence rows of consumed types with known distinct created_at values,
- duplicate-key NULL pairs: two OBJECT_CREATED with the same object_id but different content, both sequence NULL, different created_at; same for RELATIONSHIP_CREATED (subject/predicate/object key).

Fail-before assertions (must FAIL on current code):
1. Insert duplicate-key NULL pair in physical order A,B; rebuild; record which row won. Drop tables, re-init, insert in order B,A; rebuild. The winners differ (or are at least not provably stable), demonstrating the missing-tiebreaker gap.
2. Assert rebuild digest is NOT stable across the two physical orders for the NULL-pair case.

Then implement the tiebreaker (`pe.sequence ASC NULLS LAST, pe.created_at ASC, pe.event_id ASC`; for relationships `pe.sequence DESC NULLS LAST, pe.created_at DESC, pe.event_id DESC` to preserve last-wins semantics) and assert:
3. Both physical orders now produce identical projection digests (determinism proven).
4. The NULL row with the later created_at wins the duplicate-key pair (contract behavior proven).
5. NULL rows of non-consumed types (e.g. MISSION_STARTED) leave projection digests unchanged (exclusion proven).

Only after 3-5 pass: create the projection tables on the live Oracle (additive), populate via the governed projector, and verify 11 objects / 6 relationships / 18 transitions match digest 181efeaa837b4cce. Live Oracle projection tables stay untouched until the tests pass.

## 5. What this analysis did not do

No repo writes. No Oracle mutations (read-only SELECTs and information_schema only; credentials resolved inside the gateway container env, never printed or persisted). No events emitted. No secrets exposed (one prior open item, FL-20260920-022, remains Nolan's explicit decision and is untouched).
