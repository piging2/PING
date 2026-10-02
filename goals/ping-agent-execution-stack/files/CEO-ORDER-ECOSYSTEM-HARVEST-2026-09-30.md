# CEO ORDER — PING/FYD ECOSYSTEM HARVEST DIRECTIVE (2026-09-30 ~18:08 MDT, Nolan, binding, filed verbatim)

## Framing (Nolan)

Keep going, but turn "harvest" into a disciplined ecosystem reconnaissance program, not a dependency shopping spree.

The current direction is stronger than "build FYD." It is now explicit that the durable product is:

**evidence-backed digital twin → owner-controlled truth → generated experiences → concierge → capabilities → actions → outcomes.**

The MarketingOS forensic work gives an unusually good starting point: it already found a single canonical event writer, centralized event identity, live mission runtime, ClaimWorker, and KnowledgePromoter. More importantly, its 18-arrow walkthrough found **no need for another foundational authority or store**; the remaining gaps were labels, vocabularies, producers, durable approval recording, and bounded behaviors.

## Repository check (Nolan, before making the call, binding)

Current remote truth is asymmetric: `piging2/fyd` is still unavailable to the connected GitHub view, so **FYD remote state remains UNVERIFIED**; `piging2/PING` is visible; `ngesk2/crx-runtime` is visible. That does not supersede the much fresher Pig-local served-path evidence. The crew must continue distinguishing remote, local worktree, integrated, deployed, and served state.

---

# THE DIRECTIVE (send to crew)

> **PING / FYD — ECOSYSTEM HARVEST DIRECTIVE**
>
> KEEP BUILDING, BUT BEGIN A DEEP READ-ONLY HARVEST SWEEP IN PARALLEL.
>
> **DO NOT INSTALL THINGS. DO NOT ADD DEPENDENCIES. DO NOT CREATE AUTHORITIES. DO NOT CREATE STORES. DO NOT START A REWRITE.**
>
> The objective is to understand the best available software well enough that we know what FYD/PING should own, what it should wrap, what it should learn from, and what it should never build.
>
> Before evaluating any external primitive, search FYD, PING and the CRX mine first.
>
> For every candidate report exactly:
>
> `PRODUCT NEED → FYD CURRENT IMPLEMENTATION → PING EXISTING IMPLEMENTATION → CRX HARVESTABLE IMPLEMENTATION → EXTERNAL IMPLEMENTATION → REACHED/UNREACHED → DUPLICATION RISK → SECURITY/TRUST BOUNDARY → SMALLEST DELTA → ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE`
>
> **HARVEST MEANS UNDERSTAND EVERYTHING. IT DOES NOT MEAN INTEGRATE EVERYTHING.**
>
> Run parallel reader lanes across these domains:
>
> 1. **ACQUISITION / WEB UNDERSTANDING** — Crawl4AI, Firecrawl, Browserbase, Playwright, Lightpanda, Scrapy and strong structured-extraction systems. Study crawl planning, dynamic escalation, extraction, anti-bot behavior, cache/revalidation, provenance, robots/policy handling, SSRF defenses, redirect/DNS rebinding, download limits and browser isolation. Compare every useful primitive against FYD's existing HTTP/browser acquisition path. We want the minimum code between URL and trustworthy evidence.
>
> 2. **DIGITAL-TWIN / KNOWLEDGE REPRESENTATION** — study mature entity-resolution, knowledge-graph, provenance and semantic-model systems. We are looking specifically for patterns that improve `OBSERVATION → EVIDENCE → CLAIM → OBJECT → RELATIONSHIP → OWNER DECISION`, not generic graph databases. Find entity stitching, temporal facts, conflicting-source representation, confidence, provenance and reversible merges. **Do not replace Postgres or create another truth store.**
>
> 3. **AGENT / EXECUTION RUNTIMES** — OpenHands, Temporal-style durable execution concepts, LangGraph where genuinely useful, Microsoft Agent Framework/AutoGen patterns, PydanticAI, Mastra, CrewAI and other serious runtimes. Extract only execution primitives: resumability, leases, idempotency, work claims, tool isolation, approval interrupts, typed results, receipts, reconciliation after ambiguous effects and worker-location independence. Compare against MissionRuntime, WorkerRuntime, ORCA and WorkOrders. **One brain, many hands.**
>
> 4. **PERMISSIONS / AUTHORIZATION / POLICY** — study Zanzibar/OpenFGA/SpiceDB/Cedar/OPA-style ideas, capability-security systems and modern OAuth/MCP authorization patterns. We need lessons for principal→tenant→capability→effect, revocation, delegation, attenuation and explainable denial. Do not introduce another policy engine unless the reached PING capability system is proven incapable.
>
> 5. **CMS / VISUAL EDITING / GENERATED EXPERIENCES** — Puck, Payload, Sanity, Builder-style systems, block editors and schema-driven page builders. Assume their generic editing machinery is commodity. Determine exactly what we can avoid building. FYD's SiteSpec remains IR and truth remains upstream. An editor may manipulate SiteSpec; **it never owns business truth.**
>
> 6. **LOCAL-FIRST / COLLABORATIVE STATE** — Automerge, Yjs and related systems. Reader only. Determine what constraints we should preserve today so future simultaneous owner/agent/offline SiteSpec editing remains possible. No CRDT integration now.
>
> 7. **PROTOCOL / FEDERATION / AGENT INTEROP** — MCP, ATProto/Lexicons, ActivityPub and Nostr. Extract schema evolution, capability discovery, typed operations, identity references, permission patterns and replaceable adapters. Do not implement protocols just because they are interesting.
>
> 8. **SEARCH / RETRIEVAL / MEMORY** — study mature hybrid retrieval, graph retrieval, reranking and evidence-aware search. Compare to existing KnowledgeGraph + HybridSearch + Qdrant. The question is not "what vector database should we use?" It is "what improves Ask FYD's evidence-bound answer quality without creating RAG theater?"
>
> 9. **MARKETING / GROWTH INTELLIGENCE** — study serious experimentation, attribution, audience research, social analytics, content intelligence and campaign systems. Harvest schemas, statistical methods, experiment design, metric normalization and feedback loops. **Do not import their product architecture.** MarketingOS must remain missions and projections over PING's existing truth substrate.
>
> 10. **OBSERVABILITY / EVENT SYSTEMS / REPLAY** — study mature event sourcing, OpenTelemetry semantics, durable workflow histories and deterministic replay systems. Look specifically for lessons that strengthen correlation vs causation vs persistence order vs semantic identity, reconstructive replay, runtime manifests and source→build→deployment→process→served certification. No second event spine.
>
> Every lane must answer one additional question:
>
> **WHAT CODE CAN WE DELETE OR NEVER WRITE BECAUSE THIS ECOSYSTEM ALREADY SOLVED THE COMMODITY PART?**
>
> That is a first-class harvest result.
>
> Do not return a 500-project catalog. Produce a **HARVEST MAP** with only:
>
> **UNWIRED GOLD** — capability we already possess but have not reached.
>
> **EXTERNAL GOLD** — external primitive that can eliminate meaningful commodity code.
>
> **PATTERN GOLD** — design worth stealing without taking dependency.
>
> **DUPLICATION TO KILL** — existing internal implementations competing for one semantic job.
>
> **REJECTED** — attractive technology that would contaminate authority, duplicate truth, add unjustified operational weight, or solve an unreached problem.
>
> **OPTIONALITY TO PRESERVE** — choices we should not implement now but should avoid architecturally foreclosing.
>
> Reader concurrency can be high. **Writer concurrency does not increase.** Current product owners keep their mutation surfaces.
>
> No external harvest gets writer time unless it maps to a reached product arrow or demonstrably eliminates code required by the next reached arrow.
>
> And remember the economic split:
>
> **COMMODITY — crawl, browser, CMS, visual editor, model, agent transport, generic workflow mechanics, generic protocol plumbing.**
>
> **OWN — evidence semantics, entity resolution, owner correction history, relationship graph, capability binding, concierge context, outcome learning and the accumulated customer digital twin.**
>
> The moat is the compounding record:
>
> `EVIDENCE + RESOLVED OBJECTS + OWNER DECISIONS + RELATIONSHIPS + CAPABILITIES + INTERACTIONS + OUTCOMES`.
>
> The website is one projection. MarketingOS is one operating loop. Mission Control is one operating environment. None of them owns the substrate.
>
> **SEARCH → UNDERSTAND → COMPARE → FALSIFY → HARVEST.**
>
> Not:
>
> **SEARCH → GET EXCITED → INSTALL.**
>
> KEEP THE ACTIVE FYD LOOP MOVING WHILE READERS DO THIS.
>
> `ASK FYD → EVIDENCE → OWNER CORRECTION → PERSISTENCE → CONVERSATIONAL CHANGE → APPROVAL → APPLY → REOBSERVE → REGENERATE → OWNER INTENT SURVIVES`.
>
> Once a real business owner can repeatedly traverse that loop, their failures outrank architecture speculation.

## The negative roadmap (Nolan, binding addition)

Create a **negative roadmap** from this harvest. The existing directive already says the moat is not crawling, rendering, CMS, visual editing, LLMs, agent transport, or social protocols. Turn that into an explicit **"FYD WILL NOT BUILD"** ledger. Every mature commodity system studied should either remove something from the future backlog or prove why FYD genuinely needs a differentiated implementation.

That is how the ecosystem search produces leverage instead of another research archive.

---

## Filing note (Pigi)

Filed from the "Fix FYD oval rotation and shapes" side chat on 2026-09-30 ~18:08 MDT. Dispatched as a read-only harvest sweep: one coordinator fanning out 10 reader lanes, synthesizing the HARVEST MAP plus the "FYD WILL NOT BUILD" ledger. No writer time, no installs, no new dependencies. Nolan ended the message with "ASK QUESTIONS" — questions are in the side-chat reply, not in the crew send.

---

# ADDENDUM — HARVEST FOR OPTIONALITY (2026-09-30 ~18:15 MDT, Nolan, binding, filed verbatim)

## Nolan's answers to the three execution questions

1. FYD WILL NOT BUILD ledger: ENFORCED living checklist, not an absolute prohibition list.
2. INTELLIGENCE_RESEARCH P0: keep INDEPENDENT. Do not make its acceptance test depend on harvest completion.
3. Duplication: RECOMMENDATION + FALSIFICATION THREADS, not autonomous deletion.

## The reframing (Nolan)

The harvest is not primarily about choosing libraries for a website builder. It is about buying optionality. We want to discover which layers of PING/FYD are genuinely differentiated and ruthlessly outsource the commodity layers.

Current ecosystem research supports that. Sanity's 2026 Visual Editing architecture maps rendered values back to exact source documents/fields with Content Source Maps, including stable keyed selectors that survive array reordering; it also supports direct page-section reordering. Sanity.io Builder now indexes a design system once for its agent, visual editor, and insert menu. Builder.io Vercel's v0 can work against private registries while keeping registry credentials out of model context and sandbox files. Those are important signals for the architecture we want.

On acquisition: Crawl4AI just shipped 0.9.4, but notably as a security release fixing SSRF and environment-variable disclosure paths. If FYD accepts arbitrary customer URLs, acquisition is itself a serious trust boundary; harvesting the crawler does not mean handing it unrestricted network access.

## Instructions to the harvest coordinator (Nolan, verbatim)

FYD / PING — HARVEST FOR OPTIONALITY
KEEP FANNING OUT THE READERS.
DO NOT START CONVERGING EVERYTHING YET.
THE PURPOSE OF THIS HARVEST IS NOT: "FIND MORE FEATURES TO BUILD."
THE PURPOSE IS: IDENTIFY WHAT THE WORLD HAS ALREADY COMMODITIZED SO WE CAN FIND THE SMALLEST PART OF PING/FYD THAT ACTUALLY DESERVES TO EXIST.

### 1. FYD WILL NOT BUILD LEDGER

YES: MAKE IT A LIVING ENFORCED CHECKLIST.
But NOT an absolute prohibition list.
Each entry needs:
CAPABILITY
EXISTING SOLUTION(S)
WHY COMMODITY
HARVEST/ADAPTER STRATEGY
EXCEPTION CRITERIA
LAST VERIFIED
OWNER.
Before proposing a new subsystem: CHECK THE LEDGER.
If the capability is listed: DEFAULT = HARVEST / WRAP / ADAPT.
Building internally requires explicit evidence that existing solutions fail a FYD requirement.
This prevents: "we forgot the library existed"
while still allowing: "we tested it and it cannot satisfy the invariant."

KEEP IT INDEPENDENT.
Do NOT make its acceptance test depend on harvest completion.
That would contaminate two experiments.
INTELLIGENCE_RESEARCH must prove: REAL QUESTION → REAL RESEARCH → SOURCES → SYNTHESIS → EVIDENCE → RESULT.
The harvest sweep separately evaluates ecosystem capabilities.
Later: compare what INTELLIGENCE_RESEARCH built against what the harvest found. That comparison may reveal duplication. GOOD. Do not bias the P0 in advance.

DO NOT ALLOW READERS TO DELETE OR REWRITE OWNED SURFACES.
BUT recommendation-only is slightly too passive.
Use: READER FINDS DUPLICATION ↓ HARVEST MAP ENTRY ↓ FALSIFICATION THREAD ↓ OWNING LANE RESPONDS WITH EVIDENCE ↓ CONSOLIDATE DECISION ↓ KEEP / WRAP / MERGE / RETIRE / DELETE.
Readers MAY open read-only falsification threads directly with owning lanes. They MAY NOT modify that lane.
This avoids both failure modes: research archive nobody reads AND research agent deleting architecture it does not understand.

DO NOT ASK: "WHAT IS THE BEST WEBSITE BUILDER ARCHITECTURE?"
ASK: "WHAT IS THE MINIMUM FYD SUBSTRATE THAT PRESERVES MAXIMUM FUTURE OPTIONALITY?"
Today we think the answer may be: EVIDENCE ↓ CLAIMS ↓ OBJECTS ↓ RELATIONSHIPS ↓ OWNER INTENT ↓ CAPABILITIES ↓ TRANSITIONS ↓ OUTCOMES.
Everything above that may be projection: WEBSITE / SOCIAL / MOBILE / CIRCLE / FEED / SEARCH / CONCIERGE / CAMPAIGNS / MCP / ACTIVITYPUB / ATPROTO / NOSTR / FUTURE INTERFACES.
Do not constitutionalize this merely because it sounds elegant. HARVEST TO FALSIFY IT.

The strategic reason for PING is NOT cryptography. It is NOT replay. It is NOT objects. It is NOT agents. Those are mechanisms.
The reason is: WE DO NOT KNOW WHAT THE DOMINANT HUMAN/AI INTERFACE WILL BE IN FIVE YEARS. It might be: websites, apps, AI assistants, ambient agents, social feeds, AR, voice, protocol-native clients, something we haven't named.
Therefore the valuable asset cannot be today's UI.
The durable asset should be: WHAT THE ENTITY IS / WHAT WE KNOW ABOUT IT / WHY WE BELIEVE IT / WHAT IT OWNS / HOW IT RELATES TO OTHER THINGS / WHAT THE OWNER WANTS / WHAT ACTIONS ARE ALLOWED / WHAT ACTUALLY HAPPENED.
Then interfaces become replaceable. THAT is optionality.
The website builder is our first excellent PRODUCT EXPRESSION. But if FYD becomes: HTML generator + CMS, we lose.

The deeper compiler should be: MESSY DIGITAL WORLD ↓ OBSERVATIONS ↓ EVIDENCE ↓ CLAIMS ↓ OBJECT GRAPH ↓ OWNER INTENT ↓ EXPERIENCE SPECIFICATIONS ↓ CHANNELS.
Today: ExperienceSpec → website. Tomorrow: ExperienceSpec → mobile.
Another compiler: ObjectGraph → ActivityPub. Another: ObjectGraph → ATProto. Another: ObjectGraph + capabilities → MCP. Another: ObjectGraph + relationships → campaign audience. Another: ObjectGraph + evidence → concierge context.
ONE semantic substrate. MANY projections.

Current Sanity architecture has a very important idea: CONTENT SOURCE MAPS. Rendered values can retain a mapping back to: SOURCE DOCUMENT + SOURCE FIELD. Its visual editing layer then turns the rendered experience into a portal back to the underlying structured source.
HARVEST THE PATTERN.
FYD has something potentially stronger: RENDERED VALUE ↓ OBJECT FIELD ↓ CLAIM ↓ EVIDENCE ↓ OBSERVATION ↓ EXTERNAL SOURCE.
This can power BOTH: EDIT THIS and: WHY THIS?
Do not copy Sanity's datastore. Harvest: SOURCE MAPS THROUGH THE RENDER PIPELINE.
We already have a Binding Verifier. Good. Investigate whether FYD's render model should carry a generalized SourceBinding: render node → object field → evidence refs. Then the renderer cannot casually invent factual content because factual render nodes require bindings.
GENERATED PRESENTATION COPY is allowed. But it must be typed differently. Conceptually: FACTUAL / DERIVED / GENERATED / OWNER_AUTHORED. Do not blindly implement these exact names. Harvest existing semantics first.

Builder's current architecture increasingly centers the design system as shared knowledge for: AGENT / VISUAL EDITOR / INSERT MENU. That is correct.
FYD should not let an agent invent arbitrary frontend components every time. We want: FYD COMPONENT REGISTRY + DESIGN TOKENS + COMPONENT CONSTRAINTS available to: SITE PLANNER / OWNER EDITOR / AGENT / RENDERER. ONE vocabulary. This prevents generated-site entropy.

v0 is demonstrating another important boundary: AI can work against existing private component/package registries without needing the credentials in model context. HARVEST THE PRINCIPLE: AGENT CAN USE CAPABILITY WITHOUT POSSESSING SECRET. That maps directly to PING. Agent does not need: database password / provider token / deployment key. Agent receives: capability. Trusted executor owns secret. This is a very important future optionality boundary.

Payload's preview/live-preview model is worth studying for: DRAFT / PREVIEW / PUBLISHED separation. FYD will eventually need at least conceptually: CURRENT PUBLIC EXPERIENCE vs PROPOSED EXPERIENCE. Agent edits should not mutate the public site merely because the preview looks good. Harvest preview mechanics. Do not automatically adopt Payload as FYD's content authority.

Automerge is active; current JS release line is 3.4.x. Investigate for ONE future problem: MULTI-PARTY / OFFLINE OWNER EDITING. Do NOT integrate it now. Question: Could SiteSpec/owner customization eventually become local-first without changing the canonical PING substrate? If yes: GOOD OPTIONALITY. Record seam. No implementation.

MCP 2026-07-28 now has a stateless protocol core, cacheable capability lists, stronger authorization mechanics and extensions. That strengthens our decision: DO NOT INVENT A GENERAL EXTERNAL AGENT PROTOCOL. Future: PING CAPABILITY ↓ MCP ADAPTER ↓ AGENT/TOOL. PING owns semantics and authorization. MCP owns interoperability.

CURRENT 0.9.4 IS A SECURITY RELEASE. Recent fixes include SSRF paths and an untrusted-configuration path that could expose server environment variables. THIS MATTERS DIRECTLY TO FYD. Our onboarding accepts: A URL FROM A USER. That means acquisition is a SECURITY BOUNDARY. Any crawler/browser FYD adopts must be constrained against: localhost / private networks / cloud metadata / redirect-to-private / DNS rebinding / file URLs / unexpected schemes / oversized responses / unbounded crawl depth / unbounded browser execution. DO NOT let the acquisition worker share the trusted application network plane. This is not theoretical. Recent crawler vulnerabilities demonstrate the class. Do not choose one crawler forever. Define the acquisition outcome. Something conceptually like: AcquireRequest → URL + policy; AcquireResult → observations + evidence + diagnostics. Then implementations can evolve: HTTP / Crawl4AI / Playwright / Lightpanda / future service. FYD owns: POLICY / RESULT SEMANTICS / PROVENANCE. Crawler owns: FETCHING. That is optionality.

The crucial thing to harvest now is NOT another visual editor. It is the right intermediate representation. We currently have SiteSpec. Attack it. SiteSpec should be expressive enough to represent: PAGES / SECTIONS / OBJECT QUERIES/REFERENCES / COMPONENTS / DESIGN TOKENS / CAPABILITY BINDINGS / OWNER OVERRIDES / SOURCE BINDINGS. It should NOT contain: arbitrary executable JavaScript / provider secrets / database queries / customer-specific React / canonical business truth. If SiteSpec stays this clean: we can replace React later. We can render: HTML / native mobile / email / PDF / embed / future surfaces. THAT is optionality.

For the earlier media question: DEFAULT: INGEST PUBLIC BUSINESS MEDIA INTO FYD'S MEDIA PIPELINE WHEN LEGITIMATELY PERMITTED FOR THE OWNER'S DEMO/CONNECTED SOURCE. Preserve: ORIGINAL SOURCE URL / OBSERVED_AT / DIGEST / MIME / DIMENSIONS / LICENSE/RIGHTS BASIS WHERE KNOWN / DERIVATIVE RELATIONSHIP. Serve optimized derivatives from FYD. Do NOT make permanent copies of arbitrary third-party media merely because it was publicly accessible. Owner-connected/owned source: local derivative caching is appropriate subject to source rights. Unknown third-party source: prefer reference/hotlink or omit until rights are established. Do not turn the renderer into an uncontrolled image proxy.

DO NOT FAKE AUTHORIZATION SEMANTICS. For the current demo: an explicit DEMO OWNER MODE is acceptable ONLY if: visibly marked / dev/demo only / cannot be mistaken for production auth / events identify it as demo authority / production code fails closed without real owner authentication. Do not block product discovery on full identity UX. But do not quietly turn a demo toggle into authorization architecture.

VISITOR ASK FYD SHOULD BE FULLY EVIDENCE-BOUNDED. Not artificially narrow. Let the visitor ask broad questions. The system may answer only from: PUBLIC AUTHORIZED OBJECT GRAPH + PUBLIC EVIDENCE + SAFE DERIVATIONS. When unsupported: SAY IT DOES NOT KNOW. That behavior is part of the product. The impressive demo is not: AI answers everything. It is: AI KNOWS WHAT IT KNOWS.

Keep: MOBILE UX / CONTACT DISCOVERABILITY / SERVICE DISCOVERABILITY / PERFORMANCE. ADD TWO MORE: TIME TO TRUST and TIME TO CHANGE. Because those are where FYD can be structurally different. Measure: TIME TO TRUST: How quickly can the owner understand why FYD displayed something? TIME TO CHANGE: How quickly can owner go from: "move emergency service first" to: approved correct live result? Traditional builders compete extremely well on appearance. FYD should compete on: UNDERSTANDING / TRUST / CHANGE.

THE PIPELINE MUST NOT OWN THAT DECISION. The pipeline may propose a safe default. Owner owns publication intent. Model: OBSERVED VALUE (street address) / SOURCE VISIBILITY (public website) / FYD DEFAULT (withhold precise personal address / show legitimate business address according to object type + policy) / OWNER OVERRIDE (SHOW / HIDE). The override belongs in OWNER INTENT / VISIBILITY POLICY. Not in the source observation. Never mutate the evidence merely because the owner hides the field. Evidence says: source contained X. Presentation policy says: do not show X. Those are different truths.

NOT THE RENDERER. NOT THE LLM. NOT A HUMAN EYEBALL. The architecture should have ONE binding contract at the projection boundary. Existing Binding Verifier is the candidate. Its invariant should become: EVERY FACTUAL PUBLIC RENDER VALUE MUST HAVE A VALID BINDING TO AN AUTHORIZED GRAPH VALUE/EVIDENCE BASIS. Generated non-factual presentation language must be explicitly classified and cannot masquerade as evidence-backed fact. Therefore: OBJECT GRAPH + EVIDENCE + VISIBILITY + OWNER INTENT ↓ PROJECTION / BINDING VERIFICATION ↓ RENDER MODEL ↓ DUMB RENDERER. The renderer should not decide truth. It renders an already authorized projection.

DO NOT MAKE "WHY THIS?" THE PRIMARY PRODUCT. The owner probably does NOT wake up wanting provenance visualization. The owner wants: GET ME CUSTOMERS / KEEP THIS CORRECT / MAKE CHANGES EASY. WHY THIS is trust infrastructure. It appears when needed: "Why does it say this?" / "Where did you get these hours?" / "Why is this person listed?" That is enormously valuable when something is wrong. So: WHY THIS = SUPPORTING TRUST CAPABILITY. NOT primary CTA.

YES. The stronger invariant is: same ObjectGraph + OwnerIntent + SiteSpec version + Renderer version + ViewerContext class → same semantic RenderModel. Do NOT require byte-identical browser DOM. Framework internals may add irrelevant differences. Canonicalize the SEMANTIC render model. Exclude: timestamps / ephemeral IDs / request IDs / hydration artifacts. Then hash it. This gives us deterministic regeneration without coupling PING to React's implementation details.

AGREED. DO NOT SOLVE: "both sites look similar" with: "make AI more creative." Start with deterministic eligibility. Example: Business exists → BusinessSummary eligible. Service count > 0 → Services eligible. Location count > 0 → Locations eligible. Person relationship exists → People eligible. Recent content exists → Recent eligible. Then OWNER INTENT controls: priority / hide/show / featured objects. AI may propose: ordering / copy / grouping / presentation. It should NOT decide whether nonexistent data exists. This creates a clean boundary: SOFTWARE DECIDES WHAT IS TRUE/POSSIBLE. INTELLIGENCE PROPOSES HOW TO PRESENT IT.

If the harvest validates it, FYD should converge toward:
LAYER 0 OBSERVATION / EVIDENCE
LAYER 1 OBJECT / RELATIONSHIP
LAYER 2 OWNER INTENT / VISIBILITY
LAYER 3 CAPABILITY / AUTHORIZATION
LAYER 4 EXPERIENCE IR (SiteSpec / future FeedSpec / CampaignSpec)
LAYER 5 PROJECTION ADAPTERS (Web / Mobile / ActivityPub / ATProto / MCP / etc.)
LAYER 6 INTERACTION / OUTCOME EVIDENCE.
AI can operate ACROSS layers. AI owns NONE of them. That is the architecture that preserves optionality.

HARVEST SHOULD TRY TO DISPROVE THIS: FYD'S MOAT IS NOT THE WEBSITE BUILDER. IT IS THE COMPOUNDING ENTITY MODEL: WHAT YOU ARE + WHAT YOU OWN + WHAT THE WORLD SAYS ABOUT YOU + WHAT YOU CONFIRMED + HOW YOU WANT TO PRESENT YOURSELF + WHO/WHAT YOU RELATE TO + WHAT HUMANS/AGENTS MAY DO + WHAT ACTIONS ACTUALLY WORKED. Then: WEBSITE BUILDER becomes one application. SOCIAL becomes another. CONCIERGE becomes another. MARKETING becomes another. AGENT AUTOMATION becomes another. That is why the data/authority layer matters.

If the ten reader lanes discover that mature systems already provide: evidence provenance / identity resolution / object graph / owner intent / capabilities / cross-channel projection / outcome history as one coherent lightweight substrate: REPORT IT. DO NOT PROTECT PING FROM THE EVIDENCE. Likewise, if Postgres + a small set of libraries can replace 80% of the current architecture: REPORT IT. The harvest exists to discover that.

KEEP ASKING QUESTIONS. Each reader should finish with: WHAT DID WE THINK WE NEEDED TO BUILD? / WHAT ALREADY EXISTS? / WHAT IS COMMODITIZED? / WHAT REMAINS UNSOLVED? / WHAT SHOULD FYD HARVEST? / WHAT SHOULD FYD NEVER BUILD? / WHAT EXISTING PING CODE IS NOW DUPLICATIVE? / WHAT NEW OPTIONALITY DOES THIS CREATE? / WHAT ASSUMPTION DID THIS FALSIFY? / WHAT ONE EXPERIMENT WOULD SETTLE THE REMAINING QUESTION?

TEN READERS. ONE SYNTHESIS COORDINATOR. CURRENT WRITERS KEEP THEIR OWN SURFACES. Reader findings may open falsification threads. They do not modify code. Only after synthesis: CONSOLIDATE. This protects velocity without turning research into a museum.

I WANT: HARVEST MAP / FYD WILL NOT BUILD LEDGER / OPTIONALITY MAP / DUPLICATION TO KILL / PING PRIMITIVES THAT SURVIVED FALSIFICATION / COMMODITY BOUNDARIES / TOP 10 QUESTIONS STILL UNANSWERED / TOP 5 EXPERIMENTS THAT ANSWER THEM.
Then rank every surviving internal primitive by: PRODUCT VALUE / DIFFERENTIATION / OPTIONALITY CREATED / REPLACEMENT COST / PROOF QUALITY / MAINTENANCE COST. Do not automatically preserve anything because we already built it.

HARVEST WIDELY. CONVERGE SLOWLY. KEEP THE PRODUCT LOOP RUNNING. OUTSOURCE COMMODITY. OWN SEMANTICS. OWN EVIDENCE. OWN USER INTENT. OWN AUTHORIZATION. OWN OUTCOMES. KEEP THE EXPERIENCE LAYER REPLACEABLE.

WE ARE NOT TRYING TO BUILD THE MOST FEATURE-RICH WEBSITE BUILDER. WE ARE TRYING TO BUILD THE SYSTEM THAT CAN BECOME: THE BEST WEBSITE BUILDER / THE BEST SOCIAL PRESENCE / THE BEST BUSINESS CONCIERGE / THE BEST AGENT INTERFACE WITHOUT REBUILDING THE CUSTOMER'S DIGITAL IDENTITY EACH TIME.

KEEP ASKING. KEEP FANNING OUT. HARVEST FIRST. THEN DECIDE WHAT DESERVES TO EXIST.

## Filing note (Pigi)

Addendum filed from the "Fix FYD oval rotation and shapes" side chat on 2026-09-30 ~18:15 MDT. Answers to the three execution questions recorded in AGENTS.md. The harvest coordinator is being steered with the new instructions: harvest-for-optionality framing, enforced-but-not-absolute ledger schema, falsification-thread protocol, the L0-L6 layer model to falsify, source-mapping depth target, acquisition trust boundary, SiteSpec constraints, projection/binding invariant, expanded deliverables, and the primitive ranking criteria.
