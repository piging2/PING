# 01 — Why the Current FYD Output Regressed

Evidence: original Happy Place at https://happy-place-platform.vercel.app/ (fetched 2026-09-25),
original Coppersmith at https://coppersmithplumbing.com/ (Elementor/WordPress, fetched 2026-09-25),
FYD output screenshots ~/workspace/sprint-2026-09-24/hydration-evidence-20260925/ (hpp-1440/390, copper-1440/390),
generator source ~/workspace/fyd-product-lane/src/fyd/proceduralize/generator.ts.

## The single biggest regression cause

**The generator is a fixed object-role -> component template, not a planner.**

`homePage()` in generator.ts emits the same hard-coded section sequence for every business:
Hero, BusinessSummary, Services, Products, Locations, People, RecentObjects, Contact, Links, CTA, AskFYD, ObjectRail.
Both FYD HPP and FYD Coppersmith screenshots are byte-identical layouts with swapped names. No design judgment is made anywhere:

1. No brand extraction. The original HPP has a real logo (/brand/logo.png), a warm-neutral palette (#F1EDE6/#EFECE5 warm off-whites, #5E6259 sage-gray text, #254240 deep teal-green, #AC6B53 terracotta, #D99A4E/#E7AD63 amber gradient accents), Georgia serif display type. FYD output ignores all of it and applies DEFAULT_FYD_THEME (Playfair Display + gold #C9A227 on white) to every site. Coppersmith's plumbing identity likewise becomes the same purple-ish dark band.
2. No image judgment. FYD HPP's hero shows metal conduit/pipes (a plumbing-ish photo on a carpentry site — likely cross-contaminated media acquisition). Original HPP hero: completed deck project, warm wood tones, clean construction. FYD Coppersmith hero: AC condenser units (generic). Neither original's deliberate hero composition survives.
3. No service hierarchy. Original HPP orders services with editorial copy and "Start a quote ->" conversion hooks per card (Painting, Repairs, Restoration, Drywall, Fencing). FYD renders text-only cards (no images) with SITE RECORD/WEBSITE STATEMENT badges and repeated "Why this?" controls under every card — the control surface eats the selling surface.
4. No testimonial priority. Coppersmith's original leads with three long, specific reviews (19-year customers, named neighborhoods). The FYD template has SocialProof as an afterthought slot; HPP's "Built by one family" story and review-solicitation block ("ask us for references in your neighborhood") vanish.
5. No CTA hierarchy. Original HPP: "Get a Free Estimate" primary CTA in nav + hero + newsletter + footer contact block with phone 541-286-5190, email, hours. FYD: raw "Call +15412865190" (unformatted E.164, no trust copy) plus "Visit website" (which links AWAY from the site — the FYD page abdicates conversion to the old site).

## Why it happened: three confusions

A. **Confusion of products.** The renderer emits developer artifacts (SITE RECORD, WEBSITE STATEMENT, object pills "Business: Happy Place Carpentry ... ->", floating object affordance circles, WhyThis controls, demo-owner warnings) directly onto the customer page. Substrate instrumentation leaked into the customer surface because there is no surface-separation rule in the renderer.

B. **Confusion of representation.** SiteSpec holds tokens (colors, fonts, spacing) but no semantic presentation intent: no visual hierarchy, no layout variants, no section composition rules, no CTA hierarchy, no density, no media-treatment intent, no responsive intent. Tokens re-skin; they do not design. The planner therefore cannot "choose" anything — it fills a template.

C. **Confusion of source.** Proceduralization threw away the good website. Source observation extracts JSON-LD facts (business truth) but no PRESENTATION OBSERVATIONS (logo, brand colors, font tendencies, image aspect ratios, visual density, navigation structure, content hierarchy, CTA prominence, section ordering). The generator never had the design signal the original sites contain.

## The substrate wins that do not defend the output

Determinism (same graph -> same spec), binding verification, object counts, provenance typing, test coverage, SiteSpec digests, capability correctness — all real, all protected, none visible to a business owner choosing a website.

## Why did the generator lose this? (per-regression answers)

| Original feature | Lost because |
|---|---|
| HPP warm-neutral palette + Georgia serif + real logo | Generator stamps DEFAULT_FYD_THEME; ingestion extracts zero design signals; planner has no "good source design -> preserve" rule |
| HPP hero: deck photo, headline "Your favorite part of coming home should be the home itself", dual CTAs | Hero binds { kind: "owner" } with whatever media acquisition returned; no hero-image quality judgment, no headline hierarchy, no CTA composition |
| HPP service cards with images + per-card "Start a quote ->" | Services component binds text-only service objects; conversion hooks are not a binding target |
| HPP "Built by one family" story + owner portraits + review block | BusinessStory not in component set; SocialProof buried late in the fixed sequence |
| Coppersmith nav (Plumbing/HVAC/Cooling/Heating/Ventilation/Shop/Gallery/Tips/About/Contact) | Nav is fixed Home/About/Services/Explore; service taxonomy from source ignored |
| Coppersmith "You Don't Need A Plumber, You Need A Coppersmith" brand voice + call CTA | Voice/hierarchy not ingested; CTA is generic "Call <raw number>" |
| Coppersmith Popular Product Installations + Shop CTA + Schedule-Installation form | Product/installation conversion path not modeled; form builder absent |
| Both: media-rich project galleries | ProjectGallery exists in prose only; no media treatment intent (aspect ratios, editorial vs masonry) |
| Both: footer with full contact, hours, service areas | Footer = Links section + copyright; contact placement not planned |
| Mobile trust (sticky call button, tap-to-call) | No responsive intent in spec; renderer hardcodes py-16/py-10 rhythm |
