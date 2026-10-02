# Facebook delta-scan #126 - 2026-09-23 16:26 MDT

Window: creation_time > 1790191490 (2026-09-23 14:44:50 MDT, round-125 watermark).
Method: `facebook-cli groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1790191490` per group, read-only (no DMs, no likes, no comments).
Author resolution: social.search per post_url for the two genuine trade-business posts (authorized route; facebook-cli strips authors).

## Per-group fetched / in-window counts

| Group | Fetched | In-window |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 6 | 6 |
| Buy & Sell in Grand Junction (108728816001912) | 20 | 20 |
| Delta Colorado Community Message Board (1504277980997243) | 5 | 5 |
| Orchard Mesa Colorado Message Board (486356801008208) | 0 | 0 |
| Fruita Colorado Message Board (3741333852807065) | 15 | 11 |
| Living In Grand Junction Colorado (1082777608577867) | 14 | 10 |
| **Total** | **60** | **52** |

Below-watermark API leaks (scannable, not double-counted): Fruita 4, Living In GJ 4.

## Classification summary

- Trade business promos: 2 (The Yellow handyman services [NEW candidate]; Scott Rush dad-and-son hauling [repeat sighting])
- New-business radar hits (grand opening / now open / just launched): 0 new; 1 radar-qualified repeat (Scott Rush "trying to start a business", already tracked)
- Demand/ISO signals (personal, not business leads): 4 (dump-run ISO, fence-post-replacement ISO, cornstalk-bundle ISO, Fruita; RV plot wanted, Living In GJ)
- Hiring/growth signals: 0 (one restaurant hiring post was a below-watermark leak)
- Customer complaints: 0
- Service-business promos (non-trade, logged only): 4 (Boat+/RV+Storage west of Fruita, 970-462-8536; Fruita freeze-dried candy vendor, Fruitafreezedriedgoodies@gmail.com; Peach Street Distillers music bingo, Palisade; Paonia realtor listing)
- Personal resale: 26 (Western CO MB 6, Buy & Sell GJ 19, Delta free car 1)
- Community/personal: 10 (Clifton Christian Church food bank cross-posted Fruita + Living In GJ, half-day ride, Rollator, bear post, insurance rant, book sale, plus the 4 ISO posts listed above)
- Empty/unknown/noise: 10 (Delta 2, Fruita 3 incl. "Fyi", Living In GJ 5)

## New-prospect evaluation

**The Yellow handyman services** (handyman: simple repairs, yard work, maintenance, cleaning, junk removal, plumbing/mechanical repair; serves Delta, Hotchkiss, Cedaredge, Olathe). Post id 1808595000565538, 12:48 MDT, Delta group: "Serving delta hotchkiss cederage and Olathe we will do simple repairs yard work maintenance cleaning junk removal will do some plumbing and mechanical repair call me for a rate 25 dollar quote fee unless further then specified areas". Author: business Page "The Yellow handyman services" (id 61593120387860, bio: "No job to big or small for the yellow handyman free quotes today"), resolved via social.search post_url.

Dedupe grep evidence (run 2026-09-23 16:26 MDT):
- `grep -i "yellow handyman" leads.md pipeline.md facebook-dms.md` -> zero hits.
- `grep -n "61593120387860" leads.md pipeline.md facebook-dms.md` -> zero hits.
- Conclusion: genuinely NEW sighting, no prior record. No phone/email in the post; owner name not published; size unknown (never invented). Page Message-button check PENDING-BROWSER (browser work not available in this lane; profile-info lookup returned 403 "only readable for the viewer or the viewer's friends"). Pipeline-row format row staged to discovery-scratch/round127-fb.md for the sweep owner to insert into pipeline.md; not written by this lane.

**Scott Rush** (dad-and-son junk hauling startup, Grand Junction, text-to 970-778-1219). New post in Living In GJ 3443611159161155 (14:07 MDT, author scott.rush.7 via social.search post_url), same "trying to start a business" pitch. Dedupe: already in leads.md (line 3237), pipeline.md (line 1481, NEW/WARM, round 52), facebook-dms.md (rounds 52, 121+, multiple repeat sightings). REPEAT SIGHTING, vitality signal only; no duplicate row created.

Pipeline rows staged this scan: 1 (The Yellow handyman services, to discovery-scratch/round127-fb.md; sweep owner inserts).

## NEW watermark

1790202171 (2026-09-23 16:22:51 MDT) - latest in-window creation_time, Buy & Sell in Grand Junction post id 3420566121484815 (Antique Reclaimed Wood).

## DM counts

0 sent, 0 attempted this scan (read-only lane). Daily DM budget untouched: 0/10.
