# DURABLE EXECUTION HARVEST — Temporal + Trigger.dev semantics for PING/ORCA and the FYD factory

Date: 2026-09-23/24 night shift. Lane X-DURABLE-EXECUTION-HARVEST.
Binding constraint: never surrender PING's canonical identity, evidence, authority, capabilities, transitions, or history to a vendor. Harvest semantics; authorities stay sovereign.
Vendor veto (Nolan 2026-09-23): adoption of any paid/heavy vendor into the hot path passes the veto gate. All verdicts below run the gate questions.

## Sources (semantics only, verified in isolated harvest area)
- `~/workspace/ping-build-program/harvest/temporal-server/` — temporalio/temporal, shallow sparse clone, LICENSE read.
- `~/workspace/ping-build-program/harvest/temporal-ts-sdk/` — temporalio/sdk-typescript, LICENSE read.
- `~/workspace/ping-build-program/harvest/trigger-dev/` — triggerdotdev/trigger.dev, sparse checkout of `packages/trigger-sdk/src/v3/{queues,tasks,heartbeats,idempotencyKeys,shared}.ts` inspected.
- Official Temporal + Trigger.dev docs (via web search; retry/timeout/queue/heartbeat/debounce semantics).
- PING repo read-only (Pig): ping-runtime/{temporal/workflows/mission_workflow.js, temporal/activities/mission_activities.js, orchestration/{mission_runtime,mission_scheduler}.js, workers/worker_runtime.js}, commit 1fcfa79d2.
- ORCA wave ledger (~/workspace/orca-finish/WAVE-LEDGER.md): wave1 C2 SPINE-TRACE gaps, C4 authority map, MECHANISM-LIBRARY strengths.
- Factory contract: ~/workspace/fyd-factory/orchestration/BUILD-BUSINESS-SPEC.md (12 stages, terminal states, declared-but-unbuilt resumability).

## Licenses (verified from the repos, not assumed)
| Project | License | Compatibility |
|---|---|---|
| temporalio/temporal (server) | MIT (Copyright 2025 Temporal Technologies Inc.; 2020 Uber Technologies, Inc.) | compatible |
| @temporalio/sdk (sdk-typescript) | MIT (Copyright 2021-2025 Temporal Technologies Inc.) | compatible |
| triggerdotdev/trigger.dev | Apache-2.0 (LICENSE verified; cited in CONTRIBUTING.md) | compatible |
Licenses are adoption-compatible. The REJECT of vendor adoption below is architectural (veto gate), not licensing.

## What PING already has (read-only verification, Pig /home/nolan/ping)
| Semantic | Status |
|---|---|
| Deterministic identity + create-idempotency | STRONG: sha256 missionType:event_id|payload[:16], ON CONFLICT DO NOTHING |
| Claim leases (one-claim) | STRONG: 60s lease_until, conditional claim on status='created' |
| Retry | WEAK: fixed 5000ms backoff, max_attempts 3, no jitter, no per-type policy, no non-retryable classes |
| Dead-letter | PRESENT: wired on retry exhaustion (P0-5) |
| Timeouts | ABSENT: MissionScheduler has NO dispatch timeout (ORCA wave1 falsified the 5-min claim); WorkerRuntime.dispatch in-process, no timeout, no sandbox |
| Heartbeats | BROKEN: Gen 3 claims heartbeats, but lease renewed every poll tick regardless; hung worker never reaped; 3 hung workers stall scheduler permanently (ORCA critical hazard) |
| Checkpoints / resume | ABSENT (ORCA gap). Factory kill/resume experiment queued on this |
| Effect idempotency | ABSENT (mechanism library M24 proposed item) |
| Human gates | ABSENT on live path (C4). Temporal wrapper has approvalSignal + 1h condition timeout, but activities are stubs, unwired |
| Concurrency / rate limit / backpressure | WEAK: in-memory maxConcurrent 3 only |
| Run history / observability | PARTIAL: durable ping_events; lane J owns run records; no per-run attempt timeline |

## What the FYD factory actually needs
BuildBusiness(sourceManifest) runs 12 ordered stages per business; the 500-site program multiplies that to ~6000 stage-units. The spec DECLARES "all stage outputs are content-addressed (sha256 over canonical JSON) so reruns are resumable and idempotent" but NO mechanism exists. Concrete needs:
1. Per-stage checkpoints on disk/DB so a killed batch worker resumes instead of restarts (the queued kill/resume experiment).
2. Per-stage retry policies: ACQUIRE hits flaky networks; F-PIPE says "unrecoverable exception with no partial stage output persisted" is FAILED, which requires the distinction between recoverable (retry) and unrecoverable (fail).
3. Stage timeouts: manifest.budget.max_stages_minutes exists on paper; no enforcement.
4. Human gate for NEEDS_OWNER_INPUT that parks without stalling the pool and does not wait forever.
5. Idempotency across re-triggers: same manifest + same source bytes = same result, no duplicate renders.
6. Rate limiting + backpressure on ACQUIRE (egress storm across 500 sites; storage law budget guard is byte caps, not rate).
7. Quarantine class distinct from retry-exhausted dead: F-SEC breach halts the build with evidence preserved; never auto-retried.
8. Per-run execution journal answering WHY DID FYD CHANGE (lane J).

## Global verdict
REJECT adopting Temporal (server/SDK) or Trigger.dev (cloud/SDK) as an execution plane. Veto triggers hit: new orchestration plane, canonical run state would live in the vendor's schema/history store (surrender of history and transitions), new hosted database (Temporal needs Postgres + its schema; Trigger.dev needs webapp + Redis + Postgres), material lock-in (workflows written against their APIs are not portable without rewrite), large runtime dependency for a 12-stage batch pipeline. PING already owns event, identity, and mission authorities; a second execution authority violates the hard constraint.
ADAPT all 13 semantics below as NATIVE PING mechanisms (zero vendor dependencies). The ORCA wave owns the implementation; this lane supplies the verdicts, the minimal shapes, and a working checkpoint/resume spike.

## Per-semantic verdicts

### 1. Retries (policies, backoff, max attempts)
- Candidates: Temporal RetryPolicy {initialInterval, backoffCoefficient, maximumInterval, maximumAttempts, nonRetryableErrorTypes}; Trigger.dev retry {maxAttempts, factor, minTimeoutInMs, maxTimeoutInMs} + retry.onThrow + retry.fetch(condition) + catchError/AbortTaskRunError.
- PING has: fixed 5000ms, max 3.
- Factory needs: per-stage policies; digest_mismatch and F-SEC never retried; network TIMEOUT retried with backoff.
- Verdict: ADAPT. Typed RetryPolicy per mission type, exponential with jitter, non-retryable classes mapped from lane K taxonomy (permanent: AUTH_REQUIRED, SCHEMA_CHANGED, INVALID_PAYLOAD, F-SEC class; transient: TIMEOUT, TRANSIENT, RATE_LIMITED). Trigger.dev's conditional retry (retry.fetch condition on 429/5xx) is worth copying for ACQUIRE. Default maximumAttempts MUST be bounded; Temporal's unlimited-attempts default is explicitly rejected (poison-pill hazard).
- Integration cost: small (scheduler config + failWithRetry signature change).
- Minimal PING shape: `RetryPolicy {initialMs, backoff, maxIntervalMs, maxAttempts, nonRetryable: FailureClass[]}`; jitter = full jitter on each delay.

### 2. Timeouts (schedule-to-start, start-to-close, heartbeat)
- Candidates: Temporal's four activity timeouts; the crucial insight is that start-to-close is the lease/crash-detector and heartbeat is the fast path.
- PING has: none.
- Factory needs: per-stage budgets; stuck-stage detection.
- Verdict: ADAPT. Three-field timeout spec per mission type: scheduleToStart (queue wait; detects under-provisioning), startToClose (single-attempt budget; the crash detector), scheduleToClose (whole-mission wall-clock budget). Expiry emits a typed TIMEOUT attempt event and routes to the retry policy, never silent renewal. This is the direct fix for ORCA's hung-worker hazard: startToClose expiry reaps the attempt instead of renewing its lease.
- Integration cost: moderate (scheduler dispatch path + attempt records).
- Minimal PING shape: `Timeouts {scheduleToStartMs, startToCloseMs, scheduleToCloseMs, heartbeatTimeoutMs?}` stored with the mission type config.

### 3. Heartbeats
- Candidates: Temporal activity.heartbeat(details) with details delivered to the retried attempt; Trigger.dev cooperative heartbeats.yield() preventing TASK_RUN_STALLED_EXECUTING.
- PING has: broken (lease renewed by poll tick).
- Factory needs: liveness for long stages (ACQUIRE over 32 sources; RENDER_PROVE visual QA); progress for resume.
- Verdict: ADAPT. Workers heartbeat with a progress payload (last processed source index, partial digest); lease renewal happens ONLY on heartbeat, never on scheduler poll. Missing heartbeat past heartbeatTimeout marks the attempt timed out and the last heartbeat details are handed to the retrying attempt (Temporal's checkpoint-through-heartbeat pattern).
- Integration cost: moderate (worker_runtime + scheduler; needs the timeout machinery from 2).
- Minimal PING shape: `heartbeat(runId, attemptId, details)`; `lease_until` updated only by heartbeat writes.

### 4. Leases
- PING has: strong single-claim 60s leases (conditional claim). ADOPT AS-IS; extend only per 3 (heartbeat-gated renewal).
- Integration cost: near zero.

### 5. Concurrency control
- Candidates: Temporal task-queue worker slots; Trigger.dev queue concurrencyLimit, per-task inline concurrency, named concurrencyLimit() {perKey, total}, trigger-time queue override, runtime override/reset via concurrencyLimits API (0 = pause).
- PING has: in-memory maxConcurrent 3.
- Factory needs: per-tenant and per-stage limits for 500 parallel builds; a way to pause a misbehaving queue.
- Verdict: ADAPT Trigger.dev's named-limit shape natively: `ConcurrencyLimit {name, perKey, total}` stored in a PING-owned config row, enforced by the scheduler, adjustable at runtime through a capability-gated admin action (0 pauses). Per-mission-type queue names; trigger-time override for priority builds.
- Integration cost: moderate (config table + scheduler enforcement).
- Minimal PING shape: queue registry {queueName -> {perKey, total, paused}}, enforced at claim time.

### 6. Rate limiting
- Candidates: Trigger.dev queue-level rate limiting; limits.mdx per-queue run caps.
- PING has: none.
- Factory needs: ACQUIRE egress rate limiting (budget guard covers bytes, not rate); lane D acquisition hardening may overlap: file an integration request with lane D.
- Verdict: ADAPT. Per-source-kind token bucket (website, directory_profile, review_feed) enforced in the acquisition stage runner; shared token state in a PING-owned row so multiple workers converge. ~50 lines for the bucket.
- Integration cost: small.

### 7. Backpressure
- Candidates: Trigger.dev per-queue maximum queued runs: triggers rejected when the queue is full.
- PING has: unbounded ping_missions growth.
- Factory needs: 500-site enqueue must not become a storage storm; explicit admission policy.
- Verdict: ADAPT. Bounded queue depth per queue name with explicit policy: reject with an admission error (typed, surfaced) or shed-lowest-priority. Rejection is honest; silent drop is forbidden.
- Integration cost: small (counter + policy enum at enqueue).

### 8. Checkpointing
- Candidates: Temporal history + continue-as-new (event-sourced state); Trigger.dev has no first-class checkpoint (durability comes from run state in their DB).
- PING has: none.
- Factory needs: THE deepest gap. Per-stage checkpoints so kill/resume works; the spec already promises content-addressed stage outputs.
- Verdict: ADOPT as native PING mechanism, P0. Checkpoint record: {run_id, stage_index, stage_name, input_digest, output_digest, state: STARTED|COMPLETED|FAILED, attempts, started_at, finished_at}. Written to an append-only JSONL ledger AND/OR ping_events (so lineage lane N can query it); checkpoint write precedes any "stage done" claim. Spike delivered in spike/ proves the semantics.
- Integration cost: moderate (stage runner contract + ledger).
- Minimal PING shape: see spike/durable-stage-runner.mjs. The checkpoint ledger is PING-owned and rebuildable from canonical events (optionality test passes).

### 9. Resume from durable state
- Candidates: Temporal replay from history; PING's own regeneration_of journal replay (LANE-OWNER).
- PING has: retry-from-scratch only.
- Factory needs: resume from last COMPLETED checkpoint; digest-chain verification; divergence on input change means rebuild + event, not silent reuse.
- Verdict: ADOPT with 8. Resume = verify digest chain to last COMPLETED checkpoint, re-run only missing stages; NEEDS_OWNER_INPUT builds resume from the recorded next_actions. Spike proves it.
- Integration cost: moderate (bundled with 8).

### 10. Idempotency keys
- Candidates: Trigger.dev idempotencyKeys.create + idempotencyKeyTTL on trigger; "idempotency wins over debounce". Temporal workflowId-as-idempotency (PING's temporal wrapper already uses mission_id as workflowId).
- PING has: strong create-idempotency; no effect idempotency.
- Factory needs: same manifest + same source bytes = no duplicate renders/fetches/publishes.
- Verdict: ADAPT. Effect idempotency store: key = (stage_name, input_digest), TTL configurable; on hit, skip execution and return the recorded output digest. Trigger.dev's TTL shape and precedence rule (idempotency beats dedup/debounce) are worth copying.
- Integration cost: small (ledger keyed lookup in the stage runner).

### 11. Dead-letter / quarantine queues
- Candidates: Temporal retry exhaustion -> workflow failure (operator handles); Trigger.dev has no DLQ primitive (catchError hook instead).
- PING has: deadLetterAuthority on retry exhaustion. PRESENT.
- Factory needs: two classes. DEAD = retry-exhausted operational failures. QUARANTINE = integrity violations (F-SEC seam breach, overclaim, evidence laundering): halt, preserve evidence, require human review, NEVER auto-retry.
- Verdict: ADAPT. Extend the dead-letter record with class {DEAD, QUARANTINE} + review gate; quarantine entries bind the failure evidence and the stage digest. AbortTaskRunError (Trigger.dev) is the right pattern for "this error class never retries".
- Integration cost: small.

### 12. Human gates (signals/approvals mid-run)
- Candidates: Temporal signal + condition-with-timeout (PING's own wrapper uses approvalSignal + 1h condition); query for status.
- PING has: none on the live path; wrapper exists but unwired; LANE-OWNER has durable proposals with in-memory journal.
- Factory needs: NEEDS_OWNER_INPUT as a resumable gate with named next_actions; a gate that never answers must escalate, not stall the pool.
- Verdict: ADAPT. Gate = mission state awaiting_approval + signal channel + deadline; expiry emits escalation event and parks the run OUTSIDE scheduler worker slots (never consumes _processing capacity); resume on signal. Map to PING events so the signal is itself evidence.
- Integration cost: moderate (mission_runtime state + scheduler parking + owner-console wiring deferred to LANE-OWNER).
- Minimal PING shape: `awaitSignal(runId, signalName, deadlineMs)`; on timeout -> event GATE_EXPIRED with next_action; on signal -> resume from checkpoint.

### 13. Observability of long runs
- Candidates: Temporal Web UI workflow history (ordered event timeline per run); Trigger.dev run dashboard with logs/spans.
- PING has: durable ping_events; lane J owns run records; no per-run attempt timeline.
- Factory needs: WHY DID FYD CHANGE per build: per-stage start/finish/checkpoint/errors/rate-limits with digests.
- Verdict: ADAPT the timeline, not the product. Per-run execution journal: ordered attempt records {run_id, attempt, stage, state, input_digest, output_digest, error_class, timestamps} emitted as ping_events (queryable by lane N lineage). REJECT adopting Temporal UI/server for this (veto: new hosted plane).
- Integration cost: small-moderate (event emission points in the stage runner).

## Kill criteria + optionality test (per decision)
- License incompatible? No (MIT + Apache-2.0, verified).
- Surrenders canonical authority? The REJECTED option does; every ADOPT/ADAPT above is native, no vendor in the loop.
- Can we replace the vendor later? There is no vendor in the ADOPT set: optionality passes by construction.
- Can we rebuild run state from canonical events? Yes: checkpoints reference content digests; attempt/gate records are ping_events; mission identity stays deterministic.
- Weight dwarfs value? Temporal server (Go + Postgres + schema + SDK workers) and Trigger.dev cloud/self-host (webapp + Redis + Postgres) both dwarf the value for a 12-stage batch pipeline that PING can run natively.
- PING already solves it? For leases, create-idempotency, dead-letter: yes (ADOPT as-is). For the rest: no, hence ADAPT.

## Failure testing (red-team) — evidence in spike/RESULTS.md
1. Workflow that lies about completion: spike's liar stage claims done without an output digest; resume verification rejects the checkpoint (digest chain broken) and re-runs the stage. Caught.
2. Worker dies mid-heartbeat: heartbeat timeout marks attempt timed out; retry receives last heartbeat progress; lease not renewed by poll ticks. Recovered.
3. Clock skew across workers: all decisions use the single clock authority (DB NOW() / runner clock), never worker-local timestamps; digests and idempotency keys are clock-independent. Documented in spike.
4. Poison-pill activity retrying forever: non-retryable class + bounded maxAttempts + scheduleToClose deadline + quarantine. Contained.
5. Human gate that never answers: deadline -> GATE_EXPIRED event -> parked outside pool -> resumes on late signal. No stall.

## Bytes/dependency cost
Adopted: 0 bytes of vendor code, 0 new dependencies. The spike is ~600 lines of dependency-free Node (stdlib only), kept in this lane dir, not wired into any repo.

## What we do NOT need to write
A second execution engine, a history database, a workflow UI, a vendor SDK integration, a scheduler poller rewrite. The ORCA wave owns the engine; this lane supplies verdicts + the checkpoint/resume proof.
