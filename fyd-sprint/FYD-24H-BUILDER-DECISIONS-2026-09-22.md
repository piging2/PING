# FYD — 24-Hour Builder Decisions

Issued by Nolan, 2026-09-22 ~20:20 MDT. Verbatim record. Answers all 10 chat questions plus two earlier questions (media, owner auth). Binding on the FYD sprint coordinator; supersedes defaults where they conflict.

## Nolan's decisions on all 10

**Owner test URL** — use a temporary Tailscale Funnel for the external owner; use Tailscale Serve for us internally. Do not block on Vercel. We already lost time to Vercel permissions. Funnel exists specifically for temporary public sharing of a local service and gives HTTPS without making FYD's deployment architecture depend on Vercel. Restrict the preview itself with an unguessable expiring invite/session token, expose only the demo app — not admin/gateway/journal endpoints — and turn Funnel off after the test. For our own phone/laptop testing, use Serve because it stays inside the tailnet and ACLs apply.

**Owner contact** — draft it; Nolan sends it. No autonomous business outreach. Make it extremely simple: "We made an experimental evidence-backed version of your web presence from your public website. Could you spend 10 minutes telling us what it got wrong?" Do not sell PING architecture. The test is correction behavior.

**No owner by deadline** — engineering proof banks, product gate stays OPEN. Do not call the sprint a miss technically, and absolutely do not call external validation complete. Report CORE LOOP = VERIFIED, EXTERNAL OWNER VALIDATION = BLOCKED/NOT RUN. Then external owner validation becomes the next product priority, not another architecture wave.

**Ask FYD** — use the existing local Ollama path first, provided the installed model passes a tiny evidence-grounding acceptance test. The model is not the authority. Retrieval/context assembly must deterministically supply the allowed facts/evidence; the model synthesizes the answer. Test unsupported questions, citation correctness, and refusal/unknown behavior. If the local model cannot meet that bar, use the already-approved model path rather than weakening the product just to stay local. No new AI routing system.

**Frozen 12** — yes to 12, but don't optimize around a vanity 4/4/4 score. Freeze the URLs before results, exclude active prospects, and deliberately include ugly cases: clean JSON-LD, @graph, sparse HTML, WordPress, JS-heavy, multi-location, conflicting metadata, weak/no structured data. The purpose is to discover the acquisition frontier. Current crawler options are improving rapidly: Cloudflare now exposes a Browser Rendering crawl API, while Crawl4AI's current 0.9.3 is a security-focused release — useful evidence that commodity crawling is becoming harvestable rather than something FYD should own.

**Sparse truth vs rich preview** — neither extreme. Use a typed content contract. Direct/owner-confirmed facts may render as facts. Derived facts render when derivation is deterministic. Generated presentation copy may make the experience rich, but its factual atoms must bind to evidence. Unsupported factual atoms fail the binding verifier. This preserves the key advantage: beautiful enough to sell, but no invented business claims.

**Owner assertions** — use the pragmatic tenant-scoped store now, with event append, but make the semantic contract explicit. Don't derail the sprint migrating storage. Owner correction needs subject/object, field/path, operation, value, actor, timestamp, supersedes, evidence/source basis, and visibility. The event is the durable audit seam; the current store is the operational projection until convergence proves the final canonical representation. Most importantly, owner assertion must outrank regenerated source presentation without destroying the original observation.

**Correction UI** — contextual overlay, absolutely. WHY THIS?, CORRECT, HIDE, and eventually CONFIRM belong beside the thing being corrected. A separate owner console recreates CMS administration. FYD's UX thesis is that the website itself is the editing surface. Owner mode should be visually obvious and impossible for visitors to invoke.

**Re-observation** — manual now. One button is enough to prove the hard semantics: observe again → diff → affected objects → regeneration proposal → owner overrides survive. Scheduling adds almost zero proof value today.

**Puck** — read-only projection only for this sprint. Do not introduce a second editing authority. First prove SiteSpec → Puck config is clean enough that Puck could become an optional visual editor. A future round trip must be Puck edit → typed SiteSpec patch → validation → proposal/authorization → apply, never Puck owning canonical business state.

## Two earlier questions — firm answers

**Media**: download/cache public business-site media for the demo only when the source's use is appropriate and the demo is authorized, preserve source URL/digest/provenance, generate derivatives, and keep source media distinct from owner-uploaded media. Don't make permanent republication rights assumptions from "publicly accessible." If rights are uncertain, hotlink/reference for the internal proof or omit it. FYD eventually needs a proper media provenance object, not anonymous copied blobs.

**Owner auth**: for the external owner test, do not fake an owner-mode toggle that anybody with the URL can activate. Use an expiring owner invitation/session separate from visitor mode. Full production auth is unnecessary for this sprint, but the authorization boundary must be real enough that a random visitor cannot write corrections.

## What the coordinator must do — FYD 24-Hour Builder Decisions

FYD — DECISIONS LOCKED

THE GOAL IS NOT THE MOST FEATURED WEBSITE BUILDER.

THE GOAL IS THE MOST LEVERAGED BUILDER:

EXISTING DIGITAL PRESENCE
→ EVIDENCE
→ OBJECT GRAPH
→ GENERATED EXPERIENCE
→ OWNER CORRECTION
→ CONVERSATIONAL CHANGE
→ RE-OBSERVATION
→ SAFE REGENERATION.

Everything we build should increase OPTIONALITY downstream.

### PREVIEW / OWNER URL

DO NOT WAIT ON VERCEL.

INTERNAL TESTING: TAILSCALE SERVE.

EXTERNAL OWNER TEST: TEMPORARY TAILSCALE FUNNEL.

Expose ONLY the FYD preview surface.

Add an expiring owner invitation/session.

Visitor with URL must NOT automatically receive owner capabilities.

No gateway admin endpoints.
No journal.
No internal diagnostics.
No raw evidence store.
No development filesystem access.

Disable Funnel after test.

Vercel/cloud deployment remains later productization.

### OUTREACH

DRAFT OUTREACH.

NOLAN SENDS IT.

NO AUTONOMOUS EXTERNAL OUTREACH.

Ask for 10 minutes of correction/testing, not a sales meeting.

The key question:

"WHAT DID FYD GET WRONG?"

If external owner does not materialize:

CORE LOOP may be VERIFIED.

EXTERNAL OWNER VALIDATION remains OPEN.

NO GRADE INFLATION.

DO NOT respond by starting another architecture wave.

Find the owner.

### ASK FYD MODEL

LOCAL OLLAMA FIRST IF CURRENTLY PROVISIONED AND CAPABLE.

Acceptance test before product wiring:

SUPPORTED QUESTION
→ correct answer + correct evidence

PARTIALLY SUPPORTED QUESTION
→ bounded answer + uncertainty

UNSUPPORTED QUESTION
→ says evidence does not establish it

CONFLICTING SOURCES
→ exposes conflict

NO model may manufacture authority.

Context builder determines permitted evidence.

Model synthesizes.

### FROZEN 12

FREEZE BEFORE RUNNING.

Exclude active prospects.

Optimize for FAILURE DIVERSITY.

Include:

structured JSON-LD
@graph
WordPress
sparse site
JS-heavy site
multi-location
conflicting metadata
weak/no structured data
social-link-rich site
service-rich site.

Measure the acquisition frontier.

DO NOT manually repair individual sites.

Every useful failure becomes:

GENERIC FIX
or
KNOWN LIMITATION.

### CONTENT CONTRACT

Do NOT choose between:

UGLY TRUTH

and

BEAUTIFUL HALLUCINATION.

Classify output:

OWNER_ASSERTED
DIRECT_EVIDENCE
DETERMINISTIC_DERIVATION
GENERATED_PRESENTATION
UNKNOWN.

Generated presentation may be rich.

Generated factual atoms must bind to evidence.

Binding verifier owns this invariant.

Renderer may only consume VERIFIED render models.

NO CLAIM CHECKING IN REACT COMPONENTS.

### OWNER ASSERTIONS

USE THE PRAGMATIC TENANT-SCOPED STORE FOR THIS SPRINT.

EVERY MUTATION ALSO PRODUCES THE EXISTING EVENT/AUDIT RECORD.

Do not claim the temporary store is constitutional truth.

Owner correction semantics must preserve:

actor
subject/object
field/path
operation
value
visibility
timestamp
superseded assertion
source/evidence relationship.

Critical invariant:

RE-OBSERVATION NEVER DESTROYS OWNER INTENT.

### CORRECTION UI

CORRECT IN CONTEXT.

OWNER MODE OVERLAYS THE GENERATED SITE.

For relevant facts:

WHY THIS?
CORRECT
HIDE
CONFIRM where valuable.

NO CMS DASHBOARD.

NO MISSION CONTROL FOR PLUMBERS.

Visitor mode sees the website.

Owner mode sees the same website plus controls.

### RE-OBSERVATION

MANUAL BUTTON.

Prove:

OBSERVE T1
→ SITE

OWNER CORRECTS X

OBSERVE T2
→ SOURCE DIFF

→ REGEN

OWNER X SURVIVES.

THAT is more important than scheduling.

### PUCK

READ-ONLY PROJECTION PROOF ONLY.

SiteSpec
→ Puck configuration.

Do not make Puck another authority.

Future:

Puck interaction
→ typed SiteSpec patch
→ validation
→ proposal
→ authorization
→ apply.

If Puck cannot live behind that boundary:

reject it.

### MEDIA

HARVEST EXISTING PING MEDIA CODE FIRST.

Media requires provenance.

Track at minimum:

source
digest
media type
dimensions
observation
derivative relationship
ownership/authorization status where known.

Do not silently turn:

PUBLICLY VIEWABLE

into:

FYD OWNS PERMANENT REPUBLICATION RIGHTS.

For uncertain external media:

reference/hotlink/omit as appropriate for the proof.

For authorized demo media:

cache + digest + generate derivatives if useful.

PIPELINE DOES NOT OWN THE BUSINESS'S PRESENTATION DECISION.

Extraction records the address and source visibility.

Projection applies policy.

Owner may explicitly:

SHOW
HIDE
CORRECT.

Owner decision becomes persistent assertion.

Private personal addresses remain fail-closed.

Business address from public business evidence may be suggested for display, but owner remains decision authority.

### TRUTH BOUNDARY

DO NOT CREATE ClaimAuthority.

Existing evidence/object machinery + binding verifier owns the invariant.

Required boundary:

EVIDENCE GRAPH
↓
BINDING VERIFIER
↓
VERIFIED RENDER MODEL
↓
SITE SPEC / RENDERER.

Every factual render atom has:

VALUE
CLASSIFICATION
EVIDENCE_REF or OWNER_ASSERTION_REF.

Renderer is intentionally dumb.

It cannot invent facts.

### DETERMINISM

LOCK THE PROPERTY:

same
ObjectGraph

SiteSpec
OwnerAssertions
ViewerContext
renderer version

→ same semantic render model.

Wall-clock time must not affect semantic output.

Random IDs must not affect semantic output.

Input ordering must not affect semantic output.

Generated timestamps belong outside semantic digest unless explicitly part of content.

Add the committed regression test.

### PLANNER

KEEP IT BORING.

Start with deterministic eligibility/composition:

OBJECT TYPES
RELATIONSHIP TYPES
CARDINALITY
CAPABILITIES
OWNER OVERRIDES

→ eligible sections.

Then deterministic ranking.

Only use AI where composition is genuinely ambiguous or creative.

Do not build an AI page-planning operating system.

The planner should be replaceable.

SiteSpec is the durable boundary.

### DESIGN

ONE DESIGN SYSTEM.

NOT one template per customer.

NOT one universal boring page.

Components respond to:

schema
density
relationships
media
capabilities
SiteSpec presentation parameters.

Business A and Business B may legitimately share Hero.

They should diverge when their graphs justify divergence.

Once both sites are usable:

STOP POLISHING.

### CONCIERGE WIRING

Wire:

RENDERED OBJECT
→ ASK FYD
→ BOUNDED CONTEXT
→ EVIDENCE-BACKED RESPONSE.

Then:

"What services do you offer?"

"How do you know?"

"Which source disagrees?"

"Change this."

This is the beginning of the concierge.

### CRAWLER

Do not replace acquisition because newer tools exist.

The current stack already proved real websites.

Use the frozen 12 to expose the boundary.

Only when it fails on a meaningful class:

benchmark existing stack
vs mature crawler/browser options.

HARVEST COMMODITY CAPABILITY.

FYD owns semantic understanding, not browser engineering.

### AUTHORITY GRADIENT

AUTHORITY SHOULD BE INVISIBLE UNTIL CONSEQUENCE REQUIRES IT.

READ:
instant.

LOCAL PRESENTATION CHANGE:
fast proposal/undo.

PUBLIC FACTUAL CHANGE:
explicit confirmation.

EXTERNAL PROVIDER WRITE:
capability + confirmation as required.

MONEY / MESSAGE / IRREVERSIBLE ACTION:
strong approval.

The user is a CUSTOMER for low-risk work.

The user becomes SUPERVISOR only when consequences justify it.

### PROJECTION ARCHITECTURE

Do not optimize SiteSpec merely for websites.

The architecture is:

SOURCE WORLD
↓
EVIDENCE GRAPH
↓
OWNER-VERIFIED OBJECT GRAPH
↓
INTENT / CAPABILITIES
↓
PROJECTIONS.

Today projection:

WEBSITE.

Tomorrow:

CIRCLE
MOBILE
SEARCH
SOCIAL FEED
ACTIVITYPUB
ATPROTO
NOSTR
MCP
VOICE CONCIERGE
CAMPAIGNS
MARKETPLACE
BUSINESS AUTOMATION.

That is why the object/evidence layer matters.

WE ARE NOT BUILDING FIFTEEN PRODUCTS NOW.

WE ARE MAKING TODAY'S WEBSITE PROOF A VALID FIRST PROJECTION OF THE SYSTEM THAT CAN SUPPORT THEM LATER.

### THE OWNER TEST

A REAL OWNER opens their FYD.

They immediately recognize their business.

They ask:

"Why does it say this?"

FYD shows the source.

They correct something.

It changes.

They say:

"Move emergency service up."

FYD proposes it.

They approve.

It changes.

We re-observe their source.

FYD finds new information.

Their correction survives.

Then they say:

"THIS SAVES ME WORK."

THAT IS THE TEST.

Everything else is subordinate.

GO.

## Why this is the future-proof choice (Nolan)

The core architectural bet isn't Puck, Ollama, Vercel, Tailscale, Crawl4AI, or any other particular dependency. Those should remain replaceable commodity edges. Even deployment should remain replaceable: Vercel supports protected previews, but we don't need to let a Vercel permission failure block product discovery.

The durable asset is the chain:

evidence → owner-verified objects → relationships → intent/capabilities → projections → outcomes.

That gives FYD an escape hatch from almost every product decision we might get wrong. Replace the crawler without changing business truth. Replace the LLM without changing evidence. Replace the visual editor without changing SiteSpec. Replace the renderer without changing the graph. Add ActivityPub without redefining identity. Add mobile without duplicating business data. Add a concierge without scraping rendered HTML back into context.

That's the optionality worth paying architectural cost for. Everything else should stay brutally replaceable.
