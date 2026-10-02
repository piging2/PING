# CRX AUTONOMOUS MISSIONS — 3B TOKEN HARVEST / CONVERGENCE CAMPAIGN

Issued by Nolan, 2026-09-23 ~10:03 MDT. Verbatim steering directive for the CRX autonomy research lane. Binding.

CONTEXT

We have unusually abundant reasoning capacity this week.

USE IT.

Do not conserve reasoning by doing shallow investigations.
Do not waste it by producing giant speculative architecture documents.

Spend reasoning on:

SEARCHING
COMPARING
FALSIFYING
SIMULATING
ADVERSARIAL TESTING
ARCHAEOLOGY
MECHANISM EXTRACTION
EXPERIMENT DESIGN
CONVERGENCE
AUTONOMOUS EXECUTION.

PRIMARY OBJECTIVE:

MAKE CRX/PING'S AGENTS DRAMATICALLY MORE AUTONOMOUS AND PRODUCTIVE
WITHOUT CREATING A SECOND ORCHESTRATION UNIVERSE.

Target loop:

DISCOVER
→ PROVE
→ PRIORITIZE
→ CLAIM
→ PLAN
→ EXECUTE
→ OBSERVE
→ VERIFY
→ RECOVER/RECONCILE
→ INTEGRATE
→ LEARN
→ DISCOVER NEXT WORK

The HUMAN should cease being the scheduler.

============================================================
0. DO NOT START BY BUILDING
============================================================

First launch a major parallel HARVEST WAVE.

Search current implementations, papers, repositories, issue discussions,
architecture docs, failure reports and benchmarks.

We are specifically looking for mechanisms that make autonomous engineering:

MORE DURABLE
MORE PARALLEL
MORE CORRECT
MORE RECOVERABLE
MORE OBSERVABLE
CHEAPER
FASTER
LESS HUMAN-DEPENDENT.

Every external project is evidence, not authority.

README CLAIM != IMPLEMENTATION.
IMPLEMENTATION != PRODUCTION PROOF.
POPULAR != GOOD.
NEW != BETTER.

Inspect SOURCE for serious candidates.

============================================================
1. ORCA LANE — HIGHEST PRIORITY
============================================================

Deep-audit:

orca-cli/orca

Focus specifically on:

persistent run DAG
SQLite state model
agent-readable task graph
MCP control plane
worktree isolation
run lifecycle
dependency representation
task claiming
context survival
session reset survival
structured run logs
resume semantics
failure semantics
parallelism
agent adapters
cleanup
how agents themselves drive Orca.

Question:

WHAT DOES ORCA SOLVE THAT CRX CURRENTLY MAKES NOLAN OR A COORDINATOR DO?

Then compare:

ORCA PRIMITIVE
CRX EXISTING ANALOG
SEMANTIC DIFFERENCE
WHICH IS STRONGER
HARVESTABLE MECHANISM
INTEGRATION COST
SECOND-AUTHORITY RISK.

Do NOT install Orca into the constitution.

We want its best mechanisms.

============================================================
2. ORKA LANE
============================================================

Audit orka-agents/orka.

Focus on:

Task CRD
Agent
Provider
per-task isolation
Kubernetes Job lifecycle
RuntimePool
coding-agent execution
workspace semantics
secret isolation
task result durability
cleanup
resource limits
scheduling
agent runtime abstraction.

Ask:

WHAT CAN CRX LEARN FROM USING INFRASTRUCTURE SCHEDULING AS AGENT
SCHEDULING?

Especially investigate whether:

TASK AS DURABLE RESOURCE

is cleaner than our current conversational/coordinator state.

Do not introduce Kubernetes merely because Orka uses Kubernetes.

Extract semantics independently of implementation technology.

============================================================
3. OMNIROUTE LANE
============================================================

Deep-audit OmniRoute.

This lane is NOT orchestration authority.

Study it as:

MODEL / PROVIDER EXECUTION ROUTER.

Extract:

provider abstraction
model abstraction
fallback chains
quota preflight
account selection
provider health
retry behavior
streaming normalization
usage accounting
cost accounting
routing policies
local-model support
coding-agent integrations
ACP
MCP
A2A.

Determine whether CRX eventually needs:

MODEL REQUEST
→ POLICY
→ ROUTE
→ PROVIDER
→ RECEIPT

as a replaceable execution seam.

CRITICAL:

ROUTING OPTIMIZATION MUST NEVER BECOME DECISION AUTHORITY.

OmniRoute can decide:

WHERE/HOW to execute an authorized inference.

It must not decide:

WHETHER an action is authorized.

============================================================
4. OPENAI AGENTS SDK LANE
============================================================

Study current Agents SDK SOURCE and docs.

Harvest:

agent loop
handoffs
agents-as-tools
guardrails
sessions
MCP integration
human approval
tracing
trace/span hierarchy
tool tracing
custom spans
failure handling
streaming
structured output
context handling.

Compare its trace model against our missing:

MISSION
TASK
EXECUTION
MODEL CALL
MEMORY RETRIEVAL
AUTHORIZATION
TOOL ATTEMPT
TOOL RECEIPT
DURABLE EFFECT
VERIFICATION.

Ask:

WHAT MINIMUM PROVENANCE DOES A SERIOUS AGENT RUNTIME RECORD?

Do not copy the SDK wholesale.

============================================================
5. DURABLE EXECUTION SUPER-LANE
============================================================

Deep compare:

TEMPORAL
RESTATED/RESTATE
DAPR
INNGEST
TRIGGER.DEV
HATChet
PREFECT
DAGSTER
LANGGRAPH DURABLE EXECUTION

and any stronger current candidates discovered.

We need mechanisms for:

durable task state
sleep/wake
timers
leases
retries
idempotency
signals
human approval
workflow continuation
process death
machine death
worker death
UNKNOWN_OUTCOME
compensation
reconciliation.

Critical question:

WHAT PART OF THIS SHOULD CRX OWN?

WHAT PART SHOULD EXISTING INFRASTRUCTURE OWN?

Do not build Temporal badly inside CRX.

============================================================
6. AGENT ORCHESTRATOR SUPER-LANE
============================================================

Survey aggressively:

OpenHands
SWE-agent
AutoGen
AgentScope
CrewAI
LangGraph
Mastra
PydanticAI
Agno
BeeAI
Google ADK
Semantic Kernel
Haystack agents
smolagents
MetaGPT
CAMEL
AutoGPT
OpenDevin descendants
Goose
OpenCode orchestration
Claude Code agent teams/subagents where inspectable
Codex orchestration patterns
Jules
Devin public architecture evidence
OpenClaw
and newly discovered serious projects.

DO NOT make a feature checklist.

Find mechanisms.

For each:

HOW IS WORK REPRESENTED?
HOW IS WORK CLAIMED?
HOW IS CONTEXT PASSED?
HOW IS STATE DURABLE?
HOW ARE AGENTS ISOLATED?
HOW DO THEY COMMUNICATE?
HOW ARE DEPENDENCIES REPRESENTED?
HOW DO THEY RECOVER?
HOW DO THEY STOP?
HOW DO THEY VERIFY?
HOW DO THEY ESCALATE?
HOW DO THEY HANDLE SIDE EFFECTS?
HOW DO THEY AVOID DUPLICATE WORK?
HOW DO THEY SELECT NEXT WORK?

============================================================
7. MEMORY SUPER-LANE
============================================================

Study:

Letta/MemGPT
Mem0
Zep
Graphiti
LangGraph memory
OpenAI session/memory patterns
Memary
Cognee
LightRAG
GraphRAG variants
current agent-memory research.

Do not ask:

WHICH MEMORY FRAMEWORK SHOULD WE INSTALL?

Ask:

WHAT MEMORY OPERATIONS ACTUALLY IMPROVE AUTONOMOUS ENGINEERING?

Separate:

WORKING CONTEXT
EPISODIC MEMORY
SEMANTIC KNOWLEDGE
DECISIONS
OWNER CORRECTIONS
TASK HISTORY
FAILURE MEMORY
PROCEDURAL MEMORY
REPOSITORY KNOWLEDGE
RUNTIME OBSERVATIONS.

Find mechanisms for:

write qualification
retrieval
authority ranking
contradiction
supersession
staleness
forgetting
tenant isolation
provenance
compression
consolidation.

============================================================
8. MCP / TOOL EXECUTION SUPER-LANE
============================================================

Search serious MCP runtimes, gateways and registries.

Study:

tool discovery
schema negotiation
capabilities
authorization
credentials
sandboxing
timeouts
receipts
retries
idempotency
tool health
server disappearance
version drift
response bounds
secret handling
prompt injection
tool-result provenance.

But preserve:

ACTION INTENT
→ AUTHORIZATION
→ TOOL RESOLUTION
→ EXECUTION
→ RECEIPT
→ EFFECT VERIFICATION.

MCP remains an ADAPTER.

============================================================
9. OBSERVABILITY SUPER-LANE
============================================================

Study current agent observability:

OpenTelemetry GenAI conventions
OpenAI Agents tracing
LangSmith
Arize Phoenix
Langfuse
Braintrust
Weights & Biases Weave
Helicone
AgentOps
Traceloop
and serious newer systems.

Extract:

trace identity
parentage
agent span
model span
retrieval span
tool span
authorization span
evaluation
cost
tokens
latency
failure
artifact references
redaction
sampling.

Then go beyond dashboards.

We need NEGATIVE OBSERVABILITY:

detect execution without authorization
detect tool result without request
detect memory use without retrieval
detect mutation without receipt
detect missing parent
detect orphan task
detect duplicate execution
detect stale snapshot execution.

============================================================
10. AUTONOMOUS SOFTWARE FACTORY LANE
============================================================

Study systems that autonomously:

inspect repositories
create worktrees
patch
test
review
open PRs
recover
iterate.

Find best current implementations of:

WORK PACKET
WORKTREE PER MUTATION
ONE WRITER
STALE BASE DETECTION
PATCH ARTIFACT
TEST RECEIPT
REVIEWER AGENT
MERGE GATE
ROLLBACK
POST-MERGE VERIFICATION.

CRX should eventually be able to safely run:

50 investigations
+
10 independent patches
+
review
+
integration

without Nolan scheduling them manually.

============================================================
11. CREATE A MECHANISM LIBRARY
============================================================

Do not create prose summaries alone.

Every valuable external mechanism becomes a structured candidate:

MECHANISM_ID
SOURCE_PROJECT
SOURCE_COMMIT
LICENSE
PROBLEM
MECHANISM
INVARIANT
FAILURE_MODEL
SECURITY_MODEL
SCALING_MODEL
CRX_ANALOG
SEMANTIC_DELTA
HARVEST_CLASS
INTEGRATION_COST
EXPECTED_VALUE
FALSIFICATION_TEST.

HARVEST_CLASS:

REUSE
ADAPT
REPURPOSE
PATTERN
WATCH
REJECT.

============================================================
12. CROSS-POLLINATION AGENT
============================================================

Create a READ-ONLY reasoning lane whose only job is:

TAKE MECHANISM FROM PROJECT A
+
CRX GAP
+
MECHANISM FROM PROJECT B

and ask whether the combination creates a substantially better solution.

Examples:

ORCA DAG
+
CRX canonical event provenance.

ORKA disposable workers
+
CRX task leases.

OPENAI trace hierarchy
+
CRX durable receipts.

OMNIROUTE routing
+
CRX model-provider abstraction.

TEMPORAL UNKNOWN/retry semantics
+
CRX capability authority.

LETTA memory lifecycle
+
CRX evidence authority.

This lane may propose experiments.

It may NOT invent architecture without identified source mechanisms.

============================================================
13. RED TEAM EVERY HARVEST
============================================================

A second agent attacks each promising harvest.

Ask:

WHAT DOES THIS PROJECT HIDE?
WHAT ASSUMPTION DOES IT MAKE?
WHAT BREAKS AT 1,000 TASKS?
WHAT BREAKS AT 1,000 TENANTS?
WHAT HAPPENS AFTER PROCESS DEATH?
WHAT HAPPENS AFTER NETWORK LOSS?
WHAT HAPPENS AFTER SIDE EFFECT BUT BEFORE RECEIPT?
HOW DOES IT HANDLE SECRETS?
CAN AGENTS ESCALATE PRIVILEGE?
CAN TASKS DUPLICATE?
CAN MEMORY POISON FUTURE RUNS?
CAN OBSERVABILITY LIE?
CAN A MODEL MANUFACTURE SUCCESS?

No harvest becomes implementation candidate until adversarial review.

============================================================
14. TOKEN ECONOMICS LANE
============================================================

We have abundant tokens THIS WEEK.

Use them intelligently.

Measure:

MODEL TOKENS
WALL TIME
HUMAN INTERRUPTIONS
TASK VALUE
PATCH SURVIVAL
REWORK
DUPLICATE INVESTIGATION
FAILED EXPERIMENTS
USEFUL DISCOVERIES.

We want to discover which activities benefit from massive reasoning budgets.

Candidates:

deep archaeology
cross-project comparison
adversarial review
test generation
failure analysis
semantic deduplication
design falsification.

Do not burn tokens repeating repository summaries.

============================================================
15. MODEL SPECIALIZATION EXPERIMENT
============================================================

Do not assume every task needs the strongest model.

Experiment with:

CHEAP DISCOVERY MODEL
→ gather candidates.

STRONG REASONING MODEL
→ adjudicate.

CODING MODEL
→ patch.

INDEPENDENT REVIEW MODEL
→ attack.

DETERMINISTIC SOFTWARE
→ validate.

Measure quality/cost.

This becomes evidence for future OmniRoute/model-routing policy.

============================================================
16. AUTONOMOUS MISSION PRIMITIVE
============================================================

Now investigate the smallest representation needed for a self-renewing mission.

Candidate semantics:

MISSION
GOAL
CONSTRAINTS
BUDGET
AUTHORITY
SUCCESS CONDITIONS
DISCOVERY POLICY
TASK GRAPH
CHECKPOINT
EVIDENCE
OPEN QUESTIONS
BLOCKERS
TERMINAL CONDITIONS.

Mission should survive every worker.

Workers are disposable.

The mission is not a chat.

============================================================
17. SELF-RENEWING WORK
============================================================

A mission may generate work ONLY from evidence.

Every generated task requires:

GAP
EVIDENCE
VALUE
COST
RISK
DEPENDENCIES
AUTHORITY
PROOF GATE
STOP CONDITION.

Then:

SEMANTIC DEDUPE
→ PRIORITY
→ CLAIM.

Prevent:

report-about-report loops
recursive audits
task inflation
agent vanity work
micro-cleanup storms.

============================================================
18. ORCHESTRATOR MUST BECOME BORING
============================================================

The coordinator should eventually do little intelligent work.

It owns:

QUEUE
DEPENDENCIES
LEASES
BUDGETS
CAPABILITY BOUNDS
CHECKPOINTS
INTEGRATION ORDER.

Agents own:

INVESTIGATION
JUDGMENT
PATCH PROPOSAL
DESIGN
REVIEW.

Software owns:

STATE
VALIDATION
LOCKING
SCHEMAS
HASHES
DIFFS
TEST EXECUTION
PERMISSIONS
RETRY POLICY.

If the coordinator needs enormous context to operate:

THE DESIGN IS WRONG.

============================================================
19. BUILD A FAILURE TAXONOMY
============================================================

Every autonomous failure becomes typed:

BAD_ASSUMPTION
STALE_SNAPSHOT
DEPENDENCY_MISSING
AUTHORITY_BLOCK
EXTERNAL_BLOCK
TEST_FAILURE
PATCH_CONFLICT
TOOL_FAILURE
UNKNOWN_SIDE_EFFECT
MODEL_FAILURE
MEMORY_FAILURE
RETRIEVAL_FAILURE
DUPLICATE_WORK
LEASE_LOSS
WORKER_DEATH
COORDINATOR_DEATH
SECURITY_REJECTION
BUDGET_EXHAUSTED.

Then define automatic routing.

Do not return every failure to Nolan.

============================================================
20. AUTONOMY LADDER
============================================================

Measure CRX honestly:

L0 — human drives every action
L1 — agent executes bounded task
L2 — agent plans and executes bounded task
L3 — agent recovers and verifies
L4 — agents coordinate bounded mission
L5 — mission discovers and prioritizes subsequent work
L6 — continuous autonomous engineering under fixed authority/budgets

Do not claim a level from architecture.

PROVE IT WITH RUNS.

============================================================
21. FIRST TARGET EXPERIMENT
============================================================

After harvesting, select ONE real CRX engineering mission.

Give the coordinator only:

GOAL
AUTHORITY
BUDGET
STOP CONDITIONS.

Then see whether the system can independently:

discover
decompose
parallelize
claim
investigate
patch
test
review
integrate
checkpoint
discover follow-up work

without Nolan scheduling individual tasks.

Record every human intervention.

Each intervention is an orchestration bug candidate.

============================================================
22. SECOND TARGET — INTERRUPTION
============================================================

Repeat while deliberately killing:

worker
coordinator
model provider
network
database connection.

Prove reconstruction from durable state.

If the human must explain what was happening:

FAIL.

============================================================
23. THIRD TARGET — UNKNOWN SIDE EFFECT
============================================================

Create an isolated test where:

ACTION SENT
→ EFFECT OCCURS
→ RESPONSE LOST.

Prove:

NO BLIND RETRY.

System produces:

UNKNOWN_OUTCOME
→ RECONCILIATION TASK
→ OBSERVE EXTERNAL STATE
→ RESOLVE.

This is a foundational autonomy gate.

============================================================
24. FOURTH TARGET — CONTRADICTORY WORKERS
============================================================

Two independent workers investigate the same question and disagree.

Do not let coordinator pick whichever sounds better.

Require:

EVIDENCE COMPARISON
→ FALSIFICATION
→ RESOLUTION
or
→ EXPLICIT UNRESOLVED CONTRADICTION.

============================================================
25. FIFTH TARGET — SELF-GENERATED NEXT TASK
============================================================

Complete one real patch.

Do not supply the next task.

Require the mission to:

integrate evidence
update assumptions
invalidate stale backlog
discover exposed gap
rank it
claim it
continue.

THIS is the first serious proof of autonomous mission continuity.

============================================================
26. CONTINUOUS HARVEST
============================================================

Keep external research running throughout the week.

Every 6–12 hours, bounded refresh:

NEW PROJECT
NEW RELEASE
NEW MECHANISM
IMPORTANT PR
FAILURE REPORT
BENCHMARK
SECURITY ISSUE.

But only surface changes relevant to CURRENT gaps.

No generic AI-news feed.

============================================================
27. HUMAN DECISION BUDGET
============================================================

Target:

ZERO routine questions.

Before asking Nolan:

SEARCH SOURCE.
SEARCH HISTORY.
SEARCH RUNTIME.
SEARCH DECISIONS.
RUN SAFE EXPERIMENT.
ASK ANOTHER AGENT.
ATTEMPT FALSIFICATION.

Escalate only:

credentials
money
external authorization
irreversible destructive action
production promotion
legal/privacy decision
trust-root modification
genuine product ambiguity.

============================================================
28. OUTPUT CADENCE
============================================================

DO NOT SEND CONSTANT STATUS.

Maintain durable internal artifacts.

Surface only:

BOUNDARY CLOSED
P0 DISCOVERED
IRREDUCIBLE HUMAN DECISION
PROMOTION READY
MISSION BLOCKED WITH NO SAFE ALTERNATIVE.

Otherwise:

CONTINUE.

============================================================
29. THIS WEEK'S SUCCESS BAR
============================================================

By the end of this high-token campaign I want evidence for:

A durable autonomous Mission representation.

A task graph workers can themselves consume.

Lease/claim/recovery semantics.

Disposable isolated mutation workers.

Memory retrieval with provenance.

Tool execution receipts.

UNKNOWN_OUTCOME reconciliation.

Traceability from Mission → Task → Execution → Effect.

At least one mission surviving worker/coordinator interruption.

At least one patch discovered, implemented, attacked and verified without
human scheduling.

At least one automatically selected follow-up task.

A harvested mechanism library grounded in source.

Evidence showing what NOT to build.

A concrete comparison of CRX against Orca/Orka/current leading runtimes.

A path to continuously improving autonomy without continuously expanding
architecture.

============================================================
30. FINAL CONSTRAINT

DO NOT SPEND 3 BILLION TOKENS MAKING CRX MORE COMPLICATED.

SPEND THEM MAKING CRX KNOW MORE BEFORE IT ACTS.

THE DESIRED END STATE IS NOT:

A HUGE AGENT FRAMEWORK.

IT IS:

SMALL DURABLE AUTHORITIES
+
DISPOSABLE INTELLIGENT WORKERS
+
EXCELLENT EVIDENCE
+
STRONG RECOVERY
+
AUTOMATIC USEFUL-WORK DISCOVERY.

SEARCH AGGRESSIVELY.

HARVEST AGGRESSIVELY.

FALSIFY AGGRESSIVELY.

THEN BUILD THE SMALLEST THING THAT SURVIVES THE EVIDENCE.

BEGIN NOW.

---

## Cover notes from Nolan (binding emphasis, outside the numbered sections)

1. Governing principle stays: maximize verified autonomous throughput, not agent count, reports, or activity.
2. ORCA goes first: orca-cli/orca gets an immediate source-level comparison against CRX, mechanism by mechanism — persistent run DAG, SQLite state, worktree isolation, agent-readable task graph, MCP control plane. Do not adopt Orca; explain why each CRX equivalent should be better, reused, or unnecessary.
3. Use the tokens primarily for parallel FALSIFICATION, not parallel implementation.
4. The end-of-week demonstration: give CRX one nontrivial engineering mission, stop scheduling its subtasks, deliberately kill pieces of it during the week, and see whether the system independently closes useful gaps and can explain every important action it took. 500 patches and 200 reports = token burn accomplished very little.
