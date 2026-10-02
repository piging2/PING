# Render path: /sites/coppersmith-plumbing (measured 2026-09-23, branch fyd-factory)

## File order (server route -> client render)

1. `src/app/sites/coppersmith-plumbing/page.tsx` (route, React Server Component)
   - `getPingObjectGraph("coppersmith-plumbing")` from `src/fyd/data/ping-object-source.ts`
   - `generateSiteSpec(graph, { generatedAt, eventSequences })` from `src/fyd/proceduralize/generator.ts` (GENERATOR_VERSION 1.0.0)
   - `heroMediaFor(SITE_ID, graph, spec.ownerObjectId)` from `src/fyd/media/select.ts` (server seam; null when no acquired media)
   - `validateSiteSpec(spec, knownSchemas)` / `isRenderable(findings)` from `src/fyd/sitespec/validator.ts` (invalid spec never renders)
   - `publicGraph(graph)` local filter: client payload carries ONLY public objects + public-public relationships
   - renders `<SiteClient spec graph findings renderable siteId heroMetadata heroMedia />`
2. `src/fyd/data/ping-object-source.ts` (SERVER ONLY read seam)
   - reads projection JSON from `/home/nolan/ping/var/fyd-projections/<siteId>.json` (FYD_PROJECTION_DIR override for tests)
   - written by PING-side dump `/home/nolan/ping/tools/fyd-site-projection/dump.py`; NEVER falls back to a static fixture
   - fail-closed: file exists+parses, meta.siteId matches, every object has provenance with non-empty ref, sha256(graphDigest) over `canonicalize` (from `@/lib/ping/ask-composer`) matches
   - composes owner field corrections AFTER digest verify (`src/fyd/object/owner-overlay.ts`), attaches digest-verified presentationIntent block
3. `src/fyd/proceduralize/generator.ts` -> `generateSiteSpec(graph, opts): FYDSiteSpec`
   - data-driven generator: every section from the graph; every generated copy slot evidence-bound and verified before the spec is returned
4. `src/app/sites/_shared/site-client.tsx` (`SiteClient`, "use client")
   - `SitePageView(page, ctx)` + `resolveQuery` from `src/fyd/components/renderer.tsx`
   - `getComponentDef` from `src/fyd/components/registry.ts`
   - proposal flow: `proposeSitePatch` / `applySitePatch` from `src/fyd/proceduralize/patch.ts` (draft stays draft until approved)
   - `ObjectOverlay` from `src/fyd/components/object-overlay.tsx` (intercepts /o/ links)
   - `FydMotionFallback` from `src/fyd/components/fyd-motion-fallback.tsx` (motion enhancement only)
5. `src/fyd/components/renderer.tsx` (1802 lines: `SitePageView`, `renderSection`, `buildRenderContext`, `claimBadgeLabel`, `designIntentForTheme`)

## Sibling route (for contrast)

`/build/[siteId]` (`src/app/build/[siteId]/page.tsx` + `build-client.tsx`) is the golden customer route and the ONLY route using the strategy/builder pipeline:
`getPingObjectGraph` -> `verifyObjectGraph` (`src/fyd/builder/object-builder.ts`) -> `planSite({ vector: strategyForSite(siteId, graph).vector })` (`src/fyd/builder/planner.ts` + `src/fyd/builder/strategy-for-site.ts`) -> `applyPresentationIntent` (`src/fyd/customize/apply-layer.ts`) -> hero/gallery/object media -> validate -> `BuildClient` -> `SitePageView`.

**Lane-critical nuance:** `/sites/*` demos use `generateSiteSpec` directly and NEVER call `strategyForSite`/`inferStrategy`/`planSite`. Strategy pins (`STRATEGY_PINS: ping-fyd->TECHNOLOGY, coppersmith-plumbing->TRADES`) affect only the `/build/*` path.

## Fixture locations and formats

| Location | Format | Purpose |
|---|---|---|
| `src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts` (`COPPERSMITH_GRAPH`), `happy-place-graph.ts` (`HAPPY_PLACE_GRAPH`) | TS modules exporting ObjectGraph | base graphs for the tenant-graph read seam (`src/fyd/data/fyd-tenant-graph.ts`) |
| `src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json`, `happy-place.json` | JSON `{meta, graph}` (~4.6 KB) | unit-test projections |
| `src/fyd/media/manifests/coppersmith-plumbing.json`, `happy-place.json`, `ping-fyd.json` | JSON `{siteId, generatedAt, generator: "fyd-media@2", observations[]}` | pipeline ingest manifests; observations carry sourceUrl/sourcePage/observedAt/outcome/digest/redirectChain |
| `src/fyd/preview/manifests/coppersmith-plumbing.json`, `happy-place.json` | JSON `{src, srcSet, thumbSrc}` | derivative URL manifests served under /fyd-media/ |
| `src/fyd/proceduralize/raw/coppersmith-plumbing/{index.html,rss.xml,sitemap.xml}`, `raw/happy-place-platform/index.html` | raw HTML/XML | harvest source snapshots |
| `src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md` | markdown | run evidence notes |
| `src/fyd/proceduralize/__fixtures__/{coppersmith-jsonld,happy-place-rich-graph,fixtures-structured}.ts` | TS modules | structured-data test fixtures |
| `/home/nolan/ping/var/fyd-projections/` (Pig, PING-owned, NOT in repo) | JSON projections | production read source for `getPingObjectGraph` |
| `data/fyd-owner/happy-place.json`, `data/fyd-identity/audit.jsonl` | JSON/JSONL | owner overrides + identity audit stores |
