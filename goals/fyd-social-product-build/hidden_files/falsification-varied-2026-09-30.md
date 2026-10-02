# Five-URL Varied Falsification — 2026-09-30 (EXECUTE directive, binding schema)

Ran 2026-09-30 ~14:41 MDT. Live loop on Pig :3100, commit 278468d8.
Artifacts: Pig /tmp/fyd-varied-20260930/ (sse-<tag>.log, result-<tag>.json, summary.json).

## Per-URL results (fixed schema)

### 1. STRUCTURED WORDPRESS — https://kimsautopart.com/
jobId live-53f84a8ef4f3 — http://localhost:3100/build-my-fyd/live-53f84a8ef4f3
- ACQUISITION: PASS (200, 79KB, WP x42, JSON-LD x1, acquire 1851ms)
- FACTS: 0 (findings array empty; 10 object fields, all OG/meta)
- OBJECTS: 1 (ping.social.business@1)
- RELATIONSHIPS: 0
- IMPORTANT FACTS MISSED: phone (970)-858-0938; hours Mon-Fri 7:30AM-6PM, Sat 8AM-5PM, Sun closed; address 220 E. Aspen Ave, Fruita CO 81521; owner story (Kim, army veteran, counterman since 1980, bought store Aug 1995); services (free wiper install, battery/alternator/starter testing, drum/rotor turning); history (independent, was Carquest 27 years). All in visible page body.
- WRONG CLAIMS: none invented by FYD. BUT description field = site's own og:description which names "A&D Auto Parts" (template cruft for a different business), now sitting as this business's description in the graph. Source-faithful, business-false.
- UNSUPPORTED CLAIMS: none.
- TIME TO FIRST USEFUL RENDER: 1,889ms (siteSpecReadyAt - urlSubmittedAt)
- OWNER-READY: NO. WHY: description names a different business; zero contact facts captured despite all present on page.

### 2. MULTIPLE LOCATIONS — https://www.carboywinery.com/locations
jobId live-a376b443c20e
- ACQUISITION: PASS (200, 209KB, WP x60, JSON-LD x1, acquire 989ms)
- FACTS: 0 (findings empty; business object 10 fields + 3 external_identity x 3 fields)
- OBJECTS: 4 (1 business + 3 external_identity: facebook, instagram, linkedin)
- RELATIONSHIPS: 3 (all links_to business->external_identity)
- IMPORTANT FACTS MISSED: the entire point of the submitted page. Zero per-location objects; zero of 4 addresses/phones captured: Littleton 6885 S Santa Fe Dr (720) 531-5252; Denver (Governor's Park) 400 E 7th Ave (720) 617-9410; Breckenridge (Gold Pan Saloon) 103 N Main St (970) 771-3944; Palisade (Mt. Garfield Estate) 3572 G Rd (970) 464-0941. Multi-location structure collapsed to one object + textual list.
- WRONG CLAIMS: none.
- UNSUPPORTED CLAIMS: none by FYD; note meta-vs-page drift — site's og:description claims a Colorado Springs location not present on the submitted locations page; FYD quoted the meta verbatim.
- TIME TO FIRST USEFUL RENDER: 1,008ms
- OWNER-READY: NO. WHY: locations-page submission yielded zero location facts; the multi-location structure the archetype tests was not represented.

### 3. WEAK/NO STRUCTURED METADATA — http://www.wickedwrenchdieselauto.com/
jobId live-a60b9c8af5cd
- ACQUISITION: PASS (http->https redirect followed, 23KB, no WP, no JSON-LD, acquire 2165ms)
- FACTS: 0 (findings empty; 3 fields: title, description, keywords)
- OBJECTS: 1 (business)
- RELATIONSHIPS: 0
- IMPORTANT FACTS MISSED: phone (970) 858-5015; hours Mon-Fri 8-5, Sat by appt, closed Sun; address 825 East US Hwy 6&50, Fruita CO 81521; full services list (diesel repair, custom cars, parts, field services, diagnostics, transmissions, performance kits, engine repair/rebuild/replacement); email info@wickedwrenchdieselauto.com. All in visible body text.
- WRONG CLAIMS: none. UNSUPPORTED CLAIMS: none.
- TIME TO FIRST USEFUL RENDER: 2,178ms
- OWNER-READY: NO. WHY: name + generic sentence fragment only; no phone, address, hours, or services.

### 4. JS-HEAVY — https://www.elevationfamilydental.com/
jobId live-8846ccfa0f5b
- ACQUISITION: PASS (200, 474ms; NOTE: archetype assumption wrong — site is Squarespace static HTML, not a JS SPA; true client-rendered SPA still untested)
- FACTS: 0 (findings empty; 9 fields incl. hours)
- OBJECTS: 1 (business)
- RELATIONSHIPS: 0
- IMPORTANT FACTS MISSED: phone 970-245-2990; address 1190 Bookcliff Ave, Unit 101, Grand Junction, CO 81501; dentist Dr. Judd Chamberlain; services (exams, cleanings, fillings, dentures, root canals, implants, extractions, bridges, crowns, Invisalign, whitening, veneers); email. Hours WERE extracted and match source exactly (Mo-Fr 07:30-16:30).
- WRONG CLAIMS: none. UNSUPPORTED CLAIMS: none.
- TIME TO FIRST USEFUL RENDER: 492ms
- OWNER-READY: NO. WHY: closest of the five (correct name, description, hours) but the two highest-value facts for a dental practice — phone and address — are absent, as is the dentist's name.

### 5. MESSY LEGACY — http://www.bin707.com
jobId live-6d8dcb613e32
- ACQUISITION: PASS (200, 200KB, no WP, 238 divs, 67 inline styles, 19 scripts; honest label: messy div-soup template, not true 90s table legacy — no true legacy site found live among corridor businesses in the time available)
- FACTS: 0 (findings empty; 9 fields incl. hours)
- OBJECTS: 1 (business)
- RELATIONSHIPS: 0
- IMPORTANT FACTS MISSED: phone 970-314-7455; address (page shows 400 Main St relocation note AND 225 North 5th Street footer — conflict unrecorded); dinner hours nuance (extracted generic 10:00-22:00 vs actual dinner Mon-Sat 4:30-10pm, Sun 5-9:30pm, happy hour 3:30-5:30); founders story; James Beard awards; sister restaurant Taco Party.
- WRONG CLAIMS: none (extracted hours match the page's own "Hours:" line exactly; kitchen-vs-door hours nuance is source-faithful, noted not charged).
- UNSUPPORTED CLAIMS: none.
- TIME TO FIRST USEFUL RENDER: 373ms
- OWNER-READY: NO. WHY: no phone, no address; awards/story/dinner-hours nuance absent.

## Verdict

**0/5 owner-ready → STOP.** Fewer than 3/5 honestly owner-ready. Downstream feature wave does not proceed.

Bar applied (stated for audit): OWNER-READY YES requires (a) correct business name, (b) no false/misleading claims about the business, (c) primary contact facts present (phone + address, or phone + hours where type-appropriate). A representation with no way to contact the business is not one an owner would ship.

## Dominant generic failure (acquisition/understanding, not generation)

UNDERSTAND projects only head metadata (OG/meta/keywords/JSON-LD) plus hours-like patterns into the graph. Body-text contact facts — phone numbers, street addresses — and structural facts — per-location blocks, services lists — are never mined, across all five archetypes including structured WordPress. All five acquisitions returned HTTP 200 with full bodies; generation rendered all five (renderable=true, zero invented claims). The failure is purely in understanding/extraction: the pipeline reads the <head> and pattern-matches hours, but does not extract phone/address from the <body> even when they sit in plain labeled text ("CALL US: (970)-858-0938", "220 E. Aspen Ave. Fruita CO. 81521").

Secondary observations:
- findings array empty on all 5 (and on earlier peterson run): the FACTS/findings pipeline emits nothing; facts live only as object fields. FACTS count = 0 is a real signal, not a measurement artifact.
- No junk person cards this time: the test-1 person bug needs Person-typed evidence, which these sites did not produce. Root cause (proceduralizer project() person loop, ~lines 935-956) remains unfixed.
- Template-cruft propagation: a site's own false meta (A&D Auto Parts) becomes the business description verbatim. Evidence-binding intact (source-faithful) but no name-vs-description sanity check exists.
- All five were fast (0.4-2.2s to siteSpecReadyAt); speed is not the problem, extraction depth is.

## Recommended next step (not taken — STOP rule)

Fix understanding extraction (phone/address patterns from body text; per-location blocks; services lists) and re-run this same five-URL battery as the regression gate. No generation-side or presentation work until this battery scores >=3/5. The harness (/tmp/fyd-varied-harness.py, pushed to Pig /tmp/) is reusable as-is.
