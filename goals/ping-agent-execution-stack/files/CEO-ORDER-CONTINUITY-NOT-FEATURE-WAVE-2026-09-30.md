# CEO ORDER — BRUTAL CEO MODE: CONTINUITY, NOT ANOTHER FEATURE WAVE (2026-09-30 ~17:44 MDT, Nolan, binding, filed verbatim)

## Repository caveat (Nolan's recheck, binding)

The GitHub-visible PING repository is still only showing its initial September 17 commit; FYD remains inaccessible through the connected GitHub account; CRX GitHub still shows the June constitutional-object commit. Therefore the much newer Pig-local state reported remains the authoritative evidence for current local implementation, not GitHub-visible state. Nothing below pretends otherwise.

## Prior message: Mission Control as continuity substrate (Nolan, binding context)

Mission Control should not be an admin dashboard for FYD. It should become the continuity substrate for the business—and eventually the owner's operational life around that business.

FYD is how Mission Control acquires a grounded model of the business. PING is the continuity/intelligence spine. ORCA turns intent into bounded work. TenantOS decides where capabilities can run. Workers are replaceable hands. Muse-level intelligence becomes a conversational interface over the whole thing, and over time the system should compile repeated intelligent judgment into deterministic software.

The existing material already points there. Mission Control explicitly describes itself as a projection over proven backend state, with UNKNOWN rather than invented values, but many operational fields are still waiting for the ORCA port contract.

The forensic work is even more important: it found the canonical event writer, identity authority, ClaimWorker, MissionRuntime and KnowledgePromoter already present, so this is primarily a wiring/convergence problem, not permission to invent another platform.

And the MarketingOS analysis gives us the right pattern for every future domain: canonical truth stays clean; interpretations and projections sit above it; observed outcomes feed learning back into the system.

The product I would build:

The conceptual shift is from this:

MISSION CONTROL = screen showing missions

to:

MISSION CONTROL = CONTINUITY OS

WHO / WHAT EXISTS
        ↓
WHAT IS TRUE
        ↓
WHAT DO I WANT
        ↓
WHAT CAN THE SYSTEM DO
        ↓
WHAT REQUIRES MY AUTHORIZATION
        ↓
WHAT IS HAPPENING
        ↓
WHAT ACTUALLY HAPPENED
        ↓
WHAT CHANGED IN THE WORLD
        ↓
WHAT DID WE LEARN
        ↓
WHAT SHOULD HAPPEN NEXT

The user shouldn't have to understand events, mission payloads, capability grants, worker leases, reconciliation states, cron syntax, JSON, Postgres, Docker, ORCA, TenantOS, or which model is running.

You speak English. Mission Control does the translation.

"Remind me Thursday to call Mike."
"Figure out why leads dropped this month."
"Research these three competitors and tell me whether we're missing anything important."
"Make a video about the correction-survival feature, but don't publish it."
"Watch the website and tell me if anything important breaks."
"Move this work off the Pig if storage gets tight."
"Show me everything I authorized today."
"Why did you do that?"
"What are you waiting on me for?"
"What did we learn this week?"
"Keep improving this until it stops needing an AI to make the routine decisions."

Those should all enter the same continuity system, not seven products.

The architecture: BrainOS over the existing spine. Do not create BrainAuthority, BrainDatabase, PersonalOSRuntime, or another sovereign agent framework.

The actual composition should become:

                    HUMAN
                      │
              NATURAL LANGUAGE
                      │
                      ▼
             ┌─────────────────┐
             │ MISSION CONTROL │
             │   / BrainOS     │
             └────────┬────────┘
                      │
                INTENT COMPILER
                      │
          understand / clarify / inspect
                      │
                      ▼
               EXISTING PING STATE
          ┌───────────┼───────────┐
          │           │           │
       objects     knowledge    evidence
       people      missions     outcomes
       business    learnings    capabilities
          │           │           │
          └───────────┼───────────┘
                      ▼
                     ORCA
             plan / decompose / route
                      │
                      ▼
              AUTHORIZATION GATE
                      │
                      ▼
                  TenantOS
          capability / placement resolution
                      │
          ┌───────────┼─────────────┐
          ▼           ▼             ▼
     deterministic   local AI    remote/agent
       software      worker        worker
                      │
                      ▼
                   RESULT
                      │
              independent check
                      ▼
                   EFFECT
                      │
                   OUTCOME
                      │
                  LEARNING
                      │
                      ▼
              deterministic policy
                 where justified

That is the endgame. The model is not the operating system. The model is the interpreter for places where deterministic software does not yet know what to do. That distinction is everything.

### Mission Control / BrainOS convergence directive

Tell the crew this:

MISSION CONTROL / BRAINOS CONVERGENCE DIRECTIVE

Pause broad UI expansion. Mission Control is no longer being developed primarily as an operations dashboard. Treat it as the continuity substrate through which an FYD business eventually understands, remembers, schedules, authorizes, executes, verifies, learns from, and improves work across its business.

DO NOT BUILD A NEW BRAINOS AUTHORITY, STORE, EVENT SYSTEM, SCHEDULER, MEMORY SYSTEM, AGENT RUNTIME, OR WORKFLOW ENGINE. First prove an existing primitive cannot represent the requirement.

PRODUCT LAW: The owner speaks ordinary language. The system translates: ENGLISH → CONTEXT → INTENT → PLAN → AUTHORITY → CAPABILITY → EXECUTION → RESULT → EFFECT → OUTCOME → LEARNING. The owner should not have to speak JSON, choose workers, understand mission schemas, know cron syntax, or know where execution happens.

HUMAN CONTRACT: Mission Control must eventually answer five questions extraordinarily well: What do you know about me/my business? What is happening? What needs me? What can you do for me? Why did you do/decide/recommend that? Everything else is secondary navigation.

FIRST PRINCIPLE: UI complexity must collapse as backend capability increases. Current tabs such as Missions / Runs / Agents / Results / Failures are useful operator/debug projections. They are not necessarily the final owner information architecture. Likewise Claims / Evidence / Questions / Learnings / Playbooks are important semantic state, but ordinary owners should usually encounter them contextually rather than operating five separate databases with their eyes. Preserve these backend concepts. Simplify their human projection. COLLAPSE UI, NEVER COLLAPSE SEMANTICS.

P0 — FINISH THE REAL MISSION SPINE: Before adding BrainOS features, make one ordinary-language request travel the real system: OWNER UTTERANCE → interpreted intent → mission → ORCA plan → authorization requirement → TenantOS capability resolution → worker attempt → result → independent effect verification → outcome → learning → Mission Control explanation. Use existing authorities and stores. One tiny local Ollama/Qwen worker is acceptable as an interpreter/worker, never as truth authority. Start with a bounded request that exercises the entire chain without dangerous external consequences.

P1 — NATURAL-LANGUAGE INTENT FRONT DOOR: Build the smallest interface that allows: "What happened today?" "What needs my approval?" "Research X." "Remind me tomorrow." "Schedule this every Tuesday." "Why is this mission stuck?" "What do you know about customer X?" "Draft this but don't publish it." "Check whether that actually happened." "What did we learn?" The interpreter produces a typed proposal. It does not directly mutate consequential state. Show the interpretation when ambiguity matters: I understood this as: … This would: … Requires approval: YES/NO. Unknown: … Clarification should occur only where ambiguity changes consequence.

P2 — SCHEDULING BECOMES A FIRST-CLASS HUMAN CAPABILITY: The owner should be able to say: "Every Monday morning research what changed in my market." "Remind me Friday if Sarah hasn't replied." "Check disk space daily and only bother me if it becomes dangerous." "Draft a weekly business review every Sunday." Reuse existing scheduling/mission primitives. Do not create another scheduler because natural language exists. The model interprets schedule intent once. Deterministic scheduling owns recurrence afterward. MODEL INTERPRETATION → DETERMINISTIC SCHEDULE.

P3 — CONTEXTPACK / BRAIN QUERY: A business owner should be able to ask Mission Control questions spanning the business: "What do we know about Acme?" "Why did this lead go cold?" "Which services are customers asking about that we don't explain well?" "What changed since last month?" "What have I corrected you about repeatedly?" "Which things do you believe but can't prove?" "What are the five biggest unknowns in the business?" Retrieval must respect canonical truth, evidence, owner assertions, privacy, freshness and uncertainty. Never turn model prior into business fact.

P4 — ONE UNIVERSAL ACTION MODEL: Do not create bespoke orchestration for marketing, CRM, FYD, infrastructure, research and personal scheduling. Normalize consequential work around the existing chain: PROPOSAL → AUTHORIZATION → ATTEMPT → RESULT → EFFECT → VERIFICATION → OUTCOME. Different domains supply different capabilities and policies. The lifecycle remains one.

P5 — CAPABILITY GRAPH: Mission Control should know what the system can actually do right now. Not documentation claims. Reached capabilities. Examples: READ WEBSITE, RESEARCH WEB, QUERY PING, GENERATE FYD, DRAFT CONTENT, RENDER VIDEO, DRIVE BROWSER, POST SOCIAL, READ METRICS, SCHEDULE MISSION, RUN LOCAL MODEL, RUN REMOTE AGENT, BACKUP DATABASE, VERIFY EFFECT. Each capability needs: availability, eligible tenant, authorization class, execution targets, health, cost class, verification method, current restrictions. Capability availability must be observed, not advertised.

P6 — ORCA BECOMES THE PLANNER, NOT ANOTHER PRODUCT: ORCA receives intent plus context and decomposes only as much as required. Prefer: DETERMINISTIC FUNCTION over MODEL CALL over MULTI-AGENT PLAN whenever the earlier option is sufficient. Planning complexity must be proportional to task uncertainty. A reminder should not invoke a research swarm. A multi-source market investigation may.

P7 — TENANTOS BECOMES INVISIBLE PLACEMENT: The owner should never normally select Pig / Oracle / Qwen / Codex / Hermes / cloud. TenantOS resolves: REQUIRED CAPABILITY → ELIGIBLE TARGETS → POLICY → HEALTH → COST → PLACEMENT. Execution location is replaceable. Canonical state is not. ONE BRAIN. MANY HANDS.

P8 — MUSE MUST WORK ITSELF OUT OF ROUTINE JOBS: Every repeated intelligent operation is a candidate for compression: MODEL-REQUIRED → MODEL-ASSISTED → DETERMINISTIC DEFAULT + MODEL ESCALATION. Record: input/context, recommendation, decision, outcome, exceptions, confidence. Look for repeated stable decisions. Propose deterministic rules. Never silently promote them. Promotion crosses the existing authorization boundary. The objective is not "use more AI." The objective is: continually reduce how much expensive intelligence is required for reliable operation.

P9 — MARKETINGOS BECOMES ONE DOMAIN OF BRAINOS: Preserve the strong existing marketing model: OBJECT → CAPABILITY → CUSTOMER PROBLEM → CLAIM → SUPPORT SET → PROOF → AUDIENCE → SURFACE → OUTCOME → LEARNING. Generalize the topology, not the domain vocabulary. CRM has its own interpretation. Infrastructure has its own. Personal scheduling has its own. FYD has its own. They share continuity primitives underneath.

P10 — MISSION CONTROL INFORMATION ARCHITECTURE: Do not delete existing diagnostic views. Add an owner-level projection above them: TODAY (what happened / what changed), NEEDS YOU (approvals / ambiguity / blocked work), ASK (conversational BrainOS), WORK (active objectives and missions), PEOPLE & BUSINESS (CRM/entity context), CREATE & GROW (FYD/MarketingOS/media), AUTOMATIONS (scheduled and recurring work), MEMORY (known / uncertain / learned / corrected), SYSTEM (capabilities / health / infrastructure / forensic detail). Existing expert/debug tabs remain available underneath. Do not reorganize UI until backend wiring proves the projection.

P11 — CONTINUITY IS THE MOAT: Every meaningful interaction should leave useful durable residue: research → evidence; correction → owner state; task → mission; action → effect record; result → outcome; experiment → learning; relationship → entity graph; recurring preference → candidate deterministic rule; failure → reconciliation knowledge. The system should become materially more useful after a year of use without requiring a single giant opaque model memory.

P12 — BUSINESS ONBOARDING BECOMES CAPABILITY ACQUISITION: FYD onboarding should eventually discover: website, business identity, services, people, customers/CRM, calendar, email, social accounts, analytics, files, products, operational tools, existing automations, owner corrections, permissions, goals. But connection does not equal authority. Each source gets: read capability, write capability, authorization boundary, provenance, freshness, privacy class. Never make "connect everything" mean "agent may do everything."

P13 — OWNER CORRECTION BECOMES COMPOUNDING INTELLIGENCE: Corrections are among the highest-value records in the system. Distinguish: source assertion, observed fact, owner assertion, derived inference, AI proposal, presentation choice. Repeated corrections should teach the system what it misunderstands. They must never simply overwrite historical evidence.

P14 — THE SYSTEM MUST EXPLAIN ITSELF: Every consequential action should eventually answer: What did I ask? What did you understand? What evidence did you use? What did you decide? Was that a recommendation or an authorization? Who authorized it? What attempted the action? What did the worker report? What independently verifies the effect? What outcome followed? What remains unknown? What did the system learn? This becomes Mission Control's universal drill-down.

P15 — DO NOT FAKE COMPLETENESS: The current Mission Control already contains fields explicitly marked pending ORCA port contract; preserve that epistemic honesty. UNKNOWN is a product feature. Empty is preferable to fabricated. Worker result is not world truth. Scheduled is not executed. Executed is not effect. Effect is not outcome. Correlation is not causation. Model recommendation is not authority.

IMMEDIATE BUILD ORDER: Do not attack all fifteen sections. First close the currently reached defects that invalidate the substrate: make the retry fix durable in source/build/deployment; eliminate automatic retries for unknown consequential outcomes; establish deployment/authority witness; wire the real PING mission journal into Mission Control rather than showing only the FYD file journal.

Then prove one vertical BrainOS slice: "Remind me tomorrow to review the FYD acquisition results." It must: understand natural language, create durable scheduled work, survive restart, appear in Mission Control, fire once, produce evidence, show completion, answer "why did you remind me?" from durable state.

Then: "Research whether X is worth making a technical video about. Don't publish anything." That exercises research → evidence → claims → synthesis → artifact proposal → approval boundary.

Then: "Every Friday tell me what we learned about marketing this week and propose one experiment." This proves recurrence + knowledge + outcome learning.

Only after those work should the owner UI expand materially.

WRITER LAW: Maximum 3–4 writers. Readers/falsifiers can run in parallel. One mutation owner per surface. Search before writing. Existing implementation first. On collision, lower-priority writer stops. Muse commit law applies. No blanket stash/apply. No new store or authority without a proven representational failure.

SUCCESS: Do not report "agents dispatched." Report: OWNER REQUEST → REACHED → DURABLE → EXECUTED → VERIFIED → EXPLAINABLE → RESTART-PROVEN plus first broken edge. The north-star demonstration is not a dashboard. It is the owner typing: "What should I care about today?" and Mission Control giving a concise, evidence-grounded answer across the business, followed by: "Handle everything you safely can and bring me only the decisions that actually need me." Then doing exactly that—without acquiring authority the owner never granted.

There is a deeper business implication here. The MarketingOS work already says every FYD customer can eventually inherit a miniature MarketingOS from the same graph because FYD knows who the business is, what it sells, what evidence supports it, what the owner corrected, and how it should be presented. Extend that principle carefully and FYD onboarding becomes the beginning of a persistent operational relationship, not the completion of a website project. That is the 10,000× leverage story: not "an AI does 10,000 times more stuff." It is that the business's accumulated truth, corrections, relationships, evidence, approvals, outcomes, routines, and learned procedures stop evaporating between humans, apps, chats, models, and contractors. Every competent model or worker that arrives later inherits that continuity rather than starting from zero.

And "work itself out of a job" should be literal engineering doctrine. Muse should be most valuable today precisely where the software is least mature. Every month, some fraction of its repeated reasoning should become tested deterministic behavior, leaving Muse to handle the new, ambiguous, adversarial, creative, and genuinely difficult frontier.

FYD acquires the business. PING remembers it. Mission Control operates it. ORCA reasons about work. TenantOS finds hands. Workers execute. Evidence tells us what actually happened. Outcomes teach the system. Deterministic software gradually replaces repeated reasoning. That's the system worth converging now. Harvest before new. Always try to steal all the ecosystem. FYD is the acquisition/onboarding surface. Mission Control is the continuity substrate. PING is the intelligence, truth, mission, evidence, and execution spine underneath both.

---

## The forensic says 13 of 18 MarketingOS arrows ride proven PING primitives (Nolan, binding)

The forensic says 13 of 18 MarketingOS arrows already ride proven PING primitives; the remaining five are bounded seams, not missing platforms. Mission Control has also already been framed correctly as the operating environment over the same objects, missions, capabilities, evidence, sites, relationships, runs, and approvals—not another truth store.

The external market is converging toward this architecture too, but mostly in fragments: PostHog is rapidly combining governed metrics, signals, product behavior, experiments, AI observability, MCP and agent-accessible operations. Ahrefs now exposes AI responses, citations, cited pages/domains, mentions, impressions and share-of-voice through Brand Radar APIs/MCP. Modash exposes discovery over 250M+ creator profiles plus raw social data and recently added API-level AI search/list workflows; Upfluence exposes creator intelligence and workflow actions through REST and MCP.

Harvest those boundaries. Don't recreate those companies.

The bigger idea is exactly what you said: Mission Control is the continuity substrate. Website generation, MarketingOS, CRM, social, content, commerce, agents, infrastructure and future things we haven't named yet become capabilities over the same tenant world.

## THE DIRECTIVE: BRUTAL CEO MODE — CONTINUITY, NOT ANOTHER FEATURE WAVE

WE HAVE ENOUGH EVIDENCE TO MAKE THE NEXT ARCHITECTURAL CALL.
MISSION CONTROL IS NOT A DASHBOARD.
MISSION CONTROL IS THE CONTINUITY SURFACE OF THE TENANT'S DIGITAL LIFE.
FYD IS THE FIRST CUSTOMER-FACING PRODUCT.
PING IS THE SUBSTRATE.
ORCA COORDINATES WORK.
TENANTOS PROVIDES PORTABLE TENANT RESOURCES.
MARKETINGOS IS A CAPABILITY FAMILY OVER THE SAME WORLD.
DO NOT TURN ANY OF THESE INTO ANOTHER ISOLATED DATABASE OR APPLICATION.

### 1. PROVEN GATEWAY IMAGE — GO

Promote the proven source-built gateway image through the SAME bounded deployment/rollback procedure already proven.

Reason: the running container currently depends on a container-only patch while a source commit + rebuilt image + fresh-container proof already exist. Configuration drift is now worse than the bounded promotion risk.

Preflight again at execution time. Rollback on invariant failure. Do not combine unrelated changes with deployment.

### 2. TENANT ON PROPOSAL — YES

Tenant ownership belongs at PROPOSAL CREATION. Do not infer it only during approval.

But this is NOT permission to invent TenantAuthority or duplicate tenant state. First locate the existing tenant identity/ownership primitive. Then make a proposal carry/reference the immutable tenant context required to prove: PROPOSAL TENANT vs CALLER/APPROVER ENTITLEMENT TENANT before approval.

Migration must be additive and compatibility-aware. No destructive rewrite. Existing proposals without tenant provenance fail closed where tenant authorization cannot be established.

### 3. CAPABILITY REGISTRY — DO NOT WEAKEN THE NEW 403

The fact that the current registry entry has zero capabilities and therefore approvals fail closed is CORRECT. Provision only the exact capabilities Nolan/PING needs for the next approved proof. Do not use wildcard capability grants to make the demo green.

A business should eventually onboard: WEBSITE, SOCIAL ACCOUNTS, EMAIL, CALENDAR, CRM, FILES, CONTACTS, COMMERCE, ACCOUNTING, ANALYTICS, ADVERTISING, CONTENT, MEDIA, INFRASTRUCTURE — and NOT create twelve disconnected FYD products. They enrich ONE TENANT WORLD.

                     TENANT
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
 IDENTITY           OBJECTS          PRIVATE CONTEXT
    │                  │                  │
    ├────────── RELATIONSHIPS ────────────┤
    │                  │                  │
 EVIDENCE         CAPABILITIES          FILES
    │                  │                  │
    └────────────── EVENTS ───────────────┘
                       │
                    HISTORY
                       │
                 OUTCOME/LEARNING
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
         FYD       MISSION CONTROL   ADAPTERS
         SITE          / ORCA        / PROTOCOLS

Mission Control is how the owner OPERATES this world. FYD is how parts of this world are PROJECTED publicly. Every integration should increase the value of everything already connected.

Website alone: FYD understands business. Add calendar: FYD understands availability. Add CRM: FYD understands relationships and opportunities. Add email: FYD understands communications where explicitly authorized. Add commerce: FYD understands transactions/products/outcomes. Add analytics: FYD understands behavior. Add social: FYD understands public relationships/distribution. Add MarketingOS: FYD understands market opportunities and evidence-backed claims. Add agents: the tenant can reason and act over all authorized context.

THE VALUE IS NOT: 12 integrations. THE VALUE IS: 12 SOURCES COMPOUNDING INTO ONE OPERABLE WORLD.

Every durable customer fact must survive: UI replacement, website redesign, agent replacement, model replacement, provider replacement, cloud migration, protocol changes, adapter replacement.

Therefore: UI IS NOT TRUTH. SITE IS NOT TRUTH. AGENT MEMORY IS NOT TRUTH. CRM ADAPTER IS NOT TRUTH. SOCIAL PROVIDER IS NOT TRUTH. MCP SERVER IS NOT TRUTH. Canonical state/evidence/history remain beneath them.

Do NOT create 40 tabs. Mission Control ultimately needs to answer:
1. WHAT IS TRUE? (objects, relationships, evidence, knowledge, current state.)
2. WHAT IS HAPPENING? (missions, runs, agents, external effects, failures, cost, progress.)
3. WHAT NEEDS MY DECISION? (approvals, conflicts, permissions, owner corrections, opportunities, risk.)
4. WHAT SHOULD HAPPEN NEXT? (proposals, opportunities, experiments, maintenance, marketing, customer actions, infrastructure changes.)
Everything else is a projection/filter.

The eventual home should feel less like AWS Console and less like Jira. Think: GOOD AFTERNOON. YOUR BUSINESS IS HEALTHY. 2 things need your decision. 3 opportunities were discovered. 1 source changed. 4 missions completed. Ask: "What should I focus on?" "Keep my website accurate." "Find new opportunities." "Prepare this week's marketing." "Why did this change?" "Move this workload." "Follow up with interested customers."

Natural language produces STRUCTURED INTENT. Never hidden direct effects. Make every capability fit the same loop: OBSERVE ↓ UNDERSTAND ↓ PROPOSE ↓ AUTHORIZE ↓ EXECUTE ↓ VERIFY EFFECT ↓ RECORD EVIDENCE ↓ LEARN.

Website: observe source → propose site change → approve → regenerate → verify. Marketing: observe market → propose artifact → approve → publish → measure. CRM: observe interaction → propose follow-up → approve/policy → send → verify. Infrastructure: observe utilization → propose migration → approve → execute → verify.

THIS is the continuity substrate.

The forensic is decisive: 18 arrows examined. 13 already ride existing primitives. Remaining gaps are bounded vocabulary/behavior seams. Therefore: NO MarketingAuthority. NO OpportunityAuthority. NO CampaignTruthStore. NO second event writer. NO marketing-specific scheduler. NO marketing-specific evidence database.

Use existing: canonical event writer, event identity, ClaimWorker, MissionRuntime, KnowledgePromoter, evidence, relationships, capabilities, missions/runs, proposals/approvals.

Opportunity can remain a CLAIM/knowledge semantic with appropriate kind unless implementation evidence disproves it. PROPOSED_ACTION remains the proposal primitive.

Before producing content, connect: OBJECT → CAPABILITY → CUSTOMER PROBLEM → CLAIM → SUPPORT SET → EVIDENCE → AUDIENCE → SURFACE. Then MarketingOS can ask: WHAT CAN WE DEFENSIBLY SAY? instead of: WHAT CAN AN LLM WRITE? This is the moat. One verified thesis can compile into: FYD PAGE, ASK FYD, FAQ, ARTICLE, VIDEO SCRIPT, SOCIAL POST, COMPARISON, CREATOR BRIEF, SALES EXPLANATION, AI-ANSWER SURFACE. Every derivative points to the same evidence-bound claim. If evidence changes: find affected projections. Do not let marketing copy become detached orphan truth.

Each proposed artifact receives a claim inventory: VERIFIED / INFERRED / UNKNOWN / CONFLICTING / REFUTED. Policy: VERIFIED: assert within evidence scope. INFERRED: qualify. UNKNOWN: research/question. CONFLICTING: disclose or resolve. REFUTED: do not publish. This should eventually apply beyond marketing. It is useful for: Ask FYD, sales, support, agent answers, generated websites, comparison pages.

Before consequential publication/action compare candidate claims against: current objects, evidence, runtime/deployment state, prior published claims, owner corrections, fresh observations. Catch: DOC SAYS X / LIVE SYSTEM SAYS Y. OLD CLAIM SAYS SUPPORTED / CURRENT EVIDENCE SAYS REFUTED. WORKTREE HAS FEATURE / PRODUCTION DOES NOT. This is behavior over existing evidence. NOT another authority.

Every FYD presence should eventually publish the entity simultaneously for: HUMANS, SEARCH, AI ANSWER SYSTEMS, AGENTS, SOCIAL PREVIEWS, APIS. Compile from the same graph: HTML, structured data, canonical URLs, evidence surfaces, freshness, capabilities, FAQ, Ask FYD, Why This, machine-readable entity facts. FYD becomes ENTITY PUBLISHING INFRASTRUCTURE. Not merely a website builder.

Current external tooling confirms an important market shift. AI-answer visibility is becoming measurable: questions, answers, mentions, citations, cited URLs/domains, share of voice. Harvest this as OBSERVATION. Do not make Ahrefs canonical truth. MarketingOS should eventually ask: WHAT QUESTION DOES OUR AUDIENCE ASK? WHAT ANSWER CURRENTLY APPEARS? WHAT SOURCES GET CITED? WHAT VERIFIED PING EVIDENCE DO WE HAVE? WHAT PUBLIC PROOF IS MISSING? WHAT IS THE CHEAPEST DEFENSIBLE ARTIFACT THAT CLOSES THAT GAP? That is more valuable than generic SEO content generation.

PostHog, Ahrefs, Modash, Upfluence, future CRM, analytics, creator databases, social providers are OBSERVATION/EXECUTION PROVIDERS. Not authorities. Pattern: EXTERNAL DATA → OBSERVATION → EVIDENCE → PING INTERPRETATION → PROPOSAL. External actions: PING INTENT → CAPABILITY → POLICY → PROVIDER ADAPTER → EFFECT → RECEIPT/EVIDENCE. This preserves provider optionality.

POSTHOG: Harvest the topology: behavior → signal → analysis → experiment/action → measured outcome. Do NOT reproduce PostHog. Use it as a data provider or pattern source where useful.
AHREFS: Harvest AI-answer/citation visibility.
MODASH / UPFLUENCE: Harvest creator discovery/audience/collaboration intelligence through their APIs where commercially justified. Do not scrape/maintain a competing creator warehouse unless economics eventually prove that necessary.
MCP: Use for interactive/ad-hoc intelligence provider access where useful. REST/stream/webhook: use for deterministic production ingestion/execution. MCP is not canonical persistence.

Represent market understanding using existing knowledge/object/relationship primitives: AUDIENCES, PROBLEMS, QUESTIONS, OBJECTIONS, ALTERNATIVES, COMPETITORS, CREATORS, COMMUNITIES, SEARCH QUERIES, AI PROMPTS, CLAIMS, MISCONCEPTIONS, SURFACES, OUTCOMES. Do NOT create all of these as new foundational schemas today. Begin with existing generic knowledge/relationship semantics. Specialize only after repeated real use proves the need.

An opportunity is NOT permission. Opportunity: "I think doing X may produce useful outcome Y because evidence Z." It should carry/reference: subject, audience, problem, hypothesis, support, expected outcome, cost, risk, freshness, confidence. Then: OPPORTUNITY → PROPOSED_ACTION → APPROVAL/POLICY → MISSION → RUN → EFFECT → EVIDENCE → OUTCOME. No hidden jump from score to action.

The design lane identified grant events as one real vocabulary seam. Good. Do not invent a second authorization system. A grant is durable evidence that a principal received a bounded capability/permission under specific conditions. Need to represent: WHO, CAPABILITY, SCOPE, TENANT, ISSUER, VALID FROM, EXPIRATION, CONSTRAINTS, REVOCATION. Reuse CapabilityAuthority semantics. The event vocabulary should make changes observable/replayable.

The other small gap is machine-readable publication. Good. Emit JSON-LD from canonical/verified FYD objects through a deterministic projection. Do NOT allow arbitrary marketing copy to become structured factual truth. Only evidence-backed/owner-asserted fields eligible under visibility policy should appear. JSON-LD is projection. PING objects remain truth.

Implement tenant binding at proposal creation. A proposal must not become tenant-aware only when someone tries to approve it. Conceptually: Proposal { proposal_id, tenant_id, actor_id, capability, action_digest, payload/effect reference, evidence refs, created_at }. DO NOT blindly adopt these exact fields if existing schema names differ. Use the existing proposal/event representation. The invariant is: TENANT IS IMMUTABLE PROPOSAL CONTEXT. Approval verifies: principal, tenant entitlement, capability, proposal digest, proposal state, constraints.

Be precise: Mission Control itself is NOT memory. The underlying tenant graph/history/private context is continuity. Mission Control is the durable operating projection over it. That distinction matters because tomorrow we may replace the entire Mission Control frontend. The tenant must survive unchanged.

Eventually onboarding should be additive: DAY 1: website. DAY 2: calendar. DAY 3: CRM. DAY 10: social. DAY 30: commerce. DAY 60: accounting. Every connection should enrich the SAME identities/objects/relationships/evidence/capabilities. Never force a tenant to rebuild itself in each module.

Future capabilities can become installable packs: WEBSITE INTELLIGENCE, CONCIERGE, CRM, SCHEDULING, EMAIL, MARKETING, CONTENT, VIDEO, SOCIAL, COMMERCE, ACCOUNTING, ANALYTICS, INFRASTRUCTURE, DEVELOPER. Each declares: OBJECTS CONSUMED, OBJECTS PRODUCED, READ PERMISSIONS, WRITE/EFFECT PERMISSIONS, PROVIDER CONNECTIONS, COMPUTE REQUIREMENTS, STORAGE REQUIREMENTS, SCHEDULES, COST MODEL, SIDE EFFECTS, REVOCATION/UNINSTALL BEHAVIOR. TenantOS provisions dependencies. CapabilityAuthority bounds actions. Mission Control exposes the capability. This is future optionality without architectural explosion.

The owner should not approve every harmless operation forever. Authority should scale with consequence. READ PUBLIC OBJECT: automatic. RENDER OWNER-VERIFIED FACT: automatic. PROPOSE SITE CHANGE: automatic proposal. APPLY LOW-RISK OWNER-PREAUTHORIZED SITE CHANGE: policy-dependent. SEND EXTERNAL MESSAGE: bounded grant/policy. SPEND MONEY: explicit bounded grant/approval. CHANGE INFRASTRUCTURE: explicit approval until trusted policy exists. DELETE CANONICAL DATA: extremely constrained. This is how Mission Control becomes leverage rather than approval fatigue. Not by opaque personality profiling. By durable explicit operational preferences: approved capabilities, rejected proposals, owner corrections, preferred channels, business priorities, risk tolerance settings, visibility decisions, working hours, budget constraints. These become evidence-backed tenant preferences. Then agents stop asking the same question repeatedly.

An action without outcome observation teaches nothing. For important actions record: INTENT, HYPOTHESIS, ACTION, EFFECT, OUTCOME WINDOW, OBSERVATION, ASSESSMENT. Examples: website change → quote requests. content artifact → qualified visitors. creator collaboration → conversions. CRM follow-up → booked appointment. infrastructure migration → cost/reliability. Over time Mission Control knows not only: WHAT HAPPENED but: WHAT TENDS TO WORK FOR THIS TENANT. That is the 10,000X leverage path.

### CRITICAL. THIS IS THE OPTIONALITY MAP. NOT THE NEXT COMMIT LIST.

The next implementation work should be the SMALLEST seams that increase current leverage.

CURRENT ORDER:
- P0: promote proven gateway image safely.
- P0: add immutable tenant context to proposal creation + approval invariant.
- P0: provision exact minimal capabilities needed for current proof.
- P1: wire opportunity semantics using existing Claim/Knowledge/Mission machinery.
- P1: add capability grant/revoke event vocabulary if existing events cannot represent it.
- P1: deterministic JSON-LD projection from FYD verified objects.
- P1: surface these through EXISTING Mission Control instead of another UI.
- P2: Proof Graph behavior: object → problem → claim → evidence → audience.
- P2: claim inventory + contradiction check.
- P2: one market-observation adapter. NOT FOUR. Choose the one that answers a real current question.

PING is Tenant Zero. Operate our own: FYD, development, MarketingOS, infrastructure, content, experiments through the same primitives we intend customers to use. Mission Control should eventually show: WHAT PING KNOWS, WHAT PING IS DOING, WHAT NEEDS NOLAN, WHAT PING RECOMMENDS NEXT.

If we need a secret spreadsheet or another dashboard to understand something important: MISSION CONTROL HAS A CONTINUITY GAP.

A plumber should NEVER need to understand: ClaimWorker, KnowledgePromoter, MissionRuntime, Ed25519, MCP, JSON-LD, tenant grants. They should experience: FYD understands my business. FYD keeps it accurate. FYD tells me what needs attention. FYD finds opportunities. FYD prepares the work. FYD asks when the decision matters. FYD executes what I authorize. FYD shows me what happened. FYD gets better. THAT IS THE PRODUCT.

An engineer should be able to trace: OWNER INTENT → STRUCTURED INTENT → OBJECT/CLAIM → EVIDENCE → PROPOSAL → CAPABILITY → TENANT ENTITLEMENT → MISSION → RUN → EXECUTION → EFFECT → VERIFICATION → EVENT → OUTCOME → LEARNING. ONE WORLD. NO HIDDEN SECOND WORKFLOW.

HARVEST COMMODITY CAPABILITY. OWN CONTINUITY. Use vendors for: analytics, creator data, search intelligence, AI-answer observations, email transport, payments, cloud compute, storage, models. PING owns: tenant identity, object semantics, relationships, evidence, owner intent, capabilities, authorization, event history, outcomes, portable continuity. THAT IS THE LINE.

DO NOT BUILD THE BIGGEST OPERATING SYSTEM. BUILD THE SMALLEST CONTINUITY KERNEL THAT MAKES EVERY NEW CAPABILITY COMPOUND THE VALUE OF EVERYTHING ALREADY CONNECTED.

WEBSITE IS A CAPABILITY. MARKETING IS A CAPABILITY. CRM IS A CAPABILITY. SOCIAL IS A CAPABILITY. VIDEO IS A CAPABILITY. INFRASTRUCTURE IS A CAPABILITY.

THE CUSTOMER SHOULD NOT EXPERIENCE SIX PRODUCTS. THEY SHOULD EXPERIENCE: ONE BUSINESS, ONE IDENTITY, ONE HISTORY, ONE OPERATING ENVIRONMENT, MANY OPTIONAL CAPABILITIES.

MISSION CONTROL IS THE WINDOW. PING IS THE CONTINUITY. FYD IS THE FIRST GREAT EXPERIENCE BUILT ON IT.

PROMOTE THE PROVEN GATEWAY. BIND TENANT AT PROPOSAL CREATION. KEEP FAIL-CLOSED CAPABILITIES. THEN BUILD THE NEXT SMALLEST COMPOUNDING SEAM. GO.

---

## Pushback on "Mission Control is the ultimate continuity substrate" (Nolan, binding correction, ~17:44 MDT)

Do not let the team encode that literally. The continuity substrate is the tenant's canonical objects + relationships + evidence + capabilities + events/history + private context + outcomes. Mission Control is the operating environment over it. That distinction is what lets you replace the entire Mission Control frontend five years from now without losing the business.

## Ecosystem posture (Nolan, binding)

Own the state that must survive vendors. Rent/harvest the intelligence that doesn't. Creator-intelligence providers already expose huge maintained datasets (Modash 250M+ discovery profiles, Upfluence 14M+ profiles + workflow data via API/MCP) — irrational for PING to rebuild commodity creator databases. PostHog/Ahrefs are observation providers, not authorities.

## Filing note (Pigi)

Filed from the "Fix FYD oval rotation and shapes" side chat. The P1/P2 items above are explicitly the optionality map, NOT the next commit list. Current commit order = the three P0s only. CEO-ORDER-FOCUS-THE-SYSTEM-2026-09-30.md (filed ~17:05 MDT) is superseded as the active directive by this order where they conflict; the earlier order's executed P0s stand.
