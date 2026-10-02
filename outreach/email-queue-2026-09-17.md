# Email queue — 2026-09-17 UTC cap (round-26 cohort F1s)

Initial cold emails sent 2026-09-13 UTC (~20:17-20:19 MDT 2026-09-12). F1 eligible day 4 = 2026-09-17. All 6 are pre-queued drafts from round 39 review-intel pass.

House notes:
- 10-per-UTC-day Gmail cap applies to ALL email. Send order each UTC day: (1) follow-ups (F1, F2, review-triggered), (2) new cold emails FIFO.
- Recipients are verbatim from the original round-26 drafts. Verify cohardwoodfloors@gmail.com with the cheap pre-send verification (Gmail-hosted address).
- After each send, verify acceptance in sent mail, then flip follow-ups.md result from QUEUED to F1 SENT and update the JSONL row (suppression_state, last_signal, next_eligible_action).

## Priority order

1. Eagle Insulation — robert@eagleinsulationco.com — drafts/round39-f1-eagle-insulation.md (strongest intel: Birdeye 4.1/13 with an undated no-response-pattern negative corroborating the callback angle; angle: 24-hour callback promise + mid-September weatherization rush)
2. Colorado Premier Garage Doors & Gate Systems — manage@cpgdgs.com — drafts/round39-f1-colorado-premier-garage-doors.md (Birdeye 4.9/76, clean; angle: perishable after-hours emergency calls)
3. Durango Solar Works — info@durangosolarworks.com — drafts/round39-f1-durango-solar-works.md (no new reviews; angle: post-tax-credit lead costs, assessment requests going stale)
4. Colorado Hardwood Floors — cohardwoodfloors@gmail.com — drafts/round39-f1-colorado-hardwood-floors.md (5.0/4 clean; angle: craftsmen interrupted by estimate calls)
5. Anasazi Solar — Info@AnasaziSolar.com — drafts/round39-f1-anasazi-solar.md (BBB A+, clean; angle: quotes going cold while crew is on roofs)
6. Atlasta Solar Center — admin@atlastasolar.com — drafts/round39-f1-atlasta-solar.md (4.6-4.8 clean; angle: multi-step install pipeline stalling between handoffs)

## Duplicate-removal correction (2026-09-16 round 66)
- Slot 9 originally held Aspen Floor & Home Services as a cold send, but round 63 (2026-09-15) already sent it as an INITIAL cold on the 2026-09-16 UTC cap (verified in sent mail; pipeline row says SENT 2026-09-15, F1 eligible 2026-09-19+, F1 slot lives in the 2026-09-20 queue). The round-65 review pass worked off this uncorrected queue file and re-checked Aspen Floor by mistake. Slot 9 replaced with the round-27 FIFO head, Blackbird Kitchen and Bath.
- Standing lesson: the queue file's cold FIFO section must be reconciled against leads.md SENT records before every pre-send review; a stale cold slot can become a duplicate send.

## 7-10. New cold FIFO (send only after the 6 F1s above, cap permitting)
7. `drafts/round40-irrigation-monkey-email.md` → dennis@irrigationmonkey.com (Irrigation Monkey, Silt; MISSED_CALL_LEAD_CAPTURE high; blowout season angle)
8. `drafts/round41-groundskeepers-of-aspen-email.md` → Bladesandflakes@groundskeepersofaspen.com (Groundskeepers of Aspen; MISSED_CALL_LEAD_CAPTURE medium; September snow-contract lock-in season; only email-verified candidate from round-41 snow/carpet research; Wix CONFIRMED)
9. `drafts/round27-blackbird-kitchen-bath-email.md` → sarah@blackbirdkitchenandbath.com (Blackbird Kitchen and Bath, Evergreen; Sarah Ocasek, site-published email; round-27 FIFO head, high-ticket kitchen consults, replacement for a removed duplicate — see notes)
10. `drafts/round48-waypoint-rv-email.md` → waypointrvcamper@gmail.com (Waypoint RV Service, Fruita; MISSED_CALL_LEAD_CAPTURE high; own-site mailto link verified 2026-09-14; first B-variant of the A/B copy test, log variant in angle-performance.md when sent)

## COMPLETED (round 71, 2026-09-16)

All 10 slots SENT ~20:30 MDT 2026-09-16, every acceptance verified individually in sent mail (2026-09-17 UTC day 10/10 consumed). F1s become F2-eligible 2026-09-21+; cold initials become F1-eligible 2026-09-20+. Next cap opens 18:00 MDT 2026-09-17 (2026-09-18 UTC day).
