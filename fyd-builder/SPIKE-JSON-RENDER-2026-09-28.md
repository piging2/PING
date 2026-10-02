# JSON-RENDER SPIKE — DESIGN AGAINST THE STRENGTHENED BAR (2026-09-28, read-only)

Nolan's 06:23 bar: the spike must PRESERVE the full semantics list and MEASURE the
full cost list. No prestige points. Verdicts: ~800 lines deleted + second state model
→ REJECT. ~1,500 lines deleted with SiteSpec authoritative → STRONG ADOPT CANDIDATE.
Only typed registry/action pattern better → HARVEST THE PATTERN.

## Current render path (what the spike competes against)

SiteSpec → `resolveQuery` (object-graph resolution, FYD-owned) → `SectionProps`
(objects, presentation, theme, ctx: RenderContext) → 18 semantic section components
→ React tree.

- `renderer.tsx` 2,174 LOC: resolveQuery + applyObjectOrder/applyHiddenObjects +
  boundField/boundTitle/boundDescription (evidence binding) + SectionShell/motion/
  design-intent + 18 section components.
- `registry.ts` 178 LOC: ALREADY a typed component catalog (schema→component, three
  consumers: generator, validator, renderer). json-render does not introduce the
  registry concept; it would replace the dispatch/validation/action machinery around it.
- `binding-verifier.ts` 903 LOC: the render invariant (evidence binding). Untouched by
  the spike either way — it verifies the spec, not the renderer.

## Spike construction (time-boxed, side-by-side, zero production commitment)

1. Adapter `sitespec-to-jsonrender.ts` (pure function, server-side):
   section → flat json-render spec. Evidence grades travel as props (FactClass values,
   post-taxonomy). Visibility → json-render `visible` conditions + FYD owner-override
   resolution BEFORE spec emission (owner intent resolved server-side, never trusted to
   client conditions alone). Capability actions → catalog actions that POST to PING
   endpoints; json-render NEVER executes canonical effects.
2. Register the 18 semantic components against the json-render catalog. They stay
   FYD-owned; only the dispatch loop is replaced.
3. Render both golden fixtures (Happy Place, Coppersmith) through both paths;
   compare served HTML.

## Preservation checklist (each PASS/FAIL with evidence)

canonical business state · SiteSpec semantics · evidence binding · object identity ·
relationship queries · owner intent · visibility · media selection · URL safety ·
tenant isolation · determinism (byte-identical spec JSON across runs) · SSR ·
hydration · mobile · accessibility · Ask doorway · Why/evidence affordances ·
HPP/Coppersmith visual quality (screenshot diff vs current baseline).

Hard notes:
- URL safety: under the 06:24 tenancy rule the SSRF gate is GENERIC (belongs in
  crx-runtime), not tenant code. The spike adapter CALLS the authority; it must not
  reimplement, wrap, or bypass it. Same for tenant isolation: enforced server-side
  before spec emission.
- Evidence binding: if the adapter pre-resolves all bound fields into static props,
  lazy binding is lost and the "evidence binding preserved" box cannot be checked.
  The honest design passes evidence REFS as props and keeps resolution inside
  FYD-owned components — which reduces the deletion count. Measure honestly.
- Second state model: if the spike needs a json-render-side schema that duplicates
  SiteSpec semantics (rather than a mechanical projection), that is a second state
  model → REJECT per the bar.

## Measurement list

LOC removed · LOC added (adapter + catalog glue) · dependencies added · client JS
delta · server render cost · build cost · type complexity · registry complexity ·
custom component escapes (components that cannot live in the catalog) ·
customer-specific branches (tenant `if`s that leak into generic code) ·
new authority introduced (must be zero) · new state model introduced (must be zero).

## Pre-registered honest expectation

The commodity being replaced is dispatch + prop threading + section iteration.
resolveQuery, boundField, visibility resolution, capability actions, and evidence
binding stay FYD-owned whether they live in the adapter or the components. The
earlier 700–1,000 LOC deletion estimate is the OPTIMISTIC case; the strengthened
bar (SSR/hydration/mobile/a11y/visual parity) adds measurement cost that may push
the verdict to HARVEST THE PATTERN. That is a successful spike outcome, not a failure.
