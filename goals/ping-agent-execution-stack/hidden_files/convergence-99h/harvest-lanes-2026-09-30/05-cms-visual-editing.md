# READER LANE 5: CMS / VISUAL EDITING / GENERATED EXPERIENCES

Date: 2026-09-30 ~18:10 MDT. Read-only reconnaissance. Nothing installed, modified, committed, or pushed. Only write target is this report.

Lane question: WHAT CODE CAN WE DELETE OR NEVER WRITE BECAUSE THIS ECOSYSTEM ALREADY SOLVED THE COMMODITY PART?

Short answer: never hand-build a drag-and-drop page-builder shell, a schema-driven admin CMS backend, or a rich-text editor. Puck already solved the editor shell as a self-hosted MIT package whose config/data model maps cleanly onto SiteSpec; Payload solved the config-as-code blocks pattern and the Lexical rich-text integration; Sanity solved the editor-as-projection overlay pattern. All three backends (Payload's Postgres, Sanity's content lake, Builder.io's SaaS) are competing truth stores and must stay out: truth remains upstream in the object graph, the editor manipulates SiteSpec only.

## 0. Search record: FYD, PING, CRX (before any external evaluation)

### Where I searched
- FYD source: `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/` (the product-lane copy; `grep` shows it matches the PING tree at `~/workspace/lane-p01/tree/src/fyd`).
- PING monorepo: `~/workspace/lane-p01/tree/src/fyd` (local worktree of piging2/PING).
- CRX: `~/workspace/crx-convergence-sweep/inventory-2026-09-28-t0.md` and `~/workspace/your_files/crx-runtime-analysis/crx-runtime-file-by-file-analysis.md`.
- UNREACHABLE from this VM: `/home/nolan/projects/ping`, `/home/nolan/projects/ping-fyd-converged`, `/home/nolan/workspace` (no such paths; this VM is /home/hatch). Pig-local state was not consulted; the local copies above are the freshest evidence available here.

### FYD current: SiteSpec and the deterministic renderer (verified in source)
- `src/fyd/sitespec/types.ts`: `FYDSiteSpec` (kind `fyd.sitespec@1`) is DATA, never generated JSX. Pages hold sections: `FYDSection = { id, component (registry name, e.g. "Hero"), query: FYDQuery, presentation: FYDPresentation }`. Queries declare HOW to fetch objects (`owner | related | all | reference | static`), never the objects themselves. Theme tokens (`FYDThemeTokens`) are the design-system compiler input: the LLM/agent proposes INTENT patches, the owner approves, the compiler renders. "No arbitrary CSS generation, ever." Lifecycle extensions: `status: draft|published`, `revision`, `archetype`, `objectPresence`.
- `src/fyd/sitespec/render-model.ts` + `src/fyd/components/renderer.tsx`: render is `(SiteSpec + ObjectGraph + ViewerContext + ViewportCapabilities)` resolved through `resolveQuery` (deterministic ordering: updatedAt desc, id tiebreak). Same inputs always yield the same semantic render model. One semantic SiteSpec across viewports (mobile-first SSR baseline, CSS projection per viewport).
- `src/fyd/sitespec/binding-verifier.ts`: the factual-binding gate at the evidence/object-graph projection seam. Presentation bindings are classified `direct | derived | generated | owner_authored`; UNBOUND bindings fail closed at the emission gate. This is the seam any visual editor's output must pass through.
- Existing edit machinery (no drag-and-drop editor exists): Ask FYD site-patch proposals (`src/fyd/ask/site-patch.ts`) draft `SitePatchOperation` lists (`reorder_section_objects | set_presentation` in `src/lib/ping/types.ts`), bound to the exact spec digest; the human approves the exact digest; application goes through the governed event path, never by the agent. Owner-mode customize panel (`src/fyd/owner-mode/`), `src/fyd/customize/` (intent -> propose -> apply-layer), builder composition draft/published lifecycle with revision history, `patch-loop.ts` overrides.
- Verified ABSENT from FYD: no drag-and-drop, no block editor, no WYSIWYG, no rich-text engine (`lexical | portabletext | richtext | prosemirror | tiptap` return zero hits in `src/fyd`), no CMS dependency in `package.json`, no Puck/Payload/Sanity/Strapi references (grep hits for "payload" are request-payload false positives).

### PING existing
The object graph (`PingObject` / `PingRelationship`) is the upstream truth the SiteSpec compiler reasons over. PING has no CMS, no visual editor, no block/page-builder machinery. Nothing to delete here; the graph stays the single truth store.

### CRX harvestable
None. CRX is the agent runtime (inventory covers Mission Control dispatch, tenant hardening, approvals, budgets). No visual-editing or CMS implementation exists in the CRX mine. Not a source for this lane.

### SiteSpec vs object graph (the relation the binding constraint rests on)
SiteSpec is a deterministic projection input, not a store. The generator compiles `(ObjectGraph + evidence + owner assertions)` through the BindingVerifier into a SiteSpec; the renderer compiles `(SiteSpec + ObjectGraph snapshot + ViewerContext)` into UI. Sections bind objects by query at render time, so a spec edit can never silently become a fact edit: changing what is SHOWN requires either changing the query/presentation (spec surface) or changing the graph (truth surface), and the verifier keeps those surfaces distinct. Any editor lives strictly on the spec surface.

## 1. Candidate evaluations

### Candidate A: Puck (@puckeditor/core, puckeditor/puck)

PRODUCT NEED -> A future "owner edits site visually" flow: drag-and-drop composition, field inspector, inline text editing, and page JSON export, without hand-building an editor shell.

FYD CURRENT IMPLEMENTATION -> None. FYD has a component registry (`src/fyd/components/registry.ts`), a deterministic renderer, and proposal-based editing (site-patch ops), but no visual editor, no drag-and-drop, no field inspector, no inline editing.

PING EXISTING IMPLEMENTATION -> None. No editor machinery in the PING tree.

CRX HARVESTABLE IMPLEMENTATION -> None. CRX has no visual editing.

EXTERNAL IMPLEMENTATION -> VERIFIED against primary sources (puckeditor.com docs, github.com/puckeditor/puck, both read 2026-09-30). Puck is MIT-licensed, now published as `@puckeditor/core` (renamed from `@measured/puck`). Three-part architecture: (1) Config registers components, their render functions, their editable fields, and category grouping; (2) the `<Puck>` component renders the full editor UI (drag-and-drop, field panel) and exports pages as JSON on publish; (3) `<Render>` renders the JSON. Data model: `{ content: [{ type, props: { id, ...fields } }], root: { props }, zones }` where `zones` is being deprecated in favor of `slot` fields. Fields include `text` with a `contentEditable` option for inline text editing (the prop becomes `string | ReactNode` in the editor). Puck AI (commercial, via cloud.puckeditor.com signup) adds assembly mode (generate pages by assembling the config's existing components), design mode (invent new components on the fly), headless generation, tools, business context, and an "AI Configuration" guide for constraining output to be deterministic.

REACHED/UNREACHED -> REACHED. Docs and repo verified live.

DUPLICATION RISK -> If wrapped: LOW (we own no editor). If we ever hand-build a visual editor: HIGH, we would reimplement Puck's dnd/palette/inspector/inline-editing wholesale.

SECURITY/TRUST BOUNDARY -> Core `@puckeditor/core` is self-hosted, no network calls, MIT: no trust boundary beyond normal npm supply chain. Puck AI/Cloud is a hard boundary: tenant page data and component schemas leave the tenant for their service; design mode generates arbitrary components, which directly violates FYD's locked law "No arbitrary CSS generation, ever" and the design-system compiler. Only assembly mode against the registered FYD component set is architecturally admissible.

SMALLEST DELTA -> An adapter module, no new authority: (a) a Puck `Config` generated from FYD's component registry (registry name -> Puck component, editable surface = FYDPresentation fields + theme tokens); (b) export `SiteSpec + resolveQuery(graph)` -> Puck data JSON (queries snapshotted into props); (c) import: diff published JSON against the draft spec and classify each change: presentation-surface changes -> `set_presentation` ops, reorderings -> `reorder_section_objects` ops, factual value changes -> fail closed into the owner-assertion / proposal path (the BindingVerifier already decides these classes); (d) publish routed through the existing digest-bound site-patch approval, then revision++ on the draft/published lifecycle. The editor manipulates SiteSpec only; the graph is never touched by the editor.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> WRAP. Put Puck's editor behind our interface (config generated from our registry, data mapped to/from SiteSpec, publish through our proposal gate). Never adopt Puck Cloud AI; if AI generation is wanted later, only assembly mode over registered components.

### Candidate B: Payload CMS (payloadcms/payload)

PRODUCT NEED -> Schema-driven content administration: typed collections, page composition from blocks, rich-text editing, drafts/versioning, media management.

FYD CURRENT IMPLEMENTATION -> None as a backend. The closest internal shape is SiteSpec's section list plus the customize/ propose pipeline, but there is no admin UI, no collection schema system, no versioning UI.

PING EXISTING IMPLEMENTATION -> The object graph plus event/journal machinery already stores versioned, typed objects with provenance. A second content database would duplicate this.

CRX HARVESTABLE IMPLEMENTATION -> None.

EXTERNAL IMPLEMENTATION -> VERIFIED against primary sources (github.com/payloadcms/payload releases page, official docs on GitHub, read 2026-09-30). Latest stable is v3.90.0 (released 2026-09-18), a security release: session revocation on password change, SVG/XML upload hardening, client-upload hardening, API-key reveal restrictions. This confirms the prior intelligence (3.90.x; 4.0 remains canary/unverified here). Architecture: config-as-code collections inside the Next.js app (`/admin` route), Postgres, generated types, Local API (`getPayload` in-process queries). The two harvestable patterns: (1) the `blocks` field for page composition (`{ name: 'layout', type: 'blocks', blocks: [HeroBlock, ...] }` with per-block slug + fields + a React render component, block references for reuse); (2) rich text via `@payloadcms/richtext-lexical` (Lexical JSON tree storage, `BlocksFeature` embedding structured blocks inside rich text, React renderer package, "never dangerouslySetInnerHTML").

REACHED/UNREACHED -> REACHED. Version and features verified against official sources.

DUPLICATION RISK -> As a dependency: HIGH and architectural, not just code. Payload owns its own Postgres truth store, its own auth/admin surface, its own media library: a competing source of business truth next to the object graph, violating the Rule of One (one knowledge/truth authority). As a pattern source: LOW.

SECURITY/TRUST BOUNDARY -> Self-hosted, but we would inherit a large attack surface: the 3.90.0 release notes are a catalog of it (auth sessions, upload pipelines, XML/SVG parsing, multipart handling). An admin UI is a new privileged surface requiring tenant auth, hardening, and audit. No external data egress, but meaningful new inbound risk.

SMALLEST DELTA -> Zero dependency delta: do not install. The harvestable delta is the blocks-field SCHEMA SHAPE for any future JSON page-composition surface (block slug + typed fields + render component registry), which SiteSpec's `FYDSection{component, query, presentation}` already generalizes. Nothing to port today; keep the pattern on file.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> LEARN. Study the blocks-field composition pattern and the Lexical rich-text integration shape; reject Payload as a dependency (competing truth store + admin attack surface we do not need).

### Candidate C: Sanity (schema-driven content lake + Presentation tool)

PRODUCT NEED -> The editor-as-projection pattern: visual click-to-edit on the served page itself, schema-driven content model, live preview.

FYD CURRENT IMPLEMENTATION -> FYD already separates schema (SiteSpec types + zod-style schemas in `src/fyd/sitespec/schemas.ts`, validator.ts) from rendering, and the render-model is a deterministic projection. What FYD lacks is the reverse affordance: clicking a rendered element to edit it.

PING EXISTING IMPLEMENTATION -> None for visual editing.

CRX HARVESTABLE IMPLEMENTATION -> None.

EXTERNAL IMPLEMENTATION -> REACHED (official docs sanity.io/docs verified via secondary citations; Presentation tool, VisualEditing, stega encoding confirmed across multiple independent project docs). Architecture: content lake (hosted), `defineType/defineField/defineArrayMember` schema authoring, Studio editor, GROQ queries, Portable Text. The harvestable pattern is the Presentation tool: the served page carries stega-encoded edit metadata, a `<VisualEditing />` overlay scans the page and renders click-to-edit affordances, edits land in the content lake (their truth), with draft-mode live preview and drag-and-drop reordering of array fields. Schema guidance is "model data, not presentation," which matches our law that truth stays upstream.

REACHED/UNREACHED -> REACHED (docs verified; version numbers intentionally not asserted).

DUPLICATION RISK -> As a dependency: HIGH. Sanity's content lake would be a second truth store competing with the object graph, and its Studio would duplicate the Mission Control/owner-mode surface. As a pattern: LOW, we have no overlay editing.

SECURITY/TRUST BOUNDARY -> Hosted SaaS: all tenant business content would live in Sanity's cloud (data egress, vendor retention, token/CORS management for the Studio). Stega-encoded edit metadata in served HTML leaks edit affordances to anyone viewing source. Unacceptable under the own-the-state-that-must-survive-vendors posture.

SMALLEST DELTA -> No code. The pattern to internalize for the future owner visual-edit flow: render the deterministic render model with edit affordances keyed by (pageSlug, sectionId, binding classification); a click opens the field editor; the edit is classified by the BindingVerifier (presentation -> site-patch op; factual -> owner assertion path) before it ever becomes a proposal. This is Sanity's overlay idea with our spec/proposal machinery substituted for their content lake.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> LEARN. Adopt the overlay pattern mentally; never the hosted service.

### Candidate D: Builder.io (visual headless CMS + Fusion + Publish)

PRODUCT NEED -> AI-assisted visual development: Figma-to-code, drag-and-drop publishing, A/B testing, personalization.

FYD CURRENT IMPLEMENTATION -> None, and none needed: FYD's generator already compiles sites from the object graph, and the design-system compiler already owns styling.

PING EXISTING IMPLEMENTATION -> None.

CRX HARVESTABLE IMPLEMENTATION -> None.

EXTERNAL IMPLEMENTATION -> REACHED (github.com/BuilderIO/builder README verified live 2026-09-30; builder.io product pages). Positioned in 2026 as an AI-assisted visual development platform: Fusion (Figma-to-React/Next.js code), Publish (drag-and-drop CMS, A/B testing, personalization), framework SDKs. Open-source repo exists, but the product is the hosted platform: content lives in Builder's API, publishing flows through their service.

REACHED/UNREACHED -> REACHED.

DUPLICATION RISK -> As a dependency: HIGH. It is a full parallel stack: its own content store, its own component registration, its own publishing pipeline, its own AI generation. Adopting it would strand SiteSpec, the deterministic renderer, and the BindingVerifier.

SECURITY/TRUST BOUNDARY -> Worst of the lane. Hosted SaaS with tenant content egress; open security issue #4501 (cross-origin code execution via unvalidated postMessage in builder-block, CWE-346); issue history shows CSP/eval problems and Node 24 install breakage. Vendor lock-in on the publishing path.

SMALLEST DELTA -> None. There is no small delta; any adoption replaces our projection pipeline with theirs.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> REJECT. Commercial SaaS truth-store dependency with open XSS-class issues; it solves the wrong problem (we need an editor over OUR spec/graph, not their platform).

### Candidate E: Lexical (rich-text editing primitive)

PRODUCT NEED -> Real rich-text editing for the day `FYDPresentation.copy` (currently a plain string) needs formatting, links, or embedded blocks, e.g. owner copy-editing flows.

FYD CURRENT IMPLEMENTATION -> None. Zero rich-text machinery anywhere in `src/fyd` (verified by grep). Copy edits today are plain-string presentation overrides.

PING EXISTING IMPLEMENTATION -> None.

CRX HARVESTABLE IMPLEMENTATION -> None.

EXTERNAL IMPLEMENTATION -> REACHED via Payload's official docs (the `@payloadcms/richtext-lexical` integration, verified above) and the independent dev.to field-shape writeup (2026-09-23, Lexical JSON tree: root -> paragraph/heading/list nodes, each node typed with version). Lexical is the Meta-built editor framework Payload standardized on; JSON tree storage (not HTML strings); Payload's pattern renders via a dedicated React package and forbids `dangerouslySetInnerHTML`. Plate (Slate successor) is the same idea in the Decap CMS lineage; the commodity is the JSON-tree rich-text model, Lexical is its most deployed instance.

REACHED/UNREACHED -> REACHED (as integrated and documented by Payload; Lexical's own repo not separately opened, but the integration contract is fully evidenced).

DUPLICATION RISK -> LOW. We have no rich-text code to duplicate; the gap is real (plain-string copy only). Wrapping Lexical fills it without touching truth: rich text is presentation.

SECURITY/TRUST BOUNDARY -> Self-hosted library, no network, no data egress. The boundary to enforce is at render: Lexical JSON -> our React renderer only (the Payload rule: never `dangerouslySetInnerHTML`), and pasted content must pass through the BindingVerifier classification (pasted factual claims are `generated` at best, never `direct`).

SMALLEST DELTA -> When the need arrives: a Lexical editor instance bound to one presentation field, serializing to the Lexical JSON tree, stored as a structured `copy` value, rendered by a small deterministic JSON->React renderer, with the tree's text extractions classified by the verifier. No new store (it rides on the spec's presentation surface), no new authority.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> WRAP. When rich text is needed, wrap Lexical behind the presentation-binding seam; never write a rich-text engine.

## 2. Cross-cutting findings

Component-config schemas: CAN SiteSpec map to them? Yes, with one principled impedance mismatch. Puck's Config (components + fields + render) maps to FYD's component registry + editable presentation/theme surface; Puck's data `{content: [{type, props}]}` maps to `FYDPage.sections` with `type = section.component`. The mismatch is semantic and load-bearing: Puck props EMBED content values; SiteSpec sections BIND via `FYDQuery` to the object graph. The adapter resolves this at the boundary: export snapshots queries into props; import diffs props and classifies changes through the BindingVerifier. This preserves the binding constraint (editor manipulates SiteSpec, never owns truth) mechanically, not by convention.

What we can DELETE or NEVER WRITE (the lane's deliverable):
1. Never write a drag-and-drop page-builder shell: wrap `@puckeditor/core` (MIT, self-hosted) with a SiteSpec adapter.
2. Never write a schema-driven admin CMS backend (collections, migrations, admin auth, media library, versioning UI): the object graph + event/journal is the store; Payload's backend is a competing truth authority and stays out.
3. Never write a rich-text editor: wrap Lexical when `FYDPresentation.copy` outgrows plain strings.
4. Never write visual-overlay editing plumbing from scratch: Sanity's Presentation/stega-overlay pattern is the reference design for click-to-edit on the deterministic render model.
5. Never write a component-config schema: Puck's Config/fields schema is the reference shape for registering editable components.

What a future "owner edits site visually" flow needs from SiteSpec (no substrate contamination): nothing structural. It needs (a) the existing draft/published + revision lifecycle as the edit sandbox, (b) the digest-bound site-patch proposal + human approval as the publish gate, (c) the BindingVerifier classification as the import filter for editor-produced values, and (d) an adapter that speaks Puck JSON on the outside and SitePatchOperations on the inside. All four exist or are small adapters; no new store, no new authority, no truth migration.

## 3. Ranked candidates

1. Puck (@puckeditor/core): WRAP: MIT self-hosted editor whose config/data model maps onto SiteSpec via a small adapter; publish flows through the existing digest-bound proposal gate.
2. Lexical (rich-text primitive): WRAP: fills FYD's verified rich-text gap behind the presentation-binding seam when plain-string copy stops sufficing; never build a rich-text engine.
3. Sanity Presentation pattern: LEARN: the editor-as-projection overlay (click-to-edit on the served render) is the reference design for owner visual editing; the hosted content lake stays out.
4. Payload blocks/lexical patterns: LEARN: blocks-field composition schema and Lexical integration are the reference implementations to copy from; the CMS backend is rejected as a competing truth store.
5. Builder.io: REJECT: hosted SaaS parallel stack with open XSS-class issues; adopting it would strand SiteSpec and the deterministic renderer.
