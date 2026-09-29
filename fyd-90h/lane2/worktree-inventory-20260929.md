# Worktree / Dirty-Tree Inventory — 2026-09-29 (Lane 2 sweep, interval 1)

Repo: /home/nolan/projects/ping. Generated from `git worktree list`, `git status --porcelain`,
branch merge-state vs main, and live-process cwd scan. MODIFIED tracked files: 0 across ALL worktrees.
All remaining dirt is untracked: 5x `.next` build-backup dirs (DELETED this interval, ~1.5GB) and
35x `node_modules` dirs (classified GENERATED-DISPOSABLE, left in place: running dev servers + Lane-1 concurrency).

Dispositions this interval:
- PROVEN-DISPOSABLE deleted: 5 `.next` backup dirs (explicit rm -rf, BUILD_ID-verified, no process attached).
- SAFE-REMOVE-WORKTREE executed: 4 duplicate detached checkouts (build-edge-proof, build-purehead,
  ping-wave1-build, ping-wave1-check) — clean, HEADs contained in many branches, no recent activity, no servers.
- Commits: none required (zero modified/staged tracked files anywhere; no unique untracked implementation).
- BLOCKED-COLLISION: /home/nolan/worktrees/copper-v2 (.git gitdir points outside this repo).
- Convergence note: fyd/builder-harvest-trackc-2026-09-28 (this repo) and fyd/convergence-2026-09-28
  (ping-fyd-converged, served root) carry the identical Writer-B fix — convergence recorded, NOT executed unilaterally.

| # | WORKTREE | BRANCH | HEAD | HEAD-DATE/SUBJECT | DIRTY? | UNTRACKED? | OWNER | PURPOSE | UNIQUE(ahead main) | MERGED? | ACTIVE-SERVER? | SECRET-RISK | REACHED? | HARVESTABLE? | DISPOSITION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | /home/nolan/projects/ping | fyd/builder-harvest-trackc-2026-09-28 | ed3ff708 | 2026-09-29 09:37:02 -0600 — trackc: route owner-asserted provenance th | no (5x .next backups deleted this interval) | none | fyd-builder-lane | Writer-B harvest track C fix (owner-asserted provenance lane) | 105 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | KEEP-ACTIVE |
| 2 | /home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel | codex/ping-parallel-review | 76248bda | 2026-09-29 09:10:14 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | codex | codex review lane: codex/ping-parallel-review | 112 | N | next start :3213 (editorial-preview) | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | KEEP-ACTIVE |
| 3 | /home/nolan/build-clean | fyd/sites-coppersmith-alias | b0cdc3b8 | 2026-09-24 14:18:22 -0600 — fyd: /sites/coppersmith alias redirect to  | no | none | fyd-builder-lane | FYD builder lane: fyd/sites-coppersmith-alias | 36 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 4 | /home/nolan/build-edge-port | wip/wave4-ledger-20260929/build-edge-port- | 8faf96d0 | 2026-09-25 05:33:29 -0600 — Q-J-07: accept owner NL 'move X first' as  | no (.next backup deleted this interval) | none | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/build-edge-port- | 54 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 5 | /home/nolan/build-idem | fyd/write-boundary-idempotency | 3fa8a703 | 2026-09-29 09:10:14 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | fyd-builder-lane | FYD builder lane: fyd/write-boundary-idempotency | 43 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 6 | /home/nolan/build-template1 | fyd/template-001-hpp-clone | e4819ce8 | 2026-09-24 16:58:42 -0600 — fix: critics blockers - TmServices grouped | no | none | fyd-builder-lane | FYD builder lane: fyd/template-001-hpp-clone | 52 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 7 | /home/nolan/build-workerE-intent | workerE/intent-move-first | 2aa7b1d2 | 2026-09-25 05:44:56 -0600 — Q-J-07: accept owner NL 'move X first' as  | no | none | workerE | worker lane: workerE/intent-move-first | 57 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 8 | /home/nolan/cohort2-pristine | wip/wave4-ledger-20260929/cohort2-pristine- | e48ef710 | 2026-09-23 07:32:28 -0600 — FYD Wave 1 fixup: current product UI imple | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/cohort2-pristine- | 0 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 9 | /home/nolan/fyd-dehpp-merge-proof | wip/wave4-ledger-20260929/fyd-dehpp-merge-proof- | 7375cb1f | 2026-09-29 09:10:14 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/fyd-dehpp-merge-proof- | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | CANDIDATE | STRANDED (carried) |
| 10 | /home/nolan/fyd-dehpp-wt | fyd-dehpp | eb28d3aa | 2026-09-23 21:50:27 -0600 — DEHPP: data-plane parameterization of the  | YES | node_modules;  | fyd-builder-lane | FYD builder lane: DEHPP data-plane parameterization | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 11 | /home/nolan/fyd-preview-wt | wip/wave4-ledger-20260929/fyd-preview-wt- | 95598244 | 2026-09-29 09:10:14 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/fyd-preview-wt- | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | CANDIDATE | STRANDED (carried) |
| 12 | /home/nolan/fyd-wave2-clean | wip/wave4-ledger-20260929/fyd-wave2-clean- | e48ef710 | 2026-09-23 07:32:28 -0600 — FYD Wave 1 fixup: current product UI imple | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/fyd-wave2-clean- | 0 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 13 | /home/nolan/h1clip-work | fyd-frontier-h1clip | f7a5efe4 | 2026-09-24 08:52:30 -0600 — FYD hero H1: break-words safeguard against | YES | node_modules;  | fyd-frontier | FYD frontier experiment: fyd-frontier-h1clip | 9 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 14 | /home/nolan/lane7-sites | wip/wave4-ledger-20260929/lane7-sites- | d57d7c58 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/lane7-sites- | 59 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 15 | /home/nolan/projects/ping-ask-loop | ask-loop/fyd-ask-behavior | 1f6d54f4 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | UNKNOWN-OWNER | ask-loop lane: ask-loop/fyd-ask-behavior | 92 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 16 | /home/nolan/projects/ping-bcq-substrate | lane/bcq-connector-substrate | 0ebabf94 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | lane-owner | named lane: lane/bcq-connector-substrate | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | CANDIDATE | STRANDED (carried) |
| 17 | /home/nolan/projects/ping-constitutional | constitutional-convergence-v2 | 260c369c | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | UNKNOWN-OWNER | UNKNOWN-PURPOSE: constitutional-convergence-v2 | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | CANDIDATE | STRANDED (carried) |
| 18 | /home/nolan/projects/ping-fyd-converged | fyd/convergence-2026-09-28 | b9a0201a | 2026-09-29 09:41:43 -0600 — trackc: route owner-asserted provenance th | no | none | fyd-builder-lane | convergence integration branch (sibling of served) | 111 | N | next start :3100 SERVED RUNTIME | none found | UNKNOWN (tip object present in served clone; serving unproven) | N/A (served root) | KEEP-ACTIVE |
| 19 | /home/nolan/projects/ping-fyd-deploy | fyd-deploy | ade4ee50 | 2026-09-22 19:12:55 -0600 — FYD UI deploy: base 0dec40f5 + narrow /bui | YES | node_modules;  | UNKNOWN-OWNER | UNKNOWN-PURPOSE: fyd-deploy | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 20 | /home/nolan/projects/ping-int-w3 | ws2/int-w3 | b2a9f7b6 | 2026-09-29 07:40:24 -0600 — ws2: integrate W3 TOCTOU Option A (per-hop | no | none | UNKNOWN-OWNER | wave-2 integration: ws2/int-w3 | 104 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 21 | /home/nolan/projects/ping-int-w4 | ws2/int-w4 | 5c604dc1 | 2026-09-29 07:43:51 -0600 — ws2: integrate W4 generator-owned dependen | no | none | UNKNOWN-OWNER | wave-2 integration: ws2/int-w4 | 104 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 22 | /home/nolan/projects/ping-int-w5 | ws2/int-w5 | 68e49b64 | 2026-09-29 07:51:38 -0600 — ws2: integrate W5 ProjectionReader seam on | no | none | UNKNOWN-OWNER | wave-2 integration: ws2/int-w5 | 104 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 23 | /home/nolan/projects/ping-lane-l-broker | lane/l-secret-broker | f7ea9990 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | lane-owner | named lane: lane/l-secret-broker | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | CANDIDATE | STRANDED (carried) |
| 24 | /home/nolan/projects/ping-wave-P-20260923-001 | tenanos-wave/P-20260923-001-jest-config | 10ed47b7 | 2026-09-23 19:10:08 -0600 — test(tenanos): scoped ts-jest config for s | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-001-jest-config | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 25 | /home/nolan/projects/ping-wave-P-20260923-012 | tenanos-wave/P-20260923-012-sandbox | eec54a76 | 2026-09-23 21:16:50 -0600 — feat(tenanos): sandbox execution profile r | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-012-sandbox | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 26 | /home/nolan/projects/ping-wave-P-20260923-089 | tenanos-wave/P-20260923-089-memory-candidate | 04e420e2 | 2026-09-23 20:53:35 -0600 — feat(tenanos): MemoryCandidate proposal-su | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-089-memory-candidate | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 27 | /home/nolan/projects/ping-wave-P-20260923-091 | tenanos-wave/P-20260923-091-decision-budget | b49c9e19 | 2026-09-23 19:53:56 -0600 — feat(tenanos): decision-budget taxonomy +  | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-091-decision-budget | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 28 | /home/nolan/projects/ping-wave-P-20260923-092 | tenanos-wave/P-20260923-092-tenant-kit | 6cbd64af | 2026-09-23 21:01:43 -0600 — feat(tenanos): tenant boundary kit (P-2026 | YES | node_modules;  | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-092-tenant-kit | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 29 | /home/nolan/projects/ping-wave-P-20260923-095 | tenanos-wave/P-20260923-095-run-state | 82ed23e6 | 2026-09-23 21:21:40 -0600 — feat(tenanos): run-state authority vocabul | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-095-run-state | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 30 | /home/nolan/projects/ping-wave-P-20260923-098 | tenanos-wave/P-20260923-098-context-pack | 13f21b59 | 2026-09-23 21:07:36 -0600 — feat(tenanos): memory context-pack assembl | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-098-context-pack | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 31 | /home/nolan/projects/ping-wave-P-20260923-100 | tenanos-wave/P-20260923-100-bootstrap | 3a578131 | 2026-09-23 21:10:23 -0600 — feat(tenanos): gateway bootstrap substrate | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-100-bootstrap | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 32 | /home/nolan/projects/ping-wave-P-20260923-103 | tenanos-wave/P-20260923-103-attempt-fencing | a9d1c9d8 | 2026-09-23 21:32:57 -0600 — feat(tenanos): attempt fencing mechanics ( | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-103-attempt-fencing | 1 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 33 | /home/nolan/projects/ping-wave-security-104-105 | tenanos-wave/P-20260923-104-105-security | 1df0f98c | 2026-09-23 21:36:33 -0600 — fix(security): Kit webhook requires HMAC s | no | none | tenanos-wave | TenantOS wave task: tenanos-wave/P-20260923-104-105-security | 2 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 34 | /home/nolan/projects/ping-worktrees/contextpack-2026-09-28 | decision-fabric/contextpack-wire-2026-09-28 | 9a555021 | 2026-09-28 14:35:06 -0600 — decision-fabric: wire compileAskContext()  | YES | node_modules;  | UNKNOWN-OWNER | decision-fabric lane: decision-fabric/contextpack-wire-2026-09-28 | 101 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 35 | /home/nolan/projects/ping-worktrees/contextpack-replay-2026-09-28 | wip/wave4-ledger-20260929/contextpack-replay-2026-09-28- | 9a555021 | 2026-09-28 14:35:06 -0600 — decision-fabric: wire compileAskContext()  | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/contextpack-replay-2026-09-28- | 101 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 36 | /home/nolan/projects/ping-ws4-converge | wip/wave4-ledger-20260929/ping-ws4-converge- | 3235804d | 2026-09-29 06:08:36 -0600 — W2 owner-loop: approve->regen chain + adve | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/ping-ws4-converge- | 104 | N | next dev :3215 | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | KEEP-ACTIVE |
| 37 | /home/nolan/worktrees/arrow1-gate | copilot/arrow1-claims-gate | 4bab96c0 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | copilot-worker | Copilot worker lane: copilot/arrow1-claims-gate | 88 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 38 | /home/nolan/worktrees/arrow1-hostile | copilot/arrow1-hostile-proof | ba94089c | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | copilot-worker | Copilot worker lane: copilot/arrow1-hostile-proof | 88 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 39 | /home/nolan/worktrees/arrow6-sitepatch | copilot/arrow6-sitepatch | 30dc6ede | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | copilot-worker | Copilot worker lane: copilot/arrow6-sitepatch | 89 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 40 | /home/nolan/worktrees/authority-ux | copilot/authority-ux | 0970f71b | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | copilot-worker | Copilot worker lane: copilot/authority-ux | 88 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 41 | /home/nolan/worktrees/copper-v2 | copper-v2-serve | ERR |  | no | none | UNKNOWN-OWNER | copper v2 serve experiment | 91 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | BLOCKED-COLLISION (gitdir mismatch, do not touch) |
| 42 | /home/nolan/worktrees/design-lane-04-composition | design/lane-04-composition | a4cd616c | 2026-09-26 19:21:36 -0600 — Lane 04: graph-measured composition compil | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-04-composition | 96 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 43 | /home/nolan/worktrees/design-lane-05-media | design/lane-05-media | 06774159 | 2026-09-26 19:08:49 -0600 — Lane 5: media intelligence v1 - richness s | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-05-media | 96 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 44 | /home/nolan/worktrees/design-lane-06-typography | design/lane-06-typography | e3af1d89 | 2026-09-26 19:06:47 -0600 — Lane 6: fix globals.css banner wording (re | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-06-typography | 97 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 45 | /home/nolan/worktrees/design-lane-07-motion | design/lane-07-motion | 6cef9c4d | 2026-09-26 19:07:36 -0600 — lane-07: FYD motion primitives (reveal, be | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-07-motion | 96 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 46 | /home/nolan/worktrees/design-lane-08 | design/lane-08-public-projection | 6ab560c3 | 2026-09-26 19:23:57 -0600 — lane-08: separate public and debug project | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-08-public-projection | 96 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 47 | /home/nolan/worktrees/design-lane-polish-f1 | design/lane-polish-f1 | cd280d39 | 2026-09-27 09:16:24 -0600 — design/lane-polish-f1: visitor-projection  | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-polish-f1 | 110 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 48 | /home/nolan/worktrees/design-lane-render | design/lane-render-wire | 832b0148 | 2026-09-26 20:03:40 -0600 — design/lane-render-wire: wire lane-4/6/7 v | YES | node_modules;  | design-sprint | design-sprint lane: design/lane-render-wire | 106 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 49 | /home/nolan/worktrees/design-sprint-visual-v1 | design/sprint-visual-v1 | 9c8c2193 | 2026-09-27 09:16:26 -0600 — sprint: merge design/lane-polish-f1 | YES | node_modules;  | design-sprint | design-sprint lane: design/sprint-visual-v1 | 111 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 50 | /home/nolan/worktrees/fix-evidence-ref | design/fix-evidence-ref-current | 4c947384 | 2026-09-26 20:13:44 -0600 — design/fix-evidence-ref-current: stamp and | YES | node_modules;  | design-sprint | design-sprint lane: design/fix-evidence-ref-current | 107 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 51 | /home/nolan/worktrees/fyd-family-converge | fyd/builder-rebuild-v1 | b6a5cb4e | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | fyd-builder-lane | FYD builder lane: fyd/builder-rebuild-v1 | 51 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 52 | /home/nolan/worktrees/l1-acq | wip/wave4-ledger-20260929/l1-acq- | f877c391 | 2026-09-28 16:59:43 -0600 — trackc: 16 tests for the staged SitePatch  | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/l1-acq- | 103 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 53 | /home/nolan/worktrees/l1-acq-contract | l1-acq/q-j-04-contract | dd2024b3 | 2026-09-29 05:22:24 -0600 — L1-ACQ-Q-J-04-contract-doc-and-invariant-t | YES | node_modules;  | lane-1 | Lane-1 acquisition lane: l1-acq/q-j-04-contract | 104 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 54 | /home/nolan/worktrees/l1-acq-served | wip/wave4-ledger-20260929/l1-acq-served- | 5732485b | 2026-09-28 18:40:52 -0600 — fyd-converge: build-identity seam + repo c | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/l1-acq-served- | 110 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 55 | /home/nolan/worktrees/l2-benchmark | copilot/l2-benchmark | 2430df8a | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | no | none | copilot-worker | Copilot worker lane: copilot/l2-benchmark | 88 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 56 | /home/nolan/worktrees/lane-e-ask | wip/wave4-ledger-20260929/lane-e-ask- | d427b929 | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/lane-e-ask- | 36 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 57 | /home/nolan/worktrees/lane-fyd-010 | lane/fyd-010-context-projection | 9f9b79f8 | 2026-09-26 18:44:12 -0600 — FYD-010: enforce Ask FYD context-projectio | no | none | lane-owner | named lane: lane/fyd-010-context-projection | 92 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 58 | /home/nolan/worktrees/lane-p01 | fyd/lane-p01-presence-compiler | 2bf1e5c9 | 2026-09-26 18:46:13 -0600 — Lane P-01: presence compiler — PASTE URL t | YES | node_modules;  | fyd-builder-lane | FYD builder lane: fyd/lane-p01-presence-compiler | 92 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 59 | /home/nolan/worktrees/phase1-approval-door | phase1/approval-door-2026-09-28 | af7d2688 | 2026-09-28 18:14:02 -0600 — phase1: terminal-first ratification in bri | YES | node_modules;  | UNKNOWN-OWNER | phase-1 approval lane: phase1/approval-door-2026-09-28 | 112 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 60 | /home/nolan/worktrees/phase1-replay-check | wip/wave4-ledger-20260929/phase1-replay-check- | af7d2688 | 2026-09-28 18:14:02 -0600 — phase1: terminal-first ratification in bri | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/phase1-replay-check- | 112 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 61 | /home/nolan/worktrees/replay-render-wire | wip/wave4-ledger-20260929/replay-render-wire- | 832b0148 | 2026-09-26 20:03:40 -0600 — design/lane-render-wire: wire lane-4/6/7 v | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/replay-render-wire- | 106 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 62 | /home/nolan/worktrees/side-visual-identity | wip/wave4-ledger-20260929/side-visual-identity- | 6f4be6ba | 2026-09-29 09:10:15 -0600 — wip: commit stranded work 2026-09-29 (wave | YES | node_modules;  | wave4-ledger-sweep | wave4 ledger-sweep WIP: wip/wave4-ledger-20260929/side-visual-identity- | 92 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |
| 63 | /home/nolan/worktrees/workerF-edge-restore | workerF/edge-restore | 2839dd50 | 2026-09-25 05:31:51 -0600 — feat(fyd): restore page-level margin/edge  | YES | node_modules;  | workerF | worker lane: workerF/edge-restore | 52 | N | no | none found | UNKNOWN (tip object present in served clone; serving unproven) | review | STRANDED (carried) |

## Detached-HEAD worktrees (no branch)
- /home/nolan/build-edge-proof @ e474c89b (2026-09-24 — fyd-g4: capability propagation through the authority; no view-layer) — REMOVED this interval
- /home/nolan/build-purehead @ e474c89b (2026-09-24 — fyd-g4: capability propagation through the authority; no view-layer) — REMOVED this interval
- /home/nolan/projects/ping-deploy-head @ 0dec40f5 (2026-09-22 — FYD-001: update hero badge assertions for honest claim labels) — carried
- /home/nolan/projects/ping-wave1-build @ e48ef710 (2026-09-23 — FYD Wave 1 fixup: current product UI implementation + ask test alig) — REMOVED this interval
- /home/nolan/projects/ping-wave1-check @ e48ef710 (2026-09-23 — FYD Wave 1 fixup: current product UI implementation + ask test alig) — REMOVED this interval
- /home/nolan/projects/ping-wave2-ownerloop @ 3235804d (2026-09-29 — W2 owner-loop: approve->regen chain + adversarial + last-good proof) — KEEP-ACTIVE: running next dev :3214
- /home/nolan/tenanos-c1-tree @ 51d4a187 (2026-09-24 — tenanos-wave: integrate P-20260923-101 (run reconciler)) — carried
- /tmp/w4-audit-ping @ f877c391 (2026-09-28 — trackc: 16 tests for the staged SitePatch pipeline) — carried

## Classification of all dirty/untracked material found
- ACTIVE-WIP: none (zero modified tracked files).
- REFERENCE: none untracked.
- HISTORICAL-SUPERSEDED: none untracked.
- GENERATED-DISPOSABLE: 5x .next backup dirs (deleted, proven: BUILD_ID present, regenerated by `next build`, renamed stale copies, no process attached); 35x node_modules dirs (classified, left in place — reproducibility evidence: zero modified tracked files so package.json/lockfiles are committed state and `npm ci` reproduces; deletion deferred because `next dev` servers run in ping-ws4-converge and ping-wave2-ownerloop and Lane 1 is concurrent).
- COLLISION-UNKNOWN: /home/nolan/worktrees/copper-v2 (gitdir points to /home/nolan/workspace/.git/worktrees/copper-v2, outside this repo; listed by `git worktree list` as [copper-v2-serve]@c03bc145). DO NOT MODIFY.

---

# Interval 2 — 2026-09-29 ~10:30-10:45 MDT (Lane 2 sweep)

Method this interval: pairwise `git merge-base --is-ancestor` across all 87 local branch tips
(full matrix, script at /tmp/absorb.py on the Pig; /tmp/absorb.json holds the absorption map).
A branch tip that is a proper ancestor of another branch tip is fully preserved in the absorbing
branch — retiring its checkout loses no implementation. Dispositions below rest on that proof;
no branch pointers were deleted this interval (conservative: checkouts retired, refs kept).

## Retired this interval — SAFE-REMOVE-WORKTREE (34 checkouts, all tips verified pre-removal, no live processes, node_modules proven-disposable removed explicitly)

A. REACHED via main (tips are ancestors of main; state durably in main) — 2:
- /home/nolan/cohort2-pristine (wip/wave4-ledger-20260929/cohort2-pristine- @ e48ef710)
- /home/nolan/fyd-wave2-clean (wip/wave4-ledger-20260929/fyd-wave2-clean- @ e48ef710)

B. SUPERSEDED-ABSORBED into ACTIVE lanes (merge-base proof: tip ancestor of keep-active tips
   codex/ping-parallel-review, fyd/convergence-2026-09-28, fyd/builder-harvest-trackc-2026-09-28,
   wip/wave4-ledger-20260929/ping-ws4-converge-) — 17:
- /home/nolan/build-clean (fyd/sites-coppersmith-alias @ b0cdc3b8)
- /home/nolan/build-workerE-intent (workerE/intent-move-first @ 2aa7b1d2)
- /home/nolan/h1clip-work (fyd-frontier-h1clip @ f7a5efe4)
- /home/nolan/worktrees/lane-fyd-010 (lane/fyd-010-context-projection @ 9f9b79f8)
- /home/nolan/worktrees/lane-p01 (fyd/lane-p01-presence-compiler @ 2bf1e5c9)
- /home/nolan/worktrees/workerF-edge-restore (workerF/edge-restore @ 2839dd50)
- /home/nolan/worktrees/l1-acq (wip/wave4-ledger-20260929/l1-acq- @ f877c391)
- /home/nolan/worktrees/l1-acq-served (wip/wave4-ledger-20260929/l1-acq-served- @ 5732485b, absorbed by fyd/convergence-2026-09-28)
- /home/nolan/worktrees/design-lane-04-composition (design/lane-04-composition @ a4cd616c)
- /home/nolan/worktrees/design-lane-05-media (design/lane-05-media @ 06774159)
- /home/nolan/worktrees/design-lane-06-typography (design/lane-06-typography @ e3af1d89)
- /home/nolan/worktrees/design-lane-07-motion (design/lane-07-motion @ 6cef9c4d)
- /home/nolan/worktrees/design-lane-08 (design/lane-08-public-projection @ 6ab560c3)
- /home/nolan/worktrees/design-lane-polish-f1 (design/lane-polish-f1 @ cd280d39)
- /home/nolan/worktrees/design-lane-render (design/lane-render-wire @ 832b0148)
- /home/nolan/worktrees/design-sprint-visual-v1 (design/sprint-visual-v1 @ 9c8c2193)
- /home/nolan/worktrees/fix-evidence-ref (design/fix-evidence-ref-current @ 4c947384; node_modules was a
  DANGLING SYMLINK to the retired design-lane-render checkout — symlink removed explicitly, then `git worktree remove`)

C. SUPERSEDED-CONSOLIDATED into tenanos-wave/integration @ 51d4a187 (each tip's sole absorber; merge-base proven) — 9:
- /home/nolan/projects/ping-wave-P-20260923-001 / -012 / -089 / -091 / -092 / -095 / -098 / -100 / -103
  (integration branch has no worktree; the 9 units' implementation now lives only there — still stranded, but one canonical unit instead of nine)

D. DUPLICATE-CHECKOUT retired (identical tip to a retained checkout; no unique content) — 6:
- /home/nolan/projects/ping-worktrees/contextpack-replay-2026-09-28 (dup of #34 @ 9a555021)
- /home/nolan/worktrees/phase1-replay-check (dup of phase1-approval-door @ af7d2688)
- /home/nolan/worktrees/replay-render-wire (dup of design/lane-render-wire @ 832b0148)
- /tmp/w4-audit-ping (detached @ f877c391, dup of retired l1-acq- tip)
- /home/nolan/projects/ping-deploy-head (detached @ 0dec40f5, ancestor of fyd-deploy @ ade4ee50 — proof: merge-base --is-ancestor)
- /home/nolan/tenanos-c1-tree (detached @ 51d4a187, dup of tenanos-wave/integration tip)

E. PROVEN-DISPOSABLE file deletion — 1:
- /home/nolan/projects/ping/.worktree-inventory-20260929.md — interval-1 sweep artifact left in the
  Writer-B repo root (untracked). Identity to canonical copy established by identical byte size (27508)
  and identical header content; canonical copy retained at ~/workspace/fyd-90h/lane2/worktree-inventory-20260929.md.
  Removed to keep the Writer-B tree clean.

## Classification updates (fresh status scan, 33 remaining worktrees)
- ACTIVE-WIP (other lanes', NOT touched): /home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel
  (M src/fyd/sitespec/contract-digests.ts + 4 evidence PNGs, codex lane, live server :3213);
  /home/nolan/projects/ping-fyd-converged (?? src/fyd/proceduralize/__fixtures__/ping-fyd-graph.ts —
  Writer A in-flight, Writer-A-owned this interval, untouched).
- GENERATED-DISPOSABLE: node_modules dirs in retired checkouts removed explicitly per path (proven:
  package.json/lockfiles committed, `npm ci` reproduces; zero modified tracked files in those trees).
- COLLISION-UNKNOWN: /home/nolan/worktrees/copper-v2 — untouched (gitdir mismatch still unresolved).
- NO-ACTION (standing owner decisions): fyd-family-converge (fyd/builder-rebuild-v1, corrupt ref).
- Commits in Pig repos: none required this interval (zero stranded uncommitted implementation found;
  all removed checkouts were fully committed; no branch pointers deleted).

## Ledger metrics — interval 2 (before → after)
- WORKTREES TOTAL: 67 → 33
- DIRTY WORKTREES: 2 → 2 (both active-lane WIP, not sweep-owned)
- UNTRACKED FILES: 5 → 5 (4 codex evidence PNGs + 1 Writer-A fixture; sweep-owned count 1 → 0)
- ACTIVE-WIP COMMITTED: 0
- HARVESTED: 0 (falsification queue owns reach definition; Writer A owns served repo — no harvest declared)
- DEMOTED-ARCHIVED: 28 (17 SUPERSEDED-ABSORBED into active lanes + 9 CONSOLIDATED into tenanos-wave/integration + 2 REACHED via main)
- PROVEN DISPOSABLE: 1 (duplicate sweep artifact)
- COLLISION-UNKNOWN: 1 (copper-v2, unchanged)
- SECRET-BLOCKED: 0
- WORKTREES SAFELY RETIRED: 34 this interval (cumulative 38)
- **STRANDED VALUABLE IMPLEMENTATION REMAINING: 58 → 26** (same formula as interval 1:
  worktree count minus keep-active 5, collision 1, corrupt-ref 1, merged-into-main worktrees.
  33 − 5 − 1 − 1 = 26. All 26 remaining are maximal tips with no absorber.)

Remaining stranded units (26, all maximal branch tips): build-edge-port-, fyd/write-boundary-idempotency,
fyd/template-001-hpp-clone, wip fyd-dehpp-merge-proof-, fyd-dehpp, wip fyd-preview-wt-, wip lane7-sites-,
ask-loop/fyd-ask-behavior, lane/bcq-connector-substrate, constitutional-convergence-v2, fyd-deploy,
ws2/int-w3, ws2/int-w4, ws2/int-w5, lane/l-secret-broker, tenanos-wave/P-20260923-104-105-security,
decision-fabric/contextpack-wire-2026-09-28, copilot/arrow1-claims-gate, copilot/arrow1-hostile-proof,
copilot/arrow6-sitepatch, copilot/authority-ux, copilot/l2-benchmark, wip lane-e-ask-,
phase1/approval-door-2026-09-28, wip side-visual-identity-.
Next-interval candidates: ws2/int-w3/w4/w5 divergence review; copilot arrow-family consolidation review;
tenanos-wave/integration (now the canonical tenanos unit) harvest candidacy — all need lane-owner or
falsification-queue input before any harvest/reach claim.

---

# Interval 3 — 2026-09-29 ~10:52-11:30 MDT (Lane 2 sweep: final 26 dispositioned)

Method this interval: fresh state scan (zero tracked modifications in all 26; untracked was
node_modules only), pairwise served-tip comparison (served tip fetched as temporary ref
refs/sweep/served-20260929 -> c02b9ecca3863b2194f784ef9fe7389d3642006c, ref removed after),
semantic file-blob comparison vs served, secret-filename + secret-content scan of all 26 tips,
correction-arrow harvestability review per CEO-ORDER-LEDGER04-CORRECTION.md. No branch pointers
deleted. All 26 worktrees retired (clean, committed, no live processes); all 26 branch refs retained.

## Secret scan (all 26 tips)
- Filename scan (token.json, .env, .env.base, credentials, *.pem, id_rsa, *.key, secrets.json): ALL 26 CLEAN.
- Content scan (private keys, AKIA, ghp_, xoxb-, sk-live) on unique-vs-served added files: one hit on
  copilot/arrow1-claims-gate:task.result.jsonl, verified FALSE POSITIVE (base64-encoded Copilot reasoning
  substring "AKIaE1Xyn6Z91QZoOUKb", not a credential).
- lane/l-secret-broker: 4 files scanned, no secret material (custody pattern only, no values).
- SECRET-BLOCKED: 0. COLLISION: 0 (copper-v2 remains BLOCKED-COLLISION, untouched, not in the 26).

## Key findings
- phase1/approval-door-2026-09-28 @ af7d2688: 18 files under src/fyd/approval/ (types, proposal digest
  binding, gate with exact-digest verification + terminal-first semantics, queue, journal, UI). Reuses
  the EXISTING served seam src/fyd/object/owner-events.ts (confirmed present on served). This is 70-80%
  of the OWNER CORRECTION unit (correction half; regen-survival half not included). HARVESTABLE, receiving
  unit Writer A, boundary: correction arrow OWNER CORRECTION. Duplication risks flagged: served
  customize/route.ts approve/clear and Group A mc-approval machinery (different layers; integration
  decision belongs to Writer A per the CEO order's FYD-CURRENT/HARVESTABLE/DUPLICATION-RISK classification).
- lane/l-secret-broker @ f7ea9990: byte-identical to trackc WIP bank Group B donor b38973fb
  (secret-broker.ts blob d573de6bf2dc8803e8ad25baff5c29d04fe64d3a). SUPERSEDED-ABSORBED, not independently harvested.
- fyd/write-boundary-idempotency @ 3fa8a703: unique adds are src/fyd/customize/consequence.ts + 2 tests
  (consequence tiers LOW/MEDIUM/HIGH/CRITICAL for owner-approved presentation changes). Liftable micro-helper
  for Writer A's owner-correction UX; not 70-90% of a unit.
- Served already has: src/fyd/object/owner-events.ts, src/fyd/customize/owner-command-compiler.ts,
  WHY THIS (4 files). Served does NOT have: src/fyd/approval/, src/fyd/customize/consequence.ts.

## 26-row disposition table (13 fields)

| WORKTREE | BRANCH | HEAD | DIRTY? | UNTRACKED? | OWNER | PURPOSE | UNIQUE COMMITS | UNIQUE DIRTY VALUE | SECRET RISK | REACHED? | HARVESTABLE? | DISPOSITION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /home/nolan/build-edge-port | wip/wave4-ledger-20260929/build-edge-port- | 8faf96d0 | no | none | wave4-ledger-sweep | Q-J-07 owner-NL intent compiler | 5 | owner-command-compiler.ts, intent.ts, owner-proposal.ts (wave-era variants) | none found | No | No | SUPERSEDED (served has newer owner-command-compiler.ts) |
| /home/nolan/build-idem | fyd/write-boundary-idempotency | 3fa8a703 | no | none | fyd-builder-lane | Write-boundary idempotency | 1 | src/fyd/customize/consequence.ts + 2 tests (unique vs served) | none found | No | No | REFERENCE (consequence.ts liftable for Writer A UX) |
| /home/nolan/build-template1 | fyd/template-001-hpp-clone | e4819ce8 | no | none | fyd-builder-lane | Tradesman/HPP template clone | 17 | Old HPP template + media; HPP is a harness per product law | none found | No | No | REFERENCE (engineering harness) |
| /home/nolan/fyd-dehpp-merge-proof | wip/wave4-ledger-20260929/fyd-dehpp-merge-proof- | 7375cb1f | no | node_modules 38B (deleted) | wave4-ledger-sweep | DEHPP merge proof | 1 | 18-file delta, duplicate of fyd-dehpp | none found | No | No | REFERENCE (duplicate; fyd-dehpp canonical) |
| /home/nolan/fyd-dehpp-wt | fyd-dehpp | eb28d3aa | no | node_modules 38B (deleted) | fyd-builder-lane | DEHPP data-plane parameterization | 1 | 18-file delta; canonical DEHPP branch | none found | No | No | REFERENCE (canonical DEHPP) |
| /home/nolan/fyd-preview-wt | wip/wave4-ledger-20260929/fyd-preview-wt- | 95598244 | no | none | wave4-ledger-sweep | FYD preview | 1 | Minimal delta; falsification evidence | none found | No | No | REFERENCE |
| /home/nolan/lane7-sites | wip/wave4-ledger-20260929/lane7-sites- | d57d7c58 | no | node_modules 38B (deleted) | wave4-ledger-sweep | Lane 7 sites | 1 | 0 unique files vs served (sites converged) | none found | No | No | SUPERSEDED (by served sites) |
| /home/nolan/projects/ping-ask-loop | ask-loop/fyd-ask-behavior | 1f6d54f4 | no | node_modules 38B (deleted) | UNKNOWN-OWNER | Ask loop behavior | 1 | ask-loop-gaps.test.ts (conflict-status, holiday refusal) | none found | No | No | SUPERSEDED (by served Ask; gaps test in retained branch) |
| /home/nolan/projects/ping-bcq-substrate | lane/bcq-connector-substrate | 0ebabf94 | no | none | lane-owner | BCQ connector substrate | 1 | 10 connector-kit files | none found | No | No | REFERENCE |
| /home/nolan/projects/ping-constitutional | constitutional-convergence-v2 | 260c369c | no | none | UNKNOWN-OWNER | Constitutional convergence | 3 | 12 files (site-ID guard, object source, readers, media) | none found | No | No | REFERENCE |
| /home/nolan/projects/ping-fyd-deploy | fyd-deploy | ade4ee50 | no | node_modules 38B (deleted) | UNKNOWN-OWNER | FYD deploy | 1 | Deploy manifest + middleware | none found | No | No | REFERENCE |
| /home/nolan/projects/ping-int-w3 | ws2/int-w3 | b2a9f7b6 | no | none | UNKNOWN-OWNER | W3 TOCTOU per-hop pinning | 1 | 2 toctou test files; Option A pending owner decision | none found | No | No | REFERENCE (pending owner decision) |
| /home/nolan/projects/ping-int-w4 | ws2/int-w4 | 5c604dc1 | no | none | UNKNOWN-OWNER | W4 dependency-index seeding | 1 | 3 files; coordinator: seeding owned by generator lane | none found | No | No | SUPERSEDED (by seeding-ownership decision) |
| /home/nolan/projects/ping-int-w5 | ws2/int-w5 | 68e49b64 | no | none | UNKNOWN-OWNER | W5 ProjectionReader seam | 1 | 5 files; clean semantic unit | none found | No | No | REFERENCE |
| /home/nolan/projects/ping-lane-l-broker | lane/l-secret-broker | f7ea9990 | no | node_modules 38B (deleted) | lane-owner | Secret broker (Lane L) | 1 | 4 files; byte-identical to trackc Group B donor b38973fb | none found | No | No | SUPERSEDED-ABSORBED (Writer-B Group B queue) |
| /home/nolan/projects/ping-wave-security-104-105 | tenanos-wave/P-20260923-104-105-security | 1df0f98c | no | none | tenanos-wave | Security hardening | 2 | 5 security files | none found | No | No | REFERENCE |
| /home/nolan/projects/ping-worktrees/contextpack-2026-09-28 | decision-fabric/contextpack-wire-2026-09-28 | 9a555021 | no | node_modules 38B (deleted) | UNKNOWN-OWNER | Contextpack wire | 1 | mc-context-pack.ts + test; dead for served Ask per L2 | none found | No | No | REFERENCE |
| /home/nolan/worktrees/arrow1-gate | copilot/arrow1-claims-gate | 4bab96c0 | no | none | copilot-worker | Claims gate | 1 | task.done + task.result.jsonl; falsification evidence | none found | No | No | REFERENCE (falsification evidence) |
| /home/nolan/worktrees/arrow1-hostile | copilot/arrow1-hostile-proof | ba94089c | no | none | copilot-worker | Hostile proof | 1 | task.done + task.result.jsonl; falsification evidence | none found | No | No | REFERENCE (falsification evidence) |
| /home/nolan/worktrees/arrow6-sitepatch | copilot/arrow6-sitepatch | 30dc6ede | no | node_modules 38B (deleted) | copilot-worker | Sitepatch | 2 | task.done + task.result.jsonl; falsification evidence | none found | No | No | REFERENCE (falsification evidence) |
| /home/nolan/worktrees/authority-ux | copilot/authority-ux | 0970f71b | no | none | copilot-worker | Authority UX | 1 | task.done + task.result.jsonl; falsification evidence | none found | No | No | REFERENCE (falsification evidence) |
| /home/nolan/worktrees/l1-acq-contract | l1-acq/q-j-04-contract | dd2024b3 | no | node_modules 38B (deleted) | lane-1 | Q-J-04 contract | 1 | Q-J-04-CONTRACT.md + test (12 pass, 4 intentional fail) | none found | No | No | REFERENCE |
| /home/nolan/worktrees/l2-benchmark | copilot/l2-benchmark | 2430df8a | no | none | copilot-worker | Benchmark | 1 | task.done + task.result.jsonl; falsification evidence | none found | No | No | REFERENCE (falsification evidence) |
| /home/nolan/worktrees/lane-e-ask | wip/wave4-ledger-20260929/lane-e-ask- | d427b929 | no | node_modules 38B (deleted) | wave4-ledger-sweep | Lane E Ask | 1 | 0 unique files vs served (Ask green) | none found | No | No | SUPERSEDED (by served Ask FYD) |
| /home/nolan/worktrees/phase1-approval-door | phase1/approval-door-2026-09-28 | af7d2688 | no | node_modules 38B (deleted) | phase-1 lane | Owner approval door | 12 | 18 files src/fyd/approval/; terminal-first, exact-digest, reuses served owner-events.ts; 70-80% of OWNER CORRECTION | none found | No | Yes (Writer A, correction-arrow OWNER CORRECTION) | REFERENCE (HARVESTABLE; parked for Writer A) |
| /home/nolan/worktrees/side-visual-identity | wip/wave4-ledger-20260929/side-visual-identity- | 6f4be6ba | no | node_modules 38B (deleted) | wave4-ledger-sweep | Visual identity | 1 | PING visual/media + object-visual components | none found | No | No | REFERENCE (visual harness) |

## Actions this interval
- PROVEN-DISPOSABLE deleted: 12x node_modules dirs (explicit rm -rf per path, 38 bytes each, 456 bytes total;
  reproducibility: package.json/lockfiles committed, `npm ci` reproduces; zero tracked modifications in all trees).
  Paths: /home/nolan/worktrees/arrow6-sitepatch, l1-acq-contract, lane-e-ask, phase1-approval-door,
  side-visual-identity, /home/nolan/fyd-dehpp-merge-proof, fyd-dehpp-wt, lane7-sites,
  /home/nolan/projects/ping-ask-loop, ping-fyd-deploy, ping-lane-l-broker,
  /home/nolan/projects/ping-worktrees/contextpack-2026-09-28 (each + /node_modules).
- SAFE-REMOVE-WORKTREE executed: all 26 checkouts (clean, committed, no live processes; `git worktree remove`
  without --force; all 26 branch refs retained and verified present after removal).
- NOT TOUCHED (per standing orders): /home/nolan/projects/ping-fyd-converged, /home/nolan/projects/ping-fyd-harvest-wt,
  /home/nolan/worktrees/copper-v2 (BLOCKED-COLLISION).
- Temporary comparison ref refs/sweep/served-20260929 removed after use.
- Commits in Pig repos: none required (zero stranded uncommitted implementation; all trees clean).

## Ledger metrics — interval 3 (before → after)
- WORKTREES TOTAL (sweep-owned): 26 → 0
- STRANDED VALUABLE IMPLEMENTATION REMAINING: **26 → 0**
  (all 26 dispositioned: 20 REFERENCE parked with branch refs retained, 6 SUPERSEDED with absorbing
  line/decision named; 1 HARVESTABLE flagged for Writer A. No undispositioned valuable implementation remains
  in this sweep's scope.)
- HARVESTED: 0 (no reached boundary advanced; correction arrow is the frontier, not a reached boundary;
  phase1-approval-door flagged HARVESTABLE for Writer A, integration decision is Writer A's per CEO order)
- ACTIVE-WIP: 0 | PROVEN-DISPOSABLE: 12 paths (456 bytes) | COLLISION: 0 | SECRET-BLOCKED: 0
- Remaining worktrees in repo (not sweep-owned, untouched): main (Track-C), ping-parallel (codex),
  ping-fyd-converged (served, Writer A), ping-fyd-harvest-wt, ping-wave2-ownerloop, ping-ws4-converge,
  copper-v2 (BLOCKED-COLLISION), fyd-family-converge.
