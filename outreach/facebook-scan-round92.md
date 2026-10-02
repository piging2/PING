# Facebook delta-scan #92 (2026-09-19, morning window)

Read-only worker run. Watermark from round 91: 1789827441 (2026-09-19 08:17:21 MDT).
Scan executed: 2026-09-19 11:16-11:20 MDT. facebook-cli cloud session healthy (me = Nolan Geske).

## Coverage

73 in-window posts across 10 groups. 199 posts fetched total (20 per group, Fruita 19),
filtered locally on `creation_time` > watermark (126 pre-window fetched, not double-counted).
`--min-timestamp` was not used (unreliable per rounds 88/90). Watermark math verified against
sample posts (Living In GJ: 08:18 MDT in-window, 08:17:21 MDT boundary, prior-day posts excluded).

| Group | Fetched | In-window |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 20 | 6 |
| Buy & Sell in Grand Junction (108728816001912) | 20 | 20 |
| Delta, CO Community Message Board (1504277980997243) | 20 | 2 |
| Orchard Mesa, CO Message Board (486356801008208) | 20 | 1 |
| Fruita, CO Message Board (3741333852807065) | 19 | 16 |
| Living In Grand Junction Colorado (1082777608577867) | 20 | 4 |
| Colorado Business Networking (2803047646497352) | 20 | 19 |
| Colorado Business Mingle (5355730651191326) | 20 | 1 |
| What's Happening In Palisade / Business Board (2569745986668554) | 20 | 2 |
| Glenwood Springs Colorado Message Board (2370574193230682) | 20 | 2 |

## Posts observed

- WCMB: dealer listings (2022 Ford Bronco, 2021 Toyota Tacoma, Grand Junction Chrysler Dodge Jeep Ram),
  plant-based cinnamon-roll pop-up, permanent jewelry walk-ins (719 Pitkin Ave), throw pillows x2. All
  resale/food/jewelry, no trade business.
- Buy & Sell GJ: 20 personal resale posts (sit-stand desk, Hyundai Tucson, pickleball paddles, recliner,
  bracelet, Ryobi batteries, toy hauler, Transit Connect, MC cable, jacket, Milwaukee vacuum, garage sale,
  Nike shoes, tablet, marine batteries, floor mats). No trade business.
- Delta: Faithful Hands farmstand (food); one empty-caption post (unresolvable, no guessing).
- Orchard Mesa: Blessed Harvest Homestead farmstand (food). Not home-service trade.
- Fruita: farmers market promo, farm stand, Zen Den yoga event, missing/found dogs, kids lemonade + yard
  sale (999 Malachite Dr), sunrise photos, Eternal Flames sword-collection festival booth (craft vendor),
  misdelivered-package note, barber promo, Reckless Roadhouse event (DeBeque).
- Living In GJ: George Hall (job-seeking welder, $20/hr, no tools, takes bus), dad-and-son hauling startup
  (see repeat sighting), Sunshine Community open-market vendor call, Carbon Computers repair promo.
- COBizNet: Denver sales-recruiting (out of area), Curbside roll-off dumpster promo x2 (303-343-7096,
  Front Range), RE-investor vehicle-deduction content, fall-minis photographer, BLAZE AI Summit, vintage
  silk garment care, Front Range Creative Alliance, studio rental, 7 empty-caption posts.
- CO Business Mingle: 1 empty-caption post. Palisade: Fall Equinox Gala event, cookie pop-up. Glenwood:
  moving sale, McClure Pass road question.

## Verdict

0 new genuine home-service business prospects. 0 new-business radar hits. No demand or complaint
signals. One social.search author lookup was needed (Scott Rush, below). No DM drafts produced.

## Repeat sightings / out-of-scope dispositions

- **Scott Rush** (dad-and-son junk hauling startup) reposted in Living In GJ at 09:17 MDT
  (https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3439312039591067/);
  author scott.rush.7 resolved via social.search on the post_url; text-to 970-778-1219. Already
  pipeline NEW/WARM (round 52) and in leads.md. Vitality signal only; no duplicate row.
- Out-of-scope, intel only: Jackson haircut promo (barber, 141 S Mesa St Fruita Unit B, (970)296-4822);
  Carbon Computers repair promo (consumer tech, not blue-collar trade); Curbside dumpster x2
  (home-service-adjacent but Front Range, Denver-area deprioritized, no pipeline row).

## Tooling note

The task listed Colorado Business Networking as group 4075401619261942, but that ID returns HTTP 404.
It is a stale ID from round-90 prose (it was a COBizNet *post* ID). The correct group ID is
2803047646497352 (round-90 table), which works. Future rounds should use 2803047646497352.

## Watermark

New watermark: 1789838014 (2026-09-19 11:13:34 MDT, newest in-window post: Buy & Sell GJ floor-mats
post 3416060358602058, creation_time 1789838014 verified).
