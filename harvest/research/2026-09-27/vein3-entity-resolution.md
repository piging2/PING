# Vein 3: Entity Resolution / Identity - Working Paper
Date: 2026-09-27 (MDT). Researcher: vein-3 subagent. Pass: fyd-ping-daily-harvest, RESEARCH ONLY.
Program law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md (read in full, binding).
Product edge: OBJECT -> RELATIONSHIP.
Hard law observed throughout: NEVER collapse same name/URL/email/phone/provider account into automatic same-entity truth.

## 0. Pig checkout audit (GAP, recorded honestly)

The Pig was unreachable for the entire pass. Three SSH attempts to 100.79.154.43 failed:
(1) pigwsl via pig-config (proxy hatch-egress-proxy:3130): "nc: proxy read: Broken pipe";
(2) muse-ssh@100.79.154.43 direct via proxy: same broken pipe;
(3) nolan@100.79.154.43 via proxy: "Connection timed out during banner exchange".
Direct (no proxy): "Operation not permitted". The proxy route exists but the host is not responding; likely asleep or down at 03:2x-03:4x MDT.

Last known checkout (from task brief, 2026-09-26): /home/nolan/projects/ping on the Pig,
branch fyd/sprint-integration-2026-09-24, HEAD c93a7ced. CURRENT HEAD NOT VERIFIED TODAY.
Falsifier action: verify HEAD and re-check every CURRENT PING IMPLEMENTATION claim below against the live tree.

Never used /home/nolan/fyd-wave2-clean (stale, detached per program guidance).

## 1. Current PING/FYD entity machinery (from verified memory evidence)

PING has strong IDENTITY machinery and NO entity-resolution machinery. These are different things.

Identity (strong, constitutional):
- IdentityAuthority -> CanonicalBytes -> CanonicalAuthority ownership chain mints deterministic IDs
  (memory/2026-09-18.md:L4405, memory/2026-09-19.md:L135).
- Identity is one of Nolan's 12 provable-single-ownership areas (memory/2026-09-13.md:L645).
- V2 identity domains, three-era model, old IDs never rewritten (memory/2026-09-18.md:L829).
- Object identity minting is per-event, deterministic, hash-based.

Entity resolution (absent, the defect):
- Business Twin primitive lists Identity, Objects, Relationships, Observations, Evidence, Claims,
  Owner Assertions, Policies, Capabilities, History (memory/2026-09-21.md:L245).
- OBJECT_CREATED / RELATIONSHIP_CREATED event types exist (memory/2026-09-20.md:L1083).
- Ask FYD has known/partial/unknown/conflict semantics (memory/2026-09-21.md:L1404).
- "WHAT FYD THINKS IT KNOWS" owner review: conflicting fields get CONFIRM / CORRECT / HIDE
  (website-builder-authority-decisions.md L79-L140).
- Standing law: "Provider observations never become canonical identity merely because FYD saw them"
  (memory/2026-09-21.md:L442).
- Pending proof goal: resolve one authorized entity across a website, one open-social identity, and
  another public source into one PING identity/object graph WITH VISIBLE CONFLICTS (memory/2026-09-21.md:L450).
- Semantic diff engine (source change -> twin diff -> affected projections -> override conflict check ->
  proposed actions) described as the highest-leverage MISSING primitive (memory/2026-09-21.md:L245).

What exists nowhere in the evidence: deterministic blocking, probabilistic match scoring, merge/split
decision records, canonical-representative synthesis, match-evidence attached to RELATIONSHIP_CREATED.
Identity minting answers "what is this observation's ID". Nothing answers "is this observation the
same real-world entity as that observation, with what evidence, at what confidence, and with which
conflicts preserved". That is the OBJECT -> RELATIONSHIP weak edge this vein targets.

Current behavior under this gap (NOT freshly verified; falsifier must confirm against live checkout):
either observations mint independent objects (duplicates), or ingestion collapses on a single field
(URL/phone/provider account), which would violate the program hard law. Either way there is no
scored, evidence-bound, conflict-preserving link decision. This is the concrete failure the writer
gate's question 1 will need; until a live duplicate or live collapse is demonstrated, all four
donors stay at BACKLOG/REJECT and no writer receives work.

Note: outreach-side dedup (never-re-engage guard, check-prospect-collision.py, engagement guards) is
pipeline dedup, not core PING entity resolution. Kept separate.

---
# CANDIDATE RECORDS (16 fields each)

## Candidate 1: python-dedupe

AREA: Entity resolution / identity (deduplication, record linkage, gazetteer matching).
Mapping to product arrow: OBJECT -> RELATIONSHIP (deciding whether two observations are the same entity).

CURRENT PING IMPLEMENTATION: No blocking, no match scoring, no merge/split machinery (see section 1).
IdentityAuthority mints deterministic per-event IDs; no cross-observation linkage decisions exist.

EXTERNAL IMPLEMENTATION: dedupeio/dedupe. Blocking predicates produce candidate pairs;
active learning labels them; a classifier scores them; connected components form clusters;
canonical-rep synthesis picks a representative record per cluster.
Mechanism files read at the pinned SHA (mechanism level, not landing pages):
- dedupe/blocking.py: Fingerprinter class. Each record yields (block_key + predicate_id, record_id)
  pairs for every predicate. Index-backed "search" predicates behave asymmetrically: target=True
  yields the record's own value; target=False yields all values within the search distance (e.g.
  Levenshtein-1 neighborhood). This is the blocking primitive: O(n) fingerprinting instead of O(n^2).
- dedupe/predicates.py: Predicate ABC; SimplePredicate(func, field); StringPredicate (punctuation
  stripped, whitespace normalized before predicate functions); ExistsPredicate (missing-field blocks);
  CompoundPredicate via __add__ (predicate conjunctions).
- dedupe/training.py: BlockLearner.learn(matches, recall, ...) computes predicate coverage over
  labeled match pairs, builds candidate predicate sets (simple; random-forest conjunctions only once
  log10(matches) >= 1 to avoid overfitting), and runs branch_and_bound.search to find the smallest
  predicate set achieving target recall. Learned blocking rules from labels, not hand tuning.
- dedupe/api.py: ActiveMatching has uncertain_pairs() (highest-information unlabeled pairs for a
  human), mark_pairs(labeled_pairs), train() (regularized logistic regression on comparison vectors),
  write_settings()/write_training() (serialize the learned model), StaticMatching for runtime use of
  a frozen model. Dedupe / RecordLink / Gazetteer classes: dedupe within one set, link two sets,
  gazetteer-match messy data against a canonical set.
- dedupe/clustering.py: union-find connected components over scored pairs (numpy memmap), with
  score-based re-filtering: components larger than max_components are re-cut at a computed
  threshold (logit of min score minus 1). Clustering is bounded, never one giant component.
- dedupe/canonical.py: getCentroid (pairwise distance matrix, min average distance, longest-string
  tie-break note) and getCanonicalRep (per-field centroid across the cluster): a canonical
  representative synthesized WITHOUT destroying member records.

EXACT REPO + SHA: dedupeio/dedupe @ 3f61e79102910bd355e920a2df7e44c14c9cb247 (main, 2025-07-29,
"Update benchmark-bot.yml"). Verified via GitHub commits API 2026-09-27. NOTE: the brief named
dedicatedcomputing/dedupe; that path 404s. Correct identity is dedupeio/dedupe.

LICENSE: MIT (GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27).
File-level exceptions: none observed in the six mechanism files read (blocking.py, predicates.py,
training.py, api.py, clustering.py, canonical.py carry no conflicting headers). Full header audit
required before any code touch. Attribution: MIT, preserve copyright notice. Copyleft: none.
Patent clauses: none (MIT has no express patent grant). Dependencies if depended upon: numpy, scipy,
scikit-learn, affinegap, highered (Cython) - heavy; favors HARVEST over DEPEND.

MECHANISM WORTH HARVESTING:
(a) Asymmetric blocking predicates (Fingerprinter + index predicates with target/query behavior);
(b) BlockLearner: learned blocking rules with target recall via branch-and-bound;
(c) Active-learning loop (uncertain_pairs/mark_pairs) as the owner-in-the-loop labeling primitive,
    which maps cleanly onto PING's Owner Assertions / CONFIRM-CORRECT-HIDE review;
(d) Bounded connected-components clustering with score-based re-cut;
(e) Canonical-rep synthesis (getCentroid) as conflict-preserving representative selection.

WHY IT IS BETTER: It is the complete missing machinery for the OBJECT -> RELATIONSHIP edge:
deterministic candidate reduction (blocking), evidence-graded pair scoring, human-label loop,
bounded clustering, and a canonical representative that does not delete member observations.
The BlockLearner in particular replaces hand-tuned dedupe heuristics with learned rules plus a
recall target, which is exactly the "why this block" evidence PING's WHAT FYD THINKS IT KNOWS review
would need. Active learning is the mechanism behind "owner trains their FYD without learning PING".

WHAT NOT TO COPY: scikit-learn / affinegap / numpy-memmap / Cython machinery; the whole
ActiveMatching training loop as a runtime dependency; TF-IDF canopy index internals beyond the
asymmetric-predicate idea; benchmark-bot and packaging.

PING AUTHORITY IT MUST REMAIN UNDER: IdentityAuthority stays sovereign for all minted IDs. A
match decision would be a Claim + Evidence attached to a RELATIONSHIP_CREATED event (same_entity,
confidence, predicate set, label provenance), reviewable via Owner Assertions. Clustering never
mints or rewrites identity; it only proposes relationships.

MINIMAL PATCH: None proposed (research only). If the writer gate ever passes: a small,
dependency-free TypeScript blocking module (predicate functions + compound predicates over
normalized contact fields) behind the existing object-ingestion seam, emitting scored
same_entity Claims for owner review, no auto-merge.

EXPECTED DELETION-SIMPLIFICATION: CURRENT PING LOC TOUCHED: UNKNOWN (ingestion seam not verified
today). DONOR LOC EXAMINED: ~1,400 lines across 6 files. EXPECTED ADDED: UNKNOWN. EXPECTED REMOVED:
UNKNOWN. NET LOC: UNKNOWN. NEW DEPENDENCIES: 0 if harvested as mechanism (strict preference).
NEW AUTHORITIES: 0.

TEST THAT PROVES IMPROVEMENT: A test that feeds two observations of the same business (name variant,
phone variant, address variant) plus one near-miss (same name, different city) and asserts:
blocking yields both candidate pairs; the match decision is a scored Claim with evidence, not a
silent collapse; the near-miss is NOT merged; conflicts are preserved and visible. Fails today
because no such machinery exists.

BENCHMARK IF RELEVANT: dedupe ships its own benchmark suite; no PING-side benchmark exists to run
against. Benchmark would be blocking recall on a labeled business corpus, gated on the defect proof.

SECURITY CONSEQUENCES: Blocking predicates and string comparators operate on untrusted contact
strings; regex-heavy predicates need ReDoS review; the branch-and-bound learner runs only on
labeled data (owner-provided), not on live ingestion. No SSRF/network surface in the harvested
mechanism. Match decisions must never auto-authorize capabilities or merge owner identities without
Owner Assertion.

MIGRATION-RISK: Low if harvested as a small deterministic module (no dependency). Risk is semantic:
importing dedupe's ML training loop would add a nondeterministic training step into a deterministic
pipeline; mitigated by harvesting only blocking + scoring-shape, keeping training/labeling in the
owner-review surface.

DECISION: BACKLOG. Narrow mechanisms documented and ready; gated on the writer gate's question 1
(a demonstrated live duplicate or live collapse in PING ingestion). Rejection of the whole-library
DEPEND is part of this decision: HARVEST small mechanism over ADOPT library, per strict preference
order.

Candidate-registry row (for parent to merge into candidates.json; verified not present today):
{"name": "python-dedupe", "repo": "dedupeio/dedupe",
 "pinned_sha": "3f61e79102910bd355e920a2df7e44c14c9cb247", "branch_observed": "main",
 "license": "MIT", "license_evidence": "GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27",
 "sha_verified": true, "sha_verified_date": "2026-09-27",
 "mechanisms": ["asymmetric blocking predicates (Fingerprinter, target/query index predicates)",
  "BlockLearner: learned blocking rules with target recall via branch-and-bound",
  "active-learning labeling loop (uncertain_pairs/mark_pairs) as owner-in-the-loop primitive",
  "bounded connected-components clustering with score-based re-cut of oversized components",
  "canonical-rep synthesis (getCentroid/getCanonicalRep) without destroying member records"],
 "decision": "BACKLOG - mechanisms documented; whole-library DEPEND rejected; gated on live duplicate/collapse defect proof",
 "aliases": []}

## Candidate 2: splink

AREA: Entity resolution / identity (probabilistic record linkage at scale).
Mapping to product arrow: OBJECT -> RELATIONSHIP.

CURRENT PING IMPLEMENTATION: Same as candidate 1: no probabilistic scoring of entity sameness.

EXTERNAL IMPLEMENTATION: moj-analytical-services/splink. Fellegi-Sunter probabilistic linkage:
each comparison field has graded comparison LEVELS (not binary agree/disagree); the model learns
m (P(level | match)) and u (P(level | non-match)) probabilities per level; each pair gets a
log-likelihood match weight = sum over fields of log2(m/u); pairs above a threshold are linked;
graph clustering forms entities.
Mechanism files read at the pinned SHA:
- splink/internals/expectation_maximisation.py: EM estimation of m/u WITHOUT labeled data.
  count_agreement_patterns_sql counts realized agreement patterns; compute_new_parameters_sql
  recomputes m_count = sum(match_probability * count), u_count = sum((1-match_probability) * count)
  per comparison level. Unsupervised parameter learning from the data's own structure.
- splink/internals/comparison_level_library.py: ~25 graded level classes: ExactMatchLevel,
  LevenshteinLevel, DamerauLevenshteinLevel, JaroWinklerLevel, JaroLevel, JaccardLevel,
  DistanceFunctionLevel, AbsoluteTimeDifferenceLevel, AbsoluteDateDifferenceLevel, DistanceInKMLevel,
  PercentageDifferenceLevel, AbsoluteDifferenceLevel, ArrayIntersectLevel, ArraySubsetLevel,
  CosineSimilarityLevel, plus NullLevel/ElseLevel/CustomLevel. Grading is the point: near-matches
  contribute partial evidence instead of binary pass/fail.
- Term-frequency adjustments (comparison.py: term_frequency_adjustments): the u probability is
  adjusted by how common the value is, so agreement on a rare value (unusual business name)
  contributes far more match weight than agreement on a common one ("Main Street"). This is the
  "rare agreement is strong evidence" law made mechanical.
- splink/internals/blocking.py + blocking_rule_library.py: SQL blocking rules as the candidate
  generator, with blocking analysis tooling (which rules would have caught known matches).
- splink/internals/connected_components.py: SQL connected components via the min-representative
  iteration (each node adopts the minimum representative among its neighbors, iterated to fixpoint),
  with a stable flag so converged clusters stop being recomputed.
- splink/internals/realtime.py: compare_records(record_1, record_2, settings, db_api) computes a
  match score for ONE pair without building a Linker: the single-pair scoring primitive, useful for
  "should these two observations link" at ingestion time.
- splink/internals/find_matches_to_new_records.py: incremental linking of new records against an
  existing master table: the "new observation arrives, who does it match" path.
- linker_components: inference.py (predict), training.py
  (estimate_u_using_random_sampling, estimate_parameters_using_expectation_maximisation),
  clustering.py (cluster_pairwise_predictions_at_threshold), evaluation.py.

EXACT REPO + SHA: moj-analytical-services/splink @ 473f0f7fdb19916e4dbdf1c420a1a8c0b0cf9953
(master, 2026-09-22, merge of duckdb_reprex_1bn). Verified via GitHub commits API 2026-09-27.
Actively maintained (pushed the same week as this pass).

LICENSE: MIT (GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27).
File-level exceptions: none observed. Attribution: MIT notice. Copyleft: none. Patent: none
express. Dependencies if depended upon: duckdb or spark or sqlite backends, heavy; favors HARVEST.

MECHANISM WORTH HARVESTING:
(a) Fellegi-Sunter m/u estimation via EM (unsupervised parameter learning): the principled way to
    turn comparison outcomes into calibrated match probabilities without labeled training data;
(b) Graded comparison levels (partial credit for near matches, per-field);
(c) Term-frequency-adjusted u: rare-value agreement weighs more;
(d) realtime single-pair scoring as the ingestion-time "do these link" primitive;
(e) Incremental new-record-to-master linking pattern.

WHY IT IS BETTER: It answers the exact question PING cannot answer today: "with what calibrated
confidence are these two observations the same entity, and which field agreements produced that
number". EM-learned m/u means the probabilities come from the corpus, not from hand-set weights.
The match weight is additive over fields and auditable: each level's log2(m/u) contribution is
explainable evidence, which is precisely what PING's evidence-bound Ask FYD and WHAT FYD THINKS
IT KNOWS surfaces need. The graded levels avoid the binary collapse the program law forbids.

WHAT NOT TO COPY: the SQL-generation engine, the multi-backend (Spark/DuckDB) dataframe layer,
the Linker framework, the visualization/cluster-studio tooling, the waterfall charts.

PING AUTHORITY IT MUST REMAIN UNDER: IdentityAuthority (IDs), EvidenceAuthority (the match weight
computation and its inputs become immutable evidence), CapabilityAuthority (a match decision never
grants capabilities). The probabilistic score is a Claim with evidence; promotion to a canonical
same-entity relationship requires owner authority or a deterministic rule, never the model alone.

MINIMAL PATCH: None proposed (research only). If the writer gate ever passes: a small deterministic
module implementing graded string/date comparisons + log2(m/u) accumulation with corpus-estimated
parameters, emitting a scored Claim on RELATIONSHIP_CREATED.

EXPECTED DELETION-SIMPLIFICATION: CURRENT PING LOC TOUCHED: UNKNOWN. DONOR LOC EXAMINED: ~900
lines across 6 files (library surface + EM core + realtime). EXPECTED ADDED/REMOVED/NET: UNKNOWN.
NEW DEPENDENCIES: 0 if harvested. NEW AUTHORITIES: 0.

TEST THAT PROVES IMPROVEMENT: Same shape as candidate 1, plus calibration: on a labeled corpus of
business observations, predicted match probabilities must be monotonically consistent with observed
precision (higher predicted weight -> higher true-match rate), and rare-name agreements must score
higher than common-name agreements for otherwise identical pairs.

BENCHMARK IF RELEVANT: splink's own accuracy module; PING-side benchmark gated on defect proof.

SECURITY CONSEQUENCES: EM runs over the observation corpus; ensure it cannot exfiltrate or
materialize PII into logs (agreement-pattern counts are aggregates, fine). Single-pair scoring at
ingestion must be bounded (no unbounded corpus scan per observation).

MIGRATION-RISK: Low as a harvested mechanism. The risk is importing the SQL backend machinery;
mitigated by harvesting only the m/u math + graded levels. EM is iterative but deterministic given
fixed inputs; pin iteration count and convergence tolerance for determinism.

DECISION: BACKLOG. The EM m/u estimation math and graded-comparison-level design are the highest-
value probabilistic machinery found this pass; both gated on the writer gate's question 1.

Candidate-registry row (for parent to merge; verified not present today):
{"name": "splink", "repo": "moj-analytical-services/splink",
 "pinned_sha": "473f0f7fdb19916e4dbdf1c420a1a8c0b0cf9953", "branch_observed": "master",
 "license": "MIT", "license_evidence": "GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27",
 "sha_verified": true, "sha_verified_date": "2026-09-27",
 "mechanisms": ["Fellegi-Sunter m/u estimation via EM (unsupervised, no labels needed)",
  "graded comparison levels: exact, levenshtein, damerau-levenshtein, jaro-winkler, jaccard, absolute date/time difference, distance-in-km, percentage difference, array intersect",
  "term-frequency-adjusted u: rare-value agreement contributes more match weight",
  "realtime single-pair scoring without a Linker (ingestion-time link check)",
  "incremental new-record-to-master linking (find_matches_to_new_records)",
  "SQL connected components via min-representative iteration with stable flag"],
 "decision": "BACKLOG - EM m/u math and graded levels are the harvestable core; whole-framework DEPEND rejected; gated on defect proof",
 "aliases": []}

## Candidate 3: python-recordlinkage

AREA: Entity resolution / identity (indexing, comparison, classification toolkit).
Mapping to product arrow: OBJECT -> RELATIONSHIP.

CURRENT PING IMPLEMENTATION: Same as above.

EXTERNAL IMPLEMENTATION: J535D165/recordlinkage. A toolkit, not a framework: separate indexing
(candidate pair generation), comparison (feature vectors), and classification (match decision).
Mechanism files read at the pinned SHA:
- recordlinkage/index.py: Full (all pairs), Block (exact agreement on key), SortedNeighbourhood
  (sort by key, sliding window of width w; window=1 degenerates to blocking; tolerant of spelling
  mistakes that break exact blocking), Random (sampling). The SortedNeighbourhood window is the
  simplest deterministic near-duplicate candidate generator of the three donors.
- recordlinkage/compare.py: Exact; String (8 algorithms: jaro, jarowinkler, levenshtein,
  damerau_levenshtein, qgram, cosine, smith_waterman, lcs; threshold param binarizes, None returns
  the raw float); Numeric (step/linear/gaussian/squared scaling); Geographic (haversine distance);
  Date; Frequency (value-frequency comparison, the same rare-value intuition as splink's TF
  adjustment, computed as a comparison feature); Variable passthrough.
- recordlinkage/classifiers.py: FellegiSunter, ECMClassifier (EM), NaiveBayesClassifier,
  KMeansClassifier, LogisticRegressionClassifier, SVMClassifier - all sklearn adapters.
- recordlinkage/preprocessing/cleaning.py: clean() (accent stripping via sklearn) and
  phonenumbers(s): phone-number parsing/normalization helper. Contact normalization primitives.
  (recordlinkage/standardise/ is a stub at this SHA: __init__.py only.)

EXACT REPO + SHA: J535D165/recordlinkage @ b93d97641952f8c85106be5794ca93b1f1298fbc
(master, 2023-07-20, CI publish pipeline update). Verified via GitHub commits API 2026-09-27.
Maintenance signal: WEAK - last push 2024-02-21 (over 2.5 years ago), pinned commit from 2023.
Stable but effectively unmaintained; pin accordingly.

LICENSE: BSD-3-Clause (GitHub license endpoint spdx_id BSD-3-Clause, path LICENSE, verified
2026-09-27). File-level exceptions: none observed. Attribution: BSD-3 notice. Copyleft: none.
Patent: none express. Dependencies: pandas, sklearn, jellyfish - heavy; favors HARVEST.

MECHANISM WORTH HARVESTING:
(a) SortedNeighbourhood indexing: the minimal deterministic blocking that survives spelling
    mistakes, implementable in ~30 lines without dependencies;
(b) phonenumbers-based contact normalization (cleaning.phonenumbers) as the phone-number
    canonicalization primitive PING's contact normalization needs;
(c) Frequency comparison feature as an alternative encoding of the rare-value law.

WHY IT IS BETTER: SortedNeighbourhood is the smallest possible answer to "how do we find candidate
pairs without O(n^2)": sort by a normalized key, slide a window. No ML, no training, fully
deterministic, trivially testable. The phonenumbers helper addresses the contact-normalization half
of the vein (normalize before comparing, never compare raw strings).

WHAT NOT TO COPY: the pandas/sklearn classifier stack; the whole toolkit as a dependency
(unmaintained upstream makes DEPEND especially unattractive); jellyfish string algorithms can be
reimplemented or vendored minimally if needed.

PING AUTHORITY IT MUST REMAIN UNDER: IdentityAuthority (IDs); CanonicalAuthority (the normalized
phone/key forms are canonicalizations, so they belong under the canonicalization authority, not
ad-hoc string code).

MINIMAL PATCH: None proposed (research only). If the writer gate ever passes: SortedNeighbourhood
over normalized business-name/phone keys + phonenumbers normalization, dependency-free TypeScript.

EXPECTED DELETION-SIMPLIFICATION: CURRENT PING LOC TOUCHED: UNKNOWN. DONOR LOC EXAMINED: ~700
lines across 4 files. EXPECTED ADDED/REMOVED/NET: UNKNOWN. NEW DEPENDENCIES: 0 if harvested
(phonenumbers semantics reimplemented or via existing phone lib). NEW AUTHORITIES: 0.

TEST THAT PROVES IMPROVEMENT: Candidate-pair recall test: N observations with planted spelling
variants of the same business name; SortedNeighbourhood must surface all true pairs as candidates
while keeping total candidate pairs sub-quadratic; phonenumbers normalization test: "(970) 589-3309",
"9705893309", "+1 970-589-3309" all normalize identically.

BENCHMARK IF RELEVANT: Recall vs window width on a labeled corpus; gated on defect proof.

SECURITY CONSEQUENCES: String comparators on untrusted input need ReDoS/timeout bounds; the
Geographic comparator is fine. No network surface.

MIGRATION-RISK: Minimal: pure functions, no state, no services.

DECISION: BACKLOG. SortedNeighbourhood + phone normalization are the two narrowest, most
deterministic harvests of the pass. Upstream maintenance weakness reinforces HARVEST-over-DEPEND.

Candidate-registry row (for parent to merge; verified not present today):
{"name": "python-recordlinkage", "repo": "J535D165/recordlinkage",
 "pinned_sha": "b93d97641952f8c85106be5794ca93b1f1298fbc", "branch_observed": "master",
 "license": "BSD-3-Clause", "license_evidence": "GitHub license endpoint spdx_id BSD-3-Clause, path LICENSE, verified 2026-09-27; upstream maintenance weak (last push 2024-02-21)",
 "sha_verified": true, "sha_verified_date": "2026-09-27",
 "mechanisms": ["SortedNeighbourhood indexing: deterministic sliding-window candidate generation tolerant of spelling mistakes",
  "comparison features: exact, string (8 algorithms), numeric, geographic (haversine), date, frequency",
  "FellegiSunter/ECM/NaiveBayes/KMeans/LogisticRegression/SVM classifiers (sklearn adapters, not harvest targets)",
  "preprocessing contact normalization: clean(), phonenumbers()"],
 "decision": "BACKLOG - SortedNeighbourhood + phone normalization are the narrow harvests; whole-toolkit DEPEND rejected (unmaintained upstream)",
 "aliases": []}

## Candidate 4: zentity

AREA: Entity resolution / identity (Elasticsearch-native declarative resolution).
Mapping to product arrow: OBJECT -> RELATIONSHIP.

CURRENT PING IMPLEMENTATION: Same as above.

EXTERNAL IMPLEMENTATION: zentity-io/zentity. An Elasticsearch plugin driven by declarative JSON
models: Indices (which ES indices participate), Attributes (fields), Matchers (named Elasticsearch
query clause templates with params and a quality score), Resolvers (named sets of identity
attributes plus an integer weight). A Resolution Job takes input docs, runs the matchers as ES
queries, scores hits, and returns resolved entities.
Mechanism files read at the pinned SHA: model/Resolver.java (identity attribute set + weight,
validated deserialization), model/Matcher.java (clause template + params + quality + variable
patterns), model/Model.java, resolution/Job.java + Query.java.

EXACT REPO + SHA: zentity-io/zentity @ ecddfab82b68379d223beac108714a92831a4dba
(main, 2025-01-14, "Adding support for Elasticsearch 8.14.1 to 8.17.0"). Verified via GitHub
commits API 2026-09-27.

LICENSE: Apache-2.0 (GitHub license endpoint spdx_id Apache-2.0, path LICENSE, verified
2026-09-27). File-level: Apache headers present in source files read. Attribution: Apache-2.0
notice. Copyleft: none. Patent: express patent grant included (Apache-2.0 section 3), which is a
plus vs MIT/BSD donors. Dependencies: Elasticsearch 8.x plugin architecture - incompatible with
harvest as code.

MECHANISM WORTH HARVESTING: The declarative resolution-policy shape: identity attributes,
scored matchers, and weighted resolvers expressed as data (JSON), not code. Matching policy as
configuration is auditable and owner-reviewable, which fits PING's Owner Assertions surface.
The weight/quality scoring is a simpler, dumber cousin of splink's match weights.

WHY IT IS BETTER: It is not better than the other three donors for PING's needs. Its value is
architectural, not algorithmic: it demonstrates that resolution policy (which fields identify,
which queries match, how much each weighs) can live as versioned data. But the scoring is
ad-hoc (integer weights, opaque quality numbers) versus splink's calibrated probabilities, and
the entire execution model assumes Elasticsearch.

WHAT NOT TO COPY: Everything executable: the Java plugin, the ES query execution, the Job
machinery. PING has no Elasticsearch; introducing one for entity resolution would violate the
ruthless metric (net architecture).

PING AUTHORITY IT MUST REMAIN UNDER: N/A - rejected as donor. If the declarative-policy idea is
ever used, it would live under the existing object/relationship event machinery, not a new
authority.

MINIMAL PATCH: None. No patch is the correct outcome.

EXPECTED DELETION-SIMPLIFICATION: CURRENT PING LOC TOUCHED: 0. DONOR LOC EXAMINED: ~400 lines
(4 files). EXPECTED ADDED/REMOVED/NET: 0. NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0.

TEST THAT PROVES IMPROVEMENT: N/A (rejected).

BENCHMARK IF RELEVANT: N/A.

SECURITY CONSEQUENCES: ES query templates with variable interpolation are an injection surface in
zentity's own context; not applicable since nothing is harvested. Noted for the record.

MIGRATION-RISK: N/A (rejected). Had it been adopted: very high (new Java service, new ES
dependency, new authority-shaped thing).

DECISION: REJECT. Elasticsearch-plugin architecture is incompatible with PING's deterministic
store and the ruthless metric; its scoring is uncalibrated versus splink; its one good idea
(declarative resolution policy as data) is a pattern note, not a harvest. Rejection is a
successful harvest result.

Candidate-registry row (for parent to merge; verified not present today):
{"name": "zentity", "repo": "zentity-io/zentity",
 "pinned_sha": "ecddfab82b68379d223beac108714a92831a4dba", "branch_observed": "main",
 "license": "Apache-2.0", "license_evidence": "GitHub license endpoint spdx_id Apache-2.0, path LICENSE, verified 2026-09-27; Apache headers in source files; express patent grant (Apache-2.0 s3)",
 "sha_verified": true, "sha_verified_date": "2026-09-27",
 "mechanisms": ["declarative resolution policy as data: indices/attributes/matchers/resolvers in JSON",
  "resolvers: identity attribute sets with integer weights", "matchers: ES query clause templates with params and quality scores", "job-based resolution over Elasticsearch"],
 "decision": "REJECT - ES-plugin architecture incompatible with PING; uncalibrated scoring vs splink; declarative-policy shape kept as pattern note only",
 "aliases": []}

## Candidate 5: ATProto identity separation (EXISTING ROW - new mechanisms only)

Per the dedup contract and the task brief: bluesky-social/atproto is already in candidates.json
(pin 7a857989751ae31518509d69ab7194a922064f3d, verified resolvable via commits API 2026-9-27).
No new row. The following NEW mechanisms are recorded under that row. Existing row mechanisms were
Lexicon compatibility laws and protocol SDK patterns; these are distinct and new.

Mechanism files read at the existing pin (packages/identity/src):
- id-resolver.ts: IdResolver composes HandleResolver + DidResolver; a single entry point that keeps
  the layers separate.
- handle/index.ts: HandleResolver.resolve tries DNS TXT "_atproto.<handle>" ("did=...") AND HTTPS
  https://<handle>/.well-known/atproto-did in parallel, DNS first, with backup nameservers.
  Fail-closed ambiguity rule: parseDnsResult returns a DID only if EXACTLY ONE "did=" record
  matches; zero or two-plus means no resolution. Human-readable alias with a deterministic,
  ambiguity-rejecting binding.
- did/did-resolver.ts: method-dispatched DID resolution (plc, web); unknown methods throw
  UnsupportedDidMethodError; malformed DIDs throw PoorlyFormattedDidError. Syntax checked before
  any network call.
- did/base-resolver.ts: validateDidDoc requires doc.id === queried DID (self-consistency) and
  typed validation of the document shape; resolve() has a stale-aware cache
  (checkCache -> expired / stale -> refreshCache); ensureAtpDocument / resolveAtprotoKey /
  verifySignature layer crypto on top of identity, never inside it.
- did/plc-resolver.ts: PLC directory resolution; 404 is "positively not found" vs network error
  (null vs throw): the UNKNOWN-vs-absent distinction PING's own semantics require.
- did/atproto-data.ts: ensureAtpDocument / ensureAtprotoKey: the atproto-specific document
  requirements (alsoKnownAs handle, signing key) validated as a separate layer.

NEW MECHANISMS TO APPEND to the existing ATProto row:
(a) Four-layer identity separation: SYNTAX (did format validation) != HANDLE (human alias, DNS/HTTPS
    binding) != DID (self-certifying identity, method-resolved document) != CRYPTO (signing key
    extracted from the resolved doc). Each layer fails independently and is replaceable without
    touching the others. This is the concrete implementation of the program's "ATProto's separation
    of syntax/identity/DID/crypto/repository".
(b) Handle<->DID bidirectional binding: the handle resolves to a DID, and the DID document's
    alsoKnownAs must contain the handle. One direction alone is not identity.
(c) Ambiguity fail-closed: exactly-one-match rule on DNS TXT records; multiple claimants -> no
    resolution. Directly implements the vein's hard law (never collapse same handle into automatic
    same-entity truth).
(d) Identity persistence across provider migration: PLC operation log lets handle, keys, and
    hosting (PDS) rotate while the DID stays constant. Identity outlives its providers.
(e) Stale-aware resolution caching with explicit expired/stale/refresh states.
(f) 404-vs-error distinction: not-found is data, network failure is UNKNOWN.

WHY IT MATTERS FOR PING: This is the identity-separation law PING's Business Twin needs:
a provider account (PDS/social handle) is an OBSERVATION-layer alias, never the entity's identity.
PING's law "provider observations never become canonical identity" is the same shape as ATProto's
"handle is not the DID". The bidirectional binding check is the pattern for PING's own
"observation claims entity X" verification. The ambiguity fail-closed rule is the pattern for
conflict preservation. Harvest the laws, never port Lexicons or the resolver code into
IdentityAuthority/CapabilityAuthority (rejected leap, program law).

DECISION for these mechanisms: BACKLOG (already the row's decision). Identity-separation laws
recorded as the compatibility/identity archaeology the program ordered; no code movement.

---
## 2. Comparative summary (OBJECT -> RELATIONSHIP edge)

What PING has: deterministic identity minting (IdentityAuthority), object/relationship event
types, conflict surfacing in Ask FYD and owner review. What PING lacks: the entire decision
machinery between "two observations arrived" and "a same-entity relationship exists with evidence
and confidence".

Donor ranking for that missing machinery:
1. splink: the only donor with CALIBRATED probabilistic scoring (EM-learned m/u) and the
   rare-value law; best fit for evidence-bound match Claims.
2. dedupe: the only donor with learned blocking rules + active learning + bounded clustering +
   canonical-rep synthesis; best fit for the owner-in-the-loop training story.
3. recordlinkage: the simplest deterministic blocking (SortedNeighbourhood) + contact
   normalization; best fit for the smallest possible first patch.
4. ATProto: not a matching donor; the identity-separation LAW donor. Complementary, not competing.
5. zentity: rejected.

No donor challenges PING's IdentityAuthority: all four matching donors assume IDs are already
minted and decide sameness between records. The sovereignty picture is clean: IdentityAuthority
mints, EvidenceAuthority records the match computation, Owner Assertions (or deterministic rules)
promote. NEW AUTHORITIES: 0 across all candidates.

## 3. Gaps and falsifier actions

1. Pig unreachable; current PING implementation claims keyed to memory evidence, NOT to a live
   checkout. Falsifier must verify HEAD (expected branch fyd/sprint-integration-2026-09-24, last
   known c93a7ced) and confirm: (a) no blocking/match-scoring subsystem exists; (b) whether
   ingestion collapses on single fields anywhere (the program-law violation to hunt for).
2. License pins verified via GitHub API 2026-09-27 (spdx + root license path). File-level header
   audit NOT done; required before any code touch per program law.
3. No clones made (GitHub API reads only); nothing to clean in ~/workspace/harvest/research/.
4. No PING/FYD writes, branches, or commits made in this pass. Research only.
5. candidates.json merge NOT performed by this researcher (registry is coordinator-owned);
   candidate-registry rows are provided in each record above for the parent to merge. Verified
   none of dedupeio/dedupe, moj-analytical-services/splink, J535D165/recordlinkage,
   zentity-io/zentity exist in candidates.json today; ATProto row exists and must only gain
   mechanisms.

## 4. Decisions roll-up

- python-dedupe (dedupeio/dedupe @ 3f61e79102910bd355e920a2df7e44c14c9cb247, MIT): BACKLOG
- splink (moj-analytical-services/splink @ 473f0f7fdb19916e4dbdf1c420a1a8c0b0cf9953, MIT): BACKLOG
- python-recordlinkage (J535D165/recordlinkage @ b93d97641952f8c85106be5794ca93b1f1298fbc, BSD-3-Clause): BACKLOG
- zentity (zentity-io/zentity @ ecddfab82b68379d223beac108714a92831a4dba, Apache-2.0): REJECT
- ATProto identity separation (existing row, pin re-verified): BACKLOG, new mechanisms appended
- Writer gate: 0 of 4 actionable donors pass question 1 (no live defect demonstrated); no writer
  receives work. Research continues.
