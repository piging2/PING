# Facebook delta-scan #76 (2026-09-17, 08:15 - 11:15 MDT)

Read-only run. No DMs sent, no likes, no comments, no engagement actions.

Window: 1789654411 (2026-09-17 ~08:15 MDT) -> 1789665381 (2026-09-17 11:16:21 MDT).
Query: `facebook-cli groups posts --group-id <id> --limit 25 --sort-by NEW_POSTS --min-timestamp 1789654411`, one page per group (CLI max page size is 25; `--sort` is not a valid flag, `--sort-by` is).

## Counts per group

| Group | Returned | In-window | Below-watermark leaks |
|---|---|---|---|
| Western Colorado Message Board & Classifieds | 8 | 7 | 1 (new-members welcome 2026-09-16 08:58) |
| Buy & Sell in Grand Junction | 20 | 20 | 0 |
| Delta | 5 | 5 | 0 |
| Orchard Mesa | 1 | 1 | 0 |
| Fruita | 20 | 18 | 2 (gym schedule 2026-09-13; empty post 2026-09-06) |
| Living In Grand Junction Colorado | 6 | 6 | 0 |
| Colorado Business Networking | 20 | 20 | 0 |
| Colorado Business Mingle | 1 | 1 | 0 |
| **Total** | **81** | **78** | **3** |

Leaks are API noise only, logged as intel, never double-counted.

## New prospects (2, both added to pipeline.md as NEW)

1. **spiritguide grass** (Fruita, CO) — lawn care: fall cleanup, aeration, overseed, pruning, leaf removal. Phone 970-433-3000 published verbatim in post. Self-identified solo operator; Fruita 970 area code. Textbook missed-call fit: seasonal booking by phone while the operator is in the field.
   - Post: https://facebook.com/groups/3741333852807065/permalink/4469437723330004/ (2026-09-17 09:04 MDT)
   - Added to pipeline.md under "Facebook — Western Colorado (delta-scan #76, 2026-09-17)" as NEW.
   - Dedup verified: no hits in facebook-dms.md, pipeline.md, leads.md. Not a franchise.
2. **L D Landscaping & Concrete** (Aurora/Denver, CO) — concrete (regular + stamped/colored) + landscaping, "Licensed and insurance", free estimates, "NO MONEY DOWN !!!". Phone 303-944-6265 published verbatim in post (Colorado Business Networking).
   - Post: https://facebook.com/groups/2803047646497352/permalink/4073383862797051/ (2026-09-17 09:31 MDT)
   - Verification: phone matches SAFER USDOT 3369230 ("L D LANDSCAPING & CONCRETE", Aurora CO) and ibegin listing "LD Landscaping And Concrete" (Denver 80247). Name conflict flag: BBB ties the SAME number to "Ortega's Landscaping, LLC (Jose Jimenez)". Business name recorded as stated by the two carrier/directory sources; conflict noted, not resolved.
   - Added to pipeline.md under "Facebook — Denver-area groups (delta-scan #76, 2026-09-17)" as NEW.
   - Dedup verified: no hits in facebook-dms.md, pipeline.md, leads.md. Not a franchise.

## Repeat sightings of tracked businesses (not re-added)

- **Coldiron's Creations and Property Service** ("Wild Weed Wranglers", Delta, 970-209-4965): "Got Weeds?" fall promo in Delta group 08:35 MDT (https://facebook.com/groups/1504277980997243/permalink/1803122667779438/). Already DM SENT 2026-09-08 via browser, no reply on record; F1 stays parked until a DM channel exists (not in Messenger contacts). Logged as repeat sighting only.
- **Polished Junk Solutions** (Haley Martin, 719-290-7122): fall cleanup "truck & trailer this week" promo in Colorado Business Networking 09:26 MDT (https://facebook.com/groups/2803047646497352/permalink/4073379639464140/). Already NEW in pipeline (2026-09-10). Fresh promo is a timing signal; not re-added.

## New-business radar hits

0. No "grand opening", "now open", or "just launched" signals in window.

## Demand signals (intel only, not prospects)

- Buy & Sell GJ 10:49 MDT: "Needing recommendations for a Arborist/Tree Service company. I need some trees taken care of in GWS." (https://facebook.com/groups/108728816001912/permalink/3413937988814295/) — buyer ask in the Grand Valley; pipeline already holds Western CO tree rows (Rescue Tree Service Delta, High Country Tree Service GJ, A, J & G Tree Service GJ, Top Notch Trees GJ, Gardner Turf & Tree). No business authored the post; demand intel only.

## Complaint signals

None actionable.

## Out-of-trade / skipped sightings (intel only)

- LivingGJ 08:39 MDT: individual seeking gig work (cleaning/yard/childcare) after a canceled job — not a business.
- LivingGJ 10:18 MDT: Palisade wine-fest weekend free-show promo — events.
- Fruita 10:00 MDT: "If you're looking to clean up your vehicle or protect it we got you!" — auto detailing, out of segment.
- Fruita 09:54 MDT: "Western Slope Digital" local web design agency offering free custom website demos — marketing intel, not a home-service trade.
- Fruita 09:49 MDT: Chalkline Ridge LLC canine exercise/enrichment — already in pipeline (DM BLOCKED 2026-09-08); pet service out of trade.
- Fruita 09:39 MDT: Marcy insurance agent (wildfire-zone homeowners) — professional service.
- COBizNet 10:30 MDT: HVAC filter-reminder post (#hvaclife #coloradospringshvac, f.mtr.cool link) — no business name or contact published; Colorado Springs; not pursued.
- COBizNet 10:58 MDT: wax melts seller — retail/craft.
- COBizNet 10:52 MDT: traffic-accident attorney (Spanish) — legal.
- Delta 10:16 MDT: Aila Thai kitchen — food.
- Delta 09:02 MDT: Lovemore Real Estate $289k Delta listing — real estate.
- Doughbra's Stand sourdough cross-posts (Fruita 11:14, Orchard Mesa 11:14, WCMB 11:14) — cottage food.
- WCMB remainder: permanent jewelry BOGO promo (also Buy & Sell GJ 09:52), vendor-call post, Schwinn/Mongoose bikes — personal resale/retail.
- COBizNet remainder: two Denver open-house listings (Timnath, Commerce City), faith/motivation post, Breast Cancer Awareness photo event, Boxstars collaborator post — out of trade.
- Buy & Sell GJ remainder: all personal resale (mower, cars, furniture, PS5, etc.); permanent jewelry promo duplicate.
- 21 unresolvable empty-caption posts (author stripped by CLI; logged without guessing): LivingGJ 3437390646449873 (11:08), 3437337696455168 (10:00), 3437337493121855 (10:00), 3437292563126348 (09:02); Buy&SellGJ 3413953145479446 (11:08), 3413925658815528 (10:32); Delta 1803144137777291 (09:06), 1803124987779206 (08:38); Fruita 4469549936652116 (11:16), 4469490003324776 (10:03), 4469488363324940 (10:01); COBizNet 4073477926120978 (11:12), 4073475442787893 (11:09), 4073468066121964 (11:01), 4073451002790337 (10:42), 4073431062792331 (10:22), 4073427379459366 (10:18), 4073407429461361 (09:56), 4073402206128550 (09:50), 4073382949463809 (09:30); COBizMingle 28099805523023849 (11:01).

## Session health

- facebook-cli cloud session healthy (facebook-cli me returned Nolan Geske, no auth errors).
- First invocation used `--sort NEW_POSTS`; CLI rejected it (no such flag, use `--sort-by`). Retried correctly; no data lost.
- 0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only).
- New watermark: 1789665381 (2026-09-17 11:16:21 MDT).
- Raw scratch: /tmp/scan76 (g_<gid>.json per group).
