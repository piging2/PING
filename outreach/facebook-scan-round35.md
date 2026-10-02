# Facebook group delta-scan #30 (round 35) — detached, read-only

Window: 2026-09-12 11:11 → 14:12 MDT (min-timestamp 1789233105)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789233105` on all 10 target groups, then `social.search` post_url author lookups for every in-scope or empty-caption business post. No DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron).

- 78 new posts across 10 groups. 3 new genuine prospects (all found via empty-caption or full-text author lookups in Colorado Business Networking and Delta).
- 19/19 social.search post_url lookups successful (13 empty-caption resolutions, 6 captioned posts).
- No DMs sent, no likes/comments.

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 6 |
| Buy & Sell in Grand Junction | 20 (hit the 20-per-page API limit; mid-window posts may exist below the page) |
| Delta Community Message Board | 7 |
| Orchard Mesa | 3 |
| Fruita | 13 |
| Living In Grand Junction Colorado | 7 |
| Colorado Business Mingle | 0 |
| Colorado Business Networking | 19 |
| What's Happening In Palisade | 3 |
| Glenwood Springs Colorado Message Board | 0 |

## New prospects (3; parked DM drafts below)

1. **Houston Specialty Contractors LLC** (Mike / Michael Houston, personal profile michael.houston.75098) — junk removal, handyman repairs, painting, drywall, landscaping clean-up, demo, rental turnovers, fix-and-flip repairs for property managers, realtors, landlords, investors. Phone 970-608-2383 (970 = western CO area code; town unverified). Post claims BBB accredited and insured. WARM. opportunity_primary MISSED_CALL_LEAD_CAPTURE (medium): phone-only booking serving property-manager clients where a missed call loses the job; opportunity_secondary SOCIAL_PRESENCE.
2. **Kevlar Garage Services LLC** — residential garage door company (per its own Page bio). Posted an image-only flyer in Colorado Business Networking 2026-09-12 with no caption, phone, email, or website observed; author is the business Page itself. WARM. opportunity_primary SOCIAL_PRESENCE (medium): business exists only as a FB Page and flyer posts; opportunity_secondary UNKNOWN.
3. **Samuel Rivera Rodriguez** — bio reads "Junk Removal Long Start"; posted an image-only carousel promo in Colorado Business Networking 2026-09-12 under a personal profile. No business name, phone, or website observed. WATCH. opportunity_primary SOCIAL_PRESENCE (low), secondary UNKNOWN.

All three deduped against facebook-dms.md, pipeline.md, leads.md, and the canonical JSONL. JSONL rows: ~/workspace/outreach/jsonl-additions-round35-fb.jsonl (parent merges; nothing written to pipeline.md, leads.md, or the canonical store).

## Parked DM drafts (nothing sent; all open with the disclosure line)

1. Houston Specialty Contractors LLC: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Mike, saw your post in Colorado Business Networking about Houston Specialty Contractors. With property managers and landlords as your main clients, every missed call is a rental turnover or repair list going to someone else. We help multi-trade crews capture every call and message instantly and keep follow-up from falling through the cracks, so you stay in control of the schedule. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"
2. Kevlar Garage Services LLC: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi there, saw Kevlar Garage Services pop up in Colorado Business Networking. Garage door calls usually come when something is stuck or broken, and the company that answers first gets the job. We help service shops capture every call and message the moment it comes in, with booking and follow-up handled, so nothing slips while you are on a job. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"
3. Samuel Rivera Rodriguez (junk removal): "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Samuel, saw your junk removal post in Colorado Business Networking. Junk removal jobs get booked by whoever responds fastest, and texts that come in while you are on a haul go quiet fast. We help one-person service shops capture every inquiry instantly and turn them into booked jobs, keeping you in control. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

## Repeat sightings

- **Coldiron's Creations and Property Service** ("Wild Weed Wranglers", property cleanup + exterior handyman, Delta, phone 970-209-4965) posted a fresh fall leaf-season cleanup promo in Delta at 12:00 MDT. Already in pipeline.md / leads.md / facebook-dms.md; DM SENT 2026-09-08 via browser to the business Page. No reply on record. This fresh promo is a natural F1 hook: the follow-up ladder (day 4-7) is now eligible for the engine to run, not this read-only scan.
- **Memphis Auto Spa** posted another detailing promo in Colorado Business Networking at 11:42 MDT (posted by Anderson Robert, 206-843-4424). Already logged in round 34 as WATCH, out-of-segment (mobile detailing) with location unconfirmed. No new contact info.

## Demand signals (customer-side, not prospects)

- Fruita 14:02 MDT: Balanced Rock Inn (family-owned inn in Fruita) is looking for a reliable local handyman on an as-needed basis for maintenance and repairs. Handyman demand, signal/unverified.
- Palisade 12:52 MDT: "El Rey" Mexican food special of the day promo. Food, not a prospect.

## New-business radar

- Delta 13:56 MDT: "I've just launched my Alfajore cookie cottage bakery" (ALFAJORES, dulce de leche). New-business intro but food segment, out of home-service trades. Logged as radar observation only, not pursued.

## Notable skips (with reasons)

- Chris Storgion "Friendly Service" moving van (Ford E-150, furniture/small moves, $58/hr) in CO Business Networking: genuine trade fit (moving/hauling) but explicitly "Available throughout Colorado Springs". Out of the Western Colorado target geography; Western CO pools are not thin, so no JSONL row per the expansion rule. Flagged to parent for a go/no-go.
- Katrina Tayian (Fruita): "We will be in the Grand Junction area tomorrow and have a few more slots available!" Mobile service promo but trade unverifiable from caption (image thumbnail not retrievable). Skipped per the unverifiable one-liner rule.
- Robert Doyal (Delta): "Any questions please call or text, 970-261-2653" with image carousel. Unverifiable one-liner, skipped.
- Elyjess Armentasand (CO Business Networking): "Different prices" caption-only. Skipped.
- Empty-caption resolutions that were personal profiles with no business bio: Brent Paine, David Deighton, Robert Jackson, Iliana Holman, Sara Luevano, Adrian Delgado Jr., Ron Wilson (2 posts), Jessica Farnsworth, Angie Hampt. All skipped, no signal.
- Morning Mimosas (podcast, CO Business Networking): media/B2B, not a trade. Skipped.
- Brooke Messer (esthetician, The Pink Canoe Studio, Colorado Springs): personal care, not home-service trade. Skipped.
- Auto repair Denver (3825 Grape St, 720-512-0020) and First Choice Auto (Kia dealer) in Buy & Sell GJ: out of region / not a trade. Skipped.
- Junction West RV Park & Storage extended-stay ad (970-245-8531): hospitality, not a trade. Skipped.
- Massage and Japanese Head Spa promos (CO Business Networking): personal services, not home-service trades. Skipped.
- Real estate broker open house, Vecinos Mexican Grill, Ivy-style food posts, Oktoberfest at Ale House GJ, Natural Dye Bakery pop-up, muralist (GJ artist), dog sightings, bike/furniture/car/futon/appliance resale, estate sales, yard sales: all out of segment or personal resale. Skipped.
- Note: 20+ personal resale posts in Buy & Sell GJ hit the 20-per-page API limit; some mid-window posts may be unseen.

## Watermark

- Max post timestamp seen: 1789243911 (2026-09-12 14:11 MDT, Buy & Sell GJ locking display cabinet resale post). Next scan should use min-timestamp 1789243911.
