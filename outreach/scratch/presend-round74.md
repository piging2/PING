# Round 74 pre-send cheap-verify — 2026-09-18 UTC queue (2026-09-17 ~05:45 MDT)

Cap opens 18:00 MDT today (2026-09-17). Queue: 6 F1 follow-ups + 4 cold. Rule applied: the recipient address must appear verbatim on the business's OWN site (live fetch this round). Indexed-only or third-party-only = FAIL. Fetch failure = not verified, never treated as a pass.

## F1 slots 1-6 (cheap-verify + review delta)

| Slot | Business | Recipient | Own-site evidence | Verdict |
|---|---|---|---|---|
| 1 | High Noon Solar (GJ) | information@highnoonsolar.com | PASS: highnoonsolar.com/contact/ shows "E-Mail Us: information@highnoonsolar.com" | GO |
| 2 | Preferred Garage Doors (Northglenn) | preferredgaragedoors@gmail.com | NOT VERIFIED this round: own site (preferredgaragedoorsdenver.com) pages could not be fetched (browser fetch blocked after an unrelated page failed); no own-site evidence quoted | GO WITH CAVEAT: pre-flagged Gmail, sent round 47 clean, zero bounces since; stays on the bounce watch. Own-site email re-confirm recommended next round |
| 3 | Renwick Tiles (GJ) | info@renwicktiles.com | PASS: renwicktiles.com homepage footer shows "info@renwicktiles.com" (2080 Broadway, Grand Junction, 970-260-3539) | GO |
| 4 | Shaw Solar (Durango) | john@shawsolar.com | FAIL: shawsolar.com/contact/ publishes only info@shawsolar.com ("OUR EMAIL: info@shawsolar.com"); a site-scoped search for "john@shawsolar.com" returned zero results | HOLD (email gate). Recommendation: re-route this F1 to info@shawsolar.com (own-site verified verbatim) with a one-line recipient swap in the draft, or hold the slot for the next round |
| 5 | Sunsense Solar (Carbondale) | Sunsense@sunsensesolar.com | PASS: sunsensesolar.com/contact/ shows "Email: Sunsense@sunsensesolar.com" (Roaring Fork Valley main office, 818 Industry Place Unit A, Carbondale) | GO |
| 6 | Top Notch Hardwood Flooring (Montrose) | KWILSON@TOPNOTCHHARDWOODFLOORS.COM | PASS: topnotchhardwoodfloors.com/contact/ shows "Email, KWILSON@TOPNOTCHHARDWOODFLOORS.COM" (1898 Natalia Way, Montrose, 970-417-4156) | GO |

## Review delta on the 6 F1 targets (since round-72 check, 2026-09-16 ~20:25 MDT)

| Business | Delta findings | Trigger |
|---|---|---|
| High Noon Solar | Birdeye 4.6/128 unchanged; HomeAdvisor 2.8/3 unchanged; ecohome 4.4/33 unchanged; EnergySage 1.0/1 dated Oct 2022 (pre-window, unchanged). Most recent dated reviews (May 2026, Oct 2025, Jul 2025) all positive. | NO TRIGGER |
| Preferred Garage Doors | Birdeye 5.0/146 unchanged; Angi 5.0/5 (2020) unchanged. Northbrook IL "Preferred Garage Door Repair" hit is a different business, not conflated. | NO TRIGGER |
| Renwick Tiles | Etsy 5.0/166 unchanged (newest dated Aug 18, 2026, positive); ecohome 5.0/1 unchanged. | NO TRIGGER |
| Shaw Solar | Birdeye 4.9/59 unchanged; Wanderlog 4.9 with one undated 1-star (intel-only, already recorded round 72); all visible excerpts positive. | NO TRIGGER |
| Sunsense Solar | Birdeye 5.0/42 unchanged (40x 5-star, 1x 4-star, zero negatives; highest-rated review Jun 9, 2026, 5-star); solarreviews all positive. | NO TRIGGER |
| Top Notch Hardwood Flooring | Birdeye 5.0/37 unchanged (all excerpts positive); VerView 2018 positives unchanged. Angi hits for Montrose MI/MN/NY are wrong-market businesses, not conflated. | NO TRIGGER |

**Review-delta outcome:** 0 new trigger-grade reviews on any of the 6. The Shaw Solar HOLD is email-gate only, not reviews.

## Cold slots 7-10 (cheap-verify)

| Slot | Business | Recipient | Own-site evidence | Verdict |
|---|---|---|---|---|
| 7 | B & B Plumbing & Heating (Rifle) | rifleplumber@yahoo.com | Fetch of rifleplumber.com/plumbing-services.php FAILED this round (fetch blocked after an unrelated failure); evidence carried forward from round 73 (2026-09-17 ~02:20 MDT): verbatim PASS at that URL | GO (carry-forward, evidence ~3h old). Yahoo stays on the bounce watch; no bounce on record |
| 8 | KC Electrical Services LLC (Delta) | kcelectricalservices@gmail.com | Unchanged since round 73: own-site live render (kcelectricservice.com) shows phone-only; the Gmail is indexed-only on third-party listings = FAIL per the cheap-verify rule | HOLD (already HOLD in queue file; no change) |
| 9 | American Asphalt (Glenwood Springs) | asphalt@americanasphalt.biz | Evidence carried forward from round 73 (2026-09-17): verbatim PASS at americanasphalt.biz/about-us.html | GO (carry-forward, evidence ~3h old) |
| 10 | Whitewolf Cabinets (Grand Junction) | info@whitewolfcabinets.com | Evidence carried forward from round 73 (2026-09-17): verbatim PASS on whitewolfcabinets.com homepage contact block | GO (carry-forward, evidence ~3h old) |

## Pre-send verdict summary

- GO: slots 1, 3, 5, 6 (fresh own-site PASS this round), slots 9, 10 (carry-forward PASS from round 73 this morning)
- GO WITH CAVEAT: slot 2 (address previously sent clean, bounce watch, own-site re-confirm pending), slot 7 (carry-forward PASS ~3h old)
- HOLD: slot 4 (john@shawsolar.com absent from own site; recommend re-route to own-site-verified info@shawsolar.com), slot 8 (unchanged indexed-only Gmail, FAIL)

**Queue arithmetic for the 18:00 MDT cap:** 8 firm slots (1,2,3,5,6,7,9,10) + 2 HOLD (4,8). If slot 4 re-routes to info@shawsolar.com, it becomes a 9th GO. If KC slot 8 stays unverified, swap in a verified cold backup or leave the cap short rather than force an indexed-only send.
