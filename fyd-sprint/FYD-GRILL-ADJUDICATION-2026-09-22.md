# FYD — Grill Adjudication and 24-Hour Focus

Issued by Nolan, 2026-09-22 ~20:07 MDT. Verbatim record. THE CLOCK STARTS AFTER THIS ADJUDICATION. Sprint window: 2026-09-22 20:07 MDT to 2026-09-23 20:07 MDT.

## Context he gave with it

The grill is useful, but it is mixing three different programs: the FYD product proof, Jev's decision architecture, and infrastructure cleanup. Do not let 50 individually reasonable questions turn into 50 prerequisites.

The current evidence is materially better than the grill's starting assumptions: the acquisition -> graph -> SiteSpec -> browser boundary has since closed, including 195/195 tests, deterministic rendering, binding verification, URL safety and mobile. The next FYD boundary is Ask FYD -> evidence -> owner correction -> regeneration, not more substrate work. The grill itself is still valuable as a decision ledger.

Ecosystem notes: Puck 0.23 now has improved drag/drop and static DnD; its 2026 releases added theming, rich-text, AI generation, stable server IDs, history fixes and other editor machinery. Strong evidence that FYD should consume Puck as an editing surface, not recreate an editor or surrender the FYD IR to it. Vercel now explicitly offers a Platforms product for multi-tenant and multi-project website-builder products, including wildcard/custom domains and single-codebase hosting, which makes domain plumbing even less worthy of custom FYD engineering.

On acquisition, Crawl4AI 0.9.3 is current and its recent releases have hardened exactly the ugly commodity crawler boundary: SSRF, auth, PDF handling, crash recovery, Shadow DOM and anti-bot behavior. That strengthens the harvest-not-invent rule, but also says sandbox it aggressively rather than embedding arbitrary crawling capability in the trusted PING core. Lightpanda 0.4.1 remains worth benchmarking later, not adopting before acquisition actually fails.

MCP's 2026-07-28 spec moved to a stateless core with cacheable discovery, authorization hardening and extensions. That fits PING's direction extremely well later, because FYD capabilities can be projected outward without making MCP canonical truth.

## FYD / PING — GRILL ADJUDICATION

THE GRILL IS ACCEPTED.

DO NOT TURN 50 QUESTIONS INTO 50 BLOCKERS.

WE ARE HARVESTING BROADLY NOW SO WE CAN PRESERVE OPTIONALITY.

WE ARE IMPLEMENTING NARROWLY SO WE CAN PROVE THE PRODUCT.

THE ARCHITECTURAL RULE:

BROAD KNOWLEDGE.
SMALL CORE.
THIN ADAPTERS.
ONE PRODUCT LOOP.

FYD is NOT fundamentally a website builder.

FYD takes an entity's fragmented digital existence and compiles it into a
structured, evidence-backed, owner-correctable digital object that can be
projected into many experiences.

Today:

WEB PRESENCE.

Tomorrow optionally:

SOCIAL NODE
MOBILE EXPERIENCE
CONCIERGE
SEARCH RESULT
MCP RESOURCE/TOOLS
ACTIVITYPUB ACTOR
ATPROTO RECORDS
EMBEDDED CIRCLE
CAMPAIGN TARGET
AGENT CONTEXT
MARKETPLACE LISTING
VOICE EXPERIENCE
OTHER PROJECTIONS.

Therefore:

WEBSITE != CANONICAL PRODUCT.

WEBSITE = FIRST HIGH-VALUE PROJECTION.

This is why PING matters.

But every PING primitive must earn its place by enabling this optionality.

SOURCES
-> OBSERVATIONS
-> EVIDENCE
-> OBJECTS + RELATIONSHIPS
-> OWNER INTENT / CORRECTIONS
-> CANONICAL TRANSITIONS
-> PROJECTIONS

From the same substrate:

         +- FYD WEBSITE
         +- CIRCLE
OBJECT GRAPH +- ASK FYD
         +- SEARCH
         +- SOCIAL
         +- MCP
         +- AGENT CONTEXT
         +- FUTURE PROTOCOLS.

THIS OPTIONALITY IS THE REASON FOR THE SYSTEM.

Do not build each output as an independent application.

DO NOT invent a vanity number before measuring baseline.

For this sprint:

PRIMARY PASS:

A cold real URL becomes a useful, truthful, editable FYD presence without
customer-specific code.

Measure:

time to first useful preview
fact coverage
unsupported claims
owner corrections required
mobile quality
contact/service discoverability
performance.

Run the cold set first.

THEN establish numerical SLA from evidence.

For the immediate proof, under 10 minutes is a reasonable operational
ceiling, but the target should rapidly become MUCH faster because the
long-term onboarding promise is:

URL
-> useful preview in roughly a minute.

Do not game the system merely to hit 60 seconds yet.

12 is reasonable.

Use diversity, not category theater.

4 trades/home services
4 retail/food/local commerce
4 professional/creator/service.

No cherry-picking after seeing results.

Record every failure.

Judge:

identity accuracy
contact accuracy
service/product discovery
location accuracy
visual credibility
invented claims
time to preview.

Nolan can judge the first run.

Then ONE external owner must judge their own presence.

Monument View is NOT allowed to gate the whole sprint.

Attempt owner session.

If available:

excellent.

If unavailable:

replace with first willing legitimate business owner.

The requirement is:

ONE REAL OWNER.

Not:

ONE SPECIFIC OWNER.

LOCK THIS MODEL:

SOURCE OBSERVATION
!=
OWNER ASSERTION.

If owner explicitly corrects a field:

owner assertion governs the owner's FYD projection.

If source later changes that same field:

DO NOT overwrite.

Create:

SOURCE_CHANGED_AGAINST_OWNER_ASSERTION.

Surface:

"Your source now says midnight.
You previously set 10 PM.
Keep yours / accept source / inspect."

Untouched fields may update normally according to evidence policy.

This is essential.

TENANT-LOCAL BY DEFAULT.

Do not promote one customer's correction into shared PING knowledge.

Future promotion requires explicit semantics and consent.

A correction may improve generic SOFTWARE behavior only when it teaches a
non-customer-specific parser/planner rule and does not leak customer data.

YES FOR THIS SLICE.

But make the seam explicit:

OwnerContext interface
-> DemoOwnerContext today
-> PING identity/capability implementation later.

Do not scatter:

if (demoOwner)

through product code.

CONTROLLED/OWNER-AUTHORIZED DEMO SOURCES:

download media
hash it
retain source/provenance
create optimized derivatives
serve FYD derivative.

This proves the future media pipeline.

COLD THIRD-PARTY URL:

DO NOT automatically republish media.

Prefer metadata/reference/omit unless reuse authority is clear.

Do not make hotlinking the default rights strategy.

PRIVATE ENGINEERING LEDGER.

Every comparative loss becomes:

OBSERVATION
CAUSE
GENERIC FIX CANDIDATE
STATUS.

Not public marketing.

MEASURE FIRST.

But architect for:

SECONDS/MINUTES, NOT HOURS.

Track stages independently:

fetch
extract
resolve
graph
plan
render.

This exposes the actual latency owner.

USE THE SANITIZED APPLICATION ROUTE / EXISTING AUTHORIZED READ SEAM.

DO NOT let FYD builder read Postgres directly.

Builder:

authorized graph reader
-> projection.

Never:

builder
-> SQL dump
-> canonical tables.

This preserves deployment optionality and capability boundaries.

DO NOT CREATE knowledge_* merely because Jev likes the name.

Reuse the proven PING object/event/projection model where semantics fit.

Remember:

EVENTS/TRANSITIONS = TRUTH
OBJECT TABLES = REBUILDABLE PROJECTION

unless current evidence has explicitly changed that contract.

No second canonical object store.

SEAM-LOCAL.

Do not globalize a FYD demo compatibility fix into canonical reads.

DEFER FROM FYD PRODUCT PATH.

HARVEST/RESEARCH MAY CONTINUE READ-ONLY.

No implementation until a product proof needs it.

MINIMUM MAINTENANCE.

Acquisition must remain reproducible.

Do not become browser-infrastructure maintainers.

If current acquisition fails on cold URLs:

benchmark mature alternatives.

YES:

ASK FYD / CORRECTION PATH FIRST.

PUCK SECOND.

And:

FYD OWNS THE IR.

Puck is an editor over a projection of FYD SiteSpec.

Puck does NOT become canonical site state.

This is now even more important because modern Puck already solves large
parts of drag/drop, theming, rich text, history and editor UX.

HARVEST IT.

Do not recreate those commodity features.

FIRST:

EVIDENCE-BACKED Q&A.

Then:

safe contact/follow capabilities with receipts.

Do NOT add transactional external actions until capability semantics and
real owner auth justify them.

Visitor concierge should eventually be able to ACT.

But first prove it can be TRUSTED.

CORRECT.

WHY THIS IS NOT THE HERO FEATURE.

It is a trust primitive.

Normally invisible.

Available when:

user asks "how do you know?"
owner corrects something
confidence is weak/conflicting
important generated claim needs inspection.

YES.

Keep domain seam portable.

Use commodity multi-tenant/custom-domain infrastructure.

Vercel is now explicitly productizing this exact platform problem.

DO NOT BUILD CUSTOM SSL/DOMAIN ORCHESTRATION.

NOLAN + EXPLICIT OWNER TESTERS ONLY.

No general preview sharing until auth boundary is real enough.

IMPORTANT:

JEV IS A SEPARATE PROGRAM.

DO NOT LET JEV BLOCK FYD'S PRODUCT LOOP.

Q21:
SHADOW ONLY.

Q22:
OLLAMA LOCAL for calibration/evaluation initially.

Q23:
EVENT-DERIVED ONLY.
No Jev canonical DB.

Q24:
DISABLED BY DEFAULT + AUDIT ATTEMPTS.

Q25:
DO NOT LOCK NEW ID FORMAT NOW.
Preserve existing identity contracts until migration is independently
proven.

Q26:
WITNESS/CERTIFICATION FIRST if signatures are introduced.
Do not sign everything indiscriminately.

Q27:
NO MODEL EARNS AUTHORITY FROM ACCURACY ALONE.

Authority requires:

capability
policy
identity
consequence classification
approval semantics.

Q28:
NO ARTIFICIAL ABSTENTION QUOTA.

Measure calibration.

Q29:
ONE FYD TENANT FIRST, tenant isolation invariant from day one.

Q30:
PING REPO is the correct first approved repository.

BUT:

JEV DOES NOT GET TO STEAL THE FYD SPRINT.

DEFER LIVE MCP EXECUTION.

HARVEST THE CURRENT CONTRACT.

Recent MCP architecture is increasingly compatible with our model:

stateless request/response core
explicit capabilities
authorization
cacheable discovery
extensions.

Excellent FUTURE projection seam.

Not tonight's canonical runtime.

YES.

THIS IS ACTUALLY FYD P0.

An approved owner assertion must not silently degrade back into an
untrusted candidate.

Fix/prove this in the FYD correction loop.

IF THE ~52% POLLUTION MEASUREMENT IS REPRODUCIBLE:

quarantine/purge seeded fake vectors and rebuild derived embeddings from
real content.

BUT DO NOT BLOCK FYD's deterministic evidence path on Qdrant.

Vector search is a projection.

Never truth.

DO NOT INVENT MEMORY AUTHORITY YET.

Execution consumes a defined ContextBundle assembled from authorized
sources.

The retrieval implementation sits behind that interface.

Name a new authority only after existing PING archaeology proves no
owner exists.

WE ALREADY HAVE Mission -> Run -> Execution semantics in PING history.

Do not "let another Run emerge."

Reuse the existing proven concept where applicable.

No duplicate run abstraction.

CAPABILITY/POLICY CHECK BEFORE EFFECT.

Human approval is one possible policy requirement, not the source of
authorization itself.

Do not architect:

approval first
-> authorization afterward.

Correct model:

intent
-> capability/policy evaluation
-> proposal if consequence requires approval
-> approval
-> re-evaluate exact approved proposal
-> effect.

UNKNOWN MUST BE A FIRST-CLASS OUTCOME.

Not failure.

Not success.

At minimum:

PROPOSED
AUTHORIZED
ATTEMPTED
SUCCEEDED
FAILED
UNKNOWN.

Reuse existing event/result vocabulary if it can represent this.

CANONICAL EVENT-DERIVED COUNTERS FIRST.

No dashboard-driven telemetry architecture.

DO NOT DEFINE AN ARBITRARY "100 decisions" AS CONSTITUTIONAL.

Use 100 as an observation checkpoint if useful.

Un-gate when required invariants are proven:

truth layer clean
correction survival green
decision contract calibrated
human gate proven where required.

YES, FIX THE AUTOMATION FAILURE CLASS.

But prefer:

PROCESS HOLDS A WAKE REQUEST WHILE CRITICAL AUTOMATION RUNS

over globally disabling sleep forever.

Also add:

single-worker browser lock
page recreation after target death
forensic evidence on unexpected interruption.

If the Pig is a dedicated always-on automation machine and power cost is
irrelevant, AC never-sleep is acceptable.

But wake-lock-per-critical-run is the cleaner default.

For Tailscale specifically:

watchdog may collect evidence and recover ONLY after the failure condition
is precisely identified and recovery is safe/idempotent.

Do not create an infinite restart loop masking the root cause.

SERIALIZABLE LOCATION-INDEPENDENT CONTRACT.

NO DISTRIBUTED JEV WORK YET.

NO SPLIT DURING THIS SLICE.

Split only when independent lifecycle/deployment/ownership provides a
measurable benefit.

THE CLOCK CAN START AFTER THIS ADJUDICATION.

We have enough answers.

Do not hold the product hostage to further grilling.

KEEP IT DECOUPLED.

And preserve the lesson from the duplicate-send incident:

STRUCTURED CANONICAL STATE > PROSE/NOTES.

No outbound action from stale narrative state.

DO NOT FORCE prospect-research grading terminology onto FYD merely for
consistency.

Use one underlying evidence model if semantics match.

For FYD claims, prefer descriptive provenance:

DIRECT
DERIVED
INFERRED
OWNER_ASSERTED
CONFLICTING
UNKNOWN.

Map to confidence labels at UI boundaries if useful.

YES.

Happy Place and Coppersmith remain permanent regression fixtures for now.

But distinguish:

RAW SOURCE FIXTURE
EXPECTED EXTRACTION
EXPECTED GRAPH
EXPECTED SITE SPEC.

Never let generated output overwrite the rich raw fixture again.

DO NOT KILL PING/FYD BASED ON JEV DISAGREEMENT RATE.

Wrong scope.

FYD kill/rethink criteria are PRODUCT failures.

Examples:

cold sites repeatedly cannot be understood with economically reasonable
acquisition

owners consistently distrust/correct most generated content

generated presence provides no meaningful advantage over commodity
builder workflows

persistent corrections/regeneration fail to reduce owner effort

Ask FYD cannot exploit evidence/graph better than generic RAG

real owners do not value the resulting product.

Jev itself can have a separate falsification criterion.

MEDIA:

For authorized demo businesses:

INGEST.
DIGEST.
DERIVE.
SERVE FYD-OPTIMIZED COPIES.
PRESERVE PROVENANCE.

For random cold sites:

do not assume reuse rights.

OWNER GATE:

DEMO_OWNER_MODE NOW.

But implement through a replaceable OwnerContext seam.

ASK FYD:

FULL EVIDENCE-BOUNDED Q&A.

If evidence is absent:

say so.

Never invent.

COMPARISON MUST-WINS:

LOCK THESE FOUR:

MOBILE EXPERIENCE
SERVICE/PRODUCT DISCOVERABILITY
CONTACT/ACTION DISCOVERABILITY
PERFORMANCE

Add one FYD-specific metric:

TRUTHFULNESS / OWNER CORRECTION BURDEN.

Because a beautiful fast site that misrepresents the business is a
failure.

THE RENDERER DOES NOT OWN TRUTH.

THE PLANNER DOES NOT OWN TRUTH.

ASK FYD DOES NOT OWN TRUTH.

AI DOES NOT OWN TRUTH.

The evidence/object projection owns what factual material is eligible for
presentation.

Therefore build/keep the BindingVerifier at the projection seam:

Evidence/Object Graph
-> Binding Verification
-> SiteSpec
-> Renderer.

Every factual binding must trace to:

object field
owner assertion
or explicitly labeled generated/inferred presentation.

The renderer should be dumb.

It renders bound data.

It must not invent factual content.

Generated marketing copy may exist, but its factual claims must be bound
or separately verified before publication.

THIS is the rule of one.

THE PIPELINE DOES NOT GET FINAL SAY.

Acquisition may conservatively classify an address as initially hidden.

Owner controls presentation visibility.

Visibility policy is separate from factual truth:

FACT:
123 Main St.

VISIBILITY:
HIDDEN | PUBLIC | FOLLOWERS | etc.

Owner override changes VISIBILITY.

It does not rewrite the evidence.

This distinction gives us future optionality for every field.

WHY THIS IS FOR TRUST AND DEBUGGING.

Not the primary workflow.

Owner should not need to inspect provenance to get value.

The primary owner workflow is:

SEE
-> CORRECT
-> CUSTOMIZE
-> PUBLISH.

WHY THIS becomes powerful when:

FYD got something wrong
sources conflict
owner wants explanation
visitor asks evidence-sensitive question
agent proposes a consequential change.

Keep it quiet.

LOCK A REGRESSION PROPERTY:

Same:

ObjectGraph
SiteSpec inputs
ViewerContext
DesignTokens
renderer version

must produce the same SEMANTIC render model.

Do not require byte-identical HTML if framework internals inject harmless
runtime identifiers.

Test semantic determinism at the IR/render-model boundary.

Then separately test stable SSR/hydration behavior.

YES.

KEEP IT SMALL.

Start with a visible deterministic policy table:

GRAPH CONDITION
-> COMPONENT/PAGE ELIGIBILITY.

Examples:

location count > 0
-> Locations eligible

service count > 0
-> Services eligible

person relationships > 0
-> People/Explore eligible

recent content > 0
-> Updates eligible.

Then:

OWNER OVERRIDE.

Only add intelligence when deterministic composition produces a specific
measured failure.

AI should optimize composition.

It should not define basic eligibility.

Because commodity layers are getting dramatically better.

That is GOOD for FYD.

We should own LESS.

Modern editor frameworks increasingly solve:

drag/drop
responsive editing
rich text
history
themes
AI-assisted page manipulation.

Modern crawling frameworks increasingly solve:

browser orchestration
Shadow DOM
deep crawl
crash recovery
security boundaries.

Modern hosting platforms solve:

wildcard domains
custom domains
SSL
tenant routing.

Modern MCP solves:

standard agent/tool interoperability.

Modern local-first engines solve:

concurrent structured editing.

Therefore FYD can concentrate proprietary effort on:

EVIDENCE-BACKED ENTITY UNDERSTANDING
+
OWNER-CORRECTABLE OBJECT GRAPH
+
SITE/EXPERIENCE COMPILATION
+
CONCIERGE
+
CAPABILITY/ACTION GRAPH
+
OUTCOME HISTORY.

THAT IS EXACTLY WHAT WE WANT.

The ecosystem getting better makes our moat narrower AND deeper.

HARVEST EVERYTHING.

ADOPT ALMOST NOTHING BLINDLY.

For each candidate:

PROBLEM IT SOLVES
MATURITY
LICENSE
SECURITY
DEPENDENCY WEIGHT
REPLACEABILITY
DATA OWNERSHIP
LOCK-IN
WRAPPER COST
PING/FYD CODE IT DELETES.

Classification:

ADOPT
WRAP
LEARN
REJECT.

The ideal FYD implementation has:

LOTS OF HARVESTED COMMODITY CAPABILITY

and

VERY LITTLE NOVEL INFRASTRUCTURE.

DO NOT RESET CURRENT PROGRESS.

COMMIT/PROTECT the proven mobile + URL safety + verifier work through
normal lane ownership.

IN ORDER:

1. ASK FYD: "What services does this business offer, and how do you know?" Evidence-bounded answer. WHY THIS. CONFIRM / CORRECT / HIDE.
2. Prove correction survives regeneration.
3. Plain-English customization. Proposal / approval / apply.
4. Re-observe source. Prove owner intent survives.
5. ONE REAL OWNER.
6. THEN thin Puck editing projection.
7. THEN cold URL stress set.

THE CLOCK MAY START.

Do not wait for another giant architecture review.

Broad harvest continues in parallel.

Product lane stays narrow.

The next user-visible proof is:

REAL BUSINESS
-> ASK FYD
-> EVIDENCE
-> OWNER CORRECTION
-> REGENERATION
-> CORRECTION SURVIVES.

That is more valuable than another protocol, another table, another
dashboard, or another architecture document.

WE ARE NOT BUILDING THE WORLD'S MOST COMPLICATED WEBSITE BUILDER.

WE ARE BUILDING THE SMALLEST CORE THAT CAN UNDERSTAND AN ENTITY ONCE AND
THEN PROJECT THAT UNDERSTANDING ANYWHERE.

WEBSITE FIRST.

CONCIERGE NEXT.

SOCIAL OPTIONAL.

AGENTS OPTIONAL.

MCP OPTIONAL.

FEDERATION OPTIONAL.

LOCAL-FIRST OPTIONAL.

NEW OUTPUTS OPTIONAL.

THE OBJECT + EVIDENCE + OWNER INTENT SURVIVE ALL OF THEM.

THAT IS THE OPTIONALITY.

HARVEST BROADLY.

OWN THE SEMANTICS.

KEEP THE CORE SMALL.

CLOSE THE OWNER LOOP.

START THE CLOCK.

## Closing corrections from the same message

One correction to the grill is especially important: Q36's proposed ordering is backwards if interpreted literally. Human approval is not the authority. The system should determine whether the actor has the capability and whether policy requires approval; if approval is required, the exact proposal is approved and capability/policy are checked again before the effect. Otherwise you risk building an approval system that can "approve" something the actor was never authorized to do.

And Q35 shouldn't invent a new Run concept: PING already has Mission -> Run -> Execution history. Reuse it or prove it unsuitable before another abstraction appears.

The strongest future-proofing decision here is therefore not Puck, Automerge, MCP, Crawl4AI, Vercel, or any individual library. It is keeping Evidence/ObjectGraph + OwnerIntent + canonical transitions independent from every presentation and protocol. Puck can disappear. Vercel can disappear. MCP can change. The crawler can be replaced. The same FYD object still projects into the next surface.

That is the architecture worth defending.
