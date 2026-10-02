# FYD HARVEST LANE — Ecosystem Research Report

**Date:** 2026-09-22
**Lane:** research-only harvest, fully separate from the product build
**Constraint honored:** zero writes to the repo, zero mutations, zero test runs. All repo access was read-only via the Pig bridge (`~/workspace/pig/pigwsl-run.sh`, grep/sed/read-only). Repo state at research time: branch `fyd/builder-composition`, one untracked file (`src/fyd/jest.config.cjs`) — untouched.
**Deliverable location:** `~/workspace/fyd-harvest/harvest-report.md` (this file). Nothing merged; nothing gets merged without explicit approval.

## Architecture verified in-repo (not taken on faith)

Read directly from `/home/nolan/projects/ping`, branch `fyd/builder-composition`:

- **L1 truth:** `src/fyd/object/` (ObjectView, CircleProjection, loaders, evidence, owner-store/overlay/events). Object builder decides WHAT IS KNOWN.
- **L2 spec:** `src/fyd/sitespec/` — `FYDSection { id, component, query: FYDQuery, presentation: FYDPresentation }`; `FYDQuery` kinds: `owner | related | all | reference | static`. Sections declare HOW to fetch objects, never the objects themselves. Tokens are structured values only ("no drag and drop"); v1 token fields frozen, additive extension.
- **L3 rendering:** `src/fyd/components/renderer.tsx` + `registry.ts` — single schema→component mapping (17 section components + `GenericObjectCard` fallback; unknown schemas render through the fallback, never fail). `COMPONENT_REGISTRY_VERSION` stamped on dependency-manifest bindings. Copy classes DIRECT / DERIVED / GENERATED PRESENTATION / OWNER COPY.
- **Ask FYD:** `src/fyd/ask/` — today fully deterministic. `customize/intent.ts` states it plainly: "There is no LLM, no fuzzy matching, no guessing" (keyword-anchored regexes → `ParsedIntent`). `ask/site-patch.ts` drafts digest-bound `site_patch` proposals (`proposalDigest`/`verifyProposalDigest`); the human approves the exact proposal digest; application goes through the governed event path, never by the agent.
- **Acquisition:** `src/fyd/proceduralize/ACQUISITION-STACK.md` (2026-09-21) already contains deep harvest verdicts on Crawl4AI; `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md` records Lightpanda docs research. Crawl4AI-vs-Lightpanda benchmarks are HELD per Nolan's 2026-09-21 FOCUS NOW directive (trigger: "current stack cannot acquire required evidence" — has not fired).
- **Stack facts:** React 18.3.1, Next 15.5.24, Playwright 1.63.0 (devDep). `zod` is NOT a direct dependency — only transitive (3.25.76 via `@atproto/api`).

## Overlap search (PING + repo)

- **Repo grep** for `puck|webstudio|openpage|json-render|jsonrender|crawl4ai|crawl-4-ai|lightpanda|ai-sdk|aisdk` across `src/fyd` and docs: hits only in `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md`, `src/fyd/proceduralize/STRUCTURED-DATA.md`, `src/fyd/proceduralize/ACQUISITION-STACK.md` — all about Crawl4AI/Lightpanda acquisition. **No existing overlap** for Puck, Webstudio, OpenPage, json-render, or the AI SDK.
- **PING probe:** attempted read-only search of `ping_events` via `~/workspace/tandem/pg_probe.py` (SELECT-only, fail-closed). The psql layer failed on every query including `information_schema` (`PSQL_FAILED`). Per the probe's own contract, SQL-layer failures are recorded as **UNCHECKABLE**, not retried into guesses. The in-repo harvest docs above are the authoritative prior-art record instead.

---

## Sheet 1 — vercel-labs/json-render

- **PROJECT:** json-render — Vercel Labs generative-UI framework. Pipeline: `defineCatalog` (typed component vocabulary: zod prop schemas, named slots, descriptions, actions) → constrained JSON spec (element tree, or flat `{root, elements}` map) → `defineRegistry` (catalog → React implementations) → deterministic `Renderer`. Surrounding machinery: `StateProvider`/`ActionProvider`/`VisibilityProvider`/`ValidationProvider`, dynamic prop expressions (`$state`, `$bindState`, `$cond`, `$template`, `$computed`), built-in actions (`setState`, `pushState`, `removeState`, `validateForm`), event system (`emit`/`on`), `repeat` for lists, `SpecStream` (progressive spec delivery via JSON Patch RFC 6902), `useUIStream`, devtools (`<JsonRenderDevtools/>`, tree-shakes to null in prod), and renderers for React, Vue, Svelte, Solid, React Native, Ink, Remotion, react-pdf, react-email, shadcn. Docs: json-render.dev.
- **CURRENT VERSION+SHA:** npm `0.18.x` (third-party version tracking as of 2026-04-28; repo README badges confirm active development). Observed repo commit `3ad381881194e7011ad3ccd6d668033495a06c29` (the commit of the SKILL.md blob read during this research — a snapshot marker, not a release tag). Pre-1.0; no public roadmap. Re-verify with `npm view @json-render/core version` at decision time.
- **LICENSE:** Apache-2.0 (README + per-package READMEs).
- **PROBLEM IT SOLVES:** Constrains AI-generated UI to a typed component vocabulary: the model can only emit components in the catalog with props that validate against zod schemas. Plus streaming specs, cross-platform renderers from one catalog, and devtools.
- **FYD DUPLICATION TODAY:** High structural overlap, zero semantic overlap. FYD already has the core shape: spec-is-data (SiteSpec), single component registry, deterministic renderer, spec validator, unknown-component fallback policy. What json-render has that FYD doesn't: zod prop schemas per component, named slots, the catalog-as-AI-prompt-contract pattern, spec streaming. What FYD has that json-render doesn't: object-graph bindings (`FYDQuery`), evidence, field visibility, capabilities, owner transitions, digest-bound proposals. json-render's `$state` model is app-state, not an object graph — it cannot express FYD's L1.
- **DEPENDENCY COST:** Real. Peer deps are `react ^19` + `zod ^4`. FYD is React 18.3.1 / Next 15.5.24 with zod only transitive (3.x). Adopting the npm package forces a React 19 upgrade and a direct zod dependency, on a pre-1.0 API with an unclear long-term maintenance commitment from Vercel Labs.
- **LOCK-IN:** Moderate. The spec grammar (element tree + `$state` expressions) is json-render's own; the catalog helpers are its API. Apache-2.0 means forkable, but pre-1.0 churn is the actual lock-in risk (spec format evolving under FYD's feet).
- **CANONICALITY RISK:** Low if confined to rendering; HIGH if FYD's spec grammar were replaced by json-render's `$state` grammar (state model leaking into the spec dilutes the object-binding layer) or if the catalog bypassed SiteSpec validation and the binding verifier.
- **HARVESTABLE PRIMITIVES (adapt, do not adopt the package):**
  1. **Typed catalog as AI contract.** The catalog (component → zod prop schema + slots + description) is the machine-readable vocabulary shared by AI prompts and validators. FYD's registry already carries adjacent metadata (`editableProperties`, `capabilities`, `variants`, `responsive`); adding formal prop schemas per component is the harvest. This is the single highest-value primitive.
  2. **Catalog-driven prompt injection.** json-render injects the catalog + built-in actions into AI prompts. Direct map to FYD: when the intelligence lane goes model-backed, the registry (with prop schemas) becomes the model's constrained vocabulary for SitePatch generation.
  3. **Named slots.** `slots: ["default", "header", "footer"]` for nested composition without inventing new components. FYD sections are flat lists today; slots could model e.g. hero header actions or card sub-regions additively.
  4. **Explicit unknown-component policy, stated as contract.** FYD already has one (GenericObjectCard, never fail). json-render's posture should be compared at proof time; FYD's policy stands regardless.
  5. **Devtools pattern.** Floating spec/tree inspector, dev-only, tree-shaken from prod — directly useful for SiteSpec debugging without production leakage.
  6. **SpecStream via JSON Patch — with a warning.** Progressive spec delivery is attractive for Ask FYD streaming, but it conflicts with FYD's digest-bound proposal integrity unless every patch is digest-disciplined. Adopt only behind the digest seam, never as raw streaming into the spec.
- **ADOPT / ADAPT / REJECT:** **ADAPT the patterns; REJECT the npm dependency in this wave.** Rationale: React 19 peer-dep clash with FYD's React 18, pre-1.0 churn, and FYD's object-binding/evidence/visibility layer has no counterpart there and must stay FYD-owned. The coordinator's hypothesis is confirmed: harvest the typed catalog + constrained component vocabulary; FYD keeps object bindings, evidence, capabilities, visibility, transitions, and SiteSpec ownership.
- **TINY PROOF:** A throwaway script in the harvest dir (no repo changes, no installs) that reads `src/fyd/components/registry.ts` definitions and emits a json-render-style catalog document (component name → zod prop schema sketched from each component's query shapes + `editableProperties`). Success = the registry can produce a machine-readable AI vocabulary file. This proves the harvest without the dependency.

## Sheet 2 — puckeditor/puck (MIT)

- **PROJECT:** Puck — modular open-source visual editor for React. `<Puck config={components} data={initialData} onPublish={save} />`. Config defines components with schema-driven fields (text, rich text via TipTap, selects, etc.) and `render` functions; data is plain JSON `{ root: { props }, content: [{ type, props }], zones? }`; `<Render>` / RSC `ServerRender` for publishing; drag-and-drop via `@dnd-kit`; plugin/override system. Puck AI (cloud, `PUCK_API_KEY`) is a separate commercial offering — the MIT core needs none of it. 12.9k stars, ~1M monthly downloads (per puckeditor.com).
- **CURRENT VERSION+SHA:** `@puckeditor/core` 0.22.2 observed in a downstream fork's dependency list during research; official latest not pinned — re-verify with `npm view @puckeditor/core version` at decision time.
- **LICENSE:** MIT — verified on the repo README and LICENSE tab ("MIT © The Puck Contributors"). Commercial use, modification, private use all permitted.
- **PROBLEM IT SOLVES:** Embeddable visual page editing with your own components; JSON in/out; you own the data; no backend lock-in.
- **FYD DUPLICATION TODAY:** No direct duplication — FYD has no human visual editor. Owner edits today flow through the proposal/approval/digest seam (`customize/intent.ts` keyword parser, `ask/site-patch.ts`). **Fundamental model mismatch:** Puck blocks are prop-driven (content baked into each block); FYD sections are query-driven (content resolved from the object graph at render time). A Puck block cannot natively express `FYDQuery`.
- **DEPENDENCY COST:** Moderate: `@puckeditor/core` + `@dnd-kit` family; React 18 compatible (Puck supports React 18+), so no framework upgrade. It would live in the owner-mode surface only — zero runtime cost to public sites.
- **LOCK-IN:** Low-moderate. MIT; data is plain JSON you persist yourself. The lock-in risk is conceptual, not legal: if Puck's data model became canonical, FYD's object-graph binding dies.
- **CANONICALITY RISK:** HIGH if misused — Puck's data wants to BE the site. The only safe architecture is a lossy-by-design projection: **SiteSpec → Puck adapter (projection, never persisted) → owner edits Puck JSON → translator emits TYPED SITE PATCH → existing PING proposal/approval/digest path → SiteSpec transition.** Puck never writes SiteSpec directly; Puck data is never persisted as truth. Query-bound fields are preserved from the source spec and re-attached, not edited — Puck's field config marks resolved values read-only.
- **HARVESTABLE PRIMITIVES:**
  1. **The projection-adapter pattern itself.** Concrete sketch: each `FYDSection` projects to a Puck block `{ type: componentName, props: { heading, copy, ... } }` using render-model-resolved values for display; diffing edited Puck data against the projected snapshot yields only these allowed classes → `SitePatch` ops: reorder → `move_section`; `presentation.*` edits → `update_presentation`; token edits → `update_tokens`; adding a catalog-listed component → `add_section` with a default query for its schema; **anything touching query/binding → REJECTED with reason** (owner must use Ask FYD). This keeps L1/L2 separation: visual edits can never rewrite truth.
  2. **Second-producer validation of the SitePatch seam.** Puck would be a second producer of typed `SitePatch` ops into the existing digest-bound proposal path — which is exactly the sanctioned shape ("intelligence produces data, never arbitrary JSX"; Puck produces data too). If the seam can't serve two producers, that's a finding about the seam, not about Puck.
  3. **Schema-driven field configs** as the vocabulary for which presentation fields are owner-editable — maps to FYD's `editableProperties` registry metadata; Puck's field types are a reference for extending it.
- **ADOPT / ADAPT / REJECT:** **ADAPT as a future editing-surface projection; DO NOT integrate in this wave** (per the task's explicit instruction). Preconditions before any integration: (1) the SiteSpec→Puck projection and Puck→SitePatch translator are designed with the rejection classes enumerated; (2) Puck data is never persisted; (3) the existing digest-bound proposal path is reused, not duplicated. **Invariant guard:** FYD has a no-CRDT rule; Puck's collaboration experiments (Yjs-based, seen in a third-party fork's demo architecture — not in official core) must never leak CRDT state into SiteSpec. The SitePatch seam is the only channel, period.
- **TINY PROOF:** In the harvest dir (no repo changes): take a hand-written sample `FYDSiteSpec` JSON, project it to Puck `data` JSON using only registry component names, simulate one owner reorder + one heading edit, and show the resulting typed `SitePatch` op list. Success = the round trip is expressible; the proof's real output is the explicit list of SiteSpec fields with no Puck counterpart (queries), which must be preserved out-of-band.

## Sheet 3 — buildingopen/openpage

- **PROJECT:** OpenPage — open-source website builder with JSON as the single source of truth. One structured JSON document per site; a visual drag-and-drop editor and an AI endpoint (Gemini backend) both read/write the same JSON via JSON patches. React 19 + TypeScript + Tailwind v4 + Zustand/immer (undo/redo) + `@dnd-kit`. 13 production block components (hero/features/pricing/cta/footer/navbar/testimonials/stats/faq/team/contact/newsletter/logocloud) with variants (e.g. HeroCentered/HeroSplit/HeroGradient, PricingSimple/PricingComparison). Editor chrome: canvas, layers panel, properties panel, JSON drawer, version history, agent panel, theme presets.
- **CURRENT VERSION+SHA:** No versioned releases observed — it ships as an app, not a package. Treat as a snapshot; no SHA pinned.
- **LICENSE:** MIT (README badge).
- **PROBLEM IT SOLVES:** One JSON document that humans (visual editor) and AI agents (JSON patches via API) both manipulate — predictable, diffable, version-controllable. "No hallucinated imports, no merge conflicts, no broken builds."
- **FYD DUPLICATION TODAY:** Substantial conceptual overlap at L2 — FYD's SiteSpec is also "JSON spec; AI produces transitions; humans approve." The differences are decisive: OpenPage blocks carry their own content (no L1 truth layer, no object graph, no evidence, no visibility); OpenPage is a whole competing builder (own editor, own deploy, Gemini-coupled AI endpoint), not a library.
- **DEPENDENCY COST:** N/A as a dependency (it's an app). Adopting pieces means vendoring.
- **LOCK-IN:** Total if imported wholesale — competing builder, competing JSON grammar, Gemini-coupled AI endpoint.
- **CANONICALITY RISK:** HIGH if its JSON ever became a site source of truth alongside SiteSpec — two competing L2s. It must stay a pattern source, never a second canonical model.
- **HARVESTABLE PRIMITIVES (patterns only — do not import the builder):**
  1. **Human/AI shared-editing contract.** Both interfaces mutate the same typed JSON via the same patch vocabulary. FYD already has this shape (typed `SitePatch` ops); OpenPage validates documenting `SitePatch` explicitly as the human+AI shared vocabulary.
  2. **Block-variant vocabulary.** Their variant naming (Centered/Split/Gradient, Simple/Comparison) is a checklist for FYD's registry `variants[]` coverage audit.
  3. **Theme token presets.** 10 theme presets over structured tokens — harvest the *preset packaging* concept for FYD's additive token groups, not their values.
  4. **AgentPanel UX.** An in-editor panel where AI proposes diffs on the same JSON and the human approves — direct UX reference for Ask FYD's `site_patch` proposal cards.
  5. **JSON drawer + version history UX.** Visible history mechanics — but FYD's "undo" is the event log through proposal/approval, not editor-local immer undo. Harvest the UX pattern, not the mechanism.
- **ADOPT / ADAPT / REJECT:** **ADAPT patterns only; REJECT as builder/dependency.** Confirmed: do not import a competing builder.
- **TINY PROOF:** A mapping table (harvest dir) of OpenPage's 13 blocks → FYD's 17 registry components. The gap list in both directions is the harvest: which FYD object-bound components (ObjectGrid, GenericObjectCard) have no OpenPage counterpart, and which OpenPage social-proof blocks (pricing, testimonials) suggest FYD registry vocabulary gaps.

## Sheet 4 — Webstudio

- **PROJECT:** Webstudio — open-source visual development platform (Webflow alternative). Canvas exposes real CSS primitives (box model, flexbox, grid, custom properties, transitions, pseudo-classes, responsive breakpoints); output is clean semantic HTML + standard React/Remix. Headless data via Resources (REST/GraphQL request definitions), variables, expressions, data bindings, collections, dynamic routing. Design tokens as reusable classes + CSS variables. `wstd` CLI syncs project data as JSON; a separate SDK renders the data in any React app. AI-manipulable via MCP tools (`list-instances`, `apply-styles`, `create-design-token`, `create-resource`, `bind-props`, `insert-fragment`, …). Cloudflare hosting; self-hostable. Isolated published sites (builder/published separation).
- **CURRENT VERSION+SHA:** Monorepo under continuous development; no single version pinned in this research (repo crawled ~4 days ago; 8,500+ stars per third-party writeup). Treat as a moving snapshot.
- **LICENSE: AGPL-3.0-or-later — verified on the repo README.** `sdk-components-animation` is additionally proprietary (EULA). **Consequence: patterns only. No Webstudio code enters FYD unless licensing is deliberately resolved by Nolan.** AGPL-3.0's network copyleft would reach a hosted FYD builder service incorporating this code. Per-package licenses inside the monorepo were not individually verified — default posture is AGPL until proven otherwise per package.
- **PROBLEM IT SOLVES:** Professional-grade visual CSS authoring with real cascade semantics; headless-data binding decoupled from design; AI-manipulable project model.
- **FYD DUPLICATION TODAY:** Partial and deliberately opposite. FYD's tokens are *constrained by design* ("structured values only, no drag and drop"; semantic tokens; no generated CSS blobs). Webstudio is the full-CSS-control end of the spectrum. FYD has no visual style editor; Webstudio's style engine is the reference for what graduating token editing could look like *without* breaking the invariant.
- **HARVESTABLE PRIMITIVES (read-only architecture patterns — clean-room from the pattern description, never the code):**
  1. **Typed style-value grammar.** Styles stored as typed JSON (`{ fontSize: { type: "unit", unit: "px", value: 14 } }`). FYD's additive token groups could adopt a similar typed-value grammar *constrained to semantic tokens* (values reference the scale, never raw CSS) — this hardens the "no generated CSS blobs" invariant instead of weakening it.
  2. **Breakpoints as data.** Base + named breakpoints (768px, 1280px, custom), per-breakpoint overrides stored declaratively. Validates FYD's existing direction (registry `responsive` metadata: `rail-to-drawer | stack | fixed`, `collapseBelow`, `touchTargetMinPx`).
  3. **Tokens as reusable classes + CSS variables with native states** (`:hover`) — informs FYD token-preset design.
  4. **Declarative binding layer.** Resources/variables/expressions are data, separate from components — FYD already does this (`FYDQuery` in the spec, not in components). Their expression grammar (conditional display, fallbacks, concatenation) could inform presentational computed values — with the hard constraint that FYD copy classes forbid inventing facts; expressions stay presentational.
  5. **Builder/published isolation** — FYD already separates preview manifests (`src/fyd/preview/manifests`); architecture validated, nothing to change.
  6. **MCP tool vocabulary for AI manipulation** — a concrete reference for FYD's future AI-editing tool surface, constrained to `SitePatch` ops.
- **ADOPT / ADAPT / REJECT:** **ADAPT patterns; REJECT any code import under AGPL.** License revisit only on Nolan's deliberate resolution.
- **TINY PROOF:** A typed style-value grammar sketch for ONE FYD token group (e.g. radius) in the harvest dir — Webstudio-shaped `{type, unit, value}` but constrained to semantic tokens — plus a validator sketch that rejects a raw-CSS blob. Written from the pattern description only. No repo changes.

## Sheet 5 — Vercel AI SDK

- **PROJECT:** Vercel AI SDK — TypeScript toolkit for AI features. Provider abstraction (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/xai`, … — swapping providers is a one-line model-construction change); `generateText`/`streamText`; structured output (`generateObject` in v6, **deprecated in v7 in favor of `generateText` + `Output.object({ schema })`**); `tool()` with zod schemas and `execute`; `useChat`/`useCompletion` in `@ai-sdk/react`; v6 `Agent` abstraction; **v7 stable 2026-06-25**: durable `WorkflowAgent`, stable tool approvals, `@ai-sdk/otel` telemetry (moved out of core), MCP Apps. ~16–20M weekly npm downloads. (v7 rename note: `system` → `instructions`.)
- **CURRENT VERSION+SHA:** `ai@7.x` stable (released 2026-06-25). npm package `ai`. Re-verify exact minor with `npm view ai version` at decision time.
- **LICENSE:** MIT.
- **PROBLEM IT SOLVES:** One typed interface over model providers — request shapes, streaming, tool schemas, token counting, error normalization — so product code never binds to one provider's API.
- **FYD DUPLICATION TODAY:** None at runtime. FYD intelligence is currently fully deterministic ("There is no LLM, no fuzzy matching, no guessing" — `src/fyd/customize/intent.ts`; `ask/site-patch.ts` is keyword-anchored). The AI SDK fills the gap FYD *will* hit when Ask FYD graduates from keyword rules to model-backed reasoning: it needs provider-agnostic structured output (`SitePatch` / `AnswerWithEvidence` as zod schemas) without binding FYD intelligence to one provider — exactly the coordinator's constraint.
- **DEPENDENCY COST:** Low. MIT; `ai` + one provider package; zod as a direct dep is recommended (currently only transitive 3.25.76 via `@atproto/api`; AI SDK 7 accepts `zod ^3.25.76 || ^4.1.8`, so the range is satisfiable, but relying on a transitive dep is fragile). No server component required; runs in any JS runtime.
- **LOCK-IN:** Low by design — provider abstraction is the point. Residual: SDK major-version churn (v6→v7 had a codemod) and the experimental RSC generative-UI surface.
- **CANONICALITY RISK:** Low if used strictly as the intelligence transport: model → schema-validated `SitePatch`/`AnswerWithEvidence` → existing digest/proposal path. **The risk is the RSC generative-UI path** (model emits components directly) — that would violate "INTELLIGENCE PRODUCES DATA, never arbitrary JSX" and bypass the binding verifier. The coordinator's direction stands: favor normal structured-output/UI paths; the experimental RSC generative UI is rejected for FYD.
- **HARVESTABLE PRIMITIVES:**
  1. **Provider-abstraction pattern** for the future intelligence layer — the mechanism behind "do not bind FYD intelligence to one provider."
  2. **`generateText` + `Output.object({ schema })`** as the "AI produces SitePatch" mechanism, with FYD-owned zod schemas.
  3. **`tool()`** for Ask FYD's evidence-gathering tools (read-only graph tools with zod input schemas).
  4. **`useChat`** for the Ask FYD widget's streaming transport (`src/fyd/ask/fyd-circle.tsx` exists — its current transport to be assessed when the lane opens).
  5. **Tool approvals (v7 stable)** — conceptually aligned with FYD's human-approval seam.
- **ADOPT / ADAPT / REJECT:** **ADOPT — but only when the intelligence lane actually needs a model, not before.** It is MIT, low-cost, and directly implements the no-single-provider constraint. Explicitly REJECT the RSC generative-UI path. No integration in this wave: FYD makes zero model calls today, so adding the dependency now buys nothing.
- **TINY PROOF:** In the harvest dir (no npm install, no repo changes): draft the zod schemas for `SitePatchOperation` and `AnswerWithEvidence` as AI-SDK `Output.object` schemas, derived read-only from `src/lib/ping/types.ts` and `src/fyd/ask/types.ts`. The proof draws the exact boundary: model output → schema validation → existing proposal/digest path.

## Sheet 6 — Crawl4AI

- **PROJECT:** Crawl4AI — Python async crawler/LLM-ready-markdown engine (Playwright-backed browser, markdown generation strategies, content filters, deep-crawl dispatchers, Docker API server, MCP).
- **CURRENT VERSION+SHA:** **0.9.3** (PyPI, August 2026) — a security release closing five coordinated-disclosure advisories (four in the PDF path: arbitrary file write, SSRF via redirect, uncapped PDF download DoS, XSS in `cleaned_html`; one DOM XSS in the Playground) plus 33 bug fixes. 0.9.0 (June 2026) made the Docker server secure-by-default (auth on by default, loopback bind, declarative-only request bodies — breaking for Docker-server users only; the pip library unchanged).
- **LICENSE:** Apache-2.0 (per `src/fyd/proceduralize/ACQUISITION-STACK.md`).
- **PROBLEM IT SOLVES:** Hardened, full-featured web acquisition: discovery (DomainMapper, AsyncUrlSeeder), Shadow DOM flattening, 40+ CMP consent dismissal, content filtering (PruningContentFilter with `preserve_classes`/`preserve_tags` in 0.9.1), anti-bot detection tiers.
- **FYD DUPLICATION TODAY:** Fully covered by prior art. `src/fyd/proceduralize/ACQUISITION-STACK.md` (2026-09-21) already decided: **HARVEST design only** — SSRF destination validation, declarative request trust boundary, DomainMapper/AsyncUrlSeeder discovery patterns, prefetch fast-discovery, Shadow DOM flattening, the CMP list, 3-tier anti-bot *detection* (telemetry only); **REJECT** — importing the pip package into the TS runtime, LLM extraction (nondeterministic, prompt-injection surface), the Docker server (RCE/SSRF/auth-bypass/file-write advisory history), anti-bot circumvention, `check_robots_txt=false` default. **Playwright 1.63.0 HARVEST as the L2 engine** (already a repo devDep). No live crawl ever run.
- **DEPENDENCY COST (of actual adoption):** Python package inside a TS runtime (subprocess/IPC), browser fleet management, Docker server attack surface — all already rejected.
- **LOCK-IN:** N/A under the standing verdict (design harvest, not a dependency).
- **CANONICALITY RISK:** N/A — acquisition feeds observations; the proceduralize lane already types them (`FactClass`, `ParsedFact`, `ClaimKind`). Acquisition never writes truth.
- **ESCALATION-LADDER PLACEMENT:** HTTP/JSON-LD (L0/L1) → the adapter's own bounded fetcher → **Playwright 1.63.0 as the L2 render fallback** → Crawl4AI *patterns* re-implemented in FYD's own bounded adapter (never the pip package) → browser → agent-discovers-recipe → save/replay deterministic procedure (`proceduralizer.ts`). Crawl4AI never becomes a default dependency; it is a design reference for the hardened engine.
- **ADOPT / ADAPT / REJECT:** **ADAPT (design harvest) — standing verdict CONFIRMED, no new decision needed.** This lane re-verified the prior verdict against 0.9.3: it is a security/bugfix release with no architectural change, and 0.9.0's secure-by-default Docker server does not overturn the in-process-adapter decision. The only open item is the HELD benchmark, which fires solely on Nolan's trigger.
- **TINY PROOF:** None needed — `ACQUISITION-STACK.md` is the proof. The held benchmark (Crawl4AI patterns vs Lightpanda vs current stack) remains gated on Nolan's "current stack cannot acquire required evidence" trigger.

## Sheet 7 — Lightpanda

- **PROJECT:** Lightpanda (`lightpanda-io/browser`) — headless browser written from scratch in Zig for AI agents/automation (libcurl + html5ever + V8 + CDP server). Modes: `serve` (CDP), `fetch` (URL → HTML/markdown), `agent`, `mcp`. Published figures: ~9x faster, ~16x lighter than headless Chrome (vendor benchmarks). Respects `robots.txt` via `--obey-robots`.
- **CURRENT VERSION+SHA:** Nightly builds; no stable versioned release observed. Beta status, explicitly "work in progress" upstream.
- **LICENSE: AGPL-3.0.** Using the unmodified binary as a subprocess does not by itself create a derivative work, but any modification or redistribution triggers obligations — needs deliberate resolution before adoption. **Telemetry is ON by default** (`LIGHTPANDA_DISABLE_TELEMETRY=true` to disable) — a privacy consideration for a product that crawls real small businesses' sites; must be disabled if ever used.
- **PROBLEM IT SOLVES:** High-volume, low-overhead page fetching for machines: fast startup, tiny memory, CDP-compatible (Puppeteer/Playwright/`agent-browser --engine lightpanda` can drive it), native MCP.
- **FYD DUPLICATION TODAY:** Covered in `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md` ("read from docs"). Benchmarks vs Crawl4AI vs current stack are HELD per the 2026-09-21 directive.
- **DEPENDENCY COST:** Low integration cost (single static binary, CDP-compatible) but real reliability risk: beta, partial Web API coverage, no Windows binary (the Pig is Windows-native for headed-Chrome work; WSL execution is plausible but unproven in this stack), no persistent profiles/extensions, no headed mode, screenshots depend on CDP support. Loses to Cloudflare/managed challenges (no stealth — correctly, per FYD's fail-closed posture).
- **LOCK-IN:** Low technically (CDP interface), but AGPL-3.0 + default-on telemetry require deliberate handling.
- **CANONICALITY RISK:** N/A — acquisition tier only.
- **ESCALATION-LADDER PLACEMENT:** Same ladder as Sheet 6. Lightpanda sits at the browser tier as an **alternate L2 engine candidate** for high-volume, low-fidelity acquisition (fetch → markdown), strictly behind Playwright 1.63.0 (fidelity matters for evidence: login flows, SPAs, visual checks) and strictly opt-in. It must never become the default acquisition browser while beta, AGPL-licensed, and telemetry-default-on.
- **ADOPT / ADAPT / REJECT:** **HOLD as an escalation-ladder candidate** — matching the standing HELD benchmark status. ADAPT nothing yet. A future benchmark (only when Nolan's trigger fires) compares Playwright 1.63.0 vs Lightpanda nightly on FYD's actual acquisition corpus for fidelity + determinism of extracted observations. REJECT as a default dependency.
- **TINY PROOF:** The held benchmark plan: corpus = the two tenant sites' public pages (fixtures already in `src/fyd/proceduralize/raw/` — happy-place-platform, coppersmith-plumbing); metric = observation determinism + field coverage vs Playwright; trigger = Nolan's "current stack cannot acquire required evidence."

---

## Consolidated harvestable primitives, ordered by value/effort

1. **Typed component catalog as AI contract** (json-render, Sheet 1). Generate a machine-readable catalog from FYD's existing registry (zod prop schemas per component) to feed Ask FYD/generator prompts and validators. Value: HIGH — constrains AI vocabulary to the registry. Effort: LOW — read-only generation, no new deps.
2. **Catalog-driven AI prompt injection** (json-render, Sheet 1). When the intelligence lane goes model-backed, inject the registry (components + allowed actions) into prompts. Value: HIGH. Effort: LOW.
3. **AI SDK provider-abstraction + `Output.object` schemas** (Sheet 5). The future intelligence transport: model → schema-validated `SitePatch`/`AnswerWithEvidence` → existing digest/proposal path. MIT, no single-provider binding. Value: HIGH when the model lane opens. Effort: LOW. Adopt only when needed; RSC generative UI rejected permanently.
4. **Puck projection architecture** (Sheet 2). SiteSpec → Puck projection → typed SitePatch → existing proposal/approval/digest. The design for a future human visual-editing surface that *cannot* become canonical truth. Value: HIGH (owner UX). Effort: MEDIUM (translator + enumerated rejection classes). Not this wave.
5. **Typed style-value grammar for token groups** (Webstudio pattern, Sheet 4). `{type, unit, value}` constrained to semantic tokens; validator rejects raw CSS blobs. Hardens the "no generated CSS blobs" invariant. Value: MEDIUM. Effort: LOW-MEDIUM. License-safe only as clean-room from the pattern description.
6. **Named slots** (json-render, Sheet 1). Nested composition (header/footer/default) without new components; additive spec change. Value: MEDIUM. Effort: LOW.
7. **Token preset packaging** (OpenPage, Sheet 3). Named presets over FYD's structured tokens. Value: MEDIUM. Effort: LOW.
8. **Block-variant vocabulary audit** (OpenPage, Sheet 3). Map their 13 blocks → FYD's 17 components; the gap list is the harvest. Value: LOW-MEDIUM. Effort: LOW.
9. **MCP-style AI tool vocabulary for spec editing** (Webstudio, Sheet 4). Reference for FYD's future AI-editing tool surface, constrained to `SitePatch` ops. Value: MEDIUM. Effort: LOW (design reference).
10. **Crawl4AI design patterns** (Sheet 6). Already harvested and standing (SSRF validation, trust boundary, discovery patterns). Value: realized. Effort: none.
11. **Lightpanda as held benchmark candidate** (Sheet 7). Trigger-gated; no action until Nolan's trigger fires. Value: conditional. Effort: none now.

## Conflicts with the product build

**None.** This lane performed zero writes, zero installs, zero test runs, and zero mutations of any kind. Two watch-items for future lanes, not conflicts:

1. **json-render SpecStream vs digest integrity.** If spec streaming is ever adopted, JSON Patch streams must be digest-disciplined through the proposal seam — raw streaming into SiteSpec would break the digest-bound integrity Ask FYD relies on.
2. **Puck collaboration tech vs the no-CRDT invariant.** Third-party Puck demos use Yjs CRDTs; FYD's invariant is "structured patches only, no CRDT." Any future Puck projection must keep CRDT state out of SiteSpec entirely — the `SitePatch` seam is the only channel.

## Verdict summary

| # | Project | Verdict |
|---|---------|---------|
| 1 | vercel-labs/json-render | ADAPT patterns (typed catalog, slots, prompt injection); REJECT the npm dep (React 19 clash, pre-1.0) |
| 2 | puckeditor/puck (MIT) | ADAPT as future projection surface (SiteSpec→Puck→typed SitePatch→approval); DO NOT integrate this wave |
| 3 | buildingopen/openpage (MIT) | ADAPT patterns only (shared-editing contract, variant vocabulary, presets, AgentPanel UX); REJECT as builder |
| 4 | Webstudio (AGPL-3.0) | ADAPT patterns only, clean-room; REJECT any code import without deliberate license resolution |
| 5 | Vercel AI SDK (MIT) | ADOPT when the intelligence lane needs a model (not before); RSC generative UI rejected |
| 6 | Crawl4AI (Apache-2.0) | ADAPT design — standing 2026-09-21 verdict CONFIRMED; no new decision |
| 7 | Lightpanda (AGPL-3.0) | HOLD as trigger-gated benchmark candidate; REJECT as default dependency |

**Standing rule honored throughout:** FYD keeps object bindings, evidence, capabilities, visibility, transitions, and SiteSpec ownership. Intelligence produces data (`SitePatch` / `AnswerWithEvidence`); the deterministic renderer produces UI. Nothing in this report changes code, and nothing gets merged without explicit approval.
