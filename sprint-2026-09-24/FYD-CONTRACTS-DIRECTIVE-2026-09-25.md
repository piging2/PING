# FYD — PROMOTE THE CONTRACTS, NOT THE SURFACE

Steering directive from Nolan, 2026-09-25 ~05:50 MDT.
Originally written for Codex; adopted here as standing FYD product law.
Core line: editors/interfaces should be replaceable while those contracts remain stable.

---

THIS WAS FOR CODEX BUT MAYBE YOU CAN TAKE SOME INSPIRATION FROM IT exactly that editors/interfaces should be replaceable while those contracts remain stable.

Where I push back

1. SemanticRenderModel is not yet a semantic render model. It is closer to a section-binding manifest. The code you pasted records pages, sections, selected object IDs, headings, and copy. It does not capture all user-visible semantics: resolved factual field values, visibility outcomes, links/actions, capability availability, media selections, component variants, relationship-derived labels, navigation, or potentially component-specific ordering. Therefore the comment claiming two canonical models are "semantically identical iff byte-identical" is stronger than the implementation supports.

Worse, viewerId is probably the wrong semantic input. What matters is the effective viewer policy/capability context, not the literal identity string. Alice and Bob with identical effective visibility may render identically but hash differently; the same viewer whose grants change could potentially hash identically unless those grants are represented elsewhere. asOf has the same issue: if it changes every request while nothing visible changes, you've deliberately destroyed cacheability and semantic equality.

Promote: ViewerProjectionKey / effective policy digest, evidence/policy revision, resolved bindings, actions, media selections, visibility results, navigation, and semantic content. Keep timestamps only where time actually changes meaning.

2. The version placeholders are an alarm, not acceptable metadata.

rendererVersion = "renderer.tsx@unversioned"
designTokenVersion = "tokens@unversioned"

Those values don't establish reproducibility. And the instruction "remember to bump this constant" will eventually fail.

Promote: version the contracts, not filenames. Renderer semantics, component catalog, SiteSpec schema, policy projection and design-token schema should have explicit versions or deterministic digests generated from their actual inputs.

Do not hash the whole source tree. Hash/version the semantic contracts.

3. ownerOverrides as canonical JSON is useful evidence, but it's duplicating authority state. The render model should capture the effective result of owner decisions. Recording raw decisions can be useful for debugging/provenance, but don't let a second serialized override blob become another truth source.

Better separation:

Owner decisions → policy projection → effective graph → render model

and separately:

render model → appliedDecisionRefs[]

That lets us answer why without putting policy interpretation into the renderer.

4. The report's "one verified public projection boundary" is the most important recommendation. Promote it to P0. The report found active consumers bypassing the supported construction path and inconsistent field-level filtering.

That is more important than adding Puck, GrapesJS, A2UI, collaboration, or another editor. There should be exactly one conceptual route:

Canonical graph + evidence + viewer/owner policy → VerifiedProjection

Everything public consumes that projection:

site renderer, Ask FYD, metadata, Circle, search, feeds, future ActivityPub/ATProto projections.

This is where "address private/public" gets solved too. The renderer should never decide whether an address is private.

5. Claim verification needs to be upstream of components. The earlier grill question was right: nobody should eyeball whether the renderer invented a claim.

But I would not create ClaimAuthority.

Extend the binding/verifier contract so a public factual atom is one of:

DIRECT | DERIVED | GENERATED | OWNER_AUTHORED

and factual atoms carry exact support references. Generated marketing copy can be generated, but its factual dependencies must still resolve to supported atoms.

Then the invariant becomes:

No factual public render atom without a permitted binding to evidence/owner assertion.

That is machine-testable.

6. Stable section identity is genuinely important. Positional section IDs are a future regeneration bug. The report correctly spotted it.

Do not solve it with random UUIDs. Derive section-instance identity from stable semantics—e.g. page role + component role + primary binding/query identity—with explicit instance identity when the owner creates duplicates.

That makes reorder, regeneration, proposal diffs and owner customization survivable.

7. Substring dependency matching should be killed now. This is exactly the kind of "works in demo, corrupts regeneration later" shortcut.

Dependencies need typed keys, conceptually:

object:<id>
field:<id>:<field>
relationship:<id>
evidence:<id>
capability:<id>
media:<id>

Then source change → affected dependencies → affected render atoms/sections/Ask answers becomes exact rather than heuristic.

8. Do not adopt an editor yet. The ecosystem analysis is useful, but Puck/GrapesJS/Sanity patterns should remain harvest material.

The proposed editor exit test is excellent:

Delete the editor package; approved sites still render and replay, and another interface can produce equivalent proposals.

Make that constitutional for FYD.

That gives us future optionality for visual editor, chat editor, mobile editor, agent editor, third-party editor—or no editor at all.

9. Ask FYD should move ahead of editor work. The report is correct that the API already has more structure than the UI consumes.

Ask FYD is where PING starts earning its architectural cost. A generic site builder can render Service cards. Much fewer systems can answer:

"Which services does this company offer at this location, which sources support that, what conflicts, and what am I allowed to do about it?"

That exercises graph + evidence + policy + capabilities simultaneously.

10. Media candidate sets are correct, but not P0. Keep the semantic media contract. Don't spend the current wave making it beautiful. A good image pipeline matters, but it isn't the first broken product boundary.

Send this steering directive:

FYD — Promote the Contracts, Not the Surface

FYD — PROMOTE THE RIGHT FINDINGS

THE REVIEW IS GOOD.

DO NOT TURN IT INTO EIGHT NEW SUBSYSTEMS.

WE ARE PROMOTING THE SMALL NUMBER OF CONTRACTS THAT MAKE EVERY FUTURE
SURFACE REPLACEABLE.

FYD'S SURFACES ARE DISPOSABLE.

THESE ARE NOT:

OBJECTS
EVIDENCE
OWNER DECISIONS
VISIBILITY/POLICY
CAPABILITIES
TRANSITIONS
DEPENDENCIES.

WE SHOULD EVENTUALLY BE ABLE TO REPLACE:

React renderer
visual editor
chat editor
mobile UI
Circle UI
Ask presentation
ActivityPub projection

WITHOUT CHANGING WHAT FYD KNOWS OR WHAT THE OWNER AUTHORIZED.

STOP PUBLIC CONSUMERS FROM CONSTRUCTING THEIR OWN PARTIAL VIEW.

Establish/reuse ONE supported path conceptually:

Canonical ObjectGraph
+
Evidence
+
Owner Decisions
+
Viewer Policy
+
Capabilities
↓
VERIFIED PROJECTION
↓
site / Ask / metadata / Circle / search / future adapters.

DO NOT CREATE ProjectionAuthority.

USE THE EXISTING PROJECTION/POLICY/BINDING MACHINERY.

Inventory every current public consumer.

Any bypass is a defect.

Current SemanticRenderModel is useful but overclaims.

It currently proves mostly:

page
section
component
selected object IDs
heading
copy.

It does NOT yet prove semantic identity of everything the user sees.

Rename/document honestly if necessary.

Then incrementally include meaningful semantic outputs:

resolved factual bindings
effective visibility
available actions
navigation
relationship-derived content
selected media identity
component semantic variant
owner-decision references.

DO NOT model CSS/DOM noise.

SEMANTIC, NOT PIXEL DETERMINISM.

Challenge:

viewerId
asOf

as unconditional identity inputs.

The semantic model should depend on what changes the experience.

Prefer:

effective viewer-policy digest
capability/policy revision
meaningful temporal snapshot/checkpoint

rather than arbitrary viewer identity or request timestamp.

Two viewers with identical permissions should be capable of producing
the same public semantic projection.

A timestamp changing with no semantic change should not invalidate the
experience digest.

KILL:

renderer.tsx@unversioned
tokens@unversioned

as soon as practical.

Do NOT rely forever on developers remembering to bump magic strings.

Version/digest:

SiteSpec schema
component contract/catalog
projection policy
renderer semantics
design-token schema.

These are compatibility boundaries.

DO NOT CREATE ClaimAuthority.

Extend the existing binding/verifier machinery.

Every PUBLIC FACTUAL render atom must resolve to permitted support.

Classify semantic atoms:

DIRECT
DERIVED
GENERATED
OWNER_AUTHORED.

DIRECT:
exact evidence.

DERIVED:
transformation + evidence inputs.

GENERALED:
generated language + factual dependencies.

OWNER_AUTHORED:
owner assertion/change reference.

Invariant:

NO PUBLIC FACTUAL ATOM WITHOUT SUPPORT.

Make this machine-testable.

Once every factual atom has binding refs:

WHY THIS?

is merely a view over existing provenance.

Not a separate subsystem.

Likewise Ask citations.

Likewise regeneration impact.

Likewise conflict display.

ONE BINDING CONTRACT.

MANY FEATURES.

THE RENDERER DOES NOT DECIDE PRIVACY.

THE ACQUISITION PIPELINE DOES NOT DECIDE PRESENTATION PRIVACY.

The owner decision belongs in policy/owner state.

Example:

street address discovered
→ evidence records address
→ owner/public policy determines projection
→ renderer receives permitted value or nothing.

Owner says:

"Show my business address."

That creates a typed owner decision through the existing change path.

Regeneration must preserve it.

REMOVE POSITIONAL IDENTITY AS THE LONG-TERM CONTRACT.

Reordering unrelated sections must not rename a section.

Generate identity from stable semantics or explicit instance identity.

Must support:

reorder
regeneration
duplicate component instances
owner customization
proposal diffs.

NO RANDOM ID AS A BAND-AID.

REMOVE SUBSTRING DEPENDENCY MATCHING.

Use exact typed references.

Conceptually:

object
object-field
relationship
evidence
media
capability.

Then:

changed evidence
→ exact affected dependencies
→ exact objects
→ exact sections
→ exact Ask answers
→ exact regeneration scope.

This becomes the incremental compiler.

DO NOT INTEGRATE PUCK OR GRAPESJS YET.

FIRST MAKE ASK FYD PROVE WHY PING EXISTS.

Required question:

"What services does this business offer, and how do you know?"

Then harder:

"Which services are available at this location?"

"What evidence conflicts?"

"What changed?"

"Can I change this?"

Ask result states:

ANSWERED
PARTIALLY_ANSWERED
UNKNOWN
CONFLICTING_EVIDENCE
VISIBILITY_RESTRICTED
UNSUPPORTED_ACTION.

Do not confuse these with HTTP/network failures.

DO NOT SEND THE ENTIRE TENANT GRAPH.

Build context from:

selected object
relevant relationships
authorized evidence
effective viewer policy
available capabilities.

Record graph/projection revision supporting the answer.

This enables:

"That answer was based on yesterday's graph."

CHAT EDIT
VISUAL EDIT
DIRECT EDIT
AGENT EDIT

must converge into compatible proposals.

Use existing customization/journal machinery.

All meaningful changes carry the existing equivalents of:

actor
tenant
target
operation
base revision
proposal digest
capability
approval
idempotency
accepted event
projection readback.

IMPORTANT:

ACCEPTED != VISIBLE.

A transition is accepted first.

Then prove the intended projection became visible.

Do not mutate history backward.

Undo creates a compensating compatible transition.

Reobservation may create conflict.

Owner intent survives.

Fix the concrete navigation/state defects already identified.

Object identity/navigation:
URL + browser history.

Conversation/traversal/selected panel/return position:
site/object session.

Hover/animation:
component local.

Ask state must not disappear merely because its panel unmounted.

Related-object navigation must actually be wired.

KEEP THE EXISTING MEDIA INVESTMENT.

Do not overbuild it now.

Long-term API returns semantic candidate sets:

renditions
dimensions
crop/focal info
alt + origin
lineage
eligibility
freshness.

Surface requests media by:

OBJECT + ROLE.

Do not make raw image URLs part of business semantics.

ONLY AFTER THE ABOVE CONTRACTS WORK:

evaluate ONE small editor.

Puck is a reasonable experiment.

GrapesJS is another.

DO NOT marry FYD to either.

MANDATORY EXIT TEST:

REMOVE THE EDITOR PACKAGE.

SITE STILL RENDERS.

APPROVED CHANGES STILL REPLAY.

CHAT CAN PRODUCE AN EQUIVALENT VALID PROPOSAL.

If not:

the editor owns too much.

REJECT IT.

HARVEST THE PATTERN.

DO NOT MAKE THEM CORE.

The valuable idea is:

AGENT OUTPUT
→ TYPED COMPONENT/ACTION CATALOG
→ HOST RENDERER.

That may eventually make Ask FYD return interactive experiences.

But PING still owns:

facts
evidence
permissions
capabilities
actions.

If we get these contracts right:

TODAY:
generated website.

NEXT:
chat customization.

THEN:
visual editor.

THEN:
native mobile.

THEN:
Circle/embed.

THEN:
interactive Ask surfaces.

THEN:
ActivityPub / ATProto projections.

THEN:
collaborative editing.

NONE require replacing canonical business truth.

THAT IS WHY WE ARE DOING THIS.

WE ARE NOT BUILDING ALL THOSE FUTURES NOW.

We build ONLY contracts already justified by the current product path.

Rule:

NO SECOND IMPLEMENTATION
→ NO GENERALIZED ADAPTER

unless the seam is already forced by current evidence.

The renderer/browser boundary is green.

Therefore move downstream.

NEXT PRODUCT PROOF:

Rendered business
→ Ask FYD
→ evidence-backed answer.

Implement the smallest version.

Then:

WHY THIS
→ owner correction
→ durable change
→ regeneration
→ reobservation.

Do not spend this wave on:

fancier themes
drag/drop
animation
component proliferation
federation
campaigns
new protocols.

THE PRODUCT MUST FIRST PROVE:

FYD UNDERSTANDS MY BUSINESS.

FYD CAN SHOW ME WHY.

FYD LETS ME CORRECT IT.

FYD REMEMBERS MY DECISION.

FYD LETS ME CHANGE THE EXPERIENCE BY TALKING.

For ONE real business:

Open generated FYD presence.
Ask:
"What services do you offer?"
Answer uses authorized graph.
Ask:
"How do you know?"
Exact evidence appears.
Ask something unsupported.
FYD says UNKNOWN.
Ask something conflicting.
FYD surfaces conflict rather than inventing resolution.
Owner:
"Show my street address."
Typed proposal.
Approve.
Address appears.
Refresh.
Still appears.
Reobserve source.
Owner decision survives.
Replay reconstructs same effective state.

THAT IS THE NEXT MILESTONE.

THE WEBSITE IS A VIEW.

THE EDITOR IS A VIEW.

ASK FYD IS A VIEW.

MOBILE IS A VIEW.

FEDERATION IS A VIEW.

THE DURABLE PRODUCT IS:

EVIDENCE
→ OBJECTS
→ OWNER DECISIONS
→ POLICY
→ CAPABILITIES
→ TRANSITIONS.

MAKE THAT CONTRACT EXCELLENT.

THEN WE CAN CHANGE THE SURFACE FOREVER.

IMPLEMENT THE CONTRACT FIXES THAT THE CURRENT PRODUCT ACTUALLY REQUIRES.

THEN OPEN ASK FYD.

GO.

## One concrete correction to the pasted code

I would not merge its current documentation claim unchanged:

"Two models are semantically identical iff their canonical forms are byte-identical."

Today, byte-identical canonical forms prove equality of what this model captures, not equality of the entire rendered semantic experience. That's an important difference.

The stronger future architecture is:

VerifiedProjection → Semantic Experience IR → renderer adapter

That Semantic Experience IR is potentially much more important than SiteSpec itself. SiteSpec says what FYD intends to compose. The semantic experience says what the viewer is actually permitted to receive. Web React, mobile native, Circle, accessibility surfaces, agent-generated UI, and future editors can all consume or derive from that boundary.

That's the piece I'd promote—carefully, by extending the existing model rather than launching another subsystem.
