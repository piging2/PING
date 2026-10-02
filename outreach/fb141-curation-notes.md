# FB Pass 141 curation notes (2026-09-28 ~15:31 MDT, caps 75+20)

Discovery: fb141-discover.py, 536 candidates, 54 trade-keyword hits. All 20 group surfaces healthy; page timelines 0 posts (persistent since pass 115).
Builder pre-filter (build-fb-job.py 141): 536 -> 410 fresh (blocked: ledger-engaged 56, engaged-name 67, engaged-post-id 3; ledger consulted: 2278 engaged post IDs). Provisional: 73 likes. never_reengage.py standalone still missing (stale path); live mechanism = builder pre-filter + this manual curation + at-dispatch guard.

## Final curated job: 3 likes + 1 comment (4 actions). Durable: fb141-curated-job.json; dispatch: /tmp/fb-job-20260928-213117.json.

Keeps:
1. Like: GJ Message Board handyman/paint/drywall offer (2298654774232035). Individual trades offer, genuine local. Near-dups collapsed (Fruita 2x, Palisade Msg 1x dropped).
2. Like + comment: Bookcliff Media (Montrose, 3502767229896920). owner_name "Bookcliff Media", Page ID 61592157620716, verified via post read. New locally-made engraved/NFC products promo. Ledger: 2026-09-20 like+comment intents exist but BOTH terminals NOT_ATTEMPTED (observed 2026-09-22) = proven non-execution, stays eligible. Comment (12 words): "Tap-to-review signs are genius. Frictionless reviews beat a stack of business cards."
3. Like-only: Roice-Hurst Humane Society fundraiser / Pawcasso's Print Shop (GJ Events, 4406924899622607). Local nonprofit -> like-only per standing rule.

## Drops (by class)
- Blocked businesses: AG Property Services 7x cross-posts (do-not-retry); Western Colorado Chimney pellet-stove 2x (Ridgway L13, Redlands L19) - owner verified via post read as owner_name "Western Colorado Chimney", Page ID 61565264274777, both dropped.
- Same-business recency (7d window, mechanically verified in intent ledger): Profinish Drywall & Paint (EXECUTED 2026-09-23 19:32 MDT + EXECUTED 2026-09-24 05:29 MDT); Blessed Harvest (engaged <7d, pass-138 log); Doughbra's Stand 3x incl. Applefest/Apple-spice preorder posts (engaged passes 129-131); Rise and Shine Bakes (pass-135 like+comment 2026-09-27 21:26); Korean corn dogs (pass-136 like+comment 2026-09-27 23:26); Palisade new Maker (pass-131); Palisade Community Garden director (pass-135 like-only 2026-09-27); pool-winterization business (pass-131); Montrose sourdough farm stand 16663 6400 rd (EXECUTED 2026-09-23 19:32 MDT); Sunny Thai food truck (like+comment 2026-09-21 17:32 MDT, 6.9d inside window); Mesa View Venue wedding promo (pass-140, 2h ago).
- Real estate: Ridgway $2.995M 42-acre listing, Ridgway executive home, Ridgway $97.5k building lot (MLS 838842).
- Lost/found pets: Betty missing (Palisade), two found dogs (Fruita).
- For-sale/ISO/asks: 84 CJ-7 for sale, 13-month laying hens, mattress/futon haul ask, irrigation blowout ISO, dryer repair ISO, GJ Message Board advice ask, excavation-partner ISO (Roofing A), Blue Angels airshow time question (Fruita), Whitewater farm stand (no business name in text, fail-closed).
- Fundraisers/solicitations: butter-braids student-trip fundraiser, GJ Events trunk-or-treat vendor solicitation, dance workshop bit.ly (no business name).
- Out-of-corridor groups: Durango 3x (junk removal 505/505 numbers, Dark Side event, Vista Grande), CO BizNet 2x, CO Desi clothing sale.
- National/viral: Robert Kiyosaki feed post (feed-author drop).
- Thought piece / one-liners / ambiguous: "Some relationships change as we grow", "Free estimate" (Ridgway), "The Stone House" venue one-liner, "Good morning Cederedge" (Roofing B), "Running a crazy good BOGO deal" (no business name, fail-closed), Bethel Assembly of God church events 2x (consistent with pass-140 drops), Tired-of-bank-rules lender ads 2x (real-estate marketing), 720-Denver excavation cross-posts 2x (out-of-area number), "That property project" 720-number excavation 2x.
- Near-dup collapses to one: handyman 5x, property-project 2x, AGPS 7x, pellet-stove 2x, bank-rules 2x, Sunny Thai 3x, THE STAND IS OPEN 2x, AIRSHOW+APPLEFEST 3x, upcoming-events 2x, Blessed Harvest preorders 2x, butter-braids 2x, Farm Stand Friday 2x, Grand Junction dance 2x, pool-closing 2x.

Honest below-cap count. No standards relaxed.
