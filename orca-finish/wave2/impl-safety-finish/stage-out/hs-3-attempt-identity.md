# SPEC (UNBUILT) — HS-3: attempt identity + per-attempt records

**Status: SPEC ONLY. Not built, not wired, no production callers.**
Source: ORCA-A harvest backlog, `~/workspace/orca-finish/wave2/impl-safety/GAP-ANALYSIS.md`.
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: `lib/orca/orca_attempt_identity.js`
(pure derivation + record constructor) + tests.
The `ping_attempts` DDL is a PING-side spec artifact, not built here.

## Problem

Attempts are implicit (a counter incremented somewhere in the loop), so
crash re-claim, zombie late completions, and attempt-scoped rendezvous have
no stable identity to key on. Every attempt needs a stable id and a record
written BEFORE dispatch and updated AFTER, so a crash between dispatch and
result can be reconciled against the attempt, not the run.

## Contract

- `attempt_id = run_id + '-attempt-' + n`, where `n` is 1-based and
  monotonically increasing per run. Stable: the same (run, n) always
  derives the same id. `n` is a positive integer; anything else throws.
- `newAttemptRecord({ runId, n, holderId, epoch, dispatchedAt, input }) ->
  record` constructs the per-attempt record with all required fields; no
  optional core fields. Record shape (binding field names):
  `attempt_id`, `run_id`, `n`, `holder_id`, `lease_epoch`,
  `dispatched_at`, `input_digest` (sha256 of canonicalized input, never the
  raw input), `status` (`DISPATCHED`), `result_digest` (null until
  completion), `completed_at` (null until completion).
- Lifecycle: record written BEFORE dispatch (crash window closed by
  construction: a crash after dispatch has a DISPATCHED record to
  reconcile); updated AFTER with `result_digest` + `completed_at` on
  completion, or terminal failure state on failure.
- Crash re-claim PRESERVES `attempt_count`: a re-claimed run resumes at
  `n+1`, never reuses `n`. Reused attempt ids are the zombie-completion
  vector (C3-(1) / HS-4).
- `holder_id` + `lease_epoch` on the record are the fencing token the HS-4
  write path checks: a completion carrying a stale (holder, epoch) pair is
  refused at the SQL WHERE, not after.

## Composition

- `orca_outcomes.js` `recordStep`: step records carry `attemptId`; HS-3 is
  the derivation authority for that id.
- HS-2: attempts hang off `run_id`; attempts never rewind run state.
- HS-4: the fencing epoch on the attempt record is what the lease SQL
  enforces.
- The branch already has attempt-scoped rendezvous
  (`orca-rendezvous-${attemptId}.json`, current-attempt-only collection)
  and refuse-to-redispatch-while-RUNNING. HS-3 gives those mechanisms the
  stable identity they currently approximate with counters.

## Acceptance criteria (the tests that must pass when built)

1. Derivation: `attemptIdFor(runId, 1) === runId + '-attempt-1'`, stable
   across calls; `n = 0`, negative, or non-integer throws.
2. Constructor: all binding fields present; `input_digest` is 64-hex and
   differs when input differs; raw input not stored.
3. Re-claim: given a run with attempts 1..3, the next derived id is
   `-attempt-4`, never a reuse.
4. Record carries `holder_id` + `lease_epoch` (fencing token present).

## Explicitly out of scope

- The `ping_attempts` DDL and any PG wiring. PING lane.
- Changing the branch's rendezvous file naming. The branch is read-only.
