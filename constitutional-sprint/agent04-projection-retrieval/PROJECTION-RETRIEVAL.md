# PROJECTION + RETRIEVAL AUDIT — PING constitutional convergence sprint

**Agent:** AGENT 04 — PROJECTION + RETRIEVAL
**Date:** 2026-09-23 ~20:00–21:15 MDT
**Mode:** READ-ONLY investigation. COMMITS CREATED: NONE. No repo written, no process touched/restarted, no secret values printed (all findings are paths/types/line numbers).
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (sprint worktree); (b) CANONICAL CORE `/home/nolan/ping` @ `cc6856c` (live runtime home — propose-only, untouched).
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed scripts); passive read-only `curl` GETs to Qdrant `:6333`.
**Prior reads:** AUTHORITY-MAP.md, SECURITY-SWEEP.md, EVENT-FORENSICS.md, REACHABILITY.md (all Phase-1 night-shift deliverables).

**Constitutional law under test:** NO PROJECTION MAY SILENTLY BECOME CANONICAL.

---

## 1. Per-destination proof table (the 8 proofs)

Columns: CANONICAL SOURCE / WRITER / IDENTITY (record↔source link) / REBUILDABILITY / DELETION / DRIFT DETECTION / REPLAY / SILENT-CANONICAL?

### D1 — FYD dump-projection JSON (`/home/nolan/ping/var/fyd-projections/<siteId>.json`) — the file the public site renders from

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Two-part: (1) BASE = machine-extracted committed fixture TS (`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`, `coppersmith-graph.ts` in the served repo); (2) OVERLAYS = `FYD_SITE_OVERLAY` rows in `ping_events`, applied in `(timestamp, event_id)` order. Declared in `tools/fyd-site-projection/dump.py:1-60` (dirty working copy, v1.1.0). |
| WRITER | `dump.py` only. Atomic tmp+rename (`os.replace`, dump.py:426-431). **Invocation is MANUAL** — no cron, no scheduler references `fyd-projections` anywhere in gateway/ping-runtime/tools (verified by grep). `emit-overlay.py` is the companion overlay emitter (POSTs `FYD_SITE_OVERLAY` to the gateway). |
| IDENTITY | `meta.overlayEventIds[]` lists every journal event applied; `add_object`/`add_relationship` ops force provenance to `ping-event:<event_id>` (dump.py header). `meta.baseDigest` + `meta.fixtureFileDigest` pin the base. |
| REBUILDABILITY | **PROVEN by construction:** deterministic function of (fixture bytes + journal rows); re-running `dump.py <slug>` reproduces it. Live evidence: on-disk files carry `dumperVersion: fyd-projection-dump@1.1.0`, `dumpedAt: 2026-09-22T14:50:58Z` (happy-place) — i.e. the LIVE served projection was produced by the **uncommitted** dirty dump.py, not the HEAD version. |
| DELETION | `deactivate_object` op → `visibility: "private"` (drops out of public render); `clear_presentation_intent` removes an intent directive. No row deletion — visibility lifecycle only. |
| DRIFT DETECTION | **NONE for staleness.** Read seam detects TAMPER (sha256 `graphDigest` + `presentationIntentDigest` recomputed, fail-closed — `src/fyd/data/ping-object-source.ts:166-182, 228-241`) but nothing bounds FRESHNESS. The site renders a >24h-old projection with no warning. |
| REPLAY | N/A — full rebuild from source on every dump (stronger than replay). |
| SILENT-CANONICAL? | **FLAGGED — staleness + dual-truth.** The entire public surface (`app/page.tsx`, `app/sites/*/page.tsx`, `api/fyd/projection`, `api/fyd/objects/[objectId]`) treats this file as the site's truth. Ask FYD reasons over a DIFFERENT source (D2 journal-overlay + fixture) — Overlap-4 confirmed live: a journaled overlay is invisible to the public page until the next manual `dump.py` run. Freshness skew is structural, and no consumer is told the projection's age. |

### D2 — Ask-FYD journal-overlay tenant graph (`getFydTenantGraph`, in-memory per call)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Repo fixture base graph + live `FYD_SITE_OVERLAY` journal rows via `PingObjectReader.queryFydSiteOverlays` (`src/fyd/data/fyd-tenant-graph.ts:161`). |
| WRITER | Nobody persists it — **rebuilt from the journal on every call, deliberately no cache** (fyd-tenant-graph.ts:1-30 header: "This module NEVER reads dump.py projection JSON"). |
| IDENTITY | Overlay provenance `ping-event:<event_id>`; both layers digest-verified (fixture base + journal ops). |
| REBUILDABILITY | Trivially — it IS a rebuild, every call. |
| DELETION | `deactivate_object` → `visibility = "private"` (fyd-tenant-graph.ts:311-315). Same semantics as D1. |
| DRIFT DETECTION | N/A (no persisted state to drift). |
| REPLAY | N/A (live journal fold). |
| SILENT-CANONICAL? | No — the strongest-behaved projection in the system. **Caveat:** tonight the journal path is DARK (`FydTenantGraphError("reader_failed")` — gateway default `127.0.0.1:18199` has nothing listening; REACHABILITY G1/G2). Consumers fail closed, honestly. |

### D3 — Owner overlay (`data/fyd-owner/<objectId>.json` + `projectOwnerState` fold)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | The owner event log file itself is the canonical record of owner corrections (append-only, content-hash event IDs `fyd-owner@1`, `src/fyd/object/owner-events.ts`). `projectOwnerState` is a pure fold = the projection. |
| WRITER | `appendOwnerEvent` (owner-events.ts); commands via `applyOwnerCommand` (owner-store.ts:150), demo-owner-mode gated. |
| IDENTITY | Content-hash event IDs; corrections attach evidence per object; v1 files migrated transparently on read. |
| REBUILDABILITY | **PROVEN by test** — owner-events.test.ts asserts fold-twice byte-identical and replay digest == live digest (REACHABILITY A1). |
| DELETION | None — append-only; corrections override by folding (hide/restore are commands, not deletes). |
| DRIFT DETECTION | N/A (fold recomputed per read; the log IS the source). |
| REPLAY | Local replay proven (see above). Not the gateway journal's replay. |
| SILENT-CANONICAL? | No. Correctly layered: composed AFTER D1 verification, never part of source verification (`ping-object-source.ts` comment: "owner state composes onto verified source state, it is never part of source verification"). |

### D4 — Qdrant `knowledge` collection (768-d Cosine; 389 points live on ping-qdrant :6333)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | `ping_events` rows whose `event_type` ∈ `INDEXABLE_TYPES` (19 types incl. `OBSERVATION_CREATED`, `RECOMMENDATION_CREATED`, `PROJECTION_CREATED` — `ping-runtime/embeddings/embedding_service.js:27-45`). |
| WRITER | **TWO live writers to the same point-id namespace** (VIOLATION — see §2 V1): (A) `EmbeddingService.subscribe(unifiedEventRuntime)` (`embedding_service.js:123-160`, wired `gateway/bootstrap/gateway_runtime.js:494-502`); (B) `ProjectionWorker.handle` → direct `projectToQdrant` (`ping-runtime/workers/canonical_workers.js:186-208`, registered `:709`, wired `:509-518`). |
| IDENTITY | Point payload carries `source_event_id` + `event_type` + `namespace` + `canonical_hash` (verified live via scroll: 4/4 sampled points carry all four). Point id = `toQdrantId(event_id)` — hex-only mangling of the journal event id (embedding_service.js:47-51). |
| REBUILDABILITY | **CLAIMED ONLY.** Zero rebuild/resync functions in ping-runtime/gateway (grep for rebuild/resync/replayFromJournal: empty). |
| DELETION | **NONE.** No delete path in EmbeddingService or qdrant_adapter. Journal is append-only so source rows never delete — but superseding correction events create NEW points while stale points strand (no tombstone, no supersede link). |
| DRIFT DETECTION | NONE. (`projected_at` is hardcoded `null` in every point — embedding_service.js:224.) |
| REPLAY | **REPLAY DOES NOT REBUILD.** `emit()` suppresses in-process `.on()` handlers on duplicate delivery ("Replay idempotency", unified_event_runtime.js:158-164) → Writer A never refires on re-emit. A lost point is never restored by replay. |
| SILENT-CANONICAL? | **FLAGGED — projection-of-projection is live.** A `PROJECTION_CREATED` point exists in the collection (sampled live): ProjectionWorker journals its own derived output into `ping_events`, Writer A embeds that derived row. Derived events are first-class journal rows, distinguishable from source events only by the `event_type` string. Mixed vector provenance (`embedding: 'fallback'` seeded vectors vs `'ollama'`) coexists under one model name; `search()` does not filter them apart. |

### D5 — Knowledge graph (`knowledge_nodes` / `knowledge_edges` in Postgres)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | **Optional.** `addNode` accepts `options.sourceEventId` but defaults to NULL (`ping-runtime/knowledge/knowledge_graph.js:87-113`). The LIVE writer — `POST /knowledge/nodes` (`gateway/routes/knowledge.js:64-72`, mounted at `gateway/bootstrap/gateway_runtime.js:798` with **no auth middleware observed** at mount or in the route) — does not pass any sourceEventId at all. Nodes can exist with zero link to any canonical event. |
| WRITER | `KnowledgeGraph.addNode` / `addEdge`; live entry via the `/knowledge` HTTP routes; also `gateway_runtime.js:603` (event → candidate node, status='candidate', confidence 0.5, source event threaded there). |
| IDENTITY | `node_id = sha256(nodeType:label:JSON.stringify(data))[:16]` — content-derived but **key-order-sensitive** (`JSON.stringify`, same F8 class as the journal identity hash). `source_event_id` column exists but is nullable and unwritten on the HTTP path. |
| REBUILDABILITY | CLAIMED ONLY — no rebuild-from-journal function exists. |
| DELETION | **No node deletion method exists.** Only lifecycle transitions via `updateNodeBySourceEvent` (status/confidence; "never a data mutation" per docstring — though `ON CONFLICT (node_id) DO UPDATE SET data=...` DOES overwrite `data` on re-add, contradicting the ADD-only claim). Edges cascade only if a node is deleted via raw SQL (no code path). |
| DRIFT DETECTION | NONE. |
| REPLAY | N/A (no journal linkage on the write path). |
| SILENT-CANONICAL? | **VIOLATION — the graph certifies itself.** `hybrid_search.js:98` marks knowledge-graph hits `verified: true` with the comment "stored node — already passed the graph write path" — but the write path requires no source event, no provenance, and (on the HTTP route) no observed auth. A consumer of `/knowledge/search` receives graph-derived nodes labeled verified-truth with no path back to the journal. **This is the clearest silent-canonical breach in the system.** |

### D6 — Materialized views (`mv_mission_summary`, `mv_execution_summary`, `mv_current_queue`, `mv_mission_by_repository`, `mv_recent_activity`)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | `missions`, `mission_executions`, `mission_queue` tables (`gateway/materialized_views.js:35-99`). |
| WRITER | `MaterializedViews.refreshAll()` on a 30s `setInterval` (`materialized_views.js:103-122`); `REFRESH ... CONCURRENTLY`. |
| IDENTITY | Aggregate rows — **no per-record identity** (GROUP BY summaries). A view row cannot be traced to a source row. |
| REBUILDABILITY | PROVEN by construction — full recompute from source tables on every refresh. |
| DELETION | N/A — aggregates recompute; deleted source rows vanish from the next refresh. |
| DRIFT DETECTION | The 30s timer IS the freshness bound (bounded staleness, honest). No explicit drift check beyond it. |
| REPLAY | N/A — recomputed from current table state, not from the journal. (Note: if the source tables are themselves projections of the journal, the views inherit that; the tables are operational state.) |
| SILENT-CANONICAL? | No — aggregates are honestly derived and self-describing. **Minor:** `refreshView(viewName)` interpolates `viewName` into SQL (`materialized_views.js:129`) — injection if ever exposed to user input (callers not traced; recorded as hygiene note, not a finding). |

### D7 — `repository_events` (kernel EventRepository; hash-chained per-object journal)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Agent/memory/mission emitters (`agent_memory_authority.js`, `distributed_desktop_agents.js`, `automatic_mission_generator.js`, `continuous_replay_authority.js`, `append_orchestrator.js` — EVENT-FORENSICS §2B#6). Secondary journal, not a projection of ping_events — but `ping_events` IS a projection of it via EventBridge re-emit. |
| WRITER | Kernel `EventRepository.appendEvent` (`runtime/kernel/event_repository.js:102`); `markProcessed`/`markFailed` upserts only touch processing columns. |
| IDENTITY | `event_id` + per-`object_id` `sequence` + hash chain (`PreviousEventHash`, `CanonicalEventHash`, `WitnessHash`, `ReplayHash`). |
| REBUILDABILITY | Per-object replay via `getEvents(objectId)` — consumed by `mission_authority_v2.js:394`, `patch_authority_v2.js:515`, `automatic_mission_generator.js:517`. |
| DELETION | **NONE** — no delete/update of event rows in the repository (verified: only append + mark columns). Append-only preserved. |
| DRIFT DETECTION | Hash chain per object (tamper-evident within an object's stream). |
| REPLAY | `gateway/replay/kernel/deterministic_replay_engine.js` consumes `replay_event_stream.js` over these rows (replay investigator owns the verdict on liveness). |
| SILENT-CANONICAL? | No — it is a journal, honestly secondary. |

### D8 — `canonical_events` (business-event table → bridged into ping_events)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | `ping-runtime/business/*_authority.js` via `canonicalEventEnvelope.executeEmitEvent` (EVENT-FORENSICS §2B#7). |
| WRITER | `gateway/canonical_event_envelope.js`; routes `gateway/routes/canonical_events.js`. |
| IDENTITY | Envelope id carried as `metadata.canonical_object_id` in ping_events (not the journal PK — identity translation at the bridge). |
| REBUILDABILITY | Via EventBridge re-emit (convergence, not reconstruction). |
| DELETION | Append-only by design (bridge re-emits; no delete path found). |
| DRIFT DETECTION | NONE between the table and its ping_events echo (EventBridge 5s poll, dedupe by event_id — duplicates converge, gaps do not alarm). |
| REPLAY | EventBridge dedupe only. |
| SILENT-CANONICAL? | Borderline — the ping_events echo is a projection of a secondary journal presented in the sovereign journal. Distinguishable via `source`/`metadata`; no evidence consumers confuse them. Recorded, not flagged. |

### D9 — Adapter HPP event log (`src/lib/events.ts` InMemoryEventRepository)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Marketing routes: `api/kit/webhook`, `api/newsletter/subscribe`, `api/resources/download` (SECURITY-SWEEP F1/F2: unauthenticated ingest). |
| WRITER | `logEvent` → `repository.append`. |
| IDENTITY | `randomUUID` v4 per event; provenance tuple (provider, eventType, providerObjectId) for idempotency. |
| REBUILDABILITY | **IMPOSSIBLE — process memory, lost on restart** (file says "NOT SUITABLE FOR PRODUCTION"). |
| DELETION | Whole log vanishes on restart. |
| DRIFT DETECTION | N/A. |
| REPLAY | `ReplayRepository.findAfter` has **zero consumers** (AUTHORITY-MAP #35 LEGACY). |
| SILENT-CANONICAL? | No — too ephemeral to be mistaken for canonical; but it is a **write-only sink with a fake replay interface**, and it ingests unauthenticated PII (F1/F2). Not a projection; recorded for completeness. |

### D10 — Media/asset derived lane (adapter: `media-kv-store.ts`, `dataset-snapshots.ts`, `materialization-recovery.ts`, `assignment-store.ts`)

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Vercel Blob bytes + Google Drive provenance (marketing assets, not constitutional state). |
| WRITER | Media pipeline (`blob-storage.ts`, `media-kv-store.ts` on Upstash Redis). |
| IDENTITY | **Content-addressed: sha256 content hashes**; synthetic-hash detection (`computeSyntheticHash` — hash-of-id rejected as fake provenance). |
| REBUILDABILITY | Re-derivable from Blob bytes + content hash. |
| DELETION | Lifecycle states in KV; assignments can go stale. |
| DRIFT DETECTION | **POSITIVE EXAMPLE:** `materialization-recovery.ts` explicitly detects orphaned Blobs, incomplete KV records, stale assignments, and cross-state KV-Blob-Drive inconsistency — the only drift-detection/repair loop found in any projection lane. (Orphan-Blob listing itself is stubbed — `detectOrphanedBlobs` returns `[]` with a "would require Blob listing" comment.) |
| REPLAY | N/A. |
| SILENT-CANONICAL? | No — content hashes keep every derivative traceable to bytes. |

### D11 — Qdrant `constitutional_documents` / `constitutional_memory` + `memory_*` (1536-d) collections

| Proof | Finding |
|---|---|
| CANONICAL SOURCE | Mixed/harness. `qdrant_bootstrap.js:94-99` ensures `constitutional_documents` + `test_vectors`. `memory_vector_store_authority.js:35-53` creates 12 `memory_*` collections (1536-d) written by `memory_authority.js` (`storeEmbedding` per fact/goal/project/...). Referencers of `constitutional_*`: `constitutional_runtime.js`, `nversion_determinism.js`, `persistent_ollama_analyst.js`, `deployment_generator.js`, `constitutional_validation_harness.js`, `end_to_end_verifier.js`, `stage_registry.js` — predominantly **harness/verification scripts**, not the live gateway path. |
| WRITER | Harness scripts + MemoryAuthority (for `memory_*`). |
| IDENTITY | Varies; `memory_*` payloads carry `{text}` with fact/goal ids — no journal event linkage observed. |
| REBUILDABILITY | Unproven. |
| DELETION | No delete path observed. |
| DRIFT DETECTION | NONE. |
| REPLAY | N/A. |
| SILENT-CANONICAL? | **Unverifiable liveness** — cannot confirm these collections are read by any live consumer vs. being harness residue. Flagged for the coordinator as dead-surface candidates, not as violations. |

### D12 — Adapter local JSON point-state (`data/fyd-claims/`, `data/fyd-likes/`, identity bindings)

Not projections — point state with honest fail-closed reads (AUTHORITY-MAP #5, #23). No further audit.

---

## 2. Silent-canonical violations (ranked)

**V1 — Knowledge graph self-certifies: `verified: true` on sourceless nodes [P0]**
`POST /knowledge/nodes` (`gateway/routes/knowledge.js:64-72`, mounted `gateway/bootstrap/gateway_runtime.js:798` with no auth middleware observed) writes nodes with caller-supplied `nodeType/label/data/entityType/entityId/namespace/status/confidence` and **no `sourceEventId`**. `hybrid_search.js:98` then serves those nodes to `/knowledge/search` consumers marked `verified: true` ("already passed the graph write path"). The write path proves nothing about journal truth. A projection with no source link is presented as verified knowledge. **This is the single clearest breach of the constitutional law.**
Related: `addNode`'s `ON CONFLICT DO UPDATE SET data=...` overwrites node data on re-add (`knowledge_graph.js:96`), contradicting the module's own "ADD-only provenance" docstring — silent mutation of a "verified" node.

**V2 — Two writers, one Qdrant point id [P0]**
Writer A (`EmbeddingService.subscribe`, `gateway_runtime.js:502`) and Writer B (`ProjectionWorker.handle` direct `projectToQdrant`, `canonical_workers.js:186-208`) both upsert `toQdrantId(event_id)` for `RECOMMENDATION_CREATED` (Writer B reached via `EVENT_MISSION_MAP` → `PROJECTION_CREATE` mission → `WorkerRuntime.dispatch`). Last-write-wins; vector may differ by backend (Ollama vs deterministic fallback) at different times. Violates one-writer-per-mutable-semantic-unit. **Proposal filed:** `patches/agent04-projection-retrieval/PROPOSAL-qdrant-single-writer.md` (propose-only; core file).

**V3 — Derived events are first-class journal rows; projection-of-projection is live [P1]**
`ProjectionWorker.handle` journals `PROJECTION_CREATED` (a description of its own projection act) into sovereign `ping_events` (`canonical_workers.js:182-185`); `EmbeddingService` then embeds that derived row into Qdrant (live `PROJECTION_CREATED` point sampled). `ReplayWorker` also handles `PROJECTION_CREATED` (`canonical_workers.js:711`). Consumers of the journal cannot distinguish source from derived except by `event_type` string. Retry amplifies it: the worker's `_emit` payload carries a wall-clock `timestamp`, so a `WorkerRuntime.dispatch` retry (P0-2 propagate-for-retry, `worker_runtime.js:88-94`) produces a **distinct content-hash event_id** — no dedup, duplicate derived rows accumulate.

**V4 — Public site truth vs Ask-FYD truth are structurally different projections [P1]**
D1 (dump JSON, manual rebuild, >24h stale tonight) vs D2 (live journal fold, dark tonight). Both claim "the current graph for site X" (AUTHORITY-MAP Overlap-4). No freshness bound, no staleness signal to consumers, no drift detection between them. The site renders D1 as truth while Ask FYD reasons over D2.

**V5 — Qdrant projection is write-once, never rebuilt, never drift-checked [P2]**
No rebuild function exists; `emit()` duplicate-suppression means replay never refires Writer A; `projected_at` is hardcoded `null`; no deletion/tombstone path — superseded points strand. 389 points, zero indexed vectors (under HNSW threshold — fine), mixed `fallback`/`ollama` provenance under one model name.

## 3. What is HEALTHY (anti-silent-canonical mechanisms that work)

- **D1 read seam:** digest-verified, fail-closed on tamper (`ping-object-source.ts:166-182, 228-241`), owner overlay composed after verification, never part of it. Served site's reader matches the 1.1.0 dumper (commit `ff449e30`) — no version skew tonight.
- **D2:** no-cache journal fold, digest-verified both layers, fails closed honestly when the journal is dark.
- **D3:** append-only owner log, proven local replay (test A1).
- **D6:** 30s bounded staleness, full recompute.
- **D7:** append-only + hash chain.
- **D10:** content-hash addressing + a real drift-detection/repair loop (`materialization-recovery.ts`) — the pattern other lanes should copy.
- **Hybrid search verification leg** (`hybrid_search.js:58-72`): Qdrant hits ARE traced back to `ping_events` rows via `EvidenceAuthority.verify()` with a `rejected` counter — the retrieval path does not blindly trust the projection. (Its KG leg is undermined by V1.)

## 4. Patch record

| Patch | Target | Status |
|---|---|---|
| PROPOSAL-qdrant-single-writer.md | `/home/nolan/ping/ping-runtime/workers/canonical_workers.js` (ProjectionWorker) | **PROPOSED ONLY** — live core, no agent applies. WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT complete. Filed under `~/workspace/constitutional-sprint/patches/agent04-projection-retrieval/`. No Agent-20 conflict known. |
| Worktree patches (sprint worktree (a)) | — | **NONE APPLIED.** No unambiguous minimal correction in my owned paths was found; the read seams verify correctly. Per WRITER-OWNERSHIP I applied nothing. |

**Write-gate accountability (F29):** the uncommitted `src/fyd/social/readers.ts` change (required `created_at`, `winsOver()` ordering change) is **NOT mine**. My session was fully read-only; the change predates my observation window's end and I neither authored, applied, nor reviewed it. Preserved as unreviewed WIP per coordinator instruction.

## 5. Drift observed during this investigation (for coordinator / Agent 20)

- **Sprint worktree (a) @ `a69bb68f`:** was CLEAN at the authority-map baseline; now has 3 uncommitted modifications: `src/fyd/claim/identity.ts`, `src/fyd/social/attestation-gate.ts`, `src/fyd/social/readers.ts` (observed ~20:15 MDT). None authored by agent04.
- **Core (b) @ `cc6856c`:** 4 uncommitted modifications: `gateway/package-lock.json`, `gateway/package.json`, `ping-runtime/orchestration/execution/capability_registry.json`, `tools/fyd-site-projection/dump.py` + untracked `deliverables/`. The dirty `dump.py` (v1.1.0, presentation-intent layer) is what produced the LIVE served projections (`dumperVersion` on disk) — the committed HEAD dumper (v1.0.0) is not what the site is rendering from.

## 6. Findings table (shared record format)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| projection | knowledge graph write path | Nodes can be written with no source-event link and are later served as verified knowledge | `gateway/routes/knowledge.js:64-72` (no sourceEventId passed); mount `gateway/bootstrap/gateway_runtime.js:798` (no auth observed); `hybrid_search.js:98` marks stored nodes `verified: true` | HTTP client | `KnowledgeGraph.addNode` (`ping-runtime/knowledge/knowledge_graph.js:87`) | `/knowledge/nodes` route | `/knowledge/search` via hybridSearch | none (self-certifying) | SILENT-CANONICAL VIOLATION | HIGH | projection→canonical | event-forensics (journal truth), agent14 (retrieval) | 14, 02 |
| projection | Qdrant `knowledge` writers | Two live writers upsert the same point id; last-write-wins is nondeterministic | `embedding_service.js:123-160` + `gateway_runtime.js:502` (writer A); `canonical_workers.js:186-208,709` + `gateway_runtime.js:509-518` (writer B); convergence via `event_to_mission_bridge.js:62,125` → `mission_scheduler.js:230-250` | journal emit / mission queue | `EmbeddingService.projectToQdrant` | A: EmbeddingService; B: ProjectionWorker | `EmbeddingService.search`, hybridSearch | contested (two writers) | WRITER-OWNERSHIP VIOLATION | HIGH | one-writer-per-unit | event (emit/dispatch), agent14 | 14 |
| projection | `PROJECTION_CREATED` journaling | Worker-derived projection descriptions are first-class sovereign journal rows; projection-of-projection embedded live | `canonical_workers.js:182-185` (_emit); live Qdrant point with `event_type: PROJECTION_CREATED` sampled 2026-09-23; `INDEXABLE_TYPES` includes `PROJECTION_CREATED` (`embedding_service.js:35`) | ProjectionWorker | `UnifiedEventRuntime.emit` | ProjectionWorker | EmbeddingService subscriber, ReplayWorker (`canonical_workers.js:711`) | journal (derived rows indistinguishable) | SILENT-CANONICAL VIOLATION | HIGH | projection→journal | event, replay (03) | 03, 14 |
| projection | worker retry idempotency | Retry of ProjectionWorker creates duplicate derived journal rows (no dedup) | `canonical_workers.js:176-178` (wall-clock timestamp in emitted payload); `unified_event_runtime.js:73-80` (content-hash id → distinct); `worker_runtime.js:88-94` (P0-2 retry propagation) | MissionScheduler retry | `emit` | ProjectionWorker | journal readers | none | DESIGN FLAW | MEDIUM | idempotency | event | 03 |
| projection | dump-projection freshness | Public site renders a manually-rebuilt projection with no freshness bound or staleness signal; Ask FYD uses a different source | `dump.py` (no cron/scheduler refs found); on-disk `dumpedAt: 2026-09-22T14:50:58Z`; `ping-object-source.ts` verifies digest but not age; `fyd-tenant-graph.ts:1-30` (mutually exclusive source) | `app/page.tsx`, `app/sites/*`, `api/fyd/projection` | `getPingObjectGraph` | `dump.py` (manual) | site pages/routes | digest (tamper) only | STALENESS / DUAL-TRUTH | HIGH | freshness | reachability (G1/G2 dark journal) | fyd-path |
| projection | Qdrant rebuild/drift | No rebuild path, no drift detection, no deletion; replay never refires the projection | grep rebuild/resync: empty; `emit` duplicate-suppression (`unified_event_runtime.js:158-164`); `projected_at: null` (`embedding_service.js:224`); no delete in adapter | — | — | EmbeddingService | search consumers | none | MISSING MECHANISM | HIGH | recoverability | event, replay | 14, 12 |
| projection | knowledge graph mutation | `ON CONFLICT DO UPDATE SET data` silently overwrites node data, contradicting the module's ADD-only docstring | `knowledge_graph.js:96` vs docstring `:20-24` | `addNode` | Postgres | KnowledgeGraph | `queryNodes`, hybridSearch | self | CONTRACT CONTRADICTION | HIGH | add-only claim | — | 14 |
| projection | knowledge graph identity | `node_id` uses key-order-sensitive `JSON.stringify` (F8 class) | `knowledge_graph.js:89-91` | `addNode` | — | KnowledgeGraph | — | none | DETERMINISM RISK | MEDIUM | canonical bytes | identity (05) | 05 |
| projection | materialized views | Honest derived aggregates; 30s bounded staleness; no per-record identity | `gateway/materialized_views.js:35-122` | ControlCenter | Postgres | `MaterializedViews.refreshAll` | `getMissionSummary` etc. | timer | HEALTHY (note) | HIGH | — | — | 12 |
| projection | repository_events | Append-only secondary journal; hash-chained; EventBridge converges into ping_events | `runtime/kernel/event_repository.js:20-102,179-187`; EVENT-FORENSICS §2B#6, §2D | agent/memory/mission emitters | EventRepository | kernel EventRepository | EventBridge, mission/patch authorities | append-only | HEALTHY (note) | HIGH | — | event | 03 |
| projection | owner overlay | Append-only log; pure fold; proven local replay; correctly layered after verification | `src/fyd/object/owner-events.ts`; `ping-object-source.ts:238-246`; test A1 (REACHABILITY) | `applyOwnerCommand` | `projectOwnerState` | owner-store | `composeObjectView` | fold | HEALTHY (note) | HIGH | — | — | — |
| projection | media lane | Content-hash addressed; has the only drift-detection/repair loop (`materialization-recovery.ts`) | `src/lib/media-kv-store.ts`, `materialization-recovery.ts:1-60`, `dataset-snapshots.ts` | media pipeline | KV/Blob | media pipeline | site media | content hash | HEALTHY (note) | MEDIUM | — | — | — |
| projection | HPP event log | Non-durable in-memory sink; replay interface (`findAfter`) has zero consumers | `src/lib/events.ts:120,205-229`; AUTHORITY-MAP #34/#35 | marketing routes | `InMemoryEventRepository` | `logEvent` | none | none | DEAD INTERFACE | HIGH | — | security (F1/F2 ingest) | — |
| projection | `constitutional_*`/`memory_*` Qdrant collections | Harness-dominated writers; live-consumer liveness unverifiable | `gateway/qdrant_bootstrap.js:94-99`; `memory_vector_store_authority.js:35-53`; 7 harness referencers | harness scripts | Qdrant | mixed | unknown | unknown | UNVERIFIED LIVENESS | MEDIUM | — | — | 14 |
| projection | hybrid search verify leg | Qdrant hits traced to journal rows via EvidenceAuthority with reject counter — does not blindly trust projection | `ping-runtime/search/hybrid_search.js:58-72` | `/knowledge/search` | `EvidenceAuthority.verify` | — | API consumers | evidence chain | HEALTHY (note) | HIGH | — | agent14 | 14 |

## 7. Open questions for the coordinator

1. **V1 is the sharpest breach.** Does any auth (global middleware, reverse proxy) actually guard `POST /knowledge/nodes`? I observed none at the mount or route; a gateway-side confirmation is needed before grading exploitability — but the *constitutional* breach (sourceless nodes labeled `verified: true`) stands regardless of auth.
2. **Should derived worker events live in the sovereign journal at all?** V3 suggests a `derived::` namespace or a separate derived-events table so the journal stays source-only. That's an architecture call above my patch grade.
3. **Dump cadence:** D1 has no rebuild trigger. If the site must render D1 while the journal path is dark, who owns re-running `dump.py`, and should a max-age fail-closed bound be added to the read seam?
4. The uncommitted `dump.py` v1.1.0 (dirty in core) vs committed v1.0.0: the live projections depend on uncommitted code. Convergence should decide which is canonical and commit it.

## 8. Method notes / caveats

- `/home/nolan/ping` was treated read-only; vault/oauth/config contents never opened (names only). No secret values printed.
- Qdrant reads were passive GETs (`/collections`, one `points/scroll` of 4 points with payload, no vectors).
- Live gateway internals beyond the cited files were not exhaustively traced (e.g., global Express middleware chain for `/knowledge` auth — flagged as unconfirmed rather than asserted absent).
- `evals/`, worktrees, and `deliverables/` were out of scope except where cited.
- The sprint worktree's 3 dirty files and the core's 4 dirty files were observed, not touched.
