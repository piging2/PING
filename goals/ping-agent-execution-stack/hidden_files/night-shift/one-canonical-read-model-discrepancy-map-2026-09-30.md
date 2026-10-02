# One-canonical-read-model discrepancy map

Date: 2026-09-30 (MDT)
Item: night-shift backlog triage Part 1 item 4, `one-canonical-read-model` (BACKLOG_PING.md, PING.F, P1; origin FL-20260921-233)
Method: read-only static analysis of the FYD build trees. No code changed. No Pig access, no live platform reads.

## The two sides

**Side A, fixture read path.** Static fixture graphs in `proceduralize/__fixtures__/`, served either
directly or as a digest-pinned base with PING journal overlays composed on top.

- `fyd-product-lane/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` (regen pin 2026-09-21T13:50:00Z; 7 objects, 6 relationships)
- `fyd-product-lane/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts` (same regen pin; business + 4 services + external identity + location + person)
- `fyd-product-lane/src/fyd/data/fyd-tenant-graph.ts` pins each fixture by sha256 base digest and composes PING journal overlays through the governed `PingObjectReader`. Base digest mismatch fails closed. A journal transport failure serves the verified base with `overlaysAvailable=false`.
- Older generation in the fyd-build tree: `fyd-build/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` and `coppersmith-plumbing-graph.ts` (regen 2026-09-22, different object/relationship counts and field shapes). `fyd-build/src/fyd/media/site-bundle.ts` imports these directly.

**Side B, PING-backed projection read path.** Digest-verified JSON dumped from the PING journal by
`/home/nolan/ping/tools/fyd-site-projection/dump.py` (`fyd-projection-dump@1.0.0`), read by
`fyd-product-lane/src/fyd/data/ping-object-source.ts` from `/home/nolan/ping/var/fyd-projections/<site>.json`
(env `FYD_PROJECTION_DIR`). Fail closed on missing, malformed, untraceable, or tampered projection;
never falls back to a fixture.

Best available local evidence of the projection's content (the live dir is unreachable from this
sandbox; see Caveats): the captured dump fixtures
`fyd-product-lane/src/fyd/object/__tests__/fixtures/projections/happy-place.json` (dumped 2026-09-21T19:26:30Z, baseDigest `4638e993...`, overlay event `39fc9971...`)
and `coppersmith-plumbing.json` (dumped 2026-09-21T18:44:35Z, baseDigest `afbc132f...`, no overlays).

## Disagreement table

| # | Fixture path | Projection path | Differing values | Consuming surface |
|---|---|---|---|---|
| D1 | `fyd-product-lane/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` (services: Repairs, Fencing, Painting, Drywall, Restoration; 5 objects) | `src/fyd/object/__tests__/fixtures/projections/happy-place.json` (services: Pergola Design Consultations; 1 object, provenance `canonical-journal` ref `ping-event:39fc9971...`, id scheme `website-service-51de038c...`) | Service list: 5 named services vs 1 different service. This is the FL-20260921-233 disagreement, still present in current code. | Fixture side: Ask FYD API (`src/app/api/fyd/ask/ask-pipeline.ts` via `src/fyd/media/site-bundle.ts` getSiteBundle). Projection side: ObjectView/Circle/Card/Node (`src/fyd/object/view.ts`, `object-projection.ts`, `by-id.ts`). |
| D2 | `fyd-product-lane/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts` (services: Plumbing, Heating & Cooling, HVAC, Ventilation; 4 objects) | `src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json` (services: none; relationships are links_to, located_at, works_for only) | Service list: 4 services vs 0 services. The projection carries no service objects or service edges at all for this tenant. | Fixture side: Coppersmith v2 family page (`src/app/sites/coppersmith-plumbing/v2/page.tsx` via `v2/family-input.ts` importing `COPPERSMITH_GRAPH` directly). Projection side: Coppersmith v1 page (`src/app/sites/coppersmith-plumbing/page.tsx` via `getPingObjectGraph`), ObjectView/Circle, `src/app/api/fyd/objects/*` routes, `src/app/api/fyd/projection/route.ts`, `src/app/build/[siteId]/page.tsx`, `src/fyd/customize/server.ts`, `src/fyd/tenant/scoped-stores.ts`. |
| D3 | Both fixture files use relationship predicate `offers` for business-to-service edges | happy-place projection uses predicate `provides` (`website-business-6fa5... provides website-service-51de...`) | Predicate vocabulary drift: `offers` vs `provides`. Consumers accept both (`object-projection.ts` and `view.ts` list both), so not user-visible, but it is a second vocabulary in the read model. | Same split as D1/D2. |
| D4 | Current fixture base digests match the pins in `fyd-tenant-graph.ts` exactly: happy-place `eacaa6113180f2cf601e7d592f10dfa1a783da25c8e0f86004d5922e65510679`, coppersmith `8eaf11fc761a49ff51e52844ac610c993f43b7443c173e3b2d7d6f73f3cc5d8b` (verified by recomputation here) | Projection meta baseDigest: happy-place `4638e993ebb17cee24f0e2de6f1a1a9d9d9a5be5ee7183f8f66d5b5bb23d559f`, coppersmith `afbc132fc86b90fb3959d05dd3114a823018c6a28e00cf0b09dcb4a820f70664` | The projection was dumped from an OLDER fixture generation than the one currently pinned. The fixture base moved; the projection did not follow (or the projection's overlay story diverged). | Fixture side: `fyd-tenant-graph.ts` (fails closed on fixture change, so the ask lane is self-consistent). Projection side: `ping-object-source.ts` (verifies the projection against itself, so it serves a self-consistent but older-base read model). The two self-consistent models disagree. |
| D5 | Fixture service `fields` keys: `claimKind`, `description`, `name`, `service_href` (fyd-product-lane generation; no `service_key`, no `evidence_ref`) | Projection service `fields` keys: `description`, `title` | Service field schema shape drift. Object-level keys are identical; the `fields` vocabulary is not. | Same split as D1. |
| D6 | `fyd-build/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` and `coppersmith-plumbing-graph.ts` (2026-09-22 regen: 6 objects/5 rels; different fields) | fyd-product-lane fixtures (2026-09-21T13:50:00Z regen: 7 objects/6 rels incl. location) | Two fixture GENERATIONS exist in the repo, in different trees, each with its own live consumer (`fyd-build/src/fyd/media/site-bundle.ts` imports the fyd-build generation directly). | fyd-build tree surfaces (bundle loader) vs fyd-product-lane surfaces. |
| D7 | Fixture service ids: `website-business-6fa5ebd99d72c4cb-service-<hash>` (derived from business id) | Projection service id: `website-service-51de038c...` (independent scheme, journal-added) | Service object identity scheme differs; an overlay-added service in the projection has no fixture counterpart id. | Ask FYD (fixture+overlays: overlay ops reference fixture ids) vs ObjectView/Circle (projection ids). |

**What does NOT differ** (checked field-by-field): the business objects are identical on both sides for both
tenants (title, description, phone, email, website, area_served, locality, keywords, provenance kind/ref,
observedAt, createdAt/updatedAt). Location, external identity, and person objects are identical. The
disagreement is confined to the service subgraph: service objects, service edges, predicates, and base digest.

## Consumer surface map (live, non-test code only)

Fixture side:
- `src/fyd/data/fyd-tenant-graph.ts` -> `src/fyd/media/site-bundle.ts` (getSiteBundle) -> `src/app/api/fyd/ask/ask-pipeline.ts` -> Ask FYD visitor answers (`src/fyd/ask/visitor-answer.ts`). The ask lane header states it deliberately never reads FYD_PROJECTION_DIR.
- `src/app/sites/coppersmith-plumbing/v2/family-input.ts` imports `COPPERSMITH_GRAPH` -> rendered page `src/app/sites/coppersmith-plumbing/v2/page.tsx`.
- `src/fyd/resolve/spike/demo.ts` imports both fixtures (spike/demo, not production traffic).
- `fyd-build/src/fyd/media/site-bundle.ts` imports the fyd-build fixture generation directly (older tree).

Projection side:
- `src/fyd/data/ping-object-source.ts` -> `src/fyd/object/view.ts` (loadObjectView, loadCircleProjection), `src/fyd/object/by-id.ts` -> Circle/ObjectView/Card/Node projections.
- Routes: `src/app/api/fyd/objects/[objectId]/route.ts` (+ overrides), `src/app/api/fyd/projection/route.ts`, `src/app/build/[siteId]/page.tsx`, `src/app/dev/objects/*`, `src/app/sites/coppersmith-plumbing/page.tsx` (v1).
- `src/fyd/customize/server.ts`, `src/fyd/tenant/scoped-stores.ts`.

## The first broken boundary

One tenant, two live read models, two different service lists. Concretely:

- `/sites/coppersmith-plumbing` (v1 page) reads the PING-backed projection: **0 services**.
- `/sites/coppersmith-plumbing/v2` (family page) reads the fixture: **4 services** (Plumbing, Heating & Cooling, HVAC, Ventilation).
- Ask FYD answers (fixture base + journal overlays) name the fixture's 5 happy-place services; Circle/ObjectView (projection) name "Pergola Design Consultations".

Original FL-20260921-233 wording said Circle/ObjectView read fixtures while Ask FYD/rendered pages read the
projection. That polarity has since flipped for ObjectView (`view.ts` header: "the PING-backed projection
read model ... is the ONLY customer-data source at runtime; the ingestion fixtures are test-only and are
never imported here"), but the invariant is still broken: the ask lane and the v2 family page still build
from fixture graphs while Circle/ObjectView and the v1 pages read the projection, and the two sources
disagree on the service list (D1, D2) and on the base they were derived from (D4).

Fix ownership: the fyd-build lane. This artifact proposes no patch. The backlog fix direction is
"unify on the PING-backed projection; fixtures become an explicit FIXTURE class, never a live read path."

## Caveats and open questions for the fyd-build lane

1. Live projection values are taken from the captured 2026-09-21 dump fixtures in
   `src/fyd/object/__tests__/fixtures/projections/`. The live dir `/home/nolan/ping/var/fyd-projections`
   is unreachable from this sandbox (no Pig access per hard rules). The current on-disk projection may
   already differ from the captured one; re-run the value comparison against a fresh dump before acting.
2. The ask lane's fixture+overlays path is digest-pinned and fail-closed, so it is internally consistent;
   the projection path is also internally consistent. The break is BETWEEN them, not inside either.
3. Two fixture generations exist (fyd-build 2026-09-22 vs fyd-product-lane 2026-09-21T13:50:00Z). Any
   unification must pick one generation as the base the dump records, and D4's base digest drift must be
   resolved (re-dump or re-pin, not silent).
4. Test files were excluded from the consumer map; they pin the contract (`graph-read-route.test.ts`
   explicitly asserts the ask lane never reads FYD_PROJECTION_DIR) but do not serve traffic.
