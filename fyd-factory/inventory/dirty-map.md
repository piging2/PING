# Dirty-file map: 55 entries on fyd-factory (measured 2026-09-23 ~18:18 MDT)

Grouped by directory. `M` = modified tracked, `??` = untracked. mtimes in Pig local time.

## Root (4)
- `M package.json` (2026-09-22 12:02)
- `?? .github/` (2026-09-22 07:24) — new dir
- `?? geometry-regression.mjs` (2026-09-22 14:06)
- `?? scripts/test-circle-reset.ts` (2026-09-22 12:05)

## src/app (8)
- `M src/app/build/[siteId]/page.tsx` (2026-09-22 18:58)
- `M src/app/o/[objectId]/page.tsx` (2026-09-23 16:24)
- `?? src/app/objects/` (2026-09-22 11:27) — new dir
- `M src/app/page.tsx` (2026-09-23 15:20)
- `M src/app/portal-rail/rail-client.tsx` (2026-09-22 11:51)
- `M src/app/sites/_shared/site-client.tsx` (2026-09-23 18:03)
- `M src/app/sites/coppersmith-plumbing/page.tsx` (2026-09-23 16:21)
- `M src/app/sites/happy-place/page.tsx` (2026-09-23 16:21)
- `M src/middleware.ts` (2026-09-23 16:19)

## src/fyd/builder (7) — strategy/dogfood lane, all 2026-09-22 17:13-17:23
- `M src/fyd/builder/owner-intent.ts`, `M src/fyd/builder/site-vectors.ts`
- `?? src/fyd/builder/infer-strategy.ts`, `?? src/fyd/builder/strategies.ts`, `?? src/fyd/builder/strategy-for-site.ts`
- `?? src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts`, `?? src/fyd/builder/__tests__/ping-fyd-error-gate.test.ts`, `?? src/fyd/builder/__tests__/strategies.test.ts`

## src/fyd/components (5) — all 2026-09-23 16:19-18:03, HOTTEST lane
- `M src/fyd/components/fyd-motion-fallback.tsx`, `M src/fyd/components/object-affordance.tsx`, `M src/fyd/components/renderer.tsx`
- `?? src/fyd/components/object-overlay.tsx`
- `?? src/fyd/components/__tests__/mobile-visibility.test.ts`, `?? src/fyd/components/__tests__/ping-fyd-dogfood.test.ts`

## src/fyd/object (6) — object lane, all 2026-09-23 16:19-16:25, HOT
- `M src/fyd/object/card.tsx`, `M src/fyd/object/evidence-chrome.tsx`, `M src/fyd/object/node.tsx`, `M src/fyd/object/types.ts`, `M src/fyd/object/view.ts`
- `M src/fyd/object/__tests__/view.test.ts`

## src/fyd/ui (12) — largest cluster; object-layer + spatial subdirs
- `M src/fyd/ui/portal-circle.tsx` (09-22 12:08), `M src/fyd/ui/portal-host.tsx` (09-22 11:58)
- `?? src/fyd/ui/follow-button.tsx`, `?? src/fyd/ui/like-button.tsx` (09-23 16:24), `?? src/fyd/ui/reference-button.tsx` (09-23 16:19)
- `?? src/fyd/ui/global-ask-dock.tsx` (09-22 11:55), `?? src/fyd/ui/home-circles.tsx` (09-22 11:55), `?? src/fyd/ui/identity-object.tsx` (09-22 11:02)
- `?? src/fyd/ui/object-layer/MarginObjectLayer.tsx` (09-23 16:13), `?? src/fyd/ui/object-layer/MobileSheet.tsx` (09-22 18:23), `?? src/fyd/ui/object-layer/placement.ts` (09-22 18:02)
- `?? src/fyd/ui/spatial/` (09-22 11:30) — new dir
- `?? src/fyd/ui/__tests__/card-placement.test.tsx` (09-22 17:49), `circle-progressive.test.tsx` (09-22 18:26), `expansion.test.ts` (09-22 15:29), `placement.test.ts` (09-22 14:37), `star-layout.test.ts` (09-22 15:29)

## src/fyd/media, preview, spatial (4)
- `?? src/fyd/media/manifests/ping-fyd.json` (09-22 17:21)
- `M src/fyd/preview/pipeline.ts` (09-22 13:46)
- `?? src/fyd/spatial/object-space.ts` (09-22 11:27), `?? src/fyd/spatial/__tests__/object-space.test.ts` (09-22 11:28)

## src/fyd root (1)
- `?? src/fyd/jest.config.cjs` (09-22 13:51)

## Collision guidance for the 19 lanes

1. **Do not touch without coordinating with the active lane:** `src/fyd/object/*` (types.ts, view.ts, card.tsx, node.tsx, evidence-chrome.tsx), `src/fyd/components/renderer.tsx` + `fyd-motion-fallback.tsx` + `object-overlay.tsx` + `object-affordance.tsx`, `src/fyd/ui/object-layer/*`, `src/app/sites/*` routes, `src/app/o/[objectId]/page.tsx`, `src/middleware.ts` — all edited within the last 2 hours (16:19-18:03 MDT today).
2. **Strategy lane owns:** `src/fyd/builder/{strategies,infer-strategy,strategy-for-site,site-vectors,owner-intent}.ts` + `__tests__/{strategies,ping-fyd-dogfood-render,ping-fyd-error-gate}.test.ts` (2026-09-22 17:13-17:23 cluster; also `src/fyd/media/manifests/ping-fyd.json` from the same dogfood session).
3. **New surface areas (untracked, likely in-progress lanes):** `src/app/objects/`, `src/fyd/ui/spatial/`, `.github/`, `src/fyd/jest.config.cjs` (builder-lane scoped config), `scripts/test-circle-reset.ts`, `geometry-regression.mjs`.
4. **Stable / safe to build against:** `src/fyd/sitespec/*`, `src/fyd/claim/*`, `src/fyd/customize/*`, `src/fyd/ask/*`, `src/fyd/boundary/*`, `src/fyd/tenant/*`, `src/fyd/media/*` (code, not the ping-fyd manifest), `src/fyd/proceduralize/*`, `src/fyd/archetypes/*` — no dirty entries.
