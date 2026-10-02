# MUSE — NEXT WAVE (Nolan, 2026-09-27 ~20:18 MDT)

Status: BINDING, GATED. Assumption gate: THE FYD BUILDER LOOP IS GREEN. Until the
convergence program genuinely passes its acceptance gate, this directive is
staged next-wave authority, not current work. Do not start it during the 100
hours. The one immediately live correction from this message is the Copilot
usage semantics (maximum useful parallelism, never token consumption as a KPI).

## The pivot

STOP PROVING THAT WE CAN GENERATE A WEBSITE. NOW PROVE THAT FYD CAN CREATE AND
OPERATE A BUSINESS PRESENCE.

THE NEXT PRODUCT IS: ONE-CLICK BUSINESS BOOTSTRAP + MISSION CONTROL + ORCA +
ALWAYS-ON AGENT + SOCIAL OBJECT PROTOCOL + MARKETING/GROWTH INTELLIGENCE +
BOUNDED MASS INTERACTION + OUTCOME LEARNING.

Owner flow: CREATE MY FYD -> Website: [https://business.com] -> Optional:
[Connect social] [Add documents] [Connect business tools] -> BUILD. Then FYD:
understands the business -> creates its object graph -> generates its web
presence -> creates Mission Control -> creates its operating agent -> discovers
opportunities -> proposes improvements -> maintains the presence -> grows
relationships -> measures outcomes -> learns.

THE WEBSITE IS NOW ONE PROJECTION OF THE BUSINESS OBJECT.

## ORCA becomes FYD's execution worker

ORCA MUST STOP BEING AN INTERESTING AGENT EXPERIMENT. MAKE IT THE EXECUTION
WORKER FOR FYD. Archaeology first. Trace the EXISTING path: Mission -> Run ->
Execution -> ExecutionAuthority -> ExecutionAdapter -> Agent -> Result ->
Evidence -> proposed transition -> authorization -> canonical event. Do not
build Orca 2. FINISH THE EXISTING PATH.

Orca must reliably support: READ, RESEARCH, ANALYZE, PLAN, PROPOSE, EXECUTE
AUTHORIZED TOOL, RETURN STRUCTURED RESULT, ATTACH EVIDENCE, REPORT FAILURE,
REPORT UNKNOWN. ORCA thinks and executes. PING authorizes. FYD owns product
intent. Canonical event history records what happened. Therefore: ORCA OUTPUT !=
TRUTH; ORCA TOOL CALL != AUTHORIZATION; ORCA SUCCESS MESSAGE != VERIFIED
OUTCOME. Keep the existing authority boundary.

## Mission Control gets a customer purpose

It is not an admin dashboard. EVERY FYD IDENTITY GETS AN OPERATING ENVIRONMENT:
Identity -> Mission Control -> Presence, Objects, Relationships, Agent,
Missions, Campaigns, Proposals, Approvals, Evidence, Outcomes, Controls. Do not
expose internal architecture vocabulary. Business owner sees: YOUR FYD, YOUR
AGENT, WHAT CHANGED, WHAT NEEDS ATTENTION, WHAT FYD RECOMMENDS, WHAT IS
RUNNING, WHAT HAPPENED, WHAT WORKED. First screen example: "GOOD MORNING. Your
FYD is healthy. 3 opportunities found, 2 source changes detected, 1 proposed
site improvement, 14 new relevant FYD relationships, 1 campaign ready for
review. [Review opportunities]. Agent activity: checked website, verified
business hours, updated evidence, analyzed recent engagement, campaign awaiting
approval." This is more valuable than exposing queues and worker internals.

## One-click bootstrap (the distribution primitive)

One bootstrap operation creates/reuses: identity, business object, evidence
graph, website observations, relationships, SiteSpec, FYD Node, Mission Control,
agent configuration, capability profile, source-refresh schedule,
search/discovery projection. DO NOT create duplicate authorities — bootstrap is
orchestration over existing primitives. Same business + same evidence DOES NOT
CREATE ANOTHER BUSINESS. Retry is safe. Interrupted bootstrap is resumable.
Existing FYD identity discovered: link/resolve rather than duplicate. Ambiguous
identity: STOP FOR RESOLUTION. This becomes critical once acquisition scales.

## Always-on agent (event-driven, not always-running)

"Always on" DOES NOT mean LLM running constantly. It means: EVENT/TRIGGER ->
deterministic filter -> determine whether intelligence is needed -> agent
invocation if useful -> proposal/action -> evidence/outcome. Triggers: source
changed, new relationship, new message/request, scheduled review, campaign
threshold, stale evidence, business opportunity, owner request, failed/unknown
action. MOST TIME: NO MODEL SHOULD BE RUNNING. Make intelligence allocation
explicit. SOFTWARE does: poll, diff, dedupe, match, validate, rank simple rules,
enforce policy, rate-limit, execute batches, retry, reconcile, project, replay.
AI does: understand, research, resolve ambiguity, design, write, plan, compare,
recommend, propose. Use stronger intelligence only when the expected value
warrants it. THIS IS CRITICAL.

## Object uniqueness without bespoke code

"Every object is unique/customizable" must NOT mean every object gets custom
application code. Each object becomes unique through: canonical data,
relationships, evidence, owner overrides, presentation, capabilities, history,
context, agent instructions where appropriate. Same schema. Different object.
Same renderer family. Different composition. NO bespoke React per customer.
Preserve layers: CANONICAL / SOURCE-DERIVED DATA, OWNER CORRECTIONS, OWNER
PRESENTATION INTENT, GENERATED PRESENTATION, VIEWER CONTEXT. Customization
without destroying regeneration.

## Social object protocol

Do not define FYD around "posts." Any appropriate public object can participate
socially: Business, Service, Product, Project, Person, Post, Article, Event,
Offer, Location. Generic relationships: follows, references, responds_to,
likes/reacts_to, owns, created, offers, located_at, works_for, member_of,
subscribes_to, collaborates_with. Schema determines which actions make sense —
never hard-code [Follow][Like][Reply] onto everything. Compute: viewer + object
+ schema + relationship + policy + capabilities -> AVAILABLE ACTIONS. Same
capability resolution is available to the agent. HUMAN AND AGENT SHARE THE SAME
ACTION SUBSTRATE.

## Marketing as compilation (not a platform)

Do NOT build a separate marketing platform. Marketing becomes: GOAL -> audience
-> objects -> relationships -> content/proposal -> channels -> capabilities ->
execution -> receipts -> outcomes. Owner request "Get more commercial plumbing
customers" compiles into a typed plan, not 5,000 messages. Natural language
"Find everyone in my network who owns or manages commercial property and
introduce our emergency service" -> agent produces CampaignSpec (goal, audience
query, evidence requirements, eligible actions, channel preferences, content
strategy, budget/limits, approval policy, schedule, success metrics) -> then
deterministic software resolves the audience and executes approved actions.
"Mass interaction" means: BATCHED, DETERMINISTIC, PERMISSIONED, RATE-LIMITED,
PREVIEWABLE, AUDITABLE. NOT agent swarm randomly clicking social networks.
Example: 2,000 candidates -> 1,624 deterministic matches -> 213 ambiguous -> 163
unmatched. Software handles 1,624. Intelligence investigates only ambiguity where
useful. Preview: 1,624 FYD follows, 311 ActivityPub possible, 274 ATProto
possible, Nostr ..., Facebook unsupported/permission missing, newsletter = ZERO
unless separately requested. USER CONFIRMS THE CONSEQUENTIAL BATCH. Never: fake
follows, fake accounts, silent newsletter subscription, unsolicited bulk
messaging, provider-policy bypass, access-control bypass, identity
impersonation. Network effects come from useful objects and legitimate
relationships.

One user intent maps to many network actions: INTENT -> ACTION PLAN -> FYD
native action / ActivityPub action / ATProto action / Nostr action /
provider-specific action. Each child independently carries: SUPPORTED? ACCOUNT
CONNECTED? PERMISSION? CAPABILITY? CONFIRMATION? RATE LIMIT? EXECUTION STATUS?
RECEIPT? Partial success is normal. Do not reduce execution to SUCCESS/FAILURE.
Use: PROPOSED -> AUTHORIZED -> DISPATCHED -> ACKNOWLEDGED -> SUCCEEDED, or
FAILED, or UNKNOWN -> RECONCILE. This prevents duplicate external effects after
ambiguous timeouts.

## Owner autonomy controls (human-meaningful)

Not 40 permissions on day one. Example: FYD MAY AUTOMATICALLY: monitor my public
sources, detect changes, organize evidence, improve internal understanding. FYD
MAY PROPOSE: website changes, social posts, campaigns, new relationships. ASK ME
BEFORE: publishing externally, messaging people, spending money, changing
provider accounts, executing large batches. Internally these expand to granular
capabilities. ATProto's permission model is the pattern to harvest:
resource/action-specific grants, human-readable permission bundles, progressive
permission requests. HARVEST THE PATTERN. Do not replace CapabilityAuthority.
Owner sees "Allow FYD to maintain my site." Internally: object.read, site.read,
site.propose, site.section.update, etc.

## Outcome learning (the compounding point)

Every meaningful action connects: WHY DID WE DO THIS? WHAT DID WE EXPECT? WHAT
HAPPENED? Example: Campaign C1 -> proposed Post P9 -> owner approved ->
published -> 14 visits -> 3 Ask FYD conversations -> 1 quote request. Do not
build an ML platform. Just preserve the causal/evidence chain. THIS IS WHERE THE
SYSTEM STARTS COMPOUNDING.

## Concierge per node, distribution per object

EVERY FYD NODE GETS A CONCIERGE. Ask FYD understands identity, business, objects,
relationships, evidence, capabilities, owner-approved context, history. Same
graph, different viewer capabilities/context, for visitor questions and owner
questions alike. Every public FYD object becomes a doorway: Circle, embed, link
preview, search result, reference, social projection, protocol projection.
Interaction: SEE OBJECT -> OPEN FYD -> ASK -> INTERACT -> FOLLOW -> DISCOVER
OWNER -> CREATE MY FYD. That is the distribution loop.

## Coordinator posture for this wave

MUSE IS COORDINATOR. Do not give every agent write access to everything. Spawn
specialized lanes with isolated contexts/worktrees. Suggested lanes: ORCA
FORENSICS + COMPLETION, MISSION CONTROL PRODUCT, BUSINESS BOOTSTRAP, ALWAYS-ON
TRIGGER RUNTIME, CAPABILITY/AUTONOMY UX, SOCIAL OBJECT SEMANTICS, CAMPAIGN SPEC,
ACTION/OUTCOME MODEL, CONCIERGE, DISTRIBUTION/EMBED, SECURITY REVIEW,
TEST/FALSIFICATION. Use read-only research/explore/security agents aggressively.
Writing agents only with clear ownership boundaries.

COPILOT USAGE (the corrected order): USE COPILOT AGGRESSIVELY for maximum useful
parallelism. TOKEN BURN IS NOT A SUCCESS METRIC. Maximize: INDEPENDENT QUESTIONS
ANSWERED, BUGS FALSIFIED, TESTS CREATED, CODE HARVESTED, DUPLICATION REMOVED,
PRODUCT LOOPS CLOSED. Parallelize independent work; never ten agents implementing
the same abstraction. Search: PING, runtime, ping-runtime, Orca, MissionRuntime,
MissionScheduler, ExecutionAuthority, CapabilityAuthority, UnifiedEventRuntime,
CascadeProjects, Mission Control, agent code, old branches, git history, tests.
Then current ecosystem. Reuse executable code. Do not rewrite PING inside FYD.
MCP is increasingly suitable as an EXTERNAL worker/tool perimeter — PING/FYD ->
capability resolution -> bounded work request -> MCP -> external worker/tool ->
structured result -> evidence -> proposed transition. Do not make it canonical
truth. Harvest; do not derail the build integrating everything. Repository-level
custom agent profiles with scoped tools/MCP access and isolated subagents are
the expected mechanism for parallel delegation under one authoritative
coordinator.

## Build sequence (in order)

FIRST: finish Orca's real execution path. SECOND: make Mission Control
identity-owned and useful. THIRD: one-click bootstrap ONE real business into
objects, site, Mission Control, agent. FOURTH: always-on agent performs ONE
useful scheduled/event-triggered task (e.g. detect source change -> understand
effect -> propose update). FIFTH: Mission Control displays proposal. SIXTH:
owner approves. SEVENTH: FYD updates. EIGHTH: record outcome/evidence. THAT IS
THE NEXT MAJOR PROOF. Then prove one growth operation: "Find people/businesses
already related to me that are on FYD" — DETERMINISTIC RESOLUTION, preview,
approve, create legitimate FYD relationships. NO provider mass automation yet.

NO: ad exchange, billing platform, general CRM, general email marketing suite,
full social scheduler, mass cold outreach, autonomous spending, new workflow
engine, new event store, new graph database, new identity authority,
provider-specific core architecture. Those can emerge from the primitives.

## The milestone

CREATE MY FYD -> business appears -> site generated -> Mission Control exists ->
agent exists -> agent monitors source -> source change detected -> agent proposes
improvement -> Mission Control shows WHY -> owner approves -> site changes ->
event recorded -> refresh survives -> Ask FYD understands the result. Then owner
says "Help me grow" -> FYD produces a typed, bounded growth plan from actual
objects, relationships and capabilities. Not generic marketing prose. THAT is
the bridge from WEBSITE BUILDER to BUSINESS OPERATING SYSTEM.

MEASURE: TIME FROM URL -> OPERATING FYD BUSINESS. Then: TIME FROM SOURCE CHANGE
-> SAFE PROPOSAL. Then: TIME FROM OWNER INTENT -> EXECUTABLE PLAN. Then:
OUTCOMES PER APPROVED ACTION. Drive those numbers down. NOT agents launched,
tokens consumed, files created.

FYD IS NOT THE WEBSITE. PING IS NOT THE UI. ORCA IS NOT THE AUTHORITY. MISSION
CONTROL IS NOT AN ADMIN PANEL. THE OBJECT GRAPH IS NOT THE CUSTOMER VALUE BY
ITSELF. THE SYSTEM EXISTS SO A BUSINESS CAN BECOME: UNDERSTOOD, STRUCTURED,
INTERACTIVE, CUSTOMIZABLE, SOCIAL, AGENT-OPERABLE, CONTINUOUSLY MAINTAINED, AND
EVENTUALLY SELF-IMPROVING — WITHOUT LOSING HUMAN CONTROL.

FINISH ORCA. FINISH MISSION CONTROL. BOOTSTRAP ONE BUSINESS. GIVE IT AN AGENT.
LET THAT AGENT DO ONE USEFUL THING. PROVE THE OUTCOME. THEN SCALE THE LOOP. GO.
