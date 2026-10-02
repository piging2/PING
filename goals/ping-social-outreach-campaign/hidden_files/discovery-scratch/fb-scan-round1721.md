# FB delta-scan round 1721 (discovery-research lane, read-only)

- Scan window: 2026-09-24 ~07:21/07:23 MDT (watermark 1790256220) through 2026-09-24 11:26 MDT.
- Method: `facebook-cli groups posts --group-id <id> --sort-by NEW_POSTS --limit 20|30`, full-content triage of every in-window post. Below-watermark API leaks noted as scannable-but-not-double-counted per standing practice.
- **New watermark: 1790270774 (2026-09-24 11:26 MDT).**
- NEW CANDIDATES: **0**. 0 genuine untracked home-service trade promos in-window.

## Per-group counts (fetched / in-window / below-watermark)

| Group | ID | Fetched | In-window | Below WM |
|---|---|---|---|---|
| Western Colorado Message Board & Classifieds | 5456977881034408 | 20 | 3 | 12 |
| Buy & Sell in Grand Junction | 108728816001912 | 20 | 20 | 0 |
| Delta, Colorado Community Message Board | 1504277980997243 | 20 | 7 | 13 |
| Orchard Mesa, Colorado Message Board | 486356801008208 | 20 | 1 | 19 |
| Fruita, Colorado Message Board | 3741333852807065 | 20 | 12 | 8 |
| Living In Grand Junction Colorado | 1082777608577867 | 20 | 2 | 18 |
| Colorado Business Networking | 2803047646497352 | 20 | 20 | 0 |
| Colorado Business Mingle | 5355730651191326 | 20 | 3 | 17 |
| What's Happening In Palisade / Business Board | 2569745986668554 | 20 | 1 | 19 |
| Glenwood Springs Colorado Message Board | 2370574193230682 | 20 | 0 | 20 |
| **Total** | | **200** | **68** | **132** |

## Candidates (NEW): none

## Repeat sighting (in-window, already tracked, no new row)

- **Abbotts Cleanup & Restoration** | water damage restoration / mold remediation | Denver (303) 975-4000, GoAbbotts.com
  - Post: https://facebook.com/groups/2803047646497352/permalink/4082024048599699/ (~10:25 MDT, water-loss education promo, cc=0)
  - Dedupe: leads.md#823; pipeline.md#435 (DRAFTED, round-6 orphaned draft); facebook-dms.md#1794 (repeat sightings, vitality signals). Repeat sighting logged as vitality signal only. No author resolution needed (already tracked).

## Below-watermark observations (scannable, not double-counted)

- Delta handyman promo (id 1808595000565538, 09-23 13:48): "Serving delta hotchkiss cederage and Olathe we will do simple repairs yard work maintenance cleaning junk removal will do some plumbing and mechanical repair... $25 quote fee." No business name; below watermark, in prior window's territory.
- Palisade haul-it post (id 4124007831242354, 09-23 17:10, 970-901-7956, "haul it all... $120+"): **repeat sighting of High Desert Haulers and Junk Removal** (pipeline.md#1036, Montrose/Delta territory). Already tracked.
- Glenwood aeration promo (id 4484949625126451, 09-22 08:35): core aeration Oct 2-4 + overseeding. No business name in snippet; below watermark. (Aeration segment context already in pipeline.md round-100 notes.)
- CO Business Mingle log-home maintenance post (id 28184436257894108, 09-23 16:09): "Protect Your Log Home Before Winter Arrives." Below watermark; log-home segment already anchored by Pencil Log Pros (leads.md#3489).

## New-business radar: none

In-window Palisade opening ("We open Friday, September 25th... 4182 Highway 50 in Whitewater") is a bakery/food business: https://facebook.com/groups/whatshappeningpalisade/permalink/4124833351159802/ — out of segment.

## Demand signals (market intelligence, not prospects): none

- Glenwood below-watermark "Looking for a recommendation on a good auto repair shop" (12 comments) is auto, not a home-service trade, and below watermark. No in-window homeowner trade asks this round.

## Observed-but-not-pursued one-liners

- COBizNet in-window is heavily Front Range / out-of-geography B2B this round: Sanchely Services LLC (bathroom cleaning, Denver 720-206-9271), Centennial State Insurance Agency (303-838-0554), OKC Platform Partners (social media B2B), Massage & Wellness Pueblo, Mae Mae's (Colorado Springs bakery), Boulder realtor, #duh contractor engagement-bait (no business identity).
- Abbotts Cleanup & Restoration repeat promo confirms Denver water-restoration shops still push mold/water-loss education angles on COBizNet; already-tracked.
- Buy & Sell GJ: 20/20 in-window posts are pure resale (furniture, tools, trailer, mattresses, Bobcat excavator resale by individual).
- WCO Message Board: in-window = permanent jewelry walk-ins (beauty, skip), yard sale, Christmas ornaments resale.
- Fruita in-window: hay for sale (ag), resale, community announcements; no trade promos.
- Delta in-window: Thai food vendor at Cedaredge Applefest, yard sale, realtor listing, 4 empty-caption posts (nothing).
- Palisade in-window: bakery opening only. Orchard Mesa in-window: farmstand menu update. Mingle in-window: loaded-tea MLM link + empties. Living In GJ in-window: "No HOA!!!" (real-estate flavored) + one empty post.
- Hiring/growth signals: none in-window. Complaint threads: none in-window.

## Watermark

- Old: 1790256220 (~07:21/07:23 MDT 2026-09-24). New: **1790270774 (2026-09-24 11:26 MDT)** = max creation_time observed across all 10 groups.
- No DMs sent, no pipeline/leads/facebook-dms.md/JSONL mutations (read-only round).
