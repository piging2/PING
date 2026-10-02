# Facebook delta-scan #114 (round 114)

Window: creation_time > 1790058601 (2026-09-22 00:30:01 MDT) through ~05:20 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20 x6, local filter (no --min-timestamp per rounds-88/90 unreliability). Read-only; no DMs sent.
Infra note: facebook-cli is not installed on Pig WSL (verified live: which facebook-cli exit 1), consistent with round-111/112. Scan ran on the healthy local cloud-session facebook-cli, per the established round-111/112/113 path.

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 0 in-window.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched. 2 in-window:
  (1) 05:04:02 MDT — Roma leather conceal carry purse, $30, 81501. Personal resale.
  (2) 04:30:xx MDT — 2012 Ford F150 Super Cab Lariat, $5,500, Parachute CO. Personal resale.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 0 in-window.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 20 fetched. 3 in-window:
  (1) 04:44:16 MDT — empty-text post (no content, 0 comments, 0 reactions). Personal share.
  (2) 04:43:34 MDT — bare Amazon product link, no business context. Personal share.
  (3) 04:40:xx MDT — minister publishing a book ("The Names Of God"). Personal announcement, not a home-service business.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 0 in-window.

Total: 120 posts fetched, 5 in-window posts reviewed, 0 genuine business signals.

## Classification summary
- Business promos (home-service trade): 0
- Personal resale: 2 (leather purse, Ford F150)
- Personal shares (textless/media/links): 2 (Fruita empty share, bare Amazon link)
- Personal announcements: 1 (minister's book)
- ISO/demand posts in-window: 0
- Review/complaint threads in-window: 0
- Grand-opening / new-business radar hits: 0
- Hiring/growth signals in-window: 0
- Website/contact problem reports in-window: 0

## New genuine prospects
None. No home-service business promos, no trade service announcements, no hiring/growth signals, no grand-opening posts, no website/contact problems, no review-style complaints. No author identification needed (no qualifying posts).

## Observed-but-not-pursued
- Buy & Sell GJ purse and F150 listings: personal resale, ignored.
- Fruita empty share and Amazon link: no business content, ignored.
- Fruita minister's book announcement: personal, not a trade business, ignored.

## Repeat sightings
None (no pipeline business appeared in-window).

## Parked DM drafts
None (no new prospects; read-only scan).

## Dedupe
Nothing qualified, so no grep needed against leads.md / pipeline.md / facebook-dms.md / western-co-prospects.jsonl. Pipeline adds: NONE.

## Watermark
Old: 1790058601 (2026-09-22 00:30:01 MDT).
New: 1790073856 (2026-09-22 04:44:16 MDT, the max creation_time observed in-window).

## Notes for parent
- No pipeline.md changes needed. Nothing qualifies as a prospect.
- Zero-activity window consistent with the early-morning slot (~00:30 to ~05:20 MDT).
- DMs: 0 sent, 0 attempted (read-only; Messenger CLI not on this host, DM path Pig-only and parked). DM count: 0/10.
- Raw dumps: ~/workspace/outreach/scratch/scan114-<groupid>.json (6 files).
