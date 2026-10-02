# Research Round 84 — Masonry / stone / stucco / hardscape (Western Colorado, 2026-09-18)

One round, one segment. Coverage goal was 8-12 qualified; the yield was 1 qualified, 38 near-misses,
and a long exclusion list. The qualification bar was not lowered to hit the count.

Files:
- `research-round84-masonry-raw.jsonl` — 1 qualified row, schema-validated (validate-scratch-schema.py: rows=1 errors=0)
- `research-round84-masonry-notes.md` — this file

Dedup: every final name rechecked against `dedup-names-round84.txt` (747 lines, 2026-09-18).
The only dedup hit among researched names was `durango plastering & drywall` (line 242).

## Qualified (1)

### Elk Point Masonry — Hotchkiss CO (WARM)
- Own site: http://elkpointmasonry.com/ (WordPress). Projects page: https://elkpointmasonry.com/projects/
- Email published on own site: ELKPOINTMASONRY@GMAIL.COM (displayed uppercase; normalized to lowercase in JSONL).
  This was the single cleanest masonry email found all day.
- Phone: (970) 216-3851.
- Services confirmed on own-site services page: brick and block masonry, stone veneer,
  dimension stone cladding, stone paving, unit pavers.
- Address conflict recorded, own site authoritative: projects page footer says
  "29397 J RD, HOTCHKISS CO 81419"; the Google business profile lists "100 Elk Run Dr Ste 213B,
  Basalt, CO" (mail-drop style address, never used as the JSONL city).
- No owner name published. No contact form on site. Not a revamp candidate: the site is simple
  but complete with a project gallery.
- Opportunity: MISSED_CALL_LEAD_CAPTURE (medium confidence), secondary AUTOMATION.
  One-man-shop pattern; phone/email intake with no form or booking system.
- Stack signals: UNKNOWN. No filing date claimed (no visible SOS record checked in this round).
- next_eligible_action: email queue candidate (email verified on own site).

## Near-misses (38)

Genuine contractors, real and operating, but no qualifying own-site email or genuine own-site form.

**Own site verified, phone-only (contact is a phone number or call-me request):**
- Heritage Masonry LLC, Palisade (970-242-4700). 23-person shop, six generations of masons,
  work in Grand Junction/Aspen/Vail. Own site shows "Estimating [email protected]" but the
  address was redacted in every fetch and every search variant; the exact email could not be
  recovered from raw site text. Datanyze confirms CEO Kevin Brock; foreman Thor Beckwith.
  Best near-miss in the round: if a future pass recovers that address verbatim, it qualifies.
- Rocky Mountain Masonry (Gunnison, Kain Leonard owner; 970-596-8936, rmmgunnison.com). No email/form.
- Suarez Masonry LLC, Glenwood Springs (970-984-0990, suarezmasonry.com). Free-consultation CTA,
  no email/form in fetched text.
- Munoz Stone & Tile, Glenwood Springs (970-618-7923, munozrocks.com). "To request a quote or
  consultation, please call." Testimonials name "Jose"; not confirmed as owner, not recorded as such.
- 3D Corporation (Durango; 3ddurango.com; Trig Masonry is the same business at 434 Turner Dr Ste 5,
  970-385-4404; Durango Plastering & Drywall is also the same business). Stucco/EIFS, plaster,
  masonry, drywall since 2000, offices in Durango and Telluride. No own-site email/form found.
  Directory-listed dpdi@mydurango.net cannot qualify. AND: `durango plastering & drywall` is already
  in dedup-names-round84.txt (line 242), so this cluster is a known pipeline entry regardless.
- Quality Stone & Masonry LLC, Silt; Sotelo Setters, Rifle; Kennedy Collins Masonry, Glenwood Springs;
  C.K. Stone LLC, New Castle (970-984-2178, BBB A+); Gingerich Masonry and Construction LLC, Cortez;
  Santos Stone Masonry LLC, Gunnison; Chavez Masonry, Delta; Hernandez Rock & Stucco, Montrose;
  In Stone Inc, Basalt; North Face Masonry, Basalt; Cassidy Construction Co., Aspen;
  Roaring Fork Hardscapes Inc.; Rocky Mountain Stucco & Stone; Rocky MTN Stone LLC;
  Strouse Masonry Inc., New Castle; CR's Masonry, New Castle;
  Red Mountain Masonry (BBB A+, 970-319-5229, Eagle/Pitkin service; phone only);
  Rams Masonry, Inc., Steamboat Springs (970-629-5209, 35795 US Hwy 40; stucco & stone,
  20+ years, BBB A+; no own website found).
- Marler Masonry & Concrete, Pagosa Springs (970-264-2158); Root Works LLC, Pagosa Springs.

**Own site exists, but only a quote-wizard or project-details intake (disqualified as genuine form):**
- Wright-on Stone Masonry and Hardscapes LLC, Cortez (wrightonstone.com; intake is a customer
  project-details wizard); Stone Cold Masonry Inc., Gunnison (stonecoldmasonry.com; same pattern).
- Eddy Masonry LLC, Montrose area (jotform "Masonry Estimate" wizard asking for project details
  and photos; customer quote flow, not a general B2B form).

**Directory-only (no own website verified):**
- Arguelles Masonry LLC (Angi-only, in business since 2023, serving Edwards/Oak Creek/Eagle/Carbondale).
- Irvin Masonry, Cortez; OC Rock and Stone, Crested Butte; Meub Construction & Masonry, Crested Butte;
  Adams Masonry, Steamboat Springs (970-879-5795); Alpine Masonry Inc, Steamboat Springs
  (970-879-2312); Green Mountain Masonry 1, Steamboat Springs (970-846-2198);
  Kings Masonry, Steamboat Springs (970-846-9868); Berich Masonry Mountain, Edwards;
  LQ's Durango Quality Stucco (lead-page only).

## Excluded

- Generic Durango "Stucco Systems" page with an 810 area code phone: apparent aggregator.
- Statewide roofing/chimney city pages and Buzz Chimney Repair: lead-generation pages.
- DaBella: corporate/franchise-like.
- True Grit Concrete Polishing: outside segment. Rocky Mountain Asphalt: outside segment.
- Ahicks Stone & Masonry Supply: appears to be a supplier unless contractor work is verified.
- Whatcott Plastering's listed varde.com website is unrelated to the business.
- Mountain Peak Stone LLC: granite/marble countertops, not target exterior masonry.
- Steamboat Stoneworks: countertop fabrication, not target exterior masonry.
- Quality Stucco West, Grand Junction: BBB marks it out of business (directory-only anyway).
- Plain concrete businesses remain excluded unless masonry, stone, paver, or retaining-wall
  specialization is independently verified.
- Gingerich's visible 2023 periodic report is not a new filing; directory "in business since"
  statements (Rocky MTN Stone et al.) are not filing evidence. No filing dates claimed this round.

## HOT/WARM outreach angles

- Elk Point Masonry (WARM): direct email, owner-operator, North Fork valley. Opening angle is
  missed-call lead capture while the owner is on job sites: the site lists only phone and email
  with no form or scheduling, so every missed call is a lost estimate request. Straightforward
  cold-email candidate; disclosure line required.

## Recommended follow-ups (not completed; no new instructions taken from data)

1. Heritage Masonry's exact estimating email: one targeted pass against raw page HTML (mailto
   target, structured data, or contact subpage) would recover it verbatim if it is published;
   it is the highest-value single item left in this round.
2. A chimney-masonry lane pass: the deduct list already contains several chimney businesses, but
   the segment was not deeply searched this round and tends to produce phone+email sites.
3. Steamboat Springs/Craig/Meeker yielded names but no own sites; a Facebook/Instagram presence
   check would likely turn several near-misses into routable prospects (Page contact email or
   Message button), especially Rams Masonry, Adams Masonry, and Alpine Masonry Inc.
4. Red Mountain Masonry and C.K. Stone LLC remain phone-only with strong reputations; if their
   sites ever surface or a Page route is verified, both re-enter.
