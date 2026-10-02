# Review-intelligence lane — 2026-09-23 (read-only scan)

Run by the discovery-research review lane. 8 fresh prospects scanned via web search (business name + town + "reviews"). Trigger rule: NEW review (roughly last 30 days) of 2 stars or fewer, OR new 3-star mentioning phone/response/wait/scheduling problems. Undated negatives are NOT triggers (round-123 precedent). Namesake-crowded results are NOT triggers. No reviewer names, no review text recorded.

## Businesses checked

1. **Fresh Start Carpet Cleaning — Grand Junction** — Birdeye 4.6 (43 reviews); all surfaced reviews positive. Namesakes in Thornton, Henderson NV, plus a similarly-named "FreshStep" national chain crowded results. No negatives on the GJ profile. NO TRIGGER.
2. **4 Corners Carpet Cleaning LLC — Grand Junction** — No review profile found for this exact business. Angi hit was actually "WMD Carpet Cleaning" (different business, slug confusion). Directory-only, CDOS-verified LLC, no review footprint. NO TRIGGER.
3. **Super Kleen — Montrose** — Heavy namesake crowding: Super 8 motels, Super Kleen Auto Detailing (Saugus), Super Kleen Softwash (North Carolina), Durban SA dry cleaner. No review profile found for super-kleen.com Montrose cleaning service. NO TRIGGER.
4. **Timberline Carpet And Upholstery — Montrose** — Birdeye 4.7 (28), HomeAdvisor 5.0 (22), own testimonial page all 5-star. No negatives surfaced. NO TRIGGER. Data note: phone conflict — 970-945-6324 (pipeline row, directory) vs 970-417-4489 (Birdeye profile); reconcile before any phone outreach.
5. **McKay Tree Service — Clifton** — Namesake crowding: McKay Tree Service in Mount Prospect IL (4.9/60 Angi) and Cornelia GA crowded results. Clifton BBB profile exists but shows no reviews; localtreecompany.com lists Clifton McKay Tree Service with "No Reviews". NO TRIGGER. Data note: superpages lists them as "Open 24 Hours Mon-Sun" (claimed on their listing), not treated as a review signal.
6. **J & R Concrete — Grand Junction** — Search surfaced "J&R Construction" (HomeAdvisor, 521 Sara Lane, 4.7/6, in business since 2024) with one long negative non-recommend review; identity match to the pipeline J&R Concrete (3058 D Rd / 2846 Unaweep Ave, legacy Google Business Site only) is UNCONFIRMED, and the review date is not tied to it. Under the undated-negative precedent: NO TRIGGER. Flag for research lane: verify whether J&R Construction (HomeAdvisor) is the same entity as J&R Concrete (address conflict already recorded in pipeline row).
7. **Tom's Electric Motor and Pump Service — Montrose** — loc8nearme 4.6 (17 reviews); most recent surfaced review February 2025, nothing recent. Birdeye "Tom's Electric" 2.7 (3 reviews) is a Trinidad CO namesake, not this business. NO TRIGGER.
8. **First Drilling LLC — Montrose** — B2B mineral-exploration driller; only Indeed employee reviews (2020 and earlier), no customer review profile found anywhere. NO TRIGGER.

## Triggers

0 triggers.

## Summary

- Scanned: 8 businesses (4 round-123 carpet cleaners, McKay Tree Service, J & R Concrete, Tom's Electric Motor and Pump Service, First Drilling LLC).
- Real triggers: 0.
- Dominant non-signal classes again: namesake crowding (Super Kleen, McKay Tree Service, Tom's Electric) and identity-ambiguous undated negatives (J & R Concrete / J&R Construction HomeAdvisor).
- Data-quality notes for the engine/research lanes:
  - Timberline Carpet And Upholstery phone conflict: 970-945-6324 (directory) vs 970-417-4489 (Birdeye). Reconcile before any phone outreach.
  - J & R Concrete identity question: HomeAdvisor's "J&R Construction" (521 Sara Lane, GJ, since 2024, 4.7) may or may not be the pipeline J&R Concrete (legacy Google Business Site only). Do not merge without verification.
  - 4 Corners Carpet Cleaning LLC, Super Kleen (Montrose), and First Drilling LLC have no public customer review footprint — thin-review-profile pattern, consistent with phone-only/one-operator shops in the program.
