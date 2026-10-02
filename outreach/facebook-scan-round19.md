# Facebook delta-scan #14 (Round 19) — new posts since 11:15 MDT 2026-09-10

Scan time: 2026-09-10 ~14:53 MDT. Method: facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789060528` on all 10 target groups, then social.search post_url lookups for author identification (all 4 succeeded).

**Result: 3 new genuine prospects.** Deduped against pipeline.md, leads.md, and facebook-dms.md (grep on business name, owner name, phone: zero hits). No DMs sent and none attempted (browser session logged out; Messenger CLI cannot send to non-contacts). Drafts parked below; parent adds to pipeline.md.

## New prospects

### 1. Legacy Home Solutions LLC — painting / home improvement, Grand Junction / Fruita area
- **Author:** Andres Perez (personal profile, handle elfamoso.andres.2025, 2 followers)
- **Group:** Fruita, Colorado Message Board (3741333852807065)
- **Post time:** ~12:30 MDT 2026-09-10
- **Post:** https://facebook.com/groups/3741333852807065/permalink/4462328654040911/
- **Published contact:** 970-258-7378 (phone in post text)
- **Summary:** Andres is building his own painting business and taking on side jobs: interior/exterior painting, surface prep, pressure washing, drywall repairs, general maintenance, free estimates. Self-employed startup, text-quote and estimate workflow is a textbook PING fit (missed calls = lost estimates).
- **Parked DM draft:** "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Andres, saw your Legacy Home Solutions post in the Fruita group about the painting and home improvement side work. We help owner-led trades capture every estimate inquiry and follow up automatically so no job slips while you are on the tools. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

### 2. Lamb Electric — residential electrical, location not stated (970 area)
- **Author:** Clint Lamb (personal profile, handle clint.lamb.94, 0 followers); identifies as owner
- **Group:** Colorado Business Networking (2803047646497352)
- **Post time:** ~11:02 MDT 2026-09-10 (13 minutes before the 11:15 watermark; not logged in scan #13, surfaced by late indexing)
- **Post:** https://facebook.com/groups/2803047646497352/permalink/4064148263720611/
- **Published contact:** 970-581-4057
- **Summary:** 30+ years in electrical, crew of four, residential work: troubleshooting, service calls, panel upgrades, EV chargers, hot tub wiring, lighting, basement finishes. Referral-driven lead flow, two-man front office (Clint + journeyman Todd); unanswered-call risk is the pitch.
- **Parked DM draft:** "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Clint, saw your Lamb Electric post in Colorado Business Networking, 30 years of referral business is impressive. We help small electrical shops answer every service call and panel-upgrade inquiry instantly so a referral never hits voicemail. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

### 3. Caudill Lawn Care Services — lawn care, family-owned (970 area)
- **Author:** the business Page itself (handle caudillawncareservices, 124 followers); operators Derrick & Laila Caudill
- **Group:** Colorado Business Networking (2803047646497352)
- **Post time:** ~08:58 MDT 2026-09-10 (before the watermark; never logged in scans #12/#13, surfaced by reindexing)
- **Post:** https://facebook.com/groups/2803047646497352/permalink/4064034087065362/
- **Published contacts:** Derrick 970-213-7556, Laila 970-213-7553, Derrickcaudill93@gmail.com, www.caudillawncareservices.com
- **Summary:** 17+ years landscape experience, family-owned lawn care business posting schedule openings ("openings this coming Monday and Tuesday"). Schedule-slot booking workflow is a direct PING fit.
- **Parked DM draft:** "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Derrick and Laila, saw your Caudill Lawn Care post about this week's openings. We help family-run lawn crews fill schedule gaps fast and capture every call and text inquiry so no booking slips through. We are running a limited-time trial with a few local companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

## Observed but not pursued
- AG Property Services re-posts (Delta, Orchard Mesa, Palisade groups): already logged prospect, repeat promo.
- Revelation Horseshoeing (Delta, 970-216-9171): farrier service, not a home-service trade.
- Bill van Houten empty-caption cluster (Delta x5, image-only personal posts): verified via post_url lookup, not business.
- Laundry recommendation post (Fruita): buyer recommendation, not a business promo.
- Health insurance JotForm post (Fruita): B2B insurance, out of segment.
- Fiber internet + free pizza promo (Fruita), web-design help ask (CB Networking): B2B, out of segment.
- Spun studio & supply bread promo (Palisade), Doughbra's Farm Stand (WCMB), El Rey Quesabirria (Fruita), Sunflower field event (Fruita), Mountain Harvest Festival (Living In GJ): food/events, out of segment.
- Colorado Business Networking: Gather & Grow faith event, tax planning post, realty open house, nail tech ($40 sets), D'art Gallery reception, Navigate Realty agent recruiting, Meta Ads marketer, diesel-mechanic hashtag post, web-design ask, business newsletter commentary.
- Colorado Business Mingle: 0 posts in window. Glenwood Springs: 1 community question. Buy & Sell GJ / WCMB: all resale listings (freezer, Peloton, nailer, garage sale Eckert, elk mount, Acura, Lincoln dealer ad).

## Notes
- facebook-cli min-timestamp is loosely applied (returned two pre-watermark posts that prior scans never logged); worth a quick grep-dedupe on every candidate, which this run did.
- social.search creation_time appears in the viewer's local timezone (MDT), consistent with the delta window.
- Colorado Business Networking keeps producing steady trade promos; Western Colorado groups were resale/food heavy in this window.
- Watermark: next scan should use min-timestamp 2026-09-10 14:55 MDT (unix 1789073700).
