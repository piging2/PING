# OpenAI Agents SDK — Harvest Lane Report

**Source:** https://github.com/openai/openai-agents-python
**Commit:** `32edd3c3ecde37a7fb6bf4b082f35f1d8f7f086b` (2026-09-22, main)
**License:** MIT (`LICENSE`, root)
**Inspected:** 2026-09-23, source only (`src/agents/`, `docs/`). All claims below cite source file + line.
**Note on Swarm:** `docs/index.md:3` calls the SDK "a production-ready upgrade of our previous experimentation for agents, Swarm". Swarm is archaeology only per lane brief; the lightweight handoff-as-tool-call semantics it pioneered survive in this SDK's `Handoff` implementation.

## What the SDK is (verified)

`Runner` executes a turn loop (`src/agents/run_internal/run_loop.py`, `src/agents/run.py`). Every run lives inside a **Trace**; runs are composed of typed **spans**; tools are invoked through a canonical invocation-identity layer; approvals pause/resume via serializable `RunState`; sessions persist raw history items; durability across process restarts is **delegated** to external orchestrators (Temporal / Dapr / Restate).

## Trace model (the central provenance answer)

- **Trace identity:** `trace_<32 alphanumeric>`, generated via `util.gen_trace_id()`; `group_id` links multiple traces from one conversation/process (`src/agents/tracing/traces.py:127-140`, `create.py:28-76`).
- **Span identity:** provider-generated span IDs, parent span linkage, per-span `SpanError{message, data}` (`spans.py:19-27, 159-176`). Custom spans via `custom_span(name, data)` (`create.py:293-322`).
- **Resumption:** `ReattachedTrace` rebuilds a trace from `TraceState` **without re-emitting trace-start events** (`traces.py:~340-420`); a module-level `_started_trace_ids` registry dedups (`traces.py:~333-360`). Trace API keys are stored as SHA-256 fingerprints, never secrets (`traces.py:~183-188`).
- **Export:** `ConsoleSpanExporter` / `BackendSpanExporter` (OpenAI tracing dashboard) / `BatchTraceProcessor` (`processors.py:27-130, 646`). Default export target is OpenAI's backend, not local durable storage.

### Span taxonomy (verified emission points)

| Span | Emitted where | Records |
|---|---|---|
| `task` | `run.py:805-810` (one per `Runner.run`, gated by `include_task_and_turn_spans`, default true) | workflow name; `usage` |
| `turn` | `run.py:1664-1673, 1799-1804` (per agent-loop turn) | turn number, agent name, usage |
| `agent` | `run.py:1496`, `run_loop.py:1561` | agent name, available handoffs, tools, output type |
| `generation` | `models/_trace.py:45-80` (`populate_generation_span`), called from `models/openai_responses.py`, `openai_chatcompletions.py`, litellm/any-llm adapters | input, output, model, model_config (URL-sanitized, `include_data` gated), usage (requests, in/out/total tokens + details) |
| `response` | model layer | provider response_id, usage |
| `function` | `run_internal/tool_execution.py:1800` (every function tool invocation) | tool name, **input/output only when `trace_include_sensitive_data=true`** (default true via `OPENAI_AGENTS_TRACE_INCLUDE_SENSITIVE_DATA` env, `run_config.py:53-60, 414-421`); `mcp_data` for MCP tools |
| `handoff` | `run_internal/turn_resolution.py:580` | `from_agent`, `to_agent` (to set after resolution) |
| `guardrail` | `run_internal/guardrails.py:37, 49` | guardrail name, `triggered` bool |
| `mcp_tools` | `mcp/util.py:350` (on list_tools) | server name, resulting tool names |
| `custom` | `create.py:293` (user code) | arbitrary name + data bag |
| (voice) | `transcription`, `speech`, `speech_group` | voice pipeline only |

## Ten-slot provenance comparison vs CRX missing list

| # | CRX slot | SDK records it? | How (source) |
|---|---|---|---|
| 1 | MISSION | **Partially.** No mission entity. Closest is `Trace` (workflow_name, trace_id, group_id for cross-trace correlation, metadata). Task span per `Runner.run` (`run.py:805`). | `tracing/traces.py:56-121` (Trace), `create.py:124-136` |
| 2 | TASK | **Yes.** `TaskSpanData` — "Represents one top-level Runner run" (`span_data.py:64-96`); emitted per run; `AgentSpanData` per agent (`span_data.py:30-61`). | `run.py:805-810` |
| 3 | EXECUTION | **Partially.** `TurnSpanData` per loop turn (`span_data.py:98-127`); `RunState` serializes full execution state (turn counters, items, approvals, tool ledger, usage, trace state) for pause/resume (`run_state.py:1785-1840`). **Gap:** resumed runs reattach the *same* trace (`ReattachedTrace`); no distinct per-attempt identity beyond trace_id. | `run.py:1664-1673`, `traces.py:~340-420` |
| 4 | MODEL CALL | **Yes.** `GenerationSpanData` per model call: input/output/model/model_config/usage (`span_data.py:162-201`); populated per provider call with sanitized config (`models/_trace.py:16-80`); `ResponseSpanData` carries provider response_id. | `models/_trace.py:45-80` |
| 5 | MEMORY RETRIEVAL | **No.** Sessions are raw-item append/retrieve keyed by `session_id` (`get_items/add_items/pop_item/clear_session` — `memory/session.py:53-93`). No graded retrieval, no memory event in the execution path. Backends: SQLite, Redis, SQLAlchemy, Dapr, OpenAI Conversations. Compaction session exists (bounded history) but stores items, not retrievals. | `memory/session.py` (whole file) |
| 6 | AUTHORIZATION | **Yes, at tool-call scope (not action/effect scope).** `needs_approval` (bool or callable) per tool (`tool.py:499-513`); unapproved invocations become `ToolApprovalItem` interruptions that pause the run (`items.py:556-660`); `RunState.approve()/reject()` incl. `always_approve` permanent decisions (`run_state.py:1296-1345`); `_ApprovalRecord` per tool/namespace key: approved/rejected lists, rejection messages, sticky rejections (`run_context.py:57-70`); all serialized with RunState. **Scope = stable fingerprint over (type, tool lookup key or name+server_label, invocation_role)** (`_tool_invocation.py:212-268`). Does NOT authorize durable effects, only the invocation. | `run_context.py:1043-1075`, `_tool_invocation.py` |
| 7 | TOOL ATTEMPT | **Yes, strongest of the ten.** Canonical invocation identity: `(invocation_type, provider call_id, SHA-256 fingerprint of normalized semantic fields)` (`_tool_invocation.py:98-139`); `_mark_tool_invocation_executed` called before execution (`run_context.py:489-507`, `tool_execution.py:1263, 2024, 2477`); per-call `_ToolInvocationRecord{invocation_type, approval_scope, fingerprint, executed, completed}` (`run_context.py:46-55`); serialized as "the run-owned canonical tool invocation ledger" (`run_state.py:1367-1380`). `ToolOrigin{type: function\|mcp\|agent_as_tool, mcp_server_name, agent_name}` stamps every function-tool item (`tool.py:298-340`). | `_tool_invocation.py` (whole file) |
| 8 | TOOL RECEIPT | **Yes, partially.** `_mark_tool_call_completed` (`run_context.py:474`); `tool_output_identity()` joins an output item back to `(invocation_type, call_id)` (`_tool_invocation.py:279-301`); `FunctionSpanData.output` records the result (sensitive-data gated, default on); exceptions attach as `SpanError` on the function span and non-SDK errors become `UserError` (`tool_execution.py:1835-1852`). **Records the receipt, not the consequence** — no durable-effect record. | `_tool_invocation.py:279-301`, `run_internal/tool_execution.py:1800-1856` |
| 9 | DURABLE EFFECT | **No.** Deliberately delegated. `docs/running_agents.md:568-582` points at Dapr, Temporal, Restate integrations for "durable, long-running agents"; `docs/human_in_the_loop.md:189` documents `RunState.to_json()/from_json()` as the pause/resume primitive. Replay safety is explicitly bounded: `RetryDecision(approve_unsafe_replay=True)` can resend input and **repeat provider-side work** (`docs/results.md:162`). Nothing records an effect after it lands. **Pointer for the durability lane; do not duplicate.** | `docs/running_agents.md:568-582`, `docs/results.md:162`, `retry.py:117-135` |
| 10 | VERIFICATION | **Partially (policy checks, no attestation).** Input/output guardrails with tripwire exceptions that halt the run fail-closed (`exceptions.py:519-560`; `run_internal/guardrails.py`); `GuardrailSpanData{name, triggered}` plus results sink that keeps tripped results even on exception; tool-level `tool_input_guardrail`/`tool_output_guardrail` (`tool_guardrails.py:152-213`); structured output validated against strict JSON schema (`agent_output.py:53-90`). No signature/witness/hash concept. | `run_internal/guardrails.py:28-135`, `agent_output.py` |

## Falsification log (README claim != implementation)

1. **"The SDK traces every tool call's input and output."** QUALIFIED. The function *span* always exists, but `input`/`output` are populated only when `trace_include_sensitive_data` is true (`run_internal/tool_execution.py:1812, 1849-1855`). Default is true via env (`run_config.py:53-60`), but any deployment that flips it gets skeletons only. A harvester must not assume args/output are present.
2. **"The SDK is durable."** FALSIFIED as a native property. `RunState` gives serializable *pause/resume*, not crash recovery or exactly-once effects; the docs explicitly hand durable orchestration to Temporal/Dapr/Restate (`docs/running_agents.md:568-582`).
3. **"Sessions provide memory."** QUALIFIED. They provide *history persistence* (`memory/session.py:53-93`), not memory retrieval — nothing in the execution path scores, grades, or records a retrieval. CRX's "memory retrieval absent" gap is shared, not solved.
4. **"Approvals authorize actions."** QUALIFIED. They authorize *invocations* at call scope (stable scope fingerprint, `always_approve` stickiness). There is no record of what the invocation *did*. CRX's "action-level authorization absent" gap is narrowed, not closed.
5. **"Handoff input filters redact history."** FALSIFIED as a redaction mechanism. Source comment on `Handoff.input_filter` states: "Nested handoff history is not a redaction mechanism" — it filters model input only; nested handoff history is built from `input_history`, `pre_handoff_items`, `new_items` and ignores `input_items` (`handoffs/__init__.py:136-159`). Redaction must sanitize the three source fields.
6. **"Agents-as-tools share the trace."** Mostly true but nuanced: the nested run is keyed by tool-call object identity plus a stable signature to avoid call-ID collisions across nested runs (`agent_tool_state.py:33-60`). Nested runs are first-class `Runner` runs, not sub-spans.
7. **"Multiple handoffs in one turn are handled."** VERIFIED behavior: only the first is honored; extras become tool-call outputs saying "Multiple handoffs detected, ignoring this one" and the handoff span records a `SpanError` (`run_internal/turn_resolution.py:565-594`). A fail-closed multi-delegation rule worth noting.

## Notable design decisions (mechanism-level, detail in mechanisms.jsonl)

- **Invocation identity separates call identity from authorization scope** (`_tool_invocation.py:117-139`): `(invocation_type, call_id)` vs `(scope_type, scope_fingerprint)` vs `semantic_fingerprint`. Approvals bind to scope; ledger binds to call; both survive serialization.
- **Approval records are sticky and serializable**: per-tool approved/rejected lists, rejection messages, sticky rejection scope (`run_context.py:57-70`, `run_state.py:1345-1366`). An approver's decision is durable provenance, not an ephemeral gate.
- **Guardrail results are recorded even when they trip**: the results sink appends before the tripwire exception propagates, in both streamed and non-streamed paths (`run_internal/guardrails.py:104-135`). Fail-closed *and* auditable.
- **Trace API keys never persist raw**: only a SHA-256 fingerprint is stored in `TraceState` for resume-time key matching (`tracing/traces.py:183-188`).
- **URL sanitization for trace config**: auth material and query params stripped from base URLs before they enter generation-span config (`models/_trace.py:16-26`).
- **Bounded loop**: `max_turns` raises `MaxTurnsExceeded`, attaches `SpanError` to the agent span, and supports configured error handlers that can synthesize a validated final output (`run_loop.py:1585-1680`, `run_error_handlers.py:17-50`). Matches CRX's typed-failure-semantics practice.
- **Usage accounting per request**: `Usage` accumulates plus `request_usage_entries: list[RequestUsage]` for per-request cost attribution (`usage.py:196-220`); spans carry usage snapshots.

## Gaps the SDK does not close (for the parent orchestrator)

1. No per-attempt execution identity on resume (same trace_id reattached).
2. No durable-effect record (delegated to Temporal/Dapr/Restate — durability lane owns).
3. No memory-retrieval provenance.
4. No causation IDs (only tree-structured parent-span linkage).
5. No forgetting path (`pop_item`/`clear_session` are destructive, not provenance-preserving).
6. Observability is export-based (OpenAI dashboard default); no local canonical journal.

## Files produced

- This README.
- `mechanisms.jsonl` — 13 mechanisms, each with the 15 required fields, citing `SOURCE_COMMIT 32edd3c3ecde37a7fb6bf4b082f35f1d8f7f086b` and source file paths.

No code was copied into shared space; the clone lives at `/tmp/openai-agents-sdk` (ephemeral). No builds, pushes, credentials, or lane-crossing actions taken.
