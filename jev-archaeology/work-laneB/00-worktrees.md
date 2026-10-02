# Lane B — Worktree Discovery (2026-09-22)

Repo: /home/nolan/ping on the Pig, via ~/workspace/pig/pigwsl-run.sh.
Primary branch verified: `refactor/runtime-authority-convergence`, HEAD `cc6856c3bc78e0535e66f168c66dc31abee2c073`.

## Real worktree list (from `git worktree list --porcelain`)

| # | Path | Branch | HEAD | Dirty/Clean | Approx purpose |
|---|------|--------|------|-------------|----------------|
| 1 | /home/nolan/ping | refactor/runtime-authority-convergence | cc6856c3 | DIRTY: M gateway/package-lock.json, M gateway/package.json, M ping-runtime/orchestration/execution/capability_registry.json, M tools/fyd-site-projection/dump.py; untracked: deliverables/, evidence/, ping-runtime/orchestration/dormant_classifications/, runtime/constitutional/jest.config.js, runtime/constitutional/package-lock.json, runtime/constitutional/src/ping-canonical-envelope.test.ts, runtime/constitutional/src/ping-canonical-envelope.ts | PRIMARY — current runtime-authority convergence work |
| 2 | /home/nolan/ping/worktrees/agent-exec | sprint/agent-exec | 5b102c66 | clean | older sprint line (same tree as main) |
| 3 | /home/nolan/ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd | DIRTY: M .env.base, M gateway/dead_letter_authority.js, M gateway/routes/mission_control.js, M gateway/routes/ops.js, M gateway/test_dead_letter_wiring.js | recovery smoke test 2026-09-16 |
| 4 | /home/nolan/ping/worktrees/oracle-assembly | main | 5b102c66 | DIRTY: M infrastructure/oracle/docker-compose.oracle.yml; untracked: multiruntime-proof/, oracle-assembly-patches/, docker-compose.oracle.yml.pre-canonical-20260916, oracle.env.template | main-branch checkout for oracle assembly |
| 5 | /home/nolan/ping/worktrees/playbook | sprint/playbook | 5b102c66 | untracked playbook/ only | playbook sprint |
| 6 | /home/nolan/ping/worktrees/python-prod | sprint/python-prod | 5b102c66 | untracked prod/ only | python-prod sprint |
| 7 | /home/nolan/worktrees/constitutional-convergence | constitutional-convergence-v2 | 5aa33dcc | untracked releases/ only | constitutional convergence v2 |
| 8 | /home/nolan/worktrees/constitutional-convergence-authority-law | constitutional-convergence-authority-law | 1995f0a5 | DIRTY: M gateway/bootstrap/gateway_runtime.js, M gateway/test_witness_w2_versioning.js, M ping-runtime/orchestration/execution/capability_registry.json, M ping-runtime/orchestration/mission_runtime.js, M ping-runtime/workers/canonical_workers.js; untracked: evidence/, ping-runtime/orchestration/dormant_classifications/ (455 classified files), tests/test_boot_order_mission_loss.js | authority-law convergence + dormant-classification triage |
| 9 | /home/nolan/worktrees/orca-autonomy | feature/orca-autonomy | ae55b77f | clean | orca autonomy feature |
| 10 | /home/nolan/worktrees/ping-codex-convergence | codex/context-workorder-convergence | 08c3036d | clean | codex workorder convergence |
| 11 | /home/nolan/worktrees/ping-event-runtime | event-runtime-deduplication | 1f40cf43 | clean | event runtime dedup (lane A territory) |
| 12 | /home/nolan/worktrees/ping-harvest-12h | sprint/harvest-12h | 8fe3b806 | clean | 12h harvest sprint |
| 13 | /home/nolan/worktrees/ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b422246 | clean | oracle deploy 2026-09-18 |
| 14 | /tmp/bisect-eval006 | (detached) ff975122 | PRUNABLE — gitdir file points to non-existent location | stale garbage, ignore |

## Historical names from the task brief — verification

- calm-garden, eager-moon, kind-comet: NOT worktrees. They exist only as remote branches
  `origin/opencode/calm-garden`, `origin/opencode/eager-moon`, `origin/opencode/kind-comet`
  (plus `origin/opencode/curious-squid` and windows-preserve copies). ALL FOUR point to the
  SAME commit `aaec592bd` (2026-07-05, "feat(kernel): freeze constitutional replay kernel").
- No OpenCode worktrees exist. No eager-moon/kind-comet worktrees exist.

## Two tree families

- NEWER family (primary, agent-smoke, harvest-12h, constitutional-convergence[-v2],
  authority-law, orca-autonomy, codex-convergence, event-runtime-deduplication):
  ping-runtime/orchestration/*, gateway/*_authority.js (113 files), runtime/kernel/*,
  runtime/constitutional/src/* (newest, Patch 7B 2026-09-21).
- OLDER family (main, agent-exec, playbook, python-prod, oracle-deploy — all at/near 5b102c66):
  constitutional-compiler/, workers/canonical/*, vendored mem0, older gateway.

## History note

Primary branch `refactor/runtime-authority-convergence` has a REWRITTEN history:
root commit 29291bd9, 265 commits, NO merge-base with the old history
(`git merge-base origin/opencode/calm-garden HEAD` fails; calm-garden merges with `main`
at adcb062de from 2026-05-10). The convergence work was imported as fresh history.
