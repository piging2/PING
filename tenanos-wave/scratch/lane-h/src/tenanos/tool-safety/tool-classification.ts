/**
 * tool-classification.ts
 *
 * Typed registry of tool/callable side-effect semantics for autonomous workers.
 * Source of truth: SWARM-04 TOOL-CLASSIFICATION.md (2026-09-23), observed
 * against snapshot 43a6cd2e4 (UNVERIFIED-ON-BRANCH; see evidence strings).
 *
 * The branch's actual tool plane (tenanos-wave-gateway/integration) is
 * gateway/tool_authority.js (executeTool at line 134; default tools file-read /
 * file-write / code-search / artifact-query registered at lines 192 / 209 /
 * 230 / 251) plus gateway/tool_gateway.js (executeTool at line 102).
 * There is NO capability_authority.js, NO routes/capabilities.js, NO
 * GET /discover catalog, and NO authorize()/deniedPaths/maxFileSize gate on
 * this branch. Evidence strings below are either branch-verified (file:line on
 * the integration ref) or explicitly marked UNVERIFIED-ON-BRANCH.
 *
 * Standing law encoded here:
 *   ACK != EFFECT, RESULT != VERIFIED OUTCOME, RETRY != IDEMPOTENCY.
 *   UNKNOWN fails closed for autonomous mutation, no exceptions.
 *
 * This module is pure data plus derived policy lookups. It performs no I/O
 * and grants no authority; the fail-closed-guard.ts module enforces it.
 */

export const CLASSIFICATION_VERSION = '2026-09-24.1-rebased';

export type EffectClass =
  | 'READ_ONLY'
  | 'REVERSIBLE_EFFECT'
  | 'IDEMPOTENT_EFFECT'
  | 'NON_IDEMPOTENT_EFFECT'
  | 'CONSEQUENTIAL_EFFECT'
  | 'UNKNOWN';

export type ToolPlane = 'capability' | 'http' | 'worker-cli' | 'internal';

/**
 * Retry policy derived from the effect class:
 * - 'free': retry is safe (no observable duplicate effect).
 * - 'same-key': retry only with the identical idempotency key AND unchanged
 *   pre-state (RETRY != IDEMPOTENCY: the key alone is not proof).
 * - 'reconcile-first': never retry blind; re-observe state, compare against
 *   intent, then decide proceed / skip-as-done / escalate.
 * - 'forbidden': no autonomous retry, ever.
 */
export type RetryPolicy = 'free' | 'same-key' | 'reconcile-first' | 'forbidden';

export interface ToolClassification {
  /** Stable identifier, e.g. 'fs.write' or 'http.tenants'. */
  id: string;
  plane: ToolPlane;
  effectClass: EffectClass;
  /**
   * Agent profiles / roles granted this tool. Empty = nobody.
   * NOTE: 'muse' / 'muse-level-2' are the registry's own role model (from
   * SWARM-04 provenance); they are not branch concepts (zero matches on the
   * integration ref). The branch permission model is mission/authority-scoped
   * (gateway/tool_authority.js:109-122), and fails OPEN when no permission
   * authority is configured.
   */
  grantedTo: readonly string[];
  /** Code-level evidence, file:line style. */
  evidence: string;
  retryPolicy: RetryPolicy;
  /** True when autonomous dispatch needs an explicit confirmation step. */
  requiresConfirmation: boolean;
  /** True when the advertised catalog description does not match the implementation. */
  schemaDrift?: boolean;
  notes?: string;
}

function entry(e: ToolClassification): ToolClassification {
  return e;
}

/**
 * The 20 SWARM-04-classified capabilities (the original header said 21, but the
 * table lists 20; observed against snapshot 43a6cd2e4; POST /capabilities and
 * GET /discover do not exist on this branch, so the whole block is
 * UNVERIFIED-ON-BRANCH). Retained as a fail-closed registry:
 */
const CAPABILITIES: readonly ToolClassification[] = [
  entry({
    id: 'fs.list',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no fs.list capability exists on this branch. Closest: gateway/tool_authority.js:192 registers file-read; gateway/filesystem_authority.js:110 _scanRepository is a compile-cache scanner, not a capability dispatch.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'fs.read',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no fs.read capability; closest is gateway/tool_authority.js:192 (file-read). Branch _fileReadImplementation (tool_authority.js:283) is a placeholder with no size gate; no authorize()/maxFileSize/deniedPaths exists on the branch. _checkToolPermission fails OPEN without a permission authority (tool_authority.js:109-113).',
    retryPolicy: 'free',
    requiresConfirmation: false,
    notes:
      'UNVERIFIED-ON-BRANCH: no size gate exists on the branch; _fileReadImplementation is a placeholder. REFACTOR (if a real read path lands): stat the file server-side.'
  }),
  entry({
    id: 'fs.write',
    plane: 'capability',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no fs.write capability; closest is gateway/tool_authority.js:209 (file-write). Branch _fileWriteImplementation (tool_authority.js:295) is a placeholder: no writeFileSync evidence, no atomicity or expected-hash precondition on the branch.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'Torn write on crash; retry with different content destroys data. RETRY != IDEMPOTENCY.',
  }),
  entry({
    id: 'fs.patch',
    plane: 'capability',
    effectClass: 'UNKNOWN',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no fs.patch capability; the phantom caller (capability_authority.js:605) does not exist on this branch. Branch-verified: gateway/patch_authority_v2.js:273 createPatch(missionId, agentId, patchData).',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    schemaDrift: true,
    notes:       'Advertised-but-broken per SWARM-04 (UNVERIFIED-ON-BRANCH: no discover catalog and no fs.patch caller on this branch). Retained: UNKNOWN -> fail closed.'
  }),
  entry({
    id: 'repo.inspect',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no repo.inspect capability. Branch-verified: gateway/repository_authority.js:165 getRepositoryRoot(repoId) (authority method, not a capability route).',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.status',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.status capability. Branch-verified: gateway/simple_git_adapter.js:73 getStatus() (adapter method, not a capability route).',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.diff',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.diff capability; gateway/simple_git_adapter.js exposes no diff method.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.log',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.log capability. Closest: gateway/simple_git_adapter.js:55 getRecentCommits(limit) (adapter method, not a capability route).',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.branch',
    plane: 'capability',
    effectClass: 'UNKNOWN',
    grantedTo: ['muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.branch capability on this branch; the catalog-vs-implementation drift claim (phantom capability_authority.js:655-661) cannot be re-verified because the caller does not exist on the branch. schemaDrift retained on SWARM-04 provenance.',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    schemaDrift: true,
    notes:
      'UNVERIFIED-ON-BRANCH: no git.branch capability on this branch, so there is no catalog claim to trust here; retained on SWARM-04 provenance as UNKNOWN.',
  }),
  entry({
    id: 'git.checkout',
    plane: 'capability',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: ['muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.checkout capability; gateway/simple_git_adapter.js exposes no checkout method.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'Changes working-tree state; uncommitted work context can be stranded.',
  }),
  entry({
    id: 'git.commit',
    plane: 'capability',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: ['muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.commit capability. Closest: gateway/commit_authority.js:174-175 is a placeholder ("in production, use actual git add"); no branch-verified worktree-commit dispatch.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'git add . sweeps in files the worker never named. REFACTOR: scope to explicit paths.',
  }),
  entry({
    id: 'git.push',
    plane: 'capability',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence:
      'UNVERIFIED-ON-BRANCH: no git.push capability. Policy: CAPABILITY-MATRIX-2026-09-23.md default-deny (§1 preamble "Every role starts with NOTHING") + §1.3 PROHIBITED EFFECTS ("pushing to any remote") + §1.4 ("git push" prohibited); see cli.git-push.',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'Correctly fail-closed. KEEP disabled.',
  }),
  entry({
    id: 'process.list',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no process.list capability. Branch-verified: ping-runtime/runtime/runtime_registry.js:140 executeListComponents (registry method, not a capability route).',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'service.inspect',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no service.inspect capability. Branch-verified: ping-runtime/runtime/runtime_registry.js:123 executeResolveComponent.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'logs.read',
    plane: 'capability',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence:
      'UNVERIFIED-ON-BRANCH: no logs.read capability and no NOT_IMPLEMENTED marker verifiable on this branch. Retained: UNKNOWN -> fail closed (KEEP disabled).',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'KEEP disabled.',
  }),
  entry({
    id: 'knowledge.search',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no knowledge.search capability. Branch-verified: ping-runtime/knowledge/knowledge_graph.js:167 queryNodes.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'event.search',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'UNVERIFIED-ON-BRANCH: no event.search capability. Branch-verified: ping-runtime/events/unified_event_runtime.js:224 query.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'command.run',
    plane: 'capability',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence:
      'UNVERIFIED-ON-BRANCH: no command.run capability; no _routeExecution or policy-scoping code on this branch. KEEP disabled until policy scoping exists.',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
  entry({
    id: 'test.run',
    plane: 'capability',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence:
      'UNVERIFIED-ON-BRANCH: no test.run capability; no branch-verified execution plane for it. KEEP disabled until policy scoping exists.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
  entry({
    id: 'build.run',
    plane: 'capability',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence:
      'UNVERIFIED-ON-BRANCH: no build.run capability; no branch-verified execution plane for it. KEEP disabled until policy scoping exists.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
];

/**
 * Unauthenticated HTTP mutation surfaces (fail-open) on the gateway.
 * Evidence (branch-verified on tenanos-wave-gateway/integration):
 * gateway/bootstrap/gateway_runtime.js mounts the routers with NO auth
 * middleware (verified: _setupMiddleware installs only express.json and a
 * CORS logger, lines 116-125; zero auth-middleware references in the file
 * or in any gateway/routes/*.js). Listens on 0.0.0.0 (line 820; 8080 is the
 * documented deployment port per CAPABILITY-MATRIX-2026-09-23.md topology,
 * not branch code). Mount lines: /context:684 /api/v1/repository:685
 * /system:686 /tenants:688 /deployments:689 /runtime:690 /constitution:706
 * /ops:763 /governance:777 /ai-workspace:781 /reviews:784 /customers:787
 * /projects:790 (degraded 503 stubs when PG is unavailable, :694-702).
 * GET /tenants unauthenticated -> HTTP 200 was live-verified 2026-09-23
 * against a running gateway (operational observation, not re-verifiable
 * from the ref).
 * This is the wave's P0 tool-safety finding; reported, not silently diffed.
 */
const HTTP_SURFACES: readonly ToolClassification[] = [
  entry({
    id: 'http.tenants',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence:
      'gateway/bootstrap/gateway_runtime.js:688 mounts without auth (verified: no auth middleware in file or any route file); gateway/routes/tenants.js:19/58/66/72 (POST register, PUT /:id, DELETE /:id, POST /:id/heartbeat). LIVE: GET /tenants -> HTTP 200 no auth (2026-09-23, operational observation).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST register, PUT /:id, DELETE /:id, POST /:id/heartbeat. Tenant registry is the TenantOS identity root; unauthenticated DELETE removes a tenant.',
  }),
  entry({
    id: 'http.deployments',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:689 mounts without auth; gateway/routes/deployments.js:69/77/85 (POST /:id/complete, /:id/fail, /:id/rollback).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST create, /:id/complete, /:id/fail, /:id/rollback. Class F (release) ops with zero auth; contradicts standing law that NO role may release.',
  }),
  entry({
    id: 'http.runtime',
    plane: 'http',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:690 mounts without auth; gateway/routes/runtime.js:20 (POST register), :79 (POST heartbeat).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST register, POST heartbeat. Forged heartbeat/component registration poisons the component inventory workers read.',
  }),
  entry({
    id: 'http.reviews',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:784 mounts without auth; gateway/routes/reviews.js:18 (POST /sync), :81 (POST /:id/reply).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /sync, POST /:id/reply. Reply posts are EXTERNAL effects (customer-facing text), unauthenticated.',
  }),
  entry({
    id: 'http.customers',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:787 mounts without auth; gateway/routes/customers.js:24 (POST /import), :164 (POST /), :47 (POST /:id/sync-email), :73 (POST /:id/sync-calendar).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /import, POST /, POST /:id/sync-email, POST /:id/sync-calendar. Customer PII ingestion + external sync triggers, unauthenticated.',
  }),
  entry({
    id: 'http.projects',
    plane: 'http',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:790 mounts without auth; gateway/routes/projects.js:20 (POST /), :61 (POST /:id/artifacts).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /, POST /:id/artifacts. Unauthenticated project/artifact creation.',
  }),
  entry({
    id: 'http.ai-workspace',
    plane: 'http',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:781 mounts without auth; gateway/routes/ai_workspace.js:22/35/51/64/77 (POST /sentiment, /tag, /parse, /translate, /summarize).',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /sentiment, /tag, /parse, /translate, /summarize. Unauthenticated compute (resource abuse, prompt-injection surface into AI pipelines).',
  }),
  entry({
    id: 'http.context-system',
    plane: 'http',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:684 (/context), :686 (/system), :685 (/api/v1/repository) mount without auth; full method audit deferred to swarm-15 (red team)',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'UNKNOWN -> fail closed.',
  }),
  entry({
    id: 'http.ops-governance',
    plane: 'http',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: 'gateway/bootstrap/gateway_runtime.js:763 (/ops), :777 (/governance), :706 (/constitution): no auth observed at mount; needs per-route audit',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'UNKNOWN -> fail closed.',
  }),
];

/**
 * Worker CLI tools (capability-matrix classes, not the gateway).
 * Evidence: ~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md
 * section 1 (doc verified present locally 2026-09-24; section anchors added
 * per entry below).
 */
const WORKER_CLI: readonly ToolClassification[] = [
  entry({
    id: 'cli.git-mirror',
    plane: 'worker-cli',
    effectClass: 'IDEMPOTENT_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.3 GITHUB_INGESTER: clone/fetch/pull unauthenticated with conditional requests; cache content-addressed, writes are idempotent fetches.',
    retryPolicy: 'same-key',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.git-push',
    plane: 'worker-cli',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: default-deny posture (§1 preamble "Every role starts with NOTHING"); §1.3 PROHIBITED EFFECTS ("pushing to any remote"); §1.4 IMPLEMENTER PROHIBITED EFFECTS ("git push").',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'PROHIBITED for all roles, standing law.',
  }),
  entry({
    id: 'cli.build',
    plane: 'worker-cli',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.4 IMPLEMENTER: bounded builds ("npm run build", "tsc", etc.) with wall-clock and CPU/memory caps, inside the worktree.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.test',
    plane: 'worker-cli',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.7 TESTER: test runners with strict timeouts and resource caps; each run hermetic (fresh scratch DB); kill-switch on timeout; scratch DBs only (PIG ping-test-pg). Doc names generic test runners, not jest/vitest.',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.docker-read',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10 OBSERVABILITY_WORKER: docker logs, docker inspect, docker events; PROHIBITED: restarts ("docker restart"), exec with write effects.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.curl-plane',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10: read-only CLI probes (docker, curl, psql SELECT); §1.9: observe/verify is Access Class A. ("Class A receipted" is the registry gloss.)',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.psql-select',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10 OBSERVABILITY_WORKER: SELECT-only, whitelisted read queries (counts, latest timestamps, ledger versions); no direct writes, ever. §1.7: scratch DBs only.',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.ssh',
    plane: 'worker-cli',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: ['human-operators-only'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: no role lists SSH (default-deny §1 preamble); §5.1 documents SSH access mechanics (key auth via pig-config, oracle-ssh.sh). Derived: workers never hold it; human-operated only.',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'Workers never hold ssh credentials.',
  }),
];

/**
 * Internal-only: Temporal activities are thin wrappers around authorities,
 * invoked in-process by the worker runtime. NOT exterior-reachable.
 * Exterior dispatch is denied (UNKNOWN -> fail closed); KEEP as-is.
 */
const INTERNAL: readonly ToolClassification[] = [
  entry({
    id: 'internal.temporal-activities',
    plane: 'internal',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: 'gateway/activities/index.js exports exactly six activities (mission, replay, repository, compiler, knowledge, reflection); sole consumer is gateway/bootstrap/wiring.js:141 (activitiesPath of the in-process TemporalRuntime); no exterior route mounts activities',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'Not reachable by exterior autonomous workers. No second activity system may be created.',
  }),
];

const ALL: readonly ToolClassification[] = [
  ...CAPABILITIES,
  ...HTTP_SURFACES,
  ...WORKER_CLI,
  ...INTERNAL,
];

const BY_ID: ReadonlyMap<string, ToolClassification> = new Map(ALL.map((t) => [t.id, t]));

/** Look up a tool's classification. Returns undefined for unclassified tools. */
export function classify(toolId: string): ToolClassification | undefined {
  return BY_ID.get(toolId);
}

/** The full registry, for audits and worker capability briefs. */
export function allClassifications(): readonly ToolClassification[] {
  return ALL;
}

/** Retry policy for a tool id. Unclassified ids -> 'forbidden' (fail closed). */
export function retryPolicyFor(toolId: string): RetryPolicy {
  return classify(toolId)?.retryPolicy ?? 'forbidden';
}

/** Whether autonomous dispatch of this tool needs an explicit confirmation step. */
export function requiresConfirmationFor(toolId: string): boolean {
  const c = classify(toolId);
  return c ? c.requiresConfirmation : true;
}
