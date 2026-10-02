# Facebook group scan — round 34 (delta-scan #29, read-only)

- Window: 2026-09-12 00:45 MDT → 2026-09-12 ~11:15 MDT (min-timestamp 1789195507, next watermark 1789233105)
- Mode: facebook-cli groups posts read-only; NO browser login, NO likes, NO comments, NO DMs. No DMs sent (Facebook browser session logged out; Messenger CLI refuses non-contacts).
- Method: `groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1789195507` per group, 10 groups. Authors identified with social.search post_url lookups (facebook-cli strips authors). 12/12 lookups resolved.
- Total: ~60 posts retrieved across 10 groups. New genuine prospects: 3. Repeat sightings: 0. New-business radar hits: 0. Demand signals: 2 (noted, not pursued).

## Per-group post counts and highlights

1. Western Colorado Message Board & Classifieds (5456977881034408) — 8 posts. Resale/curb alerts, one sourdough fundraiser, one "ISO someone to come do a pick up today" (demand signal for a hauler, not a business promo).
2. Buy & Sell in Grand Junction (108728816001912) — 20 posts. All resale (exercise bike, sourdough, garden cart, evaporative cooler, etc.).
3. Delta, Colorado Community Message Board (1504277980997243) — 4 posts. Two empty captions resolved: Tacos TwoDay (food, skip) and Bill van Houten (personal, no verifiable promo, skip). One Lovemore Real Estate/T rue West Box & Fitness downtown post (real estate and fitness, skip). One "It's time for a change" caption-only post, no verifiable business (skip).
4. Orchard Mesa, Colorado Message Board (486356801008208) — 2 posts. Colorado Cinderella pageant promo (skip); one empty caption resolved to Happy Dog Pet Grooming (see prospects).
5. Fruita, Colorado Message Board (3741333852807065) — 20 posts. Restaurants/food (Junct'n Square Pizza, Fruita Tavern, farmers market, apple picking), a patio-DIY advice request (demand signal, not a promo), two empty captions resolved to personal profiles (Elliott Ramage, Susan Rawlins, skip).
6. Living In Grand Junction Colorado (1082777608577867) — 6 posts. Warp Zone gaming promo (entertainment, skip), pageant, ranch beef sale, gig promo, one empty caption resolved to Kristen Preuss (personal, skip).
7. Colorado Business Mingle (5355730651191326) — 1 post. Farmers market mention, not a promo.
8. Colorado Business Networking (2803047646497352) — 20 posts. Two empty captions resolved to non-promos (Lisa Joy Poole, camper-van bio; BrandShamans brand page). Skips: Pix & Props photo booth promo (events, not home service), European Wax Center training free-wax post (Lone Tree/Front Range, beauty), realtor tips, "Message me for your next event!" (no verifiable business). One mobile detailing promo kept (see prospects).
9. Glenwood Springs Colorado Message Board (2370574193230682) — 1 post. Multi-family yard sale (skip).
10. What's Happening In Palisade (2569745986668554) — 4 posts. Farmers market cookies post, guitar-duo "Stop by if you get the chance!" (entertainment, skip), two mobile detailing promos (see prospects).

Note: Buy & Sell GJ, Fruita, and Colorado Business Networking returned 20 results (max page per call), so mid-window posts below the page may exist; watermark still reflects the newest post seen.

## New genuine prospects (3)

1. Copeland's Detailing Domain — mobile detailing — Palisade, CO area
   - Author: Copeland's Detailing Domain (Facebook Page; bio "Professional Detailer at Copeland Detailing Domain")
   - Two posts ~09:46 and 09:54 MDT: "Details at a competitive price! 100% mobile... 11 years of experience"; second covers fleet/RVs/boats/motorhomes/dump trucks/tractor trailers
   - Contact published in post: 970-216-0930 (call or text), in both posts
   - Post URLs: https://facebook.com/groups/whatshappeningpalisade/permalink/4112880229021781/ and https://facebook.com/groups/whatshappeningpalisade/permalink/4112885529021251/
   - Opportunity: MISSED_CALL_LEAD_CAPTURE / AUTOMATION (mobile detailer booking by phone, fleet angle). High confidence.
   - Parked DM draft:
     > Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
     >
     > Saw your post in the Palisade group. Eleven years of mobile detailing and fleet work is a solid run. If missed calls during jobs or slow follow-up ever cost you a booking, PING Social sets up simple systems that catch every inquiry, handle scheduling, and keep you in control. I work with Western Slope home-service businesses. Open to a short chat about what it would look like for your operation? Nolan, PING Social, (970) 589-3309, nolangesk@gmail.com

2. Memphis Auto Spa — mobile detailing — town unlisted
   - Author: Anderson Robert (personal profile, anderson.robert.491962), posted in Colorado Business Networking
   - Post ~09:48 MDT: "After Memphis Auto Spa Love, 206-843-4424, Book your appointment, #mobiledetailing #detailing #carwash"
   - Contact published in post: 206-843-4424. Note: 206 is a Seattle area code; posted in a Colorado business group but location is unverified. Flag before pursuing.
   - Post URL: https://facebook.com/groups/2803047646497352/permalink/4066510880151016/
   - Opportunity: MISSED_CALL_LEAD_CAPTURE / SOCIAL_PRESENCE (appointment-based mobile detailing). Medium confidence (location uncertain).
   - Parked DM draft:
     > Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
     >
     > Saw your Memphis Auto Spa promo in the Colorado business group. Mobile detailing lives and dies by catching every call, and I help service businesses set up simple systems that capture every inquiry and handle booking without adding admin work. I work with service businesses across Colorado. Worth a short chat on what that would look like for you? Nolan, PING Social, (970) 589-3309, nolangesk@gmail.com

3. Happy Dog Pet Grooming — pet grooming — Grand Junction, CO (Jurassic Bark)
   - Author: Happy Dog Pet Grooming (Facebook Page; Heather, grooming out of Jurassic Bark in Grand Junction, "Now accepting new clients")
   - Empty-caption image post ~09:43 MDT in Orchard Mesa group; business identified via social.search author lookup
   - Contact published in post: none (no phone/email in post or bio). Reach would be via the Facebook Page.
   - Post URL: https://facebook.com/groups/486356801008208/permalink/1104338969209985/
   - Opportunity: SOCIAL_PRESENCE / AUTOMATION (appointment-driven solo groomer actively seeking new clients). Medium confidence. Trade is pet grooming, borderline home-service; logged as a real local service business.
   - Parked DM draft:
     > Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another.
     >
     > Saw your Happy Dog Pet Grooming post in the Orchard Mesa group and that you are taking new clients at Jurassic Bark. If juggling booking messages around grooming appointments ever gets hectic, PING Social sets up simple systems that catch every inquiry, handle scheduling, and keep you in control of your books. I work with local service businesses in Grand Junction. Open to a short chat on what it would look like for you? Nolan, PING Social, (970) 589-3309, nolangesk@gmail.com

## Observed-but-not-pursued
- Tacos TwoDay (Delta group, food truck, empty caption) — restaurants/food excluded
- Bill van Houten (Delta, personal, empty caption) — no verifiable business
- Elliott Ramage, Susan Rawlins (Fruita, empty captions) — no verifiable business
- Kristen Preuss (Living in GJ, empty caption) — no verifiable business
- Lisa Joy Poole, BrandShamans (Colorado Business Networking, empty captions) — not home-service promos
- Lovemore Real Estate / True West Box & Fitness (Delta) — real estate/fitness excluded
- Warp Zone (Living in GJ) — entertainment excluded
- Pix & Props photo booth, "Message me for your next event!" (Colorado Business Networking) — events, not home service
- European Wax Center training (Lone Tree) — Front Range, beauty
- Colorado Cinderella pageant, realtor tips, guitar duo Rick & Fred, patio advice requester, farmers market posts — excluded per triage rules

## Repeat sightings
- None this window (all three prospects are first-time sightings).

## Demand signals (noted, not pursued)
- WC Message Board "ISO someone to come do a pick up today" — demand for hauling service, 10:52 MDT. Relevant if a hauler prospect appears.
- Fruita "turn this mangy garden bed into a patio sit spot" advice request — homeowner DIY, not a business.

## New-business radar
- No "grand opening" / "now open" / "just launched" posts this window.

## Watermark
- Max post timestamp seen: 1789233105 (2026-09-12 11:11:45 MDT, Buy & Sell GJ recumbent-bike resale post). Next scan should use min-timestamp 1789233105.
- facebook-cli session: healthy. social.search post_url lookups: 12/12 resolved this window (cumulative strong).
