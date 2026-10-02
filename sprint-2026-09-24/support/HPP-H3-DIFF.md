# HPP H3 vs H1 — Product-UI Diff (Read-Only Inspector 1)

**Date:** 2026-09-25 (MDT) · Night sprint support for FYD product lane
**Method:** `git archive` of both SHAs on the Pig, then tree diff. Repos not modified, no checkouts, no branch switches, ports 3100–3105 untouched.

- **H1:** `/home/nolan/projects/happy-place-platform` @ `6dd11bed` (full: `6dd11bedd5e2b945186793bc1e8d9df4fb8303d5`, committed 2026-09-16)
- **H3:** `/mnt/c/Users/nolan/CascadeProjects/happy-place-platform` @ `768ffb64` (full: `768ffb648a44207e7d16b373e192b0fa615714a1`, committed 2026-09-25 ~18:19 MDT)
- Scope filter per assignment: `website/src/components`, `website/src/config`, `website/src/app` (page composition), `website/src/app/globals.css`, SEO/JSON-LD. Ignored: `workbench/`, `admin/`, `editor/`, `api/`, `src/drive`, forensic/audit markdown, `*.backup`, oauth/drive/sharp/ceo-forensic noise.

## 1. Stat summary (product-relevant changed files)

Only **6 files** in product-UI scope differ; **zero** new product components/routes were added in H3.

| # | File | Kind of change |
|---|------|----------------|
| 1 | `website/src/components/site-header.tsx` | Minor: ThemeToggle placement |
| 2 | `website/src/app/layout.tsx` | Meaningful: default theme system→light |
| 3 | `website/src/config/brand.v1.json` | Content-data only (regeneration timestamp) |
| 4 | `website/src/config/services.v1.json` | Content-data: 3 service cardMediaId remaps + timestamp |
| 5 | `website/src/config/media.v1.json` | Content-data: +N new media entries (Drive IDs), timestamp |
| 6 | `website/src/config/projects.v1.json` | Content-data: gallery reorder/revision bumps + timestamp |

Deleted in H3 (present in H1): `website/src/config/brand.v1.main.json`, `media.v1.main.json`, `projects.v1.main.json`, `services.v1.main.json` (config consolidation; `.main.json` variants folded into the base `*.v1.json`). Also removed in H3: `website/src/lib/main-authority-loader.ts` (supporting loader for the old split).

**Unchanged in product-UI scope (verified):** `website/src/app/globals.css` (byte-identical), `site-footer.tsx`, `cta-section.tsx`, `service-card.tsx`, `estimate-wizard.tsx`, `before-after-card.tsx`, `before-after-slider.tsx`, `project-lightbox.tsx`, `project-photos.tsx`, `project-spotlight.tsx`, `featured-review.tsx`, `review-card.tsx`, `review-structured-data.tsx`, `reviews-filter.tsx`, all page routes in `src/app`. No hero-specific component file changed (hero content comes from `brand.v1.json` / `.generated/hero-projection.json`, code untouched).

## 2. Per-concern verdicts

### Site header — IGNORE (trivial)
`website/src/components/site-header.tsx`: the desktop `ThemeToggle` is now rendered unconditionally on `md+` screens; previously it only rendered when an `estimate` CTA was present. The estimate CTA link itself is unchanged (same classes, same `bg-honey` styling). Pure cosmetics; nothing to harvest for the contractor template family.

### Default theme: system → explicit light — ADOPT-worthy
`website/src/app/layout.tsx` (one hunk, two edits):
- The inline head script no longer honors `prefers-color-scheme: dark` from the OS. Dark mode activates only on explicit `localStorage` preference (`theme === 'dark'`), with an inline `P1 FIX` comment noting OS preference should not override the public site default.
- `<ThemeProvider defaultTheme="system">` → `defaultTheme="light"` (same `hpp-theme` storage key).

**Why it matters for the template family:** brand consistency. Contractor sites have curated light palettes; letting a visitor's OS flip the site into an untested dark mode silently is exactly the "IT HASN'T CHANGED" class of complaint. An explicit-light default with opt-in dark is the safer family-wide policy. Recommend adopting this as the default in the TRADESMAN template.

### Config content changes — IGNORE for the template (HPP business data)
- `brand.v1.json`: only `generatedAt` regenerated; no structural/schema change.
- `services.v1.json`: 3 `cardMediaId` remaps (decks, finish-carpentry, pergolas switched from legacy `*-hero` ids to Drive-content-hash ids) + `generatedAt`. No service schema/IA change.
- `media.v1.json`: bulk addition of new media entries (Drive-sourced images with content-hash ids, blob.vercel-storage.com variants incl. avif/webp responsive sets + blur placeholders, `lifecycleState: published`, Drive provenance blocks) + `generatedAt`. This is the media-pipeline/Drive-workbench output, not UI code.
- `projects.v1.json`: gallery orderings revised (`galleryRevision` bumps: fences-001 → 4, repairs-001 → 10, outdoor-living-001 → 6), some gallery id renames. Content curation, not template code.
- Regenerated artifacts (`.generated/hero-projection.json`, `gallery-projection.json`, `service-projection.json`, `metadata/canonical-media-graph.json`) reflect the same content churn (e.g. new `project-featured` / `project-hp00xx` nodes). Generated, not hand-written.

**No schema changes** to any `*.v1.json` in H3: the content model (version `1.0.0`, key names, nesting) is identical to H1. The config-layer pattern (config-first content, generated projections) carries over unchanged and remains valid as the template content model.

### Deleted `.main.json` config variants — NOTE (ignore for visuals)
H3 consolidated `brand/services/media/projects.v1.main.json` into the base files and removed `website/src/lib/main-authority-loader.ts`. Housekeeping; no public-UI effect.

### SEO / JSON-LD — no change
`review-structured-data.tsx` and all other structured-data surfaces are unchanged; the only `layout.tsx` edits are theme-related. No new meta/OG/JSON-LD in H3.

## 3. New components/routes added in H3

**None** in product-UI scope:
- `diff -rq` under `website/src/components` (excluding `workbench/`) shows the only H3 delta is the site-header edit above; new files there are `workbench/replacement-dialog.tsx` and `workbench/slot-gallery.tsx` (workbench UI — out of scope, ignore).
- `diff -rq` under `website/src/app` (excluding `api/`, `workbench/`, `admin/`, `editor/`) shows only the `layout.tsx` edit; zero new routes.
- New `website/src/drive/` in H3 contains only `tests/README.md` (stub); the Drive lib changes live under `website/src/lib/drive/` (oauth/discovery/auth — out of scope per instructions).

## 4. Bottom line for the contractor template family

- **ADOPT:** the explicit-light-default theme policy in `layout.tsx` (OS `prefers-color-scheme` no longer overrides the curated brand palette).
- **IGNORE everything else:** H3's 9-day delta is ~95% Drive media-workbench / oauth / CI / forensic machinery and HPP-business content churn (media assignments, gallery reorder, new project nodes). The public-facing contractor UI components, page composition, IA, design tokens (`globals.css` identical), and SEO/JSON-LD are byte-for-byte or effectively identical to H1.
- Net: the template harvest should continue targeting the H1 component/config baseline; the only H3 improvement worth porting into the family is the theme-default fix.
