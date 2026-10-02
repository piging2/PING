# SPRINT 04: WEBSITE-BUILDING 100-HOUR PLAN
## Filed 2026-09-30 ~18:50 MDT - READ-ONLY PLANNER, NO CODE

**Status:** plan only. Nothing in this file authorizes a write, a commit, an install, an execution, or a push. Every deliverable names its semantic owner and its exact mutation surfaces; a writer may only touch those surfaces after the sprint's pre-sprint authority-overlap search (AGENTS.md standing law: search the ENTIRE repo INCLUDING ALL WORKTREES for a similar semantic capability overlapping an authority capability, from first principles, before any new sprint work). All work is Pig-local (FYD remote is UNVERIFIED through the connected GitHub account); writers use Pig worktrees, local commits only, no push without Nolan's explicit authorization.

**Program context:** one of six 100-hour sprints ordered by Nolan under the 600-hour master directive (CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30.md). The six are verticals over one PING semantic/control plane, not six islands. This file is `04-website-building-100h.md` under `~/workspace/goals/ping-agent-execution-stack/files/sprint-plans-100h/`.

---

## 1. PRODUCT ARROW

**CAN FYD TURN EXISTING DIGITAL REALITY INTO A TRUSTED, EDITABLE, INTELLIGENT PRESENCE?**

DO NOT BUILD WIX. BUILD THE COMPILER.

FYD is the vertical that PROJECTS the semantic world. HTML, Markdown, structured JSON, MCP/WebMCP tools, search documents, and social representations are all PROJECTIONS from governed semantic state, never independent representations of truth. The readability-routing work folds INSIDE this plan (the P5 readability proof), never as a separate sprint. Readability is separated from actuation: an agent being able to read an object never implies permission to act on it.

---

## 2. CURRENT VERIFIED STATE

Epistemic labels per standing rule: PROVEN / SUPPORTED / READY / REPORTED / INFERRED / UNKNOWN / CONFLICTING.

- **URL -> structured extraction -> evidence -> objects -> relationships -> SiteSpec -> renderer -> browser: GREEN (REPORTED).** The FYD two-site compiler is green on `fyd/convergence-2026-09-28` per the FYD product lane; renderer and browser boundary are off-limits this sprint. Label is REPORTED because this planner has not re-run the compiler in this pass; the 0-10 archaeology block re-verifies it before any writer starts.
- **Two real websites exist as the Ask FYD test surface (SUPPORTED).** Happy Place and Coppersmith are the served sites per the FYD Social goal record; the ask endpoint serves behind them.
- **Existing FYD primitives (REPORTED from light Pig-local recon 2026-09-30; FYD remote UNVERIFIED):** `src/fyd/ask/` (contract, answer, context-builder, context-compiler, concierge, visitor-answer, visitor-safe-fields), `src/fyd/claim/machine.ts` (pre-generation grading SUPPORTED/DERIVED/INFERRED/UNKNOWN; fail-closed refusal), `src/fyd/sitepatch/pipeline.ts` (digest-bound proposals, approval seam, draft/published lifecycle), `src/fyd/customize/` (owner-command-compiler, apply-layer, write-boundary), `src/fyd/sitespec/binding-verifier.ts` (UNBOUND factual values fail closed at the emission gate), `src/fyd/object/why-this-steps.ts` + `src/fyd/ui/why-this.tsx` (WHY THIS chain), `src/fyd/lineage/tracer.ts`, `src/fyd/proceduralize/` (proceduralizer, service-cards, structured-data, microdata, location-blocks), `ASK_RESPONSE_CONTRACT_VERSION = "fyd.ask-response@2"`.
- **Worktrees (REPORTED):** `ping-fyd-converged` (branch `fyd/convergence-2026-09-28`, HEAD `300c9c91`, P0-2 tenant-on-proposal landed), `ping-askfyd-gold` (branch `testing/askfyd-gold-2026-09-30`, tests-sprint gold-set surface; this sprint reads it, never writes to it).

---

## 3. FIRST BROKEN EDGE

**Service-fact extraction from free prose is the first broken step (SUPPORTED).** Service facts currently live as free text in the description field; the proceduralizer never emits Service objects. The P0 deterministic retrieval baseline (OBJECT GRAPH + EVIDENCE INDEX + LEXICAL/STRUCTURAL RETRIEVAL) then has no graph leg for "What services does this business offer?", and Ask FYD must either refuse honestly (acceptable) or drift into plausible prose-as-fact (unacceptable). The known fallback if deterministic rules cannot reliably emit Service objects from the two real sites: an explicitly typed INFERRED classification with the derivation recorded, never silent prose-as-fact.

Sharpened companion edges, attacked in order of their effect on the P0-P5 ladder:
- **E2. Evidence removal does not retract claims.** Source removes a supported fact; the regenerated SiteSpec keeps the old value because the reobservation-diff path treats absence as "no change". Broken seam: reobservation-diff semantics must regrade absence to UNSUPPORTED/CONFLICT, never preserve by inertia.
- **E3. Owner correction vs source regeneration conflict.** Reobservation re-ingests SOURCE SAYS X after the owner corrected to Y. Broken seam: conflict resolution silently picking source, or the correction stored in a layer the next regeneration does not read.
- **E4. Correction/hide leakage across viewer contexts.** Owner-hidden fields reappear in the public render after regeneration because the visibility decision traveled with the object field rather than the owner-visibility-decision record. Broken seam: OBSERVED VISIBILITY / OWNER VISIBILITY DECISION / EFFECTIVE PROJECTION VISIBILITY must be three separate truths.
- **E5. Projection drift.** HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, or AVAILABLE_CAPABILITIES diverges from the object graph (e.g., agent Markdown scraped from rendered HTML rather than projected from semantic state). Broken seam: any projection path that reads another projection instead of the governed state.

First broken edge overrides the schedule: when E1-E5 bites, the sprint pivots to the seam it exposed.

---

## 4. SEMANTIC OWNER

FYD's ask/projection machinery owns the product path. Per-surface owners:

- **Ask FYD served path and answer contract:** `src/fyd/ask/` (ask-path writer).
- **Emission gate and claim grading:** `src/fyd/claim/machine.ts` + `src/fyd/ask/contract.ts`.
- **WHY THIS / SourceBinding / lineage:** `src/fyd/object/why-this-steps.ts`, `src/fyd/ui/why-this.tsx`, `src/fyd/sitespec/binding-verifier.ts`, `src/fyd/lineage/tracer.ts`.
- **Owner edit channel:** `src/fyd/sitepatch/pipeline.ts` is the ONLY edit channel; `src/fyd/customize/` (owner-command-compiler, apply-layer, write-boundary) owns the conversational-change mechanics.
- **Extraction:** `src/fyd/proceduralize/` owns the E1 fix; it is a fix inside the existing proceduralizer owner, not a new extraction authority.
- **Renderer, two-site compiler, :3100 serve path:** off-limits. Green and owned by the FYD product lane and the Mission Control wiring lane respectively.

No new authorities, stores, repos, frameworks, event writers, or event spines. No ClaimAuthority: the projection boundary (BindingVerifier) mechanically enforces "no invented claims".

---

## 5. MUTATION OWNER

Exactly one mutation owner per shared contract across all six sprints. FYD is the natural owner of the SITESPEC CONTRACT. Other lanes may READ and PROPOSE; one writer merges contract changes. This sprint's posture per contract:

1. **Tenant contract:** TenantOS sprint. This sprint READS ONLY (tenant binding at SitePatch proposal creation rides the landed P0; no new TenantAuthority).
2. **Mission contract:** Mission Control / ORCA lanes. This sprint READS ONLY.
3. **Route contract:** Mission Control wiring lane. This sprint READS ONLY.
4. **Brief contract:** ORCA lane. This sprint READS ONLY.
5. **Result/finding contract:** ORCA / Mission Control lanes. This sprint READS ONLY (finding sets may become an evidence source for Ask FYD later; not in this 100 hours).
6. **Judgment contract:** JEV lane. This sprint READS ONLY. JEV stays out of the production answer path; shadow rerank results may inform relevance tuning of the D1 baseline if delivered.
7. **Capability contract:** TenantOS sprint. This sprint READS ONLY. AVAILABLE_CAPABILITIES is a read-only projection of the capability vocabulary; it never grants capabilities.
8. **SiteSpec contract: FYD / THIS SPRINT (MUTATION OWNER).** SiteSpec IR shape, SitePatch patch shape, SourceBinding shape, stable node IDs (T7 fix), the owner-correction state machine (OBSERVED / GENERATED / CORRECTED / HIDDEN / CUSTOMIZED / SOURCE_CHANGED / REGEN_PROPOSED / REGEN_APPLIED). All SiteSpec contract changes are merged by this sprint's designated writer only.
9. **Event transition contract:** shared, Mission Control/core lane. This sprint READS and PROPOSES; it does not mutate.
10. **Verification/outcome contract:** tests sprint. This sprint READS (consumes the gold set as the acceptance surface) and PROPOSES; it does not curate questions or run the hostile battery.

---

## 6. INPUT CONTRACT

- **In:** a business URL; the observed/acquired source content with SHA-256 source digests and observed-at timestamps; the governed object graph + evidence index produced by the green compiler; owner identity via the tenant-bound approval machinery (demo-owner path only, visibly marked simulated, incapable of provider writes).
- **Contract freeze (hours 10-20):** AskFydAnswerContract (`fyd.ask-response@2`) frozen; SiteSpec patch shape frozen (digest-bound proposal -> approval -> draft/published lifecycle); SourceBinding shape frozen (RENDERED VALUE -> OBJECT FIELD -> CLAIM -> EVIDENCE -> OBSERVATION -> EXTERNAL SOURCE); owner-correction state machine frozen.
- **Hard gate:** the FYD two-site compiler stays green on `fyd/convergence-2026-09-28` (or its successor branch). If the compiler is red, this sprint pauses until the FYD product lane restores it.
- **Hard gate:** the three P0s remain closed on served demo-owner paths: gateway promotion (no container-only drift), tenant-on-proposal (proposals carry immutable tenant context), capability provisioning (403 stays fail-closed; demo-owner approval rides the gated approval route). Proposal digest discipline intact: APPROVED PATCH BINDS EXACT PROPOSAL.

---

## 7. OUTPUT CONTRACT

Good-form statements only. Each deliverable closes at: OWNER REQUEST -> REACHED -> DURABLE -> EXECUTED -> VERIFIED -> EXPLAINABLE -> RESTART-PROVEN + first broken edge named.

1. **Ask FYD answers service and factual questions from the object graph with every claim bound to evidence, and answers "I don't have evidence for that" when unsupported.** (P0)
2. **The emission gate refuses uncited factual claims before generation, distinguishing SOURCE SAYS X / OWNER SAYS Y, with private/visibility-hidden fields never reaching the public viewer context.** (P0)
3. **Every rendered factual value carries a quiet SourceBinding (WHY THIS) traceable RENDERED VALUE -> OBJECT FIELD -> CLAIM -> EVIDENCE -> OBSERVATION -> EXTERNAL SOURCE; generated copy is distinctly typed and can never masquerade as observed fact.** (P1)
4. **An owner can CONFIRM / CORRECT / HIDE any fact through the digest-bound SitePatch seam, in plain English, with SOURCE SAYS X preserved as evidence when OWNER SAYS Y.** (P2)
5. **"Move emergency services first" compiles to a typed SiteSpec patch proposal through the owner-command-compiler, approved and applied without touching the acquisition policy gate.** (P3)
6. **A second source observation regenerates the site without destroying owner corrections, hides, or customizations; source removal retracts or regrades claims instead of preserving them by inertia.** (P4)
7. **HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, and AVAILABLE_CAPABILITIES are all produced from the same object graph, each with claim-level evidence correctness measured, with zero unsupported claims and zero projection drift.** (P5)

---

## 8. DEPENDENCIES

### Hard gates
1. FYD two-site compiler stays green (FYD product lane). Sprint pauses if red.
2. The three P0s remain closed on served demo-owner paths (gateway promotion, tenant-on-proposal, 403 fail-closed capability provisioning). The SitePatch approval rides the same approval machinery; a weak approval route poisons owner-loop trust.
3. Proposal digest discipline intact: APPROVED PATCH BINDS EXACT PROPOSAL.
4. Tests sprint owns the Ask FYD gold set of 20-50 questions (required/allowed evidence, forbidden claims, expected epistemic status per question); this sprint consumes it as the acceptance surface.

### Nice-to-have (adopt opportunistically, never gate)
5. JEV shadow rerank results from the tests sprint: inform relevance tuning of the retrieval baseline only if delivered; never wired into production (JEV does not control production until evaluated).
6. Harvest evaluation candidates (readability L1, Playwright L2, Puck feasibility): options, not prerequisites. The product path ships on the acquisition path already green.
7. Pre-sprint authority-overlap search (standing law, binding) before any writer starts.

---

## 9. HARVEST CANDIDATES

Cite the harvest map (bound from the attached design): experiment E3 (SourceBinding generalization: RENDERED VALUE -> OBJECT FIELD -> CLAIM -> EVIDENCE -> OBSERVATION -> EXTERNAL SOURCE) is the product-side harvest for P1; its measurement half belongs to the tests sprint.

Bounded evaluations only (no integration until proven; per the FYD WILL NOT BUILD ledger):
- **@mozilla/readability pinned:** L1 main-content wrapper (tens of lines; closes the boilerplate-stripped main-content gap). Candidate disposition: ADOPT.
- **Playwright 1.63 pinned with its browser build:** L2 render adapter behind the existing AcquisitionAdapter interface (bounded slot). Candidate disposition: ADOPT.
- **Puck (@puckeditor/core):** wrapped behind a SiteSpec adapter as a FEASIBILITY proof only (publish still through the digest-bound gate; never Puck Cloud AI). Candidate disposition: WRAP.
- Convergence threads T1 (two SSRF fetch seams) and T7 (index-derived IDs) are tracked; T7's fix ships in the P1 work (creation-time stable IDs that survive insert/move/reorder).

Disposition per candidate: ADOPT / WRAP / ADAPT / REJECT with the constitutional checklist answered in writing (FYD current, PING existing, duplication risk, authority risk, smallest delta, reached product arrow). Lexical note: Lexical stays wrapped only when plain strings stop sufficing.

---

## 10. OWN / RENT / WRAP / ISOLATE / REJECT DECISIONS

- **OWN (what compounds):** SiteSpec semantics and the SiteSpec contract; the evidence-bounded answer contract (CLAIM -> EVIDENCE -> SOURCE -> OBSERVED AT -> DIRECT/DERIVED/INFERRED); owner intent, corrections, hides, and customizations as durable governed state; the visibility decision model (OBSERVED VISIBILITY / OWNER VISIBILITY DECISION / EFFECTIVE PROJECTION VISIBILITY); the owner-correction state machine; SourceBinding semantics.
- **RENT (commodity machinery):** browser, crawler, Markdown conversion, document parsing, search engine, UI primitives, container runtime. Readability and Playwright land here as rented adapters behind existing interfaces.
- **WRAP (protocols as projection targets, never truth stores):** MCP, WebMCP, social protocols, JSON-LD, and (feasibility only) Puck as wrapped edit surfaces; all are projections of the governed semantic state, never independent representations.
- **ISOLATE:** experimental protocols, novel security primitives, unproven stores. None ship in the product path this sprint.
- **REJECT (binding):** any CMS/content backend as a truth store (no Payload, no Sanity, no Builder.io); CRDT adoption (Automerge/Yjs stay REFERENCE; the draft layer + SitePatch seam suffices); website-builder libraries as product choices; any new claim/test/scheduler/tenant authority; JEV in the production answer path (JEV is shadow, evaluated by the tests sprint); MCP implementation before the concierge product proof; any edit channel besides SitePatch.

---

## 11. P0 / P1 / P2 (the directive's P0-P5 ladder, with hour-budget placement)

**Hours 0-10: ARCHAEOLOGY + FALSIFICATION.** Pre-sprint authority-overlap search across the full repo including all worktrees; re-verify the URL-to-browser frontier is green on the canonical SHA (REPORTED -> PROVEN or flagged); inventory existing Ask FYD primitives vs the P0 baseline; confirm the gold set exists and is readable (tests sprint owns it); confirm harvest-map E3 scope.

**Hours 10-20: CONTRACT + ACCEPTANCE TEST FREEZE.** Freeze AskFydAnswerContract, SiteSpec patch shape, SourceBinding shape, owner-correction state machine; freeze the acceptance statements in section 7 with the tests sprint; freeze writer/mutation-owner assignments from section 19 of this plan.

**P0: Ask FYD gold set (hours 20-60, highest-leverage wiring; hardening in 60-95).**
- D1 re-mapped: served Ask FYD -> EVIDENCE product path on both websites. Deterministic candidate retrieval baseline in the served path: OBJECT GRAPH + EVIDENCE INDEX + LEXICAL/STRUCTURAL RETRIEVAL -> candidate evidence. No JEV in the product path. Served behind the existing ask endpoint with the answer contract enforced at the boundary. Unsupported questions answer "I don't have evidence for that", never filler, never plausible copy, never model memory. First acceptance: "What services does this business offer, and how do you know?" with every claim bound to evidence or refused.
- D2 re-mapped: evidence-bounded answer contract at the emission gate. Wire the existing pre-generation claim grading (SUPPORTED/DERIVED/INFERRED/UNKNOWN) into the served path: the gate refuses rather than render an uncited SUPPORTED claim. Grading before generation, never post-hoc checking. Answers distinguish SOURCE SAYS X / OWNER SAYS Y (owner assertions carry the `owner_authored` provenance lane). Visitor-safe field projection: private/visibility-hidden fields never reach the public viewer context.
- D6 re-mapped: attack the first broken edge. Deterministic extraction rules first (schema/JSON-LD/microdata presence, location blocks, service cards) emit typed Service objects so the P0 retrieval baseline can answer service questions from the object graph instead of prose. Fix inside the existing proceduralizer owner, verified against existing fixtures.

**P1: WHY THIS (hours 20-60, quiet affordance).**
- D3 re-mapped: generalize one render node to carry a SourceBinding: RENDERED VALUE -> OBJECT FIELD -> CLAIM -> EVIDENCE -> OBSERVATION -> EXTERNAL SOURCE. WHY THIS is progressive disclosure, not hero UI: appears when the visitor/owner questions a fact, sources conflict, or an inference is presented. Extends the existing ObjectProvenanceView per-field provenance. Generated presentation copy stays distinctly typed (direct/derived/generated/owner_authored); UNBOUND factual values fail closed at the emission gate. Includes the T7 fix: creation-time stable node IDs that survive insert/move/reorder, so SourceBindings stay keyed after regeneration.

**P2: CONFIRM / CORRECT / HIDE (hours 20-60 wiring; verified in 60-95).**
- D4 re-mapped: owner CONFIRM/CORRECT/HIDE through the SitePatch seam. SitePatch remains the ONLY edit channel: digest-bound proposal -> approval (demo-owner path, visibly marked simulated, incapable of provider writes) -> draft/published lifecycle with revision history. CONFIRM anchors a fact to owner assertion; CORRECT produces owner-asserted value with source preserved as evidence (source remains observable, presented value respects the correction); HIDE sets owner visibility without deleting source truth. Tenant binding at proposal creation per the standing P0 (no new TenantAuthority).

**P3: Conversational customization (hours 60-80 integration).**
- "Move emergency services first." compiles via owner-command-compiler -> typed SiteSpec patch proposal -> approval -> apply, staying within the SiteSpec adapter vocabulary. Lands after P2's seam is stable because P3 is a natural-language front end to the same typed patch channel.

**P4: Second observation / safe regeneration (hours 60-80 integration; hardened in 80-95).**
- D5 re-mapped: SOURCE REOBSERVATION -> DIFF -> SAFE REGENERATION -> OWNER OVERRIDE SURVIVES. Owner state machine honored across regen (OBSERVED / GENERATED / CORRECTED / HIDDEN / CUSTOMIZED / SOURCE_CHANGED / REGEN_PROPOSED / REGEN_APPLIED). Invariants: OWNER CORRECTION IS NOT LOST; HIDE IS NOT LOST; REJECTED PROPOSAL DOES NOT APPLY; source removal retracts or regrades the claim (never preserves by inertia); unrelated source change leaves unrelated owner customization untouched; private data never becomes public through regeneration.

**P5: READABILITY PROOF (hours 60-80 integration).**
- From the SAME object graph produce: HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, AVAILABLE_CAPABILITIES. Do NOT scrape rendered HTML back into Markdown; each projection reads governed state. Readability separated from actuation: AVAILABLE_CAPABILITIES describes what an agent may request through authorized channels; it grants nothing. Measure per projection: correctness, evidence correctness, tokens, latency, unsupported claims, tool selection. Projection drift (E5) is a hostile-test target in 80-95.

**Hours 80-95: HOSTILE TEST / REPLAY / FAILURE RECOVERY.** This sprint supplies the product code and the replay fixtures; the tests sprint owns the hostile battery and falsification. Targets: unsupported factual claims, plausible filler, source conflicts, projection drift, correction survival under reobservation, visibility leakage across viewer contexts, restart of :3100 mid-loop with state intact.

**Hours 95-100: DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF.** Paste-URL-to-regeneration demo on a real site; evidence package (OWNER REQUEST -> REACHED -> DURABLE -> EXECUTED -> VERIFIED -> EXPLAINABLE -> RESTART-PROVEN) for each of the seven output statements; delete dead experiments; handoff to the integrated proof.

---

## 12. EXPLICIT NON-GOALS

- **No Wix.** No general page editor, no schema-driven admin CMS, no website-builder libraries as product choices. SiteSpec remains the IR.
- **No scraping our own HTML back into Markdown.** Every projection reads the object graph, never another projection.
- **This sprint never declares itself green.** The tests sprint owns falsification and the gold set; this sprint builds the product path. JEV may route a failure; JEV may not mark it fixed; the executable test does that.
- **No JEV in the production answer path.** JEV is the judgment/evaluation plane, never test truth, never authority; tenant identity is excluded from JEV; only safe evaluation metadata persists.
- **No new authorities, stores, schedulers, event stores, workflow engines, or tenant models.** No reopening of the green renderer/browser boundary.
- **No outreach.** The FYD owner shortlist + draft outreach are Nolan-gated; Monument View is no-autonomous-contact. This sprint makes the owner loop owner-READY (mechanics, regeneration, survival); it does not contact owners.
- **No MC shell changes.** The served proof rides the existing :3100 serve path; this sprint does not modify Mission Control.

---

## 13. ACCEPTANCE TESTS

Integration-truth terms. Each of the seven output-contract statements closes only when demonstrated live against served reality (Nolan's "prove it" standard): OWNER REQUEST -> REACHED -> DURABLE -> EXECUTED -> VERIFIED -> EXPLAINABLE -> RESTART-PROVEN + first broken edge named.

Concrete: an owner correction typed in plain English reaches the SitePatch pipeline, persists durably (draft/published revision), executes through approval, is verified on the served page AND in a second Ask FYD answer, is explainable via WHY THIS (full SourceBinding chain), survives a :3100 restart, and the writer can name the first step that would break under a defined hostile input.

### Epistemic and owner-loop invariants (binding, falsifiable)
- NO SUPPORTING EVIDENCE -> NO ASSERTED FACT. Remove all evidence for proposition P; Ask FYD must not assert P. Add contradictory evidence; the answer becomes CONFLICT/UNCERTAIN, never fabricated consensus.
- UNBOUND factual render fails closed at the emission gate.
- OWNER CORRECTION IS NOT LOST. HIDE IS NOT LOST. REJECTED PROPOSAL DOES NOT APPLY. APPROVED PATCH BINDS EXACT PROPOSAL.
- PRIVATE DATA NEVER BECOMES PUBLIC THROUGH REGENERATION. An owner-hidden or private field never reaches the public ViewerContext, across ask answers, WHY THIS, and regenerated renders.
- SOURCE REMOVES supported fact -> the fact retracts or regrades to UNSUPPORTED; it does not silently persist as direct source truth.
- Same (SiteSpec, ObjectGraph, ViewerContext class, renderer version) -> same semantic RenderModel. Ephemeral presentation state (timestamps, hydration IDs, browser dimensions) is excluded from the digest; stable tie-breakers for ordering.
- Generated presentation copy is always typed GENERATED_PRESENTATION (or derived/inferred/owner_authored as appropriate) and can never masquerade as observed fact.
- Demo owner mode stays visibly marked as simulated, server-gated where possible, incapable of provider writes or sensitive operations.

### Falsifiability questionnaire (answered per major claim before claiming done)
WHAT INVARIANT? / WHO OWNS IT? / HOW CAN IT FAIL? / WHAT ATTACK DISPROVES IT? / WHAT EVIDENCE PROVES IT? / CAN IT BE REPLAYED? / DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE?
Example (P4 correction survival): INVARIANT: owner correction survives source reobservation + regeneration. OWNER: `src/fyd/customize/apply-layer.ts`. FAIL: reobservation diff overwrites the corrected field. ATTACK: correct a phone number, re-run acquisition with the old number in source, regenerate, re-ask. EVIDENCE: served page + answer show OWNER SAYS Y with SOURCE SAYS X preserved in evidence. REPLAY: SitePatch proposal digest + revision history. REGRESSION: minimized case becomes a permanent fixture.

---

## 14. HOSTILE TESTS

This sprint CONSUMES the hostile battery; the tests sprint OWNS and runs it. This sprint's writers produce the product code, the replay fixtures, and the minimized-failure writeups that a falsified claim hands back. Target classes:

- **Unsupported factual claims:** every gold-set question designed with unsupported-claim traps; emission-gate refusal verified at the boundary, not after generation.
- **Plausible filler:** ask-answer runs where the model is tempted to complete a partial service list from training memory; the answer must refuse the unbacked items or type them INFERRED with derivation recorded.
- **Source conflicts:** contradictory source evidence for one proposition; the answer becomes CONFLICT/UNCERTAIN, never fabricated consensus; WHY THIS surfaces both lanes.
- **Projection drift:** HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, AVAILABLE_CAPABILITIES compared claim-by-claim against the object graph; any drift is a P1 defect in the projection, never patched by editing another projection.
- **Correction survival under reobservation:** P4 invariants attacked by re-ingesting the pre-correction source; conflict resolution silently picking source fails the test.
- **Visibility leakage:** owner-hidden fields probed through every public path after regeneration (ask answers, WHY THIS, regenerated renders).
- **Malicious source URLs and prompt injection in acquired content:** acquired prose must not alter answer behavior or reach the owner loop; extraction never executes untrusted instructions.

Failure routing: a falsified product claim comes back to this sprint's writers as a reproducible executable failure with invariant, seed, minimal counterexample, and owning primitive. This sprint does not declare itself green.

---

## 15. REPLAY/RECOVERY TEST

**Regeneration with correction survival is the replay proof.** Given a SitePatch proposal digest + revision history + the reobservation record, a fresh checkout replays: source reobservation -> diff -> safe regeneration -> owner override survival, and arrives at the same semantic RenderModel. The :3100 served path restarts mid-loop (via the sanctioned start-3100.sh protocol, demo-owner flag verified live, never hand-restarted) with zero correction/hide/customization loss. UNKNOWN replays as UNKNOWN: if the reobservation record is incomplete, the system reports the gap instead of inventing the missing evidence.

---

## 16. OBSERVABILITY

- Every ask answer carries its evidence refs + epistemic status (SUPPORTED/DERIVED/INFERRED/UNKNOWN) in the served envelope; every emitted claim is traceable CLAIM -> EVIDENCE -> SOURCE -> OBSERVED AT.
- WHY THIS exposes the SourceBinding chain on demand; no silent unbound factual values anywhere in the served path.
- SitePatch proposals carry digest + tenant + revision history; every applied correction is replayable from its digest.
- Regeneration emits a diff record: what changed in source, what was regraded, what owner state survived, what was proposed as REGEN_PROPOSED vs applied.
- P5 projections carry per-projection measurements: correctness, evidence correctness, tokens, latency, unsupported claims, tool selection.

---

## 17. DEMO

**Paste URL -> trusted generated presence -> Ask FYD -> evidence -> correction -> conversational change -> regeneration**, demonstrated live on a real site: Nolan (or the standing operator) pastes a URL; the compiler produces the served presence; a visitor asks "What services does this business offer, and how do you know?"; the answer cites evidence with WHY THIS visible; the owner corrects a fact in plain English ("Move emergency services first."); the correction applies through the digest-bound seam; a second observation regenerates without destroying the correction; HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, and AVAILABLE_CAPABILITIES are shown from the same object graph. Nothing in the demo is mock; every number on screen is evidence-backed or labeled UNKNOWN.

---

## 18. ROLLBACK

- SitePatch draft/published lifecycle is the rollback surface: every applied patch carries a revision; a rejected or regretted change rolls back to the prior revision through the same digest-bound approval seam, never by hand-editing state.
- Regeneration is never destructive: REGEN_PROPOSED is reviewable before REGEN_APPLIED; owner state (corrections, hides, customizations) is never merged away by a bad regen because it lives in the apply layer, not in the regenerated fields.
- Acquisition adapter changes (readability L1, Playwright L2) roll back by reverting to the bounded-slot predecessor behind the same interface; harvest evaluations ship ADOPT only after the interface boundary holds.

---

## 19. DELETE/FREEZE LIST

- **Delete at 95-100:** dead harvest experiments that did not reach ADOPT/WRAP/ADAPT; provisional extraction rules that the deterministic Service-object path supersedes; any scratch projection code that reads another projection instead of the object graph (E5 violations are deleted, never adapted).
- **Freeze:** the renderer/browser boundary stays green and untouched; the AskFydAnswerContract version stays pinned once frozen at hours 10-20; the owner-correction state machine stays frozen once the tests sprint's state-model tests reference it.
- **Writer/mutation-owner proposal (max 4 writers, one mutation owner per surface; read-only falsifier lanes run in parallel):**
  1. **Ask-path writer:** owns `src/fyd/ask/**` (contract, answer, context-builder, context-compiler, concierge, visitor-answer, visitor-safe-fields, envelope, field-conflicts, capabilities) and co-owns the emission-gate wiring in `src/fyd/claim/` with the claim owner. Delivers P0. Must not touch `src/fyd/ask/__tests__/` (tests sprint) or claim grading semantics without the claim owner.
  2. **Binding/WHY THIS writer:** owns `src/fyd/sitespec/binding-verifier.ts` (+ sitespec IR surface; the SiteSpec contract mutations), `src/fyd/object/why-this-steps.ts`, `src/fyd/ui/why-this.tsx`, `src/fyd/lineage/tracer.ts`. Delivers P1 including the T7 stable-ID fix. Must not touch the design-system compiler's "no arbitrary CSS" law or the renderer.
  3. **Owner-loop writer:** owns `src/fyd/sitepatch/**` (pipeline, approval-seam, types) + `src/fyd/customize/**` (owner-command-compiler, owner-proposal, apply-layer, write-boundary, intent, server). Delivers P2, P3, P4. Must not touch the approval authority's tenant/capability gates (P0 owners).
  4. **Extraction writer:** owns `src/fyd/proceduralize/**`. Delivers the E1 fix (P0 support). Must not touch the acquisition policy gate or the fetch seam (acquisition owner; T1 convergence thread is open, not this sprint's to close).
- **Collision boundaries (do not cross):** FYD product sprint writers own the two-site compiler, renderer, design-system compiler (green and off-limits). Testing-ladder writers own all `__tests__` under FYD surfaces, the gold set, fast-check/Stryker/Testcontainers harnesses, the `ping-askfyd-gold` worktree. Mission Control wiring writers own the :3100 serve path and MC shell. Harvest lanes stay inside the bounded evaluations above.

---

## 20. DEPENDENCIES ON OTHER FIVE SPRINTS

Each named with what this sprint needs from it and gives to it.

1. **TenantOS (01).** NEED: the tenant-on-proposal primitive stays intact so SitePatch proposals carry immutable tenant context; the capability vocabulary is readable so AVAILABLE_CAPABILITIES can project it (read-only). GIVE: the SiteSpec contract's visibility decision model (OBSERVED VISIBILITY / OWNER VISIBILITY DECISION / EFFECTIVE PROJECTION VISIBILITY) as a concrete consumer of tenant-scoped projection policy.
2. **Mission Control wiring (02).** NEED: the :3100 serve path stays stable; the served Ask FYD proof rides it. GIVE: the ask/why-this/correct loop as live product content for Mission Control's operating surface; owner corrections as governed events the continuity surface can display.
3. **ORCA (03).** NEED: nothing in this 100 hours (this sprint does not depend on the worker contract). GIVE: the compiler as a bounded executor class for future website research missions; finding sets may become an Ask FYD evidence source in a later cycle, not this one.
4. **JEV (05).** NEED: nothing in the production path (JEV stays shadow). GIVE: the Ask FYD served baseline and its gold-set answers as JEV's first real product workload; shadow rerank results may inform relevance tuning of the retrieval baseline if delivered. JEV judges Ask FYD outputs in shadow; the baseline remains production authority.
5. **Tests (06).** NEED: the tests sprint owns the Ask FYD gold set (20-50 questions, required/allowed evidence, forbidden claims, expected epistemic status per question), the hostile battery against this path, and falsification. GIVE: the product code the gold set runs against, the served path, the owner-loop mechanics, regeneration, replay fixtures, and minimized-failure writeups. This sprint builds the product path; the tests sprint falsifies it.

**Integrated proof contribution (the seventh deliverable):** this sprint delivers the FYD OBJECT/SITE EFFECT half of the master scenario: ORCA's findings become a SiteSpec proposal through the digest-bound seam, JEV judges supported vs unsupported changes in shadow, Mission Control shows the proposal and evidence, the owner approves, PING records the governed transition, FYD regenerates, verification checks the rendered result, and the outcome appears in Mission Control. This sprint's P2-P4 machinery is the effect channel; it does not invent a second one.

---

## 100-HOUR EXIT

Paste URL -> trusted generated presence -> Ask FYD -> evidence -> correction -> conversational change -> regeneration, with both human and agent representations generated from the same semantic state. Every statement in the output contract is demonstrated live at OWNER REQUEST -> REACHED -> DURABLE -> EXECUTED -> VERIFIED -> EXPLAINABLE -> RESTART-PROVEN, with the first broken edge named for each.

---

## Local recon notes for writers

- Pig WSL access: `~/workspace/bin/pigwsl-exec '<bash command>'` (never through muse-ssh). pigwsl-exec strips literal single-quoted substrings; construct quotes programmatically or avoid them.
- :3100 restarts ONLY via `/home/nolan/start-3100.sh` with `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live afterward. Demo owner mode stays visibly marked as simulated and incapable of provider writes.
- Read the gold set in `ping-askfyd-gold` (branch `testing/askfyd-gold-2026-09-30`); never write to that worktree.
