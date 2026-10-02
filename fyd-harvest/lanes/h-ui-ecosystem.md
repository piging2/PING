# FYD HARVEST LANE H — UI ECOSYSTEM HARVEST

**Date:** 2026-09-22 (verified 2026-09-22/23, ~19:45 MDT)
**Constraint honored:** read-only. Zero writes to the repo, zero installs, zero test runs. All version/license data from primary sources: npm registry (`registry.npmjs.org/<pkg>/latest`) and GitHub API on the canonical repos.
**Builds on:** `~/workspace/fyd-harvest/harvest-report.md` Sheets 1-3 (Puck, OpenPage, json-render deep analysis — NOT redone here; only version/license deltas re-verified). New in this lane: Tambo, Object UI, Payload Blocks.

## FYD context this lane assumes (prior lanes, not re-verified)

- SiteSpec: `FYDSection { id, component, query: FYDQuery (owner|related|all|reference|static), presentation }`. Sections declare HOW to fetch objects from the PING graph; content resolves at render time. Object bindings live in the spec, not the components.
- Single component registry + deterministic renderer (`registry.ts`, 17 section components + `GenericObjectCard` fallback, `COMPONENT_REGISTRY_VERSION`). Copy classes DIRECT / DERIVED / GENERATED PRESENTATION / OWNER COPY. Binding verifier.
- Ask FYD: today deterministic keyword-regex intents; `site_patch` proposals are digest-bound (`proposalDigest`/`verifyProposalDigest`) and apply only through the governed event path. No LLM in the loop yet.
- Desired chain: PING GRAPH -> SITE SPEC -> COMPONENT REGISTRY -> VISUAL EDITOR -> TYPED SITE PATCH -> PING PROPOSAL/AUTHORIZATION -> UPDATED SITE SPEC. Human visual edits and Ask FYD edits converge on the SAME typed IR. AI plans/selects/reorders/rewrites copy/chooses variants; AI never owns runtime code.
- Lightpanda stays in the acquisition lane (not this lane).

---

## Version + license pins (all verified this lane, 2026-09-22/23)

| Candidate | Package | Version | License (primary source) | Peer deps relevant to FYD | Repo activity |
|---|---|---|---|---|---|
| Puck | `@puckeditor/core` | **0.23.0** (released 2026-08-07; prior lane saw 0.22.2) | **MIT** (GitHub `puckeditor/puck` LICENSE; npm) | `react: ^18.0.0 \|\| ^19.0.0` — compatible with FYD React 18.3.1 | pushed 2026-09-21, active |
| OpenPage | n/a (app, not a package) | **no versioned releases** | **MIT** (GitHub `buildingopen/openpage` README badge) | n/a | last push **2026-03-07** (~6.5 mo stale), 79 stars |
| Payload Blocks | `payload` (Blocks is a field type, not a package) | **3.90.1** | **MIT** (GitHub `payloadcms/payload`; npm) | `graphql: ^16.8.1` | pushed 2026-09-22, active |
| Tambo | `@tambo-ai/react` | **1.3.0** | **MIT** (GitHub `tambo-ai/tambo` LICENSE; npm) | `react: ^18\|\|^19`, `zod: ^3.25.76 \|\| ^4`, `zod-to-json-schema`, `@modelcontextprotocol/sdk` | pushed 2026-09-22, **11,185 stars**, very active |
| Object UI | `@object-ui/react` | **17.6.0** | **MIT** (GitHub `objectstack-ai/objectui` LICENSE; npm) | `react: ^18\|\|^19`, `react-dom: ^18\|\|^19` | pushed 2026-09-23 (today), **27 stars**, brand new |
| json-render | `@json-render/core` / `@json-render/react` | **0.21.0** (prior lane: 0.18.x) | **Apache-2.0** (unchanged) | `@json-render/react`: **`react: ^19.2.3`** (clash stands); `@json-render/core`: `zod: ^4.0.0` | pushed 2026-09-21, active |

License compatibility note: MIT and Apache-2.0 are both commercial-use friendly and compatible with FYD's stack. No AGPL/Copyleft candidate in this lane (the only copyleft observed across the harvest program is Webstudio, covered in a prior lane, patterns-only).

---

## Sheet H-1 — puckeditor/puck — ADAPT (projection surface; never backend)

- **Problem solved:** Embeddable visual page editor for your OWN components, JSON in/out, no backend lock-in: `<Puck config={components} data={initialData} onPublish={save} />`. Data shape `{ root: { props }, content: [{ type, props }], zones? }`; schema-driven field configs (text, TipTap rich text, selects); `<Render>`/RSC `ServerRender` for publishing; drag-and-drop via `@dnd-kit`; plugin/override system. Puck AI (cloud, `PUCK_API_KEY`) is a separate commercial product; the MIT core needs none of it.
- **License:** MIT — verified on `puckeditor/puck` README + LICENSE. Commercial use, modification, private use permitted. No copyleft reach into FYD.
- **Version fit:** 0.23.0 peer-deps `react ^18 || ^19` — drops cleanly into FYD's React 18.3.1 / Next 15.5.24 with no framework upgrade. It would live in the owner-mode surface only; zero runtime cost to public sites.
- **Direct use vs wrap:** WRAP, and wrap is load-bearing. Direct use as a site backend is rejected by the task ("never Puck-as-backend"). The sanctioned architecture (from the prior sheet, confirmed still correct): **SiteSpec -> Puck adapter (projection, never persisted) -> owner edits Puck JSON -> translator emits TYPED SITE PATCH -> existing PING proposal/approval/digest path -> SiteSpec transition.** Puck never writes SiteSpec; Puck data is never persisted as truth.
- **Puck <-> FYD registry mapping:** each `FYDSection` projects to a Puck block `{ type: <componentName from COMPONENT_REGISTRY>, props: { heading, copy, ... } }` using render-model-resolved values for DISPLAY only. The `config.components` map is generated from the FYD registry (name -> field config derived from the component's `editableProperties` + presentation schema). Diffing edited Puck data against the projected snapshot yields only sanctioned `SitePatch` op classes: reorder -> `move_section`; `presentation.*` edits -> `update_presentation`; token edits -> `update_tokens`; adding a catalog-listed component -> `add_section` (with a default query for its schema); **anything touching query/binding -> REJECTED with reason** (owner must use Ask FYD). Query-bound fields render read-only in Puck's field config.
- **What FYD would otherwise hand-write:** a drag-and-drop canvas, component palette, property inspector, reorder mechanics, undo — i.e. an entire visual editor. Puck deletes that work; the FYD-specific part is ONLY the two translators (project + diff) and the query-field rejection classes.
- **Duplicates PING machinery?** No — FYD/PING has no human visual editor. Owner edits today flow through the keyword parser + digest-bound proposals; Puck becomes a SECOND PRODUCER of typed `SitePatch` ops into that same seam, which is exactly the sanctioned shape ("intelligence produces data, never arbitrary JSX" — Puck produces data too).
- **Fits the SiteSpec model?** Yes, but only through the projection: fundamental model mismatch stands (Puck blocks are prop-driven with content baked in; FYD sections are query-driven, content resolved from the object graph at render). The projection is lossy-by-design; `FYDQuery` values are preserved out-of-band and re-attached on the SitePatch emission. **Invariant guard (from prior sheet, unchanged):** FYD has a no-CRDT rule; Puck's collaboration experiments (Yjs-based, observed in a third-party fork's demo architecture, not official core) must never leak CRDT state into SiteSpec. The SitePatch seam is the only channel, period.
- **Delta since prior lane:** 0.22.2 -> 0.23.0, no shape change to the config/data contract observed; React 18 peer compat retained. Verdict unchanged.
- **VERDICT: ADAPT.** The editing-surface projection is the human-visual-editor half of the "same typed IR" requirement (see pairing recommendation below). Not this wave's integration; preconditions: (1) SiteSpec<->Puck projection + Puck->SitePatch translator designed with rejection classes enumerated; (2) Puck data never persisted; (3) existing digest-bound proposal path reused, not duplicated.

## Sheet H-2 — buildingopen/openpage — ADAPT patterns only / REJECT builder

- **Problem solved:** one structured JSON document per site that a visual drag-and-drop editor AND an AI endpoint (Gemini backend) both read/write via JSON patches — "no hallucinated imports, no merge conflicts, no broken builds." 13 production block components with variant vocabulary (HeroCentered/HeroSplit/HeroGradient, PricingSimple/PricingComparison), theme presets, agent panel, version history.
- **License:** MIT. No license blocker.
- **Delta since prior lane:** no versioned releases (ships as an app, not a package); repo last pushed **2026-03-07** — ~6.5 months without a commit, 79 stars. It is stalling as an open-source project, which hardens the pattern-only stance (nothing to pin, no maintenance tail to ride).
- **Direct use vs wrap:** neither — do not import a competing builder. Competing JSON grammar, own editor, own deploy, Gemini-coupled AI endpoint = total lock-in if imported.
- **What FYD would otherwise hand-write:** nothing FYD still needs — FYD already has SiteSpec + typed SitePatch ops + the proposal/approval seam, which IS the human/AI shared-editing contract. OpenPage validates the shape of that contract; it does not fill a gap.
- **Duplicates PING machinery?** Substantial conceptual overlap at L2 (SiteSpec is also "JSON spec; AI produces transitions; humans approve"), but zero L1 overlap: OpenPage blocks carry their own content; there is no object graph, no evidence, no visibility, no capabilities layer. Two competing L2s would be a canonicality disaster.
- **Fits the SiteSpec model?** As a pattern source, yes: its shared-editing contract, block-variant naming checklist for FYD's registry `variants[]` audit, theme-preset packaging concept, and AgentPanel UX (AI proposes diffs on the same JSON, human approves) are direct references for Ask FYD's `site_patch` proposal cards. Its immer-local undo is NOT adopted (FYD's "undo" is the governed event log).
- **VERDICT: REJECT as builder/dependency; ADAPT patterns.** New evidence (repo stalled since March) only strengthens this.

## Sheet H-3 — Payload Blocks (payloadcms/payload) — ADAPT pattern only / REJECT the CMS

- **Problem solved (canonical docs, `docs/fields/blocks.mdx`):** "The Blocks Field ... stores an array of objects, where each object is a 'block' with its own schema. Unlike a simple array (where every item looks the same), blocks let you mix and match different content types in any order." Canonical use: page builder with `Quote`, `CallToAction`, `Slider`, `Gallery` blocks, each with its own field schema; admin block-picker drawer; per-block validation.
- **License:** MIT (payload 3.90.1). No license blocker.
- **Direct use vs wrap:** neither — Payload is a full CMS (Node backend, database, admin panel). Adopting Payload would import a second content-truth system alongside the PING graph. **Reject the CMS, harvest the pattern.**
- **The harvestable pattern:** discriminated-union block schemas. Shape: `blocks: [{ slug: 'hero', fields: [...] }, { slug: 'cta', fields: [...] }]` -> stored array of `{ blockType: slug, ...fields }` -> block picker in the editor -> each block renders through its registered component. FYD's direct analog: `FYDSection { id, component, query, presentation }` where `component` is the discriminator and the registry is the block catalog. Harvest checklist for the product sprint: (a) per-component field schemas formally declared (feeds the json-render-sheet primitive "typed catalog as AI contract"); (b) the block-picker UX as reference for an "add section" UI in the visual editor; (c) block-level validation as the model for SitePatch op validation. **The decisive difference to preserve:** Payload blocks carry their own content; FYD sections carry queries. Payload's pattern applies to the `presentation` half only; the `query` half has no Payload counterpart and stays FYD-owned.
- **What FYD would otherwise hand-write:** the discriminated-union schema discipline and the block-picker/validation UX vocabulary — small, but getting the vocabulary right the first time avoids a schema redesign later.
- **Duplicates PING machinery?** Adopting Payload the CMS would duplicate PING as the content authority. Adopting only the pattern duplicates nothing.
- **Fits the SiteSpec model?** Yes — it describes the same heterogeneous-composition shape FYD already has; it does not compete with it.
- **VERDICT: ADAPT pattern; REJECT the CMS.** One paragraph in the product spec, not a dependency.

## Sheet H-4 — tambo-ai/tambo — ADAPT selection pattern / REJECT the fullstack package

- **Problem solved:** generative-UI toolkit where the model SELECTS rather than generating code. Canonical mechanism (repo README, verified 2026-09-22): "Register your components with Zod schemas. The agent picks the right one and streams the props so users can interact with them." The registered vocabulary is the model's only UI surface; props stream to real components; cancellation/error recovery handled.
- **License:** MIT — verified on `tambo-ai/tambo` LICENSE. No copyleft blocker.
- **Version fit:** `@tambo-ai/react` 1.3.0, peer deps `react ^18||^19`, `zod ^3.25.76||^4` — both ranges are satisfiable against FYD's React 18.3.1 and the transitive zod 3.25.76 (AI SDK sheet already recommends promoting zod to a direct dep; Tambo adoption would need the same). `zod-to-json-schema` converts registered zod schemas to JSON Schema for the model — a useful primitive in its own right.
- **Direct use vs wrap:** REJECT the package; ADAPT the pattern. Tambo is a FULLSTACK solution: it ships its own agent/conversation loop and a backend (Tambo Cloud, or self-hosted Docker) that owns conversation state and agent orchestration. Adopting it would duplicate three FYD/PING-owned things: Ask FYD's intent/proposal path, the digest-bound authorization seam, and PING as the canonical knowledge authority. The harvest is the *selection semantics*, not the runtime: model emits `{ componentName from registered vocabulary, props validated against that component's zod schema }` -> FYD's existing proposal/approval path. That is exactly the Ask FYD half of the "same typed IR" requirement.
- **What FYD would otherwise hand-write:** the registered-vocabulary contract for the model (component catalog + per-component prop schemas + a "selection, never generation" enforcement rule). Tambo's shape for this — register-with-zod-schema, model picks, props stream — is the cleanest production reference in the ecosystem, cleaner than inventing FYD's own from the AI-SDK transport alone. (The AI SDK Sheet 5 transport, `Output.object({ schema })` + `tool()`, is the mechanism; Tambo is the selection semantics that rides on it.)
- **Duplicates PING machinery?** The package would (own agent loop, own backend, own conversation state — all PING/Ask-FYD territory). The pattern does not: it slots into FYD's registry + SitePatch + proposal/approval seam, which already exist.
- **Fits the SiteSpec model?** Yes — with one strict constraint: the model's selectable vocabulary must be FYD's COMPONENT REGISTRY (with per-component zod prop schemas as the new harvest), and its output must be typed `SitePatch` ops into the existing digest-bound proposal path, never direct spec mutation. Tambo's streaming-props mechanics map to Ask FYD streaming a `site_patch` proposal progressively; the digest binds the final proposal, not the stream (same warning as the json-render SpecStream sheet).
- **VERDICT: ADAPT the registered-vocabulary selection pattern; REJECT the `@tambo-ai/react` package in this wave.** 11k stars and daily commits make it the healthiest project in this lane, but health does not override architecture: FYD already owns the agent loop and the authorization seam.

## Sheet H-5 — objectstack-ai/objectui — ADAPT one discipline / REJECT adoption

- **Problem solved (repo tagline, verified):** "The schema-driven UI engine for the AI era: agents write compact JSON; Object UI renders production React — grids, kanban, dashboards, Gantt, visual designers." `@object-ui/types` is explicitly "the protocol layer"; `SchemaRenderer` turns schema into React; plugin packages for grid/form/chatbot/dashboard. Positioned as the view layer of the ObjectStack ecosystem (ObjectStack = protocol/toolkit, ObjectUI = render, **ObjectOS = commercial runtime**).
- **License:** MIT — no copyleft blocker. But note the commercial ObjectOS runtime tail: the ecosystem's full value accrues to the paid runtime, a soft lock-in vector.
- **Version/health:** `@object-ui/react` 17.6.0 (odd high major for a new project), React 18/19 compatible, Tailwind v4. Repo: **27 stars, first-seen activity essentially now** (pushed 2026-09-23). This is a brand-new, unproven project — adoption would make FYD the largest production consumer of an infant codebase.
- **Direct use vs wrap:** neither. FYD ALREADY IS this: "AI produces data, never arbitrary JSX" + deterministic renderer + registry is the same architectural thesis. Object UI's schemas describe record-app views (kanban columns, Gantt bars, dashboard KPIs over record data), not marketing-site sections bound to an object graph with evidence, copy classes, and capabilities. It has no counterpart for `FYDQuery`, evidence, or the digest-bound proposal path.
- **The one harvestable discipline:** **schema compactness as an AI-writability requirement.** Their thesis ("an agent that would drown hand-writing React across fifty screens can emit and refactor compact schemas instead") is a design constraint FYD should state explicitly for its own registry schemas and SitePatch op grammar: every component's editable surface and every patch op must be compact enough for a model to emit reliably. This is a spec-writing rule, not a dependency.
- **What FYD would otherwise hand-write:** nothing — the renderer layer already exists. The harvest is one sentence in the product spec.
- **Duplicates PING machinery?** Adopting it would duplicate FYD's own renderer + registry with a younger, record-oriented one. The discipline duplicates nothing.
- **Fits the SiteSpec model?** No — its schema describes app views over records, not object-bound site sections. Pattern-level only.
- **VERDICT: REJECT adoption; ADAPT the schema-compactness discipline.** Revisit in 12 months if the project survives; it is not a product-sprint input.

## Sheet H-6 — vercel-labs/json-render — DELTA CHECK ONLY (prior sheet stands)

Prior lane verdict (harvest-report.md Sheet 1): **ADAPT patterns (typed catalog as AI contract, catalog-driven prompt injection, named slots, devtools pattern); REJECT the npm package** (React 19 + zod 4 peer deps vs FYD's React 18.3.1; pre-1.0 churn; no object-binding/evidence/visibility counterpart).

Delta verified 2026-09-22:
- **Version:** `0.18.x` -> **`0.21.0`** (both `@json-render/core` and `@json-render/react`). Active development continues (repo pushed 2026-09-21).
- **License:** Apache-2.0 — unchanged.
- **Peer deps:** `@json-render/react` 0.21.0 still requires **`react: ^19.2.3`** — the React 19 clash with FYD's 18.3.1 is UNCHANGED and still dispositive. `@json-render/core` peer deps narrowed to `zod: ^4.0.0` only (the React peer moved to the react package); FYD's zod is transitively 3.25.76, so the zod-4 requirement is a second, independent clash.
- **No new information** that changes the ADAPT-patterns / REJECT-package verdict. The highest-value primitive stands: the typed component catalog (component -> zod prop schema + slots + description) as the shared AI-prompt/validator contract, which FYD builds from its own registry without the dependency.

---

## The two required answers

### 1. Human-visual-editor half of "same typed IR", least custom code: PUCK

Puck is the only candidate that is (a) an embeddable visual editor rather than a competing builder, (b) MIT, (c) React-18 compatible, (d) JSON in/out with no backend lock-in, and (e) already designed around YOUR components (its `config.components` map is generated from FYD's registry). The FYD-specific code is only the two translators (SiteSpec->Puck projection, Puck-diff->typed-SitePatch) plus the enumerated query-field rejection classes — the editor itself (canvas, dnd, property inspector, undo) is deleted work. Runners-up fail structurally: OpenPage is a competing builder (reject), Payload's admin panel requires adopting the Payload CMS (reject), Object UI's visual designers are record-app oriented and the project is 27 stars old (reject), Tambo has no human visual editor at all.

Recommended pairing for the product sprint: **Puck (projection surface) + typed `SitePatch` ops as the single IR.** Human visual edits and Ask FYD edits both terminate in `SitePatch` ops validated against the registry and applied only through the existing digest-bound proposal/authorization path. That is the "same typed IR" requirement, satisfied with the least custom code in the ecosystem.

### 2. Ask FYD "model selects structured changes" half: TAMBO's registered-vocabulary pattern

Tambo's `registerComponent(component, zodSchema)` contract — the model picks from the registered vocabulary and emits validated props, never code — is the direct production reference for Ask FYD's graduation from keyword-regex intents to model-backed proposals. Harvest the semantics, not the package: FYD's COMPONENT REGISTRY + per-component zod prop schemas (the json-render-sheet primitive) becomes the model's constrained vocabulary; the model emits typed `SitePatch` ops; the existing `proposalDigest`/`verifyProposalDigest` + governed event path stays the only application channel. Transport per the AI SDK sheet: `Output.object({ schema })` / `tool()` with FYD-owned schemas. Enforcement rule, stated once in the product spec: **selection, never generation — anything outside the registered vocabulary is rejected at the schema gate.**

---

## Consolidated harvest: the smallest FYD-specific product layer

Everything FYD hand-writes is below; everything else is adopted/adapted:

1. **Per-component zod prop schemas on the FYD registry** (harvested from: json-render's typed catalog, Tambo's register-with-zod contract, Payload's per-block field schemas). One new registry metadata dimension; powers the AI vocabulary, the Puck field configs, and SitePatch validation.
2. **The typed `SitePatch` op grammar as the single human+AI shared IR** (validated by OpenPage's shared-editing contract; produced by two producers: the Puck projection translators and Ask FYD). Plus the explicit rule that query/binding fields have no editor counterpart and are preserved out-of-band.
3. **Puck projection adapter + diff translator** (H-1) — the only visual-editor code FYD owns.
4. **Schema-compactness discipline** (H-5): every editable surface and every patch op must be compact enough for a model to emit reliably. A spec-writing rule, not code.
5. **Named slots + devtools pattern** (json-render sheet): slots for nested composition without new components; a dev-only SiteSpec inspector, tree-shaken from prod.

Outright REJECTs: json-render npm package (React 19 + zod 4 clashes persist), OpenPage as builder/dependency (competing L2; repo stalled since 2026-03), Payload the CMS (second content-truth system), Tambo the fullstack package (duplicates Ask FYD's agent loop and the authorization seam), Object UI adoption (27-star infant; duplicates FYD's own renderer thesis).

## Risks / open items for the product sprint

- Puck is pre-1.0 (0.23.0); pin the version and vendor the projection translators defensively against config-shape churn. Its collaboration experiments (Yjs) must never enter SiteSpec — the SitePatch seam is the only channel (no-CRDT rule).
- Tambo's `zod-to-json-schema` conversion is a handy primitive, but FYD's schemas stay FYD-owned; do not import Tambo's backend or conversation state.
- Object UI's commercial ObjectOS tail is a reminder to check the paid-runtime vector on any "open core" candidate before adoption — none of the ADAPT verdicts above carry one, but re-verify at integration time.
- The json-render React-19 clash should be re-checked once per quarter; if FYD ever moves to React 19 the package rejection weakens, but the object-binding gap remains, so the verdict is unlikely to flip.
