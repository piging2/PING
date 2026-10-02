# FYD-025 closure — semantic determinism as permanent canonical regression

Date: 2026-09-27. Implementer: FYD-025 subagent. Lane: `~/workspace/fyd-build`, branch `fyd-025-semantic-determinism` (from `590c640` on `fyd-026-claim-classifications`), local commit only, never pushed.

## Verdict: PASS (re-proved, not anchored)

The 2026-09-21 frontier claim ("semantic determinism PASS": same graph + SiteSpec + viewer context + renderer version -> same semantic render model) **re-proves against the current lane**. The old claim was not overstated and the lane has not regressed: the absorbed render model, run through the CURRENT lane's render path (resolveQuery + FYD-010 visibility gate + FYD-012 binding verifier), produces byte-identical canonical models across separate processes, and the served HTML is byte-stable across renders.

## 1. Harvest notes (harvest before writing)

- **Definition source**: `~/workspace/fyd-lane/repo/render-model.ts` — the FYD-012 semantic render model behind the frontier claim (`website-builder-authority-decisions.md:134`, "semantic determinism green"). Absorbed **verbatim** into `src/fyd/sitespec/render-model.ts`; no second determinism definition invented. Import shape adapted to this lane (`../components/renderer`, `./types`, `../visibility/policy`).
- **Frontier test shape**: `~/workspace/fyd-lane/repo/render-model.test.ts` + `determinism-probe.ts` (two separate probe processes, byte-identical canonical outputs; owner-overrides explicit-input tests; canonicalizeOverrides order-insensitivity). Ported to `src/fyd/sitespec/__tests__/render-model.test.ts` + `__tests__/determinism-probe.ts`. The frontier's `tsx`-spawned probe was replaced with the lane's own `tsc` (tsx is not a lane dependency): the test compiles the probe from current source on every run, so source drift can never desync the probe from the lane.
- **FYD-023 generator determinism** (adjacent harvest): `src/fyd/proceduralize/__tests__/generator.test.ts` ("same graph produces byte-identical specs", reorder-stability, pinned `generatedAt`). The new test reuses its pinned-input convention (`generatedAt: "2026-09-21T12:00:00.000Z"`, `eventSequences: [65, 83]`) and does not duplicate its assertions.
- **FYD-022 volatility note**: `observed_at` is compiler-set volatile; the fixture pins it (`"2026-09-22T15:35:00Z"`), and the render model never reads it (records objectIds/headings/copy only). `asOf` is the single pinned time input.

## 2. Re-proof diagnosis (what the test said about the current lane)

First real run (after two test-harness path bugs, not lane bugs): 5/5 PASS. Repeated 3 more times: 5/5 each time, including the two-process byte comparison. No lane regression, no overstated claim.

Documented adaptations from the frontier (in the file header, minimal):
- `FieldVisibilityDecision` lived in a frontier `sitespec/field-visibility` module that does not exist in this lane; the shape is harvested from the frontier's own usage (objectId, field, policy, decidedBy, decidedAt, source, version; policies `"hide"|"show"|"coarse"`) and defined locally. The model still records owner overrides explicitly, per the frontier definition.
- This lane's `resolveQuery` takes a fourth arg (FYD-010 visibility `Viewer`, default `VISITOR_VIEWER`). The absorbed `buildSemanticRenderModel` maps `ViewerContext` onto it explicitly (`viewerForContext`: mode `"visitor"`, the render path's default gate; viewerId/displayName carried through, never dropped) so the model stays a pure function of its declared inputs and exercises the same visibility path the served page does.
- `RENDERER_VERSION` stays `"renderer.tsx@unversioned"` — renderer.tsx still carries no version constant (gap from 2026-09-21, still true; verified by grep). The pin is the file's own `RENDER_MODEL_VERSION` + `RENDERER_VERSION` constants, asserted by the test.

Hazard sweep of the current render path (grep over components, sitespec, visibility, proceduralize, why, claims): **zero** `Date.now` / `Math.random` / `new Date(` / `crypto.random` / `hrtime` hits.

## 3. Delta (3 new files, nothing else touched)

- `src/fyd/sitespec/render-model.ts` (+~230 lines): the absorbed semantic render model.
- `src/fyd/sitespec/__tests__/determinism-probe.ts`: two-process probe (compiled by the test, run under plain node twice).
- `src/fyd/sitespec/__tests__/render-model.test.ts` (+~290 lines): the permanent regression — 5 tests:
  1. two separate probe processes -> byte-identical canonical models + version/time/viewer pins asserted;
  2. model sanity (spec-order pages, resolved object ids, canonicalize idempotent across JSON round-trip);
  3. owner overrides explicit input (same -> same, different -> different);
  4. canonicalizeOverrides order-insensitive, undefined/[] -> "none";
  5. served HTML byte-stable across two renders of the same pinned inputs (renderToStaticMarkup(SitePageView(...)) — the exact function `server/dev-server.ts` serves over HTTP).

## 4. Source != built != served binding

- **Source**: `src/fyd/sitespec/render-model.ts` at this commit.
- **Built**: `npm run build:server` (tsc + @/ alias rewrite -> `dist/`, gitignored) succeeds; `dist/src/fyd/sitespec/render-model.js` exports `buildSemanticRenderModel`/`canonicalizeModel`/`canonicalizeOverrides` with `RENDER_MODEL_VERSION=1`, `RENDERER_VERSION="renderer.tsx@unversioned"`.
- **Served**: canonical model sha256 (first 16) `19df4586aa86853b` — **identical** for the source-compiled probe and the `dist/`-built modules; `dist/`-built model idempotent across runs; served HTML byte-identical across renders (test 5).
- Scoping note: this lane serves pages at request time via `renderToStaticMarkup`, not from prebuilt HTML, so "served bytes stable across two builds of the same inputs" is exactly test 5. Build-toolchain byte-stability (is `tsc` output itself byte-stable across machines) is a different claim from semantic determinism and is out of scope here.

## 5. Suite / typecheck

- Full `npm test`: **41 suites / 316 tests green** (was 40/311 before; +1 suite, +5 tests).
- `npm run typecheck` (`tsc --noEmit`): clean.

## 6. Residuals (explicitly out of scope, not fixed)

- `RENDERER_VERSION = "renderer.tsx@unversioned"` and `DESIGN_TOKEN_VERSION = "tokens@unversioned"` remain placeholder pins until the renderer/tokens lanes version their semantics (frontier gap, carried forward honestly, not papered over). The regression fails closed if renderer semantics change without a `RENDER_MODEL_VERSION` bump only insofar as the model bytes change — a semantic-change tripwire, not a version-change detector.
- `FieldVisibilityDecision` policy vocabulary is the three frontier-evidenced policies; a future fourth policy extends the local union.

## 7. Cost

No OpenRouter calls, no Copilot identities — deterministic work only. The $25 balance untouched. No pushes, no destructive git, no new authorities, no production touch (:3100 not booted or restarted).
