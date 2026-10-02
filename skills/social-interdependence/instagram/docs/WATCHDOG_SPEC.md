# WATCHDOG_SPEC: social-interdependence/instagram

The watchdog (`bin/siig_watchdog.py`) observes passes and stops,
defers, or rolls back work. It may never grant authority, raise
budgets, or approve an action. Its outputs are: stop (recorded in
`state/watchdog.json`), defer (intents to DEFERRED), and rollback
(marking VERIFIED_SUCCESS intents whose verification is later
contradicted; the platform effect itself is not un-liked).

## Signals per pass

`evaluate_pass(batch_id, envelope)` computes from the transition log:

- failure_rate: FAILED_RETRYABLE + FAILED_TERMINAL over terminal
  intents. Above `maximum_failure_rate` (0.10) -> stop.
- unknown_rate: UNKNOWN over active intents. Above
  `maximum_unknown_rate` (0.25) -> pause for reconcile (defer new
  dispatches; the pass may resume after reconcile clears the backlog).
- negative_feedback_spike: platform signals `action_limited`,
  `checkpoint`, or `auth_expired` at or above
  `negative_feedback_spike` (3) in one pass -> trip the platform
  breaker and stop.
- budget_anomaly: committed spend exceeding reserved spend, or spend
  outside the 2h window -> stop and record (fail closed on accounting
  inconsistency).

## Stop semantics

- A stop is recorded with the pass metrics, the threshold crossed, and
  the evidence. It is not a hold: `holds.json` is untouched.
- A later pass starts clean; the stop does not persist as policy. If
  the underlying cause persists (breaker still open, authority denied),
  the next pass stops again for the same machine reason.
- The watchdog never edits the autonomy envelope, the guard data, or
  the capability matrix.

## Rollback semantics

Rollback here means truthfulness, not un-doing the platform:

- If a later verification read contradicts a VERIFIED_SUCCESS (the
  like is gone and the platform shows no trace), the intent is
  transitioned to a terminal correction with the contradicting
  evidence, the relationship touch is annotated (not deleted; history
  is append-only), and the guard history entry is corrected through
  the guard's own record path.
- The skill never issues a compensating platform mutation on its own
  (no auto-unlike). Compensation is a new intent class and needs its
  own authority.

## What the watchdog does NOT do

- Grant authority or override a DENY.
- Retry failed intents itself (retries are the executor's bounded
  loop).
- Re-rank candidates (taste is the decision layer's job).
- Learn parameters (the learner proposes; the watchdog only enforces
  the envelope it was given).
