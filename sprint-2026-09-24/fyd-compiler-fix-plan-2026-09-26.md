# FYD Presentation Compiler Fix Plan

Date: 2026-09-26. Status: PLAN ONLY. No execution until Nolan approves.
Directive source: Nolan's 2026-09-25 "FYD — The Page Is Broken: Fix the Compiler, Not Coppersmith" order.

## 0. Diagnosis (verified, not inferred)

The Coppersmith V2 screenshot proved systemic presentation failure, not a Coppersmith content problem. Code inspection confirms the mechanism:

- `src/fyd/family/family.css` imported token CSS from `src/builder/tokens/out/`, which does not exist. The real files live at `builder/tokens/out/`. Result: no theme CSS loaded, so every Tailwind utility the family depends on (`hidden`, `md:flex`, `text-h2`, `bg-cta-primary-background`, spacing, layout) was dead. That single defect explains the unstyled wireframe, the header collision (all `hidden` elements rendered at once), and the CTA treatment collapse.
- The planner emits no deterministic consumption map: the same facts (name, phone, address, service list, provenance) are sprayed wherever a component accepts them. Duplication was being fixed ad hoc, one symptom at a time.
- No screenshot falsification exists in the pipeline. 232 green tests never rendered a pixel.

Head start (local only, unpushed, on `fyd/builder-rebuild-v1`, on top of `8019f21`):

| Commit | What | Generic? |
|---|---|---|
| `e2d4c91` | family.css token import paths fixed | yes |
| `a96994c` | unitless clamp() token guard | yes |
| `486d2be` | literal `->` replaced with glyph | yes |
| `ceb3248` | media bound at most once, trade match only | yes |
| `60111ed` | Why-this collapsed to one footer affordance | yes |
| `1e4aecc` | service-area excludes hub address line | yes |
| `cf83420` | newsletter renders only on evidence | yes |
| `380cac4` | identity-led hero variant | borderline, verify generic |
| `6fa5962` | regenerate Coppersmith proof plan | coppersmith-specific, re-derive from compiler |
| `9677b5f` | dev-lab plan/ctx fields, unblocks build | yes |

No production build has run since these commits. The Pig is asleep; port 3105 still serves the old broken build. Nothing above has been visually verified.

## 1. What already exists (do not rebuild)

- `HomePagePlan` in `src/fyd/proceduralize/planner.ts`: sections with objectBindings, mediaBindings, ctaBindings, responsiveIntent, mediaIntent, rationale, eligibility ledger, `CtaHierarchy.placementMap`, `HeadlinePlan`, `ThemeReference`. This is a real start on presentation intent. Extend it, do not replace it.
- CTA rendering in `src/fyd/family/shared.tsx` (`Cta`, `PhoneLink`, `InspectAffordance`, `SectionShell`, focus rings, 44px targets). Audit and harden, do not rewrite.
- Owner-mode seam: `src/fyd/owner-mode/` (capability.ts, gate.ts, demo-owner-mode.tsx, attestation-gate.ts). `family-page.tsx` already renders zero owner chrome on the public surface regardless of the demo flag. Keep the seam; do not build production auth in this fix.
- Media ingestion pipeline with hashes and provenance. Missing: rights/source-policy field.
- DTCG token compiler producing per-theme CSS. Missing: nothing structural, but the import path must be covered by a build test so it can never silently 404 again.

## 2. Phase 0: build integrity and the before image

1. Verify `canonicalEntityUrl` exists with original semantics; reconcile `feedRenderableSchemas` warnings (open build-integrity caveat from Sept 25).
2. Full clean production build of `fyd/builder-rebuild-v1`. Fail the build if any family.css `@import` fails to resolve (add the missing test).
3. Identify exactly which process/worktree/build serves port 3105. Record build SHA.
4. Keep the current failed screenshots as `before/` regression evidence. They are valuable; do not delete.

## 3. Phase 1: rendered-DOM audit (no assumptions)

Render the fixed build and audit the actual DOM before changing components:
- Why did the logo/identity block appear twice? (plan emitted two navigations? hero re-render? CSS-dead sticky bar?)
- Where did the literal `?Ask FYD` fragment come from? (ask entry label leak?)
- Which facts repeat, and which planner rule emitted each repetition?

Fix mechanisms, not screenshots. Each finding becomes a compiler rule or it does not get fixed.

## 4. Phase 2: presentation consumption map (the core)

One deterministic, planner-owned map: every semantic fact gets exactly one primary presentation owner, plus an explicit allowlist of secondary placements. Defaults deny repetition.

- business name: header/hero only
- phone: header CTA allowed, contact section allowed, every service card NOT DEFAULT
- address: location section primary, footer compact optional, body sections no
- service: service card primary; featured cards vs. catalog section must differ or one is omitted
- media: object-specific card/hero primary
- provenance: trust affordance only, never body copy

Implement as planner rules with rule citations in `rationale`. Test generically: feed two different entity graphs, assert no fact renders in two unlisted placements.

## 5. Phase 3: design system primitives

Harvest, do not invent. Search PING/CascadeProjects/current dependencies first for: design tokens, layout primitives, responsive shell, navigation, card, CTA, media, theme, component registry, schema-driven UI, page generation. Take the minimum.

Target primitive set: PageShell, Header, Section, Stack, Cluster, Grid, Card, CTA, Media, TrustIndicator, Footer. Semantic components compose these. Compiler-wide rules: hero width capped, readable measure, responsive section padding, aligned cards, deterministic heading hierarchy, usable touch targets, aspect-ratio-safe media, no overflow, no collision, nav collapses before collision, CTA groups wrap intentionally, unknown/missing content collapses cleanly. No Coppersmith-specific CSS, ever.

## 6. Phase 4: responsive header composition

One responsive identity/navigation composition with explicit modes:
- MOBILE: identity + menu/primary CTA
- DESKTOP: identity + navigation + primary CTA

One identity rendering, no duplicate logo. Never attempt logo + name + phone + address + nav + CTA in one narrow row. Add an automated collision check (element overlap at 320/375/390) to the falsification pipeline.

## 7. Phase 5: CTA primitive from capabilities

CTA exists because a capability exists: OBJECT -> CAPABILITY -> CTA. One primitive with label, action, priority, state, accessibility, responsive behavior. Primary looks primary, secondary looks secondary. Unsupported actions do not render. Keep URL allowlisting at the projection/render boundary (javascript:/data: stay dead); CSP remains defense in depth, not the fix.

## 8. Phase 6: deterministic media selection

MEDIA -> evidence/object association -> role -> quality -> uniqueness -> section eligibility. Preference order: object-specific, then section-relevant, then entity-level fallback, then designed non-image treatment. Never repeat one image across cards. If only one relevant image exists, use it once; other cards render without imagery. Media ingest gains a rights/source-policy field: authorized demo media is content-addressed with source URL, observation, digest, and derived-asset relationship. Public visibility is never a blanket reuse license.

## 9. Phase 7: trust affordance

"Why this?" becomes a small provenance affordance near factual claims (e.g. Service area ⓘ, or subtle "Verified from website"). Tap opens source / observed / method / direct|derived|inferred. Owner/debug mode may expose more. Visitor mode stays elegant. Trust available, not screaming.

## 10. Phase 8: SiteSpec presentation intent (minimal extension)

Search existing PING/FYD code first. Extend the minimum proven structure toward: objective, audience, identity, informationArchitecture, pages[], sections[], emphasis, objectBindings, mediaBindings, capabilities, trustPolicy, designTokens, ownerOverrides. SiteSpec stays intent-only: no JSX, no CSS, no Tailwind strings, no executable code. V1 planning stays deterministic and rule-driven.

## 11. Phase 9: screenshot falsification, permanently

Every generated-site change: GENERATE -> BUILD -> SCREENSHOT at 320, 375/390, 768, 1440 -> automated checks (horizontal overflow, element overlap, duplicate media, duplicate visible fact, missing CTA, broken images, tiny touch targets, console errors, hydration errors) -> source/reference comparison -> owner-quality verdict. Automate the measurable; human judgment stays for hierarchy, coherence, trust, professionalism. The 232-test suite gets a rendered-surface gate it cannot pass while the page is broken.

## 12. Phase 10: six gates, reported independently

Keep MOBILE UX, CONTACT DISCOVERABILITY, SERVICE DISCOVERABILITY, PERFORMANCE. Add TRUSTED UNDERSTANDING and ACTION CLARITY as hard gates. Report each independently. No vanity composite score.

## 13. Phase 11: Ask FYD evidence outcomes

Visitor Ask FYD stays broad in question scope, narrow in epistemology. Required outcomes: SUPPORTED, PARTIALLY_SUPPORTED, INSUFFICIENT_EVIDENCE, OUT_OF_SCOPE. Never fill missing evidence with plausible business knowledge. "I don't have evidence for that" is a feature.

## 14. Phase 12: regen preserves owner choices

Owner changes outside the regenerated section survive regeneration (Sept 25 binding direction, still open). Intent -> proposal -> capability -> approval -> canonical transition -> projection.

## 15. Then: the same compiler on Happy Place

Only after Coppersmith passes the owner test. Verify HPP does not merely look like Coppersmith with different words. The same graph must compile to a genuinely different, genuinely good site. That is the proof the compiler generalizes.

## Explicitly NOT doing

- Hand-polishing Coppersmith. Every fix must be a compiler/planner/component-family rule or it does not ship.
- New features, new pages, new adapters (no MCP/ActivityPub/ATProto now; choose abstractions that keep the option).
- Production authentication. Demo-owner mode stays explicit and conspicuous behind the existing seam.
- The 15-item P0/P1 backlog first. The compiler is the frontier; the backlog waits.
- Chasing Lenis. Confirm no hydration/runtime error, then fix presentation. Remove diagnostic console noise when its bug closes.
- Rewriting the site around React #418. Reproduce from a clean committed build, bisect to the first divergent node.
- Disabling host sleep globally. Run lease -> wake inhibitor -> work -> release.

## Definition of done

The data is true. The experience is professional. The actions are obvious. The mobile site works. The owner can change it by talking. The concierge can explain the business. Every important claim can be defended. And the same engine does it for another business.
