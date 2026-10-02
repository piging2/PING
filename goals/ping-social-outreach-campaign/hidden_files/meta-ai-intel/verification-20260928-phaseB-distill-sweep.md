# Phase B distill-sweep verification note (2026-09-28)

Source files:
- 20260928-030430-a-weak-website-hunt.md (12 businesses, weak-website hunt)
- 20260928-030819-b-new-business-radar.md (8 businesses, new-business radar)

All names independently web-verified on 2026-09-28. No websites, phones,
businesses, or operating status invented. No canonical truth claims beyond
what the evidence below supports. CONFIRMED = own site or official record
observed directly. STRONG INDICATION = matching multi-source or
CDOS-sourced filing evidence. WEAK INDICATION = single stale listing only.
UNKNOWN = no matching independent trace.

## File A: a-weak-website-hunt

1. Colorado Electric Inc (Clifton, electrician) - CONFIRMED.
   Own-site/search record: 659 33 3/4 Rd, Clifton; https://coloelectric.com/;
   phone 970-379-2487. Collision: pipeline.md L1807 real NEW row. No merge.
2. Janik Electric (Clifton, electrician) - CONFIRMED.
   Names and Numbers: electrician, 3272 Pheasant Pl, Clifton; 970-261-7702.
   Collision: pipeline.md L2574 near-miss exclusion (round 112 a-file;
   active license but no owned site/GBP, phone-only). Exclusion stands. No merge.
3. Quality Electric & Controls (Clifton, electrician) - CONFIRMED.
   https://www.colorado-electrician.com/electrician-in-clifton/;
   604 32 1/2 Rd, Clifton; 970-434-7600.
   Collision: pipeline.md L2961 real NEW row. No merge.
4. Mesa Door Systems (Clifton, garage door) - CONFIRMED.
   555 Huntington Point Ln, Clifton; 970-234-2123 (Birdeye + record agree).
   Collision: pipeline.md L2139 real NEW row. No merge.
5. Rocky Mountain Plumbing and Heating (Palisade, plumber/HVAC) - STRONG INDICATION.
   Matching records: 730 36 3/10 Rd, Palisade; 970-464-0944. One current result
   says "possibly temporarily closed". Also in this brief's own negative-signal
   list. Collision: pipeline.md L1679 real NEW row. No merge.
6. C & C Services / C & C Plumbing and Heating (Mack, plumber) - UNKNOWN.
   No matching Mack business found; only unrelated out-of-state companies.
   No merge.
7. Affordable Plumbing & Heating (Collbran, plumber/HVAC) - WEAK INDICATION.
   Plateau Valley directory: Brian Dennison, Collbran, 970-589-4581, but the
   page notes it was last updated about 6,480 days ago. No merge.
8. Fasold Handyman Services LLC (De Beque, handyman) - UNKNOWN.
   No matching independent result. No merge.
9. Charlie's Pest Control (Montrose, pest control) - STRONG INDICATION.
   Multiple directory records: 16874 6300 Rd, Montrose; 970-249-3860.
   No own site/current first-party presence. Collision: pipeline.md L2886
   already-tracked list. No merge.
10. Reliable Pest Control (Montrose, pest control) - CONFIRMED.
    Multiple current-crawl listings agree: 67278 Sunnyside Rd, Montrose;
    970-240-8207. Collision: pipeline.md L2886 already-tracked list. No merge.
11. All Seasons Roofing (Montrose, roofer) - CONFIRMED.
    https://www.roofinginmontrose.com/; 970-258-2409.
    Collision: canonical record exists (All Seasons Roofing Ltd., Montrose),
    which had no phone. Enrichment applied: phone 970-258-2409 added from this
    verification. No new record.
12. B & H Landscaping Inc (Carbondale, landscaping) - STRONG INDICATION.
    MapQuest business record: 36 Marble Ct, Carbondale; no own/current
    first-party site found. Collision guard CLEAR. MERGED as new record.

File A totals: 6 confirmed, 3 strong, 1 weak, 2 unknown. 1 merged.

## File B: b-new-business-radar

1. BlueSky Pressure Washing LLC (GJ, pressure washing) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-18: 3127 Brownie Cir Spc 34, Grand Junction;
   agent Alondra Chavez. Collision: pipeline.md L1828 real NEW row. No merge.
2. Golden Arrow Property Services LLC (GJ, property services) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-14: 391 Sunnyside Ct Unit H, Grand Junction;
   agent Lidia Esther Lopez Hernandez. Collision: pipeline.md L1827 NEW row.
   No merge.
3. Skilled Hands Handyman Services LLC (GJ, handyman) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-10: 610 Peace Dr, Grand Junction;
   agent Jacob Daniel Sebold. Collision: pipeline.md L1826 NEW row. No merge.
4. SRS Construction LLC (GJ, construction) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-17: 1525 Ptarmigan Ridge Ct, Grand Junction;
   agent Shanon Ray Secrest. Collision: pipeline.md L2793 (2026-09-24 segment
   run already processed this name); also in brief's own negative-signal list.
   No merge.
5. GH Paint L.L.C. (GJ, painting) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-08: 2978 Bret Dr, Grand Junction;
   agent Arthur Garret Holt. Collision: pipeline.md L1825 NEW row. No merge.
6. Precision Interlock by Jamie L.L.C. (GJ, hardscaping/pavers) - STRONG INDICATION.
   CDOS-sourced filing 2026-07-03: 2833 1/2 Kelso Mesa Dr, Grand Junction;
   agent Jamie Marie Miller. Trade inferred from business name only, not
   independently confirmed. No phone/website/GBP published. Collision guard
   CLEAR. MERGED as new record.
7. Rescue 1 Plumbing (GJ, plumbing) - CONFIRMED.
   Press release dated 2026-09-09 (pressadvantage + syndications): service
   expansion in Grand Junction; founder Jack Thompson. Collision: pipeline.md
   + prospect-archive.jsonl (archived: quality-cap 300 active, weakest WATCH,
   no signal in 2+ sweeps, lowest fit). Archive reason controls; the press
   release is a new-service signal, not a new contact route. No re-add.
8. CPS Distributors (GJ, irrigation/landscape supply) - CONFIRMED existence,
   INELIGIBLE for merge. Trade publications (2020) + current directories:
   240 North Ave, Grand Junction; (970) 599-7331. It is a wholesale supply
   branch of Heritage Landscape Supply Group (16+ locations), not a
   home-service contractor, and fails the chain/franchise exclusion. No merge.

File B totals: 2 confirmed, 5 strong (incl. 1 ineligible-confirmed supplier),
1 unknown. 1 merged.

## Canonical mutations (2026-09-28)

Appended to ~/workspace/your_files/western-co-prospects.jsonl:
- B & H Landscaping Inc (Carbondale; landscaping; WEBSITE_REVAMP; STRONG INDICATION)
- Precision Interlock by Jamie L.L.C. (Grand Junction; hardscaping/pavers,
  trade name-inferred; NEW_BUSINESS_SETUP; STRONG INDICATION)

Enriched existing canonical record:
- All Seasons Roofing Ltd. (Montrose): phone 970-258-2409 added (was empty),
  from 2026-09-28 independent verification.

Note on schema: the canonical record schema has no "status" key; new records
follow the established distill pattern (same 33 keys as prior distill-verified
records, priority_state left empty). New records identify the Meta AI brief
source in the source field.

Cap note: active count was 300/300 before this sweep (priority_state !=
SUPPRESS). The 2 new records raise active to 302/300. No archival performed;
archival of weakest candidates is an outreach-engine decision, flagged for the
parent.
