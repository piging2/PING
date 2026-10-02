# TenantOS Execution Budgets — Design (SWARM 17)

## 0. Objective and non-goals

Turn the harvested PING pieces into bounded autonomous execution:
TENANT INTENT → MISSION → DURABLE RUN → BOUNDED WORK → CAPABILITY DECISION →
MCP/TOOL EXECUTION → RESULT → VERIFICATION → EVENT/EVIDENCE → MEMORY →
MISSION CONTROL → NEXT WORK.

Non-goals (binding): no billing, no pricing, no invoicing, no metering for
charge. Budgets are execution-safety ceilings only. No second orchestrator,
no second event authority: exhaustion is RECORDED through the constitutional
sprint's event/transition authorities, never a parallel ledger.

## 1. Vocabulary

- **Tenant**: the isolated customer boundary (DB-level isolation per standing
  decision 2026-09-21).
- **Mission**: the durable unit of tenant intent. A mission spawns runs until
  it completes, fails, or exhausts a mission-scoped budget.
- **Run**: one durable execution of a mission's work plan. A run performs
  attempts.
- **Attempt**: one try at the run's bounded work. A failed attempt may be
  retried inside the run up to `maxAttempts`.

A runaway agent must not become an infinite mission: mission-scoped ceilings
(`maxRuns`, `maxWallMs`, `maxToolCalls`) make unbounded retry structurally
impossible.

## 2. Budget dimensions and home scopes

Six dimensions. Each has exactly one home scope where its ledger lives;
children draw from the parent's remainder (composition rule R1).

| # | Dimension | Scopes | Unit |
|---|---|---|---|
| D1 | attempts | run | count |
| D2 | wall-time | attempt, run, mission | ms |
| D3 | tool-calls | run, mission, tenant(hourly) | count |
| D4 | context | run | chars (codebase-native unit: `MAX_QUESTION_CHARS`, slice caps) |
| D5 | artifact-size | tool-result, run, mission | bytes |
| D6 | parallel-workers | run, mission, tenant | count |

## 3. Default policies (smallest coherent; every number precedented)

### 3a. `TenantBudgetPolicy`
| Field | Default | Precedent |
|---|---|---|
| `maxParallelMissions` | 6 | `OriginSemaphore` globalMax=6 (`src/fyd/net/budgets.ts:59`) |
| `maxToolCallsPerHour` | 1000 | windowed quota shape from `GenerationQuota` (`src/fyd/net/rate-limit.ts:103`); magnitude set for tenant scale vs the anonymous 10/hr |

### 3b. `MissionBudgetPolicy`
| Field | Default | Precedent |
|---|---|---|
| `maxRuns` | 5 | anti-infinite-mission ceiling (no precedent; smallest that allows learn-and-retry) |
| `maxWallMs` | 2 h | bounded mission; 4x run budget |
| `maxToolCalls` | 150 | 5 runs x 30 |
| `maxArtifactBytes` | 15 MiB | `DEFAULT_MAX_BYTES` (`src/fyd/net/safe-fetch.ts:63`) |
| `maxParallelRuns` | 2 | `perOriginMax=2` (`src/fyd/net/budgets.ts:58`) |

### 3c. `RunBudgetPolicy`
| Field | Default | Precedent |
|---|---|---|
| `maxAttempts` | 3 | `MAX_RETRIES = 3` (`src/lib/deployment-transaction.ts:888`); research-brief `RETRY_LIMIT=3` |
| `maxWallMs` | 30 min | 6x attempt budget |
| `maxAttemptWallMs` | 5 min | `COMMITTING_TIMEOUT_MS` (`src/lib/deployment-transaction.ts:843`) |
| `maxToolCalls` | 30 | smallest workable acquire/verify/record loop |
| `maxContextChars` | 100_000 | chars-native; ~25k tokens of working context |
| `maxArtifactBytes` | 8 MiB | `ANONYMOUS_CRAWL_BUDGET.maxTotalBytes` (`src/fyd/net/budgets.ts:22`) |
| `maxParallelToolCalls` | 2 | `perOriginMax=2` |

### 3d. Per tool-result artifact cap
| Field | Default | Precedent |
|---|---|---|
| `maxResultBytes` | 1 MiB | `PAGE_FETCH_MAX_BYTES` (`src/fyd/onboarding/anonymous-preview.ts:123`) |

Policies are data, overridable per tenant. Defaults are the floor: a mission
may tighten, never loosen beyond the tenant ceiling without Mission Control
override (rule R6).

## 4. Typed exhaustion states

Exhaustion is a VALUE, never a thrown error and never a silent stop. This
repairs the `deployment-transaction.ts:890` gap (throw on MAX_RETRIES).

```ts
type BudgetDimension = "attempts" | "wall-time" | "tool-calls"
  | "context" | "artifact-size" | "parallel-workers";
type BudgetScope = "tenant" | "mission" | "run" | "attempt";

interface BudgetExhaustion {
  state: "BUDGET_EXHAUSTED";   // terminal marker
  dimension: BudgetDimension;   // which budget ran out (always named)
  scope: BudgetScope;           // where the ceiling was hit (may be a parent scope)
  limit: number;                // the ceiling
  consumed: number;             // what was spent
  tenantId: string;
  missionId?: string;
  runId?: string;
  attemptId?: string;
  /** Set only when a time window makes it retryable (tenant rate). */
  retryAfterMs?: number;
  at: string;                   // ISO-8601
}

type CheckResult =
  | { ok: true; remaining: number }
  | { ok: false; exhaustion: BudgetExhaustion };
```

Run states: `pending → running → verifying → complete | failed | BUDGET_EXHAUSTED`.
Mission states: `admitted → active → verifying → complete | failed | BUDGET_EXHAUSTED | deferred`.
`deferred` is the tenant-rate backpressure state (harvest: `AnonymousGate.check`
returns `{ ok: false, reason, retryAfterMs }`; admission defers, it does not die).

Every `BUDGET_EXHAUSTED` transition emits an event + evidence record through the
constitutional event authority (consumed, not duplicated), and is visible to
Mission Control (swarm-08). Memory (swarm-05/06) records the exhaustion pattern
so repeated runaway shapes are recognizable.

## 5. Checkpoints (where budgets are checked)

| ID | Point in the loop | What is checked | On exhaustion |
|---|---|---|---|
| C1 | Mission admission (tenant intent → mission) | tenant `maxParallelMissions`, hourly tool-call quota | mission → `deferred` with `retryAfterMs`; NOT terminal |
| C2 | Mission start | mission policy present and within tenant ceiling | mission → `BUDGET_EXHAUSTED` (terminal), escalate |
| C3 | Run start (incl. each new run of a mission) | mission `maxRuns`, `maxWallMs`, `maxToolCalls` remaining | mission → `BUDGET_EXHAUSTED`; run never starts |
| C4 | Attempt start | run `maxAttempts`, `maxWallMs`, `maxToolCalls`, `maxContextChars` remaining | run → `BUDGET_EXHAUSTED` (terminal for the run); mission may spawn a new run per C3 |
| C5 | Before each tool call (BEFORE capability decision) | run+mission+tenant tool-call ledgers; run parallel-tool-call slots; attempt wall clock | no capability evaluation, no tool call; attempt fails with typed reason or run exhausts |
| C6 | On tool result | result bytes vs `maxResultBytes`; run/mission artifact ledgers | result → typed `ARTIFACT_TOO_LARGE` (recorded, never silent); attempt continues degraded or fails per plan |
| C7 | Heartbeat / timeout sweep | attempt/run/mission wall clocks | attempt → `failed` with typed `ATTEMPT_WALL_EXCEEDED`; stale run → `BUDGET_EXHAUSTED` (harvest: `STALE_COMMITTING_TIMEOUT` recovery shape) |
| C8 | Verification output | artifact bytes of the verified result vs run/mission ledgers | verification result recorded; run → `BUDGET_EXHAUSTED` if over |

Ordering invariant: C5 runs BEFORE the capability decision (swarm-02/03/04
territory). A denied budget means the capability question is never asked and
no tool executes. Budgets gate; capabilities decide; tools execute. No overlap.

## 6. Exhaustion behavior matrix

| Exhausted | Scope | Terminal? | What happens |
|---|---|---|---|
| attempts | run | run: yes | Run → `BUDGET_EXHAUSTED{attempts, run}`. Checkpoint of partial work preserved as evidence. Mission may start a new run if C3 passes. |
| wall-time (attempt) | attempt | attempt: yes | Attempt → `failed` with typed reason `ATTEMPT_WALL_EXCEEDED`. Run retries if attempts remain. |
| wall-time | run | run: yes | Run → `BUDGET_EXHAUSTED{wall-time, run}`. Partial results checkpointed as evidence. |
| wall-time | mission | mission: yes | Mission → `BUDGET_EXHAUSTED{wall-time, mission}`. Escalate to Mission Control. |
| tool-calls | run | run: yes | Run → `BUDGET_EXHAUSTED{tool-calls, run}`. |
| tool-calls | mission | mission: yes | Mission → `BUDGET_EXHAUSTED{tool-calls, mission}`. Escalate. |
| tool-calls | tenant (hourly) | no | New missions → `deferred` with `retryAfterMs`; running work continues (no mid-flight kill). |
| context | run | run: yes | Run → `BUDGET_EXHAUSTED{context, run}`. The run must compact or terminate; silent truncation is forbidden (presentation slice caps are not execution policy). |
| artifact-size (single result) | attempt | no | Result → typed `ARTIFACT_TOO_LARGE` with bytes/limit; never silently dropped. Run continues degraded if the plan allows, else the attempt fails typed. |
| artifact-size | run/mission | run/mission: yes | `BUDGET_EXHAUSTED{artifact-size, scope}`. |
| parallel-workers | run/mission/tenant | no | `tryAcquire` returns `{ ok: false, exhaustion }` immediately; the caller waits or sheds load. Never queues invisibly (scheduling belongs to swarm-09 task claiming). |
| maxRuns | mission | mission: yes | Mission → `BUDGET_EXHAUSTED{attempts, mission}` (dimension "attempts": the mission ran out of runs). This is the anti-infinite-mission guarantee. |

Escalation: any mission-terminal `BUDGET_EXHAUSTED` surfaces to Mission Control
(swarm-08) with the full exhaustion record as evidence. Human override of a
budget goes through the human decision budget (swarm-10) and is itself recorded
as evidence. No override path inside the executor.

## 7. Composition rules (mission → run → attempt)

- **R1 (nested ledgers).** Every child ledger holds a reference to its parent
  ledger. `check`/`consume` walk the chain; the FIRST ledger in the chain whose
  ceiling would break names the exhaustion `scope`. A child can never spend
  what the parent does not have left.
- **R2 (cumulative tool accounting).** One tool call decrements the attempt's
  implicit count and the run, mission, and tenant-hour counters. (Harvest:
  `CrawlLedger.addBytes` fail-closed accumulation.)
- **R3 (fresh run budgets, bounded mission).** Each new run gets fresh
  run-scoped ledgers, but they draw from the mission's REMAINING totals
  (harvest: `Math.min(PAGE_FETCH_MAX_BYTES, remaining)` in
  `anonymous-preview.ts:189`). Mission ceilings make infinite retry impossible.
- **R4 (independent wall clocks).** Attempt, run, and mission deadlines are
  independent and all checked at C7. An attempt timeout does not consume the
  run's attempt budget unfairly: it fails the attempt, and the run decides.
- **R5 (reserve-before-spend).** No tool call without a successful reservation
  (harvest: `CrawlLedger.takePage(): boolean`). Reservation failure at C5 is a
  typed outcome, not an exception.
- **R6 (no mid-run loosening).** Policies are fixed at C2/C3. Only Mission
  Control via the human decision budget can grant an override, recorded as
  evidence.
- **R7 (in-memory is acceptable at the edge, durable at the core).** Volatile
  in-flight counters (semaphores, dedup) may be in-memory with documented
  reset semantics (harvest: `budgets.ts` header, `rate-limit.ts` header).
  Mission/run ledger state is durable: it rides the durable run record the
  wave builds (swarm-02), never a second store.

## 8. Reference implementation

`src/tenanos/budgets.ts` (new file, proposed in diff `diffs/P-20260923-002.diff`):
pure, dependency-free, deterministic (injectable `Clock`, harvest of
`TokenBucket`'s clock pattern):

- `BudgetDimension`, `BudgetScope`, `TenantBudgetPolicy`,
  `MissionBudgetPolicy`, `RunBudgetPolicy` types + `DEFAULT_*` constants.
- `BudgetExhaustion`, `CheckResult` typed outcomes.
- `BudgetLedger`: `check(dimension, n)`, `consume(dimension, n)`,
  `checkWallMs(deadlineMs)`, `remaining(dimension)`, `snapshot()`.
  Fail-closed; exhaustion names dimension + scope; walks the parent chain.
- `WorkerSlots`: non-blocking `tryAcquire()/release()` for D6 with typed
  exhaustion on denial (no hidden queues).
- `formatExhaustion(...)`: builds the typed record; no throws for budget
  outcomes.
- `CHECKPOINTS`: the C1..C8 contract as data, so the executor (swarm-02) and
  Mission Control (swarm-08) share one definition.

`src/tenanos/__tests__/budgets.test.ts`: proves fail-closed reservation,
typed exhaustion with named dimension/scope, parent-chain composition
(child blocked by parent remainder), wall-clock checks with injected clock,
and worker-slot denial. Runs under `src/tenanos/jest.config.cjs`
(swarm-19, P-20260923-001; not claimed or modified by this proposal).

## 9. Integration seams (other swarms; no duplication)

- Swarm-02 (ORCA mission engine): owns the run executor; calls C3/C4/C5/C6/C7
  via `BudgetLedger`. Budget module never drives execution.
- Swarm-03 (MCP/tool plane): C5 reservation happens before tool dispatch;
  calibrate `maxToolCalls` defaults against real tool-call profiles.
- Swarm-04 (tool safety): C6 artifact rejection composes with side-effect
  policy; both are typed, both recorded.
- Swarm-07 (observability): exhaustion records are first-class observable
  events; ledger `snapshot()` feeds dashboards.
- Swarm-08 (Mission Control): surfaces mission-terminal exhaustions; owns the
  override path.
- Swarm-09 (task claiming): D6 denial is non-blocking by design; queuing and
  scheduling stay in task claiming.
- Swarm-10 (human decision budget): the only override authority.
- Swarm-11 (failure recovery): consumes typed `failed`/`BUDGET_EXHAUSTED`
  states; never re-derives them from exceptions.
- Constitutional sprint: exhaustion events/transitions are recorded through
  its certified event/transition authorities once available; this module only
  produces the typed records, never a competing store.

## 10. Open questions for the coordinator

1. `maxToolCalls` defaults (30/150/1000) are the least precedented numbers;
   ask swarm-03 to calibrate against measured tool-call profiles once the
   MCP plane exists.
2. Tenant hourly quota (1000) vs per-mission concurrency (6): fine for launch,
   but multi-tenant load testing should confirm the tenant ceiling never
   starves admitted missions mid-flight (C1 admits only when headroom exists).
3. Whether `BUDGET_EXHAUSTED` needs a distinct mission-control notification
   path vs riding the normal event feed (swarm-08 call).
