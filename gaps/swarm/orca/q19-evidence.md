# Q19 EVIDENCE — What did ORCA actually propose in the last 24h?

**Worker:** ORCA swarm (read-only forensics), 2026-10-01 ~18:24-18:35 MDT
**Window:** 2026-09-30 18:24 MDT → 2026-10-01 18:35 MDT (cutoff 2026-10-01T00:24:00Z)
**Verdict:** NONE. No persisted ORCA proposal exists in the last 24h in any searched plane.

## Planes searched (all read-only)

| # | Plane | Path / endpoint | Result |
|---|-------|-----------------|--------|
| 1 | Canonical journal (:18199) | `/home/nolan/projects/ping/data/fyd-journal/events.jsonl` (66 events; gateway confirms journal `fyd-demo-journal@8d6956c1caca`) | 0 mentions of "orca" (case-insensitive). 1 event in window: `JOURNAL_CONVERGENCE_PROBE` @ 2026-10-02T00:23:48Z, aggregate `mc:mission:probe-dispatch-muq7zt08` — written by the journal-swarm worker's convergence probe, not ORCA. |
| 2 | Fork journal J2 (fyd-journal-gateway) | `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` (200 events) | 11 "orca" mentions, ALL dated 2026-09-27T01:26–01:30Z: hermes-proof lane events referencing the `orca-adapter` transport spine (8-condition reached-path proof), not proposals. 0 events in window. |
| 3 | Fork journal J3 (:18200) | `/home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl` (journal `fyd-demo-journal@62f825e9dfee`) | 0 "orca" mentions. 0 events in window (newest: 2026-09-29T18:04Z). |
| 4 | Runtime DB (Postgres) | `lane-e-pg` container, db `t06peek`, table `ping_events` | 1 event total, 0 in last 24h, 0 mentioning orca. (`ping-postgres` holds `crx_runtime`, not mission state; no ping_missions table found in reachable DBs.) |
| 5 | Proposal artifacts | `/home/nolan/projects/ping/mc-approval/w4-proposal.json` | Dated 2026-09-27 21:34 MDT; FYD `site_patch` proposal (Happy Place Services reorder), not ORCA, outside window. |
| 6 | ORCA work dirs (mtime sweep) | `~/workspace/orca-mc-sprint/`, `~/workspace/orca-mc-convergence/`, `~/workspace/orca-dispatch-test/` | No files modified in window. |
| 7 | ORCA control-loop run evidence | `/home/nolan/worktrees/orca-autonomy/orca/control-loop/evidence/` | Last runs 2026-09-25 (8 run dirs, newest `run-2026-09-25T16-46-57-824Z`). No runs in window. |
| 8 | Live processes | Pig `ps aux \| grep -i orca` | No ORCA processes running. |

## What "ORCA" is (grounded)

- `/home/nolan/worktrees/orca-autonomy/orca/ORCA-ROLE.md` (2026-09-18): "ORCA = AUTONOMOUS ORCHESTRATION / COORDINATION AUTHORITY. ORCA is the planner... It owns no truth." Certification at definition time: **A0 (facade)**. A same-day coordinator claim of A5 exists in memory but is coordinator-reported, not independently verified.
- The control loop implementation lives in worktree `feature/orca-autonomy` @ `a2b2e9f1e9d5e8194f321356dbe22b345ee08c09` (2026-09-25). It is NOT part of the served product: the served Mission Control (`src/app/api/mc/agents/route.ts`) describes the "ORCA port lane" as pending/not-yet-wired ("hold, resume, cancel-future-work are NOT rendered until the ORCA port lane"; reconciler fields "pending the ORCA port-lane reconciler contract; exposed as null, not invented").
- Journal "orca" hits are the `orca-adapter` transport spine name (Hermes WSL bridge), not planner proposals.

## Honest boundary

The `ping_missions` table referenced by the Sep-18 `orca-audit2.js` (host 127.0.0.1:5432, user postgres) was not reachable in this pass: the :5432 listener maps to the `ping-postgres` container (`crx_runtime`/`crx_user`), and no reachable Postgres held a `ping_missions` table. If a mission store exists elsewhere, ORCA proposals recorded there were not observable. The journal (the canonical proposal-history plane per the swarm's own priority ordering) is fully covered above.

## Answer

**Q19: NONE.** No persisted, skeptic-auditable ORCA proposal exists from the last 24 hours. The ORCA planner has not run since 2026-09-25 and is not wired into the served product.
