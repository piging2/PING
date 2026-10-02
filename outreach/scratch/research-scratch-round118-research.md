# Round 118 research lane (2026-09-22 ~17:15 MDT)

Read-only research lane. No outreach performed. Canonical JSONL NOT edited (staging to pipeline.md only).

## Task 2 — cheap-verify email routes (completed 2026-09-22 ~17:30 MDT)

Cheap-verify rule: email address verbatim-published on the business's OWN site (footer / contact page / mailto), NOT directory-only. Live fetches via browser_open 2026-09-22; one contact-page fetch failed on tool error (not page absence).

### 1. J&B Outdoor Maintenance and Landscaping LLC — jandblandscape.com
- Site fetched live: YES (homepage). Owners Jesse and Ben named on site. Phone (970) 236-6090.
- Email verbatim-published: YES — `jblandscapinggj@gmail.com` appears on the own site per search-index crawl of jandblandscape.com/contact (header line "(970) 236-6090 jblandscapinggj@gmail.com"; contact block "J&B Outdoor Maintenance and Landscaping / jblandscapinggj@gmail.com") and jandblandscape.com/reviews. Live homepage text extract showed phone only (header not captured); contact-page live fetch not completed.
- Verdict: EMAIL ROUTE FOUND (own-site evidence). Recommend one live contact-page fetch before first send to confirm rendering.

### 2. Shield Pest Control LLC — shieldpestcontrolgj.com
- Site fetched live: YES (homepage + /contact/).
- /contact/ shows phone (970) 314-9955 + "LET US KNOW HOW WE CAN HELP" form only. No email in any fetched text.
- Verdict: NO email route on own site. Phone + form only. Stays phone/form-route.

### 3. RER Plumbing and HVAC LLC — rergj.com/contact/
- Site fetched live: YES. "E-Mail Us" section lists `info@rergj.com` verbatim. Phone 970-596-3300.
- Verdict: EMAIL ROUTE CONFIRMED (verbatim on own contact page). GO, subject to the send-eligibility gate at send time.

### 4. Affordable Appliance LLC — applianceservicecolorado.com
- Site fetched live: YES (single page, Contact Us section included).
- Contact: phone 970-874-1062, 339 Main St, Delta CO 81416, Mon-Fri 9-5. No email in 80 lines of page text.
- Verdict: NO email route. Phone-only confirmed (matches round-117 phone-route staging).

### 5. Straight Edge Striping & Maintenance — straightedgestripinggj.com (round-115 WARM HOLD)
- Homepage fetched live: YES (99 lines). Form CTA + embedded named Google reviews; no email in extracted text.
- Contact-page fetch: FAILED on browser tool error (not a page absence).
- Exact-address web search for `straightedgestripingllc@gmail.com`: zero hits for the GJ business (only unrelated same-name companies in TX/GA/LA/NJ). Own-site search index shows phone +1 970-640-4465 and 695 Cloverdale Dr, Grand Junction — no email anywhere.
- Verdict: NOT cheap-verified. The round-115 "own-site published" claim is unconfirmed this round and the address does not appear in the own-site search index. HOLD stands. One successful live contact-page fetch required before any send; do not treat as a verified email route.

### 6. State Line Paving LLC — statelinepavingllcut.com (round-115 WARM HOLD)
- Homepage fetched live: YES (162 lines). Phone (970) 628-6226, GJ + Cedar City UT addresses, LIC #13126323-5501, "GET YOUR FREE CONSULTATION NOW" consultation CTA (form). No email.
- Verdict: NO email route. Form/phone route confirmed (matches round-115 form-route). HOLD stands.

### 7. B&B Plumbing F1 — SKIPPED per lane instructions (firmest HOLD, not re-litigated).

## Task 1 — segment research (2 segments, corridor only)

### Garage doors (corridor re-check) — completed 2026-09-22 ~17:26 MDT, 0 STAGED
Honest thin yield: the corridor garage-door pool is largely worked (E&E, Kooler, Professional Garage Doors Montrose, Monument Garage Door, Montrose Garage Doors, Wenco, Bailey's all already in pipeline/leads/JSONL). New discovery surfaced only SEO lead farms and directory-only stragglers. Near-miss count: 14 logged. Chains/roll-ups re-confirmed and excluded: Overhead Door Co. of Grand Junction (national franchise), Prutch's Garage Door (Guild Garage Group roll-up), Kenny's Overhead Doors Rifle (acquired by Prutch's Oct 2024). SEO lead farms excluded: promastergaragedoorservice.com, angelgaragedoorrepair.com, 247quickfixgaragedoorrepair.com, homegaragedoorrepair.com, americanhomegaragedoorservice.com, gaterepairpro.com. Duplicates: Bailey's Garage Doors & More (Rifle, pipeline NEW 2026-09-20), Wenco Garage Doors (Delta, pipeline SKIPPED 2026-09-12). browser.open failed mid-turn so own-site verification could not run; highest-yield follow-up targets logged for a live-browser pass: Quality Garage Doors (GJ, gjdoorsandglass.com claimed-unverified, phone (970) 243-8290 directory-only, possible Alpine Glass trade name), Elite Garage Door Repair LLC (GJ, directory-only), Active Garage Door Service LLC (Rifle, directory-only). Full detail: ~/workspace/outreach/scratch/research-scratch-round118-garage.md.

### Fire/water damage restoration (corridor, fresh) — completed 2026-09-22 ~17:28 MDT, 1 STAGED
Thin yield: the corridor restoration market is consolidated and heavily pre-covered (ECOS, RemediH2O, APS Restoration, Encompass Environmental, Valley Restoration & Construction, Royal Restoration, Clean Pro, Rapid Response already tracked); the franchise layer (SERVPRO, ServiceMaster, 1-800 WATER DAMAGE, Restoration 1, Paul Davis, Blue Kangaroo Packoutz — confirmed franchise via PACKOUTZ International FDD) was re-excluded. Near-miss count: 31 exclusions logged (8 duplicates, 8 franchises, 8 SEO farms/spam incl. Super Duty and ~6 Palisade-specific spam farms, 1 directory-only K2 Restoration Montrose, 1 dead-site MoPolish GJ, 2 out-of-corridor, 1 wrong-trade). One qualifier staged: Mesa Restoration (GJ, mesarestorations.com, family-owned independent per own site, IICRC certified, 24/7 emergency water/flood/fire/smoke/mold/sewage, serves Mesa/Delta/Montrose counties; phone-route (970) 424-0684 verbatim on own-site /contact, no email; MISSED_CALL_LEAD_CAPTURE high; stack CONFIRMED WordPress; WATCH). Parent-audited dedupe clean across leads.md, pipeline.md, canonical JSONL, archive, facebook-dms.md. Staged row appended to pipeline.md under "## Round 118 segment research (2026-09-22)". Full detail: ~/workspace/outreach/scratch/research-scratch-round118-restoration.md.

Segment totals round 118: 1 qualified candidate staged (target was 15-25; honest thin yield — garage-door pool worked, restoration pool consolidated). Near-misses logged: 16 garage + 31 restoration = 47.

## Task 3 — review delta

Full log: ~/workspace/outreach/scratch/research-scratch-round118-review.md
Verdict: TRIGGERS: 0 — no qualifying new reviews (dated on/after 2026-09-08, <=2 stars or 3-star with phone/response/wait/scheduling mention) found across accessible data for Comfort Air, PQ Plumbing, Jo Mama's Movers, High Mountain Hearth, WBS Coatings, Grime Fighters, M1Pro/GPS/Shelton cohort. Caveats: Comfort Air and PQ Plumbing each have undated negative snippets whose dates could not be verified against the cutoff; Google review pages themselves were not directly accessible (aggregator snippets only).

## Task 4 — SEO/AEO

Full log: ~/workspace/outreach/scratch/research-scratch-round118-seo.md
Grades (observable evidence only, no ranking claims): RER Plumbing (rergj.com) WEAK — branded presence exists but services are shallow, live Lorem Ipsum on /services/commercial/, no FAQ/reviews/hours/granular service-area. Straight Edge Striping (straightedgestripinggj.com) MODERATE — GBP + own site both surface, recent named Google reviews embedded, deepest per-service page architecture; gaps are FAQ, town-level service-area list, hours, "0+" placeholder stat counters. State Line Paving (statelinepavingllcut.com) WEAK — branded #1 but nationally ambiguous brand, zero third-party corroboration, keyword-stuffed titles, no FAQ/reviews/hours/email. Most credible AEO opportunity: Straight Edge Striping (structural: GBP + reviews + service depth already in place; additive gaps are FAQ, service-area list, hours, stat-counter fix).
