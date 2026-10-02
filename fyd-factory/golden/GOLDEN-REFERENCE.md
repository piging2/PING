# GOLDEN REFERENCE: Happy Place (HPP)

Frozen 2026-09-23 by GOLDEN-FREEZE lane. This document is the donor spec for
the FYD factory prime route (CLONE -> PROVE FIDELITY -> PARAMETERIZE ->
SUBSTITUTE -> COMPARE -> GENERALIZE). Nothing here was improved during
extraction; it is a record of the implementation that hits the quality bar.

## 1. Verdict: which implementation is golden

**The golden implementation is the PING repo's `/sites/happy-place` route**
(the FYD procedural clone), NOT the happy-place-platform.vercel.app site.

The vercel site is the upstream original and the fidelity TARGET. It is a
separate, bespoke, hand-built codebase full of customer-specific components
(before-after-slider, estimate-wizard, project-lightbox, lenis smooth scroll,
per-route pages for about/our-work/projects/reviews/estimate/faq/blog).
Factory archetypes cannot derive from it without violating the factory's own
no-customer-JSX law. The factory's proven-good output, the thing lanes must
clone and generalize, is the FYD-generated `/sites/happy-place`.

### Empirical evidence

1. **Lineage is machine-recorded, not assumed.** The PING repo fixture
   `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` is
   machine-generated with a pinned header:
   - Source: `https://happy-place-platform.vercel.app/`
   - Ingested: 2026-09-21T13:50:00Z, pipeline commit
     `3e30503b3b819d820c276d4dc379048baba7c27e` (exists in PING history,
     2026-09-22)
   - Source digest sha256 `76766d18a3f054e1e545124d0cfc9f5d48e242d1b7c746e9ebc5dbf555936d78`
     over 139,618 bytes of `index.html`
   - Every claim labeled `website_statement`; provenance
     `website-ingestion:https://happy-place-platform.vercel.app/`
2. **Upstream is stable.** Fresh fetch of the vercel homepage on 2026-09-23
   returned HTTP 200, 139,661 bytes (43 bytes of drift vs the pinned 139,618;
   build-hash churn, same page). The donor has not materially changed since
   the clone ingested it.
3. **The Pig route renders the factory path, confirmed by reading the route
   source** (`src/app/sites/happy-place/page.tsx`): `getPingObjectGraph` ->
   `generateSiteSpec` -> `applyPresentationIntent` -> `heroMediaFor` ->
   `validateSiteSpec` -> `SiteClient` -> `SitePageView`. No strategy, no
   planner, no archetype profile. `STRATEGY_PINS` contains no `happy-place`
   entry (only `ping-fyd` and `coppersmith-plumbing`). The composed spec has
   `archetype: null`, `status: null`, `revision: null`.
4. **Live render verified.** Dev server on the Pig (`:3100`, PID 22198,
   current) returns HTTP 200 for `/sites/happy-place` with the composed site
   (nav Home/About/Services/Explore, "Procedural clone proof" banner).
5. **Tests green.** 500/500 passing across the seven golden-path suites
   (proceduralize 82, components 93, sitespec 91, builder 96, archetypes 11,
   customize 20, media 107). See section 8.

## 2. Golden coordinates

| Item | Value |
|---|---|
| Repo | `/home/nolan/projects/ping` (the PING repo; physically on C: via WSL) |
| Branch | `fyd-factory` |
| Commit (exact SHA) | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` |
| Commit date | 2026-09-23 07:32:28 -0600 |
| Commit subject | FYD Wave 1 fixup: current product UI implementation + ask test alignment |
| Runtime entrypoint | `src/app/sites/happy-place/page.tsx` (`HappyPlaceDemoPage`) |
| Render path | route -> `getPingObjectGraph("happy-place")` (`src/fyd/data/ping-object-source.ts`) -> `generateSiteSpec` (`src/fyd/proceduralize/generator.ts`) -> `applyPresentationIntent` (`src/fyd/customize/apply-layer.ts`) -> `heroMediaFor` (`src/fyd/media/select.ts`) -> `validateSiteSpec`/`isRenderable` (`src/fyd/sitespec/validator.ts`) -> `SiteClient` (`src/app/sites/_shared/site-client.tsx`) -> `SitePageView` (shared renderer `src/fyd/components/renderer.tsx`) |
| NOT used | strategy/planner path (`src/fyd/builder/strategies.ts`, `infer-strategy.ts`, `strategy-for-site.ts`, `planner.ts`); archetype profiles (`src/fyd/archetypes/`) |

### How to build and run it

On the Pig, as nolan, from `/home/nolan/projects/ping` on branch `fyd-factory`:

- Install: `npm install` (node 22; repo has `node_modules` with `tsx`, `ts-node`, `jest`)
- Dev server: `npm run dev` (or `next dev`); the golden was verified against the
  always-on dev server on port 3100 (do NOT start a second one; check
  `ss -ltnp | grep :3100` first)
- View: `http://localhost:3100/sites/happy-place` (from Pig WSL)
- Production build: `npm run build` (`next build`)
- Golden-path tests: `npx jest --config src/fyd/<area>/jest.config.cjs` for
  `proceduralize components sitespec builder archetypes customize media`

Working tree note: at freeze time the tree had unrelated dirty files
(package.json, several `src/app` pages, builder owner-intent/site-vectors,
some fyd components). The golden route file itself
(`src/app/sites/happy-place/page.tsx`) is clean at HEAD. Lanes must not treat
dirty-tree behavior as golden.

## 3. The fidelity target (upstream original, NOT golden)

| Item | Value |
|---|---|
| Site | `https://happy-place-platform.vercel.app/` (HTTP 200, verified 2026-09-23) |
| Repo | `/home/nolan/projects/happy-place-platform` |
| Branch | `devin/hpp-ping-boundary` |
| Commit (exact SHA) | `6dd11bedd5e2b945186793bc1e8d9df4fb8303d5` |
| Commit date | 2026-09-16 06:56:44 -0600 |
| Remote | `https://github.com/trishnikitha-art/happy-place-platform.git` |
| App source | `website/src/` (Next.js; routes: about, our-work, projects, reviews, estimate, faq, blog, contact, newsletter) |

It is the real production website of Happy Place Carpentry LLC (licensed
Oregon carpentry contractor, CCB# 254240, decks/fences/pergolas/bathrooms,
Mid-Willamette Valley). Structure: sticky header, 8 homepage sections
(hero, services "A few ways we can help", Recent Work, about "A family
business built on doing things the right way.", reviews "What people say once
the work's done", contact "Tell us what you're planning."), footer, repeated
"Get an Estimate" CTAs. Hero: "Your favorite part of coming home should be
the home itself." plus "We repair, restore, and improve homes across the
Mid-Willamette Valley." and a "125+ projects completed" proof point.

Role in the factory: content/design truth and the PROVE FIDELITY measuring
stick. Not a code donor (bespoke customer-specific JSX throughout).

## 4. The golden composed spec (byte-exact dump)

Dumped 2026-09-23 by replaying the route's exact server seam
(`getPingObjectGraph` -> `generateSiteSpec` -> `applyPresentationIntent` ->
`heroMediaFor` -> `validateSiteSpec`) via the repo's own `tsx`. Full JSON:
`evidence/hpp-composed-spec.json`.

- `ownerObjectId`: the `ping.social.business@1` object (Happy Place Carpentry LLC)
- Graph: 8 objects; schemas: `ping.social.business@1`, `ping.social.location@1`,
  `ping.social.service@1` (no posts, people, products, reviews)
- Validation: 0 findings, `renderable: true`
- `archetype`/`status`/`revision`: unset (no profile applied)
- `objectPresence`: unset (no graph passed to any archetype applier)
- `presentationIntent`: `{ directives: [] }` (layer present, no directives)
- `heroMedia`: null (no acquired media for this tenant in this environment;
  the renderer falls back to the honest typographic hero)

### Pages and section order (home is the money page)

| Page | Slug | Sections (in order) |
|---|---|---|
| Home | `home` | Hero, BusinessSummary, Services, Locations, Contact, Links, CTA, AskFYD, ObjectRail |
| About | `about` | BusinessSummary |
| Services | `services` | Services |
| Explore | `explore` | ObjectFeed |

Navigation (in order): Home, About, Services, Explore.

Section query kinds: Hero/BusinessSummary/Contact/Links/CTA use `owner`;
Services/Locations/ObjectRail use `related`; AskFYD uses `static`;
Explore's ObjectFeed uses `all`. No section carries owner presentation
overrides in the golden dump (all `presentation: {}`).

### Theme tokens (exactly `DEFAULT_FYD_THEME`)

```json
{
  "accent": "#C9A227",
  "accentForeground": "#1c1917",
  "surface": "#FFFFFF",
  "ink": "#232033",
  "radius": "md",
  "fontDisplay": "Playfair Display, Georgia, serif",
  "fontBody": "Geist, system-ui, sans-serif"
}
```

No `layoutCharacter`, no `designIntent`, no `motionTokens` stamped: the
renderer resolves its restrained defaults.

## 5. Donor spec: how the golden renders

### 5.1 Section shell and spacing

Every section renders inside `SectionShell`: `fyd-section mx-auto w-full
max-w-5xl px-4 sm:px-6`, vertical rhythm from the layout-character
presentation map (`sectionRhythmPx`; character unset in the golden spec, so the
renderer default applies). `data-fyd-section` carries the deterministic
section id (`home:Hero:0` style). Motion is deliberately NOT applied to the
section container (a transform/opacity entrance on the container would reparent
fixed descendants like the object-rail trigger); motion belongs on content
items only. View-transition names are deterministic per section id when MORPH
is active.

### 5.2 Typography

Display: Playfair Display (serif) for h1/section headings. Body: Geist/system
stack. Hero h1 is `text-4xl sm:text-6xl` on the dark ink background. CTA
headings default to "Start the conversation" when no presentation heading is
set. No em dashes anywhere in golden copy paths.

### 5.3 Section behaviors (golden order)

- **Hero**: identity block (name, category, tagline, primary action).
  Binding-verified title/description; `ClaimBadge` names the claim source.
  Contact discoverability: a binding-verified, safe-link-gated phone method
  renders as the FYD contact affordance (value + provenance, real Call action
  inside the flow), never a top-level `tel:` link; unverifiable numbers render
  nothing. Hero media is threaded through `RenderContext.heroMedia` from the
  server seam; null keeps the typographic hero. `data-motion="hero-settle"`.
- **BusinessSummary**: about-style summary from the business description,
  owner-bound.
- **Services**: card grid of `ping.social.service@1` objects via `related`
  query. Services are the first proof section after identity.
- **Locations**: coarse public location claims ("Adair Village, OR, US";
  service area "Benton, Linn, Marion, and Polk Counties, Oregon" from the
  business fields). Coarse by policy, never street addresses.
- **Contact**: phone/email/website rows, each through the safe-link gate;
  owner corrections render with a correction note. 44px minimum touch targets.
- **Links**: social and website links published by the business, owner-bound.
- **CTA**: primary action block. Default heading "Start the conversation";
  buttons: "Visit website" (only when the website passes the safe-link gate)
  and "Ask FYD" (anchor to `#ask`). No invented urgency copy in the golden.
- **AskFYD**: dark section (`theme.ink` background), heading "Ask FYD about
  <owner>" with the honest fallback "this business"; copy states answers come
  only from published information with sources shown. `AskFydWidget` renders
  the question box.
- **ObjectRail**: the generic margin capability as an inline section. Features
  the richest public non-owner object through the ObjectCircle doorway
  (inline reference, hover preview, dialog). Mode `auto`: geometry decides
  rail vs drawer, collapsing below the `lg` breakpoint; center content is
  never displaced.
- **ObjectFeed** (Explore page): chronological `all`-query feed of objects.

### 5.4 Object treatments

Objects render through `pingObjectToView` adapters with `ClaimBadge`
honesty labels (Website statement / Site record / Demo addition / Mixed
sources). The ObjectCircle doorway is the single interaction pattern for
featured objects (inline reference -> hover preview -> dialog). Cards use
lazy, dimensioned media. Relationship microcopy comes from the graph's own
predicates, never invented.

### 5.5 Navigation

Four-item nav (Home, About, Services, Explore) from `spec.navigation`;
each item maps to a page slug. Demo chrome: "FYD Social / Generated site
demo / Procedural clone proof" banner in `SiteClient`, plus `DemoOwnerMode`
mounted by the route (owner tooling, not customer surface).

### 5.6 CTA behavior

Golden CTA is low-pressure and honest: visit-website (gated) + Ask FYD.
No countdown, no invented offers, no urgency copy. The factory's TRADES
"urgency/quote CTA emphasis" is a *derivative* policy decision, not golden
behavior; lanes parameterizing it must keep the safe-link gate and the
no-invented-claims law.

### 5.7 Responsive behavior

One semantic SiteSpec; the renderer never branches on a desktop vs mobile
spec. The server renders the compact (mobile-first) baseline; the client
`viewport.tsx` provider stamps `data-viewport` / `data-pointer` / `data-hover`
on `<html>` after mount (identical DOM, no hydration mismatch; projection is
CSS-driven). Width classes: xs <480, sm 480-767, md 768-1023, lg 1024-1439,
xl 1440+. Safe-area insets keep content clear of notches. Touch targets are
44px minimum. The object rail collapses to a drawer below `lg`.

### 5.8 Motion and interaction patterns

Canonical motion profile: intensity SUBTLE default (NONE collapses decorative
motion, EXPRESSIVE reserved for hero/celebration), entrance FADE_RISE, object
transition MORPH (CROSSFADE is the reduced-motion-safe swap), stagger TIGHT
for grouped children. `prefers-reduced-motion` collapses decorative motion;
motion never gates content. Interactions: ObjectCircle doorway
(reference/preview/dialog), FYD contact flow (value + provenance + action),
Ask FYD question box, anchor navigation (`#ask`).

### 5.9 Privacy boundary

The server keeps the full graph; the serialized client prop carries only
public objects and relationships between public objects (`publicGraph` in the
route). Private objects never cross the boundary. The golden graph fixture
contains public objects only.

## 6. Route evolution (archaeology)

`git log` for `src/app/sites/happy-place/` on `fyd-factory` (all 2026-09-21):

- `651e916d` FYD site builder: compile canonical knowledge graph to SiteSpec
- `8a997421` fyd(mobile): prevent 320px overflow in Ask FYD design-token row
- `754fc3c6` sites(happy-place): apply approved presentation intent over compiled spec
- `4a9cc919` fyd generator: fixture refresh, field visibility, safe links, sites pages, fyd api routes
- `92f8c390` fyd: wire media pipeline into the generic Hero via RenderContext.heroMedia

The golden path stabilized on 2026-09-21 and is unchanged at the freeze
commit `e48ef71` (2026-09-23).

## 7. What the golden is NOT (lane guardrails)

- Not the strategy/planner output. The planner's archetype vectors and the
  `TRADES` strategy policy are a different composition layer; the golden
  never touches them.
- Not an archetype profile application. No profile, no token overrides, no
  section reordering beyond the generator's own order.
- Not the vercel site's components. Nothing bespoke may be lifted; the donor
  is the factory's own proven composition.
- The golden graph has no reviews, people, posts, products, or media, so
  SocialProof, People, Posts, Products, and Gallery do not appear in the
  golden composition. Their absence is a data property, not a design
  decision; lanes must not read it as "golden excludes social proof."

## 8. Test and build status (frozen 2026-09-23)

Run on the Pig, repo at `e48ef71`, via per-area jest configs:

| Suite | Config | Result |
|---|---|---|
| proceduralize (generator) | `src/fyd/proceduralize/jest.config.cjs` | 9 suites, 82 tests passed |
| components (renderer/registry) | `src/fyd/components/jest.config.cjs` | 9 suites, 93 tests passed |
| sitespec (types/validator) | `src/fyd/sitespec/jest.config.cjs` | 10 suites, 91 tests passed |
| builder (strategies/inference/planner) | `src/fyd/builder/jest.config.cjs` | 12 suites, 96 tests passed |
| archetypes (profiles/apply) | `src/fyd/archetypes/jest.config.cjs` | 1 suite, 11 tests passed |
| customize (presentation intent) | `src/fyd/customize/jest.config.cjs` | 2 suites, 20 tests passed |
| media (select/pipeline) | `src/fyd/media/jest.config.cjs` | 10 suites, 107 tests passed |

**Total: 53 suites, 500 tests, all passing, 0 failures.** No test or source
file was modified during extraction (git read-only lane).

A full `next build` was not run during the freeze: the dev server serving the
golden route returns 200 and the jest suites covering the entire golden path
are green. The build remains a pre-generalization gate for the factory lanes.

## 9. Fidelity gaps (honest)

The clone is faithful on identity/services/location/contact composition and
honest claim labeling, but the 8-object graph cannot express the original's
proof sections: no reviews (vercel "What people say once the work's done"),
no project portfolio ("Recent Work", before/after), no estimate wizard, no
bespoke motion (lenis smooth scroll, parallax). PARAMETERIZE lanes must close
these with graph/data work (review ingestion, project media), not by copying
the vercel components.

## 10. Evidence files

- `evidence/vercel-home.html` (139,661 bytes): the upstream homepage as served
  2026-09-23
- `evidence/pig-route-home.html` (60,747 bytes): the golden route SSR HTML
  from Pig `:3100` (sections hydrate client-side from the serialized spec)
- `evidence/hpp-composed-spec.json`: the byte-exact composed FYDSiteSpec from
  replaying the route's server seam (pages, section order, queries, tokens,
  nav, findings)

## 11. Standing invariants for derivative lanes

1. Spec is DATA, never generated JSX; the renderer turns
   (SiteSpec + ObjectGraph + ViewerContext) into UI.
2. Never invent sections, pages, objects, or facts; the missing-data law
   holds (sections render nothing without resolved objects).
3. Claim honesty: every rendered claim carries its source label.
4. Private objects never cross the public boundary.
5. Motion never gates content; reduced-motion collapses decoration.
6. No customer-specific components in the shared registry or renderer.
7. Same graph + same composition inputs = byte-identical spec (determinism).
8. Owner presentation intent survives regeneration; facts and design system
   are untouched by the intent layer.
