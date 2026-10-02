# S2 — Runtime Events, Kernel Wiring, Canonicalization: Semantic Audit

- Scope: PING core runtime events, kernel wiring, canonicalization boundary.
- Core base: `/home/nolan/ping`, branch `refactor/runtime-authority-convergence`, HEAD `cc6856c3b` (observed; working tree was dirty from other lanes, not touched by this audit).
- Adapter base: `/home/nolan/projects/ping-constitutional` at `a69bb68f` (referenced only; not modified).
- Audit window: 2026-09-23 MDT / 2026-09-24 UTC. READ-ONLY. PROPOSE ONLY.
- **COMMITS CREATED: NONE.** No core or adapter files were written, patched, or committed.
- Method: source read at HEAD. Live code outranks stale top-level audit Markdown; where the 2026-09-23 event-forensics report and current code disagree, current code controls and the disagreement is recorded.
- Two claims in this report were proven with a local read-only `node` computation (key-order identity drift; `canon()` nested-key loss). No database was touched; no process was started, stopped, or signaled.

## 1. What is actually live (composition root)

`gateway/bootstrap/gateway_runtime.js` is the live composition root. On the live path it constructs and initializes, in order:

1. `UnifiedEventRuntime` (pool, validator, governance, integrationManager) then `initialize()`.
2. `CanonicalizationService` (constructed after the runtime).
3. `EventBridge` (constructed, `initialize()`d, `start()`ed).
4. `GatewayToKernelAdapter` (`runtime/kernel/gateway_adapter.js`) then `initialize()`, which constructs and initializes the kernel `EventRepository` and the kernel `EventReadAuthority`.
5. `EmbeddingService`, `EventToMissionBridge`, `MissionRuntime`, `MissionScheduler`, `WorkerRuntime`, emitters, routes.

Constructed but never executed on the live path: the adapter's `ConstitutionalExecutionPipeline` (reducer/projection/dispatcher) — `executeEvent` has zero callers in `gateway_runtime.js`.

Not constructed on the live path at all: `AgentMemoryAuthority` (`getAgentMemoryAuthority` has no callers outside its own module), `DistributedDesktopAgents`, `AutomaticMissionGenerator`, `ContinuousReplayAuthority`, `AppendOrchestrator` (imported only by the unwired `gateway/authority_registry.js`), `ConstitutionalRuntime` (required only by `gateway/test_kernel_replay.js`), `EventWriteAuthority`.

## 2. Lifecycle traces (DEFINED -> IMPORTED -> CONSTRUCTED -> INITIALIZED -> STARTED -> REGISTERED -> CALLED -> PERSISTING -> READ BACK -> RESTARTED -> TESTED)

**M1 UnifiedEventRuntime** (`ping-runtime/events/unified_event_runtime.js`): DEFINED as the canonical emit/query journal class. IMPORTED by `gateway_runtime.js`, `routes/events.js`, `routes/ingest.js`, `canonicalization_service.js`, `event_bridge.js`, workers, mission runtime. CONSTRUCTED in `gateway_runtime.js` with pool/validator/governance/integrationManager. INITIALIZED via `initialize()` (creates `ping_events` table + indexes). STARTED: no start phase; usable after initialize. REGISTERED: three in-process subscriber sites (`gateway_runtime.js:598` graph projection, `embedding_service.js:132`, `event_to_mission_bridge.js:95`); three integrations (posthog, email, sms) registered on `IntegrationManager`. CALLED: `canonicalizeAndEmit` (via CanonicalizationService), direct `emit` from MissionRuntime, workers, EventBridge, POST /events, seed. PERSISTING to `ping_events`. READ BACK via `query()`, `getEventById`, traversal methods, and HTTP routes (with fallback, see F10). RESTARTED: in-process handlers re-register at bootstrap; `ping_events` rows survive; no replay of missed in-process deliveries. TESTED: not inventoried in this pass; seed path `_seedBusinessEvents` runs on first boot.

**M2 EventValidator** (`ping-runtime/events/event_validator.js`): DEFINED with `validate(event)` and `isRegistered(eventType)`; does NOT define `validateEventType`. IMPORTED by `gateway_runtime.js`. CONSTRUCTED and passed into UnifiedEventRuntime. CALLED on the live emit path only as `validator.validateEventType ? ... : validator.isRegistered(eventType)` — the full `validate(event)` (payload schema, schema version, authority owner) is never exercised on the live path. Classification: PHANTOM_CONTRACT.

**M3 EventGovernance** (`ping-runtime/events/event_governance.js`): DEFINED with `validateEvent(event, source)` checking registry presence, canonical namespace syntax, and event-type-prefix ownership. IMPORTED/CONSTRUCTED in `gateway_runtime.js`. CALLED in `emit()` unless `options._skipGovernance` (used by EventBridge). Does not compare producer `source` against registry authority ownership — the emitted event carries no `authority_owner`. TESTED: not inventoried.

**M4 EventBridge** (`ping-runtime/events/event_bridge.js`): DEFINED with `initialize()` (creates `ping_bridge_cursors`) and `start()` (5s `setInterval`, first `_poll()` not awaited). IMPORTED/CONSTRUCTED/INITIALIZED/STARTED in `gateway_runtime.js`. Never stopped: `GatewayRuntime.shutdown()` does not call `bridge.stop()`. CALLED: `start()` once. PERSISTING: re-emits `repository_events` and `canonical_events` rows into `ping_events` via `unifiedEventRuntime.emit(..., {_skipGovernance: true})`; advances `ping_bridge_cursors`. READ BACK: polls both source tables. RESTARTED: resumes from cursor in DB; in-flight failures are stranded (see F14/F15).

**M5 Kernel EventRepository** (`runtime/kernel/event_repository.js`): DEFINED with `initialize()` creating `repository_events` (`CanonicalEventHash TEXT NOT NULL`, PK `event_id`, UNIQUE `(object_id, sequence)`). IMPORTED by `gateway_adapter.js` and the dormant `constitutional_runtime.js`. CONSTRUCTED+INITIALIZED live via `GatewayToKernelAdapter.initialize()`. `appendEvent` has NO live callers (all five previously listed writers are unwired, see F17). `markProcessed` has zero callers anywhere. The execution pipeline that would consume it is never executed. Classification: initialized-but-idle DDL owner; the strict DDL is what the live database carries.

**M6 Kernel EventReadAuthority** (`runtime/kernel/event_read_authority.js`): DEFINED reading ONLY `repository_events` (`getAllEvents`, `getRecentEvents`, `getEventStats`, `getEventsByStream` on `aggregate_type`, `markProcessed`/`markFailed` on `repository_events`). `ping-runtime/events/event_read_authority.js` is a 21-line shim re-exporting the kernel class (convergence in progress, single implementation). IMPORTED by `gateway_runtime.js:11`, CONSTRUCTED at `:382`, INITIALIZED (no-op), passed to routes. READ BACK by `routes/events.js` with a silent raw-SQL fallback to `ping_events` when the authority returns empty/null (see F10). Failures inside the authority are caught and returned as empty/null, which triggers the fallback and masks infrastructure failure.

**M7 CanonicalizationService** (`ping-runtime/canonicalization/canonicalization_service.js`): DEFINED as the claimed canonical boundary (`canonicalizeAndEmit`, `authorizeNamespace`). IMPORTED by `gateway_runtime.js` and `routes/ingest.js`. CONSTRUCTED in bootstrap after the runtime. CALLED by POST /ingest and the business emitters. NOT called by MissionRuntime, workers, EventBridge, POST /events, or the seed path — every one of those calls `UnifiedEventRuntime.emit` directly. The "every event crosses CanonicalizationService" claim is false as written.

**M8 CanonicalEventEnvelope + canonical_events** (`gateway/canonical_event_envelope.js`, `gateway/canonical_events.sql`): DEFINED with `executeEmitEvent` (UUIDv5/SHA-1 identity over `tenantId:eventType:timestamp:sequence`; `getNextSequence` = MAX+1 per tenant; INSERT with `ON CONFLICT (tenant_id, sequence) DO NOTHING`). No live importer found on the gateway_runtime path in this pass (envelope module not required by `gateway_runtime.js`; table is polled by EventBridge). Identity includes wall-clock timestamp, so retries produce new IDs; the sequence race silently drops the loser with a success return (see F16).

**M9 EventWriteAuthority** (`gateway/event_write_authority.js`): DEFINED writing to a separate `events` table with its own identity scheme. No live importer or constructor found; route/read comments still credit it. Classification: DORMANT_HISTORY shadow persistence. Do not delete; do not wire without reconciliation.

**M10 ConstitutionalRuntime** (`gateway/bootstrap/constitutional_runtime.js`): DEFINED (EventRepository + Dispatcher + ReducerRegistry + ProjectionRegistry + ReplayDecisionAuthority + pipeline). Required ONLY by `gateway/test_kernel_replay.js`. Classification: DORMANT_HISTORY alternate bootstrap.

**M11 RepositoryStore** (`ping-runtime/repository/repository_store.js`): DEFINED as a canonical-artifact BYTEA store. Constructed in the unwired `authority_registry.js:265` and in test harnesses; separately passed as `repoStore` to `routes/repository.js` (live, own routes). Fourth persistence mechanism in the events-adjacent domain; not reconciled with the three event journals here.

**M12 HTTP routes** (`gateway/routes/events.js`, `ingest.js`, `mission_control.js`): DEFINED as Express factories. `routes/events.js` registration order: `GET /`, `/recent`, `/stats`, `/:stream` (line 59), `POST /`, `POST /processed`, `POST /failed`, `GET /unprocessed` (line 145, SHADOWED by `/:stream`), `/:eventId/children|descendants|ancestors`, `/correlation/:correlationId`. `POST /events` emits directly with no namespace authorization. `POST /ingest` is the only route that enforces `authorizeNamespace` (400 on invalid). `/mission_control/inbox` reads `query({unprocessed:true})` against `ping_events.processed`, which has no writer.

**M13 StandardEventSchema** (`runtime/kernel/authorities/standard_event_schema.js` + `ping-runtime/events/standard_event_schema.js` shim): DEFINED computing `CanonicalEventHash` before witness. Used by `transaction_boundary.js:144`, `execution_graph_authority.js:91`, `event_outbox.js:112` — NOT by any `repository_events` writer. The hash computation does not protect the kernel repository path.

**M14 IntegrationManager** (`ping-runtime/runtime/integration_manager.js`): DEFINED with per-integration `_shouldRoute` + policy gating. CONSTRUCTED in bootstrap; posthog/email/sms registered. CALLED on every `emit()` including duplicate redeliveries, with no duplicate flag and no idempotency key passed to providers.

## 3. Shared-record table

Columns: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| events | UnifiedEventRuntime.emit | Duplicate (ON CONFLICT) delivery still dispatches handlers and integrations, then returns status ok | `unified_event_runtime.js`: `deduplicated++` after `ON CONFLICT DO NOTHING` with no return; flow continues to handlers + `integrationManager.emit`; returns `{status:'ok'}` with a rebuilt event that was not inserted | EventBridge, workers, routes, MissionRuntime | handlers, IntegrationManager | UnifiedEventRuntime | handlers, integrations, callers of emit | UnifiedEventRuntime (self-declared) | CONFLICTING (contradicts 2026-09-23 forensics early-return claim; current code at cc6856c3b controls) | HIGH | Deduplication boundary: dedupe is counted but not enforced | EventValidator, EventGovernance, IntegrationManager | All downstream consumers: email/SMS/posthog can double-fire; agent actions triggered by handlers can re-execute |
| events | UnifiedEventRuntime identity | Event IDs are not canonical: `JSON.stringify` key order changes the SHA-256 identity for the same semantic payload | `emit()`: `crypto.createHash('sha256').update(JSON.stringify(identity))`; `_logicalIdentity()` same pattern. Proven by local node run: `{x:1,y:2}` vs `{y:2,x:1}` hash differently | any emit caller | — | — | — | CanonicalizationService (claimed) | LIVE_BYPASS of canonicalization | HIGH (proven) | Canonicalization authority: canonical bytes never used for identity | CanonicalBytes.serialize (exists, unused here) | Replay, dedupe, witness matching across producers |
| events | UnifiedEventRuntime collision check | `canon()` drops nested keys that do not coincide with top-level key names, so semantically different payloads compare equal and the collision error is missed | `canon(o) = JSON.stringify(o, Object.keys(o).sort())`: replacer array restricts nested objects to top-level key names. Proven by local node run: `{a:1,b:{a:1,z:2}}` vs `{a:1,b:{a:1,z:999}}` produce identical output | emit() conflict path | — | — | — | UnifiedEventRuntime | LIVE_BUG | HIGH (proven) | Integrity boundary: collision detection silently wrong | pg unique constraint on event_id | Any agent relying on collision errors to detect conflicting writes |
| events | EventValidator | `validateEventType` does not exist; live path degrades to `isRegistered(eventType)` only | `event_validator.js` defines `validate(event)` and `isRegistered(eventType)`; `unified_event_runtime.js` calls `validator.validateEventType ? ... : validator.isRegistered(eventType)` | UnifiedEventRuntime.emit | EventValidator | — | — | EventValidator (claimed) | PHANTOM_CONTRACT | HIGH | Validation boundary: comments promise validation that never runs | event type registry | All producers: malformed payloads pass |
| events | UnifiedEventRuntime.emit + canonicalizeAndEmit | Caller `metadata` spread overrides constitutional fields (schema_version, namespace, causation/correlation, confidence; canonical id/hash/version, lifecycle, evidence) | `...options.metadata` spread AFTER constitutional assignments in both methods | any emit caller | — | caller | journal readers | none (caller wins) | LIVE_BUG | HIGH | Constitutional field integrity | — | Provenance/trace consumers; governance |
| events | CanonicalizationService | `verified:true` can accompany `status:'error'`: envelope verified in memory, only payload persisted, persist failure still returns verified flag | `canonicalizeAndEmit`: builds + verifies envelope, persists payload + selected metadata to `ping_events`, returns `{verified, status}` independently | routes/ingest, emitters | UnifiedEventRuntime.emit | CanonicalizationService | API clients | CanonicalizationService (claimed) | CONFLICTING (verified-but-not-persisted) | HIGH | Durability boundary | UnifiedEventRuntime | API consumers, FYD adapter |
| events | EventGovernance | Source ownership not enforced; `_skipGovernance` is an ordinary caller option used by EventBridge | `event_governance.js` checks registry presence + namespace syntax + prefix owner config, never producer-source match; `emit()` honors `options._skipGovernance` | UnifiedEventRuntime.emit | EventGovernance | — | — | EventGovernance (claimed) | LIVE_BYPASS | HIGH | Governance boundary | validator, registry | All producers can claim any source |
| events | UnifiedEventRuntime.emit | Journal-then-deliver is not transactional; handler/integration failures are logged, emit returns success, `failed` stats do not count them | INSERT before handlers; `catch` around handlers/integrations only `console.error`; `this._stats.failed` incremented only on persist/governance failure | emit callers | handlers, IntegrationManager | UnifiedEventRuntime | stats readers | none | LIVE_BUG | HIGH | Delivery guarantee boundary | pg | Monitoring, worker retry logic |
| events | ping_events.processed | Column + index exist; zero writers; `query({unprocessed:true})` and `/mission_control/inbox` return all rows forever | grep: no `SET processed` / `processed = true` on ping_events anywhere; `POST /events/processed` writes `repository_events.processed` via authority, not ping_events | UnifiedEventRuntime.query, mission_control route | — | none | UnifiedEventRuntime, mission_control | none | WRITE_ONLY | HIGH | Inbox semantics | — | Mission-control inbox consumers, WorkerRuntime |
| events | HTTP routes / EventReadAuthority | Authority reads `repository_events`; routes silently fall back to raw SQL on `ping_events` when authority returns empty/null; `:stream` means `aggregate_type` on authority path but `event_type` on fallback; `/stats` fallback sets `streams = total count` | `runtime/kernel/event_read_authority.js` (all queries on repository_events; catch -> []/null); `gateway/routes/events.js` fallback queries; `getEventsByStream` filters `aggregate_type` vs fallback `event_type` | HTTP clients, FYD adapter, worker_runtime | EventReadAuthority, pg | bridge (repository_events, dormant writers), runtime (ping_events) | routes | EventReadAuthority (claimed) | SILENT_FALLBACK + CONFLICTING normalization | HIGH | Read-authority boundary | pg | FYD adapter (`GET /events/:type`), workers |
| events | routes/events.js | `GET /unprocessed` (line 145) is shadowed by `GET /:stream` (line 59); worker inbox polling receives the wrong handler's result | Route registration order in `gateway/routes/events.js`; Express matches `/:stream` first with `stream='unprocessed'` | worker_runtime.js:149 (`/events/unprocessed`) | getEventsByStream('unprocessed') -> fallback event_type='unprocessed' -> [] | — | WorkerRuntime | none | BROKEN_WIRING | HIGH | HTTP routing | EventReadAuthority | WorkerRuntime (inbox always empty) |
| events | EventBridge cursor | `event_id > cursor` with lexicographic ordering on UUID/hash IDs is not insertion-monotonic; later rows with lower IDs strand forever | `event_bridge.js` `_pollRepositoryEvents` / `_pollCanonicalEvents`: `WHERE event_id > $cursor ORDER BY event_id`; UUIDv5/SHA-256 IDs are random-ordered | EventBridge | pg | source tables | UnifiedEventRuntime | EventBridge (self) | LIVE_BUG | HIGH | Exactly-once bridging boundary | ping_bridge_cursors | Any consumer of bridged events |
| events | EventBridge cursor advance | Cursor advances to last fetched row even when individual emits fail; failed rows stay `processed=false` but are unreachable behind the cursor | `event_bridge.js`: cursor UPDATE after batch loop; per-row emit failures only `console.error` | EventBridge | UnifiedEventRuntime.emit | EventBridge | — | EventBridge | LOSSY | HIGH | Retry/DLQ boundary (none exists) | pg | Downstream consumers miss events silently |
| events | EventBridge canonical leg | Mark-then-emit: `UPDATE canonical_events SET processed=true` runs BEFORE `emit()`; a failed emit is already marked processed and never retried | `event_bridge.js` canonical leg order: UPDATE ... processed=true, then per-row emit in try/catch | EventBridge | UnifiedEventRuntime.emit | EventBridge | — | EventBridge | LOSSY | HIGH | Durability boundary | pg | Consumers of canonical-sourced events |
| events | EventBridge poll loop | `start()` does not await first `_poll()`; no mutex/lease; overlapping 5s-interval polls possible | `event_bridge.js` `start()`; `shutdown()` never calls `bridge.stop()` | GatewayRuntime | EventBridge | — | — | EventBridge | LIVE_BUG | HIGH | Shutdown/idempotence boundary | — | Duplicate external actions on overlap (compounds duplicate-delivery bug) |
| events | EventBridge source identity | Source-table event IDs are copied into payload/metadata but UnifiedEventRuntime mints a NEW SHA-256 ID; the `NOT IN (SELECT event_id FROM ping_events)` check compares source IDs against minted IDs and proves nothing | `event_bridge.js`: `SELECT ... WHERE event_id NOT IN (SELECT event_id FROM ping_events)`; `emit()` ignores incoming IDs | EventBridge | UnifiedEventRuntime.emit | EventBridge | — | EventBridge | PHANTOM_CONTRACT | HIGH | Idempotency boundary | — | Only the unsafe cursor prevents rescan |
| events | EventBridge canonical leg | Tenant provenance drifts: `tenant_id` moved into payload/metadata, no top-level `namespace` passed, original timestamp replaced with bridge ingestion time, `event_version` defaults because SELECT omits the column | `event_bridge.js` canonical leg: `namespace` not set (-> `core::system` default); `timestamp` rebuilt; `event_version: row.event_version \|\| '1.0.0'` with no such column selected | EventBridge | UnifiedEventRuntime.emit | canonical envelope writer | ping_events readers | none | LIVE_BUG | HIGH | Provenance boundary | CanonicalEventEnvelope | Tenant-scoped consumers, ordering/replay |
| events | repository_events writers | All five previously listed live writers are unwired: `getAgentMemoryAuthority` has no callers; `distributed_desktop_agents`, `automatic_mission_generator`, `continuous_replay_authority` have no importers; `append_orchestrator` reachable only via unwired `authority_registry.js` | grep across ping-runtime/gateway/runtime; `gateway_runtime.js` references none of them | — | EventRepository.appendEvent | none (live) | EventBridge (polls), EventReadAuthority (reads) | EventRepository (DDL owner, initialized live via adapter) | DORMANT_HISTORY (writers) / initialized-but-idle (repository) | HIGH | Journal liveness: table exists, strict DDL applied, no producers | GatewayToKernelAdapter | Corrects 2026-09-23 forensics S2B #6 "PROVEN live" claim |
| events | repository_events DDL | Two DDLs disagree: kernel `EventRepository.initialize()` (`CanonicalEventHash TEXT NOT NULL`) vs `gateway/migration_engine.js` (`CanonicalEventHash TEXT` nullable); live bootstrap runs only the kernel one (`migration_engine` not required by `gateway_runtime.js`) | `runtime/kernel/event_repository.js` vs `gateway/migration_engine.js:233`; `gateway_adapter.initialize()` calls `eventRepository.initialize()` | GatewayToKernelAdapter | pg | — | — | EventRepository | CONFLICTING (dormant rival DDL) | HIGH | Schema ownership | — | Any future writer built against the nullable assumption |
| events | CanonicalEventEnvelope identity | UUIDv5(SHA-1) identity includes wall-clock `timestamp`; `getNextSequence` is MAX+1-per-tenant (read-then-write race); loser of race hits `ON CONFLICT (tenant_id, sequence) DO NOTHING` and gets a success return for a dropped event | `gateway/canonical_event_envelope.js` `generateEventId`, `getNextSequence`, `executeEmitEvent` | envelope users (none live found) | canonical_events | CanonicalEventEnvelope | EventBridge | CanonicalEventEnvelope (claimed) | LIVE_BUG (dormant caller, live table) | HIGH | Identity/durability boundary | pg | Bridge consumers |
| events | canonical_events.sql | PK is `event_id` but conflict target is UNIQUE `(tenant_id, sequence)`: two identity schemes in one table | `gateway/canonical_events.sql` | — | — | — | — | — | CONFLICTING schema | HIGH | Identity authority | CanonicalEventEnvelope | — |
| events | GatewayToKernelAdapter pipeline | Adapter constructed + initialized live, but `executeEvent` (reducer/projection/dispatcher pipeline) has zero callers | `gateway_runtime.js:387-388`; grep `executeEvent(` in bootstrap: none | — | ConstitutionalExecutionPipeline | — | — | GatewayToKernelAdapter | DORMANT_HISTORY (live-initialized, never executed) | HIGH | Execution boundary | EventRepository, registries | — |
| events | ConstitutionalRuntime | Alternate bootstrap (EventRepository + Dispatcher + ReducerRegistry + ProjectionRegistry + pipeline) required only by `gateway/test_kernel_replay.js` | `gateway/bootstrap/constitutional_runtime.js`; importer grep | test script | — | — | — | — | DORMANT_HISTORY | HIGH | Bootstrap authority | — | Do not delete per history rule; do not wire without reconciliation |
| events | EventWriteAuthority | Separate `events` table + distinct identity scheme; no live importer/constructor; comments still credit it | `gateway/event_write_authority.js`; importer grep | — | — | — | — | — | DORMANT_HISTORY shadow persistence | HIGH | Write-authority boundary | — | — |
| events | CanonicalizationService boundary | Business emitters use it; MissionRuntime, workers, EventBridge, POST /events, seed path call `UnifiedEventRuntime.emit` directly | `gateway_runtime.js` wiring; `canonicalization_service.js`; direct `emit(` call sites | MissionRuntime, WorkerRuntime, EventBridge, routes/events.js, `_seedBusinessEvents` | UnifiedEventRuntime | various | ping_events readers | CanonicalizationService (claimed, bypassed) | LIVE_BYPASS | HIGH | Canonical boundary | — | All direct emitters produce non-canonicalized journal rows |
| events | namespace defaults | `CanonicalizationService.DEFAULT_NAMESPACE='core::owner'` vs `UnifiedEventRuntime.emit` default `'core::system'`; identity includes namespace only when provided, so the same logical event gets different IDs on the two paths | `canonicalization_service.js`; `unified_event_runtime.js` identity block | boundary vs direct callers | — | — | — | two authorities | CONFLICTING | HIGH | Namespace authority | — | Cross-path dedupe, tenant consumers |
| events | POST /events vs POST /ingest | `/events` emits directly with no namespace authorization; `/ingest` enforces `authorizeNamespace` (400). The 2026-09-16 capture's 403 claim matches neither current path | `gateway/routes/events.js:71`, `gateway/routes/ingest.js` | HTTP clients | UnifiedEventRuntime / CanonicalizationService | — | — | — | CONFLICTING (docs vs code) | HIGH | Ingress authorization | — | FYD adapter, external producers |
| events | shutdown | `GatewayRuntime.shutdown()` only shuts down the kernel adapter; EventBridge interval, pg pool, MissionScheduler, WorkerRuntime keep running | `gateway/bootstrap/gateway_runtime.js:825-831`; no `bridge.stop()` call site | operator/tests | — | — | — | — | LIVE_BUG | HIGH | Lifecycle boundary | — | Tests (open handles), operators (unclean restarts) |
| events | seed | `_seedBusinessEvents` writes synthetic customers (Sarah Chen, Mike Rodriguez, Emily Watson) into `ping_events` on first boot with no provenance marker distinguishing seed from real | `gateway/bootstrap/gateway_runtime.js` `_seedBusinessEvents` | GatewayRuntime | emitters | GatewayRuntime | all journal readers | — | LIVE_BUG (data provenance) | HIGH | Source-truth boundary | BusinessEmitters | Analytics, graph, any consumer trusting journal as source truth |
| events | IntegrationManager | No duplicate flag or idempotency key reaches providers; redelivered events are indistinguishable from first delivery | `integration_manager.js` `emit()`; called from `unified_event_runtime.js` step 7 unconditionally | UnifiedEventRuntime.emit | posthog/email/sms providers | — | — | IntegrationManager | LIVE_BUG | HIGH | Idempotency boundary | analyticsPolicy | PostHog analytics (double count), email/SMS recipients |
| events | getDescendants | Recursive CTE does not project `created_at` but final query orders by it; expected PostgreSQL missing-column error, uncaught | `unified_event_runtime.js` `getDescendants()` (prior-session read; re-verify before patch) | routes/events.js `/:eventId/descendants` | pg | — | route clients | — | LIVE_BUG (probable) | MEDIUM | Causal traversal | — | FYD adapter traversal |
| events | ordering | No sequence on `ping_events`; reads order by timestamp only with no tie-breaker; bridge replaces occurrence time with ingestion time | schema in `unified_event_runtime.js` `initialize()`; `event_bridge.js` timestamp rebuild | — | — | — | replay/consumers | — | LIVE_BUG | HIGH | Replay determinism (SOUL #10) | — | Replay, audit, worker ordering |
| events | RepositoryStore | Fourth persistence mechanism (canonical artifacts, BYTEA) live on `routes/repository.js`, unreconciled with the three event journals | `ping-runtime/repository/repository_store.js`; `gateway/routes/repository.js` | repository routes | pg | route clients | route clients | RepositoryStore | CANONICAL_LIVE (adjacent domain) | HIGH | Storage authority | — | Noted for S3/S4 adjacency; not in this block's write path |

## 4. Findings and proposed diffs (WHY -> EVIDENCE -> MINIMUM CHANGE -> TEST -> RESULT)

**F1. Duplicate delivery dispatches side effects.**
WHY: Retry or bridge re-poll of an already-journaled event re-sends email/SMS/analytics and re-runs handler agent actions; the caller cannot distinguish "inserted" from "already existed".
EVIDENCE: `unified_event_runtime.js` `emit()`: after `ON CONFLICT DO NOTHING` returns `rowCount==0`, code increments `deduplicated` but does not return; handlers and `integrationManager.emit()` run unconditionally; returns `{status:'ok'}` with a rebuilt, non-inserted event.
MINIMUM CHANGE: Return immediately on `rowCount==0` with `{status:'duplicate', eventId, deduplicated:true}`; do not invoke handlers/integrations; do not rebuild the event (fetch the existing row if the caller needs it).
TEST: Emit once, capture provider counts; emit identical payload again; assert second call returns `status:'duplicate'`, provider send counts unchanged, and only one `ping_events` row exists.
RESULT: At-least-once journaling with at-most-once side effects; redelivery becomes safe.

**F2. Event identity is not canonical.**
WHY: Same semantic event with different key insertion order gets a different SHA-256 ID, breaking dedupe, witness matching, and replay identity.
EVIDENCE: `JSON.stringify(identity)` in `emit()` and `_logicalIdentity()`; proven by local node run (`{x:1,y:2}` vs `{y:2,x:1}` hash differently).
MINIMUM CHANGE: Route identity material through `CanonicalBytes.serialize()` (already the declared constitutional path in `identity_authority.js`) or a documented stable-stringify; strip volatile fields at all depths, not just top level.
TEST: Build the same logical event with shuffled key order through both `emit()` and `canonicalizeAndEmit()`; assert identical event IDs.
RESULT: Deterministic identity; dedupe works across producers.

**F3. Collision check drops nested keys (false equivalence).**
WHY: Two genuinely different payloads can compare equal, so the second is silently treated as a duplicate and its differing content is lost with no error.
EVIDENCE: `canon(o) = JSON.stringify(o, Object.keys(o).sort())`; proven by local node run (`{a:1,b:{a:1,z:2}}` vs `{a:1,b:{a:1,z:999}}` canon-identical).
MINIMUM CHANGE: Replace `canon()` with the same canonical serializer used for identity (F2); compare full canonical bytes.
TEST: Unit test with nested-only differences; assert collision error raised, not silent duplicate.
RESULT: Collision detection becomes sound.

**F4. Validator contract is phantom.**
WHY: Payload schema, schema version, and authority-owner checks in `validate(event)` never run; malformed events enter the journal.
EVIDENCE: `event_validator.js` has no `validateEventType`; `emit()` falls back to `isRegistered(eventType)`.
MINIMUM CHANGE: Implement `validateEventType(eventType, event)` (or rename call site to `validate`) and call the full `validate(event)` on the emit path; return typed validation errors before governance.
TEST: Emit an event with an unregistered type and one with a schema-violating payload; assert both rejected with typed errors.
RESULT: The validator's documented guarantees become real.

**F5. Metadata overrides constitutional fields.**
WHY: Callers can spoof `schema_version`, `namespace`, trace IDs, confidence, canonical id/hash/version, lifecycle, and evidence by nesting them in `metadata`.
EVIDENCE: `...options.metadata` spread after constitutional assignments in both `emit()` and `canonicalizeAndEmit()`.
MINIMUM CHANGE: Assign constitutional fields after the metadata spread, or delete the reserved keys from the metadata copy before spreading.
TEST: Emit with `metadata: {schema_version:'9.9.9', namespace:'tenant::evil'}`; assert stored row keeps runtime-assigned values.
RESULT: Journal integrity for trace and schema fields.

**F6. `verified:true` can accompany `status:'error'`.**
WHY: API clients (FYD adapter) cannot tell "canonicalized and durable" from "verified in memory but not persisted".
EVIDENCE: `canonicalizeAndEmit` returns `{verified, status}` independently; envelope verified in memory, only payload persisted, persist failure path keeps `verified:true`.
MINIMUM CHANGE: Set `verified:false` (or omit) whenever `status!=='ok'`; document that `verified` attests the in-memory envelope only until the envelope itself is persisted.
TEST: Force a persist failure (e.g., closed pool); assert response is `status:'error'` with no `verified:true`.
RESULT: Unambiguous API contract.

**F7. Governance does not enforce source ownership.**
WHY: Any producer can emit under any `source`; `_skipGovernance` is a plain caller flag (used by EventBridge).
EVIDENCE: `event_governance.js` never compares producer source to registry ownership; `emit()` honors `options._skipGovernance`.
MINIMUM CHANGE: Pass the authenticated producer identity into `emit()` from routes (not from caller options); make `_skipGovernance` an internal symbol/constant only the bridge module can set, or remove it and have the bridge emit pre-governed types.
TEST: Emit with `source:'fake'` for a registry-owned type; assert rejection.
RESULT: Source claims become trustworthy.

**F8. `GET /events/unprocessed` is unreachable (shadowed by `/:stream`).**
WHY: WorkerRuntime inbox polling always receives the wrong handler's empty result; workers believe there is never unprocessed work.
EVIDENCE: `gateway/routes/events.js`: `router.get('/:stream')` at line 59 precedes `router.get('/unprocessed')` at line 145.
MINIMUM CHANGE: Move `/unprocessed` (and any other literal sub-routes) above `/:stream`.
TEST: `GET /events/unprocessed` returns `getUnprocessedEvents` shape, not the stream shape; worker poll integration test.
RESULT: Worker inbox path restored. (Also decide which table's `processed` flag is canonical; see F9.)

**F9. Three `processed` flags, three tables, no common semantics.**
WHY: `ping_events.processed` has no writer; `repository_events.processed` is written only by `POST /events/processed`; `canonical_events.processed` is written by the bridge (mark-then-emit, F11). "Unprocessed" means three different things.
EVIDENCE: Grep for writers; `eventReadAuthority.markProcessed` targets `repository_events`; bridge UPDATE targets `canonical_events`; `UnifiedEventRuntime.query({unprocessed:true})` reads `ping_events.processed`.
MINIMUM CHANGE: Declare one canonical meaning (recommend: `ping_events.processed`, the journal of record); add the missing writer (worker ack path) or remove the vacuous filter and `/mission_control/inbox` until the writer exists.
TEST: Full cycle: emit -> list unprocessed (appears) -> ack -> list unprocessed (gone) on the canonical table.
RESULT: Inbox/ack semantics become real.

**F10. Read authority vs route fallback answer different questions.**
WHY: The same URL returns `aggregate_type`-filtered rows or `event_type`-filtered rows depending on whether the authority had data; `/stats` fallback fabricates `streams`.
EVIDENCE: `runtime/kernel/event_read_authority.js` (repository_events only; catch -> empty/null); `gateway/routes/events.js` raw-SQL fallback on `ping_events`.
MINIMUM CHANGE: Remove the silent fallback; surface authority errors as 503 with typed body; unify the `:stream` parameter to one documented semantic.
TEST: Stop postgres (test double) -> assert 503, not empty 200; `GET /events/REVIEW_RECEIVED` returns the same semantic on both paths.
RESULT: Reads become trustworthy; failures visible (SOUL #11).

**F11. Bridge mark-then-emit loses events.**
WHY: `UPDATE canonical_events SET processed=true` runs before `emit()`; a failed emit is never retried and has no DLQ.
EVIDENCE: `event_bridge.js` canonical leg ordering; per-row failures only `console.error`.
MINIMUM CHANGE: Emit first, mark processed only on success; on failure, record `last_error`/`retries` and leave `processed=false` (or move to a dead-letter table after N retries).
TEST: Make `emit()` throw for one row; assert row remains `processed=false` with `last_error` set and is retried on next poll.
RESULT: No silent loss on the canonical leg.

**F12. Bridge cursor law strands rows.**
WHY: `event_id > cursor` ordering on random UUID/hash IDs is not insertion-monotonic; cursor advances past failed rows.
EVIDENCE: `event_bridge.js` both poll legs.
MINIMUM CHANGE: Cursor on `(created_at, event_id)` or a monotonic sequence; advance the cursor only past successfully emitted rows.
TEST: Insert rows with out-of-order IDs; assert all are eventually bridged exactly once.
RESULT: Complete, ordered bridging.

**F13. Bridge poll overlap + no stop on shutdown.**
WHY: Overlapping polls double-emit (compounds F1); after `shutdown()` the 5s interval keeps the process alive and polling.
EVIDENCE: `start()` does not await `_poll()`; no mutex; `GatewayRuntime.shutdown()` never calls `bridge.stop()` and never closes the pool.
MINIMUM CHANGE: Guard `_poll` with a boolean/lease; call `bridge.stop()`, stop scheduler/workers, and close the pool in `shutdown()`.
TEST: Start, trigger slow poll, assert no concurrent `_poll`; call `shutdown()`, assert process can exit and no further polls occur.
RESULT: Clean lifecycle; no duplicate fires from overlap.

**F14. Bridge tenant/timestamp provenance loss.**
WHY: Bridged canonical events land under `core::system` with bridge ingestion time; `event_version` always defaults.
EVIDENCE: `event_bridge.js` canonical leg: no `namespace` passed; `timestamp` rebuilt; `row.event_version` never selected.
MINIMUM CHANGE: Map `tenant_id` -> `namespace: 'tenant::<id>'`; preserve source `timestamp` as occurrence time (add `bridged_at` for ingestion); select `event_version`.
TEST: Bridge a tenant canonical event; assert `ping_events` row carries tenant namespace, original timestamp, and source version.
RESULT: Provenance survives bridging.

**F15. Canonical boundary bypass.**
WHY: The "every event crosses CanonicalizationService" claim is false; most runtime producers emit directly.
EVIDENCE: Direct `emit(` call sites: MissionRuntime, workers, EventBridge, `routes/events.js`, `_seedBusinessEvents`; only `routes/ingest.js` and business emitters use the service.
MINIMUM CHANGE: Either route all internal emits through `canonicalizeAndEmit` (preferred) or formally narrow the claim to "ingress boundary" and document which producers are exempt and why.
TEST: Enumerate `emit(` call sites; assert each passes through the service or carries an explicit exemption marker.
RESULT: Stated sovereignty matches actual capability (SOUL #8).

**F16. Namespace default drift.**
WHY: `core::owner` (service) vs `core::system` (runtime) defaults plus conditional namespace inclusion in identity material give the same logical event different IDs per path.
EVIDENCE: `canonicalization_service.js` DEFAULT_NAMESPACE; `unified_event_runtime.js` identity block.
MINIMUM CHANGE: Single default namespace constant shared by both; always include the resolved namespace in identity material.
TEST: Same logical event via both paths -> identical event ID.
RESULT: Cross-path dedupe works.

**F17. repository_events writers are all dormant; record the correction.**
WHY: The 2026-09-23 forensics report lists five writers as "PROVEN live"; current code shows none are constructed on the live path. Acting on the stale claim would misdirect consolidation work.
EVIDENCE: Importer/constructor greps (see table row).
MINIMUM CHANGE: None to code. Update the standing record: `repository_events` is a legacy/import journal drained by the bridge; its writers are DORMANT_HISTORY. Decide explicitly whether to revive, bridge-drain-and-freeze, or formally decommission.
TEST: N/A (classification correction).
RESULT: No work is planned against phantom writers.

**F18. `getDescendants()` ordering likely invalid.**
WHY: If the recursive CTE does not project `created_at`, the final `ORDER BY created_at` throws at runtime on the causal-traversal endpoint.
EVIDENCE: Prior-session read of `unified_event_runtime.js` `getDescendants()`; flagged MEDIUM pending re-verification.
MINIMUM CHANGE: Project `created_at` through the CTE or order by a projected column.
TEST: Call `GET /events/:id/descendants` on a journal with a causal chain; assert 200 with ordered rows.
RESULT: Traversal endpoint works.

**F19. Seed data pollutes source truth.**
WHY: Synthetic customers in `ping_events` are indistinguishable from real events for analytics, graph, and future learning loops.
EVIDENCE: `_seedBusinessEvents` in `gateway_runtime.js`.
MINIMUM CHANGE: Tag seed events (`metadata.seed:true`, distinct source) or move seeding behind an explicit flag; document in the journal's provenance notes.
TEST: Fresh boot -> seed rows carry the marker; `query()` can exclude them.
RESULT: Source truth stays clean (SOUL #9, #14).

**F20. Adapter pipeline is live-initialized but never executed.**
WHY: Initialized reducer/projection/dispatcher machinery that never runs is a trap for future work (looks available, does nothing).
EVIDENCE: `gateway_adapter.js` constructs the pipeline; `executeEvent` has zero callers.
MINIMUM CHANGE: Either wire a real caller or mark the pipeline explicitly dormant with a comment pointing at the decision record; do not delete per the history rule.
TEST: N/A.
RESULT: No one builds on a phantom execution path.

## 5. Adjacent gap observed (next)

Worker consumption and acknowledgement semantics across the three journals. This audit exposed three incompatible meanings of "unprocessed" (`ping_events.processed` unwritten, `repository_events.processed` route-written, `canonical_events.processed` bridge-written), a shadowed `/events/unprocessed` route that WorkerRuntime polls, and a bridge that marks-then-emits. The nearest boundary after the event spine is the worker/inbox/ack contract: who consumes from which journal, what "done" means, and where the dead-letter path lives. Recommend the next worker treats that as its primary seam.
