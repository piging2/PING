# Drift source preservation: provenance record

Worker B2, constitutional-convergence program, 2026-09-17. Read-only extraction of the two
live P0 fixes (Phase 2 drift items 3 and 4) off the Oracle host. NOTHING was committed,
pushed, merged, reset, rebased, deleted, cleaned, or restarted. No DB writes. No Oracle-side
changes of any kind. No credential values appear anywhere in this record.

These copies are UNCOMMITTED EVIDENCE, not a commit. They exist so the retry-reclaim delta,
which currently lives only inside the live `ping-gateway` container and the Oracle release
tree on the same host, has a verified source copy off the Oracle host before canonical
landing on `constitutional-convergence-v2`.

Source of drift classification: `~/workspace/ping-overnight/PHASE2_DRIFT_RECONCILIATION_2026-09-17.md`
("Phase 2 report"), drift items 3 and 4. Per that report, NO git or worktree copy of these
deltas exists anywhere; the only other non-container copies are in the Oracle release tree
`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/`
(same host as production), byte-identical to live.

## mission_runtime.js

- Live path: `/app/ping-runtime/orchestration/mission_runtime.js` (container `ping-gateway`, Oracle host)
- Live sha256: `4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c` (MATCHES Phase 2 report)
- Extracted to: `~/workspace/ping-overnight/drift-sources/mission_runtime.js.live-20260917`
- Byte size: 16603
- Extraction time: 2026-09-17 ~05:40 MDT (this session)
- Extraction method: `docker exec ping-gateway cat <live path>` over SSH via
  `/home/hatch/workspace/pig-fb/oracle-ssh.sh -s`, stdout redirected locally on this machine.
  No commands were executed that modify the container or host; the only read-only pre-check
  was a grep scan for secret-like patterns.
- Secret scan: clean. `grep -Ein 'password|passwd|secret|token|api[_-]?key|bearer'` on the live
  file returned no matches: plain application code, no embedded secrets.
- No git/worktree source copy exists: confirmed by the Phase 2 report (drift item 3). The
  string `reclaimRetryPending` appears in git only as a docstring reference; the pre-patch
  baseline (`mission_runtime.js.bak-agent-a-20260916-p0retry`) is byte-identical to HEAD blob.
- Baseline used: `HEAD` blob of `ping-runtime/orchestration/mission_runtime.js` at
  `099927152b93e0de7c1a120bc88d73fb939c1502` on `/home/nolan/ping` (Pig WSL),
  copied via `git show HEAD:<path>` to `mission_runtime.js.HEAD-099927152`.
- Delta vs HEAD (`mission_runtime.js.delta-vs-HEAD.diff`): 39 added, 1 removed.
  New `reclaimRetryPending()` (+38 lines incl. docstring, ~line 258) moving due
  `retry_pending` missions back to `created` and clearing stale claim/lease fields, emitting
  `MISSION_RETRY_RECLAIMED`; `failWithRetry()` WHERE-clause hardened to include
  `'retry_pending'` (1 changed line). Authored by Agent A 2026-09-16 ~20:55 MDT.
- Test receipt: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5: 12/12 assertions.
- Target canonical source location: `ping-runtime/orchestration/mission_runtime.js` on
  `constitutional-convergence-v2`.

## mission_scheduler.js

- Live path: `/app/ping-runtime/orchestration/mission_scheduler.js` (container `ping-gateway`, Oracle host)
- Live sha256: `cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804` (MATCHES Phase 2 report)
- Extracted to: `~/workspace/ping-overnight/drift-sources/mission_scheduler.js.live-20260917`
- Byte size: 14612
- Extraction time: 2026-09-17 ~05:40 MDT (this session)
- Extraction method: `docker exec ping-gateway cat <live path>` over SSH via
  `/home/hatch/workspace/pig-fb/oracle-ssh.sh -s`, stdout redirected locally on this machine.
  Read-only; no container/host modifications.
- Secret scan: clean. `grep -Ein 'password|passwd|secret|token|api[_-]?key|bearer'` on the live
  file returned no matches: plain application code, no embedded secrets.
- No git/worktree source copy exists: confirmed by the Phase 2 report (drift item 4). Note the
  Phase 2 finding that the pre-patch baseline of this file had already diverged from the repo
  HEAD blob (pre-existing deployment-lineage drift), so the vs-HEAD delta below also contains
  two `originator: payload.originator || null,` added lines that are NOT part of tonight's
  P0 fix; they pre-date it.
- Baseline used: `HEAD` blob of `ping-runtime/orchestration/mission_scheduler.js` at
  `099927152b93e0de7c1a120bc88d73fb939c1502` on `/home/nolan/ping` (Pig WSL),
  copied via `git show HEAD:<path>` to `mission_scheduler.js.HEAD-099927152`.
- Delta vs HEAD (`mission_scheduler.js.delta-vs-HEAD.diff`): 14 added, 0 removed.
  New poll Arrow 1b (+12 lines) calling `reclaimRetryPending()` before dispatch, non-fatal on
  error, runs regardless of capacity; plus the two pre-existing `originator` line additions
  noted above. Authored by Agent A 2026-09-16 ~20:55 MDT.
- Test receipt: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5: 12/12 assertions.
- Target canonical source location: `ping-runtime/orchestration/mission_scheduler.js` on
  `constitutional-convergence-v2`.

## Integrity verification (this machine, post-extraction)

```
4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c  mission_runtime.js.live-20260917
cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804  mission_scheduler.js.live-20260917
```

Both match the Phase 2 report's live sha256 values exactly.

## Change ledger

- No commits, pushes, merges, resets, history rewrites, branch deletions, `git clean`, or
  destructive operations were performed anywhere.
- No service restarts, no DB writes.
- Oracle host untouched beyond read-only `docker exec ... cat` / `grep` / `wc`.
- Playbook revision 194a2b85bde957ed not touched. Nothing deleted.
- Files written (this machine only): the two `.live-20260917` extracts, the two
  `.HEAD-099927152` baselines, the two `.delta-vs-HEAD.diff` files, and this PROVENANCE.md,
  all under `~/workspace/ping-overnight/drift-sources/`.
