# PRESENTATION OBSERVATIONS + MEDIA SCORING — Locked V1 Spec

Status: LOCKED. Product lane only. Spec document only. No code.
Scope: feeds implementation sequence steps 3 (presentation observations) and 4
(media role scoring) of fyd-builder-authorization-2026-09-25.md, under
authorization Decision 1 (Media: ingest, don't hotlink) and Correction 1
(Tokens: DTCG, not sampled-palette).

Terminology anchor: this spec uses the authorization's layer names.
REAL BUSINESS -> OBSERVATIONS (canonical business truth, via JSON-LD and other
deterministic extraction in the sibling lane) -> EVIDENCE -> OBJECT GRAPH.
PRESENTATION OBSERVATIONS (this spec, Part A) -> DESIGN SIGNAL, non-canonical.
Both plus OWNER INTENT feed the PLANNER -> SITE SPEC.

## Standing rules this spec enforces

1. Signal-not-authority. Presentation observations are stored in a separate
   block from business evidence, explicitly marked non-canonical. The planner
   may weigh them as design signal; it may never use them as facts about the
   business.
2. No business-fact inference from presentation. A layout, color, label, or
   image may never become or modify an object, attribute, or relationship.
3. Media bytes never become canonical business truth (authorization Decision 1).
4. MEDIA ACQUISITION is protected substrate. This spec extends ALONGSIDE it:
   it reuses the existing modules as-is where named, and adds new bounded
   modules where named. It rewrites nothing.
5. Determinism: same source bytes -> same observations -> same scores ->
   same plan inputs. Scoring functions are pure: same media in, same score out.

---

# PART A — PRESENTATION OBSERVATIONS

## A.0 The observation record

All presentation observations for one source page are stored in one record,
`PresentationObservation`, bound to the exact acquisition it was derived from.
It is produced from served HTML + CSS only (L1 static observations, or L2
rendered DOM where the acquisition stack ran L2). It is never hand-edited.

```typescript
/**
 * One source page's presentation signal. NON-CANONICAL: design signal only.
 * The planner may use this to choose variants, tokens, and section order.
 * It may never be used to create, update, or delete business objects,
 * attributes, or relationships.
 */
interface PresentationObservation {
  /** Source page URL that was observed (final URL after redirects). */
  sourceUrl: string;
  /** ISO 8601 time the source was acquired. */
  observedAt: string;
  /** Hash of the served HTML bytes this observation was derived from. */
  sourceHash: string;
  /** Acquisition level that produced the source: 1 (static) or 2 (rendered). */
  levelUsed: 1 | 2;
  /** Explicit non-authority marker. Always the literal string below. */
  authority: "signal-not-authority";
  /** Schema version of this observation record. */
  obsVersion: "presentation-obs@1";

  logo: LogoObservation[];
  brandColors: BrandColorEvidence[];
  typography: TypographyObservation;
  imageAspects: ImageAspectDistribution;
  imageDensity: ImageDensity;
  navigation: NavigationStructure;
  sectionSequence: SectionObservation[];
  ctas: CtaInventory;
  layoutDensity: LayoutDensity;
  borderRadius: BorderRadiusTendency;
  imageTreatment: ImageTreatmentTendency;
}

/** Provenance every observation carries back to the source bytes. */
interface ObservationProvenance {
  /** CSS selector path or attribute pattern that yielded the value. */
  observedFrom: string;
  /** served-css | computed-style | dom-structure | meta-tag */
  method: "served-css" | "computed-style" | "dom-structure" | "meta-tag";
}
```

Confidence tiers, used identically on every field:

- `direct`: value read from served HTML/CSS or computed style with no
  inference. Example: `font-family` declared in a stylesheet rule that
  matches the element.
- `derived`: value computed deterministically from direct values by a
  documented rule. Example: color ranked by occurrence count across served
  stylesheets.
- `inferred`: value guessed by pattern (regex on class names, text matching).
  Only allowed where the field definition explicitly permits it; the planner
  must discount inferred values.

## A.1 Logo candidates

Purpose: recover the business's actual mark for the Navigation component
(optional brand display), not for any identity fact about the business.

```typescript
interface LogoObservation {
  /** Resolved absolute URL of the image candidate. */
  url: string;
  /** header | hero | footer | og-image | jsonld | favicon */
  position: "header" | "hero" | "footer" | "og-image" | "jsonld" | "favicon";
  /** Rendered/displayed pixel dimensions, or intrinsic when not rendered. */
  dimensions: { width: number; height: number; measured: "rendered" | "intrinsic" };
  /** png | jpeg | webp | svg | gif | other */
  format: "png" | "jpeg" | "webp" | "svg" | "gif" | "other";
  /** direct | inferred */
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}
```

Observed-from, in priority order:

1. `header img` (first img inside `header`, `nav`, or `[role="banner"]`) ->
   position `header`, confidence `direct`.
2. `<meta property="og:image" content>` -> position `og-image`, confidence `direct`.
3. JSON-LD `logo` field on the business entity -> position `jsonld`, confidence `direct`.
4. `<link rel="icon" href>` -> position `favicon`, confidence `direct`.
5. Footer fallback: first img inside `footer` whose src matches
   `/logo|brand|mark/i` -> position `footer`, confidence `inferred`.

Dimensions: L2 rendered run uses `getBoundingClientRect()` of the img element
(`measured: "rendered"`); L1-only uses decoded intrinsic dimensions after
ingest (`measured: "intrinsic"`). Records with both prefer rendered.
Minimum candidate floor: width >= 32 and height >= 16; anything smaller is not
recorded (favicons are kept as favicon-position records only, never promoted).

Planner consumption: logo candidates feed the Navigation component's brand
mark slot only. If the highest-confidence header/og/jsonld candidate exists
and passes media ingest (Part B/C), Navigation may render it; otherwise the
business name in type is the fallback. The planner never treats a logo as
proof of anything about the business.

## A.2 Brand-color evidence

Per Correction 1: recover design constraints from served CSS, not one sampled
pixel. This is a RANKED EVIDENCE LIST, not a palette claim.

```typescript
interface BrandColorEvidence {
  /** Normalized 6-digit hex, e.g. "#5E6259". */
  color: string;
  /** Number of distinct rule occurrences across served stylesheets. */
  occurrences: number;
  /** The CSS properties where this color was found, e.g. ["background-color", "color", "border-color"]. */
  roles: string[];
  /** direct | derived */
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: parse all served stylesheets (L1: `<style>` blocks and linked
CSS fetched through the acquisition policy; L2: `document.styleSheets` rules).
Count occurrences of each color literal in `color`, `background-color`,
`background`, `border-color`, `fill`, `stroke` declarations. Normalize to
6-digit hex (expand 3-digit, lowercase, drop alpha unless alpha < 0.98, in
which case record separately with the alpha value). Rank descending by
occurrences; keep the top 12. No clustering into "primary/secondary" here:
the ranking is the signal, and the token compiler (DTCG layer) maps it to
PRIMITIVE tier tokens.

Confidence rule: colors read verbatim from served CSS rules are `direct`.
The ranking itself is `derived`. Computed-style sampling of rendered pixels
is not a method here: pixels are sampled from source design, never FYD renders.

Planner consumption: the top-3 non-neutral colors become candidate brand
tokens (subject to contrast checks by the token compiler); warm-neutral
candidates seed content surfaces. Planner may preserve a clearly deliberate
source palette (HPP warm neutrals + terracotta + deep teal) or improve a weak
one, per research doc 05's "good source design preserved, bad improved".

NON-GOAL guard: color evidence never implies business category, quality,
service area, or any other fact. It seeds tokens only.

## A.3 Font-family observations

```typescript
interface TypographyObservation {
  /** Ordered stack as declared, e.g. ["Georgia", "Times New Roman", "serif"]. */
  displayStack: string[];
  bodyStack: string[];
  /** Ratio of computed h1 font-size to computed body font-size. */
  headingBodyScaleRatio: number | null;
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: the `font-family` computed style (L2) or matching served
stylesheet rule (L1, selector match against the element) of the first `h1`
(or `.hero h2` fallback) for the display stack, and of the first `p` inside
`main` for the body stack. `headingBodyScaleRatio`: computed `font-size` of
the same h1 divided by computed `font-size` of the same body p; `null` when
either is unreadable (L1 without usable CSS).

Confidence rule: `direct` when read from computed style or a matched
stylesheet rule; `derived` for the ratio (always derived from the two
font-size values).

Planner consumption: display/body stacks seed the DTCG type tier (serif
display for HPP's Georgia character vs clean sans utility). The scale ratio
seeds the type scale magnitude. Planner never treats font choice as a fact
about the business.

## A.4 Image aspect distributions

```typescript
interface ImageAspectDistribution {
  /** Buckets over all content images observed on the page (excluding icons, 1x1, sprites). */
  buckets: {
    square: number;     // 0.9 <= w/h <= 1.1
    portrait: number;   // w/h < 0.9
    landscape: number;  // 1.1 < w/h <= 1.9
    wide: number;       // w/h > 1.9
  };
  /** Total content images counted. */
  total: number;
  /** Most common bucket. */
  dominant: "square" | "portrait" | "landscape" | "wide" | "none";
  /** dominant bucket share of total, 0..1 */
  dominantShare: number;
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: all `<img>` in `main` with natural or rendered dimensions,
filtered: exclude width or height < 40 (icons/sprites), exclude known pixel
trackers (1x1). L2: `naturalWidth`/`naturalHeight`. L1: width/height
attributes when present; images without any dimension info are counted in
`total` but not bucketed. Aspect computed as w/h.

Planner consumption: the dominant bucket seeds media treatment intent for
the gallery (e.g. landscape-dominant source -> editorial variant; mixed ->
masonry). Confidence: bucket counts are `direct` (L2) or `direct` from
attributes (L1); `dominant` is `derived`.

## A.5 Image density

```typescript
interface ImageDensity {
  /** Content images per 1000 words of visible body text. */
  imagesPerThousandWords: number;
  /** Content images per counted section (see A.7). */
  imagesPerSection: number;
  /** low | medium | high, from fixed thresholds below */
  band: "low" | "medium" | "high";
  confidence: "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: content image count from A.4; visible text from the served
HTML body with script/style/nav/footer removed, word-counted; section count
from A.7. Thresholds: `low` < 0.5 images/1000 words AND < 1 per section;
`high` > 3 images/1000 words OR > 4 per section; else `medium`.

Planner consumption: density band seeds section rhythm intent and the
media-rich vs editorial Hero variant gate (media-rich requires at least
`medium` density with at least one qualifying hero candidate).

## A.6 Navigation structure

```typescript
interface NavigationStructure {
  /** Link labels in DOM order, visible text trimmed. */
  labels: string[];
  /** Parallel array: resolved href per label. */
  hrefs: string[];
  /** Number of top-level nav items. */
  depth: number;
  /** CTA observed inside the nav (button-styled link), if any. */
  navCta: { label: string; href: string } | null;
  /** Whether the nav is sticky (position: sticky|fixed on the nav element). */
  sticky: boolean;
  /** direct | inferred */
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}
```

Observed-from: `header nav` or `[role="navigation"]` first match in DOM order;
labels = anchor inner text; CTA prominence in nav = anchor whose class list
or computed style shows button treatment (background fill, border-radius,
padding above text-link baseline): matched by computed style (L2) or
`/btn|button|cta|quote|call/i` class regex (L1, confidence `inferred`).
Sticky: computed `position` on the nav/header element.

Planner consumption: source nav labels seed the Navigation component's
service taxonomy links (Coppersmith's Plumbing/HVAC/Cooling/Heating/
Ventilation vs the generic Home/About/Services); nav CTA presence seeds the
planner's primary CTA placement map. Labels are used as editorial signal
only: they are not added as business services.

NON-GOAL guard: nav labels never become Service objects. A label like
"Cooling" does not create a service; it only suggests what a service taxonomy
looks like for this business.

## A.7 Section sequence

```typescript
interface SectionObservation {
  /** Order index, 0-based, in DOM order. */
  order: number;
  /** semantic | inferred */
  kind: "semantic" | "inferred";
  /** hero | services | projects | story | testimonials | area | contact | footer | unknown */
  sectionKind: "hero" | "services" | "projects" | "story" | "testimonials" | "area" | "contact" | "footer" | "unknown";
  /** First ~80 chars of the section's first heading, or "" when none. */
  heading: string;
  /** Approx pixel height of the section (L2) or null. */
  heightPx: number | null;
}
```

Observed-from: direct children of `main` (plus `header` hero blocks) in DOM
order. `sectionKind` is `semantic` when the section uses `<section>` with an
aria label or id/name matching the kind keywords; `inferred` when matched by
heading text regex (e.g. `/our (work|projects)/i` -> projects,
`/testimonial|review/i` -> testimonials, `/about|our story|family/i` -> story,
`/service area|areas we serve/i` -> area, `/contact|get in touch/i` -> contact).

Planner consumption: section sequence seeds editorial ordering intent (where
the source puts testimonials, where it puts the story). The planner's
deterministic rules still gate on object evidence (e.g. a testimonials
section requires actual review objects; source order never overrides
evidence sufficiency).

NON-GOAL guard: section sequence never creates sections the object graph
does not support, and never reorders the planner's evidence-gated sequence
by itself. It is a tiebreaker and ordering hint, nothing more.

## A.8 CTA frequency and hierarchy

```typescript
interface CtaInventory {
  /** All CTA-like elements in DOM order. */
  items: Array<{
    label: string;
    href: string | null;
    /** primary | secondary | tertiary, observed emphasis */
    observedTier: "primary" | "secondary" | "tertiary";
    /** in-nav | hero | body | footer */
    placement: "in-nav" | "hero" | "body" | "footer";
    /** tel: | mailto: | form | page | external */
    targetKind: "tel:" | "mailto:" | "form" | "page" | "external";
  }>;
  /** Count of primary-tier CTAs. */
  primaryCount: number;
  /** The most frequent primary-tier label, or null. */
  dominantPrimaryLabel: string | null;
}
```

Observed-from: anchors and buttons whose class matches
`/btn|button|cta|quote|estimate|call|schedule/i` or whose computed style is
button-like (same rule as A.6). Tier: `primary` = filled background +
high-contrast text + largest padding among CTAs on the page; `secondary` =
outlined or smaller filled; `tertiary` = text link with CTA wording.
Placement: nearest ancestor landmark (header/nav, hero section, footer, else
body). TargetKind from href scheme/prefix.

Planner consumption: feeds the CTA hierarchy in SiteSpec (primary/secondary/
tertiary with placement map nav/hero/section/footer per research doc 06).
The planner never invents a conversion action the business does not offer:
a tel: CTA exists only if a phone number is in the canonical object graph;
a form CTA exists only if the source shows a real form or the owner approves one.

NON-GOAL guard: CTA labels never become business capabilities. "Get a Free
Estimate" on the source site does not create an estimate capability; the
capability comes from canonical extraction only.

## A.9 Layout density

```typescript
interface LayoutDensity {
  /** Median of computed padding-top+bottom of top-level sections (L2), px. */
  medianSectionPaddingY: number | null;
  /** Tendency bucket from fixed thresholds. */
  rhythm: "tight" | "comfortable" | "airy";
  /** Max content width observed (computed max-width of main content wrapper), px or null. */
  contentMaxWidth: number | null;
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: L2 computed styles on `main > section` (or equivalent top
containers): sum of padding-top and padding-bottom per section, median taken.
Thresholds: `tight` median < 64px; `airy` median > 160px; else `comfortable`.
L1-only: `rhythm` may be inferred from utility-class patterns
(`/py-(0|2|4|8)/` -> tight, `/py-(16|20|24)/` -> comfortable,
`/py-(28|32|40)/` -> airy); confidence then `inferred`. Null when neither
is available.

Planner consumption: seeds section rhythm intent tokens
(tight/section/feature/hero). Pure design signal.

## A.10 Border/radius tendencies

```typescript
interface BorderRadiusTendency {
  /** Median computed border-radius across buttons and cards (L2), px. */
  medianRadiusPx: number | null;
  /** Tendency bucket. */
  shape: "sharp" | "soft" | "round";
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}
```

Observed-from: computed `border-radius` on the CTA elements (A.8) and card-like
containers (`.card`, `[class*="card"]`, grid children in services/projects
sections); median. Thresholds: `sharp` median < 4px; `round` median > 16px;
else `soft`. Confidence: `direct` from computed style; `derived` for the
bucket.

Planner consumption: seeds the DTCG shape tier (radius tokens). Pure design
signal.

## A.11 Image treatment tendencies

```typescript
interface ImageTreatmentTendency {
  /** photography | illustration | mixed, by majority of content images */
  medium: "photography" | "illustration" | "mixed";
  /** documentary | polished | mixed: real work photos vs staged/stock look */
  finish: "documentary" | "polished" | "mixed";
  /** Method used for the finish judgment (must be declared, never silent). */
  finishMethod: string;
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}
```

Observed-from: `medium`: direct from image content (photo vs vector/illustration
is observable from format + pixel variance; SVG -> illustration). `finish`:
V1 rule, deterministic and inspectable: images whose alt text or nearby
caption references a real job, location, or person (`/project|job site|our
team|before|after|installed/i`) count documentary; images with stock-agency
watermarks, generic filenames (`stock-`, `shutterstock`, `istock`, `adobe-
stock`), or no contextual caption count polished. Majority decides; a
50/50 split records `mixed`. The rule text itself is stored in
`finishMethod` so the judgment is auditable.

Planner consumption: seeds per-section media treatment intent
(documentary/polished) and the Hero documentary-bar gate in Part B.

NON-GOAL guard: image treatment never judges the business, its quality, or
its trade. It judges pixels for design fit only.

## A.12 Storage, marking, and planner contract

1. The `PresentationObservation` record is stored in a `designSignal` block
   on the site record, sibling to (never inside) the business-evidence block.
   The `authority: "signal-not-authority"` field is mandatory and validated
   at write time; a record missing it is rejected, not defaulted.
2. Every field carries its own confidence. Planner weighting rule, fixed:
   `direct` may gate a variant choice; `derived` may seed a token; `inferred`
   may only break ties between otherwise-equal planner options.
3. The planner may not read any presentation field to answer a business
   question (name, phone, hours, services, areas). If a pipeline stage needs
   a business fact, it reads canonical evidence, full stop.
4. Owner intent outranks source signal outranks family default, for design
   choices only. Source signal never outranks canonical truth for facts.
5. Presentation observations are re-derived from source bytes on re-acquire;
   they are never manually corrected into business truth.

---

# PART B — MEDIA ROLE SCORING

This part extends the protected media pipeline ALONGSIDE it. The pipeline
(src/fyd/media/: ingest.ts, discover.ts, safe-fetch.ts, derivatives.ts,
types.ts, manifests) is reused as-is for acquisition, rights gating, digest,
and derivatives. This spec adds: scoring inputs and the scoring function,
per-role acceptance bars, rejection rules, and the structural namespace
guarantee. The new code lives in a new bounded module
(`src/fyd/media/score.ts` + role tables), called by ingest/select between
digest and role assignment; it does not modify existing modules.

## B.0 Scoring inputs

Every scored candidate is an acquired `FydMediaObject` (bytes on disk,
digest computed, dimensions known). Scoring inputs:

```typescript
interface MediaScoreInput {
  /** The acquired asset being scored. */
  asset: FydMediaObject;
  /** Candidate display role being scored for. */
  role: MediaRole;
  /** Trade of the current business, e.g. "carpentry", "plumbing". From canonical objects, never inferred from pixels. */
  businessTrade: string;
  /** All other acquired assets for this business (for duplication checks). */
  siblingAssets: FydMediaObject[];
  /** Source presentation observations for context (Part A). */
  presentation: PresentationObservation | null;
}

/** Roles the family needs. Maps to existing FydMediaRole plus new ones. */
type MediaRole =
  | "hero-documentary"   // was "hero": the above-the-fold trade proof photo
  | "service-imagery"    // per-service supporting images
  | "owner-portrait"     // real people behind the business
  | "project-photo"      // completed-work documentation
  | "gallery";           // general supporting imagery
```

Score components, each 0..1, deterministic from asset data only:

1. `onTradeRelevance`: does the image depict THIS business's trade?
   Deterministic V1 inputs: alt text, nearby caption/heading text, source
   page section kind (from Part A.7 section the image sits in), and filename
   tokens, matched against the business trade's keyword set (trade keyword
   sets are data files per trade, e.g. carpentry: deck, wood, framing,
   fence, drywall; plumbing: pipe, fixture, water heater, drain).
   Scoring: full match on alt/caption tokens -> 1.0; match on section
   context only -> 0.6; filename tokens only -> 0.4; no signal -> 0.2
   (never 0: absence of evidence is not evidence of absence). Cross-trade
   tokens (e.g. plumbing tokens on a carpentry site) cap this at 0.1.
2. `documentarySignal`: real work vs stock/generic. Inputs: alt/caption
   referencing real jobs, locations, people (same rule as A.11) -> 1.0;
   stock-agency markers (filename or metadata) -> 0.0; neither -> 0.5.
3. `resolutionAdequacy`: `min(1, min(asset.width, roleMinWidth) /
   roleMinWidth)` per role bars in B.1. Pure arithmetic.
4. `aspectFit`: 1.0 when asset aspect falls in the role's accepted aspect
   band (B.1); 0.5 when within 25% of the band edge (crop-tolerant);
   0.0 otherwise.
5. `uniqueness`: 1.0 when no sibling asset shares the digest (digest dedupe
   already guarantees this) or near-duplicate signature; 0.5 when a
   near-duplicate exists (same dimensions + same file size + perceptual
   near-match by the existing dedupe logic); deterministic from asset data.

Hero score:

```
heroScore = 0.35*onTradeRelevance + 0.30*documentarySignal
          + 0.15*resolutionAdequacy + 0.10*aspectFit + 0.10*uniqueness
```

Section role scores use the same components with per-role weights in B.1.
All weights are data (versioned with the spec), not code branches. Same
media in -> same score out, guaranteed: no network, no randomness, no clock.

## B.1 Per-role acceptance bars

```typescript
interface RoleAcceptanceBar {
  role: MediaRole;
  /** Minimum weighted score to be eligible for the role. */
  minScore: number;
  /** Minimum shorter-side pixels. */
  minWidth: number;
  /** Accepted aspect-ratio bands: [minW/H, maxW/H]. */
  aspectBands: Array<[number, number]>;
  /** Minimum documentarySignal required (hero bar). */
  minDocumentary: number;
  /** Minimum onTradeRelevance required. */
  minRelevance: number;
  /** Component weights for this role: [relevance, documentary, resolution, aspect, uniqueness]. */
  weights: [number, number, number, number, number];
}
```

Bars (locked V1):

| role | minScore | minWidth | aspectBands | minDocumentary | minRelevance | weights |
|---|---|---|---|---|---|---|
| hero-documentary | 0.70 | 1200 | [[1.33, 2.40]] | 0.50 | 0.60 | [0.35, 0.30, 0.15, 0.10, 0.10] |
| service-imagery | 0.55 | 600 | [[0.75, 1.90]] | 0.00 | 0.40 | [0.40, 0.15, 0.20, 0.15, 0.10] |
| owner-portrait | 0.60 | 400 | [[0.66, 1.10]] | 0.50 | 0.00 | [0.10, 0.45, 0.20, 0.15, 0.10] |
| project-photo | 0.60 | 800 | [[0.75, 2.00]] | 0.50 | 0.50 | [0.35, 0.30, 0.15, 0.10, 0.10] |
| gallery | 0.45 | 400 | [[0.50, 2.50]] | 0.00 | 0.20 | [0.25, 0.15, 0.20, 0.20, 0.20] |

Consequences: if no asset clears the hero-documentary bar, the planner's
`IF high-quality trade media -> media-rich Hero eligible` rule fails and the
Hero falls back to editorial/minimal variants (per authorization planner
rules). If no asset clears gallery bars at sufficient count, Gallery is
INELIGIBLE. The planner never lowers a bar to fill a slot.

## B.2 Rejection rules

Rejections are typed, recorded as `MediaObservation` outcomes with reasons
(existing manifest vocabulary: `rejected`), and never silent.

R1. Wrong-trade content: `onTradeRelevance` below the role's `minRelevance`
after cross-trade capping. Example: a metal conduit/pipes photo scored for
a carpentry business's hero. The conduit photo fails on-trade relevance for
carpentry (plumbing tokens, no carpentry signal) and is REJECTED for
hero-documentary. It may still score for gallery only if it clears the
gallery bar; cross-trade assets never clear hero/service bars by the cap.

R2. Generic stock fails the documentary bar for hero: an AC condenser stock
photo (stock-agency markers, no job/location/person signal) scores
documentarySignal 0.0, below hero-documentary's minDocumentary 0.50.
REJECTED for hero-documentary. This is the documented Coppersmith failure:
generic condenser units must not become the hero.

R3. Resolution: any asset below the role's minWidth is rejected for that
role (may still qualify for a lower-bar role).

R4. Aspect: aspectFit 0.0 rejects for that role (may qualify elsewhere).

R5. Rights: unchanged from the protected pipeline. `unclear-reference-only`
assets are never acquired at all (existing ingest.ts enforcement); scoring
never sees them.

R6. Duplication: exact digest duplicates are deduped at ingest (existing
behavior); near-duplicates score uniqueness 0.5 and lose ties to the
higher-resolution sibling.

R7. Unsafe sink: an asset whose source URL fails URL safety policy is
rejected before scoring (existing L0/safe-fetch enforcement; authorization
hard gate: unsafe link/media sink).

Every rejection records: asset digest (or source URL when no bytes),
role attempted, score breakdown, rule id (R1..R7), timestamp. Rejection
records live in the manifest observations, visible on the DEV surface,
never on the public page.

## B.3 Structural guarantee: cross-business contamination impossible by construction

This is the authorization hard gate "wrong business media". It is enforced
structurally, not by convention:

1. Namespacing: acquired assets are stored per business under
   `<publicDir>/<siteId>/<sha256>/...` (siteId = the business's site
   identifier; the existing derivatives.ts cache path gains the siteId
   segment). Derivative URLs embed the siteId: `/fyd-media/<siteId>/<hash>/
   <variant>`. A renderer cannot construct a URL for another business's
   asset because it never learns another business's siteId-scoped paths.
2. Manifest scoping: the media manifest is per siteId
   (`manifests/<siteId>.json`, as today). The read path (`select.ts` /
   `bundle-media.ts`) loads exactly one manifest: the current site's.
   There is no cross-manifest query API.
3. Renderer reference rule: the renderer references derivatives only, via
   the manifest's variant URLs for the current siteId. Object graph media
   references bind to asset ids within the same site's manifest
   (`attach.ts` relationships are created per siteId-scoped ingest run).
   A binding that names an asset id absent from the current site's
   manifest fails closed at build: no image rendered, DEV surface shows
   the missing-binding diagnostic.
4. Ingest run binding: each ingest run takes exactly one siteId and one
   businessSlug (existing `IngestOptions`); assets discovered from a page
   are namespaced to that run's siteId before bytes move. There is no
   shared pool, no global media library, no "recently used" cross-site
   reuse in V1.
5. Test: a pipeline-invariant test asserts that given two manifests, no
   selector call parameterized with siteId A can return a variant URL
   containing siteId B (extends the existing
   `__tests__/pipeline-invariants.test.ts` pattern; new bounded test file,
   no changes to existing tests).

The documented HPP failure (conduit photo on a carpentry site) is blocked
at two independent layers: scoring rejects it for the hero role (R1), and
even a scoring bug cannot serve another business's bytes because the
namespace makes the reference unconstructable.

---

# PART C — MEDIA INGEST MODEL

## C.0 The pipeline (authorization Decision 1, restated as stages)

```
MediaObservation -> ACQUIRE BYTES -> sha256 digest -> MediaAsset
  -> DERIVATIVES -> RENDER
```

Stage definitions, with the exact data each stage produces and consumes:

### Stage 1: MediaObservation (what FYD saw)

Produced by discovery (existing `discover.ts`: img/srcset/og:image/JSON-LD
image/link-image extraction, pure function, no fetching). Record shape is
the existing `MediaObservation` in types.ts (sourceUrl, sourcePage,
observedAt, outcome, reason, digest, redirectChain) and is REUSED AS-IS.

New in this spec: discovery also records the observation context the scorer
needs: the Part A sectionKind the image was found in, its alt text, and its
DOM position. This is observation metadata, not business truth.

### Stage 2: ACQUIRE BYTES

Existing `safe-fetch.ts` (SSRF gate) + rights classification
(`discover.ts` classifyRights, `types.ts` RightsSource, enforced in
`ingest.ts`). REUSED AS-IS. RightsSource vocabulary is unchanged:
business-provided | public-demo-source | unclear-reference-only, with
`isAcquirable()` as the single enforcement predicate. `unclear-reference-only`
assets never have bytes fetched: reference retained in observations only.

Demo-scope rule (binding): the authorized HPP/Coppersmith demos ingest
public-site media derivatives with preserved provenance, classified
`public-demo-source` with a rightsBasis sentence stating the basis in plain
language and stating that FYD claims no copyright. Public accessibility does
NOT grant production republication rights. The production media-rights
lifecycle (licensing, takedown, owner revocation, expiry) is a later explicit
policy boundary and is OUT OF SCOPE for this spec; no production code may
treat demo ingest as a rights grant. The existing `preview` manifest flag
and `pipelineVersion` fail-closed semantics stay the enforcement mechanism.

### Stage 3: sha256 digest -> MediaAsset (acquired, immutable)

Existing `derivatives.ts` hashContentBytes + dedupe by digest. REUSED AS-IS.
MediaAsset is the existing `FydMediaObject` (id derived from digest,
provenance, dimensions, media type, lifecycle) REUSED AS-IS, with this spec's
additions as new optional fields on a separate scoring sidecar (not on the
asset itself, keeping the protected type stable):

```typescript
/** New bounded module: src/fyd/media/score.ts (additive, does not modify types.ts). */
interface MediaScorecard {
  /** Asset digest this scorecard belongs to. */
  assetDigest: string;
  /** Per-role weighted scores, 0..1. */
  roleScores: Record<MediaRole, number>;
  /** Per-role component breakdowns for audit. */
  components: Record<MediaRole, {
    onTradeRelevance: number;
    documentarySignal: number;
    resolutionAdequacy: number;
    aspectFit: number;
    uniqueness: number;
  }>;
  /** Roles whose acceptance bar this asset clears. */
  eligibleRoles: MediaRole[];
  /** Typed rejections with rule ids R1..R7. */
  rejections: Array<{ role: MediaRole; rule: string; detail: string }>;
  /** Spec version that produced this scorecard. */
  scoreVersion: "media-score@1";
}
```

Scorecards are written into the manifest alongside media objects (new
`scorecards` array on MediaManifest: additive field, existing readers
ignore it). Immutability: an asset's bytes and digest never change; a
re-ingest that finds changed source bytes mints a new asset (existing
`stale` lifecycle), and the old scorecard is superseded, never edited.

### Stage 4: DERIVATIVES (resized/encoded outputs for renderer)

Existing `derivatives.ts` (bounded renditions, shape-plus-proof
MediaVariant with derivedFrom naming the original sha256). REUSED AS-IS,
with one structural change: the variant URL gains the siteId segment
(`/fyd-media/<siteId>/<hash>/<variant>`) per B.3. This is a bounded,
reviewable change to the path construction only; rendition logic,
formats, and size constants are untouched.

### Stage 5: RENDER

The renderer references derivatives only, resolved through the site-scoped
manifest read path (existing `select.ts` semantics, extended with role
eligibility from the scorecard). Object graph references assets
(`represented_by` / `illustrated_by` / `has_media` via existing attach.ts);
the renderer resolves asset -> eligible derivative for the requested role.
If the asset is not eligible for the requested role, the renderer falls back
per the planner's variant rules (e.g. no hero-eligible media -> editorial
Hero), never by silently using an ineligible image.

## C.1 Module map: reuse vs new

REUSED AS-IS (protected; this spec adds no changes):
- `src/fyd/media/types.ts`: RightsSource, ACQUIRABLE_RIGHTS/isAcquirable,
  FydMediaRole, MediaLifecycleState, MediaProvenance, MediaVariant,
  FydMediaObject, MediaObservation, MediaManifest, MEDIA_MODULE_VERSION.
- `src/fyd/media/discover.ts`: image discovery + rights classification.
- `src/fyd/media/safe-fetch.ts`: SSRF-gated fetch.
- `src/fyd/media/ingest.ts`: orchestration, rights enforcement order,
  observation recording, manifest writing.
- `src/fyd/media/derivatives.ts`: digest, dedupe, rendition generation.
- `src/fyd/media/provenance.ts`, `bundle-media.ts`, `site-bundle.ts`,
  `attach.ts`, `select.ts`, `circle-background.ts`, `run-ingest.ts`.
- `src/fyd/proceduralize/ACQUISITION-STACK.md`: L0-L4 escalation policy,
  egress/privacy rules. Presentation observation derivation consumes
  AcquiredObservation outputs; it adds no new fetch behavior and no new
  network surface.

NEW BOUNDED MODULES (additive; existing modules untouched):
- `src/fyd/media/score.ts`: MediaScoreInput, MediaRole, RoleAcceptanceBar
  table, component scorers, heroScore/role score functions, MediaScorecard.
  Pure functions: asset data in, scores out. No fs, no network, no clock.
- `src/fyd/proceduralize/presentation-observe.ts`: HTML/CSS -> 
  PresentationObservation (Part A field extractors). Pure function over
  served HTML + CSS text (+ optional L2 DOM snapshot). No fetching; it runs
  on bytes the acquisition stack already holds.
- Manifest additive fields: `scorecards: MediaScorecard[]` on MediaManifest;
  `siteId` segment in derivative URLs (bounded path change in derivatives.ts
  path construction only).
- Tests (new files only): scoring determinism (same bytes -> same scores),
  acceptance-bar fixtures (conduit-on-carpentry rejected R1, condenser-stock
  rejected R2), namespace isolation (no cross-siteId URL constructable).

## C.2 What the implementer must not guess

- Observation confidence tiers are fixed strings: direct | derived | inferred.
  The planner weighting rule in A.12 is fixed.
- Score weights and bars are data in the RoleAcceptanceBar table (B.1),
  versioned as media-score@1. Changing a number is a spec change, not a
  tuning tweak; it goes through the same lock process as this document.
- The `authority: "signal-not-authority"` marker is validated at write time;
  missing marker = rejected record.
- Trade keyword sets (B.0 onTradeRelevance) are data files per trade, owned
  by the product lane, versioned with the spec. They match trade vocabulary
  only; they never classify a business.
- Nothing in this spec authorizes fetching media from off-origin domains
  for the demo beyond what the existing rights classifier already permits
  (public-demo-source = same-origin public marketing imagery). Off-origin
  stays unclear-reference-only: referenced, never acquired.

## Open questions for Nolan (genuine decisions, not implementation detail)

1. Production media-rights lifecycle is explicitly deferred by the
   authorization; confirm the deferral stands and no production publish may
   lean on demo ingest rights.
2. Trade keyword sets per trade are new data files: confirm the product lane
   owns and versions them (vs. a shared taxonomy somewhere else).
