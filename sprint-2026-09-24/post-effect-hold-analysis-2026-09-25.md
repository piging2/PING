# Decision 3 — post-effect-hold WIP: quarantine analysis (2026-09-25)

## Location

`/home/nolan/ping` (Pig), worktree on branch state at 73d06b03c.
Staged-but-uncommitted index changes (5 files, +624/-15):

- ping-runtime/orchestration/mission_runtime.js (+140/-~8)
- ping-runtime/orchestration/mission_scheduler.js (+25/-~2)
- ping-runtime/orchestration/mission_scheduler.reaper_hold.test.js (new, 423 lines)
- ping-runtime/orchestration/mission_scheduler.retry_watchdog.test.js (fake updates)
- ping-runtime/orchestration/mission_scheme_convergence.test.js (fake updates)

Full diff preserved at: ~/workspace/sprint-2026-09-24/post-effect-hold-wip-2026-09-25.diff
Quarantined via: `git stash push -m "post-effect-hold WIP (quarantined 2026-09-25)..." -- ping-runtime/orchestration/`
in /home/nolan/ping. Nothing discarded. Unrelated unstaged file
tools/fyd-site-projection/emit-overlay.py left untouched.

## What the WIP does

Ports the ORCA H5 unknown-block semantics into the canonical MissionRuntime /
MissionScheduler as a row-visible HOLD:

1. New columns on ping_missions: held BOOLEAN, hold_reason TEXT,
   decisions JSONB (operator decision audit trail).
2. Watchdog persists the HOLD via setHeld() BEFORE emitting the
   MISSION_RECONCILE_HOLD record; fail-closed if persistence fails
   (no HOLD claimed, loud log).
3. reapExpiredLeases() NEVER reaps held missions; each skip is recorded
   (log + MISSION_LEASE_REAP_SKIPPED_HELD event).
4. assign() refuses held rows even if status was manually reset to created.
5. recordOperatorDecision() is the ONLY release path:
   - 'release' -> held cleared, status back to 'created', re-enters only via
     the conditional-claim path (never direct dispatch).
   - 'fail' -> held cleared, status 'failed' terminal with decision reason.
   - Unknown actions / empty reasons / unknown ids throw; hold untouched.

6 new tests (reaper_hold.test.js) + updated fakes in 2 existing suites.

## Comparison against canonical committed behavior (HEAD)

HEAD's HOLD is advisory: the watchdog emits a HOLD reconciliation record
(in-memory set + MISSION_RECONCILE_HOLD event), but the reaper does not
honor it — an expired lease returns the mission to `created` and it is
auto re-dispatched. The WIP's own comments call this "a false green."

This is the documented-open reaper-vs-HOLD design gap (workspace AGENTS.md:
"after a HOLD record, mission leaves _processing, lease expires,
reapExpiredLeases resets to created and re-dispatches ~60s later. That is
an automatic retry of an unknown-outcome mission. Do not deploy the
stuck-running watchdog until the design word lands." — explicitly needs
Nolan's design call).

So the WIP does not contradict the retry-counting F-01 repair (orthogonal).
It unilaterally resolves the OPEN reaper-vs-HOLD design question in favor
of: UNKNOWN outcome -> park until recorded operator decision; never
auto-retry. That is a constitutional-behavior change smuggled in as WIP.

## Verdict

Implementation accident must not rewrite constitutional behavior. The WIP is
well-constructed (fail-closed ordering, audit trail, 6 focused tests, no
regression on non-held reaping), and its semantic matches the canonical HOLD
shape (requested transition -> consequence classification -> policy ->
optional human decision -> execute/deny) and the ORCA H5 semantics. It may
well be the right answer — but it needs Nolan's explicit design word first.

## Explicit semantic-change proposal (for Nolan's call)

PROPOSAL: Adopt "UNKNOWN-outcome missions park on a row-visible HOLD until a
recorded operator decision releases them; the lease reaper never
re-dispatches a held mission."

Consequences of adopting:
- Unknown effects can never be silently retried by lease expiry.
- Operator toil: every stuck mission needs a human (or a future policy)
  decision to release or fail it.
- Schema change: held / hold_reason / decisions columns on ping_missions.
- New events: MISSION_LEASE_REAP_SKIPPED_HELD, MISSION_OPERATOR_DECISION.

Consequences of rejecting:
- Keep the advisory HOLD; accept that lease expiry auto-retries unknown
  outcomes (duplicate-effect risk stays open, cf. Q-F-03).
- The WIP stays quarantined in the stash; re-apply deliberately if the
  design word later lands on "park."

Until the call: DO NOT commit, DO NOT deploy the stuck-running watchdog.
