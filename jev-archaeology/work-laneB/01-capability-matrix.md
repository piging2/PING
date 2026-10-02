# Lane B — Capability Matrix (2026-09-22)

Scope: primary worktree = /home/nolan/ping @ `refactor/runtime-authority-convergence` (cc6856c3),
unless a row says otherwise. Method: `git grep` over tracked source (*.py/*.js/*.ts/*.tsx/*.jsx/
*.json/*.yaml/*.yml/*.sh/*.go) in all 13 worktrees (433 worktree×symbol rows), then per-file
reads + importer/call-site tracing in the primary tree. "Older family" = main/agent-exec/playbook/
python-prod/oracle-deploy (5b102c66 line). "Newer family" = all others.

Legend: IMPL = implemented (real code, not doc-only) | IMP = importable (module exports it)
| REACH = reachable (has importers / wired into a live path) | LIVE = live-proven (instantiated
in a live bootstrap: gateway/bootstrap/gateway_runtime.js, kernel/event_dispatcher.py)
| PERS = persistent (durable state) | AUTH = claims authority semantics | DUP = duplicates.

## 1. Authority family

| CAPABILITY | WORKTREE | SOURCE FILE | HEAD | IMPL? | IMP? | REACH? | LIVE? | PERS? | AUTH? | DUPLICATES? | USEFUL IDEA? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CapabilityAuthority | primary | runtime/kernel/capabilities/capability-authority.ts | cc6856c3 | yes (TS class) | yes | NO — zero importers | no | no | yes | none (sole def) | convergence target; newest layer, unwired |
| capability_registry | primary | ping-runtime/orchestration/execution/capability_registry.js (312 lines) + capability_registry.json (data) | cc6856c3 | yes | yes | YES — required by engine.js (`new` not needed; used as registry) | yes (via ExecutionEngine in gateway_runtime.js:339) | json file | yes | gateway/generated/capability_registry.json is the generated source of truth it reads — complementary, not dup | live registry |
| WorkspaceRegistry | — | — | — | NO — zero hits in all worktrees | — | — | — | — | — | — | never existed |
| FilesystemAuthority | primary | gateway/filesystem_authority.js (real impl, fs.promises + PG pool) | cc6856c3 | yes | yes | partial — imported by gateway/constitutional_validation_harness.js only | no (harness only) | reads FS | yes | older family has constitutional-compiler/runtime/authority/authority-engine.ts variant | semi-live |
| CommitAuthority | primary | gateway/commit_authority.js (307 lines, real) | cc6856c3 | yes | yes | NO require-importers; name-referenced in constitutional_authority_registry.js, constitutional_execution_planner.js, approval_authority.js | no | unverified | yes | none | orphaned; commit-gating logic may be valuable |
| PatchAuthority | primary | gateway/patch_authority.js (626) AND gateway/patch_authority_v2.js (781) | cc6856c3 | yes (both, totally different code — 1386 diff lines) | yes | NO importers for either | no | unverified | yes | v1 vs v2 = versioned duplicate | v2 supersedes v1; neither wired |
| IdentityAuthority | primary | (a) runtime/kernel/authorities/identity_authority.js (326, canonical JS) ← (b) ping-runtime/authorities/identity_authority.js (42, PATCH_004 SHIM re-exporting kernel) ← 67 requires hit the shim path; (c) runtime/authorities/identity_authority.py (108, uuidv7, PG-backed) ← imported by 7 py modules; (d) runtime/constitutional/src/identity-authority.ts (143, newest, Patch 7B 2026-09-21, uses HashAuthority) ← zero importers | cc6856c3 | yes (all four) | yes | (a/b) yes — live; (c) yes — live in py lane; (d) no | (a/b) yes; (c) yes via event_dispatcher chain; (d) no | (c) PG-backed | yes | cross-language parallels (JS kernel / Python / TS-newest); (b) is a deliberate shim, not a dup | (d) is the convergence candidate |
| HashAuthority | primary | runtime/constitutional/src/hash-authority.ts (new, Patch 7B) | cc6856c3 | yes | yes | only internal use by identity-authority.ts | no | no | yes | none in primary; older branches mention it loosely | convergence candidate |
| SignatureAuthority | primary | (name only — no def file found; refs are string mentions) | cc6856c3 | NO — referenced, not implemented | — | — | — | — | claimed | — | gap: signing authority has no implementation |
| VerificationAuthority | primary | runtime/kernel/authorities/verification_authority.js (291, real) + gateway/verification_authority.js (38, PATCH_004 SHIM subclassing kernel) | cc6856c3 | yes | yes | yes via shim path | unverified instantiation | no | yes | shim ≠ dup (clean convergence) | clean |
| MissionRuntime | primary | ping-runtime/orchestration/mission_runtime.js (412) | cc6856c3 | yes | yes | yes — gateway_runtime.js | YES (imported in gateway_runtime.js) | unverified | yes | none | live |
| MissionScheduler | primary | ping-runtime/orchestration/mission_scheduler.js (343) | cc6856c3 | yes | yes | yes — gateway_runtime.js + tests | yes | unverified | yes | note: execution/scheduler.js (Scheduler) is a separate smaller scheduler wired inside engine.js — possible overlap, unverified | live |
| WorkerRuntime | primary | ping-runtime/workers/worker_runtime.js (169) | cc6856c3 | yes | yes | 82-89 refs; exact importers not fully traced | likely | unverified | yes | older family has workers/canonical/WorkerRuntime.ts — family-level parallel | live-ish |
| WorkerRegistry | primary | THREE: (1) gateway/worker_registry.js (334, event-sourced lifecycle) ← imported by gateway/background_workers.js (43 lines); (2) ping-runtime/orchestration/worker_registry.js (413, LLM persona catalog: WORKERS={authority_auditor...}) ← ZERO code importers; (3) runtime/kernel/workers/worker-registry.ts (74, real Map-based registry) ← ZERO TS importers | cc6856c3 | yes (all three, DIFFERENT responsibilities) | yes | (1) weak; (2) no; (3) no | no proven | (1) event-sourced | yes | (1) vs (2) vs (3) = naming collision triple; (2) and (3) orphaned | (3) is the cleanest registry design — convergence candidate |
| EventToMissionBridge | primary | ping-runtime/orchestration/event_to_mission_bridge.js (154, class + EVENT_MISSION_MAP) | cc6856c3 | yes | yes | yes — gateway_runtime.js | yes | no | yes | none | live |
| ExecutionEngine | primary | ping-runtime/orchestration/execution/engine.js (716, real) — wires 14 modules: capability_registry, event_queue, mission_compiler, scheduler, artifact_router, consensus_engine, worker_state_machine, artifact_store, ollama_provider, intelligence_graph, merge_gate, dormant_classifier/ReplayCertifier, context_authority, artifact_authorities, worker_port | cc6856c3 | yes | yes | yes | YES — `new ExecutionEngine()` at gateway_runtime.js:339 | orchestrates | yes | older family has constitutional-compiler/runtime/agent-runtime.ts ExecutionEngine (9 refs) — family-level parallel | LIVE core |
| EventQueue | primary | ping-runtime/orchestration/execution/event_queue.js (205) | cc6856c3 | yes | yes | via engine.js + 2 test files | yes (via engine) | in-memory + ? | yes | none | live via engine |
| ConsensusEngine | primary | ping-runtime/orchestration/execution/consensus_engine.js (164) | cc6856c3 | yes | yes | via engine.js | yes (via engine) | unverified | yes | older family: tests/consensus_stats.test.js only — no impl | live via engine |
| MergeGate | primary | ping-runtime/orchestration/merge_gate.js (197) | cc6856c3 | yes | yes | via engine.js | yes (via engine) | unverified | yes | older family: tests/merge_gate.test.js only | live via engine |
| ProposalArtifact | primary | ping-runtime/orchestration/execution/artifact_authorities.js (329; also defines ConsensusArtifact, MergeDecisionArtifact, ReplayArtifact, WitnessArtifact + live ArtifactAuthority) | cc6856c3 | yes | yes | via engine.js require | yes (via engine) | via ArtifactStore | yes | none (single home for all 5) | live via engine |
| ConsensusArtifact | — | (same file as above) | cc6856c3 | yes | yes | via engine.js | yes | via store | yes | — | — |
| MergeDecisionArtifact | — | (same file as above) | cc6856c3 | yes | yes | via engine.js | yes | via store | yes | — | — |
| ReplayArtifact | — | (same file as above) | cc6856c3 | yes | yes | via engine.js | yes | via store | yes | — | — |
| WitnessArtifact | — | (same file as above) | cc6856c3 | yes | yes | via engine.js | yes | via store | yes | — | — |
| ArtifactAuthority | primary | (A) ping-runtime/orchestration/execution/artifact_authorities.js (live, ctor(store, eventQueue)) vs (B) gateway/artifact_authority.js (135, pure-contract, ctor(dependencies)) ← ZERO importers | cc6856c3 | yes (both) | yes | (A) yes via engine.js; (B) no | (A) yes | (A) via store | yes | (A) vs (B) = REAL duplicate, different ctors | (B) orphaned — superseded by (A) |
| ArtifactStore | primary | ping-runtime/orchestration/execution/artifact_store.js (197) | cc6856c3 | yes | yes | via engine.js | yes (via engine) | yes (store) | yes | none | live via engine |
| ReplayWorker | primary | (1) ping-runtime/workers/canonical_workers.js (760 — defines ReplayWorker + WitnessWorker, BaseWorker-based) ← imported by gateway_runtime.js + evals; (2) ping-runtime/agents/replay_worker.js (27 — thin adapter delegating to ReplayAuthority); (3) workers/replay_worker.py (live py, wired in kernel/event_dispatcher.py); (4) replay_worker.py (root, 155 — DIFFERS from workers/ version by 244 lines, same CLAIM_GENERATED→REPLAY_EXECUTED responsibility) | cc6856c3 | yes | yes | (1)(2)(3) yes; (4) no importers found | (1) yes; (3) yes | (3)(4) PG | worker | (1) vs (2) overlap (both JS); (3) vs (4) = py duplicate pair | (4) looks legacy — verify then archive |
| WitnessWorker | primary | (1) canonical_workers.js (shared bundle) ← live; (2) workers/witness_worker.py ← live via event_dispatcher; (3) witness_worker.py (root, 141 — differs from workers/ by 247 lines) ← no importers | cc6856c3 | yes | yes | (1)(2) yes; (3) no | (1)(2) yes | PG | worker | (2) vs (3) = py duplicate pair | (3) looks legacy |
| Lineage | primary | NO standalone Lineage class (120 refs are doc/loose mentions); real: gateway/lineage_authority.js + workers/lineage_worker.py (py pipeline) | cc6856c3 | partial | yes (authority) | py lane yes | py yes | PG | yes | older family has workers/canonical/LineageWorker.ts | concept fragmented across 3 homes |
| Projection | primary | NO ProjectionAuthority file (239 refs are concept mentions); real impls: runtime/constitutional/src/ping-projector.ts + ping-feed-projection.ts (newest, only wired to index.ts + tests) and workers/projection_worker.py (py lane, live) | cc6856c3 | partial | yes | py lane yes; TS no | py yes | PG | implied | fragmented: py worker (live) vs TS projector (unwired newest) | TS projector = convergence candidate |
| IntelligenceGraph | primary | ping-runtime/orchestration/intelligence_graph.js (505) | cc6856c3 | yes | yes | via engine.js | yes (via engine) | unverified | yes | none | live via engine |
| ContextAuthority | primary | ping-runtime/orchestration/execution/context_authority.js (298) | cc6856c3 | yes | yes | via engine.js | yes (via engine) | unverified | yes | none | live via engine |
| AcquisitionManager | — | — | — | NO — zero hits all worktrees | — | — | — | — | — | note: gateway/acquisition_authority.js EXISTS (different name) | never existed under this name |
| ObservationAuthority | primary | NO implementation (2 refs: SPRENT4 audit md + a pipeline log string in runtime/constitutional_event_loop.py) | cc6856c3 | NO | — | — | — | — | claimed in docs | older family HAS gateway/observation_authority.js (real) — lost in convergence | SUPERSEDED in JS tree; py lane has workers/observation_worker.py (live) |
| NAMESPACE_OWNERS | primary | ping-runtime/events/event_governance.js:11 (const map, exported, enforced at :118/:198) | cc6856c3 | yes | yes | yes — gateway_runtime.js, gateway/routes/governance.js, evals | yes | no (config) | yes (governance) | none | live |
| OllamaAdapter | primary | THREE: adapters/ollama_adapter.js (144) ← imported BY gateway/ollama_adapter.js (338, real); gateway/adapters/ollama_adapter.js (495, real, different) ← referenced in a registry map; PLUS ping-runtime/orchestration/execution/ollama_provider.js (OllamaProvider, 4th module, wired in engine.js) | cc6856c3 | yes (all) | yes | partial | partial (via engine → ollama_provider) | no | adapter | TRIPLE+1 duplication | needs reconciliation; ollama_provider is the live path |
| HumanDecision | — | — | — | NO — zero hits all worktrees | — | — | — | — | — | — | never existed |
| ApprovalAuthority | primary | gateway/approval_authority.js (379, real; authority-law dormant_classifications: authority_score 80, dependent_modules 0, recommendation "migrate") | cc6856c3 | yes | yes | NO importers | no | unverified | yes | none | ORPHANED BUT VALUABLE — human approval gates |
| Codex | primary | NOT a capability — 946 refs are "Codex CLI" (OpenAI) mentions in code-gen port docs | cc6856c3 | n/a | — | — | — | — | — | — | ignore |
| Hermes | primary | NOT a capability — 3 refs are a 'Hermes-Agent-Research-Pipeline' User-Agent string in brainos/research/scan_and_synthesize.py | cc6856c3 | n/a | — | — | — | — | — | — | ignore |

## 2. Model/provider adapters & external agents

| CAPABILITY | WORKTREE | SOURCE FILE | HEAD | IMPL? | IMP? | REACH? | LIVE? | PERS? | AUTH? | DUPLICATES? | USEFUL IDEA? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| model/provider adapters | primary | adapters/ (ollama, nats, redis, qdrant adapters) + ping-runtime/search/qdrant_adapter.js + gateway/qdrant_client.js (referenced) | cc6856c3 | yes | yes | yes (embedding_service, technology_authority, gateway_runtime) | partial | no | adapter | Qdrant: 2–3 client implementations (adapters/qdrant_adapter.js vs ping-runtime/search/qdrant_adapter.js vs gateway/qdrant_client.js) | reconcile qdrant clients |
| Qdrant | primary | clients above; 520 refs, no npm dep (REST) | cc6856c3 | client only | yes | yes | likely | external | no | multiple REST clients | — |
| Neo4j | primary | driver referenced in gateway_runtime.js; 13 refs | cc6856c3 | client usage | — | yes | unverified | external | no | none | — |
| Mem0 | older family ONLY | constitutional-compiler/dist/vendor/mem0 (vendored, 187 refs) | 5b102c66 | vendored dep | — | n/a in primary | no | — | no | none | DORMANT/LEGACY — absent from primary entirely |
| NATS | primary | adapters/nats_adapter.js (real) | cc6856c3 | yes | yes | referenced | unverified | external | no | none | — |
| Redis | primary | adapters/redis_adapter.js + gateway/bullmq_adapter.js | cc6856c3 | yes | yes | referenced | unverified | external | no | none | — |
| Temporal | primary | ping-runtime/temporal/{activities/mission_activities.js, workflows/mission_workflow.js, index.js} + gateway refs (104) | cc6856c3 | yes | yes | yes | unverified | external orchestrator | no | calm-garden had gateway/temporal_authority.js — not carried over; capability re-expressed as durable workflows | live-ish integration |
| external agent adapters | primary | gateway/adapters/* (github, ollama...), workers/repository_client.py | cc6856c3 | yes | yes | partial | partial | no | adapter | none flagged | — |

## 3. Discovered extras (not in the original symbol list)

| CAPABILITY | WORKTREE | SOURCE FILE | HEAD | IMPL? | REACH? | LIVE? | NOTE |
|---|---|---|---|---|---|---|---|
| MissionCompiler | primary | ping-runtime/orchestration/execution/mission_compiler.js | cc6856c3 | yes | via engine.js | yes (via engine) | mission→execution compilation |
| Scheduler | primary | ping-runtime/orchestration/execution/scheduler.js | cc6856c3 | yes | via engine.js | yes (via engine) | inner scheduler; possible overlap with MissionScheduler — unverified |
| ArtifactRouter | primary | ping-runtime/orchestration/execution/artifact_router.js | cc6856c3 | yes | via engine.js | yes (via engine) | — |
| WorkerStateMachine | primary | ping-runtime/orchestration/execution/worker_state_machine.js | cc6856c3 | yes | via engine.js | yes (via engine) | — |
| WorkerPort | primary | ping-runtime/orchestration/execution/worker_port.js | cc6856c3 | yes | via engine.js | yes (via engine) | — |
| OllamaProvider | primary | ping-runtime/orchestration/execution/ollama_provider.js | cc6856c3 | yes | via engine.js | yes (via engine) | the LIVE ollama path; see OllamaAdapter row |
| DormantClassifier / ReplayCertifier | primary | ping-runtime/orchestration/dormant_classifier.js | cc6856c3 | yes | via engine.js | yes (via engine) | in-repo dormant classification feeding the authority-law triage |
| MissionAuthority + v2 | primary | gateway/mission_authority.js + gateway/mission_authority_v2.js | cc6856c3 | yes | UNVERIFIED | unverified | another v1/v2 pair — needs importer check |
| py worker pipeline | primary | workers/{observation,claim,replay,witness,lineage,projection}_worker.py + worker_runtime.py, wired in kernel/event_dispatcher.py | cc6856c3 | yes | yes | YES (event_dispatcher) | full DOCUMENT_IMPORTED→…→projection chain, PG-backed |
| runtime/constitutional/src/* (newest layer) | primary | hash-authority.ts, identity-authority.ts, time-authority.ts, ping-canonical-envelope.ts, ping-object-kernel.ts, ping-projector.ts, ping-feed-projection.ts, ping-identity.ts, ping-vocabulary.ts, dev-key-custody.ts | cc6856c3 | yes | index.ts + tests only | no | Patch 7B (2026-09-21) convergence target — CONVERGENCE CANDIDATE |
| SignatureAuthority | primary | — | cc6856c3 | NO | — | — | gap: claimed in docs, no implementation |
| ProjectMem | — | — | — | NO — zero hits all worktrees | — | — | never existed |
