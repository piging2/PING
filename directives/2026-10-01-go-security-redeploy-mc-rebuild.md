# GO: security redeploy + Mission Control rebuild + commit sweep (2026-10-01 ~19:04 MDT, Nolan, binding)

## Three decisions made

1. LIVE GATEWAY SECURITY REDEPLOY = GO.
2. MISSION CONTROL REBUILD = GO.
3. REPOSITORY OWNERSHIP = FYD OWNS THE CURRENT FYD LINEAGE (Option A, confirmed again).

Also: "commit everything, no more dirty files."

## P0: deploy the proven gateway security fix

The live gateway still serving known-vulnerable images is the highest-severity item. Fixes are proven in git (624220518c /tenants, fcfc656ca6 4 mounts, 170 attack vectors denied, no legitimate callers broken) but the running boundary remains exposed. Git green is not production green.

Authorization covers ONLY deployment of the already-proven security fixes. Before promotion: re-observe live state, pin exact candidate SHA/image, prove image provenance, record current journal state, record current projection state, prove rollback image, prove current health, prove secrets remain sanitized. Then candidate proof, bounded promotion through the existing deployment procedure, then rerun the ATTACK SUITE AGAINST THE ACTUAL LIVE 8080 SERVICE: 170/170 previously denied vectors remain denied live, plus legitimate callers proven working live.

ROLL BACK FIRST on: health failure, journal failure, projection corruption, legitimate caller regression, auth bypass, secret exposure, restart loop, unexpected state mutation. Investigate second. Do not debug indefinitely on the live boundary.

## Mission Control rebuild

Precondition satisfied (one real mission, 9/9 stages green on live machinery). MISSION CONTROL IS NOT ANOTHER AUTHORITY. It is the identity-owned operating surface over existing authorities: Missions, Runs, Agents, Objects, Relationships, Capabilities, Proposals, Evidence, History. DO NOT create MissionControlAuthority, another workflow engine, another event store, another agent runtime. READ/COMMAND THROUGH EXISTING AUTHORITIES. Build only what the proven live chain supports.

Screen chain: MISSION LIST → MISSION DETAIL → RUN → PROPOSAL → APPROVAL → EXECUTION → CANONICAL EVENT → PROJECTION → EVIDENCE/HISTORY. Every screen corresponds to real runtime state. NO MOCK CARDS. NO FAKE COUNTERS. NO ASPIRATIONAL STATUS. If the backend cannot answer truthfully, the UI does not claim it. Do NOT let Mission Control consume the FYD product wave. PING = substrate. FYD = customer product. Mission Control = operator/identity control surface.

## Scoreboard discipline

Current: 12 PASS, 11 FAIL, 5 UNKNOWN, 1 UNWIRED, 1 FALSIFIED. Do NOT call the system broadly green because the approval chain is green. Classify every non-pass by impact: BLOCKS CURRENT FYD LOOP / BLOCKS SECURITY / BLOCKS REPLAY-TRUTH / BLOCKS MISSION CONTROL / FUTURE-DEFERRED / STALE-INVALID TEST. Attack only the highest-consequence categories. The scoreboard shrinks because defects resolve or are deliberately deferred with evidence, not because reporting softens.

## Next boundary: RENDERED EXPERIENCE → ASK FYD → EVIDENCE

Question: "What services does this business offer, and how do you know?" FYD answers from the graph/evidence — not generic model memory, not live internet re-reading, not hallucination. Response model: ANSWER + OBJECT REFERENCES + EVIDENCE REFERENCES + SOURCE + DIRECT/DIRECT-DERIVED/INFERRED. Insufficient evidence → "I don't have enough evidence." THAT IS SUCCESS.

Ask FYD read model expands to: what does this business do, what services, which location, who works here, how do you know, what changed, what conflicts, which objects reference this, what can I do with this object. Owner: what should I change, move this first, draft the change, do not publish yet.

No ClaimAuthority. Truth/evidence ownership stays upstream. Render path consumes VALIDATED PRESENTATION BINDINGS; every factual unit resolves to EVIDENCE-BACKED FACT, OWNER-ASSERTED CONTENT, or explicitly labeled GENERATED PRESENTATION. Renderer owns SAFE PRESENTATION, not TRUTH. Owner owns publication policy: FACT / SOURCE / VISIBILITY modeled separately; never destroy the acquired fact because presentation hides it.

Semantic determinism lock: ObjectGraph + OwnerPolicy + SiteSpec + ViewerContext + RendererVersion → SemanticRenderModel. Deterministically verify sections, bindings, ordering, objects, relationships, visibility, actions. No byte-identical-DOM demands without product reason.

FYD as compiler: FRONT END (websites, documents, authorized social, public structured sources) → observations → SEMANTIC LAYER (evidence, identity resolution, objects, relationships, owner corrections, visibility, capabilities) → durable semantic IR → PLANNERS (SiteSpec, FeedSpec, CampaignSpec, AgentContext, future) → typed plans → BACK ENDS (web, mobile, Circle, search, MCP, ActivityPub, ATProto, Nostr, future). Understand once, project many ways.

## Harvest vs build

Continue read-only harvesting across PING, dormant code, git history, CascadeProjects, FYD, ecosystem. Implementation stays narrow. Every harvest candidate answers: WHAT CUSTOMER PROBLEM DOES THIS REMOVE? WHAT COMMODITY BOUNDARY DOES IT PREVENT REBUILDING? WHAT CURRENT FYD STEP DOES IT ACCELERATE? Third answer NONE → research only, do not implement.

## Priorities

P0: deploy proven gateway security fix. P1: Ask FYD → evidence; Mission Control real-runtime first slice; stable FYD test URL (Happy Place + Coppersmith); owner correction/visibility/customization; source refresh → safe regeneration. P2: harvest/future optionality research.

## Target: one stable private dev URL

Landing: HAPPY PLACE, COPPERSMITH. Select one → generated site, objects, relationships → "What services do they offer?" → "How do you know?" → bounded demo-owner mode → change visibility → "Put this first" → FYD proposes patch → approve → site changes → refresh persists.

## Report format (fill what you own, leave the rest)

LIVE SECURITY IMAGE: SHA: / ATTACK SUITE LIVE: / LEGITIMATE CALLERS: / ROLLBACK: / MISSION CONTROL: / REAL MISSIONS: / REAL RUNS: / REAL PROPOSALS: / REAL HISTORY: / MOCK DATA REMAINING: / FYD URL: / HAPPY PLACE: PASS-FAIL / COPPERSMITH: PASS-FAIL / ASK FYD: PASS-FAIL / EVIDENCE: PASS-FAIL / OWNER CORRECTION: PASS-FAIL / SITE PATCH: PASS-FAIL / REFRESH: PASS-FAIL / REGEN: PASS-FAIL / SCOREBOARD: PASS: FAIL: UNKNOWN: UNWIRED: FALSIFIED: / FIRST CUSTOMER-BLOCKING FAILURE: / NEXT:

NO VICTORY LAPS. NO NEW AUTHORITY. NO NEW PROTOCOL TROPHIES. NO REPOSITORY HISTORY GAMES. DEPLOY THE PROVEN SECURITY FIX. CLOSE ASK FYD. GIVE NOLAN THE URL. GO.
