# Facebook delta-scan #124 - 2026-09-23 11:20 MDT

Window: creation_time > 1790172971 (2026-09-23 08:16:13 MDT, round-123 watermark).
Method: `facebook-cli groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1790172971` per group, read-only (no DMs, no likes, no comments).
Author resolution (social.search per post_url) was not needed: no genuine trade promo surfaced this window.

## Per-group fetched / in-window counts

| Group | Fetched | In-window |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 0 | 0 |
| Buy & Sell in Grand Junction (108728816001912) | 20 | 20 |
| Delta Colorado Community Message Board (1504277980997243) | 4 | 4 |
| Orchard Mesa Colorado Message Board (486356801008208) | 0 | 0 |
| Fruita Colorado Message Board (3741333852807065) | 19 | 19 |
| Living In Grand Junction Colorado (1082777608577867) | 3 | 3 |
| **Total** | **46** | **46** |

## Classification summary

- Trade business promos: 0
- New-business radar hits (grand opening / now open / just launched): 0
- Demand/ISO signals: 1 personal (ground beef ISO, Fruita; not a business lead)
- Hiring/growth signals: 0
- Customer complaints: 0
- Service-business promos (non-trade, logged only): 1 (TCR Spa, Delta, see below)
- Non-trade promos noted: 3 (The Barn Boutique retail mention, Fruita; custom pet-portrait painting promo, Fruita; car-dealership salesperson ad, Buy & Sell GJ)
- Personal resale: 20 (Buy & Sell GJ: 1991 Honda Accord, 2007 Nissan Murano, 2019 4Runner dealer ad, Ryobi table saw, Husqvarna/Murray mowers, jackets, tops, watch, futon pads, windows, bookshelf, steam press, electric fireplace, Arctic Cat ATV, boat prop, Spyder/Hoka apparel, Fruita yard sale)
- Community/personal: 7 (Mountain Harvest Festival + Colorado Crystal Curio mention, Delta; best-coffee-on-Western-Slope question, Fruita; fall colors ask, Fruita; rock hounds, Fruita; real estate tour, KAFM event, Movies Under the Stars, Living In GJ)
- Operations notice: 1 (Burger King Fruita fryer closure, not outreach-relevant)
- Empty/unknown shares: 12+ (no content to classify; noted, skipped)

## New-prospect evaluation

One genuine new sighting, NOT staged to pipeline:

**TCR Spa** (back facial / esthetician services, Delta CO). Post id 1808403993917972, 09:12 MDT, Delta group: "looking to expand my back facial clientele... DM me or call TCR Spa: (970)-874-6529".

Dedupe grep evidence (run 2026-09-23 11:20 MDT):
- `grep -i -n "TCR" leads.md pipeline.md facebook-dms.md` -> only false positive `mci@maysconcrete.com` (email substring); zero TCR business hits.
- `grep -ril "tcr spa" .` across ~/workspace/outreach/ -> zero hits.
- Conclusion: genuinely NEW sighting, no prior record (round-121 lesson applied; no repeat-sighting claim).

Why not staged: web verification unresolved as an independent business; TCR strongly matches Technical College of the Rockies (1765 Highway 50, Delta, whose Discover TCR campus event advertises an open salon/spa/barbershop), i.e. a public-institution clinic, not an independent owner-operated shop. Beauty/spa is also outside the blue-collar home-service target. Fails the pipeline quality bar (no clear trade fit, no independent owner-operator signal). Logged in facebook-dms.md as a service-promo sighting only.

Pipeline rows staged this scan: 0.

## NEW watermark

1790183857 (2026-09-23 11:17:37 MDT) - latest in-window creation_time, Buy & Sell in Grand Junction post id 3420337234841037 (1991 Honda Accord).

## DM counts

0 sent, 0 attempted this scan (read-only lane). Daily DM budget untouched: 0/10.
