# Agent F — Temporal / ORCA A0-A7 / Approval-Effect Identity: Read-Only Reconnaissance

**Date:** 2026-09-18/19 · **Operator:** Pigi subagent (read-only, no mutations performed)
**Scope:** DURABILITY / TEMPORAL + ORCA A0-A7 + APPROVAL / EFFECT IDENTITY (program sections 18-20)
**Repos inspected (read-only):** `/home/nolan/ping` [branch `feature/approval-effect-identity` @ 88c9651be],
`/home/nolan/worktrees/orca-autonomy` [`feature/orca-autonomy` @ ae55b77ff],
`/home/nolan/worktrees/ping-codex-convergence` [`codex/context-workorder-convergence` @ 08c3036d9],
`/tmp/crx-runtime` (historical). Live runtime: Pig docker (`ping-temporal-dev`, `ping-gateway`).
**Method:** code reads, git history, live container inspection, one read-only `listWorkflow` query against the
live Temporal dev server. No writes, no restarts, no secret reads.

**Headline:** Temporal exists as infrastructure (live dev server) plus two disjoint, unproven, partially broken
code integrations; zero workflows have ever executed. The old ORCA engine is a proven facade (A0). The new
ORCA control loop has witnessed A1-A5 evidence and a witnessed A6 FAIL; its crash-safe remediation is built
but untested. Approval and effect identity exist as unwired, in-memory classes; the only real effect path
(Hermes work orders) has no durable approval and no effect identity.

---

## (a) TEMPORAL AUDIT

### A1. Installed SDK evidence

| Location | @temporalio presence | Version | Evidence |
|---|---|---|---|
| `/home/nolan/ping` (main, approval branch) | **ABSENT** | n/a | `node_modules/@temporalio` does not exist; no `@temporalio` in any `package.json`. `ping-runtime/temporal/workflows/mission_workflow.js` does `require('@temporalio/workflow')` at module top → **the workflow file cannot even load** in this repo. |
| `/home/nolan/worktrees/ping-codex-convergence/gateway/node_modules/@temporalio` | **PRESENT** | **1.21.1** (client, worker, workflow pkgs) | `gateway/package.json` pins `@temporalio/{activity,client,worker}` `^1.8.0`; resolved 1.21.1. |
| Live infra | Temporal **dev server running** | `temporalio/temporal` image, `server start-dev --ip 0.0.0.0 --db-filename /data/temporal.db` | Container `ping-temporal-dev`, created 2026-09-17T23:48Z, running; TCP 127.0.0.1:7233 **OPEN** (verified), UI :8233 bound. |

### A2. Live runtime trace (strongest evidence)

Read-only query against the live server using the installed 1.21.1 client
(`Connection.connect({address:'127.0.0.1:7233'})` → `client.workflow.list`): **0 workflows returned.**
No workflow of any type has ever executed against this dev server (caveat: server created 2026-09-17;
a container recreation would reset its sqlite history — see Unknowns).

### A3. The two Temporal integrations (both unproven; one broken)

**Integration 1 — `ping-runtime/temporal/` (main repo, commits 1fcfa79d2, f250c19ca, 88c9651be):**
- `workflows/mission_workflow.js` (122 lines): `missionExecution` workflow; approval signal `approvalSignal`,
  query `approvalStatusQuery`; 1-hour approval wait via Temporal `condition()`; activity retryPolicy
  (initial 1s, max 30s, backoff 2, max 3 attempts); `proxyActivities` with 5-min startToCloseTimeout.
- `activities/mission_activities.js` (85 lines): `executeWorkOrder` / `recordMissionOutcome` — **explicit stubs**;
  production wiring to ExternalAgentAdapter/MissionRuntime is commented-out TODO.
- `index.js`: re-export shim. `temporal_integration.test.js`: **file-existence + stub-shape tests only**
  (never touches the Temporal server, never runs a workflow).
- Maturity: **EXPERIMENTAL** (marked EXPERIMENTAL in commit 57156ecf2 on the sibling branch; see Contradiction C6).
  Cannot execute: no SDK installed, activities are stubs, no worker, no client, no schedule call site.

**Integration 2 — `gateway/temporal_runtime.js` + `gateway/temporal_scheduler_provider.js` (codex worktree):**
- `TemporalRuntime` (lifecycle wrapper): owns connection/client/worker, injectable SDK for tests;
  `test_temporal_runtime_lifecycle.js` pins lifecycle contracts **with mocked SDK** (unit-level only).
- `TemporalSchedulerProvider`: implements `schedule()/cancel()/status()` via `client.workflow.start('ConstitutionalWorkflow', ...)`.
- **BROKEN:** the string `'ConstitutionalWorkflow'` appears **only** in that provider file — no workflow file
  defining it exists anywhere; `gateway/bootstrap/wiring.js:140` sets `workflowsPath` to
  `gateway/temporal_workflows.js`, which **does not exist**. Scheduling anything would start an unregistered
  workflow type that no worker serves.
- Wired in `gateway/bootstrap/wiring.js` (container registration `temporalRuntime`, `temporalSchedulerProvider`,
  `schedulerPort`) and `lifecycle.js`, but the **running** `ping-gateway` container image
  (`ping-gateway:devin-boundary2`, built 2026-09-16) predates these commits (2026-09-17); no Temporal mentions
  in its recent logs. **Not deployed to the live gateway.**

### A4. Responsibility split — current code vs target law

Target: PING owns semantic truth, authorization, identity, business policy, evidence.
Temporal owns workflow history, durable timers, activity scheduling, heartbeats, durable retry, workflow recovery.
Connectors own narrow protocol retry. DB owns serialization retry.

| Responsibility | Target owner | Actual owner (code, with file:line) | Verdict |
|---|---|---|---|
| Workflow history | Temporal | **Nobody live.** Temporal dev server running, 0 workflows ever. Unwired workflow defs. | GAP |
| Durable timers | Temporal | **Nobody durable.** Process-local only: ORCA dispatch 180s timeout, 600s work-order TTL (`orca_control_loop.js:87-89`); Temporal `condition()` 1h approval wait defined but never runs; `MissionRuntime.retry_at` + poll is a durable-delay-via-poll, not a timer. | GAP |
| Activity scheduling | Temporal | `MissionScheduler._poll` 5s interval, **live** in gateway (`gateway_runtime.js:552-560`, `mission_scheduler.js:125`) | **VIOLATION** — the one orchestration poll that is the obvious Temporal candidate still runs as PING-side polling |
| Heartbeats | Temporal | `MissionScheduler.renewLease` 60s lease renewal (**live**, PING-side); `constitutional_desktop_runtime` heartbeat (internal); ORCA coordinator = PG advisory lock, no heartbeat; Temporal heartbeats: none configured | PARTIAL VIOLATION — PING does the heartbeating Temporal should own |
| Durable retry | Temporal | `MissionRuntime.failWithRetry` (`retry_pending`/`retry_at`, P0-4, durable, **live**); ORCA loop `MAX_ATTEMPTS=2` (process-local); Temporal `retryPolicy` defined in unwired workflow | **VIOLATION** — PING owns durable retry today |
| Workflow recovery | Temporal | `MissionScheduler.reapExpiredLeases` (**live**, PING-side); ORCA startup reconciliation (built 6a342dd27, untested); Temporal recovery: unwired | **VIOLATION** |
| Semantic truth / authorization / identity / policy / evidence | PING | UnifiedEventRuntime, IdentityAuthority, authorizeWorkOrder, capability registry, verifyResultEnvelope/recordVerifiedResult | **OK** |
| Narrow protocol retry | Connectors | **None implemented** — email/SMS/posthog integrations are stubs; no retry loops found | GAP (harmless: nothing real to retry) |
| Serialization retry | DB | **No code found** — grep for `40001`/`serialization_failure` across `ping-runtime/`, `gateway/` returns nothing | GAP |

**Net:** the constitutional constraint written in the temporal commits ("Temporal owns execution mechanics;
PING owns business state") is **inverted in the running system**: PING owns the execution mechanics
(poll, lease, retry, reaping) and Temporal owns nothing. The constraint is aspirational documentation.

---

## (b) POLLING LOOP CENSUS (all `setInterval` sites; `setTimeout` one-shots excluded unless structural)

| # | File:line | Loop | Interval | Classification | Temporal candidate? |
|---|---|---|---|---|---|
| 1 | `ping-runtime/orchestration/mission_scheduler.js:125` | `_poll`: lease renew → reap expired → dispatch pending | 5s, **LIVE** (gateway_runtime 552-560) | **Orchestration polling** | **YES — primary candidate** |
| 2 | `ping-runtime/events/event_bridge.js:86` | `_poll`: PG canonical_events → eventRuntime bridge | cfg, **LIVE** (in ping-gateway logs) | Projection/pipeline refresh (internal event pipeline) | No — keep as bridge; could become Temporal-scheduled but it is not orchestration |
| 3 | `gateway/event_outbox.js:99` | `_processOutbox` publisher | 1s | Durable publication (outbox pattern) | No — complementary to Temporal, not replaced by it |
| 4 | `gateway/mission_event_bus.js:79` | `_processEvents` fanout | 1s | Event fanout/projection | No |
| 5 | `gateway/materialized_views.js:113` | MV refresh timer | cfg | **Projection refresh** | No |
| 6 | `gateway/control_center_subscription.js:48` | `_pollAndNotify` fallback | 5s | Notification/projection fallback | No |
| 7 | `gateway/continuous_acquisition.js:87` | Git acquisition poll | cfg | **External acquisition polling** | No |
| 8 | `gateway/github_release_watcher.js:264` | Release watcher | cfg | **External acquisition polling** | No |
| 9 | `gateway/archive/qdrant_integration.js:272` | `_workerLoop` | cfg | Projection refresh (archive/) | No — and archive/ suggests legacy |
| 10 | `gateway/constitutional_watchers.js:247` | per-watcher intervals | per-watcher | Watcher/health | No |
| 11 | `gateway/circuit_breaker.js:110` | `_probeTimer` recovery probe | cfg | **Health polling** | No |
| 12 | `gateway/constitutional_desktop_runtime.js:341` | `_heartbeatInterval` | cfg | **Health polling** (heartbeat) | No |
| 13 | `gateway/telemetry_subsystem.js:111` | collection interval | cfg | Observability | No |
| 14 | `gateway/self_improvement_loop.js:76` | improvement loop | cfg | Agent autonomy loop | No |
| 15 | `gateway/continuous_reflection_loop.js:62` | reflection loop | cfg | Agent autonomy loop | No |
| 16 | `gateway/continuous_background_analyst.js:86` | analyst scheduler | cfg | Agent autonomy loop | No |
| 17 | ORCA loop (no interval; manual) | `orca_control_loop.js` via `run-loop.sh` | manual | Control loop (not polling) | Future: Temporal-scheduled cadence is the A7 vehicle |

`while(true)` in `gateway/ollama_provider.js:274` and `gateway/ollama_adapter.js:142` are **stream readers**
(SSE-style token consumption), not polling loops — excluded.
**Only loop #1 is an obvious Temporal candidate.** Loops 2-4 are durable-delivery/projection machinery that
should stay; 7-8 are external acquisition (correct as polling or webhooks); the rest are health/observability/
agent loops outside the Temporal boundary.

---

## (c) ORCA A0-A7 INDEPENDENT AUDIT

Two distinct implementations exist. The program's own definitions (orca/ORCA-ROLE.md:121-130, 2026-09-18)
name the evidence required per level. I assess each implementation separately against primary evidence —
**not** coordinator claims.

**Implementation 1 — old ExecutionEngine** (`ping-runtime/orchestration/execution/engine.js`,
HTTP `/orchestration`, Ollama discovery deliberately disabled at `gateway_runtime.js:325-335`):

| Level | Verdict | Primary evidence |
|---|---|---|
| A0 FACADE | **PROVEN** (this is the certified state) | ORCA-ROLE.md certifies A0. Forensic points (ORCA-INVENTORY.md §8): `engine.js:95` `executor: null`; `dispatchToAssignment` (engine.js:177) never calls `workerPort.execute()`; `worker_port.js:113-149` returns `{error:'no_executor'}`; former synthetic loop preserved as `startAutonomousLoop_SYNTHETIC_HISTORICAL_DEPRECATED` (engine.js:813). |
| A1-A7 | **NOT ATTAINED** | No further assessment needed; the engine is a parallel facade, business-disconnected, per docs/EXECUTION_EVIDENCE_LEDGER.md §15. |

**Implementation 2 — new control loop** (`orca/control-loop/orca_control_loop.js`, section-20 vertical slice,
Nolan directive; launched manually via `run-loop.sh`; Hermes worker; `MAX_WORK_ORDERS=2`, `MAX_ATTEMPTS=2`):

| Level | Verdict | Primary evidence |
|---|---|---|
| A1 REAL OBSERVATION | **PROVEN_RUNTIME** | Witnessed runs 2026-09-18 read live state: `01-observe.json` artifacts; queueStats `completed=191`, gateway health check; `ping_missions`=191 verified unchanged by read-back. Zero writes during observe. |
| A2 REAL PLANNING | **PROVEN_RUNTIME** | `02-plan.json` artifacts; tasks planned with capabilities (`text.summarize`) resolvable against the 7 LIVE dispatcher profiles (`external_agent_adapter`, validated 26/26). |
| A3 AUTHORIZED DELEGATION | **PROVEN_RUNTIME** | Every dispatch went through `authorizeWorkOrder` (fail-closed; Hermes granted, CLI family denies `email.send` per `validate_dispatcher_profiles.js:77`); `issueWorkOrder` envelopes; work executed by the Hermes worker process, never by ORCA itself (`hermes_dispatch.py` spawn). |
| A4 EVIDENCE MONITORING | **PROVEN_RUNTIME** | `verifyResultEnvelope` + `recordVerifiedResult`; canonical WORKER_FAILED events committed to `ping_events` and read back (`2a616cff9ecff9233db66eab4ae1cf2f383a9297d0cc347f9eabdbcdb20a72d2`, `0a6342dfe3795913b38110edeedc7db09abfef9e39a04095bd171cd5484588a8`); timeouts reported honestly as failed, never fabricated. |
| A5 AUTONOMOUS FOLLOW-UP | **PROVEN_RUNTIME** (bounded) | A5-CERTIFICATION-RECORD.md binds operator-verified evidence: run `orca-run-mu6x9eeh` (timeout → WORKER_FAILED → policy retry → attempt 2) and `orca-run-mu6wmbzn` (completed objective with verified follow-up scheduling). Two discrepancies classified and closed (90-vs-88 file count RESOLVED; worker timestamp metadata EVIDENCE_METADATA_DEFECT). Scope: Hermes/`text.summarize` path only; OpenCode family blocked on its permission gate. |
| A6 RESTART RESILIENT | **FALSIFIED** (witnessed) | Kill -9 test 2026-09-18 (`evidence/a6-restart-proof-2026-09-18T14-55-00-000Z/`): criteria (a) rediscovery FAIL, (b) reconstruction FAIL, (d) duplicate delegation FAIL (two work_order_ids `c003d479f611a792` → `9f1105aa7e1b4bd0`, two WORKER_FAILED events for one logical task), (e) lost evidence partial, (g) continuation FAIL, (h) closure FAIL. Root causes: run-scoped work_order_id derivation, no startup reconciliation, `issueWorkOrder` in-memory only, orphaned attempt-2 dispatch unrecoverable. **Remediation built** in commit `6a342dd27` (durable objective identity, crash-safe dispatch rendezvous, startup reconciliation, durable budget, coordinator claim) — maturity **WIRED_UNPROVEN**: code inspected, no re-test run exists. |
| A7 CONTINUOUS BOUNDED AUTONOMY | **DOCUMENTED_ONLY** | Bounds exist and are enforced in-process (`MAX_WORK_ORDERS`, `MAX_ATTEMPTS`, 180s timeout, 600s TTL, policy escalation, PROHIBITED list). But the loop runs only via manual `run-loop.sh` invocations; **no cron, no systemd timer, no supervised deployment** for it. No sustained autonomous run exists. |

Per-aspect audit (new control loop), primary evidence:

- **Objective identity:** NOW durable — `deriveObjectiveId({namespace, objectiveText, constraints})` (`objective-runtime.js:58`), stable across restarts (built in 6a342dd27; the A6-proof code used a different run-scoped scheme — verify the new code path on re-test).
- **Run identity:** `orca-run-<Date.now().toString(36)>` — correlation root of one epoch only; no identity derived from it (correct post-remediation).
- **Work-order identity:** NOW `deriveWorkOrderId(objectiveId, taskKey)` (stable); pre-remediation was `sha256('workorder:'+runId+'-'+taskKey)` (run-scoped — the A6 failure).
- **Attempt identity:** `deriveAttemptId(workOrderId, attemptNumber)` (stable).
- **Budget durability:** `reserveWorkOrderBudget`/`budgetUsage` under `PING_DATA_ROOT/objectives/` (`objective-runtime.js:278-318`) — file-backed, idempotent per work order; replaces the process-local counter (finding 5). **WIRED_UNPROVEN** (no restart re-test).
- **Claim/lease:** single-coordinator claim = PostgreSQL **session-level advisory lock** on a dedicated client (`acquireCoordinatorLock`, `objective-runtime.js:186`; `orca_control_loop.js:1079-1096`); atomic acquire, SIGKILL-safe release by the DB. Orphan-worker behavior: orphaned attempt-2 dispatch demonstrated unrecoverable in the A6 test (rendezvous file remediation built, unproven).
- **Cancellation:** durable — `cancel.requested` marker file → `recordCancellation`; blocks new work across restarts; exit 4 on cancelled objective (`orca_control_loop.js:1064-1076`). Cancellation proof exists in evidence (`autonomy-bounds-2026-09-18T14-50-00-000Z/`).
- **Crash windows:** classified A-E (+C1/C2, D1/D2 splits) with per-window durable/lost/restart/detectability analysis (`evidence/crash-windows-2026-09-18T14-45-00-000Z/`). Window D2 (INSERT committed, caller has no event_id) and C1 (envelope in memory) are the dangerous ones.
- **Startup reconciliation:** built post-proof (reconcile before dispatch; COMPLETED objectives exit 0; cancelled exit 4) — **unproven**.
- **Policy wiring:** `orca_policy.js` classifies every delegation/retry/follow-up into AUTO_EXECUTE / REQUIRES_VERIFICATION / REQUIRES_HUMAN_APPROVAL / PROHIBITED; `email.send`/`sms.send` → REQUIRES_HUMAN_APPROVAL → `Escalation` (exit 3, `99-escalate.json`). Consults the adapter's authorization gate live; does not duplicate it.
- **Result acceptance:** `verifyResultEnvelope` (8-field envelope check) then `recordVerifiedResult` → canonical event; verification-failed results are non-retryable → escalate.
- **Follow-up scheduling:** A5 evidence shows verified follow-up scheduling in the secondary run; mechanism = new tasks in the next OBSERVE cycle, each re-classified.

Target law check — ORCA PLANS / PING AUTHORIZES / TEMPORAL ENDURES / EXECUTORS EXECUTE / EVIDENCE PROVES:
- ORCA PLANS: **holds** (ROLE.md + policy + observed runs).
- PING AUTHORIZES: **holds** (`authorizeWorkOrder` consulted live; ORCA cannot grant).
- TEMPORAL ENDURES: **fails** — Temporal endures nothing today; durability comes from PG + evidence dirs.
- EXECUTORS EXECUTE: **holds** (Hermes worker; ORCA never executes).
- EVIDENCE PROVES: **holds** for the witnessed paths (canonical events + artifact chain; discrepancies classified, not hidden).

---

## (d) A6 SMALLEST-CHANGE LIST (from the witnessed FAIL proof §8 + this audit; DO NOT IMPLEMENT per task)

Already built (commit 6a342dd27) but **unproven** — re-test is the promotion gate:
1. ✅(code) Stable objective identity: `deriveObjectiveId` from logical intent only.
2. ✅(code) Stable work_order_id / attempt_id across restarts.
3. ✅(code) Startup reconciliation before any dispatch (COMPLETED → exit 0; cancelled → exit 4; in-flight workorders resumed, not re-issued).
4. ✅(code) Crash-safe dispatch rendezvous (atomic dispatcher-written result file outside dispatcher memory).
5. ✅(code) Durable budget + single-coordinator claim (PG advisory lock) + durable cancellation.

Still missing (genuine gaps):
6. **Re-run the witnessed kill -9 test** against the remediated loop; promote A6 only on zero duplicate WorkOrders + zero lost missions. (Highest leverage; everything else is prose until this runs.)
7. **ORCA_CYCLE_STARTED / ORCA_CYCLE_STOPPED canonical events** (gap G2, RESTART-RECOVERY-DESIGN.md) so a restart can distinguish a crashed cycle from a clean stop via `ping_events` alone.
8. **Pre-dispatch terminal-event check**: never dispatch a work_order_id that already has a terminal WORKER_COMPLETED/WORKER_FAILED event (kills the demonstrated duplicate-execution path even if reconciliation is bypassed).
9. **Orphan cleanup**: crash-safe removal/reconciliation of the Windows Temp dispatch artifact (`C:\Windows\Temp\orca-hermes-dispatch.py` leftover demonstrated).
10. **Supervised deployment**: docker restart policy for the loop container (blocker 1 in RESTART-RECOVERY-DESIGN.md) — without it, "restart resilience" has no restart to be resilient across at the infrastructure layer.
11. **Verification-time SUSPECT flag** for worker envelopes with round/placeholder timestamps (the 2B discrepancy's permitted correction; operator-gated).

---

## (e) EFFECT-PATH AUDIT — five-state coverage + effect-identity verdict

Required distinction: PROPOSED ACTION ≠ APPROVED ACTION ≠ ATTEMPTED EFFECT ≠ OBSERVED EFFECT ≠ VERIFIED OUTCOME.

### Effect paths capable of external effects (whole source universe)

| # | Path | Real? | PROPOSED | APPROVED | ATTEMPTED | OBSERVED | VERIFIED | Effect identity? |
|---|---|---|---|---|---|---|---|---|
| 1 | **Hermes work orders** (`external_agent_adapter.issueWorkOrder` → `hermes_dispatch.py` spawn on Windows; arbitrary capabilities incl. file/network/browser on that host) | **YES — the only real one** | ✅ `workorder-T.json` + in-memory envelope (evidence dir on disk) | ❌ **none durable** — `authorizeWorkOrder` grant is authorization, not approval; `email.send`/`sms.send` → policy escalation (blocks, exit 3) | ✅ `dispatch-T-aN.json` | ✅ result envelope JSON | ✅ `verifyResultEnvelope` → `recordVerifiedResult` → canonical WORKER_COMPLETED/WORKER_FAILED in `ping_events` | ❌ none — no `effect_id`, no dedupe check |
| 2 | Email (`EmailConnector` → `EmailIntegration`) | **NO — stub** (P054: "not functional until SMTP configured"; in-memory `_sentEmails` array) | n/a | n/a | n/a | n/a | n/a | n/a |
| 3 | SMS (`SMSConnector` → `sms_integration`) | **NO — stub** (Twilio not configured) | n/a | n/a | n/a | n/a | n/a | n/a |
| 4 | PostHog (`posthog_integration`) | **NO — stub** | n/a | n/a | n/a | n/a | n/a | n/a |
| 5 | GitHub (`GitHubConnector`/`github_adapter`) | Read-only (metadata fetch, sync surfaces); no write methods found | n/a | n/a | n/a | n/a | n/a | n/a |
| 6 | Google (`GoogleConnector`) | calendar scope is **readonly**; sync-only; adapters optional/null | n/a | n/a | n/a | n/a | n/a | n/a |
| 7 | Browser automation (Playwright/Puppeteer) | **NONE in repo** (no matches in `ping-runtime/`, `gateway/`) | n/a | n/a | n/a | n/a | n/a | n/a |
| 8 | Financial/business integrations (Stripe/Plaid/finance) | **NONE in repo** | n/a | n/a | n/a | n/a | n/a | n/a |
| 9 | Pigi outreach machinery (Gmail skill, Pig browsers) | Real, but **outside the PING repo** (workspace skills) — out of scope for this audit; noted because it is the actual live external-effect surface | — | — | — | — | — | — |

**Effect-identity verdict: NO exact effect identity exists in any live path.**
`EffectAuthority` (`ping-runtime/approval/effect_authority.js`) defines `generateEffectId` and the
AUTHORIZED → EXECUTING → SUCCEEDED/FAILED transitions, but: (i) **zero importers** outside its own
directory (no connector, no adapter, no route, no Temporal activity calls it); (ii) **in-memory by default**
— the restart-durability test (commit 88c9651be) proves state is lost on restart; (iii) the identity formula
`sha256(eventType=capability.upper(), aggregateId=targetIdentity, actionType=capability.split('.')[1])[0:16]`
**omits mission_id, proposed_action_id, approval_id, and payload** — two genuinely distinct approved actions
(e.g. two different emails to the same customer) collide to one `effect_id`, while the commit message claims
"Same approved action = same effect_id" without defining action sameness; (iv) `createEffect` never checks for
an existing effect (in-memory: silent overwrite); (v) `isEffectCompleted` exists but has no callers.

### Where approval currently lives

| Mechanism | Location | Durability | Wired to |
|---|---|---|---|
| `BusinessActionAuthority` (PENDING_HUMAN → APPROVED/REJECTED/EXPIRED) | `ping-runtime/approval/business_action_authority.js` | **In-memory** (experimental) | Nothing |
| ORCA policy escalation | `orca_policy.js` → `Escalation` → `99-escalate.json`, exit 3 | Evidence-dir files | ORCA loop only |
| Temporal `approvalSignal` | `mission_workflow.js` | N/A (never runs) | Nothing |
| `authorizeWorkOrder` grant | `external_agent_adapter.js:253` | Policy config (7 LIVE profiles) | Hermes dispatch — this is **authorization**, not human approval |

**Approval today = phantom/experimental.** The one human-approval-shaped mechanism with any runtime effect is
"block and escalate to a file" in the ORCA loop.

---

## (f) APPROVAL STATE-MACHINE DESIGN (no implementation; smallest durable machine)

Constraints: no new authorities, no new stores beyond what exists; PING owns the decision; Temporal endures the wait.

**States (durable):** `PROPOSED → APPROVED | REJECTED | EXPIRED | SUPERSEDED → EFFECT_AUTHORIZED → EFFECT_EXECUTING → EFFECT_SUCCEEDED | EFFECT_FAILED` (terminal). `EFFECT_FAILED` may transition to `EFFECT_AUTHORIZED` (retry = new attempt, same effect_id).

**Identity (fixing the current formula):** `effect_id = 'effect_' + sha256(approval_id)[0:16]` — the *approved action*
is the identity root (stable across Temporal retry, connector retry, and restart by construction).
`action_id = 'action_' + sha256(mission_id, capability, target_identity, payload_hash)[0:16]` — include the
payload hash so two different emails to the same target do not collide (current formula omits it).

**Durability:** canonical `ping_events` rows (PROPOSED_ACTION, ACTION_APPROVED/REJECTED/EXPIRED,
EFFECT_AUTHORIZED/EXECUTING/SUCCEEDED/FAILED) — no new tables; the existing in-memory maps become a
read-through cache. Status-guarded transitions (`UPDATE ... WHERE status='PENDING_HUMAN'`) make concurrent
approve/reject safe; `rowCount=0` = lost race, observable.

**Wiring (smallest):**
1. `proposeAction` called by the dispatcher before any outward capability; returns `action_id`.
2. Human decides via one minimal route: `GET /approvals/pending`, `POST /approvals/:id/decision` (operator-gated UI; no quorum machinery).
3. Temporal `approvalSignal` → `approveAction`/`rejectAction` (durable); workflow `condition()` wait is the durable timer (replaces the escalation-file block).
4. `executeWorkOrder` activity (once real): `createEffect` → `isEffectCompleted` pre-check (dedupe gate) → `markExecuting(providerRequestId)` → provider call with `Idempotency-Key: effect_id` header where supported → `markSucceeded`/`markFailed`.
5. Crash rule: on restart, any `EFFECT_EXECUTING` with no provider confirmation is re-checked against the provider (by `provider_request_id`) before re-execution — never blindly retried.

**Why this is minimal:** it reuses the existing two classes' API shape, the existing event authority for
durability, and the existing Temporal signal/wait mechanics; it changes the identity formula, the storage
default, and adds exactly one pre-execution gate and one human route.

---

## (g) DECISION-OWNERSHIP ROWS

| Decision | Current owner (code) | Target owner (split) | Status |
|---|---|---|---|
| Durable workflow history | Nobody (0 workflows) | Temporal | GAP |
| Durable timers | Nobody durable | Temporal | GAP |
| Activity scheduling | MissionScheduler._poll (PING, live) | Temporal | VIOLATION |
| Heartbeats | MissionScheduler.renewLease (PING, live) | Temporal | VIOLATION (partial) |
| Durable retry | MissionRuntime.failWithRetry (PING, live) | Temporal | VIOLATION |
| Workflow recovery | MissionScheduler.reapExpiredLeases (PING, live) | Temporal | VIOLATION |
| Semantic truth / events | UnifiedEventRuntime (PING) | PING | OK |
| Identity | IdentityAuthority (PING) | PING | OK |
| Authorization | authorizeWorkOrder (PING) | PING | OK |
| Capability definition | capability registry + AGENT_PROFILES (PING) | PING | OK |
| Evidence validation/recording | verifyResultEnvelope / recordVerifiedResult (PING) | PING | OK |
| Narrow protocol retry | Nobody (stubs) | Connectors | GAP (harmless) |
| Serialization retry | Nobody | DB | GAP |
| Effect identity | EffectAuthority (unwired, in-memory) | PING (EffectAuthority, once durable+wired) | GAP |
| Human approval | Escalation files (ORCA) + BusinessActionAuthority (unwired) | PING (one gate) | **COMPETING — two mechanisms, neither durable** |
| Mission lifecycle truth | MissionRuntime (PING) | PING | OK |
| Control-loop planning | ORCA (new loop) | ORCA | OK |
| WHEN (time ordering) | `gateway/temporal_authority.js` — NOTE: this is time-ordering, not the Temporal engine | PING (constitutional time) | OK but MISNAMED (see C5) |

---

## (h) CONTRADICTIONS

- **C1. A0 vs A5.** `orca/ORCA-ROLE.md:4,121` certifies "Current certification: A0 (facade)" while
  `orca/control-loop/A5-CERTIFICATION-RECORD.md` closes "A5 PROVEN". Different subjects (old engine vs new
  control loop), but ROLE.md never scopes the A0 claim — a reader concludes ORCA is A0 overall. The role doc
  needs a per-implementation certification table.
- **C2. Temporal owns execution mechanics (claimed) vs PING owns them (running).** The temporal commits'
  constitutional constraint ("Temporal owns retry, wait, resume, history") is inverted by the live system:
  PING owns poll, lease, retry, reaping; Temporal owns nothing. The constraint is documentation, not code.
- **C3. EffectAuthority restart claim vs in-memory reality.** Commit f250c19ca message: "Restart = same
  effect_id" — but commit 88c9651be's test proves restart loses all effect state. The idempotency promise is
  void without durable storage.
- **C4. Broken scheduler provider.** `TemporalSchedulerProvider.schedule()` starts `'ConstitutionalWorkflow'`,
  which is defined nowhere; `wiring.js` points `workflowsPath` at `gateway/temporal_workflows.js`, which does
  not exist. A provider that schedules nonexistent workflows is worse than no provider.
- **C5. Naming collision: two "Temporals".** `gateway/temporal_authority.js` ("Milestone 13 — Temporal";
  "Temporal records WHEN, never WHAT") is about **time-ordering of events**, unrelated to the Temporal
  durable-execution engine (`@temporalio`). The collision already confuses grep-level audits.
- **C6. Determinism fix stranded on a sibling branch.** Commit 57156ecf2 ("replace new Date() with
  Temporal-safe time + experimental notice") is the tip of `feature/temporal-durable-execution`; the
  checked-out `feature/approval-effect-identity` workflow still uses `new Date()`. Two branches, one workflow
  file, divergent determinism semantics, no merge.
- **C7. Restart design vs loop reality.** `orca/RESTART-RECOVERY-DESIGN.md` §1 Step 2 describes recovery via
  `MissionRuntime.claimMission`/`MISSION_ASSIGNED`, but the A6 proof establishes the loop **never creates
  MissionRuntime missions** — the design's recovery path references machinery the loop does not use.
- **C8. Approval identity collision.** `generateActionId`/`generateEffectId` omit the payload/content hash, so
  distinct actions to the same target share an identity — contradicting the "no duplicate customer effect"
  goal (it creates the opposite failure: distinct effects merged).

---

## (i) UNKNOWNS

- U1. Does `ping-gateway:devin-boundary2` (built 2026-09-16) contain any Temporal code? (Almost certainly not —
  codex temporal commits are 2026-09-17 — but image contents were not inspected.)
- U2. Is `ping-temporal-dev`'s `/data/temporal.db` on a volume? Who starts the container (compose vs manual)?
  A recreation resets the "0 workflows" observation.
- U3. MissionScheduler's live config in the running container (poll interval, maxConcurrent) vs repo defaults.
- U4. Whether the 6a342dd27 remediation actually passes a re-run kill test (the code reads correctly; runtime
  behavior is unverified — this is the A6 promotion gate, not an unknown to guess at).
- U5. OpenCode worker family's permission gate (A5 scope is Hermes-only until resolved).
- U6. No evidence was found of who consumes `TemporalSchedulerProvider.schedule()` — `constitutional_execution_pipeline.js:61`
  calls `this._replayScheduler.schedule(...)`; whether `_replayScheduler` is the Temporal-backed port in any
  live wiring is unconfirmed.

---

## (j) CANDIDATE DELETIONS / MERGES

- **M1. Merge the temporal branches.** `feature/temporal-durable-execution` (determinism fix) ↔
  `feature/approval-effect-identity` (approval + effect). One workflow file, one determinism semantic. (Merge, not delete.)
- **M2. Rename `gateway/temporal_authority.js`** → `time_ordering_authority.js` (or fold into the constitutional
  time authority). Kills the C5 naming collision. (Rename; keep behavior.)
- **M3. Delete or repair `TemporalSchedulerProvider`.** Either define and register the `ConstitutionalWorkflow`
  it starts and create `gateway/temporal_workflows.js`, or delete the provider + its wiring. A broken provider
  must not ship. (Operator decision: repair vs delete.)
- **M4. One approval mechanism.** `BusinessActionAuthority` (durable, once fixed) **or** ORCA escalation files —
  not both. The escalation path becomes "propose → PENDING_HUMAN → expire/escalate", i.e. a special case of the
  gate, not a parallel system. (Merge.)
- **M5. Converge the two Temporal integration points** (`ping-runtime/temporal/` workflow + `gateway/temporal_runtime.js`
  lifecycle) into one: lifecycle-owned worker running the PING workflow. Today they are two half-integrations
  that reference each other nowhere. (Merge; needs the operator's Temporal rollout decision.)
- **M6. Old ExecutionEngine vs new control loop.** Once the Orca-vs-live-spine convergence decision lands,
  retire one: the engine's `startAutonomousLoop` (even the honest one) overlaps `orca_control_loop.js`.
  The `_SYNTHETIC_HISTORICAL_DEPRECATED` preservation stays as history regardless. (Decision-gated.)
- **M7. `ping-runtime/orchestration/*.json` temporal mentions** (LawRouter.json etc.) — generated index chatter;
  harmless, no action unless regenerating indexes.

---

## (k) TOP-5 HIGHEST-CONFIDENCE IMPROVEMENTS

1. **Re-run the witnessed A6 kill test against the 6a342dd27 remediation.** The code claims durable objective
   identity, stable work-order IDs, crash-safe rendezvous, and startup reconciliation; only a live kill -9
   re-test with zero duplicate WorkOrders and zero lost missions promotes A6 from WIRED_UNPROVEN. This is the
   single highest-leverage verification in the track. (Evidence: §8 of the A6 proof lists exactly what to check.)
2. **Wire approval + effect identity to Postgres and to the one real effect path (Hermes dispatch).**
   `BusinessActionAuthority`/`EffectAuthority` with the corrected identity formulas (§f), status-guarded
   transitions, and an `isEffectCompleted` pre-dispatch gate close the demonstrated duplicate-execution hole
   with the smallest durable change. Unwired idempotency is decoration.
3. **Fix or delete the broken Temporal scheduler provider (C4).** Define/register `ConstitutionalWorkflow`
   and create the missing `temporal_workflows.js`, or remove the provider and its wiring. A scheduler that
   starts nonexistent workflows is a landmine for the first caller.
4. **Merge the temporal branches (C6) and pick one Temporal integration (M5).** Determinism semantics must
   not diverge across branches; lifecycle (`temporal_runtime.js`) and workflow (`ping-runtime/temporal/`)
   must become one runnable unit before any "Temporal endures" claim is made.
5. **Add ORCA_CYCLE_STARTED/STOPPED canonical events + supervised deployment of the control loop.**
   Two cheap, independent enablers: the events let any restart distinguish crash from clean stop via
   `ping_events` alone (gap G2); a docker restart policy gives the loop the restarts its resilience is
   supposed to survive. Both are prerequisites for an honest A7 later.

---

## Evidence hierarchy note

LIVE RUNTIME TRACE was obtained where it mattered: Temporal server `listWorkflow` → 0 workflows;
`ping-gateway` logs → EventBridge/MissionScheduler polling live; A6 kill test → witnessed FAIL with
event IDs read back from PG. Everything above it in the hierarchy that I cite (current executable code,
integration/unit tests, config, commits) is file:line-referenced. Documentation and comments were treated
as claims and checked against code; naming was treated as suspect (C5). Architectural intent
("Temporal owns execution mechanics") was falsified against the running system.

**Maturity summary:** Temporal = EXPERIMENTAL (codex lifecycle: WIRED_UNPROVEN; main-repo workflow:
EXPERIMENTAL; server: live but zero workflows → PROVEN_DURABLE infra, unproven integration).
ORCA old engine = A0 PROVEN facade. ORCA control loop = A1-A4 PROVEN_RUNTIME, A5 PROVEN_RUNTIME (bounded,
operator-verified), A6 FALSIFIED with remediation WIRED_UNPROVEN, A7 DOCUMENTED_ONLY.
Approval/effect = EXPERIMENTAL, in-memory, wired to nothing (COORDINATOR_CLAIMED idempotency).
