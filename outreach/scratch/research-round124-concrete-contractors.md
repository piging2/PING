# Research round 124 — concrete contractors (2026-09-23)

Corridor-only: GJ, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale. No franchises/chains. Browser-search only (browser_open terminal for this turn; no fetches reproduced via exec/curl). Segment scope: true flatwork/driveways/patios/foundations/sidewalks/decorative concrete. Pumping and coatings are covered segments; excluded.

## Sources used
- Search business profiles (place data): meta.ai place listings, BBB Fruita concrete category, Names and Numbers Montrose concrete contractors, Houzz, Procore company pages, Google Business Site (jr-concrete-llc.business.site).

## Staged (6 NEW rows appended to pipeline.md)
1. J & R Concrete, GJ — 970-255-8144 (search profile); address CONFLICT: 3058 D Rd (search profile) vs 2846 Unaweep Ave (directory). Legacy Google Business Site only. WEBSITE_REVAMP medium, WATCH.
2. Stewart Concrete Construction LLC, GJ — 453 31 Rd; 970-250-7759 (directory/govt contractor listing); contact Randy H. Stewart, LLC est. 1997, minority-owned/self-certified small disadvantaged business. No own site. WEBSITE_REVAMP medium / MISSED_CALL_LEAD_CAPTURE medium, WATCH.
3. Liquid Rock Concrete Construction, Fruita — 1929 J Rd; 970-234-9131 (search profile); Mon-Thu 7a-5p hours. MISSED_CALL_LEAD_CAPTURE medium, WATCH, directory phone caveat.
4. Gonzalez Concrete & Construction, Fruita — 960 20 1/2 Rd; 970-858-7964 (search profile); 7a-7p daily. MISSED_CALL_LEAD_CAPTURE medium, WATCH, directory phone caveat.
5. United Company of Western Colorado, Rifle — 27858 US-6 #24; 970-625-3436 (place data); concrete contractor + masonry. MISSED_CALL_LEAD_CAPTURE medium, WATCH, directory phone caveat.
6. J & A Concrete LLC, Fruita area — BBB service area 81650; 970-379-8037 (BBB directory). Distinct from existing J & A Premium Concrete Construction row; names must not be merged. MISSED_CALL_LEAD_CAPTURE medium, WATCH, BBB phone caveat.

## Near-misses / exclusions (logged, not staged)
- DUPLICATES already tracked (not re-added): Mays Construction Specialties Inc (pipeline QUEUED 2026-09-10, mci@maysconcrete.com own-site; DEDUP log round 75 confirms Mays Concrete = same business), C & C Concrete (pipeline NEW/WARM round 45; candcconcreteinc.com, 970-773-6059 — re-verified live this round at 8183 6150 Rd Montrose, still active), Sukle Construction LLC (pipeline NEW/WATCH round 45; 970-234-9511; Montrose directory listing is the same business), RodCo Concrete (JSONL), J & A Premium Concrete Construction (JSONL), JB Flatwork (JSONL), TJ Concrete Construction (canonical JSONL), Defender Concrete Solutions (archived; PolyLevel dealer), Advanced Concrete Solutions, Grand Valley Concrete Polishing, High Grade Concrete & Excavation (JSONL), M & M Concrete (archived), Stallion Concrete, AVN Construction (JSONL), Blue River Epoxy / Western Slope Concrete Floor Solutions (coatings covered), Caliber 1 Concrete (JSONL).
- Desert Design Concrete, GJ 81503 — EXCLUDED: name only in directories, no published contact found.
- Short Gregg Concrete, GJ 81507 — EXCLUDED: name only, no published contact.
- Murray Concrete, GJ 81507 — EXCLUDED: name only (441 Meadows Way), no published contact.
- Diamond Back Concrete, GJ 81504 — EXCLUDED: name only (420 Glendale Way), no published contact.
- Munoz Concrete, Clifton — EXCLUDED: MapQuest confirms masonry/concrete (driveways, patios, decorative), but no published phone or site found.
- Pine Mesa Concrete LLC, Montrose — EXCLUDED: HomeAdvisor profile (since 2023, stamped concrete, free estimates) but no published phone or own site.
- Grand Junction Concrete Contractors, Clifton — EXCLUDED: generic name on a localo.site template microsite (623 1/2 Helena St Clifton, 970-697-7522); lead-gen/SEO-brand pattern, no verifiable independent business.
- Mountainside Concrete — EXCLUDED: BBB A+ but service-area 81224 (outside corridor) and town unverified; dedupe log round 75 confirmed absent from files but geography fails.
- Colorado Concrete L.L.C — EXCLUDED: BBB Fruita page, (970) 274-0449, service area 81652; town unverified.
- R&R Masonry, Delta — EXCLUDED: masonry-primary, not concrete flatwork; marginal trade fit.
- Par Gypsum Floors, Montrose — EXCLUDED: specialty gypsum floors, not flatwork.
- Adcock Concrete Inc, GJ — EXCLUDED: Procore classifies as commercial cast-in-place; commercial-leaning, wrong fit.
- Black Line Concrete LLC — EXCLUDED: Procore shows commercial/industrial/energy work; wrong fit.
- Casey Concrete / Dick Casey Concrete Co (Carbondale/Rifle) — EXCLUDED: full-service ready-mix/materials supplier (founded 1978, multiple locations), not a contractor prospect.
- Avalanche Concrete LLC, Carbondale — EXCLUDED: concrete pumping, a covered segment.
- Alderfer Construction, Carbondale — EXCLUDED this round: masonry/general; own-site fetch failed earlier; no clean contact captured.
- MSG Ready Mix, Rifle — EXCLUDED: materials supplier.
- Cherokee Epoxy Inc, Rifle — EXCLUDED: epoxy coatings (covered segment).
- Creative Concrete and Handyman Services, GJ — EXCLUDED: handyman-primary, marginal fit. Accurate Concrete Cutting, GJ — EXCLUDED: specialty/industrial cutting, marginal fit.
- Groundworks — CHAIN, excluded.
- C & N Construction Inc, Montrose — EXCLUDED: concrete irrigation systems/excavation, not residential flatwork fit.

## Segment heat: concrete contractors — MODERATE (2026-09-23)
- Corridor concrete market is fragmented and directory-heavy; own-site email yield was zero this round. All 6 staged rows are phone-route WATCH rows.
- Fruita is the densest fresh pocket (Liquid Rock, Gonzalez, J & A Concrete LLC) but entirely directory-presence; Montrose's C & C is already tracked.
- Angle split: WEBSITE_REVAMP for template-only/zero-web-presence shops (J & R business.site; Stewart no site); MISSED_CALL_LEAD_CAPTURE for crew-on-pour operations with published hours.
- Chain risk is low in this segment; the main dedupe risk is generic names (J & R / J & A / Grand Junction Concrete Contractors). Keep exact names; never merge J & A Concrete LLC with J & A Premium Concrete Construction.
- Keep segment scope tight: flatwork/driveways/patios/foundations/sidewalks/decorative. Pumping, coatings, suppliers, and commercial-heavy operators stay excluded.
