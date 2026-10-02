# TASK 3 — Orphaned good ideas (reachability proven from gateway_runtime.js boot)

Method: static require-walk from gateway/bootstrap/gateway_runtime.js (188 files reachable)
plus filename grep across gateway/ + ping-runtime/. Candidates below are UNREACHABLE
unless noted.

## ORPHANED BUT VALUABLE (keep, wire, or salvage)
1. gateway/patch_authority.js + gateway/patch_authority_v2.js — Full patch lifecycle:
   AST parse, diff validation, formatting, lint, typecheck, unit tests, security scan,
   constitutional validation, patch witness, git diff generation, apply, ROLLBACK,
   conflict resolution. Nothing requires it. This is the missing EXECUTE-stage patch
   mechanism for a self-improvement loop.
2. gateway/transaction_boundary.js — TransactionBoundary with automatic rollback on
   failure. Nothing requires it. (The orphaned agents/replay_worker.js is its only
   conceptual consumer.)
3. gateway/continuous_acquisition.js + gateway/acquisition_authority.js — GitHub →
   poll/webhook → acquire commit → immutable snapshot → constitutional objects.
   The OBSERVE source a self-improvement loop needs. Constructor takes (postgresPool,
   objectRegistry, eventBus) — nothing instantiates it.
4. ping-runtime/approval/business_action_authority.js + effect_authority.js —
   CURRENT-design human approval: proposeAction → PENDING_HUMAN → decide →
   EffectAuthority.createEffect (canonical idempotent effect ids linking
   proposed_action→approval→effect). Required only by tests. No routes expose it.
5. gateway/self_improvement_loop.js — Loop skeleton (discover→analyze→generate→
   prioritize→schedule→execute→learn). BUT: header over-claims (patch/validation/
   replay/approval/commit appear ONLY in the header comment, lines 20/26/28);
   _analyzeRepository is CALLED (line 101) but never DEFINED → every cycle's analysis
   throws (caught per-repo). And it reaches into another service's _postgres.
   Valuable as a design sketch, not as code. Needs honest rewrite.
6. gateway/technology_authority.js — Phase 9.5 infra selection: immutable Technology
   Manifests, approved versions, compatibility matrix (Ollama/OpenAI/Claude/vLLM,
   PG/filesystem, Qdrant). Richer than live AIRuntime's flat provider Map.
7. gateway/adapter_compiler_v2.js — Manifest→IR→Generator→Compile→Replay→Hash
   equality→Witness→Freeze→Store. Deterministic codegen with replay proof.

## DUPLICATED (one must go; live winner named)
8. ping-runtime/agents/replay_worker.js — thin ReplayWorker (tx.outbox architecture).
   Zero references. Live winner: canonical_workers.js ReplayWorker.
9. ping-runtime/agents/base_worker.js — parallel BaseWorker (transactionBoundary).
   Zero references. Live winner: canonical_workers.js BaseWorker.
10. gateway/ollama_adapter.js — legacy Ollama adapter. Zero references.
    Live winner: ping-runtime/ai/ollama_provider.js (registered in AIRuntime at boot).

## SUPERSEDED (older generation, replaced)
11. gateway/approval_authority.js — Phase-21 approval. Superseded by
    ping-runtime/approval/business_action_authority.js.
12. gateway/witness_recorder.js, witness_registry.js, replay_verifier.js (and most
    gateway/replay_*.js, gateway/witness_*.js) — superseded by canonical
    WitnessWorker/ReplayWorker + kernel engine. (Some are referenced by OTHER legacy
    files like constitutional_runtime.js, step_registry.js — also unreachable from boot.)
13. ping-runtime/agents/distributed_desktop_agents.js, worker_port.js — superseded by
    WorkerRuntime + MissionScheduler.
14. ping-runtime/orchestration/index.js (ConstitutionalOrchestrator) — thin wrapper
    over ExecutionEngine; zero references.

## DEAD (never adopted, no replacement needed)
15. gateway/authority_container.js — Phase 21 DI container. Nothing ever used it.

## DANGEROUS (fix before any other work)
16. ExecutionEngine.startAutonomousLoop (ping-runtime/orchestration/execution/engine.js:579)
    SYNTHESIZES worker findings: `{findings:[{file:'x',line:0,bypass_type:'auto_scan',
    confidence:0.85}], confidence:0.85}` and feeds them to collectWorkerOutput →
    ConsensusEngine.evaluate. Reachable via authenticated POST /orchestration/engine/loop
    (gateway/routes/orchestration.js:272). Fabricated evidence with hardcoded confidence
    entering the consensus path. May have been a simulation stub; as wired it is a
    live evidence-fabrication primitive behind one auth check.

## CONVERGENCE CANDIDATE (parallel universe; salvage parts, retire rest)
17. ExecutionEngine universe — engine.js, consensus_engine.js, merge_gate.js,
    intelligence_graph.js, execution/context_authority.js,
    execution/artifact_authorities.js (Proposal/Patch/Consensus/MergeDecision/Replay/
    Witness artifacts), dormant_classifier.js, mission_compiler.js, scheduler.js,
    artifact_router.js, artifact_store.js, worker_state_machine.js, capability_registry.js,
    event_queue.js, execution/ollama_provider.js, execution/worker_port.js.
    REACHABLE from boot (instantiated :339, /orchestration mounted) but QUIESCENT:
    initializes, builds graph, classifies; dispatch/compile only via manual POSTs.
    Duplicates: EventQueue→UnifiedEventRuntime, Scheduler→MissionScheduler,
    WorkerStateMachine→WorkerRuntime, ArtifactStore→ping_events,
    execution/ollama_provider→ai/ollama_provider.
    SALVAGE: MergeGate (real code gates), DormantClassifier output
    (dormant_classifications/: 466 modules, 175 migrate / 56 resurrect candidates),
    ConsensusEngine.evaluate design, IntelligenceGraph builder.

## DORMANT (intentional — not an orphan)
18. IntelligenceWorker (canonical_workers.js) — eventTypes:[] with documented
    re-enablement conditions (Ollama wired + duplication ruling). Do not touch.
