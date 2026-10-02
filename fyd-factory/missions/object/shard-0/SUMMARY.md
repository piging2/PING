# OBJECT-SHARD-0 SUMMARY

Missions 0..499. Harness: fixture graph -> generateSiteSpec -> validateSiteSpec/isRenderable -> buildRenderContext -> SitePageView/renderToStaticMarkup on every page -> double-compile SHA-256 determinism check -> VERIFY. Read-only against the Pig repo (`/home/nolan/projects/ping`, branch `fyd-factory`, HEAD `e48ef710`); the repo was never modified. Patches are proposals under `missions/patches/`, all `git apply --check` clean.

## Outcome

- 500/500 missions completed, 0 crashes, 0 determinism mismatches.
- GENERATED: 488. NEEDS_REVIEW: 12, all `hide-owner` failing validation with the typed finding "A site needs at least one page." (fail-closed, classified below; no patch proposed).
- Unsafe schemes rendered: 0. Hidden-object ID leaks: 0. Viewport meta present on all rendered pages.

## Performance

- Wall: 2.22 s for 500 missions. Throughput: 225 missions/s (13,514/min).
- Peak max RSS: 146,132 KB (~143 MB), via `/usr/bin/time -v`.
- Stage latency: mutate p50 0 ms / p95 1 ms; generate p50 2 / p95 4; render p50 2 / p95 4; determinism_check p50 2 / p95 4; verify p50 0 / p95 1.
- Pig load at final run: 2.65-2.95 on 24 cores (protocol saturation threshold 48). Fixture corpus 62 JSON files; rotation used 54 across the 5 required categories.

## Fixture rotation (corrected)

Round-robin across exactly the 5 required categories, 100 missions each: `batch-b` (8 fixtures: `batch-b/` + 4 loose `batch-b-*.json`), `trades-a` (4: `batch-a/`, mapped; the corpus has no literal `trades-a` directory), `clearwater` (1: `clearwater-plumbing-demo.json`), `professional` (1), `hostile` (40). Within a category the index is `floor(i/5) % len`, deterministic. 8 fixtures outside the 5 categories (conflicting-source, metadata-poor, multi-location, opengraph-heavy, person-heavy, rank-math-graph, service-heavy, simple-jsonld) are excluded from rotation and logged by the harness.

## Generic classes

### 1. RAIL-UNBOUND-DESCRIPTION (verified defect, patched, fix tested)

- DOMAIN: FYD site rendering, object rail surfaces
- COMPONENT: `src/fyd/components/renderer.tsx` (`ObjectRailSection`), `src/fyd/components/object-rail.tsx` (`pingObjectToProjection`, `pingObjectToView`)
- CLAIM: An object description with no provenance (an unbound factual claim) must never render in public HTML.
- EVIDENCE: Baseline missions 780 and 915 (`unbound-claim` mutation deletes provenance, sets sentinel `M{i} UNVERIFIED CLAIM: guaranteed 24 hour turnaround`): sentinel rendered in the rail's featured-object paragraph, labeled "Observed on website-ingestion". Both classified NEEDS_REVIEW / failure_stage verify / unbound_claim_count 1 by the corrected verifier. Minimized repro fixture `missions/fixtures/rail-unbound-description.json`: baseline build renders the sentinel (exactly 1 occurrence, in `ObjectRailSection`'s `<p class="text-sm leading-relaxed">`); patched build omits it while the bound variant (`rail-bound-description.json`, provenance intact) still renders (FIXED_OK). Patched harness rerun of missions 0-99: 13 `unbound-claim` missions, 0 sentinels rendered, 0 crashes.
- CALLER: `ObjectRailSection` (renderer.tsx:1610), `ObjectCircle` hover preview via `pingObjectToView`, `ObjectCard` via `pingObjectToProjection`
- CALLEE: raw reads `featured.description` / `(o.description ?? "").trim()`
- WRITER: the `unbound-claim` mutation path (any provenance-stripping ingestion); the rail adapters that read the field raw
- READER: public site visitor (static HTML for the section path; client hover preview for the adapter path)
- AUTHORITY: `resolveBoundField` / `verifyPresentationBinding` in `src/fyd/sitespec/graph.ts`, which the main sections honor via `boundField`/`boundDescription` and the rail bypassed
- CLASSIFICATION: binding-authority bypass (fail-open read in a presentation surface)
- CONFIDENCE: high (observed in static HTML across missions and a minimized repro; fix verified before/after)
- BROKEN BOUNDARY: presentation binding. The main content path requires a provenance ref before rendering a factual field; the rail read the same field with no check and fabricated a fallback receipt (`o.provenance?.ref ?? "website-ingestion"`).
- DEPENDENCIES: `src/fyd/sitespec/graph.ts` (authority, reused not duplicated); `src/fyd/components/renderer.tsx`; `src/fyd/components/object-rail.tsx`
- AFFECTS AGENTS: any agent rendering or auditing FYD public HTML; any consumer trusting rail provenance labels as receipts
- Patches (repo untouched, both `git apply --check` clean):
  - `missions/patches/0001-rail-bound-description.patch`: adds `boundRailDescription()` in `object-rail.tsx`, routing both adapters through `verifyPresentationBinding`; unbound descriptions become `""`, never rendered. Existing adapter tests stay green (their fixtures carry provenance refs).
  - `missions/patches/0002-rail-section-bound-summary.patch`: `ObjectRailSection` renders `featuredView.summary` (the gated value) instead of raw `featured.description`.
- Residuals (not patched, noted for the lane owner): `evidenceScore` still rewards unbound description words when choosing the featured object; rail adapters read `o.title` raw (title binding not gated); the `"website-ingestion"` fallback receipt remains for other surfaces. OBJECT shard-1 independently found this same class (OBJECT-UNBOUND-RAIL-LEAK, 8 missions) and proposed an overlapping patch (`missions/patches/object-rail-binding-gate.patch`) that additionally gates titles and featuring; the lane owner should reconcile the two proposals rather than applying both.

### 2. HIDE-OWNER-ZERO-PAGE (classified, no patch; fail-closed)

- When `hide-owner` (or `hide-object` hitting the owner) removes the only page-anchoring object, the generator emits zero pages and the validator rejects the spec with the typed finding "A site needs at least one page." The harness records NEEDS_REVIEW / failure_stage validate. 12 missions in the final run.
- No repository patch is proposed: any "fix" that renders would leak hidden owner content, which is exactly what the hide mechanism must prevent. The correct improvement is this classification: typed validator evidence, fail-closed, no silent empty site. Confidence: high.

### 3. Tooling gap (harness-only, repo untouched)

- `src/fyd/components/registry.ts` imports `./schema-roles`, which does not exist at that path (implementation lives at `src/fyd/sitespec/schema-roles.ts`, matching the code comment's intent). Plain tsx/Node execution fails; the harness works around it with an esbuild `onResolve` redirect plus empty CSS handling. Logged for the repo lane; not a per-mission failure.

### 4. Non-blocking observation

- Static rendering intermittently warns `Unsupported style property view-transition-name. Did you mean viewTransitionName?` No mission crashed or changed outcome because of it.

## Verification corrections applied this shard

- The old verifier exempted a rendered unbound sentinel when any claim badge string ("Site record", "Observed on", etc.) appeared in the HTML. The rail's badge is a fabricated fallback, not a binding receipt, so the exemption hid real leaks. Corrected: for `unbound-claim` (provenance deleted), any rendered sentinel counts (`unbound_claim_count = 1`, NEEDS_REVIEW/verify).
- `unbound-claim-tamper` (provenance intact, graph carries the changed value) is deliberately NOT counted: rendering the graph's own bound value with its real receipt is the designed behavior. Its renders are recorded via `sentinel_rendered` for reporting (41/41 rendered in the final run, all GENERATED).

## Files

- `results.jsonl`: final 500-mission run (missions 0-499, baseline repo).
- `results.500-999.jsonl`: supplementary baseline sample; contains the two observed leaks (missions 780, 915).
- `results.patched-0-99.jsonl`: improve-once rerun with the candidate patches applied via esbuild redirect (repo untouched).
- `scratch/`: harness source, build scripts, repro, patched file copies.
- `../../fixtures/rail-unbound-description.json`, `rail-bound-description.json`: minimized repro fixtures.
- `../../patches/0001-rail-bound-description.patch`, `0002-rail-section-bound-summary.patch`: proposed patches.
