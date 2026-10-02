# ORCA Control Loop Design (section 20 vertical slice)

**Date:** 2026-09-18
**Code:** `orca/control-loop/orca_control_loop.js` (runs on Pig WSL, node 22)
**Launcher:** `orca/control-loop/run-loop.sh` (resolves PG credentials at the process boundary from the live gateway container env; values never touch disk or logs)
**Dispatcher:** `orca/control-loop/hermes_dispatch.py` (Pig-side; mirrors the proven `hermes-launch.py` invocation exactly, prompt path via argv so concurrent dispatchers never clobber `hermes-prompt.txt`)
**Vendored (do not edit):** `orca/control-loop/vendor/external-agent/external_agent_adapter.js` (sha256 `1564dd8a35264f9a12c8729f16308d76d586abc9232fa06a3668cc7cfb0adb3a`, byte-identical to the proven `ping-harvest-12h` reference); `vendor/canonicalization` is a symlink to the adapter's proven dependency.

## 1. Stage map (every transition backed by persisted evidence or runtime state)

| Stage | Implementation | Evidence |
|---|---|---|
| Objective (human, once) | `--objective=` argv, default recorded | `evidence/run-*/00-objective.json` |
| OBSERVE | `MissionRuntime.getStats/getPending/getActive`, `ping_events` 24h counts, most-recent completed mission, gateway `/health` | `01-observe.json` |
| PLAN | objective → tasks with capability + constraints; follow-up policy declared | `02-plan.json` |
| AUTHORIZE | `adapter.authorizeWorkOrder` per task; denial → Escalation | console + `workorder-*.json` (absent on denial) |
| DELEGATE | `adapter.issueWorkOrder` (deterministic id, constant principal) → Hermes dispatch → stdout capture → envelope extraction | `workorder-{t1,t2}.json`, `dispatch-{t}-a{n}.json` |
| MONITOR | 180s dispatcher timeout < 10min work-order deadline; timeout → honest `failed` envelope, never fabricated success | `dispatch-*.json` (`timedOut`) |
| VERIFY | `adapter.verifyResultEnvelope` → `adapter.recordVerifiedResult` with PING's `UnifiedEventRuntime` → `WORKER_COMPLETED`/`WORKER_FAILED` canonical event | `verify-{t}-a{n}.json`, `result-{t}.json`, canonical `ping_events` row |
| ASSESS | parse verified output + observation; remaining work = non-terminal missions found, plus structural evidence-chain verification | `20-assess.json` |
| FOLLOW-UP | task-2 input built from **live state at follow-up time** (`getTrace` of the most recent completed mission); `causation_id` = task-1's `WORKER_COMPLETED` event_id | `workorder-t2.json` |
| RETRY | worker-reported `failed` → same taskId re-issued with `attempt+1` (same `work_order_id`, idempotent), max 2 attempts | `dispatch-{t}-a2.json` |
| ESCALATE | auth denial / envelope invalid (non-retryable per contract) / retries exhausted / emit rejected → `99-escalate.json`, exit 3 | `99-escalate.json` |
| CLOSE | all verified → `99-close.json` with work-order IDs, event IDs, assessment; exit 0 | `99-close.json` |

## 2. Bounds (bounded autonomy, enforced by mechanism)

Max 2 work orders per run; max 2 attempts per work order; 180s dispatcher timeout; 10-minute absolute deadline (`verifiedAt > deadline` → invalid, non-retryable). No 0.8 knowledge threshold on this path. The loop emits no canonical events itself; the only canonical writer is PING's `recordVerifiedResult`. No mission-table writes (read-only SELECTs). No new stores, queues, or authorities.

## 3. Witnessed run: orca-run-mu6wmbzn (2026-09-18 ~11:57-12:01 UTC)

Objective: audit the live PING mission queue (summarize backlog by status), then verify the evidence chain of the most recent completed mission.

- **t1** (`text.summarize`, hermes): authorized → issued `work_order_id=59facef566e9be5d` → Hermes returned a real 8-field envelope (queue_summary: 191 completed / 0 pending / 0 active; 21/21/21/21 lifecycle events in 24h; `non_terminal: []`) → `verifyResultEnvelope` valid → `recordVerifiedResult` → `WORKER_COMPLETED event_id=bce4d7cb2bed2ba166d5fbcd4c03441cfb82456a9e95c744603d24f79c09b146`, `result_id=ecc5013d4884ba08a4b1e28f7bdfe358eb7a9122c8d6c8cf780f81197b94b652`.
- **ASSESS:** no non-terminal missions; structural remaining work = evidence-chain verification → follow-up scheduled autonomously.
- **t2** (`text.transform`, hermes, `causation_id=bce4d7cb...`): input = live `getTrace(70bd4b9d034b94a4)` (8 chain events) → issued `work_order_id=f38d200eb01cbfc0` → verified → `WORKER_COMPLETED event_id=bf88809f14fa55d426fbbf1dd46abb12905cdf7c2fbe8840464f7340b2e3605d`.
- **CLOSE:** exit 0. Both events share `correlation_id=orca-run-mu6wmbzn`; t2's `causation_id` = t1's event_id. Event identity recomputed locally → exact match (see SPINE-TRACE.md section 5).
- **Side-effect audit:** mission rows still 191 (loop created none); 0 `WORKER_FAILED`; exactly 2 new `WORKER_COMPLETED`; 7 missions created in the hour by the live gateway's own scheduler (not the loop).

## 4. Known flaw in this run (loop input, not runtime): t2 false negative

t2's worker output reported `chain_complete: false` with all four `MISSION_*` lifecycle events as gaps. Independent audit shows the true chain **is** complete (`MISSION_CREATED→ASSIGNED→STARTED→COMPLETED` all present for `70bd4b9d034b94a4`, `result` recorded). Root cause: the loop's `trimMission` dropped the `result` field, and `getTrace`'s correlation query only returns the worker-chain events (`MISSION_*` events carry their own correlation_ids since `MissionRuntime` emits them without one). The worker was honest relative to its lossy input: it reported what it could not see rather than fabricating completion. Fix for the next run: include `result_recorded` in the mission trim and query `MISSION_*` events by `payload->>'missionId'` alongside the correlation trace. Documented here instead of re-running.

## 5. What the loop deliberately does not do

- No `MissionRuntime.create` calls (mission truth stays with the bridge/runtime).
- No `startAutonomousLoop` / synthetic outputs (the facade path is untouched and preserved).
- No ORCA-owned event store, mission DB, worker queue, or second authority of any kind.
- No dependency on lead (d)'s pending dispatcher-profile registrations; consumes only the currently registered `hermes` profile.
- The `codex`/`opencode` profiles and the `0.8` knowledge threshold are out of scope for this slice.

## 6. Remaining gaps (for the program)

- **G1 (loop input fidelity):** fix t2 trace assembly per section 4.
- **G2 (dispatcher families):** Ollama / Copilot broker / cloud subagents have no `AGENT_PROFILES` entries, so `authorizeWorkOrder` denies them; blocked on lead (d). The loop is family-agnostic by construction (agentId + capability are parameters).
- **G3 (branch divergence):** this branch's `ping-runtime/canonicalization/canonicalization_service.js` does not export `NAMESPACE_RE`, which the proven adapter requires; the loop works around it with a symlink to the proven copy's dependency. The divergence should be reconciled by whoever owns that file.
- **G4 (restart resilience / A6):** loop state is the evidence dir + idempotent work_order_ids; kill-and-restart behavior not yet tested.
- **G5 (continuous operation / A7):** single witnessed run only; no iteration budgets beyond per-run caps, no storm detection.
- **G6 (planner generality):** decomposition is objective-specific; wiring `MissionCompiler`'s catalog for general objectives is future work.
