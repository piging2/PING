# state/

Runtime state for the Instagram platform skill. Created on first run by
`bin/siig_common.py ensure_state_dirs()`.

Contents (all JSON/JSONL, all append-or-atomic-write):

- intents.jsonl: durable intent records (creation only; immutable).
- transitions.jsonl: every state transition with reason + evidence.
- decisions.jsonl: decision records per candidate.
- budgets.json / budget_epoch.json: atomic 2h-window spend + weekly ramp epoch.
- leases/: O_EXCL single-writer leases (one executing worker per account).
- breakers.json: circuit-breaker state per scope.
- relationships.json: relationship touches (VERIFIED_SUCCESS only).
- watchdog.json: pass metrics and stops.
- learner.json: learner stage and bounded parameters.
- guard-snapshots/: per-batch guard evidence snapshots for dispatch-time verification.

Env overrides (tests and multi-tenant use):

- SI_IG_STATE: redirect this directory.
- ENGAGEMENT_GUARD_DIR: redirect the guard DATA tree (the guard CODE
  always loads from the real ~/workspace/outreach tree).

Never commit live state. The tests wipe and rebuild this directory on
every run.
