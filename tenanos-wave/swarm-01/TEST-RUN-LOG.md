# P-20260923-092 test run log (swarm-01, 2026-09-23 ~19:40 MDT)

Staged tree: `.jest-scratch/src/tenanos/` = the exact diff content
(tenant/*.ts + __tests__/tenant-kit.test.ts) plus a byte-verbatim copy of the
scoped config from branch tenanos-wave/integration
(`git show tenanos-wave/integration:src/tenanos/jest.config.cjs`, diffed identical).

Toolchain (local sandbox): node v24.20.0, jest + ts-jest + typescript 6.0.3
installed via npm in `.jest-scratch`. Pig worktree untouched (read-only `git show`).

Results:
- `npx jest --config src/tenanos/jest.config.cjs` → 1 suite, 14/14 tests pass.
  ts-jest strict diagnostics clean (0 errors).
- `npx tsc --noEmit -p tsconfig.check.json` (scoped-config tsconfig options:
  target ES2017, module commonjs, moduleResolution node, jsx react-jsx,
  esModuleInterop, strict, skipLibCheck; ignoreDeprecations 6.0 added for the
  local TS 6.0.3 toolchain only) → clean.
- `git apply --check` of diffs/P-20260923-092.diff against an empty git tree → OK.

One porting note: the test imports { describe, test, expect } from
'@jest/globals' because the scoped config's inline tsconfig sets no `types`
field, so the @types/jest globals fail with TS2304 under ts-jest diagnostics.
Config itself left untouched (P-20260923-001 owns it).

Re-verification 2026-09-23 ~19:52 MDT: the filed diff was regenerated from
kit-ts/ sources after a filename collision (see BOUNDARY-MAP.md addendum) and
re-applied to a clean tree; `npx jest --config src/tenanos/jest.config.cjs`
from the APPLIED tree: 14/14 pass. The tested bytes are exactly the diff bytes.
