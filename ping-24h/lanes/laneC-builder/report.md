# LANE C: WEBSITE BUILDER / EDITOR ARCHAEOLOGY
## WEBSITE BUILDER HARVEST

**Mission:** Harvest mechanics for a typed SiteSpec IR + component registry + deterministic renderer. NOT another AI website generator, NOT a Lovable clone. Public sources only, read-only, no code written, no external contact.

**Sources researched:** Puck (puckeditor/puck), json-render (vercel-labs/json-render), OpenPage (cganh/openpage), Payload CMS, Tailark/shadcn block registries (tailark/blocks, shadcn registries).

**Our target architecture (the invariant we are fitting patterns into):**
- Typed SiteSpec IR (JSON, canonical)
- Component registry (schema'd components -> deterministic implementations)
- Visual editing primitives (reorder / hide / feature / change tokens)
- Conversational editing ("make emergency services more prominent") resolving to intent -> typed SitePatch
- Owner intent + design tokens
- THE INVARIANT: Direct UI edits, Visual UI edits, and Agent edits all produce the SAME kind of typed SitePatch, which flows: validate -> preview -> capability/policy -> apply -> event -> projection.

---

## 1. PUCK (puckeditor/puck, MIT)

Public sources: https://github.com/puckeditor/puck ; https://github.com/one-ie/claude/blob/HEAD/skills/puck/SKILL.md ; https://github.com/lindongy/supersubset/blob/HEAD/.github/skills/puck-integration/SKILL.md ; https://github.com/dimaportenko/shopify-next-cms/blob/HEAD/apps/docs/content/docs/puck-editor/index.mdx

Core mechanics observed:
- Page data is a typed JSON `Data` object: `{ content: [...], root: {...} }` with blocks ordered in arrays.
- A `config` maps block names to `{ fields, defaultProps, render, resolveData }`. Fields declare a property editor (text, image, custom); `render` is the canvas component; `resolveData` does async data resolution for live preview.
- `<Puck>` is the editor shell; `<Render config={config} data={data} />` renders the same Data headlessly (SSR-capable). Editor and renderer share the config, so what you edit is what renders.
- Controlled/uncontrolled modes: host app owns the Data and roundtrips it through adapters (`puckToCanonical` / `canonicalToPuck`), meaning Puck's JSON is treated as a *presentation-facing serialization*, not the canonical domain model.
- Shopify-next-cms pattern: editor chrome themed via override components; public pages render `<Render>` as a server component; storage is a JSON blob in a metaobject field; writes go through server actions with create/update/delete/publish.

| # | Pattern | Problem it solves better than us | Verdict | PING gap it fills | What to leave behind |
|---|---------|----------------------------------|---------|-------------------|----------------------|
| P1 | **Config = single registry entry per component: fields + defaultProps + render + resolveData.** Schema of editable props, defaults, preview render, and async data fetch live together in one registry record. | Gives one canonical definition of "what can this component be" that drives BOTH the property panel AND the renderer. No drift between editing surface and output. | **HARVEST** | Our component registry: each registered component needs fields-schema, defaults, renderer impl, and a data-resolution contract in one record. This is exactly our registry shape. | The React component framework itself. Harvest the *record shape* (fields/defaults/render/dataresolver), not Puck's `<Puck>` editor. |
| P2 | **Typed block-level Data with stable ordered array (`content: [...]`).** Reorder = array move. Hide = block flag/prop. | Reorder/hide/feature become trivial typed operations on an ordered list, no tree surgery. Patches are small, diffable, reviewable. | **HARVEST** | Visual editing primitives (reorder/hide/feature) map to array ops + prop toggles on block records. This is the grammar of our SitePatch move/set/hide ops. | Puck's full drag/drop engine (dnd-kit machinery). We take the data grammar, not their interaction engine. |
| P3 | **Field-driven property panels.** The fields declaration auto-generates the editing UI; adding a component prop automatically adds its editor affordance. | Eliminates the N x M problem of building a custom editor UI per component. Owner intent ("change tokens") edits flow through the same field system as everything else. | **HARVEST** | Owner-intent edits + token edits: if our fields are typed (enum color tokens, text, media), every editing surface (visual panel, conversational) enumerates the same editable surface from the schema. | Their specific field widget implementations. We define our own field types matched to trade-site needs (service list, phone CTA, hours). |
| P4 | **resolveData: async data resolution at edit/preview time, separate from the block schema.** | Live preview can hydrate real data (services, reviews) without the agent or owner typing it; the Data stays a clean spec, the fetch is a declared dependency. | **ADAPT** | Conversational editing + preview: "make emergency services more prominent" may need live data (service list). Declared data dependencies on registry entries keep the spec pure while preview hydrates. Adaptation: wire resolveData through our capability/policy layer (which external data sources are allowed per tenant) rather than arbitrary fetches. | Unbounded fetch. Data sources must be allowlisted capabilities, not free-form URLs. |
| P5 | **Adapter roundtrip: editor JSON <-> canonical domain schema (puckToCanonical / canonicalToPuck).** | Keeps the editor serialization thin while a richer canonical model (SEO, analytics, tenant data) lives elsewhere. Two models coexist without forking. | **ADAPT** | Our SiteSpec IR is the canonical model; Puck-style editor JSON is a *view serialization*. Adaptation: define one canonical->editor and editor->canonical transform, versioned, with lossless roundtrip tests; never let editor-only concerns (selection state, drag handles) leak into canonical IR. | Treating the editor blob AS the canonical record (what the Shopify CMS does). We keep canonical IR authoritative. |

What NOT to take from Puck: the React editor component itself (framework lock-in, heavy drag/drop runtime), React-only rendering (our renderer must be target-agnostic), and any notion that the editor's JSON blob is the system of record.

---

## 2. JSON-RENDER (vercel-labs/json-render, OSS)

Public sources: https://github.com/vercel-labs/json-render/blob/HEAD/skills/react/SKILL.md ; https://github.com/cicero-im/conejo-skills/blob/HEAD/skills/conejo-frontend/refs/json-render/json-render.md ; https://github.com/matrixy/orchestkit/blob/HEAD/src/skills/json-render-catalog/SKILL.md ; https://github.com/ossfork/json-render

Core mechanics observed:
- Three-layer split: **Catalog** (what the AI is allowed to emit: zod props schemas per component + action catalog, with descriptions) -> **Registry** (actual component implementations, type-checked against the catalog) -> **Renderer** (spec JSON -> component tree).
- The catalog doubles as the LLM's contract: `catalog.jsonSchema({strict:true})` is passed to structured-output APIs, constraining the model to valid specs. Guardrailed generation, not prompt hope.
- Flat spec: `{ root, elements: { id: { type, props, children: [ids], visible, repeat, watch, on, state } } }`. Flat = streaming-patch friendly (JSON Patch RFC 6902 over JSONL).
- Element keys: `visible` (conditional visibility rules: `$cond`, `$template`, `$computed`), `repeat` (list expansion), `watch` (bindings to external state), `on` (event -> action map), plus a `state` store with built-in actions (`setState`, `pushState`, `removeState`, `validateForm`).
- Multiple renderers from one spec (React, Vue, Svelte, React Native, Remotion).

| # | Pattern | Problem it solves better than us | Verdict | PING gap it fills | What to leave behind |
|---|---------|----------------------------------|---------|-------------------|----------------------|
| J1 | **Catalog-as-LLM-contract: zod props schemas + descriptions -> strict JSON schema handed to structured output.** | Makes the agent physically unable to emit an invalid component or prop; the registry is the enforcement point, not a system prompt. This is how "conversational editing" stays inside the typed world. | **HARVEST** | Conversational editing: our SiteSpec schema should be derivable as a strict generation schema so the agent can only emit valid SitePatches. This is the enforcement mechanism for the DIRECT/VISUAL/AGENT invariant: the agent's patch language is the same typed op set the visual editor emits. | The AI-specific SDK packaging. We take the *mechanic* (schema-derived generation contract), implement against our own registry. |
| J2 | **Flat element map (id -> element) instead of nested tree.** Streaming-friendly, patch-friendly (RFC 6902), reorder = rewriting children id lists, each element independently addressable. | Patches are small and addressable by stable id; visual drag-drop and agent edits target the same ids; ordering is data, not structure. Enables streaming generation and minimal diffs. | **HARVEST** | SitePatch design: our IR should be a flat id->node map with ordered children references. Reorder/hide/move are all id-keyed ops. This also makes event sourcing and projection replay clean (each event names element ids). | Their YAML mode token-optimization tricks; keep one canonical serialization. |
| J3 | **`visible` as a first-class declarative rule on every element ($cond/$template/$computed).** | Hiding/showing is data, not code: "feature emergency services" can be a visibility rule or a priority prop, applied by policy, reversible, auditable. Same rule works in visual UI (toggle) and agent (set rule). | **HARVEST** | Visual editing "hide/feature" primitives + conversational "make X more prominent": visibility/prominence as declarative per-element fields, validated by schema, previewed before apply. | Arbitrary expression languages. Constrain conditions to a small typed predicate set (device, segment, time, manual toggle) vetted by policy. |
| J4 | **Actions catalog separate from components: named actions with param schemas, `on: { event: { action, params } }`, externally controlled state.** | Interactivity (forms, CTAs, state) is declared in the spec with typed params; the host app injects action implementations (emit). Components stay pure. Capability gating applies at the action layer. | **ADAPT** | Our pipeline's capability/policy stage: actions in a SitePatch (e.g. "add quote form") must resolve against tenant capabilities. Adaptation: every action in the spec references a capability id; the policy stage approves/denies before apply. json-render assumes trusted host; we need the capability check they skip. | Their built-in action roster (setState etc.) as-is; our action catalog is trade-site shaped (call, quote-request, schedule). |
| J5 | **Registry type-checked against catalog (`defineRegistry(catalog, {components})`).** | Implementation cannot drift from schema: if the catalog says Button takes `label`, the impl signature is checked. Schema-first, code follows. | **HARVEST** | Component registry integrity: our registry should have a compile/check step proving every registered implementation satisfies its declared props schema. Deterministic renderer guarantee starts here. | The specific zod/TS toolchain; the check can be JSON-Schema-based in our stack. |

What NOT to take from json-render: unbounded dynamic expressions in specs (injection surface; constrain to typed predicates), the generative-UI product framing (we are a site compiler, not a chatbot widget renderer), and multi-framework renderer sprawl (we need one deterministic renderer per target we actually serve).

---

## 3. OPENPAGE (cganh/openpage, MIT)

Public sources: https://github.com/cganh/openpage (README, full text fetched)

Core mechanics observed:
- **JSON as the single source of truth.** Site = one typed JSON document: `{ name, theme, blocks: [{ id, type, variant, props }] }`. Visual editor, AI endpoint (`POST /api/generate`), and renderer all read/write the same JSON. "Every mutation, whether from a human dragging a block or an agent calling the API, produces the same structured, diffable output."
- Block model: 19 block types x 42 layout **variants**; each block has typed TS schema, multiple visual variants, automatic theme integration. Variant is a first-class field on the block, separate from type and props.
- Theme as data: `{ bg0, text0, accent, fontSans, fontDisplay, radius }` -> CSS custom properties; every block adapts to the active theme. 10 presets; custom themes override a subset.
- State: Zustand + Immer with undo/redo. One-click static HTML export (self-contained, no runtime). Diffable/version-controllable JSON; "No hallucinated imports, no merge conflicts, no broken builds."

| # | Pattern | Problem it solves better than us | Verdict | PING gap it fills | What to leave behind |
|---|---------|----------------------------------|---------|-------------------|----------------------|
| O1 | **One typed JSON document as the single source of truth shared by visual editor, agent API, and renderer.** | This is the closest public articulation of our invariant: three edit surfaces, one patch/spec language. It proves the architecture is buildable and names the failure modes it kills (hallucinated imports, unmergeable diffs, proprietary lock-in). | **HARVEST** | Directly validates our invariant. Adopt the discipline: every edit surface serializes to the same typed SitePatch against the same SiteSpec schema; no surface gets a private mutation path. | Their flat marketing-site-only block taxonomy. Our block set is trade-site shaped (services, reviews, service area, emergency banner). |
| O2 | **`variant` as a first-class block field (type + variant + props).** | "Make emergency services more prominent" resolves to changing a variant (banner -> ribbon, hero -> high-impact) without touching props or structure. Variants are enumerable, previewable, and agent-emittable as a single enum change. | **HARVEST** | Conversational editing vocabulary: prominence/feature/hide map to variant swaps and visibility fields, not freeform redesign. Our SitePatch should have a `setVariant` op. Also feeds A/B and seasonal theming. | Hardcoded 42-variant sprawl. Our variants are curated per component with a small, tested set. |
| O3 | **Theme as typed data -> CSS custom properties; components never hardcode colors.** | Token changes ("make it feel more premium") are one theme-object edit propagating through every block via the cascade. Owner-intent token editing becomes a single typed op on the theme record. | **HARVEST** | Design tokens: our SiteSpec needs a first-class `theme` section (colors, fonts, radius, spacing scale) with components referencing tokens only. This is the mechanism for conversational token edits and safe re-theming. | Their specific token names/shades. We define our own token schema (and dark-mode behavior) from our design system. |
| O4 | **Immer-backed state with undo/redo; every edit is a discrete, reversible mutation.** | Preview-before-apply and rollback become trivial: a SitePatch is applied to a draft copy, previewed, then committed or discarded. Matches our validate -> preview -> apply pipeline exactly. | **ADAPT** | Our pipeline's preview stage: apply patch to a draft SiteSpec, render preview, owner approves, then commit as an event. Adaptation: draft/preview must be explicit pipeline stages with capability/policy gating, not just client-side undo. Undo is necessary but not sufficient; we need the event-sourced history. | Client-only undo as the whole story. We keep event log as the durable history. |
| O5 | **Static HTML export: renderer can compile to dependency-free output.** | Proves the renderer can be a pure function spec -> static artifact. Deterministic renderer = same spec bytes -> same output bytes. This is our falsifiability hook for "did the site actually change." | **ADAPT** | Deterministic renderer: our renderer should be a pure function of (SiteSpec, registry version, theme) with byte-stable output, enabling served-bytes verification (bind source/build/serve per the 2026-09-27 rule). Adaptation: pin registry version in the spec; output hash recorded on the apply event. | CDN Tailwind at runtime in export. Our served output must be self-contained and version-pinned. |

What NOT to take from OpenPage: Gemini-coupled generation endpoint (our agent layer is our own), the marketing-site block set, and the "export and walk away" model (we need ongoing event-sourced state, not one-shot files).

---

## 4. PAYLOAD CMS

Public sources: https://github.com/terminalskills/skills/blob/HEAD/skills/payload-cms/SKILL.md ; https://github.com/excelsior-creative/brandon-johnson-dev/blob/HEAD/.cursor/skills/payload-cms-patterns/SKILL.md ; https://github.com/keleorange/rz-www/blob/HEAD/CLAUDE.md ; https://github.com/inugamidev/ultrathink-oss/blob/HEAD/.claude/skills/cms-kit/SKILL.md

Core mechanics observed:
- **Code-first schema**: collections/fields defined in TypeScript; the config auto-generates the admin panel, REST/GraphQL APIs, and TypeScript types (`payload generate:types`). One schema definition drives editing UI, API, and types.
- **Blocks field type**: pages compose from predefined block types (`{ name: 'layout', type: 'blocks', blocks: [HeroBlock, ...] }`); each block = config (schema) + React render component. Standard block library pattern (Hero/Content/CTA/Media/Archive/Banner/Code/Form).
- **Versions/drafts**: `versions: { drafts: true }` gives draft/published states + full revision history; `_status` filters published vs draft; autosave + live preview.
- **Reusable fields as functions**: DRY field groups (link field with type/url/reference/newTab/appearance; SEO group) composed via functions and deep-merge overrides.
- **Relationships** over manual ID references: typed relations with auto-resolution, depth control, filterOptions.
- **Access control as functions** at collection/field/operation level (`isAdmin`, `publishedOnly`, `authenticatedOrPublished`); hooks (`beforeChange`/`afterChange`) for validation, revalidation, side effects. Globals as singletons for site settings/nav/footer.
- Local API with `overrideAccess: false` discipline: internal calls must explicitly opt into access enforcement.

| # | Pattern | Problem it solves better than us | Verdict | PING gap it fills | What to leave behind |
|---|---------|----------------------------------|---------|-------------------|----------------------|
| Y1 | **One schema definition generates the admin UI, the API, and the types.** | Kills the three-way drift between what editors can set, what the API accepts, and what the renderer expects. Schema is the single authority. | **HARVEST** | Our SiteSpec schema must be the single authority that generates/constrains: the visual property panel, the agent's patch schema, and the renderer's expectations. One schema, three consumers, zero drift. This is the enforcement side of our invariant. | The Payload framework and its Next.js coupling. Take the *single-schema-drives-all-surfaces* discipline, not the CMS. |
| Y2 | **Versions with draft/published states and full revision history (`_status`, autosave, preview URLs).** | Draft -> preview -> publish is the content-safe editing lifecycle; every published state is recoverable; preview shows drafts without leaking them publicly. | **HARVEST** | Our validate -> preview -> capability/policy -> apply -> event -> projection pipeline IS a draft/publish lifecycle. Payload proves the pattern at scale: SitePatch applies to a draft SiteSpec, preview renders the draft, policy gates, publish commits the event. Harvest the draft/published split and the revision history as our event log projection. | The CMS admin UI, Mongo/Postgres storage opinions, and plugin bloat. We need draft/publish semantics, not a CMS product. |
| Y3 | **Reusable field groups as composable functions (link field, SEO group) with deep-merge overrides.** | Cross-component consistency (every CTA link behaves the same; every page has the same SEO shape) without copy-paste schema. Owner-intent edits ("update the phone number everywhere") hit one field definition. | **HARVEST** | Component registry: define shared field fragments (ContactLink, ServiceArea, BusinessHours, SEO) once, compose into block schemas. Global tokens (phone, address) live in a singleton settings record (see Y6), referenced not duplicated. | Their deepMerge util specifics; the mechanic is schema composition. |
| Y4 | **Typed relationships with auto-resolution and depth control instead of raw ID references.** | Blocks referencing shared records (services, testimonials, locations) stay consistent; renaming a service updates everywhere; depth control prevents over-fetching. | **ADAPT** | SiteSpec elements referencing shared business records (services list, reviews) should be typed references resolved at render, not duplicated content. Adaptation: references resolve against tenant-scoped PING objects with capability-gated read; the renderer receives resolved values, the spec stores only the reference + fallback. | CMS-style relational DB modeling. Our references point at PING object graph ids, resolved by projection. |
| Y5 | **Access control as composable functions at collection/field/operation granularity; hooks for validation and side effects (afterChange -> revalidate).** | Policy is code, attached to the schema, evaluated on every write path including internal APIs. afterChange hooks make publish trigger projection updates deterministically. | **ADAPT** | Our capability/policy stage: SitePatch ops evaluated against per-tenant capabilities (who may publish, which actions are allowed, which external data may be referenced). Adaptation: policy functions attach to the SiteSpec schema/registry; the apply step runs them; an afterApply hook emits the event and triggers projection rebuild. This is exactly our pipeline's policy->event->projection segment. | Payload's role/user model. Our authority model is tenant + owner-approval + capability, not CMS roles. |
| Y6 | **Globals as singletons (site settings, navigation, footer).** | Site-wide facts (business name, phone, hours, nav) edited once, reflected everywhere; no per-page duplication drift. | **HARVEST** | Owner intent core: a singleton `site` record in SiteSpec (identity, contact, hours, service area, tokens) that blocks reference. "Change the phone number" = one op on the singleton, projected everywhere. Conversational edits overwhelmingly target the singleton. | CMS globals UI. We need the singleton record pattern in the IR. |

What NOT to take from Payload: the entire CMS product (admin panel, auth, plugins, storage adapters, GraphQL/REST surface) — that is CMS bloat for our needs. We harvest schema-driven UI/API/types discipline, draft/publish/versioning, reusable fields, relationships, and policy hooks. No Payload dependency, no framework adoption.

---

## 5. SHADCN / TAILARK BLOCK REGISTRIES

Public sources: https://github.com/nickconstantinou/openclaw-setup/blob/HEAD/skills/general-agent/tailark/SKILL.md ; https://github.com/tailark/blocks (via skill refs) ; https://github.com/aladicf/better-react-web-ui/blob/HEAD/skills/frontend-design/reference/component-and-block-strategy.md ; https://github.com/natej45/ncs-astro-sanity-starter/blob/HEAD/docs/agent/component-sources.md

Core mechanics observed:
- **Registry distribution, owned code**: `npx shadcn add @tailark/hero-section-1` fetches a registry JSON (`https://tailark.com/r/{name}.json`) and lands the component as editable source in your repo. No runtime dependency, no CDN import. You own the code.
- shadcn's `components.json` supports named registries; blocks are namespaced (`@tailark/...`, `@magicui/...`), versioned JSON descriptors.
- Tailark: 15 block categories (hero, logo-cloud, features, stats, team, testimonials, pricing, FAQs, CTA, footer, auth), 100+ variants, built on shadcn/Radix primitives + Tailwind, dark-mode support, keyboard-accessible, MIT.
- Component-source pattern (ncs-astro-sanity-starter): multiple registries pre-wired; **semantic token system** where `apply-brand` rewrites `:root`/`.dark` tokens in `globals.css` and the cascade propagates to every token-referencing component. Re-theming without touching components.
- Strategy guidance: block kits for recognizable marketing sections where speed to a credible first pass matters; custom-build app-specific UI.

| # | Pattern | Problem it solves better than us | Verdict | PING gap it fills | What to leave behind |
|---|---------|----------------------------------|---------|-------------------|----------------------|
| S1 | **Registry items as versioned JSON descriptors resolving to owned source code, not runtime dependencies.** | Components enter the system as vendored, pinned, auditable code. No supply-chain runtime risk, no version drift at serve time, deterministic builds. Registry JSON is the distribution contract. | **HARVEST** | Component registry distribution: our registry entries should be versioned descriptors (`{name, version, schema, source}`) pinned into the tenant's build; the renderer only ever runs pinned component code. Registry version pinned in SiteSpec (feeds O5's byte-stable output). | The shadcn CLI and React/Tailwind specifics. Take the descriptor + vendoring discipline. |
| S2 | **Blocks namespaced by category with many variants (hero-1..13, pricing-1, faq-1...).** | Gives the agent and the visual editor an enumerable menu of credible starting points; variant selection is a data choice, not a design task. Speed to credible first pass. | **ADAPT** | Our block library: curated, trade-site-shaped block catalog (hero variants, service-grid, review-carousel, emergency-banner, service-area-map, quote-form) each with a small variant set. Adaptation: variants enumerated in the registry with preview metadata; agent picks by intent match, owner picks visually. Far fewer, higher-quality, trade-specific. | Marketing-SaaS aesthetics and variant sprawl (13 heroes). Curation is the product decision. |
| S3 | **Semantic token system: brand application rewrites `:root` tokens; components reference tokens, never raw values.** | Re-theming (and per-tenant branding) without editing components. One token edit, whole site follows. This is the runtime half of O3. | **HARVEST** | Design tokens runtime: our theme record compiles to CSS custom properties; every registered component references tokens only (enforced by registry check, see J5). This makes conversational token edits safe and total. | Their specific token names; we define our own scale. |
| S4 | **Built on accessible primitives (Radix) with keyboard support and dark mode baked in.** | Accessibility and interaction correctness come from the primitive layer, not from each block author remembering. Quality floor is structural. | **ADAPT** | Component quality bar: our registry should define a small set of vetted primitives (button, accordion, dialog, form fields) that blocks compose, with a11y requirements in the registry check. Adaptation: primitives chosen for our renderer target(s), not necessarily Radix/React. | React/Radix lock-in. The mechanic is "blocks compose from vetted primitives," not the specific library. |
| S5 | **Strategy split: block kits for recognizable sections, custom builds for domain-specific UI.** | Stops the registry from bloating into a dashboard framework. Recognizable sections (hero/pricing/FAQ/footer) are commodities; domain UI (service scheduler, quote flow) is custom. | **HARVEST** | Registry scoping discipline: our registry covers trade-site sections + trade primitives (service cards, review embeds, tap-to-call); anything business-logic-specific is a declared action/capability (J4), not a component. Prevents registry sprawl. | The SaaS-marketing category list. Our categories are trade-site categories. |

What NOT to take from shadcn/Tailark: React + Tailwind framework lock-in (our renderer target is our own decision), the CLI tooling, arbitrary CSS emission from AI (all styling flows through tokens + Tailwind-scale utilities, never freeform style strings in props), and variant sprawl as a substitute for curation.

---

## CROSS-SOURCE SYNTHESIS: THE HARVESTED ARCHITECTURE

The five sources converge on one shape, which maps cleanly onto our target:

```
SiteSpec IR (canonical, typed JSON)
  |- site (singleton: identity, contact, hours, service area, SEO)      [Y6]
  |- theme (design tokens -> CSS custom properties)                     [O3, S3]
  |- elements: flat id -> { type, variant, props, children:[ids],
  |              visible: <typed predicate>, refs: <typed PING refs> }  [J2, J3, Y4, O2]
  |- actions catalog (named, param-schemed, capability-gated)           [J4]
  |- registryVersion pin                                               [S1, O5]

Component Registry (versioned descriptors -> owned impls)
  |- per component: fields schema, defaultProps, render impl,
  |                 resolveData contract, variant enum, preview meta   [P1, P3, P4, S2]
  |- shared field fragments (ContactLink, Hours, ServiceArea, SEO)     [Y3]
  |- vetted primitives (button, accordion, form) with a11y bar         [S4]
  |- registry check: impl satisfies schema; tokens-only styling        [J5, S3]

SitePatch (the ONLY mutation language; all three surfaces emit it)
  |- ops: add/move/remove/setProps/setVariant/setVisible/setTheme/
  |        setSite/singleton edits  (id-addressed, flat map)           [P2, J2, O2]
  |- derived FROM the SiteSpec schema as a strict generation contract
  |  for the agent (catalog-as-LLM-contract)                           [J1, Y1]
  |- pipeline: validate -> preview(draft) -> capability/policy ->
  |            apply -> event -> projection                            [O4, Y2, Y5]
```

---

## TOP 8 HARVESTABLE PATTERNS (for the convergence matrix)

1. **J1 — Catalog-as-LLM-contract (json-render).** VERDICT: HARVEST. Derive the agent's patch/generation schema strictly from the SiteSpec + registry schemas (zod/JSON-Schema -> structured output). The agent becomes physically unable to emit an invalid op, component, or prop. This is the enforcement mechanism for the DIRECT/VISUAL/AGENT invariant.
2. **O1 — One typed JSON doc, three surfaces (OpenPage).** VERDICT: HARVEST. Visual editor, agent API, and renderer all read/write the same typed SiteSpec/SitePatch. No surface gets a private mutation path. Public proof the invariant architecture is buildable.
3. **J2 — Flat id->element map (json-render).** VERDICT: HARVEST. Reorder/hide/move are id-addressed ops on ordered children lists; patches are minimal, diffable, streamable (RFC 6902-style), and event-source cleanly.
4. **P1 — Registry record = fields + defaultProps + render + resolveData (Puck).** VERDICT: HARVEST. One canonical record per component driving the property panel, defaults, renderer, and declared data dependencies. No drift between edit surface and output.
5. **O2 + O3 — Variant as first-class field; theme as typed token data (OpenPage).** VERDICT: HARVEST. "Make emergency services more prominent" = setVariant / setVisible / setTheme ops. Prominence and branding become enumerable, previewable, policy-gated data changes, not redesigns.
6. **Y2 + Y5 — Draft/publish lifecycle with revision history; policy as schema-attached functions + afterApply hooks (Payload).** VERDICT: HARVEST/ADAPT. Our validate -> preview -> capability/policy -> apply -> event -> projection pipeline is this pattern. Policy functions attach to schema/registry; afterApply emits the event and triggers projection rebuild. Adapt the authority model (tenant + owner approval + capability, not CMS roles).
7. **Y3 + Y6 — Reusable field fragments; site singleton (Payload).** VERDICT: HARVEST. Shared fragments (ContactLink, Hours, SEO) composed into block schemas; a singleton `site` record (identity, phone, hours, service area) that blocks reference. "Change the phone number" = one op, projected everywhere. Conversational edits overwhelmingly target the singleton.
8. **S1 + S3 — Registry descriptors pin owned, vendored component code; semantic tokens via CSS cascade (shadcn/Tailark).** VERDICT: HARVEST. Components enter as versioned, pinned, auditable source (registry version pinned in SiteSpec for byte-stable deterministic output); all styling flows through tokens, never raw values or freeform CSS from the agent.

---

## SHARPEST SITESPEC GAP

**Our SiteSpec IR is missing a first-class, typed *intent-resolution layer* between conversational language and patch ops — specifically, it lacks `variant` + `visible`-as-declarative-rule + the `site` singleton as addressable patch targets.**

Every source converges on the same lesson: the winning move is NOT making the agent smarter at emitting JSON. It is making the IR *coarse enough* that common intents collapse to single typed ops:

- OpenPage proves `variant` turns "make X more prominent" into one enum change.
- json-render proves `visible` as a declarative rule turns feature/hide into data, not redesign.
- Payload proves the `site` singleton turns "update our hours/phone" into one op instead of N block edits.

Without these three fields as first-class, typed, patch-addressable targets, conversational editing degrades into the agent rewriting whole block trees — unreviewable, undiffable, and unprotectable by policy. With them, the agent's output vocabulary shrinks to: `setVariant`, `setVisible`, `setTheme`, `setSite`, `move`, `setProps` — each individually validatable, previewable, capability-gated, and event-logged. **The gap is not in the render path; it is in the op vocabulary.** The IR must be designed backward from the patch ops we want the agent (and the visual editor, and direct UI) to be *allowed* to emit, with J1's catalog-as-contract as the enforcement.

Secondary gap: **registry version pinning in the spec** (S1/O5). Without a `registryVersion` field, "same spec, same output" is unprovable across registry updates, and the source/build/serve binding rule (2026-09-27) cannot be satisfied for sites.

---

## WHAT NOT TO TAKE (explicit leave-behinds)

- **Framework lock-in:** Puck's React editor, shadcn/Radix/Tailwind specifics, Payload's Next.js coupling. Harvest record shapes and disciplines, never the frameworks.
- **CMS bloat:** Payload's admin panel, auth, plugins, storage adapters, REST/GraphQL surface. We take schema-driven discipline + draft/publish + policy hooks, not the product.
- **Arbitrary CSS emission:** No freeform style strings or raw color values in props from any surface, especially the agent. All styling through the typed token record (O3/S3), enforced by the registry check (J5).
- **Unbounded expressions in specs:** json-render's `$template`/`$computed` power is an injection and audit surface. Constrain `visible` predicates to a small typed set (segment, device, schedule, manual).
- **Editor blob as system of record:** Puck/Shopify pattern of persisting the editor JSON as the canonical row. Our canonical record is the SiteSpec IR; editor serializations are views with a versioned roundtrip transform (P5).
- **Variant sprawl as curation:** Tailark's 13 heroes. Our registry is small, trade-site-shaped, and curated; variants are enumerable and tested.
- **Generative-UI product framing:** json-render optimizes for chatbot widget rendering; we are a site compiler with draft/publish governance. Different risk profile, different pipeline.
- **Client-only undo as history:** OpenPage's Immer undo is necessary for editing UX but insufficient for our event-sourced, replayable history. The event log is the durable truth.

---

*Lane C complete. Read-only; no code written, no external contact. Public sources only. Report: ~/workspace/ping-24h/lanes/laneC-builder/report.md*
