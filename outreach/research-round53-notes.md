# Research round 53 notes (2026-09-14)

Scope: septic, sewer, well-pump, and water-well services plus garage door and overhead door sales/service across Western Colorado. Research only; canonical JSONL and pipeline.md untouched. Email queues are full through 2026-09-20, so no drafts were produced.

## Qualified and staged (5)

1. Monument Garage Door, Grand Junction (WARM): site-published email service@monumentgaragedoor.com and phone (970) 201-5840 on monumentgaragedoor.com; serving the Grand Valley since 2006; estimates go direct to Andrew (surname not published).
2. Bearfoot Garage Doors, Pagosa Springs/Durango (WATCH): locally owned and family-operated, 35+ years Pagosa area experience, 24/7 emergency and same-day language on bearfootgaragedoors.com; phone 970-230-3839 is Google Business Profile sourced, explicitly not own-site published. Re-qualified after a round35 near-miss park.
3. AAA Septic & Drain, Delta (WATCH): locally owned and operated per aaasepticanddrain.com; NAWT certified inspections; phone (970) 323-8703 on own site and GBP; serves Delta, Montrose, Ouray, Western Gunnison, and parts of San Miguel county.
4. B & R Septic Services, Inc., Carbondale (WATCH): BBB A+ accredited, locally owned, serving the Roaring Fork Valley since 1982; phone (970) 963-3814 consistent across BBB, Names and Numbers, and the Google-backed Birdeye listing (place_id 575607690905514); no own website found.
5. Down Valley Septic & Drain Inc., Rifle/Silt (WATCH): 20+ years per plumbingrifleco.com; phone (970) 930-0124 on own site; owned by Scott and Mona per directory evidence; septic pumping, rootering, hydro-jetting.

## Towns searched

Montrose, Delta, Grand Junction, Fruita, Palisade, Clifton, Gunnison, Durango, Pagosa Springs, Cortez, Rifle, Silt, Carbondale, Glenwood Springs, Aspen, Eagle, Steamboat Springs, Craig, Meeker, Four Corners region.

## Duplicates excluded (already covered)

- Professional Garage Doors (Montrose): pipeline row, QUEUED 2026-09-10 with tailored email draft. Re-found during research; not re-added.
- Montrose Garage Doors: excluded as a duplicate in round 45 review; not re-added.
- Goodwin Septic Tank Service, Inc. (Grand Junction): pipeline row, NEW 2026-09-11; not re-added.
- Owens & Son's Plumbing, Septic and Drains (Grand Junction): pipeline row, NEW 2026-09-11; not re-added.

## Contact conflicts and identity resolutions

- AAA Septic & Drain: Yellow Pages lists (970) 823-4671, but the own site and Google profile both show (970) 323-8703. Own-site number treated as authoritative; conflict noted in the JSONL row.
- Down Valley Septic: two records exist. The old directory record (dvseptic.com, dead; septic.com listing with (970) 625-5556, since 2010) is superseded by the current business site plumbingrifleco.com (Down Valley Septic & Drain Inc., (970) 930-0124, 20+ years, Silt/Rifle). Records were not merged; the live own site is authoritative. Do not retry http://www.dvseptic.com; the fetch failure was terminal.
- B & R Septic: no own website exists. Phone (970) 963-3814 appears consistently on BBB, Names and Numbers, and the Google-backed Birdeye listing. A second number (970) 920-2059 appears in one directory description; BBB number used.

## Near-misses (not qualified)

- Adams Overhead Door (Durango): own site adamsohd.com, phone (970) 385-5608, in Durango since 1998. Independent owner-operated status unverified and possible Overhead Door brand tie; parked pending verification.
- Grand Valley Garage Doors (Delta): round35 near-miss (phone (970) 216-5273, form unverified); left parked.
- Bailey's Garage Doors & More, Inc. (Rifle): round35 near-miss (phone-only (970) 272-1711, hibu site); left parked.
- Artesian Services Inc. (Grand Junction): water wells, pump systems and controls, exploratory drilling; contact is a form only on artesianservices.com; phone (970) 245-2275 from Google profile; independence unverified; parked.
- Top Notch Garage Door LLC (Grand Junction): new 2026 business, phone (970) 210-1105 from third-party directories only; no own site or confirmed Google Business Profile route; near-miss.
- Altitude Septic LLC (Eagle): BBB A+ listed, phone (970) 471-0913; no own website found; no qualifying contact route; near-miss.
- Reliable Septic Solutions: Yelp shows locally owned septic design services; no own-site or confirmed Google Business Profile contact route; near-miss.

## Skip patterns applied

- Overhead Door Company of Four Corners / Grand Junction: branded chain/franchise layer; always skipped.
- Roto-Rooter: franchise/chain; skipped.
- Piceance Well Service: multi-state petroleum workover-rig operation, not a small local residential well-pump prospect; skipped.
- Warren Industries: possible Roto-Rooter affiliation; skipped pending conclusive independence evidence.
- Door Connact Garage Door Repair: suspicious spelling, weak manufacturing-category evidence; skipped.
- Nolan Garage Door Service: out-of-state phone, unrelated-looking domain; skipped.

## Validation

All 5 rows carry the full 30 fields from outreach/jsonl-merge-round31.py, valid enums, source="research-round53 (2026-09-14)", intel_updated="2026-09-14". Exact case-insensitive name checks were run against the canonical JSONL (305 rows) and pipeline.md prospect rows: no duplicates. Bearfoot Garage Doors appears in pipeline.md only inside a round35 research-notes line and in research-scratch-round35.md as a parked near-miss; it was never a prospect row, so re-qualifying it is legitimate and is documented in its row notes. No em dashes in any deliverable.
