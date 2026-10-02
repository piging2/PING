# Research scratch — round 112 (2026-09-21)

Segments run: **HVAC** (corridor re-run; last dedicated round 71, ~40 rounds back, fresh per the >15-round rule)
+ **appliance repair** (last dedicated round 38, fresh). Both via delegated workers (HVAC worker, appliance worker)
with page-fetch verification; coordinator ran the dedupe gate against leads.md AND facebook-dms.md AND pipeline.md.

Geography held: GJ, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale ONLY.
Canonical JSONL NOT touched (at the 300-active cap); pipeline.md rows only. No em dashes anywhere in output files.

## Honest yield

- Researched: 29 total (14 HVAC, 15 appliance)
- NEW qualifiers added to pipeline.md: **1** (All Around Plumbing Heating And Cooling, form-route medium-low confidence)
- Contact-route upgrades on already-tracked rows: 4 (no new rows, recorded in pipeline.md round-112 note)
- Appliance strict-bar qualifiers: 0 (one fully-rendered phone-only near-miss; 5 provisionals need one page render)

## SEGMENT A: HVAC (corridor re-run)

Why-now: shoulder season before heating season. Furnace tune-up bookings now; no-heat emergency calls within weeks.
Snipps explicitly markets against call-center franchises ("We're not a call-center franchise").

### Re-verified already-tracked (dedupe out, intel upgrades recorded in pipeline.md)

- **Hawks Air Service Heating & Air Conditioning** (GJ, hawksairservice.com): EMAIL ROUTE UPGRADED. Own-site schedule-appointment page renders debbiehawks.air@gmail.com plus a real form (Name, Phone, Email, Service, Message). Was pipeline SKIPPED 2026-09-10 on a customer-only form; an own-site email route now exists and was never attempted. Opportunity: MISSED_CALL_LEAD_CAPTURE, medium (office hours 7:30-4 only, personal-Gmail intake, no after-hours capture). Stack: WordPress CONFIRMED. Note: own site lists (907) 257-7300 (apparent typo); Chamber lists (970) 257-7300. Independence: no franchise evidence; a YP entry linking aireserv.com looks like a directory data error.
- **Snipps Heating & Air Conditioning** (Montrose, snipps.com): family-run since 1996, independence re-verified. Form-customer route; 24/7 emergency phone + online booking already exist. Opportunity: AUTOMATION, medium (gap is intake/follow-up, not first contact). Stack: Webflow CONFIRMED; financing link leadwithcomfort.com STRONG INDICATION of third-party financing. Marketing-savvy: agency PR via Service Scalers / EIN Presswire.
- **Monarch Heating and Air Conditioning** (Clifton, monarchgj.com): own-site contact form re-verified (Duda CONFIRMED), Mon-Fri 8-4 only. Opportunity: MISSED_CALL_LEAD_CAPTURE, medium-high.
- **Fenix Home Services** (Fruita, fenixhomeservices.net): veteran-owned, independent, two-man shop, 7 AM-7 PM. Birdeye profile UNCLAIMED despite 179 Google reviews at 5.0. Opportunity: MISSED_CALL_LEAD_CAPTURE, medium-high.

### NEW qualifier added (1)

- **All Around Plumbing Heating And Cooling** (Palisade/Clifton, 3361 G Road Clifton, allaroundplumbinghvac.com): own site renders "Get a Free Quote" contact block with Email/Phone/Office labels + address; actual email address value did not render; 970.985.0350 on own site. Duda CONFIRMED. 15+ years local, serves Palisade/Delta/Fruita/Montrose, no chain signals. Opportunity: MISSED_CALL_LEAD_CAPTURE, medium-low (capture path thin; small crew). Priority: WATCH (form-route medium-low confidence; needs one browser verification pass before any submit). Dedupe clean on all three files.

### HVAC near-misses (no pipeline rows)

Phone-only on own site (no email or form rendered): Arctic Cooling & Heating GJ ((970) 248-9196), Stocker Heating and Cooling GJ ((970) 414-2026 / 970-644-5117), B&B Plumbing & Heating Rifle (family-owned since 1974), A-1 Heating Cooling And Plumbing GJ (family-owned since 1987, /contact-us/ = call only), Pioneer Heat & AC Montrose ((970) 901-0254). Weak/directory-only evidence: Dragon Heating & A/C Fruita (own site rendered 3 lines; service@dragonhvac.com only on directories). Geography exclusions: Cooleys Heating & Cooling (Hotchkiss, out of corridor); Pacific Sheet Metal (Aspen-first, excluded territory). No own site / broken site: Mad Dog Mechanical Montrose (parked domain); Myers Enterprises Carbondale (under construction); O'Neill Heating and Plumbing Carbondale (fetch failed, re-try later). Franchise exclusion: One Hour Montrose (national franchise).

## SEGMENT B: Appliance repair (fresh segment)

Why-now: pre-holiday refrigerator/oven breakdown surge (Thanksgiving/Christmas hosting). Every independent publishes weekday 8-5 hours, so evening/weekend breakdown calls go to voicemail. The Appliance Doctor's own "Special Summer Pricing valid August until end of September" confirms the industry's September pivot.

### Near-misses (evidence-bearing; no pipeline rows)

- **The Appliance Doctor** (GJ, 411 Glenwood Ave, appliancedrgj.com): ONLY own site fully rendered this round. Independent, Samsung/LG authorized warranty servicer, 10+ years. Phone-only: 970-773-1000; no email or form anywhere on the rendered page. Near-miss reason: phone-only. Stack: UNKNOWN.
- **D3 Appliance** (serves GJ, Fruita, Rifle, Montrose; d3appliance.com): multi-city regional operator + Colorado Springs warehouse; factory-certified employee model. Excluded: chain-like regional network, fails the owner-operator independence bar. FRESH REGIONAL-CHAIN OBSERVATION: looks local on single-city search; fails on footprint check.

### PROVISIONALS (own-site URL observed in profile/search results; page fetch blocked by tooling this turn, so NOT addable yet; next step = one render of site + contact page each)

1. **Affordable Appliance Repair** (GJ, 561 Grand Valley Dr; affordableapplianceco.com): strong independent signal (real storefront); 970-434-8496; Mon-Fri 8-5 + Sat 9-3. Probable MISSED_CALL_LEAD_CAPTURE (after-hours).
2. **Affordable Appliance LLC** (Delta, 339 Main St; applianceservicecolorado.com): family-owned since 2001; serves Delta/Ouray County/Montrose/Olathe; also offers hauling. Bare http domain suggests minimal web investment. Probable MISSED_CALL_LEAD_CAPTURE / NEW_BUSINESS_SETUP-adjacent digital revamp.
3. **Best Appliance Service** (Montrose, 2127 E Main St; bestapplsvc.com): pure in-home residential ("no longer sell parts over the counter or accept shop work"); classic one-tech urgent-repair model. Probable MISSED_CALL_LEAD_CAPTURE.
4. **Modern Appliance Co** (Delta, 152 Main St; modernapplianceco.com): appliance store + repair hybrid; long local history; lower urgency fit.
5. **Settles Appliance Service** (Fruita; settlesapplianceservice.com): Fruita location page exists; HQ independence unverified (needs HQ verification before outreach; possible multi-location chain signal).

### Appliance exclusions

Sears Home Services (national chain); True Appliance Repair / Bro's Handyman (lead brokers, 888/855 routing); Brand Source Appliance Service & Repair GJ (directory-only); D & C Services Montrose (phone-only); Deti Repair Service Montrose (commercial/restaurant equipment only, out of segment); Home Appliance Repair & Sales GJ (directory-only); A1 Dryer Vent Cleaning GJ (dryer vent only); vierascheibner.com, appliance-repair.us, appliancerepairnearme.cc, appliance-contractors.netlify.app (lead-broker doorway spam); Tri-River Appliance Montrose (dealer/service hybrid, no own site).

## Ecosystem / segment heat (appended to pipeline.md under "Round 112 ecosystem findings")

HVAC: fragmented independent owner-operator market; franchise presence limited to One Hour Montrose. Phone-first is the norm (6 of 11 rendered own-sites had no email or form); Duda/Webflow form sections and personal-Gmail emails are the ceiling. Lead-broker presence heavy around shops (ricehvacservices.com, hvac-hotline.com, unclaimed Birdeye/Angi profiles). Why-now: furnace tune-up season starting; no-heat emergencies within weeks.

Appliance repair: GJ/Montrose/Delta each have 1-3 real independents; Rifle and Carbondale show zero independent residential appliance repair with own sites (Sears/D3/brokers only); Collbran, Loma, Mack, De Beque, Palisade, Clifton produced none. Lead-broker doorway pages flood town-name queries while independents barely exist digitally = AEO_AI_DISCOVERABILITY angle. D3's multi-city footprint is this round's chain-reverification catch.

Cross-segment: the D3 observation reinforces the 2026-09-20 chain-reverification rule (re-check at outreach time). Review-intel spillover: Unrivaled Plumbing & Heating's Sep 10 5-star review documents internal message-relay friction ("reception did not relay my messages about the size of the snake needed for the job") = real, dated, owner-observable AUTOMATION evidence for a future follow-up touch. It is NOT a review trigger (5 stars, positively framed).

## Review-intel 6-sample (round 112) — source data

6 pipeline-NEW businesses, exact-grep verified as never review-checked (0 hits in scratch/reviews-round*.md, scratch/review-intel-round*.md, follow-ups.md):
1. Unrivaled Plumbing & Heating (Montrose) — 323 reviews, 4.7; recent all 5.0; NO trigger; intel above.
2. Tenminds Mechanical (GJ) — no Google aggregate surfaced; WordPress CONFIRMED blog; NO trigger.
3. The Tint Shop Co (GJ) — no aggregate surfaced; TintWiz quoting CONFIRMED (third-party stack); NO trigger.
4. Prime Painting Experts (Fruita) — site claims Google 5.0 / FB 94% / Yelp 5.0; DripJobs CONFIRMED; NO trigger.
5. Good Friend Inspections LLC (GJ) — Birdeye 4.9/51 UNCLAIMED; BBB A+; NO trigger.
6. Kokopelli Home Services (GJ) — HomeAdvisor 5.0/7; 8hr-1day response times = speed-to-lead gap; NO trigger.

0 triggers this round. No review-triggered outreach drafted. Full notes in scratch/reviews-round112.md; table logged in follow-ups.md under "## Round 112 — review-intel 6-sample".
