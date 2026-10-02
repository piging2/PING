# Lane 2: Digital Twin / Knowledge Representation
## Ecosystem Harvest Sweep 2026-09-30 (Reader Lane 2 of 10)

Reader: subagent lane 2. Date: 2026-09-30. Mode: read-only reconnaissance. Nothing installed, no dependencies added, no repo modified. This file is the only write.

Domain brief: entity-resolution, knowledge-graph, provenance, and semantic-model patterns that improve OBSERVATION -> EVIDENCE -> CLAIM -> OBJECT -> RELATIONSHIP -> OWNER DECISION. Target patterns: entity stitching, temporal facts, conflicting-source representation, confidence representation, provenance attachment, reversible merges. NOT generic graph databases. Do not propose replacing Postgres or creating another truth store. Patterns only.

---

## 1. Search coverage: where I looked and what I found

### PING locations
- `/home/nolan/projects/ping` and `/home/nolan/projects/ping-fyd-converged`: **UNREACHABLE**. This VM has no `/home/nolan` (running as root on `/home/hatch`). Per Nolan's 2026-09-30 evening recheck, GitHub PING is still at 81b3248/main but the connected GitHub account returned nothing accessible, so remote state is UNVERIFIED for this pass and was not re-fetched.
- Workspace evidence used instead (local copies, treated as implementation evidence, not canonical truth):
  - `~/workspace/gateway-hardening/build/app/ping-runtime/` (orchestration + execution engine with MergeGate)
  - `~/workspace/p0-lane1/fixture/source/ping-runtime/` (fixture copies)
  - `~/workspace/fyd-lane/harvest-wave1/code-evidence/` (evidence_authority.js, unified_event_runtime.js, canonical_authority.js, canonical_workers.js, identity-authority files, ping-canonical-envelope.ts)
  - `~/workspace/ping-arch-audit/PING_ARCHITECTURE_AUDIT.md` (2026-09-19 forensic: worker pipeline, IdentityAuthority, evals)
- Prior-lane overlap check: `harvest-ledger/` contains only `2026-09-30-influencer-intelligence.md` (unrelated to this lane). `harvest-lanes-2026-09-30/` was empty when I started.

### FYD locations
- No standalone FYD repo reachable (FYD unavailable via connected GitHub per Nolan's recheck; UNVERIFIED).
- Local evidence: `~/workspace/fyd-lane/lane-c/work/object-types.ts` (ObjectView projection types), `~/workspace/fyd-lane/lane-c/dev-objects/`, `~/workspace/fyd-lane/harvest-wave1/*.md`.

### CRX mine
- CRX source lives on the Pig (`C:\Users\nolan\CRX`), not reachable from this VM.
- Evidence used: `~/workspace/your_files/crx-runtime-analysis/crx-runtime-file-by-file-analysis.md` (438-line forensic, read-only analysis of the Pig source). Key finding for this lane: `schemas/foundational-primitives.json` declares Provenance, Claims, Decisions, Facts, Rules, but `runtime/`, `replay/`, `events/` are README-only directories with no implementation; many "KEEP/complete" verdicts in CRX's own docs are contradicted by missing files on disk. Nothing in CRX is harvestable as running knowledge-representation code.

### External sources
- All six candidates verified against primary or strong secondary sources (official docs, specs, repos). Nothing in this report is invented. Where a detail comes from a secondary source, it is attributed.

---

## 2. Current state (what already exists)

### FYD CURRENT
FYD's object model is a **projection layer**, not a knowledge layer (`lane-c/work/object-types.ts`):
- Three layers, never collapsed: SOURCE STATE (PING-backed projection, digest-verified journal dump + media manifests), OWNER STATE (durable owner decisions such as order/visibility; source re-ingestion can never erase owner intent), DERIVED (deterministic transforms).
- `ObjectProvenanceView { kind, ref, derivedAt, label }`: one provenance record per rendered field, with a quiet customer-facing line (e.g. "Information from happyplacecarpentry.com").
- `ObjectCapability` list: actions render only when the underlying value exists (no fake buttons).
- What is missing: object identity is assumed from the PING object id (no stitching of near-duplicate businesses), one value per field (no preserved disagreement between sources), no temporal qualifiers on facts, no rank/deprecated concept.

### PING EXISTING
- Worker pipeline: DOCUMENT_IMPORT -> OBSERVATION_CREATED -> CLAIM_GENERATE -> ... -> REPLAY_VERIFY -> WITNESS_CREATE -> LINEAGE_CREATE -> PROJECTION_CREATE; `registerCanonicalWorkers()` registers observation, claim, classification, recommendation, projection, replay, witness, lineage workers. Correlation/causation threaded via `BaseWorker._emit`.
- IdentityAuthority: content-addressed IDs; duplicate ingestion structurally impossible (idempotent reingest). Dedup exists only at the exact-event level.
- EvidenceAuthority (`harvest-wave1/code-evidence/evidence_authority.js`): `accumulate` (resolve supporting events from ping_events), `verify` (recompute canonical hash + lineage + namespace consistency; Qdrant hits traced back to real PG events), `rank` (order by confidence x provenance x approval state). ADD-only: never mutates events.
- Confidence semantics (`canonical_workers.js`): explicit null distinguished from missing; inherits or nulls; NULLs propagate instead of being fabricated (tested by EVAL suite).
- What is missing (the gaps this lane targets): **no entity resolution** (nothing decides two observations describe the same real-world business; the only "merge" found in code is MergeGate for code-artifact merge queues, unrelated), **no temporal/valid-time facts**, **no conflicting-source representation** (disagreement is not modeled), **no reversible-merge machinery**, confidence is a bare number with a `confidence_source` field but no method/explanation attached.

### CRX HARVESTABLE
Nothing harvestable as running code for this lane. The mine is useful only as a negative result: CRX's knowledge primitives (Provenance, Claims, Facts) exist as frozen definitions and README-only directories, not implementations. Harvest classification for the whole CRX knowledge surface in this lane: REFERENCE (aspirational schema vocabulary) with a falsification note that the code does not exist.

---

## 3. Candidate evaluations

### Candidate 1: Wikidata statement model (ranks + references + qualifiers)

PRODUCT NEED -> The business-object layer needs conflicting-source representation, temporal facts, and per-claim provenance. Two sources disagree about a business fact (phone number, hours, services offered); both must be preserved, the consumer sees the current best answer, and the loser is never silently deleted. Facts need "true at a time" (hours changed in March; owner tenure 2019-2024).

FYD CURRENT IMPLEMENTATION -> `ObjectProvenanceView` carries one provenance record per field. Owner corrections live in the owner store and survive re-ingestion. No multi-value-per-field model, no rank, no temporal qualifier; source disagreement is invisible in the render.

PING EXISTING IMPLEMENTATION -> Claim workers generate claims from observations; `canonical_workers.js` has null-safe confidence inheritance; EvidenceAuthority verifies and ranks evidence. No preferred/normal/deprecated concept; no temporal qualifiers; no preserved multi-source disagreement; `ping-canonical-envelope.ts` has only a "shallow content patch (right-wins)" merge.

CRX HARVESTABLE IMPLEMENTATION -> `schemas/foundational-primitives.json` declares Claims/Provenance/Facts, but the forensic shows no running implementation. Nothing to harvest.

EXTERNAL IMPLEMENTATION -> Wikidata/Wikibase data model (verified via the Wikibase RDF mapping writeup at w3c/rdf-ucr issue 24, the Wikidata glossary, and the arXiv qualifier taxonomy 2603.11767): a **Statement** = main snak (subject, predicate, object) + **qualifiers** (n-ary context, including P580 start time, P582 end time, P585 point in time, P1932 "object named as", P459 "determination method or standard") + **references** (P248 "stated in", retrieval date) + **rank** (preferred / normal / deprecated) + rank reasons (P2241 reason for deprecated rank, P7452 reason for preferred rank). Values can be no-value or some-value. Fifteen years of production edge cases behind this shape.

REACHED/UNREACHED -> REACHED, verified.

DUPLICATION RISK -> Low if we port only the shape. High if anyone imports Wikibase itself (PHP monolith). Take the data-model idea, not the software.

SECURITY/TRUST BOUNDARY -> References are pointers to sources, not trust certificates; PING's own verification (EvidenceAuthority) stays the trust choke point. Rank must be set by policy or owner authority, never by the asserting source itself, or a source can promote its own claims.

SMALLEST DELTA -> Extend the PING claim schema in Postgres (no new store): `claim.rank` in {preferred, normal, deprecated}, `claim.references[]` (source event ids + retrieval time), `claim.qualifiers` (valid_from / valid_until / point_in_time, determination method), `rank_reason`. Witness/replay untouched. FYD `ObjectView` gains rank + alternates rendering on top of the existing `ObjectProvenanceView`.

WHAT WE NEVER WRITE -> Our own ad-hoc disagreement model, our own temporal-qualifier vocabulary, our own no-value/some-value semantics.

-> **ADAPT** (Harvest-map: PATTERN GOLD)

---

### Candidate 2: W3C PROV (provenance data model and ontology)

PRODUCT NEED -> Provenance attachment: every claim and evidence item traceable to its source entity, the generating activity, and the responsible agent, in an interoperable vocabulary.

FYD CURRENT IMPLEMENTATION -> `ObjectProvenanceView { kind, ref, derivedAt, label }`. Ad-hoc, internal vocabulary.

PING EXISTING IMPLEMENTATION -> LineageWorker emits LINEAGE_CREATED events; every worker preserves namespace/correlation/causation via `BaseWorker._emit`; EvidenceAuthority traces derived results back to source PG events. Structurally close to `prov:wasDerivedFrom` chains, but the vocabulary is PING-internal.

CRX HARVESTABLE IMPLEMENTATION -> Foundational primitives declare Provenance; no implementation. Nothing to harvest.

EXTERNAL IMPLEMENTATION -> W3C PROV family, Recommendation since 30 April 2013 (PROV-DM data model, PROV-O OWL ontology, PROV-N notation, PROV-XML). Three core classes: Entity (the thing), Activity (extraction, classification, merge, review), Agent (person, organization, software). Relations: `wasGeneratedBy`, `used`, `wasDerivedFrom`, `wasAttributedTo`, `wasAssociatedWith`, plus timestamps. Verified via w3.org/TR pages (prov-dm, prov-o, prov-overview) and the Wikipedia summary. Design note from a verified secondary source worth keeping: "Provenance is evidence about production, not a truth certificate" (it tells you which link to test, it does not certify the result).

REACHED/UNREACHED -> REACHED, verified.

DUPLICATION RISK -> None if reference-only. Medium if we rewire PING's event schema to PROV-O natively (churn with no consumer).

SECURITY/TRUST BOUNDARY -> Do not let a PROV serialization imply verification. PING's lineage events stay authoritative internally; PROV is the export dialect.

SMALLEST DELTA -> Zero code changes. Adopt PROV-O as the documented export/interchange mapping for lineage events when PING data leaves the system (API responses, evidence packages, partner feeds). One mapping doc.

WHAT WE NEVER WRITE -> Our own provenance interchange vocabulary.

-> **REFERENCE** (Harvest-map: PATTERN GOLD, reference-only)

---

### Candidate 3: Splink (Fellegi-Sunter probabilistic record linkage)

PRODUCT NEED -> Entity stitching: observations from different sources (Facebook Page, website scrape, directory listing, review site) describe the same real-world business; PING must resolve them to one object with an explainable confidence, and route ambiguous cases to review instead of guessing.

FYD CURRENT IMPLEMENTATION -> Object identity is assumed from the PING object id. Near-duplicate businesses (e.g. "Happy Place Carpentry" vs "Happy Place Platform") would render as separate objects. No stitching, no review queue.

PING EXISTING IMPLEMENTATION -> Idempotent reingest dedups exact duplicate events via content-addressed IDs. Zero fuzzy or probabilistic resolution. No stitch/merge events anywhere in the worker pipeline.

CRX HARVESTABLE IMPLEMENTATION -> Nothing found.

EXTERNAL IMPLEMENTATION -> Splink (moj-analytical-services, UK Ministry of Justice; open source, actively maintained: v5.0 released 2026-09-28 per the repo README). Implements Fellegi-Sunter's canonical record-linkage model with EM parameter estimation: unsupervised (no training data), pairwise `match_probability` predictions, then clustering to estimated entity IDs. Explainability is a design principle: per-pair waterfall charts decompose exactly which field comparisons produced the score, so a wrong link can be interrogated ("trace it back and see exactly why the model made the decision", Splink ethics docs). Runs on DuckDB (README claims ~1M records on a laptop in about a minute) or Spark for 100M+. Verified via the GitHub README and docs.

REACHED/UNREACHED -> REACHED, verified. (License terms not verified in this pass; irrelevant to the verdict since the package itself is not adopted.)

DUPLICATION RISK -> Adopting Splink whole = a Python/Spark dependency inside a JS/Postgres runtime, for corridor-scale business data. Overkill and a foreign runtime. Hand-rolling an unexplained fuzzy matcher is the commodity trap we must avoid.

SECURITY/TRUST BOUNDARY -> Match decisions feed object identity, which feeds owner-facing truth; a wrong merge is a trust incident, not a stats problem. Splink's per-pair explainability matches PING's evidence culture. Threshold policy + REVIEW_REQUIRED queue mandatory; nothing below threshold may auto-merge.

SMALLEST DELTA -> ADAPT the pattern into PING's Postgres machinery, behind PING's own interface: (1) candidate blocking on indexed exact keys (domain, normalized name, phone) so there is no O(N^2) scan; (2) weighted field scoring ported from Fellegi-Sunter intuition (not the full EM); (3) every decision recorded as an event `{left_id, right_id, score, factor_breakdown, decided_by, decided_at, threshold_version}`; (4) below-threshold pairs go to a review queue, never auto-merged. Keep Splink itself as a REFERENCE implementation to calibrate and validate our scorer offline.

WHAT WE NEVER WRITE -> Our own probabilistic linkage theory from scratch; our own unexplained fuzzy matcher.

-> **ADAPT** (pattern into PING's Postgres resolver; the Splink package itself is REFERENCE for calibration, REJECT as a runtime dependency) (Harvest-map: PATTERN GOLD)

---

### Candidate 4: Senzing entity model (non-destructive resolution with re-evaluation)

PRODUCT NEED -> Reversible merges: undo a merge without data loss. Entities must be living groupings that re-decide as new evidence arrives, not destructive unions.

FYD CURRENT IMPLEMENTATION -> The non-destructive instinct already exists: OWNER STATE is separate from SOURCE STATE and source re-ingestion never erases owner intent. No entity lifecycle at the object layer.

PING EXISTING IMPLEMENTATION -> ADD-only event store (EvidenceAuthority "never mutates events, only reads"); idempotent ingest. But there is no entity-level merge semantics at all, so nothing to reverse yet.

CRX HARVESTABLE IMPLEMENTATION -> Nothing found.

EXTERNAL IMPLEMENTATION -> Senzing's entity-resolution model (verified via Senzing's "Entity-Centric Learning" doc and independent field notes): strict **Record vs Entity vs Relationship** separation. Records keep their source identity (`DATA_SOURCE` + `RECORD_ID`); an Entity is a resolved real-world object that multiple records describe; relationships are separate. Key principles: **sequence neutrality** (new data can re-evaluate and correct prior decisions regardless of load order), **real-time self-correction** (a new record that reveals an alias corrects earlier decisions automatically), **ambiguous conditions withheld** (a record matching two entities equally is held as ambiguous until more data arrives, instead of being forced into one). The API surfaces `AFFECTED_ENTITIES` on every add/delete, and `GetEntity` returns the entity's current record membership, so consumers build their own entity-lifecycle model on top of primitives. Supplementary REFERENCE patterns found during research: the openkos merge/unmerge spec (sidecar ledger; unmerge restores survivor and absorbed state byte-for-byte; LIFO unwind with explicit ordering rules) and the typegraph merged-pointer pattern (absorbed entity marked `merged` with `mergedIntoEntityId`, target id stays stable; delete = invalidate with provenance preserved, purge only on explicit request).

REACHED/UNREACHED -> REACHED (vendor docs and independent notes; engine internals proprietary, but the model is documented).

DUPLICATION RISK -> Adopting Senzing = a native engine plus a separate data store = a second truth store. Prohibited by this lane's constraints and by PING's constitutional rule of one.

SECURITY/TRUST BOUNDARY -> Entity identity is derived truth; it must never silently rewrite owner-facing objects. Merge/split decisions must be first-class replayable events, and ambiguous cases must stay undecided rather than forced.

SMALLEST DELTA -> No code yet; this is a LEARN for when PING builds resolution (Candidate 3's scorer needs it): (1) source records immutable, never destructively merged; (2) entity = derived grouping with membership events; (3) re-evaluation on new evidence as events, not silent mutation; (4) withhold ambiguous; (5) AFFECTED_ENTITIES-style events feeding PING's existing mission/event bus.

WHAT WE NEVER WRITE -> A destructive merge that deletes records; a merge with no audit trail; a forced decision under uncertainty.

-> **LEARN** (Harvest-map: PATTERN GOLD, principles only; the product itself is REJECT as a second truth store)

---

### Candidate 5: Datomic datoms (immutable facts with transaction time)

PRODUCT NEED -> Temporal facts: facts true at a time; query the world as-of a date ("what did we believe about this business on March 1?"); full field history without hand-built audit tables per table.

FYD CURRENT IMPLEMENTATION -> `ObjectProvenanceView.derivedAt` timestamps each field's provenance; owner store is durable. No as-of reads; no history of how a field's value changed.

PING EXISTING IMPLEMENTATION -> Append-only `ping_events` with timestamps; replay convergence is tested by the EVAL suite. But the transaction/ingest is not a first-class queryable entity, and there is no valid-time axis; answering "as-of" today requires running replay machinery.

CRX HARVESTABLE IMPLEMENTATION -> CRX's frozen constitutional spec mentions a Temporal pivot, aspirational only. Nothing running.

EXTERNAL IMPLEMENTATION -> Datomic (Cognitect/Nubank). Everything is an immutable **datom**: `[entity attribute value transaction added?]`. A change is a new fact asserted at a new transaction; nothing is overwritten. `d/as-of` queries any past state; `d/history` gives a field's full history. Transactions are first-class entities that can be annotated (who, why, correlation id). Verified via dbdb.io and multiple engineering writeups. Honest caveat from a verified secondary source (AletheiaDB's Datomic migration guide): Datomic has **one** time axis, transaction time. "When was this true in the real world?" (valid time) is not first-class; users fake it with domain effective-date attributes. Late-arriving corrections ("what did we believe at 5pm Friday?") need true bitemporality, which is a separate design decision with real index/query cost.

REACHED/UNREACHED -> REACHED, verified.

DUPLICATION RISK -> Adopting Datomic = replacing Postgres. Explicitly prohibited by this lane and by standing program law.

SECURITY/TRUST BOUNDARY -> Transaction time must be system-assigned and never forged (the same invariant PING's event store already follows). Valid-time claims come from sources and stay marked as source claims.

SMALLEST DELTA -> ADAPT two ideas into Postgres, no new store: (1) make the transaction/ingest a first-class row (with who/why/correlation id) that facts reference, so "why did we believe X on date Y" is a query, not a replay run; (2) add `valid_from` / `valid_until` to the claim/fact table for the valid-time axis Datomic lacks (bitemporal-lite). PING's append-only events already give the transaction-time half for free.

WHAT WE NEVER WRITE -> Hand-rolled audit tables per table; a valid-time model invented from scratch (bitemporal modeling is decades of literature).

-> **ADAPT** (the two patterns, into Postgres; Datomic as a product is REJECT, it would replace Postgres) (Harvest-map: PATTERN GOLD)

---

### Candidate 6: RDF 1.2 reification (statement identity vs assertion identity)

PRODUCT NEED -> Confidence representation and provenance attachment at the claim level: attach confidence, source, and evidence-state to a claim without duplicating the claim, and represent "two sources assert the same statement" as one statement with two assertions.

FYD CURRENT IMPLEMENTATION -> Provenance is attached per rendered field view; no claim identity distinct from its rendering.

PING EXISTING IMPLEMENTATION -> Claims are generated from observations with content-addressed object IDs, but there is no canonical "statement id" separate from the "assertion record" (who asserted it, in what evidence state). The same fact arriving from two sources would produce two claims, not one claim with two assertions.

CRX HARVESTABLE IMPLEMENTATION -> Nothing running.

EXTERNAL IMPLEMENTATION -> W3C RDF 1.2 (Concepts at Candidate Recommendation, April 2026 snapshot; verified via w3.org/TR/rdf12-concepts as quoted in the sparq-org and semantic-fabric research docs, plus the W3C ISWC 2025 tutorial materials): triple terms may appear in object position; a **reifier** node links via `rdf:reifies` to the triple term, and further statements (confidence, source, time) attach to the reifier. The design lesson, stated crisply in a verified secondary analysis: **statement identity** (hash of canonical subject/predicate/object) and **assertion identity** (hash of statement + source + state) are different objects. Two sources asserting one statement, or one statement in two evidence states, are two assertion records over one statement id, never two statements. A claim without commitment is representable (a quoted triple references a proposition without asserting its truth), which matches PING's "comment is an observation, not knowledge" ethos.

REACHED/UNREACHED -> REACHED, verified.

DUPLICATION RISK -> Low as a schema idea. High if anyone adopts an RDF triple store (another truth store; prohibited).

SECURITY/TRUST BOUNDARY -> Assertions carry the trust metadata; the statement stays truth-neutral. This is exactly PING's layered truth (source vs derived vs presented), and the schema should enforce it rather than rely on convention.

SMALLEST DELTA -> ADAPT into the Postgres claim schema: a `claim` row = canonical statement (content hash of subject/predicate/object); `assertion` rows = (claim_id, source_event_id, evidence_state, confidence, asserted_at). Dedup falls out naturally: the same statement from two sources is one claim with two assertions. This composes directly with Candidate 1's ranks/references.

WHAT WE NEVER WRITE -> Our own claim-identity scheme; our own reification dance.

-> **ADAPT** (schema idea into Postgres; an RDF store is REJECT) (Harvest-map: PATTERN GOLD)

---

## 4. What code can we delete or never write

Nothing existing is duplicated by these candidates (they fill gaps, they do not overlap current machinery), so there is nothing to delete. What we never write:

1. Our own disagreement/conflict data model (Wikidata's statement shape covers ranks, references, qualifiers, no-value/some-value).
2. Our own provenance interchange vocabulary (W3C PROV).
3. Our own probabilistic linkage theory or unexplained fuzzy matcher (Splink's Fellegi-Sunter pattern + calibration reference).
4. A destructive entity merge with no audit trail, or forced decisions under uncertainty (Senzing's record/entity separation + withheld ambiguity).
5. Hand-rolled audit/history tables or a from-scratch valid-time model (Datomic's datom + transaction-time pattern, extended to bitemporal-lite).
6. Our own claim-identity scheme (RDF 1.2 statement/assertion split).
7. A second truth store of any kind (no Wikibase, no Senzing engine, no Datomic, no RDF store, no new CRX authority). Every ADAPT above lands in the existing Postgres event/claim schema.

## 5. Ranked top candidates

1. **Wikidata statement model -> ADAPT.** One schema extension (rank + references + qualifiers on claims) buys preserved source disagreement, temporal facts, and per-claim provenance, and it renders directly through FYD's existing ObjectProvenanceView.
2. **RDF 1.2 statement/assertion identity split -> ADAPT.** Makes multi-source assertion and claim dedup natural in Postgres with zero new stores; composes with the Wikidata shape.
3. **Splink Fellegi-Sunter pattern -> ADAPT.** PING has no stitching at all; explainable pairwise scoring with a review queue fits the evidence culture, and Splink itself stays an offline calibration reference, never a runtime dependency.
4. **Datomic transaction-as-entity + valid-time axis -> ADAPT.** Turns "why did we believe X on date Y" into a query instead of a replay run; bitemporal-lite without replacing Postgres.
5. **Senzing entity model -> LEARN.** Record/entity/relationship separation, sequence-neutral re-evaluation, and withheld ambiguity are the principles PING's future resolver must follow; the product itself is rejected as a second truth store.

(W3C PROV: REFERENCE, export vocabulary only, no new machinery. CRX knowledge surface in this lane: REFERENCE with falsification note, no running code to harvest.)
