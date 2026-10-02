# FYD — Mobile Static-Scroll Product Directive

Nolan's binding steering, 2026-09-23 ~15:05 MDT. Delivered through the FYD lane's existing coordination mechanism (directive file + lane memory). No new coordinator created.

## Operator context (Nolan's framing, recorded verbatim in spirit)

Current web-platform work gives us plenty of sophisticated primitives later (container style queries, dialogs/popovers, view transitions, scroll-driven animation), but none requires us to animate the core mobile shell. MDN also explicitly notes that unnecessary animation costs processing and can degrade mobile performance.

This directive REVISES the mobile dock/constellation direction from the 14:50 mobile rebuild directive. The constellation geometry work is not discarded as a concept, but the persistent floating dock / scroll-chasing constellation on mobile is OUT. Mobile = stable document scroll. ALL OBJECTS as an explicit user-requested sheet SURVIVES.

---

FYD — MOBILE STATIC-SCROLL PRODUCT DIRECTIVE

GET TO WORK.

CURRENT MOBILE DIRECTION IS NOT AMBITIOUS ENOUGH IN PRODUCT THINKING,
AND TOO AMBITIOUS IN THE WRONG VISUAL DIRECTION.

THE PHONE EXPERIENCE SUCKS IF THE UI MOVES AROUND WHILE I SCROLL.

CHANGE THAT NOW.

WHEN I SCROLL THE FYD SITE:

THE SITE STAYS A SITE.

NO FLOATING OBJECT CONSTELLATION.

NO DOCK CHASING ME.

NO STICKY/FIXED OVERLAY COVERING CONTENT.

NO SCROLL-DRIVEN REPOSITIONING OF PRIMARY OBJECTS.

NO PARALLAX.

NO HERO SHRINKING INTO ANOTHER MODE.

NO CONTINUOUS ANIMATION TIED TO SCROLL.

NO "CLEVER" MOBILE CHROME.

CONTENT MOVES NATURALLY WITH DOCUMENT SCROLL.

UI GEOMETRY REMAINS STABLE.

FAST.

CALM.

OBVIOUS.

NATIVE.

ONE-HANDED.

CONTENT-FIRST.

The innovation is NOT objects flying around.

The innovation is:

THIS PAGE WAS GENERATED FROM REAL OBJECTS.

EVERY OBJECT IS INTERACTIVE.

FYD UNDERSTANDS THEM.

THE OWNER CAN CHANGE THEM BY TALKING.

THE OBJECTS CAN LATER TRAVEL THROUGH PING.

Render FYD Objects naturally inside the document.

Examples:

Business
Service
Person
Location
Project
Post
External Identity.

Cards may be visually excellent.

But they occupy normal document flow.

Tap an object:

→ open its object experience.

Do not require a persistent object overlay.

Keep ONE explicit control:

ALL OBJECTS

Tap it.

Then opening a modal/bottom-sheet object explorer is fine because the
USER REQUESTED IT.

Use native platform semantics where practical:

<dialog> or carefully implemented equivalent.

When open:

background becomes inert
focus is contained correctly
close/back works
scroll belongs to the object explorer.

When closed:

ZERO overlay remains.

Native modal dialogs already provide top-layer and inert-background
semantics across modern browsers.

Same rule.

ASK FYD is a deliberate action.

Tap:

ASK FYD

→ open conversational surface.

Close:

→ return to completely clean site.

Do NOT leave a giant floating Ask FYD bubble obscuring content on every
mobile viewport.

A normal in-flow Ask FYD section is also acceptable.

Desktop may later use:

hover
focus previews
anchored popovers
richer Circle behavior.

The modern Popover API is now broadly available and handles useful
invoker/focus relationships.

But MOBILE ≠ SHRUNK DESKTOP.

Phone gets the simplest interaction model:

SCROLL
TAP
OPEN
ACT
BACK.

YES:

use legitimately public business-site media for the authorized demo.

Prefer:

ACQUIRE
→ DIGEST
→ PRESERVE SOURCE/PROVENANCE
→ CREATE FYD DERIVATIVE
→ SERVE CONTROLLED DERIVATIVE.

Do not make customer FYD experiences permanently dependent on third-party
hotlinks.

Preserve:

source URL
observed timestamp
digest
media type
dimensions
derivative relationship
usage/provenance metadata.

Do not imply FYD owns the underlying copyright merely because it
processed the media.

DO NOT fake authentication and accidentally turn the fake into product
architecture.

For the immediate local/demo proof:

explicit DEMO OWNER MODE is acceptable ONLY if:

visibly labeled
local/demo scoped
cannot be mistaken for production authorization
cannot create externally consequential effects
logged as non-production auth.

Then wire actual owner authentication before exposing owner mutations to
real users.

PING identity/capability machinery should ultimately own authorization.

FULL EVIDENCE-BOUNDED Q&A.

Not artificially narrow.

Visitor may ask broadly ABOUT THE NODE.

FYD answers from:

public objects
public relationships
public evidence
allowed derived context.

If evidence is insufficient:

SAY SO.

Do not fill gaps with plausible business copy.

This is one of our differentiators.

Do not plaster provenance controls over every card.

Provenance is infrastructure first and UX on demand.

Normal visitor:

sees clean experience.

When useful:

Why this?
Source
Evidence
Last observed.

Owner correction UI can expose provenance more prominently.

The pipeline does NOT own presentation policy.

Owner does.

Example:

FYD observes a street address.

Observation remains evidence.

Publication is a separate visibility decision.

Owner can choose:

PUBLIC
HIDDEN

and later richer policies if justified.

The pipeline may choose a conservative default for potentially sensitive
fields.

But OWNER OVERRIDE wins within permitted policy.

Do not confuse:

WHAT FYD KNOWS

with:

WHAT FYD PUBLISHES.

DO NOT INVENT ClaimVerificationAuthority.

Use the existing evidence/object/projection model.

The renderer must not author factual truth.

Renderer receives renderable claims/facts already bound to evidence.

Binding verifier enforces:

FACTUAL OUTPUT
→ SOURCE OBJECT/FIELD
→ EVIDENCE.

Generated presentation copy must be explicitly typed as GENERATED COPY
and cannot silently become a factual claim.

The renderer's job is:

PROJECT.

Not:

DECIDE TRUTH.

Build ONE excellent adaptive FYD design system.

Not two customer themes.

Not per-business CSS.

Use:

object semantics
media availability
content density
capabilities
SiteSpec
design tokens
container behavior

to compose the experience.

Current 2026 web-platform improvements make container-aware component
design increasingly powerful; use those primitives where support and
fallbacks are appropriate rather than creating JavaScript layout
machinery.

LOCK THESE:

MOBILE UX
SERVICE/OBJECT DISCOVERABILITY
CONTACT/ACTION DISCOVERABILITY
PERFORMANCE
TRUST / NO INVENTED CLAIMS
OWNER CUSTOMIZATION
ASK FYD USEFULNESS

Generated visual novelty is NOT a must-win metric.

Do not confuse a static mobile layout with a static PRODUCT.

The page geometry can be calm while the substrate is extraordinarily
dynamic.

FYD Object
↓
Evidence
↓
Relationships
↓
Capabilities
↓
Renderer
↓
Human interaction
↓
Ask FYD
↓
Proposal
↓
Owner approval
↓
Transition
↓
Regeneration.

THAT is innovation.

If we preserve the substrate correctly, later we can add:

different themes
richer desktop interactions
Circle embeds
campaigns
public-social resolution
ActivityPub
ATProto
Nostr
MCP
agent workers
commerce
booking
advertising
personalized projections
native mobile
desktop applications.

WITHOUT rebuilding canonical business knowledge.

That's why we're building objects/evidence/capabilities instead of a
website generator full of bespoke JSX.

I WANT THE PHONE NOW.

Test:

320
360
375
390
430.

For each:

load
scroll top → bottom
scroll bottom → top
tap objects
open/close All Objects
open/close Ask FYD
contact action
navigation
back
orientation where practical.

During ordinary scrolling:

ZERO PERSISTENT CONTENT-COVERING OVERLAYS.

ZERO HORIZONTAL OVERFLOW.

ZERO LAYOUT JUMP.

ZERO OBJECT REPOSITIONING CAUSED BY SCROLL.

ZERO ACCIDENTAL MODAL state.

Do not add animation merely because modern browsers can run it.

Where transitions genuinely clarify a state change:

prefer compositor-friendly transform/opacity behavior and respect
prefers-reduced-motion.

But ordinary page scrolling requires NO animation system. CSS/transform
animations can be efficient, but unnecessary animation still consumes
resources and can degrade UX.

REMOVE/disable mobile floating constellation/dock behavior.
MAKE MOBILE DOCUMENT FLOW COMPLETELY STABLE.
INGEST REAL AUTHORIZED MEDIA FOR BOTH BUSINESSES.
GENERATE RESPONSIVE MEDIA DERIVATIVES + PROVENANCE.
APPLY ONE GENERIC MEDIA-aware hero/component system.
BUILD/REFINE FYD OBJECT CARDS IN NORMAL FLOW.
ALL OBJECTS → explicit modal/sheet.
ASK FYD → explicit interaction surface.
RUN 320/360/375/390/430 + desktop matrix.
PROVE BOTH BUSINESSES INHERIT EVERYTHING AUTOMATICALLY.
PUT IT ON THE PRIVATE DEV PATH SO NOLAN CAN USE IT ON HIS PHONE.
STOP.

GET NOLAN'S EYES ON IT.

THIS IS IMPORTANT.

I WANT RAPID HUMAN FEEDBACK.

Build the smallest coherent version.

Serve it.

Let Nolan use:

HAPPY PLACE
and
COPPERSMITH

on his actual phone.

THEN iterate from what feels bad.

FYD IS NOT TRYING TO BUILD THE MOST ANIMATED WEBSITE BUILDER.

FYD IS TRYING TO BUILD THE MOST INTELLIGENT WEBSITE BUILDER.

THE PAGE SHOULD FEEL SIMPLE.

THE SYSTEM UNDERNEATH SHOULD BE POWERFUL.

A CUSTOMER SHOULD EXPERIENCE:

"FYD ALREADY UNDERSTANDS MY BUSINESS."

"FYD BUILT THIS FROM WHAT I ALREADY HAD."

"FYD CAN EXPLAIN WHERE IT GOT THIS."

"FYD LETS ME FIX IT."

"FYD LETS ME CHANGE THE SITE BY TALKING."

"FYD KEEPS IT CURRENT."

Later:

"FYD CONNECTS THIS BUSINESS TO THE REST OF MY DIGITAL WORLD."

THAT IS AMBITIOUS.

FLOATING BALLS ARE NOT.

BUILD THE PRODUCT.

GET IT ON THE PHONE.

GO.

---

## Operator addenda (binding, Nolan's coda to this directive)

1. Core architecture answer behind all of this: the website is not the asset. The durable asset is evidence → objects → relationships → owner decisions → capabilities → outcomes. The renderer must remain replaceable. That is what gives FYD the optionality to radically change its visual system later without re-ingesting or re-understanding the customer's business.

2. Pig ops decision (binding): the Pig should never sleep on AC while it is acting as the development/automation host, with normal sleep behavior restored when it is not in that role. Wake locks are defense-in-depth for bounded jobs, but host sleep has already proven it can destroy browser targets mid-run; do not make every worker individually responsible for keeping the machine alive.

3. Supersession note: this directive revises the 14:50 mobile rebuild directive. The persistent floating constellation/dock on mobile is OUT. These survive: ALL OBJECTS explicit sheet, Ask FYD as deliberate surface, constellation concept for desktop/non-scroll contexts only if it does not chase or overlay, one contact value with Copy+Call, media pipeline + deterministic contrast, both-businesses inheritance, test matrix.
