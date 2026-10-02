# Architecture

## Layering

```
discovery -> normalize -> evaluate (guard) -> durable intent
  -> schedule (circuit + budget + lease + invariants) -> dispatch
  -> adapter.execute -> read_state -> verify -> outcome receipt
  -> relationship ledger -> reconcile (crash recovery)
```

Each layer is a separate boundary with its own store and its own
invariants. No layer reaches around another: the adapter cannot decide
eligibility, the guard cannot execute, the learner cannot raise
ceilings, the watchdog cannot grant authority.

## Components

- **PassHarness** (`bin/x_orchestrator.py`): the pass. Runs the
  authority gate (step 0, fail closed), discovers candidates through the
  adapter, normalizes identity, calls the real `eligibility_check()`,
  writes durable intents, schedules, dispatches, verifies, and records
  receipts. `reconcile()` resumes interrupted work from the journal by
  reading external state; it never replays mutations.
- **Invariants** (`bin/x_invariants.py`): fail-closed runtime
  assertions. The complete list is in the module docstring; the load
  bearing ones are NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT,
  NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN, NO_DUPLICATE_ACTIVE_INTENT,
  OUTCOME_OK_BOOLEAN_REQUIRED,
  NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION,
  NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION, and the learner
  self-modification trio.
- **Journal** (`bin/x_store.py`): append-only, hash-chained
  (sha256 over the canonical body). `verify_chain()` detects tampering.
  Every intent state transition is journaled with actor, reason, and
  identity key.
- **BudgetLedger**: atomic, fcntl-locked consumption against per-pass
  and per-week ceilings.
- **LeaseStore**: per-intent exclusive leases with TTL; a second
  worker cannot schedule an intent another worker holds.
- **CircuitStore**: CLOSED / OPEN / HALF_OPEN per scope, reproducing
  the 2026-09-30 x-probe precedent (see
  `references/circuit-precedent.md`).
- **RelationshipLedger**: per-identity touch counts; the saturation
  rule (max touches per 30d) prevents re-touching.
- **Adapter** (`bin/x_adapter.py`): dumb by contract. `execute`,
  `read_state`, `discover`. Reports raw results, never interprets.
- **Watchdog / BoundedLearner** (`bin/x_watchdog.py`): the watchdog
  evaluates receipt/violation/journal streams and may REDUCE, STOP
  (writes SAFE_MODE), DEFER, or ROLLBACK. It may never grant authority.
  The learner tunes operational params inside constitutionally fixed
  [min, max] and promotes SHADOW -> CANARY -> ACTIVE only on
  machine-verifiable gates, with automatic rollback on regression.

## PING primitive reuse

The skill reuses PING primitives only and builds no new authority:

- MissionRuntime / WorkerRuntime: the pass runs as bounded work under
  the existing runtime; no new scheduler or worker framework.
- CapabilityAuthority: capabilities come from
  `action-capability.json` and AUTHORITY.json; the skill consumes them.
- IdentityAuthority: intent identity keys derive from platform action
  + target ref; no new identity minting.
- HashAuthority: sha256 over canonical JSON bodies for the journal
  chain and guard envelopes.
- Witness / Lineage / Replay: the journal + receipts + decision
  records are the replayable evidence; replay is decision replay,
  never mutation replay.

There is no independent social event database. The persistence
boundary to the outreach ledgers (`x-engagement.md`, the intent
ledger) is marked explicitly and is never touched by tests.

## Testability

The only fake is the fixture at the adapter boundary
(`fixtures/xapi_fixture.py`), which is file-backed so it survives
process kills and carries chaos flags (timeouts, lying about success,
429/401/403, read outages). Everything above the adapter is the real
machinery: the real guard, the real invariant set, the real journal.
Eight behavioral suites (`tests/run_all.sh`, 134 checks) prove the
properties end to end.
