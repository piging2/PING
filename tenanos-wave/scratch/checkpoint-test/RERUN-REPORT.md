# RERUN-REPORT.md - C1 durable checkpoint proof, canonical-005 rerun

Worker INT-FINAL, TenantOS autonomous convergence wave close-out. 2026-09-24 ~06:10 MDT (12:10 UTC).

**Objective:** re-run the C1 durable checkpoint proof against the canonically
integrated P-20260923-005 (commit b526b352 on tenanos-wave/integration @
51d4a187, `src/tenanos/checkpoints/schema.ts`). The original run (TEST-REPORT.md)
used an inline 005-shaped record because 005 was still `proposed`; this rerun
points the record-shape construction and validation at the integrated module.

**Verdict: PASS - 5/5 tests, two consecutive runs, against canonical 005.**

## What the canonical 005 API actually is (read from the integrated module)

`src/tenanos/checkpoints/schema.ts` @ 51d4a187 exports:
- `CheckpointRecord`: `checkpoint_id` (monotonic per run, DECIMAL integer
  string, BigInt-ordered), `run_id`, `step_id`, `values`
  (channel -> PayloadRef `{$ref}`), `channel_versions` (channel -> non-negative
  int), `versions_seen` (channel -> {checkpoint_id -> version}).
- `validateCheckpointRecord` (fail-closed, throws CheckpointSchemaError;
  rejects any channel value that is not a well-formed payload ref),
- `isNextCheckpointId(prev, next)`, `versionsSeenCover(prev, next)`,
  `canonicalJson`.
- Pure module: no clock, no IO, no imports.

**The old inline harness shape is NOT a valid canonical record.**
Smoke-tested the compiled module on the Pig: the original inline shape
(`checkpoint_id: "attempt-c1-001:1"`, `versions_seen: []` array,
`payload_ref` string, `fencing_token` in the record) is REJECTED by
`validateCheckpointRecord` with CheckpointSchemaError; a canonical record is
accepted; an inline-secret channel value is rejected. So the harness had to
change shape, not just imports.

## Adaptations (harness only; the integrated module was never modified)

Test tree: `/home/nolan/tenanos-c1-rerun/` on the Pig (tarball of the adapted
scratch tree), isolated worktree `/home/nolan/tenanos-c1-tree` (detached at
51d4a187), canonical module compiled with tsc (strict) from the worktree to
`/home/nolan/tenanos-c1-rerun/canonical/schema.js`.

- `harness/durable-checkpoint-store.js`: `writeCheckpoint` now builds a
  canonical record (`checkpoint_id: String(seq)`, `run_id` from the row,
  `step_id` = step label, `values: {step: {$ref: payloadRef}}`,
  `channel_versions: {step: seq}`, `versions_seen: {step: {[seq-1]: seq-1}}`
  or `{}` for seq 1) and runs `canon.validateCheckpointRecord(cp)`
  FAIL-CLOSED before persisting. The fencing token stays in the attempt row
  (103's write-discipline seam); it is not part of the 005 record.
- `harness/worker.js`, `harness/claimer.js`: payload refs are canonical
  (`idem:<runId>-<stepId>`, matching the module's REF_RE); lineage is derived
  in `writeCheckpoint`; claimer resumes from `parseInt(checkpoint_id, 10)`.
- `checkpoint-durability.test.ts`: asserts canonical fields (decimal
  checkpoint_id, run_id, step_id, `values.step.$ref` string, no `payload` /
  no `payload_ref` properties, lineage shape), `validateCheckpointRecord`
  accepts every persisted checkpoint, `isNextCheckpointId` gates 1->2 (true)
  and 2->2 / 2->1 (false), and `versionsSeenCover` holds over the full
  cp-1..cp-4 chain. Resume expectations use canonical ids ('3', '4').
  Nothing was weakened: the fencing-token assertions moved to the attempt
  row where 103's seam owns them; all four properties are proven identically.

## Evidence (two consecutive runs)

Command (Pig):
`cd /home/nolan/projects/ping && TENANOS_RUN_SRC=/home/nolan/tenanos-c1-tree/src/tenanos/run npx jest --config /home/nolan/tenanos-c1-rerun/jest.config.cjs`

Run 1 (06:05 MDT):
```
PASS ../../tenanos-c1-rerun/checkpoint-durability.test.ts
  property (1): checkpoint persisted DURABLY, survives total handle loss
    ✓ SIGKILLed worker leaves complete durable checkpoint state on disk (91 ms)
  property (2): fresh coordinator discovers the orphan from durable state alone
    ✓ a brand-new process finds the orphaned attempt; substrate projects UNKNOWN_EXECUTION (1627 ms)
  property (3): atomic re-claim — exactly one claimer wins the race
    ✓ 8 concurrent fresh processes race; exactly one wins (209 ms)
    ✓ winner token is required for further writes (zombie discipline) (21 ms)
  property (4): resume from checkpoint — no duplicate effects
    ✓ winner resumes; already-checkpointed steps re-execute as no-ops (93 ms)
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```
Run 2 (06:07 MDT): identical 5/5 PASS (2.3 s). Both runs EXIT=0.

Per-property outcomes against canonical 005:
1. SIGKILLed worker left cp-1/cp-2 on disk as valid canonical records
   (`validateCheckpointRecord` accepts both); cp-3 absent (crash window);
   effects S1..S3 durable.
2. Fresh process discovered the orphan; `projectMission` -> UNKNOWN_EXECUTION;
   `reconcileAttempt` -> HOLD_NEEDS_RECONCILIATION, reexecute false.
3. 8 concurrent claimers: exactly 1 winner, 7 losers; winner token rotates;
   dead token throws FencedWriteError; `attemptTransition` supersede/claim,
   `buildFenceCondition`/`interpretFenceResult` verified.
4. Resume from cp-2: S2/S3 idempotent no-ops, S4 fresh; 4 effects, 4 unique
   idem keys; cp-1..cp-4 all validate canonically with monotonic ids and
   covering lineage; replay of cp-4 rejected by 103's
   NonMonotonicCheckpointError.

## Honest limitations (unchanged from TEST-REPORT.md, plus one)

1. Atomicity enforcer is a filesystem surrogate (O_EXCL); production SQL
   conditional UPDATE atomicity is the database's and untested here (no
   Postgres in this environment). Recorded in failures-C1.md / FC-C1-03.
2. Single-machine SIGKILL simulation; cross-machine fencing out of scope.
3. Exercises the 095/103 deciders and the 005 record contract, not the full
   MissionRuntime/WorkerRuntime end to end.
4. NEW: the canonical module was tsc-compiled from the isolated worktree
   (byte-faithful compile, smoke-tested); the integrated source was not
   modified or re-verified by this run.

Scratch artifacts: adapted tree kept at
`~/workspace/tenanos-wave/scratch/checkpoint-test-canonical/` (local);
Pig copies at `/home/nolan/tenanos-c1-rerun/` and `/home/nolan/tenanos-c1-tree/`
(worktree, read-only use). No repo commits, no pushes.
