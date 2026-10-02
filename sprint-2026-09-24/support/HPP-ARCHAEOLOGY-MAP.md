# HPP ARCHAEOLOGY MAP — read-only support inventory

Lane A, read-only. Written 2026-09-25 ~20:35 MDT. No code changed, no checkouts
performed, no servers touched, no builds run. All findings are evidence (paths,
SHAs, file lists). What the main lane should do with this is the main lane's call.

## 1. Every repo / branch / worktree found

### 1a. HPP platform source checkouts (the actual product to harvest)

| # | Path | SHA | Branch | Last commit | Notes |
|---|------|-----|--------|-------------|-------|
| H1 | `/home/nolan/projects/happy-place-platform` | `6dd11bedd5e2b945186793bc1e8d9df4fb8303d5` | `devin/hpp-ping-boundary` | 2026-09-16 "HPP PING boundary: fail-closed KV, atomic append, kit dedupe, await fixes" | Primary WSL checkout. Full website/ tree. |
| H2 | `/home/nolan/projects/happy-place-platform-forensic` | `7569bb44d0a4dc9e1123b75b5b0def43a1005159` | `main` | 2026-08-22 "fix(auth): critical bugs per CEO forensic audit" | Older forensic snapshot; do not harvest UI from this, audit history only. |
| H3 | `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform` | `768ffb648a44207e7d16b373e192b0fa615714a1` | (detached/unknown) | 2026-09-25 18:19 "feat(workbench): add Delete Selected button for pending deployments" | **Newest HPP commit found** (newer than H1 by 9 days). Windows-side checkout. Check product UI diffs here before finalizing the family. |
| H4 | `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform-forensic` | `7569bb44d0a4dc9e1123b75b5b0def43a1005159` | — | same as H2 | Duplicate of H2. Dedupe; do not treat as independent. |
| H5 | `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform-main` | — | — | not a git repo | Docs only (DEPLOYMENT*.md, HPP_BLOG_HARVEST_GUIDE.md, HPP_EVENT_SCHEMA.md, HPP_GITHUB_HARVEST.md). No source. |
| H6 | `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform-hermes` | — | — | not a git repo | Docs only (same family + CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md). No source. |
| H7 | `/home/nolan/fyd-b-work/pipeline/raw/happy-place-platform` | — | — | not a git repo | Contains only `index.html` (raw scrape). Evidence of source page, not a working tree. |
| H8 | `/mnt/c/Users/nolan/.cursor/projects/c-Users-nolan-CascadeProjects-happy-place-platform` | — | — | — | Cursor IDE project metadata, not source. Ignore. |

Discrepancy to note: the night directive described the HPP repo as Next.js 16 / React 19.
`website/package.json` in H1 actually pins `"next": "15.5.24"`, `"react": "^18.3.1"`.
Verify before citing versions anywhere.

### 1b. HPP platform internal structure (from H1, the primary checkout)

`website/src/` layout:
- `config/` — **config-first content**: `brand.v1.json`, `cities.v1.json`, `company.v1.json`,
  `faq.v1.json`, `gallery-presets.v1.json`, `infrastructure-flags.ts`, `manifest.v1.json`,
  `materials.v1.json`, `media.v1.json` (+ `.backup`, `.backup.2026-09-10T00-54-31-724Z`),
  `media.v1.main.json`, `navigation.v1.json`, `oauth.v1.json`, `projects.v1.json`
  (+ backup, `.main.json`), `reviews.v1.json`, `seo.ts`, `services.v1.json`
  (+ `.main.json`), `ui-flags.ts`, `workbench-ordering.v1.json`, `before-after.v1.json`.
  All `*.v1.json` follow `{version, generatedAt, <payload>}` envelope.
- `types/` — **stable domain types**: `before-after.ts`, `brand.ts`, `company.ts`, `events.ts`,
  `faq.ts`, `index.ts`, `media.ts`, `navigation.ts`, `oauth.ts`, `projections.ts`,
  `projects.ts`, `registries.ts`, `reviews.ts`.
- `services/` — **service interfaces as swap points**: `analytics.ts`, `company.ts`,
  `estimate.ts`, `notification.ts`, `projectProvider.ts`, `storage.ts`.
- `components/` (product-relevant subset): `site-header.tsx` (167 lines),
  `site-footer.tsx` (88), `service-card.tsx` (104), `cta-section.tsx`,
  `estimate-wizard.tsx` (1026 lines, client component), `project-lightbox.tsx`,
  `project-spotlight.tsx`, `project-photos.tsx`, `before-after-card.tsx`,
  `before-after-slider.tsx`, `reviews-filter.tsx`, `reviews-filter-client.tsx`,
  `review-card.tsx`, `featured-review.tsx`, `review-structured-data.tsx`,
  `star-rating.tsx`, `tracked-contact.tsx`, `tape-measure-nav.tsx`,
  `newsletter-signup.tsx`, `scroll-reveal.tsx`, `parallax-image.tsx`,
  `photo-mount.tsx`, `job-timeline.tsx`, `scheduling-question-reveal.tsx`,
  `resource-download-gate.tsx`, `happy-brand-signature.tsx`.
  (Also `editor/` and `workbench/` subdirs — owner tooling, not visitor surface.)
- `app/` routes: `about`, `blog`, `contact`, `estimate`, `faq`, `our-work`, `projects`,
  `review`, `reviews`, `services`, `workbench`, `admin`, `api`, `newsletter`, `privacy`
  + `layout.tsx`, `page.tsx`, `globals.css` (820 lines), `robots.ts`, `sitemap.ts`.
- Estimate funnel (full): `components/estimate-wizard.tsx` → `lib/estimate-engine.ts` →
  `services/estimate.ts` → `app/estimate/` + `app/api/estimate/`; wizard state autosave
  via `lib/wizard-persistence.ts` (draft save/load/clear, submission-integrity
  validation); planning ranges via `lib/planning-range.ts`; intake records via
  `objects/estimate/` + `generated/projections/EstimateProjection.ts` +
  `generated/repositories/EstimateRepository.ts`.
- SEO/JSON-LD: `config/seo.ts` (site defaults: siteUrl happyplacecarpentry.com,
  title, description with CCB# 254240, keywords, ogImage fallback, twitter),
  `app/layout.tsx` (LocalBusiness `application/ld+json`),
  `components/review-structured-data.tsx`.
- Navigation config: `config/navigation.v1.json` =
  Home / Services / Our Work / About / Reviews / **Get an Estimate** (CTA as nav item).
- Responsive/accessibility: 820-line `globals.css`, Tailwind `md:`/`lg:` breakpoints,
  `lenis-provider.tsx` (smooth scroll), `motion-provider.tsx`, `scroll-reveal.tsx`,
  `theme-provider.tsx`, skip/error boundaries (`component-error-boundary.tsx`).
- Repo-root noise: ~90 audit/forensic markdown reports (CEO_FORENSIC_AUDIT_REPORT.md,
  SHARP_*.md, DRIVE_*.md, etc.). Historical value only; not product.

### 1c. TRADESMAN template family (Codex, fyd/template-001-hpp-clone)

- Worktree: `/home/nolan/build-template1` @ `e4819ce8`, branch `fyd/template-001-hpp-clone`.
- Family root: `src/fyd/tradesman/`
  - `sections/`: `TmHeader.tsx`, `TmHero.tsx`, `TmTrustStrip.tsx`, `TmServices.tsx`,
    `TmShowcase.tsx`, `TmStory.tsx`, `TmReviews.tsx`, `TmNewsletter.tsx`,
    `TmCtaBand.tsx`, `TmFooter.tsx`, `TmProducts.tsx` (11 prop-driven sections)
  - `tm-tokens.css` (256 lines, WARM-CRAFT preset), `types.ts` (149), `decor.tsx` (253),
    `motion.tsx` (91), `why-this.tsx` (24), `index.ts` (36)
  - `bindings/`: `adapter.tsx`, `homepage.tsx`, `types.ts`, `newsletter-slot.tsx`,
    `happy-place.ts`, `coppersmith.ts`
  - `fixtures/`: `happy-place-services.ts`, `coppersmith-graph.ts`
- Media: `public/t1-media/happy-place/` — 10 assets
  (`FENCE BUILD-1080.webp`, `HOMESERVICEPROJECTPERGOLAS-1080.webp`,
  `HP007_SidingRotRepair_After.jpeg`, `HP011_SubfloorReplacement_After.jpg`,
  `HP016_ExteriorPainting_HouseRefresh_Before.jpg`, `IMG_0535-480.webp`,
  `TRIMREPAIR-1080.webp`, `hero-background-enhanced.jpg`, …).
- Research: `research/homepage-harvest/` — `PING_HOMEPAGE_HARVEST.md`,
  `PING_HOMEPAGE_REDESIGN_PLAN.md`; `research/website-truth-matrix.md`.
- Branch log highlights: `0882471f` "tradesman: finished BINDING lane for happy-place
  and coppersmith-plumbing", `a28e3e8b` "tradesman: add WARM-CRAFT presentation system",
  `6b3fb892` "template001: HPP + Coppersmith media with provenance manifest",
  `e4819ce8` "fix: critics blockers - TmServices grouped guard, HPP story
  de-invented, token comment de-identified".

### 1d. builder-v1 family (main lane's current track — READ ONLY, do not disturb)

- Branch: `fyd/builder-rebuild-v1` (commits visible from `/home/nolan/projects/ping`).
- Commits: `ee3091cb` "deterministic catalog-driven planner replacing fixed homePage()
  template", `77910b91` "additive intent-only SiteSpec extension + DTCG token compiler",
  `424cf9fd` "presentation observations + deterministic media scoring",
  `11b3f0d3` "11-component family + surface separation + deletion list",
  `8019f21e` "Coppersmith family generation at /sites/coppersmith-plumbing/v2".
- Family lives at `fyd-product-lane/src/fyd/family/` inside worktree
  `/home/nolan/worktrees/copper-v2` (the :3105 worktree — listed only, not touched).
- 11 components: `AskFYD`, `BusinessStory`, `ContactCTA`, `FeaturedService`, `Footer`,
  `Hero`, `Navigation`, `ProjectGallery`, `ServiceArea`, `ServiceGrid`, `TrustBar`
  (+ `family-page.tsx`, `registry.tsx`, `surfaces.tsx` = visitor/owner/engineering
  surface separation, `shared.tsx`, `types.ts`, `family.css`, `__tests__/`).

### 1e. Other relevant branches / worktrees (ping repo, `/home/nolan/projects/ping` @ `c93a7ced`)

- `fyd-dehpp` — worktree `/home/nolan/fyd-dehpp-wt` @ `eb28d3aa`
  "DEHPP: data-plane parameterization of the HPP route". Directly relevant to
  template parameterization; inspect read-only.
- `fyd/builder-composition`, `fyd/sitespec-generator`, `copilot/authority-ux` —
  adjacent prior art, not inventoried in depth.
- Main checkout has untracked build/media artifacts (`public/fyd-media/<hash>/` ×9,
  `src/fyd/media/manifests/{happy-place-live,coppersmith-plumbing-live}.json`) —
  evidence of the media-derivative pipeline; do not treat as canonical source.
- Ports 3100–3105 worktrees (`build-edge-port` @ `8faf96d0`, `worktrees/copper-v2` @
  `c03bc145`, `worktrees/fyd-privacy-p0`) were listed only, never entered.

### 1f. Canonical harvest artifacts (already exist — per batch-3 answer 13, use these)

- `~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md`
- `~/workspace/sprint-2026-09-24/HARVEST-REGISTER-2026-09-25.md`
  (read-only Track G register; disposition model: USE NOW / PRESERVE SEAM / etc.)
- `~/workspace/sprint-2026-09-24/FYD-PRODUCT-SURFACE-DIRECTIVE-2026-09-25.md`
  (visitor/owner/engineering surface separation directive)
- `~/workspace/sprint-2026-09-24/fyd-presentation-hold-2026-09-25.md`
- `~/workspace/sprint-2026-09-24/convergence/FRONTEND_INVENTORY.md`

---

## 2. Per-surface pre-classification (ADOPT / ADAPT / REJECT)

Pre-classification only. Main lane decides.

**ADOPT (harvest the pattern directly):**
- HPP `config/*.v1.json` envelope `{version, generatedAt, payload}` → the template's
  domain-config contract. Services, navigation, projects, reviews, media, FAQ, cities.
- HPP `types/*.ts` → stable domain types for the contractor template's binding layer.
- HPP `config/seo.ts` defaults + `app/layout.tsx` LocalBusiness JSON-LD +
  `review-structured-data.tsx` → SEO/structured-data pattern.
- HPP `navigation.v1.json` IA (Home / Services / Our Work / About / Reviews /
  Get an Estimate) → contractor template's nav grammar.
- Estimate funnel *question model + intake record shape*
  (`lib/estimate-engine.ts`, `objects/estimate/`, `generated/projections/EstimateProjection.ts`)
  → capability-driven "Get an Estimate" (Business + Services + estimate capability).
- `t1-media/` derivative pattern (pre-optimized local assets with provenance manifest
  `6b3fb892`) → media rights/provenance pipeline.

**ADAPT (right idea, needs object-driven rework):**
- `components/estimate-wizard.tsx` (1026 lines) → adapt: questions currently from
  hand config (`lib/registries`); template needs them from Service objects + capabilities.
- `site-header.tsx` / `site-footer.tsx` / `service-card.tsx` → adapt into prop-driven
  template components (TRADESMAN's `TmHeader`/`TmFooter`/`TmServices` already did this;
  reconcile, don't fork a third header).
- TRADESMAN 11 sections → adapt: strongest template candidate, but binding layer is
  still fixture-thin (`fixtures/coppersmith-graph.ts`); enrich object→prop bindings.
- builder-v1 11-component family → adapt/merge: same 11-section shape as TRADESMAN
  with explicit `surfaces.tsx` separation; **two families must converge to one**.
- HPP gallery stack (`project-lightbox.tsx`, `project-photos.tsx`,
  `before-after-slider.tsx`, `project-spotlight.tsx`) → adapt into one template
  `Showcase`/`ProjectGallery` with editorial layout, not evidence-attachment rendering.
- HPP review stack (`reviews-filter.tsx`, `review-card.tsx`, `featured-review.tsx`)
  → adapt with hard rule: render ONLY legitimately sourced reviews.

**REJECT (do not harvest):**
- The rejected `/sites/happy-place` generated page (the acceptance-harness page Nolan
  killed): `site record`, `website statement`, repeated Why-This chrome, raw object
  routes, E.164 duplication, `home:Hero:0` section IDs, demo-owner console.
- HPP `workbench/` + `admin/` + `editor/` components → owner tooling, not visitor surface.
- `config/oauth.v1.json` + all `DRIVE_*.md` / `SHARP_*.md` / `CEO_FORENSIC_*.md` root
  reports → internal/forensic noise, zero template value.
- `*.backup` / `*.backup.2026-09-10T00-54-31-724Z` / `*.main.json` duplicates → dedupe.
- `TmNewsletter` / `newsletter-slot.tsx` generic filler → filler sections must be
  evidence-gated, never default.
- H4/H5/H6/H8 (duplicate forensic checkout, docs-only dirs, Cursor metadata) →
  not independent sources.

---

## 3. Strongest surviving implementation per concern

| Concern | Strongest surviving implementation | Evidence |
|---------|-----------------------------------|----------|
| Hero | `TmHero.tsx` (template candidate); visual reference = original HPP hero composition | `/home/nolan/build-template1/src/fyd/tradesman/sections/TmHero.tsx`; H1 `app/page.tsx` |
| Services | `TmServices.tsx` + HPP `service-card.tsx` + `services.v1.json` config shape | tradesman sections; H1 `components/service-card.tsx` (104 lines) |
| Gallery | HPP `project-lightbox.tsx` + `project-photos.tsx` + `before-after-slider.tsx` (adapt into one template Showcase) | H1 `components/` |
| Nav | HPP `navigation.v1.json` IA + `site-header.tsx`; template = `TmHeader.tsx` | H1 config + components; tradesman sections |
| CTA | HPP `cta-section.tsx` + "Get an Estimate" as nav-level primary CTA | H1 `components/cta-section.tsx`, `config/navigation.v1.json` |
| Estimate | `estimate-wizard.tsx` (1026 lines) + `services/estimate.ts` + `lib/estimate-engine.ts` + intake record pipeline | H1 `components/`, `services/`, `lib/`, `objects/estimate/`, `generated/` |
| Tokens | `tm-tokens.css` WARM-CRAFT (256 lines); DTCG token compiler @ `77910b91` | `/home/nolan/build-template1/src/fyd/tradesman/tm-tokens.css` |
| Responsive | HPP `globals.css` (820 lines, Tailwind breakpoints); wave2 375px fixes @ `0842872e`; builder-v1 `family.css` | H1 `app/globals.css`; ping repo history |
| Trust/provenance | HPP trust signals (CCB# 254240 in `seo.ts`, service-area in company config); TRADESMAN `why-this.tsx` (24 lines, quiet) | H1 `config/seo.ts`; tradesman `why-this.tsx` |
| Object→template binding | TRADESMAN `bindings/` (`happy-place.ts`, `coppersmith.ts`, `adapter.tsx`); builder-v1 `planner.ts` catalog-driven | `/home/nolan/build-template1/src/fyd/tradesman/bindings/`; commit `ee3091cb` |
| Surface separation | builder-v1 `surfaces.tsx` (visitor/owner/engineering) | `fyd-product-lane/src/fyd/family/surfaces.tsx` @ `11b3f0d3` |

## Open seams for the main lane (observed, not directed)

1. **Two template families exist**: TRADESMAN (`build-template1`, fyd/template-001-hpp-clone)
   and builder-v1 (`fyd-product-lane/src/fyd/family`, fyd/builder-rebuild-v1). Same
   11-section shape. Convergence to one family is the highest-leverage structural move.
2. **H3 is newer than H1**: `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform`
   @ `768ffb64` (2026-09-25) vs H1 @ `6dd11bed` (2026-09-16). Diff before finalizing.
3. **Estimate wizard is the richest untapped asset**: full funnel exists in HPP
   (wizard → engine → service → API → intake record). The template currently has no
   estimate section; "Contact" ≠ "Get an Estimate" is the product gap the directive names.
4. **Binding layer is fixture-thin**: `fixtures/coppersmith-graph.ts` and
   `happy-place-services.ts` are hand fixtures. The 05:00 Coppersmith must come from
   real object graphs through the catalog-driven planner (`ee3091cb`), not fixtures.
