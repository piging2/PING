# Email queue — 2026-09-23 UTC cap (10 sends)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.
Ladder timing anchors to the INITIAL send, never to a follow-up send.

## Slots 1-3. F2 follow-ups (corridor; ladder priority; initial sends 2026-09-13, F1 sent 2026-09-16; 09-23 = day 10 of the day 10-14 F2 window, window 2026-09-23 to 2026-09-27)
All 3 F2 drafts written 2026-09-18 round 85: NEW seasonal angles distinct from the F1, one question max, easy out, exact disclosure line first, no em dashes. F1s verified in sent mail 2026-09-16; no replies, no declines, no bounces on any of the 3 (checked 2026-09-18).
1. `drafts/round85-f2-colorado-hardwood-floors.md` → cohardwoodfloors@gmail.com (Colorado Hardwood Floors, Montrose; NEW angle: holiday-season floor jobs booked now; cheap-verify Gmail before send) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
2. `drafts/round85-f2-anasazi-solar.md` → Info@AnasaziSolar.com (Anasazi Solar, Montrose; NEW angle: storm-season battery/outage-protection inquiries) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
3. `drafts/round85-f2-atlasta-solar.md` → admin@atlastasolar.com (Atlasta Solar Center, GJ/Montrose; NEW angle: existing-customer fall service questions between installs) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)

On acceptance: flip pipeline/leads status to F2 SENT, log in follow-ups.md with result, update JSONL suppression_state to `ladder F2 2026-09-23` and next_eligible_action to "none (ladder complete; watch only)". Stop the ladder permanently on any reply. Do NOT mark F2 SENT until Gmail acceptance is verified in sent mail.

## Slot 4. F1-equivalent follow-up (corridor; ladder priority over cold; rerouted from dead FB DM route)
4. `drafts/nolan-direct-jack-of-all-junction-email.md` → jackofalljunction@gmail.com (Jack Of All Junction LLC, Grand Junction handyman; owner Aaron Chalfant CONFIRMED; F1-equivalent second touch after FB DM SENT 2026-09-16; Page Message button GONE 2026-09-20, DM route dead, fail-closed; rerouted to email per follow-up priority; cheap-verify Gmail before send) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result. Stop the ladder permanently on any reply. Do NOT mark F1 SENT until Gmail acceptance is verified in sent mail.

## Slots 5-10. Corridor cold backfills (round-102 geography scrub; send only after the follow-ups above, cap permitting; oldest round first)
All six drafts verified on disk 2026-09-20 with To: recipient lines. Contact-route verification per the recorded site-published notes; never sent; never re-verified.
5. `drafts/round14-keenans-plumbing-email.md` → office@keenansplumbing.com (Keenan's Plumbing & Heating, Montrose; family-owned and locally operated; site-published email; never sent) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
6. `drafts/round14-par-mechanical-email.md` → john@parmechanical.net (PAR Mechanical, Montrose; HVAC; site-published email; never sent) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
7. `drafts/round15-aps-alpine-email.md` → alpinepropertyservices95@gmail.com (APS Alpine Property Services, Montrose; property services and landscaping, family-owned since 1995; site-published email; never sent; Gmail address, cheap-verify before send) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
8. `drafts/round16-good-earth-email.md` → info@goodearthaspen.com (Good Earth Landscaping & Maintenance, Carbondale; landscaping and snow services, 25+ years; never sent) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
9. `drafts/round16-right-around-roofing-email.md` → Rightaroundroofing777@gmail.com (Right Around Roofing, Montrose; residential and commercial roofer, TAMKO-certified; site-published on contact page; never sent; Gmail address, cheap-verify before send) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)
10. `drafts/round17-advanced-window-cleaning-email.md` → advancedwindowgj@gmail.com (Advanced Window Cleaning, Grand Junction; window cleaning; site-published on own site; never sent; Gmail address, cheap-verify before send) — DONE 2026-09-23 (Gmail-accepted, verified in sent mail)

Recipient address is in the draft file's To: line. Pre-send: cheap-verify Gmail address; never send to a bounced address.

## PARKED_GEOGRAPHY (round-102 geography scrub, 2026-09-20)
Parked under the corridor-only rule. All were verified with no replies, no declines, no bounces as of 2026-09-18; parking is geographic only. Parked ladders are never re-queued without an explicit geography-rule change.
- Eagle Insulation (Durango) — F2 stage, `drafts/round85-f2-eagle-insulation.md`, initial send 2026-09-13
- Colorado Premier Garage Doors & Gate Systems (Denver) — F2 stage, `drafts/round85-f2-colorado-premier-garage-doors.md`, initial send 2026-09-13
- Durango Solar Works (Durango) — F2 stage, `drafts/round85-f2-durango-solar-works.md`, initial send 2026-09-13

## Removed cold drafts (out-of-corridor; not parked ladders, simply out of the queue)
- Straightline Painting (Dillon HQ) — cold, `drafts/round68-straightline-painting-email.md`
- Colorado Energy Systems (Glenwood Springs) — cold, `drafts/round68-colorado-energy-systems-email.md`
- 2180 Lighting & Design Studio (Durango) — cold, `drafts/round68-2180-lighting-design-studio-email.md`

## Rolled to 2026-09-24 (round 82 reconcile, updated round 102)
Corridor drafts roll FIFO-forward to 09-24. Out-of-corridor drafts are removed, not rolled.
- `drafts/round69-telluride-spa-care-email.md` → help@telluridespacare.com (Telluride Spa Care, Montrose serving Telluride/Mountain Village/Ridgway; spa/hot tub service + repair; own-site email verified 2026-09-16; MyPoolPortal customer portal CONFIRMED; only CHTT/CPO certified crew within 100 miles; VARIANT B first of the copy test; displaced from 09-23 slot 10 by the Jack Of All Junction F1-equivalent follow-up, round 97 reconcile 2026-09-20; PLACED as 09-24 cold slot 9 per FIFO vintage (round69 beats round70/72); Aztec Drilling (round72) displaced from 09-24 slot 10 to the front of the 09-25 rollover)
- `drafts/round75-the-fireplace-company-email.md` → office@thefpco.com (The Fireplace Company, Carbondale + Gunnison showroom; independent hearth shop, sales/install/repair/service gas/wood/electric fireplaces + wood stoves; own-site email verified 2026-09-17; fall heating-season tune-up angle; AUTOMATION medium; WARM; VARIANT A, round-75 copy-test pair with Mountainside Concrete [B]; pair partner Mountainside parked for geography, Fireplace keeps its VARIANT A annotation)
- REMOVED, out-of-corridor (not rolled): `drafts/round75-mountainside-concrete-email.md` (Mountainside Concrete, Crested Butte)
- REMOVED, out-of-corridor (not rolled): `drafts/round75-e-and-h-ac-heating-email.md` (E&H AC & Heating, Glenwood Springs)

## Geography scrub 2026-09-20 round 102
Round-102 queue-scrub worker, 2026-09-20. Corridor-only rule applied.
- Before: 10 slots (6 F2 + 1 F1-equivalent + 3 cold). After: 10 slots (3 F2 + 1 F1-equivalent + 6 cold backfills).
- Parked: Eagle Insulation F2, Colorado Premier Garage Doors F2, Durango Solar Works F2 (initial sends 2026-09-13).
- Removed cold: Straightline Painting (Dillon), Colorado Energy Systems (Glenwood Springs), 2180 Lighting & Design Studio (Durango).
- Backfilled slots 5-10 with corridor FIFO cold, oldest round first: Keenan's Plumbing & Heating (Montrose, round 14), PAR Mechanical (Montrose, round 14), APS Alpine Property Services (Montrose, round 15), Good Earth Landscaping & Maintenance (Carbondale, round 16), Right Around Roofing (Montrose, round 16), Advanced Window Cleaning (GJ, round 17). All six verified on disk with To: lines; contact-route verification per recorded site-published notes; never sent; never re-verified.
- Kept: Colorado Hardwood Floors F2, Anasazi Solar F2, Atlasta Solar Center F2, Jack Of All Junction F1-equivalent.
- Rolled-to-09-24 section: Telluride Spa Care and The Fireplace Company roll forward; Mountainside Concrete and E&H AC & Heating removed (out-of-corridor).
- Voice note: the six backfill drafts (rounds 14-17) predate the 2026-09-20 AI-identity / sentence-per-line / sign-off rules. They must be re-voiced to current standards before the firing run sends them.
- No queue exceeds 10 sends. No draft is allocated twice. No STRUCK draft re-queued.
