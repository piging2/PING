# Facebook delta-scan #122 (round 122)

Window: creation_time > 1790143692 (2026-09-23 00:08:12 MDT) through ~05:15 MDT scan time (~3.2 hours).
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 35 x6 (CLI caps at 20 per group; 20, 20, 20, 20, 18, 20 returned), local in-window filter. Read-only; no DMs sent, no likes, no comments.
Post content/author resolution via `facebook-cli post read --url` was not needed: both in-window posts had non-empty captions and are non-business (personal resale, community photo).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 0 in-window.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 0 in-window.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 0 in-window.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 18 fetched, 2 in-window: antique Frigidaire Flair stove for sale, seller asks PM if interested (03:20); community photo appreciation post praising photographer Rosita Moglia (02:32).
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 0 in-window.

Total: 118 posts fetched, 2 in-window posts reviewed.

## Classification summary
- Home-service trade business promos: 0
- Demand/ISO signals: 0
- Hiring/growth signals: 0
- Personal resale: 1 (Fruita: antique Frigidaire Flair stove)
- Empty shares resolved: 0
- Personal/social/community: 1 (Fruita: community photo post)
- Non-trade promos: 0
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- New genuine prospects: 0

## Trade promo (worth flagging)
- None this window.

## Repeat sightings
- None. No previously flagged businesses (e.g. 2nd Time Around Co) reposted in the window.

## Observed-but-not-pursued
- None of note. Overnight corridor-group activity was essentially zero apart from the two Fruita posts.

## Dedupe
No new businesses surfaced, so no dedupe against leads.md / pipeline.md / facebook-dms.md was required. 0 confirmed duplicates within this lane.

## Pipeline / JSONL / DM log
No edits made by this lane (read-only): 0 trade-promo candidates flagged for parent. No pipeline.md section added. DM count: 0/10 (no DMs in this lane by design).

## Watermark
Old: 1790143692 (2026-09-23 00:08:12 MDT).
New: 1790155213 (2026-09-23 03:20:13 MDT, max creation_time observed across all 6 groups, Fruita stove post).

## Notes for parent
- 118 fetched / 2 in-window / 0 trade promos / 0 new genuine prospects / 0 grand-opening / 0 hiring / 0 complaints.
- Window was ~3.2 hours overnight (00:08 to 03:20 MDT); W CO Message Board, Buy & Sell GJ, Delta, Orchard Mesa, and LivingInGJ produced zero in-window posts.
- Raw dumps: ~/workspace/outreach/scratch/scan122/scan122-<groupid>.json (6 files); no per-post resolutions needed this round.
