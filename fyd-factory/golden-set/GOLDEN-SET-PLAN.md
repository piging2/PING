# GOLDEN SET PLAN: 500-Site Factory Stress Program, Truth Set

Status: DRAFT for Nolan review. Lane: LANE-GOLDEN-SET. Date: 2026-09-23.
Location: ~/workspace/fyd-factory/golden-set/

## 0. What this is and what it is not

The 500-site corpus measures BREADTH: how the factory behaves across the long tail of real business websites. The GOLDEN SET measures CORRECTNESS: a manually adjudicated truth set of 25 to 50 real businesses against which entity resolution, services, contacts, locations, people, relationships, composition, and Ask FYD answers are scored.

This is NOT the "golden route" (~/workspace/fyd-factory/golden/GOLDEN-REFERENCE.md, the frozen HPP donor implementation). That golden is a code reference. This golden set is a business truth reference. The two must never be confused in scoring: the route golden proves fidelity of the donor; the set golden proves correctness of extraction, resolution, and composition on real businesses.

The golden set is strictly REAL, PUBLIC businesses. Synthetic businesses live in ~/workspace/fyd-factory/corpus/fixtures/ (marked DEMO_SYNTHETIC) and are for pipeline testing ONLY. A synthetic business is never presented as a real prospect and never enters the golden set. The golden set is also NOT an outreach list: inclusion here confers no outreach eligibility and creates no pipeline state. Research only, no contact, no forms, no messages, per standing rules.

## 1. Adjudication protocol

### 1.1 Adjudicated fields per business

Every golden-set record adjudicates the following field groups. A field is either ADJUDICATED (human-verified, with cited evidence) or EXPLICITLY UNKNOWN (recorded as unknown with the reason). There is no third state: an unverified machine guess is not a value.

1. IDENTITY
   - canonical_name: the name the business currently uses for itself (homepage title, logo alt, JSON-LD name)
   - legal_or_trade_variants: prior names, DBA variants, brand renames (e.g., rebrand in progress)
   - aliases: common third-party spellings ("Colorado Wine Country Inn" vs "Wine Country Inn")
   - business_id: deterministic, see 1.4
   - chain_or_franchise: independent | franchise_branch | chain_branch | formerly_independent_now_chain, with evidence and re-verification date. Acquisitions happen between research and scoring (see Alpine/Aspen Tree Service joining SavATree); affiliation is re-checked at every scoring run, never trusted from an old record.
   - business_type: primary vertical plus secondary types (a brewpub is both manufacturer and restaurant)

2. LOCATIONS (one record per physical location; service-area-only businesses get a service_area record, not a fake address)
   - canonical street address, city, state, ZIP, plus lat/long when published
   - location_role: headquarters | branch | production_facility | retail_outlet | service_area_only
   - naming_consistency: whether the business names the location the same way everywhere (conflict bait)

3. CONTACTS
   - canonical phone per purpose (main, reservations, each office), alternates seen in the wild
   - email addresses published for business contact, contact-form URLs, messaging channels
   - Never invent contact information. A phone that appears only in one low-trust directory is WEAK, not canonical.

4. HOURS
   - canonical weekly hours per location, timezone (America/Denver), seasonal or exception notes
   - Known-conflict pairs are recorded in the conflict registry (1.6), not silently picked.

5. SERVICES
   - canonical service list with adjudicated dedupe decisions (near-duplicate service names merged only with a recorded reason; the factory's GAP-1 missing service normalization is scored against this)
   - service vs product boundary calls (menu items, retail SKUs, care services, bookable rooms each wear the "service" hat differently)
   - categories the business itself uses

6. PEOPLE
   - named people with roles, credentials, and the relationship that ties them to the business (employs vs works_for direction matters; see the F5-CEILING finding where reverse works_for edges never entered the people group)
   - public_only: only people the business itself publishes. No staff scraped from LinkedIn, no private individuals.
   - person_heavy flag when the roster is a core part of the business (dental, accounting, real estate)

7. RELATIONSHIPS
   - employs / works_for, located_at, offers, part_of (franchise parent), owns / operates
   - expected direction of each edge, so the factory's edge-direction handling is scored

8. MEDIA
   - rights basis for any image the factory would use, stated honestly. Per QA-TRUTH F-002: a same-origin URL heuristic is a policy inference, never presented as "observed" authorization. If authorization evidence does not exist, the record says so.

9. COMPOSITION EXPECTATIONS
   - sections the business's public graph should produce (Hero, BusinessSummary, Services, Locations, People, Contact, Links, CTA, AskFYD), with eligibility notes
   - known factory gaps to regression-test per candidate (e.g., "People section must appear from works_for edges")

10. ASK FYD CANONICAL Q/A
    - 5 to 10 canonical questions per business with adjudicated answers, every claim graded SUPPORTED / DERIVED / INFERRED / UNKNOWN per the LANE-ASK concierge contract
    - includes at least one UNKNOWN-by-design answer (the honest refusal), so overclaiming is scored, not just recall
    - the concierge throws rather than render a non-UNKNOWN claim without cited evidence; the golden answers are the citations it must match

11. CONFLICT REGISTRY (see 1.6)

12. EVIDENCE PACK (see 1.3)

### 1.2 Evidence requirements

- Minimum TWO independent public sources for every identity fact (name, address, phone). The official website counts as one. The second must be independent: Google Business Profile, Bing Places, a second directory, a news article, a government record (CO SOS), not a scraper copy of the first.
- Every adjudicated fact carries provenance: source URL, fetched_at timestamp, sha256 of the fetched bytes, and the extraction path (e.g., "JSON-LD LocalBusiness.telephone").
- Evidence grading per fact, using the standing prospect-research grades: CONFIRMED (two independent sources agree) / STRONG INDICATION (official site only, or site plus one weak corroboration) / WEAK INDICATION (single low-trust source) / UNKNOWN.
- Structured-data inventory per site: JSON-LD block count and @type list, recorded at adjudication time, so schema drift is detectable on re-crawl.
- Screenshots are evidence of last resort, not primary evidence: text-extractable facts beat pixels.
- Chain/franchise affiliation is re-verified at adjudication time AND at every scoring run. A record older than 90 days is STALE for affiliation purposes until re-checked.
- No contacting the business to adjudicate. Public evidence only.

### 1.3 Truth-set record format

One JSON file per business at `~/workspace/fyd-factory/golden-set/records/<business_id>.json`, plus a set manifest `golden-set-manifest.json`. Records are versioned and append-only in history: corrections add a new version with a supersedes pointer (same discipline as owner-mode corrections), they never rewrite history silently.

Record skeleton (fields abbreviated; full JSON Schema to be committed with the first records):

```json
{
  "business_id": "gs-gj-hvac-stocker",
  "record_version": 3,
  "record_status": "adjudicated",
  "adjudicated_by": "nolan",
  "adjudicated_at": "2026-09-30T00:00:00-06:00",
  "supersedes": "records/gs-gj-hvac-stocker.v2.json",
  "identity": { "canonical_name": "...", "variants": [], "chain_or_franchise": "independent", "affiliation_checked_at": "..." },
  "locations": [],
  "contacts": {},
  "hours": {},
  "services": { "canonical": [], "dedupe_decisions": [] },
  "people": [],
  "relationships": [],
  "media": { "rights_basis": "..." },
  "composition_expectations": { "sections": [], "regression_notes": [] },
  "ask_fyd": [ { "question": "...", "answer": "...", "claim_grades": [] } ],
  "conflicts": [ { "field": "hours.saturday", "source_a": {}, "source_b": {}, "adjudicated_value": "...", "rationale": "..." } ],
  "evidence_pack": [ { "url": "...", "fetched_at": "...", "sha256": "...", "grade": "CONFIRMED" } ],
  "schema_inventory": { "jsonld_blocks": 2, "types": ["HVACBusiness", "PostalAddress"] }
}
```

Business IDs are deterministic and human-readable: `gs-<town>-<vertical>-<slug>`, lowercase, hyphens only. Town codes: gj, fruita, palisade, clifton, delta, montrose, rifle, carbondale, and others as the set grows. The ID never changes once assigned, even if the business renames; renames are variants.

### 1.4 Who adjudicates

- Nolan is the final human adjudicator. Machine passes (harvest plus extraction plus proposed record) do the labor; Nolan adjudicates the conflicts, the identity calls, and the Ask FYD answers.
- The machine's job before Nolan sees a record: fill every field it can from public evidence, grade each fact, and put every disagreement or weak fact into an explicit ADJUDICATION QUEUE with both sides cited. Nolan never hunts for what needs his eyes; the queue is the handoff.
- Second-adjudicator spot checks: a second independent pass (a different agent, or the Meta AI tandem on an intelligence brief) re-adjudicates a random 20 percent of records per version. Disagreements go to Nolan with both rationales attached.
- Owner corrections, if any ever arrive for a golden-set business, outrank all web evidence (standing owner-mode rule), and are recorded as OwnerProvenance with assertedAt.

### 1.5 Disagreement resolution

Precedence ladder, highest first:

1. Owner assertion (CONFIRM / CORRECT / HIDE), when it exists
2. Canonical structured state (an already-adjudicated golden record at a newer version)
3. The business's own current website (homepage and JSON-LD first, then deeper pages)
4. Independent corroboration (GBP, government records, reputable press)
5. Directories and aggregators (weakest; never break a tie alone)

Rules:
- A conflict is RECORDED, never silently resolved. The acquisition corpus GAP-6 lesson (source priority picked a winner with no conflict record) is exactly what the golden set exists to punish.
- No silent winners: every conflict entry names source A, source B, the adjudicated value, and the rationale in one sentence.
- Machine-vs-machine disagreement (two extraction passes differ) is itself a conflict entry, flagged for the adjudication queue.
- Tie at the same precedence level goes to Nolan, with both sides cited. The record keeps the tie visible until he rules.
- Stale beats nothing: an older adjudication never outranks fresher public evidence; it triggers re-adjudication instead (see 1.6).

### 1.6 How the set stays current

The golden set rots if it is not maintained. Maintenance triggers:

- DRIFT DETECTION: quarterly re-crawl of all golden-set homepages. Any change in JSON-LD types, phone, address, hours, or business name vs the record opens a re-adjudication ticket. Byte digests make this mechanical.
- EVENT TRIGGERS: rebrand, acquisition, franchise join/exit, closure, new location, or credible press about any of these re-opens the record immediately, not at the next quarter.
- FACTORY SCHEMA VERSION BUMPS: when the factory adds a field, a schema, or a relationship type, every golden record gets a gap review: does the new capability change any adjudicated value? If yes, new record version.
- STALENESS SLA: affiliation_checked_at older than 90 days blocks that record from chain/franchise scoring until re-verified. Full record older than 180 days without drift check is flagged STALE in the manifest.
- CHANGELOG: every version bump records what changed and why, in one line per change. Retired businesses (closure confirmed by two sources) move to `records/retired/` with a closure note; they are never deleted, because a closed business is still a valid negative test for "do not invent a live listing."
- GROWTH GATES (Nolan's gated progression): 10 (this plan) -> 25 -> 50. A gate opens when the current set scores cleanly on two consecutive factory runs with zero adjudication-queue backlog.

### 1.7 How the set is used (scoring)

The golden set is the answer key. Factory runs score against it on:

- ENTITY RESOLUTION: precision/recall on identity (did the factory merge the rebrand? split the two Enstrom locations correctly? keep the franchise branch distinct from the parent?)
- FIELD ACCURACY: per-field exact or graded match on contacts, hours, addresses, services, people
- CONFLICT RECALL: for every conflict in the registry, did the factory surface it (both values cited) rather than silently pick one? Surfacing with the wrong winner still beats silence; silence is the failure mode.
- COMPOSITION: expected sections present/absent per the record; regression notes checked (e.g., works_for people produce a People section)
- ASK FYD: canonical questions answered; claim grades must match (a SUPPORTED claim the factory marks UNKNOWN is a recall miss; an UNKNOWN the factory answers with a guess is an overclaim, scored harder)
- STABILITY: same input twice gives the same output (determinism lane), and rebrand/acquisition events move the record correctly

Pass thresholds are set per metric by Nolan at the 25-record gate; the 10-record wave is for protocol shakeout, not gating.

## 2. First 10 golden-set candidates

Selection method: web search across business types in the Mesa County corridor plus near neighbors (Grand Junction, Fruita, Palisade; Delta, Montrose, Rifle, Carbondale reserved for wave 2), then verification that each official site resolves and carries JSON-LD (fetched 2026-09-23, block counts and @type inventories recorded below). Coverage: 10 businesses, 10 distinct verticals. Structured-data grading: STRONG means a typed LocalBusiness-family block with address, geo, and hours; THIN means WebSite/WebPage-only or breadcrumb-only schema. THIN sites are deliberate: the 500-site corpus will be full of them, and the factory must not collapse on thin schema. Their records will grade schema completeness explicitly.

Evidence links were verified live on 2026-09-23 (search results and homepage fetches). No business was contacted.

### Candidate summary

| # | business_id | Business | Type | Town | Schema |
|---|---|---|---|---|---|
| 1 | gs-gj-hvac-stocker | Stocker Heating and Cooling | HVAC / trades | Grand Junction | STRONG (HVACBusiness) |
| 2 | gs-gj-tree-treeclimbers | Tree Climbers Services | Tree service | Grand Junction | STRONG (LocalBusiness + FAQPage) |
| 3 | gs-fruita-restaurant-hottomato | Hot Tomato Cafe and Pizzeria | Restaurant | Fruita | STRONG (Restaurant) |
| 4 | gs-gj-brewery-kannahcreek | Kannah Creek Brewing Company | Brewery + brewpub | Grand Junction | STRONG (Restaurant) |
| 5 | gs-palisade-hospitality-winecountryinn | Wine Country Inn | Hotel + wedding venue | Palisade | PARTIAL (Organization; no Hotel type) |
| 6 | gs-gj-realestate-bray | Bray Real Estate (brand: Bray and Company) | Real estate brokerage | Grand Junction | THIN (WebSite only) |
| 7 | gs-gj-accounting-dwc | DWC CPAs and Advisors (legal: Dalby, Wendland and Co.) | Accounting / advisory | Grand Junction (6 offices) | THIN (WebPage/WebSite only) |
| 8 | gs-gj-retail-enstrom | Enstrom Candies | Retail / confectionery | Grand Junction (5+ stores) | THIN (BreadcrumbList only) |
| 9 | gs-gj-dental-elevation | Elevation Family Dental | Dental practice | Grand Junction | STRONG (Organization + LocalBusiness) |
| 10 | gs-gj-franchise-savatree | SavATree, Grand Junction branch | Tree care, franchise branch | Grand Junction | STRONG (LocalBusiness + reviews + FAQ) |

### 1. gs-gj-hvac-stocker: Stocker Heating and Cooling

- Canonical name: Stocker Heating and Cooling (site also renders "Stocker Heating and Cooling LLC")
- Type: HVAC contractor, independent trades
- Town: Grand Junction, CO
- Source URLs:
  - Official: https://www.stockerheating.com/ (verified 200, 2026-09-23)
  - Place data: 949 South Ave, Grand Junction, CO 81501; phone (970) 644-5117; Mon-Fri 8:00 AM - 4:00 PM; 5.0 rating (9 reviews). Address and phone confirmed in the site's own HTML ("949 South Avenue, Grand Junction, CO 81501").
- Structured data: STRONG. 2 JSON-LD blocks: @types HVACBusiness, Place, GeoCoordinates, PostalAddress, ImageObject.
- Why it stresses the factory:
  - Canonical single-location independent trade shop: the baseline the factory must get exactly right (entity resolution precision floor).
  - Services are problem-shaped (repair, install, maintenance) rather than product-shaped; tests service extraction that is not a menu or catalog.
  - Small review footprint (9 reviews): tests the factory's honesty about thin social proof (no invented testimonials; SocialProof must stay empty, per the DEHPP-ANALYZE finding that the generator never emits it).

### 2. gs-gj-tree-treeclimbers: Tree Climbers Services

- Canonical name: Tree Climbers Services (site title renders empty; brand carried in body and logo)
- Type: tree service, independent
- Town: Grand Junction, CO
- Source URLs:
  - Official: http://www.treeclimbersservices.com/ (verified 200, 2026-09-23)
  - Place data: 360 27 1/2 Rd, Grand Junction, CO; phone (970) 589-2268 (confirmed in site HTML in two formats).
- Structured data: STRONG. 3 JSON-LD blocks: WebSite, LocalBusiness (PostalAddress, GeoCoordinates, OpeningHoursSpecification), FAQPage with Question/Answer pairs.
- Why it stresses the factory:
  - Service-heavy outdoor trade: trimming, removal, stump work, emergency service. Tests service list extraction and near-duplicate merging (trimming vs pruning vs cutting).
  - FAQPage schema present: tests whether article/FAQ objects enter the graph as first-class objects (the clearwater fixture models FAQs as articles; this is the real-world counterpart).
  - Identity is thin in the title tag (empty title): tests that the factory resolves identity from body/JSON-LD, not just the title.

### 3. gs-fruita-restaurant-hottomato: Hot Tomato Cafe and Pizzeria

- Canonical name: Hot Tomato (renders as "The Hot Tomato"; also "Hot Tomato Cafe and Pizzeria")
- Type: restaurant (pizzeria), independent
- Town: Fruita, CO
- Source URLs:
  - Official: https://hottomatopizza.com/ (verified 200, 2026-09-23)
  - Address/phone confirmed in site HTML: 124 N. Mulberry St, Fruita, CO 81521; (970) 858-1117
  - Press: https://thebusinesstimes.com/fruita-pizzeria-wins-statewide-award/ (2018 Wright Award; founders Jen Zeuner and Anne Keller; opened 2005)
  - Directory: https://tablefifty-two.com/directory/co/fruita/hot-tomato-cafe-pizzeria.html (lists hours Tue-Sat 11am-8pm, Mon/Sun closed, and an older domain hottomatocafe.com)
- Structured data: STRONG. 2 JSON-LD blocks: Restaurant, PostalAddress, GeoCoordinates, OpeningHoursSpecification x5.
- Why it stresses the factory:
  - Live conflict bait: directory hours (Tue-Sat 11-8) vs place-data hours (Tue-Sat 11-9); old domain hottomatocafe.com vs current hottomatopizza.com. The conflict registry gets real entries on day one.
  - Person-heavy founders with public story (two named owners, press coverage): tests person extraction with roles.
  - Menu-as-services: pizza menu items wear the service hat; tests the "services wear 4 hats" cross-vertical finding from F2-CORPUS-B.
  - Event-adjacent: fundraisers and live music nights; light event extraction without a full events program.

### 4. gs-gj-brewery-kannahcreek: Kannah Creek Brewing Company

- Canonical name: Kannah Creek Brewing Company (also "Kannah Creek Brewing Co.")
- Type: brewery plus brewpub restaurant, independent, multi-location
- Town: Grand Junction, CO
- Source URLs:
  - Official: http://www.kannahcreekbrewingco.com/ (verified 200, 2026-09-23; site title: "Kannah Creek Brewing Co | Edgewater Brewery | Grand Junction, CO")
  - Address/phone confirmed in site HTML: 1960 N 12th Street, Grand Junction, CO 81501; 970.263.0111
  - Press: https://thebusinesstimes.com/brewery-unveils-new-logo/ (open since 2005; managing partner Eric Ross; production expansion)
  - Third-party venue data (Untappd) lists additional addresses: 905 Struthers Ave GJ, 2531 N 12th St GJ, 127 E Aspen Ave Fruita, 2695 Patterson Road Ste 9 GJ
- Structured data: STRONG. 2 JSON-LD blocks: Restaurant, PostalAddress, GeoCoordinates, OpeningHoursSpecification x5.
- Why it stresses the factory:
  - Multi-location entity resolution: the business itself names two facilities (original brewpub at 1960 N 12th St; Edgewater Brewery production facility in south downtown). Third-party sources add four more addresses, most of which are retail accounts, not locations. The factory must not promote every address it sees into a location (acquisition GAP-2: locations collapse with no dropped-entity ledger).
  - Dual nature: manufacturer (distribution, contract brewing for Many Rivers Brewing) plus restaurant. Tests business_type multiplicity and the service/product boundary (beer as product vs dining as service).
  - People: named managing partner and marketing coordinator in press; tests person extraction from non-site sources.

### 5. gs-palisade-hospitality-winecountryinn: Wine Country Inn

- Canonical name: Wine Country Inn (alias "Colorado Wine Country Inn" used by wedding directories)
- Type: hotel plus wedding/event venue plus restaurant, independent
- Town: Palisade, CO
- Source URLs:
  - Official: https://coloradowinecountryinn.com/ (verified 200, 2026-09-23; weddings page https://coloradowinecountryinn.com/weddings/)
  - Address/phones confirmed in site HTML: 777 Grande River Drive, Palisade, CO 81526; (970) 464-5777 and 888-855-8330 (reservations)
  - Colorado.com listing: https://www.colorado.com/palisade/wine-country-inn (80-room Victorian-style boutique hotel, 21 acres of vineyards, Caroline's Restaurant, Vineyard Ballroom)
  - Wedding venue data: https://www.herecomestheguide.com/wedding-venues/colorado/colorado-wine-country-inn (rental fees, capacity 180)
- Structured data: PARTIAL. Yoast WebPage/WebSite on the homepage; Organization plus PropertyValueSpecification on the weddings page; no Hotel schema anywhere. WordPress with Beaver Builder.
- Why it stresses the factory:
  - Event-heavy: weddings, corporate retreats, reunions, with priced packages. Tests event object extraction and the composition of an events surface from a hospitality business.
  - Composition stress: hotel plus restaurant plus venue in one graph; the factory must compose sections that reflect all three without inventing a fourth.
  - Multi-contact: two published phones with different purposes; tests contact role separation.
  - Name aliasing: "Wine Country Inn" vs "Colorado Wine Country Inn" across sources; tests alias handling without forking the entity.
  - Thin hotel schema: no Hotel JSON-LD despite being a hotel; tests graceful handling of missing expected schema.

### 6. gs-gj-realestate-bray: Bray Real Estate

- Canonical name: Bray Real Estate (current brand renders "Bray and Company" in the site title)
- Type: real estate brokerage, independent
- Town: Grand Junction, CO
- Source URLs:
  - Official: https://www.brayandco.com/ (verified 200, 2026-09-23; title "Grand Junction Real Estate Experts | Bray and Company"; about page https://brayandco.com/about/; contact https://brayandco.com/contact/)
  - Address/phone confirmed in site HTML: 1015 N 7th Street, Grand Junction, CO 81501; (970) 242-3647
  - Press: https://thebusinesstimes.com/real-estate-firm-announces-additions-and-designation/ (CEO Robert Bray; office at 1015 N. Seventh St.; older articles cite www.brayrealestate.com and www.brayandco.com)
- Structured data: THIN. Single JSON-LD block: WebSite plus SearchAction only, on both homepage and about page. No Organization or RealEstateAgent schema.
- Why it stresses the factory:
  - Person-heavy: dozens of agents with individual pages; tests person extraction at scale and the employs direction (brokerage employs agents).
  - Live identity drift: brayrealestate.com (old) vs brayandco.com (current); "Bray Real Estate" vs "Bray and Company." Tests variant handling on a real, current rename.
  - Thin schema on an IDX-style site: the factory must build the graph from body content and agent pages, not from JSON-LD. Scores the "no silent collapse" behavior on thin-schema professional sites.
  - Service boundary: buyer/seller representation, property management, relocation; tests service extraction where services are relationship-shaped, not item-shaped.

### 7. gs-gj-accounting-dwc: DWC CPAs and Advisors

- Canonical name: DWC CPAs and Advisors (legal and historical name: Dalby, Wendland and Co.)
- Type: accounting and business advisory, independent, multi-office
- Town: Grand Junction, CO headquarters; offices also in Aspen, Glenwood Springs, Montrose, Rifle, Telluride
- Source URLs:
  - Official: http://www.dalbycpa.com/ (verified 200 over http; https does not resolve as of 2026-09-23; title "CPAs, Accounting, Tax, Audit, Advisory - DWC CPAs and Advisors")
  - Phones confirmed in site HTML: (970) 243-1921 plus office-specific numbers (970) 249-7701, (970) 945-8575, (719) 496-4888
  - Press: https://thebusinesstimes.com/president-and-board-chairman-elected-to-oversee-accounting-firm/ (offices in Grand Junction, Aspen, Glenwood Springs, Montrose, Rifle, Telluride; president Greg Keller; CEO Chris West per later coverage)
  - Note: several offices (Aspen, Glenwood Springs, Telluride) sit outside the standing outreach geography; the business is included for factory stress, not outreach, and the golden set is not an outreach list.
- Structured data: THIN. Single Yoast JSON-LD block: WebPage, WebSite, BreadcrumbList only. No Organization or AccountingService schema.
- Why it stresses the factory:
  - Rebrand in progress: the site says "DWC" 52 times and "Dalby, Wendland" twice. Tests entity resolution across a live rename: one entity, two names, both attested.
  - Multi-office: six locations with per-office phones; tests location/contact fan-out and the dropped-entity ledger (a seventh address must not appear from thin air).
  - Person-heavy with credentials: partners and staff with CPA designations, bios, and practice areas; tests credential extraction without inventing titles.
  - Protocol edge: the site does not resolve over https. Tests the factory's fetch behavior on http-only sites (record the fact; do not "fix" it by assuming https).

### 8. gs-gj-retail-enstrom: Enstrom Candies

- Canonical name: Enstrom Candies
- Type: retail confectionery, independent family business (fourth generation), multi-location plus ecommerce
- Town: Grand Junction, CO headquarters and factory
- Source URLs:
  - Official: https://www.enstrom.com/ (verified 200, 2026-09-23); location pages https://enstrom.com/pages/grand-junction-factory/ and https://enstrom.com/pages/grand-junction-cornersquare/
  - Address/phone confirmed: 701 Colorado Ave, Grand Junction, CO 81501; 800.367.8766 (1-800-ENSTROM)
  - Store footprint (per ColoradoBiz directory https://coloradobiz.com/service-directory/enstrom-candies/): GJ Downtown/Factory 701 Colorado Ave; GJ Corner Square 120 W Park Suite 100; Fruita 401 Kokopelli Blvd Suite 2; Denver (Cherry Creek North) 201 University Blvd 118; Arvada 6770 W 52nd Ave
  - Press: https://thebusinesstimes.com/how-sweet-it-is-fourth-generation-candy-maker-on-the-job/ (founded 1960 by Chet Enstrom; owners Doug and Jamee Simons; fourth-generation Jim Simons)
  - Conflicting listings observed: downtown phone (970) 242-1655 vs (970) 683-1000 on different listing pages; hours 7am-7pm vs 7am-6pm across sources
- Structured data: THIN. Zero JSON-LD blocks on the homepage; location pages carry a single BreadcrumbList block. Shopify storefront.
- Why it stresses the factory:
  - Conflicting sources on day one: two phones and two hour sets for the same downtown location across listings. The conflict registry gets phone and hours entries immediately.
  - Multi-location retail: five stores across two metros plus an online store; tests location fan-out and the distinction between retail outlet and headquarters/factory.
  - Catalog-as-content: product catalog (toffee, chocolates, gift baskets) with seasonal inventory; tests product objects and the service/product boundary from F2-CORPUS-B.
  - Family business narrative with named people across generations: tests person extraction where people matter to brand but are not staff bios.
  - Near-zero structured data on a major local brand: the factory's body-text extraction (acquisition GAP-4: body-text facts produce zero with no leftovers signal) is scored honestly here.

### 9. gs-gj-dental-elevation: Elevation Family Dental

- Canonical name: Elevation Family Dental
- Type: dental practice (healthcare), independent, single dentist
- Town: Grand Junction, CO
- Source URLs:
  - Official: https://www.elevationfamilydental.com/ (verified 200, 2026-09-23)
  - Address/phone confirmed in site HTML: 1190 Bookcliff Ave Unit 101 (site HTML also shows "1190 Bookcliff Ave"), Grand Junction; 970-245-2990
  - Place data: Mon-Wed 7:30 AM - 4:30 PM, Thu 8:00 AM - 5:00 PM, Fri-Sun closed
  - Press: https://thebusinesstimes.com/family-dental-practice-opens-in-new-location/ (Dr. Judd Chamberlain; DDS University of Nebraska-Lincoln; services: preventive, restorative, cosmetic, implants, veneers, whitening)
- Structured data: STRONG. 3 JSON-LD blocks: WebSite, Organization, LocalBusiness.
- Why it stresses the factory:
  - Person-heavy single-provider practice: the dentist IS the business identity. Tests person extraction with credentials (DDS, advanced education) and the works_for/owns direction.
  - Healthcare-adjacent trust claims: the factory must not invent credentials, licenses, or "years of experience" beyond what is published (QA-TRUTH overclaim discipline).
  - Service list with clinical specificity (root canals, dentures, implants, Invisalign-style offerings): tests service extraction where items are procedures, plus patient-education articles as article objects.
  - Hours with mid-week variation and no weekend hours: tests hours parsing that is not a simple Mon-Fri block.

### 10. gs-gj-franchise-savatree: SavATree, Grand Junction branch

- Canonical name: SavATree (branch: SavATree Grand Junction; formerly T4 Tree Services at this location)
- Type: tree care, franchise/chain branch of a national company
- Town: Grand Junction, CO
- Source URLs:
  - Branch page: https://www.savatree.com/locations/grand-junction-colorado/ (verified 200, 2026-09-23; title "Certified Arborist Tree Services in Grand Junction, CO | SavATree")
  - Address/phone confirmed: 2393 F 1/2 Road, Grand Junction, CO 81505; (970) 640-5284
  - Arborist bios: https://www.savatree.com/locations/grand-junction-colorado/arborist/william-cooper/ (ISA Certified Arborist, TRAQ, B.S. Landscape Architecture CSU) and .../arborist/tom-ziola/
  - Place data shows the same address under the legacy name "T4 Tree Services" (founded 2010; "the only accredited company on the Western slope"), now served at savatree.com
- Structured data: STRONG. 4 JSON-LD blocks: BreadcrumbList, FAQPage (7 Q/A), LocalBusiness (PostalAddress, GeoCoordinates, OpeningHoursSpecification x7), AggregateRating with 5 Reviews.
- Why it stresses the factory:
  - Franchise edge, the deliberate one: a national brand's local branch page. Tests part_of relationships (branch part_of SavATree parent), local vs corporate identity separation, and the rule that chain affiliation is re-verified at scoring time.
  - Acquisition history: T4 Tree Services became SavATree Grand Junction. Tests identity continuity across acquisition: same address and phone, new brand. This is the Alpine/Aspen lesson in miniature.
  - Person-heavy arborist bios with credentials (ISA Certified, TRAQ): tests credentialed-person extraction on a template-driven national site.
  - Review schema present (AggregateRating, 5 reviews): tests honest review surfacing with the rating source cited, not blended into invented testimonials.
  - Corporate template risk: the factory must attribute branch-specific facts to the branch and not import national boilerplate as local claims.

## 3. Wave 2 shortlist (to reach 25)

The first 10 cover Grand Junction (8), Fruita (1), and Palisade (1) across 10 verticals. Wave 2 must add geographic spread and the missing verticals before the 25-record gate:

- Geography: Delta, Montrose, Rifle, Carbondale, Clifton, Mack, Loma, De Beque, Collbran. At least one business per town before any town gets a second.
- Verticals: auto repair, coffee shop (independent, not a warm PING contact), winery or orchard (Palisade agriculture), law firm or insurance agency (professional services, distinct from CPA/real estate), landscaping or lawn care, plumbing or electrical (second trade for cross-trade comparison), salon or barbershop (appointment-heavy), general contractor or remodeler, nonprofit or church (non-commercial edge), and one Facebook-only business with no real website (thin-web negative control; authorized real business, public page).
- Stress gaps to fill: a business with genuinely conflicting hours between its own site and its GBP (suspected, to be confirmed at adjudication); a multi-generational family business with succession in progress; a business that closed in the last 2 years (retired-record drill); a seasonal business (orchard, rafting, snow removal) for hours/exception handling.

Wave 2 candidates are proposed by machine pass and approved by Nolan before any adjudication labor is spent. No wave-2 business is contacted.

## 4. Hard rules (restated, binding)

1. Real businesses only. The golden set never contains a synthetic business. Synthetic fixtures stay in ~/workspace/fyd-factory/corpus/fixtures/ marked DEMO_SYNTHETIC.
2. A synthetic business is never presented as a real prospect, anywhere, for any reason.
3. No contact with any golden-set business: no outreach, no forms, no messages, no review responses. Research only. Inclusion is not outreach eligibility and creates no pipeline state.
4. The golden set is not a prospect list. It must never be fed into the outreach engine, the discovery funnel, or any send queue. If a golden-set business ever becomes a real prospect through the normal discovery process, that is a separate decision with its own evidence, and the golden record is flagged to avoid double roles.
5. Every adjudicated fact has cited public evidence. No invented contact information, ever.
6. Conflicts are recorded, never silently resolved. Silence about a known conflict is a scoring failure.
7. Chain/franchise affiliation is re-verified at adjudication and at every scoring run. A stale affiliation blocks chain scoring.
8. Owner corrections outrank web evidence when they exist, recorded with provenance.
9. Media rights basis is stated honestly; a heuristic is never presented as observed authorization.
10. Records are versioned and append-only in history. Retired businesses are moved, not deleted.

## 5. Immediate next steps

1. Nolan reviews this protocol (grill through the one canonical surface if anything needs his call).
2. Machine pass drafts the 10 records in the 1.3 format, with an adjudication queue per record listing every weak fact and conflict.
3. Nolan adjudicates; second-adjudicator spot check runs on 20 percent.
4. Manifest v1 committed; drift-detection baseline digests stored.
5. Wave 2 proposals after the first scoring run shakes out the protocol.

---
End of plan. No em dashes were used in this document.
