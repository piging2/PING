# 04 — Harvest List: Internal + Ecosystem

Verdict scale: ADOPT (take as-is), ADAPT (take the concept, own the implementation),
REJECT (do not use / explicitly deferred).

## Internal harvest (~/workspace, prior FYD work)

1. **DESIGN-TOKENS-REGISTRY-PROPOSAL.md** (~/workspace/fyd-build/work/) — ADAPT. Design-only proposal that already
   identified the two-token-source problem, inert Tailwind classes, duplicated eligibility tables, and proposed:
   registry entries declaring variants + fields + relationships + mobile behavior, a machine-readable catalog
   feeding agent tool descriptions (shadcn registry.json pattern), Craft.js-style per-component edit contracts.
   The design work is done; implementation should follow the new design family, not invent another framework.
2. **BUILDER-STATE.md archaeology** (~/workspace/fyd-build/hpp-lane/builder-archaeology/) — ADOPT as analysis method.
   Every claim cites a file. Re-verify, don't trust prior summaries.
3. **Component inventory** (~/workspace/fyd-object-build/work/component-inventory.md) — ADAPT. Harvests:
   ObjectCircle/IntelligentCircle battle-tested pattern (hover/focus card + bottom-sheet dialog on tap, 44px targets,
   aria-modal) — reusable for the object doorway; ObjectRail rail-vs-drawer placement law; AskObjectPanel
   (citations + refusal copy) REUSE-WITH-ADAPTER for the Ask FYD surface. Verdict on current renderer recorded:
   NOT-SUITABLE directly; the registry is the harvest source for "planner computes ELIGIBLE COMPONENTS deterministically".
4. **Motion tokens** (~/workspace/fyd-product-lane/src/motion/motionTokens.ts; MotionTokens in sitespec/types.ts) — ADAPT.
   motionIntensity NONE/SUBTLE/EXPRESSIVE, reduced-motion collapse. Keep the semantics, re-point at the new family.
5. **ObjectView** (~/workspace/fyd-product-lane/src/fyd/object/view.ts + src/app/o/[objectId]/page.tsx) — ADAPT.
   The object-node page (hero image, capability action row, Services, Service area, About with WhyThis lineage,
   Contact, Source vs owner corrections, Ask panel, quiet provenance) is the TRUST/INSPECT surface done right.
   This is the model for where intelligence lives: on the object page, on demand — not on the public homepage.

## Ecosystem harvest

6. **shadcn registry.json (registry:item schema)** — ADAPT. Industry-standard JSON blueprint for defining UI
   components, metadata, dependencies, variants, and file distribution (registry:block / registry:component /
   registry:theme / registry:base). Use the SHAPE: each FYD family component gets a typed catalog entry
   (name, variants, accepted object schemas, composition rules, responsive behavior) that the planner reads
   instead of reading code. Do NOT pull the npm package: the copy-and-own philosophy matches FYD (own the code,
   keep the object model untouched), and FYD components are object-bound, not generic.
7. **W3C DTCG design tokens + Style Dictionary v4** — ADAPT. DTCG (2025.10 stable, de-facto standard, 10+ tools)
   is the token FORMAT; Style Dictionary v4 compiles DTCG -> CSS custom properties / Tailwind v4 @theme / typed TS.
   Three-tier rule: primitives -> semantic -> component; product code references semantic/component only, never
   primitives; name by intent not appearance. FYD should compile its design-family tokens this way: the planner
   selects semantic intent, the compiler emits implementation. This is exactly "SiteSpec owns semantic presentation
   intent, renderer owns implementation."
8. **Tailwind v4 @theme** — ADAPT as substrate. It is a CSS-variable emitter, not a token spec. Use it as the
   renderer's implementation layer fed by compiled DTCG tokens. (Current renderer emits inert Tailwind class names
   with no Tailwind build — a real build must exist or the classes stay decorative.)
9. **Builder.io (visual headless CMS)** — ADAPT the pattern, REJECT the product. Pattern to harvest: developers
   register components with typed schemas/slots; the page is structured JSON; locked layout with dynamic content
   bindings; responsive variants per breakpoint; visual editor is a consumer of the registry, never the authority.
   FYD's SiteSpec + registry IS this pattern already — the lesson is that Builder never let the LLM invent
   arbitrary JSX; the planner selects from registered components with declared composition rules. Reject the SaaS
   dependency (cost, lock-in, no object-model fit).
10. **Craft.js** — ADAPT. "Components declare their own edit contract" (variants + token choices + composition rules;
    the editor consumes the declaration). This is the Owner Mode UX: "Customize with FYD" presents each component's
    declared edit surface, not a generic panel. No dependency needed — take the concept.
11. **Framer AI** — ADAPT the quality bar, REJECT the product. Consistently the strongest design-forward AI output
    in 2026 reviews: section-level AI generation, screenshot-to-layout reference, per-section refinement instead of
    whole-page regeneration. Lesson: incremental SECTION regeneration (regenerate one section, keep the rest) beats
    whole-page regeneration for quality control. FYD's regeneration machinery should regenerate at section
    granularity. Do not adopt the platform.
12. **Sanity / Contentful (structured content modeling)** — REJECT as products. FYD's object graph + relationships
    already IS the structured content model (better: typed claims with evidence). No CMS needed.
13. **GrapesJS** — REJECT (explicitly deferred even in the internal proposal). Free-form visual canvas is a
    non-goal; constrained variants are the quality mechanism.
14. **ai-web-design-codex / design-token-pipeline skills** — ADAPT as checklists. Three-tier tokens, WCAG 2.2 AA
    in both modes, semantic-name rule, "tokens alone are not a design system" (DS = tokens + components + patterns
    + docs + governance).

## The harvest thesis

Do not start another home-grown design framework. The missing pieces have industry shapes: DTCG tokens compiled
by Style Dictionary, a shadcn-registry-shaped component catalog, Craft.js-shaped edit contracts, Builder-shaped
schema-bound composition, Framer-shaped section-level regeneration. FYD's job is to bind FYD objects into that
shape — the object model is what FYD owns; everything else is harvestable.
