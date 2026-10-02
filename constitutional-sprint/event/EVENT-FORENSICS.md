# EVENT FORENSICS — PING Constitutional Convergence Sprint (Phase 2 / P1)

Investigator: event-forensics subagent (read-only). Date: 2026-09-23.
Scope note: the assigned path `/home/nolan/projects/ping-constitutional` is the **FYD website repo**
(remote `git@github.com:piging2/fyd.git`, branch `constitutional-convergence-v2`, HEAD `a69bb68f`) — an
ADAPTER/CLIENT of the PING runtime, containing no event machinery. The canonical event core lives at
`/home/nolan/ping` (crx-runtime origin, branch `refactor/runtime-authority-convergence`, HEAD `cc6856c`),
with deployment copies at `/home/nolan/ping-gateway-src` and `/home/nolan/ping-gateway-build`
(identical `gateway/routes/events.js`, sha256 `ad9b9c92f24b915a3edbf8ed5753f57fbb9f65d5045616e1ad51f159465fff1b`).
A sibling worktree `/home/nolan/projects/constitutional-runtime` (same origin, branch
`constitutional-trunk`, HEAD `e1fba76`) holds a parallel Python implementation. All findings below are
read-only; no repo was written to and no git state was mutated. **PROVEN**

Transport: every remote command ran as
`ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cd <base> && <cmd>"'` (no pipes in remote
cmds; large output redirected to local files). Raw evidence: `~/workspace/constitutional-sprint/event/`.

---

## 0. Conflict resolution (headline)

The conflict was: "live canonical event path is UnifiedEventRuntime → ping_events" vs "another branch
points toward ConstitutionalEventStore."

- `ConstitutionalEventStore`: **zero hits** in every branch and worktree searched
  (`ping-constitutional`: constitutional-convergence-v2, main, fyd-deploy, fyd-factory;
  `constitutional-runtime`: constitutional-trunk, master; `/home/nolan/ping` code dirs;
  `/home/nolan/workspace` code). No file, class, table, or doc reference exists in current source.
  **NOT PROVEN** to exist → it cannot be sovereign. The "branch points toward" evidence is stale or
  was never merged; branch archaeology must not override the live path.
- `UnifiedEventRuntime → ping_events`: fully traced in live source, wired in the production
  composition root, and corroborated by the 2026-09-16/17 live capture
  (`research/website-truth-matrix.md` in ping-constitutional: POST /events patched live,
  `trg_ping_events_append_only` live, event `5e24e593f6a9f7b762ecedfed45a447faba57b6d1d9dded1dacd28feab3fe443`
  persisted under `api:muse-level-2`). **PROVEN** live.

**Verdict: UnifiedEventRuntime → ping_events is sovereign. ConstitutionalEventStore is a ghost.**

---

## 2A — AcquisitionManager: caller → fate map

`AcquisitionManager` (and `collectEvidence`/`batchCollectEvidence` on it) was searched across:
- `/home/nolan/projects/ping-constitutional` — all branches (constitutional-convergence-v2, main,
  fyd-deploy, fyd-factory) + full worktree: **0 hits** (`git grep` and recursive `grep`,
  excluding `.git`/`node_modules`).
- `/home/nolan/projects/constitutional-runtime` (constitutional-trunk + master): **0 hits**.
- `/home/nolan/ping` code dirs (ping-runtime, gateway, authorities, kernel, constitution,
  capabilities, workers, runtime, storage, api, application): **0 hits**.
- `/home/nolan/workspace`: hits only in prose inside forensics/agent tool-output text files
  (`ping-overnight/forensics/AUTHORITY_FORENSICS.md`, agent `tool-output/*.txt`) — mentions, not code.

The only `collectEvidence` in code is an unrelated method on the Dispatcher class:

- `/home/nolan/ping/ping-runtime/orchestration/dispatcher.js:157` —
  `collectEvidence(batchId, workerOutputs) { return { batchId, worker_count: workerOutputs.length, findings: ... } }`
  — batch evidence aggregation for worker outputs, not an AcquisitionManager, not event persistence.

The only "acquisition" trace in event code is a metadata field:
- `constitutional-runtime/runtime/contracts/src/events/index.ts` — `EventMetadata.acquisitionSource?: string`
  (schema only, never populated by any live writer found).

**Caller → fate map: EMPTY. There are no callers because the class does not exist in current source.**
No events are collected, persisted, published, discarded, or transformed by `AcquisitionManager`
because there is nothing to trace. **NOT PROVEN** (existence). If a prior sprint referenced it, the
reference is stale; do not resurrect it from notes.

---

## 2B — IEventAuthority / EventAuthority classification

| # | Symbol | Location | Classification | Evidence |
|---|--------|----------|----------------|----------|
| 1 | `IEventAuthority` (interface) | `runtime/kernel/events/event-authority-interface.ts` (exists identically in `/home/nolan/ping` and `constitutional-runtime`) | **ABANDONED CONTRACT** | In-memory pub/sub shape only: `subscribe/unsubscribe/publish/getHistory/getHistoryByExecution/getHistoryByType/clearHistory`. Zero implementations, zero imports, zero `new`, zero `implements` in any code dir searched. "Only this interface crosses subsystem boundaries" (file header) is aspirational — nothing crosses it. Name contains "Authority" but it owns nothing. **NOT PROVEN** live. |
| 2 | `*EventAuthority` classes in live JS core | `/home/nolan/ping` ping-runtime/gateway/authorities/kernel | **NONE EXIST** | `grep -rln 'EventAuthority' --include='*.js'` over those dirs (excluding tests) returns nothing. **PROVEN** absent. |
| 3 | `EventReadAuthority` / `EventWriteAuthority` | `/home/nolan/ping/runtime/kernel/event_read_authority.js` (+ `gateway` shims `ping-runtime/events/event_read_authority.js`, re-export per PATCH_003) | **LIVE CONTRACT (partial)** — read-side query interface | `gateway/routes/events.js` calls `eventReadAuthority.getAllEvents/getRecentEvents/getEventStats/getEventsByStream`, with direct `pool.query('SELECT * FROM ping_events …')` fallback when the authority returns empty (e.g. events.js lines ~17-80 in ping-gateway-src). The fallback, not the authority, is the de-facto read path in several handlers. **PROVEN** wired; **partial** sovereignty (fallback exists). |
| 4 | `EventRepository` (Python ABC) + `PostgresEventRepository` | `constitutional-runtime/storage/repositories.py:17` / `:63` | **ABANDONED PERSISTENCE INTERFACE** | `append_event` does dup-check + `INSERT` into `events` + NATS outbox write. But: `api/main.py` contains **zero** references to `PostgresEventRepository`/`append_event` in current source — the 2026-07-28 `PING_CONSTITUTIONAL_LEDGER.md` claim "YES (api/main.py imports PostgresEventRepository)" is **REFUTED** by current source. `application/event_service.py:create_event` persists inline instead (see 2D). Nothing constructs it on any live path. Code exists, unwired. |
| 5 | `EventStore` (Python) | `constitutional-runtime/storage/event_store.py` | **ABANDONED** | Same shape as #4 (dup-check, canonical hashing via `CanonicalAuthority`, NATS outbox). No live caller; the live gateway is the JS stack. |
| 6 | `EventRepository` (JS kernel) | `/home/nolan/ping/runtime/kernel/event_repository.js` (+ `gateway/event_repository.js` shim, PATCH_002) | **LIVE PERSISTENCE INTERFACE** (secondary store) | Backs the `repository_events` table (hash-chained event sourcing). Writers: `ping-runtime/agents/agent_memory_authority.js:617,646,675,703,731`, `ping-runtime/agents/distributed_desktop_agents.js:579,607,635,663,691`, `gateway/automatic_mission_generator.js:595,624,653`, `gateway/continuous_replay_authority.js:588,616,647,675`, `gateway/append_orchestrator.js:91` (`INSERT INTO repository_events …`). **PROVEN** live as the agent/memory/mission journal; bridged into `ping_events` (see 2D). |
| 7 | Business "authorities" (`review_authority`, `customer_authority`, `project_authority`, `ai_workspace_authority`) | `/home/nolan/ping/ping-runtime/business/*_authority.js`, `gateway/canonical_event_envelope.js` | **LIVE PRODUCERS, not event authorities** | They emit business events via `canonicalEventEnvelope.executeEmitEvent` → `canonical_events` table → bridged to `ping_events`. They own business-entity emission, not the event primitive. |
| 8 | `CanonicalizationService` | `/home/nolan/ping/ping-runtime/canonicalization/canonicalization_service.js` | **LIVE BOUNDARY CONTRACT** | Constructed once in `gateway/bootstrap/gateway_runtime.js` (`core` ~line 447, `ping-gateway-src` equivalent), wraps `UnifiedEventRuntime`; owns namespace resolution/authorization (`authorizeNamespace`/`resolveNamespace`, `core::<name>`/`tenant::<id>` syntax) and `canonicalizeAndEmit`. Serves `POST /ingest` and all business emitters (`ReviewEmitter`, `CustomerEmitter`, `ProjectEmitter`, `ConnectorEmitter`, `SystemEmitter` take it in the bootstrap). **PROVEN** live. |

Rule applied: an interface is not constitutional because its name says "Authority" — only #3, #6, #8
are wired to the runtime; #1, #4, #5 are orphans.

---

## 2C — ConstitutionalEventStore trace

Skipped as a trace because the subject does not exist: zero hits for `ConstitutionalEventStore` in
all branches/worktrees/code dirs searched (see §0). There is no construction, append, identity,
canonicalization, hashing, sequence, persistence, read, stream, replay, failure, or transaction
behavior to trace. **NOT PROVEN** (existence). Any convergence plan that names it as a target must
be treated as a rename/rebrand proposal, not a migration from existing code.

(For the record, the nearest real things: JS kernel `EventRepository` → `repository_events` (§2B #6),
Python `EventStore` → `events` table (§2B #5, abandoned), `UnifiedEventRuntime` → `ping_events`
(§2D, sovereign).)

---

## 2D — Head-to-head: which event store is actually live

### The sovereign path: UnifiedEventRuntime → ping_events — **PROVEN LIVE**

**Construction (composition root).** `gateway/bootstrap/gateway_runtime.js` (both `/home/nolan/ping`
and `/home/nolan/ping-gateway-src`):
- `const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime');` (line 72)
- `unifiedEventRuntime = new UnifiedEventRuntime({ pool, eventValidator, eventGovernance, integrationManager })`
  (constructed in the init sequence; `[GatewayRuntime] Unified Event Runtime initialized` logged)
- `canonicalizationService = new CanonicalizationService({ eventRuntime: unifiedEventRuntime, namespaces: {...} })`
- `this._app.use('/ingest', createIngestRoutes(services.canonicalizationService));` (line ~691)
- `createEventRoutes(eventReadAuthority, eventRuntime, pool)` mounted for `/events`

**Write path 1 — POST /ingest (canonical boundary).**
`gateway/routes/ingest.js:48,53`:
`const auth = canonicalizationService.authorizeNamespace(body.source, body.namespace);`
`const result = await canonicalizationService.canonicalizeAndEmit({ source, eventType, payload, ... })`
→ `ping-runtime/canonicalization/canonicalization_service.js:109-176`: builds a canonical envelope
via `createCanonicalObject({ kind: eventType, payload, authority: source, options: { namespace, confidence (default 0.5), metadata: { canonical_version, lifecycle_stage: 'observation', evidence } } })`,
then `this._eventRuntime.emit(eventType, source, payload, { namespace: ns, logical_id: this._logicalIdentity(payload, logicalId), metadata: { canonical_object_id, canonical_hash, canonical_version, lifecycle_stage, evidence, confidence, ... } })`.
**PROVEN** (source; matches the 2026-09-16/17 live-capture description of authorizeNamespace +
canonicalizeAndEmit, modulo the POST-/events vs /ingest discrepancy noted below).

**Write path 2 — POST /events (spine, direct).**
`ping-runtime/events/unified_event_runtime.js:73-198` `emit(eventType, source, payload, options)`:
1. Identity: `eventId = sha256(JSON.stringify({ eventType, source, [namespace], [logical_id|payload] }))`
   — deterministic, content-based, no `Date.now()` (lines 73-80).
2. Type validation via `EventValidator` (event_registry.json); failure → `{ status: 'error' }`, counted.
3. Governance via `EventGovernance.validateEvent(...)`; namespace default `core::system` resolved once here.
4. Canonical event built with `constitutionalTimeAuthority.nowAsISOString()` timestamp and metadata
   `{ schema_version: '1.0.0', namespace, causation_id, correlation_id, confidence? }`.
5. **Durable append**: `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace) VALUES ($1..$7) ON CONFLICT (event_id) DO NOTHING` (lines 147-153).
   Duplicate → counted as `deduplicated`, returned early; **redelivery never re-triggers handlers or
   integrations** (lines 158-164, "Replay idempotency" comment).
6. Dispatch to in-process `.on(eventType)` handlers (first delivery only).
7. Route to `IntegrationManager` (posthog/email/sms integrations registered in bootstrap).

`POST /events` route (`gateway/routes/events.js`) calls `eventRuntime.emit(...)` directly in both
copies (with a BFF/social-ingest-adapter normalization branch in the `/home/nolan/ping` worktree
copy, and a tenant-registry-validation + `namespace = tenant::<id>` branch in the
`ping-gateway-src`/`ping-gateway-build` copies — see "Copy divergence" below).

**Read path.** `GET /events`, `/events/:stream`, `/events/recent`, `/events/stats` in
`gateway/routes/events.js` → `EventReadAuthority` first, `SELECT * FROM ping_events …` fallback.
The FYD website (`/home/nolan/projects/ping-constitutional`) is a pure HTTP client of these:
`src/lib/ping/ping-object-reader.ts:279,322,370` (`GET /events/:type`, `POST /events` via `gw`/`gwFyd`
helpers); `src/fyd/social/*` journal social actions into `ping_events`. **PROVEN** adapter relationship.

**Table + hardening.** `initialize()` creates `ping_events (event_id VARCHAR(64) PRIMARY KEY,
event_type, source, timestamp TIMESTAMPTZ, payload JSONB, metadata JSONB, namespace, processed
BOOLEAN, created_at)` plus indexes on type/source/namespace/processed/timestamp/causation/correlation
(unified_event_runtime.js:43-63). The 2026-09-16/17 capture adds DB trigger
`trg_ping_events_append_only` (UPDATE/DELETE rejected; TRUNCATE not covered — no code path uses it).

### Secondary live stores (feed the spine via EventBridge)

- **`repository_events`** (kernel `EventRepository`, `runtime/kernel/event_repository.js:17-60`):
  agent/memory/mission event sourcing; hash-chained (`RuntimeID`, `PreviousEventHash`,
  `CanonicalEventHash`, `ReducerHash`, `WitnessHash`, `ReplayHash`, per-`object_id` `sequence`).
  Writers listed in §2B #6. **PROVEN** live, secondary.
- **`canonical_events`** (`Canonical Event Envelope Authority`, `gateway/canonical_event_envelope.js`,
  `gateway/routes/canonical_events.js`): business events from `ping-runtime/business/*_authority.js`.
  **PROVEN** live, secondary.
- **`EventBridge`** (`ping-runtime/events/event_bridge.js:1-50`): "Polls repository_events and
  canonical_events tables, re-emits them through UnifiedEventRuntime into ping_events… Single source
  of truth: UnifiedEventRuntime." Started in the bootstrap in **both** copies
  (`gateway_runtime.js` `eventBridge.start()`, 5s poll, batch 50). **PROVEN** live.

### Not live / not event stores

- `ConstitutionalEventStore`: does not exist (§0, §2C).
- crx-runtime Python stack (`storage/event_store.py`, `storage/repositories.py`,
  `application/event_service.py` → table `events`): code exists in
  `/home/nolan/projects/constitutional-runtime` (branch `constitutional-trunk`), but the live gateway
  is the JS stack, the table name differs (`events` vs `ping_events`), and the ledger's
  "api/main.py imports PostgresEventRepository" claim is refuted by current source. **NOT PROVEN** live;
  treat as a dormant parallel implementation.
- SQLite: `gateway/persistence_adapter.js` offers a `sqlite` backend switch
  (`sqlite_persistence_backend`), but no event tables live in SQLite; all event writes are PostgreSQL.
  **PROVEN** no SQLite event storage.
- `ping-constitutional` (FYD repo): no local event store at all — HTTP client only.

### Copy divergence (flagged, unresolved)

`/home/nolan/ping/gateway/routes/events.js` (git worktree, `refactor/runtime-authority-convergence`)
vs `/home/nolan/ping-gateway-src` + `/home/nolan/ping-gateway-build` (identical sha256):
the src/build copies validate `tenant_id` against the `tenants` registry and set
`namespace = tenant::<id>` before `eventRuntime.emit`; the worktree copy has the BFF
`social_ingest_adapter`/`knowledge_ingest_adapter` normalization branch and no tenant check.
The 2026-09-16/17 live capture ("POST /events → authorizeNamespace + canonicalizeAndEmit", malformed
namespace → 403) matches **neither** copy exactly. Which bytes run in the Oracle `ping-gateway`
container **cannot be proven from Pig-side source alone** — see the unresolved question at the end.

**2D verdict: UnifiedEventRuntime → ping_events is the live canonical path (PROVEN).**
`repository_events` and `canonical_events` are live secondary journals that converge into it via
EventBridge. Everything else is dormant, dead, or nonexistent.

---

## 2E — EVENT DECISION MATRIX

| Row | Current owner | Competing mechanisms | Live? | Decision (evidence-backed) |
|-----|---------------|----------------------|-------|----------------------------|
| EVENT CONSTRUCTION | `CanonicalizationService.canonicalizeAndEmit` (boundary) + `UnifiedEventRuntime.emit` (spine) — `ping-runtime/canonicalization/canonicalization_service.js:109`, `ping-runtime/events/unified_event_runtime.js:73` | BFF adapters (`social_ingest_adapter`/`knowledge_ingest_adapter` normalize → `emit`); business authorities → `canonical_events`; kernel `EventRepository.appendEvent` → `repository_events`; crx Python `EventApplicationService.create_event` (dormant) | Yes — all three live secondaries converge through `emit` | **Sovereign: CanonicalizationService at the boundary, UnifiedEventRuntime.emit for the record.** All producers funnel to `emit`; EventBridge re-emits secondaries through it. **PROVEN** |
| EVENT OCCURRENCE IDENTITY | `sha256(JSON.stringify({eventType, source, [namespace], [logical_id\|payload]}))` in `emit` (lines 73-80); `logical_id` = timestamp-stripped payload via `_logicalIdentity` (canonicalization_service.js) | crx `EventEnvelope.create` → `hash_dict` (dormant repo); canonical envelope `envelope.id` (carried as `metadata.canonical_object_id`, not the journal PK); `repository_events.event_id` (different scheme + RuntimeID chain) | Yes | **Sovereign: UnifiedEventRuntime content-hash.** Caveat: it uses `JSON.stringify` (key-order-sensitive), not canonical JSON — residual determinism risk if producers serialize keys inconsistently. **PROVEN with caveat** |
| EVENT CANONICAL BYTES | `createCanonicalObject` / `verifyCanonicalObject` at the boundary (canonical envelope; `canonical_hash`, `canonical_version` in metadata); FYD adapter `canonicalizeJson` (sorted-key recursive JSON, `src/lib/ping/dev-signer.ts` via `src/fyd/social/transition-id.ts`) | `CanonicalAuthority.serialize_to_canonical_bytes` (crx Python, dormant); `JSON.stringify` inside `emit` identity hash (not canonical) | Yes (boundary) | **Sovereign: the canonical envelope at the boundary.** Note the gap: the journal identity hash itself is not canonical-bytes-based. **PROVEN** |
| EVENT HASHING | SHA-256 (`crypto.createHash('sha256')`) in `emit`; `envelope.canonical_hash` in metadata; hash chain (`PreviousEventHash`/`CanonicalEventHash`) in `repository_events` | crx `HashAuthority.hash_dict` (dormant) | Yes | **Sovereign: SHA-256 via UnifiedEventRuntime.** **PROVEN** |
| EVENT DURABLE APPEND | `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING` + DB trigger `trg_ping_events_append_only` (UPDATE/DELETE rejected) | `repository_events` (kernel, live secondary); `canonical_events` (live secondary); crx `events` table (dormant); SQLite (no event tables — **PROVEN** absent) | Yes | **Sovereign: `ping_events`.** Secondaries are journals that bridge into it; the trigger makes it append-only at the DB layer. **PROVEN** |
| EVENT ORDERING | `timestamp`/`created_at` ordering (`ORDER BY timestamp DESC` in read routes); no sequence column in `ping_events` | `repository_events(object_id, sequence)` per-object sequence (live secondary); crx `global_sequence` (dormant) | Yes | **Sovereign by default: timestamp ordering.** Weaker than a sequence (clock dependence); the secondary `repository_events` has the only real sequence, per-object. Flag for the coordinator. **PROVEN** |
| EVENT QUERY | `EventReadAuthority` (CQRS read side: `getAllEvents/getRecentEvents/getEventStats/getEventsByStream`) with direct `pool.query('SELECT * FROM ping_events …')` fallback in `gateway/routes/events.js` | crx `load_events`/`load_stream` (dormant) | Partial | **Sovereign in name: EventReadAuthority; sovereign in fact: shared with the SQL fallback.** `GET /events`, `/events/:stream`, `/events/recent`, `/events/stats` all live. **PROVEN (partial)** |
| EVENT TRANSPORT | In-process `.on(type, handler)` dispatch + `IntegrationManager` (posthog/email/sms, registered in bootstrap) + `EventBridge` 5s poll for secondary tables | NATS transactional outbox — exists **only** in dormant crx Python code (`storage/event_store.py`, `storage/repositories.py`); no NATS in the JS gateway event path | Yes (in-process + integrations + bridge) | **Sovereign: in-process dispatch + IntegrationManager; NATS is NOT on the live path.** Anyone planning "the NATS event bus" is reading the dormant repo. **PROVEN** |
| EVENT REPLAY | Idempotent re-emit: EventBridge dedupes by `event_id`; `emit` step 5b suppresses handlers/integrations on duplicate delivery ("a duplicate delivery converges on the already-stored row"); `repository_events` hash chain supports per-object replay; `continuous_replay_authority.js` appends new events | crx `kernel/replay.py` (dormant); no full-journal replay-from-scratch consumer found in the JS gateway | Partial | **Sovereign mechanism: event_id-deduped re-emit (convergence, not reconstruction).** There is no proven "rebuild all state from the journal" consumer on the live path. **PROVEN (partial)** |

---

## Canonical-core section (extended scope: `/home/nolan/ping`)

`/home/nolan/ping` is the crx-runtime git repo (`https://github.com/ngesk2/crx-runtime.git`) on
branch `refactor/runtime-authority-convergence` (HEAD `cc6856c`) — the live PING runtime home
(`authorities/`, `kernel/`, `gateway/`, `capabilities/`, `constitution/`, `ping-runtime/`,
`workers/`, `vault/`, `workspaces/`). The hundreds of top-level `*.md` audit files were treated as
pointers only; every claim above is grounded in code under `ping-runtime/`, `gateway/`, or `runtime/`.
Nothing was written there; no process was touched; no secret values were printed (vault/oauth/config
contents were never opened — only file names and non-secret code were read).

Adapter-repo conclusions **CONFIRMED** against the core:
- The FYD repo (`ping-constitutional`) is a pure HTTP client of the PING gateway event API —
  **CONFIRMED** (`src/lib/ping/ping-object-reader.ts:279,322,370` → `GET /events/:type`, `POST /events`).
- The only `UnifiedEventRuntime` mention in the adapter repo is a comment in
  `src/fyd/social/transition-id.ts:4` ("Mirrors UnifiedEventRuntime.emit") — the real class lives in
  the core at `ping-runtime/events/unified_event_runtime.js` — **CONFIRMED** (comment mirrors reality).
- `IdentityAuthority` referenced by that comment exists in the core at
  `ping-runtime/authorities/identity_authority.js` — **CONFIRMED**.

Adapter-repo conclusions **REFUTED** by the core:
- Any suggestion that the Python `EventRepository`/`EventStore` (constitutional-runtime worktree) is
  the live path — **REFUTED**: the live gateway is the JS `UnifiedEventRuntime`; the Python
  `api/main.py` does not import `PostgresEventRepository` in current source.
- Any suggestion that `IEventAuthority` is a live contract — **REFUTED**: zero implementations and
  zero imports in the core.
- The 2026-07-28 `PING_CONSTITUTIONAL_LEDGER.md` row "Event Repository … Imported? YES (api/main.py
  imports PostgresEventRepository)" — **REFUTED** by current source (no such import).

New from the core (not visible in the adapter repo):
- Three-table reality: `ping_events` (sovereign) ← EventBridge ← `repository_events` + `canonical_events`
  (live secondaries with distinct writers).
- `POST /ingest` is the CanonicalizationService boundary; `POST /events` emits through the spine
  directly (both copies), with copy divergence on tenant validation.
- In-process subscribers: `embedding_service.js:132` (Qdrant projection), `event_to_mission_bridge.js:95`
  (mission creation), `gateway_runtime.js:598` (bootstrap subscriber).

---

## Single most important unresolved event question for the coordinator

**Which exact `POST /events` code is running in the Oracle `ping-gateway` container right now?**
The 2026-09-16/17 live capture says POST /events was patched to route through
`CanonicalizationService` (`authorizeNamespace` → 403 on malformed namespace, 401 unauthenticated).
Pig-side source has two versions and neither matches: `/home/nolan/ping` (worktree) emits via
`eventRuntime.emit` with a BFF-adapter branch and no tenant check; `/home/nolan/ping-gateway-src`
and `/home/nolan/ping-gateway-build` (identical) do tenant-registry validation + `tenant::<id>`
namespace then `eventRuntime.emit` — no `authorizeNamespace`/`canonicalizeAndEmit` on the POST /events
path (that pair is only on `POST /ingest`). Until this is closed — by a live read-only probe
(e.g. POST /events with a malformed namespace: 403 vs 400 vs 200) or a container source export —
the sovereignty claim for the HTTP ingest boundary is **BLOCKED** on "which bytes are deployed,"
even though the `UnifiedEventRuntime → ping_events` spine itself is **PROVEN**.
Secondary open item: `emit`'s identity hash uses `JSON.stringify` (key-order-sensitive) rather than
canonical bytes — confirm no producer depends on key order, or move identity onto the canonical envelope hash.
