# TRADESMAN + DEHPP Deep Inspection for Family Convergence

- Date: 2026-09-25 ~20:40 MDT. Inspector: read-only support agent.
- TRADESMAN source: Pig `/home/nolan/build-template1` @ `e4819ce8`, branch `fyd/template-001-hpp-clone` (HEAD verified). Read read-only over the existing Pig SSH chain. No files on this VM; nothing modified, checked out, built, or pushed. Ports 3100-3105 and `worktrees/copper-v2` untouched.
- DEHPP source: Pig `/home/nolan/fyd-dehpp-wt` @ `eb28d3aa` (HEAD verified), plus the build spec at `~/workspace/fyd-factory/dehpp/parameterization-spec.md`.
- Prior art consulted: `support/HPP-ARCHAEOLOGY-MAP.md` section 1c (TRADESMAN summary), `convergence/CONVERGENCE_MATRIX.md` premise. This report is the per-artifact deep read.

Verdict key: **ADOPT** = take the pattern as-is. **ADAPT** = right idea, needs object-driven rework (rework named). **REJECT** = do not harvest (reason named).

## 0. The convergence picture

TRADESMAN's 11 sections map ~1:1 onto builder-v1's 11 family components
(Header<->Navigation, Hero<->Hero, TrustStrip<->TrustBar, Services<->ServiceGrid,
Showcase<->ProjectGallery, Story<->BusinessStory, Reviews<->(SocialProof slot),
CtaBand<->ContactCTA, Footer<->Footer, Products<->FeaturedService, +Ask<->AskFYD;
Newsletter has no builder-v1 counterpart). The convergence is real: TRADESMAN
supplies presentation craft and the fail-closed prop-contract discipline;
builder-v1 supplies the registry authority, surface separation
(`surfaces.tsx`), and the planner-driven composition the family must serve.
Do not fork a third family; TRADESMAN sections should become presentation
variants behind builder-v1's `registry.tsx`.

---

## 1. TRADESMAN per-artifact classification

### Sections

| Artifact | Verdict | Rationale | File |
|---|---|---|---|
| `sections/TmHero.tsx` | **ADAPT** | Composition is right (drift photo, dual CTA, in-hero stat strip); rework: heroStats must carry evidence grades like TmStat, media must come through the B4 media seam not binding-local paths, drop the blanket `unoptimized` image flag. | `src/fyd/tradesman/sections/TmHero.tsx` |
| `sections/TmServices.tsx` | **ADAPT** | The grouped guard is the pattern to keep: `groups` preserves service hierarchy instead of flattening, priority sort (emergency>featured>standard), no dead links. Rework: card copy default "Start a quote" is hardcoded English in the template; move to the DEHPP P5 copy table, and cards must be built from Service objects via the adapter, not hand TmService. | `src/fyd/tradesman/sections/TmServices.tsx` |
| `sections/TmTrustStrip.tsx` | **ADAPT** | Per-stat `TmProvenance` wired to TmWhyThis is the provenance pattern. Rework: stat values are ungraded strings; in the family they must be binding-verified facts (DEHPP N6) before they reach props. | `src/fyd/tradesman/sections/TmTrustStrip.tsx` |
| `sections/TmShowcase.tsx` | **ADAPT** | Bento grid with 2x2 featured tile and imageless tiles skipped (honest-empty) is right. Rework: `slice(0,4)` tile cap is a hardcoded composition value; make it a profile parameter. Badge/blurb strings need binding verification. | `src/fyd/tradesman/sections/TmShowcase.tsx` |
| `sections/TmStory.tsx` | **ADAPT** | Provenance slot on the eyebrow + photos-not-required people rendering is good. Rework: the curved wave divider is HPP-flavored decor; demote to a preset-level decor option, not core. Story paragraphs must be binding-verified. | `src/fyd/tradesman/sections/TmStory.tsx` |
| `sections/TmReviews.tsx` | **ADOPT** | This is the evidence-gating discipline builder-v1 needs: empty reviews render the honest placeholder, never invented testimonials; stars only when a rating exists. It is the DEHPP B6/N14 gate made visible. Keep as the SocialProof presentation target. | `src/fyd/tradesman/sections/TmReviews.tsx` |
| `sections/TmHeader.tsx` | **ADAPT** | Sticky header, scrollspy active state, accessible mobile menu are solid. Rework: the decorative Moon theme glyph renders with no handler (dead icon); remove unless functional. Nav anchors default to `#services`-style SPA anchors; nav must come from graph-derived labels (DEHPP P9), not `#`-href defaults. | `src/fyd/tradesman/sections/TmHeader.tsx` |
| `sections/TmFooter.tsx` | **ADAPT** | 4-column chrome, `tel:` normalization, license/proof lines are right. Rework: the provenance footer sentence should use the DEHPP P12 `provenanceTemplate` mechanism rather than hand `bottomLine` strings. | `src/fyd/tradesman/sections/TmFooter.tsx` |
| `sections/TmCtaBand.tsx` | **ADAPT** | Capability-gated CTA ("any evidenced capability renders it, otherwise omit") is the correct fail-closed pattern and matches builder-v1's capability-driven ContactCTA. Rework: capabilities are bare booleans; wire to evidence-graded capability records. Copy (title/subtitle) belongs in the P7 copy table. | `src/fyd/tradesman/sections/TmCtaBand.tsx` |
| `sections/TmProducts.tsx` | **ADAPT** | Right scope: installs/brands rendered only from binding evidence, whole section nulls when absent. Rework: hand-props must be replaced by object-driven binding from installable-product objects. | `src/fyd/tradesman/sections/TmProducts.tsx` |
| `sections/TmNewsletter.tsx` | **REJECT** | Strictly capability-gated and well built, but a newsletter signup is filler for the contractor family; it has no builder-v1 counterpart and the convergence should not resurrect filler sections. Suppress per the archaeology pre-classification. | `src/fyd/tradesman/sections/TmNewsletter.tsx` |

### Core primitives

| Artifact | Verdict | Rationale | File |
|---|---|---|---|
| `why-this.tsx` | **ADOPT** | The quiet WHY THIS primitive the lane asked for: 24-line inline `(why this?)` marker fed by `TmProvenance{source, observedAt}`, non-selling, progressive disclosure via title tooltip. Adopt as the inline anchor; pair it with the existing N10 media drill-downs for the deep view. | `src/fyd/tradesman/why-this.tsx` |
| `types.ts` | **ADAPT** | Prop contracts are clean: TmImage/TmCta/TmNavItem/TmService(+TmServiceGroup)/TmProject/TmPerson/TmReview/TmProvenance/TmBusiness/TmCapabilities. Rework: claims and capability flags must carry evidence grades (borrow the fixture's PROVEN/DERIVED/UNKNOWN vocabulary as a data-model input). | `src/fyd/tradesman/types.ts` |
| `decor.tsx` | **ADAPT** | Split it: neutral layout primitives (TmContainer, TmSection, TmSectionHeading, TmStarRating) adopt into family core; craft decor (TmCedarCorner, TmToolMark, TmGoldScript, TmPencilLine, TmBlueprintGrid, TmCraftDivider) is WARM-CRAFT flavor and belongs in a preset decor pack, not core. | `src/fyd/tradesman/decor.tsx` |
| `motion.tsx` | **ADAPT** | The fail-safe grammar is right: hidden state keeps opacity 1 so failed animation can never blank content (matches DEHPP N19), respects prefers-reduced-motion, no scroll hijack. Rework: it imports framer-motion; adopt the VALUES (ease `[0.22,1,0.36,1]`, durations, 4 variants) into the family's motion system regardless of implementation. | `src/fyd/tradesman/motion.tsx` |
| `tm-tokens.css` | **ADAPT** | vs the DTCG token compiler (builder-v1 @ `77910b91`): **the DTCG compiler wins as the authority** (it is the deterministic, owner-editable token mechanism). WARM-CRAFT survives as its first real preset DATA: the role-named token set (action/brand/ink/band-1..6 scales) and the `tm-` scoping convention map onto DTCG namespacing. Do not keep two token systems. | `src/fyd/tradesman/tm-tokens.css` |
| `index.ts` | **ADOPT** | Clean barrel; type re-exports keep the contract discoverable. Keep the shape for the converged family entry. | `src/fyd/tradesman/index.ts` |

### Bindings layer (the object->props seam)

| Artifact | Verdict | Rationale | File |
|---|---|---|---|
| `bindings/types.ts` (TmSiteBinding) | **ADOPT** | The contract pattern is the harvest: one site binding object, prop types imported directly from the section modules so the contract can never drift from the template, nullable sections (`showcase`, `products`, `newsletter`) for honest-empty, `evidenceFixture`/`evidenceObservedAt` pins. This is what the builder-v1 adapter should generate into. | `src/fyd/tradesman/bindings/types.ts` |
| `bindings/adapter.tsx` | **ADOPT** | Fail-closed seam invariants: invalid spec renders findings instead of a page (R7), binding identity must match siteId (D4). Only siteId crosses the client boundary. Lift verbatim into the family's render seam. | `src/fyd/tradesman/bindings/adapter.tsx` |
| `bindings/homepage.tsx` | **ADOPT** | One shared composer: binding decides which nullable sections render, anchor wrappers, Ask section wrapping the existing evidence-bounded widget with a theme override. This is the precedent for composing the converged family from a binding. | `src/fyd/tradesman/bindings/homepage.tsx` |
| `bindings/newsletter-slot.tsx` | **REJECT** | Exists only to serve the rejected TmNewsletter. Do not carry forward. | `src/fyd/tradesman/bindings/newsletter-slot.tsx` |
| `bindings/happy-place.ts` | **REJECT** | Hand-authored binding over a hand fixture, not a graph; service images keyed by machine ids in a hand map, presentation copy baked in code. Reject the artifact; the TmSiteBinding contract it satisfies is the thing that survives. | `src/fyd/tradesman/bindings/happy-place.ts` |
| `bindings/coppersmith.ts` | **REJECT** | Same reason, plus hand strings (phone constants, hours) that should be graph facts. Its redeeming quality is the meticulous per-field provenance/caveat comments (emergency_call caveat, years-conflict handling, intentional omissions); adopt that EVIDENCE DISCIPLINE as the binding-authoring standard, not the artifact. | `src/fyd/tradesman/bindings/coppersmith.ts` |
| `fixtures/happy-place-services.ts` | **REJECT** | Hand fixture (explicitly re-emitted in-lane), not a real graph. Must be replaced by live graph bindings. | `src/fyd/tradesman/fixtures/happy-place-services.ts` |
| `fixtures/coppersmith-graph.ts` | **REJECT** | Hand fixture with paths into /tmp; not a real graph. Salvage only the PROVEN/DERIVED/GENERATED_PRESENTATION/UNKNOWN grade vocabulary as input to the evidence-grade data model. | `src/fyd/tradesman/fixtures/coppersmith-graph.ts` |

### Gap: no `__tests__` in TRADESMAN

A `find` over `src/fyd/tradesman` returned zero test files. The family ships
11 sections and a binding contract with no tests; builder-v1's `__tests__` must
be extended to cover every adopted TRADESMAN pattern (evidence gating, grouped
guard, capability gating, adapter fail-closed) before convergence lands.

---

## 2. DEHPP classification (eb28d3aa, "DEHPP: data-plane parameterization of the HPP route")

The commit implements `dehpp/parameterization-spec.md`: 13 typed parameters
(P1-P13), 7 replacement mechanisms (B1-B7), 5 dangerous couplings removed
(DC1-DC5). 18 files, +2144/-93, 1157/1157 tests green at commit time.

### ADOPT (the parameterization grammar the converged family must consume)

- **Deployment params (P1/P2/P12/P13) in `src/fyd/compose/params.ts`**: tenantId
  fail-closed validation (D4), chromeMode (customer default), provenance
  sentence template with {brand}/{ingestionMethod}/{eventRange} slots and
  honest omission when data is absent, SEO brand from env. Adopt as seam
  inputs for every family render.
- **Composition profile (`src/fyd/compose/profile.ts`)**: `SiteCompositionProfile`
  (section order, page order, ctaEmphasis, layoutCharacter, themeTokenOverrides)
  with precedence live-owner-intent > tenant record > strategy output. Adopt as
  the single composition authority; TRADESMAN's hardcoded orders, the
  `slice(0,4)` cap, and eyebrow defaults all become profile/copy-table data.
- **Copy tables (`src/fyd/copy/defaults.ts`, B5/P5)**: renderer voice moved out
  of code into per-archetype data tables; owner intent always wins. Adopt as
  the home for every TRADESMAN hardcoded English string ("What we do",
  "Start a quote", empty-review copy, CTA headings).
- **Server seam (`src/app/sites/_shared/compose-site.ts`, B3)**: the 7-step
  pipeline (validate tenant -> graph -> profile -> generate -> intent ->
  media seam -> validate). Adopt as the pipeline the family's binding adapter
  plugs into; `adaptTradesmanBinding` becomes step 7's gate.
- **Media seam (B4)**: hero/gallery/object media resolved once at the server
  seam; renderer never selects media. Adopt; this is what replaces
  TRADESMAN's binding-local media maps and the `unoptimized` workaround.
- **SocialProof gate (B6/N14)**: emission requires a verified
  reviews/testimonials binding; rendering requires the binding to verify at
  render time. Adopt; TmReviews is its presentation target.
- **Chrome split (B1)**: CustomerSite vs DemoChrome behind P2. Already
  standing policy; note it confirms TRADESMAN sections must never carry demo
  chrome (they currently don't).
- **Dangerous-coupling discipline (DC1-DC5)**: adopt the removal-proof
  convention (grep-zero proofs, fixture-tenant render proofs) for the
  convergence work itself.

### ADAPT

- **HPP composition record (`src/app/sites/happy-place/composition.ts`)**:
  the "composition as typed data" precedent is right, but the artifact pins the
  OLD renderer order; when the family converges, each tenant record must pin
  the converged family's section ids, not the legacy list. Rework the records,
  not the mechanism.

### REJECT / flags (not harvest, or caution)

- **Do not harvest the legacy section order values** (`DEFAULT_HOME_SECTION_ORDER`
  with "Hero, BusinessSummary, Services, Products, SocialProof, Locations,
  People, RecentObjects, Contact, Links, CTA, AskFYD, ObjectRail"): they
  describe the old generator, not the converged family. Re-derive order for
  the one family.
- **Classification count mismatch (spec Part E, gap 1)**: the spec claims 54
  mechanisms but the classification doc literally contains 62 rows. Open
  question for the lane; the KEEP assertions (Part D) are the real contract,
  adopt those as the test bar.
- **GOLDEN-REFERENCE.md missing (spec Part E, gap 5)**: DEHPP's own B3 route
  recomposition sits behind a flag until CLONE-PROVE re-runs on the composed
  path. The convergence must not depend on unproven DEHPP behavior; treat B3
  as mechanism-proven, path-unproven.
- **N16 "this business" fallback**: flagged in the spec as hardcoded honest
  English copy; do not copy it into family components, route it through the
  P5 table when voice work happens.

---

## 3. Special attention items (from task)

- **(a) why-this.tsx**: ADOPT. It is the quiet WHY THIS primitive: inline,
  evidence-fed (`source`, `observedAt`), non-selling, never a claim by itself.
  In the converged family it becomes the inline anchor on graded stats and
  story claims, with the existing N10 media drill-downs and Ask FYD as the
  deep provenance surfaces.
- **(b) bindings adapter pattern**: ADOPT the three-part shape:
  (1) `TmSiteBinding` contract with prop types imported from section modules
  (no drift), (2) `adaptTradesmanBinding` fail-closed gate (renderable +
  siteId identity), (3) `TmHomepage` shared composer. Rework: bindings must be
  generated from real object graphs with evidence grades, not hand fixtures.
- **(c) WARM-CRAFT vs DTCG compiler**: DTCG compiler wins as the authority;
  WARM-CRAFT wins as the first preset's data. Feed the WARM-CRAFT role tokens
  through the DTCG compiler as the contractor preset; keep the `tm-` scoping
  convention as namespace discipline. One token system, not two.
- **(d) TmServices grouped guard**: ADOPT as the canonical pattern for
  hierarchy-preserving service rendering (groups render with titles +
  descriptions, priority sort inside each group, flat list as fallback).
  The builder-v1 ServiceGrid should absorb it; never flatten parent/child
  service hierarchies in the binding.
- **(e) Duplication of builder-v1's 11 components**: confirmed ~1:1.
  Resolution: one family. TRADESMAN sections become the presentation variants
  registered in builder-v1's `registry.tsx`; `surfaces.tsx` separation and
  the deterministic planner stay authoritative. Kill the Tm* namespace in the
  converged tree (or keep as the WARM-CRAFT variant name); do not maintain two
  Hero/ServiceGrid/Footer implementations.

## 4. Recommended harvest order for the lane

1. `bindings/types.ts` + `bindings/adapter.tsx` + `bindings/homepage.tsx`
   (the seam contract and fail-closed gate) — ADOPT first; everything else
   hangs off it.
2. `sections/TmReviews.tsx` + `why-this.tsx` (evidence-gating + quiet
   provenance) — ADOPT; they satisfy B6/N14 and the provenance directive.
3. `sections/TmServices.tsx` grouped guard + priority sort — ADAPT into
   ServiceGrid.
4. `tm-tokens.css` as DTCG preset data + `decor.tsx` split (neutral core vs
   craft decor pack) + `motion.tsx` values — ADAPT.
5. Remaining sections one by one as registry variants — ADAPT, with hardcoded
   English voice moved to `src/fyd/copy/defaults.ts` (P5) at adoption time.
6. REJECT: TmNewsletter, newsletter-slot, both hand bindings, both fixtures.
   Replace fixtures with live graph bindings before any convergence commit.

---

## Appendix: verification of read scope

- TRADESMAN files read: `sections/` (TmHeader, TmHero, TmTrustStrip,
  TmServices, TmShowcase, TmStory, TmReviews, TmNewsletter, TmCtaBand,
  TmFooter, TmProducts — all 11), `tm-tokens.css` (full, 256 lines),
  `types.ts` (full), `why-this.tsx` (full, 24 lines), `decor.tsx` (full),
  `motion.tsx` (full), `index.ts` (full), `bindings/` (types.ts, adapter.tsx,
  homepage.tsx, newsletter-slot.tsx wc'd, happy-place.ts full,
  coppersmith.ts head-120), `fixtures/` (both headers + line counts; both
  flagged hand fixtures). No `__tests__` exist in the family.
- DEHPP read: `git show --stat` of eb28d3aa (18 files), `src/fyd/compose/params.ts`
  (full), `src/fyd/compose/profile.ts` (head-120), `src/fyd/copy/defaults.ts`
  (head-50), `src/app/sites/_shared/compose-site.ts` (head-70),
  `src/app/sites/happy-place/composition.ts` (full), and the full
  `dehpp/parameterization-spec.md` (13 params, 7 mechanisms, 5 couplings,
  KEEP assertions, open gaps).
- Environment note: the task's `/home/nolan/...` paths live on the Pig, not
  on this sandbox; they were read read-only through the existing Pig SSH
  chain. Read-only constraint honored: no checkouts, builds, writes, or
  pushes anywhere; no ports touched; `worktrees/copper-v2` not entered.
