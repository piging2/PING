# FB Pass 150 curation notes (2026-09-29 ~07:27 MDT)

## Inputs
- Discovery: fb150-discover.py, 533 candidates, 53 trade-keyword hits. All 20 group surfaces healthy. Page timelines 0 posts (persistent since pass 115).
- Builder pre-filter (build-fb-job.py 150): 533 -> 412 fresh (blocked: ledger-engaged 49, engaged-name 70, engaged-post-id 2; 2412 ledger post IDs consulted).
- Provisional: 67 likes (usual misfire mix), eyeballed and NOT used as-is (pass-129 lesson).
- Promo-signal sweep of fresh pool (not in provisional): 54 unique candidates reviewed.

## Live candidates investigated
1. AA Elite Flooring LLC hardwood/epoxy promo (Ridgway group, post 28627418800231362, 970-417-6770 / aaeliteflooringllc@gmail.com). No city or address stated; only geographic signal is the Ridgway group. Ledger/history: zero prior mentions. DROP - locality unverifiable + out-of-corridor group (Bullseye precedent, fail-closed).
2. Aeration Oct 2-4 promo (Glenwood group, post 4484949625126451). No business name. DROP - out-of-corridor (Glenwood, pass-148 precedent) + no-name fail-closed.
3. "CHEAPEST GAS IN TOWN" post (Glenwood group, post 4484331045188309). No business name. DROP - out-of-corridor + no-name fail-closed.
4. Stack & Company SEO promo (CO BizNet, post 4088581367943967). Marketing agency; no city stated. DROP - locality unverifiable, fail-closed.
5. Mesa View Venue 2026 rate reduction (WesternCO, post 28656491543989714). Wedding venue; legitimate local business but no locality confirmation and event-venue class outside the standing engagement tiers; recent precedent drops event solicitations. DROP - fail-closed.
6. Palisade Brewing Trivia Mondays (Palisade Msg, post 2882032785499189) — same business EXECUTED pass-143. DROP - 7-day same-business window.
7. El Rey Special of the Day (Palisade, post 783770044831157) — EXECUTED 09-27. DROP - recency.
8. Doughbra preorder/stand-open posts 3x (home feed + Palisade + WesternCO) — EXECUTED pass-144. DROP - recency.
9. Sunny Thai food truck 2x (Ridgway, Delta) — EXECUTED pass-144. DROP - recency.
10. Rise and Shine Bakes preorders (Montrose) — EXECUTED 09-28. DROP - recency.
11. Montrose sourdough farm stand 2x — EXECUTED 09-23. DROP - recency.
12. Whitewater farm stand Oct 2 (Orchard Mesa) — EXECUTED 09-23. DROP - recency.
13. Blessed Harvest preorder-only announcement (Orchard Mesa) — EXECUTED 09-27. DROP - recency.
14. Grub:30 Pumpkins at Covered Bridge Ranch (Montrose) — FAILED 09-27 terminal block. DROP - terminal.
15. North Fork Flowers homecoming sale (Delta) — FAILED 09-27 terminal block. DROP - terminal.
16. Golden Wings grilled cheese special (Delta) — FAILED 09-27 terminal block. DROP - terminal.
17. New Maker creations (Palisade) — FAILED 09-27 terminal block. DROP - terminal.
18. Aila Thai Kitchen new noodle dish (Montrose) — like+comment pass-131 (~2d ago). DROP - recency.
19. Poor Man's Acres layers (Roofing B) — EXECUTED pass-143. DROP - recency.
20. Korean Corn Dogs schedule (Palisade Msg) — recency (pass-147). DROP.
21. AF Maintenance Thursday opening (GJ community) — EXECUTED pass-146 (~6h). DROP - recency.
22. Bodan's Detailing Tahoe detail (GJ community) — comment intent pass-143. DROP - recency.
23. Coyote Rolloff dumpster rental (Orchard Mesa) — EXECUTED like+comment pass-136. DROP - 7-day same-business window.
24. Co-op artists Applefest (Roofing B) — like intent pass-143 same URL. DROP - already engaged.
25. Katelyn Miears "I'M BACK" stylist promo (GJ Message Board) — author verified personal profile 100032891524042. DROP - body rule: no likes/comments on personal profiles of non-friends.
26. Mom Car Refresh interest check (GJ Message Board) — author verified personal profile Tessa Dinkel, interest-check not a promo. DROP - personal profile + not a promo.
27. GVCT A Christmas Carol (Fruita + Living In GJ) — author verified personal profile Todd Ernest Braley. DROP - personal profile.
28. Knightly Cleaning Co (CO BizNet) — author verified personal profile Kristen Knight, "serve all of Colorado", locality unverifiable. DROP - personal profile (pass-146 precedent).

## Drops (standing)
- AG Property Services 5x (do-not-retry honored), Bullseye Texture (blocked), handyman spam 3x (no-name)
- ProFinish "A GREAT FINISH STARTS WITH EXPERIENCE" 4x (engaged 2026-09-20 + comment quarantine)
- Real estate 7x (Crawford $2.995M, Ridgway 1-acre, WesternCO $1.475M 805 25 Road, Ridgway building lot, Fruita FOREVER-home lot, Mesa Community Center vendor spot ask, Dry Creek Fall Festival Centennial vendor call)
- Bank/lender "Tired of strict bank rules" 3x, CLOGZILLA (719 Springs, out-of-corridor)
- Durango: Chenard Solar Cortez, rock-bottom junk removal (505 NM), Sunflower Theatre, neurodivergent dance night (all out-of-corridor); CO Desi saree/lehanga/navratri 3x (out-of-corridor); Glenwood aeration + gas-station posts (out-of-corridor)
- Missing-pet Betty (Palisade), lost-dogs owner-found update (Fruita), for-sale (CJ-7, refrigerators, Tyce Delk tickets, yard sale)
- No-name/fail-closed: picket fence + paver patio 970 numbers, haul-it-all 970-901-7956, "Schedule your maintenance", BOGO 970-210-7781, pool-closing 2x, "Call us today for a free quote!", "Free estimate" (Ridgway), bando-the-barber bare link, "Message me about them" 2x, "Asian Haircut" rec-ask (not a promo), mattress-haul ask, handmade-crafts ask, overalls ask, lilac question, Blue Angels question, yard-sale thread, pickup-service dad-and-son (fail-closed)
- Church (Bethel Assembly event), fundraisers (KAFM Fall Fund Drive, FFA alumni Applefest), vendor solicitations (trunk-or-treat), events non-business (Awaken Women's Retreat, bariatric support group, yoga classes, Tuesday-plans roundup, Fruita Fall Festival parade thank-you, 3D-print booth thank-you, Fruita shirt designs, Palisade community garden director, Trent Hughes thank-you)
- Non-promos: Denver weather page rainfall post, chicken/egg question

## Verdict
0 eligible after curation. Passes 141-149 dispatched 24 actions in ~16h against the same corridor groups; everything genuine is ledger-engaged, terminal-blocked, or same-business-recent. Honest zero is the correct no-scale-back outcome - caps stay 75+20, retry next pass, never lower.
