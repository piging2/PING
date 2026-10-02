# Email queue — 2026-09-30 UTC cap (10 sends, opens 18:00 MDT 2026-09-29)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

REBUILT 2026-09-23 round 124. The previous version of this file (round 102 chain) is superseded; its cold FIFO entries are preserved in order in the roll section of email-queue-2026-09-28.md and picked up below. Comfort Air F2 now fires on the 09-28 cap, not this one. No follow-up drafts are pre-scheduled for this cap; if any follow-up becomes eligible (reply-check before firing), it fronts the queue ahead of cold per standing priority.

## Cold FIFO slots 1-10 — corridor only (fire 10 per the UTC cap; FIFO order preserved)
1. `drafts/round36-integrity-stucco-email.md` → abramintegritypaint@gmail.com — HELD 2026-09-29 (round 159): the round-156 corrected draft to this same address returned DISCREPANCY DISC-20260929022019-dd7aa3 (misdirect counted as prior touch). POLICY REVIEW REQUIRED; nothing goes to this address until human reconciliation. (Integrity Stucco by Daniel, Grand Junction; licensed Mesa County specialty contractor; Gmail estimator intake)
2. `drafts/round105-hoffmanns-custom-painting-email.md` → hcpaintgj@aol.com — SENT 2026-09-29 UTC round 159 (Gmail id 1a0eaf7efd92fa91; slot 11 cold FIFO head; re-voiced; gate ELIGIBLE; chain INDEPENDENT re-verified). F1 eligible 2026-10-03 to 2026-10-06 (draft NEEDED). (Hoffmann's Custom Painting, Fruita; family-owned; own-site contact page email verified 2026-09-21; AOL address, cheap-verify clean)
3. `drafts/round109-good-friend-inspections-email.md` → nason@goodfriendinspections.com (Good Friend Inspections, Grand Junction; home inspection + radon testing; owner Thomas W Nason PE; own-site email verified live 2026-09-21; WARM; review delta + chain re-verify at pre-send)
4. `drafts/round45-stronghold-tree-care-email.md` → strongholdtrees@gmail.com (Stronghold Tree Care, Montrose; WARM; third-party listing email; VERIFY before send; cheap-verify Gmail before send)
5. `drafts/round45-sandoval-construction-email.md` → info@sandovalconstructionllc.com (Sandoval Construction, Montrose; WARM; own-site email)
6. `drafts/round51-mccants-maintenance-email.md` → Info@mccantshomemaintenance.org (McCants Maintenance, Montrose)
7. `drafts/round52-premier-sparkle-email.md` → premier.sparkle1@gmail.com (Premier Sparkle LLC, Grand Junction/Western Slope; email published in own FB Page post; cheap-verify Gmail before send)
8. `drafts/round52-a-firm-foundation-email.md` → tcoulterinspector@gmail.com (A Firm Foundation Home and Building Inspection Ltd, Montrose; WARM; own-site email; cheap-verify Gmail before send)
9. `drafts/round27-honk-key-lock-safe-email.md` → info@honkkeylocksafe.com (Honk Key Lock & Safe; 09-19 HOLD: address only in 2026-06-19 company press release; never send to a dead address; second verification failure parks it)
10. `drafts/round100-western-slope-tree-services-email.md` → westernslopetree@gmail.com (Western Slope Tree Services, Delta; own-site verified 2026-09-20; cheap-verify Gmail before send; RE-VERIFY SavATree non-affiliation at send time)

## Rolled forward (corridor cold FIFO continued, order preserved; fire on the next cap, 10 per UTC day)
11. `drafts/round74-all-metals-welding-email.md` → ryan@allmetalswelding.com (All Metals Welding & Fabrication, Grand Junction; material-sales email verbatim on own-site Material Sales pages, independently re-verified round 74 via live crawl; MISSED_CALL_LEAD_CAPTURE medium)
12. `drafts/round75-the-fireplace-company-email.md` → office@thefpco.com (The Fireplace Company, Carbondale + Gunnison; VARIANT A)
13. `drafts/round76-jbs-asphalt-email.md` → Jbasphaltco.gmail.com (JB's Asphalt Sealcoating & Striping, Grand Junction; Gmail address, cheap-verify Gmail before send)
14. `drafts/round76-clemmer-welding-email.md` → info@clemmerwelding.com (Clemmer Welding LLC, Grand Junction; own-domain)
15. `drafts/round76-family-time-spas-email.md` → info@familytimespasgj.com (Family Time Spas, Grand Junction)
16. `drafts/round76-rimrock-pools-email.md` → rimrockpools@gmail.com (Rimrock Pools and Spas, Grand Junction; BINDING PRE-SEND GATE (round 82): the firing run must confirm the email on the own site or official Facebook page before sending; if unverifiable, HOLD and pull next FIFO; Gmail address, cheap-verify Gmail before send)
17. `drafts/round76-swiss-pro-carpet-email.md` → swissproclean@gmail.com (Swiss Pro Carpet Cleaning, Grand Junction; Gmail address, cheap-verify Gmail before send)
18. `drafts/round79-siding-guy-inc-email.md` → sidingguy78@yahoo.com (Siding Guy Inc, Grand Junction; VARIANT A; Yahoo address, cheap-verify Yahoo before send)
19. `drafts/round83-flairmont-furniture-flooring-email.md` → sales@flairmontfurniture.com (Flairmont Furniture & Flooring, Montrose; family-owned since 1963; own-site email verified live 2026-09-18; WARM)
20. `drafts/round89-avalanche-power-wash-email.md` → eric@avalanchepowerwash.com (Avalanche Power Wash, Grand Junction serving Delta + Montrose; email + phone page-verified on own site 2026-09-19 round 89; WARM; disclosure first, no em dashes)
21. `drafts/round92-mobility-driven-email.md` → info@mobilitydriven.com (Mobility Driven, Grand Junction; own-domain, no cheap-verify needed; disclosure first, no em dashes)
22. `drafts/round96-american-dream-roofing-email.md` → info@americandreamroofing.com (American Dream Roofing LLC, Delta; own-site email verified live 2026-09-19; MISSED_CALL_LEAD_CAPTURE high; disclosure first, no em dashes)
23. `drafts/round134-confluence-electric-email.md` → Service@Confluence.LLC (Confluence Electric, Carbondale; electrical, license EC.0102385, 24/7; WARM; own-site email verified 2026-09-24; Gmail in:sent 0 checked round 134; chain re-verify at send time)
24. `drafts/round134-concrete-raising-services-email.md` → info@crslevel.com (Concrete Raising Services, Delta; concrete lifting/leveling; own-site email re-verified verbatim round 134; Gmail in:sent 0 checked round 134; WordPress; Delta CO entity only, chain re-verify at send time)
25. `drafts/round143-roaring-fork-spray-foam-email.md` → rfsprayfoam@gmail.com (Roaring Fork Spray Foam, Carbondale; veteran-owned 9 yrs, spray foam/fiberglass/concrete lifting; own-site email verified live round 143 2026-09-24; Gmail address, cheap-verify before send; pre-winter foam-season angle; WATCH)
26. `drafts/round128-pencil-log-pros.md` → office@pencillogpros.com (Pencil Log Pros, Grand Junction; WARM; own-site email verified live 2026-09-23; chain INDEPENDENT 2026-09-23, re-verify at send time; Gmail in:sent = 0 verified 2026-09-23)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses. Never send to a bounced address.

## Round-124 rebuild notes
- Follow-up priority checked: no newly eligible follow-ups land on this cap as of round 124 (Comfort Air F2 moved to 09-28; round-85 F2s fire 09-24; the 09-27 cap holds the F2 finals). Reply-check before firing; any eligible follow-up fronts this queue ahead of cold.
- Voice note: FIFO drafts from rounds 27-105 predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.

## Rolled to 2026-10-01 (round-140 corridor cold FIFO, order preserved; fire 10 per the UTC cap, roll the remainder)
11. `drafts/round140-full-palette-painting-email.md` → info@fullpalettepainting.com (Full Palette Painting & Designs, Grand Junction; painting/interior/cabinet refinishing/faux/plaster; family-owned since 2000; own-site contact page email)
12. `drafts/round140-specialized-finishes-email.md` → contact@specializedfinishes.com (Specialized Finishes, Grand Junction; owner Shawn Turner, every project personally since 1997; antique restoration/furniture refinishing; own-site footer email x2)
13. `drafts/round140-tint-shop-co-email.md` → sales@thetintshopco.com (The Tint Shop Co, Grand Junction; window tinting/wraps/PPF; family-owned; own-site email)
14. `drafts/round140-distinctive-wood-designs-email.md` → DARRIN@DISTINCTIVEWOOD.NET (Distinctive Wood Designs, Montrose; custom cabinetry + commercial millwork; WEBSITE_REVAMP angle, own-site email)
15. `drafts/round140-lincoln-woodworks-email.md` → office@lincolnwoodworks.com (Lincoln Woodworks, Palisade; custom cabinetry/kitchens; actively hiring; own-site Contact page email)
37. `drafts/round154-westwind-painting-email.md` → mike@westwindpainting.com (Westwind Painting Contractors, Grand Junction; WARM; own site westwindpainting.com live; chain INDEPENDENT re-verified 2026-09-27 round 154; own-domain address, no cheap-verify needed; MISSED_CALL_LEAD_CAPTURE medium-high; queued 2026-09-27 round 154)
38. `drafts/round154-highlander-paint-finishes-email.md` → [email protected] (Highlander Paint + Finishes, Carbondale; WARM; own site highlanderpaint.com live; chain INDEPENDENT re-verified 2026-09-27 round 154; NAME-COLLISION NOTE resolved at outreach level (Carbondale entity); Gmail address, cheap-verify before send; queued 2026-09-27 round 154)
39. `drafts/round158-earthen-elements-h2o-email.md` → support@earthenelementsh2o.com (Earthen Elements H2O, Paonia; cistern cleaning / backflow testing; WATCH; own-site contact page email verified 2026-09-28; GEO CAVEAT: Paonia outside core corridor, staged transparently on thin core pool; cheap-verify + eligibility gate + chain INDEPENDENT re-verify at fire time; queued 2026-09-28 round 158)
40. `drafts/round159-brookstone-outdoors-email.md` → office@brookstoneoutdoors.com (Brookstone Outdoors, Austin/Delta; landscape + commercial/residential snow removal and ice management; own-site snow page email verbatim; October contract-push angle; SEO STRONG INDICATION; stack UNKNOWN; queued 2026-09-28 round 159)
41. `drafts/round159-prestige-renovations-email.md` → Alex.prestigerenovations@gmail.com (Prestige Renovations and Creations LLC, Grand Junction; GC renovations/remodels/custom carpentry/kitchens/baths; email + phone DIRECTORY-PUBLISHED via usdirectory, not own-site verified; Gmail cheap-verify + gate mandatory at fire time; Sept-2026 new-build promo active; queued 2026-09-28 round 159)
