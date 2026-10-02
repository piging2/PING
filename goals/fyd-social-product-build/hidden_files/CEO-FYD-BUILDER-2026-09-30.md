# BRUTAL CEO MODE — FYD BUILDER
Nolan, binding, 2026-09-30. Delivered verbatim.

BRUTAL CEO MODE — FYD BUILDER
WE ARE NOT TRYING TO BUILD THE MOST FEATURE-RICH WEBSITE EDITOR.
WE ARE BUILDING THE MOST LEVERAGED WEBSITE SYSTEM.
THE DISTINCTION MATTERS.
DO NOT LOSE THE STATE WE ACTUALLY PROVED.
195 / 195 GREEN.
TWO REAL WEBSITES:
→ same proceduralizer
→ different object graphs
→ different SiteSpecs where semantics warrant it
→ zero customer-specific code.
DESKTOP:
GREEN.
MOBILE:
GREEN THROUGH 320PX.
URL SAFETY:
GREEN.
HOSTILE CONTENT:
GREEN.
BINDING VERIFIER:
WIRED.
UNBOUND FACTUAL CLAIM TEST:
GREEN.
OWNER ADDRESS OVERRIDE:
GREEN.
SEMANTIC DETERMINISM:
GREEN.
THE RENDERER/BROWSER BOUNDARY IS CLOSED.
DO NOT REOPEN IT FOR A BUILDER REWRITE.
CURRENT PRODUCT FRONTIER:
RENDERED EXPERIENCE
→ ASK FYD
→ EVIDENCE
→ OWNER INTENT
→ PROPOSAL
→ APPROVAL
→ REGENERATION.
THAT REMAINS P0.
A NORMAL WEBSITE BUILDER STORES:
PAGE
→ COMPONENTS
→ COPY.
FYD SHOULD KNOW:
EVIDENCE
→ CLAIMS
→ OBJECTS
→ RELATIONSHIPS
→ OWNER INTENT
→ SITE SPEC
→ COMPONENTS
→ CAPABILITIES
→ ACTIONS
→ OUTCOMES.
THE WEBSITE IS A PROJECTION OF THAT SYSTEM.
THIS IS THE OPTIONALITY.
The same Business object can later power:
WEBSITE
CIRCLE
SEARCH
FEED
ASK FYD
MOBILE
ACTIVITYPUB
ATPROTO
NOSTR
MCP
CAMPAIGNS
AGENTS
EMBEDS
OTHER FUTURE SURFACES.
WITHOUT RE-ENTERING THE BUSINESS'S INFORMATION.
DO NOT CREATE ClaimAuthority.
The existing evidence/object substrate owns factual truth.
The renderer must NOT be capable of minting factual claims.
The rule is:
FACTUAL RENDER BINDING
→ MUST RESOLVE TO
OBJECT FIELD / CLAIM / EVIDENCE
or:
FAIL CLOSED.
Generated PRESENTATION language is a different class.
Therefore classify every displayed value:
DIRECT_FACT
DERIVED_FACT
GENERATED_PRESENTATION
OWNER_OVERRIDE.
The binding verifier already exists and is wired.
KEEP IT AT THE PROJECTION SEAM.
A component may transform presentation:
"$125.00"
→ "$125"
but may not invent:
"Colorado's #1 plumber."
unless that exists as an appropriately supported claim.
For generated prose:
store the supporting object/claim IDs with the generated presentation.
No support?
It cannot be presented as fact.
THIS IS THE AUTHORITY MODEL.
EVIDENCE/OBJECTS OWN FACTS.
SITE SPEC OWNS COMPOSITION.
RENDERER OWNS PRESENTATION.
OWNER OWNS OVERRIDES.
AGENT MAY PROPOSE.
NONE OF THEM MAY SILENTLY TAKE ANOTHER'S JOB.
THE PIPELINE DOES NOT OWN THE FINAL PRESENTATION DECISION.
Correct model:
SOURCE OBSERVATION:
"123 Main St"
OBJECT:
address field exists.
VISIBILITY POLICY:
current visibility state.
OWNER OVERRIDE:
SHOW / HIDE.
RENDERER:
obeys effective visibility.
We have now proven the owner address override.
KEEP IT GENERIC.
Do not encode:
ADDRESS = PRIVATE
as immutable truth.
Instead:
field
+
source visibility
+
schema sensitivity
+
policy default
+
owner override
+
viewer context
→ effective visibility.
For a plumber:
public business address may be crucial.
For a person's home:
precise address may be dangerous.
Same primitive.
Different decision.
WHY THIS IS NOT THE PRODUCT.
TRUST IS THE PRODUCT PROPERTY.
Most customers should never need to inspect provenance.
The default experience should simply feel correct.
WHY THIS exists for:
correction
disputes
high-consequence claims
confidence
debugging
agent explanations.
Do not plaster provenance badges everywhere.
Preferred UX:
normal fact
→ optional subtle "Why?"
→ evidence drawer when requested.
The plumber should spend their time saying:
"Move emergency service up."
NOT:
"Show me your provenance DAG."
THE REQUIRED CONTRACT IS:
SiteSpec
+
ObjectGraph version
+
ViewerContext
+
Renderer version
+
Theme/versioned assets
→ SEMANTIC RENDER MODEL.
That semantic model must be deterministic.
Do NOT require browser HTML bytes to be globally identical if frameworks
legitimately introduce irrelevant runtime details.
Determinism belongs at the semantic projection boundary.
Already proven at probe level.
TURN THAT INTO A PERMANENT REGRESSION TEST.
Explicitly control:
section ordering
tie breaking
object ordering
generated component IDs
theme token resolution
locale
time-dependent values
random values.
NO Date.now()
NO Math.random()
NO insertion-order accidents
NO module-global counters
inside semantic generation.
CORRECT.
DO NOT RESPOND TO SIMILAR SITES WITH A GIANT AI PLANNER.
START WITH A VISIBLE DETERMINISTIC PLANNING POLICY.
Conceptually:
OBJECT/RELATIONSHIP PATTERN
→ SECTION ELIGIBILITY
→ SECTION PRIORITY
→ COMPONENT VARIANT.
Examples:
Service count > 0
→ Services eligible.
Location count > 0
→ Locations eligible.
Person + works_for
→ People/Team eligible.
External identities
→ Connected/Explore eligible.
Posts
→ Recent eligible.
Capabilities:
request_quote
→ CTA eligible.
Then AI may PROPOSE a better composition.
AI does not need to own the baseline.
This gives us:
DETERMINISTIC DEFAULT
+
INTELLIGENT OPTIONAL IMPROVEMENT.
THAT IS THE RIGHT FYD PATTERN REPEATED EVERYWHERE.
DO NOT TURN SiteSpec INTO JSX.
DO NOT TURN IT INTO A GENERAL PROGRAMMING LANGUAGE.
Keep the IR narrow.
Conceptually:
SiteSpec
pages[]
sections[]
component
binding/query
presentation
capability bindings
visibility
navigation
theme tokens
owner overrides
version metadata.
The SiteSpec references objects.
It does not duplicate their factual truth.
LOCK THIS.
1. SOURCE / OBJECT STATE
What FYD knows.
2. OWNER INTENT
What the owner explicitly wants.
3. GENERATED PRESENTATION
How FYD currently chooses to show it.
Source changes must not erase owner intent.
Generated presentation can be thrown away and regenerated.
THAT IS WHY THE BUILDER CAN GET BETTER FOREVER.
DO NOT IMPORT WHOLE BUILDERS.
HARVEST THESE MECHANISMS.
OPENPAGE:
HARVEST:
typed JSON as shared human/AI/render interface
diffable structured mutations
schema-valid generation
portable output.
DO NOT adopt its site model as FYD truth.

PUCK:
HIGH-VALUE HARVEST TARGET.
It already supports:
React component registry
structured editor data
external data sources
dynamic props
dynamic fields
viewports
data migration
global permissions
component permissions
dynamic per-instance permissions.
Investigate whether Puck can become an OPTIONAL FYD visual editing
surface over a SiteSpec adapter.
DO NOT make Puck canonical.
Desired boundary:
FYD SiteSpec
↕
Puck adapter
↕
visual editing.
If impedance is high:
reject it.
Do not bend FYD around the editor.

CHAI BUILDER:
HARVEST:
editor / registry / renderer separation
data providers
block registration
AI-aware props
server/render separation.
Compare these patterns to our existing component registry.

GRAPESJS:
HARVEST:
visual editing UX
data-source concepts
template/data separation
asset management ideas.
Its current Studio SDK explicitly supports custom template engines and
data-aware components.
Useful pattern.
But do not replace the working FYD renderer.

TIPTAP:
IMPORTANT CONCEPTUAL HARVEST.
Its 2026 direction is:
structured document
as first-class product data,
queryable,
versioned,
permissioned,
validated server-side,
while the editor is merely one client.
THAT IS THE FYD MENTAL MODEL.
OUR SITE IS A STRUCTURED PRODUCT OBJECT.
THE VISUAL EDITOR IS A CLIENT.
THE AGENT IS ANOTHER CLIENT.
THE RENDERER IS ANOTHER CLIENT.
ONE SITE MODEL.
MANY EDITORS.
OWNER CAN:
CLICK
DRAG
TYPE
TALK
USE MOBILE
ASK AN AGENT
USE AN API.
All produce:
TYPED PATCH.
Not arbitrary source-code mutation.
Example:
OWNER:
"Move emergency service first."
→ SitePatch
VISUAL EDITOR:
drags Services above About
→ SAME CLASS OF SitePatch.
AGENT:
suggests commercial page
→ SitePatch PROPOSAL.
API:
updates theme
→ SitePatch.
ONE MUTATION MODEL.
THIS IS THE FUTURE-PROOF PIECE.
AUTHORIZED PUBLIC DEMO MEDIA:
INGEST IT.
Do not rely solely on hotlinks.
Pipeline:
SOURCE URL
→ ACQUIRE
→ MIME VERIFY
→ SAFETY/LIMIT CHECK
→ CONTENT DIGEST
→ ORIGINAL EVIDENCE REF
→ FYD-MANAGED DERIVATIVES
→ RESPONSIVE DELIVERY.
Preserve:
source URL
observed_at
digest
MIME
dimensions
provenance
license/usage basis where known.
Do not claim ownership of externally sourced media.
Do not automatically ingest arbitrary huge media.
Generate derivatives appropriate for:
thumbnail
card
hero
responsive web.
Hotlink may remain an evidence/source pointer.
FYD derivative is the stable presentation asset.
FOR THIS INTERNAL DEMO:
DEMO OWNER MODE = APPROVED.
BUT LABEL IT TRUTHFULLY.
DEMO OWNER MODE
IS NOT AUTHENTICATION.
Every mutation generated through it is tagged as:
demo/test actor
proposed auth context
non-production identity assurance.
Before external customer mutation:
REAL OWNER AUTH IS REQUIRED.
Do not allow demo mode to quietly become production authentication.
FULL EVIDENCE-BACKED Q&A.
NOT A NARROW FAQ BOT.
But bounded to what FYD actually knows.
Question:
"What services do they offer?"
Answer:
supported services.
Question:
"Are they the best plumber in Colorado?"
If evidence does not establish that:
FYD SAYS SO.
This is critical.
ASK FYD must be able to say:
"I don't have evidence for that."
That sentence creates more trust than hallucinated marketing copy.
Build bounded context from:
target object
relevant related objects
claims
evidence
visibility
viewer context
capabilities
question.
DO NOT dump:
raw journal
whole tenant
private context
provider tokens
irrelevant embeddings
into the model.
Retrieve first.
Reason second.
Structured response:
answer
supporting_claim_ids
evidence_refs
related_object_ids
unknowns
suggested_actions
optional proposal.
Then render prose.
This allows the same result to power:
chat
voice
website
agent
API
future protocol projection.
THE REAL LEARNING LOOP:
FYD:
"We believe your address is X."
OWNER:
"No, use Y."
Do not mutate the original observation.
Record:
SOURCE SAID X.
OWNER SAYS Y.
CURRENT EFFECTIVE CLAIM = Y.
Then future observations can detect:
source still X
owner override Y.
FYD can eventually say:
"Your website still lists the old address. Want me to help update it?"
THAT IS A BUSINESS PRODUCT.
The best builder UI is not initially 300 controls.
It is:
"What do you want to change?"
User:
"Make emergency service the first thing people see."
FYD:
interprets intent
→ finds affected SiteSpec
→ produces typed patch
→ previews change
→ explains affected surface
→ owner approves
→ applies.
Then offer direct visual controls for users who want them.
CONVERSATION FIRST.
VISUAL PRECISION SECOND.
SAME PATCH MODEL UNDER BOTH.
HARD GATES:
FACTUAL CORRECTNESS
NO UNSUPPORTED CLAIMS
OWNER CONTROL
MOBILE SAFETY
SECURITY
ACCESSIBILITY BASELINE.
COMPETITIVE METRICS:
1. SERVICE DISCOVERABILITY
2. CONTACT/ACTION DISCOVERABILITY
3. MOBILE EXPERIENCE
4. PERFORMANCE.
Do not optimize vanity design before these.
Also measure:
TIME FROM URL → USEFUL SITE
and:
TIME FROM OWNER REQUEST → CORRECT CHANGE.
Those may become our most important product metrics.
NOT:
most knobs.
NOT:
most templates.
NOT:
most AI-generated gradients.
BEST MEANS:
LEAST WORK REQUIRED FROM OWNER
FOR THE MOST CORRECT USEFUL RESULT.
FYD should know enough to build the starting point.
Then owner says what they want.
FYD handles mechanics.
DO NOT FORCE EVERY PING SUBSYSTEM INTO FYD.
PING EARNS ITS PLACE ONLY WHERE IT CREATES OPTIONALITY.
Evidence means:
future claims can be re-evaluated.
Objects mean:
information isn't trapped in pages.
Relationships mean:
information composes.
Capabilities mean:
UI and agents can safely act.
Events mean:
changes are explainable/replayable.
Owner intent means:
regeneration doesn't erase the human.
Agents mean:
natural language can become typed proposals.
Protocol adapters mean:
the same objects can eventually travel elsewhere.
THIS IS THE REASON FOR THE SYSTEM.
NOT ARCHITECTURAL BEAUTY.
APPROVE THE GOVERNOR BACKGROUND SERVICE WITH NARROW SCOPE.
The Pig sleeping has already destroyed live browser automation.
Allowed:
wake/sleep leases
required cron entries
minimum sudoers required for those exact lifecycle operations
health/status
clean uninstall/rollback.
NOT allowed:
general passwordless sudo
unbounded command execution
new orchestration authority
unrelated machine administration.
Test:
lease acquired
→ Pig remains awake.
lease released
→ normal configured behavior returns.
worker crashes
→ lease expires safely.
reboot
→ service recovers deterministically.
RESTORE/KEEP ORACLE:
RUNNING
OBSERVABLE
READ-ONLY.
REMOVE WRITE AUTHORITY.
KEEP SEVEN-DAY EVIDENCE/ROLLBACK WINDOW.
Watch should assert:
EXPECTED READ-ONLY RUNNING STATE.
Do not alert because writes are intentionally disabled.
Do not destructively retire until evidence window completes and no
required producer/replay dependency remains.
WE HAVE HARVESTED ENOUGH TO SEE THE SHAPE.
DO NOT START A VISUAL-EDITOR MIGRATION.
DO NOT REPLACE THE RENDERER.
DO NOT START ANOTHER BUILDER.
THE NEXT PRODUCT BOUNDARY REMAINS:
RENDERED FYD NODE
→ ASK FYD
→ EVIDENCE.
BUILD THAT.
Then:
WHY THIS
→ OWNER CORRECTION
→ CONVERSATIONAL SITE PATCH
→ APPROVAL
→ REGENERATION
→ SOURCE CHANGE
→ OWNER INTENT SURVIVES.
Meanwhile one READ-ONLY builder-harvest lane may compare:
PUCK
OPENPAGE
CHAI
GRAPESJS
against our SiteSpec.
Its deliverable is only:
MECHANISM
REUSE VALUE
INTEGRATION COST
LICENSE
ADOPT / ADAPT / REJECT.
NO IMPLEMENTATION.
SOURCE MATERIAL
↓
FYD UNDERSTANDS IT
↓
OWNER CORRECTS IT
↓
PING OBJECT GRAPH
↓
FYD BUILDS THE EXPERIENCE
↓
OWNER TALKS TO IT
↓
TYPED PATCHES
↓
SITE CHANGES
↓
CUSTOMERS INTERACT
↓
CAPABILITIES EXECUTE
↓
OUTCOMES RETURN
↓
FYD LEARNS WHAT MATTERS.
THAT IS NOT JUST A WEBSITE BUILDER.
IT IS AN EVIDENCE-BACKED,
OBJECT-NATIVE,
AGENT-OPERABLE
DIGITAL PRESENCE.
THE WEBSITE IS THE FIRST OUTPUT.
BUILD THE PRODUCT.
NOT THE TOOLBAR.
GO.
