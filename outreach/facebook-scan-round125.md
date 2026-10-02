# Facebook delta-scan #125 - 2026-09-23 13:30 MDT

Window: creation_time > 1790183857 (2026-09-23 11:17:37 MDT, round-124 watermark).
Method: `facebook-cli groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1790183857` per group, read-only (no DMs, no likes, no comments). All six groups returned cleanly, no errors.
Author resolution (social.search per post_url) was not needed: no genuine trade promo surfaced this window.

## Per-group fetched / in-window counts

| Group | Fetched | In-window |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 7 | 7 |
| Buy & Sell in Grand Junction (108728816001912) | 20 | 20 |
| Delta Colorado Community Message Board (1504277980997243) | 6 | 6 |
| Orchard Mesa Colorado Message Board (486356801008208) | 2 | 2 |
| Fruita Colorado Message Board (3741333852807065) | 6 | 6 |
| Living In Grand Junction Colorado (1082777608577867) | 4 | 4 |
| **Total** | **45** | **45** |

## Classification summary

- Trade business promos: 0
- New-business radar hits (grand opening / now open / just launched): 0
- Demand/ISO signals: 1 (Rollator walking-frame info ISO, Fruita; personal, not a business lead)
- Hiring/growth signals: 0
- Customer complaints: 0
- Service-business promos (non-trade, logged only): 3
  - The Bread Shed (bakery, 920 R Rd Mack; cross-posted Orchard Mesa + Fruita; already tracked in facebook-dms.md lines 506-507 = repeat sighting, enrichment only)
  - Unnamed arcade/pinball shop (Delta; dumplings + bottled sodas + pinball/skiball contest promo; no business name in post content, untrackable)
  - Unnamed "THIS FRIDAY" restaurant/local event (Living In GJ; "indoor + outdoor seating", no business name in content, untrackable)
- Non-trade promos noted: 1 (Bumkin Queen Vintage silver/turquoise jewelry, Market on Main GJ retail)
- Real estate: 2 (Coldwell Banker listing, GJ; Kokopelli Real Estate rental near CMU)
- Insurance testimonial (not trade, chain): 1 (Armando Tacos food truck shouting out Rodrigo Marquez, State Farm agent)
- Community: 3 (Fort Uncompahgre history post, Delta; Juniper Grove affordable-homes event, Fruita; Sprouts Wednesday deals tip, Fruita)
- Personal resale / garage sales: 25+ (freezer, garage sale w/ tools, loft bed, toilet, dealer car ads x3, bike trainer, FR shirts/pants x3, Consuela totes x2, wooden bench, bowling ball, John Deere tractor, Mazda3, chainsaw, socket set, ski rack, cowboy boots, screen-time class, weekend estate sale)
- Empty/unknown shares: 10 (no content to classify; noted, skipped)

## New-prospect evaluation

No genuine trade-business promo appeared in this window. Zero new prospects, so no dedupe search was needed and no author resolution was attempted.

Enrichment (round-121 durable rule: repeat sightings are enrichment, not new prospects):
- **The Bread Shed** (Mack bakery): repeat promo for Sat & Sun 9:00-4:00 at 920 R Rd. Already logged in facebook-dms.md (lines 506-507). Signal: still active, weekend cadence. Non-trade; no pipeline action.

Pipeline rows staged this scan: 0.

## NEW watermark

1790191490 (2026-09-23 13:24:50 MDT) - latest in-window creation_time, Buy & Sell in Grand Junction post id 3420444624830298 (stand-up freezer listing; Delta arcade promo post 1808581623900209 shares the same timestamp).

## DM counts

0 sent, 0 attempted this scan (read-only lane). Daily DM budget untouched: 0/10.
