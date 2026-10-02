# Candidate verification report — discovery-2026-09-29-0721 segment probe
Date: 2026-09-29. Research only; no sends, drafts, forms, DMs, or Gmail access.
Segments probed: flooring (7, Grand Junction corridor) + garage-door remainder (3, GJ/Orchard City).
Result: **4 QUALIFY, 6 NEAR-MISS**.

Rule applied throughout: only contact info genuinely published on the business's own site is
recorded as own-site confirmed; directory-corroborated values are marked as such. Chains,
franchises, and dealer-network affiliates are excluded per standing campaign policy.

---

## 1. Gallagher's Flooring — Grand Junction, CO
- Own site: https://gallaghersflooring.com/ (live, verified via search snippet; own-site text reviewed)
- Town/trade: 1100 Pitkin Ave, Grand Junction, CO 81501 — flooring showroom + installation + kitchen & bath remodeling. Real operating business (in business since 2009; founders Pat and Char Smith).
- Independence: **FAIL — dealer-network affiliate.** Own-site footer reads "© 2026 Flooring America. All Rights Reserved" and site promotes the "Adore Your Floor™ Guarantee" (Flooring America trademark). Flooring America dealer networks were excluded in round 25 under the chain/dealer rule.
- Contact (own site): (970) 609-0273; 1100 Pitkin Avenue, Grand Junction, CO 81501; Book Appointment / Schedule Free Room Measure / Order Flooring Samples flows observed.
- **VERDICT: NEAR-MISS — Flooring America dealer-network affiliate; excluded under the no-chains/dealer-networks rule.**

## 2. Heritage Hardwoods — Grand Junction, CO
- Own site: finewoodfloors.net — **unreachable in this pass** (fetch failed; no resolvable response). Directory evidence: 2595 Fruitridge Dr, Grand Junction; (970) 270-3870; hardwood install/sand/finish, ~25 yrs experience claimed.
- Independence: unknown (site not viewable); no chain affiliation evidence in directories.
- Contact: directory-only; nothing own-site confirmed.
- **VERDICT: NEAR-MISS — own site unreachable in this pass; directory-only. Re-try with a rendered fetch in a later run.**

## 3. Black Canyon Flooring LLC — Grand Junction, CO
- Own site: http://www.blackcanyonflooring.com/ (live; full homepage text fetched)
- Town/trade: Grand Junction, CO — flooring contractor (hardwood, laminate, vinyl, repair/restoration/replacement). Licensed & insured per own site. Service area: Grand Junction, Clifton, Fruita, Palisade, Mesa County.
- Independence: independent LLC; no chain/dealer-network/franchise signals. HomeAdvisor: 5.0/6 reviews, ~6 yrs.
- Contact: own-site "Call now!" CTAs throughout; free estimates; phone number not in the rendered text of this fetch — directory-corroborated (970) 778-0948; address directory-corroborated 764 Glen Ct, Grand Junction.
- Stack: UNKNOWN (thin marketing page; no CMS fingerprint or business software observed).
- Friction → opportunity: free-estimate call funnel with a small crew; no online intake form observed; estimate calls that land after hours or mid-job go to voicemail → PING as after-hours estimate-request capture + missed-call text-back. Confidence: moderate (phone-route only; intake friction unconfirmed by form absence).
- **VERDICT: QUALIFY.**

## 4. Good Shepherd Flooring Center, LLC — Grand Junction, CO
- Own site: https://goodshepherdflooring.com/ (live; about-us page fetched)
- Town/trade: 598 Northgate Dr, Grand Junction, CO 81505 — full-service flooring (order → installation → carpet cleaning) plus kitchen & bathroom remodeling and Hunter Douglas window coverings. Second showroom in Glenwood Springs.
- Independence: **family-owned LLC, not a franchise.** Own site: "With over 25 years of family-owned expertise... Family-owned and operated... proudly serving Grand Junction, Glenwood Springs, and the Roaring Fork area." Two-location family business, no buying-group/franchise brand signals.
- Contact: own-site "Contact Us Today" CTA; phone/address directory-corroborated — (970) 257-1111; 598 Northgate Dr, Grand Junction, CO 81505.
- Stack: UNKNOWN (no business software observed).
- Friction → opportunity: design-consultation appointment funnel across two showrooms; scheduling coordination friction; Google rating 3.2/11 reviews — review footprint bears watching for service/follow-up complaints → PING as appointment capture + post-visit follow-up. Confidence: moderate.
- **VERDICT: QUALIFY.**

## 5. Alpine Floor Coverings — Grand Junction, CO
- Own site: alpinefloorcoverings.com / https://www.alpinefloorcoverings.com — **failed to render twice** (no extractable content; RocketReach fingerprint: GoDaddy Website Builder, JS-heavy). Domain is registered and claimed as their official website by aggregators.
- Town/trade: 2504 1-2 Weslo Ave, Grand Junction, CO 81505 — flooring retail + install. Real independent business: president Brian Doyle, ~4 employees, Birdeye 4.6/14 reviews. Phone (970) 254-9893 directory-corroborated.
- Independence: independent; no chain/dealer signals.
- Contact: nothing own-site confirmed (site unrenderable in this pass).
- **VERDICT: NEAR-MISS — own site failed to render twice (JS/GoDaddy builder); independent business corroborated by directories; re-try with a rendered fetch.**

## 6. B & B Custom Flooring — Grand Junction, CO
- Own site: **none found.** Only a meta.ai directory listing (565 25 Rd, Grand Junction; (970) 628-4499; tile/hardwood/carpet/vinyl) and old classified ads. No business website located in search.
- Town/trade: Grand Junction flooring installer (20+ yrs claimed in ads); real operating business plausible but unverifiable beyond directories.
- **VERDICT: NEAR-MISS — no own website found; directory/phone-only.**

## 7. Total Floors & Cabinetry — Grand Junction, CO
- Own site: https://www.totalfloors.biz/ (live; product pages crawled)
- Town/trade: 571 25 Road, Grand Junction, CO 81505 — flooring + cabinets + countertops.
- Independence: **FAIL — multi-location Denver-based company.** Own site lists three locations: Denver (1393 S Santa Fe Drive), Denver Design Center (595 South Broadway), Grand Junction (571 25 Road) — all sharing a single phone (303) 309-0735. Not an independent corridor owner-operator; HQ center of gravity is Denver.
- **VERDICT: NEAR-MISS — 3-location Denver-based company; excluded under the independent-shop rule.**

## 8. Affordable Garage Doors — Grand Junction, CO
- Own site: http://www.affordablegaragedoorsgj.com/ (live; homepage text fetched)
- Town/trade: Grand Junction garage door supplier/installer (installs, programming, repairs, custom). Own-site copy: "supplies the finest garage door products in Grand Junction and surrounding areas."
- Independence: independent local shop; no chain/franchise signals. (Note: a similarly named "The Affordable Garage Door CO," 902 Highway 50 Ste 1, (970) 261-4329, garagedoorjunction.com, appears to be a related/separate listing; the verified own site is affordablegaragedoorsgj.com.)
- Contact (own-site published): (970) 773-1042; [email protected]; 838 21 1/2 Rd, Grand Junction, CO 81505; hours Mo–Su 09:00–17:00.
- Stack: **WordPress CONFIRMED** (wp-content asset paths). No CRM, booking widget, or estimating software observed.
- Friction → opportunity: own site advertises 24/7 emergency service while published hours are 09:00–17:00 daily — after-hours emergency calls almost certainly hit voicemail; quote funnel is call-only, no online intake → PING as after-hours emergency-call capture + missed-call text-back. Confidence: moderate-high (clear hours-vs-claim mismatch).
- **VERDICT: QUALIFY.**

## 9. Top Notch Garage Door — Grand Junction / Mesa County, CO
- Own site: http://www.topnotchgaragedoorgj.com/ (live; homepage text fetched)
- Town/trade: Mesa County / Grand Junction garage door contractor — spring replacement, operator installs, seals/hardware, same-day repair. "Owner Operated." (Note: own site says established 2001 while HomeAdvisor lists 6 years — experience claim inconsistent; treat years in business as WEAK.)
- Independence: independent owner-operated shop; no chain/franchise signals.
- Contact (own-site published): (970) 210-1105. HomeAdvisor: 5.0/16 reviews; emergency services offered.
- Stack: **Wix CONFIRMED** (static.wixstatic.com asset paths). No CRM, booking, or estimating software observed.
- Friction → opportunity: same-day-repair promise on a single phone line with the owner on tools — missed calls during jobs are the main lead leak; no online booking observed → PING as missed-call capture + scheduling assist. Confidence: moderate.
- **VERDICT: QUALIFY.**

## 10. West Elk Door — Eckert / Orchard City, CO
- Own site: **none.** The website listed on its directory profiles is http://www.amarr.com/ — the Amarr manufacturer site, not a business site. No business-owned web presence found.
- Town/trade: 12053 CO-65, Eckert (Orchard City area), CO 81418 — garage door/gate sales, service, installation; ~30 yrs claimed (MapQuest); phone (970) 201-8481.
- Caution: reputation footprint is poor — Garage Door Handbook 21/100, Google ~1.25/5 stars.
- **VERDICT: NEAR-MISS — no own website (uses manufacturer page); directory/phone-only. Reputation footprint also weak.**

---

## Segment notes for the playbook
- Flooring in the GJ corridor skews toward dealer-network affiliates (Flooring America, Carpetland, Abbey, Carpet One, Floor Coverings International) — the independent-look showrooms need the footer/copyright check before qualifying. Gallagher's is the cautionary example: family-owned story, Flooring America fine print.
- Real independents found this pass run thin, owner-operated shops with phone-only funnels (B & B, Heritage, Alpine). West Elk Door shows the far end: no web presence at all.
- Garage-door corridor coverage is nearly complete after this pass (Affordable + Top Notch were the last fresh names); segment should be retired as a discovery source.
- Tech-stack signal in both segments: brochure-ware marketing sites (WordPress/Wix) with zero observed CRM/booking/estimating software — consistent with the playbook's established flooring observation (round 25: no CRM/booking/estimating anywhere in the batch).
