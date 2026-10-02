# Track A: Visual Editors and Component Frameworks Harvest

Program: WEBSITE BUILDER HARVEST. Owner order 2026-09-28. Lane: ECOSYSTEM HARVEST.
Scope: web research only. No code copied into any FYD tree. No pig access.
All license claims verified against repo READMEs, published package LICENSE files, or npm metadata on 2026-09-28.

---

## 1. Puck (puckeditor/puck, packages @puckeditor/core)

PRIMITIVE: MIT React visual-editor component. You register YOUR components with typed fields; Puck provides canvas, drag/drop, inline editing, property panel. Data stays with the caller. The `<Render>` component renders a stored payload against the same config. Not a CMS, not a site generator: an editor widget you embed.

LICENSE: MIT (repo README: "MIT © Measured Corporation Ltd"). Puck Cloud (AI copilot, versioned page datastore, multiplayer) is a separate commercial SaaS; the editor core is clean MIT.

MATURITY: Active. Renamed from @measured/puck to @puckeditor/core. v0.23.x line as of Aug 2026; 12,600+ GitHub stars; 400,000+ monthly downloads; React 19 official peer dep (^18 || ^19); Next.js App Router recipes. Community production use confirmed (white-label products, no-code tooling, automated publishing workflows). Known tradeoff: plugin API is experimental and subject to breaking changes.

DEPENDENCY COST: React-only (no Next.js required). Client-heavy editor; `<Render>` is light. No backend required; you own storage. RSC support is opt-in. Rich text field ships on TipTap.

DATA MODEL: Plain JSON `Data = { content: ComponentData[], root: { props }, zones?: Record<string, ComponentData[]> }` where each item is `{ type, props }` and nesting runs through slot fields. Minimal, flat, diffable, serializable. This is the whole payload: `onPublish(data)` hands it to you and you persist it yourself.

MUTATION MODEL: Uncontrolled by default; `<Puck data={...} onChange={fn} onPublish={fn}>`. All structural edits (insert, move, duplicate, delete, prop edit) go through Puck's internal Redux store and surface as a new `Data` snapshot on change. Per-component `resolveData({props}, {changed})` derives props asynchronously (e.g. external data); `readOnly` prop locking lets you freeze fields. Permissions API gates delete/drag/duplicate per instance. External mutation path exists: you can feed new `data` and `initialHistory` from outside, so an AI or API can author `Data` without touching the canvas.

UNDO MODEL: Built-in undo/redo history stack over `Data` snapshots, exposed via `usePuck` history API plus `initialHistory={{histories, index, appendData}}` to seed or replay. resolveData updates append history entries. Full history is importable/exportable as data, which is the hook for FYD-style preview/approval replay.

PREVIEW MODEL: Editor is WYSIWYG on the live components themselves; viewports render the canvas in a same-origin iframe at device widths (style isolation configurable via `syncHostStyles`). Composition and UI overrides let you restyle every editor surface.

COMPONENT MODEL: Config registers components: `{ fields: { name: { type } }, render: (props) => JSX, defaultProps, resolveData }`. Components are yours; Puck never wraps rendering at publish time. `generateComponent`/`generateJSX` emit JSX and import statements for code output.

THEME MODEL: No built-in theme engine. Themes live in your components (design-token-driven styling is up to you). Root-level fields carry global props. Puck Cloud markets brand-constrained generation but that is the commercial tier.

AGENT MODEL: Programmatic drive is native: construct or patch the `Data` JSON and pass it in, or use Puck AI (commercial, headless API constrained to your component catalog). Any agent that can emit `{content, root, zones}` can drive the editor, preview, and renderer with zero browser involvement.

COLLABORATION MODEL: None in core. Multiplayer is a Puck Cloud commercial feature.

EXPORT MODEL: The JSON `Data` IS the export. Rendering via `<Render>`; code export via `generateComponent`/`generateJSX`.

WHAT FYD CAN HARVEST: (1) The `{ content, root, zones }` schema is a proven minimal page-composition IR; map SiteSpec to it and back in the spike adapter. (2) The ownership split: editor owns canvas mechanics, application owns components, data, validation, persistence, undo, publish gating. Mirror exactly this boundary in the adapter contract (a third-party ADR, veskify, already documents this same split: "Puck Data is transient adapter data, never a second persisted page tree"; publish callback is a draft-handoff event only). (3) `initialHistory` seeding as the mechanism for SitePatch preview: render a proposed patch as a Puck history entry before approval. (4) `resolveData`/`readOnly` as the field-guardrail pattern for protected fields.

SPIKE VERDICT: Puck SURVIVES. No license blocker (MIT). No architecture blocker (data owned by caller, JSON payload, external authorship supported). No data-model blocker (typed JSON, diffable). The only hard edges: plugin API is experimental (do not build on it), React lock-in (fine for FYD's React components), and Puck Cloud AI/collab are commercial (exclude; FYD owns those layers). Do not hand-build drag/drop until this adapter is falsified in a spike.

---

## 2. Webstudio (webstudio-is/webstudio)

PRIMITIVE: Full visual website builder (the "open-source Webflow"): canvas editor, CSS engine, component SDK, publishing pipeline. Positioned explicitly as "professional builder for Agents and Humans."

LICENSE: Core is AGPL-3.0-or-later (open core model). The `sdk-components-animation` package is proprietary (requires accepting the Webstudio Inc. EULA). Self-hosting the builder is allowed but not recommended by the team for production.

MATURITY: Very active. ~8.9K GitHub stars, ~230K projects, ~145K users. Continuous development; recent work includes MDX content-block storage and MCP tooling. Production users exist at scale.

DEPENDENCY COST: Heavy if adopted whole. Builder is a Remix app with its own backend; projects publish as Remix apps or static exports. Full CSS exposed (no styling abstraction to fight), Radix UI primitives for components. Self-hosting means operating their stack. As a dependency, it is a platform, not a library.

DATA MODEL: Native project model: `instances` (id-keyed element tree), `props` (typed per instance), `styles` (CSS engine style sources), plus pages, breakpoints, data variables, assets, design tokens. Project data addressable locally at `.webstudio/data.json`. Versioned builds (`buildId` + `version`).

MUTATION MODEL: Everything goes through `build.patch`: a universal mutation taking Immer patches (JSON-Patch-like add/replace/remove) grouped by container (`instances`, `props`, `styles`, ...). Optimistic-concurrency via version check (`version_mismatched` -> re-fetch and retry). This is the closest existing analog to FYD's typed SitePatch pipeline.

UNDO MODEL: Builder global Undo/Redo covers project transactions only (text-editor-local undo is separate and session-scoped; complete file versions are not retained in global history).

PREVIEW MODEL: Built-in preview mode, plus screenshot capture and screenshot diffing through the MCP/CLI surface.

COMPONENT MODEL: Registered component catalog (Radix-based SDK components); styled JSX fragments insertable; elements support move, reparent, wrap/unwrap, convert, retag.

THEME MODEL: Design tokens + style sources + CSS variables, all first-class and agent-editable. This is the strongest token model in the survey.

AGENT MODEL: Best-in-class. Official MCP server (70+ tools) plus CLI (`npx webstudio mcp single-op-call`): agents inspect, patch, insert components, manage tokens/styles, publish, screenshot-diff, all against a known build version with share-link scoping. Human and agent edit the same native project model.

COLLABORATION MODEL: Multi-user via hosted platform accounts and share-link permission scoping. Real-time co-editing is not the headline; agent + human turn-taking through the same model is.

EXPORT MODEL: Publish to Webstudio Cloud, self-hosted Remix app, or static site export. Code output is real React + CSS, not a proprietary runtime.

WHAT FYD CAN HARVEST: (1) The `build.patch` + Immer-patches-grouped-by-container pattern as the reference implementation of FYD's own VALIDATE -> PREVIEW -> APPROVAL -> APPLY mutation contract, including the `version_mismatched` retry semantics. (2) The design-token/style-source/CSS-variable layering as the reference for FYD theme modeling. (3) The MCP tool taxonomy (inspect, audit, precise patch against known version, screenshot-diff) as the shape of FYD's own agent surface. Do NOT adopt: the builder, the AGPL license, the hosting stack.

LICENSE LANDMINE: AGPL-3.0 on the core. Any FYD use of Webstudio code, or of its data-model code paths, in a hosted commercial product triggers copyleft obligations. Harvest patterns only, never code, and keep the conceptual lineage documented.

---

## 3. TinaCMS (tinacms/tinacms)

PRIMITIVE: Git-backed headless CMS with visual (contextual) editing. Schema defined in code (`tina/config.ts`); auto-generated type-safe GraphQL API; content stored as Markdown/MDX/JSON in your repo. The database is an ephemeral cache; Git is the source of truth.

LICENSE: Apache-2.0 (official repo LICENSE). Note: some third-party skill frontmatter claims MIT; the repo itself is Apache-2.0. Permissive either way; treat as Apache-2.0.

MATURITY: Active. tinacms 2.10.x / CLI 1.12.x (late 2025); React 19 support; Next.js App Router first-class, Vite/React/Astro workable; visual editing limited to React. Self-hostable (Cloudflare Workers, Vercel/Netlify functions, AWS Lambda) or TinaCloud managed.

DEPENDENCY COST: Backend required (TinaNodeBackend: GraphQL API, auth, DB adapter, Git provider). Framework-leaning: Next.js best, React-only visual editing. Content lives in your Git repo, so data ownership is total.

DATA MODEL: Collections + fields schema; content documents (MD/MDX/JSON); GraphQL query layer generated from schema.

MUTATION MODEL: Admin UI at `/admin` edits through the GraphQL layer; writes commit to Git. `useTina` hook binds components to queries for live visual editing. No typed-patch API comparable to SitePatch; mutations are CMS document writes.

UNDO MODEL: Git history. Versioning via commits/branches; no in-editor transaction undo beyond text editing.

PREVIEW MODEL: Live preview of changes as you type (visual editing bound to the real page). Framework preview environments as usual.

COMPONENT MODEL: Schema-driven: templates and field types render form controls; page rendering is your own code. Not a component canvas; it is a content CMS with on-page editing.

THEME MODEL: None. Theming is your site's code.

AGENT MODEL: Agents can edit the same MD/JSON content files via Git, or call the GraphQL API. No official agent/MCP surface comparable to Webstudio's.

COLLABORATION MODEL: No real-time collaboration. Editing workflows and roles exist; concurrency is Git-mediated.

EXPORT MODEL: Content is already files in your repo. No lock-in.

WHAT FYD CAN HARVEST: (1) The schema-in-code (`tina/config.ts`) pattern: content model as typed code that generates both editing UI and query API. Direct precedent for SiteSpec-adjacent schema authoring. (2) The "Git is the source of truth, DB is an ephemeral cache" discipline as a model for FYD's own persistence posture (deterministic state rebuildable from canonical records). (3) `useTina` live-binding as the simplest viable on-page editing loop for FYD's own content fields. Not a fit for structural page building; TinaCMS is content-first, canvas-never.

---

## 4. Easyblocks (swellstores/easyblocks, packages @swell/easyblocks-core, @swell/easyblocks-editor)

PRIMITIVE: "React toolkit for building completely customised visual page builders." A white-label editor framework: No-Code Components (React component + visual-editing definition) with drag/drop, nested selection, inline rich text, responsive styling fields, design tokens, templates, dynamic data, localization. Deliberately NOT HTML/CSS based: constrained editing over typed component schemas.

LICENSE: LANDMINE. The GitHub repo presents as "open-source," but the published npm packages ship a proprietary LICENSE.md: "Copyright (C) Shopstory Sp. z o.o, All Rights Reserved. Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential." Verified 2026-09-28 from the published @swell/easyblocks-editor@1.0.25 tarball LICENSE.md. Do not depend on the npm packages in any FYD tree without legal review.

MATURITY: STALE. Last CHANGELOG entries May 2025 (v1.0.24); docs last updated ~497 days ago; styling engine still on Stitches, which the docs themselves call outdated and unmaintained. Shopstory (the commercial company behind it) appears dormant. Do not build on this.

DEPENDENCY COST: React; SSR-friendly (Next.js/Remix) and can render to pure HTML/CSS. Editor is heavy; server-side build phase (`buildDocument`) prepares a `renderableDocument`.

DATA MODEL: Easyblocks document (page tree of No-Code Component instances with values, locales, external-data references). Build phase compiles it to a `renderableDocument` optimized for rendering.

MUTATION MODEL: Editor framework handles drag/drop, selections, inline editing; mutations flow through the framework's internal history and document store. `Config` defines components, tokens, locales, backend (`EasyblocksBackend` with access token).

UNDO MODEL: Built-in history management in the editor framework.

PREVIEW MODEL: Live canvas editing; SSR rendering of `renderableDocument` via the `<Easyblocks>` component.

COMPONENT MODEL: No-Code Component = React component + Definition (id, label, type, schema of props incl. `component` and `component-collection` slots with `accepts` constraints, `styles()` function producing Stitches styled subcomponents, `editing()` overrides). Closest conceptual match to Puck's config, with more elaborate constraint modeling (`accepts`, required slots, per-component editing overrides).

THEME MODEL: Design tokens first-class in `Config` (colors, fonts, space), referenced by schema fields.

AGENT MODEL: None built-in. Agents could author Easyblocks documents via the backend API, but there is no official agent surface.

COLLABORATION MODEL: None documented.

EXPORT MODEL: `buildDocument` -> renderable document -> React or pure HTML/CSS output.

WHAT FYD CAN HARVEST: (1) The No-Code Component Definition pattern: schema + `accepts` slot constraints + per-component editing overrides is the richest component-contract model in the survey; inform FYD's component catalog typing. (2) The `buildDocument` compile phase (document -> renderableDocument) as a precedent for FYD's own compile/projection step between SiteSpec and renderer. (3) The explicit rejection of HTML/CSS-first editing in favor of constrained component schemas validates FYD's SiteSpec approach. Do NOT take: the dependency (proprietary license + stale maintenance).

---

## 5. BlockNote (TypeCellOS/BlockNote, packages @blocknote/core, @blocknote/react, ...)

PRIMITIVE: Block-based rich-text editor for React (Notion-style): slash menu, drag handles, block type switching, formatting toolbar. Built on TipTap on ProseMirror. This is a document/text editor, not a page builder, but its architecture decisions are the harvest target.

LICENSE: SPLIT. Core packages (@blocknote/core, @blocknote/react, @blocknote/mantine, @blocknote/shadcn) are MPL-2.0 (file-level copyleft: unmodified use as a dependency is fine; modifications to their files must be shared). Advanced "XL" packages are GPL-3.0 or commercial. MPL-2.0 is compatible with FYD's use as an unmodified dependency; GPL-3.0 XL packages are off-limits.

MATURITY: Active. v0.52.0 released 2026-07-20. Ongoing changelog activity.

DEPENDENCY COST: React + TipTap/ProseMirror stack. `BlockNoteView` is client-side (`ssr: false` recommended).

DATA MODEL: `PartialBlock[]`: typed blocks (paragraph, heading, list, table, image, custom via `createReactBlockSpec`), each with id, type, props, content (inline), children. Clean JSON, serializable.

MUTATION MODEL: `useCreateBlockNote({ initialContent, schema })`; programmatic via `editor` API (`insertBlocks`, `updateBlock`, `removeBlocks`, `moveBlocks`). `onChange(editor)` callback surfaces new block arrays.

UNDO MODEL: ProseMirror-native transaction history (undo/redo) scoped to the editor instance.

PREVIEW MODEL: The editor is the preview (WYSIWYG document). Read-only mode via `editable={false}`.

COMPONENT MODEL: Custom block specs (`createReactBlockSpec`) with typed props and render functions; theming via `theme` prop (light/dark/custom theme objects).

THEME MODEL: Theme objects passed to the view; dictionary-based i18n. Lightweight.

AGENT MODEL: Agents can construct `PartialBlock[]` JSON directly; no official agent API, but the data model is trivially agent-writable.

COLLABORATION MODEL: THE HARVEST LESSON. Yjs was DECOUPLED from `@blocknote/core` in v0.52.0: collaboration is now an opt-in wrapper (`withCollaboration` from `@blocknote/core/yjs`), with a separate `@blocknote/core/y` entrypoint for Yjs v14 features. The core editor has zero collaboration dependency; multiplayer is a composable layer. This is the exact pattern FYD should copy: collaboration as an optional layer over the mutation model, never baked into the core.

EXPORT MODEL: Blocks serialize to Markdown, HTML, or JSON.

WHAT FYD CAN HARVEST: (1) Collaboration-as-optional-layer: FYD's mutation core (VALIDATE -> PREVIEW -> APPROVAL -> APPLY) must not depend on any collab transport; Yjs/CRDT attaches as a wrapper later. (2) `PartialBlock[]` as a reference for FYD's rich-text content fields inside SiteSpec components. (3) The split-license XL caution: keep any BlockNote use to MPL-2.0 core packages only. Note: BlockNote is a text editor, not a page-canvas; it does not solve FYD's drag/drop need.

---

## 6. OpenPage (cganh/openpage; also buildingopen/openpage fork)

PRIMITIVE: Open-source website builder with visual drag/drop editor, AI site generation, and JSON-first architecture. Self-hosted alternative to Framer/Lovable/v0.

LICENSE: MIT. Clean.

MATURITY: Young/small. ~9,300 lines of TypeScript; live demo; two GitHub homes (cganh/openpage updated ~61 days ago; buildingopen/openpage ~205 days ago). No evidence of production users at scale. Treat as reference implementation, not a dependency.

DEPENDENCY COST: React 19 + Tailwind CSS v4 + Zustand + Vite 7 for the editor/renderer (176 KB gzipped bundle, ~5s production builds). Exported HTML is standalone with zero runtime dependencies, so renderer lock-in does not leak into published sites.

DATA MODEL: Typed JSON document describing the whole site. Every mutation, visual or AI, produces the same structured diffable JSON.

MUTATION MODEL: Editor writes JSON; AI endpoint (Gemini) generates JSON from a prompt; API accepts JSON. One representation, three mutation sources. This is a small-scale proof of FYD's thesis: every mutation source emits the same typed structure.

UNDO MODEL: Not documented as a transaction system; JSON diffability implies snapshot undo is trivial, but no explicit undo/redo model was found. Gap vs Puck.

PREVIEW MODEL: Real-time canvas preview; JSON config panel visible beside it.

COMPONENT MODEL: 19 block types with 42 layout variants (navbars, heroes, features, pricing, testimonials, FAQs). Catalog is fixed/closed, not an application-owned registry.

THEME MODEL: 10 built-in theme presets, fully customizable (colors, fonts, border radius, spacing). Token-ish but preset-bound.

AGENT MODEL: POST a prompt, get back a complete site as JSON. Agent-friendly by construction (typed JSON in/out).

COLLABORATION MODEL: None.

EXPORT MODEL: One-click standalone HTML export (self-contained file, zero runtime deps).

WHAT FYD CAN HARVEST: (1) The JSON-first manifesto as validation of FYD's direction: typed JSON as the shared representation for AI, visual editor, and renderer; no hallucinated code, no proprietary format. (2) The 42 layout variants as a checklist for FYD's initial component catalog coverage (navbars, heroes, features, pricing, testimonials, FAQs). (3) The standalone-HTML export concept: published sites must carry zero builder runtime, which constrains FYD's renderer design. (4) The AI-endpoint shape: prompt in, validated JSON out, constrained to the component catalog. Do NOT propose replacing FYD canonical truth with their JSON; harvest the pattern, keep SiteSpec canonical.

---

## 7. Instatic (CoreBunch/Instatic)

PRIMITIVE: Self-hosted all-in-one CMS: visual canvas editor, content engine, media, auth, forms, plugins, publisher in one Bun server backed by SQLite or Postgres. Outputs clean semantic HTML/CSS with no framework runtime in the page. "The open-source alternative to Webflow, Framer and WordPress."

LICENSE: MIT. Clean.

MATURITY: Early ("early on purpose" roadmap). One-click deploys (Railway/Render/Docker). No production-user evidence found. Interesting, not proven.

DEPENDENCY COST: Bun runtime for the server; published pages have zero runtime. Self-hosting is the whole pitch.

DATA MODEL: CMS content model inside its own server (pages, content, users, roles, plugins).

MUTATION MODEL: Canvas editor + content engine; plugin system for extension.

UNDO MODEL: Not documented.

PREVIEW MODEL: Canvas editor is the preview; publisher emits static pages.

COMPONENT MODEL: Template/plugin based; less a component framework than a CMS with themes.

THEME MODEL: Template-driven.

AGENT MODEL: "Agentic" in positioning; no concrete agent API surface found.

COLLABORATION MODEL: Users and roles; no real-time co-editing documented.

EXPORT MODEL: Clean static HTML/CSS.

WHAT FYD CAN HARVEST: One line. The "one server, zero-runtime output" packaging is a deployment lesson (ship static pages with no builder machinery), but Instatic is an early-stage CMS, not a component framework, and offers nothing for FYD's compiler/mutation architecture.

---

## 8. Sitepins (sitepins.com)

PRIMITIVE: Git-based headless CMS for static site generators (Astro, Next.js, Hugo). Visual editor, nested collections, shortcodes, custom content blocks, live collaborative editing, build previews, BYO API key AI generation/rewriting.

LICENSE: AGPL-3.0 for self-hosted; managed Sitepins Cloud subscription otherwise. Founded 2024.

MATURITY: Young commercial open-core. No production-scale evidence found in this pass.

WHAT FYD CAN HARVEST: One line. It is a Git-backed headless CMS in the TinaCMS/CloudCannon space, not a page-construction framework; the AGPL license rules it out as a dependency, and its content model adds nothing beyond what TinaCMS already teaches.

---

## 9. VoxelSite (NowSquare/VoxelSite)

PRIMITIVE: AI website builder for self-hosted PHP sites: describe a business in plain language, get pages/layout/copy/styling/forms. Plain PHP + SQLite, no framework, no SaaS; you own every file.

LICENSE: AGPL-3.0.

WHAT FYD CAN HARVEST: One line. A PHP AI site generator under AGPL with no component framework, no typed IR, and no editor machinery; irrelevant to FYD's React/SiteSpec architecture beyond confirming the "AI prompt to site" product shape already exists elsewhere.

---

## Comparison table

| Project | License | Maturity | React lock-in | Backend needed | Typed IR | Agent-drivable | Undo | Collab | FYD fit |
|---|---|---|---|---|---|---|---|---|---|
| Puck | MIT | High, active | Yes (editor+R) | No | Yes: {content,root,zones} | Yes (JSON in/out; AI commercial) | Built-in history | No (Cloud commercial) | Spike candidate: thin SiteSpec adapter |
| Webstudio | AGPL-3.0 core, proprietary animation pkg | High, 230K projects | Export is React+CSS | Yes (builder stack) | Yes: instances/props/styles | Yes: MCP 70+ tools + CLI | Project transactions | Share-link multi-user | Patterns only: build.patch, tokens, MCP taxonomy |
| TinaCMS | Apache-2.0 | High, active | Visual edit React-only | Yes (GraphQL+Git) | Schema codegen (GraphQL) | Via Git/GraphQL | Git history | No | Schema-in-code pattern; content fields only |
| Easyblocks | PROPRIETARY npm pkg (Shopstory) | Stale (May 2025) | Yes | Backend token svc | Document model | No official | Built-in | No | Component-contract ideas only; do not depend |
| BlockNote | MPL-2.0 core; GPL-3.0/commercial XL | Active (v0.52.0) | Yes | No | PartialBlock[] | Yes (JSON blocks) | ProseMirror | Optional Yjs layer | Collab-as-layer lesson; rich-text fields |
| OpenPage | MIT | Young, small | Yes (editor) | No | Typed site JSON | Yes (prompt->JSON API) | Not documented | No | JSON-first validation; catalog/export patterns |
| Instatic | MIT | Early | No (Bun server) | Yes (Bun+SQLite/PG) | CMS model | Claimed, no surface | n/d | Roles only | One-line: zero-runtime static output lesson |
| Sitepins | AGPL-3.0 | Young | No | Yes | CMS collections | BYO-key AI rewrite | n/d | Live editing claimed | One-line: ruled out by AGPL; nothing new |
| VoxelSite | AGPL-3.0 | Unknown | No (PHP) | PHP+SQLite | No | Prompt->site | n/d | No | One-line: irrelevant to SiteSpec/React |

(R = renderer. n/d = not documented.)

---

## Harvest calls (decision-ready)

1. Puck adapter spike is GO (pending falsification in code, not in docs). MIT, caller-owned data, `{content,root,zones}` JSON, external authorship via data/initialHistory, publish-as-draft-handoff. Boundary to enforce in the spike: Puck Data is transient adapter state, never a second persisted tree; FYD validates every payload before it becomes a SitePatch; Puck Cloud AI/collab excluded.
2. Webstudio's `build.patch` (Immer patches grouped by container + version-checked apply) is the reference design for FYD's VALIDATE -> PREVIEW -> APPROVAL -> APPLY pipeline; its MCP tool taxonomy is the reference for FYD's agent surface. Patterns only: AGPL forbids code or model reuse.
3. BlockNote v0.52.0's Yjs decoupling (`withCollaboration` wrapper, collab as opt-in layer over a collab-free core) is the mandatory pattern for FYD's future multiplayer: the mutation core must never depend on the collab transport.

License landmines: Easyblocks npm packages are proprietary (Shopstory "All Rights Reserved") despite the open-source framing: do not depend. Webstudio core is AGPL-3.0 (plus a proprietary animation package): patterns only. BlockNote XL packages are GPL-3.0/commercial: core MPL-2.0 only. Clean: Puck (MIT), TinaCMS (Apache-2.0), OpenPage (MIT), Instatic (MIT).
