# Email queue — 2026-09-20 UTC cap (10 sends, opens 18:00 MDT 2026-09-19)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## Slots 1-3. F2 follow-ups (ladder priority; initial sends 2026-09-10, F1 sent 2026-09-14 UTC; 09-20 = day 10 of the day 10-14 F2 window)
All drafts open with the not-a-customer disclosure line, carry a NEW angle (seasonal timing), one question max, and an easy out. No em dashes:
1. `drafts/round32-f2-canyon-creek-electric.md` → john@canyoncreekelectric.com (Canyon Creek Electric, Montrose; NEW angle: first cold-snap no-heat call surge)
2. `drafts/round32-f2-licos-electric.md` → office@licoselectric.com (Lico's Electric LLC, Rifle; NEW angle: pre-winter reliability scramble, generator/panel/winterization calls)
3. `drafts/round32-f2-durgin-electric.md` → office@durginelectric.com (Durgin Electric, Carbondale; NEW angle: second-home owner winter service season)

On acceptance: flip pipeline/leads status to F2 SENT, log in follow-ups.md with result, update JSONL suppression_state to `ladder F2 2026-09-20` and next_eligible_action to "none (ladder complete; watch only)". Stop the ladder permanently on any reply.

## Slot 4. F1 follow-up (ladder priority; initial send 2026-09-16 UTC, 09-20 = day 4 of the 4-7 window)
4. `drafts/round80-f1-aspen-floor-home-services-email.md` → info@aspen-fh.com (Aspen Floor & Home Services, Denver; CORRECTED 2026-09-15 round 63: this was an INITIAL send on the 2026-09-16 UTC cap, not an F1 as the 09-16 queue file described it. F1 draft written 2026-09-17 round 80: VARIANT B bump, 48 words, disclosure verbatim first, one question max, easy out, no em dashes; cheap-verify before send.)


Note (round 80, 2026-09-17): email-queue-2026-09-19.md now exists (8 sends: 4 F2s + 4 cold GO, 2 HOLD rolling forward; fires 18:00 MDT 2026-09-18).

## Slots 5-8. F1 follow-ups (ladder priority; initial sends 2026-09-16 UTC, 09-20 = day 4 of the 4-7 window)
All 4 F1 drafts written 2026-09-17 round 80: short bumps under 50 words, exact disclosure line first, one question max, easy out, no em dashes:
5. `drafts/round80-f1-irrigation-monkey-email.md` → dennis@irrigationmonkey.com (Irrigation Monkey, Silt; blowout season two weeks out; trench-work missed-call angle)
6. `drafts/round80-f1-groundskeepers-aspen-email.md` → Bladesandflakes@groundskeepersofaspen.com (Groundskeepers of Aspen; September snow-contract lock-in; estimate-callback latency angle; cheap-verify before send)
7. `drafts/round80-f1-blackbird-kitchen-bath-email.md` → sarah@blackbirdkitchenandbath.com (Blackbird Kitchen and Bath, Evergreen; high-ticket consult calls while the small team is on the build)
8. `drafts/round80-f1-waypoint-rv-email.md` → waypointrvcamper@gmail.com (Waypoint RV Service, Fruita; copy-test VARIANT B second send; autumn breakdown season, tagline-callback angle; cheap-verify Gmail before send)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible day 10-14 from initial send (2026-09-26 to 2026-09-30)". Stop the ladder permanently on any reply.

## Slots 9-10. New cold FIFO (send only after the 3 F2s + 5 F1s above, cap permitting)
9. `drafts/round49-christian-brothers-email.md` → camerongustafson@yahoo.com (Christian Brothers Carpet & Flood Care, Fruita; water damage restoration, 24-hour emergency advertised, 15+ yrs locally owned; site-published Yahoo address, cheap-verify before send; MISSED_CALL_LEAD_CAPTURE high)
10. Cold FIFO head from the email-queue-2026-09-16.md tail (round-27 batch FIFO head onward): sander-and-sons. Draft path in drafts/.

RECONCILED round 80 (2026-09-17): the 5 F1 follow-ups above take ladder priority per standing rules. The remaining cold FIFO entries roll to the 2026-09-21 queue's rolled-cold list (see email-queue-2026-09-21.md). round45-comfort-air STRUCK from this queue 2026-09-17: it was SENT as an initial cold on the 2026-09-18 UTC cap (round 79), duplicate-send prevented. Honk Key Lock & Safe (09-19 HOLD) and Road Scholars Moving handled separately: Honk Key rolls to the 09-21 cold list; Road Scholars PARKED (no own-site email verified, conflicting third-party contact record), never re-queued.

## Rolls to 2026-09-21 UTC queue (09-20 cap full at 10/10)
- `drafts/round53-monument-garage-door-email.md` → service@monumentgaragedoor.com (Monument Garage Door, Grand Junction; garage doors, serving Grand Valley since 2006; site-published email, domain address no cheap-verify flag; MISSED_CALL_LEAD_CAPTURE, same-day-response brand promise vs after-hours busy line). Draft verified: disclosure line exact, under 50 words, one question, no em dashes. Create email-queue-2026-09-21.md in a later run when the 09-20 queue clears.
- `drafts/round57-aspen-christmas-lighting-email.md` → inquiry@aspenchristmaslighting.com (Aspen Christmas Lighting, Aspen / Roaring Fork Valley; holiday lighting installer; site-published email, domain address no cheap-verify flag; MISSED_CALL_LEAD_CAPTURE, 48-hour design-estimate promise vs ladder-and-roof crews in the Sept-Dec booking window; 107 words, copy-test variant A). Draft verified: disclosure line exact, one question, no em dashes.

## SEND RECORD (round 95, 2026-09-19 ~20:21 MDT)
10/10 slots Gmail-accepted in queue order, verified in sent mail (message IDs on file); 2026-09-20 UTC cap fully consumed. No bounces, no spam, no inbound replies at run time. F2 ladders (Canyon Creek, Lico's, Durgin) complete; five F1s armed (F2 eligible 2026-09-26 to 2026-09-30); two cold ladders armed (F1 eligible 2026-09-24 to 2026-09-27). Queue CLOSED.
