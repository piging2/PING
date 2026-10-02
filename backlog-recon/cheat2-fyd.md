**1. ID: `acq-ordered-rule-bundles` 
**1. ID: `acq-ordered-rule-bundles` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Current extraction is JSON-LD only with no per-field fallback chain. Metascraper's ordered rule bundles (first resolving rule wins) are the proven deterministic pattern for coverage across heterogeneous sites.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 1, dated 2026-09-21. FYD has `jsonld` pinned at 9.0.0 (per `~/workspace/fyd-lane/service-extraction-report.md`, 2026-09-21) but no uniform fallback-rule engine.
- DEPENDENCIES: existing `structured-data.ts` extraction; acquisition stack L0/L1.
- ACCEPTANCE: a small FYD bundle module declares ordered per-field rules (JSON-LD, then meta/OpenGraph, then text heuristics), with a conformance fixture showing a site with no JSON-LD still yields phone/hours/address from lower-priority rules.
- NEXT FALSIFICATION: run the rule bundles over the two real captures (`happy-place-platform`, `coppersmith-plumbing`); if a rule misattributes a field, the first-wins ordering is falsified.

**2. ID: `acq-microdata-walker` 
**2. ID: `acq-microdata-walker` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Ports WHATWG microdata-to-JSON traversal (extruct's algorithm) to TypeScript, unlocking LocalBusiness/hours/address fields from sites with no JSON-LD, without a heavy dependency.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 6 (extruct), dated 2026-09-21. Status: PATTERN_ONLY toward ADAPT, conditional on needing microdata from real sites.
- DEPENDENCIES: `acq-ordered-rule-bundles` (microdata becomes one rule tier).
- ACCEPTANCE: TS walker passes a microdata corpus fixture with byte-identical JSON to extruct's reference output on the same inputs.
- NEXT FALSIFICATION: test against a real hard site that carries only microdata; if JSON-LD alone already covers all required fields, the port is unnecessary.

**3. ID: `acq-content-fingerprint` 
**3. ID: `acq-content-fingerprint` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Trafilatura's simhash plus exact bag-of-words hash gives refresh change detection that suppresses cosmetic noise. Cannot replace field-level semantic diffs.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 3 (trafilatura), dated 2026-09-21.
- DEPENDENCIES: normalization policy (see `acq-refresh-normalize-then-hash`).
- ACCEPTANCE: two snapshots differing only in ad/menu chrome hash as near-duplicates; a changed phone number hashes as distinct.
- NEXT FALSIFICATION: if near-duplicate detection masks a substantive field change on a real refresh, simhash thresholding is falsified for FYD's use.

**4. ID: `acq-aria-snapshot-observation` 
**4. ID: `acq-aria-snapshot-observation` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Playwright's `ariaSnapshot()` is a compact browser-computed semantic projection of rendered DOM, useful for JS-rendered sites. Must stay paired with raw HTML because inaccessible or canvas content may disappear from it.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 4 (microsoft/playwright), dated 2026-09-21.
- DEPENDENCIES: Playwright L2 engine (already pinned 1.63.0).
- ACCEPTANCE: acquisition emits a paired observation bundle `{url, finalUrl, ariaSnapshot, html}` from the existing Playwright path.
- NEXT FALSIFICATION: find a business site whose key facts appear in raw HTML but not in the aria snapshot, or vice versa; either direction falsifies a single-source observation.

**5. ID: `acq-request-fingerprint` 
**5. ID: `acq-request-fingerprint` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Crawlee's request fingerprinting (lowercase, sorted query, fragment policy, method plus payload extension) deduplicates crawl requests deterministically. PATTERN_ONLY, a small FYD primitive, not full Crawlee.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 5 (Crawlee), dated 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: a primitive function fingerprints URL/method/payload such that two visits to the same logical request dedupe to one crawl unit.
- NEXT FALSIFICATION: if fragment or payload semantics cause duplicate acquisitions on the real captures, the fragment policy is falsified.

**6. ID: `acq-readability-gate` 
**6. ID: `acq-readability-gate` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Mozilla Readability gives deterministic main-content isolation for a fixed DOM (in-page via Playwright, zero new runtime dependency). Business homepages must be tested before trust.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 2 (readability), dated 2026-09-21. REUSE verdict with a specified falsification experiment on business sites.
- DEPENDENCIES: Playwright L2.
- ACCEPTANCE: `isProbablyReaderable` gate plus content extraction runs in-page against JS-rendered DOM.
- NEXT FALSIFICATION: run on real business homepages; if it strips contact cards or service lists as non-content, the pattern is falsified for FYD's extraction path (falls back to DEFERRED).

**7. ID: `acq-refresh-normalize-then-hash` 
**7. ID: `acq-refresh-normalize-then-hash` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: urlwatch's ordered per-URL filters (CSS element selection, declared order) then sha256 of normalized bytes. The normalizer version must be stored with the digest so future normalizer changes do not look like source changes.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 7 (urlwatch), dated 2026-09-21. PATTERN_ONLY.
- DEPENDENCIES: `acq-content-fingerprint`.
- ACCEPTANCE: refresh pipeline stores `{normalizerVersion, hash}` per source; a normalizer upgrade changes only the version field, not the source-change verdict.
- NEXT FALSIFICATION: if a real site changes its markup in a way the declared filters do not normalize, producing a false change event, the filter list is falsified.

**8. ID: `acq-service-tier1-extraction` 
**8. ID: `acq-service-tier1-extraction` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Tier 1 direct JSON-LD extraction of Service and Offer objects into the machine path is committed and tested. This is the proven foundation for all higher extraction tiers.
- EVIDENCE: `~/workspace/fyd-lane/service-extraction-report.md`, dated 2026-09-21. Local commits `3fb4d12` then `55c6ce6` (no push). Gate rerun: 146/155 tests, +8 new service-extraction tests all passing, zero regressions. Machinery: `serviceType -> service_type`, `provider -> provided_by`, `itemOffered -> item_offered`, `offers -> offers` mappings; deterministic IDs `${businessId}-service-${sha256(entityKey)[0:12]}`; unnamed offers get derived fallback label "Offer", never a direct fact.
- DEPENDENCIES: structured-data pipeline, deterministic ID law.
- ACCEPTANCE: the committed synthetic suite (`service-extraction.test.ts`) stays green and zero-service real captures remain a refusal rather than fabricated claims.
- NEXT FALSIFICATION: run the gate suite; any failure in the 8 service tests falsifies the Tier 1 contract.

**9. ID: `acq-real-capture-service-gap` 
**9. ID: `acq-real-capture-service-gap` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 1**
- WHY: Running the Tier 1 pipeline over the real captures (coppersmith index.html, happy-place-platform index.html) yields 4 and 2 objects respectively with ZERO service and zero offer objects. The Ask FYD layer correctly refuses ("I do not have evidence for that... I will not guess"). The first broken step is EVIDENCE to SERVICE OBJECT EXTRACTION, not the answer layer.
- EVIDENCE: `~/workspace/fyd-lane/service-extraction-report.md` A/B section, dated 2026-09-21; `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` section 4 (FIRST BROKEN STEP), dated 2026-09-21.
- DEPENDENCIES: `acq-service-tier1-extraction`.
- ACCEPTANCE: rerunning the fixed question "What services does this business offer, and how do you know?" against the real graphs returns a cited, classified answer with evidence_refs and source_urls, or an explicit structured "services unknown" state. The composer must never parse description prose as claims.
- NEXT FALSIFICATION: if real captures contain no structured service data at all, the gap is not Tier 1 but a site-data reality, and the lane shifts to an explicit services-unknown state instead.

**10. ID: `acq-predicate-consistency` 
**10. ID: `acq-predicate-consistency` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 2**
- WHY: The schema declares `provides`, the proceduralizer emits `offers`, the generator accepts both, but `makes_offer` relationships never populate Services sections and `serves_area` has no consumer. A future lane must not invent a third predicate.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` sections 1 and 3, dated 2026-09-21.
- DEPENDENCIES: `acq-service-tier1-extraction`.
- ACCEPTANCE: one canonical Business-to-Service predicate documented; every emitted relationship predicate is consumed by generator grouping; no orphan predicates in the vocabulary list.
- NEXT FALSIFICATION: enumerate `PREDICATE_MAP` and generator `ROLE_PREDICATES`; any emitted predicate with no consumer falsifies the closure.

**11. ID: `acq-deterministic-ids` 
**11. ID: `acq-deterministic-ids` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Business IDs (`website-business-` + sha256 of canonical url/controller/fields), relationship IDs (`rel-` + sha256 of subject|predicate|object), service IDs, and blank-node entity keys are all content-derived SHA-256 hex via browser-safe TS `sha256Hex`. The website lane deliberately avoids non-deterministic identity authorities so re-projection dedupes.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` section 2, dated 2026-09-21. Determinism contract in `STRUCTURED-DATA.md` section 8: same source bytes plus observedAt yields byte-identical facts, entity keys, object IDs, relationships.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: reprojecting the same capture produces identical IDs; verified by regen proof.
- NEXT FALSIFICATION: project the same capture twice and diff all IDs; any drift falsifies the ID law.

**12. ID: `acq-observedat-digest-observations` 
**12. ID: `acq-observedat-digest-observations` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Byte-identical regen proofs across processes and key orders depend on pinned observedAt and source-content digests. Proof artifacts exist for the generator path.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts` step 1 (OBSERVED_AT pin), dated 2026-09-21; `~/workspace/fyd4-stage/planner.ts` canonical serialization, dated 2026-09-22.
- DEPENDENCIES: `acq-refresh-normalize-then-hash` for the general refresh pipeline.
- ACCEPTANCE: every acquired source carries `{sourceUrl, contentDigest: sha256, observedAt}` and determinism proofs hold across processes.
- NEXT FALSIFICATION: run the same capture with permuted key order in a fresh process; any digest drift falsifies the canonicalization.

**13. ID: `acq-rss-sitemap-sources` 
**13. ID: `acq-rss-sitemap-sources` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: PROVE | PRIORITY: 3**
- WHY: The proof pipeline already consumes index.html plus rss.xml plus sitemap.xml for coppersmith (per `regen.ts` SITES config), but per-source evidence references are not yet explicit in the object graph.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts`, dated 2026-09-21. Sitemap and RSS are inputs, not yet provenance citizens.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: every object field records which source (html, rss, sitemap) it came from via explicit evidenceRef, not just a generic `website-ingestion:` prefix.
- NEXT FALSIFICATION: if an object's provenance cannot name its exact source document, per-source evidence is falsified.

**14. ID: `acq-remote-context-refusal` 
**14. ID: `acq-remote-context-refusal` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 2**
- WHY: The JSON-LD extraction path (jsonld@9.0.0, whose defaults changed to RDFC-1.0 per the service extraction report) must have an explicit policy for remote `@context` resolution. No explicit refusal or pinned-loader policy was found in the surveyed extraction path.
- EVIDENCE: absence found during 2026-09-22 read of `~/workspace/fyd-lane/service-semantics-harvest.md` section 5 (extraction pipeline) and `~/workspace/fyd-lane/service-extraction-report.md` (jsonld@9.0.0 canonicalization warning), dated 2026-09-21. Remote `@context` appears in test fixtures as `https://schema.org` without a documented fetch policy.
- DEPENDENCIES: structured-data pipeline.
- ACCEPTANCE: extraction never fetches a remote context; remote contexts are either refused with a typed failure or resolved from a pinned local copy. A hostile fixture with a malicious remote context is handled deterministically.
- NEXT FALSIFICATION: feed a capture whose `@context` points at a hostile URL; if the pipeline fetches it, the refusal contract is falsified.

**15. ID: `acq-social-identity` 
**15. ID: `acq-social-identity` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 3**
- WHY: `rel=me` and `sameAs` are the canonical discovery mechanisms for social and external identities. Coppersmith has an `external_identity` object (the person handle) but no documented `rel=me`/`sameAs` extraction rule.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` section 1 (coppersmith graph includes `ping.social.external_identity@1`), dated 2026-09-21; schema.org `sameAs` cited in `~/workspace/fyd-lane/website-builder-authority-decisions.md`, dated 2026-09-21.
- DEPENDENCIES: `acq-ordered-rule-bundles`.
- ACCEPTANCE: `sameAs` and `rel=me` links project to `external_identity` objects with evidence refs.
- NEXT FALSIFICATION: if business homepages in the target corridor carry social links only in `sameAs` and the pipeline ignores them, the coverage is falsified.

**16. ID: `acq-crawl-recipe-artifact` 
**16. ID: `acq-crawl-recipe-artifact` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: PROVE | PRIORITY: 3**
- WHY: The proof codified a crawl recipe per site (URL seed, source types, observedAt pin) in `regen.ts`, but the recipe is not yet a first-class replayable artifact.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts`, dated 2026-09-21.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: a recipe file per site names seed URL, source list, normalizer version, and expected digests; replaying the recipe reproduces the acquisition set.
- NEXT FALSIFICATION: replay a recipe on an unchanged site; any digest change falsifies the recipe's determinism.

**17. ID: `acq-hostile-input-fixtures` 
**17. ID: `acq-hostile-input-fixtures` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Hostile fixture discipline (XSS text in name/quote fields, `javascript:` URLs in website/social fields, long malformed URLs, literal HTML entities, SVG payloads) is the standing guard against hostile-source regressions. Proven as a repeatable 8-case battery.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts`, dated 2026-09-21. Result: text cases PASS (React escapes; no dangling `dangerouslySetInnerHTML`), URL cases FAIL pre-fix (FL-20260921-032).
- DEPENDENCIES: `renderer-javascript-url-sink` for the URL cases.
- ACCEPTANCE: the 8-case battery runs against every renderer change and stays green.
- NEXT FALSIFICATION: any battery case regressing falsifies the current sink/escape posture.

---

## DOMAIN: SITESPEC

**18. ID: `sitespec-spec-is-data` 
**18. ID: `sitespec-spec-is-data` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: SiteSpec is the declarative product state. It owns pages, sections, ordering, bindings, tokens, navigation, and manifest. It never owns business truth, evidence, auth decisions, or generated JSX. The generated UI is a pure projection.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__sitespec__types.ts` header law, captured 2026-09-21; `~/workspace/fyd-lane/website-builder-authority-decisions.md` "LAYER 1 TRUTH / LAYER 2 EXPERIENCE SPEC / LAYER 3 RENDERER", dated 2026-09-21; memory record dated 2026-09-22.
- DEPENDENCIES: none.
- ACCEPTANCE: renderer contract `SiteSpec + ObjectGraph + ViewerContext -> UI` holds with no factual authorship in the render layer.
- NEXT FALSIFICATION: any renderer module emitting a claim not bound to a SiteSpec section/query binding falsifies the separation.

**19. ID: `sitespec-schema-evolution-law` 
**19. ID: `sitespec-schema-evolution-law` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Schema evolution is codified: add new fields as optional, never change an existing field's type, never remove. Breaking changes mint a new schema version. This protects old graphs from silently changing meaning.
- EVIDENCE: `~/workspace/fyd4-stage/schemas.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: a breaking schema change requires a versioned schema id; old specs validate unchanged.
- NEXT FALSIFICATION: find a schema change in the repo history that altered a field type without a version bump; that falsifies the law's enforcement.

**20. ID: `sitespec-canonical-serialization-digest` 
**20. ID: `sitespec-canonical-serialization-digest` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Canonical JSON (sorted keys) plus a SHA-256 semantic digest excluding volatile stamps is the identity of the spec. It binds patches, Ask FYD reasoning, and regen proofs to the exact spec version.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`canonicalizeSpec`, `semanticDigestOf`, manifest with `specDigest`), dated 2026-09-22; `~/workspace/fyd-proof-run/regen.ts` (`stableStringify` + `specDigest`), dated 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: cross-process, key-permuted serialization of the same spec yields byte-identical digests.
- NEXT FALSIFICATION: permute key order and rerun in a fresh process; any digest change falsifies canonicalization.

**21. ID: `sitespec-eligibility-contract` 
**21. ID: `sitespec-eligibility-contract` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: `deriveEligibility` gives every component a data-driven eligibility verdict with reasons. The planner defensively filters generator output through it. Components never invent data they are not eligible for.
- EVIDENCE: `~/workspace/fyd4-stage/eligibility.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: an ineligible component with no data is never emitted; every verdict carries reasons.
- NEXT FALSIFICATION: feed the planner a sparse graph; any emitted component without eligible data falsifies the defensive filter.

**22. ID: `sitespec-objectfeed-external-identity` 
**22. ID: `sitespec-objectfeed-external-identity` | DOMAIN: SITESPEC | STATUS: OPEN | PRIORITY: 1**
- WHY: The Explore page's ObjectFeed uses an `all` query over schemas including `ping.social.external_identity@1`, which the validator rejects ("Component 'ObjectFeed' does not accept schema"). This is the real-world validation of the schema-component contract: coppersmith ships with external identities and the Explore page fails validation.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-031, recorded 2026-09-21. Confirmed in `~/workspace/fyd4-stage/eligibility.ts` explorePage section, read 2026-09-22: `all` query schema list includes `ping.social.external_identity@1` and `SCHEMA_COMPONENTS[EXTERNAL_IDENTITY]` maps to ObjectFeed, which rejects it.
- DEPENDENCIES: `sitespec-eligibility-contract`, registry contract for ObjectFeed.
- ACCEPTANCE: regenerate the coppersmith spec and the validator passes; either ObjectFeed accepts the schema or the explore query excludes it.
- NEXT FALSIFICATION: rerun validation against the coppersmith graph; a rejection falsifies any claim that Explore is spec-valid.

**23. ID: `sitespec-dependency-manifest` 
**23. ID: `sitespec-dependency-manifest` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Every section binding records component version, object field, claim reference, classification, and confidence. The manifest is the machine-readable "what depends on what" surface that powers owner corrections, regen impact analysis, and the binding verifier.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`bindingsForComponent`, `buildDependencyManifest`, manifest with `bindings`, `claimRef`, `confidence`), dated 2026-09-22; binding verifier wired per `~/workspace/fyd-lane/website-builder-authority-decisions.md`, dated 2026-09-21.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: every surviving section has a complete binding list in the manifest; a changed object field maps to affected sections.
- NEXT FALSIFICATION: change one object field and check the manifest; any section whose claim changed but whose binding was not listed falsifies the manifest's completeness.

**24. ID: `sitespec-confidence-law` 
**24. ID: `sitespec-confidence-law` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Presentation confidence can never exceed fact confidence (`assertConfidenceLaw`). A weakly evidenced fact cannot be rendered with high presentational confidence.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-dependency-manifest`.
- ACCEPTANCE: the planner asserts on every spec; a binding with confidence higher than its underlying fact fails generation.
- NEXT FALSIFICATION: construct a binding with presentation confidence above its fact confidence; if generation succeeds, the law is falsified.

**25. ID: `sitespec-owner-patch-loop` 
**25. ID: `sitespec-owner-patch-loop` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Structured SitePatch intents (reorder, hide/show, feature object, edit presentation copy, edit theme tokens), a digest-bound proposal (canonicalized body, SHA-256, no mutation until the exact proposal is approved), and pure application to a copied spec are all implemented.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__proceduralize__patch.ts` (intents, `proposalDigest`, `applySitePatch`), captured 2026-09-21.
- DEPENDENCIES: `sitespec-canonical-serialization-digest`.
- ACCEPTANCE: a patch proposal round-trips through propose, approve, apply with digest equality at each step; application never mutates caller-owned state.
- NEXT FALSIFICATION: apply a patch to a spec, then reapply to the same base; any divergence between the two results falsifies purity.

**26. ID: `sitespec-correction-survives-regen` 
**26. ID: `sitespec-correction-survives-regen` | DOMAIN: SITESPEC | STATUS: PROVE | PRIORITY: 1**
- WHY: The intended pipeline is SOURCE T2 -> OBJECT DIFF -> DEPENDENCY IMPACT -> GENERATED BASE UPDATE -> REAPPLY OWNER OVERRIDES -> VALIDATE -> RENDER. Owner customization must survive source refresh. This is the top technical proof in the build sequence and is not yet demonstrated end to end.
- EVIDENCE: build sequence in `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("Prove owner customization survives"), dated 2026-09-21; memory record of the regeneration pipeline, dated 2026-09-22.
- DEPENDENCIES: `sitespec-owner-patch-loop`, `sitespec-dependency-manifest`.
- ACCEPTANCE: change a source, regenerate, and verify the owner hide/copy/theme overrides still apply; a stale-base proposal yields an explicit STALE PROPOSAL state, never silent mutation.
- NEXT FALSIFICATION: modify a source field that an owner override touches; if the override silently vanishes or silently applies to different content, the pipeline is falsified.

**27. ID: `sitespec-must-win-density` 
**27. ID: `sitespec-must-win-density` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Planner density caps (maxSectionsPerPage) can drop sections, but must-win components (Hero, BusinessSummary, Services, Products, Contact, CTA, AskFYD, ObjectRail) always survive.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`pruneToDensity`), dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: a dense sparse-data spec still renders every must-win component that has eligible data.
- NEXT FALSIFICATION: craft a graph with more sections than the density cap allows; any missing must-win component falsifies the pruning rule.

**28. ID: `sitespec-navigation-derived` 
**28. ID: `sitespec-navigation-derived` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Navigation is derived from surviving pages, never authored separately. Pages only exist when data exists.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` / `~/workspace/fyd-build/work/src__fyd__proceduralize__generator.ts` (fixed page order home, about, services, explore; missing data means no page), captured 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: a graph with no services yields no services page and no services nav entry.
- NEXT FALSIFICATION: any nav entry pointing at a non-generated page falsifies the derivation.

**29. ID: `sitespec-design-tokens` 
**29. ID: `sitespec-design-tokens` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Design tokens are structured, additive, and versioned (v1 frozen). Token changes are presentation-only and can never rewrite business truth (layer separation).
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__sitespec__types.ts` (`DEFAULT_FYD_THEME`, token set), captured 2026-09-21; `~/workspace/fyd-harvest/harvest-report.md` verdicts on token contracts, dated 2026-09-21.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: changing a token alters no fact binding and no object field; token set changes only via versioned extension.
- NEXT FALSIFICATION: change a token and diff the manifest bindings; any changed claim falsifies the token/fact separation.

---

## DOMAIN: FYD RENDERER

**30. ID: `renderer-javascript-url-sink` 
**30. ID: `renderer-javascript-url-sink` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Hostile proof found that `javascript:` URLs in website and social fields reached raw `href` (FL-20260921-032). The fix is `safe-link.ts`: a parser-based scheme allowlist per capability (web/http/https, call/tel, mail/mailto), rejecting control-character smuggling, non-string values, malformed bases, and dangerous schemes. Central boundary: observed strings are data, links are executable capabilities.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts` cases 3, 6, 7 (FAIL pre-fix), dated 2026-09-21; `~/workspace/fyd-lane/safe-link.ts` plus `safe-link.test.ts`, dated 2026-09-21; `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("URL safety green"), dated 2026-09-21. Caveat: `~/workspace/fyd-lane/service-extraction-report.md` records the `safe-link` module as uncommitted (test suite fails without it), dated 2026-09-21, so committed-integration proof is the remaining step.
- DEPENDENCIES: none.
- ACCEPTANCE: step5 cases 3, 6, 7 (including tab/newline smuggling variants) PASS against the renderer that ships.
- NEXT FALSIFICATION: rerun the step5 URL battery against the live demo pages; any `javascript:` reaching an `href` falsifies the boundary.

**31. ID: `renderer-mobile-minw0` 
**31. ID: `renderer-mobile-minw0` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: The standing mobile-overflow lesson: genuine overflow at 320px was owned by Ask FYD design-token rows (label `flex` with `min-width:auto`, token input `flex-1` with `min-width:auto`, plus a 44px preview button). One-class fix `min-w-0` on the token input; the button keeps its 44px touch target. Verified at 320, 375, and 1280. The corollary rule: trace the ancestor chain and fix the exact overflow owner, never blanket `min-w-0`.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-033 (root cause + one-line fix + multi-breakpoint verification), recorded 2026-09-21 ~09:05; `~/workspace/fyd-lane/mobile-overflow-trace.js` ("the first overflowing ancestor owns the bug"), dated 2026-09-21. Note: the earlier 375px overflow report was a dirty-worktree artifact; the real committed defect was at 320px.
- DEPENDENCIES: `renderer-overflow-instrumentation`.
- ACCEPTANCE: no horizontal overflow at 320 and 375 with 44px touch targets preserved.
- NEXT FALSIFICATION: rerun the overflow trace at 320 on any regenerated demo; any `scrollWidth > clientWidth` on a real element falsifies the fix.

**32. ID: `renderer-overflow-instrumentation` 
**32. ID: `renderer-overflow-instrumentation` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: `fydOverflowTrace()` walks ancestors bottom-up and names the exact overflow owner (the narrowest element whose `scrollWidth > clientWidth`, plus the nearest positioned ancestor). Reusable diagnosis tool, not a one-off script.
- EVIDENCE: `~/workspace/fyd-lane/mobile-overflow-trace.js`, dated 2026-09-21.
- DEPENDENCIES: browser proof harness.
- ACCEPTANCE: on any future overflow, the trace names the owning ancestor in one run.
- NEXT FALSIFICATION: feed it a known-overflow fixture where the named element is not the true owner; a misattribution falsifies the heuristic.

**33. ID: `renderer-hostile-text-escaping` 
**33. ID: `renderer-hostile-text-escaping` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: React text escaping passed for script tags, image-onerror strings, SVG payloads, quote-breaking text, and literal entities (double-escaping preserved). No dangling `dangerouslySetInnerHTML` in the tested renderer path.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts` cases 1, 2, 5, 8 (PASS), dated 2026-09-21.
- DEPENDENCIES: `acq-hostile-input-fixtures`.
- ACCEPTANCE: the 5 text cases stay PASS on every renderer change.
- NEXT FALSIFICATION: any text case rendering executable markup falsifies the escape posture.

**34. ID: `renderer-missing-data` 
**34. ID: `renderer-missing-data` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Missing data means the section or page does not exist. Nothing is invented. Unknown schemas fall back to GenericObjectCard. This is the renderer's core no-invention contract.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__proceduralize__generator.ts` (reasoning item 3: "Missing data means the page or section does not exist; nothing is invented"), captured 2026-09-21; `~/workspace/fyd4-stage/generator.ts` same rule, dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: a sparse graph renders with no placeholder claims and no invented sections.
- NEXT FALSIFICATION: find any rendered factual claim with no backing binding; that falsifies the contract.

**35. ID: `renderer-render-model-fixtures` 
**35. ID: `renderer-render-model-fixtures` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Semantic render determinism (same ObjectGraph + SiteSpec + ViewerContext + renderer version yields the same semantic render model, not byte-identical DOM) is proven by byte-identical canonical render models across separate processes. Fixture regression must gate on semantic invariants plus structural diff review, never pixel identity.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-037 (two tsx processes, byte-identical 925-byte canonical models), recorded 2026-09-21; memory record of the semantic determinism invariant, dated 2026-09-21.
- DEPENDENCIES: `sitespec-canonical-serialization-digest`.
- ACCEPTANCE: render-model fixtures run in CI-like gates and fail only on semantic change, never on cosmetic drift.
- NEXT FALSIFICATION: run the determinism probe twice; any non-identical canonical model falsifies the invariant.

**36. ID: `renderer-responsive-matrix` 
**36. ID: `renderer-responsive-matrix` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: The 320/375/768/1280 browser proof matrix exists with artifacts. Desktop and mobile are green after the exact CSS diagnosis. The matrix is the gate for every demo surface.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("mobile green after exact CSS diagnosis", "browser proof: artifacts saved from browser-proof.sh"), dated 2026-09-21; `~/workspace/fyd-portal-proof/PROOF.md`, dated 2026-09-21.
- DEPENDENCIES: `renderer-mobile-minw0`.
- ACCEPTANCE: every demo page passes all four widths with no horizontal overflow.
- NEXT FALSIFICATION: any width in the matrix failing on a regenerated demo falsifies the responsive posture.

**37. ID: `renderer-a11y-touch-motion` 
**37. ID: `renderer-a11y-touch-motion` | DOMAIN: FYD RENDERER | STATUS: PROVE | PRIORITY: 2**
- WHY: Gates require WCAG 2.2 AA 24x24 touch targets, no hover-only interactions, and reduced-motion honored (measured in the portal proof). Touch, keyboard-only, and screen-reader behavior were not exercised in the portal proof and remain unverified.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` gate list, dated 2026-09-21; `~/workspace/fyd-portal-proof/PROOF.md` (UNVERIFIED touch/keyboard/screen-reader), dated 2026-09-21.
- DEPENDENCIES: `renderer-responsive-matrix`.
- ACCEPTANCE: automated checks assert minimum touch target size, keyboard reachability of all actions, and reduced-motion behavior on the demo pages.
- NEXT FALSIFICATION: keyboard-navigate the demo; any action unreachable without a pointer falsifies the accessibility claim.

**38. ID: `renderer-performance-budgets` 
**38. ID: `renderer-performance-budgets` | DOMAIN: FYD RENDERER | STATUS: PROVE | PRIORITY: 3**
- WHY: Performance is a hard engineering budget (LCP/INP/CLS, image weight, payload), never a product metric used to excuse a worse product. The portal proof measured 60fps and zero long tasks; the FYD demo surfaces need the same measured budget.
- EVIDENCE: `~/workspace/fyd-portal-proof/PROOF.md` measurements, dated 2026-09-21; harvest directive (performance is a hard engineering budget), memory record dated 2026-09-22.
- DEPENDENCIES: `renderer-responsive-matrix`.
- ACCEPTANCE: measured LCP/INP/CLS, image weight, and payload on the demo pages against stated budgets, not Lighthouse theater.
- NEXT FALSIFICATION: exceed any budget on a real demo page; the budget is falsified until the regression is fixed or the budget is re-justified.

---

## DOMAIN: COMPONENT REGISTRY

**39. ID: `registry-declared-contracts` 
**39. ID: `registry-declared-contracts` | DOMAIN: COMPONENT REGISTRY | STATUS: IN_PROGRESS | PRIORITY: 2**
- WHY: Every component should eventually declare accepted schemas, required and optional fields, capabilities, responsive behavior, and evidence bindings. The registry has 17 components plus GenericObjectCard fallback with eligibility, but formal per-component prop schemas are the identified harvest gap.
- EVIDENCE: `~/workspace/fyd4-stage/schemas.ts` (SCHEMA_COMPONENTS map, 17 components), dated 2026-09-22; `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 1 (json-render: "typed catalog plus constrained vocabulary"; gap named as "adding formal prop schemas per component"), dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: each registry entry declares accepted schemas, required/optional fields, capabilities, responsive behavior, and evidence bindings in a machine-readable form.
- NEXT FALSIFICATION: a component rendering a field outside its declared contract falsifies the registry's authority.

**40. ID: `registry-unknown-component` 
**40. ID: `registry-unknown-component` | DOMAIN: COMPONENT REGISTRY | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Unknown component kinds never fail. Unknown schemas fall back to GenericObjectCard. This is the resilience floor for schema evolution.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` ("Unknown schemas fall back to GenericObjectCard"), dated 2026-09-22; `~/workspace/fyd-harvest/harvest-report.md` architecture section, dated 2026-09-21.
- DEPENDENCIES: `registry-declared-contracts`.
- ACCEPTANCE: a graph carrying an unrecognized schema renders through the fallback with no error.
- NEXT FALSIFICATION: any unknown schema crashing generation or render falsifies the fallback.

**41. ID: `registry-socialproof-dormant` 
**41. ID: `registry-socialproof-dormant` | DOMAIN: COMPONENT REGISTRY | STATUS: OPEN | PRIORITY: 3**
- WHY: SocialProof appears in the schema-component map for business objects, but the generator never emits it and eligibility hard-falses it ("never invented"). Either testimonials/reviews ingestion feeds it or the entry should be dropped to avoid dead registry surface.
- EVIDENCE: `~/workspace/fyd4-stage/eligibility.ts` (SocialProof eligibility hard-false; "the generator emits no SocialProof section"), read 2026-09-22.
- DEPENDENCIES: `acq-ordered-rule-bundles` (review extraction would be a rule tier).
- ACCEPTANCE: a decision: SocialProof is either fed by a documented ingestion path with eligibility rules or removed from the registry.
- NEXT FALSIFICATION: if review data exists in captures and SocialProof stays dormant with no plan, the registry is carrying dead surface and the decision is falsified by inaction.

**42. ID: `registry-ai-vocabulary` 
**42. ID: `registry-ai-vocabulary` | DOMAIN: COMPONENT REGISTRY | STATUS: HARVEST | PRIORITY: 3**
- WHY: json-render's first primitive is a catalog-derived machine-readable AI vocabulary: the registry becomes the promptable contract so intelligence emits constrained patches, not arbitrary code. Intelligence produces data (AI to SitePatch), never arbitrary JSX.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 1 (json-render verdict: harvest the typed-catalog pattern; adapter sketch specified with a two-evening proof), dated 2026-09-22.
- DEPENDENCIES: `registry-declared-contracts`, `sitespec-owner-patch-loop`.
- ACCEPTANCE: a tiny proof shows the registry generating a constrained vocabulary that an intelligence layer uses to emit a valid SitePatch with no free-form code.
- NEXT FALSIFICATION: if the vocabulary cannot express a real owner intent (reorder, feature, theme change) without hand-authoring, the pattern is falsified for FYD's use.

**43. ID: `registry-object-rail` 
**43. ID: `registry-object-rail` | DOMAIN: COMPONENT REGISTRY | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: ObjectRail is the featured-object doorway: the richest related object rendered inline with image, title, subtitle, meta, and a real capability action. It is the centerpiece pattern of the FYD experience (object in the margin), not decoration.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` (ObjectRail featured selection), dated 2026-09-22; memory record of the product emphasis (2026-09-21); `~/workspace/fyd-portal-proof/PROOF.md` measurements, dated 2026-09-21.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: the ObjectRail renders the richest related object with its capability actions on desktop and the drawer/sheet equivalent on mobile.
- NEXT FALSIFICATION: if the ObjectRail ever features an object with no backing evidence or no real capability, the presentation is falsified.

**44. ID: `registry-askfyd-answer-shape` 
**44. ID: `registry-askfyd-answer-shape` | DOMAIN: COMPONENT REGISTRY | STATUS: OPEN | PRIORITY: 2**
- WHY: Ask FYD correctly refuses to invent (adversarial test PASS), but the `AskAnswer` shape is missing three required fields: per-sentence claim classifications, a separate unknowns list, and explicit source_urls (URLs are currently embedded in evidenceRef detail strings). Closing these is Ask-layer work after extraction produces service objects.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` sections 3 and 5 (gaps recorded), dated 2026-09-21.
- DEPENDENCIES: `acq-real-capture-service-gap`.
- ACCEPTANCE: every factual sentence carries a classification (DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION), unknowns are an explicit list, and source_urls is a first-class field.
- NEXT FALSIFICATION: ask a service question after extraction lands; any uncited factual sentence or missing unknowns list falsifies the answer contract.

---

## DOMAIN: WEBSITE ACQUISITION ESCALATION

**45. ID: `escalation-stack-pinned` 
**45. ID: `escalation-stack-pinned` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: The current stack is documented: static HTTP fetch as the default (L0/L1), Playwright as the rendered-site escalation rung (L2, pinned 1.63.0, real rendering engine). Playwright supplies actual JS execution and visual proof. No evidence yet that the current stack has failed to acquire required evidence.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 6 (Crawl4AI/Lightpanda verdict sheet), dated 2026-09-22, referencing `ACQUISITION-STACK.md` (2026-09-21) pinning Playwright 1.63.0 as the L2 engine.
- DEPENDENCIES: none.
- ACCEPTANCE: the pinned versions stay the documented default; any escalation rung documents its trigger.
- NEXT FALSIFICATION: an acquisition failure on a real required-evidence site falsifies "current stack is sufficient" and arms the escalation ladder.

**46. ID: `escalation-crawl4ai-design-harvest` 
**46. ID: `escalation-crawl4ai-design-harvest` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Crawl4AI is design-harvest only: SSRF destination validation, declarative request trust boundary, Shadow DOM flattening, CMP consent list, and 3-tier anti-bot detection. Rejected: the Docker server (RCE/SSRF/auth-bypass/file-write advisory history), LLM extraction (nondeterministic, prompt-injection surface), circumvention, and proxy escalation.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 6, dated 2026-09-22.
- DEPENDENCIES: `escalation-stack-pinned`.
- ACCEPTANCE: FYD reimplements only the named design patterns as small primitives; no Crawl4AI dependency is adopted.
- NEXT FALSIFICATION: if a Shadow-DOM or consent-walled site blocks required evidence and the harvested pattern does not resolve it, the pattern's sufficiency is falsified.

**47. ID: `escalation-lightpanda-ladder` 
**47. ID: `escalation-lightpanda-ladder` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Lightpanda is rejected as a default and as browser-proof replacement (no real rendering engine, no meaningful screenshots; AGPL-3.0; nightly-only releases). It stays a conditional escalation rung for DOM-only bulk acquisition, armed only by the benchmark trigger.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 7 (verdict: REJECT as default, CONDITIONAL as benchmark-only DOM acquisition rung), dated 2026-09-22.
- DEPENDENCIES: `escalation-benchmark-trigger`.
- ACCEPTANCE: AGPL-3.0 legal review completes before any deployment; it is never used for visual proof.
- NEXT FALSIFICATION: if the benchmark trigger fires and Lightpanda's DOM output is semantically inferior to Playwright's, the rung is falsified.

**48. ID: `escalation-benchmark-trigger` 
**48. ID: `escalation-benchmark-trigger` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: DECISION | PRIORITY: 3**
- WHY: Benchmarks of alternative acquisition tooling are held per Nolan's 2026-09-21 FOCUS NOW directive. The trigger is explicit: "current stack cannot acquire required evidence" after the structured-data repair. No speculative tool enthusiasm.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheets 6 and 7, dated 2026-09-22.
- DEPENDENCIES: `acq-real-capture-service-gap`.
- ACCEPTANCE: the trigger stays written and un-armed; no benchmark runs until an actual acquisition failure occurs.
- NEXT FALSIFICATION: an actual failure to acquire required evidence arms the trigger; continued deferral past that point falsifies the decision.

**49. ID: `escalation-ssrf-media-fetch` 
**49. ID: `escalation-ssrf-media-fetch` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: PROVE | PRIORITY: 1**
- WHY: Remote media fetch needs an SSRF boundary: allow only HTTP/HTTPS public origins; reject localhost, loopback, RFC1918, link-local, and cloud metadata endpoints; enforce size limits, content-type verification, timeouts, and redirect limits. The rights gate and pipeline-manifest validation exist; the hostile-URL falsification is the remaining proof.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` (SSRF boundary spec, 2026-09-21); `~/workspace/fyd4-stage/bundle-media.ts` (production-truth manifest validation, dated 2026-09-22).
- DEPENDENCIES: none.
- ACCEPTANCE: a hostile URL fixture battery (localhost, 169.254.169.254, oversized payload, wrong content-type) is rejected with typed failures, never fetched.
- NEXT FALSIFICATION: any hostile URL reaching a fetch falsifies the boundary.

**50. ID: `escalation-no-circumvention` 
**50. ID: `escalation-no-circumvention` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: DECISION | PRIORITY: 3**
- WHY: Anti-bot circumvention and proxy escalation are explicitly rejected. Platform constraints fail closed: a detected restriction becomes BLOCKED, never an optimization problem. This matches the standing platform automation principle.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 6 (REJECT circumvention), dated 2026-09-22; AGENTS.md platform automation principle (bounded authorized automation, fail closed).
- DEPENDENCIES: `escalation-benchmark-trigger`.
- ACCEPTANCE: no acquisition code path defeats a platform restriction; restrictions surface as typed BLOCKED states.
- NEXT FALSIFICATION: any acquisition attempt that evades a detected restriction falsifies the decision.

---

## SOURCES REVIEWED

- `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` (2026-09-21): 7 harvest cards plus kill list for acquisition patterns.
- `~/workspace/fyd-lane/harvest-ecosystem.md` (2026-09-22): 7 verdict sheets (json-render, puck, openpage, Webstudio, AI SDK, Crawl4AI, Lightpanda).
- `~/workspace/fyd-lane/service-extraction-report.md` (2026-09-21): Tier 1 service extraction, gate results, A/B measurements.
- `~/workspace/fyd-lane/service-semantics-harvest.md` (2026-09-21): schema ids, deterministic ID law, predicate inventory.
- `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` (2026-09-21): Ask FYD adversarial result, first broken step, answer-shape gaps.

1. **Event Authority is resolved only in a narrowed sense** 
1. **Event Authority is resolved only in a narrowed sense** ("ping_events has exactly one writer"); CanonicalEventEnvelope remains a second effective event authority. Operator question 10 (WBD) is still open.

2. **The learning loop executes but does not learn** 
2. **The learning loop executes but does not learn**: 144 missions / 18 chains, zero non-test consumers, zero approvals via KnowledgePromoter, MISSION_COMPLETED with no production subscriber.

3. **Mission Control is partially rebuilt as an honest projection** 
3. **Mission Control is partially rebuilt as an honest projection** (Phase 24, worktree), but the deploy branch diverges and `/system/state` still ships misleading collectors; honest backends (`/mc/replay/stats`, `/mc/witness/stats`, `/mc/dashboard`) are live yet unwired to any UI.

4. **Live provenance is broken right now** 
4. **Live provenance is broken right now**: both Oracle gateways run `candidate-3c5d280dd` while the accepted baseline is `84486f056`, `deployment_registry` has 0 rows, and two containers share one DB (latent dual-writer). Nolan's call is pending.

5. **Identity is the live minefield** 
5. **Identity is the live minefield**: live mints 64-hex `JSON.stringify` IDs; worktree certifies `event_<16hex>` RFC-8785 IDs; three WorkOrder and two Mission identity schemes compete.

---

## MISSION CONTROL

**MC-01 — Phantom-surface fleet: per-surface contract map** 
**MC-01 — Phantom-surface fleet: per-surface contract map**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: Phase 24 rewired 5 surfaces and quarantined 12 phantom surfaces in the worktree, but the deploy branch (`oracle/deploy-2026-09-18`) carries a divergent superset with the same phantoms byte-identical, and `mock-data/` remains imported by ~20 components.
- EVIDENCE: `~/workspace/forensics/phase24-mission-control-2026-09-19.md` (10 files changed, NotLiveInventory); `~/workspace/forensics/recon-2026-09-19/lane-m-missioncontrol-audit.md` §4 (honesty commits only touched the missions surface; command-center phantoms identical on deploy branch).
- DEPENDENCIES: MC-08 (what Mission Control is allowed to be). ACCEPTANCE: every mounted surface maps to a verified live route; every unmounted surface appears in the visible NotLiveInventory; `mock-data/` imports gone from production builds. NEXT FALSIFICATION: fetch() audit of the merged UI tree after Phase-24 merge; any fetch to a 404 route re-opens this.

**MC-02 — Mission Control must not become a second authority** 
**MC-02 — Mission Control must not become a second authority**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 1
- WHY: Standing law says Mission Control observes/configures but never becomes a second permission authority; Mutation-button audit proved no UI mutation button reaches any real backend transition (approve/reject/reorder POST into the void), which is currently the good kind of broken.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` (MissionCards rewritten read-only: "Mission Control never mutates mission state"); memory/2026-09-17#L628 (Nolan: "must not become a second permission authority"); `lane-m-missioncontrol-audit.md` §3.
- DEPENDENCIES: MC-09. ACCEPTANCE: documented authority boundary (observe + propose + human-gated approval route only) enforced at the call site, not in comments. NEXT FALSIFICATION: any new mutation button merged without a witnessed backend contract.

**MC-03 — Event-count scope discrepancy across backends** 
**MC-03 — Event-count scope discrepancy across backends**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: `/system/state` reports postgres.total_events=0, `/mc/dashboard` reports 45, `/mc/replay/stats` 26, `/mc/witness/stats` 26, missions.completed 191 vs PG 419 rows. CockpitDashboard displays all four side by side with a banner rather than resolving; the backend follow-up to reconcile scopes is still open.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` ("Discrepancy Handling", backend follow-up #1); `lane-m-missioncontrol-audit.md` §2 live probes.
- DEPENDENCIES: HO-08 (SystemAuthority bound to the wrong event source). ACCEPTANCE: one documented scope semantic per route, or a canonical source per metric, displayed in the dashboard. NEXT FALSIFICATION: probe each route and show two disagreeing counts for the same nominal metric.

**MC-04 — NotLiveInventory: 12 preserved-but-not-live surfaces** 
**MC-04 — NotLiveInventory: 12 preserved-but-not-live surfaces**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: 12 surfaces (ConstitutionalLifecycle, NightShift, DecisionEngine, ConstitutionalMixer, ReasoningPuppetStrings, OllamaControlRoom, MCPOrchestration, TimeMachine, ConstitutionalObjects, OrganizationalHealth, etc.) are preserved in-tree but unmounted per "refactor authority, preserve mechanism." Each needs either a real backend route or permanent retirement.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` (PHANTOM/UNWIRED classifications); `lane-m-missioncontrol-audit.md` §5 ordered mutation list.
- DEPENDENCIES: backend routes (gateway lane). ACCEPTANCE: each inventoried surface is either wired to a real route or deleted after deadness proof; inventory empties or becomes a deliberate "not wanted" list. NEXT FALSIFICATION: a surface quietly re-mounted without a backing route.

**MC-05 — /system/state misleading collectors** 
**MC-05 — /system/state misleading collectors**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 1
- WHY: `collectReplay` counts ALL events as replay runs; `collectMissions` counts MISSION_CREATED as completed with hardcoded 0s; `collectKnowledge` caps counts at 1 via limit=1 and hardcodes witnesses to 0. UI CLAIM > BACKEND PROOF at the source.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 (REAL route, MISLEADING pockets); backlog P1 "Mission Control truthfulness".
- DEPENDENCIES: none. ACCEPTANCE: total_runs counts REPLAY_COMPLETED; completed comes from missionRuntime; knowledge counts uncapped and derived or omitted. NEXT FALSIFICATION: probe /system/state after the fix and compare against direct PG counts.

**MC-06 — Deploy-branch UI contract mismatch (`/api/*` vs real gateway routes)**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The deploy-branch UI fetches `/api/{witness,observation,commands,pipeline,notifications,system/state}` which 404 on the live gateway; real routes are `/mc/*`, `/missions`, `/events`, `/knowledge`; 7 components hardcode `localhost:8080` ignoring `NEXT_PUBLIC_GATEWAY_URL`. Phase 24 fixed the worktree copy only.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §b (per-surface FAIL table, contradictions 1-2); `phase24-mission-control-2026-09-19.md`.
- DEPENDENCIES: merge decision for Phase-24 branch. ACCEPTANCE: one UI contract (the real gateway contract) on the deployed branch; no hardcoded hosts. NEXT FALSIF

**MC-07 — Honest backends with zero UI callers (cheapest truthful win)** 
**MC-07 — Honest backends with zero UI callers (cheapest truthful win)**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: Live-probed `/mc/replay/stats` (26 verified replays), `/mc/witness/stats` (26 attestations), `/mc/dashboard` (real business metrics, missions 417 completed/2 failed matching PG 419) are TRUTHFUL and completely unwired to any UI. Building the Replay/Witness panel is the highest-leverage honest surface.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 live probes; `recon-2026-09-19/agent-g-storage-mc-oracle.md` §b.
- DEPENDENCIES: none. ACCEPTANCE: Replay/Witness panel rendering live `/mc/replay/stats` + `/mc/witness/stats` + `/mc/replay/trace/:correlationId`. NEXT FALSIFICATION: panel shows numbers that do not match direct PG queries.

**MC-08 — Define Mission Control as identity-owned operating environment (projection model)** 
**MC-08 — Define Mission Control as identity-owned operating environment (projection model)**
- DOMAIN: MISSION CONTROL · STATUS: DECISION · PRIORITY: 2
- WHY: The target model lists states (Today / Missions / Approvals / Customers-Leads / Integrations / Automations / Knowledge / Activity-Lineage / System Health) but Missions, Runs, Objects, Relationships, Feed, Capabilities, Private Context, Evidence/History as a projection model with an identity-owned operating environment is not yet pinned; Mission Control is NOT the identity domain object (per task framing) and must not invent its own CMS/auth/event store/scheduler/campaign state/knowledge graph/credential store.
- EVIDENCE: memory/2026-09-17#L628 (Nolan's standing UI principles; PING primitive is Mission→Run→Execution→Evidence); `ping-architectural-recon-2026-09-19.md` §AT (target UI model, law UI CLAIM ≤ BACKEND PROOF); memory/2026-09-21#L1482 (read-first identity archaeology, REUSE/WRAP/EXTRACT/REJECT).
- DEPENDENCIES: identity convergence (MRE-02/03). ACCEPTANCE: one written projection model naming each surface's backing route, owner, and authority boundary; public UI and Mission Control may share code but never share authority. NEXT FALSIFICATION: a surface that writes to a store Mission Control does not own.

**MC-09 — Mission mutation buttons stay hidden until a witnessed transition contract exists** 
**MC-09 — Mission mutation buttons stay hidden until a witnessed transition contract exists**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: Approve/reject/reorder/start/edit/delete have no backend contract anywhere in the gateway; optimistic UI updates on nonexistent routes are the worst mutation pattern in the tree. The approval/effect state machine (W) is the prerequisite contract.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §3 (all UNSUPPORTED) and §5 C17; `ping-architectural-recon-2026-09-19.md` §W (durable state machine design, unwired).
- DEPENDENCIES: AG-04/AG-05 (approval + effect identity wired). ACCEPTANCE: each mutation button maps to an authorized, witnessed backend transition; until then hidden, not fake. NEXT FALSIFICATION: a mutation button that POSTs to a 404.

**MC-10 — Live provenance break: baseline image replaced with no promotion record + dual-writer** 
**MC-10 — Live provenance break: baseline image replaced with no promotion record + dual-writer**
- DOMAIN: MISSION CONTROL · STATUS: BLOCKED · PRIORITY: 1
- WHY: Both Oracle gateways now run `ping-gateway:candidate-3c5d280dd` (26h+, restarts=0, /health healthy) while the accepted baseline is `candidate-84486f056`; `deployment_registry` in Postgres has 0 rows; both containers share identical env → same DB (latent two-writer). The report asks Nolan: accept 3c5d280dd as the new baseline and stop :8081, or not. No green label may cover an undocumented build.
- EVIDENCE: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("Baseline vs live reality", open question); memory/2026-09-21#L338 (3c5d280dd passed the 8081 battery; production 8080 still on 84486f056 at 05:55 MDT that day).
- DEPENDENCIES: Nolan's explicit decision. ACCEPTANCE: deployment_registry (or deployments.log) records the promotion with source SHA, image digest, deploy time; exactly one writer against the DB. NEXT FALSIFICATION: live image digest not present in the registry.

---

## MISSION / RUN / EXECUTION

**MRE-01 — Auditable unit: Mission → Run → Execution (never collapse)** 
**MRE-01 — Auditable unit: Mission → Run → Execution (never collapse)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: The auditable unit is Mission (durable business objective) → Run (one autonomous agent attempt, one container lifetime, one worktree) → child Executions (one ExecutionAuthority.execute() invocation each). A Run may contain many Executions and must never be collapsed into one opaque execution record. The ORCA loop currently never creates MissionRuntime missions, and its recovery design references machinery it does not use.
- EVIDENCE: memory/2026-09-16#L600 (auditable unit definition); `recon-2026-09-19/agent-f-temporal-orca-approval.md` §h C7 (RESTART-RECOVERY-DESIGN references claimMission; loop never creates missions).
- DEPENDENCIES: MRE-02. ACCEPTANCE: ORCA objectives reconcile to MissionRuntime missions (or the divergence is a recorded decision); run identity is stable across restarts; Executions are individually evidenced. NEXT FALSIFICATION: one "execution" record whose internal steps cannot be independently evidenced.

**MRE-02 — Two competing mission identity schemes** 
**MRE-02 — Two competing mission identity schemes**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: MissionRuntime uses content-derived `sha256(missionType:event_id)[0:16]` (idempotent); ORCA uses synthetic `orca-loop:<objective_id12>:<taskKey>`. Two identity regimes for "mission" break replay, dedup, and cross-branch result correlation.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §c and C3; `ping-architectural-recon-2026-09-19.md` §AG duplication matrix (Mission models row).
- DEPENDENCIES: none. ACCEPTANCE: one derivation pinned per identity in a contract doc with a failing-first test; other scheme classified LEGACY_INGRESS or retired. NEXT FALSIFICATION: two rows/events for one logical mission under different IDs.

**MRE-03 — Three competing WorkOrder identity schemes** 
**MRE-03 — Three competing WorkOrder identity schemes**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: codex legacy `sha256('workorder:'+taskId)[0:16]`, orca caller-supplied 32-128 hex override, objective-runtime `sha256('work-order:'+objective_id+':'+task_key)` full hex. Legacy minter is task-scoped, not attempt-scoped; attempt only enters `result_id`.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e and C2; `ping-architectural-recon-2026-09-19.md` §AI-18.
- DEPENDENCIES: MRE-02. ACCEPTANCE: one scheme owned by the adapter (`stableWorkOrderId` with explicit override is the strongest shape). NEXT FALSIFICATION: duplicate WorkOrders for one logical task after restart.

**MRE-04 — Attempt identity and retry numbering** 
**MRE-04 — Attempt identity and retry numbering**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 2
- WHY: `attempt_id = workOrderId + '-attempt-' + N`; retry = new attempt, same logical effect/work-order ID. MissionRuntime retries (max 3, 5s backoff, lease reclaim) and ORCA's process-local MAX_ATTEMPTS=2 are two different retry owners; Temporal's retryPolicy is unwired.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e; `agent-f-temporal-orca-approval.md` §c (A6 root causes: run-scoped derivation, in-memory issueWorkOrder); `ping-architectural-recon-2026-09-19.md` §AV (retry uses a new attempt with the same logical effect ID).
- DEPENDENCIES: MRE-11 (one retry owner). ACCEPTANCE: every retry is a numbered attempt under a stable parent ID; no retry mints a new logical identity. NEXT FALSIFICATION: a retry that creates a new work_order_id (the demonstrated A6 duplicate-delegation failure).

**MRE-05 — Mission state ≠ Object state** 
**MRE-05 — Mission state ≠ Object state**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: `ping_missions` is operational state (claim/lease/retry) mirrored into durable MISSION_* canonical events; the table lacks namespace, principal, and parent_mission_id columns (namespace/correlation live only inside payload). Mission lifecycle state must never be confused with the canonical state of the business object the mission acts on.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §c (persistence, canonical event mirror, parent/child/principal gaps); memory/2026-09-16#L191 (canonical pipeline: mission execution → result/evidence).
- DEPENDENCIES: none. ACCEPTANCE: documented separation; namespace/principal/parent as first-class columns or an explicit recorded decision to keep them payload-only. NEXT FALSIFICATION: a query that reads mission status as object truth.

**MRE-06 — Execution ≠ Authorization (Python/JS boundary)** 
**MRE-06 — Execution ≠ Authorization (Python/JS boundary)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: `authorizeWorkOrder` is authorization, not approval; it mandates `no_canonical_events` and `no_mission_state_writes`. The 34/34 multi-runtime proof demonstrated Python behind the worker boundary without the ability to emit canonical events. The JS→Python transport must be a localhost HTTP sidecar with bearer auth and must not create another execution authority.
- EVIDENCE: memory/2026-09-16#L1011 (multi-runtime proof); memory/2026-09-16#L663 (Nolan's sidecar directive); `agent-d-lineage-mission-workorder.md` §e (adapter gate).
- DEPENDENCIES: none. ACCEPTANCE: Python adapter with Postgres wiring, retry/dead-letter, remote transport, concurrency (all partial today) behind the sidecar; an attempted canonical emit from Python fails closed. NEXT FALSIFICATION: a Python-side write that lands in ping_events without passing the JS authority.

**MRE-07 — Worktree isolation for agent runs** 
**MRE-07 — Worktree isolation for agent runs**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: The execution model requires one worktree per Run (memory definition) and one writer per mutable unit in isolated worktrees (WBD lanes). The Run's filesystem scope must be auditable as part of the Run record.
- EVIDENCE: memory/2026-09-16#L600 (one container lifetime, one worktree); `execution-wbd-2026-09-19.md` (lanes, one writer per mutable unit, isolated worktrees).
- DEPENDENCIES: MRE-01. ACCEPTANCE: every Run record names its worktree/container lifetime; concurrent Runs cannot write the same mutable unit. NEXT FALSIFICATION: two Runs with overlapping write scopes and no merge-authority record.

**MRE-08 — Retry ownership: PING vs Temporal** 
**MRE-08 — Retry ownership: PING vs Temporal**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: DECISION · PRIORITY: 2
- WHY: Today PING owns durable retry (`MissionRuntime.failWithRetry`, live), lease renewal, and lease reaping; Temporal owns nothing (0 workflows ever executed; SDK absent in main repo; one scheduler provider starts a nonexistent workflow). The documented constraint "Temporal owns execution mechanics" is inverted in the running system.
- EVIDENCE: `agent-f-temporal-orca-approval.md` §a and §d (responsibility table: GAP/VIOLATION verdicts); `ping-architectural-recon-2026-09-19.md` §AI-07/AI-08.
- DEPENDENCIES: MRE-09 (A6 re-test evidence). ACCEPTANCE: explicit decision: adopt Temporal after A6 proof, or certify the PG-lease scheduler as the documented owner (target model §AO already leans here). NEXT FALSIFICATION: a durability claim that names Temporal as the mechanism while zero workflows have executed.

**MRE-09 — A6 restart resilience: remediation unproven** 
**MRE-09 — A6 restart resilience: remediation unproven**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: BLOCKED · PRIORITY: 1
- WHY: The witnessed kill-9 test FALSIFIED A6 (duplicate delegation: two work_order_ids, two WORKER_FAILED for one logical task; no rediscovery/reconstruction/continuation). Remediation (stable objective/work-order/attempt IDs, startup reconciliation, crash-safe rendezvous, PG advisory-lock coordinator claim, durable budget) is WIRED_UNPROVEN. The re-test is the promotion gate.
- EVIDENCE: `agent-f-temporal-orca-approval.md` §c (A6 FALSIFIED, witnessed) and §d (smallest-change list); `ping-architectural-recon-2026-09-19.md` §AZ.
- DEPENDENCIES: supervised experiment authorization. ACCEPTANCE: witnessed kill-9 re-test with zero duplicate WorkOrders, zero lost missions, cycle state recovered, all transitions attested. NEXT FALSIFICATION: any A6 claim before that re-test runs.

**MRE-10 — Result truth: worker is not the judge of its own correctness** 
**MRE-10 — Result truth: worker is not the judge of its own correctness**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: Result semantics verified as (a) worker returned bytes YES, (b) worker claims success YES, (c) execution completed PARTIAL, (d) verified outcome NO. `verifyResultEnvelope` validates binding/identity/coherence only; `recordVerifiedResult` records the validated claim, not a verified truth. The "26/26 validated" claim rests on a harness with 3 asserts, not 26 checks.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e (result-semantics verdict) and C9; backlog P1 "Result truth".
- DEPENDENCIES: none. ACCEPTANCE: machine-checkable assertion suite for the status algebra + executor binding + deadline, run in CI; output-content truth assigned a separate owner (unknown AJ-07). NEXT FALSIFICATION: a WORKER_COMPLETED event whose output content was treated as verified truth.

**MRE-11 — Durable orchestration journal: same-transaction discipline** 
**MRE-11 — Durable orchestration journal: same-transaction discipline**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: DECISION · PRIORITY: 1
- WHY: Crash between side effect and ack, duplicate delivery, and worker-completes-but-PING-dies-before-result-persistence are unanswered. The harvested mechanism: mission state transition + worker result + next-mission creation commit atomically (DBOS same-transaction discipline; Hatchet terminal-release idempotency keys), not another framework.
- EVIDENCE: backlog P1 "Durable orchestration"; `recon-2026-09-19/lane-f-falsification.md:136` (same-transaction discipline); `ping-architectural-recon-2026-09-19.md` §AE (DBOS/Restate harvest rows).
- DEPENDENCIES: MRE-08. ACCEPTANCE: keyed recovery with stable idempotency keys, durable checkpoints, webhook-resumed approvals; crash windows A-E re-classified after implementation. NEXT FALSIFICATION: a crash-window test that loses a committed effect.

**MRE-12 — UNKNOWN reconciliation and envelope time-field honesty** 
**MRE-12 — UNKNOWN reconciliation and envelope time-field honesty**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 2
- WHY: UNKNOWN execution states need deterministic reconciliation (re-check provider by provider_request_id before re-execution, never blind retry). Separately, the ORCA audit found worker envelope timestamps templated (startedAt/endedAt not matching the run window) - unreliable time metadata inside a provenance record.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AV (crash rule: re-check EFFECT_EXECUTING against provider); `goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md` (timestamp discrepancy, EVIDENCE_METADATA_DEFECT).
- DEPENDENCIES: AG-04. ACCEPTANCE: reconciliation path for UNKNOWN with provider request-ID check; envelope timestamps sourced from the rendezvous record, not templated. NEXT FALSIFICATION: a retry executed without a provider-state check.

**MRE-13 — Mission taxonomy collapse (20 types → 1 worker)** 
**MRE-13 — Mission taxonomy collapse (20 types → 1 worker)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 3
- WHY: MISSION_WORKER_MAP routes ~20 business mission types (CUSTOMER_ONBOARD, LEAD_FOLLOWUP, INVOICE_TRACK...) all to the single 'observation' worker. The taxonomy claims domain diversity the scheduler does not execute.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §c; `ping-architectural-recon-2026-09-19.md` §N.
- DEPENDENCIES: none. ACCEPTANCE: each mission type maps to a real worker or the taxonomy is collapsed honestly. NEXT FALSIFICATION: a mission type whose dispatched worker cannot perform it.

**MRE-14 — Live vs certified identity divergence (the sharpest contradiction)** 
**MRE-14 — Live vs certified identity divergence (the sharpest contradiction)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: Live container mints 64-hex SHA-256 over raw `JSON.stringify` (key-order dependent, mint-before-validate, namespace-conditional preimage); the certified worktree mints `event_<16hex>` via IdentityAuthority with RFC-8785 canonicalization and validate-before-mint. Same logical event → different IDs. Any identity/ordering certification attaches to worktree code only, not to rows the running container minted.
- EVIDENCE: `forensics/phase1-two-authority-reverify-2026-09-19.md` §211-243 (LIVE_VERIFIED/SOURCE_VERIFIED divergence table).
- DEPENDENCIES: MC-10 (which build is actually live). ACCEPTANCE: deployed artifact's identity scheme proven and pinned; certified scheme deployed or the certification scope is explicitly worktree-only. NEXT FALSIFICATION: a replay that joins live rows by event_id across the two schemes.

**MRE-15 — Empty legacy mission tables vs live mission truth** 
**MRE-15 — Empty legacy mission tables vs live mission truth**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 3
- WHY: `mission_events` and `mission_executions` tables have 0 rows on Oracle; mission truth lives in `ping_missions` + MISSION_* canonical events. The empty tables are either preserved history or dead schema that should stop being created.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §a census; `agent-d-lineage-mission-workorder.md` §c.
- DEPENDENCIES: convergence decision on event-store (BD-05). ACCEPTANCE: each empty table classified (PRESERVED_HISTORY vs dead schema) and new deploys follow the classification. NEXT FALSIFICATION: a writer found inserting into one of the "dead" tables.

---

## LEARNING LOOP

**LL-01 — The loop executes but does not learn (core finding)** 
**LL-01 — The loop executes but does not learn (core finding)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: 144 missions completed and 18 full intelligence chains ran, but there are zero non-test consumers of mission results and zero approvals through the wired KnowledgePromoter path. The execution engine runs; the learning edges are dead.
- EVIDENCE: memory/2026-09-19#L1740 (product-loop finding); `ping-architectural-recon-2026-09-19.md` §AX (first business proof: "First broken arrow today").
- DEPENDENCIES: LL-02, LL-03. ACCEPTANCE: at least one production mission result consumed by a learning edge (promotion proposal, playbook revision, or knowledge update) with full evidence. NEXT FALSIFICATION: another 50 completed missions with zero learning-edge consumption.

**LL-02 — Mission-result consumers: dead ends inventory** 
**LL-02 — Mission-result consumers: dead ends inventory**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: MissionScheduler discards worker dispatchResult (stores only completion metadata); MISSION_COMPLETED has no production subscriber; LINEAGE_CREATED is terminal while its projection-listener declaration is unreachable; WITNESS_REJECTED has no consumer or operator signal; recommendations are listed but have no approve/reject/act path.
- EVIDENCE: memory/2026-09-20#L865 (product-loop dead ends, verified).
- DEPENDENCIES: none. ACCEPTANCE: each dead end either wired to a consumer or explicitly classified terminal-with-reason. NEXT FALSIFICATION: a new worker result type added with no consumer.

**LL-03 — Approval event producer (highest-leverage close)** 
**LL-03 — Approval event producer (highest-leverage close)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: Knowledge promotion expects approval events, but no producer or approval endpoint exists. The investigation's identified smallest close is an approval event producer on an existing route.
- EVIDENCE: memory/2026-09-20#L865; `ping-architectural-recon-2026-09-19.md` §R (ASSESSMENT: human approval events → KnowledgePromoter, WIRED_UNPROVEN).
- DEPENDENCIES: AG-05 (one durable approval gate). ACCEPTANCE: a production approval event flows into KnowledgePromoter and changes a knowledge node state with provenance. NEXT FALSIFICATION: the producer emits events the promoter never reads.

**LL-04 — Test-scoped compounding proof → production wiring** 
**LL-04 — Test-scoped compounding proof → production wiring**
- DOMAIN: LEARNING LOOP · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The full loop was verified in test scope (proposal → human approval → activation → authorized mission → execution → outcome → revision proposal, with replay, witness, lineage, restart survival). Revision `194a2b85bde957ed` v1.1.0 remains PENDING_HUMAN; active v1.0.0 untouched; no auto-promotion. The mechanism exists; production wiring does not.
- EVIDENCE: memory/2026-09-16#L1069; memory/2026-09-17#L268.
- DEPENDENCIES: LL-03, AG-04. ACCEPTANCE: one production knowledge revision promoted through human approval with the same evidence chain. NEXT FALSIFICATION: an auto-promotion (active version changed without a recorded human approval).

**LL-05 — Self-certification seam: emitter must never mint VERIFIED** 
**LL-05 — Self-certification seam: emitter must never mint VERIFIED**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: The 09-13 verdict traced a full emission chain where the engine named itself, self-certified via mark-verified.sh (checks file existence, never verification work), hardcoded `verification_status='verified'`, and the gateway checked bearer-only. The smallest seam: PING-owned `knowledge_state` column on ping_events; emitter claims coerced to non-canonical default; VERIFIED becomes a PING-side operation requiring a verifier principal distinct from the engine key.
- EVIDENCE: memory/2026-09-13#L728 (full verdict with T0-T6 trace; awaiting Nolan's decision on building the seam + interim rule).
- DEPENDENCIES: Nolan's decision (recorded as pending since 09-13). ACCEPTANCE: no unattended emission can carry VERIFIED; verification is POST /events/:id/verification with PASS/FAIL/INSUFFICIENT + reasons. NEXT FALSIFICATION: a VERIFIED row whose verifier principal equals the emitter.

**LL-06 — Unauthenticated knowledge write path (POST /knowledge/nodes + /edges)** 
**LL-06 — Unauthenticated knowledge write path (POST /knowledge/nodes + /edges)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: Both routes are public with no auth and accept caller-supplied status/confidence - a second unauthenticated write path into PING-held knowledge, independent of the event pipeline.
- EVIDENCE: memory/2026-09-13#L728 ("a second unauthenticated write path"); `ping-architectural-recon-2026-09-19.md` §AU (target security model).
- DEPENDENCIES: LL-05. ACCEPTANCE: auth on both routes; caller-supplied status/confidence coerced or rejected; audit of existing rows for injected claims. NEXT FALSIFICATION: an unauthenticated POST that lands a node with status=approved.

**LL-07 — Negative knowledge states absent as code** 
**LL-07 — Negative knowledge states absent as code**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: UNKNOWN, INSUFFICIENT_EVIDENCE, CONFLICTING_EVIDENCE, STALE, UNVERIFIED, NOT_APPLICABLE have zero hits in runtime code. The system cannot distinguish "never looked" from "looked and found nothing"; `rejected` is the only negative pole.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §R; backlog P3 (knowledge/entity/freshness layer); §AP target (negative states exist as code).
- DEPENDENCIES: LL-11. ACCEPTANCE: negative states as code with transitions; Ask FYD answers "what it doesn't know" from these states. NEXT FALSIFICATION: a query returning an empty answer indistinguishable from a negative finding.

**LL-08 — Freshness, dependency edges, targeted recompile (the moat mechanism)** 
**LL-08 — Freshness, dependency edges, targeted recompile (the moat mechanism)**
- DOMAIN: LEARNING LOOP · STATUS: HARVEST · PRIORITY: 2
- WHY: No dependency edges, no staleness columns; a 24h file cache can serve stale evidence silently. The harvest decision: Dagster-style asset-centric lineage + Nix-style declared-input lockfiles + Iceberg snapshot lineage → content-addressed dependency graph from source snapshots through compiler runs to claims, enabling targeted invalidation and incremental recompilation.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §S (current state), §AY (knowledge-compounding proof gate), §AE harvest rows (dbt/Dagster/Iceberg/Nix), §BC-10 (highest-confidence improvement #10: "the moat mechanism; everything else is hygiene").
- DEPENDENCIES: LL-07. ACCEPTANCE: one source snapshot with content hash → distill → claim-diff proof (AY) passes. NEXT FALSIFICATION: a claim served after its source snapshot changed with no invalidation marker.

**LL-09 — Outcome feedback: A4 observed but not wired to business events** 
**LL-09 — Outcome feedback: A4 observed but not wired to business events**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: Outcome observation (ORCA A4) is proven in the control loop but not wired to business events (lead → outcome → customer knowledge update). The AX business-proof trace breaks at "outcome observed (open/reply) → evidence recorded → customer knowledge updated."
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AX (first business proof; second/third broken arrows); memory/2026-09-20#L865.
- DEPENDENCIES: LL-03, site/customer outcome instrumentation (FYD side). ACCEPTANCE: one business effect (e.g. outreach email) traced through to an observed outcome recorded as evidence and reflected in customer knowledge. NEXT FALSIFICATION: an effect with no outcome-observation path after the send.

**LL-10 — Execution feedback dataset / trajectory-level evaluation** 
**LL-10 — Execution feedback dataset / trajectory-level evaluation**
- DOMAIN: LEARNING LOOP · STATUS: HARVEST · PRIORITY: 3
- WHY: Missions should be evaluated as trajectories against replay (Phoenix pattern: evals from spans to whole trajectories), with every VERIFIED claim linking to its verification trace (Langfuse pattern, self-hosted posture).
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AE (Phoenix, Langfuse rows); §TBD in BD plan (BD-16 business/knowledge proofs).
- DEPENDENCIES: MRE-01 (trajectories need stable Run identity), LL-01. ACCEPTANCE: one mission trajectory evaluated against its replay with a recorded score and trace link. NEXT FALSIFICATION: an evaluation that cannot be re-derived from the event journal.

**LL-11 — Deterministic consumers of learnings (promotion replay)** 
**LL-11 — Deterministic consumers of learnings (promotion replay)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: Knowledge promotion decisions must be deterministic consumers: the same evidence + policy → the same promotion decision, replayable. The compiler input_manifest / output_manifest design exists only as a minimum-metadata sketch.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §S (minimum-metadata design, no implementation); §BD-10.
- DEPENDENCIES: LL-08. ACCEPTANCE: a promotion decision re-derived from its recorded inputs reproduces byte-identically. NEXT FALSIFICATION: two identical evidence sets producing different promotion outcomes.

**LL-12 — Emitter vocabulary: OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING only** 
**LL-12 — Emitter vocabulary: OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING only**
- DOMAIN: LEARNING LOOP · STATUS: DECISION · PRIORITY: 1
- WHY: The engine may create OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING/VERIFICATION_REQUEST but never VERIFIED; interim rule (no code): no unattended learn-file emissions, every mark-verified needs Nolan's explicit per-item approval. This decision has been pending since 09-13.
- EVIDENCE: memory/2026-09-13#L728 (smallest seam + interim rule, "Awaiting Nolan's decision").
- DEPENDENCIES: Nolan's explicit decision. ACCEPTANCE: vocabulary enforced at emit (coercion) or documented interim rule in force with evidence. NEXT FALSIFICATION: an unattended emission carrying a canonical truth claim.

---

## HEALTH + OBSERVABILITY

**HO-01 — /health claims healthy with zero checks registered** 
**HO-01 — /health claims healthy with zero checks registered**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: `getHealth()` starts at `status:'healthy'` and iterates registered checks; with zero checks it returns healthy with empty components. The fix is one conditional: return `unknown`/`unproven` with an explicit note. Audit-only so far; belongs in the convergence lane with a fail-before test, not a hot patch.
- EVIDENCE: `~/workspace/health-truth-audit-2026-09-20.md` Finding 1.
- DEPENDENCIES: none. ACCEPTANCE: /health with no checks returns a non-healthy status naming the absence; fail-before test red, then green. NEXT FALSIFICATION: a fresh boot returning healthy before any check registers.

**HO-02 — No green labels for "not configured" (global rule)** 
**HO-02 — No green labels for "not configured" (global rule)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The backlog P1 is explicit: remove or quarantine every fixture/mock/hardcoded production surface; UI claim ≤ backend proof. Phase 24 + the 09-18 cleanup commits are the mechanism; coverage is incomplete (deploy branch, latent mock-data imports).
- EVIDENCE: `forensics/convergence-backlog-2026-09-19.md` P1; `phase24-mission-control-2026-09-19.md`; `agent-g-storage-mc-oracle.md` §b.
- DEPENDENCIES: MC-01/MC-06. ACCEPTANCE: no production surface renders a health/status claim not backed by a live check. NEXT FALSIFICATION: any "Healthy"/"Ready"/"All systems nominal" string in a production build path.

**HO-03 — Recovery state classification (ladder states as evidence)** 
**HO-03 — Recovery state classification (ladder states as evidence)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: The Oracle ladder (ARCHITECTURE_READY → ... → RUNTIME_PROVEN → RESTART_PROVEN → REPLAY_PROVEN → ...) requires actual evidence per rung. Current: RESTART_PROVEN never observed on Oracle (restarts=0); REPLAY_PROVEN partial (replay doesn't read the journal); BUSINESS_PATH_PROVEN is the AX trace, unbuilt. "Again" disk pressure (80% → 56% after reclamation) is the recurring operational theme.
- EVIDENCE: `oracle-migration/ORACLE-STATUS-2026-09-22.md`; WBD §O-0 ladder; memory/2026-09-21#L7 (source green ≠ build green ≠ runtime green ≠ restart green).
- DEPENDENCIES: MC-10. ACCEPTANCE: each claimed rung has a dated proof artifact; restart proof asserts event/mission counts unchanged. NEXT FALSIFICATION: a rung claimed without its proof artifact.

**HO-04 — Exact runtime/build provenance (deployments.log + digests)** 
**HO-04 — Exact runtime/build provenance (deployments.log + digests)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: Every running image must answer source SHA, tree hash, image digest, schema version, deployment time, target. Today: gateway digest unrecorded, `deployment_registry` 0 rows, live image ≠ accepted baseline (MC-10). Provenance manifest is mandatory per the WBD install gate.
- EVIDENCE: backlog P0 "Deployment provenance"; `oracle-migration/ORACLE-STATUS-2026-09-22.md`; `recon-2026-09-19/agent-g-storage-mc-oracle.md` §c (deployment SHA recording: "cheap, satisfies the evidence manifest at small scale").
- DEPENDENCIES: MC-10. ACCEPTANCE: append-only deployments.log (timestamp, git SHA, image digests, operator) populated for every deploy; deployment_registry or its successor non-empty. NEXT FALSIFICATION: a running container whose digest is not in the log.

**HO-05 — Qdrant truthfulness: projection event precedes the write; embeddings are pseudo-vectors** 
**HO-05 — Qdrant truthfulness: projection event precedes the write; embeddings are pseudo-vectors**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: ProjectionWorker emits PROJECTION_CREATED *before* the Qdrant write; failures are swallowed (console.error, returns ok). The event means "canonical projection object created," NOT "Qdrant materialized." Separately, with Ollama absent on Oracle, the 112 vectors are SHA-256-seeded pseudo-vectors tagged `embedding:'fallback'` - nearest-neighbor over hash-derived vectors is not semantic search.
- EVIDENCE: memory/2026-09-19#L988 (contradiction resolved: PROJECTION_CREATED → Qdrant TRUE, reverse FALSE; consequence: replays attest projections whose Qdrant write may have failed silently); `agent-g-storage-mc-oracle.md` §g contradiction 4.
- DEPENDENCIES: none. ACCEPTANCE: either the emit follows a confirmed write, or the event semantics are documented and the bridge attests accordingly; the knowledge surface is labeled honestly until real embeddings exist. NEXT FALSIFICATION: a PROJECTION_CREATED event with no corresponding Qdrant point and no documented gap.

**HO-06 — Redis truthfulness: built, never live, zero requirers** 
**HO-06 — Redis truthfulness: built, never live, zero requirers**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: `redis_adapter.js` is required by zero live files; Redis is BUILT_NOT_LIVE. Any health surface implying Redis as an operational dependency is fiction; the stage-1 topology is Postgres + gateway + Qdrant only.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §a census; `ping-architectural-recon-2026-09-19.md` §AR (Redis stays unwired until a proven need).
- DEPENDENCIES: none. ACCEPTANCE: adapter deleted/quarantined with a DO_NOT_USE marker, or a proven unique need documented. NEXT FALSIFICATION: a health check reporting Redis status as meaningful.

**HO-07 — Health ≠ durability (document the boundary)** 
**HO-07 — Health ≠ durability (document the boundary)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Healthy does not prove PostgreSQL is writable (proven separately via event write + readback); zero event counters after restart are runtime counters, not durability proof - durable history is in PostgreSQL, not the health payload. Callers must not treat health as durability evidence.
- EVIDENCE: `health-truth-audit-2026-09-20.md` Finding 3.
- DEPENDENCIES: none. ACCEPTANCE: documented law (HEALTH ≠ PROCESS EXISTS → HEALTH ≠ DURABILITY) referenced by every health consumer; writability proven by write+readback, not by /health. NEXT FALSIFICATION: an automation that treats a 200 /health as proof of a durable write.

**HO-08 — /system/state sees 0 events while /mc/* sees 26-45 (two backends, two truths)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: BLOCKED · PRIORITY: 1
- WHY: Lane-M's live probe: SystemAuthority's eventReadAuthority disagrees with the unifiedEventRuntime used by the /mc routes. The cockpit trusts the wrong one. Needs falsification of which event source each service is actually bound to in the deployed artifact (Lane P / W-0 territory).
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 (contradiction found) and §5 D22.
- DEPENDENCIES: deployed-artifact binding analysis. ACCEPTANCE: one documented binding per service; the wrong binding fixed or the discrepancy resolved in favor of the canonical source. NEXT FALSIFICATION: post-fix probe still showi

**HO-09 — Migration failure vs Postgres failure (distinct recovery states)** 
**HO-09 — Migration failure vs Postgres failure (distinct recovery states)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Recovery states must be classified: a failed migration is not a failed database. The Oracle deployment design calls for restart proofs asserting event/mission counts unchanged and a rehearsed restore (fresh VM → restore → schema self-heal → re-embed), not just a written procedure. Neither has been observed.
- EVIDENCE: `agent-g-storage-mc-oracle.md` §c (deployment design); `oracle-migration/ORACLE-STATUS-2026-09-22.md` (reclamation verified restarts=0, healthy - but no restart *test*).
- DEPENDENCIES: MC-10. ACCEPTANCE: controlled restart test with pre/post counts recorded; rehearsed restore, not just documented. NEXT FALSIFICATION: a restore procedure that has never been executed.

**HO-10 — Nothing watches the watcher; Pig/Oracle health divergence** 
**HO-10 — Nothing watches the watcher; Pig/Oracle health divergence**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 3
- WHY: Qdrant and Vault unhealthy on Pig while Oracle Qdrant healthy; no host-level watcher curls /health (nothing pages on failure). The Pig remains the automation/dev host with its own health story.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AI-22; `agent-g-storage-mc-oracle.md` §c (health checks section).
- DEPENDENCIES: none. ACCEPTANCE: host-level /health watcher with paging; Pig vs Oracle health divergence explained or resolved. NEXT FALSIFICATION: a gateway outage with no alert fired.

**HO-11 — Era markers: Era 12 vs Era 13 witness leaves; identity eras** 
**HO-11 — Era markers: Era 12 vs Era 13 witness leaves; identity eras**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Executed witness artifacts have 12 leaves; TS source computes 13; Era-12 roots must be preserved under explicit versioning (`witness.merkle.v1-12` vs `v2-13`) and never silently recomputed; identity rows need era-marking (Era H 64-hex, TenantOS UUIDv5) so old events replay under original rules. Five-year replayability = these bindings + preserved inputs + law manifest.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AI-03/04/05, §AW, §BD-03; WBD W-2.
- DEPENDENCIES: HO-04 (provenance). ACCEPTANCE: per-attestation binding of construction version, leaf count, engine/canonicalization/hash versions, law manifest; sanctioned pinned rebuild with golden vectors. NEXT FALSIFICATION: a rebuild that silently changes a historical root.

**HO-12 — Seed contamination: 8 fictional rows in canonical truth** 
**HO-12 — Seed contamination: 8 fictional rows in canonical truth**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: `_seedBusinessEvents` inserts fictional customers ("Sarah Chen", "Mike Rodriguez", "Emily Watson") into `ping_events` on first boot; 8 rows verified live on Oracle, indistinguishable from real business data. Any UI backed by ping_events inherits the fiction at the source.
- EVIDENCE: `agent-g-storage-mc-oracle.md` §b (demo-seed contamination, PROVEN_RUNTIME) and §g.6; `ping-architectural-recon-2026-09-19.md` §AI-14, §AX target (seeder default-off, clearly tagged).
- DEPENDENCIES: Nolan's explicit word (canonical data is not deleted on agent say-so). ACCEPTANCE: seeder env-gated (default off), seeded rows tagged/filterable, Oracle 8 rows purged or quarantined by operator decision. NEXT FALSIFICATION: a fresh boot seeding rows into a production database.

---

## AGENTS

**AG-01 — Capability-gated action: READ/REASON/PROPOSE/ACT only with capability** 
**AG-01 — Capability-gated action: READ/REASON/PROPOSE/ACT only with capability**
- DOMAIN: AGENTS · STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The ORCA loop's `authorizeWorkOrder` is the live, fail-closed gate: known LIVE profile, capability ∈ allowlist, namespace regex, constraints may only tighten, mandatory `no_canonical_events` + `no_mission_state_writes`. PENDING_AUTH families deny fail-closed; policy escalation blocks email.send/sms.send to human approval (exit 3). Proven in the witnessed A1-A5 runs.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §e and §f; `recon-2026-09-19/agent-f-temporal-orca-approval.md` §c (A1-A5 PROVEN_RUNTIME); `goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md` (live PG path, CLI proofs).
- DEPENDENCIES: AG-02 (kill the phantom twin claim). ACCEPTANCE: gate stays the single choke point; any new capability requires profile + validation harness update. NEXT FALSIFICATION: a dispatch that bypassed authorizeWorkOrder.

**AG-02 — Kill the phantom CapabilityAuthority claim** 
**AG-02 — Kill the phantom CapabilityAuthority claim**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: `capabilities/registry.yaml` declares CapabilityResolution → CapabilityAuthority as `missing_implementation`, while adapter comments cite it as live at `/app/gateway/capability_authority.js:230` - a file that exists in zero of five audited branches. Phantom authorities are where bypasses hide. The de facto authority is `ExternalAgentAdapter.authorizeWorkOrder`.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §b (phantom vocabulary #1) and C1; `ping-architectural-recon-2026-09-19.md` §AI-12.
- DEPENDENCIES: none. ACCEPTANCE: registry.yaml and comments say the true owner (or the real CapabilityAuthority is produced); no source claims a live file that does not exist. NEXT FALSIFICATION: grep finding a live-path reference to the phantom file.

**AG-03 — Agent output ≠ canonical truth (envelope validates, never verifies)** 
**AG-03 — Agent output ≠ canonical truth (envelope validates, never verifies)**
- DOMAIN: AGENTS · STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The ORCA adapter honestly bounds itself: `verifyResultEnvelope` checks field presence, binding equality, executor triple-match, status coherence, deadline; validation failure → `{valid:false, retryable:false}` so it never reaches canonical authority. `recordVerifiedResult` records the validated claim via the injected event runtime. Output content truth is explicitly outside the envelope's authority (MRE-10).
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e; orca-a5 verdict (A5 recovery semantics, honest failure reporting).
- DEPENDENCIES: MRE-10 (assertion suite to keep it verified). ACCEPTANCE: the envelope remains the single choke point with CI-pinned assertions; no path writes agent output to canonical stores except through it. NEXT FALSIFICATION: a canonical event whose payload came from an unverified envelope.

**AG-04 — Proposals bind the exact proposed transition digest; approval approves that exact digest** 
**AG-04 — Proposals bind the exact proposed transition digest; approval approves that exact digest**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 1
- WHY: The design exists twice, both unwired: (a) PING approval/effect state machine with `effect_id = sha256(approval_id)` and `action_id` including the payload hash (current formula omits mission/proposal/payload, so distinct emails to one customer collide); (b) the FYD owner patch loop: strong binding of tenant + actor + base digest + patch digest + approval + result digest, one-tap UI, stale base = STALE PROPOSAL. Human approval must approve *that exact transition*, not a description of it.
- EVIDENCE: `recon-2026-09-19/agent-f-temporal-orca-approval.md` §f (smallest durable machine; identity fix) and C8 (identity collision); MEMORY.md FYD owner gate (2026-09-22: strong binding, tenant+actor+base digest+patch digest+approval+result digest); backlog P0 "Approval/effect identity".
- DEPENDENCIES: AG-05. ACCEPTANCE: Postgres-wired state machine; retry re-checks `isEffectCompleted` before re-execution; a proposal whose bytes changed after approval is rejected as STALE. NEXT FALSIFICATION: an executed effect whose payload hash differs from the approved proposal's.

**AG-05 — One durable human approval gate (merge the two mechanisms)** 
**AG-05 — One durable human approval gate (merge the two mechanisms)**
- DOMAIN: AGENTS · STATUS: DECISION · PRIORITY: 1
- WHY: Two approval mechanisms compete and neither is durable: `BusinessActionAuthority` (in-memory, wired to nothing) and ORCA escalation files (block + exit 3, ORCA loop only); Temporal `approvalSignal` never runs. The target: one gate - `GET /approvals/pending` + `POST /approvals/:id/decision`, durable PROPOSED → APPROVED/REJECTED/EXPIRED/SUPERSEDED, webhook-resume (HumanLayer pattern: the response arrives as a resuming event, never hold a process open).
- EVIDENCE: `agent-f-temporal-orca-approval.md` §e (approval today = phantom/experimental) and M4 (merge, not both); memory/2026-09-20#L865 (recommendations have no approve/reject/act path); `ping-architectural-recon-2026-09-19.md` §AE (HumanLayer harvest).
- DEPENDENCIES: Nolan's decision on the merge. ACCEPTANCE: exactly one approval mechanism, durable in Postgres, with the escalation path as a special case of the gate (propose → PENDING_HUMAN → expire/escalate). NEXT FALSIFICATION: a human decision recorded only in a file or in memory.

**AG-06 — Capability vocabularies: do not promote to orchestration language yet** 
**AG-06 — Capability vocabularies: do not promote to orchestration language yet**
- DOMAIN: AGENTS · STATUS: HARVEST · PRIORITY: 3
- WHY: Three mutually unintelligible vocabularies (SaaS-connector operations, agent allowlist verbs, MCP matrix rows) share no schema and no enforcing registry; the registry.yaml that should unify them self-declares its authority missing. Keep capability inside the WorkOrder authorization gate where it is enforced. Harvest the A2A Agent Card / AgentSkill discovery contract shape for later.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §d (orchestration-language verdict: NO); `ping-architectural-recon-2026-09-19.md` §O and §AE (A2A row).
- DEPENDENCIES: AG-02. ACCEPTANCE: one registry owns the vocabulary before any orchestration-language claim; until then, enforced-at-the-gate only. NEXT FALSIFICATION: a capability string used in two vocabularies with different meanings.

**AG-07 — MISSION/CAPABILITY/EXECUTOR are collapsed in the WorkOrder (name it or separate it)** 
**AG-07 — MISSION/CAPABILITY/EXECUTOR are collapsed in the WorkOrder (name it or separate it)**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: The WorkOrder binds capability + executor together; the executor's profile allowlist *is* the capability check; there is no independent capability-resolution step. This is honest today but must be an explicit architectural position, not an accident - otherwise a future "capability service" becomes a second authority.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §O (collapse verdict); `agent-d-lineage-mission-workorder.md` §d.
- DEPENDENCIES: AG-06. ACCEPTANCE: documented position: capability resolution lives in the authorization gate (or a real independent step is built with one owner). NEXT FALSIFICATION: a new capability check that bypasses authorizeWorkOrder.

**AG-08 — Context-pack binding: equality is not provenance** 
**AG-08 — Context-pack binding: equality is not provenance**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: The WorkOrder envelope requires `contextPackId` and the result must echo it exactly - but the binding check verifies *equality*, not *provenance*. The codex branch compiles real packs (canonicalize, dedupe, conflict-throw, tenant filter); the ORCA loop passes synthetic `orca-context-<id>` with no compilation. The check passes either way. The direct Qdrant→Ollama RAG bypass (wired in the live gateway bootstrap) routes around the pack entirely.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` C4; `ping-architectural-recon-2026-09-19.md` §Q (boundary hypothesis FALSIFIED, 5 points) and §AI-09.
- DEPENDENCIES: none. ACCEPTANCE: codex-branch context work landed (canonicalization, conflict-throw, tenant filter, contextPackId binding, self-describing packs); bypass removed or governed. NEXT FALSIFICATION: a production answer synthesized without a compiled pack while the pack contract claims universality.

**AG-09 — Lineage DAG legality: no cycle detection anywhere** 
**AG-09 — Lineage DAG legality: no cycle detection anywhere**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: Neither the dead `LineageAuthority` nor the live `LineageWorker` validates causation chains; a cyclic causation graph is accepted silently. The live worker records only the immediate parent. Cheap, reversible fix: a causation_id validator (reject self-parent, bounded chain-walk cycle detection in ping_events).
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §a (DAG legality: NONE, anywhere) and top-5 #1; `ping-architectural-recon-2026-09-19.md` §AI-17.
- DEPENDENCIES: none. ACCEPTANCE: cycle/topology validation in the worker path with tests. NEXT FALSIFICATION: a cyclic causation chain persisted without rejection.

---

## SOURCES REVIEWED

1. `~/workspace/goals/ping-agent-execution-stack/GOAL.md` + `files/` (OPERATING_SPEC.md authority records; PING-RUNTIME-DISTRIBUTION-V1-MILESTONE.md; RUNTIME-DISTRIBUTION-V1-EXCLUSION.md; PING_PIG_DISK_WSL_INCIDENT_RCA.md; runtime-manifest.json) + `hidden_files/` (orca-a5-audit-verdict-2026-09-18.md; convergence-forensics runtime-manifest-v1.working.md)
2. `~/workspace/goals/fyd-social-product-build/GOAL.md` (briefs/agent_notes/hidden_files/files all empty - noted)
3. `~/workspace/health-truth-audit-2026-09-20.md` (full)
4. `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` + evidence dir listing
5. `~/workspace/forensics/`: convergence-backlog-2026-09-19.md; execution-wbd-2026-09-19.md (full); phase0-scope-pin; pha

1. **Identity certification scope** 
1. **Identity certification scope**: worktree certifies `event_<16hex>` RFC-8785 IDs (phase1, SOURCE_VERIFIED) vs live container mints 64-hex `JSON.stringify` IDs (phase1 §§211-243, LIVE_VERIFIED). Same logical event, different IDs; certification does not describe live rows.

2. **"Exactly one effective Event Authority"** 
2. **"Exactly one effective Event Authority"**: FALSIFIED by Lane F2 (CanonicalEventEnvelope is a second effective authority: own IDs, sequence, table, bypasses governance) vs OPERATING_SPEC "RESOLVED" verdict which holds only narrowed to "ping_events has exactly one writer." Operator question 10 (which authority owns emission/identity going forward) is still open - WBD unanswered-question queue #10.

3. **Replay honesty** 
3. **Replay honesty**: `/mc/replay/stats` shows 26 verified replays live (lane-m probe) vs OPERATING_SPEC REPLAY PARTIAL: live replay never reads the canonical journal and re-mints identities (`evt-ping-<i>-<hash>`); PROJECTION_CREATED→REPLAY_VERIFY attests projections whose Qdrant write may have failed silently (memory 09-19#L988).

4. **ORCA certification scope** 
4. **ORCA certification scope**: ORCA-ROLE.md certifies "A0 (facade)" overall vs A5-CERTIFICATION-RECORD.md closing "A5 PROVEN" - different implementations (old engine vs new control loop), role doc never scopes the claim (agent-f C1).

5. **KnowledgePromoter ADD-only** 
5. **KnowledgePromoter ADD-only** (code header) vs `ON CONFLICT (node_id) DO UPDATE SET data=...` in knowledge_graph.js (recon AI-15) - policy and code disagree.

6. **EffectAuthority "Restart = same effect_id"** 
6. **EffectAuthority "Restart = same effect_id"** (commit f250c19ca message) vs restart test proving in-memory state is lost on restart (agent-f C3) - the idempotency promise is void without durable storage.

7. **Mission completion counts across reports** 
7. **Mission completion counts across reports**: 191 completed (memory 09-16 live PG read; phase24's /mc/dashboard snapshot) vs 417 completed / 2 failed matching 419 ping_missions rows (agent-g 09-18/19) - different epochs/scopes, not the same claim; any cross-report comparison must name its scope (MC-03's general problem).

8. **Mission Control "fixed"** 
8. **Mission Control "fixed"**: Phase 24 fixed the worktree UI (09-19) vs the deploy branch carrying byte-identical phantoms plus a divergent superset (lane-m §4) - "Mission Control is truthful" is true of a branch, not of what would deploy.

9. **Health vs reality** 
9. **Health vs reality**: /health healthy on both Oracle gateways (09-22) vs latent dual-writer (two containers, one DB) and an undocumented live image - "healthy" hides both.

10. **ContextPack as model boundary** 
10. **ContextPack as model boundary** (claimed) vs direct Qdrant→Ollama RAG path wired in the live gateway bootstrap (recon §Q, 5 falsification points) - the boundary is wired around, live.

## Notes for the parent

- Item statuses use the requested enum; priorities follow the 1/2/3 core-loop rubric. REJECTED/SUPERSEDED/DEFERRED were not assigned to extracted items because the sources already record those decisions in the AF rejection matrix, AH deletion matrix, and falsified-premises sections (AcquisitionManager, ConstitutionalEventStore PHANTOM/FALSIFIED; IEventAuthority DORMANT; EventRepository LEGACY_UNREACHABLE; ConstitutionalEventSourcing dead switch; Temporal-as-cluster, NATS/Kafka backbone, Neo4j-primary, second witness authority all REJECTED) - re-extracting them as items would duplicate closed decisions.
- The single most decision-blocked cluster: MC-10 (accept 3c5d280dd? stop :8081?), WBD question 10 (which event authority owns emission/identity), LL-12/LL-05 (build the verification seam?), HO-12 (purge seed rows?) - all four need Nolan's explicit word; agents must not resolve them unilaterally.
- No files were created, edited, or deleted; no git commands run; no live systems touched.


======================================================================
ping-authority-identity-replay-era.md

ITEMS FOUND: 47

1. **The audit's four Grill candidates (G1–G4) were never transferred to the Grill, and never recorded as deci 
1. **The audit's four Grill candidates (G1–G4) were never transferred to the Grill, and never recorded as decisions.** They appear only in the audit file. G1 (append-only policy owner) was operationally resolved by the lane ("Trigger preserved per Nolan's law," design B); G3 (replay "verified" vocabulary) was operationally resolved by replay convergence (honest verdicts). But neither appears in GRILLING-BRIEF.md under ACTIVE or DECISIONS WORTH RE-GRILLING. Operational resolution is not the same as a recorded operator decision; a future auditor reading only the Grill will think these were never decided.

2. **"STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" — the permanent rule the audit demanded — appears in none o 
2. **"STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" — the permanent rule the audit demanded — appears in none of the standing files.** Grep of AGENTS.md, MEMORY.md, GRILLING-BRIEF.md: zero hits. Its substance was partially enacted (Lane N MC-truth audit, UI truth fix, honest-health checks), but the rule itself was never installed as a standing law.

3. **The tenant registries disagree by design, not by accident (TEN-002), and the audit's TEN-001 verdict ("la 
3. **The tenant registries disagree by design, not by accident (TEN-002), and the audit's TEN-001 verdict ("latent, one tenant") conflicts with Lane B's live-plane reality:** `/mc` and `/tenants` were publicly readable business-intelligence surfaces (SEC-001/002, runtime-proven 200 unauthenticated) until the sprint mounted exterior auth. The "one tenant, latent" framing understates that the single tenant's data was publicly exposed.

4. **Lane N's ledger double-booked FL-20260919-009** 
4. **Lane N's ledger double-booked FL-20260919-009** (Math.random() suspected false-green vs. ping-agent-ops GitHub auth blocker); disambiguated in the ledger as 009-UI. Related: the lane's `/tmp`-wipe entry duplicated FL-20260919-014 (collision lane's T1 migration failure); renumbered 017. Append-only numbering collisions are a standing hazard.

5. **Lane 2 vs. Lane 3 on artifact drift:** 
5. **Lane 2 vs. Lane 3 on artifact drift:** Lane 2's GENERATOR_CWD_PROOF.md recorded 3 artifacts (uuid_registry, law_router, execution_router) as DRIFT vs. tracked, but Lane 3's independent fresh-sandbox runs at current HEAD produce SHAs byte-identical to tracked. Queued as proof-hygiene; the untracking verdicts rest on the independent proofs.

6. **Capability vocabulary audit (2026-09-13):** 
6. **Capability vocabulary audit (2026-09-13):** the profiles in the dead `capability_authority.js` deny `secrets/*`, `credentials/*`, `.env`, `*.pem`, `*.key` — but that model was committed, never wired, and the live exterior contract was just POST /events. The "protection" existed only in the unwired model.

7. **C-R3 ("zero UPDATEs repo-wide") vs. the certified artifact:** 
7. **C-R3 ("zero UPDATEs repo-wide") vs. the certified artifact:** the convergence lane's own certified migration ran `UPDATE ping_events`, and its backfill used the exact MAX(sequence)+1 pattern the ce3f8687c contract forbade (AUTH-008/009/010). The ledger's premises were falsified by its own code; the documentary amendments were explicitly deferred ("documentary amendment; no operator judgment needed") but their landed status is unclear from these sources.

---

## ITEM CATALOG

### DOMAIN: 
### DOMAIN: AUTHORITY CONVERGENCE

**AUTH-CONV-01 — Event Authority forensic pattern continuing into Witness/Mission/Context/Claim authorities**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The standing plan resolves Event Authority first, then applies the same forensic pattern (SEMANTICS RULED → PATCHED → TESTED → WIRED → DURABLE → REPLAYABLE → CERTIFIED) to Witness, Mission, Context, and Claim/Presentation authorities; total-system convergence must not be declared on Event Authority alone.
- EVIDENCE: memory 2026-09-18: "After Event Authority reaches SEMANTICS RULED, PATCHED, TESTED, WIRED, DURABLE, REPLAYABLE, CERTIFIED, the forensic pattern continues into Witness Authority, Mission Authority, Context Authority, and Claim/Presentation Authority. Total-system convergence must not be declared on Event Authority alone." Sprint: WITNESS_PROVEN claimed [PROVEN_SOURCE] for derived-attestation only; replay fidelity landed.
- DEPENDENCIES: EVENT-SPINE-01, REPLAY-01
- ACCEPTANCE: each subsequent authority reaches the 7-stage pattern with test evidence; a one-line status registry shows which authorities are at which stage.
- NEXT FALSIFICATION: attempt to write a claim citing Witness Authority semantics beyond derived attestation; the gap between claimed and proven witness semantics falsifies or confirms completion.

**AUTH-CONV-02 — Dormant-sovereignty inventory: EventWriteAuthority and the dead policy classifiers**
- STATUS: OPEN · PRIORITY: 2
- WHY: `EventWriteAuthority` declares e

### DOMAIN: 
### DOMAIN: PING EVENT SPINE

**EVENT-SPINE-01 — Migration-vs-trigger pre-promotion gate (permanent)**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The Oracle outage was constitutionally caused: the certified migration's UPDATE collided with an out-of-band append-only trigger no gate could see (smoke never touches Postgres; CERTIFIED checked module membership only). The lane built the fixture gate (50/50 PASS, fail-before on the old migration); LANE-A-20260920-05 specified the `--with-db` smoke mode but it was "specified, not implemented — estimated >30min."
- EVIDENCE: audit OBS-005/OBS-006, REC-001/003; sprint Lane A (migration-certification 50/50 [PROVEN_TEST]); Lane A discovery item 05 ("the gate's name overstates its coverage"); backlog CERT-HARD-001 (arm64 gate had the same shape of hole).
- DEPENDENCIES: none
- ACCEPTANCE: every release-certify run executes a real migration against a trigger-enforcing scratch fixture (or records why not); the certification artifact records which smoke mode ran; a deliberately trigger-incompatible migration FAILS the gate.
- NEXT FALSIFICATION: run the current smoke with bogus POSTGRES_PASSWORD → if SMOKE PASS, the hole persists (the lane's own falsification).

**EVENT-SPINE-02 — CanonicalEventEnvelope silent-drop-on-collision (AUTH-013)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: `getNextSequence`'s non-atomic MAX+1 plus `ON CONFLICT (tenant_id, sequence) DO NOTHING` with an unconditional success return meant accepted business events

### DOMAIN: 
### DOMAIN: IDENTITY AUTHORITY

**IDENTITY-01 — Identity-era cutover: re-mints every event ID; cross-era dedup plan required (G2)** 
**IDENTITY-01 — Identity-era cutover: re-mints every event ID; cross-era dedup plan required (G2)**
- STATUS: DECISION · PRIORITY: 1
- WHY: Live mints naked 64-hex `SHA-256(JSON.stringify({eventType, source, ...}))` (camelCase, insertion-order); certified mints `event_<16hex>` via IdentityAuthority + RFC-8785 canonicalization with `core::system` namespace default. Same logical event gets different IDs across cutover; `ON CONFLICT (event_id)` cannot match; lineage links keyed by event_id break; witness roots incomparable; Qdrant projections double-land. The audit framed it as an identity-era migration, not a path swap.
- EVIDENCE: audit AUTH-011 ("no cross-era dedup plan exists"; "GRILL CANDIDATE (era marker? dual-read dedup? or accept double-landing?)"); era census: 739 Era-H rows, 0 V1 rows.
- DEPENDENCIES: DECISION (G2: accept double-landing with era marker / define cross-era dedup key / defer cutover); ERA-02 (era census) as input
- ACCEPTANCE: Nolan's G2 decision recorded in the Grill; the chosen option implemented (era marker column, or a cross-era dedup key over logical identity material) with a scratch-DB proof that re-emitted pre-cutover events do not corrupt lineage.
- NEXT FALSIFICATION: none empirical — this is a genuine operator judgment; the falsifiable input is the era census (SELECT-only count of 64-hex vs `event_` IDs).

**IDENTITY-02 — V2 identity boundary: legacy frozen, new events on IdentityAuthority (F7)** 
**IDENTITY-02 — V2 identity boundary: legacy frozen, new events on IdentityAuthority (F7)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Nolan's F7 requirements: preserve the old identity era, introduce a versioned identity domain, prove the new encoding injective over the admitted value domain, keep old events replayable under original rules; never patch the serializer blindly. Evidence picked IdentityAuthority.generateId → CanonicalBytes.serialize → CanonicalAuthority.hashBytes for new UER emits; old rows frozen with era marking.
- EVIDENCE: memory 2026-09-18/19 (F7 resolution); backlog O1 CERTIFIED (F7-B 48/48, MC-1 85/85); era census (739 distinct Era-H IDs).
- DEPENDENCIES: none
- ACCEPTANCE: 739 Era-H rows byte-identical through migration (Lane A cert: history hashes unchanged); new emits mint `event_<16hex>`.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-03 — Never casually change ID format / no historical reminting (standing law)** 
**IDENTITY-03 — Never casually change ID format / no historical reminting (standing law)**
- STATUS: HARVEST · PRIORITY: 2
- WHY: The CE-001 lane's constraints ("no historical reminting," "IdentityAuthority stays sole minter," "no new lifecycle states") and the 25-phase plan (Phase 6 historical data law, Phase 10 "remove reminting without removing bridges") are stated per-lane, not as a standing law. The identity-era cutover makes this load-bearing.
- EVIDENCE: sprint CE-001 forensics ("Must not change: IdentityAuthority as sole minter, no historical reminting"); memory 2026-09-19 (V2 boundary requirements).
- DEPENDENCIES: none
- ACCEPTANCE: the law is recorded in the standing rules (AGENTS.md or equivalent): ID formats change only via a versioned identity domain with a migration plan; historical rows are never reminted.
- NEXT FALSIFICATION: n/a — documentary; the test is whether the next identity change cites it.

**IDENTITY-04 — Canonical event-identity bytes, cross-runtime (RTC-001)** 
**IDENTITY-04 — Canonical event-identity bytes, cross-runtime (RTC-001)**
- STATUS: OPEN · PRIORITY: 1
- WHY: Event identity is Node-`JSON.stringify`-bound (insertion-order, no whitespace, `1.0`→`"1"`); no non-Node producer can reproduce it byte-for-byte. Python uses a different identity domain (`observation_sha256` over raw UTF-8, linked only via sidecars). The HTTP ingestion path never accepts `logical_id`, so every Python-emitted event is hashed over the full payload including the Python-generated timestamp — two byte-identical logical observations emitted at different times hash differently at the gateway layer (masked today only by the Python sidecar guard).
- EVIDENCE: audit RTC-001 ("Define canonical event-identity bytes once (sorted-keys JSON, explicit float/Unicode rules), implement in JS, add a Python reference implementation, prove sha256 equality on a fixture corpus. Do not change the live hash until proven.").
- DEPENDENCIES: AUTH-CONV-03 (UER serializer bypass)
- ACCEPTANCE: a canonical-bytes spec exists; JS + Python reference implementations produce identical sha256 on a fixture corpus; live hash unchanged until proven.
- NEXT FALSIFICATION: emit the same logical observation from Python and JS at different timestamps; different event_ids confirm the defect persists.

**IDENTITY-05 — CE-001: deterministic MISSION_COMPLETED identity** 
**IDENTITY-05 — CE-001: deterministic MISSION_COMPLETED identity**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Completion identity was wall-clock-derived (duration_ms, completed_at in the preimage), so every re-completion minted a new event_id; a crash between DB UPDATE and emit lost the completion permanently (row completed, no event, no reconciler). Fix: `logical_id {kind:'mission-completion', mission_id}` on the emit; clocks stay as payload metadata; `reconcileLostCompletions()` re-emits idempotently on scheduler start.
- EVIDENCE: sprint CE-001 (fail-before 2 cases; post-fix 45/45 over 7 cases: clock-independence, retry, lease-expiry, restart, crash-after-accept a/b, reconciliation idempotency, no-over-collapsing).
- DEPENDENCIES: none
- ACCEPTANCE: the 45/45 suite green; coordinator ruling recorded (reconciler's read-path `generateId` use is legitimate, not a bypass).
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-06 — CE-002: attempt/lease fencing for mission completion** 
**IDENTITY-06 — CE-002: attempt/lease fencing for mission completion**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: A stale worker could complete after lease reassignment (fail-before: wrong result won the row and the journal, indistinguishable from legitimate). Fix: additive `attempts` column; `assign()` bumps the token; `complete()` requires token match, else typed STALE_ATTEMPT before any write. The reconciler is the privileged recovery path (presents no token, transitions no state).
- EVIDENCE: sprint CE-002 (fail-before 18/27 fail; post-fix 46/46; CE-001 45/45 preserved).
- DEPENDENCIES: IDENTITY-05
- ACCEPTANCE: 46/46 CE-002 suite; adjacent evals 8/9 (EVAL-006 harness issue ledgered separately as FL-20260920-003, healed).
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-07 — Signature verification on the governed ingest path (INVALID_SIGNATURE)** 
**IDENTITY-07 — Signature verification on the governed ingest path (INVALID_SIGNATURE)**
- STATUS: PROVE · PRIORITY: 2
- WHY: The 8081 P1 battery proved: valid signed event → 200, invalid signature → 400 INVALID_SIGNATURE (GRILLING-BRIEF GATEWAY-001). That proof is on the side-port candidate, not the live 8080 plane (which still ran pre-adapter source 84486f056 at brief time; GATEWAY-001 swap decided 2026-09-21 GO). Signature verification is the identity authority's enforcement edge; its live-plane status needs confirmation.
- EVIDENCE: GRILLING-BRIEF GATEWAY-001 ("valid signed event 200, invalid signature 400 INVALID_SIGNATURE"; swap DECIDED 2026-09-21).
- ACCEPTANCE: the same signed/unsigned probe pair run against the live 8080 plane post-swap: 200 / 400 INVALID_SIGNATURE.
- NEXT FALSIFICATION: an invalid-signature event accepted (2xx) on the live plane falsifies enforcement.

**IDENTITY-08 — Cross-era dedup key definition (post-G2)** 
**IDENTITY-08 — Cross-era dedup key definition (post-G2)**
- STATUS: DEFERRED · PRIORITY: 2
- WHY: If G2 chooses the dedup-key option, the key must be defined over logical identity material that is stable across both identity eras (preimage fields present in Era-H 64-hex rows and V2 `event_` rows), then proven on a scratch DB.
- EVIDENCE: audit AUTH-011 NEXT ("define the cross-era dedup key").
- DEPENDENCIES: IDENTITY-01 (G2 decision)
- ACCEPTANCE: a documented cross-era dedup key; scratch-DB proof that a re-emitted pre-cutover event dedups instead of double-landing.
- NEXT FALSIFICATION: n/a until G2 is decided.

### DOMAIN: 
### DOMAIN: REPLAY

**REPLAY-01 — Persisted-journal replay convergence (canonical bytes in, verdict out)** 
**REPLAY-01 — Persisted-journal replay convergence (canonical bytes in, verdict out)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Replay synthesized its input: `_buildReplayEvents` carried the Postgres query only as a comment and repackaged the in-flight trigger event; the kernel reminted every event_id (`evt-ping-<i>-<sha12>`), remapped types, stamped silent current-era defaults, silently truncated at maxEvents — while `REPLAY_COMPLETED` rows carried `verified:true` + `witness_root` that WitnessWorker attested. Fix (1d18f9c95): correlation-group load from ping_events as the input (fail closed on load failure); canonical `event_` IDs survive the kernel; era with provenance; INCOMPLETE on truncation/skip; honest sha256 `canonical_input_hash`; engine/algorithm/completeness persisted on the verdict.
- EVIDENCE: audit F4; sprint replay/witness forensics + replay convergence (fail-before 8/8; post-fix 8/8; e2e 9/9 with legacy NULL-sequence rows in Lane A order; 12-leaf invariant undisturbed).
- DEPENDENCIES: EVENT-SPINE-01 (Lane A ordering contract)
- ACCEPTANCE: REPLAY_FIDELITY_PROVEN [PROVEN_TEST]; persisted 4-event correlation group replays with every event_id preserved, verdict hash matching independent computation, determinism across runs.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**REPLAY-02 — 'Unknown'-era rows replay with explicit labeling, not fail-closed** 
**REPLAY-02 — 'Unknown'-era rows replay with explicit labeling, not fail-closed**
- STATUS: DONE_VERIFIED · PRIORITY: 2
- WHY: Design caveat from the replay lane: rows with absent schema_version (predating era stamping) replay with the era explicitly labeled rather than failing closed; only declared-but-unsupported eras fail closed. This keeps the entire pre-existing journal replayable — a deliberate tradeoff between strictness and history preservation.
- EVIDENCE: sprint replay convergence ("Design caveat... Keeps the entire pre-existing journal replayable").
- DEPENDENCIES: none
- ACCEPTANCE: a test pins the behavior: unknown-era row → verdict with era labeled, not INCOMPLETE; declared-unsupported era → fail closed.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED); re-open only if era discipline requires strictness later.

**REPLAY-03 — What "replay verified" may claim (G3 vocabulary rule)** 
**REPLAY-03 — What "replay verified" may claim (G3 vocabulary rule)**
- STATUS: DECISION · PRIORITY: 2
- WHY: The audit's G3 asked what `verified:true` may claim while replay executed synthetic envelopes. The replay lane answered operationally (`verified` now requires provider-ok + zero violations + COMPLETE; `payload.replay_events` is an explicitly labeled test-mode seam), but G3 was never recorded as a decision in the Grill — same gap as contradiction 1. Certification-language integrity is Nolan's lane by precedent.
- EVIDENCE: audit F4 + G3; sprint replay convergence (verdict semantics); contradiction 1 (G3 absent from GRILLING-BRIEF.md).
- DEPENDENCIES: REPLAY-01
- ACCEPTANCE: a recorded decision (Grill or standing rule) stating the exact conditions under which a REPLAY_COMPLETED row may carry `verified:true`.
- NEXT FALSIFICATION: none empirical — judgment call; the falsifiable check is whether new `verified:true` rows satisfy the stated conditions.

**REPLAY-04 — Witness as derived replay attestation (W-1A live; W-2 harvested)** 
**REPLAY-04 — Witness as derived replay attestation (W-1A live; W-2 harvested)**
- STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: WitnessWorker is faithful on the live path: authenticates the trigger against the canonical REPLAY_COMPLETED row, distrusts envelope claims, never re-runs the kernel, attests only on verified===true with non-empty witness_root, derives identity from logical_id (clock excluded). W-2 (engine/algorithm version binding, explicit INCOMPLETE) lived on another branch; the replay lane harvested its version-binding/INCOMPLETE mechanisms. Dormant `witness_worker.py` (uuid4 IDs, own table, non-UER emission) has zero live references: do not wire, do not execute, do not delete (adversarial-audit material).
- EVIDENCE: sprint replay/witness forensics ("W-1A (98ef51c9c) is an ancestor of HEAD"; "the witness stage is faithful; the thing it attests to is not canonical replay"); replay convergence (W-2 harvest).
- DEPENDENCIES: REPLAY-01
- ACCEPTANCE: WITNESS_PROVEN for the full derived-attestation property incl. version binding; a re-run forensics confirms no independent mutable witness authority on any live path.
- NEXT FALSIFICATION: any live emission path that writes witness material without a backing REPLAY_COMPLETED row falsifies the derived-attestation property.

**REPLAY-05 — Sequence_replay T1 failure (FL-20260919-014, OPEN)** 
**REPLAY-05 — Sequence_replay T1 failure (FL-20260919-014, OPEN)**
- STATUS: OPEN · PRIORITY: 3
- WHY: The sequence_replay certification runs 64 pass / 6 fail / 1 blocked with an identical baseline on pristine code; the T1 legacy-migration-backfill failure is pre-existing and unrelated to the collision lane, ledgered OPEN and out of every lane's scope.
- EVIDENCE: sprint collision lane ("recorded as FL-20260919-014 (OPEN, not this lane's scope)"); Lane F re-cert ("replay 64/6fail (T1-only known class FL-20260919-014)").
- DEPENDENCIES: none
- ACCEPTANCE: T1 passes or is reclassified with a documented reason; the 6-fail class is eliminated or explicitly accepted.
- NEXT FALSIFICATION: re-run sequence_replay_cert on the current SHA; any change in the fail set re-opens the classification.

**REPLAY-06 — Projection digest determinism across governed rebuilds** 
**REPLAY-06 — Projection digest determinism across governed rebuilds**
- STATUS: PROVE · PRIORITY: 3
- WHY: The 8081 P1 battery proved "projection digest deterministic across two governed rebuilds" — but on the side port, not the live plane. Deterministic projection rebuild is the replay-adjacent property the FYD product's evidence graph will depend on.
- EVIDENCE: GRILLING-BRIEF GATEWAY-001 evidence block.
- ACCEPTANCE: two governed projection rebuilds on the live plane produce byte-identical digests.
- NEXT FALSIFICATION: rebuild twice on live; digest mismatch falsifies determinism.

### DOMAIN: 
### DOMAIN: ERA CONVERGENCE

**ERA-01 — Runtime tree vs. certified tree vs. deployed tree discipline** 
**ERA-01 — Runtime tree vs. certified tree vs. deployed tree discipline**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The sprint certified a9cad2663, deployed rc-4d522a6b (source 4d522a6bd) to Oracle, then the branch moved past the deployed SHA — per the release doctrine "a release is a certified closure of a specific revision," which is correct but requires the next release cycle to certify a newer SHA. Separately, GATEWAY-001 authorized a swap to candidate-3c5d280dd on 2026-09-21 (source 3c5d280dd, constitutional-dist compile fix), a third revision. Era discipline means every operational claim names its tree and revision.
- EVIDENCE: sprint (branch-moved-past-deployed note; "The next release cycle certifies a newer SHA later"); GRILLING-BRIEF GATEWAY-001 (decided GO 2026-09-21); memory: "Until cutover completes, every recovery and replay claim must be era-qualified."
- DEPENDENCIES: EVENT-SPINE-01 (certification ladder)
- ACCEPTANCE: a one-page tree/revision registry (runtime SHA, certified SHA, deployed SHA, rollback SHA) current within one deploy cycle; every status claim cites its revision.
- NEXT FALSIFICATION: find a status claim in any doc that is true of one tree and false of another without era qualification.

**ERA-02 — Pre-cutover era census on the canonical DB** 
**ERA-02 — Pre-cutover era census on the canonical DB**
- STATUS: OPEN · PRIORITY: 1
- WHY: The G2 decision needs the era boundary sized: SELECT-only count of 64-hex vs `event_`-prefixed IDs on the canonical DB. The 09-18 freeze counted 739 Era-H rows on the worktree plane; Oracle had 2510 rows (41 sequenced / 2469 legacy NULL) post-deploy.
- EVIDENCE: audit AUTH-011 NEXT ("SELECT-only era census on the canonical DB (count 64-hex vs event_ IDs) before cutover"); audit top experiment 3.
- DEPENDENCIES: none (SELECT-only, read-only)
- ACCEPTANCE: the census numbers recorded with date; they become the double-landing risk sizing for G2.
- NEXT FALSIFICATION: n/a — measurement; the risk is acting on stale counts.

**ERA-03 — Cutover plan (identity-era migration, not a path swap)** 
**ERA-03 — Cutover plan (identity-era migration, not a path swap)**
- STATUS: BLOCKED · PRIORITY: 1
- WHY: The cutover is an identity-era migration: ID format change, cross-era lineage breakage, Qdrant double-landing, witness-root incomparability. The 25-phase plan sequences it (identity convergence → cross-references → historical data law → migrate producers not data → no naive dual write). Blocked on the G2 decision.
- EVIDENCE: audit AUTH-011 ("the cutover is an identity-era migration, not a path swap"); memory 2026-09-19 (25-phase plan phases 4–10).
- DEPENDENCIES: IDENTITY-01 (G2)
- ACCEPTANCE: a written cutover plan with era markers, dual-read or dedup-key semantics, rollback criteria, and a rehearsal on scratch PG.
- NEXT FALSIFICATION: n/a until unblocked.

**ERA-04 — Era-qualify the standing laws** 
**ERA-04 — Era-qualify the standing laws**
- STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: Cross-domain pattern P4: "Two eras described by one law." "PostgreSQL sequence = authoritative ordering" is true of the certified worktree, false of the running system. "Zero UPDATEs repo-wide" is contradicted by the certified migration. "UnifiedEventRuntime = sole authority" needed the legacy-boundary qualification. Every operational claim must be era-qualified until cutover completes.
- EVIDENCE: audit P4; AUTH-014 (documentary fix scoped to certified artifact); AUTH-008 (C-R3 amendment deferred).
- DEPENDENCIES: EVENT-SPINE-09, EVENT-SPINE-11
- ACCEPTANCE: the three standing laws carry explicit era scoping in their canonical documents; a lint or review checklist requires era qualification on new operational claims.
- NEXT FALSIFICATION: pick any recovery/replay/ordering claim in current docs; if it is not era-qualified and differs by era, the item stays open.

**ERA-05 — Legacy NULL-ordering semantics (design B)** 
**ERA-05 — Legacy NULL-ordering semantics (design B)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The Oracle schema carried the failed deploy's partial migration (sequence BIGINT NULLABLE, nextval default, no unique index; 41 sequenced / 2469 legacy NULL). Design B ratified: sequence for new events only; legacy rows keep NULL with explicit unknown-ordering semantics; backfill UPDATE removed; conditional SET NOT NULL; NULL-count invariant; replay delivers legacy rows first as an explicit LEGACY segment.
- EVIDENCE: sprint Lane A (design decision; migration-certification 50/50: trigger-intact, history hashes unchanged, legacy NULL, new emits strictly increasing, replay contract, idempotent re-run); Oracle deploy Phase 2 (2510 rows, exactly matching pre-deploy).
- DEPENDENCIES: none
- ACCEPTANCE: 50/50 cert; Oracle post-deploy row counts match pre-deploy; zero STARTUP_BLOCKED.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**ERA-06 — Cutover hazard list (redelivery flip, bridge remint, timestamp precedence)** 
**ERA-06 — Cutover hazard list (redelivery flip, bridge remint, timestamp precedence)**
- STATUS: OPEN · PRIORITY: 2
- WHY: The audit explicitly assigned the redelivery flip (AUTH-012) to "the cutover hazard list in cert docs." The hazard list should also carry the bridge's namespace-stripping remint (AUTH-003) and the timestamp-authority ambiguity (RTC-002) as era-transition risks.
- EVIDENCE: audit AUTH-012 NEXT ("add the redelivery semantic to the cutover hazard list in cert docs; no grill needed").
- DEPENDENCIES: EVENT-SPINE-07
- ACCEPTANCE: the cert docs carry a cutover hazard list with at least these three entries and their mitigations.
- NEXT FALSIFICATION: n/a — documentary; open until the list exists.

### DOMAIN: 
### DOMAIN: PRIVATE CONTEXT

**PRIV-01 — Agent↔tenant authority model (G4): namespace is a comment, not a boundary** 
**PRIV-01 — Agent↔tenant authority model (G4): namespace is a comment, not a boundary**
- STATUS: DECISION · PRIORITY: 1
- WHY: No agent↔tenant binding exists anywhere; tenant is caller-asserted at every layer (`authorizeNamespace` = regex validation only); `GET /events` without a namespace returns all namespaces; Qdrant uses one shared `knowledge` collection with namespace as a payload field; namespace threads through mission→worker with nothing constraining a worker to it. The audit's G4 is the genuine constitutional/security decision (credential-scoped tenants, registry-owned principals, or explicit single-tenant-until-redesign). EXP-006 (tenant-scoped technician SOP knowledge) is blocked on it: with the boundary unenforced, a second tenant's SOPs would be readable/writable by any credentialed agent on day one.
- EVIDENCE: audit TEN-001 ("SEVERITY HIGH (latent; one tenant today)"; runtime state 177 `tenant::hpp` / 1018 `core::system` / 10 `core::owner`) + G4; sprint B2 ("TEN-001 genuinely BLOCKED pending Nolan's decision... AUTHENTICATED-only (401) shipped; AUTHORIZED/NAMESPACE_SCOPED deliberately not introduced").
- DEPENDENCIES: DECISION (G4)
- ACCEPTANCE: Nolan's G4 decision recorded in the Grill; the chosen model implemented with a cross-principal bleed proof (audit experiment 5) run before and after.
- NEXT FALSIFICATION: the authorized non-destructive experiment — authenticated `POST /ingest` with `namespace:"tenant::someone-else"` from one credential, read back from

**PRIV-02 — Dual tenant registries, disconnected (TEN-002)** 
**PRIV-02 — Dual tenant registries, disconnected (TEN-002)**
- STATUS: BLOCKED · PRIORITY: 2
- WHY: `tenant_registry` (public CRUD via `/tenants`, now 401'd) vs `tenants` (ingestion boundary, seed-only `hpp`): no join. Registering via the API does not authorize ingestion; ingestion tenants cannot be added via any API. Tenant onboarding is incoherent.
- EVIDENCE: audit TEN-002 ("fold into TEN-001's decision").
- DEPENDENCIES: PRIV-01 (G4)
- ACCEPTANCE: one registry owns tenant identity with a documented onboarding path, or the pair is explicitly classified with the join semantics written down.
- NEXT FALSIFICATION: n/a until G4 lands.

**PRIV-03 — Principal loss across hops (TEN-003)** 
**PRIV-03 — Principal loss across hops (TEN-003)**
- STATUS: OPEN · PRIORITY: 2
- WHY: `req.authenticatedAgent` is attached by middleware but consumed by almost nothing (7 hits, all in routes, none in runtime/workers/evidence/replay). `/ingest` never records the agent (body `source` is free text). Event→mission→worker carries only namespace and free-text source. Replay and evidence attest to asserted sources — and worker identity is self-asserted on `/events/processed|/failed` (SEC-006: "who processed what" provenance is forgeable).
- EVIDENCE: audit TEN-003 + SEC-006 (NEXT: diff `submittedBy` vs `workerId` in `mission.workerOutputs` — audit experiment 12).
- DEPENDENCIES: none (safe to start before G4; binding the principal is additive)
- ACCEPTANCE: the authenticated principal is recorded in event metadata at the authed routes; a read-only scan diffs `submittedBy` vs `workerId` for mismatches (sizes the forge exposure).
- NEXT FALSIFICATION: emit via an authed route and inspect the stored event for the principal; absence keeps the item open.

**PRIV-04 — Replay/projection/evidence carry no tenant scoping or caller authorization** 
**PRIV-04 — Replay/projection/evidence carry no tenant scoping or caller authorization**
- STATUS: OPEN · PRIORITY: 2
- WHY: `replay_verifier.js` and `materialized_views.js` contain zero `tenant` references; `evidence_authority.js` checks namespace consistency but never requester entitlement. A replay or projection over one tenant's journal is not constrained to that tenant's caller.
- EVIDENCE: audit TEN-004 ("SEVERITY LOW (latent)").
- DEPENDENCIES: PRIV-01 (G4; scoping needs the authority model)
- ACCEPTANCE: replay/verify/projection entry points accept a caller principal and scope to authorized namespaces; unauthorized-namespace replay fails closed.
- NEXT FALSIFICATION: request a replay scoped to `tenant::hpp` from a principal with no grant; success falsifies the fix.

**PRIV-05 — Agent memory / private owner context store: canonical journal vs. operational store** 
**PRIV-05 — Agent memory / private owner context store: canonical journal vs. operational store**
- STATUS: DECISION · PRIORITY: 2
- WHY: The invariant is "private context never leaks into public objects or canonical events." Today the 5 `agent_memory_authority` write sites are DELIBERATELY UNANCHORED (fail closed) because adapting them would require forging canonical acceptance. The owning-lane decision is binary: UER-accept these lifecycle types as real canonical event types (an authority decision), or move agent memory to an operational store outside the canonical journal. Either way, the invariant needs a stated home.
- EVIDENCE: sprint caller adaptation ("adapting would require forging canonical acceptance... or inventing resolving correlation ids"; "move them to an operational store outside the canonical journal"); AUTH-CONV-04.
- ACCEPTANCE: a recorded decision naming the store for agent-private context, with the invariant (no leakage into public objects/canonical events) stated and a test or gate enforcing the boundary.
- NEXT FALSIFICATION: a private-context write landing in `ping_events` without an authority decision falsifies the invariant.

**PRIV-06 — Credential lifecycle: rotation/revocation path for `exterior_agent_credentials`** 
**PRIV-06 — Credential lifecycle: rotation/revocation path for `exterior_agent_credentials`**
- STATUS: OPEN · PRIORITY: 2
- WHY: Credentials never expire (`expires_at = NULL`); no code route rotates or revokes (rotation = direct DB edit); leaked key = permanent access. The 2026-09-20 rotation succeeded (48-char credential, five consumers agree) but PG-001 records that loopback `trust` makes the password theater on loopback — held for the gateway cutover, then the next security patch. The rotation was an operator action, not a path.
- EVIDENCE: audit SEC-007; GRILLING-BRIEF PG-001 (status: HOLD for gateway cutover; "Do not leave loopback trust indefinitely").
- DEPENDENCIES: none
- ACCEPTANCE: a documented rotation/revocation procedure (or code path) exercised once without direct DB edits; PG-001 resolved (tighten or explicitly accept with a re-review date).
- NEXT FALSIFICATION: attempt a rotation using only documented surfaces; any direct-DB-edit step keeps the item open.

**PRIV-07 — Probe tenant row cleanup (audit integrity incident)** 
**PRIV-07 — Probe tenant row cleanup (audit integrity incident)**
- STATUS: PROVE · PRIORITY: 3
- WHY: The security lane's accidental unauthenticated `POST /tenants` created row `tenant_id='probe'` in `tenant_registry` (2026-09-20 01:54 UTC); left in place per read-only rules; flagged for authorized cleanup + a FAILURE_LEDGER entry. The audit's unknown-list still asks "whether the `probe` tenant row has been removed and whether a ledger entry exists."
- EVIDENCE: audit INTEGRITY NOTES + SEC-001; unknown-list ("Whether the probe tenant row has been removed").
- DEPENDENCIES: none (needs an authorized operator action, not a lane)
- ACCEPTANCE: the row is gone (SELECT confirms) and the ledger entry exists.
- NEXT FALSIFICATION: SELECT on `tenant_registry` for `tenant_id='probe'`; a row means cleanup never happened.

**PRIV-08 — CG-001: tenant owner is the default human decision authority** 
**PRIV-08 — CG-001: tenant owner is the default human decision authority**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Decided 2026-09-19, retained in the Grill as re-grillable: PING recommends, the authorized tenant owner decides, the decision becomes canonical history; system constitutional authority and tenant business decision authority are not collapsed into one identity. This is the private-context governance anchor for FYD's owner mode.
- EVIDENCE: GRILLING-BRIEF "DECISIONS WORTH RE-GRILLING: CG-001" (verbatim model above); Lane B G-LANEB-1 counterevidence cites it.
- ACCEPTANCE: decision recorded (done); re-grill only on challenge.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**PRIV-09 — Secret-denial protections exist only in the unwired capability model** 
**PRIV-09 — Secret-denial protections exist only in the unwired capability model**
- STATUS: PROVE · PRIORITY: 3
- WHY: The 2026-09-13 capability audit found the gateway `CapabilityAuthority` agent profiles deny `secrets/*`, `credentials/*`, `.env`, `*.pem`, `*.key` — but that model was committed and never wired; the live exterior contract was just POST /events. Any claim that "agents cannot reach secrets" must rest on the live path's protections (exterior auth + workspace scoping), not the dead model.
- EVIDENCE: capability-vocabulary-audit §1A (profile `deniedPaths`); "The `/capabilities` surface is implemented but unmounted."
- ACCEPTANCE: a statement of which live mechanisms deny secret access to exterior agents, with a test proving a secret-path request fails closed on the live plane.
- NEXT FALSIFICATION: request `secrets/*` (or equivalent) through each live exterior contract; any success falsifies the protection claim.

---

## CROSS-CUTTING NOTES FOR THE PARENT

1. **Status roll-up (48 items):** 
1. **Status roll-up (48 items):** DONE_VERIFIED 13 · DECISION 5 (G2, G3, G4, PRIV-05, AUTH-CONV-10 is OPEN not decision) — precisely: DECISION = IDENTITY-01, REPLAY-03, PRIV-01, PRIV-05, and EVENT-SPINE-03's drain semantic (embedded as dependency) · BLOCKED 4 (ERA-03, PRIV-02, EVENT-SPINE-06's real-PG re-cert, LANEB-005-analog Oracle SSH) · IN_PROGRESS 11 · OPEN 13 · PROVE 5 · HARVEST 2 · DEFERRED 1.

2. **The four 2026-09-19 Grill candidates (G1–G4) never reached the Grill.** 
2. **The four 2026-09-19 Grill candidates (G1–G4) never reached the Grill.** G1 and G3 were operationally resolved by sprint lanes; G2 and G4 remain genuinely open. Recommend the parent confirm whether Nolan wants the resolutions recorded as decisions or accepts the operational record.

3. **The permanent rule "STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" was never installed** 
3. **The permanent rule "STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" was never installed** as a standing rule despite being the audit's headline permanent recommendation. Its substance lives in scattered fixes; the rule itself does not.

4. **Highest-leverage next experiments** 
4. **Highest-leverage next experiments** (from the audit's own ordered list, still unexecuted to my knowledge): (1) migration-vs-trigger fixture gate + `--with-db` smoke mode; (2) scratch-DB concurrency repro of the silent drop (now subsumed by the demotion — re-verify); (3) pre-cutover era census; (4) `/events/unprocessed` two-poll drain proof; (5) cross-principal bleed proof; (6) canonical identity bytes JS+Python fixture proof.


======================================================================
protocols-harvest.md

ITEMS FOUND: 5

1. **AP skeleton existence.** 
1. **AP skeleton existence.** Memory (2026-09-21, L374) says commit `f61200c` added an AP adapter skeleton with exact `@fedify/fedify` 2.3.7 and 9/9 passing mapping tests plus a live activitypub.academy proof. The same-day executable harvest says "no Fedify in the FYD repo" and "no executable implementation exists." Item #2 (PROVE) is the reconciliation task. Possibly different repos/branches (the executable harvest covered `/home/nolan/projects/ping` worktree `fyd/sitespec-generator` and `/home/nolan/ping`).

2. **MCP spec version.** 
2. **MCP spec version.** `FYD_ECOSYSTEM_HARVEST.md` says MCP spec at v2 (2026-11-26), SDK 1.30.0. The builder-lane harvest (same week, 2026-09-21) says TS SDK v2 implements spec revision 2026-07-28, verified on the official repo. One of these dates is stale or misread; pin must be re-verified at decision time.

3. **CRDT stance.** 
3. **CRDT stance.** Ecosystem harvest: Automerge USE-LIBRARY at draft layer. 2026-09-22 lane: FYD has a no-CRDT rule. Item #44 holds this open for Nolan's call.

4. **schema.org 30.1.** 
4. **schema.org 30.1.** Nolan stated 30.1 released 2026-09-16; the builder-lane research could not verify it in any primary source (2026-09-21). v30.0 verified; map pinned there pending verification.

5. **MCP posture.** 
5. **MCP posture.** Ecosystem harvest's USE-LIBRARY for the MCP SDK could be misread as a green light; memory and the builder harvest both say implementation is deferred until the loop closes. Item #28 records it as DEFERRED, not open.

## NOTES FOR PARENT
- 48 items extracted (target was 30-50). Statuses used: DECISION, DONE_VERIFIED, HARVEST, PROVE, DEFERRED, REJECTED, OPEN. No items are IN_PROGRESS/BLOCKED/SUPERSEDED in the source material, except the superseded FYD side branches noted in the executable harvest (not protocol/harvest domain, omitted).
- Nostr and Farcaster have no dedicated harvest docs in the transfer dirs (grep found none); their items derive from the ecosystem harvest's comparison table and verdict rows — flagged honestly above.
- Per-item ACCEPTANCE and NEXT FALSIFICATION are written as checkable conditions a future lane can execute read-only.
- Read-only discipline held: no files created/edited/deleted, no git, no repo access beyond the listed workspace docs, BACKLOG_NOLAN.md not read.


======================================================================
reconciliation-failure-dogfood-validation-ergonomics.md

ITEMS FOUND: 8

1. **KNOWN_PERMANENT vocabulary unverified.** 
1. **KNOWN_PERMANENT vocabulary unverified.** The task asserts a reconciliation lifecycle OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED. The only matches for `KNOWN_PERMANENT` on disk are in `~/workspace/self_improvement/staging/memory/sirun_*/.../MEMORY.*.md` (memory-system reconciliation, an unrelated domain). The outreach reconciliation machinery has no named lifecycle states: discrepancies are emitted to JSONL and resolved by prose reconciliation records with a disposition (ELIGIBLE/INELIGIBLE/SUPPRESSED). The permanent-disposition concept exists only as prose: "Prospect remains SUPPRESSED (ladder violation); no further touches ever."

2. **Ledger status vocabulary differs from task's.** 
2. **Ledger status vocabulary differs from task's.** The ledger uses OPEN / HEALED / QUARANTINED / NEEDS_NOLAN / HEALING / LOGGED / SUPERSEDED / CLOSED / RECOVERED / FIXED — not the task's OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED. Per-item STATUS below uses the task's enum; where a ledger entry says HEALED with replay proof I use DONE_VERIFIED, where it says QUARANTINED/SUPERSEDED I say SUPERSEDED or DEFERRED with a note.

3. **FL-20260921-072 self-contradiction on outage window** 
3. **FL-20260921-072 self-contradiction on outage window** (lane worker clock said 18:20-19:30 MDT; coordinator probe said 15:53-16:12 MDT; entry itself flags 15:53-16:12 as authoritative).

4. **Reconciliation's independent-ingestion requirement has an open hole:** 
4. **Reconciliation's independent-ingestion requirement has an open hole:** FL-20260922-001 records a 16-row JSONL count delta (318 -> 302) with cause UNKNOWN and no row-level backup — the writer's own row accounting is unattested, so the "closure disposition + independent ingestion evidence" bar is currently not met for row-count changes.

---

# ITEMS

## RECONCILIATION

- **ID:** reconciliation-precedence-frozen
  **DOMAIN:** RECONCILIATION **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** The send-eligibility gate settles eligibility on a fail-closed precedence ladder: (1) canonical structured state, (2) explicit suppression, (3) verified communication history, (4) derived projection, (5) notes/free text advisory only. Any disagreement between the two canonical sources is itself a fail-closed discrepancy. Do not keep redesigning it; future work extends it (Messenger DM path, meta-ai-intel ingest) rather than replacing it.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up (2026-09-21): `~/workspace/outreach/send-eligibility.py` + `test-send-eligibility.py` 17/17 pass; exit codes 0 ELIGIBLE / 1 INELIGIBLE / 2 DISCREPANCY / 3 ERROR.
  **DEPENDENCIES:** per-recipient Gmail `in:sent to:<addr>` verification (mandatory); JSONL + pipeline.md as the two canonical sources.
  **ACCEPTANCE:** `send-eligibility.py` runs in the engine cron before every outbound action (email wired 2026-09-21; Messenger/meta-ai-ingest still pending, tracked as RECON-EXTEND).

1. **Count:** 
1. **Count:** 56 items across 11 domains (target was 40-60).

2. **The KNOWN_PERMANENT lifecycle could not be grounded.** 
2. **The KNOWN_PERMANENT lifecycle could not be grounded.** If the parent's reconciliation design depends on that vocabulary, it needs to be introduced as new design, not cited as existing — the existing machinery has dispositions (ELIGIBLE/INELIGIBLE/SUPPRESSED) but no named lifecycle states. I recorded this as Contradiction #1 rather than inventing items around an unverified term.

3. **Biggest open risks, in my read:** 
3. **Biggest open risks, in my read:** (a) EXTERNAL USER VALIDATION is a fully empty domain — the product has no external user yet; (b) FL-20260921-031/032/033 are three OPEN FYD-loop defects with Nolan's first-broken-step rule fixing the order; (c) TEN-001 (no agent↔tenant binding) blocks the entire developer-ecosystem and multi-tenant BI optionality set; (d) the row-count attestation gap (FL-20260922-001) means the reconciliation machinery's own writer is not fully accounted.

4. **Deliberately excluded** 
4. **Deliberately excluded** (outreach content, not platform machinery): disclosure-line wording, AI-identity sign-off, sentence-spacing, comment voice, like/comment targeting, page-invite shortlists, cold-email copy angles.


======================================================================
security-tenancy-oracle-release-capabilities.md

ITEMS FOUND: 63

### sh-pg-password-incident 
### sh-pg-password-incident
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The 2026-09-20 PostgreSQL password exposure is the canonical secret-hygiene lesson. It must be recorded permanently with the full arc: exposure, contested evidence, full-incident rotation, proof of old-credential death, and the standing rules it produced. (Task brief requires permanent recording.)
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1193-1204 (FL-20260920-022: env-listing command printed the PG password into tool output, exposure limited to agent runtime) + lines 1755-1799 (FL-20260920-022 ROTATION RECORD 2026-09-21 ~11:24-11:28 UTC: 48-char replacement written to `/opt/ping/.env` mode 600, ALTER ROLE via local socket with SQL on stdin, both containers recreated purging the dead credential from `docker inspect`, SCRAM verifier matches NEW only, old credential proven rejected over the real container-network path). Memory `MEMORY.md#L162` and `memory://md:memory/2026-09-21.md:1392` confirm resolution. **Contradiction (see section below):** `memory://md:memory/2026-09-20.md:1020` claims the allegation was unsupported and no rotation performed; that note predates the 2026-09-21 rotation and appears superseded by it, but the two records were never reconciled in one place.
- **DEPENDENCIES:** none (root lesson).
- **ACCEPTANCE:** The incident, the standing inspection rule, the rotation procedure, the rejection proofs, and the open pg_hba residual are a

### sh-redacted-inspection-rule 
### sh-redacted-inspection-rule
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Nolan's standing rule (2026-09-21): normal diagnostics must be safe to copy. Without a machine-enforced filter, every inspection is one careless paste from another FL-20260920-022.
- **EVIDENCE:** `memory://md:memory/2026-09-21.md:311` ("Secret-like names (PASSWORD, PASS, TOKEN, SECRET, KEY, CREDENTIAL, DATABASE_URL, AUTH, COOKIE) render as KEY=***REDACTED***; raw secret inspection requires an explicit exceptional action and stays machine-local"); `MEMORY.md#L162` repeats it. Implemented as `~/workspace/tools/redact-secrets.py` (KEY=VALUE, JSON pair, and Authorization/Cookie/Set-Cookie header redaction; non-matching lines byte-identical) with regression tests in `~/workspace/tools/test-redact-secrets.py`.
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** Every operator diagnostics path pipes through the redactor; raw inspection requires an explicit exceptional action.
- **NEXT FALSIFICATION:** run `test-redact-secrets.py`; attempt a diagnostic containing a synthetic `POSTGRES_PASSWORD=` value and confirm it renders `***REDACTED***`.

### sh-secret-pattern-regression 
### sh-secret-pattern-regression
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Secrets must never ship inside a distribution closure. A machine gate beats a policy sentence.
- **EVIDENCE:** `~/workspace/laneC/security-negatives.js`: deterministic negative assertions over the exact distribution snapshot. S1: no credential-bearing filenames (`*.pem, *.key, id_rsa*, .env, .env.*`); S2: no high-confidence secret content in shipped non-source files (private-key blocks, provider key prefixes). Exit 0 PASS / 1 FAIL / 2 usage error. Gate 7 of the release sequence (`~/workspace/laneC/RELEASE-SEQUENCE.md`). The ledger (lines 585-596) records it catching a rule-overbreadth defect (`.env.example` false-positive) pre-commit, proving it runs against fixtures.
- **DEPENDENCIES:** rel-one-sequence (as gate 7).
- **ACCEPTANCE:** `security-negatives.js` runs as release-certify gate 7 on every candidate snapshot; exit non-zero blocks promotion.
- **NEXT FALSIFICATION:** run it against a fixture snapshot seeded with a synthetic private key; confirm FAIL.

### sh-rotation-procedure 
### sh-rotation-procedure
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** Rotation must be a rehearsed, rollback-safe procedure that never prints key values, not an improvised scramble.
- **EVIDENCE:** `~/workspace/gateway-rotation/rotate-gateway-keys.ps1` (2026-09-13): rotates the two exterior bearer keys; generates fresh 256-bit keys; reads old rows into memory only for rollback; SQL travels via stdin pipe (never argv, never disk); "The script NEVER prints key values. It exits 0 only on full success"; state-machine rollback restores old container + old DB rows on any failure after step 4. The 2026-09-21 PG rotation followed the emergency-fix path with the same properties (SQL on stdin, SCRAM comparison in-memory, no values in files/logs/reports).
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** A documented, value-never-printed rotation procedure exists for every credential class (exterior bearer keys, PG role password) and has been executed at least once each.
- **NEXT FALSIFICATION:** confirm whether `rotate-gateway-keys.ps1` has any recorded execution (none found in sources reviewed); if not, dry-run the mechanics against a scratch stack.

### sh-old-credential-rejection 
### sh-old-credential-rejection
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Rotation is not complete when the new credential works; it is complete when the old one is proven dead on the real network path. A trust-localhost rejection proof is worthless.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1779-1784: SCRAM verifier matches NEW credential only; old credential rejected over the real network path (transient peer container on `oracle_ping_internal` got `FATAL: password authentication failed`, rc=2). Critically, the record notes the earlier rejection attempt from inside the postgres container was INVALID because `pg_hba.conf` trusts local and 127.0.0.1/32 (any password works on loopback). All four historical passwords dead.
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** every future rotation includes a rejection proof over the real network path, with the loopback-trust caveat stated.
- **NEXT FALSIFICATION:** re-verify any time with SCRAM comparison via pg_authid (read-only) + `GET /health`.

### sh-history-log-report-scans 
### sh-history-log-report-scans
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** A rotated credential can live on in bash history, build logs, container logs, exited-container envs, and workspace files. The sweep must be explicit and recorded.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1792-1795: all four historical values swept (byte comparison in-memory, paths only) across `/home/ubuntu/.bash_history` (absent), `/opt/ping/.env` + both backups, `.pgpass`, p18-oracle-staging build logs, live container logs, exited container envs. Local sweep: 12,935 files under `~/workspace` and `~/workspace/transfer`, no match. **Residual:** "Git history -S check could not run in this sandbox (/home/nolan/projects/ping absent); parent should run it read-only."
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** the git `-S` history check runs read-only on the real repo; all four historical values confirmed absent from history, or their commits named.
- **NEXT FALSIFICATION:** `git log -S <redacted>` is not runnable by anyone reading this; the parent must run the scan and record the result.

### sh-consumer-agreement 
### sh-consumer-agreement
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The rotation exposed a drift: `/opt/ping/.env` held a stale credential relative to the live one; the Sep-21 deploy bypassed `.env` entirely. Consumers agreeing after rotation is not the same as a rule that keeps them agreeing.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1758-1764 (four distinct historical passwords existed: live-then 32-char exposed Sep-20, `/opt/ping/.env` pre-rotation value, `.env.bak-20260917` value, `.pgpass` value) and lines 1797-1798 ("Post-rotation all five consumers (DB, gateway env, postgres env, .env, .pgpass) agree again. The deploy lane should route future credential changes through .env").
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** a single consumer list is recorded and the deploy lane routes credential changes through `.env` (or a named successor), with a pre-deploy agreement check.
- **NEXT FALSIFICATION:** diff the live credential source-of-truth against every consumer; any divergence reopens this.

### sh-pghba-scram 
### sh-pghba-scram
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** `pg_hba.conf` trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback. Anyone with `docker exec` on ping-postgres gets passwordless access, which also invalidates naive rejection proofs. This is the one standing risk the rotation record explicitly named.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1796-1797 ("pg_hba.conf trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback; anyone with `docker exec` on ping-postgres gets passwordless access. Tighten to scram-sha-256 (requires a postgres reload; low risk, but a config change needing a decision)"); memory `MEMORY.md#L162` ("pg_hba.conf scram-sha-256 tightening still pending").
- **DEPENDENCIES:** sh-pg-password-incident (the rotation record is the source).
- **ACCEPTANCE:** `pg_hba.conf` requires scram-sha-256 on all paths; the old-credential rejection proof is re-run and passes.
- **NEXT FALSIFICATION:** `SHOW hba_file` + dump; any `trust` line for a reachable path fails this.

### sh-degraded-key-leak 
### sh-degraded-key-leak
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** When the gateway boots without Postgres it enters in-memory degraded mode, generates API keys, and prints them into container logs. /health still returns 200, so the leak is invisible to health checks.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 435-436 (FL-20260919-ORACLE-006 cascade: "gateway booted while postgres was still initializing and fell into IN-MEMORY DEGRADED MODE (CapabilityAuthority/ExteriorAuth/Postgres all degraded), printing GENERATED API keys into the container logs... Secret hygiene note: generated credentials are visible in `docker logs` history from degraded boots"); memory `memory://md:memory/2026-09-19.md:1688` ("the leak does NOT exist in the convergence worktree code... Hygiene test guards the degraded path"; "Oracle degraded-boot log history is a deploy-lane hygiene note"); memory `memory://md:memory/2026-09-17.md:423` (contained incident: ephemeral keys never usable externally, destroyed with old container); ledger line 492 (P0-6 redaction verified working in deployed code).
- **DEPENDENCIES:** sh-redacted-inspection-rule.
- **ACCEPTANCE:** no generated credential value ever appears in any container log; degraded boot either redacts or refuses to print; a startup-retry removes the degraded-on-boot path that created the leak window.
- **NEXT FALSIFICATION:** force a degraded boot on a scratch stack; grep the resulting logs for the ge

### sh-exited-container-envs 
### sh-exited-container-envs
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The dead credential remains visible in `docker inspect` output of two exited gateway containers. It cannot authenticate, but "dead" and "invisible" are different claims, and deploy-lane history is not a reason to keep it readable forever.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1798-1799 ("The two exited gateway containers still show the dead credential in `docker inspect`; remove them when the deploy lane no longer needs them": `ping-gateway-old-512776de5`, `ping-gateway-rollback-rc4d522a6b`).
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** both exited containers are removed once the deploy lane confirms they are no longer needed; a final `docker inspect` sweep shows no secret-bearing env on any non-running container.
- **NEXT FALSIFICATION:** `docker inspect` the two named containers; any credential-shaped env value fails this.

---

## DOMAIN: SECURITY

### sec-tenants-public 
### sec-tenants-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Tenant registry CRUD is fully unauthenticated and runtime-proven writable by anyone who can reach the port. Tenant creation is an authorization decision; a public endpoint makes it a suggestion.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-001 (POST/PUT/DELETE/GET `/tenants` has no authentication; `gateway_runtime.js:795` mounts without `exteriorAuthMiddleware`; runtime probe: unauthenticated `POST /tenants {"tenant_id":"probe"}` → HTTP 200, row created) and INTEGRITY NOTES + `~/workspace/FAILURE_LEDGER.md` lines 496-502 (FL-20260919-AUDIT-001: probe row `tenant_id='probe', status=active` created 2026-09-20 01:54 UTC; parent later verified the single row via SELECT and issued surgical `DELETE FROM tenant_registry WHERE tenant_id='probe'`, verified zero rows remain). Defect itself unfixed, owned by convergence lane.
- **DEPENDENCIES:** ten-agent-tenant-binding (the auth model decision).
- **ACCEPTANCE:** unauthenticated `POST /tenants` returns 401/403 and writes nothing; authenticated creation requires a named authorizer.
- **NEXT FALSIFICATION:** repeat the audit's probe (GET-first per FL-20260919-AUDIT-001's lesson; never write-probe a live surface in a read-only pass).

### sec-mc-public 
### sec-mc-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Business-intelligence surfaces (lead lists, unpaid invoices, at-risk projects, marketing, inbox, knowledge, missions) are public. This is customer business data readable by anyone who can reach port 8080 (bound 0.0.0.0).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-002 (`/mc/dashboard`, `/mc/business/who-needs-followup`, `/mc/business/stalled-estimates`, `/mc/business/pending-reviews`, `/mc/business/ai-recommendations`, `/mc/business/today-work`, `/mc/business/unpaid-invoices`, `/mc/business/at-risk-projects`, `/mc/business/marketing`, `/mc/inbox`, `/mc/knowledge`, `/mc/missions/*` require neither auth nor PG-check beyond `requirePG` at `gateway_runtime.js:920`; runtime: `GET /mc/business/who-needs-followup` → 200; `/mc/system` → 200 exposing worker internals and connector status).
- **DEPENDENCIES:** ten-agent-tenant-binding (scoping), ten-second-tenant-boundary.
- **ACCEPTANCE:** every `/mc/*` route requires authentication and returns only data the caller's tenant is entitled to.
- **NEXT FALSIFICATION:** unauthenticated GET on `/mc/business/unpaid-invoices`; any 200 fails this.

### sec-context-public 
### sec-context-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Event-context surfaces are public and tenant-unscoped: cross-tenant event reads without authentication.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-003 (`gateway_runtime.js:791` mounts without auth; `routes/context.js:14-48`; runtime `GET /context/recent-events` → 200).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** `/context/*` requires auth and enforces the caller's namespace.
- **NEXT FALSIFICATION:** unauthenticated `GET /context/recent-events`; 200 fails this.

### sec-repository-public 
### sec-repository-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Anonymous arbitrary write and delete on the object repository. This is repository poisoning and deletion by anyone who can reach the port.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-004 (`POST /api/v1/repository/objects` arbitrary kind/data and `DELETE /api/v1/repository/objects/:id` require no auth; `gateway_runtime.js:792`; `routes/repository.js:14-40`; runtime GET → 200; POST/DELETE not probed to avoid mutation; code unambiguous).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** write/delete on `/api/v1/repository/*` require authentication with capability evidence; deletes are governed, not anonymous.
- **NEXT FALSIFICATION:** code-read the current route file; any auth-free mutating route fails this.

### sec-system-logs 
### sec-system-logs
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** Internal logs are world-readable. Filenames are fixed (no traversal), but audit log contents should not be public.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-005 (`routes/system.js:21-59` uses `path.join` on constants; audit log contents world-readable).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** `/system` log routes require authentication (or are removed from the public surface).
- **NEXT FALSIFICATION:** unauthenticated GET on a `/system` log route; 200 fails this.

### sec-worker-attribution 
### sec-worker-attribution
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Worker identity is self-asserted on `POST /events/processed` and `POST /events/failed`; the caller-supplied `worker` string is written to `event_processing.worker`. "Who processed what" provenance is forgeable, which poisons evidence lineage.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-006 (`routes/events.js:144-160`; container `event_read_authority.js:303-335`, `worker || 'unknown'`, no binding to the authenticated agent; partial mitigant: orchestration records `submittedBy: <real agent>`, but a level-2 agent can still submit as another registered worker).
- **DEPENDENCIES:** ten-principal-propagation.
- **ACCEPTANCE:** the recorded worker identity is bound to the authenticated principal; a read-only diff of `submittedBy` vs `workerId` in `mission.workerOutputs` shows zero mismatches.
- **NEXT FALSIFICATION:** the audit's experiment 12: read-only scan of `mission.workerOutputs` for `submittedBy`/`workerId` mismatches.

### sec-credential-expiry 
### sec-credential-expiry
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Exterior credentials never expire and there is no rotation/revocation path in code. A leaked key is permanent access.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-007 (`exterior_agent_credentials` rows for `muse` and `muse-level-2` have `expires_at = NULL`, active, last used 2026-09-17 / 2026-09-19; no code route rotates or revokes; rotation = direct DB edit).
- **DEPENDENCIES:** sh-rotation-procedure (the bearer-key rotation script exists but has no recorded execution).
- **ACCEPTANCE:** credentials carry expirations; a code path (not direct DB edit) rotates and revokes them.
- **NEXT FALSIFICATION:** SELECT `expires_at` on `exterior_agent_credentials`; any NULL on an active key fails this.

### sec-hardcoded-pg-fallback 
### sec-hardcoded-pg-fallback
- **DOMAIN:** SECURITY | **STATUS:** PROVE | **PRIORITY:** 3
- **WHY:** Source contains a hardcoded PG credential fallback. It is reportedly not in effect (container uses env), but an unused credential in source is a latent exposure and a standing contradiction of the secret-hygiene rules.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-008 ("Hardcoded PG credential fallback in source"; severity LOW; "not in effect; container uses env").
- **DEPENDENCIES:** sh-secret-pattern-regression (S2 should catch it if it is key-shaped in a shipped file).
- **ACCEPTANCE:** the fallback is removed from source, or proven unreachable and excluded from every distribution snapshot by the S1/S2 gate.
- **NEXT FALSIFICATION:** grep the distribution snapshot for the fallback string; any hit fails this.

### sec-knowledge-public 
### sec-knowledge-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Knowledge-graph writes are public with caller-supplied status/confidence/namespace, and unscoped reads return cross-namespace nodes. The Ollama chat surface is public too. Knowledge integrity and tenant isolation both fail here.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXCLUSION-SET STATE UPDATE (`POST /knowledge/nodes` and `POST /knowledge/edges` remain public with caller-supplied status/confidence/namespace; `GET /knowledge/nodes` without `namespace` returns cross-namespace nodes; `POST /api/v1/ollama/chat` plus `/models`, `/autocomplete` remain public. None are fixed.)
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** knowledge writes require auth and are namespace-bound to the caller's tenant; unscoped cross-namespace reads are denied.
- **NEXT FALSIFICATION:** unauthenticated `POST /knowledge/nodes`; 200 fails this.

### sec-fail-closed-verified 
### sec-fail-closed-verified
- **DOMAIN:** SECURITY | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The controls that are already sound must be named so refactors do not silently break them. Fail-closed is the architectural posture everything else assumes.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` NEGATIVE FINDINGS: "Auth middleware fail-closed (audited): missing/invalid key → 401; PG outage → in-memory fallback still denies unknown keys. No fail-open found."; "Event governance, capability authority, orchestration writes all fail closed (audited, sound)."; "Degraded-mode route gating fails closed (N-B): PG-unavailable → canonical routes return 503, never silent success."
- **DEPENDENCIES:** none (guardrail).
- **ACCEPTANCE:** every auth/governance refactor ships with a fail-closed regression test; a fail-open is a release-blocking defect.
- **NEXT FALSIFICATION:** negative-test the auth middleware with missing/invalid keys and a simulated PG outage; any non-denial fails this.

### sec-integration-fake-green 
### sec-integration-fake-green
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Integrations report "healthy" with no credentials configured and zero events ever sent. "Healthy" means enabled, not credentialed. Operators cannot distinguish a working integration from an unconfigured one.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-001 (posthog/email/sms report `status:"healthy"` with `"apiKey":"not configured"` etc., `eventCount:0`, `sent:0`; `posthog_integration.js:28-31`: `status: this._enabled ? 'healthy' : 'disabled'`; the status vocabulary has no "unconfigured" state).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** health vocabulary includes an "unconfigured"/"disabled" state; no integration reports "healthy" without credentials and at least one successful send.
- **NEXT FALSIFICATION:** scratch-env status matrix (with/without credentials); "healthy" without credentials fails this.

### sec-health-empty-checks 
### sec-health-empty-checks
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `getHealth()` starts at `status: 'healthy'` and iterates zero registered checks, returning healthy with nothing proven. Absence of evidence is presented as evidence of health.
- **EVIDENCE:** `~/workspace/health-truth-audit-2026-09-20.md` Finding 1 (`gateway/health_authority.js`; zero checks → `{status: 'healthy', components: {}}`). Minimal fix proposed in the audit: if `this._healthChecks.size === 0`, return `status: 'unknown'`/`'unproven'`. Also `~/workspace/ORACLE_CRITICAL_PATH_2026-09-20.md` DEFER #4 ("/health 200 when authority absent").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** zero registered checks → `status: 'unknown'` (or `unproven`) with an explicit note; never `healthy`.
- **NEXT FALSIFICATION:** instantiate the authority with no checks; any `healthy` fails this.

### sec-health-component-honesty 
### sec-health-component-honesty
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Component checks hardcode `status:'healthy'` (ignoring their own `stats.failed`), and the `/health` fallback returns hardcoded 200-healthy when the health authority is missing. Defense-in-depth defaults must be 503/unknown, never 200-healthy.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-002 (`gateway_runtime.js:852-869`; `event_runtime`, `canonicalization`, `embedding` hardcode healthy; contrast `event_governance` which gates on `stats.rejected === 0`) and OBS-004 (fallback returns hardcoded 200-healthy when the health authority is missing; latent).
- **DEPENDENCIES:** sec-health-empty-checks.
- **ACCEPTANCE:** every component check derives its status from its own stats (mirror the `event_governance` pattern); the missing-authority fallback is 503/unknown.
- **NEXT FALSIFICATION:** inject a failed event into stats; any `healthy` from that component fails this.

### sec-503-misattribution 
### sec-503-misattribution
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `_pgRoute` returns 503 `{error:'Postgres unavailable', degraded:true}` even when Postgres is reachable and the migration is what's failing. Operators chase the database instead of the migration/trigger policy. This is the same failure-semantics collapse as PING law 11.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-007 and REC-002 (`_startPgRecoveryLoop` distinguishes only NOT_READY/READY; one catch wraps both `SELECT 1` and `_initializeSpineOnce`; logs only `attempt === 1 || attempt % 10 === 0`; no attempt ceiling, no error classification, no terminal state; the reason string mislabels migration/trigger failure as Postgres unavailability).
- **DEPENDENCIES:** db-trigger-owner (the mislabeled failure class).
- **ACCEPTANCE:** connectivity probe is separated from spine-init; consecutive identical failures are counted and surfaced as `{phase, consecutiveFailures, lastError}`; deterministic failures reach a terminal state instead of infinite sparse-logged retry.
- **NEXT FALSIFICATION:** unit-test the recovery loop against a fake pool throwing trigger-violation on the migration step; no terminal state, or attempts 2-9 logging nothing, fails this.

---

## DOMAIN: TENANCY

### ten-agent-tenant-binding 
### ten-agent-tenant-binding
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** There is no agent↔tenant binding anywhere. Tenant is caller-asserted at every layer; any authenticated agent can emit into `tenant::hpp` or any invented tenant. "Namespace = privacy boundary" is a comment, not an enforcement. This is the G4 grill question and it gates the second tenant.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-001 (`/ingest` `authorizeNamespace` = "explicit request > per-source map > default" with only regex validation; `/events` POST validates tenant existence, not caller ownership; `GET /events` with no namespace returns all namespaces; `/knowledge/search` namespace caller-supplied; Qdrant single shared collection `knowledge` with namespace as payload field; nothing constrains a worker to its namespace; grepped for agent↔tenant mappings: zero hits; `tenant_registry` has no tenant owners/agents). Runtime state: single tenant (`hpp`; `ping_events`: 177 `tenant::hpp` / 1018 `core::system` / 10 `core::owner`). Memory `memory://md:memory/2026-09-14.md:433` (2026-09-14 production trace: "tenant isolation on `ping_events` was not enforced"). The audit's candidate grill G4 names the options: credential-scoped tenants, tenant registry owning principals, or explicit single-tenant-until-redesign.
- **DEPENDENCIES:** none (root decision; blocks ten-second-tenant-boundary, ten-dual-registries, ten-principal-propagation).
- **ACCEPTANCE:

### ten-dual-registries 
### ten-dual-registries
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 2
- **WHY:** Two tenant registries exist and are disconnected: `tenant_registry` (public CRUD via `/tenants`) vs `tenants` (ingestion boundary for `/events`, seed-only `hpp`). Registering via the API does not authorize ingestion; ingestion tenants cannot be added via any API. Tenant onboarding is incoherent.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-002 ("no join"; folds into TEN-001's decision).
- **DEPENDENCIES:** ten-agent-tenant-binding (folds into the G4 decision).
- **ACCEPTANCE:** one registry owns tenant identity; API registration and ingestion authorization read the same source of truth.
- **NEXT FALSIFICATION:** create a tenant via `/tenants`, then attempt ingestion as that tenant; any divergence between registry and ingestion behavior fails this.

### ten-principal-propagation 
### ten-principal-propagation
- **DOMAIN:** TENANCY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `req.authenticatedAgent` is attached by middleware but consumed by almost nothing (7 hits, all in routes, none in runtime/workers/evidence/replay). `/ingest` never records the agent; event→mission→worker carries only namespace and free-text `source`. Replay and evidence attest to asserted sources.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-003. The audit's recommended next step: bind the principal into event metadata at the authenticated routes. Memory `memory://md:memory/2026-09-13.md:645` (Nolan's minimum trace chain starts with WHO → ... → AUTHORIZED BY).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** every canonical event carries the authenticated principal in its metadata; evidence/replay attest to the bound principal, not the asserted `source` string.
- **NEXT FALSIFICATION:** emit via an authenticated route and read back the event metadata; absent principal fails this.

### ten-scoped-replay-evidence 
### ten-scoped-replay-evidence
- **DOMAIN:** TENANCY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Replay, projection, and evidence paths carry no tenant scoping or caller authorization. A second tenant's history and evidence would be replayable by the first tenant's credentials.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-004 (`replay_verifier.js`, `materialized_views.js` contain zero `tenant` references; `evidence_authority.js` checks namespace consistency but never requester entitlement). Latent: one tenant today.
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** replay, projection rebuilds, and evidence reads enforce the caller's tenant; cross-tenant replay is denied.
- **NEXT FALSIFICATION:** grep `replay_verifier.js` and `materialized_views.js` for `tenant`; zero hits fails this.

### ten-second-tenant-boundary 
### ten-second-tenant-boundary
- **DOMAIN:** TENANCY | **STATUS:** BLOCKED | **PRIORITY:** 1
- **WHY:** The second real tenant must not arrive on an imaginary privacy boundary. Today the boundary is a comment; onboarding tenant #2 before G4 lands would make cross-tenant reads/writes possible on day one.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXP-006 ("BLOCKED on tenant isolation being proven first: TEN-001 shows namespace isolation is unenforced, so a second tenant's SOPs would be readable/writable by any credentialed agent on day one. Do not build until the TEN-001 decision lands."); memory `memory://md:memory/2026-09-14.md:433` (single-tenant substrate with real exterior-agent authority boundaries but no tenant isolation).
- **DEPENDENCIES:** ten-agent-tenant-binding (G4 decision) — hard block.
- **ACCEPTANCE:** no second tenant is onboarded until the authority model is decided and the cross-principal bleed proof (experiment 5) fails closed.
- **NEXT FALSIFICATION:** attempt the cross-tenant emit/read; success means the boundary is still imaginary.

### ten-never-two-writers 
### ten-never-two-writers
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** Both Oracle gateways (`ping-gateway` :8080 and `ping-gateway-candidate` :8081) run the identical image `ping-gateway:candidate-3c5d280dd` with identical env against the same database. `canonical_events` is 0 rows today, so no active writes, but the never-two-writers invariant is currently violated in posture. This is Nolan's open question from the 2026-09-22 status.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("both `ping-gateway` (:8080) and `ping-gateway-candidate` (:8081) run `ping-gateway:candidate-3c5d280dd` (sha256:4aa9d7f6…), started 2026-09-21T12:03–12:05Z, restarts=0, healthy 26h+. ... Both gateways have identical env → both point at the same DB (latent two-writer concern; `canonical_events` is currently 0 rows, so no active writes)"). Recommended default in the report: accept 3c5d280dd as the new live baseline and stop :8081 after Nolan's confirm.
- **DEPENDENCIES:** dep-provenance-gap (same decision point).
- **ACCEPTANCE:** exactly one writer to the canonical database; :8081 stopped or re-scoped, and the invariant is recorded as a standing deployment rule.
- **NEXT FALSIFICATION:** list running gateway containers and their DB targets; two writers to one canonical DB fails this.

---

## DOMAIN: DATABASE/MIGRATIONS

### db-trigger-owner 
### db-trigger-owner
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** Oracle's `ping_events` is guarded by an append-only trigger that exists in no repository, names no owner, documents no exception path, and rejects the certified migration's UPDATE on every boot attempt, forever. No one can authorize a fix because no one is named. This is the G1 grill question: the single highest-consequence unanswered question in the 2026-09-19 audit.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-007 (proven by exhaustive absence across all three trees; `ping-oracle-deploy/infrastructure/oracle/schema.sql:127-170` defines `prevent_update()` triggers only for other tables) and REC-004 (no policy file, comment, or doc names an owner or defines a migration-exception procedure). Lane A's fixture record (`~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md`): triggers captured byte-verbatim via `pg_get_triggerdef`: `trg_ping_events_append_only` (BEFORE DELETE OR UPDATE ON ping_events FOR EACH ROW) and `trg_ping_events_append_only_truncate` (BEFORE TRUNCATE); function `public.ping_events_no_mutation()` raises unconditionally; NO maintenance exception path; "installed out-of-band on Oracle; preserved per standing law. The migration is the side that changes." G1 options: (a) trigger absolute, migrations must be trigger-compatible; (b) a named owner can authorize explicit exceptions; (c) policy moves into version control with an

### db-migration-nonatomic 
### db-migration-nonatomic
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** The sequence migration applied as 4 separate non-transactional statements with no version record and no reconciler; on Oracle, step 2 committed, step 3 threw on the trigger, step 4 never ran, and every boot replays the exact partial failure. Half-applied state was the normal outcome of any failure.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (no BEGIN/COMMIT, no savepoints; `migration_engine.js` versions 1-11 covers `repository_*` tables only); `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` ("Fixed by the events lane in 8e2496b14: the backfill UPDATE is removed (option B: sequence for new events only; legacy rows keep explicit unknown-ordering semantics), NOT NULL is conditional on zero NULL rows"). Gate 6's execution portion is BLOCKED (exit 3) pending Lane A's fixture result.
- **DEPENDENCIES:** db-trigger-owner (the policy side), db-migration-trigger-gate (the proof side).
- **ACCEPTANCE:** the corrected migration runs against both fixture variants (A: pre-sequence Oracle state; B: Oracle's actual half-applied state) and passes all 8 gate assertions, including "historical semantic content UNCHANGED" and "enforcement intact."
- **NEXT FALSIFICATION:** run the Lane A gate on a scratch Postgres; any violated assertion fails this.

### db-migration-trigger-gate 
### db-migration-trigger-gate
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** BLOCKED | **PRIORITY:** 1
- **WHY:** This is the pre-promotion gate that would have prevented the failed Oracle deploy: run the startup migration against a trigger-enforcing scratch fixture. The fixture exists; the execution evidence is unevaluated. A BLOCKED gate blocks promotion exactly like a FAIL.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 6: "migration/trigger | migration-trigger-gate.js | FL-20260919-ORACLE-008: startup UPDATE vs append-only trigger. Fixture execution BLOCKED until Lane A lands"); `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` (fixtures: `oracle-append-only-fixture.sql` variant A, `variant_b.sql` variant B = Oracle's actual current state: nullable sequence column + nextval default, no unique index, no NOT NULL, triggers installed; "Connection via PGHOST/PGPORT/PGUSER/PGPASSWORD env (never printed); needs a scratch Postgres"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-005/OBS-006 (smoke stops before the DB spine; "CERTIFIED 189/189" covers module membership only; the doctrine's migration/schema-compatibility field is populated by nothing).
- **DEPENDENCIES:** db-trigger-owner (policy), db-migration-nonatomic (the fix under test).
- **ACCEPTANCE:** every release candidate's startup migration block executes against the trigger-enforcing fixture and the result is recorded in the certification artifact's migration/schema-compatibility

### db-versioned-migrations 
### db-versioned-migrations
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `gateway/migration_engine.js` (versions 1-11) covers `repository_*` tables only; `repository_store_migrations` has 11 rows, all repository versions. The sequence migration lived outside the versioned system, which is why it had no version record and no reconciler.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 ("searched for any migration ledger/reconciler for the sequence migration; only idempotent DDL re-execution").
- **DEPENDENCIES:** db-migration-trigger-gate.
- **ACCEPTANCE:** every canonical-store schema change runs through a versioned, recorded migration; no schema change lives only in a boot-time `initialize()` block.
- **NEXT FALSIFICATION:** inventory every DDL/DML statement in `UnifiedEventRuntime.initialize()`; any statement without a migration version fails this.

### db-nullable-sequence 
### db-nullable-sequence
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Oracle's `ping_events` currently sits in the documented half-applied state: nullable sequence column + nextval default, no unique index, no NOT NULL, triggers installed. The state is honest and recorded, but convergence to the final schema (unique index; NOT NULL only when zero NULL rows, per the 8e2496b14 fix) has not been verified on Oracle.
- **EVIDENCE:** `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` (variant B = "Oracle's ACTUAL current state after the failed deploy"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (the stable half-applied state).
- **DEPENDENCIES:** db-migration-nonatomic, db-migration-trigger-gate.
- **ACCEPTANCE:** Oracle's `ping_events` reaches the gate-asserted post-migration schema (sequence BIGINT nullable with nextval default, sequence owned by the column, unique index present, legacy rows keep NULL) with the trigger still enforcing.
- **NEXT FALSIFICATION:** diff `information_schema` on Oracle against the gate's expected post-migration schema; any divergence fails this.

### db-silent-drop 
### db-silent-drop
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** `CanonicalEventEnvelope` silently drops events on sequence collision with a success return, in both trees. Two concurrent same-tenant emits compute the same `MAX(sequence)+1`; the loser's `INSERT ... ON CONFLICT (tenant_id, sequence) DO NOTHING` no-ops; `executeEmitEvent` returns the event object unconditionally with no rowCount check. Accepted business events (customer reviews via `review.received` for `tenant::hpp`) can vanish while the producer believes they were stored — the exact "reliable capture" failure PING promises customers it fixes.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-013 (code-proven in both trees: `canonical_event_envelope.js:100-108`, `:174-178`, `:187`; conflict target is `(tenant_id, sequence)`, not `event_id`; bonus: event_id = UUID-v5 over `tenantId:eventType:timestamp:sequence`, so timestamp in the preimage makes retries mint different IDs) and PERS-003 (second lane, same mechanism).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** concurrent same-tenant emits never lose a row silently; the INSERT rowCount is checked and a zero-row insert throws (fail-loud).
- **NEXT FALSIFICATION:** the audit's experiment 2: scratch-DB concurrency repro, two parallel `executeEmitEvent` calls, same tenant; assert both rows exist. One missing fails this.

### db-unprocessed-write-never 
### db-unprocessed-write-never
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** `ping_events.processed` is write-never but read-live: the sole `UPDATE ping_events` in the codebase is the sequence backfill, so `GET /events/unprocessed` and mission-control's `query({unprocessed:true})` return ALL events on every call, forever. A future consumer built on this cursor would reprocess the full table every poll.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-002 (column defined, indexed, queried; no writers; EventBridge marks `processed` only on `canonical_events`, never `ping_events`).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the `unprocessed` option is either wired to a real writer or deleted; no endpoint returns the whole table under an "unprocessed" label.
- **NEXT FALSIFICATION:** the audit's experiment 4: `GET /events/unprocessed?limit=5` twice; identical full-table semantics fails this.

### db-canonical-identity-bytes 
### db-canonical-identity-bytes
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** Event identity is Node-`JSON.stringify`-bound (insertion key order, no whitespace, no Unicode escaping, `1.0`→`"1"`); no non-Node producer can reproduce it byte-for-byte. Meanwhile `canonical_authority.js:7` declares "There shall be only one canonical serializer," but the UER identity path bypasses it with raw `JSON.stringify`. The harvest target is the existing canonical authority, extended to the identity path.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` RTC-001 (`event_id` = `sha256(JSON.stringify({eventType, source, namespace?, logical_id|payload}))`, worktree and Pig identical; Python uses `observation_sha256` over raw UTF-8 observation text linked only via sidecar files; the HTTP ingestion path never accepts `logical_id`, so every Python-emitted event hashes over the full payload including the Python-generated timestamp).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** canonical event-identity bytes are defined once (sorted-keys JSON, explicit float/Unicode rules); a JS implementation and a Python reference implementation produce identical sha256 on a fixture corpus. No live-hash change until proven.
- **NEXT FALSIFICATION:** the audit's experiment 6: cross-implementation fixture corpus; any digest mismatch fails this.

### db-era-cutover 
### db-era-cutover
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** The identity-era cutover re-mints every event ID (live: naked 64-hex `SHA-256(JSON.stringify(...))` camelCase insertion-order; certified: `event_<16hex>` via IdentityAuthority with RFC-8785 canonicalization and `core::system` namespace default). Same logical event gets different IDs across the cutover; `ON CONFLICT (event_id)` dedup cannot match; lineage links break; witness roots are incomparable; Qdrant projections keyed by event_id double-land. No cross-era dedup plan exists. Difficult to reverse once rows accumulate.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-011/F1 (code + era census `evidence/f7-freeze-2026-09-18/02-era-census-and-bridge.md`: 739 Era-H rows, 0 V1 rows). Grill G2 options: (a) accept double-landing with an era marker column and documented semantics; (b) define a cross-era dedup key over logical identity material before cutover; (c) defer cutover until (b) exists.
- **DEPENDENCIES:** none (root decision).
- **ACCEPTANCE:** Nolan decides G2; the chosen semantics are recorded and enforced before any cutover traffic.
- **NEXT FALSIFICATION:** the audit's experiment 3: SELECT-only era census on the canonical DB (count 64-hex vs `event_` IDs); an unmarked mixed-era journal fails this.

### db-redelivery-semantics 
### db-redelivery-semantics
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** Redelivery flips at-most-once to at-least-once (live UER early-returns on duplicate; certified UER re-runs handlers unconditionally after the duplicate re-read). Both live subscribers are idempotent today, but the semantic change is undocumented — any future non-idempotent subscriber post-cutover will double-fire with no warning.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-012/F2 (live `UER:168-172` vs certified `UER:280-294`; EventToMissionBridge idempotent via `mission_id` + ON CONFLICT DO NOTHING; EmbeddingService upserts by event_id).
- **DEPENDENCIES:** db-era-cutover (same cutover hazard list).
- **ACCEPTANCE:** the redelivery semantic is documented in the cutover hazard list; every subscriber declares its idempotency assumption.
- **NEXT FALSIFICATION:** audit the subscriber registry; any subscriber without a stated idempotency assumption fails this.

### db-projection-classification 
### db-projection-classification
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Canonical vs projection classification must be honest. Qdrant and Redis are configured but unreachable from the deployed gateway (wrong network, no published ports), so every "hybrid/semantic search" claim is PG-only keyword search wearing a hybrid label, and the "DERIVED, regenerable" projection claim is false in practice because the EmbeddingService subscription can never connect.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-001 (gateway on default `bridge` network only; `ping-qdrant:6333` TIMEOUT, `host.docker.internal:6333` socket hang up; Redis 6379 accepts TCP but never answers PING; `ping-qdrant` `(unhealthy)` observed by two lanes; ERA-R wraps embedding init in try/catch → null, so availability is preserved but the projection is silently dead).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** every projection store is classified canonical or derived with a live reachability proof; no "hybrid search" claim stands on a dead Qdrant.
- **NEXT FALSIFICATION:** connect from inside the gateway container to the configured Qdrant/Redis addresses; any failure fails this.

### db-no-direct-canonical-mutation 
### db-no-direct-canonical-mutation
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The standing law says no direct canonical mutation without authority, and the append-only trigger enforces it physically on Oracle. But the record shows two cracks: the certified migration itself was a second writer to `ping_events` (AUTH-008, contradicting C-R3's "zero UPDATEs repo-wide" premise — since fixed by removing the backfill UPDATE), and `canonical_events` is mutable with the EventBridge as an additional unnamed writer (AUTH-004).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-008 (worktree `ping-runtime/events/unified_event_runtime.js:92-99` ran `UPDATE ping_events`; N1 writer census: sole non-test INSERT is `UER.emit`, sole UPDATE the backfill, zero DELETEs) and AUTH-004 (`UPDATE canonical_events` at `canonical_event_envelope.js:308,324`; `event_bridge.js:300` an unnamed second mutator).
- **DEPENDENCIES:** db-trigger-owner.
- **ACCEPTANCE:** the writer census is re-run per release (sole INSERT `UER.emit`, zero UPDATE/DELETE on `ping_events` outside the trigger-compatible migration); every `canonical_events` mutator is named in the authority record.
- **NEXT FALSIFICATION:** re-run the writer census; any unnamed writer fails this.

---

## DOMAIN: RELEASE/CERTIFICATION

### rel-one-sequence 
### rel-one-sequence
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** Nolan's doctrine (2026-09-19): "A release is not the set of files changed since the previous release. A release is a complete, certified closure of the runtime represented by a specific source revision." There is exactly one release-certification sequence; gates are not added, reordered, or skipped per-deploy. Timestamp is provenance only, never release identity. The doctrine exists and is machine-executable; enforcement is what needs proving.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 0-7 pre-promotion via `release-certify.js` against the exact distribution snapshot; gates 8-17 deployment phase; "Any FAIL blocks promotion. Any BLOCKED blocks promotion pending the named dependency").
- **DEPENDENCIES:** none (root doctrine).
- **ACCEPTANCE:** every promotion runs the full sequence in fixed order with no skipped gates; the two artifacts (pre-promotion + deployment phase, same schema) exist per release.
- **NEXT FALSIFICATION:** promote any candidate with a skipped gate; the promotion record itself fails this.

### rel-smoke-vs-db 
### rel-smoke-vs-db
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** The smoke test certifies module composition, not gateway boot. Its declared safe boundary ("composition wired; no listen(), no DB connect") structurally excludes every Postgres-gated path, including the startup migration that killed the deploy. This is the exact mechanism by which a broken image earned SMOKE PASS yet could never reach READY. SMOKE != DB compatibility.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-005 (`tools/distribution/gateway-smoke.js` header; `tools/distribution/README.md:44-56`; the skipped spine `gateway/bootstrap/composition/core_event_spine.js:31-70` includes `UnifiedEventRuntime.initialize()`, which runs the migration; "checked whether the smoke or any gate executes the migration SQL against a trigger-enforcing fixture; no such fixture or step exists").
- **DEPENDENCIES:** db-migration-trigger-gate (the fixture that closes this).
- **ACCEPTANCE:** a pre-promotion step runs the UER `initialize()` migration block against a scratch Postgres carrying Oracle's append-only trigger definition, and records PASS/FAIL.
- **NEXT FALSIFICATION:** run the current smoke against a fixture image carrying the old backfill UPDATE; SMOKE PASS fails this.

### rel-certified-vs-deployable 
### rel-certified-vs-deployable
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** "CERTIFIED 189/189" covers module membership only: the closure certifier is a static require/import membership checker whose failure modes are `REQUIRED_NOT_DISTRIBUTED`, `RUNTIME_DEPENDS_ON_NONDISTRIBUTED`, `UNKNOWN_CLASSIFICATION`. It never opens a DB connection, and the doctrine's "migration/schema compatibility" field is populated by nothing. CERTIFIED module membership != deployability. The premature 84486f056 certification (14 open gaps, declared ORACLE_RUNTIME_PROVEN anyway) is the epistemic twin of this defect.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-006 (report shape `:283-296` has no migration/schema/trigger/environment/DB-policy field; "no release-certification artifact was ever assembled for the deploy; 'CERTIFIED' and 'SMOKE PASS' exist only as stdout"); `~/workspace/FAILURE_LEDGER.md` lines 1205-1216 (FL-20260920-023: premature certification, 14 gaps enumerated, document corrected in place to PREMATURE/SUPERSEDED, "Do not delete this entry or the corrected document").
- **DEPENDENCIES:** db-migration-trigger-gate (populates the missing field), rel-one-sequence.
- **ACCEPTANCE:** no "CERTIFIED" claim is made without the migration/schema-compatibility field populated by the fixture gate; certification artifacts exist as files, not stdout.
- **NEXT FALSIFICATION:** inspect any certification artifact for the migration-

### rel-immutable-identity 
### rel-immutable-identity
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Every release needs a new immutable identity; a certified candidate image is never mutated or reused for another build. This is what makes rollback anchors trustworthy.
- **EVIDENCE:** memory `memory://md:memory/2026-09-21.md:1392` (Nolan: "Oracle is a PROVEN environment. Every future Oracle mutation needs a reason... the proven baseline stays frozen, candidate-84486f056 is not reused for another build, the image is not mutated, and future releases get new immutable identities"); `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("ping-gateway:candidate-84486f056: the accepted proven baseline image. Explicit do-not-touch"; "The 84486f056 image is preserved in docker (rollback intact)"; `oracle-gateway:rollback-20260919`, `:certified-20260919` retained per deliberate retention policy).
- **DEPENDENCIES:** none (standing law).
- **ACCEPTANCE:** every release carries a new immutable image identity; no tag is ever re-pointed to different bytes; protected images remain untouched.
- **NEXT FALSIFICATION:** `docker images --digests`; any reused tag with changed digest fails this.

### rel-rollback-before-swap 
### rel-rollback-before-swap
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The rollback image must be retagged and verified healthy BEFORE the candidate swap — rollback is proven before it is needed, not after. The digest is recorded in the pre-promotion artifact's deployment phase before the swap.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 17; "The rollback image digest is recorded in the pre-promotion artifact's deploymentPhase BEFORE the swap (gate 17 ordering)"); `~/workspace/FAILURE_LEDGER.md` lines 427-428 (FL-20260919-ORACLE-006: rollback via `sudo docker tag oracle-gateway:certified-20260919 oracle-gateway:latest`, verified image 8400deecf2a9 running healthy, /health 200, pre-deploy event intact).
- **DEPENDENCIES:** rel-one-sequence.
- **ACCEPTANCE:** every promotion records the rollback digest before the swap and proves the rollback image healthy first.
- **NEXT FALSIFICATION:** inspect any promotion record; swap preceding rollback proof fails this.

### rel-artifact-lifecycle 
### rel-artifact-lifecycle
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Two artifacts (pre-promotion + deployment phase), same schema, referencing each other by manifest digest. Both immutable once written; a correction is a new artifact, never an edit. This is what stopped the premature-certification failure mode from being silently papered over.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` ("release-certify.js emits release-certification.json (schema v1: release-artifact.schema.json)... Both artifacts are immutable once written; a correction is a new artifact, never an edit"); schema at `~/workspace/laneC/release-artifact.schema.json`; precedent: FL-20260920-023's document was corrected in place with a strikethrough header and preserved, not deleted.
- **DEPENDENCIES:** rel-one-sequence.
- **ACCEPTANCE:** schema v1 exists and both artifacts are emitted per release; no certification document is ever edited after issue.
- **NEXT FALSIFICATION:** diff any two versions of a certification document; an in-place edit fails this.

### rel-canonical-spine 
### rel-canonical-spine
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** Deployment gates 11-16 are the certification target Nolan authorized for ping-core-01: request → authenticated identity → canonical event → durable PostgreSQL → mission → scheduler → worker → result/evidence → canonical event → RESTART → same event/mission/evidence recoverable → processing resumes. The P1 side-port battery proved this for 3c5d280dd on :8081, but the live :8080 promotion that followed has no such record.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 11-16); `~/workspace/FAILURE_LEDGER.md` lines ~1830+ (FL-20260921-P1: candidate `ping-gateway:candidate-3c5d280dd` `sha256:4aa9d7f6...` passed the full P1 battery on 127.0.0.1:8081: /health 200, identity reads 200, valid signed event 200, invalid signature 400 INVALID_SIGNATURE, BFF knowledge envelope 200, projection digest deterministic across two governed rebuilds; "Caveats: three clearly-labeled synthetic P1-proof journal events plus projections now exist on the live DB"); memory `memory://md:memory/2026-09-21.md:1392` (actual-evidence certification: "SOURCE GREEN IS NOT DISTRIBUTION GREEN IS NOT RUNTIME GREEN IS NOT RESTART GREEN").
- **DEPENDENCIES:** dep-provenance-gap (the unrecorded promotion).
- **ACCEPTANCE:** gates 11-16 are proven and recorded for whatever image is live on :8080, on the live database, not only on a side port.
- **NEXT FALSIFICATION:** re-run the P1 battery

### cap-one-authority 
### cap-one-authority
- **DOMAIN:** CAPABILITIES | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Nolan's constitutional rule: anything whose disagreement could cause PING to make the wrong decision must have one provable authority. The Capability registry is one of the twelve named areas. There must never be a CapabilityAuthority #2.
- **EVIDENCE:** memory `memory://md:memory/2026-09-13.md:645` (constitutional authority rule; twelve areas: Identity, Namespace, Canonical bytes, Hash, Event creation, Event schema, Evidence, Verification/promotion, Capability registry, Authorization, Execution/run state, Canonical state/projection semantics; the minimum trace chain: WHO → WHAT → NAMESPACE → CAPABILITY → AUTHORIZED BY → RUN → CANONICAL RESULT → EVIDENCE → PROMOTED BY); memory `memory://md:memory/2026-09-16.md:1068` ("a real fail-closed implementation is live/preserved, though absent from the current branch tree"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` NEGATIVE FINDINGS ("Event governance, capability authority, orchestration writes all fail closed (audited, sound)").
- **DEPENDENCIES:** none (constitutional).
- **ACCEPTANCE:** exactly one capability authority exists; any new capability check routes through it; the WHO→…→PROMOTED BY chain is attestable.
- **NEXT FALSIFICATION:** census all capability-check call sites; any check that bypasses the single authority fails this.

### cap-harvest-inventory 
### cap-harvest-inventory
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** The task brief requires harvesting existing PING capability machinery (actor, resource/object, action, constraints, expiration, delegation, provider capability, owner capability, approval requirement, deny semantics, audit evidence) — not building a second authority. The machinery exists across the Pig-era hardening artifacts and the certified worktree.
- **EVIDENCE:** `~/workspace/gateway-hardening/orig-capability_registry.js` (312 lines) + `~/workspace/gateway-hardening/orig-exterior_auth_middleware.js` (251 lines) + `new-engine.js` wiring `CapabilityRegistry` into the execution engine (2026-09-13 phase4-eventauth8 Pig hardening); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-003 (certified worktree closes the forgeable `_skipGovernance` bypass: UER requires the capability object, `UER:160-166`); audit NEGATIVE FINDINGS (capability authority fail-closed, audited sound); memory `memory://md:memory/2026-09-19.md:1104` (provider-specific actions behind separate capabilities, e.g. Follow/Like as PING-native semantics with counters as rebuildable projections).
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** a single inventory document maps the existing machinery to the brief's checklist (actor, resource/object, action, constraints, expiration, delegation, provider/owner capability, approval requirement, deny semantics, audit evidence) with file:line citat

### cap-delegation-model 
### cap-delegation-model
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** The semantics around the authority need harvesting too: deny semantics (event_governance fails closed — audited), approval requirement (the approval→KnowledgePromoter→ranking path is wired but has received zero approvals: LOOP-002), owner capability (tenant owner as default human decision authority, CG-001, already recorded), provider capability (the provider-binding decision that unlocks EXP-001/002/003/004/007 sits with no named decider), expiration (credentials never expire — SEC-007).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` (LOOP-002: "All 68 knowledge nodes remain `candidate`"; expansion section: "the provider-binding decision that would unlock five expansion opportunities sits with no named decider"; "empirically investigable first, then a genuine decision"; P5 cross-domain pattern: "Enforcement without owners").
- **DEPENDENCIES:** cap-harvest-inventory.
- **ACCEPTANCE:** deny, approval, owner, provider, expiration, and delegation semantics are each documented as implemented / missing / decision-needed, with the provider-binding decision empirically investigated before it is asked.
- **NEXT FALSIFICATION:** the audit's experiment 10 (Quo vs Twilio/SMTP capability investigation); asking for the decision before the evidence fails this.

### cap-viewer-can 
### cap-viewer-can
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** FYD Social's authorization shape is already decided: components use `can(viewer, ...)` — never `if(demoMode)`. DEMO OWNER MODE produces the same ViewerContext/capability shape as real auth. This is the capability pattern the product harvests from the platform.
- **EVIDENCE:** memory `memory://md:memory/2026-09-21.md:1404` (Website Builder Authority Decisions 2026-09-21: "Owner: explicit DEMO OWNER MODE marked DEMO_AUTH NOT_PRODUCTION_AUTH producing the same ViewerContext/capability shape as real auth; components use can(viewer, ...) never if(demoMode)").
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** every FYD component authorizes through `can(viewer, ...)`; no demo-mode conditional exists anywhere in a component.
- **NEXT FALSIFICATION:** grep FYD components for `demoMode` conditionals; any hit fails this.

### cap-eventbridge-bypass-closed 
### cap-eventbridge-bypass-closed
- **DOMAIN:** CAPABILITIES | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** EventBridge is a live, armed governance bypass in the running era: it re-emits `canonical_events` rows into UER with `_skipGovernance: true` and no namespace, so `tenant::hpp` rows land in `ping_events` as `core::system`, skipping event_registry validation and tenant namespace enforcement. The certified worktree closes the forgeable bypass (requires the capability object). The running system still has it.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-003 (live `gateway/bootstrap/gateway_runtime.js:542-550` instantiates EventBridge unconditionally, 5s poll; `ping-runtime/events/event_bridge.js:278-294`; certified worktree `UER:160-166` requires the capability object, ignoring bare `_skipGovernance`; era census: zero bridged rows as of the 2026-09-18 freeze — armed but idle).
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** the bypass is closed on every running gateway (capability object required), or the bridge is removed; the firing check is recorded.
- **NEXT FALSIFICATION:** the audit's experiment 9: SELECT-only count of `ping_events` rows with `source='canonical_events'` since the 09-18 freeze; any row proves the armed bypass has fired.

---

## DOMAIN: ORACLE / DEPLOYMENT

### dep-provenance-gap 
### dep-provenance-gap
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** On 2026-09-21 ~12:05 UTC the live gateway moved from the accepted baseline image (candidate-84486f056) to candidate-3c5d280dd with no promotion record, and a second identical candidate container was left running on :8081 against the same database. The deployment registry in Postgres is empty (0 rows). The build/test provenance of 3c5d280dd exists (FL-20260921-P1: fix commit `3c5d280dd3735ceb2deb4433384902d07552d372` added the additive `tsc` step; P1 battery passed on :8081), but the promotion to :8080 is undocumented. Record honestly, reconcile single-writer.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (baseline vs live reality section; open question quoted verbatim); `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 (candidate build/test provenance); memory `memory://md:memory/2026-09-21.md:1392` (provenance manifest mandatory; Oracle ladder extended through BUSINESS_PATH_PROVEN).
- **DEPENDENCIES:** ten-never-two-writers (same Nolan decision).
- **ACCEPTANCE:** Nolan decides: 3c5d280dd accepted as the new live baseline (provenance record updated) or not; :8081 stopped to restore single-writer; the decision and its evidence are recorded in the deployment registry (which is currently empty and must start being written).
- **NEXT FALSIFICATION:** query `deployment_registry`; still 0 rows after the decision fails this.

### dep-capacity 
### dep-capacity
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** Disk was the recurring critical resource (80% on 2026-09-22, 83% on 09-20, and the 09-19 Pig C: crisis). The 2026-09-22 reclamation (80% → 56%, ~11 GB) bought headroom, but several items were deliberately left for later calls.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (reclamation table: /tmp image tarballs ~1.73 GB, journal vacuum ~3.2 GB, btmp 437 MB, builder prune 2.42 GB, dangling images 443 MB, postgres:15-alpine 408 MB, oci-cli 1.33 GB; deliberately NOT touched: ollama/ollama:latest 6.99 GB — gateway code requires `OllamaProvider` as default AI provider and `OLLAMA_BASE_URL=http://host.docker.internal:11434` is set, below the confidence bar for removal; candidate-84486f056 do-not-touch; superseded gateway images ~8 GB — rebuildability unverified, flagged for a later call; `/opt/ping/releases` 2.7 G + snapshot tar 1.1 G legitimate backups; `p18-oracle-staging` 218 M Sep-19 leftover).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the flagged follow-ups each get a decision: ollama retention (prove the runtime dependency or remove), the ~8 GB superseded images (verify rebuildability, then prune), `p18-oracle-staging` (remove or justify).
- **NEXT FALSIFICATION:** disk crosses 80% again with no standing reclamation runbook; that fails this.

### dep-runtime-distribution-v1 
### dep-runtime-distribution-v1
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** The Runtime Distribution v1 milestone is gated by its own sequencing: no Git repos on Oracle, no `runtime-manifest.json`. The 2026-09-22 keep-off inventory (read-only) confirmed compliance; no stripping was performed, correctly per the hard gate.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("Keep-off inventory (read-only) completed: no git repos on Oracle; source trees total ~10M; audit artifacts in /opt/ping/releases (2.7G); p18-oracle-staging (218M, Sep-19 leftover); no runtime-manifest.json exists yet. Milestone remains GATED per its own sequencing").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the milestone's sequencing completes (forensics → reachability/persistence/closure verification) and `runtime-manifest.json` exists, or the gate stays explicitly recorded as GATED.
- **NEXT FALSIFICATION:** a git repo appears on Oracle, or stripping is performed before the gate clears; either fails this.

### dep-side-by-side 
### dep-side-by-side
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Side-by-side, minimum-change deployment is the proven discipline: the 3c5d280dd candidate was built and battery-tested on the side port (127.0.0.1:8081) with the live :8080 gateway untouched and protected images untouched. This is the procedure to keep.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 ("On Oracle at 127.0.0.1:8081... Live 8080 gateway untouched (/health 200 after the run). Protected images (oracle-gateway:certified-20260919, :latest, :rollback-20260919, 8400deecf2a9) untouched"; "Blast radius: none").
- **DEPENDENCIES:** rel-one-sequence (gates 8-17 are this procedure formalized).
- **ACCEPTANCE:** every candidate is proven on a side port with the live gateway and protected images untouched before any swap is considered.
- **NEXT FALSIFICATION:** any candidate swap without a prior side-port battery; that fails this.

### dep-docker-config-persistence 
### dep-docker-config-persistence
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The Pig Docker credential-manager defect was worked around with an isolated Docker config at `/tmp/docker-isolated/config.json` (empty `{}`, anonymous public pulls) — and Nolan ordered that mechanism preserved. But `/tmp` is wiped without warning in this environment. A release-path mechanism that lives in `/tmp` is one wipe away from rediscovery.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1122-1126, 1142 (FL-20260920-014 UPDATE: "Created isolated Docker config at /tmp/docker-isolated/config.json with empty {} (no credential helpers)... Workaround is sustainable: isolated config for public pulls"); memory `memory://md:memory/2026-09-21.md:1392` ("Nolan ordered preserving that mechanism and encoding the smallest sustainable release path"); `~/AGENTS.md` ("/tmp is wiped without warning (2026-09-22)... Irreplaceable work must live under ~/workspace/, never /tmp").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the isolated Docker config lives at a persistent path (e.g. under `~/workspace/`), is documented as part of the release path, and a rebuild works from that path alone.
- **NEXT FALSIFICATION:** wipe `/tmp` (or simulate) and attempt the release-path pull; failure fails this.

### dep-unidentified-stop 
### dep-unidentified-stop
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** On 2026-09-20T01:03:15Z, ping-gateway AND ping-postgres simultaneously stopped and detached from `oracle_ping_internal` by an unknown actor (docker events showed ephemeral containers + kill/stop API sequence; no compose/cron/SSH source found; possibly a delayed effect of an earlier killed compose call — unproven). An unexplained dual-container stop is a standing P0-class mystery on the production host.
- **EVIDENCE:** memory `memory://md:memory/2026-09-19.md:1620` ("UNIDENTIFIED STOP INCIDENT 2026-09-20T01:03:15Z... Recovered."); `~/workspace/FAILURE_LEDGER.md` lines 439-440 (FL-20260919-ORACLE-006/007 rules: "treat any future unexplained dual-container stop as P0 and check `docker events` immediately").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the actor is identified, or continuous `docker events` capture is in place so the next occurrence is attributable.
- **NEXT FALSIFICATION:** another unexplained dual-container stop with no captured actor fails this.

---

## SOURCES REVIEWED
1. `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (full)
2. `~/workspace/ORACLE_CRITICAL_PATH_2026-09-20.md` (full)
3. `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` (full, 322 lines)
4. `~/workspace/health-truth-audit-2026-09-20.md` (full)
5. `~/workspace/FAILURE_LEDGER.md` (targeted: FL-20260919-ORACLE-003/004/005/006, FL-20260919-AUDIT-001, FL-20260919-P08-LANE3-001,

1. **FL-20260920-022 status.** 
1. **FL-20260920-022 status.** The ledger (lines 1196, 1755-1799) + `MEMORY.md#L162` + `memory/2026-09-21.md#L1392` record a full-incident rotation on 2026-09-21 with proofs (old credential rejected over the real network path, four historical credentials dead, exposure sweep clean). But `memory/2026-09-20.md#L1020` claims the password allegation was unsupported, treats "the entry and rotation request as unverified and requiring correction," and states "No rotation was performed." Timeline: the correction note is dated 09-20, the rotation 09-21 — so the correction may have been superseded by the full incident response (the rotation record itself "corrects the incident's assumption" about which value was live). The two records were never reconciled in one place. **Recommendation:** append a reconciliation note to FL-20260920-022 citing both, so the next reader does not re-litigate it.

2. **3c5d280dd provenance.** 
2. **3c5d280dd provenance.** The 2026-09-22 Oracle status says "no record in my context of the 3c5d280dd promotion" — but `FL-20260921-P1` documents the candidate's build provenance (commit `3c5d280dd3735ceb2deb4433384902d07552d372`, P1 battery on :8081). What is undocumented is the *promotion to :8080*, not the build. The item dep-provenance-gap is scoped accordingly.

3. **Era qualification.** 
3. **Era qualification.** The big audit's security/tenancy findings describe the Pig-era gateway; the convergence worktree and the now-live 3c5d280dd image may differ. Per the audit's own era discipline and Nolan's evidence-precedence rule (live DB reality > current branch source > old audit docs), every OPEN security/tenancy item's NEXT FALSIFICATION re-probes the live surface rather than trusting the 09-19 record.


======================================================================
social-circle-node.md

ITEMS FOUND: 55

**SOC-01 — circle-product-grammar-core-loop** 
**SOC-01 — circle-product-grammar-core-loop** | PROVE | P1
WHY: Product grammar is settled law (improved website center, real graph-derived Circles in margins, Circle -> rich Node); core-loop proof not yet browser-verified. Architecture/test progress does not count as product success.
EVIDENCE: memory/2026-09-22.md 2026-09-22 05:25 MDT — Nolan rejected margin-object proof as mechanism-only; 06:37 MDT — proof bar corrected to browser-visible change at exact head.
DEPENDENCIES: SOC-02, SOC-04, SOC-05, SOC-06.
ACCEPTANCE: PASS/FAIL tenant-by-tenant matrix (Happy Place, Coppersmith) with browser-visible Circle -> Node on exact head.
NEXT FALSIFICATION: Load /sites/<tenant> at 1920 and 390 widths; no true Circle in margins -> stays open.

**SOC-02 — true-circle-wiring-not-objectcircle** 
**SOC-02 — true-circle-wiring-not-objectcircle** | IN_PROGRESS | P1
WHY: True circular primitive FydCircle exists (literal circle, collapsed/peek/expanded/Ask states, border-radius:50%, no rectangles) but wired margin path used rectangular ObjectCircle. Six-phase correction build dispatched 2026-09-22 05:30 MDT.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory + six-phase dispatch note. Phase 3 (margin composition, mobile sheet, Node routes) unlanded as of 06:37 MDT.
DEPENDENCIES: SOC-04 (projection loaders).
ACCEPTANCE: /sites/* and /build/* render FydCircle with zero rectangular card/modal markup at any state.
NEXT FALSIFICATION: Grep rendered DOM for object-circle/card classes on /sites/happy-place.

**SOC-03 — circle-progressive-disclosure-states** 
**SOC-03 — circle-progressive-disclosure-states** | OPEN | P1
WHY: Three settled disclosure states must hold everywhere: STATE 1 tiny inline reference (logo/name/category/one line) -> STATE 2 Circle expanded preview (image, name, category, location, top services, View/Ask/Contact) via hover/focus/tap -> STATE 3 full Node via click, visually the business's, no PING marketing chrome. Animation physical and fast, reduced-motion honored, keyboard accessible, never hover-only.
EVIDENCE: memory/2026-09-21.md#L1050; portal-circle-spec.md §2.5 state machine REST->NEAR->AWARE->ENGAGED(->IMMERSIVE), ASK overlay; §4 reduced-motion rule.
DEPENDENCIES: SOC-04, SOC-06.
ACCEPTANCE: Keyboard-only user reaches STATE 3 from STATE 1; prefers-reduced-motion build still functional.
NEXT FALSIFICATION: Tab-navigate to a Circle with reduced-motion emulation; focus trapped or STATE 2 never opens -> fails.

**SOC-04 — per-object-projection-loaders** 
**SOC-04 — per-object-projection-loaders** | IN_PROGRESS | P1
WHY: Object loaders are slug-keyed and owner-business-only; related object IDs 404 at /o/<objectId>. Every Circle must resolve to an actual object.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory: "object loaders are slug-keyed and owner-business-only, so related object IDs 404."
DEPENDENCIES: ObjectGraph projection layer.
ACCEPTANCE: Each related Circle's objectId resolves via a generic loader (no slug, no owner assumption) with honest 404 for unknown objects.
NEXT FALSIFICATION: Navigate to /o/<related-object-id> from live graph; any 404 on a graph-present object fails.

**SOC-05 — related-circle-selection-deterministic** 
**SOC-05 — related-circle-selection-deterministic** | IN_PROGRESS | P1
WHY: Related Circles must come from actual graph relationships, ranked deterministically, omitted when evidence is insufficient — no fabricated visual density.
EVIDENCE: memory/2026-09-22.md 05:30 MDT: Happy Place live graph has exactly 2 honest related-Circle candidates (business located_at location, business provides service); Coppersmith has 3 (located_at, works_for person, person links_to external identity).
DEPENDENCIES: SOC-04; object-ranker.
ACCEPTANCE: Related-Circle count equals live graph relationship count per tenant (2 / 3), zero fabricated slots.
NEXT FALSIFICATION: Count rendered related Circles against graph edge count; mismatch fails.

**SOC-06 — circle-node-ask-fixes** 
**SOC-06 — circle-node-ask-fixes** | OPEN | P1
WHY: FydCircle drops the view capability and has no Node-link prop; its Ask request incorrectly uses the projection object ID as siteId, invalid for related objects.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory, "Current blockers confirmed".
DEPENDENCIES: SOC-04.
ACCEPTANCE: Clicking a related Circle's View opens its Node; Ask request carries the correct scope id.
NEXT FALSIFICATION: Click View on a related Circle; wrong object or Ask siteId error -> fails.

**SOC-07 — mobile-circle-tray-sheet** 
**SOC-07 — mobile-circle-tray-sheet** | IN_PROGRESS | P1
WHY: Mobile must retain the graph through a floating primary Circle plus related-object tray/sheet. Previously browser-proven: floating-button object sheet opens on tap, closes cleanly with Escape, >=44px trigger, focus returns to trigger.
EVIDENCE: memory/2026-09-22.md#L77 (object-in-margin milestone browser-proven both tenants); memory/2026-09-22.md#L356 (Nolan's required behavior); portal-circle-spec.md §7.
DEPENDENCIES: SOC-04, SOC-05.
ACCEPTANCE: Five-width browser certification includes a mobile width with tray/sheet fully operable.
NEXT FALSIFICATION: 390px viewport: no floating Circle + tray, or Escape does not close sheet -> fails.

**SOC-08 — mobile-hold-drag-follow-like** 
**SOC-08 — mobile-hold-drag-follow-like** | DEFERRED | P3
WHY: Nolan floated hold-and-drag for mobile follow/like but explicitly deprioritized in favor of desktop MVP now.
EVIDENCE: memory/2026-09-21.md#L1050 (preference|low: "FOCUS ON DESKTOP SO I CAN SEE A WORKING FRONTEND MVP NOW").
DEPENDENCIES: Capability runtime, SOC-07.
ACCEPTANCE: Deferred until desktop loop proven; no build work.
NEXT FALSIFICATION: If anyone builds this before SOC-01 proves, the freeze order is violated.

**SOC-09 — capability-runtime-gating** 
**SOC-09 — capability-runtime-gating** | DONE_VERIFIED | P1
WHY: Follow/Like/Ask/Web capability-gated only; executors return last server-confirmed state on failure. Pure planner (viewer, target, grants) -> PlannedAction[] prevents dead buttons.
EVIDENCE: harvest-social-ads.md (src/fyd/capabilities/runtime.ts, CapabilityKind follow|like|ask|website); FYD_EXECUTABLE_HARVEST.md (action-planner src/lib/ping/action-planner.ts, 14/14 lane-a tests, 2026-09-21).
DEPENDENCIES: SOC-11 (grants authority).
ACCEPTANCE: Unplannable actions never render (lane-a tests).
NEXT FALSIFICATION: Render Circle as unsigned-out viewer; Follow/Reply enabled -> planner gate broken.

**SOC-10 — circle-action-mapping** 
**SOC-10 — circle-action-mapping** | DONE_VERIFIED | P2
WHY: CapabilityPlan -> CircleUiAction[] pure; unplanned/unknown action kinds skipped fail-closed, never rendered dead.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (src/fyd/ask/circle-actions.ts, 36/36 ask-fyd tests, 2026-09-21).
DEPENDENCIES: SOC-09.
ACCEPTANCE: Test suite continues green (36/36).
NEXT FALSIFICATION: Add unknown action kind to plan fixture; dead button rendered -> mapping broken.

**SOC-11 — grant-authority-attenuation** 
**SOC-11 — grant-authority-attenuation** | DONE_VERIFIED | P1
WHY: grantsForViewer: everyone gets object.reference; controllers of site-capable schemas get maintain_site; agents NEVER receive publish/message/purchase/advertise/provider/mutate. ATProto-shaped attenuation (a grant never implies another).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (src/lib/ping/grants.ts, 14/14 lane-a tests); harvest-social-ads.md (agents denied ad.buy).
DEPENDENCIES: identity resolution.
ACCEPTANCE: Agent context builder strips forbidden grants (36/36 ask-fyd).
NEXT FALSIFICATION: Inspect AskFydContext given to an agent; any forbidden grant -> boundary leaks.

**SOC-12 — social-actions-journal-events** 
**SOC-12 — social-actions-journal-events** | DONE_VERIFIED | P1
WHY: Follow/unfollow are journal RELATIONSHIP_CREATED events {subject, predicate, object, status}; revocation is status:'inactive' on same predicate; no unfollows/unlikes predicate. Deterministic content-hash action IDs.
EVIDENCE: harvest-social-ads.md (src/fyd/social/actions.ts, transition-id.ts SHA-256 over canonical bytes + generator version); social-backend-plan.md §1.3.
DEPENDENCIES: gateway seam for persistence.
ACCEPTANCE: A-follows-B round-trips journal -> projection -> net-follows read.
NEXT FALSIFICATION: Re-post identical follow; duplicate event id -> identity hashing broken.

**SOC-13 — signed-envelope-trust-root** 
**SOC-13 — signed-envelope-trust-root** | DONE_VERIFIED | P1
WHY: bff-envelope@1 (Ed25519 over sorted-key canonical bytes of {type, payload, metadata}, proof {algorithm, signature, publicKey PEM SPKI}); module pins single serializer sha256-canonical-json-v1; signSitePatchDraft throws unless payload_hash === proposal.digest. Private keys never leave server (0600, outside tree).
EVIDENCE: harvest-social-ads.md (src/fyd/social/envelope.ts); FYD_EXECUTABLE_HARVEST.md (src/fyd/ask/envelope.ts, 36/36 tests; canonicalization duality A2 resolved on FYD side).
DEPENDENCIES: none.
ACCEPTANCE: Tampered payload fails verification; hash mismatch throws before signing.
NEXT FALSIFICATION: Sign draft, flip one payload byte, verify; passes -> trust root void.

**SOC-14 — attestation-gate-no-success-without-proof** 
**SOC-14 — attestation-gate-no-success-without-proof** | PROVE | P1
WHY: Attestation gates must reject with named missing evidence; success never reported without journal proof. Makes follow/like/campaign writes honest.
EVIDENCE: harvest-social-ads.md (src/fyd/social/attestation-gate.ts — ATTESTATION_REJECTED with missing evidence named).
DEPENDENCIES: gateway seam.
ACCEPTANCE: Write failing journal acceptance surfaces ATTESTATION_REJECTED, not fake success.
NEXT FALSIFICATION: Point action layer at dead gateway, complete a like; UI reports success -> gate broken.

**SOC-15 — deterministic-feed-ranking** 
**SOC-15 — deterministic-feed-ranking** | DONE_VERIFIED | P2
WHY: Two deterministic rankers, non-surveillance: feed-rank.ts (kindWeight + recencyScore + actorProximity, nowIso injected, total order) and object-ranker.ts (proximity .35 + followed .25 + capability .1 + recency .15 + stability .15, lexicographic tiebreak, no behavioral dossier).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (feed-rank 14/14 lane-a tests); harvest-social-ads.md (object-ranker).
DEPENDENCIES: none.
ACCEPTANCE: Same inputs -> same order across runs (total order, pinned nowIso in tests).
NEXT FALSIFICATION: Run ranking twice over identical inputs with different insertion order; drift -> fails.

**SOC-16 — attention-controller-frequency-caps** 
**SOC-16 — attention-controller-frequency-caps** | PROVE | P2
WHY: At most 1 PRIMARY ACTIVE + 1 SECONDARY AWARE object; hysteresis (entry/exit thresholds, minimum residency, interaction lock, cooldown). Anti-Times-Square for margins.
EVIDENCE: harvest-social-ads.md (src/fyd/attention/controller.ts: minResidencyMs 1200, cooldownMs 800, interaction lock); portal-circle-spec.md §2.4.
DEPENDENCIES: SOC-05.
ACCEPTANCE: Scrolling never produces musical-chairs; completed actions (FOLLOWING/LIKED) recede in prominence.
NEXT FALSIFICATION: Rapid scroll past three Circles; >1 primary + 1 secondary active or residency <1200ms -> broken.

**SOC-17 — discovery-feed-surface** 
**SOC-17 — discovery-feed-surface** | OPEN | P2
WHY: DiscoveryFeedItem kinds (object_activity, relationship_change, new_public_object, website_content) with actorProximity and evidenceRef exist as types; discovery surface on generated sites not yet wired.
EVIDENCE: harvest-social-ads.md (src/lib/ping/types.ts:238-250).
DEPENDENCIES: SOC-15; semantic search (SOC-19, BLOCKED).
ACCEPTANCE: Discovery surface renders all four kinds with evidence refs.
NEXT FALSIFICATION: Any item without evidenceRef -> evidence contract violated.

**SOC-18 — profile-fallback** 
**SOC-18 — profile-fallback** | OPEN | P2
WHY: ping.social.profile@1 exists in gateway (create/update/read, handle validation, 280-char bio, controller-scoped updates) but no FYD-facing Profile surface/fallback described. Circle -> Node must degrade to sane Profile fallback when full Node cannot render.
EVIDENCE: social-backend-plan.md §1.2 (profile schema + ingest path PROVEN); no FYD profile surface in any harvest.
DEPENDENCIES: SOC-04.
ACCEPTANCE: Defined fallback: every identity-backed object resolves to at least a Profile projection.
NEXT FALSIFICATION: Minimal object (no media, no services); Circle opens to nothing -> fallback missing.

**SOC-19 — semantic-search-bff-endpoint** 
**SOC-19 — semantic-search-bff-endpoint** | BLOCKED | P2
WHY: Embeddings (Ollama nomic-embed-text -> Qdrant 768-d cosine) and retrieval service (sole Qdrant owner) work PING-side only; BFF exposes no search endpoint, so FYD discovery cannot do semantic search. Blocked on gateway/BFF seam, not FYD.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md G3 (genuine gap; ping-object-reader.ts has no search endpoint).
DEPENDENCIES: PING gateway seam; NOT a FYD-side rebuild (FYD must never own Qdrant).
ACCEPTANCE: BFF search endpoint over the retrieval service; FYD calls it, never Qdrant directly.
NEXT FALSIFICATION: FYD code constructs own Qdrant client -> authority boundary violated.

**SOC-20 — portable-previews-og-frames** 
**SOC-20 — portable-previews-og-frames** | HARVEST | P2
WHY: Every generated page emits OG tags (embed foundation); Frames pattern (signed action callbacks over OG tags) is take-pattern for agent-actionable embeds. Preview modes A (snapshot default) / B (sandboxed interactive) / C (FYD native projection, the moat) specced with deterministic focal-region resolution and provenance on every preview record.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (OG TAKE-PATTERN; Frames TAKE-PATTERN); portal-circle-spec.md §3.
DEPENDENCIES: media architecture (MEDIA-01).
ACCEPTANCE: External link preview of a Node/Circle resolves to real OG snapshot with provenance.
NEXT FALSIFICATION: Share Node URL externally; scaled whole-desktop screenshot (forbidden) or fabricated content -> preview contract broken.

**SOC-21 — embed-loader-snippet** 
**SOC-21 — embed-loader-snippet** | DONE_VERIFIED | P2
WHY: One-snippet embed boundary: public/fyd-circle-loader.js (FydCircle.mount with objectId + apiBase); Follow + circle API routes exist.
EVIDENCE: memory/2026-09-21.md#L1083 (verified extraction, 11:23 MDT correction).
DEPENDENCIES: SOC-04.
ACCEPTANCE: Mounting snippet on third-party page renders working Circle (follow + ask entry).
NEXT FALSIFICATION: Embed on plain HTML page; requires host-page cooperation beyond objectId+apiBase -> boundary claim false.

**SOC-22 — mcp-capability-exposure** 
**SOC-22 — mcp-capability-exposure** | HARVEST | P3
WHY: FYD exposes capabilities to agents as MCP tools (projection only, pin SDK + protocol revision). MCP URIs must never become canonical object IDs.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (MCP USE-LIBRARY; SDK 1.30.0 MIT); harvest-social-ads.md (projection-only; pin 2026-07-28; churn warning: five breaking revisions in 20 months).
DEPENDENCIES: SOC-09, SOC-11.
ACCEPTANCE: MCP tool surface mirrors grant-gated capability set 1:1.
NEXT FALSIFICATION: Re-pin spec/SDK pair and check drift (Contradiction 2); tool exposing ungated effect -> boundary leaks.

**SOC-23 — createpost-bff-gap** 
**SOC-23 — createpost-bff-gap** | PROVE | P2
WHY: Gateway post path PROVEN but PingObjectReader has no createPost method — end-to-end posting one small additive BFF method away.
EVIDENCE: social-backend-plan.md §1.5, open question 4.
DEPENDENCIES: gateway seam.
ACCEPTANCE: createPost(identityId, text, replyTo?) submits signed ping.social.post@1 envelope.
NEXT FALSIFICATION: Implementation writes posts straight to projection table -> canonicality violated.

## DOMAIN 2: RELATIONSHIPS

**REL-01 — follows-unfollows-canonical-law** 
**REL-01 — follows-unfollows-canonical-law** | DONE_VERIFIED | P1
WHY: follows is canonical predicate; unfollows/unlikes do not exist and are rejected (PREDICATE_NOT_CANONICAL). Unfollow is status:'inactive' on same predicate; projector applies last-wins per (subject, predicate, object) by acceptance sequence. Follow is a journal event, not an authority.
EVIDENCE: social-backend-plan.md §1.3 (verified against ping-vocabulary.ts:22-27,41, adapter, projector, unit tests).
DEPENDENCIES: sequence column on ping_events (DDL gap, §7 Q1).
ACCEPTANCE: Alice-follows-Bob round-trip: journal active, projection active, unfollow flips to inactive with history preserved.
NEXT FALSIFICATION: Emit unfollows; accepted instead of rejected -> vocabulary gate broken.

**REL-02 — likes-unlike-revocation** 
**REL-02 — likes-unlike-revocation** | DONE_VERIFIED | P1
WHY: likes revocable; unlike is status:'inactive' on same predicate (Patch 7B pattern). Counts are projections computed from net edges, never canonical truth.
EVIDENCE: social-backend-plan.md §1.6 (like/route.ts header: "counts stay projections computed from events").
DEPENDENCIES: REL-01.
ACCEPTANCE: Like count derives from net like edges; toggle moves count deterministically.
NEXT FALSIFICATION: Any count stored as canonical object field -> projection law violated.

**REL-03 — reply-predicate-naming-decision** 
**REL-03 — reply-predicate-naming-decision** | DECISION | P2
WHY: Canonical write form is replies_to (immutable once active); BFF derives read-only edge named replies never journal-written. FYD must standardize on canonical form for writes.
EVIDENCE: social-backend-plan.md §1.7, open question 5.
ACCEPTANCE: Recorded decision (canonical replies_to on write; replies read-only alias) applied consistently in FYD.
NEXT FALSIFICATION: New code writes replies to journal; vocabulary test should fail.

**REL-04 — references-predicate-or-refs** 
**REL-04 — references-predicate-or-refs** | DECISION | P2
WHY: Every object carries refs: string[] (preserved in journal and projection); NO canonical social references predicate. Adding one is constitutional vocabulary change (all consumers agree, enforced by ping-vocabulary.test.ts); otherwise use refs.
EVIDENCE: social-backend-plan.md §1.8, open question 6.
ACCEPTANCE: Vocabulary addition with all three consumers agreeing, or refs-only references documented.
NEXT FALSIFICATION: Propose vocabulary change and run ping-vocabulary.test.ts; disagreement blocks by design.

**REL-05 — vocabulary-change-law** 
**REL-05 — vocabulary-change-law** | DONE_VERIFIED | P1
WHY: ping-vocabulary.ts is single source of truth the TS projector, SQL CHECK constraints, and BFF must all agree on. Mechanism behind "Follow is not its own authority."
EVIDENCE: social-backend-plan.md §1.8 ("what FYD must NOT rebuild": vocabulary, projector semantics, revocation semantics, feed visibility).
ACCEPTANCE: No social capability forks vocabulary semantics into FYD.
NEXT FALSIFICATION: Grep FYD for local predicate allowlists; any fork -> violates single-source law.

**REL-06 — extended-predicate-catalog** 
**REL-06 — extended-predicate-catalog** | HARVEST | P3
WHY: General predicate space (subscribes, references, created, owns, member_of, endorses, sponsors, purchased, contributed_to, collaborates_with, derived_from, responds_to, located_at, works_for, links_to). Social vocabulary covers follows, likes, replies_to, approves, denies; knowledge layer adds published, external_identity. Each addition is constitutional change, not casual field.
EVIDENCE: social-backend-plan.md §1.4; harvest-social-ads.md (campaign->references->offer needs references; sponsor relationships MISSING).
DEPENDENCIES: REL-05, REL-04.
ACCEPTANCE: Catalog exists as decided roadmap with per-predicate justification, none added ad hoc.
NEXT FALSIFICATION: Pick endorses; no concrete product need statable without it -> stays out.

## DOMAIN 3: PUBLIC SOCIAL OBSERVATION

**OBS-01 — observation-freeze-boundary** 
**OBS-01 — observation-freeze-boundary** | DEFERRED | P1
WHY: Nolan's freeze (2026-09-21): until core customer loop closes, no new ATProto/Nostr/Farcaster adapters, no graph database, no campaign/mass-follow machinery, no MCP integration, no general crawler. ActivityPub frozen at local-mapping-verified / remote-partial / rejection-handling-verified. Public-social work read-only research only.
EVIDENCE: memory/2026-09-21.md#L473 (06:44 MDT reconciler/product-freeze note).
DEPENDENCIES: SOC-01 (core loop proof).
ACCEPTANCE: No new adapter code merges before SOC-01 proves.
NEXT FALSIFICATION: Any PR touching src/fyd/adapters/ before loop green -> freeze violated.

**OBS-02 — typed-observation-vocabulary** 
**OBS-02 — typed-observation-vocabulary** | DONE_VERIFIED | P2
WHY: Every fact carries value, source URL/type, observation time, evidence ref, confidence, grade (website_statement / provider_statement / synthetic_fixture); claim ids deterministic (sha256 of entity/field/source/normalized). Grades prevent synthetic data passing as real.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (refresh types.ts, website-observe.ts: 21/21 tests green 2026-09-21).
DEPENDENCIES: none.
ACCEPTANCE: Observation -> evidence -> projection chain preserves grade end to end.
NEXT FALSIFICATION: Synthetic fixture through pipeline; surfaces as real claim -> grading leaks.

**OBS-03 — provider-data-not-canonical-identity** 
**OBS-03 — provider-data-not-canonical-identity** | DECISION | P1
WHY: Provider data is not canonical identity merely because observed. Observation flows provider-source -> observation -> evidence -> conservative identity resolution -> PING projection. Protocol representations are projections/adapters; canonical objects stay in PING.
EVIDENCE: harvest-social-ads.md (binding constraint); FYD_EXECUTABLE_HARVEST.md.
DEPENDENCIES: IDN-01.
ACCEPTANCE: No provider-sourced object enters graph without evidence-backed, conservatively resolved identity.
NEXT FALSIFICATION: Ingest provider post; provider native ID became canonical id without resolution record -> boundary broken.

**OBS-04 — activitypub-adapter-readiness** 
**OBS-04 — activitypub-adapter-readiness** | HARVEST | P3
WHY: Adapter target #1 (largest open network, fixed W3C vocabulary, standardized follows). Light path: Fedify @fedify/fedify 2.3.7 MIT. Obligations mapped (WebFinger, HTTP Signatures, inbox/outbox, Follow/Accept/Undo -> follow intent, Create/Note -> portable objects). Local mapping verified at commit f61200c7; remote round-trip honestly recorded as rejected, not faked.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1; harvest-social-ads.md (git history).
DEPENDENCIES: OBS-01 (frozen).
ACCEPTANCE: Harvest sheet stays current; nothing to build until freeze lifts.
NEXT FALSIFICATION: Re-verify rejection record when freeze lifts; silently flipped "works" without real remote round-trip -> fails.

**OBS-05 — atproto-adapter-readiness** 
**OBS-05 — atproto-adapter-readiness** | HARVEST | P3
WHY: Adapter target #2 (portable DID identity, Lexicon machine-inspectable semantics). Light path: @atproto/lex 0.3.11 MIT, lex + identity + XRPC surface only. Harvested patterns already landed in-repo (DID-vs-handle separation, OAuth granular permissions -> grants.ts); per Nolan 2026-09-21 no adapter code.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1; harvest-social-ads.md (ATPROTO-HARVEST.md commit 08cc39d6).
DEPENDENCIES: OBS-01.
ACCEPTANCE: Harvest doc current; no code until freeze lifts.
NEXT FALSIFICATION: Commit adds @atproto/api as dependency before SOC-01 -> freeze violated.

**OBS-06 — nostr-adapter-readiness** 
**OBS-06 — nostr-adapter-readiness** | HARVEST | P3
WHY: Adapter target #3 (maximally portable keypair identity, simplest event model) but structurally fragmented (NIP statuses bind nobody; relays vary). Future work must pin NIP profile (01/02/05/19/65) and test relay variance; never run FYD relays.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1 (nostr-tools 2.25.2 Unlicense); §4 fragmentation note.
DEPENDENCIES: OBS-01.
ACCEPTANCE: Harvest sheet current; pinned NIP profile documented before any code.
NEXT FALSIFICATION: Code claiming "Nostr support" without named pinned NIP profile and tested relays -> theater.

**OBS-07 — farcaster-rejected-with-pattern-harvests** 
**OBS-07 — farcaster-rejected-with-pattern-harvests** | REJECTED | P3
WHY: Stewardship unsettled (Neynar acquisition Jan 2026, founders leaving, $180M returned); hub/onchain model conflicts with light-adapter rule. Patterns still harvested: Frames (signed actions over OG), scoped signer delegation, channel-scoped placement, signed usage receipts.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1 (Farcaster verdict REJECT; Frames TAKE-PATTERN); harvest-social-ads.md (ADAPT patterns, REJECT onchain stack/Snapchain hosting).
DEPENDENCIES: none.
ACCEPTANCE: No Farcaster adapter; pattern reuse only.
NEXT FALSIFICATION: Onchain identity dependency enters FYD package tree -> rejection violated.

**OBS-08 — facebook-source-real-path** 
**OBS-08 — facebook-source-real-path** | PROVE | P2
WHY: fromFacebookCliJson keeps real ingest path wired behind checkFacebookAvailability for the day an authorized page ID exists; currently real path correctly stubbed, conflict machinery proven against labeled synthetic fixture. Facebook is a proving ground, never the model.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (facebook-source.ts, 21/21 refresh tests); FYD_ECOSYSTEM_HARVEST.md.
DEPENDENCIES: authorized page ID (external).
ACCEPTANCE: Wiring fromFacebookCliJson with authorized ID yields graded provider_statement observations.
NEXT FALSIFICATION: Availability check claims availability without authorized credential -> stub dishonest.

**OBS-09 — feed-emission-vs-acquisition-gap** 
**OBS-09 — feed-emission-vs-acquisition-gap** | PROVE | P2
WHY: Feed emission is core FYD output (Atom per site, JSON Feed alongside — cheap, agent-friendly) but acquisition gap G2: discover() enumerates RSS/Atom/sitemap sources and parse() silently yields nothing on feed/sitemap XML.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (RSS/Atom/JSON Feed TAKE-PATTERN); FYD_EXECUTABLE_HARVEST.md G2.
ACCEPTANCE: RSS/Atom/sitemap URL fed to pipeline produces parsed observations, not silence.
NEXT FALSIFICATION: Real Atom feed to parse(); empty output with no error -> fails.

**OBS-10 — webfinger-relme-discovery** 
**OBS-10 — webfinger-relme-discovery** | HARVEST | P3
WHY: WebFinger acct: resolution and rel="me"/sameAs/website-backlink are open-web identity proof inputs for provider->PING identity resolution. Fedify covers ActivityPub side; pattern belongs in identity-resolution layer.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (WebFinger TAKE-PATTERN, RFC 7033).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Documented as identity proof inputs, not implemented until freeze lifts.
NEXT FALSIFICATION: Implementation treating WebFinger lookup alone as verified identity -> fails conservative-resolution rule.

## DOMAIN 4: IDENTITY RESOLUTION

**IDN-01 — conservative-resolution-inputs** 
**IDN-01 — conservative-resolution-inputs** | HARVEST | P2
WHY: Resolution evidence ladder: explicit owner connection, DID, public key, domain proof, rel=me, sameAs, website backlink, provider account claim, signed proof, exact deterministic match -> ambiguous match -> human confirmation. No step skipped silently.
EVIDENCE: harvest-social-ads.md (identity/principal.ts, claim machine); FYD_ECOSYSTEM_HARVEST.md (entity resolution ABSENT anywhere in estate).
DEPENDENCIES: OBS-02.
ACCEPTANCE: Documented ladder where each rung names its evidence; ambiguous cases queue for human confirmation.
NEXT FALSIFICATION: Two similar-but-distinct provider profiles merged without explicit confirmation record -> rule broken.

**IDN-02 — entity-resolution-estate-gap** 
**IDN-02 — entity-resolution-estate-gap** | OPEN | P2
WHY: Nothing links same real-world entity across sources (website business vs Facebook page vs Drive doc). proceduralize.resolve() resolves field conflicts by source priority; conflict.ts keeps both claims with provenance — but no dedupe, merge, or identity stitching exists anywhere (G1).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md G1 (only a test name mentions resolution; refresh fixture notes entity matching is assumed).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Stitching design preserving both claims' provenance (never deletes loser, per conflict.ts law).
NEXT FALSIFICATION: Stitching implementation deletes/silently overwrites losing claim -> keep-both law violated.

**IDN-03 — claim-state-machine** 
**IDN-03 — claim-state-machine** | DONE_VERIFIED | P1
WHY: Claim machine OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, every transition appends audit events; demo contexts can never be claimed. Ownership is evidence-bearing state, never manufactured for demo convenience.
EVIDENCE: harvest-social-ads.md (src/fyd/claim/types.ts + machine.ts, identity.ts).
DEPENDENCIES: none.
ACCEPTANCE: Demo-owner context attempting claim transition fails.
NEXT FALSIFICATION: Claim through machine in demo context reaches VERIFIED-CONTROLLED -> boundary leaks.

**IDN-04 — no-fuzzy-merge-rule** 
**IDN-04 — no-fuzzy-merge-rule** | DECISION | P1
WHY: Never silently fuzzy-merge people. Ambiguous match -> explicit human confirmation with recorded decision; loser never deleted (keep-both resolution).
EVIDENCE: task directive hard rule; FYD_EXECUTABLE_HARVEST.md (conflict.ts: "FYD must KNOW the conflict, not silently pick a winner" — tested 21/21).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Rule encoded as machine-checkable constraint on resolution path.
NEXT FALSIFICATION: Near-duplicate person silently merged -> fails.

## DOMAIN 5: CROSS-NETWORK ACTIONS

**XNA-01 — observe-act-separation** 
**XNA-01 — observe-act-separation** | DECISION | P1
WHY: OBSERVE and ACT are separate capabilities. PING follow never implies Facebook/external effects; cross-network action requires provider support + connected account + authorization + capability + policy + possibly human approval.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (agents propose, humans publish; FORBIDDEN_AGENT_EFFECTS 36/36).
DEPENDENCIES: SOC-11.
ACCEPTANCE: No code path executes provider write as side effect of PING social action.
NEXT FALSIFICATION: Trace PING follow end-to-end; any outbound provider call -> fails.

**XNA-02 — provider-capability-matrix** 
**XNA-02 — provider-capability-matrix** | HARVEST | P3
WHY: Future matrix per provider: READ / FOLLOW / UNFOLLOW / POST / REPLY / LIKE / SUBSCRIBE / MESSAGE, each gated on support, connection, authorization, capability, policy. Capability negotiation per server (ActivityPub servers implement overlapping subsets).
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §4 (ActivityPub capability negotiation).
DEPENDENCIES: XNA-01; OBS-01.
ACCEPTANCE: Documented matrix before any adapter code.
NEXT FALSIFICATION: Adapter claims FOLLOW support on server that doesn't honor it -> negotiation missing.

**XNA-03 — agents-never-external-effects** 
**XNA-03 — agents-never-external-effects** | DONE_VERIFIED | P1
WHY: FORBIDDEN_AGENT_EFFECTS (site.publish, message.send, purchase.make, ad.buy, provider.call, business.mutate) — agents propose, humans publish; agentGrants strips fail-closed.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (capabilities.ts, 36/36 ask-fyd tests).
DEPENDENCIES: SOC-11.
ACCEPTANCE: Test suite green; agent-issued context contains zero forbidden effects.
NEXT FALSIFICATION: Agent given cross-network task; provider write executes without human approval -> boundary broken.

## DOMAIN 6: CAMPAIGNS

**CMP-01 — campaign-record-model** 
**CMP-01 — campaign-record-model** | HARVEST | P3
WHY: Future pipeline maps onto existing primitives: plain-English intent -> deterministic candidate selection -> policy -> capability -> bounded action plan -> approval where required -> execution -> evidence -> outcomes. Genuinely missing record types: campaign objects, audience-intent objects, sponsor relationships, sponsored-label vocabulary, signed outcome receipts, budget escrow — expressible as new schemas + relationships, none requiring new authority.
EVIDENCE: harvest-social-ads.md (per-piece EXISTS/MISSING mapping; ping.social.offer@1 + proceduralizer emission EXISTS).
DEPENDENCIES: REL-04 (references), OBS-01.
ACCEPTANCE: Two FYD lexicon-style record drafts + one Sponsored Surface Contract (product lane, only after loop green).
NEXT FALSIFICATION: Campaign-adjacent work starts before SOC-01 -> freeze violated.

**CMP-02 — no-covert-scraping-spam** 
**CMP-02 — no-covert-scraping-spam** | DECISION | P1
WHY: Campaigns never covert scraping, spam, or uncontrolled mass action. Matching constrained to object context + viewer-allowed context + explicit relationships + capabilities + stated intent; neither record may carry inferred traits, only asserted signed facts. Machine-checkable projection constraint, not policy text.
EVIDENCE: harvest-social-ads.md (Sponsored Surface Contract; "never infer sensitive traits").
DEPENDENCIES: SOC-11, SOC-15.
ACCEPTANCE: Validator rejecting any campaign plan carrying inferred traits or unlabeled paid placement.
NEXT FALSIFICATION: Draft plan with inferred-trait targeting input passes validator -> constraint is theater.

**CMP-03 — no-ad-authority** 
**CMP-03 — no-ad-authority** | DECISION | P1
WHY: No AdAuthority will be created. Assumption falsified twice: FydGrant already names ad.buy as grant agents never given; labeler disclosure + projection validators + signed receipts cover sponsorship without central authority.
EVIDENCE: harvest-social-ads.md (Assumptions Falsified #9).
DEPENDENCIES: SOC-11.
ACCEPTANCE: No new authority introduced in any campaign design doc.
NEXT FALSIFICATION: Any design introducing authority owning ad truth -> fails on arrival.

**CMP-04 — honest-sponsored-labeling** 
**CMP-04 — honest-sponsored-labeling** | HARVEST | P3
WHY: Sponsored content appears only as projection of explicit sponsor relationship + sponsor-signed offer; projection MUST render SPONSORED. Label vocabulary (sponsored, sponsor-disclosure, verified-business) modeled on ATProto labeler defs: namespaced per emitting labeler, advisory at render, enforced by machine-checkable projection validator. Nostr has no sponsored-content NIP — honest-labeling layer unbuilt; FYD's opening.
EVIDENCE: harvest-social-ads.md (label vocabulary design; ATProto labeler pattern; NIP gap).
DEPENDENCIES: CMP-02.
ACCEPTANCE: Sponsored Surface Contract as machine-checkable validator: sponsored projection without label fails.
NEXT FALSIFICATION: Rendered sponsored projection omits SPONSORED while content shows -> decorative labeling.

**CMP-05 — signed-outcome-receipts** 
**CMP-05 — signed-outcome-receipts** | HARVEST | P3
WHY: Sponsors get verifiable attribution with no behavioral tracking: signed outcome receipt modeled on Farcaster FIP AppUsageReceipt (object ref, actor, action type, timestamp, actor-signed) + NIP-57 third-party-signed receipt pattern (validate against advertised pubkey; receipts are evidence, not settlement proof). FYD specifying first — design as FYD lexicon record.
EVIDENCE: harvest-social-ads.md (FIP Discussion #19; NIP-57).
DEPENDENCIES: SOC-13.
ACCEPTANCE: Receipt type where apps cannot fabricate usage (user-signed); third-party receipts validate against advertised keys.
NEXT FALSIFICATION: Fabricated app-side receipt verifies -> design broken.

## DOMAIN 7: MEDIA/EMBEDS/CIRCLE DISTRIBUTION

**MEDIA-01 — media-download-digest-derivative-law** 
**MEDIA-01 — media-download-digest-derivative-law** | DECISION | P1
WHY: Download + digest + derivative is the architecture; hotlink fallback only. Authorized demo businesses/sources only. Preserve source URL + observation/evidence; downloaded bytes NOT canonical business truth — media record answers where-from / when-observed / what-bytes-made-derivative.
EVIDENCE: MEMORY.md FYD harvest directive 2026-09-22 binding decision 1; memory/2026-09-22.md 05:25 MDT (Happy Place zero acquired assets -> deterministic gradient/typographic fallbacks; Coppersmith 11 published public-demo-source assets).
DEPENDENCIES: none.
ACCEPTANCE: Every rendered Circle/Node image carries source URL, digest, rights/attribution; unrelated imagery never appears.
NEXT FALSIFICATION: Rendered image's provenance lacks source URL + digest -> law broken.

**MEDIA-02 — portable-circle-distribution-wedge** 
**MEDIA-02 — portable-circle-distribution-wedge** | HARVEST | P2
WHY: Portable Circle is future network wedge: website embed, hover/tap, Node deep-link, object preview, Ask FYD entry, follow/discovery. One-snippet loader and mode A/B/C preview strategy exist. Not confused with today's core-loop proof — distribution follows product.
EVIDENCE: memory/2026-09-21.md#L1083 (embed boundary); portal-circle-spec.md §3.
DEPENDENCIES: SOC-01, SOC-21.
ACCEPTANCE: Third-party embed renders real graph-backed Circle with follow + Ask entry.
NEXT FALSIFICATION: Distribution work scheduled ahead of SOC-01 proof -> sequencing wrong.

**MEDIA-03 — deterministic-focal-preview-pipeline** 
**MEDIA-03 — deterministic-focal-preview-pipeline** | PROVE | P2
WHY: Circle previews are hostile external content; snapshot mode safest default. Focal-region resolution order (owner-selected -> SiteSpec hero -> hero image -> OG image -> logo -> title -> dominant image) deterministic; every preview record carries source, focal x/y, scale, crop strategy, capturedAt, captureMethod, digest. Reuses sharp derivatives pipeline; net-new: focal cropping, screenshot capture (Playwright — genuine install gap), sandboxed embed.
EVIDENCE: portal-circle-spec.md §3 + §10/11 (framer-motion 12.43.0 present, Floating UI/Playwright missing, sharp 0.35.3 present).
DEPENDENCIES: MEDIA-01.
ACCEPTANCE: HOST CONTENT OCCLUDED = ZERO on Playwright matrix (1920/1440/1280/tablet/mobile, zoom, reduced motion).
NEXT FALSIFICATION: Circle over host page; any occluded primary content -> fails matrix.

**MEDIA-04 — spatial-composition-engine** 
**MEDIA-04 — spatial-composition-engine** | OPEN | P2
WHY: Margin composition machinery (SpatialSlotManager, ContextObjectRanker, AttentionController, SemanticTargetResolver) specified as novel PING code with hard separation law: geometry never decides relevance; relevance never decides authority; authority never decides animation. Nothing exists yet (no spatial/collision geometry code anywhere).
EVIDENCE: portal-circle-spec.md §2.1-2.4, §11 ("NOTHING EXISTS: screenshot capture, CDP sessions, spatial or collision geometry").
DEPENDENCIES: SOC-05, SOC-16.
ACCEPTANCE: Safe peripheral rectangles computed deterministically from page geometry; ranker pure; attention hysteresis holds under scroll.
NEXT FALSIFICATION: Layout code consumes relevance signals (or vice versa) -> separation law violated.

## WORKER SUMMARY COUNTS
42 items: FYD SOCIAL 16 (8 DONE_VERIFIED, 5 IN_PROGRESS, 4 OPEN, 1 PROVE, 2 HARVEST, 1 DEFERRED) · RELATIONSHIPS 6 (3 DONE_VERIFIED, 3 DECISION, 1 HARVEST) · PUBLIC SOCIAL OBSERVATION 10 (1 DEFERRED, 1 DONE_VERIFIED, 1 DECISION, 1 PROVE, 6 HARVEST, 1 REJECTED) · IDENTITY RESOLUTION 4 (1 DONE_VERIFIED, 1 DECISION, 1 OPEN, 1 HARVEST) · CROSS-NETWORK ACTIONS 3 (1 DONE_VERIFIED, 2 DECISION/HARVEST) · CAMPAIGNS 5 (2 DECISION, 3 HARVEST) · MEDIA/DISTRIBUTION 4 (1 DECISION, 1 HARVEST, 1 PROVE, 1 OPEN).
Priority 1: 19 items. Critical path: SOC-01 -> SOC-02/04/05/06 -> SOC-03/07, guarded by freeze OBS-01, grant boundary SOC-11, vocabulary single-source law REL-05.
Bigges