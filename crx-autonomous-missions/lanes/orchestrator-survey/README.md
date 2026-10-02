# Orchestrator Survey: Agent Orchestration Mechanisms

Research-only survey for the CRX autonomous-missions campaign. No building into CRX, no pushes, no deployments, no credentials anywhere in this lane.

Companion file: `mechanisms.jsonl` (40 records, schema-validated). Each record carries exactly: `MECHANISM_ID, SOURCE_PROJECT, SOURCE_COMMIT, LICENSE, PROBLEM, MECHANISM, INVARIANT, FAILURE_MODEL, SECURITY_MODEL, SCALING_MODEL, CRX_ANALOG, SEMANTIC_DELTA, HARVEST_CLASS, INTEGRATION_COST, EXPECTED_VALUE, FALSIFICATION_TEST`.

Method: clone the repository, pin the commit, read source. README claims are not implementation evidence. Claims that did not survive source inspection are listed under Falsified claims. Shallow systems are named as skipped with the reason.

## Systems surveyed

| System | Commit | License | Depth | Mechanism IDs |
|---|---|---|---|---|
| alex2481kobe/orca | 5b339e8c235408ae9d7c61514c76190fdeed0091 | Apache-2.0 | Deep (16 source files) | ORCA-01..14 |
| langchain-ai/langgraph | bdb85b5aa87a21de68371d2e534b81aeed398f57 | MIT | Deep (pregel core) | LG-01..04 |
| microsoft/autogen | 027ecf0a379bcc1d09956d46d12d44a3ad9cee14 | MIT (code) | Deep (agentchat) | AG-01..03 |
| OpenHands/software-agent-sdk | 5b36cacccc2bbe6f8fbce9e1d3ff4b0a3dcddadb | MIT | Deep (event system) | OH-01..03 |
| google/adk-python | a6c6623455e6064f1934bdff260abdc3f6eb5025 | Apache-2.0 | Deep (sessions, agents) | ADK-01..03 |
| crewAIInc/crewAI | 65361144519a25bad55c5b1651d8a9d583166d01 | MIT | Medium (task, crew, memory) | CREW-01..02 |
| huggingface/smolagents | 227ef5e49ddd82339295939072f0223249aa8d38 | Apache-2.0 | Medium (agents, memory) | SMOL-01..02 |
| SWE-agent/SWE-agent | 3ea751c087f32b16e039a2233dd6eefecef325d5 | MIT | Medium (agent loop) | SWE-01..02 |
| temporalio/sdk-python | eb642b14947bd8bcdf8816cffb6a63869803f5c6 | MIT | Medium (workflow model) | TEMP-01..02 |
| microsoft/semantic-kernel | ca40aa7226531d28a721d0ca0e451d0aaf86dafc | MIT | Shallow (processes) | SK-01..02 |
| agentscope-ai/agentscope | 083cbd1975c7b5ed055c69b0d19c150727e7f606 | Apache-2.0 | Shallow (message) | AS-01 |
| pydantic/pydantic-ai | c093fe1df8c46ae975b2382de63a30fdea586bef | MIT | Shallow (run context) | PAI-01 |
| block/goose | e678c3b64a1dfd3c262a6a2019f158d33d5dcab0 | Apache-2.0 | Shallow (agent machine) | GOOSE-01 |
| orca-cli/orca | 5beeefcb57555962bb93facc54b5f82484731802 | MIT | Prior audit (see root) | O-1..O-10 (root JSONL) |

Note: three different things are named Orca. `orca-cli/orca` is a week-one MIT skeleton (prior audit at `~/workspace/crx-autonomous-missions/orca-crx-comparison.md`). `alex2481kobe/orca` is the active Apache-2.0 local daemon audited deeply here. The Orca desktop app is a separate closed product, evidenced only through third-party ADRs (see Skipped).

## Per-system findings

### alex2481kobe/orca (ORCA-01..14)

The highest-signal system in the survey: a real, actively used local orchestrator with incident history in its own source. Fourteen mechanisms, all source-grounded. The standouts:

- **Tool leases (ORCA-01):** sliding, role/tool/scope-bound leases with refresh-credential trees. Tools are not ambiently available; they are leased per lane with expiry. Directly addresses CRX's missing action-level authorization.
- **Server-side legality + nextAction (ORCA-02, ORCA-03):** the registry decides what a lane may legally do next given its state, and returns a corrective next-action envelope instead of letting the agent guess. This is the mechanism that keeps a weak orchestrator on the rails.
- **Wakeup bridging (ORCA-14):** the most instructive incident in the survey. Durable events existed but were pull-only, so a real orchestrator sat idle while a lane completed. The fix was a lane-state watcher that pushes completion into tool output. Lesson: durability without a wakeup path is a liveness bug.
- **Fail-closed reclamation (ORCA-08), conditional worktree isolation (ORCA-09):** worktrees are reclaimed only after proving no unique work remains; writer collisions get isolated execution dirs with capacity refusal instead of hidden queuing.
- **Evidence discipline (ORCA-07, ORCA-10, ORCA-11):** nonempty audit evidence gates, append-only rotating lane journals with torn-write tolerance, point-in-time evidence references with honest truncation (born from a real incident where four reports were cut at 12,000 chars, one losing 58 percent).

Limitations, stated plainly: single-daemon local architecture, file-backed durability with a ~250ms loss window, no UNKNOWN_OUTCOME reconciliation after uncertain external effects, the watcher is still polling, the audit gate proves review text exists not that it is good, and equality-only writer collision leaves parent/child project overlap unhandled.

### langchain-ai/langgraph (LG-01..04)

The most mature graph-execution model surveyed. Work is nodes writing to versioned channels in bulk-synchronous supersteps; every superstep checkpoints channel versions, giving resume-from-any-checkpoint and time travel. `interrupt()` with deterministic namespace-hashed ids plus `Command(resume=...)` is the cleanest pause/resume primitive found anywhere: the id is a pure function of the checkpoint namespace path, so a resume token unambiguously identifies its pause point across restarts. Per-node `RetryPolicy` (backoff, jitter, max attempts, exception predicate) and `Send`/`Command` dynamic fan-out round out the model. Caveat: exactly-once is not guaranteed for task bodies; a crash mid-superstep re-executes tasks, so non-idempotent nodes double-apply.

### microsoft/autogen (AG-01..03)

Best-in-survey stopping story: eleven termination condition types composable with `&` and `|`, evaluated after every message. State is typed and versioned (`BaseState` with type+version, per-agent and per-team `save_state`/`load_state`), but the runtime does NOT persist it; durability is the caller's job, which is a documented trap. Handoff-routed swarms move scheduling into workers via explicit `HandoffMessage` targets with loud validation of unknown targets.

### OpenHands/software-agent-sdk (OH-01..03)

Independently converged on CRX's core bet: an immutable frozen-pydantic event log is the source of truth, and LLM messages are a derived projection (`events_to_messages`). Every action carries an LLM-predicted `security_risk` (UNKNOWN/LOW/MEDIUM/HIGH) stored on the action event itself, so the risk judgment is auditable; HIGH gates on human confirmation. This is the closest production shape to CRX's missing action-level authorization. Condensation is itself an appended event (`CondensationSummaryEvent`); history is never rewritten, which is the safe shape for the forgetting path CRX lacks.

### google/adk-python (ADK-01..03)

Session service with `create_session`/`get_session`/`append_event` and swappable backends (in-memory, SQLite, database, Vertex). State keys namespaced by prefix (`app:`, `user:`), a trivial mechanism with large blast radius against cross-scope leaks. Composite shell agents (Sequential, Parallel, Loop) with typed state (`current_sub_agent`, `times_looped`) make topology a stateful object instead of imperative orchestration code.

### crewAIInc/crewAI (CREW-01..02)

Task dependencies declared as data: `Task.context` is a list of tasks whose outputs are injected as input context. Hierarchical process formalizes the manager pattern CRX already uses emergently, with one portable invariant: a hierarchical crew with no manager refuses to run.

### huggingface/smolagents (SMOL-01..02)

Typed trajectory steps (`TaskStep`, `ActionStep`, `PlanningStep`, `FinalAnswerStep`) with timing, token usage, tool calls, errors, and observations, each serializable and replayable into messages. This is the concrete schema CRX's empty observability tables need. Managed agents are exposed to the manager as tools with a fixed `task`+`additional_args` schema, making delegation boundaries visible in the trajectory.

### SWE-agent/SWE-agent (SWE-01..02)

History processing as a pluggable pipeline stage between stored truth and model view (`LastNObservations`); the stored trajectory is never modified. `RetryAgent` wraps workers with a reviewer loop (score/chooser) and per-attempt stats, with trajectories saved per problem id.

### temporalio/sdk-python (TEMP-01..02)

The production proof of the event-sourced durable-execution model: workflow history is the source of truth, workers replay history to recover, completed activities are not re-executed. The portable ideas are the workflow/activity split (deterministic replayable code vs recorded side effects) and the determinism invariant. The sandbox makes determinism mechanically checkable, with `unsafe.sandbox_unrestricted()` as the explicit escape hatch.

### microsoft/semantic-kernel (SK-01..02)

Shallow check of the processes framework only. Two mechanisms: event visibility scoping (Internal vs Public at emit time) and steps generic over typed state with `activate(state)` restoration.

### agentscope-ai/agentscope (AS-01)

Shallow check. One mechanism: the `Msg` envelope carries workflow-control fields (`finished_at`, `finished_reason`, `structured_output`) as first-class typed fields, not metadata-dict conventions.

### pydantic/pydantic-ai (PAI-01)

Shallow check. One mechanism: runtime-enforced `UsageLimits` (cost, request count default 50, tool calls, token budgets) checked before/after each model call, plus `RunContext` generic over typed deps. The cheapest insurance against runaway missions found in the survey.

### block/goose (GOOSE-01)

Shallow check. One mechanism: the agent loop is a typed state machine (Operation vs Inference steps) that rejects duplicate tool-name registration across operations at build time, which also prevents tool-shadowing.

## Falsified claims

- `orca-cli/orca` README describes an MCP server, DAG execution, task claiming, a constraints engine, TUI/review/ship flows, and context rehydration. Source at the pinned commit is a week-one skeleton; none of these are implemented. (Prior audit, recorded in root comparison doc.)
- AutoGen's `save_state`/`load_state` suggests durable agents; source shows the runtime never persists snapshots. Durability is the caller's responsibility. Any claim of "resumable agents" from state snapshots alone is false without a store.
- LangGraph checkpointing suggests exactly-once task execution; source shows mid-superstep crashes re-execute tasks. The guarantee is at-most-once checkpointing with at-least-once task bodies.
- OpenHands `security_risk` suggests proven-safe actions; it is an LLM prediction stored on the event, with documented false-LOW/false-HIGH failure modes. It is a judgment with an audit trail, not a proof.
- CrewAI's task-context dependencies suggest a DAG scheduler; source shows no cycle detection. Cyclic context references can deadlock.
- Several projects' docs imply multi-tenancy or auth; none of the surveyed SDKs implement auth at the orchestration layer. The security boundary is always the host or the store.

## Skipped or shallow

- **Orca desktop app:** closed product. Public evidence only (third-party ADR in gutomec/nirvana-os-engine, integration notes in hkjang/agenthub and treeman99/skills). No source inspection possible; no mechanism records. The run-namespace/inbox, task DAG, dispatch, worker_done, ask/reply, and escalation vocabulary is adapter-reported, not source-confirmed.
- **Devin, Google Jules, Claude Code internals:** closed systems. Public marketing and docs only; excluded from mechanisms.jsonl. No live-browser verification was available in this lane.
- **MetaGPT:** not inspected. No mechanism records; would need a source pass to confirm the role/SOP claims.
- **OpenCode:** not inspected beyond confirming it exists. No mechanism records.
- **Semantic Kernel, AgentScope, PydanticAI, Goose:** shallow checks only (one focused mechanism each, source-confirmed at the cited files). Their broader systems (planners, providers, CLI, Dapr runtime) were not surveyed.

## Limitations of this survey

- All findings are source-at-commit, not production evidence, except where incident history exists in the source itself (orca's truncation, bloat, and wakeup incidents; Temporal's production track record is public but not re-verified here).
- Clone depth was shallow and sparse; cross-file behavior (especially failure paths) was read, not executed. Falsification tests in the JSONL are specified, not run.
- The survey is Python/TypeScript/Rust heavy; no JVM or Go orchestrators were inspected.
- Mechanism IDs are unique per record but cross-system duplicates of the same idea (e.g. event sourcing in OH-01 and TEMP-01) are intentional: the value is in the differing invariants, not the shared label.

## Answer matrix

How work is represented: LangGraph uses nodes writing to versioned channels in supersteps; CrewAI uses tasks with declared context dependencies; ADK uses composite shell agents; Goose uses a typed state machine of Operation/Inference steps; orca uses lanes with server-assigned next actions; smolagents uses typed memory steps; SK uses steps generic over typed state.

How work is claimed: orca-cli's skeleton claims task claiming but does not implement it; the real claiming story in the survey is orca's tool leases (ORCA-01), which are time-bound, scope-bound grants rather than claims. No surveyed system implements a general work-claiming queue with lease renewal except orca.

How work is contextualized: AutoGen and smolagents keep the full message thread as context; SWE-agent inserts a pluggable history processor between stored truth and model view; OpenHands derives messages from the event log; orca's nextAction envelope tells the lane what is legal now. The shared lesson is that stored truth and model-visible context must be separate things with an explicit transform between them.

How work is persisted: LangGraph checkpoints channel state per superstep; Temporal persists workflow history server-side; ADK appends events to a session store; orca uses serialized atomic file writes with corruption quarantine; AutoGen produces serializable snapshots but leaves the store to the caller; smolagents keeps steps in memory.

How work is isolated: orca conditionally isolates writers into separate worktrees on collision and refuses capacity rather than queueing hiddenly; Temporal sandboxes workflow code for determinism; Goose rejects duplicate tool registration; ADK namespaces state keys by scope.

How agents coordinate: AutoGen handoffs route worker-to-worker; CrewAI hierarchical managers delegate; smolagents exposes subagents as tools; LangGraph Send fans out dynamically; orca's registry mediates via leases and next actions.

How work is recovered: LangGraph resumes from checkpoint ids; Temporal replays history; ADK reloads sessions; orca reaps PID-reuse-safe orphans and reconciles stuck audits; SK reactivates steps with typed state.

How work is stopped: AutoGen's composable termination conditions are the standout; PydanticAI enforces usage limits as hard runtime invariants; LangGraph interrupt parks threads durably; Goose carries a cancellation token through the state machine; orca's leases expire.

How work is verified: orca's audit evidence gate requires nonempty evidence and screenshots for URL work with bounded fix loops; SWE-agent's reviewer loop scores or chooses among attempts; OpenHands stores the risk judgment on the action event for after-the-fact audit.

How work is escalated: LangGraph interrupt/resume is the pause-for-human primitive; OpenHands HIGH risk triggers confirmation; orca's escalation path is the lane-state watcher waking the orchestrator.

How side effects are handled: Temporal splits deterministic workflow code from recorded activities; OpenHands predicts per-action risk before execution; orca gates tools behind leases; Goose makes tool identity unambiguous.

How runs are deduplicated: orca's per-consumer event queue dedupes pending conditions and only surfaces new events after ack; LangGraph's deterministic interrupt ids prevent double-resume ambiguity; Goose's tool-name uniqueness prevents dispatch ambiguity.

How the next work is selected: orca's server-side nextAction prioritizes lanes deterministically; AutoGen's managers (round-robin, LLM selector, handoff) pick speakers; LangGraph's superstep barrier makes all ready tasks run; CrewAI's manager decomposes and assigns.

## Harvest priorities for CRX

Highest expected value, lowest cost first:

1. **PAI-01 usage limits** (ADAPT, low cost): per-mission budget enforcement is the cheapest missing safety rail.
2. **OH-01 frozen events + single projection** (REUSE, low cost): independent validation of CRX's event-sourcing bet plus a concrete enforcement pattern.
3. **GOOSE-01 duplicate tool rejection** (REUSE, trivial): adopt at registration time when CRX builds its tool path.
4. **ADK-02 state key namespacing** (REUSE, trivial): prevents cross-scope leaks by convention.
5. **LG-02 interrupt/resume** (ADAPT, medium cost): the pause primitive CRX needs for approval gates.
6. **AG-01 termination conditions** (ADAPT, low cost): makes "done" explicit and auditable.
7. **SMOL-01 typed steps** (ADAPT, low-medium cost): fills the empty observability tables with a replayable schema.
8. **OH-02 action risk scoring** (ADAPT, medium cost): the production shape for CRX's missing action-level authorization.
9. **OH-03 condensation as event** (ADAPT, medium cost): the safe forgetting path that preserves append-only guarantees.
10. **TEMP-01 workflow/activity split** (PATTERN, high cost to fully adopt): the design reference for CRX's determinism story; adopt the distinction before the infrastructure.
11. **ORCA-01..14** (mostly ADAPT): the orca lane mechanisms remain the deepest single source, especially leases, nextAction, wakeup bridging, and fail-closed reclamation.
