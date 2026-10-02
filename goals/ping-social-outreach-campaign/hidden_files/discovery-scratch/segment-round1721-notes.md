# Segment research notes — round 1721 (2026-09-24)

19 verified candidates, all NEW, all dedupe-clean against all four dedupe
files (dedupe-jsonl.txt, dedupe-leads.txt, dedupe-pipeline.txt, dedupe-fbdm.txt).
Zero matches on exact and variant name greps, checked 2026-09-24, plus an
independent re-check in this finalizer pass.

- Chimney/fireplace/stove: 7 (segment-round1721-chimney.jsonl + notes)
- Carpet/upholstery: 12 (segment-round1721-carpet.jsonl + notes)
- Merged: segment-round1721.jsonl (19 rows; field order and string types
  validated programmatically by merge-round1721.py; no intra-run or existing
  duplicates).

Strict geography observed throughout: Grand Junction, Fruita, Palisade,
Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale.
No franchises or chains; independents re-verified at research time.

## Verification standard and its limits this run

browser.open failed twice this run and the runtime declared the failure
terminal for this turn, so full rendered-own-site verification was NOT
possible. Verification was done via public search-index corroboration
(browser.search, still available): a site counted as own-site VERIFIED only
when the business's own domain showed indexed own content (own service pages
crawled within the last ~75 days) with NAP/phone matching directory evidence.
A domain merely claimed by a worker with no indexed presence had its website
stripped to "" and the row kept as directory-level with the gap stated in
notes. No rendered-own-site claims were made for any row.

## Own-site VERIFIED (indexed own content, NAP/phone corroborated)

Chimney segment (per chimney worker, own content rendered at research time):
1. Inside and Out Fireplace & Patio (Montrose) — own-site email/phone,
   contact form, 20+ years, MISSED_CALL_LEAD_CAPTURE.
2. Woodstove Warehouse (Grand Junction) — locally owned since 1990 per own
   site, Facebook linked from own site, MISSED_CALL_LEAD_CAPTURE.
3. The Fireplace Company (Carbondale) — own-site email/phone, contact form
   with CAPTCHA, serves Carbondale + Rifle, MISSED_CALL_LEAD_CAPTURE.
4. Colorado Fireside (Montrose) — family owned since 2000 per own site;
   Montrose + Glenwood Springs, local multi-location independent,
   MISSED_CALL_LEAD_CAPTURE.
5. True North Hearth and Home (Montrose) — Montrose + Glenwood Springs, local
   multi-location independent, MISSED_CALL_LEAD_CAPTURE.
6. The Fireplace Expert (Carbondale) — owner-operator Arturo Rojo per own
   site; refreshed home page but old .html service pages still indexed;
   WEBSITE_REVAMP + SEO candidate.
7. Fireplace West (Grand Junction) — phone-only, dated content templates,
   WEBSITE_REVAMP + SEO candidate.

Carpet segment (search-index verified this run, rendered verification still
recommended):
1. Bob's Carpet & Tile Care (Grand Junction) — CORRECTED WEBSITE:
   bobscarpetandtilecare.com (was bobscarpetandtilecarellc.com, unindexed).
   Own-site phone (970) 424-9137 and 3076 Bookcliff Ave match; CO DLLC
   #20181889115 good standing, agent Robert Joseph King; formerly Carpet
   Cleaning Solutions. Phone-only CTAs, no online booking.
2. Swiss Pro Carpet Cleaning (Grand Junction) — swissprocleaning.com live;
   own-site phone 970-242-6445 and email swissproclean@gmail.com published;
   2159 South Broadway; since 1981; areas served listed. MISSED_CALL.
3. Mann's Carpet Cleaning & Oriental Rug Washing (Montrose) — mannsrugwashing.com
   live; 'Locally Owned & Operated Since 1975'; serves 5 counties; detailed
   rug-process content; (970) 249-6738; hours Tue-Fri 9-5 per listing,
   closed weekends. Strongest Missed-call angle in the segment.
4. Thompson's Cleaning (Rifle) — thompsonscleaning.com live; phone
   970-625-3635; 1011 West 5th Street; since 1978; family team. CAUTION:
   'Thompson's Steamway, Inc.' of Prescott AZ is a different business.
5. Cleaner Carpets By George (Grand Junction) — CORRECTED WEBSITE:
   carpetsbygeorge.com (was carpetsbygeorgeco.com, unindexed) per
   Google-Business-linked listing; phone (970) 243-4212; Birdeye 4.9/87;
   BBB A+. Thin own content; rendered verification recommended.
6. Anvil Points Upholstery & Carpet (Rifle) — anvilpointscc.com live, old
   Double J Computers static site; owner Skip Stover, htskip@gmail.com,
   (970) 625-4770 and (970) 618-5908, 7802 CR 319; Request Services page is
   UNDER CONSTRUCTION, real bookings phone/email only; Facebook linked.
   MISSED_CALL + WEBSITE_REVAMP candidate (revamp_candidate=yes).

## Directory-level only (website stripped, unindexed/unverified)

- Fresh Start Carpet Cleaning (GJ) — (970) 210-4281; Birdeye 4.6/43;
  same-day/next-day rental-turnaround positioning; no own website located.
- GJ Carpet Cleaners (GJ) — (970) 250-5717; MapQuest 'locally owned and
  operated'; no own website located.
- Trinity Carpet Care (GJ/Fruita) — (970) 858-2029; Angi: family-owned,
  23 yrs, IICRC-certified; appears in a 'without website in Colorado'
  dataset; no own website located.
- Rugs by George (GJ) — (970) 254-2895; area-rug specialty; same-family
  operation as Cleaner Carpets By George (shared 817 22 Rd, distinct phone
  numbers); treat as one outreach account if contacted; no own website.
- De Julio's Carpet & Upholstery (Montrose) — (970) 249-1970; domain
  dejuliocarpetcleaning.com is Google-Business-linked with matching NAP but
  own content is thin; 'Dejulio Jerald' listing suggests owner, not confirmed.
- Eagle One Carpet Cleaning (Rifle) — (970) 379-7365; domain
  rifle-eagleone.com Google-Business-linked, thin own content; owner-operators
  per review; closed weekends.

## Exclusions (carpet segment)

Big Bear Chem-Dry, Heaven's Best, Zerorez, ServiceMaster, Oxi Fresh
(franchise/chain). Colorado Choice Carpet Cleaning (Castle Rock/Denver,
already in dedupe data). No new chains found in chimney segment.

## Incidental future-research leads (NOT researched this run)

- Good Shepherd Carpet (GJ, 2495 Industrial Blvd, (970) 257-1111) — carpet
  cleaner, not in dedupe files, no chain signals in one snippet.
- Common Cents Carpet Cleaning (GJ, 653 Terrace Dr) — carpet cleaner.
- Grand Junction Carpet Cleaning (zeemaps listing, generic name) — verify
  identity before adding.
- rentechdigital.com 'list of carpet cleaning services without website in
  Colorado' dataset — useful future-research surface for no-website shops
  (Delta 3, Montrose 3, Rifle 3, Fruita 1 listed as of this run).

## Segment context

Late September is pre-burn-season for the Western Slope: annual chimney
cleaning, inspections and stove tune-ups peak in October/November; holiday
carpet-prep demand follows. Phone-only and form-only lead capture is the
shared exposure across both segments.

## Review intelligence (6 fresh HOT/WARM prospects, round 1721)

Full detail in review-round1721.md. Result: 0/6 review triggers.
- Honk-Key Lock & Safe: clean
- Clean Pro Restoration: clean
- Stove Depot & Chimney Works: clean
- High Desert Haulers and Junk Removal: clean
- Dumpster Dan: clean
- PQ Plumbing & Heating: clean (one undated complaint about a van driver;
  not a 7-day trigger, not a phone/response/wait/scheduling complaint)

## AEO grades (round 1721, full detail in review-round1721.md)

- Jo Mama's Movers: MODERATE (good own-site identity/services/NAP; no FAQ;
  directory NAP drift)
- Monument Lighting: WEAK (thin GoDaddy page, no phone/email/address in
  fetched text, no FAQ)
- High Grade Concrete & Excavation: MODERATE (strong service-page depth; no
  FAQ, no structured-data evidence)
- Grasso Masonry: WEAK (old Homestead site, image-heavy nav, minimal
  crawlable content, no FAQ)
Cross-cutting: all four lack FAQ content; NAP consistency and dedicated
service pages are the cheapest AEO opportunities.

## Files

- segment-round1721-chimney.jsonl — 7 lines (chimney worker, own-content
  rendered at research time)
- segment-round1721-carpet.jsonl — 12 lines (corrected/verified in this
  finalizer pass; corrections noted above)
- segment-round1721.jsonl — merged 19 lines (merge-round1721.py)
- segment-round1721-notes.md — this file
- review-round1721.md — review intelligence + AEO grades
