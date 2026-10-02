# Round 69 Research Scratch (2026-09-16)

Segments: (1) independent water softening/treatment, (2) generator services, (3) new-business radar. Merged output: ~/workspace/outreach/scratch/jsonl-additions-round69.jsonl (11 rows, 33 fields, canonical order validated). Part files: jsonl-part-water-softening.jsonl (6), jsonl-part-generators.jsonl (1), jsonl-part-radar.jsonl (4). Per-segment notes: notes-water-softening-round69.md, notes-generators-round69.md, notes-radar-round69.md.

## Segment 1: Water softening / water treatment (Western Colorado)

Candidates (all WATCH, none draft-eligible, all dedup-clean across leads.md, pipeline.md, western-co-prospects.jsonl, dedup-names.txt):

- Aspen WaterWise, Carbondale. Custom consultative softener builds; in business since 1987 per own site. High assessed missed-call risk (consultative in-home water testing, field work). Email: none live-verified. Phone: none own-site verified. Stack: UNKNOWN.
- H2O The Water Store, Durango (h2owaterstore.com). Independently owned since 1985, owner Chris Eckhardt. Phone (970) 259-4700 from own-site footer. Email info@h2owaterstore.com appeared in a search crawl of the site's own footer but did NOT render in live fetch, so email stays blank per the live-verification rule. Best recheck candidate for a later manual pass. Stack: CONFIRMED WordPress (wp-content asset paths). Primary opportunity: MISSED_CALL_LEAD_CAPTURE (medium).
- The Water Store, Grand Junction (gjwaterstore.com). Purified-water retail/refill; installed softening NOT confirmed. Independent since 2002, state-licensed treatment/bottling. Email/phone: none own-site verified (directory phone (970) 243-5744 not own-site). Stack: UNKNOWN. Secondary: WEBSITE_REVAMP.
- Sullivan Water, Silt. Softeners, filtration, testing, salt/potassium delivery (third-party sourced; own site CAPTCHA-blocked). No own-site contact verified; directory numbers conflict. Stack: UNKNOWN.
- Pinnacle Water Inc, Rifle. Water treatment (listing category, INFERRED). No official site. No own-site contact. Stack: UNKNOWN.
- R A Biel Water Improvement, Durango. Google listing only, PO Box 2064, no website. No own-site contact. Stack: UNKNOWN.

Seasonal timing / why-now: well-water testing before winter is the natural fall hook (Aspen WaterWise free home water profile test, H2O in-home consults). Softener winterization, filter changes, salt/potassium delivery are recurring route work peaking before freeze. Maintenance plans (H2O, Aspen WaterWise) create scheduled fall touchpoints.

Skip patterns with reasons: franchises/dealers excluded under the hard rule: Culligan dealer pages, Hague Quality Water of Four Corners, Haferman Water (Kinetico provider), Kinetico of Mesa County. Multi-office corporate: The Source H2O (HQ Centennial). Chain/refill operators: goh2o, Primo, Ferguson. Dedup skips that removed three REAL candidates: Sweetwater LLC / Clean Air Pure Water (Durango, jim@cleanairpurewater.com, pipeline WATCH from round 60), Pristine Living (Steamboat, queued draft from round 61), B & J Pump & Well Services (Steamboat, pipeline WATCH from round 62). Good Water Company excluded (HQ Castle Rock, Front Range). Engineered Water Solutions: site would not load, no own-site facts verifiable. Artesian Water Services, AquaLogic LLC: no site or phone at all.

Net finding: the independent water-softening market in Western Colorado is thin; franchised dealers and multi-office operators dominate local search. Remaining independents are mostly phone-only with dated or sparse sites: classic missed-call territory, but none are draft-eligible this round.

## Segment 2: Generator services (Western Colorado)

One final row, draft-eligible, dedup-clean:

- Sunwise Solar, Steamboat Springs. WARM. Authorized Kohler Power generator dealer per own homepage ("certified to sell, service, and handle warranty claims"). Contact page live-fetched: own-site verbatim "CALL (970).819.0840 or E-Mail <Colin@Sunwise-Solar.com>". Phone-first, no form, no booking automation, weak static site (revamp_candidate: yes), high missed-call risk. Pre-winter outage-preparation angle is own-site grounded (backup power pitched on contact page). Caveats: primary identity is solar/backup-power, generator is a real authorized line but a subset, hence WARM not HOT; independence INFERRED (single Steamboat location, ~6 workers, no chain affiliation); owner name blank (not on own site); ai_discoverability weak. This was a round-60 near-miss; own-site fetch this round confirmed the dealer claim and published email, which graduated it.

Seasonal timing / why-now: pre-winter outage prep (winter storms, mountain-town PSPS risk); long sales cycle with maintenance contracts; high-ticket consultative sales where a missed call is a lost multi-thousand-dollar job.

Skip patterns with reasons: strict dedup skips despite confirmed generator evidence: Colorado Energy Systems (already canonical, drafted/queued round 68), M&R Home Services, Durgin Electric, Steamboat Electric (already tracked), Integrative Electric and Stagecoach Electric (pipeline near-misses, excluded anyway). General electricians with generator mentions but not generator-focused: CT Electric (Durango), Crossroads Electric (Montrose). Lead-gen/shared-number city pages (888-705-3728 style, identical copy across towns): skip on sight. Out-of-region: R&T Power Systems (NC), Reyff Electric (CA), Blue Water Electric (SC), Rocky Mountain Generator Supply (Denver, Front Range), generatorsco.com (lead-gen network). Solar-only shops: Alternative Power Enterprises (Ridgway), McClain's Electric dba SolarWorks GJ, T & G Electric (no own site).

Net finding: independent generator service in Western Colorado is genuinely sparse. The reachable pattern is solar/backup-power shops that are authorized generator dealers with own-site published email (Sunwise + Kohler Power). Pure generator shops barely exist here.

## Segment 3: New-business radar (filed/opened ~60-90 days, since ~2026-06-18)

Four qualified hits, all Grand Junction, all filing-only (no own site, GBP, phone, or Facebook found), all WATCH, all dedup-clean. Filing dates corroborated on 5-8 independent CDOS-mirror pages each (opencorpdata.com / opengovco.com, data from data.colorado.gov). Trades INFERRED from entity names, flagged as such:

- Legacy Lawns, LLC, landscaping, filed 2026-07-10 (68 days).
- A Duck Cleaner LLC, cleaning, filed 2026-07-16 (62 days).
- Homeworx roofing & interior LLC, roofing/interior, filed 2026-07-17 (61 days).
- Simply Mini Splits Ltd, HVAC, filed 2026-07-10 (68 days). Strongest find: fresh HVAC mini-split installer, high genuine missed-call pain trade, zero web footprint.

Draft-eligible: 0. All four carry new_filing_signal with the filing date and source=new-filing in notes. New-business setup angle applies once a contact route surfaces (congrats plus set it up right from day one: capture every call, instant booking, reviews from the start).

Skip patterns with reasons: AB Steel LLC (not verifiable home-service trade); Aces Roofing LLC (formed 2023, not 2026); five pipeline.md duplicates (Gold Leaf Roofing, GH Paint, Skilled Hands Handyman, Golden Arrow Property Services, BlueSky Pressure Washing); Stone Surgeon LLC and Trueview Windows & Doors (earlier radar round duplicates); Fungal Solutions - Wildfire Ltd (commercial/industrial, not residential); Clear Blue Pool & Spa CO (no dated evidence). GJ ribbon cuttings surfaced retail/gallery/library/clubhouse/engineering, not trades. Geography clustered in Grand Junction only; no August/September filings surfaced (latest in-zone filing was 2026-07-18). Other towns (Durango, Montrose, Delta, Glenwood, Rifle, Fruita, Palisade, Clifton, Gunnison, Carbondale, Aspen, Steamboat, Craig, Meeker) returned established businesses or non-trade entities.

## Cross-round observations

- The dedup machinery is doing its job hard: round 69's two best-looking water candidates and five generator-adjacent candidates were already tracked. The campaign's new-candidate yield is increasingly the binding constraint, which is why the radar share matters.
- Generator services as a pure segment is exhausted for Western Colorado; future yield will come from generator-adjacent independents (solar/backup-power authorized dealers).
- Water softening independents skew heavily phone-only and thin-site; the campaign lacks an email route into most of them. H2O The Water Store (Durango) info@h2owaterstore.com is the prime manual recheck target.
- Filing-only radar hits accumulate as a WATCH backlog with no contact route; worth a follow-up sweep to see which ones have surfaced a site, GBP, or phone since filing.
