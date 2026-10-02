# Facebook group delta-scan #31 (round 36) — detached, read-only

Window: 2026-09-12 14:11 → 17:12 MDT (min-timestamp 1789243911, per round 35 watermark)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789243911` on all 10 target groups, then `social.search` post_url author lookups for every in-scope, empty-caption, or one-liner business post. No DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron).

- 49 new posts across 10 groups. 1 new genuine prospect (found via empty-caption author lookup in Colorado Business Networking).
- 16/16 social.search post_url lookups successful (13 empty-caption resolutions, 2 captioned business posts, 1 one-liner).
- No DMs sent, no likes/comments.

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 0 |
| Buy & Sell in Grand Junction | 20 (hit the 20-per-page API limit; mid-window posts may exist below the page) |
| Delta Community Message Board | 4 |
| Orchard Mesa | 0 |
| Fruita | 13 |
| Living In Grand Junction Colorado | 2 |
| Colorado Business Mingle | 0 |
| Colorado Business Networking | 10 |
| What's Happening In Palisade | 0 |
| Glenwood Springs Colorado Message Board | 0 |

## New prospects (1; parked DM draft below)

1. **RG Resin** (personal profile "peterson.terrance", 199 followers) — custom epoxy flooring and countertops, free estimates per profile bio. Posted an image-only trade promo in Colorado Business Networking 2026-09-12 13:58 MDT with no caption, phone, email, website, or booking path observed. Town unverified (statewide group). WARM. opportunity_primary SOCIAL_PRESENCE (medium): trade business operating from a personal Facebook profile with a trade bio, no business Page or website observed; opportunity_secondary MISSED_CALL_LEAD_CAPTURE (medium): free estimates offered but inquiries have no fast capture path.

Deduped against facebook-dms.md, pipeline.md, leads.md, and the canonical JSONL. JSONL row: ~/workspace/outreach/jsonl-additions-round36-fb.jsonl (parent merges; nothing written to pipeline.md, leads.md, or the canonical store).

## Parked DM draft (nothing sent; opens with the disclosure line)

1. RG Resin: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi there, saw your RG Resin post in Colorado Business Networking about epoxy flooring and countertops with free estimates. Estimate requests are the lifeblood, and when they land while you are mid-job the customer books whoever answers first. We help trade shops capture every call and message instantly and turn estimate requests into booked work, keeping you in control of the schedule. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

## Repeat sightings

- **Memphis Auto Spa** (Anderson Robert) posted a second detailing promo today in Colorado Business Networking at 16:09 MDT (first promo logged at 11:42 MDT in round 35). Post carries phone 206-843-4424 and the post is tagged "Colorado Springs, Colorado", which confirms the earlier out-of-segment read. Already in pipeline.md / leads.md / facebook-dms.md as WATCH, out-of-segment (mobile detailing), location unconfirmed. No outreach has been sent, so no follow-up ladder is active; logged as intel only, not a new prospect.
- **Coldiron's Creations and Property Service**: not sighted in this window. The 12:00 MDT fall cleanup promo from round 35 remains the F1 hook; F1 stays parked until a DM channel exists (browser session logged out, Messenger CLI non-contact restricted).

## Demand signals (customer-side, not prospects)

- None this window. Fruita posts were community items only (Medicare help request, horse hay search, found keys, lemonade stand, land-use discussion, Roice Hurst fundraiser).

## New-business radar

- None. No grand-opening or new-business trade posts in this window. The Cozy Crumb GJ (farm stand, Mack CO) is food segment, not pursued.

## Notable skips (with reasons)

- H&H Solutions (Bryce Delgado, CO Business Networking, 16:58 MDT): strong trade fit (mom & pop plumbing/heating/cooling, licensed & insured, master plumber, 24/7 emergency, phone 303-591-0216, www.hhsolutionplumbing.com). Web-verified via own site as "Plumbing & Boiler Experts in Denver Metro", serving 23 communities across "Colorado's Front Range". Out of the Western Colorado target geography; Western CO pools are not thin, so no JSONL row per the expansion rule. Parked for a future outward-expansion go/no-go, same as round 35's Chris Storgion flag.
- Michael Haren (CO Business Networking): artisanal metal work (furniture, railings, custom work); bio states Northern Colorado explicitly. Out of geography and craft rather than home-service trade. Skipped.
- Boo Baskets (Megan Essman, Buy & Sell GJ): craft gift baskets. Out of segment.
- The Cozy Crumb GJ (Fruita): farm stand in Mack CO, food segment. Out of segment.
- Valora lash lift (Delta), licensed esthetician wax promo (CO Business Networking): personal care, not home-service trades. Skipped.
- Victor A Salguero (CO Business Networking): Herbalife nutrition coach. Out of segment.
- Lyn Atlantess Ethereal Lomasi / BrandShamans.com (CO Business Networking): branding coach. Out of segment.
- "Come study with us. Venha estudar conosco." (CO Business Networking): tutoring/language, out of segment.
- Empty-caption resolutions that were personal profiles with no business bio: Doug Kendrick, Monique Cisneros, Gus Weber (Delta); JJ Fletcher, Laura Spevere Springer (Fruita); Karsen Abegglen (CO Business Networking). All skipped, no signal.
- Karen Murray Boston (Buy & Sell GJ + Fruita): re-shared nextdoor.com photo posts, "Marketing Maven" personal bio, no business. Skipped.
- Aurora networking Zoom admin post (CO Business Networking): not a prospect.
- The Ale House benefit posts (2, Living In GJ): hospitality event, not a prospect.
- Open House TOMORROW at 562 Normandy Dr, Grand Junction (Fruita): real estate, not a trade.
- Swisher 60" mower for sale, and the rest of the Buy & Sell GJ window: personal resale. Skipped.
- Note: Buy & Sell GJ returned exactly 20 posts (page limit); some mid-window posts may be unseen.

## Watermark

- Max post timestamp seen: 1789254734 (2026-09-12 17:12 MDT, Buy & Sell GJ 20v battery resale post). Next scan should use min-timestamp 1789254734.
