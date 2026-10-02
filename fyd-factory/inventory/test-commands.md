# FYD test commands + measured baseline (2026-09-23, branch fyd-factory, dirty checkout)

## Exact commands

Per-lane committed configs (19 configs under src/fyd). Run from repo root `/home/nolan/projects/ping`:

```bash
# all FYD lane suites (one config per lane)
for cfg in $(find src/fyd -name 'jest.config.cjs' | sort); do
  npx jest --config "$cfg" --ci
done

# refresh lane (node built-in runner; repo jest has no TS transform for it)
node --test src/fyd/refresh/__tests__/*.test.ts
```

Canonical per TEST-GATE.md (`src/fyd/TEST-GATE.md`) equivalents for the lanes it pins:

```bash
npx jest --config src/fyd/ask/jest.config.cjs
npx jest --config src/fyd/adapters/activitypub/jest.config.cjs
node --test src/fyd/refresh/__tests__/*.test.ts
```

vitest history: the repo has vitest-era failures (FYD mobile tests fail on `@/motion/motionTokens` alias resolution, pre-existing) and per-lane jest configs are now canonical. The top-level `src/fyd/jest.config.cjs` is the builder lane config only (matches `src/fyd//__tests__/*.test.ts` + `src/fyd/ui/__tests__/placement.test.ts`), NOT the whole FYD suite. Root `npm test` runs bare `jest` with no FYD scoping; use the per-lane configs.

## Measured baseline (run 2026-09-24T00:20:48Z, node v22.23.2, npm 10.9.8)

| Lane | Suites | Tests | Pass | Fail | secs |
|---|---|---|---|---|---|
| adapters/activitypub | 1 | 9 | 9 | 0 | 1 |
| archetypes | 1 | 11 | 11 | 0 | 1 |
| ask | 8 | 124 | 124 | 0 | 3 |
| boundary | 1 | 6 | 6 | 0 | 2 |
| builder | 12 | 96 | 96 | 0 | 2 |
| components | 9 | 93 | 93 | 0 | 3 |
| customize | 2 | 20 | 20 | 0 | 2 |
| identity | 8 | 75 | 75 | 0 | 2 |
| src/fyd (builder-lane root config) | 1 | 12 | 12 | 0 | 1 |
| media | 7 | 75 | 75 | 0 | 3 |
| net | 8 | 71 | 71 | 0 | 2 |
| object | 15 | 181 | 181 | 0 | 2 |
| placement | 2 | 16 | 16 | 0 | 1 |
| proceduralize | 9 | 82 | 82 | 0 | 4 |
| sitespec | 10 | 91 | 91 | 0 | 3 |
| spatial | 6 | 49 | 49 | 0 | 2 |
| tenant | 5 | 28 | 28 | 0 | 2 |
| ui | 10 | 229 | 229 | 0 | 2 |
| wiring | 1 | 8 | 8 | 0 | 1 |
| **JEST TOTAL** | **116** | **1276** | **1276** | **0** | **~41** |
| refresh (node --test) | 4 files | 4 | 0 | 4 | 1 |

Failing names (refresh lane): `conflict.test.ts`, `dependency-index.test.ts`, `diff.test.ts`, `website-observe.test.ts` — all 4 fail with `ERR_MODULE_NOT_FOUND` (e.g. `Cannot find module '/home/nolan/projects/ping/src/fyd/refresh/diff' imported from .../diff.test.ts`). Cause: the tests use extensionless relative imports (`../diff`, `../types`) which plain `node --test` ESM resolution cannot map to `.ts` files. This is a RUNNER artifact, not an assertion failure and not a code regression. Not fixed per LANE-ARCH rules.

## Caveats

- TEST-GATE.md requires the gate to run from a CLEAN worktree at a known SHA; this baseline ran in the dirty fyd-factory checkout (55 dirty entries), so dirty-lane edits are included. The gate's 2026-09-21 clean-worktree result was 116/116 (ask 36 + activitypub 9 + proceduralize/sitespec/components 50 + refresh 21).
- Refresh count discrepancy: node --test reports 4 top-level tests (one per file) in this environment vs the gate's 21; the files did not execute far enough to run subtests.
- Total wall time for the full FYD jest set is ~41 seconds; well under the 5-minute budget.
