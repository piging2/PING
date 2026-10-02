# Facebook delta-scan #103 (round 103)

Window: creation_time > 1789946208 (2026-09-20 17:16 MDT) through 20:15 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 20, 6 groups, 119 posts fetched; local filter on creation_time > watermark. Read-only; no DMs sent, no engagement. 4 author lookups via social.search post_url.

## Posts scanned per group (in-window count)
- Western Colorado Message Board & Classifieds (5456977881034408): 0 (20 fetched, all older than watermark).
- Buy & Sell in Grand Junction (108728816001912): 20 (all personal resale: tool lot, Ford Explorer, washer/dryer, fridge, Toro mower, dresser, toys, Kawasaki Eliminator, Road King, appliances, etc.).
- Delta, Colorado Community Message Board (1504277980997243): 4 (Elemental Nya Pro Housecleaning business promo, makeup brand reseller, massage therapist "-Jay", 1 empty caption resolved to travel agent Terri Tubolino).
- Orchard Mesa, Colorado Message Board (486356801008208): 0 (20 fetched, all older than watermark).
- Fruita, Colorado Message Board (3741333852807065): 9 (deep-clean ISO demand signal, job-seeker post, sunset photo, hair stylist rec request, dog groomer promo, Korean corn dog truck at Fruita Silo, 3 empties).
- Living In Grand Junction Colorado (1082777608577867): 6 (all empty caption; photo burst 19:22-19:24 resolved to realtor Tanette Smith property photos; remaining 5 skipped by pattern).

Total: 39 in-window posts reviewed.

## New prospects
1 new in-corridor prospect:
- **Elemental Nya Pro Housecleaning** (Nya Wellmann, handle eco.nya4, author_id 100086765595923, bio "Be Love") | housecleaning / residential cleaning | Delta, CO (posted in Delta group; town unverified beyond group) | no phone/email published in post | author resolved via social.search post_url | Post: https://facebook.com/groups/1504277980997243/permalink/1806116490813389/ (2026-09-20 19:10 MDT) | Self-stated 4 years in business, actively "seeking new work opportunity" (growth signal). Opportunity: MISSED_CALL_LEAD_CAPTURE (one-person cleaning op; bookings come by call/DM while on jobs). Confidence: medium. Priority: WARM. Added to pipeline.md status NEW, source=facebook. Dedupe: 0 hits across leads.md, pipeline.md, facebook-dms.md, western-co-business-owner-list.csv. Parked DM draft in facebook-dms.md; NOT sent (Messenger CLI non-contact hard block; Pig-side Message-button verification required before any send).

## Repeat sightings of pipeline businesses (no new outreach; suppression holds)
- None this window. No reposts of AG Property Services, 2nd Time Around Co, Coldiron's, Rough Idle Diagnostics, or any other pipeline business observed.

## Out-of-corridor trade sightings (intel only, NOT added per 2026-09-20 corridor targeting)
- None this window (only the 6 corridor groups were scanned this round; out-of-corridor business networking groups were not in scope).

## Demand / complaint signals (intel only)
- Fruita 20:02 MDT: "Looking for someone to do a deep clean on a property tomorrow or Tuesday. Message me if you are available." Demand signal for cleaning services; no business named. Notable because it matches the newly found Elemental Nya Pro Housecleaning trade, but it is an ISO from a customer, not outreach to them. Logged for intel only.
- Fruita 19:18 MDT: balayage hair stylist recommendation request. Beauty, out of segment; not pursued.
- Fruita 20:07 MDT: job-seeker post (teenager finishing kitchen job, looking for local work). Not a business; skipped.
- Delta 18:48 MDT: "-Jay", 20+ year massage/bodywork therapist "around for a bit". Personal services, not a home-service trade; not pursued.

## Empty-caption lookups (4 via social.search post_url)
- Nya Wellmann (eco.nya4) — Elemental Nya Pro Housecleaning; genuine business, added as prospect.
- Terri Tubolino (terri.tubolino) — travel agent (Teramisu); out of segment.
- Tanette Smith (Tanettelee) — Colorado realtor; out of segment (property photo burst, 6 posts in 2 minutes).
- JJ Fletcher (jj.fletcher.754) — individual, photo carousel, no business caption; skipped.
- LivingGJ remaining 5 empties + Fruita 2 empties: skipped by group pattern (same bursts, community/resale groups; prior rounds resolved the same pattern to individuals/photos).

## Observed-but-not-pursued (with reasons)
- Buy & Sell GJ personal resale: 20 listings (tools, car, appliances, mower, furniture, motorcycles, toys, etc.) — personal resale, not businesses.
- Makeup brand reseller (Delta) — individual beauty reseller, out of segment.
- Massage/bodywork therapist (Delta) — personal services, not a home-service trade.
- Dog groomer accepting new clients (Fruita) — pet service, out of segment.
- Travel agent carousel (Delta) — B2B/travel service, out of segment.
- Realtor photo burst (LivingGJ) — property listings, out of segment.
- Korean corn dog truck at Fruita Silo — food, out of segment.
- Job seeker, sunset photo, hair stylist rec request, free wood — community, not prospects.

## Watermark
Old: 1789946208 (2026-09-20 17:16 MDT, from round-102 report).
New: 1789956820 (2026-09-20 20:13 MDT, max creation_time observed in-window; Buy & Sell GJ "Mixed Tool Lot" resale post).

## Notes for parent
- Pipeline-ready row this round: 1 — Elemental Nya Pro Housecleaning, NEW in "Facebook — Western Colorado", DM parked (draft in facebook-dms.md). Needs Pig-side Message-button verification before any send.
- Intel-only row: Fruita deep-clean ISO (demand signal, cleaning trade, no business named).
- Zero repeat sightings of pipeline businesses this window.
- Empty-caption rate remains high on Sunday resale/community groups; lookups stayed bounded at 4.
- Next round covers posts newer than 1789956820 (2026-09-20 20:13 MDT).
