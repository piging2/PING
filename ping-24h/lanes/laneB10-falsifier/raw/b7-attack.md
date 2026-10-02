# Lane B10 falsifier attack notes: Lane B7 (Mission Control observability)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB7-mission-control/report.md (273 lines).
Audit of Mission Control UI code (page.tsx 1219 lines) and APIs.

## Critical methodological problem

### FALSIFIED: Worktree vs HEAD confusion
- **Audit basis claims**: "Audited: source tree on the Pig WSL, /home/nolan/projects/ping, HEAD 0264d517 (verified via ssh, matches T+0 reobservation)."
- **Falsification section admits**: "this audit read the worktree files as-is and cites line numbers above, but did not diff worktree vs HEAD file-by-file."
- **Problem**: Lane 9 established the worktree had a "stamped dirty batch 2026-09-27 22:55-23:00 MDT: 144 files (74 modified, 70 untracked)." B7 read the dirty worktree but claims HEAD.
- **Concrete contradiction**: B7's HOLD section states "The 409 HOLD on duplicate POST of an in-flight/UNKNOWN mission exists in dispatch/route.ts:344-353." B3 and B4 independently verified ZERO occurrences of "409", "findPriorMission", or "MISSION_TERMINAL_STATUSES" in the committed tree at 9a555021 and HEAD 0264d517. B7's 409 finding describes worktree state, not HEAD.
- **Impact**: The HOLD section's "PARTIAL" verdict (409 exists but not projected) is wrong for HEAD. At HEAD, 409 does not exist at all. B7's line citations (344-353) cannot be verified against HEAD.

## Verified (live observations)

### CONFIRMED
1. **HEALTH probe finding**: B7 did a live GET of http://127.0.0.1:8080/health and observed HTTP 200 with body `{"status":"unhealthy", "event_governance":{"status":"degraded", "violations":{"NAMESPACE_VIOLATION":1704}}, "embedding":{"status":"not_initialized"}}`. This is a live observation, not code reading. The finding that MC's technology/route.ts probes check HTTP 200 and discard the body is a code-level claim that is plausible but not independently re-verified here.

2. **"RECONCILIATION IN PROGRESS" with no reconciler**: B7 cites page.tsx:1160,1186 and mc-dispatch.ts:404. The claim that no reconciler exists is consistent with B3/B4 (no agents/route.ts at HEAD, reconciliation_state is write-only). The MISLEADING verdict is well-founded.

## WEAKENED

### W1. Code verdicts may describe worktree, not HEAD
- All line citations (page.tsx:1160, MISSION_STATUS_BADGE, technology/route.ts svcChecks, etc.) are "worktree files as-is." Given the 144-file dirty batch, any of these could differ from HEAD.
- B7's falsification section acknowledges this but the report's verdicts are stated as if they describe HEAD ("Audited: ... HEAD 0264d517").
- The 16-item consolidated gap list mixes live observations (health body) with worktree code readings. The code-reading items inherit the worktree-vs-HEAD uncertainty.

### W2. Served vs audited gap
- B7 explicitly states "NOT audited: the served :3100 build (stale ~17.5h)." All verdicts describe worktree code.
- The UI a viewer actually sees may be older than what B7 describes. B7 is honest about this, but it means the observability audit does not describe the observable system.

### W3. The 7 MISLEADING findings are worktree-dependent
- Findings 1-7 (RECONCILIATION IN PROGRESS, health probes, PROVEN badges, status badges, reverse-trace title, RUNNING from dir, invoke-time authorization) are all code-reading verdicts from the worktree.
- If the worktree differs from HEAD at those lines, the findings may not apply to the committed tree.
- Finding 2 (health probes) is the strongest because B7 verified the live /health body showing the exact degradation the probe would miss. The code flaw is plausible and the live evidence supports it.

## STRONGEST SURVIVING
- The HEALTH finding (live /health body shows unhealthy/degraded/not_initialized while MC probes 200-OK). This is a live observation, not worktree-dependent. The 1704 NAMESPACE_VIOLATION rejections match the JEV namespace incident from the LEDGER.
- The "RECONCILIATION IN PROGRESS" MISLEADING verdict. No reconciler exists (confirmed by B3/B4), so the UI text asserts a process that does not exist. This holds regardless of worktree vs HEAD.
- The approvals ABSENT finding (no UI for /api/mc/approvals). This is a structural observation likely to hold across worktree/HEAD.

## WEAKEST LINK
- Worktree vs HEAD confusion. B7 claims to audit HEAD 0264d517 but admits reading "worktree files as-is" without diffing. The 409 HOLD finding (dispatch/route.ts:344-353) directly contradicts B3/B4's HEAD verification. The audit basis is methodologically unsound.

## Verdict lines
- STRONGEST SURVIVING: The live HEALTH probe flaw (200-OK with body saying unhealthy/degraded, 1704 NAMESPACE_VIOLATION); the "RECONCILIATION IN PROGRESS" text with no reconciler existing.
- WEAKEST LINK: Worktree vs HEAD confusion. The report claims HEAD 0264d517 but read the dirty worktree (144 files); the 409 HOLD citation (route.ts:344-353) contradicts B3/B4's HEAD verification of zero occurrences.
- FALSIFIED: The HOLD section's "409 HOLD exists in dispatch/route.ts:344-353" as a HEAD claim. B3 and B4 verified absence at HEAD and at 9a555021. B7's finding describes uncommitted worktree state.
- WEAKENED: All code-reading verdicts (MISLEADING findings 1-7, gap list items) inherit worktree-vs-HEAD uncertainty; the served UI (stale 17.5h) was not audited, so verdicts do not describe the observable system.
