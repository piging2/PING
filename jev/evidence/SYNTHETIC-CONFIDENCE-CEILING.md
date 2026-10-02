# Synthetic-confidence ceiling trace

Observed: 2026-09-22 evening. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). Read-only; no source modified. Directive priority 2. Builds on [WITNESS-forensic-7-cases.md](sandbox://workspace/jev/evidence/WITNESS-forensic-7-cases.md) (do not redo that work; it is incorporated by reference).

## PROBLEM
Determine how much apparent confidence the pipeline can manufacture before encountering an independently grounded verification boundary. Trace every stage; classify each stage's emitted confidence as OBSERVED / DERIVED / INHERITED / SELF-ASSERTED / INDEPENDENTLY VERIFIED. Find every point where derived or inherited information becomes apparently stronger evidence without a new external observation.

## STAGE TABLE

| # | Stage | Event in → Event out | Confidence emitted | Classification | New external observation? |
|---|-------|---------------------|--------------------|----------------|---------------------------|
| 1 | Observation (ingestion → ObservationWorker) | DOCUMENT_IMPORT etc → OBSERVATION_CREATED | null (no confidence set anywhere in ingest adapters or document_ingestion.js) | OBSERVED (content grounded in external document); confidence honestly null = "not yet assessed" | Yes — the document/event itself |
| 2 | Claim (ClaimWorker) | OBSERVATION_CREATED → CLAIM_CREATED | null, via BaseWorker._emit metadata inheritance | INHERITED | No |
| 3 | Classification (ClassificationWorker) | CLAIM_CREATED → CLASSIFICATION_CREATED | `confidence: upstreamConfidence ?? null`, explicitly tagged `confidence_source: 'inherited'` (canonical_workers.js:589-590). Category/priority from deterministic rule tables | INHERITED (confidence); DERIVED (category/priority) | No — category/priority are deterministic transforms of the event type, not new evidence |
| 4 | Recommendation (RecommendationWorker) | CLASSIFICATION_CREATED → RECOMMENDATION_CREATED | `confidence: classification.confidence ?? null`, tagged 'inherited' (canonical_workers.js:654-655). Action/reason from rule table | INHERITED (confidence); DERIVED (action/reason) | No |
| 5 | Projection (ProjectionWorker) | RECOMMENDATION_CREATED / LINEAGE_CREATED → PROJECTION_CREATED + Qdrant point | none set; metadata inherits. Qdrant point carries payload + metadata | INHERITED | No |
| 6 | Replay (ReplayWorker) | PROJECTION_CREATED → REPLAY_COMPLETED | `verified = (kernelResult.status === 'ok' && violations.length === 0)` — joint computation, genuinely derived. But: `fingerprint: kernelResult.fingerprint \|\| null` (genuine path can emit verified:true with null fingerprint); `authority` evidence object carried but never inspected downstream; `canonical_input_hash` never populated (transcript lives only in worker memory) | DERIVED (verified flag) with structural gaps: no transcript identity, nullable execution identity | Partial — the kernel re-executes the transcript (recomputation, not a new external observation) |
| 7 | Witness (WitnessWorker) | REPLAY_COMPLETED → WITNESS_CREATED | trusts `payload.replay.verified === true` only; re-derives nothing | INHERITED (boolean trust) — forensically proven 7/12 hostile cases pass | No |
| 8 | Lineage (LineageWorker) | WITNESS_CREATED → LINEAGE_CREATED | none set; records causationChain from metadata; metadata inherits | INHERITED | No |
| 9 | Decision evaluation (JevShadowWorker, P3) | CLAIM_CREATED → JEV_DECISION_EVALUATED | RuleClaimDecisionProvider hardcodes probabilities: R0 0.1, R1 0.2, R2 0.4, R3 ACCEPT_CLAIM 0.85, R4 0.55 (typed_decision.js:145-157) | SELF-ASSERTED | No |

### What the table says
The canonical pipeline is honest about provenance at stages 1–5 and 8 (null or explicitly 'inherited'), genuinely derives at stage 6 (kernel replay), then **inherits at stage 7 without re-derivation** — the exact laundering point the witness forensics proved. No stage on the canonical path ever emits INDEPENDENTLY VERIFIED confidence; the strongest available is DERIVED (kernel recomputation of a transcript the witness cannot see).

## LAUNDERING POINTS

Each point where derived/inherited information becomes apparently stronger evidence without a new external observation.

### LP-1 — Autonomous loop 0.85 → consensus acceptance → durable worker reputation (GATED, code live)
- INPUT: `ExecutionEngine.startAutonomousLoop` (engine.js:601-653). No worker executes. The loop fabricates `output = { workerId, findings: [{file, line: 0, bypass_type: 'auto_scan', confidence: 0.85}], confidence: 0.85 }` (engine.js:645-646).
- WHAT ENTERED: nothing. No observation, no execution, no evidence.
- WHAT LEFT: `collectWorkerOutput` → `CapabilityRegistry.recordQuality(workerId, 0.85)` (qualityHistory, persisted, drives future dispatch selection at capability_registry.js:158-176) + `recordConfidence` (avgConfidence, persisted) + `worker_memory` confidence_history. Then `_resolveMission` → `ConsensusEngine.evaluate(mission, outputs)` (engine.js:302) → `accepted: confidence >= (mission.metadata?.confidenceThreshold || 0.7)` (consensus_engine.js:31) → 0.85 ≥ 0.7 → mission 'completed', findings merged as consensus-accepted.
- WHAT STRENGTHENED: nonexistent worker output → consensus-accepted findings → durable reputation scores → future dispatch priority.
- WHAT NEW EVIDENCE JUSTIFIED IT: none. Pure SELF-ASSERTED.
- DOWNSTREAM CONSUMERS: mission status, merged findings, worker dispatch selection, worker memory.
- STATUS: P0-gated — `startAutonomousLoop` refuses unless `PING_EXPERIMENTAL_AUTONOMOUS_LOOP=1` or `enableAutonomousLoop()` (engine.js:602-606; route gate at gateway/routes/orchestration.js:273-284). The gate is a runtime boolean, not removal. Any opt-in (including a test) runs the full laundering loop.

### LP-2 — POST /events forgery → full synthetic verification chain (LIVE, no auth observed)
- INPUT: `POST /events` with `{event_type: 'REPLAY_COMPLETED', aggregate_id, aggregate_type, event_data: {replay: {verified: true, ...}, ...}}`. Canonical-spine path calls `eventRuntime.emit(event_type, 'api', event_data, ...)` directly (gateway/routes/events.js:113-121). Governance validates event_type against the registry (REPLAY_COMPLETED is registered) and namespace — **payload content is not validated**. No auth middleware observed at route or mount layer (gateway_runtime.js:697).
- WHAT ENTERED: arbitrary JSON over HTTP.
- WHAT LEFT: canonical ping_events row → WitnessWorker (directly subscribed to REPLAY_COMPLETED, canonical_workers.js:735) attests on `verified === true` → WITNESS_CREATED → LineageWorker → LINEAGE_CREATED → ProjectionWorker (subscribed to LINEAGE_CREATED) → Qdrant point. Also: `/witness/stats` attestations count +1 (mission_control.js:568-587); bridge maps REPLAY_COMPLETED → WITNESS_CREATE mission as a second dispatch path.
- WHAT STRENGTHENED: arbitrary JSON → "witness attestation" → "verified knowledge" in Qdrant → witness statistics.
- WHAT NEW EVIDENCE JUSTIFIED IT: none. Zero kernel involvement. The strongest possible synthetic-confidence manufacturing: unbounded, pre-any-verification-boundary.
- DOWNSTREAM CONSUMERS: Qdrant knowledge vectors (queryable as verified), witness stats API, lineage chain, any consumer of LINEAGE_CREATED.
- STATUS: ACTIVE. Highest-severity laundering class (matches witness-forensics case 7 conclusion).

### LP-3 — Witness boolean inheritance (LIVE, forensically proven)
- Incorporated by reference: [WITNESS-forensic-7-cases.md](sandbox://workspace/jev/evidence/WITNESS-forensic-7-cases.md). The joint computation `verified ⟺ (status ok ∧ zero violations)` happens once inside ReplayWorker; the witness assumes it held. 7/12 hostile cases attested. INHERITED, not re-derived.

### LP-4 — P2 RuleClaimDecisionProvider hardcoded probabilities (LIVE, shadow-contained)
- INPUT: structurally valid claim → R3 returns `TypedDecision({decision: ACCEPT_CLAIM, probability: 0.85, rationale: 'R3: structurally valid claim with evidence reference'})` (typed_decision.js:155). The full ladder (0.1/0.2/0.4/0.85/0.55) is hardcoded per rule.
- WHAT ENTERED: a structural validity check (DERIVED, legitimate).
- WHAT LEFT: canonical JEV_DECISION_EVALUATED event carrying `probability: 0.85` — a number shaped exactly like a calibrated model output.
- WHAT STRENGTHENED: "structurally valid" → 0.85 probability. Same magic number as the P0 defect, reintroduced one layer down.
- WHAT NEW EVIDENCE JUSTIFIED IT: none. SELF-ASSERTED. (The NaN fail-closed fix in P2 validates the number's shape, not its meaning.)
- DOWNSTREAM CONSUMERS: none live — terminal event (no bridge mapping), MayExecutePolicy denies execution for all classes. But the events persist in ping_events; any future decision-authority consumer reading `.probability` inherits synthetic calibration. The rationale strings are honest, which is the only containment.
- STATUS: CONTAINED but LATENT. The next consumer of JEV_DECISION_EVALUATED is the laundering point.

### LP-5 — `createCanonicalObject` defaults confidence to 1.0 (LIVE)
- INPUT: `createCanonicalObject({kind, payload, authority, options})` with no `confidence` in options → `confidence = 1.0` (canonical_object.js:86).
- WHAT ENTERED: a payload and an authority identity — no evidence assessment.
- WHAT LEFT: a canonical object carrying confidence 1.0 — maximum certainty.
- WHAT STRENGTHENED: absence of assessment → certainty.
- WHAT NEW EVIDENCE JUSTIFIED IT: none. Worse than the 0.85s: the default is the ceiling.
- DOWNSTREAM CONSUMERS: 3 of 4 callers never pass confidence — gateway/canonical_object_authority.js, gateway/constitutional_object_factory.js, gateway/canonical_object_generator.js. An **authority** (CanonicalObjectAuthority, canonical_object_authority.js:60-72) mints max-confidence objects by default. (canonicalization_service.js passes confidence in at least some paths — 2 mentions near its call sites.)
- STATUS: ACTIVE. Absence of evidence → maximum confidence, minted by an authority.

### LP-6 — Inference adapter hardcodes confidence 0.8 on Analysis objects (observed in source; liveness unverified)
- INPUT: model response text → `InferenceAdapter` wraps it in a canonical Analysis object with `confidence: 0.8` at both object and payload level (inference_adapter.js:140, 156), regardless of what the model reported.
- WHAT STRENGTHENED: uncalibrated model output → 0.8 confidence on a canonical knowledge object.
- WHAT NEW EVIDENCE JUSTIFIED IT: none. SELF-ASSERTED.
- DOWNSTREAM CONSUMERS: knowledge-object consumers (Ask PING / knowledge queries). Liveness of the inference path not verified this session — recorded as candidate, not proven live.
- STATUS: CANDIDATE.

### LP-7 — IntelligenceWorker Ollama self-reported confidence tagged 'model' (DORMANT)
- The worker treats a model-returned numeric confidence as "legitimate model-derived recomputation" (intelligence_worker.js:113-118). LLM self-reported confidence is SELF-ASSERTED, not derived — models are not calibrated reporters of their own uncertainty.
- STATUS: DORMANT by doc-contract (canonical_workers.js:737-749, eventTypes: []). Re-enablement would activate this laundering path: model number → 'model' provenance → inherited downstream → graph nodes marked "assessed". Recorded so re-enablement cannot happen silently.

### LP-8 — Double confidence channel (structural fragility, honest provenance)
- Confidence travels two ways: payload-level copied fields (`classification.confidence`, `recommendation.confidence`) AND metadata-level via BaseWorker._emit inheritance. Both are honestly tagged, but a downstream reader must know which channel it reads: RecommendationWorker reads the payload channel; the kernel replay provider reads the metadata channel (`confidence_provenance`, kernel_replay_execution_provider.js:106); the graph projection reads the metadata channel (gateway_runtime.js:637, where non-null is implicitly "assessed"). Two channels carrying the same value today; a future stage that sets one and not the other creates silent divergence.

### Non-findings (checked, honest)
- Classification/Recommendation inheritance is explicitly tagged 'inherited' — provenance preserved, not laundering.
- Kernel replay provider propagates `confidence` + `confidence_provenance` into the replay envelope honestly ("only set when present; never fabricate absent values", kernel_replay_execution_provider.js:97-107). In the live pipeline the value is null, so the envelope honestly carries null.
- EventBridge `_skipGovernance: true` (event_bridge.js:184, 283) applies to internal table bridges ("already governed in source table") — a governance-trust claim worth its own forensic pass, but not the external forgery path (POST /events does run governance; it just doesn't validate payload content).
- `mission_execution_authority.js:321 coverage: 0.85` is a test-placeholder stub (`_runTests` returns passed:true unconditionally) — synthetic but clearly a stub, not wired to decisions. `ecosystem_intelligence.js:354 crdt_libraries: 0.85` is a static category-relevance weight for discovery scoring — a tuning constant, not evidence.

## HIGHEST-VALUE CONSTITUTIONAL DEFECT — LP-2 (POST /events → synthetic verification chain)

Why this one first: it is the only laundering point that is simultaneously (a) ACTIVE today, (b) reachable over HTTP with no authentication, (c) unbounded — any registered event type with any payload, and (d) terminates in durable, queryable, apparently-verified knowledge (Qdrant vectors + witness stats + lineage). LP-1 is gated, LP-3 is the same chain's second half (fixing LP-2 starves it of forged input), LP-5 is severe but bounded to object creation, LP-4 is contained. LP-2 is the synthetic-confidence ceiling in its purest form: infinite manufacturable confidence before any independently grounded boundary.

Smallest constitutional boundary (no new authority): the spine must not accept a verdict-shaped event it did not see produced. Concretely, at least one of: (a) authentication/authorization on the canonical-spine POST path; (b) per-event-type payload schema validation at the spine (a REPLAY_COMPLETED whose `replay` object lacks the kernel's authority signature never enters ping_events); (c) the witness authority-binding checks from the forensic record (provider === 'KernelReplayExecutionProvider', verdict-subject binding, violations empty, fingerprint non-null, transcript hash present) — which close the chain even if the spine stays open. Any one changes the ceiling; (a)+(c) together close both the entry and the attestation.

### FALSIFICATION CONDITION
After the fix, all of the following must hold, verified by re-running the existing adversarial suites plus one new probe:
1. Unauthenticated `POST /events` with a forged `REPLAY_COMPLETED{replay:{verified:true}}` is rejected (4xx) or, if accepted to the journal, produces NO `WITNESS_CREATED` and NO Qdrant projection — the forgery is journaled-but-inert or refused outright.
2. `gateway/test_witness_adversarial.js`: all 7 WEAK cases reject, all 5 STRONG keep behavior (no STRONG flips to attest — that is a regression).
3. Genuine pipeline still produces `WITNESS_CREATED` for genuine kernel-verified replays (no liveness regression).
4. `POST /events` with a well-formed non-verdict event (e.g. a social ingest envelope) still succeeds — the fix does not break legitimate ingestion.
If (1) fails while (3) passes, the defect stands. If the fix breaks (3), it is the wrong boundary.

## EVIDENCE PACKET
- Problem: synthetic-confidence ceiling — how much apparent confidence the pipeline manufactures pre-verification.
- Source evidence: file:line citations throughout (worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073).
- Live reachability: LP-2/LP-3/LP-5 code-reachable in source; deployment-proven status NOT established (Sep-16 image drift check still open — do not claim production reachability).
- Files touched: none (read-only investigation).
- Authority before/after: no change.
- Persistence effect: none (no writes).
- Replay effect: none.
- Security effect: LP-2 is a security-relevant finding (unauthenticated synthetic verification); reported, not exploited — no forged events were posted during this investigation.
- Rollback: n/a.
- Tests: existing suites referenced (test_witness_adversarial.js, test_jev_shadow.js); no new tests written (investigation only).
- Falsification condition: stated above for LP-2; LP-4's condition is "no consumer treats JEV_DECISION_EVALUATED.probability as calibrated without a calibration record"; LP-5's is "createCanonicalObject with no confidence option yields null/unassessed, and existing callers' behavior is re-verified".

## NEXT UNCERTAINTY
Dispatch-path ambiguity: WitnessWorker and ProjectionWorker are BOTH directly subscribed via WorkerRuntime (canonical_workers.js:726-736) AND reachable via the event→mission bridge (event_to_mission_bridge.js:63-66). The prior forensics called ProjectionWorker's LINEAGE_CREATED subscription "dead" via the bridge path — but the direct WorkerRuntime subscription may be the live one. Which dispatch path actually fires each worker in the running gateway determines whether the LP-2 forged chain runs through direct subscription, mission dispatch, or both — and which path a fix must close. Resolve by tracing WorkerRuntime.dispatch wiring in gateway_runtime.js against the bridge scheduler. After that: LP-6 liveness (is the inference adapter's 0.8 reachable?) and the Sep-16 deployment drift map.
