# 10 — Smallest Rebuild Plan That Can Beat HPP/Coppersmith

NOT a new framework. The smallest plan that produces a better website than both originals.

## Phase A — Family definition (design, no code)

1. Lock the 11-component family + variants from 05-design-family.md as a written spec with one screenshot-grade
   mock per variant family member (Hero: 4 variants; ServiceGrid: 3; Gallery: 3; the rest: 1-2 each).
2. Define DTCG token tiers (primitives -> semantic -> component) for the family; compile with Style Dictionary v4
   to CSS custom properties + Tailwind v4 @theme. One palette seed per business derived from SOURCE DESIGN SIGNAL.
3. Write the planner's selection rules (variant selection from media availability/business type/design signal;
   editorial ordering; CTA hierarchy; section jobs) as deterministic, testable rules — not LLM vibes.

## Phase B — Ingest design (observation extension)

4. Extend source observation to emit PRESENTATION OBSERVATIONS (non-canonical): logo, palette hints, font
   tendencies, image aspect ratios, visual density, nav structure, content hierarchy, CTA prominence, section
   ordering. Signal, not authority; stored separately from business truth.
5. Add media relevance gates: hero-candidate scoring (on-trade, documentary, min resolution, aspect fit);
   cross-business contamination impossible by construction (media namespaced per business).

## Phase C — Planner rewrite (the actual rebuild)

6. Replace generator.ts's fixed homePage() sequence with the planner: catalog-driven section selection
   (registry entries declare schemas/variants/composition rules), variant choice, editorial ordering,
   CTA-hierarchy planning, per-section media binding. Deterministic: same graph + signal + intent -> same plan.
7. Extend SiteSpec additively (06-binding-model.md): section composition/jobs, layout variants + rationale,
   media treatment intent, CTA hierarchy + placement, responsive intent, source design signal block.
8. Renderer: implement the 11 family components against compiled tokens (Tailwind v4 @theme). One excellent
   implementation per variant. Renderer owns implementation; SiteSpec owns intent.
9. Surface separation (07): public render contains ONLY the family; owner/trust/dev chrome moved behind their
   surfaces. Delete everything on the deletion list (08). Demo-owner flag never leaks into public DOM.

## Phase D — Regeneration + owner UX

10. Section-granular regeneration: regenerate one section, keep the rest (Framer lesson). Preview before apply.
11. "Customize with FYD" conversational entry + per-component edit contracts (Craft.js shape) behind
    Customize -> Advanced. Full safety chain intact internally.

## Phase E — Proof

12. Generate HPP and COPPERSMITH from the family. Shoot original-vs-FYD at 375/390/1440. Score the rubric (09).
    Nolan's screenshot test is the gate. Any must-win fail -> fix the section, re-shoot, re-score. No unit-test
    victory declarations.

## Explicitly out of scope for the smallest rebuild

New component types beyond the 11; free-form visual editing (GrapesJS: rejected); CMS adoption; copying HPP's
exact design onto Coppersmith (family, not clone); production media rights lifecycle (explicitly authorized demos
use ingested derivatives with provenance; production rights lifecycle later, not blocking).

## Invariants preserved throughout

EVIDENCE, OBJECTS, RELATIONSHIPS, DETERMINISM, AUTHORITY, REPLAY, OWNER CONTROL. Substrate untouched;
only the planner, the family, and the public render change.
