# FB Pass 142 curation notes (2026-09-28 ~17:31 MDT)

Probe: `fb-degraded-probe.py` exit 0 ("not_needed") — stefi preferred path green.
Discovery: 17:27 MDT via fb142-discover.py: 537 candidates, 53 trade-keyword hits. All 20 group surfaces healthy. Page timelines 0 posts (persistent since pass 115).
Builder pre-filter (build-fb-job.py 142, TARGET_LIKES=75): 537 -> 411 fresh (blocked: ledger-engaged 55, engaged-name 68, engaged-post-id 3; ledger consulted: 2281 engaged post IDs). Provisional: 75 likes, eyeballed and NOT used as-is (pass-129 lesson).

Manual curation over the provisional + fresh-pool sweep (trade-hit rest + promo-keyword scan + food/drink scan). Final: 0 eligible — honest zero (same as pass-139). Recency rule: 7-day same-business window; terminal-aware ledger checks (FAILED/UNKNOWN_EXECUTION block; NOT_ATTEMPTED stays eligible).

## Drops (provisional 0-74)

- CO BizNet 4x (sports court restoration w/ 720 number, HVAC clean-filters meme, Greenwood Village acupuncture, Rise N Grind podcast): out-of-corridor group + Denver numbers. Consistent with pass-140/141.
- Real estate 7x (off-grid retreat financing 2x, Crawford $2.995M ranch, Ridgway executive home, WCO Msg $1.475M GJ home, Paonia $359.9k, Paonia $399.9k, Ridgway building lot $97.5k MLS): real-estate listings, never eligible.
- AG Property Services 6x (Ridgway, Delta, Orchard Mesa, GJ community, GJ Events, Redlands): blocked business, do-not-retry honored.
- Pellet stove 2x (Ridgway, Redlands): Western Colorado Chimney blocked business. Builder WCO_CHIMNEY_IDS check did not catch (owner name not in candidate data); dropped per pass-140 standing note.
- Handyman/paint/drywall 3x (GJ Message Board, Fruita, Palisade Msg): SAME business engaged pass-141 ~2h ago (like, intent EXECUTED). Recency.
- ProFinish Drywall & Paint 2x (Montrose, Delta): EXECUTED 2026-09-23/24 (pass-141 check). Recency.
- Sunny Thai food truck 3x (Montrose, Ridgway, Delta): engaged 2026-09-21 17:32 MDT (like+comment, 7.0d). Recency.
- Montrose sourdough farm stand (16663 6400 rd): EXECUTED 2026-09-23 (pass-141 check). Recency.
- Doughbra's 5x (airshow/applefest 3x, stand-open 2x): recency (pass-140 consistent drops).
- Blessed Harvest 3x (preorder promos): recency (engaged within 7d per pass-139).
- Rise and Shine Bakes (fall baking): recency (pass-140 drop).
- New Maker (Palisade): recency (engaged pass-131).
- Korean corn dogs: recency (pass-140 drop).
- Pool-winterization 2x (Orchard Mesa, WesternCO Msg): recency (engaged pass-131).
- Mesa View Venue (WesternCO Msg): engaged pass-140 ~4h ago (like). Recency.
- Poor Man's Acres hens (Roofing B): engaged pass-140 ~4h ago (like). Recency.
- Kort's Deli (Roofing B "This week at Kort's Deli"): Korts Deli like EXECUTED pass-138 ~14h ago (intent a3e18a80, terminal EXECUTED). Recency.
- Surf To Turf (Palisade): like+comment EXECUTED pass fb-20260927-132904 ~1.4d ago (intents 06207979/1ec048a3, terminals EXECUTED). Recency.
- Get Your Grub On food truck (Montrose): like FAILED pass fb-20260927-193200 ~28h ago (terminal FAILED blocks). Recency/blocked.
- PRUF Pizza live music (Montrose): NEW post (3500148450158798) but owner_name "Beau Miller" = personal profile, not business Page (verified via `facebook-cli post read --url`). Ineligible: never engage personal profiles.
- Roice-Hurst Pawcasso fundraiser (GJ Events): engaged pass-141 ~2h ago (like-only nonprofit). Recency.
- Haul It 4 Less (Roofing A fall cleanups): engaged pass-140 ~4h ago. Recency. Orchard Mesa haul-it-all 970-901-7956: no business name, fail-closed.
- Palisade Community Garden director: recency (pass-141 drop).
- Witches Night Out: event (pass-141 drop).
- 720-Denver grading/excavation 2x (GJ Message Board, GJ community): out-of-area 720 numbers (pass-141 pattern).
- Durango 3x (junk removal w/ 505 NM numbers, Dark Side event, Vista Grande animal healers): out-of-corridor.
- CO Desi lehanga sets: out-of-corridor.
- Lost/found pets 2x (Betty reward, found dogs resolved): pets, never eligible.
- For-sale/ISO/asks 8x (CJ-7 for sale, mattress haul ask, irrigation connections ask, truck repair advice ask, handmade crafts ask, Blue Angels time ask, mural artist ISO, handyman recommendation ask): asks/personal, never eligible.
- Fundraisers/solicitations 3x (butter braids 2x, trunk-or-treat vendor call): solicitations (pass-141 pattern).
- Church 2x (Bethel Assembly of God 2x): church events (pass-140/141 drops).
- Dance workshop 2x (GJ Message Board, GJ community): workshop solicitation (pass-141 drop).
- Ambiguous one-liners, fail-closed 7x ("Message me about them" 2x, "Free estimate", Cedaredge greeting, Stone House venue, BOGO no-name, senior/veteran discounts): unverifiable identity.
- Personal posts 4x (side-jobs seekers 2x, pressure-washing startup ask, lilac advice, Orchard Mesa tree-trimming referral for "Tony"): personal profiles, not business Pages.
- Thought pieces 2x (relationships quote, ice-cream JOY marketer post).
- Non-business 3x (weather feed post, Glenwood housing ask, GJ trees greywater gardening).
- Carpet/Matt educational promo (Roofing A): no business name, fail-closed (unverifiable identity).
- Picket fence one-liner (Montrose): no business name, fail-closed.
- Emily B&S bakery backstory (Orchard Mesa): personal-profile backstory post, no verifiable business Page.
- Christmas shopping event (GJ Message Board + Fruita): community event, no verifiable business Page identity, fail-closed.
- Tuesday plans roundup (GJ community): event aggregator, not a business promo.
- Colorado Springs Back the Brave (Roofing A): out-of-corridor.

## Fresh-pool sweep (beyond provisional)
- 24 non-provisional trade-hits + 11 promo-keyword hits + food/drink keyword scan: all resolved above (recency, out-of-corridor, personal, fail-closed, or already-engaged).
- PRUF Pizza was the only genuinely new local-business promo (9d since last engagement, outside window) and failed the authorship check (personal profile author).

## Outcome
0 eligible actions. No comments drafted (0 comment targets). No subagent this pass (parent-only curation, pool small enough to eyeball directly).
