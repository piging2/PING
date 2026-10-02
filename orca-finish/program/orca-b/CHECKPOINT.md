# ORCA-B — checkpoint / resume / reconciliation / dependency-graph / death / duplicate-completion verdicts
Started: 2026-09-23 ~20:04 MDT
Owner: ORCA-B subagent (depth 2/2), parent orchestrator label 31ee33b1-ea2d-4345-927b-8e9e4daec46c

## Standing orders
- NIGHT SHIFT: Nolan asleep; escalate only true human boundaries.
- NO STOPPING CONDITIONS. YOLO MODE: decide at 80%+, test, document, continue.
- Quota: 1,000 logical missions (subagents run to completion, not token budgets).
- SAFETY: read-only repos; scratch-only harnesses in own dir or /tmp; prove isolation before chaos; no commits; no production. Pig reads via ~/workspace/pig/pigwsl-run.sh.

## Mechanisms to verdict
checkpointing, resume after death, reconcileStartup (stale state across restart),
dependency graphs, ready-set queries, successor work / follow-up, blocked-work model,
worker death, coordinator death, duplicate completion, stale completion, late completion,
effect-before-ack, ack-before-effect, timeout-after-effect.

## Targets (read-only)
- A5 branch /home/nolan/worktrees/orca-autonomy @ ae55b77ff: reconcileStartup(), atomic rendezvous files, autonomous follow-up, timeout-to-retry, measurements/.
- W2-IMPL-STATE on /home/nolan/ping-orca-state @ orca-finish/state (30a750fad): orca_run_record.js (monotonic checkpoint versions, OUTCOME_UNKNOWN terminal), orca_ready_set.js (pure ready query, unknown blocks).
- Mainline /home/nolan/ping @ cc6856c3: MissionRuntime retry/backoff/dead-letter, scheduler behavior, hung-worker hazard (C2: lease renewed every poll, never reaped).

## Method
1. Static reads of each mechanism in each target (caller/callee/writer/reader).
2. Executable scratch probes in ~/workspace/orca-finish/program/orca-b/probes/ (never production, never repo writes).
3. Challenge prior claims: C1 A5 verdict (wave1/orca-arch), C2 GAPS.md, W2-MISSIONS INTERRUPTION-DRILL.md.
4. Verdicts per mandatory taxonomy; harvest specs for ORCA STRONGER wins.
5. Append to this checkpoint every ~15 min.

## Failure pipeline
failure -> LOCAL ACCIDENT vs GENERIC CLASS -> repro + fixture -> owning lane note -> memory candidate -> requeue.

## Follow-on queue (after verdicts)
timeout-after-effect matrix -> unknown-execution classification -> branch movement probes -> cross-check vs Agent 19 falsification log.

## Log
- T+0: lane opened. Prior A5 verdict + inventory + CHECKPOINT absorbed. Located pigwsl-run.sh. Targets confirmed as Pig paths (not local). Setting up probes dir.
- T+25: A5 branch fully traced (read-only, Pig):
  - objective-runtime.js (508 lines): durable objective identity (intent-only), stable work_order_id per (objective_id, task_key), attempt_id per (wo, n), atomic temp+rename writes, PG session advisory-lock coordinator claim (dedicated client; DB releases on SIGKILL), durable budget (idempotent reserve), cancellation, rendezvous result paths.
  - reconcileStartup() + reconcileRunningWorkOrder(): RUNNING reconcile has 3 branches: (1) rendezvous result present -> verify/accept (RENDEZVOUS_RECOVERED); (2) no result + dispatcher alive (pidAlive via kill(pid,0)) -> stays RUNNING, delegate refuses redispatch; (3) no result + dispatcher dead -> DISPATCH_LOST -> re-authorized AUTHORIZED, new attempt within budget. Unknown durable states: logged "leaving untouched". LEDGER VOCABULARY (CRITIC-SEMANTIC 2026-09-24 correction adopted): the work-order *ledger* is orca_status_model.js (10 delegation-unit states; terminal = FAILED/VERIFICATION_FAILED/CLOSED; completion is VERIFIED->CLOSED, no COMPLETED state). The *durable work-order record* (objective-runtime.js + orca_control_loop.js isTerminalWorkOrder) uses a different state set whose terminal members are COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED. These are two different state machines; never quote one set for the other. Neither has an UNKNOWN state.
  - delegate(): attempt recorded BEFORE dispatch (crash window closed); coordinator timeout (180s) SIGKILLs dispatcher; timeout -> honest failed envelope (coordinator-constructed) -> WORKER_FAILED canonical event -> classifyRetry (failureKind=timeout) may AUTO_EXECUTE -> re-dispatch attempt+1. Same for worker-reported failed. Protocol failure -> VERIFICATION_FAILED terminal, escalate.
  - follow-up: assessAndFollowUp is bounded t2 (evidence-chain-verification for the audit objective), causation_id = t1 event_id, input from live state at follow-up time. Not a general dependency graph; linear successor only.
  - recordVerifiedResult -> spine emit: identity = hash(eventType, source, namespace?, logical_id|payload); INSERT ON CONFLICT (event_id) DO NOTHING; returns deduplicated flag. Duplicate emission with identical envelope = no-op, same event_id.
  - TIMEOUT-AFTER-EFFECT HOLE (static): coordinator SIGKILLs the WSL-side dispatcher; the Windows Hermes child (subprocess of dispatcher) can outlive it (dispatcher-side 600s timeout) and write a late rendezvous drop for attempt N; meanwhile timeout path already emitted WORKER_FAILED and may re-dispatch attempt N+1 -> same task can execute twice in the exterior agent. Late drop is attemptId-scoped and last_attempt_id is nulled on retry, so the orphan result is permanently orphaned. Branch chose at-least-once with honest attempt records; no OUTCOME_UNKNOWN blocking on the branch.
- T+30: Mainline /home/nolan/ping @ cc6856c3b confirmed STATIC:
  - MissionScheduler._poll: Arrow 0 renews leases for everything in _processing (every poll, 5s); Arrow 1 reapExpiredLeases only catches expired leases; Arrow 2 dispatch gated on _processing.size < maxConcurrent(3). _dispatch awaits WorkerRuntime.dispatch(event) with NO timeout.
  - WorkerRuntime.dispatch: awaits entry.worker.handle(event) with NO timeout. Hung handle = slot held forever, lease renewed every poll, reaper never reclaims, 3 hung workers = permanent scheduler stall. C2 / GAPS.md GAP 5 SURVIVES challenge (static-confirmed, not speculative).
  - mission_runtime: failWithRetry = bare counter + error overwrite (GAP 3 confirmed), retry_pending with retry_at backoff gate (reclaimRetryPending), exhaustion -> failed + MISSION_FAILED event; scheduler _failMission -> deadLetterAuthority.recordDeadLetter (P0-5) when wired.
- NEXT: executable probes. (1) Run staged orca_run_record.test.js + orca_ready_set.test.js locally (node) for TEST-grade. (2) Hung-worker slot-leak harness: copy mission_scheduler.js + mission_runtime.js to scratch, fake PG pool, hung worker, prove lease renewal + no reap + stall.
- T+65: probes green. orca_ready_set 16/16, orca_run_record 16/16 + 1 skip (wiring suite needs branch path; 24/24 on Pig per STATE-LAYER). hung-worker-harness.js: REAL mainline scheduler+runtime, hung worker -> 3 missions running, _processing=3, 4th mission created forever, 24 renewals, 10 reaps / 0 reclaimed, leases ~60s in future. C2 GAP 5 TEST-PROVEN (not speculative).
- T+75: CRITIC-SEMANTIC correction adopted: work-order LEDGER = orca_status_model.js (terminal FAILED/VERIFICATION_FAILED/CLOSED, no COMPLETED) vs DURABLE WORK-ORDER RECORD (terminal COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED). Checkpoint fixed; rule 2 (RETRY fail-path only; lease path = "lease-reclaim") and rule 3 ("deterministic" banned in identity claims without stated domain) adopted in VERDICTS.md.
- T+80: W2-GAUNTLET-INFRA witnessed evidence folded in: TEST-A6 PASS (SIGKILL mid-dispatch -> same objective_id -> lock re-acquired -> reconcileStartup before dispatch -> attempt-1 DISPATCH_LOST -> attempt-2 honest timeout failure -> WORKER_FAILED event_b8c9060c4d342a46 -> budget 2/2 -> escalate exit 3; work order FAILED, attempt_history=[DISPATCH_LOST,WORKER_FAILED], objective ACTIVE). 2026-09-18 A6 FAIL witnessed-fixed. Synthetic 9/9 (incl. t_timeout_after_effect -> OUTCOME_UNKNOWN, t_ack_lost 0 dup, t_coord_death stale-epoch rejected).
- T+85: VERDICTS.md written (15 records, verdict table, T1-T4 timeout matrix, H1-H7 harvest specs, C1/C2/drill challenges, U1-U4 open unknowns, failure log, follow-on queue). Verdict counts: ORCA STRONGER→HARVEST 10, PING STRONGER 1, EQUIVALENT 1, PATTERN ONLY 2, UNKNOWN→INVESTIGATE 1, REJECT 0, NOT APPLICABLE 0. Critic scan: no misquote propagation, no bare "deterministic", no lease-path "retry".
- Lane verdicts complete. Moved to: final report. Follow-on queue handed to parent: unknown-execution branch wiring (H5), branch movement probes, Agent 19 cross-check.
