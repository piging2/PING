# HPP-Specific Inventory (DEHPP-ANALYZE)

Every HPP-specific fact found in the render path that must move into fixture / ObjectGraph /
SiteSpec / projection meta as DATA. Rule: PRESERVE QUALITY, GENERALIZE IDENTITY. The mechanisms
stay; these values go.

Sources: src/app/sites/happy-place/page.tsx, src/app/sites/_shared/site-client.tsx,
src/fyd/proceduralize/generator.ts, src/fyd/components/renderer.tsx, src/fyd/media/select.ts,
src/fyd/data/ping-object-source.ts, and the canonical rich fixture
src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts (9 objects, 10 relationships;
every claim labeled website_statement, acceptance sequences 65-83).

---

## CONTENT (page copy that belongs to this business)

- Business description: "We repair, restore, and improve homes across the Mid-Willamette Valley.
  The work should look right the day we leave, and still look right years later."
- Tagline: "Your favorite part of coming home should be the home itself."
- Service names + descriptions: Decks, Fences, Remodels, Home repair and restoration
  (currently bare titles; descriptions empty in the fixture).
- People: Taylor Happy (role owner, persona note), Lanie Happy (role owner, persona note).
- Location: "Mid-Willamette Valley" service area; counties Benton, Linn, Marion, Polk; Oregon.
- Reviews/testimonials field: ABSENT from the fixture (SocialProof has nothing to bind to;
  see classification G10).
- Claim labels: claimKind "website_statement" on all fixture objects; ClaimBadge renders
  "Website statement" from this data.

## BUSINESS IDENTITY

- SITE_ID "happy-place" (route constant; tenant identity, not code).
- Legal/trade name: "Happy Place Carpentry".
- Category: carpentry / home repair and restoration (trade).
- Phone: +15412865190 (fields.phone on the business object; renders via the contact flow).
- Website: https://happy-place-platform.vercel.app/ (website object url + has_website rel).
- License claim: "CCB# 254240", claimed_licensed/bonded/insured "true" (website statements,
  unverified; must stay labeled as claims wherever surfaced).
- Claimed projects completed: "125+" (website statement, never a verified fact).
- Price range: "$$".
- Owner object id: object_6cc955e4077ad14f (fixture identity; real identity comes from PING).

## OBJECT DATA (graph shape that is this business's, not the system's)

- 9 objects / 10 relationships in the rich fixture: 1 business, 1 website, 1 location,
  4 services, 2 people; predicates has_website, located_at, offers, employs, member_of.
- ownerName() fallback: SITE_ID used when no public business title exists (fallback VALUE
  is tenant data; the fallback mechanism is universal).
- AskFYD heading: "Ask FYD about Happy Place Carpentry" derives from the owner title at
  render time (data-driven already; listed here because the VALUE is HPP's).
- Metadata title/description: "Happy Place Carpentry | FYD Social Generated Site" (derived;
  value is HPP's).

## MEDIA

- Hero media: whatever heroMediaFor("happy-place", graph, ownerId) resolves from HPP's
  acquired media (role grammar is universal; the ASSETS are HPP's).
- galleryMedia / objectMedia: currently unpopulated on this route (classification M3);
  when wired, HPP's gallery/project/service/team/location assets belong here as data.
- Media provenance fields (sourceUrl, rightsBasis, observedAt, digest) feeding
  HeroMediaWhyThis: per-asset data, HPP's assets.

## COLORS/TOKENS

- The HPP render uses themeTokens from the compiled spec. DEFAULT_FYD_THEME
  (accent #C9A227 etc.) is the system default, not HPP's brand; any HPP-chosen token
  overrides (radius, typography, layoutCharacter) must live in the projection's
  presentation intent / owner token overrides, not in code.
- layoutCharacter on the HPP path: generator emits no profile, so the theme default
  applies (EDITORIAL). If HPP is judged as CRAFT, that character choice is HPP data
  that must be recorded as an archetype/profile selection, not assumed.

## SECTION SELECTION (which sections exist for HPP)

Derived from HPP's graph by the generator (mechanism universal; SELECTION is HPP's):
- Home: Hero, BusinessSummary, Services, Locations, People, Contact, Links, CTA,
  AskFYD, ObjectRail (Products and RecentObjects absent: no product or post/article
  objects in HPP's graph; every section on this list is conditional on data).
- About: BusinessSummary + People (exists: description non-empty, people exist).
- Services page: exists (4 services).
- Explore page: check thresholds, publicObjects >= 4 (9 public) and at least one
  feed-renderable schema (service is feed-eligible), so Explore exists for HPP.
- SocialProof: never emitted (no reviews/testimonials in graph; classification G10).

## SECTION ORDER

- Home order for HPP: Hero, BusinessSummary, Services, Products, Locations, People,
  RecentObjects, Contact, Links, CTA, AskFYD, ObjectRail (generator fixed order;
  classification G6: the order is composition data, owned by archetype profiles).
- Page order: home, about, services, explore (generator fixed order; page ORDER is
  composition data; page EXISTENCE is data-driven and universal).

## CTA CONFIGURATION

- CTA section always present on HPP home (capability; universal).
- Primary action resolves to "Visit website" -> https://happy-place-platform.vercel.app/
  (safe-link gated; URL is HPP data).
- Phone fallback path: +15412865190 via the FYD contact flow (number is HPP data;
  the flow is universal).
- Secondary action: "Ask FYD" -> #ask anchor (universal).
- Heading "Start the conversation": presentation default copy (classification G9;
  voice default, overridable per site).
- Urgency posture: the generator comment references a "CTA boosted by urgency"
  dimension policy that does not run on this path (classification G11). HPP's
  effective urgency treatment (high-urgency trades placement) is currently just
  the fixed order; the intended policy values must be recorded as composition data
  when the pipeline is wired.

## NAVIGATION

- Nav tabs render from spec.navigation: Home, About, Services, Explore (labels derived
  from page navLabels; generic words, but the SET is HPP's page set).
- activeSlug defaults to first navigation entry (mechanism universal).

## COMPOSITION RULES vs COMPONENT IMPLEMENTATION

What is RULE (data, varies per archetype/tenant) vs IMPLEMENTATION (code, shared):

RULE (must become profile/spec/projection data):
- Section order per page; page order; max sections per page.
- Which layoutCharacter the site composes under (HPP currently defaults to EDITORIAL
  by omission; if the judged quality is CRAFT, record it).
- CTA emphasis and voice ("Start the conversation" vs alternatives).
- Density/typography/media-treatment/object-emphasis values in CHARACTER_PRESENTATION
  (the TABLE is implementation; the SELECTION per site is data).
- Default section headings per archetype ("Where we work", "The people", ...).
- Provenance footer sentence template + eventSequences range (currently hardcoded;
  classification S5/S6).
- Demo vs production chrome composition (classification S1).

IMPLEMENTATION (shared code, never tenant-branched):
- All 19 registry components and their render functions.
- resolveQuery, SectionShell, FydObjectCard, ClaimBadge, CorrectionNote, WhyThis
  drill-downs, contact flow, safe-link gate, binding verifier.
- FydMotionStyles, motion tokens, reduced-motion collapse, mobile composition CSS.
- Validator layers + isRenderable gate.
- Projection read seam: provenance requirement, digest verification, hard failure.
- Media role grammar (hero/logo/gallery/card/thumbnail exclusion rules).

## Hardcoded HPP values found in shared/customer-path code (must be parameterized)

1. src/app/sites/_shared/site-client.tsx:169, "(acceptance sequences 65-83)" in the
   provenance footer. Shared chrome; HPP ingestion metadata.
2. src/fyd/data/fyd-tenant-graph.ts:109, eventSequences: [65, 83]. Tenant data file;
   fine where it is, but it is the reason the footer hardcode exists, fix together.
3. Renderer comment examples naming "Happy Place Carpentry" / "Maya Alvarez"
   (renderer.tsx:511, relationshipLine doc): comments only, no runtime effect.
   Cosmetic; replace with neutral examples when touched.
4. generateMetadata description template "A procedurally generated site for {name},
   compiled by FYD Social from its PING-backed object graph.": the "FYD Social"
   brand in the template is product copy (PARAMETERIZE per deployment, not per tenant).
