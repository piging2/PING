# Facebook delta scan, round 59

- Watermark used: 1789459908 (2026-09-15 02:11:48 MDT)
- Scan run: 2026-09-15 ~08:14 MDT
- New watermark: 1789481024 (2026-09-15 08:03:44 MDT)
- Total posts scanned since watermark: 15 (see per-group counts below)

## Posts scanned per group

| Group | Posts since watermark | Notes |
|---|---|---|
| Western Colorado Message Board & Classifieds (5456977881034408) | 1 | Cross-posted bus-driver hiring ad |
| Buy & Sell in Grand Junction (108728816001912) | 4 | All individual marketplace for-sale items (wheels, headboard, winter tires, wood pipes) |
| Buy & Sell in Delta (1504277980997243) | 1 | Empty content, marketplace photo listing |
| Buy & Sell in Orchard Mesa (486356801008208) | 2 | One empty marketplace listing; one cross-post of the same hiring ad |
| Buy & Sell in Fruita (3741333852807065) | 5 | Two below-watermark marketplace listings returned despite filter; one lost-dogs post; one Mesa Lakes Lodge color post; one autumn aspen art post |
| Living In Grand Junction Colorado (1082777608577867) | 4 | Hiring cross-post, hockey opening weekend, vendor call, guided hike |

## Signals found

Explicitly: no home-service business signals, no new-business radar hits. Nothing with "grand opening", "now open", or "just launched" language.

Non-prospect business-ish sightings logged for the record:

1. **Student Transportation of America hiring push** (hiring signal, NOT an outreach target; national chain)
   - post_url: https://facebook.com/groups/5456977881034408/permalink/28481449631493907/ (also cross-posted to Orchard Mesa and Living in GJ)
   - author: Student Transportation of America Page (post signed by James Pitman, Terminal Manager, Grand Junction, Colorado)
   - business: Student Transportation of America
   - town: Grand Junction, CO
   - phone: none published (asks people to comment or DM)
   - signal type: hiring/growth. Posting for school bus drivers, $21.75/hr, paid CDL training, sign-on bonuses.
2. **Hockey opening weekend promo** (entertainment venue, NOT a home-service prospect)
   - post_url: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3435198390002432/
   - author: Tyler McDougal (personal profile, tyler.a.mcdougal, 636 followers)
   - business: unnamed in post; advertises live hockey, full-service pub, pre-game live music with Faith Eliza, merch
   - town: Grand Junction area (group context; not stated in post)
   - phone: none published
   - signal type: event announcement. Business name not verifiable from post, so not actionable.
3. **Vendor call for free event** (community event organizer, NOT an outreach target)
   - post_url: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3435183506670587/
   - author: Miranda Sanchez (personal profile, miranda.rivera.96)
   - business: unnamed; free event with indoor/outdoor space seeking vendors and food vendors
   - town: Grand Junction area (group context; not stated)
   - phone: none published (asks vendors to reach out for application)
   - signal type: community event.
4. **Guided family hike, Colorado National Monument** (nonprofit/community program, NOT an outreach target)
   - post_url: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3435195140002757/
   - author: Heather Annie Bennett (personal profile, heather.zadra)
   - town: Grand Junction, CO
   - phone: none published
   - signal type: community event (Sept 23 guided hike).

## New-business radar hits

None. No new businesses, openings, or launch announcements in this window.

## Repeat sightings of tracked businesses

None. None of the sighted names (Student Transportation of America, Tyler McDougal, Miranda Sanchez, Heather Annie Bennett) appear in leads.md or pipeline.md.

## Watch notes

- The Fruita group query returned two posts below the watermark (creation_time 1789446579 and 1789447473) despite the --min-timestamp filter. Both were empty-content marketplace listings with no business content, so no data loss; the filter edge case is noted only.
- Delta and Orchard Mesa buy/sell groups returned near-empty marketplace listings only; no business content.
- No likes, comments, or DMs were sent; scan/report only.
