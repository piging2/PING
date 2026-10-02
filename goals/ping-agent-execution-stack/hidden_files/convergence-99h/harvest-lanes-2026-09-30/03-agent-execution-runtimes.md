# HARVEST LANE 3: AGENT / EXECUTION RUNTIMES
Date: 2026-09-30 ~18:10 MDT. Reader: subagent lane 3 of 10.
Mandate: CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30.md (binding). Read-only. Nothing installed, nothing written to any repo.
Scope: execution primitives only: resumability, leases, idempotency, work claims, tool isolation, approval interrupts, typed results, receipts, reconciliation after ambiguous effects, worker-location independence.

## Search log: where I looked for the existing implementation

- `/home/nolan/projects/ping` and `/home/nolan/projects/ping-fyd-converged`: NOT PRESENT in this environment (home here is `/home/hatch`; `/home/nolan` does not exist). Recorded as unreachable.
- `~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/`: FOUND. Contains `orchestration/mission_runtime.js` (469 lines) and `workers/worker_runtime.js` (169 lines). This is Pig source, the freshest local implementation evidence per Nolan's repo caveat (GitHub PING is 81b3248 on main and not the freshest evidence). Read both files in full.
- FYD: `~/workspace/fyd-build/` (Next.js customer web product). Grep found no agent/execution runtime primitives. Approval door work lives in `~/worktrees/phase1-approval-door/` (FYD frontend UI). FYD has no mission/worker runtime of its own.
- CRX: no local clone in this VM; used the verified file-by-file analysis at `~/workspace/your_files/crx-runtime-analysis/crx-runtime-file-by-file-analysis.md` (438 lines, analyzed 2026-09-11 from a fresh clone of github.com/ngesk2/crx-runtime, HEAD 6c4b531).
- ORCA internals: not separately located as source in this VM; ORCA semantics taken from binding standing context (ORCA is the planner/orchestrator: "what needs to be known or done next"; MissionScheduler is the single dispatch path per WorkerRuntime DOC-CONTRACT comment).
- External sources: public web search, verified against secondary sources that cite primary docs/repos. See per-candidate REACHED/UNREACHED.

## PING baseline (established from source reads)

MissionRuntime (`pig_missions` table, Postgres):
- Lifecycle: created -> assigned -> running -> completed/failed -> archived, plus retry_pending. One writer per row transition via conditional UPDATEs (claim race losers get rowCount 0; O4 repair 2026-09-18 proved the loser cannot advance the mission).
- Idempotency: mission_id is sha256(missionType:event_id or canonical payload), INSERT ... ON CONFLICT DO NOTHING. Same event always produces the same mission.
- Leases: lease_until (60s on claim), renewLease by scheduler, reapExpiredLeases resets orphans to created. ReclaimRetryPending returns due retries to created through the same atomic claim lifecycle.
- Retry with backoff: failWithRetry increments retries, sets retry_at; exhaustion -> failed -> DeadLetterAuthority -> repository_dead_letters -> surfaced in Mission Control.
- Completion-requires-emission invariant (Lane J, 2026-09-19): MISSION_COMPLETED must be ACCEPTED by the event authority (returned {status:'ok'}) BEFORE the row transitions to completed. Emission-gated completion. This is the receipt primitive: the canonical event IS the receipt.
- Evidence: getTrace resolves correlation_id from the triggering event and returns the full event chain.

WorkerRuntime:
- Worker registry: name -> {handle(event), eventTypes, capabilities, maxConcurrent, running, heartbeat}.
- Dispatch-only mode: MissionScheduler is the single dispatch path (poll loop disabled to prevent dual input paths).
- Errors propagate to the scheduler for the retry/fail path. Health via heartbeats.

Documented gaps (binding context, not gaps I invented):
- No durable approval interrupt: there is no awaiting_approval/suspended mission status in mission_runtime.js (verified by grep of the 2026-09-30 patched copy: zero matches for hold/awaiting/suspend). Proposal APPROVED/REJECTED is the FYD UI approval door, separate from worker execution.
- No reconcile seam for unknown-effect retries: ITEM4-UNKNOWN-RETRY-AUDIT-2026-09-30 proved there are currently ZERO external-effect workers in the mission path (all 8 workers only build in-memory objects and emit), so blind retry is safe today. The reconcile gate is designed on paper (ITEM4 section 4) but intentionally unbuilt: "Building a reconcile gate now would be untestable scaffolding with no consumer." The CEO order sequences it BEFORE autonomous marketing actions, when external-effect actions ARRIVE.

This is the "one brain, many hands" shape: ORCA/MissionScheduler = brain dispatch; workers = hands; MissionRuntime + event authority = truth. Anything evaluated below that wants to become the truth store is a REJECT.

---

## CANDIDATE 1: Temporal durable execution concepts

PRODUCT NEED: Survive worker crashes and multi-day waits without losing control-flow state; resume exactly where execution stopped; never re-execute completed effects.

FYD CURRENT IMPLEMENTATION: None. FYD has no workflow execution layer.

PING EXISTING IMPLEMENTATION: MissionRuntime's lease + reclaim + retry_pending machinery covers crash recovery at the mission granularity: a crashed scheduler's missions are reaped and re-dispatched through the atomic claim lifecycle. Completion-requires-emission prevents phantom completions. What PING does NOT have: code-level resumption. Recovery is row-state reset (back to created) plus re-execution of handle(), not replay-from-checkpoint. This is fine today because workers are short and idempotent by construction (W-1 logical-identity hashing in BaseWorker._emit: a retried handle() converges on the same event_id, never remints).

CRX HARVESTABLE IMPLEMENTATION: Partial pattern. CRX's deterministic replay core (dist/runtime/replay/) replays an append-only event log to reproduce identical state, with a canonical event envelope and Merkle witness root. Harvestable as pattern only (REPLAY + canonical envelope), not as working code: the analysis found the kernel's P0 bugs and unbuildable state. CRX has no workflow/activity concept, no leases, no timers.

EXTERNAL IMPLEMENTATION: Temporal (temporal.io) persists every workflow decision in an append-only Event History (event sourcing). On worker crash, the workflow function is re-executed from the top against that history; activity results are replayed from history rather than re-executed, so a paid model call inside an Activity is paid for once. The single most decision-relevant rule: workflow code MUST be deterministic (no Date.now, no random, no direct I/O, no network), because it is replayed. All non-determinism moves into Activities, which run outside the replay path. Related primitives: Signals (durable async messages to a running workflow), Queries (read-only reads of workflow state), Updates (mutating requests with results), child workflows, continue-as-new for history size caps, and the patched()/getVersion API for replay-safe code changes.

REACHED/UNREACHED: REACHED (web search; corroborated across docs citations, official-docs-derived research notes, and two independent architecture write-ups. No version numbers asserted).

DUPLICATION RISK: HIGH if adopted. A Temporal cluster would become a second durable mission truth store alongside ping_missions + the event authority, violating the constitutional rule of one (MissionRuntime/MissionScheduler own mission truth). Temporal's server + worker fleet + SDKs also collide with WorkerRuntime's role. The "mission_id is deterministic, ON CONFLICT DO NOTHING" layer would need a shim over Temporal's workflow IDs, a second source of truth in disguise.

SECURITY/TRUST BOUNDARY: Replay must never re-execute recorded effects; a nondeterministic workflow that calls an LLM inside workflow code would re-bill on every replay. Adopting the cluster means operating or renting cluster infrastructure (or Temporal Cloud, i.e. hosted vendor dependency) and trusting the event history store with approval payloads. Versioning is a deployment contract: changing command-producing code breaks in-flight replays.

SMALLEST DELTA: Do NOT adopt the cluster. Port the one idea PING lacks into its own code: formalize the determinism contract PING already follows informally (ITEM4 proved workers do no external I/O today) as an explicit worker contract: worker handle() = deterministic function of (event, read-only deps); all effects go through BaseWorker._emit (the "activity" boundary, already idempotent). Write it as a contract doc plus one assertion in the dispatch path, not as new machinery.

VERDICT: LEARN (the determinism split, the event-history-as-truth discipline, signals/queries as prior art for Mission Control inspection), ADAPT (the one rule: deterministic-orchestration vs recorded-effects, as an explicit contract on workers). REJECT adopting Temporal the product: it wants to become the mission truth store and the worker fleet, which is exactly the sovereignty violation the guiding law forbids. A runtime that wants to become the truth store is a REJECT no matter how good its execution primitives.

WHAT WE NEVER WRITE BECAUSE OF IT: We never write our own workflow-replay engine for long-running flows; if PING ever needs code-level resumption, the answer is to formalize the effect boundary we already have, not to build a replay scheduler. We also never write a from-scratch versioning scheme for in-flight executions: Temporal's patched() pattern is the reference design if the need ever arises.

---

## CANDIDATE 2: LangGraph (checkpointing + interrupts)

PRODUCT NEED: Pause a running execution at an approval or review point, persist the exact state, survive process restarts, and resume from that point when the human decision arrives. Time-travel debugging of a stuck mission.

FYD CURRENT IMPLEMENTATION: None in the product. The approval door (proposal APPROVED/REJECTED) is a FYD UI flow, not an execution interrupt: it gates a proposal, not a running worker.

PING EXISTING IMPLEMENTATION: No durable interrupt state. Statuses are created/assigned/running/completed/failed/retry_pending only (verified in the 2026-09-30 patched mission_runtime.js). The known open design gap: a HOLD record leaves _processing, the lease expires, and reapExpiredLeases resets it to created and re-dispatches ~60s later, which is an automatic retry of an unknown-outcome mission (AGENTS.md, 2026-09-24). That gap is live machinery; there is no "suspended awaiting human" lease-exempt state.

CRX HARVESTABLE IMPLEMENTATION: None on interrupts. CRX is replay-of-recorded-events; it has no human-in-the-loop concept.

EXTERNAL IMPLEMENTATION: LangGraph (LangChain's graph orchestration, github.com/langchain-ai/langgraph) persists graph state at every super-step through a checkpointer (InMemorySaver dev; PostgresSaver/SqliteSaver prod). `interrupt(payload)` inside a node pauses execution and saves state to the checkpointer; resuming with `Command(resume=<value>)` on the same thread_id continues from the checkpoint (code before the interrupt re-runs on resume; code after does not). Static `interrupt_before`/`interrupt_after` node lists are also supported. Checkpointing additionally enables time-travel (resume from any checkpoint) and fault recovery. LangGraph's runtime is a Bulk Synchronous Parallel super-step engine (Pregel-inspired): discrete steps, parallel node execution, channel-based state, persistence after each step.

REACHED/UNREACHED: REACHED (web search; LangGraph source-level CLAUDE.md architecture note plus official-docs-derived skill references, mutually consistent on interrupt/checkpoint semantics).

DUPLICATION RISK: HIGH if adopted as a framework. LangGraph's StateGraph would compete with ORCA + MissionRuntime + WorkerRuntime for the role of "who decides what runs next." Threads/checkpointers would duplicate ping_missions as the mission truth store. PING's mission row IS its checkpoint; adding LangGraph's checkpoint tables creates two resume truths.

SECURITY/TRUST BOUNDARY: Checkpoints contain the full execution state including any payload the interrupted node held (approval payloads, prospect data). A resume from an old checkpoint re-executes pre-interrupt code, which must be side-effect-free; if it is not, resume duplicates effects. This is exactly the class of bug PING's emission-gated completion was built to prevent, and any adapted interrupt must preserve that gate.

SMALLEST DELTA: Add a first-class mission status `awaiting_approval` (or `suspended`) to ping_missions that is (a) lease-exempt: reapExpiredLeases must NOT touch it, (b) checkpointed: the pending decision context lives in a JSONB column, (c) resumable: a Mission Control approval action transitions it back to created/assigned via the atomic claim path. Port LangGraph's two rules: interrupt requires a checkpointer (no interrupt without persisted checkpoint), and resume never re-executes post-interrupt code (PING equivalent: resume re-enters through create/claim, never by re-running handle()). This is a small, bounded schema + scheduler change on existing machinery, and it closes the documented HOLD/lease-expiry design gap.

VERDICT: ADAPT (the interrupt + checkpoint pattern, ported into MissionRuntime as a lease-exempt suspended status; this directly serves the CEO-ordered ITEM4 reconcile gate when external-effect actions arrive). LEARN (time-travel: getTrace already gives evidence bundles; LangGraph's checkpoint-per-superstep is overkill for PING's mission granularity). REJECT adopting LangGraph the framework: it would become a second orchestration brain and a second mission truth store.

WHAT WE NEVER WRITE BECAUSE OF IT: We never write a bespoke checkpoint/resume subsystem for approvals. The design is settled by the ecosystem: interrupt needs a durable checkpoint, resume is a new entry through the claim path, lease-exempt while waiting. When the first external-effect worker arrives, the interrupt status is a tens-of-lines change, not a new subsystem.

---

## CANDIDATE 3: Microsoft Agent Framework (AutoGen + Semantic Kernel successor)

PRODUCT NEED: Per-action approval gates with typed request/response correlation, durable workflows that survive approval delays of hours or days, and a standard agent leaf that works in-process and distributed.

FYD CURRENT IMPLEMENTATION: None.

PING EXISTING IMPLEMENTATION: Approval exists at the proposal layer (proposal APPROVED/REJECTED, tenant ownership P0 being wired), not at the tool/action layer. No per-tool approval primitive exists in the worker plane.

CRX HARVESTABLE IMPLEMENTATION: None. No approval concepts.

EXTERNAL IMPLEMENTATION: Microsoft Agent Framework (MAF; the convergence of AutoGen and Semantic Kernel; docs under microsoftdocs/semantic-kernel-docs) provides: (a) per-tool approval gates: `@tool(approval_mode="always_require")` makes the runtime emit `FunctionApprovalRequestContent` events carrying a request_id; the caller must respond with an approval response keyed to that request_id before execution proceeds. This is the reusable human-in-the-loop primitive. (b) Checkpointing for durable workflows: `FileCheckpointStorage` (and durable-task extension) lets a workflow paused on an approval request resume hours/days later in a fresh process; the Durable Task extension auto-checkpoints after each step and `WaitForExternalEvent` implements human-in-the-loop approval workflows. (c) Orchestration patterns: Sequential, Concurrent, Handoff (agent takes full ownership), Group Chat, Magentic; handoff is implemented as a structured tool call. (d) A standard `AIAgent` leaf abstraction usable in-process and remoted over A2A.

REACHED/UNREACHED: REACHED (web search; official-docs-derived handoff/checkpointing examples plus independent research notes, consistent on approval-request semantics and checkpoint-resume flow).

DUPLICATION RISK: HIGH if adopted. The orchestration builders (Handoff/Sequential/Concurrent/GroupChat) compete directly with ORCA's "what needs to be known or done next" role and with MissionScheduler dispatch. The checkpoint store would duplicate ping_missions. The handoff pattern ("receiving agent takes full ownership") is explicitly a second brain: PING's law is one brain (ORCA), many hands (workers); a handoff chain where agents re-plan is competing-brain territory.

SECURITY/TRUST BOUNDARY: Approval requests are events in a stream; the approval response must be bound to the exact request_id AND to the authenticated approver identity. PING's standing approval chain is IDENTITY -> AUTHENTICATION -> CAPABILITY -> PROPOSAL -> APPROVAL -> EFFECT, and the unauthenticated-approval-bypass P0 just closed on this exact principle. Any adapted approval-request pattern must carry the approver's authenticated principal, not a self-asserted identity. The Durable Task extension also implies running the Durable Task backend, a new persistence surface.

SMALLEST DELTA: Adapt only the typed approval-request-as-event pattern into PING's existing event authority: an approval request is a canonical event with a request_id; the approval response is a canonical event referencing that request_id and carrying the authenticated approver principal; the mission sits in the adapted awaiting_approval status (Candidate 2) while the request is open. This plugs into the existing MISSION_* event vocabulary and the CG-001 = Nolan default decision authority, with no new framework, no new store, no new backend.

VERDICT: ADAPT (typed approval-request/response event correlation; the cleanest approval-interrupt design in the surveyed set, and it maps 1:1 onto PING's event authority + Nolan-as-default-approver rule). LEARN (Durable Task auto-checkpoint-per-step as prior art; handoff-as-tool-call as a routing idea). REJECT adopting MAF: the orchestration builders are a competing brain and the checkpoint store is a competing mission truth.

WHAT WE NEVER WRITE BECAUSE OF IT: We never design an approval-request protocol from scratch. The shape is settled: request event with id, response event referencing the id, approver principal authenticated, execution suspended in a lease-exempt state until the response lands. That is the exact seam ITEM4 section 4 anticipated.

---

## CANDIDATE 4: OpenHands (execution isolation + event-sourced runtime)

PRODUCT NEED: Run untrusted or side-effecting agent code in an isolated sandbox so a misbehaving worker cannot touch the host; reconstruct any session from the event log.

FYD CURRENT IMPLEMENTATION: None.

PING EXISTING IMPLEMENTATION: PING is already event-sourced at the mission layer (ping_events with correlation_id; getTrace returns the full causal chain). Tool isolation: not needed today and not present, because ITEM4 proved zero external-effect workers exist in the mission path; workers do in-memory object building plus BaseWorker._emit.

CRX HARVESTABLE IMPLEMENTATION: None on sandboxing. CRX's contribution is replay determinism, which overlaps OpenHands' "event stream is the state" idea at a smaller scale.

EXTERNAL IMPLEMENTATION: OpenHands (All-Hands AI, ex-OpenDevin; MIT with enterprise/ separately licensed) is the "everything is an event" pole: an AgentController state machine on top of a persisted, secret-scrubbed EventStream (openhands/events/stream.py); all actions and observations are typed immutable events; an abstract Runtime executes actions inside a per-session Docker container over HTTP; the host is never directly exposed to agent-generated code. Microagents (markdown-triggered specialists), multi-agent delegation, and an evaluation harness round out the platform. Per arXiv:2609.00006 the V1 core moved to a separate software-agent-sdk repo, and main HEAD was repurposed into a TypeScript/Electron "Agent Canvas" control-center app as of 2026-09-15 (tag 0.62.0 was the last Python harness release).

REACHED/UNREACHED: REACHED (web search; multiple independent source-read surveys of the 0.62.0 tag agree on EventStream + Docker Runtime + AgentController architecture. Flag: the project is mid-refactor in 2026, so any harvest should target the documented 0.62.0 architecture, not main HEAD).

DUPLICATION RISK: EXTREME if adopted. OpenHands is a full agent platform that wants to be the agent OS: its EventStream would compete with the PING event authority, its AgentController with ORCA, its Runtime with WorkerRuntime. Adopting it would be importing a new kingdom, the exact move the CEO order forbids. It is also a coding-agent platform (bash/python/browser action space), the wrong shape for PING's bounded worker contract.

SECURITY/TRUST BOUNDARY: The sandbox model is sound (container per session, secret-scrubbed event log), but isolation in the SDK is container-level only with no seccomp/network policy visible (per one source-read survey), and the local-workspace mode runs on the host with full filesystem access. Harvesting the idea does not inherit its CVEs, but it does inherit the operational cost: Docker per session is heavy, and the enterprise/cloud pivot is moving features behind paid cloud.

SMALLEST DELTA: None needed today. The harvest is a standing design decision recorded for the day external-effect workers arrive: tool isolation = per-mission sandbox tier, OPTIONAL, behind the worker's capability declaration. Until then, the correct delta is zero: PING's workers are pure functions plus the idempotent emit boundary, which is stronger isolation-by-construction than a container around an impure function.

VERDICT: LEARN (the per-session sandbox tier as the future answer to "where do side-effecting workers run"; the secret-scrubbed persisted event log as confirmation of PING's existing direction). REJECT as a platform: it wants to become the truth store, the controller, and the runtime all at once.

WHAT WE NEVER WRITE BECAUSE OF IT: When the first worker needs to touch the outside world (email send, form submit, provider API), we do not design sandboxing from first principles. The industry shape is settled: typed action events on an append-only stream, execution in an isolated container reached over a bounded API, observations back on the stream. We will wrap a commodity container runtime, not build one.

---

## CANDIDATE 5: CrewAI (Crews + Flows)

PRODUCT NEED: Role-based multi-agent collaboration with human review at task boundaries and gradual autonomy (review everything, then relax per output type as accuracy proves out).

FYD CURRENT IMPLEMENTATION: None.

PING EXISTING IMPLEMENTATION: Worker registration by event types and capabilities is PING's equivalent of role assignment, without the anthropomorphic roles. Gradual autonomy exists as policy (safety tripwires drop engagement to minimum on any warning; CEO orders sequence autonomy), not as machinery.

CRX HARVESTABLE IMPLEMENTATION: None.

EXTERNAL IMPLEMENTATION: CrewAI (crewaiinc/crewai) offers Crews (teams of agents with roles/goals/backstories, sequential/parallel/hierarchical processes; hierarchical mode auto-assigns a manager agent for delegation and validation) and Flows (event-driven workflows with @start/@listen/@router decorators, Pydantic state, `@human_feedback` decorator pausing for human review with LLM-collapsed outcomes). Structured outputs via output_pydantic/output_json. The interesting policy idea (from a 2026 production guide): gradual autonomy, a per-output-type confidence threshold starting at full human review and relaxing as accuracy is measured. Notably, CrewAI has no durable-execution story comparable to Temporal/LangGraph checkpointing; its human-in-the-loop is in-process.

REACHED/UNREACHED: REACHED (web search; official docs v1.10.0 flows.mdx plus independent architecture surveys, consistent).

DUPLICATION RISK: HIGH if adopted, and philosophically the worst fit. The hierarchical crew pattern (manager agent plans and delegates) is a competing brain: PING's standing law is "one brain, many hands" and ORCA answers "what needs to be known or done next." A manager agent that does planning inside the execution layer reintroduces the exact authority ambiguity PING exists to eliminate. Flows would also duplicate MissionRuntime's dispatch truth.

SECURITY/TRUST BOUNDARY: The `@human_feedback` LLM-collapsed outcomes (free-form feedback interpreted by an LLM into approved/rejected/needs_revision) is an approval primitive that lets a model rewrite the human's decision into an enum. Against PING's approval chain (authenticated approver, exact proposal digest), that is a downgrade: the approval response must be the human's, not a model's interpretation of it.

SMALLEST DELTA: Zero. The one salvageable idea (gradual autonomy thresholds) is policy, not code, and PING already runs it as standing orders (tripwires, held vs open engagement, per-platform ceilings).

VERDICT: REJECT as a runtime (competing orchestration brain, no durable execution primitives worth stealing beyond what Candidates 2 and 3 do better, approval-by-LLM-interpretation is a trust downgrade). LEARN only at the policy level: the gradual-autonomy threshold pattern is a useful vocabulary for future autonomy policies.

WHAT WE NEVER WRITE BECAUSE OF IT: We never write a role/backstory multi-agent coordination layer. PING's worker registry (event types + capabilities + maxConcurrent) already covers the useful part of "which worker does what" with none of the anthropomorphic overhead.

---

## CANDIDATE 6: PydanticAI (typed results + dependency injection)

PRODUCT NEED: Worker results that are validated against a schema before they are accepted; tools that receive typed dependencies instead of reaching for globals.

FYD CURRENT IMPLEMENTATION: None.

PING EXISTING IMPLEMENTATION: Mission `result` is an untyped JSONB column; `complete(missionId, result)` accepts any object. Workers return `{status:'ok'}` by convention. Validation exists at the event authority layer (emission must be accepted), but there is no result-schema contract at the mission boundary. Dependency-wise, workers receive the event; there is no formal deps contract.

CRX HARVESTABLE IMPLEMENTATION: None on typing. CRX's envelope is structural, not schema-validated in the surveyed code.

EXTERNAL IMPLEMENTATION: PydanticAI (pydantic/pydantic-ai, MIT) is the Pydantic team's agent framework: `Agent(deps_type, output_type)` binds the agent to a declared input type, a validated Pydantic output model, and typed dependency injection via RunContext. Output validation failures are fed back to the model for self-correction (ModelRetry). Tools are typed functions with auto-generated JSON schemas. It is model-agnostic (OpenAI, Anthropic, Gemini, Bedrock, and others), ships first-class durable-execution integrations (Temporal, DBOS, Prefect, Restate), and has built-in human-in-the-loop tool approval. GA was September 2025 per secondary sources.

REACHED/UNREACHED: REACHED (web search; consistent across a skill doc, two architecture surveys, and a starter guide).

DUPLICATION RISK: MEDIUM if adopted, LOW if adapted. PydanticAI is Python-only and an agent-loop framework, not an execution runtime; adopting it would mean a Python worker plane beside PING's JS workers, a new language kingdom for no execution gain. Its durable integrations point back to Candidates 1-2 anyway.

SECURITY/TRUST BOUNDARY: Typed results are a trust upgrade, not a risk: a worker that must produce a schema-valid receipt cannot smuggle free-form claims into the evidence chain. The risk is only in adoption: a second worker language doubles the audit surface for the constitutional boundaries (no secret leakage, namespace preservation via BaseWorker._emit).

SMALLEST DELTA: Adapt the discipline, not the library. Add a result-schema registry: each mission_type declares its result schema (a JSON Schema or a small validator module), and `complete()` validates the result against it BEFORE the emission-gated MISSION_COMPLETED event is emitted. This slots into the existing completion invariant (Lane J) with no new service: invalid receipts throw, the row stays running, the retry/fail path handles it. It is the typed-receipt primitive PING's evidence chain is missing, and it is tens of lines.

VERDICT: ADAPT (the typed-receipt discipline: validate worker results against per-mission-type schemas at the complete() boundary, before emission). REJECT adopting PydanticAI the framework: Python-only, agent-loop not runtime, and its durable story is just Candidates 1-2 behind an integration.

WHAT WE NEVER WRITE BECAUSE OF IT: We never write an ad-hoc per-worker result validation convention. The ecosystem settled this: the agent declares its output contract up front (Agent[Deps, Result]), the framework enforces it at the boundary, violations fail closed. PING ports that as schema-validated receipts on the existing complete() path.

---

## Deliberately not evaluated (UNREACHED this lane)

DBOS, Inngest, Restate, Prefect: named in the Temporal comparison literature as durable-execution alternatives (Postgres-backed workflows for DBOS, event-driven durable steps for Inngest/Restate). Not evaluated for lack of lane budget; depth over breadth. They belong to a future lane if PING ever needs to choose a durable backend behind the adapted interrupt pattern. AutoGen standalone: superseded by Microsoft Agent Framework (Candidate 3); evaluated there.

---

## Harvest map (lane 3)

PATTERN GOLD (steal the shape, never the system):
- Durable interrupt: checkpoint before pause, lease-exempt while awaiting human, resume through the claim path. Sources: LangGraph interrupt/checkpoint, MAF approval-request events + Durable Task. This is the exact machinery the CEO-ordered ITEM4 reconcile gate needs when the first external-effect worker arrives.
- Typed approval requests: request event with id, response event referencing the id, authenticated approver principal. Source: MAF FunctionApprovalRequestContent.
- Typed receipts: per-mission-type result schemas validated at complete() before the emission gate. Source: PydanticAI output_type discipline.
- Deterministic-orchestration vs recorded-effects split as an explicit worker contract. Source: Temporal.
- Per-session sandbox tier as the future home of side-effecting workers. Source: OpenHands.

DUPLICATION TO KILL (if anyone proposes them): Temporal cluster, LangGraph framework, MAF orchestration builders, OpenHands platform, CrewAI crews/flows, PydanticAI as a worker plane. Each wants to become mission truth, the dispatch brain, or a second worker kingdom.

NEGATIVE ROADMAP entries (FYD/PING WILL NOT BUILD):
- No bespoke checkpoint/resume subsystem for approvals (design settled by LangGraph/MAF; implementation is a status + JSONB column + lease-exempt rule).
- No bespoke approval-request protocol (design settled by MAF's typed request/response correlation).
- No bespoke result-validation convention (design settled by PydanticAI's declared output contracts).
- No bespoke sandbox architecture when side-effecting workers arrive (shape settled by OpenHands: typed action events, isolated container over a bounded API, observations back on the stream).
- No workflow-replay engine (Temporal's determinism rules are the reference if code-level resumption is ever needed; today row-state recovery + idempotent workers suffice, proven by ITEM4).

## Ranked top candidates

1. Microsoft Agent Framework patterns: ADAPT. The typed approval-request/response event correlation is the single best-designed approval interrupt in the surveyed set, and it maps 1:1 onto PING's event authority plus Nolan as default approver, with no new store and no new backend.
2. LangGraph checkpoint/interrupt pattern: ADAPT. Checkpoint-before-pause, lease-exempt suspended mission status, resume through the atomic claim path; this closes the documented HOLD/lease-expiry design gap and is the machinery the ITEM4 reconcile gate needs.
3. PydanticAI typed-output discipline: ADAPT. Validate worker results against per-mission-type schemas at the complete() boundary before the emission gate; tens of lines, closes the untyped-receipt gap in the evidence chain.
4. Temporal durable-execution concepts: LEARN (ADAPT the determinism contract only). The workflow/activity determinism split formalizes what PING's workers already do; never adopt the cluster, which would become a second mission truth store.
5. OpenHands sandbox model: LEARN. Per-session container over a bounded API with observations back on the stream is the standing answer for where side-effecting workers will run when they arrive; REJECT the platform, which wants to become the truth store, the controller, and the runtime at once.
