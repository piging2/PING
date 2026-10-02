# Review intel pre-send check — round 65 (2026-09-17 UTC email queue)

Run: 2026-09-16 ~02:20 MDT (pre-send delta, ~16h before 18:00 MDT send)
Trigger definition: NEW review <= 2 stars, OR NEW 3-star review mentioning phone/response/wait/scheduling, posted on or after 2026-09-08. UNDATED negatives = intel only, never triggers. No reviewer names identified; no review text quoted.

## F1 follow-ups

| Business | Review check result (ratings seen, newest dated review) | Trigger | Email re-check |
|---|---|---|---|
| Eagle Insulation (Durango) | Birdeye 4.1/13. Negative review seen is UNDATED (no-response pattern after deposit). Intel only. No dated reviews on profile. | N | OK — robert@eagleinsulationco.com verbatim on eagleinsulationco.com (service page email block, seen in site snippet) |
| Colorado Premier Garage Doors & Gate Systems | Birdeye 4.9/76, all positive snippets; own-site listing clean | N | OK — manage@cpgdgs.com verbatim on cpgdgs.com (own business-info block; homepage footer email is Cloudflare-obfuscated in fetch but same address per own-site snippet) |
| Durango Solar Works | Own-site testimonials positive (undated); chamberofcommerce negatives dated Oct/Sep 2021 (pre-cutoff); solarforyourhouse 5.0/5 positive | N | OK — info@durangosolarworks.com verbatim on durangosolarworks.com/contact-us/ |
| Colorado Hardwood Floors (Montrose) | HomeAdvisor 5.0/4, all positive (dates not shown) | N | OK — cohardwoodfloors@gmail.com verbatim on cohardwoodfloors.com/contact |
| Anasazi Solar (Montrose) | EnergySage profile live, no review content shown; BBB A+; no negative signal found | N | OK — Info@AnasaziSolar.com verbatim on anasazisolar.com homepage contact block |
| Atlasta Solar Center (GJ) | Birdeye 4.6/24 (claimed profile, crawl 1 day ago), all positive snippets; HomeAdvisor 5.0; Angi 5.0/2; Porch 4.2/34 | N | OK — admin@atlastasolar.com verbatim on atlastasolar.com (contact + multiple pages) |

## New cold recipients

| Business | Review check result (ratings seen, newest dated review) | Trigger | Email verified on own site |
|---|---|---|---|
| Irrigation Monkey (Silt) | No reviews found for the business itself (search surfaced unrelated irrigation firms only) | N | Y — dennis@irrigationmonkey.com verbatim on irrigationmonkey.com/contact/ |
| Groundskeepers of Aspen | HomeAdvisor 5.0/7, all positive | N | Y — Bladesandflakes@groundskeepersofaspen.com verbatim on groundskeepersofaspen.com header/footer |
| Aspen Floor & Home Services | BBB reviews newest 06/30/2025 positive; Angi 4.8/81; HomeAdvisor 5.0/6; Yelp listing active, all positive | N | Y — info@aspen-fh.com verbatim on aspenfloorandhome.com contact page + footers |
| Waypoint RV Service (Fruita) | Yelp 2 reviews: July 19, 2026 and Oct 8, 2025, both positive | N | Y — waypointrvcamper@gmail.com verbatim on waypointrvservice.com homepage |

## Outcome

**0 triggers.** No NEW <=2-star reviews and no NEW review-triggering 3-stars found on any of the 10 businesses. All 10 email addresses verified (or re-checked) verbatim on the businesses' own sites; no verification failures.

Notes:
- Eagle Insulation's no-response negative remains undated intel (already captured in round 39); no date attached so it cannot trigger.
- Colorado Premier Garage Doors' homepage fetch shows a Cloudflare-obfuscated email placeholder; the same verbatim address appears in their own site's business-info content snippet, so the re-check stands.
