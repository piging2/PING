# Facebook delta-scan #117 (round 117)

Window: creation_time > 1790097207 (2026-09-22 11:13:24 MDT) through ~14:16 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20 x10, local filter (no --min-timestamp per rounds-88/90 unreliability). Read-only; no DMs sent.
Infra note: facebook-cli ran on the healthy local cloud-session facebook-cli, per the established path. Post content/author resolved per-post via `facebook-cli post read --url` (returns caption + owner_name + media OCR, live). Empty-caption posts resolved this way too: 15 empties + 6 trade-relevant posts, 21 reads, all OK. ISO Laborers post resolved separately (22nd read). No new-browser navigation; all reads via CLI.

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 5 in-window: toddler puddle jumpers, 2025 Ford Explorer, 2025 Chevy Equinox, king quilt, 2019 Silverado. All personal resale. All skipped.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 20 in-window, ALL personal resale (coat hooks, Chevy Colorado dealer, seat pad, Halloween costumes, car seat, sewing machine, Vizio TV, display shelves, pot covers, Ford Escape grill, beer cans, cabinets, Lululemon leggings, aluminum trailer, Nike shoes, bowling setup, bunk bed, Gaerne boots). One food-business menu promo ("new menu", 13:20, owner unseen) observed, food = not trade. All skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 4 in-window: Teresa Kessler video share (empty, 13:44, personal); Housing Options & Fraud info post (13:18, community info); Aspen Estep empty share (12:40, personal); Delta Heirlooms 30% off furniture promo (11:48, retail/thrift, not trade). All skipped.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 20 fetched, 14 in-window: roundabout driving rant (community); Pup Pup Pick Up empty share (pet name, no promo content); dog-transport help ask (community); Erika Martin empty share; **ISO Laborers!!! (Zoey Loya, 11:45, demand signal, content-thin, no business name)**; Amber Alert posts x2 (Blanca Vargas, Trisha Fellman, community); car pre-purchase inspection ask (consumer ISO, not business); "keep an eye out child and adult" (community alert); Jessi Crooks empty share; Courtney Buckley photo-page share (Courtney Liose Photography, personal promo, not trade); Suzy Swist Jim Beam "Fall Sips" share (beverage ad share); Lodge private-event notice (venue); meat rabbits rehome (personal resale). All skipped except ISO Laborers noted as demand signal.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 7 in-window: realtor listing (Cassidy Crowell / Realty ONE Group); "Move well, feel well" wellness promo x2 (fitness coaching, non-trade); Purrls tea room promo (food/retail); Lodge private-event notice (venue); Kokopelli Property Management rentals (property mgmt, not trade); Blue Pig Saturday evening (restaurant/event). All skipped.
- Colorado Business Networking (2803047646497352): 20 fetched, 20 in-window, signal-heavy: see Classification summary. 5 trade-relevant promos (see below).
- Colorado Business Mingle (5355730651191326): 20 fetched, 1 in-window: loaded tea shop link (MLM distributor, non-trade). Skipped.
- What's Happening In Palisade, CO / Business Board (2569745986668554): 20 fetched, 3 in-window: dim-sum restaurant promo; Taco Tuesday promo; Blue Pig Saturday evening (cross-post with LivingInGJ). All food/venue, not trade. Skipped.
- Glenwood Springs Colorado Message Board (2370574193230682): 20 fetched, 0 in-window.

Total: 200 posts fetched, 74 in-window posts reviewed.

## Classification summary
- Business promos (home-service trade): 5 sightings — 0 new prospects, 2 repeat sightings of already-tracked (Memphis Auto Spa, Falling Star HVAC), 1 genuine out-of-corridor (The Electric Company), 2 unverified-location third-party shares (Kyle Neville Window Coverings, Alex Kaminsky GC)
- Demand/ISO signals: 1 (ISO Laborers!!!, Fruita 11:45, Zoey Loya, content-thin, no business name; logged as unverified demand, no prospect identity)
- Personal resale: 29 (20 Buy & Sell GJ + 5 WCMB + meat rabbits; trailer, cabinets, shelves all resale)
- Personal shares (empty-caption, resolved via post read): 15 (Teresa Kessler, Aspen Estep, Erika Martin, Jessi Crooks, Luther Benson, Michael Bailey White + p10 wings poll share, Pup Pup Pick Up, p7, p12 Royal Automotive, p13 Iliana Holman, p14)
- Personal/social content: 11 (roundabout rant, dog transport ask, Amber alerts x2, missing-person alert, photography share, Jim Beam share, puppy-owner share, car inspection ask)
- Community/event notices: 5 (Lodge x2 groups, Blue Pig x2 groups, Housing Options & Fraud, Workforce share)
- Non-trade promos: 18 (realtor x2 groups, wellness x2, tea room, property mgmt, restaurants x4, Delta Heirlooms, loaded tea MLM, Lisa Higdon mortgage webinar, Montrose realtor x2, New Way Travel, fall photos, bookkeeping Mariana Lazo, Ceramic Boyz podcast clip, Royal Automotive empty share, pinkbuscos mobile beverage cart, food menu promo)
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- New genuine prospects: 0

## Trade sightings detail

1. **The Electric Company, Inc.** — electrical (residential). Hiring/apprentice-electrician promo (14:09 MDT), posted by Elle Ryn (personal profile). Serves Castle Rock, Castle Pines, Denver front range. Email lauren.tecservice@gmail.com + www.tecservicecolorado.com published in post. Genuine trade business, but BEYOND corridor. PARKED, not proposed. Dedupe: 0 prior hits. Post: https://facebook.com/groups/2803047646497352/permalink/4079694782165959/

2. **Memphis Auto Spa** — mobile detailing, 206-843-4424, posted by Anderson Robert (13:28). REPEAT SIGHTING: already ARCHIVED in pipeline.md (2026-09-13 cap review: unverified town, out-of-segment, no contact path); tagged Colorado Springs in earlier rounds; name points to Memphis, TN. Not re-added. Post: https://facebook.com/groups/2803047646497352/permalink/4079658415502929/

3. **Falling Star HVAC** — heat pump promo (12:16), owner Page "Falling Star HVAC". Verified via web search: Falling Star Heating and Cooling, 11315 Falling Star Rd, Fountain CO / Colorado Springs, (719) 217-1681, veteran-owned. REPEAT SIGHTING: already logged in facebook-dms.md as out-of-geo intel (Colorado Springs). Not re-added. Post: https://facebook.com/groups/2803047646497352/permalink/4079593435509427/

4. **Kyle Neville Window Coverings** — window coverings trade promo (11:32), posted by Starla DeFreeze (third-party referral share, same sharer as the Alex Kaminsky post). Web search found NO verifiable Colorado business by this name. Location UNVERIFIED. Observed, not proposed (never invent location). Post: https://facebook.com/groups/2803047646497352/permalink/4079553358846768/

5. **Alex Kaminsky General Contractor** — GC trade promo (11:31), www.CopperCreekGC.com, posted by Starla DeFreeze (third-party referral share). Web search found nothing for CopperCreekGC.com in Colorado. Location UNVERIFIED. Observed, not proposed. Post: https://facebook.com/groups/2803047646497352/permalink/4079552362180201/

## Demand signals
- **ISO Laborers!!!** — Zoey Loya, Fruita, 11:45 MDT. No business name, no trade detail, no contact path in caption. Logged as unverified demand signal; no prospect identity to act on. Post: https://facebook.com/groups/3741333852807065/permalink/4474792062794570/

## Repeat sightings (not re-added)
- Memphis Auto Spa (see above, already ARCHIVED).
- Falling Star HVAC (see above, already out-of-geo intel).
- Round-116's Farmer Home Inspections LLC did not repost this window. Round-115's prospects did not repost.

## Observed-but-not-pursued
- Ceramic Boyz (Ernesto Kingpin Martinez, COBizNet 12:10): podcast appearance clip, ceramic coating trade, not a business promo; observed only.
- Royal Automotive (COBizNet 12:45): empty share by an auto business Page; no promo content; observed only.
- Iliana Holman (COBizNet 12:34): share with garbled OCR (kevlar repair-ish); unreadable, unverifiable; skipped.
- Pink Bus / Sip & Savor Colorado Springs mobile beverage cart: Colorado Springs + non-trade; skipped.
- Mariana Lazo Bookkeeping (COBizNet 11:29): B2B bookkeeping, not a home-service trade; skipped.
- All 29 personal resale listings and 15 empty personal shares: personal, ignored.

## Dedupe
Grep across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl: "Electric Company" (0 hits), "Kyle Neville" (0), "Kaminsky"/"CopperCreek" (0), "Ceramic Boyz" (0), "Royal Automotive" (0). "Memphis Auto Spa" hits in pipeline.md/leads.md/facebook-dms.md (already ARCHIVED, out-of-segment, Colorado Springs tag). "Falling Star" hits in facebook-dms.md (already logged as out-of-geo Colorado Springs intel). No new pipeline additions by this lane (read-only); parent merges. Candidate parked items: The Electric Company (out-of-corridor), Kyle Neville Window Coverings + Alex Kaminsky GC (location unverified, not proposed).

## Parked DM drafts
None sent (read-only lane). DM count: 0/10.

## Watermark
Old: 1790097207 (2026-09-22 11:13:24 MDT).
New: 1790108175 (2026-09-22 14:16:15 MDT, max creation_time observed across all 10 groups, COBizNet post by "Pink Bus" author at 14:16).

## Notes for parent
- 200 fetched / 74 in-window / 0 new prospects / 1 new out-of-corridor parked trade (The Electric Company) / 2 repeat sightings / 1 demand signal (ISO Laborers, content-thin).
- Western Colorado groups mid-afternoon: resale + community + empty shares only. All trade signal again came from CO Business Networking (outward-expansion group).
- Kyle Neville Window Coverings and Alex Kaminsky GC are third-party referral shares by Starla DeFreeze with no verifiable Colorado business identity; leave them observed, not proposed.
- The Electric Company (Castle Rock/Denver front range) is a genuine trade with published email, but corridor-only rule parks it.
- No pipeline.md / facebook-dms.md / JSONL edits made by this lane (read-only); parent merges parked items as it sees fit.
- Raw dumps: ~/workspace/outreach/scratch/scan117-<groupid>.json (10 files); per-post resolutions: ~/workspace/outreach/scratch/scan117-posts/p1..p21.json + iso-laborers.json; in-window index: ~/workspace/outreach/scratch/scan117-inwindow-index.json (note: this helper file matches the scan117-*.json glob and should be ignored by future scripts); in-window URLs: ~/workspace/outreach/scratch/scan117-inwindow-urls.txt.
