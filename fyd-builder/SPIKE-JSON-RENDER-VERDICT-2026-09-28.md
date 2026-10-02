# SPIKE 1 — JSON-RENDER BENCHMARK: VERDICT (live phase, 2026-09-28)

## VERDICT: REJECT

json-render (`@json-render/core@0.21.0` + `@json-render/react`) does not clear the
deletion-first bar on any criterion, introduces a second schema duplicating SiteSpec
semantics, and its one good pattern (typed component catalog) is already owned
in-house. No adoption, no harvest. Revisit only on: 1.0 stable release AND a
genuine second surface (e.g. native app) that creates real deletion.

## Binding

- Source measured: `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394`
  (`src/fyd/components/renderer.tsx` 1,818 LOC; `src/fyd/components/registry.ts` 148 LOC;
  `src/fyd/sitespec/` schemas 366 + validator 127 + binding-verifier 552 LOC)
- Served head (recovery-lane proof 2026-09-28 06:52 MDT): pid 23046,
  BUILD_ID `DqZQX-gQgkpciv6rpLgG3`, both golden URLs 200. Live-page re-fetch from this
  VM was not possible (no tailnet route from the hatch VM; direct curl HTTP 000);
  served identity is bound via the recovery lane's independent proof, not re-verified here.
- Library primary source (npm, 2026-09-28): `@json-render/core` latest = `0.21.0`
  (published 2026-09-18). Still 0.x, ~40 releases in 8 months. Maturity: LOW (unchanged).

## Deletion math (measured, not estimated)

Commodity surface json-render could own in the CURRENT renderer:

| Piece | LOC | Verdict |
|---|---|---|
| `renderSection` dispatch switch + prop threading | ~55 | deletable |
| `SitePageView` section iteration | ~8 | deletable |
| Generous add: `SectionShell` (~70) + `FydMotionStyles` (~90) | ~160 | only if presentation chrome is surrendered |
| **Total deletable, generous** | **~230** | |
| Adapter `sitespec-to-jsonrender.ts` (must flatten `SectionProps`: section, objects, presentation, theme, ctx with object graph; honest design passes evidence refs and keeps resolution in FYD components) | ~400-700 | new code |
| **Net** | **-170 to -630** | FAIL |

What json-render does NOT delete: the 18 section components (~800-900 LOC) become
catalog entries, they are not removed. `resolveQuery` (~140 LOC), `boundField` family,
visibility resolution (`field-visibility.ts`), owner-override resolution, capability
actions: all FYD-owned, stay either way. `registry.ts` (148 LOC) already IS a typed
catalog (schema->component, three consumers: generator, validator, renderer);
json-render introduces no new concept here.

## Criterion scorecard

| Criterion | Verdict | Evidence |
|---|---|---|
| LOC deleted | FAIL | net -170 to -630 (see math) |
| Schema safety | FAIL (no gain) | FYD already has Zod schemas + validator + binding-verifier (552 LOC render invariant). json-render adds Zod validation of ITS spec: a second validation layer over a second schema. |
| Component constraints | NEUTRAL | FYD registry already constrains via acceptsSchemas/ownerBound/requiresData/editableProperties. json-render's catalog is generic; no FYD-specific gain. |
| Streaming/generation | NEUTRAL | Neither streams site generation today. |
| Owner customization | FAIL | SitePatch operates on SiteSpec (~3,373 LOC customize). A json-render projection is one-way; owner edits need lossy SiteSpec<->spec round-trip on the exact path the non-negotiables protect (regeneration without losing owner intent). |
| Determinism | NEUTRAL | Achievable both ways. No gain. |
| Mobile | NEUTRAL | FYD's mobile story is responsive CSS, shipped. `@json-render/react-native` is irrelevant without a native app. |
| Performance | FAIL/NEUTRAL | Extra serialize->validate->dispatch layer; FYD's direct React render is already minimal. No evidence of gain. |
| Debuggability | FAIL | Direct named TSX today. json-render inserts spec-JSON indirection: stack traces cross the spec boundary, catalog misses are runtime not type errors. |

## Second-schema test: FAIL -> REJECT

json-render's spec (components / props / `visible` conditions / actions) duplicates
SiteSpec semantics. Its `visible` conditions evaluate client-side; FYD resolves owner
intent + visibility server-side before emission (`field-visibility.ts`) and never
trusts client conditions alone. Adopting json-render conditions would shadow FYD's
visibility authority with a weaker mechanism. That is a second state model.
Per the bar: REJECT.

## Harvest check: nothing to take

The typed registry/action pattern is already in-house (`registry.ts`, three
consumers). Capability actions in the current renderer are plain links
(`href={website.href}`, `href="#ask"` in CTASection/AskFYDSection): there is no
dispatch machinery to replace, so json-render's action dispatch would be NEW
machinery, not a replacement, and it cannot carry capability authority anyway.

## What would overturn this

- json-render 1.0 stable (API churn risk retired), AND
- a second FYD render surface (native app, email renderer) where one catalog feeds
  two runtimes and the adapter cost amortizes, AND
- measured net deletion > 500 LOC with SSR/hydration/mobile/a11y parity.
  None hold today.
