# TASK J REPORT: T-19 runbook (J-1) + secret scan (J-2)

Lane: J (read-only observation lane, 100-hour execution sprint)
Date: 2026-09-28 ~19:40 MDT
Method: pigwsl SSH, read-only commands only (ls, grep, git status, find, cat). No suite executed. No writes to any product tree.
Canonical tree observed at: /home/nolan/projects/ping, HEAD f877c3919941978f07d5014909595df4751ec258
Note: task brief cites Phase 1 frozen at af7d2688; observed HEAD is f877c391. Flagging the difference, no action taken.

## J-1 VERDICT: NO EXACT 195-TEST FLOOR DEFINITION EXISTS IN THE CANONICAL TREE

The string "195" appears nowhere in package.json scripts, TESTING.md, jest.config.cjs, docs/, scripts/, README.md, or DESIGN-write-boundary.md in any test-floor sense (all incidental hits are hashes, digests, and media IDs). There is no .github/workflows directory at all. There is no vitest config; jest is the only runner.

The canonical test entry point, as defined by TESTING.md and the jest.config.cjs header:

EXACT COMMAND: `npx jest` (from repo root). `npm test` runs the identical thing (`"test": "jest"` in package.json scripts).

SCOPE: every suite under `<rootDir>/src/**/__tests__/*.test.{ts,tsx}` (ts-jest transform, node test environment, `@/` mapped to `src/`, CSS imports stubbed via `jest/css-stub.cjs`). 222 test files currently on disk under src/.

Last documented full run (TESTING.md, 2026-09-27 via `npx jest`): 207 suites, 196 passed, 11 failed; 2230 tests passed, 22 failed. The 11 failing suites are listed as pre-existing in TESTING.md (binding-verifier refusals, media/projection drift, KV CAS enforcement, etc.).

RUNTIME ESTIMATE: none evident. TESTING.md records no duration for the full run. The suite was NOT executed in this lane per instructions.

Per-area configs exist (26, e.g. `npx jest --config src/fyd/customize/jest.config.cjs`) for lane-local iteration; the root config is the standard. Variants in package.json scripts: `test:compiler` (jest --testPathPattern=compiler), `test:media-invariant` (tsx script), `test:oauth` (jest --testPathPatterns=oauth). None of these is the 195-test floor; the floor exists only as a planning reference in sprint artifacts (SPRINT_100H_PRIORITIES.md P18 reinstated it as a gate; T-19's own DONE EVIDENCE runbook deliverable does not exist yet, per the h00-02 lane F/R reports).

### suppressHydrationWarning pin check (J-1b)

CONFIRMED from the canonical tree, matching the two earlier lanes' zero finding:

- The one-liner exists at src/app/layout.tsx:75:
  `<html lang="en" suppressHydrationWarning className={...} style={{ colorScheme: 'dark light' }}>`
  Exactly 1 occurrence in the file.
- src/app/layout.tsx is modified in the canonical working tree (` M src/app/layout.tsx` in git status).
- Zero test files reference suppressHydrationWarning: grep across /home/nolan/projects/ping/src for *.test.ts / *.test.tsx returned no matches.

So the modified one-liner at layout.tsx:75 is NOT pinned by any test.

## J-2 VERDICT: INCONCLUSIVE (identifiers present, all test/canary/doc fixtures; no live-value evidence sought or found)

The worktree is at /home/nolan/projects/ping-lane-l-broker (registered git worktree of the canonical repo, branch lane/l-secret-broker, HEAD e48ef710). It is NOT under /home/nolan/worktrees.

src/lib/secrets/ there is UNTRACKED (`?? src/lib/secrets/` in git status), confirming lane R. Directory listing, filenames and sizes only:

- README.md: 2622 bytes
- jest.config.cjs: 692 bytes
- secret-broker.ts: 15271 bytes
- __tests__/secret-broker.redteam.test.ts: 14056 bytes

NOTABLE: the identical untracked directory also exists on disk in the canonical tree at /home/nolan/projects/ping/src/lib/secrets/ (`?? src/lib/secrets/`, same filenames and byte sizes, file dates Sep 27 21:35 vs Sep 23 20:44 in the broker worktree). It is untracked in both places.

Key-NAME scan (names only; no values read, quoted, stored, or transmitted):

- GITHUB_CONN_TOKEN: found in README.md only (documentation context).
- TEST_CONNECTOR_TOKEN: found in __tests__/secret-broker.redteam.test.ts only (TEST_ prefix fixture).
- CANARY_SECRET_VALUE_9f8e7d6c5b4a: found in __tests__/secret-broker.redteam.test.ts only (CANARY_ prefix; the hex suffix is part of the identifier name as matched, not a separately extracted value).
- PASSWORD / BEARER / CREDENTIAL / *_KEY names: zero matches anywhere under src/lib/secrets/.
- Structural check: zero lines in the redteam test match a direct `TOKEN ... =` literal assignment pattern (count only, no lines printed).

Why INCONCLUSIVE and not PRESENT: every secret-like identifier found is a test fixture, canary, or documentation reference inside a secret-broker module and its redteam test suite. That is consistent with a secrets-handling component's own fixtures, not with leaked live credentials. I did not open any file's values, per the lane's hard boundary, so I cannot affirm or rule out live secret values. If a verdict on live values is needed, that requires a separate authorized review that reads values under credential-handling rules.

## Files written by this lane

- ~/workspace/ping-24h/sprint/h02-06/J-T19-SECRETS.md (this report; the lane's only write)

## Open questions / follow-ups for the parent

1. T-19's runbook deliverable (floor inventory + exact rerun command) still does not exist as an artifact; the closest canonical definition is `npx jest` per TESTING.md. If the 195-test floor is meant to be a specific subset, its exact scope needs to be authored, not discovered.
2. The untracked src/lib/secrets/ directory now exists on disk in the FROZEN canonical tree (Sep 27 21:35), not only in the lane-l-broker worktree. Decide whether it belongs there or should be removed/tracked.
3. Observed canonical HEAD f877c391 vs the brief's Phase 1 freeze pin af7d2688; confirm which pin is authoritative.
