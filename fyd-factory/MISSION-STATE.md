# FYD FACTORY MISSION STATE

## Steering (latest first)
- 2026-09-23 ~18:25 MDT, NOLAN CORRECTION (overrides "don't clone HPP"): QUALITY BEFORE PURITY.
  Route: CLONE → PROVE FIDELITY → PARAMETERIZE → SUBSTITUTE → COMPARE → GENERALIZE.
  HPP is the donor. Do not start archetypes from blank pages.
  Gated progression: 1 HPP clone → 1 different local business → 1 professional → 1 technical → 10 → 25 → 100.
  Fix generic defects before multiplying. Visual QA aggressive; "tests pass" never proves looks.
  Structural sameness is NOT failure; difference must come from the entity.
- 2026-09-23 ~18:17 MDT: headcount 32 for 24h; token-burn rule (inference → search width + falsification depth, not output length).
- 2026-09-23 ~18:11 MDT: 25-point FYD factory program (product goals still stand).

## Lane map (32 active)
Pivoted to golden route:
- GOLDEN-FREEZE (b379acec): freeze the HPP reference implementation.
- DEHPP-ANALYZE (ad012aac): KEEP/PARAMETERIZE/REFACTOR/REPLACE/DROP classification.
- VISUAL-CRITIC desktop (133b06a2) + mobile (cfa54061): aggressive visual QA harness.
- OBJECTS-MARGIN (78791207): PING object machinery as augmentation.
- FIXTURE-SECOND (36c7d145): deep redacted plumbing fixture for second-site test.
- F5-CEILING (311f7040): re-scoped to entity-driven variation + success test.
Unchanged:
- LANE-MINE (failure mining → tournament defect list).
- F2-CORPUS-A/B/C/D (16 redacted fixtures, checkpointed batches).
- F4-PRESSURE (component pressure map).
- QA swarm: QA-MOBILE, QA-TRUTH, QA-EVIDENCE, QA-DESIGN-CONV, QA-A11Y, QA-HOSTILE, QA-DET, QA-CORRECT, QA-REOBS.
- Product: ASK, OWNER, CLAIM, RESP, SEC, PERF, MEDIA, LIN, ACQ.
- LANE-HARVEST (continuous PING harvest).
Completed: LANE-ARCH; F2-CORPUS-A (4 validated redacted trades fixtures); LANE-MINE (36-failure corpus + TD-001..TD-012 + 9 clusters); LANE-HARVEST; CLONE-SCAFFOLD (hpp-clone repo scaffolded, blocked on GOLDEN-FREEZE).
- TOURNAMENT TD-001 launched: 2 blind contestants diagnosing "Coppersmith Explore renders 'Spec failed validation' (ObjectFeed rejects ping.social.external_identity@1)". Next: adversarial reviewer, then synthesizer picks the smallest surviving patch; coordinator integrates.

## Pending orchestration
- CLONE-SCAFFOLD spawned (replenishment for CORPUS-A): prepares ~/workspace/fyd-factory/hpp-clone/ git repo + extract.sh template + fidelity-checklist.json. Do NOT clone until GOLDEN-FREEZE identifies the donor.
- FIXTURE-PROFESSIONAL spawned (replenishment for CLONE-SCAFFOLD): one deep redacted consultancy fixture as gate candidate for the "1 excellent professional site" step.
- Kill/resume experiment QUEUED: no batch worker has partial on-disk checkpoints yet (batch-b/c/d have written nothing; killing now would only restart, not resume). Will execute against the first worker with verifiable partial checkpoints.
- On GOLDEN-FREEZE completion → spawn CLONE-PROVE (clone HPP once into hpp-clone/, prove GOLDEN ≈ CLONE; STOP if visibly worse).
- On CLONE-PROVE completion → spawn DEHPP-BUILD (parameterize per classification).
- Then SECOND-SITE build (fixture → graph → spec → HPP-derived system → renderer; zero customer-name conditionals).
- Kill/resume experiment: kill a mid-run checkpointed worker (candidate: an F2 corpus batch) and spawn a resume replacement; verify checkpoint recovery.
- Agent tournaments: launch when LANE-MINE delivers the defect list.

## Standing rules
- Branch fyd-factory on the Pig; no pushes, no main/master commits; other lanes' dirty files preserved.
- Lanes: no shared-file edits; patch proposals to ~/workspace/fyd-factory/patches/; coordinator integrates.
- Storage law: bulk → ~/workspace/fyd-factory/; never /tmp, C:, D:. WSL is physically on C:.
- FYD laws: Ask FYD real-or-hidden; motion never gates content; private objects never cross public boundary; no All Objects explorer; MOBILE IS NOT FYD-LITE; no customer-specific JSX; evidence over assertion; no em dashes in user-facing copy.

## Headcount rebalance (2026-09-23 ~18:35 MDT, Nolan's order)
- Standing 50-worker budget. New split: 16 factory + 6 autonomy challenge + 18 convergence wave + 10 constitutional sprint = 50.
- Factory active workers: 25 -> 16 (closed: FIXTURE-PROFESSIONAL (completed first, delivered professional-gate-consultancy.json), LANE-PERF, LANE-RESP, QA-A11Y, QA-DESIGN-CONV, QA-MOBILE, QA-CORRECT, QA-EVIDENCE, QA-REOBS). QA coverage now: HOSTILE, TRUTH, CLAIM, SEC attackers; DET completed earlier (render equivalence HOLDS). Perf/responsive baselines deferred, re-queuable on restore to 32/24.
- Golden-path archaeology lane wound down. Sprint Phase 17 produces the golden-path plan; treat its output as ORCHESTRATION-stage INPUT. Do NOT duplicate its authority-mapping work or the convergence wave's substrate work. Substrate gaps that block orchestration are recorded here as dependencies, not worked around.
- Dependency (orchestration stage): awaiting sprint Phase 17 golden-path plan (UNAUTHENTICATED VISITOR -> PUBLISH gap list) before finalizing BuildBusiness(sourceManifest) orchestration contract.

## Worker completions (2026-09-23 ~18:39 MDT)
- FIXTURE-SECOND completed, status VALIDATED/PASS: ~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json (25 objects / 24 relationships, site_id clearwater-plumbing-demo, "Clearwater Plumbing Co."). 12 services, 3 people via employs, 2 locations via located_at, 5 FAQs as articles tagged faq, conflict pair (Sat close 12:00 PM website-ingestion vs 2:00 PM directory:google-business-profile), trust signals no invented credentials (licensed_insured, 2-year warranty, flat-rate pricing, same-day response). Phone (970) 555-0142 verified unique corpus-wide. Manifest ~/workspace/fyd-factory/corpus/manifests/second-site.json (sha256 1bef189e..775a978b6, status ready). Graph-features note ~/workspace/fyd-factory/corpus/graph-features-second-site.md (thesis: problem-to-technician matching; service discovery + contact discoverability outrank browsing). Cancelled-before-completion items are INCOMPLETE, not empty findings: F2-CORPUS-B/C/D, F4-PRESSURE, LANE-MEDIA (media lane needs replacement worker on headcount restore), F3-DESIGN-C tech design search (probes inert at design-search/technology/).
- QA-DET completed: semantic render equivalence HOLDS for buildSemanticRenderModel (src/fyd/sitespec/render-model.ts). Two fresh processes byte-identical canonical models; module-state pollution test clean; no cross-customer leakage; 5 sequential generations identical; 3 locales identical; reversed objects/relationships arrays identical; negative control (reversed sections) correctly differs. No Date.now/Math.random/crypto in render path; Object.keys sorted; only hygiene note: updatedAt.localeCompare() lacks explicit locale (measured identical across 3 locales for ISO timestamps). Results ~/workspace/fyd-factory/qa/determinism/results.json. generateSiteSpec also deterministic across fresh processes.

## LANE-ACQ completed (2026-09-23 ~18:43 MDT)
- 8-fixture acquisition corpus built and validated against the real pipeline on the Pig (runExtractionPipeline at commit e48ef710, read-only): ~/workspace/fyd-factory/corpus/fixtures/ (8 slug dirs, each index.html + provenance.json, DEMO_SYNTHETIC). Manifest ~/workspace/fyd-factory/corpus/manifests/acquisition.json (digests, rerun steps, 6 schema gaps). Generator corpus/gen_acq_fixtures.py, validator corpus/validate-acq.mts.
- Fixtures: rank-math-graph (nested @graph, near-duplicate Organization, SEO chrome -> unsupported evidence, private streetAddress withheld), simple-jsonld (minimal), opengraph-heavy (OG business:contact_data carries identity, og:description vs twitter:description disagree), metadata-poor (1 fact only), multi-location (4 locations inconsistent naming), person-heavy (12 persons, nameless Dispatcher), service-heavy (35 services, near-dupes, service/product double-type), conflicting-source (json-ld (970) 555-0188 Mo-Fr 08-17 vs og (970) 555-0189 Mo-Sa 08-18, no silent winner in fixture).
- 6 schema gaps documented, none papered over: GAP-1 no service name normalization/dedup; GAP-2 locations collapse with no dropped-entity ledger; GAP-3 OG business:contact_data never projects onto fields; GAP-4 body-text facts produce zero with no leftovers signal; GAP-5 nameless Dispatcher vanishes silently (12 in, 11 out, unsupportedCount 0); GAP-6 SOURCE_PRIORITY picks json-ld phone with no conflict record, hours dropped as unmapped-property. These are object-quality stage inputs.

## OBJECTS-MARGIN completed (2026-09-23 ~18:53 MDT)
- Design doc ~/workspace/fyd-factory/objects-margin/augmentation-design.md + 3 patches in ~/workspace/fyd-factory/patches/: objects-margin-01-section-anchors.patch (stamp data-object-anchor on tenant sections), 02-layer-mount.patch (mount MarginObjectLayer on tenant sites, desktop-only >=1024px, descriptors from public graph), 03-inline-cards.patch (service/person cards link to /o/ nodes, opens ObjectOverlay, restores scroll on close).
- 3 highest-value augmentations: (1) desktop section-anchored object rails, Hero/Contact excluded; (2) mobile inline cards tap-to-node, zero floating chrome; (3) object-scoped Ask FYD entries from overlays with {siteId, objectId} context.
- Excluded per binding direction: All Objects explorer, floating mobile chrome, persistent drawers, follow/like on tenant surface, Hero overlays, graph-viz UI. publicGraph() boundary untouched.
- Caveats: patch 01 anchor wrapper may disturb margin-collapsing (needs before/after screenshots at 375/768/1024/1440); patch 03 hunk placement TBD (card bodies not read); tenant pages currently have zero object chrome (verified by grep). ask-concierge-wire.patch is another lane's file, untouched.
- F3-DESIGN-B preempted by STOP directive, no outputs; SiteSpec research and probes remain at ~/workspace/fyd-factory/design-search/trades/.

## DEHPP-ANALYZE completed (2026-09-23 ~18:54 MDT)
- Deliverables: ~/workspace/fyd-factory/dehpp/classification.md (54 mechanisms classified with evidence), ~/workspace/fyd-factory/dehpp/hpp-specific-inventory.md (HPP-specific facts grouped CONTENT/IDENTITY/OBJECT DATA/MEDIA/TOKENS/SELECTION/ORDER/CTA/NAVIGATION/COMPOSITION vs IMPLEMENTATION + 4 hardcoded values in shared code). Counts: KEEP 34, PARAMETERIZE 13, REFACTOR/REPLACE/DROP 7. Repo read-only, no writes.
- 5 most important KEEPs: binding verification before render (boundField/Title/Description through presentation-binding verifier); provenance-required digest-verified data source (hard failure, no stale fallback); deterministic data-driven composition (sections exist only when data exists, id-sorted, one registry); honest-empty fail-closed discipline (typographic hero, no Gallery without media, no quotes without bindings, no Contact without contact methods); motion never gates content + mobile composition (base-visible CSS, reduced-motion collapse, mobile-first 44px targets).
- 5 most dangerous HPP-specific couplings: (1) site-client.tsx:169 hardcodes "(acceptance sequences 65-83)" in shared provenance footer, must render meta.eventSequences as data; (2) demo chrome fused to customer surface (no deployment split); (3) golden route bypasses the composition pipeline (no archetype profile, never runs strategyForSite/planner/dimensions; fidelity must be re-proven through the composed path); (4) dead media seam (galleryMedia/objectMedia never populated by route); (5) default copy baked into renderer, not data (section voice in renderer functions; "CTA boosted by urgency" dimensions policy never runs on this path).
- Also: SocialProof fully implemented but generator never emits it (business with testimonials gets no proof section). HPP effective home sections: Hero, BusinessSummary, Services, Locations, People, Contact, Links, CTA, AskFYD, ObjectRail.
- Superseded F1-PROF left only probe scripts at ~/workspace/fyd-factory/f1-prof/.

## LANE-ASK completed (2026-09-23 ~18:57 MDT)
- New files on Pig repo (branch fyd-factory, untracked only): src/fyd/ask/concierge.ts (minimal evidence-backed concierge: pure, deterministic, no LLM/JSX; answers 7 canonical questions from visible graph; every claim graded SUPPORTED/DERIVED/INFERRED/UNKNOWN; throws rather than render non-UNKNOWN claim without cited evidence; exports matchConciergeQuestion/answerConciergeQuestion/toAskFydAnswer/CONCIERGE_QUESTIONS) + src/fyd/ask/__tests__/concierge.test.ts (28 tests, all pass; full ask suite 152/152 green).
- 14 question/site results (happy-place + coppersmith-plumbing) all PASS: canonical questions answered from evidence; UNKNOWN surfaced honestly (e.g. people/hours/owner UNKNOWN, no invented service lists); synthetic conflict fixture surfaces two located_at values with both cited SUPPORTED and contradiction DERIVED; matcher returns null for non-concierge questions so existing composer keeps them.
- UNKNOWN rendering: inline "[UNKNOWN] <fact>: unknown. <reason>, so I will not guess." plus unknowns[] entry; all-UNKNOWN -> refused:true which the pipeline reduces to the "unknown" answer class. UNKNOWN claims never become citations.
- WIRING GAP BY DESIGN: concierge not wired into live surface (shared src/fyd/ask/answer.ts untouched). Patch proposal ~/workspace/fyd-factory/patches/ask-concierge-wire.patch (also staged on Pig at /home/nolan/workspace/fyd-factory/patches/ask-concierge-wire.patch), verified git apply --check. Activation: git apply on Pig + re-run ask jest suite. No route/widget changes needed; toAskFydAnswer emits exactly what they render. Notes: ~/workspace/fyd-factory/ask/LANE-ASK-SUMMARY.md.

## GOLDEN-FREEZE completed (2026-09-23 ~19:00 MDT)
- VERDICT: the golden is the PIG ROUTE, not the vercel site. Golden: /home/nolan/projects/ping, branch fyd-factory, commit e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (2026-09-23), entrypoint src/app/sites/happy-place/page.tsx.
- Vercel site (happy-place-platform.vercel.app, repo /home/nolan/projects/happy-place-platform, branch devin/hpp-ping-boundary, commit 6dd11bedd5e2b945186793bc1e8d9df4fb8303d5, 2026-09-16) is documented as fidelity target only; it is bespoke hand-built (before-after-slider, estimate-wizard, project-lightbox, lenis scroll) and factory archetypes cannot derive from it without violating the no-customer-JSX law.
- Route: getPingObjectGraph -> generateSiteSpec -> applyPresentationIntent -> heroMediaFor -> validateSiteSpec -> SiteClient -> SitePageView. NOT the strategy/planner path (STRATEGY_PINS has no happy-place entry; archetype: null).
- Byte-exact composed spec dumped: 4 pages (home: Hero, BusinessSummary, Services, Locations, Contact, Links, CTA, AskFYD, ObjectRail; about/services/explore single-section), nav Home/About/Services/Explore, DEFAULT_FYD_THEME tokens, 8 graph objects, 0 validation findings, renderable=true, heroMedia=null, empty presentationIntent.
- Tests: 500/500 passing, 0 failures across 7 golden-path suites (proceduralize 82, components 93, sitespec 91, builder 96, archetypes 11, customize 20, media 107). Full next build NOT run; pre-generalization gate.
- Honest fidelity gaps: no reviews/projects/estimate-wizard in the 8-object graph.
- Deliverable: ~/workspace/fyd-factory/golden/GOLDEN-REFERENCE.md + evidence/ (vercel-home.html, pig-route-home.html, hpp-composed-spec.json).
- Donor fixture: src/fyd/proceduralize/__fixtures__/happy-place-graph.ts, machine-generated, ingested 2026-09-21 from vercel source, sha256 76766d18.. over 139,618 bytes; fresh fetch 139,661 bytes (43 bytes drift, same page).
- NOTE: golden route bypasses the composition pipeline (no archetype profile, no strategyForSite/planner/dimensions). Fidelity must be re-proven through the composed path before generalization.
- NEXT: CLONE-PROVE spawned on completion. GOLDEN_REPO=/home/nolan/projects/ping (Pig), GOLDEN_SHA=e48ef710cb889bf4d59b833ef9766067a9e2bbf0.

## QA-TRUTH completed (2026-09-23 ~19:03 MDT)
- 38 factual claims checked across /sites/happy-place and /sites/coppersmith-plumbing, traced to PING projection JSONs and media manifests. 4 failure records in ~/workspace/fyd-factory/qa/truth/failures.json; patch proposals in ~/workspace/fyd-factory/patches/qa-truth-2026-09-23.md. No repo writes.
- F-001: footer hardcodes "(acceptance sequences 65-83)" on every site; false on coppersmith-plumbing (meta.eventSequences null, embedded spec undefined) while the generator already emits true provenance the renderer ignores.
- F-002: hero photo rights basis "authorized for acquisition" is a same-origin URL heuristic from classifyRights, yet the renderer labels state "observed", presenting a policy inference as a seen-in-the-source legal fact with zero authorization evidence.
- F-003 (both pages): contact flow says "Verified from coppersmithplumbing.com" while footer says claims are "never verified fact"; renderer maps evidence state "observed" to the word "Verified", overclaiming.
- ARCHITECTURAL FINDING: verifyBinding/buildVerifiedRenderModel are invoked only from src/fyd/builder/planner.ts planSite (used by /build/[siteId]); the /sites pages call generateSiteSpec directly and never build a VerifiedRenderModel. The verifier misses 100% of claims on /sites pages by construction, and renderer-injected strings (footer, rights steps, "Verified" wording) live outside the PresentationBinding model entirely, so even the planner path would not classify them.
- ~34 remaining claims (25-years summary, CCB# 254240 license claim, services, locations, phone/email, photo digest/timestamps, Ask FYD promise) traced cleanly to direct evidence with matching provenance refs.

## VISUAL-CRITIC-MOBILE completed (2026-09-23 ~19:05 MDT)
- /sites/happy-place captured at 320/360/375/390/430 (+desktop 1280) via scripted CDP (Pig Windows Chrome 153 over :9223, playwright-core; CDP not reachable from WSL). Full-page + viewport PNGs + DOM analysis JSONs + FAB interaction probe. Zero console errors on every load. Deliverables: ~/workspace/fyd-factory/visual/mobile-critique.json, harness.md, shots/.
- 6 reproducible failures at every mobile width; zero horizontal overflow anywhere. Worst at 320.
- Top 3: (1) Services section renders FIVE EMPTY CARDS (critical, incl. desktop 1280): five .fyd-affordance-preview elements with zero text, ~600px dead space at 320; the core trades section is blank. (2) Fixed "Featured object" FAB occludes content (153px pill paints over About heading/paragraph in initial viewport at all mobile widths). (3) No thumb-reachable primary contact CTA (tel: link ~2800px deep; hero only offers Visit website / Ask FYD; no sticky call control).
- Also verified: sheet behavior from FAB works well (except background scroll not locked); full desktop capability parity on mobile; grids collapse to 1 column; hero integrity passes at 320. regression_320_notes carries 5 permanent assertions for the responsive lane (non-empty service cards, no-overflow guard, FAB/heading non-intersection, 44px floor, sheet scroll lock).

## F5-CEILING completed (2026-09-23 ~19:06 MDT)
- Nolan's corrected scheme verdicts. SUCCESS TEST PASSES: happy-place vs identity-swapped variant ("Desert Bloom Landscaping") fingerprints identical (6277c348f3a1), hero/contact re-bound, no stale identity leakage. Same-IA sameness at composite 1.000 is correct determinism, not failure.
- FAILURE: coppersmith-plumbing ~ happy-place at composite 1.000 with exact home-section sequence. Coppersmith has a team member (person object linked works_for) but no People section on any page. Eligibility counts team: 1 and marks People eligible; generator is at fault.
- FIRST-LOSS BOUNDARY: RELATIONSHIPS LOST in generator.ts :: group() -> related("person") only matches owner-as-subject edges (employs|has_member); reverse-direction works_for never enters the people group, so no section is emitted. Planner innocent (filters by eligibility). Proposed fix (NOT applied): ~/workspace/fyd-factory/patches/f5-ceiling-works-for-people.patch (merge reverse works_for persons into people group, emit People sections as kind "reference", bump SITE_PLANNER_VERSION to @2).
- SECONDARY FINDING: production quantizes every tenant to 3 coarse presets; per-tenant vectors (COPPERSMITH_VECTOR urgency 0.85, PING_DOGFOOD_VECTOR) are test-only. Measured on coppersmith graph: production CTA emphasis medium, documented vector high with different home order. SITE_STRATEGIES[].policy has zero production consumers. Fix sketched (consult per-tenant vectors in vectorForSite before preset fallback). Also: ping-fyd ~ trades sites 0.740 (TECHNOLOGY treatment comes solely from STRATEGY_PINS override); corpus has no product/post/article objects (no live composition evidence for Products/Posts/knowledge paths).
- Artifacts: ~/workspace/fyd-factory/ceiling/ceiling-report.md, similarity.json (9 sites, 36 pairs), patch above.

## VISUAL-CRITIC (desktop) completed (2026-09-23 ~19:12 MDT)
- Verdict: FAIL, not gate-ready. 9 reproducible failures (8 site + 1 shell), 4 false positives, 4 notes. Captures at 1440/1280 via dedicated headless Chrome on own CDP port (never touched production browser); artifacts in ~/workspace/fyd-factory/visual/ (desktop-critique.json, extended harness.md, PNGs, metrics JSONs, forensics).
- VQ-001 (BLOCKER): motion gates content. All 5 service cards at opacity 0 + translateY(16px) until scrolled into view; full-page captures, print, crawlers see blank 613px Services section. Violates standing "motion never gates content" rule. Harness lesson: scroll-through mandatory before full-page capture + separate no-scroll motion probe.
- VQ-002 (major): illegible hero badge. "SITE RECORD" 11px dark brown on dark navy hero, near-zero contrast.
- VQ-004 (major): zero media. imgs: 0 across whole page; hero is flat dark slab.
- Also: hero/About copy near-verbatim duplicated (VQ-003); provenance pills repeat on every card/section (VQ-005); dead zones in Featured Object/single-pill sections (VQ-006); monotonous white/off-white banding (VQ-007); demo shell "Customize this site" panel eats ~40% of page height (SH-001: gate should score site region, not shell). False positives recorded; no horizontal overflow; no 1440/1280 breakage.
- F1-TECH stopped per correction before any repo changes; ~/workspace/fyd-factory/f1-tech/ holds only local probe scripts.

## TD-001 contestant A completed (2026-09-23 ~19:13 MDT)
- Verdict: TD-001 is a FALSE POSITIVE on this branch. ping.social.external_identity@1 is unregistered in SCHEMA_ROLES/SCHEMA_COMPONENTS (resolves to GenericObjectCard only), and the generator's Explore page already narrows the all query to ObjectFeed-eligible schemas (commit 4a9cc919), so the validator never sees the schema on pages.explore.sections[0].query.
- Evidence: full code path reproduced on the Pig (branch fyd-factory, HEAD e48ef710) via out-of-tree jest, no repo writes. Fixture path and live path (real projection coppersmith-plumbing.json, mirroring the route exactly) both yield zero validation errors, renderable=true. Emitted explore query: {kind:"all", schemas:[ping.social.business@1, ping.social.location@1, ping.social.person@1, ping.social.service@1], limit:20}. Bare-all expansion only fires for hand-written specs (fail-closed by design); generator never emits one.
- Patch: additive-only, 1 file +65 lines: src/fyd/sitespec/__tests__/explore-external-identity.test.ts (4 tests pinning exclusion + acceptance criteria), 4/4 green under lane strict tsconfig. Privacy boundary untouched (feed is public-objects-only).
- Deliverables: ~/workspace/fyd-factory/tournaments/td-001/contestant-a.patch, contestant-a.md. Proof plan: apply, run sitespec jest + proceduralize lane suite, confirm /sites/coppersmith-plumbing renders with no "Spec failed validation".
- Tournament status: contestant B still running; on its completion spawn adversarial reviewer then synthesizer to pick the smallest surviving patch. TD-002 (Ask FYD privacy leak) queued next.

## TD-001 contestant B completed (2026-09-23 ~19:14 MDT)
- Same conclusion, independently reached: TD-001's production mechanism is ALREADY FIXED on fyd-factory (commit 4a9cc919 narrowed the Explore all query to ObjectFeed-accepting schemas). Pre-fix mechanism: bare {kind:"all"} expanded by validator to every known schema; ping.social.external_identity@1 resolves to GenericObjectCard only via eligibleComponents(), so the whole spec failed validation.
- Patch: test-only, 1 new file, 48 insertions, 0 deletions (src/fyd/sitespec/__tests__/explore-external-identity.test.ts, 3 tests: fixture contains public external_identity; generated Explore query narrows away from it; Coppersmith validates with zero errors and is renderable). git apply --check clean; assertions executed via tsx against real fixture graphs, passed. No production code touched, privacy boundary untouched.
- Deliverables: ~/workspace/fyd-factory/tournaments/td-001/contestant-b.patch, contestant-b.md. Proof plan: lane-scoped jest (bare npm test cannot parse TS on this branch, pre-existing quirk); sitespec/proceduralize/builder lane suites green expected.
- Both contestants converge: production fix exists (4a9cc919); only missing piece is the regression test. Next: adversarial reviewer, then synthesizer picks the smallest surviving patch, then integrate on Pig.

## LANE-OWNER completed (2026-09-23 ~19:20 MDT)
- 12 new files, untracked additions only, on Pig branch fyd-factory (/home/nolan/projects/ping). Zero modifications to any shared file (verified via git status).
- src/fyd/owner-mode/: facts.ts (deterministic fact extraction, stable IDs); provenance.ts (OwnerProvenance {owner, assertedAt, supersedes}, deterministic IDs); corrections.ts (CONFIRM|CORRECT|HIDE append-only assertions, replay over regenerated facts, source-conflict detection, supersession chains, hidden fact IDs separate from values); visibility-policy.ts (per-fact public|hidden, owner overrides, conservative defaults with location hidden, identity safety bound: business name cannot be hidden; projectPublicFacts excludes hidden facts entirely); owner-identity.ts (clean OwnerIdentityProvider interface; default explicitly unverified demo provider fail-closed; production binds via bindIdentityProvider()); demo-owner-console.tsx (six-tab console OBJECTS/CONTENT/VISIBILITY/SITE/ASK FYD/EVIDENCE with DEMO OWNER MODE banner; renders null unless demo mode enabled; no protocol jargon in UI copy); 3 test files + jest.config.cjs.
- src/fyd/customize/: owner-command-compiler.ts (typed compiler for all 9 commands, delegates to existing classic intent parser where applicable); owner-proposal.ts (preview -> capability-gated approve -> pure idempotent apply -> deterministic journal replay; proposals are data, never direct edits).
- Tests: owner-mode 24/24 pass; customize 54/54 pass (30 new + pre-existing intent/apply-layer still green); tsc --noEmit zero errors. Bugs fixed during verification: multi-object field ambiguity ("my X" prefers owner object; genuinely ambiguous names get honest refusal, pinned by test); "Don't show my street address" honestly refused when already hidden by default (test layers prior "show" first).
- Proposal shape OwnerProposal {proposalId, kind, commandText, intent, siteIntent?, ownerSiteIntent?, patchBody?, visibilityChanges?, correction?, baseDigest, preview{title, before[], after[]}, status: drafted|approved|applied, approval?{approvedBy, approvedAt, note, capability}}. Replay accepts approved and applied entries; non-approved skipped and counted.
- UNWIRED SEAMS (honest, not papered over), proposal at ~/workspace/fyd-factory/patches/owner-console-integration-2026-09-24.md: P-OWNER-1 mount DemoOwnerConsole next to existing <DemoOwnerMode> mounts (shared files, proposed not applied); P-OWNER-2 promote_action writes OwnerSiteState.actionProminence but no renderer reads it yet (lane-contained vs canonical-SiteIntent options offered); P-OWNER-3 durable conversion of assertions/decisions into src/fyd/object/owner-events.ts unwired (journal replay deterministic but in-memory).
- No em dashes in code, UI copy, or patch proposal.

## LANE-SEC completed (2026-09-23 ~19:21 MDT)
- Verdict: 20/20 tests PASS. Zero bypasses found. Invariant holds: no executable source content crosses the projection seam.
- Method: read src/fyd/boundary fully; traced real render path (resolveSafeLink single link choke point, React escaping with zero dangerouslySetInnerHTML in all of src/fyd, grep-verified, binding verifier, visibility projection). Hostile fixture run through BOTH production builder paths (generateSiteSpec path and planSite path used by /build/[siteId]), including a kitchen-sink graph with every payload class at once. Canary markers prove hostile data reached the renderer (tests not vacuous).
- Attacks: hostile URLs (javascript:/data:/vbscript:/file:/blob:, mixed-case, tab/newline/null-byte smuggling, entity-encoded schemes) in website/email/url/phone fields; 22 markup payloads (script/iframe/object/img-onerror/SVG/MathML onload/xlink javascript:/form-action javascript:/CSS expression()/url(javascript:)/single-double-encoded entities/quote-breakouts); hostile object ids; bidi overrides and zero-width chars; null bytes; 1MB string field; malformed URLs; private objects and owner-hidden fields.
- Verified stopped: hostile URLs never become hrefs (allowlist + control-char rejection); markup entity-escaped everywhere; no event-handler attributes; no CSS payloads reach style; double-encoded entities stay double-escaped; private/hidden data never in public output; null bytes/1MB fields render without throwing. Two mid-development failures were detector false positives (escaped text in attribute values), confirmed inert.
- Deliverables: Pig src/fyd/boundary/__tests__/projection-seam-attack.test.ts (local copy ~/workspace/fyd-factory/security/projection-seam-attack.test.ts); ~/workspace/fyd-factory/security/seam-verdict.md; patches ~/workspace/fyd-factory/patches/boundary-jest-css-stub.patch (REQUIRED: lane jest config needs CSS stub; git apply --check clean) and display-media-src-allowlist.patch (OPTIONAL hardening: render-seam URL gate for DisplayMedia.src; check clean).
- Constraints honored: no new SecurityAuthority; no source files edited (only untracked test addition). Residual notes: bidi/zero-width chars pass through as inert text (visual-spoofing only); /o/[objectId] node path code-scanned but not gauntleted.

## Daemon restart killed 5 running workers (2026-09-23 ~19:28 MDT)
- All errored with "no live runtime handle or restart checkpoint": CLONE-PROVE, TD-001 adversarial reviewer, QA-HOSTILE, LANE-LIN, LANE-CLAIM.
- All five left substantial work artifacts and were re-dispatched with resume-from-artifacts briefs (do not redo completed probes; finish and deliver the missing deliverable):
  - CLONE-PROVE: resume from ~/workspace/fyd-factory/hpp-clone/work/ (extraction scripts done); deliver ~/workspace/fyd-factory/hpp-clone/CLONE-REPORT.md (PROCEED or STOP verdict).
  - TD-001 reviewer: resume from rev-*.sh probes in ~/workspace/fyd-factory/tournaments/td-001/; deliver adversarial-review.md (per-contestant verdicts + integration recommendation).
  - QA-HOSTILE: resume from ~/workspace/fyd-factory/qa/hostile/ (zz-hostile-seam.test.ts, results-extract.json, raw-run-output.txt); deliver HOSTILE-VERDICT.md.
  - LANE-LIN: resume from ~/workspace/fyd-factory/lineage/ (chain-happy-place.json, chain-coppersmith.json, verifiers); deliver LINEAGE-REPORT.md.
  - LANE-CLAIM: resume from ~/workspace/fyd-factory/claim/ (attack-render-path.test.ts, cat15-34.sh); deliver CLAIM-VERDICT.md. Note: LANE-SEC already covered markup/projection-seam (20/20 PASS); LANE-CLAIM is claim-integrity attacks (overclaim, evidence laundering, unbound claims).
- LANE-LIN/LANE-CLAIM briefs were NOT in recovered context or memory; lane intent was reconstructed from their work dirs. If the reconstruction misfires, the parent coordinator can re-issue briefs.
- DB note: runtime.tool_calls is empty (0 rows) on this surface, so spawn briefs could not be recovered from the DB.
- Active factory count after re-dispatch: 5. Allocation remains 16.

## NIGHT SHIFT DIRECTIVE (2026-09-23 19:31 MDT, Nolan asleep until morning)
- Order: triple yesterday's verified output overnight, minimum. Push HPP -> CLONE -> PROVE FIDELITY -> PARAMETERIZE -> SUBSTITUTE -> COMPARE -> GENERALIZE at maximum useful parallelism. FYD core loop is sacred: feed it, do not disrupt. Coordinate with the build-program coordinator (Ask FYD context compiler, connector substrate) via state files. Do not interrupt Nolan for anything routine. Queue empty means discover more work. Morning target: factory throughput, fidelity proofs, next highest-leverage factory gap identified.
- Yesterday's verified baseline: 13 completed lanes with evidence-verified deliverables. Night target: 39+ verified completions is the stretch; floor is 3x the baseline count of NEW verified deliverables.
- Wave N1 (spawned 19:32 MDT, 9 workers; active total 14/16, holding 2 slots for TD-001 synthesizer + DEHPP-BUILD):
  1. DEHPP-BUILD-SPEC: parameterization build spec from classification (13 PARAMETERIZE typed params + fallbacks, 7 DROP replacements, 34 KEEP invariants, dangerous-coupling removal plans). Spec only; no repo contact. -> dehpp/parameterization-spec.md
  2. LANE-MEDIA (replacement): media stage discover->observe->evidence->digest->derivative->binding->projection over existing PING media authorities (src/lib/media.ts, media-kv-store.ts, blob-storage.ts); new files only under src/fyd/media/; wiring as patch proposals. -> media/MEDIA-LANE-REPORT.md
  3. TD-002: Ask FYD privacy-leak investigation (private/hidden facts through concierge + wiring seam; LANE-SEC did not cover ask path). -> tournaments/td-002/TD-002-VERDICT.md
  4. LANE-REG: regeneration proof (correction survives regen on clearwater fixture; byte-identical control). -> regen/REG-PROOF.md
  5. VQ-REPAIR-SPEC: minimal repair patch proposals for VQ-001/002/004 + mobile FAB + thumb CTA; git apply --check clean; NOT applied (donor frozen, CLONE-PROVE running). -> visual/REPAIR-SPEC.md + patches/
  6. LANE-ORCH-SPEC: BuildBusiness(sourceManifest) contract (manifest schema, 12 stage interfaces, result object, terminal states, lane->stage map, Phase 17 + substrate dependencies recorded not duplicated). -> orchestration/BUILD-BUSINESS-SPEC.md
  7. LANE-EVIDENCE-WIRE-SPEC: design for routing /sites/* claims through binding verification without disturbing golden fidelity; patch proposals for safe truth fixes; do-not-change list. -> evidence/WIRE-SPEC.md + patches/
  8. F4-PRESSURE (resumed): render-path robustness under degenerate ObjectGraphs (12 classes; fail-closed vs crash vs invented-claim). -> pressure/PRESSURE-REPORT.md
  9. F2-CORPUS-B (resumed): 4 non-trade fixtures (restaurant, retail, professional non-consultancy, hospitality) + manifest + variation notes. -> corpus/fixtures/batch-b/, manifests/batch-b.json
- Wave N2 (queued): TD-001 synthesizer (after adversarial review) -> smallest surviving patch -> integrate on Pig; DEHPP-BUILD (after CLONE-PROVE PROCEED) -> parameterized implementation; apply VQ repairs + visual re-verify; first end-to-end (sourceManifest -> BuildBusiness -> graph -> SiteSpec -> render -> Ask FYD -> correction -> regen on Clearwater).
- Spawn infra note: 5 of 14 spawn calls hit transient DB lock timeouts; retries succeeded. If lock timeouts recur, back off and retry serially.
- Coordination note for build-program coordinator: factory needs (a) Phase 17 UNAUTHENTICATED VISITOR -> PUBLISH gap list (orchestration input; recorded as dependency, not duplicated); (b) Ask FYD context compiler status (TD-002 will report the wiring seam state); (c) connector substrate: no factory dependency beyond read-only observation. Factory produces: specs, patch proposals, corpus fixtures, proofs, all under ~/workspace/fyd-factory/.

## LANE-LIN completed (2026-09-23 ~19:35 MDT) - VERDICT: PASS
- Lane intent recovered and proven: end-to-end lineage for rendered facts through SOURCE BYTES -> OBSERVATION -> EVIDENCE -> OBJECT FIELD -> SITESPEC BINDING -> RENDERED CLAIM -> ASK FYD ANSWER, using real FYD pipeline machinery on Pig branch fyd-factory. Resume agent ran only remaining verification; nothing touched in the Pig repo, no new repo code.
- Verification results (all three paths green):
  1. Pig self-test (verify-tracer.ts, read-only): PASS resolved chain coppersmith-plumbing; PASS resolved chain happy-place; PASS missing chain (correct missing-link verdict); ALL TRACER TESTS PASSED. Negative control (bogus claim yields MISSING at evidence link, not a fake pass) is the strongest honesty proof.
  2. Local JSON checks: both chains complete:true, 7/7 links resolved, every link has pointer + excerpt, concatDigestMatches:true on pinned raw bytes, claims byte-locatable at exact offsets (happy-place 46535, coppersmith 65239 in pinned index.html), evidence joins resolve to correct objects with website-derived provenance, Ask FYD answers state claim verbatim with citations, partial:false.
  3. sha256 of canonical JSON: chain-happy-place.json 066154e6..31, chain-coppersmith.json bf52d74f..40, both match recorded values.
- Broken links found: 0 of 14. Observations (not failures): ObjectRail binding renders doorway reference only (claim resolves through Services sections); coppersmith claim starts 157 bytes after extractor's recorded range (documented tracer design; strong proof is exact byte offset in pinned file).
- Honest coverage caveat: ONE representative rendered fact per site traced, not every rendered fact. Report: ~/workspace/fyd-factory/lineage/LINEAGE-REPORT.md.
- Night-shift verified-deliverable count: 1 (of 3x baseline target).

## QA-HOSTILE completed (2026-09-23 ~19:36 MDT) - VERDICT: FAIL (real bypasses found)
- Recovered intent: 52 hostile probes (A01-A52) + S1/S2 supplementary against the projection seam (invariant: NO EXECUTABLE SOURCE CONTENT CROSSES THE PROJECTION SEAM). Spot-checked results-extract.json against raw-run-output.txt (trustworthy); ran S1/S2 on Pig via wsl-run.sh (temp cleaned, git tree clean). First-pass verdicts were distorted (46/52 SUSPECT, 43 benign extra-style-close flags); adjudication narrowed to 3 real findings.
- BYPASS (A35, A36): buildCapabilities in src/fyd/object/view.ts interpolates raw contact values into hrefs with NO safe-link gate (committed source, lines 190-192). website: "javascript:alert('A35')" rendered as a LIVE <a href="javascript:alert('A35')">Website</a> on the /o object page, directly and end-to-end through composeObjectView. Genuine XSS-class seam hole.
- BYPASS (A44): <img src="javascript:alert('A44')"> rendered on the hero; no URL gate on DisplayMedia.src (latent in modern browsers, but seam passed an executable scheme through).
- Gate weaknesses: contactMethodFor(email) accepts "><script>...@x.com and emits raw mailto: actionUri (neutralized only by React escaping); same un-gated raw interpolation for call/email capabilities (A37); exportCustomerData emits literal <script> strings in the JSON blob.
- Held: all 15 text probes, all 15 link probes (resolveSafeLink), phone/email gates, theme tokens (escaped), boundary (malformed JSON rejected, no __proto__ pollution), S1/S2.
- Residual risks: /o capability lane bypasses safe-link for call/email/website (only website probed live); theme tokens unvalidated; description uncapped; export JSON must never be inlined into HTML; duplicate object ids not conflict-gated.
- NOTE: LANE-SEC's 20/20 PASS covered the main SitePageView path; the /o object page path was explicitly "code-scanned but not gauntleted" and is where the bypass lives. No contradiction, coverage gap confirmed.
- No fixes applied (evidence only). Report: ~/workspace/fyd-factory/qa/hostile/HOSTILE-VERDICT.md.
- HIGHEST-LEVERAGE FACTORY GAP (morning candidate): the /o object-page XSS hole. Queued SEC-FIX-SPEC lane for minimal fix patch proposals.
- Night-shift verified-deliverable count: 2.

## DEHPP-BUILD-SPEC completed (2026-09-23 ~19:36 MDT)
- Delivered ~/workspace/fyd-factory/dehpp/parameterization-spec.md: Part A 13 typed parameters P1-P13 (name/type/source/transform/fallback; P1 tenantId hard-fail never defaults to another tenant; P2 chromeMode defaults "customer"; P3/P4 section+page order; P5 defaultSectionHeadings copy table; P6 claimKindLabels; P7/P8 ctaHeading+ctaEmphasis; P9 navLabels; P10 layoutCharacter; P11 themeTokenOverrides; P12 provenanceTemplate+meta.eventSequences; P13 seoBrandName). Part B 7 replacement mechanisms B1-B7 (R9 route recompose through strategyForSite/planner; M3 server seam populates galleryMedia/objectMedia; G9 copy table; G10 emit SocialProof when binding verifies; G11 honest comment; S1 CustomerSite vs DemoChrome split; S5 eventSequences as data). Part C removal plans for all 5 dangerous couplings with verification proofs (grep-zero, fixture render tests, CLONE-PROVE re-run gate for R9 route change). Part D invariant assertions for every KEEP-marked row (GIVEN/WHEN/THEN ASSERT). Build order: chrome split first as production safety gate; R9 route change last with CLONE-PROVE re-run required before release.
- CLASSIFICATION GAPS (Part E, need resolution):
  1. COUNT MISMATCH: brief said 54 mechanisms (34/13/7) but classification.md literally has 62 rows (KEEP 51 / PARAMETERIZE 4 / REFACTOR 7); the 13-parameter figure only reconciles counting parameterized sub-values inside KEEP rows. Spec covers all 13 parameters and asserts every KEEP row, so nothing unspecced, but the denominator needs Nolan's confirmation.
  2. S5 (REFACTOR) and S6 (PARAMETERIZE) cover the same footer sentence; implemented together (B2/P12).
  3. N16 "this business" fallback flagged for eventual copy-table treatment; left hardcoded.
  4. CTA "position" had no owning row; assigned P3/P7/P8.
  5. Worker claimed GOLDEN-REFERENCE.md does not exist; check pending (GOLDEN-FREEZE recorded it at ~/workspace/fyd-factory/golden/GOLDEN-REFERENCE.md). R9 recomposition gated on CLONE-PROVE re-run regardless.
  6. M3 replacement assumes a listObjectMedia selector can be added following the M2 role grammar.
- No Pig repo or clone repo touched.

## LANE-ORCH-SPEC completed (2026-09-23 ~19:37 MDT)
- Delivered ~/workspace/fyd-factory/orchestration/BUILD-BUSINESS-SPEC.md (342 lines, zero em dashes).
- sourceManifest schema: manifest_version, business_id, business_name (opt), sources[] (SourceDecl kind/url/fixture_ref/sha256 pin/trust/rights_basis), required_facts (opt), conflict_policy (owner_wins/newest_wins/manual, default manual), owner_identity, presentation_intent, design_tokens, visibility_overrides, regeneration_of, budget. Two JSON examples.
- 12 stages as typed interfaces: ACQUIRE, EXTRACT_OBSERVATIONS, GRADE_CLAIMS (ASK grades), BUILD_GRAPH, RESOLVE_CONFLICTS (no silent winners), ATTEST_PROVENANCE, PLAN_SITE, GENERATE_SPEC, BIND_MEDIA, VERIFY_RENDER_MODEL, RENDER_PROVE, REGENERATE_AND_CERTIFY (owner journal replay; notes no regen lane dir existed yet, LANE-REG now running).
- Result object with exactly the 14 required fields in order. Terminal states with ordered evaluation: FAILED (seam breach / renderable=false / nondeterminism), ACQUISITION_BLOCKED (zero sources or zero observations), NEEDS_OWNER_INPUT (UNKNOWN required facts or unresolved identity/contact conflicts), READY (12 stages complete, digest chain verified, coverage_ratio >= 0.95, renderable=true, zero blockers, claim-honesty gates F-001/F-002/F-003), READY_WITH_WARNINGS (READY minus non-blocking warnings; never on identity/contact/honesty facts).
- Lane-to-stage mapping table covering every completed lane with workspace paths; patches referenced as integration-time, never build-runtime.
- Dependencies (referenced, not duplicated): Phase 17 needs D1 gap list, D2 authority map, D3 publish gate conditions (become extra READY conjuncts), D4 production render path confirmation (resolves QA-TRUTH verifier-gap); until delivered, publish out of scope, spec is DRAFT. Convergence substrate needs S1 event/evidence authority interface, S2 publicGraph query/projection surface, S3 identity authority, S4 typed gap reports into next_actions owned by convergence.
- Open items for coordinator: re-certify against Phase 17 on delivery; confirm 0.95 coverage threshold; OBJECTS-MARGIN augmentation inside or outside certified artifact; charter regen lane or confirm LANE-OWNER replay as stage-12 mechanism.
- No Pig repo changes; read-only inspection.
- Night-shift verified-deliverable count: 4.

## Correction to DEHPP-BUILD-SPEC gap #5 (verified 19:38 MDT)
- GOLDEN-REFERENCE.md DOES exist at ~/workspace/fyd-factory/golden/GOLDEN-REFERENCE.md (18,136 bytes, written 00:56 MDT). The worker's "does not exist" claim is a false alarm (likely wrong path lookup). R9 route-recomposition gate (CLONE-PROVE re-run before release) still stands.

## F2-CORPUS-B completed (2026-09-23 ~19:40 MDT)
- 4 validated non-trade fixtures under ~/workspace/fyd-factory/corpus/fixtures/batch-b/ (generator gen_batch_b_nontrade.py, deterministic, re-runnable): f2b-copper-kettle-cafe (19 objects/18 rels), f2b-mesa-iron-hardware (15/14), f2b-canyon-view-dental (17/16), f2b-willow-creek-inn (14/13). Manifest ~/workspace/fyd-factory/corpus/manifests/batch-b.json (existing trades entries preserved untouched, 4 new appended with vertical tags, segments added). Variation note manifests/batch-b-notes.md.
- Phones verified unique corpus-wide: cafe (970) 555-0120, hardware (970) 555-0125, dental (970) 555-0126, inn (970) 555-0133. (970) 555-0131 registered as conflict artifact (rival claim inside dental fixture) so future fixtures avoid it.
- Variation thesis: cafe menu-centric (menu page as first-class surface, specials feed, allergen guide); retail catalog-centric (product catalog with department grouping, buying guide, no team page); dental people-centric (credentialed team leads, intake content, patient education); inn inventory+seasonality (bookable rooms, testimonial surface, seasonality banner). Cross-vertical stress: services wear 4 hats (menu item/product/care service/room), articles 4 roles, posts 3 roles, media needs differ per vertical.
- Conflicts preserved not smoothed: cafe hours (website vs directory), hardware skillet price ($42 vs $46), dental phone (0126 vs 0131), inn check-in (15:00 vs 16:00) + closure dates (Jan 5-Feb 20 vs Jan 10-Feb 15).
- Validator repairs made (corpus tooling): phone regex fixed to capture 3 digits after "01"; validation scoped to batch-b envelope fixtures (clearwater legacy envelope out of scope); phone uniqueness enforced on business object's canonical phone.
- Night-shift verified-deliverable count: 5.

## FYD 500-SITE FACTORY STRESS PROGRAM ADOPTED (2026-09-23 19:40 MDT, Nolan's directive)
- This program is now the factory's GOVERNING PROGRAM. It replaces any "generate N websites" framing. Goal: build the machine that PROVES 500, making 5,000 a capacity decision. Not 5,000 websites.
- Pipeline: DIGITAL EXISTENCE -> OBSERVATIONS -> EVIDENCE -> ENTITY RESOLUTION -> OBJECT GRAPH -> OWNER INTENT -> SITE STRATEGY -> SITE SPEC -> CAPABILITIES -> PROJECTIONS -> ASK FYD -> OWNER ACTIONS -> OUTCOMES -> REOBSERVATION. Website is projection #1 (same entity later supports Circle, social, search, campaigns, agents, MCP, protocol projections, mobile, embeds). Never optimize into a website generator.
- Architecture law: 500 businesses = 500 source records, 500 evidence sets, 500 object graphs, 500 site specs through ONE renderer, ONE component registry, ONE design system, ONE capability model. 500 React applications = architecture failed, stop.
- Strategies: keep the three (trades, knowledge/professional, technology). Do NOT hand-code 75 more. Run the corpus, measure where they fail, discover composition dimensions. Planner composes from dimensions, never if-plumber-template-17. (Compatible with DEHPP-BUILD-SPEC parameterization.)
- Corpus law: learn business types from evidence, no giant ontology first. Real public/authorized sites prove acquisition reality; synthetic proves combinatorial coverage, deliberately hostile. Synthetic is for testing ONLY, never presented as a real prospect.
- Authority discipline: automate effort aggressively, delegate authority conservatively. 500 acquisitions/renders/evaluations: automate. 500 unsolicited messages: DO NOT SEND. No AUTO_EMAIL_5000. Prepared != contact authorized.
- Cohorts: first 5,000 SYNTHETIC/RECORDED graph compilation jobs (measure throughput, p50/p95/p99 stage latency, memory, CPU, queue depth, retry rate, cache hit rate, model calls, tokens, cost, browser escalation rate, failure taxonomy, quarantine rate, determinism mismatches, incremental invalidation size). Then real cohorts 10 -> 25 -> 50 -> 100 -> 500, escalating only when the previous cohort's failure distribution is understood.
- Golden set: 25-50 manually adjudicated across business types; the 500 corpus measures breadth, the golden set measures correctness.
- Wave N1b (spawned 19:41 MDT, 6 workers; factory at 16/16):
  10. LANE-BATCH-SPEC: batch factory spec (manifest, 14 stages idempotent/resumable/observable/bounded, run durability, per-presence outcomes, queue states, hostile-input processor bounds). -> batch/BATCH-FACTORY-SPEC.md
  11. LANE-INVARIANTS: 10 programmatic invariants as executable probes (determinism, hidden-leak, unbound-claims, unsafe-URLs, correction-survives-reobservation, hide-not-delete, capability gating, conflict honesty, targeted invalidation). -> invariants/INVARIANTS-REPORT.md
  12. LANE-INCREMENTAL: incremental compilation design + measured invalidation proof (content-addressable digests, dependency tracking, deterministic work identity, occurrence-based identity). -> incremental/INCREMENTAL-SPEC.md + INCREMENTAL-PROOF.md
  13. LANE-CHAOS: chaos matrix, safe subset executed (Pig sleep + browser-target drops SIMULATED only). -> chaos/CHAOS-REPORT.md
  14. LANE-GOLDEN-SET: adjudication protocol + first 10 real-business candidates (Mesa County corridor + neighbors, 6+ types, research only, no contact). -> golden-set/GOLDEN-SET-PLAN.md
  15. LANE-SCHEMA-FUZZ: valid + hostile schema combinations, deliberate mutation, per-set pass rates, schema gaps. -> fuzz/SCHEMA-FUZZ-REPORT.md
- Wave N2 queue (unchanged): TD-001 synthesizer (after adversarial review) -> integrate; DEHPP-BUILD (after CLONE-PROVE PROCEED) -> parameterized implementation; VQ repair application + visual re-verify; first end-to-end on Clearwater; Ask FYD evaluation harness (per-program hierarchy) to be chartered after TD-002.
- Morning report will follow Nolan's specified shape: factory version, real businesses processed, synthetic graphs processed, composition coverage, generation success, quarantined, failure taxonomy, customer-specific code, determinism mismatches, owner-override regen survival, Ask FYD supported/refusal, mobile, unsafe outputs, p50/p95 pipeline, cache hit rate, browser escalation rate, model calls/site, estimated cost/site, incremental rebuild size, worker crash recovery, duplicate job safety, top 10 generic improvements, owner-ready previews, safe human-reviewed outreach candidates, first scale bottleneck, next highest-leverage fix.
- Coordination: build-program coordinator owns Temporal/Trigger.dev harvest lanes; factory consumes via state file, does not duplicate. Phase 17 dependency and substrate dependencies unchanged (recorded, not duplicated).

## LANE-CLAIM completed (2026-09-23 ~19:42 MDT) - VERDICT: FAIL
- Delivered ~/workspace/fyd-factory/claim/CLAIM-VERDICT.md. All attack categories re-run from surviving artifacts; 5 baseline render tests re-run to confirm. On clean evidenced fixtures the machinery is honest (full-text audit: every rendered value binds as direct evidence, zero misses).
- FINDINGS (all with exact evidence):
  1. H4/R-H4 TWO-VERIFIER SEAM: renderer calls verifyPresentationBinding in graph.ts which accepts derived and owner_authored UNCONDITIONALLY (case fall-through returns {ok:true}), while the strong BindingVerifier refuses them without input evidence or recorded owner assertion. Reproduced end to end: owner_authored phone with no assertion renders "970-245-3869" while BindingVerifier says UNBOUND. The "no binding, no factual output" comment only holds relative to the weaker verifier.
  2. R-MODEL: production /sites path never runs the strong verifier; only /build/[siteId] uses planner/buildVerifiedRenderModel. Tampering the graph after model build (phone 970-000-0000) publishes the tampered value the verified model never saw. Strong verifier covers 0% of public-page claims by construction (confirms QA-TRUTH architectural finding from the attack side).
  3. H3/R-CORRECTED EVIDENCE LAUNDERING: owner-corrected phone (owner value 970-000-0001) renders, then a direct binding grades the owner's value as BOUND with source evidence-ref even though the ref covers the SOURCE value 970-245-3869.
  4. H2 GATE DISAGREEMENT: assertSpecBindingsVerified passes without throwing on a generated-no-evidence binding while buildVerifiedRenderModel throws on the same binding.
  5. H5 SILENT SOURCE MISATTRIBUTION: a binding's own evidenceRef ("google-business-profile:acme-123") is replaced with the object-level ref ("website-ingestion:https://example.com/").
  6. H8 EMPIRICAL 32-BIT DIGEST COLLISION: digest "faebba73" found in ~4s mapping two different fact sets ("555-61245", "555-83635"). The digest is NOT a semantic identity. CONSEQUENCE: incremental compilation digests must be >=256-bit; forwarded to LANE-INCREMENTAL.
  7. H9 COMPOSED-CLAIM BLINDNESS: verifier grades the raw field value ("2009"), never the composed presentation ("Serving the valley since 2009").
  8. H1: derived claims with empty provenance ref grade BOUND. H6: private objects grade BOUND at the verifier (partially mitigated at render by visibility filter, confirmed by probe). H7: byte-exact matching voids real owner assertions over a trailing space (false negative).
- Residual: applyPresentationIntent mutates spec copy post-generateSiteSpec on /sites path with no re-verification (untested, same class as R-MODEL).
- No fixes made; repo was git read-only. Findings forwarded to LANE-EVIDENCE-WIRE-SPEC (two-verifier seam + R-MODEL feed its wire design).
- Night-shift verified-deliverable count: 6.

## TD-001 adversarial review completed (2026-09-23 ~19:41 MDT)
- Delivered ~/workspace/fyd-factory/tournaments/td-001/adversarial-review.md (zero em dashes, repo read-only).
- Contestant A: CORRECT. Contestant B: CORRECT. Both claims verified independently against Pig fyd-factory HEAD e48ef710: 4a9cc919 (2026-09-21 15:42) changed explorePage from bare {kind:"all",limit:20} to eligibleComponents(s).includes("ObjectFeed") narrowing; eligibleComponents(external_identity) = ["GenericObjectCard"]; validator expands bare all but honors explicit schemas (fail-closed by design). Live repro with real coppersmith projection: explore query excludes external_identity, zero errors, renderable:true.
- Recommendation: (a) INTEGRATE A'S PATCH. A's 4-test suite pins the full acceptance surface (schema-to-component contract, anti-vacuity fixture guard, narrowing outcome coupled with end-to-end validation in one test, happy-place acceptance). B's query-shape test can pass vacuously in isolation. Same zero blast radius. Patches mutually exclusive (identical file path), pick one.
- Counter-case hunt: NO LIVE DEFECT. /build/[siteId] planner calls generateSiteSpec directly, inherits narrowing; customize layer never touches queries; generator.ts:284 is the only all-query emitter in src/; narrowing is per-graph, all tenants protected.
- Hygiene note (not a defect): registry acceptsSchemas for ObjectFeed is narrower than SCHEMA_COMPONENTS with no consumers outside the registry file; "one mapping, three consumers" comment is aspirational; reconcile before it gains a real consumer.
- Next: TD-001 synthesizer (spawned) to formalize selection and produce the integration-ready patch + proof plan.

## NIGHT BUILD AUTHORIZED (2026-09-23 19:45 MDT, Nolan's directive) - coordinator: night-build subagent
- VERCEL PROTECTED PREVIEW: GO. Preview only, never public production. Deployment Protection (Vercel Authentication). No Oracle/DB credentials on Vercel; sanitized BFF/API boundary only. Rollback preserved (no production promotion).
- REAL-SITE COHORT: 10 sites, acquisition testing ONLY. Public pages, robots.txt honored, conservative rate, read-only. No contact/outreach/publication/affiliation claims. Purpose: break the machine. Per-site metrics feed the 80% acquisition stack decision.
- MEDIA: authorized demo media -> digest/derive/provenance, FYD-controlled derivatives. Cohort media: provenance records only, bounded temp derivatives, never publicly republish third-party assets.
- DEMO_OWNER_MODE: preview-scoped only, visibly marked, fail-closed, logged as simulated authority. Real auth before real customer control.
- ASK FYD: evidence-backed Q&A battery is P0 (more important than another visual component).
- THE NIGHT'S QUESTION: can ONE general machine turn ten messy real presences into trustworthy structured experiences with ZERO customer-specific code? 4/10 same missing primitive = high priority; 1/10 bizarre = log only. NO feature expansion from the cohort.
- Verified pre-flight: Pig repo /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (matches golden freeze). Working tree has 93 dirty files -> preview builds from a CLEAN WORKTREE at e48ef710, new preview-only files, zero shared-file modifications. Vercel account has 0 projects -> new project fyd-night-preview. No git pushes (deploy via Vercel REST API file upload).
- Spawned 2026-09-23 ~19:50 MDT:
  N1. NIGHT-VERCEL: protected preview assembly + deploy + verify. -> preview/PREVIEW-REPORT.md
  N2. NIGHT-COHORT: 10 real-site acquisition tests, break-the-machine report. -> cohort/COHORT-REPORT.md + cohort/acquisitions/*.json
  N3. NIGHT-MEDIA: authorized media digest/derive/provenance + media abstraction. -> media/MEDIA-REPORT.md + media/impl/
  N4. NIGHT-ASK-OWNER: Ask FYD eval battery + DEMO_OWNER_MODE spec + preview route files (staging for N1). -> ask/ASK-EVAL-REPORT.md + /home/nolan/fyd-preview-staging/
- Dependencies: N1 deploys only after N4 staging files and N2 cohort fixtures land (coordinator relays paths). N3 derivatives optional for N1.

## SCALE-UP ORDERED (2026-09-23 19:51 MDT, Nolan's steering)
- "Keep the object model at the center, keep the factory swarms running, ADD ANOTHER 500 and keep going."
- Translation: double synthetic/recorded graph-compilation throughput toward the 5,000-job stress target. Object graph remains the canonical center of every job (graph -> SiteSpec -> validate -> render; no spec without a graph; no customer-specific code paths). Same invariants, same authority discipline (read-only, no external actions, synthetic never presented as real).
- Night-build swarms (N1-N4) continue undisturbed. Compilation wave is additive.
- Spawned 2026-09-23 ~19:52 MDT:
  C1. COMPILE-HARNESS: graph-compilation job runner + metrics schema + file-based idempotent/resumable queue. Pilot 20 jobs. -> compilation/HARNESS.md + compilation/runner/
  C2. COMPILE-RUN-A: 500 compilation jobs, shard A (harness + assignment relayed when C1 lands; pilots imports meanwhile).
  C3. COMPILE-RUN-B: 500 compilation jobs, shard B (same gating).
  C4. SYNTH-HOSTILE: ~40 hostile synthetic fixtures (no JSON-LD, conflicting hours, 100 services, unsafe URLs, RTL text, franchises, stale sources, contradictory sources, broken media), validated, testing-only. -> corpus/fixtures/hostile/
- Per-job metrics: stage latencies, wall time, memory, outcome, failure stage, digest, determinism match, counts, unsafe_url_count, unbound_claim_count. Failure taxonomy feeds the 5,000-job stress target.

## CORRECTION (2026-09-23 ~19:55 MDT, coordinator's own catch)
- The 19:45 entry said night-build lanes N1-N4 were "spawned". They were planned and recorded but the spawns never issued. All four were actually spawned at ~19:55 MDT after a roster check exposed the gap. Lesson: verify spawns against subagent.list before claiming them.

## Night build actually running (spawned 19:55 MDT)
- N1. NIGHT-VERCEL (43108518): protected preview assembly + deploy + verify. Carries the 5 SEC-FIX patches to apply to the preview worktree only (git apply --check first; patches were checked against the dirty working tree and may not apply to clean e48ef710). Gated on N4 staging files + N2 cohort fixtures.
- N2. NIGHT-COHORT (b761b0d7): 10 real-site acquisition tests.
- N3. NIGHT-MEDIA (1e3682e4): authorized media pipeline + abstraction.
- N4. NIGHT-ASK-OWNER (d16af8e0): preview route files first, then Ask FYD eval battery + DEMO_OWNER_MODE spec.

## Completions since 19:52 MDT
- TD-001 SYNTHESIZER: INTEGRATION-PLAN.md done. Contestant A's patch selected (+65 lines, 1 new test file, zero production files, git apply --check OK). Exact integration steps + rollback (delete the file) documented. Integration itself is a parent decision (working tree has 93 dirty files; apply only the patch).
- F4-PRESSURE: PRESSURE-REPORT.md, verdict FAIL. 10/12 attack classes fail closed. Malformed-fields class: 6 uncaught TypeErrors (F-1 description:null, F-2 fields:null, F-3 objects:null, F-4 relationships:null, F-5 undefined member, F-6 fields:undefined in buildRenderContext) + F-8: title:null renders literal page title "About null" with 0 validator errors (INVENTED-CLAIM) + F-7: duplicate object ids resolve inconsistently across the generator/renderer seam (spec says First Title, render resolves Second Title). No fixes applied. Feeds the compilation failure taxonomy.
- LANE-GOLDEN-SET: GOLDEN-SET-PLAN.md done. Adjudication protocol (fields, evidence requirements, truth-set record format with append-only versioned corrections, human adjudication, disagreement resolution, currency rule, scoring use). First 10 candidates: Stocker Heating and Cooling (HVAC), Tree Climbers Services, Hot Tomato Cafe and Pizzeria (Fruita), Kannah Creek Brewing Company, Wine Country Inn (Palisade), Bray Real Estate, DWC CPAs and Advisors, Enstrom Candies (retail), Elevation Family Dental, SavATree Grand Junction branch (franchise edge case, acquisition-testing only, NOT an outreach prospect). Wave 2 shortlist to reach 25 included.
- SEC-FIX-SPEC: 5 patches, all git apply --check OK against the working tree: o-capability-safe-link (REQUIRED), o-contact-block-safe-link (REQUIRED, second render site found), display-media-src-allowlist (REQUIRED, adopted), export-customer-data-script-escape (REQUIRED), safe-link-email-shape-tighten (RECOMMENDED). Design invariants: resolveSafeLink stays the single link authority. Relayed to NIGHT-VERCEL for preview-worktree application.

## Re-dispatched (infrastructure timeouts, not task failures)
- LANE-BATCH-SPEC (c1fd057b) and LANE-CHAOS (904902bf) both died on transient DB/spawn errors; re-spawned with identical briefs. Two spawn attempts also hit lock timeouts before succeeding; infrastructure is flaky tonight, retries are succeeding.

## Observed, not duplicated
- A concurrent lane created src/fyd/ask/context-compiler.ts on the Pig at 19:47 MDT (Ask FYD context compiler). That is build-program coordinator territory; factory lanes consume it, do not duplicate it.

## NOLAN'S 20-AGENT PROGRAM: FORENSIC ASSIGNMENTS (2026-09-23 ~19:58 MDT, added to this factory)
- Spawned 19:59 MDT, run IN PARALLEL with the factory stress program, Vercel preview, and 10-site cohort. They feed those; they do not block them. No publish, no outreach.
- AGENT 17 (1e58d111): WEBSITE / PRODUCT SURFACE FORENSICS. Inventory every route, API, frontend, deployment, site, domain concept, integration, backing authority. Classify customer-facing / operator-facing / admin / dead-or-disabled. Identify disconnected product/runtime boundaries. Light read-only local testing where safe. -> forensics/AGENT-17-SURFACE-MAP.md
- AGENT 18 (0ec85886): HAPPY PLACE / COPPERSMITH / ASK FYD domain audits (frontend, routes, API, identity, data, events, missions, knowledge, retrieval, evidence, workers, deployment, observability, tests, missing boundaries). For Ask FYD: end-to-end trace of whether answers can become genuinely evidence-backed with canonical provenance (through the known seam findings: two-verifier seam, R-MODEL, H3 laundering, H9 composed-claim blindness). -> forensics/AGENT-18-DOMAIN-AUDIT.md
- Shared record format for EVERY finding: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS. Writers do not certify themselves; independent critics falsify.
- Morning target stands: one protected URL, Happy Place + Coppersmith + cohort generations, full owner loop, cohort failure report.

## CLONE-PROVE: PROCEED (2026-09-23 ~19:53 MDT) -> DEHPP-BUILD UNLOCKED
- Verdict PROCEED, zero divergences: 77/77 files byte-identical to frozen SHA e48ef710, SPEC_IDENTICAL (14/14 keys), 10/10 fidelity checklist PASS, widths 320-1440 CSS-driven (no server width branching). Known donor defects preserved exactly (out of scope). Extraction used git objects at the frozen SHA (worktree is dirty in render-path files); Pig stayed git read-only. Committed on clone repo local master (749e040 + 4d3e3c5). Caveats: Pig :3100 serves dirty worktree (not golden); golden/evidence/pig-route-home.html on disk (73,800 bytes) no longer matches GOLDEN-REFERENCE.md's 60,747 bytes; byte-exact hpp-composed-spec.json remains the trustworthy golden artifact; clone is a source snapshot, not a runnable app.
- DEHPP-BUILD spawned (~20:02 MDT, 43fd2fc6): new local branch fyd-dehpp from e48ef710 (never the dirty fyd-factory tree), 13 typed params, 7 replacement mechanisms, 5 dangerous couplings removed, customer/demo chrome split first, route recomposition last with renewed fidelity proof (SPEC_IDENTICAL vs golden required). Zero customer-specific branches. No pushes.

## Completions batch (~19:53-20:00 MDT)
- LANE-INCREMENTAL: INCREMENTAL-SPEC.md + INCREMENTAL-PROOF.md + proof/. Measured: one phone change on Clearwater (25 objects) -> 24/25 object digests byte-identical, exactly 6 sections rebuilt (forward prediction = measured invalidation), services page cache hit, output diff (4 sections) strict subset of dependency invalidation (6). Digests are SHA-256 (answers LANE-CLAIM H8 32-bit collision). New ingestions create new occurrence ids (immutable history preserved); stability lives at OBJECT and below.
- SYNTH-HOSTILE: 40 hostile fixtures + corpus/manifests/hostile.json, all testing-only marked (franchise-lookalikes, conflicting hours, unsafe URLs, RTL, 100 services, stale/contradictory sources, broken media, no-JSON-LD).
- LANE-BATCH-SPEC (re-dispatch): batch/BATCH-FACTORY-SPEC.md (54KB) delivered.
- LANE-MEDIA (parent lane): media/MEDIA-LANE-REPORT.md delivered. (NIGHT-MEDIA, the night-build lane, still running: 66/73.)
- COMPILE-RUN-A (64/73): completed quickly with pilot artifacts only (compilation/shard-a/pilot.ts, css-hook.mjs); correctly did NOT start the 500-job run (harness not yet landed). When COMPILE-HARNESS completes, re-dispatch RUN-A-full with the harness + shard A assignment; RUN-B (62/73, still running) gets shard B via coordinator message.

## Still running (13): TD-002, LANE-EVIDENCE-WIRE-SPEC, VQ-REPAIR-SPEC, LANE-SCHEMA-FUZZ, LANE-INVARIANTS, COMPILE-RUN-B, COMPILE-HARNESS, NIGHT-MEDIA, NIGHT-COHORT, NIGHT-VERCEL, NIGHT-ASK-OWNER, LANE-CHAOS (re-dispatch), AGENT-17, AGENT-18, DEHPP-BUILD.

## STANDING INVARIANT: NO STOPPING CONDITIONS (2026-09-23 20:03 MDT, Nolan's standing order)
- At minimum, read-only cognition runs ALWAYS. If write lanes must throttle or pause (saturation, safety, gates), discovery, auditing, falsification, verification, and learning continue without pause. The factory never goes fully idle. A finished worker takes the next unclaimed shard, then falsifies, then discovers its next highest-value gap. Recorded as standing invariant.

## MAXIMUM PARALLEL MISSION PROGRAM (2026-09-23 20:03 MDT, Nolan's order)
- Fleet allocations are LOGICAL work units, not processes: fan out as capacity allows, measure saturation (CPU/memory/DB pools/browsers/worktrees/API limits), never crash the machine for a number.
- Queues: 5,000 WORLD (diverse business worlds, full pipeline to render+verify), 3,500 OBJECT (object->sitespec->renderer), 3,000 PROJECTION (one graph, many surfaces; public/private/hidden invariants), 1,500 SYNTH (operating worlds: owner correction -> reobservation -> regen survival), 1,000 DECISION (decision/policy units with the full decomposition contract; high confidence never overrides authority).
- Protocol: ~/workspace/fyd-factory/missions/MISSION-PROTOCOL.md (deterministic world addressing, per-class pipelines, failure loop: generic class -> minimize repro -> fixture -> patch ONE authorized path -> test -> falsify -> requeue; patches as checked files, repo writes parent-gated; one writer per mutable semantic unit).
- Decision backlog seeded: ~/workspace/fyd-factory/missions/decision-backlog.jsonl (D-001..D-015: TD-001/SEC-FIX integrations, F-1..F-8, H3/H4/H8/H9, DEHPP denominator, 0.95 bar, VQ repairs, registry hygiene, Phase 17 gaps).
- Wave 1 (this turn): 4 WORLD workers (shards 0-3, 2,000 worlds). Wave 2 next: OBJECT x2, PROJECTION x2, SYNTH x1, DECISION x1. Expand on measured saturation.
- YOLO MODE in effect: decide at 80%+, test, document, continue. Hard boundaries stand (no public prod launch, no owner contact, no destructive git, no credential exposure, vendor veto, no synthetic as real).
- Tonight's concrete targets unchanged: protected preview URL, 10-site cohort, evidence-backed Ask FYD, cohort failure report.

## WAVE 1 DEPLOYED (2026-09-23 ~20:10 MDT): 10 mission workers
- WORLD x4: shards 0-3, 2,000 diverse worlds (f5f86e64, da9831b9, b8507509, 7b5cefab)
- OBJECT x2: shards 0-1, 1,000 object->sitespec->renderer missions (7d5747de, 2c33f393)
- PROJECTION x2: shards 0-1, 1,000 one-graph-many-surfaces missions (1484a202, 3b678fba)
- SYNTH x1: shard 0, 500 operating worlds, reobservation survival (eb135649)
- DECISION x1: shard 0, 250 decision/policy units (e7adb3db)
- Protocol: missions/MISSION-PROTOCOL.md. Spawn DB flaked on 4 of 14 attempts (broken pipe / lock timeout / control timeout); sequential single spawns landed all. Wave 2 (WORLD shards 4-9, OBJECT 2-6, PROJECTION 2-5, SYNTH 1-2, DECISION 1-3: 20 more workers) waits on measured saturation from wave 1.

## LANE-SCHEMA-FUZZ complete (2026-09-23 ~20:01 MDT): 8 schema gaps
- Valid 12/12 pass (zero false rejections); hostile 15/20 fail closed; zero crashes, zero invented claims, zero unsafe output across 20 hostile cases. fuzz/fuzz.ts + fuzz/SCHEMA-FUZZ-REPORT.md + fuzz/fuzz-results.json.
- G1 (top): validateAgainstSchema NOT wired into the pipeline; generateSiteSpec/validateSiteSpec/buildRenderContext never call it. Schema-invalid objects compile into live sites silently. G2: url field warning-only, javascript: passes with warning (real guard only downstream). G3: capability grants evidence-blind. G4: resolveQuery no dedupe (generator dedupes, render path does not). G5: relationship rules unenforced/incomplete. G6: no duplicate-id/cycle detection. G7: schema-gate covers 3 schemas only. G8: inactive-revokes unenforced.
- Held: unknown/empty/injected schemas fail closed; dangling relationships dropped without invention; spec mutations caught; private objects never render; byte-identical determinism; 421 objects in 6ms.

## AGENT-17 complete (2026-09-23 ~20:05 MDT): forensics/AGENT-17-SURFACE-MAP.md
- Counts: 35 pages (31 live, 4 middleware-disabled) | 49 API route files | 784 files under src/. Deployment surfaces: Pig :3100 live (verified /api/health 200, /sites/happy-place 200, /objects 404), Vercel config present, happy-place-platform.vercel.app (different account), fyd-night-preview in progress.
- 12 broken boundaries (shared record format), top: (1) evidence->binding-verifier->renderer: documented required boundary is NOT the serving path; (2) renderer truth seam H4/R-H4 with nuance; (3) two renderers, two href policies; (4) API-without-frontend: unaudited attack surface live (social identity minting, claim-adjacent writes); (5) frontend-without-API dead refs; (6) tenant isolation is route-shape-dependent, least-trustworthy shape on highest-traffic object page; (7) unauthenticated event ingestion into evidence-adjacent log; (8) auth surface without product entry point; (9) demo-auth writes share host with live product, journal separation comment-level; (10) router disablement does not disable runtime (strong-verifier path only via 404 page, APIs still callable); (11) secret-gated endpoint with public default secret; (12) read-your-writes gap: owner override appears only after next regen, no staleness state.
- Notes: /o/[objectId]/manage is operator-facing (DemoOwnerContext); /build/[siteId] disabled but only non-test caller of builder/planner; /api/fyd/social/* has NO in-repo frontend caller.

## NIGHT-MEDIA complete (2026-09-23 ~20:30 MDT): media/MEDIA-REPORT.md
- 11 PING-owned brand assets: sha256 digested, provenance-recorded, 57 web-optimized derivatives (6.5 MB), all digests verified, derivedFrom links correct. Abstraction: media/impl/authorized-media-pipeline.ts (node:crypto only), 27/27 smoke tests pass. Cohort: 10 real sites URL-only (one homepage GET each, robots.txt checked, 2s spacing); 18 media references recorded, zero image bytes downloaded. Derivatives staged for NIGHT-VERCEL copy into public/fyd-media/.

## LANE-CHAOS re-dispatched (2nd time, b199a5b3): both prior attempts died on infra timeouts at startup. Proofs required: duplicate job safety, worker crash recovery (kill -9 mid-append), corrupt cache entry detection, source change mid-run.
## LANE-BATCH-SPEC first attempt (55/84) errored on infra timeout: already superseded by completed re-dispatch c1fd057b. No action.

## AGENT-17 full handoff (2026-09-23 ~20:28 MDT)
- Top 5 broken boundaries: (1) strong BindingVerifier bypassed on live path (only non-test caller is the 404'd /build/[siteId]); (2) renderer uses weak verifier (nuance: binding-verifier.ts enforces, nothing on serving path calls it); (3) /o view.ts interpolates untrusted hrefs, no scheme check, unlike sites renderer; (4) orphaned APIs still served live (/api/fyd/social/* x5, projection, media, circle, resources/download, ping/feed, ping/actions, ping/object: zero in-repo callers); inverse: /api/estimate and /api/drive/* referenced by frontend but no route exists; (5) TRIPLE ASK SURFACE with divergent tenancy: legacy flat /api/fyd/ask (still used by /o despite its own deprecation docstring), /api/fyd/ask/[siteId] (trusted path), /api/ping/ask (gateway BFF), hardcoded /api/fyd/ask/happy-place in spatial-ask-panel.
- Also: unsigned Kit webhook POST -> HPP event log (HIGH); dual OAuth no UI entry point; demo-auth owner writes satisfiable on Pig private network (HIGH structural); diagnostics bearer fallback 'dev-diagnostic-secret' (HIGH); dump-vs-gateway read split with no freshness signal; TD-001 note: no explore endpoint at this HEAD, per-graph narrowing lives in ask-pipeline via TenantContext (present, enforced).
- CORRECTION: AGENT-17 reported SEC-FIX-SPEC "not found"; the 5 checked patches DO exist at ~/workspace/fyd-factory/security/ (agent searched repo root and ~/workspace root, missed the fyd-factory subdirectory). Patches stand.

## NIGHT-MEDIA full handoff (2026-09-23 ~20:06 MDT)
- Derivation used PIL 10.2.0 (no sharp/imagemagick on sandbox); byte-parity re-derive is a possible follow-up (manifests carry per-variant digests). Module executed under node type-stripping (no tsc on sandbox), 27/27 assertions. Cohort provenance: media/cohort/cohort-media-provenance.md. Pig repo read-only throughout.

## LANE-BATCH-SPEC full handoff (2026-09-23 ~19:56 MDT)
- 14-stage boundedness table delivered (CPU/mem/wall/response-size/response-count per stage; supervisor-enforced, bound_exceeded kills attempt). Never-retried classes: seam breach, hostile render payloads, digest mismatch, determinism mismatch, policy violations. Open items O1-O6 for coordinator. Cohort ladder gates: quarantine < 5%, zero determinism mismatches, zero seam breaches.

## TD-002 verdict: VULNERABLE (2026-09-23 ~20:25 MDT) -> relayed to NIGHT-ASK-OWNER
- tournaments/td-002/TD-002-VERDICT.md. 13-test hostile suite, all 13 pass (vulnerability confirmed, not fixed).
- (1) CONFIRMED live-path leak: street-level address in an address-bearing field NOT named "*address*" is served verbatim ("Location on record: 999 Secret Lane..."). answerAskFyd -> publicGraphOf -> applyFieldVisibility(graph, []) only coarsens names containing "address"; legacy composer reads fieldOf(target,"location") verbatim. Contradicts visitor-answer.ts:14's own contract.
- (2) Concierge NOT wired into any live path (ask-concierge-wire.patch unapplied); its throw-on-ungrounded-claim invariant protects nothing in production.
- (3) Owner HIDE ignored by Ask FYD (hardwired []); latent today (no production persistence for decisions).
- (4) Concierge is caller-trust, zero visibility filtering (emitted private owner/service as SUPPORTED on unprojected graph).
- What held: private OBJECTS never leak (excluded from answers/citations, objectId -> 404, relationships dropped, mode:owner grants nothing).
- Relayed to NIGHT-ASK-OWNER (69/85): fold leak + wiring seam + HIDE divergence into eval battery and DEMO_OWNER_MODE spec.

## LANE-REG verdict: PROVEN (2026-09-23 ~19:41 MDT)
- regen/REG-PROOF.md. All 9 assertions PASS: owner correction via assertCorrection survives regeneration (append-only journal replays over fresh facts); supersession chain intact (A1 kept, A2 wins); determinism control byte-identical. Pig lane tests: owner-mode 34/34 green. Caveat: changed-source path pinned by corrections.test.ts (green). This is the key owner-loop invariant for Nolan's demo.

## LANE-MEDIA (parent lane) complete (2026-09-23 ~19:57 MDT)
- media/MEDIA-LANE-REPORT.md. 14 suites, 149 tests green (42 new). 4 new modules under src/fyd/media/ (authority-binding, authority-projection, generated-treatment, media-tokens); zero shared-file modifications; thin consumer of PING media authorities. No patch proposals (nothing requires shared-file changes).

## F4-PRESSURE full handoff (2026-09-23 ~19:50 MDT)
- pressure/PRESSURE-REPORT.md. Verdict FAIL. F-1..F-6 crashes (null description/fields/objects/relationships, undefined member, fields:undefined in buildRenderContext), F-7 duplicate-id seam inconsistency (generator first-wins vs renderer Map last-wins), F-8 "About null" invented claim with 0 validator errors. 10/12 classes fail closed.

## Deconfliction: two LANE-CHAOS running (71/85 owns CHAOS-REPORT.md; 85/85 redirected to CHAOS-REPORT-R2.md).

## Compile pilots reconciled -> COMPILE-HARNESS (2026-09-23 ~20:55 MDT)
- RUN-A (64/85) and RUN-B (62/85) pilots both green (3/3 fixtures, deterministic, sub-ms/job after warmup). Discrepancy flagged: RUN-A says buildRenderContext IS exported (src/fyd/components/renderer.tsx); RUN-B says it does not exist and the real builder is buildSemanticRenderModel (src/fyd/sitespec/render-model.ts:100). Harness must verify both against the repo and pick the production-path builder.
- Tooling findings relayed: tsx cannot resolve `@/` alias (no baseUrl); RUN-B recommends jest+ts-jest runner mirroring repo's own sitespec jest config; RUN-A's css-hook.mjs solves the .module.css import crash. Batch many jobs per warm process (tsx cold start dominates). Delimited stdout markers (Pig stdout interleaves). Hostile fixtures now exist (40) for shard B.
- RUN-A/RUN-B 500-job runs stay gated on harness + shard plan.

## TD-001 full handoff (2026-09-23 ~19:48 MDT)
- Contestant A selected (broader tripwire coverage, same zero blast radius). INTEGRATION-PLAN.md: git apply, vitest run new suite + builder suites, rollback = rm one test file. Integration is a morning decision.

## NIGHT-ASK-OWNER complete (2026-09-23 ~21:03 MDT)
- ask/ASK-EVAL-REPORT.md (319 lines). Staging on Pig /home/nolan/fyd-preview-staging/: ask/page.tsx -> src/app/preview/ask/page.tsx; owner-console/page.tsx -> src/app/preview/owner-console/page.tsx; STAGING-README.md. Env-gated DEMO_OWNER_MODE=1 with route-level notFound; HIDE divergence disclosed on the page (in-console, in-memory; Ask FYD does not consume).
- Eval battery 3 sites x 6 questions: claims cited w/ per-claim grades; unknowns refuse in required form; fail-closes correct. Gaps documented (non-blocking): compound-question match order -> provenance; scanConflicts misses hours + external_identity conflicts (clearwater intended hours conflict MISSED); owner-asserted provenance mislabeled "Source: The business website".
- Confirmed with line refs: concierge unwired in live path (0 refs in src/fyd/ask/answer.ts); preview ask route is first serving path for the concierge invariant. TD-002 leak re-verified by line: visitor-answer.ts:184 + field-visibility.ts:72 + ask-composer.ts:708. Zero visibility filtering in concierge; withholding is caller-enforced via public projection.
- DEMO_OWNER_MODE spec = section 5 of the report. Relayed to NIGHT-VERCEL (unblocks its JOB 2 staging).

## Shared-tree incident (resolved, no action)
- 20:54-20:55: lane E schema<->component convergence edit created a transient circular import mid-edit (schemas.ts -> components/registry.ts -> sitespec/schemas.ts), which broke N4's temp hostile re-run in that window. Writer completed at 20:56:53: SCHEMA_ROLES moved to no-import leaf src/fyd/sitespec/schema-roles.ts; verified final graph acyclic (registry.ts has exactly one import, the leaf; schemas.ts re-exports). NIGHT-VERCEL builds in a separate clean worktree at the frozen SHA: unaffected. Symptom recorded: lanes editing shared files while another lane tests them -> transient breakage. No stop issued.

## LANE-INVARIANTS complete (2026-09-23 ~21:07 MDT)
- invariants/INVARIANTS-REPORT.md. 90 executable probes vs real Pig machinery, 89 PASS / 1 FAIL. Suite staged on Pig at src/fyd/invariants/__tests__/ (10 files + support.ts + hostile-view.ts, own jest config); local stage copies at invariants/stage/. Exactly one untracked path added; shared files untouched.
- The single failure is INV-05, the KNOWN /o unsafe-href seam (buildCapabilities interpolates observed contact values without calling resolveSafeLink; the gate itself is sound 24/25). Same seam as AGENT-17 #3. Drafted patches unapplied -> patch decision for morning.
- INV-01..04, 06..10 all PASS. INV-06 extends LANE-REG into moving source: owner value stays applied AND explicit CorrectionConflict surfaces both values. INV-03/INV-07 pin hide semantics (HIDE never edits fact records; hidden fact survives byte-identical in hiddenFacts). F2: visibility policy hides 13 location-kind facts by conservative default on Clearwater (documented policy, not a bug).

## LANE-EVIDENCE-WIRE-SPEC complete (2026-09-23 ~21:07 MDT)
- evidence/WIRE-SPEC.md + 4 patches under patches/, all PASS git apply --check at frozen SHA e48ef710, nothing applied. P1 footer reads spec.provenance (fixes QA-TRUTH F-001, golden byte-identical). P2 rights-basis labeled inferred (fixes F-002 misgrade, zero golden DOM change). P4 new sites-render-audit.ts + both /sites pages log strong-verifier verdicts (OBSERVATION-ONLY, not a gate; addresses R-A and R-MODEL). P5 new resolveBoundFieldVerified in strong verifier; renderer boundField uses it (fixes H4/R-H4). Weak verifyPresentationBinding deliberately NOT strengthened (bindings.test.ts:125 pins it); authority moved to caller via new seam. F-003 + classifyRights deferred. Morning decision (feeds the deferred two-verifier/R-MODEL question).

## LANE-CHAOS-R2 complete (2026-09-23 ~21:08 MDT)
- chaos/CHAOS-REPORT-R2.md. 6/6 probes PASS, 40/40 checks: duplicate job safety (3 layers: manifest byte-identical on duplicate enqueue; race -> one executor; SIGKILL mid-worker -> resume converges to one committed result, digest-identical); crash recovery (kill -9 mid-append -> no loss, valid JSONL, seqs 1..60/1..200 exact); corrupt cache (verify-on-read, quarantine); source change mid-run; drop targets; flaky upstream + crash mid-batch.
- REAL DESIGN BUG CAUGHT (P4): parent stage outputs not binding child digests are blind to subtree changes (PAGE/SPEC digests did not move on phone edit). Fixed by binding child digests into parent outputs; re-verified. Relayed to COMPILE-HARNESS as a structural harness rule (per-stage result records must include consumed child digests). Second standing rule: synchronize on victim progress markers, never blind sleep. Caveat: missions/*/shard-*/results.jsonl appenders do not exist as shared code yet; harness must define the canonical appender contract.
- Deconfliction held: r2-* prefixed probes, chaos/work-r2/ scratch; 71/85's files untouched; 71/85 still owns CHAOS-REPORT.md.

## VQ-REPAIR-SPEC complete (2026-09-23 ~21:15 MDT)
- visual/REPAIR-SPEC.md + 5 patches under patches/ (vq-001 motion-never-gates-content, vq-002 hero-pill-on-dark, vq-004 typographic-hero-treatment, m-issue-2 fab-inflow-mobile, m-issue-3 mobile-hero-call-cta), all PASS git apply --check on Pig, nothing applied. Presentation/capability-exposure only; never touch graph facts, composition, SiteSpec validation, or zero-findings property.
- Caveats: VQ-001 based on another lane's reworked motion CSS; touches another lane's WIP mobile-visibility.test.ts; re-run apply --check if those lanes land first.
- NOT authorized for the NIGHT-VERCEL preview build (N1 scope frozen: 5 SEC-FIX patches only). Morning integration decision.

## Mission wave 1: first 1,000 missions complete (2026-09-23 ~21:17 MDT)
- PROJECTION shard-1 (missions 500-999) + shard-3 (1500-1999, self-claimed after finishing), one worker, single tsx harness per shard, 62 corpus fixtures rotated with deterministic mulberry32(i) mutation (private injections, owner-hidden on i%5==0, owner phone corrections on i%5==1, field hide/coarse decisions). 16 projections composed through real repo authorities (read-only).
- Results (n=1000): PASS 233, PASS_WITH_NOTES 622 (all notes = legitimate fail-closed ask refusals), UNSUPPORTED 145 (64 = provenance.json fixtures carry no object graph; 8 = hostile-stale harness artifact), LEAK 0, MISLABELING 0, THROW 0, NEEDS_REVIEW 0. ~120,000 checks, zero failures -> improve-once loop never fired, no patches proposed.
- Deliverables: missions/projection/shard-1/ + shard-3/ (results.jsonl, SUMMARY.md, SHARD-LOG.md); harness.ts (Pig copy /home/nolan/fyd-factory/harness.ts). Two harness false positives fixed in smoke tests before full runs.
- Wave-1 corpus note for wave 2: provenance-only fixtures should not be assigned to projection missions (mark UNSUPPORTED upfront).
- Wave-1 scoreboard: PROJECTION 1,3 done; PROJECTION 0 in progress; PROJECTION 2,4,5 unclaimed; WORLD 0-3, OBJECT 0-1, SYNTH 0, DECISION 0 running.

## Mission wave 1: DECISION shards 0+1 complete (2026-09-23 ~21:21 MDT)
- DECISION shard-0 (D-001..D-250) + self-claimed shard-1 (D-251..D-500), 500 units. Shard-0: AUTO_EXECUTE 118, DEEP_REVIEW 47, EXECUTE_REVERSIBLY 38, DEFER 18, GATHER_MORE_EVIDENCE 18, REQUEST_CONFIRMATION 7, HUMAN_DECISION 4. Shard-1: AUTO_EXECUTE 192, DEEP_REVIEW 36, HUMAN_DECISION 6. Corpus total: 10 HUMAN_DECISION, 0 REFUSE, 310 AUTO_EXECUTE; no authority-bound item auto-executed.
- Top HUMAN_DECISION: D-015 (Phase 17 gap list; UNAUTHENTICATED VISITOR -> PUBLISH go/no-go is Nolan's), D-474 (falsification seed vs owner-contact boundary: challenge failed, boundary stands), D-483 (falsification seed vs D-015: failed, launch boundary absolute). D-012/D-214/D-217 collapse into one Nolan decision on the golden-set bar.
- Caveats: shard-1 skew trigger (76.8% AUTO_EXECUTE) investigated, composition explains; D-360 provisional; D-396 awaiting ratification; 500-definition corpus exhausted (shards 2-3 need parent direction).
- Deliverables: missions/decision/shard-0/ + shard-1/ (results.jsonl, SUMMARY.md, SHARD-LOG.md, gen.py, CLAIM.md, FALSIFICATION-REPORT.md). Backlog now 500 unique definitions.
- Wave-1 scoreboard: PROJECTION 1,3 done; PROJECTION 0 in progress; PROJECTION 2,4,5 unclaimed; DECISION 0,1 done; DECISION 2,3 unclaimed; WORLD 0-3, OBJECT 0-1, SYNTH 0 running.

## AGENT-18 complete (2026-09-23 ~21:22 MDT)
- forensics/AGENT-18-DOMAIN-AUDIT.md. Per-domain verdicts: Happy Place FAIL (weak verifyPresentationBinding on public path, strong verifyBinding never invoked; intent mutates copy post-generation w/o re-verification; shared footer false provenance claims + hardcoded "sequences 65-83"; /o raw-href seams open). Coppersmith FAIL narrower (same core; footer describes other tenant; no owner state, convention-only isolation). Ask FYD FAIL for canonical provenance (deterministic/cited/tenant-scoped but not canonical).
- CENTRAL FINDING: site pages read PING-side dump (/home/nolan/ping/var/fyd-projections/*.json); Ask FYD reads in-repo fixtures + journal overlays. Two read authorities, no reconciliation; site-bundle.ts "same graph" claim contradicted. Site and Ask can silently disagree. Relayed to NIGHT-VERCEL as a route-matrix verification item (compare site claims vs /preview/ask answers per tenant; report disagreements as findings).
- Ask trace: provenance rewritten to "procedural-fixture", erasing website-ingestion URL; citations object-level (no field locator/event ref); spec built from pre-overlay graph (silently downgraded on overlay error); unrecognized classes default "supported"; 974-line concierge has no production caller. Note: "TD-002 has no artifact in the tree" = repo tree only; TD-002's artifacts live in the coordinator workspace (tournaments/td-002/), consistent. F-8 "About null" not in repo src (was pressure-lane hostile fixture). TEST-GATE.md stale; vercel.json has no test gate, no CI workflows.

## NIGHT-COHORT complete (2026-09-23 ~21:24 MDT)
- cohort/COHORT-REPORT.md + cohort/acquisitions/<site-id>.json (10/10 valid). Real pipeline on 10 real public websites (robots-first, 2s-paced, sequential, max 9 pages/site), branch fyd-factory at frozen SHA, repo untouched.
- 7/10 renderable (deterministic DIRECT_FACT, 0 AI calls, 0 validation errors): hand-law 6p, claire-codling 7p, bemis-electric 5p, gear-junction 5p, dalby-cpa 1p, suehiro 1p, white-star 1p. 3/10 fetch failures: pride-plumbing 403 bot-wall, pantuso + klik-boutique robots Disallow:/ (correctly honored).
- Top failure modes: (1) extractor is a head-metadata harvester (7/7: zero body-HTML facts; only body extraction = two dead customer-specific regexes; Shopify yielded 0 product objects); (2) schema.org mapping lossy (169 unmapped literal props, 158 dropped @id rels vs 7 surviving); (3) fetch attrition 3/10. 4 candidate generic primitives (>=4/10): body-text extraction, tiered schema.org handling, dropped-relationship ledger, builder-agnostic service/offering/product extraction. WordPress-heavy cohort (4/7); no Wix/Squarespace/Webflow/SPA materialized.
- Relayed to NIGHT-VERCEL (unblocks cohort route coverage): 7 renderable sites for route matrix, 3 fetch-failed excluded with reasons, no re-fetch, nothing presented as owner-authorized.

## LANE-CHAOS (first dispatch) complete (2026-09-23 ~21:27 MDT)
- chaos/CHAOS-REPORT.md. 10/10 experiments PASS against real Pig factory modules (dedup, SIGKILL restart, source change mid-run, cache corruption, reobservation, two-workers-same-entity, simulated sleep/browser-drop/HTTP faults). Two harness defects caught and fixed by the chaos itself before verdicts (lease-reclaim join loop, TOCTOU on Pig-call counter).
- 4 durability gaps: G1 (highest, LIVE PROOF): work identity does not bind transform code version; another lane's schemas.ts refactor changed generator output for identical inputs (explore schemas 5 -> 2) while generator version stayed 1.0.0; cache HIT served stale digest bb2aed03 vs fresh c09af6fb. G2 (high): no entity-level publication fence; last-writer-wins can regress canonical pointer; fix = compare-and-set on input generation. G3 (medium): spec digest blind to phone-field changes; facts-digest is the authoritative change signal. G4 (low): no factory-owned wake-request integration observed.
- G1+G2 relayed to COMPILE-HARNESS as harness design requirements (code-version-bound work ids/cache keys; CAS publication fence; facts-digest as change signal).

## Mission wave 1: WORLD shards 3+7 complete (2026-09-23 ~21:30 MDT)
- WORLD shard-3 (1500-1999) + self-claimed shard-7 (3500-3999), 1,000 missions, all green. GENERATED 846, GENERATED_WITH_WARNINGS 145, EVIDENCE_CONFLICT 9, zero crashes/leaks/unsafe. 500/500 renderable per shard, 0 validator errors, owner hide 100/100, owner corrections 100/100, determinism 20/20 spot checks. p50 2ms, 365-445 missions/sec, Pig load 2.39/24.
- Top classes all by-design (broken-media -> media_unavailable, no-jsonld -> partial, contradictory-sources -> typed EVIDENCE_CONFLICT). No repo defects, no patches.
- Harness false positive fixed (prefix substring assert -> boundary-aware matching). tsx failed on CSS-module + extensionless ./schema-roles; runner bundles repo TS with esbuild read-only (same tooling lesson as compile pilots).
- COLLISION INCIDENT (shard-6): this worker claimed shard-6 from a stale listing; WORLD-SHARD-0-continued had created and completed it ~1 min earlier. This worker's duplicate pass OVERWROTE their results.jsonl (real loss). Their SUMMARY.md/SHARD-LOG.md/runner survived; duplicate run preserved at missions/world/shard-3/_collision-shard-6-backup/; COLLISION-NOTE.md documents deterministic regen (bash run.sh 3000 3500, seconds of compute). Owner is actively in the directory (gen-runner.sh 21:27:53); no coordinator interference. WAVE-2 PROTOCOL FIX: "absent" is perishable; claim requires atomic marker + re-list immediately before writing.
- Coverage: unsafe-urls, rtl-text, conflicting-hours, many-services live in shards 0/1/2/4/5/8 (others). WORLD shard-9 [4500,4999] is the remaining unclaimed shard, highest-value next take.
- Wave-1 scoreboard: WORLD 3,7 done; WORLD 6 SUMMARY survives, results.jsonl needs owner regen; WORLD 0,1,2,4,5,8 in progress; WORLD 9 unclaimed. PROJECTION 1,3 done; PROJECTION 0 in progress; PROJECTION 2,4,5 unclaimed. DECISION 0,1 done; DECISION 2,3 unclaimed. OBJECT 0-1, SYNTH 0 running.

## Mission wave 1: ALL 6 PROJECTION shards complete (2026-09-23 ~21:34 MDT)
- PROJECTION shards 0,2,4,5 (one worker, adversarial harness): 2,000 missions. PASS 1,296 / WARNINGS 333 / LEAK 371 / MISLABEL 0 / GENERATOR_ERROR 0. ~87k missions/min.
- G1 (LEAK, REAL REPO BUG): answerConciergeQuestion cites non-public objects through relationship traversal when handed an unfiltered graph ("Hidden Service 1" via active provides edge). Contract says "visible graph only"; nothing enforces it. Improve-once loop COMPLETE: repro missions/fixtures/concierge-hidden-service-traversal.json -> patch missions/patches/concierge-buildgraphview-visibility-filter.patch (apply --check clean at e48ef710; single choke-point fix in buildGraphView) -> verified on staged copy (leak gone, public-only unchanged) -> falsified -> rerun: G1 eliminated (LEAK 94 -> ~10/shard residual = G2 cases). THIS IS THE SAME SEAM TD-002 #4 and NIGHT-ASK-OWNER found (concierge caller-trust, zero visibility filtering); three lanes converge. Morning decision.
- G2 (LEAK, design decision): owner hides address on business but it survives on related public location object; concierge cites via located_at traversal. Not patchable by worker; filed decision-backlog D-501; patch application D-502.
- Sibling's "0 findings" does not contradict G1: their harness used correct public-only wiring; this harness adversarially mis-wired. Both right; the seam is real.
- Warnings = source-contamination (private value in public description, faithfully repeated) = source hygiene, not projection leak.
- Wave-1 scoreboard: PROJECTION all 6 done (3,000 missions). DECISION 0,1 done; DECISION 2,3 unclaimed. WORLD 3,7 done; WORLD 6 regen pending; WORLD 0,1,2,4,5,8 in progress; WORLD 9 unclaimed. OBJECT 0-1, SYNTH 0 running.

## Mission wave 1: ALL 10 WORLD shards complete (2026-09-23 ~21:37 MDT)
- All 5,000 WORLD missions claimed and complete factory-wide. This worker ran shards 0,4,6,8,9 (2,500): GENERATED 1125, WARNINGS 1277, ACQ_FAILED 50, EVID_CONFLICT 48; zero crashes/reviews/unsafe/unsupported. Siblings ran 1,2,3,5,7.
- Shard-6 collision FULLY REPAIRED: owner re-ran their deterministic harness (bash run.sh 3000 3500); shard-6 results.jsonl regenerated; sibling's shard-7 data verified intact.
- Falsification (highest value): FF-1 ACCEPTED (144 EVIDENCE_CONFLICT mislabels -> GENERATED_WITH_WARNINGS; hours conflicts resolved by source-a precedence); FF-2 ACCEPTED (66 IDENTITY_AMBIGUOUS -> WARNINGS; identity never ambiguous with synthetic provenance); FF-4 ADOPTED (phone conflicts halt at evidence stage, no site; hours = precedence+warning, phone = halt/no-render because identity-critical with no safe fail-closed). Response: missions/world/FALSIFICATION-SHARD-0.md. Taxonomy rule worth formalizing: terminal outcomes must mean "no trustworthy site produced".
- All 10 hostile classes now covered factory-wide (shard-9 exercised rtl-text). No repo defects, no patches. Caveat: render stage-latency instrumentation undercounts (times html.length, not renderToStaticMarkup); mission-level elapsed valid.
- Wave-1 scoreboard: WORLD 10/10 done (5,000). PROJECTION 6/6 done (3,000). DECISION 0,1 done (500); DECISION 2,3 unclaimed. OBJECT 0-1, SYNTH 0 running.

## Mission wave 1: OBJECT shards 0-3 complete (2026-09-23 ~21:39 MDT)
- One OBJECT worker ran shards 0,1,2,3 (2,000 missions): GENERATED ~493/shard, NEEDS_REVIEW 6-8/shard (single generic class). Determinism mismatches 0/2000. 0 unsafe URLs, 0 private leaks, 0 validation errors, 0 crashes. ~9,800 missions/min.
- OBJECT-UNBOUND-RAIL-LEAK (28 instances, REAL): ObjectRailSection (src/fyd/components/renderer.tsx) fed pingObjectToView raw o.title/o.description, bypassing resolveBoundField that every other render path uses. Improve-once complete: repro missions/fixtures/unbound-rail-leak.json -> patch missions/patches/object-rail-binding-gate.patch (apply --check passes; ONE authorized path) -> tested on patched copy -> falsified (bound still features, unbound-only degrades cleanly, determinism holds) -> 114/114 GENERATED on rerun. FOURTH independent confirmation of the verifier seam (AGENT-17 #1/#2, WIRE P5, INV-05 family). Morning decision.
- Parallel OBJECT worker independently found the same class (rail-unbound-description.json corroborates); this worker stopped at 4 shards to avoid duplication. OBJECT 4,5,6 unclaimed.
- Finding 2 (NOT patched, one path per patch): src/app/build/[siteId]/build-client.tsx renders richestObject + pingObjectToView raw in builder preview. Same class, second surface.
- Wave-1 scoreboard: WORLD 10/10 (5,000). PROJECTION 6/6 (3,000). OBJECT 0-3 (2,000); OBJECT 4,5,6 unclaimed. DECISION 0,1 (500); DECISION 2,3 unclaimed. SYNTH 0 running.

## Mission wave 1: SYNTH shards 0-3 complete (2026-09-23 ~21:39 MDT)
- One SYNTH worker ran shards 0-3 (2,000 missions). Shard-0 required metrics: owner correction survival 83/100 (83.0%), hide survival 87/100 (87.0%), overall 463/500 (92.6%). Patched diagnostic: correction 98/100, hide 100/100, overall 498/500. Combined 4 shards: reference 1825/2000 (91.3%); patched 1995/2000 (99.8%).
- Top classes: HIDE_ORPHANED_ID_CHURN 13, CORRECTION_AMBIGUOUS_TARGET 10, CORRECTION_SILENTLY_DROPPED 7, SPURIOUS_DRIFT_CONFLICT 7; GC-5 CONFLICT_SILENTLY_RESOLVED x6 (fixed by patch v2).
- 3 proposed patches (apply --check clean at e48ef710, repo untouched): (1) overlay-orphan-ambiguity v2 (owner-overlay.ts: orphaned corrections surfaced explicitly, fail-closed findBusinessObject, exactly-one match, never first-wins); (2) overlay-drift-normalization (symmetric whitespace/bidi normalization); (3) visibility-hide-reresolve (hide assertions re-resolve by field/index/normalized source value on ID churn). Morning decisions.
- Residual CORRECTION_NOT_SURFACED x5: needs stable target key on assertion record (two-file change, exceeds one-path constraint); evidence preserved.
- PRODUCT DECISION FOR NOLAN: fail-closed projection presents no settled business contact facts under ambiguity; an explicit public ambiguity notice is Nolan-level, not improvised.
- Wave-1 scoreboard: WORLD 10/10 (5,000). PROJECTION 6/6 (3,000). OBJECT 0-3 (2,000). SYNTH 0-3 (2,000). DECISION 0,1 (500). Total 12,500 missions complete. OBJECT 4,5,6 + DECISION 2,3 unclaimed.

## Mission wave 1: OBJECT shard-0 COLLISION (2026-09-23 ~21:52 MDT)
- A second OBJECT worker ALSO ran OBJECT shard-0 (missions 0-499): 488 GENERATED, 12 NEEDS_REVIEW (all hide-owner fail-closed: validator's typed "A site needs at least one page."). 500/500 in 2.22s wall (~13,514/min). 0 crashes, 0 determinism mismatches, 0 unsafe schemes, 0 hidden leaks.
- COLLISION: both workers wrote missions/object/shard-0/. First worker's numbers were 493/7; second worker's 488/12 (harness differences, not mission nondeterminism). Second worker replaced the first's SUMMARY.md with their own, preserving the first's full text + conflict note in SHARD-LOG.md. results.jsonl overwrite status needs reconciliation; first worker's scratch at /home/nolan/fyd-factory/object-shard1/ may hold their copy. This is the SECOND collision of the night (WORLD shard-6, now OBJECT shard-0); wave-2 atomic-claim rule must be enforced.
- CONVERGENCE: both workers independently found the same defect class: RAIL-UNBOUND-DESCRIPTION (this worker) = OBJECT-UNBOUND-RAIL-LEAK (first worker). ObjectRailSection + rail adapters read o.description raw, bypassing resolveBoundField; fabricated "Observed on website-ingestion" receipt. Two patch sets now exist and OVERLAP: 0001-rail-bound-description.patch + 0002-rail-section-bound-summary.patch (this worker, descriptions) and object-rail-binding-gate.patch (first worker, titles too). Reconciliation is a lane-owner morning decision.
- Residuals: evidenceScore rewards unbound description words when featuring; rail titles read raw; "website-ingestion" fallback receipt persists on other surfaces.
- OBJECT shard-2 belongs to the first worker (493/7); the second worker did falsification alternative per protocol. OBJECT 4,5,6 unclaimed.
- Wave-1 scoreboard: WORLD 10/10 (5,000). PROJECTION 6/6 (3,000). OBJECT 0 (collided),1,2,3 (2,000). SYNTH 0-3 (2,000). DECISION 0,1 (500). Total ~12,500 unique missions.

## DEHPP-BUILD complete (2026-09-23 ~21:50 MDT)
- Fidelity verdict: SPEC_IDENTICAL. Zero validation findings. renderable=true.
- Implemented dehpp/parameterization-spec.md on branch fyd-dehpp (from frozen donor e48ef710), clean worktree /home/nolan/fyd-dehpp-wt. Committed eb28d3aa ("DEHPP: data-plane parameterization of the HPP route"), 18 files, +2144/-93. No push, no main/master commits.
- All 13 parameters typed/placed; all 7 replacement mechanisms with removal proofs as tests; all 5 dangerous couplings removed from customer path. New composeSite seam replays canonically identical to golden/evidence/hpp-composed-spec.json (14 keys, null archetype/status/revision/objectPresence/heroMedia, DEFAULT_FYD_THEME verbatim, findings [], renderable true).
- Tests: tsc clean; 1,157/1,157 green (18 suites). Hard law verified: zero tenant-conditional branches, zero business-name checks, zero customer-specific JSX.
- Caveats: legacy src/app/sites/_shared/site-client.tsx still carries hardcoded "(acceptance sequences 65-83)" + fused demo chrome (off DEHPP path; frozen Coppersmith route still imports it; migrating is that lane's call). DemoOwnerMode moved inside DemoChrome (stricter per R8). HPP record pins historical composition.
- Report: ~/workspace/fyd-factory/dehpp/DEHPP-BUILD-REPORT.md
- NOLAN DECISION: merge fyd-dehpp branch into the factory line? (separate from frozen preview).

## WORLD-SHARD-1 continued: shard-20 + full 7,000-mission determinism proof (2026-09-23 ~21:51 MDT)
- Shard-20 (indices 10000-10499): 500/500, ~21,700/min. 452 GENERATED, 48 WARNINGS, 0 terminal. All digests unique; 10/10 determinism; 0 unsafe/hidden/unbound.
- world-10265 NEEDS_REVIEW was a VERIFIER FALSE POSITIVE: "Solar Pro" (hidden) is a substring of public "Iron Solar Pros". No leak. Fixed harness-side (word-boundary regex). Reran ALL 14 shard-dirs (7,000 missions): every HTML digest byte-identical across runs (full-pipeline determinism proof), exactly one record changed outcome. New totals: 5,830 GENERATED, 884 WARNINGS, 142 ACQ_FAILED, 144 EVID_CONFLICT, 0 NEEDS_REVIEW. Fixture: missions/fixtures/world-hidden-leak-substring-false-positive.json.
- SCOPE DISCREPANCY (Nolan reconciliation): protocol specifies 5,000 WORLD missions, but this worker ran 7,000 (indices to 10499). Worker claimed no further shards pending reconciliation.
- Shard-4 collision history: duplicate range preserved at shard-1/_collision-shard-4-backup/; WORLD-SHARD-0-continued reports their own shard-4 complete (in their 5-shard set). Reconciliation pending.
- Foundational contract debts still open: non-contract PRNG seeding (mulberry32(i*2654435761...) not mulberry32(i)); literal markers not on every artifact; hardcoded shard identity; binding verification narrower than binding-verifier.ts; phone-range caveat; failure signatures embed mission names. All 7,000 missions ran under the non-contract seeding.
- Wave-1 scoreboard: WORLD 10 canonical shards complete (5,000) + 2,000 beyond-scope missions pending reconciliation. PROJECTION 6/6 (3,000). OBJECT 0 (collided),1,2,3 (2,000). SYNTH 0-3 (2,000). DECISION 0,1 (500). DEHPP build complete on fyd-dehpp.

## COMPILE-HARNESS complete (2026-09-23 ~21:54 MDT)
- Harness v1.2.0 built, proven, documented. Lives at ~/workspace/fyd-factory/compilation/runner/ (6 files), byte-identical on Pig at /home/nolan/fyd-compile-harness/runner/. Design doc: ~/workspace/fyd-factory/compilation/HARNESS.md. Pig repo read-only throughout.
- All of Nolan's corrections implemented: status contract (pending|running|done|failed + quarantined flag, not fifth status); dispatch-based attempts; per-job inactivity timeout (SIGKILL on quiet); --concurrency!=1 fatal (scale via independent manifests); performance.now() timing; peak_memory_bytes; unsafe_url_count + input_unsafe_url_count; job ID sha256(fixture_id + ":" + seed) with deliberate separator; duplicate_object with deterministic rel IDs; hostile injection targets public business object; enqueue fails closed on relative --pig-fixtures-dir; typecheck preserves tsc exit code.
- Chaos G1/G2 live: pipeline_code_version = sha256 over src/fyd .ts/.tsx; cache key (job_id, code_version, harness_version); proven live twice (10 stale v1.0.0 demoted+rerun under v1.1.0; 20 stale v1.1.0 demoted+rerun under v1.2.0); zero stale served. G2 publish/dispatch/done_seq compare-and-set; all records dispatch_seq == done_seq. G3/P4 digest chain: chain-proof ALL CHECKS PASS (title edits move spec digests, phone edits do not). JSONL appender: claim-before-execute, torn-tail repair, append-before-mark, duplicate-safe. Fault injection synced on progress markers.
- Pilot evidence: exactly-20 kill/resume (20/20 checksums AND mtimes identical, zero rewrites); 40-job queue (G1 demotion proof, 40/40 COMPILED); v1.2.0 re-run (20/20 COMPILED, 0 determinism mismatches, p50 plan 1.02ms / spec 0.48ms / validate 0.09ms / render 0.49ms). CSS/alias probes: plain import fails on CSS as expected; --import hook and @/ alias OK.
- Shard plan STAGED (not launched): 50 fixtures (10 core + 40 hostile, synthetic-marked) at /home/nolan/fyd-compile-harness/fixtures/shard/. Shard A seeds 0-9 = 500 jobs; Shard B seeds 10-19 = 500 jobs; 0 overlap. Manifests at queue-shard-a/ and queue-shard-b/; launch commands in HARNESS.md section 15.
- Open follow-ups (HARNESS.md section 16): two-generation G2 race proof; torn-write JSONL kill proof; finer code-version dependency map.
- C1 RELAY FIRES: harness complete -> launch Shard A (RUN-A-full, 500 jobs) and Shard B (RUN-B-full, 500 jobs, hidden-object + unsafe-URL checks).

## C1 relay executing (2026-09-23 ~21:57 MDT)
- SHARD-A-RUN launched: Shard A (50 fixtures x seeds 0-9 = 500 jobs) on the Pig, independent manifest/results dir.
- SHARD-B-RUN launched: Shard B (50 fixtures x seeds 10-19 = 500 jobs) on the Pig, with hidden-object + unsafe-URL checks.
- Both run queue-runner.ts v1.2.0 with --concurrency 1 --batch-size 10 --job-timeout-ms 120000. Expected wall: order of minutes.

## Shard B worker completed early; verify worker dispatched (2026-09-23 ~21:56 MDT)
- SHARD-B-RUN launched the runner on the Pig (~21:53 MDT, log shard-b.log) but returned only a status update; its monitor session orphaned on worker completion. The Pig-side queue-runner is independent and unaffected.
- Health at launch check: pipeline_code_version=bec90864d8ed, harness_version=1.2.0, ~80 jobs/min (ETA ~6-7 min), repo baseline sha256 captured (108 pre-existing dirty entries).
- SHARD-B-VERIFY dispatched to monitor the Pig log to 500/500 and run full verification (rollup, determinism, unsafe-URL counts, hidden-object leaks, repo-untouched check).
- SHARD-A-RUN still running.

## WORLD-SHARD-2 continuation: OBJECT shard-2 collision RESOLVED + new class + OBJECT shard-4 (2026-09-23 ~21:54 MDT)
- WORLD shard 2 (1000-1499) complete: 407 WARNINGS / 39 EVID_CONFLICT / 38 IDENTITY_AMBIGUOUS / 16 ACQ_FAILED. SUMMARY.md + SHARD-LOG.md amended with 4 compliance caveats (phone-format deviation from literal 555-01XX; marker propagation not end-to-end on intermediates; bundled-Node runtime not literal tsx; unproven claim-badge premise: patch 0001 experimental until Links/CTA/ObjectRail claim semantics confirmed).
- THIRD COLLISION: this worker overwrote OBJECT-SHARD-1's shard-2 results.jsonl (03:47:54 UTC). RECOVERED: deterministic harness re-run (FYD_START=1000 FYD_END=1499) matched their SUMMARY.md EXACTLY (493/7); restored as canonical results.jsonl. COLLISION-NOTE-OBJECT-SHARD-2.md written; duplicate preserved as falsification data. Two workers now flag the systemic gap: protocol has no claim/lock mechanism.
- NEW GENERIC CLASS: phone-conflict dial-action fail-closed violation. 44 missions (36 hostile-phonec + 8 dental): explicit phone-conflict markers still render tel: dial action for one disputed side (Contact section). Improve-once complete: fixture object2-phonec-dial-gap.json -> patch 0002-object2-phonec-dial-gating.patch (renderer.tsx only, apply --check PASS) -> 4/4 patch tests -> 500-mission patched rerun: exactly the 44 phonec missions flip NEEDS_REVIEW->WARNINGS, zero other changes. Morning decision.
- OBJECT shard-4 (2000-2499) complete, verified absent before claiming: 459 WARNINGS / 41 NEEDS_REVIEW (all phonec-class); determinism 500/500; 0 unsafe URLs; 1,212 unbound claim sections (independent corroboration of WORLD badge gap). No new classes. OBJECT 5, 6 unclaimed.
- Wave-1 scoreboard: WORLD 10 canonical (5,000) + beyond-scope pending reconciliation. PROJECTION 6/6 (3,000). OBJECT 0 (collision),1,2 (collision resolved),3,4 (2,500). OBJECT 5,6 unclaimed. SYNTH 0-3 (2,000). DECISION 0,1 (500).

## NIGHT-VERCEL complete: packaging done, Vercel BLOCKED on 403 (2026-09-23 ~22:02 MDT)
- Full local route verification on Pig production build: /fyd-night, /sites/happy-place, /sites/coppersmith-plumbing, /preview/ask, /preview/owner-console = 200; all 7 cohort sites = 200; 3 excluded = 404 (correct); /o/* = 200. Owner-console gate verified (404 without env var).
- New fix #7: projectionDir() now prefers bundled fyd-night-projections/ via outputFileTracingIncludes (was hard-failing on /home/nolan/ping/var/fyd-projections which doesn't exist on Vercel). 7 fixes total, 11 files. Rebuilt clean (Next 15.5.24).
- Packaged: ~/workspace/fyd-factory/preview-src/fyd-preview-wt.tar.gz (32 MB), SHA256 19fe85ec488fec2cdcbda9458f00888b39f3fc32f931aac8aabe6a05e647a3c3, scp-verified. PREVIEW-REPORT.md honest.
- VERCEL BLOCKER (confirmed by root): credential valid and attached (GET /v2/user + /v9/projects = 200, 0 projects). POST /v10/projects -> 403 "You don't have permission to create the project." Account piging85@gmail.com carries "limited": true. This is an account-level restriction, not a token scope issue. I do not have credentials.request_api_access in my toolset; a reconnect would require Nolan's OAuth re-authorization in any case.
- HUMAN BOUNDARY: Nolan must fix Vercel account permissions (or re-authorize) for project creation. The preview is fully verified locally and packaged; ONLY the deployment is blocked. Morning target (protected Preview URL) cannot complete without this.
- Queued (not dispatched): port 7 worktree fixes to main repo; rebase 2 failed security patches; cohort "Back to Night Cohort" link gap.

## SHARD-A complete: 500/500 COMPILED (2026-09-23 ~22:04 MDT)
- Outcome: COMPILED 500, VALIDATION_FAILED 0, RENDER_FAILED 0, CRASH 0. All attempt 1, no quarantines. Determinism 0 mismatches. Digest chain complete. harness 1.2.0 + pipeline_code_version bec90864d8ed uniform.
- Unsafe URLs: 400 hostile injected (5 fixtures x 10 records x 8), 0 in output. All 40 hostile-corpus fixtures compiled clean.
- Wall ~2 min. Stage p50: plan 0.37ms, spec 0.26ms, validate 0.04ms, render 0.22ms. unbound_claim_count 3120 (~6.2/job, corroborates unbound-claim gap). hidden_object_count 0. Pig load ~2.6.
- Repo untouched (byte-identical to 108-path baseline). Artifacts: compilation/reports/shard-a-rollup.json, compilation/shard-a/results-shard-a.jsonl.
- LAUNCH LESSON: nohup & inside SSH died on channel close; setsid with full stdio redirect survived. Use setsid for detached Pig launches.
- SHARD B STALLED: runner dead (40/500, last log write 21:53:28 MDT, no process alive; same nohup cause). SHARD-B-VERIFY instructed to verify death, relaunch with setsid, confirm the 40 completed jobs are adopted (not re-executed), then verify to 500/500.

## SHARD-B complete and verified: 500/500 (2026-09-23 ~22:06 MDT)
- Stall root cause: SHARD-B-RUN's nohup launch died at 40/500 on SSH channel close. Verify worker's setsid resume ALSO died instantly. PROVEN WORKING PATTERN: runner in the FOREGROUND of a long-lived SSH session (backgrounded local exec holds the channel). Full drain 22:03-22:05, exit 0. The 40 prior jobs adopted cleanly (0 re-executed, 0 lost; dispatch_seq=1 on all 500; 500 unique job_ids).
- All 6 checks pass: COMPILED 500; 0 determinism mismatches; unsafe_url_count 0 (400 hostile in, 100% neutralized); hidden_object_count 0; repo untouched (exact sha256 baseline match); versions uniform (harness 1.2.0, pipeline bec90864d8ed).
- Throughput 35,177 jobs/min. Stage p50: plan 0.36ms, spec 0.27ms, validate 0.04ms, render 0.22ms.
- CORRECTED LAUNCH RULE: on this Pig, ANY background-detach through a closing SSH channel dies silently (nohup AND setsid both fail). Use foreground runner with the channel held open. Bake into shards C-F procedure.
- Artifacts: compilation/resume-shard-b.sh, verify-shard-b.js, repo-check.sh.
- SCALE-UP: Shards A+B = 1,000/5,000 jobs complete, both validated. Shards C-F (seeds 20-59, 4,000 jobs) launching next.

## SHARD-CDEF complete: 2,000/2,000 COMPILED (2026-09-23 ~22:13 MDT)
- Shards C (seeds 20-29), D (30-39), E (40-49), F (50-59): 500/500 COMPILED each, 0 determinism mismatches, 0 unsafe URLs, 0 hidden objects, repo untouched (exact sha256 match). 6-shard overlap check: 3,000 unique job_ids, 0 overlap. Pig load 2.0-2.5.
- Shard C first launch died silently (same Pig flakiness); relaunched clean. run-shard.sh launcher now on Pig + local.
- ARITHMETIC CORRECTION: HARNESS.md said "Remaining 4,000: shards C-F" but 4 shards x 500 = 2,000. 6-shard corpus = 3,000 unique jobs, not 5,000. The documented 5,000-job target requires seeds 0-99 (10 shards A-J). Launching G-J (seeds 60-99, 2,000 jobs) to reach the actual target.
- Artifacts: compilation/run-shard.sh, verify-shard-manifests.js, verify-results.js, check-shard-progress.sh, diag-shard-c.sh.

## SHARD-GJ complete: 5,000/5,000 compile jobs VERIFIED (2026-09-23 ~22:18 MDT)
- Shards G (60-69), H (70-79), I (80-89), J (90-99): 500/500 COMPILED each. 0 determinism mismatches, 0 unsafe URLs, 0 hidden objects, repo untouched (exact sha256 match). Wall 102s/shard. Zero relaunches, zero silent deaths (foreground pattern works).
- 10-shard checks PASS: 5,000 unique job_ids / 0 overlap (manifests); 5,000 lines / 5,000 unique / 0 overlap (results).
- COMPILE PROGRAM COMPLETE: 5,000/5,000 jobs, all verified. Pig repo read-only throughout.
- All night workers now complete. No workers running.

## Night program final state (2026-09-23 ~22:18 MDT)
- Mission wave 1: ~12,500 unique missions (WORLD 10 canonical + beyond-scope; PROJECTION 6/6; OBJECT 0-4; SYNTH 0-3; DECISION 0,1). 3 collisions (WORLD-6 repaired, OBJECT-2 resolved, OBJECT-0 pending reconciliation).
- DEHPP build: SPEC_IDENTICAL, 1,157/1,157 tests, branch fyd-dehpp @ eb28d3aa.
- Compile harness v1.2.0: 5,000/5,000 jobs verified.
- NIGHT-VERCEL: 7 fixes, full local route verification, packaged tarball (SHA256 19fe85ec...). BLOCKED: Vercel 403 account-level (limited:true). Needs Nolan.
- Generic findings with patches (morning integration): concierge visibility-filter G1; object-rail binding gate (overlapping sets); phone-conflict dial-action; SYNTH 3 owner-overlay patches; 5 SEC-FIX; 5 VQ-REPAIR; 4 WIRE evidence patches; INV-05 /o safe-link.
- Morning target: protected Preview URL is the single blocked item. Everything else ready.

## CONTINUATION (2026-09-24 ~05:06 UTC): coordinator decisions + 6 workers dispatched
- Standing: NO STOPPING (read-only cognition always), YOLO (decide at 80%+, no routine permission asks), no Vercel account-fix attempts, no owner contact, no public launch.
- OBJECT-0 COLLISION RESOLVED (D-W5): canonical = worker 2's documented run (missions/object/shard-0/, 488/12, full evidence). Worker 1's corroboration + title-gating patch preserved. Reconciliation file: missions/object/shard-0/COLLISION-RECONCILIATION.md.
- WORLD SCOPE (D-W1): 7,000 accepted as documented wave-1 extension (6,977 GENERATED / 23 NEEDS_REVIEW, zero crashes, full determinism proof, non-overlapping PRNGs). Canonical wave target stays 5,000. Wave-2 protocol debt: pin the seeding contract.
- RAIL PATCH RECONCILIATION (D-W2): APPLY object-rail-binding-gate.patch (renderer.tsx) + 0001-rail-bound-description.patch (object-rail.tsx); REJECT 0002 (superseded, same lines).
- PATCH FAMILIES (D-W3): APPLY concierge visibility filter (D-502), phone-dial gating, SEC-FIX x5 (4 REQUIRED + 1 RECOMMENDED), SYNTH x3, WIRE x4, ask-concierge-wire.patch; VQ x5 apply-if-check-clean per patch. INV-05 closes via SEC-FIX #1 (same seam, one authority).
- DEHPP MERGE (D-W4): CONDITIONAL GO, not now. Gate: (a) patch wave green, (b) scratch-merge proof, (c) Nolan morning review. No merge into fyd-factory tonight.
- CLAIM/LOCK (D-W5): atomic claim mechanism (mkdir-based marker + lease) being implemented and tested before new overlapping writes; wave-2 re-list-before-write rule is protocol.
- Morning decisions + 4 precise Nolan questions (ambiguity notice Q1, D-501 address propagation Q2, D-015 publish gate Q3, golden-set bar Q4): morning/MORNING-DECISIONS.md (relay to grilling brief).
- 6 workers in flight: (1) OBJECT-0 reconciliation + claim/lock build; (2) patch integration on Pig fyd-factory (no commits) -> patch-integration/PATCH-INTEGRATION-REPORT.md; (3) DEHPP scratch-merge proof -> dehpp/DEHPP-MERGE-PROOF.md; (4) generation wave 2: OBJECT shards 5-6, DECISION shards 2-3 (new definitions), /o hostile runs, compile-harness rerun of 40 hostile fixtures on patched tree; (5) COHORT-2: 10-15 real sites, Wix/Squarespace/Webflow/SPA focus, read-only -> cohort/cohort-2/COHORT-REPORT-2.md; (6) Ask FYD eval harness v2 (deterministic-first hierarchy) -> ask/ASK-EVAL-V2.md.
- Batch Pig SSH via stdin-fed commands where possible (workspace AGENTS.md lesson).
- Not started by this session: any repo mutation on the Pig; no broad reset/restore/clean; staged + unstaged WIP preserved.

## Worker 1/6 COMPLETE (2026-09-24 11:15 UTC)
- OBJECT-0 reconciliation: canonical = worker 2's run (488/12, results.jsonl verified: 500 lines, indices 0..499 contiguous, 12 HIDE-OWNER-ZERO-PAGE NEEDS_REVIEW, determinism match:true x500). Worker 1's results on Pig (493/7 in fyd-factory/object-shard1/shard0.jsonl) preserved as corroboration. File: missions/object/shard-0/COLLISION-RECONCILIATION.md.
- Claim/lock LIVE: missions/claim.sh (claim/renew/release/status; stage-then-publish via mv -T; 6h leases; takeover audit trail). MISSION-PROTOCOL.md updated. Tests 29/29 pass (CLAIM-LOCK-TEST.md); two real bugs caught and fixed (half-written marker misread; mv-without-T silent nesting). Residual: microsecond takeover race, backstopped by re-list-before-write.
- Open item relayed to patch-integration lane: re-run bound-variant FIXED_OK against the combined two-patch rail set.
- Claim tool availability relayed to generation wave-2 worker.

## Worker 2/6 COMPLETE (2026-09-24 ~11:50 UTC): PATCH INTEGRATION
- Report: patch-integration/PATCH-INTEGRATION-REPORT.md (+ coordinator addendum).
- 22/22 patches APPLIED on the Pig (fyd-factory @ e48ef710, dirty 108 -> 117, no commits/pushes/resets). 0002 rail patch correctly skipped (superseded).
- DEFECT-1 (WIRE-P4): patch shipped `src/app/sites/*/page.tsx` inside a block comment; the `*/` terminated the comment and produced 169 tsc cascade errors. Coordinator fixed the canonical patch text and re-applied on the Pig. CLOSED. (Coordination note: fixed while the worker was still active; no conflict.)
- Ask suite isolation (two-way reversal): G1 visibility filter = 0 regressions (158/158 with wire out). ask-concierge-wire.patch = 15-16 regressions (concierge answers do not match established composer contracts; less precise, not better). **Wire patch REVERSED by coordinator decision and stays out**; LANE-ASK owns a compatibility-safe redesign. G1 stays applied (security fix, zero regressions).
- inv-05 test "documents the seam" asserts the pre-SEC-FIX-#1 vulnerability; SEC-FIX #1 closed it. Test update dispatched to repair worker.
- concierge.ts TS2367 x4 (pre-existing in lane file): minimal string-annotation fix dispatched to repair worker. Widening ObjectProvenanceKind is a type-authority decision, out of scope.
- Repair worker 5bb95fdb dispatched: inv-05 test update, concierge TS2367, bound-variant FIXED_OK for RAIL-1+RAIL-2, re-run tsc/ask/invariants.
- Pre-existing, not repaired: context-compiler 1 flaky failure (passes in isolation), secrets-lane 4 tsc errors (other lane WIP), net CSS-transform failures (environmental).
- Full-loop: boundary 26/26, object 181/181, media 149/149, sitespec 92/92, components 93/93, customize 54/54, owner-mode 34/34, ask 158/158 (wire out). tsc: 8 errors (4 concierge in repair + 4 secrets other-lane).
- Still in flight: generation wave 2, cohort 2, Ask FYD eval v2, DEHPP merge-proof verification.

## NEW GOVERNING DIRECTIVES (2026-09-24 ~05:19-05:25 MDT, Nolan verbatim)
Three directives read and adopted as governing orders. Full text in ~/workspace/fyd/directives/.

### KEEP-GOING-PRODUCT-CORE-2026-09-24.md (~05:19)
- Frontier: RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE. Renderer/browser green; do not move backward.
- Build smallest complete Ask FYD path for "What services does this business offer, and how do you know?" If graph lacks evidence-bound Service objects, THAT is the failure; fix compilation, do not fake services.
- Ask FYD gets AUTHORIZED ContextBundle only (ViewerContext + GraphSnapshot + Allowed Fields + Evidence Bindings + Owner Assertions + Question). No DB/RAG/Postgres/full tenant memory.
- Output: SUPPORTED FACT / DERIVED EXPLANATION / INFERENCE / UNKNOWN. Dangling ref = FAIL CLOSED. Hidden field = NOT PRESENT TO MODEL.
- Prove ONE owner correction end to end (correct/hide/confirm -> typed intent -> regen -> survives -> mutate source -> regen -> still survives -> conflict = SOURCE_CHANGED_AGAINST_OWNER_ASSERTION).
- Plain-English customization -> STRUCTURED SITE PATCH -> before/after -> policy -> approval -> apply -> regen.
- Harvest: Puck = editing surface (prove seam first); Crawl4AI re-evaluate at 0.9.4 (VERIFIED 2026-09-24); crawler = untrusted worker; MCP 2026-07-28 read-only, NO implementation; PING -> MCP projection.
- BOTH BACKENDS MANAGEABLE: Happy Place + Coppersmith only. Per-backend scorecard required.
- 2,487 git observations = PING milestone, operator-gated, NOT FYD's problem.
- Goal: FEWER CLASSES OF FAILURE, not more green tests. Primitives: shared projection policy, owner intent, claim bindings, site patch, context bundle.
- Grill runtime/security items NOT FYD blockers unless the FYD loop depends on them. DEPLOY-PROV-001 via canonical Grill.

### PRODUCT-RUNTIME-BUILD-ORDER-2026-09-24.md (~05:23, supersedes on conflict)
- PHASE 1: Commit ONLY the proven min-w-0 fix, from correct clean ownership lane, one surgical commit. Do NOT sweep 23 unrelated dirty files. **FINDING 2026-09-24 ~05:40 MDT: the FC-003 min-w-0 fix is ALREADY committed as 8a997421 ("fyd(mobile): prevent 320px overflow in Ask FYD design-token row"), ancestor of HEAD e48ef710. Phase 1 requires NO action. No spurious commit created.**
- START FYD DEV SERVER on :3100. Private Tailscale Windows->WSL forward. NO public exposure. Verify from outside WSL.
- Expose /sites/happy-place, /sites/coppersmith, /sites index (both nodes).
- Architecture law: FYD = compiler + runtime; website = projection #1, never canonical. NO ClaimAuthority; BINDING VERIFIER owns the invariant. Renderer stays dumb. Generated prose = classified copy, never promoted to fact.
- ONE visibility policy (source + platform default + owner override -> effective) wired into renderer, Ask FYD, search, Circle, agent context.
- Semantic determinism = permanent regression test.
- Ask FYD: ONE hard vertical question on BOTH sites. Refusal to invent = PASS. Identify broken step if unanswerable.
- Owner correction + "Move emergency plumbing to the top" via SitePatchProposal -> capability check -> preview -> approval -> regenerate.
- Source V2: corrections + layout survive.
- Media: download + digest + provenance + FYD derivatives for the two demo businesses. No blind hotlinks.
- Demo owner mode: visibly marked, private, logged, non-production. Real auth before external owner.
- Bounded wake locks, NOT global sleep disable.
- Scorecard required. Headline = customer delta (yesterday vs today).

### BUILDER-BRUTAL-CEO-HARVEST-2026-09-24.md (~05:25, phase 2)
- Sequencing: min-w-0 commit = phase 1 (COMPLETE, already committed). THIS = phase 2.
- Root cause: mobile returns null <768px unless ?objectDebug=1; IN-FLOW OBJECT COMPOSITION was never built. BUILD IT: business desc -> Business object; services prose -> Service objects; people -> Person objects; location -> Location object. Objects feel like intelligent parts of the site, not a debug layer.
- Inventory 37 changed files; separate FYD OBJECT-LAYER / OTHER-LANE / UNKNOWN. Commit ONLY coherent FYD object-layer changeset AFTER building. Do NOT remove ?objectDebug=1 gate without in-flow replacement.
- Then: build, restart :3100, desktop proof, mobile proof, both sites. Private Tailscale. ?objectDebug=1 stays diagnostic.
- Binding contract: every factual rendered value carries binding (DIRECT / DERIVED / GENERATED_PRESENTATION / OWNER_OVERRIDE). "Open 24 hours" MUST have evidence.
- Visibility: SOURCE + SCHEMA DEFAULT + OWNER POLICY + VIEWER POLICY -> EFFECTIVE. Owner override wins where permitted. Never mutate observation.
- Source-map vision: DOM -> component -> SiteSpec -> object field -> claim/evidence -> source URL.
- SiteSpec stays SMALL (page/section/object ref/component/options/capability bindings). Never a programming language.
- Harvest Sanity source maps + Payload blocks as PATTERNS. Next.js 16.3 vs 14.1: DO NOT upgrade; backlog item.
- Builder proof: phone -> Happy Place loads -> objects in flow, no debug flag -> Coppersmith different composition -> tap service -> Ask FYD evidence-backed -> owner mode "move this service above the others" -> proposal -> approve -> refresh -> persists.

## Worker 3/6 COMPLETE (2026-09-24 11:23 UTC): COHORT-2
- Report: cohort/cohort-2/COHORT-REPORT-2.md + 15 acquisition JSONs.
- 15 Grand Junction businesses, 13 fetched (Wix 4, Squarespace 2, WordPress 2, custom CMS 1, Rain POS 1, Square 1, Gridsome 1, SpotHopper 1), 2 honest failures (snooks-bbq 403, copeka-coffee genuine robots block).
- 237 facts, 100% DIRECT_FACT, 0 AI calls, 100% deterministic. All 13 rendered valid specs.
- Body-text extraction: 0/20 across both cohorts. Still the #1 primitive gap.
- Schema mapping loss 29.1% (Squarespace worst 50%).
- MAJOR: Wave-1 "robots-blocked" were false positives (crude parser ignored user-agent sections). RFC 9309-aware parser clears them. New classes: parser false-positives, Wix hash-router boundary (1 page each), platform-signal false positives.
- Pristine worktree used (/home/nolan/cohort2-pristine @ e48ef710); original repo untouched.

## Worker 6/6 COMPLETE (2026-09-24 11:19 UTC): ASK FYD EVAL V2
- Report: ask/ASK-EVAL-V2.md. Harness: ask/eval-v2/. 129 records (10 sites x 12Q + 9 adversarial).
- Deterministic 92.4% (110/119). Schema 45.4%: ONE-LINE BUG (toAskFydAnswer emits classification:undefined for UNKNOWN; GRADE_TO_CLASSIFICATION lacks UNKNOWN key).
- Citation accuracy 119/119. UNKNOWN honesty 10/10. Fabrication 0. Refusal rate 29.4% (honest).
- **TD-002: LEAK PERSISTS POST-WIRING.** "Location on record: 999 Secret Lane" served verbatim; applyFieldVisibility(graph, []) does not coarsen. The wire moves the leak, does not fix it. VALIDATES the coordinator's wire-reversal decision. Real fix requires: applyFieldVisibility location coarsening + HIDE threading (visitor-answer.ts:184 still hardwires []).
- G1 visibility: CLOSED (no private traversal/citation). HIDE divergence: UNCHANGED.
- 10 answers flagged for human review. 11 residual gaps documented.
- Note: eval ran while wire was applied; coordinator reversed wire AFTER based on isolation proof. Eval results describe wired behavior.

## Still running (2026-09-24 ~05:45 MDT)
- Wave-2 generation (9b2f35ec): OBJECT 5-6, DECISION 2-3, hostile fixtures.
- Repair worker (5bb95fdb): inv-05, concierge TS2367, rail FIXED_OK.
- Mobile in-flow composition phase-2 (9f6d80c4).
- Ask FYD vertical proof (c0f732cc).
- /sites index (c5b0f7f1).

## /sites Index BUILT (2026-09-24 11:30 UTC, pending rebuild)
- Worker created src/app/sites/page.tsx on the Pig (untracked, no commit). Minimal dev index, links to /sites/happy-place and /sites/coppersmith-plumbing, names resolved from each tenant's own object graph. tsc clean.
- NOT YET LIVE: :3100 is `next start` (production mode), needs `next build` + restart. Worker correctly did not restart (mobile worker mid-build with uncommitted changes). Mobile phase-2 worker owns the rebuild/restart.
- Nolan's testing block (once rebuilt): http://localhost:3100/sites, /sites/happy-place, /sites/coppersmith-plumbing.

## Repair Worker COMPLETE (2026-09-24 11:30 UTC): ALL REPAIRS VERIFIED
- REPAIR 1 (inv-05): test updated to assert closed behavior (zero website caps for hostile value). Invariants: 90/90 PASS.
- REPAIR 2 (concierge TS2367): kind locals annotated as string (3 lines, type-only). tsc: 0 concierge errors; only 4 secrets-lane errors remain (other lane's WIP, untouched).
- REPAIR 3 (rail FIXED_OK): bound variant renders (sentinel 4x), unbound fails closed. FIXED_OK re-confirmed. Scratch cleaned.
- Final: tsc (4 secrets-only), ask 158/158, invariants 90/90. REPAIR LOG in PATCH-INTEGRATION-REPORT.md.
- PATCH INTEGRATION NOW FULLY COMPLETE. All 22 patches applied, all repairs verified, no stray files, no commits.

## Ask FYD Vertical COMPLETE (2026-09-24 11:32 UTC): INFRA BLOCKER FOUND
- Report: ask/ASK-VERTICAL-SERVICES.md.
- **Wired ask path returns 503 on :3100** (both sites). Honest fail-closed ("cannot load site data"), honesty PASS, functionality FAIL.
- FIRST BROKEN STEP: FYD journal gateway missing. getFydTenantGraph -> PingObjectReader.queryFydSiteOverlays -> GET /events/FYD_SITE_OVERLAY to http://127.0.0.1:18199 (FYD_JOURNAL_GATEWAY_URL unset). Nothing listens on 18199. Main :8080 gateway has the route but 401s (reader sends no auth).
- Service objects PRESENT: Happy Place 5, Coppersmith 4, all public, all evidence-bound to business website URLs. Full answer machinery works (proven via jest harness with stub journal).
- Per-site answers produced (harness): HP = Repairs, Fencing, Painting, Drywall, Restoration. Coppersmith = Plumbing, Heating & Cooling, HVAC, Ventilation. All DIRECT, all evidence-bound, HIDDEN LEAK: NO, UNSUPPORTED: NO.
- Authorization audit CLEAN: no DB, no LLM/RAG, ContextBundle properly scoped, hidden fields structurally dropped.
- CAVEAT: buildCitations degrades unresolvable citation to "Site record" label rather than hard fail-closed. Soft gap, no dangling refs occurred.
- FIX: deploy/restore FYD journal gateway on :3100's Pig (or set FYD_JOURNAL_GATEWAY_URL). Zero code changes needed; wired path serves live once gateway is up.
- Scorecard: ASK FYD wired FAIL (503 infra), honesty PASS, service objects PASS, evidence PASS, dangling PASS (caveat), public/hidden PASS.

## Worker 4/6 COMPLETE (2026-09-24 11:33 UTC): GENERATION WAVE 2
- Report: WAVE2-SCOREBOARD.md. All four claims validated and released.
- OBJECT shards 5-6: 1,000 records (459+454 generated-with-warnings, 41+46 needs-review all known phone-conflict class), 1,000/1,000 deterministic, 0 unsafe URLs, 0 hidden leaks.
- DECISION shards 2-3: 500 definitions (D-503..D-1002), 18 fields, appended to decision-backlog.jsonl. Corpus now D-001..D-1002.
- 40 hostile compile fixtures: 40/40 compiled, 0 errors, 0 unsafe rendered URLs, 0 hidden leaks.
- 200 hostile /o missions: 196 PASS / 4 FAIL (all 4 = worker expectation errors, not product failures), 0 executable-scheme hrefs, 0 private leaks (15 hostile traversals blocked).
- Improve-once: not triggered (no new generic defect class).
- All 6 original morning workers now COMPLETE. Product-proof phase workers: mobile (running), journal-gateway (running); ask-vertical, sites-index, repair complete.

## Mobile Phase-2 COMPLETE (2026-09-24 11:37 UTC): IN-FLOW COMPOSITION LIVE
- Worker built in-flow mobile objects in src/fyd/components/renderer.tsx (5 surgical edits, generic, zero customer-specific):
  1. MobileInFlowObjects component (md:hidden, <768px only, document-anchored, tappable FydObjectCards -> /o/ links -> ObjectOverlay)
  2. SectionShell stamps data-object-anchor
  3. BusinessSummary -> mobile Business card
  4. LocationsSection -> mobile Location cards (desktop pills kept)
  5. PostsSection -> mobile post cards (desktop grid kept)
- KEY FINDING: /sites pages never used MarginObjectLayer (PING homepage only); they render from SiteSpec. Services/People already had in-flow cards. MarginObjectLayer untouched; ?objectDebug=1 stays diagnostic. Desktop pixel-identical.
- :3100 REBUILT + RESTARTED (next build exit 0). Both sites 200 on mobile UA, data-inflow-composition present, tsc clean, components jest 93/93.
- /sites INDEX NOW LIVE: 200 with both tenant links (rebuild picked it up).
- Deliverables: mobile/FILE-INVENTORY.md (42 modified + 119 untracked classified: FYD OBJECT-LAYER / OTHER-LANE / UNKNOWN=4 fixtures). Commit guidance: bucket 1 only; excludes secrets lane, .github, effects, unknown fixtures.
- Note: Happy Place location renders "Adair Village, OR, US" (graph data, not introduced). Server run via setsid (survives SSH); nohup died with session (AGENTS.md lesson).
- Out of scope (not started): Sanity/Payload harvest, media pipeline, full Ask Q&A, owner-mode proposals.

## Journal Gateway RESTORED (2026-09-24 11:37 UTC): ASK FYD LIVE END-TO-END
- Worker found NO gateway code existed anywhere; nothing ever listened on 18199; original journal data gone (0 FYD_SITE_OVERLAY events in all postgres journals).
- Built standalone server: tools/fyd-journal-gateway/server.mjs (node builtins), start.sh (setsid), README.md. Store: data/fyd-journal/events.jsonl seeded with 7 happy-place overlay events transcribed from test stub (honestly labeled reconstructed; ops carry "demo-owner (seeded, unverified)" approvals).
- Local copies in ~/workspace/fyd-journal-gateway/. No commits.
- **VERIFIED LIVE:** POST /api/fyd/ask happy-place -> 200 "Related offerings: Repairs; Fencing; Painting; Drywall; Restoration." [citation website-business-...-service-3263502c8175, claimClass supported]. coppersmith-plumbing -> 200 "Related offerings: Plumbing; Heating & Cooling; HVAC; Ventilation." [citation, supported]. (Was 503 projection_unavailable.)
- Caveats: no auto-restart (systemd unit = open decision); seed data reconstructed; FYD social lane may need FYD_PING_GATEWAY_BASE_URL -> :8080 with auth (out of scope).
- **ALL 11 WORKERS COMPLETE.** Product proof core is green: sites live, mobile in-flow objects live, /sites index live, Ask FYD wired and answering with evidence.
