# HARVEST-REPORT.md: Lane F: external search systems evaluated

Date: 2026-09-23. Program rule followed: SEARCH PING → GIT HISTORY →
ECOSYSTEM → (clone only where a mechanism needed proving) → LICENSE →
TESTS → MECHANISM → SPIKE → RED-TEAM → ADOPT/ADAPT/REJECT.

## PROBLEM
FYD needs one generic object retrieval layer: ID, schema, normalized name,
relationship, source identity, URL, and text fields, deterministic first,
feeding the Ask FYD context compiler.

## PING ALREADY HAS
- src/fyd/resolve/spike/normalize.ts + matchers.ts: dependency-free
  normalization and named EXACT match tiers (exact-url, exact-phone,
  exact-name-address). Proven on real pipeline data (328 candidates vs
  318-row corpus, 255 ms). Harvested as the Tier 0 mechanism (ADAPT).
- src/lib/ping/feed-rank.ts: deterministic ordering convention
  (score desc, eventTime desc, id asc). Adopted verbatim.
- src/lib/ping/grants.ts: viewer-gating semantics for visibility filtering.
- No database, no FTS, no trigram, no vector store, no embedding pipeline.
  Nothing to harvest for the retrieval engine itself.

## EXTERNAL CANDIDATES

### 1. Tantivy (Rust full-text search library)
- License: MIT. Clean.
- Mechanism of interest: BM25 scoring over an inverted index, tokenizer
  pipeline. The mechanism is textbook; no clone was needed to prove it.
- Kill criteria: weight dwarfs value. Adopting Tantivy means a Rust
  toolchain or a native binding for a corpus of hundreds of objects, plus
  a second implementation of normalization that must be kept consistent
  with the resolve spike. PING already solves the scoring with ~150 lines
  of dependency-free TS.
- Decision: **REJECT.** Nothing to import.

### 2. Meilisearch (hosted/service search engine)
- License: MIT. Clean.
- Kill criteria: weight dwarfs value; new persistent service = second truth
  store that must be kept consistent with canonical events; own auth
  surface and upgrade lifecycle. Also violates the lane's no-new-database
  scope. Rebuild-from-canonical is possible but the operational weight is
  unjustifiable at this corpus scale.
- Decision: **REJECT.** Nothing to import.

### 3. Typesense
- License: GPLv3. **Kill criterion: license incompatible** for vendored
  backend use (copyleft would attach to the search integration layer).
  Rejected on license before weight is even considered; weight would also
  fail (same service-weight argument as Meilisearch).
- Decision: **REJECT.** Nothing to import.

### 4. SQLite FTS5 (via better-sqlite3 or node:sqlite)
- License: public domain. Clean.
- Mechanism: FTS5 with BM25 ranking, trigram tokenizer available. This is
  the only candidate that survives license and weight screening at the
  mechanism level.
- Kill criteria now: not yet. better-sqlite3 is a native module and PING
  has zero native dependencies; there is no file-backed corpus that must
  survive process restarts yet (the ask path reads through the gateway).
  Value does not yet exceed the in-process index, which answers every
  current FYD query class.
- Decision: **REJECT for now, named escalation.** If a single tenant ever
  exceeds ~50k objects or search must persist across restarts without a
  rebuild, FTS5 is the pre-approved next step. No code imported today.

### 5. Postgres FTS (tsvector/tsquery) + pg_trgm
- License: PostgreSQL License. Clean.
- Kill criteria: **there is no Postgres in PING.** Installing a relational
  database to get full-text search is a new database (lane scope forbids),
  and operational weight (backups, migrations, connection management)
  dwarfs the value for an in-memory-scale corpus. pg_trgm's typo tolerance
  is additionally a semantic liability: silent near-matches are exactly
  what the resolve spike's ambiguity tier refused to auto-merge.
- Decision: **REJECT.** Nothing to import.

### 6. pgvector / Qdrant (vector retrieval)
- License: PostgreSQL License / Apache 2.0. Clean.
- Kill criteria: weight dwarfs value (no embedding pipeline exists in PING;
  standing one up for hundreds of business objects is novelty benefit);
  PING already solves retrieval deterministically; provenance breaks (a
  vector hit names a distance, not a rule, and the Ask FYD composer
  requires every factual sentence to cite evidence). Adversarial ingested
  content can also shape embedding neighborhoods in ways no named rule
  can audit, weakening the poisoning posture.
- Decision: **REJECT.** Nothing to import. Revisit only on a measured
  text-retrieval failure in the benchmark (none found).

### 7. Hybrid BM25 + vector
- Kill criteria: inherits the vector rejection, plus adds a score-fusion
  layer with its own tuning surface. Nothing to hybridize with.
- Decision: **REJECT.** Nothing to import.

## TESTED
No external candidate was installed or cloned. Deliberate: every candidate
except SQLite FTS5 failed a kill criterion (license, new-database scope,
weight dwarfs value, novelty-only benefit) before testing could add
information, and FTS5's mechanism (FTS5/BM25/trigram) is documented well
enough that a clone would only confirm the docs. The testing budget went
into the spike instead: the deterministic layer's own benchmark
(recall@k, latency p50/p99) and red-team suite (poisoning, stale index,
tenant leakage, visibility, cross-tier confusion).

## WINNER
The hand-written deterministic layer in this lane's spike/ directory:
Tier 0 exact identity matching (ADAPTED from PING's resolve spike
normalization) + Tier 1 in-process BM25-lite inverted index + visibility
filter inside the scan loop + feed-rank total ordering. Zero new
dependencies, zero new services, zero new authorities.

## ADOPT / ADAPT / REJECT
- ADAPT: src/fyd/resolve/spike/normalize.ts semantics (URL/phone/name
  normalization choices, documented in the design doc). Not copied
  verbatim into the spike; re-implemented with the same documented
  choices and a pointer to the source path.
- ADOPT: src/lib/ping/feed-rank.ts ordering convention
  (score desc, eventTime desc, id asc).
- REJECT: Tantivy, Meilisearch, Typesense, Postgres FTS/pg_trgm,
  pgvector/Qdrant, hybrid ranking. SQLite FTS5 deferred as named
  escalation.

## CODE WE DO NOT NEED TO WRITE
Any FTS engine, any tokenizer library, any vector store client, any
embedding pipeline, any index-persistence layer, any query parser beyond
the SearchRequest shape, any score-fusion logic.

## MINIMAL PING WRAPPER
None. The spike is already PING-shaped: pure functions, pinned `nowIso`,
canonical-JSON index digest, named rules on every hit, tenant-first
filtering. Porting it to src/ is a file move plus type alignment with
PingObject, not a wrapper.

## FAILURE TEST
Covered by the red-team suite in the spike (RT1 poisoning, RT2 stale
index, RT3 tenant leakage, RT4 visibility, RT5 cross-tier confusion).
Index rebuild is the only mutation path; there is no incremental-update
code to fail.

## PRODUCT CAPABILITY UNLOCKED
Ask FYD (lane G's context compiler) gets a retrieval adapter with a
contract it can consume today: SearchRequest/SearchResponse, visibility
guarantees, determinism guarantees, and an indexDigest it can bind into
its packet for replay. Text questions ("which businesses do plumbing?",
"the coffee shop on Main") now resolve to ranked, visibility-bounded
objects instead of relying on the caller to already know the target id.

## BYTES / DEPENDENCY COST
Spike: ~700 lines of dependency-free TypeScript across 6 files.
New dependencies: 0. New services: 0. New databases: 0.
External systems evaluated: 7. Dependencies adopted: 0.
Hand-written infra avoided: one FTS engine, one vector pipeline,
one persistent search service.
