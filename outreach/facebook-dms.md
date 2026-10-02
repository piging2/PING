# PING Social — Facebook DM outreach log

## 2026-09-08 — First Western Colorado scouting pass (no sends)

**Result: 0 DMs sent.** Scouting completed; sends blocked by recipient-resolution safety rules (see below).

### Groups scanned (~720 posts, last ~30 days each)
- Western Colorado Message Board & Classifieds (5456977881034408): 120 posts scanned
- Buy & Sell in Grand Junction (108728816001912): 120 posts scanned
- Delta, Colorado Community Message Board (1504277980997243): 120 posts scanned
- Orchard Mesa, Colorado Message Board (486356801008208): 120 posts scanned
- Fruita, Colorado Message Board (3741333852807065): 119 posts scanned
- Living In Grand Junction Colorado (1082777608577867): 117 posts scanned

Most posts are buy/sell listings, not business promos.

### Genuine business prospects found (for a future pass)
1. **AG Property Services** — landscaping / outdoor property services. Posted promo in Delta and Orchard Mesa groups. No owner name in post. Post: https://facebook.com/groups/1504277980997243/permalink/1793677992057239/
2. **Chalkline Ridge LLC (Erika)** — dog walking / canine enrichment, Fruita. "Local Business Thursday" post, invites DMs for free meet-and-greet. Owner first name Erika, last name unknown. Post: https://facebook.com/groups/3741333852807065/permalink/4456779947929115/
3. **Monument View Coffee Shop** — event/back-room bookings, Grand Junction. Post: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3428589643996640/
4. **Luxury portable restroom trailer rentals** — Western Slope, dates available Sept/Oct. Business name not stated in visible text. Post: https://facebook.com/groups/5456977881034408/permalink/28314319711540234/
5. **Xeroscaping landscaper** — Delta area, phone 970-209-4965, free estimates. Name not stated. Post: https://facebook.com/groups/1504277980997243/permalink/1790405965717775/
6. **Stand-alone cattle panels** — Grand Junction farm-supply location. Retail, weak fit for PING; not pursued. Post: https://facebook.com/groups/108728816001912/permalink/3404509466423814/

### Why nothing was sent
- The facebook-cli group posts API strips ALL author identity: posts and comments expose no author name or ID. Post authors cannot be identified from tool output.
- None of the businesses above appear in Nolan's Messenger contacts (local snapshot of 100 contacts plus server-targeted `sync contacts --search` for each name; all returned zero).
- No existing one-to-one threads with any of them.
- The Messenger skill forbids sending to guessed recipients and requires `--to` targets to resolve from a name-based contacts search. All resolution paths exhausted, so per the skill I stopped instead of messaging blindly.

### What would unblock sends
- Nolan names a specific person/business to message (I can resolve via contacts/threads), or
- The prospect becomes a Messenger contact (e.g., they message the Page first, or Nolan connects), or
- A future facebook-cli version exposes post authors.

### Draft DM template (unused this run, kept for future)
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi [Name], I saw your post in [group] about [specific thing from post].
>
> We help owner-led local businesses catch more of the calls and messages they're already getting, with less admin drag, while the owner stays in charge.
>
> We're running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Account-safety notes
- No sends attempted, no blocks or errors encountered. Messenger Companion connected and healthy; contact sync working.
- Recommendation: keep any future FB DM volume low (a few per day, genuinely personalized). Unsolicited bulk DMs risk account restrictions.

## 2026-09-08 — Author identification breakthrough (still 0 DMs sent)

**Route found:** `social.search` with `post_url` exposes the post author that `facebook-cli groups posts` strips. All 5 authors identified:
1. AG Property Services post → **Abraham Gutierrez** (personal profile). Phone 970-234-1983 published in post.
2. Chalkline Ridge LLC post → **Erika Chalkline Ridge Martin** (handle erika.chalkline.ridge.martin).
3. Monument View Coffee Shop post → posted by the **Monument View Coffee Shop Page** itself. Phone 970-985-4045 published in post.
4. Restroom trailer post → **Abel Jimenez** (handle abelillo.navajas).
5. Xeroscaping post → **Coldiron's Creations and Property Service** (Page; bio: "Wild Weed Wranglers", property cleanup + exterior handyman). Phone 970-209-4965 published in post.

**Sends attempted, hard-blocked:** DMs to all 5 failed at the tool level: "Cannot send with --to because the recipient is not in the synced Messenger contacts." This is a technical enforcement in the Messenger CLI, not a judgment call, and there is no override. None of the 5 are in Messenger contacts and no threads exist.
**Reroute:** all 5 are now in pipeline.md with authors and published phones; phone-flagged prospects go through the normal call/form pipeline. Future engine runs use the social.search post_url route for author identification (no browser login needed).

## 2026-09-08 MDT: full workaround exploration (all dead ends)

Nolan asked to look closer at contacts and find a workaround before pursuing himself.

1. facebook-cli is read-only for people: `me friends` lists only, no friend-request or add-contact command exists anywhere in the CLI.
2. Synced 500 Messenger contacts (max) and searched all five authors: zero matches. None are reachable.
3. Tested a direct send to the Monument View Coffee Shop Page ID: blocked with the same error. Pages are not exempt.
4. Checked Facebook friends for Abraham Gutierrez, Erika, Abel Jimenez: none are friends (Erika hits were different people).
5. Thread sync is failing on transport errors; local thread searches for all five names return nothing, so no existing conversations.
6. Browser login still parked at the iPhone passkey challenge. No web DMs, comments, or friend requests possible from my side until that is approved.

Conclusion: there is no technical path for Pigi to initiate contact. Either Nolan sends from his own Messenger app, or he approves the iPhone passkey so the browser session gets full access.

## Ready-to-paste DMs for Nolan's phone

1. Abraham Gutierrez (facebook.com/abraham.gutierrez.5036) - AG Property Services
"Hey Abraham, saw your AG Property Services post in the GJ group. I help local home service businesses capture every lead and cut admin busywork with simple automation. Got one idea specific to your landscaping and hardscaping work. Open to a quick chat? - Nolan"

2. Erika Chalkline Ridge Martin (facebook.com/erika.martin.794) - Chalkline Ridge LLC dog walking
"Hi Erika, saw your post about filling two dog walking spots with Chalkline Ridge. I help local service businesses handle booking and client follow-up automatically so nothing slips. Happy to share one idea for your business if you're open to it. - Nolan"

3. Monument View Coffee Shop (search the Page name on Facebook)
"Hi there, saw your post about the free group room bookings. I help local businesses capture inquiries and follow up automatically so no booking slips through. One quick idea for the coffee shop if you're open to it. - Nolan"

4. Abel Jimenez (facebook.com/abel.jimenez.5283) - portable restroom trailer rentals
"Hey Abel, saw your post about the restroom trailer rentals with fall availability. I help local service businesses turn inquiries into booked jobs faster with simple automation. Got one idea for your rental business. Open to a quick chat? - Nolan"

5. Coldiron's Creations and Property Service (search the Page name on Facebook)
"Hi, saw your Coldiron's Creations post about property cleanup and xeriscaping. I help local service businesses capture every lead and cut down admin work. One idea specific to your business if you're open to it. - Nolan"

## 2026-09-08 MDT: browser DMs (4 sent, 1 skipped)
Facebook browser login completed (Nolan approved passkey on iPhone). DMs sent via logged-in browser, paced 60-90s, each opening with the non-customer disclosure.
- Abraham Gutierrez (AG Property Services): SENT 7:54 PM MDT
- Monument View Coffee Shop (Page): SENT 7:56 PM MDT
- Abel Jimenez (restroom trailer rentals): SENT 7:58 PM MDT
- Coldiron's Creations and Property Service (Page): SENT 7:59 PM MDT
- Erika Chalkline Ridge Martin: SKIPPED, profile shows "content isn't available," no Message button. Needs another route (website/email) or a retry later.

## 2026-09-09 MDT — Delta-since scan (new posts since 2026-09-08)

Scanned all 6 Western Colorado groups with min-timestamp 2026-09-08 00:00 MDT (~110 new posts). Two genuine new business prospects found; authors identified via social.search post_url route:

1. **Buffalo's Construction & Landscaping LLC** — posted by BettcherRivera Jose (personal profile, handle walking.bear.79). Montrose. Phone (970)234-1844 published in post. Services: landscaping cleanup, yard maintenance, lawn care, sprinklers, sod, snow removal, seasonal cleanups, xeriscaping, tree trimming, fencing, painting/remodeling, gutter cleanout, porch/deck rebuilds, holiday lighting, junk haul-off, debris haul-off, dump runs. "Reliable crews. Organized scheduling. Professional results." Strong PING fit. Post: https://facebook.com/groups/3741333852807065/permalink/4460573730883070/
2. **Rocky Mountain Landscape Innovations LLC** — posted by its own business Page (handle RMLandscape2025). Gray water solutions, xeriscape, irrigation/sprinklers, patios, home improvements; residential and commercial. Phone 970-433-6160 published in post. Strong PING fit. Post: https://facebook.com/groups/1504277980997243/permalink/1795607498530955/

Browser DM task spawned for both (logged-in session, paced 60-90s, not-a-customer line first, verify Message button first). Results pending at log time.

Observed but not pursued: Aila Thai Kitchen (restaurant, 970-258-6798, weak home-services fit), Quick Stop Convenience Store pizza promo (retail, not a fit), fresh baked goodies cottage baker (weak fit), Moody's Underground house band (entertainment, not a fit), Portia's Delta County video promo (weak fit).

Note: Buffalo's Construction & Landscaping LLC also overlaps the new junk-removal research segment (junk haul-off listed); keep them in the Facebook pipeline rather than the junk-removal batch to avoid duplication.

## 2026-09-09 — Delta-since scan #2 (new posts since 2026-09-09 00:00 MDT)

**Result: 0 new genuine prospects.** Thin delta window: 10 posts total across 10 groups.

### Posts scanned per group (Western Colorado delta, sort=NEW_POSTS, min-timestamp 2026-09-09 00:00 MDT)
- Western Colorado Message Board & Classifieds (5456977881034408): 1 post (wheels for sale, buy/sell)
- Buy & Sell in Grand Junction (108728816001912): 2 posts (motorcycle for sale; "CAN YOU HANG WALLPAPER?" homeowner request for a parade-of-homes house, not a business promo)
- Delta (1504277980997243): 0 posts
- Orchard Mesa (486356801008208): 0 posts
- Fruita (3741333852807065): 3 posts ("Happy Wednesday" engagement post; empty post; free-TVs giveaway in Mack)
- Living In Grand Junction Colorado (1082777608577867): 0 posts

### Denver-area / extra business groups (new this scan)
Nolan is a member of 25+ groups; checked Denver-area business and adjacent Western Colorado business groups:
- Colorado Business Mingle (5355730651191326): 0 posts since midnight
- Colorado Business Networking (2803047646497352): 3 posts (2 empty; 1 promo for $9.99 social media audits, B2B service, weak PING home-services fit, not pursued)
- What's Happening In Palisade, CO/ Business Board (2569745986668554): 1 post (wine-bottle wall sconce craft seller, weak fit, not pursued)
- Glenwood Springs Colorado Message Board (2370574193230682): 0 posts

### No author-identification work needed
No genuine home-services business promos in this delta, so the social.search post_url author route was not used. None of the previously identified prospects (Buffalo's Construction & Landscaping, Rocky Mountain Landscape Innovations, AG Property Services, Chalkline Ridge, Monument View Coffee Shop, Abel Jimenez, Coldiron's Creations) appeared again. No DMs sent, no sends attempted.

## 2026-09-09 — Delta-since scan #3 (new posts since ~05:00 MDT)

**Result: 1 new genuine prospect.** Scanned 6 Western Colorado + 4 Denver-area groups. Mostly buy/sell listings and engagement posts; nothing new in WC groups.

### New prospect
1. **All Around Window Washing** — posted by the business Page itself (handle aawwjds). Denver metro. Services: window cleaning, gutter cleaning, pressure washing, screen repair, Christmas light installation. Post in Colorado Business Networking: booking early for Christmas light install season. Phone 720-244-0398, allaroundwindowwash.com published in post. Author identified via social.search post_url route. Post: https://facebook.com/groups/2803047646497352/permalink/4062686927200078/
- Action: added to pipeline.md under "Facebook — Denver-area groups" as NEW. Browser DM task spawned (verify Message button exists on the Page first; DM only if it does). Logged here with result when the task reports back.

Observed but not pursued: buy/sell listings (furniture, rings, packages), movie event post, Christmas-light posts are the target segment; no other home-service business promos.

## 2026-09-09 — Delta-since scan #4 (new posts since ~05:00 MDT)

**Result: 4 new genuine prospects.** Scanned 6 Western Colorado + 4 outward-expansion groups with min-timestamp 2026-09-09 05:00 MDT (~95 posts total). Authors identified via the social.search post_url route.

### New prospects (for parent to add to pipeline.md)
1. **Dalton Leger** — junk removal / debris clearing startup, Delta. Posted by Dalton Leger (personal profile, handle dalton.knope) in Delta group at 08:38 MDT: "I'm starting my local business if you need any junk removal debris clearing or anything let me know". No phone or email published in post; no business name given yet. Genuine new home-service operator, junk-removal segment overlap. Post: https://facebook.com/groups/1504277980997243/permalink/1796145601810478/
2. **Applewood Painting Company LLC** — fine residential painting, Denver Metro. Posted by the business Page itself ("Applewood Painting") in Colorado Business Networking at 09:43 MDT. Owner James. Phone 720-589-1654 and applewoodremodel@gmail.com published in post. Post: https://facebook.com/groups/2803047646497352/permalink/4062848570517247/
3. **Designs by Starla Ann Home Services** — interior/exterior painting, Parker, CO (husband-and-wife team, Kendrick and Starla). Posted by the business Page itself (handle starladefreeze) in Colorado Business Networking at 09:28 MDT. Phone 972-822-5318 published in post (note: 972 is a Dallas-area code on a Parker, CO business; copied verbatim as published). Post: https://facebook.com/groups/2803047646497352/permalink/4062833240518780/
4. **Osorio Carpet & Flooring** — flooring installation (carpet, hardwood, laminate, tile, vinyl), Denver. Posted by the business Page itself ("Osorio Carpet", handle OsorioDenverCarpet) in Colorado Business Networking at 08:52 MDT. Phones 303-472-9906 and 720-404-2240 published in post. Post: https://facebook.com/groups/2803047646497352/permalink/4062796137189157/

DM note: per standing constraint, no Messenger CLI sends attempted (recipients not in synced Messenger contacts). Browser DM route is the parent's call; all four business Pages/posts are on Nolan's visible feed.

### Observed but not pursued
- Robert Doyal, Delta: carousel post, text only "Any questions please message or call 970-261-2653". No business name or trade identifiable from text; cannot verify a home-service business. Skipped as unverifiable.
- Aila Thai Kitchen (Delta, 970-258-6798): restaurant, weak home-services fit.
- Free scoop of ice cream promo (Delta): retail food promo, not a fit.
- Scout troop announcement (Delta): nonprofit, not a business.
- The Bread Basket Farm Stand (Palisade, Whitewater): farm/baked-goods stand, food, weak fit.
- Plant swap (Palisade): community event, not a business.
- Aesthetics 360 Lash & MedSpa sponsor spotlight (Colorado Business Mingle): medspa, not home services.
- Your Tarotpist (Colorado Business Networking): entertainment, not a fit.
- Personal trainer promo (Colorado Business Networking): not a home-service trade.
- Catfish seasoned fries food post (Colorado Business Networking): food, not a fit.
- Farmers insurance agent Dulcinea Garcia, Pueblo (Colorado Business Networking): B2B insurance, weak fit.
- Westminster rental listing (Colorado Business Networking): property management retail listing, weak fit.
- Lougrich business funding promo (Colorado Business Networking): B2B, not a fit.
- Nurture suite rental (Colorado Business Networking): salon suite rental, weak fit.
- Real estate walkthrough/class posts (Colorado Business Networking): not home services.
- Free computer promo (Living In Grand Junction): retail, not a fit.
- Class registration post (Living In Grand Junction): not a business.
- All remaining buy/sell listings across Western Colorado Message Board, Buy & Sell in Grand Junction, Fruita, Palisade groups: individual resale items, no business promos.

### Notes
- Denver-area groups (Colorado Business Networking in particular) are now producing steady home-service promos (painting, flooring), validating the outward-expansion group set.
- Glenwood Springs Message Board: 0 posts in the delta window.
- No repeats of prior prospects (Buffalo's, Rocky Mountain Landscape Innovations, AG Property Services, Chalkline Ridge, Monument View, Abel Jimenez, Coldiron's, All Around Window Washing).

## 2026-09-09 — Facebook DM browser task blocked (session logged out)

The browser DM task for delta-since scans #2-#4 could not start: the Facebook browser session is logged out (messenger.com and facebook.com/messages redirect to login; restore_saved_login returned login_form_required; saved-credential fill aborted without approval). Nothing sent, no duplicates created.
- Verification of prior sends to Buffalo's Construction & Landscaping (BettcherRivera Jose), Rocky Mountain Landscape Innovations, and All Around Window Washing is still pending.
- New DMs to Dalton Leger, Designs by Starla Ann Home Services, and Osorio Carpet & Flooring are drafted and parked, waiting on sign-in.
- Unblocks: (1) Nolan signs into Facebook in the browser session himself, (2) Nolan approves saved-credential sign-in via Secure Vault, or (3) explicit authorization for another sign-in path. Task left parked (not closed); rerun/steer after sign-in.

## 2026-09-09 — Delta-since scan #5 (Round 10, new posts since ~10:00 MDT)

**Result: 4 new genuine prospects.** Scanned 10 groups (~98 posts, min-timestamp 2026-09-09 10:00 MDT). All four came from Colorado Business Networking (outward-expansion set); Western Colorado groups produced only buy/sell, food promos, and events. Authors identified via the social.search post_url route. No DMs possible: Facebook browser session still logged out and Messenger CLI cannot send to non-contacts. All four parked with drafted DMs; parent adds them to pipeline.md under "Facebook — Denver-area groups" as NEW.

### New prospects
1. **All Season Improvements LLC** — remodeling/construction, Colorado Springs and surrounding areas. Posted by the business Page itself (handle AllSeasonImprovementsLLC, 14:16 MDT): interior/exterior remodeling, decks, flooring, painting, framing, drywall, landscaping; free estimates; website www.allseasonimprovements.com. No phone published. Post: https://facebook.com/groups/2803047646497352/permalink/4063033253832112/
2. **Ariana House Cleaning** — residential cleaning (move-in/move-out, deep, recurring). Posted by Gladis Ramirez (personal profile, handle gladis.ramirez.385523, 14:04 MDT). Phone 303-505-5991 published in post. Post: https://facebook.com/groups/2803047646497352/permalink/4063025237166247/
3. **Choice Lawn Care** — lawn care, Loveland. Posted by Evan Lindenthal (personal profile, handle evan.lindenthal, 12:33 MDT): locally owned 13 years, owner on-site every job. Phone 970.732.8990 published in post ("Call or Text Evan"). Post: https://facebook.com/groups/2803047646497352/permalink/4062998743835563/
4. **BS Locksmith** — locksmith (automotive, residential, commercial, emergency), Aurora, CO and Denver metro. Posted by Shlomo Benizri (personal profile, handle shlomi.benizri.3, 12:17 MDT), identifies as owner. Address 2993 S Peoria St #136, Aurora, CO 80014; website www.bs-locksmith.com; phones 720-372-8021 and 720-372-8577 published in post. Post: https://facebook.com/groups/2803047646497352/permalink/4062984123837025/

### Observed but not pursued
- Justin Tipton (handle sean.swhaen): "Custom painting" post; artist, not a trade painter. Wrong trade.
- HVAC/plumber referral-group ask: recruiting, not a business promo. Possible networking opportunity for Nolan, not a PING prospect.
- Robert Doyal, Delta (970-261-2653): unverifiable, skipped.
- Restaurants/food promos: Surf To Turf (Palisade x2), Aila Thai Kitchen (Delta), B&S sourdough (Orchard Mesa), Vecinos/Cafe India/Monaghan's bars, pet resort (Fruita).
- B2B services: VA loans, marketing agency, hair salon, real estate, medspa, business mastermind.
- All buy/sell resale listings in the 6 Western Colorado groups; Glenwood Springs group had 0 posts in window.

### Notes
- Colorado Business Networking keeps producing steady home-service promos (remodeling, cleaning, lawn, locksmith); the outward-expansion set is validated again.
- New post URL pattern: facebook-cli returns post_url with trailing `/?sale_post_id=...` on sale listings; social.search accepts the plain permalink.
- Parked DM drafts for all 4 are saved in ~/workspace/outreach/facebook-scan-round10.md; nothing sent.

## 2026-09-09 — Delta-since scan #6 (new posts since 14:16 MDT)

**Result: 4 new genuine prospects (all from Colorado Business Networking).** Scanned 10 groups with min-timestamp 2026-09-09 14:16 MDT (~71 posts). Note: facebook-cli `groups posts` returned empty `content` fields on every post this run, so triage used social.search semantic group queries plus post_url lookups for author/identity. Western Colorado groups produced only buy/sell resale listings, food sellers, a realtor open house, and community posts; nothing new from Delta, Orchard Mesa, Fruita, Palisade, Glenwood Springs, Living In Grand Junction, or Colorado Business Mingle in the window.

### New prospects (for parent to add to pipeline.md)
1. **Lord's Construction LLC** — general contractor (decks, pergolas, custom builds), Colorado Springs (719 area code). Promo reels shared in Colorado Business Networking ~16:41 MDT, posted by @saulo.lordconstruction (Saulo Lordconstruction, 1.4K followers) and the business Page. Business card in video: "LORD'S CONSTRUCTION LLC GENERAL CONTRACTOR — Complete Home Solutions, Built Strong, Built Right". Published contacts: Saul Leyva 719-717-5794, Felicia Kelly 719-250-7504, lordsconstructionllc@gmail.com. Strong PING fit (estimate requests, scheduling). Reels: https://www.facebook.com/reel/1475797461050302/ and https://www.facebook.com/reel/1702887247934795/
2. **This Is How We Move It LLC** — moving company, website thisishowwemoveit.com published in post. Posted by its Page (1.2K followers) in Colorado Business Networking ~15:10 MDT. No phone published in post. Fit: booking/lead capture for movers. Found via group-scoped semantic search; exact permalink not exposed by the search index.
3. **McDowell Moving** — moving and junk removal, Colorado Springs. Promo reel ("Ranked #4 Best Mover Colorado Springs — Home Guide Help"), phone 719-292-8253 published. Posted by Brody McDowell in Colorado Business Networking. Reel: https://www.facebook.com/reel/4180654868892057/ (created 16:20 MDT). Timing note: one McDowell post observed at 11:59 MDT (before the 14:16 watermark) but not in the scan #5 log, so treated as new here. Fit: moving/junk-removal booking and lead capture.
4. **Zion Woody** (handle zion.woody.5) — "The Roof Guy / Insurance Claim Expert", CO (2,289 followers). Post in Colorado Business Networking at 16:05 MDT. Caveat: post caption came back empty on the post_url lookup, so business-promo content is unconfirmed; flagged tentatively on bio + networking-group posting. Post: https://facebook.com/groups/2803047646497352/permalink/4063159837152787/

### Parked DM drafts (nothing sent: FB browser session logged out, Messenger CLI cannot send to non-contacts)
1. Lord's Construction / Saulo:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Saulo, saw your Lord's Construction reels in Colorado Business Networking showing off the deck and pergola builds.
>
> We help owner-led contractors capture every estimate request and cut admin drag so no lead slips while you are on a job.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
2. This Is How We Move It LLC:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your moving company post in Colorado Business Networking.
>
> We help owner-led service businesses capture every booking inquiry and follow up automatically so no move slips through the cracks.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
3. McDowell Moving / Brody:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Brody, saw your McDowell Moving post in Colorado Business Networking, congrats on the number 4 mover ranking.
>
> We help local service businesses turn every inquiry into booked jobs with less admin drag.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
4. Zion Woody:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Zion, saw your post in Colorado Business Networking.
>
> We help trade businesses capture every lead and cut the admin work so nothing falls through.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Observed but not pursued
- Dough Pros, Grand Junction Redlands: sourdough seller, food, weak fit. Post: https://facebook.com/groups/108728816001912/permalink/3405749542966473/
- Laura Black, RE/MAX 4000: Palisade open house listing (3587 G Road, $949,000), real estate, not home services.
- Joe Gallagher (Buy & Sell GJ): empty caption, unverifiable.
- Michelle Travis Webb (Buy & Sell GJ): homecoming dresses resale.
- 17 of 20 Buy & Sell GJ posts: sale listings (furniture, vehicles, clothing), resale items.
- Robert Kanieski (Glenwood): hiking question, not business.
- Robin Wittlin (Glenwood): looking for furnished studio rental, not business.
- Miriam Muniz-Fennell (Glenwood): Basalt Town Council zoning update, not business.
- Country Club Pet Resort (Fruita, 12:42 MDT, pre-watermark): pet resort, weak home-services fit.
- Living In Grand Junction: free computer promo (retail, weak fit, pre-watermark).
- Palisade: Bread Basket Farm Stand (food), wine-bottle sconce craft seller, backyard woodshop pieces (resale), yoga class announcement.
- Semantic re-hits of already-logged prospects: Buffalo's Construction & Landscaping, Rocky Mountain Landscape Innovations, Dalton Leger.
- Klein's Handyman A to Z, LLC (Zach Klein, junk removal/hauling/handyman): posted in a group outside the target set and before the window; noted as a future lead if it resurfaces in a target group.

### Notes
- facebook-cli group-post content regression: `content` field empty on all posts this run (earlier same-day scans got text). Triage via social.search semantic group queries worked well and additionally exposes author bio and published contact info.
- Colorado Business Networking remains the highest-yield group (contractors, movers, roofers). Western Colorado groups in this window: no new home-service promos.
- Watermark: next scan should use min-timestamp 2026-09-09 17:15 MDT (unix 1788995700).

## 2026-09-09 — Delta-since scan #7 (new posts since 14:15 MDT)

65 posts scanned across the 6 target groups (sort=NEW_POSTS, min-timestamp unix 1788984900). Counts: Western Colorado Message Board 12, Buy & Sell in Grand Junction 20, Delta 7, Orchard Mesa 2, Fruita 20, Living In Grand Junction Colorado 6.

### New prospect (added to pipeline.md under "Facebook — Western Colorado (group-sourced, 2026-09-08)", status NEW)
1. **Unnamed fireplace service (Western Colorado)** — chimney/fireplace services, Grand Junction/Delta area. Phones 970-274-9316 (post text) and 970-274-9315 (author's own comment on two posts + separate Orchard Mesa post) published in group posts. Author identity unresolvable: group-post API strips authors, social.search post_url lookup timed out, semantic search fallback found no match, comment read exposed no author, and the post gives no business name. Five post instances across Western Colorado Message Board, Buy & Sell in Grand Junction, Delta, and Orchard Mesa groups in one evening (14:46 to 18:09 MDT). DM blocked (session logged out), queued as pipeline NEW. Posts: https://facebook.com/groups/1504277980997243/permalink/1796447135113658/ , https://facebook.com/groups/486356801008208/permalink/1101936542783561/ , https://facebook.com/groups/108728816001912/permalink/3405786559629438/

### Parked DM drafts (nothing sent: FB browser session logged out, Messenger CLI cannot send to non-contacts)
5. Unnamed fireplace service:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your fireplace service posts across the Western Colorado groups.
>
> We help owner-led service businesses capture every call and text inquiry and follow up automatically so no job slips while you are on the tools.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Observed but not pursued
- ICF dealer/distributor (Fruita group, 17:42 MDT): "very competitive ICF dealer/distributor" offering ICF block delivery and consulting, phone 970-910-8911 published. Construction-materials dealer, not a home-service trade in the target list; skipped.
- Esther Jade's Ltd natural bug spray (Buy & Sell GJ, 18:37 MDT): retail product sale, not home services.
- Laura Black RE/MAX 4000 (WCMB, 16:02 MDT): Palisade open house at 3280 B 1/2 Road, real estate, not home services.
- Open house 3280 B 1/2 Road peach property (WCMB, 17:26 MDT): real estate listing, not home services.
- Cahnyr's Creations (WCMB, 20:12 MDT): personalized crafts/keepsakes, retail, not home services.
- Doughbra's Farm Stand sourdough (WCMB 18:32, Fruita 18:35 MDT): food, not home services.
- The Brew Social coffee pop-up (Fruita, 19:38 MDT): food/coffee, not home services.
- Smith Family Orchards Farm Store fall hours (Living In GJ, 18:27 MDT): retail farm store, not home services.
- 20 Buy & Sell GJ posts: all sale/resale listings (tools, MacBook, motorcycle, vacuum, clothing, trailer, apartment lease, truck, etc.), no home-service promos.
- Remaining Fruita/Living In GJ/Orchard Mesa posts: community notices, missing cat, sponsors, photos, sewing lessons, computer promo (retail), sewing machine recommendation request (not a business).
- Delta posts with empty captions (6 of 7): one has 1 comment, verified not a business promo via comment read on the fireplace post.

### Notes
- No author-identification success this run: social.search post_url lookup timed out once (infrastructure error), semantic fallback found no match, comment reads exposed no authors. Phone numbers remain the usable contact.
- DM blocked: Facebook browser session logged out and Messenger CLI cannot message non-contacts, so no DMs attempted; prospect queued as pipeline NEW with a parked draft above.
- Watermark: next scan should use min-timestamp 2026-09-09 20:15 MDT (unix 1789006500).

## 2026-09-09 — Delta-since scan #8 (new posts since 20:15 MDT, Round 13)

**Result: 3 new genuine prospects (all Colorado Business Networking; Western Colorado groups yielded nothing).** Scanned all 10 target groups (~40+ posts). Authors identified via social.search post_url lookups (all 4 succeeded this run). All three deduped against facebook-dms.md, pipeline.md, and leads.md (no repeats); added to pipeline.md under "Facebook — Denver-area groups" as NEW. No DMs possible (Facebook browser session logged out; Messenger CLI cannot send to non-contacts). DM drafts parked below.

### New prospects
1. **ReliableMC** — home remodeling & handyman, Eagle County, CO. Business Page (2,593 followers); bio lists kitchens, bathrooms, decks, repairs; free estimates. No phone published. Post: https://facebook.com/groups/2803047646497352/permalink/4063378987130872/
2. **Avalanche Tree Service** — tree service, 719 area (Colorado Springs region). Posted by Dustin Bardill (handle dustin.bardill). Phone 719-644-4931 published in post. Post: https://facebook.com/groups/2803047646497352/permalink/4063366760465428/
3. **Builders Choice Hardwood Flooring LLC** — hardwood flooring, Broomfield / Front Range. Posted by Don Lapp (handle don.lapp.73, tagged Arvada). "Family Owned Since 1991. BBB A+ RATING, Fully Insured. FREE ESTIMATES 720-435-6755 OR 720-495-5998". Business identity via BBB listing phone match on 720-435-6755 (STRONG INDICATION). Post: https://facebook.com/groups/2803047646497352/permalink/4063313487137422/

### Notable demand signal (not a prospect)
- Delta homeowner posted 21:05 MDT asking "Anyone in Delta or Montrose who can install a wood fireplace? Please DM me" — live buyer matching the unnamed fireplace service already in the pipeline (970-274-9316 / 970-274-9315). Logged as observed. Post: https://facebook.com/groups/1504277980997243/permalink/1796545581770480/

### Observed but not pursued
- Seth Lainez roofing video (21:02 MDT): no business name/trade in caption, unverifiable.
- Shared-business-postcard B2B marketer, Kebab & Gyro House food promo: not home services.
- Buy & Sell GJ: all 20 posts resale items; WCMB/Mingle/Glenwood: 0 posts; Fruita/Living In GJ/Orchard Mesa/Palisade: farm posts, community notices, entertainment, empty captions.

### Parked DM drafts (nothing sent: FB browser session logged out, Messenger CLI cannot send to non-contacts)
1. ReliableMC:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your remodeling and handyman post in Colorado Business Networking.
>
> We help owner-led service businesses capture every estimate inquiry and follow up automatically so no job slips while the crew is working.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
2. Avalanche Tree Service / Dustin:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Dustin, saw your Avalanche Tree Service post in Colorado Business Networking.
>
> We help tree crews answer every call and book estimates instantly so storm and fall cleanup inquiries never hit voicemail.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
3. Builders Choice Hardwood Flooring / Don:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Don, saw your Builders Choice Hardwood Flooring post in Colorado Business Networking.
>
> We help family-run trades capture every free-estimate request and follow up automatically so no flooring job goes to the shop that called back first.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Watermark
- Next scan: new posts since 2026-09-09 22:50 MDT (unix 1789015800).

## 2026-09-10 — Delta-since scan #9 (Round 14) — new posts since 22:50 MDT 2026-09-09

**Result: 0 new genuine prospects.** Scanned all 10 target groups with facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789015800` plus social.search semantic cross-checks on Colorado Business Networking and Colorado Business Mingle. Late-night window (~3.4 hours); the Colorado business groups produced zero new posts in the window and the Western Colorado groups produced only resale listings and one empty-caption personal post.

### New prospects
None. Nothing to merge into pipeline.md.

### Observed but not pursued
- Buy & Sell in Grand Junction: 8 new posts since 22:50 MDT, all resale listings (colored pencils, fountain pens, jogger set, Halloween Ghostface figure, vintage jewelry booth at Market on Main GJ, Gianni Bini pumps, Pizza Skateboards deck, vintage dress). No home-service promos.
- Living In Grand Junction Colorado: 1 new post (23:24 MDT) by Eric Gile (handle ezgeezy), empty caption, personal account, not a business. Post: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3429801290542142/
- Western Colorado Message Board & Classifieds, Delta, Orchard Mesa, Fruita, Palisade, Glenwood Springs: 0 new posts in window.
- Colorado Business Networking: 0 new posts in window via API; semantic search fallback surfaced only pre-window posts (latest 16:41 MDT 9/9, already logged in scan #6).
- Colorado Business Mingle: 0 new posts in window via API; semantic fallback found one pre-window post (11:22 MDT 9/9).

### Parked DM drafts
None needed this round.

### Notes
- The facebook-cli content-regression from scan #6 is resolved this run: Buy & Sell GJ returned full post text.
- facebook-cli groups posts returned genuinely empty result sets for 7 groups; semantic cross-checks confirm nothing was missed in the two business groups.
- No DMs possible (Facebook browser session logged out; Messenger CLI cannot send to non-contacts); none attempted.
- Watermark: next scan should use min-timestamp 2026-09-10 02:15 MDT (unix 1789028100).

## 2026-09-10 — Delta-scan #10 (Round 15) — new posts since 02:15 MDT

**Result: 1 new genuine prospect.** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789028100` (window 02:15 to 05:16 MDT). Only 2 new posts in window (Buy & Sell in Grand Junction: 1; Palisade: 1); all other groups returned zero.

### New prospects
1. **2nd Time Around Co** — metal roofing & siding supplies + installation, Parachute CO / western slope. Author: Business Page (handle constructionmaterialsParachute, 1,945 followers), identified via social.search post_url lookup. Phone 970-216-6905 published in post. Posted 02:31 MDT in Palisade group. Post: https://facebook.com/groups/whatshappeningpalisade/permalink/4110542592588878/ — Caveat: trade-adjacent (primarily a materials dealer offering installation, not a pure contractor). Added to pipeline.md under "Facebook — Western Colorado" as NEW. DM parked (recipient not in Messenger contacts; browser session logged out).

### Observed but not pursued
- Buy & Sell in Grand Junction: 1 new post, individual resale listing (Columbia hiking boots), not a business.

### Parked DM drafts
1. 2nd Time Around Co:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your metal roofing and siding supplies post in Palisade.
>
> We help owner-led trades capture every estimate inquiry and follow up automatically so no job slips while the crew is on the tools.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes
- No DMs sent (browser session logged out; Messenger CLI cannot send to non-contacts); none attempted.
- Watermark: next scan should use min-timestamp 2026-09-10 05:16 MDT (unix 1789039019).

## 2026-09-10 — Delta-scan #11 (Round 16) — new posts since 05:16 MDT

**Result: 0 new genuine prospects.** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789039019` (window 05:16 to 08:15 MDT). 43 posts in window across the groups; the Western Colorado groups produced only resale listings, food pre-orders, a roommate ad, and one thin ambiguous one-liner. The two business groups (Colorado Business Mingle, Colorado Business Networking) produced no home-service promos; only an event, an auto-dealer ad, wellness/tax/family-services posts, and a networking-zoom call.

### New prospects
None. Nothing to merge into pipeline.md.

### Observed but not pursued
- Fruita group, 07:50 MDT: Bobby Schenck (handle bobby.schenck.127, personal profile, 1 follower) posted "Give us a call for all your call tree needs." Possibly a tree-service promo, but no business name, no phone, and caption is one ambiguous line, so it does not qualify as a genuine identifiable business. Post: https://facebook.com/groups/3741333852807065/permalink/4462048504068926/
- Buy & Sell in Grand Junction: 10 new posts, all individual resale listings (shoes, trailer axle, grape jelly, cabinets, wine bottle lights, TVs, copier, office cubicles) plus one bread pre-order from Redlands (food, not a home service).
- Western Colorado Message Board & Classifieds: 2 new posts, both resale listings (grape jelly, holiday wine bottle lights).
- Delta: 2 new posts, a Thai restaurant hours announcement and one empty-caption personal post.
- Orchard Mesa: 1 new post, empty caption, image-only personal post (Elizabeth Nunn).
- Fruita: 10 new posts; roommate wanted ad, Kyra motherhood-photography promo (photography, out of segment), Bryan looking to buy flagstone (not a promo), a "Local business Thursday" caption-only post from 2026-09-09 (pre-window), family meetup post (Palisade group, event not business).
- Colorado Business Mingle: Halloween charity event post and one empty-caption post. Nothing commercial-home-service.
- Colorado Business Networking: 16 new posts; Soul Spark Summit event invite, Black Diamond Auto Sales dealer ad (Omar, 719-290-9237, auto not home service), Watsu/wellness promo, tax-prep tip post, travel-question engagement post, Bridges & Roots Family Services LLC co-parenting post, Colorado Springs networking-zoom call, several empty-caption image posts.
- Living In Grand Junction Colorado, Glenwood Springs: 0 new posts in window.

### Parked DM drafts
None needed this round.

### Notes
- No DMs sent and none attempted: Facebook browser session is logged out and Messenger CLI cannot send to non-contacts. The ambiguous "call tree" post has no business identity, so there is nothing to park a draft against.
- social.search post_url author-lookup route continues to work cleanly for the thin-text posts; authors identified for all candidates needing it.
- Watermark: next scan should use min-timestamp 2026-09-10 08:15 MDT (unix 1789049721).

## 2026-09-10 — Delta-scan #12 (Round 17) — new posts since 08:15 MDT

**Result: 0 new genuine prospects.** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789049721` (window 08:15 to 10:56 MDT). ~60 posts in window. Western Colorado groups produced only resale listings, food promos, real-estate notices, buyer requests, and empty-caption personal posts. The two business groups produced photography, restaurant, wellness/financial, event, and food posts, plus one home-based auto-repair technician (not a home-service trade, no business name).

### New prospects
None. Nothing to merge into pipeline.md.

### Observed but not pursued (buyer demand signals worth noting for intelligence)
- Fruita, 10:55 MDT: resident seeking "reputable appliances repairman for Fruita," says their usual company "is not answering the phone." Live demand signal for appliance-repair prospecting; buyers notice unanswered phones. Post: https://facebook.com/groups/3741333852807065/permalink/4462205700719873/
- Fruita, 10:47 MDT: resident hunting for fencing work (~2 acre pasture fence, welding a plus for an arena) — live demand signal for fencing/welding contractors. Post: https://facebook.com/groups/3741333852807065/permalink/4462199460720497/
- Fruita, 10:16 MDT: resident asking for good carpet cleaners — demand signal for carpet/upholstery cleaning. Post: https://facebook.com/groups/3741333852807065/permalink/4462173114056465/
- Colorado Business Networking, ~10:24 MDT: semi-retired master technician offering auto repairs from home near "Astrozon and Academy" — auto trade, no business name, not home services. Skipped.

### Observed but not pursued (everything else)
- Buy & Sell in Grand Junction: 20 new posts, all resale listings (pillow shams, Fiestaware, dogfood container, used air nailers, KTM 390 ADV, Grinch pillows, jacket, tabletop fireplace, Dodge Ram 2500 work truck, kids clothes, boots) plus one empty-caption post.
- Western Colorado Message Board & Classifieds: 4 resale listings (artificial plant, Huffy bike, mattress, open-house-tour real estate cross-post) plus a new-members welcome post.
- Delta: Fort Uncompahgre history trivia, Lovemore real-estate "under contract" notice (real estate, skipped), one empty-caption post.
- Orchard Mesa: The Bread Shed bread/cookies weekend promo (food).
- Fruita: Bread Shed cross-post, B&S sourdough bakery promo (food), Bray Real Estate open house (real estate), free couch pickup, Jay Cut Dat $20 haircut days (barber, not home service), free fish tank, soft-play kids' birthday rental promo (party/entertainment, not a contractor trade), one fluff "thoughts" post.
- Living In Grand Junction Colorado: 2 empty-caption posts, one charity cause event (Oct 9).
- Colorado Business Mingle: 2 empty-caption posts.
- Colorado Business Networking: Brandon Shaw Prudential retirement pitch (financial B2B), Folkish Photography Airbnb photos (photography), KK Photo Co newborn photography, Vecinos Mexican Grill specials (restaurant), theatre engagement question, Gary Barnes sales bootcamp Denver event, software MRR commentary, C. Rose Nail Co hand-painted nails Arvada (beauty), Fire Roasted Salsa engagement (food), Dry Creek Fall Festival vendor call Centennial (event), Blue Knights mug post (personal), real-estate quote, Centennial wedding photographer 720-296-8633 (photography), Aurora networking Zoom invite, several empty-caption image posts.
- Palisade: El Rey Quesabirria lunch special (restaurant/food), Loaded Pony Lemonade weekend special (food), National Swap Ideas Day engagement post, Palisade Open House Tour (real estate).
- Glenwood Springs: one newcomer asking about November/winter weather prep (community question, not a promo).

### Parked DM drafts
None needed this round.

### Notes
- No DMs sent and none attempted: Facebook browser session logged out; Messenger CLI cannot send to non-contacts.
- Morning window (2h41m) was heavy on resale turnover in the classifieds groups but produced zero trade-business promos; the buyer demand signals (appliance repair, fencing, carpet cleaning in Fruita) reinforce that unanswered phones and no-callbacks are the sharpest pain point to pitch on in drafts.
- Watermark: next scan should use min-timestamp 2026-09-10 10:56 MDT (unix 1789059390).

## 2026-09-10 — Delta-scan #13 (Round 18) — new posts since 10:56 MDT

**Result: 1 new genuine prospect.** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789059390` (window 10:56 to 11:15 MDT). Short window, thin volume: 7 posts total across the 10 groups. Author identified via the social.search post_url route (one lookup, success). No DMs sent and none attempted: Facebook browser session is logged out and Messenger CLI cannot send to non-contacts. DM draft parked below; prospect added to pipeline.md under "Facebook — Denver-area groups" as NEW, deduped against facebook-dms.md, pipeline.md, and leads.md.

### New prospects
1. **Polished Junk Solutions** — junk removal / cleanouts & hauling, 719 area (Colorado Springs region). Posted by Haley Martin (personal profile, handle haley.martin.333225; bio "Owner | Polished Junk Solutions, Property Clean-Up Specialist, Cleanouts & Hauling", 1,755 followers) in Colorado Business Networking at 10:58 MDT. Pitch: "Clearing out this weekend? We have next-day availability for junk removal! Send me a few pictures and your area, and I will get you a quick quote and a spot on tomorrow's route." Phone 719-290-7122 published in post. Photo-quote booking workflow is a textbook PING fit. Post: https://facebook.com/groups/2803047646497352/permalink/4064091490392955/

### Observed but not pursued
- Mile High Staging Co. (Colorado Business Networking, ~11:06 MDT): home staging for investors/realtors in Denver Metro, posted by Chelsea. Staging is B2B real-estate-adjacent, not one of the target homeowner trades; skipped. Post: https://facebook.com/groups/2803047646497352/permalink/4064098310392273/
- Parker open house listing (Colorado Business Networking, ~11:00 MDT): $799,999 listing at 6134 N Beckwourth Ct, real estate, skipped.
- AnthroEvolve Cooperative essay (Colorado Business Networking, ~11:08 MDT): ideological essay, not a business promo, skipped.
- Warp Zone (Fruita, 11:04 MDT): VR entertainment business promoting Fruita Fall Fest, warpzonegj.com; entertainment, not home services, skipped. Post: https://facebook.com/groups/3741333852807065/permalink/4462214067385703/
- Buy & Sell in Grand Junction: 2 new posts, both resale listings (Total Gym $75, Ram Rebel seat covers). Skipped.
- Western Colorado Message Board & Classifieds, Delta, Orchard Mesa, Living In Grand Junction Colorado, Colorado Business Mingle, Palisade, Glenwood Springs: 0 new posts in window.

### Buyer demand signals worth noting for intelligence
None new this window; the Fruita demand signals from scan #12 (appliance repair, fencing/welding, carpet cleaning) still stand as the freshest.

### Parked DM drafts
1. Polished Junk Solutions / Haley:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Haley, saw your Polished Junk Solutions junk removal post in Colorado Business Networking, next-day availability is a great hook.
>
> We help owner-led haulers turn every photo-quote request into a booked route day with less admin drag, while you stay in control of the job.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes
- Junk removal continues to surface as the most active segment in Colorado Business Networking (Polished Junk Solutions follows McDowell Moving and Dalton Leger); the segment is validating for PING's quote-capture pitch.
- All 10 group queries ran clean this run; no empty-content regressions.
- No repeats of any previously logged prospects.
- 2026-09-10 ~11:40 MDT: spawned a browser DM task for the 10 parked prospects (Betcher/Cruz Buffalo's, RMLandscape2025, Dalton Leger, 2nd Time Around, All Around Window Washing, Saulo Lord's, ReliableMC, Dustin Bardill, Don Lapp, Brody McDowell). The task stalled after its initial facebook.com navigation (11+ min with no activity, no approval arriving on the detached run) and was closed with 0 DMs sent. All drafts remain parked. The 09:40 MDT re-login is still the last confirmed live session; the next run should verify the signed-in state before spawning DM work.

### Watermark
- Next scan should use min-timestamp 2026-09-10 11:15 MDT (unix 1789060528).

## 2026-09-10 — Delta-scan #14 (Round 19) — new posts since 11:15 MDT

**Result: 3 new genuine prospects (1 Western Colorado, 2 Colorado Business Networking).** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789060528` (window 11:15 to ~14:55 MDT). Authors identified via social.search post_url route (all 4 lookups succeeded, including one verification of the Delta empty-caption cluster). All three deduped against facebook-dms.md, pipeline.md, and leads.md (zero hits); parent adds to pipeline.md as NEW. No DMs sent and none attempted (Facebook browser session logged out; Messenger CLI cannot send to non-contacts).

### New prospects
1. **Legacy Home Solutions LLC** — painting / home improvement startup, Grand Junction/Fruita. Posted by Andres Perez (handle elfamoso.andres.2025) in Fruita at ~12:30 MDT: interior/exterior painting, surface prep, pressure washing, drywall repairs, free estimates. Phone 970-258-7378 published in post. Post: https://facebook.com/groups/3741333852807065/permalink/4462328654040911/
2. **Lamb Electric** — residential electrical, Clint Lamb (handle clint.lamb.94, owner), Colorado Business Networking at ~11:02 MDT: 30+ years, crew of four, troubleshooting, panel upgrades, EV chargers, lighting. Phone 970-581-4057 published in post. Note: 13 minutes before the 11:15 watermark but not logged in scan #13 (late indexing). Post: https://facebook.com/groups/2803047646497352/permalink/4064148263720611/
3. **Caudill Lawn Care Services** — lawn care, family-owned (Derrick & Laila Caudill), posted by the business Page (handle caudillawncareservices) in Colorado Business Networking at ~08:58 MDT: 17+ years experience, schedule openings this week. Phones 970-213-7556 / 970-213-7553, email Derrickcaudill93@gmail.com, www.caudillawncareservices.com. Pre-watermark post never logged in scans #12/#13; surfaced by reindexing. Post: https://facebook.com/groups/2803047646497352/permalink/4064034087065362/

### Observed but not pursued
- AG Property Services repeat promos (Delta, Orchard Mesa, Palisade): already logged.
- Revelation Horseshoeing (Delta, 970-216-9171): farrier, not a home-service trade.
- Delta empty-caption cluster (5 posts): verified via post_url lookup as personal image posts (Bill van Houten), not business.
- Food/events/retail: Spun studio & supply bread, Doughbra's Farm Stand, El Rey Quesabirria, Sunflower field event, Mountain Harvest Festival, fiber internet/pizza promo, free pizza.
- Colorado Business Networking: faith event, tax planning, open house, nail tech, gallery reception, realty recruiting, Meta Ads marketer, diesel hashtags, web-design ask, newsletter commentary. Colorado Business Mingle: 0 posts. Glenwood Springs: 1 community question. Buy & Sell GJ / WCMB: all resale listings.

### Parked DM drafts
Drafts for all three saved in ~/workspace/outreach/facebook-scan-round19.md; nothing sent.

### Notes
- facebook-cli min-timestamp is loosely applied (returned two pre-watermark posts prior scans never logged); grep-dedupe every candidate, as done this run.
- Western Colorado groups were resale/food heavy this window; Colorado Business Networking remains the steady trade-promo source.
- Watermark: next scan should use min-timestamp 2026-09-10 14:55 MDT (unix 1789073700).

## 2026-09-10 — Delta-scan #15 (Round 20) — new posts since 14:55 MDT

**Result: 2 new genuine prospects (1 Colorado Business Networking, 1 Fruita).** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789073700` (window 14:55 to ~17:14 MDT, 60 posts). Authors identified via social.search post_url route. Both deduped against facebook-dms.md, pipeline.md, and leads.md (zero hits); parent adds to pipeline.md. No DMs sent and none attempted (Messenger CLI cannot send to non-contacts; browser session state unknown this run, last known death 14:02 MDT).

### New prospects
1. **All-in-one Moving LLC** — moving / junk removal / hauling, Denver area (outward-expansion territory). Posted by "Lopez JA" (FB ID 61591679104289) in Colorado Business Networking at 16:59 MDT; contact named in post: Jesus Lopez, 720-695-9469. Services: moving, junk/trash removal, full property cleanouts, hauling, pickup/drop-off, same-day service. Bilingual post (English/Spanish). Phone route only. Post: https://facebook.com/groups/2803047646497352/permalink/4064390727029698/
2. **K&J Mobile Mechanic** — mobile auto mechanic, Grand Junction (FB Page, FB ID 61576856241097). Bio: "From your driveway to the highway! Locally Owned & Operated! Grand Junction, CO". Rates: $75/hr + parts, $45 diagnostics, $150/axle brake pads; booking via Facebook message only. No phone or email published. Post: https://facebook.com/groups/3741333852807065/permalink/4462424810697962/ — SKIPPED 2026-09-10 (out of segment: automotive, not home services).

### Observed but not pursued
- Revelation Horseshoeing (Fruita farrier promo): already logged round 19, farrier not a home-service trade.
- Honey Comb Grooming (Fruita, donating grooming vouchers): event-adjacent pet groomer post, not a business promo.
- Invisalign Days ad (Fruita dental office): dental/medical, not a contractor trade.
- Delta homeowner asking for blind repair referrals: consumer request, not a business promo.
- Community meeting-space request (Living In GJ): venue search, not a trade promo.
- Real estate listing 641 Grand View Drive (Living In GJ): real estate.
- Phat Foodz food truck schedule (Palisade): food.
- Buy & Sell GJ / WCMB: all 23 posts resale listings, no business promos.
- Colorado Business Networking: casting call, health insurance advisor, Watsu therapy, food pantry drive, emoji/photo-only posts, school seminar promo: no contractor trades.
- Palisade/Glenwood Springs: food truck post, cigarette-in-yard legal question, new-member welcome: nothing trade-related.
- Orchard Mesa: homecoming formal-wear shop post, one empty-caption post: not pursued.

### Parked DM drafts
1. All-in-one Moving LLC / Jesus Lopez:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Jesus, I saw your All-in-one Moving LLC post in Colorado Business Networking.
>
> With moving, junk removal, cleanouts, hauling, and same-day calls all running through one phone number, it is easy for a good lead to slip while the crew is on a job.
>
> I help owner-led service businesses capture every call and message automatically and cut the admin busywork, while the owner stays fully in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes
- facebook-cli (stefi proxy) session healthy this run, signed in as Nolan Geske. Browser session not directly observable from the scan; last known state is the 14:02 MDT instant session death. The facebook-session-watch cron (2h cadence) is the authoritative current reading.
- Watermark: next scan should use min-timestamp 2026-09-10 17:14 MDT (unix 1789082050).

## 2026-09-10 — Delta-scan #16 merge (Round 21, completed run ~20:28 MDT)

- 2 prospects from facebook-scan-round21.md merged into pipeline.md under "Facebook — Denver-area groups" as NEW: Custom Flooring (Denver area, phone 303 392-1825 published in post) and Liberty Painting LLC (statewide CO, no published contact). DM drafts remain parked in facebook-scan-round21.md (Messenger CLI non-contact restriction stands; browser session in blackout until 2026-09-11 16:05 MDT).
- Scan covered 54 posts across 10 groups (window 17:14 to 20:15 MDT). 13-minute delta since then is not worth a new scan this run; next watermark stays 1789092928 (2026-09-10 20:15 MDT).
- facebook-cli session healthy and signed in as Nolan Geske (observed during scan). Browser engagement stays dark per the blackout file.

## 2026-09-10 — Delta-scan #17 (Round 22) — new posts since 20:15 MDT

**Result: 3 new genuine prospects, all Denver/front-range outward-expansion (Colorado Business Networking); Western Colorado groups produced nothing.** Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789092928` (window 20:15 to ~23:25 MDT, 36 posts). 14 posts came back with empty content fields; all 14 resolved via social.search post_url lookups (14/14 succeeded), surfacing the 3 business promos hidden behind empty captions. Authors identified via the same route. All 3 deduped against facebook-dms.md, pipeline.md, and leads.md (zero hits). Added to pipeline.md under "Facebook — Denver-area groups" as NEW. No DMs sent and none attempted (browser blackout until 2026-09-11 16:05 MDT; Messenger CLI cannot send to non-contacts). DM drafts parked in facebook-scan-round22.md.

### New prospects
1. **Cortez Coatings LLC** — painting (interior/exterior), "Denver's flawless painting company", serves Castle Rock to Fort Collins. Phone 303-619-6547 published in Page bio (posted by business Page handle cortezcoatingsllc, 20:47 MDT). Post: https://facebook.com/groups/2803047646497352/permalink/4064610023674435/
2. **Denver Epoxy Plugs** — epoxy flooring artist, Styles Lucero (handle steven.lucero.399488; bio "CEO owner of Denver epoxy plugs"), 20:27 MDT. No phone; bio says "DM me for a free quote". Post: https://facebook.com/groups/2803047646497352/permalink/4064591767009594/
3. **High Plains Concrete & Contracting** — concrete contracting, locally owned, Denver front range (posted by business Page, 20:08 MDT). No phone in bio. Post: https://facebook.com/groups/2803047646497352/permalink/4064578767010894/

### Observed but not pursued
- COBizNet "free website system for contractors" post (20:51 MDT): B2B web-dev solicitation targeting Denver/Colorado Springs trade contractors for a beta test; also overlaps PING's own pitch. Not a home-service promo. Post: https://facebook.com/groups/2803047646497352/permalink/4064565187012252/
- The Cabin Escape Room (Delta, 2 photo posts): entertainment venue, not a home-service trade.
- Personal photo-only posts: Crystal Garcia, David Deighton, Manuel Medellin (COBizNet); Isabel Otis (Delta); Karina Prieto (Orchard Mesa); Elizabeth Nunn (Fruita x2); Armida Carballo, Aaron Badolato (Buy & Sell GJ).
- Resale listings: 350 Chevy engine, hideabed couch, Glade Park real estate, jukebox, iPhone 16, electric golf carts x2, weight sets, baby activity center.
- Food/events/community: Palisade pupusas food-truck update, Living In GJ dog event, Fruita ducklings, football cup sale, AI petition share, sunset photo, addiction-resource ask, Palisade elections discussion.
- Colorado Business Mingle and Glenwood Springs: 0 posts in window.

### Notes
- Empty-caption resolution is now routine and high-yield: 14 empty posts this window, 3 were genuine business promos (all COBizNet). Keep doing post_url lookups on every empty post in business groups; skip lookups in pure resale groups only after confirming the group pattern.
- COBizNet remains the steady trade-promo source; all 3 prospects tonight were Denver/front-range, none Western Colorado.
- Watermark: next scan should use min-timestamp 2026-09-10 23:30 MDT (unix 1789104600).

## 2026-09-11 — Delta-scan #18 (Round 23) — new posts since 23:30 MDT

**Result: 0 new genuine prospects. Quietest window on record.** Scanned all 10 target groups via facebook-cli (window 2026-09-10 23:30 to ~2026-09-11 02:15 MDT, only 3 new posts total, all skipped: two resale listings in Buy & Sell GJ, one nature photographer's photo in Colorado Business Networking resolved via social.search post_url lookup as Gwenn Charvet, not a business promo). All Western Colorado groups silent overnight. No DMs sent and none attempted (browser blackout until 2026-09-11 16:05 MDT).

### Group ID flag
- The legacy Colorado Business Mingle group ID (1361906894610347) now returns HTTP 404 (worked in scans #12-17, last successful ~Sep 10 23:25 MDT). A groups search found a same-named group at ID 5355730651191326 (12k members, Colorado Springs/Denver events focus); scanned for the window, 0 posts. Next scan should confirm which Mingle group we belong to and update the scan list; body still lists the legacy ID.
- Full scan report: ~/workspace/outreach/facebook-scan-round23.md.

### Watermark
- Next scan should use min-timestamp 2026-09-11 01:48 MDT (unix 1789112907).

## 2026-09-11 — Delta-scan #19 (Round 24) — new posts since 01:48 MDT

**Result: 0 new genuine prospects. Overnight-quiet pattern continued.** Scanned all 10 target groups via facebook-cli (window 2026-09-11 01:48 to ~05:15 MDT, 4 new posts total, all skipped). All 10 group IDs clean, including Colorado Business Mingle replacement 5355730651191326 (no 404 this run, 0 posts); 7 groups had zero new posts.

### Skipped this window
- Buy & Sell GJ, 03:17: empty-caption post resolved via post_url lookup to **2nd Time Around Co** (metal roofing/siding materials, Parachute CO, handle constructionmaterialsParachute). REPEAT of existing pipeline prospect (already NEW with phone 970-216-6905). Not re-added. Post: https://facebook.com/groups/108728816001912/permalink/3407270649481029/
- Buy & Sell GJ, 03:01: B&W 5th wheel hitch resale ($120, Grand Junction). Skipped, resale.
- Fruita, 05:14: personal fall post by Melody Clifton. Skipped.
- Colorado Business Networking, 02:55: The Good Place Spa facial promo (handle TheGoodPlaceMassage, MangoMint booking link). Skipped: beauty spa, not a home-service trade, already has online booking.

### Notes
- post_url lookups 3/3 on empty-caption posts this window. No DMs written or attempted (browser blackout until 2026-09-11 16:05 MDT; Messenger CLI non-contact restriction).
- Full scan report: ~/workspace/outreach/facebook-scan-round24.md.
- Watermark: next scan should use min-timestamp 2026-09-11 05:14 MDT (unix 1789125245).

## 2026-09-11 — Delta-scan #20 (Round 25) — new posts since 05:14 MDT

**Result: 1 new genuine prospect.** Scanned 8 groups via facebook-cli (window 2026-09-11 05:14 to ~08:16 MDT, 40 posts). 11/11 social.search post_url author lookups succeeded. Western CO groups yielded zero home-service promos this window; the one prospect came from Colorado Business Networking (outward-expansion pool).

**New prospect (logged, added to pipeline.md under "Facebook — Western Colorado (round 25 addition)", status NEW):**
- **Austin Wickham / Roofing With Austin** — roofing, Broomfield CO (Denver metro, outward-expansion). Phone-only promo (caption "📲720-325-7717") in Colorado Business Networking at 07:11 MDT; bio "ROOFING WITH AUSTIN, 📱720-325-7717, 🚀 Broomfield Chamber Ambassador" (handle austin.wickham.758). Deduped clean. DM not feasible (non-contact, Messenger CLI refuses; browser blackout until 16:05 MDT). Default route: phone pipeline. Post: https://facebook.com/groups/2803047646497352/permalink/4065091153626322/

**Repeat sightings (not re-added):** Applewood Painting (2 posts, still QUEUED), Avalanche Tree Service (still in pipeline). Both actively posting this morning.

### Skipped this window
- Resale listings, farm/food posts, personal posts, real estate, photography, auto detailing, salon, nonprofit, events across the 8 groups. Two Fruita empty-caption posts (Marybeth Kavanagh, Grand Mesa Arts & Events Center) were pre-window posts (~Sept 10 midday per social.search timestamps) that slipped through facebook-cli's NEW_POSTS min-timestamp filter (recent-activity resorting); both resolved as personal/arts, skipped.

### Notes
- post_url lookups 11/11 on empty-caption and in-scope posts. No DMs written or attempted (browser blackout until 2026-09-11 16:05 MDT; Messenger CLI non-contact restriction).
- Full scan report: ~/workspace/outreach/facebook-scan-round25.md.
- Watermark: next scan should use min-timestamp 2026-09-11 08:15 MDT (unix 1789136109).

## 2026-09-11 — Delta-scan #21 (Round 26) — new posts since 08:15 MDT

**Result: 2 new genuine prospects (both Colorado Business Networking, outward-expansion).** Scanned all 10 target groups via facebook-cli (window 08:15 to ~11:16 MDT, 75 posts). 22/22 social.search post_url lookups succeeded (2 promos + 20 empty-caption resolutions). Both deduped against facebook-dms.md, pipeline.md, and leads.md (zero hits). Added to pipeline.md under "Facebook — Denver-area groups (round 26 additions)" as NEW. No repeats of existing prospects. Western Colorado community groups produced zero contractor promos this window.

### New prospects
1. **Gemini Construction & Excavating LLC** — concrete construction (decorative/stamped concrete) + excavating, Fort Collins area. Posted by the business Page itself (122 followers) at ~10:15 MDT. Phone 970-324-6927 published in post. Software grade UNKNOWN. Post: https://facebook.com/groups/2803047646497352/permalink/4065276896941081/
2. **Forward Plumbing** — plumbing (leaks, clogged drains, water heaters, repairs), newly launched business. Posted by Evan Pedretti (personal profile, handle evan.pedretti) at ~10:52 MDT. No phone/email published; inbound via fillout.com lead form (visible Fillout use). Software grade UNKNOWN for core stack. Post: https://facebook.com/groups/2803047646497352/permalink/4065310923604345/

### Parked DM drafts (nothing sent: FB browser blackout until 16:05 MDT; Messenger CLI cannot send to non-contacts)
1. Gemini Construction & Excavating:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your concrete and excavating post in Colorado Business Networking.
>
> We help owner-led contractors capture every estimate request and follow up automatically so no concrete job goes to the shop that called back first.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
2. Forward Plumbing / Evan:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Evan, saw your Forward Plumbing launch post in Colorado Business Networking, the honest-diagnosis pitch is exactly right.
>
> We help new trade companies capture every inbound inquiry and follow up automatically so no leak call goes to voicemail while you are on a job.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes
- Yield pattern holding: Colorado Business Networking is the only group producing home-service promos; 8 Western Colorado community groups had zero contractor promos in the mid-morning window.
- Forward Plumbing is a genuine new-company launch with no published phone, so the post-blackout DM route is its only path (no phone pipeline route exists).
- Watermark: next scan should use min-timestamp 2026-09-11 11:15 MDT (unix 1789146953).

## 2026-09-11 — Delta-scan #23 (Round 28) — new posts since 14:18 MDT

**Result: 3 new genuine prospects.** Scanned all 10 target groups via facebook-cli (window 2026-09-11 14:18 to ~17:08 MDT, ~58 posts). 25/25 social.search post_url lookups succeeded (4 in-scope promos + 21 empty-caption resolutions). Deduped all against facebook-dms.md, pipeline.md, and leads.md. Added to pipeline.md under "Facebook — Western Colorado (round 28 addition)" and "Facebook — Denver-area groups (round 28 additions)", status NEW.

### New prospects
1. **High Country Window Washers** — window cleaning (pure-water system, tall homes), Western Slope (video tagged Grand Mesa, CO). Posted by Clayton Dowdell in Fruita, Colorado Message Board ~16:00 MDT. DM-based booking, no phone/email published. Software grade UNKNOWN. First genuine Western-CO group trade promo of the day. Post: https://facebook.com/groups/3741333852807065/permalink/4463445390595904/
2. **Joe Salley Home Remodeling LLC** — bathroom/home remodeling. Posted by Kendra Salley in Colorado Business Networking ~16:32 MDT; own site www.joesalleyremodeling.com in post. Software grade UNKNOWN. Post: https://facebook.com/groups/2803047646497352/permalink/4065553500246754/
3. **Broken Tip Property Investments** — property care / STR turnover cleaning, Colorado mountain properties, 2,434-follower business Page. Empty-caption visibility post in Colorado Business Networking ~16:55 MDT; thin evidence, WATCH-tier until enriched. Post: https://facebook.com/groups/2803047646497352/permalink/4065614043574033/

### Repeat sightings (not re-added)
- **All-in-one Moving LLC** (already NEW since 2026-09-10, parked DM draft) — new identical promo posted by "Lopez JA" in Colorado Business Networking ~16:32 MDT with phone 720-695-9469. Actively prospecting on Facebook. Post: https://facebook.com/groups/2803047646497352/permalink/4065553760246728/

### Skipped with reasons (not business promos or out of trade scope)
- Xrich Lytle (Fruita): "if anybody needs a RV or trailer moved" — side-hustle post by an individual, not an established business.
- INeedz LLC (COBizNet): phone repair — not a home-service trade.
- COBizNet: "Anyone on here make metal fences?" — customer ISO fence maker (demand signal, noted below, not a prospect); Billie Hessberger mortgage broker; John Jazwa realtor; SoccerHAUS youth soccer; Monaghan's karaoke bar; "Thank you ladies" event/personal; insurance pitch; two real-estate open houses; Jordyn Blide life coaching; Chelsea Gonzales (coach); Gustavo Deleon personal; Fish On with Steve fishing; Victoria Hernandez personal; Elizabeth Eluani personal; Wild Rabbit Massage (massage therapy).
- Delta: Isabel Otis personal; Chrystal Godfrey "Located in Cedaredge." (unresolvable as a business promo); lash tech appreciation (beauty); salsa competition (event).
- Buy & Sell GJ: all personal resale (Jeep, wind chime, decor, models, Switch, clock, crosses, Nerf); Ron Wilson empty-caption personal; Esther Jade's mullein tincture.
- Fruita: humidifier ISO (customer request); hiking photo; wellness circle (coaching); sprinkler blowout recommendation request (customer demand signal, logged below); 9/11 memorial post; Hannah fundraiser; costumes resale; radio station post; mobile mechanic ISO (demand signal, logged below); Toni Keating (retired personal); Maddy Chamberlain personal; Fruita Football (school team).
- Orchard Mesa: dog loose on Victoria Drive.
- LivingInGJ: Treva Millard (women's circle); Stephanie Moss personal; "TONIGHT!" event; wellness circle repost.
- Palisade: The Ordinary Fellow dinner event (restaurant).
- Glenwood Springs: one pre-window youth dance class post (slipped through NEW_POSTS filter), skipped.
- Mingle: Angel Elizabeth Nealy personal/religious.

### Demand signals (customer-side, not prospects)
- "Anyone on here make metal fences?" (COBizNet, 16:23 MDT) — active demand for a fence contractor; any fence prospect in pipeline can cite this timing.
- Fruita: sprinkler blowout recommendation request (16:39 MDT) — pre-winter blowout season is live; irrigation prospects take note.
- Fruita: ISO mobile vehicle mechanic for buyer inspection (14:24 MDT) — mobile-mechanic demand visible.

### Parked DM drafts (nothing sent: per task rules, no Messenger DMs to non-contacts; engagement-pass cron owns the cloud warm-up)
1. High Country Window Washers:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your pure-water window cleaning post in the Fruita group.
>
> With crews on ladders and poles all day, free estimate DMs can sit unread for days while the homeowner moves on to the next listing.
>
> We help owner-led trade shops capture every inquiry and follow up automatically, keeping you in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
2. Joe Salley Home Remodeling:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your bathroom remodel job post in Colorado Business Networking.
>
> Multi-week projects mean estimate requests land while you are on site mid-pour, and the fast callback usually wins the job.
>
> We help remodelers capture every inquiry and follow up automatically, keeping the owner in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
3. Broken Tip Property Investments:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw Broken Tip Property Investments in Colorado Business Networking.
>
> STR turnovers run on tight clocks, and a missed owner call between properties means a dirty check-in and a bad review.
>
> We help property care companies capture every call and message automatically so no turnover slips, keeping you in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes
- post_url lookups 25/25 this window. No DMs written or attempted (per task rules: Messenger CLI refuses non-contacts; cloud warm-up belongs to facebook-engagement-pass).
- Full scan report: ~/workspace/outreach/facebook-scan-round28.md. CSV rows: ~/workspace/outreach/csv-additions-round28-fb.csv.
- Watermark: max post timestamp seen 1789168069 (2026-09-11 17:07:49 MDT, COBizNet "Thank you ladies" post). Next scan should use min-timestamp 1789168069.

## Delta-scan #24 (Round 29) — 2026-09-11 17:07 to ~20:15 MDT

### New prospects (status NEW; nothing sent, nothing attempted; DM drafts parked in facebook-scan-round29.md)

- **Kenny's Overhead Doors** (business Page) | garage doors, 20+ years, Roaring Fork Valley, CO | empty-caption promo post, Colorado Business Networking ~19:04 MDT. Post: https://facebook.com/groups/2803047646497352/permalink/4065704236898347/ | DM feasibility: not feasible yet (not in synced Messenger contacts; Messenger CLI refuses non-contacts). Priority: WARM.
- **Redline Mobile Tire Services & Roadside Assistance LLC** (Omar Romero) | mobile tire + roadside + tire waste recycling; owner intro = new-business radar hit | Colorado (city unconfirmed) | Colorado Business Networking ~19:33 MDT. Post: https://facebook.com/groups/2803047646497352/permalink/4065726623562775/ | DM feasibility: not feasible yet. Priority: WARM.
- **JA Works LLC** (business Page) | home remodeling, kitchens/baths, basement finishing, junk removal, cleanouts, demolition | Denver & nearby areas | empty-caption promo, Colorado Business Networking ~18:32 MDT. Post: https://facebook.com/groups/2803047646497352/permalink/4065681276900643/ | DM feasibility: not feasible yet. Priority: WARM (outward-expansion pool).
- **Daniel Soligny junk removal** (personal profile; no business name) | junk removal, phone 719-358-1211 | Colorado (719 = Springs/Pueblo area, exact city unconfirmed) | Colorado Business Networking ~18:15 MDT. Post: https://facebook.com/groups/2803047646497352/permalink/4065668563568581/ | DM feasibility: not feasible yet. Priority: WATCH (thin evidence).

### Repeat sightings (not re-added)

None this window.

### Skipped with reasons (not business promos or out of trade scope)

- Murray Powder Coating (COBizNet): B2B industrial powder coating for contractors/fabricators, Hillrose CO — not a home-service trade, deliberately excluded.
- COBizNet: 9/11 memorial tribute; coaching promo; dessert retail promo; bookkeeping client testimonial (B2B service, not a trade); "I offer free consultations:)" (vague); empty-caption posts resolved as Front Range Fantasy Festival (event), BrandShamans (coaching), Bruce Knight (personal), Danielle McCarthy (financial education), NeNe Destinyy (personal), Bryce Delgado (personal), Find Your Light (arts nonprofit).
- WCO Message Board (3): all personal resale (floral arrangement, charger plates, glasses).
- Buy & Sell GJ (20): all personal resale; puppy-chewing-beds question (community demand, not a prospect); hay for sale (Loma).
- Fruita (9): puppy question (duplicate of Buy & Sell GJ); broken mower battery ISO; adoptable dogs shelter; goat-milk request for abandoned cat; ABC 9/11 coverage note; Mack CO greeting; Fruita football stands question; Amanda Latz rebellerally gift-card promo (personal resale); Robert Miller (personal account, no business info).
- LivingInGJ (3): all empty-caption, resolved as Amanda Latz (personal resale), Happy Little Rescue (pet rescue nonprofit), Motorcycle Trail Riding Association (trail-riding club).
- Palisade (3): schools question; inspirational-quote post; Palisade Pizza and Pourhouse football promo (restaurant retail, not a trade).
- Delta, Orchard Mesa, Glenwood Springs, Colorado Business Mingle: zero posts this window.

### Demand signals (customer-side, not prospects)

- Puppy chewing/destroying dog beds question posted in both Buy & Sell GJ and Fruita (~18:42 MDT) — recurring pet-behavior demand. Signal/unverified.
- Grass hay $8/bale, pickup by Sunday 9/13 10am, Loma (Buy & Sell GJ, 18:29 MDT) — ag sale, no business signal.

### Parked DM drafts (nothing sent: per task rules, no Messenger DMs to non-contacts; engagement-pass cron owns the cloud warm-up)

1. Kenny's Overhead Doors:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw Kenny's Overhead Doors in Colorado Business Networking.
>
> Twenty plus years servicing the Roaring Fork Valley means a strong reputation, and emergency calls for stuck doors still arrive after hours and mid-job when nobody can pick up.
>
> We help owner-led trade shops capture every call and follow up automatically, keeping you in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
2. Redline Mobile Tire Services & Roadside Assistance:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Omar, saw your Redline intro in Colorado Business Networking.
>
> A mobile tire business lives and dies on the ring: roadside callers who hit voicemail just call the next truck, and fleet downtime costs them money.
>
> We help new owner-led shops capture every call, book the job, and follow up automatically while you are on the road.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
3. JA Works LLC:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw JA Works LLC in Colorado Business Networking.
>
> Kitchens, baths, and cleanouts mean long on-site days, and estimate requests that land mid-demo usually go cold before anyone calls back.
>
> We help remodelers capture every inquiry and follow up automatically, keeping the owner in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309
4. Daniel Soligny junk removal:
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi, saw your junk removal post offering weekend haul-offs.
>
> When you are on a job, the next caller goes straight to the next hauler, so every missed text is a lost load.
>
> We help one-truck shops capture every inquiry automatically so no job slips while you are working.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Notes

- post_url lookups 17/17 this window (3 in-scope promos with content + 14 empty-caption resolutions). No DMs written or attempted (per task rules: Messenger CLI refuses non-contacts; cloud warm-up belongs to facebook-engagement-pass).
- Full scan report: ~/workspace/outreach/facebook-scan-round29.md. CSV rows: ~/workspace/outreach/csv-additions-round29-fb.csv.
- Dedup check: "Kenny" hit was Top Notch Hardwood Flooring's contact Kenny (Montrose) and "Overhead Door" hit was Colorado Overhead Door Company (Commerce City); neither is Kenny's Overhead Doors. All 4 prospects are new.
- Watermark: max post timestamp seen 1789179241 (2026-09-11 20:14 MDT, Buy & Sell GJ aluminum extension ladder resale post). Next scan should use min-timestamp 1789179241.

## 2026-09-11 — Delta-scan #24 (round 29, window 17:07-20:14 MDT)

- 55 new posts across 10 groups. 4 new genuine prospects, all from Colorado Business Networking (Western CO community groups produced zero trade promos this window).
- 17/17 social.search post_url lookups successful (14 empty-caption resolutions); 2 of 4 prospects came from empty-caption posts.
- No DMs sent, no likes/comments (browser session state owned by engagement cron; Messenger CLI non-contact restriction).

### New prospects (all parked DM drafts in facebook-scan-round29.md)
1. Kenny's Overhead Doors (Roaring Fork Valley garage doors, 20+ yrs, WARM) — strongest Western CO find of the window; prioritize once a DM path or phone opens.
2. Redline Mobile Tire Services & Roadside Assistance LLC (Omar Romero, new-business intro, town unconfirmed, WARM) — new-business radar hit.
3. JA Works LLC (Denver-area remodel/cleanouts/demolition, WARM) — outward-expansion pool.
4. Daniel Soligny junk removal (719 area, one-person, phone 719-358-1211, WATCH).

### Repeat sightings
- None this window.

### Demand signals
- Puppy chewing dog beds question (Buy & Sell GJ + Fruita, duplicate) — pet-behavior chatter, not a prospect.
- Grass hay $8/bale Loma (Buy & Sell GJ) — ag sale.

### Watermark
- Next scan min-timestamp: 2026-09-11 20:14 MDT (unix 1789179241).

## Round 30 — Facebook group scan (detached, read-only; 2026-09-11 20:14-23:15 MDT)

- 39 new posts across the same 10 groups. 1 new genuine prospect. 0 new-business radar hits. 1 demand signal.
- social.search post_url lookups 10/10 (2 in-scope business posts + 8 empty-caption resolutions). No DMs, likes, or comments (detached read-only run; Messenger CLI non-contact restriction).

### New prospects (1; parked DM draft in facebook-scan-round30.md)
1. Elijah Williams (trash can cleaning) (Grand Junction area, town unconfirmed, WARM) — customer referral cross-posted in Buy & Sell GJ, Fruita MB, and Living in GJ on 2026-09-11. Booking via Facebook Messenger to Elijah Williams; no phone/email/site published. opportunity_primary SOCIAL_PRESENCE (medium), secondary AUTOMATION (low). JSONL addition: ~/workspace/outreach/jsonl-additions-round30-fb.jsonl. Deduped against facebook-dms.md, pipeline.md, leads.md, and the canonical JSONL — new.

### Parked DM drafts (nothing sent)
1. Elijah Williams (trash can cleaning):
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Hi Elijah, saw your trash can cleaning service recommended in three Grand Junction groups tonight.
>
> Folks booking through Messenger means inquiries land whenever you are out on jobs, and the slow ones go quiet.
>
> We help one-person service shops capture every message instantly and turn them into booked jobs, keeping you in control.
>
> We are running a limited-time trial with a few local companies.
>
> Open to a 15-minute chat next week?
>
> PING Social, (970) 589-3309

### Repeat sightings
- Liberty Painting LLC (statewide CO painting, FB Page 61578695768062) posted a fresh promo in Colorado Business Networking at 23:02 MDT — already in pipeline/leads/JSONL since round 21. No new contact info.

### Demand signals (customer-side, not prospects)
- Living in GJ 21:31 MDT: customer looking for a local (non-chain) company to clean a sectional and recliner — upholstery/furniture cleaning demand with a local-preference bent. Signal/unverified.

### Notes
- Notable skips: Soda Saloon food promo (Delta/Orchard Mesa cross-post), Palisade Pizza and Pour House game-night promo, Ivy Massage Greenwood Village, Tattoo Aspen, Paula Zimmerman Re/Max 4000, DTFXpress printing growth post — none are home-service trades. 15+ personal resale posts skipped.
- Full scan report: ~/workspace/outreach/facebook-scan-round30.md. JSONL row: ~/workspace/outreach/jsonl-additions-round30-fb.jsonl (parent merges into canonical JSONL; nothing written to pipeline.md, leads.md, or the canonical store).
- Watermark: max post timestamp seen 1789189984 (2026-09-11 23:13 MDT, Buy & Sell GJ garage sale post). Next scan should use min-timestamp 1789189984.

## Round 31 — Facebook group scan (detached, read-only; 2026-09-11 23:13 → 2026-09-12 02:15 MDT)

- 7 new posts across the same 10 groups (7 of 10 groups had zero new posts). 0 new genuine prospects. 0 new-business radar hits. 0 demand signals.
- social.search post_url lookups 3/3 (2 in-scope ReliableMC winter-prep posts + 1 empty-caption resolution). No DMs, likes, or comments (detached read-only run; Messenger CLI non-contact restriction).

### New prospects
- None this window.

### Repeat sightings
- ReliableMC (home remodeling & handyman, Eagle County CO, FB Page 100068580073131) posted a fresh winter-prep promo twice in Colorado Business Networking at ~00:31 MDT ("windows, doors, gutters, and heat tape"). Already in pipeline.md (NEW, parked DM draft since round 21), leads.md, and facebook-dms.md. No new contact info. New seasonal angle worth noting on the record for a future draft refresh.

### Notes
- Quiet window: Western Colorado Message Board, Delta, Orchard Mesa, Fruita, Living in GJ, Palisade, and Glenwood Springs MB all had zero new posts since 23:13 MDT. Buy & Sell GJ had only 2 personal resale posts; CO Business Mingle had only a networking-event recap. All skips logged in the scan report.
- Full scan report: ~/workspace/outreach/facebook-scan-round31.md. No JSONL additions file created (zero new prospects).
- Watermark: max post timestamp seen 1789195507 (2026-09-12 00:45 MDT, Buy & Sell GJ vintage suitcase post). Next scan should use min-timestamp 1789195507.

## 2026-09-12 — Delta-scan #29 (Round 34) — new posts since 2026-09-12 00:45 MDT

**Result: 3 borderline prospects (all out of the home-services trade list; marked WATCH, not pursued).** Scanned all 10 groups (~60 posts, min-timestamp 1789195507). facebook-cli healthy; social.search post_url lookups 12/12 resolved (incl. empty-caption authors). ~60 posts retrieved; 3 groups hit the 20-per-page API limit so some mid-window posts may exist below the page. Full report: facebook-scan-round34.md.

### New prospects (WATCH, out-of-segment; DM drafts parked, none sent)
1. **Copeland's Detailing Domain** — mobile detailing, Palisade. Page author; phone 970-216-0930 published in both posts; 11 years experience, fleet/RV/boat work. Strongest of the round. DM draft parked. Added to pipeline.md as WATCH with out-of-segment caveat (detailing is automotive, not home services).
2. **Memphis Auto Spa** — mobile detailing, town unverified. Posted by Anderson Robert in Colorado Business Networking; phone 206-843-4424 published; 206 is a Seattle area code, needs location confirmation before pursuing. DM draft parked. Out-of-segment caveat.
3. **Happy Dog Pet Grooming** — pet grooming, Grand Junction (Jurassic Bark). Found via empty-caption author lookup; accepting new clients; no phone/email in post, reachable via Page. DM draft parked. Out-of-segment caveat (pet grooming, not home services).

### Demand signals (not prospects)
- ISO pickup haul request in Western Colorado Message Board.
- Fruita patio DIY advice request.

### Observed but not pursued
Food vendors, real estate, pageant, photo booth, waxer, guitar duo, entertainment, unverifiable empty-caption personals. No repeat sightings, no new-business radar hits.

### Watermark
- Next scan: new posts since min-timestamp 1789233105 (2026-09-12 11:11 MDT).

## 2026-09-12 — Delta-scan #30 (Round 35) — new posts since 2026-09-12 11:11 MDT

**Result: 3 new genuine prospects.** Scanned all 10 groups (78 new posts, min-timestamp 1789233105). social.search post_url lookups 19/19. Read-only throughout; no DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron). Full report: facebook-scan-round35.md. JSONL merged (canonical 274 -> 279 incl. research).

### New prospects (status NEW; parked DM drafts in facebook-scan-round35.md)
1. **Houston Specialty Contractors LLC** (Mike/Michael Houston) | junk removal/handyman/painting/drywall/rental turnovers for property managers, realtors, landlords | town unverified, 970 area | phone 970-608-2383 in post | WARM | DM parked.
2. **Kevlar Garage Services LLC** (business Page) | residential garage doors, image-only flyer promo, no phone/email/website observed | town unverified | WARM | DM parked.
3. **Samuel Rivera Rodriguez** (personal profile; bio "Junk Removal Long Start") | junk removal, image-only carousel, no contact info observed | WATCH | DM parked.

### Repeat sightings (not re-added)
- **Coldiron's Creations and Property Service** ("Wild Weed Wranglers", Delta, 970-209-4965): fresh fall leaf-season cleanup promo in Delta 12:00 MDT. DM SENT 2026-09-08 via browser, no reply on record. The fresh promo is the natural F1 hook (day 4-7 ladder eligible); F1 stays parked until a DM channel exists (browser session logged out, Messenger CLI non-contact restricted).
- **Memphis Auto Spa**: another detailing promo in Colorado Business Networking 11:42 MDT; already logged round 34 (WATCH, out-of-segment, location unconfirmed).

### Demand signals (customer-side)
- Fruita 14:02 MDT: Balanced Rock Inn (family inn) seeking a reliable local handyman as-needed. Signal/unverified.

### New-business radar
- Delta 13:56 MDT: "just launched" Alfajore cookie cottage bakery; food segment, not pursued. Logged as radar observation.

### Skips (flagged)
- Chris Storgion "Friendly Service" moving van ($58/hr, Ford E-150) in Colorado Business Networking: genuine trade fit but explicitly Colorado Springs. Western CO pools not thin, so per the expansion rule no JSONL row; parked in the scan report for a future outward-expansion go/no-go.

### Watermark
- Next scan min-timestamp: 1789243911 (2026-09-12 14:11 MDT).

## 2026-09-12 — Delta-scan #31 (Round 36) — new posts since 2026-09-12 14:11 MDT

**Result: 1 new genuine prospect.** Scanned all 10 groups (49 new posts, min-timestamp 1789243911). social.search post_url lookups 16/16. Read-only throughout; no DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron). Full report: facebook-scan-round36.md. JSONL row in jsonl-additions-round36-fb.jsonl (parent merges).

### New prospects (status NEW; parked DM draft in facebook-scan-round36.md)
1. **RG Resin** (peterson.terrance, personal profile, 199 followers) | custom epoxy flooring + countertops, free estimates per bio | image-only promo in Colorado Business Networking, no phone/email/website/booking path observed | town unverified | WARM | DM parked (author must resolve in Messenger contacts, else watch).

### Repeat sightings (not re-added)
- **Memphis Auto Spa** (Anderson Robert): second detailing promo today in Colorado Business Networking at 16:09 MDT (first at 11:42). Post tagged "Colorado Springs, Colorado", confirming the out-of-segment read. Already WATCH, no outreach sent, no ladder active. Intel only.
- **Coldiron's Creations and Property Service**: not sighted this window. The round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked until a DM channel exists.

### New-business radar
- None this window. The Cozy Crumb GJ (farm stand, Mack CO) is food segment, not pursued.

### Skips (flagged for outward expansion)
- **H&H Solutions** (plumbing/heating/cooling, 303-591-0216, hhsolutionplumbing.com): strong trade fit but web-verified as Denver Metro / Colorado's Front Range ("Plumbing & Boiler Experts in Denver Metro", 23 Front Range communities). Per the expansion rule no JSONL row; parked for a future outward-expansion go/no-go.
- **Michael Haren**: artisanal metal work, explicitly Northern Colorado; out of geography, out of segment.

### Watermark
- Next scan min-timestamp: 1789254734 (2026-09-12 17:12 MDT).

## 2026-09-12 — Delta-scan #32 (Round 37) — new posts since 2026-09-12 17:12 MDT

**Result: 0 new genuine prospects.** Scanned the 6 Western Colorado groups in task scope (37 new posts, min-timestamp 1789254734). social.search post_url lookups 6/6. Read-only throughout; no DMs, likes, or comments (Messenger CLI non-contact restriction; session owned by engagement cron). Full report: facebook-scan-round37.md. JSONL additions file intentionally empty (zero rows this window).

### New prospects (status NEW)
None. No DM drafts parked, nothing to reroute.

### Repeat sightings (not re-added)
- **Coldiron's Creations and Property Service**: not sighted (Delta had zero new posts; statewide groups out of scope). Round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked, no re-draft without a genuinely new post.
- **Memphis Auto Spa, RG Resin, Monument View Coffee Shop**: not in the 6 scanned groups this window. Monument View remains excluded from DM actions per the standing rule.

### Demand signals (customer-side)
- Buy & Sell GJ 19:21 MDT: someone seeking the bee pollen seller from the downtown farmers market. Agriculture/food vendor query, not a home-service trade. Signal/unverified.

### New-business radar
- None this window.

### Skips (flagged)
- **YAP- Grand Junction** (Orchard Mesa): athletic performance facility; fitness, not home-service trade.
- **Heinemann Images** (Fruita): local photography business; creative service, out of segment.
- **Barry Stevenson** (Living In GJ): video creator for nonprofits; creative, out of segment.
- **Palisade Nazarene Quilters** (Living In GJ): church quilting group, community org, not a business.
- Empty-caption personals with no business bio: Denice Simmons, Audrey Lynn Singer (Orchard Mesa), Jason Dean Clemente (Fruita). All skipped, no signal.
- Everything else: personal resale, fundraiser, boxes/job-search asks, all skipped.

### Watermark
- Next scan min-timestamp: 1789265418 (2026-09-12 20:10 MDT).

## 2026-09-12 — Delta-scan #33 (Round 38) — new posts since 2026-09-12 20:10 MDT

**Result: 0 new genuine prospects.** Scanned the 6 Western Colorado groups in task scope (27 new posts, min-timestamp 1789265418). All personal resale or personal/community posts. No author lookups needed (no empty-caption business candidates; the one one-liner share had no business content and no comments). Read-only throughout; no DMs, likes, or comments (Messenger CLI non-contact restriction; CLI has no like/comment write actions; browser engagement session owned by the engagement cron). Full report: facebook-scan-round38.md. JSONL additions file intentionally empty (zero rows this window).

### New prospects (status NEW)
None. No DM drafts parked, nothing to reroute.

### Repeat sightings (not re-added)
- **Coldiron's Creations and Property Service**: not sighted (Delta had zero new posts; statewide groups out of scope). Round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked, no re-draft without a genuinely new post.
- **Memphis Auto Spa, RG Resin, Monument View Coffee Shop**: not in the 6 scanned groups this window. Monument View remains excluded from DM actions per the standing rule.

### Demand signals (customer-side)
- Buy & Sell GJ / Fruita 22:45 MDT: lost-dog community posts for "Frankie" (Fruita day care escape). Community, not a trade. Signal/unverified.

### New-business radar
- None this window.

### Skips (flagged)
- **SeeJaneRanch** (Fruita): agricultural operation diary post; out of home-service segment.
- Everything else: personal resale (27 posts total), garage sale notice, congratulations, one-liner share with no business content. All skipped.

### Watermark
- Next scan min-timestamp: 1789274723 (2026-09-12 22:45:23 MDT).

## 2026-09-13 — Delta-scan #34 (Round 39) — new posts since 2026-09-12 22:45:23 MDT

**Result: 0 new genuine prospects.** Scanned the 6 Western Colorado groups in task scope (8 new posts, min-timestamp 1789274723). Personal resale (3 shoe listings, 1999 Chrysler 300M), 2 empty-caption posts with no business content, and one photographer cross-post (creative service, out of segment). No author lookups needed. Read-only throughout; no DMs, likes, or comments (Messenger CLI non-contact restriction; CLI has no like/comment write actions; browser engagement session owned by the engagement cron). Full report: facebook-scan-round39.md. JSONL additions file intentionally empty (zero rows this window; JSONL stays at 296/300 ACTIVE, 4 slots free).

### New prospects (status NEW)
None. No DM drafts parked, nothing to reroute.

### Repeat sightings (not re-added)
- **Coldiron's Creations and Property Service**: not sighted (Delta had zero new posts; statewide groups out of scope). Round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked, no re-draft without a genuinely new post.
- **Memphis Auto Spa, RG Resin, Monument View Coffee Shop**: not in the 6 scanned groups this window. Monument View remains excluded from DM actions per the standing rule.

### Demand signals (customer-side)
None. No customer asks for trade services this window.

### New-business radar
None this window.

### Skips (flagged)
- **Autumn Portraits** (WCMB&C + Buy & Sell GJ, 23:58 MDT): fall portrait sessions $150, Western Slope; creative/photography, out of segment.
- Two empty-caption posts (Buy & Sell GJ): no business content, no signal.
- Everything else: personal resale (shoes x3, car), all skipped.

### Watermark
- Next scan min-timestamp: 1789287110 (2026-09-13 02:11:50 MDT).

## 2026-09-13 — Delta-since scan #35 (Round 40, new posts since 02:11 MDT)

**Result: 0 new genuine prospects.** Scanned the 6 Western Colorado groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789287110` (window 02:11:50 to 05:14 MDT). All six groups returned zero new posts (overnight Sunday window). Ran a social.search semantic cross-check ("home service business promo Western Colorado" etc., since 2026-09-13): 14 trade-service posts surfaced, none in any of the 6 target groups, confirming the empty result is genuine and not an API regression.

### New prospects
None. Nothing to merge into pipeline.md.

### Observed but not pursued
Nothing in the target groups. The cross-check posts were Denver / Colorado Springs / Front Range / out-of-state trade promos, outside task scope.

### Notes
- No DMs sent and none attempted; nothing to park a draft against.
- Watermark unchanged: next scan uses min-timestamp 1789287110 (2026-09-13 02:11:50 MDT), per round 39, since no new posts were seen.
- No JSONL merge: canonical JSONL remains at 296/300 ACTIVE.

## Delta-scan #38 — 2026-09-13 ~14:15 MDT (round 43)
54 new posts across the 6 Western Colorado groups (11:11:49-14:05:49 MDT window). 0 genuine home-service prospects. All personal resale (furniture, vehicles, tools, appliances, vintage items), food posts (Smokey Bonez BBQ Fruita, Surf To Turf, Indian Summer Ranch Breads and Cookies cross-posted Orchard Mesa + Fruita), community/school/pet posts, one community movie night (Delta). 6 empty-caption posts resolved via social.search post_url; none were trade promos. The Joint Chiropractic (GJ Rimrock) resolved but out of segment. No repeat sightings of Coldiron's Creations, 2nd Time Around Co, or Liberty Painting LLC. No DMs sent or attempted; nothing to park. New watermark 1789329949. Report: facebook-scan-round43.md.

## 2026-09-13 — Delta-scan #47 (round 47, 20:15-20:24 MDT window)

**Result: 0 DMs sent, 0 attempted. 1 new prospect logged.**

### Groups scanned (45 new posts)
- Western Colorado Message Board & Classifieds: 5 | Buy & Sell Grand Junction: 20 | Delta: 6 | Orchard Mesa: 1 | Fruita: 13 (2 stale 2025 posts excluded) | Living In Grand Junction: 3. Min-timestamp 1789334162, NEW_POSTS sort.

### New prospect
1. **Clean Cabin Co** — cleaning services (full cleans, office decluttering, hoarding-recovery cleanouts). Delta area (INFERRED from Delta group post; town not stated). Posted 2026-09-13 by Erica Cauthron (erica.cauthron.2025), author resolved via social.search post_url. No phone/email/website in post; web search 2026-09-13 found no site or listing, so the FB post is the public presence. Post: https://facebook.com/groups/1504277980997243/permalink/1799999764758395/

### DM eligibility / reroute
- Clean Cabin Co: DM ELIGIBILITY PENDING. Messenger CLI refuses sends to non-contacts; author must be checked against Nolan's synced Messenger contacts (local snapshot check deferred to the engine run, since this scan run does not touch Messenger). No phone or email published in the post, so no email reroute possible; watch for now.

### Skips
- Bread/bake stand (WCMB, Google Forms preorder): cottage food, out of segment; signal logged in scan file.
- Seth Brave barber booking update (Delta): already has online booking (getsqr.co); personal service, out of segment.
- Vega Lodge poker-run promo (Fruita + Living In GJ): hospitality, out of segment.
- Jennifer Thomas / Miranda Flint realtor post (Delta): real estate, out of segment.
- Delta County Video Promo reel (Portia): not a trade promo.
- Fruita hitch-installation request: customer demand signal, no contractor to DM.
- All other new posts: personal resale / community / lost dog / photos. Skipped.

### Notes
- New watermark 1789352650 (2026-09-13 20:24:10 MDT). Report: facebook-scan-round47.md.

## 2026-09-13 — Delta-scan #48 (round 48, 20:24-23:01 MDT window)

**Result: 0 DMs sent, 0 attempted. 0 new prospects.**

### Groups scanned (20 new posts)
- Western Colorado Message Board & Classifieds: 2 | Buy & Sell Grand Junction: 10 | Delta: 0 | Orchard Mesa: 2 | Fruita: 5 | Living In Grand Junction: 1. Min-timestamp 1789352650, NEW_POSTS sort.

### New prospects
None. All new posts were personal resale (bed frame, Chevy Cruze, furniture, tools, electronics, vehicle), community photos (sunsets, clouds, sunflowers, hay baling, skywatch), a meme, or two unresolvable empty-caption photo posts (Orchard Mesa, zero comments; no social skill available for author resolution).

### DM eligibility / reroute
- Clean Cabin Co (Erica Cauthron, erica.cauthron.2025): DM eligibility check complete. Erica Cauthron does not appear in Nolan's synced Messenger contacts, confirmed by a targeted server-side contact sync (0 contacts returned). Messenger CLI refuses sends to non-contacts, so DM is NOT possible. No phone or email was published in her post, so no reroute possible. Pipeline keeps status NEW with note "DM not possible via Messenger (not a contact); no phone/email to reroute; watch for new posts with published contact info". No DM sent or attempted.

### Skips
- Everything in Buy & Sell GJ and WCMB: personal resale.
- Two empty-caption Orchard Mesa posts: unresolvable, no signal.
- All Fruita community photos and the Living In GJ meme: no business content.

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- No repeat sightings of Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, or Clean Cabin Co in this window's posts.
- New watermark 1789362093 (2026-09-13 23:01:33 MDT). Report: facebook-scan-round48.md.

## 2026-09-14 — Delta-scan #49 (round 49, 23:01-02:17 MDT window)

**Result: 0 DMs sent, 0 attempted. 0 new prospects.**

### Groups scanned (13 new posts)
- Western Colorado Message Board & Classifieds: 5 | Buy & Sell Grand Junction: 6 | Delta: 1 | Orchard Mesa: 0 | Fruita: 1 | Living In Grand Junction: 0. Min-timestamp 1789362093, NEW_POSTS sort.

### Trade signals
- **Coldiron's Creations and Property Service** ("Wild Weed Wranglers", Delta, 970-209-4965): fresh fall leaf-season cleanup promo in Delta 2026-09-13 23:39 MDT ("Taking Fall Bookings Now / Leaf Season is coming / Call or Text 970-209-4965 for a free estimate"). Author resolved via social.search post_url (handle creative.property.service.2024). Already in pipeline/leads: DM SENT 2026-09-08 via browser, no reply on record. Fresh post = F1 hook, day 6 after first send, inside the day 4-7 F1 window.

### DM eligibility / reroute
- Coldiron's Creations and Property Service: DM eligibility check complete. Targeted server-side Messenger contacts sync for "Coldiron" returned 0 contacts — NOT in Nolan's synced Messenger contacts, so Messenger CLI refuses sends (hard tool constraint, no override). No DM sent or attempted. Phone 970-209-4965 published in post; phone outreach only, no calling tool available yet; flag for Nolan. F1 stays parked until a DM channel exists.

### Skips
- WCMB 5 + Buy & Sell GJ 6: one Fruita seller's downsizing listings (bean bag chairs, glider rocker, dresser, vanity, bedroom piece) — personal resale, cross-posted.
- Fruita 1 empty-caption photo post: resolved via social.search post_url to Gordan Thibedeau (personal profile), no business content.

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- No repeat sightings of 2nd Time Around Co, Liberty Painting LLC, Clean Cabin Co, or the 970-201-0616 window/gutter operator in this window.
- New watermark 1789366062 (2026-09-14 00:07:42 MDT). Report: facebook-scan-round49.md.

## 2026-09-14 — Delta-scan #50 (round 50, 00:07-05:16 MDT window)

**Result: 0 DMs sent, 0 attempted. 0 new prospects.**

### Groups scanned (3 new posts)
- Western Colorado Message Board & Classifieds: 0 | Buy & Sell Grand Junction: 1 | Delta: 0 | Orchard Mesa: 0 | Fruita: 2 | Living In Grand Junction: 0. Min-timestamp 1789366062, NEW_POSTS sort.

### Trade signals
- None this window.

### DM eligibility / reroute
- No prospects, so no Messenger contact sync checks were applicable. No DMs sent or attempted (read-only detached run; Facebook is Pig-only per standing rule).

### Skips
- Buy & Sell GJ 1 empty-caption post: resolved via social.search post_url to Ryan Stahl (personal profile, handle ryan.stahl.355), no caption, no media, no business content.
- Fruita 2: "Happy Monday from the Western Slope..." and "Tonight's sunset." — community posts.

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- No repeat sightings of Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, or Clean Cabin Co in this window.
- Quiet window (early-morning scan): only 3 new posts across all 6 groups.
- New watermark 1789383999 (2026-09-14 05:06:39 MDT). Report: facebook-scan-round50.md.

## 2026-09-14 — Delta-scan #51 (round 51, 05:06-08:18 MDT window)

**Result: 0 DMs sent, 0 attempted. 0 new prospects.**

### Groups scanned (13 new posts)
- Western Colorado Message Board & Classifieds: 1 | Buy & Sell Grand Junction: 4 | Delta: 1 | Orchard Mesa: 1 | Fruita: 6 | Living In Grand Junction: 0. Min-timestamp 1789383999, NEW_POSTS sort.

### Trade signals
- Buy & Sell GJ: excavation/grading/land clearing promo ("Call or text 720-686-1711 for your FREE estimate"), posted by personal profile Caidan White (handle caidan.white.7). Author resolved via social.search post_url. Phone lookup resolves to High Country Haulers Ltd., Morrison, Colorado (own site lists the number). OUT OF GEOGRAPHY (Denver-metro; WCO pools not thin, no outward expansion). SKIPPED: not added to pipeline.md, JSONL, or prospect rows. Logged here only.

### DM eligibility / reroute
- The single trade signal resolved out-of-geography; no Messenger contact sync checks applicable. No DMs sent or attempted (read-only detached run; Facebook is Pig-only per standing rule; Pig is off).

### Skips
- WCMB 1: Warrior Tree Counseling, LLC therapy openings promo (Medicaid/commercial insurance). Not a home-service trade.
- Buy & Sell GJ 3: personal resale (Hotpoint refrigerator $150, TredSafe work shoes $16, Fossil watch $36).
- Delta 1: empty-caption post, resolved via social.search post_url to personal profile Sydney Gerle (handle sydney.gerle.9). No business content.
- Orchard Mesa 1: empty-caption photo post, resolved via social.search post_url to personal profile Ellis Hovey (0 followers). No business content.
- Fruita 6: community/personal ("Good morning!", Tractor Club Fruita Fall Festival parade invite, weather forecast, Monday pet-pics thread, empty-caption post, personal family help request).

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- social.search timed out twice on first attempt (Delta, Orchard Mesa authors) and succeeded on retry; no persistent infra failure.
- No repeat sightings of Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, or Clean Cabin Co in this window.
- New watermark 1789394952 (2026-09-14 08:09:12 MDT). Report: facebook-scan-round51.md.

## 2026-09-14 — FB scan #52 (round 52, 08:09-11:16 MDT window)

**Result: 0 DMs sent, 0 attempted. 2 trade signals, both NEW.**

### Groups scanned (53 new posts)
- Western Colorado Message Board & Classifieds: 7 | Buy & Sell Grand Junction: 20 | Delta: 3 | Orchard Mesa: 1 | Fruita: 16 | Living In Grand Junction: 6. Min-timestamp 1789394952, NEW_POSTS sort.

### Trade signals
- Premier Sparkle LLC — cleaning service (residential, commercial, Airbnb, windows, construction clean-up), Western Slope / Grand Junction CO. Post https://facebook.com/groups/5456977881034408/permalink/28468613296110874/ (2026-09-14 09:32 MDT), authored by the business's own Facebook Page (244 followers), resolved via social.search post_url. Phone (970) 623-9492 and premier.sparkle1@gmail.com published IN the post. NEW (only Sparkle Squad Denver entries in files, different businesses; phone absent). Signal: legitimate cleaning-trade promo with published contacts; routable via phone/email pipeline.
- Scott Rush — dad-and-son junk hauling pickup service, Grand Junction. Posts https://facebook.com/groups/108728816001912/permalink/3410853792456048/ (10:10 MDT) and cross-post in Living In GJ https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3434359080086363/ (11:09 MDT). Author personal profile Scott Rush (handle scott.rush.7), resolved via social.search post_url. Text-to 970-778-1219 published in post. NEW (name and phone absent from leads.md/pipeline.md). Signal: explicit "trying to start a business" = new-business-radar hit; only contact is SMS, so phone/SMS is the honest channel.

### DM eligibility / reroute
- 0 DMs sent, 0 attempted (read-only detached run; Facebook is Pig-only per standing rule; Pig is off). No Messenger contact sync checks run. Premier Sparkle LLC routes through published phone/email first; Scott Rush routes through published SMS number.

### Skips
- WCMB 6 non-signals: Doughbra's sourdough pre-orders (2 dupes, food business); Dove Creek community news; house/pet/plant sitting personal side gig; empty-caption post resolved to personal profile Matthew Pasquale Cesario (handle MatthewPCesario).
- Buy & Sell GJ 19: all personal resale (golf balls, puzzles, ATV rake, bulk wood chips $75 81416 Delta, jeans, microwave, pallets, fridge, light bar, composite fencing pickets, picture, Honda CR-V, parts car, hoodie, shoes, side table, coffee tables, Rockwood Roo, Jeep Gladiator bed rack).
- Delta 3: empty-caption resolved to Starlight Home Health Page (Montrose home health, medical, out of trade); Aila Thai Kitchen (restaurant, out of trade); Etsy handbag shop (out of trade).
- Orchard Mesa 1: empty-caption carousel resolved to personal profile Karina Prieto (handle mariakarina.prietogonzalez). No business content.
- Fruita 16: travel agency recruiting post (out of trade); Moody's Underground tickets; Riverside Pub promo; B-Well Optimization Night wellness event; CDL manual wanted; Cattleman's breakfast complaint (restaurant gripe); lost keys; lost tortoise; Tractor Club post; border collie sighting; property-rights court post; Doughbra's sourdough; 4 empty-caption posts resolved to Chuck Fedler (handle chuck.fedler), Matthew Pasquale Cesario (again), Susan Rawlins (handle susan.rawlins.5), Happy Little Finds charity shop Page.
- Living In GJ 5 non-signals: Moody's Underground tickets; Riverside Pub promo; "new pet care opportunity coming to Delta" (new-business announcement but pet care, out of home-service trade, near-miss not logged); Tractor Club post; empty-caption carousel resolved to Happy Little Finds charity shop Page.

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- social.search author resolution 10/10 on first attempt; no timeouts this round.
- Buy & Sell GJ returned 20/20 posts all newer than watermark on one page; no second page needed.
- No repeat sightings of Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, or Clean Cabin Co in this window.
- New watermark 1789405840 (2026-09-14 11:10:40 MDT). Report: facebook-scan-round52.md.

## Delta-scan #53 (2026-09-14 11:10-14:10 MDT window, round 53)

- 41 returned posts across 6 groups (WCMB 4, Buy & Sell GJ 20, Delta 2, Orchard Mesa 3, Fruita 9, Living In GJ 3). 0 verified new home-service prospects.
- 1 seasonal demand signal: Fruita post seeking an experienced sprinkler-system technician for seasonal winterization work. Hiring/demand signal only; no employing business identified, not a prospect. Winterization demand surfacing mid-September, consistent with the seasonal calendar.
- Resolved empty posts: restaurants, lodging, food sellers, personal profiles, community events, unrelated content. Two Fruita results predated the watermark, confirming min-timestamp is applied loosely; dedupe continues to rely on content checks.
- New-business radar: 0 hits. Complaint signals: none.
- 0 DMs sent, 0 attempted (read-only detached run; Facebook engagement is Pig-only). New watermark 1789416620 (2026-09-14 14:10:20 MDT). Report: facebook-scan-round53.md.

## Delta-scan #54 (2026-09-14, window 14:10-17:17 MDT, round 54)
- 46 posts across 6 Western Colorado groups (45 in-window; 1 Fruita repost predated watermark). 0 new genuine home-service prospects. All 10 empty-caption posts resolved via social.search post_url (Sister's Soup & Salad food, Sandstone Entertainment concerts, 8 personal profiles). Rest: personal resale, food sellers, car dealership ads, real estate, community content.
- Demand signals (not prospects): Go Rentals hiring post in Fruita (GoRentalsJobs.com, equipment-rental growth signal, out of trade); private caregiver wanted in Fruitvale (household hiring, not a trade business).
- Social intel: 21-comment Fruita thread on Subaru service experiences at "Pickies" (local auto service review sentiment; market context only).
- New-business radar: 0 hits. Complaints: none. DMs: 0 sent/attempted (read-only; Facebook is Pig-only). New watermark: 1789427847.

## Delta-scan #55 (2026-09-14, window 17:17-20:20 MDT, round 55)
- 40 posts across 6 Western Colorado groups (all in-window except 2 Fruita posts from 2026-09-12, confirming min-timestamp is applied loosely; dedupe relies on content checks). WCMB 5 | Buy & Sell GJ 20 | Delta 2 | Orchard Mesa 1 | Fruita 11 | Living In GJ 1. Min-timestamp 1789427847, NEW_POSTS sort, one page per group.
- 1 genuine home-service trade signal, NEW: WCMB post https://facebook.com/groups/5456977881034408/permalink/28474933165478887/ (2026-09-14 19:32 MDT): "Warren with RescueMe HandyMan Services" — recommendation-style promo for an insured & bonded handyman (all-season lawn care, general maintenance, drywall/hole repair, curtain rods/blinds), Grand Junction 81501. No website or phone published in the post; web search found no own web presence. Added to pipeline.md status NEW / WATCH, HELD (no contact info published, no draft). Signal only, unverified.
- New-business radar: 0 hits. Complaint signals: none. Repeat sightings of tracked businesses: none (no Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, or Clean Cabin Co).
- Author resolution: social.search tooling is NOT available in this subagent environment, so empty-caption posts could not be author-resolved (facebook-cli strips authors; comments read returned 0 comments and no author fields for 28474933165478887). 8 empty/no-content posts logged as unresolvable this round: Delta 2 (one empty, one "Thats a thought to ponder."), Fruita 5 empties, Orchard Mesa 1 empty. No business content visible in any of them; no genuine signal lost.

### DM eligibility / reroute
- 0 DMs sent, 0 attempted (read-only detached run; Facebook engagement is Pig-only per standing rule). The single trade signal had no published phone/email and is HELD; no Messenger contact sync checks applicable.

### Skips
- WCMB 4 non-signals: Kodiak truck camper resale ($265, 81501); hunter orange shirts resale; Stihl chainsaw resale; Doughbra's sourdough presale 9/20 (food business).
- Buy & Sell GJ 20: all personal resale (iPhone 15, sage green side tables, velvet sofa, wheatgrass seed tincture wellness product by Esther Jade's Ltd [wellness product business, out of trade], boat anchor, dress, vintage Singer sewing machine, guitar, Toyota Tacoma, puffs, pouf ottoman, captain's desk, Clover POS system, Garmin inReach minis, chaise lounge, window shade Montrose, Garmin Rino, ceramic bowl set, car detailing kit, 1998 fifth wheel trailer).
- Delta 2: empty-caption post and a one-line "Thats a thought to ponder." post; no business content.
- Orchard Mesa 1: empty-caption post; no business content.
- Fruita 10 non-signals: Spices and More by Kelly peach-salsa dinner testimonial (food seller); Spectrum internet outage question (community); "Locally produced feature film!!" (community, cross-posted to Living In GJ); City Market mums post (community); Metaphorse hay-buying charity request; golf tournament raffle-donation ask (community event); 5 empty-caption posts.
- Living In GJ 1: "Locally produced feature film!!" (community content).

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- Quiet evening window: the only genuine trade signal in 40 posts was the handyman recommendation.
- New watermark 1789438040 (2026-09-14 20:07:20 MDT). Report: facebook-scan-round55.md.

## Delta-scan #57 (2026-09-14 21:22 - 2026-09-15 02:13 MDT window, round 57)
- 4 posts across 6 Western Colorado groups (WCMB 0, Buy & Sell GJ 2, Delta 1, Orchard Mesa 0, Fruita 0, Living In GJ 1). 0 new genuine home-service prospects. Quietest window on record for these groups.
- Buy & Sell GJ: antique bedframe resale; Fall Dubai Chocolates sale by Sweets N Treats LLC (food business, out of trade, not previously tracked).
- Delta: 1 empty-caption post, unresolvable (social.search unavailable in this subagent environment; no comments to read author clues from). No business content visible.
- Living In GJ: MAP Distro Tuesday mutual-aid community event at 402 Grand Ave downtown GJ (food pantry, wound care, Medicaid help, volunteer haircuts, breakfast). Community content; Andy's Barber Shop mentioned as volunteer provider, not a business promo.
- Demand signals: none. New-business radar: 0 hits. Complaints: none. Repeat sightings of tracked businesses: none.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789456878.

## Delta-scan #58 (2026-09-15 01:21 - 2026-09-15 02:11 MDT window, round 58)
- 4 posts across 6 Western Colorado groups (WCMB 0, Buy & Sell GJ 2, Delta 0, Orchard Mesa 0, Fruita 2 stale reposts from round 57's window, Living In GJ 0). 0 new genuine home-service prospects. Near-quiet overnight window again.
- Buy & Sell GJ: toddler house bed frame ($100) and twin bed frame ($150) resale by the same seller (81504); personal resale.
- Fruita: one empty-caption post with a prayer-support comment (personal/community content); one empty-caption post with zero engagement (unresolvable). Both predate the watermark; loose min-timestamp filter confirmed again.
- Demand signals: none. New-business radar: 0 hits. Complaints: none. Repeat sightings of tracked businesses: none (no Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, the 970-201-0616 window/gutter operator, Clean Cabin Co, or RescueMe HandyMan Services).
- social.search verified unavailable in this subagent environment (skill search: no such tool). Author-from-post_url resolution still impossible.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789459908.

## Delta-scan #59 (2026-09-15 02:11 - 2026-09-15 08:03 MDT window, round 59)
- 15 posts across 6 Western Colorado groups. 0 new genuine home-service prospects. Near-quiet overnight window again; one Fruita min-timestamp filter edge case (2 below-watermark posts returned, both empty marketplace listings, no data loss).
- Non-prospect business-ish sightings: Student Transportation of America bus-driver hiring cross-post (national chain, not a target), hockey opening-weekend event promo (Tyler McDougal), Miranda Sanchez vendor call for a free event, Heather Annie Bennett Sept 23 guided hike. All logged non-actionable.
- Demand signals: none. New-business radar: 0 hits. Complaints: none. Repeat sightings of tracked businesses: none.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789481024.

## Delta-scan #60 (2026-09-15 08:03 - 2026-09-15 11:10 MDT window, round 60)
- 38 posts across 6 Western Colorado groups (WCMB 2, Buy & Sell GJ 20, Delta 3, Orchard Mesa 0, Fruita 11, Living In GJ 2). 0 new genuine home-service prospects. All business-ish sightings non-trade: Riskey Fitness class promo (cross-posted twice, fitness business, out of trade), Suarez Orchards farmers-market vendor (Cedaredge).
- Demand signal (not a prospect): Fruita resident seeking landscaping yard cleanup (post 4467341473539629, 09:08 MDT); demand evidence only.
- Unactionable complaint: unnamed property management/landlord complaint in Fruita (business not named); not a trade, not actionable.
- New-business radar: 0 hits. Complaint signals: none. Repeat sightings of tracked businesses: none.
- 1 unresolvable cryptic post logged as unresolvable. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789492246. Report: facebook-scan-round60.md.

## Delta-scan #61 (2026-09-15 11:10 - 2026-09-15 14:14 MDT window, round 61)
- 46 posts across 6 Western Colorado groups (WCMB 5, Buy & Sell GJ 20, Delta 3, Orchard Mesa 2, Fruita 13, Living In GJ 3). 0 new genuine home-service prospects. All business-ish sightings non-trade: Laura Black $1.6M real estate listing (WCMB, 303-921-9929, real estate, previously logged as non-prospect); Doughbra's Farm Stand sourdough preorders cross-posted to WCMB/Buy & Sell GJ/Orchard Mesa/Fruita (food, previously logged); Aila Thai Kitchen Delta chicken-wing promo (restaurant, previously logged); Shrine Circus GJ promo and Tuesday Blues Jam at Rides Bar & Grill (Fruita, community/event, out of trade); free tub shower enclosure pickup, generators, tools (personal resale); GJ Volkswagen listing ad (dealership, out of trade).
- Demand signal (not a prospect): Fruita resident ISO refrigerator repair for a commercial fridge / garage beer fridge (thermostat issue, won't stop cooling at 16 deg), post 4467533660187077, 13:11 MDT. Demand evidence only.
- Complaint signal (not actionable): Living In GJ post 3435451519977119, 13:37 MDT — resident complains Appleton Clinics has not returned enrollment inquiry calls since Sept 9, multiple voicemails. Healthcare provider, out of trade scope; no action.
- New-business radar: 0 hits. Repeat sightings of tracked businesses: none (no Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, 970-201-0616 window/gutter operator, Clean Cabin Co, RescueMe HandyMan Services).
- Unresolvable (no caption; facebook-cli strips authors; social.search unavailable in this subagent environment): 11 posts — Buy & Sell GJ 1 (12:44), Delta 2 (13:29, 12:21), Orchard Mesa 1 (11:32), Fruita 5 (reel link 13:55, plus 12:52, 12:22, 08:40, 08:35 empties), Living In GJ 2 (12:38, 12:19). No business content visible in any caption; no genuine signal lost.

### DM eligibility / reroute
- 0 DMs sent, 0 attempted (read-only detached run; Facebook engagement is Pig-only). No genuine trade signal arose, so no Messenger-contact sync checks were applicable.

### Skips
- WCMB 5 non-signals: Laura Black $1.6M wine-country listing (real estate); Doughbra's sourdough presale 9/20 (3 dupes, food); weekend pop-up rolls/cookies (food).
- Buy & Sell GJ 20: personal resale (HMDE trailer, Yamaha YZ 125, F-150 RC truck, Jeep Grand Cherokee, generator, plates, cougar painting, Howard Miller clock, Dodge Ram, Silverado, Vans shoes, Land Cruiser mats, Subaru Forester, fire pit, plant stand, free tub enclosure, Subaru); GJ Volkswagen Winnebago dealer ad; Doughbra's sourdough cross-post; 1 empty-caption post.
- Delta 3: Aila Thai Kitchen food promo (previously logged non-prospect); 2 empty-caption posts.
- Orchard Mesa 2: Doughbra's sourdough cross-post; 1 empty-caption post.
- Fruita 13: Shrine Circus promo; Tuesday Blues Jam at Rides Bar & Grill; 2 Doughbra's cross-posts; hummingbird personal post; fridge-repair ISO (demand signal); Leadership D51 school promo; "last night was Electrifying" weather post; reel link + 3 empty-caption posts.
- Living In GJ 3: Appleton Clinics callback complaint (healthcare, out of trade); 2 empty-caption posts.

### Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- Midday window: busiest window since round 60 (46 posts), but zero home-service trade signals. Doughbra's sourdough cross-posting continues across 4 groups.
- New watermark 1789502105 (2026-09-15 13:55:05 MDT).

## Delta-scan #62 (2026-09-15 13:55 - 2026-09-15 17:04 MDT window, round 62)
- 55 posts across 6 Western Colorado groups (WCMB 0, Buy & Sell GJ 44, Delta 4, Orchard Mesa 1, Fruita 5, Living In GJ 1). 0 new genuine home-service prospects. Only genuine trade signal was a tracked repeat.
- AG Property Services (Abraham Gutierrez) actively promoting again: Delta promo post (14:31 MDT, full service menu: landscaping, hardscaping, pavers, lawn care, cleanups, tree/bush trimming, junk removal, fence repair/install, deck repair/construction, stair repair) plus Orchard Mesa cross-post (14:28 MDT). Already in pipeline.md/leads.md: DM SENT 2026-09-08, F1 ASSESSED 2026-09-12 not sent (F1 HELD until contact-capable channel; never re-initial-contact). No action taken; already-contacted rule holds.
- Demand signals (not prospects): Fruita resident ISO scrapper for old mobile home frame (post 4467680430172400, 17:04 MDT, payment = the scrap); Buy & Sell GJ resident ISO farm-fresh eggs near Patterson & 29 Rd (8 comments). Both demand evidence only.
- Complaint signals: none. New-business radar: 0 hits. Repeat sightings of other tracked businesses: none (no Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, 970-201-0616 window/gutter operator, Clean Cabin Co, RescueMe HandyMan Services).
- 1 unresolvable post ("Investment Opportunity!!", Buy & Sell GJ 3412034762337951, empty body, 0 comments) logged as unresolvable, not guessed.
- Out-of-trade business-ish sightings: Bozarth Miller Chevrolet truck ads, Happy Little Finds thrift listings, Esther Jade's Ltd herbal products, Jennifer Thomas real estate listing. All non-prospects.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789513478. Report: facebook-scan-round62.md.

## Delta-scan #63 (2026-09-15 17:04 - 2026-09-15 20:16 MDT window, round 63)
- 43 posts across 6 Western Colorado groups (WCMB 3, Buy & Sell GJ 27, Delta 0, Orchard Mesa 0, Fruita 10, Living In GJ 3). 0 new genuine home-service prospects. 0 new-business radar hits.
- Meaningful timing signal: WEST SIDE CUSTOMS promo (Buy & Sell Fruita, ~19:40 MDT) reported roughly one-inch hail across part of the Grand Valley. WEST SIDE CUSTOMS is auto PDR (out of segment) but the hail event is a live demand signal for GJ roofers in the ladder (Reliant Roofing F1 SENT round 63; Loya Family, JV Roofing, Hines Roofing): storm-driven claim work peaks 48-72h after hail. Future F2/new-angle tie-in candidate for GJ roofing prospects.
- Demand/community context: wheelchair-ramp hospice resource ask (Fruita) logged as community context only, no business signal.
- Out-of-trade sightings: Esther Jade's Ltd herbal products (repeat, 4 posts), Delta County video promo reel (Portia, marketing service).
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789524979. Report: facebook-scan-round63.md.

## Delta-scan #64 (2026-09-15 20:16 - 2026-09-15 20:21 MDT window, round 64)
- 3 posts across 6 Western Colorado groups (WCMB 0, Buy & Sell GJ 1, Delta 0, Orchard Mesa 0, Fruita 2, Living In GJ 0). 0 new genuine home-service prospects. 0 new-business radar hits.
- Esther Jade's Ltd "Soursop Tincture" promo (Buy & Sell GJ, 20:20 MDT): repeat herbal-products seller, out of trade, logged for the record.
- Fruita: lost dove/pigeon post (19:53) is a below-watermark edge case already captured in round 63; 1 empty-caption post (20:16). No data loss, no double-count.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789525245. Report: facebook-scan-round64.md.

## Delta-scan #65 (2026-09-15 20:21 - 2026-09-16 ~02:20 MDT window, round 65)
- 66 posts across 10 Western Colorado + expansion groups (WCMB 1, Buy & Sell GJ 20, Delta 1, Orchard Mesa 1, Fruita 17, Living In GJ 10, Colorado Business Networking 14, Colorado Business Mingle 0, Palisade 2, Glenwood Springs 0). 1 new home-service promo seen, 0 qualified.
- Big Bear Junk Removal (junk removal/hauling/handyman, author Payaso Rodriguez personal profile, Colorado Business Networking group, 19:33 MDT 2026-09-15): phone-only 720-579-8840, no email, no own website, no business Page. SKIPPED, parked as observed-not-pursued: (1) 720 area code and statewide-group posting means unconfirmed, likely Front Range location, outside Western Colorado first rule; (2) author is a personal profile with no verified Message button, so no DM route per rules; (3) phone-only contact with no email or website, not draft-eligible for cold email. No pipeline.md entry.
- New-business radar: 0 hits. Near-hit parked: dad-and-son yard sale/dump haul service in GJ (970 778 1219, Living In GJ) said "trying to start a business" but has no business name, unverifiable, parked.
- Observed-not-pursued: Kerianne's Kleaning LLC (tag in engagement-bait post, not a promo; future lookup candidate if cleaning pool thins); move-out cleaner ISO demand post (Buy & Sell GJ, demand signal only); 2 social-media marketing B2B promos (skipped per rules); Emily O Photography Fruita studio announcement (out of trade); Portia Vigil mortgage podcast (Delta, financial); VanWinkle Ranch beef restock, Palisade office-for-rent, Palisade Brewing trivia (Palisade board, all out of trade); the rest resale/personal/political/real estate.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789544560. Report: facebook-scan-round65.md.

## Delta-scan #66 (2026-09-16 01:42 - 2026-09-16 ~02:29 MDT window, round 66)
- 2 posts across 6 Western Colorado groups (WCMB 0, Buy & Sell GJ 1, Delta 0, Orchard Mesa 0, Fruita 1 below-watermark leak, Living In GJ 0). 0 new genuine home-service prospects. 0 new-business radar hits.
- Repeat sighting: standing-seam metal roofing operator re-posting in Buy & Sell GJ (02:28 MDT): "Standing seam machine panels rolled on site by a 25 year experienced tech... call for your appointment time. 970-216-6905. We also can produce custom trims, clips and hardware available." Same phone and Parachute ZIP 81635 as 2nd Time Around Co (already pipeline.md NEW since 2026-09-10): STRONG INDICATION it is the same operator posting a variant ad. No new pipeline entry; dedup rule holds. Operator confirmed actively posting.
- Fruita post (permalink/4467916946815415/, 22:59 MDT 2026-09-15, below the old watermark, API boundary leak): empty caption, 0 comments, 0 reactions; unresolvable, logged without guessing.
- Demand signals: 0. Complaint signals: 0. Out-of-trade sightings: none (no other posts in window).
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789547327. Report: facebook-scan-round66.md.

## Delta-scan #67 (2026-09-16 02:29 - 2026-09-16 ~08:12 MDT window, round 67)
- 30 posts across 6 Western Colorado groups (29 in-window; 1 Fruita below-watermark weekly "Whiners Wednesday" engagement post, API leak, not double-counted). WCMB 1 | Buy & Sell GJ 16 | Delta 4 | Orchard Mesa 2 | Fruita 5 in-window | Living In GJ 1. Min-timestamp 1789547327, NEW_POSTS sort, one page per group.
- 0 new genuine home-service prospects. 0 new-business radar hits. Repeat sightings of tracked businesses: none (no AG Property Services, Coldiron's Creations, 2nd Time Around Co, Liberty Painting LLC, 970-201-0616 window/gutter operator, Clean Cabin Co, RescueMe HandyMan Services).
- Out-of-trade sightings: "FALL CAR CHECK — BEFORE YOUR CAR CHECKS YOU!" seasonal auto-shop promo cross-posted to Buy & Sell GJ and Fruita (auto repair, out of trade; noted for fall-prep seasonal timing only); Discount Mattresses sale promo with same-day delivery (Buy & Sell GJ, retail, weak fit, not pursued); GYM1010 Halloween Mayhem Throwdown fitness event Oct 17 at 1010 S 7th St GJ (fitness, out of trade); industrial lot for rent 2983 Gunnison Ave GJ $1,500/mo and Paonia real-estate listing (real estate, out of trade); "Nominate some Small Business!!!" engagement-bait (WCMB); sarcastic USPS delivery-gripe post (Fruita, community complaint); embroidery buyer request (Fruita, craft service out of trade); personal fall-foliage photo post (Fruita). Remaining Buy & Sell GJ posts all personal resale (tire, dog crate, sleeping bag, dining chairs, vanity countertop, blanket, mop bucket, copper sinks, rollaway bed, sliding door, boots, Dodge 2500 truck).
- Demand signals: none actionable. Complaint signals: none actionable.
- 7 unresolvable empty-caption posts (0 comments, 0 reactions; facebook-cli strips authors; social.search unavailable in this subagent environment): Buy & Sell GJ 3412735785601182 (07:21), Delta 1802203781204660 (07:34) and 1802140684544303 (06:03), Orchard Mesa 1107737905536758 (07:27) and 1107732468870635 (07:20), Fruita 4468281876778922 (07:20), Living In GJ 3436214746567463 (07:19). Logged without guessing per hard rule.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789567674. Report: facebook-scan-round67.md.

## Delta-scan #68 (2026-09-16 08:12 - 2026-09-16 ~11:16 MDT window, round 68)
- 42 posts across 6 Western Colorado groups. WCMB 3 in-window + 1 below-watermark leak | Buy & Sell GJ 20 | Delta 3 | Orchard Mesa 1 | Fruita 11 in-window + 2 below-watermark leaks | Living In GJ 4. 1 new genuine home-service prospect. 0 new-business radar hits.
- NEW PROSPECT: **Winch & Willow Services LLC** (cleaning, Delta/Montrose/Grand Junction): hiring independent cleaners across three markets (1099 to potential full-time; +$2/hr for own supplies; 10% commission on self-sold hours). Post 2026-09-14 15:23 MDT in WCMB, below the old watermark (API leak, not double-counted). Author resolved via social.search post_url lookup to the business Page WinchAndWillowServices (52 followers); post authored from the Page itself. Dedup clean against leads.md and pipeline.md. Intel: stack UNKNOWN, no website found (FB Page + Gmail only), very-non-technical owner, revamp candidate; contact winchandwillowservices@gmail.com published in the post. Rerouted to pipeline.md as NEW/WARM (source=facebook-scan-round68). DM SKIPPED: Messenger contacts search 0 results, no existing thread, no DM route per the hard rule.
- Out-of-trade sightings: Shine & Drive mobile car detailing praise post (Fruita, 07:33 MDT, below-watermark leak; 59 reacts, 40% off new customers) noted for engagement insight only (customer-written testimonials drive reach); FALL CAR CHECK auto promo, Discount Mattresses, Bozarth Miller Chevrolet listings, Happy Little Finds thrift, RE/MAX 4000 land parcels (WCMB x3), Laura Black land parcel posts; Living In GJ in-home pet groomer buyer request (demand signal only, grooming out of trade); Fruita men's event tickets, HopeWest award, Jukebox Jamboree burrito ad, data-center meeting, therapy-dog shadow box. Buy & Sell GJ remainder all personal resale.
- 6 unresolvable empty-caption posts (0 comments, 0 reactions; CLI strips authors; never guess): Delta 1802259971199041 (08:49), 1802257574532614 (08:46); Orchard Mesa 1107824498861432 (09:29); Fruita 4468338903439886 (08:26) + 4467492616857848 (2026-09-15 12:19, below watermark); Living In GJ 3436357089886562 (10:17), 3436302166558721 (09:07).
- Errors: facebook-cli profile info for one profile id returned HTTP 403 (profile only readable for viewer/friends); author resolved via social.search instead, no blocking issue. API watermark leaks again surfaced 2026-09-14/15 posts below the watermark; handled, not double-counted.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789579001. Report: facebook-scan-round68.md.

## Delta-scan #69 (2026-09-16 11:16 - 2026-09-16 ~14:14 MDT window, round 69)
- 50 posts across 6 Western Colorado groups (50 in-window, 0 below-watermark API leaks). WCMB 10 | Buy & Sell GJ 20 | Delta 3 | Orchard Mesa 1 | Fruita 11 | Living In GJ 5. Min-timestamp 1789579001, NEW_POSTS sort, one page per group.
- NEW PROSPECT + NEW-OPERATOR RADAR HIT: **Keisha Crawford** — house cleaning, relocating from Utah, seeking 8+ clients. Posted 2026-09-16 12:39 MDT in Delta group (https://facebook.com/groups/1504277980997243/permalink/1802414724516899/). Author tag published in post body: @[61588881047288:2048:Keisha Crawford] → https://facebook.com/profile.php?id=61588881047288. No phone/email published; contact is FB tag only. New-operator market entry: best contact window while she is still building her client book. Dedup clean against facebook-dms.md, pipeline.md, leads.md. Rerouted to pipeline.md as NEW/WARM (source=facebook-scan-round69, source=new-filing new-operator signal). DM not attempted (read-only run; engagement is Pig-only).
- Out-of-trade sightings: Troyer Lumber (Loma CO specialty lumber supplier, 2 WCMB posts, (970) 986-7289, troyerlumber.net; genuine promo but building-materials supplier, not pursued); The Wrangler Frosted Lemonade restaurant promo (Delta); Ed Bozarth Chevrolet/GJ auto retail x4 (WCMB); Massey Team ReMax open house 452 Bismarck St and Kelly Maves Emerald Ridge listing (real estate); Palisade retreat $389,900 Laura Black; Grand Valley Power pumpkin-patch RSVP; Little Imaginations Childcare Center community recommendation (Fruita); houseplant giveaway (Living In GJ); lemon balm supplement ad; seasoned firewood delivery post; Clifton estate sale Sept 17-19. Buy & Sell GJ remainder all personal resale.
- Demand signals (intel only): Fruita "pressure wash/clean trash bins?" ask (13:27, 12 comments) — live bin-cleaning demand; Fruita "urgent move out cleaning for tomorrow in debeque" (12:37, 10 comments) — same-day move-out cleaning need. Complaint signals: none actionable.
- 7 unresolvable empty-caption posts (0 comments/reactions; CLI strips authors; never guess): Buy & Sell GJ 3413029978905096 (14:08), Delta 1802466511178387 (14:10), Orchard Mesa 1107972608846621 (13:02), Fruita 4468525810087862 (12:16) and 4468506373423139 (11:48), Living In GJ 3436468326542105 (12:44) and 3436429039879367 (11:51).
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789589628. Report: facebook-scan-round69.md.

## 2026-09-16 15:36 MDT — Jack Of All Junction LLC (Grand Junction)
- Route: Facebook Page "Jack of All Junction by Aaron Chalfant" (GrandJunctionMetalHandyman), Message button verified, Page identity matched (phone/address/website).
- Sent via: Pig headed Chrome (CDP :9223), send-dm.js; text verified visible in thread.
- Angle: Pigi AI intro on behalf of PING Social; admin/marketing productivity; hint at intelligence layer; CRM/bookkeeping replacement probe (no-pressure); bottleneck discovery questions.
- Status: DM SENT. Follow-up ladder armed (bump day 4-7, final day 10-14).

## Delta-scan #70 (2026-09-16 14:14 - 2026-09-16 ~16:59 MDT window, round 70, read-only)
- 39 posts across 6 Western Colorado groups (38 in-window; 1 below-watermark leak: WCMB trunk-or-treat vendor call 13:21, API leak, not double-counted). WCMB 1 in-window | Buy & Sell GJ 20 | Delta 1 | Orchard Mesa 1 | Fruita 11 | Living In GJ 4. Min-timestamp 1789589628, NEW_POSTS sort, one page per group.
- 0 new genuine home-service prospects. 0 new-business radar hits. Repeat sightings of tracked businesses: none.
- Out-of-trade sightings: Palisade home listing (WCMB, real estate); "new boutique JUST arrived" Parkwood Plaza retail opening (Living In GJ, retail out of trade, noted as intel only); VanWinkle Ranch cattle post (Fruita + Living In GJ cross-post); free community run club (Fruita); Pig-A-Sus pig rescue fundraiser plea (Fruita, nonprofit); Fruita Farmers Market wagon rides; movie night reschedule (Living In GJ); storm photo (Living In GJ); sport-leis buyer ask (Fruita, craft demand signal only, out of trade). Buy & Sell GJ all 20 posts personal resale/auto retail (incl. roof vents parts resale, not a business).
- Demand signals: none actionable. Complaint signals: none actionable.
- 8 unresolvable empty-caption posts (author stripped; never guess): Delta 1802526204505751 (16:05), Orchard Mesa 1108071378836744 (16:07), Fruita 4468715713402205 (16:59), 4468711330069310 (16:51), 4468681176738992 (15:58, 2 comments checked = personal pet-inquiry thread, not a business promo), 4468658630074580 (15:19), 4468624733411303 (14:32), 4468622006744909 (14:27).
- Pig in commute blackout since ~16:26 MDT; this was a read-only run. 0 DMs sent, 0 attempted (Facebook engagement is Pig-only). New watermark: 1789599586. Report: facebook-scan-round70.md. Scratch: scratch/fb-round70.jsonl (0 lines, no prospects).

## Delta-scan #70 (2026-09-16 ~14:14 - ~16:59 MDT window, round 70)
- 39 posts across 6 Western Colorado groups (38 in-window, 1 below-watermark API leak). WCMB 1 in-window + 1 leak (trunk-or-treat vendor call, 13:21, not double-counted) | Buy & Sell GJ 20 | Delta 1 | Orchard Mesa 1 | Fruita 11 | Living In GJ 4. Min-timestamp 1789589628, NEW_POSTS sort, one page per group.
- 0 new genuine home-service prospects. 0 new-business radar hits (Living In GJ 16:31 "new fun boutique" is retail, out of trade, noted as intel only).
- Out-of-trade sightings (intel only): Palisade home listing $ reduced .86 irrigated acres w/ saltwater pool (WCMB 15:40, real estate); trunk-or-treat vendor call Oct 30 (WCMB, below-watermark leak); Fruita free community run club 6pm tonight; VanWinkle Ranch cattle-herding cross-post (Fruita 16:31 / Living In GJ 16:30); Pig-A-Sus Homestead potbelly pig rescue fundraiser (Fruita 15:01, Mack, nonprofit); Fruita Farmers Market free wagon rides Saturday; sport-lei maker ask (Fruita 14:16, craft demand, out of trade); rainy-weekend movie night moved to Oct 9 (Living In GJ 16:41); September storms photo (Living In GJ 15:17). Buy & Sell GJ all 20 personal resale (drill press, truck rack, 2008 Audi S6, 2020 Hyundai Palisade, Masters of the Universe figures, roof vents parts-only resale, garden tiller, edible ink cartridges, free moving boxes, Tacoma/Tundra/BMW X5, 2008 Innovation ATV trailer, Fordson diesel tractor, Palisade rental house, animal cage, Gold Crown VI pool table, recliner/rocker, open house Sun 1-3pm, t-shirts).
- Demand signals: none actionable. Complaint signals: none actionable.
- 8 unresolvable empty-caption posts (author stripped, logged without guessing): Delta 1802526204505751 (16:05); Orchard Mesa 1108071378836744 (16:07); Fruita 4468715713402205 (16:59), 4468711330069310 (16:51), 4468681176738992 (15:58, 2 comments checked: personal pet-inquiry thread, chihuahua, not business), 4468658630074580 (15:19), 4468624733411303 (14:32), 4468622006744909 (14:27).
- 0 DMs sent, 0 attempted (read-only run; Pig in commute blackout since ~16:26 MDT; Facebook engagement is Pig-only and parked). New watermark: 1789599586. Report: facebook-scan-round70.md.

## Delta-scan #71 (2026-09-16 ~16:59 - ~20:20 MDT window, round 71, read-only)
- 48 posts across 6 Western Colorado groups (WCMB 1 | Buy & Sell GJ 19 | Delta 2 | Orchard Mesa 0 | Fruita 12 | Living In GJ 14). 0 new genuine home-service prospects. 0 new-business radar hits.
- Demand signals (intel only): Fruita ~01:52 haul-away/log-removal buyer ask (supports junk/haul pipeline rows); Living In GJ ~08:05 moving/labor buyer ask (4 comments).
- Tracked-business sighting: Monument View Coffee Shop posting Friday late-hours promo in Living In GJ (00:21); Nolan in-person prep stands, F1 HELD.
- Out-of-trade: Lavender Bee Montessori, plant sale/swap cross-posts, BK icee/hiring post, barber memorial, hay sale, comedy tickets, townhouse rental; Buy & Sell GJ all personal resale.
- 12 unresolvable empty-caption posts logged in facebook-scan-round71.md; 0 guessed.
- 0 DMs sent, 0 attempted. New watermark: 1789610984.

## Delta-scan #72 (2026-09-16 ~20:20 - ~23:17 MDT window, round 72, read-only)
- 25 posts across 6 Western Colorado groups (all in-window; 0 below-watermark API leaks detected). WCMB 2 | Buy & Sell GJ 15 | Delta 1 | Orchard Mesa 1 | Fruita 6 | Living In GJ 0. Min-timestamp 1789610984, NEW_POSTS sort, one page per group.
- 0 new genuine home-service prospects. 0 new-business radar hits. Repeat sightings of tracked businesses: none.
- Out-of-trade sightings: permanent jewelry BOGO appointment promo (WCMB + Buy & Sell GJ cross-posts, beauty service); VanWinkle Ranch beef weekly-meat-market cross-posts (Buy & Sell GJ + Fruita); storm-surge photography post (Fruita); working-cattle-dogs ranch post and sunset photo (Fruita); missing-dog Bandit community post (Delta). Buy & Sell GJ remainder all personal resale.
- 3 unresolvable posts logged without guessing: Orchard Mesa 1108255092151706 (21:54, empty caption), Fruita 4468936653380111 (21:56, empty caption), Fruita 4468899170050526 (21:13, "Please help" only, comment read empty).
- Demand signals: none actionable. Complaint signals: none actionable.
- facebook-cli cloud session healthy. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789622252. Report: facebook-scan-round72.md.

## Delta-scan #73 (2026-09-16 ~23:17 - 2026-09-17 ~02:16 MDT window, round 73, read-only)
- 7 posts scanned across 8 groups (min-timestamp 1789622252, NEW_POSTS sort, one page per group). WCMB 0 | Buy & Sell GJ 3 in-window | Delta 0 | Orchard Mesa 0 | Fruita 0 | Living In GJ 0 | CO Business Networking 4 | CO Business Mingle 0.
- Quiet overnight window verified real, not an API gap: an unfiltered Fruita pull showed newest posts 22:05/22:02 MDT, both below the old watermark, and the min-timestamp filter correctly excluded them. All 5 empty Western CO groups had genuinely no new posts after 23:17 MDT.
- 0 new genuine home-service prospects. 0 new-business radar hits. Repeat sightings of tracked businesses: none.
- Buy & Sell GJ in-window: (1) "Cold Season Kit" herbal-preparation promo by Esther Jade's Ltd (01:13 MDT, 2026-09-17; wellness/retail, out of trade; author tag published inline: @[1352890508863521:69:Esther Jade's Ltd] -> https://facebook.com/profile.php?id=1352890508863521); (2) Halloween Pokemon tee $10 personal resale (23:29 MDT); (3) unresolvable empty-caption post 3413410405533720 (23:20 MDT, 0 comments/reactions; author stripped; logged without guessing).
- Expansion-group spot check (intel only, out of trade): 4 concert/nightlife posts in Colorado Business Networking (Ned General music-venue photo posts 00:08-01:00 MDT, engagement-style posts with #StarsEverywhere), 0 in Colorado Business Mingle. Not business promos, not pursued.
- Demand signals: none actionable. Complaint signals: none actionable.
- facebook-cli cloud session healthy (facebook-cli me returned account OK; no auth errors this run).
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and session is parked). New watermark: 1789633018.

## Delta-scan #74 (2026-09-17 ~02:16 - ~05:19 MDT window, round 74, read-only)
- 8 posts scanned across 8 groups (min-timestamp 1789633018, NEW_POSTS sort, one page per group). WCMB 0 | Buy & Sell GJ 5 in-window (all personal resale: tamalero package offer, Yamaha clarinet mouthpiece, sterling silver turquoise earrings, vintage bud vase, Nokia battery) | Delta 0 | Orchard Mesa 0 | Fruita 2 (weather/morning-greeting post; one empty-caption unresolvable 4469205456686564 at 04:35) | Living In GJ 0 | CO Business Networking 1 (empty-caption unresolvable 4073071256161645 at 04:00) | CO Business Mingle 0. Posts appear at 02:57, 02:59, 03:01, 04:00, 04:35, 05:09 MDT, so the quiet overnight window is real, not an API gap (matches scan #73's quiet pattern).
- 0 new genuine home-service prospects. 0 new-business radar hits. Repeat sightings of tracked businesses: none.
- Demand signals: none actionable. Complaint signals: none actionable.
- KC Electrical Services LLC (Delta, CO) Facebook Page check: NOT VERIFIED. No Page located via web search, facebook-cli public-groups search, social.search, or place_id lookup (profile info 403, gated server-side). 2026-09-18 UTC email-queue slot-8 stays on HOLD; FB-first route blocked until a verified Page with Message button is found (needs Pig headed-Chrome check). Full report: facebook-scan-round74.md.
- facebook-cli cloud session healthy. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789643391. Report: facebook-scan-round74.md.
---

## Delta-scan #75 (2026-09-17 ~05:19 - ~08:15 MDT window, round 75, read-only)
- 45 posts scanned across 8 groups, min-timestamp 1789643391, NEW_POSTS sort, one page per group (42 in-window; 3 below-watermark API leaks, not double-counted: Fruita 4468265150113928 "Local business Thursday" thread 2026-09-16 06:58, c31; LivingGJ 3436645479857723 painter demand ask 2026-09-16 17:40, c18; both leaks logged as intel only). WCMB 1 | Buy & Sell GJ 13 | Delta 2 | Orchard Mesa 0 | Fruita 7 in-window | Living In GJ 4 in-window | CO Business Networking 14 | CO Business Mingle 2.
- 0 new genuine home-service prospects added. 0 new-business radar hits. Repeat sightings of tracked businesses: none (Integrity Painting appears only as a third-party comment recommendation on the leaked demand thread; already in pipeline.md).
- Resolved home-service promos (both Denver-metro, out of Western Colorado geography; Denver-area outreach deprioritized, NOT pursued):
  - COBizNet 4073288506139920 (07:58 MDT): "United Property Maintenance" commercial tree removal / landscape cleanup / gutter cleaning. Author resolved via social.search post_url to FB Page United Property Maintenance (upmlawns, Denver, CO; 720-924-1010, www.upmdenver.com). Out of geography; intel only.
  - COBizNet 4073270682808369 (07:39 MDT): "$500 OFF any exterior painting project booked through October 31st", call/text 720-907-5462. Author resolved via social.search post_url to personal profile "Turquoise Begay" (shadiin.begay), #denvercolorado. Out of geography; intel only.
- Out-of-trade sightings: COBizNet tax-credit accountant promo (4073255482809889, professional service, not a trade), marketing-ideas coach post (4073233069478797), mobile makeup/hairstyling (4073190092816428), Mind Quest Puzzles Palmer Lake (4073208629481241), Aurora networking Zoom promo (4073279026140868), "Come join us" church/community post (4073299252805512), Thursday travel question (4073158699486234); COBizMingle Felix Automotive Mobile Detailing upholstery steam cleaning 970-216-0342 (auto, out of trade), Skyzone Halloween Trunk-or-Treat event; Delta Dolly Parton "Best Little Whorehouse" tribute event promo (theatre venue, out of trade); WCMB anti-surveillance politics post; LivingGJ housing-policy image post (comments = housing discussion, not a business); Buy & Sell GJ remainder all personal resale (office furniture liquidation set, tool chest, coffee table, vintage sink, wall panels, seed spreader, flagstone pavers, concrete blocks/deck blocks, desks, vote-for-Alec-Larson contest). Fruita in-window: chest-freezer giveaway, emoji posts, event posts.
- Demand signals: painter demand ask leaked thread (LivingGJ 3436645479857723, "professional to paint master bathroom/bedroom; my guy isn't answering texts", c18): buyer ask + unresponsiveness complaint. Third-party recommendations only (Integrity Painting, Alexander LyBarger, Miracles by Motion, XL Painting GJ, Mountain Renovations LLC 970-589-6309, InLaws Construction 970-314-6360, Pete the Painter 779-537-7275, JZ Properties and Maintenance, Nextgenpainting by Joel Munoz, Unique Solutions Handyman and Remodeling LLC 972-269-3449). Not prospect-grade (no business-authored promo, third-party mentions, below-watermark leak); recorded as demand intel, no pipeline adds.
- Complaint signals: none actionable. "No response" complaint embedded in the leaked painter ask only.
- 12 unresolvable empty-caption posts (0 comments or only reacts; CLI strips authors; logged without guessing): LivingGJ 3437201463135458 (07:09), 3437189213136683 (06:54), 3437113356477602 (05:19); Delta 1803018137789891 (06:07); Fruita 4469337576673352 (07:12), 4469316980008745 (06:48, 3 reacts), 4469309376676172 (06:41); COBizNet 4073220926146678 (06:48), 4073209939481110 (06:37), 4073167889485315 (05:54), 4073150402820397 (05:34), 4073141382821299 (05:24).
- facebook-cli cloud session healthy. social.search post_url lookups working this run. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789654411. Report: facebook-scan-round75.md.

## Delta-scan #76 (2026-09-17 ~08:15 - ~11:15 MDT window, round 76, read-only)
- 81 posts scanned across 8 groups, min-timestamp 1789654411, --sort-by NEW_POSTS, one page per group (78 in-window; 3 below-watermark API leaks, not double-counted: WCMB new-members welcome 2026-09-16 08:58; Fruita gym schedule 2026-09-13 and empty post 2026-09-06). WCMB 7 | Buy & Sell GJ 20 | Delta 5 | Orchard Mesa 1 | Fruita 18 | Living In GJ 6 | CO Business Networking 20 | CO Business Mingle 1.
- 2 new genuine home-service prospects, both added to pipeline.md as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; no franchises):
  - **spiritguide grass** (Fruita, CO) — lawn care (fall cleanup, aeration, overseed, pruning, leaf removal), phone 970-433-3000 published in post. Self-identified solo operator. Added under "Facebook — Western Colorado (delta-scan #76, 2026-09-17)". Post: https://facebook.com/groups/3741333852807065/permalink/4469437723330004/
  - **L D Landscaping & Concrete** (Aurora/Denver, CO) — concrete (regular + stamped/colored) + landscaping, phone 303-944-6265 published in post (Colorado Business Networking). Verified via SAFER USDOT 3369230 + ibegin listing; name conflict noted (BBB ties same number to Ortega's Landscaping, LLC, unverified). Added under "Facebook — Denver-area groups (delta-scan #76, 2026-09-17)". Post: https://facebook.com/groups/2803047646497352/permalink/4073383862797051/
- 0 new-business radar hits.
- Repeat sightings of tracked businesses (not re-added): Coldiron's Creations and Property Service ("Wild Weed Wranglers", Delta, 970-209-4965) — "Got Weeds?" fall promo in Delta 08:35 MDT, already DM SENT 2026-09-08, no reply, F1 stays parked until a DM channel exists; Polished Junk Solutions (Haley Martin, 719-290-7122) — fall cleanup promo in COBizNet 09:26 MDT, already NEW in pipeline (2026-09-10), fresh timing signal logged.
- Demand signals (intel only): Buy & Sell GJ 10:49 MDT arborist/tree-service buyer ask in GWS (https://facebook.com/groups/108728816001912/permalink/3413937988814295/); pipeline already holds Western CO tree rows.
- Complaint signals: none actionable.
- Out-of-trade / skipped: gig-work ask (LivingGJ individual, not a business); auto detailing promo (Fruita); Western Slope Digital web-design agency free-demo offer (Fruita, marketing intel); Chalkline Ridge LLC canine service (already pipeline DM BLOCKED); insurance agent; HVAC filter post (COBizNet, no business name/contact, Colorado Springs); wax melts; traffic attorney; Aila Thai kitchen; real-estate listing; sourdough cross-posts; jewelry BOGO; vendor call; Buy & Sell GJ remainder all personal resale.
- 21 unresolvable empty-caption posts logged in facebook-scan-round76.md without guessing.
- Session health: facebook-cli cloud session healthy; first call used invalid `--sort` flag, retried with `--sort-by`, no data lost. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789665381. Report: facebook-scan-round76.md.

## Delta-scan #77 (2026-09-17 ~11:15 - ~17:16 MDT window, round 78, read-only)
- 88 posts scanned across 8 groups, min-timestamp 1789665381, --sort-by NEW_POSTS, one page per group (87 in-window; 1 below-watermark API leak, not double-counted: LivingGJ Avalon dressing-rooms post 11:11 MDT). WCMB 6 | Buy & Sell GJ 20 | Delta 8 | Orchard Mesa 6 | Fruita 19 | Living In GJ 7 | CO Business Networking 20 | CO Business Mingle 2.
- 2 new genuine home-service prospects, both Denver-area (out of Western Colorado geography; Denver-area outreach deprioritized, NOT pursued), added to pipeline.md under "Facebook — Denver-area groups (delta-scan #77, 2026-09-17)" as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; not franchises):
  - **CleanBoss LLC** — post-construction/contractor cleanup, residential + commercial cleaning, Denver metro. Author resolved via social.search post_url to "Emm Rixen" (personal profile; HomeGuide reviews name "Emm and KT"). Independent LLC, 6+ years on HomeGuide, 5.0. NZ Clean Boss franchise is a different entity. Post: https://facebook.com/groups/2803047646497352/permalink/4073729279429176/
  - **Colorado Bin Squatch** — trash bin cleaning/sanitizing (residential, commercial, HOA), South Denver Metro (tagged Highlands Ranch). Own Page posted (handle ColoradoBinSquatch), veteran owned, own site coloradobinsquatch.com. Post: https://facebook.com/groups/2803047646497352/permalink/4073699116098859/
- 0 new-business radar hits. 0 Western Colorado trade promos in window. Repeat sightings of tracked businesses: none.
- Demand signals (intel only): Fruita 17:07 hair-stylist recommendations ask (not our segment); Orchard Mesa 16:31 commercial-property ask from a 22-year-old GJ entrepreneur consolidating four owned businesses (notable local-operator intel, not a prospect); George Hall gig-work posts (WCMB 15:34 + Fruita 15:34, individual seeking yard/weeds work, not a business).
- Complaint signals: none actionable.
- Out-of-trade / skipped: Dawa Solutions IT LLC Denver (COBizNet 17:16, B2B IT/CCTV); Denver Custom Print Shop (COBizNet + COBizMingle cross-post, 303-591-5869); travel agent promo; bookkeeping promo; health-insurance throwback; fundraiser post; Tolland photo post; party rentals promo Fruita 970-623-7080 (event rentals, not a home-service trade); FinnSheep for sale Hotchkiss; Blessed Harvest farmstand return (cottage food); Explore Mesa County "Grand Valley Weekend Roundup" launch (community content platform, not a trade business); Palisade $749k real-estate listing; Palisade $2.4M business-for-sale (RE/MAX 4000); Nissan Xterra listing; Nordic Ski Swap Oct 24 event (Buy & Sell GJ); JunctionStrongArm arm-wrestling group (LivingGJ); Buy & Sell GJ remainder all personal resale; Delta retail-sale promo; admin "read the post below" rule posts (Delta, Orchard Mesa, LivingGJ).
- 29 unresolvable empty-caption posts logged without guessing: LivingGJ 3437494093106195 (13:36), 3437489199773351 (13:29), 3437419579780313 (11:48), 3437419389780332 (11:47); Delta 1803415657750139 (16:43), 1803406354417736 (16:22), 1803348967756808 (14:31), 1803341224424249 (14:18), 1803307814427590 (13:21), 1803273057764399 (12:22); OrchardMesa 1108982425412306 (17:12), 1108949675415581 (16:03), 1108885392088676 (14:01); Fruita 4469782409962202 (16:42, 2c/7r), 4469715043302272 (15:01), 4469669963306780 (13:53), 4469655979974845 (13:34), 4469651293308647 (13:28), 4469645909975852 (13:20); COBizNet 4073753292760108 (17:05), 4073731429428961 (16:36), 4073708256097945 (16:02), 4073705996098171 (15:59), 4073705859431518 (15:59), 4073697179432386 (15:47), 4073680492767388 (15:24), 4073670629435041 (15:09), 4073657449436359 (14:49); COBizMingle 28101909492813452 (14:56).
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and parked). New watermark: 1789686964 (2026-09-17 17:16 MDT). Report: facebook-scan-round78.md. Raw scratch: /tmp/scan77.

## Delta-scan #79 (2026-09-16 11:16 - 2026-09-17 20:11 MDT window, round 79, read-only)
- 110 posts scanned across 6 Western Colorado groups, watermark 1789579001 to 1789697501. WCMB 20 | Buy & Sell GJ 20 | Delta 20 | Orchard Mesa 11 | Fruita 19 | Living In GJ 20.
- Result: quiet window. Zero new qualified home-service business promos. Zero new-business radar hits.
- Repeat/excluded sightings only: Coldiron's Creations repeat promo (already tracked); George Hall gig-work posts (individual, not a business); 2 Feathers commercial-property post (intelligence only, not a prospect).
- 0 DMs sent, 0 parked (read-only run; Facebook engagement is Pig-only and parked). New watermark: 1789697501 (2026-09-17 20:11 MDT). Report: facebook-scan-round79.md.

## Delta-scan #80 (2026-09-17 20:11 - 23:18 MDT window, round 80, read-only)
- 24 posts scanned across 8 groups, min-timestamp 1789697501, --sort-by NEW_POSTS, one page per group. All 24 in-window; 0 below-watermark API leaks. WCMB 0 | Buy & Sell GJ 11 | Delta 0 | Orchard Mesa 0 | Fruita 7 | Living In GJ 0 | CO Business Networking 5 | CO Business Mingle 1.
- 1 new genuine home-service prospect, added to pipeline.md as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; no franchise; individual operator):
  - **Adrian Bustillos** (Fruita, CO) — handyman + carpenter + junk removal. Phone 970-691-4912 published verbatim in post; project photos posted. Author resolved via social.search post_url to personal profile "Adrian Bustillos" (ramon.ayala.94042). Post: https://facebook.com/groups/3741333852807065/permalink/4469971699943273/ (2026-09-17 21:26 MDT).
  - Parked DM draft (NOT sent; read-only run; Messenger CLI only sends to synced contacts; author is a personal profile, not a business Page — no Message button route available; phone is the primary contact path):
    > Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
    >
    > I'm an AI reaching out on behalf of PING Social.
    >
    > Saw your post in the Fruita group, handyman and carpenter work plus junk removal with photos of your projects.
    >
    > When you are on a job or hauling, every call that goes to voicemail is a job that books with someone else.
    >
    > I help Western Slope trades make sure every call and text gets answered and booked, even when they are working.
    >
    > Worth a 10-minute chat?
    >
    > PING Social, (970) 589-3309.
    >
    > You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163
- 0 new-business radar hits. 0 Western Colorado trade promos beyond Adrian Bustillos.
- Repeat sightings of tracked businesses: none.
- Demand signals: none actionable. Complaint signals: none.
- Out-of-trade / skipped: Buy & Sell GJ 11 posts all personal resale (bed frame, craft lot, fifth wheel, grille guard, ATV, vinyl record, camp stove, entertainment center, washer/dryer, Halloween decor, guitar pickup); Fruita Bustang bus-driver fleet post (personal, transportation); 2 photo posts (moon, sunset); COBizNet rain/wildfire correction, elk photo, Air Force birthday, weekly-celebration email promo (coach newsletter), "Sparkle of Light Open House" wellness event (not home service); COBizMingle Falcon business-networking event (Falcon, CO; networking, not a trade).
- 3 unresolvable empty-caption posts (CLI strips authors; logged without guessing): Fruita 4470027243271052 (22:47), 4470018393271937 (22:33), 4469977283276048 (21:34).
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). social.search post_url author lookup working. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and parked). New watermark: 1789708688 (2026-09-17 23:18 MDT). Report: facebook-scan-round80.md. Raw scratch: /tmp/scan80.

## Delta-scan #83 (2026-09-18 05:20 - 08:13 MDT window, round 83, read-only)
- 37 in-window posts across 8 groups, watermark 1789730438 to 1789740827. WCMB 2 | Buy & Sell GJ 12 | Delta 2 | Orchard Mesa 1 | Fruita 6 | Living In GJ 1 | CO Business Networking 9 | CO Business Mingle 4. 0 below-watermark API leaks.
- Result: zero new home-service trade prospects. Zero new-business radar hits.
- NEW non-trade signal (observed only, not added to pipeline): Little Sunflowers Preschool rebrand (formerly Creative Avenues Preschool and Learning Center, Grand Junction childcare), posted by recommender Autumn Reeves (autumn.mallett.7), LivingGJ 3438173913038213 + Buy & Sell GJ 3414772292064198. Non-trade, third-party post.
- Unverified-location signal: Organized Living Spaces FB Page (closet/office organization storage systems, 146 followers, handle hints Grand Junction) posted an empty-caption post in COBizNet (4074401949361909); profile 403-gated, location not verified via web. NOT added until location is confirmed.
- Repeat sightings: Felix Automotive Mobile Detailing (COBizMingle 28109757748695293, 970-216-0342, already classified out-of-trade auto); Blessed Harvest farmstand return (Orchard Mesa 1109512148692667, cottage food, out of trade).
- Out-of-geo business posts: Dumpster Dudez of South Denver (COBizNet, dumpster rental, out of geography); Vecinos Mexican Grill and Cantina (Severance/Windsor breakfast promo, out of Western CO, restaurant); Highline Aesthetics Denver (medspa, out of geo).
- Non-trade promos: health-insurance agent post, South Denver Historical Museum feature, Kingpin apparel/DTF printing (Out the Box / Mom & Pops / DTFXpress / Planet T's), CM Accounts Ltd tax/bookkeeping, Luther Benson real estate, political TV ad (Jeff Hurd, Fruita). Remainder: personal resale, community events (potluck, bake sale, yard sale), empty-caption personal photos (Gus Weber x2 Delta, Elizabeth Nunn Fruita, Susan Rawlins Fruita, Valerie Nybo-Bennett CBMingle, Marcelino Espina CBMingle).
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). social.search post_url author lookup working. 0 DMs sent, 0 attempted, 0 parked (read-only run). New watermark: 1789740827 (2026-09-18 08:13 MDT). Report: facebook-scan-round83.md. Raw scratch: /tmp/scan83.

## Delta-scan #84 (2026-09-18 08:13 - ~11:20 MDT window, round 84, read-only)
- 76 posts across 8 groups, min-timestamp 1789740827, --sort-by NEW_POSTS, one page per group (72 in-window; 4 below-watermark API leaks, not double-counted: Fruita 4469773599963083 entrepreneur property ask 09-17 16:27 and Fruita 4469557083318068 Explore Mesa County launch 09-17 11:25, both already noted in scan #77; Fruita 4470334113240365 "free ice cream or soft wine during session" promo 09-18 05:39, out of trade; COBizNet 4073464976122273 "looking for biz owners" networking engagement post 09-17 10:58, not a business promo). WCMB 7 | Buy & Sell GJ 20 | Delta 2 | Orchard Mesa 2 | Fruita 17 in-window | Living In GJ 5 | CO Business Networking 19 in-window | CO Business Mingle 0.
- 3 new genuine home-service prospects, all added to pipeline.md as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; no franchises; all three business identities verified via web search):
  - **Inlaws Construction Services LLC** (Grand Junction, CO) — home remodeling: kitchen/bath makeovers, deck/porch, painting, new home construction. Colorado SOS verified: Entity ID 20211262988, DLLC formed 2021-03-19, registered agent Armando M Lara (matches FB author). Address 119 Burns Dr, GJ 81503 (SOS filing). NO phone published in the post (phone UNKNOWN; the 970-314-6360 number from scan #75's demand-thread third-party mention stays unverified, not used). Author: personal profile "Mondo Lara" (handle armando.lara.319), tagging the InLaws Construction Page. Added under "Facebook — Western Colorado (delta-scan #84, 2026-09-18)". Post: https://facebook.com/groups/108728816001912/permalink/3414973768710717/ (2026-09-18 09:44 MDT).
  - **Litto's Fencing, LLC** (Wheat Ridge/Denver, CO) — fencing: "Wood to Steele experts" (wood, chain link, wrought iron, composite; repairs/restorations). Verified: own site littosfencing.com, 6220 West 47th Place, Wheat Ridge CO 80033, phone 720-461-4790 published in post and matching own site; BBB A+. Author: personal profile "Litto Jesus Maestas" (handle litto.maestas), tagging the Litto's Fencing Page. Added under "Facebook — Denver-area groups (delta-scan #84, 2026-09-18)". Post: https://facebook.com/groups/2803047646497352/permalink/4074656159336488/ (2026-09-18 11:00 MDT).
  - **Aspire Electric LLC** (Westminster/Denver metro, CO) — electrician: residential/commercial/industrial install, maintenance, repair; licensed and insured. Verified: own site aspireelectricllc.com, 6494 W 91st Ave, Westminster CO 80031, owner Sol R Johnson-Mey (BBB); serving Denver metro since 2017 (matches Page bio). Own business Page posted (handle AspireElectricColorado); identical promo posted twice (09:29 + 09:40 MDT), one pipeline row. Phone NOT in the post: (303) 995-2116 (web profile) / (720) 217-7393 (BBB), both not own-site-verified, verify before use. Added under "Facebook — Denver-area groups (delta-scan #84, 2026-09-18)". Post: https://facebook.com/groups/2803047646497352/permalink/4074638389338265/ (2026-09-18 10:40 MDT).
- 0 new-business radar hits.
- Repeat sightings of tracked businesses (not re-added; fresh promo timing signals logged): All-in-one Moving LLC (Jesus Lopez, 720-695-9469) — fresh bilingual moving/junk promo in COBizNet 09:25 MDT, already NEW in pipeline (2026-09-10); Polished Junk Solutions (Haley Martin, handle haley.martin.333225, 719-290-7122) — fresh fall-cleanup promo in COBizNet 09:08 MDT, already NEW in pipeline (2026-09-10).
- Demand signals: none actionable. Complaint signals: none actionable.
- Out-of-trade / skipped: Ken Caryl Pet Spa new-owners promo (COBizNet 10:51, pet grooming, Denver metro, out of trade); Vecinos Mexican Grill and Cantina (restaurant); milehighdetailing.co (auto detailing, out of trade); "(609) 521-6073 Call Today!" (no business name/contact, NJ area code, unusable); English/Spanish lessons, life-insurance engagement post, bookkeeping promo, Mel's mugshot, mobile makeup/hairstyling, Mind Quest Puzzles Palmer Lake (all out of trade); Self Serve Bread Barn (Orchard Mesa, cottage food/bakery, out of trade); admin "read the post below" rule posts (Delta, Orchard Mesa, LivingGJ); Buy & Sell GJ remainder all personal resale (kids' shoes, car dealership listings from Western Slope Auto and Bozarth Miller Chevrolet, household items); WCMB all personal resale.
- 13 unresolvable empty-caption posts (CLI strips authors; logged without guessing): Delta 1803977394360632 (08:17); LivingGJ 3438280286360909 (08:54), 3438266813028923 (08:39); Fruita 4470534129887030 (09:34), 4470533129887130 (09:33), 4470527463221030 (09:26), 4470510783222698 (09:04); COBizNet 4074656589336445 (11:00), 4074653239336780 (10:56), 4074652486003522 (10:55), 4074626256006145 (10:30), 4074588329343271 (09:58), 4074572539344850 (09:42).
- facebook-cli cloud session healthy. social.search post_url author lookups working. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789751660 (2026-09-18 11:14 MDT). Report: facebook-scan-round84.md. Raw scratch: /tmp/scan84.

### Parked DM drafts (round 84 — NOT sent; read-only run; Facebook engagement is Pig-only and parked; Messenger CLI only sends to synced contacts anyway)

1. Mondo Lara / Inlaws Construction Services (Grand Junction, home remodeling)
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your Inlaws Construction Services post in the GJ group, remodeling and kitchen and bath work plus decks and porches.
>
> When your crew is on a job site, every call that goes unanswered is a remodel that books with someone else.
>
> I help Western Slope trades make sure every call and text gets answered and booked while they work.
>
> Worth a 10-minute chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

2. Litto Jesus Maestas / Litto's Fencing (Denver metro, fencing)
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your Litto's Fencing post about being the wood to steel experts.
>
> When your crew is out on a fence job, every missed call is a quote that goes to another company.
>
> I help trade businesses capture every call and text so nothing slips, while the owner stays in charge.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

3. Aspire Electric LLC Page (Denver metro, electrician)
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your post about being licensed and insured electricians serving the Denver area.
>
> When your techs are on a job, every call that goes to voicemail is a service call that books elsewhere.
>
> I help trade businesses capture every call and text so nothing slips, while the owner stays in charge.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## Delta-scan #85 (2026-09-18 11:14 - ~14:30 MDT window, round 85, read-only)
- 64 posts across 8 groups, min-timestamp 1789751660, --sort-by NEW_POSTS, one page per group (64 in-window; 0 below-watermark API leaks this run). WCMB 5 | Buy & Sell GJ 20 | Delta 5 | Orchard Mesa 2 | Fruita 9 | Living In GJ 2 | CO Business Networking 20 | CO Business Mingle 1.
- 1 new prospect:
  - **Gannon's Garage Doors LLC** (geography uncertain; 720 area code, posting in Colorado Business Networking) — garage door services: realtor-facing trade tip ("Before you wrap up a listing walkthrough, hit the garage door button... Does it open smoothly? Is it unusually loud?..."). Expertise-positioning promo to a referral audience. Phone 720-701-7011 published in the post itself. No own site found via web search; 0 hits in pipeline/leads/facebook-dms (fresh). Added under "Facebook — Denver-area groups (delta-scan #85, 2026-09-18)". Post: https://facebook.com/groups/2803047646497352/permalink/4074724242663013/ (2026-09-18 12:17 MDT).
- Competitor intel: **Atlas Automation** (COBizNet 4074757649326339, 12:51 MDT) — "We build AI receptionists that help local businesses stop missing calls (and money)"; hiring commission-based sales reps in the same Colorado business networking channel. Direct AI-receptionist competitor. Intel only; no engagement.
- Out-of-trade / out-of-geo / unusable: "Junk Removal - 719-290-8761" (719 area code, Colorado Springs/Pueblo, out of geo); Memphis Auto Spa (206 Seattle, out of trade + geo); dog grooming promo (BS, sole operator consumer service, out of trade); Google Nest cam promo (COBizNet, no business name/phone/author, unusable); cleaning promo (COBizNet, no business name, "call this number" with no number, unusable); vehicle/personal resale remainder (BS, WCMB); real estate listings; admin rule posts; coupon spam; garage sale/liquidation; community theater; lost dog; consumer car-buying ask (Orchard Mesa).
- Zero new-business radar hits; no actionable demand/complaint signals; 18 unresolvable empty-caption posts logged without guessing.
- facebook-cli cloud session healthy. 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789762642 (2026-09-18 14:17 MDT). Report: facebook-scan-round85.md. Raw scratch: /tmp/scan85.

### Parked DM drafts (round 85 — NOT sent; read-only run; Facebook engagement is Pig-only and parked; Pig-side Page Message-button verification required before any send)

**To: Gannon's Garage Doors LLC (Facebook business Page, pending verification)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your Friday tip for realtors about checking the garage door on listing walkthroughs.
>
> When a listing agent actually finds something, they call fast, and that call comes while your crew is on a ladder somewhere.
>
> I help trade businesses answer every call and text instantly and route the job details to the right tech, so no emergency books elsewhere.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## Delta-scan #86 (2026-09-18 14:17 - ~17:20 MDT window, round 86, read-only)
- 73 posts scanned across 8 groups, min-timestamp 1789762642, --sort-by NEW_POSTS, one page per group (66 in-window; 7 below-watermark API leaks, not double-counted: all LivingGJ — 3438387493016855 real estate link 11:14, 3437464053109199 veterans air-show tickets 09-17 12:52, 3437566096432328 George Hall gig-work 09-17 15:34, 3438278183027786 "Let me know please" 08:51, 3438264383029166 painter gig-work ask 08:36, 3438290699693201 bike-tire install ask 09:07, 3438407946348143 empty caption 11:42). WCMB 3 | Buy & Sell GJ 20 | Delta 1 | Orchard Mesa 1 | Fruita 13 | Living In GJ 9 in-window | CO Business Networking 17 | CO Business Mingle 2.
- 1 new genuine home-service prospect, added to pipeline.md as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; 0 hits; no franchise):
  - **Resurfaced Colorado** (Highlands Ranch / Denver metro) — resurfacing + custom woodwork: kitchens, walls, tables ("custom one of a kind functional art"); own FB Page tagged in post; posted by Ray Sample (personal profile, handle sampleofray), co-tagging Matt Rinn. Business identity NOT web-verifiable (no own site found via search; tagged FB Page only). Phone UNKNOWN (not published in post). Added under "Facebook — Denver-area groups (delta-scan #86, 2026-09-18)". Route: Facebook-first protocol — Pig-side Page Message-button verification before any send; email route unverified. Post: https://facebook.com/groups/2803047646497352/permalink/4074888332646604/ (2026-09-18 15:31 MDT).
- 0 new-business radar hits. Dorothy Stoner "Today is the day" (Fruita, 15:19) resolved via social.search to a personal profile, personal post, not a business.
- Demand signals: none actionable. Fruita recycling-bin ask (municipal service info); Fruita Watermelon Days / yard-sale asks (community); LivingGJ bike-tire install ask (below-watermark leak).
- Complaint signals: none actionable. Fruita fast-car / "shot gun noises" down North Maple (community complaint, not business-related).
- Growth-signal intel (not prospect-grade): Esteban Herrera (personal profile, handle esteban.herrera.708707) posted in COBizNet 14:58 MDT "I have a small moving company, looking for a few reliable guys. I pay $25/hr daily" (5 comments, 8 likes). No company name, no phone, no location; different author than All-in-one Moving LLC (Jesus Lopez), so NOT a repeat sighting. Logged as hiring/growth intel only.
- Out-of-geo trade sightings (intel only, not added): Falling Star HVAC (COBizNet 4074895865979184, 15:41 MDT) — fallingstarhvac.com, #coloradospringshvac — HVAC promo, Colorado Springs, out of geography.
- Marketing intel: TradeTribe.net promo (COBizNet 16:08, trade networking site); "Wingin' It" podcast ISO construction-business-owner guests (COBizNet 15:07, construction-trade podcast — potential future content channel).
- Out-of-trade / skipped: bookkeeping / tax-IRS / insurance / realtor referral promos (COBizNet, professional services); "Our magic is only slightly dark" cross-post (COBizNet + COBizMingle, vague, no business identity); Gabi social-media portfolio gig post; window-tinter hiring story (B2B content); Boulder Philharmonic season post; church post; Palisade open house ($812 Rapid Creek Rd, real estate); Buy & Sell GJ remainder all personal resale (Samsung phone, tie rack, bikes/trikes x3, desk lamp, GMC trucks x2, coffee table, trampoline, kids tablet, freezer ISO, RV wheel chocks, stools, Barbie playhouse, village collection, smoker, dog bed, Schwinn); Fruita remainder community (moms event x2, children's ministry sale, lost dog found, Watermelon Days ask); Delta empty-caption post; Orchard Mesa empty-caption post; LivingGJ cluster of 8 empty-caption photo posts (15:23-15:35, likely one user's photo dump) + children's ministry sale cross-post.
- 20 unresolvable empty-caption posts (CLI strips authors; logged without guessing): Delta 1804251154333256 (15:19); OrchardMesa 1109774841999731 (14:38); Fruita 4470801876526922 (15:40), 4470754869864956 (14:23), 4470752819865161 (14:19); LivingGJ 3438616259660645 (17:06), 3438565502999054 (15:35), 3438565429665728 (15:35), 3438565366332401 (15:35), 3438564979665773 (15:34), 3438564922999112 (15:34), 3438564719665799 (15:33), 3438558919666379 (15:23), 3438407946348143 (11:42, leak); COBizNet 4074949882640449 (17:01), 4074885109313593 (15:27), 4074873419314762 (15:11), 4074867422648695 (15:03); COBizMingle 28116494284688306 (17:04).
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). social.search post_url author lookups working (2 trade posts + 1 personal post resolved). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789773288 (2026-09-18 17:14 MDT). Report: facebook-scan-round86.md. Raw scratch: /tmp/scan86.

### Parked DM drafts (round 86 — NOT sent; read-only run; Facebook engagement is Pig-only and parked; Pig-side Page Message-button verification required before any send)

**To: Ray Sample / Resurfaced Colorado (Highlands Ranch, Denver metro — resurfacing/custom woodwork)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your Resurfaced Colorado post about your resurfacing work over the years, kitchens, walls, tables.
>
> When you are in the shop or on a job, every call that goes to voicemail is a project that books with another shop.
>
> I help trade businesses answer every call and text instantly and route the job details to the right person, while you stay in charge.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## Delta-scan #87 (2026-09-18 17:14 - ~20:30 MDT window, round 87, read-only)
- 159 posts scanned across 8 groups, min-timestamp 1789773288, one page per group (41 in-window; 118 pre-window fetched, not double-counted). WCMB 2 | Buy & Sell GJ 18 (all personal resale) | Delta 1 (personal ask) | Orchard Mesa 0 | Fruita 6 | Living In GJ 1 (empty caption) | CO Business Networking 13 | CO Business Mingle 0.
- 3 new prospects, added to pipeline.md as NEW (dedup verified against facebook-dms.md, pipeline.md, leads.md; 0 hits; no franchise):
  - **Amber's House Cleaning LLC** (WCMB, cleaning; Page owner "Ambers house cleaning llc", owner_id 100063786844086; before/after shower deep-clean promo posted 17:21 MDT with a duplicate 17:20; post CTA "Message us to get your home on the schedule"). Town UNKNOWN (WCMB = Western Colorado). Phone UNKNOWN (not published in post; own site unknown). Added under "Facebook — Western Colorado (delta-scan #87, 2026-09-18)". Route: Facebook-first protocol — Pig-side Page Message-button verification before any DM (CLI profile-info 403'd, Pig-side check needed). WARM.
  - **X Stretch** (Fruita group, carpet power-stretching; image ad "DON'T REPLACE IT — STRETCH IT! ... CALL FOR AN ESTIMATE 970-575-4266"; phone published in image; posted by Richard Nelson, personal profile 100082004727162; business name from image OCR; no own site found). Town UNKNOWN (Fruita group, likely Grand Valley). Route: phone-route only (personal-profile author, no Messenger path). WARM.
  - **Wine Valley Spa's** (Fruita group hot-tub recommendation thread; NOT a business promo: 2-3 commenters recommended "Donnie with Wine Valley Spa's", phone 970-216-8833; social-discovery intel). Logged as WATCH, source=facebook-recommendation; phone comment-published, not own-site; no outreach from this alone. Route: pending own-site verification.
- 0 new-business radar hits. No grand-opening / now-open / just-launched posts from genuine trade businesses.
- Demand signals: Fruita hot-tub installer recommendation thread (2-3 recommenders naming Wine Valley Spa's / Donnie — demand-side intel, logged above); Fruita yard-work referral (personal, not prospect-grade).
- Complaint signals: none actionable.
- Out-of-geo trade sighting (intel only, not added): Memphis Auto Spa (COBizNet 4074999052635532, ~17:55 MDT) — mobile/detailing promo, 206 area code, traveling detailer, not WCO local.
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789782892 (2026-09-18 20:14 MDT). Report: facebook-scan-round87.md.

### Parked DM drafts (round 87 — NOT sent; read-only run; Pig-side Page Message-button verification required before any send)

**To: Amber's House Cleaning LLC (WCMB, cleaning — Page post, "Message us" CTA)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your before-and-after shower post in Western Colorado Message Board.
>
> When you are mid-job on a deep clean, every scheduling message that sits unread is a booking that drifts to another cleaner.
>
> I help home-service businesses answer every call and message instantly and keep the schedule full, while the owner stays in charge of the work.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## Delta-scan #88 (2026-09-18 19:54 - 23:04 MDT window, round 88, read-only)
- 160 posts scanned across 8 groups, min-timestamp 1789782892, one page per group (28 in-window; 132 pre-window fetched, not double-counted). WCMB 1 (personal resale) | Buy & Sell GJ 15 (all personal resale) | Delta 1 (missing-dog post) | Orchard Mesa 0 | Fruita 4 (community asks/shares) | Living In GJ 1 (empty-caption share) | CO Business Networking 6 (3 captionless shares, comfort-food question, birthday post, 1 captionless share) | CO Business Mingle 0.
- 0 new genuine home-service prospects. Parse note: this scan keyed on the `creation_time` field; a first pass on `created_time` returned 0 in-window (parse error, not a quiet window). Watermark math verified against sample posts.
- Repeat sighting: Liberty Painting LLC (COBizNet business Page post 4075118915956879, ~20:45 MDT) — captionless media share; already pipeline NEW (2026-09-10, DM draft parked since round 21). Mild vitality signal; no DM (no channel).
- Out-of-trade sighting (intel only, not added): Beauty and the Peach (COBizNet post 4075197932615644, ~22:22 MDT) — captionless share; web search confirms Beauty and the Peach Makeup Boutique (beauty trade), out of segment.
- 0 new-business radar hits. No complaint signals. No prospect-grade demand signals.
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789794259 (2026-09-18 23:04 MDT). Report: facebook-scan-round88.md.

## Delta-scan #89 (2026-09-18 23:04 - 2026-09-19 ~02:15 MDT overnight window, round 89, read-only)
- 11 posts scanned across 10 groups, min-timestamp 1789794259, --sort-by NEW_POSTS, one page per group (11 in-window; 0 pre-window fetched in the non-empty groups). WCMB 2 | Buy & Sell GJ 5 | Delta 0 | Orchard Mesa 0 | Fruita 1 | Living In GJ 0 | CO Business Networking 3 | CO Business Mingle 0 | Palisade (new group this round) 0 | Glenwood Springs (new group this round) 0.
- 0 new genuine home-service business promos. 0 new-business radar hits. Overnight window: personal resale only (WCMB pop-up camper $1,200, motel furnishings package; Buy & Sell GJ brass figurine, 3 petrified-wood posts same seller, 2009 Chevy HHR), COBizNet photography shares x2 + 1 empty-caption post, Fruita dog-rehoming post. No trade promos, so no social.search author lookups were needed.
- 0 new prospects. Nothing added to pipeline.md this round (no additions to dedupe). No parked DM drafts (no prospects).
- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske; no auth errors). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789804653 (2026-09-19 01:57 MDT). Report: facebook-scan-round89.md. Raw scratch: /tmp/scan89.

## Delta-scan #90 (2026-09-19 01:57 - ~05:20 MDT pre-dawn window, round 90, read-only)
- 200 posts fetched across 10 groups, filtered locally on creation_time > watermark 1789804653 (10 in-window; 190 pre-window fetched, not double-counted; the --min-timestamp flag returned 0 for every group this run, same unreliability class as round 88). WCMB 0 | Buy & Sell GJ 5 (personal/craft resale: backpack, x2 handmade whistles, wooden bench, fire starters) | Delta 1 (empty caption, unresolvable) | Orchard Mesa 0 | Fruita 3 (community: "Happy Saturday", thumbs-up emoji, missing dog "Sissy") | Living In GJ 0 | CO Business Networking 1 | CO Business Mingle 0 | Palisade 0 | Glenwood Springs 0.
- 0 new genuine home-service business promos. 0 new-business radar hits. 0 new prospects, 0 new parked DM drafts (drafts only exist when there is a genuine prospect).
- Repeat sighting: Colorado Bin Squatch (COBizNet 4075401619261942, 02:37 MDT) — veteran-owned bin washing, phone 720-436-6036, www.coloradobinsquatch.com; already pipeline NEW since delta-scan #77 (Denver-area, deprioritized). Re-promotion = mild vitality signal only; no new entry.
- Demand/complaint signals: none actionable. Fruita missing-dog post (community).
- DM channel state: facebook-cli cloud session healthy (me = Nolan Geske, no auth errors); messenger CLI not present on this host; Messenger DM path remains Pig-only and parked. 0 DMs sent, 0 attempted (read-only run). New watermark: 1789816550 (2026-09-19 05:15 MDT). Report: facebook-scan-round90.md. Raw scratch: /tmp/scan90.

## Delta-scan #92 (2026-09-19 08:17 - ~11:20 MDT morning window, round 92, read-only)
- 199 posts fetched across 10 groups (20/group; Fruita 19), filtered locally on creation_time > watermark 1789827441 (73 in-window; 126 pre-window fetched, not double-counted; --min-timestamp not used per round-88/90 unreliability finding). WCMB 6 (car-dealer listings, bake pop-up, permanent jewelry walk-ins, throw pillows) | Buy & Sell GJ 20 (all personal resale: desk, SUVs, paddles, recliner, bracelet, batteries, toy hauler, cable, jacket, vacuum, garage sale, tablet, floor mats) | Delta 2 (Faithful Hands farmstand food, empty caption) | Orchard Mesa 1 (Blessed Harvest Homestead farmstand food) | Fruita 16 (farmers market, farm stand, yoga event, missing/found dogs, kids lemonade, yard sale, photos, festival vendor, misdelivered package, haircut promo, roadhouse event) | Living In GJ 4 (job-seeker welding, hauling startup, open-market vendor call, computer repair promo) | CO Business Networking 19 (sales-recruiting, dumpster promo x2, RE-investor content, photographer minis, AI summit, silk garment care, creative alliance, studio rental, empties) | CO Business Mingle 1 (empty) | Palisade 2 (gala event, cookie pop-up) | Glenwood Springs 2 (moving sale, McClure Pass road question).
- GROUP ID CORRECTION: the task listed CO Business Networking as 4075401619261942; that ID 404s. It is a stale ID from round-90 prose (it was actually a COBizNet post ID). The real group ID per round-90 table is 2803047646497352, which fetched 20 posts fine.
- 0 new genuine home-service business prospects. 0 new-business radar hits. 0 new parked DM drafts.
- Repeat sighting: Scott Rush (dad-and-son junk hauling startup) — reposted Living In GJ 3439312039591067 (09:17 MDT), author scott.rush.7 via social.search post_url, text-to 970-778-1219; already pipeline NEW/WARM (round 52) and leads.md. Vitality signal only; no duplicate row created.
- Out-of-scope sightings (intel only, not added): Jackson haircut promo (Fruita 141 S Mesa St Unit B, (970)296-4822, square booking; barber trade, not home-service) | Carbon Computers (Living In GJ, carboncomputers.com; consumer tech, not blue-collar trade) | George Hall welding job-seeker (Living In GJ; seeking work, not a business) | Curbside roll-off dumpster promo x2 (COBizNet, 303-343-7096; home-service-adjacent but Front Range, Denver-area deprioritized, no pipeline row) | farmstands, MLM recruiting, photographers, event promos (out of trade or out of area).
- Demand/complaint signals: none. No review-triggered material in groups.
- DM channel state: facebook-cli cloud session healthy (me = Nolan Geske); messenger CLI not present on this host; Messenger DM path remains Pig-only and parked. 0 DMs sent, 0 attempted (read-only run). New watermark: 1789838014 (2026-09-19 11:13 MDT). Report: facebook-scan-round92.md. Raw scratch: /tmp/fb-scan92.

## Delta-scan #93 (2026-09-19 11:13 - ~14:20 MDT window, round 93, read-only)
- 200 posts fetched across 10 groups, filtered locally on creation_time >= watermark 1789838014 (74 in-window; 126 pre-window fetched, not double-counted; --min-timestamp not used per round-88/90 unreliability finding). WCMB 5 (car-dealer listings x3, ladder resale, headboard resale) | Buy & Sell GJ 20 (all personal resale) | Delta 4 (retail gift promo, empty caption, Tim Curry obituary, 1 trade repeat) | Orchard Mesa 3 (event invite, lost cat, 1 new prospect) | Fruita 16 (dirt-bike complaint thread, eggs, lost dog, jewelry, photos, yard sale, empties) | Living In GJ 7 (Lexi Brown teaser, empties, photo booth, arcade, events) | CO Business Networking 12 (wellness, CPR, bookkeeping, photos, 4 empties, 2 trade repeats) | CO Business Mingle 1 (💪) | Palisade 4 (yarn event, teaser twin, closure notice, open house) | Glenwood Springs 2 (hike ask, CPR promo).
- 1 new prospect, added to pipeline.md as NEW (dedup verified 0 hits across facebook-dms.md, pipeline.md, leads.md; no franchise):
  - **Legacy Furniture LLC** (custom handcrafted live-edge and epoxy furniture) | Grand Junction, CO (showroom 579 1/2 North Commercial Dr, GJ 81505) | phone 970-250-4448 (post-published); www.legacyfurniture.llc | author: Legacy Furniture LLC business Page (LegacyFurnitureCompanyllc, author_id 100091489283796), resolved via social.search post_url | Post: https://facebook.com/groups/486356801008208/permalink/1110594691917746/ (Orchard Mesa, ~11:52 MDT) | MISSED_CALL_LEAD_CAPTURE (custom commissions start as conversations; makers in the shop, not answering) + SOCIAL_PRESENCE secondary. WARM. Route: Facebook-first protocol — Pig-side Page Message-button verification before any DM (CLI non-contact hard block; Messenger path Pig-only, parked).
- 0 new-business radar hits. 0 prospect-grade demand/complaint signals.
- Repeat sightings (vitality signals, no new rows): Coldiron's Creations and Property Service (Delta, 970-209-4965) — fresh fall leaf-season cleanup promo in Delta (1804972344261137, ~11:21 MDT); DM SENT 2026-09-08, no reply, F1 hook, stays parked; Houston Specialty Contractors LLC (Mike Houston, 970-608-2383) — re-promo in COBizNet (4075903552545082, ~11:51 MDT); pipeline NEW, DM parked; Abbotts Cleanup & Restoration (Denver, 303-975-4000) — mold-awareness promo in COBizNet (4075929519209152, ~11:15 MDT); pipeline DRAFTED round-6 (queued, orphaned, never sent); Michael Haren (artisanal metalwork, NoCo) — empty-caption COBizNet post, previously excluded (out of geography/segment).
- Empty-caption lookups (COBizNet, social.search post_url): Jennifer Dempsey (personal carousel, no business) | Thom Seehafer (self-defense/fitness coach, out of segment) | Michael Haren (excluded, above) | Robert Jackson (personal, unresolvable). Unresolvable teasers: Lexi Brown (lexi.zumwalt) "Come see the difference! 🪻🐝" cross-posted Living In GJ + Palisade (personal profile, no business info); 2 Living In GJ + 3 Fruita + 1 Delta empty captions logged in facebook-scan-round93.md without guessing.
- facebook-cli cloud session healthy (no auth errors). 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only). New watermark: 1789849209 (2026-09-19 14:20 MDT). Report: facebook-scan-round93.md.

### Parked DM drafts (round 93 — NOT sent; read-only run; Pig-side Page Message-button verification required before any send)

**To: Legacy Furniture LLC (Orchard Mesa group, custom furniture showroom, Page LegacyFurnitureCompanyllc)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Saw your rainy-week showroom post in the Orchard Mesa group, hand-built live-edge and epoxy pieces made right there in Grand Junction.
>
> Custom work like yours starts with a conversation, and every showroom inquiry that lands while you are in the shop building goes to the next maker on the list.
>
> I help trade businesses answer every call and message instantly and keep the commission pipeline full, while you stay in charge of the craft.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## Delta-scan #95 (2026-09-19 17:30 - 20:07 MDT window, round 95, Pig CDP route live)
- 120 posts fetched across the 6 Western Colorado groups (20/group), filtered locally on creation_time >= watermark 1789860600 (36 in-window; 84 pre-window fetched, not double-counted; --min-timestamp not used per round-88/90 unreliability finding). WCMB 4 (all personal resale: car, floor buffer, estate sale, cutoff tool) | Buy & Sell GJ 18 (16 personal resale: furniture, watches, vacuum, shoes, drone, tires, jeans, mirror, cars, hat, jersey, umbrella; 1 volunteer ask, 1 empty) | Delta 2 (1 empty taco-business photo post, 1 off-topic hieroglyphics spam link) | Orchard Mesa 1 (share link by a retired individual) | Fruita 9 (egg special cottage food, South Park joke, sunset photos, volunteer ask, 4 empty image posts) | Living In GJ 2 (share link by same retired individual, volunteer ask).
- 1 new candidate, added to pipeline.md as NEW (dedup: 0 hits across facebook-dms.md, pipeline.md, leads.md):
  - **Salinas Farmfixit** (Page, author_id 61592090240669) | farm equipment repair / fix-it services (name-inferred; image-only promo, no caption) | Fruita, CO (posted in Fruita group) | no contact info observed | Post: https://facebook.com/groups/3741333852807065/permalink/4471958416411268/ (Fruita, ~19:07 MDT) | stack: UNKNOWN | WATCH (source=facebook-dms round 95, signal/unverified; image-only, no contact path; DM parked per Facebook-first protocol).
- 0 new-business radar hits. 0 complaint/demand signals.
- Author lookups via social.search post_url (11 posts): Brittney Bade (brittney.bade, individual) "Needing some Volunteer help" cross-posted Buy & Sell GJ + Fruita (+ Living In GJ variant); Aaron Badolato (individual, empty image); Shawna Sinks / Laura Showalter Roberts / Christine Kline (individuals, empty images); Tacos TwoDay (Delta taco food account, empty image, food, out of segment); Mariann Taigman (retired individual) share link cross-posted Orchard Mesa + Living In GJ. None are home-service trade promos.
- **Coldiron's Creations and Property Service F1 SENT**: route assessment — CDP :9223 alive (Chrome 153, Facebook session logged in, tabs facebook.com/home.php + group permalink); facebook-cli Messenger CLI still non-contact (hard tool constraint); Coldiron's Page has a Message button (message_buttons_found=1). playwright-core was absent from the Pig (post-outage), installed fresh via npm.cmd into C:/Users/nolan/pig-fb-run (exec policy blocks npm.ps1). send-dm.js variant (send-dm-coldiron.js, PAGE_URL=facebook.com/creative.property.service.2024) run on the Pig Windows node: text inserted len=547, verify_sent_text_visible=true, screenshot dm-coldiron-1789871507217.png. Sent ~20:30 MDT, first follow-up touch, fresh trigger = fall leaf-season re-promo posted Delta 2026-09-19 11:21 MDT (1804972344261137); parked since 2026-09-12 due to blocked DM channel. F2 eligible 2026-09-26 to 2026-10-03 with a NEW angle.
- **Legacy Furniture LLC** (round-93 NEW, phone-route): still parked; no Message-button verification attempted this round (scan was CDP-health-first; F1 DM send took the slot). Status stays NEW/parked per Facebook-first protocol.
- **Jack Of All Junction LLC** (DM SENT 2026-09-16): F1 window opens 2026-09-20 (tomorrow). FLAG ONLY, no send today.
- facebook-cli cloud session healthy (me = Nolan Geske, no auth errors). DM daily count: 1/10 (Coldiron's F1 only). New watermark: 1789870052 (2026-09-19 20:07 MDT). Report: fb-discovery-2026-09-19-2030-sectionA.md. Raw scratch: /tmp/scan95/.

## Delta-scan #96 (2026-09-19 14:20 - 23:15 MDT window, round 96, facebook-cli read-only route)

- 199 posts fetched across 10 groups (WCMB, Buy & Sell GJ, Delta, Orchard Mesa, Fruita, Living In GJ, Colorado Business Networking, Colorado Business Mingle, Palisade, Glenwood Springs), filtered locally on creation_time >= 1789849209 (82 in-window). --min-timestamp not used per round-88/90 unreliability finding.
- All trade promos resolved to Denver-metro (Bright Ocean LLC cleaning services, Denver; Ray Sample epoxy countertops, Castle Rock; YESA Window Tinting, Aurora) or unresolvable-location/segment (Tomahawk Transporters LLC hauling; Whip and weave fabrications, LLC). 0 new Western Colorado prospects. 0 new-business radar hits. 0 complaint/demand signals.
- Salinas Farmfixit (Fruita, posted ~19:07 MDT) appeared in-window but was already added to pipeline.md as NEW by round 95; dedupe clean, no re-add.
- Legacy Furniture LLC (round-93 parked WARM DM draft): Page Message-button verification attempted Pig-side via CDP this round. Outcome recorded below.
- DM daily count: no DM sends attempted this round yet (cap 10). New watermark: 1789881339 (2026-09-19 ~23:15 MDT). Report: facebook-scan-round96.md.

## Legacy Furniture LLC — Pig-side Page Message-button verification (round 96, 2026-09-19 ~23:30 MDT)

- Pig route note: Pig's WSL cannot reach the Windows Chrome CDP (ECONNREFUSED localhost:9223 from WSL2); Windows-side shell (pig-ssh.sh, cmd.exe) reaches CDP at 127.0.0.1:9223 (Chrome 153). Node is not on the Windows PATH; portable node at C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe with NODE_PATH=C:\Users\nolan\node_modules (playwright-core there). Script: pig-fb/check-legacy-page.js (read-only, never clicks).
- Result: Page identity CONFIRMED (Legacy Furniture LLC, 579 1/2 N Commercial Dr, Grand Junction, furniture store, 2.2K followers, "Rainy week in Western Colorado" showroom post matches round-93 sighting). **hasMessageButton: false** — page action buttons are Call now / Follow / Search this Page only.
- Decision per Facebook-first protocol: DM route is DEAD for Legacy Furniture LLC. The round-93 parked DM draft is unusable. Rerouted to phone-route (WARM, owner-led custom shop, showroom hours Wed-Sat 9-6, Sun 12-5, Mon-Tue by appointment; makers in shop not answering inquiries). Own site legacyfurniture.llc (verified live 2026-09-19) publishes phone (970) 250-4448 but NO email, so no email draft eligible either. Email legacyfurniturellc@outlook.com appears only on the third-party Open Market listing, not own-site — not recordable per contact rule.

## Delta-scan #97 (2026-09-19 23:15 - 2026-09-20 02:15 MDT window, round 97, facebook-cli read-only route)

- 20 in-window posts (creation_time > 1789881339) across 6 groups; 5 of 6 groups had 0 new posts above watermark. All 20 Buy & Sell GJ posts are resale listings (furniture, decor, blender, one joke/spam post). 0 new genuine home-service prospects. No author identification needed. No DMs sent, none parked.
- New watermark: 1789888188 (2026-09-20 01:09 MDT). Report: facebook-scan-round97.md.
- Note: Saturday-night ~11pm-2am window is naturally quiet; zero-activity is expected, not a signal.

## Round 98 (2026-09-20 ~05:20 MDT; read-only delta scan, no sends)
- 3 in-window posts (creation_time > 1789888188) across the 6 WCO groups: Orchard Mesa 1 (shared video, non-business commentary), Fruita 2 (scenic Sunday photo, goose-egg prank request near Loma). 0 genuine home-service business signals. No author identification needed, no DMs sent, none parked.
- facebook-cli group posts read-only path stable (--min-timestamp 1789888188 worked, boundary correctly excluded). DM daily count: 0/10. Cloud session healthy.
- New watermark: 1789901322 (2026-09-20 04:48 MDT). Report: facebook-scan-round98.md.

## Round 99 (2026-09-20 ~08:20 MDT; read-only delta scan, no sends)
- 19 in-window posts (creation_time > 1789901322) across the 6 WCO groups: WCMB 3 (sourdough stand promo, purple heart plants resale, empty caption) | Buy & Sell GJ 8 (personal resale: mower, springer front end, tires, wheels, plants; sourdough stand x3) | Delta 0 | Orchard Mesa 2 (sourdough stand cross-post, empty caption) | Fruita 5 (sourdough stand x2, VanWinkle Ranch nature share, lost-pets help post, empty caption) | Living In GJ 1 (VanWinkle Ranch nature share).
- 0 genuine home-service business signals. 0 new-business radar hits. 0 new prospects added to pipeline.md.
- Doughbra's Stand (sourdough cottage-food, Cassi RossGeske, 3101 Applewood St GJ; 7 cross-posts across WCMB/Buy & Sell GJ/Fruita/Orchard Mesa) is a genuine small business but cottage food, out of trade segment; logged as out-of-trade sighting only. VanWinkle Ranch nature shares (LivingGJ + Fruita) are lifestyle content, not a trade promo.
- Empty-caption lookups via social.search post_url: Fruita 4472441413029635 = Susan Rawlins (retired individual, no media, non-business); Orchard Mesa 1111239381853277 = Ellis Hovey (Page-scoped ID, empty caption, thumbnail only, unresolvable content, logged without guessing); WCMB 28549332308038972 = Cassi RossGeske Doughbra's Stand sourdough carousel (same cottage-food promo).
- No author lookups needed for resale posts. No DM sends, none attempted, none parked. DM daily count: 0/10. facebook-cli cloud session healthy (me = Nolan Geske, no auth errors).
- New watermark: 1789913519 (2026-09-20 08:11 MDT). Report: facebook-scan-round99.md. Raw scratch: /tmp/scan99/.

## Round 100 (2026-09-20 08:11 - ~11:20 MDT window; read-only delta scan, no sends)
- 200 posts fetched across 10 groups (20/group), filtered locally on creation_time > watermark 1789913519 (68 in-window). Groups: WCMB 4 | Buy & Sell GJ 20 (all in-window; resale-heavy) | Delta 6 | Orchard Mesa 3 | Fruita 16 | Living In GJ 5 | CO Business Networking 11 | CO Business Mingle 2 | Palisade 1 | Glenwood Springs 0.
- 1 new prospect, added to pipeline.md as NEW (dedupe 0 hits across leads.md, pipeline.md, facebook-dms.md, western-co-business-owner-list.csv):
  - **Rough Idle Diagnostics** (Jacob Land, handle Dammitjake91, author_id 100087768015631, bio "Mechanic | Business Owner") | automotive diagnostics + selected repairs | Grand Junction area (posted Buy & Sell GJ + Fruita; 970 phone) | phone 970-589-1986 (post-published call/text) | author resolved via social.search post_url | Post: https://facebook.com/groups/108728816001912/permalink/3417093098498784/ (cross-post Fruita 4472668886340221, 2026-09-20 ~09:50 MDT) | Opportunity: MISSED_CALL_LEAD_CAPTURE (one-person shop; intake by call/text; missed call = lost job) | WARM (source=facebook-dms round 100) | Status NEW, DM parked per Facebook-first protocol (Pig-side Message-button verification required; Messenger CLI non-contact hard block).
- Out-of-corridor trade sightings (intel only, NOT added per 2026-09-20 corridor targeting): Avalanche Tree Service 719-644-4931 (Dustin Bardill, COBizNet; 719 = Colorado Springs area) | Garage Door Up and Over $79 lube-and-tune special, 720-549-9692 (Denver metro) | Bradford Weddings & Events pumpkin porch styling, NoCo/Denver (972-940-2912).
- Demand signal (intel only): Fruita 10:36 MDT ISO pellet stove repair (someone looking for a repair tech, not a business).
- Empty-caption lookups (14 via social.search post_url): Toastique CO Springs x2 (food) | Cabin Escape Room cross-post (entertainment) | Duane Taylor (individual, unresolvable) | Jennifer Thomas-NextHome Virtual (realtor) | Smokey Bonez BBQ Fruita (food, out of segment) | Happy Dog Pet Grooming Orchard Mesa (pet grooming, out of segment) | Christine Kline, Ashley Rosales, Mariann Taigman (individuals). BuySellGJ (20) and LivingGJ (4) empties skipped by group pattern (personal resale/community), logged without lookup.
- Out-of-segment/out-of-trade sightings: cottage-food vendors (rolls/cookies Jakarlin CT GJ; sourdough Doughbra's) | facial promo (Fruita) | Loaded Tea MLM link | kids side-work (minors) | ice cream/arcade food promo (Delta) | escape room | tutor (Golden) | service-dog info posts | estate-sale question | apartment rental | event/vendor-call promos | AI-agents discussion.
- No new-business radar hits. No complaint/review-triggered signals in groups.
- facebook-cli cloud session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 1 parked draft. DM daily count: 0/10.
- New watermark: 1789924540 (2026-09-20 11:15 MDT). Report: facebook-scan-round100.md. Raw scratch: /tmp/scan100/.

### Parked DM draft (round 100 — NOT sent; read-only run; Pig-side Message-button verification required before any send)

**To: Rough Idle Diagnostics — Jacob Land (Buy & Sell in Grand Junction + Fruita groups, automotive diagnostics, call/text 970-589-1986)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Caught your Rough Idle Diagnostics Halloween post in the Grand Junction group, the check engine light one.
>
> Your whole pitch is finding the problem before the customer throws money at parts, and that first conversation happens by call or text.
>
> When you are under a car, that 970-589-1986 number rings into an empty room and the job goes to whoever answers first.
>
> I help trade businesses answer every call and message instantly so no job ever sits on voicemail, while you stay in charge of the work.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## 2026-09-20 — Round 103 delta scan (read-only; drafts only)

- 1 new in-corridor prospect, added to pipeline.md as NEW (dedupe 0 hits across leads.md, pipeline.md, facebook-dms.md, western-co-business-owner-list.csv):
  - **Elemental Nya Pro Housecleaning** (Nya Wellmann, handle eco.nya4, author_id 100086765595923, bio "Be Love") | housecleaning / residential cleaning | Delta, CO (posted in Delta group; town unverified beyond group) | no phone/email published in post; author resolved via social.search post_url | Post: https://facebook.com/groups/1504277980997243/permalink/1806116490813389/ (2026-09-20 19:10 MDT) | Opportunity: MISSED_CALL_LEAD_CAPTURE (one-person cleaning op, 4 years in business self-stated, actively "seeking new work opportunity"; books by call/DM while on jobs) | WARM (source=facebook, round 103) | Status NEW, DM parked per Facebook-first protocol (Pig-side Message-button verification required; Messenger CLI non-contact hard block).
- Out-of-segment/out-of-trade sightings: makeup brand reseller (Delta) | massage/bodywork therapist -Jay (Delta, "around for a bit") | dog groomer accepting new clients (Fruita, pet service) | travel agent carousel (Terri Tubolino, Delta empty-caption post) | realtor photo burst x6 (Tanette Smith, LivingGJ, property photos) | individual photo carousel (JJ Fletcher, Fruita empty-caption post) | Korean corn dog truck at Fruita Silo (food) | Fruita job-seeker post (teenager) | hair stylist rec request (beauty) | community sunset photo.
- Demand signal (intel only): Fruita 20:02 MDT "Looking for someone to do a deep clean on a property tomorrow or Tuesday" (someone hiring a cleaner; matches Elemental Nya's trade but no business named; intel only).
- Buy & Sell GJ (20 in-window): all personal resale (tool lot, Ford Explorer, washer/dryer, fridge, mower, dresser, toys, etc.), no business promos.
- Empty-caption lookups (4 via social.search post_url): Nya Wellmann (Elemental Nya Pro Housecleaning, business, added) | Terri Tubolino (travel agent, out of segment) | Tanette Smith (realtor, out of segment) | JJ Fletcher (individual, skipped). Remaining empties (LivingGJ x5 more, Fruita x2) skipped by pattern (same photo bursts / community groups; prior rounds resolved the same pattern to individuals).
- No new-business radar hits (no grand opening / now open posts). No review-triggered signals in groups.
- facebook-cli session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 1 parked draft. DM daily count: 0/10.
- New watermark: 1789956820 (2026-09-20 20:13 MDT). Report: facebook-scan-round103.md. Raw JSON: /tmp/fb103_<groupid>.json.

### Parked DM draft (round 103 — NOT sent; read-only run; Pig-side Message-button verification required before any send)

**To: Elemental Nya Pro Housecleaning — Nya Wellmann (Delta group, housecleaning, 4 years in business)**
> Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
>
> I'm an AI reaching out on behalf of PING Social.
>
> Caught your post in the Delta group: four years in business and looking for new work.
>
> Cleaning is one of those trades where every new job comes through a call or a message, and those calls come in while you are mid-clean with gloves on.
>
> I help trade businesses answer every call and message instantly so no booking ever sits on voicemail, while you stay in charge of the work.
>
> Worth a quick chat?
>
> PING Social, (970) 589-3309.
>
> You can see what we do here: https://www.facebook.com/profile.php?id=61594275542163

## 2026-09-20 — Round 104 delta scan (read-only; drafts only)

- 0 new in-corridor prospects (17 in-window posts reviewed; none were home-service business promos).
- Out-of-segment sightings: brow-tint model call (Fruita, Instagram @sagebloomgj, beauty) | Waste Management reachability complaint (Fruita, national corp, chain, intel only) | Sunshine Community Open Market vendor call (LivingGJ, community event Sat Sept 26 at 1321 Ute Avenue, not a trade business) | cattle roundup story, news share, dance-studio post, fall-colors photo (Fruita, community).
- Buy & Sell GJ (10 in-window): all personal resale (Volvo S80, Gulfstream boat, electric stove, Nissan Pathfinder, Pokemon cards, glider, animatronic, engine block, play laundry set, Chevelle axle), no business promos.
- Delta and Orchard Mesa and Western CO Message Board: 0 in-window posts.
- No new-business radar hits. No review-triggered signals in groups. No repeat sightings of pipeline businesses.
- facebook-cli session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 0 parked drafts. DM daily count: 0/10.
- New watermark: 1789967765 (2026-09-20 23:16 MDT). Report: facebook-scan-round104.md. Raw JSON: ~/workspace/outreach/scratch/scan104-<groupid>.json.

## 2026-09-21 — Round 106 delta scan (read-only; drafts only)

- Watermark in: 1789967765 (2026-09-20 23:16 MDT). 6 in-window posts reviewed across 6 groups.
- 0 new genuine home-service prospects. Post breakdown:
  - Fruita 04:45: empty-caption shared photo post by KaraLee Boudreaux (personal profile, follower count 1; social.search post_url lookup; no business content) — ignore.
  - Fruita 00:36: Rides Bar & Grill Fall Festival week promo, posted by the Rides Bar & Grill Page itself (152 S Mesa Street, Fruita; 621 followers) — restaurant, previously logged non-prospect (out of trade).
  - Fruita 00:07: lost pet ("My Gracie is missing from Country Village") — personal.
  - Fruita 23:31: spay/neuter PSA — personal/cause.
  - Buy & Sell GJ 02:12: "Ofertas relampago $160" sale post — resale.
  - Buy & Sell GJ 23:47: lighted display case/vanity sale ($100, Mack/GJ) — resale.
- No new-business radar hits (no grand opening / now open posts). No review-triggered signals in groups. No repeat sightings of pipeline businesses.
- facebook-cli session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 0 parked drafts. DM daily count: 0/10.
- New watermark: 1789987541 (2026-09-21 04:45 MDT). Report: facebook-scan-round106.md. Raw JSON: ~/workspace/outreach/scratch/scan106-<groupid>.json.

## 2026-09-21 — Round 107 delta scan (read-only; drafts only)

- Watermark in: 1789987541 (2026-09-21 04:45 MDT). Watermark out: 1790000310 (2026-09-21 08:18:30 MDT).
- 36 in-window posts reviewed across 6 groups. 1 new genuine home-service prospect.
- NEW: Caidan White — excavation / grading / land clearing (Buy & Sell in Grand Junction, posted 08:10 MDT). Post: quality grading, excavation, land clearing, "dependable service from start to finish", call/text 720-686-1711 for FREE estimate. Author via social.search post_url: personal profile caidan.white.7 (208 followers), NOT a business Page. Phone 720-686-1711 published in post; WCO service location UNVERIFIED (720 = Denver-area code). Added to pipeline.md as NEW / WATCH with geography-verification caveat. DM parked (personal profile, no business Page, Messenger-contact status unchecked).
- Assessed, not prospects: Taylor Lyndsey (Delta, "room for a few clients" carousel, no trade identifiable, skip); cross-posted "please read and share" fundraiser pattern in 4 groups (not a trade business); Blessed Harvest Homestead farm-stand promo (retail, out of segment); Waste Management reachability complaint (already logged round 104); mobile-mechanic request (automotive, out of segment); remainder personal resale/pets/events/photos.
- No new-business radar hits. No review-triggered signals. No repeat sightings of pipeline businesses.
- facebook-cli session healthy. 0 DMs sent, 0 attempted, 1 parked draft. DM daily count: 0/10.
- Report: facebook-scan-round107.md.

## 2026-09-21 — Round 108 delta scan (read-only; drafts only)

- Watermark in: 1790000310 (2026-09-21 08:18:30 MDT). Watermark out: 1790011255 (2026-09-21 11:20:55 MDT).
- 49 in-window posts reviewed across 6 groups. 2 new genuine home-service prospects.
- NEW: Mike Woodhams — mini excavator and dump trailer for hire (Buy & Sell in Grand Junction, posted 10:47 MDT). Services: site cleanup, irrigation, trenching, water/sewer, material hauling, rock/gravel, trail building/maintenance, firewood hauling. Author via social.search post_url: personal profile mike.woodhams.52 (1 follower), NOT a business Page. No phone published (PM-only). Added to pipeline.md as NEW / WATCH with phone-route-unavailable caveat. DM parked (personal profile, no Messenger-contact route verifiable).
- NEW: Unique Solutions Handyman and Remodeling LLC — fencing and outdoor projects (Living In Grand Junction Colorado, posted 10:02 MDT). Post promotes the business Page with phone 972-269-3449 (Dallas-area code; WCO service location UNVERIFIED). Posted by Dennis Roop (personal profile dennis.roop.3, 175 followers); author affiliation with the business UNVERIFIED. Added to pipeline.md as NEW / WATCH with geography/author-affiliation caveats. DM parked; rerouted via published phone through the normal pipeline.
- Assessed, not prospects: Bobby Schenck repeat sighting (Fruita tree one-liner, same ambiguous pattern as the round 103 log, no business name, no phone); The Tint Shop & AutoDetailing 360 recruiting post (B2B recruiting, not a customer promo); mini excavator/dumper bundle resale ($10,000, 81425); Delta quick-book-classes ask and the "please read and share" cross-post pattern; remainder personal resale/pets/events/photos.
- Dedupe: Caidan White (round 107) NOT re-sighted; no pipeline re-add. Bobby Schenck handle matched the prior facebook-dms.md assessment (not prospect-grade), no re-add. Mike Woodhams and Unique Solutions dedupe-clean against leads.md, pipeline.md, JSONL.
- Signals: no new-business radar hits, no review-triggered signals, no repeat sightings of pipeline businesses.
- 0 DMs sent, 0 attempted, 2 parked (Mike Woodhams, Unique Solutions). DM daily count: 0/10.
- facebook-cli session healthy. Report: facebook-scan-round108.md.

## 2026-09-21 — Round 109 delta scan (read-only; drafts only)

- Watermark in: 1790011255 (2026-09-21 11:20:55 MDT). Watermark out: 1790021672 (2026-09-21 14:14:32 MDT).
- 49 in-window posts reviewed across 6 groups. 0 new genuine home-service prospects.
- REPEAT SIGHTING (vitality only): Scott Rush — dad-and-son junk hauling pickup service, new promo post in Living In Grand Junction 3441410786047859 (18:01 MDT, author scott.rush.7 via social.search post_url, text-to 970-778-1219); already leads.md + pipeline.md NEW/WARM (round 52). No duplicate row created.
- VITALITY SIGNAL on existing pipeline row: Travis Lusher (Lusher Tree Services, Montrose, WATCH, phone-route) hiring day labor for a big Wednesday Fruita tree job ($25/hr cleanup work; post 4473767992896977, 9 comments, 8 likes; author personal profile Travis Lusher via social.search post_url, no business name/phone in post). Hiring/growth signal on the existing WATCH row; no new row created.
- Assessed, not prospects: Interior Detailing & Oil Changes (automotive); Warrior Tree Counseling LLC (therapy); ISO electrician post (customer-side request; demand signal only: GFI outlet replacement, 6bed/4bath Fruita, work end of October, text 701390202); trial-class fitness promo; Little Park Ranch short-term rental; real-estate listing; mechanic housing ask; 5 photo-only empty posts (unassessable); remainder personal resale, lost pet, events, causes.
- Dedupe: Scott Rush matched prior facebook-dms.md assessment (pipeline NEW/WARM), no re-add. Travis Lusher matched pipeline.md Lusher Tree Services (Montrose, WATCH), no new row. No pipeline rows added this round.
- Signals: no new new-business radar hits, no review-triggered signals in groups. No repeat sightings of other pipeline businesses.
- 0 DMs sent, 0 attempted, 0 parked (0 new parked drafts; the only parked drafts remain Scott Rush plus the round-108 pair Mike Woodhams / Unique Solutions Handyman and Remodeling LLC). DM daily count: 0/10.
- facebook-cli session healthy (all 6 queries exit 0, min-timestamp delta filter clean). Report: facebook-scan-round109.md.

## FB delta-scan #110 (2026-09-21 14:14 → 17:13 MDT)
- 120 posts fetched across the 6 Western Colorado groups (20/group, NEW_POSTS), filtered locally on creation_time > watermark 1790021672 (45 in-window; 75 pre-window fetched, not double-counted; --min-timestamp not used per round-88/90 unreliability finding). WCMB 4 (dealer Silverado listing, snow-plow resale, clay-set resale, bare-URL post "Secondtimeco.com") | Buy & Sell GJ 20 (all personal resale: rug, wood box, wood table, cruiser, suitcase, lab incubators, decanter set, Nike shoes x3, flower stand, 1998 Pathfinder, estate-sale fundraiser Sept 25-26, baby swing, freeze dryer, chef decor, 5th-wheel hitch, desk/chair, 1 empty, farmhouse decor) | Delta 3 (service-dog awareness post, 2 empty captions) | Orchard Mesa 2 (Sarahdipity Hair Designs promo, 1 empty) | Fruita 15 (ISO ride to Canvas, Famous Dave's closure chatter [52 comments], ISO chalk painter, ISO tree-branch cutdown [11 comments, tree-service demand], 5 empty/image-only, Sarahdipity cross-post, ISO photographer mini sessions [24 comments], dog poem, artwork donation, ambiguous thank-you post) | Living In GJ 1 (Paonia annual-tradition post).
- 2 business-post deep dives (authors via social.search post_url): (1) "Secondtimeco.com" WCMB post by Jeffrey Grant (jeffrey.grant.988, farmer bio) — bare URL, no business detail → SKIP, unverifiable, no signal. (2) Sarahdipity Hair Designs Tuesday-haircut-special promo (cross-posted Orchard Mesa + Fruita) by Sarah Clark (sarah.clark.593659), tagged Page 100063706295978, phone 970-434-4742 published — hair salon, out of home-service/blue-collar trade → SKIP (round-57 Sweets N Treats precedent). Neither tracked in leads.md, pipeline.md, or facebook-dms.md (all three grepped); reviewed, not added.
- Market signals (UNVERIFIED social chatter, not confirmed facts): Fruita Famous Dave's closure reported by a local commenter; Fruita tree-service demand (ISO branch cutdown); photographer demand (ISO Mesa mini sessions). Recorded in facebook-scan-round110.md.
- 0 new prospects, 0 repeat sightings/vitality notes, 0 new-business radar hits, 0 review/complaint threads. No pipeline.md rows added.
- 0 DMs sent, 0 attempted, 0 parked (Messenger CLI not on this host; DM path Pig-only and parked). 0 reroutes.
- New watermark: 1790032426 (2026-09-21 17:13:00 MDT). Report: facebook-scan-round110.md. Raw scratch: /tmp/scan110-<groupid>.json.

## FB delta-scan #111 (2026-09-21 17:13 → 20:18 MDT)
- 120 posts fetched across the 6 Western Colorado groups (20/group, NEW_POSTS), --min-timestamp 1790032426 server-side delta (33 in-window; correctness verified against WCMB newest pre-window post 17:04:39 MDT). WCMB 0 | Buy & Sell GJ 20 (resale-heavy: bottle warmer, Broncos tickets, suitcase, baby gear, serger, John Deere disc harrow, Nike shoes, DJ controller, kegerator, ATV, 2004 Ford F-150, 1 empty share; ONE trade promo) | Delta 2 (2 shares) | Orchard Mesa 1 (share) | Fruita 8 (ISO leather-work demand, Good News Club school post, land-code civic post, viral share 14c/59r, Peer 180 recovery-org share, Dare to Dream riding-lessons share, 2 empty/unresolvable) | Living In GJ 2 (paddleboard invite, 1 share).
- NEW SIGHTING, not added: Necko LaVato (personal profile) — property cleanup + dump runs promo, Buy & Sell GJ 20:12 MDT ("trying to group together a couple loads to save everyone some money. Message me or let me know what you need cleaned up and we can make a deal for sure."). Junk-haul trade fit, GJ area. Deduped clean across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl. No phone/email published (post says "Message me" only) → fails pipeline quality bar. Messenger contacts search ("Necko", "LaVato") 0 hits, no existing thread → DM BLOCKED by CLI contact constraint, no reroute channel. Logged as sighting only; add if re-sighted with published contact info.
- Demand signals (intel, not prospects): Kaitlyn Lawson ISO custom leather work + detailed tooling, Western Slope (Fruita, 17:43 MDT).
- 0 new-business radar hits, 0 repeat sightings of pipeline businesses, 0 review/complaint threads. 0 prospects added to pipeline.md.
- 0 DMs sent, 0 attempted, 0 parked, 0 reroutes. DM daily count: 0/10.
- Infra note: facebook-cli is NOT installed on Pig WSL (command not found via pigwsl-run.sh); scan ran on the cloud-session facebook-cli (healthy, me = Nolan Geske). Pig bridge SSH round-trip verified working. Also flagging: the round-110 facebook-dms.md entry references facebook-scan-round110.md, but that file does not exist in hidden_files/ (minor reporting gap, no data lost).
- New watermark: 1790043508 (2026-09-21 20:18 MDT). Report: facebook-scan-round111.md.

## FB delta-scan #112 (2026-09-21 20:18 → 22:54 MDT)
- 120 posts fetched across the 6 Western Colorado groups (20/group, NEW_POSTS), filtered locally on creation_time > watermark 1790043508 (33 in-window; --min-timestamp not used per round-88/90 unreliability finding). WCMB 1 (personal ISO Easter eggs 81504) | Buy & Sell GJ 20 (all personal resale: lightning deal, hutch, youth bed, bar stools, iPhone 14, bookcase, books, 2 nightstands, 2 Disney VHS, wedding dresses, mini excavator H15R 81425, Ian Munsick tickets, prefab countertop 81520, Apple cords, iPhone 14 Pro, French doors, couch, hooded towels) | Delta 0 | Orchard Mesa 0 | Fruita 5 (missing cat, ISO local newspaper, **Burciaga Landscaping promo**, **handyman promo**, sunset photo) | Living In GJ 7 (4 empty-caption, price-drop resale, Desert Bloom Gardening plant bingo event, 1 empty).
- 1 NEW PROSPECT, added to pipeline.md NEW: **Burciaga Landscaping / Reliable Handyman Western Slope** — Oziel B Dears (personal profile 100089636242361); two promo posts in Fruita group 21:03 + 21:07 MDT (handyman + landscaping flyers, same operator, same phone). Phone 970-712-4352 published in both posts (call-or-text for free estimate/quote). Serves Fruita, Grand Junction, Clifton, Palisade, Redlands, Orchard Mesa. Opportunity MISSED_CALL_LEAD_CAPTURE (high; phone/text-only intake, owner in field). Dedup clean (leads.md, pipeline.md, facebook-dms.md all three grepped; round-106 rule). DM BLOCKED (Messenger CLI not on this host; DM path Pig-only and parked) → REROUTED via published phone 970-712-4352, pipeline row added phone-route, status NEW. Posts: https://facebook.com/groups/3741333852807065/permalink/4474115179528925/ and https://facebook.com/groups/3741333852807065/permalink/4474118022861974/
- Assessed, not added: (1) Desert Bloom Gardening & Hydroponics (Living In GJ, business Page 61551020962628, plant BINGO event Oct 18 445 Pitkin Ave GJ) → SKIP, out of home-service trade (round-57 precedent). (2) Mini Excavator H15R $4,500 (Buy & Sell GJ, Dayday Vargas, 81425 Cedaredge) → SKIP, personal equipment resale, out of corridor. (3) Tacua Amp prefab countertop $123 (81520 Clifton) with "if you need fab and install, i can give you a quote" → logged as weak sighting only (no business name/phone; fails quality bar; add on re-sight with verifiable identity).
- 0 new-business radar hits, 0 repeat sightings of pipeline businesses, 0 review/complaint threads.
- 0 DMs sent, 0 attempted, 0 parked, 1 reroute (Burciaga phone-route). DM daily count: 0/10.
- facebook-cli session healthy. Report: facebook-scan-round112.md.
- New watermark: 1790052866 (2026-09-21 22:54:26 MDT).

## FB delta-scan #113 (2026-09-21 22:54 → 2026-09-22 02:20 MDT)
- 120 posts fetched across the 6 Western Colorado groups (20/group, NEW_POSTS), filtered locally on creation_time > watermark 1790052866 (3 in-window; --min-timestamp not used per round-88/90 unreliability finding). WCMB 0 | Buy & Sell GJ 2 (personal resale: surround sound $200, Broncos season tickets Rams 9/27 + Chiefs 11/1) | Delta 0 | Orchard Mesa 0 | Fruita 0 | Living In GJ 1 (textless entshare media share by Ray Mathis, post read confirmed 0 comments/0 reactions).
- 0 genuine business signals, 0 author-identification needed, 0 new-business radar hits, 0 ISO/demand posts, 0 review/complaint threads, 0 repeat sightings of pipeline businesses.
- Dedupe: nothing qualified, no grep against leads.md / pipeline.md / facebook-dms.md / western-co-prospects.jsonl required. No pipeline.md rows added.
- 0 DMs sent, 0 attempted, 0 parked (read-only scan; Messenger CLI not on this host, DM path Pig-only and parked). DM daily count: 0/10.
- New watermark: 1790058601 (2026-09-22 00:30:01 MDT). Report: facebook-scan-round113.md. Raw scratch: /tmp/scan113-<groupid>.json.

## FB delta-scan #114 (2026-09-22 00:30 → 05:20 MDT)
- 120 posts fetched across the 6 Western Colorado groups (20/group, NEW_POSTS), filtered locally on creation_time > watermark 1790058601 (5 in-window; --min-timestamp not used per round-88/90 unreliability finding). WCMB 0 | Buy & Sell GJ 2 (personal resale: leather purse $30 81501, 2012 Ford F150 $5,500 Parachute) | Delta 0 | Orchard Mesa 0 | Fruita 3 (empty textless share, bare Amazon link, minister's book announcement — none business) | Living In GJ 0.
- 0 genuine business signals, 0 author-identification needed, 0 new-business radar hits, 0 ISO/demand posts, 0 review/complaint threads, 0 repeat sightings of pipeline businesses.
- Dedupe: nothing qualified, no grep against leads.md / pipeline.md / facebook-dms.md / western-co-prospects.jsonl required. No pipeline.md rows added.
- 0 DMs sent, 0 attempted, 0 parked (read-only scan; Messenger CLI not on this host, DM path Pig-only and parked). DM daily count: 0/10.
- Infra: facebook-cli still absent on Pig WSL (which facebook-cli exit 1 via pigwsl-run.sh); scan ran on the local cloud-session facebook-cli per the established round-111/112 path.
- New watermark: 1790073856 (2026-09-22 04:44:16 MDT). Report: facebook-scan-round114.md. Raw scratch: ~/workspace/outreach/scratch/scan114-<groupid>.json.

## FB delta-scan #115 (2026-09-22 06:30 → 08:20 MDT)

- 200 posts fetched across 10 Western Colorado / Denver-area groups (20/group), filtered locally on creation_time > watermark 1790073856 (40 in-window; scan watermark from scan #114).
- 0 Western Colorado trade promos in-window. 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only scan; Messenger CLI not on this host, DM path Pig-only).
- New signals: 1 repeat (Applewood Painting, already queued, no action); delta demand signal: homeowner seeking tumbleweed/weed removal.
- 5 new business signals logged to pipeline.md: Jurassic Junk Colorado (Denver, PARKED geography), Lujan Landscaping LLC (Denver metro, PARKED), Summit Window Solutions (uncertain geography, surfaced Denver group, PARKED), Serenity Cleaning Solutions LLC (Denver-area context, PARKED), Cozy Companions (Grand Junction, NEW, weak trade fit).
- New watermark: 1790086503. Report: facebook-scan-round115.md.

## FB delta-scan #116 (2026-09-22 08:15 → 11:25 MDT)

- 200 posts fetched across 10 Western Colorado / Denver-area groups (20/group), filtered locally on creation_time > watermark 1790086503 (79 in-window; scan watermark from scan #115).
- 1 new trade prospect logged to pipeline.md: Farmer Home Inspections LLC (CO Business Networking, posted 10:50 MDT by Brennan Farmer; business Page id 61578100306379, Page Message button route Pig-only; trade fit confirmed, signal thin, WATCH).
- 1 parked trade promo: Dude and a Mower LLC (Glenwood group; lawn care / aeration Oct 2-4 campaign; Battlement Mesa / Parachute / Rifle service area; beyond-corridor, PARKED, do not re-propose).
- 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only scan; Messenger CLI present+connected this round but no synced contact for Farmer, hard CLI constraint blocked any send; DM path remains Pig-only).
- New watermark: 1790097207 (2026-09-22 11:13:24 MDT, max creation_time observed across all 10 groups). Report: facebook-scan-round116.md.

### DM send checks (round 116)
- Farmer Home Inspections LLC (Brennan Farmer): SKIP SEND — recipient does not resolve via synced Messenger contacts (hatch_messenger_cli contacts --search "Farmer" returned 0 results; no existing thread). Hard CLI constraint blocks the send; no override. REROUTE: no phone/email published in the post; contact route is the business Page Message button (Farmer Home Inspections LLC, Page id 61578100306379) — Pig-only path, parked for parent. No DM copy drafted (read-only lane; copy drafted at send time by the sending agent).
- Dude and a Mower, LLC: PARKED (beyond corridor), not DM-eligible consideration.

## FB delta-scan #117 (2026-09-22 11:13 → 14:16 MDT)

- 200 posts fetched across 10 Western Colorado / Denver-area groups (20/group), filtered locally on creation_time > watermark 1790097207 (74 in-window; scan watermark from scan #116).
- 0 new genuine prospects. Trade sightings: 5 — The Electric Company Inc (Castle Rock/Denver front range, beyond corridor, PARKED), Memphis Auto Spa (repeat, already ARCHIVED), Falling Star HVAC (repeat, already out-of-geo intel), Kyle Neville Window Coverings + Alex Kaminsky GC (third-party shares, location UNVERIFIED, observed not proposed).
- Demand signal: ISO Laborers!!! (Fruita, Zoey Loya, 11:45 MDT, content-thin, no business name; logged unverified, no prospect identity).
- Grand-opening / new-business radar hits: 0. Review/complaint threads: 0.
- 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only lane; Messenger CLI not on this host, DM path Pig-only).
- New watermark: 1790108175 (2026-09-22 14:16:15 MDT). Report: facebook-scan-round117.md.

## FB delta-scan #119 (2026-09-22 17:14 → 20:18 MDT)

- 69 posts fetched across 6 Western Colorado groups, paginated until pre-window reached (66 in-window, min-timestamp 1790118882). WCMB 4 | Buy & Sell GJ 42 (personal resale) | Delta 1 | Orchard Mesa 0 | Fruita 18 (weather/community chatter) | Living In GJ 1 (craft-fair vendor call).
- REPEAT SIGHTING + ENRICHMENT (no new row; existing pipeline NEW enriched in place, line under "Facebook (round 69 NEW)"): **Keisha Crawford / Your House Will Sparkle (house cleaning, Montrose)** — repeat promo 17:18 MDT in WCMB (Tim Criss profile 100001075122752 posting on her behalf; same operator as round-69 Delta post; seeking 6+ clients). NEW INTEL: published phone (435) 226-3518 in flyer image (call or text; Utah area code matches relocation origin), flyer pricing 2bd/1ba $75/cleaning, website yourhousewillsparkle.weebly.com (OCR-read from flyer, unverified). Web verification: Giftly listing confirms "Your House Will Sparkle" home-cleaning, Salt Lake City UT, established 2016, third-generation cleaner story — relocation narrative checks out. WARM, MISSED_CALL_LEAD_CAPTURE (medium-high). PHONE ROUTE now available; DM route not verified (engagement Pig-only). Posts: https://facebook.com/groups/5456977881034408/permalink/28583664764605726/ (round-119) and https://facebook.com/groups/1504277980997243/permalink/1802414724516899/ (round-69).
- Non-prospect signals logged: informal tamale food vendor promo (Fruita 18:48, not home-service trade); Explore Mesa County link-hub/CDOT-feed promos x2 (WCMB 19:36/19:40, local media project not a trade — noted as possible PING marketing channel); Career Center craft-fair vendor call (Living In GJ 19:53, phone 970-254-6000, community announcement); Fruita sewage-smell complaint thread (S. Mesa St, community/utility issue); Fruita irrigation-line pooling post (Monument Glen, consumer problem); storage-unit break-in rant x2 (Fruita + B&S GJ, crime signal).
- 5 unresolvable empty-caption posts, 0 comments each, authors stripped (Fruita 4475074996099610, 4475098152763961, 4475133956093714, 4475161549424288, 4475167936090316). Logged without guessing per hard rule.
- Grand-opening / new-business radar hits: 0 new; closest = Your House Will Sparkle relocation (new-to-market, already pipeline).
- Review/complaint threads about trades: 0.
- 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only lane; Messenger CLI not on this host, DM path Pig-only).
- New watermark: 1790129908 (2026-09-22 20:18:28 MDT; max in-window post 1790129663 20:14).

## FB delta-scan #121 (2026-09-22 23:09 → 2026-09-23 00:08 MDT)

- 118 posts fetched across 6 Western Colorado groups, 7 in-window. Window short (~59 min).
- REPEAT SIGHTING + ENRICHMENT (no new row; existing pipeline NEW row enriched in place, "2nd Time Around Co"): **2nd Time Around Co** (metal roofing & siding supplies + installation, Parachute CO). Active-marketer signal: personal post by Jeffrey Grant to W CO Message Board (23:33) + own Page ("2nd Time Around Co") share into Buy & Sell GJ (00:08), 35 min apart. Flyer: NEW METAL ROOFING & SUPPLIES, EST. 2011, Parachute CO, homeowners + contractors, custom cut, fast free quote, installation on request, phone 970-216-6905, Secondtimeco.com. Phone-route; DM still parked (recipient not in Messenger contacts; Page Message button unverified this turn). Post: https://facebook.com/groups/5456977881034408/permalink/28587274724244730/
- Dedup note: scan lane flagged it as "1 new genuine prospect"; parent dedupe confirmed DUPLICATE of the 2026-09-10 pipeline NEW row (facebook-dms.md round-10-era entry, pipeline.md line ~603). No duplicate inserted. Lesson: corridor scan lanes must grep the existing FB log before claiming new.
- Non-prospect: 5 personal resale (Buy & Sell GJ), 1 resolved empty share (the roofing flyer share), 0 demand signals, 0 hiring signals, 0 complaint threads, 0 grand-opening hits.
- 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only lane).
- New watermark: 1790143692 (2026-09-23 00:08:12 MDT). Report: facebook-scan-round121.md.

## Round 124 - 2026-09-23 11:20 MDT (Facebook delta-scan #124, read-only lane)
- NEW SERVICE-PROMO SIGHTING, dedupe-CLEAN, NOT STAGED (non-trade + institutional fit): **TCR Spa** (back facial / esthetician services, Delta CO area). Post 09:12 MDT in Delta Colorado Community Message Board (id 1808403993917972): "looking to expand my back facial clientele... DM me or call TCR Spa: (970)-874-6529". Dedupe grep: zero hits for "TCR Spa" or "TCR" in leads.md, pipeline.md, facebook-dms.md (only false positive mci@maysconcrete.com). Verification: web search unresolved as an independent business; TCR strongly matches Technical College of the Rockies (1765 Highway 50, Delta, whose campus runs a salon/spa/barbershop clinic), i.e. a public-institution program, not an independent owner-operated shop; beauty/spa is outside the blue-collar home-service target. NOT staged to pipeline per quality bar (needs clear trade fit or owner-operator signal). Post: https://facebook.com/groups/1504277980997243/permalink/1808403993917972/
- Non-trade promos noted (no pipeline rows): The Barn Boutique fall-items/fashion-show mention (Fruita, retail, ambassador-style post, not the business itself), custom pet-portrait painting promo (artisan, no business name), car-dealership salesperson ad (2019 4Runner, Stock #8555, 970-210-3102, Buy & Sell GJ).
- Classifications this window: 20 personal resale (Buy & Sell GJ: cars, clothing, tools, furniture, yard sale), 2 empty/unknown shares (Delta), 1 community (Mountain Harvest Festival + Colorado Crystal Curio mention, Delta), Fruita: 1 operations notice (Burger King fryer closure), 1 personal sale (eggs), 1 ISO (ground beef), 3 community (best-coffee question, fall colors, rock hounds), rest empty/emoji. Living In GJ: 3 community (real estate tour, KAFM event, Movies Under the Stars).
- 0 demand signals, 0 hiring/growth signals, 0 complaint threads, 0 grand-opening / new-business hits.
- 0 DMs sent, 0 attempted (read-only lane). DM daily count: 0/10.
- New watermark: 1790183857 (2026-09-23 11:17:37 MDT). Report: facebook-scan-round124.md.

## FB delta-scan #126 (2026-09-23 16:26 MDT)

- 60 posts fetched across 6 Western Colorado groups, 52 in-window (ct > 1790191490).
- NEW PROSPECT STAGED: **The Yellow handyman services** (handyman: simple repairs, yard work, maintenance, cleaning, junk removal, plumbing/mechanical repair; Delta/Hotchkiss/Cedaredge/Olathe). Post 12:48 MDT in Delta Colorado Community Message Board (id 1808403993917972): "Serving delta hotchkiss cederage and Olathe ... call me for a rate 25 dollar quote fee unless further then specified areas". Author resolved via social.search: FB business Page "The Yellow handyman services" (id 61593120387860), bio "No job to big or small for the yellow handyman free quotes today". No phone/email in post; Page Message-button check PENDING-BROWSER (CLI profile-info lookup 403'd). Dedupe clean (zero hits for name and page id across leads.md, pipeline.md, facebook-dms.md, canonical JSONL). Pipeline row appended as WATCH (FB Page route only). Post: https://facebook.com/groups/1504277980997243/permalink/1808403993917972/
- REPEAT SIGHTING, no new row: **Scott Rush** (dad-and-son junk hauling startup, GJ, text-to 970-778-1219, pipeline NEW/WARM since round 52): new promo post in Living In GJ (id 3443611159161155, 14:07 MDT), same "trying to start a business" pitch. Vitality signal only.
- Classifications: 2 trade promos, 0 new-business radar hits, 4 personal demand/ISO (dump run, fence posts, cornstalk, RV plot), 0 hiring in-window, 0 complaints, 4 non-trade service promos logged only, 26 personal resale, 10 community/personal, 10 empty/noise. 8 below-watermark API leaks noted, not double-counted.
- 0 DMs sent, 0 attempted (read-only lane). DM daily count: 0/10.
- New watermark: 1790202171 (2026-09-23 16:22:51 MDT). Report: facebook-scan-round126.md.

## Round 128 — 2026-09-23 ~17:15 MDT (FB lane, read-only)

- 0 DMs sent, 0 attempted. DM daily count: 0/10 (read-only lane; Messenger CLI non-contact hard block; DM path Pig-only headed Chrome).
- The Yellow handyman services (Delta, FB Page id 61593120387860, pipeline WATCH): Page Message-button check still PENDING-BROWSER (CLI profile-info 403'd in FB scan #126; Pig lane owns the check). DM route stays parked until the button is observed; no phone/email exists to reroute through.
- Scott Rush repeat promo (Living In GJ, 14:07 MDT) is a vitality signal only; already pipeline NEW/WARM since round 52, no new row.
- No DM-eligible staged prospects this run (bar: Page identity matched + Message button observed + not previously contacted): none met all three.

## Round 131 — 2026-09-24 ~00:30-00:40 MDT (Pig-side DM execution; 2 SENT)

- Pig CDP healthy (Windows-side 127.0.0.1:9223, Chrome 153); deployed parameterized check-page-generic.js + send-dm-generic.js to C:/Users/nolan/pig-fb-run/ via pig_scp. Portable node C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe, NODE_PATH=C:\Users\nolan\node_modules.
- The Yellow handyman services (Page id 61593120387860): Message-button check = PASS. Page identity CONFIRMED (Delta CO, Home Improvement, bio "No job to big or small for the yellow handyman free quotes today", 0 followers, brand-new Page). NEW INTEL: own-Page published phone (970) 394-6902 (was absent from the group post). DM SENT ~00:37 MDT: copy drafts/round131-dm-yellow-handyman.txt (disclosure + AI identity + Delta-group post reference + missed-call angle + PING Social Page link), Pig send-dm-generic.js, send verified (first-line text visible in thread), screenshot C:/Windows/Temp/dm-yellow-handyman-1790230961081.png. Dedupe clean (round-130 leads.md prose only, no contact record). DM daily count 1/10.
- G&R Remodeling LLC (Page id 61550473523720): Message-button check = PASS. Thin-signal caveat RESOLVED: Page identity CONFIRMED (G&R Remodeling LLC, 1205 hwy 50 Delta CO 81416, 94 followers, "all types of home and office Remodeling, interior and exterior..free estimates!!"). NEW INTEL: own-Page phone (970) 892-9497 + own-Page email adrirguezvega@gmail.com. DM SENT ~00:39 MDT: copy drafts/round131-dm-gr-remodeling.txt (disclosure + AI identity + remodel free-estimates reference + inquiry-qualification angle + PING Social Page link), Pig send-dm-generic.js, send verified, screenshot C:/Windows/Temp/dm-gr-remodeling-1790230989889.png. DM daily count 2/10.
- Pipeline rows flipped NEW -> DM SENT with verification evidence (lines 2782, 2810). Both ladders open per standing DM follow-up rules; email/phone fallback routes now on record for both.
- Lesson: the own-Page contact fields (phone/email) are only visible on the live Page render, not in group posts or CLI lookups; the Pig-side verification pass doubles as contact-route enrichment, not just button detection.

## Round 136 — 2026-09-24 ~08:18-08:24 MDT (Pig-side execution; 0 verified SENT, 1 attempt, outcome UNKNOWN)

- Spurlock Immaculate Lawncare-Services (Page id 61588596701556): Message-button check = PASS (Pig check-page-generic.js; Page identity CONFIRMED: "Spurlock Immaculate Lawncare-Services", Entrepreneur, Delta CO, bio "My wife and I make yards look Immaculate for a living", 40 followers, 2024-present lawn care business). NEW INTEL: post-published phone (970) 307-2298 ("call or text for a free estimate") from the clearing-weeds/brush promo.
- DM ATTEMPT OUTCOME UNKNOWN: send-dm-generic.js first attempt — Message button clicked, chat input located, then click-timeout on the textbox (nothing typed, no send). Second attempt — text inserted (len 684), Enter pressed, but thread-verification of the sent text FAILED ("sent but could not verify text in thread"). Screenshot C:/Windows/Temp/spurlock-lawncare2-*.png. FAIL-CLOSED per autonomy law: no retry of an unknown-consequence send. Reconciliation: Messenger Companion sync was down (transport error) this run; NEXT RUN must check the Spurlock thread via Pig-side or Companion before any follow-up ladder starts. Pipeline row stays NEW (not DM SENT), flagged with the unknown-outcome note. DM daily count 3/10 (2 verified SENT round 131 + 1 unknown attempt).
- Infrastructure fix logged to ~/workspace/AGENTS.md: Pig node.exe invocations must use Windows-style script paths (C:/Users/nolan/pig-fb-run/...) not /mnt/c/... (MODULE_NOT_FOUND on the main module itself), and WSLENV=NODE_PATH/p must be exported in the remote bash for NODE_PATH to reach the Windows process (WSL interop drops unlisted env vars).

## Round 137 — 2026-09-24 ~10:20-10:25 MDT (Pig-side thread reconciliation; 0 new sends)

- **Spurlock Immaculate Lawncare-Services RECONCILED as DM SENT.** Round-136's attempt (outcome UNKNOWN: text inserted, Enter pressed, thread verification failed) DID send: new check-dm-thread.js read the live thread and found "Message sent 8:21 AM by You" with the full draft verbatim in the thread plus the "Sent" marker. Timestamp 8:21 AM matches the round-136 attempt window (~08:18-08:24 MDT). NO retry was ever made, so there is zero duplicate-send risk; the fail-closed no-retry rule produced exactly the safe outcome it was designed for. Screenshot C:/Windows/Temp/spurlock-thread2-1790266902016.png. Pipeline row flipped NEW -> DM SENT. DM daily count stays 3/10 (2 verified round-131 + 1 verified round-136). Thread shows NO reply as of the check. DM F1 ladder: window 2026-09-28 to 2026-10-01; no F1 drafted yet.
- Incidental thread-state read from the same scan (chat-dock summaries, no new sends): **G&R Remodeling LLC** DM thread shows "Message sent 12:23 AM by You ... Sent 9h ago", full draft verbatim, no reply. **The Yellow handyman services** DM thread shows "Message sent 12:22 AM by You ... Sent 9h ago", full draft verbatim, no reply. Both round-131 sends stand verified; still awaiting first reply.
- Infrastructure lesson: the first check attempt (spurlock-thread-*) read only the Notifications dialog because `role="dialog"` matched it; the fix is to scan ALL dialogs plus aria-label Message/Chat chat-dock containers. Tool landed at ~/workspace/pig-fb/check-dm-thread.js; standard reconciliation path for any future unknown-outcome DM.
- Messenger Companion sync failed again (transport error), same as round 136; the Pig-side read is now the primary DM reply-check path while Companion is down.
- DM daily count 3/10 for 2026-09-24 UTC. 0 new sends this run (reconciliation only).

## FB delta-scan #127 (2026-09-24 13:21 → 13:29 MDT)
- Window: watermark 1790202171 (2026-09-23 16:22:51 MDT) → new watermark 1790278195 (2026-09-24 13:29:55 MDT; max in-window post ts 1790277911). Report: hidden_files/discovery-scratch/fb-scan-20260924-1321.md.
- Posts scanned in-window: 93 (99 returned, 6 below-watermark Fruita leaks excluded, not double-counted). Classifications: 3 genuine trade promos, all already-tracked prospects (0 new candidates); 0 new-business radar hits; no demand/complaint threads; Fruita tint-and-detailing promo is auto-service (out of trade), tea-business startup non-trade.
- NEW SIGNALS (existing prospects; no DMs sent, no contact invented):
  - High Desert Haulers / Coyote Rolloff Services (junk removal + rolloff dumpster, Montrose/Delta): 2026-09-23 16:47 MDT Delta-group promo by Joshua Bowsher (personal profile joshua.bowsher.9); one post tags BOTH brands (likely same operator, Coyote Rolloff may be the newer brand); published phone 970-901-7956. Active-marketing vitality signal; Page Message-button checks PENDING-BROWSER (CLI profile-info 403 on both Page IDs 61559100902731, 100088807365318; Pig lane owns browser check).
  - Amber's House Cleaning LLC (house cleaning, GJ area): 2026-09-24 06:20 MDT Western Colorado Message Board promo by Amber Pena (amber.pena.5437); holiday-booking urgency push ("Our holiday schedule will fill up quickly... Message us today"); services: home organizing, deep cleaning, detailing; no phone/email in post. Scheduling-pressure angle fresh; Message-button status PENDING-BROWSER (no tagged Page; CTA "Message us" suggests a Page exists).
  - High Valley Structures (shed builder, W. Slope): 2026-09-23 19:31 MDT Western Colorado Message Board inventory promo (10x16 lofted barn $5,500+tax); published 970-640-6124, www.highvalleystructures.com, free local delivery 50 miles, 5-star rating claim. Active-inventory signal; author identity not resolved (low priority, already tracked).
- Empty-content posts: 22 across groups (photo-only listings; spot-check showed perfume sale ad). Meme cross-post ("Denali loves getting stuck in his water bucket") in 3 groups, not a business.

## Round 139 — 2026-09-24 ~14:20 MDT (DM lane, stood down)

- 0 DMs sent, 0 Page checks attempted. DM daily count: 3/10 (unchanged).
- Reason: fb-profile Chrome owned by in-flight FB engagement worker. `fb-worker-probe.sh` returned RC=1 (worker PID 3240, dispatched ~14:16 MDT via run_pass.sh orphan model). The local lock file showed run_pass.sh pid=10571 at 2026-09-24T20:16:28Z but that pid was already dead — under the orphan model the flock releases when the dispatcher exits while the detached worker keeps driving the browser. The lock file alone would have cleared the lane; only the probe caught the contention. Per the never-disturb-a-context-you-don't-own rule, no Pig browser work this run.
- Standing rule added (distilled to PING as learn-round139, verified, emission pending): probe-before-touch — any lane driving the shared fb-profile Chrome must run fb-worker-probe.sh and treat RC=1 as a hard stop; the lock file's holder record is advisory only.
- Deferred to the next browser-free run: Message-button checks for the 3 batch-1921 signals — High Desert Haulers / Coyote Rolloff Services (Page IDs 61559100902731, 100088807365318; likely same operator, treat as ONE prospect, contact primary brand only), Amber's House Cleaning LLC (Page URL unresolvable via CLI, 403), High Valley Structures (no Page ID; phone 970-640-6124 route exists).

## FB delta-scan #128 (2026-09-24 13:29 → 15:15 MDT)

- Window: watermark 1790278195 (2026-09-24 13:29:55 MDT) → new watermark 1790284528 (2026-09-24 15:15:28 MDT). Report: hidden_files/discovery-scratch/fb-scan-20260924-1521.md.
- Posts scanned in-window: 34 (Buy & Sell GJ 20, Fruita 7, Living In GJ 4, Delta 3, Orchard Mesa 0, W CO Message Board 0). Classifications: 0 new prospects, 0 new-business radar hits, 0 complaints; nothing to stage.

## FB delta-scan #129 (2026-09-24 15:15 → 17:14 MDT)

- Window: watermark 1790284528 (2026-09-24 15:15:28 MDT) → new watermark 1790291671 (2026-09-24 17:14:31 MDT). Report: hidden_files/discovery-scratch/fb-scan-20260924-1721.md.
- Posts scanned in-window: 44 (Buy & Sell GJ 20, Fruita 16, Living In GJ 3, Delta 3, Orchard Mesa 2, W CO Message Board 0). 9 empty-content posts resolved via post read (media_ocr + author).
- NEW CANDIDATES: 0. Sole genuine trade promo = J&B Outdoor Maintenance and Landscaping LLC sprinkler-blowout seasonal ad (already tracked in pipeline.md, 2 NEW rows; dedupe-clean no-stage).
- NEW SIGNALS (existing prospects; no DMs sent): J&B Outdoor Maintenance and Landscaping LLC (GJ, jandblandscape.com): same-day sprinkler-blowout promo with pre-winter urgency ("Protect Your Irrigation System Before Winter"), CTA (970) 236-6090; live seasonal angle, pipeline row enriched, status unchanged (NEW). DUPLICATE-ROW FLAG for engine: J&B exists twice in pipeline.md (spaced/unspaced variant) — treat as one prospect.
- New-business radar: 0 home-service hits (Fuzzy's Tacos open = restaurant, out of scope). Hiring/growth: 0. Complaints: 0. Personal demand: Fruita ISO health-insurance agent (out of scope).
- Out-of-scope promo sightings (not staged): Bounce&Slide Inflatables LLC (party rentals, Delta + Orchard Mesa groups), Moon Media "Small Business Thursday" (marketing/media).

## Round 143 — 2026-09-24 ~20:15-20:35 MDT (Pig-side Page checks + 1 DM attempt, 0 sent)

- fb-worker-probe.sh RC=0 (no worker in flight); fb-profile Chrome free this run.
- Page check: Coyote Rolloff Services (Page id 61559100902731) — resolves to facebook.com/coyoterolloffservices, 165 followers, Home Improvement, "Proudly serving those in and around Montrose and Delta as well as Ouray, Telluride and the West End. Fully licensed and insured." Message button = TRUE. (Earlier round-139 note had the two Page IDs swapped; corrected: 61559100902731 = Coyote Rolloff, 100088807365318 = High Desert Haulers.)
- Page check: High Desert Haulers (Page id 100088807365318) — 651 followers, Waste Management Company, Montrose CO, phone (970) 901-7956 on Page (matches pipeline row), "premier Junk Removal, Rolloff, and Demolition Services company with more than 15 years of experience", 100% recommend (12 reviews). Message button = TRUE. Page identity CONFIRMED (phone + territory match pipeline row).
- DM ATTEMPT, High Desert Haulers (primary brand per treat-as-one directive; Coyote Rolloff is the newer 2024 brand, not contacted): send-dm-generic.js FAILED 2x at the Message-button click step (locator.click 30s timeout; button resolves in DOM but click never completes; screenshots C:/Windows/Temp/high-desert-haulers-FAIL-*.png). Thread reconciliation via check-dm-thread.js (probe "15+ years of junk removal"): probe_found=false, thread empty — NOTHING SENT, verified clean. NO third attempt; deterministic tool failure on this Page (possible overlay from the unread-chats/notification chrome seen in the Page render), not a prospect problem. Prospect stays NEW; Page-check enrichment recorded (Message button present, identity confirmed). Draft on file: drafts/round143-dm-high-desert-haulers.txt (re-usable when the click path is fixed or via a different send route).
- DM daily count 2026-09-25 UTC: 0/10. No DM-eligible sends completed this run.
- Lesson: the send script's Message-button click can fail deterministically on Pages with heavy notification/marketplace chrome while check-dm-thread.js's click succeeds — the two scripts locate/click differently. Before the next DM attempt on a Page like this, either fix the click path in send-dm-generic.js or dismiss the overlay chrome first.

## FB delta-scan #130 (2026-09-24 17:14 → 2026-09-25 00:37 MDT)

- Window: watermark 1790291671 (2026-09-24 17:14:31 MDT) → new watermark 1790318246 (2026-09-25 00:37:26 MDT). Report: outreach/discovery-scratch/round0121-fb.md.
- Posts scanned in-window: 59 (Buy & Sell GJ 20, Fruita 19, Living In GJ 6, W CO Message Board 5, Delta 3, Orchard Mesa 1). Classifications: 0 new candidate rows (cap is 300/300 anyway), 0 grand-opening radar hits, 2 repeat sightings, 2 observed-not-pursued, 2 demand signals. Caveat: Fruita + Buy & Sell GJ hit the 20-per-page API cap; in-window posts between ~17:14-19:57 may sit below the page in Fruita.
- NEW CANDIDATES: 0 staged. No in-window post presented a genuine business with a name + published contact path.
- REPEAT SIGHTINGS (enrichment only, no new rows):
  1. High Desert Haulers / Coyote Rolloff Services (Delta group, post 1809673323791039, 17:40 MDT 2026-09-24, author Joshua Bowsher via post read): dual-Page-tag promo confirmed tags High Desert Haulers (Page 100088807365318) + Coyote Rolloff Services (Page 61559100902731); phone 970-901-7956; "Desert Hustle Award for small business, big impact 2026" (Delta Area Chamber). Already pipeline NEW/WARM, round-143 Pig-side Page checks done (Message button TRUE both, identity confirmed; DM attempt failed clean, nothing sent). Vitality signal: still actively promoting.
  2. Scott Rush — dad-and-son junk hauling startup (Living In GJ group, post 3445112772344327, 23:24 MDT 2026-09-24, author scott.rush.7 via social.search post_url): same "trying to start a business" pitch, text-to 970-778-1219. Already pipeline NEW/WARM (round 52), leads.md. 4th repeat sighting; vitality only, no new row.
- OBSERVED-NOT-PURSUED (no business name / no published contact; logged, not staged):
  1. Tyler Trochlil (personal profile, handle fnSanemi, W CO Message Board post 28612762058362663, 18:41 MDT 2026-09-24, author via social.search post_url): "If anyone needs cars towed away free of charge just pm me and we can work out details, Clifton/Junction/Fruita/Palisade". No business name, no phone/website, PM-only. Scrapper/junk-car gig; no contact path for engine.
  2. Ana Rodriguez (personal profile, handle ana.rodriguez.545190, Fruita group post 4477488945858215, 21:26 MDT 2026-09-24, author via social.search post_url): offers furniture assembly/help building things for $$$. No business name, no contact published. Solo gig worker; no contact path.
- DEMAND SIGNALS (not prospects): Living In GJ post 3444846319037639 (18:16 MDT): homeowner seeking plumber for suspected stove gas leak (14 comments) = live plumbing demand GJ. W CO Message Board post 28614396438199225 (22:40 MDT): elderly lady ISO female housekeeper, 81506, $50/2-hr visit = house-cleaning demand.
- Page/Message-button checks: High Desert Haulers + Coyote Rolloff already verified (round 143, button TRUE, identity confirmed). Scott Rush = personal profile only, no business Page. Trochlil/Rodriguez = personal profiles, no business identity, no Page check applicable.
- No DMs sent (research-only job).

## Round 144 DM send (2026-09-25 02:32-02:40 MDT / 2026-09-25 08:32-08:40 UTC)

- Facebook worker probe: no worker active (fb-worker-probe.sh exit 0). Built + deployed read-only batch helpers: fb-page-search.js (single), fb-page-search-batch.js, check-page-batch.js, fb-search-debug.js (temp diagnostic, deployed then superseded).
- Page checks (round-143 phone-route backlog, 7 candidates):
  - Good Neighbors Fencing: Page FOUND and identity CONFIRMED — profile.php?id=61583779867067, "Good Neighbors Fencing", Fence & Gate Contractor, 656 Hudson Bay Court, Grand Junction CO (matches pipeline), (970) 644-7522 (matches pipeline), 13 followers. NEW INTEL: Page contact email jimdavis3074@gmail.com. Message button = TRUE.
  - Genesis Appliance Service Inc: Page FOUND, identity CONFIRMED — facebook.com/GenesisSVCS, 2930 Highway 50, Grand Junction CO 81503, Page posts "Call Now To Schedule!! 970-361-0733" (matches own-site phone), 442 followers, 96% recommend (27 reviews), service areas GJ/Redlands/Orchard Mesa/Fruitvale/Fruita/Clifton/Loma/Mack/Palisade. Message button = TRUE.
  - D20 Locksmith Services: Page FOUND, identity CONFIRMED — facebook.com/D20Locksmith, "24 hour mobile locksmith services", Mobile Service Grand Junction CO 81501, wixsite.com link (matches own site), 115 followers. Message button = TRUE.
  - Home Appliance Repair & Sales (GJ): NO matching Page (search surfaced only unrelated/generic results).
  - Pine Mountain Electric (Carbondale): NO matching Page (zero results).
  - Kero HVAC (Montrose): NO matching Page (zero results). Identity caveat (Auburn MA GBP duplication) still open.
  - Garage Doors And More LLC (GJ): only matching-name Page (profile.php?id=100071355431631) is WRONG IDENTITY — "Garage Doors & More, LLC", 13328 E Southgate, 73736 (Oklahoma), (580) 231-0381, kristin_booth@yahoo.com. REJECTED, no DM. No GJ Page found.
- DM daily count 2026-09-25 UTC before run: 0/10.
- DM 1, Good Neighbors Fencing: send-dm-generic.js FAILED at chat-input click (locator.click 30s timeout; nothing typed, nothing sent — clean failure). Root cause matches round-143 pattern: Playwright actionability wait on the contenteditable div. Built send-dm-v2.js (JS-driven focus: scrollIntoView + focus + focus-verify before insert). Retry with v2: SENT, verify_sent_text_visible=true. In-thread verification PASSED. Pipeline status -> DM SENT. Draft: drafts/dm-round144-good-neighbors-fencing.txt. F1 ladder due 2026-09-29..2026-10-02.
- DM 2, Genesis Appliance Service: send-dm-v2.js FAILED at the Message-button click (round-143 HDH failure mode; nothing typed, nothing sent — clean failure). Built send-dm-v3.js (v2 + Escape x2 overlay dismiss, 15s Playwright click cap, JS synthetic-click fallback with chat-open verification). Retry with v3: SENT, verify_sent_text_visible=true. In-thread verification PASSED. Pipeline status -> DM SENT. Draft: drafts/dm-round144-genesis-appliance.txt. F1 ladder due 2026-09-29..2026-10-02.
- DM 3, D20 Locksmith Services: send-dm-v3.js SENT directly, verify_sent_text_visible=true. In-thread verification PASSED. Pipeline status -> DM SENT. Draft: drafts/dm-round144-d20-locksmith.txt. F1 ladder due 2026-09-29..2026-10-02.
- DM daily count 2026-09-25 UTC after run: 3/10.
- New tooling landed (Pig-side + local copies in ~/workspace/pig-fb/): send-dm-v2.js, send-dm-v3.js, fb-page-search.js, fb-page-search-batch.js, check-page-batch.js. v3 is now the standing DM send script (strictly more resilient; fail-closed semantics preserved: chat-open verification before insert, focus verification before insert, in-thread text verification after Enter).
- 2026-09-25 UTC email cap was already 10/10 at run start (closed by rounds 142-143). No email sent this run. Roaring Fork Spray Foam draft (drafts/round143-roaring-fork-spray-foam-email.md) stays QUEUED for the next UTC day.
- Ladders now open: 12 total F1 due 2026-09-29..2026-10-02 (9 email from rounds 142-143 + 3 DM from round 144).

## FB scan 2026-09-25 (discovery-research; signal half only, no sends)

Scope: 72 posts across the 6 Western Colorado groups + 61 Fruita "Local business Thursday" comments + 13 Living In GJ plumber-thread comments; all signals 2026-09-24. facebook-cli profile info 403-gated for all Pages this session; Message-button presence not observable; no DM-eligibility claims made.

NEW candidates (also staged to pipeline.md):
- Leland Plumbing Heating and Air Conditioning, Ltd. (GJ, plumbing/HVAC) — signal: named recommendation "Leland Plumbing!" in Living In GJ plumber thread; own site lelandphac.com verified live by parent (phone (970) 712-1924, emails robert@lelandphac.com / office@lelandphac.com, owner Robert Baker, BBB A+). Fallback: phone. Documented summary-only (300-active-cap rule).
- Tiger Plumbing (GJ 81506, plumbing) — signal: recommended in same plumber thread ("Tiger Plumbing @[Ken Pelly]" — Ken Pelly personal profile tagged, possibly operator, UNVERIFIED); phone 970-985-1050 from merchantsnearby.com directory only; no own website found. Fallback: phone. Documented summary-only (300-active-cap rule; verify live number before outreach).

NEW SIGNALS for tracked prospects (last_signal/intel_updated fed to canonical JSONL for High Desert Haulers and Titan Plumbing GJ):
- High Desert Haulers and Junk Removal (pipeline NEW) — Delta group service-announcement 2026-09-24 ~16:40 UTC by Joshua Bowsher (joshua.bowsher.9, author via social.search post_url): junk removal + dumpster rental, family-owned, licensed/insured, prices from $120, same phone 970-901-7956. Active-marketing vitality signal.
- Chuckin Junk Hauling LLC (pipeline NEW) — Fruita Thursday comment 2026-09-24: "Chuckin junk hauling Local Fruita business Serving the Western Slope 970-270-3478 call Brad today 970-270-3478 also donation runs". NEW INTEL: operator first name Brad.
- RescueMe HandyMan Services (pipeline WATCH/HELD) — Fruita Thursday recommendation-style comment 2026-09-24: "Warren with RescueMe HandyMan Services is a trustworthy reliable handyman... insured & bonded"; services: all-season lawn care, general maintenance, drywall/hole repairs, curtain rods/blinds. Social-proof signal; still no phone/website published.
- Titan Plumbing GJ (pipeline HELD) — endorsed twice 2026-09-24: Fruita Thursday thread ("@Titan Plumbing GJ, good guys to work with!") + Living In GJ plumber thread. Community endorsement signal.
- Unique Solutions Handyman and Remodeling LLC (pipeline WATCH) — tagged in Living In GJ plumber thread 2026-09-24; phone 972-269-3449 restated. Active mention; geography/author-affiliation still unverified.
- Kooler Garage Doors (SENT 2026-09-24) — running a garage-door giveaway contest in Living In GJ (koolergaragedoors.com/who-said-yes-to-you-first, nominations through Oct 4). Community marketing activity on an already-contacted prospect; engine to consider for ladder timing.

Near-miss (not staged): Red's Plumbing and Heating LLC (phone 970-312-9742 published by recommender; no Corridor business found in web search — identity/geography unverifiable); JW Plumbing Inc. (bare FB Page tag, no contact route); Dan's Drywall & Painting Fruita (drywall/paint not in strict trade list; otherwise strong revamp candidate — directory-only web presence, DBA Danny Alan Causey, phone 810-824-8466 in own homeimprova.com posts, out-of-area code, verify); Amazing Grays Construction LLC (remodeling not in strict list + unverifiable beyond post); Osborn Window and Door LLC (window/door not in strict list).

## FB scan 2026-09-25 13:21 MDT window

- Window: watermark 1790342460 (2026-09-25 07:21 MDT) -> new watermark 1790364667 (2026-09-25 13:31 MDT; max in-window post ts). Report saved by parent discovery job.
- Posts scanned in-window: 115 (W CO Message Board 15 + Buy & Sell GJ 40 + Delta 13 + Orchard Mesa 4 + Fruita 35 + Living In GJ 8). 2 below-watermark W CO posts excluded, not double-counted. 21 empty-content posts resolved via post read (all memes/photo shares or restaurant promos; no trade promos). Fruita coverage complete (page 3 returned 0 posts). Buy & Sell GJ residual window 07:21-10:41 MDT unfetched (40/40 scanned posts were for-sale listings; residual risk noted, likely all commerce).
- Classifications: 1 genuine trade promo (repeat sighting, already tracked), 0 new candidates, 0 grand-opening radar hits, 0 complaint threads.
- NEW CANDIDATES: none.
- REPEAT SIGNAL (enrichment only, no new row):
  - Coyote Rolloff Services / High Desert Haulers (W CO Message Board, post 28619499947688874, 2026-09-25 07:38 MDT, owner fb_id 100001636570172 via post read; prior posts authored by Joshua Bowsher joshua.bowsher.9, identity relationship unresolved, not conflated): rolloff dumpster rental promo tagging Coyote Rolloff Services Page 61559100902731 ("From houses to airports... We even do the loading if you prefer"). NEW INTEL: media OCR shows COYOTE ROLLOFF SERVICES with alternate phones 970-975-0542 and 970-787-8809 (vs 970-901-7956 on High Desert Haulers Page). Suggested last_signal for canonical JSONL "High Desert Haulers and Junk Removal": "2026-09-25 FB W-CO-Message-Board rolloff promo (post 28619499947688874): Coyote Rolloff Services brand creative with alternate phones 970-975-0542 / 970-787-8809; active-marketing vitality, third active promo in 48h".
- Page/Message-button check: facebook-cli profile info 403 server-side again this session (this specific command currently unavailable). No DM-eligibility claim made. Pig-side round-143 already verified Message button TRUE on both Pages (Coyote 61559100902731, High Desert 100088807365318) with identity confirmed; DM attempt on High Desert failed clean, nothing sent.
- DEMAND SIGNALS (not prospects): Fruita post 4478060862467690 (09:24 MDT): homeowner seeking recommendations for gutter replacement, kitchen cabinets, tub/shower surround, shed build. Fruita post 4478001945806915: ISO washer/dryer pickup in Fruita. Buy & Sell GJ post 3422792761262151: new trucking business ISO commercial insurance (trucking out of trade scope).
- Out-of-scope promo sightings (not staged): Blessed Harvest Homestead home bakery "open today" (Orchard Mesa, cottage food, not trade); LiL Richards burrito restaurant promo (Fruita); Cattlemen's Bar & Grill online-reservation promo (Loma, restaurant); Base Camp Provisions music night (Fruita, restaurant); Strayhorn Grill 4H night (Fruita, restaurant); GOODFOOD Mountain Top Resort weekend event; fresh-bouquet flower farm Sat pickup (Delta); Delta restaurant Friday special (970-399-3008); "trucking business insurance" question; "vendors/food trucks wanted" event host (Living In GJ).
- Watch items (no promo signal, logged only): tree-service Page "Uprootedtrees" shared 2 photo/meme posts in Delta group; Page "Surf To Turf" shared photo posts in Living In GJ + Orchard Mesa (possible lawn-care trade business, but no text, no promo, no contact; not qualified).
- No DMs sent (research-only job).

## Round 149 Page checks (2026-09-26 08:27-08:31 MDT, Pig headed Chrome CDP :9223)
- 0 DMs sent. 5 prospects checked; all failed closed under the contact/thread gate (Message button exists but no Messenger contact and no existing thread for each; fail closed per standing rule).
- Mullenax Construction & Roofing: exact Page https://www.facebook.com/MullenaxConstructionRoofing verified (roofing/general contracting, 514 Will Ave, Rifle, CO 81650, gregmullenaxroofing.com); Message button present; no Messenger contact, no existing thread. Phone-only route retained.
- Coven's Plumbing: no identity-matched business Page found (searched "Covens Plumbing Loma" and "Coven Plumbing"). Phone-only route retained.
- Grand Valley Curbing: exact Page https://www.facebook.com/GVCurbing verified (concrete edging, Grand Junction, (970) 201-5100, grandvalleycurbing.com); Message button present; no Messenger contact, no existing thread. Own-site form is a customer free-estimate flow (no B2B use). Phone-only route retained.
- The Fireplace Expert: exact Page https://www.facebook.com/profile.php?id=100054431517299 verified (tfpe.net, Cattle Creek CO, matches tracked phone/website identity); Message button present; no Messenger contact, no existing thread. Phone-only route retained.
- Coldiron's Creations and Property Service: F2 window 2026-09-26..2026-10-03 (initial DM 2026-09-08, F1 sent 2026-09-19 ~20:30 MDT). Two read-only thread-inspection attempts (30s click timeouts each); no message text inserted, no send attempted. F2 remains unsent; thread reply status unverified. Evidence: Pig C:\Windows\Temp\coldiron-f2-check-FAIL-1790432665393.png and coldiron-f2-check2-FAIL-1790432721503.png.
- Pig tooling note: playwright-core was missing from C:\Users\nolan\pig-fb-run; package.json created and installed there (1 package, 0 vulnerabilities). Read-only helpers (fb-page-search.js, check-page-generic.js, check-dm-thread.js) copied in; no browser restarted, nothing sent.
- **Round 150 Coldiron's Creations F2 thread-inspection retry (2026-09-26 ~14:20-14:30 MDT):** TWO read-only check-dm-thread.js runs on the Pig (stdin-fed PowerShell, quoting fixed run 2): both `message_buttons_found=0`, `error=no Message button`, `ok=false`. Login check via CDP: LOGIN ok (feed marker present). Follow-up action-chrome scan: NO Message/Follow/Like/Call/WhatsApp action texts rendered in the profile header at all ("Loading messages" dock artifact only). This morning (~08:27 MDT) the button resolved in DOM but timed out on click x2. Regression between the two windows is page-render-side, not session-side. F2 stays unsent; thread reply status UNVERIFIED. Retry next round per no-scale-back rule (window open through 2026-10-03). Screenshots Pig C:\Windows\Temp\coldiron-f2-check-FAIL-1790453870404.png, coldiron-f2-check2-FAIL-1790453916216.png.

## FB scan 2026-09-27 01:22 MDT window

- Window: watermark 1790364667 (2026-09-25 13:31 MDT) -> new watermark 1790492621 (2026-09-27 01:03 MDT; max in-window post ts). Full report: ~/workspace/outreach/facebook-scan-2026-09-27.md.
- Posts scanned: 108 across 6 groups (WCO Message Board 19, Buy & Sell GJ 20, Delta 20, Orchard Mesa 9, Fruita 20, Living In GJ 20). One below-watermark stray (ts 1790364053, china-cabinet resale, WCO Message Board) treated uncounted-but-scannable.
- NEW CANDIDATES staged in pipeline.md: 3 septic (Bestway Services GJ; Yuck Truck Septic Pumping Gypsum; Blue Monster Septic Service Gypsum) + Jovanny Vargas WATCH (identity unresolved, thin).
- REPEAT SIGNALS (enrichment, no new rows):
  - Scott Rush dad-and-son hauling startup (pipeline NEW/WARM since round 52): fresh promo 2026-09-26 12:13 MDT Living In GJ (permalink/3446860548836216/), same text route 970-778-1219. Vitality signal: still actively promoting. NOTE: scan worker reported this as dedupe-clean; parent exact-name grep audit caught the existing row (pipeline L1487, leads L3238). Parent-side grep audit of every staged name is now part of the merge step.
  - High Desert Haulers and Junk Removal (WARM): Joshua Bowsher dual promo 9/26 10:31-10:33 MDT (posts 28634174046221464, 28634155239556678): junk removal + rolloff dumpster rental, family-owned, licensed/insured, prices from $120, 970-901-7956; cross-tags @Coyote Rolloff Services.
  - Coyote Rolloff Services (pipeline WATCH): same two promos; site coyoterolloffservices.com; alternate phones 970-975-0542 / 970-787-8809 (post image OCR).
- DEMAND SIGNAL: urgent bonded/insured welder wanted GJ (camper jack repair, trip mid next week; permalink/3446686432186961/ Living In GJ, 9/26 08:55 MDT). Not tied to any tracked business.
- Page/Message-button check: facebook-cli profile info still 403s server-side (disabled/gated; tested this run). No new DM-eligibility claims; all new candidates recorded with fallback contact routes only.
- No DMs sent (research-only job).

## Round 152 — Spurlock DM F1 draft written (2026-09-27 ~02:15 MDT)
- Spurlock Immaculate Lawncare-Services: DM F1 draft written to drafts/dm-round152-f1-spurlock.txt (window 2026-09-28 to 2026-10-01; under 50 words; disclosure first + AI identity + sentence-per-line + "PING Social, (970) 589-3309" sign-off; references the original brush-clearing / mid-job-intake angle from the 09-24 initial DM; one question max; no em dashes). Send via Pig headed Chrome with the existing thread (check-dm-thread.js reconciliation path), NOT the Messenger CLI. Thread shows no reply as of the 09-24 reconciliation check.
- DM daily count: 0/10 on the 2026-09-27 UTC day. 09-29 DM F1 cohort drafts already written round 150 (Good Neighbors Fencing, Genesis Appliance Service, D20 Locksmith Services).

## 2026-09-27 (19:21 MDT) — Delta-scan (round per sweep discovery-2026-09-28-0121)

**Result: 1 new genuine prospect.** Scanned all 6 Western Colorado groups via facebook-cli (83 in-window posts, watermark 1790514820 -> 1790557926). Auth healthy, all six groups exit 0. Author identified via social.search post_url route. Dedupe: exact-name, normalized, and Page-ID greps against leads.md, pipeline.md, facebook-dms.md, and the canonical JSONL all clean. Parent grep audit confirmed zero matches.

### New prospect (added to pipeline.md under "Discovery research 2026-09-27 (19:21 MDT)", status NEW)
1. **Elite Pool Professionals** — pool service (cleaning, maintenance, winterization/pool closings), Grand Junction. Posted by its own business Page (Page ID 61586183197807; bio "Grand Junction's Elite Pool Pros!", ~181 followers) in Western Colorado Message Board & Classifieds at 2026-09-27 19:27 MDT: seasonal pool-closing/winterization promo ("Slots are filling up quickly"). No phone, email, or website published in post or bio ("give us a call" with no number). Contact route = the business's own Facebook Page. Post: https://facebook.com/groups/5456977881034408/permalink/28647010044937864/
- DM caveat: Message-button presence NOT verified (`facebook-cli profile info` returned HTTP 403, server-side gating, same pattern as the 2026-09-27 scan; recorded as a VERIFY caveat, not evidence of absence). DM-eligibility stays UNVERIFIED — the engine job must confirm the Message button before any DM. Do not invent a phone number.

### Observed but not pursued
- North Fork Flowers (Delta): florist/retail, out of segment. ADAC UTV-rental airshow-weekend promo repost (tourism, market intel only). Golden Wings and Fish Co Broncos watch party (restaurant, tracked). Aila Thai kitchen dessert post (tracked). Doughbra's Stand x4 cross-group farm-stand promos (food, tracked; cross-posting pattern continues). "Fruita Service Center" tire-question mention: personal request, no business promo.
- New-filing radar: zero keyword hits (grand opening / now open / just launched / open for business) across all in-window posts.
- ~26 image-only empty-caption posts unresolved (no text signal).

### Market intel
- Pool-closing winterization is the live fall seasonal-demand window in GJ ("Slots are filling up quickly" urgency marketing). Useful seasonal angle if pool/spa segment gets a dedicated research pass.

### Watermark
- Next scan: new posts since 2026-09-27 19:12 MDT (unix 1790557926). NOTE: the prior recorded watermark 1790514820 held because the 2026-09-27 13:21 MDT scan did not clearly preserve its newly computed numeric watermark; this run recomputed cleanly from the oldest window edge and the full 83-post delta was triaged, so nothing was skipped.

## Round 156 — Spurlock DM F1 (2026-09-28 ~02:15-02:21 MDT; Pig-side execution; transport recovered)
- DM REPLY OBSERVABILITY RESTORED: Pig-side check-dm-thread.js read of the Spurlock thread (profile.php?id=61588596701556, probe "PING Social") succeeded this round after 3 consecutive failed rounds (round 153/154/155 Companion transport errors). Thread state: our initial DM ("Message sent Thursday 8:21 AM", verbatim, "Sent 3d ago") is the LAST message; NO reply from Spurlock. The round-154/155 fail-closed HOLD on DM follow-ups is lifted. Side intel: chat list confirms the 09-29 DM F1 cohort initial threads (D20 Locksmith, Genesis Appliance Service, Good Neighbors Fencing) all show our outbound initial messages ("2d ago") with no visible replies in the scan window; unrelated personal chats (marketplace buyers, message requests) untouched. "Chat history is missing / Enter your PIN to restore chat history" notice observed in the Messenger dialog, explaining the Companion sync failures; direct Pig-side read is now the primary DM reply-check path.
- Spurlock DM F1 SENT 2026-09-28 ~02:20 MDT: send-dm-v2.js (JS-driven focus path; v1 click timeouts documented rounds 143-144), draft drafts/dm-round152-f1-spurlock.txt (fall brush-booking bump, one question, disclosure + AI identity + PING Social sign-off). Verification: verify_sent_text_visible=true in-thread, screenshot C:/Windows/Temp/spurlock-f1-1790583381514.png. Message file was staged Pig-side at C:/Users/nolan/pig-fb-run/draft-spurlock-f1.txt via stdin-fed ssh (573 bytes, content verified byte-count pre-send). 2026-09-28 UTC DM count 1/10. F2 window 2026-10-03 to 2026-10-07; F2 draft NEEDED.
- Elite Pool Professionals DM eligibility still UNVERIFIED (facebook-cli profile info HTTP 403; Page Message button needs Pig-side check-page-generic.js; not attempted this run, 09-29 DM F1 cohort had priority and cohort drafts exist). Junk-batch shops (Junk Bros, Grand Valley Roll-Offs, Trash Scoopers) are phone/quote-funnel only; no DM candidates from the 0721 discovery batch.
- NOTE on quoting (Windows-side invocation that worked): `wsl -- bash -c "/mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe C:/Users/nolan/pig-fb-run/check-dm-thread.js '<page-url>' '<probe>' <slug>"` — Windows node.exe mangles /mnt/c script paths (prepends C:\), so the script path must be C:/-style while the node binary path is /mnt/c-style. Inner args single-quoted (CMD-safe).

## 2026-09-28 (13:35 MDT) — FB group scan (sweep discovery-2026-09-28-1321)

**Result: 1 new-filing radar hit (business name not yet published, staged as WATCH signal, not staged to pipeline).** Scanned all 6 Western Colorado groups via facebook-cli (59 in-window posts, watermark 1790578939 -> 1790624135). Auth healthy, all six groups exit 0. Author identified via facebook-cli post read (profile strip present). Dedupe for the named signal: "Soto" / pressure-washing greps against leads.md, pipeline.md, facebook-dms.md, canonical JSONL — zero matches (no prior record exists; no business name to stage yet).

### New-business radar hit (NOT staged to pipeline — identity incomplete)
1. **Anthony Soto (Fruita, personal profile)** — posted 2026-09-28 12:12 MDT in Fruita group: building a pressure washing business page, first jobs lining up, has commercial equipment, offers driveway/sidewalk/patio/concrete/trash-can/gutter cleaning. No business name published yet, no Page link, no phone/site. WATCH until a business name + Page surface. Post: https://facebook.com/groups/3741333852807065/permalink/4481690125438097/
- Second commenter "starting a buissness to" (unnamed) — no identity, market-intel only (ChatGPT-assisted startup pattern).

### Observed but not pursued
- Blessed Harvest (preorder-only farm stand, Orchard Mesa group) + Airshow/AppleFest sourdough baker (cross-group): food businesses, out of home-service segment, tracked as market intel only.
- Mesa View Venue 2026 rate-drop ad (venue rental, out of segment). Job seeker post (full-time job request, not a business). Handyman service REQUEST post (consumer ask, not a business promo). All marketplace sale posts (vehicles, printers, furniture) ignored.
- New-filing keywords: zero "grand opening"/"now open"/"just launched" keyword hits; the Soto post is an implicit new-filing (business being built this week) rather than keyword-flagged.

### Market intel
- Fall Fruita-area home-service demand visible: pressure washing launch + mattress-hauling request in the same 2h window. Pool-closing season continues (Elite Pool Professionals promo from the prior scan).

### Watermark
- Next scan: new posts since 2026-09-28 13:35 MDT (unix 1790624135).
- No DMs sent (research-only job).

## Round 157 — Elite Pool Professionals initial DM SENT (2026-09-28 ~13:40 MDT / 19:40 UTC; Pig-side execution)
- DM ELIGIBILITY RESOLVED: Elite Pool Professionals (Page ID 61586183197807) Message-button check run this round via Pig check-page-generic.js. Result: hasMessageButton=true (button "Message" rendered among page buttons). Page identity re-verified on the rendered page: name "Elite Pool Professionals", bio "Grand Junction's Elite Pool Pros!", 181 followers, Fruita, CO location, Swimming Pool & Hot Tub Service category. Matches the business from discovery-2026-09-28-0121 (post 28647010044937864, seasonal pool-closing promo "Slots are filling up quickly").
- ENRICHMENT from the rendered Page (not invented): Page publishes (970) 683-1301 as its phone; service towns GJ, Mesa County, Redlands, Fruita. This is Page-published contact info, recorded in pipeline.md; the DM route remains first-choice per Nolan's directive.
- Send-eligibility gate: python3 send-eligibility.py --action dm run with Gmail-verified count 0 (in:sent "Elite Pool Professionals" = no messages; a Page DM has no email route, so the business-name sent search is the honest history verification). First attempt without the count exited 1 (mandatory email-history field); with the verified 0 the checker returned ELIGIBLE exit 0. NOTE for future Page-DM runs: the checker's gmail-sent-count is email-shaped; for Page DMs run the business-name in:sent search and pass the verified count.
- Elite Pool Professionals initial DM SENT 2026-09-28 ~13:40 MDT: send-dm-v2.js (message_buttons_found=1, chat_input_focus=focused, text=inserted len=638, send=enter pressed, verify_sent_text_visible=true, screenshot elite-pool-professionals-1790624310318.png). Draft drafts/dm-round157-elite-pool-msg.txt (pool-closing rush angle, disclosure + AI identity + sentence-per-line + "PING Social, (970) 589-3309" sign-off, no em dashes). 2026-09-28 UTC DM count 2/10. Ladder at 1 touch; F1 eligible 2026-10-02 to 2026-10-05 (draft NEEDED before 10-02).
- No Messenger-CLI involvement (Page DM via the Pig headed-Chrome path, the standing transport for Page DMs since round 143).
- DM reply check: Spurlock Immaculate Lawncare-Services thread read 2026-09-28 ~13:45 MDT (check-dm-thread.js; probe PING Social found; our initial + F1 the only bubbles; NO reply). F1 SENT 2026-09-28 ~02:20 MDT stands at 2 touches; F2 window 2026-10-03 to 2026-10-07.

## Discovery research 2026-09-28 (13:38 MDT) — FB delta-scan research log (research-only; no DMs sent, no drafts)

- NEW | Southwest Tree Service | tree care | Fruita (post 08:11 MDT, Fruita group, permalink/4481462545460855/, poster Bobby Schenck personal profile) | (970) 623-5225 (post-published) | no business Page found (web + social search 2026-09-28) | Page identity + Message-button check: FAILED via CLI (no Page to check; personal-profile lookup 403 non-friend) - needs Pig-side verification before any DM route | status: NEW/WATCH (logged in pipeline.md; dedupe clean) | No DM sent.
- NEW | Colorado Disposal Services | junk removal | Fruita area (post 10:11 MDT, Fruita group, permalink/4481579182115858/, poster Justin Johnson personal profile) | (970) 549-6422 (post-published) | no business Page or website found (Facebook-presence only) | Page identity + Message-button check: FAILED via CLI - needs Pig-side verification before any DM route | status: NEW/WATCH (logged in pipeline.md; dedupe clean) | No DM sent.
- WATCH-note only (no business name published): Josh Waalkes (personal profile josh.waalkes.1) - fall landscaping/yard cleanup promo list (overseed, gutter cleaning, leaf cleanup, fruit-tree pruning), Fruita group 10:59 MDT, permalink/4481623962111380/, "send me a DM" only. Same treatment as Anthony Soto: WATCH until a business name + Page surface.
- Signal update (tracked prospect): Cozmic Painting (Clifton) - owner Gio Quintana handyman/paint/drywall plea posted TWICE 92s apart (~13:38/13:39 MDT) Fruita group @everyone, explicit bills-to-pay urgency. Receptive timing heightened. Posts: permalink/4481767712097005/ + permalink/4481765902097186/. No DM sent.

### Watermark
- Next scan: new posts since 2026-09-28 13:44 MDT (unix 1790624654).
- No DMs sent (research-only job).

## Round 158 — Southwest Tree Service + Colorado Disposal Services initial DMs SENT (2026-09-28 ~14:20-14:30 MDT; Pig-side execution)
- Two NEW prospects from the 13:38 MDT discovery delta-scan needed Pig-side Page verification before any DM route (CLI Page lookup failed; posters were personal profiles).
- TRANSPORT: Pig SSH healthy (PIG_OK first try, BatchMode=yes). Pigwsl-exec.sh stdin-fed pattern used throughout to avoid CMD quoting issues. Portable Windows node /mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe + C:/Users/nolan/pig-fb-r158/ script paths; playwright-core resolved from /mnt/c/Users/nolan/node_modules. First fb-page-search.js run returned 0 results (absolute-href filter bug); fixed and re-ran.
- SOUTHWEST TREE SERVICE: Facebook pages search surfaced 11 "Southwest Tree Service" namesakes (Keller TX, Olathe CO, Delta CO, Farmington NM, Waco, Denver franchise). check-page-generic.js on https://www.facebook.com/SouthwestTreeService -> Keller, TX (Dallas-Fort Worth) - REJECTED, wrong business. https://www.facebook.com/SouthWestTree -> IDENTITY MATCHED: Page "SouthWest Tree Service", P.O. Box 221, Olathe, CO 81425 (Western Colorado), Page-published phone (970) 623-5225 EXACT-MATCHES the post-published number, payment post says "Check made payable to Bobby Schenck" (poster name match), "Happy Autumn" promo post matches the discovery fall promo. Message button OBSERVED (hasMessageButton=true). DM-ELIGIBILITY BAR PASSED.
- COLORADO DISPOSAL SERVICES: Facebook pages search surfaced one candidate, https://www.facebook.com/profile.php?id=61593054720912 ("Colorado Disposal Services"). check-page-generic.js -> IDENTITY MATCHED: Page-published phone (970) 549-6422 EXACT-MATCHES the post-published number, email info@coloradodisposalservices.com, "junk removal ... across the Western Slope" service description matches trade + Fruita-area geography, 1 follower. Message button OBSERVED (hasMessageButton=true). DM-ELIGIBILITY BAR PASSED.
- ELIGIBILITY GATES: Gmail-verified sent counts 0 for both (in:sent "SouthWest Tree Service" and "Colorado Disposal Services" = no messages). send-eligibility.py --action dm --gmail-sent-count 0 --day 2026-09-28 -> ELIGIBLE exit 0 for both. No Messenger-CLI involvement (Page DM via Pig headed-Chrome path).
- DM texts staged Pig-side via scp + byte-count verify (614/614 and 611/611); local draft copies: drafts/dm-round158-southwest-tree.txt, drafts/dm-round158-colorado-disposal.txt. Copy verbatim from the round-158 brief: disclosure + AI identity + blank-line sentences + "PING Social, (970) 589-3309" sign-off, no em dashes.
- Southwest Tree Service initial DM SENT 2026-09-28 ~14:25 MDT: send-dm-v2.js (message_buttons_found=1, chat_input_focus=focused, text=inserted len=613, send=enter pressed, verify_sent_text_visible=true, screenshot southwest-tree-r158-1790626892835.png). In-thread verification = true (not just CLI receipt).
- Colorado Disposal Services initial DM SENT 2026-09-28 ~14:28 MDT: send-dm-v2.js (message_buttons_found=1, chat_input_focus=focused, text=inserted len=610, send=enter pressed, verify_sent_text_visible=true, screenshot colorado-disposal-r158-1790626918510.png). In-thread verification = true.
- 2026-09-28 UTC DM count: 2/10 -> 4/10. Ladders at 1 touch each; F1 eligible 2026-10-02 to 2026-10-05 (draft NEEDED before 10-02). Both prospects: Page identity now KNOWN in record (SouthWest Tree Service = facebook.com/SouthWestTree, Page ID via slug; Colorado Disposal Services = profile.php?id=61593054720912).
- Profinish Drywall & Paint, LLC staged NEW (discovery-research 2026-09-29-0121, FB delta-scan): promo post 2026-09-28 ~15:03 MDT in Buy & Sell in Delta group (post 1813527060072332), posted by own Page (ID 61577181835253), phone 970-765-1223 post-published, services drywall + interior paint, slogan "We Actually Call People Back". Pipeline row staged; NO DM sent (research-only job); Message-button check needs Pig-side verification (CLI 403). Distinct from A-Pro-Finish Drywall Westminster (pipeline L501, JSONL).

## 2026-09-29 01:33 UTC - NEW CANDIDATE: Prestige Renovations and Creations LLC
- Business: Prestige Renovations and Creations LLC, Grand Junction, CO 81501-7301
- Social proof: Instagram carousel + Facebook reel of a ground-up new build, posted 2026-09-27; business handle @prestige.renovationsllc on Instagram
- Contact: website www.prestigerenovationsandcreations.com; phone (970) 433-6174 (directory-published)
- Distinct from Prestige Gutters (negative list). Not previously in pipeline/leads/JSONL.
- DM route: NOT verified. Facebook page identity and Message button not yet checked. Do not draft DM copy until Message button verified.
- Status: NEW, no outreach sent.

## 2026-09-29 01:55 UTC - NEW snow lane candidates (3, dedupe-clean)
- Brookstone Outdoors (Austin/Delta): own-site contact; Facebook Page identity and Message button not yet checked. Status: NEW, no outreach sent.
- Avalanche Snow Removal (Rifle): directory-published phone only; no verified Facebook Page. Status: NEW, no outreach sent.
- Village Excavating (Carbondale): directory-published phone only; no verified Facebook Page. Status: NEW, no outreach sent.
- Near-misses logged by lane: Jackson Soil Solutions (own site shows no snow service), Alan Duncan Roofing & Snow Removal (no phone, no own presence), Jeffryes Enterprises (directory only, no own presence), ColWest Roofing (bad domain). The Grounds Guys Carbondale excluded as franchise. Duplicates already in files: Alpine Property Services, Binkley's Snow Removal, Ace's Snow Plowing, Wilber's Snow Removal, Summit Sweeping Service, Alpine Custom Mowing, Peaceful Valley Irrigation & Landscaping, JT's Lawn Services & Snow Removal, Mullenax Construction and Roofing, Never Mcphail Aeration and Lawn, Holmes Excavation, Roaring Fork Integral Services, Green-Way Pro Landscaping.

## Round 159 — 3 F1 sends (GNF, Genesis) + Profinish initial DM SENT; D20 F1 HELD (Page unavailable) — 2026-09-28 ~20:15-20:27 MDT (2026-09-29 02:15-02:27 UTC); Pig-side DM lane execution

- TRANSPORT: Pig SSH healthy first try (PIG_OK via pigwsl-exec.sh, BatchMode=yes). Staging via stdin-fed base64 to C:/Users/nolan/pig-fb-r159/ with byte-count verify (7/7 files: check-dm-thread.js, send-dm-v2.js, send-dm-v3.js, check-page-generic.js, 3 F1 texts, profinish draft). Portable Windows node + C:/ script paths per AGENTS.md node path rules; playwright-core from /mnt/c/Users/nolan/node_modules.
- DM CAP: 0/10 used at start of the 2026-09-29 UTC day -> 3/10 used after this run (2 F1s + 1 initial).
- New helper: check-dm-thread-v3.js (copy of check-dm-thread.js + the v3 Escape-x2 / JS-synthetic-click Message-button sequence). Needed because Genesis's Page chrome defeats the Playwright click in the base checker (2 consecutive locator.click 30s timeouts).

- F1 #1 Good Neighbors Fencing: check-dm-thread.js probe "Good Neighbors Fencing has been putting up fences" -> probe_found=true, our initial DM ("Message sent Friday 2:28am", "Sent 3d ago") is the LAST bubble; NO reply. send-eligibility.py --action followup-f1 rc=0 ELIGIBLE. F1 SENT via send-dm-v2.js (message_buttons_found=1, chat_input_focus=focused, text=inserted len=595, send=enter pressed, verify_sent_text_visible=true, screenshot C:/Users/nolan/pig-fb-r159/shots/gnf-f1-send-1790648607550.png). In-thread verification PASSED. Draft copy: drafts/dm-round159-good-neighbors-fencing-f1.txt. Ladder at 2 touches; F2 window 2026-10-03 to 2026-10-07.
- F1 #2 Genesis Appliance Service: base checker failed twice at the Message-button Playwright click (locator.click 30s timeout, round-144 HDH mode; nothing sent, clean failures). check-dm-thread-v3.js -> JS click dispatched, probe_found=true, initial DM the only bubble with "Sent" marker; NO reply. send-eligibility.py --action followup-f1 rc=0 ELIGIBLE. F1 SENT via send-dm-v3.js (overlays=escape-dismissed, message_button_js=dispatched, chat_opened=true, text=inserted len=594, send=enter pressed, verify_sent_text_visible=true, screenshot C:/Users/nolan/pig-fb-r159/shots/genesis-f1-send-1790648656269.png). In-thread verification PASSED. Draft copy: drafts/dm-round159-genesis-appliance-f1.txt. Ladder at 2 touches; F2 window 2026-10-03 to 2026-10-07.
- F1 #3 D20 Locksmith Services: HELD, no send. check-dm-thread.js found 0 Message buttons; check-dm-thread-v3.js also 0; check-page-generic.js (x2, 20s apart) shows the Page now renders "This content isn't available right now" (deleted, unpublished, or visibility-restricted by owner). F1 window is 2026-09-29 to 2026-10-02, so a later re-check may recover if the Page returns; the draft stays staged at drafts/dm-round159-d20-locksmith-f1.txt. Note: initial thread itself still existed in the Messenger chat list, but DMing a Page with no public presence is fail-closed HELD.
- TASK B PROFINISH DRYWALL & PAINT, LLC (round-159 new candidate): check-page-generic.js on profile.php?id=61577181835253 -> (1) Page EXISTS, resolves to slug therealprofinishdrywallpaintLLC, name "Profinish Drywall & Paint", category Contractor, description "ProFinish Drywall & Paint, LLC delivers top-quality drywall & paint services w/expert craftsmanship"; identity anchored via discovery (the promo post was authored by this Page itself, post-published phone 970-765-1223) + Page-published location Austin, CO 81410 / service areas Delta, Montrose, Cedaredge, Hotchkiss, Paonia. (2) NAMESAKE REJECTED: Delta-area LLC, distinct from A-Pro-Finish Drywall of Westminster (pipeline L501). (3) Message button OBSERVED (hasMessageButton=true). VERIFICATION PASSED 3/3.
- Profinish initial DM: send-eligibility.py --action dm rc=0 ELIGIBLE (gmail_sent_count=0, structured_touches=0). First attempt send-dm-v2.js failed at the Message-button Playwright click (nothing sent, clean failure). Retry send-dm-v3.js -> SENT, chat_opened=true, chat_input_focus=focused, text=inserted len=720, send=enter pressed, verify_sent_text_visible=true, screenshot C:/Users/nolan/pig-fb-r159/shots/profinish-initial-send2-1790648767373.png. In-thread verification PASSED. Draft: drafts/dm-round159-profinish-drywall-paint.txt (slogan "We Actually Call People Back" angle, disclosure + AI identity + blank-line sentences + "PING Social, (970) 589-3309" sign-off, no em dashes, ~95 words). Ladder at 1 touch; F1 eligible 2026-10-02 to 2026-10-05.
- SIDE INTEL (flagged for parent, not acted on): the GNF thread-check's Messenger chat-list scan showed SouthWest Tree Service (round-158 initial, 2026-09-28) has an auto-reply in-thread: "Hi, thanks for contacting us. We've received your message and appreciate you reaching out. We will get back to you as soon as possible. Thank you!" (~5h). Generic auto-responder, not a human reply; ladder stays. Also observed: "Chat history is missing / Enter your PIN to restore chat history" notice persists; "New message requests" from 8 senders and 1 unread Marketplace message exist but are unrelated to outreach threads and were untouched.
- No Messenger-CLI involvement anywhere (standing transport: Pig headed-Chrome CDP :9223).

## Round 160 — D20 Locksmith Services F1 re-check (Page still unavailable) — 2026-09-29 ~02:25 MDT (2026-09-29 08:25 UTC); Pig-side read-only check
- Re-check: check-page-generic.js via portable Windows node (NODE_PATH=C:/Users/nolan/.local/share/pigi/fb-engage/node_modules; script staged at C:/Users/nolan/pig-fb-tmp/check-page-generic.js). Result: Page STILL renders "This content isn't available right now" (deleted/unpublished/restricted); hasMessageButton=false. Fail-closed: F1 stays HELD. F1 window 2026-09-29 to 2026-10-02; re-check in a later run.
- 2026-09-29 UTC DM count: 3/10 (no DM sends this run). Transport healthy (PIG_OK, BatchMode=yes).
- Invocation pattern confirmed working: NODE_PATH env propagates from WSL bash to Windows node.exe; script must live under C:/Users/... (copied from /home/nolan/workspace/pig-fb/).

## FB delta-scan 2026-09-29 19:21 MDT (discovery-research sweep discovery-2026-09-29-1921); research-only, no DMs
- 63 posts scanned above watermark 1790709456 across the 6 Western Colorado groups (9/20/4/0/18/12); watermark advanced to 1790731344 (max observed post time 19:22:24 MDT).
- Candidates: 0. No genuine home-service/trade business promos in window. No Page/Message-button checks run.
- Near-misses triaged out: Varner Equipment (Delta, online farm-equipment auction promo, out of segment); "Aspen Firewood/Split Cord $250" (Brent Howell, personal-profile resale, no business identity); "ISO: Mechanic" demand-side seeker; 13 image-only posts resolved via OCR (craft fair, art open studios, rentals/tours air-show promo, bingo, grill, daycare promo) or marked unresolved (5). New-business radar: 0 hits. Full triage: goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/fb-scan-2026-09-29-1921.md.

## FB delta-scan 2026-09-30 01:21 MDT (discovery-research sweep discovery-2026-09-30-0121); research-only, no DMs
- 44 posts scanned above watermark 1790731344 across the 6 Western Colorado groups (WCMB 4 / BuySellGJ 20 / Delta 5 / OrchardMesa 1 / Fruita 13 / LivingInGJ 1); watermark advanced to 1790752662 (max observed post time 2026-09-30 01:17:42 MDT).
- NEW CANDIDATE: Paint Wizards - family-owned, licensed and insured painting company, Grand Junction, in business ~2 years, painters 10+ yrs experience. Promo post 2026-09-29 19:44 MDT in Western Colorado Message Board & Classifieds (post 28673719638933571, https://facebook.com/groups/5456977881034408/permalink/28673719638933571/), authored by Taylor Helms (personal profile, owner_id 100002227800292) via facebook-cli post read. Phone 970-730-4052 (CALL OR TEXT, post-published; also in promo image OCR: room special 8x12 $500, ceilings/trim/doors, free estimates, commercial/residential/interior/exterior). Services: residential + commercial interior/exterior painting. DM route: NOT verified - no business Page found (social.search surfaced Integrity Painting and Prime Painting Experts instead); author is a personal profile, not a business Page. Honest channel: published phone/SMS 970-730-4052. Status: NEW, no outreach sent. Dedupe-clean across leads.md, pipeline.md, facebook-dms.md, canonical JSONL.
- Repeat sighting (no new row, vitality + rebrand intel): Scott Rush (dad-and-son junk hauling startup, already pipeline NEW/WARM since round 52, leads.md, 970-778-1219) - new promo post 2026-09-29 20:20 MDT in WCMB (post 28674018818903653), authored by the Explore Mesa County Page (ID 61591600341870), not Scott himself: third-party "shoutout" branding him as "Scott Rush with Grand Junction Movers & Your Local Handyman" (moving & large item delivery, painting & garage cleanouts, yard clean up & home repairs). Repositioning intel: expanded from junk hauling to moving/handyman/painting/yard; "featured as a trusted local partner on Grand Valley Welcome Mat & Explore Mesa County". Phone (970) 778-1219 in caption + image OCR. No duplicate row created.
- Near-misses triaged out: Katie Webb / The Massey Team ReMax Rise Up realtor listing (WCMB, out of segment); air compressor personal sale (WCMB); all 20 BuySellGJ posts personal resale (tents, TV, jewelry, BMX, etc.); Dr. Ray/Jean wellness LIVE + North Fork Flowers homecoming promo + Paradise Theatre screening (Delta, out of segment); helicopter-tour business-partner seeker duplicated 2x (Fruita, out of segment); skulls sale, missing-person alert, found-cat, straw-bale ISO (demand-side), sunset photos (Fruita, personal); 4 image-only empty-caption posts (Delta x2, OrchardMesa x1, Fruita x1, LivingInGJ x1) left unresolved, no business signal.
- New-business radar: 0 hits (grand opening / now open / just launched / open for business, case-insensitive). No hiring/growth signals in-window. 0 DMs sent/attempted (read-only lane). Full triage: goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/fb-scan-2026-09-30-0121.md.

## FB delta-scan 2026-09-30 07:21 MDT (discovery-research sweep discovery-2026-09-30-1321); research-only, no DMs
- 64 posts scanned above watermark 1790731344 across the 6 Western Colorado groups (WCMB 6 / BuySellGJ 19 / Delta 8 / OrchardMesa 1 / Fruita 20 / LivingInGJ 10); watermark advanced to 1790774338 (max observed post time 2026-09-30 07:18:58 MDT).
- NOTE: watermark file still held 1790731344 (01:22 UTC) at scan start; the 2026-09-30-0121 run claimed advancing to 1790752662 but the write never landed. This run re-covered the 01:22-07:17 UTC overlap; both overlap businesses (Paint Wizards post 28673719638933571, Scott Rush shoutout post 28674018818903653) were deduped against existing rows, no duplicates created.
- Candidates: 0. No new stageable home-service/trade business promos in window. No Page/Message-button checks run (nothing to check).
- Overlap dedupe: Paint Wizards (WCMB, already staged 2026-09-30-0121) and Scott Rush "Grand Junction Movers & Your Local Handyman" shoutout (WCMB, already pipeline WARM with repeat-sighting enrichment) re-observed, no new rows.
- Near-misses triaged out: realtor commercial-property listing + RV/for-sale items (WCMB); all 19 BuySellGJ posts personal resale (tools, honey, furniture, clothing, vintage items); Delta: kitten plea, ag-property ad, stress spam, North Fork Flowers florist promo (out of segment), Paradise Theatre screening, donation ask; Fruita: missing cat, found skinny cat, "who can come get rid of this for me" (demand-side junk removal ask), straw-bale ISO (demand-side), sunset photos, skull sales; LivingInGJ: "ISO: Mechanic" 1990 Jeep (demand-side auto), "good reliable handy man" (demand-side ask, intel only), dog chiro ask, ballet promo, book promo, heavy-equipment job seeker.
- New-business radar: 0 keyword hits (grand opening / now open / just launched / open for business / hiring / now booking / accepting new, case-insensitive). No hiring/growth signals in-window. 0 DMs sent/attempted (read-only lane). Raw captures: /tmp/fb-wcmb.json, /tmp/fb-bsgj.json, /tmp/fb-delta.json, /tmp/fb-orchard.json, /tmp/fb-fruita.json, /tmp/fb-ligj.json (ephemeral).

## FB delta-scan 2026-09-30 13:21 MDT (discovery-research sweep discovery-2026-09-30-1921); research-only, no DMs
- 54 posts scanned above watermark 1790774338 across the 6 Western Colorado groups (WCMB / BuySellGJ / Delta / OrchardMesa / Fruita / LivingInGJ); watermark advanced to 1790803044 (max observed post time 2026-09-30 13:17 MDT). Raw captures: /tmp/fb-{wcmb,bsgj,delta,orchard,fruita,ligj}.json (ephemeral).
- Candidates: 0. No new stageable home-service/trade business promos in window. No Page/Message-button checks run (nothing to check).
- Repeat sighting (no new row, vitality only): Your House Will Sparkle / Keisha Crawford (house cleaning, Montrose/Olathe/Delta) - third promo wave 2026-09-30 17:41 UTC (WCMB post 28682434961395372 + Delta post 1815212469903791), already pipeline L1877 WARM. Page 61588881047288 profile info 403 (not accessible); DM route stays unverified.
- Vitality note: Uprooted Tree Care (already CONTACTED) job video in Palisade (Delta post 1815186969906341) - no action.
- Near-misses triaged out: event-center promo, auto-body complaint, memorial poker run, home-health hiring post, realtor video, restaurant promo (all image-only posts resolved via OCR, none home-service promos).
- New-business radar: 0 keyword hits. 0 DMs sent/attempted (read-only lane).

## FB delta-scan 2026-09-30 19:21 MDT (discovery-research sweep discovery-2026-10-01-0121); research-only, no DMs
- 46 posts scanned above watermark 1790803044 across the 6 Western Colorado groups (WCMB 7 / BuySellGJ 20 / Delta 4 / OrchardMesa 1 / Fruita 12 / LivingInGJ 2); watermark advanced to 1790817232 (max observed post time 2026-09-30 19:13:52 MDT).
- LOGGED SIGNAL, NOT STAGED (no contact route): Jonathan Gonzalez Cisneros (personal profile, owner_id 1038726346, handle gonnee.cisneros) posted a trade promo flyer in BuySellGJ 2026-09-30 18:04 MDT (post 3428909097317184, https://facebook.com/groups/108728816001912/permalink/3428909097317184/): "REMODELING & CLEANING / PAINTING / FENCE / PERGOLAS / CLEANING", 81501, "A sus ordenes". facebook-cli post read + social.search both resolve author to the personal profile only; no business Page, no phone, no email in post or profile. Dedupe-clean across pipeline.md, leads.md, canonical JSONL. Parked as logged signal: no contact route means the engine has nothing to work; if a Page or phone surfaces later, stage then.
- Repeat sighting (no new row, vitality only): Delta-group promo 2026-09-30 17:11 MDT (post 1815541073204264) dual-branding Coyote Rolloff Services (Page 100088807365318) + High Desert Haulers (Page 61559100902731) dumpster rental ("you are not just a number ... neighbor") - both already tracked (pipeline junk-hauling rows, DM-lane Page checks recorded 2026-09-27). Active-marketing vitality signal for the engine.
- Near-misses triaged out: all WCMB posts personal resale (tools, mower, RAV4, boxing bags, craft fair); all BuySellGJ posts personal resale except the Gonzalez promo; Delta: community help ask, Paonia remodeled-home realtor listing, empty-caption post; Fruita: lost/found, community events, food truck, shoutout to "Andrew Yates and his crews" (volunteer cleanup at Burger King, no business named, unverifiable); OrchardMesa + LivingInGJ: empty-caption posts only, no business signal.
- New-business radar: 0 keyword hits (grand opening / now open / just launched / open for business). 0 hiring/growth signals in-window. 0 DMs sent/attempted (read-only lane). Raw captures: /tmp/fb-scan-2026-10-01.txt + summary (ephemeral).

## FB delta-scan 2026-10-01 01:21 MDT (discovery-research sweep discovery-2026-10-01-0721); research-only, no DMs
- 33 posts scanned above watermark 1790817232 across the 6 Western Colorado groups (WCMB 2 / BuySellGJ 19 / Delta 1 / OrchardMesa 0 / Fruita 6 / LivingInGJ 2); watermark advanced to 1790833857 (max observed post time 2026-10-01 ~01:10 MDT). Raw captures: goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/fb-raw-20261001-0721-<groupid>.json (durable, not /tmp).
- CANDIDATE STAGED (1): Ashby Built (Cedaredge, shed builder). 3 same-day promos in BuySellGJ (posts 3429006440640783 / 3429009157307178 / 3429010647307029, ~19:17-19:19 MDT): "Sheds Built On Site | Starting at $1,000 | Western Slope CO". Author identified via social.search post_url: Chet Ashby (handle chet.ashby, profile 612893068), personal profile posting the business promo. Own site ashbybuilt.com verified live 2026-10-01: based Cedaredge CO 81413, full pricing/build details/warranty, published phone (970) 939-6738 + email CABASHBY@GMAIL.COM. Dedupe CLEAN: zero hits for "Ashby Built"/"Chet Ashby"/"939-6738" across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl. Staged to pipeline.md as NEW/WARM, source=facebook-scan. Page/Message-button check: no business Page with Message button observed; author posts via personal profile; fallback = published phone + email (own site).
- New-business radar: 1 keyword hit, OUT OF SEGMENT, not staged: Fruita group post 4484472325159877 (~21:33 MDT): "It's time for our Grand Opening Event!! ... one of a kind Bookstore! ... Saturday October 3rd ... coffee, baked goods, charcuterie, self serve wine station" - retail bookstore, not a home-service trade business. Recorded as radar intel only.
- Near-misses triaged out: all WCMB posts personal resale (fishing rod, yard sale); 16 BuySellGJ posts personal resale (fridge, books, golf clubs, boots, baby bundle, broncos helmet, house-share, massage table, vintage items) + 1 empty-text post; Delta: 1 empty-caption post; Fruita: coffee micro-vendor promo ("100 coffees ... Message for address"), personal asks (Gizmo charger, acorns), sunset photo, 1 empty-caption post; LivingInGJ: Junktown Flea Market Oct 24 event (vendor spaces), "To our veterinary community" B2B wellness/retreat promo for vet teams (out of segment).
- New-business radar keyword scan (grand opening / now open / just launched / open for business): 1 hit (bookstore, out of segment). No hiring/growth signals in-window. 0 DMs sent/attempted (read-only lane).

## FB delta-scan 2026-10-01 07:21 MDT (discovery-research sweep discovery-2026-10-01-1321); research-only, no DMs
- 15 posts scanned above watermark 1790833857 across the 6 Western Colorado groups (WCMB 0 / BuySellGJ 6 / Delta 2 / OrchardMesa 0 / Fruita 5 / LivingInGJ 2); watermark advanced to 1790860834 (max observed post time 2026-10-01 07:20 MDT). Watermark file write verified this run. Raw captures: goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/fb-raw-20261001-1321-<group>.json (durable).
- CANDIDATE STAGED (1, new-business radar): Kokopelli Lawn Company LLC (Grand Junction/Fruita, lawn aeration + overseeding + organic fertilizing). Fruita post 4484972815109828 (2026-10-01 07:19 MDT): "I just started this small buisness aerating, overseeding, and organic fertilizing lawns... firefighter owned and operated". Author resolved via facebook-cli post read (not social.search; post read exposed owner): Kokopelli Lawn Company LLC, Page owner_id 61594294994926. Flyer OCR phone (970) 628-0595. SOS corroboration: DLLC 20268161856 filed Sep 20, 2026, 288 Cherry Ln, Grand Junction CO 81503 (Spot On Colorado, data.colorado.gov-sourced). Dedupe CLEAN: existing pipeline "Kokopelli" rows are the unrelated Kokopelli Home Services handyman (GJ, owners Dana & Ben Russell); zero exact-phrase "Kokopelli Lawn" hits across leads.md, pipeline.md, facebook-dms.md, western-co-prospects.jsonl. Staged to pipeline.md as NEW/WARM, source=facebook-scan + new-filing (filed 11 days ago). Page/Message-button check: facebook-cli profile info 403 (profile only readable by viewer/friends); Message button unverified; fallback = published flyer phone.
- New-business radar: 1 keyword hit, STAGED (Kokopelli Lawn Company, above). No other hiring/growth signals in-window. 0 DMs sent/attempted (read-only lane).
- Near-misses triaged out: BuySellGJ Colorado Birth Collective therapy promo (cross-posted to LivingInGJ; health, out of segment), 5 personal-resale sale posts (pie cupboard, essential oils, chain hoist, vase, beam trolleys); Delta: chiropractor office-hours promo (health, out of segment), lost-dog post; Fruita: fall photography mini sessions (creative service, out of segment), community greeting posts; LivingInGJ: 1 empty-caption post.

## FB delta-scan 2026-10-01 13:21 MDT (discovery-research sweep discovery-2026-10-01-1921); research-only, no DMs
- 60 posts scanned above watermark 1790860834 across the 6 Western Colorado groups (WCMB 6 / BuySellGJ 19 / Delta 7 / OrchardMesa 5 / Fruita 12 / LivingInGJ 11); watermark advanced to 1790882553 (Fruita Warp Zone post, 13:22 MDT). Watermark file ~/workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/fb-delta-watermark.txt holds 1790882553. Raw captures: discovery-scratch/fb-raw-20261001-1921-<groupid>.json (durable).
- Candidates: 0. Window dominated by auto-dealer ads, real-estate listings, used-goods sales, bakery promos, one political flyer; no genuine new home-service/trade business promos.
- Repeat sighting (no new row, vitality only): Scott Rush (pipeline NEW/WARM, leads.md L3238, 970-778-1219) posted dump-run/big-item side-job promos in BuySellGJ + LivingInGJ 13:19 MDT, listing a SECOND phone: 9709771219. Authorship confirmed via post read (owner_name Scott Rush). Posts: https://facebook.com/groups/108728816001912/permalink/3429913003883460/ and https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3452591704929767/
- Demand signals (informational, not candidates): mobile pet-groomer ISO (Fruita), window-blinds + installation ISO (GJ), box-spring disposal ISO (GJ).
- New-business radar: 0 keyword hits. 0 DMs sent/attempted (read-only lane). Full triage: discovery-scratch/fb-scan-20261001-1921.md.
