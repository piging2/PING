# FYD — Product Runtime Build Order

Issued by Nolan, 2026-09-24 ~05:23 MDT. Verbatim. Governing order for the FYD factory. Supersedes prior orders where in conflict, cumulative otherwise.

---

FYD — Product Runtime Build Order

FYD — KEEP GOING, BUT BUILD THE PRODUCT NOW

THE FACTORY HAS PROVED ENOUGH MACHINERY.

CURRENT VERIFIED PRODUCT FOUNDATION:

195 / 195 canonical tests
two real websites
same proceduralizer
different object graphs
graph-driven SiteSpec difference
desktop green
320px mobile green
375px mobile green
hostile URL probe green
binding verifier wired
unbound factual claim test green
owner address visibility override green
semantic determinism green
zero customer-specific renderer code.

THAT IS ENOUGH FOUNDATION.

STOP CELEBRATING INFRASTRUCTURE COUNTS.

5,000 compile jobs do not matter to the customer.

2,503 acquisition envelopes do not matter to the customer.

1,157 tests matter only because they let us confidently ship something
the customer can actually use.

THE NEXT WORK MUST MOVE THE PRODUCT.

The proven min-w-0 fix is still uncommitted.

Commit ONLY that intended change from the correct clean ownership lane.

Do not sweep the 23 unrelated dirty files into it.

Preserve the replay evidence.

Then canonical test.

START THE FYD DEV SERVER.

Expose it through the already-approved PRIVATE access path.

Prefer the Tailscale Windows→WSL forward for this testing phase because
it gives Nolan the same FYD surface from:

desktop
phone
tablet

without requiring a per-device SSH tunnel.

NO PUBLIC INTERNET EXPOSURE.

Verify from outside WSL before declaring it reachable.

Expose at least:

/sites/happy-place
/sites/coppersmith

and a simple index:

/sites

showing the two test nodes.

Nolan needs to be able to switch between them rapidly.

Do not make him ask an agent for URLs every time.

FYD IS NOT FUNDAMENTALLY A WEBSITE BUILDER.

FYD IS A COMPILER + RUNTIME FOR AN ENTITY'S DIGITAL PRESENCE.

INPUTS:

website
authorized social
documents
owner corrections
public evidence
future connected systems

         ↓

ACQUISITION

         ↓

EVIDENCE

         ↓

PING OBJECT GRAPH

         ↓

POLICY + OWNER INTENT

         ↓

MULTIPLE PROJECTIONS

website
Circle
search
Ask FYD
social
agent context
future protocol surfaces.

THIS is why we built the substrate.

The website is the first important projection.

Do not let the website become the canonical data model.

The earlier grill question was correct:

WHO OWNS "NO INVENTED CLAIMS"?

DO NOT CREATE ClaimAuthority.

The answer should be the existing evidence/object projection contract.

A factual renderable value must carry or mechanically resolve:

OBJECT
→ FIELD
→ EVIDENCE BINDING.

The BINDING VERIFIER owns the mechanical invariant at the projection
boundary.

The renderer does NOT decide whether a claim is true.

The renderer is allowed to render only an authorized projection whose
factual bindings validate.

Therefore:

EVIDENCE
→ OBJECT FIELD
→ BINDING VERIFIER
→ PROJECTION MODEL
→ RENDERER.

The renderer stays dumb.

That is Rule of One.

If generated prose synthesizes several facts, classify it as generated
copy and retain the evidence set used to generate it.

Generated prose is NOT promoted to canonical fact merely because an LLM
wrote it.

The pipeline does NOT own the business's presentation decision.

Owner does.

Correct model:

SOURCE VISIBILITY
+
PLATFORM SAFETY DEFAULT
+
OWNER VISIBILITY OVERRIDE
→ EFFECTIVE PROJECTION VISIBILITY.

A public business address may default conservatively during uncertain
ingestion.

But once the authenticated owner says:

SHOW MY BUSINESS ADDRESS

the owner intent becomes the controlling presentation policy unless a
higher legal/security restriction applies.

The existing field-visibility work is therefore strategically important.

WIRE THE SAME POLICY INTO:

website renderer
Ask FYD
search
Circle
agent context.

ONE VISIBILITY POLICY.

NOT FIVE.

DO NOT TURN WHY THIS INTO A PRODUCT CENTERPIECE.

The plumber does not buy provenance.

The plumber buys:

accurate site
more discoverable services
easy updates
fewer wrong facts
less work.

WHY THIS is the trust escape hatch.

Most users should rarely touch it.

But when FYD is wrong, surprising, or important:

WHY THIS?

becomes enormously valuable.

Therefore:

quiet affordance
not dashboard
not giant evidence explorer.

The real owner loop is:

SEE
→ CORRECT
→ FYD REMEMBERS.

Provenance makes that correction defensible.

LOCK THIS NOW.

Given:

same ObjectGraph
same SiteSpec
same ViewerContext
same renderer version

the SEMANTIC render model must be identical.

Do not require byte-identical browser HTML where framework/runtime
details make that meaningless.

Require deterministic semantic projection:

component types
ordering
object bindings
content values
capabilities
visibility
stable semantic IDs.

Exclude presentation-runtime noise such as legitimate ephemeral framework
attributes from the constitutional digest.

Add the existing semantic determinism probe as a permanent regression
test.

DO NOT BUILD A "SMARTER AI PLANNER" YET.

Current evidence already shows:

A:
2 objects / 1 relationship
→ Home + About

B:
4 objects / 3 relationships
→ Home + About + Explore.

GOOD.

Continue with a deterministic eligibility/ranking layer.

Conceptually:

OBJECT SCHEMA
+
CARDINALITY
+
RELATIONSHIP TYPES
+
AVAILABLE CAPABILITIES
+
OWNER INTENT
→ ELIGIBLE COMPONENTS
→ ORDERED SITE SPEC.

AI may later propose composition.

It should not be required for basic valid composition.

That preserves:

determinism
explainability
cheap regeneration
testability
future agent customization.

THIS IS THE NEXT PRODUCT BOUNDARY.

Do not build generic chat.

Build exactly one hard vertical question across BOTH sites:

"What services does this business offer, and how do you know?"

Pipeline:

QUESTION
↓
VIEWER CONTEXT
↓
VISIBILITY POLICY
↓
RELEVANT OBJECT RETRIEVAL
↓
AUTHORIZED EVIDENCE BUNDLE
↓
MODEL
↓
ANSWER
↓
CLAIM/EVIDENCE REFERENCES.

The model NEVER receives hidden fields.

Test this explicitly.

Happy Place currently has only:

2 objects
1 relationship.

If Ask FYD cannot answer the services question because no Service objects
exist:

DO NOT HALLUCINATE SERVICES.

Return the truthful limitation.

Then identify whether the missing service knowledge is:

acquisition failure
normalization failure
schema mapping failure
or source genuinely lacks evidence.

THAT becomes the next broken step.

This is exactly why Ask FYD comes now.

It tests whether the object graph is actually useful.

For both sites:

QUESTION:
What services does this business offer, and how do you know?

Require:

ANSWER:
...

CLAIMS:
...

EVIDENCE:
...

SOURCE URLS:
...

CLASSIFICATION:
DIRECT / DERIVED / GENERATED

HIDDEN FIELD LEAK:
NO

UNSUPPORTED CLAIM:
NO

If evidence does not support an answer:

REFUSE TO INVENT IT.

That is a PASS.

Do ONE complete correction.

Choose a visible factual field.

Owner:

CORRECTS VALUE

System creates structured owner intent/evidence.

Regenerate.

Refresh.

Value remains corrected.

Then re-observe original source.

If source still disagrees:

DO NOT silently overwrite owner correction.

Represent conflict:

SOURCE SAYS X
OWNER SAYS Y.

Projection policy chooses owner-verified value where appropriate.

Evidence retains both.

This is one of FYD's strongest primitives.

Now prove:

"Move emergency plumbing to the top."

Do not let the model edit JSX.

Compile natural language into:

SitePatchProposal.

Example semantics:

target section/object
operation
before state
after state
reason
proposal digest.

Then:

CAPABILITY CHECK
→ PREVIEW
→ OWNER APPROVAL
→ CANONICAL TRANSITION
→ REGENERATE.

The intelligence interprets intent.

DETERMINISTIC SOFTWARE executes it.

Observe source V2.

Compute deterministic evidence diff.

Determine affected objects.

Determine affected SiteSpec dependencies.

Generate update.

Owner correction survives.

Owner layout preference survives.

THIS is the core builder architecture.

ONLY AFTER THE ABOVE WORKS:

add multiple editing surfaces over THE SAME SiteSpec.

SURFACE 1:
plain English.

SURFACE 2:
simple controls.

SURFACE 3:
future visual editor.

Puck remains a strong harvest candidate because it is a modular React
visual editor and lets us retain our components and data model.

DO NOT make Puck the FYD model.

Future:

FYD SiteSpec
↕
Puck adapter
↕
visual editing.

If Puck disappears tomorrow, FYD SiteSpec must survive.

Automerge is now at 3.4.x and remains a serious option for future:

offline editing
concurrent owner edits
desktop/mobile collaboration.

DO NOT ADOPT IT NOW.

Our architecture preserves the option if SiteSpec/customization is kept
as structured data rather than generated JSX.

That is the important decision today.

Crawl4AI 0.9.4 just shipped.

Its recent releases have concentrated heavily on secure-by-default
server behavior and hostile-input boundaries.

GOOD SIGNAL.

Keep it in the harvest manifest.

Do NOT replace our currently proven acquisition path merely because a
new version exists.

Adopt/benchmark only when a real source defeats the current stack.

Commodity crawling belongs behind an adapter.

FYD differentiation is what happens AFTER acquisition.

Current MCP has moved toward a stateless core with extensions and
stronger authorization.

That makes our architecture more valuable, not less.

Eventually expose:

search FYD
read object
read evidence
ask FYD
propose site patch
request capability

as MCP-facing tools/resources.

But MCP remains:

PROJECTION/ADAPTER.

It does not become canonical PING truth.

For the two explicitly authorized demo businesses:

YES:

download public site media needed for the generated experience
digest it
preserve original URL + acquisition provenance
generate controlled derivatives
serve FYD-owned derivatives.

DO NOT blindly hotlink.

Why:

performance
responsive sizing
availability
layout stability
future transformations
content integrity.

But retain source provenance and do not imply FYD owns copyright.

For arbitrary future sites, media acquisition policy must respect source
authorization/licensing/terms.

DO NOT fake authentication and then accidentally depend on it.

For Nolan's immediate local/private demo:

explicit DEMO OWNER MODE is acceptable ONLY if:

visibly marked
private test environment
cannot be confused with production auth
no external privileged effects
logged as non-production.

Do not stop the product loop to build complete auth.

Before any external real owner uses privileged customization:

wire real owner authentication.

FULL EVIDENCE-BACKED Q&A WITH REFUSAL.

But "full" refers to correctness semantics, NOT unlimited scope.

Visitor Ask FYD may answer from PUBLICLY PROJECTABLE authorized context.

If evidence is absent:

say so.

If field is hidden:

model never receives it.

If question requests an action:

separate answering from capability execution.

Keep:

MOBILE UX
CONTACT DISCOVERABILITY
SERVICE DISCOVERABILITY
PERFORMANCE.

ADD ONE:

CORRECTNESS/TRUST.

FYD must not beat an incumbent website by being prettier while getting
the business wrong.

Primary five:

correctness/trust
mobile usability
service discoverability
contact conversion path
performance.

Everything else can lose tonight.

DO NOT globally disable sleep merely to compensate for automation.

Prefer bounded wake inhibition while an authorized automation pass is
running.

Worker lifecycle:

ACQUIRE WAKE LOCK
→ RUN
→ RELEASE WAKE LOCK

with finally/cleanup behavior.

If the Pig is intentionally becoming a dedicated always-on automation
host later, then change machine power policy explicitly as an
infrastructure decision.

For now:

KEEP NORMAL SLEEP
+
HOLD WAKE LOCK DURING ACTIVE PASSES.

Also retain the page-reopen recovery because machines can still suspend,
restart, or lose browser targets.

WE ARE NO LONGER TRYING TO PROVE THAT PING CAN SUPPORT FYD.

IT CAN.

NOW FYD MUST PROVE WHY PING MATTERS.

The answer should emerge through product behavior:

ordinary builder:
PAGE → CONTENT.

FYD:
EVIDENCE
→ OBJECT
→ RELATIONSHIPS
→ OWNER INTENT
→ MULTIPLE TRUSTED PROJECTIONS.

That enables:

website today
Circle tomorrow
Ask FYD
search
social
campaigns
agents
MCP
ActivityPub
ATProto
desktop/mobile
whatever comes next.

ONE ENTITY MODEL.

MANY EXPERIENCES.

NOLAN CAN OPEN:

Happy Place
AND
Coppersmith

on phone and desktop.

Then Ask FYD answers from evidence.

Then Nolan changes one fact.

Then Nolan changes one layout decision in English.

Then refresh.

Then re-observe.

Everything survives correctly.

THEN:

PUT IT IN FRONT OF ONE REAL OWNER.

PRIVATE TEST URL:
...

HAPPY PLACE:
REACHABLE YES/NO

COPPERSMITH:
REACHABLE YES/NO

PHONE:
PASS/FAIL

DESKTOP:
PASS/FAIL

ASK FYD HAPPY PLACE:
...

ASK FYD COPPERSMITH:
...

UNSUPPORTED CLAIMS:
0 / ...

HIDDEN FIELD LEAKS:
0 / ...

OWNER CORRECTION:
PASS/FAIL

SOURCE CONFLICT:
PASS/FAIL

PLAIN ENGLISH CUSTOMIZATION:
PASS/FAIL

APPROVAL:
PASS/FAIL

REFRESH:
PASS/FAIL

REOBSERVATION:
PASS/FAIL

OWNER INTENT SURVIVES:
PASS/FAIL

FIRST BROKEN STEP:
...

NEXT:
...

NO MORE FACTORY OUTPUT COUNTS AS THE HEADLINE.

THE HEADLINE IS NOW:

WHAT COULD THE CUSTOMER DO YESTERDAY?

WHAT CAN THEY DO TODAY?

Build that delta.

GO.

---

Nolan's ecosystem notes accompanying this order (2026-09-24): Puck is a credible future visual-editing seam because it is a modular React editor where FYD can retain its own components/data rather than surrendering the model to a page-builder. Automerge 3.4.1 is current and remains compelling if/when offline/concurrent owner editing becomes a real requirement, not before. Crawl4AI 0.9.4 validates harvesting at the acquisition boundary rather than inventing a general crawler. MCP's 2026-07-28 spec (stateless core with extensions, stronger authorization) is increasingly suitable as a later projection of FYD capabilities, not FYD's internal architecture. The deepest architectural decision: keep FYD's middle representation clean enough that acquisition, editors, renderers, models, agent protocols, and social protocols are all replaceable; evidence and owner intent are durable.
