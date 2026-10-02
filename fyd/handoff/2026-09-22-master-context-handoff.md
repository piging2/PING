# PING / FYD Social — Comprehensive Context Handoff

PING / FYD SOCIAL — MASTER CONTEXT HANDOFF
State as of 2026-09-22

READ THIS BEFORE MAKING ARCHITECTURAL CHANGES.

This document exists because the conversation/context that produced the current system is ending.

Do not infer the project from the latest dirty worktree alone.

The repository contains years/layers of experiments, duplicate authorities, dormant code, harvested systems, operational infrastructure and current FYD work.

The product direction is much clearer than the repository.

Current FYD builder work reportedly sits uncommitted in:

/home/nolan/projects/ping

branch:

fyd/builder-composition

DO NOT MOVE IT YET.

DO NOT generate a patch merely because context is ending.

DO NOT commit/push unfinished work merely to preserve it.

DO NOT overwrite or reconcile unrelated dirty files.

First:

git status
git branch --show-current
git rev-parse HEAD
git diff --stat
git diff --name-status

Classify every dirty file by lane/owner.

Preserve other lanes.

The current work is MID-BUILD and not yet fully browser/product verified.

Treat it as owned WIP.

If a transfer becomes necessary later:

prefer a clean, reviewed commit containing ONLY the FYD lane's proven
changes.

A patch is acceptable for transfer, but it is not the architectural
handoff.

THIS DOCUMENT IS THE CONTEXT HANDOFF.

============================================================

PRODUCT NAMING
============================================================
PING

umbrella platform/runtime/ecosystem.

It contains or is intended to contain:

identity
objects
relationships
capabilities
canonical events/transitions
evidence/provenance
agents
execution
acquisition
projections
protocol adapters
private context
Mission Control
runtime infrastructure.

FYD SOCIAL

the customer-facing product.

Do not rename deep PING primitives to FYD.

Do not make FYD a forked second platform.

FYD should consume the smallest useful executable PING kernel.

FYD turns the digital presence you already have into an evidence-backed,
intelligent, editable web presence that understands your business and can
act with you.

Longer future form:

FYD proceduralizes a person's/business's existing digital presence into
portable PING objects and relationships, generates an intelligent web
experience from them, lets the owner correct/customize it conversationally,
and eventually projects authorized objects/actions across social networks,
agents and other applications.

NOT:

a profile app
a Wix clone
a Webflow clone
a generic AI HTML generator
a CMS-first product
another social-network database
another event bus
another workflow engine
another agent runtime
another graph database
another ActivityPub stack
another ATProto PDS
a mass-scraping surveillance graph
an autonomous marketing spam system.

The website is an important projection.

It is not canonical truth.

A stranger should eventually do:

PASTE URL

and shortly afterward think:

"How did FYD know all that?"

Then:

"Why does FYD think this?"

Then:

"Fix this."

Then:

"Move emergency services to the top."

Then FYD proposes the change.

Owner approves.

Site changes.

Refresh persists.

Later the source changes.

FYD detects the change WITHOUT destroying owner corrections or
customization.

That is the current product loop.

Think of FYD as a compiler.

FRONT END

sources
→ discovery
→ acquisition
→ parsing
→ structured extraction
→ observations
→ evidence.

SEMANTIC ANALYSIS

entity resolution
→ object resolution
→ relationship resolution
→ provenance
→ visibility
→ conflict detection.

INTERMEDIATE REPRESENTATION

PING OBJECT GRAPH.

PLANNING

ObjectGraph

owner intent
viewer context
schema semantics
→ SiteSpec.

BACK END

SiteSpec

ObjectGraph
ViewerContext
→ deterministic renderer
→ FYD web experience.

Other future back ends:

Circle/embed
feed
ActivityPub
ATProto
Nostr
MCP
desktop/mobile
other protocol projections.

This compiler model is important.

It prevents provider-specific semantics and frontend implementation from
becoming canonical truth.

SOURCES
↓
DISCOVERY
↓
ACQUISITION
↓
OBSERVATIONS
↓
EVIDENCE
↓
ENTITY / OBJECT RESOLUTION
↓
PING OBJECT GRAPH
↓
FYD SITE PLAN / SITESPEC
↓
COMPONENT TREE
↓
WEB EXPERIENCE
↓
HUMAN / SOCIAL INTERACTIONS
↓
AGENT ACTIONS / PROPOSALS
↓
AUTHORIZATION
↓
CANONICAL EVENT / TRANSITION
↓
OUTCOME
↓
NEW OBSERVATIONS
↓
LEARNING / REGENERATION.

Do not build product features that bypass this loop without a very good
reason.

Core philosophy:

DO NOT SPEND INTELLIGENCE ON WHAT SOFTWARE CAN PROVE.

Deterministic:

canonicalization
hashing
signatures
schema validation
JSON-LD parsing
exact identity matching
relationship lookup
permissions
dedupe
projection
replay
rate limiting
batch execution
URL validation.

Intelligence:

messy semantic extraction
ambiguous entity resolution
summarization
site composition
copy
design decisions
conflict interpretation
campaign interpretation
research
recommendations.

Ideal pattern:

INTELLIGENCE PLANS.

SOFTWARE EXECUTES.

Preserve raw/structured evidence before asking models to interpret it.

Preferred:

SOURCE
→ OBSERVATION
→ EVIDENCE
→ INTERPRETATION
→ OBJECT/CLAIM.

Not:

SOURCE
→ LLM SUMMARY
→ THROW SOURCE AWAY.

Every important derived claim should remain traceable.

This is a hard lesson from a real incident.

Two duplicate outreach emails were sent because stale narrative notes
overrode structured pipeline state.

Permanent architectural rule:

CANONICAL STRUCTURED STATE
>
explicit suppression
>
verified action/communication history
>
derived projection
>
notes/free text.

Free-form prose can inform.

It cannot resurrect completed actions or override canonical structured
state.

This applies beyond outreach.

The intended high-level path is:

REQUEST / INTENT
↓
IDENTITY
↓
CAPABILITY
↓
SCHEMA VALIDATION
↓
EVENT AUTHORITY
↓
ping_events
↓
OBJECT / RELATIONSHIP / FEED / OTHER PROJECTIONS.

Agent path:

Identity
↓
Mission
↓
Run
↓
ExecutionAuthority
↓
ExecutionAdapter
↓
agent result
↓
PROPOSED transition
↓
Capability evaluation
↓
human approval if required
↓
UnifiedEventRuntime
↓
ping_events
↓
projections.

Hard invariants:

MISSION STATE != OBJECT STATE

EXECUTION != AUTHORIZATION

AGENT OUTPUT != CANONICAL TRUTH

PROJECTION != CANONICAL TRUTH

FEED != CANONICAL TRUTH.

Previously rejected unless evidence proves necessity:

ProposalAuthority
SocialAuthority
SocialIdentityAuthority
RelationshipAuthority
TransitionAuthority
ProofAuthority
FeedAuthority
ObjectEventStore
SocialEventStore
new EventBus
new workflow engine
new scheduler
graph database.

Reuse existing authorities/primitives.

Chosen direction:

MODEL B.

Canonical truth is event/transition history.

Objects and relationships are projections/materializations.

The important existing event spine is:

UnifiedEventRuntime
→ ping_events
→ replay
→ projections.

There have historically been competing event systems/tables.

Do not assume similarly named tables are equivalent.

Do not create another one.

PING historically had fragmented identity concepts:

tenant_id
actor
agent_id
customer_id
internal IdentityAuthority IDs.

The original IdentityAuthority was not a complete portable human identity
system.

Existing JS deterministic ID format was found to be:

${type}_${hash.substring(0,16)}

Do not globally rewrite identifier formats for cleanliness.

Compatibility/replay matters more than aesthetic consistency.

Cryptographic identity work later added real Node Ed25519 signing/
verification.

Private signing keys must not enter Postgres canonical events.

Do not build dozens of object classes.

Core semantic primitives are approximately:

ACTOR
OBJECT
RELATIONSHIP
CAPABILITY
TRANSITION
PROOF/EVIDENCE.

Useful object families include:

Person
Business
Organization
Location
Service
Product
Project
Article
Post
Media
Offer
Event
etc.

Schemas differentiate behavior.

The substrate stays generic.

FOLLOW IS NOT THE RELATIONSHIP SYSTEM.

It is one predicate.

General relationship examples:

follows
subscribes
references
created
owns
member_of
endorses
sponsors
purchased
contributed_to
collaborates_with
derived_from
responds_to
located_at
works_for
links_to.

Relationships observed/inferred externally need immutable provenance/
evidence linkage.

Native user-authored relationships get actor/signature/event provenance.

Do not depend on mutable present-day claim state to reconstruct why a
relationship existed.

Core pattern:

OBJECT
→ COMPONENT
→ CAPABILITY.

A Service object might render a ServiceCard and expose:

read
reference
ask
request_quote.

A Post might expose:

read
like
reply
reference
ask.

UI must not promise capabilities that do not exist.

Human UI and agents should ultimately operate on the SAME capability
substrate.

Capability UX should eventually use human-readable bundles such as:

"Allow this agent to help maintain my site"

which internally attenuate into narrower capabilities.

Do not expose users to 30 raw internal permission names unless necessary.

Agents:

READ
REASON
PROPOSE.

They do not become canonical truth because they generated an answer.

Consequential external action requires capability/policy/authorization.

The project has already proven the useful pattern:

agent proposal
→ publish denied
→ human approval
→ exact proposal digest
→ canonical transition.

Preserve it.

Long-term:

every identity has a Mission Control.

Identity owns/controls.

Mission Control is the operating surface.

It is NOT the domain object itself.

Conceptual contents:

Missions
Runs
Agents
Objects
Relationships
Feed
Capabilities
Private Context
Evidence/History.

Do not let Mission Control admin aesthetics leak into FYD's customer
surface.

Current framing:

PROFILE

fallback projection when FYD knows little.

CIRCLE

portable compact doorway/preview.

Desktop:
hover/focus.

Mobile:
tap/sheet.

NODE

full intelligent web experience.

OBJECT GRAPH

substrate.

AGENT / CONCIERGE

intelligence.

EVENT HISTORY

truth.

Do not make Profile/Circle/Node competing canonical object systems.

The builder is NOT primarily a blank canvas.

It is an OBJECT-SITE COMPILER.

Input:

evidence-backed graph.

Output:

declarative SiteSpec.

Renderer:

SiteSpec + ObjectGraph + ViewerContext → UI.

This is important because it gives us:

regeneration
versioning
comparison
agent edits
themes
mobile
protocol independence
dependency tracking
human/AI shared editing.

Do NOT store bespoke generated JSX as the customer's product.

Conceptually:

SiteSpec
  owner
  object
  version
  theme/design tokens
  navigation
  pages

Page
  slug
  title
  sections

Section
  component
  object query/reference
  presentation.

Do not blindly replace current schemas with this pseudocode.

Search current implementation first.

Existing/desired generic component vocabulary has included:

Hero
IdentityCard
BusinessSummary
ObjectGrid
Services
Products
Locations
People
Posts
Projects
Gallery
Links
Contact
SocialProof
RelationshipList
AskFYD
ObjectFeed
CTA
GenericObjectCard.

Every component should declare:

accepted schemas
required fields
optional fields
responsive behavior
capability bindings where relevant.

No customer-specific components merely to make a demo look good.

Two unrelated real websites have been processed through the same
proceduralizer.

Happy Place:

15 facts
2 objects
1 relationship.

Coppersmith Plumbing & HVAC:

38 facts
4 objects
3 relationships.

Coppersmith exposed a real JSON-LD blind spot:

Rank Math used @graph.

Old flattener produced zero useful facts from it.

This was fixed GENERICALLY using:

jsonld@9.0.0

pinned.

No custom JSON-LD processor.

Remote contexts refused.

Malformed JSON-LD fails closed.

Coppersmith @graph result after repair:

11 nodes visited
38 facts
4 objects
3 relationships.

Determinism was proven across separate processes and reordered fixtures.

At the latest verified renderer boundary:

CANONICAL TEST:

195 / 195 PASS.

Earlier canonical clean detached-worktree gate:

127 / 127 PASS
Node v22.23.2
npm 10.9.8.

There was an earlier contradiction between "11 failing" and "45 passing."

Lesson:

never report test health without:

SHA
runtime
working directory
canonical command
discovered count
pass
fail
skip
exit code.

A committed gate exists at:

src/fyd/TEST-GATE.md

Verify current state before trusting historical counts.

Happy Place SiteSpec:

digest:
bc4148b93231eb46

Home:
Hero
BusinessSummary
Locations
Contact
Links
AskFYD

About:
BusinessSummary

7 sections.

Nav:
Home
About.

Coppersmith SiteSpec:

digest:
473c9d97546ef9cd

Same core home/about structure PLUS:

Explore
→ ObjectFeed.

8 sections.

Nav:
Home
About
Explore.

Why different:

Coppersmith graph contains:

Person
ExternalIdentity
works_for
links_to

that Happy Place does not.

Therefore graph semantics changed composition.

This is GOOD deterministic difference.

Do not force random visual differences merely to claim personalization.

At latest proof:

ZERO customer-specific code was required for those two generated
experiences.

Same proceduralizer.

Same renderer.

Preserve this benchmark.

A serious renderer issue was found:

untrusted source URLs could reach href verbatim, including javascript:.

This was correctly treated as the first broken boundary.

URL safety was repaired.

Latest reported state:

URL SAFETY: PASS
HOSTILE PROBE: PASS.

Do not regress this.

Source content is DATA.

Never executable presentation code.

There is also a binding verifier intended to prove rendered factual claims
are backed by graph/evidence.

Latest state:

BINDING VERIFIER: WIRED
UNBOUND FACTUAL CLAIM TEST: PASS.

This is the answer to:

"Who owns no invented claims?"

Do not create a new authority merely for rendering.

The renderer/projection seam must be constrained so factual output binds
to evidence-backed graph data.

Generated presentation copy must be explicitly classified as generated
copy rather than masquerading as sourced fact.

Important conceptual distinction:

DIRECT FACT
DERIVED FACT
INFERENCE
GENERATED COPY
OWNER OVERRIDE.

Do not flatten these into one string.

"WHY THIS?" can expose provenance when useful.

It is NOT intended to force business owners to inspect evidence constantly.

The product purpose is TRUST and CORRECTION.

Normal path should remain simple.

A machine previously withheld Coppersmith's street address as private.

That exposed an important ownership issue.

CG-001:

tenant owner is default human decision authority.

Therefore machine defaults may protect users, but the owner must be able to override legitimate presentation visibility.

Latest reported state:

OWNER ADDRESS OVERRIDE: PASS.

There is field-visibility machinery.

Preserve the distinction:

DEFAULT SAFE VISIBILITY
vs
OWNER EXPLICIT VISIBILITY DECISION.

Do not let extraction policy silently become permanent business policy.

Latest reported state:

MOBILE A: PASS
MOBILE B: PASS.

Tested widths included:

320
375
1280.

A previous 375 failure was a dirty-worktree artifact, not committed code.

A genuine 320 overflow was isolated to Ask FYD "Design tokens" proposal
rows in site-client.tsx.

Root cause:

flex child min-width prevented token input from shrinking against
the Propose button.

Fix:

min-w-0 on token input.

Button retained touch target.

Latest reported measurements:

320 scrollW=305
375 scrollW=360
1280 scrollW=1265.

Latest proven min-w-0 commit reported:

8a99742.

Verify current HEAD before relying on that SHA.

Latest state:

PASS.

Separate tsx processes produced byte-identical canonical render models.

Earlier module-level ID counter was removed.

Business IDs became pure functions of inputs.

Important invariant:

same source/evidence
same graph
same viewer context
same SiteSpec
→ same semantic rendered experience.

Identity/render output must not depend on:

module import history
process lifetime
request order
test order
unrelated customer's prior ingestion.

The renderer/browser boundary was CLOSED.

Latest next boundary was:

RENDERED EXPERIENCE
→ ASK FYD
→ EVIDENCE.

The next high-value question was:

"What services does this business offer, and how do you know?"

Ask FYD should answer from graph/evidence, not generic model knowledge.

Return structurally:

answer
evidence references
source URLs/objects
direct/derived/inferred classification
relevant objects
possible actions/proposals.

Strategic hypothesis:

the website is the visible demo.

The concierge may be the deeper product.

A FYD Node can eventually become:

WEBSITE
+
SOCIAL NODE
+
KNOWLEDGE GRAPH
+
EVIDENCE INTERFACE
+
CONCIERGE
+
AGENT/CAPABILITY INTERFACE.

That is harder to copy than generated HTML.

Therefore once baseline site quality is credible:

prioritize evidence-backed Ask FYD and conversational customization over
endless visual polish.

WHY THIS is a trust/correction primitive, not the homepage hero feature.

One fact can expose:

source
observation time
method
direct/derived/inferred status.

Example:

Emergency Plumbing
→ Why this?
→ source page
→ JSON-LD Service
→ observed timestamp.

Keep UX lightweight.

Important future loop:

CONFIRM
CORRECT
HIDE.

This creates stronger first-party evidence.

Conceptual source strength may trend toward:

OWNER-VERIFIED
>
signed/verified source
>
direct structured observation
>
derived observation
>
AI inference.

Do not constitutionalize that exact precedence until tested.

Preserve the categories.

This separation is essential:

SOURCE-DERIVED STATE

what current evidence says.

OWNER-OWNED OVERRIDES

what the owner explicitly corrected/customized.

GENERATED PRESENTATION

what FYD planned/generated.

Regeneration MUST NOT destroy owner intent.

This is one of the central website-builder invariants.

Desired UX:

Owner:

"Move emergency plumbing to the top."

System:

Request
→ typed SiteSpec patch proposal
→ before/after
→ affected objects
→ human approval where required
→ deterministic application
→ canonical transition/history
→ rerender.

Do not let the model directly mutate arbitrary JSX/files as product state.

Fresh ecosystem research suggests several useful commodity boundaries.

PUCK

Current React visual editor.

MIT.

Works with Next.js.

User owns data.

Supports component configuration + structured editor data + rendering.

Its 0.23.0 August 2026 release notably fixed generating IDs at module
import time—almost exactly the determinism class FYD already encountered.

HARVEST:

visual editing
drag/drop
component configuration
outline/reordering
field editing.

DO NOT make Puck canonical truth.

Potential future boundary:

FYD SiteSpec
↔ editing adapter
↔ Puck UI.

Evaluate before building custom drag/drop.

OPENPAGE

Recent open-source AI website builder using typed JSON as the site's
source representation, with human visual editing and AI generation over
the same structured format.

HARVEST THE PATTERN:

HUMAN + AI SHARE ONE STRUCTURED SITE REPRESENTATION.

This reinforces SiteSpec.

Do not automatically adopt the platform.

OBJECT UI / UI-SCHEMA

Schema-driven React UI systems exist and are active.

Harvest:

schema → widget eligibility
schema → validation
schema → rendering.

Do not replace FYD's domain semantics with a generic UI framework.

MCP / MCP-UI

Current MCP 2026-07-28 uses JSON Schema for tool inputs and optional
outputs.

MCP-UI implements interactive UI over MCP/MCP Apps patterns.

Harvest later for:

external agent/tool interoperability
schema-described operations
portable interactive agent surfaces.

PING remains authority.

MCP is transport/interface, not canonical truth.

AUTOMERGE

Strong optional future primitive for:

local-first owner editing
offline changes
multi-device synchronization
concurrent collaboration
branch/merge-like editing.

DO NOT add CRDT complexity to the current server-first proof.

Keep SiteSpec sufficiently structured that a CRDT-backed editor can be
added later without replacing canonical domain semantics.

VERCEL AI SDK

Provider-agnostic TypeScript agent/UI tooling is mature.

AI SDK UI is the production direction; older RSC generative-UI path is
experimental/paused.

Potential harvest:

streaming Ask FYD
structured outputs
tool loops
UI message transport.

Do not let model-provider SDK become authority.

Current acquisition ladder should remain:

HTTP / deterministic structured extraction
↓
browser when necessary
↓
intelligence when necessary.

Crawl4AI 0.9.x has useful:

browser/deep crawl
resume behavior
domain mapping
content extraction
security hardening.

BUT its recent releases also document serious historical RCE/SSRF/file
write/auth issues in its Docker/server boundary.

Lesson:

if adopted, acquisition is UNTRUSTED INFRASTRUCTURE.

Isolate it.

Restrict network egress.

Validate URLs.

Do not expose unrestricted crawl APIs publicly.

LIGHTPANDA

Headless browser specifically targeting automation/agents.

Interesting:

lower-resource browser architecture
CDP / WebDriver BiDi
agent mode
ability to turn learned browser procedures into reusable scripts.

High-value future pattern:

UNKNOWN SITE
↓
HTTP extraction insufficient
↓
browser
↓
agent discovers navigation/extraction procedure
↓
compile/save bounded deterministic recipe
↓
future refresh replays without AI
↓
recipe failure invokes intelligence again.

This matches:

KNOWLEDGE MUST COMPOUND.

Benchmark before adopting.

Question:

Should FYD download public site images, digest them and serve derivatives,
or hotlink?

Recommended architecture:

DO NOT make permanent third-party copying the only behavior.

For authorized owner-connected sources, use an explicit media acquisition
policy.

Preferred pipeline:

source media URL
→ acquisition permission/policy
→ fetch
→ content digest
→ metadata
→ provenance
→ safe derivative
→ FYD media reference.

Advantages:

stable generated sites
performance
responsive derivatives
dedupe
integrity
no third-party hotlink breakage
future optimization.

But preserve:

original source URL
observed timestamp
license/authorization basis where relevant
content digest.

For the two owner-authorized demo businesses:

local derivative caching is reasonable IF authorization to use the site
content for the demo is actually established.

If authorization is uncertain:

hotlink or use clearly authorized assets.

Never infer copyright transfer from "public URL."

Do NOT pretend a demo toggle is real authentication.

But do not block the product loop on building an entire identity product.

Use two explicit modes:

DEMO OWNER MODE

clearly labeled non-production.
Local/dev only.
Cannot be confused with actual auth.

REAL OWNER AUTHORITY

existing PING identity/capability path.

Any action that would affect real canonical/public state must use real
identity/capability authorization.

For current local builder testing:

demo owner mode is acceptable only if:

obviously marked
non-production
cannot escape local/test boundary
events identify it as demo/test.

Do not create fake security.

Use FULL evidence-backed Q&A with a BOUNDED PUBLIC CONTEXT.

Visitor Ask FYD may read only:

public projected objects
public relationships
public evidence references permitted for disclosure
public site content.

It must refuse/qualify where evidence is insufficient.

It must never receive:

private context
provider tokens
private owner notes
private keys
internal secrets
raw unrestricted journal.

Owner Ask FYD may have broader context according to capability.

Same Ask FYD product.

Different viewer context/capabilities.

For initial home-service business proof:

SERVICE DISCOVERABILITY
Can visitor understand what the company does quickly?
CONTACT / CONVERSION DISCOVERABILITY
Can visitor find the legitimate next action quickly?
MOBILE UX
Home-service traffic is heavily mobile-sensitive; mobile cannot be an
afterthought.
PERFORMANCE
Generated intelligence cannot make a basic business site feel slow.

BUT add two FYD-specific metrics:

EVIDENCE COVERAGE
What percentage of factual presentation is traceable?
OWNER CHANGE LATENCY
How quickly can owner express and safely apply a desired change?

These last two are where FYD should eventually beat conventional builders,
not merely tie them visually.

Long-term:

FYD should piggyback on legitimately public/open social data rather than
copying social networks through brittle scraping.

Conceptual:

PUBLIC SOURCE
→ SOURCE OBSERVATION
→ EVIDENCE
→ IDENTITY RESOLUTION
→ PING OBJECT/RELATIONSHIP PROJECTION.

Interesting ecosystems:

ATProto / Bluesky
Nostr
ActivityPub
Farcaster
RSS/Atom
WebFinger
Webmention
rel=me
schema.org
sameAs
public websites.

Do not implement all of this now.

Potential future evidence linking one entity:

explicit owner connection
DID
Nostr public key
ActivityPub Actor
verified domain
rel=me
sameAs
provider account claim
signed proof.

Resolve conservatively.

EXACT
AMBIGUOUS
UNMATCHED.

AI may help with AMBIGUOUS.

AI must never silently merge two humans/businesses.

A FYD Follow is a PING relationship.

It is NOT automatically "follow everywhere."

Future:

USER INTENT
↓
ACTION PLAN
↓
native FYD relationship
+
optional provider actions
↓
provider capability/permission checks
↓
preview
↓
execution
↓
receipts.

Possible provider results:

SUPPORTED
UNSUPPORTED
PERMISSION_MISSING
USER_INTERACTION_REQUIRED
RATE_LIMITED
NOT_SEMANTICALLY_EQUIVALENT.

Newsletter subscription is NOT implied by Follow.

It is a separate consent/action.

Future plain-English request:

"Find everyone I know who's already on FYD and follow them."

Do NOT launch 2,000 agents.

Use:

natural language
→ typed CampaignSpec
→ deterministic candidate query
→ exact matching
→ ambiguous bucket
→ policy
→ preview
→ approval
→ deterministic batch executor
→ receipts.

Use intelligence on ambiguous cases.

Software handles bulk deterministic execution.

For external actions:

timeout does NOT always mean failure.

Future action lifecycle needs to represent something like:

PROPOSED
AUTHORIZED
DISPATCHED
ACKNOWLEDGED
SUCCEEDED / FAILED / UNKNOWN
UNKNOWN
→ RECONCILE.

This prevents dangerous blind retries.

Do not create a new authority solely for this.

Integrate with existing event/execution semantics when needed.

Existing FYD ActivityPub work reached:

LOCAL MAPPING = VERIFIED

REMOTE INTEROP = PARTIAL

REMOTE REJECTION HANDLING = VERIFIED.

It was intentionally frozen.

Do not embellish remote success.

Fedify remains a candidate to handle commodity ActivityPub plumbing.

PING stays canonical.

Implementation was intentionally halted.

Harvest-only status.

Useful concepts:

Lexicon schemas
strong references
DID/identity separation
profile/post/like/follow record shapes
feed generators
granular permissions
permission sets.

Do not build a PDS now.

Current direction:

future external agent/tool interface.

Potential:

PING Object/Capability Runtime
↓
MCP adapter
↓
external tools/agents.

MCP does not replace PING authority.

Long-term PING has Windows/local-first ambitions.

Automerge and similar CRDT systems are relevant later for:

offline SiteSpec editing
multi-device editing
collaboration
branching/merging.

Do not introduce them until actual product requirements demand concurrent
offline editing.

Preserve optionality by keeping SiteSpec declarative and structured.

Eventually:

Observation T1
→ graph.

Observation T2
→ deterministic diff
→ affected object
→ affected SiteSpec dependencies
→ proposed regeneration.

Do not blindly regenerate the whole site.

Useful future dependency index:

object_id
→ sections/pages that consume it.

But do not overbuild incremental computation before basic regeneration is
proven.

If sources disagree:

do not silently pick.

Example:

website hours = 8–5
provider listing = 9–5.

FYD should know:

CONFLICT.

Ask FYD can eventually tell the owner:

"Your website and provider listing disagree."

That is high-value business maintenance.

A reconciliation issue repeatedly re-flagged known gaps.

It was fixed with lifecycle:

OPEN
KNOWN_PERMANENT
RESOLVED
REOPENED.

KNOWN_PERMANENT requires BOTH:

valid closure disposition
AND
independently valid ingestion evidence.

Disposition alone cannot suppress.

Reopen triggers include:

evidence change
evidence deletion
disposition removal
contradiction.

Latest real result:

17 actionable gaps
→ 15 KNOWN_PERMANENT
→ 2 genuine new R2 gaps.

13/13 lifecycle tests green.

Second run idempotent.

Nothing deleted.

Reconciler is FROZEN.

The two remaining R2 gaps are normal work, not P0 merely because they are
visible.

A PostgreSQL password appeared in docker-inspect output.

It was treated as exposed.

Rotation was completed and proven:

old credential dead
network rejection proven
five consumers agreed on replacement
journal intact at 2550 events at that time
gateway healthy.

Safe-inspection principle:

NORMAL DIAGNOSTICS MUST BE SAFE TO COPY.

Secret-like values should be redacted by default.

Do not print credentials into reports/chats.

Loopback trust vs scram-sha-256 was identified as a separate security
boundary.

Decision:

do NOT bundle pg_hba hardening with gateway promotion.

Treat it as a separate security patch after consumer compatibility and
recovery are proven.

Verify current state before acting.

Candidate 8081 proof passed earlier.

Authorization was later granted for bounded 8080 promotion using runbook
v2.

Later reports said the gateway was green earlier in the day.

VERIFY CURRENT LIVE STATE.

Do not assume historical image/SHA/container values remain current.

Runbook rule:

STEP -1:
re-observe everything immediately before deployment.

Live evidence wins.

Historical serious incident:

gateway was accidentally rewired to legacy ping-postgres/crx_runtime and
wrote synthetic replay events into the wrong DB.

Important lessons:

exact plane matters
exact era matters
exact DB matters
replay target matters
writer attribution matters.

Never infer environment from service name alone.

Do not alter append-only trigger merely to make a migration pass.

Historical Oracle journal counts have changed as the system evolved.

Do not rely on counts in this handoff as current truth.

Always observe live state.

Canonical spine remains ping_events unless current evidence explicitly
proves a newer decision.

Replay reconstructs:

state
ordering
policy decisions
lineage
projections.

It does NOT promise deterministic reproduction of LLM token output.

Important distinction:

semantic/canonical replay
!=
model-token replay.

Never put:

private keys
credentials
private memory
embeddings containing private context
secrets

into public objects or ping_events merely for convenience.

Public projections and private context must remain separable.

Source content is untrusted.

Protect against:

javascript: URLs
data/file schemes where inappropriate
unsafe HTML
dangerouslySetInnerHTML
malformed external links
private-context leakage
secret leakage.

URL allowlisting should happen generically at the projection/render seam.

Do not patch individual sites.

Do not bind the product to hotlinking.

Do not assume public means reusable forever.

Model media as evidence-backed source assets with an acquisition policy.

Future:

source
→ policy
→ acquisition
→ digest
→ metadata
→ derivative
→ rendered asset.

This supports:

performance
responsive images
integrity
dedupe
migration
offline/local-first
future CDN choice.

A demo server was reported on the Pig at port 3100.

Routes included generated sites such as:

/sites/happy-place

A Tailscale URL previously claimed reachable was falsified.

Root cause:

WSL localhost relay listened on IPv6 loopback only.

Two private access options were identified:

Windows/Tailscale port forward to WSL

or

SSH local tunnel.

Do not expose the dev server publicly merely for convenience.

Verify current server/PID/HEAD before giving Nolan a URL.

A separate automation failure was traced to Windows Modern Standby.

Pig slept mid-browser run.

Page targets died.

Workers reused a dead page and subsequent actions failed.

Fixes:

per-browser lock
reopen page if target dies mid-pass.

Recommended power strategy:

DO NOT disable sleep globally merely for FYD unless this machine is
intentionally a dedicated always-on worker.

Prefer scoped wake inhibition while automation runs, plus recovery from
page/process death.

If Pig is formally becoming always-on infrastructure, then configure AC
sleep policy intentionally and document it.

There have repeatedly been unrelated dirty files from parallel lanes.

Hard rules:

NO reset --hard
NO git clean
NO checkout-over
NO deleting unknown work
NO rewriting another lane's files
NO force push.

Inspect ownership.

Isolate changes.

Commit only coherent proven work.

FYD must remain:

SMALL CORE
BIG CAPABILITY.

Before nontrivial new implementation:

SEARCH PING
SEARCH DORMANT PING
SEARCH GIT HISTORY
SEARCH CASCADEPROJECTS
SEARCH EXISTING DEPENDENCIES
SEARCH CURRENT MATURE ECOSYSTEM.

Then choose:

REUSE
WRAP
EXTRACT
ADAPT
REJECT.

Harvest is not progress by itself.

It is valuable only if it shortens or strengthens the product path.

High-value hot-path primitives:

canonical serialization/hash
identity/signature verification
object schemas
relationship semantics
capability evaluation
event envelope
projection reducer
evidence/provenance
agent proposal/approval
execution evidence.

Do NOT automatically bring into FYD:

Mission Control UI
old dashboards
unrelated acquisition systems
enterprise orchestration
duplicate authorities
dead adapters
historical experiments
unused databases.

Maintain one compact manifest for imported/extracted primitives:

SOURCE
LICENSE
VERSION/SHA
PURPOSE
DEPENDENCY COST
FYD WRAPPER
TEST
KEEP/REMOVE.

Licensing matters.

Historical Ryu desktop code is proprietary and may be studied for patterns
but must not be copied into PING/FYD production.

NEAR PRODUCT:

Puck
schema-driven UI systems
Vercel AI SDK UI
jsonld
Crawl4AI
Lightpanda.

LATER:

Automerge
MCP / MCP-UI
Fedify
ATProto
Nostr
Farcaster.

Research should remain subordinate to product proof.

Do not interpret "future-proof" as "implement everything."

Preserve optionality through clean intermediate representations.

If we own:

ObjectGraph
SiteSpec
Capability descriptions
Evidence graph
Canonical transitions

then later we can swap:

renderer
visual editor
model provider
crawler
browser engine
storage projection
social adapter
agent transport
desktop synchronization

without replacing customer truth.

THAT is future-proofing.

Long-term leverage:

FYD SCHEMA
↓
validator
types
forms
component eligibility
relationship rules
capability options
agent tool descriptions
search indexing
protocol projections.

Prove incrementally.

Do not build a giant schema framework before concrete schemas need it.

Good initial proof schemas:

Business
Service
Post.

Question:

Who owns "no invented claims"?

Answer:

Do NOT invent ClaimAuthority merely to solve this.

Canonical evidence/object semantics own factual content.

The projection/render seam owns enforcing that factual presentation is
bound to those semantics.

Binding verifier proves this.

Generated copy must be explicitly tagged as generated/derived and never
silently elevated to fact.

Thus:

EVIDENCE/OBJECT AUTHORITY
→ BINDING VERIFIER
→ RENDERER.

If renderer cannot prove binding for factual content:

fail closed or classify it as generated presentation.

Question:

Who decides whether a business address is shown?

Default safety policy may initially hide sensitive-looking location data.

But business owner is the decision authority for their legitimate public
business presentation.

Therefore:

extracted address
→ visibility default
→ owner override
→ persisted owner intent
→ renderer.

Do not let pipeline defaults permanently overrule owner intent.

Do not expose private residential/personal addresses simply because a
source contained them.

Question:

Is WHY THIS for the owner or for us?

Both technically, but it should primarily serve:

TRUST
CORRECTION
DISPUTE
DEBUGGING.

It is NOT necessarily a frequent primary interaction.

The owner should not need to inspect provenance to use FYD.

The more important product action is:

"That's wrong."

or:

"Move this."

WHY THIS makes FYD defensible when trust matters.

Same semantic inputs should produce the same semantic experience.

Do NOT require byte-identical browser HTML if irrelevant framework
details vary.

Canonicalize the semantic render model.

Test:

same ObjectGraph
same SiteSpec
same ViewerContext
same renderer version
→ same canonical render model.

Exclude legitimate ephemeral UI state from canonical comparison.

Do not fix genericness with a giant intelligent planner first.

Start with deterministic schema/relationship/cardinality rules.

Example:

Service count > 0
→ Services eligible.

Person + works_for
→ People/team representation eligible.

ExternalIdentity + links_to
→ Connected/Explore eligibility.

Then allow planner intelligence to choose among VALID compositions.

Owner overrides remain higher-priority presentation intent.

This creates:

DETERMINISTIC ELIGIBILITY
+
INTELLIGENT COMPOSITION
+
OWNER CONTROL.

Generated design is not the moat.

Strongest compounding candidates:

EVIDENCE-BACKED OBJECT/IDENTITY GRAPH
OWNER CORRECTIONS + CUSTOMIZATION HISTORY
CONCIERGE / AGENT INTERACTION + OUTCOME HISTORY

Relationship graph becomes increasingly powerful once multiple users
exist.

Capabilities/authority are enabling infrastructure that make agents safe,
not necessarily the marketing headline.

The criticism is valid:

a basic website generator could use Postgres + React.

FYD does NOT need PING merely to:

parse
extract
render
edit.

PING earns its weight when FYD needs:

portable objects
provenance
identity
cross-source resolution
relationships
signed transitions
safe agent capabilities
human/agent co-action
replay
multiple protocol projections
outcome history.

Therefore apply a hard rule:

IF A PING PRIMITIVE DOES NOT ENABLE A CURRENT OR CLEARLY ADJACENT FYD
ADVANTAGE, DO NOT PUT IT IN FYD'S HOT PATH.

PING is optionality.

It must not become ballast.

FYD must be valuable with ONE user.

One business should receive:

understanding of existing presence
generated site
evidence-backed concierge
easy corrections
conversational customization
freshness/conflict detection.

Only afterward does social compound value.

Do not require a network to make the initial product useful.

Potential flywheel:

existing business joins
→ generated intelligent presence
→ objects become interactive
→ Circles/links expose FYD elsewhere
→ visitors interact
→ identities resolve
→ relationships form
→ discovery improves
→ more businesses/users join
→ graph becomes more useful.

The weakest current part is distribution.

Do not pretend this loop is proven.

Before another major architecture expansion:

put the working core loop in front of one actual external business owner.

Ask:

What did FYD get wrong?

What would you change?

Would this save you work?

Observe behavior.

User failures outrank internal architecture speculation.

The home-service business is the most concrete customer test.

They care about:

looking credible
services being obvious
contacting them being easy
mobile working
site being fast
information staying correct
changing things easily
not having automation make dangerous mistakes.

They do NOT care about:

Ed25519
ActivityPub
ATProto
canonical replay terminology.

Those internals must create outcomes invisibly.

MEDIA:

For legitimately authorized demo sites:
allow local acquisition/digested derivatives with provenance.

Do not assume public = licensed.

OWNER MODE:

Use clearly labeled local/demo owner mode only for non-production testing.

Real canonical/public mutation requires real PING identity/capability.

ASK FYD VISITORS:

Evidence-backed public Q&A.

Bounded public context.

Refuse/qualify unsupported claims.

MUST-WINS:

mobile
service discovery
contact discovery
performance
evidence coverage
owner change latency.

DO NOT MOVE IT TO ANOTHER "PING website repo" until the actual repo
identity is proven.

First determine:

Is /home/nolan/projects/ping the intended canonical repo for FYD site
work?

What does "Ping website repo" refer to on disk?

Search Git remotes/worktrees and existing deployment path.

Do not guess from folder names.

Current default:

LEAVE WIP IN PLACE.

Inventory it.

Finish/verify it there if that is the correct product repo.

If it belongs elsewhere:

transfer only the coherent FYD delta after verification.

Do not make a patch snapshot of half-finished work the new source of
truth.

Given latest verified state, the sequence should remain approximately:

inventory current builder WIP safely
start/restart dev server from exact intended branch/worktree
give Nolan private reachable URLs for BOTH generated sites
let Nolan manually inspect/test them
complete evidence-backed Ask FYD
complete WHY THIS binding UX
complete owner correction/visibility loop
complete conversational SiteSpec proposal/approval
prove corrections/customization survive regeneration
second source observation/diff
put one external business owner through it
only then expand architecture again.

Nolan wants to test at least two manageable generated websites.

Prefer private access.

If testing from tailnet devices:

configure a bounded Windows/Tailscale forward into WSL and firewall it to
the Tailscale interface.

Alternative:

SSH tunnel.

Do not expose the dev server to the public internet merely for testing.

Verify actual reachability from the target device before reporting a URL
as working.

When ready, report:

WORKTREE:
BRANCH:
HEAD:
DIRTY FILES OWNED BY THIS LANE:

COMMAND:
PID:
LISTEN ADDRESS:
PORT:

SITE A:
PRIVATE URL:

SITE B:
PRIVATE URL:

DESKTOP:
MOBILE:

ASK FYD:
OWNER MODE:
CUSTOMIZE:

TAILSCALE/SSH PROOF FROM TARGET DEVICE:
PASS/FAIL.

No stale URL claims.

The deeper product proof is:

FYD understands the entity.

FYD can explain its understanding.

Owner can correct it.

Owner can tell it what they want.

FYD can safely transform that intent into a persistent experience.

The renderer should be good.

But beautiful gradients are not the architecture.

Once SiteSpec is solid, future editing can include:

plain-English edits
structured controls
drag/drop
inline editing
themes
design tokens
responsive previews
collaboration
version history
branching
local-first/offline.

These can be harvested from mature ecosystems.

They do not need to contaminate canonical business truth.

Because business/person/service/post/location are objects rather than
page blobs, later they can participate in:

Follow
Like
Reply
Reference
Feed
Search
ActivityPub
ATProto
Nostr
MCP
embeds
agent operations.

That is why the object model matters.

Because SiteSpec and capabilities are structured, future agents can:

inspect
research
propose
compare
reorganize
generate campaigns
maintain freshness
resolve conflicts.

They do not need filesystem mutation access to control the product.

Because owner customization is structured rather than embedded in
generated code, it can later be:

synced
versioned
branched
merged
edited offline
shared across desktop/web/mobile.

This is where CRDT/local-first technology may later become valuable.

ObjectGraph + SiteSpec should make it possible later to have:

React renderer
native/mobile renderer
static renderer
embed renderer
accessibility-specialized renderer
agent-readable renderer
protocol projections.

Do not encode React implementation details into canonical SiteSpec unless
unavoidable.

AI output should terminate in typed plans/proposals.

That means models/providers can be swapped.

Do not make a model's free-form prose the persistent site representation.

Keep acquisition adapters replaceable.

HTTP
Crawl4AI
Playwright
Lightpanda
future browser

should all produce the same observation/evidence boundary.

Do not let crawler-specific structures leak into canonical object schemas.

Do not hand-build drag/drop before evaluating Puck.

Potential:

SiteSpec
↔ adapter
↔ Puck data/config
↔ visual editing.

Owner edits become typed SiteSpec changes.

PING canonical history can record approved transitions.

The most important chain is:

EVIDENCE
→ OBJECTS
→ RELATIONSHIPS
→ CAPABILITIES
→ ACTIONS
→ OUTCOMES.

Website generation is one projection over that chain.

Social is another.

Agents operate against it.

PING provides the substrate.

FYD makes it useful to normal people.

At every step ask:

WHAT IS THE FIRST BROKEN USER-VISIBLE BOUNDARY?

Fix that.

Then move exactly one boundary downstream.

Do not keep improving already-green layers because they are comfortable.

Before writing commodity infrastructure:

SEARCH.

But do not spend days researching once the boundary is understood.

Harvest the smallest useful primitive.

Wrap it behind FYD semantics.

Test it.

Move on.

Real failures are valuable.

Do not paint over them.

Examples that improved the architecture:

@graph blind spot
module-global ID nondeterminism
javascript: href sink
mobile flex overflow
stale notes causing duplicate outreach
secret in docker inspection
reconciliation repeatedly surfacing closed gaps
Pig sleep killing browser workers.

Each should become a generic invariant/test where justified.

Stop/escalate before:

destructive production migration
secret exposure
private-key custody change
irreversible external side effect
public external action outside explicit authorization
licensing ambiguity
overwriting another dirty lane
canonical event compatibility break
production DB rewrite
append-only trigger alteration
identity migration with unclear replay impact.

Nolan opens two private URLs.

They are generated from two real sites.

They are materially different for explainable graph reasons.

Mobile works.

Nolan asks:

"What services do you offer and how do you know?"

FYD answers from evidence.

Nolan changes a visibility/content decision.

It persists.

Nolan says:

"Move X above Y."

FYD proposes.

Nolan approves.

Site changes.

Refresh survives.

Source is observed again.

FYD identifies source change without destroying owner intent.

Then one external business owner tries it.

THAT is the immediate company-building proof.

KEEP YOUR EXISTING DIGITAL PRESENCE.

FYD UNDERSTANDS IT.

FYD TURNS IT INTO STRUCTURED, EVIDENCE-BACKED OBJECTS.

FYD GENERATES AN INTELLIGENT PRESENCE FROM THEM.

YOU CORRECT AND CUSTOMIZE IT BY TALKING TO IT.

FYD KEEPS IT CURRENT.

PING MAKES THOSE OBJECTS PORTABLE, SOCIAL, AGENT-OPERABLE AND
INTEROPERABLE OVER TIME.

THE WEBSITE IS THE FIRST EXPERIENCE.

THE OBJECT GRAPH IS THE DURABLE ASSET.

THE EVIDENCE MAKES IT TRUSTWORTHY.

THE OWNER'S CORRECTIONS MAKE IT THEIRS.

THE CONCIERGE MAKES IT INTELLIGENT.

THE CAPABILITY MODEL MAKES AGENTS SAFE.

THE EVENT HISTORY MAKES ACTIONS EXPLAINABLE.

THE STRUCTURED INTERMEDIATE REPRESENTATIONS PRESERVE OPTIONALITY.

DO NOT CODE YET.

Read this handoff.
Inspect:
/home/nolan/projects/ping
branch fyd/builder-composition
current HEAD
current dirty state.
Determine exactly what "Ping website repo" refers to using Git/worktree/
deployment evidence.
Inventory ONLY the current FYD lane's uncommitted changes.
Verify whether the dev server can start from the current WIP without
altering unrelated files.
Re-run the canonical FYD gate appropriate to current HEAD.
Report:

CURRENT REPO:
CURRENT BRANCH:
CURRENT HEAD:
FYD-OWNED DIRTY FILES:
OTHER-LANE DIRTY FILES:
TEST GATE:
DEV SERVER:
SITE A:
SITE B:
FIRST BROKEN USER BOUNDARY:

Then fix the first broken product boundary.

Do not start a new architecture wave.

PRESERVE CONTEXT.

PRESERVE OTHER LANES.

HARVEST COMMODITY CAPABILITY.

BUILD THE FYD-SPECIFIC DIFFERENCE.

GO.

============================================================

Fresh ecosystem conclusions for the receiving agent
============================================================

The strongest near-term harvest is Puck for eventual visual editing, not building another editor. It already separates component configuration, structured page data, editing, and rendering, and it is MIT/React/Next-compatible. Its recent determinism fix around module-import ID generation is particularly relevant to mistakes FYD already discovered independently.

OpenPage and Object UI validate the structured-IR direction, but I would harvest ideas rather than replace SiteSpec. OpenPage explicitly makes typed JSON the shared interface between human and AI editing; Object UI demonstrates metadata/schema→production React. FYD's differentiation is that its IR is downstream of an evidence-backed object graph, not just a page configuration.

For Ask FYD, use mature streaming/tool infrastructure rather than inventing chat transport. Vercel's current AI SDK is provider-agnostic and supports structured generation, agents, and UI streaming; its own docs recommend AI SDK UI rather than the older experimental RSC generative-UI path.

For acquisition, do not casually expose Crawl4AI as a network service. Its recent releases have substantially improved security, including secure-by-default binding/authentication and SSRF/RCE hardening, but that history is itself evidence that arbitrary URL/browser acquisition is a hostile boundary. Keep it sandboxed and interchangeable with Playwright/Lightpanda behind FYD's observation interface.

Finally, Automerge is optionality, not today's dependency. Structured SiteSpec is what earns the option to add local-first/offline/multi-user editing later; Automerge can synchronize JSON-like documents and preserve concurrent changes when that becomes a real requirement.
