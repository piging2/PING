# CEO ORDER: PLAN THE NEXT 600 HOURS AS SIX 100-HOUR DELIVERABLES (2026-09-30 ~18:46 MDT, Nolan, binding)

PLAN NOW. DO NOT EXECUTE YET.

## Governing architecture

WE ARE NOT PLANNING SIX ISLANDS. WE ARE PLANNING SIX VERTICALS OVER ONE PING SEMANTIC / CONTROL PLANE.

PING OWNS MEANING. RENT COMMODITY MACHINERY. WRAP PROTOCOLS. ISOLATE EXPERIMENTS.

- PING owns meaning/control; commodity acquisition, rendering, search, protocols, and deployment are rented or wrapped.
- The same governed semantic state can later project to human HTML, agent Markdown/JSON, MCP/WebMCP, social protocols, search, mobile, and other surfaces.
- Readability is separated from actuation: an agent being able to read an object must never imply permission to act on it.
- The readability-routing work belongs inside this plan, not as a seventh sprint. Its core insight: HTML, Markdown, structured JSON, MCP/WebMCP tools, search documents, and social representations are all projections from governed semantic state, not independent representations of truth.

At the end of these sprints, PING must prove one coherent system:

```
SOURCE / HUMAN INTENT
↓
OBSERVATION
↓
EVIDENCE
↓
OBJECTS + RELATIONSHIPS
↓
MISSION / PLAN
↓
ROUTING
↓
EXECUTION
↓
RESULT
↓
JUDGMENT
↓
AUTHORIZED EFFECT
↓
VERIFICATION
↓
OUTCOME
↓
LEARNING / NEXT ACTION
↓
MULTIPLE PROJECTIONS
```

The website, Mission Control, agents, JEV, TenantOS and tests are different views/executors/judges around this SAME lifecycle.

Do not let any sprint invent a parallel: identity authority, mission authority, event authority, capability authority, object authority, judgment authority, scheduler, event store, workflow engine, tenant model.

## Per-domain questions

### TenantOS: WHAT DOES IT MEAN FOR ONE TENANT TO OWN AND OPERATE PING SAFELY?

TenantOS establishes the actual tenant operating boundary. NOT another dashboard. NOT another object store. Plan around: tenant identity, tenant ownership, human decision authority, tenant-scoped objects, tenant-scoped capabilities, tenant-scoped missions, tenant-scoped agents, tenant-scoped private context, tenant-scoped projections, tenant-scoped evidence, tenant-scoped secrets/references, tenant policy, resource/quota boundaries.

FIRST TASK: ARCHAEOLOGY. Find every current representation of: tenant_id, customer_id, owner, actor, workspace, organization, namespace, scope. Determine which are: canonical, projection, legacy, alias, accidental duplication. DO NOT MIGRATE UNTIL THIS IS KNOWN.

P0 PROOF: Two tenants exist. Same PING runtime. Tenant A cannot: read, search, project, execute, delegate, or retrieve private context belonging exclusively to Tenant B. Public objects remain publicly projectable according to visibility.

OWNER DECISION AUTHORITY: CG-001 must become machine-observable where appropriate. Define exactly: who can approve what, who can delegate, who can revoke, what defaults to tenant owner, what belongs to system/constitutional authority.

CAPABILITY TEST MATRIX: Can owner delegate site.read, site.propose_change, mission.create, agent.execute with restrictions on tenant, object, action, expiration, provider, resource/site, and revoke it? TEST EXISTING CAPABILITY SYSTEM FIRST. Do not invent attenuation machinery until a concrete test fails.

100-HOUR EXIT: A tenant can own an identity/object graph, operate agents against it, delegate bounded capabilities, maintain private context, and prove cross-tenant isolation.

### Mission Control: CAN A HUMAN SEE AND CONTROL WHAT THEIR PING IDENTITY IS DOING?

Mission Control is THE IDENTITY-OWNED OPERATING SURFACE. It is NOT the authority itself. Wire the real system. No mock Mission Control.

Required chain: IDENTITY → MISSION → PLAN → ROUTE → EXECUTION → RESULT → JUDGMENT → EFFECT → VERIFICATION → OUTCOME.

The current intelligence convergence discovered a concrete break: SUCCESSFUL WORKER FINDINGS ARE DROPPED BY THE SCHEDULER RESULT PERSISTENCE SEAM. THAT IS P0. Implement the already-specified smallest delta: typed research contract, deterministic stateless route compiler, losslessness gate, finding-set persistence by digest/reference, extended plan validator, typed executor briefs. DO NOT replace the canonical dispatcher. DO NOT create a second routing authority. FIX TRACE TENANT PROJECTION. Payload carrying tenant while trace displays UNKNOWN is unacceptable.

MISSION CONTROL MUST SHOW: mission, plan, selected worker, why routed, execution, findings/results, judgment, proposed effect, approval requirement, verification, outcome, evidence/history.

HUMAN UX: LOW CONSEQUENCE: fast action / undo. MEDIUM: preview / confirm. HIGH: explicit approval. Do not make safe operation bureaucratic.

100-HOUR EXIT: A real user can create a mission, watch it route and execute, inspect its findings, understand JEV judgment, approve an effect when required, and see verification/outcome without reading logs or database tables.

### ORCA: CAN PING TURN A MISSION INTO USEFUL BOUNDED INTELLIGENCE WITHOUT FABRICATING WORK?

ORCA becomes an intelligence/execution participant. NOT the authority. NOT the scheduler. NOT the event store.

Current proof already established: real GitHub HTTPS acquisition, SSRF defenses, SHA-256 source digests, observations, claims, contradiction detection, 23-event correlated cascade, stale mission fail-closed. GOOD. BUILD FROM THAT.

ORCA P0 starts AFTER Mission Control seam preserves finding sets.

ORCA LOOP: TYPED BRIEF → ACQUIRE → OBSERVE → ANALYZE → FINDINGS → CLAIMS → UNCERTAINTY → NEXT-ACTION PROPOSAL.

NO AUTONOMOUS CANONICAL TRUTH. NO FABRICATED RESEARCH. NO "I searched" WITHOUT ACQUISITION EVIDENCE.

ROUTING: Replace token-name theater only where the actual capability vocabulary has been established. Define a small typed worker vocabulary from REAL executors. Example classes: RESEARCH, CODE, BROWSER, DATA, REASONING, DOCUMENT, but let archaeology determine actual names. Brief schemas must be machine-complete. Human prettiness is secondary.

PERSIST: finding set digest/reference, source digests, observations, claims, uncertainty, contradictions, executor/version, correlation/run identity.

100-HOUR EXIT: A mission can cause ORCA to acquire real evidence, generate a persisted finding set, identify unresolved/contradictory claims, propose bounded next work, and hand that work back through the canonical mission system.

### Website building: CAN FYD TURN EXISTING DIGITAL REALITY INTO A TRUSTED, EDITABLE, INTELLIGENT PRESENCE?

DO NOT BUILD WIX. BUILD THE COMPILER.

CURRENT VERIFIED FRONTIER: URL → structured extraction → evidence → objects → relationships → SiteSpec → renderer → browser.

Continue: BROWSER → ASK FYD → EVIDENCE → OWNER CORRECTION → CONVERSATIONAL CUSTOMIZATION → REGENERATION → SOURCE CHANGE → SAFE REGENERATION.

- P0: Ask FYD gold set. Visitor asks: What does this business do? What services? Where? Who works here? How do you know? Unsupported answer: UNKNOWN. No plausible filler.
- P1: WHY THIS? Quiet provenance affordance.
- P2: CONFIRM / CORRECT / HIDE.
- P3: "Move emergency services first." Typed SiteSpec patch.
- P4: Second observation. Source change must not destroy owner correction/customization.
- P5: READABILITY PROOF. From SAME object graph produce: HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, AVAILABLE_CAPABILITIES. Do not scrape our HTML back into Markdown. Measure: correctness, evidence correctness, tokens, latency, unsupported claims, tool selection.

The attached design correctly treats HTML, Markdown, MCP, WebMCP, JSON-LD and social protocols as projections rather than new truth stores. Keep that invariant.

100-HOUR EXIT: Paste URL → trusted generated presence → Ask FYD → evidence → correction → conversational change → regeneration, with both human and agent representations generated from the same semantic state.

### JEV: HOW DOES PING JUDGE WHETHER A RESULT IS GOOD ENOUGH TO BECOME ACTION?

JEV is the JUDGMENT PLANE. Not execution. Not mission authority. Not canonical event authority.

Build around the distinctions: FACTUALITY, RELEVANCE, COMPLETENESS, POLICY, SAFETY, EVIDENCE QUALITY, CONTRADICTION, UNCERTAINTY, ACTIONABILITY.

First: BASELINE. Then JEV shadow evaluation. Do NOT let JEV silently change production routing until its judgments beat the baseline on a defined gold set. Use the Ask FYD gold set immediately because it gives JEV real product work: question, expected supported facts, required evidence, unsupported-claim traps, expected refusal where appropriate.

JEV output should be typed. Conceptually: verdict, dimensions, evidence_refs, failures, uncertainty, recommended_disposition. Do not collapse everything to one magic score. JEV may say: SUPPORTED, PARTIALLY_SUPPORTED, CONTRADICTED, INSUFFICIENT_EVIDENCE, POLICY_BLOCKED, UNCLEAR. Do not canonize these exact labels until the current JEV taxonomy is archaeologized.

SHADOW FIRST. Compare: BASELINE vs JEV. Measure: unsupported claims, correct refusals, evidence correctness, useful-answer rate, false blocks, latency, cost.

100-HOUR EXIT: JEV can independently judge real FYD/ORCA outputs, explain the judgment with evidence, run in shadow without controlling production, and demonstrate measurable value before receiving routing/effect authority.

### Tests: CAN WE FALSIFY THE SYSTEM AT ITS SEMANTIC OWNERS?

DO NOT CREATE A TEST REPOSITORY. TEST THE ACTUAL OWNERS.

Test seams: SOURCE → OBSERVATION, OBSERVATION → EVIDENCE, EVIDENCE → OBJECT, OBJECT → PROJECTION, MISSION → ROUTE, ROUTE → EXECUTION, EXECUTION → RESULT, RESULT → JUDGMENT, JUDGMENT → EFFECT, EFFECT → VERIFICATION, VERIFICATION → OUTCOME.

Hostile classes: nondeterminism, tenant leakage, visibility bypass, capability bypass, lost finding sets, fabricated research, stale briefs, duplicate effects, partial success, UNKNOWN outcomes, replay divergence, source conflicts, prompt injection, malicious source URLs, unsupported factual claims, dirty-worktree contamination, restart/sleep interruption, credential leakage, provider failure, projection drift.

KEEP THE EXISTING CANONICAL TEST GATES. Every sprint adds tests around the semantic owner it changes. No giant test framework rewrite.

P0: resolve any current test-suite contradiction with: ONE SHA, ONE CLEAN WORKTREE, ONE COMMAND, ONE ENVIRONMENT CONTRACT, ONE EXIT CODE.

100-HOUR EXIT: The six program domains have reproducible gates that attack their actual invariants, and the integrated golden path survives hostile tests.

## Seventh deliverable: the integrated proof

THIS IS THE SEVENTH DELIVERABLE. It is not another 100-hour silo. Every sprint contributes to it.

Build ONE integrated proof:

```
TENANT OWNER
↓
MISSION CONTROL
↓
MISSION
↓
ROUTER
↓
ORCA
↓
FINDING SET
↓
JEV
↓
PROPOSAL
↓
OWNER APPROVAL
↓
FYD OBJECT/SITE EFFECT
↓
VERIFICATION
↓
OUTCOME
↓
MISSION CONTROL
```

Concrete scenario: Owner asks: "Research whether my site accurately represents my current commercial services and propose improvements."

ORCA: acquires authorized sources, produces evidence/findings. JEV: judges supported vs unsupported changes. FYD: produces SiteSpec proposal. Mission Control: shows the proposal and evidence. Owner: approves. PING: records governed transition. FYD: regenerates. Verification: checks rendered result. Outcome: appears in Mission Control.

THAT SINGLE FLOW SHOULD TOUCH ALL SIX SPRINTS.

## Phasing

DO NOT SIMPLY RUN ALL SIX AT ONCE.

PHASE A — CONTRACT FREEZE / ARCHAEOLOGY. TenantOS, Mission Control, ORCA, JEV, FYD, Tests all identify EXISTING semantic owners first. Output: one dependency map, one writer map, one contract map. Highest priority: 1. Finding-set persistence. 2. Typed research contract. 3. Route compiler / losslessness gate. 4. Tenant trace propagation. 5. Capability vocabulary archaeology. 6. Integrated test harness around these seams.

WHY? ORCA and JEV cannot become real if Mission Control loses the worker result.

Once central contracts hold:

- TRACK 1: TenantOS isolation/capabilities.
- TRACK 2: Mission Control + ORCA.
- TRACK 3: FYD + Ask FYD.
- TRACK 4: JEV shadow evaluation.
- TRACK 5: Hostile tests continuously attack all tracks.

Stop adding features. Run the master scenario. Every broken seam becomes the queue. First broken seam wins.

## Mutation ownership

Before implementation assign exactly one mutation owner for: tenant contract, mission contract, route contract, brief contract, result/finding contract, judgment contract, capability contract, SiteSpec contract, event transition contract, verification/outcome contract.

Other lanes may READ and PROPOSE. One writer merges contract changes.

THIS PREVENTS SIX SPRINTS FROM MUTATING SHARED SEMANTICS SIMULTANEOUSLY.

## Harvest posture

KEEP HARVESTING. BUT DO NOT LET HARVEST BECOME THE PRODUCT.

Every finding gets classified: OWN / RENT / WRAP / ISOLATE / REJECT.

- OWN only what compounds: identity semantics, evidence semantics, object/relationship semantics, owner intent, visibility, capability binding, authorization, judgment semantics, governed transitions, outcome history, routing policy.
- RENT: browser, crawler, Markdown conversion, document parsing, search engine, UI primitives, container runtime.
- WRAP: MCP, WebMCP, ActivityPub, ATProto, Nostr, external model providers.
- ISOLATE: experimental protocols, new agent-browser standards, unproven stores, novel security primitives.

We do not know which future distribution surface wins, so preserve the semantic asset underneath them all.

## Per-plan template (each 100-hour domain plan must contain)

Divide the 100 hours approximately into: 0-10: ARCHAEOLOGY + FALSIFICATION. 10-20: CONTRACT + ACCEPTANCE TEST FREEZE. 20-60: IMPLEMENT HIGHEST-LEVERAGE WIRING. 60-80: INTEGRATION WITH ADJACENT DOMAINS. 80-95: HOSTILE TEST / REPLAY / FAILURE RECOVERY. 95-100: DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF. These are planning budgets, not mandatory time accounting. FIRST BROKEN EDGE OVERRIDES THE SCHEDULE.

Each plan states: PRODUCT ARROW, CURRENT VERIFIED STATE, FIRST BROKEN EDGE, SEMANTIC OWNER, MUTATION OWNER, INPUT CONTRACT, OUTPUT CONTRACT, DEPENDENCIES, HARVEST CANDIDATES, OWN / RENT / WRAP / ISOLATE DECISIONS, P0 / P1 / P2, EXPLICIT NON-GOALS, ACCEPTANCE TESTS, HOSTILE TESTS, REPLAY/RECOVERY TEST, OBSERVABILITY, DEMO, ROLLBACK, DELETE/FREEZE LIST, DEPENDENCIES ON OTHER FIVE SPRINTS.

Good: "worker finding set survives scheduler persistence and can be consumed losslessly by JEV and Mission Control." Bad: "create 12 modules."
Good: "Tenant A cannot resolve Tenant B's private object even through search, agent context or projection." Bad: "build tenant dashboard."
Good: "JEV catches unsupported Ask FYD claims in shadow while baseline remains production authority." Bad: "integrate JEV."
Good: "stale brief fails closed; real source acquisition produces persisted, traceable findings." Bad: "build ORCA loop."

## Program end state

At the end I do NOT want six impressive subsystems. I want one coherent PING:

- TENANT owns IDENTITY + OBJECT GRAPH
- MISSION CONTROL operates MISSIONS
- ORCA executes BOUNDED INTELLIGENCE
- JEV judges RESULTS
- FYD projects THE SEMANTIC WORLD
- TESTS falsify THE ENTIRE CHAIN

And all of it shares: IDENTITY, EVIDENCE, OBJECTS, RELATIONSHIPS, CAPABILITIES, AUTHORIZATION, EVENT HISTORY, OUTCOMES.

PLAN THAT SYSTEM. NOT SIX PRODUCTS. GO.

## Two architecture calls locked now (2026-09-30 ~18:46 MDT, Nolan)

1. Finding-set persistence is the immediate shared dependency. Until that seam is lossless, ORCA chaining, JEV judgment, Mission Control inspection, and evidence-driven follow-up are all partly fictional. It sits above UI work in the Mission Control/ORCA plans.
2. JEV does not become another authority prematurely. It starts as a typed shadow judgment plane. Baseline behavior remains authoritative while JEV is measured against real ORCA findings and the Ask FYD gold set. Only a later convergence decision grants it more influence, once it demonstrates fewer unsupported claims and better evidence judgments without unacceptable false blocks.

## Filing note (Pigi)

Filed verbatim from Nolan's 2026-09-30 ~18:46 MDT message. The previously delivered six plans (the right decomposition) are now being revised under this master directive: six verticals over one shared contract spine, plus the seventh integrated-proof deliverable.
