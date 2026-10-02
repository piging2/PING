# SWARM-11 — Kill Battery + Reconciliation Procedure

**Status:** KB-00 and KB-01 executed 2026-09-23 (this sandbox, node 24): 19/19 and 21/21 pass.
KB-02..KB-05 are executable test plans for a scratch Postgres on the Pig
(scratch PG `127.0.0.1:15439` was DOWN at survey time — the lane-C database is gone
with `/tmp`; the plans include setup). **Never run against the live gateway DB or
the live Pig server (port 3100); never kill real workers.**

## Executed

### KB-00 — Code-contract probe (read-only)
`kill-battery/kb-00-code-contract-probe.js` — asserts the STATE-MACHINE-MAP.md structural
claims against byte-exact fixture copies of the live sources
(`fixtures/s11-*.js`, sha256-verified at fetch: mission_runtime.js `24f85fc6…`,
mission_scheduler.js `7e98b7ec…`). 19/19 pass. Re-run after any substrate change;
a FAIL means the map (or the code) drifted.

### KB-01 — Projection + classifier unit tests (pure)
`kill-battery/kb-01-projection-unit.js` — the exact semantics proposed for
`src/tenanos/run/run-state-authority.ts`. 21/21 pass, including:
- expired-lease `running`/`assigned` → `UNKNOWN_EXECUTION` (never PENDING, never FAILED)
- classifier total over the evidence cube; `effectProven ⇒ reexecute === false` invariant holds
- fail-closed on unmapped statuses (throws, never defaults)

## Integration kill tests (executable plans — scratch PG required)

Shared setup (all KB-02..KB-05), on the Pig:
```bash
# 1. scratch postgres (fresh; NOT the gateway DB)
createdb -h 127.0.0.1 -p <scratch-port> kb_scratch
# 2. load the REAL substrate code read-only from /home/nolan/ping (no edits):
#    ping-runtime/orchestration/mission_runtime.js
#    ping-runtime/orchestration/mission_scheduler.js
#    ping-runtime/workers/worker_runtime.js
#    ping-runtime/events/unified_event_runtime.js
# 3. test worker 'effect-worker': on dispatch, INSERTs one row into
#    kb_effects(effect_key TEXT PRIMARY KEY, mission_id TEXT, attempt INT, at TIMESTAMPTZ)
#    with effect_key = mission_id (idempotency key), then behaves per scenario.
#    A duplicate INSERT (same effect_key) is the OBSERVABLE double-execution signal.
# 4. MissionRuntime.initialize() creates ping_missions in kb_scratch.
```
Harness skeleton: `kill-battery/kb-harness.js` (to be written at run time — it needs
the scratch PG; the scenario scripts below are the executable spec).

### KB-02 — Kill worker mid-run (the R1 proof)
1. Create mission M (type → 'effect-worker'). Scheduler claims, starts, dispatches.
2. Worker writes the effect row, then the harness SIGKILLs the worker process
   **before** it returns (simulating crash after effect, before `complete()`).
3. Wait 70s (lease 60s + margin). Observe: `reapExpiredLeases()` resets M to `created`.
4. Scheduler re-dispatches M. Worker (restarted) writes effect row again.
5. **ASSERT (current code, expected):** `kb_effects` has 2 rows for M → **double execution
   proven; the defect is reproduced.** `ping_missions.status` went
   `running → created → completed` with no record of attempt #1.
6. **ASSERT (with reconciler diff applied, expected):** M goes `running → UNKNOWN_EXECUTION`
   (lease expired, no renewal) → reconciler finds `effect_key=M` in `kb_effects` →
   `MARK_SUCCEEDED_FROM_EVIDENCE`, **no second effect row**, status `completed`
   with `reconciled_by` evidence. Attempt lineage records both attempts.

### KB-03 — Kill coordinator (scheduler process) mid-run
1. Create missions M1..M3. Scheduler claims all three (`assigned`, leases set),
   starts dispatch of M1.
2. SIGKILL the scheduler process (not the workers). Workers finish M1's dispatch
   and call `complete()` directly (they hold the runtime reference) — M1 completes.
3. Restart a fresh scheduler (new process, same DB). **Do not run any startup scan.**
4. **ASSERT (current code, expected):** M2, M3 sit in `assigned` with expired leases
   until the new scheduler's first `_poll` reaps them (60s+ after expiry). Recovery works
   **only** because the poll loop runs; there is no startup reconciliation.
   M1 is `completed` — correct.
5. **ASSERT (with reconciler diff applied):** fresh scheduler runs the startup
   reconciliation pass first: M2/M3 (assigned, lease expired, no effect evidence)
   → `NEEDS_RECONCILIATION` → classified `RETRY_ATTEMPT_WITH_LINEAGE` → re-dispatched
   immediately, not after lease-timeout. No effect rows duplicated.

### KB-04 — Timeout is not proof (effect completed, ack lost)
1. Worker writes effect row, returns `{status:'ok'}` — but the harness drops the
   return (simulates lost ack / crash between dispatch return and `complete()`,
   `mission_scheduler.js:250-273`).
2. Scheduler catch path → `_failMission` → `failWithRetry` → `retry_pending`.
3. **ASSERT (current code, expected):** on `retry_at`, mission re-dispatches and the
   effect repeats (2 rows) — **timeout treated as non-execution, proven wrong.**
4. **ASSERT (with reconciler applied):** `NEEDS_RECONCILIATION` → evidence shows
   `effect_key` present → `MARK_SUCCEEDED_FROM_EVIDENCE`, no re-execution.
   This is the KB-01 `C1` case executed end-to-end.

### KB-05 — Restart reconstruction from durable evidence
1. Seed `ping_missions` with rows in every existing state (`created`, `assigned` +
   expired lease, `running` + expired lease, `retry_pending` + past `retry_at`,
   `completed`, `failed`) and `kb_effects` rows for a subset.
2. Boot a fresh runtime (simulating gateway restart). Run the reconciler pass.
3. **ASSERT:** every row projects to the KB-01 expected canonical state;
   rows with effect evidence and terminal-inconsistent states are corrected
   (`completed` stays; `running`+expired+effect → SUCCEEDED-from-evidence;
   `assigned`+expired+no-effect → PENDING requeue with attempt lineage);
   **zero** new effect rows are written during the pass (reconstruction is read-mostly).

## Reconciliation procedure (normative — for the replacement)

When a coordinator/scheduler/worker is replaced (restart, failover, scale event),
the replacement MUST run this procedure before accepting new dispatches:

1. **Freeze dispatch.** Set a `reconciling` guard; `getPending` returns nothing until the pass completes.
2. **Project every non-terminal mission row** (`created`, `assigned`, `running`, `retry_pending`)
   through `projectMission` (KB-01 semantics). Rows projecting to `UNKNOWN_EXECUTION`
   move to `NEEDS_RECONCILIATION` (durable write; this is the state the current schema lacks —
   carried in the reconciler's own record until the schema lands).
3. **Gather evidence per NEEDS_RECONCILIATION row** (read-only):
   - effect journal: idempotency-keyed effect records (`kb_effects`-equivalent; in production,
     the connector/tool effect log owned by swarm 03's plane — read, never write);
   - event chain: `ping_events` rows with the mission's `correlation_id` (`getTrace` semantics,
     `mission_runtime.js:352-394`);
   - attempt lineage: prior attempts for this `mission_id` (the per-attempt record the schema lacks —
     the reconciler maintains it).
4. **Classify** with `classifyUnknownExecution` (KB-01). Apply the directive:
   - `MARK_SUCCEEDED_FROM_EVIDENCE` → write `completed` with `result.reconciled_from_evidence`
     (no re-execution, R-B);
   - `REQUEUE_AS_PENDING` / `RETRY_ATTEMPT_WITH_LINEAGE` → `created` with incremented
     attempt lineage (safe: positive proof of non-execution);
   - `HOLD_NEEDS_RECONCILIATION` → leave held; emit `MISSION_NEEDS_RECONCILIATION` event for
     Mission Control; a human or compensating action resolves it (coordinates with swarm 10).
5. **Never:** mark FAILED on disappearance alone (R-A); re-execute when `effectProven` (R-B);
   silently return a row to `created` without classification (R-C).
6. **Emit evidence:** every classification writes an event (`MISSION_RECONCILED` with
   `{mission_id, from, directive, evidence_refs}`) into `ping_events` via the existing
   `UnifiedEventRuntime` — the reconciler is a *reader + classifier*, not a second event authority.
7. **Unfreeze dispatch.** Resume the poll loop.

**Crash-safety of the procedure itself:** steps 2-4 are idempotent (classification is a pure
function of durable evidence; re-running the pass on the same evidence yields the same
directive). A crash mid-pass is healed by re-running the pass.

## What was NOT run (open)
- KB-02..KB-05 need a live scratch PG on the Pig (currently down) + a run of the real
  substrate files. They are written as executable specs; the harness (`kb-harness.js`)
  should be built when the scratch DB is available.
- Live-DB read-only probes (e.g. counting stuck `assigned`/`running` rows in the gateway's
  real `ping_missions`) were not run: resolving the gateway DB credentials was out of scope
  for "where safe", and a production read was not necessary for the map.
