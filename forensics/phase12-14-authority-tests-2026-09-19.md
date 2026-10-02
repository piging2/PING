# Phases 9, 12, 13, 14: Authority-Law Test Evidence (2026-09-19)

Unit: test coverage only for Phases 9, 12, 13, 14 of the PING UNIFIED EVENT RUNTIME
CONVERGENCE order. No product code was modified in this unit. All defects below are
reported, not fixed.

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Required starting HEAD `83c6fcd29e282f4252addc67f1e3db7507b35f7c` was verified before any
mutation. During this session the branch advanced to `92a366c59` (Phase 7 producer
commits plus the previously staged CascadeProjects WIP committed as Phase 24,
`efaaf69c9`; nothing was lost). Every harness below was re-run against the final HEAD
`92a366c59` and the tallies in this document are from those runs.

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE
PROMOTION.

## New test files (committed)

Commits:
- `63638a67573d547624b5f86ac6a1f35190aed151`
  ("tests(event-authority): phase 9/12/13/14 convergence law coverage"): the four
  new test files.
- `4df1302163f28cbd173f4a06d081e2f349d8c3ea`
  ("tests(event-authority): remove em dashes from phase 9/12/13/14 test comments"):
  comment-only cleanup, no behavior change.
Verified: each commit contains exactly the four files below, nothing else; the
worktree is clean; no product code was modified.

All under `tests/event-authority-convergence/`:

- `phase9_model_b_proof.js` (B1-B8)
- `phase12_collision_duplicate_law.js` (C1-C9)
- `phase13_fanout_exactly_once.js` (F1-F8)
- `phase14_ordering.js` (O1-O6)

Each harness creates an isolated scratch PostgreSQL database on the `w1a-scratch-pg`
container (127.0.0.1:15439), runs, and drops the database on success. On failure the
database is left in place for forensics. The scratch PostgreSQL password was resolved
at runtime from the container environment and was never persisted or printed.

## Tally: new tests

| Harness | Pass | Fail | Notes |
|---|---|---|---|
| Phase 9 model-B proof | 32 | 0 | |
| Phase 12 collision/duplicate law | 49 | 1 | C9: D-1 static proof (deterministic) |
| Phase 13 fanout exactly-once | 27 | 2 | F6-STATIC and F6-RACE: D-1 (deterministic + dynamic) |
| Phase 14 ordering | 21 | 0 | |
| **New total** | **129** | **3** | All 3 failures are honest defect records for D-1 |

## Tally: baselines (all re-run at 92a366c59)

| Baseline | Result |
|---|---|
| Existing convergence invariants T0-T8 | 67 pass, 0 fail |
| W-1A invariant harness (repointed temp copy) | 18 pass, 0 fail |
| Sequence/replay certification (repointed temp copy) | 70 passed, 0 failed, 1 blocked (T5 restart; absent p0-cert-postgres container) |
| Constitutional eval (mock-based) | 82 pass, 3 fail (EVAL-006 only; pre-existing, its repair noted uncommitted in prior forensics) |

Required T5 evidence statement, verbatim:

> "70/70 functional assertions PASS. 3 restart-durability assertions BLOCKED because the certification harness references the absent p0-cert-postgres container. This is an environmental test-harness blocker. It is not evidence of product failure. It is also not evidence that restart durability passed."

Separate isolated result (prior work, not this unit): the core worker previously ran an
isolated 73/73 against a throwaway `postgres:15` container it created and removed. That
isolated result is separate from the certification record. Harness
deployment-independence is test-infrastructure work, not product-authority work. No
product code was patched for it in this unit.

## Phase 9: canonical_events consistency model (model B): PROVED

Model B: `ping_events` (via UnifiedEventRuntime.emit) is the sole authoritative commit;
`canonical_events` (via CanonicalEventEnvelope.acceptCanonicalEvent) is a derived,
rebuildable representation. Commit first, derive after; never the reverse.

- B1 proved a simulated derivation crash leaves the authoritative commit byte-intact
  and that retry with the same identity converges (no representation manufactured by
  the failed attempt).
- B2 proved invalid derivation input fails closed (`CONVERGENCE_VALIDATION_FAILED`)
  with the source commit intact and no representation row.
- B3 proved mission execution is independent of derivation: the bridge created a
  WITNESS_ATTEST mission from the UER event alone, before any representation existed,
  and later derivation created no additional mission.
- B4 proved duplicate derivation dedups (second call returns the same envelope row,
  no second dispatch, still one mission and one MISSION_CREATED).
- B5 proved rebuild at scale: after deleting 5 representations, rebuild restored 7
  rows: the 5 deleted plus 2 earlier unrepresented commits (B2's stored event, always
  valid, and B3's MISSION_CREATED). Rebuilt rows carry byte-identical identities and
  content hashes; rebuild is idempotent; `ping_events` untouched.
- B6 proved the commit-required gate: null/shapeless/failed emit results fail closed
  with NO_AUTHORITATIVE_COMMIT.
- B7 proved rebuild respects adapter convergence: a legacy row converged to canonical
  identity Y is not re-derived (exactly one canonical_events row references Y).
- B8 proved write boundaries structurally: the derivation coordinator and
  acceptCanonicalEvent contain no INSERT/UPDATE into `ping_events`; no dangling
  representations exist.

Phase 9 falsified nothing. Model B holds on every tested boundary.

## Phase 12: collision/duplicate law: PROVED except D-1

- C1 proved byte-equivalent duplicate submission is idempotent: same identity, one
  persisted sequence, one authoritative row, deterministic dedup accounting.
- C2 proved envelope duplicate derivation dedups with exactly one downstream dispatch
  and one representation row.
- C3 proved true collision (same identity, different content) fails closed at the
  representation layer: deterministic CONVERGENCE_IDENTITY_CONFLICT, no dispatch, no
  overwrite, no duplicate row.
- C4: 12 concurrent equivalent submissions plus 12 concurrent derivations converged
  to one identity, one row, one dispatch. (Note: this passed by timing luck; D-1
  below shows the same INSERT is race-unsafe. The deterministic proof is C9/F6.)
- C5: 6 concurrent conflicting submissions (3 per side) resolved deterministically:
  exactly one winner inserted, the losing side's 3 racers rejected with
  CONVERGENCE_IDENTITY_CONFLICT, the winning side's 2 losers deduped, stored content
  exactly one of the two raced contents (no merge, no overwrite), one dispatch.
- C6 proved structurally that every conflict site is preceded by an equivalence
  check: UER mints identity from content before its conflict site; the envelope
  pre-checks source_event_id plus content hash; mission idempotency keys are computed
  before ON CONFLICT; legacy receipt ON CONFLICT is confined to executeEmitEvent.
- C7 documented the layering precisely: same logical_id with drifted payload dedups
  at the UER commit layer (first commit kept, no overwrite) and fails closed at the
  representation layer. See D-2.
- C8 proved content-hash properties: deterministic, payload-sensitive, insensitive
  to sequence, timestamp, and derivation-added metadata.envelope; envelope_id is
  deterministic and distinct from the canonical event_id (standing distinction).
- C9 FAILED deterministically: see D-1.

## Phase 13: fanout exactly-once: PROVED except D-1

- F1 proved 3 duplicate bridge redeliveries plus a duplicate emit produce no
  additional WITNESS_ATTEST mission and no additional MISSION_CREATED.
- F2: 10 concurrent duplicate bridge deliveries created zero additional missions;
  MISSION_CREATED count unchanged by the race.
- F3 proved the honest boundary: duplicate worker dispatch DOES execute the worker
  twice (at-least-once delivery; totalProcessed=2), but converges to exactly one
  WITNESS_CREATED canonical row referencing the certified replay event. Worker
  exactly-once does not exist; effect exactly-once does. See D-3.
- F4: 6 concurrent witness attestations returned ok and produced exactly one
  WITNESS_CREATED row.
- F5 proved duplicate replay runs deliver the identical ordered sequence with the
  identical cursor and write nothing (read-only).
- F6 FAILED (static and race): see D-1. Every round, clean or dirty, still converged
  to exactly one representation row with exactly one downstream dispatch.
- F7 proved duplicate WITNESS_CREATED delivery creates no additional LINEAGE_CREATE
  mission.
- F8 proved a derive/rebuild race converges to one representation row with
  deterministic identities, and follow-up rebuild is a no-op.

## Phase 14: ordering: PROVED

- O1: 24 concurrent emits produced 24 unique sequences and 24 distinct identities
  (no MAX+1 race, no silent conflict).
- O2: 24 concurrent derivations each carried the commit sequence exactly (carried,
  never recomputed).
- O3: replay delivered the 24 events in strictly increasing certified sequence order
  with no loss and no duplication.
- O4: identity unaffected by allocation position (duplicate resolves to the original
  sequence).
- O5 proved structurally: the UER emit path never computes MAX(sequence)
  (allocation is the nextval DEFAULT); the only max(sequence) uses in UER are the two
  initialize-time migration steps (legacy backfill offset and post-backfill setval,
  classified LEGACY BACKFILL ORDER); derivation, adapter, and identity modules never
  compute it; the envelope's only MAX(sequence) computation is inside
  getNextSequence (retired receipt ordering), other mentions are docs and one
  authority-registration invariant string.
- O6 proved emit plus derive plus rebuild never call getNextSequence (0 calls under
  instrumentation).

## Defects (NOT fixed in this unit)

### D-1: envelope INSERT has a race-unsafe ON CONFLICT arbiter (PROVEN, deterministic + dynamic)

File: `gateway/canonical_event_envelope.js:441`
(`ON CONFLICT (event_id) DO NOTHING` in acceptCanonicalEvent).

`canonical_events` carries TWO unique constraints: PRIMARY KEY (event_id) and UNIQUE
(tenant_id, sequence), the latter a legacy receipt-ordering key. The INSERT arbitrates
only (event_id). Under concurrent derivation of the same canonical event, a loser's
INSERT can block on the winner's speculative (tenant_id, sequence) tuple; when the
winner commits, PostgreSQL attributes the conflict to the non-arbiter unique index and
raises 23505 instead of taking the DO NOTHING path.

Evidence:

- Static (deterministic): C9 and F6-STATIC introspect pg_constraint and fail because
  two unique keys exist but the arbiter covers one.
- Dynamic: F6-RACE ran 30 rounds x 12 concurrent same-event derivations; 4 spurious
  23505 errors across 3 dirty rounds (27 clean). Isolated repro: 1/10 rounds threw
  with 8 concurrent derivations; a second repro threw at round 11/60.
- Blast radius (proven): the failure mode is a spurious loud error on an idempotent
  duplicate delivery, NOT duplication. Every round, clean or dirty, converged to
  exactly one representation row with exactly one downstream dispatch.
- Contrast: `ping_events` has only PK (event_id), so the UER's ON CONFLICT (event_id)
  at `ping-runtime/events/unified_event_runtime.js:246` is race-safe (proven by
  F6-STATIC second assertion). `ping_missions` has only PK (mission_id), so
  `ping-runtime/orchestration/mission_runtime.js:81` is race-safe.

Fix direction (for a later minimal-patch unit, not this one): cover the second
arbiter (e.g. arbiterless ON CONFLICT DO NOTHING, or include (tenant_id, sequence) in
the conflict target), or remove the legacy unique key if nothing depends on it. This
unit changes no product code.

### D-2: UER dedups same-logical_id/different-payload without content comparison (DEFECT CANDIDATE, needs constitutional ruling)

File: `ping-runtime/events/unified_event_runtime.js:246`
(`ON CONFLICT (event_id) DO NOTHING` on the commit path).

Identity is minted from logical_id (C-007 design), so the same logical_id with a
different payload yields the same event_id. The second emit is treated as an
idempotent duplicate: first row kept (no overwrite), result reports deduplicated,
handlers still dispatched. No content comparison, no closed failure, no dispatch
suppression at this layer. The representation layer DOES fail closed on the drift
(C3/C7 prove CONVERGENCE_IDENTITY_CONFLICT at
`gateway/canonical_event_envelope.js`).

Whether the collision law ("same event ID plus different canonical content must fail
closed") applies at the UER commit layer or only at the representation-certification
layer is an open constitutional decision for a later unit. This unit documents the
exact behavior at both layers and does not rule on it. Not fixed.

Related observation: `MissionRuntime.create()` at
`ping-runtime/orchestration/mission_runtime.js:81` uses the same identity-first
pattern (deterministic mission_id plus bare ON CONFLICT DO NOTHING). One mission per
trigger is proven (F1/F2); the content-drift question under a repeated mission_id
inherits D-2's open decision. Not fixed.

### D-3: worker execution is at-least-once, not exactly-once (DOCUMENTED ARCHITECTURAL TRUTH, not a defect to fix)

File: `ping-runtime/workers/worker_runtime.js:69` (`async dispatch(event)` calls
`worker.handle(event)` unconditionally).

F3 proves duplicate dispatch executes the worker twice. Exactly-once exists at the
effect layer (one WITNESS_CREATED row via UER identity dedup), never at the execution
layer. Any claim that "duplicate delivery does not produce two worker executions"
is false against this code; the true claim is "duplicate delivery does not produce
two canonical effects." Worker handlers must remain idempotent at the effect level.
Not a defect; recorded so no later claim overstates it.

## Concurrency parameters used

- C4: 12 concurrent UER emits + 12 concurrent envelope derivations, same logical event.
- C5: 6 concurrent envelope derivations, 3 per conflicting content variant.
- F2: 10 concurrent EventToMissionBridge redeliveries.
- F4: 6 concurrent WitnessWorker attestations.
- F6-RACE: 30 rounds x 12 concurrent deriveRepresentationAfterCommit (360 derivations).
- F8: 1 derivation racing 1 rebuildMissingRepresentations on the same commit.
- O1/O2: 24 concurrent UER emits, then 24 concurrent derivations.
- B5: 5-event delete/rebuild (7 rows restored including 2 earlier unrepresented commits).

## Statement of non-mutation

This unit added four test files under `tests/event-authority-convergence/` and
modified no product code, no schemas, no migrations, and no existing tests. Defects
D-1, D-2, and the D-2-related mission observation are intentionally left for later
minimal-patch units. D-3 is architectural truth to preserve, not a defect to fix.
