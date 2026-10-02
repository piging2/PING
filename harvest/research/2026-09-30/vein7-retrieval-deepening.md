# Vein 7, 2026-09-30: Ask FYD retrieval deepening (hybrid retrieval / reranking / citation binding)

Run: fyd-ping-daily-harvest, manual retry, flat swarm. Researcher only, no writes, no subagents.
Pinned PING HEAD: ed3ff708b87df904068d785c6dee35646daf1b15 on branch fyd/builder-harvest-trackc-2026-09-28 in /home/nolan/projects/ping (verified live on the Pig, read-only probes).
Overlap check: ~/workspace/harvest/candidates.json already holds Qdrant (BACKLOG), BM25S (BACKLOG), LightRAG (BACKLOG). No GraphRAG or rank_bm25 entries. vein3-q1-hunt.md (today) covers entity-resolution, not retrieval scoring; no overlap with this paper.

## Current PING implementation (traced at the pinned HEAD, all read-only)

Retrieval for Ask FYD is a deterministic graph walk plus branch logic, no text scoring, no second signal:

1. `src/fyd/object/related.ts` (137 lines): `selectRelatedCircles(graph, ownerObjectId, {limit})` walks first-class relationships in both directions from the owner object (BFS over active edges), one candidate per reachable object. Skips inactive edges, the owner itself, unknown/non-public objects. Ranking: predicate priority (located_at=0, provides=1, works_for=2, links_to=3; unknown predicates rank 99), then object id LEXICOGRAPHIC tiebreak (related.ts:41-48, 128-132). Output order never depends on dump order; optional limit truncates (related.ts:133-135).
2. `src/fyd/ask/visitor-answer.ts:632-660` (`oneHopRelatedObjects`): restricts to directly incident active edges, keeps the selector's predicate-priority order, public objects only.
3. `src/lib/ping/ask-composer.ts:34-42` (`ASK_LIMITS`): maxRelated=8, maxRelationships=20, maxFieldChars=500, maxRelatedInAnswer=5. Related objects are sliced to these counts before composition (ask-composer.ts:190) and in the answer (ask-composer.ts:701).
4. Citation binding and refusal (deterministic, no LLM): every factual sentence cites evidence as [n]; claims are classified per claim with `AskClaimClassification` = {claim, classification, evidenceRefIds} (`src/lib/ping/types.ts:269-280`); citations are rendered by `citationFor` in visitor-answer.ts:620-628. Unsupported questions get a fail-closed refusal: "I cannot answer that: nothing in the site record covers it, and I will not guess." (ask-composer.ts:732). Owner corrections are applied at composition via `ownerCorrectionForObject` (ask-composer.ts:18, 1458), under the owner overlay, not inside retrieval.

## Product failures along the arrow ASK FYD -> EVIDENCE -> OWNER CORRECTION

- F1. No question-text relevance signal. Retrieval keys off the target object id and predicate rank, never the question tokens. The maxRelated=8 cap truncates with an arbitrary lexicographic tiebreak, so a well-connected relevant object can be cut while a lexically earlier irrelevant one survives. (Defect not yet proven on a real question; the BM25S record already gates on exactly this.)
- F2. Single retrieval signal only. If a second signal (e.g. text relevance) were ever added, PING has no fusion mechanism and no precedent for combining two rankings deterministically.
- F3. Context packing is count-based (8/20/500), not token-budget-based. No packing discipline when evidence overflows the budget; truncation is slice-based.
- F4. Citation binding is PING's strong dimension: per-claim evidenceRefIds, fail-closed refusal, deterministic answers. No donor in this pass improves it.

---

## Candidate 1: rank_bm25 (dorianbrown) - reference BM25 implementation

AREA: sparse relevance scoring for question-text -> object matching (addresses F1).

CURRENT PING IMPLEMENTATION: none. Retrieval ignores question tokens entirely; ordering is predicate priority + id lexicographic tiebreak (related.ts:41-48, 128-132), truncated to maxRelated=8 (ask-composer.ts:34-42).

EXACT REPO + SHA: dorianbrown/rank_bm25 at 47aa3ddf8dc1ebeb7ef4e65f2b4536af44594099 (full 40-char, verified live via GitHub commits API as master HEAD, commit date 2024-10-08; clone verified at same SHA in ~/workspace/harvest/research/2026-09-30/rank_bm25/).

LICENSE: Apache-2.0, LICENSE file verified in the clone. No file-level exceptions found in the single source file rank_bm25.py. Apache-2.0 permits TS-porting the math; patent grant included; no copyleft. Attribution on redistribution of the code is required; porting formulas to TypeScript keeps that obligation to a notice-level minimum.

MECHANISM WORTH HARVESTING: the BM25Okapi scoring formula with the ATIRE idf epsilon floor, plus `get_batch_scores` as the rescore-a-subset primitive:
- `_initialize`: per-doc term frequencies, doc lengths, document frequency table nd.
- `_calc_idf` (Okapi): idf = log(N - df + 0.5) - log(df + 0.5); negative idfs (terms in more than half the docs) get floored to epsilon * average_idf with epsilon=0.25. This is the ATIRE variant detail most casual ports miss.
- `get_scores`: score(q,d) = sum over q of idf(q) * tf*(k1+1) / (tf + k1*(1 - b + b*dl/avgdl)), k1=1.5, b=0.75.
- BM25L variant: idf = log(N+1) - log(df+0.5); ctd = tf / (1 - b + b*dl/avgdl); term score = idf * (k1+1) * (ctd+delta) / (k1+ctd+delta), delta=0.5. Better length-normalization behavior for long docs.
- BM25Plus variant: idf = log(N+1) - log(df); term score = idf * (delta + tf*(k1+1) / (k1*(1-b+b*dl/avgdl) + tf)), delta=1.0. Avoids over-penalizing long docs and guarantees a positive lower bound.
- `get_batch_scores(query, doc_ids)`: scores only a subset, the exact shape of a rescore stage (score the 1-hop neighborhood, not the whole corpus).

WHY IT IS BETTER: it is a reference-grade implementation of the Trotman et al. variants with the epsilon-floor and the three Okapi/L/Plus variants side by side in 250 lines, so it doubles as a correctness oracle. Against the BM25S record (already BACKLOG): BM25S is the speed-optimized sparse port (SciPy); rank_bm25 is the readability-optimized reference. The harvest idea is the same (port ~40 lines of BM25 math to TS, no dependency); rank_bm25 is the better TEST VECTOR source because each variant's formula is written out in full.

WHAT NOT TO COPY: the Python/numpy/multiprocessing machinery; `get_top_n`'s argsort pattern is not needed (TS sort exists); do not depend on the package.

PING AUTHORITY IT MUST REMAIN UNDER: FYD ask retrieval. A scorer would be a pure function of (question tokens, 1-hop candidate objects) used only to ORDER candidates inside the existing maxRelated=8 cap, never to admit non-public objects or bypass the visibility filter. No new authority.

MINIMAL PATCH: if F1 is ever proven: (a) tokenize question + candidate object text fields at the existing ask seams; (b) add a ~40-line BM25Okapi scorer (TS port of the formula, constants k1=1.5, b=0.75, epsilon=0.25); (c) apply it as a secondary sort key inside selectRelatedCircles AFTER predicate priority, replacing only the id-lexicographic tiebreak, or as an ordering pass in oneHopRelatedObjects. Pure function, deterministic.

EXPECTED DELETION-SIMPLIFICATION: none on adoption; the patch is additive (tiebreak replacement). If the scorer later subsumes topicWords keyword branches, those branches could shrink; CURRENT/ADDED/REMOVED/NET LOC: UNKNOWN until a defect is proven and a diff exists. Donor LOC for the harvested formula: ~15 lines (get_scores) + ~10 (idf), total donor ~250 lines, mechanism ~25 lines.

TEST THAT PROVES IMPROVEMENT: new test in src/fyd/object/__tests__/related.test.ts (or visitor-answer tests): a fixture question whose relevant object sits beyond the maxRelated=8 cut under the current lexicographic tiebreak; assert the BM25-ordered candidate list keeps the relevant object and still excludes non-public ones; assert determinism (same inputs, same order across runs) and that the epsilon floor keeps common terms from zeroing scores.

BENCHMARK IF RELEVANT: correctness cross-check: same fixed corpus and queries, TS port scores vs rank_bm25.py outputs, exact match to 1e-9. Perf: scoring an 8-object neighborhood is sub-millisecond; irrelevant.

SECURITY CONSEQUENCES: the scorer itself takes no untrusted input beyond the question string, which ask already handles. The tokenizer is the only new surface: naive regex tokenizers can be ReDoS'd or mangle Unicode; use a fixed, bounded, test-covered tokenizer and treat question text as untrusted. No network, no storage, no secrets.

MIGRATION-RISK: low. Additive ordering change only, gated behind the existing caps; rollback = revert the tiebreak.

DECISION: BACKLOG, and register as a DEDUP ALIAS under the existing BM25S mechanism (same harvest idea, different reference). rank_bm25 adds value as the formula oracle for test vectors; it is not a second mechanism. The 12-gate is not run: F1 is still an unproven hypothesis (no real question observed dropping the relevant object), matching the BM25S record's existing gate.

12-gate status: (1) concrete failure: UNKNOWN; (2) live product path: ask->answer, known; (3) owning mechanism: selectRelatedCircles, known; (4) external mechanism: BM25Okapi math, known; (5) proof better: UNPROVEN on real PING data; (6)-(12): cannot be answered until (5) lands. No writer.

---

## Candidate 2: GraphRAG (microsoft) - graph expansion over entities

AREA: graph-based context expansion for retrieval: query -> entities -> 1-hop neighbors -> ranked relationship/entity tables -> token-budgeted context (addresses F1 and F3).

CURRENT PING IMPLEMENTATION: predicate-priority walk with no entity ranking beyond predicate rank and id tiebreak (related.ts:41-48, 128-132); count-based caps (ask-composer.ts:34-42); no notion of entity degree or token budget.

EXACT REPO + SHA: microsoft/graphrag at 769542fbf1d8e5b4c6a8677fefc34621c87894c5 (full 40-char, verified live via GitHub commits API as main HEAD, commit date 2026-09-23; clone verified at same SHA). Note the repo layout changed since the classic docs: packages/ monorepo (graphrag, graphrag-cache, graphrag-chunking, graphrag-common, graphrag-input, graphrag-llm, graphrag-storage, graphrag-vectors).

LICENSE: MIT, LICENSE file verified ("MIT License, Copyright (c) Microsoft Corporation"). Source files carry "Copyright (c) 2024 Microsoft Corporation. Licensed under the MIT License" headers. No copyleft; patent grant not explicit (standard MIT). TS-porting the ranking idea carries no license burden.

MECHANISM WORTH HARVESTING (traced hot paths in packages/graphrag/graphrag/query/):
1. `context_builder/entity_extraction.py::map_query_to_entities`: embed the query, similarity_search over entity-description embeddings with oversample k*2 (k=10, oversample_scaler=2), drop excluded, re-add explicitly included. Empty query falls back to top-k by entity rank. IDEA ONLY: PING has no embeddings and determinism law forbids the LLM path; the harvestable part is the empty-query fallback pattern (rank-based top-k) and the oversample-then-filter discipline.
2. `context_builder/entity_extraction.py::find_nearest_neighbors_by_entity_rank`: 1-hop neighbors sorted by entity rank (rank = number of relationships). Directly comparable to selectRelatedCircles: same BFS shape, but the ranking key is DEGREE, not predicate+lexicographic.
3. `context_builder/local_context.py::build_entity_context / get_candidate_context / build_relationship_context`: candidate context selected and sorted by rank; relationships sorted by (links, rank) for out-network edges, or by configurable ranking_attribute ("rank" or "weight"); rank rendered as a "number of relationships" column in the entity table. The portable idea: relationship-degree as the honest relevance proxy for graph neighborhoods.
4. `structured_search/local_search/mixed_context.py::LocalSearchMixedContext.build_context`: token-budget packing with community_prop=0.25 / text_unit_prop=0.5 splits and max_context_tokens=8000 truncation. The portable idea: budget-based packing with explicit per-section proportions instead of count-based caps; PING's ASK_LIMITS are count-based and could express a char/token budget with per-section shares.

WHY IT IS BETTER: degree-rank is a semantic signal (well-connected objects are more likely salient answers) where PING's id-lexicographic tiebreak is arbitrary; and budget-based packing degrades gracefully under evidence overflow where slice-based truncation drops whole sections blindly. Both are small, deterministic, dependency-free ideas.

WHAT NOT TO COPY: the entire indexing pipeline (entity extraction via LLM, community detection, community report generation), the embedding-based query mapping (nondeterministic under PING's law, adds network + model dependency), DRIFT search, global search map-reduce, and the LLM prompt machinery. Program law already rejects importing any RAG framework; GraphRAG stays a pattern donor.

PING AUTHORITY IT MUST REMAIN UNDER: FYD ask retrieval (degree-rank computed from the existing ObjectGraph relationships, which PING already owns) and the existing ask composition limits. No new authority; no new storage.

MINIMAL PATCH: if F1 is proven: (a) compute per-object degree (count of active incident edges) inside selectRelatedCircles; (b) change the final sort tiebreak from id-lexicographic to degree-descending then id-lexicographic (one comparator change, ~10 lines). Separately, if F3 matters: express ASK_LIMITS as a total char budget with per-section proportions (related / relationships / fields) instead of fixed counts.

EXPECTED DELETION-SIMPLIFICATION: the id-lexicographic tiebreak is replaced, not removed (kept as the final deterministic tiebreak). CURRENT/ADDED/REMOVED/NET LOC: estimate only: related.ts is 137 lines; patch ~10 lines changed, 0 removed net. Token-budget packing: ~30-50 lines to reshape limit logic. Mark as estimates, not promises.

TEST THAT PROVES IMPROVEMENT: fixture with two objects tied on predicate rank where the more-connected one answers the question: assert degree-rank keeps it within the maxRelated=8 cut where lexicographic dropped it; assert determinism and that the id tiebreak still breaks degree ties; assert non-public objects still excluded. For packing: fixture where evidence overflows the budget; assert the refusal path and per-section budgets behave deterministically.

BENCHMARK IF RELEVANT: degree computation is O(edges) over the 1-hop neighborhood, negligible; no perf benchmark needed. Correctness benchmark: none beyond the fixture tests.

SECURITY CONSEQUENCES: degree-rank uses only the existing public graph; no new input surface. The embedding-mapping idea is explicitly NOT harvested, so no model/network supply-chain risk is introduced. Authorization unchanged (visibility filter untouched).

MIGRATION-RISK: low. Comparator change only; existing related.test.ts expectations would need re-baselining for the two tiebreak-order tests (related.test.ts:71-78, 87-88); all other behavior identical.

DECISION: BACKLOG, gated on defect proof (a real question where the lexicographic tiebreak drops a relevant object). Two harvestable ideas, no writer dispatched. The 12-gate fails at (1) concrete failure: UNKNOWN (no observed F1 instance) and (5) proof of better: UNPROVEN on PING data.

---

## Candidate 3: Qdrant - hybrid scoring / fusion mechanics

AREA: combining two or more rank signals into one deterministic ordering (addresses F2).

CURRENT PING IMPLEMENTATION: none. There is exactly one retrieval signal (predicate-priority graph walk); no Qdrant server, no vectors, no fusion anywhere in PING. Overlap: candidates.json already holds Qdrant at the SAME pinned SHA with the same mechanism and a BACKLOG decision (verified 2026-09-26). This pass re-verified the pin live and traced the hot paths deeper.

EXACT REPO + SHA: qdrant/qdrant at 6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de (full 40-char, verified live via GitHub commits API as master HEAD, commit date 2026-09-03; clone verified at same SHA; blob-none filter used, all cited files read in full).

LICENSE: Apache-2.0, GitHub license endpoint spdx_id Apache-2.0 (verified 2026-09-26 by a prior pass, re-verified today). Patent grant included; no copyleft. Math-porting is license-clean; no dependency or service is proposed.

MECHANISM WORTH HARVESTING (traced hot paths, deeper than the prior pass):
1. `lib/segment/src/common/reciprocal_rank_fusion.rs::rrf_scoring`: RRF over rank lists. position_score(position, k, weight) = 1.0 / ((position+1)/weight + k - 1.0), DEFAULT_RRF_K = 2 (note: smaller than the classic 60; Qdrant chose k=2 to keep the top ranks sharply differentiated). Weights compress/stretch positions: weight=3 means position 2 contributes like position 0 at weight 1 ("for each 3 results of the first prefetch, have one of the second"). Scores accumulate per point id across sources; input scores are IRRELEVANT, only order matters; output sorted descending. Properties proven by the in-repo tests: zero-weight source contributes nothing; weight-length mismatch is a validation error (fail-closed); ties are not broken (documented, honest).
2. `lib/segment/src/common/score_fusion.rs::score_fusion` + `ScoreFusion::dbsf()`: DBSF = normalize each list (MinMax or 3rd-std-dev distribution normalization), multiply by per-list weights, SUM across lists, dedupe by point id, order LargeBetter. The complement to RRF: DBSF uses scores (after normalization), RRF uses ranks only.
3. `lib/collection/src/collection/query.rs:356-389` (prefetch + fusion architecture): multiple prefetch queries (dense, sparse/BM25 via lib/bm25, multi-vector) run independently per shard; intermediate results are collected; the collection level then applies FusionInternal::Rrf{k, weights} or FusionInternal::Dbsf. The architecture lesson: score each signal independently with its own retrieval, fuse late, never blend scores mid-flight.

WHY IT IS BETTER: PING currently has one signal, so fusion is premature; but if F1's second signal (BM25 text scores) is ever added, Qdrant's RRF is the proven deterministic late-fusion math (~60 lines, order-only, no score normalization pitfalls) and DBSF is the score-based alternative when both signals produce calibrated scores. The prefetch-then-fuse discipline maps directly onto PING: run the graph walk and the text scorer independently over the same candidate set, fuse, then apply the existing maxRelated=8 cap.

WHAT NOT TO COPY: the Qdrant server, the vector index, the shard machinery, the Rust codebase as a dependency. "Never depend on the server" stands from the prior record. Do not import fusion prematurely: with one signal, RRF is dead code.

PING AUTHORITY IT MUST REMAIN UNDER: FYD ask retrieval. Fusion would be a pure function over two rank lists produced under existing authorities. No new authority; no new service.

MINIMAL PATCH: none today. If a second signal ever exists: ~20-line RRF port (k, weights, accumulate-per-id, sort desc) applied to the two rank lists before the maxRelated=8 cut. Estimate only.

EXPECTED DELETION-SIMPLIFICATION: none; additive. CURRENT/DONOR/ADDED/REMOVED/NET LOC: UNKNOWN until a second signal exists. Donor LOC: reciprocal_rank_fusion.rs ~75 lines code (rest tests); score_fusion.rs ~90 lines; mechanism ~20-60 lines ported.

TEST THAT PROVES IMPROVEMENT: gated on the second signal existing: fixture with two rank lists that disagree; assert RRF output matches the formula (1/((pos+1)/w + k - 1)) accumulated per id, sorted desc; assert zero-weight source contributes nothing; assert determinism; assert the visibility filter still applies after fusion (fused list filtered to public objects).

BENCHMARK IF RELEVANT: none; fusion over <= 8-20 candidates is trivial.

SECURITY CONSEQUENCES: RRF consumes only rankings produced under PING's authorities; weights are config constants, validated (length must match source count, fail-closed). No new input surface, no network, no secrets.

MIGRATION-RISK: low when the time comes (pure function, additive). Today: none, no patch.

DECISION: BACKLOG, unchanged from the prior record, now with deeper hot-path evidence (file:line citations above). Re-verified pin and license today. No writer: the 12-gate fails at (1): there is no second signal and no concrete failure to fuse over.

---

## Citation binding dimension (ASK FYD -> EVIDENCE): PING WINS

None of the three donors has a per-claim citation mechanism comparable to PING's:
- rank_bm25: no citations (a scorer).
- GraphRAG: data references are emitted into LLM prompts as tables; claims are not classified per-claim and there is no fail-closed refusal primitive (refusals are prompt text, not typed states).
- Qdrant: no citations (a ranker).
PING at ed3ff708: AskClaimClassification {claim, classification, evidenceRefIds} (types.ts:269-280), citationFor binding citations to [n] refs (visitor-answer.ts:620-628), deterministic refusal "I cannot answer that: nothing in the site record covers it, and I will not guess." (ask-composer.ts:732). Deterministic, typed, test-covered. DECISION: REJECT (PING WINS) for any citation-binding harvest from these donors, with the proof above.

## License discrepancy to reconcile (surfaced per program reporting law)

Program law (FYD-PING-HARVEST-PROGRAM-2026-09-25.md) records "LightRAG is GPL: patterns/reference ONLY". The candidates.json LightRAG record (verified 2026-09-26) and my live check today (GitHub license API spdx_id MIT + raw LICENSE reading "MIT License, Copyright (c) 2025 LightRAG Team") say MIT. These disagree. I changed nothing: program law stays binding (LightRAG remains patterns/reference only, no import proposed in this paper), but the harvest parent should reconcile whether the GPL note refers to a specific older pin, a misreading, or an upstream relicense. This is a license-fact question, not a finding of wrongdoing.

## Working state

Clones (disposable, licensing permits): ~/workspace/harvest/research/2026-09-30/rank_bm25/ (192K, Apache-2.0), graphrag/ (31M, MIT), qdrant/ (47M, Apache-2.0, blob-none filter). All read-only research copies; no PING repo writes made; Pig working tree untouched (all probes read-only); no subagents spawned; no browser tasks.

## Verdicts

- rank_bm25: BACKLOG as dedup alias under the BM25S record (same harvest idea; rank_bm25 is the formula oracle for test vectors). No writer: F1 unproven.
- GraphRAG: BACKLOG, two harvestable ideas (degree-rank tiebreak replacing id-lexicographic; token-budget packing vs count-based ASK_LIMITS). No writer: F1/F3 unproven.
- Qdrant: BACKLOG, unchanged; deeper evidence for RRF k=2 weighted positions + DBSF normalization + prefetch-then-fuse architecture, re-verified pin and license. No writer: no second signal exists.
- Citation binding: REJECT (PING WINS) against all three donors.
