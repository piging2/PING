# MAP-RENDERER: the FYD renderer pipeline, end to end

Read-only map of the composition/render path as it stands on branch
`fyd/sprint-integration-2026-09-24` (HEAD `a8ed5103`), repo at
`/home/nolan/projects/ping` on the Pig. Written 2026-09-26 for the design
sprint's composition-compiler builders.

TL;DR: FYD today has NO composition compiler. It has a data-driven section
emitter (fixed order, sections exist only when data exists), a dimension-vector
reorder policy (section order + density + token tweaks), and a pure "print"
renderer (each component maps its bound objects to one fixed DOM shape). The
thesis of the sprint is confirmed at every stage: Business goes in, the same
18 components come out in nearly the same order, regardless of media richness,
relationship cardinality, or business type.

## Pipeline stages

### Stage 0: presence compile (P-01 lane)

File: `src/fyd/onboarding/compile-tenant.ts` (699 lines).
`COMPILER_VERSION = "fyd-presence-compiler@1.0.0"` (:44).
Four checkpointed stages, all pure except the fetch:

1. `normalize` : claimResourceIdForUrl (fyd/claim) gives a deterministic
   tenant id from the normalized URL origin. Same URL, same tenant id.
2. `acquire` : generateAnonymousPreview (SSRF-safe fetch, structured
   extraction) yields `PageEvidence` and an OBSERVED claim.
3. `compile` : `compileGraph(evidence, ctx)` (:311) is pure,
   PageEvidence -> ObjectGraph. Object ids are deterministic sha256
   derivations, e.g. `bizId + "-service-" + sha256Hex(tenantId + "|service|" + name)[0:12]`
   (:380-385) and `rel-` + sha256 of tenantId + predicate + name (:394-400).
   Business object gets one business node, one location node (if address),
   one service node per extracted service name, relationships
   `located_at` / `offers`. Note the narrowness: services are bare names
   (title = description = name), no grouping, no categories, no media.
4. `project` : emits the projection JSON in the exact contract the PING-side
   dump produces (`meta` + `graphDigest`), so the existing golden route serves
   it with no new route code.

### Stage 1: the golden route

File: `src/app/build/[siteId]/page.tsx`. `BuildSitePage` runs, in order:

1. `getPingObjectGraph(siteId)` (`src/fyd/data/ping-object-source.ts`) ->
   `{ graph, meta, presentationIntent }`. Fail closed: missing projection is a
   404, never a 500 with fiction.
2. `verifyObjectGraph({ tenantId: siteId }, projection)`
   (`src/fyd/builder/object-builder.ts:150`) -> verified graph + attestation.
   Checks: tenant attestation, unique ids, schema catalog, relationship
   legality. `OBJECT_BUILDER_VERSION = "fyd-object-builder@1"` (:51).
3. `planSite({ ctx, graph: verified.graph, vector: vectorForSite(siteId),
   generatedAt, eventSequences, attestation })`
   (`src/fyd/builder/planner.ts:290`). See Stage 2.
4. `applyPresentationIntent(base, presentationIntent, graph)`
   (`src/fyd/customize/apply-layer.ts:116`): approved owner directives applied
   OVER the compiled spec via a JSON deep copy; each directive's proposal
   digest must still verify or it is refused. Facts (graph) and design system
   (theme) are untouched.
5. `heroMediaFor(siteId, graph, spec.ownerObjectId)` (`src/fyd/media/select.ts`):
   hero media resolved once per page load at the server render seam; null when
   the owner has no acquired media.
6. `validateSiteSpec(spec, knownSchemas)` (`src/fyd/sitespec/validator.ts:29`)
   -> findings; `isRenderable(findings)` (:125): any error means "This site is
   temporarily unavailable", never a wrong render.
7. `<BuildClient spec graph findings renderable siteId heroMedia />`.

### Stage 2: planSite (the closest thing to "composition" today)

File: `src/fyd/builder/planner.ts` (528 lines).
`SITE_PLANNER_VERSION = "fyd-site-planner@2"` (:76).
Determinism law, stated at :23-27: the same (ObjectGraph, OwnerIntent, vector,
planner version, design tokens, viewer class) yields the same semantic render
model. No timestamps in planning decisions.

Sub-steps inside `planSite`:

1. `generateSiteSpec(graph, { generatedAt, eventSequences })`
   (`src/fyd/proceduralize/generator.ts:306`): the data-driven base. Sections
   exist only when their data exists; the planner never invents sections.
2. `deriveEligibility(graph)` (`src/fyd/builder/eligibility.ts`): defensive
   filter over the generator output.
3. `policyForVector(vector)` (`src/fyd/builder/dimensions.ts:197`): the
   8-dimension archetype vector -> CompositionPolicy (sectionBoosts,
   density, typography, mediaTreatment, ctaEmphasis, presenceMode,
   collapseBelow, maxSectionsPerPage). Then: stable sort of sections by
   `(baseRank - boost, originalIndex)` where `baseRank` comes from the fixed
   `BASE_COMPONENT_ORDER` (:79-96: Hero, IdentityCard, BusinessSummary,
   Services, Products, SocialProof, Locations, People, Posts, ObjectFeed,
   RecentObjects, ObjectGrid, Contact, Links, CTA, AskFYD, ObjectRail,
   GenericObjectCard). Must-win components (Hero, BusinessSummary, Services,
   Products, Contact, CTA, AskFYD, ObjectRail) survive the density cap;
   optionals are cut at `maxSectionsPerPage = 6 + round(6 * service_complexity)`.
4. Owner-intent filters: `resolveOperatingConstraints` removes components;
   unknown constraints are recorded, never applied.
5. Generated presentation: one hero-tagline slot (`owner.title -- locality`),
   evidence-bound and verifier-checked; attached to the first surviving Hero.
6. `buildVerifiedRenderModel(...)` (`src/fyd/sitespec/binding-verifier.ts`):
   every factual atom classified OWNER_ASSERTED / DIRECT_EVIDENCE /
   DETERMINISTIC_DERIVATION / GENERATED_PRESENTATION. Unsupported atoms fail
   closed: the planner throws before any spec is produced. The renderer
   consumes only this model and performs no claim checking of its own.
7. Theme tokens: base tokens re-skinned by the vector policy (typography,
   media.treatment, radius). The accent is NOT assigned here; that law belongs
   to derive-presence.
8. Manifest + confidence: one binding per surviving section, with
   `componentVersion = COMPONENT_REGISTRY_VERSION`,
   `siteSpecVersion = SITE_PLANNER_VERSION`, claim refs, confidence law
   assertion (presentationConfidence <= factConfidence).
9. `canonicalizeSpec` + `semanticDigestOf` (`src/fyd/builder/canonical.ts:43,48`):
   sha256 over canonical JSON, volatile `*At` keys stripped.

Where the vector comes from: `vectorForSite(siteId)`
(`src/fyd/builder/site-vectors.ts:35`) -> `strategyForSite(siteId)`
(`src/fyd/builder/strategy-for-site.ts:49`): precedence is
ownerIntent.strategy override, then `STRATEGY_PINS` (`ping-fyd` -> TECHNOLOGY,
`coppersmith-plumbing` -> TRADES), then `inferStrategy(graph)` (deterministic
schema-role counting: services+locations+phone signals -> TRADES,
articles+posts+people -> KNOWLEDGE_WORKER, products -> TECHNOLOGY; ties break
by the fixed contender order), then KNOWLEDGE_WORKER default. A neutral
`DEFAULT_VECTOR` (all 0.5) exists but is only used by explicit callers.

### Stage 3: renderable -> React

- `BuildClient` (`src/app/build/[siteId]/build-client.tsx:61`): builds the
  RenderContext `{ spec, graph, viewer, siteId, heroMedia, galleryMedia,
  objectMedia }` and renders ONE page: `const page = spec.pages[0]` (:84).
  The margin shows the richest public non-owner object by evidence score
  (`richestObject`) through ObjectCircle; the AskFYD mount is the spec's own
  AskFYD section. `SitePageView` (`src/fyd/components/renderer.tsx:2170`)
  maps `page.sections` through `renderSection`.
- `renderSection` (`renderer.tsx:2129`): looks up the component def, resolves
  the section query against the graph (`resolveQuery`, id-sorted),
  applies owner object order and the site-wide deactivated-object exclusion,
  then switches on `section.component` to one of 17 section components
  (default: GenericObjectCardSection). 2174 lines total.

Note: the demo `/sites/*` route (`src/app/sites/_shared/spec-pipeline.ts:90`)
does NOT use planSite: it calls `generateSiteSpec` directly with `siteId`
(so Gallery can emit) plus `applyPresentationIntent`, skipping the vector
policy, binding verifier, manifest, and digest. Two render paths exist today.

## Design-system inventory

### Tokens

`FYDThemeTokens` (`src/fyd/sitespec/types.ts:269-305`):
- v1 frozen: `accent`, `accentForeground`, `surface`, `ink`,
  `radius` ("none"|"sm"|"md"|"lg"|"full"), `fontDisplay`, `fontBody`.
- Additive groups: `typography` (FYDTypeScale :103: base px + modular ratio),
  `spacing` (xs/sm/md/lg/xl px :111), `colors` (muted/border/success/warning/
  danger :119), `surfaces`, `shadows`, `layout`, `breakpoints`, `media`
  (FYDMediaTokens: treatment), `motion`, `layoutCharacter`
  ("EDITORIAL"|"CRAFT"|"TECHNICAL"|"RETAIL"|"PROFESSIONAL"|"CREATOR" :202),
  `motionTokens`, `designIntent` (:258: density compact/comfortable,
  contentWidthPx, mediaTreatment contained/edge-to-edge,
  objectEmphasis quiet/balanced/prominent).

`DEFAULT_FYD_THEME` (:307): accent `#C9A227` (gold), accentForeground
`#1c1917`, surface `#FFFFFF`, ink `#232033`, radius `md`,
fontDisplay `Playfair Display, Georgia, serif`, fontBody `Geist, system-ui,
sans-serif`.

Per-site accent: `derivePresence` (`src/fyd/presence/derive-presence.ts:154`)
picks the accent by fnv1a hash of `owner.id + "|" + owner.title` over an
8-color palette (copper, pine, indigo, brick, slate teal, ochre, ...) and
radius md/full by hash. Deterministic per graph identity, not per business
type. (A separate object-layer token file,
`src/fyd/ui/object-layer/fyd-tokens.ts:48`, carries a gold/violet/paper
palette used by the overlay chrome.)

### Component library

Registry: `src/fyd/components/registry.ts` (178 lines). 18 section components
+ GenericObjectCard fallback. Registry is the single schema->component map
consumed by the generator (`eligibleComponents`), the validator, and the
renderer. Components and their data roles (:72-110):

Hero, IdentityCard, BusinessSummary (owner-bound business); Services,
Products, Locations, People, Posts (role lists); ObjectGrid, ObjectFeed,
RecentObjects (generic lists); Contact, Links, SocialProof (owner-bound);
CTA, AskFYD (site capabilities, no data required); ObjectRail (featured
object doorway); Gallery (media only, `kind: "static"` query); GenericObjectCard.

Variants: only two entries declare them. ObjectRail: `variants: ["rail",
"drawer", "auto"]` (:107); Gallery: `variants: ["grid"]` (:120). Every
entry has an optional `operationalEvidence` field
(usage/failureCount/lcpImpactMs/bestGraphShapes/poorGraphShapes) that is a
FUTURE CONTRACT: unpopulated everywhere, the evaluation machinery does not
exist yet. This is the natural home for a composition compiler's learned
component/shape fitness data.

Themes/variants in the wild: the strategies file declares three named site
strategies (`src/fyd/builder/strategies.ts:36-78`): KNOWLEDGE_WORKER
(expertise/people/proof), TRADES (services/service-area/emergency/quote),
TECHNOLOGY (product/docs/architecture). Each carries a vector plus a
strategy-layer `CompositionPolicy` (:63: sectionPriority list, density,
`navigationStrategy: "tabs" | "single-page"`, objectEmphasis per schema role).
CAUTION: this is a DIFFERENT interface from the planner-layer
`CompositionPolicy` (`dimensions.ts:185`: sectionBoosts, density, typography,
mediaTreatment, ctaEmphasis, presenceMode, collapseBelow,
maxSectionsPerPage, radius). Two interfaces, one name. The planner consumes
only the vector-derived one; the strategy's declared policy (notably
`navigationStrategy` and `objectEmphasis`) is declared but NOT consumed
anywhere. Pre-existing, unwired hook surface.

## The print-Business problem (concrete)

### Services section

Renderer: `ServicesSection` (`src/fyd/components/renderer.tsx:1375-1387`):

```tsx
function ServicesSection(props: SectionProps) {
  const { section, objects, presentation, theme, ctx, motionIndex } = props;
  const featured = presentation.featuredIds?.length
    ? objects.filter((o) => presentation.featuredIds!.includes(o.id))
    : objects;
  if (featured.length === 0) return null;
  return (
    <SectionShell ... heading={presentation.heading ?? "Services"} copy={presentation.copy}>
      <CardGrid objects={featured} theme={theme} ctx={ctx} />
    </SectionShell>
  );
}
```

`CardGrid` (:1296-1312): `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">`
mapping every object to `FydObjectCard` (:696: title, description, optional
photo, relationship line, `/o/<id>` link; `theme.surface` background,
`borderRadius: 8` unless theme.radius is "none").

What it ignores: the COUNT (2 services and 30 services get the identical
grid; no collapse, no "view all", no density change; `maxSectionsPerPage`
caps sections, not items); the SHAPE of the catalog (no grouping by
relationship, no categories, even though the graph has predicates that could
cluster); the BUSINESS TYPE (an emergency plumber and a SaaS consultancy get
the same card grid; the urgency vector reorders sections but never changes a
component's internals); MEDIA (cards show a photo when one exists, but the
layout is identical with or without photos); ORDER (id sort, never
relevance/evidence sort).

### Gallery section

Generator emission (`src/fyd/proceduralize/generator.ts:200-208`): Gallery is
emitted iff `opts.siteId` is present AND `galleryMediaFor(siteId, graph,
ownerId).length > 0`. Note: planSite does NOT pass siteId, so the Gallery
section NEVER emits on the golden `/build/[siteId]` route today. It only
emits on the demo `/sites/*` path, which passes siteId.

Renderer: `GallerySection` (`renderer.tsx:2057-2111`): fixed
`grid grid-cols-2 gap-3 sm:grid-cols-3`, every image forced to `aspectRatio:
"4 / 3"`, `objectFit: "cover"`, lazy-loaded, each with a WhyThis
provenance drill-down. Renders nothing when `ctx.galleryMedia` is empty.

What it ignores: MEDIA COUNT (3 photos vs 60 get the same 3-col grid;
derive-presence caps at MAX_GALLERY but the grid never adapts columns,
masonry, or a featured-first treatment); MEDIA RICHNESS vs business type (a
trade with 50 project photos gets the same treatment as a consultant with 3
headshots); the vector's `mediaTreatment` ("documentary"/"polished"/
"schematic") is only stamped as a `data-media-treatment` attribute on the
grid div, it changes zero DOM; ASPECT VARIETY (all photos are cropped to 4:3
regardless of their native shape).

### The generator's composition model

`homePage` (`generator.ts:173-224`) emits sections in one hardcoded order:
Hero, BusinessSummary (if description), Services (if any), Products (if any),
Locations (if any), People (if any), Gallery (if media + siteId),
RecentObjects (if posts/articles, limit 6), Contact (if phone/email/website),
Links (if socials/website), CTA (always), AskFYD (always), ObjectRail (if any
featureable object, limit 6). About/services/explore pages are similarly
fixed. The only "composition decision" is existence, gated on data presence
("Missing data means the page or section does not exist; nothing is
invented"). The planner then only reorders by vector boosts and cuts
optionals. Nobody ever asks: how many, how rich, how related, what kind of
business, what does the owner want emphasized.

Two structural findings that matter for composition work:
- The golden route renders ONLY `spec.pages[0]` (`build-client.tsx:84`).
  The generator composes home/about/services/explore, the planner orders and
  validates all of them, and three of the four are never served on
  `/build/[siteId]`. The demo client does tab by slug
  (`site-client.tsx:92`); the golden client does not. The strategy-layer
  `navigationStrategy: "tabs" | "single-page"` is declared but nothing reads
  it.
- `MobileInFlowObjects` (`renderer.tsx:1337`) is the only place where the
  same objects get a genuinely different composition per device (in-flow
  cards on mobile replacing pill lists), keyed off the viewport, not the
  graph.

## Determinism today

How it is achieved and asserted:

- `compileGraph`: same evidence bytes -> same graph bytes. Ids are sha256
  derivations of (tenantId, predicate, normalized name); relationship ids
  similarly. No clock, no randomness.
- `generateSiteSpec`: every sort is by id; "same graph (same object ids,
  fields, relationships) yields byte-identical specs" (`generator.ts:19-28`).
  `generatedAt` is injected so tests can pin it.
- `canonicalizeSpec` / `semanticDigestOf` (`canonical.ts:43,48`): sha256 over
  canonical JSON with all `*At` keys stripped and object keys sorted; array
  order is semantic and preserved. The planner's law: different `generatedAt`
  must still yield the same semantic digest.
- `quantizeVector` + `validateVector` (`dimensions.ts:60-78`): vectors
  quantized to 3 decimals, fail closed on NaN/infinity/out-of-range; the same
  vector always yields the same CompositionPolicy by pure arithmetic.
- `strategyForSite` / `inferStrategy`: deterministic counting, ties broken by
  the fixed contender order [TECHNOLOGY, KNOWLEDGE_WORKER, TRADES].
- Checkpoints: compile-tenant stages record sha256 input digests and resume
  from the failed stage; the projection carries `meta` + `graphDigest`;
  the manifest pins `componentVersion` (COMPONENT_REGISTRY_VERSION),
  `siteSpecVersion` (SITE_PLANNER_VERSION), and a `composition:` note with
  the vector and policy summary (`planner.ts:463-467`).
- Tests that assert it: `src/fyd/invariants/__tests__/inv-02-spec-determinism.test.ts`
  (5 runs byte-identical; different generatedAt -> same semantic digest),
  `src/fyd/builder/__tests__/dimensions.test.ts` (vector -> policy
  determinism), `planner.test.ts`, `structural-diff.test.ts`,
  `semantic-diff.test.ts`, and the compile-tenant suite (24/24 from clean
  checkout per the P-01 integration).

What a composition compiler must preserve to keep "identical graph + intent
+ renderer version -> identical output":

1. All composition inputs must be derivable deterministically from the graph
   (and, for media, from the same deterministic disk input the render seam
   uses, per the generator's siteId caveat at `generator.ts:60-70`). No
   network, no clock, no randomness in any composition decision.
2. The compiler's version must join the digest inputs the way
   SITE_PLANNER_VERSION and COMPONENT_REGISTRY_VERSION already do, and its
   choices must be stamped into the spec (sections, presentation, tokens)
   so `semanticDigestOf` covers them.
3. Quantize any continuous signals (the 3-decimal pattern) so float noise can
   never flip a composition choice.
4. Keep the fail-closed seams: unknown inputs recorded, never applied;
   unsupported compositions refuse rather than invent.

## Hook points for a composition compiler

Three narrow insertion points, ordered by narrowness. None requires touching
the renderer.

### 1. `policyForVector` (narrowest)

`src/fyd/builder/dimensions.ts:197`. The planner consumes the returned
`CompositionPolicy` generically: `baseRank(component) - (policy.sectionBoosts[component] ?? 0)`,
stable sort, then must-win preservation and the density cap
(`planner.ts:341-360`). A composition compiler can REPLACE the arithmetic
inside `policyForVector` (or wrap it: base policy + signal-driven deltas)
with boosts computed from real signals: service cardinality (1 service vs 30),
media richness (gallery asset count from the manifest), relationship density,
business-type signals (urgency/phone/service-area already counted by
infer-strategy), evidence density. The `CompositionPolicy` interface already
carries everything the planner reads (sectionBoosts, density, typography,
mediaTreatment, ctaEmphasis, presenceMode, maxSectionsPerPage, radius); no
planner or renderer change is needed. The vector itself stays the stable,
quantized, digest-covered input contract. This is where "objects +
relationships + cardinality + media richness + business type" can enter
composition without any new authority.

### 2. A pure section-transform step inside `planSite`, between `generateSiteSpec` and the eligibility/order loop

`src/fyd/builder/planner.ts:299-330`. `generateSiteSpec` returns a pure,
data-driven `FYDPage[]`; the planner then filters, reorders, and caps. A
composition compiler as a pure function `(FYDPage[], signals) -> FYDPage[]`
inserted right after the `generateSiteSpec` call can do what the vector
policy cannot: merge sections (e.g. fold a 2-service Services into
BusinessSummary), split sections (e.g. shard 30 services into categorized
subsections), choose per-section variants (Gallery "grid" vs a future
"masonry" via the registry `variants` field), and annotate
`section.presentation` (heading, copy, featuredIds, objectOrder) with
composition intent. Caveat: the validator warns (not errors) when a section
id is not the deterministic `pageSlug:component:index` form
(`validator.ts:67-71`), so the compiler must either preserve the id scheme
or re-stamp ids after transforming. `isRenderable` only fails on errors, so
a warning is survivable, but re-stamping is cleaner.

### 3. The vector source: `vectorForSite` / `strategyForSite` / `inferStrategy`

`src/fyd/builder/site-vectors.ts:35`, `src/fyd/builder/strategy-for-site.ts:49`,
`src/fyd/builder/infer-strategy.ts`. Today the composition operating point is
a tenant PIN (ping-fyd, coppersmith-plumbing) or a crude schema-role count,
never a function of the graph's actual shape. A composition compiler can
compute the 8-dimension vector from signals: media_density from gallery asset
count and hero presence, service_complexity from service count and
relationship fan-out, human_prominence from person count and roles,
locality from location count and service-area fields, urgency from
phone/hours/emergency signals. `planSite` already takes `vector` as an
opaque input, so swapping the source changes nothing downstream. Note the
precedence order (ownerIntent.strategy > pin > inference > default): signal
inference belongs at the inference layer, and the pin/override layers stay
as the owner's word. Also note: per-site pins currently hardcode the two
demo tenants to TECHNOLOGY and TRADES regardless of their graphs.

Bonus surface (declared, unwired): the registry `variants` field and
`operationalEvidence` future-contract (`registry.ts:46-60`), and the
strategy-layer `CompositionPolicy.navigationStrategy` / `objectEmphasis`
(`strategies.ts:63-71`). A compiler could start filling these instead of
inventing new schema.

## Open questions

1. Digest coverage for the compiler: the spec digest covers spec bytes, but
   the VECTOR source and any media-manifest inputs are not in the spec.
   Today the planner notes `composition: vector=... policy=...` in the
   manifest (`planner.ts:463-467`) and stamps `spec.archetype =
   nearestPresetName(vector)` (vocabulary only). A composition compiler needs
   its version and its signal snapshot pinned in the digest inputs, or
   "identical graph -> identical output" is asserted on incomplete inputs.
2. Media as a composition input: the pure-graph compile cannot see media
   (gallery emission requires `siteId` for the disk manifest). If media
   richness drives composition, the manifest must become an explicit,
   digest-covered composition input, with the same "deterministic disk
   input" contract the generator documents.
3. Owner-intent vocabulary: `normalizeOwnerIntent` currently handles only
   operatingConstraints (component removals), prohibitedPositioning, and a
   strategy override. There is no intent signal for "showcase my work" vs
   "drive phone calls" vs "look established". The compiler's "owner intent"
   input needs a schema before it can be honored.
4. The duplicate `CompositionPolicy` interfaces (`strategies.ts:63` vs
   `dimensions.ts:185`) share a name and overlap in purpose; the strategy
   layer's `navigationStrategy` and `objectEmphasis` are declared but never
   read. Consolidate or explicitly own the split before building on it.
5. Page vs single-page: the generator composes four pages, the golden route
   serves one (`build-client.tsx:84`), and nothing reads the declared
   `navigationStrategy`. Is the golden route single-page by product decision
   (then stop composing the other three), or is tab navigation missing (then
   the compiler's page-level composition has no surface)?
6. Gallery on the golden route: `planSite` never passes `siteId` to
   `generateSiteSpec`, so Gallery never emits on `/build/[siteId]`, while
   the renderer and `galleryEligible` are ready for it. The demo route passes
   `siteId` but skips `planSite`. Which path is canonical for media-backed
   composition?
7. Two render pipelines exist (golden: projection -> verify -> planSite ->
   intent -> validate -> BuildClient; demo: projection -> generateSiteSpec ->
   intent -> validate -> site-client). A composition compiler hooking into
   `planSite` only covers the golden path. Decide whether the demo path
   converges onto planSite or the compiler must hook both.
