# Lane B: Controlled Corpus Loss Map

**FYD Harvest Audit, Lane B. Measured 2026-09-23 UTC.**
**Repository:** `/home/nolan/projects/ping`, branch `fyd/builder-composition` (read-only; inspected via Pig bridge, no edits).
**Question:** Can FYD get most websites without crossing Level 4?

## Level scheme (task levels, used throughout)

- L0 cached/prior observation
- L1 plain HTTP
- L2 structured endpoints (sitemap, RSS/Atom, platform JSON APIs)
- L3 deterministic HTML parsing
- L4 browser rendering
- L5 browser interaction
- L6 agent discovers extraction procedure
- L7 procedure compiled into reusable deterministic recipe

Note: the repository's own docs use an older L0-L4 numbering (their L1 = static HTTP, their L2 = browser render, their L3 = discovery, their L4 = AI extraction). Every level below is the task's scheme unless marked otherwise.

## What "current FYD" means here

The current pipeline as it exists on `fyd/builder-composition`, measured by running it (in Pig scratch, repo untouched) against real fetched bytes from 13 sites:

- `discover()` seeds only `/sitemap.xml`, `/feed`, `/atom.xml`, `/`. No robots-declared sitemaps, no sitemap-index traversal, no `<link>` alternate feeds, no platform endpoints, no multi-page following.
- `acquire()` returns `ok:false, status:0` on any exception (typed fetch causes lost).
- `parse()` extracts: JSON-LD blocks, OpenGraph tags, meta description/keywords, `<title>`, and two hardcoded service-card class names (`elementor-cta-services`, `estimate-service-card`). It does not extract visible body text, headings, links, canonical URL, image alt, phone numbers, emails, microdata, or generic service sections.
- `feed-parser.ts` handles RSS/Atom (channel + items).
- `structured-data.ts` handles JSON-LD `@graph` with offline contexts, deterministic blank-node identity, business/location/person/service/product projection, typed relationships, and explicit unsupported-evidence reporting.
- Sitemaps are fetched but produce zero facts (a source comment calls sitemap fetching "pure cost until a sitemap handler exists").
- Street-address facts are marked private and withheld from public projection (verified working: 2 sites).

## Corpus

One real public site per category. Fetching was respectful: UA `FYD-Harvest-Audit/1.0 (research audit; PING Social)`, ~1s pacing, small request counts, robots.txt checked before non-homepage fetches, no bypass of any access control. Three candidate caveats are flagged with (*) and carried through the analysis honestly.

| # | Category | Site | Homepage | Notes |
|---|---|---|---|---|
| 1 | WordPress + Yoast | yoast.com | 200, 223 KB | sitemap_index.xml 200 (21 submaps); /feed 200, 412 KB, 20 items |
| 2 | WordPress + Rank Math | rankmath.com | 200, 218 KB | sitemap_index.xml 200; /feed 200, 5.8 KB, 5 items |
| 3 | Squarespace (*) | sightunseen.com | 200, 56 KB | Platform markers are WordPress, not Squarespace; no confirmed Squarespace candidate found. Carried as "thin-metadata publication" |
| 4 | Wix (*) | themesrush.wixsite.com/plumber | 200, 2.53 MB | Confirmed Wix, but a public template, not an operating business |
| 5 | Webflow | memberstack.com | 200, 178 KB | Webflow markers confirmed; sitemap.xml 200, 285 KB, 2230 URLs |
| 6 | Shopify | allbirds.com | 200, 665 KB | /products.json 200, 202 KB; sitemap index 200 (6) |
| 7 | Plain static HTML (*) | craigslist.org | 200, 61 KB | Fetchable and simple, but an odd "static site" example; geo-redirects to /area/westslope |
| 8 | React/Next SPA | vercel.com | 200, 628 KB | SSR; crawled-sitemap.xml 200, 1.02 MB, 7229 URLs; /atom.xml returns HTML, not a feed |
| 9 | JS-heavy content-after-JS | notion.so | 200, 241 KB | Only ~2.5K visible chars in static HTML; body content client-rendered |
| 10 | Multi-location | aireserv.com | 200, 1.08 MB | /locations 200, 411 KB; sitemap.xml 200, 2.59 MB, 7908 URLs; /feed returns blog HTML |
| 11 | Person/portfolio | karpathy.ai | 200, 34 KB | No JSON-LD, no OG, no meta description |
| 12 | GitHub-backed project | react.dev | 200, 272 KB | No JSON-LD; GitHub repo linked in site chrome |
| 13 | Poorly structured legacy | lingscars.com | 200, 160 KB | JSON-LD Organization present; second block malformed |

robots.txt spot checks (all fetched with redirects followed): yoast, rankmath, memberstack, allbirds, vercel, notion, aireserv, karpathy, react, lingscars all returned 200 with sitemap declarations where present; craigslist.org returned 200 (homepage allowed; /reply and similar disallowed and never fetched); no site returned a block for the fetched paths.

## Full corpus loss table

Columns: RAW = raw signals in fetched bytes. FYD = what the current pipeline discovered from the same bytes. FACTS/OBJ/REL = measured pipeline output (facts discovered, objects generated, relationships generated). UNUSED = high-value evidence present in bytes but untouched by the pipeline. LOSS = loss classes (defined below). LEVEL = cheapest task-level that yields a trustworthy Business+Services+Contact+Location object set.

### 1. WordPress + Yoast, yoast.com, LEVEL 3

- RAW: 1 JSON-LD `@graph` (11 nodes: Organization+Brand with name, URL, logo, sameAs x10, numberOfEmployees, founder, foundingDate, slogan; WebSite; WebPage; BreadcrumbList), OG x10, meta description, canonical, sitemap index (21 submaps), RSS feed (20 items).
- FYD: 42 facts, 13 objects (business + 11 external_identity + person founder), 12 relationships (sameAs links_to, founder works_for). 17 unsupported evidence items.
- UNUSED: 20 feed items (parseable at L2, never projected to objects), 21 sitemap submaps (URL inventory, never traversed), numberOfEmployees and other unmapped props, article headings.
- LOSS: PARSING (sitemap/feed inventory fetched but unparsed), SCHEMA (16 unmapped properties), DISCOVERY (seed page only; blog never followed).
- Why L3: Business rich (name, description, slogan, founded, 10 social identities, founder person), Contact via socials (no phone published on homepage), Services n/a (product company; products live on /products pages), Location n/a. All static. Nothing needs rendering.

### 2. WordPress + Rank Math, rankmath.com, LEVEL 3

- RAW: JSON-LD Organization (name, URL, sameAs, email, logo), OG x13, meta description, canonical, 5 itemscope microdata blocks, sitemap index, RSS feed (5 items).
- FYD: 29 facts, 3 objects (business + 2 external_identity), 2 relationships. Email captured via JSON-LD. 9 unsupported items.
- UNUSED: 5 microdata blocks (parser ignores itemscope), 5 feed items, sitemap inventory.
- LOSS: PARSING (microdata ignored; sitemap/feed inventory), SCHEMA (8 unmapped properties), DISCOVERY (seed page only).
- Why L3: Business + Contact (email) fully static. Location/Services n/a.

### 3. Squarespace (*), sightunseen.com, LEVEL 3

- RAW: thin JSON-LD (CollectionPage/WebSite/BreadcrumbList, no Organization), OG x5, canonical, no meta description, 13 h1 article headlines, 105 links, 5185 visible chars.
- FYD: 12 facts, 1 object (business with title/website only). Weakest business object in corpus.
- UNUSED: article headlines (h1 x13), article links, Squarespace `?format=rss` collection feeds (discover() only tries /feed and /atom.xml, which 404 on Squarespace conventions).
- LOSS: DISCOVERY (Squarespace feed conventions absent from discover list; seed page only), PARSING (headings/links unextracted), SCHEMA (no Organization emitted by platform; identity falls back to OG).
- Why L3: publication site; Business stub + article inventory are all static. No contact/location/services published to find.

### 4. Wix (*), plumber template, LEVEL 3

- RAW: 2.53 MB HTML, 0 JSON-LD, OG x4, canonical, Wix generator marker, h2 x22 (service names: "Plumbing Services", "Waterline repairs", "Standard Repair Plan", "Emergency Response Plan"), phone placeholder x2 ("012 345 6780"), 52 links, 45 images (41 with alt). The 25 email-like strings are Sentry telemetry noise, not contacts.
- FYD: 5 facts, 1 object (business: title "HOME | Plumber", site_name). Worst bytes-to-facts ratio in corpus: 2.53 MB in, 5 facts out.
- UNUSED: all 22 service headings, phone, links, image alts, all 6250 visible chars.
- LOSS: PARSING (total: no heading/text/link/phone extraction; Wix SSRs everything, so this is pure extraction gap, not rendering), SCHEMA (no JSON-LD emitted; identity from OG only). Extraction-precision note: naive email regex false-positives on Sentry addresses; naive phone regex needs tel:/context gating.
- Why L3: every needed signal is in static HTML. The gap is extraction recipes (task L7), not acquisition level.

### 5. Webflow, memberstack.com, LEVEL 3

- RAW: 2 JSON-LD blocks (Organization with contactPoint email; SoftwareApplication with offers and featureList; FAQPage; WebSite), OG x5, sitemap.xml (2230 URLs), h3 x15.
- FYD: 25 facts, 4 objects (business + 3 external_identity), 3 relationships. 14 unsupported items.
- UNUSED: SoftwareApplication offers/featureList (zero service/product objects generated), FAQ content, 2230-URL sitemap inventory.
- LOSS: SCHEMA (SoftwareApplication, FAQPage, AggregateOffer, Question/Answer unmapped: 14 unmapped properties), PARSING (sitemap inventory), DISCOVERY (seed page only).
- Why L3: Business + Contact (email via contactPoint) static. Services need a SoftwareApplication-to-service mapping or heading recipe, both deterministic at L3.

### 6. Shopify, allbirds.com, LEVEL 3

- RAW: 0 JSON-LD on homepage, OG x9, /products.json (202 KB: full product records with title, body_html, images, variants, prices, product_type, tags, vendor), sitemap index (6), 97K visible chars, h2 x40, one real phone (+1 424 363-8064) buried among numeric false positives (10-digit timestamps/IDs).
- FYD: 11 facts, 1 object (business from OG/meta).
- UNUSED: products.json entirely (no JSON-endpoint parser), h2s, links, phone.
- LOSS: DISCOVERY (platform-canonical /products.json not in discover list), PARSING (no generic JSON record parser; headings/links/phone unextracted), NORMALIZATION (phone-regex precision: 24 of 25 matches are non-phone numbers; extraction needs tel:/"call" context gating).
- Why L3: products via L2 /products.json, business/contact via L3 HTML parsing. Max needed is L3.

### 7. Plain static HTML (*), craigslist.org, LEVEL 3

- RAW: JSON-LD WebSite+SearchAction (site chrome only), OG x4, 455 links (city subdomains: the actual site structure), 1 table, no images, geo-redirect to /area/westslope.
- FYD: 8 facts, 1 object (business from OG/meta), 1 unsupported item.
- UNUSED: 455 links (cities, categories: the entire information architecture), table content.
- LOSS: PARSING (no link-inventory extraction at all; the pipeline's own AcquiredObservation design specifies links, but parse() never extracts `<a>`), RELATIONSHIP (no city/category edges), PROVENANCE (final URL after geo-redirect not recorded in AcquiredSource), DISCOVERY (link-driven structure never followed).
- Why L3: fully static; the set is business + link-derived structure, all deterministic.

### 8. React/Next SPA, vercel.com, LEVEL 3

- RAW: 3 JSON-LD blocks (Organization with contactPoint, sameAs, founder; Service with areaServed and provider; SoftwareApplication; Person; PostalAddress), OG x7, sitemap (7229 URLs), /atom.xml returns HTML (not a feed).
- FYD: 33 facts, 5 objects (business + location + person + service + external_identity), 3 relationships (located_at, offers, links_to). Best full-set yield in corpus: Business, Location (coarse; street withheld as private), Service, Contact (socials). 8 unsupported items.
- UNUSED: 7229-URL sitemap inventory.
- LOSS: PARSING (sitemap inventory only), SCHEMA (8 unmapped properties, minor), FETCH (feed endpoint returns HTML; needs content-type check before feed parsing).
- Why L3: the exemplar that L3 fully works. No browser needed despite being a "modern SPA": the SSR HTML carries everything.

### 9. JS-heavy content-after-JS, notion.so, LEVEL 4

- RAW: 0 JSON-LD, OG x7, ~2561 visible chars (nav + hero: product names "Notion AI", "AI Meeting Notes", "Enterprise Search", "Notion Calendar"; feature labels), 106 links, body content (testimonials, feature detail, pricing) client-rendered.
- FYD: 9 facts, 1 object (business from OG/meta).
- UNUSED: nav product taxonomy (106 links: service-name inventory), all JS-rendered content.
- LOSS: RENDERING (the one category where core content is absent from static HTML), PARSING (nav links unextracted even statically).
- Why L4: L3 yields Business + service-name stubs from nav (needs link extraction); trustworthy service descriptions, pricing, and contact paths require rendering. This is the only category in the corpus that crosses L3.

### 10. Multi-location, aireserv.com, LEVEL 3

- RAW: 0 JSON-LD on homepage, OG x6, phone (855) 679-0011 in static HTML, h3 x75 (service names: "Emergency HVAC Services", "Air Conditioner Repair", "Mini-Split Installation and Replacement", ...), /locations page (411 KB, 1 JSON-LD block, 12+ state/city links, 248 location-specific phones), sitemap.xml (7908 URLs), /feed returns blog HTML.
- FYD (homepage): 8 facts, 1 object (business). Phone, services, locations all missed.
- UNUSED: phone, 75 service headings, the entire /locations subtree (state and city pages), sitemap inventory, 248 location phones.
- LOSS: DISCOVERY (no multi-page or sitemap-driven discovery: the largest structural gap in the corpus; this is the repo's unimplemented L3), PARSING (phone/heading extraction), FETCH (/feed returns HTML; content-type check needed).
- Why L3: sitemap (L2) as location inventory + plain fetches (L1) + deterministic parsing (L3) of location pages covers Business + Services + Contact + Locations. No rendering needed.

### 11. Person/portfolio, karpathy.ai, LEVEL 3

- RAW: 34 KB HTML, 0 JSON-LD, 0 OG, no meta description, no canonical, 1 h1 + 1 h2, 11038 visible chars (bio text), 140 links (14 external: twitter, github, youtube, blog, karpathy.github.io), 50 images (0 alt).
- FYD: 1 fact, 1 object (business titled "Andrej Karpathy": title only).
- UNUSED: everything except `<title>`: bio text, 14 external identity links, project links.
- LOSS: PARSING (total: no text/link/heading extraction), ENTITY-RESOLUTION (a person projected as ping.social.business@1; no signal distinguishes person from business without JSON-LD or typing heuristics), RELATIONSHIP (no external-identity edges).
- Why L3: all signals static. Needs link/social extraction recipes and person-vs-business typing (task L7), not higher acquisition.

### 12. GitHub-backed project, react.dev, LEVEL 3

- RAW: 0 JSON-LD, OG x5, 8096 visible chars, 98 links (35 internal; GitHub repo in chrome), meta description.
- FYD: 7 facts, 1 object (business-ish "React").
- UNUSED: docs/nav link structure, GitHub repo link -> api.github.com/repos/facebook/react (description, stars, contributors, license: a structured L2 source for the project's real facts).
- LOSS: DISCOVERY (repo API unconsulted; repo link unextracted), PARSING (links/text), ENTITY-RESOLUTION (project typed as business).
- Why L3: L2 GitHub API for project facts + L3 HTML for site structure. Max is L3.

### 13. Poorly structured legacy, lingscars.com, LEVEL 3

- RAW: 2 JSON-LD blocks (Organization: legal name, URL, address, contactPoint with phone and email, logo, sameAs; second block malformed), 0 OG, meta description, no canonical, h3 x17, 78 images (78 alt), phone+email also in HTML.
- FYD: 12 facts, 7 objects (business + location + 5 external_identity), 6 relationships. Malformed block handled gracefully as unsupported evidence. Street address withheld as private (verified).
- UNUSED: h3s, image alts, visible text (8968 chars).
- LOSS: PARSING (headings/text/alts unextracted; malformed JSON-LD resilience is a verified win), SCHEMA (3 unmapped properties, minor).
- Why L3: legacy does not mean unstructured; JSON-LD carried Business + Contact + Location outright.

## Loss class summary

- PARSING: 13/13. Universal and dominant. Missing: visible-text, heading, link-inventory, phone, email, image-alt, microdata, and sitemap-inventory extraction. Concrete worst cases: Wix 2.53 MB -> 5 facts; karpathy.ai 34 KB -> 1 fact; craigslist 455 links -> 0 links; aireserv 75 service headings + phone -> 0.
- DISCOVERY: 10/13. Single-seed fetching only. Missing: sitemap-as-inventory traversal (2230/7229/7908 URLs fetched but never parsed), multi-page following (/locations subtree with 248 location phones), platform endpoints (/products.json 202 KB; Squarespace ?format=rss; GitHub repo API), robots-declared sitemaps.
- SCHEMA: 6/13. 60 unsupported-evidence items total. Unmapped commercial types: SoftwareApplication (offers, featureList), FAQPage, AggregateOffer, Service gaps; unmapped props (numberOfEmployees, inLanguage, copyrightHolder).
- RELATIONSHIP: 5/13. sameAs edges work; structural edges absent (location link graphs, nav hierarchies, doc structure, external-identity graphs on link-only sites).
- ENTITY-RESOLUTION: 2/13. karpathy.ai (person as business), react.dev (project as business).
- NORMALIZATION: 2/13 flagged as precision evidence. Naive phone regex: 24/25 allbirds matches are timestamps/IDs; naive email regex: wix Sentry telemetry addresses. Extractors need tel:/mailto:/"call us" context gating.
- FETCH: 3/13, minor. /feed and /atom.xml returning HTML (aireserv, vercel) need content-type checks before feed parsing; redirects collapse to status:0/empty without typed cause.
- RENDERING: 1/13. notion.so only.
- PROVENANCE: 1/13, minor. Final URL after redirect (craigslist /area/westslope) not recorded; the observation design specifies finalUrl but the proceduralizer's AcquiredSource lacks it.

## The grill: cheapest sufficient level per category

| Category | Cheapest level | What it yields (Business+Services+Contact+Location) |
|---|---|---|
| WordPress + Yoast | L3 | Business rich, Contact via socials, founder person; Services/Location n/a |
| WordPress + Rank Math | L3 | Business + Contact (email); Services/Location n/a |
| Squarespace (thin publication) | L3 | Business stub + article inventory via ?format=rss; Contact/Services/Location n/a |
| Wix | L3 | Business + services from h2s + phone; all static, needs heading/phone extractors |
| Webflow | L3 | Business + Contact (email); services via SoftwareApplication mapping |
| Shopify | L3 (L2 for products) | Business/contact via HTML; products via /products.json |
| Plain static HTML | L3 | Business + link-derived structure |
| React/Next SPA | L3 | Business + Service + Location + Contact + founder: the full set, static |
| JS-heavy (notion.so) | L4 | Business + service stubs at L3; trustworthy service detail needs rendering |
| Multi-location | L3 (L2 sitemap inventory) | Business + services + contact + full location tree |
| Person/portfolio | L3 | Person + bio + external identities; all static, needs link/text extractors + typing |
| GitHub-backed project | L3 (L2 repo API) | Project + maintainers + site structure |
| Poorly structured legacy | L3 | Business + Contact + Location via JSON-LD |

## Tally and verdict

- At or below Level 4: 13/13.
- At Level 3: 12/13.
- At Level 4: 1/13 (notion.so).
- Requiring Level 5 or above: 0.

**Answer to the central question: yes.** FYD can get every site in this corpus without crossing Level 4, and 12 of 13 without crossing Level 3. Rendering (L4) is needed for exactly one category (JS-heavy content-after-JS), and browser interaction (L5+) for none. The binding constraints are not acquisition levels; they are deterministic parsing breadth, discovery reach, and schema coverage, all of which live at or below L3.

## Three highest-leverage backlog items

Ranked by measured loss coverage across the corpus:

1. **Deterministic HTML content extractors: headings, link inventory, visible text, contact patterns.** Kills the dominant PARSING loss (13/13 sites). Evidence: Wix 2.53 MB -> 5 facts (22 service h2s, phone unused); karpathy.ai 34 KB -> 1 fact (11K bio chars, 14 external links unused); craigslist 455 links -> 0; aireserv phone (855) 679-0011 + 75 service h3s -> 0. The pipeline's own observation design already specifies links, but parse() never extracts `<a>`. Include tel:/mailto:/context-gated contact extraction (allbirds and wix prove naive regexes false-positive). This one family unlocks Services and Contact evidence on 8+ of 13 sites at L3.

2. **Multi-page and structured-endpoint discovery: sitemap.xml as URL inventory, platform endpoints, location subtrees.** Kills the DISCOVERY loss (10/13). Evidence: aireserv /locations subtree (411 KB, 248 location phones, state/city link graph) unreachable from the seed; sitemaps of 2230/7229/7908 URLs fetched and discarded; allbirds /products.json (202 KB full catalog) ignored though it is Shopify's canonical product API; Squarespace ?format=rss absent from discover conventions; react.dev's GitHub repo API unconsulted. This is the difference between a homepage business card and a Business+Services+Locations graph. Note it also resolves the documented "sitemap fetching is pure cost" gap.

3. **Schema.org to PING mapping expansion for commercial types, plus entity typing.** Kills the SCHEMA loss (6/13, 60 unsupported items) and ENTITY-RESOLUTION loss (2/13). Evidence: memberstack SoftwareApplication (offers, featureList) -> 14 unmapped properties, zero service objects; yoast numberOfEmployees -> unsupported; karpathy.ai projected as ping.social.business@1 titled "Andrej Karpathy" (a person); react.dev as business (a project). Without this, even JSON-LD-rich pages under-generate, and person/project sites mistype.

## What already works (do not regress)

JSON-LD `@graph` handling with offline contexts and deterministic blank-node identity (yoast 13 objects, vercel full 4-slot set, lingscars legacy); malformed-block resilience (lingscars second block -> unsupported evidence, pipeline continues); private street-address withholding (verified on 2 sites); RSS/Atom item extraction (yoast 20 items, rankmath 5); source-tier priority and typed relationships from sameAs/founder.

## Provenance

Raw fetches, analysis scripts, and the compact pipeline-results archive live in `~/workspace/fyd-harvest/lanes/b-work/` (pipeline-results-compact.json, summarize.py, deep-dive.py, deep-dive2.py, feed-driver.ts.txt, jldump.py). Pig-side originals: `/home/nolan/fyd-b-work/raw/` (54-request fetch set), `/home/nolan/fyd-b-work/reports/pipeline-results.json` (93 KB, full output), `/home/nolan/fyd-b-work/reports/raw-signals.json`. Repository untouched; all pipeline runs executed in Pig scratch copies.
