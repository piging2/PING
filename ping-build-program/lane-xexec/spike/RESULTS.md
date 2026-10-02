# SPIKE RESULTS — durable stage runner (checkpoint / resume / heartbeat / retry / gates)

Date: 2026-09-23/24 night. Files: durable-stage-runner.mjs, demo-pipeline.mjs, redteam.mjs.
Runtime: node v24.20.0, stdlib only, zero dependencies. Not wired into any repo.

## What was built
A native implementation of the harvested semantics, shaped for the factory's
12-stage BuildBusiness pipeline:
- Append-only JSONL checkpoint ledger: {run_id, stage_index, stage, state, attempt, input_digest, output_digest, error_class}.
- Persistent content-addressed output store: output_digest -> output; also serves as the idempotency store keyed (stage, input_digest) with TTL.
- Resume: verify digest chain (input_digest of stage i must equal output_digest of stage i-1); load the resumed stage's input from the output store; missing output -> honest rebuild-from-zero with RESUME_OUTPUT_MISSING event.
- Retry: per-stage {maxAttempts, initialMs, backoff, maxIntervalMs, nonRetryable[]} with full-jitter exponential backoff.
- Timeouts: startToClose per attempt; heartbeat watchdog per attempt. Lease (liveness) renews ONLY on heartbeat, never on scheduler ticks.
- Heartbeat details delivered to the retrying attempt (Temporal's checkpoint-through-heartbeat pattern).
- Terminal classes: COMPLETED / DEAD (retry-exhausted) / QUARANTINED (non-retryable integrity classes, never retried).
- Human gate: awaitSignal with deadline; expiry -> GATE_EXPIRED, run parked (no pool slots held); late signals have no waiter (no phantom resume).
- Integrity: forged/mismatched checkpoint -> STAGE_FORCE_REEXECUTE (output store distrusted for that stage).

## Kill / resume proof (the factory's queued experiment, unblocked in miniature)
- Run 1: killed (simulated process death) mid-stage GRADE_CLAIMS (stage 3 of 12). Exit 42. Ledger: 2 COMPLETED checkpoints (ACQUIRE, EXTRACT_OBSERVATIONS), 1 STARTED with no COMPLETED (GRADE_CLAIMS).
- Run 2 (new runner instance, same ledger): RUN_START resume_from=2 reason=no-completed-checkpoint; completed stages 2..11; RUN_COMPLETED with final digest b1808e0b...
- Chain verification (independent script): 12/12 COMPLETED checkpoints, input_digest chain intact end to end, ACQUIRE completed exactly once (no duplicate re-run).
- Determinism note: two separate full executions of the same input produced the identical final digest (b1808e0b...), because stage outputs are pure functions of chained inputs. Retry jitter affects timing only.

## Red-team battery: 8 attacks, 0 uncontained
- A1 liar-stage: forged checkpoint (output_digest nulled) rejected by chain verification; stage force re-executed (output store distrusted after integrity violation). PASS.
- A2 dead-worker-heartbeat: worker stopped heartbeating mid-attempt; watchdog fired HEARTBEAT_TIMEOUT at ~600ms; attempt 2 resumed carrying the last heartbeat details ({p:2, partial:'half-done'}). PASS.
- A3 clock-skew: worker clock +5min; ordering and digests unaffected (no decision uses worker-local time). PASS.
- A4a poison-pill (F-SEC): exactly 1 attempt, then QUARANTINED, never retried. PASS.
- A4b poison-pill (TRANSIENT, maxAttempts 2): exactly 2 attempts, then DEAD. No infinite retry. PASS.
- A5 silent-gate: gate with 300ms deadline expired in ~304ms; GATE_EXPIRED emitted; run parked without holding worker capacity; late signal correctly found no waiter. PASS.
- A6 resume idempotency + divergence: same input re-ran 0 stages; diverged input rebuilt both stages (B's transitive input changed). PASS.
- A7 content-addressed dedup: diverged run input, but stage A output input-independent -> B idempotency-skipped (identical transitive input). Skipping is correct dedup, not a lie. PASS.

## Honest limitations of the spike
- Single-process: no distributed lease fencing, no multi-worker claim contention (PING's conditional-claim SQL already covers that; the spike does not re-prove it).
- Ledger is local JSONL: production shape is the same records as ping_events (append-only, content-addressed), which the ORCA wave owns.
- The demo stage functions are synthetic; the semantics (not the stages) are what was proven.
- Clock authority in the spike is the runner's injected clock; production must use the single DB clock (NOW()), never worker-local time, per the A3 finding.

## Recommendation carried to the integration notes
Checkpoint + resume is the deepest factory gap and the highest-value ORCA Phase-B item. The spike is the minimal PING shape: adopt the record shapes and the state machine, not the file.
