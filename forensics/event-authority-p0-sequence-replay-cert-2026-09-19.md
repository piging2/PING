# Event Authority P0 Certification: Canonical Sequence + Boring Replay

Date: 2026-09-19. Branch: `constitutional-convergence-v2` (worktree
`/home/nolan/worktrees/constitutional-convergence`).
Authorization: Nolan's bounded Event Authority certification unit, 2026-09-18.
Scope: exactly two capabilities added to the proven `UnifiedEventRuntime`
authority: (1) PostgreSQL-assigned global event sequence, (2) deterministic
read-only replay over committed `ping_events` rows. No architecture reopened.

## Ordering contract (authorized 2026-09-18, unchanged)

The sequence certifies ONLY database allocation position. It does NOT certify
gaplessness, transaction commit order, wall-clock chronology, causal order,
business order, or distributed consensus order. Sequence is storage metadata;
it never enters event identity or canonical hashing. Gaps are valid around
conflicts and rollbacks; tests never require consecutive values.

Replay means: read committed canonical rows, order by sequence ascending,
optional `sequence > cursor`, bounded count, deliver each row to an explicitly
supplied consumer. Replay does NOT re-execute the pipeline, send messages,
reinvoke agents, create missions, call external APIs, mint replay IDs, mark
rows processed, or write to another store.

## Change (exact)

Single file modified: `ping-runtime/events/unified_event_runtime.js`.

1. `initialize()` migration (idempotent, additive):
   - `ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS sequence BIGINT`
   - `CREATE SEQUENCE IF NOT EXISTS ping_events_sequence_seq`,
     `OWNED BY ping_events.sequence`, column DEFAULT `nextval(...)`.
   - Backfill: legacy NULL rows get `row_number() OVER (ORDER BY timestamp,
     event_id)` offset by current max. Classified LEGACY BACKFILL ORDER, not
     proven historical execution order. Only NULL rows touched.
   - `setval` with three-argument form: empty table -> next allocation 1,
     else max(sequence)+1. (A first implementation used two-argument
     `setval(s, 0)` on empty tables and failed live with
     `setval: value 0 is out of bounds`; fixed before certification.)
   - `CREATE UNIQUE INDEX IF NOT EXISTS idx_ping_events_sequence`;
     column set NOT NULL after backfill.
2. `emit()` persist path (the single existing INSERT, unchanged otherwise):
   - `... ON CONFLICT (event_id) DO NOTHING RETURNING sequence`.
   - On insert: sequence read defensively from `RETURNING` (mock pools in evals
     return no rows; access is guarded).
   - On conflict: re-SELECTs the existing row's sequence so the caller observes
     the ONE persisted position, never a phantom second allocation.
   - `event.sequence` set after persistence; `emit()` returns `{ status,
     eventId, event, sequence }`. Identity minting (step 4) still precedes
     persistence (step 6); `identityData = { event_type, source, namespace,
     logical_id|payload }` contains no sequence key.
3. New `replay({ afterSequence = 0, limit = 100 (clamped 1..10000), consumer })`:
   `SELECT ... FROM ping_events WHERE sequence > $1 ORDER BY sequence ASC
   LIMIT $2`. Consumer delivery is in-order, stops at the first consumer error
   (reported with cursor, not thrown). Read-only: zero canonical writes.

Nothing else touched. No second table, no second writer, no alternate append
path, no dispatcher, no consumer-offset system. The dormant/out-of-scope list
(EventRepository, GET /events/:stream, POST /events/processed, POST
/events/failed, repository_events, event_processing, IEventAuthority,
ConstitutionalEventStore) was not modified.

## Empirical evidence [EMPR]

Harness: `tests/event-sequence-replay/sequence_replay_cert.js` (self-contained;
creates its own scratch database, drops it afterwards). Live PostgreSQL 15 in
a dedicated scratch container (`p0-cert-postgres`, port 5434, named volume),
never the canonical store. All emits enter through
`UnifiedEventRuntime.emit()`.

2026-09-19 final run: **73 passed, 0 failed, 0 blocked** (exit 0).

- T1 migration: old-schema table + 5 identical-timestamp legacy rows ->
  initialize() preserves 5/5 rows, payloads intact, backfill assigns unique
  strictly increasing sequences 1..5 in (timestamp, event_id) order; next emit
  continues at 6.
- T2: two emits, timestamps forced identical -> replay still returns emission
  order by sequence.
- T3: duplicate emit -> same event_id, same sequence, exactly one row,
  deduplicated counted; next fresh emit monotonic (gaps tolerated, never
  asserted absent).
- T4: 5-event replay from beginning in order; limit 2 respected; cursor
  `sequence > N` returns exactly the tail; repeated replay byte-equivalent.
- T5: fresh client + runtime reinit preserves event_id, sequence, payload;
  real `docker restart` of the container preserves all three byte-identical
  and replay order identical.
- T6: 20 concurrent emits -> 20 unique sequences, canonical `event_<16hex>`
  IDs, replay strictly increasing.
- T7: empty replay -> ok, count 0, lastSequence 0, consumer never called.
- T8: single-event replay; cursor at its sequence -> empty.
- T9: consumer receives 3 in order; throwing consumer fails fast with
  delivered=1 and cursor at last delivered sequence; row count and table list
  unchanged (replay writes nothing).
- T10: same logical_id with different payloads -> same event_id; stored
  payload/metadata contain no `sequence` key; static check: identity preimage
  has no sequence, identity minted before sequence assignment.
- T11: scratch DB contains exactly one table (`ping_events`); exactly one
  canonical INSERT path in the runtime; falsification patterns absent from the
  canonical path (see classifications below).

Eval suite (mock-based, pre-existing): 85/85, 9 scenarios, still green with the
change. EVAL-006's uncommitted repair untouched.

Defects found by the harness during development (all fixed, none in shipped
code): (a) two-argument `setval(s, 0)` out-of-bounds on empty tables ->
three-argument form; (b) harness pool lifecycle bugs (idle-client error
handler, T5 pool ownership); (c) two over-broad test assertions (T10 slice
bounds, T11 MAX pattern scoping) -> corrected to precise checks. Product code
was changed once, for (a).

## Static findings [STAT]

- Writer audit (repo-wide, excl. node_modules/tests/evals): exactly one live
  `INSERT INTO ping_events`: `UnifiedEventRuntime.emit()`. Unchanged.
- Reader audit: new readers are `replay()` and the duplicate re-select inside
  `emit()`; pre-existing readers (`query()`, lineage methods, evidence
  authority, mission runtime correlation reads) untouched. `EventBridge`
  remains PRESERVED_INACTIVE.
- Falsification classifications:
  - `gateway/canonical_event_envelope.js:102`
    (`SELECT COALESCE(MAX(sequence), 0) + 1 ... FROM canonical_events`):
    LEGACY_KNOWN_WEAKNESS. Pre-existing race-prone pattern on the legacy
    `canonical_events` ingress surface; does not touch `ping_events`, not
    used by the canonical path, not certified, not modified.
  - `gateway/constitutional_event_sourcing.js:144`
    (`MAX(sequence_number)` on `constitutional_events` + in-memory map):
    CONDITIONAL_DORMANT (constructed only when
    `runtime_config.enable_event_sourcing`); does not touch `ping_events`,
    not modified.
  - `gateway/test_*.js` `sql.includes('INSERT INTO ping_events')` hits: mock
    SQL matchers in test doubles, not writers.
  - The only `max(sequence)` reads in the canonical path are `initialize()`
    migration bookkeeping (backfill offset, setval high-water mark); the emit
    persist path contains no MAX aggregation.
- No `EventAuthorityV2`, `ReplayEventStore`, `SequenceAuthority`, second event
  table, alternate append path, dispatcher, or generalized offset system was
  introduced.

## Not claimed

Perfect ordering, exact historical order, gapless sequence, commit-order
semantics, consumer idempotence, full deterministic re-execution. The migration
backfill order for legacy rows is the strongest stable storage evidence
available, explicitly not a certified historical execution order.

## Repro

Provision any PostgreSQL 13+ reachable at PGHOST/PGPORT, set PGADMIN_USER /
PGADMIN_PASSWORD, run from the worktree:
`node tests/event-sequence-replay/sequence_replay_cert.js`.
The harness creates and drops its own database; no credentials are stored.
Expected: `RESULT: 73 passed, 0 failed, 0 blocked` and exit 0.
