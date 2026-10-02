# LANE 12 — Idempotency / Distributed Effects

**Wave 1 research lane. RESEARCH / FALSIFICATION / HARVEST ONLY. No implementation code.**
**Date:** 2026-09-23. **Status:** research complete, open questions appended.

**Objective:** study "timeout after side effect" — the worker acted, the acknowledgement was lost, retry may double-apply — across mature distributed-systems approaches, and translate each into a PING invariant with a precise failure boundary.

---

## 1. Sources and pinned revisions

### Primary sources (documents, papers, vendor docs)

| ID | Source | Location | Type |
|---|---|---|---|
| S1 | IETF, "The Idempotency-Key HTTP Header Field", draft-ietf-httpapi-idempotency-key-header (reached rev -07, Oct 2025, expired) | https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-02 | standards-track draft describing established practice |
| S2 | Stripe API docs, "Idempotent requests" | https://docs.stripe.com/api/idempotent_requests | vendor API contract |
| S3 | Brandur Leach, "Designing robust and predictable APIs with idempotency" | https://stripe.com/blog/idempotency | engineering design doc (verified HTTP 200, 2026-09-23) |
| S4 | Martin Kleppmann, "How to do distributed locking", 2016 | http://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html | blog post, fencing token + Redlock critique |
| S5 | Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, ch. 8-9 (coordination, consensus, partial failure) | book (ch. 8 covers fencing tokens; ch. 9 consensus) | book |
| S6 | Gunnar Morling, "Revisiting the Outbox Pattern", 2024 | https://www.morling.dev/blog/revisiting-the-outbox-pattern/ | engineering blog; pg_logical_emit_message() WAL variant |
| S7 | Debezium docs, "Outbox Event Router" transformation | https://debezium.io/documentation/reference/3.6/transformations/outbox-event-router.html | vendor docs |
| S8 | Hector Garcia-Molina & Kenneth Salem, "Sagas", SIGMOD 1987 | https://doi.org/10.1145/38713.38742 | foundational paper |
| S9 | Caitie McCaffrey, "Applying the Saga Pattern", GOTO Chicago 2015 | http://gotocon.com/dl/goto-chicago-2015/slides/CaitieMcCaffrey_ApplyingTheSagaPattern.pdf | talk slides (saga log, at-most-once sub-requests, idempotent compensations) |
| S10 | Pat Helland, "Life Beyond Distributed Transactions: An Apostate's Opinion", CIDR 2007 | https://www.cidrdb.org/cidr2007/papers/cidr07p15.pdf (also DOI 10.1145/3012426.3025012, ACM Queue 2016) | paper; memories/guesses/apologies |
| S11 | Apache Kafka documentation (Transactions; producer configs enable.idempotence, transactional.id) | https://kafka.apache.org/documentation/ (verified HTTP 200, 2026-09-23) | vendor docs |
| S12 | NATS JetStream docs, "Publishing / Avoiding duplicate writes" | https://github.com/nats-io/nats.docs.v2/blob/HEAD/learn/jetstream/publishing.md | vendor docs (Nats-Msg-Id + Duplicate Window) |
| S13 | Kubernetes design proposals / controller guidance: level-driven not edge-driven; reconciliation via RateLimitingWorkqueue key dedup | https://github.com/microsoft/dcp/blob/HEAD/doc/authoring-dcp-controllers.md (quoting official K8s controller guidelines) | design doc |
| S14 | PostgreSQL documentation, "Explicit Locking" (Advisory Locks: pg_advisory_lock, pg_try_advisory_lock, session vs transaction scope) | https://www.postgresql.org/docs/current/explicit-locking.html (verified HTTP 200, 2026-09-23) | vendor docs |
| S15 | Mike Burrows, "The Chubby Lock Service for Loosely-Coupled Distributed Systems", OSDI 2006 | paper (lease semantics, lock-delay, sequencers) | paper |
| S16 | Temporal architecture docs (durable execution; deterministic workflows; activities at-least-once, must be idempotent or non-retryable) | temporalio/temporal repo, docs/architecture/README.md (pinned below) | vendor architecture doc |
| S17 | Akka Persistence docs (journal, highestSequenceNr, at-least-once delivery, snapshot store) | akka/akka-core repo, akka-docs/src/main/paradox/persistence.md (pinned below) | vendor docs |

### Pinned GitHub revisions (SHA, fetched via GitHub API 2026-09-23)

| ID | Repo | Path pinned | SHA | Commit date (UTC) |
|---|---|---|---|---|
| P1 | temporalio/temporal | docs/architecture/README.md | `676657cbf41a44dc9b23dfa7182ef8f9435b955c` | 2024-03-19 |
| P2 | akka/akka-core | akka-docs/src/main/paradox/persistence.md | `ce003c7cb20f88c3aaceb1ee3b4dc85121af2b71` | 2026-06-26 |
| P3 | debezium/debezium | debezium-core/.../transforms/outbox/EventRouter.java | `8230409091512bd991f6baa6f59ad69563243e96` | 2026-02-02 |
| P4 | debezium/debezium-examples | outbox/ (demo project) | `81d65a5232c449de74b0671935a8e1eb19ca59b8` | 2026-08-24 |
| P5 | arthurfaby/spring-boot-starter-idempotency | repo HEAD (IETF Idempotency-Key server implementation) | `9346b655710ebda5c2bae762c2735a1fd3b18ec2` | 2026-07-14 |
| P6 | riku-seino/holdfast | repo HEAD (domain-agnostic lease primitive with fencing tokens, Go) | `57c6482068bac4c7786f8f32c9c1378e70aa6be4` | 2026-08-09 |
| P7 | nats-io/nats-server | repo HEAD (JetStream Nats-Msg-Id dedup implementation) | `375492dca0ed1b2e08dde1d4814662c33a34303a` | 2026-09-23 |

---

## 2. Mechanisms (canonical format)

Legend for MATURITY: **PROVEN** = in production at global scale for years; **STANDARD** = widely implemented, well-understood; **ESTABLISHED** = canonical pattern with many independent implementations; **EMERGING** = gaining adoption, fewer independent implementations.

HARVEST_CLASS: **PATTERN** (adopt the design shape) / **CONTRACT** (adopt the API/rule contract) / **SPEC** (adopt the written specification) / **COMPONENT** (lift a concrete implementation) / **ANTI-PATTERN** (adopt the prohibition).

---

### M1 — Client-generated idempotency keys with server-side response cache (Stripe model)

- **MECHANISM_ID:** M1
- **PROBLEM:** Retry of a mutating request after a lost response can double-apply the side effect (double charge). The client cannot tell whether the original request executed.
- **SOURCE:** S2 (Stripe API docs), S3 (Brandur Leach), S1 (IETF draft), P5 (arthurfaby implementation)
- **PINNED_SHA:** P5 `9346b655710ebda5c2bae762c2735a1fd3b18ec2`; S1-S3 are docs (no SHA).
- **SOURCE_LOCATION:** https://docs.stripe.com/api/idempotent_requests ; https://stripe.com/blog/idempotency ; IETF draft section 2 (key generation, uniqueness, fingerprint)
- **MATURITY:** PROVEN. Stripe has run this on payment traffic since ~2013; copied by Adyen, PayPal, and the IETF draft.
- **INVARIANT:** A retry carrying the same key returns the original result (status + body, cached "regardless of whether it succeeds or fails") without re-executing the effect. Same key + different payload is a client bug and returns an error (Stripe: 400 idempotency_error); same key while the original is in flight returns 409 so the caller backs off. Keys are scoped to the account: (account_id, key). Keys expire (Stripe: 24h, then reusable).
- **IMPLEMENTATION:** Caller mints a UUIDv4 per *logical operation* (per checkout attempt, not per HTTP attempt) and sends `Idempotency-Key`. Server does an atomic claim on the key (unique index on (scope, key); the INSERT either wins or conflicts — "the store is the claim"). Winner executes and records (status, body); losers/retries replay the record. The IETF draft adds the "idempotency fingerprint" (checksum of the payload, generated server-side) to detect key reuse with different parameters.
- **FAILURE_MODE:** (a) **Dedup store unavailable:** the claim cannot be arbitrated, so the server cannot safely execute *or* safely refuse. Fail closed: refuse the request (5xx) rather than execute without a claim; executing would reintroduce double-apply. (b) **Clock skew:** irrelevant to correctness (keys are compared by equality, not time); skew only shifts the expiry window, bounded by the operator's retention choice. (c) **Two workers hold the same key:** the unique-index race decides exactly one winner; the loser sees the claim and returns 409 while in flight or replays the record after completion. Double-apply requires the store itself to violate uniqueness, i.e. a split-brain store — which is why the claim store must be linearizable for the key namespace. (d) **Expiry:** after the window, the same key starts fresh; retries older than the window are not protected. Choosing the window is choosing the maximum tolerated retry age.
- **PING_EXISTING_ANALOG:** Partial. PING's antifragile directive prefers "idempotent operations," and the event plane records evidence, but there is no documented per-effect idempotency-key claim store or response cache in PING.
- **GAP:** PING has no named, scoped idempotency-key contract for agent-initiated effects (tool calls, sends, publishes); no documented key-generation rule (who mints? per what logical operation?); no keyed response cache for replaying acknowledgements.
- **HARVEST_CLASS:** CONTRACT + PATTERN. Adopt: caller mints key per logical effect; server-side atomic claim on (scope, key); replay stored result; 409 while in flight; fingerprint-on-drift error.
- **FALSIFICATION:** Inject a proxy that drops the first response of every mutating agent action, retries with the same key, and races two workers with the same key concurrently. If any effect is applied twice or any retry returns a different result than the original, the mechanism is broken. If the dedup store is partitioned, the system must refuse (fail closed), never execute unclaimed.
- **DEPENDENCIES:** A linearizable claim store for the key namespace (a Postgres unique index is enough; no global clock needed).

### M2 — Idempotency key leasing with recovery points (Brandur's forward-recovery design)

- **MECHANISM_ID:** M2
- **PROBLEM:** M1's response cache assumes the original request either finished (replay) or never started. A request that died *mid-effect* (charged the card, crashed before storing the charge id) cannot be safely re-executed from scratch, and its cached result does not exist yet.
- **SOURCE:** S3 (Brandur Leach, stripe.com/blog/idempotency), summarized by secondary analysis (the-devops-daily post)
- **PINNED_SHA:** none (blog post, verified live 2026-09-23)
- **SOURCE_LOCATION:** https://stripe.com/blog/idempotency (key row: key + account, `locked_at`, `recovery_point` naming last completed phase, request fingerprint, stored response; plus enqueuer / completer / reaper processes)
- **MATURITY:** PROVEN (Stripe's production design).
- **INVARIANT:** A retry never re-runs a phase that already completed: it claims the key, reads `recovery_point` (e.g. started → ride_created → charge_created → finished), and executes only the remaining phases. A concurrent retry while `locked_at` is live gets 409. A completer process drives unfinished keys to completion when the client stops retrying. A reaper deletes keys past retention (~72h in the reference design; Stripe API prunes at 24h+).
- **IMPLEMENTATION:** The idempotency row is a small state machine, not just a cache: `INSERT ... ON CONFLICT` claims the key; each completed phase updates `recovery_point` in the same transaction as the phase's durable side effect; every phase's downstream call carries a *derived* idempotency key (from the parent key), so re-running a phase against a downstream that is itself keyed is safe. This makes the design recursive: the requirement propagates one hop down.
- **FAILURE_MODE:** (a) **Recovery point not updated atomically with the phase effect:** retry re-runs a completed phase → double side effect downstream *unless* the downstream call itself carries the derived key and the downstream honors it. The design only closes if every hop is keyed. (b) **Completer down:** keys stall in UNKNOWN until the client retries or the completer recovers; no incorrectness, only latency — forward recovery degrades to client-driven retry. (c) **Clock skew:** `locked_at` leases are time-based; skew between the process holding the lease and the process judging expiry can cause a premature 409-release or a delayed release. Bound it with lease durations >> max expected skew, or use fencing tokens (M12) instead of wall-clock expiry for safety-critical phases. (d) **Two workers, same key:** the lease serializes them; a worker whose lease expired mid-phase discovers on its next write that the key moved (or loses the claim race) and must abort rather than continue.
- **PING_EXISTING_ANALOG:** Closest analog is the saga/checkpoint thinking in the autonomy challenge itself; no recovery_point-style keyed phase journal observed in PING artifacts.
- **GAP:** PING effects are not decomposed into named, keyed phases with recorded recovery points; a crashed mid-effect agent action has no standard resume-from-phase-N mechanism.
- **HARVEST_CLASS:** PATTERN. Adopt the row shape: (scope, key, lease, recovery_point, fingerprint, result) + completer + reaper.
- **FALSIFICATION:** Kill a worker between phase N and the recovery_point write; restart a new worker with the same key. If phase N executes twice against a non-idempotent downstream, the mechanism failed. If the completer is stopped, keys must remain safely stalled (no effect), not silently dropped.
- **DEPENDENCIES:** Keyed downstream hops (M1 at every hop); a lease store; bounded clock skew for lease expiry only.

### M3 — Effect journals / write-ahead logs (Akka persistence, Temporal history, Postgres WAL)

- **MECHANISM_ID:** M3
- **PROBLEM:** An agent process is disposable: crashes, restarts, and redeploys must not lose the record of which effects were applied or leave an effect half-recorded.
- **SOURCE:** S17 (Akka persistence docs), S16 (Temporal architecture), S6 (pg_logical_emit_message WAL variant)
- **PINNED_SHA:** P2 `ce003c7cb20f88c3aaceb1ee3b4dc85121af2b71`; P1 `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **SOURCE_LOCATION:** Akka docs §Architecture (AsyncWriteJournal, highestSequenceNr, AtLeastOnceDelivery); Temporal docs/architecture/README.md ("append-only history of events ... all required workflow state can be recreated at any time by replaying"); Morling blog (WAL as the outbox transport).
- **MATURITY:** PROVEN. Akka persistence since 2014; Temporal's event-sourced execution; every serious database since forever.
- **INVARIANT:** The journal is append-only and is the source of truth: state is *derived* by replay, never the primary record. Akka: `highestSequenceNr` increases per persisted message; recovery replays journaled messages after restart and stashes new messages during recovery. Temporal: workflow code must be deterministic and side-effect-free; only *activity* results are journaled as checkpoints, so re-execution of orchestration code is free and activities are never re-run once their result is in the history.
- **IMPLEMENTATION:** Separate *decision* (append intent + parameters to the journal) from *execution* (perform the effect, then append the outcome). On restart: replay the journal, resume from the last recorded outcome, never from a guess. Snapshots bound replay cost (Akka snapshot store).
- **FAILURE_MODE:** (a) **Journal unavailable:** the worker cannot record intent; it must stop acting (fail closed) — acting without journaling recreates the unknown-outcome hole. (b) **Effect applied but outcome append lost (crash between):** recovery sees intent-without-outcome = UNKNOWN and must resolve via M9 (reconcile/query actual state) or M2 (recovery point) — the journal alone cannot tell you what happened outside it. (c) **Non-deterministic replay (Temporal's sharp edge):** if workflow code is non-deterministic, replay diverges from history and the system detects history mismatch and fails the workflow task. The journal's power depends on the replay function being pure. (d) **Journal corruption/loss:** total; mitigate with replication (Akka replicated-journal community plugins; Temporal's replicated history).
- **PING_EXISTING_ANALOG:** Strongest existing analog in PING: the event/evidence plane ("event/evidence plane is the recorder"), PING as canonical knowledge authority, and the antifragile directive's "checkpoints over fragile long sessions." The analogy is architectural, not a deployed journal for agent effects.
- **GAP:** No mandated journal-before-effect discipline for agent actions; no snapshot/replay story for long-running agent plans; the evidence plane records *after* the fact, which is necessary but not sufficient for resume-safety.
- **HARVEST_CLASS:** PATTERN. Adopt: append intent → execute → append outcome; recovery = replay + resume-from-last-outcome; keep orchestration deterministic and side-effect-free.
- **FALSIFICATION:** Crash a worker at three points: before intent append, between intent and effect, between effect and outcome append. After restart, the worker must (1) never re-plan completed work, (2) never treat intent-without-outcome as completed, (3) converge to exactly-one application per effect.
- **DEPENDENCIES:** Durable append-only store; deterministic replay function; snapshots to bound recovery time.

### M4 — Transactional outbox (dual-write elimination)

- **MECHANISM_ID:** M4
- **PROBLEM:** "Record the business change" (DB write) and "tell the world" (publish/send) are two writes to two systems with no shared commit. Crash between them = change without notification (or notification without change).
- **SOURCE:** S6 (Morling), S7 (Debezium Outbox Event Router), P3/P4 (Debezium implementation + demo)
- **PINNED_SHA:** P3 `8230409091512bd991f6baa6f59ad69563243e96`; P4 `81d65a5232c449de74b0671935a8e1eb19ca59b8`
- **SOURCE_LOCATION:** morling.dev "Revisiting the Outbox Pattern"; Debezium reference docs §outbox-event-router; EventRouter.java (routes outbox rows to per-aggregate topics); debezium-examples/outbox.
- **MATURITY:** PROVEN. Standard microservices pattern; Debezium first-class support; used at large scale.
- **INVARIANT:** The domain write and the "intent to publish" commit atomically in one database transaction. A separate relay (polling publisher or CDC from the WAL) forwards outbox rows to the broker. Once committed, an event cannot be lost — only delayed. Downstream delivery is at-least-once; the consumer must be idempotent (M6) or keyed (M1).
- **IMPLEMENTATION:** `BEGIN; INSERT INTO domain ...; INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload) ...; COMMIT;` Relay: (a) polling publisher with `published_at` marking, or (b) Debezium CDC reading the WAL — no polling, no extra write load, position tracked by replication slot. Morling's WAL-native variant skips the table entirely: `SELECT pg_logical_emit_message(true, 'prefix', payload)` inside the transaction. Outbox table is append-only; mark delivery in a separate projection table, never by mutating payloads.
- **FAILURE_MODE:** (a) **Relay down:** events queue in the outbox; no loss, but downstream staleness grows unboundedly — needs lag alerting. (b) **Relay crashes after publish, before marking:** duplicate publish → requires idempotent consumers (at-least-once is intrinsic; "exactly-once delivery" is not achievable, only exactly-once *effect* via M6/M1). (c) **CDC replication slot lag / WAL retention:** if the slot falls behind past WAL retention, the connector cannot resume and needs a re-snapshot; monitor slot lag as a first-class signal. (d) **Poison event:** a malformed payload that always fails downstream blocks ordered relays; needs a dead-letter path, not silent skip (M9 tri-state applies to the relay too).
- **PING_EXISTING_ANALOG:** None observed as a named pattern. PING's event plane records events, but the specific atomic (state-write + publish-intent) pairing for agent side effects is not documented.
- **GAP:** Agent actions that both mutate PING state and notify the outside world (messages, posts, emails) do the dual write without an atomic pairing; a crash between DB commit and send = silent loss; a crash between send and commit = phantom action recorded as not-done.
- **HARVEST_CLASS:** PATTERN + COMPONENT (Debezium EventRouter.java pinned as reference implementation).
- **FALSIFICATION:** Crash the worker between domain commit and publish, and separately kill the relay mid-batch. After recovery: every committed domain change must have exactly-one corresponding downstream delivery *effect* (duplicates allowed on the wire only if the consumer dedups), and no downstream delivery may exist without its committed domain change.
- **DEPENDENCIES:** Same-transaction DB for state + outbox; a relay (polling or CDC); idempotent consumers downstream.

### M5 — Inbox pattern (idempotent consumer / consumer-side dedup)

- **MECHANISM_ID:** M5
- **PROBLEM:** M4 (and all at-least-once delivery: Akka AtLeastOnceDelivery, NATS redelivery, Kafka rebalances) guarantees redelivery. A consumer that applies the effect and then crashes before committing its offset applies it twice.
- **SOURCE:** S6/S7 context (Debezium ecosystem), S17 (Akka AtLeastOnceDelivery semantics); classic formulation in microservices pattern literature (consumer stores processed message IDs in its own DB transaction)
- **PINNED_SHA:** none specific (pattern-level; implementation is trivially small)
- **SOURCE_LOCATION:** Pattern: consumer keeps an `inbox` / `processed_messages(message_id)` table; handling is `BEGIN; INSERT INTO processed_messages(id) — on conflict, skip; apply effect; COMMIT;`. The insert's unique constraint is the arbiter (same "store is the claim" trick as M1).
- **MATURITY:** ESTABLISHED. The standard answer to "exactly-once" in event-driven systems: at-least-once delivery + idempotent/inbox-guarded processing = exactly-once *effect*.
- **INVARIANT:** Each message ID is applied at most once per consumer, even under redelivery, consumer crash between apply and offset commit, or consumer failover. Combined with M4's at-least-once delivery, the pipeline gives exactly-once effect.
- **IMPLEMENTATION:** The dedup insert and the effect's state change share one transaction (collapses to "M4 in reverse"). For effects that are inherently idempotent (set-balance-to-X, upsert), the inbox table can be skipped; for non-idempotent effects (increment, send, charge) it is mandatory. Message IDs must be stable across redelivery (producer-assigned, e.g. NATS Nats-Msg-Id, Kafka producer sequence).
- **FAILURE_MODE:** (a) **Inbox store unavailable:** consumer must stop (fail closed); consuming without the guard reintroduces double-apply. (b) **Inbox table pruned too aggressively:** a redelivery older than the retention window is treated as new → duplicate effect. Retention must exceed the maximum redelivery age (same window-sizing discipline as M7). (c) **Two consumers in the same group process the same message:** the unique insert serializes them only if they share the inbox store; separate stores per consumer instance = no mutual exclusion. Consumer-group correctness depends on partition assignment being exclusive, not on the inbox. (d) **Non-transactional effect:** if the effect cannot be in the same transaction as the inbox insert (external API call), the consumer is back to M1 (key the external call) — the inbox alone does not cover external effects.
- **PING_EXISTING_ANALOG:** None observed as a named pattern.
- **GAP:** PING consumers of its own event plane (projections, goal workspaces, notification fan-out) have no documented dedup-on-consume discipline; replays/rebuilds could double-apply non-idempotent projections.
- **HARVEST_CLASS:** PATTERN. Adopt: every event consumer keeps a processed-ID table in its own transaction; or prove the handler is naturally idempotent.
- **FALSIFICATION:** Deliver the same event 3x with consumer kills between receive and commit, plus a failover to a second consumer. Count applied effects: must be exactly 1. Then prune the inbox and redeliver: must document the resulting behavior (expected duplicate) and the retention bound that prevents it in production.
- **DEPENDENCIES:** Stable producer-assigned message IDs; consumer-local transactional store; retention ≥ max redelivery age.

### M6 — Deduplication windows (bounded-memory dedup)

- **MECHANISM_ID:** M6
- **PROBLEM:** Unbounded dedup state grows forever. Real systems bound it with a time window — which converts "duplicate" into "duplicate *within W*."
- **SOURCE:** S12 (NATS JetStream docs), S2 (Stripe 24h key expiry), P7 (nats-server implementation)
- **PINNED_SHA:** P7 `375492dca0ed1b2e08dde1d4814662c33a34303a`
- **SOURCE_LOCATION:** nats.docs.v2 learn/jetstream/publishing.md ("A failed publish doesn't mean the message wasn't stored: a timeout can fire after the server stored the message, with only the ack lost. A plain retry then stores the same message twice... tag the publish with a Nats-Msg-Id header. The server refuses to store the same ID twice within the stream's duplicate-tracking window"); stream config `Duplicate Window` (default 2 minutes; "If a message with an ID that has already been received is received outside the window, it will be accepted").
- **MATURITY:** PROVEN (NATS JetStream, Stripe, Kafka transactional-state retention all use windows).
- **INVARIANT:** Within the window, same ID ⇒ same outcome (PubAck `duplicate: true`, no new store). Outside the window, the ID may be accepted again. The window is a *contract about retry age*: retries older than W are not protected.
- **IMPLEMENTATION:** Stream-level `duplicate_window` (nanoseconds in NATS config); server keeps an ID→sequence map for W. Stripe: keys pruned after ≥24h. Kafka: transactional state + producer IDs retained per `transactional.id` expiration. Size the window from: max plausible retry age = client timeout × max attempts + max client outage + max clock skew + margin.
- **FAILURE_MODE:** (a) **Window shorter than retry age:** the classic hole — a client that retries after a long outage (deploy, partition) gets a *fresh* accept and double-applies. This is the precise failure boundary of every windowed scheme, and it is a *configuration* failure, not a code bug. (b) **Clock skew on window enforcement:** server-side wall clock decides expiry; skew between servers in a cluster can make the window ragged at the edges. (c) **Memory pressure:** the ID map is proportional to publish rate × W; operators shrink W under pressure, silently weakening the guarantee — the window must be a monitored SLO, not a tuning knob. (d) **Two publishers, same ID, different payloads:** NATS dedups on ID only (first wins within window); Stripe fingerprints the payload and errors. ID-only dedup silently drops the second *intent* — acceptable for retries, wrong for key collision across distinct operations.
- **PING_EXISTING_ANALOG:** None observed (no documented dedup window anywhere in PING).
- **GAP:** Any future PING dedup must state its window and the retry-age bound it defends; otherwise the protection is undefined.
- **HARVEST_CLASS:** CONTRACT. Adopt: every dedup mechanism ships with a documented window W and the inequality `W ≥ max_retry_age + skew + margin`, monitored.
- **FALSIFICATION:** Publish with ID X, wait W+ε, publish X again. Assert the second is accepted (documents the boundary). Then retry at W−ε and assert dedup. If W is not configurable or not documented, the mechanism fails the test.
- **DEPENDENCIES:** Server wall clock (only for expiry); bounded ID-map memory.

### M7 — Reconciliation loops (level-triggered control)

- **MECHANISM_ID:** M7
- **PROBLEM:** Event-driven ("edge-triggered") reactions lose repairs when events are missed: crash, network blip, dropped watch. A missed "pod died" event never comes back.
- **SOURCE:** S13 (K8s controller guidance via microsoft/dcp doc)
- **PINNED_SHA:** none (design doc; HEAD reference)
- **SOURCE_LOCATION:** https://github.com/microsoft/dcp/blob/HEAD/doc/authoring-dcp-controllers.md — "You can't count on having seen a transition, only that you now observe the current state"; informers guarantee eventual current state, not every intermediate; workqueue coalesces N events for one key into one reconcile.
- **MATURITY:** PROVEN. Every Kubernetes controller (Deployments, StatefulSets, Jobs) runs Observe → Diff → Act → Repeat.
- **INVARIANT:** Correct behavior given *desired state* and *observed state*, regardless of how many intermediate updates were missed. A missed event is a delayed repair, never a lost repair. The reconcile function is a pure function of (desired, actual) → actions, safe to restart, replay, or run on a timer with nothing wrong.
- **IMPLEMENTATION:** `spec` = desired (user intent, immutable-by-controller); `status` = observed (controller-owned, with conditions). Reconcile: read both fresh, compute the diff, act to close it, update status. Never branch on "what changed" — the trigger carries only a key (namespace/name), not a delta. Rate-limited workqueue gives dedup and backoff for free.
- **FAILURE_MODE:** (a) **Observe is stale:** acting on a stale cache causes flapping or conflicting writes; K8s mitigates with resourceVersions and optimistic concurrency on update (conflict → requeue, re-observe). Any reconciler needs a freshness bound on its observations. (b) **Act is non-idempotent:** if "create 1 pod" is executed twice because status wasn't updated between loops, you get 2 pods; K8s relies on the API server's own semantics + re-observation. Reconcile actions must be idempotent or guarded by re-observation before acting. (c) **Desired state itself is ambiguous:** level-triggering cannot fix a spec that doesn't say what "done" looks like; every reconciled object needs a crisp desired-state definition. (d) **Thrashing:** two controllers (or a human) fighting over the same actual state → hot loop; needs ownership/fencing (M11/M12) on who may mutate.
- **PING_EXISTING_ANALOG:** Partial/analogous. PING's goal machinery and the antifragile "observe → verify → continue" loop rhyme with reconciliation, but no documented level-triggered reconciler with a spec/status split for agent-managed state was observed.
- **GAP:** PING agent plans are typically edge-driven (do step N when step N−1's event arrives); a lost completion event stalls or double-fires the plan. No standing "desired vs observed" reconciler for long-running agent work.
- **HARVEST_CLASS:** PATTERN. Adopt: spec/status split; reconcile(desired, observed) as the only repair path; triggers carry keys, never deltas.
- **FALSIFICATION:** Kill the controller mid-repair, drop half its event stream, and hand-edit actual state out from under it. On restart it must converge to desired without any catch-up code path, without duplicating already-applied actions (requires idempotent acts or re-observation).
- **DEPENDENCIES:** A readable actual-state source with a freshness bound; idempotent act primitives; unambiguous desired-state schema.

### M8 — Unknown-outcome tri-state (the core impossibility)

- **MECHANISM_ID:** M8
- **PROBLEM:** After a timeout, the caller's knowledge is exactly three-valued: KNOWN_APPLIED / KNOWN_NOT_APPLIED / UNKNOWN. UNKNOWN is irreducible: no amount of local reasoning distinguishes "died before the effect" from "died after the effect, before the ack." (This is the practical face of the Two Generals problem; Kleppmann DDIA ch. 8 treats it under partial failure; Helland S10 reframes it as memories/guesses/apologies.)
- **SOURCE:** S4/S5 (Kleppmann), S10 (Helland); the tri-state vocabulary is standard in reliability engineering
- **PINNED_SHA:** none (conceptual; grounded in S4/S5/S10)
- **SOURCE_LOCATION:** martin.kleppmann.com distributed-locking post (the paused-client scenario is the canonical UNKNOWN illustration); Helland CIDR 2007 (act on memories, guess, apologize).
- **MATURITY:** PROVEN as a concept; every mechanism in this lane is a response to it.
- **INVARIANT:** There are exactly three legal exits from UNKNOWN: (1) **make the effect idempotent under a key** (M1/M2) so the distinction stops mattering; (2) **observe the actual state** (M7) and reconcile; (3) **compensate** (M10) once observation shows the effect landed undesirably. "Retry and hope" is not an exit — it converts UNKNOWN into *possibly-double-applied*, which is worse. Timeouts must therefore never be treated as failures of the *effect*, only as failures of *knowledge*.
- **IMPLEMENTATION:** Model every effect's outcome as the tri-state explicitly in code (an enum, not a boolean). UNKNOWN is sticky: it survives process restarts (persist it in the journal, M3) and may only be cleared by (a) a keyed retry that returns the original result, (b) an independent observation of the effect's footprint, or (c) a completed compensation. Time-bounding UNKNOWN is allowed only via M6's documented window, and expiry converts UNKNOWN → "presumed not-applied, key retired," which must be a conscious risk acceptance.
- **FAILURE_MODE:** (a) **Collapsing UNKNOWN into a boolean:** the single most common bug — `if timeout: mark failed` (loses applied effects) or `if timeout: retry blindly` (double-applies). (b) **Observation that isn't independent:** "checking" by asking the same failed path replays the same ignorance; the observation must come from a different channel than the failed ack (read the resource, not the response). (c) **Unbounded UNKNOWN:** without a completer/reconciler (M2/M7), UNKNOWN entries accumulate into operational debt; they need a sweeper with an SLA.
- **PING_EXISTING_ANALOG:** The autonomy challenge's failure taxonomy likely names timeouts, but no tri-state outcome model for agent effects was observed in the provided context.
- **GAP:** PING needs the tri-state as a first-class type in its effect model; every agent tool call / send / publish should resolve to exactly one of the three states, with UNKNOWN persisted, not thrown away.
- **HARVEST_CLASS:** SPEC. Adopt the tri-state as the canonical outcome vocabulary for all PING effects.
- **FALSIFICATION:** For every effect type, produce the three outcomes in a chaos test (success, clean failure, ack-loss). Assert the system records UNKNOWN (not failed, not success) on ack-loss, persists it across restart, and clears it only via keyed retry, independent observation, or compensation. Any boolean collapse fails the test.
- **DEPENDENCIES:** A journal to persist UNKNOWN (M3); at least one of M1/M2/M7/M10 to resolve it.

### M9 — Sagas and compensation (orchestrated and choreographed)

- **MECHANISM_ID:** M9
- **PROBLEM:** A multi-step business process spans services with no shared transaction (2PC doesn't survive long-lived, cross-boundary work). Partial completion must be driven to a coherent end state anyway.
- **SOURCE:** S8 (Garcia-Molina & Salem 1987), S9 (McCaffrey GOTO 2015), S10 (Helland)
- **PINNED_SHA:** none (papers/slides)
- **SOURCE_LOCATION:** doi:10.1145/38713.38742 (saga = sequence of local transactions T1..Tn with compensating transactions C1..Cn); McCaffrey slides (forward recovery preferred; sub-requests at-most-once, compensations at-least-once and idempotent; distributed/durable saga log; "safe states" require both Start and End logged).
- **MATURITY:** PROVEN. The standard pattern for distributed business transactions (travel booking, order fulfillment, Temporal's recommended saga implementation).
- **INVARIANT:** Every saga ends in one of two shapes: T1..Tn (all applied) or T1..Tj, Cj..C1 (forward progress then compensations in reverse order). Compensations are business operations (refund, not DELETE) — the log shows what actually happened, including the apology. McCaffrey's messaging semantics: sub-requests at-most-once, compensating requests at-least-once **and idempotent**, coordinated through a durable saga log.
- **IMPLEMENTATION:** Orchestration (central coordinator owns the saga log; simpler to reason about, coordinator is a SPOF for progress) or choreography (services react to events; no SPOF, but the "current state of the saga" exists nowhere — debugging is archaeology). Prefer orchestration for agent work: the orchestrator's log *is* the saga state. Each step needs: an idempotent forward action (M1-keyed), a compensating action that is itself idempotent and retryable, and a logged transition. Forward recovery (retry the failed step) is preferred over backward recovery (compensate everything) when the failure is transient.
- **FAILURE_MODE:** (a) **No isolation between sagas:** concurrent sagas see each other's partial state (the "lack of isolation" weakness); compensations must be written to tolerate interleaving, or steps need semantic locks (M11/M12). (b) **Compensation itself fails:** at-least-once + idempotent compensations must be retried by a sweeper (M7) — a saga that gives up mid-compensation leaves the business in a half-apologized state; McCaffrey's "unsafe state" (Start logged, End not logged) requires abort + compensations, never silent drop. (c) **Non-compensable steps:** some effects have no inverse (sent email, fired missile); these must be placed last (the "pivot" step) or made conditional on all compensable steps succeeding. (d) **Choreography without a log:** if no component holds the saga log, a crash loses the saga's position — choreography still needs a durable, queryable saga record somewhere.
- **PING_EXISTING_ANALOG:** Analogous to multi-step agent plans with undo/rollback thinking; no durable saga log with compensating actions observed.
- **GAP:** Agent multi-step plans lack a durable saga log, named compensations per step, and the forward-vs-backward recovery policy.
- **HARVEST_CLASS:** PATTERN. Adopt: saga log (durable, queryable); per-step compensating action; forward recovery first; compensations idempotent + retried by sweeper.
- **FALSIFICATION:** Run a 5-step saga, kill the orchestrator after step 3's effect but before its log write, then again during compensation of step 2. On recovery the saga must reach exactly one terminal shape (all-forward or forward+compensations), never a mix, and re-running compensation for an already-compensated step must be a no-op.
- **DEPENDENCIES:** Durable saga log (M3); idempotent steps (M1/M2); a sweeper for stuck compensations (M7).

### M10 — Leases (time-bounded exclusive holding)

- **MECHANISM_ID:** M10
- **PROBLEM:** Mutual exclusion without a perfect failure detector: a lock holder may die, so locks must expire — but expiry reintroduces the stale-holder hazard.
- **SOURCE:** S15 (Chubby, OSDI 2006); Kubernetes Lease API (coordination.k8s.io, used for leader election); S4 (Kleppmann's critique of lease-only locking)
- **PINNED_SHA:** none (papers/APIs)
- **SOURCE_LOCATION:** Burrows OSDI'06 (leases with timeouts; lock-delay to let a partitioned holder's effects drain; sequencers as fencing tokens); K8s Lease objects (holder identity + renewTime + leaseDurationSeconds; kube-controller-manager leader election).
- **MATURITY:** PROVEN. Chubby underpins Google infrastructure; K8s leader election runs on leases everywhere.
- **INVARIANT:** At most one holder *believes* it holds the lease at a time — with the known, irreducible exception window when a holder is paused past expiry (GC, partition) while another acquires it. The lease bounds the *duration* of the hazard; it does not eliminate it. Chubby's lock-delay (refusing new acquisitions briefly after expiry) shrinks the window for the partitioned-holder case.
- **IMPLEMENTATION:** Holder renews periodically at < 1/3 of the lease duration; loss of renewal = loss of lease. Lease duration must exceed (max GC pause + max clock skew + max renewal RPC latency) or false expiry is routine. For correctness-critical resources, pair every lease with a fencing token (M12); the lease is then just an efficiency mechanism (who gets to try first), and the token is the safety mechanism (whose writes count).
- **FAILURE_MODE:** (a) **Clock skew between holder and granter:** the granter expires the lease while the holder still believes it is valid (or vice versa). Correctness must never depend on the holder *knowing* it lost the lease — that is exactly what M12 is for. (b) **Lease duration shorter than a stop-the-world pause:** routine false expiry under GC pressure; lengthen the lease or shorten pauses, but the window never closes (Kleppmann's core point: "you cannot check 'is the lock still valid?' right before writing, because GC can pause your thread between the check and the write"). (c) **Split-brain granter:** if the lease service itself partitions, two granters can issue the "same" lease — leases need a consensus-backed granter (ZooKeeper/etcd/Chubby) for correctness use.
- **PING_EXISTING_ANALOG:** PING's agent write authority and goal workspaces imply some notion of exclusive work ownership, but no lease primitive with expiry/renewal was observed.
- **GAP:** No standard lease for "which agent/worker owns this goal/prospect/conversation right now," with expiry and fencing for the paused-worker case.
- **HARVEST_CLASS:** PATTERN. Adopt: leases for liveness/ownership; always pair with fencing tokens where a stale holder's writes would be harmful; never use a bare lease for correctness.
- **FALSIFICATION:** Pause a lease holder (SIGSTOP) past expiry, let a successor acquire and write, then resume the holder and have it write. Without M12, the stale write must be *detected* as having happened (proving the hazard); with M12, the stale write must be rejected. If the system cannot distinguish the two runs, it has no fencing.
- **DEPENDENCIES:** Bounded clock skew for liveness; consensus-backed granter for correctness; M12 for safety.

### M11 — Fencing tokens (stale-worker write rejection)

- **MECHANISM_ID:** M11
- **PROBLEM:** M10's irreducible window: a paused/partitioned worker that still believes it holds the lease writes *after* a successor has taken over. Last-write-wins storage corrupts state.
- **SOURCE:** S4 (Kleppmann 2016), S5 (DDIA ch. 8), P6 (holdfast implementation)
- **PINNED_SHA:** P6 `57c6482068bac4c7786f8f32c9c1378e70aa6be4`
- **SOURCE_LOCATION:** http://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html (the token-33/token-34 scenario); holdfast repo (lease + monotonically increasing token; "Commit with Token: 7 → ErrConflict" after gen 8 committed).
- **MATURITY:** PROVEN. ZooKeeper zxid / znode versions, etcd revisions, Chubby sequencers are all fencing tokens in production.
- **INVARIANT:** Four-piece contract (per the distributed-locking literature): (1) the lock service issues a **strictly monotonically increasing** token with each grant; (2) the client includes the token on every mutation of the protected resource; (3) the resource tracks the highest token it has ever accepted per key; (4) the resource **rejects** any mutation with a lower token, atomically with the mutation. The *resource* enforces it — "a lock service alone cannot fence."
- **IMPLEMENTATION:** Token source needs a total order: consensus log (ZooKeeper zxid, etcd revision, Chubby sequencer) or a single-writer counter (Postgres sequence in a transaction — fine for PING's scale). Enforcement point: `UPDATE ... WHERE fencing_token > $old_token` or a compare-and-set on a stored generation number; rejection is 409/412. Note Kleppmann's punchline: generating the token "likely needs a consensus algorithm" — Redlock is unfit precisely because it produces random nonces, not monotonic tokens.
- **FAILURE_MODE:** (a) **Resource doesn't enforce:** the entire mechanism is void — the most common implementation failure is putting the check in the client or the lock service instead of the storage layer. (b) **Token not monotonic:** any reset/reuse (counter reset on failover, two granters) lets a stale worker back in; token issuance must be at least as durable as the resource. (c) **Granularity mismatch:** token tracked per-key but enforced per-table (or vice versa) — a stale writer to key A gets rejected because key B advanced; scope the high-water mark to the same key the mutation touches. (d) **Read-modify-write without the token on the read:** a stale worker reads fresh state, computes a write, and the write is correctly rejected — but if the worker *acts on the read* externally (sends an email based on stale data), fencing didn't help; fencing protects the resource, not the worker's side channels.
- **PING_EXISTING_ANALOG:** None observed. This is the sharpest gap: PING has concurrent agents/workers and shared state (goals, pipeline, memory) with no stale-writer protection.
- **GAP:** No generation-number/fencing-token column on any shared PING record; no "reject write with older token" enforcement in the storage layer.
- **HARVEST_CLASS:** PATTERN + CONTRACT. Adopt the four-piece contract; token = Postgres sequence or consensus revision; enforce at the storage layer on every mutation of shared agent state.
- **FALSIFICATION:** The M10 pause test, plus: reset the token counter (simulate failover) and show a stale write being accepted — proving monotonicity is load-bearing. Then scope the high-water mark to the wrong granularity and show cross-key false rejections.
- **DEPENDENCIES:** A total-order token source (consensus or single-writer sequence); storage-layer enforcement on the mutation path.

### M12 — Postgres advisory locks (single-node arbitration)

- **MECHANISM_ID:** M12
- **PROBLEM:** Within one database, you need mutual exclusion or signaling that doesn't fit row locks (e.g., "only one worker runs the nightly sweep," "serialize access to an external rate-limited API").
- **SOURCE:** S14 (PostgreSQL docs, Explicit Locking)
- **PINNED_SHA:** none (vendor docs, verified live 2026-09-23)
- **SOURCE_LOCATION:** https://www.postgresql.org/docs/current/explicit-locking.html — `pg_advisory_lock(key)`, `pg_try_advisory_lock(key)`, `pg_advisory_unlock`; session-level (held until unlock or disconnect) vs transaction-level `pg_advisory_xact_lock` (auto-released at commit/rollback).
- **MATURITY:** PROVEN. Standard Postgres feature for decades.
- **INVARIANT:** `pg_try_advisory_lock` gives at-most-one-holder within the database, with automatic release on session death (no orphaned locks from crashed workers — the DB cleans up). Transaction-scoped variant ties the lock lifetime to the transaction: perfect for "claim this work item inside the same transaction that marks it claimed."
- **IMPLEMENTATION:** Work-queue claim: `SELECT pg_try_advisory_xact_lock(hashtext(work_id))` inside the claiming transaction; losers skip. Or session locks for long-lived singletons (one sweeper process). Never use for cross-database or cross-system exclusion — the scope is exactly one Postgres instance.
- **FAILURE_MODE:** (a) **Scope overreach:** advisory locks do not span replicas, failover, or multiple databases — a standby promoted to primary starts with zero locks held. (b) **Session leak:** a worker holding a session-level lock that never disconnects (connection pool!) blocks others indefinitely; pools + session locks are a classic deadlock source — prefer `pg_advisory_xact_lock` or explicit unlock in `finally`. (c) **Key collision:** 64-bit key space shared across all users of the DB; namespace your keys (hashtext('ping:' || domain || ':' || id)). (d) **Not fencing:** an advisory lock has no token; it cannot protect against the paused-holder problem across the lock boundary — it arbitrates *entry*, nothing more.
- **PING_EXISTING_ANALOG:** Unknown whether PING uses Postgres; if it does, this is the cheapest available arbitration primitive and may already be in use informally.
- **GAP:** No documented convention for which singleton/claim uses advisory locks vs leases vs fencing.
- **HARVEST_CLASS:** COMPONENT (if Postgres-backed) / PATTERN. Adopt `pg_try_advisory_xact_lock` for transactional work claiming.
- **FALSIFICATION:** Two workers race `pg_try_advisory_xact_lock` on the same key in a loop; exactly one must win each round, and killing the winner's session must release the lock without manual cleanup. Run against a failed-over replica and document that locks do not survive.
- **DEPENDENCIES:** Single Postgres primary; disciplined key namespacing; transaction-scoped usage preferred.

### M13 — Kafka idempotent producer + transactions (broker-side dedup + atomic multi-partition writes)

- **MECHANISM_ID:** M13
- **PROBLEM:** Producer retries after a lost ack can duplicate records; a producer that writes to multiple partitions/topics has no atomic commit.
- **SOURCE:** S11 (Kafka docs)
- **PINNED_SHA:** none (vendor docs)
- **SOURCE_LOCATION:** https://kafka.apache.org/documentation/ — `enable.idempotence=true` (producer ID + per-partition sequence numbers; broker rejects duplicates/old sequences); transactions (`transactional.id`, `initTransactions`, `sendOffsetsToTransaction`) for atomic produce + offset commit (consume-transform-produce exactly-once *within Kafka*).
- **MATURITY:** PROVEN. KIP-98 (idempotent producer), KIP-12937-era transactions; the backbone of exactly-once stream processing.
- **INVARIANT:** Idempotent producer: per (PID, partition), sequence numbers make retries safe — the broker dedups (PID, seq) within its retained window. Transactions: all writes in a transaction across partitions are atomically visible or invisible; `transactional.id` fencing ensures only one live producer instance per ID (a new instance with the same ID fences the old — zombie producers cannot commit).
- **IMPLEMENTATION:** `enable.idempotence=true` (forces acks=all, retries=Integer.MAX_VALUE, max.in.flight=5 safe ordering). For EOS stream processing: `transactional.id` stable per producer instance; transaction = consume offsets + produce results, committed atomically. Note the scope: exactly-once holds *inside Kafka*; any sink to an external system reintroduces M4/M5.
- **FAILURE_MODE:** (a) **PID/sequence state expiry:** the broker retains producer state bounded by log retention / transaction state; a producer that retries after its state expired can duplicate — same window logic as M6. (b) **`transactional.id` reuse across genuinely distinct producers:** fencing then *kills* a legitimate producer; IDs must be stable per logical instance, unique across instances. (c) **Zombie fencing latency:** fencing happens on `initTransactions`; a zombie can still produce between the new instance's start and its init — the window is small but nonzero; downstream must tolerate it or use M5. (d) **External sink:** transactions do not extend to Postgres/email/Stripe — the boundary is the Kafka cluster.
- **PING_EXISTING_ANALOG:** None observed (no Kafka in the provided PING context).
- **GAP:** If PING ever adopts a broker, this is the reference design; until then, harvest the *ideas* (PID+sequence dedup, transactional.id-style producer fencing) not the component.
- **HARVEST_CLASS:** PATTERN (adapt the fencing-by-stable-producer-ID idea to PING's relay/worker design).
- **FALSIFICATION:** Kill a producer mid-batch with acks lost; restart with same/different transactional.id; assert no duplicate records in the log and that the old instance, if resurrected, cannot commit.
- **DEPENDENCIES:** Kafka broker; stable producer identity; retention ≥ max retry age.

### M14 — Temporal durable execution (workflow ID as idempotency key; activity checkpointing)

- **MECHANISM_ID:** M14
- **PROBLEM:** Long-running, multi-step agent/operator workflows must survive worker crashes, deploys, and retries without re-executing completed side effects and without losing their place.
- **SOURCE:** S16 (Temporal architecture docs), P1
- **PINNED_SHA:** P1 `676657cbf41a44dc9b23dfa7182ef8f9435b955c`
- **SOURCE_LOCATION:** temporalio/temporal docs/architecture/README.md — "The system functions via event sourcing: an append-only history of events is stored for each workflow execution"; "Workflow code must be deterministic and have no side effects... activity code must either be idempotent or non-retryable (i.e. at least once or at most once)."
- **MATURITY:** PROVEN. Temporal (and its predecessor Cadence at Uber) runs mission-critical workflows at scale.
- **INVARIANT:** (namespace, workflowId) is the idempotency key for the whole execution: starting a workflow with an existing ID returns the existing execution instead of starting a duplicate (WorkflowIdReusePolicy governs re-run after close). The event history is the journal (M3); workflow *code* is pure orchestration and freely replayable; *activities* are the effect boundary with at-least-once semantics — hence the hard rule that activities be idempotent or explicitly non-retryable. Heartbeats let long activities report progress so retries resume rather than restart.
- **IMPLEMENTATION:** Split every agent plan into: deterministic orchestrator (no I/O, no randomness, no wall-clock except via Temporal timers) + activities (each carrying an M1 idempotency key derived from workflowId + activity sequence). Signals deliver external events without polling. Sagas (M9) are the recommended multi-service pattern on top.
- **FAILURE_MODE:** (a) **Non-deterministic workflow code** (random, wall-clock, iteration over unordered maps): replay diverges from history → workflow task failures; determinism is a *correctness* requirement, not style. (b) **Non-idempotent retryable activity:** Temporal *will* retry it after worker crash/timeout — charging twice is then a certainty, not a risk. The framework gives you at-least-once; exactly-once effect is your job (M1/M5). (c) **History size:** every activity input/output is persisted (2MB payload limit); chatty agents bloat history — use continue-as-new. (d) **Server as SPOF for progress:** if the Temporal cluster is down, nothing advances — durability is delegated to the cluster's own replication.
- **PING_EXISTING_ANALOG:** Closest conceptual analog: PING's event plane + goal workspaces + deterministic-system preference ("systemized, deterministic systems that do not depend on Pigi personally"). No durable-execution engine observed.
- **GAP:** No (workflowId → execution) idempotency-key registry; no orchestrator/activity split; no heartbeat/progress protocol for long agent actions.
- **HARVEST_CLASS:** PATTERN (+ COMPONENT candidate if PING ever adopts a durable-execution engine). The highest-value harvest is the *discipline*: deterministic orchestration, keyed idempotent activities, history-as-journal.
- **FALSIFICATION:** Start the same workflowId twice concurrently → assert one execution. Kill workers mid-activity repeatedly → assert each activity's effect applied exactly once (requires the activity to be M1-keyed) and the workflow completes. Introduce nondeterminism into workflow code → assert the system detects history divergence rather than silently forking.
- **DEPENDENCIES:** Durable history store (Temporal cluster or equivalent); deterministic orchestration code; idempotent activities.

### M15 — Akka at-least-once delivery + snapshots (crash-proof messaging between actors)

- **MECHANISM_ID:** M15
- **PROBLEM:** Point-to-point messages between stateful workers must survive *both* sides crashing, without the sender blocking forever or the receiver double-applying.
- **SOURCE:** S17 (Akka persistence docs), P2
- **PINNED_SHA:** P2 `ce003c7cb20f88c3aaceb1ee3b4dc85121af2b71`
- **SOURCE_LOCATION:** doc.akka.io persistence §Architecture — `AbstractPersistentActorWithAtLeastOnceDelivery`: sender journals the intent, redelivers on a timer until the receiver confirms; receiver dedups by delivery ID; snapshots bound recovery.
- **MATURITY:** PROVEN (Akka since 2014; the pattern predates it).
- **INVARIANT:** Delivery is at-least-once across JVM crashes on both sides; the receiver's dedup (by redelivery ID) converts it to exactly-once *effect*; unconfirmed messages are redelivered, never silently dropped; `highestSequenceNr` gives a total order per persistent actor for replay.
- **IMPLEMENTATION:** Sender: persist `MsgSent(deliveryId, payload)` → send → on confirm persist `MsgConfirmed(deliveryId)` (or delete); redelivery sweep on a timer. Receiver: keep `Set[deliveryId]` of processed IDs (the inbox, M5) in its own journaled state; confirm after processing. Snapshots cap replay length.
- **FAILURE_MODE:** (a) **Unbounded redelivery state:** the sender's unconfirmed set grows if the receiver is down long — needs the M6 window + dead-letter policy, else memory exhaustion. (b) **Confirm lost:** sender redelivers; receiver must dedup by ID (if the receiver confirms *before* processing and crashes, the message is lost — confirm-after-process is the safe order). (c) **Snapshot/replay skew:** restoring from a snapshot then replaying requires the snapshot's sequence number to be exact; off-by-one replays or skips a message. (d) **Poison message:** a message that always crashes the receiver redelivers forever — needs a redelivery cap + dead-letter queue, i.e., a bounded at-least-once with an explicit give-up state (ties back to M8: give-up converts UNKNOWN → KNOWN_NOT_APPLIED only if the effect is verified absent).
- **PING_EXISTING_ANALOG:** None observed as a named mechanism; PING's agent-to-agent/event flows have no documented delivery semantics.
- **GAP:** No declared delivery semantics (at-most/at-least/exactly-once-effect) for PING's internal event flows; no redelivery/confirm protocol.
- **HARVEST_CLASS:** PATTERN. Adopt: journal intent → send → confirm → journal confirmation; receiver-side dedup; redelivery caps with dead-lettering.
- **FALSIFICATION:** Crash sender after send but before confirm-persist, and crash receiver after process but before confirm-send. After both recover: effect applied exactly once, sender eventually stops redelivering. Then inject a poison message and assert it dead-letters after N redeliveries instead of looping forever.
- **DEPENDENCIES:** Journaled sender and receiver state (M3); stable delivery IDs; a dead-letter sink.

---

## 3. PING invariants

Numbered "PING must..." statements. Each names the failure it prevents and the cheapest enforcing mechanism.

**PI-1. PING must model every effect's outcome as a tri-state (KNOWN_APPLIED / KNOWN_NOT_APPLIED / UNKNOWN), never a boolean.**
Prevents: the two classic collapses — marking a timed-out effect "failed" (loses applied effects) or "retry blindly" (double-applies). Cheapest mechanism: M8 as a spec/type discipline; UNKNOWN persisted in the journal (M3).

**PI-2. PING must mint a caller-generated idempotency key per logical effect, scoped to (tenant/scope, key), before acting.**
Prevents: double-apply on retry-after-timeout; cross-tenant key collision. Cheapest mechanism: M1 — UUIDv4 per logical operation (not per attempt); the "store is the claim" unique-index race.

**PI-3. PING must claim the key atomically in the same transaction that records the effect's outcome, and replay the stored result on key hit.**
Prevents: check-then-act races between two workers holding the same key. Cheapest mechanism: M1's atomic claim + M2's recovery_point row; M12 (`pg_try_advisory_xact_lock`) is the cheapest single-DB claim primitive.

**PI-4. PING must never execute an effect it cannot journal first; if the journal is unavailable, it must refuse to act.**
Prevents: the unknown-outcome hole (acted, no record, ack lost). Cheapest mechanism: M3 — append intent → execute → append outcome; fail closed on journal outage.

**PI-5. PING must pair every state mutation that notifies the outside world with its notification intent in one transaction (outbox), and relay asynchronously.**
Prevents: dual-write inconsistency — committed change nobody hears about, or notification of a change never committed. Cheapest mechanism: M4 — outbox table (or `pg_logical_emit_message()` WAL variant) + relay; consumers idempotent per M5.

**PI-6. PING must treat all internal delivery as at-least-once and make every consumer dedup by stable message ID in its own transaction.**
Prevents: double-applied projections/handlers after redelivery, crash-between-apply-and-commit, or consumer failover. Cheapest mechanism: M5 inbox table (unique insert = the claim); skip only with a proof the handler is naturally idempotent.

**PI-7. PING must document a deduplication window W for every dedup mechanism, with W ≥ max_retry_age + clock_skew + margin, and monitor W as an SLO.**
Prevents: the silent hole where a retry older than the window is treated as new (double-apply by configuration, not by bug). Cheapest mechanism: M6 — a written window inequality plus an alert, not just a config value.

**PI-8. PING must resolve UNKNOWN only by keyed retry returning the original result, by independent observation of the effect's footprint, or by completed compensation — never by re-guessing from the failed channel.**
Prevents: converting UNKNOWN into confidently-wrong (observing via the same broken path replays the same ignorance). Cheapest mechanism: M8 exits + M7 reconciliation (observe actual state, not the ack channel).

**PI-9. PING must reconcile desired vs observed state on a loop, with triggers carrying keys and never deltas.**
Prevents: lost repairs from missed events (edge-triggered stalls/double-fires). Cheapest mechanism: M7 — spec/status split; reconcile(desired, observed) as the only repair path; safe to restart and replay.

**PI-10. PING must run multi-step agent plans as sagas: a durable saga log, one idempotent forward action per step, one idempotent compensating action per step, forward recovery preferred.**
Prevents: half-completed plans with no defined end state; crashed orchestrators losing their place. Cheapest mechanism: M9 (orchestrated); compensations retried by the M7 sweeper, never abandoned mid-apology.

**PI-11. PING must issue a monotonically increasing fencing token with every ownership/lease grant on shared state, and the storage layer must reject mutations carrying an older token.**
Prevents: the stale-worker write — a paused/partitioned agent writing after its lease expired and a successor took over. Cheapest mechanism: M11 — token from a Postgres sequence (single-writer) or consensus revision; `WHERE token > old_token` enforcement on the mutation path. A lease alone (M10) is explicitly *not* sufficient.

**PI-12. PING must never rely on a bare lease/lock for correctness; leases are for liveness and efficiency, fencing tokens are for safety.**
Prevents: Kleppmann's paused-client corruption (GC pause / partition between "check lease" and "write" cannot be closed by checking harder). Cheapest mechanism: M10 + M11 paired; document which shared resources are fenced and which are merely leased.

**PI-13. PING must bound every at-least-once redelivery loop with a cap and a dead-letter sink; giving up must convert UNKNOWN to KNOWN_NOT_APPLIED only after verifying the effect is absent.**
Prevents: infinite poison-message redelivery; and the quieter bug of declaring "not applied" without checking. Cheapest mechanism: M15 redelivery cap + DLQ; verification read before state transition.

**PI-14. PING must keep orchestration deterministic and side-effect-free, with all effects behind keyed, idempotent activities that heartbeat progress.**
Prevents: replay divergence, duplicate side effects on worker crash, and restart-from-zero on long actions. Cheapest mechanism: M14's discipline (even without adopting Temporal itself): pure planner + keyed activities + progress heartbeats.

**PI-15. PING must treat exactly-once as a property of *effects*, never of *delivery*, and must be able to say for each pipeline stage which of M1/M5/M11 provides it.**
Prevents: the marketing-grade "exactly-once delivery" claim that collapses at the first external sink. Cheapest mechanism: an architecture review checklist mapping each stage to its effect-guarantee mechanism; anything unmapped is at-least-once and must be labeled so.

---

## 4. Open questions

1. **Journal substrate:** Does PING have a single durable store suitable for M3/M4 (Postgres? something else?), and is `pg_logical_emit_message()` available as the cheapest WAL-native outbox? The choice between outbox-table + polling vs CDC vs WAL-messages changes the relay design.
2. **Key scope and minting authority:** For agent-initiated effects, what is the "logical operation" that owns a key — the user turn, the plan step, the tool call? Who mints (the orchestrator? the worker?), and what is the tenant/scope component of (scope, key)?
3. **Window sizing inputs:** What are PING's actual max retry age, max worker outage, and max clock skew? PI-7's inequality cannot be written without measured numbers.
4. **Fencing granularity:** Which PING records are shared-mutable across workers (goals, pipeline rows, memory pages, conversation state)? Each needs a generation-number column and a declared token scope (per-row? per-aggregate?).
5. **UNKNOWN sweeper ownership:** Which component runs the M2-completer / M7-reconciler / M13-dead-letter sweeps, on what cadence, and with what SLA? Unowned sweepers are how UNKNOWN becomes permanent.
6. **Non-compensable effects:** Which PING effects have no inverse (sent messages, published posts, paid API calls)? Per M9 these must be ordered last or gated on all compensable steps — is there an inventory?
7. **Temporal adoption vs discipline:** Is PING better served by adopting a durable-execution engine (M14 as a component) or by implementing the M14 discipline on its own journal? The engine buys heartbeats/signals/saga primitives; the discipline avoids a new authority (continuity guardrail: never duplicate PING's event system — check first).
8. **Inbox vs natural idempotency:** For each current PING event consumer, is the handler naturally idempotent (safe to skip M5) or does it need an inbox table? Unmapped consumers are the double-apply surface.
9. **Advisory-lock convention:** If Postgres-backed, should PING standardize on `pg_try_advisory_xact_lock('ping:<domain>:<id>')` for work claiming, and explicitly forbid session-level locks under connection pools (M12 failure mode b)?
10. **Crossing the PING boundary:** M1/M4/M5 assume the downstream honors keys or the consumer is yours. For third-party sinks that honor nothing (many web forms, some email paths), what is PING's policy — accept at-least-once with dedup-on-our-side-impossible, require human confirmation, or refuse the effect? This is the one place "timeout after side effect" may be genuinely uncloseable, and it should be named, not hidden.

---

## 5. Harvest priority (researcher's recommendation)

If PING harvests in order of leverage-per-effort:

1. **M8 tri-state as a type** (spec, ~zero infra): kills the most common bug class by making it unrepresentable.
2. **M1 idempotency keys on agent effects** (contract + one claim table): closes retry-after-timeout, the lane's centerpiece failure.
3. **M3 journal-before-effect + M4 outbox for notify-the-world actions** (pattern): closes dual-write loss.
4. **M11 fencing tokens on shared rows** (pattern): closes the stale-worker write, the failure no lease can fix.
5. **M7 reconciler + M9 saga log for multi-step plans** (pattern): converts crashes from data-loss events into delayed repairs.
6. **M6 windows + M5 inbox + M13 dead-lettering** (contracts): bounds everything above so guarantees are statements with numbers, not vibes.

*End of LANE-12 report.*
