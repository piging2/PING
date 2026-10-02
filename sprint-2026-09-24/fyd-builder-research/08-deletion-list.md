# 08 — Deletion List: What Leaves the Current Public Page

Source: screenshots ~/workspace/sprint-2026-09-24/hydration-evidence-20260925/ (hpp-1440/390, copper-1440/390,
hpp-peek-1440) vs the surface rules in 07-surface-separation.md.

## Remove from the public render entirely

1. "FYD SOCIAL / Generated site demo" header and "Procedural clone proof" badge — demo chrome, not a business site.
2. SITE RECORD badge on the hero (provenance label rendered as a badge).
3. WEBSITE STATEMENT badges on every service card.
4. "Why this?" button repeated under every card and on the hero image — collapses to ONE subtle inspect affordance
   per claim cluster (INSPECT/TRUST mode, on demand).
5. Object pill "Business: Happy Place Carpentry ... ->" (raw object doorway on the public page).
6. Floating object affordance circles (F, D icons on the left rail) and the margin ObjectRail on the public page.
7. The object sheet ("Repairs / Service / Ask / Evidence / Contact / Related" tabs) — belongs on the object page
   (ObjectView), reached via an inspect affordance, not a public-page sheet.
8. Raw E.164 phone rendering ("Call +15412865190") — replaced by formatted, conversion-framed phone CTA.
9. "Visit website" CTA that links AWAY from the generated site — the page must convert, not abdicate.
10. Demo-owner warnings / binding diagnostics / acceptance sequence numbers / capability verdicts / proposal digests
    anywhere in the public DOM (visible or screen-reader-announced).
11. Fixed nav Home/About/Services/Explore as the only nav — replaced by business-taxonomy-aware navigation.
12. Duplicate H1-as-legal-name pattern ("Happy Place Carpentry LLC" as the only headline) — editorial headline
    per page; legal name lives in footer/provenance.
13. Text-only service cards with no media slots and no conversion hooks — replaced by ServiceGrid variants with
    media + per-card hooks.
14. The AskFYD full evidence panel on the public page — replaced by the quiet AskFYD entry (concierge affordance).

## Remove from the default experience (keep behind surfaces)

- Full evidence/provenance panels -> INSPECT/TRUST on demand.
- Customize/owner chrome -> OWNER MODE ("Customize with FYD"), never visible to visitors.
- Registry/validator diagnostics -> LAB.
- Object graph navigation (Explore page as object browser) -> the Explore page becomes business content
  (gallery/tips/projects), not an object browser.

## Keep, but relocate

- Ask FYD substrate -> quiet public entry + full panel on the object page.
- WhyThis machinery -> single subtle affordance, opens the inspect surface.
- Media acquisition -> keep ingesting; add relevance/quality gates before anything renders as a hero.
- Owner overrides/proposal/approval -> OWNER MODE, unchanged machinery.
