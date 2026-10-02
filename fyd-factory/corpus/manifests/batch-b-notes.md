# batch-b notes: non-trade generalization set (F2-CORPUS-B, resumed)

All fixtures are DEMO_SYNTHETIC. Every business, person, address, phone, and
URL is fictional. No real business identity. No invented credentials.
Demo fixtures stay private/local; no external contact.

## Phone registry (corpus-wide, verified against existing fixtures)

Existing corpus numbers, all reserved and never reused:
- (970) 555-0121 Alder Creek Landscaping (trades)
- (970) 555-0124 Mesa Shield Pest (trades)
- (970) 555-0129 Cottonwood Ridge Contracting (trades)
- (970) 555-0134 Clearwater Cleaning (trades)
- (970) 555-0142 clearwater-plumbing-demo (legacy fixture)
- 970-555-0101..0104, 970-555-0190 batch-a fixtures (different format block)

New numbers assigned by this batch, all in the validator's (970) 555-0xxx
0120-0139 block, none colliding with the above:
- (970) 555-0120 Copper Kettle Cafe
- (970) 555-0125 Mesa Iron Hardware
- (970) 555-0126 Canyon View Dental
- (970) 555-0133 Willow Creek Inn
- (970) 555-0131 appears ONLY as the rival claim inside Canyon View Dental's
  conflicting health-directory listing. It is a conflict artifact, not an
  assigned business number. Future fixtures must avoid it anyway.

## Preserved conflicts (never smoothed)

- Cafe: website hours Mo-Fr 06:30-14:00 vs directory listing 07:00-15:00.
  Both claims live on separate objects (business vs external_identity);
  business.conflicts names the disagreement explicitly.
- Retail: cast iron skillet $42 on website vs $46 on marketplace listing.
- Dental: website phone (970) 555-0126 vs health directory (970) 555-0131.
- Inn: check-in 15:00 (booking platform) vs 16:00 (travel directory), and
  winter closure Jan 5 to Feb 20 vs Jan 10 to Feb 15. Both disagreements kept.

## Variation thesis: how each graph should drive DIFFERENT site composition

These four graphs share the same schema vocabulary on purpose. The GENERALIZE
step must read the semantics, not the schema names, and compose a different
site for each. What each vertical stresses:

### 1. f2b-copper-kettle-cafe (restaurant/cafe)
The graph is MENU-CENTRIC: 8 service objects with category "menu", prices, and
dietary tags. Composition implication: the site needs a menu page/section as a
first-class surface, not a services list. Posts act as a specials/announcement
feed (time-sensitive, media-heavy: every post carries media_url). Articles
split into brand story vs practical guide (allergen guide), so article
templates must handle both narrative and reference content. People are
role-specialized (owner, head barista, pastry chef), suggesting a team section
keyed on craft roles. The hours conflict means hours display must cite its
source or flag uncertainty rather than render one clean value.

### 2. f2b-mesa-iron-hardware (retail)
The graph is CATALOG-CENTRIC: 6 product objects with price, department, and
availability="in-store". Composition implication: the site needs a product
catalog with department grouping, not a service menu; availability fields
imply an inventory-flavored treatment. Posts are event/clinic announcements
with media, and the single article is a BUYING GUIDE, an advice-led content
type distinct from the cafe's story article. Only 2 people (owner, floor
manager), so no team page is warranted; a small owner note suffices. The price
conflict means prices near the conflicted product must not be presented as
single-source facts.

### 3. f2b-canyon-view-dental (professional service, NOT a consultancy)
The graph is PEOPLE-CENTRIC: 4 credentialed people (owner dentist, associate
dentist, lead hygienist, office manager) against 6 care services. Composition
implication: the team/provider section is the trust surface and should lead;
services read as a care menu grouped by category (preventive, restorative,
orthodontic, urgent). Fields like insurance_accepted and new_patients imply
practical intake content (insurance, first-visit info) that trades fixtures
never needed. Articles are patient-education pieces, a third article role
distinct from story and buying guide. The phone conflict means the primary
contact number must be presented with its source or the conflict flagged;
never silently pick one.

### 4. f2b-willow-creek-inn (hospitality)
The graph is INVENTORY-PLUS-SEASONALITY: 4 room objects with sleeps and
per-night prices, availability="seasonal", plus explicit check_in/check_out
fields on the business. Composition implication: rooms are bookable inventory,
so the site needs room detail treatment (capacity, price, photos) and a
booking-adjacent CTA, unlike the quote/estimate CTA of trades. Posts carry
REVIEW EVIDENCE (a 5-star guest review as a post object) and a seasonal
closure notice, so the site needs a reviews/testimonial surface and a
seasonality banner concept. Articles are local area guides, a fourth article
role (place-based content that positions the inn as a local authority). Two
innkeepers with hospitality roles imply a hosts section, not a crew section.
The double conflict (check-in time, closure dates) means policy-type fields
(check-in, closures) must be source-attributed.

## Cross-vertical contrasts the GENERALIZE step must honor

- service objects wear four different semantic hats: menu item, product, care
  service, room. A site generator that renders all four as a "services list"
  has failed the generalization test.
- article objects wear four roles: brand story, buying guide, patient
  education, local guide. One article template should not flatten these.
- post objects wear three roles: announcement feed, event promo, review
  evidence. Reviews-as-posts need a distinct presentation from promos.
- people graphs range from 2 to 4 with different trust functions: craft team,
  small owner note, credentialed providers, hosts.
- media needs differ: food and specials photography (cafe), product and
  storefront shots (retail), team headshots plus educational imagery
  (dental), room and property photography (inn). Every post carries a
  synthetic media_url under media.example.com to exercise media binding.
- conflicts appear in four flavors (hours, price, phone, policy/seasonal),
  exercising source-attributed rendering rather than single-value display.

## Validator repairs made by this resumed batch

validate-batch-b.py was failing on every fixture before this work:

1. Phone regex captured only 2 digits after "01", so every existing
   (970) 555-01xx number failed the documented 0120-0139 range. Fixed to
   capture 3 digits: (970) 555-0(\d{3}).
2. Scope narrowed to batch-b envelope fixtures only
   (fixtures/batch-b-*.json and fixtures/batch-b/*.json). Legacy flat
   fixtures like clearwater-plumbing-demo.json use an older envelope and are
   out of scope for this batch validator.
3. Phone uniqueness now enforced on the business object's canonical phone;
   external listings legitimately repeat it, and conflict fixtures may carry
   rival phone claims (dental: 0131).

Result: VALIDATION PASSED, 8 fixtures, 8 unique business phones, manifest
digests agree.
