# Phase-1 Report: ONE-COMPILER PROOF (FYD Builder Sprint)

Date: 2026-09-22 ~02:10-02:30 MDT
Worker role: Phase-1 worker. READ-ONLY on the repo; no source edits, no commits, STATE.json untouched, `src/fyd/jest.config.cjs` untouched.
Repo: Pig only, `/home/nolan/projects/ping`, branch `fyd/builder-composition`, HEAD `1539b28cd4c9cc4e6c9612e2620ffd03d18c7a93`, via `~/workspace/pig/pigwsl-run.sh` bridge (`< /dev/null`, no `$` in bridge scripts).
Repo state after all runs: `git status` clean except the known untracked `?? src/fyd/jest.config.cjs`. No repo files were written at any point; the scratch jest run lived in `/tmp/phase1-diff` (removed afterward; removal verified).

## Verdict: ONE COMPILER PROVEN

Both tenants generate through one shared pipeline with zero customer-specific branches in the compiler core, and the two outputs are materially different per the repo's own structural-diff module.

## 1. Zero customer-specific code: grep results

Grep (case-insensitive) for `happy-place|coppersmith|happy place` over `src/fyd/builder/`, `src/fyd/tenant/`, `src/app/build/`: **45 hits, all inside `src/fyd/builder/`**. Zero hits in `src/fyd/tenant/` and zero in `src/app/build/` (the route file contains no tenant literals at all).

### Non-test source hits (6) — all class (a), none class (b)

- `src/fyd/builder/site-vectors.ts:33` — `"coppersmith-plumbing": COPPERSMITH_VECTOR` inside the `SITE_VECTORS` record. **(a) generic siteId -> operating-point mapping.** This is the one production mapping of a tenant name, and it is exactly the acceptable category: a data lookup, not a branch. Unknown tenants fall through to `DEFAULT_VECTOR` ("Unknown tenants get the neutral default, so the route never breaks on a new site").
- `src/fyd/builder/site-vectors.ts:12,15` — doc comment mentioning the two proven tenants; import of the vector constant. **(a)**.
- `src/fyd/builder/dimensions.ts:104,107` — doc comment "Coppersmith (private demo): an emergency-capable local trade" and the `COPPERSMITH_VECTOR` constant definition (eight numeric dimensions). **(a) named operating-point data.** The planner consumes only the numbers; it never branches on the name.
- `src/fyd/builder/index.ts:66` — re-export of `COPPERSMITH_VECTOR`. **(a)**.

### Test hits (39) — all class (a) fixtures

`__tests__/planner.test.ts` (15), `__tests__/structural-proof.test.ts` (10), `__tests__/dimensions.test.ts` (11), `__tests__/structural-diff.test.ts` (5). All use `COPPERSMITH_VECTOR` / `"coppersmith-plumbing"` as fixture inputs to exercise the generic planner. No production behavior depends on them.

### Class (b) count: 0

No `if (siteId === ...)`, no `tenantId === "happy-place"` / `"coppersmith-plumbing"` conditional, no name-based branch anywhere in the compiler path. The only tenant-conditional logic is the generic `requireTenantContext` enforcement (fail-closed on missing/cross-tenant context), which is tenant-agnostic by construction.

Raw: `grep.log` (45 lines).

## 2. The single code path both tenants traverse

Read verbatim from `src/app/build/[siteId]/page.tsx` (`BuildSitePage`, the `/build/[siteId]` route). Both tenants execute this exact chain, parameterized only by `siteId`:

1. `src/app/build/[siteId]/page.tsx` — `BuildSitePage`: `siteId` from route params; unknown sites 404 via fail-closed projection load.
2. `src/fyd/data/ping-object-source.ts` — `getPingObjectGraph(siteId)`: loads the PING projection JSON, verifies `meta.siteId` match and the sha256 `graphDigest`; missing/tampered projection is a hard failure, never a fixture fallback.
3. `src/fyd/builder/object-builder.ts` — `verifyObjectGraph({ tenantId: siteId }, projection)`: OBJECT BUILDER boundary (what is known); deterministic verifier, returns attested graph.
4. `src/fyd/builder/site-vectors.ts` — `vectorForSite(siteId)`: operating point handed to the planner.
5. `src/fyd/builder/planner.ts` — `planSite({ ctx: { tenantId: siteId }, graph: verified.graph, vector, generatedAt: meta.generatedAt, eventSequences: meta.eventSequences ?? undefined, attestation: verified.attestation })`: WEBSITE BUILDER (how known things are presented). Returns `{ spec, manifest, generatedPresentation, confidence, eligibility, plannerVersion, semanticDigest, canonicalSpecJson }`.
6. `src/fyd/customize/apply-layer.ts` — `applyPresentationIntent(base, presentationIntent, graph).spec`: owner presentation-intent layer applied OVER the compiled spec.
7. `src/fyd/sitespec/validator.ts` — `validateSiteSpec` / `isRenderable`: invalid specs never render.
8. `src/app/build/[siteId]/build-client.tsx` — `BuildClient`: generic composition shell; featured object selected by `richestObject(graph.objects, spec.ownerObjectId)` from `src/fyd/components/object-rail.tsx` (deterministic highest-evidence-score public non-owner object).

Entry points named exactly: `verifyObjectGraph` (object-builder.ts) and `planSite` (planner.ts), matching the task's expectation. Planner version for both runs: `fyd-site-planner@1`.

## 3. Materially different outputs

Method: a scratch jest test at `/tmp/phase1-diff/one-compiler-proof.test.ts` (never in the repo tree) executed the exact route pipeline above for both tenants via the repo's real modules (`getPingObjectGraph` on the LIVE projections in `/home/nolan/ping/var/fyd-projections/`), then diffed the two final specs with the repo's own `diffSiteSpecs` / `renderStructuralDiffReport`. Scratch jest config at `/tmp/phase1-diff/jest.config.cjs` mirrored the landed builder config (`rootDir` = repo, `@/` mapper). Result: 1/1 passed; `materiallyDifferent === true`. Raw: `phase1-jest.log`, `structural-diff.md`, `tenant-*.json`.

### happy-place

- SiteSpec digest (sha256 over canonical spec): `21659a9bef9809278869aff15291ef3267b5028aada67f6955a229fccdc27975` (compiler digest == final digest; no presentation-intent directives in the projection)
- Vector applied: `DEFAULT_VECTOR` — all eight dims 0.5. **happy-place has no explicit `SITE_VECTORS` entry**; it composes on the documented neutral default.
- Nearest named preset / spec archetype stamp: `KNOWLEDGE` / `KNOWLEDGE`
- Composition policy: density comfortable, ctaEmphasis low, maxSectionsPerPage 9
- Pages: `home` [Hero, Services, BusinessSummary, Locations, Contact, Links, AskFYD], `about` [BusinessSummary], `services` [Services]
- Presence: 2 objects (mode auto, collapseBelow lg)
- Featured object: `website-service-51de038c1defe8bd`, schema `ping.social.service@1`, title "Pergola Design Consultations"
- Live HTML cross-check (`curl --max-time 20 http://localhost:3100/build/happy-place` -> 200, 57961 bytes): "Featured object" heading present 2x, object id present 1x, title present 2x. The rendered page shows the same featured object the pipeline selected.

### coppersmith-plumbing

- SiteSpec digest (sha256): `ad34cf3d7cc134702c9fa955927c5a54b65f75cd4d79dce2f0595e9ff6b40ff9` (compiler digest == final digest)
- Vector applied: `COPPERSMITH_VECTOR` (urgency 0.85, trust_requirement 0.8, technical_depth 0.2, human_prominence 0.5, media_density 0.5, service_complexity 0.3, locality 0.9, evidence_density 0.5)
- Nearest named preset / spec archetype stamp: `TRADES` / `TRADES`
- Composition policy: density comfortable, ctaEmphasis high, maxSectionsPerPage 8
- Pages: `home` [Hero, BusinessSummary, Contact, Locations, People, Links, AskFYD], `about` [BusinessSummary, People]
- Presence: 3 objects (mode auto, collapseBelow lg)
- Featured object: `website-business-2f1327c09d622175-location`, schema `ping.social.location@1`, title "Grand Junction, Colorado, 81501, United States"
- Live HTML cross-check (`curl --max-time 20 http://localhost:3100/build/coppersmith-plumbing` -> 200, 61810 bytes): "Featured object" heading present 2x, object id present 1x, title present 2x. Same featured object as the pipeline selected.

### Structural diff (repo's own module, verbatim reasons)

`materiallyDifferent: true`. Reasons: different page sets; section set differs on page "about"; section order differs on page "home"; section set differs on page "home"; presence differences: objects 2 -> 3; different archetype vocabulary: KNOWLEDGE vs TRADES. Detail: happy-place alone has a `services` page; `home` order differs (happy-place leads Hero > Services > BusinessSummary > Locations > Contact; coppersmith-plumbing leads Hero > BusinessSummary > Contact > Locations > People, the urgency-driven contact-first reorder); `about` gains a People section for coppersmith-plumbing; theme tokens 0 differences.

## 4. Honest observations (not defects)

1. **happy-place rides the neutral default vector.** There is no `"happy-place"` entry in `SITE_VECTORS`; `vectorForSite("happy-place")` returns `DEFAULT_VECTOR`. This is the documented generic fallback, not customer-specific code, and it still produces a meaningfully different profile (KNOWLEDGE vs TRADES) through the identical planner. Flagging because the A7 "two meaningfully different profiles" claim rests on default-vs-explicit here, not on two explicit entries. If the coordinator wants both tenants on explicit operating points, that is a data addition to `site-vectors.ts`, not a compiler change.
2. **No presentation-intent directives fired** for either tenant (applied 0, unresolved 0), so the compiler digest equals the final served-spec digest in both cases. The `applyPresentationIntent` layer is exercised in the run but is a no-op on current projection data.
3. **Scope of the proof:** the digest/diff proof covers the server pipeline (projection load -> verify -> plan -> intent layer). Hero media selection (`heroMediaFor`) and client rendering (`BuildClient`/`ObjectRail`) are shared generic code verified only via the live-HTML featured-object cross-check, not re-executed.
4. **Theme tokens are identical** (0 token differences) between the two specs; all material differences come from pages, section sets/order, presence, and archetype vocabulary.

## Evidence files (this directory)

- [report.md](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/report.md) (this file)
- [grep.log](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/grep.log) — full 45-line tenant-literal grep
- [phase1-jest.log](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/phase1-jest.log) — full scratch-run output (1/1 passed)
- [structural-diff.md](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/structural-diff.md) — repo module's own rendered diff report
- [tenant-happy-place.json](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/tenant-happy-place.json) — digest, vector, policy, pages, featured object
- [tenant-coppersmith-plumbing.json](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/tenant-coppersmith-plumbing.json) — digest, vector, policy, pages, featured object
- [curl-extracts.md](sandbox://workspace/fyd-lane/builder/evidence/2026-09-22-phase1-one-compiler/curl-extracts.md) — live-HTML featured-object cross-check extracts (both 200)

## Verdict: ONE COMPILER PROVEN

Zero class-(b) customer-specific branches in `src/fyd/builder/`, `src/fyd/tenant/`, `src/app/build/`. One shared pipeline (`BuildSitePage` -> `getPingObjectGraph` -> `verifyObjectGraph` -> `planSite` -> `applyPresentationIntent` -> validate -> `BuildClient`) serves both tenants at planner `fyd-site-planner@1`. The two SiteSpecs differ materially (different digests, page sets, section order/sets, presence, archetype vocabulary KNOWLEDGE vs TRADES), with the live HTML confirming each tenant's featured object. Named non-defect observations in section 4; recommended follow-up for the coordinator: decide whether happy-place should get an explicit `SITE_VECTORS` entry or keep riding the documented neutral default.
