# Web Acquisition Harvest - Wave 1

Date: 2026-09-21. Lane: READ-ONLY harvest, web acquisition mechanisms for FYD Social.
Constraint note: zero GitHub API calls were used in this pass (budget withheld by parent). All evidence below comes from web reading (docs, raw source files, package registries) and mechanism analysis. PINNED SHA fields are TBD pending budget release.

## Bounded question, composed answer

"Which exact mechanism extracts semantic structure (services, hours, location, entities) from DOM/JS-heavy pages deterministically, with content fingerprinting for change detection, without depending on an LLM per page?"

No single project does all of this. The best-of-breed composition, from the survivors below, is:

1. Acquire the rendered DOM with Playwright (`waitForLoadState`, `page.content()`); run extraction inside the page context so JS-heavy pages are handled with zero extra dependencies (FYD already uses `playwright-core` in its probe scripts).
2. Project the rendered DOM to its accessibility tree via Playwright's aria snapshots: a deterministic, role-labeled semantic serialization (the browser-grounded canonical DOM).
3. Extract business fields (services, hours, phone, address, entities) with metascraper-style ordered rule bundles: JSON-LD and microdata first, then OpenGraph/meta, then deterministic text rules, first-resolves-wins. FYD writes its own bundles for hours/phone/address.
4. Fingerprint normalized extracted content with a Charikar simhash port (from trafilatura's `deduplication.py`) for change detection and near-duplicate suppression; exact-change detection via sha256 over the normalized form.
5. Dedupe crawl work with Crawlee-style request fingerprints (normalized URL + method + payload hash) and detect changes with urlwatch's pattern: filter/normalize first, then hash, so ad rotations and timestamps do not trigger false re-renders.

Each mechanism below is deterministic, LLM-free, and harvestable as a small primitive or pattern.

---

## Card 1: metascraper (microlinkhq/metascraper)

PROJECT: microlinkhq/metascraper
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: MIT (verified: raw LICENSE.md reads "The MIT License (MIT), Copyright (c) 2019 Microlink")
RECENT ACTIVITY: Active. Repository commits observed 28 days before this pass (README "Last Updated: 28 days ago"); npm ecosystem under active microlinkhq maintenance; test coverage tracked on Coveralls.
FYD PROBLEM: Turning messy rendered HTML into named business facts (title, description, address, phone, hours, entities) deterministically, with an explicit priority order per field, so extraction is inspectable and replayable instead of heuristic soup.
MECHANISM: Ordered rule bundles. Each metadata field is a bundle: an ordered array of small extractor functions, most-specific-source first, generic-fallback last. The orchestrator parses the HTML once with cheerio, then for each field runs rules in order and takes the first rule that resolves a value. Rule sets are composable (`pickPropNames`/`omitPropNames` skip unneeded fields entirely, saving CPU). Rules are not restricted to CSS selectors; a rule can be any function of the DOM, e.g. `$jsonld('description')` reading schema.org JSON-LD.
EXACT IMPLEMENTATION:
- `packages/metascraper/src/index.js`: constructor `rules => async ({url, html, htmlDom, rules: inlineRules, validateUrl, omitPropNames, pickPropNames}) => getData({...})`. Single cheerio parse: `htmlDom ?? load(html, { baseURI: url })`. Rules merged per call: `mergeRules(inlineRules, loadedRules, omitPropNames, pickPropNames)`.
- `packages/metascraper/src/rules.js` (loadRules/mergeRules): builds the per-field ordered rule lists.
- `packages/metascraper/src/get-data.js`: iterates fields, runs each rule in order, first truthy value wins.
- Rule bundle shape, e.g. `packages/metascraper-description/src/index.js`: `{ description: [toDescription($meta('og:description')), toDescription($meta('twitter:description')), toDescription($meta('description')), toDescription($ => $('meta[itemprop="description"]').attr('content')), toDescription($jsonld('articleBody')), toDescription($jsonld('description'))] }`, with `rules.pkgName = 'metascraper-description'`.
- Helpers in `packages/metascraper-helpers`: `$jsonld(path)`, `$meta(name)`, `toRule(normalizeFn)` (normalize + validate wrapper every rule passes through).
- Community extension proving the extension point: `metascraper-address` (goodhood-eu/metascraper-address) extracts schema.org-formatted addresses as a drop-in bundle.
CLAIM EVIDENCE: README documents the rule-priority contract ("The first rule to successfully resolve the value stops the process. The order goes from most specific to most generic") and a benchmark section comparing accuracy against similar libraries; metascraper.js.org hosts a live demo running the same code.
SOURCE EVIDENCE: Full monorepo source read at HEAD via raw file fetches (index.js 46 lines, description rule 12 lines); rule ordering and first-wins semantics verified in source, not just docs.
RUNTIME EVIDENCE: Live demo at microlink.io/meta runs the same extraction logic against arbitrary URLs; npm weekly downloads tracked on the README badge (package widely consumed, e.g. by Microlink API).
DEPENDENCY COST: Small. Core `metascraper` + per-field packages; each rule bundle is a tiny npm package with cheerio as the shared DOM layer. No browser, no model, no network calls at extraction time. ESM/CJS compatible.
WHAT FYD ALREADY HAS: `src/fyd/proceduralize/structured-data.ts` extracts JSON-LD via `jsonld@9.0.0` and emits EntityCandidates; the proceduralizer maps Service/Product entities to objects with DIRECT_FACT tagging. FYD has no ordered rule-bundle architecture and no per-field fallback chains for hours/phone/address from DOM text or microdata.
WHAT THEY DO BETTER: Per-field extraction as composable, ordered, independently testable rule lists with a shared normalize/validate wrapper (`toRule`); parse-once DOM shared across all fields; CPU-skip via pick/omit; community can add a field (address) without touching core.
WHAT FYD DOES BETTER: FYD binds every extracted value to evidence (evidenceRef on relationships, DIRECT_FACT/DERIVED_FACT classes) and projects into a typed object graph; metascraper returns a flat metadata bag with no provenance, no fact grading, and no object identity.
SMALLEST HARVESTABLE PRIMITIVE: The orchestrator trio (loadRules/mergeRules/get-data semantics, ~100 lines) plus the rule-bundle contract `{ field: [ruleFn...] }` and the `toRule` normalize wrapper. FYD writes its own bundles: `fyd-hours` (schema.org openingHours -> meta itemprop -> regex on visible text), `fyd-phone` (tel: links -> schema.org telephone -> text pattern), `fyd-address` (PostalAddress JSON-LD -> microdata -> footer text).
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REUSE (depend on `metascraper` core + a few official bundles for title/description/logo/image) and ADAPT (write FYD-owned rule bundles for business fields; keep the rule-bundle engine, replace the article-oriented rule content).
CAN IT:
- remove code? Yes: replaces ad-hoc per-field scraping snippets with one engine plus declarative rule lists.
- remove ambiguity? Yes: field resolution order is explicit and logged; "which rule won" is a deterministic answer.
- improve beauty? No.
- improve expressiveness? Yes: new fields (hours, services, service area) become new rule bundles, not new code paths.
- improve trust? Yes: ordered rules with first-wins semantics are auditable; pairs naturally with FYD's evidenceRef per winning rule.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes: parse-once DOM, pickPropNames skips unneeded fields, no LLM, no browser round-trips at extract time.
- improve regeneration? Yes: deterministic re-extraction over stored HTML gives identical output; stored HTML plus rule versions fully determine the result.
- reduce AI improvisation? Yes: schema-first, then meta, then text rules; no model in the loop at all.
FALSIFICATION EXPERIMENT: Take 20 real Western Slope trade-business homepages (HVAC, plumbing, tree service). Run metascraper core with FYD-written bundles for phone, address, hours against the rendered HTML. For each field, record which rule won and compare against human-labeled ground truth. Kill criterion: if fewer than 80% of resolvable fields are won by a correct rule, or if the first-wins order systematically prefers a wrong specific source over a right generic one, the rule-ordering contract fails for this domain and the primitive is rejected.

---

## Card 2: @mozilla/readability (mozilla/readability)

PROJECT: mozilla/readability
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: Apache-2.0 (per third-party dependency evaluation doc: "License: Apache-2.0"; standalone extraction of Firefox Reader View)
RECENT ACTIVITY: Maintained as the standalone Firefox Reader View implementation; referenced in active 2026 evaluations (speedreader-chrome spec 2026-05-08, petrarca prior-art). Bundled `index.d.ts`; npm package `@mozilla/readability`.
FYD PROBLEM: From a full rendered page DOM, isolate the main content block deterministically (strip nav, ads, sidebars, footers) so downstream field extraction and fingerprinting operate on signal, not chrome.
MECHANISM: Heuristic article extraction: score candidate elements by class/id signals (`unlikelyCandidates` regex vs positive signals), text density (commas, length), and link density; pick the top candidate, then clean it conditionally (strip unlikely siblings, convert misused divs, remove empty nodes). `isProbablyReaderable` provides a fast pre-check. Pure function of a DOM Document; no network, no model.
EXACT IMPLEMENTATION:
- `Readability.js`: `new Readability(document, options).parse()` returns `{ title, content (HTML), textContent, length, excerpt, byline, dir, siteName, lang }`. Mutates a cloned document (callers must clone first).
- Candidate scoring: `_grabArticle` walks candidates, weights by class/id patterns and text statistics; `_cleanConditionally` removes forms/objects/embeds and low-value divs; `_prepArticle` fixes lazy images and relative URLs.
- Options: `maxElemsToParse` (DoS guard on huge DOMs), `charThreshold`, `classesToPreserve`.
- Runs in any environment with a DOM: in Node with jsdom, or directly inside a Playwright page via `page.evaluate` (zero new runtime dependency when a browser is already driving acquisition).
CLAIM EVIDENCE: Best-overall-tool verdicts in published extraction benchmarks (Lejeune & Barbaresi 2020; Bevendorff et al. 2023 ROUGE-LSum F1); battle-tested on Firefox Reader View across millions of pages.
SOURCE EVIDENCE: Source and algorithm documented in-repo; mechanism described in detail by independent analyses (e.g. "Mozilla Readability Algorithm, Step by Step").
RUNTIME EVIDENCE: Ships in Firefox Reader View; adopted by Omnivore, OneNote Web Clipper, chrome-agent (`read --html` command), and the metascraper connector package `metascraper-readability`.
DEPENDENCY COST: Small. Single npm package (~155KB unpacked), TypeScript types bundled, Apache-2.0. In-page execution via Playwright avoids jsdom entirely.
WHAT FYD ALREADY HAS: Nothing for main-content isolation. FYD's structured-data.ts works from JSON-LD only; DOM-text extraction is not systematized.
WHAT THEY DO BETTER: Two decades of tuned heuristics for boilerplate removal with explicit, inspectable scoring; returns both HTML and text plus metadata in one pass; `isProbablyReaderable` gives a cheap gate before paying for full parse.
WHAT FYD DOES BETTER: FYD grades facts (DIRECT/ DERIVED/INFERENCE) and keeps evidence lineage; Readability returns content with no provenance and its heuristics are tuned for articles, not business homepages (marketing landing pages with thin article structure are its weak spot; homepage service lists may be under-extracted).
SMALLEST HARVESTABLE PRIMITIVE: `Readability.parse()` as a DOM-to-content function run in-page (`page.evaluate`), used to produce the canonical "main content text" that fingerprinting and text-rule extraction operate on; `isProbablyReaderable` as the gate that decides whether a page even has extractable body content.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REUSE (depend on `@mozilla/readability`; run in-page via Playwright to keep it on the rendered DOM).
CAN IT:
- remove code? Yes: one library call replaces hand-rolled boilerplate stripping.
- remove ambiguity? Partly: scoring is heuristic, so "why this block" is explainable via candidate scores but not a proof. Mark outputs as DERIVED_FACT.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes with caveat: deterministic for a fixed DOM; same HTML in gives same content out, which is the replay property FYD needs. Caveat in WHAT FYD DOES BETTER applies.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes: `maxElemsToParse` bounds work; in-page execution avoids serialization round-trips; far cheaper than any model call.
- improve regeneration? Yes: content extraction is a pure function of the stored DOM; re-running over archived HTML reproduces the result bit-for-bit.
- reduce AI improvisation? Yes: no model involved; heuristic scores replace model judgment for the "what is the main content" decision.
FALSIFICATION EXPERIMENT: Run Readability in-page on 20 trade-business homepages and compare `textContent` against a human-marked "main content" region (services list, about text, hours). Kill criterion: if on more than 25% of homepages the extracted block misses the primary service list or includes the nav/footer verbatim, Readability's article-tuned heuristics are a poor fit for this page class and FYD should restrict it to long-form subpages (blog/about) while homepages use rule bundles directly.

---

## Card 3: trafilatura deduplication.py - Simhash content fingerprint (adbar/trafilatura)

PROJECT: adbar/trafilatura (file `trafilatura/deduplication.py`)
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: Apache-2.0 for versions >= 1.8.0 (per project README: "distributed under the Apache 2.0 license; versions prior to v1.8.0 are under GPLv3+")
RECENT ACTIVITY: Active; commits observed ~51 days before this pass; consistently top-ranked in independent extraction benchmarks.
FYD PROBLEM: Change detection and near-duplicate suppression for re-crawled business pages, without storing full page text comparisons and without an LLM judging "did this change".
MECHANISM: Charikar simhash over sampled tokens plus an exact bag-of-words hash. `sample_tokens` splits text, strips punctuation, keeps alphanumeric tokens, and falls back through token-length thresholds so short or non-Latin texts still yield features. `Simhash.create_hash` builds the 64-bit sign-of-random-projections fingerprint using blake2b per token (cached via lru_cache); `similarity` compares two fingerprints by Hamming distance. `content_fingerprint` returns the hex simhash of "meaningful bits". `generate_bow_hash` gives an exact-equality fingerprint for the normalized token bag. `duplicate_test` shows the in-extraction dedup pattern: LRU cache of seen text blocks, flagging repeats above a size threshold.
EXACT IMPLEMENTATION (read in full from raw source, 262 lines):
- `sample_tokens(inputstring, length=64)`: whitespace split, `token.strip(string.punctuation)`, keep `token.isalnum()`; non-Latin fallback translates all Unicode punctuation to spaces; length-threshold fallback `for i in range(4, 0, -1)`.
- `_vector_to_add(token, length)` with `@lru_cache(maxsize=2**14)`: `token_hash = int.from_bytes(blake2b(token.encode(), digest_size=8).digest(), "big")`, returns `[1 if token_hash & (1 << i) else -1 for i in range(length)]`.
- `class Simhash`: `__slots__ = ("hash", "length")`; `create_hash` sums per-token vectors, sets bit i where `vector[i] >= 0`; `to_hex()`; `validate()` accepts hex or legacy decimal strings; `similarity(other)` = `(length - popcount(hash ^ other.hash)) / length`.
- `content_fingerprint(content)`: `Simhash(content).to_hex()`.
- `generate_bow_hash(inputstring, length=24)`: `blake2b(" ".join(sample_tokens(inputstring)).encode(), digest_size=length).digest()`.
- `class LRUCache`: thread-safe OrderedDict LRU with `get/put/increment/clear`; `duplicate_test(element, options)` flags repeated text blocks within a page.
CLAIM EVIDENCE: trafilatura is the top-ranked open-source extractor in ScrapingHub's article-extraction benchmark and in Bevendorff et al. 2023; the dedup module is exercised by its test suite and by a documented Rust port (readex) that verified the simhash properties hold (deterministic, similar inputs give low Hamming distance).
SOURCE EVIDENCE: Full 262-line source file read; algorithm references its own lineage (vilda/shash, sean-public/python-hashes) in the docstring.
RUNTIME EVIDENCE: Runs in production crawl pipelines (trafilatura is the standard tool for large-scale web corpus building, e.g. Common Crawl derivatives); simhash comparison is O(1) per pair after fingerprinting.
DEPENDENCY COST: Zero if adapted: the primitive is ~120 lines of Python to port (Simhash + sample_tokens + content_fingerprint), using Node's built-in crypto (sha256) instead of blake2b. Do not depend on the whole trafilatura package (Python, lxml, and a full extractor FYD does not need).
WHAT FYD ALREADY HAS: Deterministic sha256-based IDs for services and relationships, but no content fingerprinting for pages or extracted blocks, and no near-duplicate detection across re-crawls.
WHAT THEY DO BETTER: A tested, tuned token-sampling front end (punctuation handling, non-Latin fallback, length thresholds) that makes the fingerprint robust to trivial rewrites; the two-tier design (simhash for near-dup, bow hash for exact) covers both "page changed slightly" and "page identical".
WHAT FYD DOES BETTER: FYD's fact grading and evidence graph give change detection a semantic layer (which field changed, from which source); trafilatura's fingerprint is content-blind.
SMALLEST HARVESTABLE PRIMITIVE: Port of `sample_tokens` + `Simhash` + `content_fingerprint` to TypeScript (~120 lines, zero dependencies, sha256-based token hashes). Store `fingerprint_hex` and `bow_hash` per page snapshot and per extracted content block.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: ADAPT (port the algorithm to TS; do not add the Python package).
CAN IT:
- remove code? Yes: replaces any naive string-diff change detection with a fixed-size fingerprint comparison.
- remove ambiguity? Yes: "changed" becomes a numeric Hamming distance with a documented threshold, not a feeling.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes: fingerprints are deterministic and content-addressed; near-dup decisions are reproducible and threshold-explicit.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes: O(1) pairwise comparison after one linear fingerprint pass; fingerprints are 16 hex chars per page.
- improve regeneration? Yes: same normalized text always yields the same fingerprint; re-running over archived snapshots reproduces the change log.
- reduce AI improvisation? Yes: replaces "did the site change meaningfully" model judgment with arithmetic.
FALSIFICATION EXPERIMENT: Port the three functions to TS. Fingerprint 50 business pages, then re-crawl after 7 days. Compare simhash-change flags against human judgment of "materially changed" (new services, price changes, hours changes) vs noise (date stamps, ad rotation, testimonial carousels). Kill criterion: if the Hamming-distance threshold cannot separate material changes from noise with at least 85% precision, the token-sampling front end is insufficient for this page class and the primitive is rejected in favor of field-level diffing only.

---

## Card 4: Playwright accessibility snapshots (microsoft/playwright)

PROJECT: microsoft/playwright
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: Apache-2.0 (project license file; re-verify at pin time)
RECENT ACTIVITY: Core Playwright project, continuously maintained; aria snapshot output is the primary observation primitive of the official Playwright MCP server.
FYD PROBLEM: Browser grounding: turning a rendered, JS-heavy DOM into a deterministic semantic structure (roles, names, hierarchy) that extraction rules and evidence can reference without depending on brittle CSS selectors or a vision model.
MECHANISM: The accessibility tree as a canonical DOM projection. `locator('body').ariaSnapshot()` serializes the rendered page's accessibility tree to a compact YAML-ish text with stable refs: each node carries its ARIA role, accessible name, and hierarchy (e.g. `heading "Our Services"`, `listitem` with `link "Drain Cleaning"`). The serialization is deterministic for a given DOM state, is produced by the browser engine itself (not by a heuristic), and collapses presentational markup into semantic structure: div-soup becomes roles and names. Refs (`[ref=e12]`) give stable element handles for follow-up actions or evidence citations.
EXACT IMPLEMENTATION:
- `page.locator('body').ariaSnapshot()` returns the serialized tree; per-locator snapshots scope to a subtree (e.g. snapshot only the `main` landmark).
- The Playwright MCP server's `browser_snapshot` tool is the same primitive productized: "returns accessibility tree with roles, labels, semantic structure; deterministic for element selection."
- Snapshot diffing is an established pattern: capture snapshot, act or wait, capture again, diff text to detect meaningful DOM changes (used by agent harnesses such as chrome-agent's `diff` command).
- Works on the live rendered DOM: SPAs, lazy-loaded content, and shadow DOM are reflected once settled; pair with `waitForLoadState('networkidle')` or explicit settled-state waits before snapshotting.
CLAIM EVIDENCE: Playwright's own documentation and the MCP server treat the snapshot as the deterministic observation primitive ("Deterministic for element selection", "Shows page structure clearly"); agent frameworks standardize on it over screenshots for structure.
SOURCE EVIDENCE: Implemented in Playwright core (locator API); serialization format documented in Playwright docs and the MCP reference.
RUNTIME EVIDENCE: Used at scale by the Playwright MCP server, browser agent harnesses, and test suites asserting on `ariaSnapshot()` output; snapshot assertions are a standard Playwright test pattern (`expect(locator).toMatchAriaSnapshot()`).
DEPENDENCY COST: Zero new dependencies if Playwright is already the acquisition driver (FYD probe scripts already import `playwright-core`). The snapshot is computed by the browser; no extra packages.
WHAT FYD ALREADY HAS: `playwright-core` in probe scripts (trace-driver.js, console-capture.js) and a RENDERER -> BROWSER pipeline stage, but no canonical semantic-DOM projection and no evidence-grade page observation primitive.
WHAT THEY DO BETTER: The browser engine computes semantics (role/name calculation per ARIA spec) instead of FYD heuristics guessing at it; refs give citable, re-resolvable element handles; the format is compact and diffable.
WHAT FYD DOES BETTER: FYD's evidence graph binds facts to sources with grading; a raw snapshot is observation without claims. FYD should store the snapshot as the source artifact and derive graded facts from it, keeping the snapshot-to-fact mapping explicit.
SMALLEST HARVESTABLE PRIMITIVE: An acquisition contract: after settled-state wait, capture `{ url, finalUrl, ariaSnapshot (body), html, screenshot? }` as one evidence bundle; derive all DOM-based facts from the snapshot text with deterministic rules; store the snapshot alongside extracted facts so any fact can be traced to its source lines.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REPURPOSE PATTERN (no new dependency; adopt the snapshot as FYD's canonical rendered-DOM observation format and the input to rule-bundle extraction).
CAN IT:
- remove code? Yes: replaces bespoke DOM-walking and selector-spaghetti with one snapshot call plus text rules over the snapshot.
- remove ambiguity? Yes: role/name/hierarchy are computed per spec, not guessed; two runs over the same DOM give the same text.
- improve beauty? No.
- improve expressiveness? Yes: services, nav structure, forms, and landmarks become uniformly addressable as snapshot lines.
- improve trust? Yes: the snapshot is engine-computed and stored as evidence; any extracted fact cites snapshot lines, giving a replayable observation layer.
- improve mobile? No.
- improve accessibility? Indirectly: extraction that keys on the accessibility tree inherits the page's real semantics.
- improve performance? Yes: one snapshot call replaces many `evaluate` round-trips; the serialization is compact compared to raw HTML.
- improve regeneration? Yes: stored snapshots make re-extraction deterministic and let FYD diff "what the page showed" across crawls without re-rendering.
- reduce AI improvisation? Yes: semantic structure comes from the browser's ARIA computation, removing the need for a model to interpret layout.
FALSIFICATION EXPERIMENT: Capture aria snapshots for 20 trade-business homepages and write deterministic rules extracting (a) the service list, (b) phone number, (c) address block from snapshot text alone. Compare against human ground truth. Kill criterion: if snapshot text systematically drops key business content that is present in the rendered page (e.g. text inside canvas, unlabeled icon buttons carrying the phone number, content hidden from the a11y tree), the snapshot is an insufficient canonical observation and must be paired with raw-HTML rules rather than used alone.

---

## Card 5: Crawlee RequestQueue uniqueKey (apify/crawlee)

PROJECT: apify/crawlee
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: Apache-2.0 (per project README: "This project is licensed under the Apache License 2.0")
RECENT ACTIVITY: Active; repository updated 6 days before this pass; both JS and Python editions maintained.
FYD PROBLEM: Incremental crawling needs request deduplication that is stricter than raw URL strings but cheaper than content comparison: the same page reached via `HTTP://Example.com/page#frag?b=2&a=1` and `http://example.com/page?a=1&b=2` must be one unit of work, and POST-like variants must not collide with GETs.
MECHANISM: Request fingerprinting at enqueue time. Each request gets a `uniqueKey` derived deterministically: lowercase the URL, lexically order query parameters, strip fragments, plus normalization tweaks; the queue stores and dedupes on this key, so only unique requests are ever processed. Extended mode (`useExtendedUniqueKey`) folds the HTTP method and a hash of the payload into the key (`POST(abc123def):http://...`), so same-URL different-method requests stay distinct. Requests carry a lifecycle state machine (UNPROCESSED to DONE) and `enqueueLinks` offers strategies (same-hostname default, all-domains opt-in) with include/exclude glob/regex filters.
EXACT IMPLEMENTATION:
- `Request` class with `uniqueKey` auto-generated from URL (docs: "automatically generated from the request's URL by lowercasing the URL, lexically ordering query parameters, removing fragments and a few other tweaks").
- `useExtendedUniqueKey: true` adds method + payload hash to the key.
- `keepUrlFragment: true` opt-out for fragment-sensitive pages.
- `RequestQueue` dedupes on `uniqueKey`; `enqueueLinks({ strategy, include, exclude, label })` discovers and enqueues links with per-label routing for multi-page-type crawls.
- Crawler composition pattern: `CheerioCrawler` (static HTML) and `PlaywrightCrawler` (rendered) share the same queue and request model, so a page can be fetched statically first and escalated to rendered capture on the same deduplicated request identity.
CLAIM EVIDENCE: Official docs describe the uniqueKey contract and the "95% of duplicate request scenarios" handling; Crawlee is the most widely used Node crawling framework with the queue/dedup behavior exercised by its test suite.
SOURCE EVIDENCE: Documented in `docs/introduction/03-adding-urls.mdx` ("This `uniqueKey` is automatically generated... ensure the queue only includes unique URLs") and the Request API reference.
RUNTIME EVIDENCE: Powers Apify platform crawls at scale; the same queue semantics are reimplemented in crawlee-python with identical uniqueKey behavior.
DEPENDENCY COST: Full Crawlee is a heavy dependency (browser pool, autoscaling, storage clients, fingerprint suite) for FYD's single-business-site scale. Do not adopt the framework.
WHAT FYD ALREADY HAS: Deterministic sha256 IDs for graph objects and relationships, but no crawl-request identity: no canonical URL normalization, no dedup key for "have we already scheduled this page", no static-vs-rendered escalation on a shared identity.
WHAT THEY DO BETTER: A precise, documented normalization contract for request identity (lowercase, sorted query, fragment policy, method+payload extension) plus a lifecycle state machine and link-enqueue strategies.
WHAT FYD DOES BETTER: FYD's identity is content- and evidence-based (object graph IDs from entity keys); Crawlee's identity is request-based. FYD needs both: request identity for crawl scheduling, content identity for the graph.
SMALLEST HARVESTABLE PRIMITIVE: A `fingerprintRequest({url, method, payload}) -> string` function: WHATWG URL parse, lowercase scheme+host, drop default ports, sort query params, strip fragment (unless opted in), then `sha256(method + '|' + normalizedUrl + '|' + payloadHash)`. Plus the two-tier pattern: static fetch first on the fingerprint, escalate to Playwright render on the same fingerprint when static content is insufficient, recording which tier produced the bytes as evidence.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY (reimplement the ~40-line fingerprint; do not depend on Crawlee).
CAN IT:
- remove code? Yes: one fingerprint function replaces ad-hoc URL string comparisons scattered through crawl code.
- remove ambiguity? Yes: "is this the same page we already handled" becomes a key comparison with documented normalization.
- improve beauty? No.
- improve expressiveness? Yes: extended keys distinguish method/payload variants; labels route page types.
- improve trust? Yes: dedup decisions are deterministic and replayable from the crawl log.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes: dedup at enqueue time prevents redundant fetches and renders, the expensive operations.
- improve regeneration? Yes: the same seed list always produces the same request set; crawl runs are reproducible.
- reduce AI improvisation? Not directly, but it removes the class of "crawl the same page twice and merge conflicting facts" errors that otherwise invite model judgment to resolve.
FALSIFICATION EXPERIMENT: Implement the fingerprint and run it over 500 URLs harvested from 20 business sites (with query-string variants, fragments, case variants, trailing slashes, UTM params). Human-label which URL pairs refer to the same page. Kill criterion: if more than 5% of same-page pairs get different fingerprints (false splits causing duplicate work) or more than 1% of different-page pairs collide (false merges causing lost pages), the normalization contract is wrong for this domain and must be revised before adoption.

---

## Card 6: extruct unified schema extraction (scrapinghub/extruct)

PROJECT: scrapinghub/extruct
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: BSD-3-Clause (verified: raw LICENSE file, "Copyright (c) Scrapinghub", standard 3-clause text)
RECENT ACTIVITY: Slowed. PyPI/project page shows no recent release activity; community migration docs (turbohtml's extruct migration guide) indicate the ecosystem is moving to newer extractors. Treat as stable-but-unmaintained.
FYD PROBLEM: FYD's schema extraction covers JSON-LD only. Small business sites also carry schema.org as HTML microdata (`itemscope`/`itemprop`), OpenGraph, and RDFa. FYD needs the microdata traversal mechanism and a uniform multi-syntax extraction contract.
MECHANISM: One `extract(html, base_url, syntaxes=[...])` call runs a separate extractor per syntax over a single parsed tree and returns a dict keyed by syntax: `microdata`, `json-ld`, `opengraph`, `microformat`, `rdfa`, `dublincore`. The microdata extractor implements the W3C microdata-to-JSON algorithm (walk `itemscope` roots, collect `itemprop` values, recurse into nested items, resolve `itemtype` URLs). `uniform=True` normalizes all syntaxes to a common `@context`/`@type`/properties shape. `return_html_node=True` attaches the source HTML node to each extracted microdata item, giving node-level provenance from extracted fact back to DOM location.
EXACT IMPLEMENTATION:
- `extruct.extract(htmlstring, base_url, syntaxes, uniform, return_html_node)`: dispatches to `extruct.w3cmicrodata.MicrodataExtractor`, `extruct.jsonld.JsonLdExtractor`, `extruct.opengraph`, `extruct.rdfa`, `extruct.microformat`, `extruct.dublincore`.
- `w3cmicrodata.py`: microdata item walk per the WHATWG algorithm; nested items become nested dicts; `itemref` support.
- `return_html_node` adds the lxml element per item: the provenance primitive (fact -> exact DOM node).
- `uniform=True` maps each syntax's output to `{@context, @type, ...properties}`.
CLAIM EVIDENCE: Long-standing reference implementation (961 stars); the microdata algorithm is documented as a revisit of Scrapinghub's published microdata-extraction method; uniform output and node-return options are documented in the README with worked examples.
SOURCE EVIDENCE: README read in full (839 lines) including worked extraction outputs for all six syntaxes; per-syntax extractor modules are individually importable.
RUNTIME EVIDENCE: Used in Scrapy-based production pipelines for years; the `extruct` CLI (`extruct <url>`) exercises the same code path.
DEPENDENCY COST: Python-only (lxml, rdflib, mf2py). Not directly reusable in FYD's TypeScript stack; a dependency would drag in a Python runtime for a small algorithm.
WHAT FYD ALREADY HAS: JSON-LD extraction via `jsonld@9.0.0` with canonicalization pinned (RDFC-1.0), EntityCandidate projection, and DIRECT_FACT tagging. No microdata, no OpenGraph/RDFa extraction, no node-level provenance.
WHAT THEY DO BETTER: The multi-syntax dispatch over one parsed tree; the W3C microdata traversal (correct handling of nested items and itemref, which naive itemprop scraping gets wrong); `return_html_node` as a built-in provenance primitive.
WHAT FYD DOES BETTER: FYD projects extracted entities into a typed object graph with graded facts and relationship emission (`makes_offer`, `serves_area`); extruct returns flat per-syntax dicts with no identity, no grading, and no graph.
SMALLEST HARVESTABLE PRIMITIVE: A TypeScript microdata walker implementing the WHATWG microdata-to-JSON algorithm (~150 lines): find `itemscope` roots, collect `itemprop` (handling `content`/`href`/`src`/`data`/`datetime` value sources per element type), recurse nested `itemscope`, resolve relative `itemtype` URLs; plus the `extract()` dispatch contract `{ syntax: items[] }` and a `sourceNode` reference (CSS path or snapshot ref) attached to each extracted item for provenance.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY moving toward ADAPT (port the microdata algorithm to TS in FYD's structured-data layer; do not depend on the Python package).
CAN IT:
- remove code? Yes: one walker replaces any future pile of itemprop regexes.
- remove ambiguity? Yes: the W3C algorithm defines exactly what a microdata item's properties are; nested items and value-source rules are specified, not guessed.
- improve beauty? No.
- improve expressiveness? Yes: unlocks LocalBusiness/OpeningHoursSpecification/Product/Offer facts from the large share of small-business sites that use microdata instead of JSON-LD.
- improve trust? Yes, via the `return_html_node` pattern: every microdata-derived fact carries its source node, which is exactly FYD's evidence model.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral: one tree walk per syntax; cheaper than re-parsing per field.
- improve regeneration? Yes: deterministic walk over stored HTML; uniform output shape stabilizes downstream projection.
- reduce AI improvisation? Yes: schema.org facts come from explicit markup via a specified algorithm, never from model inference over page text.
FALSIFICATION EXPERIMENT: Port the walker to TS. Run it over 30 business homepages alongside FYD's JSON-LD path; compare extracted LocalBusiness facts (name, phone, address, hours, geo) against human ground truth, and measure how many pages carry microdata but no JSON-LD. Kill criterion: if fewer than 20% of sampled pages contain usable microdata, or if the walker's nested-item handling disagrees with the W3C algorithm on a hand-checked fixture set, the port is not worth its maintenance cost and FYD stays JSON-LD-only with text rules as fallback.

---

## Card 7: urlwatch change-detection pipeline (thp/urlwatch)

PROJECT: thp/urlwatch
PINNED SHA: TBD (API budget withheld; pin on release)
LICENSE: BSD-3-Clause (per Arch Linux package metadata: "License(s): BSD-3-Clause"; project copyright Thomas Perl)
RECENT ACTIVITY: Maintained; docs updated ~73 days before this pass; packaged at version 2.29 (Arch build January 2026).
FYD PROBLEM: Re-crawl change detection that does not cry wolf: business pages contain volatile regions (date stamps, testimonial carousels, ad slots) that must not trigger re-extraction and re-rendering, while material changes (hours, services, prices) must.
MECHANISM: Filter chain, then fingerprint. A watch job declares a URL plus an ordered filter pipeline (`xpath`/`css` selectors to narrow to the region of interest, `html2text` to normalize, `re.sub` to strip volatile patterns, `strip`, `jq` for JSON endpoints). The filtered text is hashed and stored in a cache DB; on the next run the new hash is compared and a unified diff of old vs new filtered text is produced. The key insight is ordering: normalize first (remove the volatile bits deterministically), then hash. Unhashed volatile content never reaches the fingerprint, so it cannot cause false positives.
EXACT IMPLEMENTATION:
- Job YAML: `{ name, url, filter: [{xpath: ...}, {html2text: re}, {strip:}] }`, plus `method`, `headers`, `data` for non-GET jobs.
- Filters in `urlwatch/filters.py`: `xpath`, `css`, `html2text`, `re.sub`, `strip`, `jq`, `shellpipe`, `ocr` etc., applied in declared order.
- Cache in `~/.cache/urlwatch/cache.db` (minidb): stores per-job last hash and last filtered text.
- Report: unified diff between cached and new filtered text, only when the hash differs.
CLAIM EVIDENCE: In continuous use since 2008 for exactly this job (monitoring pages for updates); filter-pipeline design documented in the intro/manpage/cookbook docs; distro-packaged (Arch, Debian).
SOURCE EVIDENCE: Docs read (manpage, intro, cookbook references); filter list and job schema verified in docs and in widespread user configs.
RUNTIME EVIDENCE: Powers thousands of personal and organizational monitoring setups; the cache-diff loop is the entire product and is exercised on every run.
DEPENDENCY COST: Python tool with lxml/requests/PyYAML; designed as a CLI, not a library. Not a dependency candidate for FYD.
WHAT FYD ALREADY HAS: A `refresh` test suite (21/21 passing per the service-extraction report) and content-addressed IDs, but no documented normalize-then-hash change policy for re-crawls.
WHAT THEY DO BETTER: Eighteen years of edge cases in "what counts as a change": the filter chain is a declarative, per-job, versioned normalization policy, and the unified diff gives humans (and the evidence log) the exact changed lines.
WHAT FYD DOES BETTER: FYD changes facts in a graded object graph rather than diffing page text; field-level change detection (hours changed from X to Y) is more precise than text diffing. urlwatch has no notion of structured facts.
SMALLEST HARVESTABLE PRIMITIVE: The pipeline shape as a FYD refresh policy: per-URL `normalizers[]` (selector narrowing, volatile-pattern stripping, whitespace canonicalization) applied in declared order, then `sha256` over the normalized form, then compare-then-diff. Store the normalizer list version alongside the hash so a policy change invalidates old hashes explicitly instead of silently.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY (adopt the normalize-then-hash ordering and the versioned-policy discipline inside FYD's refresh lane; do not depend on the tool).
CAN IT:
- remove code? Yes: one normalization pipeline replaces scattered "ignore this div" hacks.
- remove ambiguity? Yes: "changed" is defined as hash inequality over explicitly normalized content; the normalizer list is the definition.
- improve beauty? No.
- improve expressiveness? Yes: per-URL normalizer lists express "what matters on this page" declaratively.
- improve trust? Yes: diffs are computed from stored normalized text, so a claimed change is always replayable and inspectable.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes: hashing skips re-extraction and re-rendering when nothing material changed; selector narrowing shrinks the hashed content.
- improve regeneration? Yes: normalized snapshots plus versioned normalizers make historical change logs reproducible.
- reduce AI improvisation? Yes: the change decision is arithmetic over declared normalizers, not a model reading two page versions.
FALSIFICATION EXPERIMENT: Define normalizer lists for 10 business pages (strip date stamps, testimonial carousels, analytics scripts). Run daily for 14 days; log every hash change and have a human label material vs noise. Kill criterion: if noise changes still trigger on more than 20% of runs (normalizers insufficient) or any material change is missed (normalizers too aggressive), the declarative-filter approach cannot carry this page class and FYD needs field-level semantic diffing instead.

---

## Kill list (one-line rejection reasons)

- ScrapeGraphAI: LLM-per-page extraction; nondeterministic output and per-page cost violate the bounded question outright.
- Firecrawl: hosted API with LLM extraction modes; external service dependency plus model in the loop.
- browser-use: LLM agent driving the browser per page; the opposite of deterministic acquisition.
- Browserbase Stagehand: self-driving browser actions are LLM-judged; deterministic extraction is not its contract.
- Jina Reader API: external service dependency; reader output quality leans on model processing.
- newspaper3k/newspaper4k: unmaintained since 2018; NLP feature bloat for a solved deterministic problem.
- Mercury Parser (postlight): archived 2021; dead upstream.
- justext: unmaintained since 2016; strictly weaker than trafilatura/readability on benchmarks.
- boilerpy3: unmaintained; no advantage over maintained alternatives.
- AutoScraper: learns per-site models; nondeterministic and needs training data per site.
- adileo/MicroFrontier: GPL-3.0 license, unmaintained since 2021 (last push 2021-11-04), and its own README lists URL re-visit policy and canonicalization as TODO; frontier concepts harvested as pattern instead.
- crawler-commons/url-frontier: Java + gRPC service; a distributed-systems dependency for single-business-site crawl scale.
- Apache Nutch / Heritrix / StormCrawler: Java crawl platforms; massive dependency surface for a harvest that needs primitives.
- changedetection.io: full monitoring platform, not a harvestable mechanism; its core idea (diff on schedule) is covered by urlwatch's pattern.
- microlinkhq/html-get + browserless: heavy browser-management dependency with antibot "evasion techniques"; FYD already drives playwright-core directly, and evasion conflicts with the platform-constraint principle.
- kepano/defuddle: author flags it "very much a work in progress"; correctness unproven, so it fails the evidence bar as a dependency; its schema.org metadata extraction stays a watch item.
- arkin0x/simhash-ts and mfonda/simhash: solo-maintainer fingerprint libs; adapting trafilatura's tested, benchmark-backed simhash is strictly better.
- BetaHuhn/metadata-scraper: smaller, less-maintained duplicate of metascraper's rule engine.
- ld-json-extractor: tiny JSON-LD-only helper; subsumed by metascraper's `$jsonld` helper and FYD's existing jsonld@9.0.0 pipeline.
- colly (Go): wrong language for FYD's TypeScript stack; nothing it does is unavailable as a TS pattern.
- w3lib.canonicalize_url / parsel / selectolax: Python-only; Node's WHATWG URL plus the Crawlee-pattern fingerprint cover the mechanism natively.
- siddzzzz/Tarsier: accessibility-tree work aimed at LLM agents, not deterministic extraction; the tree idea itself is covered by the Playwright card.
- wildstuff/wild frontier worker: example config, not a mechanism implementation.

## GitHub API calls used

0. No calls to api.github.com were made in this pass (budget withheld by parent). All SHAs are TBD and will be pinned with one repo-endpoint call per surviving candidate when the budget is released. Licenses above were verified from raw LICENSE files and project documentation fetched over plain HTTPS, which does not consume API quota.
