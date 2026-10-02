# SCHEMA-DRIVEN UI HARVEST (lane E steering workstream, 2026-09-23)

Feeds the lane E schema→everything verdict. Question: does the ecosystem show that COMPONENT SELECTION / EDITORS can be generated from schemas without hand-written customer code, and does that make schema→everything MORE viable or reveal it as a trap?

## PROBLEM

FYD's 500-site factory goal wants component selection driven by data, not hand-written per-customer code. PING already has a hand-declared schema→component table (`SCHEMA_COMPONENTS` in `src/fyd/sitespec/schemas.ts`, wired into the generator) plus a second parallel mapping (`acceptsSchemas` in the component registry). The question is whether the ecosystem has a MECHANISM that turns a schema into component/editor choices deterministically, and whether adopting that mechanism strengthens or kills the schema→everything claim.

## PING ALREADY HAS

- `eligibleComponents(schemaId)` in `src/fyd/sitespec/schemas.ts`: hand-declared table keyed by schema id + `schemaRole()` projection so `ping.knowledge.*` inherits proof-vocabulary eligibility. Wired into `proceduralize/generator.ts` and `sitespec/validator.ts`. Deterministic, tested, zero dependencies.
- Component registry (`src/fyd/components/registry.ts`) with per-component `acceptsSchemas`, `requiredData`, `editableProperties`, `responsive` metadata: the component-side view of the same mapping. Dual-source drift risk noted for DUP lane.
- What PING does NOT have: ranked/predicate-based eligibility (a component declaring "I accept schemas matching X"), generated forms, or a UI-config layer.

## EXTERNAL CANDIDATES

| System | Mechanism (how schema becomes UI choice) | Conditionals / polymorphism / custom widgets |
|---|---|---|
| react-jsonschema-form (rjsf) | JSON Schema + parallel `uiSchema`; widget registry keyed by (type, format, `ui:widget`); `oneOf`/`anyOf` via discriminator or user selection | `if`/`then` supported but limited; custom `ui:field`/`ui:widget` escape hatch = customer code |
| JSON Forms (EclipseSource) | JSON Schema + UI schema; **ranked testers**: `rankWith(rank, tester(uischema, schema))`, highest rank wins; renderer sets swappable per platform | Rules (HIDE/SHOW/ENABLE) in UI schema; `generateDefaultUISchema` for the zero-config case; custom renderers via equal-rank override |
| Payload CMS | Collection/field config IS the admin UI config: field types map to admin components, `admin.components` for custom | Custom components are first-class; the "schema" was never purely semantic |
| Sanity Studio | Schema types resolve to form inputs via an input resolver; custom input components registered per type | Intent-based; custom components expected |
| KeystoneJS / TinaCMS / Strapi | Field/view config generates admin UI; custom field views as escape hatch | Same pattern: semantic config + UI overrides |
| Refine.dev Inferencer / react-admin guessers | Infer form from live DATA when schema is incomplete | Inference is heuristic, not contractual |

The convergent architecture across all of them: **semantic schema + a second, UI-adjacent declarative layer** (uiSchema / UI schema / admin config / renderer testers). Nobody generates real editors from a pure semantic schema. Even JSON Forms' default generation produces only a flat VerticalLayout of Controls (verified headless, below).

## LICENSES

- `@jsonforms/core` 3.8.0: MIT. rjsf: Apache-2.0. Payload: MIT. Sanity: MIT (studio). KeystoneJS: MIT.
- All legally usable. No license blocks adoption of the MECHANISM. (Adopting a package is a separate vendor-veto decision; see below.)

## TESTED

Headless tests in `lane-e/harvest/test-jsonforms/` (`@jsonforms/core@3.8.0`, installed isolated, not adopted):

1. **Ranked-tester eligibility** (the mechanism mapped onto PING's component-eligibility problem):
   - `rankWith(10, schema => schema.id === 'ping.social.business@1')` style predicates over schema ids produce ranked eligibility: business -> Hero@10, Contact@10, ObjectGrid@3, GenericCard@1; service -> Services@10, ObjectGrid@3, ObjectFeed@3, GenericCard@1; post -> ObjectGrid@3, ObjectFeed@3, GenericCard@1; unknown schema -> GenericCard@1 only. Deterministic, graceful fallback. WORKS.
   - Note: `schemaMatches()` in core is control-scoped (needs a Control uischema with scope); schema-level eligibility uses plain `(uischema, schema) => boolean` predicates with `rankWith`. The compositional tester combinators (`and`/`or`/`uiTypeIs`) work as documented.
2. **Default UI generation**: `generateDefaultUISchema()` on a business-like schema yields a flat `VerticalLayout` of `Control` elements, one per property, no layout/grouping/conditionals. Confirms: pure schema -> editor gives CRUD scaffolding only; anything real needs the UI schema layer.
3. **AJV validation** (`createAjv`): compiled schema validation with per-field errors; the same class of validator PING hand-rolled in `validateAgainstSchema`. PING's version is already sufficient for its three-type vocabulary; no need to import AJV for the proof schemas.

## WINNER

**The mechanism, not a package: ranked predicate testers for eligibility + a separate UI-config layer for editors.**

- For component eligibility: JSON Forms' `rankWith(rank, tester)` pattern is strictly better than PING's hand-written id-keyed table for one reason: it lets a COMPONENT declare acceptance ("service-like schemas") instead of the schema file enumerating components, which removes the dual-mapping drift (schemas.ts table vs registry acceptsSchemas) by construction. It is ~40 lines to implement natively; no dependency needed.
- For editors: the harvest UNIFORMLY says a second declarative UI layer is required. This does not exist in PING and should not be built as part of schema→everything.

## ADOPT-ADAPT-REJECT

- **ADAPT** the ranked-tester eligibility mechanism into PING's existing `eligibleComponents` path (native implementation, no package). This converges the two current mappings: registry entries carry testers; `eligibleComponents` evaluates them.
- **REJECT** adopting `@jsonforms/core` / rjsf / AJV as dependencies for the proof vocabulary: PING's three-type vocabulary and hand-rolled validator already cover the proven targets; the packages add weight without removing commodity code (vendor-veto gate: DOES IT REMOVE COMMODITY CODE? No. → REJECT).
- **REJECT** generated object editors from the semantic schema: the harvest proves every mature system needs the second UI layer, and PING's real requirements (dual-value owner corrections, nested objects, conditionals) are inexpressible. Building it would be the meta-framework trap.

## CODE WE DO NOT NEED TO WRITE

- A validation library (AJV): PING's `validateAgainstSchema` covers the three-type vocabulary; tested.
- A form renderer / UI-schema engine: rejected above.
- A schema→component inference engine: eligibility is declared via ranked testers, not inferred from field shapes (field-shape inference could never produce "Hero").

## MINIMAL PING WRAPPER

If the coordinator approves the ADAPT: replace `SCHEMA_COMPONENTS` table + `eligibleComponents()` in `src/fyd/sitespec/schemas.ts` with:

```ts
// Component entries register ranked testers; highest rank wins; rank 1 = GenericObjectCard fallback.
export type ComponentTester = (schemaId: string) => number; // 0 = not applicable
```

Registry `DEFINITIONS` gain a `tester` (or keep `acceptsSchemas` as the rank-10 tester source during migration). `eligibleComponents` becomes: evaluate testers, sort by rank desc, filter >0. `schemaRole()` projection becomes a tester combinator. ~40 lines, one file, existing consumers (`generator.ts`, `validator.ts`) unchanged. Migration is backward compatible: the current table is exactly the rank-10 testers.

## FAILURE TEST

- Unknown schema id -> only GenericCard (rank 1) eligible: verified in the headless test.
- Two testers tie at the same rank -> later-registered wins (documented JSON Forms behavior); PING's native version must define tie-breaking deterministically (registry order) and test it.
- A tester throwing must not break eligibility evaluation: fail-closed to rank 0 for that component (test to add).

## PRODUCT CAPABILITY UNLOCKED

Deterministic, single-source component eligibility that a new component joins by registering one tester (no edits to a central table, no second mapping to keep in sync). This is the "component selection generated from schemas" half of the steering ask, without the editor-generation trap.

## BYTES-DEPENDENCY COST

- Adopted: 0 new dependencies, ~40 lines native code, replaces one hand-written table.
- Rejected: @jsonforms/core (~hundreds of KB with deps), rjsf (+ React peer weight), AJV. None enter the PING bundle.
- Test artifacts live in `lane-e/harvest/test-jsonforms/` (isolated `node_modules`, not part of any PING build).
