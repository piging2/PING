# CEO ORDER — READABILITY ROUTING FOR AGENTS AS A FIRST-CLASS EXECUTION PRIMITIVE (2026-09-30 ~18:31 MDT, Nolan, binding, filed verbatim)

## Nolan's thesis

READABILITY ROUTING FOR AGENTS should be treated as a first-class execution primitive. Not prettier prompts. Not documentation polish. A deterministic compiler from human intent into the smallest brief an executor can correctly act on.

The harvest report strengthens that conclusion. PING already has the canonical mission/runtime machinery: MissionRuntime, the scheduler, canonical workers, the single ping_events writer, and centralized event identity are all evidenced in the audit. The MarketingOS walkthrough then found only bounded vocabulary/label/behavior gaps, not a missing foundational authority or store.

So I would not build AgentRoutingAuthority, PromptAuthority, BriefStore, AgentBrain, or another orchestration system. Build readability into the existing mission → worker boundary.

## The key conceptual improvement

Today there are really three different objects that are too easy to blur:
- MISSION = durable semantic intent.
- ROUTE = deterministic choice of eligible execution path.
- BRIEF = executor-specific readable projection of that mission.

That gives us:

```
HUMAN INTENT
    ↓
CANONICAL MISSION
    ↓
MISSION CONTRACT VALIDATION
    ↓
READABILITY COMPILER
    ↓
ROUTING DECISION
    ↓
EXECUTOR-SPECIFIC BRIEF
    ↓
WORKER / AGENT / TOOL
    ↓
RESULT ENVELOPE
    ↓
INDEPENDENT VERIFICATION
    ↓
CANONICAL EFFECT / OUTCOME
```

The mission is authority-bearing durable state. The brief is disposable. That distinction is huge.

A Codex brief, Hermes brief, research-agent brief, Copilot brief, browser-worker brief, and deterministic JS worker request should not themselves become competing representations of what PING wants. They are compiled views of the same mission.

## READABILITY ROUTING CONTRACT

The requirement for the crew:

**An executor should receive everything necessary to make the next bounded decision correctly, and nothing that invites it to redesign the system.**

Every routed brief should answer, in this order:
1. WHY AM I HERE?
2. WHAT EXACTLY IS MY JOB?
3. WHAT IS ALREADY KNOWN?
4. WHAT MUST I NOT ASSUME?
5. WHAT MAY I READ?
6. WHAT MAY I CHANGE?
7. WHAT MUST I NOT CHANGE?
8. WHAT CONSTITUTES SUCCESS?
9. WHAT EVIDENCE MUST I RETURN?
10. WHAT SHOULD MAKE ME STOP?

That is dramatically better than dumping AGENTS.md + architecture history + 40 files + a vague mission onto every agent.

Critically, readability must be role-relative:
- A research reader should not receive implementation instructions.
- A writer should not receive ten speculative architecture alternatives.
- A falsifier should not be told what result we hope is true.
- A browser executor should not receive canonical DB authority.
- A deterministic worker should not receive prose at all when a typed payload suffices.

## Compile briefs by executor class

Establish a small number of brief shapes, not agent personalities.

For a reader/researcher:
QUESTION / WHY IT MATTERS / KNOWN FACTS / UNKNOWNS / SEARCH SCOPE / EVIDENCE STANDARD / DISALLOWED INFERENCES / OUTPUT SCHEMA / STOP CONDITION

For a writer:
BROKEN REACHED ARROW / OBSERVED DEFECT / SEMANTIC OWNER / OWNED FILES / EXISTING PRIMITIVES TO REUSE / SMALLEST REQUIRED DELTA / INVARIANTS / TESTS / COLLISION BOUNDARY / COMMIT CONTRACT

For a falsifier:
CLAIM UNDER TEST / WHAT WOULD FALSIFY IT / AUTHORITATIVE OBSERVATION POINT / ADVERSARIAL CASES / NO-RESCUE RULE / REQUIRED EVIDENCE / VERDICT SCHEMA

For an effect executor:
AUTHORIZED EFFECT / PRINCIPAL / TENANT / CAPABILITY / TARGET / INPUT DIGEST / IDEMPOTENCY / ATTEMPT ID / SIDE-EFFECT BOUNDARY / EXPECTED OBSERVATION / UNKNOWN/HOLD RULE

That last one should be deliberately boring. Effect executors should not be philosophers.

## Route by required capability, not agent name

This is where readability and the ONE BRAIN, MANY HANDS rule join.

Don't say: send this to Hermes / send this to Codex / send this to Copilot.

Canonical intent should say something closer to:

```yaml
required_capabilities:
  - repository.read
  - javascript.modify
  - test.execute
constraints:
  network: false
  external_effects: false
evidence_required:
  - diff
  - test_result
  - before_sha
  - after_sha
```

Then routing can select an eligible execution target. The worker inventory already supports this direction: the audit describes WorkerRuntime.dispatch() as the canonical dispatch decider matching worker eventTypes, while mission labeling is assignment metadata rather than another dispatch authority.

Eventually:

```
MISSION
  ↓
REQUIRED CAPABILITY SET
  ↓
ELIGIBLE EXECUTORS
  ↓
POLICY / AVAILABILITY / COST / LOCALITY
  ↓
TARGET
  ↓
TARGET-SPECIFIC READABLE BRIEF
```

Changing Codex → Hermes → local JS should not change mission semantics.

## Add an epistemic header to every intelligent-agent brief

This may be the highest-leverage readability improvement. Agents need to know what kind of knowledge they are looking at.

Every important context item should be renderable as:
PROVEN / SUPPORTED / REPORTED / INFERRED / UNKNOWN / CONFLICTING

And preferably: claim / state / source / observed_at / freshness / support_set / authority/relevance.

The MarketingOS work already heads this way: the intelligence map explicitly distinguishes PROVEN, NOT PROVEN, NEEDS-REVERIFY, and UNKNOWN and says invented certainty is absent by design. Push that philosophy all the way into agent briefs.

An agent should visually understand:

PROVEN — UnifiedEventRuntime is sole production ping_events writer.

REPORTED — NEEDS REVERIFY — acquire-url hostile battery passed.

UNKNOWN — current deployed runtime contains Pig worktree protections.

DO NOT INFER — source implementation == deployed implementation.

That one change could eliminate a surprising amount of agent hallucination and archaeology churn.

## Make evidence immediately adjacent to claims

Do not give an agent:
FACTS ... 40 statements ...
SOURCES ... 30 references ...

Compile:

CLAIM: POST /ingest has zero production callers.
STATE: PROVEN ABSENT in audited baseline.
EVIDENCE: <file/symbol/search evidence>
IMPLICATION: Acquisition seam exists but is unmanned.
DO NOT CONCLUDE: A new ingestion authority is required.

The MarketingOS audit demonstrates why this works: /ingest exists and routes through the canonical boundary, but the missing thing is a producer, not a new ingestion architecture. This format teaches the executor the difference between mechanism missing and wiring missing. That is exactly the distinction the convergence program needs.

## Give every agent a tiny sovereignty map

Agents repeatedly make architecture mistakes because they don't know who owns what. Don't send the whole constitution. Give them the relevant slice:

SEMANTIC OWNER: MissionRuntime
CANONICAL STORE: ping_missions
EVENT WRITER: UnifiedEventRuntime
IDENTITY: IdentityAuthority
VERIFICATION: EvidenceAuthority / appropriate independent verifier
EXECUTION AUTHORIZATION: authorizeWorkOrder
PROJECTION: Mission Control
THIS TASK MAY NOT CREATE: MissionAuthority / EventAuthority / MarketingStore / AgentMemory / parallel approval store

Five seconds of reading prevents two hours of architecture proliferation.

## Context should expand progressively

Don't stuff everything into the initial prompt. Use:
- L0 — ROUTE CARD: ~10-20 lines, job / boundary / success / stop
- L1 — WORKING BRIEF: relevant facts, files, invariants, tests
- L2 — EVIDENCE PACK: specific supporting source excerpts
- L3 — ARCHAEOLOGY: history / alternate implementations / superseded branches
- L4 — FULL CORPUS: only on explicit need

Agents start at L0/L1. This also helps storage and token concerns. Most agents do not need a 200 KB constitutional briefing to modify 67 lines.

## Context selection itself should become deterministic

Given mission, executor capabilities, semantic owner, files affected, event types, correlation chain, derive the context package. Not "AI, decide what files you probably need." But:

- mission_type → required contracts
- semantic_owner → owner implementation + tests
- event_types → registry + producer + consumer
- affected capability → capability contract
- known failure → failure evidence
- writer → commit law
- external effect → authorization + UNKNOWN/HOLD law

Then let a model supplement context only when deterministic retrieval is insufficient. That is exactly the larger strategy: MODEL-REQUIRED → MODEL-ASSISTED → DETERMINISTIC DEFAULT + MODEL ESCALATION. Apply it to agent orchestration itself.

## Readability needs a losslessness test

A pretty brief can be dangerously incomplete. The compiler needs an invariant:

```
canonical mission
       ↓
brief compiler
       ↓
executor brief
REQUIRED SEMANTICS LOST = 0
```

Test required fields such as: tenant, principal, capability, semantic owner, mutation scope, authorization state, effect boundary, evidence requirement, success condition, stop condition, correlation_id, causation_id.

If a field relevant to that mission class cannot be represented in the brief: DO NOT ROUTE. Readability can remove irrelevant information. It cannot remove safety-critical semantics.

## Give the executor a contradiction section

Every intelligent brief should have CONTRADICTIONS / UNRESOLVED:

A says X.
B says Y.

Do not reconcile silently.

Required action: determine which observation applies to the reached runtime, or return UNKNOWN.

This would have been extremely useful throughout the source/worktree/deployed-runtime divergence. The audit warns that Pig worktree mechanisms and deployed Oracle state are separate questions and that some registered worker behavior still needs re-verification. That is exactly the kind of caveat agents tend to lose when context is summarized. Don't bury it. Route it.

## Add explicit anti-goals

Anti-goals are often more valuable than another paragraph of architecture. For example:

DO NOT:
- create another authority
- create another durable store
- introduce another event writer
- invent truth to make projection complete
- interpret UNKNOWN as FAILED
- promote learning into authorization
- treat result integrity as effect verification
- silently reconcile conflicting sources
- broaden scope because nearby code is ugly

These should be selected by mission class rather than pasted universally.

## MarketingOS particularly benefits from this

The seven Growth OS engines should not become seven giant agent personas. They should become readable mission contracts over PING. For example:

```
INTELLIGENCE_RESEARCH
OBJECTIVE: Determine whether Jev/Typesafe supports a technically defensible video.
QUESTIONS: [...]
CLAIMS_TO_VERIFY: [...]
EVIDENCE REQUIREMENTS: primary docs preferred; live behavior > docs > marketing prose
OUTPUT: claim / verdict / support_set / evidence_grade / unknowns / contradictions / next_questions
MAY: observe / research / propose
MAY NOT: publish / spend / promote itself to truth / silently create playbook policy
```

That fits the actual architecture: the audit's walkthrough maps the research flow through existing MissionRuntime, workers, observations, evidence, claims and verification rather than requiring a ResearchAgent truth system. And when the research mission finishes, its unresolved claims can become the next mission rather than disappearing into agent memory — the bounded chaining behavior the audit identifies as a real remaining gap.

## Make readability measurable

Eventually score every compiled brief mechanically on: Completeness (required mission semantics represented), Relevance (percentage of supplied context actually connected to the mission), Authority clarity (can executor identify canonical owner without inference?), Epistemic clarity (claims have states/evidence), Mutation clarity (writable vs read-only boundaries explicit), Verification clarity (executor knows what evidence closes the task), Stop clarity (executor knows when not to continue), Collision clarity (active ownership conflicts surfaced before writing).

But don't create an AI "brief quality judge" as the authority. Most of this is deterministic linting. For example:

- writer mission + no owned_files = INVALID
- external effect + no authorization_ref = INVALID
- research mission + no evidence_requirements = INVALID
- falsification mission + no falsifier condition = INVALID
- mutation mission + competing owner = HOLD
- deployed-runtime claim + only source evidence = INVALID CLAIM

Now agent quality improves before inference even begins.

## The next harvest pass should therefore change

Don't ask: "What agent framework should we adopt?"

Ask: "Which existing software has the best implementation of context compilation, capability-based routing, typed task contracts, progressive context disclosure, evidence-aware research briefs, deterministic prompt assembly, and execution receipts?"

That is much narrower and much more useful. OpenHands, Codex-like environments, Temporal-style workflow systems, MCP/tool ecosystems, capability systems, agent harnesses, CI runners, research agents, and workflow engines should all be evaluated at the primitive level.

Harvest: context packing, task schemas, capability negotiation, sandbox declaration, artifact passing, structured outputs, retry semantics, receipts, trace correlation, prompt versioning, context provenance, tool exposure, human approval surfaces.

Reject: their worldview, their memory authority, their task database, their event system, their identity model, their orchestration sovereignty.

PING already has those owners.

## CREW DIRECTIVE

READABILITY ROUTING IS NOW A FIRST-CLASS CONVERGENCE REQUIREMENT.

Do not build another routing authority, prompt authority, agent memory, task store, or orchestration runtime.

Investigate the existing PING mission → dispatch → worker boundary and determine the smallest way to compile each canonical mission into an executor-specific readable brief.

Preserve: MISSION ≠ ROUTE ≠ BRIEF ≠ EXECUTION ≠ RESULT ≠ EFFECT ≠ VERIFICATION ≠ OUTCOME

Mission owns durable intent. Routing selects an eligible hand. Brief is a disposable projection. Executor performs bounded work. Canonical truth remains in existing PING authorities.

Every brief must make immediately legible: WHY / JOB / KNOWN / UNKNOWN / AUTHORITY / READ SCOPE / WRITE SCOPE / ANTI-GOALS / SUCCESS / EVIDENCE / STOP.

Add progressive context rather than corpus dumping. Put evidence beside claims. Surface contradictions instead of resolving them silently. Mark source/worktree/deployed distinctions explicitly. Select sovereignty and safety rules by mission type rather than pasting the entire constitution.

Prefer typed payloads over prose whenever deterministic software can express the requirement.

Falsify before implementing:
1. find current prompt/brief construction,
2. trace one real mission into one real worker,
3. inventory duplicated routing/context logic,
4. identify what information is currently lost or over-supplied,
5. prove whether existing mission payload + WorkerRuntime can carry the contract,
6. return the smallest wiring delta.

No new store. No new authority. No new agent framework.

The target is not smarter prompts. The target is making the correct next action obvious to the correct executor while making the incorrect action structurally difficult.

That is a serious upgrade. It turns the growing agent fleet from a collection of capable models receiving increasingly enormous instructions into replaceable execution targets receiving precise projections of canonical PING intent.

And it fits the harvest result almost perfectly: the system's durable compounder is already concentrated in ping_events, ping_missions, knowledge graph state, and semantic projections; the report explicitly concludes the missing MarketingOS pieces don't justify another authority or store.

Note on FYD: remote FYD remains unverified from the canonical GitHub check; do not infer its current routing implementation.
Note on PING remote: the connected GitHub remote is still only exposing the initial public commit; the much newer Pig-side machinery in the audit is local/reported evidence, not remote-deployed truth.

---

## BINDING CLARIFICATION (2026-09-30 ~18:32 MDT, Nolan)

DO NOT OPTIMIZE FOR HUMAN READABILITY. Optimize ONLY for AGENT ROUTING AND UNDERSTANDING.

The readability compiler's output is a machine-targeted projection, not a document for humans to skim. A brief is well-formed when the correct next action is obvious to the correct executor class and the incorrect action is structurally difficult, regardless of whether a human finds it pretty. Prefer typed payloads over prose wherever the executor can consume them; a deterministic worker should get a typed payload, not a nicely formatted markdown brief. Human legibility is incidental, never the optimization target.

---

## Filing note (Pigi)

Filed from the "Fix FYD oval rotation and shapes" side chat on 2026-09-30 ~18:31 MDT. Steered into the active INTELLIGENCE_RESEARCH P0 coordinator as binding requirements for the worker/mission contract work (mission contract shapes, epistemic headers, contradiction sections, evidence adjacency, sovereignty map, progressive context, losslessness, bounded chaining of unresolved claims, capability-based routing, falsify-before-implement steps). No new authority, store, or framework may be built for this.
