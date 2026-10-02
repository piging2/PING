# WATCH-graduation verification, round 77 (2026-09-17 ~14:30 MDT)

Verified claimed own sites live. Only facts verbatim on each business's own site were recorded. Directory-listing data was not used as verification. Contact-page fetches that failed were not retried more than the task allows.

## Verdict table

| business | site status | email (verbatim or "none") | phone | owner | years | services | stack | verdict |
|---|---|---|---|---|---|---|---|---|
| Cleaner Carpets By George | dead: homepage fetch failed (browser service could not fetch; also failed round 76) | none | none | unknown | unknown | carpet cleaning (from directory only, unverified) | unknown | FAIL |
| Trinity Carpet Care | live: carpetcleaninggj.com homepage renders | none | none | family owned and operated (no names) | 20+ years industry experience | carpet care, upholstery, flooring, pressure washing, commercial 1-time/monthly/quarterly/semi-annual | WordPress | WATCH-stays |
| GJ Carpet Cleaners | live: gjcarpetclean.com homepage renders | none | none | father and son team (no names) | started public service Feb 2020; 4th/5th generation Grand Valley natives | carpet cleaning, upholstery, carpet shampooing | GoDaddy Website Builder (wsimg) | WATCH-stays |
| Royal Restoration | dead: royalhelpme.com fetch failed (browser service could not fetch) | none | none | unknown | unknown | unknown | unknown | FAIL |
| C.A.R.E. Cleaning & Restoration Experts | live: swcare.com homepage renders | none (an "Email Us" link exists but no verbatim address on the page) | 970-564-0800 (Cortez/Dolores), 970-247-2626 (Durango) | unknown | since 2003 (23+ years) | water mitigation, structural drying, smoke/fire, mold, biohazard, commercial cleaning, upholstery, air duct, hard-surface floor care | WordPress | WATCH-stays |
| The Merino Co. | live: themerinoco.com homepage renders | none | 5059300219 | Lloyd and Lisa Merino | Est. 2024 | handyman, dump trailer (gravel/firewood/junk/yard waste), snow removal | Wix | WATCH-stays |
| Handyman Ivan | live: handymanivan.com homepage renders | none | +1 970-901-6053 | Ivan Reuchon (founder) | 15+ years | drywall, commercial/house cleaning, plumbing, lighting/electrical, painting/staining, flooring, carpentry, property maintenance | custom static site (/assets/) | WATCH-stays |
| NSO Construction LLC | dead: nsoconstruction.com fetch failed (browser service could not fetch) | none | none | unknown | unknown | unknown | unknown | FAIL |
| Egger Cleaning & Handyman Services LLC | live BUT wrong business: eggerbusinesshub.com is "Egger Business Hub", a local work-request/service-matching platform for Meeker and surrounding communities, not a cleaning or handyman service | none | none | unknown | unknown | platform: request service, find work, connect business resources | unknown builder | FAIL |
| John's Service | dead: johnsservice.net fetch failed (browser service could not fetch) | none | none | unknown | unknown | unknown | unknown | FAIL |
| Durango Handyman | live: durangohandyman.com homepage renders | none | (970) 259-1843 | unknown | copyright 2020 (stale) | home/business repair (generic) | GoDaddy Website Builder (wsimg) | WATCH-stays |
| Many Mini Jobs | live: manyminijobs.yolasite.com renders | none | none | unknown | unknown | carpentry, roofing, landscaping, yard maintenance, property management, snow removal, housekeeping, debris hauling, auto detailing, window cleaning | Yola (free builder) | FAIL |
| Right Fix Handyman | live BUT not taking clients: rightfixdgo.com says "We are working on big things. In the meantime, we are not taking any new clients." | none | none | unknown | unknown | unknown | Squarespace | FAIL |
| Ward's Painting and Home Repair | live BUT wrong business: wards.com is Montgomery Ward, the national catalog/credit retailer. Nothing to do with the Fruita painting business. | none | none | n/a | n/a | n/a | Salesforce Commerce (Demandware) | FAIL |

Note: Swiss Pro Carpet Cleaning was skipped per instructions (already verified and drafted round 76).

## DRAFT-ELIGIBLE: none

No business published a contact email verbatim on its own site. DRAFT-ELIGIBLE requires a verbatim own-site email. The phone-only sites (C.A.R.E., Merino Co., Handyman Ivan, Durango Handyman) are PARTIAL and stay on WATCH.

## Website weakness notes (revamp angle eligibility)

Revamp pitches go only to very non-technical owners with weak websites. Candidates from this batch:

* Trinity Carpet Care: weak. Homepage repeats the same three text blocks verbatim three times (broken theme/builder duplication). No visible phone, email, or booking on the homepage. Family-run, IICRC certified, 20+ years, but the site looks neglected.
* GJ Carpet Cleaners: weak. GoDaddy builder one-pager, extraction showed only the About Us paragraph, no visible contact details or service booking. Father-and-son shop, good story, thin site.
* Durango Handyman: weak. GoDaddy builder, stock photos only, copyright still 2020, one page with address and phone and nothing else. Looks abandoned.
* Many Mini Jobs: weakest of the batch. Free Yola site with typos ("maintenace", "Licenced", "Its the season", "Fully equiped") and zero contact info anywhere on the page. Very non-technical owner signal, but no contact route either, so it cannot be reached by email.
* Handyman Ivan: not clearly weak. Custom-built site, but the homepage service icons render as raw unicode blocks (boxes and symbols), which looks sloppy on some browsers. Phone and founder name published.
* The Merino Co.: basic Wix family site, Est. 2024, phone published. Not strong, not terrible. Too new and too thin for a confident revamp read.
* C.A.R.E.: not a revamp candidate. Professional WordPress site, since 2003, multi-location Four Corners coverage, 23+ years. Solid.

## Fetch-failure log

* carpetsbygeorgeco.com: failed round 76 and again this round. Treat the domain as dead or blocked to automated fetch.
* royalhelpme.com, nsoconstruction.com, johnsservice.net: each failed once this round with "browser-service could not fetch the requested page". Not retried per the two-attempt cap.
* carpetcleaninggj.com/contact/ and gjcarpetclean.com/contact: both failed. Homepages render, so contact pages may exist but could not be reached this run.
* swcare.com "Email Us" outlink: fetch failed. No verbatim email observed.

## Recommendation for the round

Four phone-only sites (C.A.R.E., Merino Co., Handyman Ivan, Durango Handyman) could move to WATCH with phone-only contact for Facebook-first or phone outreach, but none are email-draftable. Six are hard FAILs (dead domains, wrong business, no new clients, no contact). Recommend suppressing Ward's Painting entirely unless a correct domain for the Fruita business is found; wards.com is a dead end.
