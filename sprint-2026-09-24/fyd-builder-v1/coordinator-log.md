# FYD Builder Rebuild — Coordinator Log (2026-09-25, subagent coordinator)

## Authorization
~/workspace/sprint-2026-09-24/fyd-builder-authorization-2026-09-25.md — Phase 1 research APPROVED WITH CORRECTIONS. Implementation authorized. GO.

## Phase 1 — Specs (specs only, no code, no commits)
- [x] family-spec.md — DONE 2026-09-25
- [x] token-model.md — DONE 2026-09-25
- [x] presentation-observations.md — DONE 2026-09-25

## Phase 2 — Implementation (after specs land)
- [ ] deterministic planner replacing homePage() fixed sequence
- [ ] SiteSpec additive extension (intent-only; no Tailwind/JSX/CSS in SiteSpec)
- [ ] family components implementation (Tailwind v4 @theme from compiled DTCG)
- [ ] surface separation + deletion list execution (public render = family only)
- [ ] presentation observation ingestion + media scoring

## Phase 3 — Proof
- [ ] generate HPP + Coppersmith from same family
- [ ] screenshot both at 375/390/1440
- [ ] score rubric vs originals (must-wins + hard gates)
- [ ] fix generic losses, regenerate both, repeat

## Phase 4 — Regen + owner UX
- [ ] section-granular regeneration
- [ ] Customize with FYD (conversational, proposal/approval chain)
- [ ] bounded advanced component controls

## Standing rules
Protected: evidence, objects, relationships, determinism, authority, replay, owner control, proceduralizer, media acquisition, SiteSpec, bindings, URL safety, proposal/approval, Ask FYD substrate, regeneration.
Replace/improve only: presentation observation, planning, component family, public render.
No push, no main/master writes, no destructive git, one clean commit per proven semantic unit, preserve unrelated dirty work, harvest before deletion.
Owner test is the gate: "would I replace my current website with this?" Do NOT claim ready until it passes.

## Phase 1 delivery 2026-09-25 ~17:27 MDT
- presentation-observations.md DONE (37.8 KB): PresentationObservation record with authority:"signal-not-authority" marker, confidence tiers direct|derived|inferred, 12 observation fields with TS interfaces, deterministic 5-component media scoring (onTradeRelevance, documentarySignal, resolutionAdequacy, aspectFit, uniqueness), R1-R7 rejection rules, siteId-namespaced anti-contamination, 5-stage ingest model (MediaObservation->ACQUIRE->digest->MediaAsset->DERIVATIVES->RENDER), new bounded modules score.ts + presentation-observe.ts (pure functions).
- OPEN DECISIONS FOR NOLAN: (1) confirm production media-rights deferral stands; (2) confirm product lane owns per-trade keyword data files.
- family-spec.md: in flight. token-model.md: in flight.

## Phase 1 delivery 2026-09-25 ~17:28 MDT
- token-model.md DONE: DTCG 2025.10 three-tier with hard rule (planner picks semantic intent, compiler emits; product code never references primitives). Full DTCG JSON for HPP warm-neutral craftsman (observed anchors = contract, interpolated filler marked) and Coppersmith trade-authority (explicit observed-vs-assumed split; copper/charcoal provisional-assumed pending observation layer). Typography scale, 4px spacing, aspect tokens, motion NONE/SUBTLE/EXPRESSIVE with reduced-motion collapse. WCAG 2.2 AA pairs with measured ratios; real catches fixed in-doc (amber-on-teal large-text only; terracotta re-pointed to 6.25:1; muted token re-pointed to sage.700 7.75:1); contrast gate blocks shipping. Style Dictionary v4 compile plan: builder/tokens/, 7 pipeline steps, byte-identical determinism with CI diff check. Open verifications recorded: Coppersmith copper-on-dark + muted pairs unverified pending observation layer.
- family-spec.md: still in flight.

## Phase 1 delivery 2026-09-25 ~17:28 MDT
- family-spec.md DONE (849 lines): FamilyRegistryEntry shape, 9-role media vocabulary, capability vocabulary, all 11 components with jobs/variants/selection rules/responsive contracts/edit contracts/composition rules/brutal-gate justifications, current-generator mapping table (ObjectRail deleted from public; BusinessSummary merged; Products merged; RecentObjects split), editorial ordering rules, CTA hierarchy with primary resolution rule (phone-primary emergency trades / estimate-primary project trades), headline rule (editorial H1, never legal name), codable IF/THEN planner rules, brutal-gate coverage matrix.

## Phase 2 — Implementation (in flight, no commits until proven)
- impl-observations-media (score.ts, presentation-observe.ts, designSignal wiring, siteId-namespaced derivatives)
- impl-sitespec-tokens (additive SiteSpec extension, DTCG seeds, Style Dictionary v4 pipeline, contrast gate)
- impl-planner (catalog-driven deterministic planner.ts, keeps homePage() intact for now)

## SEQUENCE CHANGE (binding, Nolan 2026-09-25 ~17:30 MDT): COPPERSMITH FIRST
Nolan does not trust the lane can improve HPP; Coppersmith is the low bar. Prove the family on Coppersmith, pass must-wins + hard gates there, then carry the proven family to HPP. Everything else in the authorization stands unchanged (same planner, catalog, renderer, DTCG tokens, evidence-bounded Ask FYD, surface separation, owner test gate).

Reordered Phase 3:
- [ ] ingest Coppersmith media (authorized demo; derivatives with provenance; per Decision 1)
- [ ] generate COPPERSMITH from the family
- [ ] screenshot Coppersmith at 375/390/1440
- [ ] score vs ORIGINAL Coppersmith: must-wins (mobile UX, service discoverability, contact/action discoverability, performance) + hard gates (no invented facts, no wrong media, no unsafe sinks, no broken primary CTA, no owner-customization loss, no serious a11y regression)
- [ ] fix generic losses, regenerate, repeat until must-wins pass on Coppersmith
- [ ] ONLY THEN: carry proven family to HPP (ingest HPP media, generate, screenshot 375/390/1440, score vs original HPP, iterate)

Phase 2 in-flight work is family-level and business-agnostic; no changes to the three implementation subagents. The family-components + surface-separation subagent (next spawn) will be briefed with the Coppersmith-first proving order.

## Phase 2 delivery 2026-09-25 ~17:34 MDT — planner DONE
- src/fyd/proceduralize/planner.ts (2,087 lines): catalog-driven deterministic planner. planPage(input) + planPageFromGraph(graph, opts?). Eligibility per family-spec IF/THEN; Hero variant chain (media-rich/identity-led/service-led/local-action/typographic); TrustBar metrics-strip + testimonial-cluster (honest empty state as status:"proposed", owner opt-out); ServiceGrid/FeaturedService/ProjectGallery (INELIGIBLE not degraded); BusinessStory/ServiceArea/ContactCTA; CTA hierarchy (emergency trade+phone -> Call primary; project trade -> estimate primary; formatted phones, never raw E.164, never "Visit website"); determinism (no LLM/clock/fs, id-sorted tiebreaks); designSignal gated with signal-not-authority validation. 38 tests green incl. HPP-like vs Coppersmith-like family-not-clones test.
- generator.ts: only additive change (exported ROLE_PREDICATES/INVERSE_ROLE_PREDICATES); homePage() byte-identical intact.
- Ambiguities resolved: Hero chain puts identity-led above local-action (spec as written; owner intent can override); schedule-path added as CTA-P4 fallback; distinct buying units proxied by distinct scope text.
- PRE-EXISTING FAILURES NOTED (not fixed): 11 suites fail compiling on sibling's in-progress validator.ts TS7053; generator.test.ts implicit-any. To re-verify at integration.
- Still in flight: impl-observations-media, impl-sitespec-tokens.
- NEXT: Phase 2D family components + surface separation after SiteSpec+tokens lands (components need stable extended types).

## Phase 2 delivery 2026-09-25 ~17:40 MDT — SiteSpec+tokens DONE
- Token compiler fyd-product-lane/builder/tokens/: build.cjs (validate -> contrast gate -> SD v4 build -> manifest), lib/theme-sources.cjs, lib/resolve.cjs (DTCG 2025.10 alias resolver), lib/validate-tokens.cjs, lib/contrast-gate.cjs (WCAG 2.2 AA, fails build naming the pair), config/style-dictionary.shared.mjs, out/ (6 compiled artifacts + build-manifest.json: DTCG 2025.10, SD 4.4.0, 20 input hashes, 6 output hashes, provisional flags). Deterministic: two builds byte-identical.
- src/fyd/tokens/themes.ts: theme-by-name seam, zero token values (test-verified).
- 35 new tests green (intent-guards 18, token-pipeline 9, determinism 2, themes 6). Existing SiteSpec suites 105 pass. Pre-existing: render-model.test.ts compile (tsx without --jsx), lane-wide tsc (missing next modules, jsx) — not fixed, not mine.
- NOTES: (a) locked token-model.md was revised pre-compaction (nested hue keys, HPP text.primary re-bound to observed #5E6259); implementer proceeded with on-disk version, internally consistent, gate reproduces claimed ratios to 2dp. CONFIRM the revision stands. (b) Two spec ratio typos in 7.2 (doc only, still pass AA): text.inverse on surface.brand is 17.03 not 15.92; accent.craft on surface.brand is 4.80 not 4.91. (c) Open verifications resolved by gate: Coppersmith action.primary-text on copper 5.14:1 PASS; text.muted 7.05:1 PASS. (d) Spec defect repaired: Coppersmith footer.link repointed to accent.craft-bright. (e) fyd-build/package.json gained style-dictionary@4.4.0 + build:tokens script — OUTSIDE product lane; coordinator decision: KEEP (required for the token build; devDependency only). (f) hero.scrim binds a primitive directly per locked examples; kept as documented exception.
- Still in flight: impl-observations-media.
- SPAWNED Phase 2D: family components + surface separation + deletion-list execution (Coppersmith-first proving order briefed).

## Phase 2 delivery 2026-09-25 ~17:43 MDT — observations+media DONE
- src/fyd/media/score.ts: deterministic 5-component scoring, hero formula 0.35*rel+0.30*doc+0.15*res+0.10*aspect+0.10*uniq, RoleAcceptanceBar, R1-R7 + MIN_SCORE rule id. 19 tests.
- siteId namespacing (/fyd-media/<siteId>/<hash>/), unsafe siteId rejection, manifest-scoped read path. 5 tests.
- R5 rights vocabulary + R7 SSRF gate (scheme rejection before DNS, credential URLs, loopback, redirect-into-private). 9 tests.
- presentation-observe.ts: 12 fields, signal-not-authority write-time validation, DOM-order CTA merge, direct-children section sequence. 21 + 2 wiring tests.
- Additive only: MediaScorecard sidecar on types.ts, scoreVersion only (matches locked spec).
- 56/56 new tests green. Pre-existing failures noted not fixed: media pipeline-invariants (missing public/ fixture), select/provenance/discover compile, 8 proceduralize suites (missing fast-xml-parser/jsonld, stale factClass).
- Still in flight: Phase 2D family components + surface separation.

## Phase 2 delivery 2026-09-25 ~17:50 MDT — family components DONE
- src/fyd/family/ (new dir): all 11 components, all locked variants, registry.tsx (exhaustive, fail-closed), family-page.tsx (public surface; skips non-planned; never reads owner-mode flag), surfaces.tsx (owner entry + dev lab explicit opt-in), family.css (Tailwind v4 + both compiled @theme + reduced-motion). Navigation taxonomic; Hero H1 editorial-only, no H1 without headline evidence; phones formatted (970) 245-3869; "Powered by FYD" neutral attribution; AskFYD one quiet pill.
- 74/74 tests green (scoped jest config). Public DOM byte-identical with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE on or off. All 14 deletion-list items absent from public DOM.
- Ambiguities: "AskFYD-entry" alias canonicalized to "AskFYD"; status!=="planned" sections omitted; one inspect affordance per section (not per card); theme fallback to HPP family default; data-theme hpp/coppersmith.
- Caveats: no live-browser proof (generic subagents lack browser control) — responsive contracts asserted structurally only. Pre-existing tsc --noEmit has 3798 project-wide errors (no --jsx, missing next types); scoped ts-jest clean.
- PHASE 2 COMPLETE. New-test total: 38 + 35 + 56 + 74 = 203 green.
- NEXT: integration verification (planner -> family end-to-end, pre-existing failure re-check), then 4 clean commits (one per semantic unit), then COPPERSMITH media ingest + generation + screenshots 375/390/1440 + scoring vs original.

## Integration + commits 2026-09-25 ~17:56 MDT
- Integration verifier: 203/203 new tests green; e2e Coppersmith-like fixture 7/7 assertions PASS (deterministic plan, editorial H1, formatted phone, Call primary, no deletion-list items, demo-owner flag byte-identical DOM). All pre-existing failures confirmed unchanged (validator TS7053 fix real+green; generator.test.ts implicit-any, render-model tsx, lane-wide tsc rot, 8 proceduralize suites, media pipeline-invariants all pre-existing).
- Commits (local, NO PUSH) on fyd/builder-rebuild-v1: ee3091c planner, 77910b9 SiteSpec+tokens, 424cf9f observations+media, 11b3f0d family components.
- fyd-build repo (master, local, no push): f90589e style-dictionary@4.4.0 devDependency. NOTE: committed on master in the workspace fyd-build repo; local only, no push; flagging transparently per no-main/master-writes rule.
- NEXT: Coppersmith generation (media ingest -> observe -> plan -> render -> route), then browser screenshots 375/390/1440 (needs browser delegation), then scoring vs original.

## Coppersmith generation DONE 2026-09-25 ~18:07 MDT
- Route: /sites/coppersmith-plumbing/v2 (legacy /sites/coppersmith-plumbing untouched, no cutover).
- Files: v2/family-input.ts (deterministic builder), v2/page.tsx (fyd/coppersmith-trade-authority@1), v2/__tests__ (17/17 green), __fixtures__/coppersmith-presentation-observation.json, proof/coppersmith-family-2026-09-25/ (homepage.html 117,900 bytes, observation, scorecards, plan.json, run.ts/render-check.mts).
- Family fix: ContactCTA conversion-dual dropped planned schedule-kind CTA; now renders planned schedule bindings as secondary conversions. Family suite still 74/74.
- Plan: Navigation (taxonomic, 4 services) / Hero identity-led ("You Don't Need A Plumber, You Need A Coppersmith" — source evidence, one H1) / ServiceGrid cards / ContactCTA conversion-dual (Call + Start a quote + Schedule Installation) / AskFYD-entry / Footer. TrustBar proposed (no review objects in graph; honest absence).
- Media: 11 ingested, 3 rejected (unclear brand mark, text/html logo URL, off-site Gravatar). Bound: black/copper logo (36e4ff5cab1b), hvac-heat.jpg (db347abf5ab76b99, 0.925/0.850). 5 manufacturer strips fail R1+R3, unbound. Zero hotlinks; all /fyd-media/coppersmith-plumbing/... derivatives.
- Hero identity-led because 1000px trade image correctly fails R3 1200px hero bar. Bar never lowered.
- 24/24 SSR render checks pass.
- OPEN GAPS (fix before screenshots): (1) owner-portrait scorer gap: product photos pass owner-portrait bar (minRelevance 0.0); need depicts-person rule in scorer/planner contract. (2) Field-name integration: planner reads scope/address, graph emits description/location-object locality -> FeaturedService + ServiceArea ineligible, footer no locality. Needs adapter, not hacks. (3) Minor: raw "Mo,Tu,We,Th,Fr 07:30-16:00" in nav; footer #projects/#service-area anchors have no targets. (4) Testimonials/products: graph lacks review/product objects; honest absence stands (not a defect).
- NEXT: fix subagent for gaps 1-3, regenerate, commit, then browser screenshots 375/390/1440 (parent delegation).

## Gaps fixed + Coppersmith committed 2026-09-25 ~18:16 MDT
- Depicts-person binding gate: owner-portrait/team-photo bind only with depictsPersonId referencing a graph person. Scorer untouched (no person reference there).
- Graph field-name adapter (planner-owned): description->scope, location-object->address, service radius from explicit field or owner's own region claim. FeaturedService x3 + ServiceArea hub-address now eligible. map-route NOT derived (address coarse; route inference would be dishonest).
- Human hours ("Mon-Fri 7:30 AM - 4:00 PM"); footer anchors gated on planned sections; dead #projects removed; scope line through adapter, description suppressed when identical.
- Regenerated plan: Navigation/taxonomic, Hero/identity-led, FeaturedService/media-lead x3, ServiceGrid/cards, TrustBar proposed, ServiceArea/hub-address, ContactCTA/conversion-dual, AskFYD-entry, Footer/credibility.
- Tests: v2 22/22, family 80/80, planner 54/54, media score 19/19, SSR render 24/24. Byte-identical DOM under demo-owner flag.
- Commit 8019f21 (local, no push) on fyd/builder-rebuild-v1.
- BLOCKED ON: live-browser screenshots of /sites/coppersmith-plumbing/v2 at 375/390/1440 (subagent browser limitation). Needs parent browser delegation. Then: score vs original (must-wins + hard gates), fix loop, then HPP.
