# LANE: completion reconciliation + one real effect trace
**Mode:** FORENSIC, READ-ONLY (no worktree file touched; dirty state from other lanes preserved)
**Worktree:** `/home/nolan/worktrees/constitutional-convergence-authority-law` @ `1995f0a59`
**Date:** 2026-09-19 ~14:30 MDT
**Artifacts:** `failbefore-completion.js` (forensic script, ran on Pig scratch PG)

## COMPLETION IDENTITY VERDICT: NOT DETERMINISTIC — STOP

Per the task's stop rule, Part A patch design is STOPPED here. Identity must be fixed first; everything below is falsification and specification, not patch design.

`MissionRuntime.complete()` (mission_runtime.js:169-200) emits:
```js
this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime',
  { missionId, result, duration_ms });   // no logical_id option
```
`UnifiedEventRuntime.emit()` (unified_event_runtime.js:147) builds the identity preimage as
`{event_type, source, namespace, payload}` when no `logical_id` is passed. The payload contains two wall-clock-derived fields:

1. `duration_ms` = `Date.now() - started_at` (mission_runtime.js:174-179). Different on every call.
2. `result.completed_at` = `constitutionalTimeAuthority.nowAsISOString()` at the scheduler call site (mission_scheduler.js:349-352). Different on every call.

The `logical_id` mechanism (emit options, preimage key `logical_id`, collision-safe dedup at 1995f0a59) exists but `complete()` does not use it. Consequence, proven on scratch PG (F1 below): two emissions of the same logical completion mint two distinct `event_id`s. The collision-safety commit's ON CONFLICT dedup is therefore unreachable through the live completion path. Any completion reconciliation or regeneration design built on this identity would mint duplicates, not dedup.

Required precondition (stated as a finding, not a patch design): the MISSION_COMPLETED identity preimage must exclude wall-clock fields and bind a deterministic logical identity, e.g. `logical_id = {kind:'mission-completion', mission_id}` via the existing `options.logical_id` channel, with `duration_ms`/`completed_at` carried as observation metadata (timestamp/payload), not identity. Until that holds, "completion regenerable" and "state reconcilable" are unprovable properties.

## CRASH WINDOWS (current HEAD ordering: emit-checked → conditional UPDATE)

`complete()` does: SELECT started_at → `emit('MISSION_COMPLETED')` (persisted in emit's own internal tx, handlers + integrations dispatched inline) → check `{status:'ok'}` → conditional `UPDATE ... WHERE status='running'` (rowCount returned, scheduler ignores it).

| # | Window | Terminal state | Status |
|---|--------|----------------|--------|
| W0 | Before/during emit persist (emit tx rolls back) | no event, row `running` | Safe; retry is clean |
| W1 | After emit persist COMMIT, during handler/integration dispatch inside emit (steps 7-8) | event durable + dispatched, row `running` | Live. No live MISSION_COMPLETED handlers today, so blast radius is nil, but the ordering violation is structural: observers see a completion the row does not reflect |
| W2 | After emit returns `ok` (incl. `deduplicated:true`), before UPDATE issued | event durable, row `running` | Live. Indistinguishable from W1 after the fact |
| W3 | During UPDATE (query throws) | event durable, row `running` | Live. Same terminal state as W1/W2 |
| W4 | UPDATE matches 0 rows (lost race, or row already completed) | event accepted + dispatched, row never transitions | Live. `complete()` returns 0; scheduler does `stats.completed++` unconditionally (mission_scheduler.js:353), so the metric also lies |
| W5 | After UPDATE commit | event durable, row `completed` | The only fully consistent window |
| W6 | `complete()` with no eventRuntime (constructor default null) | row `completed`, no event ever | Phantom path. Production gateway wires the runtime (gateway_runtime.js:501), so this is test/eval-only, but the branch is live code |
| W7 | Re-execution after W1-W3 (lease reaper recycles `running` → `created`, scheduler re-claims) | second worker execution + second MISSION_COMPLETED with a NEW event_id | Live, proven chain F2→F1. The duplicate is not a dedup failure of the collision machinery; it is the identity defect above |

The old phantom (row `completed` with emit rejected) is closed at HEAD for the wired path: emit-checked-before-UPDATE with throw on non-`ok`. W4 is the surviving phantom-shaped defect (accepted event, row never transitions), and W7 is the surviving duplicate-shaped defect.

## FAIL-BEFORE RESULTS (scratch PG, production code paths, HEAD 1995f0a59)

Script: [failbefore-completion.js](sandbox://workspace/convergence-expansion-2026-09-19/lanes/completion-effect/failbefore-completion.js). Real `UnifiedEventRuntime` + real `MissionRuntime` + real PG; no mocks; scratch database created and dropped.

- **F1 PROVEN:** two emissions of the same logical completion (payloads differing only in `completed_at`/`duration_ms`, as any real retry would) minted 2 distinct event_ids (`event_9bb63245b481c8a7`, `event_b13e70ded8495537`). Completion identity is nondeterministic.
- **F1b control PROVEN:** a byte-identical re-emit returned `deduplicated:true` with the same event_id. The dedup machinery works; `complete()` can never reach it.
- **F2 PROVEN:** simulated crash after emit-accept before UPDATE: row stayed `running` with 1 accepted MISSION_COMPLETED. No reconciler exists for this state: P0B's `reconcileMissingMissions()` only derives missions from unconsumed business events (`EVENT_MISSION_MAP` has no MISSION_COMPLETED entry); nothing consumes MISSION_COMPLETED in ping-runtime (only emitted at mission_runtime.js:184; gateway/generated/event_generator.js is fixtures).
- **F2b PROVEN:** `reapExpiredLeases()` recycled the stranded row `running` → `created`, which the scheduler would re-claim: worker re-execution followed by a second `complete()` mints a second MISSION_COMPLETED (F1 chain).
- **F3 PROVEN:** real `mr.complete()` on an already-`completed` row returned `rowCount=0` but emitted anyway (events 1 → 2). Emit precedes the conditional UPDATE, so no-op completions are not no-ops.

4/4 defect shapes reproduced + 1 control. These are fail-before tests: each asserts the defect is present. Their pass-after counterparts are specified below but BLOCKED on the identity precondition.

### Specified-but-blocked test plans (cannot pass until identity is fixed)

- **T-REG-1 (completed mission lacking MISSION_COMPLETED → regenerable):** seed row `completed` with zero MISSION_COMPLETED events; run completion reconciler; assert exactly one MISSION_COMPLETED with `logical_id={kind:'mission-completion', mission_id}`; run reconciler again; assert still exactly one (dedup via ON CONFLICT + digest witness). BLOCKED on CE-001.
- **T-REC-1 (MISSION_COMPLETED existing while mission running → reconcilable):** seed row `running` + one accepted MISSION_COMPLETED (deterministic logical identity); run reconciler; assert row → `completed` exactly once, no second event, worker not re-executed (attempt record or reaper suppression proves non-re-execution). BLOCKED on CE-001.

## P0B / COLLISION INTERACTION

- **P0B (f4bf5304a):** durable event→mission reconciliation. Scope is creation-side only. It does not change any completion window above; F2's stranded state is outside its domain by construction.
- **Collision safety (1995f0a59):** same-tx conflict re-read, canonical_hash witness, fail-closed on true collision. For MISSION_COMPLETED this machinery is currently unreachable (F1), because no two completions ever share a preimage. It does not fix, mask, or worsen the completion defect. It DOES lower the cost of the eventual identity fix: once `complete()` passes a deterministic `logical_id`, the dedup/conflict path is already exact and tested.

No transactionality is claimed: convergence (deterministic identity + reconciliation), not shared transactions, is the mechanism that would close these windows, and the identity half is missing.

## PART B — ONE REAL EFFECT

### EFFECT SELECTED: EmailConnector dispatch path (the only registered outbound customer-communication connector)

Candidates audited and rejected: SMS integration (explicit stub, "not functional until Twilio/provider configured", sms_integration.js:1-2); PostHog integration (stub, returns `{status:'queued'}` with no network, posthog_integration.js:25); GitHub adapter (read-only HTTPS GETs for discovery, github_adapter.js); AI provider adapters (ollama/openai/huggingface: inference calls, no reachable live mission path; intelligence worker is dormant, canonical_workers.js:988); Qdrant/Neo4j (internal infra, projection upsert idempotent). No consequential customer-facing effect exists in the live path. The email path is selected because it is the closest real dispatch chain to trace.

### EFFECT TRACE (source-verified)

1. **Authorization:** gateway_runtime.js:219-222 registers `posthog`/`email`/`sms` integrations into `IntegrationManager` with an analytics policy. Per event: `_shouldRoute()` (integration_manager.js:117-127) checks the provider's `capabilities().eventTypes` allow-list, then `policy.isAllowedEventForIntegration(...)`, then `policy.redactPayload(...)`.
2. **Mission:** none. No mission type dispatches to email. Business missions (LEAD_FOLLOWUP, ESTIMATE_FOLLOWUP, REVIEW_RESPONSE) all map to the `observation` worker (mission_scheduler.js:69-80). No worker file references any email/SMS integration (grep-verified).
3. **Dispatch:** `UnifiedEventRuntime.emit()` step 8 calls `integrationManager.emit(event_type, payload)` in try/catch, return value unchecked (unified_event_runtime.js:375-380). BUT the email stub's capability allow-list is `['tenant.created','tenant.removed','deployment.failed','capability.unknown']` (email_integration.js:51-58): no canonical PING event type matches, so `_shouldRoute('email', <any real event>)` is false. **The email dispatch is registered but unreachable from the live canonical path.**
4. **Provider request:** does not exist. `EmailIntegration.send()` (email_integration.js:17-30, header: "Stub for email delivery — not functional until SMTP provider configured") appends to an in-memory `_sentEmails` array and returns `{status:'queued', email}`. No SMTP, no socket, no durability.
5. **Provider acknowledgement:** does not exist. `IntegrationManager.emit()` records `{integration:'email', status:'sent'}` whenever `provider.send()` resolves (integration_manager.js:66-72). For the stub, "resolves" means "appended to a RAM array". The `sent` status is therefore dishonest: it asserts delivery-side success for an effect that never left the process.
6. **Local result → canonical event → verification → completion:** the integration result is discarded by UER (errors only logged). No canonical event records the send. Nothing verifies. Mission completion is unrelated to it.

### CRASH MATRIX

| Kill point | Outcome | Knowable? |
|---|---|---|
| Before provider request | n/a: there is no provider request | n/a |
| After provider received, before response | n/a: no provider | n/a |
| After response, before local persistence | n/a: no response; stub "persistence" is a RAM array | n/a |
| After persistence, before canonical event | The only real crash boundary: process death wipes `_sentEmails`/`_sentSms`/`_sentEvents`. Anything reported `sent`/`queued` is silently lost | Knowable only as "the queue was in RAM": loss is certain on crash, invisible afterward |
| After canonical event, before mission completion | n/a: no canonical event is emitted for sends | n/a |

### UNKNOWN-OUTCOME FINDINGS

1. The system cannot distinguish "email delivered" from "email never attempted", because no delivery exists and no record of the attempt is durable. This is not an unknown-outcome problem to solve; it is a nonexistent-effect problem. The honest statement is: **the live path produces no external effect.**
2. The one real unknown-outcome hazard is the dishonest `sent` status: any operator reading `IntegrationManager.getStatus()` would conclude emails were sent. A stub reporting success is worse than a stub reporting disabled.
3. `_logEvent` mints its `event_id` as `sha256(integration:eventType:Date.now())` (integration_manager.js:131-138): nondeterministic identity in the in-memory audit log, same pattern as F1, lower stakes.

### SCHEMA VERDICT: DOES NOT PAY RENT

No durable attempt/effect record is necessary, because the trace proves there is no real effect instance to record. Per the rent rule (first instance solved locally, second compared, third extracted), creating `ping_mission_attempts`/`ping_effects` now would be framework-by-anticipation recording phantom effects. This concurs with Lane D's PATCH-06 verdict and supplies the missing first-instance showing: the first instance does not exist. What pays rent instead is (a) the honesty fix in CE-005 and (b) the standing gate rule: no effectful connector registers without authorize→ledger→dispatch→confirm, with the ledger specified only when the first real provider is wired.

## BACKLOG

**CE-001 — MISSION_COMPLETED identity is nondeterministic**
- PROBLEM: `complete()` emits with payload `{missionId, result, duration_ms}` and no `logical_id`; `duration_ms` (Date.now-based) and `result.completed_at` (wall clock) are in the identity preimage, so every completion mints a fresh event_id. Retries and re-executions duplicate instead of deduping.
- EVIDENCE: F1 proven on scratch PG (2 distinct event_ids for one logical completion); source mission_runtime.js:169-200, mission_scheduler.js:349-352, unified_event_runtime.js:147.
- VALUE: unblocks every completion-reconciliation design; makes the 1995f0a59 collision/dedup machinery reachable.
- FAILURE MODE: an identity fix that keeps any wall-clock field in the preimage reintroduces F1 silently.
- MINIMUM CHANGE: pass deterministic `logical_id={kind:'mission-completion', mission_id}` through the existing `options.logical_id` channel; move `duration_ms`/`completed_at` to observation metadata. No schema change.
- PROOF: F1 test inverted (two completions → one event_id, second returns `deduplicated:true`); then T-REG-1/T-REC-1 unblocked.
- DEPENDENCIES: none. Blocks CE-003 and T-REG-1/T-REC-1.
- RISK: low; additive option on an existing channel; historical rows untouched (their preimages are immutable).
- STATUS: PROPOSED (precondition; Part A patch design stopped per stop rule)

**CE-002 — complete() emits before checking the row is still completable**
- PROBLEM: emit precedes the conditional UPDATE, so `complete()` on an already-completed (or failed) row still mints a MISSION_COMPLETED event while returning rowCount 0.
- EVIDENCE: F3 proven with real `mr.complete()` (events 1→2, rowCount 0).
- VALUE: no-op completions stop producing spurious canonical events; removes one duplicate source independent of identity.
- FAILURE MODE: moving the check first without the identity fix still allows W7 duplicates.
- MINIMUM CHANGE: check-and-set the row (conditional UPDATE to a transient state or SELECT ... FOR UPDATE) before emitting; emit only if the transition was won.
- PROOF: F3 inverted (rowCount 0 → zero new events).
- DEPENDENCIES: CE-001 (the emit that remains must be deduplicating).
- RISK: low; ordering change inside one method.
- STATUS: PROPOSED

**CE-003 — event-exists/row-running completion divergence has no reconciler**
- PROBLEM: crash windows W1-W3 leave an accepted MISSION_COMPLETED with the row `running`; P0B reconciles only event→mission; the lease reaper recycles the row into full worker re-execution (F2→F1 duplicate chain).
- EVIDENCE: F2/F2b proven; EVENT_MISSION_MAP contains no MISSION_COMPLETED entry; no ping-runtime consumer of MISSION_COMPLETED exists.
- VALUE: closes the durable-causal-handoff gap on the completion side (Nolan's systemic framing: knowing the fact without a durable record of its downstream consequence).
- FAILURE MODE: a reconciler built on nondeterministic identity mints duplicates (must stay blocked on CE-001).
- MINIMUM CHANGE: a completion reconciler keyed on the deterministic completion identity (CE-001): if MISSION_COMPLETED exists and row is `running` → transition to `completed` without re-execution; if row `completed` and no event → regenerate (T-REG-1). Convergence, not a shared transaction.
- PROOF: T-REG-1 and T-REC-1 pass; F2 scenario ends in exactly one event + `completed` row with no re-execution.
- DEPENDENCIES: CE-001 (hard), CE-002 (ordering).
- RISK: medium; touches the completion path; must not reinterpret historical rows.
- STATUS: PROPOSED / BLOCKED ON CE-001

**CE-004 — scheduler counts completions it did not win**
- PROBLEM: `stats.completed++` runs unconditionally after `complete()` resolves (mission_scheduler.js:353), even when rowCount is 0 (W4 lost race / already completed). Phantom metric.
- EVIDENCE: source; F3 shows rowCount 0 is a live outcome.
- VALUE: honest operator metrics; cheap.
- FAILURE MODE: none material.
- MINIMUM CHANGE: `const n = await complete(...); if (n === 1) stats.completed++; else stats.completionSkipped++`.
- PROOF: unit test on the scheduler path with rowCount 0.
- DEPENDENCIES: none.
- RISK: negligible.
- STATUS: PROPOSED

**CE-005 — IntegrationManager reports stub sends as `sent`**
- PROBLEM: `status:'sent'` is recorded when a stub's `send()` resolves, i.e. when an email/SMS/PostHog payload was appended to a RAM array. Operators reading status conclude delivery happened. The stub queues are also wiped on process death: reported-`sent` effects silently lost.
- EVIDENCE: integration_manager.js:66-72, email_integration.js:1-2/17-30, sms_integration.js:1-2, posthog_integration.js:25.
- VALUE: honesty of the only externally visible delivery signal; removes a silent-loss vector's cover story.
- FAILURE MODE: renaming the status without fixing reachability could imply the stubs are closer to working than they are.
- MINIMUM CHANGE: stub `send()` returns `{status:'stubbed', durable:false}` and IntegrationManager records `stubbed`, never `sent`; document that `sent` means provider acknowledgement only. No schema.
- PROOF: route a canonical event through IntegrationManager with the stubs; assert no `sent` status is ever recorded.
- DEPENDENCIES: none.
- RISK: negligible.
- STATUS: PROPOSED

**CE-006 — standing effect gate (policy, no schema)**
- PROBLEM: when the first real provider is wired, there is currently no rule binding it to authorization, ledgering, dispatch, and confirmation; CE-005 shows the code path already mislabels outcomes.
- EVIDENCE: Part B trace; no effectful connector exists today (schema does not pay rent).
- VALUE: prevents the first real effect from inheriting the stub's dishonest outcome taxonomy.
- FAILURE MODE: writing the ledger schema now (anticipation); the gate must stay a rule until the first instance exists.
- MINIMUM CHANGE: record the gate rule (no effectful worker/connector registers without authorize→ledger→dispatch→confirm; ledger schema specified at first real provider wiring, minimum fields then: effect identity, authorization ref, dispatch ref, provider acknowledgement or UNKNOWN_OUTCOME, never success-by-default).
- PROOF: n/a until first provider; then the first-instance local solution is the proof.
- DEPENDENCIES: none.
- RISK: none (no code).
- STATUS: PROPOSED (standing rule)

## DECISION INBOX

**Q1: Is deterministic completion identity (CE-001) approved as the mandatory precondition before any completion-reconciliation work?**
- WHY: the stop rule fired on evidence: without deterministic identity, reconciliation mints duplicates (F1). Any lane designing completion convergence must sequence behind this.
- EVIDENCE: F1/F1b on scratch PG; preimage includes `duration_ms` and `completed_at`.
- DEFAULT SAFE ACTION: hold CE-002/CE-003 and T-REG-1/T-REC-1 as blocked; approve CE-001's minimum change (logical_id via existing channel, wall-clock fields to metadata).
- WHAT CHANGES: unblocks the completion side of the durable-causal-handoff program; makes 1995f0a59's dedup machinery live for completions.
- URGENCY: high (it gates the whole completion lane)

**Q2: For CE-003, which convergence shape: reconciler-from-canonical-event (specified above) or shared Postgres tx for emit+UPDATE (PATCH-02's C-A)?**
- WHY: both close W1-W4; they differ in mechanism (convergence vs transactionality) and in blast radius. The task forbids claiming transactionality where convergence is the real mechanism, so this is a genuine operator choice.
- EVIDENCE: crash-window table; F2 shows the divergence is already survivable via reaper, just wastefully (re-execution).
- DEFAULT SAFE ACTION: reconciler-from-canonical-event (no tx-spanning changes to emit's dispatch path; consistent with the convergence program's direction).
- WHAT CHANGES: determines CE-003's implementation shape and its proof obligations.
- URGENCY: medium (blocked on Q1 regardless)

**Q3: Historical duplicate MISSION_COMPLETED events: diagnostic query only, or operator-visible report?**
- WHY: F1 implies any mission completed more than once (retries, re-executions) likely has multiple MISSION_COMPLETED events with distinct ids in `ping_events` today. No auto-rewrite (history is immutable), but operators may want the diagnostic.
- EVIDENCE: F1 mechanism; no historical scan was run in this lane (read-only, scratch-only).
- DEFAULT SAFE ACTION: ship a read-only diagnostic query (missions with >1 MISSION_COMPLETED grouped by payload missionId); no row or event mutation.
- WHAT CHANGES: operator visibility into already-minted duplicates before CE-001 lands.
- URGENCY: low

## APPENDIX — reproduction

Fail-before script (4/4 shapes + 1 control, scratch PG, production code, no mocks):
[failbefore-completion.js](sandbox://workspace/convergence-expansion-2026-09-19/lanes/completion-effect/failbefore-completion.js)
Run on Pig: `NODE_PATH=/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/node_modules node /tmp/failbefore-completion.js` (uses repo-documented test PG creds, scratch database created/dropped).
Key source lines: mission_runtime.js:169-200 (complete), unified_event_runtime.js:134-147/213-230/294-330 (identity, mint, persist/dedup), mission_scheduler.js:334-353 (dispatch→complete), event_to_mission_bridge.js:60-110 (EVENT_MISSION_MAP, no MISSION_COMPLETED), integration_manager.js:56-72/117-138 (stub send marked sent; nondeterministic log id), email_integration.js:1-2/17-30 (stub), sms_integration.js:1-2 (stub).
