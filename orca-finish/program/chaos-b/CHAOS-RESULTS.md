# CHAOS-B: Pool Exhaustion (Q2) + Clock-Skew Races (Q1) — Certified Results

**Lane:** CHAOS-B | **Assignment:** ORCA FINISH PROGRAM — CHAOS-B (Q2, Q1)
**Isolation:** proven 2026-09-24 ~05:12 MDT (ISOLATION_PROVEN; DB path inside
chaos-b scratch, zero banned production identifiers, socket-monkeypatched
mini-pass incl. new BoundedPool + lease ops, strace audit of all writes).
Re-run before the Q1 batch: TBD. No production system touched; no shared
branch committed. File-backed SQLite behavioral harness (CHAOS-A lineage +
BoundedPool + skew-aware lease ops).
**Ledger:** `evidence/probe-records.jsonl`

## 1. Verdict summary

| Verdict     | Records | Meaning |
|-------------|---------|---------|
| SURVIVED    | 24      | mechanism held under the skew/contention/slowness |
| WEDGED      | 6       | FC-4: 3 contention deadlocks + 3 degraded heals |
| LOST-STATE  | 4       | FC-5 facet 1 (1) + FC-6 orphan without reaper (3) |
| DUPLICATED  | 7       | FC-5 facet 2 (1) + FC-6 double-recovery (3) + torn checkpoint (3) |

Q2: 12 records, 192 missions. Q1: 8 valid records (10 raw, 2 superseded —
section 6), ~22 missions. Q3: 21 records, 75 missions. Total: 41 valid
records, ~289 missions. Mean confidence ~0.93.

| Suite | Probes | Missions | Result |
|-------|--------|----------|--------|
| Q2a baseline: 16 single-acquire units, max 2 conns, bounded retry x3 | 3 | 48 | 3/3 SURVIVED, 16/16 each, p99 acquire 2.1–2.8s |
| Q2b wedge: 16 nested-acquire units, blocking acquire, no deadline x3 | 3 | 48 | 3/3 WEDGED, 0/16 completed, 16 stuck (25s watchdog) |
| Q2b control: same units, max 32 conns x3 | 3 | 48 | 3/3 SURVIVED, 16/16 (units correct; pool size wedges) |
| Q2c heal: nested + acquire deadline + release-and-retry x3 | 3 | 48 | 3/3 WEDGED, heal rate 0.06–0.125, ~185 timeouts/rep |
| Q1a extend-expired: naive vs server x1+1 | 2 | 4 | naive LOST-STATE, fixed SURVIVED |
| Q1b revoke-resurrect: naive + server | 2 | 4 | 2/2 SURVIVED (revocation clock-independent) |
| Q1c stale fencing: claim + epoch-fenced write, +60s skew | 1 | 3 | SURVIVED (1 superseded probe-bug record) |
| Q1d dual-holder: naive vs server | 2 | 8 | naive DUPLICATED, fixed SURVIVED (1 superseded) |
| Q3a double-recovery: supervisor timeout (2s) mid slow-commit (4s) | 6 | 6 | naive 3/3 DUPLICATED, idempotent-effect 3/3 SURVIVED |
| Q3b SIGKILL mid-commit: single txn vs split txn, reaper vs none | 9 | 9 | single 3/3 SURVIVED; split+reaper 3/3 SURVIVED; split alone 3/3 LOST-STATE |
| Q3c SIGKILL mid-checkpoint: outbox dispatch gap, redelivery | 6 | 60 | naive 3/3 DUPLICATED (row re-dispatched); idempotent 3/3 SURVIVED |

## 2. What survived (regression bar for impl)

- **Contention without hold-and-wait:** 16 single-borrow tx units against a
  2-connection pool all complete (3/3); contention appears as acquisition
  latency (p99 2.1–2.8s), not loss.
- **Server-clock lease discipline:** expired leases cannot be extended,
  re-granted leases keep a single holder, bearer tokens rotate per grant:
  6/6 fixed-variant probes SURVIVED.
- **Revocation and fencing under skew:** revoked leases stay revoked at
  -60s skew; stale fencing tokens cannot win claims or land epoch-fenced
  writes at +60s skew. Skew attacks the *time* boundary only.

- **Survived under slowness (regression bar):** idempotent effects absorb
  supervisor double-recovery (3/3); single-txn claim+effect rolls back
  atomically under SIGKILL (3/3, no torn window at any speed); a reaper
  finishes split-txn orphans (3/3); idempotent dispatch absorbs torn
  checkpoints with all 10 rows delivered exactly once (3/3).

## 3. What did not survive (generic failure classes)

### FC-4: fixed-pool hold-and-wait wedges under contention (NEW)
- 3 WEDGED (q2b) + 3 WEDGED (q2c degraded heals).
- Repro: `fixtures/fc4-pool-contention-deadlock.py`.
- Shape: 16 correct, retry-armed tx units, each holding 1 of 2 connections
  while blocking (no deadline) on a nested borrow. Two units deadlock
  hold-and-wait; 14 more pile onto the first borrow. Zero progress, no
  error. Bounded retry never fires: the wedge sits beneath the retry loop.
- The escape hatch is not enough: acquire deadline (1.5s) +
  release-and-retry healed only 1–2/16 units in 25s with flat jittered
  backoff (~185 PoolTimeouts/rep, q2c 3/3 WEDGED). A convergence experiment
  (`probes/exp_convergence.py`) proved it is not a tuning problem: nested
  units with deadline + *exponential* backoff (30 attempts) completed
  **0/16 in 150s** — self-sustaining retry churn (near-livelock). The
  restructured single-borrow unit completed **16/16 in 2s** on the same
  2-connection pool.
- Fix class, in priority order: (3) never hold-while-acquiring
  (single-borrow units, or acquire-all-up-front) is THE fix and is
  load-bearing; (1) acquire deadlines everywhere (typed escape, never block
  indefinitely) and (2) release-before-retry with backoff are mitigation
  that bounds damage but do not heal severe contention.
- Grade vs FC-2: FC-2 stays single-lane (outage lane: DB disappears, no
  retry). FC-4 is a distinct class: healthy DB, retry present, structural
  deadlock, different fix. Same silent-zero-progress symptom, different
  trigger and remedy.

### FC-5: worker-clock-trusted lease extend breaks fencing (NEW)
- 1 LOST-STATE (q1a-naive) + 1 DUPLICATED (q1d-naive).
- Repro: `fixtures/fc5-clock-skew-lease.py`
  (RESURRECTED, DUPLICATED(2), FENCING-HOLDS).
- Facet 1: -60s skewed worker extends a server-expired lease; naive store
  trusts the worker timestamp and accepts: expiry fencing lost.
- Facet 2: A expired -> re-granted to B with the bearer token NOT rotated
  (lease-scoped token) -> skewed A extends with its old token; store
  reassigns the holder to A: two holders, lease-scoped external effect
  fires twice.
- Fix class: monotonic clock + server-issued timestamps: expiry judged on
  the store clock only; extend binds holder+token; re-grant rotates the
  bearer token (grant-scoped tokens).
- Held under skew (regression bar): revocation (server-side flag),
  claim/fencing atomicity (clock-independent).

### FC-6: slow-path recovery races (NEW)
- 3 DUPLICATED (q3a-naive double-recovery) + 3 LOST-STATE (q3b-split orphan,
  no reaper) + 3 DUPLICATED (q3c-naive torn checkpoint).
- Repro: `fixtures/fc6-slow-path-recovery.py`
  (DOUBLE-RECOVERY, ABSORBED, ORPHANED, REAPED, TORN-CHECKPOINT, ABSORBED).
- Finding: 2-5s injected latency creates no NEW torn-state mechanism; it
  widens every existing recovery window from ms to seconds, turning rare
  races into certainties. Facets: (1) supervisor timeout fires while the
  worker is alive-but-slow and re-runs a non-idempotent effect — no crash
  needed; (2) SIGKILL between a committed claim and the effect commit
  orphans CLAIMED-without-effect work (single-txn shape has no such window
  at any speed); (3) SIGKILL in the outbox dispatch->mark gap leaves a
  dispatched-but-unmarked row that redelivery re-dispatches.
- Fix class: deterministic idempotency keys on every externally visible
  effect (INSERT OR IGNORE); single-txn claim+effect where possible; a
  load-bearing reaper/sweeper where two phases are unavoidable. Shortening
  the supervisor timeout makes double-recovery MORE likely; the timeout
  value never removes the window — idempotency does.
- Lane note: `lanes/FC-6-slow-path-recovery.md`.

## 4. Source-specific confidence limitations
Same as CHAOS-A section 5, inherited: the A5 worktree sources are absent
on this host; these are behavioral harness re-proofs. Confidence ~0.94 in
the failure CLASSES (implementation-independent: hold-and-wait deadlock
and clock-trust fencing breaks are textbook); confidence that any specific
real implementation contains them is UNKNOWN until source-specific probes
run.

## 5. Failure pipeline disposition
- **Local accidents** (4): pooled-sqlite check_same_thread (fixed, 1 tainted
  record discarded pre-run); q1c missing epoch re-stamp (fixed, re-ran);
  q1d-naive unconditional dual-effect application (fixed with
  lease_grant_naive + act-only-on-accept; re-ran); fixture facet-2 token
  rotation mismatch (fixed with the naive grant). All repaired, re-run,
  documented; none reached impl.
- **Generic classes** (FC-4, FC-5): repro + fixture done; lane notes
  (`lanes/FC-4-pool-contention.md`, `lanes/FC-5-clock-skew-lease.md`);
  memory candidates below; requeue entries in section 7.
- **Superseded records** (2, kept raw, excluded from counts): see section 6.

## 6. Superseded records
1. First q1c record (stale fencing): probe forgot `set_packet_epoch` at the
   new epoch before the fenced writes, so the "zombie" write matched.
   Superseded by the corrected re-run (SURVIVED: zombie 0 rows, legit 1).
2. First q1d-naive record: probe applied both holders' effects
   unconditionally although A's extend had been rejected (token rotated by
   the server grant), so the DUPLICATED verdict was not causally tied to
   the extend. Superseded by the re-run with `lease_grant_naive`
   (non-rotating token) and act-only-on-accept (DUPLICATED with
   a_extend_accepted=true, holder flipped to A).

## 7. Requeue entries (owning lane: impl-lane)
- **RQ-B1 (FC-4):** implement acquire deadlines + release-before-retry +
  no-hold-while-acquiring in every bounded pool (DB, HTTP, worker slots);
  add the stuck-progress detector (pool saturated + completion rate 0);
  adopt `fixtures/fc4-pool-contention-deadlock.py` as a regression test.
- **RQ-B2 (FC-5):** judge lease expiry on the store clock only; bind
  extend to holder+token; rotate bearer tokens per grant; audit for
  extend-accepted-after-server-expiry and holder-flip-without-grant;
  adopt `fixtures/fc5-clock-skew-lease.py` as a regression test.

- **RQ-B3 (FC-6):** put deterministic idempotency keys on every externally
  visible effect; keep claim+effect in one transaction where possible;
  build a load-bearing reaper for unavoidable two-phase work; adopt
  `fixtures/fc6-slow-path-recovery.py` as a regression test.

## 8. Memory candidates (for the parent agent to file)

- **MC-B1 (FC-4):**
  problem: A fixed-size pool with blocking acquire wedges by hold-and-wait
  deadlock when units borrow while holding a borrow, under contention —
  even when every unit is correct and retry-armed.
  scope: Any pooled resource (DB connections, HTTP clients, worker slots)
  where a unit can hold one unit of the resource while waiting for another.
  evidence: CHAOS-B Q2, TEST, 12 records: q2b 3/3 WEDGED (0/16, 16 stuck),
  q2b-control 3/3 SURVIVED on 32 conns, q2c 3/3 WEDGED (heal 0.06–0.125).
  mechanism: Two units each hold 1 of 2 connections and block forever on
  the nested borrow; the rest block on the first borrow. The wedge sits
  beneath the retry loop, so bounded retry never fires: silent, zero
  progress, no error.
  fix: Never hold-while-acquiring: single-borrow units or
  acquire-all-up-front (load-bearing; 16/16 in 2s on the same pool).
  Acquire deadlines (typed escape) + release-before-retry with backoff are
  mitigation only: deadline + exponential backoff over 30 attempts
  completed 0/16 in 150s (self-sustaining retry churn, near-livelock).
  test: fixtures/fc4-pool-contention-deadlock.py (WEDGED, DEGRADED,
  then HEALED via the restructured unit).
  version: chaos-b harness v1, 2026-09-24.
  applicability: Any impl lane owning a bounded pool; the deadlock shape is
  implementation-independent.
  counterexample: Enlarging the pool or raising the retry budget does not
  fix it (moves the cliff; the wedge is beneath the retry loop). q2a shows
  single-borrow units survive the same contention with latency only.

- **MC-B2 (FC-5):**
  problem: Lease renewals that trust worker-supplied timestamps, or bearer
  tokens scoped to the lease instead of the grant, let a clock-skewed
  worker resurrect expired leases and steal re-granted leases: dual
  holders, duplicated external effects.
  scope: Any lease/heartbeat/coordination-lease mechanism accepting client
  timestamps for expiry or reusing tokens across grants.
  evidence: CHAOS-B Q1, TEST, 8 valid records: q1a-naive LOST-STATE
  (expired lease resurrected at -60s skew), q1d-naive DUPLICATED
  (2 holders, 2 effect rows); fixed variants 6/6 SURVIVED.
  mechanism: (1) `expires_at > worker_now` with worker_now 60s behind
  accepts extends the server considers expired; (2) non-rotated bearer
  token + token-only re-auth reassigns holder_id to the superseded holder.
  fix: Monotonic clock + server-issued timestamps: expiry on the store
  clock only; extend binds holder+token; re-grant rotates the token
  (grant-scoped).
  test: fixtures/fc5-clock-skew-lease.py
  (RESURRECTED, DUPLICATED(2), FENCING-HOLDS).
  version: chaos-b harness v1, 2026-09-24.
  applicability: Impl lanes owning leases/heartbeats/liveness.
  counterexample: NTP discipline or shorter TTLs only shrink the window;
  revocation flags and epoch fencing are clock-independent and already
  hold under skew (q1b, q1c SURVIVED).

- **MC-B3 (FC-6):**
  problem: Slow commits/checkpoints widen every recovery window from ms to
  seconds, turning rare races into certainties: supervisor timeouts
  double-recover alive-but-slow workers, kills orphan two-phase work, and
  torn checkpoints re-dispatch on redelivery.
  scope: Any system with timeout-based failure detection, multi-phase work,
  or outbox/checkpoint loops, wherever a dependency can go slow.
  evidence: CHAOS-B Q3, TEST, 21 records: q3a-naive 3/3 DUPLICATED
  (supervisor 2s timeout vs 4s commit), q3b-split no-reaper 3/3 LOST-STATE
  (real SIGKILL), q3c-naive 3/3 DUPLICATED (kill in dispatch-mark gap);
  fixed variants 12/12 SURVIVED.
  mechanism: (1) The failure detector is correct by its own rule (no
  heartbeat) but the worker is alive; recovery re-executes a
  non-idempotent effect. (2) Claim commits, effect txn dies: CLAIMED with
  zero effects and no owner. (3) Dispatch commits, mark never lands:
  redelivery cannot distinguish torn from pending.
  fix: Deterministic idempotency keys on every externally visible effect;
  single-txn claim+effect where possible; a load-bearing reaper/sweeper
  for unavoidable two-phase work.
  test: fixtures/fc6-slow-path-recovery.py (six acts, exit 0).
  version: chaos-b harness v1, 2026-09-24.
  applicability: Impl lanes owning supervisors, outboxes, checkpoints,
  or two-phase commit flows.
  counterexample: Tuning the supervisor timeout does not help: shorter
  makes double-recovery more likely, longer delays real recovery. The
  single-txn shape has no orphan window at any speed (q3b-single 3/3
  SURVIVED), proving the window is structural, not a timeout value.

## 9. Queue status
Q2 CLOSED (repro + fixture + lane note + this doc). Q1 CLOSED (same).
Q3 CLOSED (repro + fixture + lane note + this doc). Q4/Q5 belong to CHAOS-C
— not taken.
