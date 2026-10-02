# PING OPERATING SPEC — convergence working copy

Working copy maintained by the convergence coordinator during the read-only forensic pass. Only evidence-backed conclusions are recorded here. Hypotheses never become architecture.

Rule: one authority per decision.

## Gate chain (Runtime Distribution v1)

Authority -> Reachability -> Persistence -> Dependency Closure -> Allowlist -> Exclusion -> ARM64 image -> Oracle

## Authority records

Compact record per authority: AUTHORITY / DECISION OWNED / CANONICAL IMPLEMENTATION / ENTRYPOINT / PERSISTENCE / IDENTITY / HASH / SEQUENCE / READERS / REPLAY / BYPASSES / REACHABLE BYPASSES / STATUS / EVIDENCE / DISTRIBUTION BLOCKER

Statuses: PROVEN | FALSIFIED | PARTIAL | DORMANT | UNREACHABLE | UNKNOWN

### EVENT AUTHORITY

STATUS: RESOLVED — **EVENT AUTHORITY RESOLVED**. All nine exit questions answered (see verdict). No stop condition triggered: two live writers exist (ping_events, canonical_events) but repository evidence establishes precedence and distinct decision ownership, so they are not two simultaneously reachable canonical authorities for the SAME decision.

- AUTHORITY: Canonical event acceptance authority
- DECISION OWNED: what canonical event PING accepts as having happened (acceptance, identity assignment, durable persistence)
- CANONICAL IMPLEMENTATION: UnifiedEventRuntime — ping-runtime/events/unified_event_runtime.js (349 lines, class UnifiedEventRuntime)
- ENTRYPOINT: POST /events (gateway/routes/events.js) -> eventRuntime.emit(event_type, 'api', event_data); internal emitters (business_emitters.js, canonical_workers.js); MissionRuntime receives eventRuntime for mission triggers
- ADMISSION: verdict-class admission authority _assertVerdictAuthority (unified_event_runtime.js:160/226, worktree 2026-09-30) — 5 verdict types bound to canonical producer workers, unskippable even by bridges; not deployed.
- PERSISTENCE: ping_events table in Postgres. Pool injected via constructor. initialize() runs CREATE TABLE IF NOT EXISTS ping_events (event_id PK, event_type, source, timestamp, payload JSONB, metadata JSONB, namespace, processed, created_at) plus indexes. emit() does INSERT ... ON CONFLICT (event_id) DO NOTHING (idempotent dedup; rowCount>0 counted as persisted, else deduplicated). Exactly one INSERT INTO ping_events site in non-test production code (unified_event_runtime.js:289), PROVEN by repo-wide grep (2026-09-30). tenant_id partition column added (unified_event_runtime.js:139, worktree; not deployed).
- IDENTITY: event_id minted solely by IdentityAuthority.generateSpineEventId (runtime/kernel/authorities/identity_authority.js:294); sole production caller unified_event_runtime.js:200 (AUTH-CONV-06, worktree lane-b/tenant-dispatch-threading @ 546b62d76, 2026-09-30). Golden-vector test uer-spine-identity.test.js locks byte identity; one minting function = fixed key order, closing the old key-order caveat. Deployed container (cc6856c-era) still mints inline with the same byte scheme. (Replaces the 88c9651be-era "no separate IdentityAuthority" line.)
- HASH: SHA-256 identity mint (see IDENTITY). No HashAuthority class exists anywhere in code (grep: only brainos/orchestration/docs/architecture/HASH_AUTHORITY.md). Collision check owned by CanonicalBytes.serializeString (canonical_authority.js:46, shim delegating to KernelCanonicalBytes), replacing the ad-hoc inline canon (2026-09-30, worktree; not deployed).
- SEQUENCE: absent as explicit column. Ordering is database-derived: reads use ORDER BY timestamp DESC / created_at ASC. No sequence assignment before/during append
- READERS: EventReadAuthority (ping-runtime/events/event_read_authority.js, wired gateway_runtime.js:381), EventToMissionBridge (.on subscriptions), direct pool queries in routes/events.js (read-only fallback), getChildren/getDescendants/getAncestors/getCorrelationGroup causal traversal queries
- REPLAY: see REPLAY AUTHORITY record (REPLAY PARTIAL: live path exists but does not read back the canonical journal and re-mints identities)
- BYPASSES: (1) canonical_events via CanonicalEventEnvelope.executeEmitEvent (gateway/canonical_event_envelope.js:174, INSERT ... ON CONFLICT (tenant_id, sequence) DO NOTHING, per-tenant sequence; instantiated gateway_runtime.js:399-400; live callers: review/project/customer/ai_workspace authorities, routes/canonical_events.js:29, google/business_profile.js:148,223) — Lane C PROVEN second live writer; (2) repository_events via EventRepository.appendEvent (runtime/kernel/event_repository.js:117; live callers: capability_scheduler x4, constitutional_execution_pipeline, agent_memory_authority x5, distributed_desktop_agents x5) — Lane C PROVEN; (3) bare legacy `events` table: ~30 writers (gateway/event_write_authority.js self-titled "Event Write Authority" with ZERO instantiations anywhere, witness_chain.js, replay_log.js, event_bus.js, eventstore_persistence.js, stage_registry.js, lifecycle_visualizer.js, constitutional_runtime.js:283, plus Python workers and brainos ingestion adapters) — ALL dormant/unreferenced, none trace to live gateway_runtime wiring; (4) event_outbox (gateway/event_outbox.js:132), mission_events (gateway/mission_event_bus.js:109) — dormant; (5) raw SQL in routes/events.js is read-only fallback SELECTs only
- REACHABLE BYPASSES: EventBridge (ping-runtime/events/event_bridge.js, gateway_runtime.js:460) polls repository_events + canonical_events and re-emits through UnifiedEventRuntime.emit() into ping_events. Its docstring declares "Single source of truth: UnifiedEventRuntime". Reachable bypasses are legacy-ingress ADAPTERS, not competing canonical authorities: gateway/routes/events.js comment states "Canonical spine: emit directly through UnifiedEventRuntime (ping_events), not through the kernel pipeline (repository_events)". CanonicalEventEnvelope owns a DISTINCT decision (tenant-scoped representation identity/sequence in canonical_events), not the acceptance decision; the identity-reminting across the bridge is a known non-blocking convergence defect
- EVIDENCE: gateway_runtime.js:70 (require), :432 (new UnifiedEventRuntime), :438 (initialize), :460 (EventBridge comment), :475 (MissionRuntime wiring), :512 (replay provider), :552 (scheduler), :681 (/events route wiring), :685 (/canonical-events mount); routes/events.js POST / comment + emit call; unified_event_runtime.js emit() steps 1-7; event_bridge.js header + _bridgeCanonicalEvents; lane reports A (acquisition phantom), C (writers), D (replay)
- DISTRIBUTION BLOCKER: none. RESOLVED 2026-09-30: Oracle ping-gateway container (ping-gateway:candidate-3c5d280dd) runs byte-identical cc6856c event files (sha256 of gateway/routes/events.js, unified_event_runtime.js, canonicalization_service.js match git show cc6856c: exactly). Deployed POST /events = BFF-adapter-normalized or direct -> eventRuntime.emit; no tenant check, no authorizeNamespace. The 2026-09-16/17 capture's "authorizeNamespace on POST /events" matches no surviving source — it likely described /ingest.
- DIVERGENCE (recorded, non-blocking, 2026-09-30): worktree Lane L (007fcf44) vs ping-gateway-src/build (ad9b9c92, stale vs both) vs deployed cc6856c (4e3c66b6). HEAD moved cc6856c -> 546b62d76 on lane-b/tenant-dispatch-threading (descendant, not rewrite); refactor/runtime-authority-convergence consumed. Lane L tenant isolation, AUTH-CONV-06, verdict-class admission, P1 tenant-spoof binder fix NOT deployed.

Candidate classifications (repository evidence):
- IEventAuthority (runtime/kernel/events/event-authority-interface.ts): DORMANT. In-memory pub/sub interface (subscribe/unsubscribe/publish/getHistory/clearHistory). Zero `implements IEventAuthority` in the main tree; only the interface file references the name
- ConstitutionalEventStore: FALSIFIED as an implementation. Zero hits for `class ConstitutionalEventStore` at HEAD 88c9651be; Lane B total-repo sweep including git history came back empty
- AcquisitionManager: FALSIFIED. Zero hits (any case) at HEAD 88c9651be; `git log -S` shows only two docs commits (e01ffc57c: "Names exist only in side-branch docs; no code", 18b80397b: sprint task listing). Lane A PROVEN: the sole `collectEvidence` in the tree is an uncalled pure in-memory aggregator on Dispatcher (ping-runtime/orchestration/dispatcher.js:157-170), zero call sites; `batchCollectEvidence` never existed in any commit. Acquisition flows into the canonical path through connectors/business emitters calling eventRuntime.emit
- EventRepository: LEGACY (derived audit/projection adapter), not a competing authority — Lane B PROVEN. It never generates identity, hash, or sequence (event_id, CanonicalEventHash, sequence all caller-supplied at appendEvent lines ~101-112); its only derived value is chain_root from the caller's own hashes. Multi-writer observed: appendEvent called from runtime/kernel/authorities/capability_scheduler.js:559,587,616,645, gateway/constitutional_execution_pipeline.js:34, gateway/automatic_mission_generator.js:595,624,653, gateway/continuous_replay_authority.js:588 — each supplies its own per-object_id sequence with no DB unique constraint on (object_id, sequence) (contention surface, INFERRED). Gateway copy is a pure delegation shim. Not DUPLICATE/CONFLICTING: no overlapping decision ownership over canonical truth
- PostgresEventStore (runtime/adapters/postgres_event_store.ts:37): DORMANT — Lane B PROVEN. Its doc header self-declares "Authority: YES / Creates Truth: YES" but zero runtime instantiation exists (only imported by RepositoryAuthority, which is never constructed). Writes `events` table with BIGSERIAL id + content-hash idempotency, a different table from the canonical path. No live writers or readers. Exclusion class: PRESERVE_NOT_DISTRIBUTE, not in distribution allowlist
- CanonicalEventEnvelope: LEGACY_INGRESS (representation authority) — Lane C PROVEN second live writer. Owns a distinct decision: tenant-scoped business event representation identity/sequence (tenant_id, sequence) in canonical_events (database/canonical_events.sql:4). Instantiated gateway_runtime.js:399-400; mounted at /canonical-events (:685); live callers in review/project/customer/ai_workspace authorities. Bridged into ping_events by EventBridge. Reachable in the distribution slice; carried as legacy-ingress, not canonical acceptance

### MISSION AUTHORITY

STATUS: RESOLVED (PROVEN)

- AUTHORITY: Mission creation and execution-routing authority
- DECISION OWNED: which mission a canonical event triggers; mission identity; worker assignment; mission lifecycle state
- CANONICAL IMPLEMENTATION: EventToMissionBridge (ping-runtime/events/../orchestration/event_to_mission_bridge.js) + MissionRuntime (ping-runtime/orchestration/mission_runtime.js) + MissionScheduler (ping-runtime/orchestration/mission_scheduler.js)
- ENTRYPOINT: bridge.start() subscribes to UnifiedEventRuntime .on() for ~20 mapped event types (EVENT_MISSION_MAP: OBSERVATION_CREATED->CLAIM_GENERATE, CLAIM_CREATED->CLASSIFICATION_CREATE, CLASSIFICATION_CREATED->RECOMMENDATION_CREATE, RECOMMENDATION_CREATED->PROJECTION_CREATE, PROJECTION_CREATED->REPLAY_VERIFY, REPLAY_COMPLETED->WITNESS_CREATE, WITNESS_CREATED->LINEAGE_CREATE terminal; plus customer/lead/project/estimate/invoice/review/email/SMS/system events)
- PERSISTENCE: ping_missions table (CREATE TABLE IF NOT EXISTS in MissionRuntime.initialize, mission_runtime.js:30). mission_id deterministic: hash(missionType:event_id) (comment line 63-66), INSERT ... ON CONFLICT (mission_id) DO NOTHING (line 79-81)
- IDENTITY: deterministic hash of (missionType, event_id); one mission per triggering event
- SEQUENCE: lifecycle states created -> assigned -> running -> completed/failed; scheduler claim uses atomic UPDATE ... WHERE status='created' with 60s lease (line 108), lease expiry enables re-dispatch after worker crash
- READERS: MissionScheduler polls pending missions; WorkerRuntime dispatches
- REPLAY: missions are derived from events (event_id threaded through); replay of missions = replay of the event journal
- BYPASSES: none observed; automatic_mission_generator.js referenced by Lane B calls EventRepository.appendEvent (legacy path, not the ping_missions path) — classification LEGACY_INGRESS, not a mission-authority competitor
- REACHABLE BYPASSES: none
- EVIDENCE: gateway_runtime.js:475 (MissionRuntime construction), :552 (scheduler construction), :560 (scheduler.start); event_to_mission_bridge.js:75-130 (bridge construction/start/_handleEvent); mission_runtime.js:68-81 (create), :100-108 (claim lease); mission_scheduler.js:143-220 (poll cycle, MISSION_WORKER_MAP dispatch, worker selection guard)
- DISTRIBUTION BLOCKER: none

### WORKER EXECUTION AUTHORITY

STATUS: RESOLVED (PROVEN)

- AUTHORITY: Worker execution and downstream emission authority
- DECISION OWNED: which worker handles an event type; concurrency; failure propagation; downstream event emission through the canonical path
- CANONICAL IMPLEMENTATION: WorkerRuntime (ping-runtime/workers/worker_runtime.js, 169 lines) + BaseWorker/canonical workers (ping-runtime/workers/canonical_workers.js, 760 lines) + IntelligenceWorker (ping-runtime/workers/intelligence_worker.js)
- ENTRYPOINT: MissionScheduler._dispatch builds the event and calls WorkerRuntime.dispatch(event); dispatch matches registered workers by eventTypes (empty eventTypes = dormant, never catch-all)
- PERSISTENCE: workers do not own persistence; results flow back through UnifiedEventRuntime.emit into ping_events
- IDENTITY/HASH/SEQUENCE: inherited from event path; BaseWorker._emit preserves namespace, correlation_id, causation_id (= triggering event_id), and confidence semantics (explicit null distinguished from missing via hasOwnProperty; inherited confidence tagged confidence_source='inherited')
- READERS: getStats() per-worker status
- REPLAY: worker outputs are canonical events; replay of the journal re-derives the chain
- BYPASSES: none — every downstream worker emission goes through this._eventRuntime.emit(); a worker without eventRuntime throws
- REACHABLE BYPASSES: none
- EVIDENCE: worker_runtime.js:69-103 (dispatch); canonical_workers.js:1-70 (pipeline header, BaseWorker._emit with namespace/correlation/causation/confidence preservation); mission_scheduler.js:192-220 (_dispatch builds event from mission)
- DISTRIBUTION BLOCKER: none

### RESULT / EVIDENCE AUTHORITY

STATUS: RESOLVED (PROVEN)

- AUTHORITY: Retrieval evidence verification authority
- DECISION OWNED: whether a retrieval result is presented as verifiable truth (accumulate -> verify -> rank); verify = recompute canonical hash + lineage + namespace consistency; Qdrant hits traced back to a real ping_events row by source_event_id
- CANONICAL IMPLEMENTATION: EvidenceAuthority (ping-runtime/evidence/evidence_authority.js), wired gateway_runtime.js:527 (Phase E), services at :534/:664
- ENTRYPOINT: accumulate(sourceEventIds), verify(evidence), rank(results); composed into HybridSearch (semantic Qdrant + verification + knowledge graph)
- PERSISTENCE: none of its own. ADD-only: "this authority never mutates events, only reads" (file header). Reads ping_events via eventRuntime/pool
- IDENTITY/HASH/SEQUENCE: recomputes canonical hash via verifyCanonicalObject (gateway/canonical_object.js); does not mint identity
- READERS: HybridSearch consumers, gateway routes
- REPLAY: n/a (derived verification, not a journal)
- BYPASSES: none observed; ConstitutionalVerificationAuthority (constitutional_verification_authority.js:68) exists — relationship to EvidenceAuthority not traced; flagged as UNKNOWN_NONBLOCKING for the distribution slice (both are read-side verifiers; no write decision conflict observed)
- REACHABLE BYPASSES: none
- EVIDENCE: evidence_authority.js header (ADD-only law), :21 class, :47 accumulate, :76 verify; gateway_runtime.js:527 wiring
- DISTRIBUTION BLOCKER: none

### WITNESS AUTHORITY

STATUS: RESOLVED — PARTIAL (Lane E PROVEN; JS live worker verified by coordinator)

- AUTHORITY: VACANT as a standalone authority. No WitnessAuthority class exists anywhere in the tree (only aspirational docstring references: runtime/constitutional_event_loop.py:16,200; workers/witness_worker.py:8,49; scripts/skill_registry.py:16)
- DECISION OWNED: per standing law, a canonical witness is a DERIVED replay attestation, not a standalone authority. The live decision is "which verified replay gets attested", owned by WitnessWorker's failure-honesty gate (canonical_workers.js:451-500)
- CANONICAL IMPLEMENTATION: WitnessWorker (ping-runtime/workers/canonical_workers.js:451), registered live with eventTypes ['WITNESS_CREATE', 'REPLAY_COMPLETED'] (canonical_workers.js:714), wired through registerCanonicalWorkers in the gateway
- ENTRYPOINT: WITNESS_CREATE missions and REPLAY_COMPLETED events
- PERSISTENCE: witnesses persist as WITNESS_CREATED events in ping_events via the canonical emit path. No dedicated live witness table: authority_witness schema exists only in pg_dump.sql:311-324 (data section EMPTY) and archive/obsolete/migration_002_authority_tables.sql; live DB has no authority_witness table per audits, so the Python legacy persistence path is unreachable
- IDENTITY: attestation label = `witness-${event_id.slice(0,16)}` (derived label, not a cryptographic root). Python legacy paths used uuid4 ids and simulated signatures (sig_ prefix), both dormant/inert
- HASH: no HashAuthority; JS path uses no hash for witness identity (label only). Python paths computed inline sha256 via hashlib
- SEQUENCE: none
- READERS: LineageWorker listens WITNESS_CREATED (canonical_workers.js:715); lineage_worker.py (legacy, gateway path)
- REPLAY: replay PRODUCES witnesses; never consumes them. Failure-honesty gate: on REPLAY_COMPLETED with verified !== true, WitnessWorker REFUSES to attest and emits WITNESS_REJECTED (reason unverified_replay:<reason>) — never fabricates an attestation
- BYPASSES: legacy Python creators (witness_worker.py direct psycopg2 -> authority_witness, unreachable live; workers/witness_worker.py gateway-backed with simulated content, host unconfirmed) — both LEGACY/DORMANT, not reachable in the gateway distribution slice
- REACHABLE BYPASSES: none
- EVIDENCE: canonical_workers.js:451-510 (WitnessWorker.handle, failure-honesty gate), :513 (LineageWorker), :714-715 (registration); Lane E report (vacant authority, dual Python creators, authority_witness absent live, rogue-branch check NEGATIVE: compute_witness_root lives only in destructive_recovery_certification.py cert script)
- DISTRIBUTION BLOCKER: none. Witness rides ping_events; no witness code beyond the JS worker enters the distribution slice. 2026-09-30: two semantic-distinct live implementations, correctly not collapsed: (a) WitnessWorker.handle (canonical_workers.js:504-581, W7 fail-closed gate) builds WITNESS_CREATED inline (:563-578), bypassing the witnessAuthority singleton; (b) DeterministicReplayEngine -> WitnessAuthority.computeWitnessRoot (gateway/replay/kernel/witness_authority.js:94, 12-leaf Merkle); the singleton serves only the ~60 gateway authorities' constitutional-result witnesses. Dormant TS 13-leaf design (runtime/kernel/replay/witness_authority.ts:26) has divergent hash-domain semantics — adopting it would fork all historical roots (phase16 W-2); must not be adopted as a replacement.

### REPLAY AUTHORITY

STATUS: RESOLVED — **REPLAY PARTIAL** (Lane D PROVEN)

- AUTHORITY: Replay verification authority
- DECISION OWNED: whether a replayed event chain verifies deterministically; replay verdict fields (verified, violations, fingerprint)
- CANONICAL IMPLEMENTATION: ReplayWorker (canonical_workers.js:226) + KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js:37) -> gateway/replay/kernel/deterministic_replay_engine.js DeterministicReplayEngine.replay; wired gateway_runtime.js:510-519 ("This is the LIVE arrow")
- ENTRYPOINT: REPLAY_VERIFY / PROJECTION_CREATED missions dispatch to ReplayWorker via MissionScheduler MISSION_WORKER_MAP (REPLAY_VERIFY -> 'replay')
- PERSISTENCE: replay verdicts persist via _emit('REPLAY_COMPLETED', {...}) into ping_events; /replay/stats route (mission_control.js:523) reads REPLAY_COMPLETED from ping_events
- READERS: WitnessWorker listens REPLAY_COMPLETED (canonical_workers.js:714)
- REPLAY: PARTIAL. Lane D proved: (a) _buildReplayEvents (canonical_workers.js:424) returns ONLY the triggering in-memory event; the production correlation-group query ("SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1") exists only as an unwired comment — replay never reads back the canonical journal; (b) the kernel provider re-mints identities: eventId = `evt-ping-${i}-${hash}` (kernel_replay_execution_provider.js:69) and remaps PING types to kernel artifact_commit/artifact_update — replayed envelopes are provably NOT the same canonical representation persistence stores. Without a provider the path emits REPLAY_COMPLETED with verified:false, reason 'no_replay_provider'. Other replay paths: legacy Python workers read the legacy `events` table (REPLAY DISCONNECTED), capability_scheduler replayAssignment reads repository_events but has zero callers (REPLAY PARTIAL, uninvoked), RepositoryAuthority loadStream/verifyHash machinery is dead code (never instantiated), gateway/replay_authority.js has null ports (NO REPLAY), desktop runtime and node_registry stubs (NO REPLAY)
- BYPASSES: none — replay always emits REPLAY_COMPLETED through the canonical emit path
- REACHABLE BYPASSES: none
- EVIDENCE: canonical_workers.js:226-450 (ReplayWorker.handle, _buildReplayEvents, _buildAuthorityEvidence), :713 (registration); kernel_replay_execution_provider.js:37, :69 (identity reminting); gateway_runtime.js:508-519 (provider wiring); mission_scheduler.js:50 (REPLAY_VERIFY -> 'replay' map); Lane D report
- DISTRIBUTION BLOCKER: none for distribution; recorded convergence defect (non-blocking): live replay does not consume the canonical journal and re-mints identities — replay fidelity is partial. 2026-09-30 engine path: ReplayWorker (canonical_workers.js:226) + KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js:14) -> DeterministicReplayEngine.replay, wired gateway_runtime.js:515-522. Dormant: ContinuousReplayAuthority (zero requirers), gateway/replay_authority.js:31 ("single replay authority" claim, instantiated only by two unwired files), legacy Python workers.

### LINEAGE AUTHORITY

STATUS: RESOLVED (PROVEN)

- AUTHORITY: Event lineage tracking authority
- DECISION OWNED: lineage records for events (causation chain tracking)
- CANONICAL IMPLEMENTATION: LineageWorker (ping-runtime/workers/canonical_workers.js:513), registered live with eventTypes ['LINEAGE_CREATE', 'WITNESS_CREATED'] (canonical_workers.js:715)
- ENTRYPOINT: LINEAGE_CREATE missions (terminal in the EVENT_MISSION_MAP chain: WITNESS_CREATED -> LINEAGE_CREATE, "LINEAGE_CREATED is terminal — chain complete")
- PERSISTENCE: lineage records persist as LINEAGE_CREATED events in ping_events via the canonical emit path (payload.lineage: documentId, eventType, timestamp, causationChain, upstreamEventId)
- IDENTITY/HASH/SEQUENCE: derived from the triggering event; causationChain = [metadata.causation_id]
- READERS: none observed beyond the journal itself
- REPLAY: n/a (lineage is derived state)
- BYPASSES: legacy Python lineage_worker.py (reads legacy `events`, dormant) — not reachable in the distribution slice
- REACHABLE BYPASSES: none
- EVIDENCE: canonical_workers.js:513-548 (LineageWorker.handle), :715 (registration); event_to_mission_bridge.js EVENT_MISSION_MAP terminal comment
- DISTRIBUTION BLOCKER: none

### CLAIM AUTHORITY

STATUS: RESOLVED — NOT AN AUTHORITY (PROVEN 2026-09-30)

- FINDING: no ClaimAuthority class exists in live code; none is needed. Writes: ClaimWorker transform (canonical_workers.js:140-167) emits CLAIM_CREATED. Live pipeline: OBSERVATION_CREATED -> ClaimWorker -> CLAIM_CREATED (canonical_workers.js:140-172, 723); verified truth = Fact (cir/fact.ts:8); standing = knowledge_nodes.status. Deprecated Python ClaimWorker is explicitly "NOT DEPLOYED". There is no claim authority to bypass.
- EVIDENCE: 03-other-authorities.md, 04-object-equivalence.md (2026-09-30 forensic lanes)

### KNOWLEDGE AUTHORITY

STATUS: RESOLVED (PROVEN 2026-09-30)

- AUTHORITY: knowledge promotion gate
- DECISION OWNED: which candidate knowledge becomes approved standing
- CANONICAL IMPLEMENTATION: KnowledgePromoter (ping-runtime/knowledge/knowledge_promoter.js:28-60) — only the human promotes
- PERSISTENCE: knowledge_nodes / knowledge_edges via KnowledgeGraph.addNode (ping-runtime/knowledge/knowledge_graph.js:30). Header states it already replaced 5+ dead implementations. REJECTED state exists (knowledge_nodes.status="rejected", knowledge_promoter.js:50-51)
- EVIDENCE: 03-other-authorities.md, 04-object-equivalence.md (2026-09-30 forensic lanes)
- DISTRIBUTION BLOCKER: none

STATUS: RESOLVED (PROVEN)

- AUTHORITY: Capability registry authority
- DECISION OWNED: which capabilities exist, their identity (capability_id), and which authority owns each
- CANONICAL IMPLEMENTATION: CapabilityResolver (ping-runtime/runtime/capability_resolver.js), loads gateway/generated/capability_registry.json at startup (throws if missing), indexes by name and by authority, computes registry hash; wired gateway_runtime.js:179-180, services :208/:651/:712
- ENTRYPOINT: load() at gateway boot
- PERSISTENCE: file-based: gateway/generated/capability_registry.json (generated by capability_generator.js). Sibling generated registries with the same load pattern: event_registry.json (EventValidator), workflow_registry.json (WorkflowExecutor), deployment_manifest.json (DeploymentLoader), state_machine_registry.json
- IDENTITY: capability_id per capability; duplicate names rejected at load
- HASH: registry hash computed at load (crypto)
- SEQUENCE: n/a
- READERS: gateway routes/services via services.capabilityResolver
- REPLAY: n/a
- BYPASSES: bypass-by-design (PROVEN 2026-09-30): WorkerRuntime.dispatch (ping-runtime/workers/worker_runtime.js:14) matches on eventTypes only — registered capabilities are never consulted. No CapabilityAuthority class exists in live ping (exists only in dormant sibling constitutional-runtime). tenant_capability_grant.js self-declares "NOT an authority"; its only consumer is its own test — grants are unwired in the live path. CapabilityResolver remains the registry authority (which capabilities exist), but it does not gate dispatch.
- REACHABLE BYPASSES: none
- EVIDENCE: capability_resolver.js:1-60 (exclusive-registry comment, load, validate, index); gateway_runtime.js:179-180 wiring; gateway/generated/ registry files present
- DISTRIBUTION BLOCKER: none. Note: the JSON registries are required runtime config and must enter the distribution slice; the *_generator.js files are build-time only

### ACQUISITION AUTHORITY

STATUS: GAP (PROVEN 2026-09-30, worktree lane-b/tenant-dispatch-threading @ 546b62d76)

- AUTHORITY: none. No live mechanism turns an external observation into a durable PING event.
- DECISION OWNED: unowned — the seam is open but unmanned.
- FINDINGS: AcquisitionManager: phantom, zero hits (third confirmation). gateway/acquisition_authority.js + continuous_acquisition.js: dead at entry (zero requirers). constitutional_acquisition_loop.js: requires nonexistent module (would throw); runner is explicit no-op. acquire-url.ts (~/workspace/acquisition-seam/): working SSRF-hardened fetcher, zero call sites. git-ingest GatewaySink.emit() raises NotImplementedError ("refusing to half-fire"). POST /ingest (routes/ingest.js:48,53 -> canonicalizeAndEmit -> emit -> INSERT) is the live canonical door with ZERO live production callers (chain breaks at routes/ingest.js:31). Only external observations reaching ping_events are hand-carried via POST /events by agent scripts (tandem/emit-observation.py:502) and the FYD BFF. No acquisition -> private-DB or marketing-owned event store exists anywhere (PROVEN by exhaustive search).
- EVIDENCE: 02-acquisition-seam.md (2026-09-30 forensic lane)
- DISTRIBUTION BLOCKER: none for distribution; the missing acquisition producer is the single structural gap for intelligence workloads

### WORKSPACE AUTHORITY

STATUS: OUT OF SCOPE (recorded rationale, not a gap)

Rationale: Workspace authority (AIWorkspaceAuthority, wired gateway_runtime.js:410 with canonicalEventEnvelope + huggingfaceAdapter) serves agent-facing business features (review/customer/project/ai_workspace authorities), not the canonical event/mission/worker/replay/witness/lineage/evidencedistribution path. Runtime Distribution v1's Oracle topology (postgres + ping-runtime image) does not depend on it. Revisit only if the distribution slice grows to include agent workspace features.

### FILESYSTEM / PATCH / COMMIT AUTHORITY

STATUS: OUT OF SCOPE (recorded rationale, not a gap)

Rationale: development-time operations (patch application, git commits). Not part of the Oracle runtime. No single-authority threat to the distribution slice observed.

## Evidence log

2026-09-19 16:44 MDT: forensic pass opened. Convergence worktree /home/nolan/ping, HEAD 88c9651be (verified via pigwsl-run.sh). Five parallel lanes dispatched: A acquisition callers, B ConstitutionalEventStore vs EventRepository, C direct table writers, D replay consumers, E witness authority. Coordinator owned Blocks 2 (IEventAuthority) and 4 (identity/hash/sequence chain).
2026-09-19 17:05 MDT: all five lanes complete. Authority records RESOLVED: Event (RESOLVED, verdict recorded), Mission, Worker execution, Result/Evidence, Witness (PARTIAL, vacant standalone authority; live JS worker proven), Replay (PARTIAL: live but journal-unread and identity-reminting), Lineage, Capability. Workspace and Filesystem/Patch/Commit marked OUT OF SCOPE with rationale. Phantoms FALSIFIED: ConstitutionalEventStore, AcquisitionManager, batchCollectEvidence (Lane A/B). IEventAuthority DORMANT. PostgresEventStore DORMANT. One failure recorded: FL-20260919-CONV-001 (Dockerfile.replay missing, compose replay-worker unbuildable). Read-only maintained throughout: no patches, commits, installs, config changes, or restarts.
2026-09-30 11:17 MDT: intelligence-convergence forensic pass complete (six lanes, read-only; reports in ~/workspace/forensics/ping-intelligence-convergence-2026-09-30/, PROVEN against /home/nolan/ping @ lane-b/tenant-dispatch-threading @ 546b62d76). Headline verdicts: (a) OBJECT EQUIVALENCE — all 10 proposed Growth OS domain concepts (ResearchPackage, Signal, Claim, EvidenceRecord, KnowledgeRecord, Learning, ExperimentResult, ContentArtifact, AudienceCluster, Opportunity) REUSE existing PING primitives (mission rows + payload JSONB, Observation/OBSERVATION_CREATED, ClaimWorker/CLAIM_CREATED, kernel Evidence, kernel Knowledge, knowledge_nodes, ping_missions.result, kernel Artifact, knowledge_nodes/edges, Assessment); zero new objects justified; genuinely missing only as enum FIELDS: SUPPORTED/FALSIFIED/INCONCLUSIVE and CONFIRMED/REFUTED/UNCLEAR verdicts; REJECTED and FAILED_EXECUTION semantics already exist; domain vocabulary may be a VIEW over canonical primitives. (b) ENGINE MAPPING — all seven Growth OS engines (Signal, Audience Graph, Opportunity, Content Memory, Experiment, Distribution, Learning) map onto existing PING primitives/authorities/mission types with NO new storage and NO new authority; new items are non-authority: three bounded mission labels (INTELLIGENCE_RESEARCH, EXPERIMENT_RUN, DISTRIBUTION_RUN) routed by existing WorkerRuntime.dispatch(); domain payload schemas; optionally durable approval event types. INTELLIGENCE_RESEARCH is a proposed mission label, NOT in code (zero hits 2026-09-30). (c) CONVERGENCE MAP — 14-capability map built (Research, Signals, Claims, Evidence, Audience learning, Opportunity analysis, Experiments, Content generation, Claim verification, Distribution preparation, Metrics ingestion, Learning, Playbooks, Next-question generation); 8 rows have no gap or vocabulary-only gaps; real gaps are bounded and pre-existing: three mission labels absent from code; verdict/grade vocabularies as literals; durable human-approval record; /ingest producer; bounded analysis behaviors (contradiction detection, claim->mission chaining, identity stitching, transcript-accuracy pass) — behaviors, never authorities. THE TEST walkthrough ("Research Jev/Typesafe..."): 18 arrows mapped, 13 ride fully PROVEN existing primitives/authorities, 5 touch the vocabulary/label/behavior gaps; no arrow requires a new authority or store; zero hidden MarketingOS database / ResearchAgent truth store / ContentBrain memory / GrowthAgent authority — durable state lands only in ping_events, ping_missions, knowledge_nodes/edges, Qdrant vectors, plus VM-side operator tooling. Compounding path: every mission leaves residue in four existing homes under five existing authorities (UnifiedEventRuntime, MissionRuntime, KnowledgePromoter, EvidenceAuthority, authorizeWorkOrder); research compounds via unverified-claims-become-next-mission; experiments compound via confidence updates (never policy); distribution compounds via metric observations -> learning -> playbook.
