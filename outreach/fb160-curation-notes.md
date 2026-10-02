# FB Pass 160 curation notes (2026-09-30, discovery 03:27 MDT)

Discovery: fb160-discover.py (copied from fb159; HARDENED filename bug: fb159 script hardcoded fb158-candidates.json output, so the first run overwrote fb158-candidates.json with fresh 09:26 data; fixed to fb160-candidates.json and re-ran). 540 candidates, 40 trade-keyword hits. All 20 group surfaces healthy; 4 Page timelines zero-post (persistent since pass 115).
Builder pre-filter (build-fb-job.py 160, TARGET_LIKES=75): 540 -> 422 fresh (blocked: ledger-engaged 40, engaged-name 75, engaged-post-id 3; ledger 2437 post IDs). Provisional: 62 likes, eyeballed, NOT used as-is (pass-129 lesson).
Manual curation (13 facebook-cli post-read author resolutions; ledger checks used PREFIXED post: IDs per pass-156 lesson; web locality verification where needed):
KEEP (1 like + 1 comment):
- LIKE Profinish Drywall & Paint "A GREAT FINISH STARTS WITH EXPERIENCE" (Montrose 3502763023230674; Page 61577181835253; locality VERIFIED: CDOS Profinish Drywall & Paint LLC, 21512 Fruitgrowers Rd, Austin CO 81410, formed 2026-06-17; near-dup collapsed to Montrose post from Ridgway cross-post 28634719466167962)
- COMMENT same post: "Thirty years of drywall and paint means your mud work makes the paint look easy. Rare combo."
DROPS:
- Junk Rippers "Another job done" (Page 61593365828600; locality unverified, pass-157/158/159 precedent, fail-closed)
- Homegrown Hauling "Free quotes, we'll haul it all" (Page 61579344032287; locality unverified, pass-159 precedent, fail-closed)
- Randy Groden "paint someday" (personal profile; art-class promo, not business Page promo)
- Queen of Clean-Up intro (Jennifer Thompson personal profile; locality unverified, pass-159 precedent)
- Amber Lucero Christmas mini portraits (personal profile; locality unverified, pass-157 precedent)
- Bodan's Detailing BOGO %50 off (Page 61555437704291; pass-143 business recency, window)
- Open Ledger Bookkeeping "September is almost in the books" (Page 61589253550205; locality unverifiable via web search, fail-closed)
- Time to Move LLC "like our page for your moving needs" (Page 61583015754642; unvettably thin, pass-158 precedent)
- Mary Beth Flemming dance workshop (personal profile; event, thin, pass-158 precedent)
- DG Autoworks PDR "NOW YOU SEE IT" (Page 61588328076556; Henderson CO / Denver metro, web-verified, out-of-corridor, pass-156 precedent)
- Cassi RossGeske / Doughbra's sourdough (engaged prior)
- moon farm October events (Richard Kinney personal profile, non-friend; pass-157 precedent)
- Colorado 4 Lot Deal / Last Frontier Lodge / cozy-home cross-posts / Parade of Homes (real-estate class)
- missing-pet Betty reward (lost/found), Durango ISO threads (HVAC recommendations, person-looking), political Palisade Msg, Boolesque Halloween (event, thin), road construction near-dups, GJ Air Show ticket resale, Farm Stand Friday/Whitewater/Blessed Harvest (engaged, window), El Rey (ledger ENGAGED), Cowboys & Aliens (pass-154), Chef Uma (pass-154), Grub:30 (FAILED 09-27 terminal), Sunny Thai/Aila Thai (near-dups/windows), FAM .5K (pass-157), Southwest Tree (pass-158), Rough Idle scary-car (pass-153), ProFinish cross-post collapsed, lilac question (non-promo), Glenwood aeration (out-of-corridor), Durango crafty/furniture/hair (out-of-corridor), CO Desi DSCR/vendor spotlight (out-of-corridor/B2B spam), Roofing A photo booth (B2B spam, thin), Roofing B softball (thin), volunteering event (fundraiser, thin), Swing Bays Wake Forest NC (out-of-corridor), bank rules (spam), bookkeeping cross-posts (Crystal Day personal profile, locality unverified), pink Saturday (thin cause post).
Page-name rule honored: distinct descriptors per action within job (like vs comment on same post).
