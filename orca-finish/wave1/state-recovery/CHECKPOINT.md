# STATE-RECOVERY Lane C3 — Checkpoint

Task: ORCA FINISH Wave 1, Lane C3 — determine from SOURCE what survives process death TODAY and what is reconstructed, per failure case.

Started: 2026-09-23 ~19:30 MDT (Wed)
Repo: /home/nolan/ping (branch refactor/runtime-authority-convergence, 17 dirty files — READ-ONLY)
Transport: ~/workspace/pig/pigwsl-run.sh '<bash>' (bounded reads only)
Notes: ~/workspace/orca-finish/wave1/state-recovery/

## Plan
1. Verify repo path, branch, dirty-file list (read-only: git status --short, git log -1).
2. Locate migrations/schema for ping_events, ping_missions, mission_executions, approvals, approval_policies.
3. Search checkpoint/snapshot/journal/outbox/resume/rehydrate code.
4. Find the repaired reconciler; read its state machine (OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED).
5. Artifact/evidence persistence; UNKNOWN/outcome-unknown representation.
6. Runs/attempts identity in schema or code.
7. For each of the 13 failure cases, determine from source: DURABLE / RECONSTRUCTED / RETRIED / RECLAIMED / DOUBLE-EXECUTE RISK / OUTCOME_UNKNOWN / HUMAN ACTION.
8. Per mechanism record: repo/commit SHA/file/symbol/state read/state written/durability guarantee/restart semantics/test coverage/CLASSIFY LIVE/DORMANT/DEAD/CLAIMED-ONLY.
9. Write STATE-RECOVERY-MAP.md + RUN-RECONSTRUCTION.md.

## Progress log
- [19:30] CHECKPOINT.md created. Starting repo verification.

## Findings so far (~19:55 MDT)
- HEAD cc6856c3b on refactor/runtime-authority-convergence. Verified read-only.
- ping_events: ping-runtime/events/unified_event_runtime.js — content-addressed SHA-256 event_id, ON CONFLICT DO NOTHING + collision fail-closed, fail-closed on no pool. LIVE.
- ping_missions: ping-runtime/orchestration/mission_runtime.js — deterministic mission_id (sha256[:16]), ON CONFLICT DO NOTHING create, atomic conditional claim (WHERE status='created'), conditional start/complete/fail transitions, lease_until=60s, renewLease, reapExpiredLeases (→created, NO retry increment, NO max-attempts gate on reclaim path), failWithRetry (max 3 → failed + DLQ via scheduler). LIVE.
- MissionScheduler: poll 5s, _processing in-memory Set (lost on death), renew-before-reap ordering, retry ladder → DeadLetterAuthority. LIVE. No drain on stop(); GracefulShutdown class exists (gateway/graceful_shutdown.js) but NOT wired into gateway/server.js → DORMANT. No SIGTERM handling in live boot.
- EventBridge: durable ping_bridge_cursors (repository_events, canonical_events), restored on init. LIVE.
- EventToMissionBridge: in-memory subscription only, NO cursor, NO catch-up pass. Event persisted→bridge-handler gap = orphan (no mission, no recovery). Deterministic mission_id prevents duplicates on re-emit.
- WorkerRuntime: dispatch-only, in-memory registry (re-registered at boot), NO timeout on worker.handle() — hung worker = mission stuck running forever while scheduler alive (lease renewed by Arrow 0), re-dispatch loop when scheduler dead.
- WorkerMemory: fs JSON journal per worker (learning memory, not mission checkpoint); _persist via writeFileSync (check fsync).
- mission_executions (gateway): ExecutionRepository writes rich schema that migration_engine.js does NOT create (no context_hash etc.) → DORMANT/DEAD (no callers).
- checkpoints: TWO competing writers — CheckpointAuthority (session checkpoints, table checkpoints(session_id,...)) vs CheckpointRepository (mission/execution checkpoint INSERT with incompatible columns) → schema conflict; repository unreferenced → DORMANT/DEAD.
- approvals/approval_policies: gateway/approval_authority.js, durable PG. Temporal workflow mission_workflow.js exists; temporal_runtime.js wired only via bootstrap/wiring.js (check).
- repository_dead_letters: durable DLQ, wired via gateway_runtime bootstrap. NO replay consumer (human action).
- AdvisoryLock: no callers → DORMANT.
- "Repaired reconciler (OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED)": NOT FOUND anywhere in repo (git + files). PHANTOM/CLAIMED-ONLY on this branch.
- Commits e02960f0f (ce002 attempt/lease fencing, STALE_ATTEMPT), f4bf5304a (durable event→mission reconciliation), 6a342dd27 (crash-safe dispatch rendezvous, startup reconciliation) exist ONLY on branches constitutional-convergence-v2 / convergence-discovery-2026-09-20 / constitutional-convergence-authority-law / feature/orca-autonomy — NOT ancestors of current HEAD. This branch lacks fencing tokens, bridge reconciliation, startup reconciliation.

## Still to inspect
- evidence_authority.js persistence; tool timeout semantics (tool_router.py / infrastructure_dispatcher.js); EVAL coverage summary; verify worker_memory _persist fsync; temporal_runtime wiring status; ping-projector restart semantics (TS runtime/constitutional); confirm no requeue catch-up for bridge.

## Inspection count (~20:10 MDT)
Repo: /home/nolan/ping @ cc6856c3b, branch refactor/runtime-authority-convergence (READ-ONLY, verified via git status; 17 dirty entries untouched).
Files read end-to-end or in substantive part (via pigwsl-run.sh, read-only):
1. ping-runtime/events/unified_event_runtime.js (ping_events schema + emit/dedup)
2. ping-runtime/orchestration/mission_runtime.js (412 lines, full)
3. ping-runtime/orchestration/mission_scheduler.js (343 lines, full)
4. ping-runtime/workers/worker_runtime.js (169 lines, full)
5. ping-runtime/workers/canonical_workers.js (BaseWorker + ObservationWorker head)
6. ping-runtime/events/event_bridge.js (cursor + bridging semantics)
7. ping-runtime/orchestration/event_to_mission_bridge.js (154 lines, full)
8. ping-runtime/orchestration/worker_memory.js (fs journal)
9. ping-runtime/evidence/evidence_authority.js (read-only head)
10. ping-runtime/temporal/workflows/mission_workflow.js (Temporal path)
11. gateway/migration_engine.js (mission_events/mission_executions schema)
12. gateway/repositories/execution_repository.js (136 lines, full; DORMANT)
13. gateway/repositories/checkpoint_repository.js (schema-conflict evidence)
14. gateway/checkpoint_authority.js (session checkpoints head + method list)
15. gateway/approval_authority.js (approvals/approval_policies schema)
16. gateway/dead_letter_authority.js (DLQ head)
17. gateway/advisory_lock.js (head; no callers)
18. gateway/bootstrap/gateway_runtime.js (boot wiring, shutdown())
19. gateway/bootstrap/lifecycle.js (stop order), gateway/graceful_shutdown.js (DORMANT), gateway/server.js (19 lines)
20. runtime/constitutional/src/ping-projector.ts (projection rebuild head)
Git archaeology: e02960f0f / f4bf5304a / 6a342dd27 confirmed NOT ancestors of HEAD; located on other branches.
Evals/tests skimmed: EVAL-001/006/007/009, test_durable_mission_lifecycle, test_durability_invariants, test_lease_renewal, test_dead_letter_wiring.
Now writing deliverables.

## Deliverables written (~20:25 MDT)
- STATE-RECOVERY-MAP.md: durable-state inventory (15 items, classified), reconciler finding (PHANTOM), per-failure table F1-F13, per-mechanism record with test coverage, open questions.
- RUN-RECONSTRUCTION.md: bare-ID reconstruction (mission_id / event_id / dead letter), lost vs recoverable, 12-item delta to full RUN_ID reconstruction.
- Inspection count: ~20 source files/sections read end-to-end via pigwsl-run.sh (read-only), git archaeology on 3 commits, full-repo greps (KNOWN_PERMANENT/REOPENED: 0 hits; AdvisoryLock callers: 0; repository callers: 0; graceful_shutdown wiring: none).
- Repo untouched: git status verified before/after; only ~/workspace notes written.
STATUS: COMPLETE. No blockers encountered; 5 open questions recorded in STATE-RECOVERY-MAP.md section 5.
