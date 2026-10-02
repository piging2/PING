# Facebook delta-scan round 82
Date: Fri 2026-09-18 ~05:18 - ~05:21 MDT (11:18 - 11:21 UTC 2026-09-18)
Watermark used: 1789713554 (Fri 2026-09-18 00:39 MDT)
New watermark: 1789730438 (Fri 2026-09-18 ~05:20 MDT)

## Coverage
Posts scanned: 4 in-window across 8 groups (0 below-watermark API leaks)
- Western Colorado Message Board & Classifieds (5456977881034408): 0
- Buy & Sell in Grand Junction (108728816001912): 1
- Delta (1504277980997243): 0
- Orchard Mesa (486356801008208): 0
- Fruita (3741333852807065): 3
- Living In Grand Junction Colorado (1082777608577867): 0
- Colorado Business Networking (2803047646497352): 0
- Colorado Business Mingle (5355730651191326): 0

Quiet overnight window: only 4 in-window posts across all 8 groups; the two expansion groups produced zero.

## Result: no new genuine home-service trade prospects

No new prospects. The only business-authored in-window post is a repeat sighting of an existing pipeline prospect (see dedup note).

## DMs
No DMs sent (read-only run per task directive). Nothing parked (only repeat sighting; existing parked DM draft for 2nd Time Around Co stands).

## Radar hits
None. No "grand opening" / "now open" / "just launched" posts from genuine trade businesses in this window.

## Demand signals
None actionable. No buyer asks, no complaint threads in window.

## Observed but not pursued
- 2nd Time Around Co photo-only sale listing, Buy & Sell in Grand Junction (3414600818748012, 03:07 MDT). Author resolved via social.search post_url to the business Page "2nd Time Around Co" (handle constructionmaterialsParachute, author_id 100058039247852, 1,944 followers; bio: "We specialize in NEW METAL ROOFING SIDING AND SUPPLIES @ secondtimeco.com"). Empty caption, zero engagement. Already in pipeline.md (line 595, status NEW, phone 970-216-6905, added 2026-09-10) and facebook-dms.md (DM draft parked). Repeat sighting, not re-added.
- "Happy Friday from the Western Slope..." greeting post, Fruita (4470297506577359, 04:58 MDT). Author resolved via social.search post_url to personal profile Melody Clifton (author_id 61552365352496). Not a business.
- Empty-caption carousel photo post, Fruita (4470253176581792, 04:06 MDT). Author resolved via social.search post_url to personal profile Josh Ehlers (josh.ehlers.50). Not a business.
- Empty-caption photo post, Fruita (4470165313257245, 02:10 MDT). Author resolved via social.search post_url to personal profile Derek Kohls (derek.kohls). Not a business.
- Note: `facebook-cli post read --url` remains gated server-side (403 NO_ACCESS); author identification via social.search post_url worked for all 4 in-window posts this round.

## Session health
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors). social.search post_url author lookups working.
- 0 DMs sent, 0 attempted (read-only run).
- Raw scratch: /tmp/scan82 (g_<gid>.json per group).

## Round-82 engine dedup note
- 2nd Time Around Co (Parachute, metal roofing/siding supplies + installation): REPEAT SIGHTING. Already in pipeline.md (line 595, added 2026-09-10, status NEW, phone 970-216-6905) and facebook-dms.md (line 322, DM draft parked). New post is a photo-only buy/sell listing, no new signal. Not re-added; existing NEW row and parked draft stand. The repeat activity does confirm the business is actively posting on the Western Slope, which is a mild freshness signal for the existing row.
