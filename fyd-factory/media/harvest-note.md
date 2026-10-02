# LANE-MEDIA harvest note (2026-09-23)

PING repo `/home/nolan/projects/ping`, branch `fyd-factory`.
Module version: `fyd-media@2` (`src/fyd/media/types.ts`: `MEDIA_MODULE_VERSION`).

Per pipeline link: PROBLEM / EXISTING IMPLEMENTATION / REUSABLE? / DECISION.

## 0. Task premise check: `scripts/image-pipeline.mjs`

- PROBLEM: the task asserts an image-pipeline script exists at `scripts/image-pipeline.mjs`.
- EXISTING IMPLEMENTATION: none. `ls scripts/image-pipeline.mjs` -> no such file. No `*image*`/`*media*` scripts under `scripts/` at all.
- REUSABLE?: n/a (absent).
- DECISION: premise corrected, not blocking. The pipeline is a TypeScript module under `src/fyd/media/` (jest-run, sharp-based), not a scripts/ artifact. `scripts/` is not part of the media story.

## 1. SOURCE IMAGE (discovery)

- PROBLEM: find candidate image references on a business site without hand-rolling an HTML parser.
- EXISTING IMPLEMENTATION: `src/fyd/media/discover.ts` `discoverImages(html, pageUrl)`. Pure function. Extracts `<img>` (src, data-src, data-lazy-src, data-original, srcset best-candidate), `<meta property="og:image">`, `<link rel="image_src">`, JSON-LD `image` fields (parsed JSON with a legacy regex fallback). HTML parsing via the ecosystem package `node-html-parser` (explicitly chosen as commodity; PING had no HTML parser to harvest). 7 tests in `discover.test.ts`, all passing.
- REUSABLE?: yes, as-is.
- DECISION: reuse. No new discovery code.

## 2. OBSERVATION

- PROBLEM: every fetch attempt, success or failure, must leave a typed evidence trail.
- EXISTING IMPLEMENTATION: `MediaObservation` in `types.ts` (`ingested | failed | rejected | duplicate`, with reason, digest, redirectChain). `ingest.ts` pushes one observation per discovered reference per run; manifest carries the full observation log.
- REUSABLE?: yes.
- DECISION: reuse. The new contract tests do not re-model observations.

## 3. RIGHTS GATE (authorization before bytes move)

- PROBLEM: unclear-provenance / third-party imagery must never be acquired, derived, or served as FYD media; provenance must carry the authorization status.
- EXISTING IMPLEMENTATION: `discover.ts` `classifyRights(imageUrl, businessSlug, sourceOrigin)` -> `RightsSource` (`business-provided | public-demo-source | unclear-reference-only`) plus a human `rightsBasis` sentence that never implies FYD copyright ownership. `ingest.ts` classifies BEFORE any fetch: `unclear-reference-only` assets are `rejected` (reference retained, bytes never fetched). `isAcquirable()` in `types.ts` is the single enforcement predicate; `bundle-media.ts` and `select.ts` re-apply it defense-in-depth.
- REUSABLE?: yes.
- DECISION: reuse. The unauthorized-source-excluded test reuses `classifyRights` + `isAcquirable` + `validatePipelineManifest` (a manifest containing a non-acquirable object is rejected as a unit).

## 4. SAFE FETCH (SSRF gate, size caps, content-type)

- PROBLEM: server-side fetch of arbitrary URLs must be SSRF-safe, bounded, and content-typed.
- EXISTING IMPLEMENTATION: canonical at `src/fyd/net/safe-fetch.ts` (the ONE SSRF implementation; `src/fyd/media/safe-fetch.ts` is a re-export shim). `safeFetch(url, opts, deps)`: http/https only, credential-bearing URLs rejected, per-hop DNS resolution against non-public space (loopback, RFC1918, link-local incl. 169.254.169.254, multicast, CGNAT/tailnet, IPv4-mapped v6), max 5 redirects with every hop re-validated, content-type allowlist checked before buffering, content-length pre-check plus streaming abort at `maxBytes` (default 15MB; pages 5MB), connect+overall timeouts. `safeFetchImage()` pins `allowContentTypes` to image/* (jpeg/png/webp/avif/gif; SVG excluded: executable vector content, never executed). Injectable `deps` (dnsLookup, fetchImpl) for tests. Net tests in `src/fyd/net/__tests__/safe-fetch.test.ts` pin the gate.
- REUSABLE?: yes.
- DECISION: reuse the canonical module. The new contract tests exercise `safeFetchImage` (via the media shim) for unsafe-URL and oversized cases with injected deps: no network, no new fetch code.

## 5. DIGEST

- PROBLEM: content-addressed identity and dedupe key; same bytes must always yield the same digest.
- EXISTING IMPLEMENTATION: `hashContentBytes()` in `derivatives.ts` (node:crypto sha256). Media ids derive from the digest (`fyd-media-<16 hex>`); relationship ids derive from the digest; derivative paths are `/fyd-media/<sha256>/`.
- REUSABLE?: yes.
- DECISION: reuse. New contract test pins digest stability with a known-answer vector (sha256 of `abc`).

## 6. METADATA (dimensions, format from actual bytes)

- PROBLEM: shape must be observed from bytes, never declared by filename or invented.
- EXISTING IMPLEMENTATION: `generateDerivatives()` reads `sharp(input).metadata()` -> width/height/format. Decompression-bomb guards: max 8000px per axis, 64M pixels total; non-image bytes throw (magic-byte parsing). Metadata flows into `FydMediaObject.width/height/originalFormat` and every `MediaVariant`.
- REUSABLE?: yes.
- DECISION: reuse.

## 7. DERIVATIVES

- PROBLEM: bounded, content-addressed renditions the product actually needs; no speculative ladder; never hotlink.
- EXISTING IMPLEMENTATION: `derivatives.ts`. Rendition constants REUSED from `src/lib/media-constants.ts` (`WEBP_QUALITY`, `THUMBNAIL_WIDTH/QUALITY`, `BLUR_WIDTH/QUALITY`; not duplicated). Plan: thumbnail 480w, card 768w, hero 1600w, blur 10w; never upscales (small sources get one rendition at source width). Every variant stamps shape + proof (sha256 of its own bytes) and `derivedFrom` (sha256 of the original). Files under `<publicDir>/<sha256>/<name>-<width>w.webp`; public URLs rooted at `/fyd-media`. `derivatives.test.ts` pins the plan, the derivedFrom invariant, non-image rejection, and the bomb guard.
- REUSABLE?: yes.
- DECISION: reuse. No new derivative code.

## 8. PROVENANCE RECORD

- PROBLEM: ask FYD and "why this?" must cite the full chain: source URL, observed-at, digest, rights basis, derived-asset relationships.
- EXISTING IMPLEMENTATION: `provenance.ts` (`getMediaProvenance`, `listMediaProvenance`): read-only projection over the manifests. Every record carries sourceUrl/sourcePage/observedAt, digest, dimensions, rightsSource + rightsBasis, and per-variant `derivedFrom` + `servedFrom`. Unclear-reference-only assets are never minted, so they never appear. `provenance.test.ts` pins the record shape.
- REUSABLE?: yes.
- DECISION: reuse.

## 9. RENDER (selection + display)

- PROBLEM: the ONE deterministic selector every surface uses; never invent an image when none is acquired; media follows its object, never a page slot.
- EXISTING IMPLEMENTATION: `select.ts`: `listObjectMedia` (semantic attachment via `attach.ts`: Business represented_by Media, Service illustrated_by Media, Project has_media Media), `heroMediaFor` (hero-role first, else photographic; logos NEVER heroes), `galleryMediaFor`. `renderer.tsx` Hero renders the threaded `DisplayMedia` with provenance-only "Why this?"; null media -> typographic hero, no invented image. `circle-background.ts`: deterministic warm gradient fallback (sha256 of objectId) labeled "Deterministic fallback, no authorized site media" when no acquired media. `select.test.ts` pins the hero rule against real manifests plus fixture manifests, and the render wiring.
- REUSABLE?: yes for the auto selector.
- DECISION: reuse the auto selector. ONE gap found (see Built below): the steering binding requires owner selection to outrank auto, and no owner-override seam exists.

## Gaps found (built this lane)

### G1. Owner-selected hero outranking auto. MISSING, now built.
- PROBLEM: FYD steering (mobile object experience rebuild, 2026-09-23): "deterministic hero selection with owner selection outranking auto." No implementation existed (grep for ownerHero/owner-hero/heroOverride across src/fyd: zero hits).
- NEW: `src/fyd/media/owner-hero.ts` `resolveHeroMedia(siteId, graph, objectId, ownerHeroId)`. The owner id is validated, not trusted: it must name an acquired, photographic (non-logo), variant-bearing asset attached to the object. Valid -> `basis: "owner"` and the owner's asset wins even when auto would pick a different one. Stale/mistyped/revoked/unauthorized id -> `basis: "owner-fallback"`, auto result, and the `note` says why. No owner id -> `basis: "auto"`. Deterministic: same inputs, same resolution.
- Why new instead of modifying `select.ts`: shared file; this is the additive seam. The auto selector is untouched.

### G2. Synthetic/demo media marking. MISSING, now built.
- PROBLEM: "no fabricated photos presented as real; synthetic/demo media clearly marked." The pipeline structurally excludes invented imagery (validatePipelineManifest requires digest+variants+provenance; heroMediaFor returns null without acquired photos; circle fallback is an honestly-labeled gradient), but there was no marking authority for intentionally generated assets (AI-generated placeholders, demo mocks): no "synthetic" member in `RightsSource`, no render-caption policy.
- NEW: `src/fyd/media/synthetic.ts`: `markSynthetic(digest, mark)` mints a digest-keyed synthetic record; `renderCaption(marked, photoBasis)` composes the render sentence: synthetic assets always render as "AI-generated placeholder image. Not a photograph of this business." (kind-specific variants), never as photos; a synthetic record with an empty caption throws at mint time (the mark is the honesty). `isMarkedSynthetic()` predicate.
- Shared-file change needed for full pipeline integration -> patch proposal P1 below.

### G3. Missing link tests for the five required cases. MISSING, now built.
- NEW: `src/fyd/media/__tests__/pipeline-contract.test.ts`: (1) happy path end-to-end without network: generated PNG bytes -> digest -> metadata -> derivatives -> manifest validation -> fixture-manifest hero selection with a local `/fyd-media/` src; (2) unsafe URL rejected (file:, javascript:, credential-bearing, 127.0.0.1, redirect-to-169.254.169.254 via injected deps); (3) oversized image rejected at the fetch gate (streaming abort and declared content-length, injected deps) plus the derivatives bomb guard is re-pinned; (4) digest stability (known-answer sha256 vector, double-run equality, avalanche); (5) unauthorized source excluded (off-origin -> unclear-reference-only -> not acquirable; manifest containing such an object fails production-truth validation as a unit; the ingest gate predicate chain is pinned).
- NEW: `src/fyd/media/__tests__/owner-hero.test.ts` (8 tests) and `src/fyd/media/__tests__/synthetic.test.ts` (7 tests).

## Patch proposals (shared files; NOT applied)

- P1 (types.ts): add `"synthetic"` to the `RightsSource` union and an optional `synthetic?: { kind, generator, createdAt, caption }` field on `FydMediaObject`; extend `validatePipelineManifest` so a synthetic asset is servable only when it carries a non-empty caption. Until then, `synthetic.ts` is the marking authority and synthetic assets stay out of manifests.
- P2 (ingest.ts): thread an optional `SafeFetchDeps` through `ingestSiteMedia` -> `safeFetchPage`/`safeFetchImage` so the rights-gate + fetch + dedupe chain is unit-testable without network (today only the gate predicates are testable; the orchestration is network-bound).
- P3 (renderer.tsx Hero / object/view.ts): accept an optional owner hero selection id at the render seam and resolve it through `resolveHeroMedia` instead of `heroMediaFor` directly, so the owner override reaches the page.
