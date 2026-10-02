# Facebook delta scan, round 64

- Watermark used: 1789524979 (2026-09-15 20:16:19 MDT, from round 63)
- Scan run: 2026-09-15 ~20:37 MDT
- New watermark: 1789525245 (2026-09-15 20:20:45 MDT)
- Total posts scanned since watermark: 3 (see per-group counts below)
- DMs: 0 sent, 0 attempted (read-only round by design)

## Posts scanned per group

| Group | Posts since watermark | Notes |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 0 | Quiet |
| Buy & Sell in Grand Junction (108728816001912) | 1 | Esther Jade's Ltd "Soursop Tincture" promo (20:20 MDT), repeat herbal-products seller |
| Buy & Sell in Delta (1504277980997243) | 0 | Quiet |
| Buy & Sell in Orchard Mesa (486356801008208) | 0 | Quiet |
| Buy & Sell in Fruita (3741333852807065) | 2 | Lost dove/pigeon post (19:53, below-watermark edge case already covered in round 63) + 1 empty post (20:16, no content) |
| Living In Grand Junction Colorado (1082777608577867) | 0 | Quiet |

## Signals found

No NEW home-service business prospects. No "grand opening", "now open", or "just launched" language anywhere in the window.

- **Esther Jade's Ltd** (repeat herbal-products seller, Buy & Sell GJ). Food/wellness, out of trade. Logged for the record only.
- The lost dove/pigeon post is a below-watermark edge case (creation_time 19:53, before the 20:16 watermark); it was already captured and logged in round 63's scan. No data loss, no double-count.

## Method note

The facebook-cli `groups posts` response nests posts under `data` (not `posts`); each post exposes `content`, `creation_time` (unix), and `post_url`. An earlier parser mistake in this round briefly reported 0s; corrected before writing this report. Future scans: parse `data`, not `posts`.
