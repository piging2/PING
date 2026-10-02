# 99-Hour Focused Convergence Charter — 2026-09-30

Nolan's binding order, ~15:33 MDT. This is NOT another architecture wave.
Mission: MAKE THE EXISTING ECOSYSTEM OPERABLE FROM ONE UI while HARVESTING
the best primitives from the current CRM, GTM, video, content, live-commerce,
analytics, and agent ecosystems. HARVEST → WIRE → REACH → OPERATE.

Parallel lanes continue: the FYD 100-hour product sprint (hour-100
external-owner test mandatory; do not steal its writers) and MarketingOS
sprint 2 (the evidence/learning lane; does not absorb FYD implementation).
Shared primitives that block FYD get priority. Everything else is parallel
convergence.

## Remote truth baseline (Nolan verified before issuing)

- PING canonical repo: 81b3248 ("Initial commit").
- CRX Runtime canonical repo: 6c4b531.
- Canonical FYD repo: 404 through the connected GitHub account.
- The Pig/worktree forensic is materially fresher evidence for
  IMPLEMENTATION, but it is NOT remote/deployed truth. Never conflate
  Pig/worktree state, GitHub state, deployed state, served runtime.

## Starting constraints (verified forensic, not priors)

- PING already has: one canonical ping_events writer, centralized event
  identity, ClaimWorker, MissionRuntime, KnowledgePromoter.
- The MarketingOS loop compounds through existing ping_events,
  ping_missions, knowledge graph, and Qdrant. No new MarketingOS database
  or authority.

## Constitutional rule

SEARCH → HARVEST → WIRE → REACH → VERIFY → PROJECT.
Never SEARCH → ADMIRE → REIMPLEMENT.

Before implementing ANY capability, answer in writing:
1. FYD current implementation
2. PING existing implementation
3. ORCA/TenantOS existing implementation
4. External best-in-class implementation
5. Harvestable primitive
6. Duplication risk
7. Authority risk
8. Smallest required delta
9. Reached product arrow

Then choose: WIRE / HARVEST / ADAPT / REJECT / REFERENCE.

For every new dependency candidate: search PING, search the current
ecosystem, search recent GitHub, read the license, read current releases,
measure integration cost. Then ADOPT / WRAP / HARVEST PATTERN / LEAVE
ALONE. Never "interesting repo → add dependency."

## Architecture synthesis (the destination)

- PING = business intelligence / truth spine.
- ORCA = planner.
- MissionRuntime = durable work.
- WorkerRuntime = interchangeable hands.
- TenantOS = capability/placement reconciler.
- FYD = entity understanding + web/Ask/conversion projection.
- MarketingOS = growth intelligence loop.
- Mission Control = one human operating surface.

Competitive insight: most systems unify marketing software. This system
unifies epistemology + business state + execution + verification + content
+ infrastructure. That only works if we refuse to bury it under 40
duplicate "engines."

Success criterion: not more software — more of the EXISTING software
reachable, intelligible, controllable, and useful from one place.

## Approval gate — AUTHORIZED, do first (0–10)

POST /api/mc/approvals currently permits a self-asserted approver identity
and has already driven a real site change (approval p0prop-ac04480a6d1809fd,
2026-09-28). Gate it before treating any new approvals through that path
as trusted.

- Do NOT create a new IdentityAuthority. Search and reuse the strongest
  EXISTING authenticated identity/signature path.
- Required property: AUTHENTICATED ACTOR → EXACT PROPOSAL DIGEST →
  AUTHORIZATION → APPROVAL EVENT → EFFECT.
- The browser must not be able to choose the authoritative approver by
  sending a string.
- Preserve existing historical evidence; do not rewrite history. Classify
  historical approvals produced through the weak route accurately.
- Smallest delta. Verify served behavior after the gate.

## Mission Control — the one operating surface

Mission Control becomes the identity-owned operating environment. It is a
PROJECTION of owned state, not an authority. One UI does not mean one
database. Do NOT create: TenantOSAuthority, DashboardAuthority,
CRMTruthStore, VideoAuthority, MarketingAuthority, another workflow
engine, another event bus, another agent runtime.

Navigation model (build the shell; expose EXISTING REAL DATA progressively;
NO MOCK NUMBERS; no fake data for any demo):

HOME / FYD (Sites, Objects, Sources, Ask FYD, Owner changes, Publish) /
CRM (People, Companies, Leads, Opportunities, Conversations, Activities) /
MISSIONS (Missions, Runs, Agents, Results, Failures) /
KNOWLEDGE (Claims, Evidence, Questions, Learnings, Playbooks) /
MARKETING (Opportunities, Thesis packages, Content, Campaigns,
Distribution, Outcomes) / MEDIA (Assets, Video projects, Generations,
Renders, Publishing) / APPROVALS (Pending, Approved, Rejected, Effects) /
SYSTEM (Capabilities, Integrations, Health, Event history, Replay).

Do NOT build every screen. Build the shell and wire real data.

Every important card must answer: WHERE DID THIS COME FROM? WHO OWNS IT?
HOW CERTAIN IS IT? WHAT CAN I DO? WHAT REQUIRES APPROVAL? WHAT ACTUALLY
HAPPENED?

Visually distinguish truth states: OBSERVED / DERIVED / INFERRED /
PROPOSED / APPROVED / EXECUTED / VERIFIED / FAILED / UNKNOWN. Never hide
this behind generic green checkmarks.

Extensibility model: OBJECT + VIEWER + CAPABILITIES → UI. The UI renders
only actions the viewer is actually permitted (e.g. a Lead shows READ /
COMMENT / ASSIGN / CONTACT / ARCHIVE only as permitted; a Video shows
VIEW / EDIT_SPEC / GENERATE / APPROVE / PUBLISH only as permitted).
Do not hand-build forms for every object type; harvest schema-driven UI
generation patterns (Twenty, below).

## TenantOS — make the operating model real

TenantOS owns PLACEMENT, not business semantics. PROVIDER ≠ CAPABILITY.
PLACEMENT ≠ IDENTITY. HOST ≠ OWNER.

Pass four operational tests (not a percentage-complete project):
1. Tenant isolation enforced.
2. Authenticated identity (who am I, which tenant).
3. Capability enforcement (what objects can I see, what actions can I
   take, which agents can act, what needs approval).
4. Private/public projection boundaries (what happened, what is private,
   what is public).

Use existing identity/capability/event machinery. Any TenantOS concept
that cannot answer a real product question gets FROZEN.

Deep-harvest Twenty (open-source CRM; objects/fields/views/workflows/
agents as programmable primitives): object definitions, field definitions,
views, relationships, activities, workflows, agents, permissions, custom
objects, layout concepts, timeline/activity UX. Translate useful concepts
into existing PING/FYD primitives; do NOT fork the CRM into PING.

Candidate mapping: PERSON → PING object; COMPANY → PING object;
LEAD → typed object; OPPORTUNITY → typed object; ACTIVITY →
event/projection; RELATIONSHIP → generic relationship; CUSTOM FIELD →
schema extension; VIEW → projection/query; WORKFLOW → mission/action plan
where appropriate.

## CRM — a projection, not a 1998 contact database

Build the smallest CRM projection necessary over PING's
entity/relationship/evidence machinery. The modern primitive:
ENTITY → RELATIONSHIP → INTERACTION → SIGNAL → INTENT → OPPORTUNITY →
ACTION → OUTCOME.

The CRM must ultimately be another VIEW OF THE OBJECT GRAPH, not another
universe. External CRM/GTM systems are providers/sensors/executors, not
sovereign replacements unless explicitly decided later.

Lead proof (FYD visitor "I need an estimate"): VISITOR INTENT → LEAD/
REQUEST OBJECT → relationship to BUSINESS → relationship to SERVICE →
evidence/source → owner notification → CRM projection. Mission Control
shows: NEW LEAD — WHO, WHAT THEY WANT, WHICH FYD NODE, WHICH SERVICE,
WHEN, SOURCE, EVIDENCE, STATUS, NEXT ACTION.

## ORCA — served execution, not dashboard theater

ORCA becomes the cross-domain planner over the SAME mission/execution/
evidence system: MISSION → AUTHORIZATION → EXECUTION → RESULT → EVIDENCE →
VERIFICATION. Find the shortest route from current MissionRuntime/
ExecutionAuthority machinery to a REAL served execution. Do not resurrect
autonomous-loop theater. Do not create another scheduler or another
execution authority.

"Finished enough" = an authorized mission can actually execute, produce
evidence, and be inspected from Mission Control.

Harvest current LiteLLM for the weak model-routing layer: provider
normalization, fallback, budgeting, usage accounting, semantic MCP tool
search, local/heuristic routing, guardrails, multi-tenant entitlements,
telemetry. BENCHMARK current router vs LiteLLM (latency, failure handling,
provider breadth, cost accounting, tenant isolation, tool routing,
operational complexity). HARVEST/WRAP only if it removes real work; do not
blindly migrate.

## Knowledge — fix retrieval, it is a real defect

Interrogation found: knowledge nodes exist, edges effectively absent,
learning does not feed future behavior. Do NOT invent "MemoryAuthority."
Connect existing durable knowledge into retrieval with the minimum useful
graph: CLAIM → SUPPORTED_BY → EVIDENCE; CLAIM → CONTRADICTED_BY →
EVIDENCE; QUESTION → ANSWERED_BY → CLAIM; LEARNING → DERIVED_FROM →
OUTCOME; PLAYBOOK → SUPPORTED_BY → LEARNING. Then prove ONE future
mission actually retrieves useful prior knowledge. If nothing consumes the
knowledge: STOP WRITING MORE KNOWLEDGE.

## Signals — the most important harvest

MarketingOS becomes a radar system. Signals feed (eventually): website
intent, repeat visitor behavior, Ask FYD questions, owner/customer
questions, repo changes, competitor changes, social mentions,
Reddit/YouTube discussions, search demand, product usage, pricing-page
activity, email response, sales conversations, support problems, content
performance, comment counterexamples, technical ecosystem releases.

Law: SIGNAL ≠ FACT ≠ INTENT ≠ AUTHORIZATION. A signal remains an
observation until evidence, authority, and authorization say otherwise.

## Video — first-class compilation target, not canonical truth

The evidence package is the canonical creative object, not the MP4.
Chain: EVIDENCE PACKAGE → thesis → script → atomic claims → storyboard →
shot plan → source footage / generated footage → narration → captions →
diagrams/code captures → long master → clip candidates → channel
derivatives → transcript verification → claim verification → human
approval → distribution → metrics → learning.

VideoSpec (durable, provider-neutral): PURPOSE, AUDIENCE, CLAIMS,
EVIDENCE, SCENES, SCRIPT, VOICE, ASSETS, PRODUCT/SERVICE REFERENCES, CTA,
ASPECT, TARGET CHANNELS, DISCLOSURES, APPROVAL REQUIREMENTS. Never store
"make a cool plumber TikTok" as the durable representation.

Adapter contract (conceptual): TEXT_TO_VIDEO, IMAGE_TO_VIDEO,
REFERENCE_IMAGES, FIRST_FRAME, LAST_FRAME, EXTEND, AUDIO, ASPECT_RATIO,
DURATION, SEED where supported, PROVIDER_METADATA. Provider replaceable:
Veo today, LTX locally, another tomorrow. The VideoSpec survives.

Deterministic composition for everything software can render exactly:
captions, logos, claim text, prices, CTA, source references, intro/outro,
lower thirds, aspect conversion, timing, audio normalization, final
encode. Never ask a generative model to faithfully render factual text.

Per-asset provenance: SOURCE, DIGEST, RIGHTS BASIS, OWNER,
GENERATED/OBSERVED, MODEL/PROVIDER, PROMPT/SPEC REF, CREATED AT,
DERIVATIVES. Never silently ingest arbitrary web images into commercial
campaigns. Record per generation: provider/model/version,
prompt/instructions, input asset identities, output digest, parameters,
duration/resolution, cost, rights/provenance, parent artifact, human
approval where necessary.

Benchmark BEFORE lock-in: give the same bounded storyboard shots to
candidate providers; evaluate prompt adherence, temporal consistency,
character consistency, text rendering, UI/code-screen suitability,
realism, camera control, audio/dialogue, latency, cost, API reliability,
editability, provenance/safety metadata. Store results as experiment
evidence. Choose providers per shot class, not one universal winner.
The sprint-1 video's 12-shot plan is ready-made benchmark material.

Corrections (binding): OpenAI Sora product discontinued 2026-04-26, API
discontinued 2026-09-24 — do NOT build new PING video infrastructure
around Sora. Remotion's licensing needs review before commercial
embedding (harvest patterns; verify license first). A video-integration
survey already exists at
research_notes/video-generator-integrations-20260930/ (Remotion
recommended for deterministic composition); fold in Veo 3.1 as a
generation candidate and apply the licensing caveat.

Clipping is a compiler stage: long-form automatically yields candidate
moments, ranked by SURPRISE, SELF-CONTAINMENT, CLAIM STRENGTH, EVIDENCE
AVAILABILITY, AUDIENCE RELEVANCE, HOOK DENSITY, VISUAL DEMONSTRABILITY,
FOLLOW-UP POTENTIAL. AI proposes cuts; the artifact/evidence package owns
factual content. Never let a clipping model rewrite claims for virality.
Harvest the OpusClip workflow (clip discovery → captions → reframing →
B-roll → audio enhancement → voiceover → publishing); do not rebuild the
commodity layer.

## Live commerce — read/research lane, human authority first

HUMAN AUTHORITY + AI PRODUCTION + REAL-TIME INTELLIGENCE. Never AI AVATAR
→ endless fake livestreams (trust backlash risk is documented).

Eventual chain: LIVE EVENT → PRODUCT CONTEXT → AUDIENCE QUESTIONS →
CLAIM-SAFE ANSWERS → PRODUCT DEMO CUES → OFFER/CTA → CHECKOUT → CUSTOMER
IDENTITY → FOLLOW-UP → CLIPS → METRICS → LEARNING.

This program: a READ/RESEARCH lane only (TikTok Shop, YouTube Shopping,
Shopify ecosystem, Whatnot, Firework, Bambuser, Channelize, CommentSold).
Model PRODUCT → LIVE SESSION → AUDIENCE → QUESTION → SUPPORTED ANSWER →
DEMO → OFFER → CHECKOUT → ORDER → CUSTOMER → FOLLOW-UP → CLIP → OUTCOME.
Do NOT build a live-shopping platform. Build the object/action seam that
makes it possible. Harvest LiveKit interfaces (do not write WebRTC); wire
only when a real experience needs realtime media. Harvest Shopify
Storefront/Admin patterns (products, variants, media, inventory, cart/
checkout boundaries, webhooks, customer boundaries); FYD renders commerce
objects and hands the transaction to the authorized commerce capability.

## Ecosystem archaeology — harvest sequence

Attio → Clay → Apollo → HubSpot → Veo → OpusClip → TikTok/YouTube/Shopify
live-commerce → Firework/Bambuser. Extract exactly ONE OR TWO primitives
from each. For each product, study (not marketing-page deep): DATA MODEL,
TRIGGER MODEL, AGENT MODEL, PERMISSION MODEL, WORKFLOW MODEL, HUMAN
APPROVAL MODEL, OBSERVABILITY MODEL, REPLAY/RETRY MODEL, CONNECTOR/API/
MCP MODEL, CONTENT MODEL, IDENTITY MODEL, ATTRIBUTION MODEL, LEARNING
LOOP, WHAT THEY DO BETTER THAN PING, WHAT PING DOES BETTER, ONE PRIMITIVE
WORTH HARVESTING.

Prior art to fold in: the CRM/agentic survey at
research_notes/crm-agentic-harvest-20260930/ (34 systems surveyed; no
continuity grade A; harvest candidates ranked). Also study Dify and n8n
for workflow inspection, run visualization, tool configuration, human
intervention, credential UX, agent trace UX, failure/retry UX — harvest
the UX patterns, never transplant their engines.

## FYD — the product proof continues

FYD is the product/compiler; PING is optionality substrate and must earn
every hot-path dependency. Ask FYD questions, search queries, owner
corrections, and lead/contact actions become demand/funnel observations
for the radar — but do NOT contaminate Product Truth with Marketing
inference. Generated sites become experimentable projections; Why This
becomes a public trust primitive.

## Hour blocks (budgets, not ceremonies)

- 0–10: GATE APPROVAL SECURITY. Inventory Mission Control live surfaces.
  ONE navigation shell over real data.
- 10–20: CRM harvest. People/Companies/Leads from the existing object
  model. FYD "estimate request" → lead projection.
- 20–30: ORCA execution convergence. One real authorized mission served
  end-to-end.
- 30–40: Knowledge retrieval. One prior Learning/Claim influences a
  future mission, with evidence.
- 40–50: Video harvest. Provider-neutral VideoSpec + ONE adapter
  experiment.
- 50–60: Deterministic video composition. One evidence-backed technical
  video from a MarketingOS thesis.
- 60–70: Unified Mission Control actions. Objects + capabilities +
  approvals + runs + results from one UI.
- 70–80: Media/content lifecycle. Asset provenance + generation +
  approval + publishing receipt.
- 80–90: Live/realtime/commerce harvest. LiveKit + Shopify + live-
  shopping ecosystem. READ-ONLY unless a concrete proof earns
  implementation.
- 90–99: ADVERSARIAL CONVERGENCE. Ask: WHAT DID WE DUPLICATE? WHAT CAN
  BE DELETED? WHAT STILL HAS NO AUTHORITY? WHAT UI IS LYING? WHAT DATA
  HAS NO CONSUMER? WHAT KNOWLEDGE IS NEVER RETRIEVED? WHAT ACTION HAS NO
  VERIFIED EFFECT? WHAT SYSTEM EXISTS ONLY BECAUSE WE LIKE ITS NAME?
  CUT IT.

## Target demo (the 99-hour test)

From Mission Control, on real data, no mocks:
"Show me what matters." → "Why?" → "Research this." → "Make something
from it." → "Show me every claim." → "Generate the video." → "Give me
the best clips." → "What requires my approval?" → (explicit
authorization) "Execute." → "Did it actually happen?" → "What happened
afterward?" → "What did we learn?"
Every step resolves onto existing canonical owners and evidence.

## Standing constraints

- Commit law absolute. No push without Nolan's explicit authorization.
- No distribution, publication, or external contact without Nolan's
  approval of the exact artifact. Customer outreach stays held unless
  explicitly authorized.
- No new authorities, stores, engines, or buses. Collapse authority,
  never semantics.
- Storage incident is mitigated; resume conservative product building.
- Falsification bar unchanged: lane self-reports are hypotheses until
  replayed from a clean checkout.

## Report matrix (every block close)

SECURITY APPROVAL GATE / MISSION CONTROL SHELL / FYD / CRM / LEAD PROOF /
ORCA EXECUTION / KNOWLEDGE RETRIEVAL / VIDEO SPEC / VIDEO PROVIDER /
VIDEO ARTIFACT / MARKETING CLAIM LINEAGE / LIVEKIT HARVEST /
SHOPIFY/LIVE-COMMERCE HARVEST / DUPLICATE CODE REMOVED / AUTHORITIES
REDUCED / REAL DATA SURFACES / FIRST BROKEN ARROW /
NEXT HIGHEST-LEVERAGE BUILD.

## Nolan binding steer 2026-09-30 ~16:10 MDT — FILED VERBATIM AS LAW

### DIRECTIVE 1: CONVERGE FOR OPTIONALITY
Do not optimize PING/FYD for today's UI, social network, model provider, or website framework. PING owns IDENTITY, OBJECT, RELATIONSHIP, EVIDENCE, CAPABILITY, INTENT, TRANSITION, OUTCOME, HISTORY. FYD turns those primitives into product. Everything else is adapter or projection: website, Mission Control, feed, search, ActivityPub, ATProto, Nostr, MCP, Facebook, future protocols, agents, models, browsers, renderers. The durable system: SOURCES -> OBSERVATIONS -> EVIDENCE -> CLAIMS -> OBJECTS+RELATIONSHIPS -> CAPABILITIES -> INTENTS -> PROPOSALS/AUTHORIZATION -> TRANSITIONS -> OUTCOMES -> EVENT HISTORY -> PROJECTIONS. PING earns its complexity ONLY if it gives FYD properties ordinary website generators lack: evidence-backed knowledge; stable objects independent of pages; relationships independent of providers; owner corrections surviving regeneration; human+agent operations over one capability model; auditable consequential actions; multiple replaceable projections from one substrate; outcomes improving future decisions. If PING machinery does not contribute to one of these, FYD must not carry it in the hot path.

### DIRECTIVE 2: SIX LAYERS (the hedge)
1 BUSINESS TRUTH (evidence-backed objects, relationships, owner assertions, identity, temporal history). 2 AUTHORITY (tenant, actor, capability, approval, consequence policy, ownership, visibility). 3 INTELLIGENCE (research, claims, contradiction, opportunity, planning, experimentation, learning). 4 EXECUTION (ORCA + WorkerRuntime + interchangeable targets: local JS/Python, browser, Codex, Hermes, cloud workers, future agents; hands, never brains). 5 PROJECTIONS (FYD website, Ask FYD, CRM views, Mission Control, search, social, campaigns, feeds, analytics). 6 INTEROPERABILITY (MCP, provider APIs, federation, import/export, webhooks, future standards). Make replaceability a measurable property: every dependency must answer what semantic role it fills, what PING interface contains it, and what canonical information survives its removal.

### DIRECTIVE 3: NEW HARD RULES
- BUILT != DEPLOYED != REACHABLE != FUNCTIONAL != TRUTHFUL. Mission Control must report separately: SOURCE EXISTS / BUILD PASSES / DEPLOYED / ROUTE REACHABLE / DATA BOUND / LIVE VERIFIED. Institutionalize the built-but-unreachable lesson.
- Wake locks, not never-sleep: bounded execution lease tied to work lifetime (worker starts -> acquire; ends/crashes/times out -> release/expire). Never-sleep is an environment hack; execution lease is architecture.
- SemanticRenderModel: deterministic, ephemeral presentation state excluded from its digest (no timestamps, random IDs, hydration IDs, animation state, browser dimensions, telemetry IDs). Explicit stable tie-breakers for ordering; never DB natural order, object iteration accident, random UUID, or current clock. Byte-identical HTML across frameworks is NOT constitutional.
- Field visibility: FIELD + DEFAULT VISIBILITY + OWNER OVERRIDE as the generic projection policy seam. Do NOT encode ADDRESS=PRIVATE in the extractor. Owner decision beats default presentation policy.
- Factual render binding invariant: EVERY factual render binding must resolve OBJECT FIELD -> CLAIM/BINDING -> EVIDENCE, or be explicitly classified GENERATED_PRESENTATION. Renderer receives an already-bound RenderModel; it must not manufacture factual prose. Generated copy classified DIRECT/DERIVED/INFERRED/GENERATED_PRESENTATION/OWNER_OVERRIDE. No ClaimAuthority: the existing evidence/object projection contract IS the authority.
- Semantic experience compiler, not page builder: INPUT ObjectGraph + OwnerPreferences + ViewerContext + Capabilities + DesignTokens -> SiteSpec -> deterministic renderer. Website is one backend; future backends: mobile, embed, email, ActivityPub, ATProto, agent interface, search result, voice, AR.
- WHY THIS is trust infrastructure, optional and compact, not the hero UI. Primary: "Move emergency plumbing first." Secondary: "Why is FYD showing this?"
- Harvest directions: ATProto -> harvest SCHEMA/IDENTITY/PERMISSION/SYNC/PROJECTION (machine-published Lexicons, granular permissions, Sync 1.1, Jetstream v2 replay, Spaces alpha); MCP -> PING keeps AUTHORITY/CAPABILITY/EVENT/EVIDENCE/OUTCOME, exposes capabilities through MCP as the external perimeter (stateless core, Tasks, structured denial/async approval proposals); ActivityPub/Fedify stays an ADAPTER outside the trust kernel (recent Fedify actor-authentication fixes are the warning). Every harvest result classified ADOPT NOW / ADAPT LATER / PATTERN ONLY / REJECT.

### UPDATED P0s (2026-09-30 ~16:10 MDT)
PING: 1) MC shell actually reachable (worker already on it; Phase A requires SOURCE->BUILD->DEPLOYMENT->PROCESS->SERVED BYTES->SERVED BEHAVIOR->OBSERVATION proven live). 2) Real data only. 3) UNKNOWN not mock. 4) 25 stuck missions obvious in MC (25 stuck, common state, first missing edge, age, affected objects, responsible subsystem, evidence). 5) Fix their first common missing edge. 6) FB freeze bypass: mechanism now diagnosed - the freeze was prose in the facebook-engagement.md header; neither the cron body nor run_pass.sh reads it, so execution ignored it. Fix = executable policy gate (machine-readable state checked at build/dispatch time), not more prose. Note: Nolan lifted the FB freeze at ~16:05 MDT (socials resume; scale back ONLY on platform flags; failed passes auto-retry), so this hardening is for future holds, not a current blocker.
FYD: 1) two-site compiler stays green. 2) Evidence-bound Ask FYD. 3) Owner CONFIRM/CORRECT/HIDE. 4) Customization survives regeneration. 5) Media pipeline. 6) One real external business owner. Then estimate/contact/lead seam, then social graph, then campaigns.
Canonical-repo check tonight: PING still 81b3248, CRX still 6c4b531, FYD still 404 via connected GitHub; Pig/worktree work remains local/runtime evidence, not GitHub-visible convergence; keep the distinction mandatory.
