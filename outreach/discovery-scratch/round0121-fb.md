# FB delta-scan #130 — 2026-09-24 17:14:31 → 2026-09-25 00:37:26 MDT

Scheduled discovery-research run, Facebook prospecting half. Research ONLY: no DMs sent, no drafts, no pipeline inserts (300/300 active cap hit; all candidates staged in this report only).

## SCAN SUMMARY

Window: --min-timestamp 1790291671 (2026-09-24 17:14:31 MDT). Command: `facebook-cli groups posts --group-id <id> --min-timestamp 1790291671 --sort-by NEW_POSTS --limit 20`.

| Group | Group ID | Posts returned | In-window |
|---|---|---|---|
| Western Colorado Message Board & Classifieds | 5456977881034408 | 8 | 5 |
| Buy & Sell in Grand Junction | 108728816001912 | 20 | 20 |
| Delta | 1504277980997243 | 3 | 3 |
| Orchard Mesa | 486356801008208 | 1 | 1 |
| Fruita | 3741333852807065 | 20 | 19 |
| Living In Grand Junction Colorado | 1082777608577867 | 6 | 6 |
| **Total** | | **58** | **54** |

CAVEAT: Fruita and Buy & Sell GJ hit the 20-per-page API cap. Any in-window Fruita posts between ~17:14 and 19:57 MDT (below the visible page) were not captured. Buy & Sell GJ's 20 were all personal resale, so nothing was lost there.

Classifications: 0 new candidate rows, 0 grand-opening radar hits, 2 repeat sightings (enrichment), 2 observed-not-pursued (no business name / no contact path), 2 demand signals, 1 out-of-scope restaurant promo (Mountain Top lodge "Asian Occasion", cross-posted Delta + Fruita groups — food service, not home-service trade).

## NEW CANDIDATES

None. No in-window post presented a genuine business with both a business name and a published contact path. Two trade-adjacent observations were logged as observed-not-pursued (see below), consistent with past precedent (e.g. "Rocky Mountain scrap pickup observed but not pursued"):

1. **Tyler Trochlil — free car tow-away offer** | town: Clifton/Junction/Fruita/Palisade | post: W CO Message Board 28612762058362663 (18:41 MDT) | author: personal profile Tyler Trochlil (handle fnSanemi, via social.search post_url) | pitch: "If anyone needs cars towed away free of charge just pm me and we can work out details" | contact route: PM-only, NO phone/website/business name published | assessment: scrapper/junk-car gig, no business identity, no contact path for the engine — logged, not staged.
2. **Ana Rodriguez — furniture assembly gig help** | town: Fruita (group) | post: Fruita 4477488945858215 (21:26 MDT) | author: personal profile Ana Rodriguez (handle ana.rodriguez.545190, via social.search post_url) | pitch: offers to build/assemble purchased items for $$$ | contact route: NONE published (comments only) | assessment: solo gig worker, no business identity — logged, not staged.

## ENRICHMENT (repeat sightings of tracked businesses; no new rows, no status changes)

1. **High Desert Haulers / Coyote Rolloff Services** — Delta group post 1809673323791039 (17:40 MDT 2026-09-24), author Joshua Bowsher (post read). Dual-Page-tag promo: tags High Desert Haulers (Page 100088807365318) + Coyote Rolloff Services (Page 61559100902731); phone 970-901-7956; "Desert Hustle Award for small business, big impact 2026" (Delta Area Chamber of Commerce, per post image OCR); claims licensed/insured, family-owned. Already in canonical JSONL (intel_updated 2026-09-24) and pipeline NEW/WARM. Round-143 Pig-side checks already established: Message button TRUE on both Pages, identity confirmed; DM attempt failed clean (nothing sent). New intel: award mention is fresh social-proof evidence. Vitality signal: actively promoting same night.
2. **Scott Rush — dad-and-son junk hauling startup** — Living In GJ post 3445112772344327 (23:24 MDT 2026-09-24), author scott.rush.7 (via social.search post_url). Same "trying to start a business" pitch, text-to 970-778-1219 published in post. Already pipeline NEW/WARM (round 52) + leads.md. 4th repeat sighting; vitality only.

## DEMAND SIGNALS (not prospects)

- **Plumber demand, Grand Junction**: Living In GJ post 3444846319037639 (18:16 MDT) — homeowner seeking plumber for suspected stove gas leak, 14 comments. Live plumbing demand.
- **Housekeeper demand, 81506**: W CO Message Board post 28614396438199225 (22:40 MDT) — elderly lady ISO female housekeeper for bedroom/bath 1-2x/month, $50 per 2-hr visit.

## GRAND-OPENING RADAR HITS

None. No "grand opening" / "now open" / "just launched" posts for trade businesses in-window.

## WATERMARK

New watermark: **1790318246** (2026-09-25 00:37:26 MDT) — max post timestamp seen (Fruita post 4477591039181339). Next scan should use `--min-timestamp 1790318246`.

## NOTES

- Buy & Sell GJ window was 100% personal resale (RVs, trucks, ATVs, books, furniture, tires) — zero business signals.
- Message-button/Page checks: High Desert Haulers + Coyote Rolloff already verified (round 143). Scott Rush is personal-profile-only. The two observed-not-pursued posters are personal profiles with no business identity, so no Page check applies.
- No DMs sent on this job (research-only by design).
