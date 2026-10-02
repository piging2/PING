---
name: "social_interdependence_threads"
description: "Autonomous Threads engagement loop for PING Social: discovery, deterministic eligibility, durable intents, budgeted dispatch through the Threads adapter, read-after-write verification, canonical evidence, and machine watchdogs. No per-action human approval; machine-enforced invariants, circuit breakers, and safe mode replace it."
---

# Social Interdependence - Threads

Autonomous engagement on Threads (@nolanpigi) with no per-action human
approval. The ordinary path is fully machine-gated: the deterministic
eligibility authority (`engagement-guard.py`), the autonomy envelope,
budgets, leases, read-after-write verification, evidence, circuit
breakers, and watchdogs replace the human. The human remains the
authority for: issuing or revoking the envelope, changing ceilings,
clearing holds, and first-contact decisions (e.g. Monument View stays
no-autonomous-contact per standing order).

**LIVE EXTERNAL EXECUTION: BLOCKED in this environment.** No credentials
here; the Pig is unreachable from here. The executor boundary defaults
to the fixture (`fixtures/fake_threads_executor.js`). On the operator
host, set `SI_THREADS_EXECUTOR=pig` to dispatch through
`~/workspace/pig-fb/run_th_pass.sh`.

## Run one pass

```sh
bin/th-si-cycle.py --batch-id <id> --candidates candidates.json
```

Phase order (all machine-enforced):
1. `holds.json` check (step 0, fail-closed) + safe-mode probe.
2. Lease acquire (one worker per pass).
3. Decide + intend: normalize each candidate, call the REAL
   `engagement-guard.py eligibility_check`, write the decision record,
   create the durable intent (idempotent by `intent_id`), consume budget
   atomically.
4. Drive: dispatch each drivable intent to the adapter, verify
   read-after-write, write canonical evidence, update the relationship
   ledger.
5. Watchdog check, release lease.

## Recover from a crash

```sh
bin/th-si-reconcile.py --json
```

Reconcile reads external state for anything uncertain and moves intents
to terminal states. It never re-dispatches blindly and never invents
eligibility.

## Invariants (runtime assertions, `src/si_policy.py`)

- `NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT`
- `NO_DUPLICATE_ACTIVE_INTENT`
- `NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION`
- `NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION`
- `NO_LEARNER_POLICY_SELF_MODIFICATION`
- `NO_ADAPTER_DECISION_AUTHORITY`
- `NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN`
- `TAB_HYGIENE` (worker opens its own window, closes it; never the
  user's tabs)

## Stop conditions (autonomous, no human needed)

- Hold active in `holds.json` (owner or tripwire only).
- Safe mode: identity / policy / capability / event-persistence /
  verification unavailable -> reads continue, new mutations stop.
- Circuit breaker open in the intent's scope.
- Budget exhausted -> DEFERRED, retried next window.
- Platform flag (checkpoint / action block / rate limit) -> breaker
  opens, intents CANCELLED.
- Guard verdict not ELIGIBLE, or UNKNOWN -> never dispatched.

## Key files

- `AUTONOMY_ENVELOPE.md` - the authorization boundary (budgets mirror the
  authorized ceilings: 45 likes + 12 comments per 2h).
- `STATE_MACHINE.md` - states, legal transitions, replay semantics.
- `CAPABILITY_MATRIX.md` - threads: like + comment only.
- `RECOVERY_PROTOCOL.md` - reconcile, never replay.
- `WATCHDOG_SPEC.md` - what the watchdog may and may not do.
- `EVAL_PLAN.md` - how the loop is graded.
- `schemas/` - JSON Schemas for intent, decision record, envelope,
  transition, budget, evidence, adapter protocol.
- `bin/` - `th-si-cycle.py`, `th-si-reconcile.py`.
- `src/` - `si_state.py`, `si_policy.py`, `si_adapter.py`,
  `si_verify.py`, `si_watchdog.py`.
- `fixtures/` - adapter-boundary fakes ONLY.
- `tests/` - runnable: vertical slice, failure injection, adversarial.
- `references/` - harvested evidence notes.

## Rules that bind this skill

- TASTE IS NOT ELIGIBILITY: ranking/curation lives above eligibility,
  never inside the guard's data files. Comment copy comes from the
  curated layer; the harness never invents it.
- `holds.json` (via `set-hold.py`) is the ONLY freeze mechanism. Prose
  never freezes.
- Never re-engage: the guard's durable history + intent ledger are the
  authority. After a VERIFIED_SUCCESS, the deployment records it via
  `engagement-guard.py record --platform threads` before the next pass.
- No em dashes in anything written for Nolan.
- Scheduling variation is operational only (priority, queue depth,
  cooldowns, budgets, backpressure). No randomness for evasion, no
  disguise, no detection circumvention. Rate-limit compliance and
  eligibility gating are the whole of "avoiding detection".
