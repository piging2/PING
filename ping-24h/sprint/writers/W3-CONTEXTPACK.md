# W3-1: U7 ContextPack/evidence assembly, ORCA LOOP PATH: Writer Report

## VERDICT: NO CHANGE

The orca-a G1 fixes are already present in the reached orca loop, proven byte-level
on the mu6wmbzn repro. No worktree was cut, no code was written, no file was
modified anywhere. Zero lost implementation value.

## Semantic unit

U7 ContextPack/evidence assembly, ORCA LOOP PATH ONLY. The "ContextPack" in the
mu6wmbzn run is the t2 task-input object assembled by orca_control_loop.js itself,
not context_pack.py / context_compiler.js / build-context-pack.py (Lane B verified
none of those are in this path; this lane re-verified: no reachable call sites in
any loop copy).

## Base pin

- Sandbox repo path: no git repo covers the working trees (verified: no `.git` in
  ~/workspace/orca-finish, ~/workspace/orca-finish/program/orca-a, or
  ~/workspace/orca-finish/program/orca-d). Files are workspace snapshots, not
  version-controlled checkouts. HEAD SHA: not applicable (no repo). Dirty state:
  not applicable; nothing was written to any tree by this lane.
- Reached loop pinned by content hash, not by repo: the Pig-side file served to
  production is `/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js`,
  sha256 `4d6e4c70f23b7801b7f4b77a7df795f266b25dd9a4cdc0c505c6d6a25b2ab739`,
  1332 lines, pulled read-only twice (independent pulls byte-identical, `cmp`
  clean). Pulled copies: /tmp/reached_orca_control_loop.js (test subject),
  /tmp/reached_orca_control_loop_r2.js (replay subject). Both ephemeral.

## Reachedness verdict with evidence

REACHED = Pig `/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js`.
Evidence chain (each link independently verified, none assumed):

1. `~/workspace/orca-dispatch-test/run-loop.sh` (the ORCA control-loop launcher)
   execs `node /home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js`.
   That is the production invocation path.
2. `~/workspace/orca-dispatch-test/CONTROL-LOOP-DESIGN.md` (2026-09-18) names that
   same Pig-WSL path as the code that produced orca-run-mu6wmbzn.
3. `~/workspace/orca-finish/program/orca-a/CHECKPOINT.md` records orca-a's copy was
   pulled read-only from the A5 branch worktree `/home/nolan/worktrees/orca-autonomy`
   on 2026-09-23; i.e. orca-a/src is a snapshot of the reached line, not a
   separate implementation.
4. Live read-only SSH probe (BatchMode, first attempt, 19:45 MDT, outside commute
   windows): `sha256sum` of the Pig-side file =
   `4d6e4c70f23b7801b7f4b77a7df795f266b25dd9a4cdc0c505c6d6a25b2ab739`.
   It does NOT match any local copy (see inventory), so the reached file has
   evolved since 2026-09-23; the verdict below is against the CURRENT reached
   bytes, not a stale snapshot.
5. Grep on the live reached file: `G1 fix` x2, `result_recorded` present,
   `missionId` lifecycle-query present. Both fix blocks read back verbatim
   (lines 144-157 and 1104-1122).

Neither `orca-dispatch-test` nor `orca-a` was assumed reached; both were tested
against the live reached bytes.

## Existing implementations searched (register 03#3 + forest)

| Location | sha256 | G1 fixes | Reached? |
|---|---|---|---|
| Pig `/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js` | 4d6e4c70... | YES (verified live, lines 144-157, 1104-1122) | YES (production invocation path) |
| `~/workspace/orca-finish/program/orca-a/src/orca_control_loop.js` | 4abc75ee... | YES | Snapshot of reached line (2026-09-23 pull), not itself executed |
| `~/workspace/orca-finish/program/orca-c/src/orca_control_loop.js` | 4abc75ee... | YES | Byte-identical to orca-a; snapshot |
| `~/workspace/orca-remediation/orca_control_loop.js` | 4abc75ee... | YES | Byte-identical to orca-a; snapshot |
| `~/workspace/tenanos-wave/swarm-20/reference/orca_control_loop.js` | 4abc75ee... | YES | Byte-identical to orca-a; reference snapshot |
| `~/workspace/orca-finish/program/h5-wire/read/orca_control_loop.js` | 7b7bc1c8... | YES + H5 unknown-block additions | Read-only reference copy |
| `~/workspace/orca-dispatch-test/orca_control_loop.js` | bc61bcc5... | NO (buggy trimMission, 437 lines) | NO (nothing executes this copy; run-loop.sh points at the Pig worktree) |

Register locations re-checked: context_pack.py and context_compiler.js not present
in this workspace (frozen canonical tree, unreachable); tandem/build-context-pack.py
present but has zero call sites in any loop copy; P-098 diff unpushed, not in path;
ContextPack v2 API-incompatible, not in path; commit 9a555021 worktree absent.
No new ContextPack system exists or is needed for this unit.

## The fixes in the reached file (verbatim)

G1 part 1, reached lines 144-157: `trimMission` preserves `result_recorded` as a
presence bit (non-empty object/string/array counts; null/undefined/empty do not).
Raw `result` content is not passed through.

G1 part 2, reached lines 1104-1122: lifecycle events queried with
`WHERE event_type LIKE 'MISSION\_%' AND payload->>'missionId' = $1`, merged with
the correlation trace, deduped by event_id, sorted ascending by timestamp, each
event labeled `correlation-trace` or `mission-lifecycle-query`.

## Diff summary

None. No worktree cut, no port, no patch. The smallest winning correction is
already the reached implementation.

## Test evidence: hostile mu6wmbzn repro on the reached bytes

Harness: /tmp/w3-hostile.js (ephemeral). Method: verbatim extraction of
`trimMission` (reached lines 144-157) and the t2 merge block (reached lines
1113-1122) from the byte-verified Pig pull, eval'd, run against reconstructed
mu6wmbzn data (mission 70bd4b9d034b94a4 completed with result recorded; 8 chain
events sharing correlation_id orca-run-mu6wmbzn; 4 MISSION_* events with own
correlation_ids). Pure JS, no DB, no network, no side effects.

Result: 19/19 PASS, exit 0.

- T1: result_recorded=true on completed mission with result; raw result not leaked.
- T2: merged count 12 (8 chain + 4 lifecycle); all four MISSION_* present in
  CREATED/ASSIGNED/STARTED/COMPLETED order; source labels correct; ascending sort.
- T3 (hostile): duplicate event_id across both families appears exactly once.
- T4 (hostile): empty object/null/undefined/empty string result -> false;
  non-empty string/array -> true.
- T5 (hostile): null correlation trace -> 4 lifecycle events still assemble.
- T6 (hostile): out-of-order lifecycle rows -> merged in chronological order.
- T7 (before/after): buggy orca-dispatch-test trimMission has neither `result`
  nor `result_recorded`; reached version returns the presence bit. The fix is a
  real behavioral delta, and the delta is already live.

One harness self-bug found and fixed during the run (malformed synthetic
timestamps in the first version); after the fix all 19 pass. The reached code
was never the failure.

## Replay evidence

Independent second read-only pull of the Pig-side reached file ->
sha256 `4d6e4c70f23b7801b7f4b77a7df795f266b25dd9a4cdc0c505c6d6a25b2ab739`,
`cmp` byte-identical to the tested pull. Full harness re-run on the replay
subject: 19/19 PASS, exit 0 (log: /tmp/w3-hostile-rerun.log, ephemeral).

## Explicitly not done (out of scope, named per task)

- Sufficiency gate (H3): still absent on the JS loop path (Lane B confirmed by
  grep). Named as structural follow-up; no new subsystem built, per task bounds.
- ContextPack v3, new compiler, 9a555021 MC-dispatch seam: untouched, no collision.
- Retrieval sources (U8), identity, HOLD/recovery, decision records, projection,
  tenant authority, FYD: untouched.

## Caveats and follow-ups for the parent

1. The buggy `~/workspace/orca-dispatch-test/orca_control_loop.js` (bc61bcc5) still
   exists in the workspace and still drops result + lifecycle. Nothing executes it
   today (verified: the only launcher points at the Pig worktree), but it is a
   live hazard if anything ever wires it. Recommend labeling it superseded or
   removing it; not done here (outside U7 loop-path ownership, would touch
   another lane's area).
2. The reached file (1332 lines, 4d6e4c70) has drifted past every local snapshot
   (all 4abc75ee copies are the pre-H5 1192-line form). Local "orca-a is fixed"
   claims are true but stale; the authoritative check is the live Pig bytes,
   which this lane verified directly.
3. LOSS 3's structural half (no sufficiency gate on the t2 assembly) remains open
   by design of this task's bounds; the worker's honest chain_complete:false on
   bad input is still the only defense on this path.

## Verdict restated

NO CHANGE. The orca-a G1 fixes (result preservation + lifecycle merge) are present
in the reached orca loop today, proven on the mu6wmbzn repro with 19/19 hostile
assertions and a byte-identical clean replay. Nothing to port, nothing to build.
