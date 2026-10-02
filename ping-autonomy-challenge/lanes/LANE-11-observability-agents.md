# LANE 11 — Observability for Autonomous Agents: Trace Semantics

**Wave 1 research lane. RESEARCH / FALSIFICATION / HARVEST ONLY. No dashboard architecture. Trace semantics first.**
**Date:** 2026-09-23. **Status:** research complete, open questions appended.

**Objective:** determine the MINIMUM telemetry necessary to reconstruct, after the fact, MISSION → RUN → ATTEMPT → AGENT → TOOL CALL → CAPABILITY → MEMORY READ → MEMORY WRITE → MODEL CALL → SIDE EFFECT → RESULT → VERIFICATION → CHECKPOINT → RECOVERY — and answer **WHY DID THE AGENT DO THAT?** for a failed autonomous mission.

**Method:** read the OpenTelemetry specification and the GenAI semantic conventions from source (SHAs pinned), read the OpenAI Agents SDK tracing implementation from source (SHA pinned), read the LangSmith SDK run-tree implementation from source (SHA pinned), and study LangSmith, Langfuse, and Braintrust data models via their docs/specs (SHAs pinned where repos exist). For each mechanism: span/event model, identity scheme, tool-call boundary capture, gaps, multi-agent causality.

**One-line finding:** every serious system captures *what the agent did* (tool name, args, result) and *what the model saw* (messages) only on opt-in; **no** system has a first-class checkpoint/recovery primitive; **no** two systems agree on cross-trace causality (tree vs DAG vs link); and **all** of them treat content capture as opt-in, which means default telemetry can never answer "why" — the minimum trace must make decision-content capture a deliberate, redaction-aware policy, not an accident of defaults.

---

## 1. Sources and pinned revisions

| ID | Source | What was read | Type |
|---|---|---|---|
| S1 | open-telemetry/opentelemetry-specification | `specification/trace/api.md` (SpanContext, Span, Links, Events, Status), `specification/trace/sdk.md` (SpanLimits) | spec, source-read |
| S2 | open-telemetry/semantic-conventions-genai | `docs/gen-ai/gen-ai-agent-spans.md`, `docs/gen-ai/gen-ai-spans.md` (execute_tool), `docs/gen-ai/gen-ai-events.md`, `reference/reports/{memory,plan}-span.md`, `reference/scenarios/openai-agents/` | semconv, source-read |
| S3 | open-telemetry/semantic-conventions | `docs/gen-ai/*` (GenAI moved out; deprecation notice) | semconv, source-read |
| S4 | openai/openai-agents-python | `src/agents/tracing/{span_data,spans,traces,create}.py`, `docs/tracing.md` | implementation, source-read |
| S5 | langchain-ai/langsmith-sdk | `python/langsmith/run_trees.py` (Run.events), `python/langsmith/_internal/_agent_addressing.py`, `openwiki/concepts/run-tree-and-context.md` | implementation, source-read |
| S6 | langchain-ai/docs | `src/langsmith/trace-with-opentelemetry.mdx` (OTel→Run attribute mapping) | vendor docs |
| S7 | langfuse/langfuse | data model via langfuse-docs + third-party source-level reverse engineering (tracely-ai, Langfuse v3.177.1) | vendor docs + secondary source |
| S8 | langfuse/langfuse-docs | OTel ingestion (`/api/public/otel/v1/traces`), observation types page | vendor docs |
| S9 | braintrustdata/braintrust-spec | `skills/instrumentation-spec/references/instrumentation-guide.md` (agent trace-shape spec) | vendor spec |
| S10 | PING architecture audit | `~/workspace/ping-arch-audit/PING_ARCHITECTURE_AUDIT.md` (canonical object envelope, event plane, mission pipeline) | internal audit |

### Pinned Git revisions (fetched 2026-09-23)

| Repo | SHA | Notes |
|---|---|---|
| open-telemetry/opentelemetry-specification | `cac5b81ebcfdecb272bb4e2d31f885b7142207d9` | HEAD at clone; api.md + sdk.md read at this SHA |
| open-telemetry/semantic-conventions-genai | `8ffdf568e1b4391a99adb081db16e8102e36918e` | HEAD at clone; agent-spans, events, reports read at this SHA |
| open-telemetry/semantic-conventions | `838e414e11e30bc4f67d733b2b0baf2887d12d31` | HEAD; gen-ai docs are move-notices only |
| open-telemetry/opentelemetry-python | `008b5b0a06c521203b43842c2604acfce9a2b534` | ls-remote HEAD (not source-read; cited for SDK existence only) |
| openai/openai-agents-python | `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` | shallow-clone HEAD; tracing/ source read at this SHA |
| langchain-ai/langsmith-sdk | `9207dfb6dfc7dea53b9574ce8ff37858e379dcea` | shallow-clone HEAD; run_trees.py, _agent_addressing.py read at this SHA |
| langfuse/langfuse | `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` | ls-remote HEAD (repo too large to clone; model via docs + v3.177.1 source analysis) |
| langfuse/langfuse-docs | `f505fa1308a6ed63462f16c150ed68e3e7dccd5a` | ls-remote HEAD |
| braintrustdata/braintrust-spec | `78303f86a9728079791fc1d6e059a892d31f1d26` | ls-remote HEAD |

---

## 2. Mechanisms (canonical format)

Legend for MATURITY: **PROVEN** = in production at global scale for years; **STANDARD** = widely implemented, well-understood; **EMERGING** = gaining adoption, fewer independent implementations; **EXPERIMENTAL** = documented but unstable or beta.

HARVEST_CLASS: **PATTERN** (adopt the design shape) / **CONTRACT** (adopt the API/rule contract) / **SPEC** (adopt the written specification) / **COMPONENT** (lift a concrete implementation) / **ANTI-PATTERN** (adopt the prohibition).

---

### M1 — OTel SpanContext: 128-bit trace ID + 64-bit span ID (W3C TraceContext)

- **MECHANISM_ID:** M1
- **PROBLEM:** Correlating telemetry across process, machine, and async boundaries requires an identity that survives serialization and propagation without a central coordinator.
- **SOURCE:** S1
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **SOURCE_LOCATION:** `specification/trace/api.md` § SpanContext (lines 219–300)
- **MATURITY:** PROVEN. W3C TraceContext is the industry identity standard; every OTel SDK implements it.
- **INVARIANT:** A span's identity is the pair (trace_id: 16 bytes, ≥1 non-zero byte; span_id: 8 bytes, ≥1 non-zero byte), immutable, hex-serialized as 32/16 lowercase chars. `IsRemote` distinguishes propagated-from-elsewhere contexts from locally created ones. `TraceState` carries vendor-specific KV pairs alongside.
- **IMPLEMENTATION:** API creates SpanContext only through prescribed constructors; propagators inject/extract `traceparent`/`tracestate` headers; SDKs generate random IDs.
- **FAILURE_MODE:** (a) ID collisions are ~impossible with random 128/64-bit IDs but **forked/cloned contexts** (copying a SpanContext to a new logical operation) silently merge two causal histories into one trace — the classic "why is this span in the wrong trace" bug. (b) `IsRemote=false` on a context that was actually received means the receiver fabricated a parent; causality silently breaks. (c) TraceState size limits (W3C: 512 bytes) truncate vendor data without error.
- **PING_EXISTING_ANALOG:** Partial. PING's canonical object envelope has `id, identity, lineage` and `BaseWorker._emit` threads `correlation_id` across hops, but there is no documented 128/64-bit span-identity contract for in-flight agent execution and no IsRemote-equivalent provenance bit.
- **GAP:** OTel identity answers "which trace is this span in" but not "which mission/attempt does this trace belong to" — that correlation lives one level up (see M8, M13, M18).
- **HARVEST_CLASS:** SPEC. Adopt the (trace_id, span_id) identity shape, hex serialization, immutability, and the IsRemote provenance bit verbatim.
- **FALSIFICATION:** Fork a SpanContext into two logically independent agent runs; assert the backend shows two traces, not one merged tree. Propagate a context across a process boundary and assert the child reports IsRemote=true and the identical trace_id.
- **DEPENDENCIES:** A propagator (W3C traceparent) wherever telemetry crosses a process boundary (Pig↔sandbox, agent→subagent).

### M2 — OTel Span Links: causal edges that are not parent-child

- **MECHANISM_ID:** M2
- **PROBLEM:** Parent-child trees cannot express "this span was caused by that span in another trace" (retry, subagent spawned async, human approval granted later, scheduled wake-up continuing yesterday's mission).
- **SOURCE:** S1
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **SOURCE_LOCATION:** `specification/trace/api.md` § Link (lines 801–832); § Specifying links (440–446); AddLink (558–561)
- **MATURITY:** STANDARD. In the spec for years; supported by all major backends; under-used by agent frameworks.
- **INVARIANT:** A Link is (SpanContext of the target + attributes). Links may target spans in the same or a different trace. Links SHOULD be added at span creation because head sampling can only consider creation-time information.
- **IMPLEMENTATION:** `AddLink(spanContext, attributes)`; SDK preserves link order; OTLP serializes links on the span.
- **FAILURE_MODE:** (a) Links added after creation may be invisible to samplers — a tail-relevant causal edge dropped by head sampling. (b) No backlink: the target span does not know it was linked to; graph traversal is one-directional unless the backend indexes both ways. (c) Link count capped by SpanLimits (default 128; M5).
- **PING_EXISTING_ANALOG:** Partial. PING lineage (`LINEAGE_CREATE`, relationships on the canonical envelope) records derivation edges, but at the business-object level, not the execution-span level; no span-link equivalent for attempt→attempt or agent→subagent causality.
- **GAP:** None of the four agent systems use OTel links as their primary multi-agent mechanism (OpenAI uses group_id; LangSmith uses session/thread; Langfuse uses sessionId; Braintrust uses span_parents). Links are the only *standard* cross-trace causality primitive, yet agent tooling ignores them.
- **HARVEST_CLASS:** SPEC + PATTERN. Adopt links as the canonical cross-trace causality edge: attempt N+1 links to attempt N's terminal span; subagent root links to the spawning tool_call span; recovery span links to the checkpoint event's span.
- **FALSIFICATION:** Emit attempt-2 trace with a link to attempt-1's root; query the backend for "all spans causally downstream of attempt-1 root" and assert attempt-2 appears. Drop the link; assert the query returns nothing (proving the link, not name matching, carried the causality).
- **DEPENDENCIES:** M1 (SpanContext identity); a backend that indexes links bidirectionally (verify, do not assume).

### M3 — OTel span Events: timestamped facts inside a span's lifetime

- **MECHANISM_ID:** M3
- **PROBLEM:** Point-in-time facts (a guardrail fired, a checkpoint was written, a retry was scheduled, an exception was thrown) do not deserve their own span, but losing their timestamp and ordering destroys the causal narrative.
- **SOURCE:** S1
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **SOURCE_LOCATION:** `specification/trace/api.md` § Add Events (lines 518–556); RecordException (682–704)
- **MATURITY:** PROVEN.
- **INVARIANT:** An Event is (name, timestamp defaulting to add-time, attributes). Events SHOULD preserve recording order. Custom timestamps are allowed and may fall outside the span's [start, end].
- **IMPLEMENTATION:** `AddEvent(name, attributes, timestamp?)`; `RecordException` is the standardized exception event (`exception.type`, `exception.message`, `exception.stacktrace` per recording-errors semconv).
- **FAILURE_MODE:** (a) Event count capped (default 128, M5) — a long agent loop emitting per-iteration events silently drops the tail. (b) Out-of-order custom timestamps with no normalization: consumers that assume event order == time order misread causality. (c) Events are second-class in most backends (not indexed like spans); a checkpoint recorded only as an event may be unqueryable.
- **PING_EXISTING_ANALOG:** Strong. PING's event plane (`ping_events` rows, OBSERVATION_CREATED etc.) is an event log with evidence; but PING events are business-domain, not execution-domain (no per-tool-call or per-checkpoint execution events).
- **GAP:** Agent systems under-use span events: OpenAI SDK has no event concept (everything is a span); LangSmith has a run-level `events` list (M13) but it is bytes-serialized and UI-secondary.
- **HARVEST_CLASS:** PATTERN. Use span events for checkpoint-written, checkpoint-restored, guardrail-evaluated, retry-scheduled, compaction-applied — with the rule that anything needed for *querying* (not just narrating) becomes a span or a linked attribute instead.
- **FALSIFICATION:** Emit 200 events on one span with default SDK limits; assert exactly which 128 survive and that the drop is documented, not silent. Emit an event with a custom timestamp before span start; assert the backend either normalizes or flags it.
- **DEPENDENCIES:** M5 (limit policy); backend event indexing (verify).

### M4 — SpanStatus + error.type: the terminal verdict of a span

- **MECHANISM_ID:** M4
- **PROBLEM:** "Did this step succeed?" must be a typed, queryable verdict, not inferred from the absence of an error attribute.
- **SOURCE:** S1 (Status, api.md 563–626); S2 (error.type semconv, recording-errors)
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9` / `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **SOURCE_LOCATION:** `specification/trace/api.md` § Set Status; `docs/gen-ai/gen-ai-agent-spans.md` footnote on `error.type`
- **MATURITY:** PROVEN (Status); STANDARD (error.type semconv).
- **INVARIANT:** StatusCode ∈ {Unset, Ok, Error}, totally ordered Ok > Error > Unset; Description only with Error. `error.type` SHOULD be the provider error code, exception canonical name, or low-cardinality identifier; `_OTHER` is the fallback.
- **IMPLEMENTATION:** `SetStatus(Error, "timeout")` + `error.type="timeout"` attribute; SDKs map exceptions automatically via RecordException.
- **FAILURE_MODE:** (a) Default Unset means "unknown," but most UIs render it as success — silent failures hide behind Unset. (b) High-cardinality error.type (raw messages) destroys aggregation; the `_OTHER` fallback is under-used.
- **PING_EXISTING_ANALOG:** Partial. PING canonical envelope has `health` and `confidence`; the mission pipeline has terminal states, but there is no per-execution-step Ok/Error/Unset verdict contract with an ordered override rule.
- **GAP:** Agent frameworks rarely set span status on *agent-decision* failure (only on exceptions): an agent that confidently does the wrong thing is Status=Ok everywhere. Verdict needs a separate primitive (M12).
- **HARVEST_CLASS:** CONTRACT. Adopt Status + error.type for *mechanical* failure (exceptions, timeouts, API errors); never use it for *judgment* failure — that is M12's job.
- **FALSIFICATION:** Run an agent that catches a tool exception and continues; assert the tool span is Status=Error (not Unset) and the parent is Ok with an explanatory event. Grep stored `error.type` values; assert cardinality stays bounded.
- **DEPENDENCIES:** M3 (RecordException for the exception event).

### M5 — SpanLimits + head-based sampling: what the SDK is allowed to forget

- **MECHANISM_ID:** M5
- **PROBLEM:** Unbounded telemetry (128+ tool calls in a long mission, full message histories) exhausts memory, bandwidth, and backends; but silent truncation destroys exactly the evidence a post-mortem needs.
- **SOURCE:** S1
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **SOURCE_LOCATION:** `specification/trace/sdk.md` § SpanLimits (lines 856–883)
- **MATURITY:** PROVEN.
- **INVARIANT:** Default caps: 128 attributes/span, 128 events/span, 128 links/span, 128 attributes per event/link. Sampling decisions are made at span creation (head-based) and can only consider creation-time information.
- **IMPLEMENTATION:** SDK `SpanLimits` config; `Sampler` interface (always_on/off, trace-id-ratio, parent-based).
- **FAILURE_MODE:** (a) A 200-turn mission silently loses turns 129+ of events/links if modeled as one span — the failure that matters most is the one that got truncated. (b) Head sampling keeps or drops whole traces at creation; "keep traces where a tool call failed" is unknowable at creation → head sampling is structurally wrong for failure debugging; tail sampling is required but no agent system documents it. (c) Attribute-value length limits truncate `gen_ai.input.messages` mid-JSON, producing unparseable evidence.
- **PING_EXISTING_ANALOG:** Weak. No documented span/event caps or sampling policy for execution telemetry; PING's antifragile directive says "preserve evidence of failure" but there is no sampling/limit contract that implements it.
- **GAP:** This is the mechanism most likely to silently eat the minimum trace: every other mechanism assumes the data survives.
- **HARVEST_CLASS:** CONTRACT (adopt explicit limits, documented and surfaced) + ANTI-PATTERN (never silently truncate decision-content; truncate with a `truncated:true` marker and a pointer to the full artifact).
- **FALSIFICATION:** Configure default limits, run a 200-turn mission, then attempt to answer "what did turn 150's model call decide?" If the answer is unavailable or silently partial, the limit policy fails the minimum-trace requirement. Flip to tail-based sampling keyed on Status=Error; assert error traces are kept at 100%.
- **DEPENDENCIES:** A tail-sampling collector (OTel Collector) or a backend that supports it; artifact storage for truncated content.

### M6 — Context propagation across process boundaries (W3C traceparent)

- **MECHANISM_ID:** M6
- **PROBLEM:** PING agents run across processes and machines (sandbox ↔ Pig, agent → subagent, cron → worker). In-process context variables do not cross these boundaries.
- **SOURCE:** S1
- **PINNED_SHA:** `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **SOURCE_LOCATION:** `specification/trace/api.md` § Included Propagators (853+); `specification/context/api-propagators.md`
- **MATURITY:** PROVEN.
- **INVARIANT:** The propagator injects `traceparent: {version}-{trace_id}-{parent_span_id}-{flags}` (and `tracestate`) into the carrier (HTTP headers, message metadata, job envelope); the extractor restores a remote SpanContext with IsRemote=true.
- **IMPLEMENTATION:** OTel propagators API; every hop must explicitly inject/extract — there is no magic.
- **FAILURE_MODE:** (a) Any hop that forgets to propagate (a cron job file, a queue message without headers) starts a new trace; the mission's causal chain silently forks. This is the #1 real-world cause of "the trace just ends." (b) Clock skew across machines makes cross-process duration math wrong; use per-span durations, never cross-machine timestamp subtraction. (c) `tracestate` vendor limits drop PING-specific keys.
- **PING_EXISTING_ANALOG:** Partial. `BaseWorker._emit` preserves namespace/correlation/causation across worker hops *inside* the PING runtime, and job envelopes carry correlation IDs — but there is no W3C-traceparent-equivalent contract for hops that leave the runtime (subagent spawn, SSH to Pig, cron-triggered runs).
- **GAP:** Subagent spawning (this very lane's execution model) has no propagated trace identity in any of the four agent systems except via proprietary fields (OpenAI group_id, LangSmith session_id).
- **HARVEST_CLASS:** SPEC. Adopt traceparent injection/extraction at every boundary: subagent task message, cron job envelope, SSH command environment, queue message.
- **FALSIFICATION:** Spawn a subagent carrying a traceparent; assert the child's root span lands in the parent's trace with IsRemote=true on the extracted context. Remove the carrier from one hop; assert a monitoring check fires (dangling trace detected), not silence.
- **DEPENDENCIES:** M1; carrier fields on every handoff envelope (task message, cron file, queue record).

### M7 — GenAI operation taxonomy: a shared verb set for agent work

- **MECHANISM_ID:** M7
- **PROBLEM:** Every framework invents its own span names ("agent_run", "llm_call", "tool_execution"), making cross-system comparison and shared analysis impossible.
- **SOURCE:** S2
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-agent-spans.md` (create_agent / invoke_agent client+internal / invoke_workflow / plan / execute_tool); `gen_ai.operation.name` value list (chat, generate_content, text_completion, execute_tool, retrieval, plan, create/search/update/delete/upsert_memory, invoke_agent, invoke_workflow, fetch_response, embeddings)
- **MATURITY:** EXPERIMENTAL. The whole GenAI semconv area is `Development` status and **just moved repositories** (out of `semantic-conventions` into `semantic-conventions-genai`) — the taxonomy is live but unstable.
- **INVARIANT:** `gen_ai.operation.name` is the machine-readable verb; span name SHOULD be `"<verb> {qualifier}"` (e.g. `execute_tool get_weather`, `invoke_agent Math Tutor`); span kind reflects the network role (CLIENT for remote agent invocation, INTERNAL for local tool execution).
- **IMPLEMENTATION:** Weaver-generated attribute registry + per-span markdown; conformance scenarios per framework (e.g. `reference/scenarios/openai-agents/` maps `Runner.run`→invoke_agent internal, SDK tracing→invoke_workflow, function tool→execute_tool).
- **FAILURE_MODE:** (a) Development-status churn: attribute names/requirements change between releases; pinning a version is mandatory. (b) SHOULD-level language everywhere — two "conformant" instrumentations can emit incompatible shapes. (c) The taxonomy covers single-agent loops well and multi-agent/handoff not at all (no handoff verb; no subagent verb).
- **PING_EXISTING_ANALOG:** Partial. PING has 30+ business event types and a worker taxonomy (observation, claim, classification, …), but no execution-verb taxonomy for agent internals (model call, tool call, memory op, plan).
- **GAP:** No `handoff` / `delegate` / `spawn_subagent` operation; no `checkpoint` / `recover` operation; `plan` exists but is barely adopted (only crewai + langchain in the conformance reports).
- **HARVEST_CLASS:** SPEC (adopt the verb set where it fits: chat/generate_content, execute_tool, retrieval, *memory) + PATTERN (extend with PING verbs for handoff, checkpoint, recover — namespaced, e.g. `ping.handoff`, until upstream standardizes).
- **FALSIFICATION:** Instrument two different agent frameworks with the taxonomy; run the same tool-call scenario in both; assert a single query (`operation.name == "execute_tool"`) returns both tool calls with comparable fields.
- **DEPENDENCIES:** Version pin of the semconv release; a weaver/registry snapshot in PING's repo.

### M8 — gen_ai.conversation.id: the cross-trace correlator (and its anti-synthesis rule)

- **MECHANISM_ID:** M8
- **PROBLEM:** A multi-day mission is many traces (one per wake-up, per cron tick, per retry). Trace_id is per-trace by design; something stable must correlate them.
- **SOURCE:** S2
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-events.md` footnotes [4]–[5] on `gen_ai.conversation.id`; `gen-ai-agent-spans.md` invoke_agent client span
- **MATURITY:** EXPERIMENTAL (semconv Development).
- **INVARIANT:** Populate `gen_ai.conversation.id` **iff** the instrumented system has a real conversation/session/thread identifier readily available. **MUST NOT synthesize one** (no new UUID, no trace_id reuse, no content hash as fallback). Application developers MAY attach it via processors/hooks.
- **IMPLEMENTATION:** Read from the framework's session object (LangChain session_id, Google ADK sessions, Bedrock agent sessions, OpenAI assistant threads); set as span attribute on every span in the conversation.
- **FAILURE_MODE:** (a) The anti-synthesis rule means most ad-hoc agent loops emit NO conversation id — the correlator is absent exactly when you need it most. (b) Conversation id correlates but does not order: ten traces sharing a conversation id have no defined sequence without timestamps/turn indexes. (c) Compaction (see M9's `gen_ai.conversation.compacted`) silently changes what "the conversation" contains.
- **PING_EXISTING_ANALOG:** Strong. PING threads root `correlation_id` through the mission pipeline via `EventToMissionBridge` and `BaseWorker._emit`; the canonical envelope has `lineage`. PING already does what the semconv only recommends.
- **GAP:** PING's correlation_id is business-pipeline-scoped; it is not propagated as a span attribute on agent-execution spans (model calls, tool calls), so you cannot query "all model calls in mission X."
- **HARVEST_CLASS:** CONTRACT. Adopt the anti-synthesis rule (never invent a conversation id; use the mission's real stable id), but go further than the semconv: PING's mission id MUST be set as a span attribute on every execution span, plus `attempt` number for ordering.
- **FALSIFICATION:** Run a mission across three cron ticks with no framework session object; assert all spans still carry the mission id (PING mints it at mission creation — the one synthesis the rule permits, because the mission *is* the conversation). Delete the mission id from one tick's spans; assert a completeness check flags the tick as orphaned.
- **DEPENDENCIES:** M6 (the mission id must propagate to every hop, including subagents and cron).

### M9 — Opt-in content capture: the model's actual inputs and outputs

- **MECHANISM_ID:** M9
- **PROBLEM:** "Why did the agent do that?" is unanswerable without what the model saw (system instructions, messages, tool definitions) and what it produced (message content, tool calls issued). Every system defaults this to OFF for PII reasons.
- **SOURCE:** S2
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-events.md` — `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.system_instructions`, `gen_ai.tool.definitions` (all Opt-In, JSON-schema-defined); `gen_ai.client.inference.operation.details` event ("store input and output details independently from traces"); `gen_ai.prompt.name/version`, `gen_ai.prompt.variable.*`; `gen_ai.conversation.compacted`
- **MATURITY:** EXPERIMENTAL.
- **INVARIANT:** Content attributes follow strict JSON schemas (input/output messages, system instructions, tool definitions); MUST be structured on events, MAY be JSON-string on spans; instrumentations MUST offer filtering/truncation; all carry PII warnings. The inference-details event decouples content storage from trace storage (different retention/access policy). `gen_ai.conversation.compacted=true` is a positive, reliable indicator that context was summarized (never set false; unset = unknown).
- **IMPLEMENTATION:** SDK hooks or span processors attach content at span creation (needed for sampling decisions); redaction filters run before export.
- **FAILURE_MODE:** (a) Default-off means the post-mortem of a failed mission finds timing without content — the exact inversion of what's needed. (b) JSON-string-on-span + attribute length limits (M5) = truncated, unparseable evidence. (c) Compaction without the `compacted` flag: the agent "forgot" and the trace cannot tell you why. (d) Prompt version not recorded → "would it do that again?" is unanswerable after a prompt deploy.
- **PING_EXISTING_ANALOG:** Weak. PING evidence records payloads of business events, but there is no policy for capturing model-call content (prompts, messages, tool definitions) at the execution layer, and no compaction indicator.
- **GAP:** No system makes content capture *safe by default* (redaction-aware, tiered retention); it is all-or-nothing opt-in.
- **HARVEST_CLASS:** SPEC (adopt the four content attributes + JSON schemas + the inference-details event shape) + CONTRACT (PING policy: content capture ON for agent missions with field-level redaction and separate retention; `gen_ai.prompt.name/version` REQUIRED on every model_call; `conversation.compacted` REQUIRED wherever a summarizer runs).
- **FALSIFICATION:** Run a mission with content capture on; attempt to answer "what tool definitions did the model see at turn 7?" and "was turn 7's context compacted?" from the trace alone. Then run with a secret in the prompt; assert the stored trace contains the redacted form and the raw form exists nowhere in the telemetry path.
- **DEPENDENCIES:** M5 (limits/truncation markers); a redaction filter in the export pipeline; separate retention for the inference-details event stream.

### M10 — The tool-call boundary: name, call id, arguments, result, approval

- **MECHANISM_ID:** M10
- **PROBLEM:** The tool call is where an agent's decision becomes an action. The boundary must join three facts: what the model *decided* (tool_calls in its output), what was *invoked* (name + arguments), and what *happened* (result or error).
- **SOURCE:** S2 (execute_tool span), S4 (FunctionSpanData), S7 (TOOL observation), S9 (tool span spec)
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e` / `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` / `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` / `78303f86a9728079791fc1d6e059a892d31f1d26`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-spans.md` § Execute tool span (`gen_ai.tool.name` Required; `gen_ai.tool.call.id` Recommended; `gen_ai.tool.description/type` Recommended; `gen_ai.tool.call.arguments/result` Opt-In); `src/agents/tracing/span_data.py` FunctionSpanData (name/input/output/mcp_data); Langfuse TOOL observation type + denormalized `tool_calls` on the parent GENERATION; braintrust-spec instrumentation-guide (tool span: type="tool", name, input=args, output=return value, `metadata.tool_approval`, error on failure, ordering MUST reflect execution order)
- **MATURITY:** STANDARD (every system has it); the *join* across the three facts is EMERGING.
- **INVARIANT:** Tool span name SHOULD be `execute_tool {tool.name}`; `gen_ai.tool.call.id` joins the invocation to the model output that requested it; arguments and result are opt-in content; approval/denial is metadata (`metadata.tool_approval`); failed calls carry top-level error + Status=Error.
- **IMPLEMENTATION:** Instrument at the tool-dispatch site (not inside each tool): one span per invocation, parented to the turn/agent span, linked to the model_call span via tool_call_id.
- **FAILURE_MODE:** (a) Langfuse-style dual capture (TOOL observation + denormalized columns on GENERATION) can disagree — two sources of truth for the same call. (b) Arguments/result opt-in + default-off = the "why" is missing by default (same as M9). (c) Parallel tool calls: parent span wall-clock ≠ per-call duration (ethos→Langfuse mapping notes this explicitly); per-call timers must be recorded per span. (d) No approval metadata → "was this action authorized?" is unanswerable.
- **PING_EXISTING_ANALOG:** Partial. PING tool/capability invocations are not traced at this granularity; the mission pipeline records business outcomes, not the invocation boundary. No approval-metadata convention.
- **GAP:** No system records the *decision-to-invocation* join as a first-class edge — the tool_call_id match is conventional, not enforced.
- **HARVEST_CLASS:** CONTRACT. Every tool invocation emits one span with: tool.name (required), tool.call.id (required, joins to model output), arguments (content policy, M9), result or error (required), approval verdict (required metadata), per-call duration (required). Parent = turn span; link → model_call span.
- **FALSIFICATION:** Run a turn where the model issues two parallel tool calls, one denied by policy, one failing; assert the trace shows three distinct spans (model_call + 2 tool_calls) with the denial recorded as approval metadata (not as an error), per-call durations that sum differently from the parent wall-clock, and tool_call_ids matching the model's output.
- **DEPENDENCIES:** M9 (content policy for arguments/result); M4 (error verdict); a policy/approval hook in the tool dispatcher.

### M11 — The model-call boundary: model, config, usage, finish reason, response id

- **MECHANISM_ID:** M11
- **PROBLEM:** To judge whether a decision was reasonable you need the exact inference: which model, which parameters, what it consumed and produced, how much it cost, and whether it finished normally.
- **SOURCE:** S2 (chat/generate_content spans), S4 (GenerationSpanData/ResponseSpanData), S7 (GENERATION observation), S9 (llm span spec)
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e` / `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` / `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` / `78303f86a9728079791fc1d6e059a892d31f1d26`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-spans.md` (chat span: `gen_ai.request.model`, `gen_ai.response.model`, usage.* incl. cache/reasoning buckets, `gen_ai.response.finish_reasons`, `gen_ai.response.id`); `span_data.py` GenerationSpanData (input/output/model/model_config/usage); Langfuse GENERATION (model, usage_details, cost_details, model_parameters, completion_start_time); braintrust-spec (llm span: per-call messages incl. prior tool results, `metadata.tools`, per-call token metrics; parent agent span aggregates totals)
- **MATURITY:** STANDARD.
- **INVARIANT:** One span per inference call; request model vs response model distinguished (they differ under routing/fallback); usage reported as billed units; finish_reasons aligned positionally with choices (`error` for abnormal ends); `gen_ai.response.id` joins the call to later evaluations (M12).
- **IMPLEMENTATION:** Instrument the model client (not the agent loop); record `model_config` (temperature, seed, reasoning level) — the reproducibility inputs.
- **FAILURE_MODE:** (a) Billed vs consumed tokens: mixing them corrupts cost attribution; semconv says report billed. (b) `response.model` ≠ `request.model` under fallback routing — attributing a bad decision to the wrong model. (c) Streaming: TTFT and partial outputs; a cancelled stream must record finish_reasons=`error`, not vanish. (d) Aggregated-only usage on the parent hides which turn burned the budget.
- **PING_EXISTING_ANALOG:** Weak. PING has no model-call instrumentation; token/cost accounting for agent missions does not exist at the execution layer.
- **GAP:** No system records the *effective* context composition per call (which memory records / retrieved docs were in the prompt) except via full message capture (M9) — expensive and PII-laden.
- **HARVEST_CLASS:** CONTRACT. One span per model call with: request.model + response.model, model_config (temperature/seed/reasoning), usage (input/output/reasoning/cache buckets), finish_reasons, response.id, prompt.name/version (M9). Parent aggregates totals; children keep per-call detail (Braintrust's rule).
- **FALSIFICATION:** Route a call through a fallback (request gpt-4o → served gpt-4o-mini); assert the trace attributes the output to the *response* model. Cancel a streaming call mid-way; assert finish_reasons records `error` and the partial output is marked partial.
- **DEPENDENCIES:** M9 (message content); provider usage payloads.

### M12 — Verification primitives: scores, evaluations, guardrails

- **MECHANISM_ID:** M12
- **PROBLEM:** "The agent believed it was done / safe / correct" is a claim that must be captured as data: who verified, what was checked, what was the verdict, and why — otherwise a failure post-mortem cannot distinguish "no verification ran" from "verification passed wrongly."
- **SOURCE:** S2 (`gen_ai.evaluation.result` event), S4 (GuardrailSpanData), S7 (Score + GUARDRAIL/EVALUATOR observations), S5 (LangSmith feedback), S9 (Braintrust `score` span type)
- **PINNED_SHA:** `8ffdf568e1b4391a99adb081db16e8102e36918e` / `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` / `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` / `9207dfb6dfc7dea53b9574ce8ff37858e379dcea`
- **SOURCE_LOCATION:** `docs/gen-ai/gen-ai-events.md` § `gen_ai.evaluation.result` (name Required; score value/label; explanation Recommended; parented to the evaluated span when possible, else `gen_ai.response.id`); `span_data.py` GuardrailSpanData (name + triggered bool); Langfuse Score (name, value, source API/ANNOTATION/EVAL, data_type, comment) attachable to trace/observation/session; LangSmith feedback records (run_id/session_id targets, evaluator provenance); Braintrust `type="score"` spans
- **MATURITY:** STANDARD (every system has *a* primitive); the *correlation* (evaluation→the exact response evaluated) is EMERGING.
- **INVARIANT:** A verification record carries: the check's name, the verdict (score value + human label + free-form explanation), the target (span id when possible, else response.id), and provenance (which evaluator/guardrail version ran). Guardrail *evaluated-but-not-triggered* is itself data (OpenAI records `triggered=false`).
- **IMPLEMENTATION:** Emit as an event parented to the evaluated span (OTel-native) or as a Score/feedback record joined by (trace_id, observation/span id, response.id).
- **FAILURE_MODE:** (a) Verification recorded without a target id → "a check passed" with no link to what was checked; the post-mortem can't use it. (b) Only failures recorded → survivorship bias; passing checks that *should have caught* the failure are invisible. (c) Evaluator version not recorded → the check that passed in prod differs from the check you're debugging. (d) Langfuse scores travel a separate ingestion path from OTel spans (ingestion API, not OTLP) — they can arrive late or never, silently.
- **PING_EXISTING_ANALOG:** Partial. PING has `REPLAY_VERIFY` / `WITNESS_CREATE` in the mission pipeline and `confidence` on the canonical envelope — verification at the business-object level. No per-decision verification record at the execution layer (no per-tool-call guardrail verdict, no per-turn evaluator score).
- **GAP:** No system requires verification records for *every* consequential decision; all are opt-in instrumentation. None versions the evaluator by default.
- **HARVEST_CLASS:** CONTRACT. Every verification (guardrail evaluation, evaluator score, human approval) emits a record with: check name + version, target (span id / response.id / tool_call_id), verdict (value + label), explanation, timestamp. Record passes, not just failures. Scores and spans share one ingestion path or the join is monitored.
- **FALSIFICATION:** Run a mission where a guardrail evaluates every tool call and passes a call that later causes the failure; assert the trace shows the guardrail's pass verdict, its version, and the exact tool_call_id it approved — i.e., the post-mortem can blame the guardrail, not just the agent.
- **DEPENDENCIES:** M10/M11 (target ids); M9 (the explanation may reference content).

### M13 — LangSmith Run tree: dotted_order as a total order over a tree

- **MECHANISM_ID:** M13
- **PROBLEM:** In an async agent loop, parent-child edges alone don't give you *the order things happened* — you need a key that sorts the whole tree into the sequence the agent experienced.
- **SOURCE:** S5, S6
- **PINNED_SHA:** `9207dfb6dfc7dea53b9574ce8ff37858e379dcea`
- **SOURCE_LOCATION:** `openwiki/concepts/run-tree-and-context.md` ("dotted_order is the complete ancestry and ordering key… each segment combines a sortable timestamp prefix with that segment's run UUID"); `python/langsmith/run_trees.py` (Run.events: "List of events associated with the run, like start and end events"); `trace-with-opentelemetry.mdx` (langsmith.* attribute → run field mapping; `LANGSMITH_OTEL_ONLY`)
- **MATURITY:** PROVEN (LangSmith is the most widely deployed agent tracer).
- **INVARIANT:** Run identity = (id UUIDv7, trace_id, parent_run_id, dotted_order). Root: trace_id == id. dotted_order = `<ts>Z<uuid>.<ts>Z<uuid>…` from root — ancestry + total order in one string. Run carries inputs/outputs/error/events/extra.metadata/tags/attachments/token usage. Run types: llm, tool, chain, retriever, embedding, prompt, parser.
- **IMPLEMENTATION:** SDK builds RunTree in memory, posts runs individually; batch ingestion requires both stable trace_id and dotted_order (parent_run_id alone is insufficient for the batch API).
- **FAILURE_MODE:** (a) dotted_order assumes a *tree*; `parent_run_ids` (plural) exists as a field but multi-parent semantics are undocumented — DAG causality doesn't fit. (b) Clock-derived ordering breaks across machines (timestamp prefixes from skewed clocks misorder siblings). (c) inputs/outputs are full-fidelity by default → PII in the trace store; LangSmith's answer is hide_inputs/hide_outputs toggles (M9's all-or-nothing problem). (d) trace_id == root run id conflates "the trace" with "the root operation" — a retried root creates a new trace, losing the retry relationship (needs M2/M8 to repair).
- **PING_EXISTING_ANALOG:** Partial. PING lineage + correlation_id give ancestry; nothing gives the *total experiential order* of execution steps within a mission attempt.
- **GAP:** No turn/step index independent of wall-clock; no multi-parent story.
- **HARVEST_CLASS:** PATTERN (adopt dotted_order's trick: one string carrying ancestry + order) + CONTRACT (every execution span carries `turn_index` / sequence number scoped to its attempt — monotonic, clock-independent).
- **FALSIFICATION:** Run two tool calls in parallel under one parent; assert their order key reflects actual completion order and that a replay of the trace reproduces the agent's experienced sequence. Skew one machine's clock by 5 minutes; assert sibling order is still correct (proving the order key doesn't depend on wall-clock alone).
- **DEPENDENCIES:** M1 (ids); a sequencer per attempt (counter, not clock).

### M14 — LangSmith OTel ingestion: the proprietary↔standard bridge

- **MECHANISM_ID:** M14
- **PROBLEM:** Teams with existing OTel pipelines shouldn't have to choose between standard instrumentation and LangSmith's agent UX.
- **SOURCE:** S6
- **PINNED_SHA:** none (docs page; verified live 2026-09-23)
- **SOURCE_LOCATION:** https://github.com/langchain-ai/docs/blob/HEAD/src/langsmith/trace-with-opentelemetry.mdx — attribute map: `langsmith.trace.name`→run name, `langsmith.span.kind`→run type (llm/chain/tool/retriever/embedding/prompt/parser), `langsmith.trace.id`→trace id, `langsmith.span.id`→run id, `langsmith.span.parent_id`→parent, `langsmith.span.dotted_order`, `langsmith.trace.session_id/session_name`, `langsmith.span.tags`, `langsmith.metadata.{key}`; `LANGSMITH_OTEL_ONLY=true` to skip the native SDK path
- **MATURITY:** EMERGING.
- **INVARIANT:** OTel span attributes in the `langsmith.*` namespace deterministically project to Run fields; the OTel trace_id/span_id are *overridden* by the langsmith.* ids when present.
- **IMPLEMENTATION:** LangSmith backend accepts OTLP and applies the mapping table server-side.
- **FAILURE_MODE:** (a) The mapping is lossy by construction: OTel links, events, and span status have no Run equivalent in the table — cross-trace causality (M2) is dropped at the bridge. (b) ID override means the OTel trace_id you propagated (M6) is replaced by the LangSmith trace id — downstream OTel-native consumers see different ids than LangSmith. (c) `LANGSMITH_OTEL_ONLY` is a global switch; mixed pipelines double-ingest.
- **PING_EXISTING_ANALOG:** None — PING has no OTel ingestion at all.
- **GAP:** The bridge proves the industry wants OTel-native agent telemetry, but the lossy mapping shows proprietary models still can't represent links/events/status.
- **HARVEST_CLASS:** ANTI-PATTERN (do not build a lossy proprietary bridge as the primary path) + PATTERN (do build a documented attribute→field projection table if PING ever ingests foreign traces).
- **FALSIFICATION:** Send one trace containing a span link and a span event through the bridge; assert both survive in LangSmith. If either is dropped, the bridge is lossy for the minimum trace and cannot be the canonical path.
- **DEPENDENCIES:** An OTel pipeline (Collector) emitting the `langsmith.*` attributes.

### M15 — Langfuse observation model: Trace / Observation / Score, one recursive type

- **MECHANISM_ID:** M15
- **PROBLEM:** Agent executions mix LLM calls, tool calls, retrievals, and plain code; a rigid span taxonomy forces everything into ill-fitting boxes.
- **SOURCE:** S7, S8
- **PINNED_SHA:** `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` / `f505fa1308a6ed63462f16c150ed68e3e7dccd5a`
- **SOURCE_LOCATION:** langfuse.com/docs/observability/features/observation-types (observation type enum); ingestion API (`trace-create`, `span-create`, `generation-create`, `event-create`, `score-create` upsert by id); `trace_sessions` (id, bookmarked, public, environment)
- **MATURITY:** STANDARD.
- **INVARIANT:** Exactly three primitives: Trace (root container: id, name, sessionId, userId, tags, metadata, input/output), Observation (the recursive work unit; type ∈ {SPAN, EVENT, GENERATION, AGENT, TOOL, CHAIN, RETRIEVER, EVALUATOR, EMBEDDING, GUARDRAIL}; single self-referential edge parent_observation_id + shared trace_id; input/output/metadata/level/usage), Score (name, value, source ∈ {API, ANNOTATION, EVAL}, data_type, comment; attachable to trace/observation/session). All creates are **upserts by id** (retried exports don't duplicate). There are NO first-class Agent, Conversation, Turn, or Sub-Agent entities — agent graphs are reconstructed at read time from metadata.
- **IMPLEMENTATION:** SDKs buffer and POST ingestion events; v4 SDK is OTel-native (spans → observations via `langfuse.*`/`gen_ai.*` attributes, endpoint `/api/public/otel/v1/traces`).
- **FAILURE_MODE:** (a) Upsert-by-id means a retried export with *mutated* payload silently overwrites history — idempotency without versioning destroys the audit trail of corrections. (b) The 10-type enum has AGENT, TOOL, GUARDRAIL, EVALUATOR — but no TURN, no CHECKPOINT, no HANDOFF; multi-agent and recovery concepts still don't fit. (c) Session is a near-empty row; cross-trace mission correlation hangs on a stringly `sessionId`. (d) Default OTel ingestion **filters to LLM-relevant spans only** — non-LLM execution spans (the side effects!) are dropped unless you configure a permissive filter.
- **PING_EXISTING_ANALOG:** Partial. PING's canonical envelope (id/kind/authority/lineage/relationships) is richer per-object than Langfuse's observation, and PING has real session/mission concepts; but PING lacks the typed execution-unit taxonomy (AGENT/TOOL/GUARDRAIL/EVALUATOR as queryable types).
- **GAP:** The read-time-reconstructed agent graph (metadata conventions like `langgraph_node`) is fragile: rename a metadata key and history becomes uninterpretable.
- **HARVEST_CLASS:** PATTERN (one recursive observation type + typed enum + upsert-by-id) + ANTI-PATTERN (never let the default span filter drop non-LLM spans; never reconstruct load-bearing structure from stringly metadata).
- **FALSIFICATION:** Export the same observation twice with different payloads; assert the backend either versions the change or rejects it — silent overwrite fails. Emit a trace with only non-LLM spans through default OTel ingestion; assert they survive (if dropped, the filter is wrong for autonomy telemetry).
- **DEPENDENCIES:** A stable id-minting rule (client-generated ids); an id→payload version log if overwrites must be auditable.

### M16 — Braintrust span model: typed spans with multi-parent support and tool approval

- **MECHANISM_ID:** M16
- **PROBLEM:** Debugging an agent loop needs per-step input/output with a small, stable type vocabulary — and a record of whether each tool action was *approved*.
- **SOURCE:** S9
- **PINNED_SHA:** `78303f86a9728079791fc1d6e059a892d31f1d26`
- **SOURCE_LOCATION:** braintrust-spec `skills/instrumentation-spec/references/instrumentation-guide.md` (agent trace-shape: parent span input/output/aggregated metrics; child llm spans per call with `metadata.tools`; child tool spans with input=args/output=return; ordering MUST reflect execution; `metadata.tool_approval`)
- **MATURITY:** EMERGING (spec is recent) / STANDARD (product).
- **INVARIANT:** Every span: name, `span_attributes.type` ∈ {task, llm, tool, function, score, eval}, input, output (nullable), metadata, metrics (tokens/latency/cost), parent_span_id, error (nullable), `span_attributes.purpose`. Identity: id/span_id/root_span_id/**span_parents (array)** — multi-parent is first-class. The agent-loop contract: parent captures initial input + final output + aggregated tokens; each LLM call is a child with that call's messages (including prior tool results); each tool execution is a child with args in / return value out; children ordered by execution.
- **IMPLEMENTATION:** `start_span`/`traced` context managers; `span.log(input, output, metadata, metrics)`; offline import via deterministic UUIDv5 ids (upsert, not duplicate); `@braintrust/otel` compat.
- **FAILURE_MODE:** (a) `span_parents` array semantics (AND vs OR causality) are unspecified — a DAG without edge semantics. (b) input/output are untyped objects; no schema, no content policy (M9's problem again). (c) `tool_approval` is SHOULD-level ("when the integration can reliably determine") — the authorization fact is optional.
- **PING_EXISTING_ANALOG:** Weak. No typed execution spans, no per-step input/output convention, no approval record.
- **GAP:** Braintrust is the only system with multi-parent spans and an (optional) approval field — and both are under-specified.
- **HARVEST_CLASS:** PATTERN (typed span vocabulary; parent-aggregates/children-detail metrics rule; execution-order requirement) + CONTRACT (make tool approval REQUIRED, not SHOULD, for side-effecting tools).
- **FALSIFICATION:** Import the same offline session twice with deterministic ids; assert no duplication. Emit a span with two parents; assert the backend documents what the two edges mean (if it can't, multi-parent is unusable for causality queries).
- **DEPENDENCIES:** Deterministic id rule for offline/replayed imports.

### M17 — OpenAI Agents SDK trace model: workflow trace + typed spans + turns + handoffs

- **MECHANISM_ID:** M17
- **PROBLEM:** A framework-native tracer must capture the agent loop's own concepts (turns, handoffs, guardrails) that generic spans don't name.
- **SOURCE:** S4
- **PINNED_SHA:** `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **SOURCE_LOCATION:** `src/agents/tracing/span_data.py` (SpanData types: agent, task, turn, function, generation, response, handoff, custom, guardrail, transcription, speech, speech_group, mcp_list_tools); `spans.py` (Span: span_id, parent_id, started_at/ended_at, export()); `traces.py` (trace_id `trace_<32 alphanumeric>`, workflow_name, group_id, metadata); `docs/tracing.md`
- **MATURITY:** STANDARD (widely used; proprietary backend).
- **INVARIANT:** Trace = one workflow run: `trace_id` (format-enforced `trace_` + 32 alphanumerics), `workflow_name`, `group_id` (links multiple traces of one conversation), metadata. Spans carry started_at/ended_at, trace_id, parent_id, and *typed* span_data. Notable types: `turn` (one agent-loop iteration: turn number, agent name, usage), `handoff` (from_agent → to_agent), `guardrail` (name + triggered bool), `generation` (input/output/model/model_config/usage), `function` (name/input/output/mcp_data), `response` (response_id + usage).
- **IMPLEMENTATION:** SDK-global trace provider; spans exported to OpenAI's Traces dashboard; disabled under Zero Data Retention orgs.
- **FAILURE_MODE:** (a) **Vendor lock-in**: export targets only OpenAI's dashboard; no public read API for traces — you cannot build PING's post-mortem on it. (b) ZDR orgs get *zero* tracing — provider-side tracing is not a substrate you can depend on. (c) `group_id` is a free-form string; no ordering, no schema. (d) No OTel export in the SDK source at this SHA — the OTel GenAI conformance scenario (S2) maps the *concepts* to OTel, but the SDK itself doesn't emit them.
- **PING_EXISTING_ANALOG:** Partial. PING missions ≈ workflow traces; PING has no turn/handoff/guardrail span equivalents.
- **GAP:** The turn span is the single best "decision unit" primitive in any system studied — and it's proprietary.
- **HARVEST_CLASS:** PATTERN (adopt: workflow trace + turn spans + typed handoff/guardrail spans + group_id-style conversation correlator) + ANTI-PATTERN (never depend on provider-side trace storage; PING must own the bytes).
- **FALSIFICATION:** Run the same agent loop against the SDK tracer and an OTel pipeline; attempt to reconstruct the turn-by-turn narrative from the OTel side alone. If turns are missing, the OTel mapping is incomplete for the minimum trace.
- **DEPENDENCIES:** None (it's a self-contained SDK) — which is exactly the lock-in risk.

### M18 — Cross-system multi-agent causality: four incompatible answers

- **MECHANISM_ID:** M18
- **PROBLEM:** "Agent A spawned subagent B, which did the bad thing" — the most important causal edge in autonomous missions — has no shared representation.
- **SOURCE:** S1, S4, S5, S7, S9
- **PINNED_SHA:** multiple (see M2, M13, M15, M16, M17)
- **SOURCE_LOCATION:** OTel Links (M2); OpenAI `group_id` + `handoff` span (M17); LangSmith `session_id`/`thread_id` + agent addressing (`_agent_addressing.py`: routes runs to (project, agent_id, environment) — addressing, not causality); Langfuse `sessionId` + read-time metadata graph (M15); Braintrust `span_parents` array (M16)
- **MATURITY:** EXPERIMENTAL (as a solved problem: unsolved).
- **INVARIANT:** None shared. Each system: OpenAI = same-trace handoff spans + cross-trace group_id string; LangSmith = tree-only (dotted_order) + session/thread strings; Langfuse = sessionId string + metadata conventions; Braintrust = multi-parent array with unspecified edge semantics; OTel = Links (the only standard, the least used).
- **IMPLEMENTATION:** —
- **FAILURE_MODE:** (a) String correlators (group_id, sessionId) correlate but don't order and don't name the edge (spawn vs retry vs continuation are indistinguishable). (b) LangSmith's tree can't represent a subagent trace that outlives its parent. (c) Braintrust's multi-parent can't say *why* there are two parents. (d) Nobody records the *delegation arguments* (what A told B to do) as a joinable fact — the handoff span has from/to but not the task brief.
- **PING_EXISTING_ANALOG:** Partial. PING lineage records derivation between business objects; subagent task messages exist but carry no propagated trace identity (M6 gap).
- **GAP:** This is the largest structural gap in the field: no standard for "who delegated what to whom, with what brief, in which trace."
- **HARVEST_CLASS:** CONTRACT (PING defines it, since nobody else has): a `delegation` edge = link from the child's root span to the parent's delegating tool_call span, with attributes (delegated_task_brief_ref, parent tool_call_id, child trace_id). Until then, OTel Links (M2) are the least-bad standard primitive.
- **FALSIFICATION:** A spawns B with a written brief; B deletes the wrong file. From the trace store alone, reconstruct: (1) that B was spawned by A, (2) the exact brief A gave, (3) which of A's turns decided to spawn. If any of the three requires reading chat logs or code, the causality model fails the minimum trace.
- **DEPENDENCIES:** M2 (links), M6 (propagation of trace identity into the subagent task message), M9 (the brief as content).

### M19 — Retention and TTL: traces are not forever

- **MECHANISM_ID:** M19
- **PROBLEM:** Multi-day missions need their traces to outlive the mission; trace backends expire data on fixed schedules.
- **SOURCE:** S5 (LangSmith `ttl_seconds` on runs)
- **PINNED_SHA:** `9207dfb6dfc7dea53b9574ce8ff37858e379dcea`
- **SOURCE_LOCATION:** langsmith-sdk runs field reference (`ttl_seconds` as an operational opt-in field)
- **MATURITY:** STANDARD (every backend has retention; few expose it per-trace).
- **INVARIANT:** Retention is a per-project/backend setting, occasionally overridable per trace/run (LangSmith `ttl_seconds`).
- **IMPLEMENTATION:** Backend-side expiry sweeps.
- **FAILURE_MODE:** A mission that runs 5 days against a 3-day trace retention loses its first 2 days of evidence *while still running* — the post-mortem of a failure on day 5 cannot see the decision on day 1 that caused it. Silent expiry is evidence destruction.
- **PING_EXISTING_ANALOG:** PING's event plane (`ping_events`) appears to be append-only with no documented expiry — stronger than the agent systems, but unconfirmed for execution telemetry volume.
- **GAP:** No studied system ties retention to mission lifetime (keep traces until mission close + N days).
- **HARVEST_CLASS:** CONTRACT. Retention policy for execution traces: keep until mission terminal state + a defined window; pin/extend retention while a mission is active; surface expiry in the trace UI ("this trace's first 2 days expired on <date>").
- **FALSIFICATION:** Start a mission, set retention shorter than the mission duration, let it run past expiry; assert the system either extended retention or recorded an explicit evidence-gap marker — silent holes fail.
- **DEPENDENCIES:** Mission lifecycle states (terminal vs active).

---

## 3. THE MINIMUM TRACE

### Design rule

Every span type below must earn its place against one question: **without it, which concrete "why did the agent do that?" becomes unanswerable?** Anything that only answers *what*, *how long*, or *how much* was cut. Billing/cost rollups, embedding spans, transcription spans, per-token cache buckets, and prompt-gallery metadata are all useful — none of them explains a decision, so none of them is in the minimum.

The chain to cover: MISSION → RUN → ATTEMPT → AGENT → TOOL CALL → CAPABILITY → MEMORY READ → MEMORY WRITE → MODEL CALL → SIDE EFFECT → RESULT → VERIFICATION → CHECKPOINT → RECOVERY.

### Identity fields (required on every span; no exceptions)

| Field | Type | Why it is minimal |
|---|---|---|
| `trace_id` | 128-bit hex (M1) | The per-attempt causal tree. Without it there is no tree. |
| `span_id` | 64-bit hex (M1) | Addressability: links, evaluations, and post-mortem queries all point at spans. |
| `parent_span_id` | 64-bit hex, nullable | The tree edge. Nullable only for roots. |
| `mission_id` | stable string, = PING mission id | Correlates traces across days/retries (M8). The one sanctioned synthesis: the mission *is* the conversation. |
| `attempt` | int, 1-based | Orders attempts within a mission; distinguishes "the action" from "the retry of the action." |
| `turn_index` | int, per attempt, monotonic | Clock-independent order of the agent's experienced sequence (M13). Without it, parallel/async steps are unordered. |
| `links[]` | OTel links (M2) | The only cross-trace causality: attempt→attempt, delegation→subagent, recovery→checkpoint. |
| `started_at` / `ended_at` | timestamps | Duration and wall-clock placement. Per-span durations only; never subtract across machines (M6). |
| `status` + `error.type` | M4 | Mechanical verdict. Unset renders as *unknown*, never as success. |

### Span types (8) and events (3)

**T1. `mission` span** (root; `invoke_workflow`).
Covers: MISSION → RUN. Attributes: mission_id, objective/brief ref, terminal state when closed.
*Earns its place:* without a mission root, traces from Monday's cron tick and Wednesday's retry are unrelated trees; "why did it keep trying for three days" is unanswerable. Scenario: the mission failed on day 3 — the mission span shows 14 attempts, attempts 1–13 linked, and the objective brief that never changed.

**T2. `attempt` span** (child of mission; `invoke_agent`).
Covers: ATTEMPT → AGENT. Attributes: attempt number, agent name/version, trigger (cron/manual/retry-of), link → previous attempt's terminal span.
*Earns its place:* retries are where autonomy fails most confusingly ("it did the thing twice"). Scenario: a payment was sent twice — attempt 2's span shows trigger=`retry`, link → attempt 1, and attempt 1's status=Unset (response lost), explaining the duplicate without blaming the agent's judgment.

**T3. `turn` span** (child of attempt; the agent-loop iteration — OpenAI's `turn`, M17).
Covers: the decision unit. Attributes: turn_index, agent name.
*Earns its place:* the turn is the smallest unit at which "the agent decided" is true. Scenario: "why did it stop working at 2pm?" — turns 1–40 show tool activity; turn 41's model_call output was `wait_for_timer`; the turn boundary localizes the decision to a single inference.

**T4. `model_call` span** (child of turn; `chat`/`generate_content`).
Covers: MODEL CALL. Attributes (M11 + M9): request.model, response.model, model_config (temperature/seed/reasoning), prompt.name/version (REQUIRED), input.messages + output.messages (content policy), system_instructions, tool.definitions, tool_calls issued (with call ids), usage totals, finish_reasons, response.id, conversation.compacted flag.
*Earns its place:* this is the only place the *reasons* live. Scenario: "why did it email the wrong person?" — the model_call's output.messages show the assistant message choosing `send_email` with `to: wrong@…`, and input.messages show the stale address in context; the decision is fully reconstructed. Cut candidate that survived: prompt.name/version — without it, "would it do that again after Tuesday's prompt deploy" is unanswerable.

**T5. `tool_call` span** (child of turn, link → T4 via tool_call_id; `execute_tool`).
Covers: TOOL CALL → CAPABILITY → RESULT. Attributes (M10): tool.name (required), tool.call.id (required; joins to T4's issued call), arguments (content policy), result or error (required), approval verdict (required metadata for side-effecting tools), per-call duration.
*Earns its place:* joins decision → action → outcome. Scenario: "why did it delete the file?" — tool_call shows `delete_file(path=/wrong/dir)`, approved=true, result=ok; parent T4 shows the model issued that exact call id; the blame lands on the decision (T4) or the approval policy, not on the filesystem.

**T6. `memory_op` span** (child of turn; `search_memory` / `create_memory` / `update_memory` / `delete_memory`).
Covers: MEMORY READ → MEMORY WRITE. Attributes: operation, query text (for reads), record ids returned/written, store id.
*Earns its place:* memory is the hidden input to every decision. Scenario: "why did it use last month's price?" — the memory_op span shows `search_memory("price list")` returned record `rec_88` (updated 2026-08-01); T4's input.messages contain rec_88 verbatim. Without the memory_op span, the stale fact looks like a hallucination.

**T7. `side_effect` span** (child of tool_call, or event on it if synchronous; span when deferred/async).
Covers: SIDE EFFECT. Attributes: effect id, idempotency key (required for mutating effects), before/after refs or provider receipt, applied_at.
*Earns its place:* separates "the tool returned ok" from "the world changed" — the distinction that makes exactly-once reasoning possible. Scenario: "why did the customer get two emails?" — two side_effect spans, same tool_call lineage, *different* idempotency keys: the retry minted a new key (bug in the retry path), proven from the trace. Kept as a span (not just an event) because deferred effects (queued sends, scheduled publishes) complete outside the tool_call's lifetime.

**T8. `verification` record** (event on the evaluated span, or `evaluation.result`-shaped record; M12).
Covers: VERIFICATION. Fields: check name + version, target (span id / response.id / tool_call_id), verdict (value + label), explanation, timestamp. Passes recorded, not just failures.
*Earns its place:* distinguishes "no one checked" from "the check was wrong." Scenario: "why did it mark the mission complete with the bug still present?" — the verification record shows evaluator `task-complete v3` scored 0.9 "complete" with explanation "all subtasks have outputs"; the post-mortem blames the evaluator's rubric, exonerates the agent.

**Events (on the relevant spans; M3):**
- **`checkpoint.written`** (on attempt/turn span): snapshot id, what was captured (turn_index, message range), store ref. *Scenario:* "why did it resume from the wrong place?" — the checkpoint event shows snapshot `cp_41` captured turns 1–40; recovery loaded `cp_38`.
- **`checkpoint.restored` / `recovery.started`** (on new attempt span, link → checkpoint span): snapshot id loaded, what was dropped (e.g. messages 40–120 compacted, `conversation.compacted=true`). *Scenario:* "why did it forget the user's constraint from yesterday?" — the restore event lists exactly which messages were summarized away.
- **`delegation.issued`** (on tool_call span that spawns a subagent; M18): child trace_id, brief ref, link → child root. *Scenario:* "why did subagent B do that?" — the delegation event + link reconstruct who spawned whom with what brief.

### What was cut, and why each cut is safe

- `create_agent` / agent-definition spans: deployment-time facts, not decision evidence. Version the agent *name/version as attributes* on T2 instead.
- `embeddings` spans: fold into `retrieval`/`memory_op`; the embedding values never explain a decision.
- Cost rollups beyond usage totals: billing, not causality. Keep input/output/reasoning token totals on T4 (they explain "why did it stop" under budget caps).
- Per-token cache buckets, audio/image token splits: keep only if they change a decision (budget cutoffs); otherwise aggregate.
- `transcription`/`speech` spans: domain-specific; model as tool_calls where they occur.
- Full attachment binaries: reference by id (M13's attachments pattern), don't inline.
- The `plan` span (M7): folded into T3/T4 — an explicit plan is just a model_call whose output is a plan; a separate span type adds taxonomy without adding answers. (If PING later needs plan-vs-execution diffing, promote it then.)
- Separate `capability` span: the capability *is* the tool definition (T5's tool.name + T4's tool.definitions). No extra span needed.

### The falsification suite for the minimum trace (run against any implementation)

1. **The wrong-email post-mortem:** agent sends an email to the wrong address. From the trace alone, an investigator who never saw the code must produce: the turn, the model_call output choosing the recipient, the arguments passed, the approval verdict, and the memory record that supplied the stale address. If any link in that chain requires logs outside the trace, the minimum is violated.
2. **The duplicate side effect:** kill the process between tool result and acknowledgement; retry. The trace must show whether the retry reused the idempotency key (T7) — i.e., the trace must be able to *exonerate or convict* the retry logic.
3. **The forgotten constraint:** compact context between attempts. The trace must show `conversation.compacted=true` and the restore event's dropped-message list — "why did it forget" must have a trace-native answer.
4. **The subagent blame:** subagent deletes the wrong file. Reconstruct spawner, brief, and deciding turn from links + delegation event alone.
5. **The wrong verdict:** evaluator marks complete prematurely. The verification record must name the evaluator version and the exact target it approved.
6. **The truncation test:** run a 200-turn mission under default SDK limits; every one of scenarios 1–5 must still be answerable for turns >128 (M5).

---

## 4. Open questions

1. **Semconv stability.** The entire GenAI semantic-conventions area is `Development` status and just moved repositories (S3→S2). If PING adopts `gen_ai.*` attribute names, what is the versioning/migration contract when upstream renames them? Pin a release and vendor the registry snapshot (weaver output) into PING's repo — but who owns the diff when upstream moves?
2. **Content capture vs. privacy.** Every system makes message/tool-definition capture opt-in because of PII, yet the minimum trace *requires* it to answer "why." What is PING's redaction model: field-level redaction at export, tiered retention (content stream vs. trace stream, cf. M9's inference-details event), per-mission opt-out? Who approves the raw-content retention window?
3. **Checkpoint/recovery has no standard.** No studied system models checkpoint.write/restore as telemetry (LangSmith's `thread_id` is the closest, and it's a correlator, not an event). PING must define `checkpoint.written` / `checkpoint.restored` event shapes itself — should it propose them upstream to semantic-conventions-genai?
4. **Cross-trace causality has no standard.** OTel Links are the principled primitive but unused by agent frameworks; everyone else uses string correlators. Does PING standardize on Links (and require backends to index them), or follow the industry's string-correlator habit? Links need backend verification (M2 falsification).
5. **DAG vs. tree.** Braintrust's `span_parents` array and LangSmith's `parent_run_ids` gesture at multi-parent causality without edge semantics. For delegation + retry + recovery, does PING need a DAG with *typed* edges (spawned_by, retried_from, restored_from), or are untyped OTel links sufficient?
6. **Sampling for failure debugging.** Head-based sampling cannot implement "keep traces where a tool failed." None of the agent systems document tail sampling. Does PING run its own OTel Collector with tail sampling keyed on Status=Error / verification-failed, or keep 100% of execution traces (volume?)? This decides whether M5's falsification can pass.
7. **Span limits vs. long missions.** Default 128 events/links/attributes per span will truncate long agent loops. What are PING's explicit limits, and is truncation always marked (`truncated:true` + artifact pointer) rather than silent?
8. **Retention tied to mission lifetime.** Can PING's trace retention be mission-scoped (keep until terminal + N days, extend while active), or does it inherit a fixed backend TTL that can expire mid-mission (M19)?
9. **ZDR / provider-side tracing.** OpenAI tracing is unavailable under Zero Data Retention and has no public read API. PING must own the trace bytes (M17 anti-pattern) — is there any mission class where PING is tempted to rely on a provider dashboard, and is that now prohibited by policy?
10. **Clock-independent ordering at scale.** `turn_index` per attempt is proposed instead of relying on timestamps (M13). For parallel subagents with their own turns, what orders *across* traces — a Lamport-style logical clock on the delegation edge, or is wall-clock + links enough?
11. **Who mints ids?** Langfuse/Braintrust rely on client-minted ids with upsert semantics (M15/M16) — good for offline/replay import. Does PING adopt client-minted, deterministic ids (enabling idempotent re-export and replay), and what is the collision/overwrite policy (version vs. last-write-wins)?
12. **Verification completeness.** M12 requires recording *passes*, not just failures, and evaluator versions. What is the performance budget for per-tool-call guardrail verdict records on a 200-turn mission, and do they go in the hot trace path or a joined side table?

---

## 5. Harvest list (for later lanes; no implementation here)

| # | Harvest | Class | From |
|---|---|---|---|
| H1 | (trace_id 128-bit, span_id 64-bit) identity + hex serialization + IsRemote bit | SPEC | M1 |
| H2 | Span Links as the cross-trace causality edge (attempt→attempt, delegation→subagent, recovery→checkpoint) | SPEC+PATTERN | M2 |
| H3 | Span events for point-in-time facts (checkpoint, guardrail, retry, compaction) with order preservation | PATTERN | M3 |
| H4 | Status {Unset,Ok,Error} + error.type for mechanical failure only; Unset ≠ success | CONTRACT | M4 |
| H5 | Explicit span limits + tail-sampling policy; truncation always marked, never silent | CONTRACT + ANTI-PATTERN | M5 |
| H6 | W3C traceparent propagation at every hop (subagent task, cron envelope, SSH, queue) | SPEC | M6 |
| H7 | gen_ai.operation.name verb set (chat, execute_tool, retrieval, *memory, invoke_agent/workflow) + PING-namespaced extensions (handoff, checkpoint, recover) | SPEC+PATTERN | M7 |
| H8 | mission_id on every execution span; attempt number; anti-synthesis rule for correlator ids | CONTRACT | M8 |
| H9 | Content attributes (input/output messages, system instructions, tool definitions) with JSON schemas + inference-details event + prompt.name/version required + compacted flag | SPEC+CONTRACT | M9 |
| H10 | Tool-call span contract: name, call id (joins to model output), args, result/error, approval metadata, per-call duration | CONTRACT | M10 |
| H11 | Model-call span contract: request/response model, model_config, usage buckets, finish_reasons, response.id; parent aggregates, children keep detail | CONTRACT | M11 |
| H12 | Verification records: check name+version, target id, verdict value+label+explanation; record passes | CONTRACT | M12 |
| H13 | Single order key carrying ancestry + sequence (dotted_order trick) + clock-independent turn_index | PATTERN+CONTRACT | M13 |
| H14 | Turn span as the decision unit (one agent-loop iteration) | PATTERN | M17 |
| H15 | Handoff/delegation span + group/session correlator; PING-owned trace bytes, never provider-dashboard-dependent | PATTERN + ANTI-PATTERN | M17 |
| H16 | Guardrail span (name + triggered, including triggered=false) | PATTERN | M17 |
| H17 | Typed observation enum (AGENT/TOOL/GUARDRAIL/EVALUATOR/…) + upsert-by-id with a version policy | PATTERN | M15 |
| H18 | mission-scoped retention (keep until terminal + N; extend while active; explicit gap markers) | CONTRACT | M19 |

---

*Research conducted 2026-09-23. All source SHAs fetched same day. No implementation, no dashboard design — trace semantics only, as tasked.*
