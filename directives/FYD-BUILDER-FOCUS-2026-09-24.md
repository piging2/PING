# FYD — BUILDER FOCUS + IMMEDIATE USER TESTING (2026-09-24, Nolan)

Infrastructure: Mission Control and ORCA continue in their own lanes. FYD's
next job is to make the two sites feel like the beginning of the most
streamlined evidence-backed website builder possible.

## Keep the dev server running

Keep :3100 on the Pig serving /sites, /sites/happy-place,
/sites/coppersmith-plumbing over the PRIVATE TAILSCALE path only. Do not
expose :3100 publicly. Verify from Nolan's actual client/device, not merely
from the Pig. If reachability fails: fix only the private last-hop
networking; do not rebuild the app.

## Pig sleep policy

The Pig sleeping destroyed real automation work. On AC power: PREVENT
AUTOMATIC SLEEP WHILE THE PIG IS OPERATING AS A BUILD/AUTOMATION NODE. Do
not globally disable sensible battery sleep. Preferred: AC + active
automation/build/server workload → machine stays awake; battery/inactive →
normal sleep policy. Workload-scoped wake is ideal long-term; for tonight,
reliability wins.

## Demo owner mode

Current first broken step is configuration: demo-owner-mode is off. Enable
the EXISTING demo-owner mode for this PRIVATE demo surface. Restart only
what is necessary. Verify unauthenticated/public semantics did NOT
accidentally become owner semantics. Owner mode must be visibly DEMO/
PROTOTYPE AUTH, not represented as real production authentication. Then
prove: proposal → approval → witnessed mutation → refresh. Do NOT build
production auth merely to test the builder.

## Media pipeline

For these authorized/public demo business sites: INGEST PUBLIC SITE MEDIA
INTO FYD'S MEDIA PIPELINE; do not rely exclusively on hotlinks. Preserve:
original source URL, observed_at, content digest, media type, dimensions
where available, license/usage basis if known, derived-asset lineage.
Generate FYD-served derivatives for the demo. Do NOT imply ownership/
copyright transfer. Do NOT ingest arbitrary third-party images discovered off
the authorized site.

## Ask FYD

Visitors get FULL EVIDENCE-BOUNDED ASK FYD, not artificially narrow Q&A.
Answer from available public object/evidence context. When evidence is
insufficient: SAY SO. Do not hallucinate business facts. Return
internally/structurally: answer, evidence refs, source URLs, object refs,
unknowns, available actions. UI can remain simple. This outranks another
visual polish pass. Separate consequence, not intelligence.

Visitor: ask, explore, follow, reference, contact where capability exists.
Owner: all visitor abilities + correct, hide/show, customize, propose
structural change, approve owned-site mutations.

## Authority UX scales with consequence

Low → immediate + undo/history. Medium → preview/apply. High/external →
explicit approval. Irreversible/money/public external effect → strong
confirmation/capability. Do not make owners click approval for harmless
reversible presentation changes forever. Keep canonical witnessing
underneath. Do not expose constitutional machinery as UX friction.

## Owner owns visibility

The pipeline does NOT own the decision to hide a BUSINESS address. The
owner does. Default safely when ownership/visibility is uncertain. Field
visibility is owner-controlled policy: SOURCE VALUE + VISIBILITY POLICY +
OWNER OVERRIDE. Personal/private addresses remain conservative. Do NOT
generalize business-address publication into personal-location publication.

## Binding invariant

DO NOT CREATE ClaimAuthority. The render path must enforce: EVERY FACTUAL
RENDER BINDING MUST RESOLVE TO EVIDENCE-BACKED OBJECT FIELD OR OWNER
OVERRIDE OR EXPLICITLY CLASSIFIED GENERATED PRESENTATION. The existing
binding verifier owns enforcement at the projection boundary. Wire it
completely. Generated marketing copy is allowed, classified: DIRECT /
DERIVED / GENERATED / OWNER. Generated prose must not silently become
factual evidence.

## WHY THIS is trust infrastructure, not the main workflow

Primary UX: FYD understood me. Secondary escape hatch: Why this? Keep it
lightweight. DO NOT BUILD WIX + CHATBOT. Build: DIGITAL PRESENCE →
EVIDENCE GRAPH → OBJECT GRAPH → SITE SPEC → COMPONENT CATALOG → RENDERED
EXPERIENCE → OWNER INTENT → TYPED PATCH → WITNESSED CHANGE.

## Read-only harvest

PUCK: steal application-owned component catalog, visual editing model,
structured page data, render/edit separation. Do NOT automatically adopt the
editor.
SANITY CONTENT SOURCE MAPS (high value): steal rendered value ↔ source
object/field. FYD goes further: rendered element → SiteSpec binding → object
field → claim/evidence → original source.
PAYLOAD BLOCKS: steal typed heterogeneous ordered block arrays. SiteSpec
sections stay constrained typed blocks, not arbitrary JSX.
JSON-RENDER (very relevant): JSON spec → constrained component catalog →
React tree; study its strict JSON Schema output for LLMs. Do NOT migrate
tonight. Determine what FYD already does better, what it solves better,
what can be harvested, whether adopting its core later reduces our code.
Caution: active issue traffic on responsive layout and action handling —
our proven renderer must not be destabilized casually.

## SiteSpec stays small

Describes: pages, sections, bindings, presentation, capabilities,
visibility, owner overrides. NOT: HTML, CSS, JavaScript, React, a
programming language. AI chooses from constrained possibilities; renderer
executes deterministically. This is potentially a major moat. One design
system; do not generate random CSS per customer. Variation from controlled
tokens: typography, spacing, radius, density, layout variants, media
treatment, section variants, navigation variant, surface style.

Conceptual chain: DOM ELEMENT → SITE SECTION → OBJECT FIELD → CLAIM →
EVIDENCE → SOURCE OBSERVATION. Owner clicks visible content → "Change
this." FYD knows: what object, what evidence, source-derived or
owner-overridden, what SiteSpec section, what capability.

## Three interfaces, one mutation system

DIRECT (click/tap visible content → edit), CONVERSATIONAL ("Make emergency
service more prominent."), STRUCTURAL (optional visual section/block
manipulation). All produce the SAME typed patch underneath. Natural
language does not mutate the page; it compiles: intent → target resolution
→ SitePatch → validation → capability → preview if necessary → apply →
event/history → rerender. AI can be replaced/upgraded without changing
mutation semantics.

## Product comparison testing

Continue testing HAPPY PLACE and COPPERSMITH as PRODUCTS. For each:
MOBILE UX, CONTACT DISCOVERABILITY, SERVICE DISCOVERABILITY, PERFORMANCE,
TRUST, ABILITY TO CORRECT, ABILITY TO CUSTOMIZE, ASK FYD QUALITY. Do not
optimize for animations, novel layouts, visual gimmicks. Generated FYD
sites must be brutally fast: mostly deterministic/server-renderable content,
minimal client JS, hydrate only interactive islands, optimized FYD media,
cacheable public projections. Measure actual: LCP, CLS, INP, JS
transferred, image weight. Performance is a builder constraint, not an
afterthought.

## Structured web data

FYD consumed structured web data; it should emit excellent structured web
data. Eventually generate from canonical objects: JSON-LD, OpenGraph,
canonical metadata, sitemap, RSS where relevant. INPUT: messy web. OUTPUT:
cleaner structured web. Compounding loop.

## One content universe

Business, Service, Location, Person, Post, Project, Offer, Media are the
content. SiteSpec references them. Builder changes presentation or proposes
object changes. Do not create a separate CMS content universe. The same
Service object powers: website, Circle, search, Ask FYD, feed,
ActivityPub/MCP/ATProto projections, campaigns. PING is justified IF FYD
evolves into portable objects + evidence + relationships + capabilities +
agents + witnessed mutations + outcomes + multiple projections. FYD
consumes only the minimum proven primitives required. If we preserve OBJECT
GRAPH + EVIDENCE + SITE SPEC + CAPABILITIES + EVENT HISTORY, we can add
without rebuilding the customer: visual editor, themes, commerce, booking,
forms, CRM, campaigns, ads, projections, apps, agents.

## Mission Control note

Unknown-outcome semantics are proven. GOOD. Do NOT expand the design. Port
into the live runtime continues separately; keep it out of the builder UX
until actual external effects use it.

## Nolan tests the product

Working private URLs first. Then DON'T explain the architecture. He behaves
like the customer. On BOTH sites: can I understand this business in 5
seconds? find its services? contact it? does it look credible? does mobile
feel excellent? Ask FYD something the website answers. Ask FYD something it
does NOT answer. Correct one fact. Hide one fact. Ask "Make X more
prominent." Approve/apply it. Refresh. Compare the two sites. WRITE DOWN
EVERY MOMENT THAT FEELS STUPID. Those failures outrank architecture ideas.

Keep private dev surface reachable. Enable bounded demo owner mode. Nolan
tests both sites. Fix only product-blocking failures. Finish Ask FYD
evidence path. Finish direct correction/hide. Finish conversational
SitePatch. Preserve customization through source regeneration. Add media
properly. Measure performance. Put it in front of ONE external business
owner. THEN decide whether visual editing is needed.

THE BEST WEBSITE BUILDER IS NOT THE ONE WITH THE MOST CONTROLS. IT IS THE
ONE WHERE THE USER DOES THE LEAST WORK. FYD should: UNDERSTAND FIRST.
BUILD FIRST. EXPLAIN WHEN ASKED. LET THE OWNER CORRECT IT. LET THE OWNER
TALK TO IT. KEEP IT CURRENT. KEEP IT FAST. KEEP IT PORTABLE. NEVER FORCE
THE OWNER TO REBUILD THE SAME BUSINESS DATA FOR THE NEXT CHANNEL.

KEEP THE DEV SERVER UP. LET NOLAN BREAK THE PRODUCT. FIX WHAT HE ACTUALLY
HITS. GO.

## Dependency warning

If the FYD surface is still on an older Next.js line, do NOT upgrade during
this product test. Inventory it now: official site says 16.3.6 is the
current Active LTS security update as of Sept 22, with another security
release scheduled Sept 30. Separate bounded dependency/security patch after
the demo loop, not an excuse to destabilize today's surface.

## Differentiation

Sanity maps rendered content back to document+field. FYD maps rendered
content → SiteSpec → PING object → claim → evidence → original external
source → owner correction history. Technically meaningful differentiation,
not another prettier drag-and-drop editor.

For future external agent/tool optionality, don't invent transport: the
current MCP spec has a stateless core with hardened authorization and
formal extensions. Keep objects/evidence/capabilities/history underneath;
MCP can eventually expose them outward.
