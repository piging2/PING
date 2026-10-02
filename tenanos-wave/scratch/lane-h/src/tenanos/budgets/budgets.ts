/**
 * TenantOS execution budgets (SWARM 17, convergence wave).
 *
 * The smallest coherent budget mechanism for the autonomous tenant loop:
 * TENANT INTENT -> MISSION -> DURABLE RUN -> BOUNDED WORK -> CAPABILITY
 * DECISION -> MCP/TOOL EXECUTION -> RESULT -> VERIFICATION -> EVENT/EVIDENCE
 * -> MEMORY -> MISSION CONTROL -> NEXT WORK.
 *
 * Harvested precedents (all read-only; nothing here duplicates them):
 * - CrawlLedger reserve-before-spend, fail-closed        (fyd/net/budgets.ts)
 * - OriginSemaphore concurrency budget, FIFO, introspection (fyd/net/budgets.ts)
 * - AnonymousGate: gate BEFORE work, record AFTER, typed retryable denial
 *                                                         (fyd/net/rate-limit.ts)
 * - AcquisitionPolicy: budgets as request-scoped parameters; typed
 *   PolicyDecision / escalation / truncated             (fyd/acquisition/*)
 * - DeploymentTransaction: typed states, failureReason, terminal detection,
 *   MAX_RETRIES=3, COMMITTING_TIMEOUT_MS=5min           (lib/deployment-transaction.ts)
 * - PreviewFailureCode "budget-exhausted" as a typed code
 *                                         (fyd/onboarding/anonymous-preview.ts)
 *
 * Design rules enforced by this module:
 * - OmniRoute quota is not a budget authority (fail-open B16).
 * - Exhaustion is a VALUE (CheckResult), never a thrown error and never a
 *   silent stop. This repairs the deployment-transaction.ts:890 gap where
 *   exceeding MAX_RETRIES throws instead of typing.
 * - Budgets nest tenant > mission > run > attempt. A child ledger holds its
 *   parent; check/consume walk the chain and the FIRST ledger whose ceiling
 *   would break names the exhaustion scope (composition rule R1).
 * - One tool call decrements run, mission, and tenant-hour counters (R2).
 * - Budget checks run BEFORE the capability decision; a denied budget means
 *   the capability question is never asked and no tool executes.
 * - No billing, no pricing, no metering-for-charge. Execution safety only.
 *
 * Pure and deterministic: injectable Clock, no I/O, no imports.
 */

export type Clock = () => number;
const DEFAULT_CLOCK: Clock = Date.now;

/** The six budget dimensions. Each has exactly one home scope (see README). */
export type BudgetDimension =
  | "attempts"
  | "wall-time"
  | "tool-calls"
  | "context"
  | "artifact-size"
  | "parallel-workers";

/** Nesting scopes: tenant > mission > run > attempt. */
export type BudgetScope = "tenant" | "mission" | "run" | "attempt";

/** Identity carried on every exhaustion record. */
export interface BudgetIds {
  tenantId: string;
  missionId?: string;
  runId?: string;
  attemptId?: string;
}

export interface TenantBudgetPolicy {
  maxParallelMissions: number;
  maxToolCallsPerHour: number;
}

export interface MissionBudgetPolicy {
  /** Hard ceiling on runs per mission: the anti-infinite-mission guarantee. */
  maxRuns: number;
  maxWallMs: number;
  maxToolCalls: number;
  maxArtifactBytes: number;
  maxParallelRuns: number;
}

export interface RunBudgetPolicy {
  maxAttempts: number;
  maxWallMs: number;
  /** Per-attempt wall clock (harvest: acquisitionTimeoutMs vs timeoutMs). */
  maxAttemptWallMs: number;
  maxToolCalls: number;
  /** Chars: the codebase-native unit (MAX_QUESTION_CHARS, slice caps). */
  maxContextChars: number;
  maxArtifactBytes: number;
  maxParallelToolCalls: number;
}

/** Per tool-result artifact cap (harvest: PAGE_FETCH_MAX_BYTES = 1 MiB). */
export const DEFAULT_MAX_RESULT_BYTES = 1024 * 1024;

export const DEFAULT_TENANT_BUDGET_POLICY: TenantBudgetPolicy = {
  // Harvest: OriginSemaphore globalMax = 6 (fyd/net/budgets.ts:59).
  maxParallelMissions: 6,
  // Windowed-quota shape from GenerationQuota (fyd/net/rate-limit.ts:103).
  maxToolCallsPerHour: 1000,
};

export const DEFAULT_MISSION_BUDGET_POLICY: MissionBudgetPolicy = {
  maxRuns: 5,
  maxWallMs: 2 * 60 * 60 * 1000,
  maxToolCalls: 150,
  // Harvest: DEFAULT_MAX_BYTES = 15 MiB (fyd/net/safe-fetch.ts:63).
  maxArtifactBytes: 15 * 1024 * 1024,
  // Harvest: perOriginMax = 2 (fyd/net/budgets.ts:58).
  maxParallelRuns: 2,
};

export const DEFAULT_RUN_BUDGET_POLICY: RunBudgetPolicy = {
  // Harvest: MAX_RETRIES = 3 (lib/deployment-transaction.ts:888).
  maxAttempts: 3,
  maxWallMs: 30 * 60 * 1000,
  // Harvest: COMMITTING_TIMEOUT_MS = 5 min (lib/deployment-transaction.ts:843).
  maxAttemptWallMs: 5 * 60 * 1000,
  maxToolCalls: 30,
  maxContextChars: 100_000,
  // Harvest: ANONYMOUS_CRAWL_BUDGET.maxTotalBytes = 8 MiB (fyd/net/budgets.ts:22).
  maxArtifactBytes: 8 * 1024 * 1024,
  maxParallelToolCalls: 2,
};

/**
 * Typed budget exhaustion. The terminal marker is the state string; the
 * dimension is ALWAYS named, and scope tells you where the ceiling was hit
 * (it may be a parent scope: see composition rule R1).
 */
export interface BudgetExhaustion {
  state: "BUDGET_EXHAUSTED";
  dimension: BudgetDimension;
  scope: BudgetScope;
  limit: number;
  consumed: number;
  tenantId: string;
  missionId?: string;
  runId?: string;
  attemptId?: string;
  /** Set only when a time window makes the denial retryable (tenant rate). */
  retryAfterMs?: number;
  /** ISO-8601. */
  at: string;
}

/** Typed outcome of every budget check. Never throws for budget outcomes. */
export type CheckResult =
  | { ok: true; remaining: number }
  | { ok: false; exhaustion: BudgetExhaustion };

/**
 * Fail-closed consumption ledger for one scope. Construct with the parent
 * ledger (or null for the tenant root). check() and consume() walk the
 * parent chain: a child can never spend what the parent does not have left.
 */
export class BudgetLedger {
  private readonly consumed = new Map<BudgetDimension, number>();

  constructor(
    readonly scope: BudgetScope,
    private readonly limits: Partial<Record<BudgetDimension, number>>,
    private readonly parent: BudgetLedger | null,
    private readonly ids: BudgetIds,
    private readonly clock: Clock = DEFAULT_CLOCK,
  ) {}

  consumedOf(dimension: BudgetDimension): number {
    return this.consumed.get(dimension) ?? 0;
  }

  /** Remaining at THIS scope only (null when the dimension is unbudgeted here). */
  remaining(dimension: BudgetDimension): number | null {
    const limit = this.limits[dimension];
    if (limit === undefined) return null;
    return Math.max(0, limit - this.consumedOf(dimension));
  }

  private fail(
    dimension: BudgetDimension,
    limit: number,
    consumed: number,
    retryAfterMs?: number,
  ): CheckResult {
    return {
      ok: false,
      exhaustion: {
        state: "BUDGET_EXHAUSTED",
        dimension,
        scope: this.scope,
        limit,
        consumed,
        tenantId: this.ids.tenantId,
        missionId: this.ids.missionId,
        runId: this.ids.runId,
        attemptId: this.ids.attemptId,
        retryAfterMs,
        at: new Date(this.clock()).toISOString(),
      },
    };
  }

  /**
   * Check whether n units of dimension can be spent, without spending.
   * Walks the parent chain; the first ledger whose ceiling would break
   * produces the exhaustion record (so scope names the binding ceiling).
   */
  check(dimension: BudgetDimension, n = 1, retryAfterMs?: number): CheckResult {
    if (!Number.isFinite(n) || n < 0) {
      // Fail closed on nonsense input: never let a bad counter slip through.
      return this.fail(dimension, this.limits[dimension] ?? 0, this.consumedOf(dimension), retryAfterMs);
    }
    const limit = this.limits[dimension];
    if (limit !== undefined && this.consumedOf(dimension) + n > limit) {
      return this.fail(dimension, limit, this.consumedOf(dimension), retryAfterMs);
    }
    if (this.parent) return this.parent.check(dimension, n, retryAfterMs);
    const rem = this.remaining(dimension);
    return { ok: true, remaining: rem === null ? Number.POSITIVE_INFINITY : rem };
  }

  /**
   * Reserve-before-spend (harvest: CrawlLedger.takePage/addBytes). Checks the
   * whole chain, then records n on every ledger up the chain (R2: one spend
   * decrements run, mission, and tenant counters together).
   */
  consume(dimension: BudgetDimension, n = 1, retryAfterMs?: number): CheckResult {
    const c = this.check(dimension, n, retryAfterMs);
    if (!c.ok) return c;
    let ledger: BudgetLedger | null = this;
    while (ledger) {
      ledger.consumed.set(dimension, ledger.consumedOf(dimension) + n);
      ledger = ledger.parent;
    }
    return { ok: true, remaining: c.remaining };
  }

  /** Spend one attempt of this scope's attempt budget (run: maxAttempts). */
  takeAttempt(retryAfterMs?: number): CheckResult {
    return this.consume("attempts", 1, retryAfterMs);
  }

  /** Spend one tool call (run, mission, and tenant-hour ledgers via R2). */
  takeToolCall(retryAfterMs?: number): CheckResult {
    return this.consume("tool-calls", 1, retryAfterMs);
  }

  /** Account context material (chars) added to the working set. */
  addContextChars(n: number, retryAfterMs?: number): CheckResult {
    return this.consume("context", n, retryAfterMs);
  }

  /** Account artifact bytes produced. */
  addArtifactBytes(n: number, retryAfterMs?: number): CheckResult {
    return this.consume("artifact-size", n, retryAfterMs);
  }

  /**
   * Wall-clock check against an explicit deadline (ms epoch). The executor
   * owns deadlines; this only evaluates them. Dimension is always
   * "wall-time"; limit = deadline, consumed = now.
   */
  checkWallClock(deadlineMs: number, nowMs?: number): CheckResult {
    const now = nowMs ?? this.clock();
    if (now > deadlineMs) {
      return this.fail("wall-time", deadlineMs, now);
    }
    return { ok: true, remaining: Math.max(0, deadlineMs - now) };
  }

  /** Introspection for observability (swarm-07) and tests. */
  snapshot(): {
    scope: BudgetScope;
    limits: Partial<Record<BudgetDimension, number>>;
    consumed: Partial<Record<BudgetDimension, number>>;
  } {
    const consumed: Partial<Record<BudgetDimension, number>> = {};
    this.consumed.forEach((v, d) => {
      consumed[d] = v;
    });
    return { scope: this.scope, limits: { ...this.limits }, consumed };
  }
}

/** Map a run policy onto ledger limits (wall-time via checkWallClock, D6 via WorkerSlots). */
export function runPolicyLimits(p: RunBudgetPolicy): Partial<Record<BudgetDimension, number>> {
  return {
    attempts: p.maxAttempts,
    "tool-calls": p.maxToolCalls,
    context: p.maxContextChars,
    "artifact-size": p.maxArtifactBytes,
  };
}

/** Map a mission policy onto ledger limits ("attempts" here = maxRuns). */
export function missionPolicyLimits(p: MissionBudgetPolicy): Partial<Record<BudgetDimension, number>> {
  return {
    attempts: p.maxRuns,
    "tool-calls": p.maxToolCalls,
    "artifact-size": p.maxArtifactBytes,
  };
}

/** Map a tenant policy onto ledger limits (D6 via WorkerSlots). */
export function tenantPolicyLimits(p: TenantBudgetPolicy): Partial<Record<BudgetDimension, number>> {
  return { "tool-calls": p.maxToolCallsPerHour };
}

export type AcquireResult =
  | { ok: true; remaining: number; release: () => void }
  | { ok: false; exhaustion: BudgetExhaustion };

/**
 * Non-blocking worker slots for D6 (parallel-workers). tryAcquire either
 * hands out a slot with a release function or returns typed exhaustion
 * immediately. Never queues invisibly: scheduling belongs to task claiming
 * (swarm-09). Double release is a no-op (harvest: OriginSemaphore).
 */
export class WorkerSlots {
  private inFlight = 0;

  constructor(
    private readonly max: number,
    private readonly scope: BudgetScope,
    private readonly ids: BudgetIds,
    private readonly clock: Clock = DEFAULT_CLOCK,
  ) {}

  tryAcquire(): AcquireResult {
    if (this.inFlight >= this.max) {
      return {
        ok: false,
        exhaustion: {
          state: "BUDGET_EXHAUSTED",
          dimension: "parallel-workers",
          scope: this.scope,
          limit: this.max,
          consumed: this.inFlight,
          tenantId: this.ids.tenantId,
          missionId: this.ids.missionId,
          runId: this.ids.runId,
          attemptId: this.ids.attemptId,
          at: new Date(this.clock()).toISOString(),
        },
      };
    }
    this.inFlight += 1;
    let released = false;
    return {
      ok: true,
      remaining: this.max - this.inFlight,
      release: () => {
        if (released) return;
        released = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
      },
    };
  }

  inFlightCount(): number {
    return this.inFlight;
  }
}

export type CheckpointId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";

export interface BudgetCheckpoint {
  id: CheckpointId;
  point: string;
  checks: string[];
  onExhaustion: string;
}

/**
 * The C1..C8 contract as data, shared by the executor (swarm-02) and
 * Mission Control (swarm-08). Ordering invariant: C5 runs BEFORE the
 * capability decision; a denied budget means no tool executes.
 */
export const CHECKPOINTS: readonly BudgetCheckpoint[] = [
  {
    id: "C1",
    point: "Mission admission (tenant intent -> mission)",
    checks: ["tenant maxParallelMissions", "tenant hourly tool-call quota"],
    onExhaustion: "mission -> deferred with retryAfterMs; NOT terminal",
  },
  {
    id: "C2",
    point: "Mission start",
    checks: ["mission policy within tenant ceiling"],
    onExhaustion: "mission -> BUDGET_EXHAUSTED (terminal); escalate",
  },
  {
    id: "C3",
    point: "Run start (each run of a mission)",
    checks: ["mission attempts (= maxRuns)", "mission wall-time", "mission tool-calls"],
    onExhaustion: "mission -> BUDGET_EXHAUSTED; run never starts",
  },
  {
    id: "C4",
    point: "Attempt start",
    checks: ["run attempts", "run wall-time", "run tool-calls", "run context"],
    onExhaustion: "run -> BUDGET_EXHAUSTED (terminal for the run); mission may start a new run per C3",
  },
  {
    id: "C5",
    point: "Before each tool call (BEFORE capability decision)",
    checks: ["run+mission+tenant tool-call ledgers", "run parallel-tool-call slots", "attempt wall clock"],
    onExhaustion: "no capability evaluation, no tool call; typed attempt failure or run exhaustion",
  },
  {
    id: "C6",
    point: "On tool result",
    checks: ["result bytes vs maxResultBytes", "run/mission artifact ledgers"],
    onExhaustion: "result -> typed ARTIFACT_TOO_LARGE (recorded, never silent); attempt continues degraded or fails typed",
  },
  {
    id: "C7",
    point: "Heartbeat / timeout sweep",
    checks: ["attempt, run, mission wall clocks"],
    onExhaustion: "attempt -> failed (ATTEMPT_WALL_EXCEEDED); stale run -> BUDGET_EXHAUSTED",
  },
  {
    id: "C8",
    point: "Verification output",
    checks: ["verified artifact bytes vs run/mission ledgers"],
    onExhaustion: "verification recorded; run -> BUDGET_EXHAUSTED if over",
  },
];
