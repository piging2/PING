# 05 — Minimum High-Quality Home-Service Design Family

Small component set, made excellent. Planner selects among constrained quality VARIANTS; no arbitrary JSX.
HPP is the first quality reference; the family must also carry Coppersmith without cloning HPP.

## The set (11 components)

1. **Navigation** — logo mark + business name, service taxonomy links, phone CTA in header, "Get an Estimate"
   primary button. Variants: topbar-with-trust-strip (HPP: trust counters above nav), minimal (mobile-first).
2. **Hero** — headline (identity, not legal name), subhead, dual CTAs, hero media, trust strip. Variants:
   image-overlay / split-media / editorial / minimal. Selection rule: strong documentary hero photo -> image-overlay;
   weak/absent media -> editorial or minimal.
3. **TrustBar** — license number, project count, years, service area, rating badges. The above-the-fold proof strip.
4. **ServiceGrid** — named services with scope lines + per-card conversion hooks ("Start a quote ->").
   Variants: cards / featured-plus-grid / media-grid (with service imagery).
5. **FeaturedService** — one flagship service line with media + scope + CTA (Coppersmith's Plumbing/Ventilation/
   Heating&Cooling/HVAC lines deserve this, not a flat grid).
6. **ProjectGallery** — titled projects with location + narrative. Variants: masonry / editorial / carousel.
7. **BusinessStory** — "Built by one family" block: owner names, portraits, roles, craft voice. Trust anchor.
8. **ServiceArea** — counties/neighborhoods served, local proof (HPP's county strip; Coppersmith's 630 Maldonado St +
   Western Colorado).
9. **ContactCTA** — emotional framing + dual CTAs + full contact block (formatted phone, email, hours, address).
   Not a generic "Call <E.164>" button.
10. **Footer** — contact, hours, service areas, quick links (Service Agreement, Financing, Rebates, Privacy Policy),
    explore nav, copyright. Closes with credibility.
11. **AskFYD entry** — the business's intelligent concierge: one quiet entry point (chat affordance / floating ask),
    NOT a full evidence panel. Opens the ask surface on demand.

## Explicitly NOT in the family

ObjectRail, object pills, floating object affordance circles, margin rails, bottom-sheet object browsers on the
public page. These belong to TRUST/INSPECT and DEV surfaces.

## Family tokens (DTCG three-tier; planner selects intent, compiler emits)

- Color: warm-neutral content surfaces, deep brand dark, one craft accent + one functional accent; brand layer and
  status layer separate families. Source design signal can seed the palette (HPP warm neutrals + terracotta;
  Coppersmith's own brand) — good source design preserved, bad improved, none generated as strong default.
- Type: serif display for emotion (HPP's Georgia), clean sans for utility; scale hero/h1/h2/h3/body/small/caption
  with line heights. Never the business's legal name as the H1 headline by default.
- Spacing/width: 4px base, content measure, named widths narrow/content/wide/page; section rhythm tokens
  (tight/section/feature/hero).
- Media: aspect tokens (square/landscape/portrait/wide/banner); documentary treatment for trade work (real photos,
  not stock); media-quality gate — a hero photo that fails relevance (conduit on a carpentry site) is rejected.
- Motion: motionIntensity NONE/SUBTLE/EXPRESSIVE; quiet by default; reduced-motion collapses everything.

## Planner selection inputs

SOURCE DESIGN SIGNAL (non-canonical presentation observations: logo, palette, fonts, aspect ratios, density, nav
structure, hierarchy, CTA prominence, section ordering) + FYD DESIGN SYSTEM + BUSINESS TYPE + OBJECT GRAPH +
OWNER INTENT + RESPONSIVE CONSTRAINTS. Editorial ordering rules: services ordered by business priority, not
alphabetical; testimonials placed for trust, not appended; CTA repeated at nav/hero/section/footer.
