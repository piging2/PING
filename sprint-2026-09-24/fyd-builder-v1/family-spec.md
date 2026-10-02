# FYD Builder V1 - Family Registry Spec (LOCKED)

Status: locked for implementation. Product lane. Spec document only.

This spec replaces the fixed `homePage()` template (Hero, BusinessSummary, Services, Products,
Locations, People, RecentObjects, Contact, Links, CTA, AskFYD, ObjectRail) with an 11-component
registry. The planner selects from this registry. The renderer implements it. SiteSpec references it.
The 12th component must not require planner architecture changes.

Binding authorization: `~/workspace/sprint-2026-09-24/fyd-builder-authorization-2026-09-25.md`,
Correction 2: every component AND every variant must improve HPP or Coppersmith, or enable a
clearly missing business archetype. No hypothetical flexibility. Each entry carries its brutal-gate
justification citing the specific lesson from research docs 02 (HPP) or 03 (Coppersmith).

## Registry entry shape

Every entry below is a shadcn-registry-shaped record: name, type, title, description (the JOB),
plus FYD-specific declarations. Informally:

```
FamilyRegistryEntry {
  name: "Hero"                      // registry name, used by SiteSpec section.component
  type: "registry:component"
  title: "Hero"
  job: PERSUADE | PROVE | CONVERT | REASSURE | SERVE | CLOSE
      // the customer-facing job; every section must have one (02-hpp-lessons)
  accepts: {
    roles: ["owner", "service", ...]     // FYD schema roles: business, service, product,
                                         // location, person, post, article
    requiredFields: [...]                 // object data this component needs to exist
    optionalFields: [...]                 // object data it uses when present
  }
  mediaRoles: [...]                       // bounded set, see Media role vocabulary
  variants: [{ name, job, selectionRule }]// every variant has a job; selectionRule is a
                                         // deterministic evidence-based rule the planner codes
  capabilities: [...]                     // bounded set, see Capability vocabulary
  responsiveContract: { mobile375, mobile390, desktop1440 }  // semantic intent, not px
  editable: {                             // Craft.js-shaped bounded edit contract; NO freeform editing
    variantChoice, showHide, featuredSelection, mediaChoice, ctaChoice,
    themeTokens, boundedProps: [...]
  }
  compositionRules: [...]                 // eligibility, cardinality, placement, dependencies
  brutalGate: { business: "HPP" | "Coppersmith", lesson: "02/03 citation" }
}
```

## Media role vocabulary (bounded; planner and media scoring use exactly these)

- `logo-mark`: business logo or wordmark image (nav, footer).
- `hero-documentary`: documentary photo of the trade actually happening (deck build, plumber at work).
  Must pass the media relevance gate: a conduit photo on a carpentry site is rejected.
- `service-imagery`: illustrative photo tied to one service line (plumbing fittings, carpentry joinery).
- `project-photo`: completed project photo, ideally with a title and location.
- `owner-portrait`: named owner/founder portrait (names must match person objects; never stock).
- `team-photo`: group photo of the actual team.
- `work-detail`: close-up craft detail shot.
- `product-photo`: named product (faucet model, fixture) for product-led conversion.
- `location-photo`: storefront, shop, or exterior establishing shot.

## Capability vocabulary (bounded)

- `cta-primary`: the money action, exactly one resolved per page.
- `cta-secondary`: per-card / per-line conversion (Start a quote, Schedule Installation, See Our Work).
- `cta-tertiary`: retain/browse (newsletter capture, tips, social follows).
- `phone-tap`: tap-to-call with FORMATTED phone (never raw E.164; deletion list 08).
- `estimate-path`: entry to the quote/estimate funnel.
- `schedule-path`: scheduling with preferred-date capture and honest availability disclaimer.
- `ask-affordance`: Ask FYD entry point (quiet; full panel never on the public surface, 08).
- `hours-display`, `address-display`, `map-route`, `social-link`, `content-link`, `newsletter-capture`.

## Field vocabulary (owner object)

Canonical owner fields referenced below: `title`, `description`, `phone`, `email`, `hours`,
`address`, `license_number`, `years_in_business`, `project_count`, `rating_summary`,
`service_areas`, `price_range`. Service fields: `title`, `scope` (one-line scope definition),
`description`, `priority` (business-priority rank, evidence-derived). Person fields: `name`,
`role` (owner/founder/team), `portrait_media`. Post/article fields: `title`, `location`,
`narrative`, `reviewer_name`, `rating`.

---

## 1. Navigation

- **Type:** `registry:component` / `navigation`
- **Job:** CONVERT. The nav is the first conversion surface: get the visitor to the money action
  (call or estimate) in one tap from anywhere on the site. It also teaches what the business sells
  before the visitor scrolls.

### Accepted object schemas
- Roles: `business` (owner), `service`.
- Required fields: business `title` (display name), one primary CTA binding (phone OR estimate path).
- Optional fields: `logo-mark` media, service `title` for taxonomy links, `hours` summary.

### Accepted media roles
- `logo-mark` only. Identity is carried by the mark (HPP logo in nav), not by a theme token.

### Variants
1. **taxonomic.** Job: CONVERT + teach the buying taxonomy. Nav links name the service LINES the
   business sells by, not generic page labels. Selection rule: eligible when the business has >=4
   service objects OR >=2 service lines distinguished by distinct `scope` text; SELECTED when the
   business sells by trade line (Coppersmith: Plumbing / HVAC / Cooling / Heating / Ventilation).
2. **minimal.** Job: CONVERT on small screens without scroll. Selection rule: SELECTED when service
   count <4 and no distinct service lines; also the 375/390 rendering of taxonomic navs collapses
   to this (logo + phone + primary CTA).

### Capabilities
`cta-primary`, `phone-tap`, `content-link` (anchor links to sections), `estimate-path`.

### Responsive contract
- 375/390: collapses to logo + phone CTA + primary CTA button; on touch, a sticky bottom call/estimate
  bar appears after the hero (never covers the primary CTA).
- 1440: full taxonomy inline for taxonomic variant; trust strip may sit above the nav
  (topbar-with-trust-strip, HPP: trust counters above nav).

### Editable properties
- `variantChoice` (taxonomic | minimal).
- `showHide` per nav item (bounded list of resolved links).
- `featuredSelection`: which service lines get top-level links (bounded: pick from service objects).
- `mediaChoice`: logo on/off (auto-off when no `logo-mark` asset; never a fake logo).
- `ctaChoice`: primary CTA = call or estimate (bounded; planner's default from CTA hierarchy model).
- `themeTokens`: header emphasis token only (transparent vs solid).
- Bounded props: `sticky` on/off.

### Composition rules
- Exactly one Navigation per site, always first in page order.
- Never the fixed generic Home/About/Services/Explore set alone (deletion list 08: replaced by
  business-taxonomy-aware navigation).
- Phone must be formatted, tappable, visible above the fold on every page (rubric 09 must-win 3).

### Brutal gate
- Improves COPPERSMITH. Lesson 03: "Nav is a service taxonomy, not a page list." FYD destroyed this
  with its fixed Home/About/Services/Explore. The taxonomic variant restores it. The minimal variant
  keeps phone-first conversion alive on mobile for emergency-prone trades.

---

## 2. Hero

- **Type:** `registry:component` / `hero`
- **Job:** PERSUADE. First impression: sell identity and homeowner/business-owner identity, not the
  trade, and surface the one conversion plus trust within the first viewport.

### Accepted object schemas
- Roles: `business` (owner), `location` (service area), `service` (scope/CTAs anchoring).
- Required fields: editorial headline (H1, identity copy; see Headline rule), subhead (promise +
  scope), primary CTA binding.
- Optional fields: secondary CTA, trust facts (`license_number`, `project_count`, `years_in_business`,
  `service_areas`).

### Accepted media roles
- `hero-documentary` (primary for media-rich), `logo-mark` (for identity-led). Never stock, never
  unjudged media (06 anti-pattern: conduit photo on a carpentry site).

### Variants
1. **media-rich (image-overlay).** Job: PERSUADE through proof of real work. Selection rule: SELECTED
   when >=1 `hero-documentary` asset passes the media relevance gate; INELIGIBLE otherwise. HPP's
   full-bleed deck photo with headline overlay is the reference.
2. **identity-led (editorial).** Job: PERSUADE through brand identity and voice. Selection rule:
   SELECTED when hero-documentary media is absent or fails the relevance gate AND a `logo-mark` asset
   plus brand-voice evidence (ownable headline line, e.g. Coppersmith's "You Don't Need A Plumber,
   You Need A Coppersmith") exists. Typography and the mark do the work.
3. **service-led.** Job: PERSUADE + route service discovery for businesses that sell by trade line.
   Selection rule: SELECTED when the business has a service taxonomy (>=4 services or distinct lines)
   AND weak hero media; hero subhead names the lines and CTAs point at them.
4. **local-action.** Job: CONVERT now. Selection rule: SELECTED when the business is an
   emergency-prone trade (plumbing/HVAC/electrical evidence) with a phone capability and location
   evidence; the hero CTA is the phone, prominently, with service-area proof beside it.

Every variant carries the trust strip beneath (license, count, years, area) when facts exist.

### Capabilities
`cta-primary`, `cta-secondary`, `phone-tap`, `estimate-path`.

### Responsive contract
- 375/390: media-rich collapses to banner-above-copy (image never behind small text at low contrast);
  CTAs stack full-width, thumb-reachable; trust strip becomes a horizontal snap row.
- 1440: full-bleed overlay (media-rich), split (service-led), editorial type-led (identity-led),
  or phone-forward (local-action).

### Editable properties
- `variantChoice` (bounded: only variants whose eligibility passes on current evidence).
- `showHide`: trust strip facts (bounded list), secondary CTA.
- `mediaChoice`: which approved `hero-documentary` asset (bounded list; relevance-gated).
- `ctaChoice`: primary/secondary CTA bindings.
- `themeTokens`: hero emphasis token (contrast treatment of overlay vs banner).
- Bounded props: `headline` and `subhead` copy edits (proposed through FYD, owner-approved; never
  the legal business name by default, see Headline rule).

### Composition rules
- Max one Hero per page; exactly one on the home page, always the first content section.
- The H1 lives here and only here (one H1 per page, rubric 09 must-win 8).

### Brutal gate
- Improves HPP. Lesson 02: HPP's hero sells identity ("Your favorite part of coming home should be
  the home itself."), runs dual CTAs ("Get a Free Estimate" / "See Our Work"), and carries a trust
  strip beneath (125+ projects, CCB# 254240, Licensed/Insured, counties). FYD's fixed Hero showed the
  legal name + one sentence + unjudged media. Variants exist because the evidence differs: HPP has
  documentary media, Coppersmith has brand voice instead; neither gets a fake-media hero.

---

## 3. TrustBar

- **Type:** `registry:component` / `trustbar`
- **Job:** REASSURE (metrics-strip) / PROVE (testimonial-cluster). Front-load proof so the visitor
  trusts before they scroll; mid-page, prove with specificity so they trust before they contact.

### Accepted object schemas
- metrics-strip: `business` (owner) + `location`.
- testimonial-cluster: `post`/`article` role objects carrying review content, or review claims on the
  owner object.
- Required fields: metrics-strip requires >=2 verifiable facts from (`license_number`, `project_count`,
  `years_in_business`, `service_areas`, `rating_summary`). testimonial-cluster requires >=1 named,
  specific review (reviewer name + full text + what was done).
- Optional fields: per-fact source reference (TRUST surface, not public), `price_range`.

### Accepted media roles
- None for metrics-strip. testimonial-cluster: optional `owner-portrait` of the business owner beside
  the reviews is NOT allowed; reviewer photos are never rendered (no reviewer media evidence).

### Variants
1. **metrics-strip.** Job: REASSURE above the fold. Selection rule: eligible when >=2 metric facts
   exist; placed directly under the hero (HPP) or in the nav topbar on wide screens. Every fact is
   evidence-backed or it does not render (no invented counts).
2. **testimonial-cluster.** Job: PROVE with specificity mid-page. Selection rule: eligible when >=1
   named specific review exists (e.g. Coppersmith's 19-year-customer and 2004-install reviews).
   Placed after services/projects, before ContactCTA. If no reviews exist, the planner may render an
   HONEST EMPTY STATE (HPP lesson 02: "We're building our public review portfolio... ask us for
   references in your neighborhood.") instead of fake stars. This is the only component allowed an
   honest empty state, and it is a variant of testimonial-cluster, not a separate component.

### Capabilities
`ask-affordance` (ask about a review claim routes to the inspect surface), `content-link` (See all
reviews/projects). No CTA money actions here: this is a proof surface.

### Responsive contract
- 375/390: metrics-strip becomes a horizontal snap-scroll row; testimonial-cluster becomes stacked
  cards, one per screen width.
- 1440: metrics-strip as a band; testimonial-cluster as 3-column cards with quoted specificity intact.

### Editable properties
- `variantChoice` (metrics-strip | testimonial-cluster; both may appear in different positions).
- `showHide` per fact (bounded list; hidden facts must not be re-invented).
- `featuredSelection`: which reviews appear (bounded: from review evidence).
- Bounded props: empty-state copy (proposed through FYD; honesty required).

### Composition rules
- metrics-strip appears above the fold (hero-adjacent). testimonial-cluster appears mid-page, after
  proof-of-work (ServiceGrid/Projects) and before ContactCTA: testimonials placed for trust, never
  appended at the end (editorial ordering rules).
- Both variants may coexist; neither may appear more than once per page.

### Brutal gate
- Improves BOTH. metrics-strip: HPP lesson 02 (license, 125+ projects, counties all above the fold;
  FYD's generic page had none). testimonial-cluster: Coppersmith lesson 03 (the three long specific
  reviews are "the site's strongest trust asset and they sit mid-page, not buried"; FYD dropped their
  prominence). The honest-empty-state rule improves HPP ("honest empty states beat missing or fake
  content").

---

## 4. ServiceGrid

- **Type:** `registry:component` / `servicegrid`
- **Job:** CONVERT. Route the visitor from browsing to a per-service conversion hook. Services are
  sold, not listed.

### Accepted object schemas
- Roles: `service`.
- Required fields: service `title`, service `scope` (one-line scope definition). A service without a
  name or scope does not get a card (no inventing scope).
- Optional fields: service `description` (2-3 sentences craft voice), `priority` rank, service media.

### Accepted media roles
- `service-imagery`, `work-detail`.

### Variants
1. **cards.** Job: scan-and-convert a flat service set. Selection rule: SELECTED when 2-6 services
   and no single clear flagship; INELIGIBLE when media covers >=60% of cards (media-grid wins).
2. **featured-plus-grid.** Job: lead with the flagship line, then the rest. Selection rule: SELECTED
   when >=4 services and one service is the evidence-backed priority flagship (owner intent or revenue
   evidence). HPP's five services with an implicit priority order is the reference.
3. **media-grid.** Job: prove craft quality through imagery while converting. Selection rule: SELECTED
   when relevant `service-imagery` or `work-detail` media passes the relevance gate for >=60% of
   service cards.

Every variant: per-card conversion hook ("Start a quote ->", "Schedule Installation").

### Capabilities
`cta-secondary` (per-card hooks), `estimate-path`, `schedule-path`, `ask-affordance` (per-card
"ask about this service" as tertiary), `content-link`.

### Responsive contract
- 375/390: cards collapse to compact tiles (icon-or-media thumb, name, scope line, hook); featured
  card leads, full-width; media-grid becomes single-column with media top.
- 1440: 2-4 column grid per variant; featured card spans.

### Editable properties
- `variantChoice` (bounded: only eligible variants).
- `showHide` per service card (bounded; hiding is honest, deleting is owner-action via proposal).
- `featuredSelection`: which service is featured (bounded: from service objects).
- `mediaChoice` per card (bounded: from that service's media).
- `ctaChoice`: per-card hook = Start a quote | Schedule | Ask (bounded).
- Bounded props: card order (reorder among service objects; editorial priority order is the default,
  never alphabetical).

### Composition rules
- Requires >=2 services (planner: IF multiple service objects -> ServiceGrid eligible).
- One ServiceGrid per page; the services page reuses this component, never a separate one.
- Services ordered by business priority, never alphabetical (editorial ordering rules).

### Brutal gate
- Improves BOTH. HPP lesson 02: named services with craft-voice scope lines and per-card "Start a
  quote ->" hooks, in editorial order ("A few ways we can help"); FYD had text-only cards with
  badges and no hooks. Coppersmith lesson 03: named service lines with one-line scope definitions and
  distinct audiences; FYD flattened the taxonomy into a generic list.

---

## 5. FeaturedService

- **Type:** `registry:component` / `featuredservice`
- **Job:** PERSUADE + CONVERT for one flagship service line: define its scope, prove it with media,
  and route its specific buyer.

### Accepted object schemas
- Roles: `service` (exactly one featured object per instance), `product` (optional: named products
  for the install funnel), `business` (context).
- Required fields: featured service `title`, `scope`.
- Optional fields: service `description`, product objects (named products + schedule funnel),
  `priority` evidence.

### Accepted media roles
- `service-imagery`, `work-detail`, `project-photo` (of this line), `product-photo` (named products).

### Variants
1. **media-lead.** Job: prove craft quality through documentary imagery, then convert. Selection
   rule: SELECTED when relevant `service-imagery`/`work-detail`/`project-photo` for this line passes
   the relevance gate.
2. **scope-lead.** Job: define scope to qualify the right buyer. Selection rule: SELECTED when the
   service has strong scope text but media is weak/absent. Copy does the persuasion.

### Capabilities
`cta-secondary` (Start a quote, Schedule Installation), `cta-primary` repeat for phone-primary
businesses, `phone-tap`, `schedule-path`, `ask-affordance`, `content-link`.

### Responsive contract
- 375/390: media top, scope, CTA; product-led funnel (Coppersmith's Schedule Installation with
  product select + preferred date) becomes a progressive disclosure form, never a cramped table.
- 1440: split layout, media one side, scope + CTA + product select the other.

### Editable properties
- `variantChoice` (media-lead | scope-lead).
- `featuredSelection`: which service object this instance features (bounded; one per instance).
- `showHide`: product funnel block, scope text.
- `mediaChoice` (bounded: from this service's media).
- `ctaChoice`: Start a quote | Schedule Installation | Call (bounded).
- Bounded props: product select options (from product objects only).

### Composition rules
- Only when a service line is a distinct buying unit (>=2 lines or owner intent flags lines as
  buying units; Coppersmith's 4 lines).
- Max 3 FeaturedService instances per page; each binds a DIFFERENT service object (no repeats).
- FeaturedService and ServiceGrid may coexist: grid for browse, featured lines for the lines that
  carry revenue or distinct audiences. Planner decides by evidence (distinct `scope` audiences).

### Brutal gate
- Improves COPPERSMITH. Lesson 03: the four specializations (Plumbing / Ventilation / Heating &
  Cooling / HVAC) each get a one-line scope definition and distinct audiences ("new construction
  residential/commercial, office complexes, furnace/AC/heat pump/mini-split"). FYD's flat Services
  list erased this. The product-led funnel (named products + Schedule Installation + honest
  disclaimer) is the second Coppersmith save: "a parts-to-installation funnel - real revenue path
  FYD's generic site drops entirely."

---

## 6. ProjectGallery

- **Type:** `registry:component` / `projectgallery`
- **Job:** PROVE. Titled projects with location + narrative are the proof of craft. The gallery is an
  evidence surface: every project shows the work, where it happened, and what was done.

### Accepted object schemas
- Roles: `post`/`article` (project writeups: titled, with location + narrative), `product` (named
  product installs with `product-photo`).
- Required fields: >=2 items each with `title`. Items without titles do not render.
- Optional fields: `location`, `narrative`, project media.

### Accepted media roles
- `project-photo`, `work-detail`.

### Variants
1. **masonry.** Job: browse-density proof of volume. Selection rule: SELECTED when >=6 items with
   passing `project-photo` media (HPP has a real project portfolio).
2. **editorial.** Job: storytelling proof with narrative. Selection rule: SELECTED when items carry
   `narrative` + `location` text (HPP's "Steel-Framed Covered Privacy Courtyard – Corvallis" with
   story); media present but not the driver.
3. **carousel.** Job: xs-first browse without scroll fatigue. Selection rule: the 375/390 rendering
   of masonry/editorial; SELECTABLE as a variant choice when item count is 2-4 and the owner prefers
   a contained band.

### Capabilities
`cta-secondary` ("See all projects ->" / per-project "Start a similar project"), `content-link`,
`ask-affordance` (ask about a project -> inspect surface).

### Responsive contract
- 375/390: masonry and editorial both project as a horizontal carousel/snap row; per-project card
  shows title, location, CTA.
- 1440: masonry grid (variant 1), editorial feature layout (variant 2), carousel band (variant 3).

### Editable properties
- `variantChoice` (bounded: eligibility-gated).
- `featuredSelection`: which projects appear (bounded: from project objects).
- `showHide`: narrative text, location line.
- `mediaChoice` per project (bounded: from that project's media).
- Bounded props: item order (editorial priority default).

### Composition rules
- Eligible ONLY when >=2 gallery-quality items exist with media passing the relevance gate
  (authorization: "IF insufficient gallery-quality media -> Gallery INELIGIBLE").
- Max one gallery per page.
- Never renders empty or media-less placeholder tiles; missing media means fewer items, not filler.

### Brutal gate
- Improves HPP. Lesson 02: "Recent Work" with titled projects, location, and narrative is the proof
  layer; FYD had no project surface at all (RecentObjects was a generic feed). The media-quality
  gate is the Coppersmith-side lesson too: the gallery must never show a generic AC-condenser stock
  photo or cross-contaminated business media (rubric 09 must-win 6).

---

## 7. BusinessStory

- **Type:** `registry:component` / `businessstory`
- **Job:** REASSURE. The trust anchor: who is behind the work, in their own voice. A visitor who
  trusts the people hires the business.

### Accepted object schemas
- Roles: `person` (required), `business` (context).
- Required fields: >=1 person object with `role` = owner/founder AND a `name`. Without a named
  owner/founder, this component is INELIGIBLE: never invent the story.
- Optional fields: person `portrait_media`, role description, craft-voice bio, `years_in_business`.

### Accepted media roles
- `owner-portrait`, `team-photo`. Portraits render only when the media provably depicts the named
  person (media provenance); never stock faces.

### Variants
1. **founder-led.** Job: humanize the business through its founders. Selection rule: SELECTED when
   1-2 owner/founder people exist (HPP: Taylor and Lanie with named roles). Copy in craft voice
   ("Built by one family. Trusted by many more.").
2. **team-grid.** Job: show bench depth for larger crews. Selection rule: SELECTED when >=3 named
   people with roles exist (Coppersmith-scale). Each person: name, role, portrait when evidenced.

### Capabilities
`ask-affordance` (ask about the team -> inspect), `content-link` (About page). No money CTAs: the
story is a trust anchor, not a conversion surface.

### Responsive contract
- 375/390: stacked; portrait with name + role as a card; founder-led becomes two stacked cards.
- 1440: side-by-side: story copy one side, portraits the other (founder-led); grid (team-grid).

### Editable properties
- `variantChoice` (bounded).
- `featuredSelection`: which people appear (bounded: from person objects; owner/founder cannot be
  removed, only hidden by explicit owner request).
- `showHide`: portraits (honest: hiding a portrait never substitutes a stock face).
- Bounded props: story headline (proposed through FYD, craft voice preserved).

### Composition rules
- Requires >=1 person with owner/founder role. No owner person -> component ineligible, page omits
  it (never an invented "our team" block).
- Appears after proof surfaces (gallery/trust cluster), before ServiceArea/ContactCTA.

### Brutal gate
- Improves HPP. Lesson 02: "Built by one family. Trusted by many more." with two portraits and
  named roles (Taylor cares about the work you'll notice five years from now; Lanie keeps every
  project organized) is called out as "the trust anchor". FYD's generic People list had no story,
  no roles, no voice.

---

## 8. ServiceArea

- **Type:** `registry:component` / `servicearea`
- **Job:** REASSURE. Localism is the trust signal for home services: show the visitor the business
  works where they live.

### Accepted object schemas
- Roles: `location`, `business` (owner address).
- Required fields: >=2 named service areas (counties/cities/neighborhoods) OR one physical address
  with evidenced service radius. One vague area ("we serve the area") is not enough: ineligible.
- Optional fields: `address`, per-area notes, `hours`.

### Accepted media roles
- `location-photo` (storefront/shop exterior). Optional; never a generic map image implying coverage
  beyond evidence.

### Variants
1. **area-list.** Job: local proof via named places. Selection rule: SELECTED when >=2 named service
   areas exist (HPP's Benton/Linn/Marion/Polk counties; named on projects too).
2. **hub-address.** Job: anchor to a real place. Selection rule: SELECTED when one physical address
   exists with a service-radius or "serving" evidence (Coppersmith: 630 Maldonado Street, Grand
   Junction CO + Western Colorado).

### Capabilities
`map-route`, `address-display`, `phone-tap` (local number), `content-link` (area-specific content).

### Responsive contract
- 375/390: chips or compact list; address block with tap-to-map and tap-to-call.
- 1440: named-areas band (area-list) or address card + service-radius copy (hub-address).

### Editable properties
- `variantChoice` (bounded).
- `showHide` per area (bounded list; hiding is honest scoping).
- `featuredSelection`: primary area (bounded).
- Bounded props: street-address visibility toggle (privacy: owner may hide street address; then the
  component falls back to area-list copy, never shows the address).

### Composition rules
- Ineligible when only vague coverage evidence exists: render nothing rather than "We serve your area."
- No rendered map pins beyond evidenced locations (hard gate: invented material fact).

### Brutal gate
- Improves BOTH. HPP lesson 02: counties are everywhere (hero trust strip, project locations,
  footer); "Local proof everywhere... Localism is the trust signal for home services." Coppersmith
  lesson 03: the footer/address + "serviced Western Colorado for over 25 years" anchors place.

---

## 9. ContactCTA

- **Type:** `registry:component` / `contactcta`
- **Job:** CONVERT. The closing argument: emotionally framed, friction-free contact. This is the
  page's final conversion push before the footer.

### Accepted object schemas
- Roles: `business` (owner), `location`, `service` (estimate paths).
- Required fields: primary CTA binding (call or estimate), formatted contact block (phone at
  minimum; email/address/hours when present).
- Optional fields: `email`, `hours`, `address`, `description` (framing copy).

### Accepted media roles
- None required. Optional `hero-documentary` or `owner-portrait` as a conversion-variant backdrop
  (bounded; relevance-gated).

### Variants
1. **conversion-dual.** Job: close with emotional framing + dual CTAs. Selection rule: DEFAULT when
   phone AND estimate/schedule paths both exist. HPP's "Tell us what you're planning." + "Start Your
   Free Estimate" / "See Our Work" is the reference.
2. **value-capture.** Job: retain the not-ready-yet visitor with value-first capture. Selection rule:
   SELECTED when evidence of repeat-value content exists (tips, maintenance reminders, project
   showcases). HPP's newsletter ("Stay Ahead of Home Maintenance", "No spam, ever.") is the
   reference; the capture promise must be specific, never a generic "subscribe".

### Capabilities
`cta-primary`, `cta-secondary`, `phone-tap`, `estimate-path`, `schedule-path`, `hours-display`,
`address-display`, `newsletter-capture` (value-capture variant).

### Responsive contract
- 375/390: primary CTA is thumb-reachable (sticky within the section, full-width); tap-to-call on
  the formatted number; schedule form becomes progressive disclosure (never a cramped multi-column
  form); the Coppersmith-style honest availability disclaimer stays visible.
- 1440: framed block: emotional headline, dual buttons, contact grid (phone/email/hours/address).

### Editable properties
- `variantChoice` (conversion-dual | value-capture; both may appear, conversion first).
- `ctaChoice`: primary/secondary bindings (bounded).
- `showHide` per contact field (bounded; street address hide = privacy toggle, see ServiceArea).
- Bounded props: framing headline (proposed through FYD; emotional, never customer-posing).

### Composition rules
- Exactly one ContactCTA per home page, placed after ServiceArea and before the Footer (editorial
  ordering). The primary CTA must be visible above the fold in nav/hero AND here AND in the footer:
  the placement map (see CTA hierarchy model).
- Phone numbers always formatted (e.g. (541) 286-5190), never raw E.164 (deletion list 08).
- Never "Visit website" as a CTA (deletion list 08: conversion abdication).

### Brutal gate
- Improves BOTH. HPP lesson 02: emotional framing + dual buttons + full contact block with hours.
  Coppersmith lesson 03: the phone IS the conversion for emergency-prone trades (repeated hero,
  banner, footer); the "Schedule Installation" form with an honest disclaimer ("We cannot guarantee
  openings for the date you choose") is conversion design FYD must preserve.

---

## 10. Footer

- **Type:** `registry:component` / `footer`
- **Job:** CLOSE. The credibility close: who you are, where you are, how to reach you, and the
  serious-business links. The last thing a skeptical visitor reads before deciding.

### Accepted object schemas
- Roles: `business` (owner), `location`, `service` (service links), `post`/`article` (content links:
  tips, gallery).
- Required fields: legal business name, formatted phone, copyright line.
- Optional fields: `address`, `email`, `hours`, `service_areas`, `price_range`, owner names,
  socials, quick links (Service Agreement, Financing, Rebates, Privacy Policy), content links.

### Accepted media roles
- `logo-mark`.

### Variants
1. **credibility.** Job: close with trust. Selection rule: DEFAULT. Full contact block, service
   links, quick trust links, explore nav, copyright.
2. **credibility-plus-capture.** Job: close AND retain. Selection rule: SELECTED when newsletter /
   value-capture evidence exists; folds the tertiary capture into the footer instead of a separate
   band (HPP's newsletter lives here rather than as its own section).

### Capabilities
`cta-primary` (phone repeat), `cta-tertiary` (`newsletter-capture`, `social-link`, `content-link`),
`hours-display`, `address-display`.

### Responsive contract
- 375/390: stacked sections, phone + primary CTA first (thumb-reachable), links collapsed into
  simple lists (no hover-dependent menus).
- 1440: multi-column grid: contact | services links | quick links | capture/social.

### Editable properties
- `variantChoice` (bounded).
- `showHide` per link group and per contact field (bounded).
- Bounded props: legal-name vs DBA display choice; capture on/off.

### Composition rules
- Exactly one Footer per site, always last.
- Legal business name lives here (and small in nav), never as the H1 (Headline rule).

### Brutal gate
- Improves BOTH. HPP lesson 02: the footer is a full contact block (Adair Village OR, formatted
  (541) 286-5190, email, hours Mon-Fri 8am-5pm, price range $$, owners named, counties listed,
  "Most estimates scheduled within 1-2 business days"). Coppersmith lesson 03: footer IA with
  Services links + Quick Links (Service Agreement, Financing, Rebates, Privacy Policy = "the
  'serious business' trust links") + address + phone.

---

## 11. AskFYD-entry

- **Type:** `registry:component` / `askfyd-entry`
- **Job:** SERVE. The business's intelligent concierge: answer arbitrary visitor questions from the
  evidence, on demand. Quiet, never a sales surface, never an evidence panel on the public page.

### Accepted object schemas
- Roles: none bound. This is a site capability; it reads the whole object graph through the Ask FYD
  pipeline (QUESTION -> OBJECT RETRIEVAL -> EVIDENCE RETRIEVAL -> VISIBILITY FILTER ->
  CONTEXT ASSEMBLY -> REASONING -> ANSWER + EVIDENCE; authorization Decision 3).
- Required: one quiet entry affordance per page; the evidence-bounded behavior contract (the LLM may
  synthesize, never manufacture; insufficient evidence -> "FYD does not have enough supported
  information" / "I can't verify that").

### Accepted media roles
- None.

### Variants
1. **floating-entry.** Job: always-reachable concierge. Selection rule: DEFAULT on the home page.
   One quiet floating affordance; reduced-motion collapses it to a static button.
2. **inline-section.** Job: invite a question at a proof moment. Selection rule: SELECTED on service
   or project pages after the gallery/story sections, where questions are most likely
   ("Does this cover my county?" "How long does a deck take?"). A single quiet prompt card, not a
   full panel.

### Capabilities
`ask-affordance` only. No CTAs, no phone, no evidence chrome on the public surface.

### Responsive contract
- 375/390: floating entry is thumb-reachable (bottom corner, safe-area aware), never covers the
  sticky primary CTA; inline-section is a simple card.
- 1440: floating bottom corner; opens the ask surface on demand.

### Editable properties
- `showHide`: entry visibility.
- Bounded props: entry label (bounded choices, e.g. "Ask about this business"), placement
  (floating | inline).

### Composition rules
- Max one floating entry per page. The full evidence panel NEVER appears on the public surface
  (deletion list 08 item 14; full panel lives on the object page via the inspect surface).
- Ask FYD feels like the business's concierge (natural answers, subtle source affordance), NOT
  "query our evidence database" (07).

### Brutal gate
- Improves BOTH, via rubric 09 must-wins 9-11. Neither original site has a concierge; Ask FYD is the
  FYD-specific reason an owner would choose the generated site. The quiet entry also executes the
  deletion list: it replaces the full evidence panel that used to sit on the public page (08 #14).
  This variant pair enables the missing archetype neither original covers: the always-on intelligent
  front desk for a small shop.

---

# Mapping: current generator components -> V1 family

Per deletion list 08. Dispositions: KEEP (rebuilt as registry component), MERGE (folds into one or
more family components), DELETE (leaves the public render; may survive on TRUST/INSPECT or DEV
surfaces).

| Current generator component | Disposition | New home | Rationale (08) |
|---|---|---|---|
| Hero | KEEP (rebuilt) | Hero (4 variants) | The concept survives; the fixed legal-name + unjudged-media implementation dies. |
| BusinessSummary | DELETE as standalone; MERGE | description -> Hero subhead input and BusinessStory copy | 08: the fixed generic section list dies. A description block with no job is exactly the failure 02 names ("FYD's fixed section list has no per-section job"). |
| Services | KEEP (renamed) | ServiceGrid (cards / featured-plus-grid / media-grid) | 08 #13: text-only cards with no media slots and no conversion hooks are replaced by ServiceGrid variants with media + per-card hooks. |
| Products | MERGE | product objects bind to FeaturedService (named-product install funnel) and ProjectGallery (named installs); shop link lives in Footer | A generic Products grid is a catalog, not a conversion surface. The product-led revenue path survives inside FeaturedService (03: Coppersmith's Popular Product Installations). |
| Locations | KEEP (renamed) | ServiceArea (area-list / hub-address) | Renamed to its job; vague-coverage ineligibility rule added. |
| People | KEEP (renamed) | BusinessStory (founder-led / team-grid) | 08: the story needs named owners with roles and voice, not a face grid. Owner-role requirement added. |
| RecentObjects | MERGE / SPLIT | project writeups -> ProjectGallery; tips/articles -> Footer content links; reviews -> TrustBar testimonial-cluster | 08: the Explore page as object browser dies; generic feeds are not customer content. Each content type binds where its job lives. |
| Contact | MERGE | ContactCTA (merged with CTA) | Contact info is a conversion surface, not an info block. |
| Links | MERGE | Footer (social + content links) | Social/contact links close the page; they do not earn a section. |
| CTA | MERGE | ContactCTA + Navigation + per-card hooks | 08 #9: "Visit website" abdication CTA dies. The single CTA block becomes the distributed CTA hierarchy (see CTA hierarchy model). |
| AskFYD | KEEP (rebuilt) | AskFYD-entry (floating-entry / inline-section) | 08 #14: the full evidence panel leaves the public page; one quiet entry remains. |
| ObjectRail | DELETE from public render | TRUST/INSPECT and DEV surfaces only | 08 #6: floating object affordance circles, margin rails, object pills, and bottom-sheet object browsers leave the public page entirely. The object page (ObjectView) with WhyThis lineage is the working model (07). |

About page: BusinessSummary + People -> BusinessStory + TrustBar (same registry, same rules).
Services page: Services -> ServiceGrid (same component, full list). No page gets a component the
registry does not define.

# Editorial ordering rules

1. **Services ordered by business priority, never alphabetical.** Priority comes from evidence
   (revenue signals, source-site order, owner intent), then deterministic object-id tiebreak.
2. **Testimonials placed for trust, never appended.** TrustBar testimonial-cluster sits mid-page,
   after ServiceGrid/FeaturedService and ProjectGallery, before ContactCTA. metrics-strip sits
   above the fold under the hero.
3. **CTA repeated at nav / hero / section / footer.** See CTA hierarchy model; at least one primary
   CTA is visible without scrolling on every page at 375, 390, and 1440.
4. **Section order (home), deterministic from the eligible set** (ineligible sections are omitted,
   order is preserved, never reflowed):
   Navigation -> Hero -> TrustBar (metrics-strip) -> FeaturedService lines (when service lines are
   distinct buying units, max 3) -> ServiceGrid (when browsing the full set) -> ProjectGallery ->
   TrustBar (testimonial-cluster) -> BusinessStory -> ServiceArea -> ContactCTA ->
   AskFYD-entry (floating; inline variant after gallery on service pages) -> Footer.
5. **Products never get their own grid.** Product objects bind to FeaturedService or ProjectGallery
   or a Footer shop link (mapping table).
6. **Empty sections do not exist.** Missing data means the section does not exist; nothing is
   invented to fill a slot. The honest-empty-state rule applies ONLY to TrustBar testimonial-cluster.

# CTA hierarchy model

One primary per page. Ranked site-wide; the planner resolves the primary from capability evidence,
deterministically.

- **Primary (the money action).** Resolution rule: IF the business is an emergency-prone trade
  (plumbing/HVAC/electrical evidence) AND a phone exists -> primary = Call (phone-tap), formatted,
  e.g. Coppersmith. ELSE IF an estimate/quote capability exists -> primary = Get an Estimate, e.g.
  HPP. ELSE IF a phone exists -> primary = Call. The primary is never "Visit website" (08).
- **Secondary (per-service / per-line conversion).** S1: Start a quote -> (per service card; 02).
  S2: Schedule Installation with product + preferred date + honest disclaimer (03; FeaturedService
  product funnel). S3: See Our Work (gallery route; 02 dual CTA). Bound to cards, featured lines,
  gallery items.
- **Tertiary (retain / browse).** T1: newsletter / value-first capture ("Stay Ahead of Home
  Maintenance", "No spam, ever."). T2: tips/gallery browse links. T3: social follows. Footer and
  the ContactCTA value-capture variant only.

## Placement map

| Placement | Primary | Secondary | Tertiary |
|---|---|---|---|
| Navigation | yes (button) | - | - |
| Hero | yes | S3 or service-line CTA | - |
| TrustBar | - | - | - (proof only) |
| ServiceGrid | - | S1 per card | - |
| FeaturedService | repeat on phone-primary sites | S1 / S2 | - |
| ProjectGallery | - | S3 "See all projects"; per-project S1 | - |
| BusinessStory | - | - | - (trust anchor) |
| ServiceArea | - | - | - |
| ContactCTA | yes | yes (S1/S2) | T1 (value-capture variant) |
| Footer | yes (phone) | - | T1 (capture variant), T2, T3 |
| AskFYD-entry | - | - | - (concierge; ask-affordance only) |

# Headline rule

- The H1 is EDITORIAL IDENTITY COPY, never the legal business name by default (02: "Headline sells
  identity, not the trade. 'Your favorite part of coming home...' vs FYD's 'Happy Place Carpentry
  LLC'. The planner must treat headline as editorial content, not the legal business name.").
- Source hierarchy for the H1: (1) owner-provided or owner-approved headline; (2) source-site hero
  headline evidence (e.g. Coppersmith's "You Don't Need A Plumber, You Need A Coppersmith");
  (3) evidence-derived editorial line from craft-voice observations; (4) NEVER the legal business
  name unless the owner approves it as the identity line.
- The legal business name lives in the nav (small, with the logo-mark) and the footer. One H1 per
  page (rubric 09 must-win 8).

# Planner eligibility summary (deterministic rules, directly codable)

These are the registry's composition rules restated as IF/THEN for the planner implementer. Same
inputs -> same plan.

- IF owner present -> site exists; IF NOT -> no site (unchanged eligibility law).
- IF >=1 hero-documentary asset passes the relevance gate -> Hero eligible, variant media-rich
  SELECTED. ELSE IF logo-mark + brand-voice evidence -> Hero variant identity-led. ELSE IF service
  taxonomy (>=4 services or distinct lines) -> Hero variant service-led. ELSE IF emergency-prone
  trade + phone + location -> Hero variant local-action. ELSE Hero variant identity-led with
  typographic treatment (never a fake photo).
- IF >=2 metric facts -> TrustBar metrics-strip eligible (above the fold).
- IF >=2 services -> ServiceGrid eligible; variant by media coverage and flagship evidence.
- IF >=2 service lines are distinct buying units -> FeaturedService eligible (max 3, distinct objects).
- IF >=2 gallery-quality items with relevance-passing media -> ProjectGallery eligible; ELSE gallery
  INELIGIBLE (authorization, planner section).
- IF >=1 named specific review -> TrustBar testimonial-cluster eligible (mid-page). ELSE IF review
  evidence absent -> testimonial-cluster may render the honest empty state (owner-approved copy).
- IF >=1 person with owner/founder role -> BusinessStory eligible; >=3 named people -> team-grid.
- IF >=2 named service areas OR address + service-radius evidence -> ServiceArea eligible.
- IF primary CTA binding resolvable -> ContactCTA eligible (exactly one, before footer).
- AskFYD-entry: always eligible (site capability), floating-entry default.
- Navigation + Footer: always present, exactly one each.
- Every section records: component, variant, job, object bindings, media bindings, CTA bindings,
  responsive intent, selection rationale/provenance (SiteSpec intent extensions, 06). No Tailwind
  class strings, no raw JSX, no arbitrary CSS in SiteSpec.

# Brutal gate coverage matrix

Every component and variant, mapped to the business it improves and the lesson that proves it.
A blank cell here would be a spec defect.

| Component | Variant | Improves | Lesson |
|---|---|---|---|
| Navigation | taxonomic | Coppersmith | 03: service-taxonomy nav; FYD destroyed it |
| Navigation | minimal | Coppersmith | 03: phone IS the conversion for emergency-prone trades |
| Hero | media-rich | HPP | 02: full-bleed documentary photo + identity headline + dual CTAs + trust strip |
| Hero | identity-led | Coppersmith | 03: brand voice ("You Don't Need A Plumber...") when media is weak |
| Hero | service-led | Coppersmith | 03: sell by trade line; nav teaches the taxonomy, hero routes it |
| Hero | local-action | Coppersmith | 03: emergency-prone trade, phone-forward conversion |
| TrustBar | metrics-strip | HPP | 02: trust front-loaded (CCB#, 125+, counties) above the fold |
| TrustBar | testimonial-cluster | Coppersmith | 03: three long specific reviews are the strongest trust asset, mid-page |
| TrustBar | testimonial-cluster (honest empty state) | HPP | 02: honest empty states beat missing or fake content |
| ServiceGrid | cards | HPP | 02: named services with scope lines + per-card quote hooks, editorial order |
| ServiceGrid | featured-plus-grid | HPP | 02: five services with an implicit priority order |
| ServiceGrid | media-grid | HPP | 02: documentary imagery as proof (deck project photos) |
| FeaturedService | media-lead | Coppersmith | 03: four specializations with scope + audiences; prove with imagery |
| FeaturedService | scope-lead | Coppersmith | 03: one-line scope definitions that qualify the right buyer |
| FeaturedService | (product funnel) | Coppersmith | 03: Popular Product Installations + Schedule Installation = real revenue path FYD dropped |
| ProjectGallery | masonry | HPP | 02: titled projects with location + narrative ("Steel-Framed Covered Privacy Courtyard - Corvallis") |
| ProjectGallery | editorial | HPP | 02: project narrative as proof of craft |
| ProjectGallery | carousel | HPP/Coppersmith | 09 must-win 1: xs-first browse without scroll fatigue |
| BusinessStory | founder-led | HPP | 02: "Built by one family. Trusted by many more." with portraits and named roles |
| BusinessStory | team-grid | Coppersmith | 03-enabling: larger crew archetype; named people with roles (missing business archetype: multi-crew shops) |
| ServiceArea | area-list | HPP | 02: counties everywhere; localism is the trust signal |
| ServiceArea | hub-address | Coppersmith | 03: 630 Maldonado St + Western Colorado as the place anchor |
| ContactCTA | conversion-dual | HPP | 02: "Tell us what you're planning." + dual buttons + full contact block |
| ContactCTA | conversion-dual (phone-forward) | Coppersmith | 03: phone repeated hero/banner/footer; Schedule Installation with honest disclaimer |
| ContactCTA | value-capture | HPP | 02: newsletter as value-first capture ("Stay Ahead of Home Maintenance") |
| Footer | credibility | BOTH | 02: full contact footer; 03: Services links + Quick Links (Financing, Rebates, Privacy Policy) |
| Footer | credibility-plus-capture | HPP | 02: newsletter capture folded into the close |
| AskFYD-entry | floating-entry | BOTH | 09 must-wins 9-11: the FYD-specific reason an owner would choose this; replaces the deleted evidence panel (08 #14) |
| AskFYD-entry | inline-section | BOTH | 09: concierge at proof moments; enables the always-on front-desk archetype neither original has |

## Lock note

This registry is V1 and closed for implementation. Adding a component or variant means writing its
job, its evidence-based selection rule, its composition rules, and its brutal-gate justification
here first. A component that cannot name the HPP or Coppersmith lesson it improves does not enter
the registry.
