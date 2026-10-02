# Interruption Drill Design

ORCA FINISH — Wave 2, Lane W2-MISSIONS. Version 1.0, 2026-09-23.
Purpose: the exact deliberate-interruption procedure for when the ORCA runtime exists, for both missions.

Principle (from the factory's own kill/resume learning): never kill what has no partial checkpoints — killing only restarts, it does not prove resume. Every drill requires a checkpointed, resumable target. The factory's kill/resume experiment is QUEUED for exactly this reason (no batch worker had partial on-disk checkpoints yet).

## Drill D1 — Mission-level interruption (FYD factory worker)

Target: any long-running FYD worker with verifiable partial on-disk checkpoints (e.g. an F2 corpus batch, a DEHPP-BUILD run). Never the loop itself for this drill.

Procedure:
1. PRE: confirm the worker has written >=1 partial checkpoint to its work dir (checkpoint file with a monotonic sequence or digest, written atomically temp+rename). Record checkpoint id C_k.
2. KILL: SIGKILL the worker process (not SIGTERM — the drill is crash, not shutdown). Record kill time, process id, last checkpoint id C_k.
3. RESUME: spawn a replacement worker with the brief "resume from artifacts in <work dir>; do not redo completed probes." It must: read the checkpoint ledger, verify the last checkpoint's integrity (digest or replay check), continue from C_k+1, and mark any work after C_k as REDO (not ASSUME-DONE).
4. GRADE:
   - PASS: final output identical (or a documented superset) to an uninterrupted control run; no duplicated side effects (no double event emission, no double file writes outside the work dir); the resume log shows checkpoint recovery, not restart.
   - FAIL: work after C_k silently repeated with side effects; checkpoint ignored; or the "resume" was a fresh start relabeled as resume.

## Drill D2 — Coordinator-loop interruption (A5 loop itself)

This drill doubles as the witnessed A6 re-proof (currently the open gap: 6a342dd27 implemented but its own author flagged re-proof untested).

Target: a supervised single-run of orca_control_loop.js executing a bounded mission (FYD or coding), mid-delegate or mid-assess.

Procedure:
1. PRE: objective registered with durable identity (deriveObjectiveId from intent only), durable budget under PING_DATA_ROOT/objectives/<id>/, coordinator claim via PG advisory lock.
2. KILL: SIGKILL the loop process mid-run (after at least one WORKER_COMPLETED or one attempt recorded, so there is state worth recovering).
3. RESTART: relaunch run-loop.sh with the same objective.
4. EXPECTED CORRECT RESUME: reconcileStartup() runs before any new dispatch; it must (a) detect the orphaned attempt, (b) reconcile via the atomic rendezvous result file if the worker finished, or mark it unknown and NOT re-delegate blindly, (c) refuse fresh work on completed objectives, (d) re-acquire the advisory lock (DB released it on session drop — SIGKILL-safe).
5. GRADE:
   - PASS: exactly-once delegation semantics preserved (no duplicate work_order_id issued for the same task_key), rendezvous-reconciled results verified and recorded, ledger shows legal transitions only (orca_status_model.js).
   - FAIL: duplicate delegation (the A6 FAIL signature from run orca-run-mu72ads8), lost worker output, or fresh work issued on a completed objective.
   - Evidence: status-ledger.json + evidence dir diff between pre-kill and post-resume; the two must join into one coherent run, not two overlapping runs.

## Drill D3 — Mission-level interruption for the coding mission

Target: a coding-mission worker mid TEST/IMPLEMENT (e.g. running lane suites).

Procedure: same as D1, with the added gate that the resume must re-verify the reproduction (fails-before) before continuing to the fix — a resumed worker that "remembers" the failure without re-proving it is FAIL.

## What correct resume always looks like (all drills)

1. Checkpoint found and integrity-verified before any new work.
2. No work after the last good checkpoint is assumed done.
3. No side effect is emitted twice (events, files outside the work dir, external calls).
4. The resume log is distinguishable from a fresh run (it says RESUME, names the checkpoint, lists what was redone).
5. The final verdict (mission verdict or loop close) is reachable and evidence-complete.

## How to grade (scoring rubric, per drill)

- Resume correctness (40%): rules 1-5 above, all must hold for full marks; any duplicate side effect = 0.
- Checkpoint quality (25%): atomic writes, monotonic ids, integrity-verifiable. If the target had no checkpoints, the drill is INVALID (not failed) — go fix the target, not the drill.
- Evidence completeness (20%): pre-kill state, kill record, resume log, post-run diff — all present.
- Time honesty (15%): resume time reported as resume time; never claim the interrupted run "took X" as if uninterrupted.

## Scheduling note

Do not run D2 until the A6 remediation re-proof is explicitly scheduled with a witness (its own commit message demands witnessed re-proof). D1 can run as soon as any factory worker has partial checkpoints (the factory's queued kill/resume experiment is the natural host — coordinate with the factory coordinator; do not double-kill the same worker).
