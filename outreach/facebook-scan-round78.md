# Facebook delta-scan #77 (2026-09-17, 11:15 - 17:16 MDT)

Read-only run. No DMs sent, no likes, no comments, no engagement actions. Facebook engagement is Pig-only and parked.

Window: 1789665381 (2026-09-17 11:16:21 MDT) -> 1789686964 (2026-09-17 17:16:00 MDT).
Query: `facebook-cli groups posts --group-id <id> --limit 25 --sort-by NEW_POSTS --min-timestamp 1789665381`, one page per group.

## Counts per group

| Group | Returned | In-window | Below-watermark leaks |
|---|---|---|---|
| Western Colorado Message Board & Classifieds | 6 | 6 | 0 |
| Buy & Sell in Grand Junction | 20 | 20 | 0 |
| Delta | 8 | 8 | 0 |
| Orchard Mesa | 6 | 6 | 0 |
| Fruita | 19 | 19 | 0 |
| Living In Grand Junction Colorado | 7 | 6 | 1 (Avalon dressing-rooms post 11:11 MDT) |
| Colorado Business Networking | 20 | 20 | 0 |
| Colorado Business Mingle | 2 | 2 | 0 |
| **Total** | **88** | **87** | **1** |

The 1 leak is API noise, logged as intel only, never double-counted.

## New prospects (2, both Denver-area, added to pipeline.md as NEW)

1. **CleanBoss LLC** (Denver metro) — post-construction / contractor cleanup: "Calling all contractors!!! Have a project that you need cleaned up? ... those new floors to shine bright like the stars?! ... we specialize in a wide range of services to fit the needs of almost every customer!" Residential + commercial cleaning. No phone/email published in post; contact path is the tagged Page.
   - Author: resolved via social.search post_url to personal profile **Emm Rixen** (author_id 61587082551685), posting on behalf of the CleanBoss LLC Page (61586905928688).
   - Post: https://facebook.com/groups/2803047646497352/permalink/4073729279429176/ (2026-09-17 16:33 MDT)
   - Franchise check: PASS (not a franchise). Independent Denver LLC, 6+ years on HomeGuide, 5.0 (3 reviews), 3 hires; HomeGuide reviews name "Emm and KT", matching the author. The New Zealand "Clean Boss" cleaning franchise is a different entity.
   - Added to pipeline.md under "Facebook — Denver-area groups (delta-scan #77, 2026-09-17)" as NEW. Dedup verified: no hits in facebook-dms.md, pipeline.md, leads.md.
   - Opportunity read: MISSED_CALL_LEAD_CAPTURE (crew-based cleaning company selling contractor cleanup; intake via Page DMs while crews are on job sites; confidence medium-low).
2. **Colorado Bin Squatch** (South Denver Metro; tagged location Highlands Ranch) — trash bin cleaning + sanitizing: "We clean nasty trash bins with professional hot water service. Veteran owned, serving South Denver Metro. Ready to get your bins Squatched? Visit ColoradoBinSquatch.com." Residential, commercial, HOA.
   - Author: resolved via social.search post_url to the business's own Page (handle ColoradoBinSquatch, 37 followers; bio: eco-friendly, odor elimination, "Serving Colorado").
   - Post: https://facebook.com/groups/2803047646497352/permalink/4073699116098859/ (2026-09-17 15:50 MDT)
   - Added to pipeline.md under "Facebook — Denver-area groups (delta-scan #77, 2026-09-17)" as NEW. Dedup verified: no hits in facebook-dms.md, pipeline.md, leads.md. Not a franchise.
   - Opportunity read: NEW_BUSINESS_SETUP + MISSED_CALL_LEAD_CAPTURE (new-ish brand, appointment-based bin routes; missed-call risk while running routes; confidence medium-low).

Both are Denver-area: deprioritized (intel only, never pursued), recorded per the established Denver-section pattern.

## Repeat sightings of tracked businesses (not re-added)

None in window.

## New-business radar hits

0. No "grand opening", "now open", or "just launched" trade-business signals. (The Explore Mesa County "officially launch our brand-new Grand Valley Weekend Roundup" post at WCMB 11:25 MDT is a community content platform, not a trade business.)

## Demand signals (intel only, not prospects)

- Fruita 17:07 MDT: buyer ask for hair-stylist recommendations (https://facebook.com/groups/3741333852807065/permalink/4469797613294015/) — not our segment; demand intel only.
- Orchard Mesa 16:31 MDT: 22-year-old Grand Junction entrepreneur seeking a commercial property as a central home base for four businesses he owns and operates (https://facebook.com/groups/486356801008208/permalink/1108962848747597/) — notable local-operator intel (multi-business owner consolidating operations); not a PING prospect, no pitch made.
- WCMB 15:34 / Fruita 15:34 MDT: George Hall cross-post seeking gig work (yard work, leaf removal, general cleaning) while finishing college — individual seeking gigs, not a business.

## Complaint signals

None actionable.

## Out-of-trade / skipped sightings (intel only)

- WCMB: Palisade $749k real-estate listing (6.5 acres, 3445 C 1/2 Road); Palisade $2.4M business-for-sale (35+ year orchard/food-manufacturing business, RE/MAX 4000 Laura Black); Nissan Xterra resale; new-member welcome post.
- Buy & Sell GJ (20 posts): all personal resale (spa chemicals, furniture, pet supplies, truck, baby clothes, clothes, tools, etc.); Nordic Ski Swap Oct 24 event promo.
- Delta: retail sale promo (20% off non-food merch); admin "read the post below" rule post.
- Orchard Mesa: Blessed Harvest farmstand return promo (cottage food); admin rule post.
- Fruita: party rentals promo 970-623-7080 (event rentals, not a home-service trade); FinnSheep for sale (Hotchkiss); doctor/ recommendations asks; ISO duck eggs; fridge ISO; El Tapitio dinner post; GJ Air Show veterans tickets post.
- LivingGJ: JunctionStrongArm arm-wrestling group recruitment; admin rule post.
- COBizNet: Dawa Solutions IT LLC Denver (17:16 MDT, structured cabling/CCTV/VoIP/IT infrastructure; B2B IT, out of home-service segment); Denver's Custom Print Shop (303-591-5869, also cross-posted to COBizMingle); travel agent (Ivone Acosta); bookkeeping promo; legal promo (Keri); health-insurance throwback; Women Partnering Fundraiser; Tolland photo post; "Grab today's guide" link; emoji-only posts.
- COBizMingle: Denver Custom Print Shop duplicate; 👀 emoji post.

## Unresolvable empty-caption posts (29, logged without guessing)

LivingGJ 3437494093106195 (13:36), 3437489199773351 (13:29), 3437419579780313 (11:48), 3437419389780332 (11:47); Delta 1803415657750139 (16:43), 1803406354417736 (16:22), 1803348967756808 (14:31), 1803341224424249 (14:18), 1803307814427590 (13:21), 1803273057764399 (12:22); OrchardMesa 1108982425412306 (17:12), 1108949675415581 (16:03), 1108885392088676 (14:01); Fruita 4469782409962202 (16:42, 2c/7r), 4469715043302272 (15:01), 4469669963306780 (13:53), 4469655979974845 (13:34), 4469651293308647 (13:28), 4469645909975852 (13:20); COBizNet 4073753292760108 (17:05), 4073731429428961 (16:36), 4073708256097945 (16:02), 4073705996098171 (15:59), 4073705859431518 (15:59), 4073697179432386 (15:47), 4073680492767388 (15:24), 4073670629435041 (15:09), 4073657449436359 (14:49); COBizMingle 28101909492813452 (14:56).

## Session health

- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors). social.search post_url author lookups working this run.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and parked).
- New watermark: 1789686964 (2026-09-17 17:16:00 MDT).
- Raw scratch: /tmp/scan77 (g_<gid>.json per group).
