# Convergence Plan: Mission Schemes + ConstitutionalEventBus

Stream 2 of 5, PING successor wave. Date: 2026-09-24.
Branch: `lane/ping-core-perfection-jev` (Pig, `~/ping`).

## 1. Findings (evidence, not filenames)

### 1a. Mission schemes: `ping_missions` is live/canonical, `missions` is dormant legacy

**Canonical: `ping_missions`** via `MissionRuntime` (`ping-runtime/orchestration/mission_runtime.js`)
- Declares itself "Single canonical mission system ... Replaces 12 dead mission implementations."
- Schema: `mission_id` PK, `mission_type`, `status` (created -> assigned -> running -> completed/failed -> archived), `priority`, `payload` JSONB, `result` JSONB, `assigned_to`, `created_by`, timestamps, `error`, `retries`, `retry_at`, `lease_until`, `claimed_at`.
- `mission_id` is deterministic: `sha256(missionType:event_id | canonical_payload)[0:16]`, `ON CONFLICT DO NOTHING` (idempotent by construction).
- Emits through the canonical event authority: `MISSION_CREATED` / `MISSION_ASSIGNED` via injected `UnifiedEventRuntime`.
- **Wired in the live gateway**: `gateway/bootstrap/gateway_runtime.js:477` (`new MissionRuntime({pool, eventRuntime})`), `:592` (`EventToMissionBridge` wiring UER -> MissionRuntime), `:819` (`/missions` routes served from it).
- Live readers: `ping-runtime/orchestration/failure_record.js`, `ping-runtime/boundaries/priority_boundary.js` (via `EventToMissionBridge`, the declared accepted-event-to-mission trigger).
- Live tests: `gateway/test_*` convergence suites, `evals/constitutional-runtime/EVAL-006`.

**Legacy/dormant: `missions`** via `MissionRepository` (`gateway/repositories/mission_repository.js`)
- "Phase 21 - Repository Pattern for SQL Centralization". Columns: `mission_id, repo_id, mission_type, mission_description, priority, feasibility_score, mission_status, dependencies`.
- **Zero instantiations** in the repo (full require scan, node_modules/worktrees excluded).
- **No `CREATE TABLE missions` DDL anywhere in the repo**; the table the readers assume may not exist.
- Readers, all **unwired** (zero requirers in repo, absent from `gateway/server.js` -> `bootstrap/gateway_runtime.js` require graph and from all of `gateway/routes/` and `gateway/bootstrap/`): `gateway/control_center_subscription.js`, `gateway/materialized_views.js`, `gateway/self_improvement_loop.js`, `gateway/context_retrieval_authority.js`, `gateway/mission_execution_authority.js`.
- Note: a third in-memory missions concept exists (`ExecutionEngine._missions` array behind `POST /orchestration/missions`); it is route-local scratch, not a competing durable scheme, and is out of scope for this convergence.

**Verdict**: one live scheme (`ping_missions`), one dormant scheme (`missions`). No dual-write exists; no live consumer reads `missions`.

### 1b. ConstitutionalEventBus: the exact bypass

`gateway/event_bus.js` (`ConstitutionalEventBus`):
- `publish(event)` mints `event_id` via `identityAuthority.generateId('event', {type:'event'})` and persists with `INSERT INTO events (event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data) ... ON CONFLICT (event_id) DO UPDATE SET event_data, timestamp`.
- **Proven lossy**: `generateId('event', {type:'event'})` is deterministic over constant input (verified live: two calls return identical `event_87915f19feba823b`). Any publisher that omits `event_id` (all of them today) collapses onto ONE row; each publish overwrites the last via `ON CONFLICT DO UPDATE`. The bus's "log" is a single-row overwrite, not an event log.
- It never touches `ping_events`, never calls `UnifiedEventRuntime.emit`, and therefore skips: content-addressed spine IDs (`generateSpineEventId`), event-type validation, verdict-class admission authority, governance, namespace privacy boundary, semantic collision detection (fail-closed), and the `processed` dispatch pipeline.
- **Writers through it**: `gateway/knowledge_compiler.js` (only live-code publisher; 7 compiler passes publish `aggregate_type='COMPILER_PASS'` events via `_emitEvent`, none setting `event_id`). `gateway/end_to_end_verifier.js` requires it but never uses it (dead import).
- **Readers through it**: `knowledge_compiler.js` `replayPass()` reads via `bus.replay(inputId)` (private replay loop over `events`).
- **Require-graph status**: `knowledge_compiler.js` and `event_bus.js` have zero requirers in the repo; not loaded by the live gateway; dormant-classification (2026-09-21) scored it authority 20 / replay 10 / dependency 20, "needs_review", 2 commits, 0 churn. It is an armed-but-unwired competing truth: importable, constructible, and one `new ConstitutionalEventBus(pool)` + `publish()` away from forking truth.
- **Truth in `events` that never reaches `ping_events`**: compiler pass lifecycle events (acquisition/normalization/structural/semantic/verification/synthesis/reflection inputs, outputs, metrics, lifecycle_ids), plus anything written by the 10 other direct `events` writers (`constitutional_runtime.js`, `continuous_background_analyst.js`, `event_write_authority.js`, `constitutional_ollama_integration.js`, `witness_chain.js`, `eventstore_persistence.js`, `replay_log.js`, `lifecycle_visualizer.js`, `stage_registry.js`) — all currently unwired but importable. None of these rows carry UER spine IDs, namespaces, governance decisions, or witness linkage.
- Schema drift note: the checked-in DDL (`database/events.sql`: `id BIGSERIAL PK, stream, event_type, payload, created_at`, append-only triggers) does NOT match the columns all 11 writers use (`event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data`). Production's `events` table must have been migrated out-of-band; the repo DDL is stale. Any convergence touching `events` must reconcile this drift first against the live DB, not the checked-in SQL.

**Canonical**: `UnifiedEventRuntime` (`ping-runtime/events/unified_event_runtime.js`) is the sole production writer of `ping_events` (verified: repo-wide scan excluding tests/evals leaves only that file with `INSERT INTO ping_events`). The sanctioned legacy-ingestion pattern is `EventBridge` (`ping-runtime/events/event_bridge.js`): poll legacy tables, re-emit through `UER.emit()` with dedup and persisted cursors.

## 2. Convergence plan

### Phase 0 - Pin the direction (DONE this stream, reversible)
- Deprecation markers (comment-only) on: `gateway/event_bus.js`, `gateway/knowledge_compiler.js`, `gateway/repositories/mission_repository.js`, and the 5 dormant `missions` readers.
- New tests: `ping-runtime/orchestration/mission_scheme_convergence.test.js` (MissionRuntime writes `ping_missions`; deterministic IDs; UER emission; deprecation markers present; dormant modules absent from live gateway require graph) and `gateway/event_bus_convergence.test.js` (bus behavior preserved; deprecation marker; UER sole-writer invariant for `ping_events`).
- Reversibility: delete the test files / revert the comment edits. Zero behavior change.

### Phase 1 - Read-path consolidation (reversible, needs Nolan's call to schedule)
- `missions` scheme: no live readers exist, so no shim is needed. If any future reader needs legacy `missions` rows, serve them through a `MissionRuntime`-backed adapter (read `ping_missions`, project to the legacy shape) rather than reintroducing the table. Do NOT create the `missions` table.
- `events` scheme: `knowledge_compiler.replayPass` is the only reader of the bus's `events` rows and is unwired. On migration (Phase 2), point it at UER replay (`ping_events` via event read authority) with the compiler's `lifecycle_id` carried in UER metadata. Keep a read-only fallback to `events` behind a flag during transition; remove the flag only after the migrated path is proven in production.

### Phase 2 - Migrate knowledge_compiler to UER (needs Nolan's call; reversible per step)
- Step 2a: give `KnowledgeCompiler` an optional `eventRuntime` (UER) parameter; when present, compiler passes emit via `UER.emit(eventType, 'knowledge-compiler', payload, {correlation_id: lifecycleId, metadata})` instead of `bus.publish`. Default stays the bus (no behavior change until explicitly switched).
- Step 2b: switch the compiler's internal replay to read from UER (`ping_events`); keep the bus replay as fallback behind a flag.
- Step 2c: flip the default to UER; the bus becomes write-idle. Verify: compiler events appear in `ping_events` with spine IDs, namespaces, governance; `events` stops growing.
- Step 2d: deprecate `ConstitutionalEventBus.publish` (warn-and-forward to UER is NOT allowed silently; forwarding changes identity semantics, so make it an explicit, loud, temporary shim only if a live publisher appears, with a removal date).
- Each step is independently revertible (constructor flag / default flip). No step deletes the `events` table or rewrites history.

### Phase 3 - Historical reconciliation (needs Nolan's call; read-only, additive)
- Backfill: an `EventBridge`-style one-shot reads `events` rows (compiler pass events), re-emits them through `UER.emit` with `source='events-backfill'`, original timestamps preserved in metadata (`original_event_id`, `original_timestamp`, `backfill:true`), deduped by content hash. Original `events` rows are NEVER modified or deleted.
- Reconcile the `events` DDL drift: compare live DB schema vs `database/events.sql`, and update the checked-in DDL to match reality (documentation fix, no migration run without Nolan's word).

### Phase 4 - Dormant code disposition (needs Nolan's call; never silent)
- `missions` scheme files (`mission_repository.js` + 5 readers): candidates for archival to `archive/` (git mv, history preserved), NOT deletion. Only after Phase 0-1 pins hold for a full release cycle with zero references.
- `event_bus.js` / `knowledge_compiler.js`: keep until Phase 2 completes and the bus is write-idle for a full cycle; then archive, not delete.
- The 10 other direct `events` writers: classify each (dormant vs resurrection candidate) before any move; `event_write_authority.js` name suggests authority intent and needs explicit review.

### What must NOT be done (standing PING law)
- Do NOT delete the `events` table. Do NOT delete `ping_missions`. Do NOT create a `missions` table.
- Do NOT rewrite historical IDs: no backfill may mint new identities for old rows in place; re-emission creates NEW UER events that reference originals via metadata.
- Do NOT "fix" the bus's `ON CONFLICT DO UPDATE` into an append; that would change live behavior of an armed module. Migration goes through UER, not bus repair.
- Do NOT silently forward `bus.publish` to UER: identity semantics differ (constant minted ID vs content-addressed spine ID); silent forwarding would corrupt dedup/collision guarantees.
- Do NOT touch `event_repository.js` (classified legitimate bounded adapter, preserved).
- Do NOT touch the FYD factory. ORCA stays separate. No pushes; no main/master commits.

## 3. Implemented this stream (Phase 0)
- Deprecation headers on 8 files (comment-only, zero behavior change).
- `ping-runtime/orchestration/mission_scheme_convergence.test.js` (new).
- `gateway/event_bus_convergence.test.js` (new).
- Baselines green before; full relevant suites green after. Committed locally on `lane/ping-core-perfection-jev`, no push.

## 4. Open / remaining
- Phase 1-4 above, each needs Nolan's explicit call per the human-boundary rule (production behavior changes, archival moves).
- Live-DB verification: confirm `events` table's actual production schema (DDL drift) and whether any rows exist that predate this analysis; confirm `missions` table absence in production.
- `end_to_end_verifier.js` dead import of `ConstitutionalEventBus` (line 28): remove in a cleanup pass (needs Nolan's call; trivial but touches a verifier).
- In-memory `ExecutionEngine._missions` behind `/orchestration/missions`: confirm it stays route-local scratch and never becomes a fourth durable scheme.
- The 10 other direct `events` writers need individual dormant/resurrection classification.
