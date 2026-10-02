# PING Autonomy Grand Challenge: Mechanism Harvest Index

Research-only pre-pass. Merges named mechanisms from all Wave 1 lane reports into one deduped, theme-grouped index. No evaluation against FYD failure classes (that is the mapper's job). No philosophy.

- **Source files:** `~/workspace/ping-autonomy-challenge/lanes/LANE-*.md` (skipped: `_received/` subdir)
- **Lanes read:** 15 (LANE-1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18)
- **Mechanisms found:** 253 named mechanisms + findings
- **Merged index entries:** 119 (see theme sections below)
- **Harvest-class vocabulary varies by lane.** Lanes use DIRECT_REUSE, ADAPT, PATTERN_ONLY, REJECT plus lane-local terms: SPEC, PATTERN, CONTRACT, ANTI-PATTERN, COMPONENT, MIRROR, ADOPT, STUDY, WATCH, INSPIRE/INSPIRED, PROTOCOL, ALGORITHM, REPURPOSE, DIRECT. Reported verbatim below.

## Convergence signals (claimed by 3+ independent lanes)

These are the mechanisms multiple lanes discovered independently. Strongest consensus first.

1. **Append-only journal as source of truth + deterministic replay** (7 lanes: 2, 3, 4, 5, 8, 12, 13). Journal commands + completions, replay replays recorded results, resume from last outcome.
2. **Idempotency keys, client-generated, server-side response cache** (5 lanes: 5, 12, 13, 16, 18). Key per logical effect; same key returns stored result; same key + different payload is an error; keys expire.
3. **Content-derived logical identity** (5 lanes: 1, 4, 5, 12, 16). Workflow/objective/run identity = stable hash of logical intent or caller-supplied reuse key; restarts rediscover, never duplicate.
4. **Atomic checkpoint / snapshot payload** (5 lanes: 2, 3, 4, 7, 13). Snapshot fully valid or treated as absent; checkpoint payload covers state + versions + pending metadata; checkpoint/resume round-trips decision state.
5. **Bounded retry with jitter + declarative retry policies** (5 lanes: 2, 4, 5, 16, 17). Backoff with jitter, permanent-error classes never retried, distinct failure signatures map to distinct policies.
6. **Cancellation model (cancel vs kill)** (6 lanes: 1, 2, 3, 4, 5, 9). Cooperative cancellation as a first-class control message, kill as the sharp tool, durable cancellation signal surviving restart. (Disagreement on lease-expiry behavior, see notes.)
7. **Compare-and-set claims / conditional writes** (4 lanes: 1, 16, 17, 18). Claim succeeds only if current state matches expected; rescue/requeue writes condition on read-time state.
8. **Finite retry and compute budgets, externally metered** (3 lanes: 1, 3, 18). Independent run bounds (turns, spend, tokens); exhaustion is terminal; budget survives restart.
9. **Fencing tokens / fenced leases** (3 lanes: 12, 13, 18). Monotonic token issued with each lease grant; every mutation presents the token; stale tokens rejected at the store.
10. **Reconciliation loops (level-triggered)** (3 lanes: 1, 12, 16). Classify observed vs desired before any new dispatch; reconcile function is pure and safely repeatable.
11. **Context compaction** (3 lanes: 2, 3, 14). Clear tool results before summarizing; condenser strategies as pure functions; PreCompact gate; summary stays in the durable log.
12. **Approval-gated tool execution** (3 lanes: 2, 3, 11). Approvals bind to canonical invocation identity; deny-first evaluation; approval verdict is recorded metadata.
13. **Subagent supervision and lifecycle** (3 lanes: 3, 4, 16). Structured supervisor with fan-out interrupt, lifecycle frames, child close policy, unique agent paths.

## Disagreement notes (consolidated)

- **D1. Advisory-lock scope.** LANE-1 M-4 pins a session-level advisory lock on a dedicated client (lock lives as long as the session). LANE-12 M12 recommends `pg_try_advisory_xact_lock` (transaction-scoped, tied to claim write). Session scope is for coordinator ownership; xact scope is for work-item claims. Same tool, different lifetimes.
- **D2. Lease expiry behavior.** LANE-13 M1: a worker that cannot renew MUST stop initiating effects (self-fence, fail closed). LANE-4 M-9 (Temporal disconnected context): an activity may continue gracefully after cancel in a disconnected context. Fail-closed vs graceful-continue are opposed defaults.
- **D3. "Keep going" philosophy.** LANE-18 F3 argues routing around blockers is itself a failure mode (stale workers, infinite retry, duplicate missions) and demands first-class productive stopping. LANE-1 M-7 and the general recovery orientation bias toward classify-and-continue. Tension on whether the default is recovery or stopping.
- **D4. Decomposition loss.** LANE-18 F2: decomposition itself destroys meaning no coordinator can recover. LANE-8 M-03: explicit task context dependencies with bounded aggregation make fan-in lossless. Lane 8 claims structure solves it; lane 18 says the loss site is prior to coordination.
- **D5. Summarizer vs masking.** LANE-14 M6 holds that cheap deterministic masking beats smart summarization on total cost-to-outcome (the evaluation baseline), while M8 reports RL-trained summarization as a separate mechanism. The lane resolves it by requiring any summarizer to beat the masking baseline.
- **D6. In-flight ledger gap.** LANE-3 M-CC-05 documents that Claude Code has no record between tool dispatch and result (admitted gap). LANE-1 M-3/M-7 assert record-before-dispatch closes exactly this window. Gap/fix relationship across lanes.
- **D7. Lock scope.** LANE-1 M-28 REJECTs any MCP control plane for the internal coordinator; LANE-9's suite harvests MCP mechanisms for the external tool protocol. Scope separation, not conflict: internal control plane vs external tool wire.
- **D8. Bare leases.** LANE-12 M10: never use a bare lease for correctness, always pair with fencing. LANE-17 M11 lists leases among admission controls (pools, quotas, leases) for liveness/admission. Different jobs: correctness ownership vs capacity gating.

---

## A. Identity / idempotency

### A1. Content-derived logical identity (objective / workflow / run)
- **Source lanes:** LANE-1 (M-1, M-2), LANE-4 (M-4), LANE-5 (REST-WORKFLOW-RUNONCE), LANE-12 (M14), LANE-16 (M7), LANE-2 (OA-04)
- **Pinned SHAs:** `c9247b5d37a0969c` (LANE-1 objective-runtime.js, workspace); Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; DBOS `84715a363331` (LANE-16)
- **Invariant:** identity = stable hash of logical intent (or a caller-supplied reuse key bound to the workflow id); no PID, clock, run id, or attempt number enters the identity; restart rediscovers the same record instead of minting a duplicate.
- **Harvest class:** DIRECT_REUSE (LANE-1 M-1/M-2), ADOPT (LANE-4 M-4), PATTERN (LANE-12 M14), ADAPT (LANE-16 M7, LANE-2 OA-04)

### A2. Client-generated idempotency keys + server-side response cache
- **Source lanes:** LANE-12 (M1), LANE-13 (M2), LANE-5 (REST-IDEMPOTENCY-KEY), LANE-16 (M11), LANE-18 (ranked invariant 4)
- **Pinned SHAs:** Stripe model docs (LANE-12, no SHA); temporalio/temporal `543367eec690da3c23e536cf5dfe76928af11b2c` (LANE-13); fiber `cc0c16a973d0` (LANE-16)
- **Invariant:** key is deterministic in the LOGICAL operation (never the attempt); retry with the same key returns the stored result without re-executing; same key with different payload is a client error; keys expire and are scoped.
- **Harvest class:** CONTRACT + PATTERN (LANE-12), PATTERN (LANE-13), ADAPT (LANE-16), candidate invariant (LANE-18). LANE-18 variant: separate the *intent key* from the *payload hash*, intent key decided before payload generation.

### A3. Idempotency-key leasing with recovery points (forward recovery)
- **Source lanes:** LANE-12 (M2)
- **Pinned SHAs:** Brandur Leach blog (verified live 2026-09-23, no SHA)
- **Invariant:** a retry claims the key, reads the recovery point, and executes only the remaining phases; a concurrent retry while locked gets 409; a completer drives unfinished keys to completion; a reaper deletes keys past retention.
- **Harvest class:** PATTERN (LANE-12)

### A4. Invocation deduplication by invocation ID (ingress)
- **Source lanes:** LANE-5 (REST-DEDUP-INGRESS)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** duplicate invocations with the same invocation id attach to the in-flight or completed invocation instead of starting a duplicate.
- **Harvest class:** (lane 5 pattern vocabulary, journal family)

### A5. Bounded dedup windows + dedup work queue
- **Source lanes:** LANE-12 (M6), LANE-16 (M3)
- **Pinned SHAs:** nats-server `375492dca0ed1b2e08dde1d4814662c33a34303a` (LANE-12); kubernetes/client-go `c67c78051a4a` (LANE-16)
- **Invariant:** within the window W, same ID means same outcome; outside the window the ID may be accepted again; every dedup mechanism documents W with the contract W >= max retry age + skew + margin. Queue variant: dirty/processing/delaying-heap sets dedupe requeues with delayed, rate-limited requeue.
- **Harvest class:** CONTRACT (LANE-12), ADAPT (LANE-16)

### A6. Attempt / derived sub-identities + invocation-bound approvals
- **Source lanes:** LANE-1 (M-3), LANE-7 (M6), LANE-2 (OA-02)
- **Pinned SHAs:** `4abc75ee506c1ead` (LANE-1 orca_control_loop.js v2, workspace); LangGraph docs (LANE-7); openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` (LANE-2)
- **Invariant:** `attempt_id = workOrderId + '-attempt-' + N`; deterministic task ids are derived, never minted per retry; an approval decision binds to a canonical tool-invocation identity (call id + lookup key + scope + fingerprint), not to list position.
- **Harvest class:** ADAPT (LANE-1), PATTERN_ONLY (LANE-7), ADAPT (LANE-2)

### A7. Time-sortable unique run identifiers
- **Source lanes:** LANE-16 (M9)
- **Pinned SHAs:** segmentio/ksuid `d33724947fcf`
- **Invariant:** uniqueness from 16 random bytes (no coordinator, no sequence contention); sortability from an embedded timestamp prefix.
- **Harvest class:** PATTERN_ONLY (LANE-16). Note D7 anti-synthesis boundary: LANE-11 M8 forbids inventing *conversation* ids; minting fresh *run* ids is the complementary case.

### A8. Journaled service-to-service calls ("no duplicates")
- **Source lanes:** LANE-5 (REST-EO-RPC)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** outbound service calls go through the journaled path; replay reuses the recorded result instead of re-invoking the downstream service.
- **Harvest class:** (lane 5 journal family)

---

## B. Durability / journals

### B1. Append-only journal as source of truth + deterministic replay
- **Source lanes:** LANE-12 (M3), LANE-13 (M3), LANE-5 (REST-JOURNAL, REST-REPLAY, REST-RECOVERY), LANE-4 (M-1), LANE-8 (M-04), LANE-2 (CX-01), LANE-3 (M-CC-16)
- **Pinned SHAs:** Akka `ce003c7cb20f88c3aaceb1ee3b4dc85121af2b71`; Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; etcd `b147d754ff7eb459c2c3f68dad6806f92cda2542`; Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`; codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** every externally-observable step is recorded as a journal entry (command + completion, sequential indices); state is derived by replay, never the primary record; replay replays recorded results, never re-derives them; recovery = replay + resume-from-last-outcome. Codex variant: the rollout log is the source of truth, every resume rebuilds from it.
- **Harvest class:** PATTERN (LANE-12), ALGORITHM (LANE-13), ADAPT (LANE-4), STUDY (LANE-8), DIRECT_REUSE (LANE-2 CX-01), DIRECT_REUSE (LANE-3 M-CC-16). Falsification note from LANE-5: the journal records *results*, not *effects*; an entry whose command executed outside but whose completion never landed is indistinguishable from never-ran.

### B2. Replay command/history mismatch detection (nondeterminism tripwire)
- **Source lanes:** LANE-4 (M-2)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** on replay, if the code issues a different command sequence than the recorded history, execution fails loudly (nondeterminism detected) instead of silently diverging.
- **Harvest class:** ADAPT (LANE-4)

### B3. Atomic checkpoint / snapshot payload
- **Source lanes:** LANE-13 (M4), LANE-7 (M2, M12), LANE-3 (M-CC-15), LANE-2 (OA-01), LANE-4 (M-10)
- **Pinned SHAs:** etcd `b147d754ff7eb459c2c3f68dad6806f92cda2542`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** a snapshot is either fully valid or treated as absent; the previous good snapshot is never destroyed until the new one validates; the checkpoint payload covers state, versions, and pending metadata so a serialized snapshot round-trips enough decision state to resume without re-running completed work. Continue-as-new variant: bound history by chaining runs.
- **Harvest class:** PATTERN (LANE-13), ADAPT (LANE-7, LANE-3, LANE-2 OA-01, LANE-4)

### B4. Atomic durable writes (temp-file + rename)
- **Source lanes:** LANE-1 (M-5)
- **Pinned SHAs:** `c9247b5d37a0969c` (objective-runtime.js, workspace)
- **Invariant:** every durable write is temp-file + rename in the same directory; a crash can only ever leave the previous complete record or nothing, never a torn file.
- **Harvest class:** DIRECT_REUSE (LANE-1)

### B5. Record-once nondeterminism (SideEffect)
- **Source lanes:** LANE-4 (M-13)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** nondeterministic values (random, time, UUID) are computed once, recorded in the history, and replayed on retry instead of recomputed.
- **Harvest class:** STUDY (LANE-4)

### B6. Pending-writes table (write-ahead of the checkpoint)
- **Source lanes:** LANE-7 (M4)
- **Pinned SHAs:** LangGraph docs (no SHA; source-read)
- **Invariant:** writes are staged in a pending-writes table ahead of the checkpoint commit, so a crash between write and checkpoint leaves a recoverable write-ahead record.
- **Harvest class:** ADAPT (LANE-7). Related to B7 (outbox) and B1 (journal).

### B7. Transactional outbox (dual-write elimination)
- **Source lanes:** LANE-12 (M4)
- **Pinned SHAs:** Debezium EventRouter `8230409091512bd991f6baa6f59ad69563243e96`
- **Invariant:** the domain write and the intent-to-publish commit atomically in one transaction; a separate relay forwards outbox rows; once committed, an event cannot be lost, only delayed; downstream delivery is at-least-once.
- **Harvest class:** PATTERN + COMPONENT (LANE-12)

### B8. Inbox pattern (idempotent consumer)
- **Source lanes:** LANE-12 (M5)
- **Pinned SHAs:** none specific (pattern-level)
- **Invariant:** every event consumer keeps a processed-ID table in its own transaction (or proves natural idempotence); each message ID is applied at most once per consumer even under redelivery or failover.
- **Harvest class:** PATTERN (LANE-12). Pairs with B7 for exactly-once effect.

### B9. At-least-once delivery + idempotent application
- **Source lanes:** LANE-12 (M15), LANE-5 (REST-DEDUP-TRANSPORT)
- **Pinned SHAs:** Akka `ce003c7cb20f88c3aaceb1ee3b4dc85121af2b71`; Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** journal intent, then send, then confirm, then journal confirmation; unconfirmed messages are redelivered, never silently dropped; receiver-side dedup by delivery id converts to exactly-once effect; redelivery caps with dead-lettering.
- **Harvest class:** PATTERN (LANE-12)

---
## C. Leases / locks

### C1. Fencing tokens / fenced leases
- **Source lanes:** LANE-13 (M1), LANE-12 (M10, M11), LANE-18 (ranked invariant 3)
- **Pinned SHAs:** hashicorp/raft `871f108efbeb26c06636c4b388e18fc698de6f62`; apache/zookeeper `b9818714f4790347c27f37fd49739a91b46c8e5e`; holdfast `57c6482068bac4c7786f8f32c9c1378e70aa6be4` (LANE-12)
- **Invariant:** the lock service issues a strictly monotonically increasing token with each grant; the client includes the token on every mutation; the resource tracks the highest token accepted per key and rejects any mutation with a lower token, atomically with the mutation. A worker that cannot renew within the timeout MUST stop initiating effects; generation is returned on every heartbeat reply and the worker self-fences on mismatch.
- **Harvest class:** PROTOCOL (LANE-13), PATTERN (LANE-12 M10), PATTERN + CONTRACT (LANE-12 M11), candidate invariant (LANE-18). Coverage must be total: if any store skips the token check, the guarantee has a hole; the generation counter must be journaled across coordinator failover. See D2.

### C2. Advisory locks (single-node arbitration)
- **Source lanes:** LANE-1 (M-4), LANE-12 (M12)
- **Pinned SHAs:** `c9247b5d37a0969c` (objective-runtime.js, workspace); PostgreSQL docs (LANE-12, vendor docs verified live)
- **Invariant:** exactly one live owner per key, at most one holder within the database; automatic release on session death (no orphaned locks from crashed workers). LANE-1 variant: PostgreSQL session-level advisory lock on a dedicated client (never a pool) for coordinator ownership; crash safety from the DB releasing the lock when the holder's session drops, never from PID probing.
- **Harvest class:** DIRECT_REUSE (LANE-1), COMPONENT (if Postgres-backed) / PATTERN (LANE-12). See D1 (session vs xact scope).

### C3. Owner-token-checked distributed mutex
- **Source lanes:** LANE-16 (M6)
- **Pinned SHAs:** go-redsync/redsync `9415a4e04f93`
- **Invariant:** lock acquisition writes a random owner token with a TTL across N Redis instances and requires quorum; only the token owner may release or extend.
- **Harvest class:** ADAPT (LANE-16). Related to C2 (advisory locks) for cross-host arbitration without Postgres.

### C4. Compare-and-set claims / conditional writes
- **Source lanes:** LANE-1 (M-13), LANE-16 (M1), LANE-18 (ranked invariant 3), LANE-17 (M14)
- **Pinned SHAs:** n/a (LANE-1 trace doc); riverqueue/river `7931f7d161cc50d17901c6c972be5a6ea4c0cc86` (LANE-16)
- **Invariant:** a claim or rescue write applies only when the current state still matches the expected precondition (e.g. `WHERE status='created'` with a 60s lease for concurrent claims; rescue UPDATE applies only when the row is still `running` AND its attempted_at is still older than the captured horizon). A stale snapshot matches zero rows instead of corrupting fresh state.
- **Harvest class:** DIRECT_REUSE (LANE-1), ADAPT (LANE-16), DIRECT (LANE-17 M14, PING's own snapshot-verified variant)

### C5. Visibility-timeout restoration of unacknowledged deliveries
- **Source lanes:** LANE-16 (M5)
- **Pinned SHAs:** celery/kombu `82577320de2e`
- **Invariant:** each delivery is timestamped into an unacknowledged set; a periodic sweep restores deliveries past the visibility timeout to the queue; acknowledged deliveries are removed exactly once.
- **Harvest class:** ADAPT (LANE-16)

### C6. Single-writer virtual object lock + inbox
- **Source lanes:** LANE-5 (REST-VO-LOCK)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** all requests for one virtual object key serialize through a single-writer lock; queued requests wait in an inbox and are processed in order; state access for the key is exclusive.
- **Harvest class:** (lane 5 lock family). Related to C1 (fencing): single-writer needs fencing across lock handoffs.

---

## D. Clocks / time

### D1. Timeout taxonomy (four timeouts, two clocks)
- **Source lanes:** LANE-4 (M-7), LANE-9 (M-TIMEOUT)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** distinct timeouts for distinct failures (schedule-to-start, start-to-close, heartbeat, overall), measured against explicit clocks; per-request timeouts carry a progress-reset and a hard max.
- **Harvest class:** ADAPT (LANE-4, LANE-9)

### D2. Heartbeating with progress details
- **Source lanes:** LANE-4 (M-6), LANE-9 (M-PROGRESS)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** long activities report progress via heartbeats carrying details, so retries resume from the last reported progress rather than restarting; progress tokens are monotonic with rate limits. LANE-13 M1 refines: the coordinator extends the deadline only on *progress*, not on mere heartbeat.
- **Harvest class:** ADOPT (LANE-4), ADAPT (LANE-9)

### D3. Durable timers (server-owned sleep)
- **Source lanes:** LANE-4 (M-8), LANE-5 (REST-TIMER)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** sleep is a durable engine-owned timer, not a process-local sleep; it survives coordinator/worker restarts and fires exactly once, journaled.
- **Harvest class:** ADAPT (LANE-4). Pairs with D4: a durable timer firing is how a lost-attempt deadline becomes a classified outcome.

### D4. Timeout as honest failure (no fabricated success)
- **Source lanes:** LANE-1 (M-16)
- **Pinned SHAs:** `bc61bcc5...` (v1) / `4abc75ee506c1ead` (v2, workspace)
- **Invariant:** on timeout the dispatcher constructs a *failed* envelope (status failed, output null, non-empty error, evidence noting the timeout is a dispatcher-side report, not worker output); a timeout is never reported as success, and the attempt record marks TIMED_OUT with the PID dead so reconciliation will not mistake it for in-flight work.
- **Harvest class:** DIRECT_REUSE (LANE-1). Pairs with D5: a timeout is a failure of *knowledge*, never of the effect.

### D5. Unknown-outcome tri-state (the core impossibility)
- **Source lanes:** LANE-12 (M8)
- **Pinned SHAs:** none (conceptual; Kleppmann, Helland)
- **Invariant:** exactly three legal exits from UNKNOWN: (1) make the effect idempotent under a key (A2) so the distinction stops mattering; (2) observe the actual state (E1) and reconcile; (3) compensate once observation shows the effect landed undesirably. "Retry and hope" is not an exit.
- **Harvest class:** SPEC (LANE-12). LANE-5 REST-RUN falsification converges: the journal records results, not effects.

### D6. Durable promises / awakeables (external signals)
- **Source lanes:** LANE-5 (REST-AWAKEABLE, REST-SUSPEND)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** a handler can suspend on a durable promise keyed by id; an external signal completes the promise; suspension and awakening are journaled so crash mid-suspend resumes correctly.
- **Harvest class:** (lane 5 durability family)

---

## E. Reconciliation

### E1. Reconciliation loops (level-triggered, classify-before-dispatch)
- **Source lanes:** LANE-12 (M7), LANE-1 (M-7), LANE-16 (M4)
- **Pinned SHAs:** `4abc75ee506c1ead` (LANE-1 orca_control_loop.js v2, workspace); kubernetes-sigs/controller-runtime `4dca595cdcac` (LANE-16)
- **Invariant:** reconciliation runs before any new dispatch and classifies every durable record: terminal is never touched; authorized dispatches normally; in-flight is bounded-waited or left alone and never redispatch-blinded; verifiably-dead is marked lost and re-authorized within budget. The reconcile function is a pure function of (desired, actual) to actions, safe to restart, replay, or run on a timer; a missed event is a delayed repair, never a lost repair. Reconcile outcome maps to queue operations (requeue, delay, discard).
- **Harvest class:** PATTERN (LANE-12), ADAPT (LANE-1), PATTERN_ONLY (LANE-16)

### E2. Dependency release / follow-up only from verified evidence
- **Source lanes:** LANE-1 (M-17), LANE-17 (M1)
- **Pinned SHAs:** `4abc75ee506c1ead` (LANE-1, workspace)
- **Invariant:** follow-ups are proposed only from VERIFIED evidence; a dependent task's input is assembled from live state at follow-up time, never from the plan; the causal link is the prior task's canonical event id (completion unblocks, dependency release).
- **Harvest class:** ADAPT (LANE-1, LANE-17)

### E3. Record-before-dispatch + crash-safe dispatch rendezvous
- **Source lanes:** LANE-1 (M-3, M-6)
- **Pinned SHAs:** `4abc75ee506c1ead` (v2 loop, workspace); `hermes_dispatch.py` v2 (2026-09-18, workspace)
- **Invariant:** the work-order record is updated to RUNNING with attempt count, attempt id, and dispatch PID *before* the dispatcher can return; the dispatcher (an independent process) atomically writes a rendezvous record (attempt/work-order/objective ids, timestamps, timed_out, returncode, full stdout/stderr) to an argv-passed path, independent of the coordinator's lifetime. At-least-once physical transport, idempotent logical work; exactly-once execution is explicitly NOT claimed.
- **Harvest class:** ADAPT (LANE-1 M-3), DIRECT_REUSE (LANE-1 M-6). Closes the window LANE-3 M-CC-05 documents as an admitted gap (D6).

### E4. Cooperative cancellation (cancel vs kill) + interrupt as control message
- **Source lanes:** LANE-1 (M-15), LANE-4 (M-9, M-18), LANE-9 (M-CANCEL), LANE-5 (REST-CANCEL-KILL), LANE-3 (M-CC-14), LANE-2 (CX-03)
- **Pinned SHAs:** `c9247b5d37a0969c` / `4abc75ee506c1ead` (LANE-1, workspace); Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`; Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`; codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** cancellation is a cooperative first-class control message with race-tolerant semantics (interrupt as an op on the queue; at most one running task per session so interrupts preempt deterministically); kill/terminate is the labeled sharp tool, never confused with cancel. The cancellation signal is durable (survives restart) and blocks new work; cancellation is never equated with killing a worker.
- **Harvest class:** DIRECT_REUSE (LANE-1), ADAPT (LANE-4, LANE-9, LANE-2 CX-03), DIRECT_REUSE (LANE-3 M-CC-14). See D2: LANE-13 M1 requires self-fencing on lease expiry while LANE-4 M-9 allows graceful continuation in a disconnected context.

### E5. Crash recovery: restart, abandon in-flight, re-subscribe
- **Source lanes:** LANE-9 (M-STDIO-RESURRECT)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** after a server crash, the client restarts the server, abandons in-flight requests (they are never silently resumed), and re-subscribes to notifications. Resume is explicit re-hydration, never implicit continuation.
- **Harvest class:** ADAPT (LANE-9)

---
## F. Evidence / provenance

### F1. Evidence-per-stage artifacts + typed status ledger
- **Source lanes:** LANE-1 (M-23, M-19)
- **Pinned SHAs:** `4abc75ee506c1ead` (orca_control_loop.js v2, workspace)
- **Invariant:** every stage transition is backed by a persisted artifact or live runtime state in a numbered run dir (`00-objective.json` ... `99-close/escalate/fatal.json`); every status transition persists its evidence. Terminal ledger units move to BLOCKED on escalation with reason + detail.
- **Harvest class:** PATTERN_ONLY (LANE-1 M-23), WATCH (LANE-1 M-19)

### F2. Canonical recording through the injected runtime only
- **Source lanes:** LANE-1 (M-11)
- **Pinned SHAs:** `755a6e7ce564707c` (external_agent_adapter.js, workspace)
- **Invariant:** the exterior process never receives the event runtime or event credentials; only the platform's own `recordVerifiedResult`, called with the platform's runtime, emits canonical completion events; event identity stays with the canonical `computeEventId` (adapter-side mirrors deliberately removed).
- **Harvest class:** DIRECT_REUSE (LANE-1, as a standing rule: exterior results reenter only through the injected runtime)

### F3. Hash-based tool-call audit records + exportable run receipts
- **Source lanes:** LANE-9 (M-RECEIPT-AUDIT), LANE-2 (OA-10)
- **Pinned SHAs:** community extension (LANE-9); openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9` (LANE-2)
- **Invariant:** every tool call produces a hash-based audit record; trace identity survives resume; receipts are structured (trace/span JSON), not log lines, and are attributable and exportable.
- **Harvest class:** ADOPT (LANE-9), ADAPT (LANE-2)

### F4. Signed link metadata (supply-chain attestations)
- **Source lanes:** LANE-16 (M8)
- **Pinned SHAs:** in-toto/in-toto-golang `1a70fc78c8b2`
- **Invariant:** each step produces signed link metadata recording the executed command, materials (hashes of inputs), and products (hashes of outputs), verified against an authorized layout before acceptance.
- **Harvest class:** ADAPT (LANE-16). Related to F3 (receipts): signatures make receipts attributable.

### F5. Verification records (scores, evaluations, guardrails)
- **Source lanes:** LANE-11 (M12)
- **Pinned SHAs:** OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`; langfuse `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0`
- **Invariant:** every verification emits a record with check name + version, target (span id / response id / tool call id), verdict (value + label), explanation, timestamp; record passes, not just failures; evaluated-but-not-triggered is itself data.
- **Harvest class:** CONTRACT (LANE-11)

### F6. Execution / verification separation
- **Source lanes:** LANE-18 (ranked invariant 1), LANE-1 (M-10, M-18)
- **Pinned SHAs:** `755a6e7ce564707c` (LANE-1 external_agent_adapter.js, workspace)
- **Invariant:** no mission completes on its executor's sole attestation; the verifier is independent and recorded. Result-envelope variant: authorized agent == invoked agent == result agent; exact echo of work_order_id, context_pack_id, capability; `completed` requires non-null output + null error, `failed` requires null output + non-empty error; validation failure is non-retryable and can never reach canonical event authority.
- **Harvest class:** candidate invariant (LANE-18, ranked the master key), DIRECT_REUSE (LANE-1 M-10), WATCH (LANE-1 M-18)

### F7. Observed-effect completion + partial completion as first-class state
- **Source lanes:** LANE-18 (ranked invariants 2, 8)
- **Pinned SHAs:** none (adversarial invariants)
- **Invariant:** COMPLETE requires external confirmation in the system of record, never declared status; partial completion is first-class and fraction-stated, enumerating incomplete items by identity with per-item reasons.
- **Harvest class:** candidate invariants (LANE-18). Converges with D4 (timeout is never reported as success).

### F8. Condensation recorded as an event (auditability of loss)
- **Source lanes:** LANE-14 (M5)
- **Pinned SHAs:** OpenHands software-agent-sdk `5b36cacccc2b`
- **Invariant:** the event log is never rewritten; condensation appends a CondensationEvent referencing forgotten event id ranges plus the summary text; the condensed view is a projection, the log is append-only.
- **Harvest class:** ADOPT (LANE-14, "the cheapest high-value harvest in the lane"). Tension note: LANE-2 CX-07 keeps a summarized replacement segment *in* the durable rollout; the append-only-event discipline is the stricter variant.

### F9. Retention windows bound every guarantee
- **Source lanes:** LANE-5 (REST-RETENTION-PURGE), LANE-11 (M19)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`; LangSmith docs `9207dfb6dfc7dea53b9574ce8ff37858e379dcea`
- **Invariant:** retention is a per-project setting, occasionally overridable per run; keep until mission terminal state + a defined window; pin/extend retention while active; surface expiry to the reader.
- **Harvest class:** (lane 5 purge family), CONTRACT (LANE-11)

---

## G. Visibility / authorization

### G1. Fail-closed authorization gate
- **Source lanes:** LANE-1 (M-8)
- **Pinned SHAs:** `755a6e7ce564707c` (external_agent_adapter.js, workspace)
- **Invariant:** the module owns exactly one decision ("may the platform issue work order W delegating capability C to external agent A under constraints K?"); every check fails closed with a reason; unknown agents, blocked agents, unlisted capabilities, bad namespaces, non-tightening constraints, or missing no-canonical-event guarantees all deny. Policy consult happens before the gate; prohibition and result-acceptance are enforced (M-18).
- **Harvest class:** DIRECT_REUSE (LANE-1 M-8), WATCH (LANE-1 M-18)

### G2. Permission evaluation: deny-first order, rule DSL, tiers, programmatic hook
- **Source lanes:** LANE-3 (M-CC-06, M-CC-08, M-CC-09, M-CC-10, M-CC-22, M-CC-17, M-CC-12), LANE-2 (CX-05)
- **Pinned SHAs:** codex `4b3b569f3975ba4e3bf64589e4d15039066077f8` (LANE-2)
- **Invariant:** a fixed six-step deny-first evaluation order; permissions expressed in a rule DSL; tiered persistence with runtime updates; a PermissionRequest hook runs programmatic policy at decision time; PostToolUse output rewrite is schema-checked and interruption is delivered as a result, never swallowed.
- **Harvest class:** DIRECT_REUSE (M-CC-06), PATTERN_ONLY (M-CC-08, M-CC-17), ADAPT (M-CC-09, M-CC-10, M-CC-22, M-CC-12; LANE-2 CX-05)

### G3. Approval-gated tool execution (identity-bound approvals)
- **Source lanes:** LANE-2 (OA-02), LANE-3 (M-CC-06), LANE-11 (M10)
- **Pinned SHAs:** openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`; OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **Invariant:** no tool executes without a policy decision; an approval decision binds to a canonical tool-invocation identity, survives serialization, and can be re-matched after resume; approval/denial is recorded metadata on the tool-call span; sticky decisions persist per tool.
- **Harvest class:** ADAPT (LANE-2), DIRECT_REUSE (LANE-3), CONTRACT (LANE-11)

### G4. Hook lifecycle: stop-hook veto, deferral, async hooks, session hooks
- **Source lanes:** LANE-3 (M-CC-07, M-CC-23, M-CC-18, M-CC-25)
- **Pinned SHAs:** (Claude Code SDK behavior, source-read)
- **Invariant:** a stop hook can veto completion with bounded continuations; a tool call can be deferred (pause, collect input elsewhere, resume); fire-and-forget async hooks never block the loop; session lifecycle hooks inject at start and run bounded cleanup at end.
- **Harvest class:** ADAPT (M-CC-07, M-CC-23, M-CC-25), DIRECT_REUSE (M-CC-18)

### G5. Secrets at the process boundary, never in the envelope
- **Source lanes:** LANE-1 (M-25), LANE-9 (M-SECRETS)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** secrets are resolved at the process boundary into env vars and never touch disk, logs, or tool output; no secrets in input/output/evidence payloads; brokers resolve credentials at the process boundary, never inside a work order; secrets stay out of the MCP wire.
- **Harvest class:** PATTERN_ONLY (LANE-1), ADOPT (LANE-9)

### G6. OAuth 2.1 + per-request authorization context
- **Source lanes:** LANE-9 (M-AUTH, M-PER-REQUEST-AUTHZ)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** OAuth 2.1 with resource indicators, step-up auth, and anti-passthrough; discovery itself varies with the authorization context (what you see depends on who you are).
- **Harvest class:** ADAPT (LANE-9)

### G7. Toolset / read-only filtering at registration
- **Source lanes:** LANE-9 (M-TOOLSETS)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** servers filter their tool surface server-side at registration (e.g. read-only subsets); the client only ever sees the permitted subset.
- **Harvest class:** ADAPT (LANE-9)

### G8. Filesystem allow-list + OS-level sandboxing
- **Source lanes:** LANE-9 (M-FS-SCOPING), LANE-3 (M-CC-28), LANE-2 (CX-06)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`; codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** filesystem access is an allow-list with symlink resolution; the sandbox tier is a property of the session config, applied uniformly to every exec; OS-level sandboxing is defense in depth, not policy (policy still decides).
- **Harvest class:** ADAPT (LANE-9), WATCH (LANE-3 M-CC-28), PATTERN_ONLY (LANE-2 CX-06)

### G9. Verbatim prompts (machine-text injection defense)
- **Source lanes:** LANE-3 (M-CC-26)
- **Pinned SHAs:** (Claude Code SDK behavior, source-read)
- **Invariant:** prompts injected into the loop are passed verbatim (never re-rendered through a template that could interpolate untrusted content); machine text and untrusted text stay in distinct channels.
- **Harvest class:** DIRECT_REUSE (LANE-3). Related to G10: the same trust boundary, at the prompt layer.

### G10. Subagent output scanning + untrusted tool annotations
- **Source lanes:** LANE-3 (M-CC-03), LANE-9 (M-TOOL-ANNOT)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** subagent output is scanned at the trust boundary before entering the supervisor's context; tool behavior hints are explicitly untrusted metadata, never policy.
- **Harvest class:** DIRECT_REUSE (LANE-3), ADAPT (LANE-9)

### G11. Agent profile data registry
- **Source lanes:** LANE-1 (M-20)
- **Pinned SHAs:** `8f300dab00fb3da7` (AGENT_PROFILES.md) / `755a6e7ce564707c` (adapter, workspace)
- **Invariant:** profiles are data, not code; PENDING_AUTH registers a family but the gate denies it until a one-time login is verified; blockedExternal denies while active; unknown agent ids fail closed.
- **Harvest class:** DIRECT_REUSE (LANE-1)

### G12. Namespace regex with authority fallback
- **Source lanes:** LANE-1 (M-21)
- **Pinned SHAs:** `755a6e7ce564707c` (workspace)
- **Invariant:** prefer the canonicalization authority's export when present; otherwise fall back to the contract pattern; never invent a third pattern.
- **Harvest class:** PATTERN_ONLY (LANE-1)

### G13. Informed consent for capability installation
- **Source lanes:** LANE-9 (M-INSTALL-CONSENT)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** one-click local server install requires informed consent; the installing party sees what is being granted before it is granted.
- **Harvest class:** ADOPT (LANE-9)

---
## H. Extraction / parsing

### H1. Structured extraction as the summary format
- **Source lanes:** LANE-14 (M14)
- **Pinned SHAs:** OpenHands `5b36cacccc2b` (S1); S5 `3ee68efb4f96`
- **Invariant:** the summarizer fills a fixed schema (goals, files modified, failing tests, decisions, open questions, remaining work), not a blank page; free text only for human-facing narrative.
- **Harvest class:** ADOPT (LANE-14)

### H2. Write-time fact extraction + bi-temporal invalidation
- **Source lanes:** LANE-14 (M13)
- **Pinned SHAs:** Mem0 paper (arXiv 2504.19413); MemGPT/Letta deep dive `7205af14724d`
- **Invariant:** at write time, extract atomic facts from interactions and consolidate with add/update/delete so memory stores claims, not transcripts; never delete on update, instead invalidate old edges with bi-temporal stamps (valid_at/invalid_at for world time, created_at/expired_at for transaction time), so staleness is a query, not a guess.
- **Harvest class:** ADAPT (LANE-14)

### H3. Structured I/O contracts (JSON Schema input/output)
- **Source lanes:** LANE-9 (M-STRUCTURED-IO)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** tools declare JSON Schema 2020-12 input and output contracts plus structuredContent; callers validate against the schema instead of parsing free text.
- **Harvest class:** MIRROR (LANE-9)

### H4. Closed delegation envelope (fixed schema, build-never-send)
- **Source lanes:** LANE-1 (M-9)
- **Pinned SHAs:** `755a6e7ce564707c` (workspace)
- **Invariant:** the delegation envelope is closed (no additional properties): exactly the contract fields including work_order_id, agent_id, mission_id, task_id, correlation_id, context_pack_id, attempt, principal (a constant), namespace, capability, input, constraints, result_path, deadline; the function builds the envelope but never transmits it (transport is the dispatcher's job).
- **Harvest class:** DIRECT_REUSE (LANE-1)

---

## I. Observability

### I1. Trace context identity + propagation (W3C traceparent)
- **Source lanes:** LANE-11 (M1, M6), LANE-9 (M-OTEL)
- **Pinned SHAs:** OTel spec `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`; MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** a span's identity is the immutable pair (trace_id 128-bit, span_id 64-bit), hex-serialized, with an IsRemote provenance bit distinguishing propagated-from-elsewhere contexts; the propagator injects traceparent/tracestate into the carrier (headers, message metadata, job envelope) at every boundary; trace context propagates in `_meta` on the MCP wire.
- **Harvest class:** SPEC (LANE-11), MIRROR (LANE-9)

### I2. Span links as cross-trace causal edges
- **Source lanes:** LANE-11 (M2, M18)
- **Pinned SHAs:** OTel spec `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **Invariant:** a Link is (target SpanContext + attributes) and may target spans in the same or a different trace; links are added at span creation (head sampling only sees creation-time info). Delegation edge contract: link from the child's root span to the parent's delegating tool_call span with delegated-task reference, parent tool_call id, child trace id. OTel Links are the only standard primitive for cross-trace causality; every system's native answer (handoff spans, group_id, sessionId strings, dotted_order, multi-parent arrays) is proprietary.
- **Harvest class:** SPEC + PATTERN (M2), CONTRACT (M18)

### I3. Conversation ID correlator + anti-synthesis rule
- **Source lanes:** LANE-11 (M8), LANE-2 (OA-04)
- **Pinned SHAs:** OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** populate the conversation/session correlator only if the instrumented system has a real session identifier readily available; MUST NOT synthesize one (no new UUID, no trace_id reuse, no content hash fallback). Session is the durable conversation identity; run identity is ephemeral.
- **Harvest class:** CONTRACT (LANE-11), ADAPT (LANE-2). See A7 note: the rule governs *correlation* ids, not fresh *run* ids.

### I4. GenAI operation taxonomy (shared verb set)
- **Source lanes:** LANE-11 (M7)
- **Pinned SHAs:** OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **Invariant:** `gen_ai.operation.name` is the machine-readable verb; span name is "<verb> {qualifier}"; span kind reflects the network role; extensions are namespaced until upstream standardizes.
- **Harvest class:** SPEC + PATTERN (LANE-11)

### I5. Span status + error.type; reserved error-code range
- **Source lanes:** LANE-11 (M4), LANE-9 (M-ERROR-CODES)
- **Pinned SHAs:** OTel spec `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`; OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`; MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** StatusCode in {Unset, Ok, Error} ordered Ok > Error > Unset; error.type is a low-cardinality provider code or exception name; adopt Status + error.type for *mechanical* failure, never for *judgment* failure. Protocol errors use a reserved code range with a two-tier error model.
- **Harvest class:** CONTRACT (LANE-11), MIRROR (LANE-9)

### I6. Opt-in content capture (model inputs/outputs)
- **Source lanes:** LANE-11 (M9)
- **Pinned SHAs:** OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **Invariant:** content attributes follow strict JSON schemas; instrumentation must offer filtering/truncation; inference-details events decouple content storage from trace storage (different retention/access policy); `conversation.compacted=true` is a positive reliable indicator of summarization (never set false; unset = unknown).
- **Harvest class:** SPEC + CONTRACT (LANE-11)

### I7. Model-call boundary span
- **Source lanes:** LANE-11 (M11)
- **Pinned SHAs:** OTel semconv `8ffdf568e1b4391a99adb081db16e8102e36918e`
- **Invariant:** one span per model call with request model + response model distinguished, model config, usage in billed units, positional finish reasons, response.id joining the call to later evaluations; parents aggregate totals, children keep per-call detail.
- **Harvest class:** CONTRACT (LANE-11)

### I8. Run tree with total order (dotted_order)
- **Source lanes:** LANE-11 (M13)
- **Pinned SHAs:** LangSmith `9207dfb6dfc7dea53b9574ce8ff37858e379dcea`
- **Invariant:** run identity = (id, trace_id, parent_run_id, dotted_order); dotted_order carries ancestry + total order in one string; every execution span also carries a monotonic clock-independent sequence number scoped to its attempt.
- **Harvest class:** PATTERN + CONTRACT (LANE-11). Anti-pattern noted by the lane: never reconstruct load-bearing structure from stringly metadata; never let a default filter drop non-LLM spans.

### I9. One recursive observation type (Trace / Observation / Score, upsert-by-id)
- **Source lanes:** LANE-11 (M15)
- **Pinned SHAs:** langfuse `ce3ef136762bdfe386153e5c2c0851a4cb72f2b0` / `f505fa1308a6ed63462f16c150ed68e3e7dccd5a`
- **Invariant:** exactly three primitives (Trace root container, Observation recursive work unit with typed enum, Score with name/value/source); all creates are upserts by id (retried exports do not duplicate); one self-referential parent edge + shared trace_id.
- **Harvest class:** PATTERN + ANTI-PATTERN (LANE-11)

### I10. Multi-parent typed spans
- **Source lanes:** LANE-11 (M16)
- **Pinned SHAs:** Braintrust `78303f86a9728079791fc1d6e059a892d31f1d26`
- **Invariant:** spans carry a typed vocabulary plus a multi-parent array as a first-class edge; the agent-loop contract: parent captures initial input + final output + aggregated tokens, each LLM call and tool execution is an execution-ordered child.
- **Harvest class:** PATTERN + CONTRACT (LANE-11)

### I11. Workflow trace + typed spans (OpenAI Agents SDK)
- **Source lanes:** LANE-11 (M17)
- **Pinned SHAs:** openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** one trace per workflow run (format-enforced trace id, workflow name, group_id linking multiple traces of one conversation, metadata); spans carry started/ended times and typed span_data (turn, handoff from->to, guardrail with triggered bool, generation, function, response). Never depend on provider-side trace storage; own the bytes.
- **Harvest class:** PATTERN + ANTI-PATTERN (LANE-11)

### I12. Span limits + head-based sampling
- **Source lanes:** LANE-11 (M5)
- **Pinned SHAs:** OTel spec `cac5b81ebcfdecb272bb4e2d31f885b7142207d9`
- **Invariant:** explicit caps (128 attributes/events/links per span) that are documented and surfaced; sampling decisions are made at span creation and can only consider creation-time info; never silently truncate decision-content, truncate with a truncated:true marker and a pointer to the full artifact.
- **Harvest class:** CONTRACT + ANTI-PATTERN (LANE-11)

### I13. Session lifecycle hooks + SQL introspection + state history
- **Source lanes:** LANE-3 (M-CC-25), LANE-5 (REST-OBSERVE), LANE-7 (M13)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** start injection and bounded end cleanup around the session; live engine state is queryable over SQL; state snapshots and debug streams expose the full history of a run.
- **Harvest class:** ADAPT (LANE-3, LANE-7)

---
## J. Scheduling / selection

### J1. Finite retry and compute budgets, externally metered
- **Source lanes:** LANE-18 (ranked invariant 5), LANE-1 (M-14), LANE-3 (M-CC-20)
- **Pinned SHAs:** `c9247b5d37a0969c` / `4abc75ee506c1ead` (LANE-1, workspace)
- **Invariant:** every mission carries a finite retry budget counted in attempts AND in tokens/compute, set at creation and metered externally (not self-reported); three independent run bounds (turns, spend, token budget); reserving the same work order id twice consumes budget once; exhaustion refuses new work with a terminal state and is never silently reset by restart; sub-mission budgets are deducted from the parent.
- **Harvest class:** candidate invariant (LANE-18), DIRECT_REUSE (LANE-1), ADAPT (LANE-3). Distinct failure signatures map to distinct policies: transient (retry with backoff), structural (fail fast), permanent (never retry).

### J2. Bounded retry with jitter + declarative retry policies
- **Source lanes:** LANE-17 (M10), LANE-16 (M10), LANE-4 (M-5), LANE-5 (REST-RETRY), LANE-2 (OA-07)
- **Pinned SHAs:** cenkalti/backoff `ffcfd8ab39e2` (LANE-16); Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** retry loops run against a BackOff policy (exponential with jitter, full jitter, decorrelated); failure recurrence shapes priority (backoff, not just retry); permanent error classes are never retried; retries are bounded, classified, and usage-accounted; retry can pause or be killed by policy.
- **Harvest class:** DIRECT (LANE-17), DIRECT_REUSE (LANE-16), ADOPT (LANE-4), ADAPT (LANE-2)

### J3. Progress argument for repeated calls (loop bound)
- **Source lanes:** LANE-18 (body invariant, line 369)
- **Pinned SHAs:** none (adversarial invariant)
- **Invariant:** every repeated tool call carries a progress argument: the loop states what new information or state change the Nth call expects that the (N-1)th did not produce; identical calls with identical arguments are refused.
- **Harvest class:** candidate invariant (LANE-18). Special case of J1 (retry budget): the loop bound is the progress argument.

### J4. Priority aging + liveness guarantee per tier
- **Source lanes:** LANE-17 (M6), LANE-18 (ranked invariant 6)
- **Pinned SHAs:** none
- **Invariant:** every priority tier has a maximum wait bound enforced by priority aging (effective priority rises with wait); starvation is a monitored metric with an alert. Liveness is guaranteed, not just priority.
- **Harvest class:** ADAPT (LANE-17), candidate invariant (LANE-18)

### J5. Priority subqueues + queue sort with active/backoff/unschedulable
- **Source lanes:** LANE-17 (M2, M5)
- **Pinned SHAs:** none (Temporal, kube-scheduler)
- **Invariant:** strict priority subqueues drain in order; the queue sort maintains active, backoff, and unschedulable sets with plugin scoring; backoff items return to active on timer, unschedulable items wait for capacity events.
- **Harvest class:** ADAPT (LANE-17)

### J6. Multifactor scoring (SLURM)
- **Source lanes:** LANE-17 (M3)
- **Pinned SHAs:** none (SLURM)
- **Invariant:** work is ordered by a multifactor score (priority, age, fair-share, size, partition) rather than a single key; factors are weighted and auditable.
- **Harvest class:** ADAPT (LANE-17)

### J7. Backfill with shadow reservations
- **Source lanes:** LANE-17 (M4)
- **Pinned SHAs:** none (SLURM EASY)
- **Invariant:** small work backfills idle capacity without delaying the highest-priority reservation; a shadow reservation protects the top item's start time.
- **Harvest class:** ADAPT (LANE-17)

### J8. DAG priority weight / critical-path promotion
- **Source lanes:** LANE-17 (M7)
- **Pinned SHAs:** none (Airflow)
- **Invariant:** a task's priority weight includes the weight of its downstream dependents (critical path promotion); unblocking the most downstream work wins.
- **Harvest class:** DIRECT (LANE-17)

### J9. Behavior-tree tick + action auction
- **Source lanes:** LANE-17 (M9)
- **Pinned SHAs:** none (PlanSys2 / robotics)
- **Invariant:** the tree is ticked at a fixed rate; eligible actions bid for execution; the auction clears to exactly one action per tick; ticks are the scheduling quantum.
- **Harvest class:** ADAPT (LANE-17)

### J10. Capacity-bounded admission (pools, quotas, leases, scope limits)
- **Source lanes:** LANE-17 (M11), LANE-5 (REST-FLOW-CONTROL)
- **Pinned SHAs:** Restate `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- **Invariant:** admission is bounded by pools, quotas, and scope-based concurrency limits; excess work waits rather than contending. Lease-backed admission gates liveness; see D8 on bare leases for correctness.
- **Harvest class:** DIRECT (LANE-17)

### J11. State-machine-driven next action
- **Source lanes:** LANE-17 (M12)
- **Pinned SHAs:** `4abc75ee506c1ead` (orca_control_loop.js v2, workspace)
- **Invariant:** the next action is a pure function of the current state machine state (observe -> plan -> authorize -> dispatch -> verify -> assess), never of vibes or recency.
- **Harvest class:** ADAPT (LANE-17)

### J12. Deterministic worker selection (hash pick over sorted candidates)
- **Source lanes:** LANE-1 (M-12)
- **Pinned SHAs:** n/a (audit doc 2026-09-13; gateway source-read)
- **Invariant:** given the same registry state, the same capability always selects the same worker (SHA-256 hash pick over sorted candidates); selection is deterministic and auditable.
- **Harvest class:** PATTERN_ONLY (LANE-1; the ORCA engine around it is REJECTed)

### J13. Task memoization + sticky execution
- **Source lanes:** LANE-7 (M15), LANE-4 (M-15)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** deterministic steps are memoized and never re-executed (cache keyed on inputs); sticky execution routes replay to the cached worker as a pure optimization, never as a correctness requirement.
- **Harvest class:** ADAPT (LANE-7, LANE-4)

### J14. External scheduler / plugin hooks
- **Source lanes:** LANE-17 (M15)
- **Pinned SHAs:** none (SLURM, kube-scheduler Permit)
- **Invariant:** the scheduler exposes permit/bind/extend plugin points; external schedulers can veto or reshape placement without forking the core.
- **Harvest class:** ADAPT (LANE-17)

### J15. Expected information gain scheduling
- **Source lanes:** LANE-17 (M8)
- **Pinned SHAs:** none
- **Invariant:** when outcomes are uncertain, schedule the work that most reduces uncertainty first (uncertainty-reduction ordering), not the work that looks closest to done.
- **Harvest class:** INSPIRE (LANE-17)

### J16. LLM-vibes prioritization (anti-pattern reference)
- **Source lanes:** LANE-17 (M13)
- **Pinned SHAs:** none (BabyAGI)
- **Invariant:** none (deliberate anti-pattern): letting an LLM rank tasks by "vibes" produces un-auditable, unstable ordering; recorded so no later design re-invents it.
- **Harvest class:** INSPIRE as anti-pattern (LANE-17). Related to J11 (state-machine-driven selection is the sound alternative).

---

## K. Context / handoff

### K1. Context compaction (two-stage, server-side, condenser, PreCompact gate)
- **Source lanes:** LANE-14 (M1, M3, M4, M6, M7, M10), LANE-2 (OA-05, OA-06, CX-07), LANE-3 (M-CC-13)
- **Pinned SHAs:** S3 `fcc336e00e94`; S5 `3ee68efb4f96`; OpenHands `5b36cacccc2b` (docs `3d3fc4fe3e4b`); opengeni PR `ed5402a00668`; S11 `c4ea4e444144`; S9 `69c5e0f1f697`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`; codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** before any LLM summary runs, deterministically replace large old tool results with cleared-content markers (classify by recoverability, not recency); trimming happens on the model input list at call time while the durable record keeps full outputs; condensers are stateless pure strategies over the event stream (LLM-summarizing, structured-summary, attention-ranked, recent-events, amortized); staged pressure thresholds apply cheaper-first measures (warn >0.70, mask >0.80, prune >0.85, full summarize >0.99); a PreCompact hook gates lossy checkpoints; compaction produces a summarized segment that stays in the durable log.
- **Harvest class:** ADAPT (LANE-14 M1/M4/M6/M7, LANE-2, LANE-3), INSPIRED (LANE-14 M3), ADOPT (LANE-14 M10), PATTERN_ONLY (LANE-2 OA-06). LANE-14 M6 evaluation rule: any summarizer must beat the deterministic-masking baseline on total cost-to-outcome (D5).

### K2. Summary as state transfer (hybrid summary-plus-recency)
- **Source lanes:** LANE-14 (M2, M9)
- **Pinned SHAs:** S3 `fcc336e00e94`; S14 `ed5402a00668`
- **Invariant:** new context after compaction = persistent instructions + summary of decisions and progress + state reloaded from source + a recent verbatim tail; never summary alone, never raw alone; assemble all four slots explicitly and leave a slot empty rather than filling it with guesses.
- **Harvest class:** ADOPT (LANE-14 M2), ADAPT (LANE-14 M9)

### K3. Structured checkpoint handoff file + typed handoff failure states
- **Source lanes:** LANE-14 (M19, M20)
- **Pinned SHAs:** S16 `9502703bee75`
- **Invariant:** the handoff is a written file, not a conversation; the write is the thinking (explicit slots: goal, state, evidence, open items, next action); the receiver must not improvise: handoff failures are typed states with defined recovery, never silent degradation.
- **Harvest class:** (lane 14 handoff family)

### K4. Handoff as structured data + explicit task context dependencies
- **Source lanes:** LANE-8 (M-05, M-03), LANE-3 (M-CC-02)
- **Pinned SHAs:** none (OpenAI Swarm, CrewAI sequential)
- **Invariant:** handoffs are structured data (typed fields), not chat text; sequential tasks declare explicit context dependencies with bounded aggregation; subagent results propagate in three tiers (heartbeat / full-text / transcript).
- **Harvest class:** ADAPT (LANE-8 M-05, LANE-3), ADOPT (LANE-8 M-03)

### K5. Subagent supervision (structured actors, lifecycle frames, parent close policy)
- **Source lanes:** LANE-16 (M2), LANE-3 (M-CC-04), LANE-4 (M-12), LANE-2 (CX-04)
- **Pinned SHAs:** oklog/run `c769e5823153` (LANE-16); Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`; codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** actors register as (execute, interrupt) pairs; the supervisor starts every execute and a fan-out interrupt reaches all of them; background subagents run inside lifecycle frames; child workflows inherit a parent close policy (terminate, cancel, abandon); every spawned agent has a unique path and a reserved slot; interrupts are safe to repeat.
- **Harvest class:** DIRECT_REUSE (LANE-16), ADAPT (LANE-3, LANE-4, LANE-2)

### K6. Subagent isolation (narrow channels, fresh windows)
- **Source lanes:** LANE-14 (M11), LANE-3 (M-CC-01, M-CC-24)
- **Pinned SHAs:** S16 `9502703bee75`; S7 `7c962edc1a77`
- **Invariant:** subagents get fresh context windows as the unit of scale; the supervisor receives only distilled summaries under an output schema, never raw worker transcripts; exactly two narrow channels cross the isolation boundary.
- **Harvest class:** ADAPT (LANE-14), PATTERN_ONLY (LANE-3)

### K7. Delegation as control-flow transition
- **Source lanes:** LANE-2 (OA-08)
- **Pinned SHAs:** openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** delegation is a loop control-flow transition (NextStepHandoff), not a spawned process; nested agent-tool runs are routed recursively.
- **Harvest class:** PATTERN_ONLY (LANE-2). Related to M-CC-24 background-by-default delegation (PATTERN_ONLY): delegation defaults to background with lifecycle frames (K5).

### K8. Mandatory child attribution + bidirectional control protocol
- **Source lanes:** LANE-3 (M-CC-21, M-CC-11)
- **Pinned SHAs:** (Claude Code SDK behavior, source-read)
- **Invariant:** on multiplexed event streams every event carries mandatory child attribution; host and loop communicate over one JSONL channel with a bidirectional control protocol (ops one way, events the other).
- **Harvest class:** DIRECT_REUSE (LANE-3)

### K9. Stale-context detection + memory as decaying claims
- **Source lanes:** LANE-14 (M17), LANE-18 (ranked invariant 7), LANE-14 (M12, M15)
- **Pinned SHAs:** MemGPT/Letta deep dive `7205af14724d`; S15 `cd9623ce5135`
- **Invariant:** factual memory about the external world carries a re-verification date and decays in confidence; memories are re-verified before outbound action; when a memory is falsified, forward taint tracing finds what it influenced. Memory tiers: working (fixed budget, agent-paged), recall (searchable history), archival (vector-indexed); maintenance runs off the critical path (sleep-time compute) with a merge protocol.
- **Harvest class:** (lane 14 memory family), candidate invariant (LANE-18). Related to H2 (bi-temporal invalidation makes staleness queryable).

### K10. Dependency context (query-conditioned pruning)
- **Source lanes:** LANE-14 (M16)
- **Pinned SHAs:** SWE-Pruner paper (arXiv 2601.16746)
- **Invariant:** context assembly is a function of (task, query), not of everything available; prune at the boundary where environment content enters the agent, keep lines relevant to the query, drop the rest with structure-preserving compression.
- **Harvest class:** ADOPT the discipline / ADAPT the machinery (LANE-14)

### K11. Position discipline + RL-trained self-summarization
- **Source lanes:** LANE-14 (M18, M8)
- **Pinned SHAs:** S7 `7c962edc1a77`
- **Invariant:** critical content is placed where the model actually reads (position discipline: counter the lost-in-the-middle effect); the summarizer is trained (RL) rather than prompted and evaluated on downstream errors, decoding on the existing KV cache.
- **Harvest class:** (lane 14), INSPIRED (M8; the RL part is not harvestable, the KV-cache-aware shape and evaluation discipline are)

### K12. Signals / queries / updates (three inbound message shapes)
- **Source lanes:** LANE-4 (M-11)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** inbound traffic has exactly three shapes: signals (fire-and-forget state changes), queries (read-only, never mutate), updates (validated, durable, acknowledged); queries never block on workflow progress.
- **Harvest class:** ADAPT (LANE-4)

---

## L. Misc

### L1. Superstep/Pregel loop + version watermarks + channel reducers + subgraph namespaces
- **Source lanes:** LANE-7 (M1, M5, M10, M11)
- **Pinned SHAs:** LangGraph docs (source-read)
- **Invariant:** execution proceeds in supersteps (Pregel): all ready nodes run, writes land, versions advance; channel_versions + versions_seen watermarks track what each node has seen; concurrent writes to one channel merge through a typed reducer; subgraphs checkpoint in hierarchical namespaces.
- **Harvest class:** PATTERN_ONLY (M1, M5), REPURPOSE (M10), PATTERN_ONLY (M11)

### L2. Ordered background persistence + durability modes
- **Source lanes:** LANE-7 (M3)
- **Pinned SHAs:** LangGraph docs (source-read)
- **Invariant:** persistence runs in the background in a fixed order; durability modes let the caller choose sync vs async persistence per write; ordering is guaranteed regardless of mode.
- **Harvest class:** PATTERN_ONLY (LANE-7)

### L3. Resume-and-fork / workflow reset (time travel without history rewrite)
- **Source lanes:** LANE-7 (M9), LANE-2 (CX-02, OA-03), LANE-4 (M-16)
- **Pinned SHAs:** codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`; openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`; Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** resume never mutates the old history in place: it starts a new live run hydrated from stored history (forks get their own log); reset replays from event N; resume is a first-class entry point (the same public function starts fresh runs and resumes interrupted ones).
- **Harvest class:** PATTERN_ONLY (LANE-7), ADAPT (LANE-2 CX-02), PATTERN_ONLY (LANE-2 OA-03), STUDY (LANE-4)

### L4. Error handler routing (failure persistence without re-execution)
- **Source lanes:** LANE-7 (M16)
- **Pinned SHAs:** LangGraph docs (source-read)
- **Invariant:** a node failure routes to an error handler with the failure persisted; the failed node is not re-executed blindly; the handler decides retry, fallback, or escalate.
- **Harvest class:** ADAPT (LANE-7)

### L5. Versioning: patch markers, deprecate-patch lifecycle, worker build IDs
- **Source lanes:** LANE-4 (M-14)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** code changes are marked with patch markers; deprecated patches have a lifecycle; workers advertise build IDs so the server routes version-sensitive work to compatible workers.
- **Harvest class:** STUDY (LANE-4)

### L6. Sandbox determinism enforcement
- **Source lanes:** LANE-4 (M-3)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** static analysis plus runtime interdiction of imports/calls keeps orchestration code deterministic; violations fail at registration or first call, never silently.
- **Harvest class:** STUDY (LANE-4)

### L7. Local activities (reduced-durability fast path)
- **Source lanes:** LANE-4 (M-17)
- **Pinned SHAs:** Temporal `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **Invariant:** short local operations run in a reduced-durability fast path (no full activity lifecycle); the durability reduction is explicit and bounded, not ambient.
- **Harvest class:** STUDY (LANE-4)

### L8. Deterministic termination conditions + statically validated workflow graph
- **Source lanes:** LANE-8 (M-01, M-02)
- **Pinned SHAs:** none (AutoGen)
- **Invariant:** multi-agent runs terminate on deterministic conditions (max turns, explicit termination message, approval state), never on vibes; the workflow graph with conditional edges is statically validated before execution.
- **Harvest class:** ADAPT (LANE-8). Related to E-reconciliation and LANE-18 ranked invariant 8 (cycle detection at declaration time).

### L9. In-process capability servers
- **Source lanes:** LANE-3 (M-CC-19)
- **Pinned SHAs:** (Claude Code SDK MCP behavior, source-read)
- **Invariant:** capability servers run in-process over the SDK's MCP transport; tool registration, discovery, and invocation share one channel with the agent loop.
- **Harvest class:** ADAPT (LANE-3). Scope note: in-process capability serving (this entry) is distinct from an MCP *control plane* for the coordinator, which LANE-1 M-28 REJECTs (D7).

### L10. MCP discovery / caching / negotiation suite
- **Source lanes:** LANE-9 (M-DISCOVER, M-TOOL-LIST-CACHE, M-VERSION-NEG, M-EXTENSIONS, M-PAGINATION, M-COMPLETION, M-SKILLS)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** discovery is a self-description by an untrusted party (advertises claims, grants nothing); tool lists are cacheable with TTL + scope + invalidation; per-request version declaration with error-driven fallback; capability-advertised extensions with prefixed identifiers; opaque cursor pagination with no snapshot guarantee; argument autocompletion as a protocol primitive; capabilities packaged as versioned skill directories over resources.
- **Harvest class:** ADAPT (LANE-9). Trust model must be inverted for PING (PING signs/attests; clients verify).

### L11. Long-running task handles + progress/subscription streams
- **Source lanes:** LANE-9 (M-TASKS, M-SSE-STREAM, M-SUBSCRIPTIONS, M-MRTR, M-X-MCP-HEADER)
- **Pinned SHAs:** MCP spec draft `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Invariant:** long-running operations return task handles for out-of-band polling; SSE streams are request-scoped with no resumability; change notifications are opt-in subscriptions; multi-round-trip requests let the server ask and the client retry; tool parameters can mirror into HTTP headers for gateway routing.
- **Harvest class:** ADAPT (LANE-9)

### L12. Workflow dependency graph with cycle detection at declaration time
- **Source lanes:** LANE-18 (ranked invariant 8), LANE-8 (M-02)
- **Pinned SHAs:** none (adversarial invariant; AutoGen DiGraph)
- **Invariant:** the mission dependency graph is a first-class structure; any edge that creates a cycle is rejected at declaration time, before either mission executes; deadline-blocked missions escalate.
- **Harvest class:** candidate invariant (LANE-18), ADAPT (LANE-8)

### L13. Prompt-via-argv concurrency discipline
- **Source lanes:** LANE-1 (M-22)
- **Pinned SHAs:** workspace (hermes_dispatch.py, 2026-09-18 11:55)
- **Invariant:** the prompt path comes from argv, never a hardcoded shared file; each attempt gets its own prompt file, cleaned up after dispatch.
- **Harvest class:** PATTERN_ONLY (LANE-1)

### L14. Escalation exit-code contract
- **Source lanes:** LANE-1 (M-24)
- **Pinned SHAs:** `4abc75ee506c1ead` (workspace)
- **Invariant:** exit 0 = closed (no fresh work on restart); exit 2 = fatal; exit 3 = escalation (reason + detail persisted, ledger unit BLOCKED); exit 4 = cancelled; exit 5 = lock/contention (another coordinator holds the claim or the store is unreachable: exit without dispatching).
- **Harvest class:** PATTERN_ONLY (LANE-1)

### L15. Typed file edits (diff engine operation)
- **Source lanes:** LANE-2 (CX-08)
- **Pinned SHAs:** codex `4b3b569f3975ba4e3bf64589e4d15039066077f8`
- **Invariant:** file edits are a typed operation (action + file changes) through a diff engine, not shell text; patches never bypass the policy gate.
- **Harvest class:** DIRECT_REUSE (LANE-2, Apache-2.0)

### L16. Effort levels (compute dial per agent)
- **Source lanes:** LANE-3 (M-CC-27)
- **Pinned SHAs:** (Claude Code SDK behavior, source-read)
- **Invariant:** each agent carries an effort level (compute dial) that scales reasoning budget per invocation; the dial is explicit, not ambient.
- **Harvest class:** PATTERN_ONLY (LANE-3)

### L17. Adaptive behavior from durable tool-use history
- **Source lanes:** LANE-2 (OA-09)
- **Pinned SHAs:** openai-agents-python `d303ce87e60f55e4a7c9b2c313cddba73de5f6f9`
- **Invariant:** tool-use history is part of the durable run snapshot, so resumed runs keep the same adaptive behavior (e.g. tool_choice resets) as uninterrupted runs.
- **Harvest class:** PATTERN_ONLY (LANE-2)

### L18. REJECT / negative findings
- **Source lanes:** LANE-1 (M-26, M-28), LANE-11 (M14 anti-pattern), LANE-17 (M13 anti-pattern)
- **Pinned SHAs:** n/a
- **Invariant:** recorded so no later design re-invents them: ORCA's private ExecutionEngine event queue + artifact store is dead-by-design (REJECT); MCP as the coordinator's internal control plane is a negative finding (REJECT); proprietary lossy trace bridges as the primary path are an anti-pattern; LLM-vibes prioritization is an anti-pattern reference.
- **Harvest class:** REJECT / ANTI-PATTERN. LANE-1 M-27 (MissionCompiler catalog) is WATCH, not reject.

---

## Coverage notes for the mapper

- Every mechanism above carries its source lane IDs, so the mapper can trace any entry back to the full lane report.
- Convergence signals (13 mechanisms at 3+ lanes) are listed at the top; they are the strongest cross-lane agreements.
- Disagreement notes D1-D8 mark where lanes conflict or diverge in scope; the mapper should not treat those entries as settled.
- Lane 18 contributes adversarial candidate invariants (ranked 1-8) rather than harvested implementations; its entries are framed as "PING must..." constraints.
- Lane 2 contributes 18 records (OA-01..OA-10, CX-01..CX-08); lane 16 contributes 11 mechanisms with repo + SHA + HARVEST_CLASSIFICATION fields instead of the INVARIANT/HARVEST_CLASS vocabulary.
- Lanes that appear in only one entry are still indexed; single-lane mechanisms are not marked as weak, only as unconverged.
