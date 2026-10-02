# WR Effect-Then-Undefined Lane — 2026-09-26

Engineering ledger. Isolated from FYD. Quiet.

## Verdict: YES — reproducible duplicate-effect path confirmed

A worker handler that performs an external effect and then returns
`undefined` is retried by the live scheduler, and the retry performs the
effect a second time. Reproduced locally with the live Pig dispatch code
verbatim. Two physical effects for one logical mission.

## What is live (read-only verified 2026-09-26 ~13:05 UTC)

- `/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js`
  (558 lines, F-01/fixed variant: timeout -> DISPATCH_TIMEOUT -> in-memory
  HOLD, never FAILED on timeout).
- `/home/nolan/ping/ping-runtime/workers/worker_runtime.js`
  (171 lines). `dispatch()` returns the handler's raw return value
  (`lastResult = await entry.worker.handle(event)`, lines 71/87/105).
- `effect_reconciler.js` does NOT exist on the live Pig. The ORCA
  unknown-outcome branch (`feat/orca-unknown-outcome-port`) never landed.
  There is no effect ledger, no op-key idempotency, and no effect-aware
  retry anywhere in the live path.
- Live `mission_runtime.js` has NO `parkHold`. HOLD records are in-memory
  only and do not survive a scheduler restart (the live scheduler says so
  itself in `_reconcileUnknown`).

Verbatim copies of both live files:
`~/workspace/sprint-2026-09-24/orca/wr-effect-unknown/live_mission_scheduler.verbatim.js`
and `live_worker_runtime.verbatim.js`.

## Reproduction (deterministic, no real external effects)

Harness: `~/workspace/sprint-2026-09-24/orca/wr-effect-unknown/repro-effect-then-undefined.js`

- `require`s the VERBATIM live `WorkerRuntime` (real dispatch code, not a double).
- Registers one worker with `eventTypes: ['BILL_CUSTOMER']` whose
  `handle()` appends one line to an append-only counter file (the stand-in
  for a provider-side mutation) and returns `undefined`, the reported case.
- Replicates the live scheduler's three-outcome branch VERBATIM
  (live scheduler lines 305-320) plus `failWithRetry` /
  `reclaimRetryPending` semantics from the live poll loop (Arrows 2/4).

Result (evidence: `evidence-provider-effects.jsonl`):

1. Dispatch 1: worker matches, performs effect (counter = 1), returns
   `undefined`.
2. Scheduler branch (b) fires: `!dispatchResult` -> records
   `"no worker matched event_type=BILL_CUSTOMER"` -> `_failMission` ->
   `failWithRetry` -> mission `retry_pending` (retries=1).
3. Arrow 2 reclaims the retry, Arrow 4 redispatches: worker performs the
   effect AGAIN (counter = 2, same customer, same amount).

Two physical effects for one logical mission. `node repro-effect-then-undefined.js`
exits 0 only when the duplicate is observed; re-run to re-verify.

## The observation gap (proven, not inferred)

`WorkerRuntime.dispatch()` yields a falsy value in TWO cases:

- No worker matched: `lastResult` stays `null`.
- A worker matched, ran, performed an effect, returned `undefined`:
  `lastResult = undefined`.

The scheduler's test is `!dispatchResult` (live line 312). It cannot
distinguish the two. Verified in the harness: dispatch to an unregistered
event type returns `null`; dispatch to a matched worker returning
`undefined` returns `undefined`; both are falsy; both take branch (b).

## Fabricated retry prose (found in the live path)

Live scheduler line 308/318:

- Comment: `(b) dispatchResult is null/undefined -> no worker matched`
- Recorded error: `no worker matched event_type=${event.event_type}`

This narrates a routing fact ("no worker matched") that was never
observed, to justify a retry decision. In the reproduced case the truth is
the opposite: a worker DID match and DID perform the effect. The only
observed fact is "dispatch resolved to a falsy value". The prose is
fabricated, and it is what sends the mission down the retry path.

Related (from the 2026-09-24 social-retry proof, unlanded branch, recorded
for completeness): the ported foundation's `decide()` authorized retry on
ledger-empty UNKNOWN with reason `probe_confirms_never_executed` even when
the provider effect had landed. Same failure class: a label narrating
"never executed" that no operation-bound evidence supports. Not live, but
the pattern is load-bearing wherever retry reasons are generated.

## The invariant: UNKNOWN EFFECT != SAFE TO REDISPATCH

What the current live code demands before a retry: nothing about the
effect. Retry is count-based (`retries < max_attempts` -> `retry_pending`
-> reclaim -> redispatch). No effect ledger exists live, so the retry
decision cannot consult one even in principle.

What operation-bound evidence a retry would require for this effect class
(non-idempotent external mutation, e.g. billing, publishing, messaging):

1. Routing evidence bound to the op key: a dispatch receipt recording
   WHICH worker/handler actually ran for this attempt. A falsy return must
   never be narrated as "no worker matched" without it.
2. Effect-state evidence bound to the same op key: a provider-side probe
   proving the effect did or did not land (e.g. transaction lookup,
   post-listing fingerprint miss, balance unchanged). Retry authorized only
   on proven non-execution.
3. Or a proven idempotency contract for the specific effect (provider
   idempotency key, toggle semantics with pre-read, version binding).
   Generic "retryable" flags are not evidence.

None of 1-3 are demanded by the live code. The minimal fail-closed repair
would be: treat a falsy dispatch return as UNKNOWN (not "no worker
matched"), and never auto-retry it without 1+2 or 3. No new RetryAuthority
invented here; this is the enforcement point the existing HOLD design
already names.

## Secondary path (restart-gated, already open as design question)

Timeout -> `_reconcileUnknown` emits an in-memory HOLD and deliberately
does NOT touch the mission row (stays `running`; lease renewed by Arrow 0
only while this process lives). After a scheduler restart, Arrow 1
`reapExpiredLeases` resets the stale `running` row to `created` and it is
redispatched — an automatic retry of an unknown-outcome mission. This is
the Reaper-vs-HOLD gap already open pending Nolan (2026-09-24). Live
`mission_runtime.js` confirms `parkHold` is absent, so durable HOLD does
not exist. Not reproduced here (requires a restart), recorded because it
is the same invariant violation through a different trigger.

## Checked and ruled out

- The timeout path itself: fixed live. `DISPATCH_TIMEOUT` -> HOLD,
  no auto-retry, no FAILED-on-timeout. Not the defect.
- The unlanded `effect_reconciler.js` branch (per-class probes,
  `retry_authorized`): verified absent from the live Pig; findings from the
  2026-09-24 social-retry proof (incl. F4 `probe_confirms_never_executed`)
  apply to code that is not deployed.
- FYD code paths: untouched. This lane ran read-only against the live
  worker substrate and local test doubles only.

## What remains unverified

- Whether any live-registered worker `handle()` actually returns
  `undefined` after performing an effect (the defect is in the
  coordinator's interpretation, but its blast radius depends on worker
  behavior). Worker registration audit on the Pig would answer this.
- The restart-gated reaper path was reasoned from code, not executed.
- Mission-level dedup on the provider side (some providers may absorb the
  duplicate); effect-class dependent.

No escalation to Nolan: this is engineering-ledger material. The one item
needing his authority remains the already-open Reaper-vs-HOLD design
question; nothing here changes it.
