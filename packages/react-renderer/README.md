# @piging2/react-renderer

The presentation adapter: `SemanticRenderModel` (+ public facts) -> React -> static HTML.

React is a **presentation adapter**. It owns no facts, no evidence, no objects, no SiteSpec, no capabilities, no authority. It renders exactly what the semantic render model authorizes, nothing more.

## Input contract

```ts
renderModelToStaticHtml(model: SemanticRenderModel, facts: FactsById, pageSlug?: string): string
```

- `model` comes from `@piging2/sitespec` (`buildSemanticRenderModel`). It is the **sole authority on what renders**: which pages, which sections, which components, in which order, bound to which object ids.
- `facts` is a plain-data map (`id -> { title, description, fields, claimKind }`) derived by the **caller** from a `VerifiedPublicProjection` via `factsFromProjection()`. The projection already enforced the public boundary; the map carries public facts only.
- The renderer looks up **only** the object ids the model binds, in model order. Facts for ids the model does not name are ignored (asserted by the proof-5 test: an unbound fact never appears in the output).
- The renderer has **no import that can yield an object graph**: it imports only *types* from `@piging2/sitespec`. It never resolves queries, never reads relationships, never touches hidden or private state.

## No-invented-claims rule

Every string in the output comes from the model (section id, component name, heading, copy) or from a bound object's facts. A fact renders only when its value is a non-empty string. Missing data renders nothing, never a placeholder claim. Unknown component names fall back to `GenericObjectCard`, never fail.

Contact links are rendered only from strict-shape public values (`https?://` websites, `tel:`/`mailto:` built from validated phone/email). The FYD safe-link gate and binding-verified contact projections are **not** harvested in this slice: the adapter trusts the caller to pass already-safe public facts. An unverifiable or unsafe value renders no link.

## What is NOT here (recorded boundaries)

- **Styling / motion / theme tokens**: the adapter emits semantic HTML + `data-*` hooks only (`data-render-section`, `data-component`, `data-object`, `data-claim-kind`). Styling belongs to the app shell (the Next.js runtime).
- **Media gallery**: renders nothing; no media store exists in this slice (mirrors the source's eligibility gate: the section renders iff media exists).
- **Ask FYD answers**: the `AskFYD` section renders a claim-free placeholder box. Real evidence-backed Q&A is proof 6.
- **Owner corrections / field visibility**: proofs 7-8.

## Version pins

The React runtime is the **existing proven FYD runtime**, pinned to the exact resolved versions in the canonical FYD workspace lockfile (`ping-fyd-converged @ 32f8347`, `package-lock.json`, lockfileVersion 3):

| package | pinned version | source |
|---|---|---|
| react | 18.3.1 | FYD lockfile `node_modules/react` |
| react-dom | 18.3.1 | FYD lockfile `node_modules/react-dom` |
| typescript | 5.9.3 | FYD lockfile `node_modules/typescript` |
| @types/react | 18.3.31 | FYD lockfile |
| @types/react-dom | 18.3.7 | FYD lockfile |
| @types/node | 20.19.43 | FYD lockfile |
| jest / ts-jest / @types/jest | 29.7.0 / 29.4.14 / 29.5.14 | proven sibling package `packages/sitespec` node_modules |

`next` (15.5.24 in the FYD lockfile) is the app shell, not the presentation adapter; this package does not depend on it. No other dependencies: anything the FYD renderer needed beyond react/react-dom (motion, media stores, widgets) was rejected at the boundary above.

Install (exact pins only, never `latest`):

```
npm install --save-exact
npm test   # jest: renders Happy Place + Coppersmith models, asserts proof-5 acceptance
npm run build  # tsc
```

## Harvest decisions

| file | decision | source |
|---|---|---|
| `src/render.tsx` | ADAPT | `ping-fyd-converged @ 32f8347` `src/fyd/components/renderer.tsx` (section->component switch, SectionShell, per-component factual field selection; theme/motion/context/gates rejected) |
| `src/facts.ts` | NEW | piging2 boundary code: the public-facts input contract + `factsFromProjection` |
| `src/index.ts` | NEW | package surface |
| `test/render-proof5.test.ts` | NEW | proof-5 acceptance: both businesses, traceability, no invented claims, determinism |

## Proof 5 status

Scaffold: the adapter renders both real businesses' semantic render models to static HTML with the proven React runtime. No customer-specific JSX. No customer-specific CSS. No generated executable JSX stored as product state. SiteSpec stays declarative.
