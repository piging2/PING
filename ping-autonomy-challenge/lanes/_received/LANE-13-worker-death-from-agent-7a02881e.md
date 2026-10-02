# LANE 13: WORKER DEATH (ADVERSARIAL) — Minimum Survival Machinery

Wave 1, PING Autonomy Grand Challenge. Research / falsification only.
Assumption throughout: the worst case is the common case. Every scenario below is
reasoned through concretely, then reduced to the smallest mechanism set that keeps
a multi-day mission alive. "Just use Kubernetes" is not an answer; every mechanism
here is implementable with a filesystem, SQLite, and a few hundred lines of code.

Pinned SHAs were fetched live from the GitHub API on 2026-09-23 and are HEAD commits
as of that date. They pin the *lineage* of each mechanism (the code that proves the
mechanism exists in production), not a vendored dependency.

---

## 1. Per-scenario analysis

### S1. Worker SIGKILL mid-tool-call

(1) Ambiguous state: the tool call may or may not have executed its side effect on
the tool server. The worker is dead, so there is no result and no record of what
happened. Retry blindly and you risk a double effect (double charge, double email,
double booking). Refuse to retry and you risk a lost effect. Neither at-least-once
nor at-most-once is safe alone; the ambiguity is unresolvable by investigation
because the witness is dead.

(2) Minimum mechanism: make re-execution safe instead of resolving what happened.
Before executing any effectful call, the worker durably journals the *intent*
(op_id, deterministic idempotency key, arguments). The key is derived from the
logical operation (mission + task + op sequence), NOT from the attempt number.
On recovery, the replacement replays the journal; any intent with no recorded
result is re-executed with the SAME key; the tool server or the adapter dedupes
on the key. This is write-ahead logging applied to side effects (ARIES discipline:
intent first, execute second, result third).

(3) Real systems: Stripe API `Idempotency-Key` header
(https://docs.stripe.com/api/idempotent_requests, docs, no SHA); AWS EC2
`ClientToken` on RunInstances (same contract, AWS API); ARIES write-ahead logging
(Mohan, Haderle, Lindsay, Pirahesh, Schwarz, IBM Research, 1992) for the
intent-before-execute ordering; Temporal request-ID dedup (`deduplicationId`) in
temporalio/temporal@543367eec690da3c23e536cf5dfe76928af11b2c.

(4) Cost: one extra durable write (fsync) per effectful op, single-digit ms on
local SSD; every tool adapter must implement key dedupe with a retention window
(bounded keyed storage); op identity must be deterministic, which constrains how
tasks are decomposed (no "just call it again and hope").

### S2. Entire machine disappears

(1) Ambiguous state: the coordinator cannot distinguish dead from partitioned from
slow. Work assigned to the dead worker stalls. If the coordinator reassigns and
the machine was merely partitioned, two workers now own the same task.

(2) Minimum mechanism: heartbeat lease with timeout. On lease expiry the
coordinator revokes the lease, reassigns the work, and bumps the fencing
generation; every state mutation must present the current fencing token, so even
if the old machine returns, its writes are rejected. Detection is by timeout, not
by truth; safety comes from fencing, not from knowing the machine is dead.

(3) Real systems: Kubernetes node `Lease` objects plus taint-based eviction in
`pkg/controller/nodelifecycle`
(kubernetes/kubernetes@2db33713681c8a788cea756b93cba78df83531fa); ZooKeeper
session expiry deleting ephemeral znodes
(apache/zookeeper@b9818714f4790347c27f37fd49739a91b46c8e5e); Chubby leases
(Burrows, "The Chubby lock service for loosely-coupled distributed systems",
OSDI 2006).

(4) Cost: heartbeat traffic (trivial); timeout tuning is the real cost. Short
timeout = fast failover but false positives under GC pauses and load spikes
(flapping reassignments). Long timeout = slow recovery. Every store must check
fencing tokens on the write path (a per-mutation tax, and any store that skips
the check is a hole in the guarantee).

### S3. Network partition between worker and coordinator

(1) Ambiguous state: both sides alive, neither reachable. The worker may keep
executing and try to commit results the coordinator will never accept; the
coordinator may reassign the same work. Neither side can distinguish "peer dead"
from "link dead". This is S2 with the machine still burning CPU.

(2) Minimum mechanism: the lease is enforced on BOTH sides. When the worker
cannot renew, it must stop initiating new effects: pause and buffer results in
its local outbox, or self-terminate. It may NOT keep committing. Coordinator-side
safety is identical to S2 (fencing token). The key adversarial insight: partition
safety comes from fencing, never from detection. No detector can distinguish this
scenario from S2, so any mechanism that depends on the distinction is broken.

(3) Real systems: Raft terms, a partitioned leader's writes are rejected by the
quorum (hashicorp/raft@871f108efbeb26c06636c4b388e18fc698de6f62; etcd-io/raft
inside etcd-io/etcd@b147d754ff7eb459c2c3f68dad6806f92cda2542); STONITH in
Pacemaker/Corosync (fencing by killing the other node); fencing tokens,
canonically described in Kleppmann, *Designing Data-Intensive Applications*,
ch. 8.

(4) Cost: availability loss during partition (the minority side cannot make
progress; CAP in miniature, accepted deliberately); fencing checks on every
write; flapping risk if timeouts are aggressive relative to real network jitter
(Tailscale, the Pig's link, must be measured, not assumed).

### S4. Database unavailable for 10 minutes

(1) Ambiguous state: workers cannot read shared state or record results.
In-flight results held only in memory are lost. On recovery, which writes
happened is unknown, and work done during the outage may have been decided on
stale reads.

(2) Minimum mechanism: local durable outbox. Every result and decision is
appended to a local fsync'd log first; forwarding to the central DB is async.
During the outage workers continue from cached reads (bounded staleness is
explicitly accepted) and buffer writes locally; on recovery, replay the outbox
in order, with idempotency keys (M2) so replay is safe. The buffer is bounded;
when full, the worker stops accepting new work (backpressure, fail closed)
rather than dropping results. Stall beats silent loss.

(3) Real systems: the transactional outbox pattern (Debezium outbox event router,
https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html;
microservices.io pattern); SQLite in WAL mode as the local durable buffer
(https://www.sqlite.org/wal.html); Kafka producer client-side buffering with
retries (apache/kafka@9011238f8cc6f56f0ac6538807c45affad401d44).

(4) Cost: local disk per worker; replay-on-recovery logic (ordering, dedupe);
up to 10 minutes of decisions made on stale reads (the mission must tolerate
bounded staleness or it must halt instead; that is a mission-level policy
choice, not something machinery can decide); backpressure can stall the whole
pipeline, which is the intended behavior.

### S5. Tool server disappears mid-call

(1) Ambiguous state: identical to S1 from the caller's perspective, except the
worker is alive holding no answer. Did the tool execute? Unknown. The tool
server may return having executed, or never return at all.

(2) Minimum mechanism: the same mechanism as S1, no new machinery. Idempotency
key per logical op, timeout, retry with the SAME key. Where the tool exposes a
"did it happen?" query, the adapter may use it as an optimization, but the
safety argument must not depend on it. If the tool server cannot dedupe (dumb
tool), the adapter becomes the dedupe point: it journals key -> result locally,
so a retried call after recovery returns the recorded result instead of
re-executing. The worker being alive adds nothing to the safety case.

(3) Real systems: Stripe idempotency (same key returns the original response);
AWS SDK idempotency tokens; Temporal activity retry under the same activity ID
(temporalio/temporal@543367eec690da3c23e536cf5dfe76928af11b2c).

(4) Cost: adapter-side dedupe cache (storage plus TTL); retry policy tuning,
backoff with jitter, because aggressive retries thundering-herd a recovering
server and turn an outage into a collapse; tools without dedupe force the
adapter to be the system of record for "did it happen", which is a correctness
burden on adapter authors.

### S6. Process hangs (no crash, just stops making progress)

(1) Ambiguous state: the OS reports the process alive; heartbeats may even
continue if the heartbeat thread is separate from the stuck thread. No work
completes. A coordinator waiting on a result waits forever. Killing the process
is safe only if re-execution is safe (it is, via M2).

(2) Minimum mechanism: progress-bearing heartbeats plus lease timeout. Each
heartbeat carries a progress marker (last completed work-unit id, or a monotonic
counter advanced by real forward motion). The coordinator expires the lease when
wall-clock time since last PROGRESS exceeds the bound, not merely time since
last heartbeat: a heartbeat without progress is a liveness lie. On expiry:
fence and reassign (M1), re-execute with the same idempotency key (M2). If the
hung worker ever wakes, its fencing token is stale and its writes fail closed.

(3) Real systems: Temporal activity heartbeats with payload plus heartbeat
timeout (https://docs.temporal.io/activities#activity-heartbeats;
temporalio/temporal@543367eec690da3c23e536cf5dfe76928af11b2c); Kubernetes
liveness probes (the probe checks responsiveness, not mere process existence);
the classical watchdog timer.

(4) Cost: every long task must be instrumented to report progress (developer
burden; genuinely opaque black-box tools get only an external watchdog that
observes side effects, which is weaker); false positives when a task is
legitimately slow, so the bound must exceed p99 of honest execution, and
mis-tuning produces duplicate-execution storms (contained, not prevented, by
M2's idempotency).

### S7. Checkpoint partially written (torn write)

(1) Ambiguous state: the checkpoint file exists but is corrupt or truncated;
on restart you cannot tell which bytes are valid. Trusting it corrupts state;
discarding it loses progress back to the previous checkpoint, or to the journal
head if there is none.

(2) Minimum mechanism: checkpoints are immutable files committed by atomic
rename; records inside are CRC-framed; readers validate and fall back to the
previous checkpoint on CRC failure, then replay the journal to cover the gap.
Never mutate a checkpoint in place; never delete the last-known-good until the
new one validates. The journal (M3) bounds the rework: worst case you redo work
since the last good snapshot, never from scratch.

(3) Real systems: SQLite atomic commit via rollback journal plus fsync
(https://www.sqlite.org/atomiccommit.html); etcd WAL with CRC per record and
torn-tail truncation on replay
(etcd-io/etcd@b147d754ff7eb459c2c3f68dad6806f92cda2542,
`server/storage/wal`); Kafka log record batches carrying CRC
(apache/kafka@9011238f8cc6f56f0ac6538807c45affad401d44).

(4) Cost: double disk write per checkpoint (temp file, fsync, rename, fsync
directory); CRC compute (negligible); retain N-1 snapshots (storage);
recovery time equals snapshot load plus journal replay, so checkpoint interval
trades write cost against recovery time.

### S8. Result arrives twice (duplicate delivery)

(1) Ambiguous state: did the work happen twice, or was one result delivered
twice? The payload alone cannot answer this. Acting on it twice (paying twice,
notifying twice) is the failure.

(2) Minimum mechanism: dedupe at the sink on the idempotency key. Every result
carries (op_id, idempotency_key); the sink holds a dedupe set, or equivalently
a UNIQUE constraint on the key, and drops the second delivery while returning
the recorded outcome. The dedupe window must exceed the maximum plausible
duplicate delay, or duplicates slip through after the window closes.

(3) Real systems: Kafka idempotent producer, broker-side dedupe by PID plus
sequence numbers (KIP-98, apache/kafka@9011238f8cc6f56f0ac6538807c45affad401d44);
Stripe idempotency (repeat key returns the original response, not an error);
Postgres UNIQUE constraint on the idempotency key (the standard application-level
exactly-once-delivery pattern); Temporal `deduplicationId` on signals.

(4) Cost: dedupe storage grows with throughput times window (bounded by TTL);
UNIQUE-constraint contention under high concurrency (fine at mission scale);
window sizing is a real parameter: too short admits duplicates, too long costs
storage. For multi-day missions with human-in-the-loop steps, the window must
cover days, which is an open sizing question (see section 4).

### S9. Old worker wakes after replacement took over (split brain)

(1) Ambiguous state: two workers both believe they own the same task and both
commit results. Last-writer-wins gives a nondeterministic outcome, possibly
with real-world double effects. This is the scenario that kills missions
silently: everything looks healthy, the data is wrong.

(2) Minimum mechanism: fencing tokens. The replacement receives generation
N+1; every state mutation must present the current token; the store rejects
stale tokens. The old worker's writes fail closed. Optionally STONITH the old
worker as hygiene, but fencing alone is sufficient for safety and killing is
only an optimization. Adversarial note: if your safety depends on the kill
succeeding, a failed kill is silent corruption. Fencing fails closed instead.
This is the most important mechanism in the set: it converts "who is alive?"
(unanswerable under partition) into "whose writes count?" (answerable by a
monotonic number).

(3) Real systems: Raft term numbers, stale leaders' writes rejected by the
quorum (hashicorp/raft@871f108efbeb26c06636c4b388e18fc698de6f62);
ZooKeeper session expiry invalidating ephemeral ownership
(apache/zookeeper@b9818714f4790347c27f37fd49739a91b46c8e5e); Chubby lock
sequence numbers (Burrows 2006); STONITH/Pacemaker for the kill side;
the pattern's canonical description in Kleppmann, DDIA ch. 8.

(4) Cost: token check on every mutation (one comparison against the stored
generation; cheap but pervasive, and any store that skips the check punches a
hole in the guarantee, so coverage must be total); the generation counter must
be monotonic across coordinator failover, which means it lives in the journal
(M3); a fenced worker that never checks may burn resources doing useless work
until its next heartbeat response carries the new generation (mitigation:
generation is returned on every heartbeat reply, and the worker self-fences on
mismatch).

### S10. Coordinator dies while workers live

(1) Ambiguous state: workers hold in-flight results with nowhere to send them.
A new coordinator does not know what was assigned, what completed, or which
leases were outstanding. If it guesses, it double-assigns or loses work.

(2) Minimum mechanism: the coordinator journals every decision (assignment,
lease grant, fencing generation bump) to durable storage BEFORE acting (M3);
the coordinator itself is stateless and all state lives in the journal. Workers
buffer results in their local outbox and re-register with the new coordinator,
presenting (worker_id, last known generation, outbox contents). The new
coordinator replays the journal to reconstruct the lease table, then adopts or
fences each worker. Rule with no exceptions: no in-memory-only decisions, ever.

(3) Real systems: Kubernetes API servers stateless over etcd
(kubernetes/kubernetes@2db33713681c8a788cea756b93cba78df83531fa); YARN
ResourceManager HA with a ZooKeeper state store; Temporal history service
backed by a durable store with stateless frontends
(temporalio/temporal@543367eec690da3c23e536cf5dfe76928af11b2c); Erlang
supervisor trees (supervisors hold no task state; workers are restartable).

(4) Cost: a journal write on the coordinator's critical path (fsync per
decision; batch where the workload allows); re-registration storms when a
coordinator restarts (jitter the rejoin); and the one place this minimal set
leans on an external primitive: two coordinators alive at once (coordinator
partition) needs leader election, which is availability machinery, not survival
machinery, and is deliberately excluded (see section 3 and open question 1).

---

## 2. Minimum survival set

Four mechanisms. Each is justified by the scenarios it covers; none is
redundant; removing any one re-opens at least one scenario. M3 (the journal)
is the foundation the other three stand on.

### M1 FENCED-LEASE
| field | value |
|---|---|
| MECHANISM_ID | M1 FENCED-LEASE |
| PROBLEM | Ownership of a work item is ambiguous after any failure that silences a worker; two claimants (dead/partitioned/hung worker vs. replacement) can both act. |
| SCENARIOS_COVERED | S2 (machine disappears), S3 (partition), S6 (hang, via progress-bearing heartbeats), S9 (split brain / old worker wakes), S10 (worker side: re-registration adopts or fences) |
| SOURCE | Chubby leases + lock sequence numbers (Burrows, OSDI 2006); Raft terms (hashicorp/raft); ZooKeeper sessions + ephemeral znodes (apache/zookeeper); fencing token pattern (Kleppmann, DDIA ch. 8) |
| PINNED_SHA | 871f108efbeb26c06636c4b388e18fc698de6f62 (hashicorp/raft); b9818714f4790347c27f37fd49739a91b46c8e5e (apache/zookeeper) |
| SOURCE_LOCATION | hashicorp/raft: term comparison on AppendEntries/RequestVote handling (raft.go, follower.go); zookeeper: session expiry -> ephemeral znode deletion (ZooKeeperServer/SessionTracker); DDIA ch. 8 "fencing tokens" |
| MATURITY | Production, decades. Chubby (2006), ZooKeeper (2008), Raft (2014) all ship this in critical infrastructure. |
| INVARIANT | No state mutation is accepted without the currently valid fencing token (lease_id + monotonic generation). A worker that cannot renew its lease within the timeout MUST stop initiating effects. |
| IMPLEMENTATION | Coordinator grants lease = (worker_id, task_id, generation, deadline). Worker heartbeats carry a progress marker; coordinator extends the deadline only on progress. Every mutation RPC/store write carries the token; stores compare-and-reject stale generations. Generation is returned on every heartbeat reply; worker self-fences on mismatch. On coordinator recovery, journal replay rebuilds the lease table; workers re-register with (worker_id, last generation) and are adopted or fenced. Enforced on both sides: coordinator expiry -> reassign + bump generation; worker-side renewal failure -> pause/outbox or self-terminate. |
| FAILURE_MODE | If any store skips the token check, the guarantee has a hole (coverage must be total; audit this). If the generation counter is not monotonic across coordinator failover (not journaled), a new coordinator can issue a LOWER generation and un-fence the old worker. If timeouts are shorter than real network jitter, flapping reassignments (contained by M2). |
| PING_EXISTING_ANALOG | None known. PING's event plane records observations; no lease or fencing concept exists. |
| GAP | Total: PING has no ownership primitive for work items. Harvest priority: highest. |
| HARVEST_CLASS | PROTOCOL |
| FALSIFICATION | Chaos: SIGKILL a worker mid-task; assert the replacement completes the task and every write attempted by the old worker after fencing is rejected (count rejected writes > 0, count accepted stale writes = 0). Partition with iptables; assert the partitioned worker stops committing within one lease timeout and its buffered results are adopted, not double-applied, on heal. Hang injection (SIGSTOP the worker threads but not the heartbeat thread); assert the coordinator expires on progress-timeout, not heartbeat-timeout. |
| DEPENDENCIES | M3 (generation counter and lease table must survive coordinator failover; both are journaled) |

### M2 IDEMPOTENCY-KEY
| field | value |
|---|---|
| MECHANISM_ID | M2 IDEMPOTENCY-KEY |
| PROBLEM | After a worker or tool-server failure, it is unknowable whether an effectful call executed. Blind retry double-applies; refusing to retry loses the effect. |
| SCENARIOS_COVERED | S1 (SIGKILL mid-tool-call), S5 (tool server disappears mid-call), S8 (duplicate delivery) |
| SOURCE | Stripe API idempotency-key contract; AWS EC2 ClientToken; ARIES write-ahead discipline (Mohan et al., IBM 1992); Temporal deduplicationId |
| PINNED_SHA | 543367eec690da3c23e536cf5dfe76928af11b2c (temporalio/temporal) |
| SOURCE_LOCATION | https://docs.stripe.com/api/idempotent_requests (contract spec); temporal request-ID dedup on signal/start paths |
| MATURITY | Production, decades. Stripe has run this as a public API contract since 2014; ARIES since 1992. |
| INVARIANT | Every effectful operation carries a client-generated idempotency key deterministic in the LOGICAL operation (mission + task + op sequence), never in the attempt. Re-execution with the same key is always safe; re-execution with a new key is a new operation. |
| IMPLEMENTATION | Worker journals intent (op_id, idempotency_key, args) BEFORE executing (write-ahead). Tool adapters send the key; servers/sinks dedupe on it within a retention window and return the recorded outcome on repeat. For tools that cannot dedupe, the adapter journals key -> result locally and short-circuits repeats. Sinks enforce a UNIQUE constraint on the key (or an equivalent dedupe set) so duplicate deliveries collapse to one application. Key derivation is a pure function of (mission_id, task_id, op_seq); "user said try again" creates a new op_seq, never a reused key. |
| FAILURE_MODE | If the intent is not journaled BEFORE the call (key generated but process dies before the journal fsync), the replacement derives a DIFFERENT key for the same logical op and the effect applies twice: the write-ahead ordering is load-bearing, not advisory. If the dedupe window is shorter than the maximum duplicate delay, late duplicates slip through. If a human reuses a key for a genuinely new operation, the new op is swallowed (key discipline must be enforced in code, not convention). |
| PING_EXISTING_ANALOG | Partial: the tandem pipeline has a duplicate-emission guard (per AGENTS.md antifragility machinery). Best effort: that guard is at the emission layer; M2 requires the key at the tool-call layer, which PING does not have. |
| GAP | PING has no idempotency-key contract on tool calls and no adapter-level dedupe. Harvest priority: highest, paired with M1. |
| HARVEST_CLASS | PATTERN |
| FALSIFICATION | Chaos: SIGKILL the worker in the window between intent-journal and result-journal, repeatedly, against a test tool that counts real side effects; assert side-effect count == 1 per logical op across 100 kills. Deliver the same result three times to a sink; assert single application. Vary the kill point (before journal, after journal before call, during call, after call before result journal) and assert exactly-once effect in all four. |
| DEPENDENCIES | M3 (the intent journal; without write-ahead the key derivation is not crash-safe). M4's file discipline for the adapter's local key->result cache file. |

### M3 DURABLE-JOURNAL
| field | value |
|---|---|
| MECHANISM_ID | M3 DURABLE-JOURNAL |
| PROBLEM | Coordinator decisions and worker results held only in memory vanish on crash; a restarted coordinator cannot reconstruct what was assigned/completed; a downstream outage (DB down) strands in-flight results. |
| SCENARIOS_COVERED | S4 (DB unavailable 10 min, via local outbox + replay), S10 (coordinator dies; journal replay reconstructs state), supports S1/S7 (intent log; replay bound for torn snapshots) |
| SOURCE | ARIES (Mohan et al., IBM 1992); etcd WAL with CRC per record and torn-tail truncation; transactional outbox pattern (Debezium); SQLite WAL mode |
| PINNED_SHA | b147d754ff7eb459c2c3f68dad6806f92cda2542 (etcd-io/etcd) |
| SOURCE_LOCATION | etcd-io/etcd `server/storage/wal` (record framing, CRC, replay truncation); https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html; https://www.sqlite.org/wal.html; https://www.sqlite.org/atomiccommit.html |
| MATURITY | Production, decades. WAL is the oldest surviving idea in this set (ARIES 1992, SQLite, etcd, Kafka all independent implementations). |
| INVARIANT | No coordinator decision takes effect before it is journaled and fsync'd. No worker result is considered sent until it is in the local outbox. Replay of the journal from the last good snapshot reproduces state exactly. |
| IMPLEMENTATION | Single append-only log per coordinator (SQLite table or framed file, fsync per batch). Coordinator path: journal decision -> act. Worker path: journal result to local outbox -> forward to coordinator/DB async. When the central store is unreachable, workers continue on cached reads (bounded staleness is explicit mission policy) and buffer writes; outbox is bounded, and a full outbox applies backpressure (stop accepting work, fail closed). On recovery: truncate torn tail at last valid CRC, replay in order, re-forward with M2 keys. Snapshots (M4) bound replay length. |
| FAILURE_MODE | The journal's disk is the single point of total failure: if fsync lies (consumer SSDs, some VM layers) or the disk dies with no replica, every mechanism above collapses. Mitigation is replication of the journal file (even rsync-class async copy beats nothing), not more machinery. Unbounded journal growth stalls recovery; needs a snapshot/compaction policy (open question 5). A coordinator that acts BEFORE journaling (optimization temptation) silently voids S10. |
| PING_EXISTING_ANALOG | Partial: PING's event/evidence plane is an append-only event record, and the outreach run ledger (runs.jsonl) is journal-adjacent. Best effort: it is unknown whether PING's event writes are fsync'd, ordered, or replayable for crash recovery; the tandem pipeline's "atomic writes at durable boundaries" suggests the file discipline exists in places. |
| GAP | PING needs the journal promoted from "event record" to "system of record for coordinator decisions": fsync discipline, torn-tail truncation on replay, and a re-registration protocol for workers after coordinator restart. |
| HARVEST_CLASS | ALGORITHM |
| FALSIFICATION | Chaos: kill -9 the coordinator mid-decision-burst; restart; assert the reconstructed lease/assignment table is bit-identical to the pre-crash journal prefix (hash comparison). Blackhole the DB port for 10 minutes under load; assert zero result loss, ordered replay, and no duplicate application downstream. Fault-inject a torn tail (truncate the journal file mid-record); assert replay truncates cleanly and recovers. Verify fsync honesty on the actual disks with a torn-write test before trusting any of this. |
| DEPENDENCIES | None (foundation). Uses the same atomic file-commit discipline as M4 for its own segment files; OS fsync that actually persists. |

### M4 ATOMIC-SNAPSHOT
| field | value |
|---|---|
| MECHANISM_ID | M4 ATOMIC-SNAPSHOT |
| PROBLEM | A checkpoint file interrupted mid-write is corrupt in an unknowable way; trusting it corrupts state, discarding it loses unbounded progress. |
| SCENARIOS_COVERED | S7 (torn checkpoint write) |
| SOURCE | SQLite atomic commit (rollback journal + fsync + rename); etcd WAL CRC framing; Kafka record-batch CRC |
| PINNED_SHA | b147d754ff7eb459c2c3f68dad6806f92cda2542 (etcd-io/etcd) |
| SOURCE_LOCATION | https://www.sqlite.org/atomiccommit.html (the canonical 7-step atomic commit); etcd `server/storage/wal` record CRC; Kafka log record batch CRC |
| MATURITY | Production, decades. The write-tmp/fsync/rename pattern predates all of us. |
| INVARIANT | A snapshot is either fully valid or treated as absent. The previous good snapshot is never destroyed until the new one validates. |
| IMPLEMENTATION | Write snapshot to temp file in the same directory; fsync file; fsync directory; atomic rename over the target; CRC-frame records inside. Reader: verify CRC; on failure, fall back to the previous snapshot (retain N-1) and replay M3's journal from that snapshot's marker to cover the gap. Never mutate a snapshot in place. |
| FAILURE_MODE | Forgetting the directory fsync (rename itself can be lost on crash; the classic bug). CRC that covers the wrong byte range (frame must include length + payload). Validating the snapshot but replaying the journal from the WRONG marker (marker must be inside the validated snapshot, written before the snapshot completes). |
| PING_EXISTING_ANALOG | Partial: AGENTS.md notes "atomic writes protect every durable boundary" in the tandem pipeline. Best effort: suggests the rename discipline exists; CRC validation and last-good retention are unconfirmed. |
| GAP | Confirm CRC framing + keep-last-good + journal-marker discipline on PING's snapshot/checkpoint paths; add where missing. Smallest harvest in the set. |
| HARVEST_CLASS | PATTERN |
| FALSIFICATION | Chaos: fault-inject crashes at 0%, 25%, 50%, 75%, 100% of snapshot write; on restart assert the reader either loads the new snapshot (100% case) or falls back to the previous one plus journal replay, and assert final state hash equals the uninterrupted run's hash in every case. |
| DEPENDENCIES | M3 (journal replay from the last good snapshot covers the gap; without the journal, a torn snapshot means redo-from-scratch) |

### Coverage matrix (scenario -> mechanisms)

| Scenario | M1 FENCED-LEASE | M2 IDEMPOTENCY-KEY | M3 DURABLE-JOURNAL | M4 ATOMIC-SNAPSHOT |
|---|---|---|---|---|
| S1 SIGKILL mid-call | | X (safe re-execution) | X (intent journal) | |
| S2 machine disappears | X (expiry, reassign, fence) | | | |
| S3 partition | X (both-sides enforcement) | | | |
| S4 DB down 10 min | | X (replay-safe forwarding) | X (local outbox) | |
| S5 tool server dies | | X | X (intent journal) | |
| S6 hang | X (progress heartbeat timeout) | X (safe re-execution after fence) | | |
| S7 torn checkpoint | | | X (replay bound) | X |
| S8 duplicate delivery | | X (sink dedupe) | | |
| S9 split brain | X (stale token rejected) | | X (monotonic generation) | |
| S10 coordinator dies | X (re-registration adopts/fences) | | X (replay reconstructs state) | |

Every scenario is covered; every mechanism covers at least two scenarios
(M4 covers one scenario directly but its file discipline underpins M2/M3's
durable files; it is retained because S7 has no other answer).

---

## 3. Deliberately excluded (and why)

- **Kubernetes / Nomad / heavy orchestrators.** Excluded by the task's own
constraint, and unnecessary: the four mechanisms above are implementable with
SQLite, the filesystem, and a few hundred lines of code. An orchestrator would
re-implement M1 badly (pod eviction is not fencing) while adding a control plane
that itself needs all four mechanisms.
- **Raft/Paxos consensus for the coordinator.** Excluded: a single journaled
coordinator with crash recovery survives coordinator death (S10). Consensus
buys *availability during* coordinator failure (failover in seconds instead of
a restart), not survival. Cost (3+ nodes, leader election, log replication)
exceeds the survival requirement. The one honest hole this leaves is two
coordinators alive at once; see open question 1.
- **Two-phase commit / distributed transactions.** Excluded: M2's idempotency
keys plus M3's journal give the needed exactly-once-effect guarantee without a
transaction manager, at far lower implementation cost and without the blocking
failure modes of 2PC under partition.
- **CRDTs / vector clocks / merge semantics.** Excluded: missions need
single-writer-per-task semantics (enforced by M1 fencing), not concurrent-merge
semantics. Merge machinery answers a question the mission does not ask.
- **STONITH (kill-based fencing) as a safety mechanism.** Excluded as a
*correctness* requirement: fencing tokens (M1) fail closed even when the kill
fails, the network drops the kill command, or the old worker ignores it.
Killing remains useful hygiene (reclaim resources, stop useless work) but the
safety case must never depend on it. Adversarial rule: any safety argument
containing "and then we kill it" is void if the kill can fail.
- **Heartbeat-only liveness (no progress marker).** Excluded as insufficient:
folded the progress requirement into M1, because a heartbeat without progress
is exactly how S6 evades detection.
- **Local watchdog thread as a separate mechanism.** Folded into M1's
both-sides lease enforcement; a standalone watchdog that kills hung threads
without fencing the worker's outstanding tokens would create S9, not fix S6.
- **Checkpoint-everything / full state replication.** Excluded on cost:
M3's journal plus M4's snapshots bound recovery work without replicating all
state on every step.
- **Exactly-once delivery at the transport layer.** Excluded as impossible in
general (the Two Generals problem); M2 achieves exactly-once *effect*, which is
what the mission needs, while the transport stays at-least-once.

## 4. Open questions

1. **Coordinator-level split brain.** Two coordinators alive simultaneously
(coordinator-side partition) both issue generations. The minimal fix is a
single compare-and-swap register holding the coordinator generation (one row,
one conditional write, on shared storage) that each coordinator must win
before issuing fencing tokens: a fencing-token service for the coordinator
itself. Open: what is the cheapest durable CAS register available to PING,
and is coordinator HA worth even that?
2. **Dedupe window sizing for long missions.** S8's window must exceed the
maximum plausible duplicate delay. With human-in-the-loop steps, duplicates can
arrive days late. Open: size the window by mission phase, or make the dedupe
set permanent for terminal effects (payments, messages sent) and windowed for
idempotent reads?
3. **Op identity policy.** M2's key derivation needs a crisp rule for "same
logical op" vs. "deliberate new attempt" when a human says "try again."
Open: who mints the new op_seq, and where is that decision journaled so two
operators cannot mint the same retry twice?
4. **Liveness signals for black-box tools.** S6's progress marker assumes the
task can report progress. For opaque tool calls the only signals are
wall-clock timeout and observed side effects. Open: is conservative-timeout
plus M2 sufficient in practice, or do long black-box calls need an
out-of-band progress channel in the adapter contract?
5. **Journal compaction policy.** M3's journal grows without bound on a
multi-day mission; truncation requires knowing every consumer is past the
truncation point. Open: what is the minimal "all consumers past X" tracking,
and who is allowed to compact? (This is itself a small consensus problem;
snapshot + marker + single compactor is the likely minimal answer.)
6. **Clock and timeout calibration.** M1's timeouts assume monotonic local
clocks and known network jitter. Open: measure the Pig's real heartbeat RTT
distribution (Tailscale, Wi-Fi, sleep/wake) before setting any timeout; a
timeout tuned on localhost will flap in production.
7. **fsync honesty.** Everything above rests on the OS and disk actually
persisting on fsync. Consumer SSDs, virtualization layers, and some cloud
volumes have lied about this historically. Open: run a torn-write chaos test
against the real disks (Pig and sandbox) before trusting M3/M4; this is a
30-minute test that underwrites the entire set.
