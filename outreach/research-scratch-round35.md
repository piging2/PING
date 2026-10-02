# Round 35 research scratch notes — 2026-09-12
Two segments: (1) GUTTER SERVICES (gutter cleaning + gutter installation), (2) GARAGE DOORS (second pass). Western Colorado towns only. Qualified candidates: 0 gutters, 2 garage doors. JSONL additions file: ~/workspace/outreach/jsonl-additions-round35-research.jsonl

## SEGMENT 1: GUTTER SERVICES — 0 qualifiers

### Seasonal heat
Mid-September: fall leaf season is the gutter segment's peak inbound window. Quote intent starts now; cleanouts book late Oct/Nov. Nearly every own site leads with phone ("call for free estimate") because owners are on ladders/roofs all day and prefer live calls. That makes MISSED_CALL_LEAD_CAPTURE the single strongest angle for this trade when a candidate qualifies, followed by NEW_BUSINESS_SETUP for small owner-operators with no real site.

### Best pitch angles for this trade
1. MISSED_CALL_LEAD_CAPTURE: owners advertise phone-first and are on ladders while fall-quote calls come in; after-hours/weekend quote requests go to voicemail.
2. WEBSITE_REVAMP: many have weak or template sites with no email, no form, and Facebook as their real storefront.
3. SEO/AEO: "gutter cleaning near me" searches surface directories and national chains (Ned Stevens, LeafFilter) above the local shops; several locals are invisible in AI answer engines.

### Common skip patterns seen
- Phone-only own sites (the dominant pattern): Prestige Gutters, Mount Garfield, Pacific Sheet Metal, Hines Roofing, Western Slope Seamless Gutters, Southwest Home Innovations, DSG Colorado.
- Google business.site pages as the only "site" (Red Rock Gutters GJ, Ground Up Gutters Montrose, Mr. M Seamless Gutters Rifle): could not verify any email/form on them; most are phone-only.
- Directory-only listings (Yelp/Angi/HomeAdvisor/Birdeye/Manta): Mesa Seamless Gutters, AAA Seamless Gutters, ATG Seamless Gutters, Drain Right Seamless Gutters (Delta).
- Template SEO pages from out-of-area companies: Complete Gutter Services (Chicago) with Palisade CO landing page; Seamless by Juan's edan.io SEO page (also "might be permanently closed").
- Dead/parked: Discount Gutters (discount-gutters.com is an "Under Construction" Namesandnumbers park); Precision Gutters (precisiongutters.co unreachable).
- National chains/franchises: LeafFilter, Ned Stevens. Dedup skips: Four Seasons Gutter Systems (already QUEUED in pipeline.md, has round-13 draft), Whitey's Home Improvement, Fort Comfort Gutters, Mile High Gutter, Top Notch Gutter Services.

### NEAR-MISS table (re-verification targets)

| Business | Town | Website | Why skipped | Re-verification target |
|---|---|---|---|---|
| Prestige Gutters LLC | Grand Junction | https://www.prestigeguttersgj.com/ | Homepage fetch (2026-09-12) showed phone 970-208-3332 only; no email, no form visible | Fetch contact page on own site; check for email or quote form |
| Mount Garfield Gutters & Stucco LLC | Grand Junction | https://mtgarfieldguttersstucco.com/ | Phone 970-260-0255 only on homepage; reads like a generic template build (stock sections, "Serving 12 locations") | Check contact page for form/email; confirm it is the real GJ business vs template |
| Precision Gutters | Grand Junction | http://precisiongutters.co/ | Site failed to load on two fetch attempts; nothing verifiable | Retry site load; if dead, mark dead-site near-miss |
| Discount Gutters | Grand Junction | http://www.discount-gutters.com | Confirmed dead/parked ("Under Construction" Namesandnumbers page, 2026-09-12) | Confirm with one more load next round; likely permanent skip |
| Red Rock Gutters LLC | Grand Junction | https://red-rock-gutters-llc.business.site/ | Google business.site only; could not fetch page; phone 970-234-8103 per listings | Open business.site page; check for email or contact form |
| A Better Gutter | Grand Junction | http://abettergutterco.localsearch.com | Lead-broker/directory domain (localsearch.com), no own site | Confirm no own domain; likely permanent skip |
| Silver Lining Gutter Cleaning / Seamless Gutters By Juan | Grand Junction | http://seamless-by-juan.jany.io/ | SEO aggregator page (edan.io); listing notes "might be permanently closed"; phone 970-463-6482 | Verify business still operating; no own site found |
| Hines Roofing Seamless Gutters | Montrose | http://hinesroofingllc.com/ | Primary trade is roofing, not gutters; homepage phone-only (970-258-9535), no email/form | Phone-only near-miss; roofing-primary, low gutter fit |
| Western Slope Seamless Gutters | Fruita | http://westernslopegutters.com/ | Homepage fetch returned testimonials only; no email, form, or phone visible on own site; phone 970-434-2450 from listings; founded 1998, ~3 employees | Find contact page on own site; check for email/form |
| Ground Up Gutters Systems Ltd | Montrose | https://ground-up-gutters-systems-ltd.business.site/ | Google business.site only; could not fetch | Check business.site page for form/email |
| Mesa Seamless Gutters LLC | Fruita | (none; HomeAdvisor only) | Directory-only (HomeAdvisor, 5.0 from 39 reviews) | Check for an own site; veteran-owned, emergency services offered |
| AAA Seamless Gutters | Fruita | (none; Manta only) | Directory-only (Manta); family-owned, 1-4 employees | Check for an own site |
| ATG Seamless Gutters | Montrose | (none; Birdeye only) | Directory-only (Birdeye, 3.1 stars, 8 reviews) | Check for an own site |
| Drain Right Seamless Gutters | Delta | (none found) | No own site found in search | Check for an own site |
| Complete Gutter Services (Palisade page) | Palisade (page only; Chicago company) | https://completegutterservicesllc.com/co/palisade/ | Template SEO page; content mentions Chicago throughout; not a Western CO business | Permanent skip |
| Pacific Sheet Metal (Colorado Home Services) | Rifle | https://www.pacificsheetmetal.net/ | WordPress site (wp-content); phone-only contact (970-963-6563); primary trades HVAC/roofing/sheet metal, gutters secondary | Check contact page for form/email; roofing/HVAC-primary, marginal gutter fit |
| Mr. M Seamless Gutters & Roofing LLC | Rifle | https://mr-m-seamless-gutters-roofing-contractor.business.site/ | Google business.site only; phone 970-987-6242 | Check business.site page for form/email |
| Southwest Home Innovations | Durango | https://www.southwesthi.com/ | Own site; gutter service page fetch showed phone 970-749-5415 only, no email; "schedule your free estimate" CTA may link to a form not captured | Check contact page for quote form/email; locally owned, "No Ghost Guarantee" messaging is a clean MISSED_CALL angle |
| DSG Colorado (Durango Seamless Gutter & Standing Seam Roof) | Durango | https://durangoseamlessgutterandroofing.org/ | Phone 970-759-0522 only on homepage; family owned since 1999; site claims 4.3 stars across Four Corners | Check contact page for form/email |
| Farha Roofing | Durango | https://farharoofing.com/gutters/ | Primary trade roofing; gutters is one service page | Phone-only/contact check needed; roofing-primary, marginal fit |
| Storm King Roofing LLC | New Castle | https://stormkingroof.com | Outside town list (New Castle); primary trade roofing | Out of segment geography; marginal fit |
| Seamless Design Inc | Silt | http://www.rainguttersbyseamlessdesign.com/ | Silt not in the town list; no own-site verification done this round | Out of town list; skip unless segment stays at zero |
| Old School Roofing | Grand Junction | (google.com only) | No own site | Skip |

### Segment assessment
The qualifying pool for gutters is exhausted at the strict bar within the listed towns; most operators are phone-first. Consider accepting business.site contact forms if a Google business.site page exposes a working message form (Red Rock, Ground Up, Mr. M) — that would have produced 2-3 candidates. Four Seasons Gutter Systems GJ already has an email draft queued in the pipeline (info@fourseasonsgutter.com), so no action needed. New-business radar angle: no SOS filings checked this round; a future round could run the SOS new-filing check for gutter trades filed in the last 60-90 days.

## SEGMENT 2: GARAGE DOORS (second pass) — 2 qualifiers

### Seasonal heat
Garage doors are steady year-round with a pre-winter ramp: broken springs, off-track doors, frozen bottom seals, and opener failures spike as temperatures drop. Shops advertising 24/7 or same-day emergency service while running one phone line and a basic form are the missed-call targets. No new-business filings surfaced this round.

### Best pitch angles for this trade
1. "Your own site already promises speed you cannot deliver without backup" (several shops claim 24/7 or sub-hour response).
2. Pre-winter weatherization / broken-spring surge: September/October tune-ups and seal replacements as a scheduled-service play.
3. Email-first outreach for garage door shops: they live on inboxes more than other trades (Gmail addresses are the norm).

### Common skip patterns seen
- Phone-only own sites (Montrose Garage Doors, Bailey's Garage Doors & More).
- Contact forms referenced in copy but fields not rendering in text fetch (Grand Valley, Professional Garage Door Cortez) — cannot be confirmed working.
- Corporate roll-ups: Prutch's Garage Door now partnered with Guild Garage Group; Kenny's Overhead Doors acquired by Prutch's (Oct 2024). No longer independent — skip permanently. (Kenny's already in JSONL from facebook-round29; leave as-is.)
- Franchises: Overhead Door Company of Grand Junction, Overhead Door Company of Four Corners.
- Template/SEO pages: cherokeedoor.top (placeholder "John Doe" review, address shared with All Access); venusgaragedoorrepair.com unreachable, 860-area (CT) phone in directories — looks like a lead farm.
- Directory-only, no own site: Doors & More LLC (Pagosa Springs), A-1 Garage Doors (Steamboat), Advanced Garage Doors (Steamboat).
- Wrong business / out of region: mckeedoor.com is an Ohio/Kentucky commercial door company, not Cortez; DeVilbiss Garage Doors is Farmington NM-based.
- Dedup skips: E&E Door and Window, Kooler Garage Doors, Colorado Overhead Door Company, Smart Garage Door Service, Colorado Premier Garage Doors, Preferred Garage Doors, American Windows & Doors.

### NEAR-MISS table (re-verification targets)

| Business | Town | Website | Why skipped | Re-verification target |
|---|---|---|---|---|
| Bearfoot Garage Doors | Pagosa Springs/Durango | bearfootgaragedoors.com | Phones + "Make An Appointment / Let Us Call You" form referenced, but form does not render in text fetch; no published email | Live-browser check that appointment form renders/submits; look for published email |
| Grand Valley Garage Doors | Delta (serves GJ/Montrose) | grandvalleygaragedoors.com | Phone (970) 216-5273; contact page copy says "fill out the form below" but fields do not render in text fetch; no email | Verify contact form renders and submits; check footer for email |
| Bailey's Garage Doors & More, Inc. | Rifle (serves Roaring Fork/Avon) | baileysgaragedoors.com | Phone-only ((970) 272-1711); hibu builder site; "Request Service" link exists but unverified | Check Request Service form renders; search for published email |
| Montrose Garage Doors | Montrose | montrosegaragedoors.com | Phone-only (970) 240-9320; GoDaddy builder site | Contact page check for email or form |
| Professional Garage Door | Cortez | professionalgaragedoorco.com | Phone (970) 565-8400; contact page copy mentions a form but fields do not render | Verify the contact form renders |
| All Access Garage Door Inc. | Steamboat Springs | allaccesssteamboat.com | Contact page shows mailing address + hours only; phone (970) 819-6047 from directories | Find published email or working form on own site |
| Doors & More LLC | Pagosa Springs | none found (yellowpages lists socoww.com/contact) | Directory-only; family-owned since 1991 per MapQuest | Check socoww.com for own-site email/form |
| Quality Garage Doors | Grand Junction | unknown (cylex listing only) | Own site not yet identified | Find and verify own site + email/form |
| Monument Garage Door, LLC | Grand Junction | unknown | Own site not yet identified | Find and verify own site + email/form |
| Mesa Door Systems | Grand Junction | unknown | Own site not yet identified | Find and verify own site + email/form |
| Venus Garage Door Repair | Gunnison | venusgaragedoorrepair.com (unreachable) | Site failed to load; 860-area phone in directories — possible lead farm | Re-check site availability later; treat as suspect |
| Prutch's Garage Door | Gunnison/Rifle/Pueblo | prutchsgaragedoor.com | Partnered with Guild Garage Group (multi-state alliance); corporate roll-up | Skip permanently (no longer independent) |
| Kenny's Overhead Doors | Rifle | n/a | Acquired by Prutch's Garage Door Oct 2024 (retained name, under roll-up) | Skip permanently |
| Cherokee Door | Steamboat Springs | cherokeedoor.top | Template SEO page: placeholder "John Doe" testimonial, address shared with All Access | Skip; real shop is directory/phone-only |

### Qualifiers this round
1. **Ski Town Garage Doors** (Steamboat Springs) — info@skitowngaragedoors.com verified on own homepage (https://skitowngaragedoors.com/); (970) 236-1277. Zyro builder (STRONG INDICATION). WARM, MISSED_CALL_LEAD_CAPTURE high confidence: site promises emergency service with 60-90 min after-hours response but only inbound routes observed are one phone line + one email; owner-led crew (own-site testimonials name Larry), pre-winter freeze season is the pitch.
2. **Wenco Garage Doors** (Delta) — working own-site Weebly contact form verified at wencogaragedoors.com/contact.html; owner Lewis Wengerd named on own site; 970-975-1455. Weebly (STRONG INDICATION). WARM, MISSED_CALL_LEAD_CAPTURE medium confidence: claims 24/7 service but only one phone line + basic form for a small family shop; off-track emergencies at night get no instant capture.
