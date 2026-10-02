# T-05 fixture 06: zombie result

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: fencing tests (zombie writes match zero rows); attempt-fencing.ts;
proven lifecycle (OPEN → KNOWN_PERMANENT → RESOLVED → REOPENED, idempotent, auditable).

## Setup

1. Mission row M1: claimed by worker W1 (status 'running', fencing token T1).
2. W1 stalls; the lease expires; the mission is reconciled or re-attempted by a
   new worker W2 (new fencing token T2), which executes the effect and journals a
   result. M1 is now reconciled: outcome SUCCEEDED or SAFE_TO_RETRY-resolved.
3. W1 is not actually dead: it wakes and delivers its result for token T1, a
   result computed against a stale world.

## Trigger

A result write arrives carrying a superseded fencing token / claim generation.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

The zombie result threatens the reconciled truth: accepting it would overwrite a
proven outcome with a stale one, or double-count an effect.

## Expected correct behavior

- The zombie write matches ZERO rows: the result write is conditional on the
  current fencing token / claim generation, so W1's write is rejected outright.
- The reconciled outcome is untouched: W2's SUCCEEDED stands; effect accounting
  stays at exactly 1 real execution.
- The rejected zombie is recorded as evidence (attempt log: superseded token T1,
  rejected at <ts>), not silently dropped without a trace and not applied.
- If the zombie arrives while the mission is still HOLD (W2 has not yet
  reconciled): the zombie result is treated as one input to reconciliation, not
  as a resolution. HOLD continues until the invariant resolves through the
  evidence cube (PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION).

## Known hostile outcome (must FAIL the fixture)

Last-writer-wins on results: the zombie overwrites the reconciled outcome, or
its effect is counted a second time, or its stale data becomes the journaled
truth. Also hostile: accepting the zombie as proof of effect when it is actually
proof of a superseded attempt.
