# TD-001 Adversarial Review

Reviewer: TOURNAMENT TD-001 ADVERSARIAL REVIEWER (independent, resumed after daemon restart; prior probe scripts in this directory reused, not redone blindly).
Repo: `/home/nolan/projects/ping`, branch `fyd-factory`, HEAD `e48ef710`. All repo access read-only via `~/workspace/bin/wsl-run.sh`.
Date: 2026-09-23.

## 1. Executive verdicts

- **Contestant A: CORRECT.** The core claim verifies end to end against the repo, the live coppersmith path reproduces clean, and the patch is test-only with no production or privacy impact.
- **Contestant B: CORRECT.** Same core claim, independently reached and independently verifiable, test-only patch, no production or privacy impact.
- **Recommendation: (a) integrate A's patch.** Paragraphs for all four options are in section 6.

## 2. Independent verification of the core claim

Both contestants claim commit `4a9cc919` already fixed the production mechanism: the generator's Explore page narrows the `all` query to ObjectFeed-accepting schemas, so the validator never sees `ping.social.external_identity@1` under the `ObjectFeed` component. I verified each link independently:

| Claim | Result |
|---|---|
| Branch is `fyd-factory`, HEAD `e48ef710` | Confirmed via `git branch --show-current` / `git rev-parse` |
| `4a9cc919` exists, dated 2026-09-21 15:42 -0600, subject "fyd generator: fixture refresh, field visibility, safe links, sites pages, fyd api routes" | Confirmed via `git show -s` |
| Pre-fix code emitted a bare `all` query | Confirmed: `git show 4a9cc919^:.../generator.ts` line 242 shows `section("explore", 0, "ObjectFeed", { kind: "all", limit: 20 })` with comment "EXPLORE: everything public, newest first." |
| `4a9cc919` introduced the narrowing filter | Confirmed: the diff adds `feedSchemas = [...new Set(publicObjects.map((o) => o.schema))].filter((s) => eligibleComponents(s).includes("ObjectFeed")).sort()` plus a `feedSchemas.length === 0` early return, and changes the emission to `{ kind: "all", schemas: feedSchemas, limit: 20 }` |
| Current `generator.ts:272-287` matches the claim | Confirmed by direct read |
| `eligibleComponents("ping.social.external_identity@1")` is `["GenericObjectCard"]` | Confirmed by live tsx run: no `SCHEMA_COMPONENTS` entry, no `SCHEMA_ROLES` entry, falls through to the `["GenericObjectCard"]` default at `schemas.ts:282` |
| Validator narrows expansion on explicit `schemas`, expands bare `all` over all known schemas (fail-closed by design) | Confirmed: `validator.ts` `querySchemasFor`, `case "all": return q.schemas ?? (q.schema ? [q.schema] : [...knownSchemas])`, with the "fail-closed for hand-written specs" comment |
| The validator checks component eligibility via `eligibleComponents` (same contract the generator uses) | Confirmed: `validator.ts:72` |
| The route mirrors the repro: `generateSiteSpec` -> `validateSiteSpec` -> `isRenderable` -> `SiteClient` | Confirmed: `src/app/sites/coppersmith-plumbing/page.tsx` |
| Live path with the real projection `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`: explore query excludes external_identity, zero errors, renderable=true | Confirmed by independent tsx repro (previous reviewer's `rev-repro.sh`, re-executed): 8 objects, 8 public, 1 public external_identity object; explore query `{"kind":"all","schemas":["ping.social.business@1","ping.social.location@1","ping.social.person@1","ping.social.service@1"],"limit":20}`; `errors: []`; `renderable: true` |

The defect as stated describes genuine pre-`4a9cc919` behavior (the bare `all` query plus the validator's expansion would have produced exactly "Component 'ObjectFeed' does not accept schema 'ping.social.external_identity@1'"). On the current branch the mechanism is fixed and the failure is not reproducible. Both contestants' root-cause narratives are accurate.

## 3. Attacking the patches

Both patches add exactly one new file, `src/fyd/sitespec/__tests__/explore-external-identity.test.ts` (the `__tests__` directory exists; the path is free). Zero production files touched, zero behavior changes, no visibility/privacy logic involved (both tests read only repo fixture graphs). Neither patch can alter any site, spec, feed, or privacy boundary. That part of both reports checks out.

### 3.1 Contestant A (+65 lines, 4 tests)

Test inventory: (1) pins `eligibleComponents(external_identity)` to exactly `["GenericObjectCard"]`; (2) asserts the fixture really contains a public external_identity object (anti-vacuity guard); (3) asserts the generated Explore ObjectFeed query excludes the schema AND that `validateSiteSpec` returns zero errors with `isRenderable` true; (4) asserts the happy-place spec still validates.

Attack results:

- **Do the tests test the right thing?** Yes. Test 3 is the true regression tripwire: it pins both the narrowing outcome and the end-to-end validation outcome in a single test, so there is no vacuous-pass window within that test. Test 2 prevents the classic silent-pass where a fixture regeneration drops the precondition object. Test 1 pins the schema-to-component contract both contestants agree is the correct product stance (external_identity is sameAs link material, not feed content). Test 4 pins the stated acceptance criterion for the second tenant.
- **Could a future regression slip through?** The realistic single-change regressions are all caught: generator reverts to bare `all` (test 3 fails at validation); the narrowing filter is dropped or bypassed (test 3 fails); eligibleComponents gains ObjectFeed for external_identity (test 1 fails, and test 3's query assertion would fail too since the query would then include it); fixture drift (test 2 fails loudly). A two-change regression (validator stops expanding bare `all` AND generator reverts to bare `all`) would slip through, but that requires coordinated changes across two lanes' contracts and the renderer's bare-`all` behavior would then define the outcome; this is beyond any reasonable regression test's scope.
- **Brittleness risk:** test 1's exact `toEqual(["GenericObjectCard"])` would fail on a deliberate future product decision to make external_identity feed-eligible. That is intended: both contestants argue that direction is wrong, so a loud failure forcing an explicit decision is the correct behavior, not a false alarm. Test 4 could red on unrelated happy-place fixture drift; acceptable, since happy-place validation is an explicit acceptance criterion and the failure message would point at the fixture, not the narrowing logic.

### 3.2 Contestant B (+48 lines, 3 tests)

Test inventory: (1) anti-vacuity guard (fixture contains public external_identity); (2) generated Explore ObjectFeed narrows its `all` query away from external_identity; (3) Coppersmith spec validates with zero errors and is renderable.

Attack results:

- **Do the tests test the right thing?** Yes, with one structural nit. Test 2 asserts `(feed.query.schemas ?? []).not.toContain(EXTERNAL_IDENTITY)`. If the generator regressed to a bare `all` (no `schemas` key), `?? []` yields `[]` and test 2 passes vacuously in isolation. Test 3 closes the hole (bare `all` expands over all known schemas at validation, producing the error), so the suite as a whole is safe, but the protection is split across two tests where A's test 3 keeps query-shape and validation in one. This is a minor robustness difference, not a correctness defect.
- **Could a future regression slip through?** Same coverage as A for the realistic regressions: bare-`all` revert (test 3), dropped filter (tests 2+3), eligibility change adding ObjectFeed for external_identity (test 2, since the query would then include it), fixture drift (test 1). B lacks A's explicit pin of the eligibility mapping, but as shown, test 2 catches the practical consequence of such a change anyway.
- **Brittleness risk:** lower than A by construction. No exact-equality pin on the mapping, no happy-place assertion. The tradeoff is less protection of the product stance, not less protection of the defect mechanism.

### 3.3 Head-to-head

Both patches are correct, test-only, and privacy-neutral. They are mutually exclusive as submitted: both target the identical file path, so at most one applies cleanly. Coverage comparison: A's test 3 is strictly more robust than B's test 2 in isolation (no vacuous-pass window); A's test 1 pins the schema-component contract that B leaves implicit; A's test 4 pins the second acceptance tenant. B's advantage is 17 fewer lines and no exact-equality pin that a future deliberate product change would trip. On false-pass risk the suites are equivalent in practice; on protection breadth A covers strictly more of the stated acceptance surface. Neither touches production code, so blast radius is identical (a red test, nothing else).

## 4. Counter-case hunt: other paths where an unregistered schema could still fail validation

I hunted every production path to `validateSiteSpec` for a route that could still put `external_identity` (or a similar unregistered schema) under a component that rejects it:

- **`/build/[siteId]` planner path:** `planSite` (`src/fyd/builder/planner.ts:289`) builds its base spec by calling `generateSiteSpec` directly, then only filters/reorders sections. It inherits the narrowing. The builder's own ObjectFeed eligibility (`eligibility.ts:199-203`) is a defensive filter over the generator's output, not a second query emitter. Not a counter-case.
- **Customize / presentation-intent layer (`src/fyd/customize/apply-layer.ts`, `server.ts`):** directives are reorder/hide/feature/copy-edit; the layer never constructs or mutates section queries. `loadCustomizedSite` calls `generateSiteSpec`. Not a counter-case.
- **Hand-written specs:** the only emitter of a `kind: "all"` query in all of `src/` is `generator.ts:284` (plus the type definition in `types.ts:48`). No hand-built spec literals reach `validateSiteSpec` in production; all five production callers (`build/[siteId]`, both `/sites/*` routes, `lineage/tracer.ts`, `media/site-bundle.ts`) validate specs produced by `generateSiteSpec` (or `planSite`, which wraps it). A hand-written bare `all` would still fail validation, but that is the validator's documented fail-closed design ("fail-closed for hand-written specs"), not a live defect.
- **Other tenants:** the narrowing is computed per graph from that graph's own public schemas, so any tenant with an external_identity object gets identical protection. The mechanism is schema-generic: any future unregistered schema is excluded the same way.
- **Renderer:** resolves `all` queries by the query's own schema list over public objects only (`renderer.tsx` `case "all"`); it does not re-expand, so it cannot reintroduce the schema at render time.

**Result: no live counter-case found.** TD-001's production mechanism is fixed on all reachable paths.

### 4.1 Latent observation (not a defect, not TD-001)

The registry's `acceptsSchemas` for `ObjectFeed` (`post + article + service + KNOWLEDGE_WEBSITE`) is narrower than `SCHEMA_COMPONENTS`' ObjectFeed list (which also grants `product`, `location`, `person`). The registry file's own comment claims "one mapping, three consumers," but `acceptsSchemas` currently has no consumers outside the registry file itself: the generator and validator both use `eligibleComponents()`, and the renderer trusts the query. So the discrepancy is dead metadata today, not a live inconsistency. Flagging for hygiene: if `acceptsSchemas` ever gains a real consumer on the feed path, the two mappings must be reconciled first.

## 5. Final verdicts

- **Contestant A: CORRECT.** Every material claim in `contestant-a.md` verified independently against the repo and the live projection: the `4a9cc919` diff, the three code locations, the validator's expansion semantics, the fixture precondition, and the zero-error/renderable outcome. The patch is additive-only (one test file), touches no production code and no privacy boundary, and its four tests pin the defect mechanism plus the agreed product stance. Minor caveats (exact-equality pin, happy-place coupling) are acceptable tradeoffs documented in 3.1.
- **Contestant B: CORRECT.** Every material claim in `contestant-b.md` verified independently: same commit archaeology, same eligibility resolution, same live outcome. The report is honest about provenance (independent conclusion before reading the sibling's test) and about the read-only constraint. The patch is additive-only and privacy-neutral. The test-2-in-isolation vacuous-pass nit is real but fully closed by test 3 within the suite.

## 6. Recommendation

**(a) Integrate A's patch.** A's suite pins the complete acceptance surface in one file: the schema-to-component contract both contestants agree is the correct product behavior, the anti-vacuity fixture guard, the narrowing outcome coupled with end-to-end validation in a single test (eliminating the vacuous-pass window B's split tests leave within any single test), and the happy-place acceptance criterion. The 17 extra lines buy strictly broader tripwire coverage for the same zero production blast radius, and the exact-equality pin on `eligibleComponents` converts a future deliberate product reversal into a loud, explicit decision point rather than a silent behavior change. Apply as-is; the file path is free and the lane testMatch will discover it.

**(b) Integrate B's patch.** A defensible second choice if minimalism is valued over coverage: B pins the defect mechanism itself (narrowing outcome plus validation) in 48 lines with no exact-equality pins that a future deliberate product change could trip. It is correct and sufficient as a regression tripwire for TD-001 narrowly construed, but it leaves the schema-component contract and the second acceptance tenant unpinned, and its query-shape test can pass vacuously in isolation. Choose B only if the team prefers the leaner contract; do not integrate both, since they target the identical file path.

**(c) Integrate neither and write a different test.** Not recommended. Both submitted tests are correct, cover the realistic regression space, and are cheaper than a rewrite. The only meaningful strengthening either lacks is an explicit universal assertion (every schema in the explore query is ObjectFeed-eligible), but the end-to-end `validateSiteSpec` assertion already enforces that property implicitly for every schema present in the fixture, so a rewrite would add ceremony without adding protection.

**(d) TD-001 needs a production fix after all.** Rejected. The evidence is conclusive and independently reproduced: `4a9cc919` changed the only `all`-query emitter to narrow by `eligibleComponents`, the validator and generator share that contract, every production path to `validateSiteSpec` flows through the narrowing (including the planner and customize layers), the counter-case hunt found no live path that can still fail, and the real coppersmith projection validates with zero errors and `renderable: true`. There is nothing for a production fix to change; the missing piece is exactly what both contestants delivered, a regression test.
