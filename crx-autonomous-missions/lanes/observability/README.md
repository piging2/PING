# Negative observability: the detection table

The headline requirement. Each row names the failure, the detecting signal,
and the cheapest effective check. All eight checks run as deterministic
journal invariants or projections over the canonical `ping_events` journal,
not as dashboard alerts. OTel trace topology alone can expose missing lineage;
it cannot prove authorization, receipt integrity, stale-state safety, or
idempotency unless CRX emits those canonical facts.

| Failure | Detecting signal | Cheapest check | Informed by |
|---|---|---|---|
| Execution without authorization | Execution-start or result event with no causally prior authorization receipt matching actor, action, scope, target, and policy/config version | Indexed anti-join from execution event to authorization receipt on causation ID or authorization ID | OGR L4/L1 split (execution named, not authorized); AgentDoG failure mode "Unconfirmed or Over-privileged Action" |
| Tool result without request | Tool-result event carrying no matching tool-request or call ID in the same mission and trace | Exact `tool_call_id` existence check; never infer by tool name alone | LangSmith pairing guidance; OGR step_id pairing; MCP `_meta` lineage |
| Memory use without retrieval | Model or tool input cites memory IDs or a memory snapshot that no prior retrieval event or span produced | Set difference: consumed memory refs minus retrieval-output refs | OTel `search_memory` and memory CRUD spans; retrieval spans with document IDs |
| Mutation without receipt | State, evidence, or projection changed with no canonical mutation receipt carrying before/after hash and issuing authority | Require receipt ID on every mutation event; verify the referenced receipt exists | Weave digest refs; Helicone omit-logs receipt gap |
| Missing parent | Non-root event or span with absent or dangling parent/causation reference | Foreign-key-like existence check at ingress or in projection | MCP remote-parent-or-link rule; Phoenix null-parent-means-root; Helicone session-path fragility |
| Orphan task | Task references a parent mission that is absent, closed, or cancelled, or shows no terminal result after lease expiry | Parent existence and state check plus an expired-open-task query | OpenAI Agents task spans; Helicone session path prefix checks |
| Duplicate execution | Two or more execution starts or results for one deterministic mission/step/idempotency key | Unique constraint or grouped duplicate query on the deterministic execution key | OpenAI Agents warn-only dedup (rejected); bounded trace-ID set (rejected) |
| Stale snapshot execution | Execution declares a read snapshot, config, or knowledge version older than the version required or current at authorization or commit time | Compare declared snapshot/version/hash against the authorization receipt and the commit precondition | AgentOps session timestamps (advisory only); Opik cost-version pattern |

# Observability Harvest: CRX Autonomous Missions

Research lane. No CRX implementation was changed. Every claim below is either
backed by inspected source (repository commit plus file path) or explicitly
marked docs-only / announcement-level. README CLAIM != IMPLEMENTATION.
IMPLEMENTATION != PRODUCTION PROOF.

## 1. How to read this lane

* `mechanisms.jsonl` holds one JSON object per valuable mechanism, exactly 16
  fields each. `HARVEST_CLASS` is one of REUSE, ADAPT, REPURPOSE, PATTERN,
  WATCH, REJECT.
* Classes mean: REUSE (adopt as-is), ADAPT (adopt with CRX-specific changes),
  REPURPOSE (use for a different problem than the source intended), PATTERN
  (design idea, no code), WATCH (track, do not build on yet), REJECT
  (valuable as a negative lesson; do not adopt).
* Source levels: `source-verified` (inspected local clone at the cited
  commit), `docs-only` (vendor docs, no source inspection), `announcement`
  (launch post or paper, no source inspection), `pending` (clone in flight).
  The level is recorded per mechanism.
* "Inspect SOURCE for every serious claim; record falsified claims
  explicitly." Falsifications live in section 5, not in `mechanisms.jsonl`.
* No second orchestration universe: harvest mechanisms, never adopt systems.
  Nothing here proposes replacing `ping_events`, the causation lineage, or any
  canonical authority.

## 2. What the ecosystem does well (conventional observability)

Source-verified unless marked otherwise.

### 3.1 Span and event taxonomy

* OTel GenAI conventions (source-verified,
  `open-telemetry/semantic-conventions-genai` @ `8ffdf568`, 2026-09-22)
  define `invoke_agent`, `invoke_workflow`, `plan`, `execute_tool`,
  `retrieval`, `search_memory`, and memory create/update/upsert/delete
  operations, plus agent identity attributes, requested-vs-response model,
  billed usage, and duration/TTFT metrics. All are Development status, not
  Stable. Content attributes are opt-in and explicitly sensitive.
  Mechanism: `OBS-GENAI-AGENT-TAXONOMY` (REUSE).
* OpenInference (source-verified, `Arize-ai/openinference` @ `01d2f8ff`,
  2026-09-21) standardizes `input.value`, `output.value`,
  `llm.token_count.*`, tool parameters, retrieval documents, session and user
  IDs, and evaluation name/metadata. No redaction or sampling mechanism was
  found in source; do not assume one exists.
  Mechanism: `OBS-OI-SEMCONV-ATTRS` (REUSE).
* OpenAI Agents SDK (source-verified, `openai/openai-agents-python` @
  `32edd3c`, 2026-09-22) implements task, turn, agent, handoff (source and
  destination), guardrail (name, triggered), MCP list-tools, function/tool,
  generation, response, and custom spans. Parent defaults from context and is
  explicitly overridable. Generated IDs are random UUID-derived, which is a
  semantic delta from CRX deterministic mission IDs.
  Mechanism: `OBS-OAIAG-TRACE-TOPOLOGY` (ADAPT).
* Phoenix (source-verified, `Arize-ai/phoenix` @ `09ab7f07`, 2026-09-23)
  implements TOOL, CHAIN, LLM, PROMPT, RETRIEVER, EMBEDDING, AGENT, RERANKER,
  EVALUATOR, GUARDRAIL, UNKNOWN kinds, nullable `parent_id` (null means
  root), typed events including exceptions, and evaluations as separately
  keyed records linked to spans. License is Elastic License 2.0:
  pattern-only, do not vendor code.
  Mechanism: `OBS-PHOENIX-SPAN-KINDS` (ADAPT).
* Traceloop/OpenLLMetry (source-verified, `traceloop/openllmetry` @
  `dac2534f`, 2026-09-17) offers workflow, task, agent, tool, guardrail, and
  conversation decorators (agent delegates to workflow semantics, tool to
  task semantics) with prompt key/version/hash/template attributes.
  Mechanism: `OBS-TRACELOOP-DECORATORS` (ADAPT).

### 3.2 Lineage and parentage

* OTel MCP semantic conventions (source-verified, same repo and commit)
  propagate W3C `traceparent`, `tracestate`, and `baggage` inside MCP
  JSON-RPC `params._meta`; the MCP server span takes the extracted context
  as remote parent and records the ambient transport context as a link.
  Mechanism: `OBS-GENAI-MCP-CTXPROP` (ADAPT).
* Braintrust SDK (source-verified, `braintrustdata/braintrust-sdk` @
  `12ba039d`, 2026-09-23) injects W3C `traceparent`, carries parent metadata
  in baggage, supports exported parent strings, and serializes span
  identifiers with a versioned compact v4 encoding.
  Mechanism: `OBS-BRAINTRUST-W3C-PROP` (PATTERN).
* Helicone (source-verified, `helicone/helicone` @ `067d9290`, 2026-09-16)
  groups requests with `Helicone-Session-Id`, `Helicone-Session-Path`, and
  `Helicone-Session-Name` headers; hierarchy is a path string such as
  `/abstract/outline/lesson-1`. Cheap, but fragile: renames break lineage and
  there is no referential integrity. CRX keeps explicit parent IDs.
  Mechanism: `OBS-HELICONE-SESSION-PATH` (ADAPT).
* Opik (announcement/architecture level, pending source verification)
  shapes a trace as a root span plus denormalized read aggregates (usage,
  cost, span counts, providers, averaged feedback scores, thread ID).
  Mechanism: `OBS-OPIK-TRACE-AGGREGATES` (PATTERN).

### 3.3 Cost attribution

* Helicone (source-verified): `COST_PRECISION_MULTIPLIER = 1_000_000_000`
  with integer cost storage in ClickHouse; cost derived from the response
  usage block and model via per-provider pricing tables in `packages/cost`.
  Mechanism: `OBS-HELICONE-COST-PRECISION` (PATTERN).
* Opik (architecture level, pending verification): `totalEstimatedCost`
  paired with `totalEstimatedCostVersion` so pricing-formula changes trigger
  recomputation instead of silent staleness.
  Mechanism: `OBS-OPIK-COST-VERSION` (ADAPT).
* AgentOps (source-verified, `AgentOps-AI/agentops` @ `f8e907b9`,
  2026-06-25): total tool/LLM cost attribute `gen_ai.usage.total_cost`,
  session and workflow identity attributes, state keys/size/storage type and
  created/updated timestamps. Advisory only; nothing enforces staleness.
  Mechanism: `OBS-AGENTOPS-SESSION-STATE` (WATCH).
* Phoenix (source-verified): per-span `SpanCost` records
  (prompt/completion/total cost and tokens) aggregated per trace by a
  dataloader. Mechanism: folded into `OBS-PHOENIX-SPAN-KINDS`.

### 3.4 Redaction and content control

* Langfuse (source-verified, `langfuse/langfuse-python` @ `65392c73`,
  2026-09-19): two independent masking hooks, SDK-level `mask()` and
  export-stage `mask_otel_spans()` covering third-party instrumentation.
  Critical caveat: export-stage masking does not affect spans already
  exported through other exporters. Multi-sink setups re-leak.
  Mechanism: `OBS-LANGFUSE-TWOSTAGE-MASK` (ADAPT).
* OpenAI Agents SDK (source-verified): `BackendSpanExporter` sanitizes
  payloads for the OpenAI tracing API and strips generation reasoning items
  before export. Same re-leak class: sanitization is per-exporter.
  Mechanism: `OBS-OAIAG-EXPORT-SANITIZE` (PATTERN).
* Helicone (source-verified): `omitRequestLog` / `omitResponseLog` flags on
  the handler context; body handlers skip persisting bodies when set.
  Omission is body-scoped; metadata records remain. CRX should keep a hash
  receipt even when the body is omitted.
  Mechanism: `OBS-HELICONE-OMIT-LOGS` (PATTERN).

### 3.5 Evaluation linkage

* Weave (source-verified, `wandb/weave` @ `da1f394f`, 2026-09-22): durable
  typed references with digests (`weave:///` URIs, `TableRef` with digest
  validation that raises instead of defaulting), call references, and typed
  feedback addressed to references. The call model carries trace, parent,
  call, thread, and turn IDs.
  Mechanisms: `OBS-WEAVE-DURABLE-REFS`, `OBS-WEAVE-TYPED-FEEDBACK` (ADAPT).
* Langfuse (source-verified): scores attach to the current span or trace;
  usage and cost details are serialized span attributes.
  Mechanism: folded into `OBS-LANGFUSE-TWOSTAGE-MASK` context; see JSONL.
* Opik (architecture level): feedback scores on traces and spans, comments,
  experiments, and prompt versioning.
  Mechanism: folded into `OBS-OPIK-TRACE-AGGREGATES`.

### 3.6 Newer entrants worth tracking

* OpenObserve v1.0 (announced 2026-09-22, announcement level): one Rust
  platform for logs, metrics, traces, RUM, and AI observability; cost
  tracking on by default across 80+ providers; Agent Graph; built-in
  evaluation with scheduled jobs and annotation queues. Thesis to watch:
  unified plane versus stitched tools. Mechanism: `OBS-OPENOBSERVE-UNIFIED`
  (WATCH).
* OpenSearch Agent Health (announced 2026-02-28, announcement level):
  zero-install OTel-native trace viewer plus structured benchmarking with
  persistent history. Mechanism: `OBS-OPENSEARCH-AGENTHEALTH` (WATCH).
* AgentDoG, AI45Lab (paper, COLM 2025): trajectory-level diagnostic
  guardrail with a Risk Source x Failure Mode x Risk Consequence taxonomy
  and attribution of unsafe actions to specific steps. Model-judged, not
  deterministic; adopt the vocabulary, not the verdicts.
  Mechanism: `OBS-AGENTDOG-TAXONOMY` (WATCH).
* OpenGuardRails (protocol proposal, README level): L6 Session / L5 Turn /
  L4 Step (request+response paired by `step_id`) / L3 Event (half a step,
  the only layer on the wire) / L2 Call / L1 Exec. Unpaired halves are
  detectable by construction. Mechanism: `OBS-OGR-LAYER-MODEL` (PATTERN).
* RedHat ai-guardian (changelog level): agent traces exported to OTLP JSON
  using GenAI semantic conventions. Template for a CRX-to-OTLP projection.
  Mechanism: `OBS-AIGUARDIAN-OTEL-EXPORT` (PATTERN).

## 3. Negative observability: what the ecosystem does not give you

The central finding: every system surveyed observes what happened. None
proves what did not happen, what was not authorized, or what was stale.
Concretely:

* No surveyed system emits authorization receipts. Guardrail spans (OpenAI
  Agents, Phoenix, Traceloop, Opik) record that a check ran and whether it
  triggered; none records a capability grant that a later execution must
  cite. Execution-without-authorization is therefore undetectable in all of
  them. CRX must emit the receipt as a canonical event.
* No surveyed system pairs tool results to requests by anything stronger
  than a call ID carried by convention (LangSmith documents
  `tool_call_id` pairing as guidance). Nothing enforces the join. CRX
  enforces it as a journal invariant.
* Memory provenance is absent: OTel defines `search_memory` and memory CRUD
  spans, and the coverage report shows only AWS Bedrock AgentCore and Google
  ADK implement them. No system checks that consumed memory IDs were
  retrieved. CRX computes the set difference over the journal.
* Mutation receipts do not exist as a concept. Weave digest refs are the
  closest primitive (content-bound references), but no system requires a
  mutation to cite a before/after receipt. CRX does.
* Parentage is trusted as reported everywhere except the OTel MCP rule,
  which at least records the ambient context as a link when propagation
  breaks. CRX validates claimed parents against the journal at ingress.
* Duplicate execution has no durable answer anywhere: OpenAI Agents warns
  and continues; its 4096-entry in-process trace-ID set is not durable,
  not distributed, and evicts. CRX needs the unique constraint on the
  deterministic execution key.
* Stale snapshots have vocabulary (AgentOps timestamps, Opik cost versions)
  but no enforcement. CRX turns the vocabulary into commit preconditions.
* Telemetry loss itself is unobserved: Opik's fire-and-forget ingest
  pipeline loses buffered spans on crash before `flush()`, with no record
  of the loss. CRX canonical writes must be acknowledged; the 2026-09-22
  gap (telemetry classes exist but are unwired and tables are empty) must
  be closed with journal writes, not best-effort exporters.

Net: the ecosystem supplies vocabulary, propagation formats, cost math, and
evaluation linkage. CRX supplies the missing layer: authorization receipts,
receipt-bound mutations, validated parentage, idempotent execution keys, and
snapshot preconditions, all as journal invariants. That is the whole
negative-observability program in one paragraph.

## 4. Recommended harvest order

Ordered by value divided by integration cost, constrained by the rule that
nothing here becomes a second orchestration universe.

1. `OBS-GENAI-AGENT-TAXONOMY` (REUSE): adopt the span/event vocabulary for
   `ping_events` before any new instrumentation is written.
2. `OBS-OI-SEMCONV-ATTRS` (REUSE): adopt the attribute key names in the
   same pass.
3. `OBS-GENAI-MCP-CTXPROP` (ADAPT): causation propagation across worker
   boundaries with ingress validation of claimed parents.
4. `OBS-LANGSMITH-TOOL-PAIRING` (PATTERN): exact `tool_call_id` anti-join
   as the tool-result-without-request check.
5. `OBS-WEAVE-DURABLE-REFS` (ADAPT): content-addressed evidence refs for
   the mutation-without-receipt check.
6. `OBS-OAIAG-TRACE-TOPOLOGY` (ADAPT): task/turn/handoff/guardrail span
   shape for mission traces; handoffs carry authorization receipts.
7. `OBS-LANGFUSE-TWOSTAGE-MASK` (ADAPT): capture-time classification plus
   per-sink export redaction under the observation authority, with the
   multi-sink re-leak boundary documented and closed.
8. `OBS-PHOENIX-SPAN-KINDS` (ADAPT): GUARDRAIL and EVALUATOR kinds plus
   evaluations as separately keyed records.
9. `OBS-OGR-LAYER-MODEL` (PATTERN): step/event pairing fields so unpaired
   halves are structurally detectable.
10. `OBS-OPIK-COST-VERSION` (ADAPT): versioned pricing on cost records.
11. `OBS-HELICONE-COST-PRECISION` (PATTERN): integer minor-unit cost
    storage.
12. `OBS-TRACELOOP-DECORATORS` (ADAPT): worker instrumentation helpers.
13. WATCH items (`OBS-AGENTDOG-TAXONOMY`, `OBS-OPENOBSERVE-UNIFIED`,
    `OBS-AGENTOPS-SESSION-STATE`, `OBS-OPENSEARCH-AGENTHEALTH`): review on a
    quarterly cadence; adopt vocabulary only.

## 5. Falsifications

Claims that did not survive source inspection. Listed explicitly per the
lane methodology.

1. OpenLLMetry zero-byte source files: FALSIFIED. The empty files seen
   earlier were clone corruption from `/tmp` tmpfs exhaustion, not an
   implementation gap. Re-cloned cleanly; decorators and attributes are
   present.
2. "Observability platforms prove authorization": FALSIFIED across all
   surveyed systems. Guardrail spans record checks, not grants. No
   authorization receipt exists anywhere surveyed.
3. "Trace topology proves exactly-once execution": FALSIFIED. OpenAI
   Agents warns on duplicate traces and continues; its started-trace set
   is in-memory, bounded at 4096, and evicts. No durable idempotency
   exists in any surveyed SDK.
4. "Export-stage masking protects all sinks": FALSIFIED for Langfuse
   (`mask_otel_spans` does not touch other exporters) and for OpenAI
   Agents (`BackendSpanExporter` sanitization is per-exporter). Masking is
   per-pipeline everywhere inspected.
5. "Langtrace PII detection is a usable redaction mechanism": FALSIFIED.
   `lib/pii.ts` returns `[]` on any exception, converting detector failure
   into no findings, the exact failure-becomes-empty-success anti-pattern.
   Classified REJECT, kept as a negative specimen.
6. "AgentOps session attributes detect stale sessions": FALSIFIED as a
   detection claim. The attributes (state timestamps, storage type) exist;
   no check consumes them. Vocabulary without enforcement.
7. "Helicone session paths give reliable parentage": FALSIFIED as a
   reliability claim. Path-string parentage has no referential integrity;
   renames and collisions break it silently. Useful as cheap grouping,
   not as lineage.
8. "Opik/Helicone/LangSmith findings are implementation-verified":
   FALSIFIED for Opik (architecture docs only, clone pending), LangSmith
   (public docs only, repo not cloned), and the announcement-level items.
   They are marked accordingly in `mechanisms.jsonl` and must not be cited
   as source-verified.

## 6. Production-proof caveats

IMPLEMENTATION != PRODUCTION PROOF. Even the source-verified mechanisms
above are verified as code that exists, not as systems proven under
production load:

* OTel GenAI conventions are all Development status; attribute names and
  semantics may change before Stable.
* Phoenix is source-available under Elastic License 2.0, not OSI-approved
  open source; harvest patterns only, never vendor code.
* Langtrace is AGPL-3.0; do not vendor code into CRX.
* Opik findings rest on repository design docs and architecture research
  until the local clone completes; the three Opik mechanisms are marked
  pending verification.
* LangSmith, OpenObserve, OpenSearch Agent Health, AgentDoG,
  OpenGuardRails, and ai-guardian findings are docs/announcement level;
  treat them as leads, not evidence.
* Cost figures everywhere depend on provider pricing tables that change;
  version the pricing (Opik pattern) and store integer minor units
  (Helicone pattern) rather than trusting any single table.
* Every redaction mechanism inspected is per-pipeline; a CRX deployment
  with more than one observation sink must route all sinks through the
  observation authority or accept documented re-leak.

## 7. Source index

| Project | Commit (local clone) | License | Key paths inspected |
|---|---|---|---|
| open-telemetry/semantic-conventions-genai | `8ffdf568` 2026-09-22 | Apache-2.0 | docs/gen-ai/gen-ai-agent-spans.md, gen-ai-spans.md, gen-ai-events.md, gen-ai-metrics.md, mcp.md; reference/reports/memory-span.md |
| openai/openai-agents-python | `32edd3c` 2026-09-22 | MIT | src/agents/tracing/span_data.py, create.py, traces.py, provider.py, processors.py, processor_interface.py |
| Arize-ai/phoenix | `09ab7f07` 2026-09-23 | ELv2 | src/phoenix/trace/schemas.py, otel.py, span_evaluations.py; server/api/dataloaders/span_cost_summary_by_trace.py |
| Arize-ai/openinference | `01d2f8ff` 2026-09-21 | Apache-2.0 | python/openinference-semantic-conventions/src/openinference/semconv/trace/__init__.py |
| langfuse/langfuse-python | `65392c73` 2026-09-19 | MIT | langfuse/_client/client.py, span_processor.py, span.py, propagation.py, attributes.py |
| wandb/weave | `da1f394f` 2026-09-22 | Apache-2.0 | weave/trace/call.py, refs.py, feedback.py |
| traceloop/openllmetry | `dac2534f` 2026-09-17 | Apache-2.0 | packages/traceloop-sdk/traceloop/sdk/decorators/; packages/opentelemetry-semantic-conventions-ai/ |
| AgentOps-AI/agentops | `f8e907b9` 2026-06-25 | MIT | agentops/semconv/span_kinds.py, span_attributes.py, workflow.py; agentops/sdk/decorators/factory.py |
| braintrustdata/braintrust-sdk | `12ba039d` 2026-09-23 | Apache-2.0 | js/src/logger.ts; js/util/span_identifier_v4.ts |
| Scale3-Labs/langtrace | `8c0a31fc` 2025-11-17 | AGPL-3.0 | lib/pii.ts, lib/constants.ts, lib/trace_util.ts |
| helicone/helicone | `067d9290` 2026-09-16 | Apache-2.0 | shared/proxy/heliconeHeaders.ts; packages/cost/; valhalla/jawn/src/lib/handlers/ |
| comet-ml/opik | pending | Apache-2.0 (repo-declared, unverified locally) | sdks/python/design/API_AND_DATA_FLOW.md via repo docs |
| LangSmith | n/a (docs only) | proprietary | public documentation |
| OpenObserve | n/a (announcement) | unverified | v1.0 announcement 2026-09-22 |
| opensearch-project Agent Health | n/a (announcement) | Apache-2.0 (project standard, unverified) | announcement 2026-02-28 |
| AI45Lab/AgentDoG | n/a (paper) | unverified | arxiv 2601.18491, COLM 2025 |
| openguardrails/openguardrails | n/a (README) | unverified | protocol README |
| redhatproductsecurity/ai-guardian | n/a (changelog) | unverified | CHANGELOG |

Local research clones live at `~/obs-scratch/` (scratch space, not a
deliverable).

## 8. Open questions

1. Does any production deployment pair Opik-style cost versions with
   config-authority pricing, or is versioned cost still only a schema
   field? (Affects how much enforcement CRX must build itself.)
2. Which OTLP backends accept GenAI semconv spans without loss today?
   (Affects the CRX-to-OTLP projection design.)
3. Is there a deployed system that validates claimed trace parents
   against its own store at ingress, or is CRX the first to require it?
4. For the memory-use-without-retrieval check: which memory systems emit
   stable memory record IDs that survive compaction? (The OTel memory
   span report shows narrow implementation coverage.)
