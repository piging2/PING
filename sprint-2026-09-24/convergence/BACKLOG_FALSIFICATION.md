# BACKLOG FALSIFICATION — Lane 9
Date: 2026-09-25 ~20:30 MDT. Scope: the 49 proposed gaps in `~/workspace/your_files/sprint-30-questions-49-gaps-2026-09-25.md`.

## Method
Read-only falsification against the actual code. No builds, no test runs, no lane disturbance.
- FYD builder base: Pig repo `/home/nolan/fyd-wave2-clean`, branch `fyd/builder-rebuild-v1` @ `8019f21e` (extracted via `git archive` to /tmp; object-DB reads only, no worktree contact).
- Ask engine + owner-mode seam: same repo @ HEAD (`e48ef710`), which carries the Wave-1 ask/owner work the builder branch predates.
- Sprint records: `~/workspace/sprint-2026-09-24/*.md`, `fyd-compiler-fix-plan-2026-09-26.md` (the approved plan; "plan-owned" below means the plan already tasks it).
- The lane's 10 unpushed head-start commits (`e2d4c91` etc.) are NOT in any reachable object DB; falsification is against `8019f21e`. Where the plan's head-start table claims a fix, it is noted as unverified.

## 1. Classification table (49 rows)

| # | Gap | Verdict | Evidence |
|---|-----|---------|----------|
| 1 | Build-time assertion that family.css @imports resolve | PROVEN CURRENT DEFECT (plan-owned: Phase 0.2) | `fyd-product-lane/src/fyd/family/family.css:17-20` imports `../../builder/tokens/out/*.css`, which resolves to `src/builder/tokens/out/` — absent from the tree (`src/builder` MISSING; real artifacts at `builder/tokens/out/`). This exact defect produced the unstyled Coppersmith V2 screenshot (plan §0). No resolution assertion exists anywhere; should live in `builder/tokens/build.cjs` or a CI test. Lane commit `e2d4c91` (unpushed, unverified) fixes paths but per the plan the test is still open. |
| 2 | Element-overlap check at 320/375/390 in CI | PROVEN MISSING TEST (plan-owned: Phase 9) | No overlap/collision mechanism anywhere in `src/` (grep `overlap\|collis` → zero hits in builder branch). Plan Phase 9 lists it as to-add. |
| 3 | Duplicate-visible-fact detector | PROVEN CURRENT DEFECT (plan-owned: Phase 2) | No general detector. Only point checks exist: exactly-one-H1 test (`family-page.test.tsx:80`) and a "no repeated Why this" test (`:248`). The broken screenshot rendered the identity block twice (plan Phase 1 still asks why). Nothing asserts a fact renders only in listed placements. |
| 4 | Duplicate-media detector | PROVEN CURRENT DEFECT (plan-owned: Phase 9) | Ingest dedupes exact bytes by digest (`media/ingest.ts:137-145`) and `score.ts` R6 scores near-duplicate uniqueness — but nothing stops one `assetId` binding to multiple roles/sections: each `makeSection` builds its own `mediaBindings` array (`planner.ts:1354-1973`) with no plan-global used-asset registry. The "one condenser image across every card" failure is documented in `score.test.ts:195`. Lane commit `ceb3248` "media bound at most once" (unpushed, unverified) claims the fix. |
| 5 | Horizontal-overflow assertion on generated pages | PROVEN MISSING TEST (plan-owned: Phase 9) | `overflow` hits in `src/fyd` are only CSS classes (`TrustBar.tsx:54`, `ProjectGallery.tsx:102`), never an assertion. Plan Phase 9 lists it as to-add. (Note: an older template commit fixed one 375px overflow, `build-template1@82142ffc` — point fix, not a gate.) |
| 6 | Touch-target minimum assertion | ALREADY IMPLEMENTED | `family-page.test.tsx:130-168` "44px targets": every `a/button/input/select/summary` must carry `min-h-[44px]`/`min-w-[44px]` or be an exempt prose link; plus "primary CTAs are full-width on small viewports". `shared.tsx:27-28` defines the `TARGET_44` contract. |
| 7 | Heading-hierarchy assertion | ALREADY IMPLEMENTED | `family-page.test.tsx:80-101` "one editorial H1": exactly one H1, never the legal name, for both HPP-like and Coppersmith-like fixtures. Residual (unasserted): h2/h3 ordering. |
| 8 | Broken-image/empty-src gate in render pipeline | PROVEN MISSING TEST | Components null-guard (`{media && ...}`, `Hero.tsx:103`, `Navigation.tsx:41`) and planner tests assert "no media binding references a failed asset" (`planner.test.ts:574`) — but no render-pipeline gate asserts `src` is never empty/missing, and no `onError` fallback exists. |
| 9 | Console-error/hydration-error gate on generated pages | PROVEN MISSING TEST (plan-owned: Phase 9) | No `pageerror`/console-capture mechanism on the generated-page path (only unrelated hits: `preview/capture.ts` is a portal-snapshot tool). `family-generation.test.tsx` asserts SSR byte-identity, not console cleanliness. Plan Phase 9 lists both as to-add. |
| 10 | Theme token coverage asserted | PROVEN MISSING TEST — PROMOTED | Token pipeline validates dangling aliases (`token-pipeline.test.ts:32`) and the theme-seam test asserts no inlined values (`family-page.test.tsx:176`), but NOTHING cross-checks family utilities (`text-h2`, `bg-cta-primary-background`, `rounded-pill`…) against compiled token definitions. A utility with no token behind it fails exactly like the theme outage: silently. |
| 11 | Planner rationale cites the rule per placement | ALREADY IMPLEMENTED | `planner.ts:454-455` `rationale: string[]`; `465-506` `EligibilityRecord {component, variant, eligible, ruleId, reason}` + full `eligibility` ledger; `pushEligibility(ctx, "Navigation", …, "NAV-ELIG", …)` (`:1120-1380`). Every placement carries rule citations. |
| 12 | Secondary placements declare a semantic job | PROVEN CURRENT DEFECT (plan-owned: Phase 2) | No fact-consumption map exists: `rationale` mentions "signal consumption" only as prose (`planner.ts:510`). The `CtaHierarchy.placementMap` (`:708-717`) covers CTA tiers per placement, not fact→primary-owner→secondary-allowlist. Repetitions have no attributable cause and no deny-by-default rule. This is the plan's Phase 2 core. |
| 13 | Cross-entity compiler test | PROVEN MISSING TEST (plan-owned: Phase 2; blocked on 12) | Rendering is tested on two fixture entities (HPP-like, Coppersmith-like), but the consumption-map generalization test ("feed two different entity graphs, assert no fact renders in two unlisted placements" — plan Phase 2) cannot exist until 12's mechanism exists. |
| 14 | Consumption ledger machine-readable artifact | DUPLICATE (of 12) | The `HomePagePlan` type IS machine-readable, but the "consumption ledger" (fact→placements) is the same missing map as 12. Resolved by the same Phase 2 work; not a separate item. |
| 15 | Missing-content collapse test | PROVEN MISSING TEST — PROMOTED | Planner eligibility omits ineligible sections (`planner.test.ts:167-386`) and variants "fail closed" (`variants.test.tsx:130`), but no render test feeds empty-services / no-phone / no-address and asserts no ghost sections in the output HTML. |
| 16 | Nav collapses before collision at narrow widths | PROVEN MISSING TEST (plan-owned: Phase 4) | `Navigation.tsx:50` uses `hidden md:flex` (breakpoint collapse exists as markup); `responsiveIntent` in the planner is prose (`planner.ts:559-566`). No test asserts collapse-before-collision. Plan Phase 4 tasks the automated collision check. |
| 17 | Identity-duplication assertion | PROVEN MISSING TEST (plan-owned: Phase 4) | `Navigation.tsx:22` and `Hero.tsx:132` both bind `logo-mark`; the broken screenshot rendered the identity block twice and plan Phase 1 still asks why. No test counts identity renders. |
| 18 | Sticky header overlap assertion vs hero | PROVEN MISSING TEST (plan-owned: Phase 4) | `Navigation.tsx:33` is `sticky top-0 z-40`; no overlap assertion against hero content exists. |
| 19 | CTA groups wrap-intentionally assertion | PROVEN MISSING TEST (plan-owned: Phase 4) | `flex-wrap` classes exist (`Hero.tsx:26`, `ContactCTA.tsx:35`, `FeaturedService.tsx:129`); no test pins intentional wrapping. Family tests assert "375/390 contracts are structural… through the class contracts" (`family-page.test.tsx:16-18`) — classes, not behavior. |
| 20 | "Primary looks primary" assertion | PROVEN MISSING TEST — PROMOTED | `Cta` maps tier→style (`BTN_PRIMARY`/`BTN_SECONDARY`/tertiary underline/`HOOK_LINK`, `shared.tsx:30-56, 96-138`) — mechanism exists — but no test pins the tier→style contract, so a future flatten (the exact failure in the broken screenshot) has no alarm. |
| 21 | Unsupported actions cannot render as dead CTAs | PROVEN MISSING TEST — PROMOTED | `ctaHref` (`shared.tsx:60-79`) `default:` returns `"#"` — a silent dead CTA for any unexpected kind. Planner kind vocabulary is closed and `intent-guards.ts:368` validates kinds, but no rendered-output test asserts zero `href="#"` / dead CTAs, and "unsupported capability → no CTA" is unenforced at render. |
| 22 | URL allowlisting adversarial test at projection/render boundary | ALREADY IMPLEMENTED | `safe-link.test.ts` @ HEAD: 16 tests incl. mixed-case `javascript:`, whitespace-prefixed, control-character smuggling, percent-encoded tricks (`safe-link.test.ts:24-69`); `projection-boundary.test.ts` 5/5 hostile-URL tests; re-proven PASS 2026-09-22 (`fyd-build/hostile-url-proof-2026-09-22.md`). Builder branch renderer is allowlist-by-construction (planner emits only `#anchors`, `tel:`-sanitized phones via `phoneTelTarget`, `planner.ts:845-849`). Merge note: builder branch should inherit `safe-link` on merge. |
| 23 | Phone CTA tel: link format validation | ALREADY IMPLEMENTED | `family-generation.test.tsx:87-94` asserts `href="tel:+19702453869"` above the fold and visible text never raw E.164; `PhoneLink`/`ctaHref` normalize the `tel:` prefix (`shared.tsx:66,150`); `formatPhoneDisplay` tested (`planner.test.ts:552`). |
| 24 | Media ingest rights/source-policy field | ALREADY IMPLEMENTED | `rightsSource` 3-value vocabulary + `rightsBasis` on `FydMediaObject` (`media/types.ts:128`) and `MediaProvenanceRecord` (`media/provenance.ts:49-51`); RIGHTS GATE classifies before any bytes move (`media/ingest.ts:112-121`); R5 tests (`acquisition-boundaries.test.ts:20-46`). |
| 25 | Derived-asset relationship | ALREADY IMPLEMENTED | `ProvenanceDerivedAsset {derivedFrom, servedFrom, digest, …}` (`media/provenance.ts:23-36`); `planDerivatives` (`media/derivatives.ts:67`). |
| 26 | Designed fallback for zero usable media | ALREADY IMPLEMENTED | HERO-V5: "fallback is identity-led with typographic treatment, never a fake photo" (`planner.test.ts:463`); media bar rejects failed assets rather than degrading (`:563-596`). |
| 27 | Hotlink-vs-download policy enforced in code | PROVEN MISSING TEST — PROMOTED | Ingest downloads bytes and serves derivatives (`servedFrom`); render consumes `MediaManifest` (`assetId → {url, alt}`, `family/types.ts:34`) with FYD-controlled URLs. But NO test enforces the invariant "no rendered `img src` is an original hotlink" — the policy is architecture, not an enforced gate. |
| 28 | Media relevance scoring in code | ALREADY IMPLEMENTED | `media/score.ts` R1–R6 (relevance, documentary, resolution, aspect, rights, near-duplicate uniqueness) + `score.test.ts` 20+ tests incl. the documented Coppersmith condenser rejection (`:195`). |
| 29 | Suggested-question chips from graph schema roles | FUTURE | No question chips exist (`suggestedActions` are capability actions, `visitor-answer.ts:139`, not question chips). But 30-questions Q11 ("chips in this sprint, or after the core proof lands?") is undecided by Nolan — cannot promote until decided. |
| 30 | INSUFFICIENT_EVIDENCE owner-escalation path | FUTURE | No escalation/lead-capture path in ask code (grep `escalat\|lead` → zero). 30-questions Q9 ("route to owner, or just stop?") is undecided — the refusal itself is honest (`ok:true, refusal:true`), routing is a product decision. |
| 31 | Unsupported-question taxonomy | PRODUCT NICE-TO-HAVE | Claim-level taxonomy exists (`AskClaimClassification`: DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE → 3-class contract, `types.ts:269`, `visitor-answer.ts:69-95`) and honest-refusal is tested ("no service objects → honest refusal, nothing invented from prose", `services-evidence.test.ts:98`). A question-level taxonomy (competitor intel vs unknowable pricing) is refinement; the fail-closed behavior it would guard already exists. |
| 32 | Abuse/rate guard on the public Ask endpoint | PROVEN MISSING TEST — PROMOTED | `POST /api/fyd/ask/[siteId]` is anonymous by design ("mode visitor (default): anonymous, public objects only", `[siteId]/route.ts:24`); no rate limit in route, `ask-pipeline.ts`, or `src/middleware.ts` (grep `rate\|throttle` → zero). Open endpoint, no abuse guard. |
| 33 | Public citation rendering | ALREADY IMPLEMENTED | `AskFydCitation {source, basis, last-checked, claimClass}` (`visitor-answer.ts:119-127`); widget renders a "Why this?" disclosure per citation (`ask-fyd-widget.tsx:136-154`); privacy P0 lane just hardened it (citations drop internal ids, `MEMORY.md` 2026-09-25 ~20:02). |
| 34 | Before/after proposal review card | ALREADY IMPLEMENTED | `customize-panel.tsx:24` `reviewCard {title, before, after, operationCount}` rendered as Before/After (`:245-265`) in the demo owner panel; approve journals the overlay event. |
| 35 | Undo for applied owner changes | PROVEN MISSING TEST — PROMOTED | No undo/revert/supersede in `owner-mode/` or `POST /api/fyd/customize` (grep → zero). Journal shows `appliedIntentIds`; nothing reverses one. Mitigated by preview→approve (SPRINT-DECISIONS Q13) but not replaced. |
| 36 | Owner notification when source changes under customizations | PROVEN MISSING TEST — PROMOTED (deferred: no real owner in sprint) | `refresh/conflict.ts` `detectConflicts` + `diff.ts` `diffSnapshots`/`ChangeRecord` exist (temporal-refresh lane) — the detector is real — but no notification path to the owner exists. Silent drift can still occur. |
| 37 | Owner-facing changelog | PRODUCT NICE-TO-HAVE | The demo panel's inspect view lists journaled directives (`customize-panel.tsx:InspectData.directives`) — a dev view, not an owner changelog. Genuine product need, but no real owner exists in this sprint; not sprint-blocking. |
| 38 | Regeneration provenance | PROVEN MISSING TEST — PROMOTED (deferred: regen lane not yet running) | Owner changes have journal provenance (`intentId, proposalDigest, approvedBy, approvedAt, eventId`); `refresh/` records WHAT changed (`ChangeRecord`). But per-value regeneration cause (source re-observation vs owner override vs conflict resolution) is recorded nowhere; `src/fyd/regen/` is empty at HEAD and on the branch. |
| 39 | Pixel-diff visual regression harness between builds | PROVEN MISSING TEST (plan-owned: Phase 9) | No pixelmatch/screenshot-diff anywhere in source (only transitive `axe-core` in `package-lock.json`). Plan Phase 0 keeps `before/` screenshots as evidence; Phase 9 tasks the harness. |
| 40 | Accessibility gate on generated pages | PROVEN MISSING TEST — PROMOTED | Partial coverage exists: alt-text tests (`family-page.test.tsx:103`), 44px targets, focus rings, reduced-motion. Missing: contrast assertions, focus-order assertions — no axe/pa11y/lighthouse gate in source. |
| 41 | SEO sanity on generated pages | PROVEN MISSING TEST — PROMOTED | The v2 demo page happens to set `generateMetadata` title+description (`page.tsx:23-30`), but nothing in the compiler enforces title/meta per generated site. No assertion. |
| 42 | Graceful unknown-path handling on demo site | PRODUCT NICE-TO-HAVE | No `not-found.tsx` under `src/app` (Next default 404). Single-page demo; branded 404 is polish, not proof-blocking. |
| 43 | Renderer javascript: URL sink still open (FL-20260921-032) | SUPERSEDED | The FL record contradicts the gap: closed DONE_VERIFIED 2026-09-23 (commit `56f164e6`: 16/16 safe-link tests + static href-sink audit; hostile probe re-proven PASS 2026-09-22). "Still open / probe stays partial" is stale. Residual: ensure the builder branch inherits `safe-link` at merge (see 22). |
| 44 | Favicon/logo fallback when no logo media exists | PRODUCT NICE-TO-HAVE | No favicon/icon anywhere under `src/app`. Cosmetic; browsers show a default icon, not "nothing". |
| 45 | Port 3105 serve provenance unrecorded | PROVEN CURRENT DEFECT (plan-owned: Phase 0.3; ops) | Plan Phase 0 step 3 is exactly this ("Identify exactly which process/worktree/build serves port 3105. Record build SHA") — still open. MEMORY's note (`copper-v2 worktree @ 541a419`, 500 during rebuild) is a lead, not a recorded artifact. |
| 46 | Authorized deploy/restart checklist for demo updates | PROVEN MISSING TEST — PROMOTED (ops) | Charter requires "authorized deployment/restart coordination" for :3105 (`SPRINT-CHARTER-2026-09-25.md:167`); TOOLS.md documents the :3100 restart protocol in detail. No checklist exists for demo updates (:3105) — manual coordination, missed steps. |
| 47 | Sprint wake-lock reliability over 24h unproven on Windows/WSL | FUTURE | Mechanism exists (scoped wake inhibition `pig-fb/wake-wrap.ps1`; sprint holder `PIG-SPRINT-WAKELOCK-20260925`; battery guard <20%). "Unproven over 24h" can only be resolved by the sprint elapsing — validation accrues, not a defect to fix. |
| 48 | Battery drain rate under sprint load unknown | SUPERSEDED | Nolan's Q4 power policy FINAL (2026-09-25 ~19:56 MDT, MEMORY.md): keep Pig plugged in; "no deliberate battery-discharge policy in the sprint"; drain measurement deferred to a separate measured experiment. Measuring now would violate the policy. |
| 49 | Sprint run record | ALREADY IMPLEMENTED | `FYD-COORDINATOR-LOG-2026-09-25.md` (live), `critical-path-log.md` (327 lines), `SCOREBOARD.md` (490 lines) — the run record exists and is being written. |

## 2. Epics

27 items verified PROVEN. 15 are already owned by the approved compiler plan (Phases 0/2/4/9) — grouped below as plan-owned, no new backlog item needed. 12 are PROMOTED as new backlog candidates (each has evidence above, owner, failure mode, acceptance proof).

### Epic: RENDER QUALITY GATE (plan-owned: Phase 9; Phase 0.2/0.3)
Verified real, already tasked by the approved plan — do NOT re-add as backlog items.
- #1 build-time @import resolution assertion → plan Phase 0.2 ("Fail the build if any family.css @import fails to resolve (add the missing test)"). Acceptance: CI fails on unresolvable @import; the `src/builder/tokens/out/` class of defect can never ship silently again.
- #2 element-overlap check @320/375/390 → Phase 9 checklist. Acceptance: automated overlap assertion in the falsification pipeline.
- #5 horizontal-overflow assertion → Phase 9 checklist. Acceptance: no `scrollWidth > clientWidth` on generated pages at mobile widths.
- #8 broken-image/empty-src gate → Phase 9 checklist. Acceptance: rendered output contains no `img` with empty/missing `src`; or an `onError` fallback contract.
- #9 console-error/hydration-error gate → Phase 9 checklist. Acceptance: generated pages render with zero console errors and zero hydration mismatches.
- #39 pixel-diff visual regression harness → Phase 9. Acceptance: build-to-build pixel diff runs automatically; regressions flagged without eyeballs.

### Epic: RESPONSIVE QUALITY (plan-owned: Phase 4)
- #16 nav collapse-before-collision → Phase 4 ("nav collapses before collision" compiler rule + automated collision check). Acceptance: test renders nav at 320px, asserts no collision.
- #17 identity-duplication assertion → Phase 4 ("One identity rendering, no duplicate logo"). Acceptance: exactly one logo/name block in rendered output.
- #18 sticky-header overlap assertion → Phase 4. Acceptance: fixed header never covers hero headline at any tested width.
- #19 CTA wrap-intentionally → Phase 4 ("CTA groups wrap intentionally"). Acceptance: CTA groups carry and satisfy the wrap contract at 320/375.

### Epic: CONSUMPTION/PROVENANCE (plan-owned: Phase 2)
- #3 duplicate-visible-fact detector → Phase 2 ("assert no fact renders in two unlisted placements"). Acceptance: the generic two-entity-graph test passes.
- #12 fact-consumption map with semantic jobs → Phase 2 core ("every semantic fact gets exactly one primary presentation owner + explicit secondary allowlist; defaults deny repetition; rule citations in rationale"). Acceptance: planner emits the map; repetitions are attributable to a rule or absent.
- #13 cross-entity compiler test → Phase 2 (acceptance test for #12; blocked on #12).
- #4 duplicate-media detector (bound-at-most-once) → Phase 9 checklist item "duplicate media"; lane claims fix in unpushed `ceb3248` — acceptance is verifying that commit's test, not a new item.

### Epic: DEMO/OPERATIONS RELIABILITY (1 plan-owned + 1 promoted)
- #45 :3105 serve provenance → plan Phase 0.3 (record process/worktree/build SHA). Plan-owned.
- #46 PROMOTED — authorized deploy/restart checklist for demo updates. Evidence: charter mandates authorization (`SPRINT-CHARTER-2026-09-25.md:167`) but no checklist exists; :3100's protocol in TOOLS.md is the template. Owner: sprint coordinator / demo-ops. Failure mode: manual coordination, missed steps during Nolan's live walkthrough window. Acceptance proof: a written checklist exists; every :3105 bounce references it.

### Epic: MEDIA PIPELINE (1 promoted)
- #27 PROMOTED — enforce "no rendered img src is an original hotlink". Evidence: ingest downloads + serves derivatives, render consumes `MediaManifest`, but no gate enforces it (`family/types.ts:34`). Owner: compiler lane (media). Failure mode: a future manifest builder leaks `sourceUrl` and the public page runtime-depends on source availability. Acceptance proof: test renders all family fixtures and asserts every `img src` matches the FYD-controlled derivative pattern.

### Epic: CAPABILITY/CTA SAFETY (2 promoted)
- #20 PROMOTED — pin the tier→style contract ("primary looks primary"). Evidence: `Cta` maps tier→`BTN_PRIMARY`/`BTN_SECONDARY`/tertiary/`HOOK_LINK` (`shared.tsx:30-56, 96-138`); no test. Owner: compiler lane (family). Failure mode: CTA tiers flatten visually with no alarm (the broken-screenshot failure). Acceptance proof: test asserts primary-tier CTAs render `bg-cta-primary-background` and secondary/tertiary render their distinct treatments, for both fixture entities.
- #21 PROMOTED — no dead CTAs in rendered output. Evidence: `ctaHref` `default:` returns `"#"` (`shared.tsx:77`); no rendered-output test. Owner: compiler lane (family). Failure mode: buttons that do nothing ship. Acceptance proof: test asserts zero `href="#"` and every rendered CTA resolves to a live target (tel:/anchor/ask) across fixtures.

### Epic: ASK FYD (1 promoted)
- #32 PROMOTED — abuse/rate guard on the public Ask endpoint. Evidence: `POST /api/fyd/ask/[siteId]` anonymous by design; zero rate-limiting in route, pipeline, or `src/middleware.ts`. Owner: FYD lane (ask). Failure mode: open endpoint, open abuse (LLM-backed endpoint = cost + prompt-injection surface). Acceptance proof: rate limit enforced (e.g. per-IP/per-site token bucket) with 429 semantics; tested.

### Epic: OWNER CHANGE LOOP (1 promoted)
- #35 PROMOTED — undo for applied owner changes. Evidence: no undo/revert/supersede in `owner-mode/` or `/api/fyd/customize`. Owner: FYD lane (owner loop). Failure mode: one bad applied change, no way back (preview→approve mitigates, does not replace). Acceptance proof: owner can revert the last applied change (or any journaled directive) and the projection re-renders the prior state; tested.

### Epic: REGENERATION (2 promoted, both deferred)
- #36 PROMOTED (deferred: no real owner in sprint) — owner notification on source-change-under-customization. Evidence: `detectConflicts`/`diffSnapshots` exist (`refresh/`); no notification path. Owner: temporal-refresh lane + owner loop. Failure mode: silent drift clobbers owner customizations. Acceptance proof: a detected conflict produces an owner-visible notification/proposal; tested.
- #38 PROMOTED (deferred: regen lane not yet running) — per-value regeneration provenance. Evidence: journal covers owner changes; `ChangeRecord` covers what; cause (re-observation vs override vs conflict resolution) recorded nowhere; `src/fyd/regen/` empty. Owner: regen lane (when chartered). Failure mode: "why did this value change" unanswerable. Acceptance proof: every regenerated value carries a recorded cause.

### Epic: RENDER CONTRACTS, MISC (3 promoted)
- #10 PROMOTED — theme utility→token coverage. Evidence: dangling-alias validation exists; no utility cross-check (`family-page.test.tsx:176` only asserts no inlined values). Owner: compiler lane (tokens/family). Failure mode: a family utility with no token behind it silently unstyles (the theme-outage failure mode). Acceptance proof: test parses family-emitted classes and asserts each `*-*` utility resolves in the compiled theme CSS for both themes.
- #15 PROMOTED — missing-content collapse test. Evidence: eligibility rules exist; no render test with empty-services/no-phone/no-address. Owner: compiler lane. Failure mode: ghost sections on thin business graphs. Acceptance proof: fixture with missing content renders no empty sections.
- #40 PROMOTED — accessibility gate (contrast + focus order). Evidence: alt-text, 44px, focus-ring, reduced-motion covered; contrast/focus-order unasserted; no axe/pa11y. Owner: compiler lane. Failure mode: contrast and focus order rot silently. Acceptance proof: automated contrast + focus-order assertions pass on generated pages.
- #41 PROMOTED — SEO sanity per generated site. Evidence: v2 demo sets metadata ad hoc; compiler enforces nothing. Owner: compiler lane. Failure mode: missing titles/meta ship on generated sites. Acceptance proof: every generated page asserts non-empty title + meta description.

## 3. Counts

| Verdict | Count | Items |
|---|---|---|
| PROVEN CURRENT DEFECT | 5 | 1, 3, 4, 12, 45 |
| PROVEN MISSING TEST | 22 | 2, 5, 8, 9, 10, 13, 15, 16, 17, 18, 19, 20, 21, 27, 32, 35, 36, 38, 39, 40, 41, 46 |
| ALREADY IMPLEMENTED | 12 | 6, 7, 11, 22, 23, 24, 25, 26, 28, 33, 34, 49 |
| DUPLICATE | 1 | 14 (of 12) |
| PRODUCT NICE-TO-HAVE | 4 | 31, 37, 42, 44 |
| FUTURE | 3 | 29, 30, 47 |
| INVALID | 0 | — |
| SUPERSEDED | 2 | 43, 48 |
| **Total** | **49** | |

Promoted to backlog candidacy: **12** (#10, #15, #20, #21, #27, #32, #35, #36, #38, #40, #41, #46) — 2 deferred (#36, #38). Plan-owned, no new item needed: 15 (#1, #2, #3, #4, #5, #8, #9, #12, #13, #16, #17, #18, #19, #39, #45).

## 4. Open questions (batched for coordinator; not for Nolan)

1. **Gap 43 dispute (evidence-level):** the gap asserts FL-20260921-032 is "still open"; the ledger shows DONE_VERIFIED 2026-09-23 (`56f164e6`, 16/16 safe-link tests, hostile probe PASS 2026-09-22). I classified SUPERSEDED. Confirm the ledger stands, and confirm the builder branch is expected to inherit `safe-link` at merge (it currently lacks it; its renderer is allowlist-by-construction but has one raw sink, `Hero.tsx:230` `href={phoneCta.target}`, safe only because the planner's target vocabulary is closed).
2. **Falsification base vs lane head-start:** 10 head-start commits (`e2d4c91` family.css paths, `ceb3248` media-at-most-once, …) are unpushed and absent from every reachable object DB. My verdicts are against `8019f21e`. If the lane's fixes are meant to close gaps #1/#4, those need verification against the lane worktree by someone with access — I did not touch it per constraints.
3. **#32 scope:** the Ask endpoint's anonymity is intentional ("visitor, public objects only"). Is a rate guard wanted in-sprint (promoted) or accepted as demo risk until a real public launch?
4. **#35 vs preview→approve:** SPRINT-DECISIONS Q13 locked preview→approve for consequential changes. Does that obsolete undo, or is undo still wanted as the safety net for applied changes? I promoted it; downgrade to nice-to-have if preview→approve is deemed sufficient.
5. **#14 boundary:** classified DUPLICATE of #12 (same Phase 2 work). If the coordinator wants the machine-readable ledger artifact tracked separately from the map mechanism, split it back out.

## Notes for the coordinator
- No product code touched; no builds/tests run; Pig lanes undisturbed (object-DB reads only). :3100/:3101 not probed.
- Per protocol, no P0s found in product code requiring packaging — the closest, #43, resolved as superseded by the existing verified record.
- Suggested handling: the 15 plan-owned items need no backlog action (the approved plan already tasks them); the 12 promoted items are the backlog candidates; #36/#38 are promoted-but-deferred (no real owner / regen lane not running).
