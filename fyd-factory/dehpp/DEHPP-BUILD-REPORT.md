# DEHPP-BUILD-REPORT

**Lane:** DEHPP (data-plane parameterization of the Happy Place Platform clone)
**Date:** 2026-09-24
**Branch:** `fyd-dehpp` (from frozen donor commit `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`)
**Worktree:** `/home/nolan/fyd-dehpp-wt` (clean linked worktree; main Pig repo untouched)
**Spec:** `dehpp/parameterization-spec.md`
**Fidelity baseline:** `hpp-clone/CLONE-REPORT.md` (verdict PROCEED)

## Fidelity verdict

**SPEC_IDENTICAL. Zero validation findings. renderable=true.**

The new `composeSite` seam was replayed against the recorded golden proof inputs
(`FYD_PROJECTION_DIR=/home/nolan/ping/var/fyd-projections`,
`FYD_OWNER_DIR=/home/nolan/projects/ping/data/fyd-owner`, same disk files the
golden replay used, sha-recorded in the clone report). The composed spec is
canonically identical to `golden/evidence/hpp-composed-spec.json` under
sorted-key JSON comparison: same 14 top-level keys, null archetype/status/
revision/objectPresence/heroMedia, `themeTokens` exactly `DEFAULT_FYD_THEME`,
findings `[]`, renderable `true`. The route recomposition (thin HPP page over
the seam) was applied only after this proof renewed, per the build order.

## Build order (as executed)

1. Split customer and demo chrome (B1, P2).
2. Moved renderer voice into the copy table (B5, P5/P6/P7).
3. Wired media and tenant data surfaces (B4, P13/P10/P11).
4. Added composition ordering and strategy pipeline (P3/P4, B3, P8).
5. Added remaining copy parameters (P12, P9, P1 validation).
6. Added SocialProof last (B6).
7. Corrected the aspirational generator comment (B7).
8. Renewed the HPP golden proof through the new seam, then applied the thin
   HPP route last.

## The 13 parameters (Part A)

| Param | Name | Location |
|---|---|---|
| P1 | tenantId (validated, fail-closed) | `src/fyd/compose/params.ts` `validateTenantId` |
| P2 | chromeMode (env, default customer) | `src/fyd/compose/params.ts` `resolveChromeMode` |
| P3 | homeSectionOrder | `src/fyd/compose/profile.ts`, consumed in `generator.ts` `applySectionOrder` |
| P4 | pageOrder | `src/fyd/compose/profile.ts`, consumed in `generator.ts` `applyPageOrder` |
| P5 | defaultSectionHeadings | `src/fyd/copy/defaults.ts` `sectionHeadingFor` |
| P6 | claimKindLabels | `src/fyd/copy/defaults.ts` `claimKindLabel` |
| P7 | ctaHeading | `src/fyd/copy/defaults.ts` `ctaHeadingFor` |
| P8 | ctaEmphasis (standard/elevated/quiet) | `src/fyd/compose/profile.ts`, `generator.ts` `applyCtaEmphasis` |
| P9 | navLabels (page.navLabel ?? titleCase(slug)) | `generator.ts` `titleCase`, navigation built from ordered pages |
| P10 | layoutCharacter (nullable enum) | `src/fyd/compose/profile.ts`, `generator.ts` `applyCompositionTokens` |
| P11 | themeTokenOverrides (validated, deep-merged) | `src/fyd/compose/profile.ts`, `generator.ts` `applyCompositionTokens` |
| P12 | provenanceTemplate + meta.eventSequences | `src/fyd/compose/params.ts` `renderProvenanceSentence` |
| P13 | seoBrandName (deployment) | `src/fyd/compose/params.ts` `siteTitle`/`siteDescription` |

Precedence for the composition profile: live owner intent (presentation intent
block, shape-checked) > tenant composition record > category strategy
(`strategyForSite` over archetype profiles + `applyPlannerPolicy`). Each layer
replaces the whole block it provides; nothing merges silently.

## The 7 replacement mechanisms (Part B)

- **B1 (S1 chrome split):** `CustomerSite` (page tabs + SitePageView + provenance
  footer only) and `DemoChrome` (demo header, validator banner/notes, structured
  editor with S4 proposal/approval behavior preserved, DemoOwnerMode) in
  `src/app/sites/_shared/`. The route composes by P2 chromeMode, default
  customer. Removal proof: new `chrome-split.test.tsx` renders CustomerSite to
  static HTML and asserts no "Generated site demo" header, no "FYD Social", no
  validator banner, no editor DOM, with tabs and the tenant's own provenance
  sentence intact. 3/3 pass.
- **B2 (S5 acceptance sequences as data):** the hardcoded literal is gone from
  the customer surface; `renderProvenanceSentence` renders `meta.eventSequences`
  as "65-83" (or "65" when start == end) and omits the clause when absent.
  Removal proof in `params.test.ts`: [1,4] prints "(acceptance sequences 1-4)";
  null prints no clause. Pass.
- **B3 (R9 strategy pipeline):** `composeSite` resolves a real profile through
  `strategyForSite`/`applyPlannerPolicy` and passes it to `generateSiteSpec`;
  the generator's fixed orders are now the default-profile values.
  Integration proof (`proceduralize/__tests__/composition.test.ts`): two
  profiles over one graph produce different section orders (P3) and different
  CTA positions/treatments (P8), deterministically. Pass.
- **B4 (M3 media seam):** `composeSite` populates `heroMedia`, `galleryMedia`
  (per-object `galleryMediaFor`), and `objectMedia` (per-object
  `listObjectMedia` record) via `buildRenderContext`. The renderer never
  selects media itself.
- **B5 (G9 copy table):** all default section headings, claim labels, and CTA
  headings moved to `src/fyd/copy/defaults.ts`. Renderer resolution rule:
  `presentation.heading ?? copyFor(archetype, sectionId)`; owner overrides keep
  G8 precedence. A new archetype entry re-voices every section with zero
  renderer edits (covered in `copy/__tests__/defaults.test.ts`).
- **B6 (G10 SocialProof):** the generator emits SocialProof only when the owner
  graph carries testimonials/reviews AND `verifyPresentationBinding` passes
  with classification "direct". Unverified or absent testimonials emit no
  section. Canonical slot: after Services. Fail-closed, covered by tests.
- **B7 (G11 honest comments):** the "dimension-vector policy (CTA boosted by
  urgency)" comment now describes the real data flow (planner urgency ->
  P8 ctaEmphasis -> CTA position/treatment). No aspirational comments remain.

## The 5 dangerous couplings (Part C)

- **DC1 (hardcoded 65-83):** deleted from the new customer surface. Remaining
  literal lives only in legacy `site-client.tsx:131` (see Known remaining
  items). Grep for "65-83" outside fixtures/tenant-data/legacy returns zero.
- **DC2 (fused demo chrome):** removed by B1. Customer deployments must not set
  `FYD_CHROME_MODE=demo` (deployment runbook item).
- **DC3 (route bypassing planner/strategy):** removed by B3; the HPP profile is
  recorded as data in `src/app/sites/happy-place/composition.ts` (historical
  order, standard CTA, null layout override, empty token overrides). The
  CLONE-PROVE re-run through the composed path is SPEC_IDENTICAL, so the route
  change is cleared (no flag needed).
- **DC4 (dead media seam):** removed by B4; the seam is populated at the server.
  HPP has no gallery-role media in its projection, so the replay shows no
  render delta; the quality features now fire for tenants that do.
- **DC5 (default voice in renderer code):** removed by B5 + P5.

## KEEP invariants

All classified KEEP mechanisms are untouched: binding verification (N6),
provenance-required digest-verified source (D1-D4), deterministic data-driven
composition (G1-G5, C1, N1), honest-empty/fail-closed discipline (N3, N14, N18,
G3/G4), motion-never-gates-content + mobile composition (N19, N21), R2 metadata
from owner title, R3 private-object stripping, R4/R5 compile + intent layering,
R6 server-side media selection, R7 validation gate, S2 nav-as-data, S3 object
overlay, S4 editor semantics (preserved inside DemoChrome), N20 character
table. The full lane test suites (1,157 tests) are green, including the
pre-existing builder (71), SiteSpec (91), renderer, generator determinism, and
strategy tests.

## Hard-law verification

- Zero customer-specific branches: grep for `siteId ==/===` and
  `tenantId ==/===` across renderer, seam, compose, copy, and chrome
  components returns zero hits.
- Zero business-name checks and zero customer-specific JSX: no new
  "happy-place"/"Happy Place" references in edited files (one pre-existing
  comment example was removed in passing). Remaining references are
  pre-existing fixtures, manifests, and tenant-data files.
- One renderer, one registry, one design system: unchanged.
- No em dashes in any new or edited file (scanned).
- No commits or pushes on main/master. No changes to the main Pig repo working
  tree (its dirty entries belong to other lanes).

## Tests

`npx tsc --noEmit`: clean. All 18 lane jest configs pass, 1,157/1,157 tests:
builder 71, sitespec 91, components 82, media 75, customize 20, archetypes 11,
proceduralize 96, compose/copy/chrome-split (DEHPP lane) 37, ask 124, boundary
6, identity 75, net 71, object 178, placement 16, spatial 30, tenant 28, ui 138,
wiring 8. New tests: 37 (composition precedence, params incl. P12/P13/P1/P2,
copy tables, generator composition incl. B3/B6, B1 chrome-split render proof).

## Known remaining items

1. Legacy `src/app/sites/_shared/site-client.tsx` still contains the hardcoded
   "(acceptance sequences 65-83)" at line 131 and the fused demo chrome. It is
   no longer on any DEHPP-path route, but the frozen
   `src/app/sites/coppersmith-plumbing/page.tsx` (another lane's active work)
   still imports it, so it was deliberately not deleted. Migrating that route
   to the new seam is that lane's decision.
2. `DemoOwnerMode` moved inside `DemoChrome` (demo-only). The frozen route
   rendered it unconditionally on the customer path; the new placement is
   stricter and matches R8's "gated/absent in production" requirement.
3. The HPP record pins the historical composition (standard CTA, null layout
   override, empty token overrides) so the golden proof holds. Tenants that
   want strategy-driven composition simply omit the record.

## Commit

Branch `fyd-dehpp`. Commit `eb28d3aa` ("DEHPP: data-plane parameterization
of the HPP route"), 18 files, +2144/-93. No push performed.
