# FYD — CONVERGENCE MODE

Nolan's order, 2026-09-24 ~18:48 MDT. THE FRONTIER SWEEP IS COMPLETE. STOP GENERATING
FRONTIER. THE NEXT PRODUCT FAILURE IS: CAPABILITY EXISTS IN LANES BUT NOT IN ONE
INTEGRATED PRODUCT. BUILT SOMEWHERE != FYD.

## P0 — CONVERGE 52-56

Create ONE clean integration path for:

52. Ask FYD — 179 tests (lane-e-ask, uncommitted)
53. projection / owner loop — 8 commits (lane-d-impl, staged)
54. acquireUrl — 58 hostile SSRF tests (SSRF-hardened, unintegrated)
55. edge-port — 2 commits (fyd/edge-port, /home/nolan/build-edge-port, unmerged)
56. write-boundary/idempotency — deployed/proven work (tip d6c1b05d)

For EACH: inspect exact SHA/diff; identify overlapping files; identify authority
collisions; identify stale assumptions; run its own tests; integrate smallest valid
delta; run canonical product gate. NO blind merge. NO reset/clean of dirty work. NO
architecture rewrite. If two lanes solve the same problem: choose one authority, harvest
missing tests/behavior, retire duplicate path.

## ONE INTEGRATION BRANCH

No new feature branch until integration throughput catches up. The bar: MERGED +
CANONICAL TEST GREEN + REAL PRODUCT PATH GREEN + REPLAY/PROOF WHERE REQUIRED. Not:
worker finished.

## FIX THE OBJECT EXPERIENCE, NOT JUST THE WEBSITE

The website is ONE projection. The actual FYD primitive is the OBJECT. Objects may be:
VERY FAR APART, ON DIFFERENT PAGES, IN DIFFERENT SECTIONS, IN FEEDS, IN SEARCH, IN
CIRCLES, IN ASK FYD, IN EXTERNAL PROJECTIONS. Do not visually force them into one
compact cluster. The current overlay/floating-object technique is too artificial if the
object appears detached from the document. Objects must feel PHYSICALLY PART OF THE
PAGE.

## SCROLL BEHAVIOR

Prefer: OBJECT ENTERS NATURALLY IN DOCUMENT FLOW → MAY BECOME CONTEXTUALLY STICKY
WHILE ITS REGION IS RELEVANT → CONTINUES WITH PAGE → COMPLETELY LEAVES VIEW WHEN ITS
REGION IS GONE. NOT: permanent viewport overlay. NOT: HUD. NOT: objects following the
user forever. Think: POSITION STICKY WITHIN A BOUNDED CONTAINER rather than POSITION
FIXED TO VIEWPORT. The object belongs to the CONTENT REGION. When that region scrolls
away: THE OBJECT GOES AWAY TOO.

## OBJECT SPACING

LESS COMPACT. Give objects room. Different objects do not need to visually touch. A
service object may appear near service content. A location object may appear two pages
later. A person object may appear in About. A post/reference may appear in Explore. The
graph connects them semantically. THE LAYOUT DOES NOT NEED TO DRAW THE WHOLE GRAPH AT
ONCE. Do not confuse CONNECTED DATA with CONNECTED VISUAL GEOMETRY.

## OBJECT VISUAL QUALITY

Improve: typography, spacing, hierarchy, border treatment, depth, responsive behavior,
object identity, interaction affordance. Reduce: debug-panel feeling, dense metadata,
floating-widget feeling, developer-tool aesthetic. An object should look like a premium
native piece of the site. Then optional expansion can expose: relationships, evidence,
Ask FYD, actions, references.

## OBJECT → DETAIL

Default object presentation should be beautiful and useful. Deep technical truth stays
available progressively: OBJECT → EXPAND → RELATED / ASK FYD / WHY THIS / ACTIONS. Do
not dump provenance into the default visual surface.

## PING/FYD SITE

THIS HAS BEEN REQUESTED REPEATEDLY. DOGFOOD IT NOW. Do not manually create a special
PING marketing site. Run PING/FYD through the integrated compiler. Use legitimately
publishable PING/FYD source/evidence. Generate: PING umbrella explanation, FYD Social
product, intelligent web/object model, Ask FYD/concierge, relevant capabilities,
appropriate CTAs. Then inspect the result like a customer site. When ugly/wrong: fix
generic compiler/renderer/design-system behavior. Regenerate. NO PING-SPECIFIC JSX.

## TWO MANAGEABLE BACKENDS

Keep TWO real generated sites continuously runnable during development. At minimum:
Happy Place, Coppersmith. Add PING/FYD as dogfood once integrated. Developer
experience should make this trivial: ONE COMMAND → start backend/runtime → start FYD
frontend → load known generated fixtures/current projections → print local URLs. Do not
require Nolan to reconstruct which lane owns which server.

## DEV ENTRYPOINT

Create/reuse a developer launcher only if one does not already exist. It should clearly
print: FYD DEV READY; Happy Place: <route>; Coppersmith: <route>; PING/FYD: <route when
available>; Ask API: <route/status>; Graph/projection source: <identifier>; HEAD:
<SHA>. Do not expose secrets.

## PRODUCT DATA PATH

After convergence, there should be ONE explainable path: SOURCE → ACQUISITION →
OBSERVATIONS → EVIDENCE → OBJECT GRAPH → SITE SPEC → PROJECTION POLICY → RENDERER →
BROWSER. And: BROWSER → ASK FYD → SANITIZED OBJECT/EVIDENCE CONTEXT → ANSWER +
CITATIONS. And: OWNER → CORRECTION/CUSTOMIZATION → PROPOSAL → AUTHORIZATION →
CANONICAL TRANSITION → REGENERATION. If multiple lanes create alternate versions of
these paths: CONVERGE THEM.

## NEXT BACKLOG AFTER INTEGRATION

Do NOT attack 70 items. After 52–56 converge, prioritize only defects encountered while
proving: URL → generated presence → Ask → correction → customization → regeneration.
Likely important: TD-001 invalid emitted SiteSpec; TD-006 fixture read path; FYD-013/024
stale evidence; FYD-014/015 WHY THIS lineage; FYD-016 correction survival; FYD-022
regeneration provenance; FYD-023 SiteSpec determinism; shared projection policy. But
actual runtime failure wins over this guessed ordering.

## CRAWL SCOPE

FYD-004 becomes important when onboarding cannot understand the business from the entry
URL. Do not build a crawler empire. Minimum same-origin bounded discovery: homepage →
sitemap if available → obvious high-value pages (services, products, about, contact,
locations, team, projects/posts as relevant). Strict: page budget, depth budget,
same-origin policy, SSRF protection, dedupe, canonical URLs, content limits. The
acquisition goal is: UNDERSTAND THE ENTITY. Not: ARCHIVE THE WEBSITE.

## OPTIONALITY

Preserve future optionality by keeping the middle stable: MANY INPUTS →
OBSERVATIONS/EVIDENCE → OBJECT GRAPH → CAPABILITIES + POLICY → MANY OUTPUTS. Inputs
later: websites, social, documents, APIs, owner corrections, public protocols. Outputs
later: FYD sites, Circle, mobile, search, feeds, Ask FYD, ActivityPub, ATProto, Nostr,
MCP, campaigns, agents. THIS is why the object/evidence middle matters. Do not optimize
the canonical middle for today's website layout.

## HARVESTING

Keep daily/read-only ecosystem ingestion. But enforce: DISCOVER → EVALUATE → TEST →
RECOMMEND → QUEUE. NOT: DISCOVER → REWRITE FYD. New technology must beat existing
implementation on a measured product boundary.

## DELETE BACKLOG VANITY

1002 design questions are not 1002 requirements. Cull them. Classify: BLOCKS CURRENT
PRODUCT / VALID FUTURE CONSTRAINT / ANSWERED BY IMPLEMENTATION / OBSOLETE / DUPLICATE /
SPECULATIVE. Do not individually deliberate obsolete questions.

## CEO METRIC

For the next wave, measure: HOW MANY VERIFIED CAPABILITIES ARE AVAILABLE IN ONE
RUNNING FYD PRODUCT? Not: branches, agents, documents, backlog items, protocols, test
files.

## NEXT REPORT FORMAT

INTEGRATED HEAD: 52 ASK FYD: INTEGRATED/BLOCKED; 53 OWNER/PROJECTION:
INTEGRATED/BLOCKED; 54 ACQUIREURL: INTEGRATED/BLOCKED; 55 EDGE: INTEGRATED/BLOCKED; 56
WRITE BOUNDARY: INTEGRATED/BLOCKED. CANONICAL TEST: HAPPY PLACE: RUNNING/FAIL;
COPPERSMITH: RUNNING/FAIL; PING/FYD: RUNNING/FAIL/NOT YET GENERATED; ASK FYD:
PASS/FAIL; OWNER CORRECTION: PASS/FAIL; CUSTOMIZATION: PASS/FAIL; REGENERATION:
PASS/FAIL; MOBILE: PASS/FAIL; OBJECT SCROLL BEHAVIOR: PASS/FAIL. FIRST BROKEN PRODUCT
BOUNDARY: ... NEXT FIX: ...

## FINAL RULE

STOP MEASURING WHAT EXISTS SOMEWHERE. MEASURE WHAT EXISTS TOGETHER. INTEGRATE. RUN.
LOOK AT IT. FIX THE FIRST BROKEN PRODUCT BOUNDARY. MAKE THE OBJECTS BEAUTIFUL. MAKE
THEM BELONG TO THE PAGE. MAKE PING/FYD USE ITS OWN PRODUCT. THEN EXPAND AGAIN.
