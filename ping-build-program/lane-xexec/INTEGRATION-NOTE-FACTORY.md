# INTEGRATION NOTE FOR THE FYD FACTORY COORDINATOR
From: lane X-DURABLE-EXECUTION-HARVEST (worker 7503dad4), 2026-09-23/24 night.
Read-only toward your state; no factory files touched.

## What this unblocks for you
Your kill/resume experiment is queued on "no batch worker has partial on-disk checkpoints yet."
This lane prototyped the missing semantic and proved it: durable per-stage checkpoints with
idempotent resume on a factory-shaped 12-stage pipeline (spike/RESULTS.md: kill mid-stage 3,
resume from checkpoint, 12/12 digest chain verified, killed stage not duplicated, 8/8 red-team
attacks contained). The mechanism is yours to adopt; the spike is not wired into any repo.

## Recommended stage-runner contract (adopt natively; no vendor)
Per build (run_id = build_id), per stage, persist BEFORE claiming stage-done:
- Checkpoint: {run_id, stage_index, stage_name, state: STARTED|COMPLETED|FAILED|DEAD|QUARANTINED, attempt, input_digest, output_digest, error_class}.
- Output artifact: content-addressed by sha256 over canonical JSON (your spec already promises this; the spike shows resume is impossible without persisting the output, not just its digest).
- Resume rule: verify the digest chain (stage i input_digest == stage i-1 output_digest); resume from the first non-COMPLETED stage; load its input from the output store; missing output -> rebuild from stage 0 with a recorded event, never silent reuse.
- Retry policy per stage: {maxAttempts, initialMs, backoff, maxIntervalMs, nonRetryable:[failure classes]}. Map lane K taxonomy: F-SEC, SCHEMA_CHANGED, INVALID_PAYLOAD, AUTH_REQUIRED never retry; TIMEOUT/TRANSIENT/RATE_LIMITED retry with full-jitter backoff. No unlimited attempts by default.
- Timeouts per stage: startToClose (single attempt; the crash detector), scheduleToClose (whole build; honor manifest.budget.max_stages_minutes). A stage that stops heartbeating past its heartbeat timeout is timed out and retried with its last progress, not left hanging.
- Idempotency: (stage_name, input_digest) with TTL. Same manifest + same source bytes -> duplicate triggers skip completed stages instead of re-rendering.
- Quarantine vs dead: retry-exhausted -> DEAD (operational, retryable later by operator); integrity violations (F-SEC seam breach, overclaim, evidence laundering) -> QUARANTINE (halt, preserve evidence, human review, never auto-retry).
- NEEDS_OWNER_INPUT gate: park the build with a deadline; expiry emits an escalation event with the exact next_action and frees worker capacity; a late owner signal resumes from the checkpoint, never from zero.

## Suggested wiring order (your call)
1. Add checkpoint writes to the batch worker you intend to kill first (F2 corpus batches are the natural candidate; they already checkpoint batches).
2. Run your queued kill/resume experiment against it; success criterion: resume completes the build with the digest chain verifying and no stage duplicated.
3. Then promote the contract into the BuildBusiness runner (12 stages), with per-stage retry/timeout policy from the table above.

## Dependencies this creates (recorded, not built here)
- Lane K failure taxonomy: the nonRetryable class list must come from the standardized taxonomy.
- Lane J observability: attempt/checkpoint/gate records should be emitted as events so WHY DID FYD CHANGE is answerable per build.
- Lane D acquisition hardening: the ACQUIRE stage needs the egress rate limiter (per-source-kind token bucket); coordinate so there is one limiter, not two.
- Convergence substrate: checkpoint/attempt records belong in ping_events (or an event-shaped store the substrate owns), not a second event system. Do not create a competing event store.

## What we deliberately did NOT do
No Temporal server, no Trigger.dev, no vendor SDK in the factory path (vendor veto: new orchestration plane + canonical run state in a vendor schema). Licenses verified compatible (Temporal MIT, Trigger.dev Apache-2.0); rejection is architectural. All adopted semantics are native and replaceable; run state rebuilds from canonical events.
