# HARVEST DECISIONS — SWARM 14

## Harvest: ORCA / OmniRoute / Restate / Agent Runtimes

**Swarm:** 14 · **Wave:** TenantOS Autonomous Convergence
**Date:** 2026-09-23/24 · **Repo:** `/home/nolan/projects/ping` (READ-ONLY, Pig)
**Deliverable:** `~/workspace/tenanos-wave/swarm-14/HARVEST-DECISIONS.md`

### Coordinator directives recorded

1. Canonical code root for ALL wave substrate code is `src/tenanos/**`. No competing roots. All diff sketches below target `src/tenanos/**`.
2. `src/fyd/**` and the 66 uncommitted FYD files are a hard exclusion zone. Wave work happens in fresh worktrees from tag `tenanos-wave-base-20260923` (e48ef710).
3. Proposal tracking lives in `~/workspace/tenanos-wave/STATE.json`; diffs land at `~/workspace/tenanos-wave/diffs/<id>.diff` via the coordinator as sole write dispatcher. This swarm files proposals only; it writes no repo files.

### Method

For each of 13 lanes: one concrete PING problem, one pinned candidate (full SHA), source and tests read, mechanism located, assumed authority named, failure modes listed, PING comparison, red-team pass, safe synthetic experiment where possible, then HARVEST or REJECT. Every lane answers: **what can PING delete or avoid building because this exists?**

### PING baseline used for comparison

Two distinct artifacts, not to be confused:

- **Current PING repo** (`/home/nolan/projects/ping`, website/product repo): `src/types/tenant.ts` defines Tenant as the first-class configuration boundary; `src/config/tenant.ping.v1.json` defines PING as the first tenant. No mission runtime surfaced in `src/` through prior read-only scans. (This session could not re-reach the Pig over SSH; the finding stands from the 2026-09-24 read.)
- **CE-002 analog** (`~/workspace/ce002/src/mission_runtime.js`, prior copy): deterministic mission IDs, atomic assignment, `lease_until`, fencing via `attempts` counter, fenced completion, retry state, lease renewal, expiry reclamation, lost-completion reconciliation into canonical `ping_events`. **Known defect:** `renewLease(missionId, durationSeconds)` renews by mission ID + status only; it does not require worker identity or a fencing token, so a stale scheduler can extend a superseded attempt's lease.

All "PING comparison" notes below refer to the CE-002 analog unless stated otherwise, and are labeled as such.

### Cross-cutting verdict

One integrated substrate, not imported frameworks. PING Mission remains the semantic work unit; add a durable attempt-level **Run** beneath Mission. The Run carries `tenant_id`, worker/holder, lease expiry, fencing token, budget snapshot, capability decision reference, checkpoint reference, and status. PING's canonical event journal remains the source of truth. External systems contribute mechanics only:

| Concern | Source of mechanics |
|---|---|
| Run/journal shape | Restate (pattern only; BSL-1.1) |
| Claim/lease mechanics | Hatchet |
| Checkpoint shape | LangGraph |
| Overdue predicate | Dapr |
| Recovery queue mechanics | DBOS |
| Execution auth boundary | FastMCP |
| Provider routing seam | OmniRoute |
| Correction/supersession mechanics | Graphiti |
| Context budget blocks | Letta (archive) |
| Spend-limit shape | PydanticAI |
| Execution isolation | nsjail (OS mechanism) |
| Telemetry vocabulary | OTel GenAI semconv |

No second orchestrator, no second event authority, no second capability system is created by any decision below.

---

## Lane 1 — Durable Runs

**PING problem (concrete):** The CE-002 analog has Mission-level identity only. When a mission is retried, the retry is indistinguishable from the original attempt: same mission ID, bumped `attempts` counter. There is no durable per-attempt identity, so a journal entry, a tool receipt, or a checkpoint cannot say *which attempt* produced it. After a crash, "resume attempt 3" vs "replay attempt 2's journal" is ambiguous.

**Candidate:** `restatedev/restate@c0b4a74abec859e5783c7c5af6f3b68f0f1fc9b7` (BSL-1.1 — pattern only, never import)

**Mechanism (source-read):**
- `crates/types/src/identifiers.rs`: `InvocationId` = partition key + invocation UUID. Partitioning prefers deterministic target/idempotency-key material; the UUID makes each invocation unique even for the same target.
- `crates/types/src/journal/entries.rs`: journal entry vocabulary — Input, Output, state get/set/clear, Promise, Sleep, Call, Awakeable, Run, CancelInvocation, AttachInvocation, GetInvocationOutput.

**Assumed authority:** The journal is the durable record of what an invocation did; replay derives state from the journal. Restate assumes it owns execution *and* journaling (it is the runtime).

**Failure modes:** Journal grows unboundedly without retention policy; invocation UUIDs are random (not deterministic) so replay identity depends on the journal, not the ID; BSL-1.1 license forbids treating it as a dependency for a competing offering.

**PING comparison:** CE-002's `attempts` counter is a fencing token, not an identity. Restate's split — deterministic partition key (tenant/mission) + unique invocation UUID — is the missing piece. PING must NOT adopt Restate's runtime; it only needs the identity shape.

**Red-team:** A Run row without `tenant_id` binding leaks state across tenants (verified risk, highest-value finding from prior harvest). A random run UUID alone is not replay-safe; every journal entry must carry `(tenant_id, mission_id, run_id, seq)` to be attributable. Do not let the journal become a second event authority: PING's canonical `ping_events` remains source truth; the run journal is a per-attempt projection.

**Decision: HARVEST (pattern)**

**Diff sketch** (`src/tenanos/runs/schema.ts`):
```ts
// Durable per-attempt Run beneath Mission. Identity only; PING journal stays canonical.
interface Run {
  tenant_id: string;        // partition key material, always bound
  mission_id: string;       // deterministic mission identity (existing)
  run_id: string;           // uuidv7 per attempt; unique even for same mission
  attempt: number;           // monotonic, mirrors CE-002 attempts counter
  fencing_token: string;    // == run_id at creation; rotated on preemption
  status: 'claimed'|'running'|'checkpointed'|'completed'|'failed'|'expired';
  journal_ref: string;       // pointer to per-attempt journal entries in ping_events
}
type JournalEntry =  // vocabulary, not engine
  | { kind:'input', payload_ref:string } | { kind:'output', payload_ref:string }
  | { kind:'state_set', key:string } | { kind:'call', target:string, args_ref:string }
  | { kind:'sleep', until:string } | { kind:'awaitable', id:string };
```

**Delete/avoid:** Do not build a durable-execution framework, a replay engine, or a custom invocation-ID scheme. Add one Run table + journal vocabulary; the mechanics are 30 lines of schema.

---

## Lane 2 — Task claiming

**PING problem (concrete):** CE-002's assignment is atomic but coarse: claim-by-mission-ID with no tenant binding in the claim primitive and no "attach to winner" semantics. Two schedulers racing the same mission resolve by luck of timing, and the loser gets no durable signal of who won.

**Candidate:** `hatchet-dev/hatchet@e84b24e5bc01190bc45968811abffeb8d4367fa8`

**Mechanism (source-read):**
- `pkg/repository/idempotency.go` → `ClaimKey(ctx, tenantId, key, expiresAt, claimedByExternalId) (bool, error)`: returns whether *this* claimant won.
- `pkg/repository/sqlcv1/idempotency-keys.sql` → `ClaimIdempotencyKeys`: single statement that (1) locks existing rows `WHERE tenant_id=@tenantId AND key IN (...) ORDER BY tenant_id, expires_at, key FOR UPDATE` (deterministic lock order = deadlock-safe), (2) treats rows with `expires_at <= NOW()` as claimable (expired claims transfer), (3) `INSERT ... ON CONFLICT (tenant_id, key) DO UPDATE` overwriting claimant only when claimable, (4) returns `was_successfully_claimed = (claimed_by_external_id = my_id)`.

**Assumed authority:** The idempotency-key table is the claim authority; the DB's row lock is the mutex. Hatchet assumes Postgres.

**Failure modes:** Claim TTL too long → dead worker blocks the mission until expiry; TTL too short → live worker's claim stolen mid-run (mitigated by lease renewal, Lane 3); clock skew between claimants makes `expires_at <= NOW()` disagree (keep TTLs in minutes, skew in seconds).

**PING comparison:** CE-002 has atomic assignment but no tenant-scoped claim key and no winner-attach. Hatchet's single-statement claim is strictly stronger and directly portable.

**Red-team:** The claim key must include `tenant_id` or one tenant can squat another's mission keys. The loser path must return the *holder identity* so the loser can attach/subscribe rather than spin-retry. Never claim without a TTL; a claim without expiry is a permanent lock on crash.

**Synthetic experiment (run 2026-09-23, SQLite port of the exact claim semantics):** 8 threads racing one key → exactly 1 winner, all 7 losers observe the same holder; live claim not stealable; expired claim transfers to new claimant; same key in two tenants both win (isolation). 4/4 PASS. Script: `/tmp/hatchet_claim_experiment.py` (ephemeral; semantics recorded here).

**Decision: HARVEST**

**Diff sketch** (`src/tenanos/claim/claim.ts`):
```ts
// Atomic tenant-scoped claim. Returns won + holder for attach-to-winner.
async function claimTask(tenantId: string, missionId: string,
  claimantId: string, ttlSec: number): Promise<{ won: boolean; holder: string }>;
// SQL: one statement; lock rows ORDER BY (tenant_id, key) FOR UPDATE;
// claimable iff absent OR expires_at <= now(); ON CONFLICT DO UPDATE only when claimable.
```

**Delete/avoid:** Do not build a claim service, a distributed lock manager, or a Redis-based mutex. One SQL statement + one table is the whole mechanism.

---

## Lane 3 — Leases

**PING problem (concrete):** CE-002 `renewLease(missionId, durationSeconds)` renews by mission ID and status only. It does not require worker identity or the fencing token. A stale scheduler — or a partitioned-then-returned worker — can extend a superseded attempt's lease, resurrecting a zombie that then writes against the current attempt. This is a **P0**.

**Candidate:** `hatchet-dev/hatchet@e84b24e5bc01190bc45968811abffeb8d4367fa8`

**Mechanism (source-read):** `pkg/scheduling/v1/lease_manager.go`: leases are explicitly tenant-scoped and separated by kind (worker, queue, concurrency, batch). A lease is bound to (tenant, holder, scope, expiry); renewal is a compare-and-swap on holder + expiry, not a blind extension.

**Assumed authority:** The lease table is the liveness authority; expiry without renewal = death. Hatchet assumes its scheduler is the only lease writer per scope.

**Failure modes:** Lease TTL shorter than GC pause → false death and duplicate work (mitigate: TTL >> max expected pause, plus fencing so duplicates are fenced, not merged); renewal storm under partition → thundering herd on expiry (mitigate: jittered renewal at TTL/3).

**PING comparison:** CE-002 has `lease_until` and an `attempts` fencing counter but the renewal path ignores both the holder and the counter. Hatchet's holder-bound CAS renewal is the exact fix.

**Red-team:** A lease without holder + fencing-token CAS permits stale workers (the CE-002 defect, confirmed by reading). A lease table without `tenant_id` lets one tenant's worker renew another tenant's lease. Renewal must be `UPDATE ... WHERE tenant_id=? AND run_id=? AND fencing_token=? AND holder=?`; zero rows affected = you are not the holder, stop working.

**Decision: HARVEST (with P0 fix)**

**Diff sketch** (`src/tenanos/leases/lease.ts`):
```ts
interface Lease { tenant_id: string; run_id: string; holder: string;
  fencing_token: string; scope: 'run'|'worker'|'queue'; expires_at: string; }
async function renewLease(tenantId, runId, holder, fencingToken, ttlSec): Promise<boolean>;
// UPDATE leases SET expires_at=now()+ttl
//  WHERE tenant_id=? AND run_id=? AND holder=? AND fencing_token=? AND expires_at > now()
// returns rowsAffected === 1; false means: stop, you are fenced out.
```

**Delete/avoid:** Do not build lease infrastructure from scratch. The P0 is a ~10-line change to the renewal predicate plus a `holder`/`fencing_token` column; the concept (tenant-scoped, holder-bound, CAS renewal) is fully specified by Hatchet.

---

## Lane 4 — Checkpointing

**PING problem (concrete):** When a CE-002 mission's worker dies mid-run, the replacement restarts from scratch: there is no durable record of partial progress (which steps finished, what state they produced). Long missions cannot make progress across crashes.

**Candidate:** `langchain-ai/langgraph@bdb85b5aa87a21de68371d2e534b81aeed398f57`

**Mechanism (source-read):** `libs/checkpoint/langgraph/checkpoint/base/__init__.py` — checkpoint fields: version, monotonic checkpoint ID, timestamp, channel values, channel versions, versions-seen-by-each-node, updated channels. A checkpoint is a *state snapshot with lineage*, not just a blob.

**Assumed authority:** The checkpointer owns state snapshots; the graph replays from the latest checkpoint. LangGraph assumes its own channel/version vocabulary.

**Failure modes:** Checkpointing every step is write-amplifying (mitigate: checkpoint at step boundaries the mission declares, not every tool call); a checkpoint does not make side effects idempotent — replaying from a checkpoint re-executes effects unless tools are idempotency-keyed (see Lane 2); large channel values bloat the store (mitigate: payload refs, not inline payloads).

**PING comparison:** CE-002 has retry state but no resumable progress record. LangGraph's shape (values + versions + versions-seen) maps directly onto PING's step model.

**Red-team:** A checkpoint is not exactly-once. The checkpoint says "steps 1-3 done"; it cannot unsend the email step 3 sent. Every effectful tool must carry the `(tenant_id, run_id, step_id)` idempotency key (Lane 2) so resume-after-checkpoint is safe. Checkpoint payloads must never contain secrets in plaintext; store refs.

**Decision: HARVEST**

**Diff sketch** (`src/tenanos/checkpoint/schema.ts`):
```ts
interface Checkpoint {
  tenant_id: string; run_id: string; checkpoint_id: string; // monotonic
  taken_at: string; step_id: string;
  state: Record<string, string>;   // channel -> payload REF, never inline secrets
  versions: Record<string, number>; // per-channel versions
  seen: Record<string, number>;     // versions seen by each step (lineage)
}
```

**Delete/avoid:** Do not design a checkpoint schema from zero or build snapshot infrastructure. Re-key LangGraph's field set to PING Run/step identities; the shape is proven.

---

## Lane 5 — Reconciliation

**PING problem (concrete):** CE-002 has expiry reclamation and lost-completion reconciliation into `ping_events`, but nothing detects a mission that is *claimed yet making no progress* (worker alive, lease renewed, but stuck) without a global sweeper — and a global sweeper is a second orchestrator, which is forbidden.

**Candidate:** `dapr/dapr@b2332b1be683245c218184cf550c03d56c1120bb`

**Mechanism (source-read):** `pkg/actors/targets/workflow/common/pendingstart/pendingstart.go` — `Overdue` is a **pure predicate** over (pending state, due time, current time, grace period). No sweeper, no timer service: staleness is computed, not polled-for.

**Assumed authority:** Dapr assumes the actor runtime evaluates the predicate on reminder/activation paths. The predicate itself assumes nothing.

**Failure modes:** Pure predicate evaluated nowhere = dead code (must be wired into status-read and claim paths); grace too short → false overdue under load; evaluating on every read adds a comparison per read (negligible).

**PING comparison:** CE-002's reclamation runs on lease expiry only. Dapr's predicate generalizes this: *any* pending state with a due time can be judged overdue at read time.

**Red-team:** Lazy reconciliation must never mutate on a mere read in a way the caller doesn't expect — evaluate the predicate during status reads and *enqueue* a redrive (Lane 12), never silently rewrite state. The overdue decision must be deterministic from (state, due, now, grace) so two readers agree.

**Decision: HARVEST**

**Diff sketch** (`src/tenanos/reconcile/overdue.ts`):
```ts
// Pure predicate. Called on status reads and before claim; enqueues redrive, never mutates inline.
function isOverdue(pending: { state: string; dueAt: string }, now: string, graceSec: number): boolean;
```

**Delete/avoid:** Do not build a sweeper service, a cron-based reaper, or a second orchestrator. The entire mechanism is one pure function wired into existing read paths.

---

## Lane 6 — Tool execution

**PING problem (concrete):** Any tenant agent executing tools needs an authorization boundary that (a) hides unauthorized tools at discovery, (b) re-checks authorization at execution time (a tool revoked between list and call must not run), and (c) fails closed when context is missing. MCP tool `annotations` are hints, not authorization.

**Candidate:** `PrefectHQ/fastmcp@c6165d9193887d61a9c6ff2f7a50f1ee842ac70d` (verified at pinned SHA this session; earlier sparse paths were wrong, corrected to `fastmcp_slim/fastmcp/server/...`)

**Mechanism (source-read):** `fastmcp_slim/fastmcp/server/middleware/authorization.py` → `AuthMiddleware`:
- `on_list_tools`: filters the tools/list response through callable auth checks; `AuthorizationError` → tool silently skipped (no existence disclosure).
- `on_call_tool`: re-resolves the tool via `get_tool` at call time (TOCTOU protection), fail-closed with `AuthorizationError` when `fastmcp_context` is missing, ambiguous "not found or not authorized" errors to avoid disclosing tool existence. AND-logic over check callables. Explicit documented skip for STDIO transport ("no OAuth concept").

**Assumed authority:** The middleware chain is the enforcement point; the auth callables are the policy. FastMCP assumes the token in context is already authenticated upstream.

**Failure modes:** STDIO skip is a documented trust-boundary hole — any PING path that executes tools over an unauthenticated transport inherits it (PING must not have such a path for tenant work); list-time filtering without call-time re-check is TOCTOU (FastMCP does both; keep both); ambiguous errors complicate debugging (mitigate: log the real reason server-side, return the ambiguous message).

**PING comparison:** PING has no MCP execution boundary yet. FastMCP's shape — filter at discovery, re-resolve + re-check at execution, fail closed, ambiguous errors — is the correct boundary and preserves PING's capability authority: the checks *consult* the capability decision, they don't make it.

**Red-team:** MCP tool annotations are untrusted hints, never authorization. Tool *receipts* (it ran) and *effect verification* (the world changed correctly) are separate — no ecosystem surveyed verifies world-state effects; PING must not confuse a tool result with a verified outcome. The capability decision (WHETHER this tenant/run may use this tool) stays in PING; the middleware enforces it at both list and call time.

**Decision: HARVEST (pattern)**

**Diff sketch** (`src/tenanos/tools/auth_boundary.ts`):
```ts
// Mirrors FastMCP AuthMiddleware semantics; policy delegates to PING capability authority.
async function listTools(ctx): Promise<Tool[]>;   // filter by capability check; skip on deny
async function callTool(ctx, name, args): Promise<ToolResult>; {
  // 1. fail closed if ctx missing; 2. re-resolve tool (TOCTOU); 3. re-check capability;
  // 4. ambiguous "not found or not authorized"; 5. emit tool receipt event to journal
}
```

**Delete/avoid:** Do not build MCP auth middleware from scratch and do not invent a tool-annotation trust model. Adapt the two-phase (list-filter + call-recheck) enforcement shape; the capability policy itself remains PING's.

---

## Lane 7 — Context construction

**PING problem (concrete):** Agent context assembly is unbounded: system prompt, tenant config, mission state, memory, and tool definitions all compete for the same window with no per-section budget and no visibility into what the window costs. One tenant's bloated memory section can starve the mission instructions.

**Candidate:** `letta-ai/letta@56ba9c25552605eec89de8ed3dc6394b625c1993` (archive branch; verified this session)

**Mechanism (source-read):**
- `letta/schemas/memory.py` → `ContextWindowOverview`: typed budget ledger — `context_window_size_max`, `context_window_size_current`, plus per-section token counts (`num_tokens_system`, `num_tokens_core_memory`, `num_tokens_archival_memory`, `num_tokens_recall_memory`, `num_tokens_summary_memory`, `num_tokens_functions_definitions`, ...). The agent sees its own budget.
- `letta/schemas/block.py` → `Block`: a reserved, named, optionally limited section of the window (`limit` chars), with `read_only` flag (response model marks deprecated but the field and enforcement intent are present).
- `letta/services/tool_executor/core_tool_executor.py` → memory edit is **fail-closed exact-match**: `if old_content not in current_value: raise ValueError(...)`; replace applied only on exact match.

**Assumed authority:** The agent's memory service owns block contents; the overview is derived truth (computed from actual sections), not a separate ledger.

**Failure modes:** Token counts are estimates (tokenizer-dependent); exact-match replace fails on whitespace drift (mitigate: normalize before compare, or structured blocks); deprecated `read_only` in this archive snapshot means enforcement must be re-verified wherever PING implements it — do not rely on a flag the runtime ignores.

**PING comparison:** PING has no context budget concept. Letta's two artifacts — the typed per-section budget overview and the limited/read-only block — are directly portable and tenant-safe (budgets are per-run, not global).

**Red-team:** A budget overview the agent can edit is a lie; the overview must be computed by the assembler, never supplied by the agent. Read-only blocks must be enforced at write time (fail-closed replace is the pattern), not just labeled. Context sections carrying other tenants' data must be impossible by construction: assemble from `(tenant_id, run_id)`-scoped sources only.

**Decision: HARVEST (pattern)**

**Diff sketch** (`src/tenanos/context/blocks.ts`):
```ts
interface ContextBlock { name: string; limitChars: number; readOnly: boolean; tenant_id: string; run_id: string; }
interface ContextBudget { maxTokens: number; currentTokens: number;
  sections: Record<string, { tokens: number }>; } // computed by assembler, read-only to agent
function editBlock(block, oldContent, newContent) { // exact-match, fail closed
  if (!block.content.includes(oldContent)) throw new Error('stale edit base');
}
```

**Delete/avoid:** Do not build context budgeting, per-section limits, or memory-edit conflict handling from zero. The overview schema + block shape + fail-closed replace are the whole design.

---

## Lane 8 — Memory

**PING problem (concrete):** When a tenant corrects a fact ("the shop's summer hours changed"), naive memory systems overwrite or delete the old fact, destroying the evidence trail: what was believed, when, and what superseded it. Replay and audit need the full lineage.

**Candidate:** `getzep/graphiti@13587ea382a86aa6e011ee537ce5e595d078b691` (verified this session)

**Mechanism (source-read):** `graphiti_core/utils/maintenance/edge_operations.py` → `resolve_edge_contradictions(resolved_edge, invalidation_candidates)`: pure timestamp logic. For each contradictory edge whose validity interval overlaps the new edge's: set `edge.invalid_at = resolved_edge.valid_at` and `edge.expired_at = now()`. The old edge is **never deleted**; it is expired with a precise bitemporal boundary (valid-time + transaction-time).

**Assumed authority:** Graphiti assumes its edge store is the memory authority and that an LLM pass proposes contradictions; the timestamp logic itself is deterministic and portable.

**Failure modes:** Contradiction *detection* is heuristic/LLM-driven (the invalidation math is exact, the candidate selection is not) — PING must keep detection and invalidation as separate steps with the detection step auditable; backdated `valid_at` values can create overlapping intervals the simple comparison mishandles (mitigate: normalize to UTC, reject `valid_at` in the future beyond a skew bound).

**PING comparison:** PING's memory story is unbuilt at the substrate level. Graphiti's invalidation math is the correct primitive: corrections supersede, never delete.

**Red-team:** Memory corrections must supersede history rather than delete it — verified as the mechanism's core property. A "forget" request is a new edge with `invalid_at`, not a row delete; true erasure (legal/privacy) is a separate, explicitly-authorized operation, never the default correction path. Tenant isolation: contradiction candidates must be scoped to `(tenant_id)` or one tenant's facts invalidate another's.

**Decision: HARVEST (pattern)**

**Diff sketch** (`src/tenanos/memory/invalidation.ts`):
```ts
// Bitemporal supersession. Never deletes.
function invalidateSuperseded(newFact: { validAt: string }, candidates: Fact[]): Fact[] {
  // for each candidate with overlapping validity: candidate.invalidAt = newFact.validAt;
  // candidate.expiredAt = now(); return invalidated list for the journal
}
```

**Delete/avoid:** Do not build temporal invalidation logic or a "memory versioning" scheme from scratch. The ~20-line timestamp comparison is the entire mechanism; keep detection (heuristic) separate from invalidation (deterministic).

---

## Lane 9 — Budgeting

**PING problem (concrete):** An autonomous tenant loop with no spend bound is a runaway-bill machine: a stuck agent can burn model, token, and tool-call budget indefinitely. The bound must be *enforced* (fail closed), not merely observed.

**Candidates:**
- `pydantic-ai` at `c093fe1df8c46ae975b2382de63a30fdea586bef` (verified: `pydantic_ai_slim/pydantic_ai/usage.py`)
- `diegosouzapw/OmniRoute@18bbb101980c639cfabdc5663213836d917c3269` (verified: `src/lib/quota/enforce.ts`)

**Mechanism (source-read):**
- PydanticAI `UsageLimits`: `cost_limit`, `request_limit` (default 50), `tool_calls_limit`, `input_tokens_limit`, `output_tokens_limit`, `total_tokens_limit`, `per_request_input_tokens_limit`. `check_before_request` raises `UsageLimitExceeded` *before* the next model request; token limits checked after each response. Fail-closed by construction.
- OmniRoute `enforce.ts`: pre-request `enforceQuotaShare` + post-response `recordConsumption`, BUT the file's own header documents **B16: fail-open — any error from store/plan/saturation is caught and treated as "allow"** and **B29: recordConsumption failures never propagate (drift is acceptable)**.

**Assumed authority:** PydanticAI assumes the agent framework is the enforcement point. OmniRoute assumes quota is advisory cost-sharing, not a security boundary — its own comments say so.

**Failure modes:** Fail-open quota (OmniRoute) under store outage = unbounded spend exactly when you most need the bound; request-count limits without token limits miss the real cost driver; per-request limits without cumulative limits miss slow-burn loops (PydanticAI has both; keep both).

**PING comparison:** No spend bound exists at the substrate level. PydanticAI's shape (pre-request check + post-response accounting, cost + request + token + tool-call dimensions) is the right enforcement primitive, bound to the Run's budget snapshot.

**Red-team:** OmniRoute's quota engine is **explicitly fail-open by design** — safe for its cost-sharing purpose, unsafe as PING's spend authority. Any PING budget enforcement must fail closed: on accounting failure, deny the next request, do not allow it. Budget state must be `(tenant_id, run_id)`-scoped; a shared pool without tenant partitioning lets one tenant burn another's budget.

**Decision: HARVEST PydanticAI UsageLimits (pattern); REJECT OmniRoute quota as spend authority**

**Diff sketch** (`src/tenanos/budget/limits.ts`):
```ts
interface RunBudget { costLimitUsd?: number; requestLimit?: number; tokenLimit?: number;
  toolCallLimit?: number; spent: { costUsd: number; requests: number; tokens: number; toolCalls: number }; }
function checkBeforeRequest(budget: RunBudget): void; // throws BudgetExceeded; fail CLOSED on accounting error
function recordUsage(budget: RunBudget, usage: Usage): void; // post-response accounting
```

**Delete/avoid:** Do not design a budget schema or limit-check protocol from zero. Do not adopt OmniRoute's quota engine as the enforcement point — its documented fail-open design is the opposite of what a spend bound requires.

---

## Lane 10 — Routing

**PING problem (concrete):** A tenant mission needs model/provider selection (cost, capability, policy) without letting the router become a capability authority: the router may decide WHERE/HOW a call executes, never WHETHER the tenant is allowed the capability.

**Candidate:** `diegosouzapw/OmniRoute@18bbb101980c639cfabdc5663213836d917c3269` (verified this session)

**Mechanism (source-read):**
- `open-sse/handlers/chatCore/providerExecutionPipeline.ts` → `ProviderExecutionPolicy { allowAccountRotation, allowModelFallback, expectedConnectionId? }`, typed `ProviderExecutionOutcome` (response | error), and a **lease-mismatch guard** (`leaseMismatch`: "Managed lease connection mismatch") that fails a dispatch when the connection doesn't match the expected lease.
- `open-sse/services/autoCombo/strictZeroCostFilter.ts` → `strictZeroCostFilter`: hard filter narrowing candidates to `allowedConnectionIds`, checked per-connection individually.
- `src/lib/resilience/failureClassification.ts` → `classifyProviderFailure`: typed failure classification feeding retry/fallback decisions.

**Assumed authority:** OmniRoute assumes it owns provider credentials and routing policy for its own gateway. PING must not import that assumption — only the pipeline *shape*.

**Failure modes:** Router with an open candidate set becomes a confused deputy (mitigate: router scores/filters only the capability-authorized set handed to it); `allowModelFallback` without policy bounds silently substitutes a cheaper/weaker model (mitigate: fallback allowlist per tenant); lease-mismatch errors must be terminal for that dispatch, not retried against the same connection.

**PING comparison:** No routing seam exists. OmniRoute's pipeline — hard filters first, policy-gated fallback, lease-mismatch guard, typed outcomes — is the right shape for a seam *under* PING's capability decision.

**Red-team:** The router must only score/filter a capability-authorized candidate set. Model/provider routing may decide WHERE/HOW, never WHETHER. The capability decision (Lane 6's policy) produces the authorized set; the router picks within it. A routing receipt (which provider/model/connection served the call, with the policy version) goes to the journal for cost attribution.

**Decision: HARVEST (constrained pattern)**

**Diff sketch** (`src/tenanos/routing/pipeline.ts`):
```ts
interface RoutingPolicy { allowModelFallback: boolean; allowedModels: string[]; expectedConnectionId?: string; }
// Input: capability-AUTHORIZED candidate set only. Output: chosen target + routing receipt.
async function routeCall(authorized: Candidate[], policy: RoutingPolicy): Promise<{ target: Candidate; receipt: RoutingReceipt }>;
```

**Delete/avoid:** Do not build a provider pipeline, failure classifier, or hard-filter mechanism from zero. Do not build (or import) a credential-owning gateway — PING needs the routing *seam*, not OmniRoute's gateway.

---

## Lane 11 — Sandboxing

**PING problem (concrete):** Tenant agents execute tools that run shell commands and code. Without an execution bound, a compromised or buggy tool runs with the worker's full privileges: filesystem, network, and process table. The bound must be declarative, per capability class, and enforced by the OS — not by prompt text.

**Candidate:** `google/nsjail@f100fd917c6d3ed0fd15d868528b735cb5fb1a1a` (verified this session; outside the ORCA/OmniRoute/Restate/agent-runtime families — correctly so, because execution isolation is an OS mechanism)

**Mechanism (source-read):**
- `config.proto`: namespace isolation fields default-deny — `clone_newnet`, `clone_newns`, `clone_newpid`, `clone_newipc`, `clone_newuts`, `clone_newcgroup` all default `true`.
- `configs/home-documents-with-xorg-no-net.cfg`: declarative bound example — `time_limit: 1000`, `rlimit_as: 2048` (address-space cap), `seccomp_string` with `KILL_PROCESS` for dangerous syscalls (`ptrace`, `process_vm_readv/writv`) under `DEFAULT ALLOW`, plus cgroup support (`cgroup.cc`/`cgroup2.cc`).

**Assumed authority:** nsjail assumes the config author is trusted and the kernel enforces the rest. It is a mechanism, not a policy engine.

**Failure modes:** `DEFAULT ALLOW` seccomp with a kill-list is weaker than `DEFAULT KILL` with an allow-list — the example config's posture must be inverted for untrusted tenant code; misconfigured bind-mounts silently re-expose the host filesystem (mitigate: mount allowlist reviewed per capability class, tests assert the sandbox cannot see host paths); time_limit kills are SIGKILL — no cleanup (mitigate: the Run journal already records intent; recovery is via Lane 12, not in-sandbox cleanup).

**PING comparison:** No execution bound exists at the substrate level. nsjail's one-config-per-bound model maps to one execution profile per PING capability class.

**Red-team:** Sandboxing the *process* does not sandbox the *credential*: a jailed process that inherits the worker's env still exfiltrates via allowed network paths. Execution profiles must pair namespace/seccomp bounds with credential scoping (no ambient credentials in the sandbox env) and network policy (default no egress; egress allowlist per capability class). The sandbox profile reference belongs in the Run record so verification can prove *which* bound applied.

**Decision: HARVEST (mechanism class)**

**Diff sketch** (`src/tenanos/sandbox/profiles.ts` + profile configs):
```ts
interface ExecutionProfile {
  name: string;               // e.g. 'tool-shell', 'code-exec'
  namespaces: { net: boolean; pid: boolean; mount: boolean }; // default all true
  seccomp: 'default-kill' | 'default-allow';                  // default-kill for tenant code
  rlimits: { asBytes: number; cpuSec: number; nproc: number };
  timeLimitSec: number; networkEgress: 'none' | string[];    // allowlist
  credentialScope: 'none' | 'run-scoped';
}
// Run record carries execution_profile name; receipts carry profile hash.
```

**Delete/avoid:** Do not build a sandbox from scratch (seccomp-bpf, namespaces, cgroups are kernel features with a 10-year-hardened implementation in nsjail). Build only the *profile registry* mapping PING capability classes to declarative nsjail configs, plus the receipt wiring.

---

## Lane 12 — Recovery

**PING problem (concrete):** A worker dies mid-mission (crash, deploy, OOM). The mission must make progress again without double-executing effects and without a human paging in. "Just restart the worker and resume in place" is how you get two workers writing as one.

**Candidate:** `dbos-inc/dbos-transact-py@8ee67815fa117c4682ea9397e9566508fdb5405b` (verified prior session)

**Mechanism (source-read):**
- `dbos/_recovery.py`: recovery **re-enqueues** work instead of executing it directly. The recoverer never becomes the executor.
- `dbos/_sys_db.py`: atomic `ENQUEUED → PENDING` dequeue admits exactly one runner (the same single-statement claim shape as Lane 2).
- Recovery predicates on **dead executor IDs**: only workflows whose executor is known-dead are recovered, so duplicate recovery does not steal a live run.

**Assumed authority:** DBOS assumes its system DB is the workflow authority and executor heartbeats are reliable enough to declare death.

**Failure modes:** Declaring an executor dead while it's merely partitioned → two runners (mitigate: death requires lease expiry (Lane 3) + grace, not just missed heartbeats; fencing tokens make the second writer's writes fail); recovery that re-executes instead of re-enqueueing bypasses the claim (mitigate: recovery's only write is the enqueue).

**PING comparison:** CE-002 has expiry reclamation and lost-completion reconciliation into `ping_events` — the instinct is right, but the analog's `renewLease` defect (Lane 3) weakens the death predicate. DBOS's two rules (re-enqueue, never resume in place; recover only dead executors) are the exact hardening.

**Red-team:** Recovery must enqueue and atomically claim, never directly resume in place. The dead-executor predicate must be `lease expired AND grace elapsed`, not heartbeat-missed. Every recovery action emits a journal event naming the dead executor and the new Run (Lane 1) so the lineage is auditable.

**Decision: HARVEST**

**Diff sketch** (`src/tenanos/recovery/recover.ts`):
```ts
// Only rule: the recoverer enqueues; the claim (Lane 2) elects the runner.
async function recoverStuckRuns(now: string): Promise<void> {
  // for each run where lease expired AND isOverdue(run, now, grace): enqueue redrive
  // redrive = new Run (new run_id, attempt+1) claimed via claimTask; never mutate the dead run
}
```

**Delete/avoid:** Do not build a recovery queue, a dead-executor detector, or resume-in-place logic. The mechanism is: overdue predicate (Lane 5) + enqueue + atomic claim (Lane 2) + new Run identity (Lane 1). Composition, not new code.

---

## Lane 13 — Observability

**PING problem (concrete):** Every agent framework invents its own span attribute names (`model`, `model_name`, `llm_model`...), so no query works across the platform and cost/latency dashboards can't be shared. PING needs a standard telemetry vocabulary without making the telemetry system a second evidence authority.

**Candidate:** OpenTelemetry GenAI semantic conventions (verified via current spec docs 2026-09-23; no clone needed — vocabulary only)

**Mechanism (source-read, spec):** `gen_ai.*` namespace — `gen_ai.operation.name` (`chat`, `text_completion`, `embeddings`), `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.input_tokens` / `output_tokens`, `gen_ai.response.finish_reasons`. Metrics: `gen_ai.client.token.usage`, `gen_ai.client.operation.duration`. Prompt/response bodies are **opt-in events only** (PII). Agent/tool-orchestration conventions still experimental — adopt the stable core, not the drafts.

**Assumed authority:** OTel assumes nothing about PING; it's a vocabulary. The risk is PING treating exported spans as evidence.

**Failure modes:** Experimental agent conventions churn (mitigate: pin to the stable core attributes); content capture leaks PII into traces (mitigate: keep the spec's opt-in posture; default metadata-only); high-cardinality attributes (per-prompt text) explode metric cost (mitigate: attributes on spans, never on metric labels).

**PING comparison:** No standard telemetry vocabulary exists. The PING journal (`ping_events`) is the evidence authority; OTel spans are a *projection* of it.

**Red-team:** Observability exporters are projections, not canonical evidence authorities. Every span that matters must carry `(tenant_id, run_id)` so a span can be anti-joined against the journal: a span with no journal lineage is untrusted. Never debug from traces alone when the journal disagrees — the journal wins.

**Decision: HARVEST (vocabulary only)**

**Diff sketch** (`src/tenanos/observability/semconv.ts`):
```ts
// Thin mapping: PING journal event -> OTel gen_ai.* span attributes. Projection only.
function toGenAiAttributes(evt: JournalEvent): Record<string, string> {
  // gen_ai.operation.name, gen_ai.provider.name, gen_ai.request.model,
  // gen_ai.usage.input_tokens/output_tokens, plus tenant_id + run_id for journal anti-join
}
```

**Delete/avoid:** Do not invent a custom span taxonomy, a proprietary LLM-observability SDK, or a second evidence store. Adopt the `gen_ai.*` attribute names; the only PING-specific code is the journal-to-span projection plus the anti-join invariant.

---

## Consolidated: what PING can delete or avoid building

Because these mechanisms exist (verified at pinned SHAs above), the TenantOS substrate does **not** need:

1. A durable-execution framework or replay engine (Restate) — add Run identity + journal vocabulary (~40 lines of schema).
2. A claim service, distributed lock manager, or Redis mutex (Hatchet) — one SQL statement.
3. Lease infrastructure from scratch (Hatchet) — holder-bound CAS renewal; the P0 is a predicate fix.
4. A checkpoint schema or snapshot subsystem (LangGraph) — re-key the proven field set.
5. A sweeper/reaper service or cron-based reconciliation (Dapr) — one pure overdue predicate wired into read paths.
6. MCP auth middleware or a tool-annotation trust model (FastMCP) — two-phase list-filter + call-recheck shape.
7. Context budgeting, per-section limits, or edit-conflict handling from zero (Letta) — overview schema + block shape + fail-closed replace.
8. Temporal memory-versioning logic (Graphiti) — the ~20-line bitemporal invalidation comparison.
9. A budget schema or limit protocol (PydanticAI) — adopt UsageLimits dimensions; reject OmniRoute's fail-open quota as authority.
10. A provider pipeline, failure classifier, or hard-filter mechanism (OmniRoute) — adopt the pipeline shape as a seam under PING's capability authority.
11. A from-scratch sandbox (nsjail) — build only the profile registry mapping capability classes to declarative configs.
12. A recovery queue or resume-in-place logic (DBOS) — compose overdue predicate + enqueue + atomic claim + new Run.
13. A custom span taxonomy or second evidence store (OTel) — adopt `gen_ai.*` names; projection only.

**Net new code is deliberately small:** schemas (Run, Lease, Checkpoint, Budget, ContextBlock), four pure functions (claim, overdue predicate, invalidation, budget check), two middleware shapes (tool auth boundary, routing seam), one profile registry (sandbox), and one projection (OTel). Everything else is deleted from the build plan.

## Authority preservation checklist

- [x] No second orchestrator: reconciliation is a pure predicate (Lane 5); recovery re-enqueues through the existing claim (Lane 12).
- [x] No second event authority: Restate journal is per-attempt vocabulary; `ping_events` remains canonical (Lane 1); OTel spans are projections (Lane 13).
- [x] No second capability system: FastMCP middleware *consults* PING's capability decision at list and call time (Lane 6); the router only filters the authorized set (Lane 10).
- [x] Tenant isolation at every boundary: claim keys, leases, checkpoints, budgets, memory candidates, and context assembly are all `(tenant_id)`-scoped by construction.
- [x] Fencing everywhere a stale writer can exist: lease renewal CAS (Lane 3), claim TTLs (Lane 2), dead-executor-gated recovery (Lane 12).

## P0s

- **P0-1 (correctness):** CE-002 analog `renewLease(missionId, ...)` does not require worker identity or fencing token — a stale scheduler can extend a superseded attempt's lease. Fix: `UPDATE ... WHERE tenant_id=? AND run_id=? AND holder=? AND fencing_token=?` (Lane 3). Applies to the inspected analog; verify against the canonical runtime when located.
- **P0-2 (isolation):** Durable per-attempt Run identity is missing — retries are indistinguishable from originals, so journal entries, receipts, and checkpoints cannot attribute to an attempt. Add Run beneath Mission with `tenant_id` bound (Lane 1).
- **P0-3 (safety):** No spend bound is fail-closed. OmniRoute's quota is documented fail-open (B16); do not adopt it as authority. Budget enforcement must deny on accounting failure (Lane 9).

## Open questions

1. Where is the *canonical* current mission runtime? `/home/nolan/projects/ping/src` (website/product repo) surfaced no runtime; all PING comparisons here are against the CE-002 analog. The P0-1 fix must be re-verified against the canonical runtime when located.
2. Postgres vs SQLite for the claim/lease primitives: Hatchet's mechanism is written for Postgres (`FOR UPDATE`, `ON CONFLICT`). The SQLite port preserves semantics for single-node; multi-node needs Postgres row locks or equivalent.
3. nsjail `DEFAULT ALLOW` vs `DEFAULT KILL` seccomp posture per capability class needs a per-class decision; the example config's posture must be inverted for untrusted tenant code.
4. Graphiti contradiction *detection* is heuristic — PING needs an auditable detection step before the deterministic invalidation math applies.
5. OTel agent/tool conventions are still experimental — pin to the stable `gen_ai.*` core and revisit.

## Provenance

- Clones (research-only, never committed) at `~/workspace/tenanos-wave/swarm-14/src/`, all `git rev-parse HEAD` verified against the SHAs cited per lane.
- Synthetic experiment: Hatchet claim semantics ported to SQLite, 4/4 PASS (script was `/tmp/hatchet_claim_experiment.py`, ephemeral; semantics recorded in Lane 2).
- PING repo accessed read-only; no repo files written, no branches/commits/pushes, no server disruption. The PING server on Pig port 3100 was not touched.
- License notes: Restate is BSL-1.1 (pattern only, never a dependency); nsjail is Apache-2.0; FastMCP is Apache-2.0; Hatchet is Apache-2.0; LangGraph/Graphiti/Letta/PydanticAI are Apache-2.0/MIT-class; OTel semconv is a vocabulary (no code).

---

## Resume (2026-09-24, SWARM-14 continued after daemon restart ~01:28 UTC)

The sandboxing lane (execution isolation) was undocumented when the previous worker lost
its runtime handle. It is now complete: see `SANDBOX-EVALUATION.md` (this directory).

- Decision: HARVEST nsjail as the OS mechanism (external pinned binary, never vendored).
  Hatchet-for-sandboxing DROP (authorization != isolation). Custom sandbox DROP.
  Docker-per-tool DROP. gVisor/Firecracker DEFER to a future outer layer.
- Evidence: source-read of vendored nsjail@f100fd917c6d3ed0fd15d868528b735cb5fb1a1a
  (config.proto policy shape; unshare flags subproc.cc:527-538; seccomp install
  sandbox.cc:122; kafel in-tree; default-deny example configs); kernel 7.0
  namespace-isolation experiment 3/3 PASS; 12/12 runtime checks on the proposed
  `src/tenanos/sandbox/profiles.ts` PASS.
- Pruned vendored trees per the anti-bloat directive: 171M / 1817 files -> 1.5M /
  103 files. Kept nsjail (evaluation evidence). Pruned: hatchet, restate, fastmcp,
  graphiti, omniroute, letta-archive, openhands. All re-fetchable via `clone.sh`
  at the pinned SHAs recorded above.
- Filed `../diffs/P-20260923-012.diff` for the existing STATE.json proposal
  P-20260923-012 ("Sandbox execution profile registry (nsjail mechanism)"); no new
  proposal ID minted (reusing the existing claim avoids a self-overlap on
  `src/tenanos/sandbox/profiles.ts`). Overlap check vs all non-terminal
  proposals: clean. STATE.json patch staged at `P-20260923-012.state-update.json`
  for the coordinator to apply (swarms do not mutate STATE.json).
