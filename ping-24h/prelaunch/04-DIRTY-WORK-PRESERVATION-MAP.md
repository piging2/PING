# DIRTY-WORK PRESERVATION MAP - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. Read-only inventory; nothing reset, cleaned, merged, or committed.

Hard rule: ZERO LOST IMPLEMENTATION VALUE, not zero dirty files.
Allowed classifications: KEEP / CONVERGE / WIRE / HARVEST / SUPERSEDE / FREEZE / DELETE-LATER / BUILD.
No reset, mass checkout, opportunistic commit, or branch merge for cosmetic cleanliness.

Source: STEP0_WORKTREES.md lane report (62 worktrees, 306 total porcelain entries, 2026-09-28 ~18:25-18:45 MDT).

---

## Canonical tree (protected)

### DW-01: /home/nolan/projects/ping
- OWNER: unassigned (frozen tree; no active writer permitted)
- ACTIVITY: none permitted (FROZEN per Nolan directive; 144 dirty entries preserved as-is)
- BASE/HEAD: branch fyd/builder-harvest-trackc-2026-09-28 @ f877c3919941978f07d5014909595df4751ec258
- CHANGED: 74 modified, 70 untracked (144 total). Semantic areas: proposal/approval (stale-guard 409 layer, uncommitted), renderer/components (mobile one-liner), proceduralizer + JSON-LD, binding verifier, evidence/provenance (Ask FYD, why-this), visibility/owner overrides, journal gateway tooling, BFF/read boundary, demo routes, tenant isolation tests, object graph/digest, MC dispatch + new MC routes (tenant-from-body gap lives here), acquisition/builder UI/dev lab/media, secret broker (unimported)
- UNIQUE VALUE: the served tree (:3100 serves this path); the only tree with live byte-proofs (TWO_SITE_VERIFICATION)
- TESTS: 195-test floor (not rerun after live changes; must be reinstated as gate)
- LIKELY STATUS: active proof workload, frozen
- PRESERVATION ACTION: FREEZE. Do not reset, clean, merge over, build on, or commit. Served process :3100 bound to this path; any restart only via /home/nolan/start-3100.sh with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 verified live after.
- CLASSIFICATION: FREEZE

## Dirty worktrees (canonical ping repo)

### DW-02: /home/nolan/fyd-preview-wt - 29 entries (7 M, 22 ??), detached @ e48ef710
- Semantic areas: preview routes (src/app/preview/, src/app/fyd-night/ untracked)
- UNIQUE VALUE: preview-route experiments not present elsewhere
- PRESERVATION ACTION: HARVEST (inspect preview routes for ADOPT/ADAPT/REJECT; do not merge wholesale)
- CLASSIFICATION: HARVEST

### DW-03: /home/nolan/fyd-dehpp-merge-proof - 19 entries (5 M, 13 A staged, 1 ??), detached @ e48ef710
- Semantic areas: compose/copy/proceduralize modules (13 staged new files)
- UNIQUE VALUE: staged new modules; the only tree with A (staged) entries
- PRESERVATION ACTION: HARVEST (inspect staged modules against SITEPATCH_V1 before any use)
- CLASSIFICATION: HARVEST

### DW-04: /home/nolan/worktrees/side-visual-identity - 16 entries (6 M, 10 ??), detached @ 42f81d53
- Semantic areas: visual identity (ask-loop branch family)
- UNIQUE VALUE: visual-identity exploration
- PRESERVATION ACTION: HARVEST (design harvest source)
- CLASSIFICATION: HARVEST

### DW-05: /home/nolan/build-idem - 12 entries (9 M, 3 ??), branch fyd/write-boundary-idempotency @ d6c1b05d
- Semantic areas: write-boundary core (request_id ledger, site lock, UNKNOWN seam) + 17 hostile unit tests; journal gateway request_id dedupe + 7 node tests; approve/clear idempotent write flow; /healthz + /readyz probes; hostile gate script (13 gates incl. live scratch-stack approve path)
- UNIQUE VALUE: the idempotency/write-boundary implementation; possibly the strongest write-path work in the forest
- PRESERVATION ACTION: CONVERGE (compare against approval convergence; the 13-gate script is a hostile-test asset)
- CLASSIFICATION: CONVERGE

### DW-06: /home/nolan/projects/ping-ask-loop - 12 entries (10 M, 2 ??), branch ask-loop/fyd-ask-behavior @ 42f81d53
- Semantic areas: Ask FYD behavior
- UNIQUE VALUE: ask-behavior modifications (compare against ContextPack convergence, U7)
- PRESERVATION ACTION: CONVERGE (U7 comparison set)
- CLASSIFICATION: CONVERGE

### DW-07: /home/nolan/projects/ping-constitutional - 12 entries (7 M, 5 ??), branch constitutional-convergence-v2 @ a69bb68f
- Semantic areas: constitutional convergence
- UNIQUE VALUE: constitutional-runtime identity/authority semantics
- PRESERVATION ACTION: HARVEST (identity authority lineage, U4)
- CLASSIFICATION: HARVEST

### DW-08: /home/nolan/worktrees/lane-e-ask - 12 entries (8 M, 4 ??), detached @ e474c89b
- Semantic areas: Ask lane work
- UNIQUE VALUE: ask-lane modifications (the 2026-09-26 ask-lane case: lane self-reports are hypotheses until replayed)
- PRESERVATION ACTION: HARVEST (verify against clean-checkout replay before trusting)
- CLASSIFICATION: HARVEST

### DW-09: /home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel - 8 entries (3 M, 5 ??), branch codex/ping-parallel-review @ 9c8c2193
- Semantic areas: design sprint merges (visitor-projection purity, evidence-ref-current, lane-render-wire)
- UNIQUE VALUE: design-lane merges
- PRESERVATION ACTION: HARVEST (design harvest source)
- CLASSIFICATION: HARVEST

### DW-10 through DW-20: small dirty worktrees (1 entry each)
- /home/nolan/build-edge-port (1 ??, detached @ 8faf96d0): Q-J-07 intent work. HARVEST.
- /home/nolan/cohort2-pristine (1 ??, detached @ e48ef710): cohort work. KEEP (pristine reference).
- /home/nolan/fyd-dehpp-wt (1 ??, fyd-dehpp @ eb28d3aa): DEHPP data-plane parameterization. HARVEST.
- /home/nolan/fyd-preview-wt covered above (29).
- /home/nolan/h1clip-work (branch fyd-frontier-h1clip @ f7a5efe4): frontier work. HARVEST.
- /home/nolan/lane7-sites (detached @ 28e4ba00): sites work. HARVEST.
- /home/nolan/projects/ping-bcq-substrate (lane/bcq-connector-substrate @ e48ef710): connector substrate. HARVEST.
- /home/nolan/projects/ping-deploy-head (detached @ 0dec40f5): deploy head. KEEP (reference).
- /home/nolan/projects/ping-fyd-deploy (fyd-deploy @ ade4ee50): FYD UI deploy narrow /build restriction. KEEP (deploy reference).
- /home/nolan/projects/ping-lane-l-broker (lane/l-secret-broker @ e48ef710): secret broker. FREEZE (separate unit; secret scan before any commit).
- CLASSIFICATION: as noted per tree.

## Anomalous / special trees

### DW-21: /home/nolan/worktrees/copper-v2 - UNKNOWN (git-broken checkout)
- Branch registered as copper-v2-serve @ c03bc145 (per worktree list); checkout's .git points to /home/nolan/workspace/.git/worktrees/copper-v2 (admin dir missing); double-registered in both repos' worktree lists.
- UNIQUE VALUE: unknown (cannot inspect until gitdir repaired)
- PRESERVATION ACTION: FREEZE. Do not delete (value unknown); repair gitdir read-only at GO before classifying.
- CLASSIFICATION: FREEZE

### DW-22: /home/nolan/projects/constitutional-runtime - 3371 modified, branch constitutional-trunk @ 74fbb74
- The nine constitutional-runtime commits sit under a fully dirty tree (Lane-L tenant-isolation vectors included). Commits verified on the remote at exact SHA via GitHub API (durability lane, 2026-09-28).
- UNIQUE VALUE: nine constitutional-runtime commits (RESOLVED/durable); Lane-L tenant-isolation vectors
- PRESERVATION ACTION: FREEZE. Commits are durable on the remote; the dirty tree is not to be cleaned cosmetically. Ownership mapping before any convergence touch.
- CLASSIFICATION: FREEZE

### DW-23: /home/nolan/projects/CRX_REMOTE - 1694 entries (1690 M, 4 D), branch main @ b833d914
- Mostly .cursor agent transcripts.
- UNIQUE VALUE: low (transcripts); verify before any deletion
- PRESERVATION ACTION: FREEZE pending transcript value review.
- CLASSIFICATION: FREEZE

### DW-24: /home/nolan/ping - 32 entries (3 M, 29 ??)
- Separate clone; status unknown in detail.
- PRESERVATION ACTION: FREEZE pending inventory.
- CLASSIFICATION: FREEZE

### DW-25: tenanos-wave worktrees (P-001 through P-105) - all clean (0 entries)
- Finished implementation cache, not proposals: P-092 tenant-kit (556 lines), P-098 context-pack.ts (321 lines), P-103 attempt-fencing (627 lines + SQL), P-095 run-state-authority, P-100 bootstrap substrate (549 lines). STATE.json marks most "integrated" but they are NOT in the canonical tree; branches unpushed.
- UNIQUE VALUE: very high (the "completed work stranded on branches" finding)
- PRESERVATION ACTION: HARVEST (each against its semantic unit: P-092→U1/U4, P-098→U7, P-103→U3, P-095→U3, P-100→U4). Do not merge wholesale; cherry-pick small proven commits or port small primitives.
- CLASSIFICATION: HARVEST

### DW-26: design-lane worktrees (04 composition, 05 media, 06 typography, 07 motion, 08 public projection, polish-f1, render-wire, sprint-visual-v1, fix-evidence-ref)
- Clean trees; completed composition/design lanes.
- UNIQUE VALUE: high (the directive orders inspection before any template work)
- PRESERVATION ACTION: HARVEST (per-lane REPLAY TESTS, then KEEP/HARVEST/SUPERSEDE/REJECT; do not recreate in the canonical worktree)
- CLASSIFICATION: HARVEST

### DW-27: phase1 worktrees (/home/nolan/worktrees/phase1-approval-door @ af7d2688; phase1-replay-check detached @ af7d2688)
- Clean; FROZEN. 17/17 with byte-identical replay.
- PRESERVATION ACTION: KEEP (frozen; the harvest source for the approval door).
- CLASSIFICATION: KEEP

### DW-28: contextpack worktrees (/home/nolan/projects/ping-worktrees/contextpack-2026-09-28 @ 9a555021; contextpack-replay-2026-09-28 detached @ 9a555021; ~/workspace/ping-24h/repro/laneB3-9a555021)
- The 9a555021 ContextPack patch and its replay.
- PRESERVATION ACTION: CONVERGE (U7 comparison set; freeze competing writers).
- CLASSIFICATION: CONVERGE

### DW-29: copilot arrow worktrees (arrow1-gate, arrow1-hostile, arrow6-sitepatch, authority-ux, l2-benchmark)
- Branch copilot/* @ 87671a5f. Arrow-1 claims gate + hostile proof; arrow-6 SitePatch.
- PRESERVATION ACTION: HARVEST (arrow-1 hostile proofs are Wave A/B-relevant).
- CLASSIFICATION: HARVEST

### DW-30: other clones (fyd-build 12, happy-place-platform 10 ??, website 10 ??, fyd-projection-harness 3 ??, hpp-clone 1 ??, happy-place-platform-forensic 1 M; demo-sites, ping-website, crx-swarm/crx-runtime-main clean)
- Happy Place originals: NEVER TOUCHED (hard boundary).
- PRESERVATION ACTION: FREEZE (originals protected); fyd-projection-harness HARVEST (projection tooling).
- CLASSIFICATION: FREEZE / HARVEST as noted.

## Stash

- stash@{0}: On fyd-factory: fyd-sprint-2026-09-28-pre-purehead-dirty-state (single entry; branch not checked out anywhere).
- PRESERVATION ACTION: KEEP (do not drop; inspect at GO).
- CLASSIFICATION: KEEP

## Summary counts

- 62 registered worktrees: 24 clean, 1 git-broken (copper-v2), 37 with 1-144 dirty entries.
- Total: 306 porcelain entries (canonical tree alone: 144).
- Other clones: constitutional-runtime 3371 M (commits durable on remote); CRX_REMOTE 1694; /home/nolan/ping 32.
- Classification totals: FREEZE 8 / HARVEST 14 / CONVERGE 4 / KEEP 5 / WIRE 0 / SUPERSEDE 0 / DELETE-LATER 0 / BUILD 0.
- Zero WIRE/SUPERSEDE/DELETE-LATER/BUILD: no wiring, superseding, deletion, or building happens in prelaunch. Those classifications are assigned but not executed until GO.
