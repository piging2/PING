# FYD canonical test gate rerun — 8a99742

Date: 2026-09-21 ~09:40 MDT
Branch: fyd/sitespec-generator
Commit: 8a99742 ("fyd(mobile): prevent 320px overflow in Ask FYD design-token row")
Full SHA: 8a997421ef5f121f114d948c693391f1a9c7c66e
Worktree: /tmp/fyd-canon2 (fresh detached HEAD at 8a99742; stale 5c84fe2 worktree removed first via `git worktree remove --force`)
Env: node v22.23.2, npm 10.9.8 (matches TEST-GATE.md)
Gate doc: /home/nolan/projects/ping/src/fyd/TEST-GATE.md
Main checkout: untouched (no stage/commit/modify; pre-existing dirty files left alone)

## Temp config
/tmp/fyd-temp.config.cjs ALREADY EXISTED (dated 2026-09-21 06:20, rootDir=/tmp/fyd-canon2). It was NOT recreated. Its transform block mirrors the ask config's ts-jest inline options exactly (target ES2017, module commonjs, moduleResolution node, jsx react-jsx, esModuleInterop, strict, skipLibCheck); testMatch covers proceduralize, sitespec, components lanes. The fresh worktree was created at the same /tmp/fyd-canon2 path so the config works as-is.

## Setup commands (via Pig bridge: ~/workspace/pig/pigwsl-run.sh '<cmd>' < /dev/null)
```
git worktree remove --force /tmp/fyd-canon2
git worktree add --detach /tmp/fyd-canon2 8a99742
cd /tmp/fyd-canon2 && npm ci --no-audit --no-fund     # 732 packages, 15s, deprecation warnings only
```

## Results

| Suite | Command | Discovered | Pass | Fail | Skip | Exit |
|---|---|---|---|---|---|---|
| ask | npx jest --config src/fyd/ask/jest.config.cjs | 36 | 36 | 0 | 0 | 0 |
| activitypub | npx jest --config src/fyd/adapters/activitypub/jest.config.cjs | 9 | 9 | 0 | 0 | 0 |
| proceduralize + sitespec + components | npx jest --config /tmp/fyd-temp.config.cjs | 81 | 72 | 9 | 0 | 1 |
| refresh | node --test src/fyd/refresh/__tests__/*.test.ts | 21 | 21 | 0 | 0 | 0 |
| TOTAL | | 147 | 138 | 9 | 0 | gate FAIL |

## Suite 4 failure detail (exit 1)

9 passing suites: structured-determinism, structured-data, regression-corpus, proceduralizer, feed-parser, patch (proceduralize); schemas, validator, graph (sitespec).

6 failing suites, all introduced by commit c5188f9 ("fyd: close renderer projection boundary (safe links, binding verifier, owner visibility, determinism)"), which committed tests and a renderer change against source modules that were never committed:

1. FAIL src/fyd/sitespec/__tests__/safe-link.test.ts — suite failed to run:
   `Cannot find module '../safe-link'` — src/fyd/sitespec/safe-link.ts does not exist at this SHA.
   (An uncommitted draft exists at ~/workspace/fyd-lane/safe-link.ts; it was never committed.)

2-5. FAIL src/fyd/sitespec/__tests__/render-model.test.ts, src/fyd/proceduralize/__tests__/generator.test.ts,
   src/fyd/components/__tests__/render.test.ts, src/fyd/components/__tests__/projection-boundary.test.ts —
   suite failed to run:
   `Cannot find module '../sitespec/field-visibility'` imported by src/fyd/components/renderer.tsx:19.
   No field-visibility module exists anywhere in the tree at this SHA.

6. FAIL src/fyd/sitespec/__tests__/bindings.test.ts — 9 tests failed, all with:
   `fixture has no location object`
   The helper findLocationObject() (bindings.test.ts:17-21) looks for an object whose schema includes "location" in the COPPERSMITH_GRAPH fixture; no such object exists. Failing tests:
   - traces a real location value: value -> object field -> evidence ref
   - fails closed: direct claim with an empty evidence ref
   - fails closed: field name not present on the object
   - fails closed: generated claim without a generatorRef
   - fails closed: title without object provenance ref
   - passes: generated claim with a name@version generatorRef
   - passes: derived and owner_authored claims of present evidence
   - passes: title binds as an object-level factual identity field
   - passes: description binds as an object-level factual identity field

Raw suite-4 log saved at /tmp/fyd-gate-suite4.log on the Pig (ephemeral).

## Anomalies
- Temp config was NOT recreated; it already existed with rootDir=/tmp/fyd-canon2, so the worktree was placed at that same path. The task's suggested /tmp/fyd-gate-8a99742 was not used.
- Stale worktree from the prior gate run (5c84fe2) existed at /tmp/fyd-canon2 and was removed via `git worktree remove --force` before re-adding at 8a99742.
- First run of suite 4 showed "EXIT:0" due to measuring `$?` after `tail` in a pipe; reran with proper exit capture → real jest exit 1. Counts are from the correct run.
- Node/npm versions match the gate doc exactly.
- No code was fixed; no retries beyond one correct re-run of the exit-code capture.
