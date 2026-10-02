# FYD — Keep Going, Product-Core Harvest Directive

Issued by Nolan, 2026-09-24 ~05:19 MDT. Verbatim.

---

FYD — KEEP GOING.

DO NOT CONFUSE HARVESTING EVERYTHING WITH BUILDING EVERYTHING.

WE ARE DOING TWO DIFFERENT THINGS:

KNOW BROADLY.
BUILD NARROWLY.

FYD IS NOT A WEBSITE BUILDER WITH AI ADDED.

The fundamental product is:

MESSY DIGITAL EXISTENCE
→ EVIDENCE-BACKED DIGITAL OBJECT
→ OWNER-CORRECTED DIGITAL OBJECT
→ MANY USEFUL PROJECTIONS.

The website is projection #1 because it is:

visible
valuable
testable
easy for an owner to understand
and exercises almost the entire architecture.

But preserve the ability for the SAME entity to later become:

website
Circle
social identity
search result
concierge context
MCP resource/tools
agent context
mobile experience
marketplace listing
campaign target
ActivityPub projection
ATProto projection
voice experience
future surfaces we have not invented yet.

THAT OPTIONALITY IS WHY WE DO NOT MAKE HTML THE TRUTH.

Continue ecosystem + PING archaeology in parallel.

For every serious candidate record:

PROBLEM
VERSION / SHA
LICENSE
SECURITY POSTURE
MATURITY
DATA OWNERSHIP
LOCK-IN
DEPENDENCY WEIGHT
REPLACEABILITY
WRAPPER COST
WHAT FYD CODE IT DELETES
ADOPT / WRAP / LEARN / REJECT.

SEARCH PING FIRST.

SEARCH EXISTING DEPENDENCIES.

SEARCH GIT HISTORY.

THEN SEARCH EXTERNAL ECOSYSTEM.

HAND-WRITE ONLY THE DIFFERENTIATED FYD DELTA.

OWN DEEPLY:

EVIDENCE-BACKED ENTITY UNDERSTANDING

OBJECT + RELATIONSHIP COMPILATION

OWNER INTENT

CORRECTION SURVIVAL

CONFLICT PRESERVATION

CLAIM BINDING

EXPERIENCE COMPILATION

CONCIERGE CONTEXT

CAPABILITY GRAPH

ACTION/OUTCOME HISTORY.

TRY NOT TO OWN:

crawler infrastructure
browser engines
drag/drop editors
rich-text editors
domain provisioning
SSL automation
generic OAuth plumbing
generic federation machinery
generic agent transport
generic collaboration algorithms
generic hosting.

Commodity capability getting better is GOOD.

It means FYD gets smaller while its differentiated layer gets deeper.

DO NOT MOVE THE FRONTIER BACKWARD.

Renderer/browser is GREEN.

Therefore:

RENDERED EXPERIENCE
→ ASK FYD
→ EVIDENCE

IS NOW THE FRONT.

Build the smallest complete Ask FYD path.

Question:

"What services does this business offer, and how do you know?"

BUT DO NOT FAKE SERVICES.

If the graph does not contain evidence-bound Service objects:

THAT IS THE FAILURE.

Fix the compilation layer.

We need:

BUSINESS
└── offers
├── SERVICE
├── SERVICE
└── SERVICE

Each Service must carry mechanically resolvable evidence bindings.

Ask FYD receives an AUTHORIZED ContextBundle.

Not database access.

Not arbitrary RAG.

Not raw Postgres.

Not entire tenant memory.

Conceptually:

ViewerContext
+
GraphSnapshot
+
Allowed Fields
+
Evidence Bindings
+
Relevant Owner Assertions
+
Question
→ Answer.

Output must distinguish:

SUPPORTED FACT
DERIVED EXPLANATION
INFERENCE
UNKNOWN.

Every factual citation must resolve against the exact graph/evidence
snapshot used to answer.

Dangling evidence reference:

FAIL CLOSED.

Hidden field:

NOT PRESENT TO THE MODEL.

Do not merely prompt the model not to reveal it.

DATA NOT PRESENT > PROMPT INSTRUCTION.

Keep the decision already made:

THE RENDERER DOES NOT OWN TRUTH.

THE PLANNER DOES NOT OWN TRUTH.

ASK FYD DOES NOT OWN TRUTH.

THE MODEL DOES NOT OWN TRUTH.

Eligible factual material comes through:

EVIDENCE / OWNER ASSERTION
→ OBJECT GRAPH
→ PROJECTION POLICY
→ BINDING VERIFIER
→ CONSUMER.

Website renderer and Ask FYD are merely TWO CONSUMERS.

Eventually:

search
Circle
agent context
ActivityPub
ATProto
MCP

must consume the same policy.

THAT is optionality.

Keep these separate forever:

OBSERVED WORLD
OWNER INTENT
GENERATED PRESENTATION.

Example:

SOURCE OBSERVATION:
123 Main Street

OWNER INTENT:
PUBLIC

PRESENTATION:
"Visit us at 123 Main Street."

If owner changes visibility:

the observation remains.

If owner corrects the address:

the original observation remains.

If source changes later:

preserve both histories.

Do not flatten truth, policy, and presentation into one mutable field.

DO NOT TURN PROVENANCE INTO THE PRODUCT.

WHY THIS is infrastructure exposed when useful.

Primary owner experience:

SEE
→ CORRECT
→ CUSTOMIZE
→ PUBLISH.

WHY THIS appears when:

something looks wrong
sources conflict
confidence is weak
owner asks
visitor asks evidence-sensitive question
agent proposes a consequential change.

Quiet trust primitive.

Not homepage theater.

Do not stop for another architecture review.

Immediately prove ONE correction.

Example:

FYD says:
"Emergency service available."

Owner:

CORRECT / HIDE / CONFIRM.

Record typed owner intent.

Regenerate.

Owner intent survives.

Then mutate the source fixture.

Regenerate again.

Owner intent STILL survives.

If source now conflicts:

DO NOT silently overwrite.

Produce:

SOURCE_CHANGED_AGAINST_OWNER_ASSERTION.

That conflict is valuable information.

Owner:

"Put commercial services first."

Interpretation produces:

STRUCTURED SITE PATCH.

Not JSX.

Not direct DOM mutation.

Not filesystem edits.

Not arbitrary agent execution.

Flow:

INTENT
→ CURRENT SITE SPEC
→ PROPOSED SITE PATCH
→ BEFORE/AFTER
→ POLICY
→ APPROVAL IF REQUIRED
→ APPLY
→ REGENERATE.

Low-consequence layout changes should eventually feel nearly instant.

Do not make users administrate an authority system.

Authority complexity belongs underneath the product.

HARVEST CURRENT PUCK.

Do not recreate its editor.

FYD OWNS:

SiteSpec
OwnerIntent
SitePatch
ObjectGraph.

Puck gets a projection of editable SiteSpec.

Puck emits structured changes back through SitePatch.

PUCK IS AN EDITING SURFACE.

PUCK IS NOT CANONICAL STATE.

Prove that seam before allowing it deep into the product.

Fresh harvest note:

Crawl4AI has moved beyond 0.9.3.

RE-EVALUATE CURRENT RELEASE BEFORE PINNING.

Its recent security history reinforces the boundary:

CRAWLER = UNTRUSTED ACQUISITION WORKER.

Not trusted PING kernel.

Network-bound it.
Resource-bound it.
Do not hand it credentials unnecessarily.
Treat returned content as hostile observations.

But:

DO NOT REPLACE THE CURRENT ACQUISITION STACK WHILE IT WORKS.

Escalate only on a real cold-site failure.

Do not build custom domain/SSL orchestration.

Maintain a portable DomainProvider seam.

Use commodity platform capability when product demand arrives.

FYD owns tenant/domain intent.

Provider owns certificates/routing mechanics.

HARVEST CURRENT MCP CONTRACT.

NO MCP IMPLEMENTATION WAVE YET.

Its newer stateless/request-oriented architecture strengthens the future
design:

PING capabilities
→ MCP projection.

Not:

MCP
→ PING truth.

That distinction matters enormously.

Read-only harvest can continue across:

Puck
Crawl4AI
Playwright
Lightpanda
Vercel Platforms
Automerge
MCP
ATProto
ActivityPub/Fedify
Nostr
Farcaster
Schema.org
RSS/Atom
WebFinger
Webmention
identity/DID tooling
capability systems
provenance systems
search/indexing
local-first engines.

BUT EACH HARVEST MUST ANSWER:

WHAT FUTURE OPTION DOES THIS PRESERVE?

WHAT FYD-SPECIFIC CODE COULD IT DELETE?

WHAT PART MUST REMAIN OURS?

No adapter implementation merely because research found something cool.

The Grill contains legitimate runtime/security decisions.

They are NOT automatically FYD blockers.

In particular:

cross-era identity
agent/tenant constitutional boundaries
CRDT policy
connector licensing
journal cleanup
Jev calibration

remain independently managed unless the CURRENT FYD loop actually
depends on them.

The historical audit already taught us what happens when names overclaim
mechanisms and operational infrastructure becomes confused with product
truth.

KEEP ERA / AUTHORITY / PROJECTION CLAIMS PRECISE.

The Grill reports both :8080 and :8081 attached to the same database.

That is not product architecture.

That is operational risk.

Since the candidate itself had prior authorization and :8081 is now the
redundant second gateway, resolve DEPLOY-PROV-001 through the canonical
Grill instead of allowing indefinite dual-writer exposure.

DO NOT improvise from this directive.

Use the existing decision/runbook authority.

Do not let the proposed 2,487 git observations distract the FYD product
proof.

That is a PING ingestion milestone.

It can remain operator-gated independently.

FYD does not need 2,487 git events to answer:

"What services does this business offer, and how do you know?"

I WANT BOTH BACKENDS MANAGEABLE.

HAPPY PLACE
COPPERSMITH.

Keep exactly these two until Nolan has personally used both.

For EACH:

OPEN SITE
→ ASK FYD
→ ASK SERVICES
→ SEE EVIDENCE
→ ENTER OWNER MODE
→ CORRECT ONE THING
→ CUSTOMIZE ONE THING IN PLAIN ENGLISH
→ APPROVE
→ REFRESH
→ STILL CORRECT.

Then:

SOURCE V2
→ REOBSERVE
→ REGENERATE
→ OWNER INTENT SURVIVES.

That is the current company.

After Nolan can do that:

ONE REAL BUSINESS OWNER.

Watch.

Do not explain the architecture.

Give them the URL.

Observe:

time to comprehension
what they think is wrong
what they try to change
whether they understand Customize with FYD
whether Ask FYD is useful
whether they trust the result
whether they would publish it.

THEIR CONFUSION BECOMES THE NEXT PRODUCT BACKLOG.

The goal is not:

MORE GREEN TESTS.

The goal is:

FEWER CLASSES OF FAILURE.

A strong primitive should eliminate multiple backlog items.

Examples:

SHARED PROJECTION POLICY
eliminates privacy divergence across renderer / Ask / search / Circle /
agents.

OWNER INTENT
eliminates correction-loss classes.

CLAIM BINDINGS
eliminates unsupported factual presentation classes.

SITE PATCH
eliminates multiple customization mutation paths.

CONTEXT BUNDLE
eliminates arbitrary agent data access.

BUILD PRIMITIVES THAT COLLAPSE FAILURE CLASSES.

ASK FYD HAPPY PLACE:
PASS/FAIL

ASK FYD COPPERSMITH:
PASS/FAIL

SERVICE OBJECTS:
...

EVIDENCE RESOLUTION:
...

DANGLING REF TEST:
PASS/FAIL

PUBLIC/HIDDEN FIELD TEST:
PASS/FAIL

OWNER CORRECTION:
...

CORRECTION SURVIVES REGEN:
YES/NO

SOURCE-V2 CONFLICT:
...

PLAIN-ENGLISH CUSTOMIZATION:
...

PATCH PROPOSED:
YES/NO

APPROVED:
YES/NO

REFRESH PERSISTENCE:
YES/NO

HARVEST:
ONLY NEW HIGH-LEVERAGE FINDINGS

FIRST BROKEN PRODUCT STEP:
...

NEXT:
...

HARVEST THE WORLD.

OWN THE DIFFERENTIATION.

BUILD THE SMALLEST CORE.

THE PRODUCT IS NOT HTML.

THE PRODUCT IS NOT AN LLM.

THE PRODUCT IS NOT A CRAWLER.

THE PRODUCT IS NOT A GRAPH DATABASE.

THE PRODUCT IS NOT A PROTOCOL.

THE PRODUCT IS:

A REAL ENTITY'S MESSY DIGITAL EXISTENCE

COMPILED INTO

A TRUSTWORTHY
OWNER-CORRECTABLE
INTELLIGENT
ACTIONABLE
PORTABLE DIGITAL OBJECT

THAT CAN BECOME MANY EXPERIENCES.

RIGHT NOW:

MAKE THAT OBJECT ANSWER ONE QUESTION CORRECTLY.

THEN LET ITS OWNER CHANGE IT.

THEN PROVE IT REMEMBERS.

GO.
