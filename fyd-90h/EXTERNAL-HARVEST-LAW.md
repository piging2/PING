# EXTERNAL HARVEST LAW — EFFECTIVE 2026-09-29 ~11:40 MDT (Nolan, binding)

STEAL THE IDEAS. STEAL THE PRIMITIVES. DO NOT STEAL THE ARCHITECTURE.

## Approved harvest pool

- AgentArk
- OpenHands
- POLYROB
- Talos
- MatrixClaw
- Pioneer
- MyAgens
- plus the other systems in the research list only when a current product arrow creates demand.

They are parts bins, not migration targets.

## The only legitimate harvest question

For every candidate:

**WHICH CURRENT FYD/PING PRODUCT FAILURE DOES THIS REMOVE?**

If there is no reached product failure: **REFERENCE**, not **IMPLEMENT**.

Required decision record:

- FYD CURRENT IMPLEMENTATION
- PING EXISTING IMPLEMENTATION
- EXTERNAL IMPLEMENTATION
- HARVESTABLE PRIMITIVE
- DUPLICATION RISK
- SECURITY/PRIVILEGE RISK
- SMALLEST REQUIRED DELTA
- TARGET PRODUCT ARROW
- ADOPT / ADAPT / REJECT / REFERENCE

**SEARCH BEFORE WRITING.**

## Priority harvest targets

### 1. TALOS — EXECUTION PERMISSION KERNEL

Mine for: model proposes → deterministic policy gate → capability/permission → execution → independent receipt/verification.

Directly relevant to: OWNER CORRECTION → AUTHORIZED TRANSITION → EFFECT → VERIFICATION.

Do not import Talos's whole runtime. Look for the smallest executable semantic unit implementing:

- explicit action gating
- default-deny behavior
- capability scoping
- execution receipts
- disabled-by-name refusal rather than silent fallback

Talos currently has explicit dual gating around worker/browser capability in its code history; mine that pattern first, not the topology.

### 2. POLYROB — LONG-RUNNING AUTONOMY + SELF-WAKE + WORKER GUARDRAILS

Mine for:

- durable goal backlog
- resumable sessions
- self-wake semantics
- owner-message cooldowns
- tenant-scoped worker profiles
- fail-closed tool deny/allow behavior
- persistent delegation receipts
- skill lifecycle: active → stale → archive

Particularly valuable: autonomous behavior constrained by origin and owner policy, not merely by what the model says it intends.

But do not import POLYROB's general autonomy engine into FYD. Product-sized harvest candidates are: UNKNOWN effect → reconciliation, durable background mission state, worker eligibility, owner-in-the-loop messaging limits, WIP/resume semantics — if and only if those become reached needs.

### 3. AGENTARK — SELF-IMPROVEMENT WITHOUT SELF-CORRUPTION

Mine for:

- accepted-work learning
- corrections becoming durable memory
- tool-outcome learning
- proposed changes to memory/prompts/routing
- explicit approval before self-modification
- sandboxing
- escalation
- traceability

Highly relevant to the future loop: OWNER CORRECTION → LEARNING → NEXT BEHAVIOR.

The invariant is: **LEARN FROM ACCEPTED OUTCOMES; DO NOT LET THE AGENT SILENTLY REWRITE ITS OWN AUTHORITY.** Harvest that semantic pattern.

### 4. OPENHANDS — SANDBOX + BACKEND SEPARATION

Mine for:

- local vs remote backend separation
- persistent backend services
- container/VM isolation
- workspace mounting boundaries
- backend-only/headless deployment
- automation server separation

OpenHands' own docs explicitly warn that agents can execute shell commands, read/write files, and use connected tools with the permissions of their environment, and recommend containers/sandboxes/VMs for tighter boundaries.

The harvestable invariant is: **EXECUTION ENVIRONMENT IS A SECURITY BOUNDARY.** Do not confuse agent identity with host permissions. This can strengthen future Muse/worker execution without changing FYD's product semantics.

### 5. MATRIXCLAW / MYAGENS / PIONEER — PERSISTENT CONTROL PLANE + INTERCHANGEABLE WORKERS

Mine for:

- one durable task/context plane
- interchangeable Claude/Codex/local-model workers
- persistent sessions
- subagent handoff
- worker supervision
- watchdog recovery
- model/provider decoupling

The goal is not to make PING a universal agent OS. The potentially useful invariant is: **MISSION STATE ≠ WORKER IMPLEMENTATION** — so PING can own task/authority/evidence while Codex / Claude / local model / shell worker are replaceable executors. That aligns directly with authority ⟂ verification and product state ⟂ worker choice.

## What NOT to harvest

Reject or demote by default:

- generic chat UI
- provider matrices
- branding
- arbitrary plugin ecosystems
- social channels
- Telegram/Discord plumbing
- generic RAG
- duplicate memory stores
- duplicate event buses
- duplicate identity systems
- another workflow DSL
- another task ontology
- another approval ontology
- another vector database
- whole-agent-runtime replacement

Unless a reached arrow proves the need.

## Apply the product-arrow filter

CURRENT FRONTIER: WHY THIS → OWNER CORRECTION → DURABLE OWNER INTENT → REGENERATION → SURVIVAL.

External projects may help only if they strengthen one of: identity, evidence, authorized transition, worker execution, effect verification, reconciliation, durable mission state, owner-controlled learning. Everything else waits.

## Copy semantics, not names

Do not introduce TalosKernel, AgentArkMemory, PolyrobWorker, OpenHandsBackend as new product concepts merely because those repos use those names. Translate the primitive into existing FYD/PING semantics.

Example: external "capability token" → existing FYD/PING concept "authorized bounded action". If FYD already has the stronger semantic owner, adapt into it. Do not create parallel authority.

## Code harvest standard

Before copying any code:

1. identify exact source file and commit
2. identify license
3. identify dependencies
4. identify tests
5. identify whether code is actually reached upstream
6. identify security assumptions
7. reduce to smallest semantic unit
8. port/adapt to existing owner
9. write local tests against FYD/PING behavior
10. commit atomically

If direct code reuse would import large dependency surface: reimplement the primitive from the behavior/spec instead of importing the subsystem.

## Harvest ledger

For each external source report:

- SOURCE PROJECT
- SOURCE COMMIT
- SOURCE FILES
- LICENSE
- PRIMITIVE
- PRODUCT ARROW
- CURRENT FYD/PING OWNER
- BETTER THAN EXISTING?
- WHY
- DEPENDENCY COST
- SECURITY COST
- ADOPT / ADAPT / REJECT / REFERENCE
- LOCAL COMMIT SHA

No vague "inspired by." Either it changes a reached product capability or it stays reference.

## Specific first harvest search (read-only)

Run read-only mining first for:

- Talos: permission/capability gate, execution receipt, deny-by-default
- POLYROB: persistent delegation receipt, worker profile isolation, self-wake/resume, owner messaging guard
- AgentArk: accepted-correction learning, approval-gated self-change
- OpenHands: remote backend isolation, workspace/sandbox boundary
- MatrixClaw / MyAgens / Pioneer: persistent task state decoupled from worker/model

Then rank only by relevance to a currently red or next product arrow. Do not rank by architecture beauty.

## Hard cap (Nolan 2026-09-29 ~11:40 MDT)

One read-only harvest pass per source. Then only the top 1–2 primitives with a current product-arrow mapping get writer time. Do not turn this into a 70-hour research lane.

## Commit law

Any harvested code that enters FYD/PING: STATUS → OWNERSHIP → LICENSE CHECK → SECRET CHECK → IMPLEMENT/ADAPT → TEST → DIFF → EXPLICIT STAGING → COMMIT → REPORT SHA.

No harvested code remains as uncommitted experiments. If unfinished but valuable: WIP COMMIT. If interesting but not product-relevant: REFERENCE. If inferior: REJECT.

## North star

WE ARE NOT BUILDING THE BEST AGENT FRAMEWORK. We are building the strongest FYD product loop. External agent systems exist to make that loop more persistent, more bounded, more recoverable, more verifiable, less model-dependent, less duplicated — without expanding the product surface.

**STEAL EVERYTHING THAT SHRINKS FYD/PING WHILE MAKING THE REACHED ARROWS STRONGER. Ignore everything else.**

## Companion product direction (Nolan 2026-09-29 ~11:40 MDT)

Keep perfecting TenantOS / Orca / Mission Control, wiring it into piging2/PING as the first test tenant, with all capabilities possible — better than the external systems. Reverse-engineer their primitives into more deterministic software (our stack).
