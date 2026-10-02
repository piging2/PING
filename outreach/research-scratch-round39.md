# Round 39 research scratch (2026-09-13, ~02:15 MDT)

Segments: (a) holiday lighting / Christmas-light installers, (b) chimney sweep / fireplace / heating-stove service. Fall seasonality: holiday-lighting booking season opens NOW (Sept); chimney sweep season starts Sept.

## Archival pass (step 1)
Criteria: no email AND no phone AND no actionable website/form path AND no real signal (priority_state empty or WATCH, no last_signal).
- Checked all 24 rows with no email and no phone. All 7 EMPTY-priority rows had live, actionable own websites (verified live via fetch: highcountryhandyfam.com, forageandfetch.com, premiergroupaspen.com, Tomichi-plumbing.com, cslandscaping.co, rapidresponsegj.com all loaded). The 16 WARM and 1 HOT rows had real signals. Custom Flooring's "website" field held a phone number (303 392-1825), fixed into phone field.
- RESULT: 0 rows met all four dead-weight criteria. Nothing archived. Archive file untouched.

## Own-site contact enrichments (found while verifying sites, this round)
- Tomichi Plumbing (Gunnison, already in JSONL): own site publishes chris@tomichiplumbing.com and 9709016291 (from a client review block on their site). Fields updated.
- C.S. Landscaping (Fruita, in JSONL): own site publishes (413)214-3552. Note: 413 is a Massachusetts area code; recorded as published with caveat.
- Custom Flooring (Denver area, in JSONL): phone 303 392-1825 moved from website field to phone field.
- Note: C&S Landscaping's record was previously "C.S. Landscaping"; the site brands "C&S Landscaping". Name kept as-is to avoid dedupe confusion.

## New rows added (4; cap math: 296 + 4 = 300 ACTIVE, exactly at cap)
1. Stove Depot & Chimney Works (Grand Junction) - chimney sweep / fireplace / stove sales & install. Own site stovedepotcw.com, phone (970) 241-1400 own-site verified. 30+ yrs, CSIA/NFI techs, 2 showrooms. opportunity_primary=MISSED_CALL_LEAD_CAPTURE (high). WARM.
2. Ashes Away LLC (Durango) - chimney sweep / fireplace & stove sales & service. Own site ashesawaydurango.com (WP refreshed Apr 2026). 25+ yrs, CSIA/NFI, 4.8/93 Birdeye. Phone 970-375-7776 seen on BBB/directory only, NOT own-site verified, left empty with note. opportunity_primary=MISSED_CALL_LEAD_CAPTURE (medium). WARM.
3. Monument Lighting (Grand Junction) - holiday lighting install (seasonal + permanent). Own site monument-lighting.com (GoDaddy, thin). Formerly Vivid Christmas Lighting. No phone/email visible on homepage; "call or email us" CTA without details. opportunity_primary=MISSED_CALL_LEAD_CAPTURE (medium). WARM. website_quality=weak.
4. Steamboat Lightscapes (Steamboat Springs; serves Carbondale, Ridgway, Hayden, Craig, Montrose, Ouray, Telluride...) - holiday lighting + tree services. Own site steamboatlightscapes.com, phone 970.963.3070 own-site verified. Lighting division sells 1-3 yr contracts. opportunity_primary=MISSED_CALL_LEAD_CAPTURE (high). WARM.

## Near-misses / exclusions (deduped or weak)
- The Chimney Doctor, Ltd. (Grand Junction) - ALREADY IN JSONL (dedupe hit).
- Alpine Chimney Sweep LLC (Pagosa Springs) - already in JSONL.
- High Mountain Hearth (Montrose, chimney sweeps) - already in JSONL.
- Midtown Chimney Sweeps (Aurora, Denver franchise territory) - already in JSONL.
- Grand Mesa Trimlight (Grand Junction, trimlight.com franchise location page) - no local contact info on page; franchise dealer model, weak blue-collar fit. Skipped.
- Taussig Landscape (Grand Junction, holiday lighting service page) - larger established landscaper, lighting is a service division; marginal fit vs cap. Skipped.
- Wheatley Creek (Grand County) - Christmas lighting, but Grand County is outside Western CO core; expansion not yet authorized. Skipped.
- Colorado Christmas Lights LLC (Boulder/Denver, rocketreach data) - Front Range, out of geography. Skipped.
- Mighty Bright Holiday Lights (Telluride) - Thumbtack-only, 3 yrs in business, no own site found. Skipped.
- Kick Ash Chimney Sweep (Durango) - no own site found; third-party listings only. Skipped (weak per quality bar).
- Arlie's Chimney Sweep (Pagosa Springs) - BBB listing only, no own site found. Skipped.
- Vent Tech Chimney Sweeps (Grand Junction) - BBB listing only, no own site found. Skipped.
- Grand Valley Dryer Vent & Chimney Cleaning (Grand Junction) - BBB listing only, no own site found. Skipped.
- Animas Chimney Sweeps LLC (Durango) - phone (970) 385-2606 via namesandnumbers, no own site. Skipped.
- Be-Wise Chimney Sweeps (Durango) - phone (970) 385-4319 via namesandnumbers, no own site. Skipped.
- Clean Sweep Chimney Services / Wynne Enterprises LLC (Grand Junction, since 1985) - HomeAdvisor listing only, no own site found. Skipped.
- West Side Lighting (Carbondale) - lighting fixtures retail store, not an installer. Skipped.

## SOS new-business radar
Colorado SOS business database (https://co.colorado.gov/search-business-records) requires interactive form search; not operable by a generic research subagent. No new-filing rows tagged this round. RECOMMENDATION: route SOS trade-name searches (chimney, lighting, hearth, stove keywords) through a browser-task delegation next round.

## Drafts
Zero new email-route candidates: none of the 4 new rows has an own-site-verified email. Phone-route candidates: Stove Depot & Chimney Works, Steamboat Lightscapes (next_eligible_action notes this).

## SEO/AEO (step 4c)
- RAM Pest Control (HOT, Rifle): ai_discoverability set unknown -> strong. Observable evidence from rampestcontrol.net: clear service + location info (Rifle, Aspen, Vail, Roaring Fork Valley), service-area page, service pages, contact form, phone, testimonials, blog, consistent identity. No rankings claimed.
- Honk-Key Lock & Safe (HOT): left at moderate (no new observable evidence; no own website).
- Mr Patch Drywall LLC (HOT): left at strong (set previously).
- No new HOT rows this round.
