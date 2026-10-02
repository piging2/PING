# L1 — EVENT AUTHORITY FORENSICS (refresh, 2026-09-30)

Investigator: L1 read-only subagent. Date: 2026-09-30.
Starting point: `~/workspace/constitutional-sprint/event/EVENT-FORENSICS.md` (2026-09-23 verdicts).
Scope: `/home/nolan/ping` (canonical core), `/home/nolan/ping-gateway-src`, `/home/nolan/ping-gateway-build`,
`/home/nolan/projects/constitutional-runtime` (dormant Python sibling), Oracle `ping-gateway` container (read-only probe).
Nothing was written, built, installed, committed, or deleted. No secrets were read.
Transport: `~/workspace/bin/pigwsl-exec` for Pig WSL; direct `ssh -o BatchMode=yes ubuntu@129.146.60.17` for the Oracle read-only probe.

## 0. HEAD moved since 2026-09-23 — read this first

- 2026-09-23: `/home/nolan/ping` on branch `refactor/runtime-authority-convergence`, HEAD `cc6856c`.
- 2026-09-30: checked out branch `lane-b/tenant-dispatch-threading`, HEAD `546b62d76`
  ("wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)").
  `git rev-parse cc6856c` → `cc6856c3bc78e0535e66f168c66dc31abee2c073`; `git branch -a --contains cc6856c`
  includes the current branch, so HEAD is a **descendant** of cc6856c, not a rewrite.
  `refactor/runtime-authority-convergence` no longer appears in `git branch` (consumed/superseded).
- Event-file drift `cc6856c..HEAD` (`git diff --stat`, PROVEN): 8 files, +812/-90 —
  `ping-runtime/events/unified_event_runtime.js` (+206), `gateway/routes/events.js` (+215),
  `ping-runtime/canonicalization/canonicalization_service.js` (+68),
  new `ping-runtime/canonicalization/namespace_binding.js` (71),
  new `ping-runtime/events/test_runtime_tenant.js` (162),
  new `ping-runtime/events/uer-spine-identity.test.js` (104),
  `gateway/canonical_event_envelope.js` (+60), `gateway/bootstrap/gateway_runtime.js` (+16).
  `runtime/kernel/event_repository.js`, `runtime/kernel/event_read_authority.js`, `ping-runtime/events/event_bridge.js`
  show **no diff** in this range.

---

## 1. THE 8 WHO ANSWERS (current worktree, with file:line proof)

**WHO CREATES AN EVENT?**
Any producer that calls `UnifiedEventRuntime.emit()`. Production producers, PROVEN by call-site grep:
- `gateway/routes/events.js` POST `/` — BFF-envelope branch (social/knowledge ingest adapters normalize) and
  direct branch both call `eventRuntime.emit(...)` (worktree version; deployed version identical modulo tenant gates).
- `ping-runtime/canonicalization/canonicalization_service.js:149` `canonicalizeAndEmit` (serves POST `/ingest`;
  plus duck-typed passthrough `emit` at `:216` for producers expecting `runtime.emit`).
- `ping-runtime/events/event_bridge.js:179` (repository_events) and `:278` (canonical_events), with
  `_skipGovernance: true`.
- Business producers (`ping-runtime/business/review_authority.js:78` etc.) create via
  `gateway/canonical_event_envelope.js:149` `executeEmitEvent` → `canonical_events` table (bridged later),
  not directly via `emit`.
- In-process: verdict-class workers (replay/witness/lineage/jev-shadow) call `emit` through
  `BaseWorker._emit`, which stamps `this._name` as source.
Grade: **PROVEN**.

**WHO ASSIGNS IDENTITY?**
`IdentityAuthority.generateSpineEventId()`, defined `runtime/kernel/authorities/identity_authority.js:294`
(body lines 294-302), called at exactly one production site:
`ping-runtime/events/unified_event_runtime.js:200`.
`ping-runtime/authorities/identity_authority.js` is a PATCH_004 **shim** (file header, lines 22-32)
re-exporting the kernel singleton — proven delegation, not filename inference.
Scheme (unchanged, byte-identical to pre-change inline minting per golden vectors in
`ping-runtime/events/uer-spine-identity.test.js:15-39`): `sha256(JSON.stringify({eventType, source,
[namespace], [tenant_id], [logical_id|payload]}))`. `tenant_id` joins the identity material only when
explicitly provided (worktree Lane L), so legacy callers keep byte-identical IDs.
Residual 2026-09-23 caveat (key-order-sensitive `JSON.stringify`) is now **structurally closed**:
there is exactly one minting function, so key order is fixed by that one code path. There are no other
production callers of `generateSpineEventId` (`grep -rn` found only the runtime call, the test, and the
kernel definition — PROVEN).
Grade: **PROVEN**. This is the single biggest authority hardening since 2026-09-23 (AUTH-CONV-06):
the runtime no longer mints event IDs inline.

**WHO HASHES IT?**
SHA-256 in the identity mint above; canonical-bytes hashing via `CanonicalBytes`
(`ping-runtime/authorities/canonical_authority.js:46` `serializeString`, shim delegating to
`KernelCanonicalBytes` at line 43; the kernel delegation pattern mirrors the identity shim).
The duplicate-delivery collision check now uses `CanonicalBytes.serializeString` on both payloads
(`unified_event_runtime.js:306` in current numbering — verified in the `cc6856c..HEAD` diff hunk at
"Compare deep-canonical bytes for semantic equivalence (AUTH-CONV-06)"), replacing the old ad-hoc
`JSON.stringify(o, Object.keys(o).sort())` inline canon. The hash chain for the secondary journal
(`PreviousEventHash`/`CanonicalEventHash` in `repository_events`) still exists in
`runtime/kernel/event_repository.js:117` region — live secondary only.
Grade: **PROVEN**.

**WHO SEQUENCES IT?**
`ping_events` has **no sequence column** — ordering is `ORDER BY timestamp DESC` / causal traversal
via `metadata->>'causation_id'` (unchanged since 2026-09-23). The only true sequence is per-`object_id`
in `repository_events` (`runtime/kernel/event_repository.js`, hash-chained). A `tenant_id` partition
column was added (`unified_event_runtime.js:139`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) and all
traversal queries (`getChildren`/`getDescendants`/`getAncestors`/`getCorrelationGroup`) accept an
optional tenant filter.
Grade: **PROVEN** (unchanged; timestamp ordering remains the weak sequencing, flag stands).

**WHO PERSISTS IT?**
`UnifiedEventRuntime.emit` → `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload,
metadata, namespace, tenant_id) VALUES ($1..$8) ON CONFLICT (event_id) DO NOTHING`
(`unified_event_runtime.js:289`). `grep` for `INSERT INTO ping_events` across
`ping-runtime gateway runtime` (excluding tests) returns **only** this site — PROVEN single writer.
`repository_events` ← `runtime/kernel/event_repository.js:117` + `gateway/append_orchestrator.js:91`;
`canonical_events` ← `gateway/canonical_event_envelope.js:201`. Both converge into `ping_events` via
EventBridge (5s poll, batch 50, started at `gateway/bootstrap/gateway_runtime.js:470`).
Grade: **PROVEN**.

**WHO READS IT?**
`EventReadAuthority` (`runtime/kernel/event_read_authority.js:19`, CQRS read-side interface, unchanged)
with direct `pool.query('SELECT * FROM ping_events …')` fallback in `gateway/routes/events.js` — the
fallback is still the de-facto path when the authority returns empty (now tenant-scoped:
`WHERE tenant_id = $3`, 400 `tenant_required` without `?tenant=`). New: `GET /events/stats` no longer
consults the authority's global `getEventStats()` when a pool exists — the tenant-scoped SQL is
authoritative and fail-closed without a pool (comment in the diff: the authority's stats are global/unscoped).
`GET /unprocessed`, causal traversal endpoints, `/processed`, `/failed` all tenant-gated.
Grade: **PROVEN** (partial sovereignty unchanged; fallback remains the real read path in several handlers).

**WHO REPLAYS IT?**
- Idempotent re-emit: EventBridge dedupes by `event_id`; duplicate delivery suppresses handlers/integrations
  (unchanged mechanism; bridged rows re-enter via `emit` with `_skipGovernance: true`,
  `event_bridge.js:184,283`).
- NEW: verdict-class admission authority `_assertVerdictAuthority`
  (`unified_event_runtime.js:160`, enforced at `:226` **before** the `_skipGovernance` branch).
  `VERDICT_PRODUCERS` (`:57`) binds five event types to canonical producer worker sources
  (REPLAY_COMPLETED→'replay', WITNESS_CREATED/REJECTED→'witness', LINEAGE_CREATED→'lineage',
  JEV_DECISION_EVALUATED→'jev-shadow'); structural provenance checks (`verdictProvenanceOk`)
  reject hand-built forgeries before persistence. No API/bridge/replay/internal caller can bypass it.
- Consumers: `gateway/bootstrap/gateway_runtime.js:614` (knowledge-graph projection subscriber),
  `ping-runtime/embeddings/embedding_service.js:132` (Qdrant projection),
  `ping-runtime/orchestration/event_to_mission_bridge.js:95` (mission creation),
  `gateway/continuous_replay_authority.js` (appends new events to `repository_events`,
  e.g. lines 588,616,647,675,700,729,758), `IntegrationManager` (posthog/email/sms, registered
  `gateway_runtime.js:221-223`).
- Still no full-journal replay-from-scratch consumer on the live path (unchanged).
Grade: **PROVEN** (partial — convergence, not reconstruction).

**WHO MAY WRITE IT?**
The single admission choke point is `UnifiedEventRuntime.emit` (file header comment: "There is exactly
one admission choke point (UnifiedEventRuntime.emit) and this is it"). Admission stack in `emit`
(current numbering): (1) `tenant_id` validation fail-closed (`unified_event_runtime.js:197-200`);
(2) identity mint via IdentityAuthority (`:200`); (2b) event-type validation via `EventValidator`;
(2c) verdict-class admission (`:226`, unskippable); (3) `EventGovernance.validateEvent` (skippable for
bridges via `_skipGovernance`); (4) canonical envelope build; (5) durable `INSERT ... ON CONFLICT DO NOTHING`
(`:289`) with semantic-collision fail-closed (`:306`); (6) first-delivery-only dispatch to `.on()` handlers;
(7) `IntegrationManager` routing. POST `/events` (worktree) additionally requires `tenant_id` in the body
(400 `tenant_required`, 400 `tenant_mismatch` on namespace/payload contradiction). POST `/ingest` additionally
requires `CanonicalizationService.authorizeNamespace`, now backed by the namespace binder
(`canonicalization_service.js:108-123`, binder at `ping-runtime/canonicalization/namespace_binding.js:26,42`)
where caller-supplied namespace overrides are UNTRUSTED and honored only when the source is bound to them
(P1 tenant-spoof fix — worktree only, **not deployed**).
Grade: **PROVEN**.

---

## 2. CLASSIFICATION TABLE (every apparent event implementation)

| Symbol | Location | Classification | Evidence |
|---|---|---|---|
| `UnifiedEventRuntime` | `ping-runtime/events/unified_event_runtime.js` | **CANONICAL_AUTHORITY** | Constructed once in the composition root (`gateway/bootstrap/gateway_runtime.js:434`), single production `INSERT INTO ping_events` (`:289`), single admission choke point. PROVEN sovereign, unchanged. |
| `ping_events` table | Postgres, created by `unified_event_runtime.js` `initialize()` | **CANONICAL_AUTHORITY** (store) | `ON CONFLICT (event_id) DO NOTHING` + `trg_ping_events_append_only` (2026-09-16/17 capture, unchanged). Now with `tenant_id` partition column (`unified_event_runtime.js:139`). PROVEN. |
| `IdentityAuthority` | `runtime/kernel/authorities/identity_authority.js` (+ `ping-runtime/authorities/` PATCH_004 shim) | **CANONICAL_AUTHORITY** (identity) | `generateSpineEventId` at `:294`, sole production caller `unified_event_runtime.js:200`; golden-vector test locks byte identity (`uer-spine-identity.test.js:15-39`). Upgraded from "confirmed to exist" (2026-09-23) to PROVEN live on the spine identity path (AUTH-CONV-06). |
| `CanonicalBytes`/`CanonicalAuthority` | `ping-runtime/authorities/canonical_authority.js:42-46` (shim → kernel) | **CANONICAL_AUTHORITY** (hashing/serialization) | Owns the single canonical serializer; called in the collision check (diff hunk, formerly ad-hoc inline canon). PROVEN newly live on the spine. |
| `CanonicalizationService` | `ping-runtime/canonicalization/canonicalization_service.js` | **CANONICAL_AUTHORITY** (boundary) | Serves POST `/ingest` (`gateway_runtime.js:707`); constructed once at `:448`; namespace binder now owns the allow/deny decision (`namespace_binding.js:42`, called at `canonicalization_service.js:112`). PROVEN, strengthened. |
| `IEventAuthority` | `runtime/kernel/events/event-authority-interface.ts:8` | **INTERFACE** (abandoned contract) | Definition exists; zero importers in `ping-runtime gateway runtime` (only the definition file itself matches); zero `implements`/`new` outside comments. A worktree certification (`worktrees/replay-input-wiring/CERTIFICATION.md:51`) independently classifies it DORMANT. NOT PROVEN live — unchanged. |
| `EventReadAuthority` | `runtime/kernel/event_read_authority.js:19` (+ gateway shim per PATCH_003) | **INTERFACE** (live-partial contract) | Wired in `createEventRoutes` (`gateway_runtime.js:698`), but direct `pool.query` fallback remains the de-facto path; `/stats` now bypasses it deliberately (global vs tenant-scoped). PROVEN wired, partial sovereignty — unchanged. |
| `EventWriteAuthority` | nowhere (comments only) | **UNKNOWN** (referenced-in-comment only) | Mentioned in `event_read_authority.js:11` ("Write operations are handled by EventWriteAuthority") and `gateway/routes/events.js:5`; no class exists in `ping-runtime gateway runtime`. NOT PROVEN to exist. |
| `EventRepository` (JS kernel) | `runtime/kernel/event_repository.js` | **DERIVED** (live secondary journal) | Backs `repository_events` (`:117`); writers: `agent_memory_authority.js:617,646,675,703,731`, `distributed_desktop_agents.js:579,607,635,663,691`, `automatic_mission_generator.js:595,624,653`, `continuous_replay_authority.js:588,616,647,675,700,729,758`, `append_orchestrator.js:91`. Converges into `ping_events` via EventBridge. PROVEN live-secondary — unchanged. |
| `EventRepository` (Python ABC) + `PostgresEventRepository` | `constitutional-runtime/storage/repositories.py:17/:63` | **DORMANT** | `api/main.py` still has zero references (re-verified: the 2026-09-23 refutation stands). Nothing constructs it on any live path. NOT PROVEN live. |
| `EventStore` (Python) | `constitutional-runtime/storage/event_store.py` | **DORMANT** | No live caller; live gateway is the JS stack. NOT PROVEN live — unchanged. |
| `EventBridge` | `ping-runtime/events/event_bridge.js` | **ADAPTER** | Polls `repository_events` + `canonical_events`, re-emits through `UnifiedEventRuntime.emit` with `_skipGovernance: true` (`:184,:283`). Started once in the composition root (`gateway_runtime.js:470`). PROVEN; delegates all authority to `emit`. |
| `canonical_event_envelope.js` / `canonical_events` | `gateway/canonical_event_envelope.js:149,201` | **ADAPTER** (business-event intake) | Business authorities (`review_authority.js:78` etc.) → `executeEmitEvent` → `canonical_events` → bridged to `ping_events`. Owns business-entity emission, not the event primitive. PROVEN live-secondary — unchanged. |
| BFF ingest adapters | `gateway/social_ingest_adapter.js`, `gateway/knowledge_ingest_adapter` | **ADAPTER** | Normalize website-BFF envelopes → `eventRuntime.emit` (deployed `events.js` POST `/` branch). PROVEN live (deployed bytes). |
| `ConstitutionalEventStore` | — | **GHOST** | Zero hits repo-wide (excluding `node_modules`), all branches/worktrees (`grep` over `.` incl. `.md`). NOT PROVEN to exist — unchanged since 2026-09-23. |
| `AcquisitionManager` | — | **GHOST** | Zero hits in `ping-runtime gateway runtime authorities kernel` (code); only prose mentions in forensics text files. The only `collectEvidence` in code is the unrelated `Dispatcher.collectEvidence` (`ping-runtime/orchestration/dispatcher.js:157`). NOT PROVEN to exist — unchanged. |
| `*EventAuthority` classes (JS) | — | **NONE EXIST** | `grep -rln 'EventAuthority' --include='*.js'` over the code dirs returns zero class definitions. PROVEN absent — unchanged. |
| NATS outbox | dormant Python only | **DORMANT** | Exists only in `constitutional-runtime` Python code; no NATS in the JS gateway event path. PROVEN not-live — unchanged. |
| FYD repo (`pijing2/fyd`, fka `/home/nolan/projects/ping-constitutional`) | HTTP client | **ADAPTER** | 2026-09-23 verdict (pure HTTP client of the gateway event API) stands on the evidence gathered then. **NEEDS-REVERIFY**: the working copy is no longer at `/home/nolan/projects/ping-constitutional` (path absent; `/home/nolan/projects/` lists no `ping-constitutional`); only lane artifacts (`/home/nolan/workspace/fyd-lane/h2-build/transition-id.ts`) were found on the Pig. |

---

## 3. RESOLVED: which POST /events bytes run in the Oracle ping-gateway container

**Resolved PROVEN (read-only container probe, 2026-09-30 ~11:20 MDT):**

- Oracle `ping-gateway` container: image `ping-gateway:candidate-3c5d280dd`, `Up 6 days (healthy)`,
  alongside `ping-postgres` (9 days) and `ping-qdrant` (13 days).
- `docker exec ping-gateway sha256sum gateway/routes/events.js` → `4e3c66b6...`;
  `git show cc6856c:gateway/routes/events.js | sha256sum` → **identical** `4e3c66b6...`.
  Same byte-identity for `ping-runtime/events/unified_event_runtime.js` (`99dc95fe...`) and
  `ping-runtime/canonicalization/canonicalization_service.js` (`d8be9cd8...`).
- **The deployed container runs the exact cc6856c-era event path** (pulled and read in full,
  `/tmp/evrev/deployed-events.js`, 186 lines):
  - POST `/events` (deployed file lines 72-130): BFF-envelope branch → `social_ingest_adapter` /
    `knowledge_ingest_adapter` → `eventRuntime.emit(...)`; direct branch →
    `eventRuntime.emit(event_type, 'api', event_data, ...)` with the comment
    "Canonical spine: emit directly through UnifiedEventRuntime (ping_events), not through the kernel
    pipeline (repository_events)". **No tenant validation, no `authorizeNamespace` on this path.**
  - POST `/ingest` (unchanged cc6856c boundary) → `CanonicalizationService.canonicalizeAndEmit`
    with the pre-fix namespace rule (explicit request > per-source map > default) — the P1
    tenant-spoof binder fix is worktree-only, not deployed.
- Corollaries:
  - The 2026-09-16/17 live capture's "POST /events → authorizeNamespace + canonicalizeAndEmit
    (403 on malformed namespace)" matches **no deployed or Pig-side bytes** — that pair exists only
    on POST `/ingest` in every version. The capture likely described `/ingest`, or an ephemeral
    live-patch. The sovereignty claim for the HTTP ingest boundary is no longer blocked on
    "which bytes are deployed" (answered: cc6856c), but the capture's exact /events description is
    **NOT PROVEN** against any surviving source.
  - `/home/nolan/ping-gateway-src` and `/home/nolan/ping-gateway-build` are still byte-identical to
    each other (`ad9b9c92...`, tenant-registry-validation variant) — and now match **neither** the
    worktree (`007fcf44...`, Lane L) **nor** the deployed container (`4e3c66b6...`, cc6856c). Three-way
    divergence, all three identified.

---

## 4. WHAT CHANGED SINCE 2026-09-23 (all in the worktree; none deployed to Oracle)

1. **Lane L tenant isolation** — `tenant_id` is the immutable partition key for `ping_events`
   (added in `initialize()`, `unified_event_runtime.js:139`, backfilled `'UNKNOWN'`); `emit` validates it
   fail-closed (`:197-200`); all read/traversal routes require `?tenant=` (400 `tenant_required`,
   `events.js` diff) and writes require `tenant_id` in the body (400 `tenant_mismatch` on contradiction).
   New tests: `test_runtime_tenant.js`. **NOT DEPLOYED** (container has no `tenant_id` code).
2. **AUTH-CONV-06 identity/hashing ownership** — inline ID minting removed from `emit`; identity now minted
   by `IdentityAuthority.generateSpineEventId` (`unified_event_runtime.js:200` ←
   `runtime/kernel/authorities/identity_authority.js:294`); collision check uses the single canonical
   serializer (`CanonicalBytes.serializeString`). Golden-vector test `uer-spine-identity.test.js`
   locks byte identity. **NOT DEPLOYED** (container mints inline, cc6856c scheme — same bytes, different owner).
3. **Verdict-class admission authority** — `_assertVerdictAuthority` (`unified_event_runtime.js:160,226`),
   unskippable even for bridges (`_skipGovernance` no longer bypasses it). **NOT DEPLOYED**.
4. **P1 tenant-spoof fix** — `CanonicalizationService` namespace resolution now delegates allow/deny to
   `createNamespaceBinder` (`namespace_binding.js:26,42`); unbound caller overrides are ignored in favor of
   trusted routing; `authorizeNamespace` returns `authorized:false` instead of honoring them.
   **NOT DEPLOYED**.
5. `EventReadAuthority` semantics tightened: `/stats` deliberately bypasses the authority's global stats
   in favor of tenant-scoped SQL (fail-closed without a pool). Classification unchanged: live-partial.

## 5. NEEDS-REVERIFY (kept honest)

1. FYD adapter current state — the working copy is gone from `/home/nolan/projects/ping-constitutional`;
   the 2026-09-23 "pure HTTP client" verdict rests on that date's evidence. Re-check against the live
   `pijing2/fyd` remote or the new local path when known.
2. Whether any deployed writer outside the container (e.g. BFF/website processes) writes to `ping_events`
   directly, bypassing the gateway. Pig-side production code has exactly one INSERT site (PROVEN);
   Oracle-side beyond the container was not probed.
3. `trg_ping_events_append_only` trigger — assumed present from the 2026-09-16/17 capture; not re-verified
   against the live Oracle DB in this lane (read-only DB probe possible as follow-up).
4. `ping-gateway-src`/`ping-gateway-build` purpose going forward: they are now stale relative to both
   the worktree and the deployment; their role (staging for the next deploy?) is a process question,
   not answered by forensics.
5. `ConstitutionalEventStore` / `AcquisitionManager` absence is absence-of-evidence, not proof of
   never-existing: full-repo `grep` (excluding `.git`/`node_modules`) found zero hits; git history was
   not exhaustively mined for a deleted incarnation. Treat as ghosts in current source, not as
   never-having-existed.
