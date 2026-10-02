# FB Pass 149 curation notes (2026-09-29 ~05:28 MDT)

## Inputs
- Discovery: fb149-discover.py, 533 candidates, 54 trade-keyword hits. All 20 group surfaces healthy. Page timelines 0 posts (persistent since pass 115).
- Builder pre-filter (build-fb-job.py 149): 533 -> 412 fresh (blocked: ledger-engaged 51, engaged-name 67, engaged-post-id 3; 2295 ledger post IDs consulted).
- Provisional: 67 likes (usual misfire mix), eyeballed and NOT used as-is (pass-129 lesson).

## Live candidates investigated
1. SDMS Integral Services LLC fall tree-trimming promo (Montrose, post 3500230493483927, created 2026-09-26). Author verified via post read: business Page 61561043408693, genuine local promo. LEDGER: exact post URL already has ACTION_INTENT_DURABLE from fb-20260927-132904 (pass-143 curation also noted "SDMS tree EXECUTED 09-27"). DROP - already engaged, same post.
2. Katelyn Miears "I'M BACK" stylist promo (GJ Message Board, post 2298929650871214). Author verified via post read: personal profile 100032891524042. Same author as the pass-146 "$20-off-color" drop. Body rule: no likes/comments on personal profiles of non-friends. DROP - personal profile (pass-146 precedent).
3. Roofing B co-op artists Applefest post (permalink/4996101407270028): same-URL like intent recorded pass-143 (ImpressionZ Art & Gift Gallery Applefest pieces). DROP - already engaged.
4. Bodan's Detailing Tahoe interior detail (GJ community, 970-210-77xx): comment intent recorded pass-143. DROP - recency.
5. Fruita pressure-washing startup new post: like intent pass-144 (2026-09-29T03:32). DROP - recency.
6. Doughbra "AIRSHOW + APPLEFEST WEEKEND preorder Oct 4" (new post, home feed): same business like EXECUTED pass-144. DROP - 7-day same-business window.
7. GJ hairstylist "I'M BACK" covered in #2.

## Drops (standing)
- AG Property Services 5x (do-not-retry honored), Bullseye Texture (blocked), WCO Chimney pellet stove 2x (blocked business)
- ProFinish "A GREAT FINISH STARTS WITH EXPERIENCE" 4x (engaged 2026-09-20 + comment quarantine)
- Handyman spam "Anyone needing handyman assistance" 3x (EXECUTED 09-24 AND 09-27)
- Real estate 8x (Paonia, Crawford, Delta, Hwy 92, 805 25 Road), missing-pet Betty (resolved/ongoing), CJ-7 for-sale
- Bank/lender "Tired of strict bank rules" 3x, CLOGZILLA (719 Springs, out-of-corridor)
- Durango/Cortez solar, Durango junk removal (505-NM), Durango Vista/Dark Side events (out-of-corridor)
- Glenwood aeration promo (Glenwood Springs out-of-corridor), CO Desi saree/lehenga 3x (out-of-corridor)
- Sunny Thai 3x (EXECUTED pass-144), New Maker (FAILED 09-27), Korean Corn Dogs (recency), El Rey (EXECUTED 09-27), Golden Wings (FAILED 09-27)
- Blessed Harvest 2x (EXECUTED 09-27), Whitewater farm stand 2x (EXECUTED 09-23), Montrose sourdough 2x (EXECUTED 09-23), Rise and Shine Bakes (EXECUTED 09-28), Poor Man's Acres layers (EXECUTED pass-143), Palisade Brewing trivia (EXECUTED pass-143), Pawcasso's/Roice-Hurst fundraiser (EXECUTED pass-143), AF Maintenance (EXECUTED pass-146 ~4h), Forget Me Not $20/hr (engaged pass-140), Morehouse (stale)
- No-name/fail-closed: picket fence 970 numbers, carpet-Matt, haul-it-all 970-901-7956, "my friend Tony" tree, Emily bakery backstory, "Schedule your maintenance" (no name), BOGO 970-210-7781, pool-closing 2x, "Call us today for a free quote", syrup business (no name/locality), "We are working hard ... Applefest" (no name), syrup story, bare-link "Fun event 10/03", bando-the-barber bare link, "Message me about them"
- Church (Bethel Assembly), fundraisers (Fall Fund Drive, FFA alumni Applefest), vendor solicitations (Dry Creek Fall Festival Centennial, Applefest vendor ask), ISO/rec-asks (house cleaner, handmade crafts, what-time, mattress haul, overalls for Applefest, photographer Glenwood), for-sale (refrigerators, Tyce Delk tickets, firewood, yard sale), events non-business (970 roundup x2, Lab Cedaredge events, Awaken retreat, plant swap, community story circle, library), not-promos (lilac question, greywater garden, concert for sale)
- Home feed global: Spreading Antlers sponsor thank-you (not a promo), VEX Robotics, WazirX (non-local)

## Result
0 eligible. Durable job fb149-curated-job.json (empty). No dispatch file written. No intent records. Pool thinness: passes 141-148 dispatched 24 actions in ~14h; everything genuine is ledger-engaged, terminal-blocked, or same-business-recent. Honest zero per no-scale-back: caps stay 75+20, retry next pass, never lower.
