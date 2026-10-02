# T-05 fixture 03: death after effect before acknowledgement

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 mission_runtime.js; recover.ts lineage pattern (new run with
lineage, never resume in place); proven-failures-only _failMission gate.

## Setup

1. A mission row exists: status 'running', effect_count 0, outcome NULL.
2. The worker process executes the consequential external effect successfully
   (email sent, form posted, payment submitted) and is KILLED before the
   acknowledgement returns: SIGKILL, OOM, host reboot, container eviction.
3. The effect-count half of the HOLD invariant never observed the increment:
   effect_count still reads 0 though the real-world effect count is 1.

## Trigger

Orphan detection (findOrphanedRunning or equivalent) finds a 'running' row whose
worker is dead and whose effect channel may have executed.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

## Expected correct behavior

- Orphaned-started mission parks as HOLD (not FAILED: the effect may have
  happened; FAILED would lie). retry_eligibility = FALSE.
- Reconciliation PROVES EFFECT via an out-of-band check (channel receipt,
  idempotency-key replay protection, provider-side dedup): effect happened
  exactly once → outcome SUCCEEDED, effect_count corrected to 1 with the
  evidence cited, reconciliation_required FALSE.
- The only permitted retry path is PROVE ABSENCE: the reconciler must demonstrate
  the effect never landed (e.g., channel logs show no receipt AND the channel
  offers no at-least-once retry of its own) before outcome SAFE_TO_RETRY is set.
- If the effect is non-idempotent and absence cannot be proven: HUMAN DECISION,
  continued HOLD. The machine never re-executes a consequential effect on a
  timeout or a dead worker alone.

## Known hostile outcome (must FAIL the fixture)

Any implementation that treats dead-worker as failed-worker and retries:
_failMission is proven-failures-only, and a dead worker after possible effect is
NOT a proven failure. Retry-on-orphan without PROVE ABSENCE double-executes.
Also hostile: resuming the dead worker's attempt in place instead of recover.ts
lineage (new run with lineage, never resume in place).
