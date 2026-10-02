# ORCA Residual Lane — Port Notes: UNKNOWN-outcome reconciliation onto the live substrate

2026-09-24. The chaos harness in this directory proves the mechanism; these
notes are the exact integration points to carry it onto the live PING
substrate. No new authority, no new store, no workflow engine.

## What was built (all in `fleet/work/orca-residual/`)

| File | Role | Live-substrate counterpart |
|---|---|---|
| `event_journal.js` | Faithful UER semantics for the harness (deterministic event IDs, `logical_id`, ON CONFLICT DO NOTHING, collision fail-closed, newest-first query) | `ping-runtime/events/unified_event_runtime.js` (read-only studied; NOT modified) |
| `idempotency.js` | `deriveOpKey({missionId, effect, input})` = sha256 over canonical logical identity | New tiny module; pure function, no state |
| `reconciler.js` | `reconcile(opKey, {journal, effector, consequence, maxAttempts})` — the reconcile-before-retry procedure | New; written ONLY against `{emit, query}` — the real UER interface — so it ports unchanged |
| `effector.js` | Worker contract: write-ahead `EFFECT_SUCCEEDED`, durable executed-op log, idempotency gate, `probe(opKey)` | Wrapper obligation on the real worker/adapter |
| `coordinator.js` | Fixed dispatch loop (`timeout -> EFFECT_UNKNOWN -> reconcile`); `OldCoordinator` kept as the T2 control | Behavior change inside `MissionRuntime` retry path + `orca_control_loop.js delegate()` |
| `chaos.js` | 6 falsification scenarios + T2 control reproduction | — |

## Integration points (ordered, smallest first)

1. **Event registry**: register six event types in
   `gateway/generated/event_registry.json`:
   `EFFECT_DISPATCHED`, `EFFECT_SUCCEEDED`, `EFFECT_FAILED`,
   `EFFECT_UNKNOWN`, `EFFECT_RECONCILED`, `EFFECT_HELD`.
   All carry `payload.op_key`. All outcome events are emitted with
   `logical_id` (`succeeded:{op_key}`, `reconciled:{op_key}:{round}`,
   `held:{op_key}:{round}`) so re-emission deduplicates at the event layer.

2. **Op key derivation** (`idempotency.js`, portable as-is): both the
   dispatcher and the worker compute
   `sha256("op:v1:" + mission_id + ":" + effect_name + ":" + canonical(input))`
   independently. Never includes attempt, timestamp, or PID.

3. **Worker wrapper** (two narrow obligations, cf. `effector.js`):
   - On completing a consequential effect: append `{op_key, result}` to the
     durable executed-op log (the formalized T2 "drop on disk"), then emit
     `EFFECT_SUCCEEDED` with `logical_id: succeeded:{op_key}`, THEN return
     the result to the coordinator. Write-ahead ordering is the T2 fix.
   - `execute()` checks the executed-op log first (durable, so it holds
     across restarts); a repeat `op_key` returns the recorded result without
     re-running the effect.

4. **Dispatcher timeout branch** (the exact T2 site):
   `orca-dispatch-test/orca_control_loop.js` `delegate()`: today
   `disp.timedOut -> timeoutEnvelope(status failed) -> WORKER_FAILED ->
   retry`. Change to: `timedOut -> emit EFFECT_UNKNOWN (logical_id
   unknown:{op_key}:{attempt}) -> reconcile(opKey) -> act on resolution`
   (recovered / retry_authorized / held / failed_terminal).

5. **`MissionRuntime` retry path**: `failWithRetry()` and
   `reapExpiredLeases()` re-queue blindly today. Before a re-queued mission
   is re-dispatched, run `reconcile(opKey)` for its consequential effects;
   `recovered` completes the mission with the recovered result instead of
   re-dispatching. This is a behavior change inside the existing mission
   authority, not a new one.

6. **Scheduler sweep** (harness `sweepUnknown`): find `EFFECT_UNKNOWN` ops
   with no terminal resolution (`EFFECT_SUCCEEDED`, recovered
   `EFFECT_RECONCILED`, or `EFFECT_HELD`) and reconcile them. Same shape as
   the existing `getPending`/`reapExpiredLeases` sweep.

## Reconcile decision table (from `reconciler.js`)

- `EFFECT_SUCCEEDED` present -> **recovered** (never re-dispatch). [T2 fix]
- definitive `EFFECT_FAILED` (retryable, attempts remain) -> **retry_authorized** (same op_key, attempt+1)
- definitive `EFFECT_FAILED` (non-retryable / exhausted) -> **failed_terminal**
- no outcome -> probe effector's durable log:
  - executed -> **recovered via probe** (recorded as `EFFECT_RECONCILED`, never fabricated as `SUCCEEDED`)
  - never executed -> **retry_authorized** (safe)
  - unknown + consequential -> **EFFECT_HELD + escalate, zero retries**
  - unknown + low consequence -> bounded risk-accepted retry

## Authority classification (by capability, not filename)

- `UnifiedEventRuntime`: unchanged, still the sole event authority.
- `MissionRuntime`: unchanged authority, extended retry behavior.
- `reconciler.js`: a PROCEDURE — owns no state, creates no competing
  truth; all facts in/out via `ping_events`. Not an authority, not a
  workflow engine.

## Chaos results (evidence: `fleet/results/orca-residual/ORU-*.json`)

- ORU-000 FALSIFIED (control): pre-fix path, 3 effects for 1 operation.
- ORU-001..006 PROVEN: exactly 1 effect under coordinator-death,
  persistence failure, lost ack, duplicate dispatch, unknown+hold, and
  restart-during-reconcile.
