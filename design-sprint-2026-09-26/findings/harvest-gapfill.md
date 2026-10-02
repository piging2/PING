# Gap-Fill Harvest: Patterns the First Two Passes Missed

Observer: GAPFILL-HARVEST subagent, 24-hour FYD design sprint.
Date observed: 2026-09-26.
Timebox: one hour. Read-only, nothing vendored.
Pools covered: Webflow made-in-webflow/design-systems, Awwwards (via Colorlib construction examples), One Page Love conversion tips, Framer contractor templates (Buildpro X, Hartwell Builders, Contractor, BLDR, Briston, WashForge), CabStone (Web Excellence Award winner, home renovation), github.com/arihantcodes/spectrum-ui (confirmed NOT in github-corpus.md; recorded here).
Law: principles and mechanisms only. No proprietary text, imagery, or branding copied.

Existing corpus checked first: design-corpus.md P1-P14 (emergency hero, triage form, hero proof, named owner, clip reveal, before/after slider, staggered gallery, service rows, pinned masthead, nav budget, fluid type, multi-step modal, service-area proof, count-up strip) and github-corpus.md items 1-12 (bento, sliders, scroll reveal, sticky stack, parallax, APG carousel, Utopia, sizes, navbar, editorial reveal, trades section inventory). The patterns below do not duplicate them.

---

## G1. Hero self-segmentation tabs: the visitor picks their market before scrolling

- **Source:** Awwwards family, via Colorlib "27 Best Construction Company Website Examples 2026" (Brasfield & Gorrie entry), read 2026-09-26. https://colorlib.com/wp/construction-company-website-examples/ . Design inspiration, no license (n/a).
- **Problem it solves:** A carpentry firm serves homeowners and builders; a plumbing/HVAC firm serves emergency callers and scheduled project clients. One headline cannot speak to both. Self-segmentation tabs under the hero let the visitor self-select so the headline and hero image address THEM without any navigation.
- **FYD current gap:** Our heroes are single-audience. P9 pins chapters, P13 lists towns, but nothing segments the audience at the first screen. FYD renders one hero for a mixed-audience business.
- **Verdict: ADOPT.** Distinct from P3 (proof beside CTA) and P13 (service area). This is audience routing at position zero.
- **Generic rule:** When `service_segments >= 2` with distinct audiences AND each segment has at least one image, render audience tabs directly under the hero headline; selecting a tab swaps the hero headline, hero image, and primary CTA href with no scroll; default tab is the segment with the highest revenue share.

---

## G2. The lead form is the hero: embedded above the fold AND repeated at every page close

- **Source:** Framer marketplace, "Contractor" website template (built for roofing, HVAC, plumbing, landscaping), read 2026-09-26. https://www.framer.com/marketplace/templates/contractor/ . Design inspiration, no license (n/a).
- **Problem it solves:** Modal CTAs (our P12) add a click and a context switch. For inbound-lead trades the form itself is the product of the page: putting the actual form in the hero removes all friction, and repeating it at the bottom of every page means "no dead ends, ever" no matter where the visitor stops reading.
- **FYD current gap:** P12 offers modal (4+ fields) or short inline form (<=3 fields) but does not require the form at the page close. A visitor who reads to the bottom of our services section meets a footer, not a form.
- **Verdict: ADOPT.** Refines P12: embed when fields fit; keep the modal for long flows.
- **Generic rule:** When `lead_capture = true AND lead_fields <= 5`, embed the live form in the hero grid beside the headline; independently, every page that has `lead_capture = true` must end with the same form in its closing section; when `lead_fields > 5`, the hero carries the CTA that opens the P12 modal instead.

---

## G3. Photography-free launch composition: typographic hero when there are no photos yet

- **Source:** Framer marketplace, "Hartwell Builders" free template by Roman Rybiansky, read 2026-09-26. https://www.framer.com/community/marketplace/templates/hartwell-builders/ . Design inspiration, no license (n/a).
- **Problem it solves:** Small shops often launch with almost no project photography. A photo-slot layout with empty placeholders looks broken and unfinished; a typographic composition looks intentional from day one and accepts photos later as jobs complete.
- **FYD current gap:** Our gallery patterns (design-corpus P5/P6/P7) all fire on `media_count >= 1` or higher. Nothing specifies what the compiler must do at `media_count = 0`. The failure mode is grey placeholder boxes.
- **Verdict: ADOPT.** This is the zero-media fallback the corpus is missing.
- **Generic rule:** When `media_count < 3`, render no image slots at all; compose the hero and sections from display type, hairline rules, and one material/texture treatment; image slots appear only when real photos exist, so the site launches complete and absorbs photography over time.

---

## G4. Tabbed service explorer: one rich tab per service with image, price, timeline, benefits

- **Source:** Framer marketplace, "Briston" website template (construction, renovation, remodeling), read 2026-09-26. https://www.framer.com/marketplace/templates/briston/ . Design inspiration, no license (n/a).
- **Problem it solves:** P8 rows are correct for long, uneven service lists, but when a business has 4 to 6 services each with real richness (a photo, a price, a timeline), rows flatten the richness. Tabs let each service present its full dossier in the same vertical space.
- **FYD current gap:** P8 covers rows (5+), grid (<=4), and feature (1). The rich-middle case (4-6 services with photos and prices) has no dedicated layout.
- **Verdict: ADOPT.** Extends the P8 variant rule with a third branch.
- **Generic rule:** When `service_count BETWEEN 4 AND 6 AND at least 3 services have (image AND price AND timeline)`, render services as tabs where each tab shows one service with its image, one-line description, published price or range, typical timeline, and 3 benefits; otherwise fall back to the P8 row/grid/feature rule.

---

## G5. Priced service index: published ranges and material specs inline per service

- **Source:** CabStone (cabstone.us), Web Excellence Award winner Home Renovation Season 17, observed live 2026-09-26. Press: https://www.openpr.com/news/4385163/cabstone-web-excellence-award-for-outstanding-website-design . Design inspiration, no license (n/a).
- **Problem it solves:** Premium remodelers hide pricing and look evasive; listing per-service price ranges inline (cabinets $6,000 to $45,000; flooring $6,000 to $30,000; countertops $3,500 to $8,500) plus the materials each service uses (cabinetry in MDF, hardwood, plywood; countertops in quartz, granite, solid surface) reads as confident and pre-qualifies serious buyers before the first call.
- **FYD current gap:** P12 has "published ranges" as a honesty signal near the consultation CTA; P8 rows allow a price. Neither puts per-service ranges and material specs INSIDE the service index itself.
- **Verdict: ADOPT.**
- **Generic rule:** When `pricing.published_range` exists per service, each service row renders its range line directly under the description plus a material spec line when `service.materials >= 2`; ranges render only from verified data and are omitted entirely when unpublished, never invented.

---

## G6. Material-choice sub-taxonomy: "the types of X we use" under a service

- **Source:** CabStone (cabstone.us), observed live 2026-09-26. Same source as G5. Design inspiration, no license (n/a).
- **Problem it solves:** Homeowners choose between materials (hardwood vs luxury vinyl plank vs luxury vinyl tile) more than they choose between contractors. A sub-taxonomy block under the service educates the choice, proves craft knowledge, and creates distinct indexable content per material.
- **FYD current gap:** Our service model is flat: service -> description -> price. No level exists for the material/option layer that tradespeople actually sell on.
- **Verdict: ADAPT.** Add the level to the data model; render it as a sub-list, not a new page per material.
- **Generic rule:** When a service has `material_options >= 2` each with a one-line differentiator, render a "types of {service} we use" sub-block inside that service's section as a 2 to 4 item list with one sentence each; no dedicated page per material unless each can carry distinct content (the P13 doorway-page gate applies).

---

## G7. Objection FAQ: permits, timeline, and registration as the three trust objections

- **Source:** CabStone (cabstone.us), FAQ section observed live 2026-09-26. Same source as G5. Design inspiration, no license (n/a).
- **Problem it solves:** The questions that block a hire are not about the service, they are about risk: are you registered, will you pull permits, how long will it take. CabStone's FAQ answers exactly these (Massachusetts HIC registration, permit handling per town, bathroom 4-8 weeks / kitchen 10-14 weeks timelines) which converts anxiety into a booked consultation.
- **FYD current gap:** Our corpus has FAQ only as a section inventory item (github-corpus item 12, composition spec). No rule says WHICH questions belong there.
- **Verdict: ADOPT.**
- **Generic rule:** When `faq.enabled = true`, seed questions from the objection taxonomy (registration/licence, permits, timeline, pricing structure, service area) before any service-detail questions; answers render only from verified business data, and any objection question without verified data is omitted rather than answered generically.

---

## G8. Declutter caps: 2 testimonials, 2 power features plus 4 small, 8 best photos

- **Source:** One Page Love, "10 Quick Tips to tighten your Landing Page design" (Bonus Tip: Declutter Throughout), read 2026-09-26. https://onepagelove.com/go/footer-tutorial . Design inspiration, no license (n/a).
- **Problem it solves:** Generated pages accumulate: 8 average testimonials, 12 identical feature tiles, 4 years of photos. Caps force curation: 2 brilliant testimonials beat 8 average ones; 2 highlighted power features with 4 smaller below beat a grid of 12; the 8 best photos beat the archive.
- **FYD current gap:** Our corpus caps the gallery at 12 with load-more (P7) and forbids 4 identical icon cards (P8/R4), but has no numeric caps for testimonials or features, and no featured-plus-small hierarchy.
- **Verdict: ADOPT.** Numerical caps are the most compilable kind of rule.
- **Generic rule:** Testimonials render at most 2 with photos (when the business serves two audiences, one voice per audience); features render at most 2 large power features plus 4 small ones; the gallery hero band shows the 8 best photos with the rest behind load-more; when new proof arrives, replace, never append.

---

## G9. One-CTA discipline and ratio-locked spacing

- **Source:** One Page Love, "10 Quick Tips" Tip 9 (Juice up those CTA buttons) and Tip 5 (Keep Spacing Consistent), read 2026-09-26. https://onepagelove.com/go/footer-tutorial . Design inspiration, no license (n/a).
- **Problem it solves:** Pages that ask for three different conversions convert none; inconsistent section padding and button sizes make a page feel assembled rather than designed. One conversion goal means every CTA shares one wording and one accent color that contrasts the scheme; spacing in fixed ratios (section 60, component 30, gap 15, or the fluid equivalent) makes any generated page feel tight.
- **FYD current gap:** We have CTA variety (call, book, quote, consult) with no single-conversion rule, and fluid space tokens (github-corpus item 8) with no mandated ratio lock between section, component, and gap levels.
- **Verdict: ADOPT.**
- **Generic rule:** Every page declares exactly one primary conversion; all primary CTAs share identical wording and one accent color that passes contrast on its background; vertical rhythm uses locked tokens where section padding is exactly 2x component spacing and 4x the base gap, applied consistently across all sections.

---

## G10. Capability and place band: the woodshop section and the sense-of-place line

- **Source:** Colorlib "27 Best Construction Company Website Examples 2026" (Birchwood "in-house woodshop portfolio section"; Newton Carpenters "Connecticut River Valley sense of place"; JDG Constructions "personal family-business brand"), read 2026-09-26. https://colorlib.com/wp/construction-company-website-examples/ . Design inspiration, no license (n/a).
- **Problem it solves:** Project galleries show WHAT was built; they do not show HOW or WHERE. A capability band (the woodshop, the in-house crew, the fleet) proves the practice behind the portfolio, and one place-anchored line (valley, county, town named with something true) roots a family business in its ground, which national competitors cannot copy.
- **FYD current gap:** P4 covers the named owner; P13 covers named towns. Nothing covers the practice (workshop, crew, process capability) as its own proof section, and the place line is not a mandated composition element.
- **Verdict: ADOPT.**
- **Generic rule:** When `capabilities.count >= 2` (workshop, in-house crew, fleet, certifications), render a capability band after the project gallery with 2 to 4 blocks; when `region_affinity = true`, the band or the owner section carries one sentence naming the specific place and one true thing tying the business to it.

---

## G11. Spectrum UI catalog discipline: every block ships with registry entry, preview, and code

- **Source:** github.com/arihantcodes/spectrum-ui, read 2026-09-26. Commit (donor SHA): acdc998c64829f8ae037be48e3c273ccc8d71f60. License: Apache-2.0. https://github.com/arihantcodes/spectrum-ui
- **Problem it solves:** A generator's section library rots: blocks drift, props go undocumented, nobody knows which variants exist. Spectrum UI's discipline (250+ components, each with a live preview, its code underneath, a registry entry in registry.json, and a catalog test suite that fails when registry, catalog, metadata, and structured data disagree) keeps the library honest by construction.
- **FYD current gap:** FYD is building exactly such a section library (the composition compiler's block inventory) with no stated contract for what makes a block shippable.
- **Verdict: ADAPT.** Do not import the component library (never import a framework for a 30-line pattern, and these are shadcn React blocks, not FYD sections). Adopt the catalog contract only.
- **Generic rule:** Every generator block must have a registry entry (props schema), a preview fixture, and a catalog test that fails when registry, preview, and metadata disagree; a block that cannot render its preview fixture does not ship.

---

## Low-yield / failed sources (recorded so nobody re-harvests them)

- Webflow made-in-webflow/design-systems (https://webflow.com/made-in-webflow/design%20systems): the page renders only showcase listings (350life, Etar, Fushia Events), no extractable composition patterns. Token-first discipline already covered by P11/github-corpus item 8.
- Awwwards J Davis Construction nominee page (https://www.awwwards.com/sites/j-davis-construction): renders votes only, no composition detail. The useful Awwwards-family material came via the Colorlib construction roundup instead (G1, G10).
- SiteInspire: no trade-specific entries surfaced through search; the gallery's curation signal ("clean, typographic, free of gimmicks" per Daniel Howells) is consistent with the corpus's anti-template rules but produced no new pattern.
- Framer "Contractor" template direct page: snippet-level detail only; Framer marketplace pages are JS-heavy and were not deep-fetched. The search-result copy was rich enough for G2-G4.

---

## Ranked top 5 (by leverage for carpentry/plumbing/HVAC composition)

1. **G2. The lead form is the hero, embedded and repeated.** Highest conversion leverage per byte: removes the click between intent and action and guarantees no dead ends. Fires on `lead_capture = true`, the most common trade configuration.
2. **G5. Priced service index with material specs.** The single strongest differentiator for premium carpentry and honest plumbing: published ranges plus materials inline, from verified data only. Directly attacks the "evasive contractor" objection.
3. **G3. Photography-free launch composition.** Unlocks launching real sites for the many small shops with no photos yet, with no placeholder failure mode. A generator that requires photos cannot serve its actual market.
4. **G8. Declutter caps.** The cheapest enforceable anti-template rule in the whole corpus: numbers (2, 2+4, 8) a compiler can check. Kills testimonial walls and feature grids before they render.
5. **G1. Hero self-segmentation tabs.** Solves the mixed-audience problem (homeowners vs builders, emergency vs scheduled) at position zero without navigation. Carpentry and plumbing both have this split.
