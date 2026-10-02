# AUTHORITY FORENSICS: PING Convergence Sprint

Date: 2026-09-16 (overnight sprint window 2026-09-16/17)
Investigator: read-only forensics subagent
Scope: /home/nolan/ping @ commit c5f7808b284df45ea0f44fe60cbc912c66f24e04, branch constitutional-convergence-v2
Method: static source forensics plus live read-only probes (GET /health, port checks). No writes, no patches, no commits. Nothing in the repo was modified.
Live state at probe time: gateway healthy, uptime ~7.8h, Postgres :5432 open, /events routes mounted in non-degraded mode (an auth denial on /events/stats proves the real routes are mounted, not the 503 degraded stubs). Authenticated endpoints were not probed; no credentials were extracted.

Proof ladder used throughout: existence -> importability -> reachability -> execution -> persistence -> evidence -> replay -> reproducibility -> certification. A class existing never counts as an authority existing.

Verdict tags: VERIFIED (source evidence confirms), PARTIAL (exists but incomplete or degraded on the live path), FALSIFIED (source evidence contradicts), BLOCKED (could not verify without crossing a read-only or auth boundary), UNKNOWN (no evidence found either way).

Note on style: this report contains no em dashes, per standing convention.

---

## TRACK A1: EVENT AUTHORITY RESOLUTION

Canonical answer: the event authority is UnifiedEventRuntime (ping-runtime/events/unified_event_runtime.js), persisting to the Postgres table ping_events. Everything else named like an event authority is an interface, an adapter, a legacy feeder, or dormant.

### The 9 questions

**1. Who creates an event?**

Five live creation doors, all converging on UnifiedEventRuntime.emit():

- Business emitters: ReviewEmitter, CustomerEmitter, ProjectEmitter, ConnectorEmitter, SystemEmitter in ping-runtime/business/business_emitters.js (e.g. line 14: `this._er.emit('REVIEW_RECEIVED', 'review-authority', review)`). They are constructed with the CanonicalizationService as their runtime (gateway/bootstrap/gateway_runtime.js:567-571), so their `emit` calls are duck-typed into CanonicalizationService.emit, which resolves the namespace and forwards to UnifiedEventRuntime.emit (ping-runtime/canonicalization/canonicalization_service.js:143).
- POST /events: gateway/routes/events.js:71-87 calls `eventRuntime.emit(event_type, 'api', event_data, ...)` directly, bypassing CanonicalizationService (see bypass B2 below).
- POST /ingest: gateway/bootstrap/gateway_runtime.js:689 mounts createIngestRoutes(services.canonicalizationService), the governed boundary door.
- CanonicalEventEnvelope.append: gateway/canonical_event_envelope.js:174-180 INSERTs into the legacy canonical_events table (deterministic UUID v5 id from tenant_id, event_type, timestamp, sequence). Written on the live path by the HPP business authorities (ReviewAuthority, CustomerAuthority, ProjectAuthority receive the envelope at gateway_runtime.js:408-424). These rows are then re-emitted into ping_events by the EventBridge.
- EventBridge: ping-runtime/events/event_bridge.js polls repository_events and canonical_events every 5s and re-emits each row through UnifiedEventRuntime.emit with `_skipGovernance: true` (lines 179-184, 278-283).
- Workers: BaseWorker._emit in ping-runtime/workers/canonical_workers.js forwards worker-produced events (OBSERVATION_CREATED, CLAIM_CREATED, etc.) to the event runtime, preserving the triggering event's namespace.

Verdict: VERIFIED. Single convergence point is UnifiedEventRuntime.emit; five doors, one choke.

**2. Who assigns event identity?**

UnifiedEventRuntime.emit() itself, at ping-runtime/events/unified_event_runtime.js:86-91. Identity material is `{ eventType, source }` plus optional `namespace` and either `logical_id` or the full `payload`. No separate identity service is consulted on the hot path.

Verdict: VERIFIED. Identity assignment is inline in emit, not delegated.

**3. Who hashes it?**

emit() hashes directly: `crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex')` (unified_event_runtime.js:91). Neither IdentityAuthority nor HashAuthority/CanonicalHashAuthority participates. CanonicalHashAuthority (gateway/replay/kernel/canonical_hash_authority.js, sourced from runtime/kernel/replay/canonical_hash_authority.ts) is live only inside the kernel replay engine, where it canonicalizes event streams and computes fingerprints during replay, never at emission.

Verdict: VERIFIED. This confirms prior audit finding (8): IdentityAuthority is declared but the hottest event path computes SHA-256 directly.

**4. Who sequences it?**

Nobody on the canonical path. The ping_events table has no sequence column (unified_event_runtime.js:46-60, CREATE TABLE lists event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at). Global ordering is by timestamp (set from ConstitutionalTimeAuthority.nowAsISOString at emit time, line 131) and created_at. Dedup is by content hash, not by sequence. The legacy canonical_events table did have `sequence BIGINT` with `UNIQUE (tenant_id, sequence)` (database/canonical_events.sql:13, 51), but that table is now a feeder, not the canonical store.

Verdict: VERIFIED (no sequencer exists; ordering is timestamp-based).

**5. Who persists it?**

emit() step 5, unified_event_runtime.js:141-162: `INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING`. Structural dedup is enforced by the primary key on the content-addressed event_id. A repo-wide grep for `INSERT INTO ping_events` shows this is the only production write path; every other hit is a test/eval mock. Persistence happens before handler dispatch (step 6) and integration routing (step 7), so a handler failure cannot un-persist an event.

Verdict: VERIFIED. This confirms prior audit finding (1).

**6. Who publishes / notifies consumers?**

In-process only, inside emit(): step 6 dispatches to handlers registered via `unifiedEventRuntime.on(eventType, handler)` (unified_event_runtime.js:165-176); step 7 routes to integrationManager.emit (lines 178-184). Live subscribers: EventToMissionBridge (subscribes to every type in EVENT_MISSION_MAP at event_to_mission_bridge.js:96-100) and the graph-projection loop in gateway_runtime.js:597. There is no outbox table and no transactional outbox; handler exceptions are caught and logged, not retried (see bypass B4).

Verdict: VERIFIED (in-process pub/sub post-persist; no durable outbox).

**7. Who reads it?**

- EventReadAuthority: ping-runtime/events/event_read_authority.js is a shim re-exporting runtime/kernel/event_read_authority.js; instantiated at gateway_runtime.js:381 and served by GET /events, /events/recent, /events/stats, /events/:stream, /events/unprocessed (gateway/routes/events.js). Each route falls back to direct pool queries on ping_events if the authority returns empty.
- UnifiedEventRuntime.query plus traversal methods: getChildren (:244), getDescendants (:265), getAncestors (:297), getCorrelationGroup (:328), backed by expression indexes on metadata->>'causation_id' and metadata->>'correlation_id' (created in initialize(), lines 62-63). Exposed over HTTP at /events/:eventId/children|descendants|ancestors and /events/correlation/:correlationId.
- EvidenceAuthority.accumulate reads ping_events by event_id (ping-runtime/evidence/evidence_authority.js:55-70).
- WorkerRuntime.dispatch delivers events to workers in-process (mission path).

Verdict: VERIFIED. This confirms prior audit finding (3): causation/correlation traversal exists, indexed, and HTTP-exposed.

**8. Who replays it?**

ReplayWorker (ping-runtime/workers/canonical_workers.js:226-330) handles REPLAY_VERIFY / PROJECTION_CREATED, builds a transcript via _buildReplayEvents, and executes it through the injected KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js), which converts PING events to kernel CanonicalEventEnvelope objects and runs DeterministicReplayEngine.replay() (gateway/replay/kernel/deterministic_replay_engine.js, compiled from the TS source). The engine canonicalizes the stream, computes a fingerprint, runs invariants, and generates a Merkle witness root via WitnessAuthority. The worker emits REPLAY_COMPLETED with causation_id set, verified=true only when kernel status is ok and violations are empty.

Limitation: _buildReplayEvents currently returns only the triggering event as a single-event replay; the production Postgres correlation-group query is present but commented out (canonical_workers.js, _buildReplayEvents: "In production, this would query Postgres... For now, return the triggering event"). The traversal machinery it would need (getCorrelationGroup) exists and is live.

Verdict: PARTIAL. The replay execution chain is real and wired, but it replays single events, not chains.

**9. Which event stores are actually reachable? Which are legacy / dormant / adapter abstractions?**

- ping_events: CANONICAL, live. Created by UnifiedEventRuntime.initialize(), written only by emit(), read by routes/authorities/workers. Postgres is up and the gateway mounted the non-degraded routes.
- canonical_events: LEGACY FEEDER, live-written. CanonicalEventEnvelope.append (gateway/canonical_event_envelope.js:174) is called by the HPP business authorities; EventBridge polls the table into ping_events. It is not a competing authority; it is an upstream feeder.
- repository_events: DORMANT FEEDER. Table is created at boot by kernel EventRepository.initialize() (runtime/kernel/event_repository.js:24, via GatewayToKernelAdapter.initialize() at gateway_runtime.js:387). EventBridge polls it live, but there are no live writers: the only writer, AppendOrchestrator._appendReplayEvent (gateway/append_orchestrator.js:89-94), is registered in authority_registry.js, which is not imported by the gateway bootstrap (only by the dormant gateway/execution_authority.js and gateway/constitutional_bootstrap.js). The bridge's repository_events leg is live but polls an empty table.
- events (database/events.sql, 2026-06-14, BIGSERIAL id, append-only triggers): LEGACY. All writers found are Python (witness_worker.py:66, mission_control_knowledge_apis.py:84, runtime/workers/github_worker.py:116, runtime/ingestion/drive_ingestor.py:160, runtime/adapters/google_drive/...:269); the Python worker plane is dormant (see finding 7).
- event_processing (root event_processing.sql): LEGACY tracking table.
- ping_bridge_cursors: live operational table for EventBridge cursors.

Verdict: VERIFIED as classified above.

### Key-name resolutions (event authority)

- AcquisitionManager: UNKNOWN. Zero hits across all code, docs, and configs at this commit. The name does not exist in the repository. Any prior audit referencing it as a component was referencing something that is not in the source.
- IEventAuthority (runtime/kernel/events/event-authority-interface.ts): INTERFACE, DORMANT. Zero importers and zero implementers repo-wide. Its constitutional event flow (ExecutionStarted ... GovernanceEvaluated) is not the flow the live system uses.
- ConstitutionalEventStore: UNKNOWN. Zero hits. Does not exist.
- EventRepository (runtime/kernel/event_repository.js): ADAPTER/LEGACY. Instantiated only inside GatewayToKernelAdapter, which is initialized but never invoked on the live path (zero method calls outside init/shutdown). Manages the dormant repository_events table.
- IdentityAuthority: INTERFACE/LEGACY. The TS interface (runtime/kernel/identity/identity-authority.ts) is unimplemented; the Python implementation (runtime/authorities/identity_authority.py) is used only by dormant Python workers; the JS kernel variants (runtime/kernel/authorities/*identity*) sit on the dormant kernel path. Declared, bypassed on the hot path.
- HashAuthority / CanonicalHashAuthority: CANONICAL within the replay kernel only (gateway/replay/kernel/canonical_hash_authority.js, used by DeterministicReplayEngine and WitnessAuthority). DORMANT with respect to event identity at emission.
- UnifiedEventRuntime: CANONICAL_AUTHORITY for emission, identity, hashing, persistence, dispatch, and traversal.
- ping_events: CANONICAL store.

---

## CLASSIFICATION TABLE: AUTHORITIES AND EVENT STORES

| Name | Location | Classification | Live? | Evidence |
|---|---|---|---|---|
| UnifiedEventRuntime | ping-runtime/events/unified_event_runtime.js | CANONICAL_AUTHORITY | Yes | Instantiated gateway_runtime.js:432; sole INSERT INTO ping_events (:148); emit owns identity/hash/persist/dispatch |
| ping_events | Postgres (created unified_event_runtime.js:46-60) | CANONICAL (store) | Yes | Only production writer is emit(); PG:5432 open; non-degraded routes mounted |
| CanonicalizationService | ping-runtime/canonicalization/canonicalization_service.js | CANONICAL_AUTHORITY (ingest boundary) | Yes | gateway_runtime.js:446; POST /ingest door (:689); namespace map + NAMESPACE_RE (:54-62) |
| EventGovernance | ping-runtime/events/event_governance.js | CANONICAL_AUTHORITY (policy) | Yes | Injected into emit (:434); validateEvent (:148) checks namespace ownership via NAMESPACE_OWNERS |
| EventValidator | ping-runtime/events/event_validator.js | CANONICAL_AUTHORITY (schema) | Yes | Injected into emit; validateEventType gates unknown types |
| ConstitutionalTimeAuthority | ping-runtime/authorities/constitutional_time_authority.js | CANONICAL_AUTHORITY (time) | Yes | emit timestamps via nowAsISOString (unified_event_runtime.js:131) |
| EventReadAuthority | ping-runtime/events/event_read_authority.js -> runtime/kernel/event_read_authority.js | ADAPTER (shim) over live impl | Yes | gateway_runtime.js:381; GET /events routes |
| EventBridge | ping-runtime/events/event_bridge.js | ADAPTER (feeder) | Yes (partially effective) | gateway_runtime.js:460-467; canonical_events leg live, repository_events leg polls empty table |
| canonical_events | Postgres (database/canonical_events.sql) | LEGACY (feeder store) | Write-live | CanonicalEventEnvelope.append (:174); HPP authorities write it; bridge re-emits to ping_events |
| CanonicalEventEnvelope | gateway/canonical_event_envelope.js | LEGACY (writer lib) | Yes | Injected into review/customer/project authorities (gateway_runtime.js:408-424) |
| repository_events | Postgres (created runtime/kernel/event_repository.js:24) | DORMANT (feeder store) | Table exists, no writers | Only writer AppendOrchestrator is dormant; bridge polls it live |
| EventRepository (kernel) | runtime/kernel/event_repository.js | ADAPTER/LEGACY | Instantiated, never invoked | Inside GatewayToKernelAdapter (gateway_runtime.js:386-387); zero live method calls |
| GatewayToKernelAdapter | runtime/kernel/gateway_adapter.js | ADAPTER/DORMANT | Initialized only | Zero method calls besides initialize/shutdown (grep) |
| Kernel execution pipeline | runtime/kernel/execution/* (dispatcher, reducer_registry, projection_registry, constitutional_execution_pipeline, replay_decision_authority, execution_artifact) | DORMANT | No | Reachable only through the dormant adapter; POST /events bypasses it by design (events.js comment) |
| IEventAuthority | runtime/kernel/events/event-authority-interface.ts | INTERFACE/DORMANT | No | Zero importers/implementers |
| IdentityAuthority (TS iface) | runtime/kernel/identity/identity-authority.ts | INTERFACE/DORMANT | No | Unimplemented; hot path hashes directly |
| IdentityAuthority (py) | runtime/authorities/identity_authority.py | LEGACY | No | Used only by dormant runtime/workers/*.py |
| HashAuthority / CanonicalHashAuthority | gateway/replay/kernel/canonical_hash_authority.js (+ TS source) | CANONICAL (replay-internal) | Yes, inside replay only | Used by DeterministicReplayEngine; never at emission |
| AcquisitionManager | (none) | UNKNOWN | No | Zero hits repo-wide |
| ConstitutionalEventStore | (none) | UNKNOWN | No | Zero hits repo-wide |
| events (legacy table) | database/events.sql | LEGACY | No | Writers are all dormant Python |
| event_processing | event_processing.sql | LEGACY | No | Tracking table for the old pipeline |
| kernel EventDispatcher | kernel/event_dispatcher.py | LEGACY | No | Python dataclass dispatcher, unreferenced by JS |
| ConstitutionalEventLoop | runtime/constitutional_event_loop.py | LEGACY | No | Python pipeline docstring; unreferenced by JS |
| worker_runtime.py / workers/*.py | workers/, Dockerfile.worker-runtime | LEGACY | No | Image definition exists; no live runtime; zero JS references |

---

## TRACK A2: WITNESS

**Canonical answer:** two live witness mechanisms, at different layers. (a) WitnessWorker, an event-pipeline worker with a failure-honesty gate, emitting WITNESS_CREATED / WITNESS_REJECTED into ping_events. (b) kernel WitnessAuthority, which builds a Merkle witness root inside every deterministic replay. The gateway-era witness_recorder / witness_generator / artifact_authority files are dormant.

**Who witnesses?** WitnessWorker.handle (ping-runtime/workers/canonical_workers.js:451-513), registered for WITNESS_CREATE and REPLAY_COMPLETED via registerCanonicalWorkers (line 725), which is called live at gateway_runtime.js:513. On REPLAY_COMPLETED it applies gate W7: if the replay did not verify, it refuses to attest and emits WITNESS_REJECTED with reason `unverified_replay:<reason>`; otherwise it emits WITNESS_CREATED with attestation `witness-<event_id slice>` and causation_id set (lines 470-510).

**Who builds the witness root?** WitnessAuthority.generateWitness (gateway/replay/kernel/witness_authority.js:30-48): canonicalize event stream -> fingerprint via CanonicalHashAuthority -> run invariants -> build lineage graph -> compute Merkle witness root (merkle_tree.js). Invoked by DeterministicReplayEngine.replay() on every replay execution (deterministic_replay_engine.js). This is the strong, cryptographic witness; the worker-level attestation is the pipeline-visible one.

**Who persists witnesses?** As events: WITNESS_CREATED rows in ping_events (via the normal emit path, content-addressed, deduped). There is no live dedicated witness table: the `witnesses` table is written only by the dormant AppendOrchestrator (gateway/append_orchestrator.js:105); memory_witnesses (gateway/memory_persistence_authority.js:200) is a separate memory subsystem table.

**Dormant:** gateway/witness_recorder.js (required only by dormant constitutional_runtime.js / authority_registry.js / harness), gateway/witness_generator.js, gateway/artifact_authority.js (required only by gateway/provenance_authority.js, not in bootstrap), runtime/kernel/replay/witness_authority.ts (TS source; the compiled JS copy under gateway/replay/kernel/ is the live one).

**Verdict:** VERIFIED that the live witness path is WitnessWorker + kernel WitnessAuthority. PARTIAL on witness durability: attestations exist only as events; no queryable witness-root table on the live path.

---

## TRACK A3: REPLAY

**Canonical answer:** ReplayWorker -> KernelReplayExecutionProvider -> DeterministicReplayEngine (JS, gateway/replay/kernel/), emitting REPLAY_COMPLETED. The engine, hash authority, witness authority, invariant runner, and state machine are real, importable, and executed on the live worker path (replayProvider injected at gateway_runtime.js:512-522).

**Who replays?** ReplayWorker.handle (canonical_workers.js:226-330). Triggered by REPLAY_VERIFY / PROJECTION_CREATED via the mission chain (EventToMissionBridge maps PROJECTION_CREATED -> REPLAY_VERIFY mission; MissionScheduler dispatches on the original event_type to the replay worker). Verified=true only when kernel status is 'ok' and violations are empty (lines 316-318).

**What is replayed?** Currently only the triggering event. _buildReplayEvents (canonical_workers.js) returns `[triggering event]`; the Postgres correlation-group query is written out but commented as future work. The machinery to do full-chain replay exists (getCorrelationGroup, getDescendants), but the worker does not call it yet.

**Reproducibility:** the engine is deterministic by construction (fresh ReplayStateMachine per replay, canonical JSON, deepFreeze on the result). Transcript -> envelope conversion is deterministic (SHA-256-derived evt- ids). Cross-run byte reproducibility was not executed in this read-only pass (would require invoking the provider; code path is live-wired, not stubbed).

**Dormant/legacy:** replay_worker.py (root, Python legacy), gateway/replay_verifier.js (required only by constitutional_fuzzer.js), runtime/kernel/replay/*.ts (TS sources; JS copies live). Historical evidence of execution: missions/VerifyReplay (mission.yaml status completed, results.json, proofs/) shows a replay verification mission completed on disk.

**Verdict:** PARTIAL. Execution path is live and wired, but replay scope is single-event, not chain; reproducibility is structurally supported but not demonstrated end-to-end in this pass (BLOCKED on execution, which would be a write-adjacent action).

---

## TRACK A4: LINEAGE

**Canonical answer:** lineage is carried in-band on every event (metadata.causation_id / correlation_id) and materialized by LineageWorker; traversal is served by UnifiedEventRuntime's indexed queries. There is no separate lineage store on the live path.

**Who records lineage?** Every emit() stamps causation_id (from options or null) and correlation_id (from options or the event's own id) into metadata (unified_event_runtime.js:132-140). EventToMissionBridge threads the root correlation_id through the whole chain (event_to_mission_bridge.js:104-121) so one observation's descendants share a correlation group. LineageWorker (canonical_workers.js:515-548) emits LINEAGE_CREATED with the causation chain; it is the terminal step of the pipeline chain (WITNESS_CREATED -> LINEAGE_CREATE mission -> LINEAGE_CREATED, after which the bridge stops).

**Who queries lineage?** getChildren / getDescendants / getAncestors / getCorrelationGroup (unified_event_runtime.js:244-341) with expression indexes on metadata causation/correlation (lines 62-63), exposed at /events/:eventId/children|descendants|ancestors and /events/correlation/:correlationId (gateway/routes/events.js:120-145).

**Dormant:** gateway/lineage_authority.js (shim with zero importers), runtime/kernel/authorities/lineage_authority.js (kernel-side, dormant path), lineage_worker.py (Python legacy).

**Verdict:** VERIFIED for record + traversal. PARTIAL on materialization: lineage exists as event metadata and derived LINEAGE_CREATED events, but there is no dedicated lineage-edge table; deep graph queries run against JSONB expression indexes.

---

## TRACK A5: ARTIFACT / EVIDENCE

**Canonical answer:** EvidenceAuthority (ping-runtime/evidence/evidence_authority.js, 180 lines) is the live evidence authority: accumulate -> verify -> rank, ADD-only (never mutates events).

**Who accumulates?** accumulate(sourceEventIds) resolves backing event rows from ping_events by event_id (lines 55-70).

**Who verifies?** verify(evidence) (lines 72+) recomputes the canonical hash via verifyCanonicalObject (gateway/canonical_object.js, injected at gateway_runtime.js:524-531), checks lineage presence and namespace consistency for canonical objects, and for Qdrant hits traces payload.source_event_id back to a real ping_events row. Stats track verified vs tampered counts.

**Who ranks?** rank(results) orders by confidence x provenance x approval state, down-ranking fallback embeddings and rejected nodes (per file header).

**Dormant:** gateway/artifact_authority.js (pure ArtifactContract, required only by dormant provenance_authority.js), runtime/artifact_pipeline.js (zero requirers), gateway/provenance_authority.js (not in bootstrap).

**Verdict:** VERIFIED. EvidenceAuthority is live, wired (gateway_runtime.js:524), and read-only by design.

---

## TRACK A6: MISSION

**Canonical answer:** EventToMissionBridge -> MissionRuntime (ping_missions) -> MissionScheduler -> WorkerRuntime.dispatch. All four live and wired in gateway_runtime.js:470-581, plus the /missions HTTP API (line 801).

**Who creates a mission?** EventToMissionBridge._handleEvent (event_to_mission_bridge.js:104-138) subscribes to all EVENT_MISSION_MAP types and creates one mission per event; mission_id is deterministic SHA-256(missionType:event_id) truncated to 16 hex, with ON CONFLICT DO NOTHING (mission_runtime.js:62-84), so retries are idempotent. The chain in the map runs the full pipeline: ... PROJECTION_CREATED -> REPLAY_VERIFY -> REPLAY_COMPLETED -> WITNESS_CREATE -> WITNESS_CREATED -> LINEAGE_CREATE -> LINEAGE_CREATED (terminal). POST /missions (gateway/routes/missions.js:25) also creates missions via the API.

**Who schedules?** MissionScheduler (mission_scheduler.js:82) polls ping_missions every 5s: Arrow 0 renews leases for in-progress missions, Arrow 1 reaps expired leases back to created, Arrow 2 dispatches pending missions up to maxConcurrent=3. MISSION_WORKER_MAP is labeling/assignment metadata only (mission_scheduler.js:27-43 doc-contract); the actual routing decider is WorkerRuntime.dispatch matching on eventTypes.

**Who executes the mission record?** MissionRuntime (mission_runtime.js:12): create/assign/start/complete/fail, lease renewal, reaping, retry_at backoff. DeadLetterAuthority (gateway/dead_letter_authority.js, wired gateway_runtime.js:540-549) receives exhausted retries into repository_dead_letters.

**Who dispatches to workers?** MissionScheduler._dispatch builds the worker event from the ORIGINAL business event_type (payload.event_type, not mission_type; lines 216-250) to avoid phantom completion, then calls workerRuntime.dispatch(event). Three outcomes: worker returned failed -> fail mission; no worker matched (null) -> fail as no-match (phantom-complete prevention); ok -> complete.

**Verdict:** VERIFIED on all four components and the wiring. This confirms prior audit finding (4) for the mission half.

---

## TRACK A7: EXECUTION / WORKER

**Canonical answer:** WorkerRuntime (ping-runtime/workers/worker_runtime.js) in dispatch-only mode; 8 canonical workers registered live; IntelligenceWorker structurally dormant; MissionScheduler is the single dispatch path.

**Who executes?** WorkerRuntime.dispatch(event) (worker_runtime.js:77-113): matches entry.eventTypes against event.event_type, respects maxConcurrent, sets worker._event for namespace inheritance, calls worker.handle(event), propagates throws to the scheduler for retry/fail. The _poll() loop exists but is never started (start() only sets _running=true; the header documents dispatch-only mode to prevent dual input paths).

**The 8 canonical workers** (ping-runtime/workers/canonical_workers.js, registered by registerCanonicalWorkers at gateway_runtime.js:513-522): observation (BUSINESS_EVENTS), claim (OBSERVATION_CREATED, CLAIM_GENERATE), classification (CLAIM_CREATED, CLASSIFICATION_CREATE), recommendation (CLASSIFICATION_CREATED, RECOMMENDATION_CREATE), projection (KNOWLEDGE_INDEX, PROJECTION_CREATE, RECOMMENDATION_CREATED, LINEAGE_CREATED), replay (REPLAY_VERIFY, PROJECTION_CREATED, with kernel replayProvider), witness (WITNESS_CREATE, REPLAY_COMPLETED), lineage (LINEAGE_CREATE, WITNESS_CREATED). Plus knowledge-promotion registered when a KnowledgeGraph is provided (it is).

**IntelligenceWorker:** DORMANT, structurally. intelligence_worker.js:8 header states dormant with empty eventTypes; canonical_workers.js:728 registers it with eventTypes: [] and the registration loop skips empty lists (verified at :730-746), so it processes zero events. The doc-contract comment explicitly forbids re-enabling without resolving duplication with the classification+recommendation pair. This confirms prior audit finding (5).

**Legacy:** workers/*.py + Dockerfile.worker-runtime (python:3-alpine image). Zero JS references from the gateway bootstrap. This confirms prior audit finding (7): the image definition exists but is not a live runtime.

**Verdict:** VERIFIED. This confirms prior audit finding (4) for the execution half.

---

## TRACK A8: CAPABILITY

**Canonical answer:** CapabilityResolver (ping-runtime/runtime/capability_resolver.js) is the live capability authority, loaded at boot (gateway_runtime.js:179-180) from gateway/generated/capability_registry.json. capabilities/registry.yaml is the build-time source that capability_generator.js compiles into that JSON (gateway/generated/capability_generator.js:2-4, 27). The YAML is never read at runtime.

**What it enforces:** load() validates required fields (schema_version, generator, count, capabilities), rejects duplicates, indexes by name and by authority, computes a registry hash. resolve(name) verifies provider presence, required_secrets shape, and runtime dependencies.

**Verdict:** VERIFIED for the resolver + generated JSON as the runtime authority. capabilities/registry.yaml classified LEGACY/BUILD-TIME (source artifact, not a runtime authority).

---

## TRACK A9: KNOWLEDGE

**Canonical answer:** KnowledgeGraph (ping-runtime/knowledge/knowledge_graph.js) is the live Postgres-backed knowledge store (knowledge_nodes table); KnowledgePromoter (ping-runtime/knowledge/knowledge_promoter.js) is the live promotion worker with a human-approval gate.

**Who writes knowledge?** The graph-projection subscriber loop in gateway_runtime.js:590-620 projects business and observation events into knowledge_nodes with status='candidate', confidence 0.5. Only explicit human approval promotes to approved (confidence 1.0) via KnowledgePromoter on SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED; rejection down-ranks to 0.2 (knowledge_graph.js header doc-contract).

**Who reads?** HybridSearch (ping-runtime/search/hybrid_search.js, wired gateway_runtime.js:533-538) composes Qdrant semantic hits + EvidenceAuthority verification + knowledge graph context.

**Dormant:** gateway/knowledge_graph.js (KnowledgeGraphRuntime, zero importers in bootstrap). This confirms prior audit finding (6) in spirit: no separate business_graph subsystem exists (zero code hits), and the one gateway-side graph runtime is dormant; the live graph is the ping-runtime KnowledgeGraph.

**Verdict:** VERIFIED for KnowledgeGraph + KnowledgePromoter as the live knowledge authority.

---

## BYPASS PATHS FOUND

B1. Pool-null silent persist skip. UnifiedEventRuntime.emit() guards persistence with `if (this._pool)` (unified_event_runtime.js:141) and still returns `{status:'ok'}` when the pool is null. An event can therefore be "emitted" (identity assigned, handlers run) without ever reaching ping_events. LATENT, not live-reachable: the runtime is constructed only inside `if (pgAvailable)` (gateway/bootstrap/gateway_runtime.js:378) and /events + /ingest return 503 in degraded mode. The fail-closed fix is one guard clause.

B2. POST /events skips the CanonicalizationService. gateway/routes/events.js:71-87 calls `eventRuntime.emit(event_type, 'api', event_data, ...)` directly with no namespace option, so the namespace falls back to the emit-owned default 'core::system' without per-source authorization. POST /ingest (the governed door, gateway_runtime.js:689) does go through CanonicalizationService. Two ingestion doors, one governed: an external caller with API auth can land events in core::system while business producers are mapped to tenant::hpp. EventGovernance still validates the namespace shape/ownership at emit time, so this is an authorization-boundary bypass, not a persistence bypass.

B3. EventBridge governance skip. Bridged rows are re-emitted with `_skipGovernance: true` (ping-runtime/events/event_bridge.js:184, 283) on the rationale "already governed in source table". CanonicalEventEnvelope validates envelope schema at write time but does not enforce namespace ownership, so the choke point is bypassed for every canonical_events row by design. The bridge does preserve identity semantics (new content-addressed IDs, causation/correlation threaded, `bridged_from` in metadata).

B4. In-process subscriber failures are swallowed. emit() step 6 wraps each handler in try/catch and logs (unified_event_runtime.js:169-175). If EventToMissionBridge._handleEvent throws outside its own try/catch, or the graph-projection subscriber throws, the event is already persisted but the downstream mission/projection silently never happens. The mission path itself has retry + DLQ; direct .on() subscribers have no redelivery. A failed subscriber leaves a persisted event with no downstream effect and no retry record.

B5. Direct SQL bypasses everything. Nothing at the database layer constrains ping_events writes: no triggers, no row-level security, no CHECK on event_id format. Any holder of PG credentials can INSERT rows that never passed validation, governance, or identity rules. The only production writer is emit() (verified by repo-wide grep), so this is a defense-in-depth gap, not an active bypass.

B6. Dormant kernel pipeline is initialized but dead. GatewayToKernelAdapter is constructed and initialized at boot (gateway_runtime.js:386-387) then never invoked (zero method calls). It is not a bypass (nothing flows through it), but it is a live-initialized dead branch consuming boot time and implying a pipeline that does not run. POST /events deliberately bypasses it (gateway/routes/events.js comment: kernel reducer/projection registries are empty).

---

## SMALLEST MISSING EDGE PER AUTHORITY (future implementation, not patches)

- Event: make emit() fail closed when pool is null (return error, not ok); route POST /events through CanonicalizationService so both ingestion doors share the namespace authorization boundary.
- Witness: persist WITNESS_CREATED attestations (including the kernel Merkle witness_root) to a queryable table; today they exist only as ping_events rows.
- Replay: wire _buildReplayEvents to the existing getCorrelationGroup query (the SQL is written and commented out) so replay covers chains, not single events.
- Lineage: materialize lineage edges into a table for graph queries; JSONB expression indexes work but a dedicated edge table would make deep traversals cheaper.
- Evidence: none critical; ADD-only design is correct as is.
- Mission: thread correlation_id on API-created missions (gateway/routes/missions.js) the way EventToMissionBridge does, so API missions join the causal trace.
- Execution: remove or gate the dead WorkerRuntime._poll() method so the dispatch-only invariant is structural, not conventional.
- Capability: none; resolver + generated registry is coherent.
- Knowledge: none structural; the human-approval gate is the design.

---

## PRIOR SEP-17 AUDIT FINDINGS: VERDICT TABLE

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | UnifiedEventRuntime writes to Postgres ping_events with SHA-256 content-addressed IDs and structural dedup via ON CONFLICT DO NOTHING | VERIFIED | ping-runtime/events/unified_event_runtime.js:86-91 (identity+hash), :147-152 (INSERT ... ON CONFLICT DO NOTHING) |
| 2 | Namespace enforcement at event-emission choke point | VERIFIED | ping-runtime/canonicalization/canonicalization_service.js:54-62 (resolveNamespace + NAMESPACE_RE); unified_event_runtime.js:108-119 (governance check); event_governance.js:148-194 (ownership validation) |
| 3 | Causation/correlation traversal exists | VERIFIED | unified_event_runtime.js:244-341 (4 traversal methods + expression indexes :62-63); HTTP routes gateway/routes/events.js:120-145 |
| 4 | EventToMissionBridge, MissionRuntime, MissionScheduler, WorkerRuntime exist with 8 canonical JS workers | VERIFIED | ping-runtime/orchestration/event_to_mission_bridge.js:72; mission_runtime.js:12; mission_scheduler.js:82; workers/worker_runtime.js:14; workers/canonical_workers.js (8 classes); all wired gateway_runtime.js:432-581 |
| 5 | IntelligenceWorker registered dormant with no event types | VERIFIED | intelligence_worker.js:8 header; canonical_workers.js:728 (eventTypes: []); registration loop skips empty (:730-746) |
| 6 | No separate business_graph subsystem | VERIFIED | Zero code hits for business_graph repo-wide; gateway/knowledge_graph.js dormant; live graph is ping-runtime KnowledgeGraph |
| 7 | Legacy Python worker image exists but is not a live runtime | VERIFIED | Dockerfile.worker-runtime + workers/*.py exist; zero JS references from gateway bootstrap; kernel/event_dispatcher.py unreferenced |
| 8 | IdentityAuthority declared but hottest event path computes SHA-256 directly | VERIFIED | identity-authority.ts unimplemented interface (zero importers); emit() uses crypto.createHash directly (:91) |

Additional falsification from this pass: the key names AcquisitionManager and ConstitutionalEventStore, listed as resolution targets, do not exist anywhere in the repository (code or docs) at this commit. UNKNOWN, leaning nonexistent.

---

## CANONICAL AUTHORITY MAP (compact, for the morning report)

- Event: UnifiedEventRuntime (ping-runtime/events/unified_event_runtime.js) is the sole emission/persistence/dispatch authority; store is Postgres ping_events; identity is inline SHA-256 of {type, source, namespace?, logical_id|payload}; dedup is ON CONFLICT DO NOTHING on the content-addressed id. Ingest boundary is CanonicalizationService + EventGovernance (POST /ingest door); POST /events door bypasses the service (known gap B2).
- Feeders (not authorities): canonical_events (legacy table, live-written by HPP authorities, bridged into ping_events); repository_events (dormant table, bridge polls it empty); legacy events table (Python writers only, dormant).
- Mission: EventToMissionBridge -> MissionRuntime (ping_missions, deterministic ids, ON CONFLICT DO NOTHING) -> MissionScheduler (5s poll, lease renew/reap, maxConcurrent 3, DLQ on exhaustion) -> WorkerRuntime.dispatch. /missions API also creates missions.
- Execution: WorkerRuntime dispatch-only; 8 canonical workers live (observation, claim, classification, recommendation, projection, replay, witness, lineage) + knowledge-promotion; IntelligenceWorker structurally dormant (empty eventTypes, skipped by registration).
- Replay: ReplayWorker -> KernelReplayExecutionProvider -> DeterministicReplayEngine (gateway/replay/kernel/, Merkle witness root via WitnessAuthority, invariants, deepFreeze). Currently replays single events only (chain query commented out).
- Witness: WitnessWorker (failure-honesty gate: refuses unverified replays, emits WITNESS_REJECTED) + kernel WitnessAuthority (Merkle root inside replay). Attestations live on as ping_events rows; no dedicated witness table.
- Lineage: in-band causation_id/correlation_id on every event; LineageWorker terminal step; indexed traversal (children/descendants/ancestors/correlation group) over HTTP.
- Evidence: EvidenceAuthority (accumulate/verify/rank, ADD-only reads, hash recompute via gateway/canonical_object.js).
- Knowledge: KnowledgeGraph (PG knowledge_nodes, candidate status) + KnowledgePromoter (human approval gate to 1.0).
- Capability: CapabilityResolver <- gateway/generated/capability_registry.json <- capabilities/registry.yaml (build-time source only).
- Dormant but initialized: GatewayToKernelAdapter + kernel execution pipeline (never invoked); IEventAuthority (unimplemented interface); Python worker plane; gateway witness/artifact/provenance shims.
- Nonexistent: AcquisitionManager, ConstitutionalEventStore (no source artifacts at this commit).

## CAVEATS AND BLOCKED ITEMS

- Authenticated HTTP endpoints (/events/stats etc.) returned MISSING_AUTH without credentials; per credential rules no Bearer token was extracted, so row counts in ping_events and end-to-end replay execution were not exercised live. Static wiring plus a healthy 7.8h-uptime gateway with non-degraded routes mounted is the evidence for liveness. Verdict on "events actually flowing end to end in production": PARTIAL (code paths live and wired; volume not observed).
- Replay reproducibility across runs: BLOCKED on execution (invoking the provider would be a write-adjacent action outside read-only scope). The engine is deterministic by construction (fresh state machine, canonical JSON, deepFreeze).
- Worktree /home/nolan/ping/worktrees/agent-smoke-abc123def456 was not entered or modified, per the hard boundary. Grep hits inside it were excluded from all classifications.
- Nothing in /home/nolan/ping was written, staged, or committed during this investigation. git status before and after shows only the two pre-existing untracked worktree directories.
- BRANCH TIP MOVED DURING INVESTIGATION: at session start (19:50 MDT) the branch constitutional-convergence-v2 was at c5f7808b2; at 19:55 MDT another actor ("Trish Nikitha") committed 099927152 "docs(report): history rewrite complete" on top of it (reflog shows a fast-import + reset cycle). The new commit adds exactly one file, a markdown history-rewrite completion report (125 insertions), and touches zero code: `git diff --name-only c5f7808b2 099927152` excluding .md files is empty. Every source file cited in this report was verified byte-identical between the two commits, so all findings stand against both. The move was observed, not caused, by this investigator.
