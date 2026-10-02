# Research scratch: PING Social prospect research, Locksmiths, round-32 (2026-09-12)

## Output
- `~/workspace/outreach/jsonl-additions-round32-locksmiths.jsonl`: 3 verified qualifying candidates (all 30 schema fields in exact order, validated below). 3 short of the 8-12 target; the strict own-site rule was not relaxed to force the count.
- This file is the scratch record.

## Towns covered
- Grand Junction, Fruita, Clifton, Palisade, Montrose, Delta, Gunnison, Durango, Glenwood Springs, Rifle, Carbondale, Aspen, Steamboat Springs, Craig, Bayfield, Telluride, Pagosa Springs, Ignacio, Eagle, New Castle, Silt, Cortez, Silverton (via S&S service area), Gypsum (via Eagle key search), Crested Butte (via Lyons Lock and Safe search).

## Qualifying candidates (3)
1. **Linville Lock and Key**, Grand Junction. Own site https://linvillelockandkey.com/. Own-site email Linvillelockandkey@gmail.com, phone (970) 424-3091. WordPress CONFIRMED. Automotive, residential, commercial, emergency, 24/7 lockout. WARM.
2. **J Lock Key & Alarm**, Fruita (serves Grand Junction, Fruita, Clifton, Palisade, Western Colorado). Own site https://www.jlockandkey.com/. Own-site emails info@jlockandkey.com and arne@jlockandkey.com; named contact Arne Summers; phone 970-640-4524. WordPress STRONG INDICATION. Locks, alarms, CCTV, monitoring; 24/7. WARM; secondary AUTOMATION.
3. **Lyons Lock and Safe LLC**, Gunnison Valley. Own site http://lyonslockandsafe.com/. Contact page http://lyonslockandsafe.com/contact with an explicit inquiry form ("Please fill out the form below to inquire about a service"). Phone 970-343-2337. Squarespace CONFIRMED. Home, commercial, automotive, safe; since 2020. WARM; form-only contact, so next action is watch pending the parent's channel call.

## Near-misses for future verification (own site exists but contact mechanism not verified this round)
1. **Durango Lock and Key Company**, Durango. Own site http://durangolockandkey.com/ (from third-party result; third-party phone (970) 903-6673, 4.8 stars from 74 reviews). Page fetch failed this turn; verify own-site email or form in a later round.
2. **Pagosa Armor Locksmith**, Pagosa Springs. Own site https://pagosaarmorlocksmith.com/; own-site phone (970) 264-2747; always-on-call; search results hint at a "Message us" flow, but the own-site form was not verified. Re-check contact/message page.
3. **Simmons Lock & Key Inc.**, Grand Junction. Own site https://simmonskey.com/ (GoDaddy). Family-owned since 1945, after-hours emergency available. No email, phone, or explicit form in fetched homepage text. Re-check inner/contact pages.
4. **Tri-County Locksmith Service**, Glenwood Springs. Own site https://tricountylocksmithservice.com/ with /contact/. Contact page showed only address (1338 Grand Ave, PMB# 325, Glenwood Springs, CO 81601). Re-check for an email or form on other pages.
5. **Gene's Lock and Key**, Glenwood Springs. Own site http://geneslockandkey.com/ (GoDaddy). "Drop us a line" under Contact Us, but fetched text showed no form fields, phone, or genuine email. The visible filler@godaddy.com is a platform placeholder and is not a real contact. Verify whether a real form or email exists.
6. **S&S Lock Service**, Bayfield (serves Durango, Bayfield, Pagosa Springs, Ignacio, Cortez, Silverton). Own site http://sandslockservice.com/ (GoDaddy); own-site phone (970) 779-8008; address 724 Lupine, Bayfield, CO; family owned, 30+ years. Contact section shows hours "By Appointment Only" but no email or explicit form fields in fetched text.

## Skip patterns (named exclusions this round)
- Phone-only or phone-plus-address with no own-site email or verified form: Bob's Lock and Key of Durango (970-385-4870), Rifle Lock & Safe (no own site found; BBB phone (970) 625-3357), Ken's Services LLC Grand Junction (970-263-0715; no own site found; owner Lisa per review), Telluride Locksmith (970-728-5625; no own site found), Eagle Lock & Key (eaglekey.com; WordPress CONFIRMED but no email/form/phone visible in fetched text; generic template service copy), American Locksmithing LLC Montrose (americanlocksmithing.com; reviews visible but no email/form in fetched text), Locksmith of Craig (verblocksmith.com; sparse page, no contact mechanism), ACC Lock and Key (directory only, no site), The Village Locksmith (directory only), J&J Stereo Auto Glass Window Tint and Locksmith Delta (directory only).
- Fetch failures this turn, treated as terminal per developer instruction (do not retry, keep as future leads): dclock.com (DC Lock, Inc.), steambt-lock-and-key business.site page (Steamboat Lock And Key).
- Kiosk chains: Minute Key (Grand Junction, Durango, Pagosa Springs), KeyMe (Durango City Market). No own-site local presence.
- National templated lead-generation location pages: Low Rate Locksmith (Durango page), Howard's Locksmith Services (Durango, Telluride pages), Moreira Locksmith (Telluride page). Not genuine local businesses.
- Local locksmith location-page networks: mr-locksmith.com (Montrose 818 N 2nd St; Montrose-only local presence not established; phone (888) 991-5625 is a national line).
- Dedup names already in the canonical record: A Bargain Mobile Locksmith, Belles Lock and Key, Cortez Locksmith & Safe Company, Honk-Key Lock & Safe, Inside Out Lock & Key LLC, Vail Lock Key & Safe.
- Placeholder emails: filler@godaddy.com on Gene's Lock and Key is a platform placeholder, never recorded as the business email.

## Segment heat and timing notes
- Locksmith demand is urgent and phone-driven: lockouts, lost keys, after-hours emergencies, stranded motorists. That keeps MISSED_CALL_LEAD_CAPTURE as the default primary opportunity with missed_call_risk=high across all three qualifiers.
- Winter and mountain-market angle: a Sopris Sun article quoted locksmith Ethan McVoy saying car/home/office lockouts are the most common calls and car-key problems increase in winter when people ski and lose keys. Ski-season timing strengthens the missed-call pitch for mountain-town shops (Aspen, Glenwood, Telluride, Gunnison/Crested Butte corridors). This is market context, not own-site evidence.
- Several businesses advertise 24/7 or on-call emergency service but offer no visible asynchronous contact or booking mechanism, which supports a missed-call capture opportunity where verified on their own site.
- Mountain/resort service areas create long travel distances and unpredictable calls, increasing the value of call capture, triage, text follow-up, and service-area qualification.

## Validation notes
- 3 lines, all parse as JSON.
- 31 keys per line in exact order: _migration_note first, then the 30 schema fields (matches round-31 file format for merge compatibility).
- Enums checked: missed_call_risk=high, opportunity_primary=MISSED_CALL_LEAD_CAPTURE, opportunity_secondary blank or AUTOMATION, opportunity_confidence=high, priority_state=WARM, revamp_candidate blank, website_quality=moderate, ai_discoverability blank, suppression_state=eligible.
- No em dashes anywhere in output files.
- No duplicate business names.
- No email, phone, address, or owner values invented; all copied from own-site fetches observed 2026-09-12.
- No invented reviews, tech stack, or social handles; stack grades are CONFIRMED or STRONG INDICATION from observed asset URLs.
