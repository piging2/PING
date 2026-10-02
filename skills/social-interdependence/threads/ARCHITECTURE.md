# Architecture - Threads Social Interdependence

## What this is

An autonomous engagement loop on Threads: discover candidates, decide
deterministically, intend durably, dispatch within budgets, verify the
world, write evidence, and let watchdogs keep it honest. No per-action
human approval anywhere in the ordinary path. The machinery below is
what replaces the human.

## Components

```
candidates.json
      |
      v
th-si-cycle.py (orchestrator; owns phase order, owns NOTHING else)
      |
      +--> si_policy.py   (PolicyAuthority: envelope, invariants,
      |                     guard binding, hold check, safe mode)
      +--> engagement-guard.py (EXTERNAL authority: eligibility)
      +--> si_state.py    (Journal: intents, transitions, budgets,
      |                     leases, relationship ledger)
      +--> si_adapter.py  (DUMB adapter: builds job, runs executor,
      |                     normalizes result; decides NOTHING)
      +--> si_verify.py   (read-after-write verifier)
      +--> si_watchdog.py (circuit breakers, learner, rollback)
      |
      v
adapter boundary ===> executor: fixture (here) | run_th_pass.sh (Pig)
```

## PING primitive reuse (no new authorities)

| Concern | Primitive / owner |
|---|---|
| Identity of intents, batches, decisions | `intent_id` contract (`threads:<action>:post:<code>:<batch_id>`); stable external target IDs; no UUID minting |
| Capability ("can threads like?") | `action-capability.json` (existing data file), probed live in `si_policy.probe_capabilities()` |
| Configuration | the autonomy envelope itself (`AUTONOMY_ENVELOPE.md`), holds in `holds.json` |
| Evidence | `evidence.jsonl` canonical envelopes; transition log hash-chained |
| Witness | `Witness` semantics: the verifier's read-back observation is the witness, recorded with hash |
| Lineage | `decision_ref` -> `envelope_ref` -> `transition_refs` -> evidence; replayable |
| Replay | `decision_replay` (recompute the decision from the stored inputs; never mutate) |
| Scheduler | the pass cadence is external (cron/operator); this skill never schedules itself |
| Event Authority | under forensic review: `RECORD_EXTERNAL` is a persistence boundary, marked explicitly in the transition log, never an event emission |

## Separation of authority

- **engagement-guard.py** owns eligibility. The harness never re-derives
  it, never overrides it, never caches its verdict across passes.
- **The adapter** owns platform I/O only. It has no decision authority
  (`NO_ADAPTER_DECISION_AUTHORITY` is enforced in `si_policy.assert_adapter_result_within_bounds`).
- **The policy layer** owns the envelope, invariants, budgets, leases,
  holds. It decides whether a decided intent may execute *now*.
- **The verifier** owns canonical success. Executor claims are hearsay
  until read-back (`NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION`).
- **The watchdog** owns safety gates. It may open breakers, cancel
  intents, roll back learner configs, trigger reconcile. It may not
  dispatch, decide eligibility, or change the envelope.
- **The learner** may only propose parameters inside `learner_bounds`;
  promotion is SHADOW -> CANARY -> ACTIVE with gates, and rollback is
  automatic on gate failure. It may never modify the policy itself.

## Data flow of one intent

1. Candidate -> normalize -> `intent_id` (deterministic, idempotent).
2. `eligibility_check()` on the real guard -> decision record.
3. Policy checks (safe mode, hold, breakers, budget, duplicate,
   account, identity) -> intent created in ELIGIBLE, or REJECTED with
   reason.
4. Budget consumed atomically (fcntl) -> SCHEDULED.
5. Lease held -> DISPATCHED -> executor -> ATTEMPTING -> read-back ->
   VERIFIED_SUCCESS / FAILED_* / UNKNOWN_EXECUTION.
6. Evidence written (canonical envelope). Relationship ledger updated.
7. Watchdog runs; breaker state gates the next pass.

## State

All durable state is append-only JSONL in `SI_THREADS_STATE_DIR`
(defaults to `<skill>/.state`):
`intents.jsonl`, `decisions.jsonl`, `transitions.jsonl` (sha256-chained),
`budget.jsonl` (atomic consume), `evidence.jsonl`, `relationships.jsonl`,
`leases/`, `breakers.json`, `learned_config.json`, `adapter_flags.jsonl`.
Transitions are a journal, not a mutable row: state changes only by
appending legal transitions.

## Live deployment path

On the operator host (Pig-reachable), `SI_THREADS_EXECUTOR=pig` makes
`si_adapter` shell out to `~/workspace/pig-fb/run_th_pass.sh`, which
does the authority gate, copies the job to the Pig, runs the CDP worker
in its OWN browser window, and returns the result JSON. The result
protocol is the same one the fixture speaks (see
`schemas/adapter-protocol.schema.json` and
`references/REF_THREADS_EXECUTOR.md`).
