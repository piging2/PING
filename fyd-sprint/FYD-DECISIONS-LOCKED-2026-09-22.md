# FYD — Decisions Locked, Start the 24-Hour Product Proof

Issued by Nolan, 2026-09-22 20:08 MDT. Verbatim record. THIS IS THE OFFICIAL 24-HOUR CLOCK START. Sprint window: 2026-09-22 20:08 MDT to 2026-09-23 20:08 MDT. NO MORE PRE-BUILD DECISION GATE.

## Cover note (Nolan)

Start the clock. The five questions are answerable now, and none should block the FYD product loop.

One correction from the harvest: the broad architectural conclusion in the attached adjudication is sound, but individual ecosystem/version claims should remain evidence-driven. Current official sources confirm that Vercel has productized multi-tenant/custom-domain platform infrastructure, Crawl4AI 0.9.3 specifically hardened important hostile-crawl boundaries, and MCP 2026-07-28 moved to a stateless, cacheable, authorization-hardened core. Puck's current changelog also demonstrates that editor infrastructure such as theming, rich text, stable server rendering IDs, history, and drag behavior is commodity territory FYD should harvest rather than rebuild.

The central architecture in the adjudication is the part to defend: FYD understands an entity once, preserves evidence + owner intent, and projects that understanding into websites first and other surfaces later.

The current ecosystem supports this narrowing, not expansion. Crawl4AI's latest security release fixed SSRF, arbitrary file writes, unbounded PDF resource use and XSS — evidence that hostile crawling is a serious commodity boundary FYD should sandbox and harvest, not casually recreate. Vercel already provides wildcard/custom-domain routing, SSL and multi-tenant platform primitives, so those are poor places for FYD differentiation. And MCP's current stateless, routable, cacheable design makes it an increasingly attractive future projection of FYD capabilities, not a reason to contaminate the canonical model today.

The most important metric isn't <10 minutes, though. That's an initial operational ceiling. The metric to watch hardest is owner correction burden: if FYD can ingest a messy business and the owner only needs two corrections instead of rebuilding 30 pages and forms, that is a much stronger product signal than winning an arbitrary page-generation speed benchmark.

## FYD — DECISIONS LOCKED

START THE CLOCK.

NO MORE PRE-BUILD DECISION GATE.

### FYD-BAR-001 — NUMERIC BAR

DO NOT INVENT A VANITY QUALITY SCORE.

Run the baseline first.

LOCK THE COLD SET NOW:

12 URLs TOTAL

4 trades / home services
4 retail / food / local commerce
4 professional / creator / service.

Freeze the URLs before looking at results.

NO CHERRY-PICKING AFTERWARD.

For each measure:

TIME TO FIRST USEFUL PREVIEW
IDENTITY ACCURACY
CONTACT ACCURACY
LOCATION ACCURACY
SERVICE/PRODUCT DISCOVERY
UNSUPPORTED FACTUAL CLAIMS
MOBILE USABILITY
CONTACT/ACTION DISCOVERABILITY
PERFORMANCE
OWNER CORRECTIONS REQUIRED.

INITIAL OPERATIONAL BAR:

median URL -> useful preview < 10 minutes.

But this is NOT the product target.

The architectural target is:

URL
-> useful FYD preview
-> approximately a minute.

First measure where the time actually goes:

FETCH
EXTRACT
RESOLVE
GRAPH
PLAN
RENDER.

Do not optimize the total blindly.

QUALITY GATE:

ZERO unsupported published factual claims.

A slower truthful preview beats a fast hallucinated one.

Then use measured baseline to establish the real FYD-BAR-001 rather than
manufacturing a number today.

YES — 12 URLs IS ENOUGH FOR THIS SPRINT.

This is not statistical certification.

It is a hostile product-development corpus.

Nolan judges the initial comparative run against the existing presence.

But preserve structured observations rather than one subjective score.

For every site:

WHAT FYD GOT RIGHT
WHAT FYD MISSED
WHAT FYD GOT WRONG
WHAT FYD INVENTED
WHAT FYD MADE EASIER
WHAT ORIGINAL DID BETTER
GENERIC FAILURE CLASS.

Every loss becomes engineering evidence.

Do not patch individual websites.

Cluster failures:

ACQUISITION
EXTRACTION
ENTITY RESOLUTION
GRAPH
PLANNER
MEDIA
RENDERER
PERFORMANCE
OWNER POLICY.

Fix the highest-frequency/highest-impact GENERIC cause.

### OWNER GATE

MONUMENT VIEW IS NOT A BLOCKER.

Attempt to obtain legitimate owner participation.

If available:

USE IT.

If unavailable:

FIRST WILLING LEGITIMATE BUSINESS OWNER REPLACES IT.

The actual gate is:

ONE REAL OWNER USES THEIR OWN FYD PRESENCE.

Not:

MONUMENT VIEW SPECIFICALLY.

Until real auth is wired:

DemoOwnerContext
behind
OwnerContext interface.

No scattered demo-owner conditionals.

No pretending demo auth is production auth.

Owner test:

SEE GENERATED PRESENCE
-> CORRECT SOMETHING
-> REGENERATE
-> CORRECTION SURVIVES
-> CHANGE SOMETHING IN PLAIN ENGLISH
-> APPROVE
-> SEE CHANGE
-> RETURN/REFRESH
-> INTENT SURVIVES.

Ask them:

WHAT DID FYD GET WRONG?

WHAT WOULD YOU CHANGE?

WOULD THIS SAVE YOU WORK?

Their behavior outranks our architecture opinions.

### LOCK THESE

GRAPH READ

YES:

authorized sanitized application graph route.

Conceptually:

GET /tenant//graph

IF existing route semantics support it.

Search/reuse first.

NO:

dump.py as product integration.

NO:

FYD directly reading Postgres.

NO:

browser reading raw canonical journal.

Boundary:

FYD
-> authorized graph reader
-> rebuildable projections/evidence
-> canonical events underneath.

PING OBJECTS

REUSE ping_objects where its current proven projection semantics fit.

DO NOT CREATE ANOTHER FYD CANONICAL OBJECT STORE.

Maintain the convergence invariant:

EVENTS / TRANSITIONS
= canonical history

OBJECT TABLES
= rebuildable projection

unless actual repo evidence disproves it.

NAMESPACE FIX

SEAM-LOCAL.

Do not change global identity semantics to make FYD convenient.

Adapter compatibility belongs at the boundary until a migration is
independently proven.

GITHUB INGESTION

DEFER.

Harvest/research allowed.

No implementation until a product proof requires it.

Website + owner evidence are enough to close the current loop.

PLAYWRIGHT

MINIMAL MAINTENANCE.

Do not become browser-infrastructure maintainers.

Current acquisition already proved two real sites.

Only escalate crawler/browser machinery when the cold corpus proves a
specific acquisition failure.

If escalation becomes necessary:

CURRENT STACK
vs
CRAWL4AI
vs
LIGHTPANDA

on the SAME failures.

Measure results.

Do not choose from README claims.

SPRINT CONTINUES.

Cold URL quality still counts.

But:

REAL OWNER READY
remains NO

until another legitimate owner completes the loop.

Do not turn inability to schedule one specific owner into an engineering
blocker.

### SYSTEM MODEL

Do not confuse FYD with the page renderer.

The system is:

SOURCES
-> OBSERVATIONS
-> EVIDENCE
-> OBJECT GRAPH
-> OWNER ASSERTIONS / INTENT
-> CANONICAL TRANSITIONS
-> EXPERIENCE COMPILERS
-> PROJECTIONS.

TODAY:

FYD WEBSITE.

LATER:

CIRCLE
SOCIAL
SEARCH
CONCIERGE
MOBILE
MCP
ACTIVITYPUB
ATPROTO
CAMPAIGNS
AGENT CONTEXT
OTHER EXPERIENCES.

This is why we tolerate a LITTLE more structure than a normal website
builder.

But only a little.

Every abstraction must buy optionality.

### TRUTH OWNERSHIP

LOCK THIS NOW.

THE RENDERER DOES NOT OWN FACTUAL TRUTH.

THE SITE PLANNER DOES NOT OWN FACTUAL TRUTH.

THE LLM DOES NOT OWN FACTUAL TRUTH.

THE BindingVerifier / evidence-object projection seam determines what
factual material is eligible for presentation.

Pipeline:

EVIDENCE
-> OBJECT PROJECTION
-> OWNER ASSERTIONS
-> BINDING VERIFICATION
-> SITE SPEC
-> RENDERER.

Renderer should be boring.

Every factual binding traces to:

DIRECT EVIDENCE
DERIVED FACT
OWNER ASSERTION

or is explicitly marked:

INFERRED / GENERATED PRESENTATION.

Generated copy cannot smuggle unsupported factual claims through the
renderer.

FACT and VISIBILITY are separate dimensions.

Example:

FACT:
123 Main Street

VISIBILITY:
HIDDEN.

The acquisition pipeline may choose a conservative initial visibility.

It does NOT get final authority over the owner's presentation.

Owner may choose:

PUBLIC
HIDDEN
FOLLOWERS
or future supported visibility.

Changing visibility does not rewrite evidence.

This is important far beyond addresses.

The same model eventually handles:

phone
email
location
pricing
personal fields
social identities
objects.

Suppose source says:

OPEN UNTIL MIDNIGHT.

Owner corrects:

CLOSES AT 10 PM.

FYD regenerates.

OWNER ASSERTION SURVIVES.

Tomorrow the website again says midnight.

DO NOT silently overwrite the owner.

Generate conflict:

SOURCE_CHANGED_AGAINST_OWNER_ASSERTION.

Present:

Website now says midnight.
You previously set 10 PM.

KEEP MINE
ACCEPT SOURCE
INSPECT.

THIS IS A CORE FYD ADVANTAGE.

KEEP IT.

DO NOT MAKE IT THE HERO.

Primary workflow:

SEE
-> CORRECT
-> CUSTOMIZE
-> PUBLISH.

WHY THIS appears when useful:

owner questions something
sources conflict
confidence is weak
visitor asks evidence-sensitive question
agent proposes a consequential change.

Provenance is infrastructure for TRUST.

Not another dashboard.

### NEXT PRODUCT BOUNDARY

THIS IS NOW THE NEXT PRODUCT BOUNDARY.

Question:

"What services does this business offer, and how do you know?"

Ask FYD must assemble an authorized ContextBundle from current:

OBJECTS
RELATIONSHIPS
EVIDENCE
OWNER ASSERTIONS.

Response must distinguish:

DIRECT
DERIVED
INFERRED
OWNER_ASSERTED
CONFLICTING
UNKNOWN.

If evidence does not support the answer:

SAY SO.

Do not fall back to generic chatbot guessing.

### DETERMINISM

LOCK THE RIGHT PROPERTY.

Same:

ObjectGraph
OwnerIntent
SiteSpec inputs
ViewerContext
DesignTokens
renderer version

must produce the same SEMANTIC RENDER MODEL.

Do not waste time requiring byte-identical framework HTML where harmless
runtime IDs differ.

Test deterministic semantics before framework rendering.

Then separately test SSR/hydration correctness.

KEEP IT DUMB UNTIL DUMB FAILS.

Use deterministic eligibility rules first.

Examples:

locations > 0
-> Locations eligible

services > 0
-> Services eligible

person relationships > 0
-> People/Explore eligible

recent content > 0
-> Updates eligible.

Then owner override.

AI may later optimize:

ordering
emphasis
composition
copy
presentation.

AI should not be required to determine whether a Service object exists.

### MEDIA

AUTHORIZED OWNER/DEMO SOURCES:

download
digest
preserve provenance
derive optimized versions
serve FYD copies.

RANDOM COLD THIRD-PARTY URL:

do not assume republication rights.

Reference metadata or omit media unless reuse authority is clear.

Media pipeline must not become the sprint.

### PUCK

DO NOT BUILD A PAGE EDITOR.

After:

ASK FYD
CORRECTION
REGENERATION

are green:

evaluate/wrap Puck.

FYD OWNS:

SiteSpec
objects
evidence
owner intent.

Puck owns commodity editing UX.

If Puck disappears tomorrow:

FYD's site state survives.

### CRAWLER

DO NOT REBUILD A CRAWLER.

Current Crawl4AI security work is another reminder that this boundary is
deep commodity infrastructure.

Any future crawler handling arbitrary customer URLs must be sandboxed and
treated as hostile-input infrastructure.

Do not put arbitrary crawling capability inside the trusted PING core.

### DOMAINS

DO NOT BUILD CUSTOM DOMAIN/SSL INFRASTRUCTURE.

Keep deployment abstraction replaceable.

Commodity platform infrastructure already supports:

multi-tenancy
wildcard domains
custom domains
certificate management
tenant routing.

FYD's moat is not TLS certificates.

### MCP

HARVEST NOW.

IMPLEMENT LATER.

Current MCP direction strongly validates the projection architecture:

stateless protocol core
explicit discovery
cacheability
routing
authorization
extensions.

Eventually:

PING/FYD CAPABILITIES
-> MCP PROJECTION.

Never:

MCP
-> canonical FYD truth.

MCP can change or disappear.

The object survives.

### JEV SEPARATION

KEEP SEPARATE.

Jev does not block this sprint.

No new FYD architecture solely to satisfy Jev.

Reuse proven PING:

MISSION
-> RUN
-> EXECUTION

where appropriate.

Do not invent another Run.

LOCK THIS ORDER:

INTENT
-> IDENTITY
-> CAPABILITY + POLICY
-> PROPOSAL IF REQUIRED
-> HUMAN APPROVAL IF REQUIRED
-> RE-EVALUATE EXACT APPROVED PROPOSAL
-> EFFECT
-> RECEIPT/EVIDENCE.

Human approval is not magical authorization.

An owner cannot approve an action the executing actor lacks capability
to perform.

### AUTOMATION HARDENING

For critical automation:

HOLD AN OS WAKE REQUEST WHILE THE RUN IS ACTIVE.

Also keep:

one-worker-per-browser lock
page recreation after target death
interruption evidence.

Prefer this over globally disabling sleep by default.

If Pig becomes dedicated always-on infrastructure, AC never-sleep can
later be an explicit machine policy.

### EXECUTION ORDER

DO NOT REORDER THIS WITHOUT A REAL FAILURE.

Protect/commit proven renderer/mobile/security work through correct lane.
Ask FYD evidence-bounded question.
WHY THIS minimal interaction.
CONFIRM / CORRECT / HIDE.
Regenerate.
Prove owner correction survives.
Plain-English site change.
Proposal.
Approval.
Apply.
Re-observe source.
Prove source changes do not destroy owner intent.
Put it in front of ONE real owner.
Run frozen 12-URL corpus.
Measure FYD-BAR-001 baseline.
Fix highest-leverage generic failure.

Only after this:

Puck/editor expansion
crawler escalation
protocol implementation
social expansion.

### HARVEST DISCIPLINE

KEEP RESEARCHING BROADLY IN PARALLEL.

For every candidate record:

PROBLEM SOLVED
CURRENT VERSION
LICENSE
SECURITY
MATURITY
DEPENDENCY COST
LOCK-IN
DATA OWNERSHIP
WRAPPER COST
FYD CODE DELETED
REPLACEABILITY.

Verdict:

ADOPT
WRAP
LEARN
REJECT.

HARVEST BROADLY.

IMPLEMENT NARROWLY.

### THE OWNER EXPERIENCE TARGET

A real owner should experience:

PASTE URL
-> "THAT'S MY BUSINESS."
-> "HOW DID YOU KNOW THAT?"
-> "THIS PART IS WRONG."
-> CORRECT
-> "PUT EMERGENCY SERVICE FIRST."
-> FYD PROPOSES
-> APPROVE
-> SITE CHANGES
-> SOURCE CHANGES TOMORROW
-> FYD STAYS CORRECT.

If we cannot make THAT excellent:

federation does not matter.

MCP does not matter.

social does not matter.

agents do not matter.

We are NOT building:

the most complicated website builder.

We are building:

THE SMALLEST SYSTEM THAT CAN UNDERSTAND AN ENTITY ONCE,
LET ITS OWNER CORRECT THAT UNDERSTANDING,
AND PROJECT IT ANYWHERE.

The website is projection #1.

Everything else is optionality.

START THE CLOCK.

BUILD.
