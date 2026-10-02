# Watchdog Spec

The watchdog is fail-closed. It may REDUCE, STOP, DEFER, or ROLLBACK
pass behavior. It may NEVER grant authority: any attempt to widen the
envelope, raise a ceiling, authorize an account, or add a platform or
capability raises WATCHDOG_MAY_NOT_GRANT_AUTHORITY.

## Evaluation

`Watchdog.evaluate()` reads the durable streams (outcome receipts,
invariant violations, journal, unknown-persisted) and emits a report
(`schemas/watchdog-report.json`, appended to
`watchdog-reports.jsonl`):

- policy_violations > 0 or duplicate_canonical_actions > 0 -> STOP.
  STOP writes the SAFE_MODE file with a machine-readable reason.
- verification_failures > 0 -> REDUCE (STOP if already stopping).
- failure_rate > maximum_failure_rate (0.2) -> REDUCE.
- unknown_rate > maximum_unknown_rate (0.1) -> REDUCE.
- Otherwise OK.

## SAFE_MODE

While the SAFE_MODE file exists, `run_pass` returns verdict SAFE_MODE
before discovery and performs zero mutations. Reconciliation reads
may still run (they mutate nothing). SAFE_MODE exits only on an
explicit, recorded operator action (`exit_safe_mode`), which is itself
journaled to the watchdog reports.

## The bounded learner

`BoundedLearner` tunes operational params inside constitutionally
fixed [min, max] (`learner_tunables` in the envelope). It cannot touch
authority, ceilings, accounts, platforms, or capabilities: any such
proposal raises, as does any param outside its [min, max].

Promotion SHADOW -> CANARY -> ACTIVE requires machine-verifiable
gates on a watchdog report: policy_violations == 0,
duplicate_canonical_actions == 0, verification_failures == 0,
unknown_rate <= maximum_unknown_rate. A dirty report fails promotion
closed; the proposal stays SHADOW.

Reaching ACTIVE captures the report as the baseline. `check_regression`
compares each later report against the baseline; any gate worse than
baseline triggers automatic rollback to ROLLED_BACK and clears the
active config.

## Provenance

Watchdog reports and learner proposals are hash-chained journal
citizens: every report, proposal, promotion, and rollback is a
durable, replayable record. The watchdog never clears SAFE_MODE
silently and never promotes on metrics alone.
