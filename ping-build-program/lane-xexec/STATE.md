# LANE X-DURABLE-EXECUTION-HARVEST — STATE.md

Lane worker: 7503dad4 (subagent). Night shift. Coordinator: 14a1adc2 (build program).

## Status: RESEARCHED + PROTOTYPED. NEXT: coordinator consumption + ORCA Phase-B handoff.

## Ledger
- RESEARCHED: Temporal (server + TS SDK) + Trigger.dev semantics evaluated semantic-by-semantic.
- HARVESTED: 13 execution semantics harvested from official docs + source verification (trigger.dev sdk v3 source: queues, tasks, heartbeats, idempotency; Temporal docs + PING's existing temporal wrapper).
- LICENSES VERIFIED (from repo clones in harvest/: temporal-server, trigger-dev, temporal-ts-sdk):
  - temporalio/temporal (server): MIT License, Copyright (c) 2025 Temporal Technologies Inc. + (c) 2020 Uber Technologies, Inc.
  - temporalio/sdk-typescript (@temporalio/sdk): MIT License, Copyright (c) 2021-2025 Temporal Technologies Inc.
  - triggerdotdev/trigger.dev: Apache License 2.0 (verified in repo LICENSE + cited in CONTRIBUTING.md).
- IMPLEMENTED: spike in spike/ — durable stage runner with checkpoint ledger, persistent content-addressed output store, idempotent resume, heartbeat-gated leases, typed retry policy, timeouts, non-retryable classes, gate deadline, red-team battery. Ran clean: kill mid-stage-3 -> resume from checkpoint, 12/12 digest chain verified, 8/8 red-team attacks contained (see spike/RESULTS.md). The spike caught one real bug: resume needs the previous stage's OUTPUT persisted, not just its digest (fixed; documented as an open design question for ORCA).
- FALSIFIED: the "adopt Temporal/Trigger.dev as the execution plane" option (vendor veto: new orchestration plane + canonical-data dependency; PING already owns mission/event authorities; never surrender).
- WINNER: ADOPT-ADAPT all 13 semantics as NATIVE PING mechanisms, zero vendor dependencies. No second execution engine built (ORCA wave owns that; this lane feeds it).

## What PING already has (verified, read-only, Pig /home/nolan/ping)
- Deterministic mission identity (sha256 missionType:event_id|payload[:16]) + ON CONFLICT DO NOTHING: idempotent create. STRONG.
- Conditional claim with 60s lease (single UPDATE, status='created' guard): one-claim semantics. STRONG.
- Retry: fixed 5000ms backoff, max_attempts 3 default. WEAK (no exponential, no jitter, no per-type policy, no non-retryable classes).
- Dead-letter: wired on retry exhaustion (P0-5). PRESENT.
- Timeouts: NONE. No dispatch timeout (ORCA wave1 falsified the 5-min claim). CRITICAL GAP.
- Heartbeats: claimed in worker Gen 3, but lease renewed every scheduler poll tick regardless: hung worker never reaped (ORCA CRITICAL HAZARD: 3 hung workers stall scheduler forever). BROKEN.
- Checkpoints / resume-from-state: NONE (ORCA gap confirmed). FACTORY KILL/RESUME EXPERIMENT BLOCKED ON THIS.
- Human gates: none on live path (C4: AGENT DECIDED == ACTION AUTHORIZED). Temporal wrapper has approvalSignal but activities are stubs, unwired. GAP.
- Concurrency: in-memory maxConcurrent 3. No named limits, no per-tenant, no rate limiting, no backpressure. WEAK.
- Temporal wrapper commit 1fcfa79d2 exists (workflows + stub activities, approval signal): harvest from it, do not re-do it.

## Deepest gap (spike target, delivered)
Factory kill/resume is queued: "no batch worker has partial on-disk checkpoints yet". Spike proves durable stage checkpoints + idempotent resume + heartbeat leases on a factory-shaped 12-stage pipeline, with red-team evidence (liar stage, dead worker, poison pill, silent gate, clock skew).

## Files
- DURABLE-EXECUTION-HARVEST.md (per-semantic verdicts)
- INTEGRATION-NOTE-FACTORY.md (for FYD factory coordinator)
- INTEGRATION-NOTE-ORCA.md (for ORCA wave coordinator)
- spike/durable-stage-runner.mjs, spike/demo-pipeline.mjs, spike/redteam.mjs, spike/RESULTS.md

## NEXT
1. Factory coordinator: wire stage-checkpoint contract (INTEGRATION-NOTE-FACTORY.md) into BuildBusiness runner; unblock the queued kill/resume experiment.
2. ORCA wave: consume INTEGRATION-NOTE-ORCA.md for Phase B (lifecycle) implementation order.
3. This lane: idle unless asked; queue empty means discover more work — candidate next: acquisition-stage rate limiter + backpressure spike against lane D's hostile-input contract.
