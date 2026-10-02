# FYD Archaeology: Item Candidates (read-only extraction, 2026-09-22)

## SOURCES REVIEWED
1. `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` (2026-09-21) — Ask FYD vs actual graphs: adversarial probe, contract, gaps.
2. `~/workspace/fyd-lane/website-builder-authority-decisions.md` (2026-09-21, Nolan's CEO decisions) — media, owner mode, Ask FYD, gates, layer separation, build sequence.
3. `~/workspace/fyd-lane/service-semantics-harvest.md` (2026-09-21) — Service/Offer schema ids, predicate vocabulary, deterministic ID law, dormant inventory.
4. `~/workspace/fyd-lane/claim/{types,machine,verification-seam,store}.ts` + `__tests__/` (2026-09-21) — resource-claim state machine.
5. `~/workspace/fyd-lane/onboarding/anonymous-preview.ts` + `__tests__/` (2026-09-21) — paste-URL preview, SSRF boundary, rate limiting.
6. `~/workspace/fyd-lane/lane-media-b/proof/PROOF.md` + `src/` + `tests/` (2026-09-21) — managed media pipeline for both demo sites.
7. `~/workspace/fyd-lane/wave2/WAVE2-REPORT.md` + `wave2/STATE.json` + `wave2/evidence/lane-e-proof-2026-09-21.md` (2026-09-21/22) — browser proof, Lane E partial (persistence FAIL).
8. `~/workspace/fyd-lane/builder/work-phase23/{overrides-patch-loop.test.ts,reapply-checklist.md,patch-loop.ts,overrides-route.ts,ask-classes-tenant.test.ts,owner-panel.tsx,owner-panel-sketch.md}` (2026-09-22) — owner patch loop, Ask classes.
9. `~/workspace/fyd-lane/builder/{AGENT-CONTRACT.md,CRX-DOCTRINE.md,SECTION-ROUTING.md,STATE.json}` (2026-09-21/22) — execution doctrine, 58-section routing.
10. `~/workspace/fyd-binding-verifier/bindings.test.ts` + append-graph.ts.txt (2026-09-21) — projection-seam verifier tests.
11. `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` (2026-09-21) — Top-15 reuse table + G0-G10 gaps.
12. `~/workspace/fyd-lane/harvest-ecosystem.md` (2026-09-22) — vercel-labs/json-render, puck, openpage, Webstudio, Vercel AI SDK, Crawl4AI, Lightpanda verdicts.
13. `~/workspace/f7-evidence/{01-ts-js-drift,02-era-census-and-bridge,03-failing-corpus}.md` + `~/workspace/f7-patch/01-f7b-build-and-verification.md` (2026-09-18) — canonicalization hardening.
14. `~/workspace/evidence-binding.md` (2026-09-18) — ORCA autonomy forensics (used only as background on evidence discipline).
15. Memory: `memory/2026-09-21.md` (L1015/L1017/L1404/L1481/L1492/L1549/L1803), `memory/2026-09-22.md` (L359/L450), `MEMORY.md` FYD harvest directive.

## SOURCES UNAVAILABLE
- Live FYD repo code at `/home/nolan/projects/ping` (only workspace mirrors/readouts accessible; replay commands in ask-fyd-evidence-gap.md and base state in reapply-checklist.md are Pig-side).
- `~/workspace/BACKLOG_NOLAN.md` — off-limits per task.
- Pig-side Phase 2+3 files pending bridge re-apply (base state verified 2026-09-22 ~08:40 UTC on branch `fyd/builder-composition`, HEAD `c4652be2`).

## CONTRADICTIONS / NOTABLE READINGS
- `ask-fyd-evidence-gap.md` (fyd/ask layer) records `AskAnswer` as missing `claim_classifications` / `unknowns` / `source_urls`, but `builder/work-phase23/ask-pipeline.ts` tests assert `answerClass` ("supported"/"derived"/"unknown"), citations, and owner-correction integration. Different layers (composer vs. route pipeline) — the pipeline may have superseded the gap, but no doc states this. Treat as PROVE, not conflict.
- Wave 2 Lane E reports persistence FAIL (server lacked `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`) while `overrides-patch-loop.test.ts` asserts the full loop green under jest. Config/env gap, not logic contradiction.
- Memory `memory/2026-09-22.md#L450` claims Ask FYD has "prompt-hijack guards"; I found no code-level evidence in workspace readouts. PROVE item.
- Service predicate vocabulary is genuinely inconsistent (not a doc error): schema declares `provides`, proceduralizer emits `offers`, generator matches both; `makes_offer`/`serves_area` emit but are never consumed.

---

## DOMAIN: ASK FYD / CONSULTING CONCIERGE

**1. ID:** askfyd-service-extraction-broken-step | DOMAIN: ASK FYD | STATUS: PROVE | PRIORITY: 1
- WHY: The adversarial probe ("What services does this business offer, and how do you know?") correctly refuses on both demo graphs (partial=true, no guess). The Ask layer is not broken; the EVIDENCE->SERVICE OBJECT extraction is. Service facts exist only as free prose in business `description`, never as Service objects, so the composer's only-correct behavior is refusal.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §§1-4 (2026-09-21): `ping.social.service@1` count = 0/0 on both machine-generated fixture graphs; first-broken-step = extraction/resolution, NOT the composer.
- DEPENDENCIES: `askfyd-extraction-service-objects` below; proceduralizer Stage 9 block (`proceduralizer.ts:848-876` per service-semantics-harvest.md).
- ACCEPTANCE: A Service-extraction lane emits `ping.social.service@1` objects from structured sources with own evidence refs; re-running the fixed question returns a cited, classified answer with evidence_refs and source_urls instead of a refusal.
- NEXT FALSIFICATION: Re-run the temporary-probe recipe (gap doc §7) on current graphs; if it now answers services confidently from `description` prose instead of objects, the no-fabrication invariant is broken.

**2. ID:** askfyd-extraction-service-objects | DOMAIN: ASK FYD | STATUS: OPEN | PRIORITY: 1
- WHY: Closing the first broken step requires emitting Service objects from JSON-LD `Service`/`Product` entities (the one live path), and deciding whether description-prose mining is permitted (explicitly NOT in the answer layer).
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §8 (2026-09-21): "Next lane work: extraction emits Service objects from structured sources (not by parsing description prose in the composer)." `~/workspace/fyd-lane/service-semantics-harvest.md` §5 (2026-09-21): exact hook-in = Stage 9 PROJECT service/product block; reuse deterministic id scheme `${businessId}-service-${sha256Hex(entityKey).slice(0,12)}` + `offers` predicate + `DIRECT_FACT` fields.
- DEPENDENCIES: `askfyd-service-extraction-broken-step`; predicate settle (`objectgraph-predicate-vocabulary`).
- ACCEPTANCE: Service objects exist on both demo graphs with `proceduralizer:project:service:<entityKey>` evidence refs; answer composer picks them up without prose parsing.
- NEXT FALSIFICATION: Emit a service object whose entityKey is derived from free prose rather than a structured node; the determism contract (same bytes+observedAt -> same ids) should reject it at review.

**3. ID:** askfyd-answer-schema-gaps | DOMAIN: ASK FYD | STATUS: PROVE | PRIORITY: 2
- WHY: The recorded contract requires `AskAnswer` to carry `claim_classifications` per sentence, a separate `unknowns` list, and explicit `source_urls` (not URLs embedded in detail strings). The fyd/ask-layer `AskAnswer` (types.ts:310) had none of these.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §5 (2026-09-21). Caveat: `builder/work-phase23/ask-classes-tenant.test.ts` asserts answerClass/citations on the route pipeline — may already supersede; verify before rebuilding.
- DEPENDENCIES: ask-layer vs route-pipeline reconciliation.
- ACCEPTANCE: A single documented `AskAnswer` shape carries all three fields end-to-end; gap doc or pipeline doc updated to reflect which layer closed it.
- NEXT FALSIFICATION: Produce an Ask answer citing [n] where citation n lacks a claim_class; the contract is still open.

**4. ID:** askfyd-question-classes | DOMAIN: ASK FYD | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The required classes exist and are tested: SUPPORTED (direct answer with evidence), DERIVED (explicitly labeled, tied to evidence), UNKNOWN ("I do not know from the evidence I have"); inference never silently becomes fact.
- EVIDENCE: `~/workspace/fyd-lane/builder/work-phase23/ask-classes-tenant.test.ts` (16 tests, 2026-09-22): `answerClassFor` mapping unit tests; `claimClassFor` maps DIRECT_FACT->supported, DERIVED_FACT/INFERENCE/GENERATED_COPY->derived; memory `memory/2026-09-21.md#L1803`.
- DEPENDENCIES: `evidence-fact-classifications`.
- ACCEPTANCE: Every Ask answer reduces to exactly one of the three classes; any derived citation forces answer-level "derived".
- NEXT FALSIFICATION: An Ask answer containing a GENERATED_COPY claim classified "supported" — reducer must catch it.

**5. ID:** askfyd-refusal-adversarial-pass | DOMAIN: ASK FYD | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: The invariant "never invent business facts to be helpful" has a live adversarial proof: the services question returns `partial: true` with the consulted evidence list rather than a fabricated answer.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §3 (2026-09-21): "Adversarial result: PASS"; `noEvidenceAnswer` path in `src/lib/ping/ask-composer.ts`; Wave 2 lane-e evidence: `ask_fyd_services: PASS honest unknown`.
- DEPENDENCIES: none.
- ACCEPTANCE: Re-running the probe on unchanged graphs still refuses; consulted refs listed.
- NEXT FALSIFICATION: Same question on an unchanged graph yields services prose — composer's services-intent branch must be re-audited.

**6. ID:** askfyd-conflict-surfacing | DOMAIN: ASK FYD | STATUS: OPEN | PRIORITY: 2
- WHY: Required semantics say CONFLICT -> "surface the conflict" (keep both claims). Refresh lane has `conflict.ts` with keep-both-claims resolution, but I found no Ask-pipeline code or test that surfaces source disagreement to the asker.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` (2026-09-21, §Visitor Ask FYD); `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` (refresh lane rows, conflict.ts 107 lines, 21/21 tests); zero conflict mentions in `builder/work-phase23/ask-*`.
- DEPENDENCIES: `evidence-source-disagreement` (refresh machinery); hours-conflicting fixture already exists in owner-review plan.
- ACCEPTANCE: Ask FYD on a field with two conflicting claims (e.g., conflicting hours) answers with BOTH claims, provenance, and a resolution pointer; never silently picks a winner.
- NEXT FALSIFICATION: Craft a graph with conflicting phone claims; if Ask answers one number without surfacing the conflict, the item is still open.

**7. ID:** askfyd-cross-object-reasoning | DOMAIN: ASK FYD | STATUS: OPEN | PRIORITY: 2
- WHY: Cross-object reasoning (question -> target object -> related graph) is bounded at 8 related objects / 20 relationships / 500-char fields; the bounds exist but multi-hop reasoning quality (e.g., "which service relates to which location?") is unproven.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §5 (2026-09-21, input contract); `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` context-builder row (single choke point, digest binding).
- DEPENDENCIES: object graph richness (more relationship predicates wired).
- ACCEPTANCE: A multi-hop question ("Does this business serve my city, and for which services?") is answered by traversing business->services->areas with per-hop citations.
- NEXT FALSIFICATION: Ask the same question with the related bound reduced to 0; if the answer quality does not change, the composer is not actually reasoning across the graph.

**8. ID:** askfyd-owner-context-mode | DOMAIN: ASK FYD | STATUS: PROVE | PRIORITY: 2
- WHY: Owner-mode Ask FYD ("Make emergency service more prominent.") should receive authorized owner context while visitor mode is public-only; memory says "owner mode may receive authorized owner context," but workspace evidence shows only capability-gating on grants, not an owner-context content seam.
- EVIDENCE: memory `memory/2026-09-21.md#L1549` and `#L1803`; `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Owner Ask FYD; `src/fyd/ask/capabilities.ts` strips forbidden effects (harvest doc).
- DEPENDENCIES: `owner-demo-owner-mode` (ViewerContext/OwnerContext boundary).
- ACCEPTANCE: Owner Ask query returns the owner-correction-aware answer (reapply-checklist E2 expects exactly this: corrected phone cited as owner override) in owner mode, and the source-only answer in visitor mode.
- NEXT FALSIFICATION: Run the reapply-checklist E2 test; if owner mode leaks owner corrections to the visitor-mode answer, the boundary is wrong.

**9. ID:** askfyd-prompt-hijack-guards | DOMAIN: ASK FYD | STATUS: PROVE | PRIORITY: 1
- WHY: Memory claims Phase 2 Ask FYD "includes prompt-hijack guards," but no workspace readout shows the guard code or a test for it. Unverified security claim = risk.
- EVIDENCE: memory `memory/2026-09-22.md#L450` (claim) vs. absence in `builder/work-phase23/*` and `fyd-lane/ask-fyd-evidence-gap.md` (deterministic, no-LLM composer: `detectSitePatchIntent` keyword-anchored; the current answer path may need no hijack guard at all if no LLM is in the loop).
- DEPENDENCIES: Vercel AI SDK adoption decision (`harvest-vercel-ai-sdk`) — hijack risk changes the day a model enters the answer path.
- ACCEPTANCE: Documented verdict: either the guard exists with a test, or "no LLM in the answer path => guard N/A" is recorded explicitly.
- NEXT FALSIFICATION: Find any live route where model text reaches the answer renderer; if none exists, the claim dissolves.

**10. ID:** askfyd-suggested-actions | DOMAIN: ASK FYD | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: The contract requires capability-gated `suggested_actions: PlannedAction[]` and a draft-only `proposal` bound to a siteSpecDigest. The action planner (pure viewer,target,grants -> actions; unplannable actions never render) and site-patch drafting (digest-bound, agent drafts, never mutates) both exist and test green (36/36 ask-fyd tests).
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §5; `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` Top-15 rows 8-10 (site-patch.ts, action-planner.ts, grants.ts).
- DEPENDENCIES: `owner-approval-digest-binding`.
- ACCEPTANCE: Ask answers that propose changes always return a digest-bound draft proposal; approving a stale draft fails with the stale-rejection path, never applies.
- NEXT FALSIFICATION: Propose a site patch via Ask, regenerate the spec, then approve the old proposal: must reject (stale), not apply.

**11. ID:** askfyd-outcome-history | DOMAIN: ASK FYD | STATUS: OPEN | PRIORITY: 3
- WHY: "Outcome history" (what the concierge suggested, what happened) is a named required item; no outcome tracking exists in FYD today (harvest G9: no conversion/outcome signals; review-triggered outreach lives in the outreach machine, not FYD).
- EVIDENCE: Task prompt domain list; `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` G9 (2026-09-21); `~/workspace/fyd-lane/builder/SECTION-ROUTING.md` lists "the flywheel" as FUTURE CONTRACT (R12).
- DEPENDENCIES: refresh lane outcomes (change detection) as the substrate.
- ACCEPTANCE: An Ask-suggested action that the owner approves is recorded with outcome state; later Ask queries can reference it.
- NEXT FALSIFICATION: Approve a proposal twice; if there is no record of the first approval anywhere an agent can query, the item stands.

---

## DOMAIN: OWNER CUSTOMIZATION

**12. ID:** owner-patch-loop-persistence | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: The full loop (propose -> preview -> apply -> reload survives -> revert -> reload survives) is the morning-proof centerpiece, but Wave 2 Lane E closed PARTIAL: persistence FAILED because the server lacked `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` (`POST /api/fyd/customize` -> `demo_owner_mode_required`); owner convergence NOT RUN.
- EVIDENCE: `~/workspace/fyd-lane/wave2/WAVE2-REPORT.md` §Lane E + `wave2/STATE.json` E lane results (`customize_persist: FAIL`) (2026-09-21/22).
- DEPENDENCIES: `owner-demo-owner-mode` env; builder work-phase23 route tests green under jest but untested against the live server with the env set.
- ACCEPTANCE: On the running server with owner mode enabled: apply -> reload shows the change; revert -> reload shows the original; digests named per A10.
- NEXT FALSIFICATION: Enable the env var, run the exact loop; if reload still restores the original, the durable store is not actually on the server path.

**13. ID:** owner-approval-digest-binding | DOMAIN: OWNER CUSTOMIZATION | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: Owner approval binds tenant+actor+baseStateDigest+baseViewDigest+patchDigest+resultDigest; tampered commands, missing digests, and stale bases are refused fail-closed with nothing written. Adversarial tests confirm body-supplied actor claims are ignored (server-seeded demo actor applies).
- EVIDENCE: `~/workspace/fyd-lane/builder/work-phase23/overrides-patch-loop.test.ts` (2026-09-22): `approval_not_bound` 400s, `patch_mismatch` 400, `stale_proposal` 409 (two variants: state moved, view moved), tenant_mismatch/invalid_tenant 400s, revert restores original, G4 mallory-actor test.
- DEPENDENCIES: `owner-demo-owner-mode`; canonical serializer for digests.
- ACCEPTANCE: All refusal paths verified; approval record carries all six bindings and an eventId.
- NEXT FALSIFICATION: Replay a captured approve request after state moved; must 409, not apply.

**14. ID:** owner-demo-owner-mode | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: Explicit DEMO OWNER MODE is the authorized interim: visibly labeled (demoNote on every response incl. refusals), tenant-scoped to the two test tenants, never confusable with production auth; mutations run through the normal proposal/transition seams; one ViewerContext/OwnerContext boundary, no scattered `if (demoMode)` conditionals.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Owner mode (2026-09-21); `builder/work-phase23/overrides-route.ts` demoLabel helper + reapply-checklist E2-E3 (every response carries it); memory `memory/2026-09-22.md#L359`; harvest directive MEMORY.md#L184.
- DEPENDENCIES: real owner auth boundary (separate lane; claim machine + verification seam below).
- ACCEPTANCE: Components ask `can(viewer, ...)`; grep finds zero `demoMode` conditionals in component code; demo label present on every mutation response; demo context cannot claim the two demo businesses as ownable (claim machine DEMO_CONTEXT_IDS refusal).
- NEXT FALSIFICATION: Grep components for `demo` conditionals outside the route seam; any hit violates the single-boundary rule.

**15. ID:** owner-claim-verification-ladder | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: Ownership of a site is evidence-bearing state: OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED with an append-only audit history, distinct from mere login. Only operator-attestation is implemented today; dns-txt / well-known-file / html-meta-tag / cms-integration / provider-evidence are declared unimplemented so no caller can mistake them for present.
- EVIDENCE: `~/workspace/fyd-lane/claim/{types,machine,verification-seam,store}.ts` + tests (2026-09-21); claim store is atomic JSON, separate from source state so re-ingestion can never erase a claim.
- DEPENDENCIES: real auth lane reserves IdentityKind "google".
- ACCEPTANCE: State machine transitions fail closed on bad transitions, anonymous claim attempts, and demo-context ids; history appends on every transition.
- NEXT FALSIFICATION: Attempt `claim()` on `happy-place` with a valid identity — must throw "demo-context"; if it succeeds, the labeled-demo guard is broken.

**16. ID:** owner-correction-side-by-side | DOMAIN: OWNER CUSTOMIZATION | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: An owner correction must NOT rewrite history: the owner value applies to the generated presence while the source's value stays recorded as what the source says; Ask FYD answers the corrected value citing the owner override.
- EVIDENCE: `~/workspace/fyd-lane/builder/work-phase23/overrides-patch-loop.test.ts` (2026-09-22): `fieldCorrections.phone` keeps `ownerValue` + `sourceValue` ("+15412865190") + basis ("Owner correction ... source record is unchanged"); reapply-checklist E2 expects Ask FYD to answer the corrected phone as "supported" with an owner-correction citation.
- DEPENDENCIES: `askfyd-owner-context-mode` (E2 test currently missing on the Pig — reapply-checklist notes the ask test was WITHOUT the owner-correction integration test at 08:40 UTC).
- ACCEPTANCE: One owner correction is effective across generated site, Ask FYD, and projection with no divergent truths; the reapply-checklist E2 test passes on the Pig.
- NEXT FALSIFICATION: After an approved phone correction, fetch the generated site and Ask FYD in visitor mode; any surface showing the source value as current truth = divergent-truth failure (stop-and-fix per memory L1492).

**17. ID:** owner-confirm-correct-hide | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: The owner-facing hero is "WHAT FYD THINKS IT KNOWS": name / phone / address-hidden / services / locations / social accounts / team members / hours-conflicting with CONFIRM / CORRECT / HIDE per item — plain-English review, not an admin database table. Section ordering, featured objects, and visibility toggles ride the same proposal seam.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Build sequence (2026-09-21); `builder/work-phase23/owner-panel.tsx` + `owner-panel-sketch.md`; customize intents `reorder_services_first`, `feature_object`, `professionalize` (`src/fyd/ask/site-patch.ts` per harvest doc, 36/36 green).
- DEPENDENCIES: proposal/approval loop; SECTION-ROUTING PROVES item "owner patch loop."
- ACCEPTANCE: An owner can hide a field and reorder the services section conversationally; the change survives regeneration (see next item).
- NEXT FALSIFICATION: Hide the address, regenerate the site from a fresh observation; if the address reappears, owner visibility decisions are not surviving regeneration.

**18. ID:** owner-regeneration-survival | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: Owner overrides must survive source refresh: the stale-detection now binds TWO digests — baseStateDigest (owner state) AND baseViewDigest (composed build view) — so a source refresh under an override yields an explicit STALE PROPOSAL naming which moved, rather than silently clobbering the owner's edit.
- EVIDENCE: `~/workspace/fyd-lane/builder/work-phase23/reapply-checklist.md` (2026-09-22, pending Pig re-apply): buildViewDigest, "STALE PROPOSAL: the build view (source refresh under the override) changed..."; refresh lane dependency-index computes invalidation sets (harvest doc; executor missing per `regeneration-executor`).
- DEPENDENCIES: refresh re-observation; regeneration executor.
- ACCEPTANCE: Re-observe source after an owner correction -> digest-bound approval still applies OR refuses with a named stale reason; the owner's value is never silently replaced.
- NEXT FALSIFICATION: Change the source site's phone, re-run refresh, then re-apply the owner's correction; if it applies without noticing the source moved, the view-digest check failed.

**19. ID:** owner-visibility-not-fact | DOMAIN: OWNER CUSTOMIZATION | STATUS: PROVE | PRIORITY: 2
- WHY: FACT / EVIDENCE / VISIBILITY / DECISION BASIS must stay separate; the pipeline may choose a conservative INITIAL VISIBILITY DEFAULT but never permanently decides "street address is private" — the owner does. This is stated doctrine but I found no code-level initial-default policy or owner-visibility-override store in the workspace readouts.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Owner mode (2026-09-21); `~/workspace/fyd-lane/service-semantics-harvest.md` §4: `visibilityForProperty` classifies at extraction, private withheld before projection; `builder/staging/builder/visibility.ts` exists but was not read.
- DEPENDENCIES: `owner-confirm-correct-hide`.
- ACCEPTANCE: A documented initial-visibility policy + an owner override path where owner decisions are stored as decisions (not fact edits) and survive regeneration.
- NEXT FALSIFICATION: Set visibility HIDDEN on a public field, then re-run the proceduralizer; if the field's visibility resets to the extraction default, decisions are not persisted.

**20. ID:** owner-design-tokens | DOMAIN: OWNER CUSTOMIZATION | STATUS: IN_PROGRESS | PRIORITY: 3
- WHY: Customization includes design tokens, but the token system must stay small (typography, spacing, radius, surface, content width, brand colors, density) with semantic presets; the 8-dimension archetype refactor was explicitly NOT done (named profiles only) and pushed to Builder-2.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Layer separation (2026-09-21); `~/workspace/fyd-lane/builder/SECTION-ROUTING.md` (2026-09-21); `builder/STATE.json` builder_1 caveat: "Eight-dimensional archetype refactor NOT done (named profiles only) -> Builder-2."
- DEPENDENCIES: object-graph + archetypes lane.
- ACCEPTANCE: A typography/token change flows to rendered output while Layer 1 business objects remain byte-identical (the Webstudio-style-source-cascade tiny proof, reimplemented).
- NEXT FALSIFICATION: Change a brand color and diff the object graph; any changed business field means the token change leaked into truth.

**21. ID:** owner-tenant-scoping | DOMAIN: OWNER CUSTOMIZATION | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: Every mutation is tenant-scoped: the tenant comes from the trusted route path; body tenant claims that disagree are refused with nothing written; invalid route tenants are refused before any I/O.
- EVIDENCE: `~/workspace/fyd-lane/builder/work-phase23/overrides-patch-loop.test.ts` G4 tests (2026-09-22); SECTION-ROUTING PROVES: tenant isolation contract with adversarial A-vs-B guessed-ID matrix, RLS DESIGNED/PORTABLE CONTRACT NOT IMPLEMENTED (A1).
- DEPENDENCIES: none at current layer; Postgres RLS is FUTURE CONTRACT.
- ACCEPTANCE: Guessed-ID cross-tenant writes fail; demo-context resources refuse claim.
- NEXT FALSIFICATION: Call the overrides route for coppersmith with a happy-place body tenant; must 400 tenant_mismatch with no write.

---

## DOMAIN: MEDIA

**22. ID:** media-managed-derivatives | DOMAIN: MEDIA | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: The architecture decision (download + digest + derivative; hotlink fallback only; authorized demo businesses only) is implemented and proven on both demo sites: 11 coppersmith images acquired, manifest-referenced, WebP derivatives, digest-addressed URLs; honest zero-media state for happy-place (off-origin Google logo rejected).
- EVIDENCE: `~/workspace/fyd-lane/lane-media-b/proof/PROOF.md` (2026-09-21): provenance chain (source -> observed -> digest `36e4ff5c...942eba668` -> `/fyd-media/<digest>/thumbnail-400w.webp`); rights gate rejected 4 observations; tsc exit 0; media suites 5/5, 43/43.
- DEPENDENCIES: binding directive MEMORY.md#L184 (media decision); safe-fetch boundary.
- ACCEPTANCE: Every rendered media URL resolves through the media record; provenance API returns the full chain; 404 for reference-only.
- NEXT FALSIFICATION: Request the provenance API with a reference-only (unfetched) digest; must 404, not synthesize a record.

**23. ID:** media-ssrf-boundary | DOMAIN: MEDIA | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: Remote-media fetching is an SSRF boundary: public origins only; reject localhost/loopback/RFC1918/link-local/metadata endpoints, file:/data:/javascript:, credential-bearing URLs, hostile redirects into private space; size/type/timeout/redirect limits.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Media (2026-09-21, harvests Cloudflare allowed-origins pattern); lane-media-b `safe-fetch.ts`/`src` (15MB/20s/5 redirects, SVG rejected, byte-parsed via sharp 8000px/64Mpx cap); `onboarding/anonymous-preview.ts` safeFetchPage (DNS-destination checks, CGNAT blocked).
- DEPENDENCIES: none.
- ACCEPTANCE: Adversarial fetch attempts (link-local, redirect-to-private) return ok:false and are never fetched.
- NEXT FALSIFICATION: Point ingestion at a metadata-endpoint URL; any 200-fetched body = boundary failure.

**24. ID:** media-rights-policy | DOMAIN: MEDIA | STATUS: DECISION | PRIORITY: 2
- WHY: Consequential and explicitly unresolved: public fetchability is not FYD-owned IP; rights UNKNOWN unless known; no redistribution as FYD-owned; "For production: media rights/retention policy must become explicit. Do not block this product build on full auth." The task prompt requires: do not settle controversial media policy invisibly — unresolved consequential decisions go to the grill.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Media (2026-09-21); lane-media-b rights gate: "unclear provenance classified before fetch; never acquired"; harvest-ecosystem §Webstudio/Lightpanda AGPL notes (legal-review discipline exists).
- DEPENDENCIES: real owner auth (who can authorize production media).
- ACCEPTANCE: A written production rights/retention policy, or an explicit recorded deferral with owner and date — not silent practice.
- NEXT FALSIFICATION: None available without a grill session; mark for Nolan's grill.

**25. ID:** media-alt-text-depiction | DOMAIN: MEDIA | STATUS: OPEN | PRIORITY: 3
- WHY: Media records should know what they depict, which object they belong to, alt-text evidence/generated status, and featured status. Today media attaches via `represented_by` relationships; the semantic "Use the truck photo for emergency plumbing" (Media M7 -> depicts -> Service S3) is described, not wired.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` §Layer separation (2026-09-21, "Media items should eventually know...").
- DEPENDENCIES: `media-managed-derivatives`; object graph service objects.
- ACCEPTANCE: A media record carries depicts/references bindings to object ids with alt-text source labeled evidence vs generated.
- NEXT FALSIFICATION: Ask FYD "which photo shows the truck" — any answer without a media-object binding is invention.

**26. ID:** media-hero-selection | DOMAIN: MEDIA | STATUS: OPEN | PRIORITY: 2
- WHY: Proven gap: "Page Hero is text-only; no renderer hook selects media into the hero yet. Media surfaces through the semantic presence band, not the generated Page Hero. Wiring the hero through the same selector is next-wave work."
- EVIDENCE: `~/workspace/fyd-lane/lane-media-b/proof/PROOF.md` §Known gaps (2026-09-21).
- DEPENDENCIES: `media-alt-text-depiction` (selector needs depiction knowledge).
- ACCEPTANCE: Hero renders media chosen by the same semantic selector as the presence band, on the eligible demo site.
- NEXT FALSIFICATION: After wiring, render the site with media removed from the graph; hero must fall back to text, not a broken image.

**27. ID:** media-relationship-id-collision | DOMAIN: MEDIA | STATUS: OPEN | PRIORITY: 3
- WHY: Recorded latent defect: "Relationship IDs derive from digest+predicate; multiple targets sharing one media+predicate could collide. Include target identity if it bites."
- EVIDENCE: `~/workspace/fyd-lane/lane-media-b/proof/PROOF.md` §Known gaps (2026-09-21).
- DEPENDENCIES: deterministic ID law (`objectgraph-deterministic-ids`).
- ACCEPTANCE: Two relationships with same media digest + predicate but different targets produce distinct ids (or a documented guarantee they cannot co-occur).
- NEXT FALSIFICATION: Attach one image to two objects with the same predicate; if one relationship overwrites the other, it has bitten.

**28. ID:** media-refresh-and-stale | DOMAIN: MEDIA | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: Source-change detection is digest-based (content digest enables dedup and change detection); stale @1 derivative dirs were quarantined reversibly. A full refresh loop (re-fetch -> compare digest -> regenerate derivatives -> update bindings) is not evidenced.
- EVIDENCE: `~/workspace/fyd-lane/lane-media-b/proof/PROOF.md` §Safety enforcement (2026-09-21): 6 stale @1 dirs quarantined to `quarantine-fyd-media/`; media record answers where-from/when-observed/what-bytes (MEMORY.md#L184).
- DEPENDENCIES: refresh lane observation machinery.
- ACCEPTANCE: Changing a source image changes its digest, triggers re-derivation, and old derivatives are retired (not served).
- NEXT FALSIFICATION: Swap a source image's bytes; if the old derivative keeps serving under the new manifest, refresh is broken.

**29. ID:** media-hotlink-fallback | DOMAIN: MEDIA | STATUS: OPEN | PRIORITY: 3
- WHY: The binding decision says hotlink is "fallback only," but workspace evidence shows only the managed-derivative path (reference-only images 404). The fallback path — when it is allowed, how it is labeled — is not specified or built.
- EVIDENCE: MEMORY.md#L184 media decision (1); lane-media-b provenance API 404s on reference-only.
- DEPENDENCIES: `media-rights-policy`.
- ACCEPTANCE: A documented rule for when hotlink fallback engages (e.g., derivative build failed) with visible labeling that the image is externally hosted.
- NEXT FALSIFICATION: Take down the derivative store; if pages silently render hotlinked originals with no labeling, the fallback is unmanaged.

**30. ID:** media-owner-removal | DOMAIN: MEDIA | STATUS: OPEN | PRIORITY: 2
- WHY: Owners must be able to remove media (takedown/rights); no owner-removal path appears in lane-media-b or the owner panel sketches. HIDE/SHOW semantics cover fields; media removal is a distinct rights operation.
- EVIDENCE: Absence in `~/workspace/fyd-lane/lane-media-b/src/` file list and `builder/work-phase23/owner-panel-sketch.md`; `~/workspace/fyd-lane/website-builder-authority-decisions.md` owner may "hide/show eligible fields."
- DEPENDENCIES: `owner-demo-owner-mode`; `media-rights-policy`.
- ACCEPTANCE: An owner can remove a media item from their site; the media record is retained (provenance/deletion observation) while the render drops it.
- NEXT FALSIFICATION: Attempt removal through the owner panel; if the only option is hiding the whole section, media removal is missing.

---

## DOMAIN: FYD OBJECT GRAPH

**31. ID:** objectgraph-schema-id-drift | DOMAIN: FYD OBJECT GRAPH | STATUS: BLOCKED | PRIORITY: 1
- WHY: Live breakage: the Happy Place fixture carries real journal schemas (`ping.knowledge.*@1`) but generator/validator/registry hardcode `ping.social.*@1`. The generator emits only the explore page (no owner found); 11 tests across 4 suites fail. The "procedural clone of HPP" proof is red in the worktree.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` G0 (2026-09-21): generator.test.ts, patch.test.ts, validator.test.ts, render.test.ts failing; demo route renders explore-only. (Note: ask-fyd-evidence-gap.md §1 confirms the same fixture files were M/uncommitted at inspection.)
- DEPENDENCIES: schema-namespace map/alias layer.
- ACCEPTANCE: All four suites green; demo route renders full pages for both tenants; fix shape = schema map or dual-namespace acceptance — never a third predicate/id scheme.
- NEXT FALSIFICATION: Re-run the four suites; any remaining failure with schema-id in the assertion message means drift persists.

**32. ID:** objectgraph-predicate-vocabulary | DOMAIN: FYD OBJECT GRAPH | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: The relationship predicate vocabulary is half-wired: schema declares `provides`, live emission uses `offers`, generator accepts both; `makes_offer`/`serves_area` are emitted from real JSON-LD @id refs but invisible to section grouping; `area_served` literal has no rendering consumer. A future lane "should not invent a third predicate."
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` §§1-3,7 (2026-09-21): PREDICATE_MAP, ROLE_PREDICATES (`service: ["provides","offers"]`), STRUCTURED-DATA.md lag note.
- DEPENDENCIES: `objectgraph-schema-id-drift` (same consumer contract).
- ACCEPTANCE: One documented predicate per edge role; every emitted predicate has a consumer or a recorded "emitted, unconsumed" reason; no third business->service predicate.
- NEXT FALSIFICATION: Emit a `makes_offer` edge from real JSON-LD and render; if the Services section ignores it, the vocabulary is still split.

**33. ID:** objectgraph-schema-to-everything | DOMAIN: FYD OBJECT GRAPH | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The live "Schema -> Everything" chain: 3 schemas (Business, Service, Post) each drive VALIDATOR, COMPONENT ELIGIBILITY, RELATIONSHIP RULES, CAPABILITY OPTIONS, AGENT TOOL DESCRIPTION from one definition. Adding a schema = adding one definition. This is the anti-100-schemas mechanism.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` row 7 (2026-09-21): `src/fyd/sitespec/schemas.ts`, schemas.test.ts passing.
- DEPENDENCIES: none.
- ACCEPTANCE: A new schema definition automatically appears in validator, registry eligibility, and agent tool descriptions with no per-consumer wiring.
- NEXT FALSIFICATION: Add a fourth schema def; if any of the five derivations requires manual edits, the chain is not closed.

**34. ID:** objectgraph-useful-schemas-set | DOMAIN: FYD OBJECT GRAPH | STATUS: HARVEST | PRIORITY: 3
- WHY: The task demands useful schemas (Business, Person, Service, Product, Location, Post, Project, Profile, ProviderAccount/external identity, Relationship, Reaction, Reference, Proposal/transition) but the standing rule is "do not create 100 schemas prematurely; continue proving Schema -> Everything." Each candidate needs a harvest verdict: needed-now vs later, and its five derivations sketched.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` §7 dormant inventory: `ping.social.offer@1` known-but-dormant; `ping.social.product@1` referenced with no def; coppersmith fixture carries `external_identity` and `person`.
- DEPENDENCIES: `objectgraph-schema-to-everything` (the mechanism new schemas must use).
- ACCEPTANCE: A ranked schema backlog where each entry names its consumer (which section/action needs it) — no schema without a consumer.
- NEXT FALSIFICATION: Propose a schema with no consumer; the rule must reject it.

**35. ID:** objectgraph-provider-account-identity | DOMAIN: FYD OBJECT GRAPH | STATUS: OPEN | PRIORITY: 3
- WHY: External identity representation (ProviderAccount / social accounts: "social accounts 3" in the owner review) is needed for Circle/social projections and for linking same entity across sources, but has no schema def or emission design.
- EVIDENCE: coppersmith fixture includes `ping.social.external_identity@1` (ask-fyd-evidence-gap.md §1); `~/workspace/fyd-lane/portal-circle-spec.md` exists (unread this pass); harvest G1 entity resolution gap.
- DEPENDENCIES: `objectgraph-useful-schemas-set`; `objectgraph-entity-resolution`.
- ACCEPTANCE: A defined external-identity schema with provider, handle, URL, and verification-grade, consumed by at least the owner review surface.
- NEXT FALSIFICATION: Two sources claim different Instagram handles for the same business; without an identity schema the conflict has nowhere to live.

**36. ID:** objectgraph-relate-output-dropped | DOMAIN: FYD OBJECT GRAPH | STATUS: OPEN | PRIORITY: 3
- WHY: Recorded pipeline defect: `relate()` emits `links_to` relationship pairs but `project()` never consumes them; only `located_at` reaches the graph. Either wire it or delete the stage.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` G6 (2026-09-21).
- DEPENDENCIES: none (pure internal consistency).
- ACCEPTANCE: `links_to` pairs reach the object graph with evidence refs, or the stage is removed and its tests updated.
- NEXT FALSIFICATION: Run the proceduralizer on a page with social links; if the graph has no `links_to` relationships, the stage is still dead.

**37. ID:** objectgraph-entity-resolution | DOMAIN: FYD OBJECT GRAPH | STATUS: OPEN | PRIORITY: 2
- WHY: Nothing links the same real-world entity across sources (website business vs Facebook page vs Drive doc): no dedupe, no merge, no identity stitching anywhere in the estate. Field-level conflict resolution exists; entity-level identity does not.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` G1 (2026-09-21): "the refresh lane's synthetic fixture even notes entity matching is assumed."
- DEPENDENCIES: `objectgraph-provider-account-identity` (handles as join keys).
- ACCEPTANCE: Two observations of the same business from different sources resolve to one canonical entity with per-source claims preserved (not merged-destructively).
- NEXT FALSIFICATION: Ingest the same business from its website and its Facebook page; two business objects = still open.

**38. ID:** objectgraph-deterministic-ids | DOMAIN: FYD OBJECT GRAPH | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The website lane deliberately avoids the runtime IdentityAuthority (UUIDv7, non-deterministic) in favor of SHA-256 deterministic ids: business id from sourceUrl+controller+sorted fields, relationships `rel-`+sha256(subject|predicate|object), services `${businessId}-service-`+sha256(entityKey), blank-node keys from canonical JSON. Same source bytes + observedAt -> byte-identical graph.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` §2 (2026-09-21): `proceduralizer.ts:544-576,858`, `structured-data.ts:230-272`, pure-TS `sha256.ts` (browser-safe); Grill 28 verdict documented.
- DEPENDENCIES: canonical serializer pinned (`evidence-canonical-serializer`).
- ACCEPTANCE: Re-projection of unchanged sources dedupes exactly (no id drift across runs).
- NEXT FALSIFICATION: Proceduralize the same site twice; any differing object id without a source change = determinism broken.

**39. ID:** objectgraph-object-in-margin | DOMAIN: FYD OBJECT GRAPH | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: The product centerpiece (2026-09-21 emphasis): one real object rendered in the margin — ObjectRail on desktop, object drawer/sheet on mobile; objects navigable knowledge. Key boundary: object builder decides WHAT IS KNOWN, website builder decides HOW to present it.
- EVIDENCE: MEMORY.md FYD must-wins + `~/workspace/fyd-lane/builder/SECTION-ROUTING.md` PROVES (2026-09-21); `builder/STATE.json` builder_1: ObjectRail + golden route `/build/[siteId]` shipped (commit b0161b1), one real featured object per tenant, zero fixture-route diff.
- DEPENDENCIES: `objectgraph-schema-to-everything`; `media-alt-text-depiction`.
- ACCEPTANCE: Both tenants render a real margin object from the live graph (not fixtures) on desktop and mobile; object builder -> deterministic verifier -> canonical transition path proven.
- NEXT FALSIFICATION: Render the margin object with the graph emptied; if it shows fixture content, it is not object-driven.

---

## DOMAIN: EVIDENCE + PROVENANCE

**40. ID:** evidence-binding-verifier-invariant | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: The critical invariant — every factual rendered value binds to OBJECT FIELD, EVIDENCE-BACKED DERIVATION, OWNER AUTHORED COPY, or EXPLICITLY LABELED GENERATED PRESENTATION COPY — is enforced at the projection seam by `verifyPresentationBinding`, which fails closed (unknown object / unbound field / empty evidence ref / generated-without-generatorRef all resolve to undefined; the caller omits the value).
- EVIDENCE: `~/workspace/fyd-binding-verifier/bindings.test.ts` (2026-09-21): 7 tests trace a real Coppersmith location value through field -> claim -> evidence ref plus 4 injected failures; classifications `direct`/`derived`/`generated`/`owner_authored`.
- DEPENDENCIES: `evidence-fact-classifications`.
- ACCEPTANCE: The unbound-factual-claim test stays green; no rendered factual value lacks a binding.
- NEXT FALSIFICATION: Render a page with a binding whose evidence ref was emptied; the value must disappear, not render.

**41. ID:** evidence-single-authority | DOMAIN: EVIDENCE + PROVENANCE | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: "Do not create a second authority casually": the evidence/object graph defines the factual input space; the binding verifier enforces at the projection seam; the composer only selects and cites. Harvest discipline explicitly rejected creating AdAuthority/ClaimAuthority; json-render's catalog and OpenPage's "single source of truth" were both bent to fit FYD's source/derived/presented layering.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §6 (2026-09-21, "No new ClaimAuthority"); `~/workspace/fyd-lane/harvest-ecosystem.md` cross-cutting record (2026-09-22): "Nothing here becomes a truth, claim, projection, or ad authority."
- DEPENDENCIES: `evidence-binding-verifier-invariant`.
- ACCEPTANCE: A documented authority map naming which existing component owns each invariant; any new authority proposal must pass the harvest review (version, license, duplication, lock-in, canonicality risk).
- NEXT FALSIFICATION: Any lane introduces a parallel claim store or a second serializer into the hot path — reject per the F7-A2 precedent.

**42. ID:** evidence-fact-classifications | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: Every fact carries a class: proceduralizer `FactClass` (DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE, with `fieldClasses` per object), refresh claim grades (`website_statement` / `provider_statement` / `synthetic_fixture`), Ask claim classes (supported/derived/unknown reduction), binding classifications (direct/derived/generated/owner_authored). Two confidence axes: presentation <= fact.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` §4 (2026-09-21); `builder/work-phase23/ask-classes-tenant.test.ts` claimClassFor mapping; SECTION-ROUTING SUPPORTS: "Two confidence axes on claims (presentation <= fact)."
- DEPENDENCIES: none.
- ACCEPTANCE: A GENERATED_COPY sentence can never be classified "supported"/"direct"; the mapping is unit-tested at each layer.
- NEXT FALSIFICATION: Find a rendered sentence whose binding says `generated` without a visible GENERATED_PRESENTATION label — labeling invariant broken.

**43. ID:** evidence-observation-envelope | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The typed vocabulary exists: Claim/Observation/Snapshot types (value, source URL/type, observation time, evidence ref, confidence, grade), deterministic claim ids (sha256 of entity/field/source/normalized), `normalizeClaimValue`/`claimSlotKey` total order, first seen / last seen / last verified semantics.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` refresh-lane rows (2026-09-21): `src/fyd/refresh/types.ts`, website-observe.ts (heuristic extractors honest about confidence), 21/21 tests green.
- DEPENDENCIES: `evidence-canonical-serializer`.
- ACCEPTANCE: Every fact in the graph resolves to an observation with source, time, and grade; synthetic fixtures can never pass as real (grade prevents it).
- NEXT FALSIFICATION: Find a graph fact with no observation record — the PROVENANCE stage (emission choke point) leaked.

**44. ID:** evidence-source-disagreement | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: Cross-source value disagreements produce one Conflict record keeping BOTH claims with provenance and human-readable surface text; `resolveConflict` records the decision, never deletes the loser. "FYD must KNOW the conflict, not silently pick a winner."
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` refresh-lane rows (2026-09-21): `src/fyd/refresh/conflict.ts`, 21/21 tests.
- DEPENDENCIES: `askfyd-conflict-surfacing` (Ask-side surfacing still open).
- ACCEPTANCE: A same entity/field, different normalized value, different source pair yields a Conflict record; resolution is an appended decision, not a deletion.
- NEXT FALSIFICATION: Resolve a conflict and check the loser is still queryable; if gone, append-only is violated.

**45. ID:** evidence-freshness-supersession | DOMAIN: EVIDENCE + PROVENANCE | STATUS: IN_PROGRESS | PRIORITY: 2
- WHY: Temporal truth exists (snapshot store, typed diff added/removed/changed, dependency-index invalidation to exact sections/pages), but nothing re-runs generator+renderer for invalidated pages and conflict resolution does not yet draft a governed site_patch.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` rows + G5 (2026-09-21): diff.ts, dependency-index.ts, snapshot-store.ts/run-t2.ts all green; "the regeneration executor is the missing piece."
- DEPENDENCIES: `owner-regeneration-survival` (owner overrides must survive the refresh).
- ACCEPTANCE: Re-observe -> snapshot diff -> conflict check -> invalidation set -> governed proposal draft -> approval -> re-render of exactly the affected pages.
- NEXT FALSIFICATION: Change the source site, re-run the refresh runner; if the rendered site changes without a proposal or never changes, the loop is incomplete either way.

**46. ID:** evidence-deletion-revocation | DOMAIN: EVIDENCE + PROVENANCE | STATUS: OPEN | PRIORITY: 3
- WHY: The revocation vocabulary exists (`inactive` status on the same predicate revokes; social vocabulary has revocable/forbidden predicates with last-wins revocation by acceptance sequence), but deletion/revocation OBSERVATIONS as first-class temporal records are not evidenced in the FYD refresh lane.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` §3 (PingRelationship status); `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` social-vocabulary row (`ping-vocabulary.ts`, manifest A3).
- DEPENDENCIES: `evidence-freshness-supersession` (diff detects removals; revocation records them).
- ACCEPTANCE: A removed source fact yields a deletion observation; the graph marks the claim superseded/inactive rather than silently dropping it.
- NEXT FALSIFICATION: Delete a service from the source site and re-observe; if the graph has no record the service was ever there, history is lossy.

**47. ID:** evidence-owner-confirmation-correction | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: Owner confirmations/corrections/hides are evidence-bearing, append-only state: corrections keep ownerValue + sourceValue + basis side by side; claim transitions append audit events; the claim store is separate from source state so re-ingestion can never erase a claim.
- EVIDENCE: `~/workspace/fyd-lane/claim/{machine,store}.ts` (2026-09-21): immutable transitions, atomic writes, `readClaim` fails honest (null, never invented); `builder/work-phase23/overrides-patch-loop.test.ts` correction-record tests (2026-09-22); CRX-DOCTRINE "Append-only history."
- DEPENDENCIES: `owner-demo-owner-mode`.
- ACCEPTANCE: Every owner decision is an appended, attributable event; no mutation path overwrites prior state.
- NEXT FALSIFICATION: Apply two corrections to the same field; if the first correction's record is gone, append-only is violated.

**48. ID:** evidence-why-this-ux | DOMAIN: EVIDENCE + PROVENANCE | STATUS: IN_PROGRESS | PRIORITY: 3
- WHY: WHY THIS is trust infrastructure, not the hero: provenance is used constantly internally (every evidenceRef carries it) and surfaces on demand — when something looks wrong, sources conflict, an agent proposes a consequential change, or trust matters. Dependency manifests on every rendered binding (R3) plus bidirectional WHY THIS are PROVES items; "subtle provenance UX" is SUPPORTS.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §6 (2026-09-21); `~/workspace/fyd-lane/website-builder-authority-decisions.md` (prioritize CONFIRM/CORRECT/HIDE over fancy provenance UI); SECTION-ROUTING PROVES list.
- DEPENDENCIES: `evidence-binding-verifier-invariant` (bindings must exist before they can be explained).
- ACCEPTANCE: Any rendered factual value can show its binding chain (value -> object field -> claim -> evidence ref) on demand without cluttering every card.
- NEXT FALSIFICATION: Pick a rendered phone number; if no UI path reveals its evidence chain, the escape hatch is missing.

**49. ID:** evidence-canonical-serializer | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 1
- WHY: The manifest's canonicalization duality (A2) is resolved on the FYD side: `src/fyd/ask/envelope.ts` pins `sha256-canonical-json-v1` as the single serializer for proposal digests and envelope signatures; `signSitePatchDraft` throws unless payload_hash === digest. PING-side, F7-B hardened canonical_json (NFC!=NFD, -0->0, depth 64, typed CANONICALIZATION_ERROR rejections) with a pinned rebuild script and 48/48 verification checks.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` §Open issue RESOLVED (2026-09-21); `~/workspace/f7-patch/01-f7b-build-and-verification.md` (2026-09-18); fyd-lane pure-TS `sha256.ts` browser-safe primitive.
- DEPENDENCIES: none (trust root).
- ACCEPTANCE: Exactly one serializer in the FYD hot path; digests reproducible across runs; no second serializer introduced.
- NEXT FALSIFICATION: Mint the same proposal digest twice on different machines; any difference = serializer drift.

**50. ID:** evidence-semantic-determinism | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The render determinism invariant holds: same ObjectGraph + SiteSpec + ViewerContext + renderer version -> same semantic render model (not byte-identical DOM). The generator is byte-deterministic (fixed page order only when data exists, deterministic section ids, all sorts by id); `generatedAt` injected for determinism.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` §6 (2026-09-21); `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` generator row; Wave 2 lane-e customize-reloaded.png evidence.
- DEPENDENCIES: `objectgraph-deterministic-ids`; `evidence-canonical-serializer`.
- ACCEPTANCE: Re-running generation on unchanged inputs yields identical section ids and ordering; semantic diff review (not pixel identity) governs fixture regression.
- NEXT FALSIFICATION: Generate twice with identical inputs and diff the SiteSpec; any nondeterministic ordering = invariant broken.

**51. ID:** evidence-corrupt-projection | DOMAIN: EVIDENCE + PROVENANCE | STATUS: IN_PROGRESS | PRIORITY: 1
- WHY: Named in the product-loop proof order as still-remaining builder work: "corrupt-projection typed failure and regression proof." The binding verifier fails closed per-value, but a corrupt projection (wrong object bound, stale graph) needs a typed failure, not a silent omission.
- EVIDENCE: memory `memory/2026-09-21.md#L1481` (product proof additions); `~/workspace/fyd-binding-verifier/bindings.test.ts` covers per-value failure reasons ("unknown object", "unbound field", "no evidence ref", "no generator ref").
- DEPENDENCIES: `evidence-binding-verifier-invariant`.
- ACCEPTANCE: A corrupt projection (e.g., spec digest mismatch with the graph) raises a typed, machine-readable failure that blocks render — never a partially-bound page.
- NEXT FALSIFICATION: Render a SiteSpec against a graph missing its bound objects; if the page renders with silent gaps instead of a typed failure, the item is open.

**52. ID:** evidence-evidence-replay | DOMAIN: EVIDENCE + PROVENANCE | STATUS: OPEN | PRIORITY: 3
- WHY: PING-side replay/witness/certificate machinery exists but is explicitly REJECTED for the FYD hot path ("FYD cites digests and evidence refs; replay stays behind the gateway"). Evidence replay (re-derive a claim's chain from source observations) is a named requirement with no FYD implementation.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` replay/witness/certificate row (2026-09-21); task prompt domain list.
- DEPENDENCIES: `evidence-observation-envelope` (observations must be complete first).
- ACCEPTANCE: Given a claim id, an agent can replay its observation -> resolution -> projection chain and verify the current value.
- NEXT FALSIFICATION: Pick a rendered claim and attempt to re-derive it from raw observations mechanically; if any hop is manual, replay is missing.

---

## CROSS-CUTTING (supporting, kept brief)

**53. ID:** xcut-vercel-ai-sdk-adoption | DOMAIN: ASK FYD | STATUS: HARVEST | PRIORITY: 2
- WHY: Genuine gap with a verdict: no provider abstraction or typed structured output exists in the estate; Vercel AI SDK normal paths (`generateObject`/`streamObject`/`generateText` + explicit provider packages) are ADOPT-worthy, while RSC generative UI and Gateway string refs are explicitly REJECTED (model-written components in the render path violate "deterministic renderer produces UI").
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` §5 (2026-09-22): ai 7.0.109, @ai-sdk/anthropic 4.0.59, Apache-2.0, verified live; PING searched first, no overlap found.
- DEPENDENCIES: `askfyd-prompt-hijack-guards` (risk changes when a model enters the path); `evidence-binding-verifier-invariant` (model output validated at the boundary).
- ACCEPTANCE: `SitePatch` and `AnswerWithEvidence` Zod schemas defined once; every intelligence call returns validated data or fails closed; provider swap = one import line (tiny proof proposed, not run).
- NEXT FALSIFICATION: Run the proposed two-provider tiny proof; if outputs validate on one provider but not the other, the contract leaks provider specifics.

**54. ID:** xcut-jsonrender-puck-primitives | DOMAIN: OWNER CUSTOMIZATION | STATUS: HARVEST | PRIORITY: 2
- WHY: Two ADAPT verdicts with concrete primitives: json-render's `catalog.prompt()` (generate a compact prompt + JSON Schema FROM the component catalog — the actual gap in the customize-intent path) and render-boundary Zod validation; Puck's component-config shape and editor/renderer data split (validates FYD's Layer 2/3 split) with drag-drop as a future event source emitting structured SitePatch ops.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` §§1-2 (2026-09-22): @json-render/core 0.21.0 Apache-2.0; @puckeditor/core 0.23.0 MIT; FYD registry already implements the typed catalog (17 components + GenericObjectCard).
- DEPENDENCIES: none (patterns only; no package adoption).
- ACCEPTANCE: Catalog-derived prompting exists for the customize-intent path; a drag-drop reorder is expressible as SitePatch ops in a scratch mapping proof.
- NEXT FALSIFICATION: Attempt the tiny proofs; if FYD registry entries cannot be translated to the catalog shape, the vocabularies are incompatible and the harvest fails.

**55. ID:** xcut-onboarding-anonymous-preview | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 2
- WHY: The anonymous entry point (paste URL -> generated preview, value before auth) is abuse-bounded: per-minute token bucket + per-hour quota, SSRF-safe fetch, crawl budget + origin semaphore + dedup cache, and leaves only an OBSERVED claim record (public evidence, no ownership claim). Claim bookkeeping can never break the preview.
- EVIDENCE: `~/workspace/fyd-lane/onboarding/anonymous-preview.ts` + tests (2026-09-21); `claim/machine.ts` DEMO_CONTEXT_IDS; tenant typing a URL is NOT proof of ownership (claim/types.ts docstring).
- DEPENDENCIES: `owner-demo-owner-mode`; `media-ssrf-boundary` (shared safe-fetch discipline).
- ACCEPTANCE: Anonymous preview generates without auth, never performs a consequential action, never caches failures, never overwrites an existing claim.
- NEXT FALSIFICATION: Preview the same URL twice concurrently; if two generations consume quota or two claim records appear, the idempotency/dedup is broken.

**56. ID:** xcut-agent-execution-doctrine | DOMAIN: EVIDENCE + PROVENANCE | STATUS: DONE_VERIFIED | PRIORITY: 3
- WHY: The builder lanes operate under written law that protects the evidence discipline: CRX doctrine (reuse-before-create, append-only history, derived-never-duplicated truth, policy-before-mutation, witness-downstream-of-fact, agents-do-not-own-truth, UNKNOWN > FICTION, the DOC_ONLY != RUNTIME ladder, 9-field component cards) and the agent artifact contract (typed output schema, five statuses incl. OUTCOME_UNKNOWN, single-writer rule).
- EVIDENCE: `~/workspace/fyd-lane/builder/CRX-DOCTRINE.md` + `AGENT-CONTRACT.md` (2026-09-22); `builder/STATE.json` accepted_boundaries.
- DEPENDENCIES: none (operating law).
- ACCEPTANCE: Every builder invocation carries the envelope; every completion is graded SUCCEEDED/PARTIAL/FAILED/REJECTED/OUTCOME_UNKNOWN with cited evidence.
- NEXT FALSIFICATION: Find a builder completion report claiming "done" without a 9-field card or runtime proof — doctrine violation.

**57. ID:** xcut-no-second-authority-audit | DOMAIN: EVIDENCE + PROVENANCE | STATUS: HARVEST | PRIORITY: 2
- WHY: Standing requirement: before creating any new continuity/event/agent store, audit what PING already has (the missing layer is instrumentation + correlation IDs + projection, not another persistence system). The F7-A bridge freeze documented exactly how convergence losses happen (identity reminted, timestamp replaced, source overwritten, metadata rebuilt, namespace collapsed, governance skipped, cursor advancing past failures) — the cautionary tale for any new authority.
- EVIDENCE: `~/workspace/f7-evidence/02-era-census-and-bridge.md` C1-C5 (2026-09-18); MEMORY.md continuity guardrail (2026-09-13); harvest-ecosystem cross-cutting record.
- DEPENDENCIES: `evidence-single-authority`.
- ACCEPTANCE: Any new store proposal includes the PING-first audit and the F7 bridge-loss checklist as negative requirements.
- NEXT FALSIFICATION: A lane creates a new event/claim store without the audit; flag and route to the single-authority review.

**58. ID:** xcut-social-projections-later | DOMAIN: FYD OBJECT GRAPH | STATUS: DEFERRED | PRIORITY: 3
- WHY: Social/agent/protocol projections (Circle, embeds, ActivityPub/ATProto/Nostr/Farcaster) are the declared future, but there is no executable adapter code in the estate (only a research script and an inert-by-default Fedify wire note); the Facebook source adapter's real path (`fromFacebookCliJson`) is wired but unfed. Correctly deferred: website is the first projection.
- EVIDENCE: `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` investigated-and-rejected table + G4 (2026-09-21); SECTION-ROUTING FUTURE CONTRACT (social/agent/protocol projections) and CUT (protocol/federation work frozen).
- DEPENDENCIES: `objectgraph-provider-account-identity`; `objectgraph-entity-resolution`.
- ACCEPTANCE: No social adapter work starts before website projection is proven on both tenants with owner loop closed; when it starts, it goes through the same evidence/object pipeline, not a parallel truth.
- NEXT FALSIFICATION: Any lane vendoring a Fediverse SDK as a dependency before the website proof closes — reject per the harvest verdict.

---

## GAPS SUMMARY (by status)
- DONE_VERIFIED (18): askfyd-question-classes, askfyd-refusal-adversarial-pass, askfyd-suggested-actions basis, owner-approval-digest-binding, owner-correction-side-by-side, owner-tenant-scoping, media-managed-derivatives, media-ssrf-boundary, objectgraph-schema-to-everything, objectgraph-deterministic-ids, evidence-binding-verifier-invariant, evidence-single-authority basis, evidence-fact-classifications, evidence-observation-envelope, evidence-source-disagreement, evidence-owner-confirmation-correction, evidence-canonical-serializer, evidence-semantic-determinism, xcut-onboarding-anonymous-preview, xcut-agent-execution-doctrine
- IN_PROGRESS (13): askfyd-suggested-actions, owner-patch-loop-persistence, owner-demo-owner-mode, owner-claim-verification-ladder, owner-confirm-correct-hide, owner-regeneration-survival, media-refresh-and-stale, objectgraph-predicate-vocabulary, objectgraph-object-in-margin, evidence-freshness-supersession, evidence-why-this-ux, evidence-corrupt-projection
- OPEN (14): askfyd-extraction-service-objects, askfyd-conflict-surfacing, askfyd-cross-object-reasoning, askfyd-outcome-history, media-alt-text-depiction, media-hero-selection, media-relationship-id-collision, media-hotlink-fallback, media-owner-removal, objectgraph-provider-account-identity, objectgraph-relate-output-dropped, objectgraph-entity-resolution, evidence-deletion-revocation, evidence-evidence-replay
- PROVE (5): askfyd-service-extraction-broken-step, askfyd-answer-schema-gaps, askfyd-owner-context-mode, askfyd-prompt-hijack-guards, owner-visibility-not-fact
- BLOCKED (1): objectgraph-schema-id-drift
- DECISION (1): media-rights-policy (grill)
- HARVEST (4): objectgraph-useful-schemas-set, xcut-vercel-ai-sdk-adoption, xcut-jsonrender-puck-primitives, xcut-no-second-authority-audit
- DEFERRED (1): xcut-social-projections-later

Priority-1 items: 1, 2, 9, 12, 13, 14, 16, 18, 21, 22, 23, 31, 39, 40, 41, 49, 51 (17 items).
