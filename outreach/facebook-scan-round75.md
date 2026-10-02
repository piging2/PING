# Facebook Delta-Scan #75 (2026-09-17 ~05:19 to ~08:15 MDT, round 75, read-only)

Window: watermark 1789643391 -> 1789654411. 45 posts across 8 groups, all scanned with NEW_POSTS sort, min-timestamp 1789643391, one page per group. 42 in-window; 3 below-watermark API leaks (not double-counted).

- Western Colorado Message Board & Classifieds (5456977881034408): 1 (anti-surveillance politics post, out of scope)
- Buy & Sell in Grand Junction (108728816001912): 13 (vote contest for Alec Larson + 12 personal resale: office furniture liquidation, U.S. General tool chest $375, coffee/side tables, vintage farmhouse sink $225, wall panels, seed spreader, flagstone pavers, concrete blocks/deck blocks, 2 desks)
- Delta (1504277980997243): 2 (Dolly Parton "Best Little Whorehouse in Texas" tribute event promo, community theatre, out of trade; 1 empty-caption unresolvable)
- Orchard Mesa (486356801008208): 0
- Fruita (3741333852807065): 7 in-window (broken chest freezer giveaway, emoji posts, event posts, 3 empty unresolvables) + 1 below-watermark leak (4468265150113928 "Local business Thursday" thread, 2026-09-16 06:58, c31)
- Living In Grand Junction Colorado (1082777608577867): 4 in-window (3 empty-caption posts + 1 image post whose 8 comments are a housing-policy discussion, not a business) + 1 below-watermark leak (3436645479857723 painter demand ask, 2026-09-16 17:40, c18)
- Colorado Business Networking (2803047646497352): 14 (see resolved promos below)
- Colorado Business Mingle (5355730651191326): 2 (Felix Automotive mobile detailing upholstery steam cleaning 970-216-0342, auto, out of trade; Skyzone Halloween Trunk-or-Treat charity event)

## Findings
- 0 new genuine home-service trade prospects added. 0 new-business radar hits (no "grand opening", "now open", "just launched").
- Repeat sightings of tracked businesses: none (Integrity Painting appears only as a third-party comment recommendation; already in pipeline.md).
- Demand signals (intel only): the leaked LivingGJ painter ask ("looking for someone professional to paint master bathroom and bedroom; my guy isn't answering my texts") is a buyer ask with an embedded unresponsiveness complaint. Its 18 comments contain third-party recommendations, not business-authored promos: Integrity Painting (Daniel), Alexander LyBarger, Miracles by Motion, XL Painting GJ, Mountain Renovations LLC (970-589-6309), InLaws Construction (970-314-6360), Pete the Painter (779-537-7275), JZ Properties and Maintenance, Nextgenpainting by Joel Munoz, Unique Solutions Handyman and Remodeling LLC (972-269-3449). Recorded as demand intel only; no pipeline adds (comment mentions are not prospect-grade, and the thread is a below-watermark leak).
- Complaint signals: none actionable beyond the embedded "not answering texts" gripe in the same leaked thread.

## Resolved home-service promos (NOT pursued, out of geography)
Both resolved via social.search post_url lookups (facebook-cli post read is 403-gated server-side in this session):

1. **United Property Maintenance** (COBizNet 4073288506139920, 2026-09-17 07:58 MDT, https://www.facebook.com/groups/2803047646497352/permalink/4073288506139920/) — commercial tree removal, landscape cleanup, gutter cleaning. Author: FB Page United Property Maintenance (upmlawns, author_id 100063721652871, 281 followers). Bio: "full service landscape company servicing the metro Denver and surrounding areas." Phone 720-924-1010, www.upmdenver.com, tagged Denver, CO. Out of Western Colorado geography; Denver-area outreach is deprioritized. Intel only.

2. **Exterior painting $500-off promo** (COBizNet 4073270682808369, 2026-09-17 07:39 MDT, https://www.facebook.com/groups/2803047646497352/permalink/4073270682808369/) — "$500 OFF any exterior project booked through October 31st", call/text 720-907-5462, hashtags #exteriorpainting #HomeImprovement #denvercolorado. Author: personal profile "Turquoise Begay" (shadiin.begay, 1,054 followers), not a verified business Page. Out of geography (Denver); intel only.

## Out-of-trade sightings (intel only)
- COBizNet: tax-credit accountant promo ("Claiming dependents this tax season", 07:23); marketing-ideas coach post (07:00); mobile makeup/hairstyling promo (06:17); Mind Quest Puzzles & Games co-founder profile Palmer Lake (06:36); Aurora networking Zoom promo (07:48); "Come join us" community post (08:08); Thursday travel question (05:43); 4 empty-caption posts.
- WCMB: surveillance/mass-surveillance politics post (07:40).
- Delta: theatre tribute-event promo (06:07).
- Fruita: chest freezer giveaway (07:52), emoji posts (07:44, 06:59), community event posts (07:05, 06:48 react-only).

## Unresolvable posts
12 empty-caption posts (0 comments or reacts only; facebook-cli strips authors; never guess):
- LivingGJ: 3437201463135458 (07:09), 3437189213136683 (06:54), 3437113356477602 (05:19)
- Delta: 1803018137789891 (06:07)
- Fruita: 4469337576673352 (07:12), 4469316980008745 (06:48, 3 reacts), 4469309376676172 (06:41)
- COBizNet: 4073220926146678 (06:48), 4073209939481110 (06:37), 4073167889485315 (05:54), 4073150402820397 (05:34), 4073141382821299 (05:24)

## Notes
- facebook-cli cloud session healthy (`me` OK; group pulls all clean). `post read` 403-gated server-side; `post comments read` works; social.search post_url lookups working.
- social.search output for the painter promo was returned from the personal profile shadiin.begay, a personal account posting a Denver painting promo — reads as a lead-gen ad or personal affiliate post, not a verifiable business Page.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and this session has no Pig driver). New watermark: 1789654411.
