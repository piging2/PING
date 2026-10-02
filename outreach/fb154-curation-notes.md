# FB Pass 154 curation notes (2026-09-29 ~15:35 MDT)

Discovery: 534 candidates, 35 trade hits, all 20 group surfaces returned posts. Builder pre-filter: 534 -> 421 fresh; provisional 60 likes. Manual curation over the fresh pool (eyeball pass + post-read author verification + terminal-aware ledger recency check).

## Kept (5 likes + 3 comments, 8 actions)

1. LIKE + COMMENT: Chef Uma fall/winter menu promo — https://facebook.com/groups/2375845965922391/permalink/3503598579813785/ — Page 61587373535372, Montrose Thai truck (Page name "Chef Uma"). Locality STRONG (Montrose group promo, prior Montrose-group history; web check still pending for a fixed Montrose address but Page-based promo from Montrose group). Comment: "Nothing says fall in Montrose like a cozy Thai curry run."
2. LIKE + COMMENT: Cowboys & Aliens Ice Cream and Arcade homecoming sale — https://facebook.com/groups/1504277980997243/permalink/1814454683312903/ — Page 61556823683861, Hotchkiss (web-verified: 130 W Bridge St, Hotchkiss). Comment: "Homecoming sale AND an arcade? Hotchkiss kids are living the dream."
3. LIKE + COMMENT: Varner Equipment online auction — https://facebook.com/groups/1677940889636763/permalink/2299573084140204/ — Page 100063746153385, Delta (web-verified: 1375 Highway 50, Delta). Comment: "Auction season is the best treasure hunt in Delta County."
4. LIKE ONLY: Town of Cedaredge produce truck — https://facebook.com/groups/2646836605529865/permalink/4997828303764005/ — municipal Page 100064682857578 (community org, likes-only per body).
5. LIKE ONLY: Mutual Aid Partners weekly distro — https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3449565798565691/ — Page 100064773038536, GJ nonprofit (web-verified: 402 Grand Ave, Grand Junction; community org, likes-only per body).

Cross-post collapse: Chef Uma 2x (Montrose + Ridgway) -> 1; Varner 3x -> 1.

## Dropped (recency/terminal/out-of-corridor/identity)

- Bookcliff Media (Page 61592157620716): EXECUTED pass-141 + ledger EXECUTED observation 2026-09-28 21:35/21:50 UTC (~26h ago) on this exact post 3502767229896920. 7-day window, terminal block.
- B&S Express Sourdough Bakery (Page 100067175630615): ledger EXECUTED observation 2026-09-28 03:50 UTC (~34h ago) on post 4612916705697850. 7-day window, terminal block.
- Surf To Turf cotton candy (Page 61577454879701): FAILED 09-27 (pass-143 blind-spot finding). Terminal block on same content.
- Pix & Props Party Creations: web-verified Colorado Springs (Desert Lily Cir). Out of corridor.
- Falling Star HVAC (Page 100076060961007): Colorado Springs; engaged passes 103-104.
- Dreadhead Detailing (Page 61589655483561): engaged pass-143.
- DG Autoworks (Page 61588328076556): Henderson/Denver, out of corridor.
- Mahia Coffee & Bakery (Page 61584091464627): Thornton, out of corridor.
- Bread Basket Farm Stand (Page 61573248635047): commented 2026-09-24, 7-day window.
- Bodan's Detailing (Page 61555437704291): engaged pass-143.
- Smith Family Orchard Store (Page 100090652207638): recent engagement.
- Self-Hope Family Re-Store (Page 61563203553006): engaged pass-152.
- All personal profiles, job posts, for-sale, ISO, events, fundraisers, no-name posts: fail-closed.

## Ledger quirk confirmed again
`action-intent-ledger.py check` reports stale fixed intents for arbitrary URLs. Direct JSONL grep by post ID + intent_id -> observation is the reliable path. Bookcliff: 2 intent records (fb-20260928-213150), both observed EXECUTED. B&S: 1 intent (fb-20260928-033450), observed EXECUTED.
