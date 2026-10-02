# Email queue — 2026-09-29 UTC cap (10 sends, opens 18:00 MDT 2026-09-28)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

CREATED 2026-09-26 round 150. 9 follow-up slots (the round-143 cold cohort, F1 drafts written round 150, voice-audited, bump bodies 37-46 words) + 1 corrected cold slot (Integrity Stucco, assigned round 157) + 1 conditional FIFO slot. The 3 DM F1s (Good Neighbors Fencing, Genesis Appliance Service, D20 Locksmith Services) ride the DM cap lane, not this email queue.

## F1 ladder-priority slots 1-9 (round-143 cold cohort; initial sends 2026-09-25 UTC; F1 window 2026-09-29 to 2026-10-02; DRAFTS WRITTEN round 150, voice-audited)
1. `drafts/round150-f1-misty-mountain-email.md` → mstmountainss@gmail.com (Misty Mountain Landscape & Irrigation, Montrose; estimates sold by DM while Julian runs the crew; Gmail address, cheap-verify before send; original subject "Estimates booked while you're running the crew")
2. `drafts/round150-f1-rodco-concrete-email.md` → info@rodcoconcrete.com (RodCo Concrete LLC, Rifle; three-man ACI-certified flatwork crew; own domain, no cheap-verify needed; original subject "Every pour booked while the crew is on the slab")
3. `drafts/round150-f1-quala-tree-care-email.md` → joshb@qualatreecare.com (Quala-Tree Care LLC, Grand Junction; Board Certified Master Arborist-led crew; own domain; original subject "Your free estimate offer, answered at midnight")
4. `drafts/round150-f1-rer-plumbing-email.md` → info@rergj.com (RER Plumbing and HVAC LLC, Grand Junction; own-site verified email; original subject "Plumbing emergencies don't wait for business hours")
5. `drafts/round150-f1-curbside-cleaners-email.md` → estimates@curbsidecleaners.com (Curbside Cleaners; remote quotes from photos; own domain; original subject "The estimate that went out but never got answered")
6. `drafts/round150-f1-doubletree-email.md` → doubletree5620@gmail.com (Doubletree Heating, Cooling & Fireplaces, Grand Junction; 24/7 since 2003; Gmail address, cheap-verify before send; original subject "Your 2 AM no-heat calls")
7. `drafts/round150-f1-haining-email.md` → info@haininghomeservices.com (Haining Home Services & Airtech, Grand Junction; Valley shop since 1972, 24/7 live answering; own domain; original subject "Your 24/7 answering, without the staffing")
8. `drafts/round150-f1-alpine-roll-off-email.md` → ben@alpinerolloffs.com (Alpine Roll-Off Services; booking platform for routine calls, oddballs still ring in; own domain; original subject "the calls your new booking system does not catch")
9. `drafts/round150-f1-dump-it-dumpsters-email.md` → steve@dumpit-dumpsters.com (Dump-It Dumpsters, Montrose; whole booking model is the phone; own domain; original subject "every rental, extension, and pickup is a phone call")

## Slot 10 — Integrity Stucco corrected cold (fills the last slot before FIFO)
10. `drafts/round156-integrity-stucco-corrected.md` → abramintegritypaint@gmail.com (Integrity Stucco by Daniel, Grand Junction; CORRECTED address, site-published per own-site/verified 2026-09-12; canonical JSONL email; subject "Stucco bids should not cool off"). Fire AFTER the 9 F1s. Cheap-verify at fire time: `in:sent to:abramintegritypaint@gmail.com` must be 0 and the send-eligibility gate must exit 0; chain INDEPENDENT re-verified 2026-09-28. If it cannot fire, fill from the cold FIFO head below.

## Slot 11 — cold FIFO (fill at fire time from the corridor cold FIFO head; re-voice to current standards if the draft predates 2026-09-20 voice rules)
11. OPEN — firing round fills from the cold FIFO head per standing order (follow-ups, then the Integrity Stucco corrected cold, then FIFO; drafts must reference current voice rules). NOTE: this slot exists only if the Integrity Stucco corrected cold cannot fire; otherwise the 2026-09-29 UTC cap is full at 10.

## DM F1s (ride the 10/day DM cap lane, NOT this email queue; drafts written round 150)
- `drafts/dm-round150-f1-good-neighbors-fencing.txt` (Page DM thread; initial DM SENT 2026-09-25 08:33 UTC; fall fence repair season angle)
- `drafts/dm-round150-f1-genesis-appliance.txt` (Page DM thread; initial DM SENT 2026-09-25 08:36 UTC; same-or-next-day service angle)
- `drafts/dm-round150-f1-d20-locksmith.txt` (Page DM thread; initial DM SENT 2026-09-25 08:40 UTC; 24/7 lockout angle)
- F1 window 2026-09-29 to 2026-10-02. The firing round sends via Pig headed Chrome with existing threads; never use the Messenger CLI (contact-restricted).

## Creation notes
- All 9 F1 drafts reference the 09-25 initial subject lines and original angles, one question max, disclosure + AI identity + sentence-per-line + no em dashes, sign-off "PING Social, (970) 589-3309".
- Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses; run the send-eligibility gate per recipient before EVERY send (standing rule); never send to a bounced address.
- Reply-check before firing; any prospect reply stops that ladder permanently.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
