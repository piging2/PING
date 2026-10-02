# 06 — Binding Model: Objects into the Family

## How objects bind into the family

- Each family component declares, in its registry entry (shadcn-registry shape), the object schemas it accepts,
  its variants, composition rules (max one Hero per page; TrustBar above the fold; ServiceGrid requires >=2
  services), responsive behavior, and its edit contract (Craft.js shape).
- The planner reads the catalog, not code. Binding = deterministic query (existing FYDQuery machinery) + variant
  selection from (source design signal, business type, media availability, responsive constraints, owner intent).
- Every binding keeps provenance: each section's objects, queries, and variant choice are recorded with evidence
  references — but provenance is TRUST/INSPECT data, not public-page content.

## What SiteSpec must represent for experience (gaps in the current spec)

Current FYDSiteSpec has tokens but no semantic presentation intent. Additive extensions needed:

1. **Section composition**: per-section job (persuade/prove/convert/reassure), editorial ordering rationale,
   per-section CTA bindings (which conversion hook, which target).
2. **Visual hierarchy**: headline hierarchy per page (H1 is editorial, not legal name), emphasis levels,
   section rhythm (tight/section/feature/hero) as intent.
3. **Layout variants**: per-section chosen variant (Hero: image-overlay/split-media/editorial/minimal;
   ServiceGrid: cards/featured-plus-grid/media-grid; Gallery: masonry/editorial/carousel) + selection rationale.
4. **Media treatment**: per-section media intent (aspect ratio, documentary/polished, min relevance bar), hero
   media selection with rejection rules.
5. **CTA hierarchy**: ranked conversion actions site-wide (primary: Get an Estimate / Call; secondary: Start a quote
   per service; tertiary: newsletter), placement map (nav/hero/section/footer).
6. **Responsive intent**: per-component mobile behavior (ServiceGrid cards -> compact tiles; nav -> sticky call
   button on touch; gallery masonry -> carousel on xs) — semantic intent, not px.
7. **Density/theme intent**: existing designIntent (density, contentWidth, mediaTreatment, objectEmphasis) is the
   right seed; extend with section-level density and emphasis.
8. **Source design signal**: NON-CANONICAL presentation observations (logo URL, palette hints, font tendencies,
   aspect ratios, density, nav structure, hierarchy, CTA prominence, section ordering). Explicitly marked
   signal-not-authority; the planner weighs it against the family and owner intent.

Do NOT turn SiteSpec into CSS. SiteSpec = semantic presentation intent (data). Renderer = implementation
(Tailwind v4 @theme compiled from DTCG tokens). The compiler between them is deterministic and versioned.

## Binding anti-patterns (from the current output)

- { kind: "owner" } Hero with unjudged media -> conduit photo on a carpentry site.
- Services bound to text-only cards with badges per card -> control surface eating the selling surface.
- CTA bound to raw E.164 phone + "Visit website" -> conversion abdication.
- SocialProof as late fixed slot -> testimonials buried.
- Fixed section sequence -> identical pages for different trades.
