# Email queue — 2026-09-21 UTC cap (10 sends, opens 18:00 MDT 2026-09-20)

## SEND RECORD (round 103, 2026-09-20 ~20:30-20:35 MDT)

8/8 slots Gmail-accepted in queue order via ~/workspace/outreach/send-batch.py (new reusable batch script: draft-file parsing, per-send +send, Sent verification per message, stops on stall; RESULT 8/8), every acceptance verified in sent mail (message IDs on file); 2026-09-21 UTC cap now 8/10 consumed.
1. E&E Door and Window F2 → info@eedw.net — SENT+VERIFIED (id 1a0c1c46ca033af6)
2. Reliant Roofing F2 → frontdesk@reliantroofinggj.com — SENT+VERIFIED (id 1a0c1c480eee05f1)
4. Bristlecone Landscapes cold → bristleconelandscapes@hotmail.com — SENT+VERIFIED (id 1a0c1c4919ba8f43)
5. Easy Glass cold → easyglassri@gmail.com — SENT+VERIFIED (id 1a0c1c4a2df0469b)
6. A-Wiser Auto Glass cold → awiserautoglass@yahoo.com — SENT+VERIFIED (id 1a0c1c4b222560cc)
7. Windshields Express cold → windshieldsexpress@yahoo.com — SENT+VERIFIED (id 1a0c1c4c760ecb65)
8. Driven Diagnostics cold → info@drivendiagnostics.com — SENT+VERIFIED (id 1a0c1c4d6b85a570)
9. Colorado Maintenance Group cold → john@cmgus.com — SENT+VERIFIED (id 1a0c1c4e784045eb)
SLOT 3 SKIPPED: Smart Living Water → smartlivingwatergj@gmail.com — chain HOLD (Smart Living Water Purification of the Rockies / Palm Beach Water Purification relationship unresolved; conservative chain enforcement). Slot 10 empty. No bounces, no inbound replies at run time. All 9 slot drafts re-voiced to the 2026-09-20 AI-identity / one-sentence-per-line / sign-off rules before firing (disclosure verbatim, AI identity line, every sentence standalone, "PING Social, (970) 589-3309" sign-off, no em dashes, no human names). Pre-send gates passed: reply check + bounce sweep clean (20:15 MDT), review delta all GO (W4), chain re-verification GO on 6/7 cold recipients. F2 ladders (E&E, Reliant) complete; six cold ladders armed (F1 eligible 2026-09-25 to 2026-09-28). Queue CLOSED.

## Firing status 2026-09-20 ~18:00 MDT (post-timer verification)
- The 240s post-send timer fired at ~18:02 MDT. Verification via Gmail API: ZERO new accepted sends (no new messages in Sent on any relevant UTC-day window; latest 10 in Sent are the 2026-09-19 21:20-21:21 MDT batch), zero campaign drafts pending in Gmail (only 2 unrelated Aug-2025 drafts), no firing notes in this file, no active send subagents.
- Conclusion: the queue NEVER FIRED. No sends were attempted or accepted in round 102 or this continuation.
- The timer reminder's "3 September 21 sends" premise matches no recorded plan (this file plans 9 sends, slots 1-9) and its intent could not be reconstructed; treated as unverifiable, not as authorization.
- Firing ownership passes to the next engine run (scheduled ~20:12 MDT). Precondition: ALL slot drafts (slots 1-3 from round 80/58 and backfills 4-9 from rounds 58-60) predate the 2026-09-20 AI-identity / one-sentence-per-paragraph / sign-off copy rules and MUST be re-voiced and audited against those rules before ANY send. Do not fire under the old copy.

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

## Slots 1-2. F2 follow-ups (corridor; ladder priority; initial sends 2026-09-11, F1 sent 2026-09-15; 09-21 = day 10 of the day 10-14 window)
Both F2 drafts written round 80 (2026-09-17), re-verified against responses.md + pipeline.md: no replies, no declines, no suppression on either. Both open with the exact strengthened not-a-customer disclosure line, carry NEW seasonal angles, one question max, easy out, no em dashes:
1. `drafts/round80-f2-ee-door-window.md` → info@eedw.net (E&E Door and Window, Grand Junction; NEW angle: first cold snap snaps old springs, doors stuck open at 6am, overnight/weekend callers captured before the crew clocks in)
2. `drafts/round80-f2-reliant-roofing.md` → frontdesk@reliantroofinggj.com (Reliant Roofing, Grand Junction; NEW angle: first freeze warning is the deadline, post-snow repairs wait until spring, highest-urgency scheduling window of the year)

On acceptance: flip pipeline/leads status to F2 SENT, log in follow-ups.md with result, update JSONL suppression_state to `ladder F2 2026-09-21` and next_eligible_action to "none (ladder complete; watch only)". Stop the ladder permanently on any reply.

## Slot 3. New cold FIFO head (corridor; send only after the 2 F2s above, cap permitting)
3. `drafts/round58-smart-living-water-email.md` → smartlivingwatergj@gmail.com (Smart Living Water, Grand Junction; water filtration, family-owned two brothers; cheap-verify: address fetched LIVE from own contact page 2026-09-15, PASS)

## Slots 4-9. Corridor cold backfills (round-102 tasking, 2026-09-20; oldest round first)
All six drafts verified on disk 2026-09-20 with To: recipient lines. Cheap-verify status per the recorded round-58/round-60 notes below; do not re-verify.
4. `drafts/round58-bristlecone-landscapes-email.md` → bristleconelandscapes@hotmail.com (Bristlecone Landscapes, Montrose; landscape design/build; cheap-verify: address fetched LIVE from own contact page 2026-09-15, PASS; Hotmail address, watch for bounce)
5. `drafts/round60-easy-glass-email.md` → easyglassri@gmail.com (Easy Glass, Grand Junction, mobile auto glass; cheap-verify PASS round 60; HOT; MISSED_CALL_LEAD_CAPTURE high; voicemail callers book the next shop on Google)
6. `drafts/round60-a-wiser-auto-glass-email.md` → awiserautoglass@yahoo.com (A-Wiser Auto Glass, Grand Junction, mobile auto glass; cheap-verify PASS round 60; WARM; MISSED_CALL_LEAD_CAPTURE high; Yahoo address, watch for bounce)
7. `drafts/round60-windshields-express-email.md` → windshieldsexpress@yahoo.com (Windshields Express, Grand Junction, mobile auto glass, Andy and Camille Nack; cheap-verify PASS round 60; WARM; MISSED_CALL_LEAD_CAPTURE high; Yahoo address, cheap-verify before send, watch for bounce)
8. `drafts/round60-driven-diagnostics-email.md` → info@drivendiagnostics.com (Driven Diagnostics, Grand Junction, mobile mechanics; cheap-verify PASS round 60; WARM; MISSED_CALL_LEAD_CAPTURE high; Mon-Thu hours leak Friday breakdown callers)
9. `drafts/round60-colorado-maintenance-group-email.md` → john@cmgus.com (Colorado Maintenance Group, Rifle, GC since 2001; cheap-verify PASS round 60; MISSED_CALL_LEAD_CAPTURE medium; bid inquiries land while crews are on site; CONFLICT NOTE: pipeline WATCH status from round 82 is superseded by the explicit round-102 tasking naming this draft as a 09-21 backfill; the newer instruction governs)

## Slot 10. EMPTY
Slot 10 intentionally left empty per round-102 tasking. Queue runs 9/10. Never fill with an out-of-corridor or unverified draft.

Recipient addresses are in each draft file's header To: line. Pre-send: cheap-verify Gmail/Yahoo/Hotmail/odd-domain addresses; never send to a bounced address.

**Cheap-verify prep 2026-09-20 ~08:30 MDT (round 99):** 303sprinklers@gmail.com PASS: fetched live from own contact page 303-sprinklers.com/contact.html, renders as the published email. (303 Sprinklers is PARKED for geography below; kept for the record.)

**Pre-send verification 2026-09-20 ~11:30 MDT (round 100):** slots 1-3 all GO (2 GO + 1 GO WITH CAVEAT). Cheap-verify PASS on every address: E&E info@eedw.net own footer; Reliant frontdesk@reliantroofinggj.com own-site footers. Chain re-verification: both INDEPENDENT. Review delta: zero triggers (no new dated ≤2-star or 3-star phone/response/wait/scheduling on/after 2026-09-08). Smart Living Water GO WITH CAVEAT: similarly-named multi-state entity ("Smart Living Water Purification of the Rockies," division of Palm Beach Water Purification) UNRESOLVED vs the GJ family-owned LLC; own-site + BBB support independence. Full detail in scratch/reviews-round100.md. The firing run needs no further cheap-verify; send in slot order, verify every acceptance in sent mail.

## PARKED_GEOGRAPHY (round-102 geography scrub, 2026-09-20)
The following F2 ladders are parked under the corridor-only rule (2026-09-20). All were verified GO in the round-100 pre-send check (cheap-verify PASS, chain re-verification INDEPENDENT, zero review triggers); parking is geographic only, never a verification failure. Parked ladders are never re-queued without an explicit geography-rule change.
- R & H Mechanical (Eagle/Basalt) — F2 stage, `drafts/round80-f2-r-and-h-mechanical.md`, initial send 2026-09-11
- Certainty Appliance Repair (Arvada) — F2 stage, `drafts/round80-f2-certainty-appliance.md`, initial send 2026-09-11
- Super Junkers (Denver) — F2 stage, `drafts/round80-f2-super-junkers.md`, initial send 2026-09-11
- Bosco Masonry Restoration (Arvada) — F2 stage, `drafts/round80-f2-bosco-masonry.md`, initial send 2026-09-11
- 303 Sprinklers (Aurora) — F2 stage, `drafts/round80-f2-303-sprinklers.md`, initial send 2026-09-11
- Fort Comfort Gutters (Denver) — F2 stage, `drafts/round80-f2-fort-comfort-gutters.md`, initial send 2026-09-11
- Denver Sprinkler and Landscape (Englewood) — F2 stage, `drafts/round80-f2-denver-sprinkler-landscape.md`, initial send 2026-09-11

## Rolled cold FIFO (updated round 102)
Reconciled round 80 (2026-09-17): follow-ups take ladder priority per standing rules; Smart Living Water keeps the cold head slot; the previous cold FIFO entries below roll forward and are listed in the 09-24 / 09-25 queue files. Never re-queue them here.
- REMOVED in round-102 geography scrub (out-of-corridor, no longer rolling anywhere): `drafts/round61-pagosa-rooter-email.md` (Pagosa Rooter, Pagosa Springs), `drafts/round61-pristine-living-email.md` (Pristine Living, Steamboat Springs).
- MOVED to 09-21 slots 4-9 per round-102 tasking (2026-09-20): `drafts/round58-bristlecone-landscapes-email.md`, `drafts/round60-easy-glass-email.md`, `drafts/round60-a-wiser-auto-glass-email.md`, `drafts/round60-windshields-express-email.md`, `drafts/round60-driven-diagnostics-email.md`, `drafts/round60-colorado-maintenance-group-email.md`. Removed from this roll; their 09-25 and 09-26 roll references are updated in those files.
- STRUCK 2026-09-17 round 80: `drafts/round60-b-b-plumbing-heating-email.md` (B & B Plumbing & Heating, Rifle) — duplicate-send prevented; already SENT as an initial cold on the 2026-09-18 UTC cap via `drafts/round43-bb-plumbing-heating-email.md`. Also struck in the 09-25 queue. Never re-queue.

## Rolled from 2026-09-20 (round 80 reconcile: 09-20 cap full at 10/10 with 3 F2 + 5 F1 follow-ups; 09-21/09-22/09-23 full, 09-24/09-25 absorbed the 09-21 rolls)
The 09-20 cold FIFO tail below rolls to a 2026-09-26 queue (file to be created by a later run). Never re-queue them in 09-21/09-22/09-23. round45-comfort-air is NOT in this list: it was SENT on the 2026-09-18 UTC cap, duplicate prevented and struck everywhere.
- ROUND-102 GEOGRAPHY SCRUB NOTE: this historical roll is superseded for out-of-corridor entries. Only the corridor entries below roll to the 09-26 queue, which defines the actual corridor FIFO in its scrub section. The out-of-corridor entries in this list no longer roll anywhere.
- sander-and-sons: EXCLUDED from this roll — it holds slot 10 of the 2026-09-20 queue.
- `drafts/round27-signature-designs-kitchen-bath-email.md` (signature-designs-kitchen-bath)
- `drafts/round29-alpine-pressure-email.md` (round29-alpine-pressure)
- `drafts/round30-apex-waste-solutions-email.md` (round30-apex-waste-solutions)
- `drafts/round30-alpine-fencing-email.md` (round30-alpine-fencing)
- `drafts/round30-grand-valley-concrete-polishing-email.md` (round30-grand-valley-concrete-polishing)
- `drafts/round30-marathon-concrete-coatings-email.md` (round30-marathon-concrete-coatings)
- `drafts/round32-hometown-electric-email.md` (round32-hometown-electric)
- `drafts/round32-level-up-electric-email.md` (round32-level-up-electric)
- `drafts/round32-crested-butte-electrical-email.md` (round32-crested-butte-electrical)
- `drafts/round32-southwest-septic-email.md` (round32-southwest-septic)
- `drafts/round33-linville-lock-and-key-email.md` (round33-linville-lock-and-key)
- `drafts/round33-j-lock-key-and-alarm-email.md` (round33-j-lock-key-and-alarm)
- `drafts/round33-colorado-wash-services-email.md` (round33-colorado-wash-services)
- `drafts/round34-crystal-clear-window-washing-email.md` (round34-crystal-clear-window-washing)
- `drafts/round35-ski-town-garage-doors-email.md` (round35-ski-town-garage-doors)
- `drafts/round36-grasso-masonry-email.md` (round36-grasso-masonry)
- `drafts/round36-integrity-stucco-email.md` (round36-integrity-stucco)
- `drafts/round45-doubletree-email.md` (round45-doubletree)
- `drafts/round45-haining-email.md` (round45-haining)
- `drafts/round45-stronghold-tree-care-email.md` (round45-stronghold-tree-care)
- `drafts/round45-sandoval-construction-email.md` (round45-sandoval-construction)
- `drafts/round50-pagosa-peak-email.md` (round50-pagosa-peak)
- `drafts/round51-jd-asphalt-email.md` (round51-jd-asphalt)
- `drafts/round51-vandenberg-asphalt-email.md` (round51-vandenberg-asphalt)
- `drafts/round51-rj-sealing-email.md` (round51-rj-sealing)
- `drafts/round51-chase-wildlife-email.md` (round51-chase-wildlife)
- `drafts/round51-mccants-maintenance-email.md` (round51-mccants-maintenance)
- `drafts/round51-skywalker-construction-email.md` (round51-skywalker-construction)
- `drafts/round52-premier-sparkle-email.md` (round52-premier-sparkle)
- `drafts/round52-vision-security-email.md` (round52-vision-security)
- `drafts/round52-a-firm-foundation-email.md` (round52-a-firm-foundation)
- `drafts/round55-western-slope-concrete-floors-email.md` (round55-western-slope-concrete-floors)
- `drafts/round55-cleveland-painting-email.md` (round55-cleveland-painting)
- `drafts/round27-honk-key-lock-safe-email.md` → info@honkkeylocksafe.com (Honk Key Lock & Safe; 09-19 HOLD: address only in 2026-06-19 company press release, not on current site; cheap-verify before send; never send to a dead address)
- Road Scholars Moving: NOT rolled. PARKED 2026-09-17 round 80 (09-19 HOLD: no own-site email verified, third-party press cites ryan@conroymoving.com, conflicting contact record). Pipeline row flipped to SUPPRESS; never re-queue.

## Geography scrub 2026-09-20 round 102
Round-102 queue-scrub worker, 2026-09-20. Corridor-only rule applied (Grand Junction, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale).
- Before: 10 slots (9 F2 + 1 cold). After: 9 sends (slots 1-9), slot 10 intentionally empty.
- Kept: E&E Door and Window F2, Reliant Roofing F2, Smart Living Water cold.
- Parked (geography): R & H Mechanical, Certainty Appliance Repair, Super Junkers, Bosco Masonry Restoration, 303 Sprinklers, Fort Comfort Gutters, Denver Sprinkler and Landscape (all F2 ladders, initial sends 2026-09-11).
- Backfilled slots 4-9 (oldest round first): Bristlecone Landscapes (Montrose), Easy Glass (GJ), A-Wiser Auto Glass (GJ), Windshields Express (GJ), Driven Diagnostics (GJ), Colorado Maintenance Group (Rifle). All six verified on disk with To: lines; cheap-verify status per recorded round-58/round-60 notes; never re-verified.
- Slot 10 left empty per round-102 tasking; queue runs 9/10 rather than forcing an out-of-corridor or unverified send.
- Conflict resolved: Colorado Maintenance Group carries a round-82 pipeline WATCH note, but the explicit round-102 tasking names it as a 09-21 backfill; the newer instruction governs.
- Roll references updated: the six moved drafts were removed from the rolled sections of this file, email-queue-2026-09-25.md, and email-queue-2026-09-26.md.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
