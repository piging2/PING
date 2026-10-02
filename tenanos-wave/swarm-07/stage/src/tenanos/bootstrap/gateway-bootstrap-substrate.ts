/**
 * gateway-bootstrap-substrate.ts
 *
 * Machine-readable record of the SWARM-07 gateway/bootstrap execution substrate
 * investigation (TenantOS autonomous-convergence wave, 2026-09-23).
 *
 * Traces how the PING gateway bootstraps execution (runtime init, route wiring,
 * capability exposure) from the captured substrate
 * (`gateway/bootstrap/gateway_runtime.js`, class GatewayRuntime) and records the
 * reuse-vs-replace verdicts the TenantOS autonomous mission loop must honor.
 *
 * Evidence pointers are repo-relative to the harvest checkout
 * (/home/nolan/ping, branch refactor/runtime-authority-convergence) unless
 * marked otherwise. Engine-classification evidence is CONSUMED from
 * swarm-02/ENGINE-INVENTORY.md (SWARM-02 owns the ORCA mission engine lane;
 * this file does not re-investigate authority).
 *
 * Binding invariants for any TenantOS gateway bootstrap:
 *   1. Single event writer: UnifiedEventRuntime is the only journal writer.
 *   2. Single execution decider: WorkerRuntime.dispatch() (eventTypes match).
 *      Labeling maps (MISSION_WORKER_MAP) are not deciders.
 *   3. Degraded-mode contract: a failed PG probe never half-wires PG services;
 *      PG-gated routes serve 503 stubs; always-on routes stay live.
 *   4. Ingestion boundary: producer events pass CanonicalizationService
 *      (namespace resolved before persistence).
 *   5. Orca ollama discovery stays DISABLED until an explicit convergence
 *      decision (in-repo DOC-CONTRACT).
 *   6. ACK != EFFECT, RESULT != VERIFIED OUTCOME, RETRY != IDEMPOTENCY at
 *      every tool effect; UNKNOWN side-effect semantics fail closed.
 *   7. No second orchestrator, event authority, or capability system.
 */

export const BOOTSTRAP_SUBSTRATE_VERSION = '2026-09-23.1';

/** Closed verdict set for the convergence classification (wave directive 1). */
export type ComponentVerdict =
  | 'KEEP'
  | 'PROPAGATE'
  | 'REFACTOR'
  | 'REPLACE'
  | 'DROP';

/** Route availability tier under the degraded-mode contract. */
export type RouteTier = 'ALWAYS_ON' | 'PG_GATED' | 'CONDITIONAL';

/** Boot phase in GatewayRuntime._initializeServices. */
export interface BootPhase {
  id: string;
  order: number;
  /** What gates this phase from running. */
  gate: string;
  /** Degraded-mode behavior when the gate fails. */
  onGateFailure: string;
  /** Service classes initialized in this phase (evidence pointers in notes). */
  services: string[];
}

export interface RouteWiring {
  path: string;
  tier: RouteTier;
  note: string;
}

export interface BootstrapComponent {
  id: string;
  verdict: ComponentVerdict;
  /** Repo-relative evidence pointer in the harvest checkout. */
  source: string;
  rationale: string;
  /** Wave lane that owns the follow-up, if this verdict needs one. */
  owner?: string;
}

export interface BootInvariant {
  id: string;
  statement: string;
  basis: string;
}

/**
 * The three boot phases. Phase order is load-bearing: filesystem-only
 * services (Phase 2) must never depend on Postgres; PG-dependent services
 * (Phase 3) must never initialize when the Phase 1 probe fails.
 */
export const BOOT_PHASES: readonly BootPhase[] = Object.freeze([
  {
    id: 'phase-1-pg-probe',
    order: 1,
    gate: 'pg pool SELECT 1 succeeds within 3000ms',
    onGateFailure:
      'degraded mode: all Phase 3 services skipped; Phase 2 and always-on routes stay live; PG-gated routes serve 503 stubs',
    services: ['pg.Pool (default database crx, configurable via POSTGRES_*)'],
  },
  {
    id: 'phase-2-filesystem-only',
    order: 2,
    gate: 'none (always runs)',
    onGateFailure: 'n/a',
    services: [
      'GenerationManifestLoader + GeneratedArtifactLoader + CompilerCompatibility + runtime artifact hash',
      'WorkflowExecutor, EventValidator, CapabilityResolver, DeploymentLoader, StateMachineExecutor',
      'DriftDetector + RuntimeFingerprint',
      'IntegrationManager (posthog, email, sms) + EventGovernance + AnalyticsPolicy',
      'AIRuntime (ollama provider) + OllamaProvider',
      'GoogleConnector + ConnectorRegistry (5 connectors) + OAuthFlowManager + TokenStore + CapabilityRegistry',
      'ExecutionEngine (Orca) with discoverOllama=false (DOC-CONTRACT KEEP-DISABLED)',
    ],
  },
  {
    id: 'phase-3-pg-dependent',
    order: 3,
    gate: 'phase-1 probe succeeded',
    onGateFailure: 'entire phase skipped; pgAvailable=false flips route wiring to degraded stubs',
    services: [
      'EventReadAuthority + RepositoryStore + GatewayToKernelAdapter (PATCH_001 layer separation)',
      'PostgresAdapter (crx_runtime) + CanonicalEventEnvelope + ProducerEventPort (lazy UER resolution)',
      'TenantRegistry + DeploymentRegistry + RuntimeRegistry + SystemAuthority',
      'HuggingFaceAdapter + AIWorkspaceAuthority + ReviewAuthority + CustomerAuthority + ProjectAuthority',
      'UnifiedEventRuntime (frozen legacyIngressCapability, MC-1 narrow exception)',
      'CanonicalizationService (namespace map; tenant::hpp default for business sources)',
      'LegacyIngressAdapter (poll 5s, batch 50; converges canonical_events into ping_events)',
      'KnowledgeGraph + MissionRuntime + WorkerRuntime + Neo4jAdapter + QdrantAdapter',
      'EmbeddingService (fail-scoped: init failure disables only the async Qdrant projection)',
      'registerCanonicalWorkers (8 canonical workers; intelligence dormant; ReplayWorker wired to kernel replay provider)',
      'EvidenceAuthority + HybridSearch',
      'DeadLetterAuthority (injected into scheduler; previously unreachable, now wired)',
      'MissionScheduler (poll 5s, maxConcurrent 3, DLQ on exhaustion)',
      'Business emitters via CanonicalizationService + EventToMissionBridge',
      'Graph projection subscriptions (candidate status, human-approval promotion gate)',
      'Deterministic seed events (only when ping_events is empty)',
    ],
  },
]);

/**
 * Route wiring tiers from GatewayRuntime._mountRoutes. The tiering is the
 * degraded-mode contract made concrete: Tier ALWAYS_ON never depends on PG;
 * Tier PG_GATED has an explicit 503 stub in degraded mode; Tier CONDITIONAL
 * mounts only when its backing service initialized.
 */
export const ROUTE_WIRING: readonly RouteWiring[] = Object.freeze([
  { path: '/api/v1/ollama', tier: 'ALWAYS_ON', note: 'AI runtime; no PG dependency' },
  { path: '/health', tier: 'ALWAYS_ON', note: 'healthAuthority checks' },
  { path: '/constitution', tier: 'ALWAYS_ON', note: 'filesystem only' },
  { path: '/runtime/fingerprint', tier: 'ALWAYS_ON', note: 'filesystem only' },
  { path: '/ops', tier: 'ALWAYS_ON', note: 'operational intelligence; per-service checks report not_initialized when absent' },
  { path: '/governance', tier: 'ALWAYS_ON', note: 'filesystem only (EventGovernance)' },
  { path: '/ai', tier: 'ALWAYS_ON', note: 'AI runtime; no PG dependency' },
  { path: '/connectors', tier: 'ALWAYS_ON', note: 'connector + capability registry + OAuth manager' },
  { path: '/mc', tier: 'ALWAYS_ON', note: 'mission control; handles null services gracefully' },
  { path: '/events', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/context', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/api/v1/repository', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/system', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/canonical-events', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/tenants', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/deployments', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/runtime', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/ingest', tier: 'PG_GATED', note: '503 stub in degraded mode' },
  { path: '/ai-workspace', tier: 'CONDITIONAL', note: 'mounted only when aiWorkspaceAuthority initialized' },
  { path: '/reviews', tier: 'CONDITIONAL', note: 'mounted only when reviewAuthority initialized' },
  { path: '/customers', tier: 'CONDITIONAL', note: 'mounted only when customerAuthority initialized' },
  { path: '/projects', tier: 'CONDITIONAL', note: 'mounted only when projectAuthority initialized' },
  { path: '/orchestration', tier: 'CONDITIONAL', note: 'mounted only when executionEngine initialized' },
  { path: '/knowledge', tier: 'CONDITIONAL', note: 'mounted only when knowledgeGraph initialized' },
  { path: '/missions', tier: 'CONDITIONAL', note: 'mounted only when missionRuntime initialized' },
]);

/**
 * Convergence classification of bootstrap-visible components.
 * Engine-lane verdicts (swarm-02/ENGINE-INVENTORY.md) are consumed by
 * reference; this table records the BOOTSTRAP-level consequence.
 */
export const COMPONENT_VERDICTS: readonly BootstrapComponent[] = Object.freeze([
  {
    id: 'unified-event-runtime',
    verdict: 'KEEP',
    source: 'ping-runtime/events/unified_event_runtime.js:21',
    rationale:
      'Single event writer: deterministic sha256 event_id, governance gate, fail-closed without pool, ON CONFLICT semantic-collision detection. The canonical journal; no second writer may exist.',
  },
  {
    id: 'mission-runtime',
    verdict: 'KEEP',
    source: 'ping-runtime/orchestration/mission_runtime.js:12',
    rationale:
      'Durable ping_missions with conditional transitions (created/assigned/running/completed/failed), 60s claim leases, retry backoff. Mission-level durability is proven.',
    owner: 'swarm-02 (gaps G-01 attempt identity, G-03 emit ordering tracked separately)',
  },
  {
    id: 'mission-scheduler',
    verdict: 'KEEP',
    source: 'ping-runtime/orchestration/mission_scheduler.js:82',
    rationale:
      'Poll loop (5s), maxConcurrent 3, lease renewal + reaping arrows, dispatch-result branching (phantom-complete prevention), DeadLetterAuthority on exhaustion.',
    owner: 'swarm-02 (gap G-02 hung dispatch, no timeout)',
  },
  {
    id: 'worker-runtime',
    verdict: 'KEEP',
    source: 'ping-runtime/workers/worker_runtime.js:14',
    rationale:
      'Dispatch-only mode; the single canonical execution decider (P3 audit A). Worker poll loop disabled by design to prevent dual input paths.',
  },
  {
    id: 'canonical-workers',
    verdict: 'KEEP',
    source: 'ping-runtime/workers/canonical_workers.js:673',
    rationale:
      '8 canonical workers (observation, claim, classification, recommendation, projection, replay, witness, lineage); intelligence dormant (empty eventTypes). BaseWorker fail-closed emit preserves namespace/correlation/causation. ReplayWorker wired to the kernel replay provider.',
  },
  {
    id: 'event-to-mission-bridge',
    verdict: 'KEEP',
    source: 'ping-runtime/orchestration/event_to_mission_bridge.js:72',
    rationale:
      'Intent-to-mission ingress: 30 business/worker event types map to mission types with canonicalPriority normalization at the single ingress boundary; creates missions only, never mutates state.',
  },
  {
    id: 'canonicalization-service',
    verdict: 'KEEP',
    source: 'gateway/bootstrap/gateway_runtime.js (Phase 3: Canonicalization Service)',
    rationale:
      'Single public ingestion boundary: namespace resolved before persistence; business sources default to tenant::hpp. All business emitters route through it, never the event runtime directly.',
  },
  {
    id: 'producer-event-port',
    verdict: 'KEEP',
    source: 'gateway/bootstrap/gateway_runtime.js (Phase 7 producer event handle)',
    rationale:
      'Classifies producer event types and routes along the converged seam (direct UER acceptance for registered/mapped types); lazy UER resolution breaks the construction cycle.',
  },
  {
    id: 'dead-letter-authority',
    verdict: 'KEEP',
    source: 'gateway/dead_letter_authority.js:56',
    rationale:
      'Exhaustion sink (repository_dead_letters); now injected into the scheduler after being permanently unreachable. Exhausted retries must land here, never vanish.',
  },
  {
    id: 'gateway-to-kernel-adapter',
    verdict: 'KEEP',
    source: 'runtime/kernel/gateway_adapter (PATCH_001)',
    rationale:
      'Gateway communicates with the kernel through the adapter interface, preserving layer separation and constitutional ownership.',
  },
  {
    id: 'degraded-boot-tiers',
    verdict: 'KEEP',
    source: 'gateway/bootstrap/gateway_runtime.js (_initializeServices, _mountRoutes)',
    rationale:
      'PG probe decides the service set; Phase 2 always runs; PG-gated routes serve explicit 503 stubs in degraded mode. A failed probe never half-wires PG services.',
  },
  {
    id: 'bridge-cursor-checkpoints',
    verdict: 'PROPAGATE',
    source: 'ping-runtime/events/event_bridge.js:20',
    rationale:
      'Consumer-offset checkpointing (ping_bridge_cursors) is the proven pattern any attempt-level checkpointing must copy (swarm-02 gap G-05).',
    owner: 'swarm-02',
  },
  {
    id: 'frozen-capability-object',
    verdict: 'PROPAGATE',
    source: 'gateway/bootstrap/gateway_runtime.js (legacyIngressCapability, MC-1)',
    rationale:
      'Narrow authority exceptions are minted once as frozen objects and granted on object-identity match only; the pattern generalizes to any future narrow exception.',
  },
  {
    id: 'seed-only-if-empty',
    verdict: 'PROPAGATE',
    source: 'gateway/bootstrap/gateway_runtime.js (_seedBusinessEvents)',
    rationale:
      'Deterministic seed events run only when the journal is empty; idempotent by construction. The shape TenantOS tenant seeding must copy.',
  },
  {
    id: 'knowledge-candidate-gate',
    verdict: 'PROPAGATE',
    source: 'gateway/bootstrap/gateway_runtime.js (Graph Projection subscriptions)',
    rationale:
      'Event projections enter the knowledge graph as status=candidate with assessed confidence; only explicit human approval promotes. No unverified projection may skip the gate.',
  },
  {
    id: 'drift-fingerprint-boot-health',
    verdict: 'PROPAGATE',
    source: 'gateway/bootstrap/gateway_runtime.js (DriftDetector, RuntimeFingerprint)',
    rationale:
      'Boot-time drift detection and runtime fingerprinting surface generated-artifact and platform drift as warnings, not silent state.',
  },
  {
    id: 'gateway-runtime-god-class',
    verdict: 'REFACTOR',
    source: 'gateway/bootstrap/gateway_runtime.js (GatewayRuntime)',
    rationale:
      'One class threads ~40 service locals through _initializeServices and _mountRoutes. Split into phase modules (probe, filesystem services, pg services, route wiring) with the same observable boot order. Behavior-preserving.',
    owner: 'swarm-07 (eligible wave work)',
  },
  {
    id: 'complete-emit-ordering',
    verdict: 'REFACTOR',
    source: 'ping-runtime/orchestration/mission_runtime.js:146 (swarm-02 gap G-03)',
    rationale:
      'Row transitions to completed before MISSION_COMPLETED is emitted; a failed emit leaves row truth and journal truth divergent. Emit-before-transition or a reconciler.',
    owner: 'swarm-02 (P-20260923-005 proposed)',
  },
  {
    id: 'effect-authority-unwired',
    verdict: 'REFACTOR',
    source: 'ping-runtime/approval/effect_authority.js (swarm-02 section 2a)',
    rationale:
      'Effect ledger exists but is unwired and in-memory by default. Needs durable PG backing and wiring into the retry path (the missing half of UNKNOWN_EXECUTION reconciliation).',
    owner: 'swarm-02 (P-20260923-005 proposed)',
  },
  {
    id: 'orca-synthetic-autonomous-loop',
    verdict: 'REPLACE',
    source: 'ping-runtime/orchestration/execution/engine.js:579 (startAutonomousLoop)',
    rationale:
      'Fabricates worker output inline with hardcoded 0.85 confidence and feeds it through collectWorkerOutput into consensus and report percentages (verified live 2026-09-23). The autonomous mission loop must run the live spine (MissionScheduler + WorkerRuntime + durable missions), not a synthetic loop. Engine compile/dispatch tooling is retained as engine ops, not mission authority.',
    owner: 'swarm-02 / coordinator (swarm-08 P-20260923-084 filed)',
  },
  {
    id: 'orchestration-missions-reads',
    verdict: 'REPLACE',
    source: 'gateway/routes/orchestration.js (GET /orchestration/missions*)',
    rationale:
      'Serves the engine in-memory session array; canonical mission state is ping_missions via MissionRuntime (/missions, /mc/missions). Two mission counts means no single truth.',
    owner: 'swarm-08 (P-20260923-083 filed)',
  },
  {
    id: 'engine-session-report-counts',
    verdict: 'REPLACE',
    source: 'ping-runtime/orchestration/execution/engine.js (getReport)',
    rationale:
      'Closure/velocity percentages computed over the session array fed by the synthetic loop. Counts must come from canonical ping_missions.',
    owner: 'swarm-08 (P-20260923-082 filed)',
  },
  {
    id: 'temporal-mission-workflow',
    verdict: 'DROP',
    source: 'ping-runtime/temporal/workflows/mission_workflow.js',
    rationale:
      'Full second execution path, dormant (only self-references). Violates the no-second-orchestrator absolute constraint. Keep file as-is; never wire.',
  },
  {
    id: 'dormant-execution-classes',
    verdict: 'DROP',
    source: 'ping-runtime/orchestration/execution/{scheduler,event_queue,worker_state_machine}.js',
    rationale:
      'Zero production importers (doc-generator references only). Dormant competing machinery; do not propagate.',
  },
  {
    id: 'legacy-dispatcher-registry',
    verdict: 'DROP',
    source: 'ping-runtime/orchestration/dispatcher.js, worker_registry.js',
    rationale:
      'Legacy analysis/planning tooling, not the live dispatch path. Out of the engine story.',
  },
  {
    id: 'orca-ollama-discovery',
    verdict: 'DROP',
    source: 'gateway/bootstrap/gateway_runtime.js (discoverOllama:false DOC-CONTRACT)',
    rationale:
      'Parallel Ollama worker pool would contradict single-owner convergence (live spine inference owner is AIRuntime + ollama_provider; worker-identity decider is WorkerRuntime.dispatch). Keep DISABLED until an explicit Orca-vs-live-spine convergence decision; never enable silently.',
  },
]);

/** Binding boot invariants for any TenantOS gateway bootstrap. */
export const BOOT_INVARIANTS: readonly BootInvariant[] = Object.freeze([
  {
    id: 'INV-SINGLE-EVENT-WRITER',
    statement: 'UnifiedEventRuntime is the only writer to the canonical journal.',
    basis: 'swarm-02/ENGINE-INVENTORY.md 1a; wave absolute constraint (no second event authority)',
  },
  {
    id: 'INV-SINGLE-EXECUTION-DECIDER',
    statement: 'WorkerRuntime.dispatch() is the single execution decider; labeling maps are not deciders.',
    basis: 'mission_scheduler.js DOC-CONTRACT (P3 audit A)',
  },
  {
    id: 'INV-DEGRADED-CONTRACT',
    statement: 'A failed PG probe never half-wires PG services; PG-gated routes serve 503 stubs; always-on routes stay live.',
    basis: 'gateway_runtime.js _initializeServices / _mountRoutes',
  },
  {
    id: 'INV-INGESTION-BOUNDARY',
    statement: 'Every observation, command, artifact, and event canonicalizes through CanonicalizationService before it exists; namespace is resolved before persistence.',
    basis: 'gateway_runtime.js (Canonicalization Boundary)',
  },
  {
    id: 'INV-NO-SYNTHETIC-LOOP',
    statement: 'The autonomous mission loop executes real missions from durable state; no fabricated worker output, no hardcoded confidence.',
    basis: 'engine.js startAutonomousLoop verification 2026-09-23; wave directive 5 (RESULT != VERIFIED OUTCOME)',
  },
  {
    id: 'INV-FAIL-CLOSED-EFFECTS',
    statement: 'ACK != EFFECT, RESULT != VERIFIED OUTCOME, RETRY != IDEMPOTENCY; UNKNOWN side-effect semantics fail closed for autonomous mutation.',
    basis: 'wave standing directive 5',
  },
  {
    id: 'INV-NO-SECOND-ORCHESTRATOR',
    statement: 'No second orchestrator, event authority, or capability system under src/tenanos.',
    basis: 'wave absolute constraint; INTEGRATION-PLAYBOOK.md',
  },
  {
    id: 'INV-ORCA-DISCOVERY-DISABLED',
    statement: 'Orca ollama discovery stays disabled until an explicit Orca-vs-live-spine convergence decision.',
    basis: 'gateway_runtime.js DOC-CONTRACT (KEEP-DISABLED)',
  },
]);

/**
 * The autonomous mission loop the TenantOS gateway must bootstrap: the live
 * spine the loop REUSES, and what it REPLACES. This is the SWARM-07 verdict.
 */
export const MISSION_LOOP_VERDICT = Object.freeze({
  reuse: Object.freeze([
    'unified-event-runtime',
    'canonicalization-service',
    'producer-event-port',
    'event-to-mission-bridge',
    'mission-runtime',
    'mission-scheduler',
    'worker-runtime',
    'canonical-workers',
    'dead-letter-authority',
    'gateway-to-kernel-adapter',
  ]),
  replace: Object.freeze([
    'orca-synthetic-autonomous-loop',
    'orchestration-missions-reads',
    'engine-session-report-counts',
  ]),
});
