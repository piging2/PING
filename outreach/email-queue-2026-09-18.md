# Email queue — 2026-09-18 UTC cap (6 F1 follow-ups for the 2026-09-13 SENT cold batch, ladder day 5 of 4-7, then cold FIFO)

## SEND-DAY RESOLUTION (round 79, 2026-09-17 ~20:30 MDT)
All 10 sends accepted by Gmail and verified in sent mail (~02:30-02:35 UTC 2026-09-18). UTC 2026-09-18 cap 10/10 consumed. F1s -> F2 eligible 2026-09-23+; cold sends -> F1 eligible 2026-09-22+. Pipeline.md statuses flipped to F1 SENT / SENT. Parser lesson logged in follow-ups.md and angle-performance.md (3 of 10 needed a second pass on draft-format variants; no duplicates).

Round 50: review checks on the 6 live round-47 cold sends (High Noon Solar, Preferred Garage Doors, Renwick Tiles, Shaw Solar, Sunsense Solar, Top Notch Hardwood Flooring) found 0 fresh review triggers; F1 drafts written with genuine new-intel tie-ins (Renwick Etsy storefront, Shaw closed Fridays, Sunsense hiring 3 roles, Top Notch closed Tuesdays). Alpine Hot Tub Moving excluded (552 bounce, ladder cancelled). F1s take priority over cold per standing rules.

House notes:
- 10-per-UTC-day Gmail cap applies to ALL email. Send order each UTC day: (1) follow-ups (F1, F2, review-triggered), (2) new cold emails FIFO.
- Recipients are verbatim from the draft files' To: lines. Pre-send: cheap-verify Gmail/Yahoo/odd-domain addresses (preferredgaragedoors@gmail.com was pre-flagged, sent round 47 clean, no bounce since; doubletree5620@gmail.com and other Gmail-hosted addresses stay flagged for the bounce watch). Never send to a bounced address.
- Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## Slots 1-6. F1 follow-ups (initial sends 2026-09-13, day 5 of 4-7 window)
All 6 drafts open with the exact strengthened not-a-customer disclosure line, under-50-word bumps, one question max, no em dashes, no hedging. Review checks 2026-09-14: all clean, 0 triggers.
1. `drafts/round50-f1-high-noon-solar.md` → information@highnoonsolar.com (High Noon Solar, GJ; after-hours call angle; review check clean)
2. `drafts/round50-f1-preferred-garage-doors.md` → preferredgaragedoors@gmail.com (Preferred Garage Doors, Northglenn; 2 AM emergency angle; clean; pre-flagged Gmail, sent round 47 clean)
3. `drafts/round50-f1-renwick-tiles.md` → info@renwicktiles.com (Renwick Tiles, GJ; custom-inquiry angle, NEW intel: own Etsy storefront RenwickTiles selling alongside the site)
4. `drafts/round50-f1-shaw-solar.md` → info@shawsolar.com (Shaw Solar, Durango; inquiry-sorting angle, NEW intel: office closed Fridays, weekend inquiries sit unanswered; RE-ROUTED round 74: john@shawsolar.com not readable on the live own-site render, which publishes only info@shawsolar.com; draft To: line updated)
5. `drafts/round50-f1-sunsense-solar.md` → Sunsense@sunsensesolar.com (Sunsense Solar, Carbondale; orphaned-system angle, NEW intel: 3 open Indeed roles, growth-phase hiring)
6. `drafts/round50-f1-top-notch-hardwood-flooring.md` → KWILSON@TOPNOTCHHARDWOODFLOORS.COM (Top Notch Hardwood Flooring, Montrose; estimate-capture angle, NEW intel: office closed Tuesdays)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update pipeline.md suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-23+ (F1 sent 2026-09-18)". These 6 have no canonical JSONL rows (pipeline.md only until slots free honestly).

## Slots 7-9. Cold FIFO
7. `drafts/round43-bb-plumbing-heating-email.md` → rifleplumber@yahoo.com (B & B Plumbing & Heating, Rifle; family-owned since 1974; MISSED_CALL_LEAD_CAPTURE primary, WEBSITE_REVAMP secondary; site-published Yahoo address, cheap-verify before send)
8. `drafts/round45-comfort-air-email.md` → office@comfortairco.com (Comfort Air Of Grand Junction LLC, Grand Junction; independent family-owned since 1997, Lennox dealer; MISSED_CALL_LEAD_CAPTURE high; cheap-verify PASS round 74: office@comfortairco.com verbatim on comfortairgjco.com homepage footer, live fetch 2026-09-17 ~05:30 MDT; draft opens with exact disclosure line, one question, no em dashes)
9. `drafts/round48-american-asphalt-email.md` → asphalt@americanasphalt.biz (American Asphalt, Glenwood Springs; family-owned 30+ years, WEBSITE_REVAMP high-confidence; own-site About page email verified 2026-09-13; VARIANT A of the round-44 copy test, log variant in angle-performance.md when sent)

## Slot 10. Cold FIFO
10. `drafts/round50-whitewolf-cabinets-email.md` → info@whitewolfcabinets.com (Whitewolf Cabinets, Grand Junction; family-run 23+ years, custom cabinets + countertops; MISSED_CALL_LEAD_CAPTURE medium; own-site domain email, RE-VERIFIED round 50)

## Send-day notes
- Slot 10 open: pull next eligible from the cold FIFO tail (round45-comfort-air/doubletree/haining/sandoval-construction, or the round-27 FIFO head) only if the first 9 all accept cleanly. Follow-ups keep priority; never bump an F1 for a cold send.
- Round-74 resolutions: slot 4 re-routed to info@shawsolar.com (own-site-verified; john@ not on the live own-site render); slot 8 swapped from KC Electrical (HOLD: email route closed, FB Page not locatable via read-only routes) to Comfort Air (domain email, cheap-verify PASS round 74). Queue is 10/10 GO, all recipients own-site-verified. KC stays WATCH in pipeline.md (phone route (970) 417-2300 noted; FB Page needs Pig native search before any FB DM).
- The 4 cold drafts: B & B (round-43 Meta AI a-weak-website-hunt ingest), Comfort Air (round-45 Meta AI e-pass), american-asphalt (round-48 research), whitewolf (round-50). Send after all follow-up obligations for 2026-09-18 are met; cap permitting.
- On acceptance: flip pipeline/leads status to SENT, log date in leads.md Result line, update JSONL row (merge first if slots free: JSONL at quality cap; these rows exist in pipeline.md only).
