# FYD — Product Authority Decisions + Harvest Directive
Nolan, 2026-09-25 ~11:45 MDT. Binding product law for the FYD sprint.

FYD — DECISIONS MADE.

DO NOT WAIT.

BUT UNDERSTAND THE PRODUCT WE ARE ACTUALLY BUILDING BEFORE ADDING MORE
SURFACE AREA.

## Media

YES:

FOR THESE AUTHORIZED DEMO BUSINESSES, FYD MAY ACQUIRE PUBLIC WEBSITE MEDIA
FOR THE DEMO, SUBJECT TO SOURCE RIGHTS/TERMS AND OUR AUTHORIZATION.

PREFERRED ARCHITECTURE:

SOURCE MEDIA
→ FETCH
→ VERIFY MIME/SIZE
→ DIGEST ORIGINAL
→ PRESERVE SOURCE URL + OBSERVATION PROVENANCE
→ SAFE DERIVATIVES
→ FYD MEDIA OBJECT/REFERENCE
→ SERVE FYD DERIVATIVE.

DO NOT make permanent hotlinking the architecture.

WHY:

hotlinks rot
origins change
CDNs block
images disappear
responsive derivatives become provider-dependent
performance becomes provider-dependent
replay becomes weaker.

BUT:

DO NOT interpret public availability as universal permission to
republish arbitrary third-party media.

For the two explicitly authorized demo sites:
GO.

For arbitrary future ingestion:
rights/policy becomes part of acquisition.

SEARCH PING FIRST FOR EXISTING:

asset storage
artifact storage
content addressing
media hashing
image processing
provenance
object storage
OCI/artifact machinery.

HARVEST BEFORE WRITING.

Do not store:

heroImage = "/foo.jpg"

as the fundamental model.

Conceptually preserve:

OBJECT
→ represented_by
→ MEDIA

MEDIA
→ observed_from
→ SOURCE

MEDIA
→ derivative
→ MEDIA_VARIANT.

Then the same media can serve:

website
Circle
feed
social projection
campaign
Ask FYD
future mobile experience.

DO NOT over-model this tonight.

Use existing PING primitives wherever possible.

## Owner gate

DO NOT STOP THE PRODUCT LOOP TO BUILD THE FINAL AUTH SYSTEM.

FOR THIS DEMO:

USE AN EXPLICIT OWNER-MODE DEVELOPMENT GATE.

It must be:

VISIBLE
EXPLICIT
LOCAL/DEMO SCOPED
FAIL-CLOSED
LOGGED AS NON-PRODUCTION AUTH.

It must NOT pretend to be real authentication.

Label it in code and evidence:

DEMO_OWNER_MODE

or equivalent.

Never:

"authenticated owner"

unless actually authenticated.

The eventual authorization input should be conceptually:

ACTOR
+
IDENTITY
+
OWNERSHIP/CONTROL RELATIONSHIP
+
CAPABILITY
+
RESOURCE
+
ACTION.

Do not make the React UI the authority.

The UI asks:

CAN THIS ACTOR PERFORM THIS ACTION ON THIS OBJECT?

The authority answers.

Demo mode temporarily supplies the actor/control assertion.

That seam must survive replacement with real authentication.

Because our current uncertainty is:

DOES THE PRODUCT WORK?

not:

CAN WE IMPLEMENT LOGIN?

Authentication is solved enough to harvest later.

Do not delay:

URL
→ understanding
→ generated presence
→ Ask FYD
→ correction
→ customization

for production account infrastructure.

BUT:

NO EXTERNAL CONSEQUENTIAL ACTIONS are authorized merely by demo mode.

## Ask FYD

FULL EVIDENCE-BACKED Q&A.

NOT a crippled demo chatbot.

But "full" means full within the evidence boundary.

ASK FYD MAY:

answer supported questions
combine multiple supported facts
follow relationships
summarize evidence
explain provenance
identify conflicts
say what changed
propose site changes.

ASK FYD MUST:

REFUSE
QUALIFY
or
STATE UNKNOWN

when evidence does not support the answer.

THIS IS CRITICAL.

This is one of the core products.

Input:

QUESTION
+
CURRENT OBJECT
+
RELATED OBJECT SUBGRAPH
+
EVIDENCE
+
VIEWER CONTEXT
+
ALLOWED CAPABILITIES.

Output:

ANSWER
+
CLAIMS
+
EVIDENCE REFERENCES
+
UNCERTAINTIES
+
OPTIONAL PROPOSED ACTION.

Every factual answer should be recoverable to evidence.

Do not rely on:

"the model probably won't hallucinate."

DO NOT CREATE ClaimAuthority.

The renderer should not become a second truth engine either.

Use the existing evidence/object semantics.

The rule:

A FACTUAL RENDER BINDING MUST RESOLVE TO:

CANONICAL/PROJECTED OBJECT FIELD
+
EVIDENCE BINDING

OR

EXPLICIT GENERATED PRESENTATION COPY CLASSIFIED AS GENERATED.

The BINDING VERIFIER you already built is the enforcement seam.

WIRE IT.

It owns enforcement, not truth.

Truth remains upstream in objects/evidence/events.

Therefore:

OBJECT/EVIDENCE LAYER
owns supported factual state.

BINDING VERIFIER
proves rendered factual bindings resolve to that state.

RENDERER
renders verified bindings.

Ask FYD
must similarly emit evidence-bound claims.

NO NEW AUTHORITY.

## Copy classification

We still need good marketing language.

So classify it.

DIRECT FACT:
"Open 24 hours"

DERIVED FACT:
"Serves Grand Junction and surrounding areas"

GENERATED COPY:
"Comfort you can count on"

USER COPY:
owner-written text.

AI may generate presentation copy.

But generated copy MUST NOT silently become a factual object claim.

This distinction gives us creativity without corrupting truth.

## Benchmark: seven metrics

KEEP:

MOBILE UX
CONTACT DISCOVERABILITY
SERVICE DISCOVERABILITY
PERFORMANCE

ADD:

TRUST / EVIDENCE

Can the user understand why FYD believes an important fact?

EDITABILITY

Can owner correct/customize without developer intervention?

REGENERATION SAFETY

Can source information change without destroying owner intent?

Those seven are the CURRENT benchmark.

DO NOT add another 25 metrics.

For first external user, rank:

P0:
SERVICE DISCOVERABILITY
CONTACT DISCOVERABILITY
MOBILE UX

P0 PRODUCT DIFFERENTIATORS:
EDITABILITY
REGENERATION SAFETY

P1 DIFFERENTIATOR:
TRUST/EVIDENCE

P1:
PERFORMANCE beyond acceptable baseline.

Performance must be good.

Do not spend three days turning Lighthouse 94 into 100 while Ask FYD
cannot answer a customer question.

THE GRILL WAS RIGHT TO QUESTION IT.

## WHY THIS

Do not make owners inspect provenance constantly.

WHY THIS is NOT the primary workflow.

It is the TRUST ESCAPE HATCH.

Normal:

Emergency Plumbing

Exceptional:

"Why is FYD saying that?"

→ WHY THIS?

Then evidence appears.

This makes provenance useful without making the product feel like an
audit console.

## Owner visibility

OWNER WINS.

The extraction pipeline may conservatively classify uncertain visibility.

It may NOT permanently decide the owner's presentation policy.

The owner needs a field-level visibility preference.

For an address:

SOURCE OBSERVATION:
123 Main St

OWNER VISIBILITY:
SHOW / HIDE / DEFAULT.

Then effective presentation policy is computed.

Do not mutate the source observation when owner hides it.

Do not delete evidence.

Do not pretend the address ceased to exist.

This is why:

SOURCE FACT
≠
OWNER PRESENTATION POLICY.

The visibility override you already built is the right seam.

WIRE IT.

MAKE THIS A REAL REGRESSION TEST NOW.

## Semantic render determinism

You already proved the semantic render model byte-identical across
separate processes.

Commit the invariant:

SAME
ObjectGraph
+
SiteSpec
+
ViewerContext
+
OwnerOverrides

→ SAME SEMANTIC RENDER MODEL.

Do NOT require byte-identical HTML if framework/runtime details make that
meaningless.

The semantic render model is the correct deterministic boundary.

Exclude nondeterministic operational fields such as request timing.

Stable ordering must have explicit tie-breakers.

No module counters.

No random IDs.

No current-time content unless time is an explicit input.

## Planner

DO NOT BUILD A "SMART AI PLANNER" YET.

The grill's smallest-fix argument is correct.

Current planner should primarily be a deterministic compiler from graph
semantics.

Example:

Business
→ Hero + BusinessSummary.

Location exists
→ Locations eligible.

Service count > 0
→ Services eligible.

Person + works_for exists
→ People/Team eligible.

External identities exist
→ Connected/Explore eligible.

Recent Posts exist
→ Posts eligible.

Capability contact exists
→ Contact/CTA eligible.

Ask capability exists
→ AskFYD eligible.

THEN:

AI may propose composition changes later.

The baseline should remain explainable and deterministic.

## Entity compiler

WE ARE NOT BUILDING A WEBSITE BUILDER.

WE ARE BUILDING AN ENTITY COMPILER.

MESSY DIGITAL EXISTENCE

website
social
documents
feeds
business systems
public evidence
owner input

    ↓

OBSERVATIONS

    ↓

EVIDENCE

    ↓

RESOLVED OBJECT GRAPH

    ↓

MULTIPLE COMPILED EXPERIENCES.

TODAY:

WEBSITE.

TOMORROW:

FYD SOCIAL NODE
CIRCLE
MOBILE
SEARCH
ASK FYD
ACTIVITYPUB
ATPROTO
NOSTR
MCP
MARKETING CAMPAIGNS
CREATOR COLLABORATION
AI SEARCH/AEO
CUSTOMER JOURNEYS.

THAT OPTIONALITY IS WHY THE DATA LAYER MATTERS.

This is foundational.

Bad:

business.heroTitle
business.homepageSection2
business.blueButton.

Good:

Business
Service
Location
Person
Post
Media
Relationship
Evidence
Capability.

The website compiler decides how those become presentation.

This is what makes future surfaces cheap.

## Harvest directive

The ecosystem research is telling us something important.

Current suites are converging:

SOCIAL MANAGEMENT
+
LISTENING
+
CREATORS
+
SEARCH
+
AI VISIBILITY
+
COMMERCE
+
ATTRIBUTION.

FYD should NOT implement those dashboards now.

But the object/evidence model must make them possible later.

The future loop is:

OBSERVATION
→ SIGNAL
→ OPPORTUNITY
→ PROPOSED MISSION
→ AUTHORIZATION
→ ACTION
→ RESULT
→ EVIDENCE
→ OUTCOME
→ LEARNING.

This is the eventual PING advantage.

The website is our first compiler target.

DO NOT BUILD:

browser engine
crawler engine
JSON-LD processor
social protocol implementation
generic agent protocol
image codec
auth crypto
analytics warehouse

unless existing solutions genuinely fail our requirements.

SEARCH / BENCHMARK / WRAP.

Recent Crawl4AI releases are another warning:

crawler infrastructure contains serious security boundaries including
SSRF and environment isolation.

Do not casually reinvent this.

Use current patched dependencies when adopted.

READ-ONLY LANE:

CRAWLING:
Crawl4AI
Playwright
Lightpanda.

STRUCTURED DATA:
jsonld
schema.org tooling
metadata parsers.

CONTENT:
Readability-style extraction.

MEDIA:
existing PING artifact/media stack
sharp/libvips or existing equivalent if needed.

SCHEMA/UI:
JSON Schema
schema-driven form/render patterns.

LOCAL-FIRST:
Automerge
Electric/PGlite patterns.

AGENTS:
MCP.

OPEN SOCIAL:
ActivityPub/Fedify
ATProto
Nostr
Farcaster.

MARKETING:
study product patterns from:
Metricool
Sprout
Brandwatch
Later
Ahrefs
HubSpot
creator-management systems.

HARVEST:

DATA MODELS
WORKFLOW PATTERNS
OPEN-SOURCE CODE WHERE LICENSE ALLOWS
LIBRARIES
PROTOCOLS
TEST FIXTURES
FAILURE MODES.

DO NOT COPY PROPRIETARY CODE OR protected implementations.

## [Build My FYD]

THE BEST WEBSITE BUILDER SHOULD EVENTUALLY FEEL LIKE:

[ Build My FYD ]

Website:
example.com

Optional:
Connect socials
Upload documents

         BUILD

Then FYD does:

DISCOVER
ACQUIRE
UNDERSTAND
RESOLVE
GENERATE.

The owner should NOT begin with:

choose template
choose font
create pages
enter company description
add service
upload logo
configure SEO.

FYD already learned those things.

Owner:

"Make this feel more premium."

"Put commercial work first."

"Hide my home address."

"Use this photo instead."

"Add financing."

"Make emergency service obvious."

FYD translates:

NATURAL LANGUAGE
→ TYPED PATCH.

Then:

PREVIEW
→ APPLY according to consequence policy.

That is much more interesting than drag-and-drop.

DO NOT ask approval for everything.

LOW CONSEQUENCE:

reorder section
change generated headline
change spacing
choose owner-approved image.

Can become:

APPLY + UNDO.

MEDIUM:

change public factual presentation
hide/show address
change CTA.

Require explicit confirmation initially.

HIGH:

publish externally
send communication
spend money
modify provider relationship
mass action.

Require explicit capability + approval.

This reconciles constitutional safety with good product UX.

Correct.

The user is not there to supervise agents.

They are there to get an outcome.

Agents should disappear behind:

DO THIS
PREVIEW
APPLY
UNDO.

Constitutional machinery exists underneath.

Do not expose Mission Control vocabulary to the plumber.

## Design system

ONE DESIGN SYSTEM.

NOT two bespoke sites.

But design system must support meaningful variation through:

tokens
typography
density
media
section composition
object cardinality
content hierarchy.

Graph determines eligible content.

SiteSpec determines composition.

Design tokens determine appearance.

Owner overrides survive regeneration.

This is important.

## Queue, not tonight

The attached ecosystem benchmark is strategically useful.

It is NOT permission to start TenantOS Marketing Mission Control tonight.

Instead:

ensure today's durable primitives can later support:

Signal
Opportunity
Campaign
Asset
Publication
Conversation
Creator
Relationship
Conversion
Experiment
Learning.

DO NOT necessarily create all these schemas now.

Preserve optionality.

## NOW

Commit the proven mobile/url-safety fixes cleanly.
Wire Binding Verifier into production render seam.
Wire owner visibility override.
Commit semantic render determinism regression.
Media archaeology.
Minimal safe media acquisition/derivative path.
Improve BOTH sites with the SAME design system.
Ask FYD evidence-backed Q&A.
WHY THIS escape hatch.
Owner correction.
Conversational site patch.
Regeneration preserves owner intent.
Put it in front of ONE REAL BUSINESS OWNER.

The external owner test should happen when:

mobile works
services are clear
contact works
media makes it credible
Ask FYD works
one conversational customization works.

THEN WATCH THEM.

Do not spend another architecture wave before that test.

## Restated must-wins

MEDIA:

YES for explicitly authorized demo businesses.

Acquire + digest + safe derivatives + provenance.

Do not make universal public-media copying policy from this demo.

OWNER GATE:

EXPLICIT DEMO OWNER MODE NOW.

Clearly non-production.

Real authorization seam preserved underneath.

Do not stop core-loop validation for production login.

ASK FYD:

FULL EVIDENCE-BOUNDED Q&A.

Answer when supported.

Qualify/refuse when unsupported.

Claims carry evidence.

MUST-WINS:

YES:

mobile UX
contact discoverability
service discoverability
acceptable performance

PLUS:

editability
regeneration safety
trust/evidence.

Do not optimize vanity metrics.

## Positioning

FYD turns the digital presence you already have into a living,
evidence-backed, intelligent web presence that understands itself,
changes when you ask it to, stays current, and can later operate across
the rest of the internet.

WE ARE SPENDING THIS EFFORT ON:

EVIDENCE
OBJECTS
RELATIONSHIPS
CAPABILITIES
EVENT HISTORY

because those primitives let us change the output without rebuilding the
truth.

Website today.

Social tomorrow.

Concierge.

Search.

Campaigns.

Creator relationships.

AEO.

Agents.

Other protocols.

New interfaces we have not invented yet.

SAME UNDERLYING ENTITY.

That is the optionality.

HARVEST AGGRESSIVELY.

BUILD COMMODITY INFRASTRUCTURE RELUCTANTLY.

BUILD FYD DIFFERENTIATION DELIBERATELY.

DO NOT OPTIMIZE THE WEBSITE AT THE EXPENSE OF THE ENTITY.

DO NOT OPTIMIZE THE ARCHITECTURE AT THE EXPENSE OF THE CUSTOMER.

## Close the loop

CLOSE:

URL
→ UNDERSTANDING
→ BEAUTIFUL USEFUL PRESENCE
→ ASK
→ TRUST
→ CORRECT
→ CUSTOMIZE
→ REGENERATE.

THEN PUT A HUMAN IN FRONT OF IT.

GO.

---

## Why Nolan is making those calls (his rationale, 2026-09-25)

Media: download-and-derive is the better architecture for the authorized demos because it gives FYD stable performance, deterministic derivatives and provenance. But it would be wrong to generalize that into "anything publicly visible is ours to mirror." Media needs its own acquisition-rights boundary.

Owner gate: build the seam, not the identity product. A fake-but-explicit DEMO_OWNER_MODE lets you test the thing that remains uncertain — the product — without pretending the authentication problem has been solved.

Ask FYD: make this real now. The benchmark describes a future operating system where signals become actions and outcomes. Ask FYD is the first place the underlying evidence/object architecture becomes visible as customer value rather than infrastructure. A normal site chatbot can answer from scraped prose; FYD should answer from objects, traverse relationships, expose evidence, notice conflicts and eventually propose authorized changes.

Metrics: mobile, services, contact and performance establish that FYD can make a competent website. Editability, safe regeneration and evidence establish why FYD isn't just another website generator.

Ecosystem validation: Brandwatch markets a connected suite across consumer intelligence, search intelligence, social management and influencer marketing; Later has combined influencer marketing, social management, listening and creator commerce; Ahrefs' Brand Radar spans AI answers plus search/web, YouTube, Reddit and TikTok. The market is converging toward connected signals. The architectural opportunity is to make those signals subordinate to an evidence-backed entity rather than making the entity subordinate to a marketing dashboard.

Crawling discipline: Crawl4AI's September 23, 2026 release (0.9.4) fixed two SSRF paths and an environment-variable trust-boundary bypass while substantially changing its pruning implementation. That is why FYD consumes mature, patched commodity infrastructure behind a narrow adapter instead of accumulating its own crawler security surface.

Core architectural test for every decision from here: does this work make the underlying entity more understandable, trustworthy, editable, actionable, or portable — or are we merely making today's webpage prettier? If it is only the latter, it should lose priority.
