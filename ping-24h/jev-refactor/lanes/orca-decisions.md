# LANES A+E: ORCA Current Loop + Full PING Decision Surface Archaeology

**Date:** 2026-09-28 ~18:30 MDT. **Lane:** A+E (read-only). **Mode:** read-only harvest, no writes to any codebase, no new authority of any kind.
**Sources (all read live this run):**
- Pig canonical tree `/home/nolan/projects/ping` @ `f877c3919941978f07d5014909595df4751ec258`, branch `fyd/builder-harvest-trackc-2026-09-28`, working tree DIRTY (69 modified files, FYD/ask/MC surface; read-only, untouched). NOTE: prior lanes pinned `0264d517`; the tree has moved since.
- `/home/nolan/workspace/orca-adapter/` (adapter.js, vendor/external_agent_adapter.js, outcomes.js, evidence/, test/)
- `/home/nolan/workspace/mission-control/` (mission_intent.py, proposal_record.py)
- `/home/nolan/workspace/orca-dispatch-test/`, `orca-remediation/`, `orca/`, `orca-workstream-d/`
- `/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js` (259 lines, verified live)
- `/home/nolan/ping-gateway-src/` (gateway source matching live image `ping-gateway:repair-cert-20260924`; containers ping-gateway, ping-postgres, ping-qdrant, ping-redis, ping-vault, ollama, brain-postgres, brain-qdrant, open-webui all live)
- `/home/nolan/workspace/pig-fb/copilot-broker/src/` (broker.js, task-tiers.js, jsonl-classifier.js, quota-model.js, cost-model.js)
- Prior work extended, not redone: `~/workspace/ping-24h/jev-autonomy/JEV_PING_AUTONOMY_MAP.md`, `ORCA_DECISION_INVENTORY.md`. Their headline findings VERIFY against the current tree: (a) the Orca dispatch plane still makes zero LLM calls for any decision; the LLM enters only at the worker boundary (`adapter.js:1120 dispatchHermes` -> `prompt-hermes.sh`/`hermes_dispatch.py` -> `hermes_cli/main.py --safe-mode -z`); (b) zero live LLM API calls in the canonical ping tree (only a provider enum entry; the OpenAI classifier throws "not yet implemented" per prior grep); (c) model is static worker-profile config (AGENT_PROFILES: hermes/openrouter, ollama qwen2.5-coder:1.5b, cloud-subagent, copilot identities 1-4); there is still no per-decision model routing on the Orca path. CORRECTION to prior: `AIRuntime.selectModel()` (`ping-gateway-src/ping-runtime/ai/ai_runtime.js:127`) IS a per-call model-routing decision in code (preferProvider > preferLocal(ollama) > defaultProvider), live at gateway boot and exposed on `/api/v1/ollama` and `/ai` routes; the canonical workers on the live business path do not use it (only the dormant IntelligenceWorker and embedding_service call it).

---

## PART A: ORCA'S CURRENT LOOP, END TO END

### A1. There are two live loops, one dormant engine

**Loop 1: the gateway live spine (business path, always on).** `UnifiedEventRuntime` (Postgres `ping_events`) -> `EventToMissionBridge` (28 business event types mapped to mission types, `event_to_mission_bridge.js:25-69`) -> `MissionRuntime` (PG `ping_missions`; create/assign/start/complete/fail/failWithRetry/renewLease/reapExpiredLeases/getPending) -> `MissionScheduler` 5s poll (`mission_scheduler.js:145 _poll`: Arrow 0 renew leases, Arrow 1 reap expired, Arrow 2 dispatch via static `MISSION_WORKER_MAP` :41) -> `WorkerRuntime.dispatch()` (first-match on registered `eventTypes`, `maxConcurrent` guard, `worker_runtime.js:69`) -> canonical worker `handle(event)` in-process -> worker emits the next PING event, which the bridge picks up again. Boot order confirmed in `gateway/bootstrap/gateway_runtime.js:513-632`; 8 canonical workers registered (`registerCanonicalWorkers`, intelligence skipped as dormant, `canonical_workers.js:690-761`). This loop contains NO LLM call anywhere: every step is deterministic code (static maps, conditional SQL, event-type string matching).

**Loop 2: the Orca dispatch plane (mission plane, coordinator-driven).** `mission_intent.py`: `validate` (:327) -> `authorize` (:468, delegates to the vendored authority) -> `_issue_work_order` (:565) -> `dispatch` (:626, revocation enforced inside dispatch, H7 defect-3) -> `observe` (:998); `submit` (:1044) runs the full pipeline. `adapter.js dispatchExecution` (:1202): identity fence (5..10 DENIED) -> `authorizeWorkOrder` (8 fail-closed checks, `vendor/external_agent_adapter.js:192`) -> `resolveTenantId` (:89, fail-closed on namespace contradiction) -> `reconcileGate` (:429, idempotency + prior-outcome + artifact-exists under cross-process index lock) -> `issueWorkOrder` (deterministic `work_order_id = sha256('workorder:'+taskId)[0:16]`) -> `buildWorkerPrompt` (:593) -> `dispatchHermes` (:1120) -> `extractEnvelope` brace-match (:649) -> `verifyResultEnvelope` (:313, 8-field structural echo-binding, failure non-retryable) -> `recordVerifiedResult` -> canonical `WORKER_COMPLETED` event. The orca control loop wraps this in OBSERVE -> PLAN -> AUTHORIZE -> DELEGATE -> MONITOR -> VERIFY -> ASSESS -> FOLLOW-UP -> RETRY/ESCALATE/CLOSE (`orca-dispatch-test/CONTROL-LOOP-DESIGN.md`; `assessAndFollowUp` at `orca-remediation/orca_control_loop.js:924` is deterministic presence-bit logic writing `20-assess.json`). The loop SHELL is deterministic; the thinking enters at exactly the points named in A2.

**Dormant: the old ORCA ExecutionEngine.** Still instantiated at gateway boot (`gateway_runtime.js:360-366`) and mounted at `/orchestration` (:899-900), but the audit verdict holds in the current source: nothing on the live business path calls it. Its decisions (`mission_compiler.js` 10 MISSION_TYPES, `capability_registry.js` SHA-256 hash-pick worker selection, `consensus_engine.js`, `merge_gate.js`, `context_authority.js`, `artifact_router.js`) are DECLARED-ONLY/DORMANT. `OmniRouter` has NO implementation anywhere (2026-09-13 audit: design spec only, verdict BLOCKED); the spec file is gone from the current canonical tree (`grep -rln OMNIROUTER` on `/home/nolan/projects/ping` returns nothing). Status: DECLARED-ONLY, now effectively ABSENT.

### A2. Where the expensive frontier deliberation happens today (top 3)

**Site 1: the worker's internal agentic loop (the single LLM boundary).** `dispatchHermes` hands the ENTIRE work order (taskBrief + 14-field envelope + binding constraints + redacted inputs) to one agent process (`hermes_cli/main.py --safe-mode -z`, or a copilot broker session, or cloud-subagent). Every internal decision, tool choice, what-next, search-then-read, self-assessment, happens as frontier-model deliberation inside that agent's own think/tool loop, uninstrumented and unbudgeted per step. Frequency ~30 dispatches/day. Latency 3s (ollama) to 180s+ (adapter `timeoutMs=120000`, control-loop `DISPATCH_TIMEOUT_MS=180000`). Cost UNKNOWN: no cost surface exists on this path (copilot `cost-model.js` is ESTIMATE-labeled and copilot-only). This is the MISSION -> AGENT THINKS -> SEARCH -> AGENT THINKS -> TOOL -> AGENT THINKS -> VERIFY -> AGENT THINKS pattern in its purest form: one giant thinking loop per work order. Negative evidence stands: the archived 2026-09-26 Jev routing project measured that Jev tool-selection/compaction inside such a loop did NOT generically reduce token usage versus plain truncation. The correct play is judging the RESULT outside the loop (C-01), not the process inside it.

**Site 2: the coordinator LLM procedures (the mission-driving loop).** The deterministic loop shell is driven by a coordinator agent (Muse) that performs: PLAN (objective -> tasks with capability + constraints, `CONTROL-LOOP-DESIGN.md` stage map), `taskBrief` authoring (the capability choice, bounded by the profile allowlist + `authorizeWorkOrder`), WAITING_APPROVAL triage (mission state -> hold/propose/escalate; zero code hits, pure operator procedure, ~5/day), grill-20 per-check pass/fail judgments (~10/day, verdict composition deterministic). This is the second instance of the pattern: MISSION -> AGENT THINKS -> TOOL (observe/dispatch) -> AGENT THINKS -> VERIFY -> AGENT THINKS. Latency is agent-time (minutes per mission); cost unmetered. These are the D1 Jev candidates C-02/C-04/C-05 (bounded, typed, advisory) precisely because they are the only frontier deliberation on the dispatch plane besides the worker body.

**Site 3: Meta AI research delegation.** `~/workspace/pig-fb/meta-ask.js` (Pig headed-Chrome CDP :9223) + context packs from `tandem/build-context-pack.py`; open-ended research answers with provenance sidecars, gated by human `mark-verified.sh` before any canonical use. On demand; latency minutes (browser automation); cost unmetered (web UI). Stays D2: open-ended research, verification gate is the control.

Honorable mention (not frontier): the gateway live spine burns ZERO model calls per event by construction; the only per-event "intelligence" is static maps and conditional SQL. The forward risk is inverted from the usual: the danger is ADDING per-event model calls (e.g. a future Ask agent path, or per-event Jev) without the D0 funnel first.

### A3. Compilation points: where a mission could become a work graph instead of one giant thinking loop

1. **`submit()` (`mission-control/mission_intent.py:1044`)**: validate -> authorize -> dispatch -> observe. Already a staged pipeline; the compiled unit is the work order. The gap: `dispatch` hands one compiled unit to one thinking loop (Site 1). Compilation point: `_issue_work_order` could fan one intent into N sub-orders with causation links instead of one brief.
2. **PLAN stage (control loop)**: objective -> tasks with capability + constraints. Today a coordinator-LLM procedure; the dormant `mission_compiler.js` (10 MISSION_TYPES: ENTROPY_REDUCTION, WITNESS_IMPROVEMENT, DEAD_CODE_AUDIT, REPLAY_PROOF, DEPENDENCY_AUDIT, AUTHORITY_AUDIT, SERIALIZATION_AUDIT, DOCUMENTATION, TEST_GENERATION, CERTIFICATION) was the automated compiler for this exact step. Reviving compilation here as deterministic code (catalog + evidence-driven tasking) is the work-graph seam.
3. **`dispatchExecution` (`orca-adapter/adapter.js:1202`)**: reconcile gate -> issue -> buildWorkerPrompt -> transport -> extract -> verify. The prompt is compiled from (workOrder, taskBrief, tenantId); the taskBrief is the single free-text artifact that currently smuggles the whole mission into the worker's loop. Compilation point: brief -> subtask graph with per-subtask envelopes and per-subtask verification, each sub-envelope independently reconcilable.
4. **`EventToMissionBridge` (`event_to_mission_bridge.js:64-94`)**: 1 event -> 1 mission via the static 28-type map. Fan-out point: one business event could compile to a small mission DAG (e.g. REVIEW_RECEIVED -> REVIEW_RESPONSE + REVIEW_ACK are already two rows; the map is the compiler).
5. **`assessAndFollowUp` (`orca_control_loop.js:924`)**: verified state -> remaining-work list -> follow-up work orders with `causation_id` = prior `WORKER_COMPLETED` event_id. Already a graph edge (causation chaining); the compilation is manual per objective today.
6. **`MISSION_WORKER_MAP` (`mission_scheduler.js:41`)**: mission_type -> worker name, static. The task-routing compiler; today a constant, the thing a work-graph scheduler would generate.

### A4. Edge trace of one real operation

Traced operation: the witnessed control-loop run **orca-run-mu6wmbzn** (2026-09-18 ~11:57-12:01 UTC, documented in `orca-dispatch-test/CONTROL-LOOP-DESIGN.md` sections 3-4 with evidence files `00-objective.json` through `99-close.json`, event_ids `bce4d7cb...`/`bf88809f...`, work_order_ids `59facef566e9be5d`/`f38d200eb01cbfc0`). Objective: audit the live PING mission queue, then verify the evidence chain of the most recent completed mission.

| # | Edge | Status | Evidence |
|---|---|---|---|
| 1 | MISSION -> QUESTIONS | REACHED | Objective argv recorded in `00-objective.json`; PLAN compiled objective -> tasks (`02-plan.json`); ASSESS derived remaining-work questions from verified state (`20-assess.json`) |
| 2 | QUESTIONS -> DECISION UNITS | REACHED | `classifyDelegation` per task -> typed decisionRecord (AUTO_EXECUTE/REQUIRES_HUMAN_APPROVAL/PROHIBITED); `authorizeWorkOrder` verdict per dispatch |
| 3 | DECISION UNITS -> EVIDENCE | REACHED | Delegation decision triggered evidence assembly: `MissionRuntime.getStats/getPending/getActive`, `ping_events` 24h counts, `getTrace(70bd4b9d034b94a4)` for the follow-up task input |
| 4 | EVIDENCE -> PROCESSOR | REACHED **but BROKEN** | **FIRST BROKEN REACHED EDGE (witnessed).** The loop's `trimMission` dropped the `result` field and `getTrace`'s correlation query returned only worker-chain events (MISSION_* lifecycle events carry their own correlation_ids). t2's worker received a lossy chain and honestly reported `chain_complete: false` with all four MISSION_* events as gaps, while the true chain was complete (MISSION_CREATED->ASSIGNED->STARTED->COMPLETED all present, `result` recorded). The processor (prompt builder/dispatcher) faithfully transmitted incomplete evidence; the failure is in evidence ASSEMBLY, not in the worker's honesty. Documented as G1 in CONTROL-LOOP-DESIGN.md section 4/6. |
| 5 | PROCESSOR -> AUTHORITY | REACHED | `dispatchExecution` runs `authorizeWorkOrder` BEFORE any transport invocation; denial -> typed `denied` with `refusal_source` (identity-policy / capability-authority), `effect_state: NONE` |
| 6 | AUTHORITY -> CAPABILITY | REACHED | Capability membership in the agent profile allowlist is check #4 of the 8 ordered `authorizeWorkOrder` checks; `AGENT_PROFILES` (`external_agent_adapter.js:60`) registers the four dispatcher families |
| 7 | CAPABILITY -> WORKER | REACHED (thin) | `agentId` is caller-supplied (loops hardcode `AGENT_ID='hermes'`); no selection authority exists. The edge is traversed but the decision is a constant, not a choice. This is the Jev-sized hole (executor selection among eligible workers). |
| 8 | WORKER -> ATTEMPT | REACHED | `reconcileGate` idempotency key + prior-outcome lookup under cross-process index lock; attempt numbering (`dispatch-t1-a1.json`, retry re-issues same taskId with attempt+1, max 2) |
| 9 | ATTEMPT -> ARTIFACT | REACHED | `result-{executionId}-a{n}.json` written by the adapter (worker never writes here); `workorder-*.json`, `dispatch-*.json`, prompt artifact; artifact-exists check refuses overwrites |
| 10 | ARTIFACT -> VERIFICATION | REACHED (shallow) | `verifyResultEnvelope` 8-field structural echo-binding; `recordVerifiedResult` -> canonical `WORKER_COMPLETED` event. Structural only: a plausible-wrong `completed` passes (the O5 gap; Jev candidate C-01). |
| 11 | VERIFICATION -> OUTCOME | REACHED | Closed vocabulary `outcomes.js` (completed/failed/unknown/denied/escalated + EFFECT_STATE); `99-close.json` / `99-escalate.json`; UNKNOWN never collapses to FAILED |

BYPASSABLE edges (honest note): in the DORMANT old-engine path, PROCESSOR -> AUTHORITY was bypassed (the engine built prompts and assigned workers via its own capability_registry without calling `authorizeWorkOrder`). That path is mounted but never invoked by the live business path. On the live paths, no bypass of AUTHORITY was found.

---

## PART E: FULL PING DECISION SURFACE ARCHAEOLOGY

Legend: DET? = deterministic code. JEV? = bounded-Jev candidate per the program's D1 definition (typed, advisory, shadow-first, never authority). FRONTIER? = requires frontier-scale generative reasoning today. AUTH? = authority-sensitive (Jev may never touch; human or deterministic authority only). EVAL = evaluation data available. Class: DETERMINISTIC / JEV-CANDIDATE / DEEP-REASONING / HUMAN-AUTHORITY / UNKNOWN. Cost/latency: "0/ms" = no model call. "UNKNOWN" cost = no metering exists on that path (a finding, not a gap in this report).

### E1a. ORCA dispatch plane (orca-adapter)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-01 | May this agent do this capability? (dispatch?) | `orca-adapter/vendor/external_agent_adapter.js:192` `authorizeWorkOrder` | {agentId, capability, namespace, constraints} + AGENT_PROFILES -> GRANT/DENY + 1 of 8 typed reasons | ~30/d | none | 0 | ms | YES | NO | NO | YES | lane-11 shadow n=6 agree | DETERMINISTIC |
| D-02 | Which worker/model handles this? | `orca-adapter/adapter.js:1202` `dispatchExecution` (opts.agentId; loops hardcode `AGENT_ID='hermes'`) | caller param/constant -> worker profile | ~30/d | none (static) | 0 | 0 | YES (trivial) | YES (executor selection among eligible) | NO | NO (selection != authorization) | none (no rationale recorded) | DETERMINISTIC |
| D-03 | Identity fence (5..10 denied) | `orca-adapter/adapter.js:~1225` DENIED_IDENTITY_IDS | agentId -> DENIED + authorization_refusal, effect NONE | per dispatch | none | 0 | ms | YES | NO | NO | YES | selftest | DETERMINISTIC |
| D-04 | Tenant binding | `orca-adapter/adapter.js:89` `resolveTenantId` | {tenantId, namespace} -> tenant_id or fail-closed throw | per dispatch | none | 0 | ms | YES | NEVER | NO | YES | tenant-threading-selftest.js | DETERMINISTIC |
| D-05 | Retry or duplicate? | `orca-adapter/adapter.js:429` `reconcileGate` (+:445 locked) | idempotency key + index + artifact-exists -> allowed / duplicate_attempt / reconciliation_required / artifact_exists / idempotency_index_corrupt | per dispatch | none | 0 | ms | YES | NO | NO | NO | reconcile-gate-selftest.js, falsify-index-race.js | DETERMINISTIC |
| D-06 | Is the result bound and well-formed? | `vendor/external_agent_adapter.js:313` `verifyResultEnvelope` | 8-field envelope + work order -> valid / invalidResult (non-retryable) | per dispatch | none | 0 | ms | YES | NO | NO | NO | structural | DETERMINISTIC |
| D-07 | Outcome vocabulary | `orca-adapter/outcomes.js:24-39` | worker/adapter signals -> completed/failed/unknown/denied/escalated + EFFECT_STATE | per dispatch | none | 0 | 0 | YES | NO | NO | NO | ledger-selftest.js | DETERMINISTIC |
| D-08 | Is the worker's self-reported status TRUE? | NO CODE (gap; `verifyResultEnvelope` is structural only) | envelope + stdout excerpt + evidence -> completed/failed/unknown + confidence | ~30/d | none today | 0 today | n/a | NO | YES (C-01, top rank) | NO | NO (advisory only; can never override structural FAIL or promote to completed) | completion-corpus (16 items) | JEV-CANDIDATE |
| D-09 | Build the worker prompt | `orca-adapter/adapter.js:593` `buildWorkerPrompt` (template) + coordinator-written taskBrief | (workOrder, taskBrief, tenantId) -> prompt text | ~30/d | template + coordinator LLM | UNKNOWN (brief) | agent-time | PARTIAL | YES (C-04 brief quality gate) | PARTIAL (brief authoring) | NO | historical briefs in evidence dirs | JEV-CANDIDATE (gate) / DEEP-REASONING (authoring) |
| D-10 | Extract result envelope from stdout | `orca-adapter/adapter.js:649` `extractEnvelope` (brace-matching) | worker stdout -> 8-field JSON or extraction failure | per dispatch | none | 0 | ms | YES (fragile: second JSON object shifts extraction) | NO | NO | NO | result-smoke-e1-a1.json | DETERMINISTIC |
| D-11 | Redact secret-shaped material | `orca-adapter/adapter.js:930` `redactWorkerText`, :808 `secretShapedAnywhere` | worker text -> redacted text + secret-hit flags | per dispatch | none | 0 | ms | YES | NO | NO | YES (secret handling) | secret-redaction-selftest.js | DETERMINISTIC |
| D-12 | Record attempt outcome | `orca-adapter/adapter.js:559` `recordAttemptOutcome` | (gate, execution, result, artifactPath) -> index line | per dispatch | none | 0 | ms | YES | NO | NO | NO | index | DETERMINISTIC |

### E1b. Mission Control (mission_intent.py + proposal records)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-13 | Is the mission intent well-formed? | `mission-control/mission_intent.py:327` `validate` | intent dict -> canonical intent or IntentValidationError | per mission | none | 0 | ms | YES | NO | NO | NO | tests/ | DETERMINISTIC |
| D-14 | Authorize the intent | `mission_intent.py:468` `authorize` (delegates to vendored adapter) | (intent, agent_id, constraints) -> verdict {granted, reason,...}; unreachable authority raises (fail-closed) | per mission | none | 0 | ms | YES | NO | NO | YES | tests/ | DETERMINISTIC |
| D-15 | Issue the work order | `mission_intent.py:565` `_issue_work_order` | (intent, verdict) -> work order record | per mission | none | 0 | ms | YES | NO | NO | NO | journal | DETERMINISTIC |
| D-16 | Dispatch (revocation enforced) | `mission_intent.py:626` `dispatch` | (intent, verdict, executor) -> dispatched or refused-revoked | per mission | none | 0 | ms | YES | NO | NO | YES | H7 defect-3 tests | DETERMINISTIC |
| D-17 | Revoke a mission | `mission_intent.py:883` `revoke` | (idempotency_key, reason) -> revocation record | on demand | human | 0 | human-time | NO | NO | NO | YES | journal | HUMAN-AUTHORITY |
| D-18 | Observe mission state | `mission_intent.py:998` `observe` | stage events + journal -> observation | per mission | none | 0 | ms | YES | NO | NO | NO | journal | DETERMINISTIC |
| D-19 | Run the full lifecycle | `mission_intent.py:1044` `submit` | intent -> validate->authorize->dispatch->observe chain | per mission | none | 0 | ms | YES | NO | NO | NO | tests/ | DETERMINISTIC |
| D-20 | Resolve tenant / check entitlement | `mission_intent.py:222` `resolve_tenant`, :247 `check_agent_entitlement` | (auth_ctx, intent) -> tenant or fail-closed; entitlement set (empty = deny) | per mission | none | 0 | ms | YES | NEVER | NO | YES | tests/ | DETERMINISTIC |
| D-21 | Record a WAITING_APPROVAL proposal | `mission-control/proposal_record.py:60` `record_proposal` | (proposal, mission_id) -> proposal_id = f(mission_id, digest) | ~5/d | none | 0 | ms | YES | NO | NO | YES (approval door) | proposal store | DETERMINISTIC |

### E1c. Orca policy + control loop (worktree + remediation)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-22 | Classify a delegation | `worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js:110` `classifyDelegation` | (capability, bounds, auth verdict) -> AUTO_EXECUTE / REQUIRES_HUMAN_APPROVAL + decisionRecord | per dispatch | none | 0 | ms | YES | NO | NO | YES | policy tests | DETERMINISTIC |
| D-23 | Retry or escalate? | `orca_policy.js:157` `classifyRetry` | (attempt, maxAttempts, failureKind) -> AUTO_EXECUTE (worker-failed/timeout, attempt+1) / REQUIRES_HUMAN_APPROVAL (validation-failed/auth-denied/emit-rejected/exhausted) | per failure | none | 0 | ms | YES | NO | NO | NO | failure taxonomy | DETERMINISTIC |
| D-24 | Accept worker result as truth? | `orca_policy.js:215` `classifyResultAcceptance` | () -> always REQUIRES_VERIFICATION (ORCA is not the evidence authority) | per result | none | 0 | 0 | YES | NO | NO | YES | n/a | DETERMINISTIC |
| D-25 | Follow up from this evidence? | `orca_policy.js:199` `classifyFollowUp` | derivedFromVerified? -> REQUIRES_VERIFICATION (plan-follow-up) / REQUIRES_HUMAN_APPROVAL | per assessment | none | 0 | ms | YES | NO | NO | NO | 20-assess.json history | DETERMINISTIC |
| D-26 | Is follow-up needed / what remains? | `orca-remediation/orca_control_loop.js:924` `assessAndFollowUp` | verified output + observation -> remainingWork list + followUpNeeded bool | per run | none | 0 | ms | YES | YES (C-03 evidence-chain completeness, advisory) | NO | NO | 20-assess.json history | DETERMINISTIC |
| D-27 | PLAN: objective -> tasks | Coordinator-LLM procedure (no code; CONTROL-LOOP-DESIGN.md stage map) | objective text -> tasks {capability, constraints} | per run (~10/d) | coordinator LLM | UNKNOWN | agent-time | NO | PARTIAL (C-04 brief gate; plan triage) | YES (today) | NO | run evidence dirs | DEEP-REASONING |
| D-28 | WAITING_APPROVAL triage | Coordinator/operator procedure (no code; zero hits in canonical src) | mission state -> hold / propose / escalate + rationale | ~5/d | coordinator LLM | UNKNOWN | agent-time | NO | YES (C-02, never auto-approves) | YES (today) | YES (escalation IS the human path) | escalation-log.jsonl (25 records) | JEV-CANDIDATE |
| D-29 | grill-20 per-check judgments | Coordinator-LLM procedure (SI-03; verdict composition deterministic) | question context -> 20x pass/fail | ~10/d | coordinator LLM | UNKNOWN | agent-time | PARTIAL | YES (C-05 first-pass triage; never final verdict) | YES (check judgments) | YES (C4-adjacent -> human) | escalation-log.jsonl | JEV-CANDIDATE |

### E1d. Gateway live spine (ping-gateway-src, live container `ping-gateway:repair-cert-20260924`)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-30 | Event -> mission type (+priority) | `ping-runtime/orchestration/event_to_mission_bridge.js:25-69` static 28-type map | event_type -> {missionType, priority 0..3} | per event (100s/d) | none | 0 | ms | YES | NO | NO | NO | live logs | DETERMINISTIC |
| D-31 | Mission identity / dedupe | `ping-runtime/orchestration/mission_runtime.js:68` `create` | sha256(missionType:event_id or payload) -> mission_id; ON CONFLICT DO NOTHING | per event | none | 0 | ms | YES | NO | NO | NO | ping_missions | DETERMINISTIC |
| D-32 | Claim a mission | `mission_runtime.js:106` `assign` | conditional UPDATE status='created' -> 'assigned' + 60s lease; rowCount 0 = lost race | per poll | none | 0 | ms | YES | NO | NO | NO | PG | DETERMINISTIC |
| D-33 | Lifecycle transitions | `mission_runtime.js:129/146/172` start/complete/fail | conditional status transitions (assigned->running; running->completed/failed) | per mission | none | 0 | ms | YES | NO | NO | NO | PG | DETERMINISTIC |
| D-34 | Retry vs permanently fail | `mission_runtime.js:202` `failWithRetry` | retries < max_attempts(3) -> retry_pending @ now+backoff(5s); else failed | per failure | none | 0 | ms | YES | NO | NO | NO | retry_watchdog tests | DETERMINISTIC |
| D-35 | Renew in-progress lease | `mission_runtime.js:254` `renewLease` | _processing set -> lease_until +60s (only running/assigned) | every 5s poll | none | 0 | ms | YES | NO | NO | NO | stats.renewals | DETERMINISTIC |
| D-36 | Reclaim orphaned missions | `mission_runtime.js:277` `reapExpiredLeases` | lease_until < NOW() and not in _processing -> reset to created | every 5s poll | none | 0 | ms | YES | NO | NO | NO | logs | DETERMINISTIC |
| D-37 | Which missions are claimable | `mission_runtime.js:306` `getPending` | created + retry_pending with retry_at elapsed, LIMIT availableSlots | every 5s poll | none | 0 | ms | YES | NO | NO | NO | PG | DETERMINISTIC |
| D-38 | Poll cycle: renew -> reap -> dispatch | `ping-runtime/orchestration/mission_scheduler.js:145` `_poll` | capacity check -> getPending -> _dispatch each | every 5s | none | 0 | ms | YES | NO | NO | NO | getStats | DETERMINISTIC |
| D-39 | Mission type -> worker | `mission_scheduler.js:41` `MISSION_WORKER_MAP` | mission_type -> worker name or skip+stats.skipped++ | per mission | none | 0 | 0 | YES | NO | NO | NO | skip logs | DETERMINISTIC |
| D-40 | Worker handles this event? | `ping-runtime/workers/worker_runtime.js:69` `dispatch` | event_type in worker.eventTypes (first-match, registration order) + running < maxConcurrent -> handle(event) | per event | none | 0 | ms | YES | NO | NO | NO | getStats | DETERMINISTIC |
| D-41 | Exhausted -> dead letter | `mission_scheduler.js:290` `_failMission` | retries >= max_attempts -> DeadLetterAuthority.recordDeadLetter | per exhaustion | none | 0 | ms | YES | NO | NO | NO | DLQ | DETERMINISTIC |
| D-42 | Event validation + identity + namespace | `ping-runtime/events/unified_event_runtime.js:73` `emit` | eventType registry check + identity {eventType, source, namespace, logical_id} + namespace default 'core::system' | per emit | none | 0 | ms | YES | NO | NO | YES (namespace = privacy boundary) | event_registry (235 events) | DETERMINISTIC |
| D-43 | Replay idempotency | `unified_event_runtime.js:167` | duplicate delivery -> converges on already-stored event | per duplicate | none | 0 | ms | YES | NO | NO | NO | ping_events | DETERMINISTIC |
| D-44 | Business category | `ping-runtime/workers/canonical_workers.js:566` `ClassificationWorker._categorize` | event_type -> 1 of 10 categories or 'general' (static map) | per claim | none | 0 | ms | YES | NO | NO | NO | none | DETERMINISTIC |
| D-45 | Business priority | `canonical_workers.js` `_prioritize` | (event_type, payload.rating) -> urgent/high/medium/normal (4 rules) | per claim | none | 0 | ms | YES | YES (priority calibration is the natural D1) | NO | NO | none | DETERMINISTIC |
| D-46 | Recommended action/reason | `canonical_workers.js:631` `RecommendationWorker._recommendAction/_recommendReason` | category/priority -> action string + reason string (static maps) | per classification | none | 0 | ms | YES | NO | NO | NO | none | DETERMINISTIC |
| D-47 | Knowledge promotion | `ping-runtime/knowledge/knowledge_promoter.js:36` `handle` | SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED -> promote (confidence 1.0); REJECTED -> down-rank | on demand | none | 0 | ms | YES | NO | NO | NO (approve/reject are human/skill events) | knowledge collection | DETERMINISTIC |
| D-48 | Dormancy classification | `ping-runtime/orchestration/dormant_classifier.js:38` `_classifyOne` | (path keywords, replay_visibility, dependent_modules, git_churn, entropy) -> safe_delete / migrate / keep_dormant / needs_review | on demand (audits) | none | 0 | ms | YES | NO | NO | NO | classifications/ | DETERMINISTIC |
| D-49 | Model/provider selection | `ping-runtime/ai/ai_runtime.js:127` `selectModel` | requirements.preferProvider > preferLocal(ollama) > defaultProvider | per chat/embed call via /ai, /api/v1/ollama | none (preference order) | 0 | ms | YES | NO | NO | NO | healthCheckAll | DETERMINISTIC |
| D-50 | Embed + project to Qdrant | `ping-runtime/embeddings/embedding_service.js:175/197` | event-subscribed canonical objects -> vector -> `knowledge` collection upsert via ProjectionAuthority.get_client() | per subscribed event | embedding model (ollama) | UNKNOWN | s | PARTIAL (the vector is model-computed; what/when is deterministic) | NO | NO | YES (ProjectionAuthority single-construction-site rule, sovereignty test) | Qdrant (389 pts) | DETERMINISTIC |
| D-51 | Hybrid search ranking | `ping-runtime/search/hybrid_search.js:39` `search` | {query, namespace, limit=10} -> ranked results | per query | none (algorithmic) | 0 | ms | YES | YES (evidence reranking = standing first experiment, shadow mode) | NO | NO | none yet | DETERMINISTIC |

### E1e. Dormant / declared-only (code exists, not on the live path)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-52 | Compile missions from intelligence graph | `ping-runtime/orchestration/execution/mission_compiler.js` `compileMissions` (10 MISSION_TYPES) | intelligence graph -> mission objects | 0 (dormant) | none | 0 | n/a | YES | NO | NO | NO | none | UNKNOWN (dormant) |
| D-53 | Select worker port | `execution/capability_registry.js:~190` `selectWorker` (SHA-256 hash pick over sorted eligible); `execution/scheduler.js:90-112` `_selectWorker` | capability -> worker port | 0 (dormant; only port `opencode:local` had executor:null) | none | 0 | n/a | YES | NO | NO | NO | none | UNKNOWN (dormant) |
| D-54 | Consensus on mission result | `execution/consensus_engine.js` `evaluate` | worker outputs -> consensus_reached / mission_accepted / rejected | 0 (dormant) | none | 0 | n/a | YES | NO | NO | NO | none | UNKNOWN (dormant) |
| D-55 | Merge validation | `orchestration/merge_gate.js:82/112` `validateFile`/`validateGitDiff`; also referenced by `merge_queue.js`, `proposal_pipeline.js` | file/diff -> valid/invalid | unknown (proposal tooling) | none | 0 | ms | YES | NO | NO | NO | none | UNKNOWN |
| D-56 | Omni-route across capabilities | NO IMPLEMENTATION (spec gone from current tree) | n/a | 0 | n/a | n/a | n/a | NO | NO | NO | NO | none | UNKNOWN (declared-only, now absent) |

### E1f. Worker pools: copilot broker (Pig `pig-fb/copilot-broker/src/`)

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-57 | Task tier (model class without a model) | `task-tiers.js` `classify` | {kind, description} -> T0..T4 (regex; uncertain -> T1; T3/T4 never auto-assigned) | per broker task | none | 0 | ms | YES | NO | NO | NO | broker evidence | DETERMINISTIC |
| D-58 | Failure classification | `jsonl-classifier.js` `classifyStream` | CLI JSONL event stream -> SUCCESS/EXHAUSTED/RATE_LIMITED/AUTH_FAILED/TEMPORARY_FAILURE/POLICY_BLOCKED/TOOL_FAILURE/UNKNOWN | per broker run | none | 0 | ms | YES | NO | NO | NO | JSONL logs | DETERMINISTIC |
| D-59 | Retryable? | `jsonl-classifier.js` `isRetryable` | classification -> bool (only RATE_LIMITED + TEMPORARY_FAILURE) | per failure | none | 0 | 0 | YES | NO | NO | NO | logs | DETERMINISTIC |
| D-60 | Identity allowlist | `broker.js:33` AUTHORIZED_IDENTITY_IDS + :68 `dispatch` | identity_id -> allow (1-4) / secret-free DENIED (5-10) | per broker task | none | 0 | ms | YES | NEVER | NO | YES | identity-state | DETERMINISTIC |
| D-61 | Quota eligibility (predictive, fail-closed) | `quota-model.js:56` `isEligible` | (quota_remaining, quota_state, estimated_cost + safety_reserve) -> eligible / wait (UNKNOWN/STALE/EXHAUSTED -> fail closed) | per broker task | none | 0 | ms | YES | NO | NO | NO | quota snapshots | DETERMINISTIC |
| D-62 | Cost estimate | `cost-model.js` (ESTIMATE-labeled) | task -> estimated credits | per broker task | none | 0 | ms | YES (estimate) | NO | NO | NO | spend ledger | DETERMINISTIC |

### E1g. Emission, evidence, context, ingestion

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-63 | Semantic-domain gate | `tandem/emit-observation.py:89` `_require_ping_domain` | brief domain -> emit / refuse (prospect/intel discovery can never emit to production) | per emission | none | 0 | ms | YES | NO | NO | YES | ledger | DETERMINISTIC |
| D-64 | Verified-transition gate | `tandem/emit-observation.py:220` `_require_verified_local` | (brief_id, obs_hash) -> verified run exists / refuse | per emission | none | 0 | ms | YES | NO | NO | YES | ledger | DETERMINISTIC |
| D-65 | Duplicate-emission guard | `tandem/emit-observation.py:~608` sha256 guard | obs hash seen -> refuse | per emission | none | 0 | ms | YES | NO | NO | NO | spool | DETERMINISTIC |
| D-66 | Ask context bounding | `projects/ping/src/lib/ping/ask-composer.ts:37/173` ASK_LIMITS + boundedObject | all public objects -> first 8 (insertion order) + 20 relationships + 500-char fields | per Ask query | none | 0 | ms | YES | YES (D0 term-overlap re-rank now; D1 relevance sieve gated on agent path) | NO | NO | none | DETERMINISTIC |
| D-67 | GitHub intake: scan -> classify -> brief | `workspace/patch7_real_intake.py` (GitHubScanner -> temporal diff NEW/UNCHANGED -> ClassificationEngine -> DailyBriefingGenerator) | repo scan -> brief | one-shot (no live ingestion; formally DEFERRED) | none | 0 | batch | YES | NO (J-10..J-16 are design-only) | NO | NO | Patch 7 regression test | DETERMINISTIC |
| D-68 | Watchlist / repo authorization | design only (`git-ingestion/threats/`, G-01..G-16) | watchlist change request -> human decision | on change | human | 0 | human-time | NO | NO | NO | YES | design docs | HUMAN-AUTHORITY |

### E1h. TenantOS, memory, skills, agents

| # | DECISION | CURRENT OWNER (file:line) | INPUT STATE -> OUTPUT | FREQ | MODEL | COST | LATENCY | DET? | JEV? | FRONTIER? | AUTH? | EVAL? | CLASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-69 | Tenant context resolution | `tenant-context.ts` requireTenantContext/withTenantContext; `mc-tenant-gate.ts:45` callerScope (prior-verified 2026-09-28) | request -> trusted TenantContext or typed TenantContextError/400/403 | per request | none | 0 | ms | YES | NEVER | NO | YES | isolation tests | DETERMINISTIC |
| D-70 | Agent memory curation | Main-agent procedure (MEMORY.md + `~/memory/*.md` dated logs) | conversation -> durable claims | continuous | coordinator LLM | unmetered | agent-time | NO | NO | YES | NO | memory_search | DEEP-REASONING |
| D-71 | Reconciliation authorization | `workspace/memory/reconciliation_state.json` + owner 2026-09-25 rule | machine-proposed reconciliation -> AUTHORIZED (human) or HOLD | on conflict | human | 0 | human-time | NO | NO | NO | YES | state file | HUMAN-AUTHORITY |
| D-72 | Skill/tool routing (which CLI/skill handles a task) | Coordinator-LLM decision (no code router; skills: x-api, threads, instagram, shopping, gmail, etc.) | task -> skill + args | ~100s/d | coordinator LLM | UNKNOWN | agent-time | NO | PARTIAL (typed skill-choice contracts are future D1) | YES (today) | NO | skill runs | DEEP-REASONING |

### E2. Classification counts

Out of 72 inventoried decisions (D-01..D-72; D-09 split into a deterministic template half and a generative brief-authoring half, hence 73 classifications):
- **DETERMINISTIC: 57**
- **JEV-CANDIDATE: 4** (D-08, D-09 gate half, D-28, D-29; D-45/D-51 marked as future Jev but classified DETERMINISTIC today)
- **DEEP-REASONING: 4** (D-09 authoring half, D-27, D-70, D-72)
- **HUMAN-AUTHORITY: 3** (D-17, D-68, D-71; D-28's escalation path is human but the triage itself is JEV-CANDIDATE)
- **UNKNOWN: 5** (D-52, D-53, D-54, D-55, D-56: dormant/declared-only/absent)

Headline: the dispatch plane and the live gateway spine are already ~90% deterministic code (45 of the 51 core dispatch/spine decisions). The frontier deliberation concentrates in exactly 3 sites (A2) plus coordinator skill-routing (D-72). The frontier deliberation concentrates in exactly 3 sites (A2) plus coordinator skill-routing (D-72). The Jev opportunity is NOT "replace LLM calls" (there are almost none on the decision plane) but (a) bounded advisory judges where the only signal today is a self-report (D-08) or a coordinator procedure (D-28/D-29), and (b) new selection/ranking decisions that are currently constants (D-02 executor selection, D-51 evidence reranking).

### E3. Top 10 Jev candidates by frequency x cost (scored: volume est/day x cost 1-4, risk-adjusted)

1. **D-08 Worker-result usefulness judge** (~30/d x cost 3 = 90): independent second opinion on the worker's self-reported status. Advisory only; can flag unknown/force reconcile; can never override structural FAIL or promote to completed. Eval: completion-corpus (16 items).
2. **D-09b Work-order brief quality gate** (~30/d x cost 2 = 60): pre-dispatch check of the coordinator-written taskBrief (capability allowlist, constraints consistent, no secret-shaped material, input refs resolvable). Fail -> coordinator rewrites; never edits.
3. **D-51 Ask evidence reranking** (~20/d x cost 3 = 60): rank/order/filter context items for the answer composer; never decides what the executor may see. Standing first experiment (shadow mode).
4. **D-02 Executor selection among eligible workers** (~30/d x cost 2 = 60): rank already-authorized workers (no tenant identity in payload); confidence threshold -> dispatch or System-2 escalation; `executor_selection` record per dispatch. J4 shadow harness exists (37/37 tests).
5. **D-28 WAITING_APPROVAL triage** (~5/d x cost 4 = 20): mission state -> {hold, propose, escalate} + rationale. Escalation IS the human path; never auto-approves. Eval: escalation-log.jsonl (25 records).
6. **D-29 grill-20 first-pass triage** (~10/d x cost 4 = 40, risk-adjusted down): pre-score the 20 locked checks; coordinator verifies; escalate on any low-confidence or C4-adjacent check; never emits the final verdict.
7. **D-26b Evidence-chain completeness check** (~10/d x cost 3 = 30): is the chain actually complete or did the worker claim completion with missing links (the witnessed t2 false-negative class). Advisory flag on `20-assess.json`.
8. **D-72 Skill-choice contracts** (~100s/d x cost 1 = 100, speculative): typed skill-choice (which CLI/skill for this task) is the highest raw volume, but no contract, no label source, and the coordinator does it inline today; rank held pending a typed contract and shadow harness.
9. **D-45 Priority calibration** (~claims/d x cost 1): the 4-rule `_prioritize` is crude (rating<=2 -> urgent); a calibrated priority model is low-risk and high-leverage for the recommendation chain. Needs a label source first.
10. **D-55 Merge validation assistance** (freq unknown): validateFile/validateGitDiff in proposal tooling; Jev could pre-screen diffs, deterministic gates decide. Usage on the live path unverified; shadow-first.

### E4. Absent / declared-only surfaces (archaeology verdicts)

- **ExecutionAuthority / ExecutionAdapter / WorkerRuntime (lane A names)**: DECLARED-ONLY as named authorities. `adapter.js:8` explicitly notes "WorkerRuntime / ExecutionAuthority: this module never touches those"; `README.md:6` assigns the Execution tuple to them as a lane-A concept. No implementation found. The FUNCTIONS exist under other names (WorkerRuntime.dispatch in the gateway; ExecutionAuthority's job is done by `authorizeWorkOrder` + `mission_intent.authorize`).
- **OmniRouter**: ABSENT. No implementation ever (2026-09-13 audit: spec only, verdict BLOCKED); the spec file no longer exists in the current canonical tree.
- **MissionScheduler / MissionRuntime as named classes**: EXIST as gateway code (`mission_scheduler.js`, `mission_runtime.js`) but are NOT the abstract scheduler of the task brief; they are the 5s-poll PG-backed implementation. The "which mission first" decision is FIFO-by-getPending + static priority column, no intelligence.
- **AIRuntime**: EXISTS (`ping-runtime/ai/ai_runtime.js`), live at boot, but its only selection logic is a static preference order; the live business path does not route through it.
- **Model routing on the Orca path**: ABSENT (static profile config). The only per-call routing in the program is `AIRuntime.selectModel`'s preference order.
- **GitHub ingestion**: ABSENT as a live system (one-shot Patch 7 pipeline + deferred design). Per-event System-2 cost today: zero.
- **Worker selection authority**: ABSENT (caller constant). The eligibility machinery exists; the choice does not.
- **WAITING_APPROVAL triage code**: ABSENT (operator procedure only).

### E5. Verification notes and falsification

- Every file:line above was read live on the Pig this run (2026-09-28 ~18:20-18:35 MDT) except D-69 (tenant-context.ts, prior-verified 2026-09-28 per the autonomy map) and the dormant-engine internals (verified via the 2026-09-13 omniroute audit + current boot wiring in `gateway_runtime.js`, which still mounts the engine unused).
- Pig SSH was healthy all run (no UNREACHABLE; no retry needed). No writes were made to any codebase; the only write is this report.
- This inventory is falsified by: (1) a live LLM API call on the Orca dispatch plane or gateway live spine missed by these greps; (2) `orca_policy.js` classify* calling a model in a version other than the worktree copy read today; (3) a per-decision model-routing choice on the Orca path; (4) the old ExecutionEngine receiving live traffic (container logs would show `/orchestration` calls from a PING component).
- Secret-handling baseline honored: no bearer/session material was read, logged, or stored; credential-adjacent code (broker credential-boundary, emit-observation bearer resolution) is described, never quoted.
