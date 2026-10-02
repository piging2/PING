# Tech-Stack Evidence Sweep  -  2026-09-15

Read-only public-web sweep of independent home-service businesses across the
Western Slope. No contact, no forms submitted, no engagement. This is evidence
only: no pattern JSON, no memes, no queue entries in this file.

Grading: OBSERVED (visible in fetched page text or markup), INFERRED (reasoned
from a public signal, labeled as inference), UNKNOWN (not confirmable).
Client-side widgets that cannot be confirmed from a static fetch stay UNKNOWN.
No claim in this file is a joke, and nothing here is cleared for public-facing
clowning.

Scope attempted this pass: 12 business URLs across Fruita, Clifton, Montrose,
and Delta. 7 live sites audited, 1 parked domain (no live business site), 4
URLs unreachable by the page fetcher (tool failures, not evidence; listed at
the bottom for a retry pass).

Trade coverage this pass: plumbing (2), HVAC (3 counting one dual-trade shop),
electrical (3). No roofing, landscaping, pest control, garage door, or
painting sites were successfully fetched this pass; the 2026-09-14 seed below
adds roofing coverage, and landscaping/pest/garage/painting remain unaudited.

## New sweep  -  per-business table (2026-09-15)

| Business | Town | Trade | Site URL | CMS | Booking | Chat | Phone numbers | Review signals | After-hours claim | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Titan Plumbing | Fruita (based GJ) | Plumbing | https://titanplumbinggj.com/fruita-co-plumber/ | [UNKNOWN] no wp-content/wix/squarespace markers in fetched text | [OBSERVED] "Request a Free Estimate" online estimate-request form; [UNKNOWN] provider | None observed in fetched text; [UNKNOWN] client-side widget presence | [OBSERVED] 970-559-5970, consistent everywhere (incl. +1-970-559-5970 schema); single number, no conflict | [OBSERVED] on-page testimonial carousel (5-star quotes, six named customers); [OBSERVED] schema "Rating: 5.0 (6 reviews)"; [UNKNOWN] which third-party platform, none named | [OBSERVED] Emergency plumbing "during business hours (Monday–Friday, 8AM–4PM)" only; explicitly NOT 24/7; office hours M–F 8–4 | [OBSERVED] "Local and family-owned"; SEO-heavy multi-location content site (per-town service pages) |
| Airstream Plumbing & Heating | Clifton | Plumbing/HVAC | http://airstreamplumbingandheating.com/ | [OBSERVED] Hibu website platform (image CDN le-cdn.hibuwebsites.com) | [OBSERVED] "Request Service" link; [UNKNOWN] provider | None observed in fetched text; [UNKNOWN] client-side widget presence | [OBSERVED] (970) 434-5348; 568 32 1/2 Road, Clifton, CO 81520 | [OBSERVED] testimonial section + "leave a review" link; [OBSERVED] "Best of the West" and "Neighborhood App Favorite" award claims; [UNKNOWN] review platform, none named | [OBSERVED] "we offer 24/7 emergency services" on own site; listed office hours Mon–Fri 08:00–17:00; only after-hours path shown is the phone number | [OBSERVED] family-owned since 1983; EPA/NATE certifications claimed |
| Pioneer Heat & AC | Montrose | HVAC | http://pioneerheatandac.com/ | [UNKNOWN] image paths /assets/img/*.webp; no wp-content/wix markers; vendor undeterminable | [OBSERVED] "Schedule a consultation" CTA; [UNKNOWN] provider | None observed in fetched text; [UNKNOWN] client-side widget presence | [OBSERVED] +19709010254 (970-901-0254), single number | [OBSERVED] "100+ Happy Customers" stat; [OBSERVED] "Best of BusinessRate Montrose 2024" award image; [UNKNOWN] review platform, none named | No 24/7 or emergency claim observed on homepage; [OBSERVED] hours Mon–Fri 08:00–17:00, Sat 09:00–14:00 | [OBSERVED] 20+ years experience; financing options section present but [UNKNOWN] provider (no brand named in text) |
| Snipps Heating & Air | Montrose | HVAC | https://www.snipps.com/ | [OBSERVED] Webflow (image CDN cdn.prod.website-files.com) | [OBSERVED] "Call or book  -  Reach a real tech dispatcher 24/7 by phone or online in under a minute"; [OBSERVED] Webflow native form (success message in markup); [UNKNOWN] booking provider brand | None observed in fetched text; [UNKNOWN] client-side widget presence | [OBSERVED] (970) 240-8152, consistent; 113 Rose Lane Suite C, Montrose, CO 81401 | [OBSERVED] customer testimonial section; [UNKNOWN] review platform, none named | [OBSERVED] "24/7 Emergency Service" claim repeated on own site; [OBSERVED] office hours Mon–Thu 8–4, Fri 8–12, Sat–Sun closed with "24/7 emergency" | [OBSERVED] "text when your tech is on the way"  -  [INFERRED] scheduling/customer-notification software in use, provider UNKNOWN; [OBSERVED] financing "View your options" links to third-party portal guest.leadwithcomfort.com (Comfort Connect branded); [OBSERVED] Amana dealer; "real tech dispatcher 24/7" is site text, [UNKNOWN] who staffs it |
| Hometown Electric, Inc | Delta | Electrical | http://www.hometownelectric.biz/ | [UNKNOWN] 12-line page, no CMS markers; vendor undeterminable | No booking/form observed; contact path is phone/email/fax only; [UNKNOWN] provider | None observed; [UNKNOWN] client-side widget presence | [OBSERVED] 970-874-4281; [OBSERVED] fax 970-874-9268; [OBSERVED] email hometownelectric138@gmail.com (consumer Gmail on business site) | None observed | No after-hours or emergency claim observed | [OBSERVED] 25+ years, commercial/residential/industrial; 1065 Hartig Drive, Delta, CO 81416; weakest digital presence in sweep (no form, consumer email, fax listed) |
| KC Electrical Services LLC | Delta | Electrical | https://www.kcelectricservice.com/ | [UNKNOWN] 5-line one-page site, no CMS markers; vendor undeterminable | No booking/form observed; [OBSERVED] "Call Now" phone-only CTA | None observed; [UNKNOWN] client-side widget presence | [OBSERVED] 970-417-2300 | None observed | No after-hours or emergency claim observed | [OBSERVED] minimal web presence: residential/commercial, Delta/Montrose/Western Colorado, phone-only conversion path |
| Crosstech Electrical Contracting | Montrose | Electrical | https://www.crosstechelectric.com/ | [OBSERVED] Wix (image CDN static.wixstatic.com) | No booking CTA observed in fetched text; [UNKNOWN] provider | None observed in fetched text; [UNKNOWN] client-side widget presence | [OBSERVED] 1-970-964-7236, single number; 16307 6900 Road, Montrose, CO 81401-7461 | None observed | No 24/7 claim observed | [OBSERVED] owner Eric Marzolf, opened 2024, no subcontractors; [OBSERVED] "Locally Owned & Operated", Tesla Certified Installer |

## Attempted but not audited (2026-09-15)

- Mad Dog Mechanical, Montrose, HVAC  -  http://www.maddogmechanical.com  - 
  [OBSERVED] parked domain (Cheaper Domains holding page). No live business
  site; excluded from counts.
- A&B Mechanical Services, Montrose, HVAC  - 
  http://www.aandbmechanicalservices.com/  -  page fetcher failed; tool failure,
  not evidence.
- E&D Roofing, Clifton, roofing  -  https://ed-roofing.com  -  page fetcher
  failed; tool failure, not evidence.
- A's Performance Roofing, Clifton, roofing  - 
  http://asperformanceroofing.com/  -  page fetcher failed; tool failure, not
  evidence.
- CQ Roofing Design, Glenwood Springs, roofing  - 
  https://www.cqroofingdesign.com/  -  page fetcher failed; tool failure, not
  evidence.

Retry the four failed URLs on the next sweep pass before counting them as
anything.

## Cross-business pattern notes  -  new sweep only (7 live sites)

Counts derived only from the 7 audited sites above:

- CMS confirmed: 3/7  -  Webflow 1 (Snipps), Wix 1 (Crosstech), Hibu 1
  (Airstream). WordPress confirmed: 0/7. CMS UNKNOWN: 4/7.
- Live chat observed: 0/7. No named chat provider on any site.
- Named booking/scheduling provider: 0/7. Generic "request estimate /
  request service / schedule consultation / call or book" path: 4/7.
  Phone-only (no form at all): 2/7 (Hometown, KC).
- Named scheduling software or CRM: 0/7. One INFERRED case: Snipps's
  "tech on the way" text implies dispatch software; provider UNKNOWN.
- 24/7 or emergency claim on own site: 2/7 (Airstream, Snipps). One site
  explicitly limits emergency to business hours (Titan). No after-hours
  claim: 4/7.
- Single consistent phone number: 7/7. Conflicting numbers (possible call
  tracking): 0/7 in this sweep.
- Testimonials or review signals on site: 4/7. Named review platform
  (Google/Birdeye/Podium widget): 0/7.
- Consumer email on business site: 1/7 (Hometown's Gmail).
- Third-party financing portal linked: 1/7 (Snipps → guest.leadwithcomfort.com).

## Seed data from 2026-09-14  -  labeled separately, not blended

Phase 1 seed: 12 Grand Junction businesses (plumbing, HVAC, electrical,
roofing). Own-site page fetches 2026-09-14; interactive widgets not probed.

Businesses: Pride Plumbing Heating & Cooling; Peterson Plumbing, Heating,
Cooling & Drain; Rocky Mountain Plumbing and Sewer Pros; Avalanche Heating &
Cooling; Comfort Air of Grand Junction; Bemis Electric; White Star Electric;
Barnes Electric; Bros Roofing; Saenz Roofing; Full Curl Roofing Company.
(Pride counted once across plumbing/HVAC; 12 distinct businesses.)

Seed aggregate counts:

- WordPress confirmed: 3/12 (Pride Plumbing, Bemis Electric, Full Curl
  Roofing). CMS UNKNOWN: 9/12.
- Live chat observed: 0/12 in static page fetches.
- Named booking provider observed: 0/12 (generic forms/CTAs only).
- 24/7 or emergency signal: 7/12 (several supported only by third-party
  listings, not own sites).
- Suspected unconfirmed call tracking (conflicting numbers): 2/12
  (Pride, Bros).
- CRM, scheduling software, form providers, answering/tracking services:
  UNKNOWN for all 12.

## Combined counts (new sweep 7 + seed 12 = 19 audited businesses)

- WordPress confirmed: 3/19 (all seed).
- Other builder CMS confirmed: 3/19 (all new sweep: Wix, Webflow, Hibu).
- CMS UNKNOWN: 13/19.
- Live chat observed: 0/19.
- Named booking/scheduling provider: 0/19.
- 24/7 or emergency signal: 9/19 (2 new-sweep own-site claims + 7 seed, some
  third-party-listing only).
- Suspected call tracking: 2/19 (seed only).
- Named CRM / scheduling software / answering service: 0/19 confirmed.

## Completion report

- Sites swept this pass: 7 live sites audited; 12 URLs attempted total
  (1 parked domain, 4 fetcher failures).
- Trades covered this pass: plumbing, HVAC, electrical. Roofing covered by
  the 2026-09-14 seed. Landscaping, pest control, garage doors, and painting
  remain unaudited; several candidate URLs exist for a follow-up pass.
- Strongest cross-business patterns (evidence-backed):
  1. Zero live chat on all 19 sites (0/19 observed). Every after-hours
     visitor gets a phone number or a static form, never a conversation.
  2. Zero named booking or scheduling providers (0/19); the whole market
     converts through generic "request estimate" forms and phone calls, and
     2 of the 7 new-sweep sites have no form at all (phone-only).
  3. Phone is the universal conversion path (19/19 list one), yet after-hours
     coverage is thin: only 2 of 7 new-sweep sites claim 24/7, one
     explicitly caps emergency service at business hours, and the only
     after-hours mechanism shown anywhere is "call this number." The most
     important conversion channel is the least automated one.
- Method note: the page fetcher failed mid-pass and could not be retried in
  this run; the 4 failed URLs are tool failures, not business evidence. CMS
  "UNKNOWN" grades here mean no platform marker appeared in fetched text or
  image URLs; absence in extracted text is not proof of absence in markup.
