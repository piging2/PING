# LANE 2: OpenAI Agent Runtime / Codex Source Archaeology

Mechanism archaeology of the open-source OpenAI agent runtime stack, read at pinned commits.
Research/falsification/harvest only. No framework proposals, no implementation code.

Date: 2026-09-23. Method: pinned SHAs via GitHub API, then read raw source files
(raw.githubusercontent.com) at those SHAs. README claim != mechanism: everything below is
keyed to a file + symbol, or marked UNVERIFIED.

## 1. Repositories examined

| Repo | PINNED_SHA | HEAD date |
|------|-----------|-----------|
| github.com/openai/openai-agents-python | `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` | 2026-09-23 |
| github.com/openai/openai-agents-js | `dc90a33cf3507abf42b7688e82f29b1f42af0c6f` | 2026-09-23 |
| github.com/openai/codex | `4b3b569f3975ba4e3bf64589e4d15039066077f8` | 2026-09-23 |

JS SDK noted only; the Python SDK was read in depth (it is the reference implementation for
run/approval/session/compaction semantics). The Codex repo is Rust (`codex-rs`), not the old
TypeScript CLI: `codex-rs/core` (agent loop, session, turn), `codex-rs/protocol`
(Op/EventMsg types), `codex-rs/rollout` (durable event log), `codex-rs/app-server`
(JSON-RPC thread lifecycle), `codex-rs/execpolicy`, `codex-rs/sandboxing`.

License check (relevant to DIRECT_REUSE claims): codex repo is Apache-2.0 (per repo README);
openai-agents-python is MIT (repo carries LICENSE at root; a separate engineering study at
the same repo's history confirmed the MIT file). Verify the pinned SHA's LICENSE file
before vendoring anything.

---

## 2. Mechanisms (canonical format)

### OPENAI AGENTS SDK (Python)

OA-01 | PROBLEM: a long agent run must be pauseable mid-flight (tool approval, process
restart, human decision) and resumed by a different process without replaying tool
executions | SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/run_state.py` `class RunState` (`to_json` L1788, `from_json`
L2288), `CURRENT_SCHEMA_VERSION = "1.18"` L212, `SCHEMA_VERSION_SUMMARIES` L219 |
MATURITY: high. 18 schema versions with one-line migration rationale each; forward
compatibility is intentionally fail-fast (older SDKs reject newer schemas). The approval
payload copy path (`_copy_pydantic_value`, `_copy_tool_approval_raw_item`) is hardened
against untrusted Pydantic subtypes (MRO checks, hook checks, cycle checks, key
collision checks) | INVARIANT: a serialized snapshot round-trips enough decision state
(turn number, current agent, model responses, generated items, approval decisions,
tool-invocation records, trace state, sandbox payload, max_turns) that resume continues
the NEXT model call without re-running completed tool calls | IMPLEMENTATION: `to_json()`
emits a JSON-compatible dict with `$schemaVersion`; `from_json()` is async because it may
need to rebind sessions and validate via TypeAdapters. `add_input()` stages new user input
for the next resumed model call (rejected in terminal states or when the interrupted step
may end the run). `_pending_session_write` tracks a "canonical resumed-output append
awaiting acknowledgement"; Runner reconciles that exact pending batch before the next
model call without rerunning the tool | FAILURE_MODE: custom (non-mapping) context
objects cannot round-trip without a caller-supplied serializer; `from_json` requires the
original tool/agent identities to still resolve; concurrently resuming two copies of the
same snapshot against one Session is explicitly forbidden (docstring) | PING_EXISTING_ANALOG:
UNKNOWN, lane 19 adjudicates | GAP: no cross-process lease on the snapshot itself; the
"do not resume concurrently" rule is a documented caller obligation, not an enforced lock |
HARVEST_CLASS: ADAPT | FALSIFICATION: serialize a RunState mid-approval, restart the
process, `from_json`, approve, resume; verify no tool re-runs and the pending Session
write reconciles. Negative test: two concurrent resumes of one snapshot against the same
Session must produce a detectable conflict (currently asserted, not enforced) |
DEPENDENCIES: pydantic, openai types.

OA-02 | PROBLEM: a tool call needs human approval before executing, without the run
losing its place | SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/run_internal/run_steps.py` `class NextStepInterruption`
L177 (interruptions: list[ToolApprovalItem], response_accepted flag);
`src/agents/run_state.py` `RunState.approve` L1299 / `RunState.reject` L1314;
`src/agents/_tool_invocation.py` `tool_invocation_identity` |
MATURITY: high. Approval records serialize (approved/rejected lists, rejection messages,
sticky scope), nested agent-tool approvals are routed recursively
(`_find_nested_approval_state`), and approval identity matching dedupes "multiple
pending approvals with the same tool invocation identity" as an error rather than
guessing | INVARIANT: an approval decision binds to a canonical tool-invocation identity
(call id + lookup key + approval scope + fingerprint), not to a list position; approvals
survive serialization and can be re-matched after resume | IMPLEMENTATION: any tool with
`needs_approval` (bool or approval function, `src/agents/tool.py` `FunctionTool`
L499) produces a `ToolApprovalItem` instead of executing; `state.approve(item)` /
`state.reject(item, rejection_message=...)` record the decision on the run context; the
next `Runner.run(agent, state)` continues the loop. `always_approve`/`always_reject`
persist sticky decisions per tool name | FAILURE_MODE: ambiguous approval identities
raise UserError instead of applying to the wrong call; a run interrupted while a tool
result could end the run rejects new input | PING_EXISTING_ANALOG: UNKNOWN, lane 19 |
GAP: sticky approval decisions are keyed by tool name, coarse-grained; no per-argument
policy language at this layer (that lives in the provider/hosted tools) |
HARVEST_CLASS: ADAPT | FALSIFICATION: interrupt on two near-identical tool calls with
same call args but different call IDs; verify approvals resolve by call ID, not position.
Verify sticky always_approve persists across to_json/from_json round trip |
DEPENDENCIES: none beyond the SDK.

OA-03 | PROBLEM: resume must be a first-class entry point, not a special code path |
SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/run.py` `Runner.run` signature L261 (`input: str |
list[TResponseInputItem] | RunState[TContext]`); `AgentRunner._run_impl` L608
`is_resumed_state = isinstance(input, RunState)`; `src/agents/result.py`
`RunResult.to_state()` L545 with worked example in the docstring |
MATURITY: high. The canonical pattern is: `result = await Runner.run(agent, prompt)`;
`if result.interruptions: state = result.to_state(); state.approve(...); result = await
Runner.run(agent, state)`. Streamed runs have a parallel `run_streamed` path |
INVARIANT: the same public function starts fresh runs and resumes interrupted ones; the
input type is the switch | IMPLEMENTATION: `_run_impl` hydrates turn state from the
RunState when present (turn counter, agent, items, guardrail results, tracker snapshot,
conversation/response ids); streaming resume keeps `_session_write_in_progress` ownership
guard so independently restored snapshots cannot double-append | FAILURE_MODE: resuming
with a different session backend than the one the pending writes were staged against
requires application repair ("Changed or ambiguous history requires application repair") |
PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: resume requires the caller to hold the
RunState object or its JSON; there is no server-side "resume by run id" registry in the
SDK itself | HARVEST_CLASS: PATTERN_ONLY (the union-input-type resume switch) |
FALSIFICATION: verify that `to_state()` on a terminal (final-output) RunState raises
when `add_input` is called; verify `run_streamed` resume emits events without
duplicating already-streamed items |
DEPENDENCIES: none.

OA-04 | PROBLEM: conversation history needs a durable, backend-agnostic identity across
runs | SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/memory/session.py` `class Session(Protocol)` L53
(`session_id: str`, `get_items`, `add_items`, `pop_item`, `clear_session`) and
`class SessionABC` L96; `src/agents/extensions/memory/` (sqlite, redis, mongodb,
sqlalchemy, dapr, encrypted, advanced-sqlite) |
MATURITY: high. The protocol is tiny (4 async ops + `session_id`) and backends are
pluggable. `Runner.run(..., session=...)` auto-manages history |
INVARIANT: the session is the durable conversation identity; run identity is ephemeral
(RunState), conversation identity is the session id (or server-side conversation_id) |
IMPLEMENTATION: third parties implement the Protocol; the SDK ships `SessionABC` for
internal backends. Session settings control input limits (`session_settings.py`) |
FAILURE_MODE: concurrent writers to one session id are the application's problem
(RunState docstring calls for exclusive access); no built-in locking in the protocol |
PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: the protocol has no versioning, no
append-conditions, no conflict signal; `pop_item` returns only the most recent item, so
concurrent appenders cannot reconcile | HARVEST_CLASS: ADAPT (keep the tiny protocol,
add append-conditions/leases for multi-day autonomy) | FALSIFICATION: two processes
appending to one session id; confirm interleaving has no ordering guarantee and
`pop_item` cannot tell whose item was popped | DEPENDENCIES: per-backend libs only.

OA-05 | PROBLEM: long runs must shrink history without losing the durable record |
SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/memory/session.py` `_CompactionSnapshot` L44
(`replace_suffix: Callable[[int, list[TResponseInputItem]], Awaitable[bool]]`);
`src/agents/memory/openai_responses_compaction_session.py`
`OpenAIResponsesCompactionSession.run_compaction` L214,
`_replace_underlying_session_items` L524, `_recover_from_failed_replacement` L554 |
MATURITY: medium-high. Compaction is an atomic suffix-replacement with recovery paths:
on failed replacement it restores underlying items (`_restore_underlying_session_items`),
deferred compaction response ids, and orphaned-assistant-id stripping |
INVARIANT: compaction is a backend-owned atomic operation (suffix replace with a
completeness flag), not a client-side rewrite; a failed compaction restores the
pre-compaction record | IMPLEMENTATION: `select_compaction_candidate_items` picks
compressible history; the compaction model summarizes; `replace_suffix` swaps the tail
atomically, returning success bool; failure triggers restore-from-snapshot |
FAILURE_MODE: if the underlying session cannot do atomic suffix replacement, compaction
is emulated and failure windows widen; `default_should_trigger_compaction` is a naive
token-budget check unless overridden | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP:
no policy for what must never be compacted (receipts, approvals) | HARVEST_CLASS: ADAPT |
FALSIFICATION: kill the process mid-`replace_suffix`; on restart, session history must
be either fully pre-compaction or fully post-compaction, never a hybrid |
DEPENDENCIES: openai client for the compaction model call.

OA-06 | PROBLEM: tool outputs can blow up context; trim at the model-input boundary |
SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/extensions/tool_output_trimmer.py` `class ToolOutputTrimmer`
L88 (implements `CallModelInputFilter`); `_trim_function_call_output` L243,
`_trim_tool_search_output` L392 |
MATURITY: medium. Finds the most recent "boundary" item and trims older tool outputs to
budgets, preserving call-id-to-name mapping so the model still sees a coherent transcript |
INVARIANT: trimming happens on the model input list at call time; the durable session
record keeps full outputs (trim is presentation-layer, not a rewrite of history) |
IMPLEMENTATION: `__call__(CallModelData) -> ModelInputData`; per-output-type trimmers
(function, structured function, tool-search); JSON-schema shrinking for tool-search |
FAILURE_MODE: aggressive trims can drop the evidence the model needs to justify its next
call; budgets are static config | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no
feedback loop from model confusion back to trim aggressiveness | HARVEST_CLASS: PATTERN_ONLY |
FALSIFICATION: run an agent with a 200KB tool output through the trimmer; confirm the
session record is untrimmed while the model input is trimmed and call ids still resolve |
DEPENDENCIES: none.

OA-07 | PROBLEM: transient model/provider failures should not kill a multi-day run |
SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/run_internal/model_retry.py` `get_response_with_retry`
L574, `stream_response_with_retry` L684, `class RetryDecision` (via `src/agents/retry.py`
L117), `_is_conversation_locked_error` L68, `_is_network_like_error` L90 |
MATURITY: high. Typed error classification (network-like, abort-like, conversation-locked),
usage accounting for failed attempts (`apply_retry_attempt_usage` L338), and a
provider-retry authority separation (`_ProviderRetryAuthority` in retry.py) so SDK-level
retries don't double up with provider-managed retries (`_should_disable_provider_managed_retries`) |
INVARIANT: retries are bounded, classified, and usage-accounted; some error classes
(conversation locked) are never retried blindly | IMPLEMENTATION: stream events that
"block retry" are detected mid-stream (`_stream_event_blocks_retry`); cancellation drains
the attempt task (`_cancel_and_drain_model_attempt_task`) | FAILURE_MODE: retry storms
against a locked conversation are prevented by classification, but a misclassified error
still burns budget | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no persistent
retry-budget ledger across processes; in-memory per-run only | HARVEST_CLASS: ADAPT |
FALSIFICATION: inject a conversation-locked error mid-stream; verify no retry is
attempted and the failure surfaces typed | DEPENDENCIES: asyncio.

OA-08 | PROBLEM: delegate a subtask to a specialist without building a subagent runtime |
SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/handoffs/__init__.py` `class Handoff` L126,
`def handoff` L229; `src/agents/run_internal/run_steps.py` `class ToolRunHandoff`
L64, `class NextStepHandoff` L162; `src/agents/agent_tool_state.py`
(record/peek/consume agent tool run results with scoped weakref registry) |
MATURITY: high. Handoff is the SDK's signature primitive: an agent exposes itself as a
callable tool; the runner switches `current_agent` and continues the same loop. Handoff
input filters control what history the new agent sees. Agents-as-tools goes further:
nested runs with their own RunState checkpoints (`_AgentToolResumeCheckpoint`) and
approval routing across nesting levels (see OA-02) | INVARIANT: delegation is a loop
control-flow transition (NextStepHandoff), not a spawned process; nested agent-tool runs
carry their own resumable state keyed by scoped tool-call signature | IMPLEMENTATION:
handoff executed as a tool call; `run_loop.py` switches agent and re-enters the turn loop;
duplicate agent names get stable identity keys (`_run_state_agent_identity.py`) |
FAILURE_MODE: deeply nested agent-tool approvals require unique call IDs; ambiguous
identity raises instead of guessing | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no
execution caps, no timeout, no isolation between parent and delegated agent at this
layer | HARVEST_CLASS: PATTERN_ONLY (delegation-as-control-flow is cheap; autonomy needs
the missing caps) | FALSIFICATION: nest an agent-tool three deep, interrupt for approval
at the innermost level, serialize, resume, approve; verify the decision routes to the
innermost state | DEPENDENCIES: none.

OA-09 | PROBLEM: model_settings (e.g. tool_choice resets) must adapt to what an agent has
already tried | SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/run_internal/tool_use_tracker.py`
`class AgentToolUseTracker` (agent name -> tools used); serialized into RunState
(`_tool_use_tracker_snapshot`) and hydrated on resume |
MATURITY: medium. Simple name-keyed map for serialization plus instance-keyed list for
runtime checks; resets on handoff/tool-call/output item types |
INVARIANT: tool-use history is part of the durable run snapshot, so resumed runs keep
the same adaptive behavior as uninterrupted ones | IMPLEMENTATION:
`serialize_tool_use_tracker` / `hydrate_tool_use_tracker` round-trip through RunState |
FAILURE_MODE: name-keyed (not identity-keyed) serialization can collide on duplicate
agent names (mitigated by the agent identity keys in OA-01) | PING_EXISTING_ANALOG:
UNKNOWN, lane 19 | GAP: none significant for the autonomy substrate; small surface |
HARVEST_CLASS: PATTERN_ONLY (serialize behavioral trackers with the run snapshot) |
FALSIFICATION: run with tool_choice reset-on-first-use, interrupt, resume; confirm the
reset still fires exactly once | DEPENDENCIES: none.

OA-10 | PROBLEM: every run needs attributable, exportable receipts for debugging and
optimization | SOURCE: openai/openai-agents-python @ PINNED_SHA |
PINNED_SHA: `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` |
SOURCE_LOCATION: `src/agents/tracing/traces.py` `class Trace` L51
(`trace_id`, `export`, `to_json`); `class TraceState` L196 (`from_trace`/`from_json`/
`to_json`); `class ReattachedTrace` L305; `src/agents/tracing/processors.py`
`BackendSpanExporter` L44, `ConsoleSpanExporter` L27 |
MATURITY: high. Traces and spans export as JSON; trace state serializes into RunState so
a resumed run reattaches to the same trace (`ReattachedTrace`) instead of starting a
duplicate; exporters support batch export with deadlines and retries |
INVARIANT: trace identity survives resume; receipts are structured (trace/span JSON),
not log lines | IMPLEMENTATION: contextvars hold the current trace; processors receive
completed traces/spans; the OpenAI backend exporter sanitizes payloads for the tracing
API | FAILURE_MODE: tracing API key handling has an explicit include/exclude switch in
serialization (avoid leaking keys into snapshots) | PING_EXISTING_ANALOG: UNKNOWN,
lane 19 | GAP: receipts are observability-only; they do not carry approval or
tool-invocation authority (unlike Codex rollouts, which double as the resume source) |
HARVEST_CLASS: ADAPT (trace-state-in-snapshot is the pattern to copy) |
FALSIFICATION: serialize a mid-run trace, resume in a new process, confirm the exported
trace has one trace_id and no duplicate root span | DEPENDENCIES: httpx for backend
export.

### CODEX (Rust harness)

CX-01 | PROBLEM: a coding agent session must survive crashes and be resumable days
later with full fidelity | SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/rollout/src/recorder.rs` `pub struct RolloutRecorder` L86
(`record_canonical_items` L1035, `persist` L1053 idempotent, `flush` L1074,
`resume(path)` L365); files under `~/.codex/sessions/` (`SESSIONS_SUBDIR`) |
MATURITY: high. The rollout is a JSONL append-only event log written through a dedicated
writer task via a `RolloutCmd` channel (`AddItems` / `Persist`); `persist()` is
idempotent and retries by reopening the file handle after a first failure; the recorder
keeps pending items in memory so a failed materialization can be retried. Session
identity is a SessionId; rollout file names encode date/session for listing
(`rollout_file_name.rs`); there is a session index and a seekable reverse-JSONL reader |
INVARIANT: the rollout log is the source of truth for the thread; every resume rebuilds
session state from it (`reconstruct_history_from_rollout` in
`codex-rs/core/src/session/rollout_reconstruction.rs` L169); append is async and never
blocks the turn loop | IMPLEMENTATION: writer-lock (`writer_lock.rs`) serializes
writers; rollouts can be forked (`forked_from_ordinal_exclusive`) and have history modes
(full vs paginated); compression exists for old rollouts | FAILURE_MODE: if the writer
task dies twice, `persist` returns an error and the caller must handle the gap; an
interrupted turn is reconstructed as an interrupted segment, not silently completed |
PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: rollout items are unencrypted at rest;
no built-in retention policy visible at this layer | HARVEST_CLASS: DIRECT_REUSE
(Apache-2.0) | FALSIFICATION: kill -9 the CLI mid-turn, run `codex resume`, confirm the
transcript, plan, and approvals restore and the interrupted turn is marked interrupted,
not complete | DEPENDENCIES: tokio, serde_json.

CX-02 | PROBLEM: resume a thread by id, possibly on a different machine state |
SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/app-server/src/request_processors/thread_processor.rs`
`thread_resume` L555 -> `thread_resume_inner` L3596 -> `read_stored_thread_for_resume`
L4566 (via `thread_store.read_thread` by ThreadId or rollout path);
`codex-rs/core/src/session/daemon_recovery.rs` (`interrupted_turn`) |
MATURITY: medium-high. Resume reads the stored thread (optionally archived) with history,
redacts on the way in (`thread_resume_redaction.rs`), and replays items into a fresh
session. The app-server supports thread fork, revert, archive, and injection alongside
resume | INVARIANT: resume never mutates the old rollout in place; it starts a new live
thread hydrated from stored history (forks get their own rollout) | IMPLEMENTATION:
`ThreadResumeTarget` + `ThreadResumeParams`; paginated history mode pages backwards with
cursors rather than loading everything | FAILURE_MODE: resuming a thread whose rollout
references tools/environments no longer present yields a best-effort hydration; archived
threads need explicit inclusion | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no
advisory lock preventing two live resumes of the same thread id on different hosts |
HARVEST_CLASS: ADAPT | FALSIFICATION: resume thread T on host A, then resume T again on
host B while A is live; document whether both sessions append to the same rollout or
diverge | DEPENDENCIES: tokio, JSON-RPC app-server transport.

CX-03 | PROBLEM: frontends (TUI, exec, IDE, app-server) must share one core without
duplicating control logic; interrupts must preempt a running turn | SOURCE:
openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/core/src/session/submission.rs` `struct Submission`
(id, op: Op, trace: Option<W3cTraceContext>, parent_turn_id, root_turn_id,
residency_guard); `codex-rs/core/src/session/session.rs` `Session::new` L737;
`codex-rs/core/src/session/turn.rs` `run_turn` L163 taking a `CancellationToken` |
MATURITY: high. All operations flow as `Op` messages through one queue; `EventMsg`
streams back. `Op::Interrupt` cancels the active turn's token; tool executions check
`.or_cancel(&cancellation_token)` at await points (turn.rs L236, L482). The residency
guard keeps a spawned agent's runtime alive until its submission is handled or dropped |
INVARIANT: at most one running task per Session ("a Session represents an initialized
conversation with at most one running task at a time"); interrupts are first-class ops,
not signals | IMPLEMENTATION: W3C trace context propagates across async submission
handoffs; turn ancestry (parent/root turn ids) is retained in Debug diagnostics |
FAILURE_MODE: a stuck tool that ignores the cancellation token cannot be preempted by
the op queue (requires process-level kill); interrupts during compaction have explicit
abort semantics (`TurnAborted`) | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no
priority lanes; a flood of ops queues behind a long turn | HARVEST_CLASS: ADAPT |
FALSIFICATION: submit Op::Interrupt while a 60s shell tool runs; verify the turn task
cancels at the next await point and the session returns to idle | DEPENDENCIES: tokio.

CX-04 | PROBLEM: spawn and supervise subagents with bounded resources |
SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/core/src/agent/registry.rs` `AgentRegistry`
(`reserve_spawn_slot` L89, `try_increment_spawned` L330, `exceeds_thread_spawn_depth_limit`
L84, nickname reservation L257); `codex-rs/core/src/agent/control.rs`
`LocalAgentControl` (`send_input` L128, `interrupt_agent` L297, `list_agents` L347);
`codex-rs/core/src/agent/control/spawn.rs` (`spawn_forked_thread` L852,
fork modes, parent rollout-history snapshot for forks);
`codex-rs/core/src/agent/control/interrupt.rs` (root/self interrupts rejected);
`codex-rs/core/src/agent/control/resume.rs` (`resume_agent`: reopen only when runtime
absent; ThreadNotFound falls back to rollout restore) |
MATURITY: medium-high. This is a real multi-agent control plane ("MultiAgent V2" in
tests): registry enforces max_threads, spawn-depth limits, and unique agent paths;
spawning can fork with a snapshot of parent rollout items; children report completion;
parents can interrupt children but not themselves or root; interrupting a dead agent is
a success (idempotent) | INVARIANT: every spawned agent has a unique AgentPath and a
reserved slot; interrupts are safe to repeat | IMPLEMENTATION: spawn metadata carries
fork mode, parent spawn call id, execution caps, inherited environments and exec policy;
evicted environments are saved for later restore | FAILURE_MODE: depth/cap exhaustion
rejects the spawn (no queue); a child whose runtime died returns InternalAgentDied and
gets removed from the registry | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no
cross-host spawning; control plane is in-process | HARVEST_CLASS: ADAPT |
FALSIFICATION: spawn children to the max_threads cap, then spawn one more; verify clean
rejection (not a hang). Interrupt a finished child; verify success, not an error |
DEPENDENCIES: tokio.

CX-05 | PROBLEM: decide per command whether it may run, needs approval, or is denied |
SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/core/src/exec_policy.rs` `ExecPolicyManager`
(`create_exec_approval_requirement_for_command_platform`); `codex-rs/protocol/src/approvals.rs`
`ExecApprovalKind` L263, `ExecApprovalRequestEvent` L270, `ElicitationRequest` L404
(UserVerification/Form/Url), `ElicitationRequestEvent` L451; `codex-rs/core/src/elicitation.rs`
`ElicitationService` (refcounted pause: `register`/`wait_until_clear`) |
MATURITY: high. Policy is an ArcSwap-loaded ruleset; per-command approval requirements
are computed with platform context; elicitation (user verification forms, URL flows)
pauses tool-result delivery via a refcount so concurrent elicitations keep the session
paused until ALL finish | INVARIANT: no tool executes without a policy decision;
elicitation pauses are counted, not boolean, so nested/concurrent prompts cannot
prematurely unpause the session | IMPLEMENTATION: approval request events go to the
frontend; the turn loop awaits the decision; ElicitationService.subscribe gives a watch
channel for pause-timeout progress | FAILURE_MODE: a policy parse failure warns and
falls back (fail-open on config error is a deliberate, debatable choice); a frontend
that never answers an elicitation stalls the turn until timeout/cancel |
PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: fail-open on policy parse; unattended
multi-day runs need a default-deny or auto-escalation posture instead | HARVEST_CLASS:
ADAPT (take the refcounted-pause barrier and the per-command requirement computation;
replace the fail-open default) | FALSIFICATION: start two concurrent elicitations,
resolve one; verify the session stays paused until the second resolves | DEPENDENCIES:
tokio watch channels.

CX-06 | PROBLEM: bound the sandbox a command runs in, per policy |
SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/protocol/src/config_types.rs` `SandboxPolicy`
(ReadOnly L107, WorkspaceWrite L110, DangerFullAccess L113);
`codex-rs/core/src/sandboxing/mod.rs` `ExecRequest` L50;
`codex-rs/core/src/apply_patch.rs` `prepare_apply_patch` (PatchSandboxRoute +
ExecApprovalRequirement) |
MATURITY: high. Three-tier policy; patch application is a routed, approval-gated
operation (`PatchSandboxRoute`, `assess_patch_safety`); platform backends exist
(linux-sandbox with landlock/seccomp, seatbelt on macOS, windows sandbox config) |
INVARIANT: the sandbox tier is a property of the session config, applied uniformly to
every exec; patches never bypass the sandbox route | IMPLEMENTATION: ExecRequest wraps
the command with the sandbox decision; network policy is a separate axis
(NetworkPolicyRuleAction) | FAILURE_MODE: DangerFullAccess is one config flag away;
policy is per-session, not per-command (a session cannot mix tiers) | PING_EXISTING_ANALOG:
UNKNOWN, lane 19 | GAP: no per-command tier override; no resource (CPU/RAM/time) limits
visible at this layer | HARVEST_CLASS: PATTERN_ONLY (the three-tier model) |
FALSIFICATION: set WorkspaceWrite, attempt a write outside the workspace; verify denial
at the sandbox layer, not just the policy layer | DEPENDENCIES: OS-specific sandbox
backends.

CX-07 | PROBLEM: keep a multi-hundred-turn thread within the context window without
losing the ability to resume | SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/core/src/compact.rs` `run_compact_task` L145,
`run_inline_auto_compact_task` L113, `build_compaction_initial_context` L91;
`codex-rs/core/src/session/turn.rs` `run_pre_sampling_compact` (called before prompt
construction in run_turn) |
MATURITY: high. Compaction is a first-class turn kind: pre-sampling auto-compact,
mid-turn compact, and manual `/compact` all funnel through `run_compact_task_inner`
with (trigger, reason, phase) metadata (`CompactionTrigger`, `CompactionReason`,
`CompactionPhase`); remote compaction (server-side) vs local (Responses API) are both
supported; compaction turns are recorded in the rollout like any turn |
INVARIANT: compaction produces a summarized replacement segment that stays in the
durable rollout; the original items are not deleted from the archive path |
IMPLEMENTATION: token budgets (`compact_token_budget.rs`), image budgets, and analytics
attempts wrap each compaction; `reconstruct_history_from_rollout` understands compacted
segments (`reconstructed_window_from_compaction`) | FAILURE_MODE: a failed pre-sampling
compact preserves the pending user input and continues the turn uncompacted
(degraded, not dead); remote-compact V2 failures surface as turn errors |
PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: compaction quality is model-dependent;
no verification that the summary preserves actionable state | HARVEST_CLASS: ADAPT |
FALSIFICATION: run to the auto-compact threshold, kill mid-compaction, resume; verify
history is either pre- or post-compaction and the turn proceeds | DEPENDENCIES: model
provider for summarization.

CX-08 | PROBLEM: apply model-proposed file edits safely and auditably |
SOURCE: openai/codex @ PINNED_SHA |
PINNED_SHA: `4b3b569f3975ba4e3bf64589e4d15039066077f8` |
SOURCE_LOCATION: `codex-rs/core/src/apply_patch.rs` `prepare_apply_patch`;
`codex-apply-patch` crate (`ApplyPatchAction`, `ApplyPatchFileChange`);
openai-agents-python `src/agents/apply_diff.py` `apply_diff(input, diff, mode)` L52
(custom anchor-based diff format with `@@` anchors, create/update modes) |
MATURITY: medium-high. The patch format is deterministic and anchor-based (not unified
diff): `_parse_create_diff` / `_parse_update_diff` with context matching
(`_find_context`); in Codex the patch goes through safety assessment and a sandbox
route with its own approval requirement before touching the filesystem |
INVARIANT: file edits are a typed operation (action + file changes), not shell text;
in the SDK the same diff engine is exposed as a plain function for reuse |
IMPLEMENTATION: chunk parsing with newline detection/normalization; anchors advance a
cursor through the file; mismatches fail closed | FAILURE_MODE: ambiguous anchors fail
rather than editing the wrong location; large patches are applied in one shot (no
partial-apply resume) | PING_EXISTING_ANALOG: UNKNOWN, lane 19 | GAP: no transactional
multi-file apply with rollback | HARVEST_CLASS: DIRECT_REUSE (the SDK `apply_diff` is
MIT, dependency-free Python) | FALSIFICATION: feed a diff whose anchor matches twice;
verify refusal, not first-match application | DEPENDENCIES: none for the SDK function;
codex-apply-patch crate for the Rust side.

---

## 3. Claims I could NOT verify in source

1. "Production-ready" (agents SDK READMEs): no source artifact defines production
   readiness; it is a marketing claim. The code is, however, defensively written
   (fail-fast schemas, adversarial serialization hardening).
2. "Supports 100+ LLMs": the multi-provider adapter (`models/multi_provider.py`,
   litellm) exists, but I did not verify any count; the claim is not falsifiable in
   source.
3. JS SDK feature parity with Python: JS repo pinned but not read; parity is claimed in
   docs only.
4. Codex `resume` restoring in-flight tool approvals: I verified thread resume
   replays history and marks interrupted turns, but did not verify that a pending
   exec-approval decision requested before a crash is re-presented (vs. requiring
   re-request) after resume.
5. Codex cloud/remote execution ("codex cloud"): the repo has app-server remote
   threads and rollout sync, but I did not verify a server-side execution environment
   in the open-source tree; treat hosted-execution claims as UNVERIFIED for this lane.
6. Agents SDK "sandbox agents ... perform work over long time horizons": the sandbox
   subsystem (docker/unix_local sessions, snapshot persist/restore, mount rebinding)
   exists and is substantial, but I sampled only snapshot/state/manager; I did not
   verify an end-to-end long-horizon scheduler or watchdog in the open-source tree.
7. Any claim about approval latency, throughput, or token overhead: no benchmarks in
   the repos.

---

## 4. Open questions

1. Who owns the lease? Neither system enforces single-writer semantics on resume
   (agents SDK: documented caller obligation; Codex: no cross-host resume lock found).
   For multi-day autonomy, PING needs an explicit run-lease (holder id, heartbeat,
   fencing token) at the resume boundary. Is there prior art in either repo's tests
   I missed (e.g. `writer_lock.rs` semantics beyond the writer task)?
2. The agents SDK `RunState` forbids concurrent resume but the Codex rollout writer
   lock only serializes the writer task. Which granularity is right for PING:
   per-run, per-thread, or per-session?
3. Codex elicitation pauses tool-result delivery but model sampling may continue;
   for unattended runs, should elicitation auto-decline, auto-escalate, or convert
   to an async approval ticket? The code supports timeout progress subscription,
   suggesting the UX exists but the unattended policy does not.
4. The SDK's `Session` protocol has no append-condition. Should PING extend it
   (expected-tail-hash, monotonic sequence) or keep the tiny protocol and put
   concurrency in a wrapper?
5. Tracing receipts (SDK) vs rollout-as-truth (Codex): for PING, do we want receipts
   to be derivable from the event log (one system) or a parallel system
   (two systems, like the SDK)?
6. `SuspendTurnOutcome` (NotActive/UnsupportedTask/HasLiveDescendants) suggests
   graceful suspend exists for daemon threads; I did not trace the full suspend path
   to disk. Is suspend durable across daemon restarts, or only in-memory?

## 5. Harvest shortlist (for lane 19)

DIRECT_REUSE candidates: SDK `apply_diff` (anchor-based patch engine); Codex
`RolloutRecorder` JSONL writer pattern; SDK `TraceState` resume-reattach.
ADAPT candidates (highest value): `RunState` versioned snapshot + interruption model;
refcounted elicitation pause barrier; atomic suffix-replacement compaction; per-command
exec approval requirements; registry spawn slots/depth limits/nickname reservation.
REJECT for unattended autonomy as-is: fail-open policy parse; sticky approvals keyed
by bare tool name; session protocol without append-conditions; concurrent-resume
"caller obligation" without enforcement.
