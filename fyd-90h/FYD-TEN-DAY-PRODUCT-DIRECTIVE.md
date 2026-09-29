# FYD — TEN-DAY PRODUCT DIRECTIVE

Issued by Nolan Geske, 2026-09-29. Verbatim program text. This file is the
standing program frame; the binding correction loop remains:

product arrow → missing invariant → harvest → smallest integration → proof.

CRX remains a mine, not a dependency.

---

## Program thesis

Every FYD tenant gets an evidence-grounded autonomous marketer that
understands the business, maintains its presence, proposes and executes
bounded marketing work, learns from verified outcomes, and can expand onto
new channels without changing FYD's canonical model.

## Ecosystem reinforcement (pasted research notes)

The ecosystem search reinforces several choices. Talos demonstrates
exact-argument, one-shot authorization with deterministic ALLOW /
NEEDS_HUMAN / DENY before execution. GitHub POLYROB demonstrates durable
goals, atomic claims, quotas, self-wake, narrowed subagents and owner-gated
skills. GitHub AgentArk demonstrates learning from accepted work/corrections
while proposing rather than silently applying changes to prompts/routing/
memory. GitHub Current MCP gives us a stateless interoperability boundary
plus durable task handles with per-request authorization rather than a reason
to make MCP canonical state. Model Context Protocol Blog OpenTelemetry's
current GenAI conventions give us a standard observability seam instead of
inventing agent telemetry. And Crawl4AI's current release has adaptive
crawling, resumable deep crawling and URL discovery — exactly the kind of
commodity acquisition machinery FYD should benchmark/harvest instead of
handwriting.

## Architectural adjustment (binding)

Do not literally run a permanent autonomous agent process for every tenant.
Give every tenant a durable autonomous-marketer identity/state/policy, and
dispatch interchangeable workers when triggers make work eligible. That
preserves the product promise while avoiding thousands of idle model sessions
and gives you model/provider optionality from day one.

Do not adopt a heavyweight durable-workflow platform during these ten days
unless the existing PING scheduler demonstrably fails the required
lifecycle. Temporal validates the durability pattern — long-lived state,
human intervention, retries — but that is evidence for the invariant, not
automatically evidence that FYD should add Temporal. Similarly, OpenAI's
current Agents SDK is explicitly designed so the application can retain
ownership of deployment, storage, tools and approval decisions; that
supports keeping FYD as authority and models as workers, rather than moving
tenant truth into an agent framework.

The strongest moat remains the thing already begun proving: one
evidence-backed business representation compiling into multiple products.
Website + Ask FYD is target one and two. Autonomous marketer is target
three. If the same owner-governed graph can drive all three without
duplicating truth, the architectural optionality stops being a thesis and
becomes demonstrated product leverage.

---

## THE ORDER

FOR THE NEXT TEN DAYS:

DO NOT BUILD AN AGENT FRAMEWORK.
DO NOT CONVERGE DORMANT RUNTIMES.
DO NOT MAKE CRX OPERATIONAL.
DO NOT BUILD PROTOCOLS BECAUSE THEY ARE INTERESTING.

BUILD THE FIRST FYD TENANT THAT CAN TRUTHFULLY SAY:

MY BUSINESS HAS AN AUTONOMOUS MARKETER.

Not a chatbot.
Not an AI copywriter.
Not a website generator.
Not an automation script.

An owner-governed system that:

UNDERSTANDS
→ PROPOSES
→ ACTS
→ MEASURES
→ LEARNS
→ IMPROVES

while remaining grounded in evidence and owner authority.

Every tenant gets:

```
TENANT
├── OBJECT GRAPH
├── EVIDENCE GRAPH
├── OWNER INTENT
├── FYD PRESENCE
├── AUDIENCE / RELATIONSHIP GRAPH
├── AUTONOMOUS MARKETER
├── CAPABILITIES
├── CAMPAIGNS
├── TASKS
├── PROPOSALS
├── APPROVAL POLICY
├── OUTCOMES
└── LEARNING
```

The marketer does NOT own canonical truth.
The marketer operates on tenant truth.
That distinction is constitutional.

```
PUBLIC / AUTHORIZED SOURCES
↓
OBSERVATIONS
↓
EVIDENCE
↓
OBJECT GRAPH
↓
OWNER CORRECTIONS
↓
TENANT TRUTH
↓
MARKETING OBJECTIVE
↓
PLAN
↓
BOUNDED ACTIONS
↓
CHANNEL ADAPTERS
↓
OBSERVED OUTCOMES
↓
EVIDENCE
↓
LEARNING
↓
BETTER NEXT ACTION.
```

THIS is the ten-day architecture.
Everything must strengthen this loop.
Keep this mentally simple.

1. TRUTH PLANE
What do we know?
Observation
Evidence
Object
Relationship
Owner decision
Outcome.

2. DECISION PLANE
What should happen?
Objective
Opportunity
Campaign
Plan
Proposal
Experiment.

3. EFFECT PLANE
What may actually happen?
Capability
Authorization
Task
Execution
Receipt
Verification.

Do not let these collapse together.
A model believing something does not make it true.
A model recommending something does not authorize it.
A tool returning success does not prove the effect occurred.

One conceptual marketer per tenant.
DO NOT instantiate an expensive always-running model process per tenant.
The tenant marketer is durable PRODUCT STATE.
Workers/models are interchangeable execution resources.

Conceptually:

```
TenantMarketer {
  tenant_id
  objectives
  policy
  budget
  capabilities
  active_campaigns
  audience_state
  learning_state
  health
}
```

Then:

```
FYD SCHEDULER / TRIGGER
↓
eligible tenant marketer
↓
bounded task
↓
best available worker/model
↓
proposal/action
↓
policy/capability gate
↓
effect
↓
receipt
↓
outcome.
```

TENANT MARKETER ≠ MODEL SESSION.
This is essential for scale.

## Close the existing arrow first

WHY THIS
→ OWNER CORRECTION
→ DURABLE OWNER INTENT
→ REGENERATION
→ OWNER INTENT SURVIVES.

This remains P0.

Prove:
- owner corrects fact
- owner hides fact
- owner explicitly publishes address
- owner changes section priority
- regeneration occurs
- source is re-observed
- owner intent survives.

Define precedence explicitly. Candidate:

```
LEGAL/SAFETY CONSTRAINT
  >
EXPLICIT OWNER DECISION
  >
VERIFIED FIRST-PARTY CLAIM
  >
DIRECT SOURCE EVIDENCE
  >
DERIVED FACT
  >
MODEL INFERENCE.
```

Do not constitutionalize this exact ordering until tests prove it.
But make the distinction explicit.
The pipeline must NEVER silently overwrite owner intent with a fresh crawl.

DELIVERABLE: one tenant where correction survives full regeneration.

## Smallest product contract

Create the smallest product contract.
Do NOT build MarketerAuthority.
Do NOT build another event bus.
Do NOT build another workflow DSL.
Define the tenant marketer in existing FYD/PING semantics.

Minimum inputs:
- TENANT GRAPH
- OWNER OBJECTIVES
- OWNER POLICY
- AVAILABLE CAPABILITIES
- RECENT OUTCOMES
- CURRENT PRESENCE
- AUDIENCE/RELATIONSHIPS
- BUDGET/QUOTA
- TIME.

Minimum output: MarketingProposal.

Proposal must be structured. Example:

```
objective:
  increase_quote_requests
hypothesis:
  emergency-service visibility is low
evidence_refs:
  [...]
actions:
  - site_patch
  - publish_post
  - follow_up_existing_lead
expected_outcome:
  more qualified quote requests
risk:
  low
required_capabilities:
  [...]
approval:
  AUTO | OWNER_REQUIRED | DENIED
```

No prose blob as canonical proposal state.

## Action policy (harvest Talos semantics, do not import Talos architecture)

FYD action policy must return:

ALLOW
NEEDS_OWNER
DENY.

Authorization is bound to:
- TENANT
- ACTOR
- CAPABILITY
- ACTION TYPE
- TARGET
- ARGUMENT DIGEST
- EXPIRY
- BUDGET
- OPTIONAL CAMPAIGN.

The model NEVER chooses its own authority.

Suggested initial policy:

AUTO:
- analyze evidence
- search tenant graph
- generate draft
- generate SiteSpec proposal
- run internal experiment
- refresh public evidence
- classify audience
- calculate opportunity
- prepare campaign.

OWNER REQUIRED:
- publish externally
- send communication
- modify externally visible claims
- spend money
- connect provider
- increase campaign budget
- bulk relationship action.

DENY:
- cross-tenant access
- secret disclosure
- unsupported provider action
- private-data publication
- unbounded external action
- policy bypass.

Start conservative.
Then let owners widen standing permissions intentionally.

## Durable work (harvest POLYROB/Temporal/MCP task semantics; do NOT import three schedulers)

We need one durable work concept. Minimum lifecycle:

QUEUED
→ CLAIMED
→ RUNNING
→ INPUT_REQUIRED
→ SUCCEEDED
→ FAILED
→ UNKNOWN
→ RECONCILING
→ TERMINAL.

Required invariants:
- atomic claim
- lease
- attempt number
- idempotency key
- tenant scope
- capability scope
- budget
- deadline
- resume
- cancel
- receipt
- outcome reference.

Machine sleep, process death, model timeout or worker replacement MUST NOT
erase the objective.

UNKNOWN is first-class.
If an external call times out after dispatch:
DO NOT RETRY BLINDLY.
Reconcile whether the effect happened.

## Plain-English marketing

Now unlock plain-English marketing. User says:

"Get me more commercial plumbing work."
or:
"Promote emergency plumbing this week."
or eventually:
"Find which of my contacts are already on FYD."

Compile:

```
NATURAL LANGUAGE
↓
OBJECTIVE
↓
CONSTRAINTS
↓
AUDIENCE
↓
CHANNEL OPTIONS
↓
ACTION GRAPH
↓
BUDGET
↓
APPROVAL PLAN
↓
CAMPAIGN SPEC.
```

Do not execute prose directly.
CampaignSpec must be deterministic after compilation. Example semantics:
- goal
- success_metric
- audience_query
- eligible_channels
- actions
- frequency
- budget
- start/end
- approval_policy
- stop_conditions
- experiment_variants.

Model handles ambiguity.
Software handles execution.

Do NOT start with Facebook automation.
Use FYD-owned surfaces first.

Example campaign — OBJECTIVE: increase emergency-service discovery.
Marketer:
1. inspects graph
2. finds evidence-backed emergency service
3. discovers it is poorly surfaced
4. proposes SiteSpec change
5. creates evidence-backed post
6. proposes CTA
7. owner approves consequential publication
8. renderer updates
9. interaction events measured.

This proves autonomous marketing without external API dependency.

Then run a second tenant through the SAME mechanism.
NO CUSTOMER-SPECIFIC CODE.

## External channels (only after the owned-surface proof)

Only now generalize external channels.
Canonical campaign intent MUST NOT know Facebook/X/ATProto implementation
details.

Define conceptual interface:
- discoverCapabilities()
- observe()
- prepareAction()
- authorize()
- execute()
- verify()
- reconcile().

Every provider reports actual capability. Example:

```
Facebook:
  READ_PROFILE
  READ_POSTS
  PUBLISH_POST = unsupported for current grant
  FOLLOW = unsupported
  LIKE = unsupported.
FYD:
  PUBLISH
  FOLLOW
  REFERENCE
  ASK
  CONTACT
  = native.
Newsletter provider:
  SUBSCRIBE
  SEND_CAMPAIGN
  READ_DELIVERY
  READ_CLICK.
```

Do not fake unsupported capabilities.
Do not browser-automate around provider restrictions.

This is where FYD starts becoming difficult to copy.

## Outcome measurement

Every consequential action should eventually connect:

WHY → WHAT → AUTHORITY → EFFECT → OUTCOME.

Examples:
- SiteSpec change → service views +34%
- post → 17 object opens
- CTA change → 3 quote requests
- follow → reciprocal relationship
- email → delivered/opened/clicked/replied.

Never let the marketer learn from its own assertion that something worked.
Outcome must come from observable evidence.

Maintain PROPOSED / EXECUTED / VERIFIED EFFECT / OBSERVED OUTCOME as
different states.

## Learning (harvest AgentArk semantics)

Learning is:

OUTCOME + OWNER FEEDBACK + CORRECTION + REPEATED SUCCESS/FAILURE
→ PROPOSED LEARNING.

Not: MODEL REWRITES ITSELF.

Learning candidates:
- audience preference
- channel preference
- successful CTA pattern
- service priority
- timing
- tone
- campaign template
- tool route
- model route
- crawl recipe.

Each candidate has:
- evidence
- scope
- confidence
- owner
- version
- evaluation
- rollback.

High-consequence policy changes require approval.
Low-risk optimization may eventually canary automatically.
NO SILENT SELF-MODIFICATION OF AUTHORITY.

## Two-tenant proof

Run TWO tenants. Each must independently:

1. ingest real business source
2. build evidence
3. build object graph
4. generate presence
5. accept owner correction
6. survive regeneration
7. receive marketing objective
8. create campaign
9. identify opportunity
10. propose actions
11. automatically execute allowed internal actions
12. request approval for consequential action
13. execute approved action
14. verify effect
15. observe outcome
16. update learning state
17. explain:
    - WHAT DID YOU DO?
    - WHY?
    - WHAT EVIDENCE DID YOU USE?
    - WHO AUTHORIZED IT?
    - WHAT HAPPENED?
    - WHAT DID YOU LEARN?

If those questions cannot be answered: the autonomous marketer is not done.

## Harvest discipline

Run read-only harvest continuously but cap writer time.

SEARCH: PING → CRX → git history → CascadeProjects → existing dependencies
BEFORE EXTERNAL. Then external parts bins.

TALOS — Harvest: exact-action authorization; target derivation; ALLOW /
NEEDS_HUMAN / DENY; one-shot grant; TOCTOU verification; execution receipt;
autonomy can tighten but not bypass policy.

POLYROB — Harvest: durable goal board; atomic claim; circuit breaker; quota;
self-wake; least-privilege delegation; owner messaging controls; skill
quarantine.

AGENTARK — Harvest: accepted-outcome learning; correction learning;
candidate promotion; benchmark/canary/rollback; secret isolation; sandbox
boundary.

OPENHANDS — Harvest: execution-environment isolation; worker/backend
separation; headless worker patterns.

MCP 2026-07-28 — Harvest: stateless external tool boundary; self-describing
requests; authorization seam; Tasks lifecycle; cancel/update/get semantics;
cacheable deterministic capability catalogs. MCP IS AN ADAPTER. NOT CANONICAL
TRUTH.

OPENTELEMETRY GENAI — Harvest telemetry naming. Do not invent agent
observability vocabulary unnecessarily. Trace: campaign_id, tenant_id,
task_id, agent/worker, model, tool, latency, tokens, cost, result, error,
approval wait, effect verification. DO NOT LOG SECRETS OR PRIVATE PROMPT
CONTENT BY DEFAULT.

CRAWL4AI — Benchmark only where acquisition needs it. Harvest: adaptive
stop; resume; URL seeding; deep crawl; structured extraction; browser
escalation. Do not replace the proven proceduralizer merely because Crawl4AI
has more features.

## Compute discipline

Every tenant gets a generous intelligence quota. BUT:

INTELLIGENCE IS NOT THE DEFAULT COMPUTE PATH.

Use deterministic software for:
hashing, identity, matching exact identifiers, schema extraction,
relationship traversal, filtering, permissions, quotas, scheduling, dedupe,
idempotency, rendering, campaign execution, measurement.

Use intelligence for:
ambiguity, entity resolution, summarization, creative generation, planning,
audience hypotheses, campaign hypotheses, semantic comparison, failure
diagnosis.

CACHE LEARNED SOLUTIONS.
If intelligence discovers a repeatable deterministic procedure: promote it
into a tested recipe. Do not pay the model forever.

## Tenant scoping

Every marketer is tenant-scoped.
Required on every durable record: tenant_id.
Required on every effect: tenant, actor, capability, target, campaign/task,
authorization.
No worker receives another tenant's private context unless an explicit
cross-tenant product primitive someday exists.
Public observations may be shared through a public evidence/index layer.
Private tenant knowledge may not.

Do not create "2,000 friends" as an untyped blob.
Audience is a graph query. Examples: existing FYD relationships,
owner-imported contacts, publicly resolved identities, newsletter
subscribers, site visitors where consent permits, customers, leads, past
interactions.

Campaign asks: WHO IS ELIGIBLE?
Then deterministic filters apply: CONSENT, SUPPRESSION, CHANNEL CAPABILITY,
PRIOR ACTION, FREQUENCY CAP, TENANT POLICY, PROVIDER POLICY.
Only then may intelligence rank candidates.
This permanently prevents another stale-notes-caused outreach incident.

## Prose is not authority

PROSE IS NOT AUTHORITY.

Eventually one marketing intent may project across several channels. But do
not promise "follow everywhere" as one primitive. Instead:

RELATIONSHIP INTENT: FOLLOW ENTITY X

Then resolve available projections:
- FYD follow → available
- ActivityPub Follow → perhaps available
- ATProto follow → available with proper authorization
- newsletter → NOT semantically equivalent to follow
- Facebook follow → only if supported and authorized
- Nostr → protocol-specific relationship.

Never pretend different actions mean the same thing.
One intent may generate MULTIPLE explicit proposed actions.
The owner can understand exactly what will happen.

## Object graph compiler

Do not think: WEBSITE BUILDER.
Think: OBJECT GRAPH COMPILER.

Today: ObjectGraph → SiteSpec → Web UI.
Also: ObjectGraph → Ask FYD Context.
Next: ObjectGraph → CampaignSpec.
Later: ObjectGraph → ActivityPub; ObjectGraph → ATProto; ObjectGraph → MCP
resources/tools; ObjectGraph → Circle; ObjectGraph → mobile experience;
ObjectGraph → email.

This is why the shared graph matters.
THE GRAPH IS NOT JUST WEBSITE STORAGE.
IT IS THE INTERMEDIATE REPRESENTATION OF THE BUSINESS.

## Prohibited builds (this program)

No:
- MarketerAuthority
- CampaignAuthority
- AgentAuthority
- LearningAuthority
- SocialAuthority
- new event bus
- new graph DB
- new identity system
- generic agent OS
- universal workflow language
- constitutional-runtime convergence
- cross-runtime canonicalizer
- Oracle architecture project.

Use existing semantic owners.
Create a new primitive only when a reached arrow proves no existing owner
fits.

CRX remains: MINE, REFERENCE, PARTS BIN.
Not: DEPENDENCY, TARGET ARCHITECTURE, PROGRAM.

Read-only forensic lane may continue.
Every harvested CRX primitive must answer:
- CURRENT PRODUCT FAILURE:
- MISSING INVARIANT:
- CRX IMPLEMENTATION:
- PROOF IT IS BETTER:
- SMALLEST PORT:
- TEST:
- LOCAL OWNER:
Otherwise: REFERENCE.

## Autonomy gradient

Autonomy is earned by consequence. Not by tool.

Example:
- reading public evidence: AUTO
- regenerating a private preview: AUTO
- running deterministic analysis: AUTO
- changing an unpublished draft: AUTO
- publishing a low-risk owner-preapproved campaign: possibly AUTO later
- sending a person a message: policy dependent
- spending money: bounded explicit authority
- deleting canonical data: DENY / exceptional owner operation
- changing security policy: OWNER REQUIRED
- exporting secrets: DENY.

The goal is NOT maximum approvals.
The goal is: MAXIMUM SAFE AUTONOMY.

## Marketer health (Mission Control seed)

Every tenant marketer needs a tiny health projection:
OBJECTIVE, ACTIVE CAMPAIGNS, QUEUED WORK, WAITING FOR OWNER, LAST SUCCESS,
LAST FAILURE, BUDGET USED, INTELLIGENCE USED, CHANNEL HEALTH, OUTCOME
TREND.

This becomes Mission Control later.
Do not build a giant dashboard now.

## Effect states

Every external effect must support: SUCCESS, FAILURE, UNKNOWN.
UNKNOWN triggers reconciliation.
Never: TIMEOUT → ASSUME FAILURE → SEND AGAIN.
This is non-negotiable.

## Measurement (not vanity)

We do not evaluate autonomous marketers by number of agent turns. Measure:
owner corrections retained, evidence coverage, unsupported claims,
time-to-generated-presence, time-to-first-campaign, approval burden,
actions attempted, actions denied, effects verified, duplicate actions,
cost per verified outcome, intelligence per outcome, campaign outcomes,
recovery after worker/process failure.

## Closing statement

At the end I want to say:

"Give FYD your website."
FYD understands it.
FYD builds your presence.
You correct it.
FYD remembers.

Then:

"Get me more customers."
Your marketer inspects the evidence.
Finds opportunities.
Builds a campaign.
Shows what it wants to do.
Executes what it is authorized to do.
Asks when consequence requires you.
Measures what happened.
Learns from reality.
And tomorrow it wakes up knowing more than yesterday.

THAT is the product.

Every day ask: WHAT PRODUCT ARROW TURNED GREEN?
Not: what architecture did we create?

For every missing capability:
SEARCH PING → SEARCH CRX → SEARCH DEPENDENCIES → SEARCH ECOSYSTEM →
HARVEST → BUILD SMALLEST DELTA → TEST → SERVE → USE → MEASURE.

FYD IS NOT BUILDING AI THAT DOES MARKETING.
FYD IS BUILDING A BUSINESS OBJECT SYSTEM THAT CAN SAFELY MARKET ITSELF.

THE OBJECT GRAPH PROVIDES UNDERSTANDING.
EVIDENCE PROVIDES TRUST.
OWNER INTENT PROVIDES SOVEREIGNTY.
CAPABILITIES PROVIDE BOUNDARIES.
AGENTS PROVIDE INTELLIGENCE.
DETERMINISTIC SOFTWARE PROVIDES EXECUTION.
OUTCOMES PROVIDE LEARNING.
CHANNELS PROVIDE REACH.

THE SAME TENANT TRUTH CAN COMPILE INTO:
A WEBSITE
A CONCIERGE
A CAMPAIGN
A SOCIAL PRESENCE
A PROTOCOL PROJECTION
AN AGENT CONTEXT
A FUTURE APPLICATION WE HAVE NOT INVENTED YET.

THAT OPTIONALITY IS WHY WE ARE BUILDING THE SYSTEM THIS WAY.

TEN DAYS.
TWO REAL TENANTS.
ONE SHARED ENGINE.
ZERO CUSTOMER-SPECIFIC CODE.
ONE AUTONOMOUS MARKETER PER TENANT.
PROVE THE LOOP.
GO.

---

## Companion directive: free-tier bootstrapped infrastructure

Nolan, 2026-09-29: get clear on the storage/compute story — free-tier
bootstrapped infrastructure on behalf of clients. Oracle, Cloudflare,
Upstash, AWS, whatever. Give them everything. A bounded research pass is
dispatched to produce the concrete thesis: per-provider free-tier limits,
recommended per-tenant bootstrapping architecture, what "on behalf of
clients" can and cannot mean under provider ToS, and the cost-ceiling math.

---

## Amendment 2026-09-29 ~11:48 MDT (Nolan): single exploratory tenant

Scope cut, binding: right now, focus on PING as the exploratory tenant. The
"run TWO tenants" proof is deferred; the second tenant does not start until
the PING exploratory tenant proves the loop. PING is the first test tenant
with all possible capabilities, per the standing TenantOS/Orca/Mission
Control direction. Everything else in this directive stands.
