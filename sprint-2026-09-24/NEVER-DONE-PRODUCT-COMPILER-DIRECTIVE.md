# FYD — Never-Done Product Compiler Directive

Nolan's continuation order, 2026-09-24 ~18:43 MDT. CONTINUATION, NOT REPLACEMENT.
KEEP THE CURRENT 24-HOUR EXECUTION GRAPH. DO NOT REPLAN IT. BUT ADD THIS LAW:

THE 24-HOUR DEMO IS A CHECKPOINT. IT IS NOT THE PRODUCT. EVEN IF EVERY CURRENT GATE
PASSES PERFECTLY: KEEP GOING.

============================================================
WHAT WE ARE ACTUALLY BUILDING
============================================================

FYD IS NOT FUNDAMENTALLY A WEBSITE BUILDER. FYD IS A BUSINESS-WORLD COMPILER.

INPUT: website, social accounts, repositories, documents, feeds, media, structured
data, owner statements, future connected systems → OBSERVATIONS → EVIDENCE →
IDENTITIES, OBJECTS, RELATIONSHIPS, CAPABILITIES, OWNER INTENT, HISTORY → PROJECTIONS.

A WEBSITE IS ONE PROJECTION. ASK FYD IS ONE PROJECTION. EDGE OBJECTS ARE ONE
PROJECTION. CIRCLE IS ONE PROJECTION. SEARCH IS ONE PROJECTION. SOCIAL IS ONE
PROJECTION. AGENT CONTEXT IS ONE PROJECTION. MCP IS ONE PROJECTION. FUTURE APPS ARE
PROJECTIONS.

THIS DISTINCTION IS THE ARCHITECTURAL CENTER OF THE COMPANY. THE CUSTOMER SHOULD NEVER
HAVE TO RE-EXPLAIN THEIR BUSINESS TO FYD. EVERY LEGITIMATE INPUT SHOULD MAKE THE SAME
BUSINESS WORLD BETTER: WEBSITE + OWNER CORRECTIONS + SOCIAL + REPOSITORIES +
DOCUMENTS + INTERACTIONS + OUTCOMES → ONE IMPROVING OBJECT WORLD. THAT OBJECT WORLD
THEN POWERS EVERY SURFACE.

THIS IS WHY THE OBJECT GRAPH MATTERS. IF WE BUILD website data / social data / Ask
data / campaign data / agent data AS SEPARATE PRODUCT SILOS: WE LOST.

YES: SEARCH GITHUB CONTINUOUSLY. SEARCH CURRENT LIBRARIES. SEARCH NEW PROJECTS. SEARCH
PAPERS. SEARCH PROTOCOLS. SEARCH OUR OWN PING HISTORY. SEARCH DORMANT BRANCHES. SEARCH
CASCADEPROJECTS. SEARCH GIT HISTORY. BUT DO NOT TURN RESEARCH INTO COLLECTION. EVERY
HARVEST ITEM MUST ANSWER: WHAT FYD FAILURE DOES THIS REMOVE? WHAT CODE DOES THIS LET
US NOT WRITE? WHAT FUTURE OPTION DOES THIS PRESERVE? WHAT DEPENDENCY COST DOES IT ADD?
WHAT IS ITS LICENSE? CAN WE WRAP IT? CAN WE DELETE OUR WRAPPER LATER?

HARVEST MANIFEST: SOURCE / SHA/VERSION / LICENSE / PRIMITIVE / FYD FAILURE ADDRESSED
/ ADOPT-ADAPT-REJECT / WRAPPER / TEST / DEPENDENCY COST / REMOVAL PLAN.

CURRENT ECOSYSTEM RESEARCH REINFORCES: DO NOT HAND-WRITE EVERYTHING. HARVEST
PATTERNS/LIBRARIES FOR: typed JSON UI, schema-driven components, visual editing,
responsive primitives, sandboxed generative UI, component registration, agent/component
contracts, site revisions, transactional changes, impact analysis, snapshots, MCP
exposure, accessibility, media pipelines, crawling, structured extraction, browser
automation.

FYD SHOULD WRITE THE DIFFERENTIATION: EVIDENCE-BACKED BUSINESS GRAPH, OWNER INTENT,
OBJECT/RELATIONSHIP SEMANTICS, CAPABILITY BINDING, PROJECTION POLICY, PROVENANCE,
REGENERATION RECONCILIATION, HUMAN/AGENT AUTHORITY, OUTCOME LEARNING. DO NOT SPEND OUR
BEST ENGINEERING TIME REBUILDING COMMODITY EDITORS.

KEEP TESTING THIS HYPOTHESIS. THE IMPORTANT PROPERTY IS NOT "SITE SPEC IS JSON." THE
PROPERTY IS: HUMAN, AGENT, GENERATOR, VISUAL EDITOR ALL MUTATE THE SAME TYPED
PRESENTATION MODEL. NO: AI edits React while human editor edits another state while
generator writes another config while mobile uses another representation. ONE
PRESENTATION IR. Example: OBJECT GRAPH → SITE COMPILER → SITE SPEC ↙ ↓ ↘ WEB EDITOR /
AGENT → PATCH → VALIDATE → PREVIEW → COMMIT → RENDER. If SiteSpec cannot support this
without becoming a programming language: SIMPLIFY IT.

NOLAN'S PRODUCT INTENT IS NOW EXPLICIT. DESKTOP: OBJECTS LIVE AT THE EXTREME PAGE
MARGINS. THEY SHOULD FEEL ATTACHED TO THE BUSINESS EXPERIENCE, NOT LIKE CONTENT CARDS
INSERTED INTO THE WEBSITE. MOBILE: DO NOT TRY TO REPRODUCE DESKTOP MARGINS LITERALLY.
USE THE EXISTING OVERLAY CONCEPT. BUT CHANGE ITS SEMANTICS: THE OVERLAY IS NOT "ALL
OBJECTS." IT IS A COMPACT PACK OF INDIVIDUAL CONTEXTUAL OBJECTS. OBJECTS MAY BE
PACKED. OBJECTS REMAIN INDIVIDUALLY ADDRESSABLE. OBJECTS REMAIN FIXED RELATIVE TO THE
VIEWPORT/PAGE EXPERIENCE AS APPROPRIATE. THE USER OPENS ONE OBJECT AT A TIME. DO NOT
MANUALLY POSITION CUSTOMER OBJECTS.

EDGE OBJECT SELECTION: INPUT: current section, viewport, available objects,
relationship graph, object importance, viewer context, capabilities, presentation
constraints. OUTPUT: EDGE OBJECT SET. DETERMINISTIC FIRST. Example: Services section →
Service objects dominate. Project section → Projects dominate. Story → People +
Business. Location → Location / ServiceArea. ASK FYD / AI ONLY IF SEMANTIC SELECTION
IS AMBIGUOUS. DO NOT MAKE AI DECIDE PIXEL POSITIONS.

BUILD/HARVEST A DETERMINISTIC PACKER. INPUT: eligible objects, viewport geometry, safe
areas, header/footer, object preferred anchor, minimum separation, maximum visible
count, priority. OUTPUT: stable edge slots. INVARIANTS: NO OVERLAP, NO CONTENT
OBSTRUCTION, NO SAFE-AREA VIOLATION, NO JITTER WHILE SCROLLING, STABLE ID → STABLE
SLOT WHERE POSSIBLE, ACCESSIBLE TOUCH TARGET, DETERMINISTIC TIE BREAK. AI DOES NOT
BELONG HERE.

ONE CANONICAL OBJECT. MANY REPRESENTATIONS: tiny edge glyph, compact edge card, mobile
packed object, Circle, expanded object, search result, Ask context, agent context,
social projection. DO NOT FORK IDENTITY FOR PRESENTATION. OBJECT IDENTITY SURVIVES
EVERY SURFACE.

AN OBJECT SHOULD NOT JUST DISPLAY DATA. AN OBJECT CAN EXPOSE: facts, relationships,
evidence, history, Ask, capabilities, related objects, actions. Service: ASK,
REFERENCE, REQUEST QUOTE. Person: ASK, FOLLOW, OPEN RELATED BUSINESS. Project: ASK,
REFERENCE, OPEN SERVICE. Business: FOLLOW, ASK, CONTACT, REQUEST QUOTE. ONLY RENDER
ACTIONS BACKED BY REAL CAPABILITIES.

THIS IS THE PRODUCT TARGET. CLICK 1: PASTE URL / CONNECT SOURCE. CLICK 2: BUILD MY
FYD. EVERYTHING ELSE SHOULD BE INFERRED OR DEFERRED. DO NOT ASK UP FRONT FOR: theme,
industry, pages, brand voice, site structure, services, hours, team, colors — IF FYD
CAN DETERMINE THEM. GENERATE FIRST. LET OWNER CORRECT AFTERWARD. FYD DOES NOT NEED
PERFECT KNOWLEDGE TO GENERATE. IT NEEDS HONEST KNOWLEDGE.

Every useful field can conceptually carry: VALUE, SOURCE, CLASSIFICATION, FRESHNESS,
VISIBILITY, CONFIDENCE/STATUS WHERE APPROPRIATE. Then: HIGH SUPPORT → use. CONFLICT →
surface appropriately. UNKNOWN → omit / ask. OWNER CORRECTED → preserve owner intent.
PRIVATE → never project publicly. This lets two-click onboarding work without
pretending uncertainty does not exist.

MEASURE: T0 URL SUBMITTED. T1 IDENTITY RECOGNIZED. T2 FIRST FACTS. T3 OBJECT GRAPH
USEFUL. T4 FIRST SITE SPEC. T5 FIRST RENDER. T6 FIRST ASK ANSWER. T7 OWNER CAN
INTERACT. PRIMARY PRODUCT METRIC: TIME TO "FYD ALREADY UNDERSTANDS MY BUSINESS." DO
NOT OPTIMIZE INTERNAL STAGES WITHOUT MEASURING THEIR EFFECT ON THIS.

DO NOT REDUCE ASK FYD TO WEBSITE Q&A. IT IS THE INTERFACE TO THE BUSINESS WORLD.
Eventually: "What services do we offer?" "Where did that information come from?"
"What's outdated?" "What changed this week?" "Which services get the most interest?"
"Which source disagrees with our current hours?" "Make emergency plumbing more
prominent." "Draft a fall campaign." "Which customers asked about furnaces?" "Which
connected channels can publish this?" "Show me before doing anything." Same graph.
Same evidence. Same capabilities. Different intents.

THE BEST WEBSITE BUILDER MAY NOT FEEL LIKE A WEBSITE BUILDER. OWNER SHOULD MOSTLY:
LOOK, TALK, APPROVE, CORRECT. VISUAL CONTROLS ARE ESCAPE HATCHES. NOT THE PRIMARY
EXPERIENCE. "MAKE THE HERO LESS CORPORATE." should beat: open editor, find hero, open
typography, change component, change style, save. But deterministic structured changes
remain underneath. THIS MAY BE THE MOST IMPORTANT LONG-TERM BUILDER PRIMITIVE.

THREE DISTINCT LAYERS: OBSERVED WORLD / OWNER INTENT / GENERATED PRESENTATION. Never
collapse them. Example: Source says: Emergency Plumbing, Residential, Commercial.
Owner says: Commercial is strategically most important. Site generator chooses layout.
Later source changes. OWNER PRIORITY SURVIVES. That is dramatically more useful than
regenerating HTML.

HARVEST THE STRUCTURAL IMPACT-ANALYSIS PATTERN. OBJECT CHANGED: Service S4. Determine:
which facts, which relationships, which sections, which pages, which Ask contexts,
which search documents, which Circles, which public projections depend on S4. Then
invalidate only those. Start with a simple dependency index. Do not build a distributed
incremental-computation research project.

EVERY AI SITE CHANGE SHOULD BECOME: INTENT → PATCH → VALIDATE → IMPACT → PREVIEW →
APPLY → RECEIPT. NOT: LLM REWRITES SITE. This is one place current builder projects
validate our direction. Harvest their UX/patterns. PING owns the authority semantics.

THE OWNER MUST FEEL SAFE EXPERIMENTING. Presentation changes should be cheap to undo.
SiteSpec revision: R17 → patch → R18. Undo: R18 → inverse/new revision → R19. Do not
mutate history. Do not make website experimentation scary.

Every component should declare: accepted object types, required fields, optional
fields, relationship inputs, capabilities, visibility requirements, mobile behavior,
evidence requirements, fallback behavior. Then schema can drive: planner eligibility,
agent tools, visual editor options, validation, tests. THIS IS SCHEMA → EVERYTHING.

RECENT OPEN-SOURCE GENERATIVE-UI PROJECTS ARE WORTH STUDYING. But do not let an LLM
emit arbitrary production HTML for FYD facts. Use generative UI for: temporary
analysis, owner tools, visualization, rich concierge responses, possibly sandboxed
custom experiences. Canonical public business presentation remains typed and validated.

ACTUALIZE THE SWARM, BUT DO NOT CREATE A SWARM PRODUCT. Logical swarm roles:
ARCHAEOLOGIST, HARVESTER, IMPLEMENTER, FALSIFIER, SECURITY CRITIC, MOBILE CRITIC,
ACCESSIBILITY CRITIC, PERFORMANCE CRITIC, INTEGRATION CRITIC. Readers can scale
aggressively. Writers remain bounded. Each task carries: INVARIANT, INPUTS, EXPECTED
OUTPUT, TEST, DEPENDENCIES, WRITE SCOPE. No agent gets "improve FYD." It gets:
"Falsify owner-address privacy across these seven projections."

PRIORITY SCORE SHOULD BE MACHINE-CALCULABLE. Conceptually: severity ×
customer-journey impact × confidence × generality divided by cost × blast radius ×
dependency uncertainty. Do not fetishize the exact formula. The principle: P0, then
first broken arrow, then highest leverage generic failure. Agents should pull READY
work. Not interesting work.

Every solved failure should produce one or more of: test, fixture, rule, recipe,
critic, library decision, runbook, known-permanent disposition. The swarm should become
cheaper over time. If agents rediscover the same failure every day: THE SWARM IS NOT
LEARNING.

YES — INGEST REPOSITORIES CONTINUOUSLY. BUT DON'T RANDOMLY CLONE TRENDING REPOS.
Maintain queries against categories directly related to FYD: schema UI, generative UI,
website builders, headless CMS, structured extraction, crawlers, browser runtimes,
agent runtimes, durable workflows, local-first, identity, capabilities, provenance,
MCP, social protocols, search, incremental computation, media pipelines. Record: repo,
commit, license, activity, primitive, novel technique, overlap with PING,
adopt/adapt/reject. Then only promote high-value findings into implementation. THIS IS
IMPORTANT. DO NOT BUILD A SIDE RESEARCH DATABASE FOREVER.

Repository → OBJECT. Commit → OBJECT. Library → OBJECT. Technique → OBJECT/CONCEPT.
Relationship: implements, supersedes, depends_on, inspired_by, alternative_to. Evidence:
actual repository content / SHA. Then Ask FYD/PING can eventually answer: "What did we
learn this week that could replace our site editor?" "Which dependencies overlap our
renderer?" "What recent repository introduced a better acquisition technique?" Now
research itself compounds into the same knowledge architecture.

DO NOT "ADD ALL INTEGRATIONS" BY WRITING 40 ADAPTERS. BUILD ONE CONNECTOR CONTRACT:
DISCOVER / AUTHORIZE / OBSERVE / CHECKPOINT / NORMALIZE / REFRESH / REVOKE. And
separately for actions: PLAN ACTION / AUTHORIZE / EXECUTE / RECEIPT / RECONCILE. Then
integrations plug into those contracts. OBSERVE AND ACT REMAIN SEPARATE. AFTER WEBSITE
CORE IS GREEN: RSS/ATOM, structured open web, authorized business/social providers,
open social protocols, documents, Git repositories, business systems — based on actual
customer value. Do not prioritize a source because its API is fun.

THE VIRAL UNIT SHOULD BE THE OBJECT. Every public FYD presence can expose tasteful FYD
identity: "Built from verified business information with FYD." But the stronger loop is
functional: visitor encounters FYD object → opens it → sees useful contextual
intelligence → Ask FYD answers → visitor sees provenance → discovers FYD → creates own
presence. THE PRODUCT DEMONSTRATES ITSELF WHILE BEING USED. Do not cover customer sites
with FYD advertising. VALUE FIRST.

Circle and edge objects should eventually be embeddable. A Service object should be
able to appear: on owner site, in Circle, in another FYD reference, in search, in
social projection, in agent result. Same identity. Same provenance. Same capability
policy. That is network distribution without duplicating content.

Eventually don't search only pages. Search: businesses, services, people, projects,
locations, posts, relationships. Results open objects. Objects open Nodes. Nodes expose
Ask. This is where the graph starts producing network effects. NOT NOW. PRESERVE THE
ARCHITECTURAL SEAM NOW.

Future moat: FYD knows: what was observed, what was shown, what owner changed, what
visitor asked, what action was proposed, what was approved, what happened. Then:
OUTCOME → EVIDENCE → BETTER FUTURE DECISION. But do not let analytics silently rewrite
owner intent. Learning proposes. Authority decides.

DO NOT PUT AN LLM ON THE HOT RENDER PATH. NORMAL SITE LOAD: OBJECT PROJECTION + SITE
SPEC + RENDERER. FAST. AI happens: acquisition ambiguity, planning, Ask,
customization, research, proposal generation. CACHE deterministic projections.
PRECOMPUTE dependency indexes. Incrementally regenerate affected sections. The website
must remain fast if every model provider disappears. If AI is unavailable: SITE STILL
WORKS. OBJECTS STILL OPEN. FACTS STILL RENDER. CONTACT STILL WORKS. CAPABILITIES THAT
DO NOT REQUIRE AI STILL WORK. Only intelligence features degrade. This is important.
FYD should not be an LLM wrapper.

DO NOT ADD CRDT COMPLEXITY YET. But preserve: stable object IDs, structured patches,
append-only history, deterministic projections, portable SiteSpec. Those properties
keep future: desktop, offline, collaborative editing, local agents, sync possible
without redesigning the entire domain model. OPTIONALITY IS CREATED BY CLEAN
SEMANTICS, NOT BY INSTALLING EVERY FUTURE TECHNOLOGY TODAY.

Same principle. PING object world should not become: ActivityPub-shaped,
ATProto-shaped, Nostr-shaped, MCP-shaped. Adapters project PING semantics outward.
That lets us later choose: ActivityPub, ATProto, Nostr, MCP, new protocols without
migrating the business domain every time.

THE SAME CORE SHOULD EVENTUALLY SUPPORT: plumber, consultant, restaurant, creator,
musician, store, nonprofit, developer. Do not implement all verticals. Use them as
hostile worlds against the schema. The architecture wins when new verticals require:
new schemas/components/capabilities rather than: new application.

MEDIA: AUTHORIZED PUBLIC DEMO MEDIA MAY BE ACQUIRED AND DIGESTED ONLY WHERE USAGE
BASIS IS ADEQUATE. PRESERVE PROVENANCE. GENERATE SAFE DERIVATIVES. IF RIGHTS ARE
UNCLEAR: REFERENCE/HOTLINK WHERE APPROPRIATE OR OMIT. DO NOT EQUATE PUBLIC ACCESS
WITH REUSE RIGHTS.

OWNER GATE: USE EXPLICIT, VISUALLY OBVIOUS OPERATOR-VERIFIED DEMO OWNER MODE NOW. LOG
THE CLAIM METHOD HONESTLY. DO NOT PRETEND IT IS PRODUCTION AUTH. WIRE REAL OWNER
CLAIMING BEFORE PUBLIC SELF-SERVICE.

ASK FYD: FULL EVIDENCE-BOUNDED Q&A. SUPPORTED / PARTIAL / UNKNOWN / CONFLICTED /
RESTRICTED. NEVER INVENT TO COMPLETE AN ANSWER.

MUST-WINS: TIME TO USEFUL PRESENCE. MOBILE EXPERIENCE. SERVICE/PRODUCT DISCOVERY.
CONTACT/ACTION DISCOVERY. INTEGRITY GATES: EVIDENCE CORRECTNESS. PRIVACY. OWNER
CORRECTION. REGENERATION SAFETY.

"WHY THIS?" IS NOT THE HERO FEATURE FOR A PLUMBER. IT IS TRUST INFRASTRUCTURE.
DEFAULT EXPERIENCE: simple. When needed: inspectable. The product value is: FYD GOT MY
BUSINESS RIGHT. The trust feature is: AND I CAN SEE WHY. Do not force every customer
through provenance inspection.

THE RENDERER MUST NOT OWN CLAIM TRUTH. THE AUTHORITY IS THE PUBLIC PROJECTION /
CLAIM-BINDING SEAM. Conceptually: EVIDENCE → ACCEPTED/BINDABLE FACT → VISIBILITY
POLICY → PUBLIC PROJECTION → RENDERER. Renderer only receives facts/copy legally
allowed by that projection. The binding verifier belongs before rendering and should
be shared by: web, Ask, search, Circle, agent public context, protocol projections. If
each renderer independently decides whether a claim is supported: ARCHITECTURAL
FAILURE.

THE PIPELINE DOES NOT OWN THE BUSINESS DECISION. Source observation says: "address
observed." Privacy default may say: "do not publish until policy/owner permits." Owner
intent may say: "publish this business address." Effective visibility is then derived
from: SOURCE VISIBILITY + SCHEMA DEFAULT + OWNER DECISION + VIEWER CONTEXT. Do not
mutate/delete the evidence merely because the owner hides it. Do not let an owner
visibility choice rewrite historical observation.

YES: THE SEMANTIC EXPERIENCE MUST BE DETERMINISTIC. Same: ObjectGraph, SiteSpec,
ViewerContext, RendererVersion must produce the same: section order, object selection,
actions, semantic content, edge-object assignment, semantic render model. HTML bytes
need not be identical if framework internals inject irrelevant ephemera. Test the
semantic render model. Every ordering tie gets an explicit deterministic tiebreaker.

DO NOT START WITH A SMARTER AI PLANNER. START WITH EXPLICIT SEMANTIC RULES. Examples:
Service count > 0 → Services eligible. Location count > 0 → Locations eligible.
Project count > threshold → Work eligible. Person relationships present →
People/Story eligible. External identities present → Explore/connectivity eligible.
Then owner intent modifies priority. AI may propose composition when multiple valid
choices remain. Deterministic eligibility first. Intelligence second.

NOT: AI SITE GENERATION. NOT: PRETTY COMPONENTS. NOT: FEDERATION. NOT: AGENT SWARMS.
THE COMPOUNDING MOAT HYPOTHESIS IS: EVIDENCE-BACKED OBJECT WORLD. DURABLE OWNER
INTENT. OBJECT/RELATIONSHIP/CAPABILITY SUBSTRATE THAT POWERS MANY SURFACES. HISTORY
OF CHANGES, INTERACTIONS AND OUTCOMES. INTELLIGENCE THAT OPERATES ON THAT WORLD
WITHOUT BECOMING TRUTH. The website builder is the acquisition wedge and visible
proof.

UNCOMMITTED GREEN TESTS ARE NOT PRODUCT. STAGED WORK IS NOT PRODUCT. LANE-LOCAL PROOF
IS NOT PRODUCT. A FEATURE COUNTS ONLY WHEN: INTEGRATED → MERGED → FULL GATE GREEN →
RUNNING PRODUCT → REPLAY COMMAND RECORDED. Items already identified as integration
debt must converge. Do not create more branches faster than we can integrate them.

EVERY DAY: REOBSERVE PRODUCT. INGEST HIGH-VALUE ECOSYSTEM CHANGES. HARVEST. RUN HOSTILE
BUSINESS WORLDS. RUN REAL BUSINESSES. RUN MOBILE MATRIX. RUN SAFETY CRITICS. RUN OWNER
LOOP. RUN REGENERATION. MEASURE TIME-TO-UNDERSTANDING. FIND FIRST BROKEN ARROW. FIX
IT. INTEGRATE. REPEAT.

WHEN CURRENT 24-HOUR GATES GO GREEN: DO NOT CELEBRATE BY ADDING RANDOM FEATURES.
ADVANCE ONE FRONTIER. ORDER: REAL EXTERNAL OWNER → OWNER AUTH → ACQUISITION COVERAGE
→ MEDIA QUALITY → SEARCH/DISCOVERY → SOCIAL OBSERVATION → CROSS-NETWORK PROJECTIONS →
CAMPAIGN INTENT → OUTCOME LEARNING.

At each stage: HARVEST FIRST. BUILD MINIMUM GENERIC DELTA. PROVE WITH REAL USER. DO
NOT LET THE BIG VISION DISTRACT FROM THE CURRENT FRONTIER.

RIGHT NOW THE PRODUCT STILL NEEDS: EDGE OBJECT → OPEN → RELATIONSHIP → RELATED OBJECT
→ ASK → EVIDENCE → BACK AND: OWNER REQUEST → PATCH → APPROVE → DURABLE CHANGE →
REGEN → OWNER INTENT SURVIVES. Those remain the execution path.

The rest of this directive exists to ensure we do not make choices tonight that
destroy tomorrow's optionality.

KEEP :3100 AVAILABLE FOR NOLAN. PUT THE OBJECTS BACK AT THE EXTREME EDGES. ON MOBILE:
PACK CONTEXTUAL INDIVIDUAL OBJECTS INTO THE EXISTING OVERLAY CONCEPT. DO NOT SHOW
"ALL OBJECTS" AS THE DEFAULT MOBILE EXPERIENCE. KEEP OBJECTS INDIVIDUALLY OPENABLE.
KEEP THEM SEMANTICALLY CONTEXTUAL. KEEP THE WEBSITE CENTER BEAUTIFUL. DO NOT
OVERSPEND TIME POLISHING THIS.

THE DEEP WORK REMAINS: ONE BUSINESS-WORLD MODEL. ONE EVIDENCE MODEL. ONE OWNER-INTENT
MODEL. ONE PRESENTATION IR. ONE PATCH PATH. ONE CAPABILITY SUBSTRATE. ONE CONNECTOR
CONTRACT. ONE HISTORY. MANY SURFACES.

HARVEST COMMODITY. OWN DIFFERENTIATION. DETERMINISTIC SOFTWARE WHERE POSSIBLE.
INTELLIGENCE WHERE VALUABLE. AGENTS PROPOSE. AUTHORITIES DECIDE. PROJECTIONS RENDER.
OUTCOMES TEACH. INTEGRATE EVERYTHING THAT IS ALREADY PROVEN. THEN KEEP ADVANCING. WE
ARE NEVER DONE BECAUSE THE PRODUCT SHOULD COMPOUND FASTER THAN THE BACKLOG. GO.

## NOLAN'S ARCHITECTURAL CORRECTION (appended 2026-09-24 ~18:44 MDT)

"Ingest Git repos every day" must NOT mean the product lane chases GitHub daily. It is
a BOUNDED SENSOR/HARVEST LANE that feeds TESTED RECOMMENDATIONS into the queue.
Novelty must never continuously preempt convergence. The harvest lane reads, falsifies,
tests, and harvests; it does not touch primary writers unless it surfaces a P0, and it
promotes only tested findings into implementation.

Ecosystem validation to harvest (patterns, not copies): OpenPage (typed JSON as common
editing substrate for humans, AI and rendering), Object UI (schema-driven UI
generation), Tambo (registered typed components bound to agent-driven generative UI),
VoxelSite (transactional site-wide AI changes, structural impact analysis, snapshots,
human/agent actions, MCP exposure). These validate FYD directions; FYD's
differentiation remains the evidence-backed object world, durable owner intent,
relationships, capabilities, and many projections — not another AI page generator.

Protected constitutional insight: observed world, owner intent, and generated
presentation must remain separate, while the edges expose the deeper object system
without replacing the normal website. Protect this even if almost every
implementation detail changes.
