# Dispatch-path forensics: which route actually fires

Observed: 2026-09-22 evening. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). Read-only; no source modified. Builds on [WITNESS-forensic-7-cases.md](sandbox://workspace/jev/evidence/WITNESS-forensic-7-cases.md) and [SYNTHETIC-CONFIDENCE-CEILING.md](sandbox://workspace/jev/evidence/SYNTHETIC-CONFIDENCE-CEILING.md); corrects parts of both.

## PROBLEM
WitnessWorker and ProjectionWorker appeared reachable via two routes: (a) direct WorkerRuntime subscription, (b) the event→mission bridge. Prior forensics called ProjectionWorker's LINEAGE_CREATED subscription "dead" via the bridge path while LP-2 described WitnessWorker as "directly subscribed to REPLAY_COMPLETED." Both framings were wrong. There is exactly ONE live dispatch route in the running gateway, and several downstream claims (Qdrant projection of the forged chain) need correction.

## ROUTE MAP

### Route A — "direct WorkerRuntime subscription": DOES NOT EXIST
- Workers never subscribe to UnifiedEventRuntime. No `eventRuntime.on(...)` exists in `ping-runtime/workers/canonical_workers.js` or `ping-runtime/workers/worker_runtime.js` (grep-verified).
- WorkerRuntime is explicitly dispatch-only: "Workers receive events via dispatch() only (MissionScheduler is the single dispatch path). The _poll() loop is disabled to prevent dual input paths and race conditions." (worker_runtime.js:50-56).
- `WorkerRuntime._poll()` (worker_runtime.js:147-157) is defined but never invoked anywhere in the codebase — the `this.dispatch(event)` call at worker_runtime.js:157 is unreachable in the running gateway.
- The `eventTypes` arrays in `registerCanonicalWorkers` (canonical_workers.js:726-752) are NOT subscriptions. They are a match filter consumed only by `WorkerRuntime.dispatch()`: "a worker is selected iff entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)" (dispatch, worker_runtime.js:69-105; doc-contract restated at mission_scheduler.js:30-39).
- Correction: the phrase "directly subscribed" in the LP-2 record is retracted. Registration ≠ subscription.

### Route B — event→mission bridge: THE ONLY LIVE ROUTE
Full chain, with anchors:

1. `UnifiedEventRuntime.emit(eventType, source, payload)` persists to `ping_events` (INSERT ... ON CONFLICT DO NOTHING) and then synchronously invokes in-process handlers (unified_event_runtime.js:73, steps 5-6 at lines ~150-190).
2. In-process handlers on the event bus: `EventToMissionBridge` (subscribes to every key of EVENT_MISSION_MAP, event_to_mission_bridge.js:96-101), the graph-projection subscriber (gateway_runtime.js:606-640), and `EmbeddingService.subscribe()` (ping-runtime/embeddings/embedding_service.js:123-160).
3. Bridge `_handleEvent` maps the event type to a mission type (EVENT_MISSION_MAP, event_to_mission_bridge.js:28-68) and creates a mission carrying the ORIGINAL event fields: `event_id, event_type, source, namespace, correlation_id, canonical_hash, confidence, payload` (event_to_mission_bridge.js:126-140).
4. `MissionScheduler` polls MissionRuntime every 5000ms (gateway_runtime.js:568-577), resolves the assign-label via MISSION_WORKER_MAP (mission_scheduler.js:41-87 — labeling only, per doc-contract), and builds the dispatch event with `event_type = payload.event_type` — the ORIGINAL business event type, never the mission_type (mission_scheduler.js:218-246).
5. `WorkerRuntime.dispatch(event)` fans out to EVERY registered worker whose `eventTypes` includes `event.event_type` (worker_runtime.js:74-80). This is a broadcast fan-out, not a single-worker routing: multiple workers matching one event type all run.
6. P0-3 completion semantics: mission completes only when a worker returns a non-failed result; null dispatch (no worker matched) fails the mission rather than phantom-completing (mission_scheduler.js:252-270).

## PROVEN-ACTIVE vs DEAD, PER WORKER

| Worker | Registration eventTypes | How it fires (only route) | Status |
|---|---|---|---|
| witness | ['WITNESS_CREATE', 'REPLAY_COMPLETED'] | Bridge maps REPLAY_COMPLETED → WITNESS_CREATE mission (event_to_mission_bridge.js:65); scheduler dispatches event_type=REPLAY_COMPLETED → matches witness entry (canonical_workers.js:493 gate) | ACTIVE via bridge |
| lineage | ['LINEAGE_CREATE', 'WITNESS_CREATED'] | Bridge maps WITNESS_CREATED → LINEAGE_CREATE mission (line 66); dispatch event_type=WITNESS_CREATED → matches | ACTIVE via bridge |
| projection | ['KNOWLEDGE_INDEX', 'PROJECTION_CREATE', 'RECOMMENDATION_CREATED', 'LINEAGE_CREATED'] | Bridge maps RECOMMENDATION_CREATED → PROJECTION_CREATE mission (line 62); dispatch event_type=RECOMMENDATION_CREATED → matches. LINEAGE_CREATED entry: no bridge mapping (terminal, line 67), no producer of LINEAGE_CREATED missions, no other dispatch route | ACTIVE on RECOMMENDATION_CREATED; LINEAGE_CREATED entry DEAD |
| replay | ['REPLAY_VERIFY', 'PROJECTION_CREATED'] | Bridge maps PROJECTION_CREATED → REPLAY_VERIFY mission (line 63); dispatch event_type=PROJECTION_CREATED → matches | ACTIVE via bridge |
| classification | ['CLAIM_CREATED', 'CLASSIFICATION_CREATE'] | Bridge maps CLAIM_CREATED → CLASSIFICATION_CREATE mission (line 60); dispatch event_type=CLAIM_CREATED → matches | ACTIVE via bridge |
| jev-shadow (P3) | ['CLAIM_CREATED'] | Same CLASSIFICATION_CREATE mission; dispatch fan-out on event_type=CLAIM_CREATED matches BOTH classification and jev-shadow. Per CLAIM_CREATED, ClassificationWorker and JevShadowWorker both run. | ACTIVE via bridge fan-out |
| intelligence | [] | Registration loop skips empty eventTypes (canonical_workers.js:747-752) | DORMANT (LP-7 stands) |

Notes:
- The `WITNESS_CREATE` / `LINEAGE_CREATE` / etc. entries in worker registrations are effectively inert: the bridge always threads the original event_type into the mission payload, and no producer emits events literally typed WITNESS_CREATE. They would only match if a mission carried event_type=WITNESS_CREATE, which nothing creates.
- Consequence for any fix: closing the witness path means closing the BRIDGE→MISSION→SCHEDULER→DISPATCH route (or gating at the worker). There is no second path to close and no path that bypasses the mission layer.

## LP-2 TRAVERSAL CHAIN — CORRECTED AND ANCHORED

Unauthenticated `POST /events` with `{event_type:'REPLAY_COMPLETED', event_data:{replay:{verified:true}}}`:

1. `POST /events` → gateway/routes/events.js:113-121 → `eventRuntime.emit(event_type, 'api', event_data, {metadata:{aggregate_id, aggregate_type}})`. The route validates only that the four body fields are present. Mounted at `this._app.use('/events', ...)` (gateway_runtime.js:697); the only global middleware is `express.json()` + CORS headers (gateway_runtime.js:117-127). No auth middleware at route or mount layer. CONFIRMED.
2. `UnifiedEventRuntime.emit` (unified_event_runtime.js:73): event_id is deterministic content hash (sha256 of eventType+source+payload). Type validated against the registry (REPLAY_COMPLETED is registered); namespace governance validates the namespace only — payload content is NOT validated. Persist to ping_events (ON CONFLICT DO NOTHING).
3. IMPORTANT NUANCE: on exact-duplicate payload (same event_id), persist dedups but handler dispatch (step 6, unified_event_runtime.js:184-191) still runs — handlers fire even on dedup. Re-posting an identical forgery re-triggers the chain.
4. In-process handlers: bridge `_handleEvent(REPLAY_COMPLETED)` → mission `WITNESS_CREATE` {event_type: REPLAY_COMPLETED, payload: forged} (event_to_mission_bridge.js:65, 126-140).
5. MissionScheduler (≤5s poll) → assign label 'witness' → build event {event_type: REPLAY_COMPLETED} → `WorkerRuntime.dispatch` → WitnessWorker.handle (canonical_workers.js:480-530; gate at :493 checks `payload.replay.verified === true` only) → attests → `_emit('WITNESS_CREATED')` → ping_events + handlers.
6. Bridge `_handleEvent(WITNESS_CREATED)` → mission `LINEAGE_CREATE` → scheduler → dispatch event_type=WITNESS_CREATED → LineageWorker.handle → `_emit('LINEAGE_CREATED')` → bridge: no mapping (terminal, event_to_mission_bridge.js:67).

Downstream consumers of the forged chain (corrected):
- `/witness/stats` (gateway/routes/mission_control.js:568-587) counts WITNESS_CREATED rows → forged attestations inflate witness statistics. LIVE.
- Witness chain tail (mission_control.js:590-620) filters WITNESS_CREATED/WITNESS_REJECTED → forged attestations appear as apparently-verified chain tails. LIVE.
- Qdrant: NOT reached by the forged chain. CORRECTION to the prior record: EmbeddingService INDEXABLE_TYPES (ping-runtime/embeddings/embedding_service.js:25-44) contains OBSERVATION_CREATED, CLAIM_CREATED, RECOMMENDATION_CREATED, PROJECTION_CREATED and business types — but NOT WITNESS_CREATED, LINEAGE_CREATED, or REPLAY_COMPLETED. The graph-projection subscriber (gateway_runtime.js:606-640, GRAPH_PROJECTION_EVENTS) likewise excludes them. ProjectionWorker's LINEAGE_CREATED entry is dead (above). So the forged attestation persists in ping_events and pollutes witness stats/tails, but does NOT become a Qdrant vector through the canonical path. The prior "→ Qdrant point" claim for LP-2 is retracted; severity remains high (durable apparently-verified attestation in the event journal + stats API), but the Qdrant leg was overstated.

## LP-6 LIVENESS VERDICT: DEAD CODE

- `InferenceAdapter.analyze()` builds the Analysis object with hardcoded `confidence: 0.8` at object and payload level (ping-runtime/ai/inference_adapter.js:69-163; 0.8 at lines ~140 and ~156).
- The ONLY non-test caller is `gateway/constitutional_runtime.js:373` (`_stageAnalyze`: `this._inferenceAdapter.analyze([obj], 'Analyze this constitutional object')`).
- That `ConstitutionalRuntime` class (gateway/constitutional_runtime.js) is not instantiated anywhere in the gateway bootstrap. It is referenced only by tests and by `gateway/opentelemetry_witness_instrumentation.js`, which is itself not wired into gateway_runtime.js (no reference in bootstrap).
- `gateway/continuous_background_analyst.js` calls `this._ollamaAnalyst.analyze(query, {...})` — but `_ollamaAnalyst` is a `PersistentOllamaAnalyst` (injected, line 52-54; class required at line 48), a different class with a different `analyze(query, options)` signature. Not InferenceAdapter.
- `ConversationMemory` (wired at gateway/bootstrap/wiring.js:104) uses `getInferenceAdapter()` but only calls `.embed()` (conversation_memory.js:177, 202) — never `.analyze()`.
- STATUS: LP-6 is DORMANT/DEAD in the running gateway. The 0.8-confidence path is unreachable. Reclassification: from CANDIDATE to DEAD. Caveat: instantiating gateway/constitutional_runtime.js's ConstitutionalRuntime (or calling analyze() from any new caller) would silently activate it — the singleton `getInferenceAdapter()` makes this a one-line activation.

## FALSIFICATION CONDITION (for any subsequent fix)

1. Unauthenticated `POST /events` with forged `REPLAY_COMPLETED{replay:{verified:true}}` produces NO `WITNESS_CREATED`, NO witness-stats inflation, and (if accepted to the journal at all) no downstream mission — while a genuine kernel-verified replay still produces `WITNESS_CREATED` through the bridge→mission→dispatch path (no liveness regression).
2. `gateway/test_witness_adversarial.js`: all 7 WEAK reject, all 5 STRONG hold (no STRONG flips to attest).
3. Runtime single-fire probe: a synthetic REPLAY_COMPLETED through the spine in a test environment yields exactly one WitnessWorker.handle invocation, one completed WITNESS_CREATE mission, and a terminal LINEAGE_CREATED (no double-fire via phantom second path).
4. Dead-entry probe: assert ProjectionWorker's LINEAGE_CREATED registration entry never fires (counter), or remove the dead entry if dispatch is restructured — either way the claim must be machine-checked, not comment-checked.
5. Fan-out regression guard: after any dispatch-semantics change, re-verify the CLAIM_CREATED fan-out (ClassificationWorker + JevShadowWorker both fire exactly once per CLAIM_CREATED) — mirrors the doc-contract at test_commissioning.js:345-352 (dispatch on original event_type).

## EVIDENCE PACKET
- Problem: dispatch-path ambiguity — which route fires witness/projection workers.
- Source evidence: file:line citations throughout (worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073).
- Corrections to prior records: (a) "direct WorkerRuntime subscription" retracted — no such route exists; (b) LP-2 "→ Qdrant point" retracted — forged chain does not reach Qdrant via canonical subscribers; (c) LP-6 reclassified CANDIDATE → DEAD.
- Live reachability: bridge→mission→scheduler→dispatch is the single live worker route; POST /events unauthenticated reachability confirmed at route+mount layer (deployment-proven status NOT established — Sep-16 drift check still open).
- Files touched: none (read-only investigation).
- Authority before/after: no change. Persistence effect: none. Security effect: LP-2 remains the highest-severity ACTIVE laundering class (unauthenticated synthetic attestation into the journal + witness stats), narrowed but not downgraded.
- Tests: existing suites referenced; no new tests written (investigation only).

## NEXT UNCERTAINTY
The `EventBridge._skipGovernance: true` trust claim (event_bridge.js:184, 283) — internal table bridges bypass governance on the premise they are "already governed in source table." That is the internal analogue of LP-2: if any internal producer can write a verdict-shaped row into a bridged table, it enters the spine without governance. Forensic pass needed: enumerate the bridged tables, their writers, and whether a verdict-shaped payload can arrive through them. After that: the Sep-16 deployment drift map (deployed commit, image digest, enabled workers) to promote these worktree-proven findings to deployment-proven.
