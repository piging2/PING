# FYD Backlog Item Inventory: Read-Only Archaeology

**Worker:** ea98cad2 (5/8: FYD procedural acquisition, SiteSpec, renderer, component registry, website acquisition escalation) · **Date:** 2026-09-22. **49 items across five domains.**

No files were created, edited, or deleted by the worker. No git commands were run. `/home/nolan/projects/ping` was not touched. `~/workspace/BACKLOG_NOLAN.md` was not read. The work used only directory listings, file reads, grep/find, and memory search.

---

## DOMAIN: FYD PROCEDURAL ACQUISITION

**1. ID: `acq-ordered-rule-bundles` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Current extraction is JSON-LD only with no per-field fallback chain. Metascraper's ordered rule bundles (first resolving rule wins) are the proven deterministic pattern for coverage across heterogeneous sites.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 1, dated 2026-09-21. FYD has `jsonld` pinned at 9.0.0 (per `~/workspace/fyd-lane/service-extraction-report.md`, 2026-09-21) but no uniform fallback-rule engine.
- DEPENDENCIES: existing `structured-data.ts` extraction; acquisition stack L0/L1.
- ACCEPTANCE: a small FYD bundle module declares ordered per-field rules (JSON-LD, then meta/OpenGraph, then text heuristics), with a conformance fixture showing a site with no JSON-LD still yields phone/hours/address from lower-priority rules.
- NEXT FALSIFICATION: run the rule bundles over the two real captures (`happy-place-platform`, `coppersmith-plumbing`); if a rule misattributes a field, the first-wins ordering is falsified.

**2. ID: `acq-microdata-walker` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Ports WHATWG microdata-to-JSON traversal (extruct's algorithm) to TypeScript, unlocking LocalBusiness/hours/address fields from sites with no JSON-LD, without a heavy dependency.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 6 (extruct), dated 2026-09-21. Status: PATTERN_ONLY toward ADAPT, conditional on needing microdata from real sites.
- DEPENDENCIES: `acq-ordered-rule-bundles` (microdata becomes one rule tier).
- ACCEPTANCE: TS walker passes a microdata corpus fixture with byte-identical JSON to extruct's reference output on the same inputs.
- NEXT FALSIFICATION: test against a real hard site that carries only microdata; if JSON-LD alone already covers all required fields, the port is unnecessary.

**3. ID: `acq-content-fingerprint` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Trafilatura's simhash plus exact bag-of-words hash gives refresh change detection that suppresses cosmetic noise. Cannot replace field-level semantic diffs.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 3 (trafilatura), dated 2026-09-21.
- DEPENDENCIES: normalization policy (see `acq-refresh-normalize-then-hash`).
- ACCEPTANCE: two snapshots differing only in ad/menu chrome hash as near-duplicates; a changed phone number hashes as distinct.
- NEXT FALSIFICATION: if near-duplicate detection masks a substantive field change on a real refresh, simhash thresholding is falsified for FYD's use.

**4. ID: `acq-aria-snapshot-observation` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Playwright's `ariaSnapshot()` is a compact browser-computed semantic projection of rendered DOM, useful for JS-rendered sites. Must stay paired with raw HTML because inaccessible or canvas content may disappear from it.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 4 (microsoft/playwright), dated 2026-09-21.
- DEPENDENCIES: Playwright L2 engine (already pinned 1.63.0).
- ACCEPTANCE: acquisition emits a paired observation bundle `{url, finalUrl, ariaSnapshot, html}` from the existing Playwright path.
- NEXT FALSIFICATION: find a business site whose key facts appear in raw HTML but not in the aria snapshot, or vice versa; either direction falsifies a single-source observation.

**5. ID: `acq-request-fingerprint` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Crawlee's request fingerprinting (lowercase, sorted query, fragment policy, method plus payload extension) deduplicates crawl requests deterministically. PATTERN_ONLY, a small FYD primitive, not full Crawlee.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 5 (Crawlee), dated 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: a primitive function fingerprints URL/method/payload such that two visits to the same logical request dedupe to one crawl unit.
- NEXT FALSIFICATION: if fragment or payload semantics cause duplicate acquisitions on the real captures, the fragment policy is falsified.

**6. ID: `acq-readability-gate` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Mozilla Readability gives deterministic main-content isolation for a fixed DOM (in-page via Playwright, zero new runtime dependency). Business homepages must be tested before trust.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 2 (readability), dated 2026-09-21. REUSE verdict with a specified falsification experiment on business sites.
- DEPENDENCIES: Playwright L2.
- ACCEPTANCE: `isProbablyReaderable` gate plus content extraction runs in-page against JS-rendered DOM.
- NEXT FALSIFICATION: run on real business homepages; if it strips contact cards or service lists as non-content, the pattern is falsified for FYD's extraction path (falls back to DEFERRED).

**7. ID: `acq-refresh-normalize-then-hash` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: HARVEST | PRIORITY: 3**
- WHY: urlwatch's ordered per-URL filters (CSS element selection, declared order) then sha256 of normalized bytes. The normalizer version must be stored with the digest so future normalizer changes do not look like source changes.
- EVIDENCE: `~/workspace/fyd-lane/harvest-wave1/web-acquisition.md` Card 7 (urlwatch), dated 2026-09-21. PATTERN_ONLY.
- DEPENDENCIES: `acq-content-fingerprint`.
- ACCEPTANCE: refresh pipeline stores `{normalizerVersion, hash}` per source; a normalizer upgrade changes only the version field, not the source-change verdict.
- NEXT FALSIFICATION: if a real site changes its markup in a way the declared filters do not normalize, producing a false change event, the filter list is falsified.

**8. ID: `acq-service-tier1-extraction` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Tier 1 direct JSON-LD extraction of Service and Offer objects into the machine path is committed and tested. This is the proven foundation for all higher extraction tiers.
- EVIDENCE: `~/workspace/fyd-lane/service-extraction-report.md`, dated 2026-09-21. Local commits `3fb4d12` then `55c6ce6` (no push). Gate rerun: 146/155 tests, +8 new service-extraction tests all passing, zero regressions. Machinery: `serviceType -> service_type`, `provider -> provided_by`, `itemOffered -> item_offered`, `offers -> offers` mappings; deterministic IDs `${businessId}-service-${sha256(entityKey)[0:12]}`; unnamed offers get derived fallback label "Offer", never a direct fact.
- DEPENDENCIES: structured-data pipeline, deterministic ID law.
- ACCEPTANCE: the committed synthetic suite (`service-extraction.test.ts`) stays green and zero-service real captures remain a refusal rather than fabricated claims.
- NEXT FALSIFICATION: run the gate suite; any failure in the 8 service tests falsifies the Tier 1 contract.

**9. ID: `acq-real-capture-service-gap` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 1**
- WHY: Running the Tier 1 pipeline over the real captures (coppersmith index.html, happy-place-platform index.html) yields 4 and 2 objects respectively with ZERO service and zero offer objects. The Ask FYD layer correctly refuses ("I do not have evidence for that... I will not guess"). The first broken step is EVIDENCE to SERVICE OBJECT EXTRACTION, not the answer layer.
- EVIDENCE: `~/workspace/fyd-lane/service-extraction-report.md` A/B section, dated 2026-09-21; `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` section 4 (FIRST BROKEN STEP), dated 2026-09-21.
- DEPENDENCIES: `acq-service-tier1-extraction`.
- ACCEPTANCE: rerunning the fixed question "What services does this business offer, and how do you know?" against the real graphs returns a cited, classified answer with evidence_refs and source_urls, or an explicit structured "services unknown" state. The composer must never parse description prose as claims.
- NEXT FALSIFICATION: if real captures contain no structured service data at all, the gap is not Tier 1 but a site-data reality, and the lane shifts to an explicit services-unknown state instead.

**10. ID: `acq-predicate-consistency` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 2**
- WHY: The schema declares `provides`, the proceduralizer emits `offers`, the generator accepts both, but `makes_offer` relationships never populate Services sections and `serves_area` has no consumer. A future lane must not invent a third predicate.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` sections 1 and 3, dated 2026-09-21.
- DEPENDENCIES: `acq-service-tier1-extraction`.
- ACCEPTANCE: one canonical Business-to-Service predicate documented; every emitted relationship predicate is consumed by generator grouping; no orphan predicates in the vocabulary list.
- NEXT FALSIFICATION: enumerate `PREDICATE_MAP` and generator `ROLE_PREDICATES`; any emitted predicate with no consumer falsifies the closure.

**11. ID: `acq-deterministic-ids` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Business IDs (`website-business-` + sha256 of canonical url/controller/fields), relationship IDs (`rel-` + sha256 of subject|predicate|object), service IDs, and blank-node entity keys are all content-derived SHA-256 hex via browser-safe TS `sha256Hex`. The website lane deliberately avoids non-deterministic identity authorities so re-projection dedupes.
- EVIDENCE: `~/workspace/fyd-lane/service-semantics-harvest.md` section 2, dated 2026-09-21. Determinism contract in `STRUCTURED-DATA.md` section 8: same source bytes plus observedAt yields byte-identical facts, entity keys, object IDs, relationships.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: reprojecting the same capture produces identical IDs; verified by regen proof.
- NEXT FALSIFICATION: project the same capture twice and diff all IDs; any drift falsifies the ID law.

**12. ID: `acq-observedat-digest-observations` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Byte-identical regen proofs across processes and key orders depend on pinned observedAt and source-content digests. Proof artifacts exist for the generator path.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts` step 1 (OBSERVED_AT pin), dated 2026-09-21; `~/workspace/fyd4-stage/planner.ts` canonical serialization, dated 2026-09-22.
- DEPENDENCIES: `acq-refresh-normalize-then-hash` for the general refresh pipeline.
- ACCEPTANCE: every acquired source carries `{sourceUrl, contentDigest: sha256, observedAt}` and determinism proofs hold across processes.
- NEXT FALSIFICATION: run the same capture with permuted key order in a fresh process; any digest drift falsifies the canonicalization.

**13. ID: `acq-rss-sitemap-sources` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: PROVE | PRIORITY: 3**
- WHY: The proof pipeline already consumes index.html plus rss.xml plus sitemap.xml for coppersmith (per `regen.ts` SITES config), but per-source evidence references are not yet explicit in the object graph.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts`, dated 2026-09-21. Sitemap and RSS are inputs, not yet provenance citizens.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: every object field records which source (html, rss, sitemap) it came from via explicit evidenceRef, not just a generic `website-ingestion:` prefix.
- NEXT FALSIFICATION: if an object's provenance cannot name its exact source document, per-source evidence is falsified.

**14. ID: `acq-remote-context-refusal` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 2**
- WHY: The JSON-LD extraction path (jsonld@9.0.0, whose defaults changed to RDFC-1.0 per the service extraction report) must have an explicit policy for remote `@context` resolution. No explicit refusal or pinned-loader policy was found in the surveyed extraction path.
- EVIDENCE: absence found during 2026-09-22 read of `~/workspace/fyd-lane/service-semantics-harvest.md` section 5 (extraction pipeline) and `~/workspace/fyd-lane/service-extraction-report.md` (jsonld@9.0.0 canonicalization warning), dated 2026-09-21. Remote `@context` appears in test fixtures as `https://schema.org` without a documented fetch policy.
- DEPENDENCIES: structured-data pipeline.
- ACCEPTANCE: extraction never fetches a remote context; remote contexts are either refused with a typed failure or resolved from a pinned local copy. A hostile fixture with a malicious remote context is handled deterministically.
- NEXT FALSIFICATION: feed a capture whose `@context` points at a hostile URL; if the pipeline fetches it, the refusal contract is falsified.

**15. ID: `acq-social-identity` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: OPEN | PRIORITY: 3**
- WHY: `rel=me` and `sameAs` are the canonical discovery mechanisms for social and external identities. Coppersmith has an `external_identity` object (the person handle) but no documented `rel=me`/`sameAs` extraction rule.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` section 1 (coppersmith graph includes `ping.social.external_identity@1`), dated 2026-09-21; schema.org `sameAs` cited in `~/workspace/fyd-lane/website-builder-authority-decisions.md`, dated 2026-09-21.
- DEPENDENCIES: `acq-ordered-rule-bundles`.
- ACCEPTANCE: `sameAs` and `rel=me` links project to `external_identity` objects with evidence refs.
- NEXT FALSIFICATION: if business homepages in the target corridor carry social links only in `sameAs` and the pipeline ignores them, the coverage is falsified.

**16. ID: `acq-crawl-recipe-artifact` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: PROVE | PRIORITY: 3**
- WHY: The proof codified a crawl recipe per site (URL seed, source types, observedAt pin) in `regen.ts`, but the recipe is not yet a first-class replayable artifact.
- EVIDENCE: `~/workspace/fyd-proof-run/regen.ts`, dated 2026-09-21.
- DEPENDENCIES: `acq-observedat-digest-observations`.
- ACCEPTANCE: a recipe file per site names seed URL, source list, normalizer version, and expected digests; replaying the recipe reproduces the acquisition set.
- NEXT FALSIFICATION: replay a recipe on an unchanged site; any digest change falsifies the recipe's determinism.

**17. ID: `acq-hostile-input-fixtures` | DOMAIN: FYD PROCEDURAL ACQUISITION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Hostile fixture discipline (XSS text in name/quote fields, `javascript:` URLs in website/social fields, long malformed URLs, literal HTML entities, SVG payloads) is the standing guard against hostile-source regressions. Proven as a repeatable 8-case battery.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts`, dated 2026-09-21. Result: text cases PASS (React escapes; no dangling `dangerouslySetInnerHTML`), URL cases FAIL pre-fix (FL-20260921-032).
- DEPENDENCIES: `renderer-javascript-url-sink` for the URL cases.
- ACCEPTANCE: the 8-case battery runs against every renderer change and stays green.
- NEXT FALSIFICATION: any battery case regressing falsifies the current sink/escape posture.

---

## DOMAIN: SITESPEC

**18. ID: `sitespec-spec-is-data` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: SiteSpec is the declarative product state. It owns pages, sections, ordering, bindings, tokens, navigation, and manifest. It never owns business truth, evidence, auth decisions, or generated JSX. The generated UI is a pure projection.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__sitespec__types.ts` header law, captured 2026-09-21; `~/workspace/fyd-lane/website-builder-authority-decisions.md` "LAYER 1 TRUTH / LAYER 2 EXPERIENCE SPEC / LAYER 3 RENDERER", dated 2026-09-21; memory record dated 2026-09-22.
- DEPENDENCIES: none.
- ACCEPTANCE: renderer contract `SiteSpec + ObjectGraph + ViewerContext -> UI` holds with no factual authorship in the render layer.
- NEXT FALSIFICATION: any renderer module emitting a claim not bound to a SiteSpec section/query binding falsifies the separation.

**19. ID: `sitespec-schema-evolution-law` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Schema evolution is codified: add new fields as optional, never change an existing field's type, never remove. Breaking changes mint a new schema version. This protects old graphs from silently changing meaning.
- EVIDENCE: `~/workspace/fyd4-stage/schemas.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: a breaking schema change requires a versioned schema id; old specs validate unchanged.
- NEXT FALSIFICATION: find a schema change in the repo history that altered a field type without a version bump; that falsifies the law's enforcement.

**20. ID: `sitespec-canonical-serialization-digest` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Canonical JSON (sorted keys) plus a SHA-256 semantic digest excluding volatile stamps is the identity of the spec. It binds patches, Ask FYD reasoning, and regen proofs to the exact spec version.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`canonicalizeSpec`, `semanticDigestOf`, manifest with `specDigest`), dated 2026-09-22; `~/workspace/fyd-proof-run/regen.ts` (`stableStringify` + `specDigest`), dated 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: cross-process, key-permuted serialization of the same spec yields byte-identical digests.
- NEXT FALSIFICATION: permute key order and rerun in a fresh process; any digest change falsifies canonicalization.

**21. ID: `sitespec-eligibility-contract` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: `deriveEligibility` gives every component a data-driven eligibility verdict with reasons. The planner defensively filters generator output through it. Components never invent data they are not eligible for.
- EVIDENCE: `~/workspace/fyd4-stage/eligibility.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: an ineligible component with no data is never emitted; every verdict carries reasons.
- NEXT FALSIFICATION: feed the planner a sparse graph; any emitted component without eligible data falsifies the defensive filter.

**22. ID: `sitespec-objectfeed-external-identity` | DOMAIN: SITESPEC | STATUS: OPEN | PRIORITY: 1**
- WHY: The Explore page's ObjectFeed uses an `all` query over schemas including `ping.social.external_identity@1`, which the validator rejects ("Component 'ObjectFeed' does not accept schema"). This is the real-world validation of the schema-component contract: coppersmith ships with external identities and the Explore page fails validation.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-031, recorded 2026-09-21. Confirmed in `~/workspace/fyd4-stage/eligibility.ts` explorePage section, read 2026-09-22: `all` query schema list includes `ping.social.external_identity@1` and `SCHEMA_COMPONENTS[EXTERNAL_IDENTITY]` maps to ObjectFeed, which rejects it.
- DEPENDENCIES: `sitespec-eligibility-contract`, registry contract for ObjectFeed.
- ACCEPTANCE: regenerate the coppersmith spec and the validator passes; either ObjectFeed accepts the schema or the explore query excludes it.
- NEXT FALSIFICATION: rerun validation against the coppersmith graph; a rejection falsifies any claim that Explore is spec-valid.

**23. ID: `sitespec-dependency-manifest` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Every section binding records component version, object field, claim reference, classification, and confidence. The manifest is the machine-readable "what depends on what" surface that powers owner corrections, regen impact analysis, and the binding verifier.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`bindingsForComponent`, `buildDependencyManifest`, manifest with `bindings`, `claimRef`, `confidence`), dated 2026-09-22; binding verifier wired per `~/workspace/fyd-lane/website-builder-authority-decisions.md`, dated 2026-09-21.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: every surviving section has a complete binding list in the manifest; a changed object field maps to affected sections.
- NEXT FALSIFICATION: change one object field and check the manifest; any section whose claim changed but whose binding was not listed falsifies the manifest's completeness.

**24. ID: `sitespec-confidence-law` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Presentation confidence can never exceed fact confidence (`assertConfidenceLaw`). A weakly evidenced fact cannot be rendered with high presentational confidence.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts`, dated 2026-09-22.
- DEPENDENCIES: `sitespec-dependency-manifest`.
- ACCEPTANCE: the planner asserts on every spec; a binding with confidence higher than its underlying fact fails generation.
- NEXT FALSIFICATION: construct a binding with presentation confidence above its fact confidence; if generation succeeds, the law is falsified.

**25. ID: `sitespec-owner-patch-loop` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Structured SitePatch intents (reorder, hide/show, feature object, edit presentation copy, edit theme tokens), a digest-bound proposal (canonicalized body, SHA-256, no mutation until the exact proposal is approved), and pure application to a copied spec are all implemented.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__proceduralize__patch.ts` (intents, `proposalDigest`, `applySitePatch`), captured 2026-09-21.
- DEPENDENCIES: `sitespec-canonical-serialization-digest`.
- ACCEPTANCE: a patch proposal round-trips through propose, approve, apply with digest equality at each step; application never mutates caller-owned state.
- NEXT FALSIFICATION: apply a patch to a spec, then reapply to the same base; any divergence between the two results falsifies purity.

**26. ID: `sitespec-correction-survives-regen` | DOMAIN: SITESPEC | STATUS: PROVE | PRIORITY: 1**
- WHY: The intended pipeline is SOURCE T2 -> OBJECT DIFF -> DEPENDENCY IMPACT -> GENERATED BASE UPDATE -> REAPPLY OWNER OVERRIDES -> VALIDATE -> RENDER. Owner customization must survive source refresh. This is the top technical proof in the build sequence and is not yet demonstrated end to end.
- EVIDENCE: build sequence in `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("Prove owner customization survives"), dated 2026-09-21; memory record of the regeneration pipeline, dated 2026-09-22.
- DEPENDENCIES: `sitespec-owner-patch-loop`, `sitespec-dependency-manifest`.
- ACCEPTANCE: change a source, regenerate, and verify the owner hide/copy/theme overrides still apply; a stale-base proposal yields an explicit STALE PROPOSAL state, never silent mutation.
- NEXT FALSIFICATION: modify a source field that an owner override touches; if the override silently vanishes or silently applies to different content, the pipeline is falsified.

**27. ID: `sitespec-must-win-density` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Planner density caps (maxSectionsPerPage) can drop sections, but must-win components (Hero, BusinessSummary, Services, Products, Contact, CTA, AskFYD, ObjectRail) always survive.
- EVIDENCE: `~/workspace/fyd4-stage/planner.ts` (`pruneToDensity`), dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: a dense sparse-data spec still renders every must-win component that has eligible data.
- NEXT FALSIFICATION: craft a graph with more sections than the density cap allows; any missing must-win component falsifies the pruning rule.

**28. ID: `sitespec-navigation-derived` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Navigation is derived from surviving pages, never authored separately. Pages only exist when data exists.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` / `~/workspace/fyd-build/work/src__fyd__proceduralize__generator.ts` (fixed page order home, about, services, explore; missing data means no page), captured 2026-09-21.
- DEPENDENCIES: none.
- ACCEPTANCE: a graph with no services yields no services page and no services nav entry.
- NEXT FALSIFICATION: any nav entry pointing at a non-generated page falsifies the derivation.

**29. ID: `sitespec-design-tokens` | DOMAIN: SITESPEC | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Design tokens are structured, additive, and versioned (v1 frozen). Token changes are presentation-only and can never rewrite business truth (layer separation).
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__sitespec__types.ts` (`DEFAULT_FYD_THEME`, token set), captured 2026-09-21; `~/workspace/fyd-harvest/harvest-report.md` verdicts on token contracts, dated 2026-09-21.
- DEPENDENCIES: `sitespec-spec-is-data`.
- ACCEPTANCE: changing a token alters no fact binding and no object field; token set changes only via versioned extension.
- NEXT FALSIFICATION: change a token and diff the manifest bindings; any changed claim falsifies the token/fact separation.

---

## DOMAIN: FYD RENDERER

**30. ID: `renderer-javascript-url-sink` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: Hostile proof found that `javascript:` URLs in website and social fields reached raw `href` (FL-20260921-032). The fix is `safe-link.ts`: a parser-based scheme allowlist per capability (web/http/https, call/tel, mail/mailto), rejecting control-character smuggling, non-string values, malformed bases, and dangerous schemes. Central boundary: observed strings are data, links are executable capabilities.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts` cases 3, 6, 7 (FAIL pre-fix), dated 2026-09-21; `~/workspace/fyd-lane/safe-link.ts` plus `safe-link.test.ts`, dated 2026-09-21; `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("URL safety green"), dated 2026-09-21. Caveat: `~/workspace/fyd-lane/service-extraction-report.md` records the `safe-link` module as uncommitted (test suite fails without it), dated 2026-09-21, so committed-integration proof is the remaining step.
- DEPENDENCIES: none.
- ACCEPTANCE: step5 cases 3, 6, 7 (including tab/newline smuggling variants) PASS against the renderer that ships.
- NEXT FALSIFICATION: rerun the step5 URL battery against the live demo pages; any `javascript:` reaching an `href` falsifies the boundary.

**31. ID: `renderer-mobile-minw0` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 1**
- WHY: The standing mobile-overflow lesson: genuine overflow at 320px was owned by Ask FYD design-token rows (label `flex` with `min-width:auto`, token input `flex-1` with `min-width:auto`, plus a 44px preview button). One-class fix `min-w-0` on the token input; the button keeps its 44px touch target. Verified at 320, 375, and 1280. The corollary rule: trace the ancestor chain and fix the exact overflow owner, never blanket `min-w-0`.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-033 (root cause + one-line fix + multi-breakpoint verification), recorded 2026-09-21 ~09:05; `~/workspace/fyd-lane/mobile-overflow-trace.js` ("the first overflowing ancestor owns the bug"), dated 2026-09-21. Note: the earlier 375px overflow report was a dirty-worktree artifact; the real committed defect was at 320px.
- DEPENDENCIES: `renderer-overflow-instrumentation`.
- ACCEPTANCE: no horizontal overflow at 320 and 375 with 44px touch targets preserved.
- NEXT FALSIFICATION: rerun the overflow trace at 320 on any regenerated demo; any `scrollWidth > clientWidth` on a real element falsifies the fix.

**32. ID: `renderer-overflow-instrumentation` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: `fydOverflowTrace()` walks ancestors bottom-up and names the exact overflow owner (the narrowest element whose `scrollWidth > clientWidth`, plus the nearest positioned ancestor). Reusable diagnosis tool, not a one-off script.
- EVIDENCE: `~/workspace/fyd-lane/mobile-overflow-trace.js`, dated 2026-09-21.
- DEPENDENCIES: browser proof harness.
- ACCEPTANCE: on any future overflow, the trace names the owning ancestor in one run.
- NEXT FALSIFICATION: feed it a known-overflow fixture where the named element is not the true owner; a misattribution falsifies the heuristic.

**33. ID: `renderer-hostile-text-escaping` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: React text escaping passed for script tags, image-onerror strings, SVG payloads, quote-breaking text, and literal entities (double-escaping preserved). No dangling `dangerouslySetInnerHTML` in the tested renderer path.
- EVIDENCE: `~/workspace/fyd-proof-run/step5-hostile.ts` cases 1, 2, 5, 8 (PASS), dated 2026-09-21.
- DEPENDENCIES: `acq-hostile-input-fixtures`.
- ACCEPTANCE: the 5 text cases stay PASS on every renderer change.
- NEXT FALSIFICATION: any text case rendering executable markup falsifies the escape posture.

**34. ID: `renderer-missing-data` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Missing data means the section or page does not exist. Nothing is invented. Unknown schemas fall back to GenericObjectCard. This is the renderer's core no-invention contract.
- EVIDENCE: `~/workspace/fyd-build/work/src__fyd__proceduralize__generator.ts` (reasoning item 3: "Missing data means the page or section does not exist; nothing is invented"), captured 2026-09-21; `~/workspace/fyd4-stage/generator.ts` same rule, dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: a sparse graph renders with no placeholder claims and no invented sections.
- NEXT FALSIFICATION: find any rendered factual claim with no backing binding; that falsifies the contract.

**35. ID: `renderer-render-model-fixtures` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: Semantic render determinism (same ObjectGraph + SiteSpec + ViewerContext + renderer version yields the same semantic render model, not byte-identical DOM) is proven by byte-identical canonical render models across separate processes. Fixture regression must gate on semantic invariants plus structural diff review, never pixel identity.
- EVIDENCE: `~/workspace/FAILURE_LEDGER.md` FL-20260921-037 (two tsx processes, byte-identical 925-byte canonical models), recorded 2026-09-21; memory record of the semantic determinism invariant, dated 2026-09-21.
- DEPENDENCIES: `sitespec-canonical-serialization-digest`.
- ACCEPTANCE: render-model fixtures run in CI-like gates and fail only on semantic change, never on cosmetic drift.
- NEXT FALSIFICATION: run the determinism probe twice; any non-identical canonical model falsifies the invariant.

**36. ID: `renderer-responsive-matrix` | DOMAIN: FYD RENDERER | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: The 320/375/768/1280 browser proof matrix exists with artifacts. Desktop and mobile are green after the exact CSS diagnosis. The matrix is the gate for every demo surface.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` ("mobile green after exact CSS diagnosis", "browser proof: artifacts saved from browser-proof.sh"), dated 2026-09-21; `~/workspace/fyd-portal-proof/PROOF.md`, dated 2026-09-21.
- DEPENDENCIES: `renderer-mobile-minw0`.
- ACCEPTANCE: every demo page passes all four widths with no horizontal overflow.
- NEXT FALSIFICATION: any width in the matrix failing on a regenerated demo falsifies the responsive posture.

**37. ID: `renderer-a11y-touch-motion` | DOMAIN: FYD RENDERER | STATUS: PROVE | PRIORITY: 2**
- WHY: Gates require WCAG 2.2 AA 24x24 touch targets, no hover-only interactions, and reduced-motion honored (measured in the portal proof). Touch, keyboard-only, and screen-reader behavior were not exercised in the portal proof and remain unverified.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` gate list, dated 2026-09-21; `~/workspace/fyd-portal-proof/PROOF.md` (UNVERIFIED touch/keyboard/screen-reader), dated 2026-09-21.
- DEPENDENCIES: `renderer-responsive-matrix`.
- ACCEPTANCE: automated checks assert minimum touch target size, keyboard reachability of all actions, and reduced-motion behavior on the demo pages.
- NEXT FALSIFICATION: keyboard-navigate the demo; any action unreachable without a pointer falsifies the accessibility claim.

**38. ID: `renderer-performance-budgets` | DOMAIN: FYD RENDERER | STATUS: PROVE | PRIORITY: 3**
- WHY: Performance is a hard engineering budget (LCP/INP/CLS, image weight, payload), never a product metric used to excuse a worse product. The portal proof measured 60fps and zero long tasks; the FYD demo surfaces need the same measured budget.
- EVIDENCE: `~/workspace/fyd-portal-proof/PROOF.md` measurements, dated 2026-09-21; harvest directive (performance is a hard engineering budget), memory record dated 2026-09-22.
- DEPENDENCIES: `renderer-responsive-matrix`.
- ACCEPTANCE: measured LCP/INP/CLS, image weight, and payload on the demo pages against stated budgets, not Lighthouse theater.
- NEXT FALSIFICATION: exceed any budget on a real demo page; the budget is falsified until the regression is fixed or the budget is re-justified.

---

## DOMAIN: COMPONENT REGISTRY

**39. ID: `registry-declared-contracts` | DOMAIN: COMPONENT REGISTRY | STATUS: IN_PROGRESS | PRIORITY: 2**
- WHY: Every component should eventually declare accepted schemas, required and optional fields, capabilities, responsive behavior, and evidence bindings. The registry has 17 components plus GenericObjectCard fallback with eligibility, but formal per-component prop schemas are the identified harvest gap.
- EVIDENCE: `~/workspace/fyd4-stage/schemas.ts` (SCHEMA_COMPONENTS map, 17 components), dated 2026-09-22; `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 1 (json-render: "typed catalog plus constrained vocabulary"; gap named as "adding formal prop schemas per component"), dated 2026-09-22.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: each registry entry declares accepted schemas, required/optional fields, capabilities, responsive behavior, and evidence bindings in a machine-readable form.
- NEXT FALSIFICATION: a component rendering a field outside its declared contract falsifies the registry's authority.

**40. ID: `registry-unknown-component` | DOMAIN: COMPONENT REGISTRY | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: Unknown component kinds never fail. Unknown schemas fall back to GenericObjectCard. This is the resilience floor for schema evolution.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` ("Unknown schemas fall back to GenericObjectCard"), dated 2026-09-22; `~/workspace/fyd-harvest/harvest-report.md` architecture section, dated 2026-09-21.
- DEPENDENCIES: `registry-declared-contracts`.
- ACCEPTANCE: a graph carrying an unrecognized schema renders through the fallback with no error.
- NEXT FALSIFICATION: any unknown schema crashing generation or render falsifies the fallback.

**41. ID: `registry-socialproof-dormant` | DOMAIN: COMPONENT REGISTRY | STATUS: OPEN | PRIORITY: 3**
- WHY: SocialProof appears in the schema-component map for business objects, but the generator never emits it and eligibility hard-falses it ("never invented"). Either testimonials/reviews ingestion feeds it or the entry should be dropped to avoid dead registry surface.
- EVIDENCE: `~/workspace/fyd4-stage/eligibility.ts` (SocialProof eligibility hard-false; "the generator emits no SocialProof section"), read 2026-09-22.
- DEPENDENCIES: `acq-ordered-rule-bundles` (review extraction would be a rule tier).
- ACCEPTANCE: a decision: SocialProof is either fed by a documented ingestion path with eligibility rules or removed from the registry.
- NEXT FALSIFICATION: if review data exists in captures and SocialProof stays dormant with no plan, the registry is carrying dead surface and the decision is falsified by inaction.

**42. ID: `registry-ai-vocabulary` | DOMAIN: COMPONENT REGISTRY | STATUS: HARVEST | PRIORITY: 3**
- WHY: json-render's first primitive is a catalog-derived machine-readable AI vocabulary: the registry becomes the promptable contract so intelligence emits constrained patches, not arbitrary code. Intelligence produces data (AI to SitePatch), never arbitrary JSX.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 1 (json-render verdict: harvest the typed-catalog pattern; adapter sketch specified with a two-evening proof), dated 2026-09-22.
- DEPENDENCIES: `registry-declared-contracts`, `sitespec-owner-patch-loop`.
- ACCEPTANCE: a tiny proof shows the registry generating a constrained vocabulary that an intelligence layer uses to emit a valid SitePatch with no free-form code.
- NEXT FALSIFICATION: if the vocabulary cannot express a real owner intent (reorder, feature, theme change) without hand-authoring, the pattern is falsified for FYD's use.

**43. ID: `registry-object-rail` | DOMAIN: COMPONENT REGISTRY | STATUS: DONE_VERIFIED | PRIORITY: 3**
- WHY: ObjectRail is the featured-object doorway: the richest related object rendered inline with image, title, subtitle, meta, and a real capability action. It is the centerpiece pattern of the FYD experience (object in the margin), not decoration.
- EVIDENCE: `~/workspace/fyd4-stage/generator.ts` (ObjectRail featured selection), dated 2026-09-22; memory record of the product emphasis (2026-09-21); `~/workspace/fyd-portal-proof/PROOF.md` measurements, dated 2026-09-21.
- DEPENDENCIES: `sitespec-eligibility-contract`.
- ACCEPTANCE: the ObjectRail renders the richest related object with its capability actions on desktop and the drawer/sheet equivalent on mobile.
- NEXT FALSIFICATION: if the ObjectRail ever features an object with no backing evidence or no real capability, the presentation is falsified.

**44. ID: `registry-askfyd-answer-shape` | DOMAIN: COMPONENT REGISTRY | STATUS: OPEN | PRIORITY: 2**
- WHY: Ask FYD correctly refuses to invent (adversarial test PASS), but the `AskAnswer` shape is missing three required fields: per-sentence claim classifications, a separate unknowns list, and explicit source_urls (URLs are currently embedded in evidenceRef detail strings). Closing these is Ask-layer work after extraction produces service objects.
- EVIDENCE: `~/workspace/fyd-lane/ask-fyd-evidence-gap.md` sections 3 and 5 (gaps recorded), dated 2026-09-21.
- DEPENDENCIES: `acq-real-capture-service-gap`.
- ACCEPTANCE: every factual sentence carries a classification (DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION), unknowns are an explicit list, and source_urls is a first-class field.
- NEXT FALSIFICATION: ask a service question after extraction lands; any uncited factual sentence or missing unknowns list falsifies the answer contract.

---

## DOMAIN: WEBSITE ACQUISITION ESCALATION

**45. ID: `escalation-stack-pinned` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: DONE_VERIFIED | PRIORITY: 2**
- WHY: The current stack is documented: static HTTP fetch as the default (L0/L1), Playwright as the rendered-site escalation rung (L2, pinned 1.63.0, real rendering engine). Playwright supplies actual JS execution and visual proof. No evidence yet that the current stack has failed to acquire required evidence.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 6 (Crawl4AI/Lightpanda verdict sheet), dated 2026-09-22, referencing `ACQUISITION-STACK.md` (2026-09-21) pinning Playwright 1.63.0 as the L2 engine.
- DEPENDENCIES: none.
- ACCEPTANCE: the pinned versions stay the documented default; any escalation rung documents its trigger.
- NEXT FALSIFICATION: an acquisition failure on a real required-evidence site falsifies "current stack is sufficient" and arms the escalation ladder.

**46. ID: `escalation-crawl4ai-design-harvest` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: HARVEST | PRIORITY: 2**
- WHY: Crawl4AI is design-harvest only: SSRF destination validation, declarative request trust boundary, Shadow DOM flattening, CMP consent list, and 3-tier anti-bot detection. Rejected: the Docker server (RCE/SSRF/auth-bypass/file-write advisory history), LLM extraction (nondeterministic, prompt-injection surface), circumvention, and proxy escalation.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 6, dated 2026-09-22.
- DEPENDENCIES: `escalation-stack-pinned`.
- ACCEPTANCE: FYD reimplements only the named design patterns as small primitives; no Crawl4AI dependency is adopted.
- NEXT FALSIFICATION: if a Shadow-DOM or consent-walled site blocks required evidence and the harvested pattern does not resolve it, the pattern's sufficiency is falsified.

**47. ID: `escalation-lightpanda-ladder` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: HARVEST | PRIORITY: 3**
- WHY: Lightpanda is rejected as a default and as browser-proof replacement (no real rendering engine, no meaningful screenshots; AGPL-3.0; nightly-only releases). It stays a conditional escalation rung for DOM-only bulk acquisition, armed only by the benchmark trigger.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheet 7 (verdict: REJECT as default, CONDITIONAL as benchmark-only DOM acquisition rung), dated 2026-09-22.
- DEPENDENCIES: `escalation-benchmark-trigger`.
- ACCEPTANCE: AGPL-3.0 legal review completes before any deployment; it is never used for visual proof.
- NEXT FALSIFICATION: if the benchmark trigger fires and Lightpanda's DOM output is semantically inferior to Playwright's, the rung is falsified.

**48. ID: `escalation-benchmark-trigger` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: DECISION | PRIORITY: 3**
- WHY: Benchmarks of alternative acquisition tooling are held per Nolan's 2026-09-21 FOCUS NOW directive. The trigger is explicit: "current stack cannot acquire required evidence" after the structured-data repair. No speculative tool enthusiasm.
- EVIDENCE: `~/workspace/fyd-lane/harvest-ecosystem.md` sheets 6 and 7, dated 2026-09-22.
- DEPENDENCIES: `acq-real-capture-service-gap`.
- ACCEPTANCE: the trigger stays written and un-armed; no benchmark runs until an actual acquisition failure occurs.
- NEXT FALSIFICATION: an actual failure to acquire required evidence arms the trigger; continued deferral past that point falsifies the decision.

**49. ID: `escalation-ssrf-media-fetch` | DOMAIN: WEBSITE ACQUISITION ESCALATION | STATUS: PROVE | PRIORITY: 1**
- WHY: Remote media fetch needs an SSRF boundary: allow only HTTP/HTTPS public origins; reject localhost, loopback, RFC1918, link-local, and cloud metadata endpoints; enforce size limits, content-type verification, timeouts, and redirect limits. The rights gate and pipeline-manifest validation exist; the hostile-URL falsification is the remaining proof.
- EVIDENCE: `~/workspace/fyd-lane/website-builder-authority-decisions.md` (SSRF boundary spec, 2026-09-21); `~/workspace/fyd4-stage/bundle-media.ts` (production-truth manifest validation, dated 2026-09-22).
- DEPENDENCIES: none.
- ACCEPTANCE: a hostile URL fixture battery (localhost, 169.254.169.254, oversized payload, wrong content-type) is rejected with typed failures, never fetched.
- NEXT FALSIFICATION: any hostile URL reaching a fetch falsifies the boundary.

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
- `~/workspace/fyd-lane/website-builder-authority-decisions.md` (2026-09-21): CEO decisions (media, SSRF, owner mode, Ask FYD, gates, layer separation, moat).
- `~/workspace/fyd-lane/safe-link.ts` and `safe-link.test.ts` (2026-09-21): URL capability boundary.
- `~/workspace/fyd-lane/mobile-overflow-trace.js` (2026-09-21): overflow diagnosis tool and verdict rule.
- `~/workspace/FAILURE_LEDGER.md` (2026-09-21): FL-20260921-031, 032, 033, 034, 037.
- `~/workspace/fyd-proof-run/regen.ts`, `step2-diff.ts`, `step5-hostile.ts` (2026-09-21): regen determinism, diff tripwire, hostile fixtures.
- `~/workspace/fyd-portal-proof/PROOF.md` (2026-09-21): browser proof matrix, unverified areas.
- `~/workspace/fyd-lane/h0-hardcoded-audit.md` (2026-09-21): hardcoded customer facts audit.
- `~/workspace/fyd-lane/reachability-report.md` (2026-09-21): dev server reachability boundary (not directly product, reviewed for context).
- `~/workspace/fyd4-stage/schemas.ts`, `eligibility.ts`, `generator.ts`, `planner.ts`, `bundle-media.ts`, `pipeline-invariants.test.ts` (2026-09-22): staged SiteSpec architecture.
- `~/workspace/fyd-build/work/src__fyd__sitespec__types.ts`, `src__fyd__sitespec__schemas.ts`, `src__fyd__proceduralize__generator.ts`, `src__fyd__proceduralize__patch.ts` (captured 2026-09-21): transfer copies of core modules.
- `~/workspace/fyd-harvest/harvest-report.md` (2026-09-21): C1-C9 adapt candidates, D1-D11 danger list, architecture section.
- Memory records: `MEMORY.md#L185` (2026-09-22, architecture invariants), `memory/2026-09-21.md#L713` (javascript URL sink), `L716` (fixture triage), `L1421` (semantic determinism).

## SOURCES UNAVAILABLE

- `/home/nolan/projects/ping` (live product repo): explicitly off limits per task constraints. All repo claims are via workspace mirror copies and dated lane reports, not the live tree.
- `~/workspace/BACKLOG_NOLAN.md`: explicitly off limits per task constraints.
- Live upstream GitHub repositories (vercel-labs/json-render, puckeditor/puck, buildingopen/openpage, webstudio-is/webstudio, vercel/ai, crawl4ai/crawl4ai, Lightpanda-io/browser): only pattern-level archaeology was available (per `fyd-lane/harvest-report.md` note that GitHub/API sources were unavailable). No direct source review; version and license facts are as-reported in the workspace verdict sheets.
- Live hard sites for acquisition benchmarks: benchmarks are held per Nolan's 2026-09-21 FOCUS NOW directive, so no real failure-site evidence exists.

## CONTRADICTIONS AND SUPERSESSIONS

1. Memory `memory/2026-09-21.md#L713` says the javascript URL sink "remains OPEN as FL-20260921-031", but the ledger entry FL-20260921-031 is the ObjectFeed validation failure; the URL sink is FL-20260921-032. The memory line mis-numbers the ledger id. The sink defect itself was fixed by `safe-link.ts` on 2026-09-21; committed-integration proof remains.
2. The 375px mobile overflow report was superseded: the real committed-build defect was at 320px in Ask FYD design-token rows, fixed with one-class `min-w-0` (FL-20260921-033). The 375px reading was a dirty-worktree artifact.
3. SiteSpec type shapes differ by vintage: `fyd-build/work` transfer copies (2026-09-21) show an earlier token/context shape; `fyd4-stage` files (2026-09-22) show the newer staged architecture with manifests, owner intent, and expanded tokens. Treated as chronology, not contradiction.
4. `~/workspace/evidence-binding.md` is not the FYD render-boundary claim-binding document; it is an unrelated ORCA autonomy evidence binder (2026-09-18). The actual FYD binding material lives in `fyd-binding-verifier/`, `fyd4-stage/planner.ts`, `website-builder-authority-decisions.md`, and the memory record.

## Recommended follow-ups for the parent agent

- The single highest-leverage lane is `acq-real-capture-service-gap`: extraction machinery is proven but real captures yield zero service objects, so Ask FYD cannot answer service questions on real businesses yet.
- The committed-integration gap for `safe-link.ts` (uncommitted module) should be closed before the URL sink is treated as fully done in the shipped renderer.
- `sitespec-objectfeed-external-identity` is a live spec-validation failure on the coppersmith Explore page and should be resolved before any demo ships that page.
- All HARVEST items stay future-only; none is adopted without the recorded trigger.
