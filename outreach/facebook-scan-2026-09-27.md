# Facebook prospecting delta-scan 2026-09-27

Run: Sun 2026-09-27 ~01:22 MDT. Read-only. No sends, drafts, DMs. Session signed in as Nolan Geske.

## Window

- Old watermark: 1790364667 (2026-09-25 13:31 MDT)
- New watermark: **1790492621** (2026-09-27 01:03 MDT, Fruita group newest post). All scanned posts > old watermark except one below-watermark stray (ts 1790364053, china-cabinet resale in WCO Message Board) treated as uncounted-but-scannable, out of segment.

## Posts scanned per group

| Group | ID | Posts scanned | Window-relevant breakdown |
|---|---|---|---|
| Western Colorado Message Board & Classifieds | 5456977881034408 | 19 | 17 resale/noise, 2 business promos (both repeat signals), 1 childcare ad (out of segment) |
| Buy & Sell in Grand Junction | 108728816001912 | 20 | all resale/buy-sell, 0 promos |
| Delta | 1504277980997243 | 20 | restaurant/florist/food promos (out of segment), 1 job-seeker ad, 1 cross-posted maintenance promo (repeat check below) |
| Orchard Mesa | 486356801008208 | 9 | homestead food promo (out of segment), county pet-news, 1 cross-posted maintenance promo |
| Fruita | 3741333852807065 | 20 | Fall Fest chatter, harvest-moon photos, lost/found, ranch beef ad (out of segment), book promo; 0 trade promos |
| Living In Grand Junction Colorado | 1082777608577867 | 20 | 1 new-business radar hit (dad-and-son hauling startup), 1 welding demand signal, 1 nonprofit promo (out of segment), rest community |
| **Total** | | **108** | |

## NEW CANDIDATES (2, deduped clean, staged for parent merge into pipeline.md)

### 1. Dad-and-son pickup/hauling startup — Grand Junction (NEW-BUSINESS RADAR)
- Trade: thrift-store/dump hauling, yard-sale leftovers pickup, light pickup/delivery.
- Post: https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3446860548836216/ (ts 1790446428, 9/26 12:13 MDT, 0 comments).
- Author identity evidence: post read exposes owner_name/username = **Scott Rush** (personal account; no business name in post).
- Business name: none given ("dad and son trying to start a business"). Source=new-filing candidate.
- Contact route: published phone **970-778-1219** (text or FB message; post says "message me or text me").
- Page/Message-button: n/a — personal ad, no business Page. Fallback = phone/text route above.
- Notes: classic new-filing shape (startup announcement, price = "reasonable", community-help framing). Smallest independent operator.

### 2. Jovanny Vargas — seasonal maintenance promo, family-owned (thin candidate, identity needs work)
- Trade: unknown; post text "Schedule your maintenance for the season... take pride in our work. 🔥" — fire emoji suggests fireplace/chimney or furnace/HVAC seasonal maintenance. Not stated as fact.
- Posts (cross-posted 3 groups, all ts ~17903814xx, 9/25 18:10-18:11 MDT, 0 comments each):
  - https://facebook.com/groups/5456977881034408/permalink/28625632113742324/
  - https://facebook.com/groups/1504277980997243/permalink/1810690457022659/
  - https://facebook.com/groups/486356801008208/permalink/1116314834679065/
- Author identity evidence: post read exposes owner_name/username = **Jovanny Vargas**.
- Business name: none in post. No phone in post. 0 comments, so no contact via thread.
- Page/Message-button: not checkable — no business name/Page to verify against. Recorded as pending identity resolution; do not mark DM-eligible.
- Dedupe: "Jovanny Vargas" / "maintenance for the season" have no hits in leads.md, pipeline.md, or the canonical JSONL.

## REPEAT SIGNALS (already tracked — suggested last_signal text for the engine job)

### High Desert Haulers and Junk Removal — Montrose (tracked, WARM)
- Joshua Bowsher posted TWO promos in Western Colorado Message Board, 9/26 10:31-10:33 MDT (post read confirms owner_name = Joshua Bowsher):
  - https://facebook.com/groups/5456977881034408/permalink/28634174046221464/ — rolloff dumpster rental promo ("From houses to airports... we even do the loading"), tags @Coyote Rolloff Services, coyoterolloffservices.com, 970-901-7956.
  - https://facebook.com/groups/5456977881034408/permalink/28634155239556678/ — junk/clutter removal promo, "prices starting at just $120", licensed/insured, family-owned, 970-901-7956.
- Suggested last_signal: "2026-09-26 dual promo by Joshua Bowsher in Western CO Message Board: junk removal + rolloff dumpster rental, family-owned, licensed/insured, prices from $120, 970-901-7956; cross-tags @Coyote Rolloff Services; active-marketing vitality signal (2 posts in 2 minutes)."

### Coyote Rolloff Services — pipeline WATCH (tracked as NEW, WATCH)
- Same two Bowsher promos co-mention Coyote Rolloff Services: site coyoterolloffservices.com, phones 970-975-0542 / 970-787-8809 (from post image OCR; 970-901-7956 shared).
- Engine already verified both business Pages with Message buttons (leads.md round notes): High Desert Haulers Page 100088807365318 and Coyote Rolloff Services Page 61559100902731, Message TRUE both. No new Page work needed.

## DEMAND SIGNALS

1. **Welder needed (bonded/insured), urgent** — https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3446686432186961/ (9/26 08:55 MDT, 0 comments). Poster needs 2 vertical welds on a camper jack, prepped surfaces, bonded/insured proof, leaving on a trip mid next week. Cross-reference with pipeline welding prospects; not tied to any tracked business (author identity not pulled — demand signal only).

## Near-misses / out of segment (not staged)

- Aila Thai Kitchen (Delta restaurant, new noodle dish) — restaurant, out of scope.
- The Flower Garden (2153 Tessman Rd, Delta, florist) x2 — florist, out of scope.
- Delta farmstand (sourdough, jams, fall treats) — food, out of scope.
- Blessed Harvest Homestead (Orchard Mesa, baked goods farmstand, preorders via Messenger) — homestead food, out of scope; recurring poster.
- See Jane Ranch (Fruita, ground beef for sale) — ag, out of scope.
- Dare to Dream Inc. (adaptive riding nonprofit, text 970-708-5036) — nonprofit, out of scope.
- Jack Danielson, 9703946902 (Delta group) — individual seeking day-work (mechanics, cleaning); not an established business, no business identity. Not staged.
- Private unlicensed in-home childcare (Clifton/GJ) — personal service, out of scope.
- Permanent Jewelry walk-ins (719 Pitkin Ave GJ) — beauty service, out of scope.
- Pagan Moon cloaks (craft retail), George Dewiliby book promo, missing dog Roxi, Crawford visitor questions — noise/out of scope.

## Notes for the engine job

- Author identification was done via `facebook-cli post read` (exposes owner_name/username directly), no social.search needed. Both key authors resolved: Joshua Bowsher, Scott Rush, Jovanny Vargas.
- `facebook-cli profile info` still 403s server-side ("disabled or gated"; tested on owner_id 100001636570172 this run). All Page/Message-button verification for new candidates recorded as fallback-contact only; never claimed an unobserved Message button.
- Nothing was written to pipeline.md, leads.md, or the JSONL on this run. The 2 new candidates are staged above for the parent to merge (pipeline.md NEW rows + JSONL appends under the engine's authority).
- Per the 2026-09-24 throttle: no sends/drafts/DMs on this job; intelligence only.
