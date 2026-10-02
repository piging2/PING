# EVENT AUTHORITY VERDICT — Phase 0 Forensics
Date: 2026-09-23 ~20:00 MDT. Read-only. No writes to any repo.
Forensic surface: (a) `/home/nolan/projects/ping` branch `fyd-factory` @ `e48ef71` (dirty WIP, untouched),
(b) `/home/nolan/ping-gateway-src` (gateway runtime source), (c) live `ping-gateway` container
(`ping-gateway:devin-boundary2`, started 2026-09-22T16:54:48Z) + live `ping-postgres` (`crx_runtime`).

## PROVEN CANONICAL AUTHORITY (single, named)
**`UnifiedEventRuntime`** — `ping-runtime/events/unified_event_runtime.js` (class `UnifiedEventRuntime`).
Header comment: "Single canonical event pipeline. Every event flows through here."
Proof it is canonical, not claimed: (1) wired in `gateway/bootstrap/gateway_runtime.js:513`
(`unifiedEventRuntime = new UnifiedEventRuntime({pool, eventValidator, eventGovernance, integrationManager})`
+ `await unifiedEventRuntime.initialize()`); (2) container code == on-disk source, sha256-verified for both
`unified_event_runtime.js` (`2f56ba17…`) and `gateway_runtime.js` (`e295417f…`); (3) live DB schema of `ping_events`
matches `initialize()` DDL exactly; (4) it is the ONLY non-test `INSERT INTO ping_events` in the entire tree
(line 149); (5) `ping_events` holds 739 live rows while every competing event table is empty.

## END-TO-END TRACE (actual code)

### 1. Acquisition → event construction
- Path: `POST /ingest` (`gateway/routes/ingest.js`, `createIngestRoutes`) — "THIN ADAPTER only: validate →
  canonicalize → emit → respond. No business logic lives here."
- Caller: HTTP clients (workers, exterior agents). Callee: `CanonicalizationService.canonicalizeAndEmit`
  (`ping-runtime/canonicalization/canonicalization_service.js:143` → `this._eventRuntime.emit(...)`).
- Also: `POST /events` (`gateway/routes/events.js:post /`) → `eventRuntime.emit(event_type, source, event_data, {metadata, namespace})`
  with tenant-registry isolation + exterior-auth agent attribution (`source = 'api:' + agentId`).
- The website (`/home/nolan/projects/ping`) never writes the journal directly; it POSTs signed envelopes
  to the FYD demo gateway (default `http://127.0.0.1:18199`, currently NOT listening — only 18099 is).

### 2. Event ID creation — `UnifiedEventRuntime.emit`, step 1
- File: `ping-runtime/events/unified_event_runtime.js:74`.
- `eventId = sha256(JSON.stringify({eventType, source, [namespace], logical_id|payload}))` —
  deterministic, content-based, no `Date.now()`. `logical_id` = timestamp-stripped logical identity.
- **IdentityAuthority is NOT on the live path.** `IdentityAuthority.generateId('event', …)` exists
  (kernel `/app/runtime/kernel/authorities/identity_authority.js`: CanonicalBytes → CanonicalAuthority.hashBytes →
  `type_hash[0:16]`) but is only called by the unwired `EventWriteAuthority`.

### 3. Hashing
- The live hash is `node:crypto` SHA-256 over `JSON.stringify` bytes, inline in `emit`.
- **CanonicalHashAuthority is NOT on the live path.** It exists (`gateway/replay/kernel/canonical_hash_authority.js`,
  delegates canonicalization to CanonicalJson) but is only used by the replay machinery.

### 4. Validation / governance (failure paths)
- Step 2: `eventValidator.validateEventType` → `{status:'error', error}` on unknown type, `stats.failed++`.
- Step 3: `eventGovernance.validateEvent` (namespace privacy boundary `core::<name>|tenant::<id>`, resolved once here)
  → rejection returned, nothing persisted.
- Step 5: persist error → `{status:'error', error:'Persist failed: …'}`.

### 5. Persistence — `UnifiedEventRuntime.emit`, step 5
- `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
  VALUES (…) ON CONFLICT (event_id) DO NOTHING`. Duplicate delivery → `deduplicated:true`, handlers NOT re-triggered.
- Timestamp: `constitutionalTimeAuthority.nowAsISOString()`.
- Restart behavior: `initialize()` runs `CREATE TABLE IF NOT EXISTS ping_events` (+ 7 indexes) on every boot;
  idempotent insert makes crash-redelivery safe; no other recovery needed. State written: one row in `ping_events`.

### 6. Dispatch (side effects)
- Step 6: in-process `_handlers` map (`on(eventType, handler)`), first delivery only.
- Step 7: `integrationManager.emit`.
- Live emit callers: `CanonicalizationService` (Review/Customer/Project authorities via POST /ingest),
  `MissionRuntime`, canonical workers (`canonical_workers.js`, `intelligence_worker.js`),
  `POST /events` HTTP, `EventBridge` (polls EMPTY `repository_events`/`canonical_events` every 5s — wired, running, no-op).

### 7. Sequencing
- **NOBODY sequences.** `ping_events` has NO sequence column. Verified via `\d ping_events` live.
- Ordering is by `timestamp DESC` (queries) / `created_at ASC` (causal traversal). The FYD social demo's
  `(sequence DESC, created_at DESC)` "projector ordering" reads a `sequence` field that is always `null`
  in practice (`asSequence` null-fallback; live rows have no such key).

### 8. Read
- `GET /events`, `/events/recent`, `/events/stats`, `/events/:stream`, `/:eventId/{children,descendants,ancestors}`,
  `/events/correlation/:id` → `EventReadAuthority` FIRST (reads `repository_events` — 0 rows — returns `[]`),
  then FALLBACK to direct `pool.query` on `ping_events`. Effective live read path bypasses the authority.
- `UnifiedEventRuntime.query` / `getChildren` / `getDescendants` / `getAncestors` / `getCorrelationGroup`
  (causation/correlation via JSONB expression indexes).

### 9. Stream
- **NOBODY streams live.** `event_outbox` table: 0 rows; `event_outbox.js` NOT wired into bootstrap; no
  `pg_notify`, no SSE, no websocket. `ReplayEventStream` is an in-memory immutable structure for the replay engine.
- `EventBridge` 5s poll is the only pump and its sources are empty.

### 10. Replay
- `KernelReplayExecutionProvider` (bootstrap line 592) → `DeterministicReplayEngine.replay()` on
  `ReplayEventStream` of `CanonicalEventEnvelope`s — consumed by `ReplayWorker` for `REPLAY_VERIFY` /
  `PROJECTION_CREATED` events and surfaced in `mission_control` stats.
- **It replays PING transcripts (`state.replay_events[]`), NOT the `ping_events` journal.** No journal replayer exists.

## CLASSIFICATIONS
| Symbol | Classification | Evidence |
|---|---|---|
| `UnifiedEventRuntime` | **CANONICAL_AUTHORITY** | Sole live writer; 739 rows; source==running verified |
| `CanonicalizationService` | ADAPTER | Thin ingest boundary (validate→canonicalize→emit); delegates persistence to the authority |
| `EventReadAuthority` | DORMANT | Wired in routes but reads empty `repository_events`; live reads fall back to direct `ping_events` SQL |
| `EventWriteAuthority` | LEGACY | Phase-46, superseded; unwired in bootstrap; writes `events` (0 rows), never `ping_events` |
| `EventRepository` (`src/lib/events.ts`, HPP) | LEGACY | Interface + `InMemoryEventRepository` (explicitly "NOT SUITABLE FOR PRODUCTION", non-durable); SQLite migration never happened |
| `IdentityAuthority` (kernel) | CANONICAL_AUTHORITY (identity scope) | Canonical typed-ID law for authorities; **not on the live event path** |
| `CanonicalHashAuthority` | ADAPTER | Replay-side canonicalization helper; not on the live emit path |
| `EventBridge` | ADAPTER | Polls empty kernel tables → `emit`; wired, running, no-op |
| `AcquisitionAuthority` (Ω.49) | ADAPTER | Git-repo tracking only (`tracked_repositories`); not an event authority |
| `AcquisitionManager` | **UNWIRED** | Zero occurrences in any code. Does not exist. |
| `ConstitutionalEventStore` | **UNWIRED** | Zero occurrences in any code. Does not exist. |
| `IEventAuthority` | **UNWIRED** | Zero occurrences in any code. Does not exist. **Implementation count: 0.** |
| `EventAuthority` (bare) | UNWIRED | Doc-only: appears in 6 gateway MD files, zero classes/functions |
| `ReplayEventStream` / `DeterministicReplayEngine` / `KernelReplayExecutionProvider` | CANONICAL_AUTHORITY (transcript-replay scope) | Wired replay path for transcripts, not for the journal |
| `Dispatcher.collectEvidence` | UNKNOWN (name collision) | In-memory worker-consensus summarizer (`ping-runtime/orchestration/dispatcher.js:157`); no events, no persistence |
| Every direct `ping_events` writer | exactly one: `UnifiedEventRuntime.emit` | Only non-test `INSERT INTO ping_events` in the tree (line 149); all test matches are mock assertions |

## THE EIGHT WHO ANSWERS
1. **WHO CREATES EVENT ID?** `UnifiedEventRuntime.emit` — SHA-256 over `JSON.stringify({eventType, source, [namespace], logical_id|payload})`, content-deterministic.
2. **WHO HASHES?** `emit` itself via `node:crypto` SHA-256 over JSON.stringify bytes. Not `HashAuthority`/`CanonicalHashAuthority`.
3. **WHO SEQUENCES?** Nobody. No sequence column exists; order = `timestamp`/`created_at`. FYD's `sequence` is always null.
4. **WHO PERSISTS?** `UnifiedEventRuntime.emit` — `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING`.
5. **WHO READS?** HTTP routes (via vacuous `EventReadAuthority` → fallback direct `ping_events` SQL), `UnifiedEventRuntime` query/traversal methods, FYD website HTTP readers.
6. **WHO STREAMS?** Nobody live. Outbox unwired/empty; no notify/SSE/WS; `EventBridge` polls empty tables.
7. **WHO REPLAYS?** `ReplayWorker` → `KernelReplayExecutionProvider` → `DeterministicReplayEngine` — transcripts only, not the journal.
8. **WHO MAY WRITE?** `POST /events` (auth-attributed API), `POST /ingest` → `CanonicalizationService`, in-gateway workers/`MissionRuntime`, `EventBridge` (no-op). Direct DB writes funnel exclusively through `UnifiedEventRuntime.emit`.

## FALSIFIED CLAIMS (docs said, code denies)
- `EventAuthority.computeEventIdFromEvent` — symbol exists nowhere.
- `ConstitutionalEventStore`, `IEventAuthority`, `AcquisitionManager.collectEvidence/batchCollectEvidence` — exist nowhere.
- "EventAuthority" as an implementation — doc-only, 6 MD files, 0 code.
- `EventWriteAuthority` as the write path — writes the empty `events` table; live journal is `ping_events` via `UnifiedEventRuntime`.
- `EventReadAuthority` as the read path — reads the empty `repository_events`; live reads bypass it.
- FYD `(sequence DESC, …)` projector ordering — no sequence column; always null.
- FYD comment "the PING gateway's social_ingest_adapter verifies" signed envelopes — no such adapter in
  `ping-gateway-src`; the only `POST /events` expects `{event_type, aggregate_id, aggregate_type, event_data}`,
  not the `{type, payload, proof, metadata}` envelope the website posts (FYD demo gateway on :18199 is down anyway).
- Live emit path uses `IdentityAuthority`/`HashAuthority` — it uses neither; both are bypassed by inline hashing.

## GAPS / CAVEATS
- `ping-gateway-src` on disk is STALE relative to the container in one respect: the top-level `runtime/`
  (kernel) dir is missing on disk, so `ping-runtime/authorities/identity_authority.js`'s require would fail
  if loaded from the on-disk tree. The container has `/app/runtime/kernel/…` and the shim resolves there.
  All findings about live behavior were taken from the container or verified identical by sha256.
- `ping-rc-gateway` (rc image) also runs; not traced — assumed non-canonical for this verdict.
- Live `GET /events` returns 401 (exterior auth) — read path verified via code + DB, not via authed HTTP.

## BOTTOM LINE
Do NOT invent a second event authority: the proven canonical one is **`UnifiedEventRuntime`** emitting
deterministic content-hash events into **`ping_events`** with idempotent `ON CONFLICT DO NOTHING` persistence.
`IEventAuthority` has **zero** implementations. `AcquisitionManager` does not exist; the real observation→event
seam is `POST /ingest → CanonicalizationService → UnifiedEventRuntime.emit` (proven live). Sequencing and
live streaming do not exist; replay covers transcripts, not the journal.
