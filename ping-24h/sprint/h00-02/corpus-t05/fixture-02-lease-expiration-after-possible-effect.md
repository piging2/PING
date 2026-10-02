# T-05 fixture 02: lease expiration after possible effect

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 mission_runtime.js (claim lease, lease_until, reapExpiredLeases
narrowed by constitutional PARK/HOLD; 'assigned' rows reclaimed to created ONLY when no
effect is possible).

## Setup

1. A mission row exists: status 'assigned', assigned_to <scheduler-1>,
   lease_until = NOW() + 60s, retry_eligibility TRUE, effect_count 0.
2. The worker begins dispatch of a consequential effect just before the lease
   boundary: effect possibly executed at <ts> = lease_until - epsilon.
3. The scheduler heartbeat misses (GC pause, process stall, network partition);
   the lease expires while the effect's fate is unknown.

## Trigger

reapExpiredLeases observes the expired lease on a mission that may have produced
an external effect.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

## Expected correct behavior

- The reaper does NOT reset this mission to 'created'. The narrowed reaper rule:
  only 'assigned' rows with NO possible effect are reclaimed (lease expired before
  any dispatch began). A row past the dispatch-start point goes to HOLD with
  retry_eligibility = FALSE.
- hold_record captures: lease expired at <ts>, dispatch possibly in flight,
  reaper actor, why created-reset was refused.
- Reconciliation then resolves per the shared invariant: PROVE EFFECT (provider
  lookup shows the send landed → SUCCEEDED, effect_count 1, no re-execution),
  PROVE ABSENCE (provider shows nothing received → SAFE_TO_RETRY, same row
  reused, final effect_count exactly 1), or HUMAN DECISION (continued HOLD).

## Known hostile outcome (must FAIL the fixture)

The OPEN design gap recorded in AGENTS.md: after a HOLD record, mission leaves
_processing, lease expires, reapExpiredLeases resets HOLD → created → redispatch
~60s later. That is an automatic retry of an unknown-outcome mission. This fixture
is the direct detector for that gap: if the reaper path can reach 'created' for a
possibly-executed mission, the fixture fails and the gap is live.
