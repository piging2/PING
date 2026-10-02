# Lane note: FC-4 — deposed worker's late writes are not fenced by reclaim

**To:** impl lanes (orchestrator / worker lifecycle) | **From:** CHAOS-C Q3 | **Date:** 2026-09-24

## The class
`reclaim_packet` bumps `attempt_seq` and reassigns `claimed_by`, but no
subsequent write checks either value. A worker that is slow (not dead) across
a supervisor timeout keeps writing after it has been deposed, and its
unconditional writes overwrite the recovery's writes. The slow path opens a
double-recovery window that the fast path never reaches: without the latency,
the worker finishes before the timeout fires.

## Evidence (TEST, conf 0.93)
- Probe `probe-3d136850` (DUPLICATED): worker-A slow-finalizes 5s; supervisor
  reclaims to worker-B at 1s; B completes and emits the fenced completion
  (result:worker-B); A wakes and `set_packet` unconditionally writes
  result:worker-A. Final: packet row says A, completion fence says B.
  Effects applied once (idempotent keys held), completions exactly one row
  (write-once fence held) — the corruption is confined to unfenced row writes.
- Repro fixture: `fixtures/fc4-deposed-late-write.py` (exit 0 on reproduce).

## What held vs what broke
- HELD: idempotent effect keys (1 effect row), exactly-once completion
  emission (1 row), reclaim itself, epoch fencing of coordinator writes.
- BROKE: any row write after reclaim that does not predicate on
  `(claimed_by, attempt_seq)` — the deposed worker's write silently wins.

## Fix direction
Fence every post-claim write on the claim the writer holds:
`UPDATE ... WHERE packet_id=? AND claimed_by=? AND attempt_seq=?`;
treat `rowcount=0` as "deposed, stop writing" (fail closed, never retry the
write). The same predicate belongs on checkpoint inserts and result writes,
not just packet status. The completion table's `INSERT OR IGNORE` is the
model: the fence must live in the write itself, not in the caller's belief
that it still owns the work.

## Counterexample
Fencing only the coordinator epoch is not enough: the deposed party here is a
worker, not a coordinator. Epoch fencing (record 14) and reclaim bookkeeping
protect reign transitions; they do not protect rows from a slow previous
holder.
