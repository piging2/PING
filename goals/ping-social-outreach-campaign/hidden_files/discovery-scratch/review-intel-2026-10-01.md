# Review Intelligence Signal Check
Run date: 2026-09-30 (MDT) / task filed 2026-10-01
Scope: 13 prospects staged in ~/workspace/outreach/pipeline.md (newest first)
Method: web search per business (name + town + "reviews"), plus business.google.com profile page fetch for Rivas Reliable Roofing.
Hard rules honored: no reviewer names/identities reproduced in this report, no verbatim review quotes, no fabricated reviews.

## Trigger summary
**REVIEW-TRIGGER CANDIDATES: none.** No business shows a new (last ~30 days) review of 2 stars or fewer, or a new 3-star review mentioning phone/response/wait/scheduling problems. No pain-category triggers fire this run.

## Per-business results

### 1. Rivas Reliable Roofing LLC — Parachute, CO
- Trigger: NO TRIGGER (clean/undated).
- Google Business Profile: 5.0/5 across 21 reviews (distribution shows 5s through a small number of 4/3/2/1 stars; low-star reviews are older, dates not visible).
- Most recent visible review: ~3 months ago, 5-star, praise for speed and respectful crew. No negative review with a recent date found.
- Sentiment: strongly positive; long-running well-reviewed local roofer.

### 2. Need A Roofer LLC — Parachute, CO
- Trigger: NO TRIGGER (reviews not found).
- Google profile exists (place_id 2618494858604035; 256 Smokey Hill Cir, Parachute; own site needaroofernow.com, published phone (970) 987-0439). No indexed reviews located on any platform; own site shows no testimonials section.
- Sentiment: UNKNOWN — thin or no review footprint (weak review presence; possible AI-discoverability gap).

### 3. Good Knight Roofing — Montrose, CO
- Trigger: NO TRIGGER (clean/undated).
- Multi-office company (Montrose office: 336 S 10th St Ste 219, (970) 313-0808). Ratings 4.3–5.0 across locations; Montrose-office-specific recent reviews not locatable. Own site shows recent 5-star testimonials praising communication and insurance-claim handling.
- Sentiment: positive overall; well-established, multi-office brand.

### 4. LH Roofing LLC — Delta, CO
- Trigger: NO TRIGGER (clean/undated).
- Single ~5.0 review visible (aggregator profile); one positive testimonial praising reliability and competitive pricing. No negative reviews found.
- Sentiment: positive but thin review base.

### 5. San Juan Metals LLC — Montrose, CO
- Trigger: NO TRIGGER (clean/undated).
- 5.0/5 across 4 reviews (Loc8NearMe); most recent review dated October 2023, praising product quality, price, and service. No reviews in ~2 years.
- Sentiment: positive but stale; review activity has gone quiet (possible review-velocity angle, but no trigger).

### 6. David Electric (Shane David Electric Inc) — Carbondale, CO
- Trigger: NO TRIGGER (dates unknown; cannot establish recency).
- Google rating 3.3/5 across 6 reviews — notably mixed for this batch. Aggregator qdexx shows 4.5/5. Individual review dates and negative-review text not recoverable from search. No review could be confirmed as posted in the last 30 days.
- Sentiment: mixed; lowest aggregate rating in this batch. Flag for a re-check next run or deeper fetch — a recent low-star review here is the most plausible latent trigger.

### 7. West Elk Electric — Cedaredge, CO
- Trigger: NO TRIGGER (clean/undated).
- BuildZoom lists customer review average 3/5 (review count/dates not shown); Birdeye shows 5.0 with 1 review; own site carries one positive testimonial. No dated recent reviews locatable.
- Sentiment: mixed-to-positive; thin review footprint.

### 8. National Electric Co — Grand Junction, CO
- Trigger: NO TRIGGER (clean/undated).
- BBB A+ rating, established 2008 (owner Joe Cote), 1285 Walnut Ave. No Google reviews surfaced in search.
- Sentiment: UNKNOWN — no review footprint found.

### 9. Matthews Electric — Grand Junction, CO
- Trigger: NO TRIGGER (clean/undated).
- 5.0/5 across 3 reviews (Birdeye); most recent review ~3 years ago. No recent activity.
- Sentiment: positive but dormant review profile.

### 10. Scott's Pump Repair and Maintenance (LLC) — Fruita, CO
- Trigger: NO TRIGGER (reviews not found).
- Entity verified via Colorado SOS: Scott's Pump Repair and Maintenance LLC, 910 E Pabor Ave, Fruita, good standing since 2018. No Google or aggregator reviews locatable. (Note: search results surfaced Mike Scott Plumbing, a different business, and were not used.)
- Sentiment: UNKNOWN — no review footprint found.

### 11. Buckhorn Roofing Inc — Montrose, CO
- Trigger: NO TRIGGER (clean/undated).
- Angi 5.0, qdexx 4.5 (2 reviews); no dated recent reviews. PO Box 775, (970) 252-0365; no own website in records.
- Sentiment: positive but thin.

### 12. Sahila LLC Landscape — Carbondale, CO
- Trigger: NO TRIGGER (reviews not found).
- Multiple directory profiles (ranklabel, provenexpert, bunity); all show zero reviews. No Google reviews locatable.
- Sentiment: UNKNOWN — no review footprint found.

### 13. Ruano Landscaping LLC — Carbondale, CO
- Trigger: NO TRIGGER (clean/undated).
- Home Service Lookup lists 5.0/5 rating; ShowMeLocal/usdirectory show 0 reviews. No dated reviews locatable.
- Sentiment: positive per aggregator, thin base.

## Notes for the execution job
- No review-triggered outreach is warranted this run. The engine's 90-day rule is unaffected.
- Closest watch item: David Electric (Carbondale) carries the batch's lowest Google aggregate (3.3/5, 6 reviews) but review dates could not be recovered; consider a targeted re-check next pass — a fresh low-star review there would be a genuine pain signal (poor customer experience / communication categories plausible).
- Review-footprint gaps (Need A Roofer LLC, Scott's Pump Repair, Sahila LLC Landscape, National Electric Co): four prospects with zero locatable reviews — not triggers, but weak review-presence signals worth the engine's "reviews from the start" new-business angle where applicable.
- No reviewer identities recorded; no review text quoted; no reviews fabricated. Gaps stated honestly where nothing was found.
