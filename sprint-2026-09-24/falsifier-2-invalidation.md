# Falsifier-2 report: INVALIDATED (2026-09-24 ~19:00 MDT)

The graph->SiteSpec falsifier (worker 29f1d497) reported against a phantom environment:
- Claimed tree `/home/nolan/build-edge`, branch `fyd/edge-object-experience @ ce1da5c`. VERIFIED: no such
  path exists on the Pig. Real tree is `/home/nolan/build-edge-port`, branch `fyd/edge-port @ 243fb120`.
- Claimed `:3101 DOWN`. VERIFIED: :3101 UP (pid 95701), coppersmith 200, at the same time.
- Headline "FIRST BROKEN LINK" (hardcoded ClaimBadge taking no props): FALSE for the real tree.
  Real `ClaimBadge` (renderer.tsx:338) takes `objects: PingObject[]` and renders
  `claimBadgeLabel(objects)` which reads `o.fields["claimKind"]` (renderer.tsx:318-321). Data-bound.
- Claimed live `GET /api/why-this` returned `found:true`. FALSE: no `/api/why-this` route exists
  in this tree (returns the Next app shell = 404-path). Cited evidence paths
  (`evidence/observations-*.json`, `evidence/coppersmith-2026-09-22.html`) do not exist.
- Cited line numbers (renderer.tsx:125-129, generator.ts:261) do not match the real tree.

The report's verifiable claims were checked; the headline finding is wrong. The deliverable
`falsify-graph-sitespec-h1.md` is UNRELIABLE and must not be used as evidence.
Lesson: falsifier subagents must ground their environment first (verify paths exist via
pigwsl-run.sh) before reporting. The still-running acquisition falsifier (worker 33adb3c2)
gets the same validation when it lands.

## Direct coordinator verification (replaces the falsifier-2 verdict)

Projection: `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`
- 8 objects, 7 relationships. Every object carries
  `provenance: {kind: "website-derived", ref: "website-ingestion:https://www.coppersmithplumbing.com/",
  derivedAt: "2026-09-21T..."}`, `fields.claimKind = "website_statement"`.
- Meta: siteId, dumpedAt, dumperVersion, baseDigest, fixtureFileDigest, graphDigest,
  eventSequences, presentationIntentDigest.
- Relationships carry `evidenceRef` (e.g. "proceduralizer:project:service-card:elementor-cta-services:cooling")
  but NO code in src/fyd/ reads `evidenceRef`: write-only provenance. Minor dead end.

Live serving path (all verified by direct test 2026-09-24 ~19:00 MDT):
- Page carries 20 `data-fyd-object-id` markers; card titles/descriptions verbatim from objects.
- ClaimBadge renders from `o.fields["claimKind"]` (data-bound, fail-soft to "").
- `POST /api/fyd/ask/coppersmith-plumbing {"question":"What services do you offer?"}` ->
  `{"ok":true,"answer":"Related offerings: Plumbing; Heating & Cooling; HVAC; Ventilation. [12]",
  "answerClass":"supported","citations":[{"n":12,"id":"...-service-139408827c27",
  "label":"service: Plumbing","source":"The business website (https://www.coppersmithplumbing.com/)",
  "basis":"The site's own words (website statement, not verified fact)","lastChecked":"2026-09-21",
  "claimClass":"supported"}]}`. Citation resolves object -> provenance -> source URL mechanically.

## Corrected verdict

The chain DOM -> object -> provenance -> Ask citation RESOLVES on the served path.
"Evidence" at the object level is provenance (source URL + derivedAt + digests), NOT byte-level
observation spans. The NOW-1 byte-observation layer is absent from the served projection;
the minimum contract the proof actually exercises (source identity, temporal identity, digests)
is present. Whether byte-level observation provenance is required is a scoping decision for
the H4 critical-path recompute, not a broken arrow in the visitor journey.

Remaining known gap in this segment: relationship `evidenceRef` is write-only (dead provenance).
Candidate CLEANUP item, not journey-blocking.
