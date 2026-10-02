# Facebook delta-scan #115 (round 115)

Window: creation_time > 1790073856 (2026-09-22 04:44:16 MDT) through ~08:20 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20 x10, local filter (no --min-timestamp per rounds-88/90 unreliability). Read-only; no DMs sent.
Infra note: facebook-cli ran on the healthy local cloud-session facebook-cli, per the established round-111/112/113/114 path. Canonical 10-group list (from round-22 report; Mingle replacement 5355730651191326 confirmed working, Glenwood 2370574193230682, Palisade 2569745986668554, CO Business Networking 2803047646497352).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 1 in-window (06:06 MDT Carquest brake promo, retail chain, skipped).
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 8 in-window: purse resale, dishwasher connection resale, holsters resale, tablet resale, cookie jar resale, Harley boots resale, Rzr+trailer resale, power recliner resale. All personal resale, skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 2 in-window: 07:11 MDT ISO tumbleweed/weed removal (demand signal, logged below); 07:35 MDT empty-caption post resolved to Florence Markley (personal share).
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 20 fetched, 12 in-window: 05:22 good-morning greeting; 05:26 empty post = Amanda Martinez personal share; 05:50 coffee shop accident/closure notice (cross-posted to Palisade, community notice); 06:36 dog fall photos; 06:48 ranch-sorting thanks; 07:16 "Please come and support us"; 07:24 empty = Matthew Pasquale Cesario personal; 07:27 autism support meeting (community); 07:29 empty = Elizabeth Nunn personal share (1c/9r); 07:44 Rocky Mountain scrap free pickup (weak trade fit, no contact, observed not pursued); 08:13 grocery-store comment; 08:14 "What do you all think??" (no content).
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 3 in-window: 05:26 empty = Amanda Martinez personal share; 06:49 Geek Parties Theater promo (not a trade); 07:27 autism meeting (same community notice as Fruita).
- Colorado Business Networking (2803047646497352): 20 fetched, 13 in-window. ALL the genuine trade signals this window.
- Colorado Business Mingle (5355730651191326): 20 fetched, 0 in-window.
- What's Happening In Palisade, CO / Business Board (2569745986668554): 20 fetched, 1 in-window: 05:50 coffee shop accident/closure notice (cross-post of the Fruita one, community notice).
- Glenwood Springs Colorado Message Board (2370574193230682): 20 fetched, 0 in-window.

Total: 200 posts fetched, 40 in-window posts reviewed. Western Colorado groups produced zero trade promos (resale + community only). All 5 new prospects came from the outward-expansion CO Business Networking group.

## Classification summary
- Business promos (home-service trade): 6 (5 new prospects + 1 repeat)
- Demand/ISO signals: 1 (Delta weed removal)
- Personal resale: 8 (all Buy & Sell GJ)
- Personal shares (empty-caption, resolved via social.search): 6 (Amanda Martinez x2, Matthew Cesario, Elizabeth Nunn, Florence Markley, Manuel Medellin)
- Community notices: 4 (coffee shop x2, autism meeting x2)
- Personal/social content: 8 (greetings, dogs, theater, comics show, travel event, skincare launch, grocery comment, support ask)
- Non-trade promos: 3 (Carquest retail, Dolly's Cupboard food pantry, real estate broker Luther Benson)
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- Hiring/growth signals: 0

## New genuine prospects (5, all Colorado Business Networking)

1. **Jurassic Junk Colorado** — junk removal + seasonal sprinkler blowouts. Denver. Posted 07:45 MDT. Phone 720-815-6584 published in post. "Almost 200 sprinkler blowouts last year"; $55 flat-rate seasonal campaign with returning-customer discount. Seasonal urgency angle (blowout season filling up). No email published; DM or phone route. Post: https://facebook.com/groups/2803047646497352/permalink/4079335612201876/
   Signal: seasonal booking rush + missed-call risk (crew in the field, "filling up" language).
   DM park note: Messenger CLI absent on this host; DM path Pig-only and parked. Parent merges pipeline row as NEW with phone 720-815-6584.

2. **Lujan Landscaping LLC** — lawn aeration (fall seasonal service). Denver metro + surrounding. Posted 07:59 MDT. Phone 720-530-3933, email lujanlandscapingllc@gmail.com, square.site published. "Call or text today for your free estimate." Post: https://facebook.com/groups/2803047646497352/permalink/4079348595533911/
   Signal: seasonal estimate intake, email route available.
   DM park note: email lujanlandscapingllc@gmail.com is the clean route; parked for parent merge as NEW.

3. **Summit Window Solutions** — residential/commercial window film (privacy, heat reduction, glare). Posted 06:42 MDT. Phone 970.699.2900 (970 area code), swscleantint.com. Post: https://facebook.com/groups/2803047646497352/permalink/4079262042209233/
   Signal: multi-surface service business with visual-demo product; quote-driven.
   DM park note: phone route via 970.699.2900; parent merges as NEW.

4. **Serenity Cleaning Solutions LLC** — licensed, insured, bonded residential + office cleaning, est. 2023. Posted by the business Page (583 followers) at 06:44 MDT with a short "Holiday countdown / freshened up" caption (author resolved via social.search post_url; caption itself was content-thin but the Page bio is a full business profile). Post: https://facebook.com/groups/2803047646497352/permalink/4079263612209076/
   Signal: recurring-service cleaning business (high missed-message cost), established Page.
   DM park note: business Page with Message button is the first-choice channel; DM path Pig-only and parked. Parent merges as NEW, no published phone/email.

5. **Cozy Companions** — stay-home pet care, Grand Junction. Posted by the business Page (1,257 followers) at 07:12 MDT; caption empty in group API, author bio resolved via social.search: "Grand Junction's Premium Stay Home Pet Care." No phone/email in bio. WEAK trade fit (pet care, not a home-repair trade) but a genuine Western Colorado home-service business. Post: https://facebook.com/groups/2803047646497352/permalink/4079298832205554/
   DM park note: DM path Pig-only and parked. Parent merges as NEW with weak-fit flag.

## Repeat sightings (not re-added)
- **Applewood Painting** (Applewood Painting Company LLC, owner James, Denver metro) posted again at 08:15 MDT in CO Business Networking ("720.589.1654 FREE ESTIMATES!"). Already QUEUED in pipeline.md (round-19 draft, email queued 2026-09-10). Status unchanged; noted as active this morning.

## Demand signals
- Delta 07:11 MDT: "In search of tumbleweed and tall weed removal from our back yard." — homeowner ISO weed/tumbleweed removal. No business named; not actionable as outreach, but a live landscaping demand signal in Delta. Post: https://facebook.com/groups/1504277980997243/permalink/1807449927346712/

## Observed-but-not-pursued
- Mari's cleaning company (Mariamorga Gal, CO Business Networking 05:45): genuine cleaning promo (insured, registered LLC, $300 deep-clean menu) but NO business name and NO published contact info. Fails the quality bar; logged only.
- Rocky Mountain scrap free pickup (Fruita 07:44): free scrap-metal haul; weak trade fit, no contact info.
- Coffee shop sister-accident closure notice (Fruita + Palisade 05:50): community notice, not a home-service business.
- Carquest brake promo (WCMB 06:06): retail chain promo, out of segment.
- Luther Benson (CO Business Networking 07:43): residential real estate broker, not a trade.
- Buy & Sell GJ resale listings (8): personal resale, ignored.
- All resolved empty-caption personal posts (Amanda Martinez x2, Matthew Cesario, Elizabeth Nunn, Florence Markley, Manuel Medellin): personal, ignored.

## Dedupe
Grep across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl: Jurassic Junk (0 hits), Lujan Landscaping (0 hits), Summit Window Solutions / swscleantint / 970.699.2900 (0 hits), Serenity Cleaning (0 hits), Cozy Companions (0 hits), Applewood Painting / 720.589.1654 (hits in leads.md, pipeline.md, facebook-dms.md — already QUEUED, repeat sighting only). Pipeline adds by parent: 5 NEW (jurassic-junk, lujan-landscaping, summit-window-solutions, serenity-cleaning, cozy-companions-weak-fit).

## Parked DM drafts
None sent (read-only lane; Messenger CLI not on this host, DM path Pig-only and parked). DM count: 0/10. Parked for parent merge: Jurassic Junk (phone 720-815-6584), Serenity Cleaning (Page Message), Cozy Companions (Page Message). Lujan Landscaping has email route. Summit Window Solutions has phone route.

## Watermark
Old: 1790073856 (2026-09-22 04:44:16 MDT).
New: 1790086503 (2026-09-22 08:15:03 MDT, max creation_time observed across all 10 groups).

## Notes for parent
- 200 fetched / 40 in-window / 5 new prospects + 1 demand signal. Western Colorado groups were quiet overnight-to-morning (trade promos only from the Denver/outward-expansion group).
- Suggested pipeline placement for parent merge: all 5 under "Facebook — Denver-area groups" except Cozy Companions (Grand Junction, file under "Facebook — Western Colorado"), status NEW.
- No pipeline.md / leads.md edits made by this lane (read-only); parent merges.
- Raw dumps: ~/workspace/outreach/scratch/scan115-<groupid>.json (10 files).
