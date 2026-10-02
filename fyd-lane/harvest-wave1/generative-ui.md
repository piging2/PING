# Harvest: Generative UI / component selection mechanisms

Date: 2026-09-21. Lane: FYD generative-ui (read-only).
Bounded question: "Our renderer maps SiteSpec nodes to components. Which exact mechanism selects components from structured data deterministically, registry, schema-driven mapping, capability matching, such that the same graph always selects the same component, with no LLM inside the render path?"

Rate note: ZERO GitHub API calls used in this lane per the 2026-09-21 budget freeze (shared quota reserved for the Patch 7 verification run). PINNED SHA and LICENSE are TBD for every candidate; pin only the top 1-2 after budget release (one repo-endpoint call covers SHA + license each). All evidence below is from web reading (docs, readmes, API references, third-party source sweeps), no cloned code, no installs.

## What FYD already has (baseline, read from ~/workspace/fyd-lane/repo/)

- `src/fyd/components/registry.ts`: `getComponentDef(section.component)` — a name-keyed component registry (string → ComponentDef, with `requiresData`).
- `src/fyd/components/renderer.tsx` `renderSection`: looks up the def, then a `switch (section.component)` picks the concrete section function. Unknown component → null; `presentation.hidden` → null; `requiresData && empty` → null.
- The selection key (`section.component`) is set by the deterministic V0 planner in the SiteSpec. No LLM anywhere in the render path already.
- `src/fyd/sitespec/render-model.ts`: semantic render model with RENDER_MODEL_VERSION, canonical JSON, deterministic ordering. Selection is already reproducible.

So the "name-keyed registry" lane is OWNED. The harvest question is what the registry key can be besides a planner-set name, and what discipline surrounds the registry (rejection, validation, override, fallback).

---

## CARD 1: assistant-ui JSONGenerativeUI (type-keyed allowlist registry as security boundary)

PROJECT: assistant-ui/assistant-ui — JSONGenerativeUI generative-ui library API (docs: assistant-ui.com/docs/api-reference/generative-ui/components)
PINNED SHA: TBD (budget frozen; pin after release)
LICENSE: TBD (verify on pin)
RECENT ACTIVITY: Current documented API as of Sept 2026 crawls. Legacy `makeAssistantToolUI({toolName, render})` deprecated in favor of the toolkit API (`Tools({toolkit})` with `render` on the tool definition); the new `JSONGenerativeUI` + `defineGenerativeComponents` + `"use generative"` compiler is the documented path. Project active.

FYD PROBLEM: A registry where the selection key is a `type` string inside a JSON tree, unknown types are rejected loudly (fail closed), and each entry carries its own props schema so the render path validates before rendering.

MECHANISM: Consumer-provided allowlist: `type GenerativeUILibrary = Record<string, GenerativeUIComponent>`. Keys are the `type` values referenced in the generative-ui tree (e.g. "Card", "Button"). Each entry colocates: `description` (natural language), `properties: ZodType<P>` (schema for the props; kept on every build, drives tool parameters), `render: (props) => ReactNode` (kept only on the client). Docs state verbatim: "This registry is the security boundary — any `type` not present is rejected." A `"use generative"` compiler unwraps `defineGenerativeComponents(...)` per build, dropping each `render` (and its client-only imports) from the server build. Selection = `library[node.type]`; same tree + same library → same components, always. No LLM in the render path: the tree is data by render time.

EXACT IMPLEMENTATION:
- Files/symbols (docs-level): `JSONGenerativeUI` (factory, `new JSONGenerativeUI({library})`), `defineGenerativeComponents(library)`, `GenerativeUILibrary`, `GenerativeUIComponent {description: string, properties: ZodType<P>, streamProperties?: boolean, render: (props: StreamingRenderProps<P>) => ReactNode}`, `defaultGenerativeUILibrary` (closed default vocabulary with zod schemas + unstyled structural renders carrying `data-aui` attributes).
- Legacy path (same repo): `makeAssistantToolUI({toolName, render})`; new toolkit path: `Tools({toolkit})`, runtime lookup `s.tools.toolUIs[toolName]?.[0]?.render`. Name-keyed, same family as FYD's registry.
- Notable contract details from docs: `render` is a function of props, not a React component; a node must keep its `type` across renders for hook identity to stay stable; `streamProperties` opts into rendering from partial props.
- Tests: not verified in this lane (docs-level evidence only).

CLAIM EVIDENCE: Docs explicitly frame the registry as the security boundary and state unknown types are rejected.
SOURCE EVIDENCE: assistant-ui.com API reference "Generative UI Components" read 2026-09-21; assistant-ui/skills legacy-component-apis.md (toolkit migration); featherless-ai/open-agent-loops skill reference (toolkit shape, `toolUIs[toolName]` lookup).
RUNTIME EVIDENCE: none in this lane (read-only, no install).
DEPENDENCY COST: full `@assistant-ui/react` (chat runtime, state, theming). For FYD the interest is the ~60-line registry+validator pattern, not the package.

WHAT FYD ALREADY HAS: name-keyed `getComponentDef` + switch; null-on-unknown (silent); no per-entry props schema; no declared security boundary.
WHAT THEY DO BETTER: (1) unknown type = explicit rejection as a named boundary, not silent null; (2) props schema colocated with the render entry, so validation happens at the selection seam; (3) compile-time split of client `render` from server `properties` schema; (4) hook-identity rule for keyed nodes (keep `type` stable across renders).
WHAT FYD DOES BETTER: FYD's registry key comes from a deterministic planner, not an LLM-emitted tree; FYD has the binding verifier (no customer fact without a traceable basis) and the canonical semantic render model; FYD's selection has no model anywhere near it.

SMALLEST HARVESTABLE PRIMITIVE: a ~60-line typed registry: `Library = Record<string, {schema: ZodType, render: (props) => ReactNode}>` plus `resolve(type, props)` that validates props against the entry schema and throws a named `UnknownComponentType` on miss, with tests for: unknown type fails closed, schema violation fails closed, same input selects the same entry.

REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY. Adapt the allowlist + schema-colocated-entry + loud-rejection shape into FYD's existing registry. Do not take the package.

CAN IT:
- remove code? No, it adds a small layer.
- remove ambiguity? Yes: unknown types and invalid props become explicit rejections.
- improve beauty? No.
- improve expressiveness? Slightly: schema+render colocation documents each component's contract.
- improve trust? Yes: the registry becomes a named security boundary with validation at the seam.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? Yes: deterministic re-render from the same tree, and the hook-identity rule protects stateful nodes across regenerations.
- reduce AI improvisation? Yes: the allowlist caps what can ever render, even if a future planner misbehaves.

FALSIFICATION EXPERIMENT: Implement the primitive against a scratch copy of FYD's registry. Feed it (a) a section naming an unregistered component, (b) a section naming a registered component with props violating its schema, (c) the same SiteSpec twice. PASS requires: (a) and (b) raise a named, logged rejection (distinguishable from "no data"); (c) selects byte-identical entries. If (a) is indistinguishable from FYD's current silent null in the render model output, the primitive adds no fail-closed value and the verdict drops to REJECT.

---

## CARD 2: rjsf getWidget (schema-driven two-level lookup with loud failure)

PROJECT: rjsf-team/react-jsonschema-form — `getWidget` in `@rjsf/utils` (packages/utils/src/getWidget.tsx)
PINNED SHA: TBD (budget frozen; pin after release)
LICENSE: TBD (verify on pin)
RECENT ACTIVITY: Healthy. Third-party source sweep (2026-08) records v6.0.0 released 2025-10-31 and v6.8.0 on 2026-08-14, `@rjsf/core` ~4.7M downloads/month. Official docs updated within days of 2026-09-21.

FYD PROBLEM: Selecting a component from a JSON Schema (not from a planner-set name): given schema + optional hint, which component renders it, deterministically, with a sane default when no hint is present.

MECHANISM: Pure function `getWidget(schema, widget, registeredWidgets)`. Resolution order, fixed: (1) if `widget` is already a component, return it as-is (wrapped in MergedWidget); (2) if it is a string, look it up in `registeredWidgets`; (3) fall back to a hardcoded two-level table `widgetMap[schemaType][widgetName]` (e.g. `string.textarea` → TextareaWidget, `string` with `data-url` format → FileWidget, `boolean.radio` → RadioWidget); (4) unknown combination throws `` `No widget '${widget}' for type '${type}' in schema` ``. No ranking, no predicates, no negotiation: a lookup table with a fixed key space. The hint travels in `uiSchema['ui:widget']`, read via `getUiOptions`.

EXACT IMPLEMENTATION:
- `packages/utils/src/getWidget.tsx`: `getWidget<T,S,F>(schema, widget: Widget | string, registeredWidgets = {})`; `widgetMap` two-level table keyed by schema type then widget name; `RegistryWidgetsType` (name → Widget map, populated from the `widgets` prop on `Form`).
- Official API reference: packages/docs/docs/api-reference/utility-functions.md ("If no widget component can be found an Error is thrown").
- Tests: not verified in this lane.

CLAIM EVIDENCE: Official docs describe the lookup "based on the schema type and widget name" and the throw-on-miss contract.
SOURCE EVIDENCE: rjsf official utility-functions API reference read 2026-09-21; third-party sweep verified the `widgetMap[schemaType][widgetName]` table and the exact throw message in `packages/utils/src/getWidget.tsx`.
RUNTIME EVIDENCE: none in this lane.
DEPENDENCY COST: the function is tiny but lives in `@rjsf/utils` with rjsf type imports; taking the package means the form system (validators, themes). Harvest the resolution order, not the package.

WHAT FYD ALREADY HAS: selection keyed only by the planner-set component name; no schema-type fallback; silent null on unknown.
WHAT THEY DO BETTER: (1) selection keyed by (schema.type, widget name) with a deterministic default table, so a node with no explicit hint still resolves deterministically; (2) loud fail-closed (throw) on unknown instead of silent null.
WHAT FYD DOES BETTER: FYD keeps one document (SiteSpec) where rjsf needs two (schema + uiSchema); rjsf's two-document split is its most-requested change (issue #701, open since 2017). FYD's planner sets the component explicitly, avoiding hint-resolution entirely for the common case.

SMALLEST HARVESTABLE PRIMITIVE: the resolution-order function (~40 lines): explicit hint → registered map → schema-type default table → throw. For FYD: use it only for the `GenericObjectCard` fallback path (when the planner names no component, resolve by object schema through a fixed table).

REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REPURPOSE. Do not adopt rjsf; repurpose the resolution order for FYD's generic fallback.

CAN IT:
- remove code? No.
- remove ambiguity? Yes: the fixed table and throw remove "which component?" guessing.
- improve beauty? No.
- improve expressiveness? Slightly: schema-type defaults let new object schemas render without planner changes.
- improve trust? Yes: throw-on-unknown is louder than silent null.
- improve mobile? No.
- improve accessibility? No (rjsf itself has open a11y issues, #4567).
- improve performance? No.
- improve regeneration? Yes: pure function of (schema, hint, registry).
- reduce AI improvisation? Yes: the fixed key space caps selection.

FALSIFICATION EXPERIMENT: Build the fallback resolver with a fixed table for three FYD object schemas. Feed it (a) a schema with no table entry and no hint, (b) the same graph twice with registry entries inserted in different order. PASS requires: (a) throws the named error, (b) identical selection both times (registry insertion order must not affect the outcome). If insertion order affects selection, the table is not a pure function and the verdict drops to REJECT.

---

## CARD 3: JSON Forms ranked testers (capability matching with explicit tie-break)

PROJECT: eclipsesource/jsonforms — `@jsonforms/core` renderer registry (`JsonFormsRendererRegistryEntry`, `rankWith`, `RankedTester`)
PINNED SHA: TBD (budget frozen; pin after release)
LICENSE: TBD (verify on pin)
RECENT ACTIVITY: Docs/readmes updated within days of 2026-09-21 (packages/vue/README.md, MIGRATION.md). Project active.

FYD PROBLEM: Capability matching: several components could render a node; pick one deterministically without a name key, and let new components claim node shapes without the planner knowing every name.

MECHANISM: Registry entries are `{renderer, tester}` pairs. `tester: RankedTester = (uischema, schema, context: TesterContext) => number` scores how well the renderer handles the node; `rankWith(n, predicate)` builds common testers (e.g. `rankWith(1, isControl)`). The DispatchRenderer evaluates every tester and picks the max rank. Deterministic given pure testers. Tie-break is explicit and documented: consumer-supplied renderers are tried before built-ins, so "when two testers return the same rank, yours wins". `TesterContext {rootSchema, config}` lets testers resolve `$ref`s without mutating the schema first.

EXACT IMPLEMENTATION:
- `@jsonforms/core` exports: `JsonFormsRendererRegistryEntry`, `RankedTester`, `rankWith`, `Tester`, `TesterContext`; predicates like `isControl`, `isLayout`; DispatchRenderer in the framework bindings (e.g. `@jsonforms/react`, `@jsonforms/vue` with `dispatch-renderer`).
- Usage shape (packages/vue/README.md): `export const entry: JsonFormsRendererRegistryEntry = { renderer: controlRenderer, tester: rankWith(1, isControl) };`
- Tests: not verified in this lane.

CLAIM EVIDENCE: Official readme documents the rank/tie-break contract; MIGRATION.md documents the tester signature and TesterContext.
SOURCE EVIDENCE: eclipsesource/jsonforms packages/vue/README.md, MIGRATION.md, and a downstream consumer doc (synergycodes/workflowbuilder custom-jsonforms-control.md) all read 2026-09-21.
RUNTIME EVIDENCE: none in this lane.
DEPENDENCY COST: `@jsonforms/core` + a renderer set + its state machinery; heavy for the primitive. Testers are arbitrary functions, so the "deterministic" claim rests on tester purity, which the library does not enforce.

WHAT FYD ALREADY HAS: name-keyed selection; no capability matching; no tie-break rule because ties cannot occur.
WHAT THEY DO BETTER: (1) open/closed registration: a new component claims node shapes via its tester without touching the dispatcher; (2) the tie-break rule is written down and consumer-favoring; (3) TesterContext gives matchers schema context ($ref resolution) without pre-mutation.
WHAT FYD DOES BETTER: FYD's planner-assigned name is simpler and already deterministic; JSON Forms cannot guarantee tester purity, so "deterministic" is a convention, not a property; FYD's binding verifier has no equivalent there.

SMALLEST HARVESTABLE PRIMITIVE: ranked dispatch (~30 lines): `Entry = {test: (node) => number, render}` + `dispatch(node, entries)` = argmax with stable tie-break (first registered wins), plus a test locking the tie-break and a test that a second registration with equal rank deterministically loses.

REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY. Capability matching is the wrong default for FYD's small closed component set; name-keyed selection is simpler and already owned. Keep the documented tie-break discipline in mind only if a fallback matcher is ever added.

CAN IT:
- remove code? No.
- remove ambiguity? Partially: ties resolve by written rule, but tester overlap is still a judgment call.
- improve beauty? No.
- improve expressiveness? Yes: components can claim shapes the planner never enumerated.
- improve trust? Weakly: explicit tie-break beats silent first-match, but impure testers are a trust hole.
- improve mobile? No.
- improve accessibility? No.
- improve performance? No (every tester runs per node).
- improve regeneration? Only if testers are pure; not enforced.
- reduce AI improvisation? Mildly: ranking constrains choice, but the choice set is still open.

FALSIFICATION EXPERIMENT: Register three testers where two return rank 5 for the same node shape, one of them impure (reads a module-level counter). Run dispatch 100 times. PASS requires: the pure tester wins every time AND the result is identical across runs; the impure tester must be detectable (write a purity lint: testers may only read their arguments). If the impure tester ever wins or results vary, capability matching is nondeterministic in practice and the verdict stays PATTERN_ONLY (never adopted).

---

## CARD 4: gravity-ui/aikit registries (layered merge + validator colocation + tool dispatch)

PROJECT: gravity-ui/aikit — `MessageRendererRegistry` + toolset (`defineTool`, `createToolset`, `createToolsetRenderer`)
PINNED SHA: TBD (budget frozen; pin after release)
LICENSE: TBD (verify on pin)
RECENT ACTIVITY: Very active: docs/GENUI.md updated ~3 days before 2026-09-21; MessageList/README, AssistantMessage/README, ARCHITECTURE.md, GETTING_STARTED.md all current.

FYD PROBLEM: A type-keyed dispatcher registry with override layering (defaults vs custom), validator colocated with each entry, and a second registry (tool name → component) feeding the same dispatcher.

MECHANISM: Two registries, one dispatcher. (1) `createMessageRendererRegistry()` + `registerMessageRenderer(registry, 'chart', {component | render})`: dispatch by `content.type`; "custom registries are merged with the default registry, so custom renderers can override default ones". (2) Toolset: `defineTool({name, description, parameters, schema: {validate}, component, execute})`, `createToolset(...)`; `createToolsetRenderer(toolset, {onToolResult})` registers a `tool` dispatcher on the `MessageRendererRegistry` so assistant messages render tool components by `toolName`. Implementation module imported as `@/utils/messageTypeRegistry` in their readmes. Selection is pure lookup: content type → renderer; tool name → tool entry → component. No LLM in the render path.

EXACT IMPLEMENTATION:
- Symbols: `createMessageRendererRegistry`, `registerMessageRenderer`, `MessageRendererRegistry`, `MessageContentComponentProps`, `defineTool`, `createToolset`, `createToolsetRenderer`, `applyToolResult`, `toolsetToOpenAIDefinitions`, `useToolset`, `useToolResultContinuation`.
- Docs: docs/GENUI.md (toolset mental model + reference implementation), src/components/organisms/MessageList/README.md (registry API, lazy-renderer code-splitting pattern), src/components/organisms/AssistantMessage/README.md (merge/override semantics).
- Tests: not verified in this lane.

CLAIM EVIDENCE: Docs state the merge/override rule and the tool-dispatcher registration explicitly.
SOURCE EVIDENCE: aikit docs and readmes read 2026-09-21 (GENUI.md lines on toolset → validator + component + execute mapping; MessageList README on registry merge).
RUNTIME EVIDENCE: none in this lane.
DEPENDENCY COST: `@gravity-ui/aikit` plus peer deps (@gravity-ui/uikit, icons, i18n, @diplodoc/transform, highlight.js). Heavy; the primitive (registry + merge + dispatch) is small.

WHAT FYD ALREADY HAS: `getComponentDef` + a `switch` in `renderSection`; no layering; no per-entry validator.
WHAT THEY DO BETTER: (1) layered merge: defaults vs overrides without editing the dispatcher; (2) validator colocated with the component entry (`schema.validate` next to `component`); (3) the dispatcher is data (a registered `tool` handler), not a switch statement in the render path, so adding a component never edits the renderer.
WHAT FYD DOES BETTER: FYD's registry is the product's own, versioned with the render model; no chat-domain coupling; FYD's selection key is planner-assigned rather than model-emitted.

SMALLEST HARVESTABLE PRIMITIVE: `register(type, entry)` + `dispatch(type)` with layered merge (defaults, then overrides win) and entry shape `{component, validate?}`; replace FYD's `switch (section.component)` with a dispatch table built from the registry, plus a test that registering an override replaces the default and that unknown types reject loudly.

REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY. The concrete gap worth closing in FYD is small: replace the `switch` in `renderSection` with registry dispatch so new components do not require editing renderer.tsx. Take the shape, not the package.

CAN IT:
- remove code? Yes, marginally: the switch becomes a table.
- remove ambiguity? Yes: override precedence is a written rule.
- improve beauty? No.
- improve expressiveness? Slightly: layering supports per-site component overrides later.
- improve trust? Yes: validator colocation puts the check at the selection seam.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? Yes: dispatch is a pure function of (type, layered registry).
- reduce AI improvisation? Yes: closed registry, same as Card 1.

FALSIFICATION EXPERIMENT: Replace the `renderSection` switch with a dispatch table in a scratch branch. Register a default and an override for the same component name, then render the same SiteSpec. PASS requires: the override renders, the render model records which layer won, and removing the override deterministically restores the default. If the render model cannot show which layer won, layering is invisible to FYD's determinism story and the change is rejected.

---

## CARD 5: Google A2UI (protocol-level catalog contract; pattern only)

PROJECT: A2UI (Agent-to-User Interface) protocol, a2ui.org; reference SDK `@a2ui-sdk/react`
PINNED SHA: TBD (not a single repo pin; protocol spec + reference SDKs)
LICENSE: TBD (third-party skill doc states Apache 2.0 for the v0.8 public preview, Dec 2025; verify on pin)
RECENT ACTIVITY: Spec evolving: v0.9 is "prompt-first" per a 2026-08 design doc (flat discriminator `{"component":"Text", ...}`, plain-JSON data model, JSON Pointer paths). Multiple independent implementations in progress (MeldUI Vue renderer, Elixir server lib, Angular skill docs).

FYD PROBLEM: A versioned, portable component contract: what does a component catalog look like when it must be machine-readable, negotiated, and enforced at the render boundary rather than living in code?

MECHANISM: The client owns a catalog: a JSON Schema document declaring `catalogId`, a set of `components` (each a JSON Schema of its properties), optional functions and theme. Negotiation is by id: the client advertises `supportedCatalogIds`; the producer picks one and locks it for the surface's lifetime. Components are referenced by a flat discriminator (`{"component":"Text", ...}` in v0.9). The renderer validates each component against the catalog, then maps it to native widgets. Agents (or planners) can only request catalog entries: "agents can only use components from that catalog", "no code execution = no UI injection attacks". Selection = discriminator key → catalog entry → native component. Deterministic and versioned by catalogId.

EXACT IMPLEMENTATION:
- Spec artifacts: `basic_catalog.json` (e.g. https://a2ui.org/specification/v0_9/basic_catalog.json), message types (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`, `userAction`), flat component list with id references.
- Reference implementations: `@a2ui-sdk/react`, `@a2ui/web_core` (message processor, surface state, JSON-Pointer binding), Flutter GenUI SDK (uses A2UI under the hood).
- Tests: not verified in this lane.

CLAIM EVIDENCE: Multiple independent design docs describe the same contract (catalog as JSON Schema, catalogId negotiation, allowlist enforcement).
SOURCE EVIDENCE: meldui/meldui catalog-contract design doc, tale-ui/core a2ui-plan, leonardlooi/database_agent a2ui-protocol reference, jony2176/master-skills A2UI skill doc, all read 2026-09-21. No first-party spec page was opened in this lane; treat protocol details as second-hand until the spec is read directly.
RUNTIME EVIDENCE: none in this lane.
DEPENDENCY COST: protocol adoption cost (catalog authoring, negotiation, reference renderer) rather than a library; only pays off across trust boundaries.

WHAT FYD ALREADY HAS: closed registry, versioned render model, planner-owned selection.
WHAT THEY DO BETTER: the catalog is a portable JSON contract, not code: versioned by catalogId, negotiated explicitly, renderable by any framework's native widgets.
WHAT FYD DOES BETTER: FYD needs no cross-org negotiation and no LLM-friendly flat encoding; the deterministic planner already owns selection, so A2UI's producer/consumer split buys FYD nothing today.

SMALLEST HARVESTABLE PRIMITIVE: the catalog-contract shape: a versioned JSON document mapping component name → JSON Schema of props, with the renderer validating props against the entry before dispatch. (Functionally the same primitive as Card 1's library, minus the compiler.)

REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY. If FYD ever needs a portable, framework-agnostic component contract (e.g. a future native renderer), the catalog-by-id shape is the reference. Today it is a protocol looking for a trust boundary FYD does not have.

CAN IT:
- remove code? No.
- remove ambiguity? Yes, at the contract level (versioned catalogId).
- improve beauty? No.
- improve expressiveness? No for FYD's current surface.
- improve trust? Yes in cross-boundary settings; neutral inside FYD.
- improve mobile? Potentially (same catalog, native widgets), but FYD has no native renderer.
- improve accessibility? No.
- improve performance? No.
- improve regeneration? Yes: catalogId pins the component vocabulary per render.
- reduce AI improvisation? Yes: the catalog is the allowlist.

FALSIFICATION EXPERIMENT: Write FYD's current component set as a JSON catalog (name → props JSON Schema) and validate three real SiteSpecs against it with an off-the-shelf JSON Schema validator. PASS requires: every section in the specs validates and one deliberately invalid section fails. If writing the catalog surfaces props that FYD's registry cannot describe (untyped bags), the catalog adds contract value and stays PATTERN_ONLY with a note; if everything validates trivially, the catalog is ceremony and the verdict drops to REJECT.

---

## KILL LIST (one-line reasons)

- Vercel AI SDK generative UI: ships no selection mechanism; the mapping is userland `switch (tool.toolName)` / part-type branches in app code. Nothing to harvest; the pattern is already understood.
- CopilotKit `useRenderAction`: name-keyed render registry duplicating assistant-ui's legacy toolName → render pattern; adopting it drags the CopilotKit stack for zero new mechanism.
- thesysdev/openui (OpenUI Lang): the LLM authors declarative markup and therefore owns component selection; fails the bounded question (selection is not a deterministic function of structured data).
- `streamUI` / `@ai-sdk/rsc`: deprecated and removed; the LLM selected the tool inside `generate()` at generation time, not a render-path selection mechanism.
- uniformdev/uniform: a trivial type-keyed component registry (`resolveComponentType`) buried in a commercial content platform; FYD already owns this primitive.
- Formily: dormant (no release since 2025-05-15 per third-party sweep); reactive field-graph model with no reusable selection mechanism for this question.
- react-json-view / react-json-editor-ajrm: JSON display widgets; no component selection from structured data at all.
- JavaServerFaces RenderKit: component-family/renderer-type registry is server-side Java; wrong stack, historical note only.
- TanStack AI: isomorphic tool definitions, but client-side component mapping is still userland; no distinct selection mechanism.
- jarenjs/forms: new framework-agnostic form generator; no evidence of a selection mechanism beyond plain schema mapping; not evaluated deeply.

## GitHub API calls used

0. All evidence from web reading (docs, readmes, API references, third-party source sweeps). No api.github.com calls, no clones, no installs. SHA and LICENSE pinning deferred until the budget freeze is released; pin at most the top 2 cards (assistant-ui, rjsf) at 1 repo-endpoint call each.

## Recommendation for the parent

The bounded question is already answered inside FYD: the mechanism that selects components deterministically with no LLM in the render path is a **name-keyed registry** (`getComponentDef`), and FYD owns it. The harvest adds discipline around it, in priority order:

1. **Loud rejection + per-entry props schema** (assistant-ui Card 1, A2UI Card 5): unknown types and invalid props fail closed with named errors, and the render model records the rejection. Smallest change, biggest trust gain.
2. **Replace the `renderSection` switch with registry dispatch** (aikit Card 4): new components register instead of editing renderer.tsx; keep layered override semantics in mind for later.
3. **Schema-type default table for the generic fallback** (rjsf Card 2): only for `GenericObjectCard` when the planner names no component; fixed table, throw on miss.
4. **Do not adopt capability matching** (JSON Forms Card 3): the wrong default for a small closed set; name-keyed selection stays.
