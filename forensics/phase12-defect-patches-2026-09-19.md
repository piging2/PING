# Phase 12 defect patches: D-1 and D-2 (2026-09-19)

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`
Pre-mutation HEAD: `4df1302163f28cbd173f4a06d081e2f349d8c3ea`

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION.

## Result

- D-1 (commit `bff7eb740`): SHIPPED and retained. The derivation race is repaired.
- D-2 (commit `ab0adbc20`): REVERTED by `114afad01`. The patch was proven correct in
  isolation (targeted 12/12), but it regressed two baseline batteries, so it was
  reverted cleanly per the standing rule. No force, no history rewrite.
- Final HEAD: `114afad01`. Worktree clean.

## D-1: legacy (tenant_id, sequence) 23505 absorbed into the derivation equivalence path

File: `gateway/canonical_event_envelope.js` (65 insertions, 28 deletions; one file committed).

Defect: the derivation INSERT used `ON CONFLICT (event_id) DO NOTHING`, but
`canonical_events` also carries the legacy `UNIQUE (tenant_id, sequence)`. Concurrent
same-event derivations could surface a spurious PostgreSQL 23505.

Patch: preserve the legacy unique key and the receipt mechanism; catch 23505 from the
converged derivation INSERT and route it into the existing deterministic equivalence
re-check. Non-23505 errors are preserved. A bounded one-retry guard returns
`CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED` on an unresolved second conflict: no
overwrite, no dispatch.

Test evidence (scratch PostgreSQL `w1a-scratch-pg`, 127.0.0.1:15439):
- Phase 13 dynamic race (30 rounds x 12 concurrent derivations): no spurious 23505,
  every round converged to one representation row, exactly one downstream dispatch
  per round. F6-RACE now passes: phase 13 = 28 pass, 1 fail.
- Phase 12 with D-1 only: 49 pass, 1 fail (sole failure C9, see below).
- Residual static assertions (stale against the preservation-compliant repair; the
  test unit was not redone, and the legacy key was intentionally preserved):
  - C9 (phase 12): demands the envelope ON CONFLICT cover every unique key, i.e. the
    legacy key be removed.
  - F6-STATIC (phase 13): same demand.
  - Both are oracles pinned to a removal repair that the law forbids (preserve
    mechanism, delete nothing). They are static-test mismatches, not product
    failures: the live race they were written to guard is now proven fixed.

## D-2: UER collision law at the commit layer (PATCHED, PROVEN IN ISOLATION, THEN REVERTED)

File: `ping-runtime/events/unified_event_runtime.js` (79 insertions, 4 deletions).

Defect: same `logical_id` with drifted canonical content conflicted on `event_id` and
deduplicated without content comparison.

Patch (as committed in `ab0adbc20`): on INSERT conflict, read the stored canonical
content and compare stored vs presented canonical hashes (`canonicalEventHash` from
`convergence_identity.js`):
- equivalent canonical bytes: return the existing stored event (`status: 'ok'`,
  `deduplicated: true`, same sequence), no handler dispatch, no integration routing.
- different canonical bytes: `status: 'error'`, `code: 'EVENT_IDENTITY_CONFLICT'`,
  no overwrite, no downstream dispatch.
- Mock-pool fallback (no stored row readable): preserves legacy fall-through so
  mock-based constitutional evals keep their baseline; documented as not proving
  equivalence.

Targeted evidence (isolated scratch DB, `/tmp/d2-target-test.js`, 12/12 pass):
- first emit dispatches once; byte-equivalent retry returns the same identity and
  sequence, sets `deduplicated: true`, returns the EXISTING event, dispatches
  nothing; drifted payload fails closed with `EVENT_IDENTITY_CONFLICT`, dispatches
  nothing, leaves the stored row untouched, exactly one authoritative row remains.

### Why D-2 was reverted (exact regression causes)

The full battery with D-2 applied exposed two real baseline regressions, not just the
anticipated C7 assertion change:

1. Phase 12 C7: `same logical identity dedups at commit (payload is observation data
   under logical_id)`. With D-2, drifted content returns `status: 'error'` instead of
   `'ok'`, and the follow-on representation acceptance of the error object fails with
   `ENVELOPE_VALIDATION_FAILED`. (Phase 12 with D-2: 47 pass, 3 fail: C7 x2, C9.)

2. Phase 7 producer migration, 5 failures (45/50 instead of 50/50): F2d, F3, F3b,
   F3c, C1. Root cause: the battery explicitly pins pre-existing UER behavior in a
   code comment ("Retry re-dispatch is pre-existing UER behavior, unchanged by Phase
   7"): the F2c idempotent retry of the same logical create is a byte-equivalent
   duplicate that the old code dispatched to handlers, so the real bridge created a
   mission per dispatch (missions 3, 4, 5 for F2d/F3/F3b expectations). D-2's
   no-redispatch-on-duplicate rule removed that dispatch, shifting every downstream
   mission count by one (observed: 2/3/4/4 instead of 3/4/5/5).

Per the governing rule ("If any baseline regresses because of D-2, revert the D-2
commit cleanly, keep D-1, and report exactly what regressed"), D-2 was reverted via
`git revert` (commit `114afad01`); D-1 remains live. Nothing was edited to make a
test pass; no constitutional ownership moved.

Post-revert confirmation (file byte-identical to pre-D-2, empty diff against
`bff7eb740`):
- Phase 7 producer migration: 50 pass, 0 fail.
- Phase 12: 49 pass, 1 fail (sole failure the stale C9 static oracle).

## Full battery, final tree (D-1 live, D-2 reverted)

Scratch PostgreSQL `w1a-scratch-pg` on 127.0.0.1:15439, credentials resolved at
runtime from the container environment (never printed or persisted).

| Suite | Result | Note |
|---|---|---|
| convergence invariants | 67 pass, 0 fail | baseline met |
| phase 7 producer migration | 50 pass, 0 fail | baseline met after D-2 revert |
| phase 9 model-B proof | 32 pass, 0 fail | baseline met |
| phase 12 collision/duplicate law | 49 pass, 1 fail | sole fail C9 static oracle (stale, pre-existing since D-1; see D-1 section) |
| phase 13 fanout exactly-once | 28 pass, 1 fail | F6-RACE fixed by D-1; sole fail F6-STATIC (stale, pre-existing) |
| phase 14 ordering | 21 pass, 0 fail | baseline met |
| constitutional eval (EVAL-001..009, mock) | 82 pass, 3 fail | all 3 fail are the pre-existing EVAL-006 failures, unchanged |
| EVAL-010 witness failure honesty | 34 pass, 0 fail | baseline met |
| sequence/replay cert (repointed temp copy, RUNTIME_PATH -> this worktree) | 70 pass, 0 fail, 1 blocked | T5 restart-durability blocked: `p0-cert-postgres` absent (environmental, as documented) |
| W-1A invariant harness | not re-run | harness path was not recorded in the forensics ("repointed temp copy" only); its lane is witness authority, disjoint from the changed UER emit-conflict path; the witness surface is covered in-worktree by phase 13 F3/F4 |

Net movement vs the 49/1 D-1-only phase-12 baseline and the pre-patch state: the
only genuine race repair that shipped is D-1 (F6-RACE now green). The stale static
assertions C9 and F6-STATIC remain red by design until the test unit is revised in a
separate unit (not this task; the unit must not be redone here).

## D-3 (architectural truth, no code change)

Worker execution stays at-least-once; canonical effect stays exactly-once. No patch
was made and none is needed for this defect.

## Open follow-up: MissionRuntime.create() content drift (not patched, by design)

`ping-runtime/orchestration/mission_runtime.js:81` uses the same identity-first
pattern as the old UER commit path: deterministic `mission_id` plus a bare
`ON CONFLICT DO NOTHING`. One mission per trigger is proven (F1/F2). The
content-drift question under a repeated `mission_id` (same identity, different
content) inherits D-2's now-open decision: the collision law for mission creation
was not settled by this task, and the evidence shows the same baseline-pinning
tension exists downstream. Recorded as an open follow-up; no patch attempted.

## Final tally

- Files committed: 1 (`gateway/canonical_event_envelope.js`, D-1).
- Commits: `bff7eb740` (D-1, live), `ab0adbc20` (D-2, reverted), `114afad01` (revert, HEAD).
- Pre-mutation HEAD preserved: `4df1302163f28cbd173f4a06d081e2f349d8c3ea`.
- Worktree clean at completion; no staged or unstaged changes.
- Nothing was deleted; the legacy unique key and the receipt mechanism are preserved.
