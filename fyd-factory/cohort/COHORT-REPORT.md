# NIGHT-COHORT: Acquisition Report

Date: 2026-09-24 (UTC). Controller: night_cohort.
Pipeline: Pig branch `fyd-factory` at `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`.
Working tree was dirty (103 entries); all files the runner imports were verified clean before the run.

Question under test: can one general machine turn ten messy real digital
presences into trustworthy structured experiences with zero customer-specific
code?

Short answer: the machine runs end to end and never crashes, but on real sites
it is a head-metadata harvester. Everything it knows comes from JSON-LD,
OpenGraph, and meta tags. Body HTML contributes zero facts on 7 of 7 content
sites. The only body-text extraction is two customer-specific regex patterns
that matched nothing.

## Constraints honored

- Public pages only. robots.txt requested first on every host; pantuso and
  klik-boutique were not fetched because robots.txt returned 200 with
  `Disallow: /`.
- Sequential requests, 2s pacing, max 9 pages per site (well under the 15 cap).
- No login, no CAPTCHA bypass, no private endpoints, no contact/forms/outreach.
- No media downloaded. Media URLs were recorded with page provenance only
  (10 to 20 per site, capped at 20). No media files exist in the raw corpus.
- Nothing here is presented as any owner's real FYD. All outputs are local
  fixture JSON under `~/workspace/fyd-factory/cohort/acquisitions/`.
- No Pig repo files were modified. The runner and a CSS/stub loader lived
  outside the repo at `/home/nolan/`.

## Cohort composition (as fetched)

| ID | Category | Business | Confirmed platform | Fetch result |
|---|---|---|---|---|
| pride-plumbing | home service | Pride Plumbing Heating & Cooling | unknown (bot-walled) | FAIL: 403 on robots.txt and homepage, curl UA and browser UA |
| pantuso | restaurant | Ristorante Pantuso | unknown | BLOCKED: robots.txt `Disallow: /`, correctly not fetched |
| hand-law | professional service | Hand Law, P.C. | custom HTML (no WP markers, JSON-LD x2) | OK: 6 pages |
| klik-boutique | retail | Klik Boutique | unknown | BLOCKED: robots.txt `Disallow: /`, correctly not fetched |
| claire-codling | creator/person | Claire Codling Photography | WordPress (Site Kit, wp-content x76) | OK: 7 pages |
| dalby-cpa | multi-location | Dalby, Wendland & Co. / DWC CPAs and Advisors | WordPress (Slider Revolution generator meta) | OK: 1 page (subpage URLs 404) |
| bemis-electric | home service | Bemis Electric | WordPress (Site Kit, wp-content x43) | OK: 5 pages |
| suehiro | restaurant | Suehiro Japanese Restaurant | WordPress + Elementor 4.2.4 | OK: 1 page (no internal links found) |
| gear-junction | retail | The Gear Junction | Shopify (cdn.shop, shopify x134) | OK: 5 pages |
| white-star | legacy/builder | White Star Electric | GoDaddy Website Builder 8.0 (generator meta) | OK: 1 page (subpage URLs were image URLs, 404) |

Composition caveat: the cohort is WordPress-heavy (4 of 7 content sites).
Pre-fetch platform guesses were wrong on claire-codling (guessed Squarespace)
and suehiro (guessed Wix). No Wix, Squarespace, Webflow, or JS-SPA site
materialized. The planned diversity slots did not all fill; the numbers below
are reported against the 10 sites as fetched, not as planned.

Measurement caveat: the runner's platform signal detector fired
`wordpress+squarespace+shopify` on dalby-cpa. The squarespace/shopify hits are
FontAwesome icon CSS classes (`fa-shopify`, `fa-squarespace`) in a stylesheet,
a substring-detector artifact. Confirmed platform is WordPress via generator
meta.

## Per-site outcomes

failure_stage is the first pipeline stage that failed: fetch, extraction,
generation, validation, or render. "none" means the full pipeline completed.

| Site | failure_stage | Pages (ok/total) | Facts | Fact sources | Objects | Rels | Dropped rels | Unsupported | Media URLs | Renderable |
|---|---|---|---|---|---|---|---|---|---|---|
| pride-plumbing | fetch | 0/2 | - | - | - | - | - | - | - | - |
| pantuso | fetch | 0/0 | - | - | - | - | - | - | - | - |
| hand-law | none | 6/6 | 49 | html-meta 18, opengraph 24, json-ld 7 | 2 | 1 | 10 | 5 | 20 | yes |
| klik-boutique | fetch | 0/0 | - | - | - | - | - | - | - | - |
| claire-codling | none | 7/8 | 197 | json-ld 99, opengraph 84, html-meta 14 | 3 | 2 | 63 | 50 | 20 | yes |
| dalby-cpa | none | 1/6 | 17 | json-ld 9, opengraph 6, html-meta 2 | 1 | 0 | 4 | 8 | 20 | yes |
| bemis-electric | none | 5/6 | 156 | json-ld 111, opengraph 35, html-meta 10 | 6 | 0 | 60 | 89 | 10 | yes |
| suehiro | none | 1/1 | 25 | json-ld 16, opengraph 7, html-meta 2 | 1 | 0 | 10 | 15 | 4 | yes |
| gear-junction | none | 5/5 | 136 | json-ld 82, opengraph 45, html-meta 9 | 4 | 4 | 11 | 16 | 20 | yes |
| white-star | none | 1/9 | 8 | opengraph 7, html-meta 1, json-ld 0 | 1 | 0 | 0 | 0 | 2 | yes |

Notes:
- All facts on all 7 sites are DIRECT_FACT, deterministic, 0 AI calls.
  INFERENCE and GENERATED_COPY counts are 0 everywhere.
- Validation: 0 errors, 0 warnings on all 7 sites; isRenderable true on all 7.
- Evidence coverage: 1.0 (every fact carries page/byte/selector evidence).
- Per-stage timings all rounded to 0.00s (sub-10ms deterministic pipeline).
- Render model sections are uniform: Hero, BusinessSummary, Contact, Links,
  CTA, AskFYD on every site, plus ObjectFeed (2 sites) and Locations (3 sites
  with location objects). The template always renders; content depth varies
  from 8 to 197 facts.

## Failure taxonomy (with exact evidence)

Frequencies are out of 10 cohort sites. "Content sites" means the 7 that
yielded pages.

### F1. Fetch-stage attrition: 3/10 sites yield nothing
- pride-plumbing: 403 on robots.txt and homepage with curl UA; retry with a
  conventional browser UA still 403 on robots.txt and homepage (5486-byte
  block page). Bot protection, not a transient error.
- pantuso: robots.txt 200, `Disallow: /`. klik-boutique: robots.txt 200,
  `Disallow: /`. Both correctly treated as blocked; no pages fetched.
- Nearly a third of the cohort never reaches the pipeline.

### F2. Zero body-text facts on 7/7 content sites
- facts_by_source across all 7 sites contains only `json-ld`, `opengraph`,
  `html-meta`. The `html` source type (body extraction) count is 0 everywhere.
- The only body-HTML extraction in the pipeline is the service-card lane
  (`service-cards@2026-09-22`) with two regex detectors:
  `elementor-cta-services` (an `<a class="elementor-cta">` whose href contains
  `/services/`) and `estimate-service-card` (`<a href="...?service=<slug>...">`
  with an h3). Both are patterns lifted from golden customer sites.
- Result: 0 service objects on all 7 sites, including suehiro (WordPress +
  Elementor, a restaurant) and bemis-electric (electrician with service
  pages). The customer-specific patterns do not generalize.
- Consequence: services, menus, hours, bios, reviews, product catalogs,
  everything that lives in body HTML, is invisible. Gear-junction is a Shopify
  store with 0 product objects.

### F3. unmapped-property: 6/7 content sites, 169 instances
JSON-LD literal properties with no entry in the pipeline's LITERAL_FACTS map
(`structured-data.ts`). Exact property counts per site (from a re-run dump on
the Pig):
- bemis-electric: inLanguage 17, position 11, target 5, urlTemplate 5,
  valueName 5, valueRequired 5, height 7, width 7, item 6, thumbnailUrl 2,
  ratingValue 2, bestRating 1, worstRating 1, ratingCount 1, itemReviewed 1,
  additionalType 1, address 1, image 1
- claire-codling: inLanguage 19, position 12, height 9, width 9
- dalby-cpa: inLanguage 2, valueName 1, valueRequired 1, position 1,
  urlTemplate 1, target 1
- gear-junction: logo 10, image 5
- hand-law: text 5
- suehiro: inLanguage 4, height 2, width 2, valueName 1, valueRequired 1,
  position 1, urlTemplate 1, target 1, thumbnailUrl 1
- white-star: none
Three strata: (a) SEO scaffolding that is correctly ignorable (inLanguage,
position, item, SearchAction internals target/urlTemplate/valueName/
valueRequired); (b) media dimensions (height, width, thumbnailUrl); (c)
genuinely meaningful business data dropped: logo (10x gear-junction), image,
address (bemis-electric), aggregateRating fields (ratingValue, ratingCount,
bestRating, worstRating, itemReviewed), additionalType, text (hand-law x5).

### F4. Dropped @id relationships: 6/7 content sites, 158 total
Counts: bemis-electric 60, claire-codling 63, gear-junction 11, hand-law 10,
suehiro 10, dalby-cpa 4, white-star 0.
Mechanism (`proceduralizer.ts` 1043-1076): a structured @id-reference
relationship is emitted only if both endpoints resolve through the
entity-to-object map; unmapped endpoints (site-chrome nodes are skipped
first) and self-loops are dropped and counted. Dense Yoast/RankMath-style
JSON-LD graphs (WebSite, WebPage, BreadcrumbList, SearchAction nodes) produce
dozens of references whose endpoints never become objects.
Observability gap: the pipeline keeps a count (`droppedRelationships:
number`) but not the kinds, predicates, or reasons. The surviving graphs are
thin: only 7 relationships total across 7 sites (located_at x3, links_to x3,
1 more).

### F5. Review authors minted as orphan people: 1/10 (bemis-electric)
5 `ping.social.person@1` objects: "Benjamin Benedict", "Christine Jackson",
"Michael Yeager", "Christina Bybee", "Helen Gallegos", each with exactly 2
fields (`name`, `claimKind: website_statement`) and 0 relationships. These are
review-author names from AggregateRating/Review JSON-LD nodes. The ratings
themselves were dropped as unmapped properties (F3); no review objects were
created; nothing links these "people" to the business. Bizarre 1/10: logged,
not architected around.

### F6. SEO title becomes the business name: 2/10
- dalby-cpa business title: "CPAs, Accounting, Tax, Audit, Advisory - DWC CPAs
  and Advisors" (the `<title>` tag). The trade name "Dalby, Wendland & Co."
  appears nowhere; website field is `https://dwcadvisors.com/` (a rebrand
  domain), confirming the name signal is SEO copy, not identity.
- hand-law business title: "DUI Lawyer in Grand Junction, CO" (the `<title>`
  tag), not "Hand Law, P.C.".
Below the 4/10 bar: logged, not architected around.

### F7. Multi-location collapse with no ledger: 1/10 (dalby-cpa)
A multi-location CPA firm produced 1 object and 0 location objects from its
homepage. Locations collapsed silently; there is no dropped-entity ledger
(LANE-ACQ gap #2, still open). Below the 4/10 bar: logged.

### F8. Silent conflict resolution: 1/10 (claire-codling)
Entity `https://clairecodlingphotography.com/#website`, field `title`, two
distinct values: "Claire Codling" vs "Claire Codling Photography". Source
priority (json-ld > opengraph > html-meta) picked one silently; the conflict
is recorded in the report but not surfaced to any owner loop (LANE-ACQ gap
#6, still open). Below the 4/10 bar: logged.

### F9. Fact yield tracks head-metadata density, not page size: 3/7 thin sites
- dalby-cpa: 1,679,096-byte homepage yields 17 facts, 1 object.
- white-star: 150,854-byte GoDaddy builder page yields 8 facts, 1 object,
  0 JSON-LD facts.
- suehiro: 96,198-byte Elementor page yields 25 facts, 1 object.
A 1.6MB page and a 150KB page both produce a business card with a name,
a description, and almost nothing else.

### F10. site-chrome-node: 5/7 sites, 9 instances (not a failure)
Deliberately skipped node types (WebPage, BreadcrumbList, etc.), correctly
handled. It inflates the "unsupported" metric without representing lost
business data.

## Candidate generic primitives (seen on at least 4 of 10)

1. **Body-text extraction primitive (7/10).** Zero body-text facts on every
   content site. The 80% stack needs a generic body extractor (headings,
   lists, tables, contact blocks, hours, nav structure to candidate facts with
   byte-level evidence), replacing the two customer-specific regexes that
   matched nothing.
2. **Tiered schema.org property handling (6/10).** 169 unmapped-property
   instances on 6 sites. Needs three tiers: (a) an ignorable-SEO-scaffolding
   allowlist (inLanguage, position, item, SearchAction internals) so the
   unsupported metric stops crying wolf; (b) a grown business-property map
   (logo, image, address variants, aggregateRating, openingHours,
   servesCuisine, priceRange, text); (c) typed leftover preservation for the
   rest instead of silent drops.
3. **Dropped-relationship/entity ledger (6/10).** 158 dropped @id
   relationships on 6 sites, recorded only as a count. The ledger must record
   kind, predicate, endpoint keys, and reason, so "locations collapsed" (F7)
   becomes diagnosable instead of silent.
4. **Service/offering/product extraction (7/10).** Zero service, product, or
   menu objects on any site, across home-service, restaurant, and retail
   categories. The current lane is two golden-site regexes; the generic
   primitive must work across builders (WordPress, Elementor, Shopify,
   GoDaddy) without per-customer patterns.

## What the 80% acquisition stack needs (explicit)

1. A generic body-text fact extractor with evidence (primitive 1). Without
   it, the factory only works on sites with rich JSON-LD, which is the
   minority of real small-business web (white-star: 0 JSON-LD facts).
2. The tiered property map (primitive 2), so real data (logo, address,
   ratings, hours) survives and SEO noise is explicitly ignored.
3. The dropped-entity/relationship ledger (primitive 3), so silent collapse
   is visible and debuggable.
4. A builder-agnostic offerings extractor (primitive 4): services, products,
   menus.
5. A fetch resilience policy decision. 3/10 sites are unreachable to a polite
   static fetcher (bot-wall 403, 2x robots Disallow). The stack needs a stated
   position: render service, declared degradation, or accepted loss. This is
   a product decision, not just engineering.
6. Name resolution that prefers declared identity (JSON-LD `name`,
   `og:site_name`) over the `<title>` SEO string (F6).

## Top three failure modes

1. **The extractor is a head-metadata harvester.** 7/7 content sites: every
   fact from JSON-LD/OpenGraph/meta; zero from body HTML. All downstream
   value (objects, relationships, render model) is capped by head-metadata
   density. Real business content is invisible to it.
2. **Schema.org mapping is lossy at both ends.** 169 unmapped literal
   properties (6/7 sites) plus 158 dropped @id relationships (6/7 sites)
   against only 7 surviving relationships. Dense real-world JSON-LD mostly
   becomes "unsupported" or dropped edges; the surviving graph is a thin
   business card plus occasional location.
3. **Fetch attrition before the pipeline starts.** 3/10 sites yield zero
   pages: one bot-wall 403 persistent across user agents, two robots.txt
   `Disallow: /` (correctly honored). A polite static fetcher loses nearly a
   third of real small-business sites.

## Reproducibility

- Runner: `~/workspace/fyd-factory/cohort/run/cohort-run.mts` (executed on
  the Pig via `run-cohort-pig.sh`; never committed; repo untouched).
- Fixtures: `~/workspace/fyd-factory/cohort/acquisitions/<site-id>.json`
  (10 files, one per site).
- Raw corpus: `~/workspace/fyd-factory/cohort/raw/<site-id>/`
  (manifest.jsonl + page HTML + robots.txt; no media files).
- Fetch log: `~/workspace/fyd-factory/cohort/fetch/fetch.log` and
  `round2-retry.log`.
- Render-model check ran the real `buildSemanticRenderModel` (its
  `renderer.tsx` import chain pulls `.css`; a loader outside the repo stubbed
  asset imports as empty modules for the headless run).
- Deterministic only: 0 AI calls, 0 INFERENCE/GENERATED_COPY facts.

## Open questions for the parent lane

- Should pantuso/klik-boutique (robots-blocked) stay permanently out of
  future cohort rounds, or is there an approved alternative source?
- Is a render-service/Javascript fetch for bot-walled and JS-heavy sites in
  scope for the 80% stack, or is fetch loss accepted?
- The F5 lane owns primitives now; this report proposes no code changes per
  the no-expansion rule.
