# Facebook delta-scan #77 (2026-09-17, 11:16 - 14:19 MDT)

Read-only run. No DMs sent, no likes, no comments, no engagement actions.

Window: 1789665381 (2026-09-17 11:16:21 MDT) -> 1789676379 (2026-09-17 14:19:39 MDT).
Query: `facebook-cli groups posts --group-id <id> --limit 25 --sort-by NEW_POSTS --min-timestamp 1789665381`, one page per group (CLI max page size is 25).

## Counts per group

| Group | Returned | In-window | Below-watermark leaks |
|---|---|---|---|
| Western Colorado Message Board & Classifieds | 4 | 4 | 0 |
| Buy & Sell in Grand Junction | 20 | 20 | 0 |
| Delta | 4 | 4 | 0 |
| Orchard Mesa | 2 | 2 | 0 |
| Fruita | 19 | 17 | 2 (Sims Family Cleaning Co promo 10:01; empty post 09:59) |
| Living In Grand Junction Colorado | 7 | 6 | 1 (Avalon event 11:11) |
| Colorado Business Networking | 17 | 17 | 0 |
| Colorado Business Mingle (5355730651191326) | 0 | 0 | 0 |
| **Total** | **73** | **70** | **3** |

Leaks are API noise only, logged as intel, never double-counted. COBizMingle returned 0 posts with exit 0: genuine empty, not a failure.

## New prospects (1, added to pipeline.md as NEW)

1. **Sims Family Cleaning Co.** (Grand Junction / Fruita, CO) — residential cleaning: one-time deep clean, recurring cleaning, move-in/move-out, rental help. Phone (970) 233-2515 published verbatim in post. Self-identified family owned and locally operated. Textbook missed-call fit: phone/text intake while the crew is on jobs.
   - Post: https://facebook.com/groups/3741333852807065/permalink/4469488543324922/ (2026-09-17 10:01 MDT, Fruita group)
   - Note: this post sits BELOW the scan #77 watermark (API timing leak) and was missed by scan #76; logged here so it is not lost.
   - Added to pipeline.md under "Facebook — Western Colorado (delta-scan #77, 2026-09-17)" as NEW.
   - Dedup verified: no hits in facebook-dms.md, pipeline.md, leads.md. Not a franchise.

## Repeat sightings of tracked businesses (not re-added)

None this scan.

## New-business radar hits

0. No "grand opening", "now open", or "just launched" signals from trade businesses in window. (Explore Mesa County launched a "Grand Valley Weekend Roundup" events platform in WCMB; media, not a trade business.)

## Demand signals (intel only, not prospects)

None actionable. Fruita 14:04 MDT "ISO duck eggs" is a personal ask, not a business.

## Complaint signals

None.

## Social discovery (step 4d, labeled; social chatter is never verified fact)

- **Confirmed signal:** Sims Family Cleaning Co. corroborated on Instagram (@simscleaningcompany). Family-owned by Tyler and Nichole, service area Grand Junction / Fruita / Clifton / Redlands, phone (970) 233-2515 matches the Facebook post exactly. IG flyer lists services: recurring residential, one-time, deep, move-in/move-out, Airbnb/rental, commercial office, post-construction, customized. Email simsfamilycleaningco@gmail.com appears on the IG flyer (signal level, NOT from the Facebook post; not recorded as verified outreach contact).
- **Signal (unverified, out of area):** Dilling Heating, Cooling, Plumbing & Electrical posted a positive customer testimonial today on Instagram, but the handle is @dillingnc, strongly suggesting North Carolina, not Western Colorado. Location false positive; not pursued.
- **Signal (out of trade):** Homeplace Farm Co (@homeplace_farm_co) farm stand day October 10 in Fruita. Agriculture, not a home-service trade.
- Remainder of social search returns were Grand Junction area real estate listings (Alyssa Needham, One Haven Properties, Christi Reece Group, Greyhound Real Estate, Kathy Rehberg). Out of trade.

## Out-of-trade / skipped sightings (intel only)

- WCMB: Palisade orchard/food-manufacturing business FOR SALE at $2.4M (Laura Black, RE/MAX 4000, 14:02) — business-for-sale real estate ad, not a trade prospect; Explore Mesa County "Grand Valley Weekend Roundup" launch (media platform); Western Slope Auto dealer ad (2015 Nissan Xterra, 970-270-5768); personal welcome post.
- Buy & Sell GJ: all personal resale (shoes, bench, pet items, headphones, saddle, BMX, art, racing supplies, coat, glasses, tires, vest, laptop); two Bozarth Miller Chevrolet dealer car ads (970-261-5601); CMU Medical Education Center garage-sale fundraiser; Happy Little Finds thrift posts (retail/rescue).
- Delta: retail merch/soda sale with no business name and stripped author (unidentifiable, not pursued); "Please take minute and read the post below" (spam-style).
- Orchard Mesa: "Please take a minute and read the post below" (spam-style).
- Fruita: El Tapatio positive restaurant review (food); Starter Fiber Flock FinnSheep for sale, Hotchkiss (farm/livestock); Grand Junction Air Show veteran tickets (nonprofit/event); foreign-exchange student hosting (nonprofit); Warp Zone GJ escape-room promo (entertainment, warpzonegj.com); Grand Valley Horse Rescue donation share (nonprofit); Elevate Rides Winefest transportation promo (transportation, out of trade).
- LivingGJ: Avalon dressing rooms event (leak, 11:11, event); JunctionStrongArm arm wrestling club (community group); "Please take a minute and read the post below" (spam-style).
- COBizNet: two bookkeeping/finance-coach posts (professional service, out of trade); salon suites rental (commercial real estate); business-continuity coach post; Builder Gel Nail Artist, Green Valley Ranch (beauty, out of trade); realtor drive-by lead post (real estate); public-speaking question; private luxury-dinner kitchen seeker (event); real-estate tax-strategy post; event share.
- 22 unresolvable empty-caption posts (author stripped by CLI; logged without guessing): Delta 1803307814427590 (13:21), 1803273057764399 (12:22); OrchardMesa 1108885392088676 (14:01); Fruita 4469669963306780 (13:53), 4469655979974845 (13:34), 4469651293308647 (13:28), 4469645909975852 (13:20), 4469615489978894 (12:40), 4469603036646806 (12:24), 4469587963314980 (12:05), 4469552376651872 (11:19), 4469485866658523 (09:59, leak); LivingGJ 3437494093106195 (13:36), 3437489199773351 (13:29), 3437419579780313 (11:48), 3437419389780332 (11:47); COBizNet 4073631459438958 (14:14), 4073619802773457 (13:59), 4073578342777603 (13:13), 4073546799447424 (12:36), 4073512082784229 (11:54), 4073503979451706 (11:43).

## Session health

- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors).
- social.search healthy: 3 queries across Grand Junction and Fruita, 2026-09-10 and later, all returned.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only).
- Colorado Business Mingle group ID confirmed from scan #75: 5355730651191326.
- New watermark: 1789676379 (2026-09-17 14:19:39 MDT).
- Raw scratch: /tmp/scan77 (g_<gid>.json per group).
