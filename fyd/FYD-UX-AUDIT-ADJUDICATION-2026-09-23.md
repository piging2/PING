# FYD — Adjudicate the 68-Point UX Audit

## FYD — UX AUDIT ADJUDICATION

Nolan's binding steering, 2026-09-23 ~14:14 MDT. Delivered through the FYD lane's existing coordination mechanism (directive file + lane memory). No new coordinator created.

IMMENSE CREDIT TO THIS AUDIT.

IT FOUND REAL DEFECTS.

KEEP THE FINDINGS.

DO NOT FOLLOW ITS IMPLEMENTATION ORDER.

The audit's strongest insight is:

ONE OBJECT
→ ONE IDENTITY
→ MANY SURFACES.

Circle
Preview
Workspace
Website/Node
Ask FYD
Evidence
Embed

should feel like projections of the SAME persistent object.

THAT IS CORRECT.

But we are not going to spend this sprint polishing the projection while
the owner-trust loop remains unfinished.

The audit correctly did this conceptually.

Now encode it operationally.

## P0 DEFECTS

- javascript:/unsafe URL sink — ALREADY CLOSED
- mobile overflow — ALREADY CLOSED
- evidence/claim binding — WIRED
- owner visibility override — WIRED
- semantic determinism — GREEN
- canonical tests — GREEN
- broken related-object navigation
- Ask state loss/remount/re-submit
- reachable actions missing on mobile
- no-op actions that appear actionable
- embed inheriting inappropriate chrome
- inaccurate "Verified" terminology
- loading/failure/absence conflation
- pointer hover stealing keyboard focus
- close/reopen focus bug candidate
- incomplete dialog/tab accessibility
- silent action failures.

KEEP THESE IN THE DEFECT LEDGER.

Fix defects when they block the current product path or can be closed
surgically.

DO NOT turn all of them into prerequisites for Ask FYD.

It recommends roughly:

navigation/state
→ mobile parity
→ trust/accessibility
→ visual tokens
→ motion
→ relationship exploration
→ owner workflows.

REVERSE THE PRODUCT PRIORITY.

## CURRENT ORDER

ASK FYD FROM REAL GRAPH/EVIDENCE.
OWNER CORRECT / CONFIRM / HIDE.
CORRECTION SURVIVES REGENERATION.
PLAIN-ENGLISH SITE CHANGE.
APPROVAL/APPLY.
SOURCE REOBSERVATION.
OWNER INTENT SURVIVES.
ONE REAL OWNER.
THEN deepen Circle/Preview/Workspace interaction quality.

WHY?

Because beautiful continuity around an object whose owner cannot correct
its understanding is decoration.

## PRESERVE OBJECT IDENTITY ACROSS SURFACES

Do not separately derive:

CircleIdentity
PreviewIdentity
WorkspaceIdentity
NodeIdentity.

They should consume a shared presentation projection from the same object.

Conceptually:

         OBJECT
            │
    PRESENTATION SPEC
            │
 ┌──────────┼───────────┐
 ▼          ▼           ▼

CIRCLE PREVIEW WORKSPACE
│
▼
NODE.

Same:

object identity
recognizable media
name
evidence semantics
relationship semantics
capability semantics.

Different:

density
layout
interaction depth.

PresentationSpec is a projection/contract.

NOT canonical truth.

Truth remains upstream:

EVIDENCE
+
OBJECT GRAPH
+
OWNER ASSERTIONS
+
CANONICAL TRANSITIONS.

PresentationSpec answers:

HOW SHOULD THIS OBJECT BE PRESENTED HERE?

It does NOT answer:

WHAT IS TRUE?

## PROVENANCE VOCABULARY

STOP SAYING "VERIFIED" FOR MERELY OBSERVED DATA.

Lock vocabulary approximately around:

DIRECT
DERIVED
INFERRED
OWNER_ASSERTED
CONFLICTING
UNKNOWN.

Then UI can translate appropriately.

Example:

BAD:

Verified from business website

BETTER:

Found on business website

or:

Owner confirmed

or:

Generated from 3 cited sources.

Do not turn provenance vocabulary into marketing.

## SUMMARY ELIGIBILITY

NEVER choose the first fact as the description.

That is structurally wrong.

Summary eligibility should be deterministic.

Prefer:

owner-approved summary
→ explicit structured description
→ high-quality source description
→ generated evidence-bounded summary
→ no summary.

Never:

facts[0].

## LOADING / FAILED / EMPTY

LOADING
FAILED
EMPTY

are different states.

Model them distinctly.

LOADING:
we do not know yet.

FAILED:
we attempted and cannot currently know.

EMPTY:
we successfully checked and found none.

This distinction matters enormously once Ask FYD and agents depend on the
same graph.

## OBJECT SESSION STATE

Related-object navigation and Ask state loss expose the need for:

OBJECT SESSION STATE.

But DO NOT create a new canonical subsystem.

Keep ephemeral UI/session state separate from object truth.

Conceptually:

ObjectSession {
selectedObject
navigationStack
selectedPanel
askDraft
askConversation
scrollPosition
}

This is client/session state.

NOT:

PING object state.

NOT:

canonical event history.

Only persist something when product semantics justify persistence.

## CAPABILITY PARITY

CAPABILITIES MUST NOT DISAPPEAR BECAUSE THE VIEWPORT CHANGED.

If visitor may legitimately:

Ask
Follow
Like
Visit Website
Contact

then supported actions need mobile-reachable equivalents.

But do NOT demand identical UI.

Semantic parity.

Not pixel parity.

## NO-OP ACTIONS

NO-OP ACTION HANDLERS ARE DANGEROUS.

If capability appears:

it must work

OR

it must not appear.

Enforce:

CAPABILITY
→ executable handler

before rendering actionable UI.

Never show a consequential button backed by:

() => {}

This is another reason for:

OBJECT
→ COMPONENT
→ CAPABILITY.

## EMBED BOUNDARY

/embed SHOULD NOT inherit full platform chrome.

Circle/embed is a projection designed for foreign surfaces.

Keep it:

compact
isolated
responsive
capability-limited
source-aware.

Do not build an iframe micro-application empire yet.

Just establish the projection boundary.

## ACCESSIBILITY

THESE ARE REAL QUALITY DEFECTS.

Keep them.

Accessibility is not "polish."

But fix them in surgical groups:

FOCUS/DISMISSAL:
10
11
14

DIALOG/TABS:
12
13

ACTION FEEDBACK:
15
16.

Do not redesign the entire interaction system while closing them.

Use established browser/ARIA patterns.

## DEMO VIEWER STATE

DEMO VIEWER STATE MUST REMAIN EXPLICITLY DEMO.

We already chose:

OwnerContext
→ DemoOwnerContext now
→ real PING identity/capability implementation later.

Apply the same principle to visitor identity.

Do not accidentally make browser-local Follow state look canonical.

If it is demo-local:

label/model it as such.

If it is canonical:

route through the actual relationship/capability/event path.

NO SEMANTIC LIMBO.

## DESIGN BACKLOG (NOT CURRENT P0)

GOOD DESIGN THINKING.

NOT CURRENT P0.

Do not lose them.

Move them into the product/design backlog.

Especially preserve:

identity continuity
business branding dominance
sparse-object composition
dense-object progressive disclosure
description vs relationship context
one dominant contextual action.

But do not spend the current proof cycle tuning purple versus amber.

## MOTION

GOOD IDEAS.

FREEZE.

Motion can become a signature later.

But motion has ZERO right to outrank:

Ask FYD
correction
regen
real owner.

Architecture requirement NOW:

do not make future coordinated transitions impossible.

That means:

stable object IDs
stable element identity where practical
shared presentation contract
reduced-motion-compatible state changes.

Then stop.

No animation sprint.

## STRATEGIC LATER (HIGH VALUE)

THIS IS WHERE THE AUDIT BECOMES STRATEGIC AGAIN.

High-value later:

object session continuity
addressable object navigation
explicit Ask scope
evidence-aware suggestions
answer → capability continuation
human-readable relationships
relationship exploration
comparison
freshness
clear Follow semantics.

BUT ASK FYD FIRST.

A relationship explorer before trusted concierge is backwards.

## CORE PRODUCT IDEAS TO FEED THE OWNER LOOP

THESE ARE CORE FYD PRODUCT IDEAS.

Especially:

business-specific first screen
useful service destinations
short contact path
real work/media
onboarding showing actual generated future
inline correction
precise conversational edit preview
reviewable regeneration.

These should feed directly into the current owner loop.

## SHARED PRESENTATION CONTRACT

YES:

COMPLETE THE SHARED PRESENTATION CONTRACT.

But KEEP IT SMALL.

Do not invent a universal UI ontology.

The contract needs enough information for surfaces to share:

object identity
display identity
eligible summary
media
relationships
evidence classifications
available capabilities
visibility
freshness where relevant.

Then each surface chooses density.

## CONTAINER-AWARE DESIGN

CONTAINER-AWARE DESIGN IS CORRECT.

Circle
embed
sidebar
workspace
Node

cannot be modeled purely with viewport breakpoints.

Harvest CSS container queries.

Do not build a responsive-layout framework.

## VERSION DURABLE REPRESENTATIONS

YES — VERSION DURABLE REPRESENTATIONS.

Especially:

SiteSpec version
binding/projection version
owner patch version
renderer compatibility.

But distinguish:

CANONICAL OWNER INTENT

from:

RENDERER OUTPUT.

A renderer upgrade must not silently reinterpret an owner decision into
something materially different without a migration/compatibility story.

## MEASURE OUTCOMES

MEASURE OUTCOMES, NOT COMPONENT COUNT.

Eventually track:

URL → useful preview time
owner correction burden
successful Ask answers
unsupported-answer/refusal rate
contact discoverability
service discoverability
mobile parity
regen survival
time to owner customization
conversion/action completion where legitimate.

Do not instrument everything tonight.

## WHAT FYD IS

DO NOT LOSE THE BIGGER REASON FYD EXISTS.

WE ARE NOT BUILDING:

a hover card
a website builder
an AI chatbot
a social network
a CMS.

WE ARE BUILDING:

AN ENTITY COMPILER.

Messy digital existence:

website
social
documents
owner input
public evidence

        ↓

OBSERVATIONS

        ↓

EVIDENCE

        ↓

OBJECT GRAPH

        ↓

OWNER INTENT

        ↓

CAPABILITIES

        ↓

PROJECTIONS.

Website is projection #1.

Circle is another projection.

Ask FYD is an intelligent projection.

Future social is another.

MCP is another.

Mobile is another.

Protocol adapters are others.

"Make the social object feel like one persistent, recognizable entity."

YES.

Because it IS one entity.

The UI should expose the architecture rather than fighting it.

Website:

FULL PROJECTION.

Circle:

COMPACT PROJECTION.

Preview:

CONTEXTUAL PROJECTION.

Workspace:

INTERACTIVE PROJECTION.

Ask FYD:

INTELLIGENCE OVER THE OBJECT.

Evidence:

TRUST PROJECTION.

They are not separate products.

## NEXT BUILD

NEXT BUILD REMAINS:

"What services does this business offer, and how do you know?"

ASK FYD must:

receive object scope
retrieve authorized evidence/object context
answer only from that context
cite evidence
distinguish direct/derived/inferred
refuse unsupported factual claims.

Then:

OWNER SEES WRONG FACT

→ CORRECT

→ OWNER ASSERTION

→ REGENERATE

→ ASSERTION SURVIVES.

Then:

"Move emergency plumbing first."

→ capability/policy evaluation
→ SiteSpec patch proposal
→ preview
→ approval
→ re-evaluate exact proposal
→ apply
→ render.

Then:

SOURCE CHANGES

→ observation
→ evidence diff
→ conflict with owner assertion
→ DO NOT OVERWRITE
→ owner chooses.

THAT IS FYD.

Then take the UX audit and attack the object interaction experience.

Priority:

related-object navigation
Ask session preservation
mobile capability parity
eliminate no-op actions
correct provenance language
loading/error/absence state
accessibility cluster
shared visual identity
addressable object navigation
richer relationship exploration.

Then motion.

THE AUDIT IS VERY GOOD.

DO NOT DISCARD IT.

BUT DO NOT LET A GREAT UX AUDIT TURN FYD INTO A BEAUTIFUL SHELL AROUND AN
UNFINISHED SEMANTIC PRODUCT.

THE MOAT IS NOT:

THE CIRCLE ANIMATION.

THE MOAT IS:

FYD UNDERSTANDS THE ENTITY
+
CAN SHOW WHY
+
THE OWNER CAN CORRECT IT
+
THE CORRECTION SURVIVES
+
THE OWNER CAN CHANGE THE EXPERIENCE BY TALKING
+
THE SAME OBJECT PROJECTS EVERYWHERE.

BUILD THAT.

THEN MAKE IT BEAUTIFUL.

## BUILDER DECISIONS (CONFIRMED)

On the four earlier builder decisions, keep the adjudicated answers exactly as they now stand:

- authorized demo media gets ingested/digested/derived with provenance
- random cold-site media does not get automatically republished
- use DemoOwnerContext behind a replaceable owner seam rather than fake auth scattered through the UI
- Ask FYD is full evidence-bounded Q&A with explicit refusal
- comparison must-wins: mobile, service/product discoverability, contact/action discoverability, performance, plus FYD's unique fifth metric: truthfulness/owner correction burden.

## STRONGER FIRST DEMONSTRATION

The biggest disagreement with the 68-point audit is its proposed "most valuable first demonstration." Recognize → inspect service → ask → source → contact → return is a good visitor demonstration, but it doesn't prove FYD's hardest differentiation. The stronger demo is:

URL → FYD understands business → owner spots one imperfection → corrects it → regenerates → correction survives → owner says "move emergency service first" → proposal appears → approves → site changes → source later changes → FYD detects conflict without destroying owner intent.

That demonstrates something much harder than a polished object card: FYD can continuously understand an entity while preserving human authority over how that entity represents itself. That's the architecture worth protecting.
