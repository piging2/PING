# WORKTREE INVENTORY REFRESH — ORCA + Mission Control convergence track

Date: 2026-09-26 ~20:15 MDT (refresh). Lane: worktree inventory refresh (observe-only).
Authority: Batch 6 adjudication; Nolan's evidence-gated retirement rules (disposition #24: retire only if clean, or all meaningful diff harvested, or diff explicitly superseded with evidence; unknown dirty work is NEVER deleted).
Scope: READ-ONLY. No checkouts, no commits, no pulls, no cleans, no stashes, no merges, no deletions.
Prior inventory: WORKTREE-INVENTORY.md (2026-09-26 ~20:05 MDT). This refresh supersedes its worktree table only.

## Repo list (unchanged): 6

| Repo | Path | HEAD branch | HEAD SHA |
|---|---|---|---|
| R1 PING (canonical) | /home/hatch/workspace | mc/audit-payload-lifecycle @ ba653ac | ba653acbca305533fead411fb19abaae33d7a2fc |
| R2 fyd-build | /home/hatch/workspace/fyd-build | master | f90589e |
| R3 demo-sites | /home/hatch/workspace/demo-sites | master | fd3ff9e |
| R4 hpp-clone | /home/hatch/workspace/fyd-factory/hpp-clone | master | 4d3e3c5 |
| R5 ping-ui-contract (nested) | /home/hatch/workspace/ping-ui-contract | main | 22b9a97 |
| R6 fyd-write-boundary | /home/hatch/worktrees/fyd-write-boundary | master | 592db56 |

New since prior inventory: branches `mc/pass-migration-supersession` (tip 28c92f4, NO worktree — created for the queued supersession re-proof whose dispatch was refused), `feat/orca-unknown-outcome-port`, `fyd/builder-rebuild-v1-cherrypick`.

## Live worktrees: 28 git checkouts + 1 non-git skeleton

### R1 PING worktrees (22)

| # | Worktree | Branch | HEAD (short) | Tracked dirty | Untracked | In-progress op | Lane / status |
|---|---|---|---|---|---|---|---|
| W1 | /home/hatch/workspace (main checkout) | mc/audit-payload-lifecycle | ba653ac | 0 | 1520 (pre-existing workspace content) | none | Main checkout now ON the audit branch; was jev/shadow-recorder at prior inventory. ba653ac = "backlog: visibility-composeObjectView-bypass falsification evidence + verified patch", BACKLOG_PING.md only (+52 lines, evidence text, no code). Certified audit code (fd8edef) untouched. Index clean. |
| W2 | /home/hatch/falsify-consequence-55b5d89 | (detached) | 55b5d89 | 0 | 0 | none | Falsifier scratch of the FALSIFIED pre-repair consequence commit. Lane done; 55b5d89 lives on in branch history (superseded by db78888 repair). |
| W3 | /home/hatch/repair-consequence | (detached) | db78888 | 0 | 0 | none | Consequence repair lane worktree; repair CERTIFIED, HEAD = branch tip. |
| W4 | /home/hatch/workspace/.worktrees/ar-cac | (detached) | cacf7b2 | 0 | 0 | none | DUPLICATE checkout of mc/approval-request tip (same SHA as W10). Redundant. |
| W5 | /home/hatch/workspace/.worktrees/fd537 | (detached) | 537d264 | 0 | 0 | none | DUPLICATE checkout of mc/mission-intent-frontdoor tip (same SHA as W11). Redundant. |
| W6 | /home/hatch/worktrees/audit-beyond-backlog-2026-09-19 | audit/beyond-backlog-2026-09-19 | 38535ea | 0 | 0 | none | Historical audit record; clean; unchanged. |
| W7 | /home/hatch/worktrees/mc-budget-repair | mc/mission-budgets | f336c80 | 0 | 0 | none | Budget repair lane; repair CERTIFIED, HEAD = branch tip. |
| W8 | /home/hatch/worktrees/mc-pass-migration-proof | mc/pass-migration-proof | 28c92f4 | 0 | 2 (`__pycache__` dirs) | none | Migration proof lane; CERTIFIED. Untracked = scratch. |
| W9 | /home/hatch/worktrees/refalsify-budget | (detached) | f336c80 | 0 | 0 | none | Budget re-falsifier; CERTIFY done, HEAD = branch tip. |
| W10 | /home/nolan/worktrees/mc-approval-request | mc/approval-request | cacf7b2 | 0 | 0 | none | Approval lane; CERTIFIED, HEAD = branch tip. |
| W11 | /home/nolan/worktrees/mc-mission-intent-frontdoor | mc/mission-intent-frontdoor | 537d264 | 0 | 3 | none | Front-door lane; CERTIFIED. Untracked = materialized support files (mission-control/emit.py, orca-adapter/, outreach/spine_observe.py) — documented byte-identical copies per SUPPORT-FILES.md (bare-clone limitation workaround), NOT unique work. |
| W12 | /home/nolan/worktrees/mc-consequence | mc/consequence-policy-input | db78888 | 0 | 0 | none | Consequence lane; CERTIFIED, HEAD = branch tip. |
| W13 | /home/nolan/worktrees/mc-audit-scanner-followup | (detached) | fd8edef | 0 | 0 | none | Audit scanner G1/G2 follow-up repair; COMPLETE, HEAD = branch tip. |
| W14 | /tmp/falsifier-budget | (detached) | ea750d5 | 0 | 0 | none | Falsifier of the FALSIFIED pre-repair budget commit. Lane done; ea750d5 in branch history (superseded by f336c80). |
| W15 | /tmp/falsifier-spine/spine-replay | (detached) | df91b4e | 0 | 3 (`__pycache__`) | none | Spine falsifier; CERTIFY done. Untracked = scratch. |
| W16 | /tmp/mc-hostile-test | (detached) | 537d264 | 0 | 6 | none | P1 runtime hostile-test lane (wave 1, dispatched 20:20 MDT); no completion record yet — treat as possibly IN FLIGHT. Untracked = materialized support files + `__pycache__`. |
| W17 | /tmp/prefix-frontdoor | (detached) | f7262f7 | 0 | 6 | none | Falsifier of the FALSIFIED pre-repair front-door commit. Lane done; f7262f7 in branch history (superseded by 537d264). Untracked = materialized support files + `__pycache__`. |
| W18 | /tmp/refals-audit | (detached) | 86bfbc4 | 0 | 3 (`__pycache__`) | none | Re-falsifier intermediate commit (superseded by fd8edef follow-up repair). Lane done. |
| W19 | /tmp/refals-consequence | (detached) | db78888 | 0 | 0 | none | Consequence re-falsifier; CERTIFY done, HEAD = branch tip. |
| W20 | /tmp/refals-frontdoor | (detached) | 537d264 | 0 | 6 | none | Front-door re-falsifier; CERTIFY done, HEAD = branch tip. Untracked = materialized support files + `__pycache__`. |
| W21 | /tmp/spine-x-pass | spine/x-pass-reached-path | df91b4e | 0 | 0 | none | Spine implementer; phase 1 COMPLETE + CERTIFIED. |

### Other repos

| # | Worktree | Branch | HEAD | Tracked dirty | Untracked | Lane / status |
|---|---|---|---|---|---|---|
| W5-R2 | /home/hatch/workspace/fyd-build | master | f90589e | 0 | 10: hpp-lane/ + 9 work/*.md design notes | Proven FYD product branch; do not touch. Untracked = real-looking uncommitted design content, no git record, unknown owner → HELD per #24 (noted, not deleted). |
| W6-R3 | /home/hatch/workspace/demo-sites | master | fd3ff9e | 0 | 0 | No active lane. |
| W7-R4 | /home/hatch/workspace/fyd-factory/hpp-clone | master | 4d3e3c5 | 0 | 1 (work/hpp-donor.tar) | No active lane; donor artifact. |
| W8-R5 | /home/hatch/workspace/ping-ui-contract | main | 22b9a97 | 0 | 1 (apps/mission-control/pass-health/) | Spine-lane files committed in the PARENT repo, untracked in the nested repo. Known merge-shape caveat (outstanding). |
| W9-R6 | /home/hatch/worktrees/fyd-write-boundary | master | 592db56 | 1: jest.config.cjs (adds jsx:"react-jsx" to ts-jest config) | 0 | UNKNOWN ownership; no test evidence; no remote. Real uncommitted config change → HELD per #24. |
| W10 | /home/nolan/worktrees/design-lane-render | n/a (NOT a git repo) | n/a | skeleton dirs only | n/a | UNKNOWN; unchanged. |

Pig-side lanes (design-sprint Lane 8, Workstreams A/B): NOT observable from this machine; unchanged status.

### Prunable registrations (dirs gone, registrations still listed)

- fyd-build: /home/nolan/build-edge (fyd/edge-object-experience @ ce1da5c) and /tmp/edge-verify (detached @ ce1da5c) — still registered, dirs confirmed GONE. (These were in the prior inventory's dead list but were never actually pruned from R2.)
- No prunable registrations remain on R1 (prior inventory's 7 dead registrations are gone).

## CONFLICT MAP (refresh)

### Files touched by 2+ active lane branches: ONE — mission-control/emit.py (3 writers, all additive)

Lane-branch file lists were computed against each branch's own lane base (not master):

- spine (f980649..df91b4e): mission-control/emit.py (MC_PASS_* types), pass_queries.py, phase2-cutover-checklist.md, reports/*, outreach/retry_policy.py, spine_observe.py, tests/test_spine.py, ping-ui-contract pass-health projection/render
- audit (df91b4e..ba653ac): BACKLOG_PING.md, mission-control/RETENTION-POLICY.md, mission-control/emit.py (DATA_ERASURE_COMPLETED/PAYLOAD_REDACTED), payload_lifecycle.py, tests/test_payload_lifecycle.py
- approval (df91b4e..cacf7b2): mission-control/emit.py (MC_APPROVAL_* types + MC_APPROVAL_EVENT_TYPES subset), approval_request.py, adapters/chat_approval.py, adapters/mc_approval.py, tests/test_approval_request.py
- frontdoor (f980649..537d264): mission-control/SUPPORT-FILES.md, _adapter_shim.js, frontdoor_adapters.py, mission_intent.py, tests/test_mission_intent.py (no emit.py — it is an untracked materialized support file there)
- consequence (d5d56bc..db78888): orca-adapter/adapter.js, consequence/* (README, consequence.js, jev_shadow.js, test/consequence-selftest.js), outcomes.js
- budgets (f9a4a42..f336c80): orca-mc-convergence/mission-budgets/{README.md, budget.js, test/budget.test.js}
- passmig (df91b4e..28c92f4): mission-control/STUBS.md, mission_proof.py, mission_proof_worker.py, run_pass_migration_proof.py, tests/test_pass_migration_proof.py, orca-mc-convergence/reports/pass-migration-proof-*
- jev (f980649..849cf7c): fyd-intel/* (shadow_record.py, demo_shadow_mode.py, test_shadow_record.py, jev-shadow-records.jsonl), orca-mc-convergence/JEV-SHADOW-{EVENT-SPEC,REPORT}*.md

Intersection analysis:

1. **mission-control/emit.py — THREE writers (up from one).** Spine added MC_PASS_* (committed df91b4e); audit added DATA_ERASURE_COMPLETED/PAYLOAD_REDACTED with attribution comment (86bfbc4, region ~lines 65-69 of the MC_EVENT_TYPES set); approval added MC_APPROVAL_{REQUESTED,APPROVED,DENIED,EXPIRED,REFUSED} + MC_APPROVAL_EVENT_TYPES subset (cacf7b2). Both audit's and approval's insertions anchor at the SAME line (`"MC_PASS_ABORTED", "MC_PASS_CLOSED",` in the MC_EVENT_TYPES set) — a future merge of the audit and approval branches into one line WILL textually conflict there even though both are additive. Merge-coordination note for the coordinator: sequence audit+approval emit.py insertions (they are compatible, order-independent, but git needs a manual resolution). Spine's own emit.py is the common base of both — no conflict with spine.
2. **BACKLOG_PING.md — effectively one writer.** ba653ac added 52 lines of falsification evidence ("visibility-composeObjectView-bypass", stream C findings, gateway drift notes). Evidence text only; no code touched. Not a conflict.
3. **orca-adapter/ shared files — one writer (consequence lane).** adapter.js and outcomes.js edited only by mc/consequence-policy-input. The P2 executor verdict designates lane-C as executor of record; no other lane touches these files. No conflict. (Hermes bridge repair lane may touch the venv/launcher/outcomes.js per the authorized repair — if it edits outcomes.js, that is a NEW writer the coordinator must arbitrate; as of this refresh no such edit is present.)
4. **Front-door materialized support files — NOT conflicts.** mission-control/emit.py, orca-adapter/, outreach/spine_observe.py are untracked in the front-door worktrees (W11, W16, W17, W20) as byte-identical materializations per SUPPORT-FILES.md (bare-clone limitation workaround). They are copies of git objects from other branches, not competing writes. Safe to discard when those scratch worktrees retire.
5. **Jev shadow event spec — still unabsorbed.** JEV-SHADOW-EVENT-SPEC.md proposes MC_JEV_SHADOW_DECISION + MC_JEV_SHADOW_VERDICT "for the MC lane to absorb"; no lane has edited emit.py for them. Next writer on emit.py must absorb the spec, not duplicate it. (Same as prior inventory; still true.)
6. **Pig-side FYD product surfaces — UNKNOWN overlap risk.** The sprint coordinator's "sequences ask-file ownership" note (Workstream B) stands; unobservable from here.

### No active two-lane same-file conflict exists right now (all live edits are additive and on distinct files except emit.py's 3-way additive edit, which is merge-ordering, not a live conflict).

## RETIREMENT CANDIDATES (evidence-gated review per #24 — NOT deletions)

Falsifier/repair scratch worktrees whose lanes are complete. All are clean of tracked dirt; unique commits (if any) live on branches in the repo, so worktree removal preserves nothing's loss — but per #24 each needs a retirement record (HEAD/branch/diff disposition/unique commits/untracked disposition/harvest evidence/integration destination) before removal, and removal itself is the coordinator's call:

| Worktree | Branch | HEAD | Evidence status |
|---|---|---|---|
| /home/hatch/falsify-consequence-55b5d89 | none (detached) | 55b5d89 | Falsifier FAIL superseded: repair @ db78888 on branch mc/consequence-policy-input, CERTIFY 01:53 UTC. Diff disposition: superseded with evidence. Untracked: none. |
| /home/hatch/repair-consequence | none (detached) | db78888 | Repair commit = branch tip; CERTIFIED. Untracked: none. |
| /home/hatch/worktrees/refalsify-budget | none (detached) | f336c80 | Re-falsifier CERTIFY; HEAD = branch tip. Untracked: none. |
| /tmp/falsifier-budget | none (detached) | ea750d5 | Falsifier FAIL superseded: repair @ f336c80 on mc/mission-budgets, CERTIFY 01:53 UTC. Untracked: none. |
| /tmp/prefix-frontdoor | none (detached) | f7262f7 | Falsifier D1 FAIL superseded: repair @ 537d264 on mc/mission-intent-frontdoor, CERTIFY 01:55 UTC. Untracked: support-file copies (discardable). |
| /tmp/refals-audit | none (detached) | 86bfbc4 | Intermediate repair superseded by fd8edef follow-up (G1/G2), both green from pristine replay. Untracked: `__pycache__` (scratch). |
| /tmp/refals-consequence | none (detached) | db78888 | Re-falsifier CERTIFY; HEAD = branch tip. Untracked: none. |
| /tmp/refals-frontdoor | none (detached) | 537d264 | Re-falsifier CERTIFY; HEAD = branch tip. Untracked: support-file copies (discardable). |
| /tmp/falsifier-spine/spine-replay | none (detached) | df91b4e | Falsifier CERTIFY (8/8). Untracked: `__pycache__` (scratch). |
| /tmp/spine-x-pass | spine/x-pass-reached-path | df91b4e | Implementer lane COMPLETE + CERTIFIED. Branch holds the work; merge is Nolan's decision. |
| /home/hatch/workspace/.worktrees/ar-cac | none (detached) | cacf7b2 | Redundant duplicate of W10 (same SHA). Falsifier artifact. |
| /home/hatch/workspace/.worktrees/fd537 | none (detached) | 537d264 | Redundant duplicate of W11 (same SHA). Falsifier artifact. |
| /home/nolan/worktrees/mc-audit-scanner-followup | none (detached) | fd8edef | Follow-up repair COMPLETE @ fd8edef (66/66 lane + 46/46 spine + 63/63 policy-engine from pristine worktree). Untracked: none. |
| /home/hatch/worktrees/audit-beyond-backlog-2026-09-19 | audit/beyond-backlog-2026-09-19 | 38535ea | Historical audit record; clean. Prior inventory already recommended RETIRE lane / keep branch as evidence. |
| /tmp/mc-hostile-test | none (detached) | 537d264 | P1 hostile-test lane, NO completion record — EXCLUDE from retirement until the lane reports. |
| /home/hatch/worktrees/mc-budget-repair | mc/mission-budgets | f336c80 | Lane CERTIFIED; branch holds work; merge is Nolan's decision. Retirement of the worktree is coordinator's call; branch must be kept until merge. |
| /home/nolan/worktrees/mc-approval-request | mc/approval-request | cacf7b2 | Same: CERTIFIED; merge pending Nolan. |
| /home/nolan/worktrees/mc-consequence | mc/consequence-policy-input | db78888 | Same: CERTIFIED; merge pending Nolan. |
| /home/nolan/worktrees/mc-mission-intent-frontdoor | mc/mission-intent-frontdoor | 537d264 | Same: CERTIFIED; merge pending Nolan. |
| /home/hatch/worktrees/mc-pass-migration-proof | mc/pass-migration-proof | 28c92f4 | Same: CERTIFIED; merge pending Nolan. |
| /home/hatch/workspace (main checkout) | mc/audit-payload-lifecycle | ba653ac | Audit lane CERTIFIED (fd8edef); ba653ac is evidence-only BACKLOG_PING.md addition. Keep until merge; branch must be kept until merge. |

## UNKNOWN DIRTY WORK — MUST BE HELD per disposition #24 (never deleted)

1. **/home/hatch/worktrees/fyd-write-boundary** (R6 master @ 592db56): 1 uncommitted tracked modification — jest.config.cjs, one-line change adding `jsx: "react-jsx"` to the ts-jest transform config. No test evidence, no remote, lane context unknown. REAL uncommitted work with unknown ownership → HOLD. Do not touch, do not clean, do not commit.
2. **/home/hatch/workspace/fyd-build** (R2 master @ f90589e): 10 untracked — hpp-lane/ plus 9 work/*.md design notes (DESIGN-TOKENS-REGISTRY-PROPOSAL.md, fyd-hpp-central-design-2026-09-22.md, fyd-lane-inventory.md, hpp-first-object-decision.md, hpp-happy-place-graph-data.md, hpp-object-backend-plan-2026-09-22.md, hpp-ping-primitives-reuse.md, hpp-subsystem-classification.md, work/baseline/). Real-looking uncommitted design content, unknown owner. HOLD (these are notes, not deletion candidates, but they must not be cleaned).
3. **/home/hatch/workspace/fyd-factory/hpp-clone**: 1 untracked work/hpp-donor.tar — donor artifact, unchanged from prior inventory. HOLD (harmless).
4. **/home/hatch/workspace/ping-ui-contract**: 1 untracked apps/mission-control/pass-health/ — the spine-lane files, committed in the PARENT repo but untracked in the nested repo. Known state; merge-shape decision outstanding (nested-repo vs parent commit). Do not delete; resolution belongs to the merge decision.

## Headline for the coordinator

- 28 git checkouts (22 R1, 1 each R2/R3/R4/R5/R6) + 1 non-git skeleton. No worktree has any tracked dirt except fyd-write-boundary's 1-line jest.config.cjs change (HELD). No rebase/merge/cherry-pick in progress anywhere.
- Same-file overlap across active lane branches: exactly ONE file, mission-control/emit.py, with THREE additive writers (spine MC_PASS_*, audit DATA_ERASURE_*/PAYLOAD_REDACTED, approval MC_APPROVAL_*). Audit's and approval's insertions anchor at the same line — a future audit+approval merge will textually conflict there; sequence it when the merge lane runs. No live conflict right now.
- Main checkout moved: jev/shadow-recorder → mc/audit-payload-lifecycle @ ba653ac. The jev lane now has NO live checkout anywhere (branch jev/shadow-recorder @ 849cf7c still exists as the durable record). ba653ac added only BACKLOG_PING.md evidence (+52 lines, no code) on top of the certified fd8edef.
- Retirement posture: 13 falsifier/repair scratch worktrees + 2 redundant duplicate checkouts (.worktrees/ar-cac, .worktrees/fd537) are clean and superseded-with-evidence or certified — removal is safe once the coordinator files per-#24 retirement records. The 6 branch worktrees of CERTIFIED lanes (approval, consequence, front-door, budget, pass-migration, audit-main) hold merge candidates awaiting Nolan's merge authority — keep the branches regardless of worktree removal.
- HOLD items: fyd-write-boundary's uncommitted jest.config.cjs edit; fyd-build's 10 untracked design artifacts; hpp-donor.tar; ping-ui-contract's untracked pass-health files (nested-repo merge-shape caveat).
- Blind spots: Pig-side design-sprint lanes still unobservable. /tmp/mc-hostile-test is possibly still in flight (no completion record) — do not retire it. The Hermes bridge repair lane (authorized, bounded) has no worktree/edits on this machine yet; if it touches outcomes.js, that becomes a second writer on the consequence lane's files — re-observe before it writes.
