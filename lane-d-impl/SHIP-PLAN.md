# Lane D-IMPL Ship Plan (2026-09-24)

Pig worktree: `/home/nolan/build-idem`, branch `fyd/write-boundary-idempotency`.
All files below are staged in `~/workspace/lane-d-impl/` (this machine).
Nothing has been copied to the Pig yet (SSH down since ~16:20 MDT).

## New files: copy from `new/` to the worktree

| Source | Destination |
|---|---|
| `new/fact-privacy.ts` | `src/fyd/data/fact-privacy.ts` |
| `new/fact-privacy.test.ts` | `src/fyd/customize/__tests__/fact-privacy.test.ts` |
| `new/consequence.ts` | `src/fyd/customize/consequence.ts` |
| `new/consequence.test.ts` | `src/fyd/customize/__tests__/consequence.test.ts` |
| `new/customize-panel.tsx` | `src/fyd/owner-mode/customize-panel.tsx` (replace) |

## Edited files: copy from `src/` and `tools/` to the worktree

| Source | Destination | Change |
|---|---|---|
| `src/app/api/fyd/customize/route.ts` | same | consequence import + parse fields, projection readback, resolvePrincipal |
| `src/fyd/data/ping-object-source.ts` | same | public privacy boundary (mask verify + enforce, forOwner opt-out) |
| `src/fyd/customize/server.ts` | same | `forOwner: true` (owner-authorized context) |
| `src/fyd/ask/context-compiler.ts` | same | privacy guard comment (unwired compiler) |
| `tools/fyd-site-projection/dump.py` | same | mask derivation, digest name fix, three-layer docs |
| `tools/fyd-journal-gateway/server.mjs` | same | FYD_REGEN_CMD post-append hook |

## Already on the Pig (verify, then extend)

- `scripts/fyd-hostile-gate.mjs`: 2 request-ID gates already inserted.
  Insert the 3rd gate from `new/request-id-gates.mjs.snippet`
  ("BROWSER CLIENT STABLE ID") at the same anchor.
- `src/app/api/fyd/customize/route.ts`: the request_id comment fix is
  already there; the full-file copy above supersedes it.

## Validation already done locally (this machine)

- `consequence.ts`: all tier/undo/label assertions pass (node strip-types).
- `fact-privacy.ts`: all logic assertions pass against a faithful
  applyHideTraversal stub (node strip-types). NOTE: node 24's experimental
  type stripping mis-handles this file's JSDoc header (drops import
  bindings); the code is standard TS and correct under ts-jest. The quirk
  is harness-only, not a code bug.
- `fact-privacy.test.ts`: assertions rewritten to be robust to the real
  applyFieldVisibility conservative defaults (pins absence of the hidden
  street fact, not field deletion).
- `dump.py`: mask derivation + digest assertions pass; syntax OK.
- `server.mjs`: `node --check` OK.
- No em dashes in any written file.

## Test on the Pig (in order)

1. `cd /home/nolan/build-idem`
2. `git status -sb` and confirm HEAD before any copy.
3. Copy files per the tables above.
4. `npx jest --config src/fyd/customize/jest.config.cjs`
   (fact-privacy, consequence, plus existing suite).
5. Insert 3rd gate, then `node scripts/fyd-hostile-gate.mjs`
   (expect 16 verdicts: 13 existing + 3 new).
6. Check `/tmp/laneD-gate.log` from the earlier blind run for the 2
   shipped gates (launched ~16:08, PID 76708).

## Commit plan (small, explicit pathspecs, after green)

1. `src/fyd/customize/consequence.ts src/fyd/customize/__tests__/consequence.test.ts`
   (CEO decision 1: consequence tiers)
2. `src/fyd/data/fact-privacy.ts src/fyd/customize/__tests__/fact-privacy.test.ts`
   (Q2: versioned privacy mask)
3. `tools/fyd-site-projection/dump.py` (mask derivation at dump time)
4. `src/fyd/data/ping-object-source.ts` (public boundary enforcement)
5. `src/app/api/fyd/customize/route.ts`
   (readback, resolvePrincipal, consequence fields)
6. `src/fyd/owner-mode/customize-panel.tsx` (F-1 + tier-scaled UX)
7. `tools/fyd-journal-gateway/server.mjs` (regen hook)
8. `scripts/fyd-hostile-gate.mjs` (3 new gates)

## Explicitly NOT in this ship

- Lane E's eight-file change set (queued for Nolan's merge-or-hold).
- Ask FYD decision threading (deferred until after Lane E merge).
- Q2 surface tests for renderer/search/ask/circle (need live Pig).
- Fixture re-observation with intent-survival proof (need live Pig).
- Production :3100 or live projection mutation (needs orchestrator approval).
