# FYD/PING 100-HOUR SPRINT PLAN

Derived from the 31-question grill (~/workspace/goals/fyd-social-product-build/files/BRUTAL-CEO-31-QUESTIONS-2026-09-30.md), which is now the baseline. Nolan's directive 2026-09-30 ~14:20 MDT. No architecture wave. No new authorities, stores, or writers in this plan.

Sprint thesis: FYD is a digital-presence compiler. Input: existing digital presence + owner intent. Output: trustworthy, living, owner-controlled, agent-operable digital representation. PING is the optionality substrate and must earn every hot path it sits on.

---

## 100-HOUR CRITICAL PATH

0–10 ENTRY (magic moment: URL → trustworthy render, instrumented)
 → 10–20 OWNER LOOP (correct/hide/feature UX on the rendered site)
 → 30–40 LIVING (real T1→T2 observation, diff, regen, owner review UX)
 → 60–70 ONE REAL ACTION (contact/lead request through intent→authorization→action→evidence)
 → 70–80 ADJUDICATION (PING integration matrix, honest harvest/wrap/leave-alone decisions)
 → 90–100 HUMAN (one external owner, recorded, unrescued)

Parallelizable off the critical path: 20–30 ASK expansion (needs only entry + primitives), 40–50 PUBLISH (needs only entry output), 50–60 COMPILER FEEL (needs only entry output), 80–90 HARVEST (background discovery plane throughout, never touches product).

## DEPENDENCY GRAPH

- ENTRY → OWNER LOOP (needs rendered site), → ASK (needs objects/evidence), → LIVING (needs T1 graph), → PUBLISH (needs spec output), → COMPILER FEEL (needs graph)
- OWNER LOOP → LIVING (intent replay needs recorded intent), → ACTION (owner context for authorization)
- LIVING → HUMAN (the "FYD noticed a change" proof)
- ACTION → ADJUDICATION (evidence for the earn-it test), → HUMAN (the "one useful action" proof)
- ASK → HUMAN (the "ask something difficult" proof)
- PUBLISH → HUMAN (the publish proof)
- HARVEST → nothing (discovery plane; product ingests only on proven constraint removal)

## WHAT ALREADY EXISTS

- Proceduralizer: DISCOVER → ACQUIRE → PARSE → NORMALIZE → EXTRACT → PROVENANCE → RESOLVE → RELATE → PROJECT, deterministic, machine-readable layers first (src/fyd/proceduralize/proceduralizer.ts).
- Evidence-binding discipline: claims.ts (generation-time) + verifyPresentationBinding (render-time), fail-closed omission, 195/195 tests green.
- Owner intent store: OBSERVED WORLD / OWNER INTENT / GENERATED PRESENTATION separated; REORDER/HIDE/SHOW/FEATURE/CORRECT, digest-pinned proposals (src/fyd/owner/).
- Deterministic regeneration: V1→V2 with intent replay, field divergences, unapplied-decision reporting, tested (src/fyd/regen/, FYD-021).
- Refresh lane: temporal observations, diff, dependency index (object→sections), conflicts never silently picked (src/fyd/refresh/).
- Ask FYD: 2 intents, template-based, fail-closed refusal, no LLM in path (src/fyd/ask/).
- Visibility: object + field-level policy, conservative address default, owner decisions outside graph (src/fyd/visibility/).
- Media pipeline: ingest with provenance (digest, rights, rightsBasis), derivatives (src/fyd/media/).
- SiteSpec: deterministic generation, schema-validated (src/fyd/sitespec/).
- Demo: :3100 serves demo-owner tenants, DEMO OWNER MODE verified on restart.
- Two fixture sites through one proceduralizer (Happy Place Carpentry, Coppersmith Plumbing).

## WHAT WILL BE HARVESTED FROM PING

Only where it removes duplication or unlocks something FYD needs, judged by "does this make FYD better today":
- Identity + signatures: for the hour 60–70 action layer (who requested, who approved).
- Capability/action semantics, proposals, approvals, execution records: for intent→authorization→action→evidence on the one real action.
- Event/evidence substrate: only if the action's accountability record needs more than FYD's owner store already provides.
- Catalog everything else. Wire nothing on ideology. The hour 70–80 matrix records the honest outcome, including "PING earned nothing this sprint" if that is the finding.

## WHAT WILL BE HARVESTED EXTERNALLY

Read-only discovery plane (hours 80–90, may run as background throughout): Schema.org/JSON-LD advances, headless CMS and site-compiler patterns, provenance systems, capability systems (object-capability literature), Automerge/local-first (for intent merge semantics), MCP (for the action interface shape), modern acquisition/browser tooling, schema-driven UI. Ingest into product only when a discovery removes a current constraint or creates a clearly valuable option cheaply. Harvest manifest kept; no automatic integrations.

## WHAT MUST ACTUALLY BE WRITTEN

- 0–10: live entry point (URL input → build → visible progress → render), timing instrumentation (URL_SUBMITTED_AT / FIRST_MEANINGFUL_OBJECT_AT / SITE_SPEC_READY_AT / FIRST_RENDER_AT). Verify first whether the served path acquires live or fixture; build the live path.
- 10–20: owner action UX (correct/hide/feature) bound to rendered fields/objects; test whether CONFIRM creates downstream value before adding it.
- 20–30: query planner over existing primitives (intent→objects/relationships/evidence/history→retrieval→composition); LLM composes, never retrieves; claim ledger on every answer.
- 30–40: living loop product surface (T1/T2 observations, deterministic diff, affected-section regen, "SOURCE CHANGED — review update" UX, owner intent replay visible).
- 40–50: minimal publish (preview, stable URL, rollback, version ID, owner-visible status); deployment artifact replaceable.
- 50–60: explainable composition rules from graph cardinality/topology/media/capabilities; every structural choice answerable ("why did FYD choose this").
- 60–70: one real action (contact/lead request as structured object/action) with the full intent→capability→authorization→action→result→evidence chain.
- 70–80: adjudication matrix (no code unless a decision requires wiring).
- 90–100: human test protocol + recorded session (no build).

## WHAT WILL BE DELETED/FROZEN

- Frozen for the sprint: new authority/store/writer creation; TenantOS expansion; customer IAM empire; visual canvas; template marketplace; analytics platform; generic workflow engine; ActivityPub/ATProto/Nostr/Farcaster infrastructure; mass-follow or campaign machinery.
- Facebook engagement stays frozen (separate order). TikTok and cold outreach stay on hold.
- The grill's probation list stands: refresh lane and PING substrate earn hot-path status or stay out.

## PROOFS

- HOUR-10 PROOF: a laptop, a URL never seen before, visible progress states, a trustworthy render, and four timestamps. Metric: URL → first trustworthy useful render, measured not optimized.
- HOUR-20 PROOF: an owner corrects a fact, hides a section, and features a service on the rendered site; regeneration preserves all three (demonstrated, not asserted).
- HOUR-30 PROOF: eight target questions answered from evidence with citations, plus correct refusals on unanswerable ones; hostile claim set passes validateClaims with zero invented retrievals.
- HOUR-40 PROOF: a real source change flows T1→T2→diff→regen→owner review UX; the owner sees "+ new service / − removed information / ~ changed hours" and approves; corrections survive.
- HOUR-50 PROOF: preview → publish → stable URL → rollback → version identification, all owner-visible; SiteSpec remains presentation truth; artifact replaceable.
- HOUR-60 PROOF: compositional choices explained per page ("services became primary navigation because: 7 service objects + owner FEATURE + majority of actionable objects"); no randomness; deterministic re-render.
- HOUR-70 PROOF: one visitor's "I need an estimate" becomes a structured lead the owner receives, with the full intent→authorization→action→evidence chain recorded; PING machinery used only where it earned the step.
- HOUR-80 PROOF: the adjudication matrix, every primitive with a decision (HARVEST/WRAP/CONVERGE LATER/LEAVE ALONE/DELETE DUPLICATE), no ideological integrations.
- HOUR-90 PROOF: harvest manifest (problem solved / primitive right / reusable / never build) for each source; zero product-plane changes from harvest without a proven constraint removal.
- HOUR-100 PROOF: one external owner, recorded, unrescued: time to first value, first confusion, first wrong fact, first correction, first question, first customization, first "that's cool", first "why did it do that", first thing they expected but could not do; plus their answers to "would this save you work / what would stop you / what next". Their answers determine sprint 2.

## TOP 5 WAYS THIS SPRINT COULD FAIL

1. The magic moment fails on the open web. The proceduralizer is proven on 2 fixtures; arbitrary business sites are hostile (JS-rendered, no JSON-LD, misleading markup). A live URL produces a confident-looking wrong site.
   EARLIEST FALSIFICATION: hour 10 — run 5 real, unseen business URLs through the entry point. If fewer than 3 yield a trustworthy render, extraction assumptions fail and the block's output is the failure analysis, not a demo.
2. No external owner can be secured for hour 90–100. Scheduling real humans is the highest-variance dependency.
   EARLIEST FALSIFICATION: hours 0–10 — identify and contact the owner candidate now. No commitment by hour 20 = escalate to Nolan; the hour-100 proof is at risk and the plan must change.
3. Ask FYD expansion leaks LLM judgment into retrieval. The composition/retrieval boundary is easy to assert and easy to violate once an LLM is in the loop.
   EARLIEST FALSIFICATION: hour 30 — hostile question set; every answer's claim ledger must pass validateClaims against the evidence index. One invented retrieval = boundary failure, block the composition path until fixed.
4. The living loop has no real T2. Business websites may not change observably within the sprint window, leaving the "living" proof synthetic.
   EARLIEST FALSIFICATION: hour 30 — survey the entry-point sites for real observed changes. If none, the honest proof is a controlled, labeled source change (synthetic T2, declared as such), not a pretended organic one.
5. PING harvest earns nothing and adjudication becomes theater. If the one real action does not need PING machinery, hours 70–80 could produce rationalizations instead of verdicts.
   EARLIEST FALSIFICATION: hour 70 — the action either demonstrably uses PING primitives or it does not. The matrix must be allowed to conclude LEAVE ALONE across the board; a matrix with no negative verdicts is evidence of bias, not success.

## EXECUTION

Coordinator owns block execution; Nolan owns the human-approval and distribution boundaries. Commit law on every writer. No push without explicit authorization. First broken arrow gets marked, never built around.
