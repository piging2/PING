# Facebook delta-scan round 81
Date: Fri 2026-09-18 ~02:16 - ~02:21 MDT (08:16 - 08:21 UTC 2026-09-18)
Watermark used: 1789708688 (Thu 2026-09-17 23:18 MDT)
New watermark: 1789713554 (Fri 2026-09-18 00:39 MDT)

## Coverage
Posts scanned: 5 in-window across 8 groups (0 below-watermark API leaks)
- Western Colorado Message Board & Classifieds (5456977881034408): 0
- Buy & Sell in Grand Junction (108728816001912): 1
- Delta (1504277980997243): 0
- Orchard Mesa (486356801008208): 0
- Fruita (3741333852807065): 0
- Living In Grand Junction Colorado (1082777608577867): 1
- Colorado Business Networking (2803047646497352): 3
- Colorado Business Mingle (5355730651191326): 0

Quiet overnight window: the six Western Colorado groups produced only 2 in-window posts.

## Result: one genuine home-service trade prospect

### New prospect (NOT added to pipeline.md; queued here for the engine to ingest)
1. **Gemini Construction & Excavating LLC**, Greeley, CO (Northern Colorado, tagged location)
   - Trade: decorative concrete + excavation (concrete work, custom foundations, retaining walls, hardscape, excavation). Concrete / site-prep trade.
   - Phone: 970-324-6927 (published verbatim in post).
   - Post quote: "Proudly serving Northern Colorado! Solid groundwork is essential for any long-lasting project. Planning an outdoor build? Call or text us today for a free estimate!"
   - Post: https://facebook.com/groups/2803047646497352/permalink/4074048112730626/ (Thu 2026-09-17 23:36 MDT)
   - Author: resolved via social.search post_url to Facebook Page "Gemini Construction & Excavating LLC" (author_id 100086606268068, ~122 followers). Business bio: "Concrete Construction specializing in decorative concrete and excavating services". Page-authored post, not a personal profile.
   - Notes: Northern Colorado is outside the primary Western Colorado geography (Denver-area/expansion group signal). Not a franchise. Not a grand-opening post: routine service announcement with phone CTA, classic missed-call/lead-capture angle territory.
   - Dedup note for engine: search leads.md / pipeline.md / facebook-dms.md for "Gemini Construction" before adding.

## DMs
No DMs sent (read-only run per task directive). No drafts parked this round (author is a business Page; Message-button route exists but outreach actions are out of scope for this scan).

## Radar hits
None. No "grand opening" / "now open" / "just launched" posts from genuine trade businesses in this window.

## Demand signals
None actionable. No buyer asks, no complaint threads in window.

## Observed but not pursued
- Harry Potter mugs sale post, Buy & Sell in Grand Junction (3414453282096099): consumer sale listing, not a business.
- Two #StarsEverywhere photography posts, Colorado Business Networking (4074098276058943, 4074060806062690): engagement-bait spam in a business group, not trade signals.
- Ray Mathis landscape photo carousel, Living In Grand Junction Colorado (3437902923065312): personal photography post, zero engagement, not a business.
- Note: `facebook-cli post read --url` is gated server-side (403 NO_ACCESS) for this session; author identification worked via social.search post_url for both resolvable posts.

## Session health
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors). social.search post_url author lookups working.
- 0 DMs sent, 0 attempted (read-only run).
- Raw scratch: /tmp/scan81 (g_<gid>.json per group).

## Round-81 engine dedup note
- Gemini Construction & Excavating LLC (Greeley/Northern CO): DUPLICATE. Already in pipeline.md (line 559, added 2026-09-11, status NEW, Fort Collins area) and facebook-dms.md (line 551, parked DM draft exists). This is a repeat post by the same business Page, not a new prospect. Not re-added; existing NEW row stands.
