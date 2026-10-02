# Review delta check — Round 84 (2026-09-18)
Pre-send review check for the 10 recipients of the 2026-09-20 UTC email queue (fires 18:00 MDT 2026-09-19).
Queue: 3 F2 (slots 1-3) + 5 F1 (slots 4-8) + 2 cold (slots 9-10).

## Trigger definition (only these count)
A review posted ON OR AFTER 2026-09-08 that is:
- 2 stars or fewer (any Google review), OR
- 3 stars AND mentions phone / response / wait / scheduling problems.
Undated negatives are intel-only, NEVER triggers. Non-Google platforms (Angi, Yelp, HomeAdvisor, Indeed) are out of trigger scope; recorded as intel only.
No reviewer names, no review-text quotes, no identifying content recorded. Pain categories only.

## Method
- browser.search per business: "<Business Name> <Town> Google reviews" (+ retries with alternates).
- Opened Birdeye business pages (Birdeye mirrors Google reviews) and Trustindex widgets on business sites, where found.
- Where negatives existed but dates were not visible anywhere, ran targeted follow-up searches for dated negative reviews.
- Google review dates are not directly visible via these tools; dates were recovered only where an aggregator or widget displayed them.
- RESULT: zero qualifying triggers. Queue files unchanged.

## Caveats
- Google Business Profile review pages themselves are JS-heavy and not readable through these tools; evidence comes from aggregator mirrors (Birdeye) and Trustindex widgets.
- Birdeye fetches displayed ratings/review counts but not per-review dates or the full negative-review text set, so low ratings implied by averages below 5.0 could not be dated and count as intel-only.
- Curated widgets (e.g., Aspen Floor's site widget) may be filtered by the business; used only where Google is the labeled source.

---

## 1. Canyon Creek Electric — Montrose CO (slot 1, F2) — ALL-GREEN
- Searches: "Canyon Creek Electric Montrose Colorado Google reviews"
- Found: Birdeye page, 5.0 average, 26 reviews, all visible reviews positive (responsive, on-time, same-day service themes).
- No negative reviews visible at all. Verdict: TRIGGER no. All-green.

## 2. Lico's Electric LLC — Rifle CO (slot 2, F2) — INTEL-ONLY, NO TRIGGER
- Searches: "Lico's Electric LLC Rifle Colorado Google reviews"; "Lico's Electric" Rifle review 2026; "Lico's Electric" one-star / 1-star review complaint Rifle.
- Found: Birdeye page, 4.3 average, 16 reviews, Rifle CO (146 Daniel Ave). Visible reviews positive (evening emergency response, explained work, reasonable price). The 4.3 average implies low ratings exist somewhere in the 16, but no date or content for any negative was retrievable.
- Follow-up searches for dated negatives returned nothing relevant. BBB lists A+ (no customer reviews).
- No negative review dated >= 2026-09-08 found; undated negatives are intel-only. Verdict: TRIGGER no.

## 3. Durgin Electric LLC — Carbondale CO (slot 3, F2) — INTEL-ONLY, NO TRIGGER
- Searches: "Durgin Electric Carbondale Colorado Google reviews"
- Found: Birdeye page, 4.6 average, 10 reviews, Carbondale CO. Visible reviews positive. Low ratings implied but undated.
- Intel (non-Google, out of trigger scope): Angi shows 4.0 over 4 reviews with one 2-star (25%); date unknown. Indeed employer reviews include an old 1-star (2022, employee review, not a customer review).
- No customer review dated >= 2026-09-08 at 2 stars or fewer found. Verdict: TRIGGER no.

## 4. Aspen Floor & Home Services — Thornton CO, serves Denver metro (slot 4, F1) — ALL-GREEN
- Queue file says Denver; VERIFIED: actual address 11514 Steele St, Thornton, CO 80233; site confirms Denver-metro service area (Thornton, Aurora, Denver, Arvada, Centennial, Lone Tree, Highlands Ranch, Castle Rock, Westminster).
- Searches: "Aspen Floor and Home Services Colorado Google reviews"
- Found: business site Trustindex widget labeled "Posted on Google" / "Trustindex verifies that the original source of the review is Google", with dates: 2026.08.05, 2026.06.05, 2026.06.04, 2026.05.13, 2026.05.12, 2026.05.01, 2026.04.19 (x2), 2025.11.05. ALL 5-star, all positive. Zero negatives visible.
- Intel (non-Google): Angi 4.8 over 81 reviews (1% 1-star ~ 1 review; date unknown); Yelp 4 stars, 43 reviews (updated July 2026).
- No negative Google review posted >= 2026-09-08. Verdict: TRIGGER no. All-green.

## 5. Irrigation Monkey — Silt CO (slot 5, F1) — REVIEWS NOT FOUND
- Searches: "Irrigation Monkey Silt Colorado Google reviews"; "Irrigation Monkey" Colorado reviews Dennis.
- Found: company site (irrigationmonkey.com, founder Dennis Winchell, Roaring Fork Valley since 2018) and BBB listing (A+, no customer reviews, no complaints shown).
- No review profile found on Google, Birdeye, Yelp, Angi, HomeAdvisor, or any aggregator. Verdict: reviews not found; no trigger possible.

## 6. Groundskeepers of Aspen — Aspen CO (slot 6, F1) — ALL-GREEN
- Searches: "Groundskeepers of Aspen Google reviews"
- Found: HomeAdvisor page, 5.0 average, 7 reviews, 100% 5-star. No Google review profile found.
- BBB complaint result surfaced was a different business (Aspen Lawn Care, Olathe KS); disregarded.
- No negative reviews anywhere found. Verdict: TRIGGER no. All-green.

## 7. Blackbird Kitchen and Bath — Evergreen CO (slot 7, F1) — REVIEWS NOT FOUND
- Searches: "Blackbird Kitchen and Bath Evergreen Colorado Google reviews"; "Blackbird Kitchen and Bath" reviews Evergreen remodel.
- Found: BBB listing, A+ rating, services Evergreen CO (27965 Meadow Dr, Evergreen per business data). Search results dominated by an unrelated Blackbird Cafe restaurant.
- No review profile found on Google, Birdeye, Yelp, Angi, HomeAdvisor, or any aggregator. Verdict: reviews not found; no trigger possible.

## 8. Waypoint RV Service — Fruita CO (slot 8, F1) — REVIEWS NOT FOUND (GOOGLE); YELP POSITIVE
- Searches: "Waypoint RV Service Fruita Colorado Google reviews"
- Found: waypointrvservice.com (Waypoint RV and Camper Service and Repair, 934 20 Rd, Fruita CO). No Google review profile found.
- Yelp shows 2 reviews, both positive: one dated July 19, 2026, one dated October 08, 2025. Yelp is out of trigger scope; both are positive anyway.
- No negative reviews anywhere found. Verdict: TRIGGER no.

## 9. Christian Brothers Carpet & Flood Care — Fruita CO (slot 9, cold) — ALL-GREEN
- Searches: "Christian Brothers" carpet flood care Fruita Colorado reviews
- Found: Birdeye page, 5.0 average, 62 reviews, Fruita CO (1910 J Rd). All visible reviews positive (excellent cleaning, multiple-property repeat customer, patch job).
- Intel (non-Google): HomeAdvisor 4.8 over 37 reviews (86% 5-star, 8% 4-star, 5% 3-star ~ 2 reviews; dates/content unknown).
- No negative Google review; no dated negative >= 2026-09-08. Verdict: TRIGGER no. All-green.

## 10. Sander & Sons Kitchen and Bath — Littleton CO (slot 10, cold) — INTEL-ONLY, NO TRIGGER
- Identified from drafts/round27-sander-and-sons-email.md (info@sanderandsons.com, site-published email).
- Searches: "Sander and Sons" kitchen bath Colorado reviews; "Sander and Sons" kitchen bath "1 star" OR one-star review Google.
- Found: Birdeye page, 4.8 average, 94 reviews; address 7540 S Grant St, Littleton CO 80122 (Birdeye lists Centennial; same address per ecohome). Visible reviews all positive (designers Monica/Allison/Phil, on-time, responsive themes). Low ratings implied by the 4.8 average but none datable.
- Intel (non-Google): ecohome.co 4.7 over 34 reviews (6% 1-star ~ 2 reviews; dates/content gated); Angi 5.0 over 4 reviews.
- Follow-up search for dated negatives returned nothing. No negative review dated >= 2026-09-08 found. Verdict: TRIGGER no.

---

## Summary table
| Slot | Business | Town | Touch | Verdict |
|---|---|---|---|---|
| 1 | Canyon Creek Electric | Montrose | F2 | all-green |
| 2 | Lico's Electric LLC | Rifle | F2 | intel-only (undated low ratings), no trigger |
| 3 | Durgin Electric LLC | Carbondale | F2 | intel-only (undated; Angi 2-star non-Google), no trigger |
| 4 | Aspen Floor & Home Services | Thornton (serves Denver metro) | F1 | all-green (5-star Google reviews through 2026.08.05) |
| 5 | Irrigation Monkey | Silt | F1 | reviews not found |
| 6 | Groundskeepers of Aspen | Aspen | F1 | all-green (HomeAdvisor 5.0/7; no Google profile) |
| 7 | Blackbird Kitchen and Bath | Evergreen | F1 | reviews not found |
| 8 | Waypoint RV Service | Fruita | F1 | reviews not found on Google; Yelp 2 positive |
| 9 | Christian Brothers Carpet & Flood Care | Fruita | cold | all-green (Google 5.0/62) |
| 10 | Sander & Sons Kitchen and Bath | Littleton | cold | intel-only (undated low ratings), no trigger |

Zero qualifying triggers across all 10. No queue changes needed.
