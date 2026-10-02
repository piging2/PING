# EVAL_PLAN: social-interdependence/instagram

How this skill is proven, and what would falsify it. Every claim below
names the test or the evidence that carries it. No claim rests on prose.

## The suite (33 tests, `tests/run_tests.py`)

All tests run against scratch trees (`SI_IG_STATE` and
`ENGAGEMENT_GUARD_DIR` point at temp dirs). The guard CODE is the real
`~/workspace/outreach/engagement-guard.py`; the guard DATA is a scratch
copy built by `tests/data/make_scratch.py`. Nothing touches production
logs, the production ledger, or the production guard data.

| area | tests | what would falsify |
|---|---|---|
| happy path | test_happy_path, test_comment_action_end_to_end | a like or comment reaching VERIFIED_SUCCESS without a verification read |
| guard interop | test_guard_blocks_already_engaged, test_guard_blocks_engaged_shortcode_saturation, test_guard_envelope_tamper_refused_at_dispatch, test_no_duplicate_active_intent_across_passes, test_duplicate_handle_in_batch_rejected | an ineligible candidate surviving to dispatch |
| authority | test_authority_deny_blocks_everything, test_authority_fail_closed_on_missing_holds, test_no_adapter_decision_authority | any adapter traffic under DENY |
| identity | test_identity_ambiguity_mx_rejected, test_prohibited_target_rejected, test_expired_credential_enters_safe_mode | a mutation under ambiguous identity or for a prohibited target |
| UNKNOWN recovery | test_timeout_after_success_recovers_without_duplicate, test_kill_after_intent_created_resumes, test_kill_after_dispatched_recovers, test_kill_after_attempting_recovers, test_unknown_stays_unknown_on_outage | a duplicate execution, or UNKNOWN resolving to success without a read |
| budgets | test_budget_exhausted_defers, test_budget_race_single_winner, test_budget_anomaly_trips_stop | double-spend, or caps lowered after failure |
| breakers | test_circuit_breaker_opens_on_checkpoint, test_no_execution_after_breaker_open, test_negative_feedback_spike_trips_platform | execution after an open breaker |
| watchdog/learner | test_watchdog_stops_on_failure_rate, test_learner_promotion_gates, test_learner_out_of_envelope_refused | a stop that grants authority, or a parameter outside the envelope |
| content policy | test_comment_content_policy | a comment violating the policy reaching INTENT_CREATED |
| invariants | test_transition_table_forbids_unknown_to_attempting, test_adapter_lie_caught_by_verification, test_capability_change_between_plan_and_dispatch, test_stale_capability_safe_mode_at_plan | a lie becoming VERIFIED_SUCCESS; UNKNOWN -> ATTEMPTING existing |
| leases | test_two_workers_one_lease | two workers executing for one account |

## Adversarial coverage (beyond the suite)

- **Lying adapter**: returns ok without applying the mutation. Caught
  by the verification read every time; bounded retries; FAILED_TERMINAL.
  Never a false VERIFIED_SUCCESS. (test_adapter_lie_caught_by_verification)
- **Timeout after success**: the mutation applied but the response was
  lost. UNKNOWN; the recovery read finds the mutation; VERIFIED_SUCCESS
  with exactly one execution in the fixture log.
  (test_timeout_after_success_recovers_without_duplicate)
- **Tampered envelope**: evidence_hash replaced at dispatch. Refused;
  CANCELLED; zero executions.
  (test_guard_envelope_tamper_refused_at_dispatch)
- **Stale capability**: matrix disallows like at plan time -> safe
  mode, no intents. Data changed between plan and dispatch -> dispatch
  refilter refuses, CANCELLED, zero executions.
- **Checkpoint on first action**: platform signals a login checkpoint.
  Breaker trips on the platform scope; the second intent defers; nothing
  executes after the open breaker.
- **Concurrent workers**: two workers race one lease; exactly one
  wins; the loser leaves the intent SCHEDULED.
  (test_two_workers_one_lease)
- **Concurrent budget spend**: threads race the last budget unit;
  exactly one reservation wins. (test_budget_race_single_winner)

## Replay proof

`eligibility-replay-173-2026-10-01.md` (zero mismatches vs human
corrections on the FB side) and `eligibility-adversarial-2026-10-01.md`
(12/12) cover the guard this skill binds to. This skill's own replay
proof is the crash-injection series: decision replay from the
transition log plus verification reads reproduces every terminal state
without re-executing a mutation.

## Live-readiness checklist (before the fixture is swapped for the live adapter)

1. Credentials exist and `get_identity()` returns `nolanpigi`
   (LIVE EXTERNAL EXECUTION is currently BLOCKED: no credentials here).
2. `read_state` is a true independent read (profile/post fetch), not a
   cache of the execute response.
3. `execute` surfaces platform signals distinctly: checkpoint,
   action-limited, auth-expired, outage, timeout-after-unknown.
4. One dry run in `noop` mode against the real read path, asserting
   VERIFIED_NOOP handling, before any real mutation.
5. `authority-check.py instagram` returns AUTHORIZED in the live tree
   (it is the same gate the tests exercise against scratch).
