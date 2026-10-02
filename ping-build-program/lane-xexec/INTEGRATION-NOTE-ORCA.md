# INTEGRATION NOTE FOR THE ORCA WAVE COORDINATOR
From: lane X-DURABLE-EXECUTION-HARVEST (worker 7503dad4), 2026-09-23/24 night.
You own PING's durable execution engine; this lane built no second engine. Findings below are
yours to consume or reject. No ORCA state touched (read-only).

## Verdict summary
Evaluated Temporal and Trigger.dev SEMANTICS ONLY against what PING already has.
REJECT both as execution planes (vendor veto triggers: new orchestration plane, canonical run
state in vendor schema/history, new hosted databases, lock-in; PING already owns event,
identity, and mission authorities). ADAPT all 13 semantics as NATIVE PING mechanisms.
Full per-semantic analysis: lane-xexec/DURABLE-EXECUTION-HARVEST.md. Licenses verified from
repo clones (Temporal server MIT, @temporalio/sdk MIT, trigger.dev Apache-2.0); rejection is
architectural, not licensing.

## What PING already has (verified read-only, /home/nolan/ping)
Strong, keep: deterministic mission identity + ON CONFLICT DO NOTHING (create-idempotency);
conditional claim with 60s lease (one-claim semantics); dead-letter on retry exhaustion.
Weak/broken/absent: retry is fixed 5000ms x3 (no exponential, no jitter, no per-type policy,
no non-retryable classes); NO dispatch timeout (your wave1 falsified the 5-min claim);
heartbeats claimed but lease renewed every poll tick (your critical hazard: hung worker never
reaped, 3 hung workers stall the scheduler); no checkpoints; no effect idempotency; no human
gates on the live path; concurrency is in-memory maxConcurrent 3 only.
Note: commit 1fcfa79d2 (ping-runtime/temporal/) already wraps MissionRuntime in a Temporal
workflow with approvalSignal and stub activities, unwired. Harvest the shape (signal +
condition-with-timeout for gates; mission_id as workflowId for idempotency), do not re-do it.

## Suggested Phase-B (lifecycle) implementation order, with minimal shapes
1. Timeouts: add {scheduleToStartMs, startToCloseMs, scheduleToCloseMs, heartbeatTimeoutMs} per mission type. startToClose expiry reaps the attempt and routes to retry. This is the direct fix for your hung-worker hazard.
2. Heartbeat-gated leases: lease_until renews ONLY on worker heartbeat (with progress details), never on scheduler poll. Missing heartbeat past the timeout marks the attempt timed out; the last heartbeat details go to the retrying attempt (checkpoint-through-heartbeat).
3. Checkpoints + resume: per-mission checkpoint records {run_id, stage/attempt, input_digest, output_digest, state} in ping_events (not a new store); resume verifies the digest chain and re-runs only missing work. This lane's spike (lane-xexec/spike/) proves the state machine with 8/8 red-team attacks contained: liar-stage forgery rejected, dead worker recovered via heartbeat, clock skew harmless, poison pills bounded/quarantined, silent gate escalated without stalling the pool.
4. Retry policy: typed {initialMs, backoff, maxIntervalMs, maxAttempts, nonRetryable: FailureClass[]} per mission type, full-jitter backoff, lane K taxonomy for the class list. Bounded attempts by default; Temporal's unlimited default explicitly rejected.
5. Human gates: awaiting_approval state + signal channel + deadline; expiry emits escalation and parks the run OUTSIDE scheduler slots; late signal resumes from checkpoint. (Your C4 gap; the factory's NEEDS_OWNER_INPUT needs the same primitive.)
6. Concurrency: named limits {perKey, total} per queue, runtime-adjustable through a capability-gated action (0 = pause), Trigger.dev's shape, PING-owned storage.
7. Rate limiting + backpressure: per-source-kind token bucket; bounded queue depth with explicit reject/shed policy (never silent drop).
8. Effect idempotency: (operation, input_digest) store with TTL; idempotency beats dedup.
9. Quarantine class on the dead-letter path: integrity violations (F-SEC class, overclaim, evidence laundering) halt with evidence preserved and require human review; never auto-retry.
10. Per-run execution journal as ping_events (ordered attempt records) for lane J / lane N consumption. Do not adopt Temporal's UI/server for this.

## Optionality test (all pass)
No vendor in the loop, so nothing to replace. Run state rebuilds from canonical events (checkpoints reference content digests; attempts and gates are events; mission identity stays deterministic). PING's identity, evidence, authority, capabilities, transitions, and history are not surrendered to anyone.

## Open question for you
The spike's output store is a local JSONL sidecar. In your implementation, decide: content-addressed artifact storage (preferred, matches the factory's existing promise) vs. embedding outputs in ping_events payloads (simpler, but event bloat). Either way, resume needs the OUTPUT, not just its digest; that was the one real bug the spike caught.
