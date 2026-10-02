# SPEC (UNBUILT) — HS-6: liveness-checked stale-claim takeover

**Status: SPEC ONLY. Not built, not wired.**
Source: ORCA-A harvest backlog, `~/workspace/orca-finish/wave2/impl-safety/GAP-ANALYSIS.md`.
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: `lib/orca/orca_takeover.js` (pure
three-way decision) + tests. The reaper hook is PING-side, not built here.

## Problem

When a lease expires, the reaper cannot tell a dead worker from a slow one.
Resetting unconditionally steals live work (duplicate execution); never
resetting lets a dead worker's mission wedge forever. The takeover decision
must check liveness BEFORE the HS-4 reaper reset runs, and the default on
ambiguity is to leave the claim alone and raise an alarm.

## Contract

`decideTakeover({ leaseExpired, rendezvousPresent, workerLiveness }) ->
{action, reason}` — pure, no I/O. `workerLiveness` is one of
`alive` / `unknown` / `dead` as determined by the caller's liveness probe
(the generalization of `pidAlive`; the probe itself is PING-side).

Three-way decision (binding):

1. `rendezvousPresent` (a result artifact exists for the current attempt):
   action `accept` — adopt the result, do not reset, do not re-dispatch.
   Reason `rendezvous-present`. A present rendezvous is the worker's
   externally observable completion evidence; resetting past it destroys
   evidence.
2. `workerLiveness` is `alive` or `unknown`: action `leave` + `alarm`.
   Reason `possibly-alive`. NEVER steal a possibly-live claim. The alarm
   must name the mission, the holder, and the lease age so an operator (or
   the HS-5 scheduler, once U2 is resolved) can decide.
3. `workerLiveness` is `dead` AND no rendezvous: action `re-authorize`.
   Reason `dead-no-result`. The mission returns to the pool for a FRESH
   claim (new holder, HS-4 epoch bump on reset); it is not handed to a
   specific worker and never resumed as the dead holder.

Ordering with HS-4: this decision runs BEFORE the `reapExpiredLeases`
reset. Only `re-authorize` proceeds to the reset; `accept` and `leave`
skip it.

## Composition

- `orca_fanout_guardrails.js`: requeue-vs-steal is the same invariant at
  the delegation layer (over-cap work requeues and waits; here, expired
  leases re-authorize and wait). Stealing is never a primitive.
- `orca_outcomes.js`: no-blind-retry. A `re-authorize`d mission is a new
  claim with a new epoch, not a retry of the dead attempt; the dead
  attempt's late result, if it ever arrives, is refused by the HS-4 fence
  (stale epoch).
- HS-2: `re-authorize` does not rewind run state; the new claim is a new
  attempt under HS-3.

## Acceptance criteria (the tests that must pass when built)

1. Rendezvous present + worker dead: `accept` (evidence wins over
   liveness).
2. No rendezvous + liveness `alive`: `leave` + alarm, never steal.
3. No rendezvous + liveness `unknown`: `leave` + alarm (ambiguity defaults
   to non-interference).
4. No rendezvous + liveness `dead`: `re-authorize`.
5. Decision is pure: same inputs, same output, no clock, no I/O.

## Explicitly out of scope

- The liveness probe itself (`pidAlive` generalization) and the reaper
  hook that calls this decision. Both are PING-side.
- Takeover of the SCHEDULER lock (HS-5). That is a different primitive
  with a different holder policy (U2, Nolan's call).
