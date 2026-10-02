# TD-001 — Contestant A report

## Verdict: false positive on this branch. The failure mechanism is already fixed; the missing piece is the regression test.

## Root cause (one line)
`ping.social.external_identity@1` is not registered in `SCHEMA_ROLES` and has no entry in `SCHEMA_COMPONENTS`, so `eligibleComponents()` resolves it to `GenericObjectCard` only — and the generator's Explore page already narrows the `all` query to `ObjectFeed`-eligible schemas, so the validator never sees the schema on `pages.explore.sections[0].query`.

## Evidence

- `src/fyd/proceduralize/generator.ts:272-287` (`explorePage`): feed schemas are computed as
  `[...new Set(publicObjects.map((o) => o.schema))].filter((s) => eligibleComponents(s).includes("ObjectFeed")).sort()`
  and emitted as `{ kind: "all", schemas: feedSchemas, limit: 20 }`. The exclusion route from the defect's fix direction is implemented here.
- `src/fyd/sitespec/schemas.ts` (`eligibleComponents`, ~line 380): `ping.social.external_identity@1` has no `SCHEMA_COMPONENTS` entry and `schemaRole()` returns null (no `SCHEMA_ROLES` row), so it falls through to `["GenericObjectCard"]`.
- `src/fyd/sitespec/validator.ts:112-118` (`querySchemasFor`): a kind `"all"` query with explicit `q.schemas` validates only those schemas; expansion across all known schemas happens only for a bare `all`, which the generator never emits (only emitter of `all` in the repo is `generator.ts:284`).
- Repro runs on the Pig (branch `fyd-factory`, HEAD `e48ef710`), no repo writes:
  - Fixture path: `generateSiteSpec(COPPERSMITH_GRAPH)` then `validateSiteSpec` -> explore query `{"kind":"all","schemas":["ping.social.business@1","ping.social.location@1","ping.social.person@1","ping.social.service@1"],"limit":20}`, zero errors, renderable=true.
  - Live path (mirrors `src/app/sites/coppersmith-plumbing/page.tsx` exactly): real PING projection `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json` (8 objects: 1 business, 1 public external_identity, 1 location, 1 person, 4 services; dumped 2026-09-22) -> zero errors, renderable=true; happy-place projection also zero errors.
- History: the `eligibleComponents(s).includes("ObjectFeed")` filter was introduced in commit `4a9cc919` ("fyd generator: fixture refresh, field visibility, safe links, sites pages, fyd api routes"), which predates the failure evidence (FL-20260921-031, screenshots from 2026-09-21). The defect as stated describes the pre-filter behavior.

## What this is not
- Not a misclassified object: `external_identity` is correctly an observed-vocabulary schema (`src/fyd/builder/eligibility.ts:46` marks it "no SCHEMA_ROLES entry; observed vocabulary"), public, and used by the `Links` ("connected") eligibility path. Excluding it from the chronological feed is a product-correct choice, not a workaround.
- Not a privacy issue: `explorePage` filters to `visibility === "public"` objects; `src/app/sites/coppersmith-plumbing/page.tsx` strips private objects via `publicGraph()`; `src/fyd/components/renderer.tsx:111-115` resolves `all` queries over public objects only; `src/fyd/builder/visibility.ts` exports `publicObjects()` and `assertNoPrivateLeak()`. The patch touches none of this.

## Patch summary (`contestant-a.patch`)
Additive-only: one new test file, zero behavior changes, zero modifications to existing files.

- New: `src/fyd/sitespec/__tests__/explore-external-identity.test.ts` (65 lines, 4 tests)
  1. `eligibleComponents("ping.social.external_identity@1")` is exactly `["GenericObjectCard"]`, never `ObjectFeed`.
  2. The Coppersmith fixture really does contain a public `external_identity` object (guards against fixture drift making the test vacuous).
  3. `generateSiteSpec(COPPERSMITH_GRAPH)` emits an Explore `ObjectFeed` whose `all` query excludes `external_identity`, and `validateSiteSpec` returns zero errors / renderable.
  4. Happy Place spec still validates (acceptance criterion).

No em dashes used. No customer-specific conditionals. No new frameworks.

## Proof plan
1. Apply the patch on branch `fyd-factory`.
2. Run: `npx jest --config src/fyd/sitespec/jest.config.cjs` (scoped lane config; covers `validator.test.ts`, `spec-compat.test.ts`, and the new test). Expected: all green, new suite 4/4.
3. Run the generator lane suite: `npx jest --config src/fyd/proceduralize/jest.config.cjs` to confirm no fixture/spec drift.
4. Observable acceptance: `/sites/coppersmith-plumbing` renders the site (no "Spec failed validation" state from `src/app/sites/_shared/site-client.tsx:149`); the Explore page shows the feed; Happy Place unchanged.

Note: the new test was verified out-of-tree on the Pig under the lane's own strict tsconfig (`strict: true`, diagnostics on): 4/4 pass.

## Risk / blast radius
Essentially zero. The patch adds one test file and changes no runtime code:
- No component, schema, validator, generator, or renderer behavior changes, so no render, validation, or privacy-boundary impact.
- The only failure mode is the test itself failing if a future change reintroduces the defect or removes `external_identity` from the fixture; the second test makes fixture drift fail loudly rather than vacuously passing.
- Residual (pre-existing, out of scope): a hand-written spec with a bare `{kind:"all"}` query against a graph containing `external_identity` still fails validation by design (fail-closed for hand-written specs, `validator.ts` comment). The generator never emits bare `all`.
