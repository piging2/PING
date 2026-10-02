# OBJECT shard-1 SUMMARY (missions 500-999)

Worker: OBJECT-SHARD-1. Repo: /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710 (read-only; never touched, never committed). Harness: single tsx invocation on the Pig importing the repo's real pipeline modules (proceduralize/generator, sitespec/validator, components/renderer, sitespec/graph). 500/500 missions completed, results.jsonl (500 lines).

## Outcome distribution

| outcome | count |
|---|---|
| GENERATED | 492 |
| NEEDS_REVIEW | 8 |
| GENERATED_WITH_WARNINGS | 0 |
| CRASH | 0 |
| ACQUISITION_FAILED | 0 |

All 8 NEEDS_REVIEW are one generic class (OBJECT-UNBOUND-RAIL-LEAK); see below.

## Verify-assert scoreboard (500 missions)

- Determinism mismatches (compile twice, sha256 compare): 0
- unsafe_url_count > 0 in rendered HTML: 0 (201 unsafe-URL mutations injected, all neutralized by the safe-link seam)
- hidden_leak_count > 0: 0 (279 private-visibility object mutations injected, none visible in output)
- unbound_claim_count > 0 in output: 8 (204 unbound-claim mutations injected; 196 failed closed correctly, 8 leaked via ObjectRail)
- viewport meta missing: 0; sections == 0: 0; validation errors: 0; warnings: 0

## Latencies and throughput

- Per-mission total: p50 5 ms, p95 8 ms, max 41 ms. generateSiteSpec+validate+buildRenderContext+render is sub-10 ms at p95.
- Throughput: 500 missions in ~3.1 s wall on the Pig (single tsx invocation), about 9,800 missions/min.
- Peak RSS: 205 MB for a 500-mission run.
- Saturation: Pig load checked once before the heavy run: 1-min load 2.04 on 24 cores (limit would have been 48). No waits needed.

## Failure taxonomy

- NEEDS_REVIEW / render_verify / unbound_claim_in_output (8): mutated object with empty provenance ref (binding verdict "no evidence ref") still rendered as the featured object in the ObjectRail section. Generic class OBJECT-UNBOUND-RAIL-LEAK. Missions: 614, 619, 774, 784, 814, 829, 881, 921. Fixtures hit: hostile-rtl-hospitality, hostile-rtl-personal, hostile-nojsonld-prof, hostile-nojsonld-trade, hostile-rtl-trade, batch-a-electrician.
- No crashes, no fixture load failures, no validation errors across 500 missions.

## Generic class: OBJECT-UNBOUND-RAIL-LEAK

Root cause: ObjectRailSection (src/fyd/components/renderer.tsx) featured the richest public non-owner object and rendered its identity through pingObjectToView, which maps name: o.title and summary: o.description raw. That bypassed the projection seam's binding gate (boundTitle/boundDescription via resolveBoundField in src/fyd/sitespec/graph.ts): an object whose "direct" title binding fails still appeared in public HTML as the featured object, including its description and an aria-label naming it. All other render paths audited (12 boundTitle call sites, FydObjectCard, relationshipLine, section lists) already go through the verifier; renderer.tsx had zero raw object-title reads after the fix.

Improve-once loop, completed:
1. Minimized repro: missions/fixtures/unbound-rail-leak.json (business + person with empty provenance ref; marker UNBOUND-REPRO-MARKER).
2. Existing mechanism reused: resolveBoundField (src/fyd/sitespec/graph.ts) stays the single binding verifier. No second authority.
3. Patch: missions/patches/object-rail-binding-gate.patch, ONE authorized path (ObjectRailSection in renderer.tsx): candidates restricted to objects whose title binding verifies; the view receives the verified title/description; summary paragraph uses the verified value. Deterministic (filter preserves order, richestObject already deterministic, boundTitle pure).
4. git apply --check passes against the working tree.
5. Functional test on a patched COPY of the tree (repo untouched): repro marker gone from HTML.
6. Falsification: bound person still features (section not nuked); unbound-only candidates render the section without the marker and without crashing; determinism holds on the patched tree.
7. Reran the 8 affected missions plus 106 neighbors against the patched copy: 114/114 GENERATED, 58/58 unbound probes failed closed, 66/66 private mutations absent, 39/39 unsafe mutations neutralized.

Patch is proposed only; the repo was not modified. Integration writer owns application.

## Findings (shared record format)

### Finding 1: unbound object identity leaks through ObjectRail

- DOMAIN: fyd / projection seam
- COMPONENT: src/fyd/components/renderer.tsx :: ObjectRailSection
- CLAIM: The ObjectRail section rendered the featured object's title and description without passing them through the presentation-binding verifier, so an object whose "direct" binding fails (no evidence ref) still appeared in public HTML.
- EVIDENCE: 8/500 missions (614, 619, 774, 784, 814, 829, 881, 921) with outcome NEEDS_REVIEW, failure unbound_claim_in_output, binding probe verdict_ok=false reason "no evidence ref" and marker present in HTML; minimal repro at missions/fixtures/unbound-rail-leak.json; section-by-section render trace pinning the leak to the ObjectRail component query.
- CALLER: SitePageView -> renderSection(ObjectRail)
- CALLEE: richestObject + pingObjectToView (src/fyd/components/object-rail.tsx)
- WRITER: site spec generator (unchanged); READER: public site visitor
- AUTHORITY: presentation-binding verifier (src/fyd/sitespec/graph.ts :: resolveBoundField) was bypassed, not consulted
- CLASSIFICATION: generic class OBJECT-UNBOUND-RAIL-LEAK
- CONFIDENCE: 1.0 (reproduced on minimal fixture, replicated across 4 shards: 28 instances in 2000 missions)
- BROKEN BOUNDARY: "Every FACTUAL value rendered is read through boundField/boundTitle/boundDescription" (renderer projection-seam contract)
- DEPENDENCIES: sitespec/graph.ts (verifier), components/object-rail.tsx (adapters)
- AFFECTS AGENTS: integration writer (apply missions/patches/object-rail-binding-gate.patch); PROJECTION/SYNTH lanes (same seam)

### Finding 2: same leak pattern on the builder preview surface (not patched)

- DOMAIN: fyd / builder
- COMPONENT: src/app/build/[siteId]/build-client.tsx (lines ~92-106)
- CLAIM: The site-builder preview renders richestObject + pingObjectToView(featured) with raw featured.description, the identical unbound-title bypass on a second surface.
- EVIDENCE: code read of build-client.tsx; same adapter call chain as Finding 1.
- CALLER: build preview client; CALLEE: richestObject + pingObjectToView
- WRITER: builder lane; READER: site owner previewing
- AUTHORITY: binding verifier bypassed (same as Finding 1)
- CLASSIFICATION: generic class OBJECT-UNBOUND-RAIL-LEAK, second surface
- CONFIDENCE: 0.85 (code-path confirmed; not exercised by OBJECT missions, which cover the SitePageView path only)
- BROKEN BOUNDARY: same projection-seam contract
- DEPENDENCIES: same as Finding 1
- AFFECTS AGENTS: integration writer (apply the same gate; deliberately left out of the patch to honor one-authorized-path-per-patch)

### Finding 3: guards that held under mutation

- DOMAIN: fyd / projection seam
- COMPONENT: src/fyd/sitespec/safe-link.ts; renderer resolveQuery visibility filter; sitespec/graph.ts verifyPresentationBinding
- CLAIM: Across 2000 missions (4 shards), every injected unsafe URL (javascript:/data:/vbscript:, mixed case) was neutralized (0 unsafe href/src in output), every injected private-visibility object stayed out of public HTML (0 leaks), and 196/204 unbound-claim injections failed closed at the binding seam.
- EVIDENCE: results.jsonl across shards 0,1,2,3; rerun-patched.jsonl (114 missions on patched copy).
- CLASSIFICATION: negative result (guards verified)
- CONFIDENCE: 1.0
- AFFECTS AGENTS: none (informational; safe-link and visibility policy are trustworthy under these mutations)

## Patches proposed

- missions/patches/object-rail-binding-gate.patch (git apply --check: OK; functionally tested on a patched copy; repo untouched)

## Notes

- Protocol fixture group "trades-a" maps to corpus dir batch-a/ (the trade fixtures); mapping recorded in shard log and DIRMAP.
- Harness and shims live in missions/object/shard-1/ (harness.ts, probe.ts, repro-unbound.ts, falsify-rail.ts, gen-patch.py). Pig-side scratch (fixtures, patched copy) stays outside the repo at /home/nolan/fyd-factory/object-shard1/.
- Continuation: shards 0 (0-499), 2 (1000-1499), 3 (1500-1999) also run; see their SUMMARY.md files. Same generic class replicated (28 total instances in 2000 missions); no new classes.
