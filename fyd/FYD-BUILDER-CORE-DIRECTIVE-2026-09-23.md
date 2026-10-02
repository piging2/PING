# FYD Builder — Product Core Directive

Nolan's binding steering, 2026-09-23 ~15:13 MDT. Delivered through the FYD lane's existing coordination mechanism (directive file + lane memory). No new coordinator created.

## Operator context (Nolan's live report, verbatim)

"IT HASN'T CHANGED MAKE THEM ON THE PAGE IN ONE SPOT NOT FOLLOWING YOU"

Nolan is on his phone looking at the current FYD site and the floating object constellation/dock is still following him while scrolling. The static-scroll directive has not been implemented in what he is viewing. Immediate action required: remove the scroll-following behavior now, make objects live in one spot on the page.

## Ecosystem assessment (Nolan's, recorded)

Current builder/generative-UI ecosystem: the strongest recent pattern converges toward typed intermediate representations instead of generated application code. OpenPage uses typed JSON shared by its visual editor and agent API; Object UI renders schemas/metadata into React; OpenUI uses a compact renderer-agnostic UI language; Tambo registers components with schemas and lets agents select/stream them. MCP Apps has become an official extension for shipping interactive UI from tools while keeping actions on the protocol's auditable/consent path.

That reinforces FYD's architecture rather than changing it: evidence/object graph → typed SiteSpec → deterministic renderer, with intelligence generating/proposing the spec rather than writing arbitrary React.

Nolan's four decisions on the outstanding builder questions:

1. MEDIA: ingest/cache authorized public demo media into a provenance-preserving FYD media pipeline rather than depending on hotlinks. Retain original source URL / digest / license-or-use basis; generate derivatives. Do not treat "publicly visible" as blanket reuse rights.
2. OWNER GATE: wire the smallest real owner authentication/authorization path already possessed. Do not ship a fake owner toggle that can accidentally become product architecture. If real auth cannot fit this slice, make demo mode unmistakably local/dev-only and incapable of production authorization.
3. ASK FYD: full evidence-bounded Q&A with explicit unknown/refusal behavior. Core product, not garnish.
4. MUST-WINS: mobile usability, service/action discoverability, contact/conversion path, and time-to-useful-presence/performance. Visual novelty is secondary.

---

FYD — BUILDER CORE IS NOW THE FOCUS

THE MOBILE DIRECTIVE IS CORRECT AND REMAINS BINDING.

MOBILE:

SCROLL
→ TAP
→ OPEN
→ ACT
→ BACK.

NO persistent floating constellation.
NO architecture visualization chasing the user.
ONE explicit All Objects control.
Ask FYD is deliberate.
Objects live naturally in document flow.

Desktop may explore richer spatial interaction later.

THE WEBSITE IS A PROJECTION.

THE DURABLE ASSET IS:

SOURCE EVIDENCE
→ OBJECTS
→ RELATIONSHIPS
→ OWNER DECISIONS
→ CAPABILITIES
→ ACTIONS
→ OUTCOMES.

SiteSpec is an intermediate representation.

Renderer is replaceable.

Today's React renderer can eventually coexist with:

mobile renderer
embed/Circle renderer
MCP App
ActivityPub projection
agent interface
future spatial interface
future renderer we have not invented yet.

THIS OPTIONALITY IS WHY WE ARE BUILDING THE SUBSTRATE.

MEDIA

USE A FYD-CONTROLLED MEDIA PIPELINE FOR MEDIA WE ARE AUTHORIZED TO
PROCESS.

Prefer:

SOURCE MEDIA
→ ACQUIRE
→ DIGEST
→ PROVENANCE
→ NORMALIZE
→ DERIVATIVES
→ FYD MEDIA OBJECT
→ RENDER.

Preserve:

original source URL
observed_at
content digest
MIME/type
dimensions where available
ownership/use basis where known
derived asset relationship.

DO NOT make customer sites depend permanently on third-party hotlinks.

BUT:

PUBLICLY VISIBLE != UNLIMITED REUSE RIGHTS.

Do not infer broad licensing merely because an image can be fetched.

For current owned/authorized demo sources, proceed within that scope.

Search PING media machinery FIRST.

Do not invent another asset system if one exists.

OWNER GATE

USE REAL EXISTING OWNER AUTHORITY IF IT CAN BE WIRED SMALL.

Do not create FakeAuthAuthority.

Do not create a production-looking toggle that actually means:

trust me.

Desired path:

AUTHENTICATED IDENTITY
→ OWNER RELATIONSHIP
→ CAPABILITY
→ OWNER ACTION.

If existing real authentication cannot be safely wired in this slice:

DEV OWNER MODE may exist ONLY as an explicit local/dev harness.

It must:

be visibly marked
fail closed outside dev
never masquerade as authentication
never authorize production effects.

Do not let demo scaffolding become security architecture.

ASK FYD

BUILD THE REAL PRODUCT SHAPE NOW:

FULL EVIDENCE-BOUNDED Q&A.

Ask FYD may:

answer
summarize
compare
explain
navigate
propose.

But factual answers must distinguish:

DIRECT EVIDENCE
DERIVED
INFERRED
UNKNOWN.

When evidence does not support the answer:

SAY SO.

Do not fill the gap with plausible business copy.

Example:

"What emergency services do they offer?"

If evidence proves emergency plumbing:

answer + evidence.

If evidence merely says "plumbing services":

DO NOT upgrade that into 24/7 emergency plumbing.

This is one of FYD's fundamental trust advantages.

MUST-WINS

LOCK THESE FOUR FOR THE CURRENT PRODUCT SLICE:

A. MOBILE USABILITY

B. SERVICE / ACTION DISCOVERABILITY

C. CONTACT / CONVERSION DISCOVERABILITY

D. TIME-TO-USEFUL-PRESENCE + PERFORMANCE

Everything else can lose temporarily.

Do not optimize:

visual novelty
animation
constellations
protocol count
builder feature count

ahead of these.

READ-ONLY FIRST.

Recent ecosystem work strongly validates:

TYPED SITE/UI IR
+
COMPONENT REGISTRY
+
HUMAN + AGENT EDITING
+
DETERMINISTIC RENDERING.

Investigate:

OpenPage
json-render ecosystem
Object UI
OpenUI
Tambo
MCP Apps
mature headless/schema UI systems
existing PING/CascadeProjects builder work.

HARVEST PATTERNS.

DO NOT SWAP FYD'S ARCHITECTURE FOR ANOTHER BUILDER.

OpenPage is particularly relevant because its architecture uses typed
JSON shared between:

VISUAL EDITOR
JSON CONFIG
AGENT API
RENDERER.

Study:

block schema
variants
theme representation
visual editing
agent mutations
export
validation
diffability.

Question:

WHAT CAN FYD HARVEST RATHER THAN WRITE?

But preserve the critical difference:

OpenPage's JSON describes a website.

FYD's canonical substrate describes THE ENTITY'S WORLD.

FYD SiteSpec describes one presentation of that world.

DO NOT collapse:

OBJECT GRAPH

into:

WEBSITE CONFIG.

That distinction is strategic.

Investigate their approaches to:

component catalogs
schema constraints
registry
structured generation
streaming
validation
component selection
prop schemas
safe agent-generated UI.

We may be able to harvest significant commodity rendering/editor
machinery.

The FYD-specific value should remain:

evidence binding
object binding
relationship semantics
capabilities
owner overrides
proposals
outcomes.

MCP Apps is now an official interactive-UI extension.

DO NOT implement it now.

But ensure SiteSpec/component/capability architecture does not prevent:

FYD OBJECT
→ FYD CAPABILITY
→ MCP TOOL
→ INTERACTIVE MCP APP.

This means FYD's components should not secretly depend on:

one Next.js route
one browser global
one customer
one database query
one React page implementation.

Keep domain data outside presentation components.

DO NOT accidentally build another programming language.

SiteSpec should describe:

WHAT TO SHOW
WHERE
WITH WHICH OBJECTS
WITH WHICH PRESENTATION VARIANT.

It should NOT become:

arbitrary JavaScript
business logic
database queries
agent prompts
provider credentials
canonical facts.

Those belong elsewhere.

Every factual rendered element should conceptually resolve:

SITE COMPONENT
→ OBJECT/FIELD
→ CLAIM/EVIDENCE.

This is what the binding verifier is protecting.

The renderer should not invent business facts.

Generated marketing copy must be explicitly classified as generated
presentation and remain traceable to its evidence inputs.

We will NEVER parse the entire web perfectly.

The stronger system is:

FYD THINKS:
123 Main Street

OWNER:
"That's our old address."

FYD:
shows source/evidence

OWNER:
corrects it.

Then:

OWNER-VERIFIED VALUE

survives regeneration.

The source may still be preserved as conflicting historical evidence.

This is how FYD becomes more accurate than the web it ingests.

DO NOT start with:

Choose template.

Start with:

GIVE FYD YOUR URL.

Then:

FYD BUILDS THE FIRST DRAFT.

Only afterward expose customization.

The customer should edit something useful, not assemble something empty.

Support three progressively powerful surfaces.

LEVEL 1 — DIRECT

show/hide
reorder
featured object
variant
basic tokens
edit owner-controlled copy.

LEVEL 2 — CONVERSATIONAL

"Make commercial services more prominent."

"Use the darker logo."

"Hide that old project."

"Put the phone number at the top."

LEVEL 3 — STRUCTURED/ADVANCED LATER

visual composition
more detailed layout
custom components
developer extension.

Do not build Level 3 before Level 1 + 2 are delightful.

User request:

"Make the phone number easier to find."

Do NOT have the model rewrite React.

Pipeline:

REQUEST
↓
CONTEXT
↓
TYPED SITE PATCH
↓
VALIDATE
↓
PREVIEW
↓
APPROVE according to consequence
↓
APPLY
↓
NEW SITE SPEC VERSION
↓
RENDER.

This is enormously important.

AI edits structured intent.

Software performs deterministic mutation.

Do not require ceremonial approval for harmless reversible presentation
changes forever.

Eventually classify actions:

LOW CONSEQUENCE + REVERSIBLE:
apply immediately with Undo.

MEDIUM:
preview/confirm.

HIGH / EXTERNAL / IRREVERSIBLE:
explicit approval.

This preserves PING safety without making the plumber supervise a
constitutional court.

Do not change authority semantics casually tonight.

Build the seam.

Images are not decorative blobs.

Eventually know:

MEDIA M1
depicts → Business B1

MEDIA M2
depicts → Project P4

MEDIA M3
logoOf → Business B1.

Then generator can intelligently choose media instead of asking an LLM:

"Which random image looks nice?"

Preserve provenance.

The winning interaction is not:

drag rectangles for 90 minutes.

It is:

"Build my FYD."

then:

"That's mostly right."

then:

"Put emergency service first."

then:

"Use this photo."

then:

"Hide that."

then:

"Publish."

The system should do the mechanical work.

KEEP THE CURRENT TWO-BUSINESS PROOF.

They are valuable because they force generic behavior.

Each site needs a manageable owner surface containing approximately:

OVERVIEW

what FYD understands.

OBJECTS

business
people
locations
services
links/media.

SITE

sections
order
visibility
variants.

EVIDENCE

only when needed / Why This.

ASK FYD

conversational control.

Do not recreate Mission Control.

This is customer software.

Don't merely render:

Call us.

Resolve actual available actions:

telephone
email
contact form
request quote
directions
schedule

based on evidence + configured capabilities.

Then render the strongest appropriate CTA.

Eventually agents can invoke the same capability surface.

Do not sacrifice basic web quality for AI novelty.

Generated FYD sites should target:

fast initial render
responsive images
minimal client JS where possible
stable layout
accessible semantics
SEO metadata
structured data
sensible caching.

The intelligence belongs mainly in generation/customization.

The visitor should not need an LLM round trip to see the business name.

THIS IS HIGHER PRIORITY THAN VISUAL POLISH.

A business node becomes differentiated when a visitor can ask:

"What services do you provide?"

"Do you work on commercial projects?"

"Where are you located?"

"How do I contact you?"

"Why does FYD say that?"

"What is the difference between these services?"

And get answers grounded in that business's evidence/object graph.

That turns:

WEBSITE

into:

INTELLIGENT PRESENCE.

IF WE KEEP THESE LAYERS CLEAN:

EVIDENCE
OBJECT GRAPH
OWNER STATE
SITE SPEC
CAPABILITIES
RENDERER

then later we can add:

visual editor
more design systems
native mobile
desktop
Circle/embed
MCP Apps
ActivityPub
ATProto
Nostr
commerce
booking
advertising
campaigns
agent swarms
multi-language sites
personalized views
A/B experimentation
incremental regeneration

WITHOUT REBUILDING THE CUSTOMER'S TRUTH.

That is the reason for the architecture.

IMPORTANT CORRECTION:

RESEARCH BROADLY.

HARVEST SELECTIVELY.

For every candidate record:

WHAT PROBLEM IT SOLVES
LICENSE
MATURITY
DEPENDENCY COST
WHAT FYD WOULD DELETE BY USING IT
WHAT NEW COUPLING IT CREATES
BENCHMARK/TEST
ADOPT / ADAPT / REJECT.

We are looking for:

MAXIMUM DELETED FYD CODE PER DEPENDENCY.

Not:

maximum GitHub repos imported.

START/KEEP PRIVATE DEV SERVER ACCESSIBLE TO NOLAN.
BOTH BUSINESS NODES ON PHONE.
MEDIA PIPELINE FROM EXISTING PING MACHINERY.
ASK FYD EVIDENCE-BOUNDED Q&A.
OWNER AUTH/DEV-GATE DECISION IMPLEMENTED SAFELY.
OWNER CONFIRM/CORRECT/HIDE.
CONVERSATIONAL SITE PATCH.
REGENERATION PRESERVES OWNER STATE.
SECOND OBSERVATION.
SHOW ONE REAL BUSINESS OWNER.

Do not allow ecosystem harvesting to block 1–10.

The goal is NOT:

"FYD has the most website-builder features."

The goal is:

A BUSINESS OWNER GIVES FYD WHAT ALREADY EXISTS.

FYD UNDERSTANDS IT.

FYD BUILDS SOMETHING GOOD.

FYD CAN EXPLAIN IT.

THE OWNER CAN CORRECT IT.

THE OWNER CAN CHANGE IT BY TALKING.

FYD KEEPS IT CURRENT.

PEOPLE CAN ACT ON IT.

AND THE UNDERLYING BUSINESS KNOWLEDGE CAN LATER TRAVEL TO ANY SURFACE.

THAT IS THE BUILDER.

BUILD THAT.

---

## Operator addenda (binding, Nolan's coda to this directive)

1. Correction to "harvesting everything": research everything; ingest almost nothing by default. The best recent projects are valuable because they let us delete commodity FYD code. OpenPage is particularly worth dissecting: its JSON-first editor/agent/renderer architecture is close enough to expose what FYD shouldn't reinvent, while FYD's advantage remains that its SiteSpec is not the source of business truth.

2. MCP Apps is strategically bigger than it first appears: interactive tools can now ship standardized UI into compliant AI hosts, with UI-triggered actions following the same protocol/audit path. If FYD keeps objects, capabilities, and presentation cleanly separated, a future business presence does not have to live only at fyd.social/foo; pieces of it can appear inside agent hosts without rebuilding the underlying product.

3. The architecture bet to protect above everything: customer truth ≠ website ≠ SiteSpec ≠ React. Customer truth is the evidence-backed object graph plus owner decisions. Everything else is a replaceable projection. That is what buys the future optionality.

4. Immediate live issue (Nolan on phone, 15:13 MDT): the static-scroll directive is NOT yet live on what Nolan is viewing; floating constellation/dock still follows him. Fix now: remove scroll-following floating behavior; objects in one spot on the page. Verify on an actual mobile viewport before reporting fixed.
