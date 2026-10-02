# HPP Implementation Classification (DEHPP-ANALYZE)

Source: PING repo, branch fyd-factory, read 2026-09-23. Render path traced:
`src/app/sites/happy-place/page.tsx` -> `getPingObjectGraph` (src/fyd/data/ping-object-source.ts)
-> `generateSiteSpec` (src/fyd/proceduralize/generator.ts) -> `heroMediaFor` (src/fyd/media/select.ts)
-> `validateSiteSpec` (src/fyd/sitespec/validator.ts) -> `SiteClient` (src/app/sites/_shared/site-client.tsx)
-> `SitePageView` / `renderSection` (src/fyd/components/renderer.tsx).

GOLDEN-REFERENCE.md did not exist; classification is from the repo directly.

Classification law: KEEP = universal quality, burden of proof reversed. PARAMETERIZE = HPP-specific
value that must become data. REFACTOR/REPLACE/DROP = hack, dead code, unsafe assumption, or defect;
harvest, do not worship.

Counts: KEEP 34, PARAMETERIZE 13, REFACTOR/REPLACE/DROP 7. Total mechanisms classified: 54.

---

## 1. Route layer: src/app/sites/happy-place/page.tsx

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| R1 | SITE_ID constant threads identity through data, metadata, hero media, AskFYD | PARAMETERIZE | `const SITE_ID = "happy-place"` (page.tsx:23); passed to getPingObjectGraph, heroMediaFor, SiteClient, DemoOwnerMode. Mechanism (thread one tenant id) is universal; the value is tenant data. |
| R2 | generateMetadata derives title/description from the owner object's title | KEEP | ownerName() reads the public business object's title; no hand copy. Removing it loses SEO/OG honesty. |
| R3 | publicGraph() strips private objects AND private-touching relationships before the client payload | KEEP | page.tsx publicGraph(). This is the client-payload privacy boundary. Removing it leaks private objects to the browser. Distinct from the field-visibility projection (which hides fields, not objects); both are needed. |
| R4 | generateSiteSpec(graph, { generatedAt, eventSequences }) compiles the declarative spec | KEEP | The compile itself is the golden mechanism: graph in, spec out, no hand layout. |
| R5 | applyPresentationIntent(base, presentationIntent, graph): owner directives OVER the compiled spec, facts untouched | KEEP | Presentation-intent layer keeps owner voice without corrupting graph facts or theme. Removing it forces owners back into hand edits. |
| R6 | heroMediaFor resolved once at the server render seam; renderer never selects media | KEEP | page.tsx comment + media/select.ts. Media selection is a server-side evidence decision; pushing it into the renderer would mix selection with presentation. |
| R7 | validateSiteSpec + isRenderable gate: an invalid spec never renders | KEEP | "Never render an invalid spec." Removing it lets malformed specs produce broken or dishonest pages silently. |
| R8 | DemoOwnerMode rendered from the route, gated by NEXT_PUBLIC_FYD_DEMO_OWNER_MODE | PARAMETERIZE | Demo scaffolding, not customer surface. Must be gated/absent in production. The gate mechanism is fine; its presence on the customer route must be a deployment parameter. |
| R9 | Route bypasses BOTH the builder strategy pipeline (strategyForSite/planner) and archetype composition (no profile passed to generateSiteSpec) | REFACTOR | page.tsx calls generateSiteSpec with no profile; strategies.ts/planner.ts/dimensions.ts are never consulted on this path. The "golden" site does not exercise the composition policies the factory is building. To clone fidelity, the route must compose through the same pipeline the factory ships, or quality claims do not transfer. |

---

## 2. Data source: getPingObjectGraph (src/fyd/data/ping-object-source.ts)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| D1 | Hard failure on missing/malformed/tampered projection; never falls back to a fixture | KEEP | "NEVER falls back to a static fixture." Removing it turns a data outage into a silent stale render. |
| D2 | Every object must carry provenance with a non-empty ref ("no customer fact without a traceable basis") | KEEP | validateObject(). The honesty engine at the read seam. Removing it lets untraceable claims onto the page. |
| D3 | graphDigest sha256 recomputed and compared to meta.graphDigest | KEEP | Tamper detection across the PING-to-site boundary. Removing it accepts forged projections. |
| D4 | meta.siteId must match the requested site | KEEP | Cross-tenant contamination guard. |
| D5 | Owner field corrections composed AFTER digest verification; owner state never part of source verification | KEEP | Separation of source truth from owner state. Removing it either breaks verification or freezes owner corrections. |

---

## 3. Media selection (src/fyd/media/select.ts)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| M1 | heroMediaFor: logos excluded from hero candidates; prefers role==="hero", else first photographic | KEEP | "logos are brand identity, never card covers." Universal media grammar; removing it puts a logo where a hero photo belongs. |
| M2 | galleryMediaFor: excludes logo/hero/card/thumbnail roles; stable content-driven order | KEEP | Role grammar keeps each surface honest about what it shows. |
| M3 | Route/site-client never populate galleryMedia or objectMedia in the render context | REFACTOR | RenderContext defines galleryMedia and objectMedia; SiteClient's ctx includes only heroMedia. Consequence: Gallery can never render, and PeopleSection's photographic strip branch is dead on this route. Either wire the seam (listObjectMedia/galleryMediaFor at the server) or stop implying media support that cannot fire. A silent quality gap. |

---

## 4. Generator (src/fyd/proceduralize/generator.ts)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| G1 | Owner resolution: lowest-id public business object wins ties | KEEP | Deterministic identity. Removing it makes ownership order-dependent. |
| G2 | Role-based grouping: social and knowledge vocabularies project onto the same seven roles | KEEP | generator group() + SCHEMA_ROLES. One compiler for two vocabularies; removing it forks the pipeline per source. |
| G3 | Pages exist only when their data exists (home/about/services/explore); missing data means no page | KEEP | "Missing data means the page or section does not exist; nothing is invented." The anti-template law. |
| G4 | Sections exist only when their data exists (hasContact/hasSocials gates, featureable count for ObjectRail) | KEEP | Same law at section granularity. Removing it renders empty shells. |
| G5 | Deterministic section ids pageSlug:component:index; every sort by id, never insertion order | KEEP | Replayability. Removing it makes diffs and owner patches unstable. |
| G6 | Fixed home section order (Hero, BusinessSummary, Services, Products, Locations, People, RecentObjects, Contact, Links, CTA, AskFYD, ObjectRail) | PARAMETERIZE | The ORDER is a composition value (archetype profiles exist to vary it), not a universal. The mechanism "order sections deliberately" is KEEP; this specific order is data. |
| G7 | CTA emitted on every home page as a site capability (visit website / ask FYD) | KEEP | Capability presence is universal; its position/copy/emphasis is parameterized. |
| G8 | presentation.heading ?? default everywhere: owner copy wins, defaults fill | KEEP | Owner intent precedence. Removing it either hardcodes voice or leaves holes. |
| G9 | Default English headings ("Where we work", "The people", "Latest", "Start the conversation", ...) baked into renderer section functions | REFACTOR | Defaults are structural copy, not facts, but they live in code, not a copy table. Re-voicing a site or archetype means editing section functions. Move defaults into a presentation-copy table the archetype/profile can override as data. Not a defect in rendering, a defect in parameterization. |
| G10 | SocialProof is registered and fully implemented but the generator never emits it | REFACTOR | Registry + SocialProofSection (fail-closed binding on reviews/testimonials) exist; no add("SocialProof") in the generator. A business with testimonials gets no proof section. Either emit it when the field verifies or drop the section. |
| G11 | Generator comment claims the "dimension-vector policy (CTA boosted by urgency)" accounts for CTA | REFACTOR | dimensions.ts urgency boosts are consumed by builder/strategies.ts, planner.ts, site-vectors.ts, none of which run on the HPP route. The comment documents a policy the render path does not execute. Correct the comment or wire the policy; do not leave aspirational comments as architecture. |

---

## 5. Registry (src/fyd/components/registry.tsx) + schemas (src/fyd/sitespec/schemas.ts)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| C1 | One schema->component mapping, three consumers (generator, validator, renderer) | KEEP | "One mapping, three consumers." Removing it lets the three drift. |
| C2 | Unknown schemas render through GenericObjectCard, never fail | KEEP | Fail-soft at the leaf. Removing it turns a new schema into a blank page. |
| C3 | Accepts-lists built from SCHEMA_ROLES, no hardcoded schema ids | KEEP | Both vocabularies flow through the same gates. |
| C4 | Registry metadata (requiredData, capabilities, responsive, editableProperties, variants) | KEEP | Composition reasoning data. Removing it blinds the composer/owner tooling. |

---

## 6. Validator (src/fyd/sitespec/validator.ts)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| V1 | Two layers: structural (shape, ids, known components) + semantic (schema acceptance, satisfiable fields) | KEEP | Catches both malformed specs and dishonest ones (section with no data). |
| V2 | isRenderable: any error finding blocks the render | KEEP | The gate R7 depends on. |

---

## 7. Renderer (src/fyd/components/renderer.tsx)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| N1 | resolveQuery: deterministic sorts (related by id; feeds newest-first with id tie-break) | KEEP | Same inputs, same page, every render. |
| N2 | SectionShell: max-w-5xl center column, per-character rhythm px, heading tracking, tonal alternation via color-mix | KEEP | This IS the section rhythm that makes HPP read well. Removing it collapses the page into an undifferentiated stack. |
| N3 | Honest typographic hero when heroMedia is null ("never an invented image") | KEEP | The honest-empty discipline at its most visible. Removing it invites stock-photo fabrication. |
| N4 | Hero CTA ladder: Visit website (primary) -> phone via FYD contact flow (fallback) -> Ask FYD (secondary) | KEEP | Contact discoverability for tenants with no website. Removing it strands phoneless-website tenants. |
| N5 | FydContactLink: value + provenance + real tel:/mailto: inside a flow, never a bare top-level link | KEEP | Evidence-gated contact. Removing it either exposes unverified numbers or hides real ones. |
| N6 | boundField/boundTitle/boundDescription through the presentation-binding verifier: no binding, no factual output | KEEP | THE honesty engine. The single most load-bearing mechanism in the file. |
| N7 | resolveSafeLink on every external href; renderer never interpolates raw observed strings into href/src | KEEP | XSS/open-redirect boundary. Removing it is a security regression. |
| N8 | ClaimBadge / claimBadgeLabel: names the actual claim source per object set (Website statement / Site record / Demo addition / Feed item / Mixed sources) | KEEP | Provenance labeling on the customer surface. Removing it presents all claims as equal. The label strings themselves are PARAMETERIZE copy. |
| N9 | CorrectionNote: "Owner-corrected: the owner says this is the X (the site lists Y)" | KEEP | Honest SOURCE SAYS X / OWNER SAYS Y. Removing it hides the correction history from the viewer. |
| N10 | HeroMediaWhyThis / GalleryMediaWhyThis: provenance drill-down fed ONLY with the media's own fields | KEEP | Evidence affordance with no invented copy. |
| N11 | FydObjectCard: media-aware rich card vs text card from the graph, 16:9 cover, kicker, relationship microcopy, claim badge, ObjectAffordance | KEEP | The universal card system. Structural differentiation from the graph, never hand sections. |
| N12 | relationshipLine: one quiet generic-vocabulary line naming the recorded connection ("Maya Alvarez -> Happy Place Carpentry" is a comment example; runtime strings are built from bound titles) | KEEP | Graph made legible without visualization. Predicates are generic vocabulary. |
| N13 | PeopleSection structural switch: portrait strip when person media exists, honest card grid otherwise | KEEP | Mechanism is universal; currently unreachable on the HPP route because of M3. |
| N14 | SocialProofSection fail-closed: quotes render only when the reviews/testimonials binding verifies | KEEP | Honesty gate on third-party claims. (Emission is G10's problem, not this function's.) |
| N15 | CTASection "Start the conversation" + Visit website + Ask FYD | KEEP | Capability block; heading/copy/emphasis PARAMETERIZE. |
| N16 | AskFYDSection: id="ask" anchor target, boundOwnerTitle falls back to "this business" when unverified | KEEP | The fallback claims nothing, which is exactly why it is honest. |
| N17 | ObjectRailSection: inline margin capability featuring the richest public non-owner object | KEEP | Generic object prominence; content untouched. |
| N18 | Gallery: evidence-backed, lazy, explicit width/height (no CLS), 4/3 crop, renders nothing without media | KEEP | Mechanism universal; unreachable on the HPP route because of M3. |
| N19 | FydMotionStyles: one style tag per page; view transitions, animation-timeline entrance + IO fallback, base state VISIBLE, prefers-reduced-motion collapse, no scroll hijack, motion never on section containers | KEEP | Motion never gates content (verified: base-visible CSS, .fyd-io-pending added only by JS to below-fold items). Removing it either kills the polish or, worse, hides content behind animation. |
| N20 | CHARACTER_PRESENTATION table (EDITORIAL/CRAFT/TECHNICAL/RETAIL/PROFESSIONAL/CREATOR: rhythm, tracking, elevation, hero scale, density, width, media treatment, object emphasis) | KEEP | Presentation character as data. The table existing means new archetypes get a full presentation without code. Per-character values are PARAMETERIZE data. |
| N21 | Mobile composition CSS: mobile-first card tile -> rich horizontal card at md+ (media-anchored), desc clamp 2 lines on mobile, 44px touch targets, safe-area insets, people rail scroll-snap, gallery edge-to-edge on xs | KEEP | This is the mobile quality. Removing it squeezes desktop layouts onto phones. |
| N22 | Action text and structural labels ("Visit website", "Ask FYD") deliberately NOT passed through the binding verifier | KEEP | Correct scoping: the verifier guards factual claims, not UI chrome. Widening it would break every label; narrowing it would launder claims as labels. |

---

## 8. SiteClient demo shell (src/app/sites/_shared/site-client.tsx)

| # | Mechanism | Class | Evidence |
|---|-----------|-------|----------|
| S1 | "FYD Social / Generated site demo / Procedural clone proof" demo header + validation banner + structured editor + provenance footer render as part of the site page | REFACTOR | Demo chrome is not separated from the customer surface. Shipping this file as-is ships FYD branding, validator internals, and operator tooling on a customer site. Split: customer surface (SitePageView + nav + footer) vs demo/operator chrome (header, editor, banners), composed per deployment. |
| S2 | Page tabs render from spec.navigation, never hardcoded | KEEP | Navigation as data. The mechanism is universal; labels are PARAMETERIZE. |
| S3 | Object overlay intercepts /o/ links, verifies the object in the public graph, restores scroll on close | KEEP | Generic object detail; privacy-checked at open. |
| S4 | Structured editor: reorder/hide/featured/copy/token edits become digest proposals; copy+token edits stay drafts until approved | KEEP | Owner tooling with an audit trail. Must live behind the operator gate (see S1), not on the customer surface. |
| S5 | Provenance footer hardcodes "(acceptance sequences 65-83)" | REFACTOR | site-client.tsx:169. HPP ingestion metadata baked into SHARED chrome. Every future tenant would print HPP's acceptance window. Must become data: meta.eventSequences rendered as a range, or the sentence templated from projection meta. |
| S6 | Footer sentence "Generated by FYD Social from a website-ingestion object graph" | PARAMETERIZE | Brand + ingestion-method copy. Template it from (brand, ingestion method, event sequences) in the projection meta. |

---

## The 5 most important KEEPs (what makes HPP good)

1. **Binding verification before render (N6).** boundField/boundTitle/boundDescription through the presentation-binding verifier: no binding, no factual output. This is the single mechanism that separates HPP from a hallucinating template. Every fact on the page survived verification; everything unverified is omitted, not guessed.
2. **Provenance-required, digest-verified data source (D1-D4).** No customer fact without a traceable basis; sha256 graph digest; hard failure instead of stale fallback. The honesty of the page is decided before the renderer ever runs.
3. **Deterministic, data-driven composition (G1-G5, C1, N1).** Pages and sections exist only when their data exists; id-sorted deterministic output; one registry mapping for generator, validator, and renderer. This is what makes it a clone of the business rather than a themed template.
4. **The honest-empty / fail-closed discipline (N3, N14, N18, ContactSection null-gates, G3/G4).** Typographic hero instead of stock photos, no Gallery without gallery media, no quotes without verified bindings, no Contact section without contact methods. The page would rather show less than lie.
5. **Motion never gates content + mobile composition (N19, N21).** Base-visible CSS with the IO fallback arming only below-fold items, full prefers-reduced-motion collapse, no scroll hijacking; mobile-first card tiles projecting to rich horizontal cards at md+, 44px touch targets, safe-area insets. The accessibility and mobile floor that makes the quality real on Nolan's phone.

## The 5 most dangerous HPP-specific couplings

1. **Acceptance sequences hardcoded in shared chrome (S5).** `site-client.tsx:169` prints "(acceptance sequences 65-83)" on every site rendered through SiteClient. HPP's ingestion metadata would appear verbatim on another business's page. Fix: render `meta.eventSequences` from the projection as data.
2. **Demo chrome fused to the customer surface (S1).** The FYD Social demo header, validation banner, structured editor, and provenance footer are part of the same component tree as the customer page. There is no deployment composition separating "customer site" from "operator demo". Shipping this file ships the factory's internals as the product.
3. **The golden route bypasses the composition pipeline (R9).** The HPP route calls generateSiteSpec with no archetype profile and never runs strategyForSite/planner/dimensions. The site Nolan judges quality against does not exercise the machinery the factory is building. Fidelity claims must be re-proven through the composed path.
4. **Dead media seam (M3).** galleryMedia and objectMedia exist in RenderContext and the renderer implements Gallery, people portrait strips, and card covers against them, but the route never populates them. Quality features read as "business has no media" when the truth is "the seam was never wired."
5. **Default copy in code, not data (G9).** Section voice ("Start the conversation", "Where we work", "The people", "Find us") is baked into renderer functions. Archetype or owner re-voicing requires code edits per section. Combined with G11's aspirational urgency comment, the composition layer promises variation the render layer cannot deliver as data.
