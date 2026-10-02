# Round 94 research scratch: locksmiths + carpet/upholstery cleaning, Western Colorado
Date: 2026-09-19
Workers: two parallel research subagents (locksmiths; carpet/upholstery). No Facebook (Pig down). Web search + browser.open only.

## Scope honesty
Locksmiths: 5th Western Colorado pass (rounds 26, 32, 66, 88 before this). Carpet/upholstery: 5th WCO pass (rounds 21, 41, 62, 64, 76 before this). Both pools are heavily worked. Honest yield this round: **1 verified qualifier** (carpet), **2 route-verification upgrades to existing pipeline rows**, **0 locksmith qualifiers** (tooling failure, not absence of candidates; 15 near-misses logged with converting checks).

## Tooling caveat (2026-09-19)
browser.open was flaky this run: the locksmith worker hit service-level fetch failures on 5 of 6 attempts (only verblocksmith.com homepage loaded, thin content, no contact info visible); the carpet worker had mixed success (several live opens succeeded, several failed). All "own site exists" claims in the near-miss lists rest on search-engine evidence unless marked page-verified. A rerun with healthy page fetch should convert several near-misses quickly since own domains are known.

---

## SEGMENT 1: Carpet and upholstery cleaning

### Qualified candidates (1)

#### 1. Avalanche Carpet, Upholstery Cleaning, & Flood Restoration — Carbondale
- Trade detail: carpet, upholstery, tile/grout, flood restoration, mold remediation; residential and commercial of any size
- Own site: https://avalancheproclean.com/ (opened live 2026-09-19)
- Contact route: phone-route. Own-site phone: 970-963-8000. Email: none observed on own site.
- Owner: not stated on own site. Size: independent, family-owned and operated (own-site claim).
- Own-site facts (KNOWN): 20+ years on the job, reputation since 1997; 24-hour flood emergency response; IICRC certified; homepage has "Book Carpet Cleaning Now" and Contact Us link; serves Basalt, Aspen, Snowmass, El Jebel, Marble.
- Stack: WordPress CONFIRMED (own-site wp-content image paths, site platform only). Booking-link destination UNKNOWN (not inspected). No CRM/FSM/booking software signal observed.
- Actionable stack read: WordPress + phone/booking-link intake, no visible automation -> likely friction: emergency flood calls outside hours hit voicemail; quote/booking follow-up manual. Possible opportunity: MISSED_CALL_LEAD_CAPTURE with AUTOMATION secondary. Confidence: medium.
- Opportunity primary: MISSED_CALL_LEAD_CAPTURE. Evidence: 24-hour flood emergency response with phone-heavy intake; family-run shop, every emergency call arrives while techs are on jobs. Confidence: medium.
- Priority: WARM (phone-route only; no email route).
- Verification notes: homepage + contact page opened live 2026-09-19; phone 970-963-8000 verified on own site; no email observed; NOT in leads.md / pipeline.md / JSONL under any variant (checked 2026-09-19).

### Verification upgrades to EXISTING pipeline rows (not new rows)

#### U1. Great Divide Cleaning Svc — Craig (pipeline NEW, research-round62 WATCH + research-round76 WATCH)
- Upgrade: own site https://www.greatdividecleaningservice.com/ homepage opened live 2026-09-19; phone 970-824-4103 CONFIRMED as own-site published (was directory-only). Locally owned, family operated, 30+ years, owner speaks with customers and is on-site for every project; same-day and emergency water-damage service. Duda STRONG INDICATION (irp.cdn-website.com assets). No email observed. Action: parent annotates the existing row with own-site-verified phone; no new row.

#### U2. C.A.R.E. Cleaning & Restoration Experts — Cortez/Dolores (pipeline NEW, research-round76 WATCH)
- Upgrade: own site https://swcare.com/ confirmed live 2026-09-19; phones 970-564-0800 (Cortez/Dolores) and 970-247-2626 (Durango) published on own site; WordPress CONFIRMED; contact form CONFIRMED; homepage has an "Email Us" link (NOT yet opened, one-link verification away from email-route). Since 2003 (23+ years); water mitigation, structural drying, smoke/fire, mold, biohazard, commercial cleaning, upholstery, area rugs, janitorial; 24/7 emergency; serves property managers, business owners, homeowners. Action: parent annotates the existing row; opening the "Email Us" link is the single converting check for an email route.

### Dedup discards (already pipeline-tracked; verified again this round, NOT re-added)
- Mr. Vac Cleaning & Restoration (Glenwood Springs): leads.md QUEUED (round 22 draft), pipeline.md QUEUED 2026-09-10, JSONL tracked. info@mrvac.net already the route. Round-73 dedup log already held it.
- Best Cleaning & Disaster Restoration Services (Durango, bestcdrs.com, 970-235-9151): pipeline.md NEW (WARM) line 1374.
- Bravo! Cleaning & Restoration (Cortez, bravocleaning.com, 970-565-9279): pipeline.md NEW (WARM) line 1375 and NEW (WATCH) line 1774.

### Near-misses (each with its single converting check)
1. Timberline Carpet and Upholstery Care, Montrose — old own domain exists but direct open failed; archive/directory text shows Dave Simmons and Ede, phone (970) 417-4489. Check: live own-site homepage/contact page showing phone or email.
2. CPR Carpet Cleaning and Water Damage, Grand Junction — own domain https://www.24hrcpr.com surfaced via directories; open failed. Check: live own-site phone/email. Lower priority (GJ heavily worked).
3. Sunrise Carpet Cleaning, Snowmass Village/Basalt — carpet, rugs, upholstery since 1977; Bryan Matthies named president. No own site found. Check: locate and open current own site.
4. Ultimate Carpet & Upholstery Cleaning, Glenwood Springs — directory-only phones and email; no own site. Check: find live own site publishing contact info.
5. O'smalley's Carpet & Upholstery Cleaning, Paonia — directory-only. Check: locate live own site.
6. A Plus Carpet and Air Ducts, Paonia — directory-only. Check: locate live own site.
7. Classic Carpet & Upholstery Cleaning, Carbondale — directory-only, 2091 Panorama Dr, phones (970) 309-5222 / (970) 963-8883. Check: locate live own site.
8. The Last Detail / The Last Carpet Cleaning, Carbondale — Jim Caldwell, (970) 963-9000, PO Box 725; no own site found. Check: locate live own site.
9. You Name It - We Can Do It, Mancos — own domain http://www.younameitwecandoit.com/ surfaced but reads handyman-primary. Check: open own site, confirm carpet/upholstery genuinely offered plus published contact.
10. Egger Cleaning & Handyman Services LLC, Meeker — own domain http://www.eggerbusinesshub.com/; carpet relevance unconfirmed. Check: open own site, confirm trade fit plus contact route.
11. Royal Restoration, Montrose — directory surfaced http://www.royalhelpme.com/ and carpet/restoration work. Check: open own site, verify contact route.
12. Maid 2 Impress — own site https://maid2impress.net advertises commercial carpet cleaning serving GJ, Fruita, Clifton, Palisade, Rifle, New Castle, Glenwood Springs, Carbondale, Montrose. Check: open homepage/contact, verify phone/email and independence.
13. Green Junction Carpet Cleaning, LLC, Clifton — brand-new LLC filed 2026-06-22 (fits new-business radar); no own site found yet. Check: locate live own site.
14. Directory-only cluster (check in each case: find live own site publishing contact info): Colorado Clean Pro Carpet (Palisade); High Country Carpet Care & Restoration (Glenwood); Advanced Carpet Care & Restoration (Glenwood); Winn's Pro Cleaning Systems (Glenwood); Affordable Carpet Care (Glenwood); Durango Carpet Cleaning (Durango).

### Ecosystem notes: carpet/upholstery cleaning
- Segment heat: WCO carpet/upholstery overlaps heavily with restoration, janitorial, and emergency mitigation; Cortez/Four Corners shows the strongest heat. Independents dominate; national franchises (Stanley Steemer, Chem-Dry, Oxi Fresh, COIT, ZEROREZ, SERVPRO, ServiceMaster, Heaven's Best) encountered and excluded.
- Remote pockets (Meeker, Norwood, Silverton, Ridgway, Ouray, Hotchkiss, Cedaredge, Paonia, Ignacio, Dolores, Mancos) produced mostly lead-gen templates, directories, and chains rather than verifiable local own-site operators. Nothing invented to fill the gap.
- Aspen/Basalt/Carbondale demand is served by valley-wide providers (Carbondale, Glenwood Springs, Snowmass) rather than many town-specific operators.
- Seasonal (INFERRED, labeled): mid-September = plausible fall/pre-winter cleaning demand, move-out/turnover work, second-home/property-manager activity in Aspen, Snowmass, Basalt, Carbondale, mountain towns. Restoration overlap gives a strong missed-urgent-call angle: dispatch intake, quote follow-up, property-manager communication.
- Skip patterns: dead/hijacked domains recur in this segment (prior rounds: DeJulio's, Black Bear, Rash & Son); handyman-primary businesses with carpet as a side line; commercial-janitorial firms where carpet is incidental.

---

## SEGMENT 2: Locksmiths

### Qualified candidates
None this round. The strict rule (own-site published email OR own-site-verified phone OR unmistakable B2B/vendor-inviting route, confirmed on the live own site) was not met by any business because the browser page-fetch service failed on nearly all contact-page attempts. No candidate was added to any pipeline; no files written. This is a tooling throttle, not proof of an empty pool.

### Near-misses (all need one live own-site check)
A. Locksmith of Craig | Craig — residential/commercial/automotive, 24hr emergency. 3643 Westridge Ct, Craig CO 81625. BBB: 7 years, A+ (not accredited); Google 12 reviews 4.7. Own site: verblocksmith.com (homepage loaded live once, thin, no contact info visible). Owner in reviews: Randy ("Randi"). Phone (970) 824-5772 directory-only. Stack UNKNOWN. INFERRED signal: a published 1-star review states the reviewer called, texted, and left voicemail for a car lockout and got no response despite the site's 24hr-response claim; several 5-star reviews praise fast same-day response (mixed = inconsistent call handling, solo-operator pattern). Opportunity: MISSED_CALL_LEAD_CAPTURE, medium-high. Route: phone-route. Converting check: one successful open of verblocksmith.com (or its contact page) to confirm the Call link tel: number or any published email.

B. Sharp Locks | Cortez — genuinely new name (not on dedupe). 705 Memorial Dr, Cortez CO 81321. Owner per referral thread: Cody Sharp. Own site: sharplockspremium.com (exists per search; could NOT open). Phone +1 (970) 739-3278 directory-only. Stack UNKNOWN. Opportunity: MISSED_CALL_LEAD_CAPTURE, low. Priority WATCH. Converting check: live open of sharplockspremium.com contact page.

C. Affordable Mobile Locksmith, LLC | Clifton — 24/7 mobile, GJ area. 3238 I-70BL Site 116, Clifton CO 81520. Own site: amlgj.com (known from directory listing; could NOT open). Phone (970) 822-5625 directory-only. Stack UNKNOWN. Opportunity: UNKNOWN, low. Priority WATCH. Converting check: live open of amlgj.com.

D. Simmons Lock & Key | Delta — full-service mobile, installs/repairs, safes, emergency lockouts. 695 Hwy 50, Delta CO 81416. Hours Mon-Fri 9-5, Sat-Sun on call. Family owned. Owner: Floyd Miller (stated on Delta Area Chamber member page). NO own site found; chamber listing has a "Send Email" button (chambermaster route, not own-site). Phone (970) 874-4202 directory-only; second line (970) 242-5562 (Uncompahgre) may be same operator. Opportunity: MISSED_CALL_LEAD_CAPTURE (on-call weekends + solo/family operator), medium. Converting check: locate an own site; if none exists, WEBSITE_REVAMP angle is the play.

E. 4 Seasons Locksmithing LLC | Delta — 577 Ash Mesa Rd. Phone (970) 874-3614 directory-only. No own site found. Opportunity UNKNOWN, low. WATCH. Converting check: locate an own site.

F. Rifle Lock & Safe | Rifle — phone (970) 625-3357 directory-only ("founded 1981" per one directory). No own site found. Opportunity UNKNOWN, low. WATCH. Converting check: locate an own site.

G. Rocky Mountain Locksmith & Embroidery / Rocky Mountain Locksmith | Hotchkiss — 204 E Bridge St, Hotchkiss CO 81419. Phones (970) 872-7500 (directory), (970) 778-7632 (SAVTA member profile, Donald D. Ludwig, PO Box 841). CAUTION: Colorado SOS entity "rocky mountain locksmith and embroidery llc" DELINQUENT since 2018-08-01 (agent Jennifer Ludwig, Crawford CO); may have folded or rebranded. No own site found. Opportunity UNKNOWN; verify active operation first. Converting check: confirm still operating + locate own site.

H. North Fork Lock and Key | Hotchkiss — possible successor to G (YP: "5 Years in Business, open 24 hours"). 409 E Bridge St, Hotchkiss CO 81419. Phone (970) 389-6218 directory-only (also (970) 778-7836 on one YP listing). No own site found. Opportunity UNKNOWN, low. WATCH. Converting check: locate own site; confirm relationship to Rocky Mountain Locksmith.

I. Ken's Keys and Locksmith Service | Clifton — 1701 S Tejon St. Directory only (starofservice.us); no phone surfaced. Converting check: find phone or own site; nearly zero footprint.

J. Bob's Lock & Key | Ignacio — phone 970-385-4870 (directoryplus.com); PO Box 3456, Durango 81302. Directory page shows "Visit Website" but no URL surfaced in snippets. Opportunity UNKNOWN, low. Converting check: resolve the website URL from the directoryplus listing.

K. Lee's Keys | Steamboat Springs — (970) 871-9161, directory-only.
L. Dwight's Lock & Safe | Steamboat Springs — 3317 Willowbrook Ct; (970) 367-4269, directory-only.
M. ACC Lock and Key | Steamboat Springs — described as local family-owned, serves Routt/Moffat counties; MapQuest "Generated from the website" implies an own site exists, URL unknown. Converting check for K/L/M: locate own sites / resolve ACC's site URL.

N. Glenwood trio (all directory-only, carried over): After Hours Lockout (GWS, (970) 309-3805); Alpine Locksmith (GWS, (970) 379-9145); Glenwood Lock & Key (GWS, (970) 945-7561). No own sites found for any.

O. J&J Stereo Auto Glass Window Tint and Locksmith | Delta — (970) 628-6163, 1302 Meeker St, 4.4 stars/70 reviews. SKIP: locksmith is secondary to car-audio/tint/glass; weak fit.

### Skips with reasons
- Colorado Locksmith Company (coloradolocksmithcompany.com, (970) 426-1067): geography — evidence places it at 4885 Bittercreek Dr, Colorado Springs = Front Range, excluded.
- Minute Key kiosks (Craig, Rifle, Delta Walmarts): franchise/kiosk pattern.
- Lead-gen templated pages (not real businesses): howardskeyandlock.com, moreiralocksmith.com, locksmithscolorado.com, locksmith-near-me.us, 1800unlocks.com, rescuelocksmithservices.com, americanlocksmithsservice.com, diallocksmithservices.com, local-locksmith-usa.com, denver-locksmith.net.
- Samuelson True Value (Meeker/Craig): hardware store with key-cutting, not a locksmith.
- Intoxalock (Delta): ignition-interlock installer, not a locksmith.
- D&S Towing, M&H Towing, Bearded Wonder Service (Silverton handyman): towing/auto, not locksmiths.
- Blackhawk Products (Dolores, blackhawk7.com): software company, miscategorized in map data.
- Empty pockets (no independent locksmith found after searching): Meeker, Palisade, Silverton, Norwood, Naturita, Ouray, Ridgway, Redstone, Marble, Cedaredge, Paonia, Bayfield, Mancos, Dolores, Ignacio (directory-only Bob's), Craig (only Locksmith of Craig + kiosks).

### Ecosystem notes: locksmiths
- Segment heat: extremely thin in the priority pockets. Most sub-5k towns have zero independent locksmiths; the regional map is dominated by GJ/Fruita/Montrose/Steamboat/Durango shops and saturated with national lead-gen SEO running identical templated city pages for every town searched. In those pockets the one solo operator holds a local monopoly (good leverage, but zero competition-driven urgency).
- Seasonal (INFERRED): mid-September pre-winter is strong for lockout calls (first cold snaps, hunting-season travel, school-year routine resets); missed-call capture is seasonally natural for 24/7 emergency operators.
- Pitch angles: (1) the Craig 1-star review gives a ready-made missed-call hook IF verified (no-response claim vs 24hr-response promise); (2) several operators have NO own site at all (Simmons Delta, Rifle Lock & Safe, North Fork) = website-revamp angle with the portfolio proof asset as the natural opener; (3) heavy lead-gen saturation in their towns = AEO/AI-discoverability angle (independents invisible where they should dominate).
- Skip patterns: hardware stores and towing shops masquerading as "locksmith" listings; ignition-interlock locations; kiosk chains. Search result quality for this segment is poor: ~60% of hits are templated lead-gen pages, not businesses.

---

## Fallback segment note
The residential water treatment / softening / filtration fallback was NOT triggered this round. Reason: carpet produced verified results (1 qualifier + 2 route upgrades), and the locksmith throttle was own-site verification tooling flakiness, not an empty segment (15 near-misses with known converting checks). The fallback remains available for a future round; the engine's Pig-side verification pass can convert near-misses A, B, C (locksmith) and the carpet near-miss list before spending a new segment pass.

## Dedupe audit trail (2026-09-19)
Checked against leads.md, pipeline.md, and western-co-prospects.jsonl. Confirmed new: Avalanche Carpet (avalancheproclean.com). Confirmed upgrades (existing rows): Great Divide Cleaning Svc, C.A.R.E. Cleaning & Restoration Experts. Confirmed already-tracked (discarded): Mr. Vac Cleaning & Restoration (QUEUED round 22), Best Cleaning & Disaster Restoration Services (pipeline NEW), Bravo! Cleaning & Restoration (pipeline NEW x2). No locksmith near-miss name appears in any record.
