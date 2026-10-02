# AGENT F — External Best-Practice Harvest + Semantic Drift Report

**Lane:** F (external research + documentation-vs-runtime contradictions)
**Repo:** /home/nolan/ping @ cc6856c3bc78e0535e66f168c66dc31abee2c073, branch refactor/runtime-authority-convergence
**Date:** 2026-09-22
**Method:** read-only via Pig bridge (pigwsl-run.sh). Working tree was DIRTY at audit time (M gateway/package.json, gateway/package-lock.json, ping-runtime/orchestration/execution/capability_registry.json, tools/fyd-site-projection/dump.py; untracked deliverables/). All drift evidence below is from committed HEAD unless noted.
**Scope boundary:** memory/MCP/observability/vertical-trace INTERNALS belong to sibling agents. This report covers external patterns and doc-vs-runtime contradictions only.

---

## LANE 1 — EXTERNAL HARVEST LEDGER

### Topic A: MCP security and authorization

**A1. MCP OAuth 2.1 authorization profile (spec, 2025-06-18 era)**
- SOURCE: modelcontextprotocol.io specification, basic/authorization (2025-06-18 revision)
- PINNED: spec revision 2025-06-18 (handshake era); current draft revision 2026-07-28 is stateless
- PRIMITIVE: MCP server as OAuth 2.1 resource server. Mandatory PKCE, RFC 9728 protected-resource metadata at /.well-known/oauth-protected-resource, RFC 8414 authorization-server metadata, RFC 8707 resource indicators with audience validation, RFC 7591 dynamic client registration
- PROBLEM SOLVED: token replay across services, client impersonation, discovery of auth endpoints without manual config
- CRX EQUIVALENT: PARTIAL. Commit 0f09387a9 "Constitutional Security Hardening: RBAC, JWT, Ed25519 Signatures"; PING Core v1 commit mentions an OAuth framework. No MCP-shaped OAuth 2.1 profile (protected-resource metadata, audience validation)
- DELTA: CRX has authN primitives (JWT/RBAC/Ed25519) but no resource-server profile: no RFC 9728 metadata, no RFC 8707 audience binding, no scope-filtered tool listing
- DECISION: ADAPT
- RATIONALE: when MCP is rebuilt, adopt the profile shape (audience-bound tokens, scope-filtered tools/list) without importing an MCP framework. Zero new dependency. Relevant now as a checklist, not code

**A2. OWASP AISVS C10 MCP Security controls**
- SOURCE: github.com/owasp/aisvs, 1.01-dev/en/0x10-C10-MCP-Security.md
- PINNED: 1.01-dev branch (2026-09, active development)
- PRIMITIVE: verification controls C10.1 (component integrity: trusted sources, allow-listed servers, least-privilege sandbox) and C10.2 (authN/Z: per-request token validation, issuer/audience/expiry/scope claim validation, no token persistence on resource servers, tools/list returns only in-scope tools, per-invocation access control on tool AND argument values, session artifact cleanup)
- PROBLEM SOLVED: turns "we do MCP securely" into testable assertions
- CRX EQUIVALENT: PARTIAL. RBAC/JWT exist; no per-invocation tool+argument authorization control; no session-artifact cleanup control
- DELTA: CRX lacks the control list itself; C10.2.4 (scope-filtered discovery) and C10.2.5 (per-invocation argument authorization) are the two highest-value gaps
- DECISION: ADAPT
- RATIONALE: adopt as a verification checklist for the gateway/tool layer. Zero dependency. The repo's own audit culture (gates, ledgers) fits this control format natively

**A3. NSA MCP Security Design Considerations (May 2026)**
- SOURCE: nsa.gov CSI_MCP_SECURITY.pdf, Ver 1.0 May 2026
- PINNED: U/OO/6030316-26, PP-26-1834, Ver 1.0
- PRIMITIVE: gap analysis: bearer-token lifecycle (refresh/revocation/reuse) unspecified in core MCP; idempotency NOT enforced by MCP, left to JSON-RPC/message queue layers; session hijacking enables prompt injection without detection
- PROBLEM SOLVED: names the exact residual risks even in spec-compliant MCP deployments
- CRX EQUIVALENT: PARTIAL. CRX's own IdempotencyManager doc is DOCUMENTED_ONLY (see drift D-05); event-level idempotency is real (content-derived event_id)
- DELTA: confirms CRX's instinct (deterministic event IDs) is the right layer to fix what MCP leaves unspecified
- DECISION: ADAPT
- RATIONALE: use as the threat-model input for the tool-execution layer: token lifecycle + idempotency must be CRX-owned, not delegated to any MCP SDK. Zero dependency

### Topic B: MCP lifecycle

**B1. MCP handshake-era lifecycle (2025-06-18 / 2025-11-25)**
- SOURCE: MCP specification lifecycle docs; third-party verified summaries (ludwigsolutionsai/ai-engineering-from-scratch lesson 11; kowyo/mini-agent research)
- PINNED: spec revisions 2025-06-18, 2025-11-25
- PRIMITIVE: initialize (protocolVersion + capabilities + clientInfo) -> server responds (version, capabilities, serverInfo) -> notifications/initialized -> tools/list discovery -> tools/call -> shutdown. Version skew produces explicit compatibility failure
- PROBLEM SOLVED: capability negotiation before data flows; no implicit capability assumptions
- CRX EQUIVALENT: NONE live (mcp/ping_mcp_server.py is a 2026-06 Python thin proxy; repo's own 2026-09-20 log says "MCP deleted")
- DELTA: if MCP returns, the negotiation-first pattern (never call a method because another server supported it) should be adopted as doctrine
- DECISION: ADAPT
- RATIONALE: adopt the doctrine (explicit capability negotiation, version-skew-as-failure), not an SDK. Zero dependency. Note the spec itself moved on (see B2)

**B2. MCP stateless modern era (2026-07-28)**
- SOURCE: modelcontextprotocol.io specification 2026-07-28 (via third-party verified summaries; treat as directional, not verbatim spec)
- PINNED: spec revision 2026-07-28
- PRIMITIVE: no initialize handshake; every request carries protocol version + client identity + capabilities in _meta; mandatory server/discover RPC; sessions removed; Sampling/Elicitation/Roots moved to negotiated extensions
- PROBLEM SOLVED: horizontal scalability (any instance serves any request), removes session state as failure mode
- CRX EQUIVALENT: NONE
- DELTA: a future CRX MCP surface should target the stateless shape, not the handshake shape; handshake-era SDKs are legacy
- DECISION: ADAPT (doctrine only)
- RATIONALE: stateless-per-request identity metadata aligns with CRX's event-spine model (every event carries namespace/causation/correlation). Zero dependency. Do not build on handshake-era assumptions

**B3. MCP Elicitation (user-in-the-loop input collection)**
- SOURCE: MCP specification, elicitation (handshake-era; extension in 2026-07-28)
- PINNED: 2025-06-18 era
- PRIMITIVE: server requests structured user input mid-tool-call through the client/host (the consent arbiter), instead of the model improvising
- PROBLEM SOLVED: approval-shaped interactions without the tool faking user consent
- CRX EQUIVALENT: PARTIAL. gateway/approval_authority.js exists but is commit-scoped (pre-commit gate), no general HumanDecision object
- DELTA: CRX has the approval primitive but no mid-execution elicitation path from tool runtime to user
- DECISION: ADAPT
- RATIONALE: when a general HumanDecision object is designed, the elicitation shape (server asks host, host arbitrates consent, structured schema) is the right pattern. Zero dependency

### Topic C: Tool execution identity and idempotency

**C1. Idempotency-Key header pattern (Stripe-style)**
- SOURCE: Stripe API idempotency; pavel-karpenko/idempotencymiddleware (Go); ucsandman/dashclaw durable-execution-finality.md
- PINNED: dashclaw doc 2026-09; idempotencymiddleware HEAD
- PRIMITIVE: client-supplied Idempotency-Key; server first-write-wins on (org, key); replay returns recorded result with Idempotent-Replayed marker; key derived from intent (agent_id + action_type + scope + request_id), never timestamps
- PROBLEM SOLVED: safe retry of the create phase; exactly-once side effects across redelivery
- CRX EQUIVALENT: PARTIAL. Event level: real (deterministic content-derived event_id in UnifiedEventRuntime.emit, "idempotent retries preserved"). Tool/API level: DOCUMENTED_ONLY (IdempotencyManager doc, no implementation, see D-05)
- DELTA: the missing layer is tool-call idempotency keys, not event idempotency
- DECISION: ADAPT
- RATIONALE: implement at the tool-dispatch layer on Postgres (unique constraint on idempotency key, recorded-result replay). Zero new dependency. Highest leverage per unit of work in this ledger

**C2. Reservation + generation fencing (aws-samples/sample-citadel TOOL_IDEMPOTENCY.md)**
- SOURCE: github.com/aws-samples/sample-citadel, docs/TOOL_IDEMPOTENCY.md
- PINNED: HEAD 2026-09
- PRIMITIVE: conditional first-write-wins reservation (DynamoDB TransactWriteItems in their case); per-node dispatchGeneration incremented on every pending->running transition; worker carries its generation; stale workers fenced in the SAME atomic write as the reserve (no read-then-check TOCTOU); concurrent loser bounded-polls winner's result
- PROBLEM SOLVED: split-brain double execution under watchdog re-dispatch; crash-between-effect-and-commit
- CRX EQUIVALENT: PARTIAL. Deterministic event IDs dedupe emissions; no reservation/fencing primitive for tool workers
- DELTA: CRX needs the fence, not just the key: key alone does not stop a stale re-dispatched worker
- DECISION: ADAPT
- RATIONALE: port the pattern to Postgres (advisory lock exists at gateway/advisory_lock.js; use INSERT .. ON CONFLICT + generation column). Zero new dependency. This is the "exactly-once tool execution" primitive CRX's replay story needs

**C3. Checkpoint-decision-then-act (gollem-dev/agentkit execution-model.md)**
- SOURCE: github.com/gollem-dev/agentkit, docs/execution-model.md
- PINNED: HEAD 2026-09
- PRIMITIVE: split the decision transition (durable commit of intent) from the act transition; on replay, check Attempt().IsReplay() and ask alreadyApplied(operationID) before re-executing; idempotency keys stop duplicates, not divergence
- PROBLEM SOLVED: crash after effect but before commit (effect happened, state has no record); replay deciding on a different action
- CRX EQUIVALENT: PARTIAL. CRX has transition objects (PingTransition: propose/approve/publish) and causal event metadata; no explicit decide-then-act split with replay-attempt detection
- DELTA: a named "attempt" concept with replay detection on the worker side
- DECISION: ADAPT
- RATIONALE: doctrine-level adoption in worker design (commit intent as event before acting; replay checks recorded outcome first). Zero dependency. Pairs with C1/C2

**C4. Tool execution identity (workload identity shape)**
- SOURCE: SPIFFE/SPIRE workload identity pattern (industry standard); MCP clientInfo/serverInfo identity exchange
- PINNED: SPIFFE standard (stable)
- PRIMITIVE: every tool call carries a verifiable caller identity (who invoked: which agent, which run, which capability grant), distinct from the human user identity
- PROBLEM SOLVED: auditability of agent-initiated actions; least-privilege per capability grant
- CRX EQUIVALENT: PARTIAL. capability-authority.ts exists (runtime/kernel/capabilities/); IdentityAuthority.generateToolId gives tools deterministic IDs; no per-call caller-identity binding observed in the sampled paths
- DELTA: bind caller identity (agent/run/capability-grant) to each tool invocation, recorded in the event
- DECISION: ADAPT
- RATIONALE: CRX already has the identity and capability authorities; the gap is binding them per call. Zero dependency. Do not import SPIFFE; the pattern is what matters

### Topic D: Agent memory

**D1. Mem0 memory layer (factual/episodic/semantic/working; Mem0g graph)**
- SOURCE: github.com/mem0ai/mem0; paper arXiv 2504.19413; docs.mem0.ai
- PINNED: mem0 OSS HEAD 2026; paper April 2025
- PRIMITIVE: extract-store-retrieve-manage loop; memories scoped by user_id/agent_id/run_id; add/search/update/delete; Mem0g adds entity-relation triplets on graph backends (Neo4j/Memgraph/Kuzu)
- PROBLEM SOLVED: stateful agents without stuffing history into context; +26% on LOCOMO vs OpenAI memory, 91% faster than full-context, 90% lower tokens (their numbers)
- CRX EQUIVALENT: NONE live. Memory chain docs (2026-06 certifications) are ARCHAEOLOGICAL; Qdrant dormant
- DELTA: everything. CRX's memory substrate would need extraction, scoping, retrieval, and update semantics
- DECISION: REJECT as dependency; ADAPT selected patterns
- RATIONALE: Mem0 as a dependency adds a service, an embedding pipeline, and a vector DB to operate, and its memory model (user-preference personalization) is not CRX's model (evidence-backed object graph with provenance). What transfers without the dependency: memory scoping by (user, agent, run); the add/search/update/delete operation shape; single-pass extraction. CRX's journal (ping_events) plus projections is the right substrate; memory should be a projection, not a second system

**D2. Zep temporal knowledge graph (bi-temporal edges)**
- SOURCE: Zep (getzep.com); temporal knowledge graph design
- PINNED: Zep 2026
- PRIMITIVE: bi-temporal edge writes (valid time + transaction time); graph traversal + vector + BM25 + temporal retrieval; built for auditability
- PROBLEM SOLVED: "what did we know and when did we know it" for agent memory; regulated-enterprise audit trail
- CRX EQUIVALENT: PARTIAL. CRX has lineage_authority.js and event timestamps via ConstitutionalTimeAuthority, but no bi-temporal memory edges
- DELTA: the bi-temporal distinction (event time vs record time) on memory facts
- DECISION: REJECT as dependency; ADAPT the bi-temporal pattern
- RATIONALE: same dependency argument as D1 (Neo4j to operate). The bi-temporal idea ports cleanly to CRX's own event schema (add valid_time alongside the authoritative timestamp). Zero dependency

**D3. LoCoMo benchmark (memory evaluation)**
- SOURCE: LoCoMo long-conversation memory benchmark (used by Mem0 paper)
- PINNED: benchmark as cited April 2025
- PRIMITIVE: long-dialogue QA benchmark measuring memory retrieval quality over extended conversations
- PROBLEM SOLVED: objective memory-quality measurement instead of vibes
- CRX EQUIVALENT: NONE
- DELTA: no memory eval harness of any kind
- DECISION: ADAPT
- RATIONALE: when CRX rebuilds memory, adopt a LoCoMo-shaped eval (long dialogue, fact recall, temporal questions) as the acceptance gate. Zero dependency; it is a test corpus shape, not a library

### Topic E: Memory provenance and retrieval evaluation

**E1. Memory provenance (citation/authority-chain pattern)**
- SOURCE: Mem0g lineage via entity edges; PING's own ping_mcp_server.py search_constitutional_memory docstring ("lineage resolution traces back to truth sources; authority verification ensures constitutional compliance")
- PINNED: n/a (pattern)
- PRIMITIVE: every retrieved memory carries citations to source observations and an authority chain; TRUTH != EMBEDDINGS (embeddings are projections, sources are truth)
- PROBLEM SOLVED: hallucinated memory presented as fact; uncorrectable memory
- CRX EQUIVALENT: PARTIAL. Lineage authority exists for events; EvidenceAuthority is the live verification path (per SLICE3C matrix); no memory-specific provenance since memory is dormant
- DELTA: when memory returns, each memory must resolve to source event_ids
- DECISION: ADAPT
- RATIONALE: this is already CRX's constitutional instinct (evidence authority, lineage). Formalize it as a memory invariant: no memory without source event_ids; correction propagates by superseding, not editing. Zero dependency

**E2. Ragas (retrieval/answer quality metrics)**
- SOURCE: Ragas (github.com/explodinggradients/ragas)
- PINNED: ragas 2026
- PRIMITIVE: reference-free and reference-based metrics: faithfulness, answer relevancy, context precision/recall, context entity recall
- PROBLEM SOLVED: retrieval quality as a number with a trend line
- CRX EQUIVALENT: NONE (PHASE43 retrieval verification was a specification doc)
- DELTA: a metrics vocabulary for "is retrieval working"
- DECISION: ADAPT (metrics, not the library)
- RATIONALE: adopt faithfulness + context precision/recall as the retrieval scorecard; implement with CRX's own judge calls when needed. Adding the ragas dependency buys dataset plumbing CRX does not need yet

### Topic F: Observability

**F1. OpenTelemetry GenAI semantic conventions**
- SOURCE: opentelemetry.io/docs/specs/semconv/gen-ai/ (official); corroborated by openllmetry issue #3515, Greptime May 2026 summary
- PINNED: semconv v1.38.0 (GenAI namespace still Development/experimental; per-message events deprecated in v1.37 in favor of gen_ai.input.messages / gen_ai.output.messages / gen_ai.system_instructions; flat gen_ai.prompt/completion removed in v1.38)
- PRIMITIVE: span shapes: chat {model} (CLIENT), embedding {model}, invoke_agent {name}, execute_tool {name} (INTERNAL); attributes gen_ai.provider.name, gen_ai.request.model, gen_ai.response.model, gen_ai.usage.input_tokens/output_tokens, gen_ai.response.finish_reasons, gen_ai.response.id, gen_ai.agent.id/name, gen_ai.conversation.id, gen_ai.tool.name/call.id; content capture OPT-IN only
- PROBLEM SOLVED: vendor-neutral, backend-interoperable LLM/agent traces; any OTel backend parses without custom logic
- CRX EQUIVALENT: PARTIAL. causation_id/correlation_id in event metadata (application-level trace grouping); opentelemetry_witness_instrumentation.js exists but UNWIRED (SLICE3C matrix: "witness activation DEFERRED"); no otel deps in any package.json
- DELTA: CRX has homegrown trace grouping but no span model, no token/cost attributes, no standard backend interop
- DECISION: ADAPT
- RATIONALE: adopt the span shapes and attribute names as CRX's trace vocabulary, emitted into the existing event spine (a span becomes events with shared trace_id/span_id). Do NOT add the OTel SDK yet: @opentelemetry/api as a no-op facade is the only acceptable first step, keeping ping_events the single sink. This buys Phoenix/Jaeger/Tempo compatibility later for free. Near-zero dependency cost

**F2. Arize Phoenix (trace-first observability + dataset experiments)**
- SOURCE: github.com/stars1233/phoenix (Arize); docs.arize.com/phoenix
- PINNED: phoenix 4.x (mid-2026)
- PRIMITIVE: OTel-native trace ingest (OpenInference instrumentors) + phoenix.evals (HallucinationEvaluator, QAEvaluator, RelevanceEvaluator) logged back onto spans + datasets/experiments for regression + prompt playground
- PROBLEM SOLVED: the request -> trace -> debug -> fix loop for LLM apps; evals attached to the trace they scored
- CRX EQUIVALENT: NONE (no trace ingest, no eval harness live; trace contract defines what eval harnesses assert against, Phase D)
- DELTA: entire loop
- DECISION: REJECT as dependency; ADAPT the loop shape
- RATIONALE: self-hosting Phoenix is a second stack to operate for a team that already struggles with infra weight (see GRILLING-BRIEF DEPLOY-PROV-001). What transfers: trace-everything via OTel shapes (F1), log eval verdicts back onto the originating trace/event, keep a versioned dataset of regression cases. CRX's event spine can BE the trace store; Phoenix is the reference UI to steal from

**F3. OpenLLMetry / Traceloop (auto-instrumentation)**
- SOURCE: github.com/traceloop/openllmetry
- PINNED: HEAD 2026
- PRIMITIVE: drop-in instrumentation for OpenAI/Anthropic/etc. emitting OTel GenAI semconv spans
- PROBLEM SOLVED: instrumentation without hand-writing spans per provider
- CRX EQUIVALENT: NONE
- DELTA: CRX's inference path is Ollama-first (ollama_adapter.js), which OpenLLMetry does not cover well
- DECISION: REJECT
- RATIONALE: wrong provider fit (Ollama-first), and CRX wants its spans to land in ping_events, not an OTel collector. Hand-instrument the two or three inference call sites with F1 shapes instead

**F4. Pino structured logging**
- SOURCE: pino (github.com/pinojs/pino); already named in CascadeProjects/infra/GATEWAY_INSERTION_PLAN.md:549 as the plan
- PINNED: pino 9.x
- PRIMITIVE: JSON logs, log levels, child loggers with bound context (request/correlation IDs), redact paths for secrets
- PROBLEM SOLVED: ~560 console.log/error/warn calls across gateway/ with no levels, no correlation IDs, no JSON output (PHASE_22_ARCHITECTURE_REVIEW.md:143)
- CRX EQUIVALENT: NONE (no pino/winston in any package.json; verified 2026-09-22)
- DELTA: entire structured-logging layer
- DECISION: ADOPT
- RATIONALE: single dependency, enormous leverage: levels + JSON + correlation-ID binding + redaction paths solve the review's exact findings. pino is the fastest JSON logger in Node and has zero native deps. This is the cheapest ADOPT in the ledger

**F5. W3C Trace Context propagation**
- SOURCE: w3.org/TR/trace-context/ (stable standard); built into OTel SDKs
- PINNED: W3C Recommendation (stable)
- PRIMITIVE: traceparent/tracestate headers propagate trace_id/span_id across process boundaries
- PROBLEM SOLVED: distributed traces that survive hop boundaries (gateway -> worker -> inference)
- CRX EQUIVALENT: PARTIAL. causation_id/correlation_id propagate at the APPLICATION layer inside event metadata; nothing at the transport layer
- DELTA: transport-level propagation for HTTP boundaries
- DECISION: ADAPT
- RATIONALE: adopt the header format when gateway HTTP boundaries need cross-service traces; keep correlation_id as the application-level join key. Zero dependency (20 lines of header parsing). Do not conflate with OTel SDK adoption

**F6. Tail-based sampling + head-based probabilistic sampling**
- SOURCE: OpenTelemetry Collector sampling processors; industry practice
- PINNED: otelcol-contrib (stable pattern)
- PRIMITIVE: head sampling (probabilistic, cheap, decided at span creation) for volume control; tail sampling (decision after seeing the full trace: keep all errors, keep slow traces, drop the boring 99%)
- PROBLEM SOLVED: observability cost control without losing the traces that matter
- CRX EQUIVALENT: NONE
- DELTA: no sampling policy anywhere; if F1 tracing lands without sampling, the event journal becomes the cost center
- DECISION: ADAPT
- RATIONALE: doctrine only for now: when trace emission starts, default to head-probabilistic sampling with tail-retention rules (errors, slow, tool-failure traces always kept). Zero dependency until a collector exists

**F7. High-cardinality control (OTTL cardinality awareness)**
- SOURCE: o11y-dev/opentelemetry-skill references/ottl.md (pattern)
- PINNED: pattern, 2026-09
- PRIMITIVE: never put unbounded values (full URLs, raw IDs, free text) in metric attributes; bucket, parameterize (/users/{id}), or drop; enforce at the emission site
- PROBLEM SOLVED: metric-store explosion, the classic self-inflicted observability outage
- CRX EQUIVALENT: NONE (no metrics pipeline)
- DELTA: policy gap
- DECISION: ADAPT
- RATIONALE: adopt as a lint-level rule for any future metric emission (the WAVE_3H notification subsystem has /metrics + prometheus.yml in Python; the Node gateway has none). Zero dependency

### Topic G: PII and secret redaction

**G1. OTTL transform processor (collector-side redaction)**
- SOURCE: open-telemetry/opentelemetry-collector-contrib, transform processor + OTTL
- PINNED: otelcol-contrib 2026
- PRIMITIVE: declarative statements (replace_pattern, delete_key, delete_key_matching_pattern) applied to spans/logs/metrics in the collector pipeline, ordered: memory_limiter -> redact_pii -> batch
- PROBLEM SOLVED: central, auditable PII scrubbing before data leaves the boundary
- CRX EQUIVALENT: NONE as a pipeline; PARTIAL as policy (dev-key-custody.ts: private key material NEVER goes into ping_events)
- DELTA: policy exists, mechanism does not
- DECISION: ADAPT
- RATIONALE: implement the ORDER and the statement shapes in-code at CRX's emission boundary (a redact function every span/log passes through before persistence/export), since there is no collector. Zero dependency. Processor order (limit -> redact -> batch) is the transferable wisdom

**G2. Redaction strategies (drop / hash / mask / truncate)**
- SOURCE: o11y-dev/opentelemetry-skill references/security.md; go-otel-agent (RodolfoBonis)
- PINNED: pattern, 2026
- PRIMITIVE: drop (passwords, SSNs: complete removal), hash (user IDs, emails: deterministic, correlation-friendly), mask (cards: last-4), truncate (URLs: strip query)
- PROBLEM SOLVED: one-size redaction destroys debuggability; the strategy table preserves correlation where safe
- CRX EQUIVALENT: PARTIAL. Gate P1: os.getenv/process.env clean except configuration_authority/secret_adapter (secrets have a choke point); no span/log redaction
- DELTA: the strategy table applied to telemetry fields
- DECISION: ADAPT
- RATIONALE: adopt the table as CRX's redaction policy; hash (not drop) for actor/user IDs so traces stay joinable. Zero dependency. Pairs with F4 (pino redact paths)

**G3. Defense-in-depth PII for agent telemetry (phi_pii_redaction pattern)**
- SOURCE: github.com/ragkrag/phi_pii_redaction
- PINNED: HEAD 2026
- PRIMITIVE: three layers: (1) sensitive-data capture OFF by default in spans, (2) scrub text with Presidio/custom NER before logging, (3) logging filter intercepting ALL records before export. LLM sees full PII; telemetry never does
- PROBLEM SOLVED: prompt/tool I/O leaking names, emails, SSNs into traces
- CRX EQUIVALENT: NONE
- DELTA: CRX's GenAI tracing (F1) will capture prompts/completions; without this, PII lands in ping_events (append-only, hard to scrub later)
- DECISION: ADAPT
- RATIONALE: the layering is the point: default-off content capture (matches OTel GenAI semconv opt-in rule) + scrub-before-persist. Critical because ping_events is append-only: a PII leak there is permanent. Zero dependency

### Topic H: Context engineering and evaluation

**H1. Anthropic effective context engineering (write / select / compress / isolate)**
- SOURCE: anthropic.com/engineering/effective-context-engineering-for-ai-agents; field synthesis (LangChain, Google ADK converge on the same four)
- PINNED: article 2025; stable doctrine
- PRIMITIVE: WRITE (externalize state to files/scratchpads/memory tools), SELECT (JIT retrieval via lightweight refs, progressive disclosure), COMPRESS (compaction: summarize and restart, keep decisions/bugs/files), ISOLATE (subagents with isolated windows, coordinator resolves at handoffs). Plus: minimal non-overlapping tool sets, token-efficient tool returns, context rot/poisoning/distraction as named failure modes
- PROBLEM SOLVED: agent failures are context failures; "curating beats hoarding"
- CRX EQUIVALENT: PARTIAL (ad-hoc). This audit session itself uses compaction; repo has AGENTS.md files (which the field now treats as the universal instruction format); no formal doctrine
- DELTA: doctrine, not machinery. Named failure modes (rot, poisoning, distraction) have no CRX vocabulary
- DECISION: ADOPT (as practice)
- RATIONALE: zero dependency, pure doctrine. CRX's agent fleet (Hermes, workers, subagents) should run on write/select/compress/isolate explicitly, with context poisoning (untrusted retrieved content treated as data, never instructions) as a named rule. This directly reinforces the system prompt's injection discipline

**H2. Braintrust-style eval CI (evals as gates)**
- SOURCE: braintrust.dev (Evals, CI integration)
- PINNED: platform 2026
- PRIMITIVE: versioned datasets + evaluators run in CI; regressions gate merges
- PROBLEM SOLVED: silent prompt/retrieval regressions
- CRX EQUIVALENT: NONE live (trace contract says eval harnesses assert against it, Phase D)
- DELTA: the harness
- DECISION: REJECT as dependency; ADAPT the gate shape
- RATIONALE: managed platform cost and lock-in for a pre-revenue system; the pattern (dataset + evaluator + CI gate) ports to CRX's own test suite. Phoenix datasets (F2) are the OSS reference if a UI is ever wanted

---

## TOP-5 EXTERNAL CANDIDATES (ranked by capability per dependency cost)

**1. OTel GenAI semantic conventions span/attribute shapes (F1) — ADAPT**
Capability: vendor-neutral trace vocabulary (chat/embedding/invoke_agent/execute_tool spans, gen_ai.* attributes, opt-in content capture) that any OTel backend parses without custom logic; future-compatibility with Phoenix/Jaeger/Tempo. Dependency cost: ZERO (adopt shapes, emit into ping_events; @opentelemetry/api no-op facade only if ever needed). This is the single highest-leverage adoption: it converts CRX's homegrown causation/correlation grouping into an industry-readable trace model without adding infrastructure.

**2. Idempotency-Key + first-write-wins reservation + generation fencing (C1+C2) — ADAPT**
Capability: exactly-once tool execution across redelivery, retries, and watchdog re-dispatch; closes the double-execution gap the NSA paper names and CRX's own doc promises but does not implement. Dependency cost: ZERO (Postgres unique constraint + advisory lock, both already in the stack). Implement at the tool-dispatch layer; the event-level idempotency already proves the pattern works here.

**3. Pino structured logging (F4) — ADOPT**
Capability: JSON logs, levels, correlation-ID-bound child loggers, secret redaction paths; directly resolves PHASE_22's finding of ~560 unstructured console calls. Dependency cost: ONE tiny dependency (pino, zero native deps, fastest Node JSON logger). Cheapest ADOPT in the ledger with immediate debuggability payoff.

**4. Anthropic context-engineering doctrine (H1) — ADOPT**
Capability: named discipline (write/select/compress/isolate) plus named failure modes (context rot, poisoning, distraction) for the agent fleet; poisoning rule reinforces the injection boundary. Dependency cost: ZERO (doctrine, not code). Improves every agent run starting immediately.

**5. OTTL-shaped redaction pipeline + strategy table (G1+G2) — ADAPT**
Capability: central, ordered, auditable PII scrubbing (limit -> redact -> batch; drop/hash/mask/truncate per data class) before telemetry persists. Dependency cost: ZERO (implement the statement shapes in-code at the emission boundary; no collector). Urgency multiplier: ping_events is append-only, so PII in telemetry is permanent. Must land before F1 tracing captures prompt content.

**Explicit rejects and why:** Mem0/Zep/Phoenix/Braintrust as dependencies (all rejected: each adds an operated service and a second source of truth; CRX's journal-plus-projections substrate plus the adapted patterns above covers the capability). OpenLLMetry (rejected: wrong provider fit for Ollama-first, and spans belong in ping_events). Full OTel Collector/SDK (rejected for now: adapt the vocabulary first, add the pipe only when a backend is chosen).

---

## LANE 2 — SEMANTIC DRIFT REPORT (documentation implies stronger capability than runtime reality)

Legend: [OBSERVED FACT] = verified directly in source at HEAD. [SUPPORTED INFERENCE] = follows from evidence but not directly executed. [UNRESOLVED] = could not verify read-only; needs a live check.

### D-01: Repo AGENTS.md claims ping_events does not exist
- CLAIM: "Canonical event store: events table (NO ping_events table exists)"
- SOURCE DOCUMENT: /home/nolan/ping/AGENTS.md, 2026-09-20 session log (HOUR 0-2 pre-flight)
- ACTUAL IMPLEMENTATION: ping_events is the canonical append-only journal. ping-runtime/events/unified_event_runtime.js creates it (CREATE TABLE IF NOT EXISTS ping_events, plus namespace/causation/correlation indexes) and every emit() inserts into it. First introduced 2026-07-29 ("PING Core v1 build-out" commit). runtime/constitutional/src/ping-projector.ts rebuilds all projections from it
- EVIDENCE: [OBSERVED FACT] grep of unified_event_runtime.js lines 44-62 (DDL), line 152+ (INSERT); git log -S ping_events
- CLASSIFICATION: ARCHAEOLOGICAL (stale session note, contradicted by 2 months of source history)
- RECOMMENDED EVENTUAL CORRECTION: annotate or strike the 2026-09-20 AGENTS.md entry; the sprint must treat ping_events as canonical. Low risk of recurrence if session logs get a "superseded" marker convention

### D-02: FINAL_OPERATIONAL_CERTIFICATION.md claims the full memory chain is live and healthy
- CLAIM: "Qdrant: healthy", "Qdrant rebuild path verified", "Qdrant | PASS | 16 documents projected", "Authority: PostgreSQL -> Qdrant -> Mission Control -> MCP -> Open WebUI -> Ollama" (all marked complete/certified)
- SOURCE DOCUMENT: /home/nolan/ping/FINAL_OPERATIONAL_CERTIFICATION.md (undated in header; references QDRANT_OPERATIONAL_PROOF.md, OPENWEBUI_MEMORY_CERTIFICATION.md, QDRANT_PROJECTION_VALIDATION_CERTIFICATION.md)
- ACTUAL IMPLEMENTATION: Qdrant is unhealthy/dormant per current audit context; no docker-compose service found in main tree; the repo's own 2026-09-20 AGENTS.md agent log records "MCP deleted"; configuration-authority.ts still carries QdrantConfig (config present, runtime absent)
- EVIDENCE: [OBSERVED FACT] certification file contents (lines 21, 124-166, 195-203, 307-329); [SUPPORTED INFERENCE] dormant status from audit context + absent compose wiring + "MCP deleted" log entry
- CLASSIFICATION: ARCHAEOLOGICAL (a point-in-time certification, likely June 2026 era, presented without an expiry date)
- RECOMMENDED EVENTUAL CORRECTION: stamp all four certification docs with their verification date and a "point-in-time, not current" banner; decide revive-vs-retire for Qdrant (see grill candidate Q2) before anyone builds on the chain

### D-03: MCP_CERTIFICATION.md claims 10/11 MCP tools working
- CLAIM: "All 11 MCP tools implemented", "10/11 tools verified working" including search_memory and memory_stats against Mission Control endpoints; Status: CERTIFIED, 2026-06-22
- SOURCE DOCUMENT: /home/nolan/ping/MCP_CERTIFICATION.md
- ACTUAL IMPLEMENTATION: mcp/ping_mcp_server.py still exists (thin Python proxy to http://mission-control:8000), last touched by 20a67651d (URL env-var refactor); no MCP server in the gateway boot path; beforeMCPExecution/afterMCPExecution hooks have zero references in the main tree and gateway/hooks/ does not exist
- EVIDENCE: [OBSERVED FACT] certification text; ping_mcp_server.py header ("Thin proxy to Mission Control"); empty grep for the hook names outside worktree Cursor skill docs
- CLASSIFICATION: ARCHAEOLOGICAL
- RECOMMENDED EVENTUAL CORRECTION: mark as superseded; any MCP rebuild targets the stateless 2026-07-28 shape (harvest B2), not this proxy

### D-04: OPENWEBUI_MEMORY_CERTIFICATION.md claims constitutional memory retrieval live
- CLAIM: "Mission Control constitutional search endpoints operational", search_constitution_function tested, 16 documents in constitutional_documents; Status: CERTIFIED, 2026-06-22
- SOURCE DOCUMENT: /home/nolan/ping/OPENWEBUI_MEMORY_CERTIFICATION.md
- ACTUAL IMPLEMENTATION: same as D-02: the Qdrant-backed memory substrate it certifies is dormant
- EVIDENCE: [OBSERVED FACT] doc text; [SUPPORTED INFERENCE] dormant substrate
- CLASSIFICATION: ARCHAEOLOGICAL
- RECOMMENDED EVENTUAL CORRECTION: same banner treatment as D-02; do not cite as evidence of current memory capability

### D-05: gateway/IDEMPOTENCY_IMPLEMENTATION.md documents an IdempotencyManager that does not exist
- CLAIM: "IdempotencyManager Class", "Location: idempotency_manager.js"; constitutional rules require Idempotency-Key, DB uniqueness, replay detection, response reuse, duplicate suppression
- SOURCE DOCUMENT: /home/nolan/ping/gateway/IDEMPOTENCY_IMPLEMENTATION.md (Phase A1.3)
- ACTUAL IMPLEMENTATION: no idempotency_manager.js anywhere in the tree; no class IdempotencyManager in any .js file; no references from gateway/server.js or gateway_runtime.js. What IS real: event-level idempotency via deterministic content-derived event_id in UnifiedEventRuntime.emit ("idempotent retries preserved")
- EVIDENCE: [OBSERVED FACT] find + grep across tree excluding worktrees/node_modules returned empty; doc header read directly
- CLASSIFICATION: DOCUMENTED_ONLY
- RECOMMENDED EVENTUAL CORRECTION: either implement the manager at the tool-dispatch layer (harvest C1+C2 is the design) or downgrade the doc to a spec stub. The sprint must not assume tool-level idempotency exists

### D-06: current_state_audit.md inventories infrastructure_adapter_interface.js as an existing file
- CLAIM: Adapters section lists as existing files: "adapter_authority.js, adapter_compiler.js, adapter_compiler_v2.js, infrastructure_adapter_interface.js, provider_interface.js, ollama_adapter.js, ..."
- SOURCE DOCUMENT: /home/nolan/ping/gateway/docs/architecture/current_state_audit.md:220 (also referenced in duplicate_logic_detection.md)
- ACTUAL IMPLEMENTATION: gateway/infrastructure_adapter_interface.js does not exist. gateway/adapters/ollama_adapter.js does require('../infrastructure_adapter_interface') and extends InfrastructureAdapterInterface (dangling). gateway/technology_authority.js maps ollama -> './adapters/ollama_adapter' plus ten more adapter paths (openai/claude/vllm/postgresql/filesystem/mongodb/qdrant/pinecone/milvus/weaviate/embedding variants); gateway/adapters/ contains only github/ and ollama_adapter.js. No dynamic require of the map was found, so it is currently inert data
- EVIDENCE: [OBSERVED FACT] ls of both paths; require line at ollama_adapter.js:2; technology_authority.js:50-90 adapter maps
- CLASSIFICATION: DOCUMENTED_ONLY (the audit doc) + MISSING (the interface file) + SOURCE_PRESENT/inert (the technology_authority map)
- RECOMMENDED EVENTUAL CORRECTION: fix the audit doc's file list; decide whether technology_authority's adapter map is a roadmap (then mark it as such) or dead config (then prune). If ollama_adapter is ever loaded, it crashes at require time

### D-07: beforeMCPExecution / afterMCPExecution hooks reported but absent
- CLAIM: hooks exist in the gateway lifecycle (reported to this audit as expected surface)
- SOURCE DOCUMENT: no source document found in main tree; only hits are .cursor/skills-cursor/create-hook/SKILL.md files inside worktrees/ (Cursor hook-creation skill docs, unrelated to gateway MCP)
- ACTUAL IMPLEMENTATION: zero references in main-tree .js/.ts/.md; gateway/hooks/ directory does not exist. runtime/kernel/execution/ has execution-hooks.ts, audit-hook.ts, metrics-hook.ts (a different, kernel-side hook vocabulary)
- EVIDENCE: [OBSERVED FACT] repo-wide grep; ls gateway/hooks
- CLASSIFICATION: MISSING
- RECOMMENDED EVENTUAL CORRECTION: do not reference these hook names in sprint planning; if an MCP lifecycle hook surface is wanted, design it against the kernel execution-hooks vocabulary, not the phantom names

### D-08: constitution/layering_law.md lists OpenTelemetry as a layer; runtime has none
- CLAIM: layering law includes OpenTelemetry as expected infrastructure
- SOURCE DOCUMENT: /home/nolan/ping/constitution/layering_law.md:41,165; audit/CONSTITUTIONAL_MASTER_AUDIT.md recommends replacing custom tracing with the OTel SDK (Stage 10)
- ACTUAL IMPLEMENTATION: no @opentelemetry packages in any package.json (verified 2026-09-22); opentelemetry_witness_instrumentation.js exists but is unwired ("witness activation DEFERRED", SLICE3C matrix). Counter-balance: CONSTITUTIONAL_MIGRATION_READINESS.md honestly records "Distributed Tracing: No OpenTelemetry/Jaeger integration" and "Distributed Tracing (MISSING)"; PHASE_22_ARCHITECTURE_REVIEW.md honestly records ~560 unstructured console calls, no structured logging, no correlation IDs
- EVIDENCE: [OBSERVED FACT] package.json greps; witness matrix line; the two honest gap docs quoted verbatim
- CLASSIFICATION: DOCUMENTED_ONLY (the layering law as requirement) with honest gap documentation alongside; the risk is readers citing the law as if it described reality
- RECOMMENDED EVENTUAL CORRECTION: annotate layering_law.md entries with implementation status (as the migration-readiness doc already does); adopt harvest F1 shapes before any SDK

### D-09: docs/EXECUTION_EVIDENCE_LEDGER.md "observability IS live" needs scoping
- CLAIM: "The provider counter logic is CORRECT and the observability IS live" (docs/EXECUTION_EVIDENCE_LEDGER.md:95)
- SOURCE DOCUMENT: as above
- ACTUAL IMPLEMENTATION: [SUPPORTED INFERENCE] the surrounding context is provider counters, not distributed tracing; docs/CAPABILITY_LEDGER.md:52 in the same docs/ tree honestly notes "zero HTTP endpoint exposes replay trace"
- EVIDENCE: [OBSERVED FACT] both quotes read directly
- CLASSIFICATION: SOURCE_PRESENT but SCOPE-AMBIGUOUS
- RECOMMENDED EVENTUAL CORRECTION: scope the sentence to "provider-counter observability"; add a pointer to the missing trace-exposure endpoint (the CAPABILITY_LEDGER S3 item already specs it: GET /replay/:eventId)

### D-10: "canonical-identity-service.ts declared but bypassed" is itself imprecise
- CLAIM (inherited audit context): canonical-identity-service.ts is declared but bypassed; live identity = identity_authority.js + deterministic_id_authority.js
- SOURCE DOCUMENT: audit context brief (not a repo doc)
- ACTUAL IMPLEMENTATION: CanonicalIdentityService IS imported and used in the TS kernel: replay-authority.ts (getInstance + generateReplayId + generateUUIDv5), scheduler-authority.ts (generateUUIDv5), canonical-id-generator.ts (wraps it; the old generator is marked DEPRECATED in favor of it). The JS live boot path (runtime/kernel/authorities/identity_authority.js, deterministic_id_authority.js, plus ping-runtime/authorities/ twins) does not use it. docs/IDENTITY_SEMANTIC_SPLIT.md (2026-09-20) honestly documents the two-path split (random/temporal Python vs deterministic JS/TS) but does not mention CanonicalIdentityService at all
- EVIDENCE: [OBSERVED FACT] import + call-site greps in the three TS files; [OBSERVED FACT] split-doc contents
- CLASSIFICATION: SOURCE_PRESENT (the service is live in the TS kernel path); the "bypassed" framing is inaccurate for that path and accurate only for the JS legacy path
- RECOMMENDED EVENTUAL CORRECTION: correct the audit context: the split is three-way in practice (JS legacy authorities vs TS CanonicalIdentityService vs Python authority), and the semantic-split doc should name the TS service. Convergence decision belongs in the sprint, not in a footnote

### D-11: docs/PING_OBJECT_VERTICAL_SLICE.md patch status currency
- CLAIM: "PATCH 3-6 COMPLETE, PATCH 7-9 PENDING" for the Alice -> Bob -> Agent -> Approval -> Feed vertical slice
- SOURCE DOCUMENT: /home/nolan/ping/docs/PING_OBJECT_VERTICAL_SLICE.md, dated 2026-09-20
- ACTUAL IMPLEMENTATION: [UNRESOLVED] read-only audit did not verify patch 7-9 completion state against source
- EVIDENCE: doc header only
- CLASSIFICATION: UNRESOLVED currency
- RECOMMENDED EVENTUAL CORRECTION: verify before the sprint plans on the slice; if patches 7-9 landed, update the doc; if not, the slice is not a proven vertical

---

## UNRESOLVED QUESTIONS (grill candidates for GRILLING-BRIEF.md)

**GQ-1: Qdrant — revive, replace with pgvector, or formally retire?**
Four certification docs (D-02, D-03, D-04) present a live Qdrant-backed memory chain that is currently dormant. The sprint will inherit false premises unless there is an explicit decision: (a) revive Qdrant and re-verify, (b) replace with pgvector (one fewer service; pg is already the canonical store), or (c) retire the chain and banner the docs as historical. Evidence: certification texts vs dormant runtime. Default if no decision: docs keep misleading; recommend (b) or (c) — a second vector service is the heaviest option for the least differentiated capability.

**GQ-2: MCP — rebuild on the stateless spec, or retire the 2026-06 surface?**
mcp/ping_mcp_server.py is an orphaned handshake-era proxy; the spec has moved to stateless (2026-07-28). Rebuilding means targeting the new shape with the OAuth 2.1 profile (harvest A1) and the OWASP C10 control list (A2). Evidence: D-03, harvest B1/B2. Default if no decision: phantom MCP surface keeps appearing in architecture docs.

**GQ-3: IdempotencyManager doc — implement or delete?**
The constitutional doc promises tool-level idempotency; the class does not exist (D-05). The harvest (C1+C2) gives a concrete design: Idempotency-Key + Postgres first-write-wins + generation fencing at the tool-dispatch layer, zero new dependencies. Evidence: doc text vs empty find/grep. Default if no decision: double-execution risk stays undocumented-as-missing.

**GQ-4: technology_authority adapter map — roadmap or dead config?**
Ten adapter paths are mapped; one file exists (D-06). Either the map is the adapter roadmap (then mark it, and note ollama_adapter crashes on load until the interface exists) or it is dead config to prune. Evidence: technology_authority.js:50-90 vs ls gateway/adapters/. Default if no decision: future readers will assume a provider ecosystem that is not there.

**GQ-5: Identity convergence — which authority wins?**
Three live-ish identity paths: JS legacy authorities, TS CanonicalIdentityService (actually used in kernel replay/scheduler), Python authority (D-10). The "bypassed" framing is wrong; the real question is convergence vs permanent documented split. Evidence: call-site greps, IDENTITY_SEMANTIC_SPLIT.md. Default if no decision: the split hardens by accident.

**GQ-6: Observability sequencing — trace vocabulary before SDK?**
Recommendation from this lane: adopt OTel GenAI span shapes into ping_events first (F1, zero dep), Pino now (F4, one tiny dep), redaction before content capture (G1-G3, zero dep); defer the OTel SDK/collector and any Phoenix-class backend. Needs operator confirmation that "no new observability infrastructure" is the constraint, since it rules out the fastest path to a trace UI. Evidence: D-08, PHASE_22 findings.

**GQ-7: Vertical slice patch 7-9 — done or not?**
D-11 could not be resolved read-only. If the Alice->Bob->Agent->Approval->Feed slice is the sprint's proof vehicle, its actual completion state needs a live verification before planning builds on it.

---

## METHOD NOTES AND CAVEATS

- All repo evidence was read through the Pig bridge at HEAD cc6856c3; the working tree had uncommitted changes (listed at top) that were NOT audited.
- worktrees/ checkouts were excluded from drift evidence; several contain newer/older variants of the same files and would contaminate HEAD assertions.
- External research used browser_search only; no pages were fetched in full. Spec claims about MCP 2026-07-28 rely on third-party verified summaries and are marked directional. The handshake-era (2025-06-18/2025-11-25) material is corroborated across multiple sources.
- Pinned versions are given where the source is versioned (spec revisions, semconv v1.38.0, pino 9.x); for living docs, HEAD + access date (2026-09-22) is the pin.
- Sibling lanes own internals; where a drift item touches their territory (e.g., MCP boot-path state, memory worker state), the classification rests on documentary evidence plus the shared audit context, marked accordingly.
