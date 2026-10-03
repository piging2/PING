# Harvest Proposal: Restate (durable objects + exactly-once-ish execution)

**Worker:** harvest leaf worker, 2026-10-02
**Subject:** Restate, a durable execution runtime (Rust server + SDKs), by Restate Software, Inc. / Restate GmbH
**Verdict:** ADAPT (take the mechanism, re-derive clean-room in PING semantics; do NOT adopt the runtime)
**Authority owner:** event-kernel
**Proofs:** 9, 10, 11, 12, 13, 14 (adjacency to 7/8 noted)

---

## 1. What I read (official docs + official repos only, no marketing copy)

All material read 2026-10-02. Extracted text captured in `sources/` (files 01-04) and hashed.

1. `https://github.com/restatedev/restate/blob/main/LICENSE` (server license, BSL 1.1)
   Repo HEAD at read time: `8a383eba008b325340ded34045321673b6373fb0` (2026-10-02T21:21:01Z, via `https://api.github.com/repos/restatedev/restate/commits/main`).
2. `http://docs.restate.dev/references/architecture` (Restate Architecture reference; layered diagram, write path/step lifecycle, failover)
3. `https://docs.restate.dev/foundations/invocations` (invocation model, idempotency, attach, cancel)
4. `https://docs.restate.dev/foundations/services` (three service types comparison; virtual object semantics)
5. `https://docs.restate.dev/foundations/key-concepts` (consistent state, journaled K/V, single-writer)
6. `https://restate.dev/what-is-durable-execution` (Restate Team, updated 2026-06-16: the four durable-execution principles, journaling/replay definition)
7. `https://github.com/restatedev/skills/blob/HEAD/plugins/restatedev/skills/building-restate-services/references/invocation-lifecycle.md` (file at commit `ad359c94612808d5b13fef7adb3b144fac5cd836`: HTTP/Kafka/SDK invocation patterns, lifecycle interaction table, retention defaults, CLI reference)
8. `https://github.com/restatedev/sdk-shared-core/blob/main/LICENSE` (MIT, confirms SDK licensing boundary)

SOURCE_SHA: `sha256:c5f2de6880e1e14f71524a545bc1e4b905c8ec918fcbcda1a6df88172593edee`
(sha256 over concatenated extracted text of sources/01..04; inputs listed in this section)

**License finding (binding detail, FLAG for Nolan):**
- The Restate SERVER (runtime, `restatedev/restate`) is licensed under **Business Source License 1.1** (verified from the repo root LICENSE at main). This is NOT an open-source license; it self-describes that way. Additional Use Grant: free use EXCEPT for a "Public Restate Platform Service" (a managed service letting third parties register deployments and invoke them through Restate's APIs). Each version converts to **Apache 2.0 four years after release** (Change Date: 4 years after release / fourth anniversary of first public distribution, whichever comes first).
- The SDKs / SDK shared core (`restatedev/sdk-shared-core`) are **MIT** (verified from that repo's LICENSE).
- Implication: adopting the runtime binary or server code into any FYD/PING product path before the 4-year change date requires a commercial license or fits only inside the use grant (internal/self-hosted use is permitted; offering FYD-style hosted workflow execution ON TOP of Restate's APIs to third parties is exactly the reserved use). Do not adopt the runtime. The harvested item is the MECHANISM, re-derived clean-room (no BSL code copied), which carries no license encumbrance.

---

## 2. Object model

Restate has three service types (documented at `foundations/services`):

| | Basic Service | Virtual Object | Workflow |
|---|---|---|---|
| What | independent stateless handlers | stateful entity with a unique key | multi-step process, exactly-once per ID |
| State | none | K/V state isolated per object key, retained indefinitely until cleared | state isolated per workflow instance |
| Concurrency | unlimited parallel | single writer per key (+ concurrent read-only shared handlers) | single `run` handler per ID (+ concurrent shared handlers) |
| Use for | ETL, sagas, parallelization, background jobs | user accounts, carts, sessions, agents, state machines | approvals, onboarding, multi-step flows |

- **Virtual Object (the durable object):** identified by a unique key. Key is the entity identity; all state for a key is isolated from other keys. At most one handler with write access runs at a time per key (behaves like a queue per key); different keys execute concurrently; shared handlers (read-only) execute concurrently. State updates are journaled alongside execution steps, so state is never out of sync with execution. The server stores all state and execution history, so handler code stays stateless and horizontally scalable (incl. FaaS, which can be suspended while awaiting timers/signals without holding a process open).
- **Handler contract (service contract):** services are registered as deployments (an HTTP endpoint exposing the service/handler surface). Handler code receives a context object `ctx` with operations: `ctx.run` (journaled step for non-deterministic/external work), `ctx.get`/`ctx.set`/`ctx.clear` (durable K/V), `ctx.sleep` (durable timer), `ctx.send`/RPC (durable service-to-service call), awakeables/durable promises (durable external signals, e.g. human approval), plus `attach`, `orTimeout`. Non-deterministic work MUST go through `ctx.run`; on replay the recorded result is returned instead of re-executing.
- **Workflow:** a keyed virtual object specialized for linear processes: the `run` handler executes exactly once per workflow ID and can pause for external signals via durable promises; shared handlers allow status queries/signals while `run` is active. Workflows have bounded retention (24h after completion by default); critical results should be mirrored to a Virtual Object before completion.

## 3. ID scheme

- **Invocation ID:** a structured ID that **encodes the partition** it belongs to, enabling efficient routing and lookups. Generated when an invocation is enqueued (client -> ingress).
- **Partitioning key:** workflow IDs, virtual-object keys, or **idempotency keys** deterministically hash to a partition. Non-keyed invocations are placed for locality by ingress.
- **Idempotency key:** client-supplied (`idempotency-key` HTTP header), **scoped** (reusing the same key under two different scopes starts two separate invocations; within one scope the key deduplicates), retained 24h by default (`idempotencyRetention`). The processor checks local idempotency state for K on claim; if present, duplicate calls resolve to the same invocation and the already-committed result is returned from the journal without re-execution. Responses cached for 24h.
- **Awakeable IDs:** identifiers for durable promises created by a handler; external systems resolve them via the Restate API; resolution is journaled, so replay returns the recorded value.
- **Cross-partition message dedup:** addressed delivery deduplicated **by sequence numbers**; receiver treats it as a normal log-first operation.
- **Kafka ingress:** each Kafka message becomes an invocation with exactly-once processing guarantees (idempotency key derived from the message).

## 4. State transitions (invocation lifecycle)

Documented write path for an invocation keyed by idempotency key K (`references/architecture`, write-path section):

1. **Client -> Ingress (enqueue):** ingress hashes K, selects the target partition, enqueues the invocation to that partition's log.
2. **Processor leader claims:** consumes the enqueue event, checks local idempotency state for K. If K absent, it **atomically records K and transitions the invocation to RUNNING**, opens a bidirectional stream to the target service endpoint, and pushes the initial invoke journal entry to the handler.
3. **Durable step commit (`ctx.run`):** the service streams back a step result event; the processor appends it to the log. **The moment this append is replicated to quorum defines "the step happened."** From then on the step is recovered on retries and never re-executed.
4. **Materialization + ack:** the processor reads the committed step event back from the log (confirming it still holds leadership), adds the entry to the invocation's journal state (and indexes), then acks the handler so user code proceeds.
5. Other durable actions (state updates, timers, inter-service RPC/messages, durable promises): identical pattern, log first, apply on reading the committed record.
6. **Completion:** journal records completion; result is committed and retrievable (attach) or returned.

Failure path: any in-flight execution can be recovered by any healthy worker. Recovery replays the journal: each previously-completed step returns its recorded result instantly; execution catches up to the point of failure and continues. Failed steps are retried automatically (configurable retry policy).

Control-plane transitions: cancel (cooperative), pause/resume, kill (last resort, no compensation), via SDK/Admin API/CLI (`restate invocations cancel|kill|pause|resume|describe`).

## 5. Authority boundary

- Only the **partition processor LEADER** for a partition may execute invocations. Ingress is leader-aware and routes to the current leader; on leadership change routing updates automatically.
- Strong consensus (built-in Raft) is confined to the control plane (cluster metadata: configurations, partition placement, epochs, segment descriptors). The data path "borrows" consensus as a leader/epoch configuration, revoked and re-assigned on failover.
- **Epoch fencing:** on processor failover the promoted leader obtains a new epoch and appends an epoch-bump record. Late appends from superseded leaders or stale handler attempts (lower epochs) are fenced at the epoch boundary and IGNORED. This is the mechanism that preserves exactly-once properties across failover.
- **Single-writer per virtual-object key** is enforced by keyed queueing in the partition processor: exclusive handlers serialize per key; shared handlers are read-only.
- Journal writes commit only on quorum ack of the partition's log replicas.

## 6. Persistence semantics

- The replicated durable log ("Bifrost") is the **primary durability layer and ground truth**: per-partition single sequencer/leader orders events; a write commits on quorum ack of replicas; segmented virtual log (seal + atomically publish new head) for clean leadership changes without copying data.
- **The operation "happens" at quorum ack.** That commit point defines the durable order of invocations, steps, state updates, messages, timers, completions.
- Partition state lives in an embedded RocksDB materialized cache (journals, idempotency metadata, key-scoped state, timer indices). This cache is **explicitly derivative**: always rebuildable from the log, NOT a second source of truth.
- Recovery bounded by snapshots: periodic RocksDB snapshots uploaded to S3; a fresh processor downloads the latest snapshot and replays only the log suffix since the snapshot's sequence number. Log trimming caps storage/replay cost once state is safely persisted (per durability mode). Followers maintain materialized state for fast failover.
- Retention: invocation journals 24h after completion (configurable), idempotency keys 24h, workflow state 24h post-completion, virtual-object state indefinite.

## 7. Evidence / receipts

- Every invocation has a **journal**: ordered, persisted record of the invoke entry, each completed step with its result, state updates, timers, messages, and completion. Retained 24h after completion by default (configurable).
- **Embedded SQL introspection** over the metadata (Apache DataFusion): `restate sql "SELECT * FROM sys_invocation WHERE ..."` exposes invocations, journals, services, state. This is the built-in evidence/projection surface.
- Idempotency metadata is stored per key (proof that a key was claimed and its result).
- Kafka ingress provides exactly-once message-to-invocation binding.
- Note for harvest: Restate's journal is execution evidence, not business evidence; receipts are machine-grade (what step ran, with what recorded result), suitable for replay, not for customer-facing "why" explanations.

## 8. Retries / failures

- **Automatic per-step retry** with journaled replay: at-least-once execution of handler code, exactly-once effect for journaled steps (completed steps replay recorded results, never re-execute).
- **Retry policy** configurable (backoff, max attempts); non-retryable terminal errors supported by SDKs.
- **No rollback in the runtime:** sagas/compensations are a handler-level pattern (user code writes compensation handlers using journaled steps and terminal errors); `kill` explicitly offers no compensation.
- **Failover:** sealed-segment handover (quorum seals active segment, authoritative tail determined, new sequencer elected via metadata CAS) + processor epoch fencing. In-flight invocations resume transparently; clients need not reconnect.
- **Suspension:** on FaaS, functions suspend while awaiting timers/awakeables (no process held, no wait-time cost).
- **Durable communication:** request-response, async messages, webhooks, delayed calls flow through Restate; a message in flight survives a crash on either end. Cross-partition delivery is exactly-once via log-first recording + sequence-number dedup in the internal shuffler.
- Failure classification in the docs is coarse (OK vs failed step vs terminal); no formal UNKNOWN-vs-FAILED taxonomy in the material read. The commit point (quorum ack) is what resolves ambiguity: a step whose append reached quorum "happened"; anything before that is retried.

## 9. Revocation model

- Cooperative **cancel** of running invocations (SDK/API/CLI); **pause/resume** for operational control; **kill** as last resort with no compensation (documented as such).
- Retention expiry acts as a bounded revocation: idempotency keys expire after 24h (replay/dedup window closes); journals expire after 24h post-completion; workflow state expires 24h after `run` completes (shared handlers then error; mirror critical results to a Virtual Object first).
- Virtual-object K/V state is indefinite until explicit `ctx.clear()`.
- No formal multi-party approval or cryptographic revocation in the material read; revocation is operational (owner/operator), not capability-scoped.

## 10. Tests

- I did not execute Restate's test suite (this worker's assignment is docs/source research; the repo is Rust and was not built). The repo is organized in `crates/` (e.g. `crates/types`, `crates/storage-query-datafusion`, `tools/restatectl`) and ships integration tooling (`restatectl`, embedded SQL introspection, Web UI/CLI) that the docs use as the verification surface (`invocations list/describe`, `sql` queries over `sys_invocation`).
- What IS proven from the material: the mechanism is precisely specified (commit point = quorum-replicated log append; epoch fencing; atomic idempotency claim; journaled step replay). This is the level at which we harvest it: as specified semantics to re-derive, not as a test artifact to port.

## 11. Verdict: ADAPT

**Reason:** The runtime (Rust server, RocksDB, S3 snapshots, cluster control plane) is far too heavy for piging2's zero-dependency target, and it is BSL-1.1 licensed, which bars adopting it into any hosted product surface without a commercial license or waiting out the 4-year change date. ADOPT is out. REJECT would discard a genuinely proven, minimal mechanism that maps 1:1 onto proofs 9-14. So: **take the mechanism, rewrite to PING semantics, clean-room, no Restate code.**

What PING's event-kernel gains: Restate proves that "effectively-once" needs only four things, none of which require the runtime:
(a) a **scoped idempotency key** bound to an **invocation ID** with a bounded dedup window;
(b) an **atomic claim** (record key + transition to RUNNING in one journaled write);
(c) a **commit point**: "the step happened" is defined as journal-acknowledged append of the step receipt, not as the worker's success claim;
(d) **replay-on-recovery** where completed steps return recorded results, plus **epoch fencing** so a superseded worker's late appends are ignored.

## 12. SMALLEST MISSING PRIMITIVE

PING already has an event journal, an intent ledger, and evidence. The ORCA continuation notes record exactly what is missing for Restate-grade recovery (gaps G1-G11: no per-attempt timestamps, unsigned end-of-run write, non-atomic evidence write, no attempted-vs-imported distinction). The smallest primitive that closes those gaps is:

**`AttemptEnvelope`: a journaled, epoch-stamped idempotency envelope with atomic claim and step receipts.**

Concretely, one new event-kernel record type (appended to the existing journal, no new store):
`{ invocation_id, idempotency_key (scoped, TTL-bounded), epoch (writer identity), status: PROPOSED|RUNNING|STEP_RECEIPT|COMPLETED|FAILED|UNKNOWN, step_index, step_receipt (hash of result + digest), prev_envelope_digest }`

Semantics (Restate-derived, PING-rewritten):
1. Creating an invocation = appending a PROPOSED envelope (idempotency key checked atomically at claim; duplicates resolve to the same invocation_id and return the committed receipt).
2. "The step happened" = the STEP_RECEIPT envelope is journal-acknowledged (commit point), independent of the worker's success claim. Worker claims success; only the journaled receipt counts. This is the worker-claim != verified-truth boundary, in one primitive.
3. Recovery = replay from the envelope chain: completed steps return recorded receipts; a new epoch ignores envelopes/attempts carrying a superseded epoch (epoch fencing).
4. Verification (proof 13) and replay (proof 14) read the same envelope chain; the verifier is a reader, never a writer, of receipts.

This is strictly smaller than adopting virtual objects, sagas, or the log infrastructure, and it is the piece proofs 9-14 cannot pass without: create (9), worker result journaled (10), bad result rejected because no receipt was committed / verifier failed (11), retry under a new epoch resumes from receipts (12), VERIFIED only when the verifier's own receipt is journaled (13), replay reconstructs from the envelope chain (14). It also gives proofs 7/8 a durable carrier: owner corrections become journaled state updates on the object's key, preserved across regeneration because they live in the journal, not in the render.

## 13. Dependency analysis

- **DEPENDENCIES: []**. DEPENDENCY_COST: zero.
- The harvested item is a mechanism specification re-derived clean-room from documentation. No Restate code, binaries, SDKs, or crates are used. The SDK MIT license is noted only to document the licensing boundary; the adaptation does not depend on it.
- If a future worker wants protocol compatibility with Restate's ingress, the MIT SDK shared core could be referenced then; it is not needed for this harvest.

## 14. Mapping to the 14 proofs

| Proof | Restate mechanism harvested |
|---|---|
| 9 create one mission | invocation creation + invocation_id (partition-encoded), ingress enqueue |
| 10 worker returns result | bidirectional handler stream + journaled step receipts |
| 11 injected bad result rejected | commit point: worker claim != journaled receipt; verifier failure leaves no receipt, mission stays unverified |
| 12 fallback attempt succeeds | automatic retry + recovery replay from journal under a new epoch |
| 13 VERIFIED only after independent verification | verifier as journal reader; VERIFIED requires the verifier's own committed receipt (attach/awakeable resolution pattern) |
| 14 replay reconstructs state | journal replay (+ snapshot-suffix pattern: latest snapshot, then log suffix) |
| 7/8 (adjacent) | owner corrections as journaled key-scoped state updates; durable promises as the pause-for-approval primitive |

Anything without a proof_id: the BSL runtime itself, the cluster control plane (Raft metadata), S3 snapshots, the embedded SQL/DataFusion introspection, the Web UI/CLI, saga DSLs. All REJECTED for harvest (no proof_id, heavyweight, or license-barred).
