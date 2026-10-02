# ORCA unknown-outcome port: staged live-dispatch rollout

2026-09-24. Nolan's binding order: do NOT change live dispatch yet. The port
stays on the integration line; the lineage candidate
(`orca-port-lineage` @ 0998208b8 in /home/nolan/ping) carries the ORCA
machinery with live dispatch HELD. This document designs the staged rollout
that promotes it, using EXISTING release mechanisms only. No new deployment
framework.

## Control point (already built, already proven)

- `MissionScheduler({ unknownOutcomeDispatch })`. Default false: byte-identical
  legacy `workerRuntime.dispatch` path; unknown-outcome sweep skipped; ORCA
  machinery present but inert.
- `gateway/bootstrap/gateway_runtime.js` reads
  `ORCA_UNKNOWN_OUTCOME_DISPATCH=true` from the environment (the gateway's
  existing config mechanism) and passes it through.
- Rollback is instant and total: unset the env var (or redeploy the previous
  image per the release doctrine) and dispatch is legacy again. The default
  is the safe state; the flag can never be "stuck on" by a bad deploy.

## Existing release mechanisms used (nothing invented)

1. Release doctrine: snapshot -> closure certification -> executable smoke ->
   build -> swap -> runtime proof; cert carries source SHA, manifest/digest,
   smoke result, migration compatibility, runtime-path proof, rollback
   image/digest.
2. Gateway image promotion (the same path that promoted
   jev/verdict-authority-hardening @ fffe99f7a).
3. Env-based gateway configuration (already the norm: POSTGRES_*, etc.).
4. The A6 proof battery: 12-point crash matrix, 16-scenario runner chaos,
   message-execution proof, social-retry proof, restart proof, runtime proof,
   credential/artifact scrubs. Every stage re-runs the relevant subset.

## The 13 per-stage verifications (every stage, no exceptions)

1. logical_operation_id stability (same op -> same id across restarts)
2. idempotency key stability (`sha256("op:v1:"+mission_id+":"+effect_name+":"+canonical(input))`, byte-identical across processes)
3. single physical effect per logical operation (stub commit-log count == 1)
4. UNKNOWN preservation (timeout/lost-ack -> UNKNOWN, never assumed FAILED)
5. reconciliation (recovered / retry_authorized / held / failed_terminal all observed)
6. scheduler sweep (aged UNKNOWN ops reconciled; grace-period ops skipped)
7. restart (SIGKILL mid-flight -> zero additional effects, ledger intact)
8. late receipt (late-settle evidence reconciles correctly)
9. duplicate dispatch (idempotency gate returns recorded result, no re-execution)
10. stale worker (stale worker output cannot overwrite a terminal)
11. two reconcilers (racing reconcilers -> exactly one terminal, other defers)
12. telemetry (EFFECT_* events emitted with the 6 registered types; Mission Control operation state readable)
13. rollback (flag off -> legacy dispatch confirmed by behavioral probe)

## Stage 1: synthetic / non-consequential effects

- Where: staging gateway (never production). `ORCA_UNKNOWN_OUTCOME_DISPATCH=true`.
- What: missions whose effects target stub providers only. No real filesystem,
  no real git, no real DB writes, no messages, no posts, no money.
- Gate to Stage 2: all 13 verifications green on staging + the full proof
  battery (matrix, chaos 16/16, restart, runtime) re-run against the staged
  image with new run_ids. Credential/artifact scrubs clean.

## Stage 2: shadow / reconciliation observation

- Where: staging gateway with the flag on, fed with mirrored production
  mission traffic (or a recorded production mission log replayed).
- What: the executor makes REAL dispatch/reconcile/hold decisions against
  stub providers. No real effects. Every decision is logged and compared
  against what the legacy production path did for the same mission.
- What we are looking for: decision divergence (executor would have held or
  retried where legacy completed/failed), sweep behavior on aged UNKNOWNs,
  hold/resume transitions, telemetry completeness.
- Gate to Stage 3: a bounded observation window (to be set at promotion time,
  minimum one full scheduler poll cycle x100 plus one restart drill) with zero
  unexplained divergences, zero unexpected holds, zero blind retries. Any
  unexplained divergence -> HOLD, investigate, do not advance.

## Stage 3: bounded effect classes with strong probes/idempotency

- Prerequisite (explicit future work, not yet built): a per-class allowlist so
  the executor path engages ONLY for approved effect classes while everything
  else stays legacy. Smallest form: `ORCA_DISPATCH_ALLOW` env (comma-separated
  consequence levels, e.g. `synthetic,low`), checked in `_dispatch` before
  engaging the executor; non-listed missions take the legacy path. Must be
  unit-proven (both branches) before Stage 3 begins.
- Where: production gateway, flag on, allowlist restricted to bounded classes
  with strong provider probes and idempotent effects (low blast radius first;
  NEVER class 10 financial, which has no adapter and stays hard-gated).
- Gate to Stage 4: per-class proof: the 13 verifications green for each
  admitted class in production, plus a clean observation window. Each new
  class admitted one at a time, lowest consequence first.

## Stage 4: message / social effect path

- What: effect classes 08 (message execution) and 09 (campaign publication)
  admitted to the allowlist.
- Exact acceptance gates (ALL required, no waivers):
  - message-execution proof 16/16 re-run green against the production-image
    candidate (new run_id)
  - social-retry proof 28/28 re-run green (new run_id)
  - the per-class provider probe verified as the load-bearing anti-duplication
    gate (the keystone finding: foundation `decide()` authorizes retry on
    ledger-empty UNKNOWN, so the probe is what prevents a second send)
  - one full Stage-2-style shadow window for 08/09 with zero duplicate sends
    and zero like-inversions
  - Nolan's explicit promotion approval (this is a genuine product decision:
    real external effects)
- Class 10 (financial) is NOT part of this rollout. No class-10 adapter
  exists. The financial hard gate stands: stable identity, idempotency,
  reconciliation, durable evidence, authority, amount/currency/target binding,
  and duplicate-effect chaos proof for that class, before anything real.

## Standing rules

- ANY AMBIGUITY AT ANY STAGE: HOLD. No blind retry. The unknown-outcome law
  governs: UNKNOWN -> HOLD / RECONCILE -> PROVEN SUCCEEDED | PROVEN FAILED |
  PROVEN NEVER EXECUTED | STILL UNKNOWN.
- A stage gate is a proof, not a meeting. Evidence (run_ids, logs, diffs)
  or it did not happen.
- The integration line (`orca-port-integration`) keeps the full proven port
  and remains the reference implementation while the rollout proceeds.
- Every verified stage records what was proven, against what version, under
  what environment, with what fixtures and failure injections, and what was
  NOT proven (per the reopen semantics: a better test later reopens the
  invariant, not the program).

## Hard prerequisite (falsification finding, 2026-09-24)

The EFFECT #2 falsification SUCCEEDED: two concurrent OS processes calling
the real `EffectExecutor.execute()` with the same op key, staggered so both
passed the idempotency gate before either committed its write-ahead row,
produced 2 physical effects for 1 logical operation. The gate is
check-then-act on the ledger; without an external per-op dispatch lock,
concurrent dispatchers double-execute. (Control: B after A's commit ->
`duplicate` -> 1 effect.)

This does NOT refute the P0 unknown-outcome invariant (UNKNOWN stays
UNKNOWN, reconcile-before-retry holds), but it bounds the exactly-once
claim: **exactly-once is proven only under serialized dispatch.**

Therefore, before ANY production stage (Stage 3+):
- either prove single-dispatcher operation (one scheduler instance owns
  dispatch; no concurrent dispatchers), verified by the duplicate-dispatch
  and stale-worker checks under the actual deployment topology;
- or build and prove a real distributed per-op dispatch lock (the per-op
  lock in the chaos harness is test hardening, not production code).

Do not admit a second concurrent dispatcher to the executor path until one
of the above is proven. The 13 per-stage verifications already include
duplicate dispatch, stale worker, and two reconcilers; run them against the
real deployment topology, not just the test harness.
