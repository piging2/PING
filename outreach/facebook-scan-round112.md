# Facebook Delta Scan — Round 112

**Window:** 2026-09-21 20:18:28 MDT → 22:54:26 MDT (watermark 1790043508 → 1790052866)
**Groups scanned (6):** Western Colorado Message Board & Classifieds (5456977881034408), Buy & Sell in Grand Junction (108728816001912), Delta (1504277980997243), Orchard Mesa (486356801008208), Fruita (3741333852807065), Living In Grand Junction Colorado (1082777608577867)
**Method:** `facebook-cli groups posts --group-id <id> --sort-by NEW_POSTS --limit 20` per group (120 posts fetched), filtered locally on creation_time > watermark 1790043508 (--min-timestamp not used per round-88/90 unreliability finding).
**facebook-cli cloud session:** healthy (me = Nolan Geske, no auth errors).

## Post counts
- WCMB: 1 in-window (personal ISO: white plastic Easter eggs, 81504)
- Buy & Sell GJ: 20 in-window (all personal resale: lightning deal, wooden hutch, youth bed, bar stools, iPhone 14, bookcase, books, 2 nightstands, 2 Disney VHS, wedding dresses, mini excavator H15R 81425, Ian Munsick tickets, prefab countertop 81520, Apple cords, iPhone 14 Pro, interior French doors, couch, hooded towels)
- Delta: 0 in-window
- Orchard Mesa: 0 in-window
- Fruita: 5 in-window (missing cat Mollie, ISO local newspaper question, **Burciaga Landscaping promo**, **handyman services promo**, sunset photo)
- Living In GJ: 7 in-window (4 empty-caption posts, price-drop resale post, **Desert Bloom Gardening plant bingo event**, 1 empty)
- **Total in-window: 33. Total fetched: 120.**

## New prospect (1)

**Burciaga Landscaping / Reliable Handyman Western Slope** — Oziel B Dears (personal profile 100089636242361). Two promo posts in Fruita group, 21:03 and 21:07 MDT.
- Trade: landscaping (mowing, yard cleanups, bush/hedge trimming, debris removal, seasonal care) AND handyman (door/drywall/cabinet repairs, fixture installs, TV mounting, faucet/outlet replacement, pressure washing, fence/deck repairs). Same operator, same phone, two flyers.
- Towns served (per flyers): Fruita, Grand Junction, Clifton, Palisade, Redlands, Orchard Mesa. Corridor fit: yes.
- Contact: 970-712-4352 (published in both posts, call-or-text for free estimate/quote).
- Chain signals: none observed. Solo/small operator profile.
- Opportunity: MISSED_CALL_LEAD_CAPTURE (high; phone/text-only intake, owner in the field) primary. Website revamp possible (no website visible in promos; social-only presence).
- Dedup: clean across leads.md, pipeline.md, facebook-dms.md (grepped "Burciaga", "Oziel", "970-712-4352").
- DM: blocked. Messenger CLI absent on this host; facebook-cli group-post author is a personal profile; DM path Pig-only and parked. REROUTED via published phone 970-712-4352 → pipeline NEW row, phone-route.
- Post URLs: https://facebook.com/groups/3741333852807065/permalink/4474115179528925/ (handyman), https://facebook.com/groups/3741333852807065/permalink/4474118022861974/ (landscaping)

## Business-post deep dives (assessed, not added)

1. **Desert Bloom Gardening & Hydroponics** — Living In GJ, 21:27 MDT, business Page (61551020962628). Plant BINGO event Oct 18, 3:00-4:30 PM, 445 Pitkin Ave GJ; $20 entry. → **SKIP: out of trade.** Plant/hydroponics retail + community event, not home-service blue-collar. Round-57 Sweets N Treats precedent. Not previously tracked.
2. **Mini Excavator H15R $4,500** — Buy & Sell GJ, 21:21 MDT, poster Dayday Vargas, 81425 (Cedaredge). Equipment sale listing; OCR text garbled, no business identity. → **SKIP: personal equipment resale; Cedaredge out of corridor.**
3. **Prefab countertop $123 (81520, Clifton)** — Buy & Sell GJ, 20:49 MDT, poster Tacua Amp. Single used-countertop listing; caption offers fab/install quotes ("if you need fab and install, i can give you a quote"). → **LOGGED as weak sighting only.** Soft trade signal (countertop fab/install in Clifton) but no business name, no published phone/email, single personal listing → fails pipeline quality bar. Add only if re-sighted with verifiable business identity.

## Findings
- **New prospects: 1** (Burciaga Landscaping / handyman, Fruita/GJ/Clifton/Palisade/Redlands/Orchard Mesa).
- **Repeat sightings / vitality notes: 0.**
- **New-business radar hits: 0** (no "grand opening"/"now open"/"just launched" language in window).
- **Review/complaint threads: 0.**
- **Market signals (UNVERIFIED social chatter):** Fruita ISO local newspaper question (local-media interest); missing-cat post (personal). No complaint or demand threads in window.

## DMs
- **0 DMs sent, 0 attempted, 0 parked.** Messenger CLI not present on this host; DM path Pig-only and parked per standing state. No new prospects resolvable via Messenger contacts from here.
- **DM daily count: 0/10.**
- **Reroutes: 1** — Burciaga Landscaping → phone 970-712-4352 (published in post), added to pipeline.md NEW, phone-route.

## Watermarks
- In: 1790043508 (2026-09-21 20:18:28 MDT)
- Out: 1790052866 (2026-09-21 22:54:26 MDT)

## Raw scratch
/tmp/scan112-<groupid>.json (6 files)

## Labels
Known → inferred → unknown held. Only business-published content (phone 970-712-4352, services, towns) is KNOWN. Opportunity assessments are INFERRED, never stated as fact in copy. Desert Bloom out-of-trade judgment follows the round-57 precedent, not a claim about the business. No SEO/ranking claims made. No reviewer identification (no review threads).
