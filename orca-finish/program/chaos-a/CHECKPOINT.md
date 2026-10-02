# CHAOS-A — Kill Matrix + Idempotency — CHECKPOINT LOG
Lane: CHAOS-A | Session: 40b8c6ed-3d07-465e-a802-1d3ee076c425 | Started: 2026-09-23 20:04 MDT
Quota: 1,500 logical missions. Orders: NIGHT SHIFT (Nolan asleep; escalate only true human boundaries), NO STOPPING CONDITIONS, YOLO MODE (decide at 80%+, test, document, continue).

## Source-availability finding (20:06, VERIFIED)
- `/home/nolan/worktrees/orca-autonomy` (@ ae55b77ff) and `/home/nolan/ping-orca-state` do NOT exist on this host (`/home/nolan` absent; verified via ls). This VM is `hatch`, not the Pig.
- Wave-1 A5-VERDICT.md documents the A5 branch EXISTS on the Pig with the A6 fix 6a342dd27 (durable objective identity, atomic rendezvous, PG advisory-lock coordinator claim, reconcileStartup()), and flags the witnessed A6 re-proof as still pending.
- Consequence: CHAOS-A cannot run copies of the A5 modules here. It runs BEHAVIORAL RE-PROOFS of the documented A5/A6 mechanisms (records 1,6,7,8,10,13,14,15,17 of the wave-1 mechanism map) against a scratch file-backed harness built in this lane. Source-behavior claims are graded STATIC evidence; harness behaviors are TEST evidence. This is the witnessed-A6-re-proof pattern run dozens of ways, exactly as tasked.
- W2-GAUNTLET-INFRA harness (`~/workspace/orca-finish/wave2/gauntlet/src/`) is Pig-bound (paths /home/nolan/..., PG 127.0.0.1:54339, psycopg) and NOT runnable here; proven isolation is not transferable to this host. Per task: building my own harness, noting the duplication. The gauntlet_lib semantics (atomic claim, checkpoint/digest, leases, tool-call boundary, epoch fencing) are re-implemented faithfully as the behavioral spec.

## Isolation plan (prove BEFORE any chaos)
- Harness store: SQLite file ONLY under `~/workspace/orca-finish/program/chaos-a/harness/chaos.db`. No TCP, no shared DB, no gateway.
- `isolation/isolation_check.py` gates all probes: (1) DB path inside chaos-a dir; (2) banned-token scan of harness source (`ping_runtime`, `5432`, `8080`, `gateway`, `/home/nolan`, `54339`, `oracle`, `tailscale`, `100.79`); (3) socket-blocked smoke run (monkeypatched socket raises; full mini-pass must complete with zero network); (4) file-touch audit: every file opened for write during smoke must sit under chaos-a dir.
- No production anything. No commits to shared branches.

## Plan
1. Build harness: schema.sql, chaos_lib.py, worker_proc.py (kill-stage injection S1..S7 + SIGTERM graceful + in-process crash), coord_proc.py (dispatch/recover + epoch fencing), recover.py.
2. Isolation proof run. Only then: kill matrix (7 stages x 2 signals x 3 reps, multi-packet), worker crash (exception mid-handle), coordinator death (mid-claim/mid-dispatch/mid-reconcile), DB disappearance + reconnect (flaky pool, mid-transaction), idempotency (duplicate delivery, redelivery storms, dedup collisions, same-event-twice, exactly-once completion).
3. Probe records in shared format -> evidence/probe-records.jsonl. Failure pipeline per failure: LOCAL vs GENERIC -> repro + fixture -> lanes/ note -> memory candidate -> requeue.
4. Deliverable: CHAOS-RESULTS.md. Follow-on queue staged: clock-skew -> pool exhaustion -> slow-query -> higher-volume storms -> feed impl lanes.

## Log
- 20:04 — Task received. Explored gauntlet harness, wave-1 mechanism map, A5-VERDICT, ledger. Found sources absent on host; pivoting to behavioral re-proof on own file-backed harness (YOLO decision at >80%: the alternative is doing nothing, which violates NO STOPPING CONDITIONS; the task explicitly authorizes own file-backed harness).
- 20:07 — chaos-a dir created. Writing CHECKPOINT.md first. Next: harness schema + lib.

## Isolation PROVEN (20:14)
- Ran isolation/isolation_check.py: ISOLATION_PROVEN, exit 0.
  1. DB path inside chaos-a dir: /home/hatch/workspace/orca-finish/program/chaos-a/harness/chaos.db
  2. Banned-token scan of harness source: zero hits (no ping_runtime/5432/8080//home/nolan/gateway/psycopg/etc.)
  3. Socket-blocked smoke: full mini-pass (run->packet->claim->effects->checkpoint->completion->epoch-fence) completed with socket.socket monkeypatched to raise. Zero network required.
  4. strace file-touch audit on smoke child: every path opened for write sits inside the chaos-a lane dir.
- One harness bug found and fixed during the smoke: epoch-fence test had the packet stamped at the old epoch (test error, not harness error). Fixed to re-stamp at new epoch before zombie write; zombie write correctly rejected.
- Cleared to run chaos. Next: probe runners (record format + kill matrix).

## Harness complete, probes validated (20:31)
- chaos_lib.py (FlakyPool fixed: finite gone_calls auto-heals, infinite = outage until heal), worker_proc.py (S1..S7 die-at, SIGTERM graceful, supervisor reap, idem/plain effects), coord_proc.py (dispatch/recover/zombie), 5 probe runners, record.py (shared format -> evidence/probe-records.jsonl).
- Bugs found in validation and fixed: (1) FlakyPool._dropped never cleared on finite outages; (2) crash-probe recovery raced the OUTCOME_UNKNOWN status against reclaim (classification now audit-recorded, recovery an explicit decision); (3) supervisor audited reap under run_id "unknown" (now real run_id); (4) counterfactual naive-retry could not take over IN_FLIGHT (now explicit naive requeue).
- Smoke results: kill matrix S1/S6/S7 SURVIVED; crash@1,2,3 idem SURVIVED; counterfactual plain+naive DUPLICATED (generic class proven: 1 effect before crash, 4 after naive requeue); dbdrop A/B/C/D ok; idempotency dupe/collision/2x/storm ok.
- Launching full suite now (~1,492 missions). Next: results aggregation, failure pipeline, CHAOS-RESULTS.md.

## Checkpoint: 2026-09-23 ~21:20 MDT - CHAOS-A full run certified

180 valid probe records, 1,531 logical missions. Verdicts: SURVIVED 164,
WEDGED 7, LOST-STATE 6, DUPLICATED 3. Mean confidence 0.943.

Failure classes (all GENERIC, all with runnable repro fixtures):
- FC-1 crash-recovery without idempotent effect keys duplicates effects
  (fixtures/fc1-nonidempotent-recovery.py)
- FC-2 no-retry-on-pool-drop wedges the loop
  (fixtures/fc2-pool-drop-wedge.py)
- FC-3 non-durable dispatch intent lost on pre-write coordinator death
  (fixtures/fc3-nondurable-intent.py); fix direction proven 3/3 by
  probes/run_durable_intent.py (durable plan + next-reign adopt)

6 records superseded (kept raw, excluded from counts): 2 pre-fix crash smoke,
1 collision key-reuse local accident, 3 durable-intent syntax-error probes.

Deliverables: CHAOS-RESULTS.md (certified), lanes/IMPL-LANE-NOTE.md,
evidence/probe-records.jsonl, evidence/full-run.log. Follow-ons Q1-Q5 staged
for CHAOS-B. Source paths absent on Hatch host; Pig SSH copy of the real
sources still needed for source-specific proof.
