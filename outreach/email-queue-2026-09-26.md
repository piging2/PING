# Email queue — 2026-09-26 UTC cap (10 sends, opens 18:00 MDT 2026-09-25)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

REBUILT 2026-09-23 round 124 (follow-up-priority correction). Previous version: 4 round-111-cohort F1s (slots 1-4) + 6 cold FIFO (slots 5-10). This rebuild replaces the 6 cold slots with the 6 September-21-cohort F1s, whose F1 window (2026-09-25 to 2026-09-28) ends 09-28 and whose drafts were written round 124. All 17 follow-up drafts verified on disk 2026-09-23 ~11:40 MDT. The 6 displaced cold FIFO drafts cascade forward in FIFO order (roll section below). No STRUCK, parked, suppressed, or bounced draft re-queued.
- round45-comfort-air and round60-b-b-plumbing-heating are NOT in this list: both SENT on the 2026-09-18 UTC cap, duplicate-send prevented, struck everywhere. Road Scholars Moving is NOT rolled: PARKED 2026-09-17 round 80 (SUPPRESS; never re-queue).
- 2026-09-23 UTC cap is 10/10 consumed (round 119). Zero sends on this round; queue edits only.

## F1 ladder-priority slots 1-4 (round-111 cohort, reconciled round 113; initial sends 2026-09-21 ~20:16 MDT; F1 window 2026-09-26 to 2026-09-29)
1. `drafts/round113-f1-grime-fighters.md` → gjgrimefighters@gmail.com (Grime Fighters, Grand Junction; bin cleaning; F1 from round-111 cold VARIANT B; Gmail address, cheap-verify before send)
2. `drafts/round113-f1-m1pro-plumbing.md` → m1proplumbing@gmail.com (M1Pro Plumbing LLC, Clifton; F1 from round-111 cold VARIANT A; Gmail address, cheap-verify before send)
3. `drafts/round113-f1-gps-plumbing-mechanical.md` → gpsplumbingco@gmail.com (GPS Plumbing & Mechanical LLC, Grand Junction; swamp cooler specialty; F1 from round-111 cold VARIANT B; Gmail address, cheap-verify before send)
4. `drafts/round113-f1-shelton-drilling.md` → wsdi@rof.net (Shelton Drilling Corp., Rifle; F1 from round-111 cold VARIANT B; own-domain email, no cheap-verify flag)

## F1 ladder-priority slots 5-10 (September-21 cold cohort; initial sends 2026-09-21 UTC; F1 window 2026-09-25 to 2026-09-28; drafts written round 124)
All six drafts voice-audited round 124: exact disclosure line first, AI identity declared, sentence-per-line, no em dashes, no human-name sender intro/signature, sign-off exactly "PING Social, (970) 589-3309", bump bodies 32-44 words.
5. `drafts/round124-f1-colorado-maintenance-group.md` → john@cmgus.com (Colorado Maintenance Group, Rifle; bid-request same-day-answer angle)
6. `drafts/round124-f1-a-wiser-auto-glass.md` → awiserautoglass@yahoo.com (A-Wiser Auto Glass, Grand Junction; voicemail-books-next-shop angle; cheap-verify Yahoo before send)
7. `drafts/round124-f1-easy-glass.md` → easyglassri@gmail.com (Easy Glass, Grand Junction; 24/7 midnight-caller angle; cheap-verify Gmail before send)
8. `drafts/round124-f1-windshields-express.md` → windshieldsexpress@yahoo.com (Windshields Express, Grand Junction; ringing-line-mid-replacement angle, phone-preferring shop; cheap-verify Yahoo before send)
9. `drafts/round124-f1-driven-diagnostics.md` → info@drivendiagnostics.com (Driven Diagnostics, Grand Junction; Mon-Thu hours, Friday-breakdown angle)
10. `drafts/round124-f1-bristlecone-landscapes.md` → bristleconelandscapes@hotmail.com (Bristlecone Landscapes, Montrose; three-landscapers answers-first angle; cheap-verify Hotmail before send)

## F2/F1 follow-up slots (ladder priority) — TO BE RECONCILED by the run that fires this queue
- Round-71 F1 cohort F2s (initial sends 2026-09-13; F1 SENT 2026-09-17 Gmail-verified; queue note previously said 2026-09-16, corrected 2026-09-24 round 129): corridor members High Noon Solar (GJ), Renwick Tiles (GJ), Sunsense Solar (Carbondale), Top Notch Hardwood Flooring (Montrose) have F2 drafts from round 85 and were scheduled on the 09-24 cap; if un-sent they front this queue ahead of cold. PARKED_GEOGRAPHY (round 102): Preferred Garage Doors (Northglenn) and Shaw Solar (Durango) F2 ladders stay parked. No F2 drafts are written for parked ladders.
- F2 slots only exist IF the F1s were actually SENT. Check follow-ups.md before sending. If any ladder is dead (reply/decline/bounce), pull the next cold draft from the FIFO below to keep the cap at 10.

## Rolled cold FIFO — corridor only, FIFO order preserved (send only after all follow-up slots are filled or confirmed dead; fire on 2026-09-28 cap first, then cascade to 2026-09-30)
0. `drafts/round18-chrome-pest-control-email.md` → Chromeent@outlook.com (Chrome Mosquito & Pest Control, Fruita; HOLD 2026-09-24 round 129: cheap-verify FAIL — address masked as [email protected] on live chromepest.com/contact/, own-site-indexed only; re-verify verbatim on own site before send; second verification failure parks it; placed at head because it was already queued for the 09-24 cap and re-voiced to current standards)
Displaced by this rebuild (old 09-26 slots 5-10, order preserved):
1. MOVED 2026-09-25 round 146: `drafts/round30-alpine-fencing-email.md` → alpinefencing@aol.com (Alpine Fencing & Supplies, Delta) — pulled forward to fill the vacated 09-27 F1 slot 3 (High Mountain Hearth bounce) per standing order. The 09-26 firing round must SKIP this entry as a fallback and pull from position 2 onward.
2. `drafts/round30-grand-valley-concrete-polishing-email.md` → steve@grandvalleypolishing.com (Grand Valley Concrete Polishing, Clifton; decorative concrete polishing/staining/sealing; own contact page email)
3. `drafts/round32-hometown-electric-email.md` → hometownelectric138@gmail.com (Hometown Electric, Delta; Gmail address, cheap-verify before send)
4. `drafts/round33-linville-lock-and-key.md` → Linvillelockandkey@gmail.com (Linville Lock and Key, Grand Junction; locksmith; own-site verified 2026-09-12; cheap-verify Gmail before send)
5. `drafts/round33-j-lock-key-and-alarm.md` → info@jlockandkey.com (J Lock Key & Alarm, Fruita; locksmith; own-site verified 2026-09-12; cc-able: arne@jlockandkey.com)
6. `drafts/round33-colorado-wash-services.md` → coloradowashservices@gmail.com (Colorado Wash Services, Grand Junction; pressure washing; own-site verified 2026-09-12; cheap-verify Gmail before send)

Restored chain-gap entries (old 09-26 roll positions 7-8, 28-29, missing from the old 09-27 chain; re-inserted in FIFO position rather than dropped):
7. `drafts/round36-grasso-masonry-email.md` → vince@grassomasonry.com (Grasso Masonry, Grand Junction; WARM; site-published email)
8. `drafts/round36-integrity-stucco-email.md` → abramintegritypaint@gmail.com (Integrity Stucco by Daniel, Grand Junction; licensed Mesa County specialty contractor; Gmail estimator intake; site-published email; cheap-verify Gmail before send)
9. STRUCK-SENT 2026-09-25: `drafts/round45-haining-email.md` (Haining Home Services & Airtech) — SENT 2026-09-25 UTC round 143, msg 1a0d6610f480e55a; removed from roll, F1 ladder opens 2026-09-29.
10. `drafts/round105-hoffmanns-custom-painting-email.md` → hcpaintgj@aol.com (Hoffmann's Custom Painting, Fruita; family-owned; own-site contact page email verified 2026-09-21; AOL address, cheap-verify before send; review delta + chain re-verify at pre-send)
11. `drafts/round109-good-friend-inspections-email.md` → nason@goodfriendinspections.com (Good Friend Inspections, Grand Junction; home inspection + radon testing; owner Thomas W Nason PE; own-site email verified live 2026-09-21; WARM; review delta + chain re-verify at pre-send)

Continuing FIFO (chained from the old 09-27 queue, order preserved):
12. `drafts/round45-stronghold-tree-care-email.md` → strongholdtrees@gmail.com (Stronghold Tree Care, Montrose; WARM; third-party listing email; VERIFY before send; cheap-verify Gmail before send)
13. `drafts/round45-sandoval-construction-email.md` → info@sandovalconstructionllc.com (Sandoval Construction, Montrose; WARM; own-site email)
14. `drafts/round51-mccants-maintenance-email.md` → Info@mccantshomemaintenance.org (McCants Maintenance, Montrose)
15. `drafts/round52-premier-sparkle-email.md` → premier.sparkle1@gmail.com (Premier Sparkle LLC, Grand Junction/Western Slope; email published in own FB Page post; cheap-verify Gmail before send)
16. `drafts/round52-a-firm-foundation-email.md` → tcoulterinspector@gmail.com (A Firm Foundation Home and Building Inspection Ltd, Montrose; WARM; own-site email; cheap-verify Gmail before send)
17. `drafts/round27-honk-key-lock-safe-email.md` → info@honkkeylocksafe.com (Honk Key Lock & Safe; 09-19 HOLD: address only in 2026-06-19 company press release, not on current site; cheap-verify before send; never send to a dead address; a second verification failure parks it)
18. `drafts/round100-western-slope-tree-services-email.md` → westernslopetree@gmail.com (Western Slope Tree Services, Delta; own-site verified 2026-09-20; cheap-verify Gmail before send; RE-VERIFY SavATree non-affiliation at send time)
19. STRUCK-SENT 2026-09-25: `drafts/round78-alpine-roll-off-email.md` (Alpine Roll-Off Services) — SENT 2026-09-25 UTC round 143, msg 1a0d66167e4a9936; removed from roll, F1 ladder opens 2026-09-29.
20. STRUCK-SENT 2026-09-25: `drafts/round78-dump-it-dumpsters-email.md` (Dump-It Dumpsters) — SENT 2026-09-25 UTC round 143, msg 1a0d661b569f1fcb; removed from roll, F1 ladder opens 2026-09-29.
21. `drafts/round74-all-metals-welding-email.md` → ryan@allmetalswelding.com (All Metals Welding & Fabrication, Grand Junction; material-sales email verbatim on own-site Material Sales pages, independently re-verified round 74 via live crawl; MISSED_CALL_LEAD_CAPTURE medium)
22. `drafts/round75-the-fireplace-company-email.md` → office@thefpco.com (The Fireplace Company, Carbondale + Gunnison; VARIANT A)
23. `drafts/round76-jbs-asphalt-email.md` → Jbasphaltco.gmail.com (JB's Asphalt Sealcoating & Striping, Grand Junction; Gmail address, cheap-verify before send)
24. `drafts/round76-clemmer-welding-email.md` → info@clemmerwelding.com (Clemmer Welding LLC, Grand Junction; own-domain)
25. `drafts/round76-family-time-spas-email.md` → info@familytimespasgj.com (Family Time Spas, Grand Junction)
26. `drafts/round76-rimrock-pools-email.md` → rimrockpools@gmail.com (Rimrock Pools and Spas, Grand Junction; BINDING PRE-SEND GATE (round 82): the firing run must confirm the email on the own site or official Facebook page before sending; if unverifiable, HOLD and pull next FIFO; Gmail address, cheap-verify Gmail before send)
27. `drafts/round76-swiss-pro-carpet-email.md` → swissproclean@gmail.com (Swiss Pro Carpet Cleaning, Grand Junction; Gmail address, cheap-verify Gmail before send)
28. `drafts/round79-siding-guy-inc-email.md` → sidingguy78@yahoo.com (Siding Guy Inc, Grand Junction; VARIANT A; Yahoo address, cheap-verify Yahoo before send)
29. `drafts/round83-flairmont-furniture-flooring-email.md` → sales@flairmontfurniture.com (Flairmont Furniture & Flooring, Montrose; family-owned since 1963; own-site email verified live 2026-09-18; WARM)
30. `drafts/round89-avalanche-power-wash-email.md` → eric@avalanchepowerwash.com (Avalanche Power Wash, Grand Junction serving Delta + Montrose; email + phone page-verified on own site 2026-09-19 round 89; WARM; disclosure first, no em dashes)
31. `drafts/round92-mobility-driven-email.md` → info@mobilitydriven.com (Mobility Driven, Grand Junction; own-site email page-verified 2026-09-19 round 91; own-domain, no cheap-verify needed; disclosure first, no em dashes)
32. `drafts/round96-american-dream-roofing-email.md` → info@americandreamroofing.com (American Dream Roofing LLC, Delta; own-site email verified live 2026-09-19; MISSED_CALL_LEAD_CAPTURE high; disclosure first, no em dashes)
33. `drafts/round130-timberline-custom-painting-email.md` → timberlinepainting@msn.com (Timberline Custom Painting, Delta area; residential painting, Kevin Paul founder 1997; email verbatim on own-site tcpdelta.com homepage, cheap-verify PASS round 130 2026-09-24; Gmail in:sent=0; fall exterior-window angle; disclosure first, no em dashes; WARM)
34. `drafts/round134-confluence-electric-email.md` → Service@Confluence.LLC (Confluence Electric, Carbondale; electrical, license EC.0102385, 24/7; WARM; own-site email verified 2026-09-24; Gmail in:sent 0 checked round 134; chain re-verify at send time)
35. `drafts/round134-concrete-raising-services-email.md` → info@crslevel.com (Concrete Raising Services, Delta; concrete lifting/leveling; own-site email re-verified verbatim round 134; Gmail in:sent 0 checked round 134; WordPress; Delta CO entity only, chain re-verify at send time)
36. `drafts/round143-roaring-fork-spray-foam-email.md` → rfsprayfoam@gmail.com (Roaring Fork Spray Foam, Carbondale; veteran-owned 9 yrs, spray foam/fiberglass/concrete lifting; own-site email verified live round 143 2026-09-24; Gmail address, cheap-verify before send; pre-winter foam-season angle; WATCH)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses. Never send to a bounced address. sander-and-sons holds slot 10 of the 2026-09-20 queue and is not part of this roll.

## Round-124 rebuild notes
- Follow-up priority: all 10 sends are follow-ups. The 6 September-21-cohort F1s take ladder priority over cold; their window ends 09-28, so they fire on this cap.
- FIFO preservation: displaced cold drafts keep their relative order and cascade to the 09-28 cap first (slots 5-10), then to 09-30.
- Chain-gap restoration: grasso-masonry, integrity-stucco, hoffmanns-custom-painting, good-friend-inspections were in the old 09-26 roll but never appeared in the old 09-27 chain (round-102 rebuild dropped them). Restored at positions 7-11 in FIFO order rather than silently dropped. Haining rolls in from 09-25 slot 10 at position 9.
- Voice note: FIFO drafts from rounds 27-105 predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
