# MAP-MEDIA: media management map + SIDE-01 re-observation

Mapper: MAP-MEDIA (read-only). Sources: the SIDE-01 worktree and the main
product repo, both read on the Pig via pigwsl-exec. No files were modified.
Worktree: `/home/nolan/worktrees/side-visual-identity`.
Main repo: `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24`.

## 1. SIDE-01 state (what exists, commit, files)

**Position.** The worktree is on detached HEAD `42f81d53` ("Lane D: Mission
Control dispatch UI/API vertical slice (2026-09-26)"). Verified with git that
this commit is an ancestor of the main repo's current HEAD `a8ed5103`
("Integrate P-01", branch `fyd/sprint-integration-2026-09-24`). The SIDE-01
work is **entirely uncommitted** in the working tree, and its base is stale
by 4 commits. Importantly, `git diff 42f81d53..a8ed5103` on every file SIDE-01
touches is empty, so the uncommitted changes apply cleanly onto main's current
state with no merge conflict.

**Modified files (git diff --stat):**
- `src/fyd/media/types.ts` (+8): adds optional `focalPoint?: { x, y }` to
  `FydMediaObject`, documented as fractions of width/height (0..1) for
  responsive art direction; renderers convert to `object-position`
  percentages. Generic, no pixel offsets, no per-image conditionals.
- `src/fyd/media/select.ts` (+27): adds `logoMediaFor(siteId, graph,
  objectId)`, the data-layer top of the resolution chain (explicit
  authorized logo -> representative object image -> type icon ->
  initial/glyph -> neutral fallback). Returns the first `role === "logo"`
  DisplayMedia from `select()`, or null. Comment block states the chain is
  data-driven with no per-object/per-customer conditionals.
- `src/app/o/[objectId]/page.tsx`: header face mark switches from an inline
  logo-or-initials conditional to the shared `ObjectVisual` component
  (`size="xs"`).
- `src/app/page.tsx` (PING home): the old hero section (PingWordmark,
  BlueprintGrid, HeroEvidenceCard, marketing copy) is replaced with a
  single `<PingHero tenant={tenant} />` component.
- `src/fyd/object/card.tsx`: `LogoMark` (inline logo-or-InitialsMark
  conditional) delegates to `ObjectVisual` (`size="sm"`).
- `src/fyd/ui/object-circle.tsx`: `LogoMark` (same inline conditional)
  delegates to `ObjectVisual`.

**New untracked files:**
- `src/fyd/ui/object-visual.tsx` (199 lines): the generic visual resolver
  plus renderer. `resolveObjectVisual(media, name, schema)` is pure and
  returns one of five kinds: logo | image | icon | initials | neutral.
  Resolution order: role "logo" with src -> photographic roles
  (hero/gallery/card) -> schema-family icon (lucide: business=Building2,
  service=Wrench, location=MapPin, project=FileText, external_identity=Share2)
  -> initials -> neutral (Shapes glyph). Logos render `object-contain`
  (never cropped/stretched); photos render `object-cover`. Always
  decorative (`aria-hidden`, alt="") next to the object name, which carries
  the accessible name. Sizes xs/sm/md/lg. No React state, safe in server and
  client components.
- `src/fyd/ui/__tests__/object-visual.test.tsx` (134 lines): unit tests for
  the resolver and component.
- `src/fyd/media/__tests__/object-visual-chain.test.ts` (136 lines):
  data-layer proof of the chain against three real pipeline manifests:
  `ping-fyd` (logoMediaFor resolves the supplied medallion, heroMediaFor
  resolves the artwork and never the logo, listObjectMedia sorts the logo
  first), `coppersmith-plumbing` (same selectors, same rules, no
  per-customer conditionals), `happy-place` (no logo: logoMediaFor is null,
  object falls through to the representative-image step). Asserts
  rightsSource/rightsBasis/derivation record/digest/focal point survive the
  read path.
- `src/fyd/media/manifests/ping-fyd.json`: the operator-supplied media
  manifest for site `ping-fyd`, generated 2026-09-27T00:44:15Z by
  `fyd-media@2`. Two media objects, both `rightsSource: "business-provided"`:
  (1) `fyd-media-6381a204e1e17876`, roles hero+gallery, 1672x941,
  title "PING network hero artwork", variants thumbnail(480x270)/card(768x432)
  plus more; (2) a logo-mark asset derived from it (roles logo,
  digest `a4faba6d9ff90b5c9f2b0116844b0e79944bee1b09f2624cb0eaa61fad8a41b5`).
  Provenance uses `direct-supply://nolan-geske/2026-09-26/...` source URLs
  with sourcePage recording the in-chat supply event ("PING brand artwork
  for the private FYD build: the 16:9 pig-network artwork (hero candidate)
  with direction to recreate the pig head as a standalone logo mark").
  Rights basis names Nolan Geske as supplier and states FYD claims no
  copyright; PING retains all rights. This is the authorized PING hero
  artwork, in the pipeline's canonical manifest shape.
- `src/fyd/media/run-ingest-supplied.ts` (241 lines): build-host ingest
  runner for operator-handed files (`npx tsx src/fyd/media/run-ingest-supplied.ts
  ping-fyd`). The explicit-supply path for when the URL-fetching ingest
  cannot apply (SSRF gate refuses non-public origins). Reuses the
  pipeline's own modules for digest (sha256 via derivatives.ts),
  derivatives (generateDerivatives into the content-addressed cache
  `public/fyd-media/<sha256>/`), media-object minting (acquireMedia's exact
  shape), and manifest assembly (ingest.ts's exact shape, real ingestRunId,
  pipelineVersion = MEDIA_MODULE_VERSION so bundle-media.ts accepts it).
  Asserts: rightsSource always "business-provided"; provenance uses
  `direct-supply:` scheme and never pretends a fetch happened; derivation
  (logo crop from hero original) is recorded in rightsBasis with the source
  digest. Deterministic: same bytes -> same digest -> same paths.
- `src/components/ping-hero.tsx` (220 lines): `PingHero` reads the
  `ping-fyd` manifest via `getPipelineManifest`, picks the hero-role media
  and logo-role media, and renders a full-bleed hero: the artwork as
  `object-cover` with `object-position: <focalX>% <focalY>%` (focal point
  from media truth, default 0.5/0.27), bottom-weighted and left-weighted
  scrims, logo medallion beside the wordmark. Returns null content when the
  pipeline has no hero: the hero then falls back to `PingHeroTypographic`
  (the pre-existing typographic hero, unchanged). Comment: "the hero then
  falls back to the typographic treatment, never an invented image."

**Untracked support dirs (not new code):**
- `public/fyd-media/6381a204.../` and `public/fyd-media/a4faba6d.../`:
  the ingested derivative bytes for the two ping-fyd assets.
- `.supplied/`: contains `ping-cosmos-hero-original.png` (the original
  artwork bytes) and `ping-fyd-projection.json` (a test fixture: a
  `ping-fyd-business` object, `ping.social.business@1`, used by the chain
  test). NOTE: the logo-mark source file `ping-mark.png` is NOT in
  `.supplied/`; only the derived bytes and manifest records remain.

**Half-finished / fragile edges in SIDE-01:**
1. `focalPoint` is now on the type, but only `PingHero` consumes it.
   `ObjectVisual` circles ignore it (they crop to a circle regardless).
   Zero committed site assets have it.
2. `run-ingest-supplied.ts` is a new runner with no wiring into any
   scheduled or documented flow; it runs only by hand from the repo root.
3. `PingHero` hardcodes manifest id `"ping-fyd"` and a default focal
   point; it is PING-specific in its data source while generic in its
   mechanics.
4. The ping-mark source PNG is missing from `.supplied/`; provenance says
   direct supply, but the original bytes for the logo asset cannot be
   re-derived from the worktree.
5. Tests were not run during this mapping (read-only mandate); they exist
   and are documented as runnable via `npx jest --config
   src/fyd/media/jest.config.cjs`.
6. `logoMediaFor`'s doc comment notes the ingest `roleFor()` mints "logo"
   only as a sole role, so a first-role check is complete; builders should
   keep that invariant if ingest ever mints multi-role logos.

## 2. Media truth model (types, relationships, provenance)

**Canonical types** (`src/fyd/media/types.ts`, fyd-media@2, committed):
- `RightsSource`: `business-provided | public-demo-source |
  unclear-reference-only`. Enforced, not just recorded:
  `isAcquirable()` admits only the first two; ingest refuses to fetch,
  store, derive, or serve unclear-reference-only assets (reference retained
  in manifest observations only).
- `FydMediaRole`: hero | gallery | logo | card | service | team | location
  | project | thumbnail.
- `FydMediaObject`: id, schema `"ping.social.media@1"`, title,
  mediaType "image", roles[], rightsSource, rightsBasis (human sentence,
  never empty, never implies FYD copyright ownership), lifecycle
  (source_reference -> fetched -> digested -> derivatives_ready ->
  published -> stale), provenance {sourceUrl, sourcePage, observedAt,
  redirectChain?, fetchNote?}, digest (sha256 of original bytes, the dedupe
  key), originalFormat, width, height, variants[], depicts[] (object ids),
  altText / altTextSource ("source" | "generated" | "none"),
  visibility "public".
- `MediaVariant`: name, width, height, format, url (public path
  `/fyd-media/<hash>/<name>-<w>w.<ext>`, same-origin, never a hotlink),
  bytes, digest, derivedFrom (sha256 of original bytes: the derived-asset
  relationship is data, not convention).
- `MediaObservation`: per fetch-attempt evidence trail (ingested | failed |
  rejected | duplicate, with reason, digest, redirect chain).

**Relationships** (`src/fyd/media/attach.ts`, committed): semantic, never
positional. `predicateForSubjectSchema`: Business `represented_by` Media,
Service `illustrated_by` Media, Project `has_media` Media, anything else
`has_image`. The base graph is never mutated; media objects and
relationships are appended, with deterministic relationship ids from
media digest + predicate. A logo is media with role "logo" that
`represented_by`s the business: "the logo is not the object," it is typed
media associated with the object, owned by the media authority.

**Selection** (`src/fyd/media/select.ts`, committed): `select()` joins the
manifest to the graph via `attachMediaToGraph` and walks the relationships
from the object. One selector for every surface (Page, Circle, ObjectView,
feed/social/agent context planned). Exported selectors:
`listObjectMedia` (all displayable, logos first, stable sort),
`heroMediaFor` (hero-role first then photographic; NEVER a logo-role asset:
a logo must never be stretched into a banner; null when no photographic
acquired media), `galleryMediaFor` (acquired photographic assets only;
logos, heroes, and thumbnail derivatives excluded; empty, never null).
Variant preference: HERO_PREFERENCE = hero > card > w768 > thumbnail > w480,
else widest non-blur. `toDisplayMedia` emits `DisplayMedia` (id, role =
first role, src, blurUrl, width, height, alt, rightsSource, rightsBasis,
sourceUrl, digest, observedAt), gated through `safeDisplayUrl` (same-origin
paths pass; anything else must clear the safe-link allowlist, else the
caller renders its no-media fallback). The manifest is re-read from disk on
every call (freshness outranks memo).

**Owner override** (`src/fyd/media/owner-hero.ts`, committed):
`resolveHeroMedia` wraps `heroMediaFor`; the owner's recorded selection wins
only when it names an acquired, photographic, variant-bearing asset attached
to the object. Stale/mistyped/revoked/rights-rejected picks fall back to
auto. Records basis ("owner" | "auto" | "owner-fallback") plus a
machine-readable note (consumed by the "Why this?" affordance).

**Authority binding and projection** (committed):
- `src/fyd/media/authority-binding.ts`: pipeline -> PING media authorities
  (bytes to `src/lib/blob-storage.ts`, records to `src/lib/media-kv-store.ts`,
  served via the public gate in `src/lib/media.ts`). Fail-closed and
  idempotent; the factory never serves a byte itself.
- `src/fyd/media/authority-projection.ts`: PING authority -> display. Joins
  manifest evidence (rights, provenance, semantic attachment) with the
  authority's serving truth; anything the gate does not approve is never
  projected. No-media hero resolves to a generated treatment, never a
  broken image.
- `src/fyd/media/generated-treatment.ts`: deterministic visual from the
  object's own tokens (palette + initial + foreground, `media-tokens.ts`).
  Carries no image URL, structurally incapable of being a broken image;
  caption discloses it is not a photograph.
- `src/fyd/media/circle-background.ts`: circle background resolver: smallest
  hero/gallery derivative, else a deterministic gradient from
  sha256(objectId).
- `src/fyd/media/bundle-media.ts`: `getPipelineManifest` validates the
  manifest (`validatePipelineManifest`); the production read path.
- `src/fyd/media/site-bundle.ts`: joins tenant graph + site spec + manifest
  for the visitor API (Ask FYD reads the same facts as rendered pages).

**Pipeline** (`discover.ts -> ingest.ts -> acquire-media.ts -> safe-fetch.ts
(SSRF gate) -> derivatives.ts -> provenance.ts -> bundle-media.ts`): URL
sources are observed, fetched behind the SSRF gate, hashed, derived
(sharp), and bundled into per-site manifests under
`src/fyd/media/manifests/<siteId>.json`.

**What renderers do NOT own:** renderers receive serialized `DisplayMedia`
through `RenderContext` (see `src/fyd/components/renderer.tsx` RenderContext
docs: "the renderer never selects media itself") and through
`ObjectMediaView` (`src/fyd/object/view.ts:336`: id, role, src, alt, rights,
sourceUrl, digest, observedAt). Media truth lives in the manifest and the
media authority; the renderer consumes it.

**Business objects carry no logo/image fields on schema.** The fixture graph
`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts:33` shows a raw
`fields.images` string (website-derived URL); that is untyped observation
data, not media truth, and nothing in the render path reads it for display.

## 3. Per-site media inventory (HPP, Coppersmith)

**Happy Place** (`src/fyd/media/manifests/happy-place.json`,
generator `fyd-media@2`, 2026-09-25): 5 media objects, ALL role `gallery`,
all 1080x1440 portrait (original project photography from the business's
own site blob storage), variants thumbnail(480x640)/card(768x1024)/blur
only. No logo-role asset. No hero-role asset. `rightsSource`:
`public-demo-source` on all 5. `altTextSource`: `none` on all 5 (DisplayMedia
alt falls back to title, e.g. "Happy Place Carpentry project photo 1", then
to "Business photo"). Focal points: none.

**Coppersmith Plumbing** (`src/fyd/media/manifests/coppersmith-plumbing.json`,
generator `fyd-media@2`, 2026-09-21): 11 media objects.
- 2 logo-role: "coppersmith logo black n copper" and "coppersmith new logo
  white", both 400x262, variants thumbnail/blur only.
- 1 hero+gallery-role: "hvac heat", 1000x563, variants
  thumbnail(480x270)/card(768x432)/blur. NOTE: no `hero` named variant
  exists; the largest derivative is 768px wide.
- 8 gallery-role: five tiny manufacturer brand images (Rinnai 118x20,
  Rheem 124x123, Burnham 183x45, Breezair 200x40, AOSmith 187x58),
  Kohler fixture 999x999, two Trinsic faucet photos 600x600.
`rightsSource`: `public-demo-source` on all 11. `altTextSource`: `none` on
all 11. Focal points: none.
QUALITY NOTE: the gallery for a business contains 118-200px-wide brand
badges that `galleryMediaFor` does not filter; a composition compiler
reading the gallery would treat brand badges as photographs.

**Live manifests:** `happy-place-live.json` and
`coppersmith-plumbing-live.json` also exist in the manifests dir (both
updated 2026-09-25), plus `live-9d13c4196b4f.json`; their role in the
render path was not traced in this pass.

**PING (`ping-fyd`, SIDE-01, uncommitted):** 2 media, `business-provided`:
16:9 pig-network hero artwork (1672x941, roles hero+gallery) and a logo-mark
derivation (roles logo). The authorized PING hero. Note the task's standing
law: future site media should use authorized piging85 media or remain
intentionally empty, never generic AI filler; the explicit-supply runner
(`run-ingest-supplied.ts`) is the mechanism for that.

## 4. Renderer bindings (file:line, main repo)

Page-seam resolution (all on `/home/nolan/projects/ping`):
- `src/app/sites/happy-place/page.tsx:43` `heroMediaFor(SITE_ID, graph,
  spec.ownerObjectId)`; `:47` `galleryMediaFor(...)`.
- `src/app/sites/coppersmith-plumbing/page.tsx:44`, `:48` (identical).
- `src/app/build/[siteId]/page.tsx:89` `heroMediaFor` (owner build surface).
- `src/app/sites/_shared/site-client.tsx:69-78,89-90`: heroMedia/galleryMedia
  props threaded into RenderContext.

Hero:
- `src/fyd/components/hero-section.tsx:136` main `<img>` (absolute,
  object-cover, scaled blur backdrop); `:145` sharp foreground `<img>`;
  `:178` `showPhoto = hero !== null && !mediaFailed` latch; `:199-215`
  no-media fallback is a deterministic token-derived accent wash (VQ-004:
  "not a flat empty panel; no images, no invented content"). Failing photos
  degrade to the same treatment.

Gallery and cards:
- `src/fyd/components/renderer.tsx:2057-2095` `GallerySection` (grid 2/3
  cols, each `<img>` with width/height, lazy, sizes, inline
  aspectRatio 4/3 + objectFit cover); `:2015-2020` eligibility:
  renders if and only if `ctx.galleryMedia.length > 0`, else the section
  does not exist. Each item carries a `GalleryMediaWhyThis` provenance
  affordance (`:2028-2048`).
- `src/fyd/components/renderer.tsx:744` card-media `<img>` (featured
  cards); `:1481` rail card `<img>` (7rem square cover); `:1660` list-row
  `<img>` (112px). Media per object comes from `ctx.objectMedia` keyed by
  object id (`:715`, `:1461`, `:1642`), filtered by `photographicMedia`.
- `src/fyd/object/card.tsx:38` (main): `projection.media.find(m => m.role
  === "logo")`, else `InitialsMark` (`:49`,
  `src/fyd/object/evidence-chrome.tsx:195`).
- `src/fyd/ui/object-circle.tsx:48` (main): same logo find; `:143` hero =
  first hero|gallery media; fallback per `src/fyd/object/circle-adapter.ts:28`
  (deterministic gradient).
- `src/app/o/[objectId]/page.tsx:192` (main): hero = first hero|gallery;
  header logo-or-initials conditional.
- `src/fyd/proceduralize/generator.ts:206`: gallery section is generated
  only when `galleryMediaFor(...).length > 0` (structural differentiation
  from the graph).
- `src/fyd/acquisition/live-loop.ts:629-630`: hero/gallery selectors used
  in acquisition health reporting.

SIDE-01's bindings (uncommitted, worktree only): the header (`page.tsx`),
`card.tsx`, and `object-circle.tsx` logo finds are all replaced by the
single `ObjectVisual` resolver; home hero replaced by `PingHero`. Builders
should treat the SIDE-01 bindings as the target, not the main-repo
per-file conditionals.

## 5. Reuse recommendations (import, do not reinvent)

- **Selection:** `heroMediaFor`, `galleryMediaFor`, `listObjectMedia` from
  `src/fyd/media/select.ts`; `logoMediaFor` from SIDE-01's uncommitted
  `select.ts` diff once integrated. These are the one selector every
  surface uses; never select media in a component.
- **Resolution chain:** SIDE-01's `resolveObjectVisual` +
  `ObjectVisual` (`src/fyd/ui/object-visual.tsx`, uncommitted). It is the
  single implementation of the product law: explicit authorized logo ->
  representative object image -> type icon -> initial/glyph -> neutral
  fallback. The per-file logo finds in main's `card.tsx`,
  `object-circle.tsx`, and `o/[objectId]/page.tsx` should be retired in
  favor of it.
- **Manifest shape:** `src/fyd/media/manifests/ping-fyd.json` (SIDE-01) is
  the pattern for `business-provided` assets; the rights-basis sentence,
  `direct-supply:` provenance, and derivation record are the template for
  authorized piging85 media.
- **Supply path:** `src/fyd/media/run-ingest-supplied.ts` (SIDE-01) for any
  future operator-supplied asset; it keeps bytes out of the URL-fetch
  pipeline and provenance honest.
- **Read path:** `getPipelineManifest` (`bundle-media.ts`) and the
  `DisplayMedia` serialized shape; `safeDisplayUrl` for any new render seam.
- **Owner override:** `resolveHeroMedia` (`owner-hero.ts`) when the owner
  surface picks heroes.
- **Fallbacks:** `generated-treatment.ts` and `circle-background.ts` for
  no-media states; the hero-section accent wash (VQ-004) for hero-less
  pages. Composition should read "section renders nothing" as a legal
  output (gallery eligibility `:2015-2020`), not as a gap to fill.
- **Art direction:** the SIDE-01 `focalPoint` field on `FydMediaObject`
  plus the `object-position: x% y%` conversion in `PingHero`; extend to
  other hero surfaces rather than inventing a second mechanism.

## 6. Gaps (what is missing for media-driven composition)

1. **No focal points on any committed asset.** The field exists only in
   SIDE-01's uncommitted type, and only the ping-fyd hero has a value. A
   composition compiler doing art direction across breakpoints has nothing
   to read for HPP's 5 portraits or Coppersmith's hero.
2. **No richness/quality scoring in the committed tree.** Commit 424cf9fd
   ("deterministic media scoring": relevance, documentary, resolution,
   aspect, uniqueness; MIN_SCORE rejections) exists only in a separate
   `fyd-product-lane` tree; nothing in `src/fyd/media` scores assets. A
   compiler cannot rank "which photo carries the page" today.
3. **No dimension gate on gallery.** Coppersmith's gallery mixes 999px
   fixture photos with 118x20 brand badges; `galleryMediaFor` excludes
   only logos/heroes/thumbnails by role, not by size or subject.
4. **No hero-size derivatives.** The Coppersmith hero asset's largest
   rendition is the 768px card; HERO_PREFERENCE falls back to card/w768.
   Full-bleed hero surfaces are upscaling a card derivative.
5. **Alt text is empty everywhere.** All 16 committed site assets are
   `altTextSource: "none"`; DisplayMedia.alt degrades to the title or the
   generic "Business photo". No source-ingested or generated alt pipeline
   is wired.
6. **No subject-matter or palette metadata.** Manifests carry width/height
   (orientation is derivable) but no "what is depicted" signal, no
   dominant-color tokens, no portrait-vs-landscape normalized flag a
   compiler could use for layout decisions.
7. **No aspect/crop metadata for cards.** Cards force aspect 4/3 cover or
   7rem squares; there is no per-asset crop recommendation beyond the
   single focal point.
8. **Rights skew.** All site media is `public-demo-source`; only SIDE-01's
   uncommitted ping-fyd assets are `business-provided`. No UI path was
   observed wiring `resolveHeroMedia`'s owner selection into the owner
   surface (DemoOwnerMode exists in the site pages; its hero-selection
   wiring was not traced).
9. **The resolution chain's bottom is thin.** Only 5 schema-family icons
   exist; the "type-specific icon" step is coarse, and the initials/neutral
   steps carry no brand differentiation.

## 7. Open questions

1. Integration: should SIDE-01's uncommitted work (chain + ObjectVisual +
   ping-fyd manifest + supply runner + PingHero) be committed onto
   `fyd/sprint-integration-2026-09-24` as-is? It rebases cleanly; the open
   step is verifying the two test files pass and deciding whether
   `PingHero`'s hardcoded `ping-fyd` site id should be parameterized.
2. Should `galleryMediaFor` gain a minimum-dimension or subject gate so
   118px brand badges never reach a gallery surface, or is that the
   composition compiler's job at read time?
3. Who owns focal points going forward: manual operator annotation, a
   heuristic (faces/rule-of-thirds), or a model? And should backfill cover
   the 16 committed site assets?
4. Should the pipeline mint true `hero`-named derivatives (e.g. 1600w) for
   hero-role assets, given hero surfaces currently upscale card
   derivatives?
5. Alt text: source-ingested, lane-generated, or left empty with titles as
   the fallback? (Standing honesty rules apply: generated alt must be
   labeled as such, never presented as source truth.)
6. `live-9d13c4196b4f.json` and the `*-live.json` manifests were observed
   but not traced; builders should confirm which manifest the served
   render path actually reads before touching media selection.
