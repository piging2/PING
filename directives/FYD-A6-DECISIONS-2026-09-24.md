# FYD + A6 — DECISIONS AND KEEP GOING (2026-09-24, Nolan)

KEEP GOING. DECISIONS ARE CLOSED.

## A6: the ugly window

YES — the witnessed crash proof must kill in the ugly window:
EXTERNAL EFFECT DISPATCHED → PROCESS DIES → DURABLE SUCCESS/FAILURE RECORD
NOT YET LANDED. Do not certify A6 with clean-point kills.

Required observable outcome: UNKNOWN remains UNKNOWN. UNKNOWN must not
collapse into FAILED, SUCCESS, or RETRYABLE FAILURE. Then restart/reconcile
using the SAME stable idempotency identity. If the external provider can
prove the outcome, reconcile to the proven state. If it cannot: HOLD
CONSEQUENTIALLY AMBIGUOUS WORK. NO BLIND RETRY.

Require the kill-point list BEFORE execution and include the rendezvous kill
explicitly. That is the entire reason this machinery matters for future FYD
actions: publish, message, book, purchase, advertise, provider mutation.

## No universe inventory

USE VOLATILITY-PROVEN FIRST. Start with dependencies that already have
evidence of being important or replaceable: JSON-LD processor,
browser/acquisition engine, LLM provider, embedding provider, any current
rendering dependency with demonstrated breakage. FIRST CONSUMER DECISION:
PIN / KEEP / REPLACE / WRAP. The inventory exists to answer an executable
dependency decision. No plugin architecture. No generic capability resolver
merely because dependencies exist. Expand only when another dependency
earns scrutiny.

## Lane cleanliness

Promotion lane reports: gate evidence, security evidence, durability,
rollback, bounded FYD smoke. It does NOT decide FYD's product frontier.
Product lane owns: FIRST BROKEN PRODUCT STEP. Bounded post-promotion smoke
is enough: site renders, Ask FYD responds, required backend path works, no
obvious regression.

## Credential hygiene in proofs

USE EXISTING CREDENTIAL MECHANISM. Do not mint another credential merely
for proof unless current access cannot be made safe. Never echo secret;
never put secret in command-line args; never write into committed/
workspace artifacts; keep temporary secret-bearing material machine-local
and ephemeral; redact diagnostics by default. POST-PROOF: scan proof
artifacts/logs/scripts for secret material. Verify temporary files are
gone. REPORT ONLY: SECRET MATERIAL FOUND: YES/NO. Never the value.
Credential leakage is already a demonstrated failure class; secret hygiene
is part of proof correctness.

## FYD customer experience remains P0

We are building ONE-CLICK BUSINESS PRESENCE. User provides URL (optionally
later: social accounts, listings, documents, catalog, other authorized
sources). FYD: UNDERSTANDS → OBJECTIFIES → PROVES → GENERATES → LETS OWNER
CORRECT → LETS OWNER CUSTOMIZE → KEEPS CURRENT.

Current object model is enough. Do not invent more object types this
cycle. Finish: BUSINESS, SERVICE, LOCATION, PERSON, MEDIA, POST/CONTENT
where evidence exists, EXTERNAL IDENTITY, RELATIONSHIPS, EVIDENCE. Then
make those objects actually useful. Reuse test: the same Service object
must power WEBSITE, ASK FYD, SEARCH, CIRCLE, FEED, SOCIAL REFERENCE,
FUTURE CAMPAIGN, MCP CONTEXT, PROTOCOL PROJECTION.

Owner flow: [Enter website] → BUILD MY FYD → FYD discovers the business.
Then immediately show: BUSINESS, SERVICES, LOCATION, CONTACT, MEDIA,
PEOPLE, CONNECTED IDENTITIES, EVIDENCE-BACKED DESCRIPTION, ASK FYD. Only
after generation does customization begin. DO NOT make the owner model
their own business. FYD does the work first.

## Harvest vs own (separation)

HARVEST EVERYTHING USEFUL but do not replace the FYD semantic core with
commodity platforms. Harvest: JSON-LD, web acquisition, browser
automation, media transformation, component editing, schema validation,
structured generation, search, protocol transport, agent transport,
authentication, performance tooling.

PING/FYD OWNS: OBJECT SEMANTICS, EVIDENCE BINDING, OWNER OVERRIDES,
RELATIONSHIPS, CAPABILITIES, TYPED MUTATIONS, EVENT/OUTCOME HISTORY.

## The goal

Not 500 controls. FYD correctly infers 95% of the starting presence; owner
fixes the remaining 5%. Interfaces: CLICK IT or TALK TO FYD — both compile
into the SAME mutation model. DIRECT EDIT → TYPED PATCH → VALIDATE → APPLY
→ HISTORY → RENDER / CONVERSATION. ONE mutation substrate. Later a visual
editor produces the same patches.

KEEP: EVIDENCE GRAPH → OBJECT GRAPH → SITE SPEC → COMPONENT CATALOG →
RENDERER. Intentionally not a CMS content universe; SiteSpec references
business objects rather than duplicating them. No customer-specific React
apps. No arbitrary production CSS. No arbitrary executable JavaScript. AI
generates/plans constrained specifications; deterministic software
validates and renders them.

## Nolan's testing bar

Two manageable FYD sites, private, demo owner mode labeled. For both
prove: website generated, mobile excellent, services discoverable, contact
obvious, media useful, Ask FYD works, unknown question refuses
appropriately, owner can correct, hide/show, change presentation
conversationally, refresh persists. Media: INGEST + DIGEST + SERVE FYD
DERIVATIVES with provenance (source URL, observation time, digest, media
type, dimensions, derivation lineage, usage basis). No unrelated imagery.
No copyright ownership implication. This outranks polish.

Visitor Ask FYD answers from the evidence/object graph; every answer
internally carries answer, object refs, evidence refs, source refs,
unknowns. If evidence does not support an answer: SAY THAT. Its advantage:
IT KNOWS THIS OBJECT WORLD. Not generic ChatGPT in a website.

## The compounding path

The same Service S1 ("Emergency Plumbing") with identity, description,
relationships, media, evidence, visibility: Website renders S1. Ask FYD
explains S1. Search discovers S1. Campaign references S1. Social post
references S1. Ad references S1. Agent proposes promotion of S1. Outcome
attaches back to S1. Do not build five separate marketing databases.

Messy website IN → eventually clean HTML, JSON-LD, OpenGraph, canonical
metadata, sitemap, RSS, fast media, accessible semantics OUT. Easier for
search engines, AI systems, agents, social networks, future protocols.

Plain-English marketing compiles to typed intent ("Promote emergency
plumbing this weekend") → TARGET OBJECT, AUDIENCE, CHANNELS, BUDGET,
ACTIONS, APPROVAL REQUIREMENTS → deterministic execution. The LLM never
directly performs arbitrary marketing actions. External side effects
require IDEMPOTENCY, ATTEMPT RECORD, OUTCOME, UNKNOWN, RECONCILIATION —
the A6 foundation, built once.

Do not ask businesses to "adopt PING." Give them: better website, less
maintenance, better structured data, intelligent concierge, easier
marketing, portable business objects. PING spreads underneath. Customer
buys the outcome; protocol adoption is the consequence.

## Keep going order

Keep private FYD sites reachable. Finish object-backed Happy Place +
Coppersmith. Finish media. Finish evidence-bounded Ask FYD. Finish owner
correct/hide/show. Finish conversational SitePatch. Prove
persistence/regeneration. Let Nolan break both sites. Fix the stupidest
customer-facing failures. Put one real external business owner through URL
→ FYD. THEN expand marketing/distribution. Federation/adapters remain
subordinate.

Do not stop product work for: full dependency inventory, new protocol
adapters, new authority taxonomy, general plugin framework, Mission
Control polish, another giant research report. Research terminates in:
HARVEST / WRAP / REJECT.

WANTED: URL → CLICK → BUSINESS EXISTS AS FYD OBJECTS → BEAUTIFUL FAST
PRESENCE → ASK FYD KNOWS THE BUSINESS → OWNER TALKS TO IT → SITE CHANGES
→ CHANGE PERSISTS → SOURCE CHANGES → FYD UNDERSTANDS THE DIFFERENCE.
Then MARKET IT. Then CONNECT IT. Then SPREAD IT.

A6 PROVES THE UGLY CRASH WINDOW. FYD PROVES THE CUSTOMER VALUE. DO BOTH.
DO NOT CONFUSE THEM. KEEP GOING.

Near-term CEO metric: how few actions does it take to turn an ordinary
business URL into a business FYD understands well enough to present,
answer questions about, edit conversationally, and later market?
Everything else either reduces that number or waits.
