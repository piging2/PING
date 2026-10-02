# ORCA Recovery Gauntlet — Results (Wave 2, ORCA-FINISH)

Executed 2026-09-24 ~02:00–03:00 UTC on the Pig against scratch database
`ping_gauntlet` only. No production database or port was touched by any chaos
action. Verdicts are computed from durable scratch state, never asserted.

Raw evidence: `results/suite-results.json` (synthetic), `results/a6-grade.json`,
`results/a6-workorder.json`, `results/a6-run2-tail.log`.

## TEST-A6 — witnessed real-loop re-proof (highest priority): PASS

Kill the real `feature/orca-autonomy` control loop mid-dispatch, restart it on the
same objective, verify durable reconciliation with no duplicate delegation.

- Run 1 (pid 16911): SIGKILL delivered at 2026-09-24T01:59:24Z while work order
  `bfcec15b...` was `RUNNING` with `dispatch_pid=16931` durably recorded.
- Run 2 (pid 17056): same objective text → same durable `objective_id`
  `5ea07457e541…`. Re-acquired the PostgreSQL advisory-lock coordinator claim
  (no denial). `reconcileStartup()` ran BEFORE any dispatch and found the 1
  RUNNING work order (attempt_count=1). Attempt-1 classified `DISPATCH_LOST`
  ("dispatcher dead, no rendezvous result") and re-authorized as NEW attempt-2 —
  never re-run as attempt-1. Durable budget read `1/2` (not reset by restart).
- Attempt-2: the Hermes worker produced zero output in the 180 s dispatcher
  timeout. The loop emitted an honest failed envelope ("dispatcher timeout after
  180000ms; no worker output captured; no success fabricated"), recorded a
  canonical `WORKER_FAILED` event (`event_b8c9060c4d342a46`) in scratch
  `ping_events`, exhausted the retry budget (2/2), and escalated to human
  (exit 3). Work order terminal state: `FAILED`, `attempt_count=2`,
  `attempt_history=[DISPATCH_LOST, WORKER_FAILED]`.
- No duplicate delegation: exactly one dispatch of attempt-1, exactly one
  terminal event. Objective left `ACTIVE` (not falsely completed).

Gate results: G1 kill-mid-dispatch PASS · G2 lock re-acquired PASS ·
G3 reconcile-before-dispatch PASS · G4 no duplicate delegation PASS ·
G5 honest terminal outcome PASS · G6 durable budget persisted PASS.

Caveats (do not change the verdict; the A6 machinery is what was under test):
1. The worker failure is environmental: the Hermes CLI prints its
   "hermes update / gateways" warning then hangs (>60 s on a bounded probe);
   the WSL interop spawn path was verified working. A re-run when Hermes is
   healthy would witness the success path, but every crash-recovery gate is proven.
2. The loop's `observe()` performs a read-only `GET http://127.0.0.1:8080/health`
   (production gateway) in try/catch — pre-existing loop behavior, no mutation.
   Disclosed, not repeated by the synthetic suite.
3. The 2026-09-18 A6 FAIL (no durable reconstruction, duplicate delegation) is
   now witnessed-fixed by remediation commit `6a342dd27`.

## Synthetic suite: 9/9 PASS

| Test | Verdict | Evidence (from durable scratch state) |
|---|---|---|
| t_worker_death | PASS | W1 SIGKILLed mid-work (really dead); W2 claimed packet, did steps 1–5 exactly once each, packet SUCCEEDED; no step ran twice |
| t_coord_death | PASS | Coordinator SIGKILLed mid-dispatch; recovery coordinator holds new epoch; zombie's stale-epoch claim write rejected (0 rows); packet requeued ENQUEUED attempt 2; no duplicate dispatch of attempt 1 |
| t_timeout_after_effect | PASS | Effect ack observed externally, then timeout → packet `OUTCOME_UNKNOWN`, not requeued, not success. Control (timeout before ack) → `FAILED`, safe to requeue. Idempotency key preserved for redispatch detection |
| t_double_claim | PASS | Two racers, atomic `UPDATE … WHERE status='ENQUEUED'`; exactly one winner (`racer-1` true, `racer-2` false) |
| t_lease_expiry | PASS | Lease TTL 3 s, worker steps 1 s; worker did steps 1–3, then lease lapsed → worker exited 2 (fail closed); packet left `IN_FLIGHT`, never marked success |
| t_stale_checkpoint | PASS | Tampered checkpoint (step 3→4, forged digest) detected and rejected; restoration re-verified; monotonic violation (step 5 after step 3) rejected |
| t_result_lost | PASS | Worker completed effects, died before reporting; no completion record exists → honest `OUTCOME_UNKNOWN`, no fabricated success, no blind retry |
| t_ack_lost | PASS | Completion durable (SUCCEEDED) but ack lost to dead coordinator; fresh coordinator's dispatch scan (durable state only) dispatched 0, skipped the terminal packet, created no new attempt; duplicate claim on SUCCEEDED packet rejected |
| t_db_disappear | PASS | `ping-gauntlet-pg` container actually stopped/restarted; in-flight commit raised `AdminShutdown` (fail closed, not swallowed); uncommitted write rolled back (0 phantom rows); pre-outage checkpoint intact; post-recovery writes OK |

## Not run, with exact reasons

- **Full host restart of the Pig** — would require rebooting the development host
  mid-night; out of scope and unsafe to neighbors. The DB-container restart in
  t_db_disappear is the closest honest proxy for crash durability and it passed.
- **Browser death mid-mission** — the gauntlet has no browser actor; no harness
  process drives a browser. No honest fault to inject.
- **Network disconnect (Pig LAN/WAN)** — no safe way to sever host networking
  without killing the SSH control plane and all neighbor lanes. Not attempted.
- **MCP server death** — no MCP server participates in this harness.
- **Git conflict mid-run** — no test in this gauntlet performs git writes; the
  harness commits that did occur were manual and conflict-free.
- **Invalid model output / hallucinated completion / rate limits / partial
  success** — policy-level behaviors of a model worker; the synthetic worker is
  deterministic by design. The real A6 run demonstrated the honest-failure path
  (WORKER_FAILED → escalate) instead of fabrication, which is the observable
  counterpart.
- **Standalone scratch gateway process** — not built (Phase 1 note in
  HARNESS.md); no test required one.

## Packet count

- Test inventory: **10** (TEST-A6 + 9 synthetic).
- Durable rows in scratch `gauntlet` schema after all runs: **30 packets**,
  **27 runs**, **174 audit events** (across 3 full suite executions plus the
  single-test runs; every row is scratch-only).

## Bottom line

The witnessed A6 re-proof passes all six gates: the remediation's durable
objective/work-order identity, advisory-lock claims, and `reconcileStartup()`
survive a real SIGKILL mid-dispatch with no duplicate delegation and no
fabricated outcome. The 9-test synthetic chaos suite passes 9/9 against the
scratch database, including the previously failing timeout-after-effect case
fixed by run-scoping its evidence query. Nothing production was touched.
