# TOURNAMENT DEFECT LIST (12)

Ranked by: currently open first (an agent must do real work blind), then healed-but-replayable with exact acceptance. Each defect is bounded: what is broken, where, how to reproduce, and the measurable acceptance that defines "fixed". No open-ended research tasks.

## TD-001: SiteSpec validation rejects Coppersmith Explore page (FC-001) -- OPEN

- PROBLEM: the generator produces an Explore page whose ObjectFeed uses an `all` query; validation expands the query across known schemas and ObjectFeed does not accept ping.social.external_identity@1, so the whole Coppersmith site renders "Spec failed validation".
- REPRO: regenerate Coppersmith fixtures; build the SiteSpec; validate; load the site in a browser.
- WHERE: the generator's Explore-page query expansion and ObjectFeed.acceptsSchemas (validation error path references pages.explore.sections[0].query). Fix direction: add ping.social.external_identity@1 to ObjectFeed.acceptsSchemas, or exclude non-feedable schemas from the `all` expansion.
- ACCEPTANCE: the Coppersmith SiteSpec validates with zero errors; the generated site renders (no "Spec failed validation" state); the Happy Place site still validates; a regression test exists that builds an Explore ObjectFeed against a graph containing an external_identity object and asserts the spec validates.
- EVIDENCE: FAILURE_LEDGER.md FL-20260921-031; ~/workspace/fyd-proof/coppersmith-plumbing-desktop.png, coppersmith-plumbing-mobile.png.

## TD-002: Ask FYD has no field-level privacy gate (FC-026) -- OPEN

- PROBLEM: hidden owner fields (phone, home address) may be revealed to public viewers. The renderer passed OWNER ADDRESS OVERRIDE; Ask FYD was never tested and is presumed leaky.
- REPRO: with a public viewer context and an owner viewer context, ask Ask FYD the same question about a hidden owner field.
- WHERE: the Ask FYD visitor-answer pipeline (src/fyd/ask/visitor-answer.ts and the route handler).
- ACCEPTANCE: a dual-context test: public viewer context + hidden owner field -> the answer does not reveal it; owner viewer context -> the answer does. Both directions asserted in a committed test.
- EVIDENCE: ~/workspace/BACKLOG_PING.md NOW-5 / FYD-010 (P1, OPEN).

## TD-003: Dangling evidence_refs are not failed closed (FC-025) -- OPEN

- PROBLEM: an Ask FYD answer can cite an evidence_ref that does not resolve in the target graph snapshot; nothing checks citation existence.
- REPRO: produce an Ask FYD answer containing one dangling evidence_ref; observe it renders as a citation.
- WHERE: post-answer validation in the Ask FYD answer path (GEN-CONSTRAINT work area).
- ACCEPTANCE: a test with one dangling ref fails closed: the claim is marked unsupported and is not rendered as a cited fact.
- EVIDENCE: ~/workspace/BACKLOG_PING.md NOW-3 / FYD-009 (P1, OPEN), GEN-CONSTRAINT (P1, IN_PROGRESS).

## TD-004: No wrong-journal fail-closed guard (FC-027) -- OPEN

- PROBLEM: FYD overlay emit/dump can run against a journal lacking the expected overlay marker and write silently against the wrong journal; no typed failure exists.
- REPRO: run the emit/dump tooling against a journal without the expected overlay marker; observe whether any write occurs.
- WHERE: the FYD overlay emit/dump tooling (~/workspace/fyd-lane, ~20 tool scripts + the repo registry additions for FYD_SITE_OVERLAY).
- ACCEPTANCE: a test: emit against a marker-less journal fails closed with a typed failure and writes zero rows; the journal is untouched (byte-identical before/after).
- EVIDENCE: ~/workspace/BACKLOG_PING.md NOW-9 / FYD-037 (P1, OPEN).

## TD-005: Real captures produce zero Service/Offer objects (FC-029) -- OPEN

- PROBLEM: the Tier-1 extractor passes synthetic tests, but the real Happy Place and Coppersmith captures yield zero Service/Offer objects. The broken boundary is acquisition evidence -> Service-object compilation.
- REPRO: run the real captures through the acquisition pipeline; count Service/Offer objects in the output graph.
- WHERE: the acquisition pipeline between evidence extraction and Service-object compilation (fyd-lane harvest/extract machinery).
- ACCEPTANCE: a real-capture run produces Service/Offer objects with provenance; a committed test pins the boundary (real bytes in, Service/Offer objects with provenance out).
- EVIDENCE: ~/workspace/BACKLOG_PING.md acq-real-capture-service-gap (P1, OPEN).

## TD-006: Fixture graphs remain a live read path (FC-012 residue) -- OPEN

- PROBLEM: ObjectView/CircleProjection read hardcoded fixture graphs (proceduralize/__fixtures__/) while Ask FYD and the rendered pages read the PING projection; the surfaces disagree on the service list (fixture-derived Decks/Fences/Pergolas vs "Pergola Design Consultations").
- REPRO: compare the service list from ObjectView, Ask FYD, and the rendered page for Happy Place.
- WHERE: src/fyd/object/view.ts and its consumers.
- ACCEPTANCE: a cross-surface consistency test: ObjectView, Ask FYD, and the rendered page agree on the service list for the same business object; fixture graphs become an explicit FIXTURE class, never a live read path.
- EVIDENCE: FAILURE_LEDGER.md FL-20260921-233; git commit fe74c481; ~/workspace/BACKLOG_PING.md one-canonical-read-model (P1, OPEN).

## TD-007: Stale/superseded evidence is bound without marking (FC-028) -- OPEN

- PROBLEM: Ask FYD can bind answers to superseded evidence with no stale-mark; answers are not versioned against the graph snapshot and regen does not stale-mark them.
- REPRO: advance the graph snapshot past the evidence an answer was built on; observe the answer is still served as current.
- WHERE: the Ask FYD answer path and evidence binding (version/as_of semantics).
- ACCEPTANCE: a test: an answer bound to superseded evidence is marked stale or fails closed; a regen against a new graph snapshot stale-marks previously built answers.
- EVIDENCE: ~/workspace/BACKLOG_PING.md FYD-013 (P2, OPEN), FYD-024 (P2, OPEN).

## TD-008: javascript: URLs reach rendered hrefs (FC-002) -- MECHANISM VERIFIED, live path pending

- PROBLEM: javascript: URLs in observed website/socials fields were interpolated verbatim into href. The resolver fix exists as tested artifacts; the live-path proof is still pending.
- REPRO: feed a hostile-content probe (javascript:alert(1) in website, javascript:alert(2) in socials) through the renderer; inspect rendered href attributes.
- WHERE: the site renderer (renderer.tsx, site-client.tsx): every observed-data href interpolation must pass resolveSafeLink.
- ACCEPTANCE: the fyd-lane/safe-link.test.ts suite (16/16: rejects javascript:, data:, vbscript:, file:, blob:, control-char and percent-encoded scheme tricks, malformed URLs, non-strings, unbased relatives; deterministic on repeat) plus a live hostile render showing zero hostile URLs in href attributes.
- EVIDENCE: FAILURE_LEDGER.md FL-20260921-032 + verification note (2026-09-23 ~01:55 MDT).

## TD-009: Claim provenance stamps one label for all sources (FC-006) -- FIXED, replayable blind

- PROBLEM (as found): ClaimBadge stamped every claim "Website statement"; overlay-authored demo content had no provenance kind at all. The reference fix: per-object claim source naming + DEMO_SYNTHETIC classification + lower builder confidence for demo content.
- REPRO: render claim badges on objects mixing website-sourced, feed-sourced, and overlay-authored content.
- WHERE: the provenance model and ClaimBadge; the visitor-answer citation pipeline (src/fyd/ask/visitor-answer.ts, src/fyd/builder/confidence.ts, src/fyd/components/renderer.tsx, src/components/ping/node-sections.tsx, src/components/ping/object-preview.tsx).
- ACCEPTANCE: each claim badge names its actual source (website statement / feed item / site record / demo addition / mixed); Ask FYD classifies overlay content DEMO_SYNTHETIC with honest citation labels; the reference tests src/fyd/components/__tests__/claim-badge.test.ts and src/fyd/ask/__tests__/demo-classification.test.ts pass.
- EVIDENCE: git commit fa0f7efa (FYD-001).

## TD-010: heroMediaFor() falls back to a logo as the hero banner (FC-007) -- FIXED, replayable blind

- PROBLEM (as found): with no hero-role asset, heroMediaFor() returned a logo-role asset, rendering a brand logo as a photographic banner. The reference fix: preference hero role, then other photographic roles, then null -> honest typographic hero.
- REPRO: call heroMediaFor() on a site with a logo-role asset and no hero-role asset; render the hero.
- WHERE: the media selection sort in the hero path (commit 7aecdeb7).
- ACCEPTANCE: no logo is ever returned as a hero banner (null when no photographic asset exists); the 20 reference hero/logo-rule tests pass; the media suite is 63/63 green.
- EVIDENCE: git commit 7aecdeb7 (DEFECT 1).

## TD-011: Media manifests are not production-truth validated (FC-008) -- FIXED, replayable blind

- PROBLEM (as found): preview, stale, or hand-written media manifests were accepted like real ones; the read path did no provenance validation. The reference fix: ingest stamps (generator, run id, pipeline version, preview marker) + validatePipelineManifest() on every read + preview manifests namespaced to manifests/preview/.
- REPRO: hand-write or preview-generate a manifest; read it via getPipelineManifest; observe it is accepted as production truth.
- WHERE: the media ingest/read path (ingestSiteMedia, getPipelineManifest, validatePipelineManifest, run-ingest.ts --preview).
- ACCEPTANCE: a preview or provenance-less manifest is rejected by the read path; the reference manifest validation tests (read-path rejection of preview and provenance-less files) pass; both committed manifests carry production stamps.
- EVIDENCE: git commit 7aecdeb7 (DEFECT 2).

## TD-012: Corrupt projection escapes as empty HTTP 500 (FC-009) -- FIXED, replayable blind

- PROBLEM (as found): a missing, corrupt, or digest-tampered projection threw past the route error mapping, producing an empty-body HTTP 500. The reference fix: projection_unavailable -> structured 503 with answerUnknown:true, plus a defensive internal_error 500.
- REPRO: corrupt happy-place.json (or a missing/digest-tampered projection); POST /api/fyd/ask; inspect the status and body.
- WHERE: the Ask FYD route and visitor-answer pipeline (src/fyd/ask/visitor-answer.ts, /api/fyd/ask route.ts).
- ACCEPTANCE: corrupt JSON -> HTTP 503 {ok:false, kind:"projection_unavailable", answerUnknown:true}; tampered digest -> 503; restoring the byte-identical projection -> HTTP 200 with the same evidence-backed answer; the reference throwing-loader unit test and route integration tests pass.
- EVIDENCE: git commit 14494c34 (lane-a).
