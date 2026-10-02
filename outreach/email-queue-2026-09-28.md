# Email queue — 2026-09-28 UTC cap (10 sends, opens 18:00 MDT 2026-09-27)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

CREATED 2026-09-23 round 124 (follow-up-priority cascade). 4 follow-up slots + 6 cold FIFO slots. All 4 follow-up drafts WRITTEN round 125, voice-audited. Firing round verifies Gmail eligibility before sending.

## FIRED 2026-09-28 round 155 — UTC-day count 10/10, CAP CLOSED (all verified in sent mail)
- F1 slot 1: Good Earth Landscaping → info@goodearthaspen.com — F1 SENT, Gmail thread 1a0e5cc526770ec7
- F1 slot 2: Right Around Roofing → Rightaroundroofing777@gmail.com — F1 SENT, Gmail thread 1a0e5cc681740af4
- F1 slot 3: Advanced Window Cleaning → advancedwindowgj@gmail.com — F1 SENT, Gmail thread 1a0e5cc8080798a6
- F2 slot 4: Comfort Air → office@comfortairco.com — HELD: eligibility discrepancy DISC-20260928021445-0a3913, human reconciliation required
- Cold slot 5: Hometown Electric → hometownelectric138@gmail.com — SENT, Gmail thread 1a0e5cc9dcb7c90b
- Cold slot 6: Linville Lock and Key → Linvillelockandkey@gmail.com — SENT (re-voiced round155), Gmail thread 1a0e5cdb5c22fb3e
- Cold slot 7: J Lock Key & Alarm → info@jlockandkey.com — SENT (re-voiced round155), Gmail thread 1a0e5cdca72f3ecf
- Cold slot 8: Colorado Wash Services → coloradowashservices@gmail.com — SENT (re-voiced round155), Gmail thread 1a0e5cde02f3a10a
- Cold slot 9: Grasso Masonry → info@grassomasonry.com — SENT (WRONG ADDRESS; unverified; thread 1a0e5cdf6a2c943a) + CORRECTED re-send to vince@grassomasonry.com — SENT, Gmail thread 1a0e5cf39b5a586b (canonical/site-published address; fire-time address deviation, process mistake logged)
- Cold slot 10: Integrity Stucco by Daniel → integritystuccobydaniel@gmail.com — SENT (WRONG ADDRESS; unverified; thread 1a0e5ce101c76fec; process mistake logged); CORRECTED copy to abramintegritypaint@gmail.com QUEUED at drafts/round156-integrity-stucco-corrected.md for next UTC cap

## F1 ladder-priority slots 1-3 (September-23 cold cohort, second half; initial sends 2026-09-23 UTC; F1 window 2026-09-27 to 2026-09-30; DRAFTS WRITTEN round 126, voice-audited, bump bodies 37-40 words)
1. `drafts/round126-f1-good-earth.md` → info@goodearthaspen.com (Good Earth Landscaping & Maintenance, Carbondale; landscaping + snow services, 25+ years; site-published email; initial draft drafts/round16-good-earth-email.md)
2. `drafts/round126-f1-right-around-roofing.md` → Rightaroundroofing777@gmail.com (Right Around Roofing, Montrose; residential + commercial roofer, TAMKO-certified; site-published on contact page; Gmail address, cheap-verify before send; initial draft drafts/round16-right-around-roofing-email.md)
3. `drafts/round126-f1-advanced-window-cleaning.md` → advancedwindowgj@gmail.com (Advanced Window Cleaning, Grand Junction; window cleaning; site-published on own site; Gmail address, cheap-verify before send; initial draft drafts/round17-advanced-window-cleaning-email.md)

## F2 ladder-priority slot 4 (window 2026-09-28 to 2026-10-02; DRAFT WRITTEN round 126)
4. `drafts/round126-f2-comfort-air.md` → office@comfortairco.com (Comfort Air Of Grand Junction LLC; own-site footer email; initial SENT 2026-09-18 UTC; F1 SENT 2026-09-22; no reply; NEW F2 angle: pre-winter tune-up season booking now; clear easy out; THIRD and FINAL touch, ladder ends after)

## Cold FIFO slots 5-10 — corridor only (send only after follow-up slots; FIFO order preserved)
5. `drafts/round32-hometown-electric-email.md` → hometownelectric138@gmail.com (Hometown Electric, Delta; Gmail address, cheap-verify before send)
6. `drafts/round33-linville-lock-and-key.md` → Linvillelockandkey@gmail.com (Linville Lock and Key, Grand Junction; locksmith; own-site verified 2026-09-12; cheap-verify Gmail before send)
7. `drafts/round33-j-lock-key-and-alarm.md` → info@jlockandkey.com (J Lock Key & Alarm, Fruita; locksmith; own-site verified 2026-09-12; cc-able: arne@jlockandkey.com)
8. `drafts/round33-colorado-wash-services.md` → coloradowashservices@gmail.com (Colorado Wash Services, Grand Junction; pressure washing; own-site verified 2026-09-12; cheap-verify Gmail before send)
9. `drafts/round36-grasso-masonry-email.md` → vince@grassomasonry.com (Grasso Masonry, Grand Junction; WARM; site-published email)
10. `drafts/round36-integrity-stucco-email.md` → abramintegritypaint@gmail.com (Integrity Stucco by Daniel, Grand Junction; licensed Mesa County specialty contractor; Gmail estimator intake; site-published email; cheap-verify Gmail before send) — promoted 2026-09-27 round 152 (grand-valley-concrete-polishing fired on the 09-27 UTC cap 08:15 UTC; roll cascades up)

## Rolled to 2026-09-30 (corridor cold FIFO continued, order preserved; fire 10 per the UTC cap, roll the remainder)
Rebuilt 2026-09-25 round 146; integrity-stucco promoted to 09-28 slot 10 by round 152 (2026-09-27); STRUCK-SENT 2026-09-25 entries (haining, alpine-roll-off, dump-it-dumpsters; round143) removed to prevent duplicate sends; roaring-fork-spray-foam restored (chain-gap: present on the 09-26 roll at position 36, dropped from this roll by the round-124 rebuild).
11. `drafts/round105-hoffmanns-custom-painting-email.md` → hcpaintgj@aol.com (Hoffmann's Custom Painting, Fruita; own-site contact page email verified 2026-09-21; AOL address, cheap-verify before send; review delta + chain re-verify at pre-send)
13. `drafts/round109-good-friend-inspections-email.md` → nason@goodfriendinspections.com (Good Friend Inspections, Grand Junction; home inspection + radon testing; owner Thomas W Nason PE; own-site email verified live 2026-09-21; WARM; review delta + chain re-verify at pre-send)
14. `drafts/round45-stronghold-tree-care-email.md` → strongholdtrees@gmail.com (Stronghold Tree Care, Montrose; WARM; third-party listing email; VERIFY before send; cheap-verify Gmail before send)
15. `drafts/round45-sandoval-construction-email.md` → info@sandovalconstructionllc.com (Sandoval Construction, Montrose; WARM; own-site email)
16. `drafts/round51-mccants-maintenance-email.md` → Info@mccantshomemaintenance.org (McCants Maintenance, Montrose)
17. `drafts/round52-premier-sparkle-email.md` → premier.sparkle1@gmail.com (Premier Sparkle LLC, Grand Junction/Western Slope; email published in own FB Page post; cheap-verify Gmail before send)
18. `drafts/round52-a-firm-foundation-email.md` → tcoulterinspector@gmail.com (A Firm Foundation Home and Building Inspection Ltd, Montrose; WARM; own-site email; cheap-verify Gmail before send)
19. `drafts/round27-honk-key-lock-safe-email.md` → info@honkkeylocksafe.com (Honk Key Lock & Safe; 09-19 HOLD: address only in 2026-06-19 company press release; never send to a dead address; second verification failure parks it)
20. `drafts/round100-western-slope-tree-services-email.md` → westernslopetree@gmail.com (Western Slope Tree Services, Delta; own-site verified 2026-09-20; cheap-verify Gmail before send; RE-VERIFY SavATree non-affiliation at send time)
21. `drafts/round74-all-metals-welding-email.md` → ryan@allmetalswelding.com (All Metals Welding & Fabrication, Grand Junction; material-sales email verbatim on own-site Material Sales pages, independently re-verified round 74 via live crawl; MISSED_CALL_LEAD_CAPTURE medium)
22. `drafts/round75-the-fireplace-company-email.md` → office@thefpco.com (The Fireplace Company, Carbondale + Gunnison; VARIANT A)
23. `drafts/round76-jbs-asphalt-email.md` → Jbasphaltco.gmail.com (JB's Asphalt Sealcoating & Striping, Grand Junction; Gmail address, cheap-verify Gmail before send)
24. `drafts/round76-clemmer-welding-email.md` → info@clemmerwelding.com (Clemmer Welding LLC, Grand Junction; own-domain)
25. `drafts/round76-family-time-spas-email.md` → info@familytimespasgj.com (Family Time Spas, Grand Junction)
26. `drafts/round76-rimrock-pools-email.md` → rimrockpools@gmail.com (Rimrock Pools and Spas, Grand Junction; BINDING PRE-SEND GATE (round 82): the firing run must confirm the email on the own site or official Facebook page before sending; if unverifiable, HOLD and pull next FIFO; Gmail address, cheap-verify Gmail before send)
27. `drafts/round76-swiss-pro-carpet-email.md` → swissproclean@gmail.com (Swiss Pro Carpet Cleaning, Grand Junction; Gmail address, cheap-verify Gmail before send)
28. `drafts/round79-siding-guy-inc-email.md` → sidingguy78@yahoo.com (Siding Guy Inc, Grand Junction; VARIANT A; Yahoo address, cheap-verify Yahoo before send)
29. `drafts/round83-flairmont-furniture-flooring-email.md` → sales@flairmontfurniture.com (Flairmont Furniture & Flooring, Montrose; family-owned since 1963; own-site email verified live 2026-09-18; WARM)
30. `drafts/round89-avalanche-power-wash-email.md` → eric@avalanchepowerwash.com (Avalanche Power Wash, Grand Junction serving Delta + Montrose; email + phone page-verified on own site 2026-09-19 round 89; WARM; disclosure first, no em dashes)
31. `drafts/round92-mobility-driven-email.md` → info@mobilitydriven.com (Mobility Driven, Grand Junction; own-domain, no cheap-verify needed; disclosure first, no em dashes)
32. `drafts/round96-american-dream-roofing-email.md` → info@americandreamroofing.com (American Dream Roofing LLC, Delta; own-site email verified live 2026-09-19; MISSED_CALL_LEAD_CAPTURE high; disclosure first, no em dashes)
33. `drafts/round134-confluence-electric-email.md` → Service@Confluence.LLC (Confluence Electric, Carbondale; electrical, license EC.0102385, 24/7; WARM; own-site email verified 2026-09-24; Gmail in:sent 0 checked round 134; chain re-verify at send time)
34. `drafts/round134-concrete-raising-services-email.md` → info@crslevel.com (Concrete Raising Services, Delta; concrete lifting/leveling; own-site email re-verified verbatim round 134; Gmail in:sent 0 checked round 134; WordPress; Delta CO entity only, chain re-verify at send time)
35. `drafts/round143-roaring-fork-spray-foam-email.md` → rfsprayfoam@gmail.com (Roaring Fork Spray Foam, Carbondale; veteran-owned 9 yrs, spray foam/fiberglass/concrete lifting; own-site email verified live round 143 2026-09-24; Gmail address, cheap-verify before send; pre-winter foam-season angle; WATCH)
36. `drafts/round152-yuck-truck-email.md` → yucktruck@gmx.com (Yuck Truck Septic Pumping Inc, Gypsum serving west-central CO incl. Carbondale/Glenwood Springs; 24/7 emergency; own-site email verified 2026-09-27 discovery; GMX address, cheap-verify before send; WATCH; radius-expansion; drafted round 152)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses. Never send to a bounced address.

## Round-124 creation notes
- The September-23 cohort F1s are split 3+3 across 09-27 and 09-28 by FIFO order of the initial sends (Keenan's, PAR, APS on 09-27; Good Earth, Right Around Roofing, Advanced Window Cleaning on 09-28).
- Comfort Air F2 fires on this cap (window 09-28 to 10-02; initial 09-18, F1 sent 09-22, no reply).
- Cold FIFO: the 6 displaced 09-26 colds fill slots 5-10; positions 11+ roll to 09-30. The old 09-30 queue file is superseded by this roll; its entries are all preserved in FIFO order above.
- Voice note: FIFO drafts from rounds 27-105 predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
