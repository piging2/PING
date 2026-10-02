# Facebook group scan — round 30 (detached, read-only)

- Window: 2026-09-11 20:14 MDT → 23:15 MDT (min-timestamp 1789179241, next watermark 1789189984)
- Mode: facebook-cli groups posts read-only; NO browser login, NO likes, NO comments, NO DMs.
- Method: `groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1789179241` per group, 10 groups. Authors identified with social.search post_url lookups (facebook-cli strips authors). 10/10 lookups resolved.
- Total: 39 new posts across 10 groups. New genuine prospects: 1. Repeat sightings: 1. New-business radar hits: 0. Demand signals: 1.

## Per-group post counts and highlights

1. Colorado Business Networking (2803047646497352) — 8 posts
   - Liberty Painting LLC (FB Page 61578695768062): "give your home this beautiful transformation... message to get scheduled for a quote at no cost." Interior/exterior painting, Colorado. REPEAT SIGHTING: already in pipeline/leads/JSONL since round 21.
   - Ivy Massage in Greenwood Village recommendation (massage/wellness, not a home-service trade) — skipped.
   - Small Business Showcase video leaderboard — skipped (not a business prospect).
   - DTFXpress (printing) new UV printer growth post — skipped (not a home-service trade).
   - Manuel Medellin personal photo share (empty caption, resolved) — skipped.
   - Bull elk in rut photo — skipped.
   - Consultation no-show testimonial (coaching-style) — skipped.
   - Tattoo Aspen guest-tattooist promo (tattoo shop) — skipped (not a home-service trade).
2. Western Colorado Message Board & Classifieds (5456977881034408) — 3 posts, all personal resale (Makita tools x2, Jordan shoes) — skipped.
3. Buy & Sell in Grand Junction (108728816001912) — 12 posts
   - "Need your garbage can cleaned? Elijah Williams has you covered! ... Message him for more information on booking and pricing." Customer referral for Elijah Williams' trash can cleaning service, 22:22 MDT, cross-posted to Fruita + Living in GJ. NEW PROSPECT (see below).
   - Rest: garage sale notice, Dodge Challenger, Model T tire pump, planter boxes, bathroom sink, swing rail, Polaris RZR, vintage decor, Broncos jerseys, Mustang survival jacket, house for sale — all personal resale — skipped.
4. Delta, Colorado Community Message Board (1504277980997243) — 3 posts
   - Soda Saloon (soda fountain, food/beverage) empty-caption photo promo, cross-posted to Orchard Mesa — skipped (not a trade).
   - Phillip Crespin personal photos x2 (empty captions, resolved) — skipped.
5. Orchard Mesa, Colorado Message Board (486356801008208) — 3 posts
   - Soda Saloon repeat photo promo — skipped.
   - Karina Prieto personal photo (empty caption, resolved) — skipped.
   - Mariann Taigman personal photo (empty caption, resolved) — skipped.
6. Fruita, Colorado Message Board (3741333852807065) — 3 posts
   - Elijah Williams trash can cleaning referral (repeat cross-post, same prospect) — logged once.
   - 17-year-old job seeker (babysitting/help around house) — skipped (job seeker, not a business).
   - 9/11 sunset remembrance — skipped.
7. Living In Grand Junction Colorado (1082777608577867) — 4 posts
   - Elijah Williams trash can cleaning referral (repeat cross-post, same prospect) — logged once.
   - Paula Zimmerman Re/Max 4000 (real estate agent promo) — skipped (real estate excluded).
   - Mariann Taigman personal photo (empty caption, resolved) — skipped.
   - "Looking for a company to clean my sectional and a recliner. Prefer local over chain." (21:31 MDT) — DEMAND SIGNAL: upholstery/furniture cleaning demand, local preference. Logged as demand signal only, not a prospect.
8. What's Happening In Palisade Business Board (2569745986668554) — 2 posts
   - Candle making class (event, 9/20) — skipped.
   - Palisade Pizza and Pour House football game-night promo (food service) — skipped (not a trade).
9. Glenwood Springs Colorado Message Board (2370574193230682) — 1 post: Nepal fundraiser cancelled (community notice) — skipped.
10. Colorado Business Mingle (5355730651191326) — 0 new posts.

## New prospects (1)

### 1. Elijah Williams (trash can cleaning) — WARM
- Trade: trash can / bin cleaning (residential cleaning service)
- Town: unconfirmed; referral cross-posted in 3 Grand Junction-area groups (Buy & Sell GJ 22:22, Fruita 22:23, Living in GJ 22:23, all 2026-09-11 MDT)
- Contact info genuinely published: none (no phone, email, or site in post). Booking runs through Facebook Messenger to Elijah Williams (tagged in post; post author is the recommending customer, Lund Ash / ashley.lundstrom.94).
- Post: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3431786887010249/
- Website quality: unknown (no website observed). revamp_candidate: not assessed (no site to judge).
- opportunity_primary: SOCIAL_PRESENCE (medium confidence). Evidence: the service exists only as Facebook posts; quotes/booking happen by messaging Elijah Williams on Messenger; no website, online booking, or phone number observed. A bookable web presence plus reliable capture of every Messenger inquiry is the clean PING angle.
- opportunity_secondary: AUTOMATION (low confidence) — Messenger inquiries are easy to miss while out on jobs.
- priority_state: WARM — good trade fit plus a meaningful signal (organic customer referral cross-posted to three local groups in one evening).
- missed_call_risk: medium (inferred). stack_signals: UNKNOWN. social_presence: fb only. ai_discoverability: unknown.
- Dedup: not present in facebook-dms.md, pipeline.md, leads.md, or the canonical JSONL (checked "elijah", "bin cleaning", "trash" — the three "trash" JSONL rows are junk removal/hauling companies, unrelated).
- Next: DM route check via Messenger contacts when the engine is in contact-capable mode; otherwise watch. Parked DM draft below (nothing sent).

## Repeat sightings
- Liberty Painting LLC (interior/exterior painting, statewide CO, FB Page 61578695768062) posted a fresh promo in Colorado Business Networking at 23:02 MDT. Already in pipeline.md, leads.md, and the canonical JSONL since round 21. No new contact info published (Page bio CTA only).

## Demand signals
- Living in GJ 21:31 MDT: customer ISO a local (non-chain) company to clean a sectional and recliner. Signal/unverified. Not a prospect; a data point that upholstery-cleaning demand exists in GJ with a local-preference bent.

## Skipped with reasons
- Personal resale (tools, shoes, vehicles, furniture, decor, jerseys, garage sale, house listing): 15+ posts, not businesses.
- Food/beverage promos: Soda Saloon (Delta/Orchard Mesa cross-post), Palisade Pizza and Pour House — not home-service trades.
- Personal services: Ivy Massage (Greenwood Village), Tattoo Aspen — not home-service trades.
- Real estate: Paula Zimmerman Re/Max 4000 — excluded category.
- Job seeker (Fruita 17yo), 9/11 remembrance, Nepal fundraiser, candle class, Small Business Showcase leaderboard, DTFXpress printing, coaching testimonial, wildlife photo — out of scope.

## New-business radar
- No "grand opening" / "now open" / "just launched" posts this window.

## Parked DM drafts (nothing sent: detached read-only run; Messenger CLI non-contact restriction stands)

1. Elijah Williams (trash can cleaning): "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Elijah, saw your trash can cleaning service recommended in three Grand Junction groups tonight. Folks booking through Messenger means inquiries land whenever you are out on jobs, and the slow ones go quiet. We help one-person service shops capture every message instantly and turn them into booked jobs, keeping you in control. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

## Watermark
- Max post timestamp seen: 1789189984 (2026-09-11 23:13 MDT, Buy & Sell GJ garage sale post). Next scan should use min-timestamp 1789189984.
- social.search post_url lookups: 10/10 this window (2 in-scope business posts + 8 empty-caption resolutions).
