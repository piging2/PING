# TD-001 Integration Plan

Date: 2026-09-23. Verdict source: `adversarial-review.md` (TD-001 adversarial reviewer).
Repo: `/home/nolan/projects/ping`, branch `fyd-factory`, HEAD `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`.

## Selected patch

`contestant-a.patch` (+65 lines, 4 tests), which adds exactly one new file:
`src/fyd/sitespec/__tests__/explore-external-identity.test.ts`.

No production files are touched by the patch. The path is free on the branch
(the `__tests__` directory exists) and `git apply --check` passes cleanly.

## Why A over B

Both contestants are CORRECT and both patches are test-only with identical
(zero) production blast radius, but A's suite pins strictly more of the stated
acceptance surface in one file: test 1 pins the `eligibleComponents`
schema-to-component contract (external_identity is GenericObjectCard only),
turning any future deliberate product reversal into a loud explicit decision;
test 3 couples the narrowing assertion with end-to-end validation in a single
test, eliminating the vacuous-pass window that B's test 2 has in isolation
(`(schemas ?? [])` would pass on a regressed bare `all` without test 3
alongside it); and test 4 pins happy-place as the second acceptance tenant.
Both suites include the anti-vacuity fixture guard. The 17 extra lines buy
broader tripwire coverage for the same blast radius. Do not integrate both:
they target the identical file path.

## Verification already performed (read-only, no repo modification)

1. Branch/HEAD confirmed: `fyd-factory` / `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`
   (matches the adversarial review baseline).
2. `git apply --check` on `contestant-a.patch`: **APPLY_CHECK_OK** (run in
   `/home/nolan/projects/ping`; the patch was staged in WSL `/tmp` and
   deleted afterward; the working tree was left untouched).
3. File inventory of the patch: only
   `src/fyd/sitespec/__tests__/explore-external-identity.test.ts`. Zero
   production files, zero behavior changes, no privacy-boundary logic.

Note: `git status` shows pre-existing dirty files from other lanes
(e.g. `package.json`, `src/app/...`). The TD-001 integration must not touch
those; apply only the patch and run the tests.

## Exact integration steps

All commands run on the Pig in `/home/nolan/projects/ping` on branch
`fyd-factory` (do NOT commit to main; this lane commits per its own lane
convention).

1. Copy `~/workspace/fyd-factory/tournaments/td-001/contestant-a.patch` to
   the Pig (transfer dir per AGENTS.md scp fast path).
2. `git apply --check contestant-a.patch` (sanity; should pass).
3. `git apply contestant-a.patch`.
4. Confirm the new file: `git status --porcelain` should show exactly one
   untracked file: `src/fyd/sitespec/__tests__/explore-external-identity.test.ts`.
5. Run the new regression test:
   `npx vitest run src/fyd/sitespec/__tests__/explore-external-identity.test.ts`
6. Run the full planner and strategy suites (regression check on the
   generator/validator consumers):
   `npx vitest run src/fyd/builder/__tests__`
   (covers `planner.test.ts`, `strategies.test.ts`, `eligibility.test.ts`,
   and the remaining builder suites).

## Expected results

- The new test file: 4 tests, all pass.
- The builder suites: all pass, no regressions.
- If any suite reds for reasons unrelated to TD-001 (fixture drift in
  another lane's dirty files), investigate before treating as a TD-001
  failure; the patch itself is additive-only.

## Rollback

Delete the single new file:
`rm src/fyd/sitespec/__tests__/explore-external-identity.test.ts`.
There is nothing else to undo; no production code was ever changed.

## Live-route proof (from the adversarial review, independently reproduced)

Run `generateSiteSpec` on the repo fixtures:

- Happy-place fixture and coppersmith fixture: `validateSiteSpec`
  returns **zero errors**, `isRenderable` returns **true**.
- The generated Explore `ObjectFeed` query on coppersmith narrows to
  `{"kind":"all","schemas":["ping.social.business@1","ping.social.location@1",
  "ping.social.person@1","ping.social.service@1"],"limit":20}`.
  `ping.social.external_identity@1` is **excluded** from the explore query.

This is the behavior the new test file pins: if the generator ever regresses
to a bare `all` query, validation expands it over all known schemas and the
spec fails with `Component 'ObjectFeed' does not accept schema
'ping.social.external_identity@1'`, turning the tests red.
