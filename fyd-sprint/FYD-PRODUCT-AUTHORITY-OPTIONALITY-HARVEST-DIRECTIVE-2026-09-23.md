# FYD — Product Authority, Optionality and Harvest Directive

Issued by Nolan, 2026-09-23 07:20 MDT. Verbatim record. Binding on FYD sprint execution and Jev lane. Supersedes defaults where they conflict.

## Decisions

**UI TEST DECISION = A.** GLYPH → PEEK → WORKSPACE STANDS. Retarget the stale oval tests to the current product contract. Do not resurrect obsolete geometry because old tests describe it. Reinstating the oval would make obsolete tests authoritative over the current product decision.

**DEPLOYMENT DRIFT MAP = AUTHORIZED READ-ONLY.** Observe: live image, SHA, container/config, database, routes, event writers, bridge, witness, verdict-shaped events, tenant/namespace behavior. NO: writes, restart, redeploy, DB mutation, trigger mutation, secret output. The trust findings are serious enough that we need exact live topology before prescribing a fix.

## Four builder questions — Nolan's answers

**Media** = ingest public business media into provenance-preserving FYD derivatives, not permanent hotlinks.

**Owner gate** = use the explicit demo owner assertion only for the current proof but keep the contract swappable for real auth.

**Ask FYD** = full evidence-backed Q&A with explicit unknown/refusal when evidence is insufficient.

**Must-wins** = mobile usability, service/contact discovery, performance, and — Nolan adds as the defining fifth metric — truth/correctability. Generated visual novelty is secondary.

## Ecosystem harvest posture

The ecosystem search reinforces the underlying architecture rather than changing it.

- **ATProto**: granular resource/action permissions and human-readable permission sets, including progressive permission requests — strong evidence for FYD's future model of simple owner-facing grants expanding into narrow internal capabilities. Lexicon demonstrates schema-defined records, RPCs, subscriptions and permission sets — the exact kind of schema → behavior optionality FYD should harvest rather than hard-code. HARVEST: schema-defined records, strong references, granular permissions, human-readable permission sets, progressive authorization. This validates FYD's future direction: "Allow FYD to maintain my website" can expand internally into narrow permissions. Do NOT replace PING CapabilityAuthority.
- **Automerge**: remains compelling later for local-first owner customization because its documents can persist locally and synchronize/merge independently, but it should not enter this sprint until we actually need concurrent/offline editing. KEEP ON SHELF.
- **Fedify**: just shipped a security fix for an actor/key ownership-validation flaw on September 22 — a timely warning against inventing federation authentication ourselves. HARVEST PROTOCOL IMPLEMENTATION. Do not implement federation authentication ourselves. Recent Fedify security work is a warning: cryptographic signature verification is insufficient if the key-to-actor binding itself is not independently verified. THIS IS DIRECTLY RELEVANT TO THE TRUST-LAUNDERING FINDINGS.

## Directive

DO NOT CONFUSE FYD WITH A WEBSITE BUILDER.

THE WEBSITE BUILDER IS ONE COMPILER TARGET.

We are harvesting HPP, PING website, Monument View, TenantOS, PING, CascadeProjects and the surrounding ecosystem because we are trying to find the smallest reusable object substrate that gives FYD maximum OPTIONALITY.

The system we actually want is:

REAL-WORLD ENTITY
↓
SOURCES
↓
OBSERVATIONS
↓
EVIDENCE
↓
CLAIMS
↓
OBJECTS
↓
RELATIONSHIPS
↓
CAPABILITIES
↓
EXPERIENCES
↓
ACTIONS
↓
OUTCOMES.

Website is an EXPERIENCE.

Circle is an EXPERIENCE.

Feed is an EXPERIENCE.

Concierge is an EXPERIENCE.

ActivityPub is a PROJECTION.

ATProto is a PROJECTION/ADAPTER.

Future mobile app is an EXPERIENCE.

Future marketing campaign is an ACTION PLAN.

Do not let any one surface define the substrate.

NOT THE BROWSER.

NOT A HUMAN EYEBALL.

NOT AN LLM.

NOT A SECOND "ClaimAuthority."

The invariant belongs at the:

OBJECT/EVIDENCE → PROJECTION

boundary.

We already have a binding verifier.

THAT is the right seam.

Strengthen that contract rather than creating another authority.

Every factual presentation binding must resolve to one of:

DIRECT_EVIDENCE
DERIVED_EVIDENCE
OWNER_ASSERTION
GENERATED_PRESENTATION.

Generated presentation may transform supported facts.

It may NOT silently manufacture factual predicates.

Example:

Evidence:
service.name = "Emergency Plumbing"

Allowed presentation:

"Emergency Plumbing"

Potentially allowed generated presentation:

"Need emergency plumbing?"

because it is presentation around a supported service.

NOT allowed without evidence:

"24/7 Emergency Plumbing"

if 24/7 was never observed or owner-asserted.

The binding verifier must operate over the SEMANTIC RENDER MODEL before framework markup.

Renderer:

ObjectGraph
+
EvidenceBindings
+
OwnerOverrides
+
ViewerContext
↓
SEMANTIC RENDER MODEL
↓
BINDING VERIFIER
↓
RENDERER.

If verification fails:

FAIL CLOSED FOR THE UNSUPPORTED CLAIM.

Do not take down the entire site for one unsupported optional sentence unless required for safety.

We care about:

same graph
+
same owner overrides
+
same SiteSpec
+
same viewer context class
+
same renderer version

→ same semantic render model.

NOT byte-identical React hydration IDs.

Separate:

SEMANTIC DETERMINISM

from:

INCIDENTAL MARKUP DETERMINISM.

Canonical tests should hash the semantic render model.

Never include:

request timestamps
random IDs
build timestamps
unstable iteration order
runtime-generated presentation IDs

in semantic identity.

This gives us:

reproducible regeneration
meaningful diffs
safe correction survival
cacheability
replay
cross-platform rendering.

THE OWNER.

The pipeline may provide a CONSERVATIVE DEFAULT.

That is not the same as authority.

Correct model:

OBSERVED FACT:
street address exists.

VISIBILITY POLICY:
default classification.

OWNER OVERRIDE:
publish / hide / restrict.

PROJECTED EXPERIENCE:
policy + owner decision.

Do not delete the address because default policy hides it.

Preserve the evidence.

Example:

Address object/fact
visibility_default = PRIVATE_OR_REVIEW
owner_override = PUBLIC

then the business can publish it.

For a storefront:

PUBLIC may be obvious.

For a person's home address:

PRIVATE should be conservative.

The machine proposes a safe default.

THE OWNER CONTROLS THEIR PRESENTATION within legal/security constraints.

The field-visibility work should therefore live as policy/override metadata over objects or projections, not mutate the underlying evidence.

MOSTLY FYD.

SECONDARILY THE OWNER.

OCCASIONALLY THE VISITOR.

Do not make provenance inspection the hero UX.

The owner wants:

"Make emergency service first."

not:

"Show me your epistemology graph."

WHY THIS exists because it enables:

correction
trust
debugging
conflict resolution
agent grounding
regeneration
customer support
auditability.

Default visitor UI should remain clean.

Owner mode can expose:

Why this?
Source
Correct
Hide.

Ask FYD can expose citations naturally when the user asks:

"How do you know?"

The product moat is NOT a provenance dashboard.

The moat is:

FYD CAN BE CORRECTED BECAUSE IT KNOWS WHERE ITS UNDERSTANDING CAME FROM.

YES.

LOCK IT.

Canonical contract:

render(
graph,
siteSpec,
ownerOverrides,
viewerContextClass,
rendererVersion
)
→ SemanticRenderModel.

Pure where practical.

Sort explicitly.

Stable IDs derived from stable inputs.

No current time unless TIME is explicitly an input.

No global counters.

No random section IDs.

No dependence on previous requests.

No object ordering inherited accidentally from database query order.

Hostile tests:

different process
different request order
different prior tenant
different object insertion order
same inputs.

Semantic model digest must match.

CORRECT.

DO NOT BUILD A GIANT SMART PLANNER.

Start with deterministic eligibility.

Example:

Business exists
→ BusinessSummary eligible.

Service count > 0
→ Services eligible.

Location count > 0
→ Locations eligible.

Person + works_for
→ People/Explore eligible.

Post count > 0
→ Recent/Posts eligible.

request_quote capability
→ Quote CTA eligible.

Owner overrides then determine:

show/hide
order
featured objects.

AI should initially operate ABOVE this deterministic baseline:

"Given these eligible sections, propose a better composition."

AI returns SiteSpec patch.

Software validates it.

This gives us:

DETERMINISTIC BASELINE
+
OPTIONAL INTELLIGENCE.

That is future-proof.

STOP THINKING OF confidence AS A NUMBER.

A bare:

confidence = 1.0

is almost meaningless.

Confidence must never outrank evidence class.

We need a semantic distinction between:

OBSERVED
OWNER_ASSERTED
SIGNED
VERIFIED_BY_AUTHORITY
DERIVED
INFERRED
GENERATED.

A 0.99 inference is still an inference.

A directly signed owner assertion is a different class of knowledge.

Therefore:

DO NOT solve confidence laundering by tuning 1.0 → 0.95.

Fix the provenance/trust class.

The registry answering:

"Is this a known event type?"

does NOT answer:

"Is this event authorized?"

TYPE VALIDATION
!=
AUTHENTICATION
!=
AUTHORIZATION
!=
EVIDENCE VALIDITY.

The live finding proves those concepts are currently conflated on at least one ingress path.

Do not create another authority.

The correct chain is:

INGRESS
↓
AUTHENTICATE ACTOR/SOURCE
↓
AUTHORIZE CAPABILITY
↓
VALIDATE EVENT SCHEMA
↓
VALIDATE TRUST/PROVENANCE REQUIREMENTS FOR EVENT CLASS
↓
GOVERNANCE
↓
PERSIST.

Verdict-shaped events must have stronger admission requirements than ordinary observations.

A client must never be able to self-declare:

VERIFIED.

"Already governed" is not a property that should exist only in prose.

It must be PROVABLE.

Either:

source row carries verifiable governance provenance

or:

bridge re-enters governance.

No evidence:

NO TRUST UPGRADE.

And tenant identity must survive bridging.

tenant A event

must never become:

SYSTEM event

merely because infrastructure moved it.

That destroys provenance and isolation simultaneously.

The dead confidence adapter and dead lineage path are liabilities.

A one-line activation path around constitutional rules is not harmless.

After current live-path mapping:

DELETE
or
make activation require the same authority boundary.

Dead security-sensitive code is future bypass inventory.

Because eventually FYD will ingest:

website
Facebook
ATProto
ActivityPub
Nostr
documents
owner corrections
agent research
customer interactions
business systems.

Without trust classes, all of these collapse into:

"FYD knows X."

BAD.

Instead FYD should know:

WEBSITE OBSERVED X.

OWNER ASSERTED Y.

FACEBOOK REPORTED Z.

AGENT INFERRED Q FROM EVIDENCE E1/E2.

SIGNED EVENT CONFIRMED R.

Then projections decide what to show.

That is the foundation of the concierge.

If HPP teaches us a useful:

Business
Service
Project
Location
Person

object pattern:

harvest it.

If Monument View has better:

property
media
location
offering

semantics:

harvest them.

If TenantOS has useful:

tenant
ownership
visibility
policy
workspace

semantics:

harvest them.

If PING website has useful:

content
product
concierge
knowledge

objects:

harvest them.

DO NOT merge the applications.

Harvest the reusable object semantics.

The goal is:

ONE OBJECT SUBSTRATE

that can generate many experiences.

Business objects today can become:

website sections
search results
Circle cards
Ask FYD context.

Tomorrow the SAME objects can become:

mobile screens
ActivityPub objects
ATProto records
MCP resources
agent tools
campaign audiences
commerce surfaces
advertising objects
voice concierge context.

This is why we care about object correctness more than today's CSS.

For authorized/public business demo media:

INGEST.

Do not rely permanently on hotlinks.

Pipeline:

source media URL
↓
fetch under bounded policy
↓
validate type/size
↓
digest original
↓
preserve source/provenance
↓
derive safe web variants
↓
serve FYD derivative.

Keep original-source reference.

Do not claim ownership of media merely because FYD cached/derived it.

Respect licensing/authorization and source changes.

This gives:

performance
availability
responsive formats
stable generated sites
content-addressability
future mobile reuse.

FOR THIS DEMO:

keep explicit DEMO OWNER MODE.

Label it truthfully.

Do NOT build full authentication merely to unblock the product proof.

But architect:

OwnerAssertionProvider

or equivalent existing seam

so demo assertion can later be replaced by:

real session
WebAuthn/passkey
PING identity signature
enterprise auth.

Do not let demo auth leak into authority semantics.

FULL EVIDENCE-BOUNDED Q&A.

But "full" does NOT mean unrestricted chatbot.

Ask FYD receives:

target objects
related objects
evidence
visibility-filtered facts
viewer context
allowed capabilities.

It answers from those.

When unsupported:

"I don't have evidence for that."

GOOD PRODUCT.

Never hallucinate to appear helpful.

And keeping deterministic Ask FYD while Ollama failed acceptance is the correct sprint decision.

LOCK THESE FIVE:

MOBILE USABILITY
SERVICE DISCOVERABILITY
CONTACT/ACTION DISCOVERABILITY
PERFORMANCE
TRUTH + CORRECTABILITY

Do not optimize for:

most animation
most AI copy
most visual novelty.

FYD should win because:

it understands
it stays current
it can explain itself
it can be corrected
it can act.

RIGHT NOW WE ARE HARVESTING BROADLY.

GOOD.

But every harvest candidate gets classified:

OBJECT SEMANTIC
DATA/ACQUISITION
AUTHORITY/TRUST
CAPABILITY
PROJECTION
UI PATTERN
COMMODITY INFRASTRUCTURE.

Then:

ADOPT
ADAPT
REFERENCE
REJECT.

Do not drag entire applications into FYD.

ATPROTO:

HARVEST:

schema-defined records
strong references
granular permissions
human-readable permission sets
progressive authorization.

This validates FYD's future direction:

"Allow FYD to maintain my website"

can expand internally into narrow permissions.

Do NOT replace PING CapabilityAuthority.

FEDIFY:

HARVEST PROTOCOL IMPLEMENTATION.

Do not implement federation authentication ourselves.

Recent Fedify security work is a warning:

cryptographic signature verification is insufficient if the key-to-actor binding itself is not independently verified.

THIS IS DIRECTLY RELEVANT TO THE TRUST-LAUNDERING FINDINGS.

AUTOMERGE:

KEEP ON SHELF.

Potentially excellent later for:

offline customization
local-first editing
multi-device owner state
collaborative SiteSpec editing.

Do not add it now.

Current canonical event + projection model is sufficient for the current proof.

GLYPH
→ PEEK
→ WORKSPACE

STANDS.

Think of it as progressive disclosure over objects.

GLYPH:
object exists.

PEEK:
understand object quickly.

WORKSPACE:
interact deeply with object + concierge + capabilities.

This can apply to:

person
business
service
post
project
location
agent.

THAT is more valuable than one fixed social-profile geometry.

We are allowed to HARVEST broadly right now.

But implementation remains narrow.

Do not confuse:

LEARNING THE OPTION SPACE

with:

BUILDING THE OPTION SPACE.

Capture findings.

Then current product proof stays:

REAL SOURCE
→ EVIDENCE
→ OBJECT GRAPH
→ GENERATED EXPERIENCE
→ ASK FYD
→ OWNER CORRECTION
→ CONVERSATIONAL CUSTOMIZATION.

## Action list

Choose A and commit Wave 1 after retargeted tests pass.
Run read-only live deployment drift map.
Do not patch confidence until exact live ingress/writer topology is recorded.
Then close verdict-shaped ingress so clients cannot mint verification.
Preserve tenant namespace through bridge.
Remove/protect dead trust-upgrade paths.
Continue harvesting HPP, PING website, Monument View and TenantOS for OBJECT SEMANTICS, not application code bulk.
Media pipeline: PING machinery first, provenance-preserving local derivatives.
Keep demo owner assertion, with replaceable auth seam.
Ask FYD remains evidence-bounded and deterministic until an AI path passes acceptance.
Optimize builder against the five must-win metrics.
Do not resurrect oval UI.

WE ARE NOT BUILDING:

AN AI WEBSITE GENERATOR.

WE ARE BUILDING:

A SYSTEM THAT CAN UNDERSTAND A REAL ENTITY,
REPRESENT IT AS EVIDENCE-BACKED OBJECTS,
LET THE OWNER CONTROL THOSE OBJECTS,
LET INTELLIGENCE REASON OVER THEM,
AND PROJECT THEM INTO WHATEVER EXPERIENCE OR NETWORK COMES NEXT.

THAT is why:

evidence matters.

That is why:

objects matter.

That is why:

capabilities matter.

That is why:

authority matters.

That is why:

determinism matters.

That is why:

we harvest instead of rewrite.

The website builder is the first compelling compiler target.

FYD objects are the asset.

PING is the substrate.

KEEP HARVESTING.

KEEP THE CORE SMALL.

KEEP THE TRUST BOUNDARY REAL.

BUILD OPTIONALITY INTO THE OBJECTS, NOT INTO A GIANT APPLICATION.

GO.

## Nolan's closing notes (kept verbatim)

The recent ecosystem work makes one of your trust findings especially important: Fedify's September 22 release fixed a case where valid cryptography could still authenticate the wrong claimed actor because ownership of the signing key wasn't independently bound back to that actor. That's almost the same architectural lesson your event investigation is exposing: a valid envelope or registered type is not evidence that the semantic claim inside deserves trust.

And ATProto's current permissions work is exactly the future UX I would steal for PING/FYD: internally granular capabilities, externally comprehensible permission bundles, requested progressively as functionality is needed. That preserves all the constitutional machinery while allowing the plumber to experience simply: "FYD can maintain my site, but it needs my approval before publishing externally."

That's the direction I would protect while you harvest HPP, Monument View, TenantOS and PING: don't harvest their apps — harvest the object semantics and proven primitives that make FYD objects richer.
