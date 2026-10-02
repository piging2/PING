# Interval 10 — Reader R3 (Pig-side clean-checkout falsifier) report

Date: 2026-09-30 ~11:10 MDT. Method: fresh detached worktrees at exact SHAs under
`/home/nolan/ping-worktrees/verify-{ag,d,c,a}`; `git status --porcelain` = 0 files
in all four before and after. Writers' worktrees (`wt-lane-*`) never touched.

## Per-unit verdicts (current SHAs)

| # | Unit | SHA | Verdict |
|---|------|-----|---------|
| 1 | Authority gate tests (`ping-runtime/orchestration/authority_gate.test.js`) | `eab4f714a` | **REPRODUCED — 15/15 passed** |
| 2 | FYD stage emitter unit tests (`ping-runtime/fyd/fyd_stage_emitter.test.js`) | `43b1ed212` (code `3b2ecd043`) | **REPRODUCED — 7/7 passed** |
| 3 | Coppersmith chain (source → build → runtime → real run → journal) | same | **REPRODUCED** (caveats below) |
| 4 | Media placement real provider conformance | `8b5795f6a` | **REPRODUCED — 73/73 passed** |
| 5 | Post-effect UNKNOWN/HOLD (`post_effect_routing.test.js`) | `9f415d14` (lane-a) | **REPRODUCED — 12/12 passed** |

### Chain reproduction detail (verify-run, run_id `verify-coppersmith-20260930`)
- Driver: path-adjusted copy of the writer's `driver.js` (paths AG/LC/LD →
  verify-* worktrees, journal → verify-local file, fresh RUN_ID). No writer
  worktree, no writer journal, no post-hoc journal edits.
- Mission 1 `59332d798d40882e`: **completed**. 7 envelopes
  ACQUIRE/EXTRACT/RESOLVE/OBJECT_GRAPH/SITE_SPEC/RENDER + COMPLETE, stage
  digests `30b185b2/a16720b7/7ead187e/8eaf11fc/9fedb221/2687a4af` —
  **byte-identical to the committed take3 log** (`integrate-coppersmith-20260930.jsonl`)
  and to the lane-d proof digest set. Determinism across runs confirmed.
  `sink_status=error` throughout (UER fail-closed, no pool — matches take3).
- Media placement: live `placeAsset` via the Lane C provider + read-back,
  placement `mp_fc4b4742143efe40`, effect ledger `effect_effected`,
  `MC_RUN_SUCCEEDED` journaled.
- Mission 2 (fresh `f66c5dc77ad3b12f`, controlled post-effect response loss):
  **held=true, status=running (never FAILED)**, hold_reason records
  `UNKNOWN_AFTER_POSSIBLE_EFFECT`; `MC_RUN_UNKNOWN` journaled;
  effect ledger `effect_unknown` with `promoted=false`
  ("no definitive failure evidence; outcome stays effect_unknown").
- T2 cross-tenant forgery → DENIED (covered by AG test
  "capability: cross-tenant grant denied", reproduced in the 15/15).

### q7 census follow-up (Reader R4 relay)
All four flagged paths verified present in the clean checkouts
(verify-a and verify-ag schedulers; line numbers shifted vs the census):
1. **Derivation throw swallows HOLD** (`_reconcileUnknown` catch on
   `deriveFailureRecord` → `return null`): present. Fail-closed (never FAILED)
   but fail-SILENT — no durable record, mission left in limbo. **No test covers it.**
2. **HOLD persistence failure → nothing durable emitted** (markHold→0 +
   recovery failed → `return null`, in-memory dedup undone): present. Fail-closed,
   never FAILED. **Covered by test** ("markHold throws … fail closed, never FAILED" PASS).
3. **Stuck-running scan failure** (`reconcileStuckRunning` catch → `return 0`):
   present. **No test covers it.**
4. **`effect_known` default FALSE-FAILED** (`failure_record.js`:
   `effectKnown = dispatch.effect_known !== false`): present in the function
   contract — an omitted `effect_known` with `worker_failed` + exhausted retries
   derives outcome `failed`. **Not reachable through current call sites**: both
   scheduler call sites pass `effect_known: false` explicitly for unknown
   outcomes. Latent only; any future caller omitting it on an ambiguous outcome
   would silently get FAILED.
- Reachability in the real run: none of the four paths fired (derivation and
  markHold succeeded against real PG). The close bar's "post-effect
  UNKNOWN/HOLD" held on every exercised path. Gaps 1 and 3 are untested
  fail-silent rows — recommend hostile-matrix cases for both.

### T02 wrong-actor probe (Reader R1 archaeology relay) — CONFIRMED OPEN
Probe (`verify-run/wrong-actor-probe.mjs`, read-only, against `eab4f714a`):
correct tenant `tenant-a` + valid W5 grant (capability `customer.lookup`,
principal **`observation`**) on a mission whose `event_type` routes to worker
**`campaign`** → **AUTHORIZED, campaign worker executed, zero denials**.
Corroborates R1: `checkGrant` validates principal non-empty but never compares
it; `_authorizeDispatch(mission, workerName)` receives `workerName` and never
uses it. Audit trail attributes the effect to `observation`. Record as
known-open defect; not a failure of T2/B/C/D units.

### Fidelity gaps / caveats (falsifier honesty)
1. `driver.js`, `effect_ledger.js`, `outcomes.js` are **uncommitted writer
   scratch** (not in any lane branch). The committed chain evidence is the
   emitter code, the run-log artifact, and the lane tests; the harness and
   effect-ledger module are fixtures. Copied byte-identical into verify-run.
2. The take3 journal was **post-hoc edited** by the writer
   (`fix-stage-times.js` = the fabricated +1ms epsilon; `fix-evidence-refs.js`
   rewrote 6 `MC_FYD_STAGE_COMPLETED` events). My verify journal is raw driver
   output, no edits — the T4 caveat stands as reported.
3. My first verify attempt reused take3's mission-2 row: `mission_id` is
   deterministic `hash(tenant:missionType:event_id)` and my sed missed the
   injection `event_id`, so `ON CONFLICT DO NOTHING` returned take3's held row.
   Caught, fixed with a fresh event_id, re-ran clean. (Deterministic IDs are
   intended behavior, not a defect.)
4. Scratch PG `integrate_run` is shared infra. **T3 live observation**: the two
   take3 denied missions (`677de4cf69b431b8`, `3ac73010f5e88fed`) were re-denied
   on every `_poll` (stats.denied grew, and they count in stats.failed) —
   pre-claim denial is not durable in current code, exactly Writer B's scope.

## Standing by
Current-SHA pass complete. Awaiting notification that Writers A–D have landed;
will then re-verify at the new SHAs and rerun the Lane G hostile matrix
(T2 forgery DENY, T3 denial durable + not repolled, T06 secret never persisted,
post-effect UNKNOWN/HOLD, normal run completes, wrong-actor DENY once T02 lands).
