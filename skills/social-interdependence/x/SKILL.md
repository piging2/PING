# X Autonomous Interdependence Skill

Autonomous, guard-governed engagement on X (Twitter) for the PING Social
authorized account. Every engagement decision is made by the one
eligibility authority (`engagement-guard.py`); every execution is
budgeted, leased, circuit-guarded, verified read-after-write, and
journaled on a hash-chained ledger. The skill never invents permission,
never retries an uncertain non-idempotent mutation, and never declares
success it did not verify.

## What it does

Runs a pass: discover candidates, normalize them, evaluate each against
the live eligibility guard, write durable intents, schedule within
budget/lease/circuit constraints, dispatch through the adapter,
verify by reading external state, and record outcome receipts with an
explicit boolean `ok`. A crash at any point is recoverable: `reconcile`
reads external state and resumes without replaying mutations.

## Components

- `bin/x_orchestrator.py`: the pass harness (authority gate, discovery,
  evaluation, scheduling, dispatch, verification, reconcile).
- `bin/x_invariants.py`: machine-enforced invariants (fail closed).
- `bin/x_store.py`: journal, budgets, leases, circuits, relationships.
- `bin/x_adapter.py`: the dumb-adapter contract; the live adapter
  refuses without credentials in this environment.
- `bin/x_watchdog.py`: fail-closed watchdog and bounded learner.
- `fixtures/xapi_fixture.py`: the only fake, at the adapter boundary.
- `schemas/`: nine JSON schemas for every durable record.
- `tests/`: eight behavioral suites, 134 checks, all passing
  (`tests/run_all.sh`).

## Running a pass

```bash
cd ~/workspace/skills/social-interdependence/x
python3 bin/x_orchestrator.py  # uses var/autonomy-envelope.sample.json
```

In this build environment the live adapter refuses
(`LiveExecutionBlocked`); the fixture drives the behavioral suites.
Live execution requires the authorized account credential flow through
the x-api skill and Nolan's explicit authorization for the run.

## Safety contract (summary)

- Authority gate first: `authority-check.py x` must return clear, and
  the machine-readable hold state must show no active hold.
- Eligibility is decided only by `engagement-guard.py`. UNKNOWN means
  do not dispatch.
- Budgets are ceilings per pass and per week (see AUTONOMY_ENVELOPE.md);
  a failed pass is retried, never answered with lower caps.
- 429 is a hard stop for the scope. 401/403 is a question about the
  request before the key: open the adapter circuit, defer, record an
  auth incident.
- Read-after-write verification before any success claim; UNKNOWN
  outcomes persist without an `ok` boolean.
- The watchdog may reduce, stop, defer, or roll back. It may never
  grant authority.

## References

- `references/guard-call-contract.md`
- `references/xapi-call-contract.md`
- `references/circuit-precedent.md`
- `references/ok-boolean-lesson.md`
