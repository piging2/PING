# PERFORMANCE CRITIQUE — ORCA FINISH PROGRAM
Critic: CRITIC-PERFORMANCE | 2026-09-23 ~21:25 MDT | Night shift
Method: read-only source inspection (STATIC), measured scratch benchmarks (TEST), live sibling measurements (LIVE). Nothing touched in production. No em dashes used anywhere in this file.

Independent verdicts below. I falsify; I certify nothing. Every ceiling is arithmetic, not adjectives.

## T1. MissionScheduler: maxConcurrent 3 + 5s poll

Source: `program/orca-a/src/mission_scheduler.js` (343 lines), `worker_runtime.js` (dispatch), `mission_runtime.js` (leases). Evidence grade: STATIC for mechanism, TEST for the hung-worker hole (ORCA-A probe2 H11a-e independently re-proved it 2026-09-23).

Mechanism facts that matter:
- `_poll()` fires every 5s via setInterval. There is NO re-entrancy guard: if a poll takes longer than 5s, the next poll overlaps.
- Dispatches within one poll are awaited SERIALLY (`await this._dispatch(mission)` inside a for loop). `maxConcurrent` is checked only at poll entry and before each serial dispatch. Within one poll, at most ONE dispatch is in flight at a time; the 3 slots fill only via overlapping polls, which happens only when per-mission service time T > 5s.
- `WorkerRuntime.dispatch()` awaits `worker.handle(event)` with NO timeout, NO Promise.race, NO Abort (confirmed by regex probe, ORCA-A H11a TEST). A promise that never settles hangs `_dispatch` forever; the `finally` that clears `_processing` never runs.
- Arrow 0 renews the lease of every mission in `_processing` on EVERY poll tick, before reaping (Arrow 1). Reaping skips in-`_processing` missions. So a hung mission's lease is renewed forever and never reclaimed.
- Hang cascade: poll N hangs on mission 1 (slot 1 stuck). Poll N+1 (5s later) sees size=1 < 3, dispatches mission 2, hangs. Poll N+2 dispatches mission 3, hangs. Poll N+3 sees size=3 >= 3 and returns. Full permanent stall in about 15 seconds from 3 hung workers, or from ONE poison mission type that hangs every dispatch (each overlapping poll picks up a new one).

### Throughput ceiling (sustained)

Let T = mean mission service time in seconds (assign + start + dispatch(worker.handle) + complete, including all awaits).

Sustained throughput R = min( maxConcurrent / T , 3 per 5s ) missions per second
                       = min( 180 / T_s , 36 ) missions per minute

- T = 2s (fast local workers): 36/min. Poll-bound. The "3 concurrent" never actually engages; effective concurrency is 1, batched 3 per 5s window.
- T = 30s (typical LLM call chain): 6/min = 360/hr = 8,640/day.
- T = 120s (slow agentic mission): 1.5/min = 90/hr = 2,160/day.
- Minimum end-to-end latency for a fast mission: up to 5s poll-phase delay + T.

Quota drain time (single scheduler, no parallelism available):
- 4,000-mission fleet quota at T=30s: about 11.1 hours. At T=120s: about 44 hours. Overnight shift is 8-9 hours. The quota does not fit a night shift on one scheduler with agentic service times.
- You cannot add schedulers to parallelize: there is NO single-writer claim on the scheduler path (ORCA-A verdict: "PING has no generation column and no scheduler single-writer claim"; two schedulers would both renew the same leases forever, per H11d).

### Hung-worker hazard: the ceiling is 0, permanently

3 hung workers (or 1 poison mission type hanging every dispatch across 3 overlapping polls) drives sustained throughput to exactly 0, forever, with no self-recovery path in the code. Arrow 0 is the poison: it renews the stuck leases every 5s, and Arrow 1's reaper explicitly skips `_processing` members. Renewals also burn a PG UPDATE per stuck mission per poll forever.

VERDICT T1: ceiling confirmed at min(180/T_s, 36) missions/min. The "maxConcurrent 3" framing is misleading: it is 3 dispatches per 5s window, not 3 parallel workers, and the real bound is T. DOWNGRADED claim: any statement that 3+5s is "adequate headroom" — at agentic service times the quota exceeds a night shift, and one hung worker type zeroes the whole system permanently.

## T2. Lease timings: 60s TTL, 5s fixed backoff x3, ~60s reclaim

Source: `mission_runtime.js` (assign sets `lease_until = NOW() + 60s`; `renewLease` default +60s; `failWithRetry` fixed 5000ms backoff; `reapExpiredLeases` resets to `created`). Evidence: STATIC. Independent re-proof of the no-timeout + renew-forever hole: ORCA-A probe2 H11 (TEST).

### Worst-case time-to-recovery for a dead coordinator

Clean scheduler death (process gone, 3 missions in flight, last renewal just happened):
  60s (lease TTL from last renewal)
+  5s (next reap poll)
+  5s (next dispatch poll)
+  T_service
= about 70s + T for full recovery to dispatching.

Hung-but-alive coordinator (handle() never settles, process alive):
  Recovery time = INFINITE. Arrow 0 renews every 5s forever; the reaper never sees the missions; no watchdog, no max-attempts on renewal, no holder check in renewLease SQL (ORCA-A H11d TEST). External kill of the scheduler process is the only recovery, and nothing in the code performs it.

Coordinator advisory lock (ORCA side, `acquireCoordinatorLock`): no TTL, no heartbeat, no renewal path exists (ORCA-A H9d, STATIC). A stuck lock holder blocks that objective's claim path forever; recovery = manual.

### Is 60s the right order of magnitude?

For clean death: yes, roughly. Poll cadence is 5s, so 60s = 12 polls of slack; a live scheduler renews per poll, so false reclamation is near-impossible; 60s orphan-detection latency sits in the middle of plausible service times (10s-120s). It is a reasonable default, not a tuned one.

For hung death: the TTL value is irrelevant because renewal defeats it. The defect is not the number; it is that Arrow 0 renews without any liveness proof from the worker (no heartbeat check, no attempt cap, no holder fencing).

### What breaks at 10x mission volume

Per-poll DB load is tiny and flat: <=3 renewals + 1 reap + 1 getPending + ~6 SQL per dispatched mission (<=3) = at most ~25 queries per 5s, about 5 qps. Postgres will not notice. What breaks:
1. The ceiling does not move (3 slots). Backlog grows linearly with zero backpressure signal: no queue-depth metric, no alarm, no shed. `getPending(limit)` takes 3 regardless of whether 10 or 100,000 wait.
2. Retry storms: fixed 5s backoff means N simultaneously failing missions ALL become eligible again 5s later, re-occupying all 3 slots in lockstep. No jitter, no exponential suppression, no circuit breaker. A poison batch can hold 100% of dispatch capacity through 3 attempts each (~10s + 3x T_fail per mission) before DLQ.
3. `getActive()` (mission_runtime.js) is an UNBOUNDED `SELECT * ... WHERE status IN ('assigned','running')` with no LIMIT, returning full JSONB payloads. Whatever calls it on a dashboard cadence gets slower as the system gets busier: the exact wrong shape for a hot path.
4. Poll-phase latency: new high-priority missions still wait up to 5s for the next tick; priority ordering only applies within each 3-mission batch.

VERDICT T2: 60s TTL confirmed reasonable for clean-death orphan detection (~70s + T recovery). DOWNGRADED: the lease system does not bound hung-death recovery at all (infinite); Arrow 0's unconditional renewal is the hole, not the TTL value. At 10x, the DB is fine; the retry storm and the unbounded getActive() are the breakage points.

## T3. Mission Control /mc API (C7)

FINDING: `gateway/routes/mission_control.js` DOES NOT EXIST. `gateway_runtime.js` (lane-d-execution pig-src) requires `../routes/mission_control` and `../routes/missions`, but no `routes/` directory exists anywhere in that tree. If those requires execute at boot, the gateway throws MODULE_NOT_FOUND. There is no /mc SQL to review. Evidence: STATIC (filesystem + require graph).

Any performance claim about /mc endpoints is UNVERIFIED by construction. What I could review instead: the real SQL surfaces that exist (MissionRuntime):

- `getPending(limit)`: `SELECT * ... WHERE status='created' OR (status='retry_pending' AND retry_at <= NOW()) ORDER BY priority DESC, created_at ASC LIMIT $1`. LIMIT is bounded (scheduler passes 3). Indexes exist on status, priority, retry_at. At 100x rows the OR branch still resolves via idx_pm_status/idx_pm_retry_at; a composite index on (status, priority DESC, created_at) would serve the ORDER BY without a sort step, but this is an optimization, not a defect.
- `assign/start/complete/fail`: single-row PK UPDATEs with conditional status guards. O(1). Fine at 100x.
- No N+1 pattern exists: per-mission SQL count is constant (~6-8 statements), already accounted for inside T in the ceiling formula.
- The one real defect: `getActive()` unbounded (see T2.4).
- Estimated cost at 10x/100x data volume: writes scale linearly with missions (1 INSERT + 4-6 UPDATEs per mission lifecycle); reads are flat per poll. PG handles this trivially. The serial dispatch latency dominates long before the DB does.

VERDICT T3: cannot assess /mc SQL; file absent; any /mc latency claim DOWNGRADED to UNVERIFIED. Existing mission SQL is bounded except getActive(), which needs a LIMIT before any dashboard polls it.

## T4. Memory system: index ingestion stalling

Measurements (MEM-A loop proof + WAVE-LEDGER, 2026-09-23 evening):
- Best observed behavior: index lag 3-5 min (entry written 20:06, retrievable ~20:09; v1.1 written 20:14 not yet retrievable ~2-3 min later). Evidence: TEST.
- Current behavior: STALLED. Three timestamped probe writes (20:58:36, 21:05:28, 21:13:22) produced ZERO index ingestion across polls at t<1, t~7, t~14, t~15, t~21.5 min. Nothing written after ~20:09 entered the index in 70+ minutes. Evidence: LIVE.
- Additional: FORGET-index is broken (deleted v1.0 entry still served by search after deletion, 20:59). The index is not just slow; it serves deleted content with no staleness marking. Evidence: TEST.

What this means for a "learning loop" that depends on fresh retrieval:
- The minimum write -> retrieve cycle time is the INDEX CADENCE, not milliseconds. Best case 3-5 min; tonight unbounded (70+ min and counting).
- Any mission that writes a lesson and expects a later mission the same night to retrieve it is broken by construction tonight. "Learning loop" claims that assume fresh retrieval (e.g., Agent 10 B3 per the ledger) compound this: they are unverifiable until the index recovers, and even healthy they operate on a minutes-scale feedback loop, not a mission-scale one.
- Retrieval is semantic, not exact-token, and results are line-chunked fragments needing reassembly (MEM-A 20:09 finding): each retrieval pays a reassembly/verification cost on top of the lag.
- Freshness is not monotone: deleted content is still served. A "learn then unlearn" cycle cannot be trusted end to end.

VERDICT T4: DOWNGRADED. Tonight, no lane may depend on fresh memory retrieval. Standing ceiling even when healthy: 3-5 min minimum write-to-retrieve; any learning-loop design must budget that plus reassembly, or bypass the index with direct file reads (MEM-A's memory_get path worked: INJECT proven at line granularity).

## T5. Probe/harness timings: does verification scale to the quotas?

Fleet quotas (WAVE-LEDGER): 4,000 ORCA mechanism-verdict missions / 4,500 adversarial-chaos-idempotency missions.

### ORCA-A: 57 probes
- Count confirmed: 43 ok() in probe.js + 14 in probe2.js = 57.
- Measured runtime: probe.js 0.575s, probe2.js 0.312s. Total under 1 second, scratch file-backed, no sleeps. Evidence: TEST (measured 2026-09-23 ~21:2x).
- But: these probes verify MECHANISM PROPERTIES (identity determinism, CAS behavior, static source regexes), O(1) per mechanism. They do not execute missions and their runtime does not scale with the 4,000-mission quota at all. Multiplying "57 probes pass in <1s" into quota coverage is a category error; the probes and the quota count different things.

### CHAOS-A: kill matrix
- Measured: single packet, injected kill at S1, 1 rep = 2.9s wall (includes 2 worker process spawns: killed + recovery, 3 steps x 0.1s, death verification, SQLite grading). Evidence: TEST (measured on a scratch copy in critic-performance/scratch/chaos-timing; CHAOS-A's own evidence dir untouched).
- Full default matrix: 13 (stage,mode) pairs x 3 reps x 2 packets = 78 packets. Extrapolated: ~78 x 2.9s ~= 226s ~= ~4 min serial. The runner is a serial for loop; chaos.db is fcntl-locked SQLite. No parallelism.
- 4,500-mission adversarial quota at this packet rate: ~3.6 hours serial. Feasible in a night shift IF run serially and IF "mission" = "packet lifecycle", but the serial runner is the constraint, and each packet currently verifies one kill-stage of a 3-step toy worker, not a real mission.
- Is verification slower than the thing verified? For the static probes: no (<1s vs the mechanisms' lifetime). For the kill matrix: verification (~3s/packet) is on the same order as a short real worker run; it scales LINEARLY with packet count, so the gauntlet does not dominate asymptotically, but the serial implementation makes 4,500 packets a multi-hour batch. Parallelizing packet lifecycles (separate DB files or a real PG) is the available headroom.

VERDICT T5: ORCA-A probes are fast because they test almost nothing per unit time (mechanism properties, not missions). Kill matrix full pass ~4 min; 4,500-mission quota ~3.6h serial. The gauntlet scales linearly and is viable, but the serial runner must be parallelized before anyone claims the 4,500 quota is "verified nightly". Downgrade any claim that probe speed implies quota coverage.

## T6. "Fast / enough / scalable" claims audit

Searched ORCA-A, ORCA-B, CHAOS-A, MEM-A checkpoints and wave2 gauntlet docs for throughput/latency/scale claims. Findings:
- No lane currently asserts a numeric throughput or latency SLA. The lanes are honest about mechanism behavior; the numeric claims live in MY task brief (C2/C7), not in lane artifacts.
- Implicit claim in MissionScheduler defaults ("maxConcurrent 3 + 5s poll" shipped as defaults): DOWNGRADED per T1. Adequate only for T <= ~2s missions (36/min). For agentic missions it is a 1.5-6/min system, and 3 hung workers zero it permanently.
- Implicit claim in `failWithRetry` (fixed 5s backoff x3): DOWNGRADED for poison batches. No jitter, no exponential backoff, no circuit breaker; retry storms are structurally invited.
- Wave-1 mission-control audit documented `/mc/missions/active`, `/pending`, `/:id/trace` endpoints, but the routes file does not exist in the gateway tree: any dashboard performance discussion is premature.
- MEM-A's loop proof is careful to grade WRITE/STORE/RETRIEVE separately and never claims fresh retrieval is fast: consistent with the T4 downgrade.

## Throughput-ceiling table (maintained)

| Mechanism | Ceiling | Unit | Evidence |
|---|---|---|---|
| MissionScheduler sustained | min(180/T_s, 36) | missions/min | STATIC |
| at T=30s (LLM chain) | 6/min = 360/hr | missions | computed |
| at T=120s (agentic) | 1.5/min = 90/hr | missions | computed |
| 4,000-mission drain, T=30s | ~11.1 h | wall | computed |
| 4,000-mission drain, T=120s | ~44 h | wall | computed |
| 3 hung workers | 0, permanent | missions/min | TEST (H11) |
| 1 poison mission type | 0 within ~15 s | missions/min | STATIC (overlap cascade) |
| Dead-scheduler recovery | ~70 s + T | wall | STATIC |
| Hung-scheduler recovery | infinite | wall | TEST (H11) |
| Coordinator lock, stuck holder | infinite | wall | STATIC (H9d) |
| DB queries per 5s poll | <= ~25 (~5 qps) | queries | STATIC |
| New-mission poll-phase delay | 0-5 s | latency | STATIC |
| Poison-mission slot tax | 3 attempts x T_fail + 10 s backoff | per poison mission | STATIC |
| getActive() | UNBOUNDED, no LIMIT | rows | STATIC |
| ORCA-A 57 probes | < 1 s total | wall | TEST (measured) |
| CHAOS-A kill matrix, full | ~4 min (78 packets) | wall | TEST (measured 2.9 s/pkt, extrapolated) |
| 4,500-packet kill campaign | ~3.6 h serial | wall | computed |
| Memory index lag, healthy | 3-5 min | wall | TEST |
| Memory index lag, tonight | >= 70 min stall, unbounded | wall | LIVE |
| Memory write -> retrieve | currently unbounded | wall | LIVE |
| Memory FORGET-index | BROKEN (serves deleted) | — | TEST |

## Follow-on queue (standing)

1. Re-benchmark scheduler the moment a dispatch timeout, worker heartbeat, or renewal attempt-cap lands: recompute T1 ceiling and hung-recovery bound.
2. Re-assess the day a second scheduler or single-writer claim appears: two-scheduler renew contention needs its own timing model.
3. Review `gateway/routes/mission_control.js` the day it lands: N+1 scan, LIMIT audit, index check against real query shapes. `getActive()` needs a LIMIT before then regardless.
4. Re-measure memory index cadence when ingestion recovers; re-verify FORGET-index.
5. Parallelize or re-time the kill matrix if CHAOS-A changes the runner; keep the per-packet rate in this table.
6. Watch for any lane newly claiming a numeric SLA: redo the arithmetic on arrival.

## Files
- This critique: `~/workspace/orca-finish/program/critic-performance/PERFORMANCE-CRITIQUE.md`
- Timing scratch (isolated copy, CHAOS-A evidence untouched): `~/workspace/orca-finish/program/critic-performance/scratch/chaos-timing/`
- Checkpoint log: `~/workspace/orca-finish/program/critic-performance/CHECKPOINT.md`
