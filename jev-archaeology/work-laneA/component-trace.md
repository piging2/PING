# LANE A — Component Trace (main = /home/nolan/ping @ cc6856c3b, branch refactor/runtime-authority-convergence)

## 1. ping-runtime/events/unified_event_runtime.js — UnifiedEventRuntime
- Introduced: commit 0f868def3 "PING Core v1 build-out" (also 95e2b8c8e, 1effdc8ad same message, multiple branch imports).
- Live boot: gateway/bootstrap/gateway_runtime.js:71 (require), :433 (new UnifiedEventRuntime), :439 (initialize() creates ping_events DDL), :448 (wired into DI container as eventRuntime).
- emit(): inline event_id = sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]})) — 64-hex, order-dependent pre-convergence law (C-004 defect class; convergence branch fixed it, main did NOT adopt: main has its own ccfef91f3 "Fix P0: fail-closed event persistence and collision detection").
- Persist: INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING; on conflict, semantic-collision check (payload canonical-JSON compare) → fail closed.
- Governance: EventGovernance.validateEvent at emit step 3 (bridge passes _skipGovernance:true).
- Sequencing: none explicit (no sequence column; ORDER BY timestamp/created_at). Dedup = event_id only. Namespace: 'core::system' default owned by emit(); privacy boundary core::<name> | tenant::<id>.
- Causation/correlation: metadata.causation_id / correlation_id (correlation defaults to eventId).
- Live producers calling .emit(): canonical_workers (8 workers), intelligence_worker, business_emitters, canonicalization_service, event_bridge (repository_events + canonical_events ingress), mission_runtime, mission_scheduler, POST /events route, gateway_runtime bootstrap seed. Zero direct-SQL bypasses found.
- Live readers: UnifiedEventRuntime.query + getChildren/getDescendants/getAncestors/getCorrelationGroup (recursive CTEs on ping_events); EvidenceAuthority.accumulate (ping_events); /events/stats fallback COUNT(*) on ping_events; _seedBusinessEvents COUNT(*) on ping_events.
- Live probes: docs/EXECUTION_EVIDENCE_LEDGER.md (2026-08-27): POST /ingest → 201 ×3 real events, 9-hop causal chain verified via Postgres, ping_events 1050→1091→1132 (+41) and 1214→1255 (+41) count-matching.
- CLASSIFICATION: CANONICAL / LIVE-PROVEN.

## 2. gateway/bootstrap/gateway_runtime.js (boot path)
- Production entry: gateway/server.js:1 → GatewayRuntime. Single boot path confirmed.
- Constructs: EventReadAuthority, RepositoryStore, GatewayToKernelAdapter, PostgresAdapter storage, CanonicalEventEnvelope, HPP business authorities (review/customer/project/aiWorkspace), UnifiedEventRuntime, CanonicalizationService, EventBridge, MissionRuntime, WorkerRuntime + registerCanonicalWorkers(+replayProvider), EvidenceAuthority, HybridSearch, MissionScheduler, DeadLetterAuthority, EventToMissionBridge.
- CLASSIFICATION: CANONICAL (live boot) / LIVE-PROVEN.

## 3. ConstitutionalEventStore
- Zero matches in ALL 13 worktrees (grep --include=*.js,*.ts,*.py). Zero code anywhere.
- Git history: mentioned only in docs of commits e01ffc57c, 18b80397b, ef52e12b9. CONTRADICTIONS.md @ e01ffc57c: "AcquisitionManager / ConstitutionalEventStore | UNKNOWN (phantom) | Names exist only in side-branch docs; no code." CERTIFICATION.md: "Phase B/P: AcquisitionManager and ConstitutionalEventStore do not exist (phantoms)."
- CLASSIFICATION: UNKNOWN (phantom — doc-only name, no implementation ever found).

## 4. EventRepository (runtime/kernel/event_repository.js; gateway/event_repository.js = PATCH_002 shim)
- Introduced via PATCH_002 move to kernel. Owns repository_events + event_processing DDL.
- Live boot: GatewayToKernelAdapter constructor news it up (gateway_adapter.js:27); initialize() runs DDL at every boot (gateway_adapter.js:146-151). DDL executes; appendEvent never called live.
- appendEvent callers in main: capability_scheduler.js (4×, dead — no importers), constitutional_execution_pipeline.js:34 (reachable via gateway_adapter.executeEvent — ZERO production callers), agent_memory_authority.js (5×, dead), distributed_desktop_agents.js (5×, dead), automatic_mission_generator.js (3×, dead), gateway/append_orchestrator.js (dead + broken 6-col INSERT per CR-2).
- Readers: kernel EventReadAuthority reads repository_events (instantiated in live boot, but table has no live writers → returns empty; /events/stats falls back to ping_events).
- Side-branch: orca-autonomy @ ae55b77ff added EventRepository.project() (derived audit/projection adapter, 8/8 tests) — NOT merged into main. Its OPERATING_SPEC confirms appendEvent "DORMANT_BROKEN (no boot path initializes RuntimeIdentityAuthority)".
- CLASSIFICATION: DORMANT (instantiated, DDL live, writer never invoked) / LEGACY upstream domain store; bridge-ingress only via EventBridge reads.

## 5. IEventAuthority (runtime/kernel/events/event-authority-interface.ts)
- Introduced: 0afd1a3b3/83112507a "Import constitutional replay kernel". Pure TS in-memory pub/sub interface (subscribe/publish/getHistory), no DB, no persistence.
- Importers/implementers: ZERO repo-wide (confirmed by prior Phase C forensic; re-verified: no import matches in main).
- C-R5 (CONTRADICTIONS.md): "Only this interface crosses subsystem boundaries" → STALE_DOCUMENTATION; actual boundary = UnifiedEventRuntime.emit() + Express routes.
- CLASSIFICATION: DORMANT (unrealized interface).

## 6. AcquisitionManager
- Zero matches in ALL 13 worktrees, code or docs-in-tree. History only: same phantom row as ConstitutionalEventStore (e01ffc57c docs).
- CLASSIFICATION: UNKNOWN (phantom).

## 7. EventAuthority.computeEventIdFromEvent
- Zero matches anywhere (code, docs, all worktrees, all history). Never existed under this name.
- CLASSIFICATION: UNKNOWN (phantom name).

## 8. IdentityAuthority
- ping-runtime/authorities/identity_authority.js = 42-line PATCH_004 shim → runtime/kernel/authorities/identity_authority (kernel singleton).
- deterministic_id_authority.js = DEPRECATED (says so in file; delegates to IdentityAuthority.generateFromCanonicalHash).
- Main's UnifiedEventRuntime.emit() does NOT route through IdentityAuthority (uses inline crypto) — the convergence-branch mutation (e01ffc57c, event_<16hex> IDs) was never merged into main.
- Main's own identity track: runtime/constitutional/src/identity-authority.ts + hash-authority.ts (PATCH 7A/7B, 2026-09-21, "Nolan-first proof"); consumed by gateway/constitutional-dist (required by routes/identities.js — live at boot line 683, social_ingest_adapter, knowledge_ingest_adapter). NOT wired into the event emit path.
- CLASSIFICATION: REFERENCED/REACHABLE (kernel singleton exists, shim importable); NOT the event-ID authority on the live emit path.

## 9. canonical-identity-service.ts (runtime/kernel/identity/)
- TS singleton: generateCanonicalID / generateUUIDv5 / generateContextId. Importers: mission-hierarchy.ts, canonical-id-generator.ts, replay-event.ts, event-envelope.ts, replay-authority.ts, execution-request.ts, scheduler-authority.ts, lease.ts, governance-authority.ts, audit-hook.ts — all inside the TS constitutional kernel, none on the live JS boot path.
- CLASSIFICATION: IMPORTABLE (within TS kernel) / DORMANT w.r.t. live event path.

## 10. constitutional-authorities.yaml (repo root; NOT runtime/kernel/)
- Exists at /home/nolan/ping/constitutional-authorities.yaml (+ constitutional-compiler copy). Documents intended authority map incl. runtime/kernel/witness/* files that no longer exist (deleted S.16 Epic A e6c744f82) and "cryptographic-authorities.ts fake hashes — Must eliminate". Stale in parts; aspirational, not enforced by code.
- CLASSIFICATION: REFERENCED (documentation, partially stale).

## 11. runtime/kernel/witness/ (certificate_authority.ts, cryptographic-authorities.ts)
- Directory DOES NOT EXIST in main. Deleted in S.16 Epic A (e6c744f82/c54bd91bc "collapse witness/ into replay/ — 7 dead files deleted, 2 live files moved to replay/").
- cryptographic-authorities.ts: existed historically (0afd1a3b3 import), documented as fake-SHA256; SUPERSEDED/deleted.
- certificate_authority.ts: lives on at runtime/kernel/replay/certificate_authority.ts; imported by witness_authority.ts, canonical_hash_authority.ts, merkle_tree.ts, index.ts, repository-authority.ts, identity_engine.ts (TS). Compiled to gateway/replay/kernel/*.js, reachable live via gateway/kernel_replay_execution_provider.js (boot lines 104, 513) → ReplayWorker → emits REPLAY_COMPLETED into ping_events.
- CLASSIFICATION: certificate_authority = REACHABLE (via compiled replay kernel, live); cryptographic-authorities = SUPERSEDED (deleted).

## 12. ping-runtime/events/event_bridge.js — EventBridge
- Polls repository_events + canonical_events (5s, batch 50), re-emits via UnifiedEventRuntime.emit() with _skipGovernance:true, marks canonical_events processed, maintains ping_bridge_cursors.
- Live boot: gateway_runtime.js:461-468 (new EventBridge, initialize, start).
- Direction: upstream ingress tables → ping_events. C-008: INTENTIONAL_COMPATIBILITY (governance bypass hardening = future work).
- CLASSIFICATION: REACHABLE / EXECUTED / LIVE-PROVEN (live in boot; EMPR traffic in EXECUTION_EVIDENCE_LEDGER).

## 13. gateway/replay_verifier.js
- EXISTS (427 lines). Importers: worker_registry.js:220 (config map entry; worker_registry NOT imported by live boot), dispatcher.js:132 (dead), constitutional_fuzzer.js, replay_rule_set.js, verify/09_replay.js. NOT in live boot. Live replay = ReplayWorker → KernelReplayExecutionProvider → gateway/replay/kernel/deterministic_replay_engine.js.
- CLASSIFICATION: DORMANT (legacy replay surface).

## 14. gateway/witness_recorder.js
- EXISTS (199 lines). Importers: constitutional_verification_authority.js, constitutional_runtime.js, constitutional_authority_registry.js, replay_kernel_audit.js, authority_registry.js, replay_rule_set.js, constitutional_replay_integration_harness.js, opentelemetry_witness_instrumentation.js — none on live boot path. Live witness = WitnessWorker in canonical_workers.js → emits WITNESS_CREATED into ping_events.
- CLASSIFICATION: DORMANT.

## 15. runtime/kernel/replay/ + gateway/replay/kernel/ (compiled)
- TS replay kernel: canonical_event_envelope.ts, certificate_authority.ts, canonical_hash_authority.ts, merkle_tree.ts, deterministic_replay_engine (compiled JS), etc. Tests: tests/certification/replay-determinism-1000x, replay-mutation, replay-unicode, replay-witness-regeneration.
- Live: gateway/kernel_replay_execution_provider.js requires ./replay/kernel/{deterministic_replay_engine, canonical_event_envelope, replay_event_stream}; constructed in boot (line 513) as ReplayWorker's provider.
- Replay semantics: consumes transcripts (replay_events from transcript state), never reads ping_events; never recomputes write-path IDs (duplicateEventId = deterministic abort). C2 divergence (CanonicalJson vs CanonicalBytes) deferred.
- CLASSIFICATION: REACHABLE / EXECUTED (live via ReplayWorker; emits REPLAY_COMPLETED through emit()).

## 16. CanonicalEventEnvelope (gateway/canonical_event_envelope.js) → canonical_events
- executeEmitEvent (line 126): INSERT INTO canonical_events ON CONFLICT (tenant_id, sequence) DO NOTHING. Also UPDATEs processed flags (C-R3: upstream mutability, not append-only).
- Callers: HPP business authorities (review/customer/project/aiWorkspace) — all constructed in live boot.
- Converges into ping_events via EventBridge.
- CLASSIFICATION: REACHABLE / LIVE-PROVEN (upstream ingress) / compatibility adapter, not the canonical store.
