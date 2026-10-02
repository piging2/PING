# OmniRoute Harvest Lane — Model/Provider Execution Router

Research-only lane for the CRX autonomous-missions campaign. OmniRoute is studied
strictly as a **model/provider execution router**, never as orchestration authority.

## Source identity (verified 2026-09-23)

| Field | Value |
|---|---|
| Repository | `https://github.com/diegosouzapw/OmniRoute` |
| Branch | `release/v3.8.51` |
| Commit | `18bbb101980c639cfabdc5663213836d917c3269` |
| Package version | `3.8.51` |
| License | MIT (`package.json`) |
| Primary language | TypeScript; repo size ~934 MB (GitHub API) |
| Method | Partial clone to `/tmp/omniroute`; on-demand `git show` extraction to `/tmp/omniwork` (~384 source files inspected). No pushes, no credentials, third-party source kept under `/tmp` only. |

## Central question

> Does CRX eventually need MODEL REQUEST → POLICY → ROUTE → PROVIDER → RECEIPT
> as a replaceable execution seam?

**Answer: yes, and OmniRoute is the strongest existing proof that the seam is
implementable as a replaceable layer.** Its `ProviderExecutionPolicy` /
`sendProviderAttempt` / typed-outcome pipeline
(`open-sse/handlers/chatCore/providerExecutionPipeline.ts`, lines 31–53) is the
closest existing implementation of the CRX execution seam: immutable policy in,
one wire send, bounded recovery, typed outcome out. The harvest is real, but
conditional: OmniRoute *assumes* an authorized candidate set enters the router.
CRX must make that assumption a **verified invariant** — the router may only
ever filter/score within a POLICY-issued envelope.

## Hard boundary (held for every classification)

> Routing optimization may decide WHERE/HOW an authorized inference executes.
> It must never decide WHETHER an action is authorized.

Any mechanism blurring this boundary is `HARVEST_CLASS=REJECT`. Five of the 28
records are REJECT, and they are load-bearing: they name exactly what the CRX
seam must refuse to become (emergency billing fallback, nondeterministic
exploration, semantic complexity routing, ACP/MCP/A2A/pipeline orchestration).

## Mechanism index (28 records in `mechanisms.jsonl`)

| ID | Class | One-line verdict |
|---|---|---|
| OR_EXEC_POLICY_PIPELINE | ADAPT | The seam itself: immutable `ProviderExecutionPolicy` in, typed `response`/`error` out, lease-fenced wire send, bounded recovery |
| OR_PROVIDER_REGISTRY_3LAYER | PATTERN | Registry → executor → translator: three independent layers keep routing provider-agnostic |
| OR_PROTOCOL_TRANSLATOR_REGISTRY | REUSE | Pure `from:to` request/response translators; total, I/O-free, registry-keyed |
| OR_ACCOUNT_FALLBACK_COOLDOWN | ADAPT | Typed error classification + cooldown + health scoring; internal bugs never charged to providers; persistence must go fail-closed |
| OR_MODEL_FAMILY_FALLBACK | PATTERN | Post-error-only, same-family, tried-set, no cycles; needs capability-compatibility gates for CRX |
| OR_DECLARATIVE_FALLBACK_CHAINS | PATTERN | Ordered chains as data; resolution filters only, never reorders/appends; persistence must be canonical |
| OR_PURE_CIRCUIT_BREAKER | REUSE | Immutable closed/open/half_open state machine; lift verbatim |
| OR_SELF_HEALING_EXCLUSION | PATTERN | Hysteresis exclusion (0.2 out / 0.3 back in), doubling backoff, half-open probes, incident mode; empty-pool path must be policy-aware |
| OR_WEIGHTED_ROUTE_SCORING | ADAPT | Explainable weighted scoring over an authorized set; CRX must add determinism + strict budgets |
| OR_DETERMINISTIC_ROUTE_PREVIEW | PATTERN | Dry-run endpoint, zero upstream calls, `liveRequestExecuted: false` |
| OR_ROUTING_EVENT_RECEIPT | ADAPT | Typed `RoutingEvent`, metadata-only, O(1) sink fan-out with isolation; CRX must make it durable with lineage |
| OR_COMBO_DECISION_TRACE | PATTERN | Per-invocation considered/skipped/reason trace; needs deterministic identity + durability for CRX |
| OR_QUOTA_PREFILGHT_ESTIMATE | PATTERN | Deterministic pre-dispatch estimate + post-response truth; CRX must invert the fail-open default |
| OR_STRICT_ZERO_COST_FILTER | ADAPT | Pure metadata-driven hard-constraint filter; verified==dispatched by construction via allowlist rewrite |
| OR_SUBSCRIPTION_LADDER | PATTERN | Ordered economic rungs with per-rung fail semantics; grouping choice is POLICY's |
| OR_ADAPTIVE_ADMISSION | PATTERN | off/shadow/enforce modes, typed leases, pure bounded cost estimator, local-vs-upstream error branding |
| OR_QUALITY_SEPARATION | PATTERN | Operational vs semantic quality; semantic only from an evaluator, never manufactured; 0.5 = no evidence |
| OR_FAILURE_CLASSIFICATION | REUSE | Typed `(type, retryable)` vocabulary; quota-exhausted 429 is never retryable |
| OR_TOKEN_REFRESH_CIRCUIT | PATTERN | Bounded refresh, per-provider breaker, unrecoverable-error short-circuit |
| OR_ROUTE_EXPLAIN_ENDPOINT | PATTERN | Real decisions, not recomputed; metadata-only; management auth |
| OR_TASK_FITNESS_LAYERS | PATTERN | Evidence-graded scoring layers; retired ids vetoed; unknown = neutral |
| OR_LOCAL_MODEL_PROVIDER | PATTERN | Ollama as just another provider descriptor; local-first as policy weight, not code fork |
| OR_SESSION_POOL_LIFECYCLE | PATTERN | active/cooldown/dead session state machine; fingerprint emulation explicitly excluded from harvest |
| OR_EMERGENCY_BILLING_FALLBACK | REJECT | Router invents an unauthorized provider on a billing keyword; boundary violation |
| OR_EXPLORATION_NONDETERMINISM | REJECT | Unrecorded `Math.random()` routing + pool resurrection; destroys receipt replayability |
| OR_COMPLEXITY_ROUTER | REJECT | Prompt-semantics-driven tier movement, fail-open; orchestration-adjacent |
| OR_ORCHESTRATION_SURFACES | REJECT | ACP/MCP/A2A/pipeline-router are orchestration authority; the seam must never call upward |
| OR_A2A_ROUTING_LOGGER_SQLITE_CLAIM | REJECT | Falsification probe: docstring claims a SQLite table; implementation is in-memory |

Class counts: ADAPT 5, PATTERN 15, REUSE 3, REJECT 5.

## Detailed findings

### 1. The execution seam exists and is worth adapting

`open-sse/handlers/chatCore/providerExecutionPipeline.ts` (555 lines):

- `ProviderExecutionPolicy` (lines 31–35): `{ allowAccountRotation,
  allowModelFallback, expectedConnectionId? }`. Authorization enters as an
  immutable struct; the pipeline never widens it.
- `ProviderExecutionOutcome` (lines 37–53): typed `kind: "response"` /
  `kind: "error"` unions carrying url/headers/model/connectionId or the typed
  error result. Every attempt resolves to a receipt-ready outcome.
- Lease fencing: `leaseMismatch` (lines 184–190) returns a typed `lease_error`
  without sending when the managed connection drifts from
  `policy.expectedConnectionId` (checked lines 298–302 and 554).
- Retry budget is hard-coded and small: `maxAttemptsFor` gives Codex 3 attempts,
  every other provider 1 (lines 307–319, loop 330–377).
- Model fallback is gated on `policy.allowModelFallback` (line 517) with a
  `triedModels` set (lines 79, 122, 532) preventing cycles.
- Failed upstream responses teach the rate limiter *before* any retry/rotation,
  so recovery decisions use fresh signal.
- Credentials travel through `PipelineConnectionContext` getters (lines 63–74),
  never serialized into outcomes.

CRX delta: snapshot the full authorization envelope (policy version/hash,
authorized provider/model/account/capability bounds) into the receipt; persist
*every* attempt durably (OmniRoute returns only the final outcome); verify the
authorized-candidate precondition instead of assuming it.

### 2. Three-layer provider abstraction keeps routing provider-agnostic

- Registration: `open-sse/config/providers/index.ts` imports ~290 declarative
  per-provider modules from `open-sse/config/providers/registry/<name>/index.ts`
  (anthropic, bedrock, ollama-cloud, g4f-ollama, …).
- Execution: `open-sse/executors/base.ts` + 216 per-provider executors under
  `open-sse/executors/`.
- Translation: `open-sse/translator/registry.ts` — `makeKey(from,to)`,
  `register(from,to,requestFn?,responseFn?)`,
  `getRequestTranslator/getResponseTranslator`; pure functions, e.g.
  `translator/request/claude-to-openai.ts`.

Static-import test (falsification): routing/scoring code must never import a
concrete provider module directly. CRX delta: the descriptor must carry typed
capability declarations (tools, structured output, reasoning, context window,
data residency) so ROUTE filters on capability compatibility, not names.

### 3. Account health: classify typed, cool down, never punish providers for internal bugs

`open-sse/services/accountFallback.ts`:

- Signal constants with line evidence: `ACCOUNT_DEACTIVATED_SIGNALS` (211),
  `CREDITS_EXHAUSTED_SIGNALS` (238), `OAUTH_INVALID_TOKEN_SIGNALS` (274),
  `MODEL_PERMANENTLY_UNAVAILABLE_PATTERNS` (297), `RATE_LIMIT_TEXT_PATTERNS` (457).
- `lockModel` (770), `selectLockoutCooldownMs` (822),
  `recordModelLockoutFailure` (832), `decayModelFailureCount` (1028),
  `filterAvailableAccounts` (2381), `getAccountHealth` 0–100 (2503),
  overflow eviction (755).
- Explicitly distinguishes internal executor contract violations from provider
  failures: providers are not punished for internal bugs.
- Weak point: connection-cooldown persistence is best-effort; DB failures are
  swallowed, so cooldown state can silently drift.

CRX must replace swallowed persistence failures with typed outcomes in the
receipt and bind cooldown entries to the authorized account set.

### 4. Pure, reusable primitives (REUSE)

- `src/lib/resilience/adaptiveCircuit.ts` — `observeCircuit(current,
  "failure"|"success"|"probe", { failureThreshold: 3, cooldownMs: 60000,
  now?, reason? })`: immutable closed/open/half_open transitions, no I/O,
  injectable clock. Any success closes and resets; probe is the only exit from
  open.
- `src/lib/resilience/failureClassification.ts` —
  `classifyProviderFailure(...)` → `{ type, retryable }`. The load-bearing
  distinction: 429 + quota language → `quota_exhausted`, **not retryable**;
  plain 429 → `rate_limit`, retryable; 401/403/auth → terminal; 404/model
  → `model_unavailable` (drives family fallback, not retry).
- `open-sse/services/rateLimitManager/admission.ts` (45 lines) —
  `checkQueueAdmission(queuedCount, maxQueueDepth, identity)`: pure opt-in
  queue-depth gate returning a typed `RATE_LIMIT_QUEUE_FULL` error branded
  (WeakMap) as *local*, so health/routing never misattributes local pressure
  to the provider.
- `open-sse/translator/registry.ts` — the translator registry itself.

### 5. Weighted routing is WHERE/HOW optimization — with three fail-opens to fix

`open-sse/services/autoCombo/engine.ts`, `scoring.ts`:

- `scoreAutoTargets` computes factors (quota, health, inverse cost, inverse
  latency, task fit, stability, tier, affinity, connection density, observed
  quality, reliability) with normalized `DEFAULT_WEIGHTS` summing to 1.0
  (`scoring.ts` lines 62–70).
- Budget behavior (`engine.ts` lines 35–63, 329–333): `budgetFallback:
  "strict"` throws `BudgetExceededError` when nothing fits; the legacy default
  `"cheapest"` **knowingly selects over budget**.
- Exploration uses `Math.random()` (lines 191, 299, 302) with no seed, no
  recorded basis, and no deterministic tie-breaker in the sort.
- Empty pool: `pool.push(...candidates)` — "allow all candidates regardless of
  exclusions" (`engine.ts` lines 272–276).

CRX may harvest the scoring math only with: (a) strict budgets by default,
(b) seeded/recorded randomness + deterministic tie-breaks, (c) empty-pool
resurrection gated on health-only exclusions (fail closed otherwise), and
(d) scoring restricted to the POLICY-authorized set.

### 6. Self-healing with hysteresis; incident mode disables exploration

`open-sse/services/autoCombo/selfHealing.ts`:

- Exclude at score < 0.2, re-admit at >= 0.3 (hysteresis against flapping);
  5-min default cooldown doubling to 30-min max; HALF_OPEN allows a single
  counted probe; >50% circuits OPEN → incident mode, exploitation only.

### 7. Hard constraints done right: STRICT_ZERO_COST

`open-sse/services/autoCombo/strictZeroCostFilter.ts` (371 lines, header doc
lines 1–58):

- Pure filter on carried metadata (`freeType`, `tos`, `hardStopGuaranteed`) +
  injected `FreeAccessState` per (provider, connection); the module never
  touches DB/network. No provider names in the file.
- For multi-account candidates, `allowedConnectionIds` is **rewritten** to
  exactly the subset proven SAFE; downstream routing already intersects against
  it — "verified this connection" == "dispatch used this connection" by
  construction.
- Stale state → UNKNOWN → excluded; `remainingFreeAllowance === 0` fails at
  any threshold via strict `>`.

This is the cleanest template for CRX POLICY hard constraints (spend caps,
region pinning, capability floors): declared invariant, per-connection proof,
verification equals dispatch by construction. CRX adds receipt binding of the
proof timestamps.

### 8. Receipts: the shape is right, the durability is not

- `open-sse/services/routing/events.ts` + `index.ts`: typed `RoutingEvent`
  (requestId, provider, model, strategy, latencyMs, ttftMs, itlMs,
  tokens, cost, retries, fallbackUsed, outcome allowlist, status,
  finishReason, connectionId, ts). Metadata-only by explicit contract —
  no prompts, bodies, headers, credentials, account ids. Synchronous fan-out
  to O(1) sinks with exception isolation; default `MemoryRoutingEventStore(500)`
  (`index.ts` line 37).
- `open-sse/services/combo/decisionTrace.ts`: per-invocation
  dispatched/skipped/not-reached with allowlisted skip reasons; 30-min TTL,
  2,000-trace cap (lines 66–67); random UUIDs.
- `POST /api/omniroute/route/preview` (`src/app/api/omniroute/route/preview/route.ts`,
  36 lines): zod-validated candidates, `rankCandidates`, returns scores/factors/
  reasons + `liveRequestExecuted: false`. Deterministic dry-run, zero upstream calls.
- `GET /v1/explain/routing` (`src/app/api/v1/explain/routing/route.ts`, 72 lines):
  real emitted events + quality snapshot; "not recomputed after the fact";
  management auth; `Cache-Control: no-store`.
- Architecture doc `docs/architecture/ADAPTIVE_ROUTING.md` (v3.8.50): data
  plane (hot path) vs control/intelligence plane, with the event fan-out
  (~0.12 µs measured delta) as the boundary.

CRX delta: durable append-only receipts keyed by attempt id with Run/Mission
lineage + policy snapshot hash; deterministic attempt ids instead of random
UUIDs; typed delivery outcomes for audit sinks.

### 9. Quality feedback that refuses to manufacture judgments

`open-sse/services/routing/quality.ts`:

- Operational vs semantic split: operational from the hot path; semantic ONLY
  via `setSemanticQuality()` from an evaluator, null otherwise, never leaking
  into operational.
- 429 is transient → 0.5 neutral-positive (lines 118–119), tracked separately
  (line 148).
- Confidence blending: `0.5 + clamp01(samples/50) * (operational − 0.5)` —
  cold providers score neutral; lucky streaks cannot dominate.
- Quality is a **soft preference**; hard exclusion stays with circuit/quota/auth.

`open-sse/services/autoCombo/taskFitness.ts`: layered resolution (user
override → arena ELO → models.dev tier → versioned static table → 0.5
wildcard), vendor-retired veto with build-time check, and the doctrine that
**0.5 means "no evidence", never "mediocre"**.

### 10. Quota: good two-phase shape, wrong failure default

- `src/lib/quota/tokenEstimator.ts`: deterministic pre-dispatch estimate
  (chars/4, ×1.1 over-provision, 1024-token default output allowance), never
  throws; broken estimate → "unknown cost" (treated as affordable).
- `src/lib/quota/dimensions.ts` (61 lines): zod-typed units × windows ×
  hard/soft/burst policies; `PoolAllocation`, `ProviderPlan`.
- `src/lib/quota/types.ts`: `EnforceDecision = allow | block(reason, 429,
  retryAfterSeconds)`; `PoolUsageSnapshot` with per-key fairShare/deficit/borrowing
  and burn-rate time-to-exhaustion.
- `src/lib/quota/enforce.ts`: **explicitly fail-open on DB, store, plan, and
  saturation failures.**

As spend authorization this fail-open is REJECT-grade; as advisory scheduling
it is acceptable. CRX must invert it: infrastructure failure → typed
enforcement-unavailable outcome that POLICY handles (block or explicit
operator-approved degrade), recorded in the receipt.

### 11. Admission control done as capacity control, not authorization

`open-sse/services/admission/` + `cost.ts`:

- off/shadow/enforce modes, typed leases, deadlines, pressure, per-tenant
  virtual lanes; explicitly distinguishes upstream errors from local capacity
  failures.
- `estimateAdmissionCost`: pure, bounded, deterministic, from transparent
  positive safe-integer quanta (body bytes, tokens, messages, tools, fanout,
  streaming class).

Admission sits downstream of authorization, upstream of dispatch. A
capacity-shed request is "authorized but shed", never "denied".

### 12. Subscription ladder: ordered economics with explicit fail semantics

`open-sse/services/autoCombo/subscriptionLadder.ts`:
`RUNG_ORDER = ["subscription", "keyless", "free", "cheap", "premium"]` (line 49);
subscription-only grouping fails closed on unverifiable quota; thrifty grouping
admits unknown quota and escalates one rung at a time, fails open. Whether paid
escalation is authorized is POLICY's decision; the router walks the ladder.

### 13. Credential refresh with a dead-credential short-circuit

`open-sse/services/tokenRefresh/circuitBreaker.ts`: exponential backoff, 30s
per-attempt timeout, per-provider breaker (5 consecutive failures → 30-min
pause, `isProviderBlocked`); unrecoverable errors (`invalid_grant`,
`refresh_token_reused`) short-circuit so health checks deactivate the account
instead of looping. The valuable subtlety: distinguishing "try later" from
"this credential is dead".

### 14. Local models are just providers

`open-sse/config/ollamaModels.ts` (28 lines: name/digest/format/family/
parameter_size/quantization inventory), `open-sse/utils/ollamaTransform.ts`
(146 lines), registry entries `ollama-cloud`, `g4f-ollama`. No special-case
routing path — a local endpoint is a provider with a URL. Local-first is a
policy weight, not a code fork. Model digests double as integrity references.

### 15. Session pools: harvest the state machine, not the fingerprints

`open-sse/services/sessionPool/types.ts`: `SessionStatus`
active|cooldown|dead; per-session inflight, consecutive fails, cooldown
timestamps; hot-reloadable `PoolConfig` (6–20 sessions, 1s→30s+jitter
cooldown). The lifecycle state machine is a sound pool pattern. The browser
fingerprint material (UA/sec-ch-ua rotation) is **explicitly excluded** from
harvest — not an anti-detection technique for CRX, and never a real user
identity.

## Falsified claims (recorded per lane rules, not as mechanisms)

1. **`src/lib/a2a/routingLogger.ts` claims a SQLite `routing_decisions` table.**
   The header says "Records every routing decision to the `routing_decisions`
   SQLite table… Retention: 7 days default." The implementation is an in-memory
   array (`MAX_DECISIONS = 1000`, 7-day TTL splice) with the inline admission
   "production would use SQLite". No SQLite import, no SQL. Pinned as
   `OR_A2A_ROUTING_LOGGER_SQLITE_CLAIM` (REJECT). Lesson for CRX: persistence
   claims need write-path tests, not comments.
2. **Lane-hint paths that do not exist at this commit** (tree is authoritative):
   `open-sse/services/claudeCodeBaseUrl.ts` → actual `src/shared/utils/codexBaseUrl.ts`;
   `src/domain/providers/registry.ts` and `src/domain/providers/adapters/openai.ts`
   → actual `open-sse/config/providers/*`; `src/lib/mcp/serverConfig.ts` and
   `src/lib/mcp/runtime.ts` → actual `open-sse/mcp-server/*` (e.g.
   `scopeEnforcement.ts`, `runtimeHeartbeat.ts`, `audit.ts`).
3. **`docs/OMNIROUTE_ROUTING_POLICY.md` is 11 lines** (675 bytes) — a summary
   pointer, not the policy spec; the substantive design doc is
   `docs/architecture/ADAPTIVE_ROUTING.md` (v3.8.50).

## Recommended CRX seam shape (from this harvest)

```
AuthorizedModelRequest
  → RoutingPolicySnapshot (policy version/hash + authorized provider/model/account/capability set + fallback chain + budget mode)
  → RouteDecision (ranked candidates, scores, skip reasons, random basis/seed, deterministic tie-break)
  → ProviderAttempt(s) (attempt id, connection, translator used, typed outcome, usage, cost)
  → ExecutionReceipt (append-only, Run/Mission lineage, per-attempt evidence)
```

Non-negotiable properties inherited from this lane: router filters/scores only
within the authorized set; hard constraints are pure pre-dispatch gates with
per-connection proof; receipts are metadata-only and durable; quality is
operational unless an evaluator says otherwise; quota/admission failures are
typed and fail closed; randomness is seeded and recorded; orchestration
surfaces (ACP/MCP/A2A/pipelines) never live inside ROUTE.

## Open questions for the parent agent

1. The `ProviderExecutionPolicy` struct has no policy *version/hash* field —
   CRX will need to define the snapshot format; OmniRoute gives the seam
   location, not the schema.
2. Capability declarations for providers (tools, structured output, reasoning,
   residency) do not exist in OmniRoute descriptors in typed form; the
   `taskFitness` layers are the nearest source of capability data.
3. `docs/i18n/**` mirrors of routing docs were not diffed against the English
   sources; drift there is possible but irrelevant to mechanisms.
4. ~384 of ~14k tree entries were inspected, targeted at the routing/execution
   surfaces; provider registry entries were sampled, not exhaustively audited.
