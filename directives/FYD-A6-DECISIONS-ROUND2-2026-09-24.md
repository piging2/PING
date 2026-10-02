# FYD + A6 — FOUR DECISIONS CLOSED + EXECUTION (2026-09-24, Nolan)

KEEP GOING. DO NOT TURN THESE FOUR QUESTIONS INTO A NEW WAIT STATE.
THE DEFAULTS ARE ACCEPTED AS EXECUTION POLICY UNLESS NEW EVIDENCE FALSIFIES THEM.

DECISIONS:
- ORCA-A6-001: TAKE (a). Kill the ambiguous middle; UNKNOWN remains UNKNOWN.
- DEP-INV-001: TAKE (b), WITH (c) AS REQUIRED FIELD: every inventory expansion names its first consumer decision.
- FYD-SCOPE-001: TAKE (a).
- GATE-SECRET-001: TAKE (a), WITH A MANDATORY REDACTED ARTIFACT/SCRUB AUDIT.

NOW EXECUTE.

## ORCA A6 — KILL IT AT THE WORST POSSIBLE MOMENT

Do not prove clean restarts. PROVE AMBIGUITY. The required kill window is:
external effect dispatched → process dies → durable result/receipt has NOT landed.
THAT WINDOW IS THE TEST.

Required final assertion: UNKNOWN EXTERNAL OUTCOME REMAINS UNKNOWN.
NEVER: UNKNOWN → FAILED merely because the coordinator died.
NEVER: UNKNOWN → SUCCESS without durable evidence.
NEVER: UNKNOWN → RETRY until reconciliation proves retry safe.

A6 KILL MATRIX — kill at each point: before dispatch; during dispatch;
immediately after dispatch; after external provider accepts; before local
receipt; after receipt before durable persistence; during persistence;
after durable execution record; before coordinator acknowledgement; after
coordinator acknowledgement; during reconciliation; during restart
reconciliation. THE IMPORTANT CASE IS THE AMBIGUOUS MIDDLE.

For each record: mission_id, run_id, work_order_id, attempt_id,
logical_operation_id, idempotency_key, dispatch state, effect evidence,
durable evidence, reconciliation state, retry eligibility, final result,
effect count.

A6 ACCEPTANCE (consequential effects): UNKNOWN → HOLD / RECONCILE.
Then only: PROVEN SUCCEEDED / PROVEN FAILED / PROVEN NEVER EXECUTED /
STILL UNKNOWN. STILL UNKNOWN IS A VALID SYSTEM STATE. That is honesty.

## DEPENDENCY INVENTORY — BUILD FOR A CONSUMER

Start with proven-volatility dependencies: JSON-LD processor,
browser/acquisition engine, LLM provider, embedding provider, plus any
dependency with actual breakage evidence discovered during the trace.
Record per dependency: version, consumer, hot-path location, authority
relevance, input/output contract, determinism expectations, failure
modes, upgrade history, actual breakage evidence, pinning strategy,
fallback, test coverage, observability, next consumer decision.
LAST FIELD MANDATORY: WHAT DECISION WILL USE THIS INFORMATION?
NO CONSUMER: NO EXPANSION.

## FYD PROMOTION

Keep security/release promotion pure: report gate facts, release identity,
provenance, tests, promotion evidence, bounded FYD smoke, regression
status. Do NOT make the security lane grade the product.
Product lane owns: FYD current frontier, first broken product step,
customer experience verdict.

## SECRET PROOF DISCIPLINE

Use existing authorized credential mechanism. Never print or copy secret
values into chat. No plaintext temp scripts. After proof: inspect proof
artifacts, logs, temp files, command history; search bounded locations
for leaked credential material; remove temporary sensitive material;
record only REDACTED proof. Prove "credential was used through authorized
mechanism", not "credential = <value>". Mandatory redacted artifact/scrub audit.

## FYD — ONE-CLICK BUSINESS PRESENCE (the big product loop)

Owner flow: CONNECT BUSINESS → FYD UNDERSTANDS BUSINESS → WEBSITE APPEARS
→ ASK FYD WORKS → OWNER CORRECTS WHAT IS WRONG → OWNER SAYS WHAT THEY WANT
CHANGED → FYD UPDATES IT → BUSINESS PRESENCE IS READY. The owner should
not build the website. FYD builds first.

Object world (domain extensions only when a real business world needs
them; do not turn every noun into a kernel primitive): Business,
Organization, Person, Team, Role, Service, Product, Offer, Package,
Price, Location, ServiceArea, Hours, ContactMethod, Project,
PortfolioItem, Media, Article, FAQ, Review, Testimonial, Credential,
Certification, License, Specialty, Category, Appointment, Availability,
Event, Job, CaseStudy, Partner.

Object compilation per field: value, source observation, evidence,
confidence/status, observed_at, owner intent, visibility,
supersession/history. Never collapse SOURCE TRUTH / OWNER INTENT /
GENERATED PRESENTATION.

One-click ingestion: AUTHORIZED BUSINESS SOURCE → DISCOVER BUSINESS →
ACQUIRE PUBLIC/AUTHORIZED DATA → RAW SNAPSHOT → OBSERVATIONS → EVIDENCE
→ OBJECTS → RELATIONSHIPS → CONFLICTS → OWNER INTENT → SITE SPEC →
WEBSITE → ASK FYD. High-value sources eventually: existing website,
Facebook/Meta business assets, Google Business Profile, Instagram
Business, owner documents, authorized business software. Build by real
authorization + product value.

Website is projection one; the same graph supports Ask FYD, business
profile, search, service catalog, team, locations, portfolio, knowledge,
campaigns, landing pages, MCP context, agent context, future
feeds/protocols. Never re-enter the same business data per channel.

Owner experience after ingestion: WE FOUND YOUR BUSINESS — services,
locations, people, hours, contact methods, projects, media, supported
facts — YOUR SITE IS READY. Then: VIEW, CORRECT, HIDE, CUSTOMIZE, TALK
TO FYD, PUBLISH. Constitutional machinery underneath; never make the
owner operate it.

Direct editing: visible content addressable. Click "Emergency Plumbing";
FYD knows DOM element → SiteSpec section/binding → Service object →
evidence → original source → owner override → mutation capability. Then
"Change this" / "Hide this" / "Make this more prominent" all compile into
the SAME typed mutation path. No second edit system.

Conversational builder: owner "Make emergency plumbing the first thing
people see" → intent → target resolution → SitePatch → validation →
capability → consequence classification → preview when needed → apply →
witnessed event/history → rerender. The model proposes; the typed patch mutates.

Evidence-native rendering: finish the binding verifier. Every factual
render resolves to EVIDENCE-BACKED OBJECT FIELD or OWNER OVERRIDE or
EXPLICIT GENERATED PRESENTATION. Copy classes DIRECT / DERIVED /
GENERATED / OWNER. Generated must never quietly become direct evidence.

Ask FYD: QUESTION → relevant objects → evidence → answer → evidence refs
→ source refs → unknowns → available capabilities. When the graph does
not know: SAY SO.

Media: finish pipeline with source URL, observed_at, digest, media type,
dimensions, usage/license basis where known, derived lineage. Stable
FYD-served derivatives where appropriate. Public accessibility ≠ ownership.

Structured output: FYD ingests messy structured web data; emit excellent
structured data from canonical objects: JSON-LD, OpenGraph, canonical
metadata, sitemap, RSS where relevant. MESSY WEB → PING OBJECTS → CLEANER WEB.

Performance: measure LCP/CLS/INP/JS transferred/image weight. Prefer
server-renderable deterministic content, cacheable public projections,
minimal client JS, interactive islands, optimized FYD media. No random
AI-generated production CSS.

Marketing (after the business graph exists): objects Business, Audience,
Segment, Offer, Campaign, Creative, Channel, LandingPage, Content,
LeadSource, Experiment, Conversion, Attribution, Budget, MeasurementPlan.
Value loop: business graph → understand what it sells/who it serves →
evidence-backed differentiators → missing/weak presence → opportunity →
prepare asset → owner review where consequential → publish through
authorized capability → observe result → learn. Produce real value before
more software.

Crazy value missions (autonomous): missing service pages, weak
descriptions, missing FAQs, bad mobile contact flow, missing structured
metadata, missing location info, broken links, stale hours, conflicting
phone numbers, poor CTAs, missing portfolio evidence, underused reviews,
missing credentials, bad media, slow pages, SEO technical issues,
unanswered customer questions, content gaps, conversion friction,
outdated facts, unclaimed opportunities. Turn each into OBSERVATION →
EVIDENCE → OPPORTUNITY → PROPOSAL → CAPABILITY → VERIFIED OUTCOME.

Portability: a Service object powers website, Ask FYD, search, campaign,
landing page, MCP context, agent context, future protocol projection. No
recreating the service six times.

Protocol adoption loop: business connects → objects created → evidence
attached → website created → owner corrects → object quality improves →
other projections improve → marketing assets improve → agents get better
context → more outcomes produce more evidence → business graph becomes
more valuable. That is the flywheel.

Spread through value: do NOT lead with "adopt our protocol." Lead with
"your business is already understood / your website is already ready /
your information is structured / your customers can ask questions / your
business data can power more than one channel."

Consequential boundaries (AUTONOMOUSLY allowed: research, analyze,
generate, prepare, preview, test, measure, recommend, build drafts, build
websites in authorized environments. NEVER autonomously: spend real ad
money, publish consequential campaigns, contact real owners/customers,
make contractual commitments, perform irreversible external effects —
without required authority). Make everything ready up to that boundary.

Mission Control builds in parallel (TODAY, BUSINESS, WEBSITE, CUSTOMERS,
LEADS, MARKETING, CONTENT, CAMPAIGNS, PROJECTS, AUTOMATIONS,
INTEGRATIONS, SOFTWARE, KNOWLEDGE, AGENTS, MISSIONS, APPROVALS,
ACTIVITY, EVIDENCE, SYSTEM HEALTH), but FYD customer value remains the
high-priority consumer.

AUTONOMOUS CONTINUATION: no new wait state after A6 proof, dependency
inventory, promotion, FYD object completion, one-click onboarding,
website generation, Ask FYD, marketing, Mission Control. Each verified
result produces the next frontier. Website works → improve onboarding →
improve object coverage → improve correction → improve regeneration →
improve multi-projection → improve marketing → measure outcomes → turn
outcomes into evidence → improve the business model.

The website is the wedge. The object graph is the asset. Evidence is the
trust layer. Capabilities are the action layer. Mission Control is the
human control surface. Autonomy is the force multiplier. Value is how the
protocol spreads. GO.
