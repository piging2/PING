# Falsifier-3 (acquisition) report: INVALIDATED (2026-09-24 ~19:30 MDT)

The acquisition-chain falsifier (worker 33adb3c2) reported against a phantom environment:
- Stated branch under test: `fyd/edge-object-experience` @ `ce1da5c`, tree `/home/nolan/build-edge`.
  VERIFIED: no such path exists on the Pig. Real tree: `/home/nolan/build-edge-port`,
  branch `fyd/edge-port` @ `243fb120`.
- 4 of 5 cited files do not exist in the real tree:
  MISSING: evidence/acquisition-coppersmith-plumbing-2026-09-22.json,
           scripts/regen-fixtures/regen.js,
           src/fyd/proceduralize/load-fixture.ts,
           src/fyd/ask/refs.ts
  EXISTS: src/fyd/proceduralize/service-cards.ts (real, but different content/shape than cited)
- Headline "FIRST BROKEN LINK at stored bytes -> business observations" (operator constants
  for phone/area_served/description): FALSE for the current tree. The cited regen.js does
  not exist; the current pipeline extracts the phone mechanically (see below).

The deliverable `falsify-acquisition-h1.md` is UNRELIABLE and must not be used as evidence.
(The worker was honest in its caveat that the hinted paths "don't exist here"; the findings
do not transfer to the real tree.)

## Direct coordinator verification (replaces the falsifier-3 verdict)

Real acquisition chain in build-edge-port @ 243fb120:

1. ACQUISITION -> STORED BYTES: `src/fyd/proceduralize/raw/coppersmith-plumbing/` holds
   index.html (117,898 bytes), rss.xml, sitemap.xml, fetched 2026-09-21T12:01:10Z per
   `runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md` (robots.txt honored, crawl-delay 10).
2. BYTES -> OBSERVATIONS: extraction pipeline discover -> parse -> normalize -> extract ->
   resolve -> project (proceduralizer.ts). JSON-LD @graph envelopes ARE handled
   (structured-data.ts:167, explicitly referencing RUN-NOTES.md failure #1 — the documented
   highest-value fix was implemented). Service cards extracted deterministically with
   per-card byte spans (service-cards.ts:244, "elementor-cta-services" detector).
3. OBSERVATIONS -> GRAPH: `regression-corpus.test.ts` runs the pipeline against the REAL
   stored bytes and asserts `fields["phone"] === "970-245-3869"` with class DIRECT_FACT.
   RERUN 2026-09-24 ~19:30 MDT: 2/2 PASS. The phone is mechanically extracted, not a constant.
   structured-data.test.ts test 10: "Coppersmith real shape: @GRAPH VERIFIED, telephone found".
4. GRAPH -> PROJECTION: `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`,
   dumped 2026-09-24 15:38 UTC by dumper-1.2.1, with baseDigest, graphDigest,
   fixtureFileDigest, eventSequences. 8 objects, 7 relationships, all provenance-bound.

## Corrected verdict

Arrows 2 (acquire -> evidence) and 3 (evidence -> stable object graph) are GREEN:
mechanical, deterministic, and test-covered against the real stored bytes. The phantom
report's "operator constants" finding described a pre-fix state that no longer exists.

Arrow 1 stays PARTIAL: the stored acquisition is real and documented, but the operator
"paste URL -> acquire" UI path is unproven (H18-20 work).
