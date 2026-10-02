# ORCA A6: Witnessed-Crash Proof, Kill Matrix

Task take: ORCA-A6-001 take (a) as execution policy. Kill the ambiguous middle. UNKNOWN remains UNKNOWN.

**Subject under test:** unknown-outcome foundation on branch `feat/orca-unknown-outcome-port`, repo `/home/nolan/ping` on the Pig, commit `36d401538`. Module: `ping-runtime/orchestration/effect_reconciler.js`.

**Actual API (branch wins; verified against the module, not the pinned contract):**
- `canonicalJson(v)`, `deriveOpKey({missionId, effect, input})` where `effect = workerName + ':' + event.event_type`
- `EffectLedger` (table `ping_effect_ledger`, write-ahead idempotency gate): `initialize`, `record` (INSERT ON CONFLICT DO NOTHING), `get`
- `EffectReconciler`: `queryOp`, `probe`, `decide` (pure), `reconcile`, `sweepUnknown`, `getOperationState`
- `EffectExecutor`: `execute`, `_onTimeout`
- `EFFECT_TYPES` / `TERMINAL_TYPES` are Sets. Event types: `EFFECT_DISPATCHED`, `EFFECT_SUCCEEDED`, `EFFECT_FAILED`, `EFFECT_UNKNOWN`, `EFFECT_RECONCILED`, `EFFECT_HELD`
- `UnknownOutcomeError`, `deriveInputDigest`, `describeState`
- `MissionRuntime`: `hold` / `resumeHeld` / `getHeld` (`held` invisible to `getPending()` and the reaper)
- `MissionScheduler`: dispatch routes through the executor; `UnknownOutcomeError` triggers `reconcile` then `_applyReconciliation`; `sweepUnknown` runs each poll

**Verified semantic deltas (from the implementer, confirmed in the module source):**
1. A synchronous worker throw maps to `EFFECT_FAILED` plus the original error rethrown. It is NOT unknown. Only timeout / lost-ack (no response at all) maps to `EFFECT_UNKNOWN` plus `UnknownOutcomeError`. Kill points are about lost-ack / timeout ambiguity, never about definitive throws.
2. `failDefinitive(error, {retryable})` annotates retryability on definitive failures.
3. `EFFECT_RECONCILED` carries `result`, so probe-recovered results survive restarts. The restart phase asserts the recovered result, not just the state.
4. A held op whose re-probe proves execution can still RECOVER. A prior hold does not block new evidence. Tested in the amnesia to later-proof path.
5. Unknown plus low consequence plus attempts left gives a bounded risk-accepted retry. High consequence always holds. The matrix includes one low-consequence and one high-consequence operation to verify both branches. Consequence flows from `mission.payload._effect_consequence`.
6. Ledger init is fire-and-forget in `MissionScheduler.start()` (not awaited before the dispatch timer). Documented deviation. The harness awaits init before dispatch, and chaos C-init characterizes the scheduler's actual race. If the DISPATCHED record can be lost to a kill, that is a PROOF FAILURE to report, not a harness artifact.

**Reconciler semantics under test (from `decide()`):**
- durable SUCCEEDED event -> `recovered` via `durable_succeeded_event`
- definitive FAILED, non-retryable or attempts exhausted -> `failed_terminal`
- definitive FAILED, retryable, attempts left -> `retry_authorized` (`definitive_retryable_failure`)
- no outcome on record, probe executed=true -> `recovered` via `effector_probe` (emits `EFFECT_RECONCILED` with the probe result)
- no outcome on record, probe executed=false -> `retry_authorized` (`probe_confirms_never_executed`)
- probe unknown, high consequence -> `held` (`unknown_outcome_consequential_effect`)
- probe unknown, low consequence, attempts left -> `retry_authorized` (`unknown_outcome_low_consequence_risk_accepted`)
- probe unknown, low consequence, attempts exhausted -> `held`

Note: `probe()` consults ONLY the local ledger. It never queries the provider. A missing ledger row means `executed:false`. The stub provider's ground truth is recorded as independent evidence; any divergence between probe and stub is reported plainly.

**Execution policy (binding):**
- Real process-level kills: controller sends real SIGKILL (`kill -9`) to the worker PID at the target marker. Never a simulated exception.
- The stub provider is test infrastructure (may be slow or gated to widen kill windows). The foundation module itself stays untouched.
- Test database: `ping-test-pg` container, via the env-based pool mechanism. Never production. No real credentials.
- Proof harness artifacts stay Pig-side in `~/workspace/orca/unknown-outcome-experiments/`. Read-only on the branch. No commits, no pushes, no main/master, no destructive git.
- Rendezvous polling at most 5ms.

## Harness components

- **Worker (Node):** executes one logical operation through the real `EffectExecutor` / `EffectLedger` / `EffectReconciler` from the branch. Follows the module's write-ahead discipline: `event.effect.commit()` as soon as the outcome is known (on provider accept), before dispatch returns. Emits lifecycle markers to a rendezvous JSONL file: `DISPATCH_START`, `DISPATCH_RETURNED`, `PROVIDER_ACCEPTED`, `RECEIPT_REQUEST`, `RECEIPT_BYTES`, `RECEIPT_HANDOFF`, `COMMIT_START`, `COMMIT_DONE`, `PERSIST_START`, `PERSIST_DONE`, `ACK_START`, `ACK_DONE`, `RECONCILE_START`, `RECONCILE_DONE`.
- **Stub provider:** fake external with a commit log and observable stages `accepted` vs `receipt_delivered`. `query(opKey)` returns `{accepted, receiptDelivered, outcome, proof}`. `AMNESIA` mode: accepted but record lost (provider cannot prove the outcome). May delay or gate responses to widen kill windows. Ground truth is witness evidence, never an input to the reconciler.
- **Controller:** polls the rendezvous file (at most 5ms), SIGKILLs the worker PID at the target marker, then runs the restart phase: a FRESH process, same idempotency key, runs `EffectReconciler.reconcile` plus the scheduler sweep path (`sweepUnknown`).

## The 12-point kill matrix (in order)

| # | Kill point | Target marker / mechanism | Expected outcome (module semantics) |
|---|------------|---------------------------|--------------------------------------|
| 1 | before dispatch | SIGKILL during `PRE_DISPATCH_WAIT`, before `DISPATCH_START` | no DISPATCHED event, probe false, `retry_authorized` (`probe_confirms_never_executed`), effect count 0 |
| 2 | during dispatch | stub gates the dispatch response; kill on `DISPATCH_START` after the stub log shows accepted | ledger empty (commit never ran); probe false -> `retry_authorized`; STUB DIVERGENCE recorded if the stub accepted (probe says never-executed, stub says executed x1) |
| 3 | immediately after dispatch | on `DISPATCH_RETURNED`, before receipt processing | commit landed during dispatch -> `recovered` via `effector_probe`, `EFFECT_RECONCILED` carries the result |
| 4 | after external provider accepts | stub gates the receipt; kill on `RECEIPT_REQUEST` after stub shows accepted | worker dead before receipt AND before commit (commit follows receipt); ledger empty -> `retry_authorized` (`probe_confirms_never_executed`); STUB DIVERGENCE recorded (stub accepted x1) |
| 5 | receipt in flight | kill on `RECEIPT_BYTES` plus hold | receipt bytes in worker memory, commit not yet run -> `retry_authorized`; STUB DIVERGENCE recorded |
| 6 | after receipt before durable persistence | kill on `RECEIPT_BYTES` plus longer hold | same as 5 with a longer window -> `retry_authorized`; STUB DIVERGENCE recorded |
| 7 | during persistence | on first `PERSIST_START` (the commit INSERT), kill ASAP | natural race: row almost certainly committed -> `recovered`; if the row missed, `retry_authorized` and the residual window is reported |
| 8 | after durable execution record | on second `PERSIST_DONE` (executor write-ahead), kill plus 50ms | SUCCEEDED event present or ledger row present -> `recovered`; effect count exactly 1 |
| 9 | before coordinator acknowledgement | durable outcome exists; kill before `ACK_START` | `recovered`; restart completes the idempotent ack |
| 10 | after coordinator acknowledgement | on `ACK_DONE` | fully complete; kill is a semantic no-op; final result stable |
| 11 | during reconciliation | restart with delayed ledger probe; SIGKILL the restart on `RECONCILE_START` | first reconcile dies mid-probe; second restart re-runs reconcile idempotently |
| 12 | during restart reconciliation | kill the sweep process mid-run | next restart resumes cleanly; no partial terminal state |

## Per-kill-point record (JSONL, one line per point)

Fields: `mission_id`, `run_id`, `work_order_id`, `attempt_id`, `logical_operation_id`, `idempotency_key`, `dispatch_state`, `effect_evidence`, `durable_evidence`, `reconciliation_state`, `retry_eligibility`, `final_result`, `effect_count`.

## Terminal path demonstrations (after the matrix)

- T-succ: `PROVEN SUCCEEDED`: clean run, durable SUCCEEDED event, `recovered` via `durable_succeeded_event`, effect count 1, ack idempotent.
- T-fail: `PROVEN FAILED`: `failDefinitive({retryable:false})` then throw -> `EFFECT_FAILED` -> reconcile -> `failed_terminal`. Retryable variant -> `retry_authorized` (`definitive_retryable_failure`).
- T-never: `PROVEN NEVER EXECUTED`: point-1 style, probe false, stub proves absent, retry eligible.
- T-hold: `STILL UNKNOWN` then later proof: hide the ledger table so the probe fails -> `held`, durable `EFFECT_HELD`, mission parked via real `MissionRuntime.hold` (invisible to `getPending()`); restore the table -> re-probe proves execution -> `EFFECT_RECONCILED` with the recovered result, mission resumed via `resumeHeld`.
- T-low: low-consequence op, timeout, probe unavailable -> `retry_authorized` (`unknown_outcome_low_consequence_risk_accepted`); high-consequence twin -> `held`.
- T-throw: sync worker throw is `EFFECT_FAILED`, NOT `EFFECT_UNKNOWN` (delta 1).

## Required final assertion (programmatic, fails the proof if violated)

UNKNOWN EXTERNAL OUTCOME REMAINS UNKNOWN.

- Never `UNKNOWN -> FAILED` merely because the coordinator died.
- Never `UNKNOWN -> SUCCESS` without durable evidence.
- Never `UNKNOWN -> RETRY` except through a `decide()` `retry_authorized` with a recorded reason (never blind).
- A `recovered` outcome must carry durable evidence: a SUCCEEDED event or a probe row, and the recovered result must match the committed result across restarts.
- Any probe-vs-stub divergence (probe says never-executed while the stub accepted) is a PROOF FINDING reported plainly, not papered over.
- `STILL UNKNOWN` is a valid terminal state and must HOLD with no retry.

## Extended chaos suite (after the matrix)

- C0: boundary characterization. Delayed commit (naive worker), kill in the accept-to-commit window: probe false -> `retry_authorized`; perform the retry -> effect count 2. Names the residual window.
- C1: duplicate reconciliation (same op reconciled twice concurrently) -> racing guard or idempotent no-op, one terminal event.
- C2: stale worker response arriving after UNKNOWN was recorded -> late settle absorbed, no duplicate effect.
- C4: two reconcilers racing -> one wins, the other defers.
- C5: repeated restart (3x) -> stable terminal state.
- C6: retry storm (N rapid reconcile attempts) -> effect count stays 1, no duplicate terminals.
- C7: mission replay with the same mission_id -> idempotency gate returns `duplicate`, count stays 1.
- C8: replacement coordinator resuming the same mission -> reconcile then clean resume.
- C9: timeout -> `EFFECT_UNKNOWN` -> late settle lands -> reconcile recovers with the result; sweep path exercised.
- C-init: ledger init fire-and-forget race (delta 6): dispatch without awaiting init, observe whether the DISPATCHED record survives.

## Gate-secret-001 scrub audit (last step)

Inspect all proof artifacts, logs, temp files, and command history; search bounded locations (experiment dir, /tmp files touched, repo branch diff) for leaked credential material; remove temporary sensitive material; scrub em dashes from harness-owned artifacts; keep only redacted proof. Report states only `SECRET MATERIAL FOUND: YES/NO` (expected NO; stub provider only, test DB via env mechanism; "credential was used through authorized mechanism" is the claim, never a value).
