# Facebook group delta-scan #36 (round 41) — detached, read-only

Window: 2026-09-13 02:11:50 → 2026-09-13 08:14 MDT (min-timestamp 1789287110, carried forward from round 40)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789287110 --limit 25` on the 6 Western Colorado groups in task scope, plus a cross-check for API regression. social.search timed out at the subprocess level (infrastructure error, not retried); fallback was a browser.search semantic cross-check ("home service business grand opening promo western Colorado slope September 2026", since 2026-09-13), which surfaced only press releases, no social promo posts. The facebook-cli calls themselves returned 20 genuine new posts across 5 groups, so this is not an API regression: the window simply has no home-service trade promos. No author lookups needed (no business promo posts). No DMs, likes, or comments (CLI has no like/comment write actions; browser engagement owned by the engagement cron; Messenger CLI contact restriction). No checkpoints or action blocks; all six group reads succeeded on the first call.

- 20 new posts across the 6 groups. **0 new genuine home-service trade prospects.**
- Engagement: 0 likes, 0 comments (no eligible business posts in window; browser engagement remains owned by the engagement cron).
- DMs: 0 sent, 0 skips, 0 reroutes (no business prospects in window).

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 3 |
| Buy & Sell in Grand Junction | 10 |
| Delta | 3 |
| Orchard Mesa | 0 |
| Fruita | 3 |
| Living In Grand Junction Colorado | 1 |

Morning traffic (02:11 to 08:14 MDT Sunday). All 20 posts fall into: for-sale marketplace listings (tool locker, dining set, wolf print, deco frame, Stihl trimmer, camper, couch, fireworks, cat hooks), one heavily cross-posted honor-system sourdough stand, personal-life posts, and two business-announcement one-liners.

## New prospects

None. No genuine home-service/trade business promos in this window.

## Repeat sightings

- Doughbra's Stand (honor-system sourdough farm stand, 3101 Applewood St, Grand Junction 81506, open-until-sold-out model, owner working toward college tuition goals): cross-posted 4 times in this window (3x Western Colorado Message Board & Classifieds, 1x Buy & Sell in Grand Junction, 1x Fruita). Food/micro-stand, not a home-service trade business, so no prospect record; noted as repeat cross-post activity only.

## Demand signals (customer-side)

None. No customer asks for trade services in this window. (The Delta group's Eckert-area horse work-exchange post is a personal volunteer-style offer, not customer demand for a trade service.)

## New-business radar

None. No "grand opening" / "now open" / "just launched" posts in this window.

## Skips (flagged)

- Aila Thai Kitchen hours notice (Delta group): restaurant hours announcement, not a home-service trade business. Skipped, no prospect fit.
- "Small business Sunday" mod prompt (WC Message Board, posted 2026-09-12 07:55, surfaced outside the min-timestamp window): a call for businesses to post in comments, not a promo itself. No business detail; skipped.
- Ranch-life reflection post (#seejaneranch, Living In Grand Junction): personal agribusiness lifestyle content, not a service offering. Skipped.
- Eckert horse work-exchange post (Delta): personal request. Skipped.
- All marketplace sale listings (Buy & Sell in Grand Junction, 9 of 10 posts): private sellers, not businesses. Skipped.

## Watermark

- Next scan min-timestamp: 1789308145 (2026-09-13 08:02:25 MDT), the newest post seen this window (tool locker listing, Buy & Sell in Grand Junction).

## JSONL merge

- Zero rows merged this window. No new prospects to record.
