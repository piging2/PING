/**
 * tool-classification.ts
 *
 * Typed registry of tool/callable side-effect semantics for autonomous workers.
 * Source of truth: SWARM-04 TOOL-CLASSIFICATION.md (2026-09-23), code-level
 * evidence against the single CapabilityAuthority
 * (/home/nolan/ping-gateway-src/gateway/capability_authority.js).
 *
 * Standing law encoded here:
 *   ACK != EFFECT, RESULT != VERIFIED OUTCOME, RETRY != IDEMPOTENCY.
 *   UNKNOWN fails closed for autonomous mutation, no exceptions.
 *
 * This module is pure data plus derived policy lookups. It performs no I/O
 * and grants no authority; the fail-closed-guard.ts module enforces it.
 */

export const CLASSIFICATION_VERSION = '2026-09-23.1';

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
  /** Agent profiles / roles granted this tool. Empty = nobody. */
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
 * The 21 advertised capabilities (POST /capabilities, GET /discover).
 * Evidence: routes/capabilities.js GET /discover (lines 94-421);
 * execution: capability_authority.js execute() (line 438).
 */
const CAPABILITIES: readonly ToolClassification[] = [
  entry({
    id: 'fs.list',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:534 _scanRepository; no writes',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'fs.read',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'capability_authority.js:382 deniedPaths enforced in authorize(); maxFileSize gate keys on client-supplied parameters.size (understatable)',
    retryPolicy: 'free',
    requiresConfirmation: false,
    notes:
      'Size gate is client-asserted, not server-measured. REFACTOR: stat the file server-side.',
  }),
  entry({
    id: 'fs.write',
    plane: 'capability',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: ['muse', 'muse-level-2'],
    evidence:
      'capability_authority.js:~593 fs.writeFileSync non-atomic; blind overwrite, no expected-hash/version precondition',
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
      'capability_authority.js:605 calls patchAuthority.createPatch(parameters) but the real signature is createPatch(missionId, agentId, patchData) (patch_authority_v2.js:273): every call throws TypeError',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    schemaDrift: true,
    notes: 'Advertised-but-broken: discover claims IMPLEMENTED. Catalog LIES; fails closed in practice.',
  }),
  entry({
    id: 'repo.inspect',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:723 repositoryAuthority.getRepositoryRoot',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.status',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:633 commitAuthority.getGitStatus',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.diff',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:638 simpleGit.diff()',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.log',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:645 simpleGit.log({maxCount})',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'git.branch',
    plane: 'capability',
    effectClass: 'UNKNOWN',
    grantedTo: ['muse-level-2'],
    evidence:
      'capability_authority.js:655-661 gitBranchInstance.branch() called with NO arguments: LISTS branches. Discover advertises "Create Git branch".',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    schemaDrift: true,
    notes:
      'Currently effect-free, but any worker reasoning "I created branch X" reasons from a lie. Treat catalog claim as untrusted.',
  }),
  entry({
    id: 'git.checkout',
    plane: 'capability',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: ['muse-level-2'],
    evidence:
      'capability_authority.js:665 gitCheckoutInstance.checkout(parameters.branch); discover marks destructiveBehavior: true',
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
      'capability_authority.js:672-673 git add . (ENTIRE worktree) + commit(message); duplicate request -> duplicate commits (distinct hashes)',
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
      'capability_authority.js:678 _routeGit throws "not yet implemented with promotion authorization"; discover: DISABLED, executionPermitted: false',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'Correctly fail-closed. KEEP disabled.',
  }),
  entry({
    id: 'process.list',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:741 runtimeRegistry.executeListComponents',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'service.inspect',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:743 runtimeRegistry.executeResolveComponent',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'logs.read',
    plane: 'capability',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: 'discover: NOT_IMPLEMENTED, executionPermitted: false; no route case -> throws "Unknown capability"',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'KEEP disabled.',
  }),
  entry({
    id: 'knowledge.search',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:759 knowledgeGraph.queryNodes',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'event.search',
    plane: 'capability',
    effectClass: 'READ_ONLY',
    grantedTo: ['muse', 'muse-level-2'],
    evidence: 'capability_authority.js:762 unifiedEventRuntime.query',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'command.run',
    plane: 'capability',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'capability_authority.js:778 _routeExecution throws "not yet implemented with policy scoping"',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
  entry({
    id: 'test.run',
    plane: 'capability',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence: 'capability_authority.js:778 same throw; when implemented, hermetic test runs are reversible (ephemeral scratch)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
  entry({
    id: 'build.run',
    plane: 'capability',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence: 'capability_authority.js:778 same throw',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'KEEP disabled until policy scoping exists.',
  }),
];

/**
 * Unauthenticated HTTP mutation surfaces (fail-open) on the gateway.
 * Evidence: bootstrap/gateway_runtime.js mounts lines 788-891 with NO
 * exteriorAuthMiddleware; no global auth middleware exists. Pig binds 0.0.0.0:8080.
 * GET /tenants live-verified unauthenticated (HTTP 200, 2026-09-23).
 * This is the wave's P0 tool-safety finding; reported, not silently diffed.
 */
const HTTP_SURFACES: readonly ToolClassification[] = [
  entry({
    id: 'http.tenants',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence:
      'bootstrap/gateway_runtime.js mounts without auth; LIVE: GET /tenants -> HTTP 200 no auth (2026-09-23)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST register, PUT /:id, DELETE /:id, POST /:id/heartbeat. Tenant registry is the TenantOS identity root; unauthenticated DELETE removes a tenant.',
  }),
  entry({
    id: 'http.deployments',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST create, /:id/complete, /:id/fail, /:id/rollback. Class F (release) ops with zero auth; contradicts standing law that NO role may release.',
  }),
  entry({
    id: 'http.runtime',
    plane: 'http',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST register, POST heartbeat. Forged heartbeat/component registration poisons the component inventory workers read.',
  }),
  entry({
    id: 'http.reviews',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /sync, POST /:id/reply. Reply posts are EXTERNAL effects (customer-facing text), unauthenticated.',
  }),
  entry({
    id: 'http.customers',
    plane: 'http',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /import, POST /, POST /:id/sync-email, POST /:id/sync-calendar. Customer PII ingestion + external sync triggers, unauthenticated.',
  }),
  entry({
    id: 'http.projects',
    plane: 'http',
    effectClass: 'NON_IDEMPOTENT_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /, POST /:id/artifacts. Unauthenticated project/artifact creation.',
  }),
  entry({
    id: 'http.ai-workspace',
    plane: 'http',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: [],
    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: true,
    notes: 'POST /sentiment, /tag, /parse, /translate, /summarize. Unauthenticated compute (resource abuse, prompt-injection surface into AI pipelines).',
  }),
  entry({
    id: 'http.context-system',
    plane: 'http',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: '/context, /system, /api/v1/repository mount without auth; full method audit deferred to swarm-15 (red team)',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'UNKNOWN -> fail closed.',
  }),
  entry({
    id: 'http.ops-governance',
    plane: 'http',
    effectClass: 'UNKNOWN',
    grantedTo: [],
    evidence: '/ops, /governance, /constitution: no auth observed at mount; needs per-route audit',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'UNKNOWN -> fail closed.',
  }),
];

/**
 * Worker CLI tools (capability-matrix classes, not the gateway).
 * Evidence: ~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md section 1.
 */
const WORKER_CLI: readonly ToolClassification[] = [
  entry({
    id: 'cli.git-mirror',
    plane: 'worker-cli',
    effectClass: 'IDEMPOTENT_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: git fetch/clone/pull unauthenticated; content-addressed mirror cache, re-fetch is a no-op',
    retryPolicy: 'same-key',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.git-push',
    plane: 'worker-cli',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: [],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: git push PROHIBITED for all roles',
    retryPolicy: 'forbidden',
    requiresConfirmation: true,
    notes: 'PROHIBITED for all roles, standing law.',
  }),
  entry({
    id: 'cli.build',
    plane: 'worker-cli',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: npm run build, tsc; bounded, worktree-scoped, wall-clock + resource caps',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.test',
    plane: 'worker-cli',
    effectClass: 'REVERSIBLE_EFFECT',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: jest/vitest; hermetic, scratch DB only (ping-test-pg), kill-switch',
    retryPolicy: 'reconcile-first',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.docker-read',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: docker logs/inspect/events; docker restart/exec-write PROHIBITED',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.curl-plane',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: curl to plane endpoints; health/metrics; Class A receipted',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.psql-select',
    plane: 'worker-cli',
    effectClass: 'READ_ONLY',
    grantedTo: ['worker'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: psql SELECT whitelisted; counts/timestamps; no direct writes ever',
    retryPolicy: 'free',
    requiresConfirmation: false,
  }),
  entry({
    id: 'cli.ssh',
    plane: 'worker-cli',
    effectClass: 'CONSEQUENTIAL_EFFECT',
    grantedTo: ['human-operators-only'],
    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: ssh (Pig/Oracle hops); human-operated only; workers never hold it',
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
    evidence: 'activities/ (mission, replay, repository, compiler, knowledge, reflection): in-process only, no exterior route',
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
