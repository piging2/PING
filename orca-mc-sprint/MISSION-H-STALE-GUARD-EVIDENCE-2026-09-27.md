# MISSION H — Flaw D Stale-State Guard — Evidence Record (2026-09-27 ~20:22-21:05 MDT)

## SHAs (re-observed at start)
- Pig /home/nolan/projects/ping, branch fyd/sprint-integration-2026-09-24, HEAD 4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9
- Monorepo ~/workspace p0/approval: b96e7d2 (workspace HEAD cf4442f)
- Patch is UNCOMMITTED in the Pig worktree (per mission: never bare git commit, no push)

## GUARD LOCATION
`src/fyd/customize/server.ts` — the single journaling point for approved overlays
(route.ts handleApprove/handleClear + scoped-stores scopedEmitOverlayEvent all funnel through it).
- `StaleGuardPrecondition` interface — server.ts:254
- `StaleGuardError` (codes STALE_APPROVAL / PRECONDITION_CHANGED) — server.ts:276
- `verifyStaleGuard(siteId, ops, expected, readBaseState?)` — server.ts:305
- Guard invocation inside `emitOverlayEvent`, immediately before the POST — server.ts:377-384
- `EmitOverlayOpts.staleGuard` / `staleGuardReadBaseState` (test-only seam) — server.ts:219-225
- Route wiring (precondition capture in derive, guard pass in execute, 409 mapping) —
  `src/app/api/fyd/customize/route.ts`:467 (staleGuard), :492 (StaleGuardError -> 409)
- New tests: `src/fyd/customize/__tests__/stale-guard.test.ts` (10 tests)

Drift key: baseSpecDigest = sha256(canonicalize(base compiled spec)) from loadCustomizedSite,
the exact bytes applyPresentationIntent layers the overlay over. specDigest recorded for
evidence only (a second independent approval landing first changes the layered digest
without moving the base; must not false-positive).

## FAIL-BEFORE (temporary test, since deleted)
`stale-guard-failbefore.test.ts`: synthetic approval against base B1, synthetic drift to B2,
current emitOverlayEvent (no precondition field exists). Result: PASS — the POST executed
(1 POST to the in-test fake gateway, event recorded), no complaint. Hostile path UNGUARDED.

## PASS-AFTER
`npx jest --config src/fyd/customize/jest.config.cjs` — 7 suites, 117 tests, ALL PASS
(107 pre-existing + 10 new stale-guard tests).
- drift -> StaleGuardError STALE_APPROVAL, fake gateway received 0 POSTs
- no drift -> executes normally (event recorded, 1 POST)
- rebased proposal digest / op count change / authority swap -> PRECONDITION_CHANGED
- clear op: base check applies, no proposal check
- no staleGuard opt -> executes normally (backward compatible)
- scoped tsc --noEmit over both patched files: zero errors in patched files
  (one pre-existing CSS-module declaration error in untouched src/fyd/ui/object-circle.tsx)

## Q-P0-04 REGRESSION CHECK
- New test: wrong journal marker + staleGuard present -> WRONG_JOURNAL (not StaleGuardError), 0 POSTs.
  Preflight order unchanged: preflightJournal() still runs first in emitOverlayEvent.
- Full customize suite green (above). Real demo journal untouched:
  sha256 6f6c75f12969471688d1b5e26c86a30893bce38985b172016d47f303b0bd6e8f, 58 lines
  — matches the Q-P0-04 baseline exactly, before and after.

## HOSTILE TEST COVERAGE
- TOCTOU verify->write: `await verifyStaleGuard(...)` then synchronous envelope build then
  `await fetch(POST)` — no awaits between check and POST dispatch. Route path additionally
  holds the per-site lock across derive->execute. Residual (base moves after POST accepted,
  before next regen) is the projection/reconciler layer's domain — documented in code,
  not owned by this guard.
- Same-bytes: capture (route derive) and re-verification (guard) both use loadCustomizedSite's
  baseSpecDigest — the bytes the overlay applies over in this path.
- Authority spoof: op.approval.approvedBy compared against the approval-time precondition;
  spoofed op without matching precondition -> PRECONDITION_CHANGED, no write.

## AUTHORITY BOUNDARY
Apply path only. No approval-semantics change, no new event types, reconciler untouched,
no new authorities. handleClear and scopedEmitOverlayEvent behavior unchanged (guard opt-in).
