# Facebook delta-scan #100 (round 100)

Window: creation_time > 1789913519 (2026-09-20 08:11 MDT) through ~11:20 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20, 10 groups, 200 posts fetched; local filter on creation_time > watermark. Read-only; no DMs sent. (Note: this run is numbered 100 because a full round-99 engine run already completed ~08:20 MDT with report at ~/workspace/goals/ping-social-outreach-campaign/hidden_files/facebook-scan-round99.md; prior watermark 1789913519 comes from that report.)

## Posts scanned per group (in-window count)
- Western Colorado Message Board & Classifieds (5456977881034408): 4 (wine cabinet resale, Jakarlin CT rolls/cookies vendor, 2 car-charm resale).
- Buy & Sell in Grand Junction (108728816001912): 20 (all 20 in-window; 17 personal resale: wine cabinet, PS4, Raptor ATV, decor, BowFlex, frames, ladder/tire carrier, tickets, chandelier, washer/dryer, yard sales x2, plants, mower, Pontiac, SSD, hedge trimmer, Tweety collection; 1 apartment rental Palisade; 1 trade promo: ROUGH IDLE DIAGNOSTICS; 1 empty-caption resale).
- Delta, Colorado Community Message Board (1504277980997243): 6 (ice cream/arcade food promo, service-dog cross-post x2, scale resale, 2 empty captions).
- Orchard Mesa, Colorado Message Board (486356801008208): 3 (all empty captions, resolved: pet grooming Page, Cabin Escape Room cross-post, retired individual).
- Fruita, Colorado Message Board (3741333852807065): 16 (estate-sale furniture question, Cowboy Mercantile vendor promos x3, ROUGH IDLE DIAGNOSTICS cross-post, bee-queen order, pellet-stove ISO, facial promo, kids side-work, dog rescue alert, pumpkin spice, event promo, yard sale, 3 empty captions resolved).
- Living In Grand Junction Colorado (1082777608577867): 5 (vendor call, service-dog post, 3 empty captions logged without lookup, personal-community pattern).
- Colorado Business Networking (2803047646497352): 11 (Avalanche Tree Service, Garage Door Up and Over $79 special, Bradford Weddings pumpkin porch, SideQuest Events vendor call, Cabin Escape Room, tutor Mines student, Longmont coffee pop-up, AI-agents discussion, Chipeta Lodge tag, 5 empty captions resolved).
- Colorado Business Mingle (5355730651191326): 2 (loaded-tea MLM link, 1 empty caption resolved to individual).
- Palisade business board (2569745986668554): 1 (Jakarlin CT rolls/cookies vendor cross-post).
- Glenwood Springs Message Board (2370574193230682): 0 in-window.

Total: 68 in-window posts reviewed.

## New genuine prospects (1)
- **Rough Idle Diagnostics** | automotive diagnostics + selected repairs (check engine, no-starts, rough idle/misfires, starting/charging, brakes/suspension, electrical/driveability, maintenance) | Grand Junction area (posted Buy & Sell GJ + Fruita; 970 phone) | phone 970-589-1986 (post-published, call/text) | author: Jacob Land (handle Dammitjake91, author_id 100087768015631, bio "Mechanic | Business Owner"), resolved via social.search post_url | Post: https://facebook.com/groups/108728816001912/permalink/3417093098498784/ (cross-post Fruita 4472668886340221, 2026-09-20 ~09:50 MDT) | Opportunity: MISSED_CALL_LEAD_CAPTURE (one-person operation; diagnostic intake happens by call/text; missed call = lost job) | WARM | Dedupe: 0 hits across leads.md, pipeline.md, facebook-dms.md, western-co-business-owner-list.csv | Added to pipeline.md "Facebook — Western Colorado (delta-scan #100)" with status NEW; parked DM draft in facebook-dms.md. Facebook-first protocol: Pig-side Message-button verification required before any DM (Messenger CLI non-contact hard block).

## Out-of-corridor trade sightings (intel only, NOT added per 2026-09-20 corridor targeting)
- **Avalanche Tree Service** 719-644-4931 (Dustin Bardill, COBizNet 4077018129100291; 719 = Colorado Springs area; Front Range, out of corridor).
- **Garage Door Up and Over** (handle garagedoorupandoverllc; $79 lube-and-tune special, 720-549-9692, Denver metro; trade is right but out of corridor).
- **Bradford Weddings & Events** pumpkin porch styling, 972-940-2912, "Serving Northern Colorado & the Denver area" (NoCo/Front Range; out of area).

## Demand / complaint signals (intel only)
- Fruita 10:36 MDT: "ISO of recommendations for a person or company that does pellet stove repair." Demand signal (someone looking for a repair tech), not a business promo. Logged for intel; no prospect row.

## Empty-caption lookups (14 via social.search post_url)
- Toastique (toast/juice bar, Colorado Springs) x2 — food, out of area.
- The Cabin Escape Room — entertainment, out of segment (cross-posted Delta + Orchard Mesa).
- Duane Taylor (COBizMingle) — individual, unresolvable.
- Jennifer Thomas-NextHome Virtual (Delta) — realtor, out of segment.
- Smokey Bonez BBQ (Fruita) — BBQ food truck, Western Slope but food, out of trade segment.
- Happy Dog Pet Grooming (Orchard Mesa; Heather, grooming out of Jurassic Bark, GJ) — pet grooming, personal service, out of trade segment.
- Christine Kline, Ashley Rosales (Fruita) — individuals.
- Mariann Taigman (Orchard Mesa) — retired individual.
- BuySellGJ (20 empties, resale photos with price pattern) and LivingGJ (4 empties) skipped by group pattern (personal resale / community photos), logged without individual lookup.

## Observed-but-not-pursued (with reasons)
- Cottage-food vendors: rolls/cookies vendor (Jakarlin CT GJ; WCMB + Palisade cross-post), Smokey Bonez BBQ — food trade, out of segment.
- Personal resale (BuySellGJ/WCMB/Delta): all 20+ resale listings, not businesses.
- Estate-sale furniture question (Fruita), dog rescue alert, pumpkin spice promo, yard sales — community/commercial, not trade prospects.
- Down2EarthSkin facial promo (Fruita) — beauty, out of segment.
- Loaded Tea Shop MLM link (COBizMingle) — MLM, out of segment.
- Kids side-work (Fruita, "17 and 12 year old... cut grass") — minors, not a business.
- Service-dog informational posts (LivingGJ + Delta) — informational, not a business promo.
- Tutor (Golden), AI-agents discussion, vendor calls, event promos — out of segment or recruiting posts, not trade prospects.
- Cabin Escape Room — entertainment, out of segment.

## Channel state
- facebook-cli cloud session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted. 1 parked DM draft (Rough Idle Diagnostics). DM daily count: 0/10.
- No Page Message-button verification attempted this round (scan was read-only; Pig-side verification for Rough Idle Diagnostics belongs to the outreach engine's next action pass).

## Watermark
Old: 1789913519 (2026-09-20 08:11 MDT, from round-99 report).
New: 1789924540 (2026-09-20 11:15 MDT, the max creation_time observed in-window).

## Notes for parent
- Rough Idle Diagnostics is the single genuine in-corridor trade promo this window. Automotive diagnostics is a blue-collar trade fit; owner-operator; published call/text phone; clear missed-call angle.
- Empty-caption rate is high on Sundays in resale groups; bounded the lookup budget to business-plausible groups and individuals with Page-shaped profiles.
- Next round covers posts newer than 1789924540 (2026-09-20 11:15 MDT).
