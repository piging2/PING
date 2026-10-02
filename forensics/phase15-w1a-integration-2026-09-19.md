# Phase 15 W-1A Integration Gate: converged tree (2026-09-19)

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`
Pre-unit HEAD: `114afad01` (verified, never assumed; matches expectation)
Post-unit HEAD: `66c775d0b` ("tests(event-authority): Phase 15 revise stale C9/F6-STATIC to preserved-law intent")
Worktree: clean. Test-only changes only; zero product-code changes in this unit.

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION.
Git safety: explicit staging of the two test files only. No add -A, no reset, no clean, no history rewrite.

## C9 / F6-STATIC revision rationale

The old C9 (phase 12) and F6-STATIC (phase 13) were static oracles pinned to a
REMOVAL repair: they demanded `canonical_events` carry exactly one unique key,
i.e. that the legacy UNIQUE (tenant_id, sequence) key be deleted so that
ON CONFLICT (event_id) would cover every unique key. The preservation law
forbids that deletion, and D-1 (commit `bff7eb740`, live) repaired the live
race the other way: the derivation INSERT keeps `ON CONFLICT (event_id) DO
NOTHING` but now absorbs a 23505 from the preserved legacy key into the same
deterministic equivalence path (bounded one-retry, fail-closed with
CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED, no overwrite, no redispatch).
The live race the old oracles guarded (F6-RACE) is proven fixed.

The revised tests pin the preserved-law intent and are NOT vacuous:

- C9 (now 5 checks): (1) canonical_events carries exactly two unique keys,
  the event_id PK plus the preserved legacy key (FAILS if the key is
  removed: preservation-law violation); (2) the preserved unique key still
  covers (tenant_id, sequence) via pg_get_constraintdef (FAILS on
  drift); (3) the envelope source contains the D-1 23505 absorb guard
  `err && err.code === '23505'` (FAILS if the absorb path is deleted, which
  is exactly the regression the old C9 guarded); (4) the absorbed conflict
  re-enters the deterministic equivalence path with the bounded fail-closed
  retry (`_conflictRetry` + `CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED`
  present); (5) the derivation INSERT still arbitrates
  `ON CONFLICT (event_id) DO NOTHING`.
- F6-STATIC (now 4 checks): the same two-key/legacy-key/ absorb-guard
  assertions, plus the retained ping_events single-PK arbiter check
  (unchanged, still valid). The F6-RACE dynamic probe (30 rounds x 12
  concurrent same-event derivations) is untouched and proves the
  absorption live: 0 spurious 23505, one representation row per round,
  exactly one downstream dispatch per round.

Non-vacuity proof: each revised static assertion names a concrete artifact
that must exist (legacy key in pg_constraint, absorb tokens in
gateway/canonical_event_envelope.js). Deleting either artifact turns the
check red. The checks assert what IS, not what is absent.

## Full Phase 15 battery, final tree (commit 66c775d0b content)

Scratch PostgreSQL `w1a-scratch-pg` on 127.0.0.1:15439; credentials resolved
at runtime from the container environment (never printed or persisted).
Where a harness hardcoded a foreign tree path, a byte-exact temp copy with
the path repointed to this worktree was used; the product tree was never
mutated. EVAL-010 was invoked via its exported `run()` (it ships no main
runner; bare `node` execution is vacuous).

| Suite | Result | Note |
|---|---|---|
| W-1A invariant harness (repointed to this worktree) | 18 pass, 0 fail | reproduces the 18/0 method from the isolated-tree runs |
| convergence invariants | 67 pass, 0 fail | baseline met |
| phase 7 producer migration | 50 pass, 0 fail | baseline met |
| phase 9 model-B proof | 32 pass, 0 fail | baseline met |
| phase 12 collision/duplicate law | 54 pass, 0 fail | 49 prior + 5 revised C9 checks; the stale oracle is gone |
| phase 13 fanout exactly-once | 31 pass, 0 fail | revised F6-STATIC (4 checks); F6-RACE green as before |
| phase 14 ordering | 21 pass, 0 fail | baseline met |
| constitutional eval (EVAL-001..009, mock) | 82 pass, 3 fail | the 3 are the pre-existing EVAL-006 failures (1/4: mission is running / mission completed / result not overwritten); repair lives as uncommitted WIP in the dirty worktree and was NOT touched |
| EVAL-010 witness failure honesty | 34 pass, 0 fail | baseline met (via run(); note the vacuous-run pitfall above) |
| sequence/replay cert (repointed temp copy, RUNTIME_PATH -> this worktree) | 70 pass, 0 fail, 1 blocked | T5 restart-durability blocked (environmental; verbatim statement below) |
| witness negative-path (gateway/test_witness_negpath.js) | 9 pass, 0 fail | baseline met |
| mission spoofing negative tests (W-1A fabrication-route closures) | all pass | T1 forged REPLAY_VERIFY mission (zero WITNESS_CREATED, zero worker dispatch), T1b forged dispatch with no canonical row (zero WITNESS_CREATED + observable WITNESS_REJECTED no_canonical_replay_event), T3 envelope/canonical mismatch (zero attestations + observable unverified_replay reason), T5 attacker-supplied envelope root ignored (canonical root bound) |

Total: 463 pass, 3 pre-existing fails (EVAL-006, unchanged), 1 environmental block.

## W-1A coherence check (converged tree)

(a) WITNESS_ATTEST path resolves against the authoritative journal. PASS.
`WitnessWorker._readCanonicalReplayEvent` (ping-runtime/workers/canonical_workers.js,
~L496) SELECTs the canonical REPLAY_COMPLETED row from `ping_events` by
event_id. `handle()` only proceeds when the row exists, the type is
REPLAY_COMPLETED, and the canonical payload's replay is verified:true; the
attested `witness_root` is read from the canonical row, never from the
dispatch envelope. WITNESS_CREATED is emitted via the worker `_emit` path
into UER (the authoritative journal). The bridge still maps canonical
REPLAY_COMPLETED to exactly one WITNESS_ATTEST mission (phase 13 F1 live).

(b) No second witness-relevant write path opened by the convergence changes.
PASS. Product-code WITNESS_CREATED writers remain: canonical_workers.js
(the authenticating path), event_governance.js (payload schema), and
event_to_mission_bridge.js (mission mapping). The converged envelope and
derivation files contain no emit and no INSERT into ping_events for witness
types; convergence_derivation.js requires a pre-existing successful
UER emit and refuses to derive otherwise. The `_attestFromEnvelope` seam
is a documented unit-test contract (used by EVAL-010) reachable only by
direct invocation without a canonical store; any mission-pipeline dispatch
without an attestation source fails closed
('attestation_source_unavailable' / 'no_canonical_replay_event'). Not a
second write path.

(c) Bearer protection on POST /missions intact. PASS, static and live.
gateway/routes/missions.js:19-35: token unconfigured -> 503 fail-closed;
missing/wrong bearer -> 401 via crypto.timingSafeEqual. Harness T7a..T7d
live: 503/401/401/200 exactly as specified.

No incoherence found. No product-code patch needed or made here.

## T5 verbatim statement

From the sequence/replay cert log (T5: reinitialization durability):

    BLOCKED [T5] docker restart unavailable: Command failed: docker restart p0-cert-postgres
    Error response from daemon: No such container: p0-cert-postgres

Environmental, as documented: the `p0-cert-postgres` container is absent.
Same block as the Phase 12 battery; not a product or test defect.

## Environment note

Mid-unit, the local VM /tmp was wiped, losing the first wave-1 run outputs
and a partially transferred harness copy. Both were rebuilt: the W-1A
harness transfer was checksum-verified byte-identical (md5 match) before
execution, and every suite was re-run to completion. All tallies above come
from the final complete runs. Raw logs remain on the Pig at
/tmp/bat-*.log for forensics.

## Open decisions / carryovers (unchanged by this unit)

- EVAL-006 3 failures: pre-existing; repair is uncommitted WIP in the dirty
  worktree (`/home/nolan/worktrees/constitutional-convergence`), untouched
  per instructions.
- MissionRuntime.create() content-drift decision: open follow-up from Phase
  12, not patched by design.
- No new defects found. No new product-code changes needed.

## INTEGRATION VERDICT

INTEGRATION GO: W-1A holds on the converged tree. 18/0 invariant harness on
the final tree content, the full Phase 15 battery green except the three
pre-existing EVAL-006 failures and the environmental T5 block, the
C9/F6-STATIC stale oracles revised to preserved-law intent (all passing),
and the W-1A coherence check (journal-resolved attestation, no second
witness write path, bearer protection intact) fully coherent. Nothing in
the converged envelope/derivation changes weakens the W-1A
fabrication-route closures.

Commits this unit: `66c775d0b` (test-only: C9/F6-STATIC revisions). Product
code untouched.
