# REPLAY + WITNESS + LINEAGE + TIME: Forensic Verdict
## PING Constitutional Convergence Sprint, Phase 10 / 11 / 13, priority P6

Author: Agent 03 (Replay + Lineage). Witness rows are shared records for Agent 02.
Date: 2026-09-24. Read-only investigation. No source repository was modified.
No em dashes are used in this document.

---

## 1. Executive verdict

**Live replay does NOT reconstruct actual canonical history. It re-executes only
the triggering event through a deterministic kernel and attests to that
execution.** This was proven at the image level against the running
`ping-gateway` container (`ping-gateway:devin-boundary2`, image built
2026-09-16, container running, no source bind mount).

The live mission chain is real and wired end to end in the running image:

- `event_to_mission_bridge.js:63-65`: PROJECTION_CREATED -> REPLAY_VERIFY,
  REPLAY_COMPLETED -> WITNESS_CREATE, WITNESS_CREATED -> LINEAGE_CREATE.
- `mission_scheduler.js`: REPLAY_VERIFY -> `replay` worker.
- `canonical_workers.js` ReplayWorker: builds `replay_events` via
  `_buildReplayEvents()`, calls injected `replayProvider.executeReplay()`,
  emits REPLAY_COMPLETED.
- `gateway_runtime.js`: constructs `KernelReplayExecutionProvider` and passes
  it to `registerCanonicalWorkers`.
- `kernel_replay_execution_provider.js`: converts PING events to kernel
  envelopes, runs `DeterministicReplayEngine.replay()`.

But `_buildReplayEvents()` in the RUNNING IMAGE's `canonical_workers.js`
(lines 441-461) is identical in behavior to source: the production branch
returns ONLY the triggering event as a single-event replay. The Postgres
correlation-group query is an unimplemented comment. No production caller
attaches `payload.replay_events`. Therefore the fingerprint and witness_root
that come out of a live replay attest to the deterministic re-execution of one
event, not to the reconstruction of durable history.

The Python worker chain (`constitutional_runtime.py`: CLAIM_GENERATED ->
ReplayWorker -> REPLAY_EXECUTED -> WitnessWorker -> WITNESS_CREATED ->
LineageWorker -> LINEAGE_CREATED -> ProjectionWorker) DOES read full durable
history, but it is DORMANT: no `constitutional_runtime` process is running on
the host, and the live container runs the JS gateway (`node gateway/server.js`,
which requires `gateway/bootstrap/gateway_runtime.js`). The Python replay is
also weaker: it orders by wall-clock `timestamp ASC` and verifies only a
hardcoded three-type sequence prefix, it does not rebuild state.

**Lineage verdict:** causation survives in the live path as single-hop
`causation_id` propagation (worker `_emit` sets `causation_id: event.event_id`;
LineageWorker builds a causation chain of the immediate parent only). The
unified event runtime (`ping_events`) stores `causation_id`/`correlation_id` in
metadata JSONB with expression indexes and implements full recursive causal-tree
queries (children, descendants, ancestors, correlation group), but these have
ZERO callers: the machinery is built and dormant. The kernel's
`ReplayEventStream.getLineageChain()` exists in two parallel implementations
(TS + compiled JS) and is also never called.

**Time verdict:** constitutional ordering for the kernel store is the integer
`sequence` column of `repository_events` (ORDER BY sequence ASC,
`event_repository.js:181`), which is the correct law. The live unified runtime
(`ping_events`) has NO sequence column; ordering there is wall-clock
`timestamp` from `constitutionalTimeAuthority.nowAsISOString()`. The Python
dormant path orders by wall-clock timestamp, which conflicts with TIME_LAW.

---

## 2. Live pipeline map (proven at image level)

Evidence method: `docker run --rm --entrypoint grep/sh ping-gateway:devin-boundary2 ...`
(read-only image inspection; the running container was not touched).

| Step | Component (image path) | Evidence |
|---|---|---|
| Entry | `gateway/server.js` requires `gateway/bootstrap/gateway_runtime.js` | source line 1; container Cmd `node gateway/server.js` |
| Bridge | `ping-runtime/orchestration/event_to_mission_bridge.js:63-65` | image grep: PROJECTION_CREATED -> REPLAY_VERIFY, REPLAY_COMPLETED -> WITNESS_CREATE, WITNESS_CREATED -> LINEAGE_CREATE |
| Scheduler | `ping-runtime/orchestration/mission_scheduler.js` | maps REPLAY_VERIFY to `replay` worker (source-confirmed) |
| Worker | `ping-runtime/workers/canonical_workers.js:265` (`ReplayWorker`), `_buildReplayEvents` at image lines 441-461 | image grep output: single-event fallback, Postgres query unimplemented |
| Provider | `gateway/kernel_replay_execution_provider.js` (md5-identical to source: a68fe98f82fd69f4abf2d507c7b07ade) | `KernelReplayExecutionProvider` refs present (2x) |
| Engine | `runtime/kernel/replay/deterministic_replay_engine.ts` | `replay()` at image lines 45-90: fresh state machine, apply in order, canonicalize stream, fingerprint, invariants, `witnessAuthority.generateWitness` |

Image vs source divergence (md5): `gateway_runtime.js` and
`canonical_workers.js` and `event_to_mission_bridge.js` DIFFER from current
source (source files were modified after the 2026-09-16 image build); the
replay wiring itself is present in the image. `kernel_replay_execution_provider.js`
is identical.

---

## 3. Replay: adapter surface (/home/nolan/projects/ping-constitutional)

### 3.1 `src/lib/events.ts` ReplayRepository: DORMANT, UNOWNED

- Interface begins around line 41. Its only implementation is in-memory.
- File header explicitly warns events vanish on restart, deployment, scaling,
  cold starts.
- `findAfter` exists only in this file; no consumer found by recursive search.
- `EventRepository` references are confined to this file. API routes import
  only `logEvent`.
- Classification: **DORMANT replay-shaped interface**. Not durable replay.
  UNOWNED.

### 3.2 Editor `EventSystem.replay()`: LIVE but non-durable, specialized

- `src/fyd/editor/event-system.ts`: `EventSystem.replay()` reads store history
  and applies events directly to projections WITHOUT re-emitting (correct
  replay hygiene: no feedback loop).
- `src/fyd/editor/durable-event-store.ts`: admits it is currently in-memory
  only and loads no persisted history.
- Consequence: replay can only replay the current process's memory, never
  durable history.
- Classification: **LIVE within the editor process, specialized, non-durable**.
  Owner: FYD editor EventSystem.

### 3.3 Owner correction replay proof: LIVE specialized

- `src/fyd/editor/owner-events.ts`: replay proof is defined as comparison of
  two folds of the same log from empty state via a canonical digest. This is
  scoped owner-log determinism (did the owner correction survive a rebuild),
  not the constitutional replay authority.
- Classification: **LIVE specialized replay check**. Owner: owner-event
  subsystem. Not a competing constitutional authority.

### 3.4 Editor logical ordering: LIVE process-local

- `src/fyd/editor/sequence-authority.ts`: in-memory incrementing sequence.
- Event builders reuse the command sequence for causal ordering.
- Durable store checks strictly increasing append sequence.
- `appendAll()` validates non-decreasing internal order but does NOT validate
  the first batch sequence against existing `lastSequence`: a real enforcement
  gap if the store is ever made durable (currently moot because it is
  in-memory).
- IDs are `evt_<sequence>`.
- Classification: **LIVE process-local logical order**. Owner: adapter editor
  SequenceAuthority. Not durable, not constitutional.

---

## 4. Replay: canonical core (/home/nolan/ping)

### 4.1 Live JS replay: executes, but does NOT reconstruct history

Chain (all confirmed in the running image unless noted):

1. `event_to_mission_bridge.js:63`: PROJECTION_CREATED -> REPLAY_VERIFY mission.
2. `mission_scheduler.js`: REPLAY_VERIFY -> `replay` worker.
3. `canonical_workers.js` ReplayWorker (image lines 265-287, 441-461):
   - `_buildReplayEvents(event)` returns `payload.replay_events` when a test
     supplies them; **in production returns ONLY the triggering event**
     (`return [{ event_id, event_type, payload, metadata, timestamp }]`).
     The Postgres correlation-group query is an unimplemented comment.
   - Without an injected provider, replay is a structural no-op
     (`verified: false`, `reason: 'no_replay_provider'`).
   - With the provider, calls `replayProvider.executeReplay()` and emits
     REPLAY_COMPLETED with `verified`, `fingerprint`, `witness_root`.
4. `kernel_replay_execution_provider.js:44-80` (image = source):
   - Converts each event to a `CanonicalEventEnvelope`; event IDs are
     synthesized as `evt-ping-<i>-<hash>` when not already `evt-` prefixed.
   - **Nondeterministic input (proven, patch proposed in section 9):**
     `artifactHash = event.canonical_hash || event.metadata?.canonical_hash
     || this._computeHash(JSON.stringify(event.payload || {}))`. Plain
     `JSON.stringify` is key-insertion-order dependent. Proven by regression
     test: `{name,price,tags}` vs `{tags,price,name}` hash to
     `df5ea64574372` vs `14c9d7c3ac027`.
   - Default timestamp `'2026-01-01T00:00:00.000Z'` is fabricated when the
     event lacks one (line 86). Deterministic constant, but masks missing
     data. The engine is timestamp-agnostic (no `timestamp` reference in
     `deterministic_replay_engine.ts`), so this does not enter the fingerprint.
   - Lineage is synthesized at conversion: `_buildLineage` (lines 187-210)
     chains each envelope to the previous envelope in the input array and
     honors a PING `causation_id` only if it references an existing envelope
     in the same batch. With single-event replays, this is a one-node graph.
5. `deterministic_replay_engine.ts` `replay()` (image lines 45-90): fresh
   `ReplayStateMachine`, applies events in order, canonicalizes the whole
   stream via the hash authority, computes the fingerprint, runs invariants,
   and calls `witnessAuthority.generateWitness(eventStream, state, violations)`.
   Returns `canonical_bytes`, `fingerprint`, `witness_root`, `lineage_graph`,
   `state`. Result is deep-frozen.

**Conclusion: CONFIRMED that the canonical JS gateway replay path is live and
wired. REFUTED that it reconstructs actual canonical history: it replays a
single triggering event through a deterministic engine. The witness_root
attests to that execution, not to full-history reconstruction.**

### 4.2 Python worker chain: DORMANT, weaker semantics

- `constitutional_runtime.py:143-146` wires CLAIM_GENERATED -> ReplayWorker ->
  REPLAY_EXECUTED -> WitnessWorker -> WITNESS_CREATED -> LineageWorker ->
  LINEAGE_CREATED -> ProjectionWorker, polling `events WHERE processed_at IS
  NULL ORDER BY timestamp ASC`.
- **DORMANT**: no `constitutional_runtime` process is running on the host;
  the live container runs the JS gateway. Only `main()` test harnesses and
  orchestration indexes reference the workers.
- `workers/replay_worker.py`: reads the full aggregate history from Postgres
  (`ORDER BY timestamp ASC`), hashes serialized rows into a replay
  fingerprint, but "verification" only checks that the first three event types
  equal `DOCUMENT_IMPORTED, OBSERVATION_CREATED, CLAIM_GENERATED`. It does not
  rebuild state. Emits REPLAY_EXECUTED with `datetime.utcnow()` and a UUID.
- Classification: **DORMANT + CONFLICTING** (wall-clock ordering contradicts
  TIME_LAW; fingerprint-only "verification" does not satisfy Replay Law's
  exact reconstruction).
- Do NOT revive or wire this path; convergence direction is to archive it.

### 4.3 `projection_replay.py`: specialized utility, not constitutional replay

- Reads all events from Postgres ordered by timestamp and rebuilds the Qdrant
  collection. Explicitly disclaims witness, governance, and canonical-state
  reconstruction. Deletes and recreates the collection against live Qdrant.
- Classification: **DORMANT specialized projection rebuild**. Not a replay
  authority.

### 4.4 Durable ordered stores exist but are not on the replay path

- `runtime/kernel/event_repository.js`: `repository_events` table with INTEGER
  `sequence` per `object_id`, hash chain (`PreviousEventHash` ->
  `CanonicalEventHash` -> `chain_root`), `causation_id`, `correlation_id`
  columns (lines 24-52). `getEvents(objectId)` returns ORDER BY sequence ASC
  (line 181). This is the correct constitutional-ordered durable store.
- It is NOT called by the live replay path. `getEvents` callers:
  `capability_scheduler.js:463`, `repository-authority.ts`,
  `agent_memory_authority.js`, `distributed_desktop_agents.js`.
- The live replay path builds its `ReplayEventStream` from an envelope array,
  never from this repository.

---

## 5. Lineage: adapter surface

### 5.1 FYD envelope metadata and WhyThis rendering: fragmented, UNOWNED

- Signed social envelopes carry event/payload metadata into the gateway.
- UI `WhyThis` renders lineage passed as props and refuses to invent it.
- Exact chain through `owner-events.ts`, `object-projection.ts`, and
  `ping-object-reader.ts` was partially established; multiple local lineage
  representations exist, but there is **no adapter-owned single constitutional
  lineage authority**. Classification: **fragmented, UNOWNED constitutionally**.

---

## 6. Lineage: canonical core

### 6.1 Live: single-hop causation propagation (LIVE, incomplete)

- `canonical_workers.js` LineageWorker builds `causationChain` containing only
  the immediate `metadata.causation_id`. Worker `_emit` propagates trace
  fields and sets `causation_id: event.event_id` on emitted events, so each hop
  links to its parent.
- `kernel_replay_execution_provider.js:_buildLineage` (lines 187-210) links
  each envelope to the previous envelope in the batch plus any referenced
  `causation_id` present in the same batch. Single-event replays yield
  one-node graphs.
- EVENT_LAW requires `causation_id` and `correlation_id` on every event.
- Classification: **LIVE but incomplete**. Owner: Canonical LineageWorker for
  the mission event; `KernelReplayExecutionProvider` for the conversion-time
  graph.

### 6.2 Unified event runtime causal tree: BUILT, DORMANT

- `ping-runtime/events/unified_event_runtime.js` (live runtime's event spine,
  table `ping_events`):
  - `emit()` (line 71): content-based deterministic `event_id` via
    sha256(JSON.stringify(identity)); `causation_id`/`correlation_id` stored
    in metadata JSONB with expression indexes (lines 61-62).
  - `getChildren` (line ~264), `getDescendants` (line ~278, recursive CTE,
    depth-limited, cycle-guarded), `getAncestors` (line ~311), 
...[truncated 11326 chars]