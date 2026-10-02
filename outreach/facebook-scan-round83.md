# Facebook delta-scan round 83
Date: Fri 2026-09-18 ~08:15 - ~08:22 MDT (14:15 - 14:22 UTC 2026-09-18)
Watermark used: 1789730438 (Fri 2026-09-18 05:20 MDT)
New watermark: 1789740827 (Fri 2026-09-18 08:13 MDT)

## Coverage
Posts scanned: 37 in-window across 8 groups (0 below-watermark API leaks)
- Western Colorado Message Board & Classifieds (5456977881034408): 2
- Buy & Sell in Grand Junction (108728816001912): 12
- Delta (1504277980997243): 2
- Orchard Mesa (486356801008208): 1
- Fruita (3741333852807065): 6
- Living In Grand Junction Colorado (1082777608577867): 1
- Colorado Business Networking (2803047646497352): 9
- Colorado Business Mingle (5355730651191326): 4

Morning window, quiet: Buy & Sell GJ was all personal resale; Fruita had community/event posts; the two expansion groups produced only out-of-geo and professional-service promos.

## Result: no new genuine home-service trade prospects

No new trade prospects added to the pipeline. One NEW non-trade business signal recorded as observed-only (childcare rebrand). No radar hits.

## DMs
No DMs sent (read-only run per task directive). Nothing parked (no genuine trade prospect authored an in-window post; the one new business signal is a non-trade service posted by a recommender, not the business).

## Radar hits
None. No "grand opening" / "now open" / "just launched" posts from genuine trade businesses in this window. The "Blessed Harvest IS BACK" farmstand post is a seasonal cottage-food return, repeat sighting, not a trade business.

## Demand signals
None actionable. No buyer asks, no complaint threads in window.

## Observed but not pursued
- NEW non-trade signal: Little Sunflowers Preschool, formerly Creative Avenues Preschool and Learning Center ("New name, same amazing staff and mission"), posted by personal profile Autumn Reeves (autumn.mallett.7, author_id 1476181949), cross-posted in Living In Grand Junction (3438173913038213, 06:47 MDT) and Buy & Sell in Grand Junction (3414772292064198, 06:52 MDT). Rebrand announcement = business change signal, but childcare is non-trade and the post is a third-party recommendation, not the business itself. Recorded as observed-only, not added to pipeline. Dedup: not in pipeline.md, leads.md, or facebook-dms.md prior to this round.
- Unverified-location trade-adjacent signal: Organized Living Spaces (FB Page, author_id 61567891473827, 146 followers; bio: "Storage systems for closets, pantries, offices, laundry rooms, and garages"; handle GrandOrganizedLivingSpaces suggests Grand Junction). Empty-caption post in Colorado Business Networking (4074401949361909, 06:39 MDT). Home-organization is trade-adjacent, but the Page profile is server-side gated (403) and no location could be verified via web search. Recorded as unverified signal, not added as a prospect. facebook-cli profile info is 403-gated for this Page; social.search post_url lookup worked for the author.
- Repeat sightings: Felix Automotive Mobile Detailing (COBizMingle 28109757748695293, 06:40 MDT, 970-216-0342, posted by Vincent Carter vincent.carter.5011); previously classified "auto, out of trade". Blessed Harvest farmstand (Orchard Mesa 1109512148692667, 08:01 MDT, "WE'RE OPEN - BLESSED HARVEST IS BACK"); previously classified cottage food, out of trade.
- Out-of-geo business posts (expansion groups): Dumpster Dudez of South Denver (COBizNet 4074484766020294, "Many instances can deliver same day!", dumpster rental for contractors/homeowners, South Denver; trade but out of geography); Vecinos Mexican Grill and Cantina (COBizNet 4074414232694014, breakfast promo, 385 W 4th Ave Severance, (970) 688-4808; restaurant, out of Western CO); Highline Aesthetics Denver (COBizNet 4074379396030831, medspa, Denver; out of geo, non-trade).
- Professional/non-trade promos: TGIF health-insurance agent post (COBizNet 4074467072688730); South Denver Historical Museum feature (COBizNet 4074418362693601); Ernesto Kingpin Martinez, owner of Out the Box / Mom & Pops / DTFXpress / Planet T's apparel printing (COBizNet 4074435019358602, empty caption); CM Accounts Ltd tax/bookkeeping (COBizNet 4074391966029574, empty caption); Luther Benson residential real estate broker (COBizNet 4074420029360101, empty caption); TV campaign ad ("taking the fight to Jeff Hurd", Fruita 4470398053233971).
- Community/personal: Fruita community potluck (4470459536561156, today 6pm Mulberry Plaza), Kings bake sale last of 2026 (4470368743236902), Fruita yard sale 917 Squire Ct (4470384953235281); personal resale (RV hose, mowers, beanies, camping gear, antiques, stuffed animals, 3D pen, house listing $540k, dog crate, Palisade $949k real estate); empty-caption personal photo posts resolved: Gus Weber x2 (Delta 1803946384363733, 1803929464365425), Elizabeth Nunn (Fruita 4470463879894055), Susan Rawlins, retired (Fruita 4470410706566039), Valerie Nybo-Bennett (CBMingle 28110901678580900), Marcelino Espina (CBMingle 28110093591995042).
- Note: `facebook-cli post read --url` and `facebook-cli profile info` remain 403-gated server-side; author identification via social.search post_url worked for all in-window posts this round.

## Session health
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors). social.search post_url author lookups working (18/18 attempts resolved, including 2 repeats skipped).
- 0 DMs sent, 0 attempted (read-only run).
- Raw scratch: /tmp/scan83 (g_<gid>.json per group).

## Round-83 engine dedup note
- Little Sunflowers Preschool (Grand Junction childcare rebrand): genuinely new sighting, not in pipeline.md, leads.md, or facebook-dms.md. Non-trade (childcare), posted by a recommender rather than the business. Not added to pipeline; recorded in facebook-dms.md round log as observed-only intel.
- Organized Living Spaces (closet/office organization Page, handle hints Grand Junction): location UNVERIFIED. Known rule applies: do not add until location is confirmed. If a later signal confirms a Western CO location, treat as a trade-adjacent prospect (home organization) for DM-eligibility evaluation.
- Felix Automotive Mobile Detailing and Blessed Harvest farmstand: both repeat sightings of already-classified entities; no action, no re-add.
