# Reviews Round 100 — review pre-send delta + cheap-verify + chain re-verification

Run: 2026-09-20 ~11:30 MDT (three parallel workers). Queue under test: email-queue-2026-09-21.md (10 slots: 9 F2s + 1 cold; fires 18:00 MDT 2026-09-20), email-queue-2026-09-22.md slots 1-3 (F1s; fires 18:00 MDT 2026-09-21).

Review window: new reviews posted on or after 2026-09-08. TRIGGER = new review of 2 stars or fewer, OR new 3-star mentioning phone/response/wait/scheduling problems. Undated or aggregate-only reviews = intel-only, never triggers. Per policy: no reviewer names, no review text recorded anywhere.

Limitation (all workers): Google Maps' full dated review feeds were not directly accessible. "No dated new review found" is based on search-surface evidence (Birdeye, Angi, chamberofcommerce.com, Porch, Yelp pages, directorii.com, namesandnumbers.com, own-site review blocks), not an exhaustive scan.

## JOB 1 — 2026-09-21 queue (fires 18:00 MDT 2026-09-20)

### Slot 1. E&E Door and Window (Grand Junction) → info@eedw.net

- Review delta: TRIGGER N. Birdeye aggregate 4.4 stars / 31 reviews, no per-review dates (intel-only). chamberofcommerce.com listing: most recent visible reviews Nov 2024 and Nov 2020, both pre-window. Angi 5.0/5. No dated review on or after 2026-09-08 found anywhere.
- Cheap-verify: PASS. Footer of https://eedw.net/ (own domain) renders "Email: info@eedw.net" verbatim.
- Chain: INDEPENDENT. Own site self-describes as "Locally owned and operated... over 45 years" in Grand Junction; no franchise or acquisition signals.
- Verdict: GO.

### Slot 2. R & H Mechanical (Eagle/Basalt) → info@randhmechanical.com

- Review delta: TRIGGER N. namesandnumbers.com lists 10 reviews dated Jul 2024 through Sep 2025, all pre-window. Birdeye Aspen profile 3.0 / 6 reviews, no dates; one undated negative snippet (missed-call complaint) = intel-only per policy. No dated review on or after 2026-09-08 found.
- Cheap-verify: PASS. http://www.randhmechanical.com/ (own domain) homepage footer renders "info@randhmechanical.com" verbatim, alongside the two locations (Eagle and Basalt).
- Chain: INDEPENDENT. Jan 2024 Generational press release describes R&H Mechanical as an employee-owned company (ESOP); R&H was the ACQUIRER of PJ's Plumbing & Heating (Belgrade, MT), not the acquired party. Not a franchise; no parent-chain signal.
- Verdict: GO.

### Slot 3. Certainty Appliance Repair (Arvada) → CertaintyAppliance@ymail.com

- Review delta: TRIGGER N. Angi 5.0 (1), aggregate only, no date (intel-only). No dated reviews surfaced anywhere. Thin review footprint overall.
- Cheap-verify: PASS (priority finding). The email renders verbatim on their own site at https://www.certaintyappliance.com/home-owners/ (own domain): a published line inviting people to email a description of the problem to CertaintyAppliance@ymail.com. Confirmed by direct page fetch today. This resolves the prior run's open item.
- Chain: INDEPENDENT. Own site: "family-owned 100% Colorado company," "Arvada, Colorado small business... serving Metro Denver since 1991." No franchise or acquisition signal.
- Verdict: GO.

### Slot 4. Reliant Roofing (Grand Junction) → frontdesk@reliantroofinggj.com

- Review delta: TRIGGER N. Birdeye 3.6 / 34 reviews, no per-review dates (intel-only; visible snippets skew positive). Porch 3.97 / 31, aggregate only. Aggregate is middling (3.6) but no new dated low-star reviews to trigger on.
- Cheap-verify: PASS. reliantroofinggj.com (own domain) renders "frontdesk@reliantroofinggj.com" verbatim in footers across residential, commercial, contact, service-area, and about pages.
- Chain: INDEPENDENT. Homepage states "Locally owned and operated"; serving the Western Slope since 2007. No franchise or acquisition signal.
- Verdict: GO.

### Slot 5. Super Junkers (Denver) → office@superjunkers.com

- Review delta: TRIGGER N. Aggregate 4.9 stars (3,198 reviews) shown on own homepage. Individual reviews surfaced via outdoornearme.com and site pages are all 5.0 and undated. No dated review on or after 2026-09-08; no negative review of any age surfaced in any search. Google Maps' full dated feed not directly accessible.
- Cheap-verify: PASS. office@superjunkers.com renders verbatim on own site: superjunkers.com/contact-us/ ("Get in Touch with Super Junkers" contact block) and superjunkers.com/hot-tub-removal-in-denver/.
- Chain: INDEPENDENT. No franchise affiliation, chain ownership, or acquisition news. Manta: "a local and family owned business," privately held Denver company; ScrapMonster: founded 2015 by Levi Greenman from a Denver garage; Cortera: "SUPER JUNKERS LLC" private, 1-5 employees, founded 2020.
- Verdict: GO.

### Slot 6. Bosco Masonry Restoration (Arvada) → boscomasonry@gmail.com

- Review delta: TRIGGER N. OutdoorNearMe listing: all 5.0 reviews, undated. oneallratings: 5 stars across 2 reviews, undated. Conflation trap ruled out: Angi/birdeye reviews for "Bosco Plastering" in Chicago, IL (run by someone named Charlie, reviews from 2012) are a DIFFERENT business, not Bosco Masonry Restoration of Arvada. No negative reviews tied to the Arvada masonry business surfaced anywhere.
- Cheap-verify: PASS (priority finding). Official site located: boscomasonry.com ("Bosco Masonry Restoration and Tuck Pointing," 5400 Sheridan Blvd, Arvada, CO). Homepage footer shows boscomasonry@gmail.com verbatim alongside 720-474-6412. Fetched live today. The prior concern (own site not surfacing in search) is resolved.
- Chain: INDEPENDENT. No franchise affiliation, chain ownership, or acquisition news. Small local operation ("Hector and his team") in Arvada.
- Verdict: GO.

### Slot 7. 303 Sprinklers (Aurora) → 303sprinklers@gmail.com

- Review delta: TRIGGER N. Yelp "TOP 10 BEST Irrigation in Denver" page includes a positive review of 303 Sprinklers (undated, multi-year customer). No dated reviews on or after 2026-09-08 surfaced; no negative reviews of any age surfaced. Google's full dated review list not accessible.
- Cheap-verify: PASS (prior round 99, 2026-09-20 08:30 MDT: renders verbatim on 303-sprinklers.com/contact.html). Not redone per task; nothing in this pass contradicted it.
- Chain: INDEPENDENT. No franchise affiliation, chain ownership, or acquisition news. datanyze profile: 4 employees, ~$940K revenue, Aurora HQ, small independent shop. Search noise ruled out: Pacific Lawn Sprinklers FDD documents are a NY franchise, unrelated.
- Verdict: GO.

### Slot 8. Fort Comfort Gutters (Denver) → info@fortcomfortservices.com

- Review delta: TRIGGER N. directorii.com review page (crawled ~2026-09-13) lists four reviews: roughly mid-July through mid-August 2026 (relative "1-3 months ago" at crawl), all pre-window, all 5.0 stars. No dated review on/after 2026-09-08; no negative reviews anywhere. Own site's review block likewise all positive (undated).
- Cheap-verify: PASS. info@fortcomfortservices.com renders verbatim on own site's estimate page, fortcomfortgutters.com/estimate, in the "Contact Us Directly" block alongside 303-970-9900.
- Chain: INDEPENDENT. No franchise affiliation, chain ownership, or acquisition news. "Founded in Denver," expanded to a second office in Boulder, CO in July 2025 (own expansion press release, self-expansion, not a franchise).
- Verdict: GO.

### Slot 9. Denver Sprinkler and Landscape (Englewood) → info@denversprinklerservices.com

- Review delta: TRIGGER N. Birdeye aggregate 4.3 stars across 111 reviews (count growing, ~105 forty days prior), no individual review dates shown. Third-party "latest reviews" sample: one 1.0-star and three 5.0-star, all undated; the 1-star's text contradicts its low rating (suggests a rating misclick) = intel-only per policy. No reviews dated on/after 2026-09-08 found.
- Cheap-verify: PASS. Fetched live: own site header shows "Email Us: info@denversprinklerservices.com" and the footer repeats the address verbatim.
- Chain: INDEPENDENT. Single-location Englewood company; multiple directory profiles describe it as family-owned; named owner is a local individual; zero franchise, chain, or acquisition signals.
- Verdict: GO.

### Slot 10. Smart Living Water (Grand Junction) → smartlivingwatergj@gmail.com

- Review delta: TRIGGER N. Aggregate 4.9 stars (57 five-star, 1 one-star); no dates on any individual review, including the single 1-star. No reviews dated on/after 2026-09-08 found.
- Cheap-verify: skipped (already done 2026-09-15: address fetched LIVE from own contact page, PASS).
- Chain: INDEPENDENT WITH CAVEAT. Own site (fetched live) states "Proudly Family-Owned," "locally owned and operated," "began as a shared passion between two brothers"; BBB lists Smart Living W, LLC with two Grand Junction locations. Caveat: a third-party aggregator describes a similarly named entity ("Smart Living Water Purification of the Rockies," 150 W Main St) as part of a multi-state operation ("division of Palm Beach Water Purification," ~15 locations). Different entity name and domain; could not verify whether it is the same business, an affiliate, or unrelated. No franchise disclosure on the business's own site.
- Verdict: GO WITH CAVEAT. Own-site and BBB evidence supports independence (local buying authority present), but the similarly-named multi-state entity is unresolved; worth one more verification pass before heavy follow-up spend.

## JOB 2 — 2026-09-22 queue F1s (fires 18:00 MDT 2026-09-21; review delta only)

### Slot 1. B & B Plumbing & Heating (Rifle) → rifleplumber@yahoo.com

- Review delta: TRIGGER N. Only dated reviews found: Mar 2026 (5.0), Jan 2026 (5.0), Jan 2026 (5.0). Nothing dated September 2026. Aggregates (4.4 stars across 63-67 reviews on one aggregator; 3.8 on Angi) are intel-only, no dates.
- Verdict: GO.

### Slot 2. Comfort Air Of Grand Junction LLC → office@comfortairco.com

- Review delta: TRIGGER N. Birdeye aggregate 4.7 stars, 410 reviews, no dates. One aggregator's "most relevant" sample includes an undated negative review describing a no-show appointment and unanswered follow-up = intel-only per policy. Four undated 5-star reviews on another aggregator; Lennox dealer page shows 4.7 aggregate (556 reviews). No reviews dated on/after 2026-09-08 found.
- Verdict: GO.

### Slot 3. American Asphalt (Glenwood Springs) → asphalt@americanasphalt.biz

- Review delta: TRIGGER N. Angi aggregate 3.7 from 3 reviews (two 5-star, one 1-star per star distribution), none dated; the undated 1-star = intel-only. Porch shows 4.3 average across 10 online reviews. No reviews dated on/after 2026-09-08 found. Employee reviews ignored (not customer reviews).
- Verdict: GO.

## Verdict table

| Slot | Business | Review trigger? | Cheap-verify | Chain | Verdict |
|------|----------|-----------------|--------------|-------|---------|
| 09-21 / 1 | E&E Door and Window | N | PASS (own footer) | INDEPENDENT | GO |
| 09-21 / 2 | R & H Mechanical | N | PASS (own footer) | INDEPENDENT (ESOP) | GO |
| 09-21 / 3 | Certainty Appliance Repair | N | PASS (own site) | INDEPENDENT | GO |
| 09-21 / 4 | Reliant Roofing | N | PASS (own footers) | INDEPENDENT | GO |
| 09-21 / 5 | Super Junkers | N | PASS (own contact page) | INDEPENDENT | GO |
| 09-21 / 6 | Bosco Masonry Restoration | N | PASS (boscomasonry.com) | INDEPENDENT | GO |
| 09-21 / 7 | 303 Sprinklers | N | PASS (round 99) | INDEPENDENT | GO |
| 09-21 / 8 | Fort Comfort Gutters | N | PASS (own estimate page) | INDEPENDENT | GO |
| 09-21 / 9 | Denver Sprinkler and Landscape | N | PASS (own header/footer) | INDEPENDENT | GO |
| 09-21 / 10 | Smart Living Water | N | PASS (2026-09-15) | INDEPENDENT* | GO WITH CAVEAT |
| 09-22 / 1 | B & B Plumbing & Heating | N | n/a (F1) | n/a | GO |
| 09-22 / 2 | Comfort Air Of Grand Junction LLC | N | n/a (F1) | n/a | GO |
| 09-22 / 3 | American Asphalt | N | n/a (F1) | n/a | GO |

\* Smart Living Water caveat: similarly-named multi-state entity ("Smart Living Water Purification of the Rockies," Palm Beach Water Purification division, ~15 locations) unresolved vs. the Grand Junction family-owned LLC. Own-site and BBB evidence supports independence; one more verification pass recommended before heavy follow-up spend.

Method note: three parallel workers ran the checks; findings above are search-surface evidence only (Birdeye, Angi, chamberofcommerce.com, Porch, Yelp pages, directorii.com, namesandnumbers.com, own-site fetches). Google Maps' full dated review feeds were not directly accessible, so "no trigger" means no dated trigger-review found, not proof none exists.
