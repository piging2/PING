# HOLD / REAPER Lane — Evidence Record

**Lane:** P0 HOLD/REAPER (CEO continuation wave, 2026-09-24)
**Status:** Implementation complete, 21/21 tests GREEN. No commit, no push, no gateway cutover.
**Code:** `~/workspace/f01-fix/`

## Required outcome (CEO spec)

- HOLD is non-dispatchable.
- An unresolved consequential outcome may never return to `created` from lease expiry.
- Reconciliation alone may move HOLD to `SUCCEEDED`, `FAILED`, `SAFE_TO_RETRY`, or continued HOLD.
- Existing mission and scheduler semantics own this behavior (no new HOLD authority).
- `_failMission` handles only proven failures. Timeout, lost acknowledgement, dispatch throw
  with ambiguous effects, and unknown external outcomes must never become FAILED.

## RED evidence (test-first)

`mission_hold_reaper.invariant.test.js` was written before the fix and run against the
pre-fix implementation (the `pig-transfer-tmp` preliminary version, which had HOLD parking
but no durable outcome model, no dispatch-boundary effect counting, and the old
`retry`/`fail` reconciliation vocabulary):

- **6 tests, 0 passed, 6 failed** (2026-09-24 ~17:30 UTC, re-confirmed 2026-09-24 ~18:05 UTC
  against the preserved pre-fix sources in a scratch copy).

Principal contradiction (test 1, "after dispatch timeout"):

```
  AssertionError: after dispatch timeout: HOLD invariant violated
  + actual - expected
    {
  +   effect_count: 0,            -   effect_count: 1,
      logical_operation_id: '...',
      outcome: 'UNKNOWN',
  +   reconciliation_required: false, -   reconciliation_required: true,
  +   retry_eligibility: true,    -   retry_eligibility: false,
      status: 'hold'
    }
```

The pre-fix code parked `hold` rows that were still dispatch-eligible (`retry_eligibility`
did not exist), never counted the dispatch attempt, never required reconciliation,
and accepted the non-CEO `retry`/`fail` vocabulary.

## GREEN evidence

```
node --test mission_hold_reaper.invariant.test.js \
            mission_scheduler.retry_watchdog.test.js \
            mission_hold_static.test.js
ℹ tests 21 · pass 21 · fail 0
```

| Suite | Tests | What it proves |
|---|---|---|
| `mission_hold_reaper.invariant.test.js` | 6 | The adversarial invariant: ambiguous dispatch → HOLD → lease expiry → reaper → repeated polls → restart → second scheduler → still non-dispatchable, effect count 1, identity stable; SUCCEEDED keeps count 1; SAFE_TO_RETRY (proven absence) → re-attempt → count exactly 1; vocabulary law; `_failMission` gate; reaper narrowing |
| `mission_scheduler.retry_watchdog.test.js` | 8 | F-01 bounded retry on proven failures only; claim-gated dispatch; timeout/stuck → durable HOLD; fail path emits derived records as evidence, never HOLD; dispatch throws → HOLD |
| `mission_hold_static.test.js` | 7 | Source-level: only 3 `SET status='created'` paths exist and only `reconcileHold` may source from `hold`; claim/read paths gate on `retry_eligibility`; `parkHold` atomicity; 4-decision vocabulary with evidence gates; `_failMission` allow-list; dispatch-throw routing; single `reconcileHold` authority |

## Diff report

### `mission_runtime.js` (753 lines)
- `initialize()`: new durable columns `logical_operation_id`, `effect_count` (default 0),
  `outcome` (default `'UNKNOWN'`), `retry_eligibility` (default TRUE),
  `reconciliation_required` (default FALSE); backfills `logical_operation_id = mission_id`
  for pre-existing rows (migration-safe; no existing row becomes dispatchable).
- `create()`: sets `logical_operation_id = mission_id`, `outcome='UNKNOWN'`,
  `retry_eligibility=TRUE` at insert. One row = one logical operation; retries and
  SAFE_TO_RETRY re-attempts reuse the row, so identity is stable by construction.
- `assign()`: claim now requires `status='created' AND retry_eligibility=TRUE` —
  HOLD is structurally non-claimable even if its status were mis-set.
- `getPending()`: requires `status='created' AND retry_eligibility=TRUE`.
- NEW `recordDispatchAttempt()`: `effect_count + 1` conditional on `status='running'`,
  called by the scheduler at the dispatch boundary (after start, before worker invoke).
  Conservative: the invocation may have produced the effect.
- `complete()`: sets `outcome='SUCCEEDED'`, `reconciliation_required=FALSE`.
- `fail()` / `failWithRetry()` exhaustion: set `outcome='FAILED'`. Their WHERE clauses
  never include `hold`.
- `reapExpiredLeases()`: unchanged narrowing (abandoned never-started only) + sets
  `retry_eligibility=TRUE` on reclaim.
- `reclaimRetryPending()`: sets `retry_eligibility=TRUE` on reclaim.
- `parkHold()`: atomically sets `status='hold'`, `outcome='UNKNOWN'`,
  `retry_eligibility=FALSE`, `reconciliation_required=TRUE`, clears the lease, carries
  the HOLD record. Conditional on `running`/`assigned` — the cross-restart dedup guard.
- `reconcileHold()`: rewritten to the CEO vocabulary. `succeeded` / `failed` /
  `safe_to_retry` all REQUIRE evidence (throw otherwise); `safe_to_retry` additionally
  requires proof of absence (`effectProvenAbsent`, corrects `effect_count` to 0) or an
  idempotency contract; `hold` continues HOLD with a note merged into `hold_record`.
  Any other decision string throws. This is the ONLY exit from `hold`.

### `mission_scheduler.js` (738 lines)
- `_dispatch()`: calls `recordDispatchAttempt()` immediately before `_dispatchWithTimeout`;
  catch block routes dispatch throws to `_reconcileUnknown` (HOLD) — ambiguous effects
  never become FAILED. Timeout path unchanged (HOLD).
- `_failMission(mission, error, dispatchOutcome)`: fail-closed gate — only
  `'worker_failed'` (worker ran, reported failure) and `'no_worker'` (proven non-effect)
  are admitted; any other outcome (including `'worker_threw'`, `'unknown'`, `'ok'`,
  or a missing outcome) throws `TypeError: not a proven failure`. No default outcome.
- `_reconcileUnknown()`: unchanged durable parking via `parkHold()`.
- `reconcileHold()`: single definition (a stale duplicate with the old vocabulary was
  removed); delegates to the runtime, clears the in-memory dedup marker only on
  terminal decisions (continued HOLD keeps it).
- No new authority: the scheduler's existing poll arrows (lease renew → reaper →
  orphan escalation → retry reclaim → stuck watchdog → dispatch) own the behavior.

### Tests
- `mission_hold_reaper.invariant.test.js` (371 lines): NEW. Six adversarial cases
  written before the fix (RED 0/6 → GREEN 6/6).
- `mission_scheduler.retry_watchdog.test.js` (325 lines): updated to durable HOLD —
  F-01 retry tests now use a proven-failure worker (`failedStatus`); timeout/stuck
  assertions expect parked HOLD rows; boundary test reflects the F-01 close-out
  (fail path emits `MISSION_FAILURE_DERIVED` as evidence, never HOLD).
- `mission_hold_static.test.js` (146 lines): NEW. Seven source-level proofs that fail
  first if a future edit reopens a HOLD→`created` path or weakens the gates.
- `fake_mission_pool.js` (237 lines): NEW. Shared honest fake `pg.Pool` — WHERE
  conditions enforced only when the SQL text carries them in WHERE; SET applied
  generically. Both suites share it.

### Supporting files (copied, not modified for this lane)
- `failure_record.js`: `deriveFailureRecord` (proven-outcome evidence derivation).
- `~/workspace/authorities/constitutional_time_authority.js`: placement shim exposing
  `nowAsISOString()`/`nowMs()` for the `../authorities/...` import the code expects.
  Harvested interface behavior, not a new time authority.

## Non-redispatch proof (scheduler)

Per poll cycle (`_poll`): lease renewal (Arrow 0) skips non-processing missions; the
reaper (Arrow 1) matches only `assigned` + never-started + expired lease; orphan
escalation (Arrow 1b) parks started-but-orphaned missions as HOLD; the stuck watchdog
(Arrow 3) scans only `running`/`assigned`; dispatch (Arrow 4) reads `getPending()`,
which requires `created AND retry_eligibility=TRUE`. A HOLD row satisfies none of
these: it cannot be reaped, reclaimed, claimed, or dispatched by any scheduler
instance, including after restart. Proven by invariant test 1 (lease expiry + reaper +
5 polls + restart + second scheduler, `workerInvocations` stays 1) and static tests
1–2.

## `_failMission` wiring

| Dispatch outcome | Path |
|---|---|
| worker returned `status:'failed'` | `_failMission(..., 'worker_failed')` → bounded retry → exhaustion → DLQ, with `MISSION_FAILURE_DERIVED` as evidence |
| no worker matched (null dispatch) | `_failMission(..., 'no_worker')` → same bounded path (proven non-effect) |
| dispatch timeout | `_reconcileUnknown` → HOLD (never FAILED, never retried) |
| dispatch threw (ambiguous effects) | `_reconcileUnknown` → HOLD (never FAILED) |
| any other/unknown outcome passed to `_failMission` | throws `TypeError: not a proven failure` |

## Caveats and follow-ups

- `pig-transfer-tmp/` still holds the pre-fix preliminary version; it was used only as
  the RED baseline and is otherwise untouched. Treat it as superseded for this lane.
- The workspace root has many untracked files; nothing was staged or committed.
- The `constitutional_time_authority.js` shim is a placement compatibility piece; the
  canonical time authority question is out of scope for this lane.
- Gateway: no cutover performed (per lane constraint); watchdog deploys only after
  these tests pass — they now do.
