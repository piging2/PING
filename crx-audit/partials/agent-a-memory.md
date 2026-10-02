# AGENT A — Memory Forensics Report
**Target:** /home/nolan/ping @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (branch refactor/runtime-authority-convergence)
**Probed:** 2026-09-22 ~19:36–20:10 MDT, read-only (bridge scripts, docker ps/logs/inspect, psql SELECT, HTTP GET)
**Method:** semantic-family search (remember/recall/retrieve/context/history/state/embedding/vector/similarity/rank/score/candidate/fact/knowledge/episode/session/checkpoint/store/persistence/cache/forget/invalidate/delete/supersede/conflict/provenance), then caller-graph verification for every candidate. A definition with no caller is phantom until proven otherwise.

**Headline finding:** PING has ONE live memory dataflow (event spine → Qdrant vector projections + Postgres knowledge graph → HybridSearch retrieval), and it is simultaneously real and degraded: writes are live, but every projected vector in the current gateway session is a seeded pseudorandom fallback (Ollama unreachable from the gateway container), the retrieval endpoints have had zero consumers in 9h of uptime, and the knowledge-graph promotion path is starved (197/197 nodes stuck at `candidate`). Around this live core sit ~10 phantom memory systems: defined, sometimes DI-registered, never invoked.

**Critical topology correction:** the LIVE backing stores are the `brain-*` containers, not the `ping-*` ones. Gateway env (`QDRANT_URL=http://host.docker.internal:6333`, `POSTGRES_HOST=host.docker.internal`, `POSTGRES_PORT=5432`, `POSTGRES_DB=ping_runtime`, `POSTGRES_USER=postgres`) resolves to **brain-qdrant** (host 6333) and **brain-postgres/ping_runtime** (host 5432, 2321 ping_events). ping-postgres (host 5433, crx_runtime, 739 events) and ping-qdrant (unhealthy, no published ports) are the dormant/secondary pair. Any audit that surveys ping-postgres is surveying the wrong database.

---

## 1. WRITE → FORGET path map (broken arrows marked ✗)

### Path 1 — Event-sourced working context (LIVE, RUNTIME_PROVEN)
```
WRITE:  UnifiedEventRuntime.emit() → ping_events                      ✓ (739→2321 rows live)
STORE:  brain-postgres/ping_runtime.ping_events (2321 rows, observed) ✓
INDEX:  none (raw table scans / ordered queries)                      ✓ (by design)
RETRIEVE: EventReadAuthority (runtime/kernel/event_read_authority.js) ✓
          getRecentEventsForContext / getWorkerStatusForContext /
          getDailyActivityForContext / getLatestSummariesForContext /
          getRecentFailuresForContext / getModelMetricsForContext
FILTER: query params (limit, date)                                    ✓
RANK:   none (recency-ordered)                                        — (by design)
INJECT: GET /context/* (gateway/routes/context.js, live routes)       ✓
USE:    ✗ BROKEN — zero in-repo callers; zero hits in 9h gateway logs
SUPERSEDE / INVALIDATE / FORGET: ✗ NONE — events are append-only; no delete path
```

### Path 2 — Vector (semantic) memory (LIVE WRITE, DEGRADED INDEX, UNCONSUMED)
```
WRITE:  ProjectionWorker (canonical_workers.js:163) consumes
        options.embeddingService; EmbeddingService.subscribe()
        on 19 INDEXABLE_TYPES                                       ✓ (logs: "[ProjectionWorker] Projected RECOMMENDATION_CREATED → qdrant point …")
STORE:  brain-qdrant collection `knowledge` (377 pts, observed)       ✓
INDEX:  ✗ DEGRADED — 52/100 sampled points carry "embedding":"fallback"
        (seeded PRNG vectors, semantically meaningless); live session
        health stats: embedded=0, fallback=30, projected=30.
        Root cause (OBSERVED): Ollama unreachable from ping-gateway —
        INFERENCE_BASE_URL defaults to http://ping-ollama:11434 (no such
        host); node fetch from inside the container times out.
        nomic-embed-text EXISTS in the ollama container but is unreachable.
RETRIEVE: HybridSearch semantic leg (EmbeddingService.search → Qdrant) ✓
FILTER: namespace dropped POST-retrieval in JS (Qdrant adapter has no
        server-side filter); namespace is caller-asserted, routes have
        no auth                                                        ⚠ WEAK
RANK:   EvidenceAuthority.rank: confidence × provenance × approval,
        fallback ×0.5, rejected ×0.2                                   ✓ (rank knows vectors are degraded)
INJECT: POST /knowledge/search (namespace required, live route)        ✓
USE:    ✗ BROKEN — zero hits in 9h logs; no in-repo consumers
SUPERSEDE / INVALIDATE / FORGET: ✗ NONE — no delete API; upsert overwrites
        by ID only; no TTL, no tombstones
```

### Path 3 — Knowledge graph memory (LIVE WRITE, STARVED PROMOTION, UNCONSUMED)
```
WRITE:  gateway_runtime.js:603 — subscribes GRAPH_PROJECTION_EVENTS
        (CUSTOMER_*/PROJECT_*/LEAD_*/ESTIMATE_*/INVOICE_*/OBSERVATION_/
        CLAIM_/RECOMMENDATION_CREATED) → knowledgeGraph.addNode('event',
        status='candidate', namespace from spine, confidence from spine) ✓ (197 rows)
STORE:  brain-postgres/ping_runtime.knowledge_nodes (197, ALL candidate,
        ALL node_type='event'; namespaces tenant::hpp 73 / core::system 121 /
        core::owner 3); knowledge_edges = 0 rows                        ✓
PROMOTE: ✗ STARVED — KnowledgePromoter IS registered live
        (canonical_workers.js:682, eventTypes SNIPPET_APPROVED/_REJECTED,
        AI_RESPONSE_ACCEPTED/_REJECTED) but NOTHING emits those events in
        production (only gateway/generated/event_generator.js test data).
        "only a human signal promotes" — the human signal has never arrived.
RETRIEVE: HybridSearch KG leg (queryNodes text search, candidate+approved) ✓
          — note: results marked verified:true ("already passed the graph
          write path") even though every node is an unapproved candidate
INJECT: same POST /knowledge/search                                     ✓
USE:    ✗ BROKEN (same as Path 2)
CORRECT: ✗ NONE — promoter flips status/confidence only; content immutable
```

### Path 4 — Conversation memory (PHANTOM — never constructed)
```
WRITE: ✗ BROKEN — gateway/conversation_memory.js ("Transcript → Chunk →
       Embedding → Qdrant", collection 'conversations') is registered in
       bootstrap/wiring.js DI but NEVER resolved; wiring.js is not in the
       live boot path (server.js → bootstrap/gateway_runtime.js only;
       wiring.js is touched only by constitution routes + runtime_hash for
       buildDependencyGraph). Collection 'conversations' was never created;
       the related 'constitutional_memory' collection exists with 0 points.
All downstream arrows: ✗ nonexistent.
```

### Path 5 — Worker episodic memory (WRITE LIVE, INJECT BROKEN)
```
WRITE:  ping-runtime/orchestration/execution/worker_state_machine.js
        recordFinding/recordFix/recordPattern → worker_memory/<id>.json ✓
        (note: its OWN duplicate implementation; does NOT use the
        WorkerMemory class — two writers, same directory)
STORE:  ping-runtime/orchestration/worker_memory/*.json files          ✓
RETRIEVE: getMemory()/getSummary() (dashboard.js uses getSummary)      partial
INJECT: ✗ BROKEN — WorkerMemory.getContextPrompt() has ZERO callers;
        no worker prompt assembly references it; canonical_workers.js
        contains no "prompt"/"context" assembly at all
USE:    ✗ dashboard display only
FORGET: ✗ NONE — JSON append, no TTL, no pruning
```

---

## 2. Per-authority reality matrix

| # | COMPONENT / PATH | PURPOSE | CALLER | CALLEE / PERSISTENCE | IDENTITY | TENANT BOUNDARY | CLASSIFICATION | EVIDENCE | DUPLICATE / SHADOW? | SPRINT RELEVANCE |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | UnifiedEventRuntime → `ping_events` — ping-runtime/events/unified_event_runtime.js | canonical event spine (memory substrate) | workers, routes, gateway_runtime | brain-postgres/ping_runtime.ping_events, 2321 rows (OBSERVED via psql) | event_id (deterministic); namespace column | namespace column, default core::system | RUNTIME_PROVEN | gateway env → host 5432 = brain-postgres; row count 2321 vs 739 (ping-postgres) vs 37 (brain crx_runtime) | ping-postgres is the shadow/stale twin | FOUNDATION — everything else projects from here |
| 2 | EmbeddingService — ping-runtime/embeddings/embedding_service.js | async vector projection of 19 event types | gateway_runtime.js:494–502 (constructed, initialized, subscribed) | brain-qdrant `knowledge` (377 pts); id=toQdrantId(event_id) | Qdrant point id derived from event_id; payload.source_event_id | payload.namespace | RUNTIME_PROVEN (write) / DEGRADED (quality) | docker logs "Projected … → qdrant point"; /health stats embedded:0 fallback:30 projected:30; scroll sample 52% fallback | none (sole projector) | P0 — fix Ollama reachability or pause projection; fallback vectors poison semantic recall |
| 3 | HybridSearch — ping-runtime/search/hybrid_search.js | retrieval front door: semantic + evidence + KG | gateway/routes/knowledge.js:34 (POST /knowledge/search) | reads brain-qdrant + knowledge_nodes; ADD-only | result ids = qdrant point id / node_id | namespace REQUIRED in request; post-search JS drop | RUNTIME_PROVEN (constructed+routed) / UNCONSUMED | gateway_runtime.js:533; 0 hits in 9h logs; no in-repo callers | none | P1 — wire a real consumer or acknowledge shelfware |
| 4 | EvidenceAuthority — ping-runtime/evidence/evidence_authority.js | verify (Qdrant→ping_events trace) + rank | HybridSearch | brain-postgres SELECT by source_event_id | canonical_hash + namespace match | re-checks row.namespace == payload.namespace | RUNTIME_PROVEN | verify() lines 76–110; rank() lines 149–175 (fallback ×0.5) | none | KEEP — best-designed piece; note `checks.lineage=true` is asserted, not verified |
| 5 | KnowledgeGraph — ping-runtime/knowledge/knowledge_graph.js | candidate node store | gateway_runtime.js:472,603; routes/knowledge.js | brain-postgres knowledge_nodes (197, all candidate) / edges (0) | node_id; source_event_id trace | namespace column; caller-supplied on POST /nodes (no auth) | RUNTIME_PROVEN (write) | psql GROUP BY: 197 candidate, 0 approved | gateway/knowledge_graph.js is a DIFFERENT in-memory deterministic object (Milestone 6) — name collision | P1 — promotion starved; edges never created |
| 6 | KnowledgePromoter — ping-runtime/knowledge/knowledge_promoter.js | candidate→approved/rejected on human signal | registered canonical_workers.js:682 | knowledge_nodes status flip | sourceEventId | passes payload.namespace through | RUNTIME_PROVEN (registered) / STARVED | APPROVE_EVENTS={SNIPPET_APPROVED, AI_RESPONSE_ACCEPTED}; no production emitter | none | needs an emitter or removal |
| 7 | EventReadAuthority context queries — runtime/kernel/event_read_authority.js:215–330 | working-memory read API | gateway/routes/context.js (7 endpoints) | ping_events (direct SQL) | event rows | none at query layer | RUNTIME_PROVEN / UNCONSUMED | shim ping-runtime/events/event_read_authority.js delegates to kernel | none | P2 — natural agent-context feed; needs a consumer |
| 8 | ConversationMemory — gateway/conversation_memory.js | transcript→chunk→embed→Qdrant | NONE (registered wiring.js:103, never resolved) | would-be: Qdrant `conversations` (never created) | conversationId | config only | DOCUMENTED_ONLY (phantom) | grep: only wiring.js references; collection absent; `constitutional_memory` coll. 0 pts | overlaps EmbeddingService's job | REMOVE or IMPLEMENT — pick one |
| 9 | gateway/memory_authority.js, memory_embedding_authority.js, memory_persistence_authority.js, memory_vector_store_authority.js | declared memory authorities | NONE (zero callers) | none | n/a | n/a | DOCUMENTED_ONLY (phantom) | grep zero hits; dormant_classifications/*.json: dependent_modules=0, recommendation "migrate" | shadow of #2/#8 | REMOVE |
| 10 | AgentMemoryAuthority — ping-runtime/agents/agent_memory_authority.js (752 lines, Phase 36F) | 5-tier constitutional memory (Working/LongTerm/Execution/Architectural/Failure) | NONE | none (constructor takes eventRepository; never built) | memory_id, content-addressed hash | agent_id field (declared) | DOCUMENTED_ONLY (phantom) | zero callers; MemoryTypes terms appear nowhere else in repo | shadows the real event spine | REMOVE or re-scope |
| 11 | WorkerMemory — ping-runtime/orchestration/worker_memory.js | per-worker findings/patterns JSON | dashboard.js (getSummary only) | worker_memory/*.json | workerId | none | SOURCE_PRESENT / PARTIAL | getContextPrompt zero callers; worker_state_machine reimplements writes independently | DUPLICATE writer with worker_state_machine.js | P2 — inject or delete getContextPrompt |
| 12 | ai-stack/api/main.py "CRX Memory Engine" | FastAPI event store (POST /event, GET /events) | NONE (never in branch) | none | integer id | none | ARCHAEOLOGICAL / MISSING | exists only in snapshot commit 42ce1e1ce (94 lines, no embeddings); absent from current tree; audit/crx_runtime_archaeology_canonical_stack_audit.md references it | none — it was a stub, not a shadow | historical note only |
| 13 | runtime/cognitive/memory_worker.py | assembles audit "context packs" from findings | runtime/cognitive/supervisor.py | stdout JSON | task_id | none | EXPERIMENTAL (offline audit tool) | docstring: "Never performs retrieval or reasoning itself"; no scheduler/driver found | name-collides with memory; is NOT memory | rename or leave; out of runtime scope |
| 14 | runtime/kernel/workers/qdrant_projection_worker.py | python poll-based Qdrant projector | NONE live (manifest refs only) | would-be Qdrant | event id | claims namespace | ARCHAEOLOGICAL | no cron/container/driver; LawRouter.json etc. list it as a path | shadow of #2 (JS projector won) | REMOVE |
| 15 | KnowledgeRetrieval / DocumentIngestion / InferenceService — gateway/knowledge_retrieval.js etc. (Phase A.x) | RAG Q&A; doc watch; inference | wiring.js DI only; knowledge.activity.js (no Temporal runner — no temporal container) | would-be Qdrant `documents` (never created) | n/a | n/a | DOCUMENTED_ONLY (phantom) | zero resolves; temporal absent from docker ps | shadows #3 | REMOVE |
| 16 | mission_control_knowledge_apis.py | Flask knowledge API prototype (2026-06-23) | NONE | none | n/a | n/a | ARCHAEOLOGICAL | docstring "Priority 2"; no callers | shadows #3 | REMOVE |
| 17 | IntelligenceWorker — ping-runtime/workers/intelligence_worker.js | rule-based + Ollama worker | registered DORMANT (eventTypes: [], skipped) | none | n/a | n/a | CONFIG_PRESENT (dormant) | canonical_workers.js:716–728 "KEEP-DORMANT" | none | leave dormant or delete |
| 18 | OpenWebUI memory — open-webui container /app/backend/data (webui.db 146MB, vector_db/) | chat history + built-in RAG | OpenWebUI itself | own SQLite + vector_db | webui ids | OpenWebUI auth | RUNTIME_PROVEN (external) | docker exec ls; volume crx-digestion-worker_open-webui-data | SILO — not a PING authority, not projected from spine | boundary note: user-facing memory PING can't see |
| 19 | brain-postgres/crx_runtime (37 events; observations/claims/entities/relationships/citations tables) | legacy schema | unknown (stale) | brain-postgres | mixed | n/a | ARCHAEOLOGICAL | extra tables vs live DB; 37 stale events | legacy twin of #1 | confirm read-only legacy before any cleanup |
| 20 | create_constitutional_memory_collection.py; archive/obsolete/qdrant_memory_projection.sql | constitutional Qdrant memory | NONE | `constitutional_memory` collection (0 pts) | n/a | n/a | ARCHAEOLOGICAL | collection exists, empty; SQL archived as obsolete | superseded by #2 | REMOVE |

### Memory-quality summary (where source permits)
- **Precision:** semantic leg compromised (seeded vectors ≈ random; rank() penalizes fallback ×0.5 but they still enter results). KG leg is exact text search — precise but unapproved. Evidence verify() is the strongest link (hash + namespace + backing-row checks).
- **Recall:** 19 event types projected; anything not emitted is invisible. KG covers 13 event types. No backfill except boot-time subscription going forward.
- **Freshness:** async non-blocking queue; no TTL/staleness marker; `projected_at` written as null.
- **Provenance:** payload carries source_event_id + canonical_hash + namespace; verify() re-checks against ping_events. `checks.lineage=true` is asserted, not computed.
- **Authority:** confidence propagated from spine (BaseWorker._emit); KG nodes default candidate with null confidence = "not yet assessed"; approval path starved so nothing ever reaches 1.0.
- **Tenant isolation:** namespace column + post-retrieval JS filter; NO server-side Qdrant filter; /knowledge/* routes have NO auth — namespace is caller-asserted. Any network caller can request any namespace. (OBSERVED: route_middleware has no auth; knowledge.js takes namespace from body.)
- **Correction survival:** no content-correction path; promoter only flips status.
- **Deletion/forgetting:** no delete/forget/supersede/invalidate in ANY live path. Constitutional "TRUTH ≠ EMBEDDINGS / Qdrant is rebuildable projection" doctrine covers rebuild, not forgetting.
- **Untrusted input → memory:** YES — INDEXABLE_TYPES includes GOOGLE_REVIEW_RECEIVED, GITHUB_COMMIT_SYNCED, LEAD_CREATED, INVOICE_* (external data projected into the vector store with no trust gate observed).

---

## 3. Phantom-infrastructure findings
1. **ConversationMemory** — DI-registered, never resolved; target collection never created. (gateway/conversation_memory.js, wiring.js:103)
2. **Four gateway memory authorities** — zero callers; dormant-classification JSONs agree (dependent_modules=0). (gateway/memory_*.js)
3. **AgentMemoryAuthority** — 752 lines, five memory types, zero callers; its vocabulary appears nowhere else. (ping-runtime/agents/agent_memory_authority.js)
4. **KnowledgeRetrieval/DocumentIngestion/InferenceService (Phase A.x)** — registered, never resolved; Temporal runner absent. (gateway/knowledge_retrieval.js, wiring.js)
5. **WorkerMemory.getContextPrompt()** — the only memory→prompt injection method in the repo has no callers. (ping-runtime/orchestration/worker_memory.js)
6. **ai-stack "CRX Memory Engine"** — snapshot-only FastAPI stub; missing from branch. (git 42ce1e1ce)
7. **Python Qdrant projector + constitutional-memory scripts + Mission Control knowledge APIs** — no live drivers. (runtime/kernel/workers/qdrant_projection_worker.py, create_constitutional_memory_collection.py, mission_control_knowledge_apis.py)
8. **Alternate boot path** — gateway/bootstrap/index.js (wireContainer+Lifecycle) is not the live entry; server.js uses GatewayRuntime directly. Everything registered only in wiring.js DI is shelfware.

---

## 4. UNRESOLVED QUESTIONS (operator-grill candidates)
1. **Which Postgres is canonical, and why do two divergent event stores exist?** Live env points to brain-postgres/ping_runtime (2321 events). ping-postgres/crx_runtime holds 739 events and is the DB a naive reader would survey. What wrote the 739, and is ping-postgres safe to decommission? (Evidence: env vars + row counts; cannot answer lineage from source.)
2. **Should vector projection keep running on seeded fallback vectors?** Live session: 30/30 projections fallback; ~52% of the collection is semantically noise. Options: fix Ollama reachability (wrong hostname `ping-ollama`, container is `ollama`, gateway on `bridge` with no DNS), pause the subscriber, or mark-and-rebuild later. rank() already discounts fallback ×0.5 — is that policy or accident?
3. **Who is the intended consumer of POST /knowledge/search and GET /context/*?** Both live, both zero-consumed in 9h. If FYD/agents are meant to read here, nothing does yet; if not, these are unauthenticated read surfaces into tenant-namespaced memory.
4. **What emits SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED in production?** KnowledgePromoter is registered and waiting; only test event_generator emits them. Without an emitter, all 197 KG nodes stay candidates forever and the approval-weighted ranking never engages.
5. **Where is FYD object memory supposed to land?** `objects`/`projections` tables exist only in the stale DB (empty) and are absent from the live DB; ProjectionWorker projects to Qdrant only. Is object persistence intentionally Qdrant-only, or is a table migration missing?
6. **Is caller-asserted namespace an acceptable privacy boundary?** /knowledge/search requires namespace but authenticates nothing; Qdrant-side filtering doesn't exist (post-search JS drop). Cross-tenant retrieval is one HTTP call away for anyone reaching :8080.
7. **EvidenceAuthority.verify asserts `checks.lineage = true` unconditionally** (line ~90, "source_event_id is the trace anchor"). Is lineage verification intentionally out of scope, or a stub?
8. **brain-postgres/crx_runtime legacy schema** (observations/claims/entities/relationships/citations, 37 events) — archaeological and safe to ignore, or does something still read it? (No callers found, but absence of evidence ≠ evidence of absence for external readers.)
9. **WorkerMemory duplicate writers** — worker_state_machine.js reimplements WorkerMemory's storage instead of using the class. Which is canonical, and should getContextPrompt be wired into worker prompts or deleted?
10. **Should the ~10 phantom memory systems be deleted?** They are documented in GRILLING-BRIEF.md candidates' territory: each is a trap for the next reader (e.g., "memory authority" files that authorize nothing). Deletion needs Nolan's word per the destructive-action boundary.

---
*All classifications are the strongest the evidence supports; nothing above was upgraded. OBSERVED FACT = direct tool output (psql counts, curl scroll, /health JSON, docker logs/inspect, grep). SUPPORTED INFERENCE = structural conclusion from observed wiring (e.g., "never resolved" from zero require/resolve hits). UNRESOLVED = Section 4.*
