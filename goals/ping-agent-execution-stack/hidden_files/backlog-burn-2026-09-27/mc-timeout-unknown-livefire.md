# MC H5 HOLD timeout live-fire — 2026-09-27

**Verdict: PASS (3/3 runs).** Closes the residual "live timeout→UNKNOWN is code-present but not live-fired" (memory/2026-09-26.md L929).

## Design

Minimal live-fire on the real MC dispatch lane: `f01-fix/mission_scheduler.js`
(the production scheduler on the MC lane), `f01-fix/mission_runtime.js`,
`f01-fix/failure_record.js`. A hanging worker forces a real timeout race
(`dispatchTimeoutMs=300ms` vs the real `setTimeout` in `_dispatchWithTimeout`);
the real poll loop (`start()`/`stop()`, 400ms interval) dispatches, times out,
and reconciles. Bounded synthetic only: ORCA-audit `FakePool` (no Postgres,
no Pig, no :3100), an in-memory event capture runtime, and a worker that
performs zero external effects. Observation-only: no code changes, no
retry/reaper/HOLD design changes, no git mutations, no production touch.

The reaper-vs-HOLD design question stays Nolan-gated per `~/workspace/AGENTS.md`
and was NOT touched; this proof only observes the timeout→HOLD path. The
zero-redispatch assertion covers the proof window (4s / ~9 poll cycles); the
long-horizon reaper interaction is explicitly out of scope of this proof.

## Harvest notes

- ORCA audit 2026-09-24 bounded-synthetic harness (`f01-fix/mission_hold_noredispatch.invariant.test.js`,
  `fake_mission_pool.js`) provided the assertion template: hanging worker,
  hold record fields, event emission, invocation counting. Reused as-is.
- MC full-path proof pattern (2026-09-27, commit `470745bd`, journal receipt
  pattern): here the receipts are the emitted `MISSION_RECONCILE_HOLD` event
  payload plus the parked pool row — the lane's own journal equivalents.
- Exact assertion targets verified in source before writing:
  `mission_scheduler.js` L540+ (`_reconcileUnknown`), L429-441
  (`parkHold`: `status='hold'`, `outcome='UNKNOWN'`,
  `retry_eligibility=FALSE`, `reconciliation_required=TRUE`, `lease_until=NULL`);
  `failure_record.js` L101-109 (`resolveOutcome`: `outcome='unknown_hold'`,
  `status='HOLD_RECONCILE'`, `display='OUTCOME UNKNOWN — RECONCILIATION IN
  PROGRESS'`, `classification='UNKNOWN_EXECUTION'`).

## Four assertions (evidence per run)

1. **OUTCOME_UNKNOWN recorded.** `MISSION_RECONCILE_HOLD` payload record:
   `status=HOLD_RECONCILE`, `outcome=unknown_hold`, `classification=UNKNOWN_EXECUTION`,
   `display="OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS"`,
   `replay.dispatch_outcome=unknown`, `self_heal="none: held for reconciliation;
   no automatic retry (retry safety unproven for unknown effects)"`. PASS 3/3.
2. **Mission in the blocked set.** Pool row: `status=hold`, `outcome=UNKNOWN`,
   `retry_eligibility=FALSE`, `reconciliation_required=TRUE`, `lease_until=NULL`,
   `effect_count=1`, `hold_record.classification=UNKNOWN_EXECUTION`. PASS 3/3.
3. **MISSION_RECONCILE_HOLD event emitted.** Exactly 1 emission, source
   `mission-scheduler`, payload missionId matches. No duplicate HOLD across
   the extra poll cycles (in-memory `_reconciled` dedup held). PASS 3/3.
4. **Zero re-dispatch.** Worker invoked exactly once (`workerInvocations=1`);
   held mission never re-enters `getPending()`; zero `MISSION_FAILURE_DERIVED`
   (timeout never resolves to FAILED); row still `hold` at end. PASS 3/3.

## Rerun results / flakiness

- Run 1: PASS (mission 21c35b84db098505)
- Run 2: PASS (mission 14c06936f495b91d)
- Run 3: PASS (mission 8d6c81847b34afca)
- No flakes observed. (The earlier MC proof's one-time revocation timing flake
  was not reproduced here; the timeout path uses a single-shot timer race,
  not the revocation timing path.)

## Test output (run 1, representative)

```
[MissionScheduler] Started — polling every 400ms, maxConcurrent=3
[MissionScheduler] OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS — mission 21c35b84db098505 (dispatch timeout after 300ms (outcome unknown))
[MissionScheduler] Stopped
[live-fire] PASS mission=21c35b84db098505 invocations=1 hold_events=1 outcome=UNKNOWN status=hold
✔ MC H5 HOLD live-fire: forced dispatch timeout -> OUTCOME_UNKNOWN + blocked set + MISSION_RECONCILE_HOLD + zero re-dispatch (4522ms)
ℹ pass 1 / fail 0
```

## Artifacts

- Harness: [mc-timeout-unknown-livefire.js](mc-timeout-unknown-livefire.js) (run: `node --test mc-timeout-unknown-livefire.js`)
- This ledger: `mc-timeout-unknown-livefire.md`
