# TEST-REPORT.md — C1 durable checkpoint test

Worker C1, TenantOS autonomous convergence wave. 2026-09-24.

**Objective (from the failure-class ledger):** the 2026-09-24 ~01:28 UTC daemon
restart killed 15/17 swarm workers ("active before daemon restart but has no
live runtime handle or restart checkpoint"). Recovery used on-disk
checkpoints, but no test proved the durable-checkpoint mechanism. This test
is that proof, at the TenantOS substrate level.

**Verdict: PASS — all four properties proven (5/5 tests, two consecutive runs).**

## What was built

`~/workspace/tenanos-wave/scratch/checkpoint-test/` (scratch only; zero repo
commits, zero pushes, `src/fyd/**` untouched):

- `harness/durable-checkpoint-store.js` — filesystem-backed durable store.
  Atomic tmp+fsync+rename writes; O_CREAT|O_EXCL claim locks; idempotent
  effect log; orphan discovery from disk only. Inline checkpoint record is
  005-shaped (see Dependency below).
- `harness/worker.js` — child process playing the swarm worker. Supports
  SIGKILL-after-effect-before-checkpoint (the incident shape).
- `harness/claimer.js` — child process playing discoverer / claimant / resumer.
- `checkpoint-durability.test.ts` — the jest test. Asserts against the REAL
  integrated substrate deciders from `tenanos-wave/integration`
  (`src/tenanos/run/run-state-authority.ts` [095], `src/tenanos/run/attempt-fencing.ts`
  [103]): `projectMission`, `classifyUnknownExecution`, `isLegalTransition`,
  `attemptTransition`, `validateCheckpoint`, `reconcileAttempt`,
  `buildFenceCondition`, `interpretFenceResult`.
- `jest.config.cjs` — mirrors the wave's scoped config
  (`src/tenanos/jest.config.cjs`, P-20260923-001); roots in this scratch dir.

Executed on the Pig (jest + ts-jest live only in
`/home/nolan/projects/ping/node_modules`; the integration worktree has no
node_modules). Command:

```
cd /home/nolan/projects/ping && npx jest --config /home/nolan/tenanos-wave-scratch/checkpoint-test/jest.config.cjs
```

(`TENANOS_RUN_SRC` env overrides the substrate source dir; default is the
integration worktree.)

## Evidence per property

### (1) Durable persistence — PASS

A real OS child process ran steps S1..S4, writing idempotent effect then
durable checkpoint per step, and was SIGKILLed after S3's effect but before
its checkpoint. `spawnSync` reported `signal: 'SIGKILL'` — total handle loss.
A fresh module instance (require cache dropped) then asserted from disk:

- `attempt.json`: status `running`, `checkpoint_seq` 2
- `cp-1.json`, `cp-2.json` present with 005-shaped records
  (`checkpoint_id: "attempt-c1-001:<seq>"`, monotonic; `channel_versions`;
  `versions_seen` lineage; `payload_ref` string; NO inline `payload`)
- `cp-3.json` absent (the crash window: effect happened, checkpoint did not)
- `effects.jsonl`: exactly S1, S2, S3 idempotency keys

### (2) Fresh-coordinator discovery — PASS

After the worker's lease expired, a brand-new `node claimer.js
--discover-only` process (zero shared memory) found the orphan from durable
state alone: `{attempt_id, status: 'running', checkpoint_seq: 2}`.

Substrate assertions (095/103, in-process):

- `projectMission({status:'running', lease_until: <expired>})` →
  `UNKNOWN_EXECUTION` — not FAILED (R-A), never silently PENDING (R-C)
- `isLegalTransition(UNKNOWN_EXECUTION, NEEDS_RECONCILIATION)` → true;
  `isLegalTransition(UNKNOWN_EXECUTION, PENDING)` → false
- `reconcileAttempt({status:'running'}, {effectProven:false, effectAbsent:false})`
  → `{directive: HOLD_NEEDS_RECONCILIATION, reexecute: false}` — honest hold;
  resume proceeds from the checkpoint, never blind re-execution (R-B)

### (3) Atomic re-claim — PASS

8 concurrent fresh `claimer.js` OS processes raced `claimOrphan()` on the
same attempt. Result: **exactly 1 winner, 7 losers**. Winner's claim is
durable: status `claimed`, `owner` = winner id, fencing token rotated
(dead worker's token now fails `casAttempt` with `FencedWriteError`;
winner's token authorizes writes — A-1 zombie discipline).

Substrate assertions: `attemptTransition('running','supersede')` → `'stale'`
(the token-rotation semantic the claim implements);
`attemptTransition('created','claim')` → `'claimed'`;
`interpretFenceResult(1)` → `'applied'` / `(0)` → `'fenced'`;
`buildFenceCondition(...)` carries the fencing token in the WHERE clause.

A late in-process re-claim lost (`won: false`); a re-entrant resume by the
holder is recognized as already-held, not double-claimed.

### (4) Idempotent resume — PASS

The winner resumed from the latest durable checkpoint (seq 2), re-executing
the last checkpointed step and everything after it:

- S2 (checkpointed): effect re-execution → `duplicate: true`, no new checkpoint
- S3 (effect existed, uncheckpointed): `duplicate: true`, new checkpoint
  `attempt-c1-001:3`
- S4: fresh execution, new checkpoint `attempt-c1-001:4`

Post-resume assertions: `effects.jsonl` has exactly 4 lines with 4 unique
idem keys (no duplicate effects); `cp-1..cp-4` all present;
`validateCheckpoint` accepts each successive pair and rejects a replay of
cp-4 with `NonMonotonicCheckpointError` (A-4); attempt row is `completed`
with `checkpoint_seq` 4.

## Real output (second run)

```
PASS ../../tenanos-wave-scratch/checkpoint-test/checkpoint-durability.test.ts
  property (1): checkpoint persisted DURABLY, survives total handle loss
    ✓ SIGKILLed worker leaves complete durable checkpoint state on disk (97 ms)
  property (2): fresh coordinator discovers the orphan from durable state alone
    ✓ a brand-new process finds the orphaned attempt; substrate projects UNKNOWN_EXECUTION (1628 ms)
  property (3): atomic re-claim — exactly one claimer wins the race
    ✓ 8 concurrent fresh processes race; exactly one wins (223 ms)
    ✓ winner token is required for further writes (zombie discipline) (19 ms)
  property (4): resume from checkpoint — no duplicate effects
    ✓ winner resumes; already-checkpointed steps re-execute as no-ops (81 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

First run: 4/5 (property 4 failed on a harness bug — see Failure classes);
after the fix, two consecutive 5/5 runs. Deterministic.

## Dependency

**P-20260923-005 (checkpoint schema, swarm-14) is still `proposed`, NOT
integrated.** The checkpoint record in this harness is defined inline,
shaped exactly per the 005 proposal notes (LangGraph shape: monotonic
`checkpoint_id`, `step_id`, state as payload refs with no inline secrets,
channel versions, versions-seen lineage). When 005 integrates at
`src/tenanos/checkpoint/schema.ts`, the inline record in
`harness/durable-checkpoint-store.js` must be replaced by an import of the
canonical schema. Nothing in this test creates a second checkpoint
authority; the harness is throwaway test scaffolding.

## Honest limitations (what this does NOT prove)

1. **Atomicity enforcer is a filesystem surrogate.** The race is real
   (OS-level O_EXCL across 8 processes), but the production enforcer is the
   SQL conditional UPDATE carrying the fencing token (`buildFenceCondition`
   / `interpretFenceResult`); its atomicity is the database's. No Postgres
   is available in this environment, so SQL-enforced atomicity is
   untested. Recorded in `failures-C1.md`.
2. **Single-machine.** Daemon restart is simulated by SIGKILL on one host;
   cross-machine fencing (stale lockfiles on a dead host) is out of scope.
3. **The 095/103 deciders are exercised, not the full MissionRuntime/
   WorkerRuntime.** The test pins the substrate contract the runtime must
   honor; it does not prove the runtime honors it end to end.
