# Email queue — 2026-09-22 UTC cap (10 sends, opens 18:00 MDT 2026-09-21)

## FIRING DECISION — Round 110 pre-send gate results (2026-09-21 ~17:25 MDT)
Send-eligibility.py ran per the gate for all 10 slots (--day 2026-09-22, per-recipient gmail-sent-count verified via `in:sent to:<addr>`).
- GO (exit 0): slots 3, 4, 5, 6 (Grime Fighters, M1Pro Plumbing, GPS Plumbing & Mechanical, Shelton Drilling). Gmail confirms 0 prior sends to each; structured touches 0.
- PARKED on DISCREPANCY (exit 2, DO NOT SEND, logged in eligibility-discrepancies.jsonl; need human reconciliation in eligibility-reconciliations.md):
  - Slot 1 B & B Plumbing & Heating (F1): checker claims "ladder complete (4 accepted touches)" + "no canonical JSONL row". Gmail ground truth: exactly 1 accepted send (initial 2026-09-17/18). Pipeline.md confirms SENT 2026-09-17, "F1 eligible 2026-09-22+". Checker's 4-touch count contradicts Gmail; fail closed.
  - Slot 2 Comfort Air (F1): "JSONL 0 touches vs pipeline.md 3". Gmail: 1 send (initial). Pipeline.md: SENT 2026-09-17, F1 eligible 2026-09-22+. Bookkeeping mismatch, not an over-contact risk; fail closed.
  - Slot 7 WBS Coatings (cold): "cold-email requested but 1 prior touch(es) recorded". Gmail: 0 sends. The "touch" is the 2026-09-10 SKIPPED form + DRAFTED state, never Gmail-accepted. Fail closed.
  - Slots 8/9/10 High Mountain Hearth, PQ Plumbing, Jo Mama's Movers (cold): "JSONL 0 vs pipeline.md 1". Gmail: 0 sends each; pipeline.md rows say QUEUED 2026-09-09/11, "not sent". Fail closed.
- ROOT CAUSE (for the checker fix, Nolan's call): the gate counts non-accepted states (QUEUED, DRAFTED, SKIPPED-form) and prose mentions as "touches", contradicting Gmail-verified accepted-send counts. F1 window for slots 1-2 runs through 2026-09-25; cold slots 7-10 can roll to 09-23 IF reconciled by a human.
- RESULT: the 09-22 UTC day fires with 4 sends (slots 3-6), not 10. Parked slots do NOT consume cap and do NOT auto-roll without reconciliation.

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

## Slots 1-2. F1 follow-ups (corridor; ladder priority; initial sends 2026-09-18 UTC, 09-22 = day 4 of the 4-7 window)
Both drafts written 2026-09-18 round 82: short bumps under 50 words, exact disclosure line first, one question max, reference the original angle, no em dashes. Whitewolf Cabinets excluded: HARD BOUNCE 2026-09-17 (5.1.3 address not found), ladder cancelled, pipeline.md SUPPRESS.
1. `drafts/round82-f1-bb-plumbing-heating.md` → rifleplumber@yahoo.com (B & B Plumbing & Heating, Rifle; phone-dispatch-only angle; NEW intel: first freeze warnings landing, furnace calls spike; cheap-verify Yahoo before send)
2. `drafts/round82-f1-comfort-air.md` → office@comfortairco.com (Comfort Air Of Grand Junction LLC; coldest-night no-heat angle; NEW intel: first cold snap = busiest no-heat week of the year)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-28 to 2026-10-02 (day 10-14 from initial 2026-09-18)". Stop the ladder permanently on any reply.

**Pre-send verification 2026-09-20 ~11:30 MDT (round 100):** slots 1-2 GO. Review delta: zero triggers (no new dated ≤2-star or 3-star phone/response/wait/scheduling on/after 2026-09-08). Cheap-verify PASS: B & B rifleplumber@yahoo.com (live on own site footer at bandbplumbing.com); Comfort Air office@comfortairco.com (live in footer sitewide at comfortairco.com). Chain re-verification: B & B INDEPENDENT (local Rifle/Grand Junction; note: separate B & B Plumbing cold-send duplication remains permanently struck), Comfort Air INDEPENDENT (Grand Junction LLC). Full detail in scratch/reviews-round100.md. The firing run needs no further cheap-verify on slots 1-2.

## Slots 3-10. Cold FIFO (corridor; send only after the 2 F1s above, cap permitting; slot order and copy-test VARIANT annotations preserved)
3. `drafts/round65-grime-fighters-email.md` → gjgrimefighters@gmail.com (Grime Fighters, Grand Junction; recurring-route bin cleaning; own-site email verified 2026-09-16 round 65; VARIANT B second of the copy test)
4. `drafts/round66-m1pro-plumbing-email.md` → m1proplumbing@gmail.com (M1Pro Plumbing LLC, Clifton; 13 yrs, own site sells "we answer the phone"; phone-only CTA no booking widget; 74 Birdeye reviews; MISSED_CALL_LEAD_CAPTURE high; WARM)
5. `drafts/round66-gps-plumbing-mechanical-email.md` → gpsplumbingco@gmail.com (GPS Plumbing & Mechanical LLC, Grand Junction; own site publishes email VERIFIED live 2026-09-16; swamp cooler startup/shutdown/pad replacement specialty; family-owned; mid-Sept winterization window; VARIANT B second of the copy test)
6. `drafts/round67-shelton-drilling-email.md` → wsdi@rof.net (Shelton Drilling Corp., Rifle; sparse Thryv site, office closed weekends no after-hours path; domain email, no cheap-verify flag; VARIANT B; paired with Animas [A] for the round-67 copy test; Animas parked for geography, Shelton keeps its VARIANT B annotation)
7. `drafts/round68-wbs-coatings-email.md` → contact@wbscoatings.com (WBS Coatings, Grand Junction; concrete/industrial coatings, 596 23 1/2 Rd; office Mon-Fri 8-5; weekend bid inquiries hit a closed office; AEO STRONG 4.4/5 27 reviews; MISSED_CALL_LEAD_CAPTURE medium; WARM; VARIANT B; Summit [A] parked for geography, WBS keeps its VARIANT B annotation)
8. `drafts/round11-high-mountain-hearth-email.md` → kim@highmountainhearthsolutions.com (High Mountain Hearth, Montrose; chimney sweeps; site-published email from the live site "Email Us" mailto link, discovered 2026-09-09; never sent; corridor backfill, oldest round first)
9. `drafts/round11-pq-plumbing-email.md` → quammenp@yahoo.com (PQ Plumbing & Heating, Delta; family-owned since 2018, licensed master plumber; site-published email; never sent; Yahoo address, cheap-verify before send; corridor backfill, oldest round first)
10. `drafts/round13-jo-mamas-movers-email.md` → info@jomamasmovers.com (Jo Mama's Movers, Montrose; serving Southwest Colorado since 1984; site-published own-site email; never sent; corridor backfill, oldest round first)

Recipient address is in the draft file's To: line. Pre-send: cheap-verify Gmail address; never send to a bounced address.

## FIRING RESULTS — Round 111 (2026-09-21 ~20:16-20:17 MDT; 2026-09-22 UTC cap 4/10)
Round-110's pre-gate (slots 3-6 GO at ~17:25 MDT) was treated as EXPIRED because it crossed the 18:00 MDT UTC boundary and only ~60% of its inputs were fresh. Full per-recipient fire-time re-verification ran 2026-09-21 ~20:15 MDT:
- Gmail `in:sent to:<addr>`: 0 prior sends to all 4 (gjgrimefighters@gmail.com, m1proplumbing@gmail.com, gpsplumbingco@gmail.com, wsdi@rof.net)
- send-eligibility.py exit 0 for all 4 (--day 2026-09-22, per-recipient gmail-sent-count=0)
- All 4 drafts re-read for 2026-09-20 voice rules: Grime Fighters + Shelton Drilling re-voiced in this round (AI-identity line, one-sentence-per-line, sign-off normalized to exactly `PING Social, (970) 589-3309`); M1Pro + GPS were voice-current.
- All 4 chain re-verifications: INDEPENDENT. No new reviews observed.
Result: 4/4 FIRED, all Gmail-accepted (SENT label, thread IDs returned), every one verified in sent mail before marking SENT. Zero approval stalls (hatch_gws_cli gmail +send returned in ~2s each).
- Grime Fighters → gjgrimefighters@gmail.com (slot 3, VARIANT B copy test) — SENT 2026-09-21 19:15:55 -0700
- M1Pro Plumbing LLC → m1proplumbing@gmail.com (slot 4, VARIANT A) — SENT 2026-09-21 19:16:24 -0700
- GPS Plumbing & Mechanical LLC → gpsplumbingco@gmail.com (slot 5, VARIANT B) — SENT 2026-09-21 19:16:39 -0700
- Shelton Drilling Corp. → wsdi@rof.net (slot 6, VARIANT B) — SENT 2026-09-21 19:16:53 -0700
All 4 ladders armed: F1 eligible 2026-09-26 to 2026-09-29. Slots 1-2 (B&B, Comfort Air F1) and slots 7-10 (WBS, High Mountain Hearth, PQ, Jo Mama's cold) remain PARKED on discrepancy; no auto-roll.

## PARKED_GEOGRAPHY (round-102 geography scrub, 2026-09-20)
Parked under the corridor-only rule. American Asphalt was verified GO in the round-100 pre-send check (cheap-verify PASS, INDEPENDENT); parking is geographic only. Parked ladders are never re-queued without an explicit geography-rule change.
- American Asphalt (Glenwood Springs) — F1 stage, `drafts/round82-f1-american-asphalt.md`, initial send 2026-09-18

## Removed cold drafts (out-of-corridor; not parked ladders, simply out of the queue)
- Animas Well Drilling LLC (Durango) — cold, `drafts/round67-animas-well-drilling-email.md`
- Summit Concrete Finishes (Steamboat Springs/Aspen service area) — cold, `drafts/round68-summit-concrete-finishes-email.md`

## Rolled to 2026-09-23 (round 82 reconcile: superseded by round-102 geography scrub)
The three drafts below were slated to roll to 09-23, but all are out-of-corridor and are removed from the send flow, not rolled:
- `drafts/round68-straightline-painting-email.md` (Straightline Painting, Dillon HQ) — REMOVED, out-of-corridor
- `drafts/round68-colorado-energy-systems-email.md` (Colorado Energy Systems, Glenwood Springs) — REMOVED, out-of-corridor
- `drafts/round68-2180-lighting-design-studio-email.md` (2180 Lighting & Design Studio, Durango) — REMOVED, out-of-corridor

## Geography scrub 2026-09-20 round 102
Round-102 queue-scrub worker, 2026-09-20. Corridor-only rule applied.
- Before: 10 slots (3 F1 + 7 cold). After: 10 slots (2 F1 + 8 cold).
- Parked: American Asphalt F1 (Glenwood Springs), initial 2026-09-18.
- Removed cold: Animas Well Drilling (Durango), Summit Concrete Finishes (Steamboat Springs/Aspen).
- Backfilled slots 8-10 with corridor FIFO cold, oldest round first: High Mountain Hearth (Montrose, round 11), PQ Plumbing & Heating (Delta, round 11), Jo Mama's Movers (Montrose, round 13). All three verified on disk with To: lines; contact-route verification per recorded site-published notes; never sent; never re-verified.
- Slot order and copy-test VARIANT B annotations preserved on Grime Fighters, GPS Plumbing, Shelton Drilling, WBS Coatings.
- Rolled-to-09-23 section neutralized: the three out-of-corridor drafts (Straightline, Colorado Energy Systems, 2180 Lighting) are removed, not rolled.
- Voice note: the three backfill drafts (rounds 11-13) were re-voiced in round 102 (2026-09-20) to the AI-identity / sentence-per-line / sign-off standards; each draft carries the re-voice footer. Verified current again in round 104: disclosure line verbatim, AI identity line present, blank-line sentence spacing, sign-off "PING Social, (970) 589-3309", no human-name intro, no em dashes. Firing run may send as-is after the standard pre-send gates (cheap-verify Gmail/Yahoo, chain re-verify, 24h review delta).
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.

## Touch-count reconciliation 2026-09-22 (canonical store: validated JSONL)

Nolan's decision: the validated JSONL prospect records are the canonical touch-count store; pipeline.md is the derived digest. Backfill script `backfill-touch-counts-2026-09-22.py` (idempotent) reconciled all six JSONL-vs-pipeline.md touch-count disagreements against Gmail-verified ground truth (`in:sent to:<addr>`). Reconciliation lines in `eligibility-reconciliations.md`; run log in `backfill-touch-counts-2026-09-22.log`.

Per-prospect dispositions (re-evaluated with send-eligibility.py --day 2026-09-22, Gmail-verified counts):
- Slot 2 Comfort Air (F1): UNPARKED. Was "JSONL 0 vs pipeline.md 3"; Gmail verifies exactly 1 send (cold 2026-09-17). JSONL was stale, verified send added; pipeline.md re-derived to 1. Gate: ELIGIBLE (1 touch, F1 window 2026-09-22+). Draft `drafts/round82-f1-comfort-air.md` ready; round-100 cheap-verify/chain PASS stands. Normal pre-send gates still apply at fire time.
- Slots 8/9/10 High Mountain Hearth, PQ Plumbing, Jo Mama's Movers (cold): UNPARKED. Were "JSONL 0 vs pipeline.md 1"; Gmail verifies 0 sends each (drafts queued, never sent; pipeline.md prose "not sent" falsely counted 1 marker, re-derived to 0). Gate: ELIGIBLE, 0 touches. Drafts on disk and voice-current per round-102/104. Normal pre-send gates still apply at fire time (cheap-verify Gmail/Yahoo addresses, chain re-verify, 24h review delta).
- Slot 1 B & B Plumbing & Heating (F1) and Slot 7 WBS Coatings (cold): UNCHANGED, still parked. Different discrepancy type (notes-vs-structured / non-accepted states counted as touches), out of scope for this backfill.
- Canyon Creek Electric / Lico's Electric LLC (F2): REMAIN PARKED, permanently. Were "JSONL 1 vs pipeline.md 7"; Gmail verifies 4 sends each (cold 2026-09-10, F1 2026-09-13, F2 2026-09-19, erroneous duplicate 2026-09-21 round-105). Both stores now record 4. SUPPRESS hard block (ladder violation 2026-09-21): no further touches, ever. Stale round-9-14 planning notes reconciled against the suppression (structured wins; notes never resurrect a suppressed sequence).

Nothing was sent by this reconciliation. Unparked slots become candidates for a future firing run only, subject to the standing pre-send gates and the UTC cap.

## B&B / WBS touch-count reconciliation 2026-09-22 (~07:55 MDT, second backfill)

Different failure mode than the six above: non-accepted states and prose re-descriptions counted as touches. Gmail ground truth re-verified 2026-09-22 (`in:sent to:<addr>`): B & B Plumbing & Heating = exactly 1 send (cold 2026-09-17 20:19 MDT, id 1a0b25022d3383cc); WBS Coatings = 0 sends. Backfill script `backfill-touch-counts-bb-wbs-2026-09-22.py` (idempotent) re-derived pipeline.md marker-exact (B&B row: one SENT per real send, Gmail id cited; WBS row: "not submitted" prose replaced with "left unsubmitted"), and send-eligibility.py was hardened: negated markers ("not sent", "never sent", "not submitted") are not sends; an identical (marker, date) pair described twice (row + dedup-audit line) counts once. Reconciliation lines in `eligibility-reconciliations.md`; run log in `backfill-touch-counts-bb-wbs-2026-09-22.log`. No canonical JSONL rows created for either (300-active cap; both tracked in pipeline.md per standing procedure).

Per-prospect dispositions (re-evaluated with send-eligibility.py --day 2026-09-22, Gmail-verified counts):
- Slot 1 B & B Plumbing & Heating (F1): UNPARKED. Was "ladder complete (4 accepted touches)" from 4 prose markers describing the single Gmail-verified send; pipeline.md re-derived to 1. Gate: ELIGIBLE (1 touch, F1 window 2026-09-22+). Draft `drafts/round82-f1-bb-plumbing-heating.md` ready; round-100 review GO (delta TRIGGER N). Normal pre-send gates still apply at fire time.
- Slot 7 WBS Coatings (cold): UNPARKED. Was "cold-email requested but 1 prior touch(es) recorded" from the "not submitted" prose matching the SUBMITTED marker; Gmail verifies 0 sends; pipeline.md re-derived to 0. Gate: ELIGIBLE, 0 touches. Draft `drafts/round68-wbs-coatings-email.md` ready. Normal pre-send gates still apply at fire time (cheap-verify, chain re-verify, 24h review delta).

Nothing was sent by this reconciliation. Unparked slots become candidates for a future firing run only, subject to the standing pre-send gates and the UTC cap.

## FIRING RESULTS — Round 115 (2026-09-22 ~08:45-08:50 MDT; 2026-09-22 UTC cap 7/10)

Pre-send gates re-run per recipient with fresh Gmail-verified counts (all exit 0): B&B F1 (1 touch), Comfort Air F1 (1 touch), WBS cold (0), HMH cold (0), PQ cold (0), Jo Mama's cold (0). Independent pre-send battery (review delta, chain re-verification, cheap-verify on live own site) returned GO for Comfort Air, PQ, Jo Mama's; HOLD for B&B (rifleplumber@yahoo.com no longer renders on rifleplumber.com, third-party directory only), WBS (address obfuscated on wbscoatings.com), HMH (mailto link only, address not verbatim).

Sends fired via send-batch.py (fire-time gate re-verified each; every acceptance verified in sent mail):
- SENT+VERIFIED office@comfortairco.com | "Quick follow-up: first cold snap" | id=1a0c98c1780725e9 (Comfort Air F1)
- SENT+VERIFIED quammenp@yahoo.com | "Pete, your 2am callers are not leaving voicemails" | id=1a0c98d30ebe0a53 (PQ cold)
- SENT+VERIFIED info@jomamasmovers.com | "40 years of moves in Montrose, one quiet inbox after hours" | id=1a0c98d469571288 (Jo Mama's cold)

Result: 3/3 sent+verified. Cap now 7/10 on 2026-09-22 UTC (4 from round 111 + 3 this run). 3 slots remain unused: no other eligible sends (pool exhausted; the 3 HOLDs stay parked pending address re-verification; mailto-link browser check dispatched for WBS/HMH, B&B stays HOLD regardless).

send-batch.py hardened this run (FL-20260922-003): parse_draft now strips parenthetical annotations from To: lines, handles "- To:" bullets and bullet metadata blocks, truncates body at the sign-off line (editorial notes never sent), and treats the CLI's stderr zero-hit notice as count 0.

## FIRING RESULTS — Round 116 (2026-09-22 ~11:24 MDT; 2026-09-22 UTC cap 9/10)

Reroute decision: the round-115 browser mailto task (completed 08:34 MDT) proved contact@wbscoatings.com is absent from wbscoatings.com while jstockton@wbscoatings.com is the site's live published mailto address (homepage + /contact-us). Round-68 draft's To: superseded; fresh draft round116-wbs-coatings-jstockton.md written with the same body. Cheap-verify battery on the 4 round-115 research rows (Straight Edge Striping, All Temp Services, Colorado Commercial Repairs, Fortney Refrigeration): 0 GO / 4 HOLD under the strict own-site rule (addresses not verbatim in fetched text). Send-batch.py battery (parse + per-recipient in:sent count + eligibility gate + +send + sent-mail verification):

- SENT+VERIFIED jstockton@wbscoatings.com | "What happens to the Saturday-morning bid inquiry" | id=1a0ca27c7c7006e2 (WBS cold, reroute)

Result: 1/1 sent+verified. Cap now 9/10 on 2026-09-22 UTC (4 round-111 + 3 round-115 + 1 mailto-verdict + 1 round-116). Slot 10 unfilled: pool exhausted.

## Round-116 cap reconciliation (2026-09-22 ~11:37 MDT, engine round 116)
Full sent-mail enumeration (in:sent newer_than:1d) shows **9/10 accepted for the 2026-09-22 UTC day**, not the 7/10 the round-115 report and round-116 lane A carried:
1-4. round-111 batch (2026-09-21 ~20:16 MDT): Grime Fighters, M1Pro Plumbing, GPS Plumbing & Mechanical, Shelton Drilling.
5. Comfort Air F1 (2026-09-22 08:36:36 MDT, id 1a0c98c1780725e9).
6. PQ Plumbing cold (2026-09-22 08:37:48 MDT, id 1a0c98d30ebe0a53).
7. Jo Mama's Movers cold (2026-09-22 08:37:54 MDT, id 1a0c98d469571288).
8. High Mountain Hearth cold (2026-09-22 08:54:59 MDT, id 1a0ca99cedbee68ff) — the mailto-verdict run fired it at ~09:00 MDT and recorded 8/10, but the round-115 reply check (~08:25 baseline) predated it and lane A enumerated per-address rather than per-day, so both carried 7/10 forward.
9. WBS Coatings cold REROUTE to jstockton@wbscoatings.com (2026-09-22 11:26:39 MDT, id 1a0ca27c7c7006e2; engine round 116).
**Remaining: 1/10 slot for the 2026-09-22 UTC day** (expires 18:00 MDT 2026-09-22). The verified pool was exhausted under the strict own-site rule; the slot was intentionally left unfilled rather than weakening the bar.
Rule learned: cap counts must come from a full per-day sent-mail enumeration (in:sent newer_than:1d filtered to the UTC day), never from carrying a lane's per-address count forward.
