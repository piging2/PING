# VEIN 7 — Ask FYD Retrieval Archaeology — 2026-09-26

RESEARCH ONLY. No writes to any PING/FYD repo, no branches, no commits, no pushes.
No writer authorized: no candidate passes all 12 gate questions.

Scope: CURRENT PING/FYD vs LightRAG vs GraphRAG vs Qdrant-hybrid-patterns vs BM25/BM25S
vs cross-encoder rerankers vs citation-aware RAG patterns, across the 12
correction-mandated dimensions.

Target law: QUESTION → AUTHORIZED RETRIEVAL → OBJECT/EVIDENCE CONTEXT →
ANSWER → EVIDENCE → REFUSAL WHEN UNSUPPORTED. MODEL DOES NOT RETRIEVE TRUTH.
MODEL CONSUMES COMPILED AUTHORIZED EVIDENCE.

## 1. Current PING/FYD retrieval surface (read-only audit)

Read on the Pig at `~/fyd-wave2-clean`, **detached HEAD `e48ef710`**
("FYD Wave 1 fixup: current product UI implementation + ask test alignment").
NOTE: yesterday's acquisition audit read branch `fyd/sprint-integration-2026-09-24`;
today's read is a detached HEAD, not that branch. `git log --since=2026-09-25`
on all ask paths returns **zero commits** — no retrieval changes since
yesterday's audit either way.

| File | LOC | Mechanism |
|---|---|---|
| src/app/api/fyd/ask/ask-pipeline.ts | 306 | Tenant from route path (server-side TenantContext, mismatch → 400), mode validation, authorized bundle read (getSiteBundle via governed reader, digest-verified), owner field-correction overlay, 3-class answer contract (supported/derived/unknown), fail-closed error mapping |
| src/fyd/ask/visitor-answer.ts | 490 | publicGraphOf (public-only projection), target resolution (ownerObjectId or objectId), related objects = 1-hop neighborhood via selectRelatedCircles, buildAskFydContext → composeAskFyd, citations from [n] markers, refusal when `partial && citations.length===0` |
| src/lib/ping/ask-composer.ts | 1000 | buildAskContext (ASK_LIMITS caps, boundedObject field truncation, evidenceRefs, provenance→epistemic classification), composeAnswer deterministic rule branches (profile/services/contact/location/reviews/provenance), topicWords grounding gate, noEvidenceAnswer refusal, cite([n]) binding, proposal drafting |
| src/fyd/object/related.ts | 137 | selectRelatedCircles: deterministic BFS both directions over active edges, predicate priority (located_at > provides > works_for > links_to), object-id tiebreak, public-only |
| src/fyd/ask/context-builder.ts | 41 | Ask context assembly + agent grants boundary + siteSpecDigest binding |
| src/fyd/ask/answer.ts | 81 | composeAskFyd dispatch (site-patch intents vs evidence composer) |
| src/fyd/ask/capabilities.ts | 72 | Agent grant boundary: FORBIDDEN_AGENT_EFFECTS fail-closed |
| src/fyd/ask/site-spec.ts | 60 | Digest-bound SiteSpecSummary provider seam |
| src/fyd/ask/envelope.ts | 100 | Ed25519 envelope sign/verify (proposal path) |
| **Total ask-surface LOC** | **~2,287** | |

What "retrieval" IS in current PING (verify before comparing against any
RAG framework):

1. **AUTHORIZED RETRIEVAL** = tenant-scoped graph read. No vector search, no
   Qdrant (zero hits for qdrant/Qdrant in src/fyd), no BM25, no keyword index,
   no rerank, **no LLM anywhere in the ask path** (the only llm/anthropic/openai
   hit in the ask surface is the comment "No LLM, no agent runtime, no new
   authority"). Retrieval is: load tenant bundle → project public graph →
   resolve target object → take 1-hop related objects (capped at
   ASK_LIMITS.maxRelated=8) + active relationships (capped at 20).
2. **OBJECT/EVIDENCE CONTEXT** = buildAskContext: bounded object projection
   (500-char field truncation), evidenceRefs (target object, relationships,
   related objects), epistemic classification chain (pipeline FactClass →
   claimKind → provenance: DIRECT_FACT / website_statement / owner_override /
   relationship_fact / DEMO_SYNTHETIC), source URLs from provenance refs,
   digest-bound SiteSpec summary.
3. **ANSWER** = composeAskFyd: deterministic rule branches over the bounded
   context. No generation. Branch routing is keyword-trigger based
   (hasWord/topicWords), which is the fragile edge of this design.
4. **EVIDENCE** = every factual sentence carries [n] markers bound to
   evidenceRefs; claimClassifications bind each claim to evidence ref ids
   with an epistemic class; buildCitations maps markers → visitor citations
   with source, basis, lastChecked, claimClass (supported/derived).
5. **REFUSAL WHEN UNSUPPORTED** = noEvidenceAnswer ("I do not have evidence
   for that in the current context, so I will not guess."), refusal =
   partial && no citations, answerClass unknown, unknowns[] listed.

## 2. The 12-dimension matrix

Verdict key: PING WINS (keep) / DONOR WINS, narrow (name only the mechanism,
gated) / PARITY / GAP (nobody has it) / PATTERN-ONLY (external).

| Dimension | CURRENT PING/FYD | LightRAG (MIT) | GraphRAG (MIT) | Qdrant hybrid (Apache-2.0) | BM25/rerankers/citation-RAG | Verdict |
|---|---|---|---|---|---|---|
| Authorization before retrieval | Tenant from route path server-side; governed reader; mode gating; mismatch refused | None — assumes pre-authorized corpus | None — same | None — deployment concern | None | **PING WINS** — keep |
| Object scope | Object-scoped ask (objectId inside tenant); target + neighborhood; field visibility | Text chunks + LLM-extracted entities, no typed objects | Same | Vectors, no objects | Chunks | **PING WINS** — keep |
| Evidence binding | Deterministic [n] sentence→evidence binding; per-claim epistemic classes; field-level refs | Reference lists on generated answers | Entity/relationship references | None | Prompt-based "cite sources" | **PING WINS** — keep |
| Hybrid retrieval | None — no lexical search at all | Vector + graph, keyword-decomposed | Vector + community | Dense+sparse fused via RRF/DBSF | BM25 lexical | **GAP** — narrow donor mechanism: BM25 scoring math as a deterministic question-relevance ranker (BACKLOG, gated) |
| Graph expansion | Deterministic BFS, predicate priority, first-class graph | LLM-extracted entity graph, keyword expansion | LLM-extracted, community-based | N/A | N/A | **PING WINS** — keep (expansion is question-agnostic, but that is a reranking problem, not expansion) |
| Reranking | None — predicate-priority + object-id order, question-agnostic | LLM re-processing | LLM map-reduce | RRF/DBSF fusion | Cross-encoders (flashrank/bge) | **GAP** — same narrow mechanism as hybrid: deterministic term-overlap rerank before the maxRelated=8 truncation. Cross-encoders REJECTED (model deps, nondeterminism) |
| Context compilation | Deterministic bounded context, ASK_LIMITS, digest-bound SiteSpec | LLM prompt packing, nondeterministic | LLM community summaries | N/A | LLM prompts | **PING WINS** — keep |
| Citations | Sentence-level citations w/ claim classes, source/basis/lastChecked | Generated reference lists | Generated | None | Prompt-based citation | **PING WINS** — keep; ALCE citation recall/precision definitions noted as future eval pattern |
| Unsupported-claim refusal | noEvidenceAnswer; refusal = partial && no citations; 3-class contract; unknowns[] | Generates anyway | Generates anyway | N/A | Generates anyway | **PING WINS** — keep |
| Hidden-object exclusion | publicGraphOf: public-only objects, active relationships both ends public, applyFieldVisibility conservative defaults | Nothing | Nothing | Nothing | Nothing | **PING WINS, with known PING defect**: publicGraphOf hardcodes `[]` owner decisions; composeObjectView bypasses applyFieldVisibility (flagged 2026-09-25, on HOLD until product proof closes). No donor mechanism exists; fix belongs to PING |
| Tenant isolation | Tenant from route path; loadBundle closure scoped to request tenant; cross-tenant lookup impossible by construction | Nothing | Nothing | Qdrant payload-filter tenancy is a deployment pattern | Nothing | **PING WINS** — keep |
| Determinism / evaluation | Pure functions, stable ordering, ~464-line ask test suite + graph-read-route tests | LLM at every stage | LLM at every stage | Deterministic math (RRF) | RAGAS/ALCE are LLM-judge evals | **PING WINS on determinism**; eval PATTERN-ONLY: ALCE citation recall/precision definitions could shape future invariant tests for citation completeness |

**Scorecard this pass:** PING wins 9 of 12 dimensions outright (authorization,
object scope, evidence binding, graph expansion, context compilation,
citations, refusal, hidden-object exclusion, tenant isolation), wins
determinism within dimension 12, and faces a genuine GAP in 2 dimensions
(hybrid retrieval, reranking) with ONE shared narrow mechanism (deterministic
term-overlap/BM25-lite rerank of the 1-hop neighborhood). Hidden-object
exclusion carries a known PING-side defect with no external donor.

## 3. Per-candidate records

### 3a. LightRAG — BACKLOG (pattern reference; framework import forbidden)

- **AREA:** Ask FYD retrieval / query decomposition
- **CURRENT PING IMPLEMENTATION:** topicWords() grounding gate (ask-composer.ts):
  strips generic scaffolding words, requires a named topic to match the
  on-record service vocabulary before the services branch fires. Deterministic,
  no LLM.
- **EXTERNAL IMPLEMENTATION:** Dual-level retrieval — the query is decomposed
  by a dedicated KEYWORD LLM role into low-level keywords (entities) and
  high-level keywords (relations/topics), each matched against the graph
  index; vector + graph dual stores; incremental update/delete via LLM cache.
- **EXACT REPO + SHA:** `HKUDS/LightRAG` @
  `453dce83d6d0354a06e46c8d4029a0895c4e054b` (main, verified 2026-09-26 via
  GitHub commits API)
- **LICENSE:** MIT (GitHub SPDX, verified 2026-09-26). Attribution required;
  no copyleft; no patent grant text beyond MIT's implicit grant. Clean donor
  license — but the mechanism is LLM-bound, so license cleanliness does not
  make it harvestable.
- **MECHANISM WORTH HARVESTING:** Query decomposition into entity-keywords +
  topic-keywords as a *pattern* (validates PING's topicWords direction).
- **WHY IT IS BETTER:** Narrowly: LightRAG's evaluation shows dual-level
  keywords improve comprehensiveness on complex queries. PING's topicWords is
  a deterministic primitive of the same idea (topic extraction without the
  LLM). DOCUMENTED (LightRAG README + paper claims), not independently
  benchmarked against PING.
- **WHAT NOT TO COPY:** The LLM at every stage (EXTRACT/KEYWORD/QUERY roles),
  the vector+graph dual stores, the framework itself. LLM-extracted entities
  are strictly weaker than PING's first-class acquisition→evidence→object
  graph. Program law forbids importing a RAG framework.
- **PING AUTHORITY IT MUST REMAIN UNDER:** n/a — no code. If the pattern ever
  informs topicWords (e.g., bigram topic extraction), it stays under
  buildAskContext / composeAnswer, no new authority.
- **MINIMAL PATCH:** None authorized. Hypothetical: extend topicWords with
  bigram extraction (~10 lines in ask-composer.ts).
- **EXPECTED DELETION-SIMPLIFICATION:** None. Net LOC fields: all UNKNOWN —
  no writer, no estimates (fiction is not evidence).
- **TEST THAT PROVES IMPROVEMENT:** UNKNOWN — not written; would be a fixture
  where a two-word topic ("emergency repair") currently fails the grounding
  gate.
- **BENCHMARK IF RELEVANT:** None run.
- **SECURITY CONSEQUENCES:** None — pattern only. (An LLM keyword role would
  add prompt-injection surface to the ask path: a reason to keep it a pattern.)
- **MIGRATION-RISK:** None — no code movement.
- **DECISION:** BACKLOG — pattern reference for query decomposition;
  framework import forbidden by program law.

### 3b. GraphRAG (microsoft/graphrag) — REJECT (successful harvest result)

- **AREA:** Ask FYD retrieval / graph-based context
- **CURRENT PING IMPLEMENTATION:** selectRelatedCircles — deterministic BFS
  over a first-class object graph with predicate priority; publicGraphOf
  visibility projection.
- **EXTERNAL IMPLEMENTATION:** LLM entity/relationship extraction from
  unstructured text → Leiden community detection → LLM community
  summarization → map-reduce QA over summaries.
- **EXACT REPO + SHA:** `microsoft/graphrag` @
  `769542fbf1d8e5b4c6a8677fefc34621c87894c5` (main, verified 2026-09-26)
- **LICENSE:** MIT (GitHub SPDX, verified 2026-09-26). Clean — irrelevant,
  since the mechanism is rejected on architectural grounds.
- **MECHANISM WORTH HARVESTING:** None as code. Pattern noted: community
  summarization as a concept for future *derived* content (already covered by
  PING's DERIVED_FACT/derived claim class).
- **WHY IT IS BETTER:** It is not, for PING. PING's graph is first-class
  (acquisition → evidence → object with provenance); GraphRAG's graph is an
  LLM-extracted approximation of text. Its core value proposition (turning
  unstructured text into a graph) is a problem PING already solved upstream.
  DOCUMENTED (arXiv 2404.16130; repo README).
- **WHAT NOT TO COPY:** Everything structural: the extraction pipeline, the
  community hierarchy, the map-reduce QA, the framework. Additionally the repo
  README declares it "largely in maintenance mode" — OBSERVED.
- **DECISION:** REJECT. Importing it would add an LLM-dependent framework,
  break determinism, and replace a stronger first-class graph with a weaker
  extracted one. No candidates.json row (not a genuinely harvestable code
  donor; rejection documented here).

### 3c. Qdrant (qdrant/qdrant) — BACKLOG (fusion math as pattern; not a dependency)

- **AREA:** Ask FYD retrieval / hybrid fusion
- **CURRENT PING IMPLEMENTATION:** No vector store (confirmed: zero qdrant
  hits in src/fyd — PING does NOT currently use Qdrant). Ranking signals: one
  (predicate priority + object id).
- **EXTERNAL IMPLEMENTATION:** Hybrid search = dense vectors + sparse vectors
  in one query, results merged via configurable fusion: Reciprocal Rank
  Fusion (RRF) or Distribution-Based Score Fusion (DBSF). DOCUMENTED (Qdrant
  README, lines on hybrid search).
- **EXACT REPO + SHA:** `qdrant/qdrant` @
  `6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de` (master, verified 2026-09-26)
- **LICENSE:** Apache-2.0 (GitHub SPDX, verified 2026-09-26). Patent grant
  included; attribution required; no copyleft. Safe — but nothing is copied;
  the RRF formula is public-domain math (Cormack et al. 2009), used as
  reference only.
- **MECHANISM WORTH HARVESTING:** RRF fusion math (~15 lines): the day PING
  has two rank signals (e.g., predicate-priority order + term-overlap score),
  RRF is the deterministic way to fuse them without score normalization.
- **WHY IT IS BETTER:** Narrowly: fusing rankings beats either signal alone
  on standard retrieval benchmarks (DOCUMENTED in IR literature; not
  benchmarked against PING).
- **WHAT NOT TO COPY:** The Qdrant server, vector embeddings, any new
  runtime service, any new dependency. PING's ask path is node:crypto-only
  deterministic; a vector DB would be a new authority.
- **PING AUTHORITY IT MUST REMAIN UNDER:** n/a — pattern only.
- **MINIMAL PATCH / TEST / BENCHMARK / NET LOC:** All UNKNOWN — no writer;
  the mechanism activates only if the BM25-lite rerank (3d) is ever built.
- **SECURITY CONSEQUENCES:** None — pattern only.
- **MIGRATION-RISK:** None.
- **DECISION:** BACKLOG — RRF/DBSF fusion math as reference; never a
  dependency, never a service. Proposed candidates.json row (below).

### 3d. BM25S (xhluca/bm25s) — BACKLOG (scoring math; TS port, no dependency)

- **AREA:** Ask FYD retrieval / question-relevance ranking (the GAP)
- **CURRENT PING IMPLEMENTATION:** relatedObjects ordered by predicate
  priority + object id — question-agnostic. With ASK_LIMITS.maxRelated=8, a
  large 1-hop neighborhood can drop the question-relevant object before the
  composer ever sees it. The composer then either refuses or answers from
  less-relevant objects. This is the one genuine retrieval GAP found this
  pass. (Defect proof on a real question: NOT yet demonstrated — Q1/Q5/Q9
  UNKNOWN.)
- **EXTERNAL IMPLEMENTATION:** BM25S — ultrafast BM25 (pure Python + numpy,
  sparse eager scoring): idf + tf saturation + length normalization over
  token statistics. DOCUMENTED (repo README; HF blog post).
- **EXACT REPO + SHA:** `xhluca/bm25s` @
  `e21ca718464054fbdaf5ce51160399e496f878f4` (main, verified 2026-09-26).
  License correction vs. assumption: it is **MIT**, not Apache-2.0 (GitHub
  SPDX, verified 2026-09-26).
- **LICENSE:** MIT (verified). Clean; attribution required.
- **MECHANISM WORTH HARVESTING:** The BM25 scoring formula as a deterministic
  question→object relevance scorer over object title/description/fields text.
  Port the math to TypeScript (~40 lines); do NOT depend on the Python
  package (wrong stack: numpy/scipy/numba; PING's ask path is dependency-minimal).
- **WHY IT IS BETTER:** It adds the missing question-relevance signal with
  zero new dependencies, zero nondeterminism, zero network. BM25 is the
  standard lexical baseline that dense retrieval still has to beat on
  keyword-heavy queries (DOCUMENTED, BEIR literature).
- **WHAT NOT TO COPY:** The package as a dependency; the eager sparse-matrix
  machinery (PING's candidate set is ≤ dozens of objects — plain loops);
  stemming/tokenizer dependencies (PING already tokenizes in topicWords;
  reuse that tokenizer).
- **PING AUTHORITY IT MUST REMAIN UNDER:** answerAskFyd / buildAskFydContext —
  a rankRelatedByQuery(question, objects) step inside src/fyd/object/related.ts
  or a sibling scorer, applied BEFORE the maxRelated truncation. Predicate
  priority stays as the tiebreak. No new authority.
- **MINIMAL PATCH:** Add deterministic scorer; reorder relatedObjects by
  (termScore desc, predicateRank, objectId) before slice(0, 8). Additive.
- **EXPECTED DELETION-SIMPLIFICATION:** None — additive ~40 lines. Net LOC
  fields otherwise UNKNOWN.
- **TEST THAT PROVES IMPROVEMENT:** Fixture graph with >8 one-hop neighbors;
  question naming a low-predicate-priority neighbor (e.g. a links_to object);
  assert the named object is in relatedObjects after the patch (fails before,
  passes after). NOT WRITTEN — gate Q9 UNKNOWN.
- **BENCHMARK IF RELEVANT:** Retrieval-quality fixture: question → expected
  object ids in top-k; measure before/after. NOT RUN — gate Q5 UNKNOWN.
- **SECURITY CONSEQUENCES:** Pure function over already-authorized public
  objects; question already bounded (2000 chars). No new input surface.
- **MIGRATION-RISK:** Low — additive reorder, deterministic, fully covered
  by existing ordering tests once extended.
- **DECISION:** BACKLOG — named mechanism, gated on defect proof (a real
  question where the 8-cap drops the relevant object) + the 12 gate answers.
  Proposed candidates.json row (below).
- **ALGORITHM NOTE (no row):** tantivy (`quickwit-oss/tantivy`, MIT, main;
  SHA `6182c6062f4d4e88a47564a463a197f337e0734f` from the commits API
  2026-09-26) is the same BM25 family as a Rust library — not a TS donor;
  the math is covered by the BM25S record. BM25 itself is an algorithm, not
  a repository.

### 3e. Cross-encoder rerankers — REJECT as donors (pattern noted)

- **FlashRank** (`PrithivtheCreator/FlashRank`): repo returns **404 as of
  2026-09-26** (OBSERVED) — the original is gone; forks exist
  (e.g. `zeeshan56656/flashrank-js` MIT, `eulogik/flashrank-pro`
  NOASSERTION) but chasing forks of a deleted reference implementation is
  not serious archaeology.
- **bge-reranker** (inside `FlagOpen/FlagEmbedding`, MIT, master @
  `fd1a2bdf69488ffebe0327999d4400d8c8058a0b`, verified 2026-09-26): license
  clean.
- **WHY REJECTED:** Cross-encoder reranking requires model weights + an
  inference runtime (ONNX/transformers) in the ask path — a new dependency
  class, added latency, and version-to-version nondeterminism, all against
  PING's deterministic node:crypto-only ask pipeline. The architecture
  pattern (retrieve → score → truncate) is worth keeping and is exactly what
  the BM25-lite proposal (3d) implements deterministically. No rows.

### 3f. Citation-aware RAG — PATTERN-ONLY (PING wins the dimension)

- GitHub survey 2026-09-26: the space is small hobby repos
  (`srathish/rag-with-citations` MIT, `pravin-nawghare/DocMind...`
  Apache-2.0, others) — all are LLM prompt-based "cite your sources"
  citation with no deterministic claim→evidence binding and no refusal.
- PING's mechanism (sentence-level [n] binding + claimClassifications +
  field-level evidence refs + refusal when uncited) is architecturally
  stronger than anything surveyed. **PING WINS — keep.**
- Eval pattern noted: ALCE's citation recall/precision definitions could
  shape future invariant tests for citation completeness. No row (no
  genuinely harvestable code donor found; pattern-only).

## 4. Proposed new candidates.json rows (DO NOT APPLY — parent/pipeline owns the registry)

Three rows. All SHAs full 40-char, verified same-day (2026-09-26) via the
GitHub commits API; all licenses verified same-day via the GitHub license
endpoint. No AGPL/GPL rows. No duplicate owner/repo rows (none of these
repos appear in the current 12-row registry).

```json
[
  {
    "name": "LightRAG",
    "repo": "HKUDS/LightRAG",
    "pinned_sha": "453dce83d6d0354a06e46c8d4029a0895c4e054b",
    "branch_observed": "main",
    "license": "MIT",
    "license_evidence": "GitHub license endpoint spdx_id MIT, verified 2026-09-26",
    "mechanisms": [
      "dual-level keyword retrieval: low-level entity keywords + high-level topic keywords via a dedicated KEYWORD LLM role (pattern reference only)",
      "incremental graph update/delete via LLM cache (pattern reference only)"
    ],
    "decision": "BACKLOG - pattern reference for query decomposition; framework import forbidden by program law; PING's topicWords is the deterministic primitive of the same idea",
    "sha_verified": true,
    "aliases": []
  },
  {
    "name": "Qdrant",
    "repo": "qdrant/qdrant",
    "pinned_sha": "6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de",
    "branch_observed": "master",
    "license": "Apache-2.0",
    "license_evidence": "GitHub license endpoint spdx_id Apache-2.0, verified 2026-09-26. Patent grant included; no copyleft.",
    "mechanisms": [
      "RRF / DBSF hybrid fusion math as reference (not a dependency, not a service)",
      "dense+sparse hybrid search pattern"
    ],
    "decision": "BACKLOG - RRF fusion math as reference for fusing two rank signals if a second signal is ever built; never depend on the server. PING does not currently use Qdrant.",
    "sha_verified": true,
    "aliases": []
  },
  {
    "name": "BM25S",
    "repo": "xhluca/bm25s",
    "pinned_sha": "e21ca718464054fbdaf5ce51160399e496f878f4",
    "branch_observed": "main",
    "license": "MIT",
    "license_evidence": "GitHub license endpoint spdx_id MIT, verified 2026-09-26 (correction: MIT, not Apache-2.0)",
    "mechanisms": [
      "BM25 scoring math (idf, tf saturation, length norm) as reference for a deterministic TS-port question-relevance scorer over the 1-hop object neighborhood"
    ],
    "decision": "BACKLOG - port the scoring math to TypeScript (~40 lines), no dependency; gated on defect proof (a real question where the maxRelated=8 cap drops the relevant object) and the 12 writer-gate answers",
    "sha_verified": true,
    "aliases": []
  }
]
```

Deliberately NOT proposed as rows: GraphRAG (REJECT — framework import
forbidden, LLM-extracted graph weaker than PING's first-class graph,
maintenance mode), FlashRank (original repo 404; cross-encoders rejected as
model-dependency donors), FlagEmbedding/bge-reranker (REJECT as donor;
pattern noted), tantivy (same BM25 family, Rust — math covered by BM25S
record), citation-RAG hobby repos (prompt-based, weaker than PING — pattern
only). REJECTION IS A SUCCESSFUL HARVEST RESULT.

## 5. Writer-gate status

No candidate passes all 12 gate questions. The strongest named mechanism
(BM25-lite rerank, 3d) is UNKNOWN on Q1 (concrete failure not yet
demonstrated on a real question), Q5 (no benchmark), Q9 (no test). Next
research step, not a patch: construct a fixture (or find a real site) where
a question's relevant object sits beyond the 1-hop top-8 under
predicate-priority ordering, then re-evaluate.

## 6. Net-architecture fields (evidence rule)

CURRENT PING LOC TOUCHED: ~2,287 (ask surface). DONOR LOC EXAMINED:
LightRAG README (~53KB, mechanism survey), BM25S README (~28KB), Qdrant
README (hybrid section), GraphRAG README (~5KB); no donor source files read
in full — mechanism-level survey only. EXPECTED PING LOC ADDED / REMOVED /
NET LOC / NEW DEPENDENCIES / NEW AUTHORITIES / NEW RUNTIME SERVICES: all
UNKNOWN — no writer authorized, so no estimates are offered. Fiction is not
evidence.

## 7. Scorecard deltas (this pass)

- External systems studied: 6 (LightRAG, GraphRAG, Qdrant, BM25S, rerankers,
  citation-RAG survey).
- New candidate rows proposed: 3 (LightRAG, Qdrant, BM25S) — parent/pipeline
  to apply.
- Rejections recorded: 3 (GraphRAG, cross-encoder rerankers, citation-RAG
  hobby repos).
- Dimensions where PING already wins and keeps its mechanism: 9 of 12
  outright (+ determinism within the 12th).
- Genuine PING gaps found: 1 (question-relevance ranking of the retrieved
  neighborhood; hybrid retrieval and reranking collapse to this single
  mechanism).
- Known PING defect with no external donor: hidden-object exclusion —
  publicGraphOf hardcodes `[]` decisions; composeObjectView bypasses
  applyFieldVisibility (flagged 2026-09-25, on HOLD).
- Live defects closed: 0 (research only). Tests added: 0. Net LOC: 0.
  Dependencies added: 0. Authorities added: 0.
- Lines changed in PING: 0. Best-result restatement: "We studied six
  retrieval systems and changed 0 lines — and proved PING's authorized,
  evidence-bound, refusal-capable ask pipeline is stronger than every
  surveyed RAG framework on 9 of 12 dimensions."
