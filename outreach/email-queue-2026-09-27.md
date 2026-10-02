# Email queue — 2026-09-27 UTC cap (10 sends, opens 18:00 MDT 2026-09-26)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

REBUILT 2026-09-23 round 124 (follow-up-priority correction). All 10 slots are follow-ups; zero cold slots. Previous version had 20 cold FIFO entries, which now cascade to the 09-30 cap (see the 09-26 queue roll section). The 13 round-124 drafts verified on disk ~11:40 MDT, voice-audited. 2026-09-23 UTC cap is 10/10 consumed (round 119); zero sends this round, queue edits only.

## F1 ladder-priority slots 1-4 (September-22 cold cohort; initial sends 2026-09-22 UTC; F1 window 2026-09-26 to 2026-09-29; drafts written round 124)
1. `drafts/round124-f1-pq-plumbing.md` → quammenp@yahoo.com (PQ Plumbing & Heating, Delta; family-owned since 2018; 2am burst-pipe caller angle; cheap-verify Yahoo before send)
2. `drafts/round124-f1-jo-mamas-movers.md` → info@jomamasmovers.com (Jo Mama's Movers, Montrose; after-hours quote-inquiry angle)
3. FILLED 2026-09-25 round 146 from the cold FIFO head per standing order (the F1 below is cancelled; address retired): `drafts/round30-alpine-fencing-email.md` → alpinefencing@aol.com (Alpine Fencing & Supplies, Delta; fencing ag/residential/commercial; own-site footer email; AOL address, cheap-verify before send; chain re-verify at send time)
~~3. CANCELLED (round 146, 2026-09-25): permanent-failure DSN arrived 2026-09-25 16:22 UTC (451 4.4.4, unprovisioned M365 tenant; Gmail ID 1a0d96041c6dfcde); the initial cold email NEVER DELIVERED.~~ ~~`drafts/round124-f1-high-mountain-hearth.md` → kim@highmountainhearthsolutions.com (High Mountain Hearth Solutions, Montrose)~~ — DO NOT SEND: address retired, suppression_state=bounced 2026-09-25, ladder ended. The slot was refilled from the cold FIFO head per standing order; this pulled the 09-28 cold FIFO head forward one cap, and the 09-28/09-30 queues were backfilled in order the same round.
4. `drafts/round124-f1-wbs-coatings.md` → jstockton@wbscoatings.com (WBS Coatings, Grand Junction; Saturday-morning bid-inquiry angle; contact@ superseded, not on current own site)

## F2 FINAL ladder-priority slots 5-7 (window 2026-09-26 to 2026-09-30; drafts written round 124; genuinely new angles + easy out; THIRD and FINAL touch, ladder ends after)
5. `drafts/round124-f2-jack-of-all-junction.md` → jackofalljunction@gmail.com (Jack Of All Junction LLC, Grand Junction handyman; NEW angle: last warm-weather window speed-to-lead; cheap-verify Gmail before send)
6. `drafts/round124-f2-waypoint-rv.md` → waypointrvcamper@gmail.com (Waypoint RV Service, FRUITA CO — geography corrected, see below; NEW angle: October winterization rush before first hard freeze; cheap-verify Gmail before send)
7. `drafts/round124-f2-irrigation-monkey.md` → dennis@irrigationmonkey.com (Irrigation Monkey, SILT CO — geography corrected, see below; NEW angle: holiday lighting installs as the next wave after blowouts)

## F1 ladder-priority slots 8-10 (September-23 cold cohort, first half; initial sends 2026-09-23 UTC; F1 window 2026-09-27 to 2026-09-30; DRAFTS WRITTEN round 126, voice-audited, bump bodies 37-40 words)
8. `drafts/round126-f1-keenans-plumbing.md` → office@keenansplumbing.com (Keenan's Plumbing & Heating, Montrose; family-owned, site-published email; initial draft drafts/round14-keenans-plumbing-email.md)
9. `drafts/round126-f1-par-mechanical.md` → john@parmechanical.net (PAR Mechanical, Montrose; HVAC; site-published email; initial draft drafts/round14-par-mechanical-email.md)
10. `drafts/round126-f1-aps-alpine.md` → alpinepropertyservices95@gmail.com (APS Alpine Property Services, Montrose; property services/landscaping, family-owned since 1995; Gmail address, cheap-verify before send; initial draft drafts/round15-aps-alpine-email.md)

## Geography correction (round 124)
The round-102 parking note in the previous version of this file listed Waypoint RV Service and Irrigation Monkey as "Aspen area" F2 ladders parked under the corridor-only rule. That note was WRONG. Verified from the original round-80 F1 draft headers: Waypoint RV Service is in FRUITA, Colorado; Irrigation Monkey is in SILT, Colorado. Both are corridor-eligible, their F1s were SENT 2026-09-19/20 (verified in sent mail, no replies), and their F2 ladders are ACTIVE on this cap. The round-102 note has been superseded and must not be re-applied to these two businesses.
Still genuinely parked (geography, not verification): Preferred Garage Doors (Northglenn), Shaw Solar (Durango), Aspen Floor & Home Services (Aspen), Groundskeepers of Aspen (Aspen), Blackbird Kitchen and Bath (Aspen area).

## Cold FIFO — corridor only (one slot on this cap: the vacated F1 slot 3, filled from the cold FIFO head per standing order; the remainder cascades to the 2026-09-30 cap; see the 09-26 queue roll section for the FIFO order)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/AOL/Hotmail/Outlook/odd-domain addresses. Never send to a bounced address.

## Round-124 rebuild notes
- Follow-up priority: 10/10 sends are follow-ups. The cold FIFO cascades untouched to 09-30.
- September-23 cohort F1s split 3+3 across 09-27 and 09-28 by FIFO order of the initial sends. F1 drafts for these six are NOT yet written; the firing round must draft them before any send.
- Voice note: FIFO drafts from rounds 27-92 predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
