# DEHPP Parameterization Build Spec

Purpose: the implementable contract DEHPP-BUILD executes once CLONE-PROVE proves
clone fidelity. Authority: classification.md (54 mechanisms, KEEP 34 /
PARAMETERIZE 13 / REFACTOR-REPLACE-DROP 7) and hpp-specific-inventory.md.
Read both before implementing.

Law carried forward: PRESERVE QUALITY, GENERALIZE IDENTITY. The mechanisms stay;
HPP-specific values become data. Nothing in this spec authorizes weakening a KEEP
invariant. Where this spec and a KEEP invariant conflict, the KEEP invariant wins
and the conflict is reported to Nolan.

Scope gate: SPEC ONLY. Do not touch /home/nolan/projects/ping or
~/workspace/fyd-factory/hpp-clone/ while CLONE-PROVE is running.

Ordering dependencies (build in this order):
1. P2 chromeMode + S1 chrome split. Nothing customer-facing ships until demo chrome
   is separable. This is the production safety gate.
2. P5 copy table (G9 fix). The renderer must stop reading voice from code before
   any second archetype or tenant onboards.
3. M3 media seam wiring + P13/P10/P11 tenant data surfaces. These un-break dead
   quality features without changing composition.
4. P3/P4 order parameters + R9 pipeline composition. The route changes identity
   here; CLONE-PROVE must re-run against the composed path before release.
5. Remaining copy parameters (P6, P7, P8, P9, P12). Safe anytime after 1.
6. G10 SocialProof emission. Last, because it adds a new section to the golden
   path and needs its own fidelity check.

---

## Part A. The 13 parameters

Each entry: name, type, source, transform rule, fallback when absent.
Source vocabulary: graph-derived (read from the tenant's object graph or
projection meta), owner-set (owner directive via presentation intent or tenant
config), deployment (build/deploy time environment), system-default (factory
shipped table, same for every tenant until overridden).

### P1. tenantId

- Name: `tenantId`
- Type: string, constrained to /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.
- Source: deployment (route provisioning). Replaces R1's `const SITE_ID = "happy-place"`.
- Transform rule: validated once at the route seam; threaded unchanged as the
  single tenant identity argument to getPingObjectGraph, heroMediaFor,
  SiteClient, DemoOwnerMode, and generateMetadata. Never transformed, never
  defaulted, never read from client input.
- Fallback when absent: hard failure. The route refuses to render and surfaces a
  configuration error. It must never silently fall back to "happy-place" or any
  other tenant (see KEEP D4). An absent tenantId is a provisioning defect, not a
  renderable state.

### P2. chromeMode

- Name: `chromeMode`
- Type: enum: "customer" | "demo". Default "customer".
- Source: deployment. Env var (successor to NEXT_PUBLIC_FYD_DEMO_OWNER_MODE,
  e.g. FYD_CHROME_MODE). Replaces R8's boolean demo gate.
- Transform rule: "customer" composes only the customer surface (SitePageView +
  nav + provenance footer). "demo" wraps the customer surface in the demo/operator
  chrome (demo header, validation banner, structured editor, operator tooling).
  The chrome boundary is a composition decision, not a prop drilled into the
  renderer. See S1 replacement for the component split.
- Fallback when absent: "customer". An unset env var is production-safe by
  default. "demo" must be impossible without an explicit deployment opt-in.

### P3. homeSectionOrder

- Name: `composition.homeSectionOrder`
- Type: ordered array of registry component ids (strings), e.g.
  ["Hero","BusinessSummary","Services","Products","Locations","People",
  "RecentObjects","Contact","Links","CTA","AskFYD","ObjectRail"].
- Source: system-default per archetype profile, owner-set override via
  presentation intent. Replaces G6's fixed generator order.
- Transform rule: applied after the generator emits the section set. Unknown
  ids are dropped with a validator warning (not an error). Sections present in
  the spec but absent from the order list are appended in their generator
  emission order, so a partial override can never delete a section. The
  "order sections deliberately" mechanism stays in the generator; this parameter
  only supplies the order value.
- Fallback when absent: the current fixed generator order becomes the canonical
  default order table (one entry per archetype, starting with the trade default).
  The fallback is data in the table, not a code path.

### P4. pageOrder

- Name: `composition.pageOrder`
- Type: ordered array of page slugs (strings).
- Source: system-default per archetype profile, owner-set override. Companion to
  P3 (inventory: page ORDER is composition data; page EXISTENCE stays
  data-driven per KEEP G3).
- Transform rule: filters the generated page set into the given order; pages in
  the order list that do not exist are ignored; pages that exist but are not
  listed are appended in generator order. Never creates a page (G3 invariant).
- Fallback when absent: ["home","about","services","explore"] as the default
  table entry, filtered to existing pages.

### P5. defaultSectionHeadings

- Name: `copy.defaultSectionHeadings`
- Type: record: archetype -> section component id -> heading string.
  Example shape: { "trade": { "Locations": "Where we work", "People": "The people",
  "RecentObjects": "Latest", "Contact": "Start the conversation" } }.
- Source: system-default table per archetype; owner-set override via
  presentation intent per section. This is the G9 replacement: the table lives
  in src/fyd/copy/defaults.ts (new module), never inside renderer section
  functions.
- Transform rule: renderer resolves heading as
  presentation.heading ?? copyFor(archetype, sectionId) ?? null. The existing
  precedence (owner copy wins, defaults fill, KEEP G8) is unchanged; only the
  defaults' home moves from code to table.
- Fallback when absent: for an archetype with no table entry, fall back to the
  "generic" archetype entry; if that is missing, the section renders with no
  heading rather than inventing one (honest-empty, KEEP G4). The current
  hardcoded English strings seed the "generic" entry verbatim so clone fidelity
  is byte-identical on day one.

### P6. claimKindLabels

- Name: `copy.claimKindLabels`
- Type: record: claimKind -> display label string. Seeds:
  { "website_statement": "Website statement", "site_record": "Site record",
  "demo_addition": "Demo addition", "feed_item": "Feed item",
  "mixed_sources": "Mixed sources" }.
- Source: system-default table; owner-set override. Covers N8's PARAMETERIZE
  label strings.
- Transform rule: ClaimBadge renders labelFor(claimKind); unknown claim kinds
  render the raw claimKind string (never blank, never guessed). The badge
  mechanism (names the actual claim source per object set) is untouched.
- Fallback when absent: the seed table above, which is exactly the current N8
  runtime strings. No visual change on the HPP path.

### P7. ctaHeading

- Name: `copy.ctaHeading`
- Type: string.
- Source: system-default per archetype; owner-set override via presentation
  intent. Covers N15's PARAMETERIZE heading.
- Transform rule: CTASection heading resolves presentation.heading ??
  copy.ctaHeading. The capability block (Visit website + Ask FYD, KEEP N15) is
  unchanged; only the voice varies.
- Fallback when absent: "Start the conversation" (current N15 string), seeded
  in the default table.

### P8. ctaEmphasis

- Name: `composition.ctaEmphasis`
- Type: enum: "standard" | "elevated" | "quiet".
- Source: system-default per archetype; owner-set override. This is where the
  aspirational "CTA boosted by urgency" policy (G11) becomes real data once the
  pipeline is wired: the planner maps its urgency dimension onto this enum.
- Transform rule: "elevated" renders the CTA earlier in P3 order and with the
  primary treatment; "quiet" renders it later with the secondary treatment;
  "standard" is the current HPP behavior. The enum changes position and
  treatment only, never the capability set (KEEP G7).
- Fallback when absent: "standard". Absent data means no emphasis claim.

### P9. navLabels

- Name: `navigation.labels`
- Type: array of { slug, label } derived from spec.navigation.
- Source: graph-derived. The generator builds navigation from the page set;
  labels come from page navLabels in the graph, not from code (KEEP S2).
- Transform rule: tab label = page.navLabel ?? titleCase(slug). Tabs render in
  P4 pageOrder.
- Fallback when absent: title-cased slug (e.g. "services" -> "Services"). Never
  a hardcoded label list; a missing label is a cosmetic gap, not a render
  blocker.

### P10. layoutCharacter

- Name: `presentation.layoutCharacter`
- Type: enum: EDITORIAL | CRAFT | TECHNICAL | RETAIL | PROFESSIONAL | CREATOR
  (the CHARACTER_PRESENTATION keys, KEEP N20).
- Source: owner-set via archetype profile selection, recorded in projection
  meta; system-default per archetype category. Inventory: HPP currently defaults
  to EDITORIAL by omission; the judged character (CRAFT vs EDITORIAL) must be
  recorded as data, not assumed.
- Transform rule: selects the row of the CHARACTER_PRESENTATION table (rhythm,
  tracking, elevation, hero scale, density, width, media treatment, object
  emphasis). The TABLE stays shared implementation; only the SELECTION is data.
- Fallback when absent: EDITORIAL (current effective behavior), recorded
  explicitly in the projection meta so the default is auditable, not implicit.

### P11. themeTokenOverrides

- Name: `presentation.themeTokenOverrides`
- Type: partial record of theme tokens: { accent?, radius?, typography?,
  layoutCharacter? (see P10) }. Tokens validated against the theme schema;
  unknown keys rejected.
- Source: owner-set via presentation intent; system-default is DEFAULT_FYD_THEME.
  Covers inventory COLORS/TOKENS: DEFAULT_FYD_THEME (accent #C9A227 etc.) is the
  system default, not HPP brand.
- Transform rule: deep-merged over DEFAULT_FYD_THEME at spec compile time
  (applyPresentationIntent, KEEP R5): owner directives OVER the compiled spec,
  facts untouched. Token overrides never alter graph facts or copy.
- Fallback when absent: DEFAULT_FYD_THEME verbatim. No tenant may inherit
  another tenant's overrides; overrides live in the tenant's projection, never
  in shared code.

### P12. provenanceTemplate

- Name: `provenance.template` plus `meta.eventSequences`
- Type: template string with slots {brand}, {ingestionMethod}, {eventRange};
  eventSequences is [number, number] from projection meta (currently [65, 83]
  for HPP, src/fyd/data/fyd-tenant-graph.ts:109).
- Source: template is deployment copy (brand + ingestion method vary per
  deployment, not per tenant); eventSequences is graph-derived from projection
  meta. Replaces S5 (hardcoded "(acceptance sequences 65-83)") and S6 (footer
  sentence).
- Transform rule: footer renders template filled from deployment config and
  meta.eventSequences rendered as "65-83" (or "65" when start == end). The
  sentence is composed at the route seam, never inside shared chrome code.
- Fallback when absent: if eventSequences is missing, the event-range slot is
  omitted from the sentence rather than printing a placeholder; if the template
  is missing, the footer renders nothing (fail-closed: no provenance claim is
  better than a fabricated one). Never print another tenant's sequences.

### P13. seoBrandName

- Name: `seo.brandName`
- Type: string.
- Source: deployment. Replaces the "FYD Social" brand baked into the
  generateMetadata description template (inventory hardcoded item 4).
- Transform rule: metadata description template becomes "A procedurally
  generated site for {name}, compiled by {seoBrandName} from its PING-backed
  object graph." Title stays "{ownerTitle} | {seoBrandName}".
- Fallback when absent: the brand suffix is omitted from both title and
  description rather than inventing a brand. The business name (graph-derived,
  KEEP R2) is never omitted.

---

## Part B. The 7 replacement mechanisms

### B1. S1: split demo chrome from the customer surface

Current: src/app/sites/_shared/site-client.tsx renders the FYD Social demo
header, validation banner, structured editor, and provenance footer in the same
component tree as the customer page. Shipping the file ships factory internals
as the product.

Replacement:
- New `CustomerSite` component: SitePageView + page tabs + provenance footer
  only. This is the shippable customer surface. It takes the public graph, the
  compiled spec, render context, and P12/P13 values. No editor, no banners, no
  FYD branding beyond the P12/P13 deployment copy.
- New `DemoChrome` component: the demo header, validation banner, structured
  editor (KEEP S4 behavior: reorder/hide/featured/copy/token edits become
  digest proposals; copy+token edits stay drafts until approved), and operator
  tooling. Rendered only when P2 chromeMode == "demo", wrapping CustomerSite.
- The route composes: chromeMode == "demo" ? <DemoChrome><CustomerSite/></DemoChrome>
  : <CustomerSite/>. The S4 editor behavior is preserved verbatim, only its
  mounting point moves behind the operator gate.
- Removal proof: with FYD_CHROME_MODE unset, the rendered HTML contains no
  "FYD Social" demo header, no validation banner markup, no editor DOM. Assert
  in the route test.

### B2. S5: acceptance sequences become projection data

Covered by P12. Concrete change: delete site-client.tsx:169's hardcoded
"(acceptance sequences 65-83)". The provenance footer (now inside CustomerSite
per B1) renders meta.eventSequences from the projection. The tenant data file
src/fyd/data/fyd-tenant-graph.ts:109 keeps eventSequences: [65, 83] as HPP
tenant data where it belongs; the shared chrome stops knowing the numbers.

Removal proof: render a fixture tenant with eventSequences [1, 4]; footer must
print "(acceptance sequences 1-4)". Render a tenant with no eventSequences;
footer must print no sequence clause at all.

### B3. R9: route composes through the strategy pipeline

Current: the HPP route calls generateSiteSpec with no profile; strategies.ts,
planner.ts, dimensions.ts, site-vectors.ts never run on the golden path. The
site Nolan judges does not exercise the factory's composition policies.

Replacement:
- The route resolves an archetype profile: profile = strategyForSite(tenant
  category, graph) merged with planner(graph) output and any owner presentation
  intent. The profile carries P3 (homeSectionOrder), P4 (pageOrder), P8
  (ctaEmphasis), P10 (layoutCharacter), and P5/P7 copy defaults.
- generateSiteSpec(graph, { generatedAt, eventSequences, profile }) consumes the
  profile for all composition decisions. The generator's fixed orders become the
  default-profile values, not code paths.
- The misleading generator comment (G11: "dimension-vector policy (CTA boosted
  by urgency)") is corrected to describe the real data flow: planner urgency
  dimension -> P8 ctaEmphasis -> CTA position/treatment. No aspirational
  comments remain as architecture.
- Removal proof: an integration test feeds two different archetype profiles
  over the same graph and asserts different section orders (P3) and CTA
  treatments (P8). Then CLONE-PROVE re-runs against the composed HPP path: the
  composed HPP page must be fidelity-identical to the pre-composition golden
  capture, or the difference is explained as a deliberate parameterized value
  in the HPP profile.

### B4. M3: wire the galleryMedia / objectMedia seam

Current: RenderContext defines galleryMedia and objectMedia; SiteClient's ctx
populates only heroMedia. Gallery, PeopleSection portrait strips, and card
covers read empty data and silently render their honest-empty branches. The
page reads as "business has no media" when the truth is "the seam was never
wired."

Replacement: at the server render seam (the route, right after heroMediaFor),
populate ctx.galleryMedia = galleryMediaFor(graph) and ctx.objectMedia =
listObjectMedia(graph) (existing selectors in src/fyd/media/select.ts; add
listObjectMedia if it does not exist, following the M2 role grammar). No
renderer change needed: N13, N18, and FydObjectCard already implement the
branches. If a tenant genuinely has no gallery/object media, the honest-empty
branches fire truthfully.

Removal proof: on the HPP rich fixture, ctx.galleryMedia is non-empty after
the seam (or empty only if the fixture truly has no gallery-role media, stated
explicitly in the test). Gallery renders on a tenant whose graph carries
gallery-role media.

### B5. G9: default section voice moves to a copy table

Covered by P5. Concrete change: new module src/fyd/copy/defaults.ts exporting
the per-archetype heading table seeded with the exact current renderer strings.
Each renderer section function replaces its hardcoded default with
copyFor(archetype, sectionId). Cosmetic renderer comments naming "Happy Place
Carpentry" / "Maya Alvarez" (renderer.tsx:511, relationshipLine doc) are
replaced with neutral examples when the functions are touched; they have no
runtime effect.

Removal proof: grep the renderer for the literal default strings ("Where we
work", "The people", "Latest", "Start the conversation", "Find us"); zero hits
outside defaults.ts and tests. An archetype override test changes one table
entry and asserts the section heading changes with no code edit.

### B6. G10: emit SocialProof when its binding verifies

Current: SocialProofSection is registered and fail-closed (KEEP N14), but the
generator never emits it, so a business with testimonials gets no proof
section.

Replacement: generator adds the SocialProof section gated on a verified
reviews/testimonials binding for the business object. The section's own
fail-closed binding (N14) remains the second gate: emission requires the field
to exist AND verify; rendering requires the binding to verify at render time.
If no reviews/testimonials verify, no section is emitted (G3/G4 honest-empty
law). Do not drop the section from the registry; the component is correct.

Removal proof: fixture with verified testimonials renders a SocialProof
section; fixture without renders none; fixture with unverified testimonial
text renders none (the N14 gate holds even if emission is attempted).

### B7. G11: honest composition comments

The generator comment claiming a "dimension-vector policy (CTA boosted by
urgency)" is replaced with a comment describing the actual mechanism: the
planner's urgency dimension maps to P8 ctaEmphasis, which the generator reads
from the profile. If planner/strategy wiring is not yet live for a tenant, the
comment states the current behavior (profile default "standard") instead of
implying a policy that does not execute. This is a documentation correction
with a code review gate: any comment describing cross-module policy must name
the module that executes it.

---

## Part C. Dangerous couplings: explicit removal plans

### DC1. site-client.tsx:169 hardcoded acceptance sequences

Coupling: HPP ingestion metadata ("acceptance sequences 65-83") baked into
shared customer-path chrome. Every future tenant would print HPP's acceptance
window.

Removal: B2 + P12. The literal is deleted; the footer renders
meta.eventSequences as data; the sentence is templated from deployment copy.
Verification: the B2 removal proof plus a repo-wide grep for "65-83" outside
fixture/tenant-data files returning zero hits.

### DC2. Demo chrome fused with the customer surface

Coupling: one component tree serves Nolan's demo and the customer's site.
There is no deployment composition separating operator tooling from product.

Removal: B1 + P2. CustomerSite and DemoChrome become separate components with
the route composing them by chromeMode, defaulting to customer. The S4
structured editor keeps its full behavior inside DemoChrome. Verification: the
B1 removal proof (no demo markup in customer mode HTML) plus a checklist item
in the deployment runbook: customer deployments must not set FYD_CHROME_MODE=demo.

### DC3. Route bypassing planner/strategy

Coupling: the golden path the factory's quality claims rest on does not run
the factory's composition pipeline. Fidelity claims do not transfer to the
composed product.

Removal: B3. The route resolves a real archetype profile through
strategyForSite/planner and passes it to generateSiteSpec; the HPP profile is
recorded as data (P3, P4, P8, P10 values that reproduce current HPP behavior).
Verification: the B3 integration test (two profiles, one graph, different
orders) plus CLONE-PROVE re-run on the composed path. Until that re-run
passes, the route change stays behind a flag and the pre-composition path
remains the release path.

### DC4. Empty galleryMedia / objectMedia

Coupling: the render context promises media surfaces the server seam never
fills. Renderer quality features (Gallery, portrait strips, card covers) are
dead on every route, and their honest-empty branches misreport "no media."

Removal: B4. The route populates both fields from the media selectors at the
server seam. Verification: the B4 removal proof. Note this changes what HPP
renders if the fixture carries gallery-role media; that is the intended fix,
and CLONE-PROVE's re-run will show the delta as newly-working quality, not
regression.

### DC5. Default section voice in renderer code

Coupling: section voice ("Where we work", "The people", "Start the
conversation", ...) lives in renderer functions. Re-voicing an archetype or
tenant requires editing shared render code per section, which is exactly the
tenant-branching the factory exists to eliminate.

Removal: B5 + P5. The copy table owns all defaults; the renderer owns only the
resolution rule presentation.heading ?? copyFor(archetype, sectionId). Owner
overrides flow through presentation intent (KEEP G8 precedence). Verification:
the B5 grep proof plus a test that a new archetype entry re-voices every
section with zero renderer edits.

---

## Part D. KEEP invariants: parameterization must not break these

Each item: the classified mechanism and a concrete test assertion DEHPP-BUILD
must keep green. If a parameterization change breaks any assertion, the change
is wrong, not the assertion.

Route layer:
- R2: generateMetadata derives title/description from the owner object's
  title. ASSERT: metadata for a tenant whose business title is "X" contains
  "X"; it contains no hardcoded business name.
- R3: publicGraph strips private objects AND private-touching relationships.
  ASSERT: given a graph with a private object and a relationship touching it,
  the client payload contains neither the object nor the relationship.
- R4: generateSiteSpec compiles graph to spec with no hand layout. ASSERT: the
  same graph input produces byte-identical spec output across runs.
- R5: applyPresentationIntent applies owner directives over the spec without
  touching facts. ASSERT: after intent application, every bound fact field
  still verifies against the graph and the digest still matches.
- R6: heroMediaFor resolves once at the server seam; the renderer never
  selects media. ASSERT: renderer module imports no media selector; hero media
  in context equals the seam's selection.
- R7: validateSiteSpec + isRenderable gate. ASSERT: a spec with any validator
  error renders nothing (no partial page, no silent fallback).

Data source:
- D1: hard failure on missing/malformed/tampered projection, never a fixture
  fallback. ASSERT: corrupt the projection bytes; the route throws instead of
  rendering.
- D2: every object carries provenance with a non-empty ref. ASSERT: an object
  with empty provenance ref fails validateObject.
- D3: graphDigest sha256 recomputed and compared. ASSERT: flip one byte in the
  projection; digest verification fails.
- D4: meta.siteId must match the requested site. ASSERT: request tenant B with
  tenant A's projection; the seam rejects it.
- D5: owner corrections compose after digest verification. ASSERT: apply an
  owner correction; the recomputed source digest still matches meta.graphDigest.

Media:
- M1: heroMediaFor excludes logos, prefers role hero else first photographic.
  ASSERT: a graph with a logo and a photographic hero selects the photo, never
  the logo.
- M2: galleryMediaFor excludes logo/hero/card/thumbnail roles with stable
  content-driven order. ASSERT: same media set in shuffled insertion order
  yields the same gallery order.

Generator:
- G1: owner resolution, lowest-id public business wins ties. ASSERT: two public
  business objects; the lower id is chosen deterministically.
- G2: role-based grouping, social and knowledge vocabularies onto seven roles.
  ASSERT: a knowledge-vocabulary object and a social-vocabulary object with the
  same role land in the same group.
- G3: pages exist only when data exists. ASSERT: remove all service objects;
  the services page disappears from navigation.
- G4: sections exist only when data exists. ASSERT: remove contact fields; the
  Contact section is not emitted.
- G5: deterministic section ids pageSlug:component:index, sorted by id.
  ASSERT: two runs over the same graph produce identical section id lists.
- G7: CTA emitted on every home page as a capability. ASSERT: any home spec
  contains a CTA section regardless of P8 emphasis value.
- G8: presentation.heading ?? default precedence. ASSERT: owner heading wins;
  absent owner heading falls back to the P5 table; never the reverse.

Registry/schemas:
- C1: one schema->component mapping, three consumers. ASSERT: add a test
  schema to the registry; generator, validator, and renderer all resolve it
  without separate registration.
- C2: unknown schemas render GenericObjectCard, never fail. ASSERT: a spec
  section with an unregistered schema renders a generic card, page completes.
- C3: accepts-lists from SCHEMA_ROLES, no hardcoded schema ids. ASSERT: a new
  schema added to SCHEMA_ROLES is accepted by gates that previously rejected
  it, with no gate code change.
- C4: registry metadata (requiredData, capabilities, responsive,
  editableProperties, variants). ASSERT: every registered component exposes all
  five metadata fields.

Validator:
- V1: structural + semantic layers. ASSERT: a malformed-shape spec fails the
  structural layer; a well-shaped section with unsatisfiable fields fails the
  semantic layer.
- V2: isRenderable blocks on any error finding. ASSERT: covered with R7; also
  assert a warning-only spec still renders (errors block, warnings do not).

Renderer:
- N1: resolveQuery deterministic sorts. ASSERT: related sorted by id ascending;
  feeds newest-first with id tie-break, stable across runs.
- N2: SectionShell rhythm (max-w-5xl center column, per-character rhythm,
  tonal alternation). ASSERT: rendered section markup carries the shell
  classes; adjacent sections alternate tone.
- N3: honest typographic hero when heroMedia is null. ASSERT: null hero media
  renders the typographic hero and no <img> with a fabricated or stock source.
- N4: hero CTA ladder (website primary, phone-via-flow fallback, Ask FYD
  secondary). ASSERT: tenant with website shows Visit website primary; tenant
  with no website and a phone shows the phone flow; Ask FYD always present.
- N5: FydContactLink carries value + provenance + real tel:/mailto: inside a
  flow. ASSERT: rendered contact link href is tel: or mailto: matching a
  verified field; unverified numbers never render as links.
- N6: boundField/boundTitle/boundDescription through the binding verifier; no
  binding, no factual output. ASSERT: a fact field with no verified binding
  renders nothing (not a placeholder, not a guess).
- N7: resolveSafeLink on every external href. ASSERT: a javascript: or
  data:text/html observed URL is neutralized; no raw observed string reaches
  href/src.
- N8: ClaimBadge names the actual claim source per object set. ASSERT: badge
  label matches the object's claimKind via the P6 table; mixed sets render
  "Mixed sources".
- N9: CorrectionNote renders SOURCE SAYS X / OWNER SAYS Y. ASSERT: an
  owner-corrected field renders both values with the correction note.
- N10: HeroMediaWhyThis / GalleryMediaWhyThis fed only with the media's own
  fields. ASSERT: the drill-down contains no copy beyond the media's own
  provenance fields.
- N11: FydObjectCard media-aware rich vs text card from the graph. ASSERT: an
  object with cover media renders the rich card; without, the text card; both
  carry kicker, claim badge, and affordance.
- N12: relationshipLine uses generic-vocabulary predicates with bound titles.
  ASSERT: the line names the recorded connection from bound titles only.
- N13: PeopleSection portrait strip vs card grid switch. ASSERT: with person
  media (B4 wired) renders the strip; without, the honest card grid.
- N14: SocialProofSection fail-closed. ASSERT: unverified testimonial text
  never renders as a quote.
- N15: CTASection capability block. ASSERT: Visit website + Ask FYD actions
  present; heading comes from P7.
- N16: AskFYDSection id="ask" anchor; boundOwnerTitle falls back to "this
  business". ASSERT: unverified owner title renders "this business", claiming
  nothing.
- N17: ObjectRailSection features the richest public non-owner object.
  ASSERT: the featured object is the highest-richness non-owner public object;
  content untouched.
- N18: Gallery evidence-backed, lazy, explicit dimensions, renders nothing
  without media. ASSERT: no media means no gallery markup at all.
- N19: FydMotionStyles, base state visible, motion never gates content.
  ASSERT: with JS disabled, all section content is visible; with
  prefers-reduced-motion, no entrance animation runs; no scroll hijack
  handlers registered.
- N20: CHARACTER_PRESENTATION table as data. ASSERT: switching P10 changes
  rhythm/tracking/elevation/hero scale/density/width/media treatment/object
  emphasis per the table row; the table itself needs no code change to add a
  row.
- N21: mobile composition CSS. ASSERT: at 360px width, cards render the tile
  layout, touch targets meet 44px, no horizontal overflow; gallery is
  edge-to-edge on xs.
- N22: action/structural labels NOT passed through the binding verifier.
  ASSERT: "Visit website" and "Ask FYD" render without verified bindings;
  a factual claim placed in a label position still requires binding.

SiteClient:
- S2: page tabs render from spec.navigation. ASSERT: tabs match the spec's
  navigation entries; no hardcoded tab list.
- S3: object overlay verifies the object in the public graph, restores scroll.
  ASSERT: opening /o/ for a private object id fails closed; closing restores
  the prior scroll position.
- S4: structured editor edits become digest proposals; copy/token edits stay
  drafts until approved. ASSERT: a token edit does not alter the published
  spec until approval; every applied edit is traceable to a proposal.

---

## Part E. Classification gaps found

DEHPP-BUILD should treat these as open questions, not as license to improvise.
Decisions go to Nolan where marked.

1. Count mismatch. The task states 54 mechanisms (KEEP 34 / PARAMETERIZE 13 /
   REFACTOR-REPLACE-DROP 7). The classification doc literally contains 62 rows
   (R1-9, D1-5, M1-3, G1-11, C1-4, V1-2, N1-22, S1-6) whose per-row classes sum
   to KEEP 51 / PARAMETERIZE 4 / REFACTOR 7. The 13-parameter figure is
   reconcilable only if parameterized sub-values inside KEEP rows are counted
   as parameters (N8 labels, N15 heading/copy, N20 character values, S2
   labels, G7 copy, metadata brand, theme overrides, copy-table defaults, CTA
   urgency). This spec covers all 13 parameters mapped to their source rows and
   asserts every KEEP-marked row in the doc, so nothing classified is left
   unspecced either way. Nolan decision: confirm whether the intended
   denominator is 54 (some rows grouped) or 62 (rows as written).
2. S5 is classified REFACTOR but its fix is pure parameterization (P12). S6 is
   classified PARAMETERIZE and covers the same footer sentence. This spec
   implements them together (B2) to avoid two agents editing one sentence.
3. N16's "this business" fallback is honest and load-bearing, but it is English
   UI copy that will eventually need the P5 copy-table treatment for
   re-voicing. Left as a hardcoded honest fallback for now; flagged, not
   changed.
4. G7 notes CTA "position/copy/emphasis is parameterized" but no classification
   row owns the position value. This spec assigns position to P3 (order),
   voice to P7, emphasis to P8. If the classifier intended a separate
   parameter, it is covered by composition.
5. GOLDEN-REFERENCE.md does not exist (noted in classification.md). The R9/B3
   route recomposition changes the golden path, so CLONE-PROVE must re-run
   against the composed path (B3 removal proof). Until then, the recomposed
   route stays behind a flag.
6. M3's replacement assumes listObjectMedia exists or can be added following
   the M2 role grammar. If select.ts has no such selector, adding it is
   in-spec (same grammar, new function), not scope creep.

---

## Acceptance checklist for this spec

- Every PARAMETERIZE item has a typed parameter + fallback: P1-P13 above,
  each with name, type, source, transform rule, and absent-data fallback.
- Every KEEP item has an invariant assertion: Part D asserts each KEEP-marked
  mechanism from classification.md.
- Every dangerous coupling has a removal plan: DC1-DC5 in Part C, each with
  concrete deletion/edit steps and a verification proof.
- No em dashes anywhere in factory-facing copy (this file complies).
