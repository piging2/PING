# Email queue — 2026-09-13 UTC cap (10 sends, opens 18:00 MDT 2026-09-12)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## 1-4. F1 follow-ups (ladder priority; initial sends 2026-09-08, day 5 of 4-7 window)
1. `drafts/round31-f1-mh-electrical-solar.md` → hello@mhelectricalandsolar.com (Matt Heenan, MH Electrical & Solar). NOTE: address is from a third-party listing (findenergy), not their site; accepted 2026-09-08 with no bounce, but cheap-verify before sending.
2. `drafts/round31-f1-sanders-johnson.md` → contactus@sandersandjohnson.com (Jim Sanders)
3. `drafts/round31-f1-to-the-t.md` → admin@tothetplumbingandheating.com (Nate)
4. `drafts/round31-f1-smart-garage-door.md` → info@smartgaragedoorco.com (Dmitrii Reison)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update JSONL suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-22 (F1 sent 2026-09-13)".

## 5-10. Cold FIFO (oldest drafts first; round-26 batch, queued 2026-09-11)
5. `drafts/round26-anasazi-solar-email.md`
6. `drafts/round26-atlasta-solar-email.md`
7. `drafts/round26-colorado-hardwood-floors-email.md`
8. `drafts/round26-colorado-premier-garage-doors-email.md`
9. `drafts/round26-durango-solar-works-email.md`
10. `drafts/round26-eagle-insulation-email.md`

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/odd-domain addresses; never send to a bounced address.

## Rolled to 2026-09-14 UTC queue (bumped by F1 priority + FIFO order)
- round26-high-noon-solar-email.md, round26-preferred-garage-doors-email.md, round26-renwick-tiles-email.md, round26-shaw-solar-email.md, round26-sunsense-solar-email.md, round26-top-notch-hardwood-email.md (rest of round-26 FIFO)
- round27-* batch incl. Honk-Key Lock & Safe (HOT; draft round27-honk-key-lock-safe-email.md). NOTE: press release lists alternate email info@honkkeylocksafe.com alongside the draft's hello@honkkeylocksafe.com; verify which is live before sending.
- round29-alpine-pressure-email.md, round30-apex-waste-solutions-email.md, round30-alpine-fencing-email.md, round30-grand-valley-concrete-polishing-email.md, round30-marathon-concrete-coatings-email.md
- (then round-31 research/FB additions as drafted)
