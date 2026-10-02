# FYD HARVEST AUDIT — LANE A: Actual Pipeline Trace

**Date:** 2026-09-22
**Scope:** read-only trace of the REAL code path that turned Happy Place and Coppersmith into FYD objects.
**Repos:** `/home/nolan/projects/ping` @ `fyd/builder-composition` (0dec40f5), `/home/nolan/ping` @ `refactor/runtime-authority-convergence`.
**Constraint honored:** zero writes to either repo, zero installs, zero commits. All repo access read-only via `~/workspace/pig/pigwsl-run.sh`.

## 0. Headline finding

**There is no live acquisition pipeline.** The chain that produced the two demo objects is a hand-operated, file-based pipeline, not the L0-L4 escalation design in `ACQUISITION-STACK.md`:

1. A human fetched bytes on 2026-09-21 with an **uncommitted external tool** (no fetch script exists in either repo). Robots.txt was checked and crawl-delay 10 honored for Coppersmith (per RUN-NOTES.md); Happy Place is Nolan's own site.
2. The bytes were committed to `src/fyd/proceduralize/raw/`.
3. `/home/nolan/fyd-proof-run/regen.ts` (Pig, uncommitted) reads the pinned bytes, runs `runExtractionPipeline` **twice** (byte-identical assert), and machine-writes the fixture TS files. **`discover()` and `acquire()` are dead code in this path** — regen hard-codes the source list and synthesizes `AcquiredSource` with `ok: true, status: 200`.
4. `/home/nolan/ping/tools/fyd-site-projection/dump.py` strips the TS wrapper, applies `FYD_SITE_OVERLAY` events from Postgres, and writes `/home/nolan/ping/var/fyd-projections/<slug>.json` with a `graphDigest`.
5. Next.js `src/fyd/data/ping-object-source.ts` reads the projection JSON, verifies `siteId` + `graphDigest` + per-object provenance refs (fail closed), applies the owner overlay.
6. `generateSiteSpec()` → `validateSiteSpec()` → renderer.

Everything from pinned bytes onward is deterministic, well-tested, and honest about its gaps. Everything from the seed URL to the bytes is **outside the code** — untested, unrecorded, unrepeatable in-repo. The `AcquisitionAdapter` interface (`src/fyd/acquisition/acquisition-adapter.ts`) has **no implementation**; the L0-L4 escalation ladder is design-only.

## 1. Pipeline diagram (as it really runs)

```
SEED URL (human knowledge, not code)
  happy-place-platform.vercel.app  |  www.coppersmithplumbing.com
        |
        v
[B0] EXTERNAL FETCH (2026-09-21, uncommitted tool; NO repo code)
  robots.txt checked (Coppersmith: Disallow /wp-admin/ only, crawl-delay 10 honored)
  happy-place: index.html only (139,618 bytes)
  coppersmith: index.html (117,898) + rss.xml (1,133) + sitemap.xml (569)
  NOTE: atom.xml fetched -> 404 (60 bytes), discarded; not committed
        |
        v
[B0b] PINNED CORPUS  src/fyd/proceduralize/raw/{happy-place-platform,coppersmith-plumbing}/
  README.md documents provenance. "Never hand-edit these bytes."
  sha256 recorded in fixture headers; matches on disk (verified 2026-09-22)
        |
        v
[B1/B2] DISCOVER + ACQUIRE  src/fyd/proceduralize/proceduralizer.ts
  *** BYPASSED in the demo path ***
  discover() exists (pure, 4 conventional URLs) but regen.ts hard-codes its own
  SITES list instead of calling it. acquire() exists (injected fetchImpl) but
  is never called; regen synthesizes AcquiredSource{ok:true,status:200}.
        |
        v
[B3] PARSE  parseRich()  (proceduralizer.ts)
  html branch:  extractStructuredData(html)          [B3a JSON-LD lane]
              + extractMetaTags (og:*, description, keywords)  [B3b]
              + extractTitle (<title>)                [B3b]
              + extractServiceCards (2 regex detectors)[B3c]
  rss/atom branch: feedFacts()                       [B3d]
  sitemap branch:  NOTHING (RUN-NOTES #9; pure cost) [B3e]
        |
        v
[B3a] STRUCTURED-DATA  src/fyd/proceduralize/structured-data.ts
  discoverStructuredData (regex scan) -> offlineContext rewrite
  -> jsonld@9.0.0 flatten() with REFUSING documentLoader (offline)
  -> entityCandidates (blank nodes re-keyed blank:<sha256>, never _:bN)
  -> per-property fact extraction (LITERAL_FACTS table) / @id -> relationships (PREDICATE_MAP)
  -> site-chrome skip (SearchAction only) -> selectPrimaryBusiness
        |
        v
[B4] NORMALIZE  trim/lowercase keys, strip tags, decode entities, collapse ws
[B5] EXTRACT    address/streetaddress -> coarsened locality (privacy); socials rename
[B6] PROVENANCE every field gets sourceUrl/sourceType/observedAt/evidenceRef/
                confidence/factClass/visibility/claimKind (the emission choke point)
[B7] RESOLVE    one value per field name; priority json-ld>opengraph>html-meta>
                rss>atom>sitemap>html; private fields withheld (counted)
[B8] RELATE     page-scope socials -> links_to pairs
[B8b] scopeFields  primary-entity facts + page facts -> pageScope; others -> entityFields
[B9] PROJECT    pageScope+entities -> PingObject graph:
                business (always) + location (PostalAddress) + person(s) +
                external_identity (sameAs) + service/product (JSON-LD or HTML cards)
                + offer(s); relationships: located_at, offers, links_to,
                works_for, makes_offer/item_offered chains
        |
        v
[B10] FIXTURE WRITE  /home/nolan/fyd-proof-run/regen.ts (uncommitted)
  runs pipeline TWICE, asserts byte-identical, writes
  src/fyd/proceduralize/__fixtures__/{happy-place-graph,coppersmith-graph}.ts
  Header records: script path, timestamp pin, pipeline git commit, source URL,
  source digest, per-file bytes+sha256, observedAt, controllerId.
  *** fieldClasses + droppedRelationships NOT serialized (silent loss #2/#3) ***
        |
        v
[B11] PROJECTION DUMP  /home/nolan/ping/tools/fyd-site-projection/dump.py (PING repo)
  strips TS wrapper -> JSON base graph; reads FYD_SITE_OVERLAY events from
  Postgres (main journal, or demo journal via FYD_OVERLAY_JOURNAL=demo);
  applies ops (set_field/add_object/add_relationship/deactivate_object/
  set_presentation_intent) in (timestamp, event_id) order; unknown op aborts;
  writes var/fyd-projections/<slug>.json atomically (tmp+rename) with
  meta { siteId, dumpedAt, dumperVersion, baseDigest, fixtureFileDigest,
         overlayEventIds[], graphDigest, generatedAt, eventSequences }
  Last dump: 2026-09-22T14:50 UTC; digests re-verified 2026-09-22 (both OK)
        |
        v
[B12] READ SEAM  src/fyd/data/ping-object-source.ts (Next.js, server only)
  fail-closed verification: file exists+parses; meta.siteId matches;
  every object has provenance with non-empty ref; graphDigest recomputed
  (canonicalize: recursive key sort, arrays ordered) and compared.
  Then applies owner overlay (owner-store) — digest covers raw projection only.
        |
        v
[B13] GENERATE  generateSiteSpec(graph)  src/fyd/proceduralize/generator.ts
  groups by schema ROLE (social + knowledge vocabularies); pages in fixed
  order (home, about, services, explore) — a page exists ONLY when its data
  exists. Sections get FYDQuery bindings. CTA + AskFYD always on home.
        |
        v
[B14] VALIDATE  validateSiteSpec -> findings; isRenderable gate
        |
        v
[B15] RENDER  renderer.tsx + registry.ts (17 components + GenericObjectCard
  fallback). Demo routes: src/app/sites/happy-place, src/app/sites/coppersmith-plumbing.
```

### Per-site yields (current fixtures on disk)

| site | seed URL | sources | objects | relationships |
|------|----------|---------|---------|---------------|
| Happy Place | `https://happy-place-platform.vercel.app/` | index.html (139,618 B) | 7: 1 business, 1 location, 5 services | 6: 5 offers, 1 located_at |
| Coppersmith | `https://www.coppersmithplumbing.com/` | index.html (117,898 B), rss.xml (1,133 B), sitemap.xml (569 B) | 8: 1 business, 1 location, 1 person, 1 external_identity, 4 services | 7: 4 offers, 1 located_at, 1 links_to, 1 works_for |

Step-1 report (2026-09-22 regen): Happy Place 30 facts (html 15 [5 service cards x 3], html-meta 3, json-ld 9, opengraph 3), all DIRECT_FACT. Coppersmith: @GRAPH VERIFIED, 11 nodes visited.

## 2. Boundary table

For every boundary: input/output types, owning module, failure behavior, retry, timeout, size limit, security, determinism, cache, provenance, tests.

| # | Boundary | In -> Out | Owner | Failure | Retry | Timeout | Size limit | Security | Determinism | Cache | Provenance retained | Tests |
|---|----------|-----------|-------|---------|-------|---------|------------|----------|-------------|-------|---------------------|-------|
| B0 | Seed URL -> raw bytes (2026-09-21) | URL string -> bytes on disk | **Nobody (uncommitted external tool)** | Unknown | Unknown | Unknown | Unknown | robots.txt checked for Coppersmith; crawl-delay 10 honored (per notes, unverifiable in code) | **NO** — re-fetch today gives different bytes | `raw/` dir = permanent manual cache | README.md + fixture header (URL, observedAt, sha256) | **None** |
| B1 | DISCOVER `discover()` | seedUrl -> SourceRecord[4] (sitemap /feed /atom.xml /) | proceduralizer.ts:156 | Pure; cannot fail | n/a | n/a | n/a | n/a | Yes | n/a | discoveredAt (caller-injected) | proceduralizer.test.ts (1: "discover enumerates the conventional sources") |
| B2 | ACQUIRE `acquire()` | SourceRecord + fetchImpl -> AcquiredSource{raw,ok,status} | proceduralizer.ts:189 | catch -> {ok:false, raw:"", status:0} | **None** | None (caller's) | None | None in-module (depends on fetchImpl) | Yes given fetchImpl | n/a | url/sourceType/discoveredAt carried | **No direct tests** |
| B3a | JSON-LD discovery+expansion+extraction | raw HTML -> StructuredExtraction{facts, relationships, entities, unsupported, stats} | structured-data.ts (`jsonld@9.0.0` pinned exact owns graph semantics) | malformed block -> `malformed-block` evidence; expansion fail -> `expansion-failed` evidence; never throws | n/a | n/a | **None** | **Offline by design**: documentLoader refuses every remote context (recorded as unsupported, never fetched) | **Yes — byte-identical** across processes: blank nodes re-keyed `blank:<sha256(canonical JSON)>`, entities sorted by key, relationships sorted | n/a | blockIndex, entityId (content-hash key), property (compact schema.org), sourceType=`json-ld`, factClass, visibility; unsupported-evidence list | structured-data.test.ts (14), structured-determinism.test.ts (6 hostile incl. cross-process), regression-corpus.test.ts (2) |
| B3b | OG/meta/title | raw HTML -> ParsedFact[] | proceduralizer.ts (extractMetaTags, ogToField, extractTitle) | silent skips (see loss #6) | n/a | n/a | None | n/a | Yes | n/a | sourceType per true tier (`opengraph`/`html-meta`), DIRECT_FACT | proceduralizer.test.ts |
| B3c | Service-card detectors | raw HTML -> ServiceCardFact[] | service-cards.ts | ambiguous cards excluded by design | n/a | n/a | thresholds: title 2-80 chars, desc >= 20 chars | n/a | Yes (output sorted by key; comments stripped first) | n/a | evidenceDetail = `pattern=... selector=a[href="..."] bytes=start-end`; extractor=`service-cards@2026-09-22` | service-cards.test.ts (13) |
| B3d | Feed parse `feedFacts` | raw XML -> ParsedFact[] (feed_item) | feed-parser.ts (`fast-xml-parser`) | null on malformed/oversize/foreign -> zero facts, never throws | n/a | n/a | MAX_XML_BYTES 5MB, MAX_ITEMS 200, title 500c, desc 2000c | XMLValidator gate; parseTagValue:false (no number coercion) | Yes | n/a | feed URL + item GUID in evidenceDetail; claimKind=`feed_item` | feed-parser.test.ts (8) |
| B3e | Sitemap parse | raw XML -> **nothing** | (no code) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Bytes pinned in fixture digest; zero facts | **None** (code comment only, RUN-NOTES #9) |
| B4 | NORMALIZE | ParsedFact[] -> ParsedFact[] | proceduralizer.ts:334 | n/a | n/a | n/a | n/a | n/a | Yes | n/a | Grill 7/19 fields pass through untouched | proceduralizer.test.ts |
| B5 | EXTRACT | ParsedFact[] -> ParsedFact[] | proceduralizer.ts:371 | n/a | n/a | n/a | n/a | **Privacy**: flat `address`/`streetaddress` coarsened to locality (street dropped); structured path tags streetAddress/postOfficeBoxNumber `private` | Yes | n/a | factClass (DIRECT/DERIVED), visibility | proceduralizer.test.ts |
| B6 | PROVENANCE | ParsedFact[] -> ExtractedField[] | proceduralizer.ts:419 | n/a | n/a | n/a | n/a | n/a | Yes (**observedAt is caller-injected; wall-clock never read**) | n/a | sourceUrl, sourceType (true tier), observedAt, evidenceRef=`web:<sha12>` (**of sourceType+name+value+entityId only — URL/observedAt excluded, loss #11**), confidence 1.0/0.7, claimKind | proceduralizer.test.ts |
| B7 | RESOLVE | ExtractedField[] -> ExtractedField[] (one/name) | proceduralizer.ts:465 | private fields withheld (counted in report) | n/a | n/a | n/a | private fail-closed (defense in depth: project() re-filters) | Yes | n/a | winner keeps its provenance; array-winner merges values across tiers | proceduralizer.test.ts |
| B8 | RELATE + scopeFields | fields -> RelatedPair[] + pageScope/entityFields | proceduralizer.ts:517,548 | n/a | n/a | n/a | n/a | n/a | Yes | n/a | socials -> links_to; entityId scoping | proceduralizer.test.ts |
| B9 | PROJECT `project()` | fields+entities -> ProjectedGraph{objects, relationships, fieldClasses, droppedRelationships} | proceduralizer.ts:671 | unmapped rel endpoints dropped **and counted**; missing data -> fewer objects (never invented) | n/a | n/a | n/a | private re-filtered | Yes: `website-business-<sha16(url,controller,fields)>`, `rel-<sha16(s,p,o)>`, sorted output | provenance {kind:`website-derived`, ref:`website-ingestion:<url>`, derivedAt}; per-rel evidenceRef | proceduralizer.test.ts (13), regression-corpus.test.ts |
| B10 | Fixture write | ProjectedGraph -> `__fixtures__/<site>-graph.ts` | **/home/nolan/fyd-proof-run/regen.ts (uncommitted)** | throws on non-byte-identical double run | n/a | n/a | n/a | n/a | Asserted byte-identical (2 runs in-process) | Fixture file = cache | Header: script path, timestamp pin, pipeline commit, source digest, per-file sha256 | regression-corpus.test.ts asserts pipeline<->fixture agreement |
| B11 | Projection dump | fixture TS + PG overlay events -> `var/fyd-projections/<slug>.json` | /home/nolan/ping/tools/fyd-site-projection/dump.py | unknown op kind **aborts whole dump**; overlay query fail -> exit 2, nothing written | n/a | docker exec 60s / rm 30s | n/a | PG creds via gateway container env (never in files) | Yes given same events (journal-ordered application) | JSON file = cache (atomic tmp+rename) | meta {baseDigest, fixtureFileDigest, overlayEventIds[], graphDigest, generatedAt, eventSequences} | **None** |
| B12 | Read seam `getPingObjectGraph` | projection JSON -> verified ObjectGraph | src/fyd/data/ping-object-source.ts | **fail closed**: missing/malformed/siteId mismatch/digest mismatch/object without provenance ref -> throws | n/a | n/a | n/a | graphDigest recomputed (canonicalize: recursive key sort, arrays ordered); floats refused in dumper | n/a | File read per request (FYD_PROJECTION_DIR) | digest covers raw projection only; owner overlay composed after, digest-excluded | Referenced by builder tests; **no dedicated unit tests for the fail-closed checks** |
| B13 | GENERATE `generateSiteSpec` | ObjectGraph -> FYDSiteSpec | proceduralize/generator.ts | missing data -> page/section omitted (never invented) | n/a | n/a | n/a | n/a | Byte-identical given same graph + injected generatedAt | n/a | provenance block {source:`website-ingestion`, claimKind:`website_statement`, generator name+version} | generator.test.ts (12) |
| B14 | VALIDATE | FYDSiteSpec -> findings | sitespec/validator.ts | invalid -> not renderable, never renders | n/a | n/a | n/a | n/a | Yes | n/a | findings list | sitespec/__tests__ |
| B15 | RENDER | spec+graph -> page | components/renderer.tsx + registry.ts | unknown component -> GenericObjectCard fallback, never fails | n/a | n/a | n/a | binding verifier | n/a | n/a | resolveQuery per section | components/__tests__ |

Related-but-separate (NOT in the demo chain): `src/fyd/net/safe-fetch.ts` (the SSRF gate: 15MB default/5MB page cap, 20s timeout, max 5 redirects, per-hop DNS re-validation, content-type allowlist; 17 tests) is used only by `onboarding/anonymous-preview.ts` and `media/*` — **the proceduralizer never calls it**. `src/fyd/acquisition/acquisition-adapter.ts` is types-only. `src/fyd/preview/capture.ts` is the only Playwright consumer (manual CLI, `npx tsx`, screenshots only).

## 3. Silent-loss list (information discarded without an adequate record)

1. **The live-fetch layer is absent.** Redirect chains, final URLs, HTTP statuses, content types, and the original feed URL are never recorded — regen hard-codes `ok:true, status:200`. The robots/SSRF/timeout/size behavior of the real fetch is unrecorded and untestable. Retry behavior: none anywhere.
2. **`fieldClasses` dropped at the fixture boundary.** Grill 7's per-field fact-class sidecar is computed in `project()` but `regen.ts` serializes only `{objects, relationships}` (verified: 0 occurrences of `fieldClasses` in the committed fixtures). Every downstream artifact — projection JSON, served graph, renderer, Ask FYD — loses the epistemic status of each field.
3. **`droppedRelationships` not in the PipelineReport.** Counted on `ProjectedGraph`, invisible in the report and the fixture.
4. **Sitemap is pure cost.** Fetched (569 B), pinned in the fixture digest, contributes zero facts — `parse()` has no sitemap handler (code comment cites RUN-NOTES #9, but no per-run record exists).
5. **HTML body content is never read.** Headings, visible text, image alts, links, `<link rel="canonical">` — all promised by ACQUISITION-STACK.md L1 — are never extracted. Consequence: page-chrome vs knowledge filtering is moot (see Q&A below). Only JSON-LD + meta/OG + `<title>` + the two service-card regexes see the bytes.
6. **Meta-tag regex misses.** `extractMetaTags` requires `property|name` before `content`; reversed attribute order, `itemprop`, `http-equiv` are silently skipped. Only `description`/`keywords` meta names are kept.
7. **Feed channel metadata dropped.** `feedFacts` emits only items (`title || guid`); channel title/site URL parsed then discarded; item links/descriptions dropped (only the GUID survives via `evidenceDetail`).
8. **Article entities never projected.** The Coppersmith `@graph` contains an Article node; `project()` has no Article branch, so its facts die silently in `entityFields`. The generator's `RecentObjects`/`Explore`/post/article roles are unreachable from the pipeline.
9. **`@id` references to skipped chrome nodes are dropped silently** (no `unsupported` record), unlike other unmapped values.
10. **Non-projected entity types orphaned.** Only PostalAddress/Person/Service/Product/Offer entities are projected. WebSite/WebPage/ImageObject/BreadcrumbList/ItemList entities keep their facts in `entityFields`, which nothing reads — and the doc (STRUCTURED-DATA.md §2.3) claims they are "skipped as entities" while the code only skips `SearchAction` (`SITE_CHROME_TYPES` has 1 entry, not 5).
11. **`evidenceRef` ignores sourceUrl and observedAt.** Two sources yielding identical (sourceType, name, value, entityId) collide to the same `web:<sha12>`.
12. **Service-card lane is pattern-locked.** Only Elementor CTAs linking `/services/` and `?service=` estimate cards fire; all other builders/nav labels/headings are silently out of scope. Near-miss thresholds (title 2-80 chars, description >= 20) drop silently.
13. **Overlay journal not recorded.** `dump.py` reads overlays from the `main` or `demo` journal via env; the projection meta does not record which journal produced it.
14. **Feed URL inconsistency.** The same `rss.xml` bytes are attributed to `https://www.coppersmithplumbing.com/rss.xml` (regen.ts), `https://www.coppersmithplumbing.com/feed/` (regression test), and an unknown original URL (2026-09-21 fetch). Provenance `sourceUrl` for feed facts differs by path.
15. **Byte-count drift in notes.** RUN-NOTES.md says the Coppersmith `index.html` fetch was 117,896 bytes; the committed file is 117,898 (hash matches the fixture header, so the chain is self-consistent — the note is stale).

## 4. Test coverage map

| Area | Test file | Count | Covers | Gaps |
|------|-----------|-------|--------|------|
| JSON-LD lane | structured-data.test.ts | 14 | discovery, malformed blocks, @graph, nested PostalAddress privacy, sameAs, multi-type, @id relations, Service/Product, offline documentLoader refusal | — |
| Determinism | structured-determinism.test.ts | 6 hostile | cross-process hash equality, fixture-order independence, fresh module registry, source-order independence | — |
| Pipeline stages | proceduralizer.test.ts | 13 | discover, parse, normalize, extract, provenance, resolve priority, relate, project, per-fact tiers, entity decoding, Grill 19 | `acquire()` has no direct test |
| Feeds | feed-parser.test.ts | 8 | RSS/Atom incl. real Coppersmith rss.xml, malformed fail-closed, no title facts from feeds, GUID evidence | — |
| Service cards | service-cards.test.ts | 13 | both detectors, thresholds, evidence locators | other builders untested (by design) |
| Service extraction | service-extraction.test.ts | 8 | JSON-LD Service/Product -> objects + offers edges | — |
| Corpus | regression-corpus.test.ts | 2 | both real sites end-to-end, @GRAPH VERIFIED (11 nodes), JSON-LD outranks OG/RSS titles, phone verbatim, locality derived | corpus reads committed files, not the network |
| Generator | generator.test.ts | 12 | grouping, page/section emission, determinism | — |
| Patch | patch.test.ts | 6 | owner patch lane | — |
| Net gate | net/__tests__/safe-fetch.test.ts | 17 | SSRF cases, redirects, content-type, size caps | **not wired into the proceduralizer** |
| Net budgets | budgets.test.ts / rate-limit.test.ts | 12+6 | crawl ledger, semaphores, token buckets | only used by anonymous-preview |
| Fixture->dump | — | 0 | — | **dump.py has zero tests** |
| Projection read | — | 0 dedicated | referenced by builder tests | fail-closed digest/provenance checks untested |
| Live fetch | — | 0 | — | **no code, no tests** |

## 5. Answers to the specific questions

**What does the current static path do on a JS-heavy page? Does it escalate to browser?**
No escalation exists. There is no L2 trigger, no sufficiency gate, and no browser call anywhere in the acquisition path. On a JS-heavy page the pipeline extracts whatever JSON-LD/OG/meta/title the served HTML contains; if none, the business object falls back to `title = hostname` and `description = ""` — silently thin, with no warning, no detection record, and no retry. The pipeline cannot distinguish "JS-heavy" from "empty."

**Playwright 1.63.0 — wired into acquisition or tests only?**
Neither acquisition nor the pipeline test suite. The sole consumer is `src/fyd/preview/capture.ts`, a manual operator CLI (`npx tsx src/fyd/preview/capture.ts <objectId> <url>`) that screenshots a site for preview manifests. It is not called by any pipeline, cron, or test.

**Where does the "proceduralizer" distinguish page chrome from knowledge?**
Only in the JSON-LD lane: `SITE_CHROME_TYPES = {"SearchAction"}` in structured-data.ts (visited, counted, recorded as `site-chrome-node` unsupported evidence, then skipped). Note the doc claims WebSite/WebPage/BreadcrumbList/ItemList are also skipped — the code does not; those nodes become entities whose facts are then silently orphaned (loss #10). The HTML lane needs no chrome filter because it never extracts body text — only meta/OG/title/JSON-LD/service-cards. The service-card lane has its own ambiguity rule (titled card + description + explicit services context required; nav labels and bare headings excluded by design, not silently).

**PING core server-side callers of the FYD pipeline?**
None. Grep across `/home/nolan/ping` (gateway, workers, runtime, tools) finds no caller of `runExtractionPipeline`, the proceduralizer, or the acquisition adapter. The only PING-side FYD code is `tools/fyd-site-projection/dump.py` (fixture -> projection JSON) and the overlay event journal it reads. The extraction pipeline runs exclusively in the website repo (regen script, tests) and on committed bytes.

## 6. FYD-002 backlog candidates (acquisition contract), ordered by value

Evidence for all: the trace above; RUN-NOTES.md honest-failure list; memory 2026-09-21 L1538/L1401/L474 (FYD-002 named "the true root").

1. **FYD-002a — Implement the live ACQUIRE behind the AcquisitionAdapter.** Wire the existing `fyd/net/safe-fetch.ts` SSRF gate into a real `acquire()` implementation so URL -> bytes is code, not a human with curl. Contract per fetch: redirect chain, final URL, status code, content type, byte count, observed_at, evidence hash. Closes the largest hole: today B0 has no code, no tests, no retries, no timeouts. (ACQUISITION-STACK.md L0/L1 is the design; `acquisition-adapter.ts` is the interface; only the implementation is missing.)
2. **FYD-002b — Machine-reported source-coverage + silent-loss diagnostic.** Per-run report: sources discovered vs fetched vs parsed, facts per tier, bytes-to-facts yield, and the loss list above (sitemap ignored, unmapped entity types, orphaned entities, dropped relationships, chrome-skip counts) as structured output instead of code comments. (Requested in memory 2026-09-21: "which sources were discovered, which fields were extracted, which structured facts went unused, which types are unsupported, and any conflicts. Unsupported evidence must never be hidden.")
3. **FYD-002c — Persist the Grill 7 sidecar end-to-end.** Include `fieldClasses` (and `droppedRelationships`) in the fixture and projection JSON so per-field epistemic status survives to the renderer and Ask FYD. Without it, "Ask FYD answers with evidence" cannot show per-field classes on the served graph.
4. **FYD-002d — HTML body-text tier with chrome filtering.** Headings/visible text/alt text/links/canonical as a below-structured tier, with deterministic nav/footer/cookie-banner filtering. This is what makes a JS-heavy or JSON-LD-poor page produce more than a hostname-titled stub, and it is the prerequisite for a real L1-sufficiency/L2-escalation decision.
5. **FYD-002e — Project Article/Post entities.** The Coppersmith `@graph` Article node is currently dropped; emitting `ping.social.article@1`/`post@1` objects makes the generator's Explore/RecentObjects pages reachable through the pipeline. Smallest, most concrete item.

## 7. Provenance notes for this audit

- Fixture header hashes re-verified against disk: `0584ea7b…` (coppersmith index.html, 117,898 B), `76766d18…` (happy-place index.html, 139,618 B) — both match.
- Projection digests re-verified 2026-09-22: both `graphDigest` values recompute correctly; dumped 2026-09-22T14:50 UTC by `fyd-projection-dump@1.1.0`. Happy Place carries 7 overlay events; Coppersmith 0.
- Doc-vs-code discrepancies found: (a) STRUCTURED-DATA.md claims 5 site-chrome types skipped, code skips 1; (b) STRUCTURED-DATA.md §2.7 describes primary-business selection as "@id matches page URL, then sameAs backlink, then most facts" — code scores same-host `website` fact (+100), type rank, name (+10), phone (+5), ties by key; (c) ACQUISITION-STACK.md L1 promises headings/visible text/alt text/links/canonical extraction — code extracts none of these.
- PING_HARVEST_PLAN.md was consulted; its L1/L2/L3 architecture and Ask FYD determinism statements are consistent with this trace and need no revision from Lane A.
