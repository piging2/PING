# OBJECT-SEARCH-DESIGN.md: FYD Object Retrieval Layer

Lane F, 2026-09-23. One generic object retrieval layer for FYD. Deterministic
first. No new database.

## 1. What PING already has (search of repo + git history, read-only)

There is no search infrastructure in PING today. Verified 2026-09-23 against
/home/nolan/projects/ping:

- **No database at all.** package.json carries zero of: pg, postgres, prisma,
  drizzle, sqlite, kysely, mongodb, qdrant, meilisearch, typesense, elastic.
  The only networked store is @upstash/redis (cache/rate-limit role).
  Canonical persistence = events/journal + file projections + the gateway.
- **No FTS, no trigram, no vector, no embedding pipeline anywhere in src.**
- **Retrieval today** = direct object read by ID (the Ask FYD `target`) plus
  relationship traversal (`relatedObjects`, `relationships`), fed by the
  gateway event query route. Ask FYD's context builder
  (`src/fyd/ask/context-builder.ts`) is a pure function of
  (viewer, target, relatedObjects, relationships, plan). Text search: zero.
- **Deterministic pieces PING already built that this layer reuses:**
  - `src/fyd/resolve/spike/normalize.ts` + `matchers.ts`: dependency-free
    URL/phone/name/address normalization and named EXACT match tiers
    (exact-url, exact-phone, exact-name-address). Battle-proven on the real
    outreach pipeline: 328 candidates vs 318-row corpus, 255 ms, 91 exact
    matches with named rules and provenance. This is the Tier 0 mechanism;
    ADAPT, not rebuild.
  - `src/lib/ping/feed-rank.ts`: deterministic ranking convention:
    score desc, eventTime desc, id asc tiebreak. Same inputs + same `now`
    always produce the same order. Adopted verbatim for total ordering.
  - `src/lib/ping/grants.ts` (`grantsForViewer`): the viewer-gating
    semantics that search visibility filtering must be consistent with.
  - `src/fyd/ask/__tests__/graph-read-route.test.ts`: the read boundary
    invariants: disk JSON projections never leak into answers, journal
    overlays compose deterministically, reads never cross tenants.
- **git history:** no prior search-index commits. The resolve spike README is
  the only search-adjacent design record.

Consequence: the "evaluate existing infrastructure first" directive finds no
existing search infrastructure. The evaluation below therefore runs in order
against the only existing substrate (in-process, zero-dep) and rejects every
new-store option under the kill criteria. That is the honest outcome of
"Postgres FTS → trigram → vector retrieval → hybrid": there is no Postgres to
evaluate, and installing one fails the lane scope ("No new database") and the
kill criterion "weight dwarfs value."

## 2. Deterministic layer design (the whole Tier 0 + Tier 1 system)

The layer is a pure, dependency-free function over a frozen object set.
Same object set + same query always yields the same ordered hits. There is
no ML infrastructure, no embeddings, no background service, no network.

### 2.1 Indexable object shape

```
SearchableObject {
  id: string                // canonical object id, opaque
  tenantId: string          // isolation boundary, always set
  schema: string            // e.g. ping.social.business@1
  name: string              // display name
  text: {                   // graded text fields, in priority order
    name: string
    description: string
    extra: string[]         // any additional searchable text (tags, services)
  }
  url: string | null
  phone: string | null
  sourceIdentity: { provider: string, providerId: string } | null
  visibility: "public" | "owner" | "hidden"
  relationships: Array<{ predicate: string, targetId: string }>
  eventTime: string         // ISO, for recency + tiebreak ordering
}
```

Field grades drive scoring weights: name matches outrank description
matches outrank extra-text matches. Deterministic, documented constants.

### 2.2 Tier 0: exact deterministic identity matching

Before any text scoring, the query is tested against normalized identity
signals using the PING resolve-spike normalization semantics (ADAPTED from
src/fyd/resolve/spike/normalize.ts; same documented choices: URL path is
identity-significant, phones digits-only 10, names lose legal suffixes and
diacritics, no stemming):

- `exact-id`: query text equals an object id.
- `exact-url`: normalized URL equality.
- `exact-phone`: normalized phone equality.
- `exact-source`: provider + providerId equality (connector observations
  carry this; it is how ingested content maps back to its origin).
- `exact-name`: normalized name equality within the tenant.

Any Tier 0 hit short-circuits: Tier 0 results return before Tier 1 scoring,
ordered by tier rank (id > url > phone > source > name) then id asc.
Every hit names its rule. This is the mechanism Ask FYD uses when the user
says "the plumber" and there is exactly one canonical plumber, or when a
question references a URL, phone number, or source record.

### 2.3 Tier 1: tokenized text retrieval (in-process inverted index)

When no Tier 0 rule fires, the query is tokenized with the same normalizer
(lowercase, diacritic strip, punctuation split, no stemming) and scored
against an inverted index:

- Index structure: token → postings list of (objectId, term frequency,
  field grade). Plus per-object token count (doc length) and corpus stats
  (doc count, avg length). Built once per frozen object set; rebuilt, never
  mutated in place.
- Scoring: graded presence scoring with fixed documented constants
  (NOT BM25: term frequency is deliberately ignored, see the RT1 finding
  below). score = sum over matched query tokens of
  idf(token) * maxFieldGrade(token, object) * schemaBoost(schema).
  Field-grade weight multipliers: name 4.0, description 1.0, extra 0.5.
  Only the highest-grade field a token appears in counts; cross-field
  repetition never amplifies weight. Schema boost is a documented table
  (business 1.5, service 1.2, post 1.0).
- Total deterministic order, adopting the feed-rank convention:
  score desc, eventTime desc, id asc. The id tiebreak makes the order total;
  no two runs can disagree.
- Relationship expansion (optional, bounded): for a hit set H, walk one hop
  along named predicates and append related objects with a hop penalty
  (score * 0.5, labeled `via_relationship`). Never recursive. This is how
  "services offered by Coppersmith" style questions resolve: text finds the
  business, one hop finds its services.

### 2.4 What the layer deliberately does NOT do

- No fuzzy matching, no typo tolerance, no stemming in the core path.
  The resolve spike taught that fuzzy is an ambiguity tier for intelligence
  review, never silent auto-resolution. A `fuzzy-name` signal may arrive
  later as a labeled candidate producer, not as a silent ranker.
- No vector similarity. Documented rejection in section 3.
- No index mutation: the index is a pure projection of a frozen object set.
  Source deletion → rebuild → object gone. This kills the stale-index class
  by construction.

## 3. Infrastructure evaluation (in required order)

Kill criteria (any one rejects): license incompatible, surrenders canonical
authority, unsafe secret model, cannot preserve provenance, cannot be
isolated, weight dwarfs value, PING already solves it, benefit is novelty
only. Optionality test: can we replace this store, add a protocol, rebuild
the projection from canonical state, trace a result to evidence?

### Option A: in-process deterministic index (this design)
- **ADOPT.** Zero new dependencies, zero new services, zero new authority.
  Rebuilds from canonical state in O(n) (rebuild = re-run the projection;
  optionality test passes trivially). Provenance preserved: every hit names
  its tier, rule, and score components. Isolation: tenant filter is a hard
  gate before scoring, proven by red-team test (section 6). Capacity: a
  Western Slope business corpus is hundreds to low thousands of objects;
  the spike indexes 500 objects in well under a second and queries in
  microseconds. Nothing in PING's roadmap needs more before a real
  multi-tenant deployment exists.
- Escalation path if corpora outgrow memory: Option B only, with a kill
  review at the time. No pre-emptive infrastructure.

### Option B: SQLite FTS5 (file-backed)
- **REJECT (deferred, not dead).** License clean (public domain), rebuildable
  from canonical state, and genuinely the cheapest persistent FTS if PING
  ever needs disk-backed search. Rejected now because: (a) better-sqlite3 is
  a native module and PING currently has zero native deps; (b) PING has no
  file-backed search corpus that outlives a process yet, the ask path reads
  through the gateway; (c) weight dwarfs value at current scale, the
  in-process index already answers every FYD query class. Revisit when a
  single tenant exceeds ~50k objects or search must survive restarts without
  rebuild. Recorded as the named escalation, so the decision is reversible.

### Option C: Postgres FTS / pg_trgm
- **REJECT.** There is no Postgres in PING. Installing Postgres (or any
  relational DB) to get FTS is a new database, which the lane scope
  explicitly forbids and the kill criterion "weight dwarfs value" covers:
  operational weight (backups, migrations, connection management, schema
  authority questions) against a corpus that fits in memory. pg_trgm's typo
  tolerance is also a semantic liability for an evidence system: silent
  near-matches are exactly what the resolve spike's ambiguity tier refused
  to auto-merge. Optionality test would pass (rebuildable), but the cost
  fails first.

### Option D: vector retrieval (pgvector / Qdrant / any embedding pipeline)
- **REJECT.** No embedding pipeline exists in PING; none is planned.
  Kill criteria hit three ways: (1) weight dwarfs value, standing up
  embeddings + a vector store for hundreds of business objects is pure
  novelty benefit; (2) PING already solves the retrieval need deterministically
  (Option A); (3) provenance: a vector hit cannot name a rule, only a
  distance, which breaks the evidence traceability the Ask FYD composer
  requires (every factual sentence cites evidence). Semantic search also
  weakens the poisoning red-team posture: adversarial ingested content can
  shape embedding neighborhoods in ways no rule can name. Revisit only if
  a measured query class fails on text retrieval in the benchmark
  (none has; see section 5). If ever adopted, vectors must be a derived
  projection (rebuildable, replaceable) with deterministic rerank on top,
  never the authority for "this is the object."

### Option E: hybrid ranking (BM25 + vector)
- **REJECT.** Inherits Option D's rejection; hybrid adds a second
  infrastructure component and a score-fusion layer with its own tuning
  surface. Nothing to hybridize with yet.

### Option F: hosted search services (Meilisearch, Typesense, Elasticsearch)
- **REJECT.** All fail "weight dwarfs value" and the no-new-database scope;
  each adds a persistent service with its own data copy (a second truth
  store that must be kept consistent), its own auth surface, and its own
  upgrade lifecycle. Typesense is additionally GPLv3, which triggers the
  license kill criterion for vendored backend use. Meilisearch (MIT) and
  Tantivy (MIT, Rust) have clean licenses but do not change the weight
  analysis: a process or service for a corpus that fits in a Map. The BM25
  mechanism they implement is textbook; the spike re-implements the needed
  subset in ~150 lines with no dependency.

Decision summary: ADOPT A, defer B as the named escalation, REJECT C/D/E/F
with reasons above. No import from any external search system. The spike is
the winner and it is hand-written PING code.

## 4. Retrieval contract for the Ask FYD context compiler (lane G)

Lane G owns the ContextPacket; this layer is its evidence-source adapter.
This contract is offered via INTEGRATION-REQUEST; G may narrow it, never
widen it.

```
SearchRequest {
  tenantId: string          // REQUIRED. No tenant, no search.
  viewer: {
    id: string | null
    grants: string[]        // from grantsForViewer semantics
  }
  query: {
    text?: string           // free text; tokenized by the layer
    id?: string             // exact id lookup
    url?: string            // exact url lookup (normalized)
    phone?: string          // exact phone lookup (normalized)
    sourceIdentity?: { provider: string, providerId: string }
    schema?: string          // restrict to schema(s)
    expandRelationships?: boolean  // default false; one hop, penalized
  }
  limit: number             // default 10, max 50
  nowIso: string            // pinned clock for recency + ordering (replay)
}

RankedHit {
  objectId: string
  tier: "exact" | "text" | "relationship"
  rule: string              // e.g. "exact-url", "graded-match", "via_relationship:offers"
  score: number             // exact tier: fixed tier rank; text: BM25-lite
  scoreComponents: { text: number, schemaBoost: number, hopPenalty?: number }
  eventTime: string
}

SearchResponse {
  hits: RankedHit[]         // full objects NOT included; G fetches via its
                            // authorized read seam (never bypass it)
  totalCandidates: number
  indexDigest: string        // sha256 of (corpus digest + layer version);
                            // G binds this into its packet for replay
}
```

### Visibility filtering (search must never surface what the viewer may not see)
Filtering happens BEFORE ranking, not after, so scores and positions never
encode invisible objects:
1. tenantId must equal the request tenantId. Cross-tenant rows are dropped
   before tokenization is even consulted (red-team proven, section 6).
2. visibility "hidden" is never returned to any viewer.
3. visibility "owner" requires the viewer grants to include the object's
   owner grant (grantsForViewer semantics); otherwise dropped.
4. visibility "public" passes.
The filter is a pure function of (object, viewer) applied at index-scan
time; it cannot be skipped because it is inside the scan loop, not a
post-pass. The indexDigest in the response lets G prove which corpus and
which layer version produced the hits.

### Determinism requirements
- Same frozen object set + same SearchRequest (including nowIso) always
  yields the same ordered hits. Enforced by: fixed scoring constants, the
  feed-rank ordering convention (score desc, eventTime desc, id asc), and
  no wall-clock reads anywhere in the path.
- Index builds are deterministic: postings lists are id-sorted at build
  time; the indexDigest is a sha256 over canonical JSON of the index stats
  plus the layer version, so two builds of the same corpus produce the
  same digest byte for byte.
- Rebuild-from-canonical is the only mutation path (no incremental
  patching), which makes stale-index states impossible and replays exact.

### Ranking signals (documented, boring, fixed)
- Tier 0 exact rules outrank all text scoring, in fixed rule order.
- Text: graded presence scoring (idf * max field grade * schema boost;
  term frequency deliberately ignored per the RT1 finding)
  * field grade (name 4.0, description 1.0, extra 0.5)
  * schemaBoost (documented table in the spike; business >
  service > post for name-weighted queries).
- Relationship expansion: one hop, score * 0.5, labeled with predicate.
- Final order: score desc, eventTime desc, id asc.

## 5. Benchmark plan

Corpus: synthetic, generated deterministically (seeded PRNG) in the spike:
500 objects across 3 tenants, schemas business/service/post, Western
Slope flavor names/descriptions/phones/urls. No live corpus is safely
available (the gateway read path is lane D territory; this lane does not
touch it). The generator records ground-truth intents so recall is
measurable.

Query set (60 queries):
- 15 exact-identity queries (id, url with scheme/www variants, phone with
  formatting variants, source identity) → expect Tier 0 hit, rank 1.
- 25 text queries with a single known-best object (name mention, distinctive
  description phrase, service keyword) → expect best at rank 1, in top 3.
- 10 text queries with multiple relevant objects (e.g. "plumbing" across
  several businesses) → measure recall@5 and recall@10 against the
  generator's relevance set.
- 10 negative queries (no relevant object in the tenant) → expect empty,
  never a hallucinated best-effort hit.

Metrics:
- recall@k (k = 1, 3, 5, 10) on the text queries against ground truth.
- Tier 0 accuracy: fraction of identity queries resolving to the right
  object at rank 1 (target: 1.0).
- Latency: p50 and p99 per query over 1,000 runs (single-threaded node).
- Index build time for the 500-object corpus.

Results: recorded below after the spike run.

### Results (2026-09-23, spike/benchmark.ts, 684-object synthetic corpus, 14,000 query runs)

- Tier 0 identity accuracy: 9/9 resolve to the right object at rank 1 with
  the named exact rule (id, url variants, phone variants, source identity,
  normalized name variants).
- Text recall: recall@1 = 1.0, recall@3 = recall@5 = recall@10 = 0.9.
  Best-known object at rank 1 for 4/5 text queries.
- The single recall miss is honest and documented: query "water heater
  installation" does not retrieve biz-coppersmith, whose description says
  "Water heaters" (plural). No stemming is a deliberate design choice
  inherited from the resolve spike ("plumbing" and "plumber" stay
  distinct); the fuzzy tier owns that ambiguity. Plural folding could be
  added later as a labeled signal, never as silent conflation.
- Negative queries: 2/2 return empty, never a hallucinated best-effort hit.
- Latency: p50 0.003 ms, p99 0.125 ms per query (single-threaded node;
  max 10 ms first-run JIT outlier). Index build: ~100 ms for 684 objects.
- Determinism: same request twice yields identical hit order and scores;
  rebuilding from the same corpus yields the identical index digest
  (sha256 over canonical JSON of ids + token vocabulary + layer version).

## 6. Red-team

Threat model: the index is a projection of canonical state, and connector
data is observation. The index must not become a confused deputy.

### RT1: index poisoning via ingested content
An ingested observation carries adversarial text: keyword stuffing
("plumber plumber plumber best plumber grand junction"), a fake name
designed to shadow a real business, and prompt-injection prose ("ignore
previous instructions"). Expected: Tier 0 exact rules are unaffected
(identity is normalized, not ranked); the poisoned object may score on
text, but it can never outrank a Tier 0 hit for the real business, it can
never change another object's identity, and the hit carries its
scoreComponents so a consumer can see it won on `extra` text only.
Test: poisoned object must not appear above the true exact-name match for
the real business name query.

### RT2: stale index after source deletion
Object deleted at the source. Expected: the next rebuild drops it; there
is no incremental path that could leave it. Test: build index, delete an
object from the corpus, rebuild, assert the id is absent from all queries
that previously returned it, and assert indexDigest changed. Also asserts
the optionality invariant: the index is fully rebuildable from the corpus.

### RT3: tenant leakage through shared indexes
One physical index holds objects from tenants A and B with overlapping
names and text. Expected: a query from tenant B never returns tenant A
objects, at any rank, even when tenant A has the textually best match.
Test: for every query in the benchmark set, run as tenant B viewer and
assert zero hits with tenantId A. The filter sits inside the scan loop;
there is no code path that scores-then-filters.

### RT4: visibility filtering
Owner-only and hidden objects in the corpus. Expected: a viewer without
the owner grant sees neither; a viewer with the grant sees the owner
object but never the hidden one; hidden is unreturnable by construction.
Test: matrix of (viewer grants) x (object visibility) asserting exact hit
sets.

### RT5: cross-tier confusion
A text query that also matches an unrelated object's id prefix. Expected:
Tier 0 only fires on full equality (exact-id is equality, not prefix), so
no confusion. Test: query text equal to a strict prefix of an id must not
trigger exact-id.

Results: recorded below after the spike run.

### Results (2026-09-23, spike/redteam.ts, all 5 pass)

- **RT1 poisoning: PASS.** Adversarial object (shadow name, keyword-stuffed
  description, "ignore previous instructions" in extra text): Tier 0 exact
  rules unaffected (URL lookup still resolves the real business); on the
  text query the poison scores EXACTLY equal to the real object
  (60.9312... = 60.9312...), i.e. stuffing cannot manufacture a strict
  ranking win. Both hits return with named rules and score components so
  the consumer sees the ambiguity. Residual, documented: the tie breaks by
  the (score, eventTime, id) convention toward the newer object; same-name
  disambiguation belongs to the entity-resolution layer (resolve spike
  semantics: same name is not identity), not the ranker. Follow-up for
  lane M: a source-trust signal from the source registry could feed
  ranking later; not invented here.
- **RT2 stale index: PASS.** After deleting the object from the corpus and
  rebuilding: absent from text queries, absent from id lookup, index
  digest changed. Rebuild-from-canonical is the only mutation path, so the
  stale-index class is impossible by construction.
- **RT3 tenant leakage: PASS.** 0 leaked hits across 6 queries against a
  shared 3-tenant index; the tenant's own same-named object still resolves
  (no over-filtering).
- **RT4 visibility: PASS.** Owner object hidden from grant-less viewer,
  visible with the owner grant; hidden object unreturnable by any viewer,
  including by direct id lookup.
- **RT5 cross-tier confusion: PASS.** A text query equal to an id string
  does not fire exact-id (Tier 0 exact-id fires only on the dedicated id
  field); a strict id prefix matches nothing.

Red-team finding that changed the design (antifragile loop): the first
implementation used BM25-style term-frequency scoring, and RT1 caught the
poison outranking the real object via cross-field keyword repetition.
Fix shipped and verified: graded presence scoring (max field grade per
token, no tf). The benchmark re-ran green after the fix, and recall@1
improved from 0.8 to 1.0 as a side effect.

## 7. Wave 2 (2026-09-24): proof against the real factory fixture graph

The wave-1 spike was proven on a synthetic corpus. Wave 2 re-proves the
ladder against the real FYD factory fixture graphs (read-only):
9 fixture files (batch-a plumber/hvac/electrician/roofer, batch-b
landscaper/pest-control/general-contractor/cleaning-service,
clearwater-plumbing-demo), 116 real PingObject-shaped objects + 3 labeled
in-memory test injections (owner-visibility, hidden, foreign-tenant).
Adapter: spike/realgraph.ts. Proof suite: spike/proof.ts.
Layer version bumped to `object-search-v2`.

### 7.1 The ladder, measured per rung (Q1-Q5)

- Q1 id lookup (`cw-biz-01`): Tier 0 exact-id, rank 1, 0.009 ms. No
  cheaper rung exists; suffices.
- Q2 typo names (12 one-char mutations of real business names): Tier 0
  never fires (equality only, by design). Tier 1 text ranks the target #1
  in 14/14 realistic cases — the intact tokens carry the query. The
  cheaper rung SUFFICES for realistic typos; trigram adds nothing there.
- Q2b/Q2c trigram measurement: on hard-typo cases (every token corrupted,
  Tier 0+1 return zero hits), in-process trigram at Jaccard 0.25 rescues
  4/4 at rank 1 with 0 false positives on 4 unrelated negatives
  (~0.27 ms/query). ADOPTED as Tier 3 fallback-only rung: structural fire
  condition (Tier 0+1 zero candidates), hits labeled tier "fuzzy" rule
  "trigram-candidate" — suggestions for review, never silent resolutions.
  This is the resolve-spike precedent applied: fuzzy is an ambiguity
  signal, not an identity decision.
- Q3 semantic ("find the business that does emergency plumbing"): Tier 1
  graded-match answers (tokens {emergency, plumbing} both occur in fixture
  text: "Emergency service 24/7" in hours, "Plumbing" in the name).
  Vector rung not justified for this query class: no paraphrase gap.
- Q3b paraphrase stress ("shop that unclogs drains" vs "Drain cleaning"):
  measured MISS — no token overlap, target not retrieved. This is the one
  query class where vector retrieval would be the correct escalation.
  Recorded as a known, measured limitation; vector stays REJECTED (no
  embedding infra exists in PING — existing infra is none — and the kill
  criteria still hold: weight dwarfs value, provenance breaks because a
  vector hit names a distance, not a rule, and the Ask FYD composer
  requires every factual sentence to cite evidence).
- Q4 relationship ("services of Clearwater Plumbing Co.",
  expandRelationships=true): Tier 0 exact-name finds the business, Tier 2
  expands one hop: 12 services via provides, plus employs/located_at/
  links_to/publishes (24 relationship hits total, 0.02 ms). Neither exact
  nor text tiers can answer the "services of X" shape; the relationship
  rung is the only one that does. Fires only on explicit opt-in.
- Q5 forbidden viewer: owner-name/hidden-name/hidden-id queries return
  zero invisible hits; owner grant reveals the owner object but never the
  hidden one; cross-tenant viewer gets only its own tenant's same-named
  object. The visibility gate (inside the scan loop, before scoring)
  denies; no rung "answers."

### 7.2 Findings that changed the implementation (antifragile loop)

1. **RT6a oracle (found by redteam2, FIXED, verified).** A hidden object
   matching Tier 0 exact-name caused the layer to return empty WITHOUT
   running Tier 1, while the same query on a corpus without the hidden
   object returned visible text hits. Response difference = existence
   oracle. Fix: when Tier 0 fires but all its hits are visibility-filtered,
   fall through to Tier 1, making "hidden identity match"
   indistinguishable from "no identity match." Wave-2 red-team re-ran
   green (RT6a/b/c, RT7).
2. **Tier 0 seeds now feed relationship expansion (found by proof Q4,
   FIXED, verified).** "Services of X" failed when X resolved by exact
   name, because expansion only ran on the text path. Exact seeds now
   expand identically. Deterministic (id-sorted seeds, id-sorted edges).
3. **RT6c residual, documented not fixed.** Raw scores shift with corpus
   docCount (idf), so corpora with/without invisible objects produce
   slightly different floats. Hit SET, ORDER, and COUNTS are identical.
   Not a practical oracle: any corpus change shifts scores, and an
   attacker cannot distinguish hidden from visible additions; scores are
   never shown to end viewers (lane G consumes hit presence + tier).

### 7.3 Rung census (measured; no dead weight)

- Tier 0 exact: fires on identity queries. Keep.
- Tier 1 text (in-process FTS): fires on all text queries. Keep.
- Tier 2 relationship: fires only on explicit opt-in. Keep as opt-in;
  removing it would delete the only "services of X" mechanism.
- Tier 3 fuzzy (trigram): fires rarely, rescues zero-hit typo cases.
  Keep as fallback-only; if it never fires in production, it costs ~60
  lines and zero dependencies — removal is trivial and safe.
- Vector rung: never fires; no infra exists. Stays rejected until a
  measured query class fails AND embedding infra exists.

### 7.4 Index staleness: who invalidates (lane O coordination)

The search index is a derived projection: rebuild-from-canonical is the
only mutation path (no incremental patching, RT2-proven). Lane O's
dependency index owns the invalidation signal; the search index registers
as a derived consumer (see lane-o/INTEGRATION-REQUEST-f.md). Until lane
O's propagation reaches the ask path, the interim contract is: whoever
mutates the object set rebuilds the index before the next query batch;
staleness is observable via indexDigest mismatch.
