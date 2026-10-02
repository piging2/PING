# Email queue — 2026-09-15 UTC cap (10 sends, opens 18:00 MDT 2026-09-14)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## Slots 1-10. F1 follow-ups (ladder priority; initial sends 2026-09-11, day 4 of 4-7 window)
Pre-F1 review checks completed 2026-09-12 (rounds 33/36/38): all 20 have NO review triggers (Steamboat Electric has an undated no-response complaint that corroborates its original missed-call angle, intel only; Ernie's Roofing's no-response pattern mapped to its missed-call/follow-up problem category, never cited). All drafts open with the not-a-customer disclosure line, under 50 words, one question max, no em dashes:
1. `drafts/round38-f1-ernies-roofing.md` → info@erniesgutter.com (Ernie's Roofing, Denver; listed first, strongest new intel angle: storm-season emergency-call capture for a third-generation shop)
2. `drafts/round38-f1-christophers-plumbing.md` → info@christophersplumbing.com (Christopher's Plumbing Inc, Englewood; family-shop night calls, review check clean)
3. `drafts/round36-f1-drainline-services.md` → info@drainlineservices.com (Drainline Services LLC, Parker; Birdeye 4.9/55, Angi 4.6/169, clean)
4. `drafts/round36-f1-table-mountain-electric.md` → info@tablemountainelectric.com (Table Mountain Electric, Denver; Sep 2026 own-site reviews positive, clean)
5. `drafts/round36-f1-upstanding-electric.md` → Upstandingelectric@gmail.com (Upstanding Electric LLC, Aurora; clean; cheap-verify Gmail before send)
6. `drafts/round36-f1-roper-roofing-solar.md` → info@roperroofing.com (Roper Roofing & Solar, Golden; Birdeye 4.9/324, praise for responsiveness)
7. `drafts/round36-f1-pest-arrest.md` → services@arrestmypest.com (Pest Arrest, Denver; 1000+ Google 5-star, clean)
8. `drafts/round36-f1-majestic-painting.md` → majestic@majesticpainting.net (Majestic Painting, Aurora; Birdeye 4.9/530, clean)
9. `drafts/round36-f1-jb-flatwork-concrete.md` → jbflatworkconcretellc@gmail.com (JB Flatwork Concrete, Denver; clean; cheap-verify Gmail before send)
10. `drafts/round36-f1-steamboat-electric.md` → jimkelley@steamboatelectric.com (Steamboat Electric, Steamboat Springs; site-published email re-verified 2026-09-12; undated no-response complaint corroborates angle, never cited)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update JSONL suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-25 (F1 sent 2026-09-15)".

## Rolled to 2026-09-16 UTC queue (second 2026-09-11 SENT batch; F1 day 5 of 4-7 window, still eligible; follow-ups keep priority over cold FIFO)
All with 2026-09-12 pre-F1 review checks logged (8 clean, 2 WATCH undated, no triggers):
- `drafts/round38-f1-ee-door-and-window.md` → info@eedw.net (E&E Door and Window, Grand Junction)
- `drafts/round38-f1-r-and-h-mechanical.md` → info@randhmechanical.com (R & H Mechanical, Eagle/Basalt; WATCH undated, no trigger)
- `drafts/round38-f1-certainty-appliance.md` → CertaintyAppliance@ymail.com (Certainty Appliance Repair, Arvada)
- `drafts/round38-f1-reliant-roofing.md` → frontdesk@reliantroofinggj.com (Reliant Roofing, Grand Junction)
- `drafts/round38-f1-super-junkers.md` → office@superjunkers.com (Super Junkers, Denver)
- `drafts/round38-f1-bosco-masonry.md` → boscomasonry@gmail.com (Bosco Masonry Restoration, Arvada)
- `drafts/round38-f1-gone-for-good.md` → info@goneforgoodstore.com (Gone For Good, Denver)
- `drafts/round38-f1-303-sprinklers.md` → 303sprinklers@gmail.com (303 Sprinklers, Aurora)
- `drafts/round38-f1-fort-comfort-gutters.md` → info@fortcomfortservices.com (Fort Comfort Gutters, Denver)
- `drafts/round38-f1-denver-sprinkler-landscape.md` → info@denversprinklerservices.com (Denver Sprinkler and Landscape, Englewood; WATCH undated, no trigger)

Note: the 2026-09-11 SENT batches yielded 20 F1-eligible prospects; the 10/day cap forces a two-day split. If any 09-15 slot fails acceptance (bounce, approval stall), pull the next 09-16-rolled draft up in listed order. Cold FIFO resumes after the rolled F1s on 09-16:

- drafts/round27-aspen-floor-home-services-email.md
- drafts/round27-blackbird-kitchen-bath-email.md
- drafts/round27-decktec-outdoor-designs-email.md
- drafts/round27-eckert-renovations-email.md
- drafts/round27-honk-key-lock-safe-email.md (HOT; verify hello@honkkeylocksafe.com vs info@honkkeylocksafe.com before sending)
- drafts/round27-miracle-maids-denver-email.md
- drafts/round27-pride-n-service-junk-removal-email.md
- drafts/round27-road-scholars-moving-email.md
- drafts/round27-sander-and-sons-email.md
- drafts/round27-signature-designs-kitchen-bath-email.md
- drafts/round29-alpine-pressure-email.md
- drafts/round30-apex-waste-solutions-email.md
- drafts/round30-alpine-fencing-email.md
- drafts/round30-grand-valley-concrete-polishing-email.md
- drafts/round30-marathon-concrete-coatings-email.md
- drafts/round32-hometown-electric-email.md (cheap-verify Gmail address before send)
- drafts/round32-level-up-electric-email.md (cheap-verify Gmail address before send)
- drafts/round32-crested-butte-electrical-email.md
- drafts/round32-southwest-septic-email.md (cheap-verify Gmail address before send)
- drafts/round33-linville-lock-and-key.md
- drafts/round33-j-lock-key-and-alarm.md
- drafts/round33-colorado-wash-services.md (cheap-verify Gmail address before send)
- drafts/round34-crystal-clear-window-washing-email.md (WARM; cheap-verify before send)
- drafts/round35-ski-town-garage-doors-email.md (WARM; To: info@skitowngaragedoors.com, own homepage verified 2026-09-12)
- (then round-31 research additions, pending classification + drafting; round-33 research additions, pending verification + merge)
- drafts/round36-grasso-masonry-email.md (WARM; To: vince@grassomasonry.com, site-published; revamp candidate)
- drafts/round36-integrity-stucco-email.md (WARM; To: abramintegritypaint@gmail.com, site-published; cheap-verify Gmail address before send)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/odd-domain addresses; never send to a bounced address.
