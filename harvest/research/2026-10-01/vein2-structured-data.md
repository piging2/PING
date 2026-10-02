# Vein 2: Structured data extraction, research paper 2026-10-01

Researcher: vein-2 lane. Binding law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md.
PIG-side checkout verified live: /home/nolan/projects/ping, branch fyd/builder-harvest-trackc-2026-09-28, HEAD f94bba39e6b4e21827b3b2ca58972a96c146d0ea. All PING claims keyed to that HEAD. READ-ONLY; nothing on the Pig was touched, no branches, no commits.

Vein-2 arrow edge: URL -> ACQUISITION -> OBSERVATION -> EVIDENCE -> SEMANTIC EXTRACTION.
Law: PARSER OUTPUT IS NOT TRUTH; output must still enter RAW OBSERVATION -> EVIDENCE -> SEMANTIC EXTRACTION.

Scope: deepen the REST of vein 2. The 2026-09-28 extruct microdata harvest (commit 2532e5a51, NOT merged, NOT pushed) is prior work and is not redone here; it is referenced as current-PING state.

## 1. PING current implementation traced live at f94bba39

### 1.1 Structured-data discovery and expansion
- `src/fyd/proceduralize/structured-data.ts` (894 LOC)
  - `discoverStructuredData` (lines ~88-140): JSON-LD script-block regex discovery with per-block `{index, ok, raw, parsed, error}`; malformed blocks recorded, never fatal. Microdata harvest appended after JSON-LD blocks with continuing indices (lines 108-140); vocabulary-gate rejections ride as `!ok` blocks with `vocabRejection`.
  - `StructuredDataBlock` (lines ~68-86): keeps `raw` bytes per block; `syntax?: "json-ld" | "microdata"`; `vocabRejection`.
  - `expandJsonLdBlocks` (lines ~233-268): jsonld library flatten with an OFFLINE document loader that refuses every remote context (fail closed, no network in parse).
  - `entityCandidates` (lines ~311-352): blank nodes re-keyed by content hash (`blank:<sha256>`), allocation-order-free; keeps raw `typeIris` for evidence while exposing only schema.org-namespaced compact `types`.
  - Vocabulary gate (lines ~616-680): fail closed; UNKNOWN-vocabulary entities quarantined, producing no facts/relationships/entity records; evidence survives in `unsupported[]` and the `reconciliation[]` work-queue projection. Mixed entities keep known types only.
  - `UnsupportedEvidence` kinds (lines ~398-408): malformed-block, expansion-failed, unmapped-property, unmapped-node-type, site-chrome-node, unknown-vocabulary. Typed, never silent (G3 2026-09-24).
  - `StructuredRefDrop` outcomes (lines ~379-396): UNRESOLVED_TARGET, VOCABULARY_QUARANTINED, POLICY_SUPPRESSED.
  - `selectPrimaryBusiness` (lines ~845-894): deterministic scoring (same-host website +100, type rank, name +10, phone +5), ties break on entity key.
  - `LITERAL_FACTS` (lines ~451-484) and `PREDICATE_MAP` (lines ~496-522): fixed property tables.
- `src/fyd/proceduralize/microdata.ts` (383 LOC, landed via harvest/2026-09-28): itemscope/itemprop walk, extruct attribute precedence (content/href/src then text), nested itemscope recursion, schema.org TYPE FILTERING (LocalBusiness + subtypes, PostalAddress, OpeningHoursSpecification, Organization, Person; WebPage/menu noise dropped), JSON-LD-shaped output, `urn:microdata:` content-hash ids, no module state, `extractMicrodataWithRejections`. Zero lines copied from extruct (algorithm reference only), BSD-3-Clause attribution header.

### 1.2 Fact provenance, confidence, and the resolve cascade
- `src/fyd/proceduralize/proceduralizer.ts` (1436 LOC)
  - `ParsedFact` (lines ~93-120): name, value, sourceType, inferred, factClass, visibility, claimKind (`website_statement` | `feed_item`), evidenceDetail, extractor (name@version), property, entityId.
  - `FactClass` (lines ~47-64): DIRECT_FACT (Confidence 1.0), DERIVED_FACT, INFERENCE (emitted none by default), GENERATED_COPY, USER_OVERRIDE.
  - `provenance()` (lines ~415-450): emission choke point; every ExtractedField leaves with confidence (`f.inferred ? 0.7 : 1.0`), factClass, visibility, claimKind, evidenceRef. `evidenceRefForFact` (lines ~452-460): deterministic `web:<sha256(sourceType|name|value|entityId)[0:12]>`.
  - `SOURCE_PRIORITY` (lines ~141-150): `json-ld > microdata > opengraph > html-meta > rss > atom > sitemap > html`. Machine-readable truth first.
  - `resolve()` (lines ~466-508): one canonical value per field name; sorted by source priority then confidence; first verbatim value wins; inferred values fill gaps only; private fields filtered before merge (fail closed).
  - OG handling in `parseRich` (lines ~240-270): `extractMetaTags` regex; `og:` prefix -> `ogToField` map (only 4 keys: og:title->title, og:description->description, og:image->images, og:url->website; everything else `og:x` -> `x`); `description`/`keywords` -> html-meta; `<title>` -> html-meta title. No h1 extraction exists anywhere in the proceduralize/onboarding path (verified: zero `h1` hits). No `twitter:` handling at all.
  - Feed path: rss/atom bypass HTML extractors (channel-title misfire guard).
- `src/fyd/acquisition/static-adapter.ts` (327 LOC, lines ~229-268): acquisition-stage OG capture: first-wins per key into `openGraph`, `meta` for the rest, `<title>`, canonical link, JSON-LD blocks including unparseable evidence, `evidenceHash` of raw bytes. L1 observation keeps the raw page bytes hash.

### 1.3 Parser-truth boundary: how well it is honored in code
Honored strongly, stronger than any donor examined:
- Raw bytes retained per discovery block (`StructuredDataBlock.raw`); per-fact deterministic evidenceRef (content hash, not a pointer into mutable state).
- Every field carries factClass (Grill 7: generated sites never mix sourced truth with synthesis indistinguishably), confidence (1.0 verbatim / 0.7 inferred, always present when < 1), claimKind (website_statement default; feed_item for feeds), visibility with fail-closed withholding before resolve/projection.
- Vocabulary quarantine: unknown-vocabulary entities can never become canonical entities, never selected by selectPrimaryBusiness, never produce relationships (typed refDrops instead). Reconciliation queue makes UNKNOWN a work item (Nolan 2026-09-28), not a silent drop.
- Offline document loader: parse performs zero network fetches; remote contexts refused explicitly.
- Determinism: sorted keys, sorted relationships, sorted refDrops, byte-identical reruns (tests exist: structured-determinism.test.ts).

Gaps found (these are the harvest openings, not defects with live failures yet):
- G-A: no h1/title-cascade law. `extractTitle` takes raw `<title>` verbatim: no hierarchical-separator cleaning ("Name | Site" keeps the site suffix), no h1 substitution when `<title>` is missing/too long/too short. readability and trafilatura both have written cascades PING lacks.
- G-B: no `twitter:` -> `og:` documented fallback. PING reads `og:` meta tags and `name=` meta tags, but a `twitter:title` is never consumed, and the twitter->og->html fallback table is not a written law anywhere.
- G-C: the OG field map is 4 keys; og:site_name, og:type, og:locale, article:* etc. are dropped into bare `og:x` -> `x` names with no field mapping and no precedence position.
- G-D: confidence is binary (0.7/1.0); there is no per-field "which extraction rule fired" attribution (no donor examined has this either; it is a BACKLOG idea, not a donor mechanism).

## 2. Candidate records

### CANDIDATE V2-1: RDFa 1.1 processing discipline (pyRdfa3)

- AREA: RDFa parsing mechanics; how document-embedded semantics map to typed records; extraction discipline vs microdata/JSON-LD.
- CURRENT PING IMPLEMENTATION: none. PING parses JSON-LD (jsonld lib) and microdata (own port of extruct algorithm). RDFa is not discovered, not expanded, not vocabulary-gated.
- EXTERNAL IMPLEMENTATION: pyRdfa3 implements the full RDFa 1.1 Core processing algorithm as a recursive single-node step (`pyRdfa/parse.py`, 519 LOC, `_parse_1_1`): new-subject precedence `about -> resource -> href -> src` (parse.py line 206); typed-resource precedence `resource -> href -> src`, then blank node (lines 192-196); `typeof`+`property` chaining with hanging incomplete triples completed by child nodes; `@vocab`, `@prefix`, initial context with fixed prefix table (`initialcontext.py`); explicit RDFa 1.0 vs 1.1 bifurcation. extruct's `RDFaExtractor` (extruct/extruct/rdfa.py, 172 LOC at pin) wraps pyRdfa3 + rdflib and converts to JSON-LD-ish output with its own `_replaceNS` namespace resolution (prefix attr -> xmlns:* -> initial-context table) and a document-order `_fix_order` pass.
- EXACT REPO + SHA: RDFLib/pyRdfa3 @ d76b2cba86872ad35c6d3ae422d2b1454732520c (verified live via GitHub commits API 2026-10-01; last commit 2022-06-21, stale repo). extruct reference: scrapinghub/extruct @ a31daaadb82ec684b7d468d3b15734b8ae3b7265 (09-28 pin; commits-API re-verify returned HTTP 403 transport error this pass, but a fresh clone fetched and checked out the exact SHA successfully and `git rev-parse` echoed it: object exists, pin intact).
- LICENSE: W3C Software Notice and License (pyrdfa3/LICENSE, Copyright (c) 2018 W3C). Permissive; attribution/notice required on copies. extruct rdfa.py: BSD-3-Clause.
- MECHANISM WORTH HARVESTING: the attribute-precedence laws only: new-subject `about > resource > href > src`; typed-resource `resource > href > src > blank`; hanging-triple completion semantics; initial-context prefix table as data.
- WHY IT IS BETTER: it is not better for PING's arrow. PING's extraction target is business facts from schema.org-typed markup; RDFa's generality (arbitrary CURIE namespaces, full RDF graph with blank-node chaining) buys nothing on that arrow and would import the vocabulary-explosion problem PING's vocabulary gate was built to contain (2026-09-28). The 09-28 microdata port already covers the same corpus need (schema.org in HTML attributes) with type filtering.
- WHAT NOT TO COPY: the RDFa processor itself, rdflib graph model, blank-node chaining, the initial-context table, RDFa 1.0/1.1 bifurcation. A whole-parser port would be the forbidden RESEARCH -> COOL PROJECT -> PORT SUBSYSTEM move, and would contradict the vocabulary-gate law.
- PING AUTHORITY IT MUST REMAIN UNDER: structured-data stage (proceduralize), vocabulary gate. No new authority either way.
- MINIMAL PATCH: none proposed. If RDFa ever becomes a live gap (a prospect page with RDFa-only business markup), the correct move is ADAPT: extend microdata.ts's attribute walk with `property`/`typeof` handling under the same type filter, not import pyRdfa3.
- EXPECTED DELETION-SIMPLIFICATION: none.
- TEST THAT PROVES IMPROVEMENT: n/a; rejection. A future gate would be: fixture page with RDFa-only LocalBusiness markup, `discoverStructuredData` yields zero facts today (assert), proving the gap is real.
- BENCHMARK IF RELEVANT: none; corpus question, not a speed question.
- SECURITY CONSEQUENCES: pyRdfa3's graph_from_source can fetch remote contexts (network in parse); PING's offline-loader law is stricter. No security gain from adopting.
- MIGRATION-RISK: high if ported (new RDF dependency graph: pyRdfa is Python anyway; a TS port would be a rewrite). Zero as rejected.
- DECISION: REJECT (PING's vocabulary-gated schema.org extraction already owns this arrow; no live RDFa-only corpus evidence). The attribute-precedence law is recorded as PATTERN/REFERENCE ONLY.
- ESTIMATES: CURRENT PING LOC TOUCHED 0 / DONOR LOC EXAMINED 691 (parse.py 519 + rdfa.py 172) / ADDED 0 / REMOVED 0 / NET 0 / NEW DEPS 0 / NEW AUTHORITIES 0.

### CANDIDATE V2-2: microformats2 parsing discipline (mf2py)

- AREA: microformats2 parsing mechanics; extraction discipline vs microdata/JSON-LD; implied-property fallback laws.
- CURRENT PING IMPLEMENTATION: none. PING does not parse mf2 (`h-*` root classes, `p-/u-/dt-/e-` properties). No mf1/mf2 support.
- EXTERNAL IMPLEMENTATION: microformats/mf2py (Python). The parsing law is written as code with three harvestable sub-mechanisms:
  1. Implied properties (`mf2py/mf2py/implied_properties.py`, 193 LOC): when an h-* root has no explicit p-name/u-photo/u-url, the parser derives them by a FIXED, UNCONDITIONAL cascade with a uniqueness guard:
     - implied name: element `img`/`area` alt -> `abbr` title -> single non-root child/grandchild img alt or abbr title -> textContent with img->alt substitution (never src; cites microformats2-parsing issue #35 discussion).
     - implied photo: element img[src]/object[data] -> single non-root child/grandchild img/object; relative URLs resolved against base_url.
     - implied url: element a[href]/area[href] (empty href is valid) -> single non-root child/grandchild a/area; urljoin.
     - Uniqueness guard everywhere: the cascade fires only when EXACTLY ONE candidate child exists; nested mf2 roots are excluded so a child entity's data never leaks into the parent. This is the discipline PING's flat OG/title path lacks: PING has no written rule for when a fallback is allowed to fire.
  2. Value-class-pattern (`value_class_pattern.py`, 95 LOC): machine-readable value overriding human text: `value-title`[title], img/area alt, `data`[value], `abbr`[title], `del`/`ins`/`time`[datetime]; concatenated date parts. Strict element->attribute law.
  3. Datetime normalization (`datetime_helpers.py`, 62 LOC): dt-* values normalized to ISO via regexes (DATE_RE, DATETIME_RE, TIME_RE, TIMEZONE_RE).
  4. `metaformats` (`mf2py/mf2py/metaformats.py`, 89 LOC): a PRIORITY-ORDERED TABLE (`METAFORMAT_TO_MF2`, "in priority order, descending") mapping OGP/Twitter/HTML meta to mf2 properties with `setdefault` first-wins semantics, URL resolution for media props, og:type -> h-entry/h-cite/h-card mapping, and a `"source": "metaformats"` provenance tag on the emitted item. This is the cleanest written precedence cascade found in any donor this pass (see V2-3).
  5. Backcompat (`backcompat.py`): classic mf1 class names augmented to mf2 names from JSON rule files; explicitly marked experimental, mutates DOM copies with documented aliasing hazards.
- EXACT REPO + SHA: microformats/mf2py @ e4626be97bdf3526b735785be17eb4384452b58e (verified live via GitHub commits API 2026-10-01; commit 2026-09-18, signed).
- LICENSE: MIT (mf2py/LICENSE: Copyright (c) 2013, 2014 Tom Morris and contributors). Attribution only; clean to adapt with notice.
- MECHANISM WORTH HARVESTING: (a) the implied-property cascade SHAPE: fixed ordered fallback with a uniqueness guard and root-exclusion, applied to PING's title/description/image fallbacks; (b) the metaformats priority TABLE as data (not code) for the OG/Twitter cascade (claimed by V2-3); (c) value-class-pattern's element->attribute override law for datetime/address-ish machine values.
- WHY IT IS BETTER: PING's current fallback surface is one flat map plus raw `<title>`: no written rule for when a fallback may fire, no uniqueness guard, no machine-value override law. mf2py's implied-property rules are the most battle-tested statement of "derive a field from the document when the explicit signal is absent, but only under a strict guard" in the wild, with the guard (exactly-one-candidate, never-cross-root) preventing the false-positive class that a naive h1/title fallback would introduce.
- WHAT NOT TO COPY: the mf2 parser itself (root-class walking, mf2json output, the mf1 backcompat layer which is explicitly experimental and mutates DOM copies). PING must not grow a second structured-data syntax family; the 09-28 harvest already committed PING to JSON-LD + microdata only.
- PING AUTHORITY IT MUST REMAIN UNDER: structured-data stage (proceduralize) + SOURCE_PRIORITY law. No new authority.
- MINIMAL PATCH: none dispatched (research only; writer gate not run). The named future patch is: a written fallback-cascade table for page-scope title/description/image inside proceduralizer.ts parseRich, using mf2py's guard shape (ordered, first-nonempty-wins, uniqueness guard where applicable), ~40-60 LOC + fixtures. Gated on the 12-question gate (needs a live page where the current path yields a wrong/empty title).
- EXPECTED DELETION-SIMPLIFICATION: none expected; additive law.
- TEST THAT PROVES IMPROVEMENT: fixture: page with empty `<title>`, single h1, og:description present but og:title absent -> resolved title == h1 text today FAILS (empty), passes post-patch; plus a negative fixture: two h1s -> no h1 fallback fires (uniqueness guard).
- BENCHMARK IF RELEVANT: none.
- SECURITY CONSEQUENCES: none; pure function on already-fetched HTML. The urljoin behavior for implied photo/url must stay inside PING's existing URL validation (no new fetch).
- MIGRATION-RISK: low; additive, behind the same SOURCE_PRIORITY. Risk is false-positive titles; the uniqueness guard is the mitigation, proven by the donor.
- DECISION: HARVEST-narrow (implied-property guard shape + metaformats priority-table-as-data), BACKLOG pending the 12-gate (no live failure instance yet; G-A/G-B/G-C are real gaps but unproven against a live page).
- ESTIMATES: CURRENT PING LOC TOUCHED ~120 (parseRich OG/title section) / DONOR LOC EXAMINED 439 (193+89+95+62) / EXPECTED ADDED ~60 / REMOVED 0 / NET ~+60 / NEW DEPS 0 / NEW AUTHORITIES 0.

### CANDIDATE V2-3: OpenGraph / Twitter Cards property graph with deterministic precedence cascade

- AREA: OG/Twitter metadata extraction; the property-graph-with-fallback shape (og:title -> title -> h1 precedence laws); deterministic precedence cascade.
- CURRENT PING IMPLEMENTATION: `parseRich` in proceduralizer.ts (lines ~240-270): regex meta extraction, 4-key `ogToField` map, bare `og:x`->`x` passthrough, `<title>` as html-meta, no h1, no twitter:*. `resolve()` gives opengraph priority over html-meta, so og:title already outranks `<title>`, but the cascade itself is unwritten and incomplete.
- EXTERNAL IMPLEMENTATIONS (compared):
  1. readability `_getArticleMetadata` (mozilla/readability @ ab4027a8, Readability.js 2812 LOC, Apache-2.0): the canonical DOCUMENTED-IN-CODE cascade. Title: jsonld.title -> dc:title -> dcterm:title -> og:title -> weibo:article:title -> weibo:webpage:title -> meta name=title -> twitter:title -> parsely-title, then `_getArticleTitle()` fallback: `<title>` with hierarchical-separator cleaning ("A | B" -> "A", with a too-short guard that removes the FIRST part instead), colon handling with an h1/h2 exact-match check, and h1 substitution when `<title>` is >150 or <15 chars. Excerpt: jsonld.excerpt -> dc:description -> dcterm:description -> og:description -> weibo -> meta description -> twitter:description, then first `<p>` of article content as last resort. Byline: jsonld -> dc:creator -> dcterm:creator -> meta author -> parsely-author -> article:author (URL-valued authors rejected). Namespace-prefix regexes handle `property="og: title"` spacing variants and `name` dotted forms.
  2. mf2py metaformats (MIT, see V2-2): priority table OGP -> Twitter -> HTML meta -> `<title>`, first-wins via setdefault, `"source": "metaformats"` provenance tag, URL resolution for media, og:type -> entity-type mapping.
  3. extruct OpenGraphExtractor (BSD-3-Clause, extruct/extruct/opengraph.py, 45 LOC at pin): collects namespaced meta[property] pairs in document order with prefix-attr namespace resolution. NO cascade at all (honest negative: returns raw pairs).
  4. head-metadata (builder-group/community @ a71d8dba, npm head-metadata 0.1.0, MIT): streaming tokenizer extractor, no DOM build; `single` (first non-null wins, field omitted when empty) vs `collection` (all in document order) extractor kinds; title/meta/link/base extractors; attribute values decoded before callbacks. Extraction discipline: first-match-wins IS the precedence law for singles; document order preserved for collections (repeated og:image).
  5. DOCUMENTED (not code) Twitter->OG fallback table: twitter:title->og:title, twitter:description->og:description, twitter:image->og:image, twitter:card->og:type (archived official Cards Markup Tag Reference Dec 2023, corroborated by multiple current docs; X prefers twitter:* when present, falls back to og:*; `twitter:card` has no fallback). Label: DOCUMENTED (archived official) / OBSERVED (current docs agree).
- EXACT REPOS + SHAS:
  - mozilla/readability @ ab4027a8b37669745016869a37a504727992b2ba (verified live via GitHub commits API 2026-10-01; 2026-07-09).
  - microformats/mf2py @ e4626be97bdf3526b735785be17eb4384452b58e (same as V2-2).
  - scrapinghub/extruct @ a31daaadb82ec684b7d468d3b15734b8ae3b7265 (09-28 pin; see V2-1 note).
  - builder-group/community @ a71d8dba1813bfb32f28e25d41f222b5970c5fde (verified live via GitHub commits API 2026-10-01; 2026-09-15).
- LICENSES: readability Apache-2.0 (readability/LICENSE.md); mf2py MIT; extruct BSD-3-Clause; head-metadata MIT (package.json + LICENSE). All permissive; attribution required. No copyleft anywhere in this candidate set.
- MECHANISM WORTH HARVESTING: the WRITTEN CASCADE ITSELF as a data table: a fixed, ordered, first-nonempty-wins fallback chain per field (title, description, image, site_name), spanning namespaces (json-ld > og > twitter > html-meta > h1), with readability's separator-cleaning rule for `<title>` and the documented twitter->og fallback table. Plus head-metadata's single-vs-collection extractor-kind distinction for repeated tags (og:image as collection in document order vs title as single).
- WHY IT IS BETTER: PING's cascade exists only implicitly (SOURCE_PRIORITY + a 4-key map). The donors prove three things PING lacks: (1) `<title>` verbatim is the wrong last resort; separator cleaning + h1 substitution is the proven law (G-A); (2) twitter:* is a real namespace with a DOCUMENTED fallback direction (twitter first, then og), currently invisible to PING (G-B); (3) writing the cascade as a table makes the law auditable and testable, which is the PING way (evidence over assertion).
- WHAT NOT TO COPY: readability's parser (article scoring, DOM rewriting) - vein-1 territory, not this candidate; extruct's pair-dump (no cascade); a DOM-building extractor (PING's regex path is fine and cheaper; head-metadata's streaming idea is noted but PING already parses HTML with node-html-parser in static-adapter).
- PING AUTHORITY IT MUST REMAIN UNDER: structured-data stage (proceduralize); SOURCE_PRIORITY stays the cross-syntax law; the cascade is intra-page-scope only. No new authority.
- MINIMAL PATCH: none dispatched. Named future patch: `TITLE_CASCADE` / `DESCRIPTION_CASCADE` / `IMAGE_CASCADE` tables in proceduralizer.ts + `twitter:` namespace handling in extractMetaTags + h1 lane with mf2py's uniqueness guard + separator cleaning ported from readability's _getArticleTitle (~60-80 LOC + fixtures). Writer gate not run.
- EXPECTED DELETION-SIMPLIFICATION: replaces the 4-key ogToField map with the table; small net add.
- TEST THAT PROVES IMPROVEMENT: fixtures: (1) og:title absent, twitter:title present -> title from twitter; (2) twitter absent, og present -> og (fallback direction); (3) `<title>"Acme Plumbing | Grand Junction CO"` -> cleaned "Acme Plumbing"; (4) empty title + single h1 -> h1; (5) two og:image tags -> both preserved in document order.
- BENCHMARK IF RELEVANT: none.
- SECURITY CONSEQUENCES: none; pure functions on fetched HTML. Note: image URLs from og:image must flow through existing URL validation before any fetch (already the law elsewhere).
- MIGRATION-RISK: low; page-scope facts only, SOURCE_PRIORITY unchanged, resolve() semantics unchanged. Risk is title churn on existing tenants; mitigate with a before/after fixture run over live tenant pages at gate time.
- DECISION: HARVEST-narrow (the written cascade table + separator law + twitter->og documented fallback), BACKLOG pending the 12-gate. extruct-opengraph sub-decision: REJECT (no cascade; pair dump adds nothing). head-metadata sub-decision: PATTERN/REFERENCE ONLY (single-vs-collection kind distinction; streaming design noted).
- ESTIMATES: CURRENT PING LOC TOUCHED ~60 (parseRich meta section + ogToField) / DONOR LOC EXAMINED ~3000 (readability 2812 skimmed for _getArticleTitle/_getArticleMetadata ~150 LOC read closely; metaformats 89; opengraph 45; head-metadata 163) / EXPECTED ADDED ~80 / REMOVED ~15 / NET ~+65 / NEW DEPS 0 / NEW AUTHORITIES 0.

### CANDIDATE V2-4: the parser-truth boundary (comparative: which donors treat parser output as provisional)

- AREA: explicit law that parser output is provisional: confidence scores, per-field provenance, raw-snippet retention alongside parsed claims.
- CURRENT PING IMPLEMENTATION: the strongest of everything examined (see section 1.3): FactClass, binary confidence, claimKind, visibility fail-closed, deterministic evidenceRef, per-block raw retention, vocabulary quarantine, reconciliation queue, typed unsupported evidence, offline parse.
- EXTERNAL IMPLEMENTATIONS (compared, all negative or partial):
  1. trafilatura (adbar/trafilatura @ 96e19b949c3ac4a9e193b41fe2fb352e7150db86, Apache-2.0, verified 2026-10-01): closest partial. `Document` (settings.py lines 200-225) retains BOTH `raw_text` and cleaned `text` (a raw-retention envelope), plus `fingerprint` (deduplication.py `content_fingerprint`) and `id`. `favor_precision`/`favor_recall` (main_extractor.py lines 586-604, `options.focus`) make extraction aggressiveness EXPLICIT and configurable, the weakest honest form of confidence: the caller declares the tradeoff instead of the parser pretending certainty. Metadata extraction bootstraps from OpenGraph (`examine_meta` <- `extract_opengraph`) then layers meta tags, with its own title cascade (single-h1 -> XPaths -> `<title>` segments -> first h1 -> first h2). No per-field confidence, no provenance of which rule fired.
  2. readability (same pin): internal candidate scoring exists (`_grabArticle` scores nodes by class/id weight) but the score is DISCARDED; `parse()` returns bare title/byline/content/excerpt with no score, no provenance, no raw. Negative example: scoring without retention is not a truth boundary.
  3. mf2py (same pin): returns bare mf2json dicts; implied properties are applied silently (no flag that a value was implied vs explicit); only provenance is the `"source": "metaformats"` tag. Partial credit for the tag.
  4. extruct (same pin): returns bare extracted dicts; no confidence, no provenance, no raw retention (PING's `StructuredDataBlock.raw` already exceeds it).
- EXACT REPO + SHA: adbar/trafilatura @ 96e19b949c3ac4a9e193b41fe2fb352e7150db86 (verified live via GitHub commits API 2026-10-01; commit 2026-09-30, signed). Others reuse V2-1/V2-2/V2-3 pins.
- LICENSE: Apache-2.0 (trafilatura/LICENSE). Clean.
- MECHANISM WORTH HARVESTING: (a) trafilatura's dual `raw_text`/`text` retention as the per-extraction envelope (PING has per-block raw; the per-fact snippet is G-D-adjacent but no donor proves it needed); (b) the explicit precision/recall focus flag as the honest way to parameterize extraction aggressiveness; (c) mf2py's `source` tag pattern (PING already has sourceType + extractor, so this is confirmation, not a gap).
- WHY IT IS BETTER: it is not better. No donor examined has an explicit provisionality law stronger than PING's FactClass/confidence/claimKind/quarantine machinery. This is a REJECT (PING WINS) result with two PATTERN notes.
- WHAT NOT TO COPY: trafilatura's extractor, readability's scorer, any new confidence framework. PING must not invent a third confidence scale.
- PING AUTHORITY IT MUST REMAIN UNDER: structured-data stage. No new authority.
- MINIMAL PATCH: none. If a future writer wants G-D (per-field rule attribution), the design is already constrained: extend `evidenceDetail` (already exists on ParsedFact) with the rule name that fired. No donor code needed.
- EXPECTED DELETION-SIMPLIFICATION: none.
- TEST THAT PROVES IMPROVEMENT: n/a (rejection). The standing proof is the existing suite: structured-data.test.ts + structured-determinism.test.ts + microdata test.
- BENCHMARK IF RELEVANT: none.
- SECURITY CONSEQUENCES: none.
- MIGRATION-RISK: zero (no change).
- DECISION: REJECT (PING WINS) on the boundary-law question. trafilatura raw_text/fingerprint and the precision/recall focus flag recorded as PATTERN/REFERENCE ONLY.
- ESTIMATES: CURRENT PING LOC TOUCHED 0 / DONOR LOC EXAMINED ~700 (metadata.py 545 read in the extraction-relevant sections; settings.py Document; main_extractor focus flags) / ADDED 0 / REMOVED 0 / NET 0 / NEW DEPS 0 / NEW AUTHORITIES 0.

## 3. License and pin ledger (all verified 2026-10-01 unless noted)

| Repo | SHA (40-char) | Verified | License (from repo file) |
|---|---|---|---|
| microformats/mf2py | e4626be97bdf3526b735785be17eb4384452b58e | GitHub commits API, 2026-10-01 | MIT (mf2py/LICENSE) |
| RDFLib/pyRdfa3 | d76b2cba86872ad35c6d3ae422d2b1454732520c | GitHub commits API, 2026-10-01 | W3C Software Notice and License (pyrdfa3/LICENSE) |
| mozilla/readability | ab4027a8b37669745016869a37a504727992b2ba | GitHub commits API, 2026-10-01 | Apache-2.0 (readability/LICENSE.md) |
| adbar/trafilatura | 96e19b949c3ac4a9e193b41fe2fb352e7150db86 | GitHub commits API, 2026-10-01 | Apache-2.0 (trafilatura/LICENSE) |
| scrapinghub/extruct | a31daaadb82ec684b7d468d3b15734b8ae3b7265 | 09-28 pin; this pass: fresh clone fetched + checked out the exact SHA, rev-parse echoed it (commits-API re-verify hit HTTP 403 transport error, not evidence of absence) | BSD-3-Clause (extruct/LICENSE) |
| builder-group/community | a71d8dba1813bfb32f28e25d41f222b5970c5fde | GitHub commits API, 2026-10-01 | MIT (package.json license field + LICENSE) |

No AGPL/GPL/SUL in this candidate set. All clones live under ~/workspace/harvest/research/2026-10-01/ (mf2py, pyrdfa3, readability, trafilatura, extruct, head-metadata), checked out at the pinned SHAs. No clones older than 7 days were touched (directory was created today).

## 4. Writer-gate evaluations

None. No writer work is authorized from this researcher; no 12-gate was run. Two candidates are named HARVEST-narrow + BACKLOG (V2-2 implied-property guard shape; V2-3 written cascade table), each gated on a future 12-question evaluation with a live page proving G-A/G-B/G-C. Two candidates are REJECT (V2-1 RDFa port; V2-4 boundary-law search: PING WINS).

## 5. Scorecard (vein-2 researcher, this pass)

- Unique repository rows proposed: 5 (mf2py, pyRdfa3, readability, trafilatura, builder-group/community; extruct row already exists from 09-28, mechanism appends only).
- Mechanisms recorded: ~14 (implied name/photo/url cascades + uniqueness guard; value-class-pattern override law; datetime normalization; metaformats priority table + source tag + og:type mapping; RDFa attribute-precedence laws + hanging-triple completion; readability title/excerpt/byline cascades + separator cleaning + h1 substitution; trafilatura raw_text/text envelope + fingerprint + precision/recall focus; head-metadata single-vs-collection kinds; documented twitter->og fallback table).
- Decisions: HARVEST-narrow/BACKLOG x2 (V2-2, V2-3), REJECT x2 (V2-1, V2-4), PATTERN/REFERENCE ONLY notes x4 (RDFa precedence law, head-metadata kinds, trafilatura focus flag, readability scoring as negative example).
- Donor LOC examined: ~4,700 (counted from the files actually read; readability skimmed beyond the ~150 LOC read closely, counted honestly above in V2-3).
- Net PING LOC changed: 0. New deps: 0. New authorities: 0.
- Em-dash scan: this paper was written without em dashes.

## 6. Open questions for the coordinator / future passes

1. The 09-28 microdata commit (2532e5a51) is still unmerged and unpushed; the V2-2/V2-3 BACKLOG patches would build on top of it. Merge sequencing matters.
2. G-A/G-B/G-C need a live page proving the gap (12-gate Q1/Q2) before any writer dispatch. Good hunting ground: prospect pages with empty `<title>`, twitter-only cards, or h1-as-title patterns.
3. Candidate for a future vein-2 pass: JSON Feed / RSS content:encoded extraction discipline (feedFacts path) was not examined this pass.
