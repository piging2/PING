# Email queue — 2026-09-19 UTC cap (10 sends, opens 18:00 MDT 2026-09-18)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

House notes:
- 10-per-UTC-day Gmail cap applies to ALL email. Follow-ups (F1, F2, review-triggered) keep priority; never bump a follow-up for a cold send.
- Recipients are verbatim from the draft files' To: lines. Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses. Never send to a bounced address.
- On acceptance: flip pipeline/leads status to F2 SENT (follow-ups) or SENT (cold), log in follow-ups.md with result, update JSONL suppression_state and next_eligible_action. Stop the ladder permanently on any reply. Do NOT mark F2 SENT until Gmail acceptance is verified in sent mail.

## Slots 1-4. F2 follow-ups (ladder priority; initial sends 2026-09-08, F1 sent 2026-09-12; 09-19 = day 11 of the day 10-14 F2 window, 09-18 through 09-22)
All 4 drafts open with the exact strengthened not-a-customer disclosure line, carry NEW seasonal angles, one question max, easy out, no em dashes. Drafts written round 78 (2026-09-17). Subject typo on the smart-garage draft fixed round 78.
1. `drafts/round78-f2-mh-electrical-solar.md` → hello@mhelectricalandsolar.com (MH Electrical & Solar, GJ; NEW angle: fall generator/panel/solar winterization rush; F1 sent 2026-09-12, no reply)
2. `drafts/round78-f2-sanders-johnson.md` → contactus@sandersandjohnson.com (Sanders & Johnson, HVAC; NEW angle: first-cold-snap no-heat call surge burying dispatch; F1 sent 2026-09-12, no reply)
3. `drafts/round78-f2-smart-garage-door.md` → info@smartgaragedoorco.com (Smart Garage Door Service, GJ; NEW angle: cold-snap spring/opener failures at midnight; F1 sent 2026-09-12, no reply)
4. `drafts/round78-f2-to-the-t.md` → admin@tothetplumbingandheating.com (To The T Plumbing, Heating & Air; NEW angle: first hard freeze burst-pipe + no-heat wave; F1 sent 2026-09-12, no reply)

On acceptance: flip pipeline/leads status to F2 SENT, log in follow-ups.md with result, update suppression_state in-follow-up-ladder / next_eligible_action "none (ladder complete; watch only)".

## Slots 5-10. New cold FIFO (send only after the 4 F2s above, cap permitting)
Cold FIFO resumes from the email-queue-2026-09-16.md tail (round-27 batch FIFO head onward; blackbird-kitchen-bath excluded: consumed by the 2026-09-17 UTC queue). These 6 consumed here are struck from the 2026-09-20 queue's tail list to prevent a duplicate-send collision.
5. `drafts/round27-decktec-outdoor-designs-email.md` → mail@decktec.com (DeckTec Outdoor Designs; deck inquiries answered while crews are in the field; site-published email, domain address no cheap-verify flag)
6. `drafts/round27-eckert-renovations-email.md` → eckertrenovations@outlook.com (Eckert Renovations; in-home estimates; site-published Outlook address, cheap-verify before send)
7. `drafts/round27-honk-key-lock-safe-email.md` → info@honkkeylocksafe.com (Honk Key Lock & Safe; lockout callers; address company-published in 2026-06-19 press release, hello@ not on current site contact page, cheap-verify before send)
8. `drafts/round27-miracle-maids-denver-email.md` → gcapal@aol.com (Miracle Maids, Denver; 40-year reputation angle; site-published AOL address, cheap-verify before send)
9. `drafts/round27-pride-n-service-junk-removal-email.md` → pridenservice@gmail.com (Pride N Service Junk Removal; junk jobs booked while hauling; site-published Gmail address, cheap-verify before send)
10. `drafts/round27-road-scholars-moving-email.md` → info@roadscholarsmoving.com (Road Scholars Moving; move quotes answered before the next company; site-published email, domain address no cheap-verify flag)

## Send-day notes
- The 2026-09-18 UTC queue (fires 18:00 MDT today) consumes round43-bb-plumbing, round45-comfort-air, round48-american-asphalt, round50-whitewolf; none of those reappear here.
- Slots 5-10 cold drafts are all round-27 vintage; each opens with the exact disclosure line, no em dashes (verified round 78). Pre-send cheap-verify: eckert (Outlook), miracle-maids (AOL), pride-n-service (Gmail), honk-key-lock-safe (info@ from press release only).
- Do NOT send any slot to a bounced address; roll a failed slot forward rather than skipping to a cold.

## Pre-send review 2026-09-17 round 80 (outreach engine round 80, ~23:30 MDT)

Review-intel delta: all 10 businesses checked for new bad Google reviews since 2026-09-17. Result: 0 triggers on cold slots (5 to 10), 0 angle-fuel findings on F2 slots (1 to 4). No review-triggered messages warranted anywhere. Full per-slot baselines in the parent run report.

Email verification: live page-text fetches of each business's own site today. 4 of 10 addresses verbatim on site (slots 5, 6, 8, 9). The 4 F2 addresses all have proven deliverability: F1 was Gmail-accepted and verified in sent mail 2026-09-12 ~20:18 MDT for each (logged in follow-ups.md).

Town corrections, data quality only, no copy impact: MH Electrical & Solar is Denver (2806 N Speer Blvd), not Grand Junction. Sanders & Johnson is Denver (7100 Broadway), not Western Colorado. Smart Garage Door Service is Denver/Aurora (1489 S Broadway), not Grand Junction. To The T is Thornton. Eckert Renovations is Thornton. DeckTec is Golden. Miracle Maids is Denver. Pride N Service is Aurora. Road Scholars is Centennial. Only Honk Key Lock & Safe is Western Slope (Montrose/GJ storefront). Grep of all four F2 drafts confirms zero GJ/Western CO location claims, so copy is safe, but the Western-Colorado-first targeting rule was violated upstream in these drafts. Flag for pipeline data hygiene.

Per-slot verdicts (order unchanged):
1. MH Electrical & Solar, hello@mhelectricalandsolar.com: GO. Review all-clear. Address not verbatim on live site (contact + homepage fetched), but F1 Gmail-accepted 2026-09-12, deliverability proven. Denver, draft has no location claim.
2. Sanders & Johnson, contactus@sandersandjohnson.com: GO. Review all-clear. Site renders email masked as [email protected] in fetch (JS), directory lists this address as their contact email, F1 Gmail-accepted 2026-09-12. Denver metro (deprioritized geography), draft has no location claim.
3. Smart Garage Door Service, info@smartgaragedoorco.com: GO. Review all-clear. Company YouTube channel states this address, F1 Gmail-accepted 2026-09-12. Contact-us page fetch failed; retry a deeper fetch next round.
4. To The T Plumbing, Heating & Air, admin@tothetplumbingandheating.com: GO. Review all-clear. Company-published Nov 2024 estimate PDF on their own Webflow asset CDN lists this address verbatim, F1 Gmail-accepted 2026-09-12. Thornton, draft has no location claim.
5. DeckTec Outdoor Designs, mail@decktec.com: GO. Review all-clear (one undated aggregator snippet resembling a no-response complaint, no date or rating, not a trigger). Address verbatim on decktec.com page.
6. Eckert Renovations, eckertrenovations@outlook.com: GO. Review all-clear. Address verbatim on eckerrenovations.com/contact-us/. Cheap-verify Outlook at send time. Thornton.
7. Honk Key Lock & Safe, info@honkkeylocksafe.com: HOLD. Review all-clear/unknown (no accessible Google profile). Address not on current site (phone + form only); published only in the 2026-06-19 press release (syndicated). Roll forward to the next queue; re-add to the 2026-09-20 tail (it was struck).
8. Miracle Maids, gcapal@aol.com: GO. Review all-clear (most recent review "a month ago", 5-star; two older negatives pre-date the window). Address verbatim on miraclemaidsofdenver.com homepage. Cheap-verify AOL at send time. Denver.
9. Pride N Service Junk Removal, pridenservice@gmail.com: GO. Review all-clear (5.0/571 baseline). Address verbatim on pridenservicejunk.net contact info. Cheap-verify Gmail at send time. Aurora.
10. Road Scholars Moving, info@roadscholarsmoving.com: HOLD. Review all-clear. Address not on own site (no email string found); third-party press cites ryan@conroymoving.com (different domain). Roll forward to the next queue; re-add to the 2026-09-20 tail (it was struck).

Send order preserved: F2s first (slots 1 to 4), then cold FIFO (5, 6, 8, 9 GO; 7 and 10 held and rolled forward). Effective 8 sends for the 2026-09-19 UTC cap.

## Round-80 parent addendum (2026-09-17, after pre-send review)
- Slot 10 (Road Scholars Moving): PARKED, not rolled. Second consecutive verification failure (no own-site email; conflicting third-party record ryan@conroymoving.com). A twice-failing slot becomes parked, not a perpetual HOLD. Pipeline row flipped to SUPPRESS 2026-09-17 with the correction note. Never re-queue.
- Slot 7 (Honk Key Lock & Safe): rolls forward as recommended; re-added to the 2026-09-21 cold roll list (the 09-20 tail note is superseded: 09-20 cap is full at 10/10 with follow-up priority). Cheap-verify at send time; a second verification failure parks it too.
- Effective sends for the 2026-09-19 UTC cap: 8 (slots 1-6, 8, 9). Cap headroom (2) is NOT filled with cold backfill: follow-up priority is absolute and the remaining cold FIFO was struck from 09-19 deliberately. The 09-19 send worker sends the 8 GO slots only.
