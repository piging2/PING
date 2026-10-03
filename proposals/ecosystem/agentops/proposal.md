# Harvest Proposal: AgentOps (agent execution traces)

- **SOURCE_REPO:** https://github.com/AgentOps-AI/agentops
- **SOURCE_HEAD:** f8e907b92dabe47232978023fdcb01e2a7d4b752 (main, 811 commits, 5867 stars)
- **LICENSE:** MIT (Copyright (c) 2023 AgentOps-AI). Verified from LICENSE at pinned commit. No GPL, copyleft, SSPL, or BSL anywhere in the material reviewed. Clean for harvest.
- **VERDICT:** ADAPT (take the mechanism: the action-record schema, the span-kind taxonomy, and the agent-specific telemetry attribute set; rewrite to PING semantics). The SDK itself is NOT adopted: it drags the OpenTelemetry stack plus psutil, requests, and wrapt, its replay is visualization rather than deterministic re-execution, and it carries no receipts or digests.
- **AUTHORITY_OWNER:** event-kernel
- **proof_ids:** [10, 11, 12, 13, 14] (secondary: 3)
- **SMALLEST_MISSING_PRIMITIVE:** An append-only per-mission **AgentAction record**: ordered action entries bound by canonical bytes and digest to the PING event spine, carrying input/output digests, outcome state, and evidence references, so the worker result (proof 10), verifier rejection (11), fallback attempt (12), VERIFIED gating (13), and replay reconstruction (14) all read from one canonical record shape.

## What I read (official docs and source only)

Repo: https://github.com/AgentOps-AI/agentops at f8e907b92dabe47232978023fdcb01e2a7d4b752.

Source files (all at the pinned commit, concatenated for SOURCE_SHA):

1. agentops/legacy/event.py (blob sha 4c7935b9 tree entry; 5892 bytes) : the v3 Event record model: Event, ActionEvent, LLMEvent, ToolEvent, ErrorEvent
2. agentops/sdk/core.py (25870 bytes) : TracingCore, TraceContext, start_trace, end_trace, make_span, finalize_span, BatchSpanProcessor wiring, atexit shutdown
3. agentops/sdk/decorators/factory.py (26621 bytes) : create_entity_decorator; session/agent/tool/llm/operation/task/workflow/guardrail/http span creation, input/output recording, exception capture
4. agentops/sdk/decorators/utility.py (8005 bytes) : _record_entity_input/_record_entity_output, _create_as_current_span, generator handling, 1MB content cap
5. agentops/sdk/attributes.py (4521 bytes) : system resource attributes, global resource attributes, trace attributes, session end attributes
6. agentops/sdk/exporters.py (7845 bytes) : AuthenticatedOTLPExporter, dynamic JWT, auth-failure throttling
7. agentops/semconv/span_kinds.py (1501 bytes) : AgentOpsSpanKindValues and legacy SpanKind
8. agentops/enums.py (980 bytes) : TraceState (SUCCESS/ERROR/UNSET) mapped to OTel StatusCode
9. agentops/client/api/base.py (4673 bytes) : BaseApiClient, async HTTP, 30s timeouts
10. agentops/client/api/versions/v4.py (4886 bytes) : V4Client, Bearer JWT, /v4/objects/upload/, /v4/logs/upload/
11. LICENSE (1068 bytes) : MIT text
12. docs/v1/concepts/sessions.mdx (5733 bytes) : session concept, end states, inherited sessions, data export endpoints
13. docs/v2/usage/manual-trace-control.mdx (10844 bytes) : start_trace/end_trace manual control
14. agentops/sdk/README.md (7185 bytes) : v0.4 architecture: Events to Spans transition, TracingCore, SpanFactory, SpanProcessor, SpanExporter, context management
15. agentops/semconv/README.md (4111 bytes) : semantic conventions: Agent/Tool/Workflow/LLM/Message/Core attributes, meters

Docs site page also read: https://docs.agentops.ai/v1/concepts/sessions (session properties, methods, inherited sessions, export endpoints).

SOURCE_SHA = sha256:832f4899d25b96ac13ce461ffcba54d3a3c099e502d34862c7666acdb250f41d over the concatenation of files 1-15 in the order listed above.

## Object model

AgentOps has two generations in the same repo. Both are worth harvesting because the older one has the cleaner "action record" shape.

### Generation 1: Event records (v3 API, agentops/legacy/event.py)

- **Event** (abstract dataclass): event_type (llms/actions/apis/tools/errors), params (dict), returns, init_timestamp and end_timestamp (ISO strings), agent_id (UUID), id (UUID4, auto), session_id (UUID).
- **ActionEvent**: generic agent action. Adds action_type (high-level name), logs, screenshot (URL, for UI-interacting agents).
- **LLMEvent**: prompt (str or list, ChatML preferred), prompt_tokens, completion, completion_tokens, cost (USD float), model (e.g. "gpt-4"), thread_id (UUID).
- **ToolEvent**: name (tool or function name), logs (str or dict).
- **ErrorEvent**: trigger_event (the Event that failed), error_type, code, details, logs (defaults to traceback.format_exc()). __post_init__ parses error_type/details from the exception, then drops the exception object so it never serializes. Does not inherit details from the trigger; it links to it.

### Generation 2: Spans (v0.4 SDK, OpenTelemetry based)

- **Session** is the master trace and the root of all spans. No span can exist without a session at the top. Properties: unique ID, project ID (derived from API key), start/end timestamps, end state (Success|Failure|Indeterminate), optional end_state_reason, tags, auto-captured host environment, optional video.
- **Span kinds** (agentops/semconv/span_kinds.py): session, agent, tool, llm, operation, task, workflow, chain, text, guardrail, http, unknown. Legacy names: agent.action, agent.thinking, agent.decision, llm.call, workflow.step. Kind is NOT the OTel span.kind; it is stored as the attribute agentops.span.kind.
- **Span naming**: "{operation_name}.{span_kind}" (e.g. "search_web.tool").
- **Decorators** create spans around code: @session/@trace (root), @agent (classes), @tool, @llm, @operation, @task, @workflow, @track_endpoint. Each records: input (args+kwargs JSON), output (return value JSON), exceptions (span.record_exception, then re-raise). Content capture has a 1MB JSON cap; oversize payloads are skipped with a debug log.
- **Hierarchy**: session > agent > tool/llm/operation/task; nesting follows the OTel execution context automatically. Session spans are created as root spans; all others attach to the current context.
- **Inherited sessions**: agentops.init(inherited_session_id=<id>) lets agents in different processes contribute spans to the same session/trace.

### Agent-specific telemetry (what makes this different from generic APM)

From agentops/semconv (README + attributes.py), the agent-only dimensions are:

- AgentAttributes: agent name, role/type, unique agent ID.
- ToolAttributes: tool name, input parameters, execution result, status lifecycle (executing / succeeded / failed).
- WorkflowAttributes: workflow name, type, step name, step status.
- LLM attributes (following OTel GenAI conventions): request model, temperature, max tokens; response model, finish reason; prompt/completion/total token counts; per-tool cost.
- MessageAttributes: indexed prompt roles/contents, completion roles/contents, tool call names/arguments.
- Meters: token usage histogram, operation duration histogram, completion exception counter.
- Resource attributes: host machine/name/OS/CPU/memory, imported libraries, service name, project ID, user tags.
- Decorator attributes: operation name, version, entity-kind-namespaced input/output JSON, tags.

Generic APM gives latency, error rate, throughput. AgentOps adds: token accounting per step, model identity and parameters, full prompt/completion content, the tool-call graph with parameters and results, agent identity and role, workflow step state, and per-step cost. That is the harvestable taxonomy.

## ID scheme

- Events and sessions: UUID4, client-side generated (REST docs recommend UUIDs). Session IDs are inheritable across processes.
- Spans: OTel trace_id (128-bit) and span_id (64-bit), random per OTel spec; parent linkage via span context. Trace IDs are used as keys in the active-trace registry (TracingCore._active_traces).
- Project identity: derived from the API key, not from the trace data.

## State transitions

Session/trace lifecycle (core.py):

1. start_trace(trace_name, tags) creates a root span, attaches context, registers in _active_traces, logs the dashboard replay URL.
2. Active: child spans nest via context; TraceContext carries span + detach token.
3. end_trace(trace_context, end_state): sets the session-end attribute (agentops.session.end_state), ends the span, detaches the context token, removes from the registry, force-flushes the processors, logs the replay URL again.
4. end_state values: "Success", "Failure", "Indeterminate" (v3 Session); TraceState.SUCCESS/ERROR/UNSET mapped to OTel StatusCode in v0.4. If a process exits without ending, the session shows Indeterminate. On unhandled exception inside a decorated function: span.record_exception, re-raise, and the enclosing trace ends Indeterminate.
5. atexit shutdown: ends every still-active trace with end_state "Shutdown" and force-flushes.

Error linkage: ErrorEvent.trigger_event points at the failed ActionEvent/LLMEvent/ToolEvent; in the span model, exceptions are recorded as span events on the failing span.

## Authority boundary

The SDK is instrumentation only. Authority over stored traces sits with the AgentOps backend (dashboard + API, self-hostable, also MIT). Authentication: API key creates a session and yields a JWT (24h expiry); the JWT rides as a Bearer token on OTLP export. The SDK enforces nothing about the agent; there is no policy, guardrail enforcement, or approval in the trace path. Replay is a read-only consumer of recorded data.

## Persistence semantics

- SDK side: spans live in memory only. BatchSpanProcessor with max_queue_size 512, schedule_delay 1000ms, max_wait_time 5000ms. There is no SDK-side journal, spill file, or durable queue.
- Export: OTLP/HTTP to https://otlp.agentops.ai/v1/traces (and /v1/metrics). Large objects and logfiles go to /v4/objects/upload/ and /v4/logs/upload/.
- Server side: persistence is the backend's Postgres (self-hosted app directory), which I did not review; treat as out of scope.

## Evidence / receipts

None. Traces carry no digests, signatures, or tamper evidence. Identity is API key plus JWT. The closest thing to a receipt is the dashboard session-replay URL the SDK logs at trace start and end. Compared with PING's evidence model, this is a genuine gap: an AgentOps trace is trust-on-first-use telemetry, not verifiable evidence.

## Retries and failures

- Export failure: AuthenticatedOTLPExporter.export catches HTTP/network/server errors, logs them, and returns SpanExportResult.FAILURE. The OTel BatchSpanProcessor drops the failed batch; there is no SDK retry queue. Delivery is at-most-once and best-effort.
- Auth failure (401/403 or expired JWT): export is skipped for 60 seconds (auth-failure throttle), then retried on the next batch.
- HTTP client: 30s timeouts; failures raise.
- Capture failure: if input/output serialization fails, a warning is logged and the span continues without the payload. Never fatal to the agent.
- Session leak: atexit handler closes stray traces as "Shutdown" and flushes.

Honest assessment for proofs 10-14: AgentOps never retries an action and never guarantees a trace survives process death. Anything PING harvests must add durability that AgentOps lacks.

## Revocation model

There is none in the SDK sources reviewed. No trace deletion, redaction, or key-revocation path exists client-side; API key revocation is a dashboard operation. Sessions are namespaced by API key (project), so key rotation is the de facto containment boundary.

## Tests (upstream)

- tests/unit: test_session.py, test_events.py, test_config.py, test_serialization.py, test_validation.py, test_context_manager.py, test_host_env.py, test_init_py.py, test_user_agent.py.
- tests/unit/sdk: test_decorators.py, test_factory.py, test_attributes.py, test_exporters.py, test_concurrent_instrumentation.py, test_internal_span_processor.py, test_resource_attributes.py.
- tests/integration, tests/smoke, tests/benchmark, tests/core_manual_tests also exist.
- CI: .github/workflows/python-tests.yaml (plus static-analysis.yaml).

The unit tests cover the decorator span lifecycle, attribute construction, and exporter auth handling. They do not test replay (dashboard-side) or durability (there is none).

## How replay works (against a recorded trace)

AgentOps "session replay" is step-by-step visual playback of the recorded event/span graph in the dashboard, not deterministic re-execution. Because every span carries its inputs, outputs, timestamps, token counts, and exceptions, a human (or an agent-as-judge) can walk the execution forward and see exactly what happened at each step. There is no mechanism to take a recorded trace and re-run it against the recorded inputs to check determinism. For proof 14 (replay reconstructs relevant state), AgentOps proves the value of a complete per-action record but does NOT prove deterministic replay. PING must supply the determinism itself: canonical bytes, digests, and an event spine that can be re-projected.

## Verdict: ADAPT, with reasons

ADAPT the mechanism; do not adopt the SDK; do not reject the idea.

- ADAPT because: (a) the ActionEvent/LLMEvent/ToolEvent record shape (action_type, params, returns, timestamps, agent_id, session_id, error linkage) is a proven, minimal schema for "what did the worker do"; (b) the span-kind taxonomy (session > agent > tool/llm/operation/task/workflow) gives PING a ready vocabulary for nesting worker actions; (c) the agent-specific telemetry attribute set (tokens, model, tool params/results, step status, cost) names exactly the dimensions a verifier needs for proofs 10-14. PING does not have a canonical per-action record yet.
- NOT ADOPT because: the SDK pulls opentelemetry-sdk, opentelemetry-exporter-otlp-proto-http, requests, psutil, and wrapt; its replay is not deterministic; it has no digests or receipts; and adopting it would move trace authority to a vendor-shaped backend. The harvest rule is zero new dependencies, and every one of these fails the proof_id test.
- NOT REJECT because: proofs 9-14 need a canonical record of worker actions to verify against, and this is the cleanest proven shape in the open-source agent-observability world. Re-deriving it clean-room from the schema above costs little and buys the verifier and replay their input format.

## Smallest missing primitive

**AgentAction record** (event-kernel owned).

PING has missions, a WorkerRuntime dispatch seam, a verifier, and an event spine. What it does not have is a canonical, append-only record of each individual action a worker takes inside a mission attempt. The primitive:

```
AgentAction {
  seq,                 // order within the mission attempt
  action_id,           // uuid4
  mission_id,          // links to the mission (AgentOps: session_id)
  attempt_id,          // which attempt (matters for proof 12 fallback)
  span_kind,           // agent | tool | llm | operation | task  (AgentOps taxonomy)
  actor,               // worker/agent identity (AgentOps: agent_id)
  target,              // tool name, model name, or operation name
  input_digest,        // digest of canonical input bytes (AgentOps records raw input; we bind by digest)
  output_digest,       // digest of canonical output bytes
  started_at, ended_at,
  outcome,             // ok | error | unknown  (AgentOps: executing/succeeded/failed + Indeterminate)
  error_ref,           // link to error detail (AgentOps: trigger_event pattern)
  evidence_refs[],     // links into the object/evidence store
  canonical_bytes,     // the exact bytes the digest covers
}
```

Written to the PING event spine at action completion (or at action start with an outcome update, append-only, never mutated). The verifier for proof 13 reads this record, not the worker's self-report. Proof 11's injected bad result is rejected because the record's output_digest does not match the claimed result. Proof 14's replay re-projects these records. What AgentOps proves valuable: the per-action input/output binding and the kind taxonomy. What PING adds that AgentOps lacks: digest binding, append-only authority, an explicit outcome state machine, and verifier coupling.

## Dependency analysis

- Harvested mechanism: zero dependencies. Clean-room re-derivation of the record schema and attribute taxonomy; no AgentOps code is copied.
- If the SDK were adopted (rejected): opentelemetry-sdk, opentelemetry-exporter-otlp-proto-http, requests, psutil, wrapt, plus a live backend. None names a proof_id; all rejected per the zero-dependency rule.
- DEPENDENCY_COST: zero.

## License finding

MIT License, Copyright (c) 2023 AgentOps-AI, verified verbatim from LICENSE at commit f8e907b92dabe47232978023fdcb01e2a7d4b752. No GPL, LGPL, copyleft, SSPL, or BSL terms anywhere in the material reviewed. No flag needed for Nolan; the license is permissive and compatible with clean-room adaptation.

## Proof mapping

- Proof 10 (worker returns result): the AgentAction record is the canonical form of "the worker returned X", with input/output digests instead of self-reported claims.
- Proof 11 (injected bad result rejected): verifier compares the claimed result against the record's output_digest and evidence_refs; mismatch fails closed.
- Proof 12 (fallback attempt succeeds): attempt_id separates attempts; each attempt appends its own action records; the fallback's records stand alone.
- Proof 13 (VERIFIED only after independent verification): verification reads the action records from the event spine, never the worker's message; VERIFIED is gated on record integrity plus semantic checks.
- Proof 14 (replay reconstructs state): ordered, digest-bound action records re-project deterministically; this is what AgentOps' replay demonstrates the need for but does not itself provide.
- Secondary, proof 3 (deterministic evidence-backed graphs): the span-kind taxonomy plus evidence_refs gives the graph its edges.
