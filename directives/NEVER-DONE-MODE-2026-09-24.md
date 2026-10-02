# NEVER DONE MODE — Permanent Operating Law

Issued by Nolan, 2026-09-24 ~05:41 MDT. This supersedes any notion that a program
completing means the work stops. A mission may complete. A run may complete.
A patch may complete. A release may complete. An ORCA lane may complete.
A website may complete. PING IS NEVER DONE.

## Permanent law: completion semantics

Every completion must produce ONE of:

1. VERIFIED SUCCESS + NEXT HIGH-VALUE WORK
2. VERIFIED SUCCESS + OBSERVATION/MONITORING MISSION
3. FAILURE + MINIMIZED REPRODUCTION + REPAIR MISSION
4. UNKNOWN + RECONCILIATION MISSION
5. DISCOVERY + INVESTIGATION MISSION
6. IMPROVEMENT + FALSIFICATION MISSION
7. NO FURTHER VALUE + FRONTIER RETURNS TO GLOBAL QUEUE

There is no "DONE, WAITING FOR NOLAN." There is only:
OBSERVE → DISCOVER → PRIORITIZE → CLAIM → EXECUTE → VERIFY → INTEGRATE → REMEMBER → OBSERVE AGAIN.

Never say "the program is done." Say "this work item is verified." Then select the next one.

## Current priority

Keep every existing fleet running. Drive hard on: Mission Control, TenantOS
backend, ORCA final effect semantics, MCP, memory, observability, business object
graph, FYD, website harvest, connectors, marketing, technology, operations,
finance, sales, customer work, projects, automations, knowledge, agent
orchestration.

The end product lets Nolan see and manage the business from one coherent
control surface.

## Mission Control — the real control plane

Mission Control is the human projection over the entire business operating
graph. Not a pretty dashboard over fake counts. Not another source of truth.
It is a projection + control surface over PROVEN backend state.

Covers: Today, Missions, Businesses, Customers, Leads, Sales, Marketing,
Websites, Content, Campaigns, Projects, Tasks, Approvals, People, Agents,
Automations, Integrations, Software, Knowledge, Objects, Evidence, Activity,
Lineage, Memory, System Health, Security, Cost, Releases.

### TODAY (first screen)
Answer: what is happening? what changed? what needs me? what is blocked?
what is running? what failed? what recovered? what opportunities were found?
what business facts changed? what agents are working? what requires authority?
what will happen next? Never make Nolan open 15 engineering panels to
understand the system.

### Business view
Compose: identity, locations, people, services, products, offers, customers,
leads, projects, reviews, documents, knowledge, website, social sources,
software, integrations, campaigns, workflows, automations, missions, evidence,
owner intent. Click any value and trace the Sanity law:
RENDERED VALUE → OBJECT → CLAIM/OBSERVATION → EVIDENCE → ORIGINAL SOURCE.

### Website view
Show: live site, preview, SiteSpec, object coverage, source coverage, missing
evidence, mobile QA, desktop QA, accessibility, performance, visual QA,
Ask FYD, owner corrections, regeneration history, deployment, domain, health,
source changes. Allow safe actions: preview, propose edit, correct fact,
confirm fact, hide fact, regenerate, compare, approve, publish, rollback.
Consequential actions remain authority-bound.

### Marketing (first-class domain)
Objects: Audience, Segment, Offer, Campaign, Creative, Channel, LandingPage,
Content, LeadSource, Experiment, Conversion, Attribution, Budget,
MeasurementPlan. Support: research, opportunity discovery, campaign proposals,
content planning, landing-page generation, creative drafts, SEO opportunities,
source-backed business claims, competitive observations, measurement,
performance analysis. DO NOT AUTO-SPEND MONEY. DO NOT AUTO-PUBLISH EXTERNAL
CAMPAIGNS. Prepare everything until the actual authority boundary.

### Sales/CRM
Compose: Lead, Contact, Company, Opportunity, Conversation, Estimate, Proposal,
Decision, FollowUp, Customer, Outcome. Show: new leads, stale leads,
unanswered inquiries, next actions, evidence, communications, commitments,
pipeline state. Agents do the ordinary work within authority; humans handle
material commitments.

### Operations
Compose: Job, Project, Task, WorkOrder, Schedule, Appointment, Asset,
Inventory, Vendor, Supplier, Issue, Incident. Show real operational state and
the missions acting on it.

### Technology as business objects
Repository, Commit, Release, Service, Database, Container, Host, Integration,
API, MCPServer, Capability, CredentialReference, Deployment, Incident, Metric,
Trace, Run. Nolan can move BUSINESS → WEBSITE → OBJECT → SOURCE, or
MISSION → RUN → AGENT → TOOL → EFFECT → EVENT → TRACE, or
RELEASE → SHA → IMAGE → DEPLOYMENT → HEALTH → EVIDENCE.

### Agent view (the one actually needed)
For every active agent/run: objective, mission, current work item, claim,
lease, attempt, checkpoint, tools, memory/context, last verified effect,
current state, budget, dependencies, blocker, next expected transition.
Allow: inspect, pause safely, resume, reprioritize, cancel safely, request
deeper verification, open evidence, open trace.
DO NOT ALLOW UI CONTROLS THAT HAVE NO WITNESSED BACKEND MUTATION.
UI CLAIM <= BACKEND PROOF.

## ORCA — do not declare it finished

Eight lanes completing means the next ORCA frontier starts. The current real
failure is excellent: WORKER COMPLETES EFFECT → COORDINATOR TIMES OUT →
RESULT DISCARDED → AUTO-RETRY → SECOND EFFECT. Attack it now.
Model separately: EXECUTION REQUESTED / STARTED, EFFECT UNKNOWN / OBSERVED,
RESULT RECEIVED / LOST / VERIFIED, RECONCILIATION REQUIRED, SAFE TO RETRY /
NOT SAFE TO RETRY. TIMEOUT != FAILURE. NO RESULT != NO EFFECT.
RETRY != IDEMPOTENCY. For effectful operations: reconcile before retry when
outcome is unknown. Prove with real failure injection.

## Backend harvest

Keep harvesting. Search PING history + existing code + external open-source
mechanisms for things that improve real active failures. Harvest: durable
execution, effect journals, idempotency keys, fencing, leases, outboxes,
inboxes, reconciliation, workflow recovery, incremental computation, graph
invalidation, content addressing, connector sync, CDC, rate limiting,
backpressure, browser pooling, build caching, observability, memory retrieval,
tool registries, schema evolution. For each:
DISCOVER → PIN → SOURCE VERIFY → TEST → EXECUTE → COMPARE → HARVEST/REJECT.
Research must eventually become a disposition.

## Website harvest

Continue business/website acquisition. Every good website is both a potential
business world and a design/information-architecture research sample.
Harvest: navigation structures, service organization, location presentation,
team presentation, trust patterns, FAQ structures, portfolio structures,
calls to action, mobile behavior, content hierarchy, information density,
conversion patterns. Separate DESIGN MECHANISM from CUSTOMER IDENTITY /
COPYRIGHTED CONTENT. Learn the pattern. Do not blindly copy the site.

## FYD factory

Keep expanding. 5,000 business worlds are not a finish line. 500 owner-ready
sites are not a finish line. When 500 pass, ask: what failed least? most?
what business types are weak? what objects are underrepresented? what
components are overused? what sources are missing? what connectors would
create the most value? what owner corrections recur? what visual failures
recur? That becomes the next frontier.

## Frontend composition

Do not build one giant screen. Build composable object views. Every important
object has a consistent detail model: SUMMARY / RELATIONSHIPS / EVIDENCE /
ACTIVITY / MISSIONS / CAPABILITIES / PROJECTIONS / HISTORY. Business, Customer,
Campaign, Website, Repository, Mission all compose these. The UI emerges from
the same object ecosystem.

## Search/command

Global queries: "show me everything about Coppersmith", "what changed today",
"what is waiting for me", "what marketing opportunities did PING find",
"which sites failed mobile QA", "why does the website say this", "what is
ORCA working on", "what changed since the last release", "which business
facts conflict", "what software does this business use", "what can PING
safely do next". Answer through the object graph + evidence + current runtime
state. Never invented dashboard text.

## Backend contract

Converge read contracts around: Object, Relationship, Observation, Evidence,
Projection, Capability, Mission, Run, Decision, Result, Verification,
Activity. Domain extensions stay extensible. Do NOT create another kernel to
power the UI.

## 37 dirty files

Inventory each: owner, worktree, purpose, base SHA, semantic domain, tests,
dependency, whether generated, whether unrelated, whether superseded, whether
merge-ready. PRESERVE FIRST. Do not sweep into one "cleanup" commit. Split by
semantic unit. Test each unit. Commit proven units.

## Four build-program residuals

Keep visible as real risk objects: rpcbind :111, container memory limits,
gateway healthcheck, Postgres backup/RPO, Qdrant snapshot/restore. Do not
block the rest of the program on them. Continue investigation and prepare
reversible, tested remediations. Do not silently perform a material
host/production change that requires owner authority (the 2026-09-24 ops lane
already carries Nolan's explicit GO). Do not report them every hour either.
They remain open until resolved or explicitly accepted.

## Continuous business understanding

Keep learning: what object types/relationships exist, what software types,
what business workflows, what projection patterns work, what failures recur,
what decisions recur, what can become deterministic, what requires
intelligence, what requires human authority. Turn learning into better
schemas, fixtures, tests, connectors, components, policies, retrieval,
evaluations, missions. Do not turn learning into new architecture by default.

## Never-done scheduler

When frontier size drops, generate work from: runtime observations, failed
tests, slow tests, browser failures, unverified claims, stale evidence,
source changes, dependency changes, security advisories, Git changes,
connector changes, business changes, owner corrections, projection conflicts,
unknown effects, performance regressions, coverage gaps, memory contradictions,
ORCA differentials, unused mechanisms, dormant mechanisms, customer/business
opportunities. Semantically dedupe before claiming.

## No busywork

Never done does not mean generate useless tasks forever. It means: as long as
there is a material gap between current reality and the product objective, the
system continues. If a domain is healthy: observe it cheaply. Move compute to
the next gap.

## The product

Nolan opens PING and sees the entire world: businesses, customers, leads,
websites, marketing, sales, operations, technology, people, software,
knowledge, agents, missions, automations, integrations, evidence, decisions,
approvals, system health. He moves from high-level business state all the way
down to the exact source/object/event/effect/trace without changing systems,
and acts from that same surface where authorized.

## Final law

Mission Control does not end the autonomy program; it makes it visible and
controllable. FYD does not end at the website; the website is one projection.
ORCA does not end when its lanes complete; the next real failure becomes its
next test. PING does not end when everything is green; green systems are
observed, changed systems are re-evaluated, new evidence creates new work,
new capability creates new possibilities, new failure creates a reproduction,
new business knowledge improves the graph. The loop continues. Never done.
