# Facebook delta-scan #113 (round 113)

Window: creation_time > 1790052866 (2026-09-21 22:54:26 MDT) through ~02:20 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20 x6 (no --min-timestamp, local filter per rounds-88/90 unreliability). Read-only; no DMs sent.

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, newest 20:44:56 MDT (below watermark). 0 in-window.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched. 2 in-window:
  (1) 23:51:06 MDT — "I am selling this surround sound for $200 if anyone's interested" (personal resale).
  (2) 23:50:46 MDT — Broncos season tickets resale (Rams 9/27 $240, Chiefs 11/1 $245, Section 525 row 9).
  Neither is a business promo.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, newest 18:56:14 MDT. 0 in-window.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, newest 20:10:51 MDT. 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 20 fetched, newest 22:13:26 MDT (below watermark). 0 in-window.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched. 1 in-window:
  00:30:01 MDT — textless entshare media post by Ray Mathis (post read confirmed: media_type entshare, empty content, 0 comments, 0 reactions). Personal share, no business content.

Total: 120 posts fetched, 3 in-window posts reviewed, 0 genuine business signals.

## Classification summary
- Business promos (home-service trade): 0
- Personal resale: 2 (surround sound, Broncos tickets)
- Personal shares (textless/media): 1 (Ray Mathis entshare)
- ISO/demand posts in-window: 0
- Review/complaint threads in-window: 0
- Grand-opening / new-business radar hits: 0

## New genuine prospects
None. No home-service business promos, no trade service announcements, no hiring/growth signals, no grand-opening posts, no website/contact problems, no review-style complaints. No author identification needed (no qualifying posts; the one personal-media post was already resolved via post read).

## Observed-but-not-pursued
- Buy & Sell GJ surround-sound and Broncos-ticket listings: personal resale, ignored.
- Living In GJ Ray Mathis entshare: textless personal share, ignored.

## Repeat sightings
None (no pipeline business appeared in-window).

## Parked DM drafts
None (no new prospects; read-only scan).

## Dedupe
Nothing qualified, so no grep needed against leads.md / pipeline.md / facebook-dms.md / western-co-prospects.jsonl. Pipeline adds: NONE.

## Watermark
Old: 1790052866 (2026-09-21 22:54:26 MDT).
New: 1790058601 (2026-09-22 00:30:01 MDT, the max creation_time observed in-window).

## Notes for parent
- No pipeline.md changes needed. Pipeline-adds scratch file contains NONE.
- Zero-activity window consistent with the overnight time slot (~23:00 to ~00:30 MDT).
- DMs: 0 sent, 0 attempted (read-only; Messenger CLI not on this host, DM path Pig-only and parked). DM count: 0/10.
- Raw dumps: /tmp/scan113-<groupid>.json (6 files).
