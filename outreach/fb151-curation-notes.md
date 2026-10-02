# FB Pass 151 curation notes (2026-09-29 ~09:31 MDT)

## Inputs
- Discovery: fb151-discover.py, 532 candidates, 52 trade-keyword hits. All 20 group surfaces healthy. Page timelines 0 posts (persistent since pass 115).
- Builder pre-filter (build-fb-job.py 151, TARGET_LIKES=75): 532 -> 414 fresh (blocked: ledger-engaged 44, engaged-name 73, engaged-post-id 1; 2412 ledger post IDs consulted).
- Provisional: 66 likes (usual misfire mix), eyeballed and NOT used as-is (pass-129 lesson).
- Promo-signal sweep of fresh pool (corridor groups only): ~60 promo-signal candidates reviewed via text scan + author resolution via `facebook-cli post read --url` + terminal-aware ledger checks + web locality verification.

## Live candidates investigated
1. Cattlemen's Bar & Grill Taco Tuesday 5x (GJ Message Board x2, Fruita, GJ Events x2). Full-text promos (all-you-can-eat taco bar, Navajo Tacos, Smothered Burrito, house margarita special) authored by business Page "Cattlemens Bar & Grill" (owner_id 100063563440884). Short "Happy Taco Tuesday GJ!!!" posts are personal profile (Eliher Ramírez, 100000013441307) — dropped. Locality VERIFIED via web: 1369 12 1/2 Rd, Loma, CO 81524 (Loma is corridor-core), phone (970) 858-7265, cattlemensbarandgrill.com. Ledger: zero prior records. KEEP: 1 like + 1 comment (3 full-text near-dups collapsed to GJ Message Board post 2299444934153019).
2. Sassy Creative first Patio Pop Up at The Apple Shed, Applefest weekend (Roofing B, post 4996905057189663). Author IS business Page "Sassy Creative". Locality: The Apple Shed, Cedaredge (Delta County); eligible per pass-143 Apple Shed precedent (co-op artists Applefest engaged). Ledger: zero prior records. KEEP: 1 like + 1 comment.
3. Daddy's Homemade Syrup brand-story post (Roofing A, post 28387665284189955). Author is business Page, but post is brand story (not a promo/showcase) and locality unverifiable. DROP - fail-closed.
4. Automotive technology Denver 2x (CO BizNet). Page name is literally "Automotive technology Denver" — out-of-corridor (Denver deprioritized) + near-dup pair. DROP.
5. Hallelujah Apparel uniforms (Roofing A). Author personal profile (Luciana Tavares). DROP - body rule.
6. Fat Pig Society harvest feast (Roofing A). Author personal profile (Iginia Boccalandro). DROP - body rule.
7. Grand Opening + Halloween Party, 347 Massachusetts Ave (CO BizNet). Author personal profile (Rosemary Baker). DROP - body rule.
8. The Lab/Cedaredge events roundup (Roofing B). Author business Page "The B-Sisters Project" but post promotes other businesses' events; locality unverifiable. DROP - fail-closed.
9. Doughbra 4x (home feed + Palisade + WesternCO) — EXECUTED pass-144. DROP - 7-day same-business window.
10. Sunny Thai food truck 2x (Montrose, Delta) — EXECUTED pass-144. DROP - recency.
11. Rise and Shine Bakes pumpkin sourdough preorders (Montrose) — EXECUTED 09-28. DROP - recency.
12. Montrose sourdough farm stand 2x — EXECUTED 09-23. DROP - recency.
13. Blessed Harvest preorder posts 2x (Orchard Mesa) — EXECUTED 09-27. DROP - recency.
14. Whitewater farm stand 2x (Orchard Mesa) — EXECUTED 09-23. DROP - recency.
15. North Fork Flowers homecoming sale (Delta) — FAILED 09-27 terminal. DROP - terminal.
16. El Rey Special of the Day (Palisade) — EXECUTED 09-27. DROP - recency.
17. Korean Corn Dogs schedule (Palisade Msg) — recency pass-147. DROP.
18. AF Maintenance — EXECUTED pass-146. DROP - recency.
19. Katelyn Miears "I'M BACK" (GJ Message Board) — personal profile. DROP - body rule.
20. Coyote Rolloff dumpster rental (Orchard Mesa) — EXECUTED pass-136. DROP - 7-day window.

## Drops (standing)
- AG Property Services 4x, ProFinish "A GREAT FINISH STARTS WITH EXPERIENCE" 4x, real estate (Crawford $2.995M, Ridgway homes/lots, WesternCO $100k improvement 805 25 Road, Peyton new homes), bank/lender "Tired of strict bank rules" 3x, CLOGZILLA, Big Bear Junk Removal, handyman spam 2x (no-name), "Good morning truck & trailer" junk pickup (no-name), fireplace/pellet-stove service 4x (out-of-corridor groups), Durango solar/junk (out-of-corridor), CO Desi saree/lehanga/navratri 3x (out-of-corridor), Glenwood (out-of-corridor).
- Missing-pet Betty (Palisade), owner-found dog update (Fruita), for-sale (Tyce Delk tickets, refrigerators, yard sale), moving-sale.
- No-name/fail-closed: BOGO 970-210-7781, pool-closing 2x, "Schedule your maintenance", picket fence/paver patio 970 numbers, yard-sale pickup service (Living In GJ), overalls ask 2x, handmade-crafts ask, lilac question, "Hi neighbors extra hands" (individual, not a business), childcare interest check.
- Non-business: FFA alumni Applefest (fundraiser), KAFM Fall Fund Drive (fundraiser), yoga classes, Tuesday-plans roundup, Trent Hughes thank-you, Fruita Fall Festival parade thank-you, plant swap, Dry Creek Fall Festival vendor call (Centennial, out-of-corridor), Denver weather page post.

## Verdict
2 likes + 2 comments curated (honest below-cap count per pass-129 lesson; caps stay 75+20, no-scale-back). Durable job: fb151-curated-job.json (bare list). Comments are on business-Page posts only, under 20 words, no selling, no PING mention, no links.
