# Email queue — 2026-09-16 UTC cap (10 sends, opens 18:00 MDT 2026-09-15)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## Slots 1-10. F1 follow-ups (ladder priority; initial sends 2026-09-11, day 5 of 4-7 window, still eligible)
Pre-F1 review checks completed 2026-09-12 (rounds 33/36/38) and re-checked 2026-09-13 (round 40): all 10 have NO fresh review triggers (R & H Mechanical and Denver Sprinkler and Landscape have undated historical WATCH items, intel only, never triggers). All drafts open with the not-a-customer disclosure line, under 50 words, one question max, no em dashes:
1. `drafts/round38-f1-ee-door-and-window.md` → info@eedw.net (E&E Door and Window, Grand Junction; clean)
2. `drafts/round38-f1-r-and-h-mechanical.md` → info@randhmechanical.com (R & H Mechanical, Eagle/Basalt; WATCH undated, no trigger)
3. `drafts/round38-f1-certainty-appliance.md` → CertaintyAppliance@ymail.com (Certainty Appliance Repair, Arvada; clean; cheap-verify ymail address before send)
4. `drafts/round38-f1-reliant-roofing.md` → frontdesk@reliantroofinggj.com (Reliant Roofing, Grand Junction; no new negative, standing no-response pattern is intel only, never cited)
5. `drafts/round38-f1-super-junkers.md` → office@superjunkers.com (Super Junkers, Denver; clean)
6. `drafts/round38-f1-bosco-masonry.md` → boscomasonry@gmail.com (Bosco Masonry Restoration, Arvada; clean; cheap-verify Gmail before send)
7. `drafts/round27-aspen-floor-home-services-email.md` → info@aspen-fh.com (Aspen Floor & Home Services, Denver; pulled up from backup; Gone For Good REMOVED 2026-09-14: confirmed franchise, permanently suppressed per Nolan hard rule; CORRECTED round 63: sent as INITIAL cold email, not F1. See completion note at bottom of this file)
8. `drafts/round38-f1-303-sprinklers.md` → 303sprinklers@gmail.com (303 Sprinklers, Aurora; clean; cheap-verify Gmail before send)
9. `drafts/round38-f1-fort-comfort-gutters.md` → info@fortcomfortservices.com (Fort Comfort Gutters, Denver; clean)
10. `drafts/round38-f1-denver-sprinkler-landscape.md` → info@denversprinklerservices.com (Denver Sprinkler and Landscape, Englewood; WATCH undated, no trigger)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update JSONL suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-21 (initial send 2026-09-11; day 10-14 window runs 2026-09-21 to 2026-09-25)". Ladder timing anchors to the INITIAL send, not to the F1 follow-up send: F2 is day 10-14 after 2026-09-11. (Corrected 2026-09-15 round 57: the previous line said 2026-09-26, 10 days after the F1 send, which would have started the final angle 5 days late.)

## Backup pull-up order (if any slot fails acceptance: bounce, approval stall)
Pull up cold FIFO in listed order; each pull-up still needs pre-send cheap-verify:
- `drafts/round27-blackbird-kitchen-bath-email.md` → sarah@blackbirdkitchenandbath.com (Blackbird Kitchen and Bath, Denver)

## Cold FIFO resumes 2026-09-17 after F1 priority slots
The remaining round-27 FIFO head (in send order):
- `drafts/round27-decktec-outdoor-designs-email.md`
- `drafts/round27-eckert-renovations-email.md`
- `drafts/round27-honk-key-lock-safe-email.md` (HOT; verify hello@honkkeylocksafe.com vs info@honkkeylocksafe.com before sending)
- `drafts/round27-miracle-maids-denver-email.md`
- `drafts/round27-pride-n-service-junk-removal-email.md`
- `drafts/round27-road-scholars-moving-email.md`
- `drafts/round27-sander-and-sons-email.md`
- `drafts/round27-signature-designs-kitchen-bath-email.md`
- `drafts/round29-alpine-pressure-email.md`
- `drafts/round30-apex-waste-solutions-email.md`
- `drafts/round30-alpine-fencing-email.md`
- `drafts/round30-grand-valley-concrete-polishing-email.md`
- `drafts/round30-marathon-concrete-coatings-email.md`
- `drafts/round32-hometown-electric-email.md` (cheap-verify Gmail address before send)
- `drafts/round32-level-up-electric-email.md` (cheap-verify Gmail address before send)
- `drafts/round32-crested-butte-electrical-email.md`
- `drafts/round32-southwest-septic-email.md` (cheap-verify Gmail address before send)
- `drafts/round33-linville-lock-and-key.md`
- `drafts/round33-j-lock-key-and-alarm.md`
- `drafts/round33-colorado-wash-services.md` (cheap-verify Gmail address before send)
- `drafts/round34-crystal-clear-window-washing-email.md` (WARM; cheap-verify before send)
- `drafts/round35-ski-town-garage-doors-email.md` (WARM; To: info@skitowngaragedoors.com, own homepage verified 2026-09-12)
- `drafts/round36-grasso-masonry-email.md` (WARM; To: vince@grassomasonry.com, site-published; revamp candidate)
- `drafts/round36-integrity-stucco-email.md` (WARM; To: abramintegritypaint@gmail.com, site-published; cheap-verify Gmail address before send)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/odd-domain addresses; never send to a bounced address.
- `drafts/round45-comfort-air-email.md` (WARM; To: office@comfortairco.com, own-site footer; family-owned since 1997, Lennox dealer; JSONL active 300/300)
- `drafts/round45-doubletree-email.md` (WARM; To: doubletree5620@gmail.com, own contact page; cheap-verify Gmail address before send; family-owned since 2003, NATE/Bryant, 4.8/93; JSONL active 300/300)
- `drafts/round45-haining-email.md` (WARM; To: info@haininghomeservices.com, own site; family-owned since 1972, 24/7 live answering, 4.7/557; JSONL active 300/300)
- `drafts/round45-stronghold-tree-care-email.md` (WARM; To: strongholdtrees@gmail.com, third-party listing; VERIFY before send; pipeline already NEW WARM round44)
- `drafts/round45-sandoval-construction-email.md` (WARM; To: info@sandovalconstructionllc.com, own site; founded 2002, Montrose)

## COMPLETED 2026-09-15 ~20:17 MDT (round 63): 10/10 cap consumed

ACTUAL: 9 F1 follow-ups + 1 initial cold email (not 10 F1s). Slot 7 (Aspen Floor & Home Services) was an INITIAL send, not an F1: pipeline.md/leads.md had it QUEUED but it had never been sent before; sent as initial cold email, accepted by Gmail ~20:17 MDT 2026-09-15 (2026-09-16 UTC day), verified in sent mail. Status corrected to SENT (initial) in pipeline.md/leads.md round 63.

- F1 SENT (9): E&E Door and Window, R & H Mechanical, Certainty Appliance Repair, Reliant Roofing, Super Junkers, Bosco Masonry Restoration, 303 Sprinklers, Fort Comfort Gutters, Denver Sprinkler and Landscape. All accepted quickly, verified individually. Next eligible: F2 on 2026-09-21 UTC batch (initial send 2026-09-11; day 10-14 window runs 2026-09-21 to 2026-09-25).
- INITIAL SENT (1): Aspen Floor & Home Services (info@aspen-fh.com). F1-eligible 2026-09-19 through 2026-09-22 (4-7 days after initial send 2026-09-16 UTC). Placed in the 2026-09-20 UTC batch priority slot.
- 2026-09-16 UTC cap is 10/10. Next cap opens 18:00 MDT 2026-09-16 (2026-09-17 UTC day).
