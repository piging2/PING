# HARVEST LANE 08: SEARCH / RETRIEVAL / MEMORY

Date: 2026-09-30. Lane: reader 8 of 10, ecosystem harvest sweep (CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30).
Mode: READ-ONLY reconnaissance. Nothing installed, no dependencies added, no repo modified. The only write is this report.

Domain question: what improves Ask FYD's evidence-bound answer quality without creating RAG theater?
RAG theater = impressive retrieval demos that cannot show which evidence supports which claim. Anything that weakens evidence binding is a REJECT regardless of benchmark scores.

## 1. SEARCH LOG (where I looked, what I found, what I did not)

Local workspace (this sandbox), read-only:
- `~/workspace/fyd-factory/ask/` (LANE-ASK-SUMMARY.md, ASK-EVAL-V2.md, eval harnesses): how Ask FYD answers today.
- `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` (2026-09-21): how the ask pipeline resolves questions, first broken step.
- `~/workspace/fyd-ask-graph-read/`: tenant graph read route.
- `~/workspace/crx-audit/02-memory-map.md` and `07-harvest-ledger.md`: the CRX audit's memory-path findings (the authoritative internal map of PING/CRX retrieval).
- `~/workspace/crx-autonomous-missions/repos/`: agent frameworks (adk, agentscope, autogen, crewai, goose, langgraph, openhands-sdk, orca, pydantic-ai). These are agent runtimes, not retrieval primitives; they belong to the agent-runtime lane, not this one. No retrieval implementation harvested from them.
- `~/workspace/crx-convergence-sweep/inventory-2026-09-28-t0.md`: not re-read in depth; the audit's memory-map already synthesizes its retrieval findings.

Pig (via `~/workspace/bin/pigwsl-exec`, read-only greps and reads):
- `/home/nolan/projects/ping` and `/home/nolan/projects/ping-fyd-converged` do NOT exist in this sandbox; both exist on the Pig. HEADs: ping `f94bba39`, ping-fyd-converged `300c9c91`.
- Grep of TS src in both repos for HybridSearch, KnowledgeGraph, Qdrant, embedding, RRF: NO HybridSearch or retrieval module in TypeScript. The only Qdrant reference in TS is `src/app/api/mc/technology/route.ts` (health inspection of the `ping-qdrant` container and its `knowledge` collection). The two "embedding" hits in fyd code were false positives (public-site embedding; "without embedding store internals").
- The actual HybridSearch lives inside the `ping-gateway` container: `/app/ping-runtime/search/hybrid_search.js` (129 lines) and `qdrant_adapter.js` (76 lines). Read in full via `docker exec` (read-only `cat`).

Not found: any BM25/sparse retrieval, any reranker, any RRF, any LLM in any retrieval or answer path in our stack. The task brief's "KnowledgeGraph + HybridSearch + Qdrant" describes the gateway container's retrieval front door, not the Ask FYD path.

## 2. INTERNAL BASELINE (before judging any external system)

### 2a. FYD: Ask FYD retrieval and evidence binding (verified from source docs + fixture evals)

There is no vector search in Ask FYD. Retrieval is deterministic graph-context assembly plus keyword intent matching:

1. `buildAskFydContext` (src/fyd/ask/context-builder.ts) assembles a bounded context: the target object, at most 8 related objects, at most 20 relationships, fields truncated to 500 chars, filtered by the field-visibility law and owner policy. `evidenceRefs` are built from object provenance (`website-ingestion:<source URL>`) and relationship evidenceRef events.
2. `composeAskFyd` (src/fyd/ask/answer.ts) runs keyword-anchored intent detection first (e.g. services intent matches word-boundary "service/services/offer/offers/provide/do"), then delegates to the composer, which walks the object graph: it looks only at `target.fields["services"]` or related objects with service/product/offer schemas.
3. The concierge module (src/fyd/ask/concierge.ts, pure function, 971 lines) answers the 7 canonical visitor questions with per-claim grades: SUPPORTED (must cite >= 1 evidence item; the module throws instead of rendering a SUPPORTED claim without evidence), DERIVED (must cite every input), INFERRED (must cite its basis), UNKNOWN (cites nothing, stated explicitly). `[n]` markers resolve to evidenceRefs. 152 tests across 9 suites assert these invariants; hostile fixtures pass.
4. Fail-closed: no evidence yields "I do not have evidence for that in the current context, so I will not guess," plus the consulted evidence list.

Per the 2026-09-21 evidence-gap finding, the FIRST BROKEN STEP in Ask FYD is extraction (service facts exist only as free prose inside the business `description` field; the proceduralizer never emits Service objects), NOT retrieval. The answer layer correctly refuses rather than parse prose as claims.

### 2b. PING: gateway HybridSearch (verified from container source)

`/app/ping-runtime/search/hybrid_search.js`:

- Two legs, fused by naive concatenation then ranking:
  - Semantic leg: `EmbeddingService.search(query, {limit: limit*3})` -> Qdrant 768-d cosine. Oversamples 3x, then applies the namespace filter CLIENT-SIDE post-retrieval ("the Qdrant adapter has no server-side filter; results from a different namespace are structurally dropped"). Each surviving hit goes through `EvidenceAuthority.verify()`, which traces it to a real `ping_events` row (canonical_hash + namespace + source_event_id chain).
  - KG context leg: `KnowledgeGraph.queryNodes({search, namespace, limit})`, text search over approved/candidate nodes. Results are marked `verified: true` by assertion ("stored node, already passed the graph write path"), not by re-verification.
- Fusion: `results` = semantic hits concat KG nodes; then `this._evidence.rank(results)` if an evidence authority is present, else sort by `score` descending. Note: KG nodes have no `score` field, so the fallback sort is meaningless across legs. There is NO RRF, NO score normalization, NO BM25, NO reranker.
- Every result carries the evidence envelope: `{canonical_hash, namespace, confidence, evidence:[eventIds], verified, source}`. This is the trace-on-every-result law, and it is the strongest part of the design.
- `qdrant_adapter.js` (76 lines): thin REST, `search(collection, vector, limit)` with NO filter parameter and no sparse support. Deliberately dependency-free ("No npm dependency").

### 2c. CRX audit findings on the memory paths (from `crx-audit/02-memory-map.md`)

- Path 2 (vector memory): LIVE WRITE, DEGRADED INDEX, UNCONSUMED. Retrieve = HybridSearch semantic leg. FILTER WEAK: namespace dropped post-retrieval in JS; Qdrant adapter has no server-side filter.
- Path 3 (KG memory): LIVE WRITE, STARVED PROMOTION, UNCONSUMED. Retrieve = HybridSearch KG leg (text search, candidate+approved).
- Path 4 (conversation memory): PHANTOM, never constructed.
- Path 5 (worker episodic memory): its own duplicate implementation, inject broken.
- The harvest-ledger's E-06 entry already recommends adopting "namespace-required + bounds + evidence-verified primitives" for memory reads, narrowly, without importing a full compiler.

Net: our retrieval exists, is evidence-enveloped, but is (a) naively fused, (b) missing an exact-term leg, (c) filtering privacy boundaries client-side after over-fetch, and (d) largely UNCONSUMED. Ask FYD's binding is pre-generation and fail-closed, which is stronger than anything in the external RAG market.

## 3. CANDIDATE EVALUATIONS

### Candidate A: Reciprocal Rank Fusion (RRF) for leg fusion

PRODUCT NEED -> principled fusion of the semantic leg and the KG leg (and any future sparse leg) in HybridSearch, without comparing incomparable score scales.

FYD CURRENT IMPLEMENTATION -> Ask FYD has no multi-leg retrieval to fuse: one deterministic graph-context assembly plus keyword intent matching. RRF has no application there today.

PING EXISTING IMPLEMENTATION -> `hybrid_search.js` fuses by concatenating the two legs, then `evidence.rank(results)` or a fallback sort on `score`, which KG results do not even carry. Fusion is effectively order-of-arrival for cross-leg comparison.

CRX HARVESTABLE IMPLEMENTATION -> none; the CRX/gateway code is the thing being fixed, and its concat fusion is the weakness.

EXTERNAL IMPLEMENTATION -> Reciprocal Rank Fusion, Cormack/Clarke/Buettcher, SIGIR 2009: `score(d) = sum over rankers of 1/(k + rank(d))`, k=60, ranks 1-based, missing-from-list contributes 0. Rank-based, so BM25 scores and cosine similarities never need a shared scale. Training-free; Elastic's Search Labs replication reports roughly +20% nDCG@10 over BM25 alone on BEIR subsets. The de facto standard for hybrid fusion.

REACHED/UNREACHED -> REACHED (verified via the SIGIR citation chain in multiple independent sources; formula consistent across all of them).

DUPLICATION RISK -> near zero. RRF is ~15 lines. It replaces ~5 lines of concat logic. The evidence envelope, per-hit verification, and `evidence.rank()` all stay untouched.

SECURITY/TRUST BOUNDARY -> RRF is trust-neutral provided two invariants hold: (1) fusion operates on results that already carry their evidence envelopes; it must never strip `canonical_hash`/`evidence`/`verified`/`namespace`; (2) the namespace privacy filter must run before or during fusion, never be bypassed by it. Safe placement: filter -> verify -> RRF fuse -> evidence.rank. Fusing unverified candidates is acceptable only if verification still gates what surfaces.

SMALLEST DELTA -> add a ~15-line `rrfFuse(lists, k=60)` pure function next to HybridSearch; feed it the semantic list and the KG list (keyed by result id, dedup across legs); keep everything else. It becomes load-bearing only once a real second scored leg exists (today the KG leg is unscored, which RRF handles natively since it uses ranks only).

VERDICT -> ADAPT. Port the formula into our code; take no dependency. Do not write a client-side weighted score blend (min-max normalization + alpha): it needs per-corpus calibration and the scales are incomparable anyway.

### Candidate B: Qdrant native hybrid (sparse vectors + Query API prefetch/fusion + server-side filters)

PRODUCT NEED -> two things: (1) an exact-term retrieval leg (BM25), because dense embeddings systematically miss literal tokens (proper nouns, service names, SKUs); (2) moving the namespace privacy filter server-side, fixing the CRX audit's WEAK-filter finding.

FYD CURRENT IMPLEMENTATION -> no vector retrieval; keyword intent matching is regex over the assembled graph, not an index.

PING EXISTING IMPLEMENTATION -> `QdrantAdapter.search` sends `{vector, limit, with_payload: true}` with no filter and no sparse support. `HybridSearch` oversamples 3x and drops cross-namespace hits in JS after fetching them.

CRX HARVESTABLE IMPLEMENTATION -> the audit's Path-2 finding IS the harvest: "FILTER: WEAK, namespace dropped POST-retrieval in JS; Qdrant adapter has no server-side filter." The fix belongs in the adapter, not in a new system.

EXTERNAL IMPLEMENTATION -> Qdrant Query API (v1.10+): `prefetch` branches (each with its own `using` vector, `limit`, and `filter`) fused server-side by `{"fusion": "rrf"}` or `"dbsf"`; sparse vectors with the `idf` modifier so the server computes IDF and does BM25-style scoring at query time with no client-side IDF bookkeeping; query-level filters propagate to all prefetches. Verified against Qdrant's own 1.10.x release notes and qdrant-labs workshop docs. (Server-side BM25 text inference, `model="qdrant/bm25"`, is reported for newer server versions; verify against our deployed ping-qdrant version before relying on it.)

REACHED/UNREACHED -> REACHED.

DUPLICATION RISK -> low. Extends the 76-line adapter with an optional `filter` passthrough and a prefetch/fusion query shape. Keeps the deliberate no-npm-dependency discipline (plain REST/JSON).

SECURITY/TRUST BOUNDARY -> this is a genuine privacy-boundary fix, not just quality. Today cross-namespace candidates are fetched into gateway memory and then dropped; server-side filtering means they never leave Qdrant. Tenant isolation should be enforced by the store, not by post-hoc JS filtering. No new trust assumptions: the evidence envelope and per-hit verification stay.

SMALLEST DELTA -> (1) add optional `filter` to `QdrantAdapter.search` and pass it through to the request body; (2) add a named sparse vector (`bm25`, idf modifier) at collection creation; (3) index a sparse term vector per point at write time (pure-TS BM25 encoder is ~80 lines, or server-side inference if our Qdrant version supports it); (4) change `HybridSearch` to issue one prefetch query (dense + sparse, namespace filter on both) with `fusion: rrf`, then keep verify + evidence.rank. No new authority, no new store.

VERDICT -> ADAPT. Port the filter-through and the prefetch/fusion query shape into our thin adapter. Mark server-side BM25 text inference as LEARN until the deployed Qdrant version is confirmed. Never write our own client-side IDF bookkeeping; the server already does it.

### Candidate C: Cross-encoder rerankers (ms-marco-MiniLM, BGE rerankers)

PRODUCT NEED -> higher precision on small candidate sets for worker context assembly (the gateway memory consumer), and hypothetically for Ask FYD if it ever outgrows the bounded-graph design.

FYD CURRENT IMPLEMENTATION -> deterministic, model-free answer path with 152 tests asserting grading invariants. A neural reranker has no place in this path: the first broken step is extraction, not ranking, and introducing model inference would break the determinism contract the eval suite enforces. Adding it would be textbook RAG theater.

PING EXISTING IMPLEMENTATION -> no reranker; ordering is by `evidence.rank()` (verification-driven), which is the correct primary order for a trust-first system.

CRX HARVESTABLE IMPLEMENTATION -> none; memory paths 2 and 3 are UNCONSUMED, so there is no consumer whose precision a reranker could improve today.

EXTERNAL IMPLEMENTATION -> cross-encoders jointly encode (query, document) and output a relevance score; standard placement is bi-encoder/hybrid retrieve top-50..100, rerank, keep top-5..8. `cross-encoder/ms-marco-MiniLM-L-6-v2` (~22.7M params, ~22MB quantized ONNX, ~55-100ms for 40-50 pairs on CPU) and `Xenova/bge-reranker-base` are the commodity choices, runnable offline via transformers.js/ONNX with no Python. Counter-evidence that matters: the DAWN/atlas project implemented a production-quality cross-encoder reranker and then DROPPED it after measuring no net benefit on their conversational-memory workload at ~10x latency.

REACHED/UNREACHED -> REACHED.

DUPLICATION RISK -> high in architectural cost, low in code. It introduces model serving (weights, runtime, cache) into a retrieval path that currently has zero model dependencies. That cost is only payable with measured lift on a real consumer.

SECURITY/TRUST BOUNDARY -> placement is everything. A reranker must NEVER run before evidence binding: reordering or, worse, threshold-dropping candidates before verification lets a relevance model override the trust model. The only acceptable placement is AFTER the verification gate, reordering only verified, envelope-carrying candidates, and it must never suppress a verified candidate below an unverified one. Verification gates; reranking only reorders the admitted set. Note the tension: `evidence.rank()` orders by trust, a cross-encoder by relevance; the contract must state trust outranks relevance.

SMALLEST DELTA -> none justified now. The smallest honest delta is a spike: wire a quantized MiniLM reranker behind a flag on the gateway's `/knowledge/search` path, measure precision@k on logged worker queries with the evidence envelope intact, keep or drop on the numbers. That spike is not approved work; it is a future experiment design.

VERDICT -> LEARN. Study the placement contract (verify-then-rerank, trust outranks relevance). Do not add a reranker until a consumer exists and an eval shows lift. Reranking before evidence binding is a REJECT no matter the benchmark.

### Candidate D: Graph-based context expansion (GraphRAG / LightRAG style multi-hop retrieval)

PRODUCT NEED -> gathering multi-hop answer context from the knowledge graph instead of single-shot text search.

FYD CURRENT IMPLEMENTATION -> bounded 1-hop graph walk (8 related objects, 20 relationships) with per-question schema targeting, over per-tenant micro-graphs (fixtures show 0-9 objects). It already does entity-anchored fan-out; the bound is the feature.

PING EXISTING IMPLEMENTATION -> the KG leg is `KnowledgeGraph.queryNodes()` single-shot text search over approved/candidate nodes. No traversal, no multi-hop.

CRX HARVESTABLE IMPLEMENTATION -> the audit's Path-3 finding (LIVE WRITE, STARVED PROMOTION, UNCONSUMED): graph content exists but nothing promotes or consumes it. The harvest is fixing promotion/consumption of the existing graph, not importing a new one.

EXTERNAL IMPLEMENTATION -> Microsoft GraphRAG (2024): LLM entity/relationship extraction over the corpus, Leiden hierarchical community detection, an LLM summary per community, query-time local search (entity neighborhood) or global search (map-reduce over community summaries, reported ~610k tokens and 10-200 LLM calls per global query). Index cost $20-50 per 1M tokens; updates generally need rebuilds; independent benchmarks report it OFTEN UNDERPERFORMS vanilla RAG on simple factoid lookups. LightRAG: same extraction idea, skips Leiden/summaries, dual-level retrieval (entity-anchored + keyword-anchored), supports incremental inserts, far cheaper per query.

REACHED/UNREACHED -> REACHED (verified via the GraphRAG paper trail, LightRAG paper, and multiple independent cost/quality reports).

DUPLICATION RISK -> severe. GraphRAG's pipeline (its own entity extractor, its own graph build, its own community structure) would duplicate PING's KnowledgeGraph authority and the extraction pipeline that feeds it. Running Leiden community detection over a 9-object tenant graph is absurd; our corpus shape (per-tenant micro-graphs, factoid visitor questions) is exactly the workload where GraphRAG underperforms plain retrieval.

SECURITY/TRUST BOUNDARY -> GraphRAG's community summaries are LLM-generated derived truth stored as if it were source truth; without strict provenance on every summary sentence, this is precisely the "authority is prose" failure class PING exists to eliminate. Our envelope law (every result traces to a `ping_events` row) is incompatible with opaque community summaries unless each summary carries claim-level provenance, which the stock pipeline does not.

SMALLEST DELTA -> formalize what we already do: keep the bounded walk, consider a bounded 2-hop expansion with the same object/relationship caps, and fix the starved KG promotion (make HybridSearch actually consume approved nodes; LightRAG's incremental-insert discipline is the idea worth porting to the promotion path).

VERDICT -> REJECT GraphRAG-as-a-system (cost, corpus mismatch, authority duplication, factoid underperformance, provenance-hostile summaries). LEARN its citation discipline (every claim maps to a chunk+entity, which our envelope law already requires). ADAPT the incremental-promotion idea for the starved Path-3 KG leg.

### Candidate E: Citation-faithfulness techniques (ALCE metrics, post-generation claim verification)

PRODUCT NEED -> proving which evidence supports which claim, i.e., the anti-RAG-theater requirement itself.

FYD CURRENT IMPLEMENTATION -> the strongest internal position in this sweep: claims are graded BEFORE rendering (SUPPORTED/DERIVED/INFERRED/UNKNOWN), the module throws rather than render an uncited SUPPORTED claim, `[n]` markers resolve to evidenceRefs, and 152 tests plus hostile fixtures assert the invariants. This is pre-generation binding, strictly stronger than post-hoc citation.

PING EXISTING IMPLEMENTATION -> the retrieval side of the same contract: every HybridSearch result carries `{canonical_hash, namespace, confidence, evidence:[eventIds], verified, source}`, tracing to a `ping_events` row.

CRX HARVESTABLE IMPLEMENTATION -> none needed; the contract already exists on both sides of the seam.

EXTERNAL IMPLEMENTATION -> ALCE (Gao et al. 2023): the first automatic benchmark for cited generation, with citation precision/recall judged by NLI models (85.1% recall / 77.6% precision agreement with humans); the post-generation paradigm (Schreieder et al. 2025): generate, decompose into atomic claims a la FActScore, retrieve evidence per claim, insert citations. Commercial systems built this way still lack complete citation support ~50% of the time on ELI5.

REACHED/UNREACHED -> REACHED.

DUPLICATION RISK -> adopting post-hoc NLI citation checking as a runtime stage would not duplicate but DOWNGRADE our architecture: a 77.6%-precision probabilistic NLI judge cannot replace a deterministic throw-on-unsupported invariant. It would be weaker binding wearing the clothes of stronger binding.

SECURITY/TRUST BOUNDARY -> a probabilistic citation judge must never be allowed to upgrade an INFERRED or UNKNOWN claim, and must never be presented as verification. Our grades are deterministic pre-generation facts; NLI scores are probabilistic post-generation opinions. Mixing them corrupts the grade semantics the whole product rests on.

SMALLEST DELTA -> zero at runtime. The only legitimate use is offline: ALCE-style citation precision/recall as additional metrics in the ask eval battery, alongside the existing invariant tests, for the day an LLM ever enters the composer path.

VERDICT -> REJECT as a runtime mechanism (probabilistic, strictly weaker than our pre-generation grade-and-throw). LEARN the metric shapes for future offline eval. Our pre-generation binding is the thing other systems should harvest from us, not the reverse.

## 4. WHAT CODE CAN WE DELETE OR NEVER WRITE

(Because this ecosystem, or the commodity market, already solved the commodity part.)

1. NEVER WRITE a client-side weighted score blender (min-max normalization + alpha) for leg fusion. RRF (Candidate A, ~15 lines, parameter-free, k=60) dominates it and needs no per-corpus calibration; score scales were never comparable.
2. NEVER WRITE client-side IDF bookkeeping or a from-scratch BM25 index. Qdrant computes IDF server-side with the sparse-vector `idf` modifier (Candidate B); ingest stores term vectors, the server does the rest.
3. NEVER WRITE a second knowledge-graph builder/extractor (GraphRAG-style). It would duplicate the KnowledgeGraph authority and run Leiden over micro-graphs (Candidate D, REJECT).
4. NEVER WRITE a runtime post-hoc citation NLI checker. Our pre-generation grade-and-throw is deterministically stronger than 77.6%-precision probabilistic judging (Candidate E, REJECT).
5. NEVER WRITE a neural reranker service until a consumer exists. Gateway memory retrieval is UNCONSUMED (CRX audit Paths 2/3); reranking unconsumed retrieval is theater, and the DAWN precedent shows the lift can be zero at 10x latency (Candidate C, LEARN).
6. DELETE (replace) the client-side post-retrieval namespace filter in `hybrid_search.js`. Move the namespace condition into a server-side Qdrant filter on the prefetch (Candidate B). This closes the audit's WEAK-filter finding and is a privacy-boundary fix, not a quality tweak.
7. DELETE (replace) the naive concat-then-`evidence.rank` fusion with RRF over the legs, keeping per-result evidence envelopes and the verification gate (Candidate A). Note the KG leg's `verified: true`-by-assertion should become real verification or be labeled as asserted, not verified, when this is touched.
8. NEVER WRITE a new memory system (Mem0/Zep-style LLM-extracted memory). The CRX audit's actual findings are broken write/injection/consumption paths (Path 4 PHANTOM, Path 5 duplicate impl with broken inject, Paths 2/3 UNCONSUMED). A new memory authority does not fix a missing consumer; fixing the existing paths does. No new store without proven representational failure (standing writer law).

The through-line: our stack's differentiator is pre-generation, fail-closed evidence binding (graded claims, per-result envelopes tracing to `ping_events`). Every external primitive was judged against whether it strengthens or weakens that binding. Nothing evaluated here beats it; two (RRF, server-side Qdrant hybrid+filters) strengthen the machinery around it.

## 5. RANKED SHORTLIST

1. **Reciprocal Rank Fusion (RRF)** -- ADAPT. Fifteen lines, parameter-free, rank-based fusion replaces the naive concat in `hybrid_search.js`; keeps every result's evidence envelope and the verification gate intact.
2. **Qdrant server-side filters + sparse/hybrid Query API (prefetch + RRF/DBSF fusion)** -- ADAPT. Moves the namespace privacy boundary into the store (fixes the audit's WEAK-filter finding) and adds the missing exact-term leg with no client-side IDF bookkeeping; keep the thin no-dependency adapter.
3. **Cross-encoder rerankers (MiniLM/BGE)** -- LEARN. Only valid after the verification gate (trust outranks relevance); no consumer exists yet and gateway retrieval is UNCONSUMED, so adding one now is RAG theater.
4. **GraphRAG-style graph expansion** -- REJECT as a system (cost, factoid underperformance, KnowledgeGraph authority duplication, provenance-hostile summaries); LEARN its claim-to-entity citation discipline; ADAPT incremental promotion for the starved KG path.
5. **Post-hoc NLI citation checking (ALCE-style)** -- REJECT at runtime (probabilistic and strictly weaker than our deterministic pre-generation grade-and-throw); LEARN the precision/recall metric shapes for offline eval only.

## 6. OPEN QUESTIONS FOR THE PARENT

- The deployed `ping-qdrant` server version was not checked; server-side BM25 text inference (`qdrant/bm25`) and the exact Query API surface should be confirmed against it before Candidate B's sparse leg is built.
- `EmbeddingService` (model, dimension discipline beyond the 768-d comment, who calls upsert) was not traced; the "DEGRADED INDEX" part of the audit's Path-2 finding deserves a writer lane, not a reader.
- Whether Ask FYD will ever need vector retrieval at all is downstream of the extraction fix (service facts as Service objects); retrieval is not the broken step there.
