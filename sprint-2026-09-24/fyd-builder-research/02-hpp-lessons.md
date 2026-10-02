# 02 — What HPP Did Better: Design System + Product Lessons

Source: https://happy-place-platform.vercel.app/ (Next.js, fetched 2026-09-25). Design signals extracted
from served HTML/CSS: colors, Georgia serif type, /brand/logo.png, section inventory from full page text.

## Design system (extractable signals)

- **Palette:** warm-neutral craftsman. Backgrounds: #F1EDE6, #EFECE5, #F6F4F0, #F3EFE8 (warm off-whites, not pure white). Text: #5E6259 (sage gray-green, 47 occurrences — the primary text color). Deep brand dark: #254240 (teal-green, used for CCB# badges and dark sections). Warm accents: #AC6B53 terracotta; #D99A4E, #E7AD63, #F0C070 amber/gold gradient family.
- **Typography:** Georgia, serif for display (headings, logo wordmark). Body reads warm and editorial. Two-level hierarchy: serif display for emotion, clean sans for utility.
- **Logo:** real brand mark (/brand/logo.png) in nav and footer — "Happy / Place / Carpentry" stacked wordmark. Identity is carried by the mark, not by a theme token.
- **Image treatment:** documentary photography of real work (deck project, warm wood tones, clean construction), owner portraits (Taylor and Lanie in front of a completed project). Images are proof, not decoration.
- **Spacing rhythm:** generous section breathing; content column with clear measure; alternating section bands.
- **Motion:** quiet; the site does not depend on animation for its quality (no hero theater).

## Section composition (the product lessons)

1. **Navigation:** Home, Services, Our Work, About, Reviews + "Get an Estimate" CTA button (primary CTA in the nav, not buried). Trust counters visible early: "125+ projects completed · CCB# 254240 · Licensed · Insured".
2. **Hero:** full-bleed deck photo; headline "Your favorite part of coming home should be the home itself." (emotional, homeowner-identity, not "we do carpentry"); subhead with service-area + quality promise; dual CTAs "Get a Free Estimate" / "See Our Work"; trust strip beneath (125+ projects, CCB# 254240, Licensed/Insured, Benton/Linn/Marion/Polk counties).
3. **Services ("A few ways we can help"):** editorial subhead "Pick a service to start a free estimate — we'll guide you through the rest." Five services (Painting, Repairs, Restoration, Drywall, Fencing), each with 2-3 sentences of craft voice and a per-card "Start a quote ->" conversion hook. Order is editorial, not alphabetical.
4. **Featured projects ("Recent Work"):** titled projects with location + narrative ("Steel-Framed Covered Privacy Courtyard – Corvallis"), "See all projects ->".
5. **BusinessStory ("Built by one family. Trusted by many more."):** owner story, two portraits, named roles (Taylor cares about the work you'll notice five years from now; Lanie keeps every project organized). This is the trust anchor.
6. **Reviews:** honest empty-state handling ("We're building our public review portfolio. In the meantime, ask us for references in your neighborhood.") — transparency instead of fake stars.
7. **Newsletter ("Stay Ahead of Home Maintenance"):** value-first capture (tips, reminders, showcases), "No spam, ever."
8. **Contact CTA ("Tell us what you're planning."):** emotional framing, dual buttons "Start Your Free Estimate" / "See Our Work".
9. **Footer:** full contact (Adair Village OR, 541-286-5190 formatted, taylor@happyplacecarpentry.com, hours Mon–Fri 8am–5pm), price range $$, owners named, counties listed, "Most estimates scheduled within 1–2 business days", Explore nav, copyright.

## Product lessons to harvest

- **Headline sells identity, not the trade.** "Your favorite part of coming home..." vs FYD's "Happy Place Carpentry LLC". The planner must treat headline as editorial content, not the legal business name.
- **CTA hierarchy is explicit and repeated:** Get an Estimate (nav) > hero dual CTA > per-service quote hooks > newsletter > footer contact. FYD has one generic CTA block.
- **Trust signals are front-loaded:** license number, project count, counties, family ownership all above the fold.
- **Every section has a job:** nav converts, hero persuades, services start quotes, projects prove, story builds trust, reviews reassure, newsletter retains, footer closes. FYD's fixed section list has no per-section job.
- **Honest empty states beat missing or fake content.**
- **Local proof everywhere:** county names, city names on projects, "Oregon winters" in copy. Localism is the trust signal for home services.
