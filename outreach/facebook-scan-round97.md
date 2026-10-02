# Facebook delta-scan #97 (round 97)

Window: creation_time > 1789881339 (2026-09-19 ~23:15 MDT) through 2026-09-20 ~02:15 MDT.
Route: facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789881339. Read-only; no DMs sent.

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 0 new posts. Sanity check (no-filter fetch, top 3): newest post 09-19 20:50, below watermark, already covered by round 96.
- Buy & Sell in Grand Junction (108728816001912): 20 new posts, all reviewed.
- Delta, Colorado Community Message Board (1504277980997243): 0 new posts. Sanity check: newest post 09-19 19:18, below watermark.
- Orchard Mesa, Colorado Message Board (486356801008208): 0 new posts.
- Fruita, Colorado Message Board (3741333852807065): 0 new posts.
- Living In Grand Junction Colorado (1082777608577867): 0 new posts.

Total: 82 in-window posts? No. 20 in-window posts reviewed, 0 above-watermark in 5 of 6 groups.

## New genuine prospects
None. All 20 Buy & Sell posts in-window are resale listings (vintage furniture, home decor, a blender, a "call for good time 970-778-2509" joke post). No home-service business promos, no trade service announcements, no hiring/growth signals, no grand-opening posts. No author identification needed because none qualified.

## Observed-but-not-pursued
- Buy & Sell 20 resale posts (furniture/decor resale, not home-service trades).
- "Call for good time 970-778-2509" (00:57 post): joke/spam content, no business.
- Zero-activity window is consistent with the time slot (Saturday night ~11pm to ~2am Sunday).

## Parked DM drafts
None (no new prospects, and this is a read-only scan).

## Watermark
Old: 1789881339 (2026-09-19 ~23:15 MDT).
New: 1789888188 (2026-09-20 01:09 MDT, the max creation_time observed in-window).

## Notes for parent
- No pipeline.md or facebook-dms.md changes needed. No dedup action required.
- Below-watermark posts in the two sanity-checked groups matched round 96's coverage exactly; the min-timestamp filter behaved correctly this round.
