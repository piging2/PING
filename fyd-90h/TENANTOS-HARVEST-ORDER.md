# TENANTOS — HARVEST THE AGENT ECOSYSTEM, DO NOT IMPORT IT

(Binding order from Nolan Geske, 2026-09-29 ~15:05 MDT. Verbatim.)

Nolan's framing: the framework corpus supports the direction, but the
harvest must be selective and subordinate to TenantOS/PING's existing
authorities. MatrixClaw's external-agent boundary is especially aligned:
its core owns session/history/approvals while Codex or Claude owns only its
external thread/process protocol. GitHub Talos independently reinforces the
same rule — model proposes, deterministic kernel authorizes exact effects.
GitHub Nerve's plan→approve→execute and proposed-skill lifecycle is useful
for learning candidates, not as another planner authority. Lower-level
harvests: ClawDesk (checkpoints, leases, activity journal, DLQ); Goated
(thin external-runtime supervisor); ThinClaw (extension trust classes);
ForkScout (restart/orphan-recovery); Wayland (Mission Control projection
UX). Governing constraint: do not turn these into 16 TenantOS frameworks.
Harvest them as a corpus of mechanisms and tests.

We now have a useful corpus:
Pioneer, AgentArk, POLYROB, ForkScout, Talos, MatrixClaw, Hivekeep, Pernix,
Nerve, MyAgens, Goated, ShibaClaw, ThinClaw, AgentOS, ClawDesk, Wayland.

DO NOT IMPLEMENT 16 INTEGRATIONS.
DO NOT ADD ANOTHER ORCHESTRATOR.
DO NOT ADD ANOTHER EVENT BUS.
DO NOT ADD ANOTHER MEMORY AUTHORITY.
DO NOT ADD ANOTHER PLANNER AUTHORITY.
We are harvesting MECHANISMS.

============================================================
FIRST PRINCIPLE
============================================================
TenantOS should become the constitutional operating layer ABOVE
interchangeable intelligence/execution runtimes.
The future optionality is:
TenantOS
    │
    ├── Codex
    ├── Claude Code
    ├── Hermes
    ├── native JS
    ├── Python workers
    ├── Ollama/local
    ├── remote workers
    ├── MCP tools
    └── future runtimes
WITHOUT any runtime becoming canonical truth.
The runtime is a HAND.
TenantOS owns AUTHORITY.

============================================================
CURRENT TENANTOS AUTHORITIES WIN
============================================================
Before creating anything new, map harvested mechanisms onto:
Identity, Tenant / Namespace, Event, Mission, Capability, Approval,
Execution, Evidence, Outcome, Projection.
If an existing authority can own it: EXTEND IT.
Do not create: AgentAuthority, SwarmAuthority, LearningAuthority,
PlannerAuthority, ExternalAgentAuthority, MemoryAuthority,
RuntimeEventAuthority.

============================================================
HARVEST 1 — EXTERNAL RUNTIME BOUNDARY
============================================================
PRIMARY REFERENCE: MatrixClaw.
HARVEST THE PATTERN: core owns session/control state; external runtime owns
external process/thread; adapter normalizes runtime-specific events.
SEARCH PING/TenantOS FIRST.
We want the smallest equivalent of ExecutionRuntimeRegistry and
ExternalRuntimeAdapter.
Conceptual contract only: availability() / descriptor() / start(work) /
resume(execution) / send(input) / interrupt() / close() / events().
DO NOT copy this interface blindly. Derive it from existing
ExecutionAdapter/ExecutionAuthority contracts.

CRITICAL OWNERSHIP — external runtime MAY own: process, thread ID,
provider-specific session ID, runtime context, provider protocol.
External runtime MUST NOT own: tenant identity, mission truth,
authorization truth, canonical event identity, approval truth, outcome
truth, promotion truth, capability truth.

============================================================
HARVEST 2 — NORMALIZED EXECUTION EVENTS
============================================================
MatrixClaw normalizes external-agent events. Good pattern.
TenantOS needs ONE execution vocabulary regardless of worker.
Search existing event types first. Determine whether we already represent:
EXECUTION_STARTED, MESSAGE/OUTPUT, TOOL_REQUESTED, TOOL_STARTED,
TOOL_COMPLETED, DIFF_PROPOSED, EXECUTION_COMPLETED, EXECUTION_FAILED,
EXECUTION_INTERRUPTED.
Do NOT create another event schema. Map runtime-native events into existing
canonical/event semantics. Keep raw provider payload only as
diagnostic/evidence where justified.

============================================================
HARVEST 3 — DETERMINISTIC CAPABILITY GRANTS
============================================================
PRIMARY REFERENCE: Talos.
Its strongest idea is not "agent security." It is: MODEL PROPOSES,
DETERMINISTIC SYSTEM AUTHORIZES. That is already our architecture.
Strengthen CapabilityAuthority rather than replacing it.
Investigate scoped grants binding: tenant / actor / mission / execution /
worker / capability / resource / argument digest / expiry / attempt.
Do not implement this exact shape until mapped against existing grants.
Key invariant: AN LLM NEVER DECIDES WHETHER ITS OWN EFFECT IS AUTHORIZED.

============================================================
HARVEST 4 — DURABLE EXECUTION
============================================================
PRIMARY REFERENCES: ClawDesk, ForkScout, POLYROB, Nerve.
Harvest TESTABLE INVARIANTS around: leases, attempt numbers,
checkpointing, retry, dead-letter, orphan detection, resume, interrupt,
crash recovery, circuit breaking, blue-green worker promotion.
We already have Mission/Run/Execution infrastructure. Strengthen it. Do
not replace it.

EXECUTION STATE MUST DISTINGUISH: INTENDED / AUTHORIZED / LEASED /
STARTED / CHECKPOINTED / SUCCEEDED / FAILED / UNKNOWN / CANCELLED.
Do not blindly adopt these names. First map current states. Especially
attack UNKNOWN. A machine crash after external effect but before durable
receipt must NOT be called FAILED.

============================================================
HARVEST 5 — THIN SUPERVISION
============================================================
PRIMARY REFERENCE: Goated.
Important lesson: DO NOT DUPLICATE WHAT CODING RUNTIMES ALREADY DO WELL.
Codex/Claude can own: their context management, their compaction, their
internal tool loop, their provider protocol.
TenantOS should not wrap them so heavily that we reproduce them.
TenantOS supplies: mission, bounded context, capabilities, workspace,
authorization, receipts, outcomes. Then gets out of the way.

============================================================
HARVEST 6 — EXTENSION TRUST CLASSES
============================================================
PRIMARY REFERENCE: ThinClaw.
Harvest the distinction between: native trusted implementation, sandboxed
extension, MCP service, sidecar, external runtime, remote service.
Do NOT treat all tools as equivalent. But map trust classes into
CapabilityAuthority. Example question: can this execution READ FILE? WRITE
FILE? NETWORK? SPAWN PROCESS? USE SECRET? PUBLISH EXTERNALLY? SPEND MONEY?
The answer comes from capabilities. Not from the runtime's self-description.

============================================================
HARVEST 7 — LEARNING CANDIDATES
============================================================
PRIMARY REFERENCES: AgentArk, Nerve, Pernix, POLYROB.
THE IMPORTANT IDEA: successful repeated behavior can create a CANDIDATE
improvement. It cannot silently become policy.
Pipeline: OUTCOMES → REPEATED PATTERN → CANDIDATE → SUPPORTING EVIDENCE →
COUNTEREXAMPLES → PROPOSAL → REVIEW / EXISTING AUTHORITY → PROMOTION →
VERSIONED POLICY/SKILL.
Search PING first for existing proposal/promotion/evidence structures.
Do not create LearningAuthority.

SKILLS ARE NOT TRUTH. Nerve/Pernix progressive skill loading is useful.
Harvest: small metadata always available; instructions loaded when
relevant; resources loaded only when needed. This can reduce context cost
enormously. But a skill is PROCEDURAL KNOWLEDGE — not canonical fact, owner
preference, authorization, or outcome. Keep those boundaries explicit.

============================================================
HARVEST 8 — RUNTIME FAILOVER
============================================================
PRIMARY REFERENCES: MyAgens, POLYROB.
Useful: one task can potentially execute on multiple compatible runtimes.
But NEVER make failover semantically invisible when effects may have
already occurred.
Safe: model provider failed BEFORE effect → retry compatible provider.
Dangerous: worker timed out AFTER external mutation → blindly retry.
Therefore failover must consult execution/effect state.

============================================================
HARVEST 9 — MISSION CONTROL
============================================================
PRIMARY REFERENCES: Wayland, AgentArk, MyAgens.
DO NOT import their control planes. Harvest UX questions. Mission Control
should answer: WHAT IS RUNNING? WHAT IS WAITING? WHAT FAILED? WHO OWNS IT?
WHICH RUNTIME HAS IT? WHAT WAS AUTHORIZED? WHAT EFFECT OCCURRED? WHAT
EVIDENCE EXISTS? WHAT OUTCOME FOLLOWED? WHAT LEARNING WAS PROPOSED? WHAT
REQUIRES HUMAN DECISION?
Mission Control remains: PROJECTION. NOT AUTHORITY.

============================================================
HARVEST 10 — MULTI-AGENT COMMUNICATION
============================================================
Hivekeep and other multi-agent systems demonstrate persistent specialist
identities and inter-agent messaging.
DO NOT build an agent social network. TenantOS already has the better
abstraction: Mission → bounded delegated work → Execution →
result/evidence. When Agent A asks Agent B for work: that should become
observable delegated execution. Not invisible chat.

============================================================
HARVEST 11 — OWNER INBOX
============================================================
POLYROB and several others converge on a useful UX pattern: SHOW THE HUMAN
ONLY WHAT NEEDS A DECISION. This fits TenantOS extremely well. Future
Mission Control should have NEEDS YOU where each item states: WHAT
HAPPENED / WHY YOU ARE NEEDED / CONSEQUENCE / AVAILABLE DECISIONS /
DEFAULT IF YOU DO NOTHING. This may be more important than a giant agent
dashboard.

============================================================
HARVEST 12 — DOCTOR / PREFLIGHT
============================================================
Several projects implement useful environment checks. TenantOS should
eventually have one deterministic preflight path. Before execution:
runtime available? credentials resolvable? workspace valid? capabilities
resolvable? dependencies healthy? target reachable? required adapter
compatible? NO AI. Deterministic software.

============================================================
THE MOST IMPORTANT CURRENT QUESTION
============================================================
DO NOT START CODING THIS YET.
FIRST FORENSIC: WHAT DOES TENANTOS ALREADY HAVE?
Produce one matrix:
MECHANISM | EXISTING TENANTOS IMPLEMENTATION | CURRENT CALLERS | TESTS |
HARVEST REFERENCE | GAP | ACTION.
Actions ONLY: KEEP / STRENGTHEN / WRAP / MERGE / DELETE / DEFER.

SEARCH THESE EXISTING PING/TENANTOS AREAS: MissionRuntime,
MissionScheduler, WorkerRuntime, ExecutionAuthority, ExecutionAdapter,
ContainerExecutionAdapter, AIRuntime, CapabilityAuthority,
UnifiedEventRuntime, event bridge, event governance, identity, evidence,
witness, outcome, projection, Mission Control, skills, MCP, external
runtimes, agent registry, provider routing.
SEARCH CODE BEFORE DOCS. SEARCH CALLERS. SEARCH TESTS. SEARCH GIT HISTORY.

============================================================
EVENT AUTHORITY — DO NOT TOUCH UNTIL PROVEN
============================================================
We still need exactly one answer: WHO OWNS CREATE → CANONICALIZE → ID →
HASH → APPEND → SEQUENCE → DURABLE COMMIT → STREAM → REPLAY?
Do not bring another framework's event store into TenantOS. Use these
frameworks only as falsification references. If existing TenantOS has three
partial owners: CONVERGE THEM. Do not create number four.

============================================================
LICENSE GATE
============================================================
FOR EVERY HARVEST: record REPOSITORY / LICENSE / COMMIT/SHA / FILES
STUDIED / MECHANISM / COPY-ADAPT-CLEANROOM / DEPENDENCY COST. Especially do
not copy GPL code into proprietary components without an explicit licensing
decision. Patterns are not permission to copy implementation.

============================================================
DO NOT "WORK ALL FRAMEWORKS INTO TENANTOS"
============================================================
THAT PHRASE IS DANGEROUS. Instead: WORK THE BEST MECHANISMS INTO THE
EXISTING TENANTOS MODEL. A framework that contributes no superior mechanism
gets: REJECT. That is success.

============================================================
LIKELY CORE AFTER HARVEST
============================================================
DO NOT TREAT THIS AS APPROVED CODE YET. The likely convergence is:
TENANT EXPERIENCE (FYD / Mission Control / channels)
  → CONSTITUTIONAL AUTHORITY (Identity, Tenant, Event, Mission,
     Capability, Approval, Evidence, Outcome)
  → EXECUTION ROUTER (runtime registry, execution adapters,
     leases/checkpoints/retries)
  → HANDS (Native, Codex, Claude, Hermes, ...)
  → RECEIPT / EVIDENCE → OUTCOME → LEARNING CANDIDATE →
     EXISTING APPROVAL/PROMOTION BOUNDARY.

============================================================
THIS ENABLES THE OPTIONALITY WE ACTUALLY WANT
============================================================
If done correctly: we can change models without changing authority; change
Codex → Claude without changing missions; add local inference without
changing evidence; add MCP without changing capability semantics; add
desktop execution without changing canonical truth; add remote workers
without changing owner decisions; add FYD verticals without duplicating
orchestration; add agent learning without letting agents rewrite
constitution; add new user surfaces without moving state authority into
the UI.
THAT is TenantOS. Not an agent framework. AN OPERATING CONTRACT FOR MANY
RUNTIMES.
