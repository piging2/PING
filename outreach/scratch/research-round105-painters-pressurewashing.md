# Research Round 105: Painters + Pressure Washing / Exterior Cleaning (Western Colorado, 2026-09-21)

## Scope and geography
Segments: (1) Painters. (2) Pressure washing / exterior cleaning, with verified Christmas-light-install bundles where the same independent business publishes both services.
Permitted towns only: Grand Junction, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale.
Hard rules applied: own website must publish a real email or render a real contact form in fetchable text. Phone-only, directory-only, dead sites, lead brokers, chains, franchises excluded. No invented identifiers. Browser_open verification was unavailable for the final portion of this pass, so anything not directly observed on an own site is recorded as unverified, not qualified.

## Dedup notes
pipeline.md already contains Western Colorado painting coverage (round 87, dated 2026-09-18) and pressure-washing batches dated 2026-09-11 and 2026-09-12. Exact-name greps were run before any write. Nothing from round 105 was appended as a new row. One existing row was UPGRADED instead (see Hoffmann's below). Known existing pipeline names touched by this pass: AJ Painting & Powerwashing, The Wash Squad (already flagged franchise).

## Qualified businesses

### Hoffmann's Custom Painting, Fruita (pipeline row UPGRADED, not new)
- Own site: https://hoffmannscustompaintingllc.com
- Contact page: https://hoffmannscustompaintingllc.com/contact
- Real email rendered on own site: hcpaintgj@aol.com (phone (970) 208-4941 also listed)
- Family-owned, locally owned; Fruita address rendered; serves Fruita, Loma, Grand Junction, Montrose, other Western Slope locations.
- Services observed on own site: interior painting, exterior painting, staining, cabinet refinishing, drywall/plaster, epoxy floors, remodeling, flooring, tile, kitchen/bath remodeling.
- Prior state: pipeline.md line 2230, source=research-round87, status WATCH (phone-route), flagged "VERIFY on own site before outreach". This pass completed that verification. Row rewritten 2026-09-21: status NEW, pain MISSED_CALL_LEAD_CAPTURE (medium), contact upgraded to email.
- Angi profile mentions power washing, but own site did not establish pressure washing as a service. Keep in painting only.
- Stack: STRONG INDICATION of a hosted landing-page platform (site assets served from landing-page-app-hero-images.s3.amazonaws.com). CONFIRMED evidence not observed. Grade: STRONG INDICATION.
- Friction chain: hosted site plus email/text intake across a very broad service menu (10+ distinct services) -> estimate inquiries arrive unsorted by service line -> manual triage and missed-call risk during jobs -> lead-capture and follow-up automation opportunity. Confidence: medium.
- Prior verification note: the assignment described these segments as brand-new for Western Colorado, but pipeline already held round 87 coverage, so this was a fresh-candidate pass, not a new-segment launch.

## Near-misses (excluded, reasons)

### Painters
- XL Painting, Grand Junction (https://xlpainting.net/): locally owned, residential/commercial, 15+ years claimed. Own site rendered phone only, no email or contact form. Exclude: phone-only. Phone inconsistency observed: homepage rendered (970) 462-6400 while an indexed XL article rendered (970) 712-5751. Do not use either for qualification.
- Prime Painting Experts, Fruita / Grand Junction (https://primepaintingexperts.com/): owners James and Missi named on own site; interior/exterior, family-owned positioning. Site built on Wix (static.wixstatic.com, CONFIRMED). Rendered contact showed only phone (970) 361-7445, no email or form. Exclude: phone-only.
- Price Custom Painting LLC, Grand Junction: only directory/HomeAdvisor results. No own website found. Exclude: no own site.
- Harrison Painting Co Inc (Rifle-area / New Castle): own site https://www.harrisonpaintingcoinc.com would not load for verification; directory entries list 44 N Painted Horse Cir, New Castle, CO, which is outside permitted geography (New Castle not on the permitted list; Rifle is a listed service area). Exclude: unverified and based in an out-of-scope town.
- Innovative Painting Systems, Inc., Carbondale (innovativepaintingco.com): established independent (founded 2005, BBB A+, 8 employees, 898 Hwy 133 Ste 403, Carbondale; competitors listed by data sources include CertaPro, Five Star Painting, Fresh Coat, all franchise names, but Innovative itself is not a franchise). Own site loads but is JS-heavy; fetched text was too thin to confirm a rendered email or contact form. Exclude as unverified; revisit with a full render pass.
- Aspen Painting Inc (Rifle): directories only. Exclude.
- ABC Painting (Rifle): directories only. Exclude.
- College Works Painting: national operation. Exclude: chain.
- CertaPro, LIME Painting, That 1 Painter: franchises. Exclude: chain/franchise.

### Pressure washing / exterior cleaning
- Prock Pressure Washing LLC, Grand Junction: locally/family owned, fleet/RV/commercial vehicle washing focus, but only directory/place records surfaced. No own website found. Exclude: directory-only.
- The Wash Squad Grand Junction page: showed a Centennial address and a broader network structure; pipeline already flags The Wash Squad as a franchise. Exclude: franchise.
- Show Me Pressure Washing Rifle page: out-of-state SEO location page (Tennessee operation). Exclude: wrong geography / lead-style page.
- OLI Outdoor Services (power washing mention): no corridor-town location verified on own site. Exclude: unverified location.
- Precision Pro Wash (holiday-lighting page): no corridor-town own-site identity verified. Exclude: unverified location.
- Corkd, Manta cost calculators, Porch/HomeAdvisor lead pages, Slideoo location pages, Aptera: lead brokers or directory spam. Exclude.
- Monument Lighting (https://monument-lighting.com/contact): legitimate independent Grand Junction holiday-light installer with a rendered contact form and local-owner story. NOT a pressure-washing/exterior-cleaning company, so out of scope for this segment. Recorded here only to avoid re-research.
- Net pressure-washing result for this pass: no new own-site qualifiers in Grand Junction, Fruita, Delta, Montrose, Rifle, or Carbondale. The pipeline's 2026-09-11/12 PW batches (Alpine Pressure, Elevation Wash Services, Simmons Pressure Washing, Grime Fighters, Colorado Wash Services, Sparkling and Beyond, High Pressure Specialties, BB Master Blasters, Western Slope Fleet Washing, AJ Painting & Powerwashing) already cover the qualified inventory.

### Christmas-light-install bundles
- No independent corridor-town pressure-washing/exterior-cleaning business was found publishing BOTH services on its own site with a qualifying email or form. Bundle angle is real for the market (Precision Pro Wash, Monument Lighting show demand), but no qualified bundle candidate exists in the pipeline for this round.

## Stack observations summary
- Hoffmann's Custom Painting: STRONG INDICATION, hosted landing-page builder (s3 hero-image asset pattern).
- Prime Painting Experts: CONFIRMED Wix.
- Everything else qualified or near-missed: UNKNOWN (no stack evidence observed on own sites).

## Review snapshots
- None observed first-hand for qualified businesses. External snippets (Birdeye 4.2 for Innovative Painting Systems, Porch 3.67 for Harrison Painting) are third-party snippets, not verified observations, and are not used here.

## Ecosystem segment summary (painters + exterior cleaning, Western Colorado)
- Exterior painting season is in its tail in late September; expect a winter pivot toward interior painting, cabinet refinishing, and drywall in messaging for the painting segment.
- Pre-winter cleaning (gutters, siding, driveways) is the natural pressure-washing hook right now, before freeze risk makes exterior water work impractical.
- Holiday-light booking happens September through October; the bundle angle exists but no independent corridor PW company currently pairs it with a qualifying own-site contact, so bundle outreach has no pipeline target today.
- Own-site contact scarcity is the dominant pattern: even legitimate local shops (XL Painting, Prime Painting Experts) render phone-only contact, which kills them under the strict rule despite real businesses behind them.
- Phone-only and directory-heavy results drove most exclusions; the strict own-site email/form bar is the filter, not business legitimacy.
- Chain and location-page exclusions stayed active: The Wash Squad franchise flag, College Works, and out-of-state SEO pages (Show Me Pressure Washing) were all kept out.
- Round-87 painting inventory and the 2026-09-11/12 pressure-washing batches still stand as the qualified Western Colorado pool; round 105 added zero new rows and one upgraded row.
- Hoffmann's Custom Painting is now the freshest verified paint lead in Fruita with a working own-site email, family-owned positioning, and a broad service menu that fits the missed-call lead-capture angle.
- Carbondale and Rifle painter inventory remains thin under the strict rule: established independents (Innovative, Harrison) could not be verified this pass for technical or geographic reasons.
- Honest segment heat: painters warm (one solid upgraded qualifier, real demand tail), pressure washing cold (no new qualifiers, existing pool stands), Christmas-light bundle cold (no qualified dual-service business found).
