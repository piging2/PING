# Falsification: Coppersmith acquisition chain (H1-4)

Date: 2026-09-24 ~18:30 MDT. Worker: read-only falsifier. Nothing modified, no restarts, no DB writes.

Branch under test: `fyd/edge-object-experience` @ `ce1da5c`, tree at `/home/nolan/build-edge`
(note: the task's hinted paths `/home/nolan/build-edge-port` @ `243fb120`,
`src/app/sites/_shared/spec-pipeline.ts`, `src/fyd/data/ping-object-source`,
`getPingObjectGraph`, and `src/fyd/edge/jest.config.cjs` do not exist in this
tree or on this machine; the chain was traced through the code that does exist
here).

## Verdict

**FIRST BROKEN LINK at stage: stored bytes -> business observations.**

The service-card half of the chain resolves mechanically end to end. The business
object half does not: its title, description, phone, and area_served are
operator-written constants in the regen script, labeled as website-derived
evidence, with no observation records or byte spans behind them.

## Stage-by-stage evidence

### Stage 1: acquisition record -> stored bytes — VERIFIED

- `evidence/acquisition-coppersmith-plumbing-2026-09-22.json`: sourceUrl
  `https://www.coppersmithplumbing.com/`, contentBytes 117900, contentDigest
  `sha256:2233052b4ad0da1dac9a905dd2ea4b0b54e0b30f36428bfc0c73f785904b9e57`,
  storedAt `evidence/coppersmith-2026-09-22.html`.
- Mechanical check: `wc -c` = 117900; `sha256sum` =
  `2233052b4ad0da1dac9a905dd2ea4b0b54e0b30f36428bfc0c73f785904b9e57`. Match.

### Stage 2a: stored bytes -> service-card observations (4) — VERIFIED

- Ran `extractServiceCards` from `src/fyd/proceduralize/service-cards.ts`
  (via the compiled `dist/src/fyd/proceduralize/service-cards.js`) against the
  exact stored bytes: deterministic (double-run byte-identical), 4 cards, and
  every card's name/description/href/pattern reproduces the corresponding record
  in `evidence/observations-coppersmith-plumbing-2026-09-22.json`.
- Byte-span honesty: the recorded `utf8_bytes` (e.g. `[67085, 68336]`) are the
  extractor's JS indices `[67084, 68335]` converted by `utf8Offset`
  (`src/fyd/proceduralize/compile-service-graph.ts:111-113`). The +1 is a real
  U+00A0 two-byte char at file byte 58531-58532, verified in the raw bytes. The
  spans genuinely bound the card anchors. Honest.
- All 4 observations carry `sourcePointer:
  web:sha256:2233052b...` = the stored-bytes digest. Match.

### Stage 2b: stored bytes -> business observations — BROKEN (UNPROVEN)

- The only business observation is `obs-coppersmith-plumbing-business-fields`
  with `value: "Coppersmith Plumbing & HVAC"`. Per
  `src/fyd/proceduralize/compile-service-graph.ts:167-177`, that value is
  `business.title`, which is the operator's hardcoded `SITES` constant at
  `scripts/regen-fixtures/regen.js:87`. No extractor, detector, regex, or byte
  span links the stored bytes to this value. The record carries no
  `sourceLocation`.
- Worse: the business object in
  `src/fyd/proceduralize/__fixtures__/coppersmith-plumbing-graph.ts:20-58`
  carries `fields.phone: "970-245-3869"`, `fields.area_served: "Western
  Colorado"`, `fields.description`, and `fields.title`, all stamped
  `claimKind: "website_statement"`, `source_type: "website_text_extraction"`,
  `source_digest: "sha256:2233052b..."`, and `provenance.kind:
  "website-derived"`. No observation records exist for any of these fields
  (5 observations total; compile-service-graph emits exactly one business
  observation). Their values originate at `scripts/regen-fixtures/regen.js:87-93`
  constants. The constants happen to appear in the HTML (phone 5x, "Western
  Colorado" 5x), but no mechanical link exists: a wrong constant would pass every
  in-repo check, because the evidence validator only compares `source_digest`,
  never per-field provenance.
- The fixture header ("MACHINE-GENERATED, not hand-written",
  `coppersmith-plumbing-graph.ts:1-17`) overstates provenance while business
  fields are hand-written constants in the generator script.

### Stage 3: observations -> evidence entries (ResolvedEvidence) — VERIFIED

- `src/fyd/ask/load-fixture.ts:collectEvidence` builds the index from
  `evidence/observations-<slug>-2026-09-22.json`. Executed against the compiled
  sources: all 5 records load as kind `observation` with the correct
  sourcePointer. Mechanical.
- Side note: the loader also emits 4 inert `kind: "acquisition"` placeholders
  with colon-containing refs (`obs-coppersmith-plumbing-elementor-cta-services:hvac`)
  because `evidenceRefToObservationId` (`load-fixture.ts:40-48`) does not convert
  colons to dashes. They never satisfy validation (fail-closed by design), but
  they are dead weight in the evidenceRefs array.

### Stage 4: object citations -> evidence records — VERIFIED

- `src/fyd/evidence/refs.ts:validateEvidenceRef` resolves all 5 object citation
  refs to real observation records with `ok: true` (executed against compiled
  sources): the colon-to-dash tail fallback (`refs.ts:108-116`) maps
  `service-cards:elementor-cta-services:<key>` to the dashed observationIds,
  and the `wrong_snapshot` digest check passes
  (`web:sha256:2233052b...` == `web:` + `fields.source_digest`).

## What a writer would need to fix it

1. Extract business metadata mechanically from the stored bytes: add a
   business-fields detector (in `service-cards.ts` or a new extractor module)
   that derives title from `<title>`/og tags, phone from `tel:` links or a phone
   regex, area_served and description from page copy, each with a recorded byte
   span, emitting one observation per field (or per-field sourceLocations).
2. Change `compile-service-graph.ts` so the business object is built ONLY from
   those observations; remove hand-written business facts from the `SITES`
   config in `scripts/regen-fixtures/regen.js` (keep only sourceUrl + slug).
3. Fail closed: regen/compile must throw if a business field value is not found
   in the source bytes (assert substring + record the offset). A constant that
   cannot be located must never become a `website_statement` claim.
4. Fix the fixture header: do not claim "MACHINE-GENERATED, not hand-written"
   while any field is operator-supplied; label operator-supplied fields
   honestly (e.g. `claimKind: operator_asserted`) until step 1-3 land.
5. Minor: make `evidenceRefToObservationId` in `load-fixture.ts` convert colons
   to dashes so the inert acquisition placeholders stop being emitted.

## Scope notes

- Read-only throughout: no files modified, no processes restarted, no DB writes.
  (Compiled throwaway copies of three TS modules + the fixture into /tmp only,
  to execute the loader + validator mechanically.)
- The sprint's downstream stages (SiteSpec -> edge/card -> expanded -> Ask FYD ->
  citation -> owner proposal -> approval -> event -> projection -> regeneration ->
  re-observation) were not traced; this lane stops at evidence.
- The 2026-09-22 `acquisition-chain-report.md` at the repo root traced an older
  branch (`fyd/builder-composition`) and a different fixture pipeline; its
  conclusions are superseded for the service-card chain but its epistemic
  warning (hand-authored content labeled as website-derived) is confirmed here
  in the business-field form.
