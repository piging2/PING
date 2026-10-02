# Writer ownership — one writer per mutable semantic unit, no commit collisions

| Mutable unit | Owner | Status |
|---|---|---|
| /home/nolan/build-template1 (fyd/template-001-hpp-clone) | coordinator ae77b28b (lane B/C) | ACTIVE — no other writer |
| /home/nolan/build-idem (fyd/write-boundary-idempotency) | lane D may claim (request via orchestrator) | UNCLAIMED |
| /home/nolan/projects/ping main tree (fyd-factory, dirty) | NOBODY | READ-ONLY for all lanes |
| Production :3100 | orchestrator-sanctioned restarts only | /home/nolan/start-3100.sh, BUILD_ID check first |
| New scratch worktrees from pure HEAD e474c89b | claiming lane (register with orchestrator first) | OPEN |

Rules: many readers feed one writer. Proven findings go to the owner, never a competing commit. New worktrees branch from pure HEAD e474c89b. Never push. No force push, no reset --hard over unknown work, no clean -fdx.

**/home/nolan/build-edge** (branch fyd/edge-object-experience from e474c89b) — GRANTED to Lane EDGE-1 2026-09-24 ~16:35 MDT.
Scope: the edge-object interaction correction (object sheet, edge renderer, edge traversal, Ask FYD edge context, capability-resolved actions, edge provenance, Q2 edge-traversal privacy). Conditions: new worktree from verified base e474c89b ONLY; no writes to /home/nolan/projects/ping (read-only, dirty) or any other lane's worktree; predicate-driven, zero business-name conditionals; prove on HPP + Coppersmith; no push, no main/master commits; scratch until proven.
**/home/nolan/build-acq** (branch fyd/acquisition-seam from e474c89b) — GRANTED to Lane ACQ-1 2026-09-24 ~16:35 MDT.
Scope: the single SSRF-hardened acquisition seam (minimum real). Conditions: new worktree from verified base e474c89b ONLY; map existing fetch paths first, then ONE seam; no second fetch path; no giant security platform; no push, no main/master commits; scratch until proven.
