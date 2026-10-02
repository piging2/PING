# Failure classes — worker E2 (recovery vertical), 2026-09-24

New failure classes defined in the reference implementations (all fail-closed by design):

## P-20260923-005 (impl/P-20260923-005/schema.ts)
- `CheckpointSchemaError` — any structural violation of the checkpoint record:
  non-decimal checkpoint_id, empty run_id/step_id, non-object values/
  channel_versions/versions_seen, non-integer versions, and — the load-bearing
  case — any channel value that is not exactly `{$ref: "<scheme>:<id>"}`.
  Rationale: checkpoints must never carry inline state/secrets; a malformed
  record is rejected, never normalized.

## P-20260923-006 (impl/P-20260923-006/overdue.ts)
- `UnknownRunStateError` — isOverdue called with a state outside 095's
  canonical vocabulary. Rationale: an unrecognized state must not silently
  default to "not overdue" (which would strand work) or "overdue" (which
  would redrive live work). Fail-closed, mirroring 095's projection posture.

## P-20260923-013 (impl/P-20260923-013/recover.ts)
- `AttemptNotDeadError` — planRecovery called on an attempt whose lease is
  live, inside grace, or unknown (null). Rationale: recovering a possibly-live
  attempt risks double execution; death must be PROVEN (lease expired + grace
  elapsed), never assumed. This is the executable form of 095's R-A
  ("worker disappeared is NOT failed" — and not recoverable until proven dead).
- `InvalidAttemptError` — malformed dead-attempt shape (empty ids, negative
  attempt_number, missing fencing token / dead executor name). Rationale:
  the redrive plan derives identities from these fields; garbage in would
  mint garbage lineage.

## Seam risks noted (not new classes, watch at integration)
- 006 vs 095: two adjacent deciders (projection vs overdue decision) must stay
  composed, not merged. If a future change adds grace to 095's projection,
  006's predicate must be re-examined for dual authority.
- 013's local isDeadExecutor must delegate to 006's isOverdue at repo
  integration; until then it is a contract mirror, and any drift between the
  two is a latent double-decider.
- 005's checkpoint_id monotonicity vs 103's AttemptCheckpoint.seq: two
  orderings of the same underlying fact (checkpoint order within an attempt).
  Keep 005 as the record-level gate and 103 as the write-level gate; do not
  let them define conflicting orderings.
