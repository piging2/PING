# CRX / FYD PRE-SPRINT DEEP AUDIT — MEMORY × MCP × OBSERVABILITY

**Daily-diff anchor (copy forward tomorrow):** `date=2026-09-22` · `HEAD=cc6856c3bc78e0535e66f168c66dc31abee2c073` · branch `refactor/runtime-authority-convergence` · brain-postgres `ping_runtime`: 2321 ping_events / 197 knowledge_nodes (all candidate) / 0 edges / 0 approved · brain-qdrant `knowledge`: 377 pts (~52% fallback vectors) · crx_runtime (stale twin): 739 events · 144/144 missions completed · audit_log/telemetry_metrics/mission_executions: 0 rows each · 30/30 session projections fallback (Ollama unreachable: bad hostname `ping-ollama`) · /knowledge/search: 0 hits in 9h · deployed image `ping-gateway:devin-boundary2` ≠ audited source.

Read-only audit. Nothing built, installed, restarted, or edited. Full evidence: `partials/agent-{a,b,c,d,e,f}-*.md`.

## Deliverables
1. [01-reality-matrix.md](01-reality-matrix.md) — runtime-vs-doc classification of every subsystem
2. [02-memory-map.md](02-memory-map.md) — five memory paths with broken arrows marked
3. [03-mcp-map.md](03-mcp-map.md) — the absent tool-execution path, arrow by arrow
4. [04-observability-map.md](04-observability-map.md) — the one real plane plus phantom surfaces
5. [05-vertical-trace-gap-report.md](05-vertical-trace-gap-report.md) — can CRX prove an agent action? **No** — 7 load-bearing gaps
6. [06-adversarial-test-matrix.md](06-adversarial-test-matrix.md) — 44 tests (10 memory + 18 MCP + 16 observability), P0-first queue
7. [07-harvest-ledger.md](07-harvest-ledger.md) — internal E-01–E-08 + external top-5, ADOPT/ADAPT/REJECT
8. [08-semantic-drift-report.md](08-semantic-drift-report.md) — 11 verified doc-vs-code mismatches
9. [09-minimal-patch-queue.md](09-minimal-patch-queue.md) — dependency-ordered, Tracks A/B ungated, Track C gated
10. [10-execution-plan-24h.md](10-execution-plan-24h.md) — audit-reordered sprint (truth → boundaries → convergence → identity → tests → trace proof → doc truth)

## Runtime-proven (the short list)
- Canonical event journal (`ping_events`, 2321 rows in live store) with causation/correlation lineage and auth-gated traversal
- CanonicalizationService (ingress identity + namespace auth, fail-closed)
- EventGovernance (emit-time policy, fail-closed)
- MissionRuntime (144/144 completed, idempotent, deterministic mission IDs)
- WorkerRuntime + 6 canonical workers (deterministic, lineage-preserving results reified as canonical events)
- HybridSearch retrieval front door + EvidenceAuthority verify/rank (hash+namespace verification, fallback ×0.5)
- Graph projection + EmbeddingService projection (writes live; quality degraded — see below)

## Experimental / shadow (exists, unwired or dormant)
- KnowledgePromoter (registered, no live emitter; 0 approved nodes)
- ToolAuthority, ToolGateway, InferenceAuthority (zero callers; fail-open / weak-validation / stub hazards)
- capability-authority.ts (unconnected to tool path)
- IntelligenceWorker (dormant; unsanitized prompts if re-enabled)
- MissionExecutionAuthority / ExecutionAuthority (never instantiated)
- ConversationMemory + 4 gateway memory authorities + AgentMemoryAuthority + Phase-A RAG trio (zero callers each)
- Metrics/tracing/telemetry classes (unwired; tables empty)

## Documented-but-missing
- MCP client/server/transport of any kind; `.mcp.json`; Composio; `tool_calls` (zero hits repo-wide)
- `beforeMCPExecution`/`afterMCPExecution`; `gateway/hooks/`
- TOOL_* events; tool audit records; Run entity (`run_id`)
- HumanDecision object (ApprovalAuthority is commit-scoped)
- Permission authority module the tool path references
- `infrastructure_adapter_interface.js`, `serializer_authority` (dangling requires break the provider seam)
- Prometheus/Grafana/Tempo/Loki; OpenTelemetry (env fiction only)
- Delete/forget/tombstone/TTL path anywhere

## Top 10 vertical-trace gaps
1. Memory retrieval on the execution path: **ABSENT** (3 implementations, 0 owned by workers)
2. Tool execution: **ABSENT entirely** (no MCP, no tool-call identity, no records; NOT STARTED/STARTED/SUCCEEDED/FAILED/TIMED OUT/CANCELLED/UNKNOWN indistinguishable)
3. Run unit: **ABSENT** (no durable per-attempt execution identity)
4. Action-level authorization: **ABSENT** (ingress policy only; capabilities recorded, never consulted)
5. Correction survival: **BROKEN** (`addNode` ON CONFLICT demotes approved→candidate on re-emission — proven in source logic)
6. Mission lifecycle events carry **no `causation_id`** (correlated, not causally linked)
7. Knowledge approval gate **never fired** (promoter starved; 0 approved nodes)
8. Vector memory **degraded** (52% seeded-PRNG fallback vectors; Ollama unreachable via bad hostname)
9. Retrieval **unconsumed and unauthenticated** (0 consumers; caller-asserted namespace; post-retrieval JS filter only)
10. **No forgetting path**; untrusted inputs (reviews, commits) projected into memory with no trust gate

## Top internal harvest candidates (ADOPT/ADAPT)
1. PQ-2: duplicate-suppression early return + integration-trace enrichment (ADOPT — fixes real double-dispatch)
2. PQ-3: canonical event-ID minting V2 (ADAPT — replaces insertion-order-sensitive `JSON.stringify` IDs)
3. PQ-1: llhttp runtime-identity era fix (ADOPT — 9 lines, tested)
4. PQ-9: namespace-required + bounded + evidence-verified context primitives (ADOPT — smallest tenant guardrail)
5. E-04: durable objective/work-order/attempt identity (ADAPT IDs only; **REJECT the pool advisory-lock helper as unsound**)

## Top external harvest candidates (patterns, zero new authorities)
1. OTel GenAI semantic-convention shapes → optional fields on canonical events (no SDK)
2. Idempotency-Key + Postgres first-write-wins + generation fencing (pre-tool-ship design)
3. Pino structured logging (**the one proposed dependency**)
4. Anthropic context-engineering doctrine (write/select/compress/isolate) for worker context assembly
5. OTTL-shaped redaction rules at the `emit()` boundary

## Adversarial test queue (P0 first)
T7 correction survival → T11 secret scrubbing + T13 size cap at `emit()` → T8 health honesty → T4 audit plane + T17 dispatch journal → UNKNOWN-OUTCOME state machine + T1/T2 idempotency design → T1/T2 correlation integrity → T3 poisoned-memory (gates IntelligenceWorker re-enablement). Full matrix: [06](06-adversarial-test-matrix.md).

## Proposed patch order
**Track A (ungated):** PQ-1 llhttp → PQ-2 dedupe early return → PQ-3 correction survival → PQ-5 mission causation → PQ-4 canonical minting → PQ-6 collision witness. **Track B (ungated):** PQ-7 emit size cap + redaction → PQ-8 request_id + health honesty → PQ-9 context primitives → PQ-10 write-anchoring gate. **Track C (gated):** PQ-11 memory convergence → PQ-12 Run unit → PQ-13 tool plane + dispatch journal → PQ-14 promotion emitter → PQ-15 Pino.

**Files that would change:** `ping-runtime/events/unified_event_runtime.js`; `runtime/kernel` identity modules; `gateway/knowledge_graph.js` + graph subscriber; `ping-runtime/orchestration/mission_runtime.js`; health routes + `ui-next` header; ContextCompiler/HybridSearch call sites; test suite. New: ID-minting module, collision-witness emitter, redaction rule table.

**New dependencies proposed:** Pino only (gated). Everything else zero.

## Unresolved operator questions (grill — GRILLING-BRIEF.md NOT modified)
1. **Topology:** which DB is the live write target — brain-postgres (`ping_runtime`, 2321 events) or ping-postgres (`crx_runtime`, 739)? (Agent A: gateway env → brain-postgres. Agents C/D surveyed ping-postgres. Not settled read-only.)
2. **Memory authority:** which of the three live memory implementations survives — event-sourced read API, Qdrant projections, or knowledge graph?
3. **Human-signal ingress:** what emits `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` — UI, route, or future agent? (Promoter starved; 0 approved nodes.)
4. **Run unit:** is Mission→Run→Executions the auditable unit, and where does Run live?
5. **Tool plane:** ToolAuthority, ToolGateway, merge, or greenfield on capability-authority.ts? Is MCP wanted or is "tool" the requirement?
6. **Identity convergence:** JS legacy authorities vs TS CanonicalIdentityService vs Python — which is canonical? (Gated: `cryptographic-authorities.ts` SHA-256 is fake — bit-shift hash — out of sprint scope but must not be forgotten.)
7. **Fallback-vector policy:** fix Ollama reachability (bad hostname `ping-ollama`), keep seeded fallback vectors, or pause projection? (52% of sampled points are meaningless; 30/30 this session.)
8. **Qdrant:** revive (fix probe; it answers 1.18.2), replace, or retire?
9. **Forgetting story:** ADD-only-with-audit as permanent posture, or is a purge/tombstone path planned? (First PII/retraction request needs an answer.)
10. **Ingestion from dead worktree tables** (D-10/`IDENTITY_SEMANTIC_SPLIT` etc.): verify before citing — status unverified at cc6856c3.

## GO / NO-GO for the 24-hour mutation sprint
**CONDITIONAL GO — Tracks A and B proceed now; Track C starts only on operator answers.**

- GO now: the sprint's first two tracks (event/identity truth, store boundaries) are fully specified, dependency-ordered, test-covered, and authority-safe. They do not depend on any unresolved question.
- NO-GO until answered: memory convergence, tool plane, and Run unit. The audit's central finding is that the agentic loop does not exist in the runtime; building retrieval wiring, a tool plane, or execution identity against the wrong authority would create the second-authority problem this whole audit exists to prevent.
- Preconditions before any mutation: fresh worktree off cc6856c3 (main worktree has 16 dirty files); settle the live-DB topology question read-only first (every runtime observation must state which DB it read); resolve the deployed-image divergence (devin-boundary2 ≠ audited source) before trusting live behavior.

**Audit footer:** HEAD `cc6856c3bc78e0535e66f168c66dc31abee2c073` · coverage: full tree source (cc6856c3) + live brain-postgres/brain-qdrant + docker/log/HTTP read-only surfaces + 6 lane reports · 44 adversarial tests designed (none executed) · 15 patches specified (10 ungated, 5 gated) · new deps: 1 (Pino, gated).
