# FYD — Mobile Object Experience Rebuild

Nolan's binding steering, 2026-09-23 ~14:50 MDT. Delivered through the FYD lane's existing coordination mechanism (directive file + lane memory). No new coordinator created.

## Operator context (Nolan's framing, recorded verbatim in spirit)

It's okay on desktop but it kind of sucks on mobile. Mobile is supposed to look amazing: objects fixed on the side perfectly, not dumb little dots. Always there, all stacked together. We have to be able to have them stacked in there creating a beautiful pictographic artwork, and maybe one ALL OBJECTS type view.

NAMING LOCK (binding): stop calling them PING objects. They are FYD OBJECTS. PING is the business. The product is FYD.

The substrate is now proving itself; mobile is where we need to stop tolerating "technically responsive" and make FYD feel like a native object environment. The existing doctrine already says one persistent entity should project across Circle/Preview/Workspace/Node, and that mobile UX is a current must-win, not a later polish item.

---

## FYD — MOBILE OBJECT EXPERIENCE REBUILD

THE CURRENT MOBILE EXPERIENCE IS NOT GOOD ENOUGH.

DO NOT PATCH LITTLE DOTS.

DO NOT SHRINK DESKTOP UI UNTIL IT FITS.

DO NOT ADD MORE RANDOM FLOATING BUTTONS.

DESIGN THE MOBILE FYD OBJECT EXPERIENCE AS A FIRST-CLASS PRODUCT.

NAMING LOCK:

PING = BUSINESS / PLATFORM / SUBSTRATE.

FYD = PRODUCT.

USER-FACING OBJECTS ARE:

FYD OBJECTS.

STOP SAYING "PING OBJECTS" IN PRODUCT UI.

Internal legacy names can remain until deliberate migration.
Do NOT create a giant rename diff.

============================================================

THE OBJECT RAIL NEEDS A REAL MOBILE COMPOSITION
============================================================

Current tiny independent dots/icons are wrong.

The object collection should feel like ONE composed FYD artifact.

Think:

FYD OBJECT CONSTELLATION

not:

FLOATING BUTTON LIST.

On desktop:

a fixed side rail / constellation is appropriate.

It should feel attached to the experience, not floating accidentally.

On mobile:

DO NOT merely scale the rail down.

Create a compact, fixed, thumb-reachable FYD object dock.

It can contain overlapping/stacked object glyphs/cards so multiple FYD
objects visually compose into one pictographic cluster.

Requirements:

fixed and stable
respects safe-area insets
does not cover primary content
no hover dependency
minimum usable touch targets
selected object visibly distinct
deterministic stacking/order
visually communicates object count/density
works with 1 object
works with 5
works with 20+
does not become 20 tiny dots.

YES.

The cluster needs one explicit expansion mechanism:

ALL OBJECTS

or an equivalent compact glyph + count.

Tap:

FYD constellation
→ object tray/sheet
→ ALL OBJECTS.

Use a native-feeling bottom sheet / full-height mobile object explorer.

Not a modal full of tiny cards.

The expanded view should support:

object identity
type
media/icon
name
relationship context
primary capability
search/filter when density warrants it.

This is where dense graphs become manageable.

The compact constellation is DISCOVERY.

ALL OBJECTS is EXPLORATION.

The Node remains the full experience.

Explore overlapping object medallions / mini-cards / silhouettes.

Business can anchor the cluster.

Related objects can orbit/stack around it:

Business
Service
Person
Location
Project
Post
Media.

But DO NOT make this random generative artwork.

Geometry must be deterministic.

Same:

objects
relationships
projection resolution
container geometry

→ same composition.

Use intelligence to choose semantic emphasis only if deterministic rules
cannot.

Do NOT use intelligence to calculate pixel positions every render.

Search existing FYD/PING/Cascade code first for:

Circle
rail
dock
object card
stack
avatar group
bottom sheet
drawer
object explorer
relationship explorer
container-query components.

Then inspect established patterns/libraries already in the dependency
graph.

Prefer existing accessible primitives for:

sheet/dialog
focus management
touch interaction
keyboard navigation.

WRITE ONLY THE FYD-SPECIFIC COMPOSITION LOGIC.

THE SITES NEED VISUAL IDENTITY.

A business website without its real imagery when usable authorized media
exists is an extraction failure or projection failure.

For authorized HPP/PING/demo sources:

discover media
→ observe
→ evidence
→ digest
→ controlled derivative
→ Media FYD Object / media binding
→ projection.

Do not hardcode image URLs into components.

Do not make permanent hotlinking the architecture.

Preserve provenance.

The existing product doctrine already calls for a controlled media
pipeline for authorized demo/business material.

USE IT.

If useful high-quality source media exists:

USE IT.

Hero/background selection should be deterministic from eligible media.

Example scoring inputs:

owner-selected
semantic relevance
image dimensions
aspect ratio
quality
duplication
prominence in source
evidence confidence.

Owner selection outranks automatic selection.

No usable media?

Use generated design treatment from deterministic design tokens.

Do not fabricate a photograph.

Do NOT literally compute the RGB complement of the customer's existing
site and assume it will look good.

That will frequently produce ugly or inaccessible results.

Instead extract/infer a small brand palette from:

logo
hero media
source CSS/theme metadata
owner-defined tokens.

Then derive an ACCESSIBLE CONTRAST PALETTE.

For image backgrounds:

measure image luminance in the text region.

Choose:

light foreground
OR
dark foreground.

Add controlled:

scrim
gradient
surface
text shadow only if justified

until contrast requirements pass.

The rule is:

BRAND-AWARE
+
CONTRAST-SAFE.

Not:

COLOR INVERSION.

Do not eyeball it.

Build a deterministic contrast utility.

Given:

background/media sample
foreground candidate
overlay candidate

return a presentation decision that satisfies accessibility thresholds.

The output belongs to PresentationSpec/design tokens.

Not canonical business truth.

Regression fixtures:

light photo
dark photo
mixed photo
white logo
dark logo
no media.

YES.

REMOVE THE DUPLICATED PHONE CALL-TO-ACTION EXPERIENCE.

There is ONE semantic phone/contact value.

Example:

+1 (541) 555-0147 [Call]

The number itself:

human formatted
selectable
copyable
long-press friendly
accessible.

Explicit Call affordance:

tel:+15415550147

Tap Call:

opens the device's supported phone handler.

Desktop:

same semantic object.

Copy works.

Call capability may still use tel:.

Do not show two visually competing representations of the same phone.

Conceptually:

CONTACT METHOD
↓
PHONE PRESENTATION
├── COPY
└── CALL.

DATA IS NOT THE ACTION.

This is the architecture we want everywhere.

For a local-service business, the important mobile actions are likely:

Call
Ask FYD
Website/Direction/Quote where actually supported.

Do NOT create a giant sticky bar containing every possible capability.

Determine the small set of currently executable high-value capabilities.

No capability:

no button.

No handler:

no button.

No fake action.

Use component/container geometry.

Do not write:

if iPhone
if Android
if tablet.

The same FYD Object may appear in:

side rail
mobile dock
embed
Circle
Node
workspace.

Components should respond to their CONTAINER.

Use container queries where appropriate.

Projection resolution can conceptually be:

MICRO
COMPACT
STANDARD
EXPANDED
FULL.

One identity.

Different density.

DO NOT add another canonical subsystem.

The constellation consumes existing:

FYD Objects
relationships
media
capabilities
visibility
viewer context.

Conceptually:

project(
objectGraph,
ownerIntent,
viewerContext,
capabilityContext,
projectionSpec
)
→ ProjectionModel

Then:

ProjectionModel
→ ObjectConstellation.

The constellation owns geometry.

It does NOT own truth.

Don't simply stack objects alphabetically.

Relationship semantics can inform proximity/grouping.

Example:

Business
├── offers → Service
├── located_at → Location
├── employs/works_with → Person
└── showcases → Project.

Business becomes visual anchor.

Strongly related objects cluster nearby.

But KEEP THE FIRST IMPLEMENTATION SIMPLE.

A deterministic grouping table is preferable to an elaborate force
simulation.

No graph-visualization science project.

Do not declare mobile green from 375px alone.

At minimum test:

320
360
375
390
430

plus desktop.

Test:

1 object
3 objects
8 objects
20 objects.

Test:

long business name
long service name
no media
one image
many images
light image
dark image
missing phone
one phone
multiple contact methods
hidden object
unavailable capability.

Assert:

NO horizontal overflow.

NO tiny touch targets.

NO object hidden solely because viewport is small.

NO capability disappears merely because viewport changed unless another
reachable representation exists.

NO source image causes unreadable text.

NO unsafe media URL reaches executable rendering.

NO duplicate phone CTA.

NO hidden FYD Object leaks through object dock.

NO dead action.

NO random ordering.

NO generated unsupported factual copy.

NO customer-specific JSX.

Do NOT let this visual correction damage what we already proved.

We already have the important separation:

SOURCE OBSERVATION
≠
OWNER INTENT
≠
EFFECTIVE PRESENTATION.

The owner loop survives regeneration.

Natural-language customization survives source change.

Ask FYD is evidence-bounded.

HIDE is presentation, not deletion.

Those are the product.

This work makes those semantics BEAUTIFUL and USABLE on mobile.

It does not replace them.

FIRST:

fix phone presentation.

SECOND:

wire real authorized media into both demo sites.

THIRD:

hero/background + deterministic contrast treatment.

FOURTH:

replace mobile dot rail with FYD Object constellation/dock.

FIFTH:

All Objects sheet/explorer.

SIXTH:

test across the mobile matrix.

SEVENTH:

run BOTH real businesses.

Do not polish only Happy Place.

Coppersmith must inherit the improvement automatically.

If a generic component fix does not improve both:

investigate why.

After the shared system works:

run PING/FYD through the SAME machinery.

Do not hand-build a special PING marketing site.

Technology strategy may compose differently.

Same:

FYD Objects
ProjectionModel
media system
capabilities
object constellation
mobile rules
contrast system
Ask FYD.

This proves the architecture generalizes.

This is product work now.

No new:

Authority
event store
graph database
federation adapter
campaign engine
ontology
universal design framework.

Use the contracts already earned.

Improve:

projection
composition
media
geometry
capabilities
mobile interaction.

PHONE OBJECT:
PASS/FAIL

DUPLICATE PHONE CTA REMOVED:
YES/NO

MEDIA A:
source / provenance / derivative / rendered

MEDIA B:
source / provenance / derivative / rendered

HERO CONTRAST:
PASS/FAIL + measured rule

FYD OBJECT CONSTELLATION:
desktop / mobile

ALL OBJECTS:
PASS/FAIL

1 OBJECT:
PASS/FAIL

8 OBJECTS:
PASS/FAIL

20 OBJECTS:
PASS/FAIL

320:
PASS/FAIL

375:
PASS/FAIL

430:
PASS/FAIL

HIDDEN OBJECT LEAK:
PASS/FAIL

CAPABILITY PARITY:
PASS/FAIL

HAPPY PLACE:
PASS/FAIL

COPPERSMITH:
PASS/FAIL

CUSTOMER-SPECIFIC CODE:
ZERO / explain

FIRST UGLY OR BROKEN THING:
...

NEXT:
...

FYD SHOULD NOT FEEL LIKE:

A RESPONSIVE WEBSITE WITH SOME FLOATING OBJECT BUTTONS.

IT SHOULD FEEL LIKE:

THE BUSINESS ITSELF HAS BECOME AN INTERACTIVE DIGITAL OBJECT.

THE WEBSITE IS ITS ENVIRONMENT.

THE FYD OBJECT CONSTELLATION IS ITS MAP.

ASK FYD IS ITS INTELLIGENCE.

CAPABILITIES ARE WHAT IT CAN DO.

EVIDENCE IS WHY IT CAN BE TRUSTED.

OWNER INTENT IS HOW IT REMAINS THE OWNER'S.

MAKE MOBILE THE BEST EXPRESSION OF THAT IDEA.

NOT THE SHRUNK VERSION.

GO.

---

## Operator addenda (binding, Nolan's coda to this directive)

1. Do not let the implementation agent improvise the contrast algorithm: do NOT use literal complementary colors as the accessibility algorithm. Derive a brand-aware palette and measure contrast. (Recorded as binding above: BRAND-AWARE + CONTRAST-SAFE, not COLOR INVERSION.)

2. Do not let the implementation agent improvise the constellation artwork: the pictographic cluster must be generated from real FYD Objects and relationships, not become another decorative graph that invents its own semantics. The existing architecture already calls for shared presentation contracts and cross-surface conformance; this is exactly where they pay off.

3. Phone instinct confirmed: the existing design material already converged on one contact value with separate Copy and Call capabilities (OBJECT FIELD → PRESENTATION → AVAILABLE CAPABILITIES), rather than two competing CTAs.

4. Sequencing guardrail (binding): do not disappear into visual redesign for three days. The order is: phone → media → contrast → constellation → All Objects → mobile matrix → both businesses. Then it goes back to Nolan and he judges it on the phone.
