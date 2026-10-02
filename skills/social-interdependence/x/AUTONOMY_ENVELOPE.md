# Autonomy Envelope

The envelope (`var/autonomy-envelope.sample.json`, schema
`schemas/autonomy-envelope.json`) is the machine-readable statement of
what the autonomous loop may do. Constitutional fields are owner
authority; the learner may tune only `learner_tunables` inside their
[min, max].

## Ceilings (2026-10-01 owner directive)

Per 2h pass: 30 likes, 5 follows, 3 comments.
Per week: 210 likes, 35 follows, 21 comments.
Weekly ramp: +5 likes and +3 comments per week.
Pass cadence: 7200s. Concurrency: 1 inflight per account.

A failed pass is retried, never answered with lower caps (standing
rule). The safety rules are never weakened for volume; zero engagement
under the guard is the honest signal.

## Ceiling reconciliation (2026-10-01 ~12:57 MDT, Nolan's explicit decision)

AUTHORITY.json's X surface previously recorded a standing volume of
"5 follows + 3 comments + 10 likes per pass" (2026-09-29). Nolan
reconciled the conflict: go with the highest 30 likes per pass, and
only scale back if real platform flags are hit. The 30-likes envelope
is now the single reconciled ceiling; the conflict is closed.

## Policy fields

- `authorized_accounts`: ["ping_social"]. Only this account may be
  acted through (NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT).
- `allowed_platforms`: ["x"]. `allowed_action_types`:
  like, follow, comment.
- `allowed_capabilities`: x.like, x.follow, x.comment, cross-checked
  against `action-capability.json` at dispatch time.
- `retry_policy`: max_attempts 2; bounded retry only for idempotent
  actions (like, follow) and only after a verification read positively
  shows absence. Comment is non-idempotent: timeout -> FAILED_TERMINAL.
- `circuit_breaker_policy`: failure_threshold 5, timeout_threshold 3,
  half_open_cooldown_sec 21600.
- `verification_requirements`: canonical success requires
  read-after-write; the outcome `ok` boolean is required.
- `maximum_failure_rate`: 0.2. `maximum_unknown_rate`: 0.1.
  Breaches feed the watchdog.
- `relationship_budget`: max_touches_per_30d 1.
- `learner_tunables`: dispatch_spacing_sec [60, 900],
  half_open_probe_budget [1, 3], verification_read_delay_sec [0, 30].

## Overrides in tests

`X_SI_OUTREACH_ROOT`, `X_SI_HOLDS_PATH`, `X_SI_AUTHORITY_PATH`,
`X_SI_CAPABILITY_PATH`, `X_SI_GUARD_PATH`, `X_SI_CHAOS`,
`X_SI_CLOCK_ISO`. The guard path itself is never overridden: test
doubles would invalidate the one-authority property. Production
ledgers are never touched by tests.
