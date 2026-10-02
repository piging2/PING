# Round-32 research scratch: locksmiths + pressure washing / exterior cleaning (2026-09-12)

Segment pair researched: (1) Locksmiths, (2) Pressure washing / exterior cleaning (houses, driveways, roofs, commercial).
Type: research only. No emails sent, no forms submitted, no canonical JSONL edits by these workers.

## Merge status (2026-09-12, ~11:24 UTC)

The three locksmith rows (Linville Lock and Key, J Lock Key & Alarm, Lyons Lock and Safe LLC) were already merged into the canonical ~/workspace/your_files/western-co-prospects.jsonl by the concurrent round-32 merge step (file grew 244 to 257 lines during the run). To avoid duplicate merge, ~/workspace/outreach/jsonl-additions-round32-research.jsonl contains only the 2 not-yet-merged pressure washing rows (Grime Fighters, Pro Mobile Wash). Per-segment source files are retained for audit:
- ~/workspace/outreach/jsonl-additions-round32-locksmiths.jsonl (3 rows)
- ~/workspace/outreach/jsonl-additions-round32-pressurewash.jsonl (2 rows)
- ~/workspace/outreach/research-scratch-round32-locksmiths.md and research-scratch-round32-pressurewash.md (segment detail)

## LOCKSMITHS

### Towns covered
Grand Junction, Fruita, Clifton, Palisade, Montrose, Delta, Gunnison, Durango, Glenwood Springs, Rifle, Carbondale, Aspen, Steamboat Springs, Craig, Bayfield, Telluride, Pagosa Springs, Ignacio, Eagle, New Castle, Silt, Cortez, Silverton, Gypsum, Crested Butte.

### Candidate count: 3 (all WARM, already merged into canonical)
1. Linville Lock and Key, Grand Junction. Own-site email Linvillelockandkey@gmail.com, phone (970) 424-3091, WordPress CONFIRMED. Automotive, residential, commercial, emergency, 24/7 lockout. Next: draft email via own-site published email.
2. J Lock Key & Alarm, Fruita (serves GJ, Fruita, Clifton, Palisade). Own-site emails info@jlockandkey.com and arne@jlockandkey.com; named contact Arne Summers; phone 970-640-4524. Locks, alarms, CCTV, monitoring; 24/7. Secondary AUTOMATION opportunity.
3. Lyons Lock and Safe LLC, Gunnison Valley. Squarespace CONFIRMED; verified own-site inquiry form; phone 970-343-2337; home, commercial, automotive, safe services since 2020. Next: watch (form-only contact, no published email; pending channel call).

### Skip patterns
- Phone-only or phone-plus-address, no own-site email or verified form: Bob's Lock and Key of Durango, Rifle Lock & Safe, Ken's Services (GJ), Telluride Locksmith, Eagle Lock & Key (WordPress CONFIRMED but no contact mechanism), American Locksmithing (Montrose), Locksmith of Craig, ACC Lock and Key, The Village Locksmith, J&J Stereo (Delta).
- Kiosk chains (Minute Key, KeyMe) and national templated lead-gen pages (Low Rate Locksmith, Howard's, Moreira) excluded.
- Local location-page networks without local presence: mr-locksmith.com (Montrose page, national 888 line).
- Dedup names already in canonical: A Bargain Mobile Locksmith, Belles Lock and Key, Cortez Locksmith & Safe Company, Honk-Key Lock & Safe, Inside Out Lock & Key LLC, Vail Lock, Key & Safe.
- Placeholder email filler@godaddy.com (Gene's Lock and Key) never recorded as real contact.

### Near-misses for future verification
1. Durango Lock and Key Company (Durango): own site durangolockandkey.com, 4.8 stars from 74 reviews; page fetch failed this round.
2. Pagosa Armor Locksmith (Pagosa Springs): own site hints at a "Message us" flow, unverified.
3. Simmons Lock & Key Inc. (GJ): GoDaddy site, family-owned since 1945, after-hours emergency; no email or form in fetched homepage text.
4. Tri-County Locksmith Service (Glenwood Springs): contact page showed only address; re-check for email or form.
5. Gene's Lock and Key (Glenwood Springs): "Drop us a line" present but no real form/email verified.
6. S&S Lock Service (Bayfield): family owned 30+ years, phone (970) 779-8008; no email or form in fetched text.

### Segment heat and timing notes
- Locksmith demand is urgent and phone-driven (lockouts, lost keys, after-hours). MISSED_CALL_LEAD_CAPTURE is the default primary with missed_call_risk=high for all qualifiers.
- Ski-season angle: car/home lockouts and lost keys rise in winter for mountain markets (Aspen, Glenwood, Telluride, Gunnison/Crested Butte). Market context, not own-site evidence.
- Several shops advertise 24/7 or on-call but offer no asynchronous contact or booking mechanism, supporting missed-call capture where verified on their own site.

## PRESSURE WASHING / EXTERIOR CLEANING

### Towns covered
Grand Junction, Fruita, Palisade, Clifton, Montrose, Delta, Gunnison, Durango, Cortez, Pagosa Springs, Glenwood Springs, Rifle, Carbondale, Aspen, Steamboat Springs, Craig, Meeker. Incidental: Silt, Basalt, Parachute, Eagle.

### Candidate count: 2 (both WARM, in ~/workspace/outreach/jsonl-additions-round32-research.jsonl, pending merge)
1. Grime Fighters, Grand Junction. Own-site contact form verified (name, email, message, referral-source, captcha). Phone (970) 902-0119. Bin cleaning + pressure washing across GJ, Fruita, Palisade. Primary MISSED_CALL_LEAD_CAPTURE, secondary SEO, medium confidence. Next: watch (general customer form, B2B contact not unmistakably invited; no published email).
2. Pro Mobile Wash, Durango. Own-site email chris@promobilewash.com and phone 970-403-2085 verified on business contact page. Fleet washing core business, plus residential/commercial; over 10 years per own site. Primary MISSED_CALL_LEAD_CAPTURE, secondary SEO, medium confidence. Next: cold email eligible via published own-site email.

### Skip patterns
- Directory-only, no business-owned site: High Pressure Specialties (Fruita), BB Master Blasters (Montrose), LZM Pressure Washing (Cortez), Dirty Jerry's (Glenwood Springs), Aspen Pressure Washing LLC.
- National city-template lead-gen pages: Show Me, Slideoo, Buzz Fence, Ezer Design, Sprayfirst (Pagosa Springs), A&T (Steamboat), H2O (template subdomain).
- Dedup: Alpine Pressure, Elevation Wash Services, The Wash Squad, Simmons Pressure Washing.
- Own site verified but phone-only: Rocky Mountain Sweeping (GJ), Summit Sweeping & Asphalt Maintenance (Silt), Colorado Powerwash and Seal (Eagle).
- Franchise feel (Sparkling and Beyond, Florida area code), adjacent trades (Pristine View Cleaners, WBS Coatings), non-local HQ (Ultimate Powerwashing, Colorado Pro Wash, Tendit).

### Near-misses for future verification
1. Wishy Washy (GJ, wishywashyco.com): own site, phone in search text; fetch failed this round.
2. Durango Pressure Wash (durangopressurewash.com): own domain; fetch failed this round.
3. Rocky Mountain Sweeping (GJ): commercial pressure washing, recurring service, phone 970-260-5118; recheck for contact page.
4. Summit Sweeping & Asphalt Maintenance (Silt): owners Derek and Traci Vondette, phone (970) 876-1914; recheck for contact page.
5. Mighty Bins Cleaning (Durango area): page says customers can reach them through the site, but no form rendered in fetched text.
6. Colorado Powerwash and Seal (Eagle): stone sealing specialty, marginal segment fit.

### Segment heat and timing notes
- Fall house washing before winter: homeowners clean siding, decks, driveways before freeze and snow. Good seasonal hook for Grime Fighters residential angle.
- Commercial holiday preparation: storefronts, sidewalks, parking areas cleaned ahead of holiday foot traffic. Fits Pro Mobile Wash commercial/fleet business.
- Spring pollen season: natural re-engagement reason for recurring services like bin cleaning and fleet washing.

## Overall shortfall note
Target was 8-12 per segment; strict own-site rule yielded 3 locksmiths and 2 pressure washers. Rows were not padded with weak candidates. Both segments are thin in Western Colorado under the own-site rule; most locksmiths and washers operate phone-only or on directories. Near-misses above are the priority list for the next verification pass.
