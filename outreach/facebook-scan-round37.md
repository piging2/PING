# Facebook group delta-scan #32 (round 37) — detached, read-only

Window: 2026-09-12 17:12 → 20:10 MDT (min-timestamp 1789254734, per round 36 watermark)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789254734 --limit 25` on the 6 Western Colorado groups in task scope. Empty-caption and one-liner posts resolved via `social.search` post_url author lookups. No DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron).

Note: the statewide groups (Colorado Business Networking, Colorado Business Mingle, What's Happening In Palisade, Glenwood Springs Colorado Message Board) were out of scope for this delta per the task's group list. Repeat sightings normally tracked there (Memphis Auto Spa, Coldiron's Creations, RG Resin) are not expected in this window.

- 37 new posts across 6 groups. **0 new genuine home-service trade prospects.**
- 6/6 social.search post_url lookups successful (5 empty-caption, 1 one-liner).
- No DMs sent, no likes/comments.

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 7 (all personal resale) |
| Buy & Sell in Grand Junction | 20 (all personal resale; hit the 20-per-page API limit; mid-window posts may exist below the page) |
| Delta | 0 |
| Orchard Mesa | 3 (all empty-caption, authors resolved) |
| Fruita | 5 |
| Living In Grand Junction Colorado | 2 (both empty/one-liner, authors resolved) |

## New prospects

None. No genuine home-service/trade business promos in this window.

## Empty-caption / one-liner author resolutions (6/6, all skipped)

- **YAP- Grand Junction** (Orchard Mesa, 19:28 MDT, empty caption): "The Grand Valley's premier performance facility. Strength, Speed & Agility Development for committed athletes." Athletic performance/fitness, not a home-service trade. Skipped.
- **Denice Simmons** (Orchard Mesa, 19:22 MDT, empty caption): personal profile, 1 follower, no business bio. Skipped.
- **Audrey Lynn Singer** (Orchard Mesa, 17:27 MDT, empty caption): personal profile, 100 followers, no business bio. Skipped.
- **Jason Dean Clemente** (Fruita, 17:36 MDT, empty caption): personal profile, bio about being a father, no business. Skipped.
- **Palisade Nazarene Quilters** (Living In GJ, 19:51 MDT, "Just a little tease!!"): church quilting group, community organization, not a business. Skipped.
- **Barry Stevenson** (Living In GJ, 18:10 MDT, empty caption): Emmy award-winning video creator for nonprofits. Creative/marketing service, not a home-service trade. Skipped.

## Repeat sightings

- **Coldiron's Creations and Property Service**: not sighted in this window (Delta group had zero new posts; statewide groups out of scope). The round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked (no contact-capable DM channel; do not re-draft without a genuinely new post).
- **Memphis Auto Spa**, **RG Resin**, **Monument View Coffee Shop**: not in the 6 scanned groups this window. No action; Monument View remains excluded from DM actions per the standing rule.

## Demand signals (customer-side, not prospects)

- Buy & Sell GJ 19:21 MDT: someone asking who the man selling bee pollen at the downtown farmers market was (looking to buy). Agriculture/food vendor query, not a home-service trade. Signal/unverified.

## New-business radar

- None. No grand-opening or new-business trade posts in this window.

## Notable skips (with reasons)

- **Heinemann Images** (Fruita, Tour of the Moon event photography promo with heinemann-images.mypixhome.com / Heinemannimages.com): legitimate local creative business but photography is out of the home-service trade segment. Skipped.
- LG RESU16H solar battery resale (Buy & Sell GJ): personal equipment resale post, no business name or service offered. Not a business promo.
- Southbend lathe, APEC RO system, camper, Pokemon cards, GI Joes, suitcase, vehicles, appliances, furniture (Buy & Sell GJ + WC Message Board): personal resale. Skipped.
- GJ Outlawz cookie fundraiser (Fruita): fundraiser, not a business. Skipped.
- Boxes request, remote job search (Fruita): personal posts. Skipped.
- real estate open house: not in this window's Fruita posts; the 5 posts were the photography, boxes, fundraiser, job search, and the empty-caption resolution above.

## Watermark

- Max post timestamp seen: 1789265418 (2026-09-12 20:10 MDT, Buy & Sell GJ metal tin resale post). Next scan should use min-timestamp 1789265418.
