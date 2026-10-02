# Facebook Delta-Scan Report — Round 70 (read-only)

- Window: 2026-09-16 ~14:14 to ~16:59 MDT (watermark 1789589628 to 1789599586)
- Groups: Western Colorado Message Board & Classifieds, Buy & Sell in Grand Junction, Delta, Orchard Mesa, Fruita, Living In Grand Junction Colorado
- Method: facebook-cli `groups posts`, NEW_POSTS sort, min-timestamp 1789589628, one page per group
- Read-only run: Pig in commute blackout since ~16:26 MDT. 0 DMs sent, 0 attempted. Facebook engagement stays Pig-only and parked.

## Post counts per group

| Group | In-window | Below-watermark leaks |
|---|---|---|
| WCMB (5456977881034408) | 1 | 1 (trunk-or-treat vendor call, 13:21) |
| Buy & Sell GJ (108728816001912) | 20 | 0 |
| Delta (1504277980997243) | 1 | 0 |
| Orchard Mesa (486356801008208) | 1 | 0 |
| Fruita (3741333852807065) | 11 | 0 |
| Living In GJ (1082777608577867) | 4 | 0 |
| **Total** | **38** | **1** |

Total 39 posts returned; 38 in-window, 1 below-watermark API leak.

## New genuine home-service prospects: 0

No plumbing, electrical, HVAC, roofing, cleaning, landscaping, tree care, fencing, or other home-service business promos in this window.

## New-business radar hits: 0

- Living In GJ (16:31): "A new, fun boutique experience in Grand Junction ... JUST arrived", Parkwood Plaza 1000 N 9th St #7, 12+ local artists, houseplants. Retail boutique, out of trade. Not pursued; noted as intel (new retail opening signal only).

## Out-of-trade sightings (intel only)

- WCMB (15:40): Palisade home listing, "YOUR PALISADE ESCAPE JUST GOT BETTER", $ reduced, .86 irrigated acres, saltwater pool. Real estate, not pursued.
- WCMB (13:21, below-watermark leak): trunk-or-treat vendor call for Oct 30. Community event recruitment, not a prospect. Seasonal vendor-contact event noted.
- Fruita (16:23): free community run club 6pm tonight, all ages. Community, not pursued.
- Fruita (16:31) / Living In GJ (16:30): VanWinkle Ranch cattle-herding post (cross-posted). Ranch, not pursued.
- Fruita (15:01): Pig-A-Sus Homestead potbelly pig rescue fundraiser plea (Mack). Nonprofit, not pursued.
- Fruita (14:39): Fruita Farmers Market free wagon rides Saturday 9:30-11:30. Community, not pursued.
- Fruita (14:16): "sport leis" ask, buyer looking for a local FMHS sports lei maker. Craft-service demand, out of trade; demand signal only.
- Living In GJ (16:41): rainy-weekend movie night moved to Oct 9, next movie Sept 26. Community, not pursued.
- Living In GJ (15:17): September storms photo. Not a signal.
- Buy & Sell GJ: all 20 posts personal resale (drill press, truck rack, 2008 Audi S6, 2020 Hyundai Palisade, Masters of the Universe figures, roof vents (just parts resale, not a business), garden tiller, edible ink cartridges, free moving boxes, Toyota Tacoma/Tundra/BMW X5 (auto retail), 2008 Innovation ATV trailer, Fordson diesel tractor, Palisade rental house, animal cage, Gold Crown VI pool table, recliner/rocker, open house Sun 1-3pm, t-shirts). None are home-service business promos.

## Demand signals: none actionable

- Fruita (14:16): craft-service ask (sport leis), out of trade.

## Complaint signals: none actionable

## Unresolvable posts (empty caption, author stripped, logged without guessing)

- Delta 1802526204505751 (16:05)
- Orchard Mesa 1108071378836744 (16:07)
- Fruita 4468715713402205 (16:59)
- Fruita 4468711330069310 (16:51)
- Fruita 4468681176738992 (15:58) — has 2 comments; checked: comments are a personal pet-inquiry thread (chihuahua), not a business promo
- Fruita 4468658630074580 (15:19)
- Fruita 4468624733411303 (14:32)
- Fruita 4468622006744909 (14:27)

Per hard rule, no author resolution attempted on empty-caption posts (social.search resolution reserved for genuine business-promo posts), and none were guessed.

## Dedup

No candidates surfaced, so no dedup against leads.md, pipeline.md, or facebook-dms.md was required.

## Watermark

New watermark: 1789599586 (Fruita post 4468715713402205, 2026-09-16 16:59 MDT). Previous watermark: 1789589628.

## DMs

0 sent, 0 attempted. Read-only run per round-70 directive (Pig commute blackout).
