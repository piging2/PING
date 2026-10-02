# Reader E working notes — reached-spine synthesis, 2026-09-30 ~08:30 MDT

Read-only. No code changed. Sources: Pig SSH probes (served :3100 @ a8957e3f,
/home/nolan/ping @ 546b62d, /home/nolan/projects/ping @ ed3ff708), local
~/workspace @ bf54503 + worktrees, fyd-90h lane reports, identity forensic,
mc-component-inventory.md, W4 audits B/C, orca-mc-tenanos-push-2026-09-30.md.

## Live-path definitions used
- Path A: FYD product loop on served :3100 (build a8957e3f, FYD_BUILD_SHA
  a8957e3fc2f1e3eb5552a67cc3cab66003d7f19c).
- Path B: PING gateway bootstrap on /home/nolan/ping (ngesk2/crx-runtime,
  lane-b/tenant-dispatch-threading @ 546b62d).
- Path C: Mission Control chain, local ~/workspace repo + served /api/mc/* routes.

## Key live probes run 2026-09-30 ~08:05-08:30 MDT
- :3100 /sites/happy-place 200; /sites/coppersmith-plumbing 200.
- Served tree HEAD a8957e3f (fyd/convergence-2026-09-28); /home/nolan/projects/ping
  HEAD ed3ff708 (fyd/builder-harvest-trackc-2026-09-28).
- ping-object-source.ts:96 default projection dir = /home/nolan/ping/var/fyd-projections
  (has coppersmith-plumbing.json 2026-09-29 11:51, happy-place.json 11:51,
  ping-fyd.json 12:49). FYD_PROJECTION_DIR not set in :3100 env.
  fyd-ownerloop-projections/ holds ONLY happy-place.json (2026-09-29 06:07, stale).
  Conclusion: effective served canonical = fyd-projections; the W4 "canonical dir"
  claim is contradicted by the served code default.
- approval-seam.ts on served tree: referenced only by src/fyd/sitepatch/pipeline.ts,
  itself, and its test. Zero production route callers. Still unwired.
- Seeded directives LIVE in served projection now: "Emergency Services" edit_copy +
  pi-stub-001/003 present in /home/nolan/ping/var/fyd-projections/happy-place.json.
  Verified 2026-09-30. Not historical.
- /api/mc/approvals live (bad_proposal_id on empty query = route executes).
  Route spawns python3 approval_cli.py with cwd=/home/nolan/projects/ping/mc-approval
  (TRACKC line, committed b38973fb), NOT the served tree's own vendored
  mc-approval/ copy (Harvest Group A, 3ba537af). Two copies, one wired.
- /api/mc/dispatch 200, /api/mc/missions 200.
- :18200 journal gateway DOWN. FYD_JOURNAL_GATEWAY_URL points at it.
  /home/nolan/workspace/fyd-journal-gateway/events.jsonl has 175 events
  (MC_RUN_* from Lane D, 2026-09-28).
- Zero MC_FYD_STAGE_* references in served src. Emission side absent.
- business_action_authority: zero callers outside its own dir on Pig tree. Still unwired.
- mission_runtime/mission_scheduler/UER/evidence_authority/hybrid_search still required
  by gateway_runtime.js (6 + 2 mentions at :101-102).
- Identity grep across local ~/workspace + all worktrees: only harvest copies,
  vendor pins, worktree mirrors, scratch copies. No new live identity authorities.
  Forensic 8-way classification stands.
- Writer A i09: 6997495 "Interval-09 P0 OUTCOME->LEARNING law: n=1 is not sample support".
- MC writer lane: 35246b3 (project_fyd_run.py + event-contract-fyd-run.md, 47 tests OK).
- Orca writer lane: 57df2cc (effect_ledger.js promotion, battery green).
- TenantOS writer lane: 1fb6e61 (media contract, 44 pass).
- Lane-integrity incident remediated: three writers shared one checkout; branch
  pointers fixed, surfaces disjoint (mission-control/, orca-adapter/, tenant-os/).

## Approval-model inventory (for DUPLICATION section)
Live on served tree: (a) F1 proceduralize approve path in customize/route.ts
(stale-digest 409, idempotent journal); (b) mc/approvals route -> spawnSync
approval_cli.py (cross-repo). Unwired: sitepatch/approval-seam.ts (tested),
sitepatch/v1 (10 ops, 16/16, zero importers), F2 (Ask surface, no approve
continuity). Pig PING: BusinessActionAuthority+EffectAuthority (zero callers).
Overlapping but distinct: overrides route journals without regenerating.
L5 recommends F1 as the ONE SitePatch type; Nolan's pick pending.

## Workspace copies
/home/nolan/workspace (Pig, real dir) vs /home/hatch/workspace (this VM).
Served approvals route reads OUTREACH_PATH=/home/nolan/workspace/outreach and
JOURNAL_PATH=/home/nolan/workspace/fyd-journal-gateway/events.jsonl (Pig paths).
Divergence risk between the two copies is real but out of component scope.
