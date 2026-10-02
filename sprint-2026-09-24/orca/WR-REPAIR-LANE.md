# WR Fail-Closed Repair Lane — 2026-09-26

Engineering ledger. Lane A. Isolated from FYD. Quiet.

## Verdict: REPAIR COMPLETE — regression green locally and on the Pig, patch deployed and committed

Nolan's directive executed: the smallest fail-closed patch. No new
EffectAuthority, no new event store, no new retry system, no new scheduler,
no new workflow engine. Existing `_reconcileUnknown` HOLD machinery reused
for the UNKNOWN path; existing `failWithRetry` reused for FAILED/NO_MATCH.

## The patch (commit c59960b81, branch fix/workerruntime-failclosed-20260926, NOT pushed)

2 files, 95 insertions, 22 deletions. Full diff:
`~/workspace/sprint-2026-09-24/orca/wr-effect-unknown/patch/workerruntime-failclosed.diff`

**`ping-runtime/workers/worker_runtime.js` — `dispatch()` returns an observed routing receipt.**
Before: returned the handler's raw return value (`null` on no-match,
`undefined` when a matched handler returned nothing) — the observation gap.
After: returns `{ matched, worker, routeExists, result }`:
- `matched: true` — a registered worker's eventTypes included the event type
  and its `handle()` settled. `result` is the handler's RAW return (may be
  undefined). A falsy result is NOT evidence the worker did nothing.
- `matched: false, routeExists: false` — EXPLICIT NO-MATCH, observed: no
  worker registered for the event type, no handler ran.
- `matched: false, routeExists: true` — worker registered but at
  maxConcurrent; no handler ran, so no effect could have occurred.
- Thrown handler errors still propagate (P0-2), unchanged.
- Multi-worker fan-out loop preserved (last result wins, as before).

**`ping-runtime/orchestration/mission_scheduler.js` — `_dispatch` outcome branch rewritten.**
- (a) dispatch threw → FAILED per existing contract (unchanged catch path).
- (b) `matched=false, routeExists=false` → EXPLICIT NO_MATCH, observed:
  terminal fail with ZERO retry via `_failMission(mission, err, { max_attempts: 1 })`,
  routed to DLQ for human repair. The error prose now states the observed
  receipt (`matched=false, routeExists=false`) — no longer an inference.
- (c) `matched=false, routeExists=true` → worker at capacity; no handler ran,
  no effect possible; fail-with-retry preserves pre-repair behavior.
- (d) `result.status === 'failed'` → FAILED (worker-reported failure).
- (e) `result` truthy → SUCCEEDED → `complete()` (positive completion evidence).
- (f) matched + falsy result → UNKNOWN: `_reconcileUnknown` emits the
  in-memory HOLD (MISSION_RECONCILE_HOLD event + bounded log + `stats.unknown`),
  mission row untouched, NEVER auto-retried.
- Defensive: no receipt object at all → UNKNOWN (absence of evidence, not NO_MATCH).
- `_failMission` accepts an optional policy override (DLQ-exhaustion check now
  uses the effective policy); DOC-CONTRACT comment on MISSION_WORKER_MAP updated
  to the receipt contract; `stats.unknown` counter added.

The fabricated branch is deleted: no code path narrates "no worker matched"
without the dispatch receipt observing it, and no falsy dispatch is retried.

## Regression evidence (permanent test: `wr-effect-unknown/regression-failclosed.js`)

45/45 assertions pass locally AND on the Pig against the live deployed files
(Pig run: /tmp/wr-verify/regression-pig.js, exit 0). Evidence: `regression-evidence.json`.

| Case | Result |
|---|---|
| 1. effect-then-undefined (original repro) | effect executes EXACTLY once; undefined → UNKNOWN (HOLD emitted, row stays `running`, retries=0); zero automatic retry across 3 poll cycles; zero "no worker matched" text in logs/errors |
| 2. true explicit no-match | receipt observes `matched=false, routeExists=false`; terminal `failed`, retries=1 (no further retry), nothing reclaimed; honest error prose; DLQ letter recorded; not UNKNOWN |
| 3. successful worker | SUCCEEDED → `completed`, effect once |
| 4. failure before effect (throw) | FAILED per existing contract → `retry_pending`; retry succeeds → `completed`; effect once total (retry of genuine failures still works) |
| 5. ambiguous post-effect failure (effect, then throw) | DOCUMENTED RESIDUAL: follows FAILED contract → redispatch duplicates the effect (2 effects). Not fixed — the throw carries no evidence about the effect; fix requires a future effect ledger/idempotency contract, out of scope per directive |
| 6. timeout | UNKNOWN → HOLD, never FAILED, zero retry queued (existing behavior preserved) |
| 7. restart/recovery (in-session + fresh instance) | UNKNOWN leaves row `running`; fresh scheduler does not pick it up, nothing reclaimable; fresh watchdog re-emits HOLD (detection only). Cross-restart Arrow-1 reaper path NOT fixed — already-open Reaper-vs-HOLD design question, pending Nolan |

Old code still reproduces the duplicate on the verbatim copies
(`repro-effect-then-undefined.js` exits 0 = duplicate observed), proving the
regression test would have caught the defect.

Note: `_dispatchWithTimeout` unref()s its timer (deliberate — a hung dispatch
must not hold the process open); the regression keeps the loop alive with a
test-only keepalive during the timeout case. Production is unaffected (the
scheduler's own poll interval keeps the loop alive).

## Deployment record

- Live files verified md5-identical to the verbatim copies BEFORE patching.
- Patched files deployed to the Pig via base64 transfer; post-deploy md5 of
  both live files matches the local patch copies byte-for-byte.
- Pig-side verification: full regression (45/45) run against the LIVE files;
  plus a live smoke test registering all canonical workers — receipt shapes
  correct (`LEAD_CREATED` → matched/ok, unregistered → no-match,
  `REPLAY_VERIFY` → matched/ok with verified:false).
- Only live caller of `WorkerRuntime.dispatch()` is `mission_scheduler.js`
  (grep-verified across ping-runtime, gateway, evals). Gateway/eval test files
  call `dispatch()` but assert on side effects (emissions), never on the raw
  return value — the envelope change does not break them (not re-run; noted below).
- Branch `fix/workerruntime-failclosed-20260926` created from
  `feature/orca-reaper-hold` (73d06b03c); commit `c59960b81`, explicit pathspecs,
  only the 2 lane files. NEVER pushed, per constraints.

## Worker audit — classification table (live registered handlers, read-only)

All handlers in `ping-runtime/workers/canonical_workers.js` (+ conditional
`knowledge-promotion`), audited against the five classes:

| Worker | handle() return behavior | Classification |
|---|---|---|
| observation | `return { status: 'ok', observation }` — all paths | positive completion evidence — no patch needed |
| claim | `return { status: 'ok', claim }` — all paths | positive completion evidence — no patch needed |
| classification | `return { status: 'ok', classification }` — all paths | positive completion evidence — no patch needed |
| recommendation | `return { status: 'ok', recommendation }` — all paths | positive completion evidence — no patch needed |
| projection | `return { status: 'ok', projection }` — all paths; Qdrant errors caught+logged, never thrown | positive completion evidence — no patch needed |
| replay | `return { status: 'ok', replay }` — all paths incl. kernel errors (failure-honesty via `verified:false`, not `status:'failed'`) | positive completion evidence — no patch needed |
| witness | `return { status: 'ok', witness }` or `{ status: 'rejected', reason }` — always truthy | positive completion evidence — no patch needed ('rejected' completes; existing semantics unchanged) |
| lineage | `return { status: 'ok', lineage }` — all paths | positive completion evidence — no patch needed |
| knowledge-promotion (KnowledgePromoter, conditional) | always returns truthy objects (`{ promoted, status, sourceEventId }` / `{ promoted:false, reason, status:null }`) | positive completion evidence — no patch needed |
| intelligence | dormant (`eventTypes: []`), never registered live | N/A |

Cross-cutting: every handler's `this._emit()` throws when the EventRuntime is
missing or the emit result is non-ok → thrown error → FAILED per existing
contract. No live handler has an implicit/undefined return, no
effect-then-missing-result pattern, no effect-then-exception pattern. **Zero
handler patches required**: the repair's UNKNOWN path cannot misbehave on the
current live set — the defect was purely coordinator-side (the scheduler's
inference), and the audit proves no live worker can currently trigger the
UNKNOWN path by returning undefined.

Per directive ("do not rewrite them all blindly — classify first"): classified
first; classification proves no rewrites needed.

## What remains unverified / open

1. **Reaper-vs-HOLD (already open, pending Nolan — unchanged):** after a real
   process restart, Arrow 1 `reapExpiredLeases` (mission-runtime side) may reset
   an UNKNOWN `running` row to `created` → redispatch. The repair routes
   undefined-result into the same HOLD machinery as timeouts, inheriting the
   same known limitation. No watchdog deployed, no reconciliation redesigned.
2. **Effect-then-exception residual (documented, regression case 5):** a handler
   that performs an effect and then throws still follows FAILED → retry →
   duplicate effect. The directive kept the thrown-error contract; the fix is a
   future effect ledger or per-effect idempotency contract.
3. **Live end-to-end with real MissionRuntime (postgres):** the regression used
   a stub runtime honoring the live contract surface. The `{ max_attempts: 1 }`
   override follows the same `failWithRetry` code path as the standard policy
   (`mission_runtime.js:250-251`); SQL-level behavior inferred, not executed.
4. **Gateway/eval test suites not re-run:** verified by grep they never assert
   on `dispatch()`'s return value (side-effect assertions only), so the envelope
   change is compatible; full suites not executed in this lane.
5. **Pre-existing dirty working tree on the Pig** (other lanes' untracked files
   under `feature/orca-reaper-hold`) was not touched; my commit contains only
   the 2 lane files.

## Files

- Patch (deploy candidates): `wr-effect-unknown/patch/worker_runtime.js`,
  `wr-effect-unknown/patch/orchestration/mission_scheduler.js`
- Deployed diff: `wr-effect-unknown/patch/workerruntime-failclosed.diff`
- Regression: `wr-effect-unknown/regression-failclosed.js` (+ `regression-evidence.json`)
- Historical (unchanged): `repro-effect-then-undefined.js`,
  `live_*.verbatim.js`, `evidence-provider-effects.jsonl`, `evidence-verdict.json`
- Test-only fixture (NOT deployed): `wr-effect-unknown/patch/orchestration/failure_record.js`
  (verbatim dep copy), `wr-effect-unknown/patch/authorities/constitutional_time_authority.js`
  (stub — the Pig resolves the real kernel chain, verified loading 2026-09-26)

## Addendum: Lane B dispatch-contract note (2026-09-26 ~07:26 MDT)

Lane B's contract: pass `tenant_id` explicitly in the dispatch call; never trust
body-supplied `createdBy`/`namespace`; gateway derives
`payload.namespace = tenant::<tenant_id>` and 400s on mismatch.

Lane A confirmation of NON-INTERFERENCE (no patch change made, none needed):
- The repair wraps only the dispatch RETURN value (receipt envelope). The
  `event` object passed to `handle()` is byte-identical in construction to
  pre-patch: `MissionScheduler._dispatch` still sets `namespace:
  payload.namespace` (patched scheduler line 288, unchanged), and
  `WorkerRuntime.dispatch` still sets `entry.worker._event = event` before
  `handle(event)` and clears it after — so the W4 tenant pin
  (`this._event?.tenant_id`) and namespace/correlation inheritance observe
  exactly what the caller placed in the event, as before.
- Lane A built no dispatch UI and no [New Mission] form; the Identity/Tenant
  selector is another lane's surface. There is no Lane-A dispatch call site
  that needs a `tenant_id` added — the sole live dispatch call
  (`MissionScheduler` → `WorkerRuntime.dispatch(event)`) is scheduler-internal
  and carries the gateway-derived namespace through untouched.
- Per Lane B's note, authoritative verification happens at the integration gate.
