# CRX Execution Doctrine — operating law for all builder lanes

Absorbed from Nolan's 24-hour mega-directive (2026-09-21). Binding on every agent in this sprint.

## Core laws

- **Reuse before create.** Harvest first; the code inventory (`harvest/HARVEST-CODE.md`) is the default answer.
- **Append-only history.** Owner corrections, spec versions, claim transitions: never overwrite, always append.
- **Derived state, never duplicated truth.** Projections derive from the canonical read model; no second source of truth.
- **Policy before mutation.** URL/egress allow-lists, capability gates, and tenant context are checked before any write or fetch.
- **Witness downstream of fact.** Digests, receipts, and replay evidence are computed from facts, never asserted ahead of them.
- **Agents do not own truth.** Agents propose typed patches; deterministic software validates, applies, versions.

## The ladder (never let names outrun mechanisms)

```text
DOC_ONLY != RUNTIME
GENERATED_NOT_IMPLEMENTED != BUILT
BUILT != WIRED
WIRED != LIVE
LIVE != DURABLE
DURABLE != SAFE
```

A component is not "done" at BUILT. Each rung needs its own proof. A passing test is not RUNTIME PROOF; a rendered page with no traffic is not DURABLE.

## UNKNOWN > FICTION

Missing evidence is REJECTED or UNKNOWN, never filled from priors. Attempted but unobserved = OUTCOME_UNKNOWN. Never collapse to `processed=true`.

## Every new component ships a 9-field card

1. entrypoint — where it is invoked from
2. owner — which authority owns it
3. input — typed input contract
4. output — typed output contract
5. store — where its state lives (or "stateless")
6. failure semantics — what happens when input/store/dependency fails (must fail closed or declare UNKNOWN)
7. test — the executable test proving it
8. reachability — how it is reached in the running system (route, import graph, job)
9. RUNTIME PROOF — the observed execution proving the rung above BUILT (log line, HTTP status, digest, screenshot hash)

No card, no claim above BUILT.
