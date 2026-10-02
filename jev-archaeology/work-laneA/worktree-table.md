# LANE A — Worktree Inventory (from `git worktree list --porcelain`, 2026-09-22)

Main repo HEAD: refactor/runtime-authority-convergence @ cc6856c3b (2026-09-21), DIRTY (16 files incl. gateway/package.json, capability_registry.json, fyd dump.py, untracked deliverables/)

| # | Path | Branch | HEAD | Date | Dirty | Notes |
|---|------|--------|------|------|-------|-------|
| 0 | /home/nolan/ping | refactor/runtime-authority-convergence | cc6856c3b | 2026-09-21 | YES (16) | PRIMARY. feat(ping): register FYD_SITE_OVERLAY event |
| 1 | .../ping/worktrees/agent-exec | sprint/agent-exec | 5b102c664 | 2026-09-15 | clean | "Add canonical project resolver and fix Docker Windows dependency" |
| 2 | .../ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd1 | 2026-09-16 | YES (11) | uncommitted dead_letter/mission_control/ops changes |
| 3 | .../ping/worktrees/oracle-assembly | main | 5b102c664 | 2026-09-15 | YES (5) | oracle-assembly-patches/, multiruntime-proof/ |
| 4 | .../ping/worktrees/playbook | sprint/playbook | 5b102c664 | 2026-09-15 | untracked playbook/ | same HEAD as 1,3,5 |
| 5 | .../ping/worktrees/python-prod | sprint/python-prod | 5b102c664 | 2026-09-15 | untracked prod/ | same HEAD as 1,3,4 |
| 6 | /home/nolan/worktrees/constitutional-convergence | constitutional-convergence-v2 | 5aa33dcca | 2026-09-20 | untracked releases/ | multi-stage Dockerfile fix (FL-20260920-009) |
| 7 | /home/nolan/worktrees/constitutional-convergence-authority-law | constitutional-convergence-authority-law | 1995f0a59 | 2026-09-19 | YES (10) | collision-safe event identity w/ canonical-hash witness |
| 8 | /home/nolan/worktrees/orca-autonomy | feature/orca-autonomy | ae55b77ff | 2026-09-18 | clean | "feat(convergence): EventRepository as derived audit/projection adapter" |
| 9 | /home/nolan/worktrees/ping-codex-convergence | codex/context-workorder-convergence | 08c3036d9 | 2026-09-17 | clean | "fix(temporal): correct worker lifecycle ownership" |
| 10 | /home/nolan/worktrees/ping-event-runtime | event-runtime-deduplication | 1f40cf432 | 2026-09-18 | clean | "fix(events): implement collision detection for duplicate event IDs" |
| 11 | /home/nolan/worktrees/ping-harvest-12h | sprint/harvest-12h | 8fe3b8060 | 2026-09-17 | untracked | "test(context): add knowledge_refs coverage" |
| 12 | /home/nolan/worktrees/ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b4222467 | 2026-09-18 | clean | "fix(ui): hide fixture-backed missions board" |
| 13 | /tmp/bisect-eval006 | (detached ff9751221) | — | — | PRUNABLE | gitdir points to non-existent location; dead |

Key relationships: main-repo HEAD cc6856c3b (2026-09-21) is NEWER than all worktree HEADS (newest worktree HEAD is 2026-09-20, constitutional-convergence). The four worktrees at 5b102c664 share HEAD (agent-exec, oracle-assembly, playbook, python-prod). The bisect-eval006 worktree is prunable/dead.
