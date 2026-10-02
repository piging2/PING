# Facebook delta-scan #120 (round 120)

Window: creation_time > 1790129908 (2026-09-22 20:18:28 MDT) through ~23:16 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 35 x6 (CLI caps at 20 per group; 20, 20, 20, 20, 18, 20 returned), local in-window filter. Read-only; no DMs sent, no likes, no comments.
Post content/author resolved per-post via `facebook-cli post read --url` for all empty-caption posts (8 reads, all OK; returns owner_name + media_type).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 1 in-window: used cow/horse chipper equipment resale, Paonia (21:51, farm equipment, personal). Skipped.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 20 in-window, ALL personal resale (massive multi-family yard sale Oct 1-3 at 945 23 Road GJ 23:09; heavy-duty trailer 22:21; 12-string guitar 22:13; realtor listing Michelle Young / Realty One Group Western Slope 22:10, non-trade; Estate Treasures Store garden gnomes 21:54, bookcases 21:44, secretary desk 21:34; elliptical 21:40, Pilates reformer 21:39; 2002 Honda Recon 250 21:30; waffle fleece dress, Stio hoodie; sit-and-spin, Montessori box, Harley bed mat, Minnie Mouse ride-on, Bluey sit-on toys; crock pot hook-up set 20:35; Gold's Gym treadmill 20:24; Teva sandals via Happy Little Finds 20:20). All skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 1 in-window: Jason Bias empty share (20:38, resolved: no content). Skipped.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 2 in-window: both empty shares resolved (Mariann Taigman 22:49, YAP- Grand Junction 21:27), no content. Both skipped.
- Fruita, Colorado Message Board (3741333852807065): 18 fetched, 6 in-window: Kayla Fisher empty share (22:09, resolved: no content); Western Colorado sunset photo post (21:40, community); YAP- Grand Junction empty share (21:27, resolved: no content); "name of the lady who makes the FMHS earrings" ISO craft vendor ask (21:04, minor consumer demand, craft not trade); permaculture/nature's-abundance farm workshop promo (20:49, farm/ag education, non-trade); "water and feed my farm animals" mid-October Loma personal ISO pet/farm sitter (20:22, minor consumer demand, personal). All skipped.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 4 in-window: Ray Mathis empty share (23:09, resolved: no content); Tanette Smith empty share (22:30, resolved: no content); Djmiguel Blanco empty share (21:05, resolved: no content); "Check us out!" entshare by CreatorsCon (20:55, resolved: out-of-area spam share, no local business promo). All skipped.

Total: 118 posts fetched, 34 in-window posts reviewed.

## Classification summary
- Home-service trade business promos: 0
- Demand/ISO signals: 2, both minor and consumer-side (see below)
- Hiring/growth signals: 0
- Personal resale: 21 (20 Buy & Sell GJ + cow/horse chipper)
- Empty shares resolved: 8 (all personal/community, zero promo content)
- Personal/social/community: 2 (sunset photo, CreatorsCon spam share)
- Non-trade promos: 3 (realtor listing, permaculture farm workshop, craft store sale posts)
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- New genuine prospects: 0

## Demand signals
- **ISO FMHS earrings maker** — Fruita group, 21:04 MDT. Consumer asking for the name of the local vendor who makes FMHS earrings. Minor unverified demand for a craft vendor, not a home-service trade; no business identity. Unverified, ignored for outreach.
- **ISO mid-October farm/pet sitter** — Fruita group, 20:22 MDT. Consumer in Loma looking for someone to water/feed farm animals, dogs, and cats mid-October, ideally staying at the house, DM to reach them. Personal-side demand, not a business; unverified, ignored for outreach.
- Carry-over note: round-118's ISO Carpet bid (consumer, Fruita, Oct 19-20 install) remains the only substantive demand signal this week; it names no business.

## Repeat sightings
- None this window. No known prospects (e.g. Your House Will Sparkle) reposted in the corridor groups during the 20:18 to 23:16 MDT window.

## Observed-but-not-pursued
- CreatorsCon "Check us out!" (LivingInGJ 20:55): out-of-area spam share, no local business.
- Realty One Group Western Slope listing (Buy & Sell GJ 22:10): realtor, non-trade.
- Permaculture farm workshop promo (Fruita 20:49): farm/ag education, non-trade.
- All 21 personal resale listings and 8 resolved empty shares: personal/community, ignored.

## Dedupe
No candidates produced, so no dedupe runs needed. 0 new businesses entered the corpus this lane.

## Pipeline / JSONL / DM log
No edits made by this lane (read-only): 0 genuine corridor trade prospects, 0 staged rows. No pipeline.md section added. DM count: 0/10 (no DMs in this lane by design).

## Watermark
Old: 1790129908 (2026-09-22 20:18:28 MDT).
New: 1790140184 (2026-09-22 23:09:44 MDT, max creation_time observed across all 6 groups, Buy & Sell GJ multi-family yard sale post at 23:09).

## Notes for parent
- 118 fetched / 34 in-window / 0 trade promos / 0 new genuine prospects.
- Corridor groups 20:18 to 23:16 MDT: personal resale + community + empty shares only; trade-promo volume remains zero. All trade signal this week continues to come from outward-expansion groups (not scanned this lane).
- Two minor consumer-side ISO asks (craft earrings vendor, farm/pet sitter) logged as unverified; neither names a business.
- Raw dumps: ~/workspace/outreach/scratch/scan120/scan120-<groupid>.json (6 files); per-post resolutions: ~/workspace/outreach/scratch/scan120/posts/p1..p8.json + checkusout.json.
