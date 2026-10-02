# F5-CEILING: Genericity-Ceiling Report (re-scoped per Nolan 2026-09-23)

Branch: `fyd-factory` @ PING repo `/home/nolan/projects/ping`. Git read-only throughout; nothing was written to the repo. All experiments ran the real production composition path (`strategyForSite` -> `planSite` via tsx on the Pig, deterministic: fixed `generatedAt`, canonical JSON hashing, zero randomness).

Artifacts:
- [similarity.json](sandbox://workspace/fyd-factory/ceiling/similarity.json): 9 sites fingerprinted, 36 pairwise similarities
- [experiment2.json](sandbox://workspace/fyd-factory/ceiling/experiment2.json): documented-vector vs production-preset comparison
- Patch proposal: `~/workspace/fyd-factory/patches/f5-ceiling-works-for-people.patch`

Fingerprint = sha256 over canonical JSON of: per-page section order (component per section), nav structure, composition policy (CTA emphasis, density, media treatment, presence mode, max sections, typography, radius), object-presence decisions, archetype stamp. Similarity composite = 0.5 * sequence similarity + 0.3 * set Jaccard + 0.2 * policy match.

Corpus: coppersmith-plumbing (trades, emergency-capable plumber) fixture + production projection; happy-place (Happy Place Carpentry LLC, trades-shaped) fixture + rich fixture + production projection; ping-fyd dogfood (AI consultancy) production projection; two F2-era test projections; plus a SUCCESS-TEST variant (happy-place projection with business identity swapped through structured fields to "Desert Bloom Landscaping", Fruita).

## Verdicts (Nolan's corrected scheme)

Structural sameness is not failure. Verdicts below use: high similarity + similar IA = CORRECT; high similarity + materially different IA = FAILURE; low similarity + similar IA = INVESTIGATE.

### CORRECT: high similarity, similar information architecture

- **coppersmith-fixture ~ coppersmith-projection**: composite 1.000, byte-identical fingerprints. Same business, fixture vs production projection. Determinism holds across the seam. Correct.
- **happyplace-fixture ~ happyplace-projection**: 1.000. Same story. Correct.
- **happyplace-projection ~ happyplace-identity-swap**: 1.000, identical fingerprint hash `6277c348f3a1`. Same IA by construction (only identity fields changed). This is the SUCCESS TEST, and it **passes**: hero tagline correctly re-bound to "Desert Bloom Landscaping -- Fruita", contact binds the new phone, nav/page titles use the new identity, no stale identity leakage anywhere in the spec. The abstraction preserves intentionality across a structured identity swap. Caveat: I swapped identity fields only, not services, so the swapped site is a landscaper offering carpentry services; the composition layer handled its part correctly.
- **objtest-happyplace ~ happyplace-*** (1.000 on home sequence): 1 service vs 5-6 services, same component set. Service COUNT does not change structure; correct.
- **happyplace-rich-fixture vs the plain fixtures (0.884)**: team=2 via employs-direction edges produces People sections on home + about. Variation exists exactly where the entity differs. Correct.
- **objtest-coppersmith (0 services) vs coppersmith-fixture (0.822)**: no Services page, no ObjectRail, no Explore page. The composition drops what the graph lacks. Variation for the right reason. Correct.

### FAILURE: high similarity, materially different IA

- **coppersmith-fixture ~ happyplace-fixture (and ~ happyplace-projection): composite 1.000, exact home sequence match.** The IA differs in a way the system itself declares meaningful: coppersmith has a team member (person object linked by `works_for`), happy-place has no people at all. Per the system's own eligibility rules ("person + works_for in either direction to the owner" -> People eligible), coppersmith should get team treatment. It gets none: no People section on home or about. The entity difference was lost before it could express. **This is the primary finding. First-loss diagnosis below.**

### INVESTIGATE: low similarity, similar IA

- **ping-fyd ~ trades sites (0.740)**: the dogfood graph is trades-shaped (4 services, 1 location, phone, zero posts/articles/products); `inferStrategy` scores it TRADES 8. The only reason it composes differently (TECHNOLOGY vector: compact density, schematic media, drawer presence) is the `STRATEGY_PINS` override for `ping-fyd`. The pin is legitimate owner intent (owner's word beats inference by design), but the difference does not come from the entity: the graph carries no consultancy signals. Either the dogfood graph should grow articles/capability objects so the entity earns its TECHNOLOGY treatment, or the pin stays as explicit owner intent. Flagged for Nolan, not a failure.

### Corpus caveat

No fixture in the available corpus contains product, post, or article objects, so the Products / RecentObjects / Posts / knowledge-section / proof-section paths were exercised only by code reading, not by live composition. The generator and eligibility are data-driven on those paths, but there is no live evidence of variation there.

## First-loss diagnosis: RELATIONSHIPS LOST (generator boundary)

**The pair:** coppersmith-plumbing vs happy-place, composite similarity 1.000.

**The graph difference the spec failed to express:** coppersmith's graph contains person `website-business-2f1327c09d622175-person-377048d67856` ("coppersmithplm", website-derived) linked to the owner by relationship `rel-8627fe1497c235f5` with predicate `works_for`, subject = the person, object = the business, status active. Happy-place's graph contains no person objects.

**Where it is lost:** `src/fyd/proceduralize/generator.ts :: group()` -> `related("person")` matches only relationships with `r.subject === owner.id` and predicate in `[employs, has_member]`. The `works_for` edge points the other way (person -> business), so the person never enters the people group and no People section is emitted on any page.

**Why this is the FIRST loss, not a downstream one:** the eligibility module already encodes the correct rule. `deriveEligibility` documents "person + works_for (either direction to the owner) -> People ('team') eligible" and returns `team: 1` for coppersmith. The planner filters the generator's output through that eligibility report, so the planner is innocent: it would have kept a People section had one been emitted. The renderer and render-model resolve whatever queries the spec carries. The relationship exists in the verified graph; it is the generator's owner-centric grouping that drops it. Two modules disagree on one predicate vocabulary, and the narrower one wins silently, with no diagnostic (the manifest notes only record filtered sections, and the section was never emitted to be filtered).

**Ruled out:** extraction too shallow (the edge IS extracted, with evidenceRef `proceduralizer:structured:worksFor`); planner too generic (planner honors eligibility; nothing to honor); registry too small; archetype too dominant; media model; owner intent.

## Proposed fix

Patch: `~/workspace/fyd-factory/patches/f5-ceiling-works-for-people.patch` (not applied).

Minimal and generic, at the generator boundary only:
1. `group()` merges reverse-direction `works_for` persons (subject = person-schema object, object = owner) into the people group, mirroring eligibility's rule. Deterministic: dedup by id, re-sort by id.
2. People sections emit `kind: "reference"` with the grouped ids instead of the owner-centric `roleQuery("person")`, because all three resolvers (planner `resolveQueryObjects`, renderer `resolveQuery`, render-model) require `r.subject === from` for `related` and cannot reach reverse-direction members. `reference` is an existing, validator-supported query kind resolved identically on all three paths.
3. `SITE_PLANNER_VERSION` bumped to `fyd-site-planner@2` since emitted spec bytes change.

Expected: coppersmith gains People on home + about bound to the works_for person; its fingerprint diverges from happy-place exactly where the entities diverge. Employs-direction sites resolve the same person sets as before.

## Secondary finding: the documented per-tenant operating points are dead (planner too generic / archetype too dominant)

`src/fyd/builder/dimensions.ts` documents "the two tenant operating points for this lane": `COPPERSMITH_VECTOR` (urgency 0.85, "emergency-capable local trade") and `PING_DOGFOOD_VECTOR`. Neither is referenced outside tests. The production path (`strategyForSite(siteId, graph).vector` in `src/app/build/[siteId]/page.tsx`) quantizes every tenant to one of three coarse presets, so coppersmith composes at TRADES urgency 0.6, not 0.85.

Measured on the coppersmith graph, same planner, vector swapped (experiment2):
- Production (TRADES preset): CTA emphasis **medium**, home order [Hero, Services, BusinessSummary, Contact, CTA, ...], maxSections 9.
- Documented operating point: CTA emphasis **high**, home order [Hero, BusinessSummary, Services, Contact, CTA, ...], maxSections 8.

The system designed high-CTA emergency-trade treatment (dimensions.ts even names "the roofer vs emergency-plumber bar") and then does not use it for its own emergency-capable trade demo. Related: `SITE_STRATEGIES[].policy` (sectionPriority, per-role objectEmphasis, navigationStrategy, density) is declared per strategy but has zero production consumers; only the vector reaches the planner. The strategy layer's composition intent is decorative.

Minimal generic fix sketch (not patched; for Nolan's call): consult a per-tenant operating-point table (the existing `COPPERSMITH_VECTOR` / `PING_DOGFOOD_VECTOR` constants) in `vectorForSite` before falling back to the strategy preset, so documented tenant operating points actually operate. One-line-ish change in `src/fyd/builder/site-vectors.ts`; no planner/renderer changes.

## Bottom line

- Success test: **passes**. Identity swap through structured data yields an equally intentional site; the abstraction holds.
- Sameness where IA matches: **correct**, including determinism across fixture/projection seams.
- One real failure: **coppersmith's works_for team member is lost at the generator boundary** (relationships lost). Patch proposed.
- One quality erosion: **per-tenant operating vectors are dead code**; production flattens to 3 presets and coppersmith loses its designed high-urgency treatment. Fix sketched.
- One investigate: **ping-fyd's TECHNOLOGY treatment comes from the pin, not the entity**; the dogfood graph infers TRADES.
