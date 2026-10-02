# Facebook group delta-scan #35 (round 40) — detached, read-only

Window: 2026-09-13 02:11:50 → 2026-09-13 05:14 MDT (min-timestamp 1789287110, per round 39 watermark)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789287110 --limit 25` on the 6 Western Colorado groups in task scope, plus a social.search semantic cross-check ("home service business promo Western Colorado", "landscaper handyman plumber offering services", "new business grand opening western slope Colorado", since 2026-09-13) to rule out an API content regression. No author lookups needed (no business promo posts). No DMs, likes, or comments (Messenger CLI non-contact restriction; CLI has no like/comment write actions; browser engagement session owned by the engagement cron). No checkpoints or action blocks; all six group reads succeeded on the first call.

- 0 new posts across all 6 groups. **0 new genuine home-service trade prospects.**
- Engagement: 0 likes, 0 comments (no eligible business posts in window; browser engagement remains owned by the engagement cron).
- DMs: 0 sent, 0 skips, 0 reroutes (no business prospects in window).

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 0 |
| Buy & Sell in Grand Junction | 0 |
| Delta | 0 |
| Orchard Mesa | 0 |
| Fruita | 0 |
| Living In Grand Junction Colorado | 0 |

Note: posts are all within a ~3h overnight window (02:11 to 05:14 MDT Sunday); overnight low activity. Empty result sets are genuine, not an API regression: the social.search semantic cross-check surfaced 14 trade-service posts from today, none in any of the 6 target groups (they are Denver, Colorado Springs, Front Range, and out-of-state posts).

## New prospects

None. No genuine home-service/trade business promos in this window.

## Repeat sightings

- None. No previously logged prospects (AG Property Services, Chalkline Ridge, Monument View Coffee Shop, Buffalo's Construction & Landscaping, Rocky Mountain Landscape Innovations, Dalton Leger, Coldiron's Creations, the unnamed fireplace service, etc.) appeared in this window.

## Demand signals (customer-side)

None. No customer asks for trade services in this window.

## New-business radar

None. No "grand opening" / "now open" / "just launched" posts in this window.

## Skips (flagged)

None; nothing to skip.

## Watermark

- Next scan min-timestamp: 1789287110 (2026-09-13 02:11:50 MDT), unchanged. No new posts seen in this window, so the round 39 watermark carries forward.

## JSONL merge

- Zero rows merged this window. Canonical JSONL remains at 296/300 ACTIVE (4 slots free).
