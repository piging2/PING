# TD-001 Contestant B report: Coppersmith Explore / ObjectFeed / external_identity

## Verdict

The defect's production mechanism is already fixed on branch `fyd-factory`.
The generator narrows the Explore `all` query to ObjectFeed-accepting schemas
(commit `4a9cc919`, 2026-09-21 15:42). The one acceptance item still unmet is
"a regression test exists". This submission's minimal patch is that test:
one new file, zero production-code changes.

## 1. Root cause

Pre-fix, `explorePage()` in `src/fyd/proceduralize/generator.ts` emitted a
bare `{ kind: "all", limit: 20 }` query. The validator's
`querySchemasFor()` (`src/fyd/sitespec/validator.ts:112-115`) expands a bare
`all` to every known schema in the graph, including
`ping.social.external_identity@1`. That schema has no `SCHEMA_ROLES` entry
and no `SCHEMA_COMPONENTS` entry, so `eligibleComponents()` resolves it to
`["GenericObjectCard"]` only, and the validator raised
"Component 'ObjectFeed' does not accept schema
'ping.social.external_identity@1'." at `pages.explore.sections[0].query`,
making the spec non-renderable so `SiteClient` showed
"Spec failed validation" (`src/app/sites/_shared/site-client.tsx:149`).

One-line root cause: the validator rejects schemas the feed does not accept,
and the old Explore page asked for everything (`all`) instead of only
feed-acceptable schemas.

## 2. Evidence (all verified on the Pig, branch fyd-factory)

- Pre-fix generator (from `git show 4a9cc919^`):
  `section("explore", 0, "ObjectFeed", { kind: "all", limit: 20 })` with the
  doc comment "EXPLORE: everything public, newest first."
- Fix commit `4a9cc919` changed `explorePage` to compute
  `feedSchemas = [...new Set(publicObjects.map((o) => o.schema))]
  .filter((s) => eligibleComponents(s).includes("ObjectFeed")).sort()`
  and emit `{ kind: "all", schemas: feedSchemas, limit: 20 }`.
  This is fix-direction #2 from the defect list (exclude non-feedable
  schemas from the `all` expansion).
- `src/fyd/sitespec/schemas.ts:250-268`: `SCHEMA_COMPONENTS` has no
  `external_identity` entry; `eligibleComponents()` returns
  `["GenericObjectCard"]` for it. `src/fyd/components/registry.ts:81`:
  ObjectFeed `acceptsSchemas` likewise excludes it.
- Live reproduction (tsx on the Pig, same code path as
  `src/app/sites/coppersmith-plumbing/page.tsx`: `generateSiteSpec` ->
  `validateSiteSpec` -> `isRenderable`) with
  `src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts`, which contains
  a public `ping.social.external_identity@1` object:
  Explore query schemas = `[business, location, person, service]`
  (external_identity excluded), zero error findings, `renderable: true`.
- Same check with `happy-place-graph.ts`: zero errors, `renderable: true`.
- Baseline suites green on this branch:
  proceduralize lane 9 suites / 82 tests,
  sitespec lane 10 suites / 91 tests,
  builder lane 12 suites / 96 tests.
  (`npx jest --config src/fyd/<lane>/jest.config.cjs`; the bare `npm test`
  config cannot parse TS on this branch, a pre-existing infra quirk.)

## 3. Patch summary

`contestant-b.patch`: 1 file, 48 insertions, 0 deletions.
Adds `src/fyd/sitespec/__tests__/explore-external-identity.test.ts` with
three tests that pin the acceptance:

1. the Coppersmith fixture graph contains a public external_identity object
   (proves the test exercises the defect's precondition);
2. the generated Explore ObjectFeed emits `kind: "all"` with an explicit
   `schemas` filter that excludes external_identity;
3. the Coppersmith SiteSpec validates with zero errors and
   `isRenderable()` is true.

No production code is touched. No customer-specific conditionals.
Privacy boundary: the test reads only public fixture objects; it does not
alter visibility handling. `src/fyd/builder/visibility.ts` conventions are
unaffected (the patch adds no bindings, public or private).

## 4. Proof plan

After applying the patch (do not apply in this read-only session):

- `cd /home/nolan/projects/ping && npx jest --config src/fyd/sitespec/jest.config.cjs explore-external-identity`
  Expected: 3/3 pass. The new file is auto-discovered by the lane
  `testMatch` (`src/fyd/sitespec/__tests__/*.test.ts`).
- Full lane regression:
  `npx jest --config src/fyd/sitespec/jest.config.cjs` (10+1 suites green),
  `npx jest --config src/fyd/proceduralize/jest.config.cjs` (9 suites green),
  `npx jest --config src/fyd/builder/jest.config.cjs` (12 suites green).
- The patch content was already executed in equivalent form on the Pig:
  the exact `generateSiteSpec` / query-shape / `validateSiteSpec` /
  `isRenderable` assertions from the test ran via tsx against the real
  fixture graphs and passed; the test source typechecks clean under
  `tsc --strict` (verified with a scratch tsconfig extending the repo's).
- Observable acceptance after the fix (already true on this branch, pinned
  by the test): Coppersmith SiteSpec validates with zero errors, so the
  generated site renders the Explore page instead of the
  "Spec failed validation" state; Happy Place still validates.

## 5. Risk / blast radius

Blast radius: none beyond the test suite. The patch adds one test file and
changes no runtime, build, or config code, so it cannot alter any site,
spec, feed, or privacy behavior. The only failure mode is a red test if a
future change reintroduces the defect, which is the intended tripwire.
If the test ever goes red for an unrelated fixture regeneration, the fix is
to re-examine the fixture, not the narrowing logic.

## Notes

- Alternate fix direction #1 from the defect list (add external_identity to
  ObjectFeed's accepted schemas) would be wrong: external_identity objects
  are sameAs link candidates, not feed content. The landed direction #2 is
  the correct product behavior; this submission agrees with it and only pins
  it.
- I did not apply the patch (repo is git read-only for this task) and I
  did not touch the repo otherwise. Pig scratch files used for verification
  were removed.
- This directory is shared with the other contestant: files named
  `explore*.sh`, `run-*.sh`, `repro-live.test.ts`, `newtest-repo.test.ts`,
  and an earlier `explore-external-identity.test.ts` are not mine. My
  deliverables are `contestant-b.patch`, `contestant-b.md`,
  `contestant-b-test.ts` (my independent draft of the new test content),
  and the `td001-*` probe scripts. I reached my conclusion independently
  before reading the sibling's test file.
