# FC-6: slow-path recovery races (Q3)

## Shape
Injecting 2-5s latency into commit/checkpoint writes does not invent new
torn-state mechanisms. It widens every existing recovery window from
milliseconds to seconds, turning rare races into certainties. Three facets,
all reproduced with real threads, real SIGKILL, and a real supervisor
timeout:

1. **Double-recovery (q3a-naive, 3/3 DUPLICATED).** Worker holds a 4s slow
   commit; supervisor timeout (2s) declares it dead and re-runs the unit.
   The worker's commit then lands too: the non-idempotent effect exists
   twice. The failure detector fired correctly by its own rule (no
   heartbeat for 2s); the worker was alive but slow. No crash is needed.
2. **Split-transaction orphan (q3b-split, 3/3 LOST-STATE without reaper).**
   Real SIGKILL between the claim commit and the effect commit leaves the
   packet CLAIMED with zero effects. Nothing will ever pick it up unless a
   reaper exists. The single-transaction shape has no such window
   (q3b-single, 3/3 SURVIVED: atomic rollback, packet back to ENQUEUED).
3. **Torn checkpoint (q3c-naive, 3/3 DUPLICATED).** Outbox loop: dispatch
   (own commit), 0.4s gap, mark dispatched (own commit). SIGKILL in the gap
   leaves row 5 dispatched-but-unmarked; redelivery dispatches it again.

## Why it matters
Every one of these windows exists at full speed too, but at millisecond
width they are "never happens in practice" races. A slow dependency (a
5s commit under load, a stalled checkpoint) holds each window open long
enough that the recovery path — supervisor, reaper, redelivery — is
guaranteed to walk through it. Designing the recovery path for the fast
case and hoping the slow case never happens is the bug.

## Fix class
- Every externally visible effect carries a deterministic idempotency key
  (INSERT OR IGNORE semantics): q3a-fixed 3/3 SURVIVED, q3c-fixed 3/3
  SURVIVED with all 10 rows delivered exactly once.
- Keep claim+effect in one transaction where possible: the single-txn
  shape has no orphan window at any speed.
- Where two phases are unavoidable, a reaper/sweeper owns orphaned
  CLAIMED-without-effect work: q3b-split+reaper 3/3 SURVIVED; without it,
  3/3 LOST-STATE. The reaper is load-bearing, not best-effort.
- What is NOT the fix: shortening the supervisor timeout (makes
  double-recovery more likely) or lengthening it (delays real recovery).
  The timeout value does not remove the window; idempotency does.

## Regression test
`fixtures/fc6-slow-path-recovery.py`: three naive acts must print
DOUBLE-RECOVERY / ORPHANED / TORN-CHECKPOINT and the three fixed acts must
print ABSORBED. Exit 0 iff all six behave.
