# DELIVERABLE 2 — MEMORY MAP

**Source:** `partials/agent-a-memory.md` (full path detail + evidence). Topology: live stores are the **brain-*** containers per gateway env (`host.docker.internal:5432` → brain-postgres/`ping_runtime`; `:6333` → brain-qdrant), NOT ping-postgres/ping-qdrant. (SUPPORTED INFERENCE from env + row counts; live-write target UNRESOLVED — grill.)

## Path 1 — Event-sourced working context: LIVE, RUNTIME_PROVEN, UNCONSUMED
```
WRITE:     UnifiedEventRuntime.emit() → ping_events                          ✓
STORE:     brain-postgres/ping_runtime.ping_events (2321 rows observed)       ✓
INDEX:     none (ordered queries, by design)                                  ✓
RETRIEVE:  EventReadAuthority — getRecentEventsForContext / getWorkerStatusForContext /
           getDailyActivityForContext / getLatestSummariesForContext /
           getRecentFailuresForContext / getModelMetricsForContext            ✓
FILTER:    query params (limit, date)                                         ✓
RANK:      none (recency-ordered, by design)                                  —
INJECT:    GET /context/* (gateway/routes/context.js, 7 live routes)          ✓
USE:       ✗ BROKEN — zero in-repo callers; zero hits in 9h gateway logs
FORGET:    ✗ NONE — append-only; no delete path
```

## Path 2 — Vector (semantic) memory: LIVE WRITE, DEGRADED INDEX, UNCONSUMED
```
WRITE:     ProjectionWorker (canonical_workers.js:163) via EmbeddingService.subscribe()
           on 19 INDEXABLE_TYPES                                              ✓
STORE:     brain-qdrant collection `knowledge` (377 pts)                      ✓
INDEX:     ✗ DEGRADED — 52/100 sampled points are seeded-PRNG fallback vectors
           (semantically meaningless). Live session: embedded=0, fallback=30.
           ROOT CAUSE (observed): Ollama unreachable — INFERENCE_BASE_URL defaults
           to http://ping-ollama:11434 (no such host); nomic-embed-text exists in
           the ollama container but is unreachable from ping-gateway.
RETRIEVE:  HybridSearch semantic leg (EmbeddingService.search → Qdrant)        ✓
FILTER:    ⚠ WEAK — namespace dropped POST-retrieval in JS; Qdrant adapter has no
           server-side filter; namespace is caller-asserted; routes have no auth
RANK:      EvidenceAuthority.rank — confidence × provenance × approval;
           fallback ×0.5, rejected ×0.2                                        ✓
INJECT:    POST /knowledge/search (live, namespace required)                  ✓
USE:       ✗ BROKEN — zero hits in 9h logs; no in-repo consumers
FORGET:    ✗ NONE — no delete API; upsert overwrites by ID only; no TTL/tombstones
```

## Path 3 — Knowledge graph memory: LIVE WRITE, STARVED PROMOTION, UNCONSUMED
```
WRITE:     gateway_runtime.js:603 subscribes GRAPH_PROJECTION_EVENTS →
           knowledgeGraph.addNode('event', status='candidate')                 ✓ (197 rows)
STORE:     brain-postgres/ping_runtime.knowledge_nodes (197, ALL candidate,
           ALL node_type='event'; tenant::hpp 73 / core::system 121 / core::owner 3);
           knowledge_edges = 0 rows                                           ✓
PROMOTE:   ✗ STARVED — KnowledgePromoter registered (canonical_workers.js:682) but
           NOTHING emits SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED in production
           (only test event_generator). 0 approved nodes live.
RETRIEVE:  HybridSearch KG leg (text search, candidate+approved)              ✓
           — results marked verified:true ("already passed the graph write path")
             even though every node is an unapproved candidate
INJECT:    POST /knowledge/search                                             ✓
USE:       ✗ BROKEN (same as Path 2)
CORRECT:   ✗ NONE — promoter flips status/confidence only; content immutable
```

## Path 4 — Conversation memory: PHANTOM (never constructed)
```
WRITE:     ✗ BROKEN — gateway/conversation_memory.js registered in bootstrap/wiring.js
           DI but NEVER resolved; wiring.js is NOT in the live boot path
           (server.js → bootstrap/gateway_runtime.js only). `conversations`
           collection never created; `constitutional_memory` exists with 0 points.
All downstream arrows: ✗ nonexistent.
```

## Path 5 — Worker episodic memory: WRITE LIVE, INJECT BROKEN
```
WRITE:     worker_state_machine.js recordFinding/recordFix/recordPattern →
           worker_memory/<id>.json                                            ✓
           (its OWN duplicate implementation — does NOT use the WorkerMemory class;
           two writers, same directory)
STORE:     ping-runtime/orchestration/worker_memory/*.json                    ✓
RETRIEVE:  getMemory()/getSummary() (dashboard.js uses getSummary)            partial
INJECT:    ✗ BROKEN — WorkerMemory.getContextPrompt() has ZERO callers; no worker
           prompt assembly references it; canonical_workers.js has no prompt/context
           assembly at all
USE:       ✗ dashboard display only
FORGET:    ✗ NONE — JSON append, no TTL, no pruning
```

## Memory-quality summary (where source permits)
- **Precision:** semantic leg compromised (seeded vectors ≈ random; rank penalizes ×0.5 but they still enter results). KG leg exact but unapproved. `verify()` (hash+namespace+backing-row) is the strongest link.
- **Recall:** 19 event types projected; anything not emitted is invisible. KG covers 13 types. No backfill — subscription goes forward from boot.
- **Freshness:** async non-blocking; no TTL/staleness marker; `projected_at` written null.
- **Provenance:** payload carries `source_event_id` + `canonical_hash` + namespace; `verify()` re-checks. `checks.lineage=true` asserted, not computed.
- **Authority:** confidence propagated from spine; KG nodes default candidate/null confidence; approval path starved → nothing ever reaches 1.0.
- **Tenant isolation:** WEAK — no auth on `/knowledge/*`; caller-asserted namespace; no server-side Qdrant filter. Cross-tenant retrieval is one HTTP call away.
- **Correction survival:** no content-correction path; promoter flips status only. (Agent D proved a demotion bug: re-emitted events reset approved→candidate via `addNode` ON CONFLICT.)
- **Deletion/forgetting:** NONE anywhere. ADD-only forever.
- **Untrusted input → memory:** YES — INDEXABLE_TYPES includes GOOGLE_REVIEW_RECEIVED, GITHUB_COMMIT_SYNCED, LEAD_CREATED, INVOICE_* with no trust gate observed.

## Broken-arrow inventory (the sprint's memory punch list)
1. Path 1: USE broken (no consumers). Path 2: INDEX degraded, USE broken, FORGET absent. Path 3: PROMOTE starved, USE broken, CORRECT absent. Path 4: everything phantom. Path 5: INJECT broken, FORGET absent.
2. No path connects any memory store to a worker decision — the live execution path reads only `event.payload`/`event.metadata`.
3. The convergence question (which memory survives) is the operator grill that gates all memory work.
