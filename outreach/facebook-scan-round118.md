# Facebook delta-scan #118 (round 118)

Window: creation_time > 1790108175 (2026-09-22 14:16:15 MDT) through ~17:15 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 35 x6 (CLI caps at 20 per group; 20 returned per group), local in-window filter. Read-only; no DMs sent, no likes, no comments.
Post content/author resolved per-post via `facebook-cli post read --url` for all empty-caption posts (13 reads, all OK; returns owner_name + post_caption + media_type).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 3 in-window: handmade creeper-style wall organizer sale (Yellow Brick Road Creations LLC, craft resale, not trade, 16:49); plush gray sectional sofa resale (14:27); "Sharing Information" share by Marilyn Trueblood (15:07, resolved: community info share, no promo content). All skipped.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 20 in-window, ALL personal resale (Baby Breeza, NFL/MLB shirts x5, flower wall art, Carquest radiators x2, exhaust catalytic converter, power banks x3, charger, basketball board, large mirror, vintage wood loveseat, Martha Stewart swivel armchair, Broncos mailbox; cracked-tables resale by Jeniffer Woodhouse DeKam resolved via post read, personal). All skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 6 in-window: lost-wallet community post (17:14); dog training openings promo (16:08, pet service, non-trade); pinball high-score promo (15:17, arcade entertainment, non-trade); Sovereign Roots veteran healing event (14:31, community); realtor under-contract post, Hotchkiss (14:18, realtor, non-trade); Leslie Fiscus empty share (14:16, resolved: no content). All skipped.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 2 in-window: both empty shares resolved (Clifton Community Leaders 16:49, Denice Simmons 15:54), no content. Both skipped.
- Fruita, Colorado Message Board (3741333852807065): 20 fetched, 17 in-window: "Look outside now" weather post (community); 6 empty shares resolved (Clifton Community Leaders, Peer 180 RCO recovery org, Mckenna Young, Sue Goodall, Torie Tucker, Marilyn Trueblood info share; all personal/community); Ann Hartter tutoring promo (16:47, cross-posted in LivingInGJ, education service, non-trade); Crawford 40-acre realtor listing (16:38); **ISO Carpet bid (15:41, demand signal, consumer, see below)**; Carlee Burnett October class promo (15:35, craft/education, non-trade); Grand Mesa fall-photo share; ISO canning tomatoes; butane-canister disposal ask; grocery coupon complaint; Relax We know hair hiring hairstylists (14:56, 141 S Mesa St Fruita, non-trade hiring signal); tamale-vendor schedule ask. All skipped except the ISO Carpet demand signal.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 1 in-window: Ann Hartter tutoring promo cross-post (16:47, non-trade). Skipped.

Total: 120 posts fetched, 49 in-window posts reviewed.

## Classification summary
- Home-service trade business promos: 0
- Demand/ISO signals: 1 (ISO Carpet bid, Fruita 15:41, consumer ISO, unverified)
- Non-trade hiring signals: 1 (Relax salon, Fruita, hairstylists; not a home-service trade)
- Personal resale: 22 (20 Buy & Sell GJ + sectional sofa + cracked tables)
- Empty shares resolved: 13 (all personal/community, zero promo content)
- Personal/social/community: 7 (weather post, tamale ask, lost wallet, ISO canning tomatoes, butane-canister ask, coupon complaint, Lost-alert n/a)
- Non-trade promos: 8 (dog training, pinball arcade, realtors x3, Sovereign Roots event, tutoring x1 counted once, craft class, handmade craft sale)
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- New genuine prospects: 0

## Demand signals
- **ISO Carpet bid** — Fruita group, 15:41 MDT. Consumer ISO cut-and-loop carpet install, "Ideally to be finished Oct 19th and 20th. DM or text 7013902027 directly." Phone is the consumer's (701 = ND area code), not a business. Logged as unverified demand signal for flooring/carpet trades; no prospect identity to act on. Post: https://facebook.com/groups/3741333852807065/permalink/4474979529442490/

## Repeat sightings
- None this window (round-117 items did not repost in the corridor groups).

## Observed-but-not-pursued
- Yellow Brick Road Creations LLC (WCMB 16:49): craft business selling handmade organizers; not a home-service trade.
- Ann Hartter tutoring (Fruita 16:47 + LivingInGJ 16:47): education service; non-trade.
- Relax We know hair (Fruita 14:56): salon hiring; non-trade.
- Sovereign Roots veteran event, pinball arcade promo, dog training openings, realtors (Hotchkiss, Crawford): all non-trade.
- All 22 personal resale listings and 13 resolved empty shares: personal/community, ignored.

## Dedupe
No candidates produced, so no dedupe runs needed. 0 new businesses entered the corpus this lane.

## Pipeline / JSONL / DM log
No edits made by this lane (read-only): 0 genuine corridor trade prospects, 0 staged rows. No pipeline.md section added. DM count: 0/10 (no DMs in this lane by design).

## Watermark
Old: 1790108175 (2026-09-22 14:16:15 MDT).
New: 1790118882 (2026-09-22 17:14:42 MDT, max creation_time observed across all 6 groups, Delta lost-wallet post at 17:14).

## Notes for parent
- 120 fetched / 49 in-window / 0 trade promos / 1 demand signal (ISO Carpet bid, consumer) / 0 new genuine prospects.
- Corridor groups 14:16 to 17:15 MDT: personal resale + community + empty shares only; trade-promo volume remains near zero. All trade signal this week continues to come from outward-expansion groups (not scanned this lane).
- ISO Carpet bid is a clean unverified demand signal for carpet/flooring trades (Oct 19-20 install need); it names no business and the phone belongs to the consumer.
- Outward-expansion groups (COBizNet etc.) were not re-scanned this lane per task scope; trade may exist there.
- Raw dumps: ~/workspace/outreach/scratch/scan118/scan118-<groupid>.json (6 files); per-post resolutions: ~/workspace/outreach/scratch/scan118/posts/p1..p13.json.
