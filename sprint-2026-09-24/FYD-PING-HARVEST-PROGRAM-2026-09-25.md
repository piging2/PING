# FYD x PING — Maximum Harvest / Minimum Authority Program
Nolan, 2026-09-25 ~12:37 MDT. Binding, standing, DAILY. Status: ACTIVE (daily cron).

"Run this every day. I'd turn this into a harvest program, not an 'integrate every cool repo' program."

## Objective

Not: copy open-source projects into PING.
Instead: find the best existing implementation of every commodity or difficult mechanism we need, understand why it works, compare it against what PING already has, and harvest only the mechanism that makes our existing system better.

GO BROAD ON RESEARCH. GO NARROW ON WRITES.

## The filter (from the attached architecture)

Durable semantics: immutable evidence, compiled semantic objects, authorized intent/capabilities, projections.
Replaceable machinery: rendering, databases, vector indexes, protocols, browsers, transports.
Rule of One: one sovereign mechanism per consequential decision, not a new authority class for every noun.

## Preference order (strict)

REUSE EXISTING PING > ADAPT EXISTING PING > REFACTOR EXISTING PING > REPURPOSE EXISTING PING > HARVEST SMALL EXTERNAL MECHANISM > ADOPT EXTERNAL LIBRARY > NEW IMPLEMENTATION.

## Per-candidate record

repository, exact commit/SHA, license, file-level license exceptions, dependency/license implications, attribution requirements, copyleft/network-copyleft implications, patent clauses where relevant, security history, maintenance/activity signal.

Distinguish HARVEST IDEA/PATTERN from COPY/ADAPT SOURCE. Patterns may be learned broadly. Code transplantation requires compatible licensing and preserved attribution/notice. AGPL/GPL code does NOT casually enter PING.

## Decision taxonomy (every candidate gets one)

REUSE / ADAPT / REFACTOR / REPURPOSE / HARVEST / DEPEND / BACKLOG / REJECT.

REJECTION IS A SUCCESSFUL HARVEST RESULT. We are not trying to have the most technology. We are trying to have the best small set of mechanisms.

## Before modifying PING (mandatory sequence)

SEARCH current implementation. TRACE live consumer. PROVE concrete weakness. IDENTIFY harvested mechanism. CHECK license. WRITE/PRESERVE invariant test. PATCH smallest existing seam. DELETE displaced duplicate mechanism. RUN focused tests. RUN surrounding suite. FALSIFY. COMMIT. MERGE only when proven.

NEVER clone an entire external architecture merely because one mechanism is excellent. Examples: ATProto identity resolution excellent does not mean PING becomes ATProto. PostHog experimentation excellent does not mean PING becomes PostHog. Crawl4AI extraction excellent does not mean Crawl4AI owns PING acquisition. GrapesJS editing excellent does not mean FYD becomes GrapesJS. Temporal durability excellent does not mean Temporal becomes business truth. HARVEST THE MECHANISM. PRESERVE THE CONSTITUTION.

## Organization of each pass

Many researchers. Many falsifiers. Many benchmarkers. ONE WRITER PER MUTABLE SEMANTIC UNIT. Research swarms may be huge; writers may not.

## Priority veins (harvest first where it accelerates the current product arrow)

1. ACQUISITION / EXTRACTION: Crawl4AI (acquisition/extraction mechanics), Firecrawl (reference for Search → Scrape → Parse → Crawl → Map → Interact ladder; harvest patterns carefully, licensing/deployment boundaries), Lightpanda (cheaper JS/browser escalation path; must earn adoption via corpus benchmark), Playwright, Puppeteer, Trafilatura, Readability, extruct, JSON-LD tooling, sitemap/robots tooling, HTTP cache/revalidation. Harvest: URL normalization, SSRF defenses, redirect policy, DNS/IP validation, content-type detection, robots handling, sitemap discovery, canonical URL detection, structured metadata extraction, DOM pruning, main-content extraction, browser escalation, session handling, bounded crawling, crawl budgets, dedupe, incremental refresh, conditional requests, failure classification, deterministic extraction, anti-loop protection, resource limits. Target: HTTP → metadata → deterministic DOM → crawler → browser → learned bounded procedure. DO NOT CREATE A SECOND ACQUISITION AUTHORITY.
2. STRUCTURED DATA: schema.org, JSON-LD, microdata, RDFa, OpenGraph, Microformats, RSS/Atom/JSON Feed, sitemaps, contact extraction, address normalization, opening hours, services/products, people, organizations, locations, media metadata. OUTPUT MUST STILL ENTER: RAW OBSERVATION → EVIDENCE → SEMANTIC EXTRACTION. Parser output is not truth.
3. ENTITY RESOLUTION / IDENTITY: record linkage, identity matching, DID/handle/URL/business identity, contact normalization, probabilistic matching, deterministic blocking, conflict preservation. Inspect ATProto's separation of syntax/identity/DID/crypto/repository. NEVER collapse same name/URL/email/phone/provider account into automatic same-entity truth.
4. EVIDENCE + PROVENANCE: W3C PROV, content-addressed artifacts, Merkle structures, in-toto/SLSA, Git object identity, append-only evidence systems. Harvest evidence references, artifact digests, derivation links, selective commitments, provenance chains, reproducibility, source snapshots. Law: EVIDENCE IS IMMUTABLE. INTERPRETATION EVOLVES.
5. CONTRACT MECHANICS: versioned schemas, compatibility, unknown fields, extensions, deterministic migrations, generated types, canonical serialization. ATProto Lexicons = priority archaeology target. Also JSON Schema, Protobuf, Avro, OpenAPI, GraphQL evolution, CloudEvents. HARVEST CONTRACT MECHANICS. DO NOT BUILD A UNIVERSAL SCHEMA PLATFORM.
6. CANONICAL ENCODINGS: canonical JSON, CBOR canonicalization, Git, IPLD/CID, Merkle DAG. Compare against PING's existing canonical authority. Goal: SEMANTIC STATE → DETERMINISTIC BYTES → DETERMINISTIC HASH. Do not replace a proven authority for fashion.
7. ASK FYD RETRIEVAL / CITATION: LightRAG, GraphRAG, hybrid retrieval, BM25, Qdrant patterns, rerankers, citation-aware RAG, RAG evaluation. Harvest query decomposition, hybrid retrieval, graph expansion, reranking, context packing, retrieved-context return, citation binding, unsupported-answer detection, retrieval evaluation. Law: MODEL DOES NOT RETRIEVE TRUTH. MODEL CONSUMES COMPILED AUTHORIZED EVIDENCE.
8. EDITING (constrained): Puck, GrapesJS, Craft.js, React primitives, container queries, view transitions, a11y patterns. Harvest component registries, schema-driven controls, preview/apply, responsive container behavior, selection, history/undo, keyboard/focus, asset selection, patch representation. DO NOT IMPORT the generic page-builder worldview. FYD edits BUSINESS INTENT. Renderer compiles it. Current leverage stays: Ask FYD → owner correction → regeneration, then object interaction quality.
9. NETWORK / PROTOCOLS: ATProto (versioned Lexicons, generated typed clients, DID/handle identity, crypto primitives, repositories, sync, clean service separation — rich archaeology), ActivityPub (extensible object/activity/federation semantics), Nostr (radically simpler signed-event/relay model), Farcaster where open, Granary (translates among ActivityStreams/ActivityPub, ATProto, Nostr, Farcaster, feeds — inspect BEFORE writing any FYD cross-network translation code), Bridgy. Harvest identity, signatures, portable records, schema namespaces, federation, relay patterns, feeds, relationship representation, moderation boundaries, partial failure, protocol translation, sync, account linking. PING remains upstream identity/authority. NO FYDSocialAuthority.
10. AUTHORIZATION COMPILE: ATProto permission models, OAuth/OIDC, Macaroons, Zanzibar/OpenFGA/SpiceDB, capability security, attenuated tokens, UCAN. Harvest only what serves existing CapabilityAuthority. The FYD UX law: fine-grained internal authority must compile to human-understandable consequence ("Allow FYD to help maintain my website" → exact bounded capabilities internally).
11. OUTCOME ANALYTICS / EXPERIMENTATION: PostHog FOSS (events, funnels, replay, experiments, flags, workflows — flags+exposure+analytics+replay+experiments connected), GrowthBook (targeting, gradual rollout, CUPED, sequential/Bayesian analysis, holdouts, bandits, SRM checks; agent workflows use draft → review → publish). Maps to FYD's propose → authorize → execute → observe → learn loop. DO NOT CREATE MARKETING TRUTH. Outcome data becomes evidence: OBJECT → ACTION → OUTCOME → EVIDENCE.
12. MARKETING AUTOMATION (patterns only): Mautic, listmonk, Dittofeed, n8n patterns, campaign scheduling. Harvest audience compilation, suppression, consent, frequency limits, campaign state machines, scheduling, templates, delivery receipts, bounce handling, unsubscribe, idempotency, provider retries, UNKNOWN external outcomes. DO NOT IMPORT A MARKETING UNIVERSE. Campaign remains a PING/FYD object referencing real Business/Service/Offer/Audience/Location/Media.
13. MEDIA: image pipelines, responsive derivatives, object storage, content addressing, EXIF, transcoding, alt-text, licensing/provenance. Harvest digest-first identity, derivative manifests, responsive sizing, format negotiation, immutable originals, safe transforms, provenance/license metadata. NO MediaAuthority unless existing architecture already requires one.
14. ORCHESTRATION TRUTH: MCP implementations, durable task patterns, Temporal patterns (deterministic replay, activity boundaries, retry policy, heartbeat, cancellation, idempotency, effect reconciliation, UNKNOWN outcome), agent tool runtimes, bounded browser agents. Harvest tool contracts, structured results, async handles, cancellation, resumption, receipts, idempotency, UNKNOWN handling, human approval binding. DO NOT HARVEST another scheduler/mission runtime/event authority/capability authority. PING owns orchestration truth; external systems are executors/adapters.
15. TENANT RESEARCH ONLY: Postgres RLS, OpenFGA/SpiceDB patterns, multi-tenant vector isolation, cache key isolation, tenant-scoped encryption, privacy-preserving analytics. RESEARCH ONLY until a concrete defect demands implementation. Do not use harvest to launch a TenantOS rewrite.
16. PROJECTION IDENTITY: content-addressed builds, Bazel/Nix concepts, incremental compilers, memoization, dependency graphs. Harvest: REUSABLE COMPUTATION IDENTITY; regenerate only affected projections. NO REACTIVE DATABASE PROJECT.
17. PATCH MECHANICS: Git, JSON Patch, JSON Merge Patch, CRDTs, structured document editors, AST transforms. Need: BASE → PROPOSAL → DIFF → DIGEST → APPROVAL → EXACT PROPOSAL → APPLY → RECEIPT. No CRDT complexity without proven concurrent-editing need.
18. SECURITY (unusually high priority): SSRF, XSS, URL/HTML sanitation, CSP, CSRF, OAuth state/PKCE, secret projection, sandboxing, untrusted file parsing, archive/image bombs, redirect abuse, DNS rebinding, webhook/signature verification, rate limiting. Commodity defenses are better reused than reinvented.
19. PORTABILITY / EXPORT: ATProto repositories, ActivityStreams, JSON-LD, portable archives, content-addressed manifests. Question: can FYD export enough durable semantic material (identity, objects, relationships, evidence references, owner intent, capability history, projection inputs) for another implementation to reconstruct? Never expose private/internal accidents.

Do not allow veins 8-12 to block veins 1-7.

## Closed competitors

Do NOT pretend we know their source. Infer only from observable behavior: network calls, public APIs, published engineering material, browser behavior, documented schemas, SDKs, public patents/papers, job descriptions, public demos. Label every conclusion: OBSERVED / DOCUMENTED / INFERRED / SPECULATIVE. Never turn an inference into an architectural fact.

## Per-candidate report shape

AREA / CURRENT PING IMPLEMENTATION / EXTERNAL IMPLEMENTATION / EXACT REPO + SHA / LICENSE / MECHANISM WORTH HARVESTING / WHY IT IS BETTER / WHAT NOT TO COPY / PING AUTHORITY IT MUST REMAIN UNDER / MINIMAL PATCH / EXPECTED DELETION-SIMPLIFICATION / TEST THAT PROVES IMPROVEMENT / BENCHMARK IF RELEVANT / SECURITY CONSEQUENCES / MIGRATION-RISK / DECISION.

## The ruthless metric

Net architecture. The repository should get SMALLER where possible, CLEANER, MORE DETERMINISTIC, MORE TESTED, MORE SECURE, MORE PORTABLE, LESS DUPLICATED, AND MORE CAPABLE. The wrong harvest adds frameworks, authorities, services, abstractions. The right harvest often adds 20 lines and deletes 200, or replaces a fragile homegrown mechanism with one proven dependency, or changes nothing because PING already has the stronger implementation.

READ THE WORLD. STEAL THE LESSONS. COPY CODE ONLY WHEN LEGALLY AND TECHNICALLY CORRECT. REFACTOR INTO EXISTING SEMANTICS. DELETE THE INFERIOR DUPLICATES. KEEP PING SMALL. MAKE FYD EXTRAORDINARY.

## Nolan's protected nuance (2026-09-25)

A harvest program, not an "integrate every cool repo" program. Especially promising: Granary's translation layer (inspect before writing any FYD cross-network translation code) and the experimentation/outcomes vein (PostHog's connected flags/exposure/analytics/replay/experiments; GrowthBook's mature experiment machinery and draft → review → publish agent workflows map to propose → authorize → execute → observe → learn without a new marketing authority). Ruthless metric over everything: net architecture.

---

## WRITER GATE CORRECTION (Nolan, 2026-09-25 ~13:00 MDT, binding; supersedes any looser write authorization in this file)

EXCELLENT RESEARCH PASS. DO NOT START AN 8-WEEK PORTING PLAN. THE HARVEST PIPELINE IS AUTHORIZED. WHOLE-MECHANISM PORTS ARE NOT YET AUTHORIZED.

Movement is now law: RESEARCH → COMPARATIVE ARCHAEOLOGY → DEFECT PROOF → SURGICAL HARVEST → DELETE/REPLACE INFERIOR MECHANISM → TEST → COMMIT. Never RESEARCH → COOL PROJECT → PORT SUBSYSTEM.

### License record corrections (factual, correct the harvest database first)
- FIRECRAWL: upstream is primarily AGPL-3.0; SDKs and some UI components are separately MIT. Firecrawl core = PATTERN/REFERENCE ONLY. Any copied or adapted source requires file-level license verification. Never classify the repository globally as MIT.
- GRANARY: public domain / CC0 per its repository. Protocol-translation archaeology; do not import translation machinery until a live FYD/PING consumer exists.
- N8N: Sustainable Use License with separate enterprise-only portions. Research/watch only, never an ordinary permissive donor.
- POSTHOG: path-level licensing; the repository explicitly separates ee/ from MIT-licensed portions. Check per path.
- TEMPORAL: MIT, confirmed. Donor only. Do not touch proven ORCA/UNKNOWN semantics without comparative proof.

### Conceptual corrections
- ATPROTO LEXICONS: not immutable. Compatible evolution is allowed: optional fields may be added, required fields cannot simply disappear, types cannot change, breaking changes require a new Lexicon name. Harvest the compatibility laws, namespacing, typed definitions, unknown-field behavior, schema resolution, generated types, and authority discovery. Do NOT conclude "replace PING schema system"; that conclusion requires proof against PING's existing schema and version machinery. Lexicons must never be casually ported into CanonicalAuthority, IdentityAuthority, or CapabilityAuthority; those are three separate sovereignty decisions.

### Rejected leaps (candidate patches, never authorized implementation plans)
- Crawl4AI → "port extraction strategies to AcquisitionManager"
- ATProto → "port Lexicons into IdentityAuthority + CapabilityAuthority"
- ATProto → "port canonical encoding into CanonicalAuthority"
- Granary → "port translation layer into ConnectorRegistry"
- Temporal → "port saga/idempotency into WorkerRuntime"
- GrapesJS → "port component registry/style manager"

### Deduplication
One candidate, one pinned SHA, one license record, many mechanisms. ATProto, ATProto Lexicons, Granary, GrowthBook, GrapesJS, Temporal, ActivityPub/Nostr must not appear as duplicate report entries. Metrics count UNIQUE candidates and mechanisms. Do not inflate harvest totals through duplicate report entries.

### Evidence rule for estimates
Delete "~3,000 / ~5,000 / ~8,000 / ~45,000 lines saved" style estimates unless derived from an actual compared implementation. Replace with: CURRENT PING LOC TOUCHED, DONOR LOC EXAMINED, EXPECTED PING LOC ADDED, EXPECTED PING LOC REMOVED, NET LOC, NEW DEPENDENCIES, NEW AUTHORITIES, NEW RUNTIME SERVICES. UNKNOWN is acceptable. Fiction is not.

### The writer gate (all 12 must be answered before any writer receives work)
1. What concrete current PING/FYD failure exists?
2. What live product path reaches it?
3. What existing PING mechanism currently owns it?
4. What exact external mechanism is better?
5. What proof shows it is better?
6. Can existing PING be adapted instead?
7. Can we extract the algorithm without importing the architecture?
8. What existing code will be deleted or simplified?
9. What test fails before and passes after?
10. What authority remains sovereign?
11. What is the pinned donor SHA?
12. What exact file license applies?
If any material answer is UNKNOWN: research continues, no writer.

### Ordering
Organize implementation by current FYD product failure, not by external repository. Walk the arrow: URL → ACQUISITION → OBSERVATION → EVIDENCE → OBJECT → RELATIONSHIP → PROJECTION → ASK FYD → EVIDENCE → OWNER CORRECTION → REGENERATION → ACTION → OUTCOME. Find the first weak edge. External repositories compete to solve our problem; our architecture does not reorganize itself around external repositories.

### First comparative archaeology (acquisition)
Current PING/FYD vs Crawl4AI vs Firecrawl patterns vs Playwright/current browser path. Compare: URL safety, redirect handling, DNS rebinding/private-address protection, robots, sitemap, content extraction, structured data, JS escalation, deduplication, incremental refresh, failure taxonomy, determinism, resource limits. If PING already wins a dimension: keep it. If a donor clearly wins: harvest only that mechanism.

### Ask FYD archaeology (no framework import)
Current PING/FYD vs LightRAG/GraphRAG/Qdrant/reference implementations. Compare: authorization before retrieval, object scope, evidence binding, hybrid retrieval, graph expansion, reranking, context compilation, citations, unsupported-claim refusal, hidden-object exclusion, tenant isolation, determinism/evaluation. Do NOT import a RAG framework. The target remains: QUESTION → AUTHORIZED RETRIEVAL → OBJECT/EVIDENCE CONTEXT → ANSWER → EVIDENCE → REFUSAL WHEN UNSUPPORTED.

### Schema/portability archaeology
Compare existing PING contract/version machinery against ATProto Lexicons, JSON Schema, Protobuf, Avro, and other proven mechanisms. Harvest laws, not branding: version identity, compatible evolution, breaking evolution, unknown fields, extension namespaces, generated types, migration, canonicalization interaction. PING's frozen core must not be replaced casually.

### Network (waits for a product edge)
Granary, ATProto, ActivityPub, Nostr remain high-value research targets. Harvest now: identity lessons, relationship representation, translation loss semantics, signed records, portable schemas, sync models. Do not build the future federation stack because repositories exist.

### Temporal (donor, not authority)
Compare first: retry identity, effect identity, UNKNOWN outcome, heartbeat, worker death, reconciliation, HOLD, cancellation, replay, idempotency, compensation. PING's semantic invariant wins whenever a generic workflow pattern would weaken it: EXTERNAL EFFECT MAY HAVE HAPPENED → UNKNOWN → RECONCILE → NEVER BLINDLY RE-DISPATCH.

### Marketing/outcomes (archaeology only)
PostHog, GrowthBook, listmonk, Dittofeed, n8n remain archaeology targets. Do not implement campaign infrastructure yet. Harvest concepts for: exposure, assignment, outcome, attribution, suppression, consent, frequency limits, receipts, experiment integrity, rollback. Future law: OBJECT → AUTHORIZED ACTION → EFFECT → OBSERVATION → OUTCOME EVIDENCE → LEARNING.

### Write phase authorization
Authorize only a surgical patch where comparative archaeology has demonstrated: live failure + existing owner + better donor mechanism + license clear + invariant test + no new authority + net simplification or material product improvement. One writer per mutable semantic unit. Commit each proven harvest independently. Do not accumulate a mega-harvest branch.

### New scorecard (replaces repository counts)
Track: duplicate mechanisms deleted, homegrown fragility removed, live defects closed, tests/invariants added, net LOC, dependencies added/removed, authorities added (= 0), product arrows improved, security boundaries hardened, latency/cost improvement where measured, unsupported ask rate, owner correction burden. Best possible harvest result: "We studied five excellent systems and changed 37 lines." Second best: "We proved PING already has the stronger mechanism and changed nothing." Bad result: "We now maintain five excellent systems inside PING."

### Permanent intake
Do not discard the scanner/decision engine. Turn it into a permanent competitive-intelligence intake. Let the repository get smaller as the research corpus gets larger.
