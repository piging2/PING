# CHAOS-C — Slow-Query / Redelivery-Storm / Key-Aliasing — CHECKPOINT LOG
Lane: CHAOS-C | Session: cab401b7-53c4-4071-a8fe-828be0847f5c | Started: 2026-09-24 05:07 MDT
Queue: FOLLOWON-QUEUE.md Q3 (slow-query), Q4 (redelivery storms), Q5 (key aliasing). Q1/Q2 belong to CHAOS-B: do not duplicate.
Orders: scratch harnesses only; prove isolation before each new probe batch; never production. No stopping conditions; YOLO; evidence grades STATIC|TEST|LIVE + confidence on every probe; failures -> LOCAL ACCIDENT vs GENERIC CLASS.

## Source-availability finding (inherited from CHAOS-A, 2026-09-23)
- `/home/nolan/worktrees/orca-autonomy` and wave-1 A5 sources absent on this host (VM is `hatch`, not the Pig). CHAOS-C reuses the CHAOS-A behavioral harness (copied to chaos-c/harness/, DB `chaos-c.db`) extended with slow-query injection primitives (`SLOW` registry, `slow_commit_packet_step`, `slow_checkpoint`). All claims are TEST evidence (scratch behavioral harness); failure CLASSES are implementation-independent.

## Isolation PROVEN (2026-09-24, before any chaos)
- Ran isolation/isolation_check.py (adapted from chaos-a): ISOLATION_PROVEN, exit 0.
  1. DB path inside chaos-c dir: /home/hatch/workspace/orca-finish/program/chaos-c/harness/chaos-c.db
  2. Banned-token scan of harness source: zero hits
  3. Socket-blocked smoke: full mini-pass completed with sockets blocked
  4. strace file-touch audit: every written path inside the chaos-c lane dir
- Re-proven before each probe batch (Q3, Q4, Q5).

## Plan
1. Q3 slow-query: TERM mid-slow-commit; SIGKILL mid-slow-checkpoint; supervisor-timeout double-recovery race; late slow-checkpoint after reclaim; benign TERM+reclaim. Question: does the slow path open NEW torn-state windows?
2. Q4 redelivery storms: 10k dupes x 1 key / 64 threads; 1k keys x 10 dupes / 64 threads. Dedup-hit rate, p99 insert latency, UNIQUE-race double-apply count (expect 0; nonzero = P0).
3. Q5 key aliasing: same key across runs returns prior run's work. Prove, enumerate design options (run-scoped keys vs global keys with run binding), recommend with evidence.
4. Per item: repro + fixture + lane note + results doc. OUTPUT dir layout per task.

## Checkpoint: Q3 closed (2026-09-24 ~05:25 MDT)
- 5 probes, 9 missions: P3.1 SURVIVED (TERM mid-slow-commit, atomic rollback),
  P3.2 SURVIVED (KILL mid-slow-checkpoint, no torn row), P3.3 DUPLICATED,
  P3.4 LOST-STATE, P3.5 SURVIVED (benign control).
- NEW torn windows confirmed (slow path only; kills are clean):
  FC-4 deposed worker's late unconditional writes overwrite the recovery's
  packet row (fixture fc4-deposed-late-write.py, lane note lanes/FC-4-lane-note.md).
  FC-5 deposed worker's slow checkpoint becomes newest, burying the recovery's
  checkpoint (fixture fc5-stale-checkpoint-newest.py, lane note lanes/FC-5-lane-note.md).
- Common fix family: fence every post-claim write and checkpoint/restore
  selection on (claimed_by, attempt_seq). Requeued to impl lanes via lanes/.
- Isolation re-proven before Q4 batch (see above).

## Checkpoint: Q4 closed (2026-09-24)
- P4.1 SURVIVED: 10k dupes x 1 key / 64 threads -> 1 packet, 9,999 dedup hits (99.99%), p50 25.7ms / p99 185.4ms, 0 UNIQUE-race slips.
- P4.2: first attempt hit OperationalError "database is locked" (LOCAL ACCIDENT: 64-thread pile-up exceeded 30s busy_timeout; fixed probe-side with bounded retry, idempotent so safe). Re-run completed; initial DUPLICATED classification was a probe accounting artifact (retry-after-committed-audit); forensic re-read -> SURVIVED via probe-424c36ea-corr: 1,000 keys -> exactly 1,000 rows, 0 slips, true dedup rate 90.00%. P0 tripwire (nonzero double-applies) never fired in either storm.
- Isolation re-proven before Q5 batch.

## Checkpoint: Q5 closed (2026-09-24) — CHAOS-C CERTIFIED
- P5.1 SURVIVED: cross-run aliasing PROVEN (same key + different payload -> B silently receives A's result; mechanism as designed, semantics undecided).
- P5.2 DUPLICATED: blast radius PROVEN (caller ignores is_new -> packet.run_id=A vs completion.run_id=B).
- P5.3 SURVIVED: legitimate same-payload cross-run replay works (the case to preserve).
- Design decision recorded: options enumerated, option 2 RECOMMENDED (global keys with payload-hash-bound collision semantics + explicit COLLISION signal; key namespaces as producer guidance). lanes/Q5-design-decision.md.
- Final: 11 raw records, 10 valid (1 superseded), SURVIVED 7 / DUPLICATED 2 / LOST-STATE 1, mean conf 0.949. FC-4 + FC-5 generic classes with repro fixtures + lane notes + memory candidates MC-5/MC-6/MC-7. CHAOS-RESULTS.md certified.
