# P3 evidence: shadow evaluation worker (ping-runtime/jev/shadow_worker.js + registration)

Observed: 2026-09-22 ~20:30 MDT. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted).

## PROBLEM
Jev must observe real claim flow and produce evaluation records without altering canonical pipeline behavior and without any execution authority. No such observer existed.

## SOURCE EVIDENCE
- registerCanonicalWorkers wires observation -> claim -> classification -> recommendation -> projection -> replay -> witness -> lineage through MissionScheduler dispatch (single dispatch path, worker_runtime.js:50).
- EventToMissionBridge EVENT_MISSION_MAP has no mapping for evaluation types; unmapped types are terminal (bridge returns without mission creation).
- BaseWorker._emit preserves correlation_id from the triggering event, so side-records join the same correlation group (verified in source, canonical_workers.js _emit).

## LIVE REACHABILITY
Registered in gateway_runtime.js immediately after registerCanonicalWorkers: worker 'jev-shadow', eventTypes ['CLAIM_CREATED'], capabilities ['jev.shadow'], maxConcurrent 2. The scheduler dispatches CLAIM_CREATED to it whenever mission CLAIM_GENERATE runs (MISSION_WORKER_MAP: CLAIM_GENERATE -> 'claim' emits CLAIM_CREATED; jev-shadow subscribes to the artifact event, same pattern as commit 6db4a961c).

## WHY THIS PATCH
One worker, one trigger, one emission. It builds a DecisionRequest from the canonical claim + evidence refs, runs configured providers independently, and emits JEV_DECISION_EVALUATED through the canonical event mechanism. Canonical workers run exactly as before.

## FILES TOUCHED
- ping-runtime/jev/shadow_worker.js (new)
- gateway/bootstrap/gateway_runtime.js (+15 lines: require + registration)

## AUTHORITY BEFORE
CLAIM_CREATED flowed to classification with no independent evaluation.

## AUTHORITY AFTER
Unchanged for the canonical pipeline. The shadow worker adds observation records only. Each evaluation carries mayExecute:{allowed:false, mode:'shadow'} per provider, so even a future model provider cannot self-authorize.

## PERSISTENCE EFFECT
One JEV_DECISION_EVALUATED event per CLAIM_CREATED, persisted via UnifiedEventRuntime.emit into ping_events (event-derived persistence; no new store). Payload: domain, subjectRef, evidenceRefs, per-provider evaluations with full provenance, agreement field, mode:'shadow', evaluatedAt.

## REPLAY EFFECT
The emission preserves correlation_id from the triggering CLAIM_CREATED (via BaseWorker._emit), so P1's getCorrelationGroup replay includes the evaluation record in the causal group. Provider failures are recorded as {decision:null, error} on the record, never swallowed, never fabricated.

## SECURITY EFFECT
No new authority. The worker cannot dispatch, cannot create missions, cannot approve. Provider exceptions cannot become decisions.

## ROLLBACK
Remove the registration block from gateway_runtime.js and delete ping-runtime/jev/shadow_worker.js. Canonical pipeline unaffected.

## TEST
- gateway/test_jev_shadow.js: 21/21 pass, including: one emission per CLAIM_CREATED with correct record shape, correlation preservation, skip on missing claim (no emit), provider failure recorded without fabrication, two-provider agreement computation.

## FALSIFICATION CONDITION
If the shadow worker ever alters canonical worker behavior, emits anything other than JEV_DECISION_EVALUATED, or produces a record with mayExecute.allowed:true, the shadow boundary is broken.
