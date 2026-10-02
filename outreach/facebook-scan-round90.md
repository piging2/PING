# Facebook delta-scan #90 (2026-09-19, pre-dawn window)

Read-only worker run. Watermark from round 89: 1789804653 (2026-09-19 01:57 MDT).
Scan executed: 2026-09-19 05:17-05:20 MDT. facebook-cli cloud session healthy (me = Nolan Geske).

## Coverage

10 in-window posts across 10 groups. **Note:** the `--min-timestamp` filter returned 0 for all
groups this run (it is unreliable with `--sort-by NEW_POSTS`; same class of issue as round 88), so
the fallback was unfiltered fetches (20 posts per group) filtered locally on `creation_time` >
watermark. 200 posts fetched total, 10 in-window, 0 double-counted.

| Group | Fetched | In-window |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 20 | 0 |
| Buy & Sell in Grand Junction (108728816001912) | 20 | 5 |
| Delta, CO Community Message Board (1504277980997243) | 20 | 1 |
| Orchard Mesa, CO Message Board (486356801008208) | 20 | 0 |
| Fruita, CO Message Board (3741333852807065) | 20 | 3 |
| Living In Grand Junction Colorado (1082777608577867) | 20 | 0 |
| Colorado Business Networking (2803047646497352) | 20 | 1 |
| Colorado Business Mingle (5355730651191326) | 20 | 0 |
| What's Happening In Palisade / Business Board (2569745986668554) | 20 | 0 |
| Glenwood Springs Colorado Message Board (2370574193230682) | 20 | 0 |

## Posts observed

- Buy & Sell GJ (05:07) backpack resale $200 (Zpacks Nero); (03:46) handmade wooden game-day whistle $5;
  (03:40) handmade wooden train whistle $5; (03:35) handcrafted wooden bench/table/TV stand $50 (Grand
  Junction, handmade); (03:15) handmade fire starters $6 pack. All personal/craft resale, no trade business.
- Delta (03:44) post 1804653994292972: empty caption/content, author stripped by CLI. Unresolvable, no guessing.
- Fruita (05:15) 4471352616471848: "Happy Saturday from the Western Slope..." (no business content);
  (04:50) 4471333963140380: thumbs-up emoji only; (03:57) 4471293639811079: missing female dog "Sissy",
  chipped, no collar (community post, not business).
- COBizNet (02:37) 4075401619261942: **Colorado Bin Squatch** veteran-owned trash-bin washing promo,
  phone 720-436-6036, www.coloradobinsquatch.com. **Repeat sighting** — already pipeline NEW since
  delta-scan #77 (2026-09-17, Denver-area deprioritized intel, tagged Highlands Ranch). New post ID is a
  re-promotion of the same business; mild vitality signal. No new pipeline entry, no DM (no channel).

## Verdict

0 new genuine home-service business promos. 0 new-business radar hits. No demand or complaint signals.
No social.search author lookups were needed (no new trade promos); no DM drafts were produced.
facebook-cli healthy; messenger CLI not present on this host (DM channel remains Pig-only, parked).

## Watermark

New watermark: 1789816550 (2026-09-19 05:15 MDT, newest in-window post: Fruita "Happy Saturday" post
4471352616471848).
