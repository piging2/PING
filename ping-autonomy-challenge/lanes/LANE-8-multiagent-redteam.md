# LANE 8: Multi-Agent Framework Red Team (AutoGen / CrewAI / OpenAI Swarm)

**Role:** adversarial mechanism critic. Research/falsification only.
**Date:** 2026-09-23
**Status:** complete, evidence-backed. Every claim below is pinned to a source file at a pinned SHA.

## 0. Method

Read the actual source at pinned SHAs. Traced one realistic multi-step task through each framework's coordination path and counted: tokens spent on coordination vs tokens spent on work, state surviving a crash, and decision authority at each step.

**Reference task** (used for all token traces): "Research 3 plumbers in Grand Junction, pick the best, draft a quote-follow-up email." Assumed shape: T=6 agent turns, each turn adds ~800 tokens of transcript, each turn's genuine work product is ~400 output tokens, total work output ~2,400 tokens. Assumptions are stated so the arithmetic can be re-checked; the structural findings (extra LLM calls per turn, full-history replay, zero persistence) do not depend on the numbers.

**Verdict up front:** all three frameworks tax every unit of work with a coordination overhead that grows superlinearly in conversation length, persist ~nothing by default, and blur decision authority. "Group chat" as a coordination primitive does not survive. Five narrow mechanisms survive; eleven patterns go on the kill list.

---

## 1. Sources + pinned SHAs

| Framework | Repo | Pinned SHA (HEAD at read time) | Read path |
|---|---|---|---|
| AutoGen | github.com/microsoft/autogen | `027ecf0a379bcc1d09956d46d12d44a3ad9cee14` | `python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/` (base, selector, round-robin, swarm, graph, magentic-one), `agents/_assistant_agent.py`, `conditions/_terminations.py` |
| CrewAI | github.com/crewAIInc/crewAI | `7060bf858bdec450f8652aa7934a582ef5c10aaf` | `lib/crewai/src/crewai/crew.py`, `task.py`, `process.py`, `agents/crew_agent_executor.py`, `agents/agent_builder/base_agent_executor.py`, `tools/agent_tools/`, `utilities/agent_utils.py`, `utilities/formatter.py`, `memory/`, `state/` |
| OpenAI Swarm | github.com/openai/swarm | `6af0b4caf37dca4526dfd98e9fbd8ce36e7eeb22` | entire `swarm/` package (424 lines: `core.py`, `types.py`, `util.py`) + README |

Local read-only copies: `~/workspace/ping-autonomy-challenge/work-lane8/{autogen-src,crewai-src,swarm-src}/`.

Swarm is officially archived: its README states "Swarm is now replaced by the OpenAI Agents SDK... experimental, educational." It is read here as a cautionary artifact, as instructed.

---

## 2. THE KILL LIST

Patterns from these frameworks that PING must NOT adopt. Each entry: the pattern, the concrete failure it produces, and where it was observed.

### K-01 — LLM-as-router on every turn
**Observed:** AutoGen `SelectorGroupChat` — `_selector_group_chat.py`, `SelectorGroupChatManager.select_speaker()` calls `self._model_client.create(...)` with the **entire conversation history** (`construct_message_history` over `UnboundedChatCompletionContext`), plus a retry loop up to `max_selector_attempts=3` when the model fails to emit a parseable name (parsed by regex `_mentioned_agents`).
**Failure:** every work turn costs a second full-history LLM call whose only output is a participant name (~5 tokens). On the reference task: 6 extra full-history calls ≈ 19,800 input tokens of pure coordination vs 2,400 work tokens. When the model misbehaves 3 times, the manager **silently falls back** to the previous speaker (or the first participant) with only a log warning — routing authority degrades to arbitrary with no signal to the caller.
**PING rule:** routing is a deterministic function of structured state. Never spend an LLM call to pick who speaks next.

### K-02 — Broadcast-everything group chat
**Observed:** AutoGen `_chat_agent_container.py`: `handle_agent_response()` appends **every** broadcast message to **every** participant's `_message_buffer`; on its turn the container passes the whole buffer to `on_messages_stream`. Combined with `_assistant_agent.py:837-840` defaulting every agent to `UnboundedChatCompletionContext()`, each of N agents holds a full copy of the transcript and re-sends it on every turn.
**Failure:** O(N·T²) input-token burn. With 3 agents and 6 turns, ~28,000 of ~31,000 input tokens are agents re-reading each other's chatter. The transcript is also copied a third time in the manager's `_message_thread` and (for SelectorGroupChat) a fourth time in the selector's model context. Context duplication is structural, not incidental.
**PING rule:** agents receive the minimum context their task contract names, never the team's full transcript. Explicit context dependencies, not broadcast.

### K-03 — Orchestrator ledger as a per-step LLM ritual
**Observed:** AutoGen MagenticOne `_magentic_one_orchestrator.py`: `_orchestrate_step()` makes a **progress-ledger LLM call with the full thread** (`_thread_to_context()`) before every agent step, with a JSON-parse retry loop (`_max_json_retries`); on stall it makes **two more** full-context calls (`_update_task_ledger`: facts + plan); `_prepare_final_answer` makes another. The loop/stall detector (`is_in_loop`, `is_progress_being_made`) is itself LLM-judged.
**Failure:** coordination:work **call** ratio of 2:1 to 4:1 per step, each call carrying the full transcript plus ~2.5k tokens of ledger prompt. The thing that detects unbounded loops is an LLM call that can hallucinate — the safety mechanism has the same failure mode as the thing it guards. `_thread_to_context()` also **drops all ToolCallRequestEvent/ToolCallExecutionEvent**, so the ledger reasons about progress while blind to actual tool activity.
**PING rule:** progress tracking is derived from durable structured state (task records), never from re-reading the transcript through a model each step.

### K-04 — Manager that is forbidden from doing work (mandatory delegation)
**Observed:** CrewAI `crew.py::_create_manager_agent()`: `raise Exception("Manager agent should not have tools")` — the hierarchical manager is **by construction** incapable of acting; 100% of work must round-trip through `DelegateWorkTool` JSON.
**Failure:** fake delegation as architecture. The manager serializes intent into free-text strings (`task`, `context`, `coworker`), the tool spawns an ephemeral `Task` and calls `selected_agent.execute_task(...)` synchronously (`tools/agent_tools/base_agent_tools.py::_execute`). The worker's entire world is the manager's summary — an information bottleneck in both directions — and the finished work is pasted back into the manager's transcript, duplicating it. An agent "delegating" what the framework forbids it from doing directly is not collaboration; it is a serialization round-trip billed as teamwork.
**PING rule:** any coordinator that cannot itself execute is a pure token tax. If a step can be done directly, it must be done directly.

### K-05 — Stringly-typed agent addressing
**Observed:** CrewAI `tools/agent_tools/base_agent_tools.py`: `sanitize_agent_name` (casefold + whitespace-normalize) matched against `agent.role`; `_get_coworker` takes the first element if the model emits a list; `DelegateWorkToolSchema.coworker: str` is free text the model must reproduce exactly.
**Failure:** authority ambiguity. A hallucinated coworker name does not raise — `_execute` returns an **error string** (`agent_tool_unexisting_coworker`) that is fed back into the model's context as if it were a tool result. Misrouting is silent and self-reinforcing. Two agents with similar roles are one model slip away from cross-delegation.
**PING rule:** agent references are IDs from a registry, validated before dispatch. A bad address is a hard error, never a string in a transcript.

### K-06 — Forced final answer on iteration exhaustion
**Observed:** CrewAI `utilities/agent_utils.py:376` `handle_max_iterations_exceeded()`: after `max_iter` (default 25, `agents/agent_builder/base_agent_executor.py:27`) failed ReAct iterations, the framework appends a "force final answer" instruction and makes **one more LLM call** to extract an answer from the wreckage.
**Failure:** converts failure into fabrication. A loop that produced nothing useful for 25 iterations is rewarded with a forced summary presented as the task output (`TaskOutput.raw`). This is the opposite of fail-closed: it manufactures confidence from exhaustion.
**PING rule:** exhaustion is a typed failure (`FAILURE`, not a summary). Never coerce a failed loop into a plausible-sounding answer.

### K-07 — Text-parsed ReAct as the agent loop
**Observed:** CrewAI `agents/crew_agent_executor.py::_invoke_loop_react()`: tool schemas embedded as prompt text, model emits `Action:`/`Action Input:` text, parsed by `agents/parser.py`, with `_append_text_tool_calling_fallback_message` for when the model doesn't comply.
**Failure:** brittle string parsing of model output as the control plane, with a fallback path that exists because the primary path routinely fails. (A native-tool-call loop exists alongside it — the framework ships two control planes and lets the model pick which one to break.)
**PING rule:** one tool-calling mechanism, structured (native function calling). No regex control planes.

### K-08 — Unbounded context as the default
**Observed:** AutoGen `_assistant_agent.py:837-840` and `SelectorGroupChatManager.__init__` both default to `UnboundedChatCompletionContext()`. Bounded variants (`BufferedChatCompletionContext`, `TokenLimitedChatCompletionContext`) exist but are opt-in.
**Failure:** token burn is O(T²) **by default**; the safe configuration requires the user to know it exists. Defaults are the product: the default is the unbounded one.
**PING rule:** bounded context is the default; unbounded requires explicit opt-in with a named reason.

### K-09 — Silent degradation instead of loud failure
**Observed:** (a) AutoGen `_selector_group_chat.py::_select_speaker`: after `max_selector_attempts` failures, returns previous speaker or first participant with `trace_logger.warning` — the run continues with arbitrary routing. (b) Swarm `core.py::get_chat_completion`: `context_variables = defaultdict(str, context_variables)` — a missing key silently becomes `""` inside tool arguments.
**Failure:** both convert "I don't know" into "proceed with wrong data." The selector's fallback is invisible unless the caller enabled `emit_team_events` (default **False** — K-11). The defaultdict fabrication means tools receive empty strings for parameters the agent never set, and the model cannot distinguish "empty" from "missing."
**PING rule:** unknown routing and missing parameters are hard errors. Fail closed, fail loud.

### K-10 — Run loops with no persistence and no cycle detection
**Observed:** Swarm `core.py::run()`: `while len(history) - init_len < max_turns` with `max_turns: int = float("inf")` default; `history`, `context_variables`, `active_agent` are **local variables**. A function returning an `Agent` switches `active_agent` — A→B→A handoff cycles have no code-level detection.
**Failure:** crash loses everything (the returned `Response` only helps if the caller persists it — nothing in the framework does). Infinite loop is the default configuration; the only bound is one the user must remember to set. The archived README confirms this was never meant for production ("experimental, educational").
**PING rule:** every run loop has a default bound < infinity, cycle detection on routing, and state that survives the process.

### K-11 — Coordination decisions invisible by default
**Observed:** AutoGen `_base_group_chat.py`: `emit_team_events: bool = False` default. The `SelectSpeakerEvent` (who was chosen and, implicitly, why) is only emitted when explicitly enabled.
**Failure:** authority ambiguity by default. In a SelectorGroupChat run you cannot answer "who decided the critic should speak next, and on what basis" from the output stream unless you knew to flip a flag beforehand. Auditability must not be opt-in.
**PING rule:** every routing/authority decision is recorded in the durable event log by default.

---

## 3. Token trace summary (reference task, T=6 turns, ~800 new transcript tokens/turn, ~400 work-output tokens/turn)

| Framework | Coordination LLM calls (extra) | Coordination input tokens (approx) | Work output tokens | Coordination:work token ratio | State surviving crash |
|---|---|---|---|---|---|
| AutoGen SelectorGroupChat (3 agents) | 6 (1/turn) + up to 18 retries | ~31,000 | ~2,400 | **~13:1** | ~none (manual `save_state()` only; docstring warns state "may not be consistent" if taken while running) |
| AutoGen MagenticOne (4 agents + orchestrator) | 12–24 (2–4/step) | ~40,000+ (ledger prompts ~2.5k each) | ~2,400 | **~17:1** | ~none (same manual save_state) |
| OpenAI Swarm (3 agents, 2 handoffs) | 2 (handoff turns) | ~3,000 + full-history replay baseline | ~2,400 | **~1.5:1** marginal, but unbounded-loop + zero-durability | none (locals only) |
| CrewAI hierarchical (manager + 3 workers, 3 delegations) | 3+ delegation round-trips + manager ReAct loop (up to 25 iters) | ~8,000–15,000 (manager transcript + duplicated worker outputs) | ~2,400 | **~4:1** | opt-in checkpoints only |
| CrewAI sequential (3 tasks) | 0 | ~2,000 (bounded: concatenated task outputs only) | ~2,400 | **~1:1** | opt-in checkpoints; task outputs persisted to SQLite kickoff-task-outputs store |

The numbers are estimates from static tracing; the structural facts (extra calls per turn, full-history replay, no default persistence) are read directly from code.

---

## 4. Surviving mechanisms (canonical format)

Few survived. Each is narrow, deterministic, and auditable.

### M-01 — Deterministic termination conditions (AutoGen)

| Field | Value |
|---|---|
| MECHANISM_ID | M-01-autogen-termination-conditions |
| PROBLEM | Bounding agent loops without spending an LLM call to decide "are we done" |
| SOURCE | microsoft/autogen |
| PINNED_SHA | `027ecf0a379bcc1d09956d46d12d44a3ad9cee14` |
| SOURCE_LOCATION | `python/packages/autogen-agentchat/src/autogen_agentchat/conditions/_terminations.py` (classes `StopMessageTermination`, `MaxMessageTermination`, `TextMentionTermination`, `TokenUsageTermination`, `HandoffTermination`, `TimeoutTermination`, `ExternalTermination`, `SourceMatchTermination`, `TextMessageTermination`, `FunctionCallTermination`; composable via `&`/`\|`) |
| MATURITY | High — shipped, tested, serializable (`Component` configs) |
| INVARIANT | Termination is a pure predicate over the message delta; no model call, no hidden state, deterministic given the same messages |
| IMPLEMENTATION | `BaseGroupChatManager._apply_termination_condition` invokes the predicate per turn; on trigger it resets the condition, zeroes the turn count, and signals termination through the output queue. Predicates compose with boolean operators |
| FAILURE_MODE | Text-match predicates (`TextMentionTermination("TERMINATE")`) can be spoofed by model output quoting the trigger string; predicates see only the delta, not full history; condition state is reset on termination so resume-from-state loses the termination history |
| PING_EXISTING_ANALOG | PING's bounded-automation principle and stop conditions (best effort — PING already treats a detected restriction as BLOCKED, never an optimization problem; this is the same shape: a code-level bound, not a judgment call) |
| GAP | PING should verify it has *composable* bounds (count AND token-budget AND timeout AND external-cancel AND predicate) as first-class, serializable config rather than ad-hoc per-job checks |
| HARVEST_CLASS | ADAPT — adopt the composable-predicate shape; do not adopt the text-spoofable triggers without quoting/escaping rules |
| FALSIFICATION | Write a 3-agent AutoGen team with `TextMentionTermination("TERMINATE")` and have an agent quote the word TERMINATE in a benign sentence; confirm whether the team stops early (predicted: yes — spoofable). Not executed here (no model credentials in this lane); marked UNTESTED |
| DEPENDENCIES | None beyond the message stream |

### M-02 — Statically validated workflow graph with conditional edges (AutoGen DiGraph)

| Field | Value |
|---|---|
| MECHANISM_ID | M-02-autogen-digraph-routing |
| PROBLEM | Routing between agents without an LLM in the routing loop and without broadcast |
| SOURCE | microsoft/autogen |
| PINNED_SHA | `027ecf0a379bcc1d09956d46d12d44a3ad9cee14` |
| SOURCE_LOCATION | `python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_graph/_digraph_group_chat.py` (`DiGraphEdge.check_condition`, `DiGraph.has_cycles_with_exit`, `graph_validate`); `_graph/_graph_builder.py` (builder API: `add_edge(source, target, condition)`, `add_conditional_edges`) |
| MATURITY | Medium — shipped; `assert` used in one validation path (`_swarm_group_chat.py` analog) suggests uneven hardening |
| INVARIANT | The full routing topology is declared up front, statically validated (cycle-with-exit check), and edge traversal is a deterministic function of message content — no model call per hop |
| IMPLEMENTATION | `DiGraphBuilder` constructs nodes/edges; `graph_validate()` rejects invalid topologies at build time; `GraphFlowManager` activates nodes whose edge conditions (callable or keyword) match the triggering message; fan-in/fan-out with remaining-map accounting |
| FAILURE_MODE | Keyword conditions are substring matches on message text (spoofable like M-01); callable conditions are arbitrary user code (non-serializable, unauditable); graph is fixed at build time — no dynamic replanning |
| PING_EXISTING_ANALOG | PING's deterministic pipelines / workflow orientation (best effort); closest to "explicit dependency DAG" |
| GAP | PING likely lacks a *statically validated* conditional graph primitive — build-time cycle/exit validation of a multi-step agent topology is the harvestable part |
| HARVEST_CLASS | ADAPT — the static-validation-before-execution discipline; conditions should be typed predicates over structured state, not substring matches |
| FALSIFICATION | Construct a DiGraph with a cycle lacking an exit and confirm `graph_validate()` rejects it at build time (predicted: yes, per `has_cycles_with_exit`). UNTESTED (no execution in this lane) |
| DEPENDENCIES | Message stream with typed messages |

### M-03 — Explicit task context dependencies with bounded aggregation (CrewAI sequential)

| Field | Value |
|---|---|
| MECHANISM_ID | M-03-crewai-explicit-task-context |
| PROBLEM | Giving a downstream step the context it needs without broadcasting the whole transcript |
| SOURCE | crewAIInc/crewAI |
| PINNED_SHA | `7060bf858bdec450f8652aa7934a582ef5c10aaf` |
| SOURCE_LOCATION | `lib/crewai/src/crewai/task.py:167` (`Task.context: list[Task]`, explicit dependency list); `lib/crewai/src/crewai/utilities/formatter.py:16` (`aggregate_raw_outputs_from_task_outputs`); `lib/crewai/src/crewai/crew.py:1879` (`_get_context`); `lib/crewai/src/crewai/process.py` (`Process.sequential`) |
| MATURITY | High — the boring default path, heavily exercised |
| INVARIANT | A task's input context is exactly the declared dependency set's raw outputs, joined with dividers; no transcript, no chatter, no LLM summarization in between |
| IMPLEMENTATION | `_execute_tasks` loops tasks in order; `_get_context` resolves `task.context` (explicit list) or all prior outputs; the concatenated string becomes `prompt_context` for the agent's run. Zero orchestration LLM calls in sequential mode |
| FAILURE_MODE | Raw-output concatenation is unbounded in the size of upstream outputs (no token budget on the aggregation); `context` as free-text from delegation (hierarchical) bypasses the explicitness — the mechanism only holds in sequential mode; no dedup if two tasks depend on the same large output |
| PING_EXISTING_ANALOG | PING's evidence-bounded, projection-oriented data flow (best effort) — pass named artifacts forward, not transcripts |
| GAP | If PING's pipelines already pass explicit artifacts between steps, this is already owned; the incremental lesson is making the dependency list *declarative on the task* (not implicit in execution order) |
| HARVEST_CLASS | ADOPT (as already-owned pattern) — declare data dependencies on the task; aggregate bounded artifacts, never transcripts |
| FALSIFICATION | Trivially inspectable: read any sequential crew's per-task prompt and confirm it contains only declared dependencies' outputs. Static-verified from code; no execution needed |
| DEPENDENCIES | Task outputs persisted as structured records (`TaskOutput`) |

### M-04 — Event-sourced checkpointing with pluggable providers (CrewAI)

| Field | Value |
|---|---|
| MECHANISM_ID | M-04-crewai-checkpoints |
| PROBLEM | Surviving a crash mid-run; resuming without replaying from scratch |
| SOURCE | crewAIInc/crewAI |
| PINNED_SHA | `7060bf858bdec450f8652aa7934a582ef5c10aaf` |
| SOURCE_LOCATION | `lib/crewai/src/crewai/state/checkpoint_config.py` (`CheckpointConfig`: location, event types, max_checkpoints), `state/checkpoint_listener.py` (event-driven writes), `state/provider/json_provider.py` + `sqlite_provider.py` (pluggable durable backends), `crew.py:432` (`Crew.from_checkpoint`), `crew.py:1903` (`_drain_memory_writes`) |
| MATURITY | Medium — real machinery (providers, resume CLI `crewai checkpoint resume`), but opt-in and event-granular |
| INVARIANT | Checkpoints are written on configured events to a durable provider; resume reconstructs runtime state from the checkpoint rather than re-executing |
| IMPLEMENTATION | `CheckpointConfig` attached to Crew/Flow/Agent; listener writes state snapshots per event type to JSON files or SQLite; `from_checkpoint` restores; `_drain_memory_writes` blocks completion until background memory saves land (ordering hazard acknowledged in code) |
| FAILURE_MODE | Opt-in: default runs persist nothing. Event-granularity means a crash between events loses the delta. `_drain_memory_writes` exists because background saves race completion — resume may see torn state. Resume across code changes (new task graph) is unvalidated |
| PING_EXISTING_ANALOG | PING's event/evidence plane and continuity posture (best effort — PING is the durable substrate; this mechanism is the closest any of the three frameworks gets) |
| GAP | PING should check: are its run states checkpointable *per event* to a pluggable backend, and is resume-from-checkpoint a tested round-trip rather than an aspiration |
| HARVEST_CLASS | STUDY — the provider abstraction and the drain-before-complete discipline; do not adopt the opt-in default |
| FALSIFICATION | Kill a checkpointed crew mid-delegation and resume via `crewai checkpoint resume <id>`; verify the resumed run does not re-execute completed tasks and does not show torn memory. UNTESTED in this lane — flagged as the highest-value empirical follow-up |
| DEPENDENCIES | Event bus, serializable task/agent state |

### M-05 — Handoff as structured data, not chat text (OpenAI Swarm)

| Field | Value |
|---|---|
| MECHANISM_ID | M-05-swarm-handoff-as-data |
| PROBLEM | Transferring control between specialists without an LLM router call and without parsing chat text |
| SOURCE | openai/swarm (archived; cautionary artifact) |
| PINNED_SHA | `6af0b4caf37dca4526dfd98e9fbd8ce36e7eeb22` |
| SOURCE_LOCATION | `swarm/core.py::handle_function_result` (`case Agent() as agent: return Result(value=..., agent=agent)`), `swarm/types.py` (`Result.agent: Optional[Agent]`), `swarm/core.py::run` (`if partial_response.agent: active_agent = partial_response.agent`); AutoGen's port: `_swarm_group_chat.py::select_speaker` (pure function scanning for last `HandoffMessage` — no LLM call) |
| MATURITY | Low as a framework (archived, "experimental, educational"), but the *mechanism* is sound and minimal |
| INVARIANT | The routing decision is a typed field on the tool result (`Result.agent`), recorded in the transcript as a tool call; the router switches on the field value deterministically — no regex over chat, no extra model call |
| IMPLEMENTATION | Agent function returns an `Agent` instance (or `Result(agent=...)`); the run loop adopts it as `active_agent`; the handoff is visible in history as the tool call that produced it. AutoGen's Swarm team does the same with `HandoffMessage(target=...)` scanned by a pure function |
| FAILURE_MODE | No cycle detection: A→B→A handoffs loop until `max_turns` (default infinity). Agent identity is a display-name string. The handoff carries no reason/authority record beyond the tool call itself |
| PING_EXISTING_ANALOG | Explicit routing fields on structured task results (best effort) |
| GAP | If PING routes work between specialists, the routing decision should be a typed field on the result record (with reason + authority), validated against a registry (fixes K-05), with cycle detection (fixes K-10) |
| HARVEST_CLASS | ADAPT — keep "routing as structured result field"; add registry validation, reason capture, and cycle detection, which Swarm lacked |
| FALSIFICATION | Run two Swarm agents whose transfer functions unconditionally return each other with `max_turns=100`; confirm ping-pong until the bound (predicted: yes, no cycle detection). UNTESTED (no model calls in this lane) |
| DEPENDENCIES | Tool-result schema that admits a routing field |

---

## 5. What "group chat" would have to do to defend itself

It cannot. The defense would need: (1) routing cheaper than the work it routes — falsified by K-01/K-03 (a full-history LLM call per turn to emit a name); (2) shared context cheaper than private context — falsified by K-02 (N full transcript copies, O(N·T²)); (3) durability — falsified by K-10 and the AutoGen `save_state` "may not be consistent" caution; (4) clear authority — falsified by K-09/K-11 (silent fallbacks, invisible routing decisions). Every framework's *deterministic* variant (RoundRobin, DiGraph, sequential process, handoff-as-data) outperforms its *chatty* variant on all four — which is the real finding: **the "multi-agent" value, where it exists, lives in the deterministic coordination machinery, not in agents talking to each other.**

---

## 6. Open questions

1. **CrewAI checkpoint resume round-trip (highest value):** does `crewai checkpoint resume` actually restore a mid-delegation crew without re-execution or torn memory? M-04's value depends entirely on this; `_drain_memory_writes` suggests the authors hit ordering bugs. Empirical test needed.
2. **AutoGen termination spoofing:** is `TextMentionTermination` actually triggerable by quoted text in the reference task? One scripted run would confirm M-01's failure mode and size the quoting/escaping requirement.
3. **DiGraph build-time validation coverage:** does `graph_validate()`/`has_cycles_with_exit()` catch all livelock shapes, or only simple cycles? Untested.
4. **Swarm handoff ping-pong:** confirm the A→B→A cycle behavior empirically (predicted: runs to `max_turns`).
5. **CrewAI manager-tool prohibition rationale:** `_create_manager_agent` *raises* if the manager has tools — is there a documented reason beyond "that's the pattern," and does the newer `manager_agent` custom path relax it? Worth one docs check.
6. **PING analog verification:** the PING_EXISTING_ANALOG column is best-effort from standing context (event/evidence plane, bounded automation, fail-closed). A PING-side audit should confirm which of M-01–M-05 are already owned and mark the rest as real gaps.
7. **OpenAI Agents SDK (Swarm's successor):** out of scope for this lane, but if PING ever looks at handoff patterns again, the SDK is the maintained artifact to read — Swarm itself is frozen.

---

## 7. Files

- This report: `~/workspace/ping-autonomy-challenge/lanes/LANE-8-multiagent-redteam.md`
- Read-only source checkouts (do not edit): `~/workspace/ping-autonomy-challenge/work-lane8/{autogen-src,crewai-src,swarm-src}/`
