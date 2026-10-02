# WORKTREE INVENTORY — ORCA + Mission Control convergence track

Date: 2026-09-26 ~20:05 MDT. Lane: worktree inventory (observe-only).
Authority: Batch 6 adjudication, "Wire everything through Mission Control" section
(`~/workspace/fyd-autonomy/batch6-owner-disposition.md`).
Scope: READ-ONLY. Nothing was checked out, pulled, cleaned, stashed, or merged.
One writer per semantic unit is a coordinator decision, not a lane action.

Pig-side paths (/home/nolan/worktrees/* on the Pig, /home/nolan/projects/*) are NOT
observable from this machine and are recorded from scoreboard evidence only.

## Repos found: 6

| # | Repo | Path | Remote | HEAD branch | HEAD SHA |
|---|---|---|---|---|---|
| R1 | PING (canonical) | /home/hatch/workspace | github.com/piging2/PING | master @ f9a4a42 | jev/shadow-recorder @ 849cf7c on main checkout |
| R2 | fyd-build (FYD product) | /home/hatch/workspace/fyd-build | none | master | f90589e |
| R3 | demo-sites | /home/hatch/workspace/demo-sites | none observed | master | fd3ff9e |
| R4 | hpp-clone | /home/hatch/workspace/fyd-factory/hpp-clone | none observed | master | 4d3e3c5 |
| R5 | ping-ui-contract (nested repo) | /home/hatch/workspace/ping-ui-contract | none observed | main | 22b9a97 |
| R6 | fyd-write-boundary | /home/hatch/worktrees/fyd-write-boundary | none | master | 592db56 |

## Live worktrees on disk: 10 (9 git + 1 non-git)

| # | Worktree | Repo | Branch | HEAD | Dirty (mod+del / untracked) | Owner / lane | Purpose | Last verified test status (evidence only) | Integration target | Commits not in target |
|---|---|---|---|---|---|---|---|---|---|---|
| W1 | /home/hatch/workspace (main checkout) | R1 PING | jev/shadow-recorder | 849cf7c | 7 tracked / 1511 untracked (mostly pre-existing workspace content: src/, outreach/, docs) | Jev shadow lane | Shadow-mode decision recorder, zero execution authority | 11/11 green locally AND in pristine worktree (JEV-SHADOW-REPORT-2026-09-26.md; SCOREBOARD 19:40). 3 real shadow decisions demoed; event spec proposed, not applied | master (f9a4a42) | 41 ahead; merge-base f9a4a42 |
| W2 | /home/hatch/worktrees/audit-beyond-backlog-2026-09-19 | R1 PING | audit/beyond-backlog-2026-09-19 | 38535ea | clean | Audit lane (2026-09-19) | Beyond-backlog constitutional audit record (3 files in audit_reports/) | UNKNOWN (no test evidence found) | master | 1 ahead; base 30ce76c9 (older than master tip) |
| W3 | /tmp/falsifier-spine/spine-replay | R1 PING | detached | df91b4e | 3 untracked (only __pycache__) | Spine falsifier (O5 independent) | Independent replay + verification of the spine lane | Falsifier is the test: COMPLETE, 8/8 claims CONFIRMED, zero defects (SCOREBOARD 19:55) | none (ephemeral) | detached at spine tip |
| W4 | /tmp/spine-x-pass | R1 PING | spine/x-pass-reached-path | df91b4e | clean | SPINE IMPLEMENTER | X-pass reached-path phase 1: emit.py +14 MC_PASS_* types, pass_queries.py, retry_policy.py, spine_observe.py, pass-health projection | 46/46 + 63/63 green (SCOREBOARD 19:21, 19:45); independent falsifier certified 8/8 (19:55) | master (f9a4a42) | 40 ahead; merge-base f9a4a42 |
| W5 | /home/hatch/workspace/fyd-build | R2 fyd-build | master | f90589e | 10 untracked (design notes: work/*.md, hpp-lane/) | FYD product build lane | FYD product repo on this machine; proven product branch | jest 197/197 + tsc + CDP proof 10/10 recorded at 6ad6a04, ONE COMMIT BEHIND HEAD. HEAD f90589e (style-dictionary devDep) test status UNVERIFIED | master (self; integration target for FYD product) | 0 (on target) |
| W6 | /home/hatch/workspace/demo-sites | R3 demo-sites | master | fd3ff9e | clean | none active | Demo sites repo | UNKNOWN (no test evidence) | master | 0 |
| W7 | /home/hatch/workspace/fyd-factory/hpp-clone | R4 hpp-clone | master | 4d3e3c5 | 1 untracked (work/hpp-donor.tar) | none active | HPP donor clone | UNKNOWN (no test evidence) | master | 0 |
| W8 | /home/hatch/workspace/ping-ui-contract | R5 ping-ui-contract | main | 22b9a97 | clean | none active | UI contract nested repo | UNKNOWN (no test evidence) | main | 0 |
| W9 | /home/hatch/worktrees/fyd-write-boundary | R6 fyd-write-boundary | master | 592db56 | 1 modified (jest.config.cjs) | FYD write-boundary lane | Commits: "P0 FYD write-boundary durability repair", "Locked conditional observed-claim seeding for anonymous preview" | UNKNOWN (no test evidence found) | master | 0 (on target) |
| W10 | /home/nolan/worktrees/design-lane-render | none (NOT a git repo) | n/a | n/a | skeleton dirs only: src/fyd/components (empty) | UNKNOWN | Possibly a lane placeholder; contains no code, no .git, no marker file | n/a | n/a | n/a |

Branch structure on R1 (PING): `orca-engagement-pipeline-endgame` (f980649) is the shared
base of both `jev/shadow-recorder` (849cf7c, +2) and `spine/x-pass-reached-path`
(df91b4e, +1). jev and spine diverge ONLY at their lane commits; the orca endgame
work (175 files vs master) is common to both.

## Dead worktree registrations (dir gone, prunable): 7

| Registration | Repo | Branch / SHA | State |
|---|---|---|---|
| /tmp/fyd-composeview-fix | R1 | stream-b/composeview-visibility @ a904906 (branch alive) | dir deleted; verify-replay artifact |
| /tmp/fyd-pigi-verify-eff0ab4 | R1 | detached @ eff0ab4 | dir deleted; verify-replay artifact |
| /tmp/fyd-stream-b | R1 | stream-b/publicgraphof-visibility @ eff0ab4 (branch alive) | dir deleted; verify-replay artifact |
| /tmp/fyd-verify-8cc8291 | R1 | detached @ 8cc8291 | dir deleted; verify-replay artifact (ask-lane clean-checkout proof) |
| /tmp/fyd-verify-eff0ab4 | R1 | detached @ eff0ab4 | dir deleted; verify-replay artifact |
| /home/nolan/build-edge | R2 | fyd/edge-object-experience @ ce1da5c (branch alive, 2 ahead of fyd-build master, 11 files: src/fyd/edge/* + dev-server/site.css) | dir deleted; edge-object-experience lane artifact |
| /tmp/edge-verify | R2 | detached @ ce1da5c | dir deleted; verify-replay artifact |

The stream-b branches touched only `fyd-product-lane/src/fyd/{ask,object}/...` (FYD product
tests/source) and are historical verification evidence; nothing live depends on them.

## Pig-side design-sprint lanes: NOT OBSERVABLE (3)

Recorded from design-sprint SCOREBOARD.md evidence only (2026-09-26 19:15 entry).
Never observed directly; re-observe before ANY integration decision.

| Lane | Path (Pig) | Branch @ SHA | Evidence of state |
|---|---|---|---|
| Lane 8 (public/debug separation, first build) | /home/nolan/worktrees/design-lane-08 | design/lane-08-public-projection @ a8ed5103 (sprint base fyd/sprint-integration-2026-09-24) | Dispatched 19:15/19:20; status not yet recorded in scoreboard |
| Workstream A (visual identity + PING hero, ex-SIDE-01) | /home/nolan/worktrees/side-visual-identity | 42f81d53 + uncommitted | Uncommitted: select.ts/types.ts, object-visual.tsx + tests, ping-hero.tsx, manifests/ping-fyd.json, run-ingest-supplied.ts, public/fyd-media/<2 hashes>/ |
| Workstream B (Ask FYD loop, ex-ASK-LOOP) | /home/nolan/projects/ping-ask-loop | ask-loop/fyd-ask-behavior @ 42f81d53 + uncommitted | Uncommitted: ask-composer.ts (+150), visitor-answer.ts, ask-loop-gaps.test.ts |
| FYD product canonical (sprint) | /home/nolan/projects/ping (Pig) | fyd/sprint-integration-2026-09-24 @ a8ed5103 | Sprint base; NOT present in any local repo. Hero assets untracked on Pig: public/images/ping-cosmos-hero.jpg, ping-mark.png |

Note: scoreboard says "coordinator sequences ask-file ownership" for Workstream B,
which signals the sprint coordinator already saw an ask-file overlap. Do not assume
it is resolved; the Pig-side trees are unobservable from here.

## CONFLICT MAP

### Files touched by 2+ live worktrees: ZERO

Direct comparison of the two live lane tips against their shared base f980649:

- jev-only (f980649..849cf7c): fyd-intel/shadow_record.py, fyd-intel/demo_shadow_mode.py,
  fyd-intel/test_shadow_record.py, fyd-intel/jev-shadow-records.jsonl,
  orca-mc-convergence/JEV-SHADOW-EVENT-SPEC.md, JEV-SHADOW-REPORT-2026-09-26.md
- spine-only (df91b4e^..df91b4e): mission-control/emit.py, pass_queries.py,
  phase2-cutover-checklist.md, orca-mc-convergence/reports/*,
  outreach/retry_policy.py, spine_observe.py, tests/test_spine.py,
  ping-ui-contract/apps/mission-control/pass-health/{projection,render}.py

Intersection: EMPTY. No file-level merge conflict exists between the two live lanes.

### Semantic-unit overlaps (authority / runtime / event / dispatch): 1 latent, 0 active

1. **mission-control/emit.py event vocabulary (LATENT dependency, not a conflict).**
   One writer: spine lane added the 14 MC_PASS_* types (committed df91b4e).
   Jev lane proposed MC_JEV_SHADOW_DECISION + MC_JEV_SHADOW_VERDICT in
   JEV-SHADOW-EVENT-SPEC.md "for the MC lane to absorb" and deliberately did NOT
   edit emit.py (lane report: read-only). No file conflict; a semantic ordering note:
   whoever next edits emit.py (the "MC lane") must absorb the jev shadow event spec
   rather than duplicating it. Recommend: the MissionIntent front-door lane treats
   emit.py as claimed by the spine lane until the coordinator reassigns.

2. **outreach/ deterministic policy family (no conflict).** Both lanes build on the
   shared orca-endgame base (outreach/pass_policy_engine.py + 60 tests). jev adds
   outreach/tests/test_pass_policy_engine.py; spine adds retry_policy.py,
   spine_observe.py, tests/test_spine.py. Different files, same semantic unit,
   additive only. One-writer rule applies per file; coordinator must re-observe
   before assigning any new writer to outreach/.

3. **FYD product surfaces (Pig-side, unobservable).** Local FYD product state is
   W5 fyd-build master (proven, do not touch). The design sprint owns FYD product
   surfaces on the Pig (Workstreams A/B, Lane 8). The only recorded overlap signal
   is the sprint coordinator's "sequences ask-file ownership" for Workstream B.
   Recommendation: treat the Pig-side trees as UNKNOWN overlap risk; the sprint
   coordinator owns that map, not this lane.

4. **audit_reports/ (no conflict).** Only the audit branch touches it. 3 files,
   clean worktree, historical.

5. **ping-ui-contract nested-repo merge shape (caveat).** The spine branch committed
   ping-ui-contract/apps/mission-control/pass-health/*.py into the PING repo, but
   the nested repo (main @ 22b9a97) does not track those paths and the parent does
   not list ping-ui-contract as a submodule. Merge shape decision is outstanding
   (already flagged in SCOREBOARD 19:45). Recorded for the coordinator; no action.

### Per-worktree recommendation

| Worktree | Verdict | Rationale |
|---|---|---|
| W1 jev/shadow-recorder | KEEP (merge pending Nolan authority) | Lane COMPLETE, tests green in pristine replay, zero authority, additive branch. Lane report states merge is a Nolan decision. Coordinator must not merge on lane evidence alone. |
| W2 audit/beyond-backlog | RETIRE lane, keep branch as evidence | Single audit commit, clean, historical record. No active writer. |
| W3 falsifier-spine | RETIRE | Falsification complete, 8/8 certified. Ephemeral by design. |
| W4 spine/x-pass-reached-path | KEEP (merge pending Nolan authority) | Phase 1 COMPLETE and independently certified. Lane report: "No merge performed; merge is a Nolan decision." Phase-2 cutover checklist written, NOT executed. |
| W5 fyd-build master | KEEP, do not touch | Proven FYD product branch on this machine. HEAD test status one commit behind verification; re-verify at HEAD before any product claim, do not mutate. |
| W6 demo-sites | KEEP / UNKNOWN | No active lane. Nothing to decide without coordinator input. |
| W7 hpp-clone | KEEP / UNKNOWN | No active lane. Untracked hpp-donor.tar noted. |
| W8 ping-ui-contract | KEEP / UNKNOWN | No active lane. Merge-shape caveat open (see conflict map #5). |
| W9 fyd-write-boundary | UNKNOWN | Live repo, one modified file (jest.config.cjs), no remote, no test evidence. Coordinator must verify whether the durability repair landed correctly before any decision. |
| W10 design-lane-render | UNKNOWN | Not a git repo; empty skeleton. Needs coordinator clarification on what it was for. |
| 7 dead registrations | RETIRE (prune registrations) | Dirs deleted; the underlying branches (stream-b/*, fyd/edge-object-experience) are historical evidence and should be kept until the coordinator reviews them, but the worktree registrations are stale and safe to prune. |
| Pig-side lanes (3) | UNKNOWN | Not observable from this machine. Re-observe before any integration decision. Do not merge anything FYD-product on this machine without the sprint coordinator's state. |

### Headline for the coordinator

- Zero overlapping files between live worktrees. The local conflict map is CLEAN.
- The one authority-adjacent surface with write history (mission-control/emit.py) has
  exactly one writer (spine lane); the jev lane's proposed event types are an
  unabsorbed spec, not a competing write.
- Two merge candidates (jev/shadow-recorder, spine/x-pass-reached-path) are both
  certified and both explicitly await Nolan's merge authority. The coordinator must
  re-observe both worktrees immediately before any merge (Batch 6: OBSERVE ALL
  WORKTREES, WRITE TO ONE, REOBSERVE BEFORE MERGE).
- Biggest blind spot: the Pig-side design-sprint lanes (Lane 8, Workstreams A/B)
  are unobservable here; their FYD-product overlap map belongs to the sprint
  coordinator. Also W9 (fyd-write-boundary) and W10 (design-lane-render skeleton)
  need coordinator clarification.
- Stale housekeeping: 7 dead worktree registrations can be pruned (read-only
  observation; pruning itself is the coordinator's call).
