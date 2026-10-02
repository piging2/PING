# Round 95 research scratch: round-16 window-cleaning + garage-door near-miss verification, Western Colorado
Date: 2026-09-20
Workers: one research subagent. No Facebook (Pig down). Public web search only after a terminal browser-open failure.

## Scope honesty
This round re-verified the round-16 near-misses (window cleaning + garage doors, research date 2026-09-10), NOT the two already-qualified round-16 rows (Advanced Window Cleaning, Kooler Garage Doors, both verified 2026-09-10 and already in pipeline). Honest yield this round: **0 fully page-verified NEW qualifiers**. One near-miss (Curbside Cleaners) has strong own-domain-indexed email evidence but remains a near-miss until a live own-page check confirms it. Seven near-misses resolve to already-tracked or suppressed pipeline rows (verification upgrades noted, no new rows). Three names are permanent skips.

## Tooling caveat (2026-09-20)
One `browser_open` attempt (First Impressions Window Cleaning, https://firstimpressionsgj.com/) failed, and the fetch tool was declared terminal for the rest of the turn. All research after the page-verified section below rests on public search-index evidence unless marked page-verified. Any claim below marked search-indexed still needs one live own-page open before it can be promoted. Do NOT reproduce browser_open with curl, exec, or an invented endpoint this turn.

---

## Converted qualifiers (full field template)
None. The strict rule (own-site-published email copied verbatim, or a live own-site contact form, confirmed on the live own page) was not met by any near-miss business this round. The closest is Curbside Cleaners, kept in Still-near-miss below with its single converting check. Nothing was added to any pipeline, and no canonical files were touched.

---

## Verification upgrades to EXISTING pipeline rows (not new rows)

### U1. Bailey's Garage Doors & More, Rifle (pipeline tracked: leads, pipeline, JSONL)
- Upgrade: own site https://www.baileysgaragedoors.com/ opened live 2026-09-20; phone (970) 272-1711 CONFIRMED on own site. Locally owned and operated; serves Rifle, Vail, Roaring Fork Valley, Glenwood Springs, Avon and surrounding areas. Homepage "Request service" page confirmed live at https://www.baileysgaragedoors.com/request-service-form-page (service request route + night/weekend emergency service; form fields did not render in extracted text). The email bgdandmore@comcast.net still appears only in the company-issued press release, NOT in fetched own-site text, so the email route remains unverified.
- Stack: Hibu STRONG INDICATION (cdn.hibuwebsites.com assets).
- Actionable read: own site promises quick turnaround and repairs often starting within 1 to 3 days while intake runs through the service form + emergency route, implying intake dependency. Action: parent annotates the existing row; no new row.

### U2. Blue Jay Window Cleaning, Grand Junction (pipeline NEW/WATCH from round 89)
- Upgrade: own site https://bluejaywc.com/ opened live 2026-09-20. Founder Justin Rand and deliberately small family team confirmed; own site states Justin personally oversees customer communication, scheduling, operations, and quality control. Services: residential/commercial window cleaning, high-rise rope access, gutters, solar panels, house washing, screen repair. No email or contact form URL found in fetched own-site text; FAQ page rendered the malformed sentence "Please reach us at if you cannot find an answer" with no route. Phone (970) 260-2015 appears in search/map evidence but was not exposed in the fetched own-site page text.
- Stack: GoDaddy CONFIRMED (img1.wsimg.com assets).
- Actionable read: high-confidence AUTOMATION. Owner personally handles communication and scheduling, which is the classic on-ladder-no-one-answers pattern. Existing row remains WATCH/inconclusive for email/form route; no new row.

### U3. Montrose Garage Doors, Montrose (tracked as duplicate; research-discarded row)
- Upgrade: own site https://www.montrosegaragedoors.com/ opened live 2026-09-20. Phone (970) 240-9320 CONFIRMED on own site. Family-owned, locally owned, operating since 1999, 25+ years, residential and commercial work. Own site explicitly promises "Fast response times across the Western Slope." No email or live form visible in fetched text.
- Stack: Duda STRONG INDICATION (irp.cdn-website.com assets).
- Action: parent annotates the existing row with own-site-verified phone and speed promise; strict email/form qualification remains unmet. No new row.

### U4. Professional Garage Doors, Montrose (pipeline QUEUED; leads.md line 1918)
- Upgrade: own site http://progaragedoors.biz/ opened live 2026-09-20. Email pgdtammy@gmail.com reconfirmed verbatim on own site. Phone 970-249-8768 and address 4342 N Townsend Ave, Montrose, CO 81401-8166 published on own site. Own site confirms residential and commercial installation and repair and promises quick, efficient technician response.
- Action: existing QUEUED row route reconfirmed; no new row, no status change.

### U5. Squeegee Monkey Window Washing, Durango (pipeline NEW)
- Upgrade: own site http://squeegeemonkeydurango.com/ opened live 2026-09-20. Founder/owner Casey MacNiven confirmed; founded 2013; multiple trucks; nearly 2,500 customers; named team. Phone (970) 903-1581 CONFIRMED on own site. Live "Free Quote" form present on the homepage ("Fill out the form below and we will get back to you with a fast, no-obligation quote"); extracted text did not expose the individual fields.
- Stack: WordPress CONFIRMED (/wp-content/ assets).
- Action: existing row gets a form-route upgrade note; no new row.

### U6. Wenco Garage Doors, Delta (pipeline SKIPPED)
- Note: existing row already records the own-site contact page https://wencogaragedoors.com/contact.html (Weebly; fields Name/Phone/Comment/Email) and the suppression reason: customer contact form with no B2B/vendor invitation (customer-form, no vendor invite; draft saved 2026-09-12). Verified again this round and still suppressed. No new row, no revival.

### U7. First Impressions Window Cleaning, Grand Junction (pipeline NEW)
- Note: own-site fetch FAILED this round (https://firstimpressionsgj.com/ would not open; this failure made browser_open terminal for the turn). Route remains unverified on the existing row. Search/map evidence shows phone (970) 778-5376 and own domain http://firstimpressionsgj.com; no email or form found in search text. Action: parent keeps the existing NEW row marked route-unverified; the converting check is one successful own-site fetch.

---

## Still-near-miss (each with its single converting check)

### 1. Curbside Cleaners, Grand Junction (window cleaning / exterior cleaning) - strongest potential conversion, SEARCH-INDEXED ONLY
- Own domain: curbsidecleaners.com
- Search-indexed evidence (NOT page-verified): own-domain-indexed email estimates@curbsidecleaners.com published on curbsidecleaners.com/news/schedule-service/; own-site-indexed phone 970-260-2349; address 2536 Rimrock Ave, Grand Junction, CO 81505.
- Search-indexed own-site claims: family-owned in Grand Junction; insured; EPA-compliant exterior cleaning for homes, businesses, and public spaces; commercial service within 250 miles; remote quotes using photos/video/software; text/email reminders.
- Trade detail: pressure washing, window cleaning, gutters, graffiti removal, fleet/heavy equipment cleaning, event cleanup; residential and commercial.
- Stack: WordPress STRONG INDICATION (indexed page structure; site platform only). No FSM/CRM confirmed.
- A Jotform result at https://form.jotform.com/25337717178057 exists but its fields describe recurring house cleaning and it is NOT demonstrably linked to Curbside; do not treat it as their route without an own-site link verification.
- Actionable read: AUTOMATION primary, high confidence. Remote quotes plus text/email reminders already exist, suggesting fragmented intake/follow-up worth integrating.
- Priority if accepted from search-indexed own-site evidence: WARM.
- Dedupe: no "curbside" row in leads.md, pipeline.md, or JSONL (checked 2026-09-20).
- Converting check: one live open of curbsidecleaners.com/news/schedule-service/ (or the contact page) confirming estimates@curbsidecleaners.com printed on the page, or a live own-site form. Until that check passes, this stays a near-miss, not a qualifier.

### 2. Above All Window Cleaning and Services, Grand Junction (window cleaning / property services)
- Email remains directory-only: aboveallservices@yahoo.com (namesandnumbers.com; NOT own-site verified).
- Own domains (from round-16 brief): aboveallpro.com, windowcleaninggj.com, windowcleaninggrandjunctionco.com. No own-site contact page was opened this round.
- Search evidence: phone (970) 464-1400; named contact Josh Lammers (GJ Chamber, 2018); address 508 29 1/2 Rd, Grand Junction, CO 81504; 25 years in business; 7-day rain guarantee; serves Austin to Rifle plus Vail/Denver corridor; broad service list (window cleaning, screens, gutters, blinds, pressure washing, snow, property maintenance).
- Review baseline: Birdeye 4.6/291; Google 4.6/188; Angi 4.5/18. Low-star/no-show and follow-up complaints surfaced but were undated or years old. TRIGGER NO.
- Dedupe: no "above all" row in leads.md, pipeline.md, or JSONL (checked 2026-09-20).
- Converting check: one live own-site contact page open confirming aboveallservices@yahoo.com published on the site, or a live form.

### 3. Out Of Sight Window Cleaning, Durango (window cleaning)
- Own domain from search evidence: https://www.outofsightdurango.com/ (no page opened this round; URL from search-tool output, verbatim).
- Search evidence: phone (970) 749-7000; address 191 Valley Pl, Durango, CO 81303; 15+ years; residential/commercial window cleaning, pressure washing, solar panel and skylight work; free on-site estimates; open 7am-7pm daily.
- Review baseline: Birdeye 5.0/30; Porch 5.0/28. No low-star signal. TRIGGER NO.
- Dedupe: no "out of sight" row in leads.md, pipeline.md, or JSONL (checked 2026-09-20).
- Converting check: live own-site contact page showing a published email or form.

### 4. Grand Valley Garage Doors, Olathe/Delta (garage doors)
- Own domain: grandvalleygaragedoors.com (no page opened this round).
- Search/map evidence: phone (970) 216-5273; address 3230 5700 Trl, Olathe, CO 81425; owner Scott Petersheim; authorized Clopay dealer; 15+ years; residential and commercial install and repair; BBB A+ accredited. Directory-only email gvmobilescreen@yahoo.com is NOT own-site confirmed. Older directory data conflicts (an old Grand Junction address/phone) while current evidence points to Olathe/Delta and (970) 216-5273; use the current values.
- Third-party tech claims (WordPress, Google Analytics, Hotjar, Freshworks) are not own-site verified: grade at most WEAK INDICATION.
- Review baseline: Google 4.9/126. No low-star signal. TRIGGER NO.
- Dedupe: "grand valley" hits in leads.md/pipeline.md are only geographic descriptors of other towns, never this business; no Grand Valley Garage Doors row anywhere (checked 2026-09-20).
- Converting check: open the own-site homepage/contact route and confirm a published email or live form.

---

## Dedup discards / already tracked (verified this round, no new rows)
- Bailey's Garage Doors & More: tracked in leads, pipeline, and JSONL (pipeline notes at lines 1686, 2145, 2325). Verification upgrade U1 above.
- Blue Jay Window Cleaning: pipeline.md line 2261, NEW/WATCH from round 89. Verification upgrade U2 above.
- Montrose Garage Doors: research-discarded as a duplicate in later research. Verification upgrade U3 above.
- Professional Garage Doors (Montrose): pipeline.md line 747, QUEUED; leads.md line 1918. Verification upgrade U4 above.
- Squeegee Monkey Window Washing: pipeline.md line 1086, NEW. Verification upgrade U5 above.
- Wenco Garage Doors: pipeline.md line 1115, SKIPPED (customer contact form, no B2B/vendor invitation). Suppression note U6 above.
- First Impressions Window Cleaning: pipeline.md line 1021, NEW. Route still unverified, note U7 above.

---

## Skips with reasons (permanent unless noted)
- Prutch's Garage Door (Gunnison/Rifle): permanently excluded. Pipeline line 1116 records that it partnered with multi-state Guild Garage Group and acquired Kenny's Overhead Doors in October 2024. Corporate roll-up; no local buying authority.
- Overhead Door Company of Grand Junction: national franchise location. Excluded by the franchise/chain ban.
- Glassy Window Cleaning (Grand Junction): directory-only, no own site found. Excluded under the strict rule.

---

## Ecosystem notes
### Window cleaning
- Grand Junction remains the densest cluster: 6+ own-site shops, several advertising sub-hour response and same-day quotes. Blue Jay (owner personally handles calls/scheduling, Birdeye 5.0/232) and Above All (291 reviews, 25 years, huge service list) are the two with the clearest "site promises speed the crew cannot deliver while on ladders" pitch.
- Durango has 3-4 own-site window shops; Squeegee Monkey's free-quote form is now confirmed on its homepage, Out Of Sight's own site is known but unopened.
- Curbside Cleaners sits between window and exterior cleaning with a commercial footprint (EPA compliance, 250-mile commercial service, text/email reminders). Its own-domain-indexed email is the single best conversion lead in this round's near-miss pool.
- Review baselines for the near-misses: no dated review on or after 2026-09-08 with 2 stars or fewer, and no 3-star review mentioning phone/response/wait/scheduling, was found for any of the four near-misses. Undated complaints (Above All no-call/no-show chatter) never trigger.

### Garage doors
- Montrose/Delta is the densest garage-door cluster (Montrose Garage Doors, Professional Garage Doors, Wenco, plus the excluded Prutch's). Montrose Garage Doors has recent positive review momentum (loc8nearme 4.9/104, reviews dated September 2026).
- Grand Valley Garage Doors (Olathe/Delta, Clopay dealer, BBB A+ accredited, Google 4.9/126) is the cleanest genuinely-new near-miss in this segment, pending one own-site contact-route check.
- Segment learning from round 16 holds: garage-door shops here live on their inboxes (Gmail/Yahoo addresses are the norm, not the exception), so an email route is the natural qualification path, and the "your own site promises speed you cannot deliver without backup" angle fits fast-response positioning (Montrose Garage Doors promises "fast response times across the Western Slope" while one office line covers seven towns).

---

## Review baselines (near-miss candidates only; review-trigger rules apply)
- Rule: a review triggers only if dated on or after 2026-09-08 with 2 stars or fewer, or a 3-star review mentioning phone, response, wait, or scheduling. Undated reviews never trigger. No reviewers identified.
- Above All Window Cleaning and Services: Birdeye 4.6/291; Google 4.6/188; Angi 4.5/18. Low-star/no-show complaints surfaced but were undated or years old. TRIGGER NO.
- Out Of Sight Window Cleaning: Birdeye 5.0/30; Porch 5.0/28. No low-star signal. TRIGGER NO.
- Grand Valley Garage Doors: Google 4.9/126; BBB A+ accredited. No low-star signal. TRIGGER NO.
- Curbside Cleaners: HomeAdvisor 5.0; Angi 5.0/3. No dated reviews at all. TRIGGER NO.
- Already-tracked rows are excluded from review baselines (no NEW qualifier). Note for the existing row only: First Impressions Window Cleaning shows Birdeye 3.5/8 (5 five-star, 3 one-star) with old cancellation/no-show complaints (lowest-rated dated Jun 2019); not dated on or after 2026-09-08, so no trigger.
- Also verified for existing-row context (not triggers): Blue Jay Birdeye 5.0/232, Squeegee Monkey Birdeye 5.0/315, Montrose Garage Doors 4.9/104 with September 2026 positive reviews.

---

## Dedupe audit trail (2026-09-20)
Checked against leads.md, pipeline.md, and western-co-prospects.jsonl via exact name-variant greps. Confirmed still-unique (no rows anywhere): Curbside Cleaners, Above All Window Cleaning and Services, Out Of Sight Window Cleaning, Grand Valley Garage Doors. Confirmed already-tracked: Bailey's Garage Doors & More, Blue Jay Window Cleaning, Montrose Garage Doors, Professional Garage Doors (Montrose), Squeegee Monkey Window Washing, Wenco Garage Doors, First Impressions Window Cleaning. Confirmed suppressed: Prutch's Garage Door, Wenco Garage Doors (form). The two round-16 rows already qualified in round 16 itself (Advanced Window Cleaning, Kooler Garage Doors) were out of scope and not re-verified.
