# TRACK B: Event Authority Forensics
## PING 12h Harvest Sprint Continuation — 2026-09-18 ~05:15–06:30 MDT

**Scope:** Event authority forensics (read-only), event identity proof, replay-from-durable-state.
**Worktree:** `/home/nolan/worktrees/ping-harvest-12h`, branch `sprint/harvest-12h`, HEAD `8fe3b806077d1afb821bb908cf518e5af83a76b6`.
**Method:** Pure inspection + one executable proof harness with a stub pg pool. No worktree modifications (`git status` clean before and after). No pushes, no production mutation.
**Rule applied:** historical docs/reports were treated as claims to verify, never as evidence. Multiple generations of event-authority descriptions exist; only wired code counts.

---

## 5. EVENT AUTHORITY FORENSICS

### 5.1 AcquisitionManager.collectEvidence / batchCollectEvidence — DO NOT EXIST

Full-tree search (`/home/nolan`, all `.js/.ts/.py`, excluding node_modules/.git) for `class AcquisitionManager` or `batchCollectEvidence`: **zero hits**. The only match for the string `AcquisitionManager` in the entire worktree is the W1 lane-worker note in `SPRINT-HARVEST-12H.md:30` (a doc, not code).

What actually exists under similar names:

1. **`gateway/acquisition_authority.js` — `AcquisitionAuthority`** (class at line 19, 262 lines). Methods: `trackRepository`, `acquireRepository`, `acquireCommit`, `handleWebhook`, `_loadTrackedRepositories`, `_computeWebhookSignature`, `getTrackedRepositories`, `getLastCommit`, `getAuthorityVersion`. This is **GitHub repository acquisition** (owner/repo/commit SHAs), not event collection. Wiring: NOT instantiated in `gateway/bootstrap/gateway_runtime.js`. Only references: `gateway/continuous_acquisition.js` (itself not wired in bootstrap) and a string label in `gateway/constitutional_object_factory.js:131`. Classification: **DORMANT**.
2. **`ping-runtime/orchestration/dispatcher.js:157` — `Dispatcher.collectEvidence(batchId, workerOutputs)`**. Aggregates worker-output consensus (`worker_count`, `findings`, `_computeConsensus`), not events. No `batchCollectEvidence` variant exists.

**Conclusion for task 5:** there are no callers to trace because the named API is a phantom from lane notes. Any prior claim about "AcquisitionManager callers" is unverifiable and should be discarded. This is recorded as a defect below (phantom reference risk).

### 5.2 What happens to events returned by the real emit path

The live spine is `UnifiedEventRuntime.emit()` (`ping-runtime/events/unified_event_runtime.js`). Its return contract:

- Validation/governance failure → `{ status: 'error', error, eventId }`, `stats.failed++`. Not silent.
- Persist conflict (same `event_id`) → `{ status: 'ok', eventId, event, deduplicated: true }`, `stats.deduplicated++`, **no second row, no handler dispatch**. Idempotent, not a drop.
- Success → `{ status: 'ok', eventId, event }` after persist → handler dispatch → integration routing.

Callers and their handling:
- `ping-runtime/business/business_emitters.js` — thin wrappers (`ReviewEmitter`, `CustomerEmitter`, `ProjectEmitter`, …); each returns `this._er.emit(...)` to its caller. Nothing dropped.
- `ping-runtime/workers/canonical_workers.js` — `BaseWorker._emit()` forwards to the runtime; workers rely on the returned status for downstream decisions (e.g., ReplayWorker checks provider results).
- `ping-runtime/events/event_bridge.js` — checks `emitResult.status === 'ok'` to count bridged events; failures increment `stats.errors` and log. Cursor only advances past processed rows, so a failed bridge row is retried next poll (cursor advances over the batch, but the row remains unbridged and will be re-read since `last_event_id` moves per batch — note the dedup subtlety in defects).
- `gateway/routes/events.js:76-79` — HTTP ingest emits directly through `UnifiedEventRuntime` with `source='api'`; result returned to the HTTP caller.

No silent drops found in the live path.

### 5.3 Classification table (verified against code + wiring, not docs)

| # | Component | Location | Classification | Evidence |
|---|---|---|---|---|
| 1 | `UnifiedEventRuntime` | `ping-runtime/events/unified_event_runtime.js` (git blob `4a4dffa3…`) | **CANONICAL_LIVE** | Instantiated `gateway/bootstrap/gateway_runtime.js:436`; pool/validator/governance/integrations injected; all emitters (`business_emitters.js`, `canonical_workers.js`, `mission_scheduler.js`, `routes/events.js`) call `.emit()`; code header declares "Single canonical event pipeline"; owns `computeEventId`, the single identity function |
| 2 | `ping_events` table | created/migrated by `UnifiedEventRuntime.initialize()` | **CANONICAL_LIVE** | `event_id VARCHAR(64) PRIMARY KEY`; all writes via `emit()` INSERT … `ON CONFLICT (event_id) DO NOTHING`; reads via `query()`, `getChildren()`, `getDescendants()`, `getAncestors()`, `getCorrelationGroup()` |
| 3 | `EventBridge` | `ping-runtime/events/event_bridge.js` (blob `8e2607e4…`) | **CANONICAL_LIVE** (adapter) | Constructed + `start()`ed at `gateway_runtime.js:484-491`; polls `repository_events` + `canonical_events` and re-emits through `UnifiedEventRuntime` into `ping_events` |
| 4 | `IEventAuthority` (TS interface) | `runtime/kernel/events/event-authority-interface.ts` (blob `8fbb1474…`; identical copies in 5 worktree locations) | **DORMANT** | Interface only (`subscribe/unsubscribe/publish/getHistory…`). Zero implementations found in any `.ts`/`.js` in the worktree. The TS `runtime/kernel` is not wired into the JS gateway. Orphan contract |
| 5 | `ConstitutionalEventStore` | — | **NOT PRESENT** (phantom) | Zero code references in the entire worktree (all languages). Sole mention is `SPRINT-HARVEST-12H.md:31`, a lane-description doc line. Never existed as code on this line |
| 6 | `EventRepository` (+ `gateway/event_repository.js` shim) | `runtime/kernel/event_repository.js` (blob `a36828e1…`) | **LEGACY** (bridged feeder) | Manages the `repository_events` table (`event_id TEXT PRIMARY KEY`, per-aggregate `sequence INTEGER`). `appendEvent()` still callable from `capability_scheduler.js`, `automatic_mission_generator.js`, `continuous_replay_authority.js`, `constitutional_execution_pipeline.js` — but **none of those are instantiated in the current `gateway_runtime.js`**, and the pipeline's `execute()` has zero production callers (only `gateway_adapter.executeEvent`, itself only called by tests). `EventBridge` still polls the table, so it remains a live legacy feeder into `ping_events` |
| 7 | `GatewayToKernelAdapter` + `ConstitutionalExecutionPipeline` | `runtime/kernel/gateway_adapter.js`, `runtime/kernel/execution/constitutional_execution_pipeline.js` | **LEGACY** (wired but uninvoked) | Adapter instantiated `gateway_runtime.js:390-391`; pipeline `execute()` persists via `EventRepository.appendEvent` — but `kernelAdapter.executeEvent()` is never called by production code (grep: only test files reference it). Dead ingestion path |
| 8 | `IdentityAuthority` (+ `ping-runtime/authorities/identity_authority.js` shim) | `runtime/kernel/authorities/identity_authority.js` (blob `5f9a14c3…`) | **LEGACY** (active in pipeline path only) | `generateEventId(eventType, aggregateId)` → `evt_<16 hex>` (via `CanonicalBytes.serialize` → SHA-256 → `type_` + 16 chars). Used by `StandardEventSchema._generateEventId` for the `repository_events` pipeline path. **Not referenced in `gateway_runtime.js`; not used by the live spine** (`computeEventId` is inline in `UnifiedEventRuntime`) |
| 9 | `HashAuthority` | — | **NOT PRESENT** (phantom) | No class, file, or export named `HashAuthority` exists. Hashing is inline per subsystem (see §6): `computeEventId` (spine), `CanonicalAuthority.hashBytes` (kernel), `CanonicalHashAuthority` (replay kernel) |
| 10 | `CanonicalHashAuthority` | `gateway/replay/kernel/canonical_hash_authority.js` (blob `c625a1d4…`, compiled TS) | **ADAPTER** (live in replay path) | Used only inside `gateway/replay/kernel/*` (`deterministic_replay_engine.js`, `witness_authority.js`, `index.js`). Reachable in production via `KernelReplayExecutionProvider` (wired `gateway_runtime.js:538` for `ReplayWorker`). Output format `sha256:<hex>` — distinct from event identity |
| 11 | `AcquisitionAuthority` | `gateway/acquisition_authority.js` | **DORMANT** | GitHub repo acquisition; not wired in bootstrap |

No two components were found **CONFLICTING** (competing for the same decision): the legacy pipeline and the live spine operate on different tables with different ID schemes, and the bridge maps between them explicitly.

### 5.4 Secondary stores (for completeness)

- `canonical_events` table (own DDL `database/canonical_events.sql`: `event_id UUID PK`, `sequence BIGINT NOT NULL`, `UNIQUE(tenant_id, sequence)`) — separate identity scheme, polled by `EventBridge` into `ping_events`.
- `constitutional_events` table — written by `gateway/constitutional_event_sourcing.js:439` with `sequence_number`; not wired into the gateway spine.
- `repository_events.sequence` (per-aggregate INTEGER, chain-linked via `PreviousEventHash`/`CanonicalEventHash`) is a **different field** from `ping_events.sequence` (global BIGSERIAL). Do not conflate them.

---

## 6. EVENT IDENTITY PROOF

### 6.1 The actual current path (verified in code)

```
event input: emit(eventType, source, payload, options)
  → computeEventId({eventType, source, namespace?, logicalId?, payload})   // ping-runtime/events/unified_event_runtime.js:36-45
  → SHA-256 hex digest of JSON.stringify({eventType, source, [namespace], [logical_id|payload]})
  → event_id (64-char lowercase hex)
  → INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
    VALUES (...) ON CONFLICT (event_id) DO NOTHING                        // lines 172-178
  → Postgres assigns sequence (BIGSERIAL DEFAULT, not in column list)
```

Executable proof (12/12 checks passed on Pig WSL, Node, stub pg pool; script `/tmp/trackb-proof-pig2.js` on Pig, source `/tmp/trackb-proof.js` on this machine):

- `computeEventId` deterministic: same input → same 64-hex ID; changed payload → different ID; provided `namespace` participates in identity.
- Timestamp exclusion: with `logical_id`, two emissions differing only in payload timestamp hash identically (idempotent retry preserved).
- `emit()` returns `eventId === computeEventId(input)`; the persisted row's `event_id` equals it.
- Duplicate emit → `deduplicated: true`, no second row, `stats.persisted` unchanged (`ON CONFLICT DO NOTHING`).
- `query()` retrieves the persisted event by identity.

### 6.2 Field semantics: hash identity vs BIGSERIAL sequence — NO conflict

| Field | Type | Semantics | Role |
|---|---|---|---|
| `event_id` | `VARCHAR(64)` **PRIMARY KEY** | `computeEventId` = SHA-256 hex over `{eventType, source, [namespace], [logical_id\|payload]}` | **The canonical event identity.** Dedup key (`ON CONFLICT`), causation/correlation linkage, handler dispatch key. Content-addressed: same logical event always yields the same ID |
| `sequence` | `BIGSERIAL` (added commit `76af2f3ec`, ancestor of HEAD) | Postgres-assigned insertion-order number (column DEFAULT, never in the INSERT list) | **Ordering marker only.** Intended per commit message for "replayable total order" via `ORDER BY sequence`. Has an index (`idx_ping_events_sequence`) |

Verification that the two notions do not compete:

1. `sequence` is not a key of any kind (not PK, not UNIQUE), has no foreign keys pointing to it, and **no code anywhere reads it** — zero `ORDER BY sequence` consumers in `ping-runtime`/`gateway` (verified by grep; the commit message's "ordering becomes SELECT ... ORDER BY sequence" is aspirational, unimplemented). `query()` still orders by `timestamp DESC`.
2. `event_id` is the sole identity: PK, conflict target, and the value returned to every caller.
3. Legacy tables keep their own schemes namespaced to their tables: `repository_events.event_id` (`evt_<16hex>` via `IdentityAuthority`), `canonical_events.event_id` (UUID), `repository_events.sequence` (per-aggregate INTEGER chain). The `EventBridge` maps legacy rows into **new** spine events (fresh computed IDs) and preserves originals in `metadata.original_event_id` / `metadata.bridged_from` and `payload._repository_event_id`. No collision: different tables, different ID formats.

One mechanical note: with `ON CONFLICT DO NOTHING`, retried duplicate inserts still consume sequence values (Postgres `nextval` fires before the conflict check), so `sequence` has gaps under retries. Correct for an ordering marker; would be wrong for an identity — which is exactly why it is not one.

### 6.3 What is deterministic vs not (spine level)

- **Deterministic:** `computeEventId` (pure function of declared identity material); dedup behavior; `ON CONFLICT` idempotency; handler dispatch order per event type (registration order); the `logical_id` timestamp-stripping rule.
- **Not deterministic:** `timestamp` (wall clock via `constitutionalTimeAuthority`), payload contents (producer-controlled), handler side effects, `sequence` values (insertion order, gap-prone), integration routing outcomes.

---

## 7. REPLAY FROM DURABLE STATE — BLOCKER

### 7.1 What the replay path actually is

`ReplayWorker` (`ping-runtime/workers/canonical_workers.js:269`, blob `8a081853…`) → `KernelReplayExecutionProvider.executeReplay(transcript)` (`gateway/kernel_replay_execution_provider.js`, blob `a5577317…`) → `DeterministicReplayEngine` (`gateway/replay/kernel/deterministic_replay_engine.js`, blob `c5f87281…`).

Proven deterministic on identical inputs (harness + `gateway/test_kernel_replay.js` "determinism across 10 runs"): two runs of the same transcript yield identical `fingerprint` and `witness_root`; the replay kernel contains no `Date.now`/`Math.random`/`new Date()`.

### 7.2 The break: retrieve-from-durable-state is not implemented

`ReplayWorker._buildReplayEvents` (`canonical_workers.js:476-497`), verbatim:

```js
  async _buildReplayEvents(event) {
    const payload = event.payload || {};
    const correlationId = event.metadata?.correlation_id || event.correlation_id || event.event_id;

    // If events are provided in payload (test mode), use them directly
    if (Array.isArray(payload.replay_events) && payload.replay_events.length > 0) {
      return payload.replay_events;
    }

    // In production, this would query Postgres for the correlation group:
    // SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1
    // For now, return the triggering event as a single-event replay.
    // This is correct: a single observation can be replayed independently.
    return [{ event_id: event.event_id, event_type: event.event_type,
              payload: payload, metadata: event.metadata || {}, timestamp: event.timestamp }];
  }
```

The production durable-retrieve step is a **comment**, not code. The method never touches `this._pool`, never queries `ping_events`. The harness check `PASS BLOCKER evidence: _buildReplayEvents never reads durable state` asserts exactly this (comment present, no DB query, returns in-memory event only).

Therefore the chain **persist → retrieve → replay** is broken at the retrieve step in production code. Replay today re-executes whatever events are handed to it in memory (test payloads or the single triggering event), not events loaded from `ping_events`.

### 7.3 Additional fidelity caveat (design note, not a bug per se)

`KernelReplayExecutionProvider.executeReplay` **remaps identities**: kernel `event_id`s are synthesized (`evt-ping-<i>-<hash>` when the input ID does not start with `evt-`; the durable spine IDs are 64-hex and never start with `evt-`, so remapping always fires for spine events) and missing timestamps default to `2026-01-01T00:00:00.000Z`. The deterministic fingerprint/witness_root therefore attest the **transcript's internal consistency**, not fidelity to the durable `event_id` chain. The witness does not bind the original spine identities.

### 7.4 Verdict

**BLOCKER — replay from durable state is not reachable from the current event authority.** Deterministic replay *of a supplied transcript* is proven (kernel engine, 10-run determinism test, harness 12/12). But no production code loads events from `ping_events` into a replay transcript. Do not claim replay readiness. The missing piece is small and well-specified: implement the commented-out correlation-group load in `_buildReplayEvents` (or a dedicated replay loader) against `UnifiedEventRuntime.getCorrelationGroup`, then re-prove end to end.

---

## 8. DEFECTS FOUND (with evidence)

1. **Phantom API in sprint notes (naming).** `AcquisitionManager.collectEvidence`/`batchCollectEvidence` do not exist anywhere in `/home/nolan` (all languages, all worktrees). The W1 lane note (`SPRINT-HARVEST-12H.md:30`) misnames `AcquisitionAuthority` (GitHub repo acquisition, dormant) and/or `Dispatcher.collectEvidence` (worker consensus). Risk: downstream work or audits built on the assumed API. Recommend correcting the lane note, not the code.
2. **Replay-from-durable-state unimplemented (BLOCKER).** `ReplayWorker._buildReplayEvents` (`canonical_workers.js:476-497`) returns the in-memory triggering event; the production Postgres correlation-group load is a comment. No production path exists from `ping_events` rows to a replay transcript.
3. **Replay identity remapping.** `KernelReplayExecutionProvider` synthesizes `evt-ping-<i>-<hash>` event IDs and default timestamps; the witness/fingerprint therefore does not bind durable spine `event_id`s. If the witness is ever presented as attesting the original event chain, that claim would be false.
4. **Dead dedup logic in `EventBridge`.** `_bridgeRepositoryEvents` filters with `event_id NOT IN (SELECT event_id FROM ping_events WHERE source='repository_events')` (`event_bridge.js`, ~line 143), but bridged rows receive freshly computed hash IDs in `ping_events`, so the subquery can never match; real dedup relies on `ON CONFLICT (event_id) DO NOTHING`. Harmless but misleading; the `NOT IN` should compare against `metadata->>'original_event_id'` or be removed.
5. **`ping_events.sequence` is write-only.** Commit `76af2f3ec` claims "ordering becomes SELECT ... ORDER BY sequence" but zero code orders by it. Either wire a consumer (e.g., the replay loader in defect 2) or document it as reserved. Not a defect in the identity model — the semantics are clean — but an unfulfilled intent.
6. **`IEventAuthority` is an orphan contract.** The TS interface exists in 5 copies with zero implementations and zero consumers. Either implement it against `UnifiedEventRuntime` or archive it; as-is it invites false "event authority" claims in future audits.

## 9. NON-DEFECTS (explicitly checked, cleared)

- No competing sequence-vs-hash identity: `sequence` is never used as identity anywhere (no PK/UNIQUE/FK/reads).
- No silent event drops in the live spine: validation/governance failures and dedups return explicit statuses with stats.
- `AcquisitionManager` has no hidden callers: the name appears only in one doc line.
- `kernelAdapter.executeEvent` / pipeline ingestion has no production callers: the legacy pipeline cannot inject competing events into `repository_events` at runtime (its remaining writers are also unwired in bootstrap).

## 10. Evidence index

- Worktree HEAD: `8fe3b806077d1afb821bb908cf518e5af83a76b6` (clean, unmodified by this investigation).
- Key file git blobs: `unified_event_runtime.js` 4a4dffa3, `event_bridge.js` 8e2607e4, `canonical_workers.js` 8a081853, `kernel_replay_execution_provider.js` a5577317, `canonical_hash_authority.js` c625a1d4, `deterministic_replay_engine.js` c5f87281, `event_repository.js` a36828e1, `identity_authority.js` 5f9a14c3, `standard_event_schema.js` 17ff503d, `routes/events.js` f9dc2ee4, `gateway_runtime.js` a9b334ba, `event-authority-interface.ts` 8fbb1474.
- Proof harness: `/tmp/trackb-proof.js` (this machine) = `/tmp/trackb-proof-pig2.js` (Pig, sha256 `296f0ef6787657b66a4e7e638ea9bf2e0f349fbe766692ecedb9608e17d4eccf`), 12/12 checks passed on Pig WSL Node.
- No live-Postgres test was possible (pg module absent on Pig per H61/H79 findings); the harness used a stub pool that faithfully models `ON CONFLICT DO NOTHING` and BIGSERIAL assignment.
