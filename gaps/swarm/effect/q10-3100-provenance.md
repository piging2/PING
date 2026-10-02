# Q10 — :3100 provenance (EFFECT SWARM, 2026-10-01 ~18:24-18:35 MDT, read-only)

## Served-plane status
- 2026-10-01 18:00-18:03 MDT: :3100 observed NOT listening (journal-path proof note, MEMORY.md).
- 2026-10-01 18:24:56 MDT (this probe): :3100 LISTENING on *:3100, pid 46070.
  No restart occurred between the two observations per the restart log
  (last RESTART-OK 2026-09-30T23:59:20Z). The 18:00 "down" vs 18:24 "up"
  discrepancy is UNEXPLAINED: pid 46070's /proc start is 2026-09-30 17:59:17 MDT,
  so the same process was alive across the "down" window. Likely a reachability
  (vantage/interface) artifact, not a process death. UNKNOWN cause.

## Exact SHAs
- Served (process env FYD_BUILD_SHA + /api/readyz commitSha): `300c9c91cc45dc08bc36f9b7f7f1be2f4cb64efc`
  ("P0-2: bind tenant at proposal creation (TENANT IS IMMUTABLE PROPOSAL CONTEXT)")
- Tree HEAD at probe: `4ad9a7a3fc7e6276f7147388bfefd597408682bf`
  ("fix: route dispatch events through canonical journal", committed 2026-10-01 18:24:10 MDT,
  ~1 min before this probe; journal swarm's follow-up commit 6405011d landed after)
- Served SHA is an ancestor of probe-time HEAD; exactly 1 commit behind.
- Working tree dirty at probe: `M src/app/api/mc/approvals/route.ts` + untracked `mc-approval/__pycache__/`, `mc-approval/tests/__pycache__/`, `var/`.

## Build artifacts
- `.next/BUILD_ID` = `wmdVaJhvdIklbqJCZw9i9`, mtime 2026-09-30 17:58:59 MDT.
- /api/readyz: `{"buildId":"wmdVaJhvdIklbqJCZw9i9","commitSha":"300c9c91...","builtAt":"2026-09-30T23:58:59.750Z"}` — buildId, commitSha, builtAt all mutually consistent and matching the restart-time HEAD. Build-identity seam (FYD_BUILD_SHA, added 2026-09-28) works as designed.
- Build is ~20s older than process start (17:59:17 MDT): served bytes were built from the served SHA, not stale from an earlier tree.

## What start-3100.sh would launch (read, not run)
`cd /home/nolan/projects/ping-fyd-converged && exec npm start -- -p 3100` (i.e. `next start`, serves existing `.next`, does NOT rebuild), with:
- `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` (runtime env; note: no literal `FYD_DEMO_OWNER_MODE` string found in `.next/static` — the flag is consumed server-side; whether the 9/30 build baked the NEXT_PUBLIC value is unverified from these artifacts)
- `FYD_BUILD_SHA=<HEAD at restart time>` (provenance binding)
- `FYD_CUSTOMIZE_GATEWAY_URL=http://127.0.0.1:18200/events`, `FYD_JOURNAL_GATEWAY_URL=http://127.0.0.1:18200` (points at the :18200 fork gateway, whose journal file is STALE since 2026-09-30 16:04 MDT)

## "Tested source"?
- Served commit 300c9c91 ships test files (mc-approval/tests/test_approval_tenant.py, mc-approval-gate.test.ts) but NO record of a test run against it exists (no CI, no test-results artifacts, no jest config in package.json). Tests present ≠ tests run green.
- Rebuild from current tree is mechanically achievable (`npm run build` then the blessed script), but "tested" cannot be claimed: jest was not run in this lane (read-only; running the suite is a verification step for the rebuild lane).

## Verdicts
- Q10a "served bytes correspond to a known source SHA": PASS (readyz+env+BUILD_ID+mtime all bind served bytes to 300c9c91).
- Q10b "served = current tree": FAIL — served is 1 commit + dirty worktree behind the tree. Any fix landed after 2026-09-30 17:59 MDT (incl. the journal truth-split convergence) is NOT in the served bytes.
- Q10c "served = tested source": UNKNOWN — no test-execution evidence for the served SHA.
- Q10d "rebuild from tested source achievable now": PARTIAL — mechanically yes; "tested" unverified.
- Served-plane at 18:00-18:03: was reported down; at 18:24:56 MDT is UP. Cause of the earlier observation: UNKNOWN.

## Smallest fix if FAIL
Rebuild + restart via the blessed path once the tree is green: `npm run build` in the tree, run jest, then `/home/nolan/start-3100.sh` (records new HEAD in FYD_BUILD_SHA + restarts.log). Do NOT hand-start.
