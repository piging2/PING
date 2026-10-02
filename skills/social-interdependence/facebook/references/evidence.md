# Evidence

File:line citations for the load-bearing claims in this slice. All paths are absolute. Line numbers verified 2026-10-01.

## Reused production machinery (not reimplemented)

- The single deterministic eligibility function: `~/workspace/outreach/engagement-guard.py:1229` (`eligibility_check`), reason precedence at `:1145`, UNKNOWN-means-do-not-dispatch semantics throughout.
- Tamper-evident envelope stamp/verify: `engagement-guard.py:1453` (`stamp_evidence`), `:1476` (`verify_evidence`); 6h TTL enforced at verify time.
- Ledger post-ID prefix law (`post:<id>`, bare-ID comparisons always miss): `engagement-guard.py:447` (`_fb_ledger_engaged_post_ids`).
- Authority gate, fail-closed, holds first: `~/workspace/outreach/authority-check.py:2` (docstring), `:405` (HOLDS_JSON_PATH resolution), verdicts at `:278`.
- Production intent ledger lifecycle and the `ok`-boolean outcomes contract: `~/workspace/outreach/action-intent-ledger.py:514` (`cmd_write_intents`), `:646` (`cmd_record_outcomes`), `:749` (`EXECUTED if o.get("ok") else FAILED`).

## This slice's machinery

- Invariant catalog and runtime checks: `bin/si_fb_invariants.py:1-77` (catalog), `:78-175` (checks), `:178-217` (transition table `ALLOWED_TRANSITIONS`, `check_state_transition`, `target_in_flight`, `DUPLICATION_CLOSED_STATES`).
- Append-only state, atomic budgets/leases, the decision-replay fold: `bin/si_fb_state.py:100` (`fold_intents`), `:129` (`budget_consume`), `:164` (`lease_acquire`), `:74` (`read_json` tolerates zero-byte files left by kills).
- Orchestrator pipeline (evaluate -> decide -> intend -> dispatch -> execute -> verify -> finalize): `bin/si_fb_orchestrator.py:490` (`run_pipeline`), `:347` (`drive_intent`), `:313` (`recover_unknown`), dispatch-time gates (authority recheck, envelope verify, live eligibility, breakers, lease) in `drive_intent`'s SCHEDULED branch.
- Transition table enforcement on every write: `bin/si_fb_orchestrator.py:188` (`transition` checks `check_state_transition` before persisting to `intents.jsonl`).
- Deterministic budget ramp (constitutional arithmetic): `bin/si_fb_envelope.py:80`.
- Scheduler admission checks: `bin/si_fb_scheduler.py` (authority, health, safe mode, cadence, lease, breakers, budget).
- Watchdog rates and breaker logic: `bin/si_fb_watchdog.py:115-144` (thresholds, negative-feedback scan).
- Reconcile-not-replay recovery: `bin/si_fb_reconcile.py:42-121`.
- Boundary fixture (the ONLY fake) with fault modes: `bin/si_fb_adapter.py:21-31` (fault catalog), `:75` (`read`), `:90` (`execute`), `:180` (self-check `NO_ADAPTER_DECISION_AUTHORITY`).

## Test results (2026-10-01, all against scratch state)

- `tests/test_eligibility_harness.py`: 13/13 (real guard, real stamp/verify).
- `tests/test_vertical_slice.py`: 18/18 (end to end on the fixture + real production ledger pattern on a scratch ledger).
- `tests/test_failure_injection.py`: 25/25 (5 kill points + 5 fault shapes; exactly-once recovery).
- `tests/test_state_machine.py`: 14/14 (table-checked transitions, deterministic fold).
- `tests/test_invariants.py`: 26/26 (each invariant's legal and violation cases).
- `tests/test_adversarial.py`: 25/25 (duplicates, lease contention, holds, lies, races, saturation, breakers, learner SHADOW).

Total: 121/121. Run with `for t in tests/test_*.py; do python3 "$t"; done` from the slice root.

## Defects found and fixed during construction (each with a regression test)

1. Transitions were written to `transitions.jsonl`; `fold_intents()` only reads `intents.jsonl`, so resume/reconcile were blind. Fixed: transitions persist into `intents.jsonl` (orchestrator `:188`).
2. `read_json` raised on zero-byte files that the locking create path can leave behind after a kill. Fixed: empty files read as absent (`si_fb_state.py:74`).
3. The orchestrator did not thread the guard's `batch_seen` set, so within-batch duplicates were not caught at evaluation. Fixed: `run_pipeline` shares one set across candidates.
4. The `lie_about_success` fixture mutated state before returning its lie, so the test could not exercise the verification catch. Fixed: the lie fires before any state is touched (`si_fb_adapter.py`).
5. Re-running a batch re-created intents for already-terminal intent_ids. Fixed: idempotent re-run reports terminal states without creating, consuming, or touching the platform (`run_pipeline`).
