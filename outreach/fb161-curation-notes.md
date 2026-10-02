# FB Pass-161 curation notes (2026-09-30, 05:27 MDT)

Probe: fb-degraded-probe.py exit 0 ("not_needed") — stefi preferred path green.
Authority: AUTHORITY-ALLOW surface=facebook.
Discovery: fb161-discover.py (cloned from fb160; grep-verified, only 2 pass-number literals): 540 candidates, 41 trade-keyword hits. All 20 group surfaces healthy; 4 Page timelines zero-post (persistent since pass 115).
Builder pre-filter (build-fb-job.py 161, TARGET_LIKES=75): 540 -> 419 fresh (blocked: ledger-engaged 41, engaged-name 77, engaged-post-id 3; ledger consulted: 2438 engaged post IDs). Provisional: 60 likes; comment-vet: 25 candidates. Provisional eyeballed and NOT used as-is (pass-129 lesson).

## Provisional review (all 60 dropped)
Author resolution via facebook-cli post read + terminal-aware ledger checks (PREFIXED post: IDs, pass-156 lesson):

- Western Colorado Chimney gas-fireplace promo x2 (Ridgway 28642060438767198, Redlands 1530841915727372; Page owner_id 61565264274777): COMMENTED pass 52 — never-re-engage. Drop.
- Paint Wizards x2 (Orchard Mesa 4615389658783888, WesternCO Msg 28673719638933571; Taylor Helms, personal-profile ID 100002227800292, friends-only 403 precedent): personal profile. Drop.
- AG Property Services (Orchard Mesa 4613081269014727; Abraham Gutierrez, classified personal-profile pass 1): handled pass 1, never-re-engage. Drop.
- ProFinish Drywall & Paint (Ridgway 28634719466167962): same post engaged pass-160 (like+comment, EXECUTION ~2h prior); near-dup collapsed. Drop.
- Check-engine car Halloween promo (GJ community 1664762378773292; Jacob Land, personal-profile ID 100087768015631): personal profile; auto-trade precedent. Drop.
- DG Autoworks PDR Toyota (Roofing A 28396669419956208; Page 61588328076556): Denver metro, out-of-corridor (pass-160 precedent). Drop.
- Real estate class: Colorado 4-lot Crestone, Last Frontier Lodge x2, Delta home spam x5 cross-posts, 805 25 Road, Paonia/Crawford/Hwy92 listings x4, Parade of Homes x2, Coffey Rd open house. Drop.
- Queen of Clean-Up, Homegrown Hauling, Junk Rippers (all locality unverified, 720 numbers): fail-closed, pass-160 precedent. Drop.
- Randy Groden paint class (personal profile), Open Ledger Bookkeeping (locality unverifiable): fail-closed. Drop.
- Aila Thai Kitchen x2 (pass-131 window), Grub:30 x2 (FAILED 09-27 terminal), Blessed Harvest (EXECUTED 09-27 window), Whitewater farm stand (EXECUTED 09-23 window), Forget Me Not $20/hr (engaged pass-140), New Maker (FAILED 09-27 terminal), El Rey tamale special (ledger ENGAGED). Drop.
- Missing pet (Betty, Palisade), Air Show resale, wall-mount ISO, political (Palisade Msg "kill our way of life"), road construction x2 (civic), Boolesque Halloween x2 (event), dance class (thin), wellness dance workshop (thin), "Schedule change" softball, lilac question, Glenwood poodle-sitting ISO, Durango group 5x (out-of-corridor: esthetics-bed ISO, HVAC ISO, car detail, craft, Legacy Furniture, fresh-hair salon), CO Desi DSCR lender spam, Wake Forest NC, thin/no-name (moving "call us", "Give us a call", bando-the-barber bare link, volunteering Salida, pink-sale no-name). Drop.

## Fresh-pool promo-signal sweep (21 trade-hits not in provisional + 29 non-trade promo-signal leftovers)
Resolved via post read + history + web verification:

- United Property Maintenance sprinkler winterization (CO BizNet 4089373624531408; Page 100063721652871): Thornton CO 80260, 720-924-1010 (web-verified, upmdenver.com). Denver metro, out-of-corridor. Drop.
- B&S Express Sourdough Bakery backstory (Orchard Mesa 4612916705697850): ledger EXECUTED 2026-09-28 03:50 UTC on this exact post. Drop.
- PRUF Mother Clucker (Montrose 3503752186465091): engaged pass-152 (guard SKIPPED_REENGAGEMENT 2026-09-30T01:31). Drop.
- Joshua Bowsher hauling (Orchard Mesa 4611221965867324): engaged pass-151. Drop.
- Grand Junction Movers shoutout (WesternCO Msg 28674018818903653): engaged earlier pass. Drop.
- Elite Pool Professionals pool-close (Orchard Mesa 4612636422392545): post:4612636422392545 in ledger, engaged pass-152. Drop.
- All Floors Pueblo renter-trash (CO BizNet 4089269631208474): Pueblo, out-of-corridor, engaged pass 47. Drop.
- Aeration update (Glenwood 4484949625126451): Anna Mae Tywin Kevin, personal-profile ID. Drop.
- Sourdough preorder + farm stand 3101 Applewood (Palisade/home; Cassi RossGeske, personal-profile ID 100000086800463): personal profile. Drop.
- Corsage/homecoming florist (Delta 1814741826617522): post read 404 (unresolvable). Drop.
- Love Yours Salon Montrose (salon, "message me" personal): not a trade class. Drop.
- Remainder: customer-seeking (backyard upgrades, house cleaner), third-party recommendation (tree trimming), job ads (Durango Holiday Inn, Stoked Sports Bar), B2B advice (CO BizNet missed-calls), civic/political, events, for-sale/resale, yard sales, lost pet, stale Doughbra 9/24 preorder.

## Final
0 actions eligible. Durable job: fb161-curated-job.json (empty bare list). No dispatch file written (nothing eligible); run_pass.sh NOT invoked; intent ledger untouched (no intents written). Outcome recorded: --record-outcome ok.
Stagger: no dispatch this pass, so no IG overlap risk (FB worker never launched).
Pool thinness: passes 151-160 dispatched 20 actions in ~26h against the same corridor groups; everything genuine is ledger-engaged, terminal-blocked, same-business-recent, personal-profile, or out-of-corridor. Honest zero is the correct no-scale-back outcome — caps stay 75+20, retry next pass, never lower.
never_reengage.py standalone filter path still stale (file does not exist); builder pre-filter + manual curation + at-dispatch guard remain the live mechanism.
