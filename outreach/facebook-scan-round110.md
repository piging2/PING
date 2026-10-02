# Facebook Delta Scan — Round 110

**Window:** 2026-09-21 14:14:32 MDT → 17:13:00 MDT (watermark 1790021672 → 1790032426)
**Groups scanned (6):** Western Colorado Message Board & Classifieds (5456977881034408), Buy & Sell in Grand Junction (108728816001912), Delta (1504277980997243), Orchard Mesa (486356801008208), Fruita (3741333852807065), Living In Grand Junction Colorado (1082777608577867)
**Method:** `facebook-cli groups posts --group-id <id> --sort-by NEW_POSTS --limit 20` per group (120 posts fetched), filtered locally on creation_time > watermark 1790021672 (--min-timestamp not used per round-88/90 unreliability finding).
**facebook-cli cloud session:** healthy (me = Nolan Geske, no auth errors).

## Post counts
- WCMB: 4 in-window (car-dealer listing 2025 Silverado 2500 HD, snow-plow-for-ATV resale, polymer clay set resale, bare-URL post "Secondtimeco.com")
- Buy & Sell GJ: 20 in-window (all personal resale: rug, wood box, wood table, cruiser, suitcase, lab incubators, decanter set, Nike shoes x3, flower stand, 1998 Nissan Pathfinder, estate-sale fundraiser, baby swing, Harvest Right freeze dryer, chef decor, 5th-wheel hitch, desk+chair, 1 empty-caption, farmhouse decor bundle)
- Delta: 3 in-window (service-dog awareness post, 2 empty-caption posts)
- Orchard Mesa: 2 in-window (Sarahdipity Hair Designs promo, 1 empty-caption)
- Fruita: 15 in-window (see findings; 5 empty-caption/image-only)
- Living In GJ: 1 in-window (Paonia annual-tradition post)
- **Total in-window: 45. Total fetched: 120.**

## Business-post deep dives (author identified via social.search post_url)

1. **"Secondtimeco.com"** — WCMB, posted 17:04 MDT. Author: Jeffrey Grant (jeffrey.grant.988), bio "FARMER, LOVER OF GOD, LIFE, AND FAMILY, A STEWARD OF THE LAND.!!!" Caption is a bare URL with no business detail, no services, no contact. → **SKIP: unverifiable as a business; no signal.** Grepped leads.md, pipeline.md, facebook-dms.md: not previously tracked. Logged here as reviewed, not added.
2. **Sarahdipity Hair Designs** — posted 15:28 MDT in Orchard Mesa AND 15:29 MDT in Fruita (cross-posted Tuesday-haircut-special promo, walk-ins + appointments, haircuts/perms/colors/braids/hot-towel shaves/waxing, phone 970-434-4742). Author: Sarah Clark (sarah.clark.593659); tagged Page @SarahdipityHairDesigns (100063706295978). → **SKIP: out of trade.** Personal-care salon, not a home-service/blue-collar trade. Follows round-57 precedent (Sweets N Treats LLC food seller skipped as "out of trade"). Not previously tracked in leads.md/pipeline.md/facebook-dms.md (all three grepped). Logged here as reviewed, not added.
3. **Fruita: "Looks like Famous Dave's is gone!"** — 52 comments / 23 reacts. Local commenter noting the Fruita Famous Dave's location appears closed and wondering what goes in next. → **Market signal (social chatter, unverified):** restaurant closure in Fruita. Not a prospect. Recorded for digest-level social intelligence.
4. **Fruita: ISO tree-branch cutdown** — poster wants a heavy branch cut into manageable pieces for a burn pile, no chainsaw big enough, will help move; 11 comments / 5 reacts. → **Demand signal for tree service in Fruita** (service demand, not a business prospect). Logged as market intel; no prospect row.
5. **Fruita: ISO photographer mini sessions on the Mesa** — 24 comments / 2 reacts. → **Demand signal for photographers** (out of home-service trade; market intel only).
6. **Buy & Sell GJ: estate-sale fundraiser Sept 25–26 (Fri–Sat), 8am–4pm** — community charity sale, not a business.

## Findings
- **New prospects: 0.** Both genuine business promos (Secondtimeco.com, Sarahdipity Hair Designs) fail the quality bar (unverifiable / out of trade) and were reviewed, not added.
- **Repeat sightings / vitality notes: 0.** Neither business was previously tracked.
- **Grand-opening / new-business radar hits: 0.**
- **Service-announcement posts worth tracking: 0.**
- **Review/complaint threads: 0** (the Fruita chalk-painting ISO and dog poem are personal, not business complaints).

## DMs
- **0 DMs sent, 0 attempted, 0 parked.** No new prospects qualify. Messenger CLI is not present on this host; Messenger DM path remains Pig-only and parked per standing state. Nothing required verification.
- **Reroutes: none** (no prospects to reroute).

## Watermarks
- In: 1790021672 (2026-09-21 14:14:32 MDT)
- Out: 1790032426 (2026-09-21 17:13:00 MDT)

## Raw scratch
/tmp/scan110-<groupid>.json (6 files)

## Labels
All business findings above labeled per the signal/unverified/confirmed rule: Famous Dave's closure and the demand signals are UNVERIFIED social chatter (signal), not confirmed facts. No inferred problems stated as fact anywhere. Known → inferred → unknown held: only the business's own published content (phone, services) is KNOWN; everything else is UNKNOWN and left empty.
