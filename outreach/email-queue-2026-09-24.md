# Email queue — 2026-09-24 UTC cap (10 sends, opens 18:00 MDT 2026-09-23)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

## Slots 1-4. F2 follow-ups (corridor; ladder priority) — F2 DRAFTS WRITTEN round 85, 2026-09-18
The 4 F1 follow-ups (initial sends 2026-09-13; F1 SENT 2026-09-17, verified in sent mail ~02:30 UTC 2026-09-18; F2 window day 10-14 runs 2026-09-23 to 2026-09-27; 09-24 = day 11). F1s recorded in follow-ups.md lines 546-551; no replies, no declines, no bounces on any of the 4 (checked 2026-09-18). All 4 F2s written 2026-09-18 round 85: NEW seasonal angles distinct from the F1, one question max, easy out, exact disclosure line first, no em dashes.
1. `drafts/round85-f2-high-noon-solar.md` → information@highnoonsolar.com (High Noon Solar, GJ; SunPower-authorized maintenance; NEW angle: fall storm-season battery-backup inquiries spike during outages) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 00:48:38 UTC; fired 18:48 MDT by unrecorded execution, outcomes recorded round 129)
2. `drafts/round85-f2-renwick-tiles.md` → info@renwicktiles.com (Renwick Tiles, GJ; handmade tile, Craig & Ruth Renwick, QuickBooks CONFIRMED; NEW angle: holiday tile orders being planned now, made-to-order cannot ship late) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 00:50:27 UTC; fired 18:50 MDT by unrecorded execution, outcomes recorded round 129)
3. `drafts/round85-f2-sunsense-solar.md` → Sunsense@sunsensesolar.com (Sunsense Solar, Carbondale; orphaned-system rescue, growth hiring; NEW angle: shorter fall days, more production-complaint calls while new hires ramp) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 00:51:21 UTC; fired 18:51 MDT by unrecorded execution, outcomes recorded round 129)
4. `drafts/round85-f2-top-notch-hardwood-flooring.md` → KWILSON@TOPNOTCHHARDWOODFLOORS.COM (Top Notch Hardwood Flooring LLC, Montrose; closed Tuesdays; NEW angle: holiday floor jobs booked now before December) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 00:52:01 UTC; fired 18:52 MDT by unrecorded execution, outcomes recorded round 129)

On acceptance: flip pipeline/leads status to F2 SENT, log in follow-ups.md with result, update JSONL suppression_state to `ladder F2 2026-09-24` and next_eligible_action to "none (ladder complete; watch only)". Stop the ladder permanently on any reply. Do NOT mark F2 SENT until Gmail acceptance is verified in sent mail. If any ladder is dead (reply/decline/bounce), pull the next cold draft from the FIFO below to keep the cap at 10.

## Slots 5-10. Cold FIFO (corridor; send only after the 4 F2s above, cap permitting; FIFO order preserved, oldest vintage first; copy-test VARIANT annotations preserved)
5. `drafts/round69-winch-willow-email.md` → winchandwillowservices@gmail.com (Winch & Willow Services LLC, Delta/Montrose/Grand Junction; cleaning + maintenance + basic locksmithing; own site winch-and-willow.com, owners Bradley & Wendy; email published in their own Facebook hiring post 2026-09-14; revamp angle withdrawn after site discovery 2026-09-16; MISSED_CALL_LEAD_CAPTURE high; VARIANT A) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 01:01:27 UTC; fired 19:01 MDT by unrecorded execution, outcomes recorded round 129)
6. `drafts/round69-telluride-spa-care-email.md` → help@telluridespacare.com (Telluride Spa Care, Montrose serving Telluride/Mountain Village/Ridgway; spa/hot tub service + repair; own-site email verified 2026-09-16; MyPoolPortal customer portal CONFIRMED; only CHTT/CPO certified crew within 100 miles; VARIANT B; inserted round 97 reconcile 2026-09-20, displaced from 09-23 by the Jack Of All Junction F1-equivalent follow-up; FIFO vintage round69) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 01:03:01 UTC; fired 19:03 MDT by unrecorded execution, outcomes recorded round 129)
7. `drafts/round70-western-slope-junk-removal-email.md` → westernslopejunkremoval@gmail.com (Western Slope Junk Removal, Montrose; family-owned junk removal; own-site email/phone/address/hours all re-verified verbatim 2026-09-16; 14-hour daily availability window vs crew-on-truck hauling; MISSED_CALL_LEAD_CAPTURE high; WARM; VARIANT B) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 01:04:02 UTC; fired 19:04 MDT by unrecorded execution, outcomes recorded round 129)
8. `drafts/round17-kooler-garage-doors-email.md` → matt@koolergaragedoors.com (Kooler Garage Doors, Grand Junction; garage doors; site-published on own-site privacy policy page; never sent; corridor backfill, oldest round first) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 03:03:03 UTC, round 129)
9. `drafts/round18-chrome-pest-control-email.md` → Chromeent@outlook.com (Chrome Mosquito & Pest Control, Fruita; pest control, serves Grand Junction, Palisade, Western Slope; own-site indexed email; never sent; Outlook address, cheap-verify before send; corridor backfill, oldest round first) — HOLD 2026-09-24 (cheap-verify FAIL: address masked as [email protected] on live chromepest.com/contact/ 2026-09-24; own-site-indexed only; second verification failure parks it; rolled to 09-26 roll chain head with guard)
10. `drafts/round18-pest-away-spraying-email.md` → pestawayspraying@aol.com (Pest Away Spraying, Delta; pest control plus lawns, weeds, trees, ornamentals, termites, real-estate inspections; serves Montrose; site-published email; never sent; AOL address, cheap-verify before send; corridor backfill, oldest round first) — DONE 2026-09-24 (Gmail-accepted, verified in sent mail 03:05:24 UTC, round 129; cheap-verify PASS: address verbatim on own site)

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail addresses; never send to a bounced address.

## PARKED_GEOGRAPHY (round-102 geography scrub, 2026-09-20)
Parked under the corridor-only rule. All were verified with no replies, no declines, no bounces as of 2026-09-18; parking is geographic only. Parked ladders are never re-queued without an explicit geography-rule change.
- Preferred Garage Doors (Northglenn) — F2 stage, `drafts/round85-f2-preferred-garage-doors.md`, initial send 2026-09-13
- Shaw Solar (Durango) — F2 stage, `drafts/round85-f2-shaw-solar.md`, initial send 2026-09-13

## Removed cold drafts (out-of-corridor; not parked ladders, simply out of the queue)
- Sunwise Solar (Steamboat Springs) — cold, `drafts/round69-sunwise-solar-email.md`

## Rolled to 2026-09-25 (round 85 FIFO cascade, updated round 102; corridor only, FIFO order preserved)
- `drafts/round74-all-metals-welding-email.md` → ryan@allmetalswelding.com (All Metals Welding & Fabrication, Grand Junction; custom fabrication/repair/waterjet, owner Chris Muhr; material-sales email verbatim on own-site Material Sales pages, independently re-verified round 74 via live crawl; MISSED_CALL_LEAD_CAPTURE medium; industrial fabrication, quote-speed angle)
- `drafts/round75-the-fireplace-company-email.md` → office@thefpco.com (The Fireplace Company, Carbondale + Gunnison showroom; independent hearth shop, sales/install/repair/service gas/wood/electric fireplaces + wood stoves; own-site email verified 2026-09-17; fall heating-season tune-up angle; AUTOMATION medium; WARM; VARIANT A)
- `drafts/round76-jbs-asphalt-email.md` → Jbasphaltco.gmail.com (JB's Asphalt Sealcoating & Striping, Grand Junction; 18+ yrs, zero website; WEBSITE_REVAMP primary + MISSED_CALL secondary; email business-published on its own about.me profile; Gmail address, cheap-verify before send)
- `drafts/round76-clemmer-welding-email.md` → info@clemmerwelding.com (Clemmer Welding LLC, Grand Junction; family shop since 1995, mobile/field welding + oilfield/industrial, field crews + shop line; MISSED_CALL_LEAD_CAPTURE medium; September pre-winter maintenance window angle; email indexed on own-site contact page, own-domain)
- `drafts/round76-family-time-spas-email.md` → info@familytimespasgj.com (Family Time Spas, Grand Junction; family-owned, hot tubs/swim spas/saunas, GJ showroom, 15+ years; MISSED_CALL_LEAD_CAPTURE high, after-hours showroom-closed angle; email verified on own-site privacy page; GAP FIX: pipeline claimed a round-59 draft was written 2026-09-15 but the file never existed)
- `drafts/round76-rimrock-pools-email.md` → rimrockpools@gmail.com (Rimrock Pools and Spas, Grand Junction; owner Chad Clementson, locally owned, pool building/service/spa sales; MISSED_CALL_LEAD_CAPTURE high, mid-route repair-call angle; email from business's OWN Facebook posts; BINDING PRE-SEND GATE (round 82): the firing run must confirm the email on the own site (rimrockpoolsandspas.com or rimrockpsc.com) or on the business's official Facebook page before sending; if unverifiable, HOLD this slot and pull the next FIFO draft instead; Gmail address, cheap-verify before send)
- `drafts/round76-swiss-pro-carpet-email.md` → swissproclean@gmail.com (Swiss Pro Carpet Cleaning, Grand Junction; locally owned 42 years, carpet/upholstery/tile/commercial; MISSED_CALL_LEAD_CAPTURE high + review-request automation angle; email + phone both verified live on own site swissprocleaning.com 2026-09-17; Gmail address, cheap-verify before send)
- `drafts/round79-siding-guy-inc-email.md` → sidingguy78@yahoo.com (Siding Guy Inc, Grand Junction; locally owned, Michael Crabtree, 30 yrs, EDCO authorized installer; own-site contact-page email verified verbatim 2026-09-17; steel/composite/vinyl/LP siding + windows/soffit/gutters; phone + free-estimate form intake with one-business-day response promise; MISSED_CALL_LEAD_CAPTURE high; WARM; VARIANT A; round-79 copy-test opener; Yahoo address, cheap-verify before send)
- REMOVED, out-of-corridor (not rolled): `drafts/round72-aztec-drilling-email.md` (Aztec Drilling Company, Steamboat Springs)
- REMOVED, out-of-corridor (not rolled): `drafts/round72-h2o-water-store-email.md` (H2O The Water Store, Durango)
- REMOVED, out-of-corridor (not rolled): `drafts/round75-mountainside-concrete-email.md` (Mountainside Concrete, Crested Butte)
- REMOVED, out-of-corridor (not rolled): `drafts/round75-e-and-h-ac-heating-email.md` (E&H AC & Heating, Glenwood Springs)
- REMOVED, out-of-corridor (not rolled): `drafts/round76-sweetwater-email.md` (Sweetwater LLC, Durango)

## Round-85 cascade notes
- Round-85 F2s written 2026-09-18 ~15:00 MDT for the round-50 cohort (initials 2026-09-13, F1s SENT 2026-09-17; no replies, no bounces, no declines on any of the 6 as of 2026-09-18).
- Round-102 geography scrub (2026-09-20): Preferred Garage Doors F2 (Northglenn) and Shaw Solar F2 (Durango) parked; Sunwise Solar cold removed; the corridor cold FIFO (winch-willow, telluride-spa, ws-junk-removal) keeps FIFO order; backfilled with round-17/18 corridor cold, oldest round first.
- Cap stays exactly 10: 4 F2 + 6 cold. If any F2 slot dies, pull from the rolled list in order.
- Zero sends this run: 2026-09-18 UTC cap already consumed 10/10 by round 79; 2026-09-19 UTC queue (8 approved sends) fires 2026-09-18 18:00 MDT.

## Geography scrub 2026-09-20 round 102
Round-102 queue-scrub worker, 2026-09-20. Corridor-only rule applied.
- Before: 10 slots (6 F2 + 4 cold). After: 10 slots (4 F2 + 6 cold).
- Parked: Preferred Garage Doors F2 (Northglenn), Shaw Solar F2 (Durango); initial sends 2026-09-13.
- Removed cold: Sunwise Solar (Steamboat Springs).
- Backfilled slots 8-10 with corridor FIFO cold, oldest round first: Kooler Garage Doors (GJ, round 17), Chrome Mosquito & Pest Control (Fruita, round 18), Pest Away Spraying (Delta, round 18). All three verified on disk with To: lines; contact-route verification per recorded site-published/own-site notes; never sent; never re-verified.
- Kept: High Noon Solar F2, Renwick Tiles F2, Sunsense Solar F2, Top Notch Hardwood Flooring F2, Winch & Willow cold (VARIANT A), Telluride Spa Care cold (VARIANT B), Western Slope Junk Removal cold (VARIANT B).
- Rolled-to-09-25 section: corridor drafts roll forward (all-metals, fireplace-company, jbs-asphalt, clemmer, family-time, rimrock, swiss-pro, siding-guy); Aztec Drilling, H2O Water Store, Mountainside Concrete, E&H AC & Heating, Sweetwater removed (out-of-corridor). The 09-25 and 09-26 roll sections are updated to match.
- Voice note: the three backfill drafts (rounds 17-18) predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
