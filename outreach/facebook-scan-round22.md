# Facebook delta-scan #17 (Round 22) — new posts since 20:15 MDT

**Window:** 2026-09-10 20:15 to ~23:25 MDT (watermark 1789092928). Scanned all 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --min-timestamp 1789092928`. 36 posts total. 14 posts came back with empty content fields; all 14 were resolved via social.search post_url lookups (14/14 succeeded), which surfaced 3 genuine business promos hidden behind empty captions. 3 new prospects, deduped against facebook-dms.md, pipeline.md, and leads.md (zero hits on "Epoxy Plugs", "High Plains", and Cortez Coatings LLC specifically; "Cortez" hits in pipeline.md are all the town of Cortez, CO). No DMs sent and none attempted (Facebook browser session in blackout until 2026-09-11 16:05 MDT; Messenger CLI cannot send to non-contacts). Parent merges prospects into pipeline.md as NEW.

## Per-group counts

| Group | Posts |
|---|---|
| Western Colorado Message Board & Classifieds | 2 |
| Buy & Sell in Grand Junction | 11 |
| Delta, Colorado Community Message Board | 3 |
| Orchard Mesa, Colorado Message Board | 1 |
| Fruita, Colorado Message Board | 8 |
| Living In Grand Junction Colorado | 1 |
| Colorado Business Networking | 7 |
| Colorado Business Mingle | 0 |
| What's Happening In Palisade, CO / Business Board | 3 |
| Glenwood Springs Colorado Message Board | 0 |
| **Total** | **36** |

## New prospects (3, all Denver/front-range outward-expansion)

1. **Cortez Coatings LLC** — painting (interior/exterior), "Denver's flawless painting company", serves Castle Rock to Fort Collins. Posted by the business Page (handle cortezcoatingsllc) in Colorado Business Networking at 20:47 MDT; caption was empty in the group API but the post_url lookup confirmed a painting-promo photo post. Phone **303-619-6547** published in Page bio. Post: https://facebook.com/groups/2803047646497352/permalink/4064610023674435/

2. **Denver Epoxy Plugs** — epoxy flooring artist. Posted by Styles Lucero (handle steven.lucero.399488; bio: "CEO owner of Denver epoxy plugs") in Colorado Business Networking at 20:27 MDT; photo carousel, caption empty in group API. Bio says "DM me for a free quote"; no phone published. Post: https://facebook.com/groups/2803047646497352/permalink/4064591767009594/

3. **High Plains Concrete & Contracting** — concrete contracting, locally owned, serves the front range of Colorado. Posted by the business Page in Colorado Business Networking at 20:08 MDT; caption empty in group API, photo promo. No phone published in bio. Post: https://facebook.com/groups/2803047646497352/permalink/4064578767010894/

## Observed but not pursued

- COBizNet "free website system for contractors" post (20:51 MDT): a web-dev solicitation aimed at Denver/Colorado Springs tile, fencing, flooring, epoxy, and junk-removal contractors (asks for 2 contractors to beta-test a free website system for feedback). B2B solicitation, not a home-service business promo; also a dev offering overlapping PING's own pitch. https://facebook.com/groups/2803047646497352/permalink/4064565187012252/
- The Cabin Escape Room (Delta, 2 photo posts): entertainment venue, not a home-service trade.
- COBizNet personal posts: Crystal Garcia, David Deighton, Manuel Medellin (photo-only, no business).
- Personal photo-only posts: Isabel Otis (Delta), Karina Prieto (Orchard Mesa), Elizabeth Nunn (Fruita x2), Armida Carballo and Aaron Badolato (Buy & Sell GJ).
- Resale listings (WCMB, Buy & Sell GJ): 350 Chevy engine, hideabed couch, Glade Park real estate listing, jukebox, iPhone 16, electric golf carts x2, weights sets, baby activity center.
- Food/events/community: Palisade pupusas food-truck update, Living In GJ dog event, Fruita ducklings, football cup sale, AI petition share, sunset photo, addiction-resource ask, Palisade elections discussion.
- COBizMingle and Glenwood Springs: 0 posts in window.

## Buyer-demand signals

None this window. No homeowner posts asking for a trade.

## Parked DM drafts (nothing sent)

1. Cortez Coatings LLC: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi there, I saw your Cortez Coatings post in Colorado Business Networking. Running interior and exterior painting crews across Castle Rock to Fort Collins means estimate calls come in while your team is on ladders. I help owner-led trade businesses capture every call and message automatically and cut the admin busywork, while the owner stays fully in control. We are running a limited-time trial with a few Colorado companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

2. Denver Epoxy Plugs / Styles Lucero: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi Styles, I saw your Denver Epoxy Plugs photos in Colorado Business Networking. Epoxy floors photograph well, but quote requests come in while you are mid-pour on someone else's garage. I help owner-led trade businesses capture every inquiry automatically and cut the admin busywork, while the owner stays fully in control. We are running a limited-time trial with a few Colorado companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

3. High Plains Concrete & Contracting: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another. Hi there, I saw your High Plains Concrete & Contracting post in Colorado Business Networking. Concrete crews are on pours all day, so estimate requests that come in mid-job sit unanswered until evening. I help owner-led trade businesses capture every call and message automatically and cut the admin busywork, while the owner stays fully in control. We are running a limited-time trial with a few Colorado companies. Open to a 15-minute chat next week? Nolan Geske, PING Social, (970) 589-3309"

## Notes

- Empty-caption resolution is now routine and high-yield: 14 empty posts this window, 3 were genuine business promos (all in COBizNet). Keep doing post_url lookups on every empty post in business groups; skip lookups in pure resale groups only after confirming the group pattern (Buy & Sell GJ empties resolved to personal photo-only resale listings).
- COBizNet remains the steady trade-promo source; all 3 prospects tonight were Denver/front-range (outward-expansion), none Western Colorado.
- Watermark: next scan should use min-timestamp 2026-09-10 23:30 MDT (unix 1789104600).
