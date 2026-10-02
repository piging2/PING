# ORCA ARCHAEOLOGY — Wave 1, Lane C1 (RETRY)
Started: 2026-09-23 ~19:28 MDT (re-dispatched after daemon restart killed first attempt with no checkpoint)

## Plan
1. Pig repo `/home/nolan/ping` (branch refactor/runtime-authority-convergence, READ-ONLY): find + grep -ri for `orca` filenames/symbols. Read candidate files fully to trace actual behavior.
2. `/home/nolan/crx/app`: same search — distinguish PING-backend ORCA from the "Orca desktop app" records there.
3. Local sandbox: `~/workspace/orca-workstream-d/`, `~/workspace/orca-remediation/`, `~/workspace/orca-dispatch-test/`, `~/workspace/orca-omniroute-audit-2026-09-13.md` — read each file, classify.
4. Git forensics in `/home/nolan/ping` (read-only): git log --all --oneline -i --grep=orca; git cat-file -t 992e12725; reflog/stash; deleted orca files via --diff-filter=D.
5. Write `ORCA-INVENTORY.md` (per-artifact: repo/SHA/file/symbol/behavior/caller/callee/state/side-effects/live|dormant|dead|docs-only, KEEP/WIRE/MERGE/DELETE/ARCHIVE).
6. Write `A5-VERDICT.md` (was A5 real? evidence per claim).
7. Final report with counts and open questions.

## Findings (appended incrementally)

### T+0: Local sandbox listings
- `~/workspace/orca-dispatch-test/`: CONTROL-LOOP-DESIGN.md, SPINE-TRACE.md, hermes_dispatch.py, orca-audit2.js, orca-audit3.js, orca_control_loop.js, run-loop.sh
- `~/workspace/orca-remediation/`: adapter-compat-test.js, delegate.new.js, hermes_dispatch.py, ledger-selftest.js, lock-test.js, main.new.js, objective-runtime.js, orca_control_loop.js, patch_adapter.py, ship.sh
- `~/workspace/orca-workstream-d/`: AGENT_PROFILES.md, external_agent_adapter.js, fix_backslash.py, fix_boundary.py, transfer.sh, validate_dispatcher_profiles.js
- Note: orca-omniroute-audit-2026-09-13.md not yet located; will check.

### In-progress
- Pending: Pig inspections (repo + crx/app), git forensics, per-file reads.

### T+1: Pig repo working-tree findings (branch refactor/runtime-authority-convergence @ cc6856c3bc78e0535e66f168c66dc31abee2c073)
- `find . -iname '*orca*'`: NO orca source files anywhere in the working tree. Only hits: `.git/refs/heads/feature/orca-autonomy` (local branch ref EXISTS), `.git/logs/refs/heads/feature/orca-autonomy`, `.git/worktrees/orca-autonomy` (stale admin metadata), and grpc-js node_modules ORCA (gRPC xDS load-reporting, unrelated).
- 17 dirty files in git status; none are orca-related. No `worktrees/orca-autonomy` in status (stale git admin dir only).
- Pending: what ref the branch points at, cat-file 992e12725, log --grep=orca, reflog, stash, git grep for orca symbols in tracked source, deleted-file history.

### T+2: Git forensics (Pig /home/nolan/ping, read-only) — MAJOR
- Branch ref `.git/refs/heads/feature/orca-autonomy` EXISTS, points at `ae55b77ff82a893d50c48ab299117b2f705a0f03`.
- `git cat-file -t 992e12725` → **commit** (object EXISTS in store). Prior claim "branch does NOT exist in any ref" needs re-check: the local ref exists; checking whether 992e12725 is reachable/attached.
- `git log --all --oneline -i --grep=orca` returned real ORCA commits:
  - 6a342dd27 feat(orca): durable objective identity, crash-safe dispatch rendezvous, startup reconciliation
  - 0b8acadfc ORCA hardening: authority-bypass falsification sweep 2026-09-18
  - 5c23e2f7c ORCA hardening: autonomy bounds map, cancellation proof, concurrency separation, worker substitution (2026-09-18)
  - b323f91cf ORCA hardening: crash windows A-E classification + idempotency matrix
  - 00b1194fe A6 witnessed restart proof: FAIL with evidence (SIGKILLed run, duplicate delegation)
  - 992e12725 ORCA autonomy: real orchestration layer above PING constitutional spine
- Worktree dir for orca-autonomy NOT in git status (stale .git/worktrees/orca-autonomy admin dir only).
- No orca symbols matched in tracked files under HEAD (git grep job pending result).

### T+3: Working-tree + CRX + worktree findings
- `/home/nolan/worktrees/orca-autonomy` EXISTS, checked out at ae55b77ff (branch tip), last touched 2026-09-18 12:02. Branch history intact.
- Prior "branch does NOT exist in any ref" claim is INACCURATE for this Pig: `.git/refs/heads/feature/orca-autonomy` exists (points at ae55b77ff), and `992e12725` is a reachable ancestor (cat-file: commit; git log --all shows it). The A5 commit may have been a tip at claim time; the branch has since advanced.
- HEAD (cc6856c3bc7, refactor/runtime-authority-convergence): 0 orca files — ORCA code lives ONLY on feature/orca-autonomy.
- `/home/nolan/crx/app`: ZERO orca matches (.js/.ts/.json/.md). The CRX library's "orca" (`~/workspace/crx-autonomous-missions/repos/orca/`) is the unrelated open-source Go `orca-cli/orca` desktop app (week-1 skeleton, `orca_list_runs` etc.). Distinct entity, no relationship to PING-backend ORCA.
- Control loop main() + delegate() fully traced from /tmp/orca_control_loop.js (branch tip, 1192 lines, 60KB).

### T+4: Inspections complete (read-only; nothing modified in any repo)
- Canonical adapter at tip (`ping-runtime/external-agent/external_agent_adapter.js`): EXISTS. AGENT_PROFILES = 12 unique keys (hermes, codex, opencode x2-def, cloud-subagent, ollama, identity_1-4, goose, qwen, crush); 11 LIVE statuses; 2 blockedExternal.
- Gateway `routes/orchestration.js` at tip retains A5 changes (await engine.startAutonomousLoop, honest summary fields autonomousExecution/measurementStatus).
- A6 commit 00b1194fe = witnessed restart FAIL (SIGKILL, no durable reconstruction, duplicate delegation); fix = 6a342dd27 (objective-runtime.js, PG advisory-lock coordinator claim, rendezvous, startup reconciliation).
- A5 cert record cites independent audit: ~/workspace/goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md → "A5 SUBSTANTIALLY PROVEN" (tests 5/5, 64/64, 9/9; Hermes + goose chains; recovery run verified).
- A6-readiness (2026-09-23): re-proof of 6a342dd27 still pending (test execution, not new implementation).
- /tmp wipe happened mid-run (adapter_tip.js lost); all needed data was captured in outputs before the wipe.
- Next: write ORCA-INVENTORY.md + A5-VERDICT.md, then final report.

### T+5: Deliverables written
- ORCA-INVENTORY.md (20 artifacts, classified KEEP/WIRE/MERGE/DELETE/ARCHIVE + evidence chain)
- A5-VERDICT.md (all three A5 claims PROVEN with evidence; prior "no ref" claim corrected)
- Inspection tally: 21 Pig-side read-only inspections (git status/branch/HEAD, find, branch-ref + cat-file + log-grep + reflog + stash, git-grep + deleted-history, tip log, show --stat, contains + ls-tree, ls-tree counts at tip and HEAD, orchestration.js diff, file sizes, crx/app grep + worktrees ls, worktree state, full loop source read + delegate/main trace, adapter profiles/statuses, A6 message + A5 cert record, tip route + measurements) + ~22 local sandbox file reads/listings. Zero writes to any repo.

### T+6: Late-arriving git-grep result folded in (proc_ee765d21ebf9)
- `git grep -il orca HEAD` DOES return hits in mainline — but only prose/comment/symbol mentions (AGENTS.md, docs/*, stale "for Orca scheduler" comment in routes/missions.js, symbol mentions in priority_boundary.js/mission_runtime.js/worker_runtime.js). No orca/ source directory, no ORCA implementation in HEAD. Inventory evidence chain updated accordingly.
- `git log --all --diff-filter=D -- '*orca*'` → zero deleted orca files. Nothing deleted.
- Task deliverables remain complete; no re-work needed.

### T+7: Late-arriving branch-contains result folded in (proc_1a2d2d6e519c)
- `git branch --contains 992e12725` → four branches: feature/orca-autonomy, constitutional-convergence-v2, constitutional-convergence-authority-law, convergence-discovery-2026-09-20. Only orca-named branch is feature/orca-autonomy. A5-VERDICT.md correction strengthened.
- Task remains complete; no re-work.
