# FYD Factory Cohort Rerun Report

Date: 2026-09-24. Lane: factory batch-rerun. Controller: `cohort_rerun`.
Baseline: pipeline `e48ef710` (night_cohort / cohort2 pristine runs).
Current: pipeline `699146da` (fyd-factory HEAD, verified on Pig).
Method: replayed existing raw snapshots (no live refetch). Same runner stages:
raw snapshot -> runExtractionPipeline -> generateSiteSpec -> validateSiteSpec/isRenderable -> buildSemanticRenderModel.
Corpus: 8 businesses (4 cohort-1, 4 cohort-2). Pipeline source copied read-only from
the Pig to a local harness (/tmp/fyd-current); no repo writes, no builds, no :3100 contact.

Per-site rerun JSONs sit next to this report (`<site>.json`).

## Verdict

Extraction is byte-identical to baseline on all 8 (proceduralizer.ts unchanged in the
delta). The generator delta (GENERATOR_VERSION 1.0.0 -> 1.1.0) changed emitted pages
on the 2 richest sites: **both lost their Explore page**. The delta's headline feature
(direction-agnostic employs/works_for role matching) had **zero observable effect**:
no employment relationships exist in any of the 8 graphs.

## Per-business results

| Site | ACQ replay | Structured evidence | Objects | Rels (dropped) | Unsupported | Site gen | Structural note | Unbound claims | Mobile (structural) | Object interaction | Ask FYD evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bemis-electric | OK | json-ld 111, og 35, meta 10; body-text 0 | 6 | 0 (60 dropped) | 89 | valid + renderable | Explore page LOST vs baseline | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| gear-junction | OK | json-ld 82, og 45, meta 9; body-text 0 | 4 | 3 (11 dropped) | 16 | valid + renderable | Explore page LOST vs baseline | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| bistro-317 | OK | json-ld 10, og 5, meta 2; body-text 0 | 2 | 1 (0 dropped) | 1 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| dalby-cpa | OK | json-ld 9, og 6, meta 2; body-text 0 | 1 | 0 (4 dropped) | 8 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| tt-hvac | OK | og 4, meta 1; body-text 0 | 1 | 0 (0 dropped) | 0 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| klik-boutique | OK | meta 12; body-text 0 | 1 | 0 (0 dropped) | 0 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| legacy-coffee | OK | og 63, meta 8; body-text 0 | 1 | 0 (0 dropped) | 0 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |
| suehiro | OK | json-ld 16, og 7, meta 2; body-text 0 | 1 | 0 (10 dropped) | 15 | valid + renderable | identical template | 0; refs are self-hashes | PASS | identity yes, actions no | PARTIAL |

Notes on the columns:
- **ACQ replay**: all 8 replayed from local snapshots without error; 0 crashes at any stage.
- **Structured evidence**: facts come only from JSON-LD / OpenGraph / html-meta on all 8.
  Body-text fact count is 0 on every site (unchanged from baseline; COHORT-REPORT F2 still open).
- **Site gen**: validateSiteSpec 0 errors / 0 warnings and isRenderable true on all 8, same as baseline.
- **Structural diversity**: every site emits the same section template
  (Hero, BusinessSummary, [Locations], Contact, Links, CTA, AskFYD [+ ObjectFeed on explore]).
  Only bemis-electric and gear-junction ever had a second layout (Explore), and both lost it.
- **Unbound claims**: every graph field is DIRECT_FACT / website_statement with an evidenceRef;
  see G3 below for why that binding is weaker than it looks. No GENERATED_COPY anywhere.
- **Mobile (structural)**: PASS on all 8. Render models and specs contain no fixed-width or
  overflow-prone constructs (no `Npx`, no min/max-width); sections are query-based. Long
  unbreakable tokens appear only inside field values (image URLs), never titles.
  Caveat: this checks the model layer only; renderer-component mobile hazards are the
  mobile-objects lane's domain.
- **Object interaction**: render-model sections carry `objectIds` (identity survives into the
  render model), but no section carries actions/capabilities/affordances. Interaction data
  must come from another layer.
- **Ask FYD evidence**: PARTIAL on all 8. AskFYD sections are static queries with no evidence
  ids; graph fields carry content-hash refs only (see G3).

## Baseline comparison (what the delta did)

- Extraction (facts/objects/relationships/unsupported/dropped): **identical on all 8**.
- SiteSpec: on 6 of 8 sites the ONLY difference vs baseline is the generator version
  string (`1.0.0` -> `1.1.0`). Pages and sections otherwise identical.
- SiteSpec: on **bemis-electric and gear-junction the Explore page disappeared**
  (baseline had `explore` -> ObjectFeed; rerun emits home + about only).
- Render models: follow the specs; no crashes; `renderModelVersion: 1`,
  `rendererVersion: "renderer.tsx@unversioned"` (version hygiene gap, minor).

## Unsupported schemas / claims

- `ping.social.external_identity@1` (gear-junction's 2 external-identity objects) resolves
  only to `GenericObjectCard` in every eligibility path. It is the one schema with no
  dedicated component anywhere.
- Unsupported fact kinds are unchanged from baseline: `unmapped-property` dominates
  (79 bemis, 15 gear, 14 suehiro, 7 dalby), plus `malformed-block` (5, bemis) and
  `site-chrome-node` (chromenodes correctly excluded).
- Media: the runner records 10-20 bare URLs per site (`url` + `page_url` + `kind` only).
  No digest, no manifest, no license/authorization basis. The pipeline itself emits no
  media objects at all. Every site would break the media doctrine
  (SOURCE + DIGEST + PROVENANCE + LICENSE) if a renderer hotlinks these.

## TOP 3 GENERIC FAILURES

Ranked by blast radius, each with the exact defect location and the next fix.

### G1. Registry inversion silently deleted the Explore page on rich sites
**Defect:** `src/fyd/sitespec/schemas.ts` — `eligibleComponents()` was re-derived from the
component registry (`src/fyd/components/registry.ts`, `COMPONENTS_BY_SCHEMA` inversion,
lane E 2026-09-23), deleting the hand-written `SCHEMA_COMPONENTS` table. The old table
granted `ObjectFeed` to business / person / product / location schemas; the registry
`DEFINITIONS` table does not. Result: `explorePage()` finds no feed-renderable schema and
the Explore page vanishes. The commit message claims "zero drift"; the emitted pages on
real sites drifted.
**Evidence:** bemis-electric baseline explore query schemas
`["ping.social.business@1","ping.social.person@1"]`; gear-junction
`["ping.social.business@1","ping.social.location@1"]`. Rerun: both gone; new
`eligibleComponents("ping.social.person@1")` = `["People","ObjectGrid","ObjectRail"]`.
**Next fix:** decide intentionally. Either add `ObjectFeed` to the `acceptsSchemas` of
business/person/product/location in `DEFINITIONS` (restoring the intended surface), or
record the page-drop as intended behavior with a generator test that pins it. A refactor
must not silently remove pages; add a page-inventory assertion to
`src/fyd/proceduralize/__tests__/generator.test.ts` covering a >=4-object business+person graph.

### G2. Object IDs are not stable across pipeline runs
**Defect:** `src/fyd/proceduralize/proceduralizer.ts`, `deriveBusinessId()` (line ~603):
the business object id hashes `controllerId` (the runner label) into the identity.
Same source URL + same bytes + different runner label => different canonical object id.
**Evidence:** all 8 sites got new `ownerObjectId`s (`night_cohort`/`cohort2` -> `cohort_rerun`);
render-model `objectIds` changed in lockstep. Identity is a function of who ran the
pipeline, not of the business.
**Next fix:** derive the id from `sourceUrl` + content only; move the controller label
into provenance metadata. Cross-run identity is load-bearing for owner overlays,
Ask FYD evidence refs, and the mobile object layer (see observation below).

### G3. Dropped relationships are a bare count; the delta's headline feature is unverifiable
**Defect:** `src/fyd/proceduralize/proceduralizer.ts`, RELATE stage (~lines 1043-1089):
unmapped endpoints are dropped and only counted (`droppedRelationships: 60` on bemis,
11 on gear, 10 on suehiro). No predicate, no endpoint keys, no reason recorded.
**Evidence:** the 1.1.0 generator change (direction-agnostic `employs`/`works_for` matching,
"matching only the owner-subject direction silently deleted the team from composition")
had zero observable effect in this corpus: **zero employment relationships exist in any
of the 8 graphs**, and bemis-electric has 5 person objects with 0 relationships. The team
edges either never extracted or were dropped invisibly; there is no way to tell.
**Next fix:** record dropped edges with reason codes (predicate, subjectKey, objectKey,
reason) in the pipeline report, capped at N. Then add a fixture containing a `works_for`
edge and prove the 1.1.0 matching path fires; without it the version bump certifies an
untested code path.

## Observations for the mobile-objects lane

1. **Do not key mobile object state on `website-business-*` ids across reruns** (G2): the
   ids change when the runner label changes. If rails/sheets pin by object id, a factory
   rerun orphans that state. Either stabilize the ids (G2 fix) or key on a stable
   business key (sourceUrl + schema).
2. **The semantic render model carries identity but no affordances**: sections resolve to
   `objectIds` only; there are no actions/capabilities in the model. If the mobile layer
   expects interaction data from `buildSemanticRenderModel`, it must come from the object
   view layer or registry instead. (Related minor: `rendererVersion` is the literal string
   `"renderer.tsx@unversioned"`.)
3. **Evidence binding is weaker than the coverage metric suggests**: 100% of probed fields
   (380/380 across 4 sites) carry `evidenceRef`, but 0 carry `evidenceDetail`
   (`proceduralizer.ts`, `evidenceRefForFact` ~line 447). The ref is
   `web:<sha12(sourceType|name|value|entityId)>`, a hash of the claim itself, not a
   byte-span/selector locator. Ask FYD cannot drill from a displayed claim to source bytes
   on this. If the mobile/Ask surface promises evidence drill-down, `evidenceDetail`
   (selector, byte span, source text) needs to be populated at extraction time, or the
   "evidence coverage 1.0" metric renamed to what it measures (ref presence).

## Batch accounting

- Attempted: 8. Generated successfully: 8 (0 stage crashes; 0 fetch-stage failures since
  snapshots were replayed, not fetched).
- Behavioral regressions vs baseline: 2 (bemis-electric, gear-junction lost Explore page).
- Identical-to-baseline modulo version string: 6.
- No commits, no pushes, no builds, no :3100 contact. All outputs are local to
  `~/workspace/fyd-factory/cohort-rerun/`.
