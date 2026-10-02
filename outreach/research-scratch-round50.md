# Research scratch: Round 50, fireplace/stove + countertop/cabinet, Western Colorado (2026-09-14)

Intelligence research only. Nothing was sent or submitted. Two fresh segments (both NOT previously covered): fireplace/stove retailers-installers and countertop/cabinet shops. 10 rows emitted to ~/workspace/outreach/jsonl-additions-round50-research.jsonl (5 WARM, 5 WATCH, 0 SUPPRESS).

## Segment A: Fireplace / stove retailers + installers

### Candidates emitted (6)
- **Woodstove Warehouse** (Grand Junction, WARM): family shop since 1990, certified Quadra-Fire dealer in Mesa County, phone-only intake, Duda site CONFIRMED (irp.cdn-website.com assets). Angle: MISSED_CALL_LEAD_CAPTURE, medium. Fall stove season fit is the strongest timing hook in the batch.
- **Fireplace West** (Grand Junction, WARM, revamp_candidate yes): 18+ years, BBB A+, but own site fetched nearly empty, barely functional presence. Angle: WEBSITE_REVAMP, medium. Classic non-technical owner profile.
- **Colorado Fireside, Inc.** (Montrose + Glenwood Springs, WARM): independent since 2000, two showrooms, premium brands, same-day-service reputation, phone-only intake, Duda site CONFIRMED. Angle: MISSED_CALL_LEAD_CAPTURE, medium.
- **Pagosa Peak Custom Fireplaces** (Pagosa Springs, WATCH, revamp_candidate yes): NFPA-certified chimney inspections, chamber member, 5.0 rating, dated BCI Media site (copyright 2021-26). Only candidate with own-site published email (pagosapeakscf@gmail.com). Angle: WEBSITE_REVAMP, medium.

Two additional rows were emitted and then dropped at assembly as the lowest-confidence WATCH rows to respect the ~10 cap; they are verified backups for a second batch:
- True North Hearth & Home (Glenwood Springs + Montrose, WATCH, low confidence): since 2015, fireplaces plus hot tubs/outdoor kitchens, quote form exists, phone listing-only.
- San Juan Hearth and Renewables (Durango, WATCH, low confidence): hearth plus solar/PV line, dual seasonal demand.

### Stack pattern
Duda dominates this segment (CONFIRMED on two candidates via irp.cdn-website.com asset URLs). Legacy custom sites (Pagosa Peak, BCI Media) elsewhere. No booking engine, CRM, or after-hours lead capture observed at any candidate. Phone-only intake is the norm, so missed-call risk grades high/medium across the board, right at the start of fall stove season.

### Pitch angles discovered
1. Missed-call lead capture for showroom/in-field crews: fall call spikes with Sat/Sun limited hours.
2. Website revamp for shops whose credentials outrun their web presence (certified installers with weak sites).
3. Service/maintenance dispatch automation (sweeps, inspections, same-day service) and review follow-up on strong local reputations.

### Exclusions
- Stove Depot & Chimney Works (GJ and Montrose): dedupe hits, already covered.
- High Mountain Hearth: dedupe hit, already covered.
- Western Fireplace Supply (Colorado Springs/Avon/Fort Collins): regional chain, excluded.
- Colorado Cylinder Stoves (GJ manufacturer): manufacturer with national distribution, not a home-service target; not emitted.

### Alternates over cap (logged, not emitted)
Hot Stuff Hearth & Home (Steamboat Springs, 1625 Mid Valley Dr Unit 3, 970-879-7614), Homespun Comforts (Pagosa Springs), Holy Smokes Stoves & Fireplace (Pagosa Springs), The Fireplace Doctors (Carbondale area, BBB A+).

## Segment B: Countertop / cabinet shops

### Candidates emitted (6)
- **Best Tops** (Grand Junction, WARM, revamp_candidate yes): true stone fabricator, phone-only intake, short hours (closed weekends, Fri ends at noon), single-page Wix site CONFIRMED, no form. High missed-call risk. Angle: MISSED_CALL_LEAD_CAPTURE, medium. Best pure fit in the batch.
- **BTO Cabinet & Design** (Grand Junction, WARM): family/woman-owned 2019, Showplace Diamond partner, estimates within one business day, Hibu builder CONFIRMED. Own site is form-only; company press release lists (970) 239-2732 and info@btocabinet.com, but those are NOT on the own site so fields were left empty per the own-site rule. Angle: MISSED_CALL_LEAD_CAPTURE, medium, with quote-speed angle.
- **Whitewolf Cabinets** (Grand Junction, WATCH): family run 23+ years, email info@whitewolfcabinets.com published on own site, quote form, 70 years combined experience. Angle: MISSED_CALL_LEAD_CAPTURE, medium.
- **Discount Cabinet Warehouse** (Grand Junction, WATCH): family owned since 2012, free in-home measuring and Grand Valley delivery, reviewers praise Andrew by first name. Angle: MISSED_CALL_LEAD_CAPTURE, medium.
- **Designer Wood Finishes** (Grand Junction, WATCH): locally owned since 1995, European frameless specialty, aging WordPress site CONFIRMED, no visible email/phone on fetched pages. Angle: WEBSITE_REVAMP, medium (revamp flag left blank pending fuller crawl).
- **Montrose Marble & Granite** (Montrose, WATCH): founder Diego Hernandez confirmed on own About page, 21+ years in Montrose, active educational blog on stone finishes; strongest content/AEO posture in the batch. Angle: MISSED_CALL_LEAD_CAPTURE, medium.

### Stack pattern
Low-tech segment: Wix (Best Tops CONFIRMED), Hibu (BTO CONFIRMED), WordPress (Designer Wood Finishes CONFIRMED), custom (Montrose Marble & Granite, Discount Cabinet Warehouse). No booking software, CRM, chat, or review widgets observed on any candidate site. Intake is phone, contact form, or walk-in. Most sites are brochureware.

### Pitch angles discovered
1. Missed-call / quote-speed: fabricators live on estimates; instant-response quote handling is a live competitive edge.
2. Revamp angle for aging one-pagers (Best Tops, Designer Wood Finishes).
3. Big-box contrast: Discount Cabinet Warehouse and Whitewolf sell on beating big-box pricing as local family shops; follow-up automation fits their existing story.

### Notable source artifact
A graniteimports.net supplier PDF ("Preferred Fabricators, Grand Junction 12/2023") mapped the entire GJ fabricator cluster with phones and addresses. Verified backups for a second countertop batch, not emitted: TopStone, QuartzWorx, Hands of Stone, RZ Cabinetry (GJ); A & Y Granite, Colorado Granite & Marble, Uncompahgre Granite (Montrose); Beleza (Gunnison); plus Osburn Cabinets & Design, Timeless Millworks, Woodworkers of Grand Junction from search.

### Exclusions
No franchises found anywhere in this segment; every shop is owner-operated or family run. CabParts (GJ) is B2B wholesale to builders/designers, not a home-service target; not emitted.

## New-business radar
0 qualifying hits across both segments this round. Chamber new-member announcement scans (GJ, Fruita, Montrose, Delta) and "grand opening"/"now open" queries for both trades returned no Western Slope trade businesses opened in the last 60-90 days. The GJ chamber new-members page that surfaced is a stale 2018 page. No source=new-filing rows emitted. One radar-adjacent find: Honk-Key Lock and Safe opened a new GJ storefront (locksmith segment already covered; dedupe will catch it).

## B2B contact-form lane
0 hits. No candidate contact page in either segment explicitly invites partnerships, vendors, or business connections. All are homeowner quote/estimate flows. Nothing qualifies for the website-form lane.

## Dedupe
Every candidate was checked against /tmp/dedupe-names.txt (535 normalized names from leads.md, pipeline.md, western-co-prospects.jsonl, prospect-archive.jsonl) plus spot web-search verification. Dedupe hits discarded: Stove Depot & Chimney Works (both locations), High Mountain Hearth. Re-check at assembly: no emitted name appears on the list.

## Cross-segment observations
- Phone dependency is extreme in both segments: 9 of 10 emitted rows are phone-route or phone+form, and only 2 rows carry own-site emails (Whitewolf info@whitewolfcabinets.com, Pagosa Peak pagosapeakscf@gmail.com). Own-site email yield is the recurring bottleneck for the email lane; phone-route and Messenger/DM lanes carry these segments.
- Site-builder fingerprints: Duda in hearth, Wix/Hibu/WordPress in cabinets. Cheap builder sites correlate with revamp candidacy and with phone-only intake.
- Seasonal timing strongly favors fireplace/stove right now (fall installs before first hard freeze); countertop/cabinet is steady year-round demand with quote-speed as the live angle.
- GJ carries both segments' density; Montrose has a real second cluster in cabinets and one strong hearth shop. Durango/Pagosa hearth presence is thinner than expected and worth a dedicated second batch.

## Towns producing nothing new worth qualifying
Craig, Meeker, Gunnison (Beleza only, held as backup), Cortez, Delta, Palisade, Clifton, Rifle, Carbondale, Aspen, Steamboat Springs (Hot Stuff held as backup).
