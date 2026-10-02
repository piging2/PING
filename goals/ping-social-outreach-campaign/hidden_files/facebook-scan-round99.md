# Facebook delta scan — round 99
Date: 2026-09-20 ~08:20 MDT. Read-only run (no sends, no likes, no comments, no DMs).
Prior watermark: 1789901322 (2026-09-20 04:48 MDT). New watermark: 1789913519 (2026-09-20 08:11 MDT).

## Method
- facebook-cli `groups posts --group-id <id> --sort-by NEW_POSTS --limit 20` across the 6 Western Colorado groups, then local filter on creation_time > watermark 1789901322. One page per group, 120 posts fetched total.
- Groups: Western Colorado Message Board & Classifieds (5456977881034408), Buy & Sell in Grand Junction (108728816001912), Delta (1504277980997243), Orchard Mesa (486356801008208), Fruita (3741333852807065), Living In Grand Junction Colorado (1082777608577867).
- Empty-caption posts resolved via social.search post_url (works on community groups; author exposure fine this round).

## In-window posts: 19
| Group | Posts | Content summary |
|---|---|---|
| WCMB | 3 | Doughbra's Stand sourdough promo; purple heart potted plants resale; empty caption (Doughbra's Stand sourdough carousel, Cassi RossGeske) |
| Buy & Sell GJ | 8 | Personal resale: Toro mower, springer front end ($1,200, 81416), 33" tires, 18" wheels trade, purple heart plants; Doughbra's Stand sourdough x3 |
| Delta | 0 | (20 fetched, all pre-window) |
| Orchard Mesa | 2 | Doughbra's Stand sourdough cross-post; empty caption (Ellis Hovey, unresolvable) |
| Fruita | 5 | Doughbra's Stand sourdough x2; VanWinkle Ranch nature share; lost-pets help post; empty caption (Susan Rawlins, non-business) |
| Living In GJ | 1 | VanWinkle Ranch nature share |

## Judgment
- **Genuine home-service business signals: 0.** No service promos, no openings, no hiring/growth signals, no complaints, no website/contact problems from trade businesses.
- **New-business radar hits: 0.** No grand-opening / now-open / just-launched trade posts.
- **New prospects added to pipeline.md: 0.** Nothing to dedupe (leads.md, pipeline.md, facebook-dms.md untouched for additions).

## Notable sightings (intel only, not added)
- **Doughbra's Stand** (sourdough cottage food; Cassi RossGeske, 3101 Applewood St, Grand Junction 81506): genuine small business, 7 cross-posts across 4 groups this window. Out of trade segment (cottage food, not home-service). Not added.
- **VanWinkle Ranch** (tags on nature/lifestyle shares in LivingGJ + Fruita): lifestyle content, no trade promo. Not a prospect.
- **Ellis Hovey** (Orchard Mesa 1111239381853277): empty-caption post with thumbnail only; content unresolvable; logged without guessing. Not prospect-grade.
- Buy & Sell GJ resale volume is heavy as usual (mower, auto parts, plants) — all personal resale.

## Channel state
- facebook-cli cloud session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 0 parked. DM daily count: 0/10.
- Watermark advance: 1789901322 -> 1789913519.

## Notes for the main engine
- Sunday-morning window behaving as expected: quiet, resale-dominated, cottage-food cross-posting. No action needed beyond cadence.
- Next round covers posts newer than 1789913519 (2026-09-20 08:11 MDT).
