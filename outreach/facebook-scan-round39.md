# Facebook group delta-scan #34 (round 39) — detached, read-only

Window: 2026-09-12 22:45:23 → 2026-09-13 02:14 MDT (min-timestamp 1789274723, per round 38 watermark)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789274723 --limit 25` on the 6 Western Colorado groups in task scope. No author lookups needed (no business promo posts with stripped identity; the only promo is a photographer creative service). No DMs, likes, or comments (Messenger CLI non-contact restriction; CLI has no like/comment write actions; browser engagement session owned by the engagement cron). No checkpoints or action blocks; all six group reads succeeded on the first call.

- 8 new posts across 6 groups. **0 new genuine home-service trade prospects.**
- Engagement: 0 likes, 0 comments (no eligible business posts in window; browser engagement remains owned by the engagement cron).
- DMs: 0 sent, 0 skips, 0 reroutes (no business prospects in window).

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 1 (Autumn Portraits $150 photographer promo, 81505, cross-posted) |
| Buy & Sell in Grand Junction | 7 (Autumn Portraits cross-post; personal resale: women's shoes x3 listings, 1999 Chrysler 300M $2,745, 2 empty-caption posts) |
| Delta | 0 |
| Orchard Mesa | 0 |
| Fruita | 0 |
| Living In Grand Junction Colorado | 0 |

Note: posts are all within a ~4h overnight window (23:25 to 02:11 MDT); low activity, no mid-window pagination gap (max 7 posts in any group, under the 20-per-page API limit).

## New prospects

None. No genuine home-service/trade business promos in this window.

## Repeat sightings

- **Coldiron's Creations and Property Service**: not sighted (Delta had zero new posts; statewide groups out of scope). The round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked, no re-draft without a genuinely new post.
- **Memphis Auto Spa, RG Resin, Monument View Coffee Shop**: not in the 6 scanned groups this window. Monument View remains excluded from DM actions per the standing rule.

## Demand signals (customer-side)

None. No customer asks for trade services in this window.

## New-business radar

None. No "grand opening" / "now open" / "just launched" posts in this window.

## Skips (flagged)

- **Autumn Portraits** (WCMB&C + Buy & Sell GJ, cross-post, 23:58 MDT): $150 fall portrait sessions on the Western Slope. Creative/photography service, out of home-service segment per task rules. Skipped.
- Empty-caption posts (Buy & Sell GJ, 23:25 and 02:11 MDT): no business content, no contact, no signal. Skipped.
- Personal resale: 3 women's shoe listings ($10-$100, Redlands/81501), 1999 Chrysler 300M $2,745 (81507). All skipped.

## Watermark

- Next scan min-timestamp: 1789287110 (2026-09-13 02:11:50 MDT), newest post seen this window.

## JSONL merge

- Zero rows merged this window. Canonical JSONL remains at 296/300 ACTIVE (4 slots free). Additions file intentionally empty (no genuine prospects, none of the skipped posts meet the quality bar).
