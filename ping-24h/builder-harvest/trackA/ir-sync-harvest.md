# ECOSYSTEM HARVEST: Site IR, Patch Streams, Sync, CMS
Track A of the Website Builder Harvest program. Owner order 2026-09-28 ~16:54 MDT, Nolan Geske.
Web research only. No code copied. No FYD tree touched. No pig touched.
Date: 2026-09-28.

Fixed ground this harvest does not argue against:
- FYD owns SiteSpec as its deterministic site IR. No rename.
- Mutation direction: AGENT -> TYPED PATCH STREAM -> VALIDATE -> PREVIEW -> APPROVE -> APPLY. Never agent-generates-JSX.
- PING canonical events stay underneath everything. CRDT semantics never become canonical.

---

## 1. Independent SiteSpec project (sitespec/sitespec)

PRIMITIVE: A deterministic, Git-native site contract for content-driven static websites. Source of truth is the repo: specs, content, design tokens, component contracts, site shell. `@sitespec/core` resolves the contract; Astro is only the rendering layer. Repo: https://github.com/sitespec/sitespec

LICENSE: MIT. Verified on repo page and root LICENSE file.

MATURITY: Early. Created 2026-09-05, 31 commits, 0 stars, 50 releases/changesets, engine 0.8.0, document format specVersion "0.7". JSON Schemas and validation are the machine-readable source of truth; the README is explicit that the project is early-stage. Single maintained template plus marketing example. Treat ideas as design transfer, not as a stable dependency.

DEPENDENCY COST: npm packages: `@sitespec/core`, `@sitespec/astro`, `@sitespec/cli`, `@sitespec/template`, `@sitespec/create`. Node 22+. Renderer coupling is the real cost: resolution is in core but the production path is Astro-first. Taking the IR concepts costs nothing; taking the packages means adopting Astro as the render layer.

DATA MODEL: Page Spec (id, route, archetype, paths) + typed content collections (Markdown/YAML/JSON entries with a collection.yaml manifest and field schemas, draft status) + generic relations between entries/collections + declarative content queries (filters, deterministic sort, pagination) + SEO contract + Design System contract + Site Shell. Resolution order is explicit and fixed: content, relations, queries, routes, and final props resolve in `@sitespec/core` BEFORE component validation; Astro components receive resolved props only. Props use `$ref: "entry:title"` style object references, never copied facts.

MUTATION MODEL: Git-native. Mutations are edits to spec/content files in the repo. No API write path exists; there is no server, no drafts table, no CMS runtime. A runtime CMS is not required by design.

UNDO MODEL: Git history. Undo is a revert/commit; there is no soft-undo, no in-product undo stack.

PREVIEW MODEL: `npm run preview` (static Astro preview) plus a live Design Lab that renders real tokens, UI state matrices, form compositions, sections, themes, stress fixtures, and responsive page previews directly from the installed Design System without adding preview behavior to production routes. Preview is build-based, not data-based.

COMPONENT MODEL: Page -> Section -> UI boundary. Controlled section composition: page specs declare sections with `use:` references to registered section components; sections consume resolved props. UI variant x state contracts are first-class (interaction/form states, native form primitives, deterministic Design Lab preview selectors). Design System contract ships exported UI primitives, section libraries, shell packs, themes, layout conventions, semantic tokens, local fonts, and controlled site token extensions. Components render resolved props only; content loading, relation resolution, filtering, sorting, pagination stay out of component implementations.

THEME MODEL: First-class Design System contract with semantic tokens, theme packs, light/dark shell demonstration (preference persistence, accessible mobile nav), and controlled site token extensions. UI primitive styles obey the same semantic-token rules as sections and shell.

AGENT MODEL: Agent-inspectable by design: `site spec --json`, `site spec design-system --json`, `site spec content --json`, `site spec collection:X --json`, `site spec entry:X/y --json`. Source/output validation is a CLI command (`npm run validate`). The AGENTS.md pattern in templates instructs agents to keep content selection in Page Spec, resolve through entry:/query: refs, and never maintain parallel path lists. Migration tooling is evidence-first: production audit, live DOM segmentation, multi-page Design System analysis, explicit foundation/UI/component/shell review, implementation inference, non-destructive staging.

COLLABORATION MODEL: None. Single-agent, single-writer Git workflow. No concurrency semantics beyond git.

EXPORT MODEL: Static output (Astro build, GitHub Pages deployment). Canonical/hreflang, OG/Twitter, JSON-LD, sitemap, robots, llms.txt, RSS, and generated social images come from the spec without project-level Astro configuration. Media pipeline produces responsive srcset, AVIF/WebP, intrinsic dimensions, crop/focal-point controls.

WHAT FYD CAN HARVEST:
1. The ref/query resolution contract: `$ref: "entry:title"` and `query:<id>.items` resolved in core before component validation. This is the same direction as FYD's object references and queries, and it is battle-shaped (SEO strings, route params via `{ $ref: param:slug }`, draft filtering where normal queries include only published entries).
2. Dynamic route expansion discipline: every production path must be declared in `page.paths`; no network or runtime route discovery allowed. Deterministic route sets keep builds and previews reproducible.
3. Design System as a spec artifact (semantic tokens, variant x state contracts, controlled token extensions) rather than as component code. A JSON-Schema-machine-readable theme contract that agents can read and mutate as data.
4. Evidence-first migration pipeline (audit -> DOM segmentation -> design system analysis -> staged, non-destructive materialization) as the shape for onboarding existing customer sites without a rewrite.
5. Agent inspection CLI surface: a `site spec --json` family of read endpoints is a small, high-leverage addition that makes any agent's job dramatically easier.

---

## 2. json-render (vercel-labs/json-render)

PRIMITIVE: Generative UI framework. AI generates interfaces as JSON specs constrained to a developer-defined catalog; renderers turn specs into real UI. The primitive is the catalog-constrained spec, not free-form code. Repo: https://github.com/vercel-labs/json-render

LICENSE: Apache-2.0. Verified on repo page.

MATURITY: High and fast-moving. 18,379 stars, 974 forks, 230 commits, 233 releases. Created 2026-01-14. npm packages `@json-render/core`, `/react`, `/vue`, `/svelte`, `/solid`, `/shadcn`, `/react-native`, `/next`, `/tanstack-start`, `/remotion`, `/react-pdf`, `/react-email`, `/ink`, `/image`, `/directives`, `/codegen`, `/devtools`, `/redux`, `/zustand`, `/jotai`, `/xstate`, `/mcp`, `/yaml`. Broad renderer coverage including full apps (Next.js/TanStack Start), video, PDF, email, 3D.

DEPENDENCY COST: `@json-render/core` plus one renderer package. Zod is required for catalog schemas. The cost is the catalog discipline: every component the agent may emit must be pre-registered with a Zod props schema and description, and a registry must map catalog types to real implementations. New component = catalog entry + registry implementation + prompt regeneration. That is the entire guardrail mechanism.

DATA MODEL: Flat element map with a root key: `{ root: "card-1", elements: { "card-1": { key, type, props, children: [child keys] } } }`. Children are key arrays, never nested objects. Props support dynamic expressions: `$state` (reads from a state model), `$cond/$then/$else`, `$template` (string interpolation), `$computed` (registered function), `$bindState` (two-way binding). Visibility conditions are declarative (`visible: [{ $state: ... }]`). State watchers react to state changes and trigger named actions. Deterministic directives (`$format`, `$math`, `$concat`, `$count`, `$truncate`, `$pluralize`, `$join`, `$t`) let specs express dynamic values without the LLM computing them.

MUTATION MODEL: JSONL patch streams. Patch format per line: `{"op":"set","path":"/root","value":"..."}` and `{"op":"set","path":"/elements/{key}","value":{...}}`. Ops: `set`/`add`/`replace` (write value to path), `remove` (element deletion; downstream projects cascade to descendants and clean parent children refs). `createSpecStreamCompiler` processes chunks incrementally, returning `{ result, newPatches }` per chunk so renderers can display partial UI as streaming proceeds. Catalogs generate the typed system prompt (`catalog.prompt()`), so the model emits patches constrained to known components and actions. Targeted repair is a first-class use: on validation failure, emit focused patches (`{"op":"replace","path":"/charts/1/type","value":"bar"}`) instead of rewriting the whole spec, which cuts token use to the delta.

UNDO MODEL: No built-in undo. The flat key-addressed map plus op-based patches makes undo implementable as inverse-patch stacks or snapshot-per-patch-batch; the framework does not ship one.

PREVIEW MODEL: `<Renderer spec registry>` renders specs in real time, including partial specs mid-stream. Provider stack: DataProvider, VisibilityProvider, ValidationProvider, ActionProvider around the Renderer. A devtools package provides a panel UI, event store, picker, and stream taps. Persistence is application-owned (examples save prompts/specs to Postgres via Drizzle; a dashboard example adds drag-drop reorder persisted to DB and edit-mode refinement via follow-up prompts).

COMPONENT MODEL: Catalog = component name -> Zod props schema + description. Registry maps catalog types to framework implementations. Components receive `element` (key, type, props, children keys, visible), rendered `children`, and `onAction`. 36 pre-built shadcn/ui components ship. Actions are catalog-declared named operations (`export_report`, `refresh_data`) wired by the registry to real calls (REST fetch with toast feedback in the example).

THEME MODEL: Not a json-render concern. Theming comes from the registered implementations (Tailwind/shadcn in practice). No theme contract in core.

AGENT MODEL: The catalog IS the agent contract: `catalog.prompt()` produces the typed system prompt, Zod schemas constrain generation, and the JSONL patch stream is the agent's output channel. An MCP package (`@json-render/mcp`) integrates with Claude/ChatGPT/Cursor/VS Code. A YAML wire format with streaming parser and AI SDK transform exists. The agent never emits code; it emits typed patches against the catalog.

COLLABORATION MODEL: None built in. Multi-writer conflicts are not modeled.

EXPORT MODEL: `@json-render/codegen` generates code from UI trees; PDF/email/image/video renderers produce those artifacts natively. The spec itself is the portable artifact (JSON/YAML).

WHY PATCH STREAMS BEAT GENERATED JSX FOR FYD: (1) The agent's output is bounded by the catalog: it cannot emit an unknown component, an untyped prop, or arbitrary code, so validation happens at the schema level before anything renders. JSX lets the agent invent APIs, import anything, and hide logic in code that no validator can check. (2) Patches are surgical and streamable: targeted repair exchanges only the delta, cutting token cost and making every change reviewable line by line. JSX regenerations are all-or-nothing. (3) The same patch contract serves every consumer: visual editor drag-drop, chat customization, API, agent, and MCP all emit the same `{"op","path","value"}` lines. JSX forks the mutation path by producer. (4) Approval and preview hook naturally into the stream: render partial specs as they arrive, validate each patch, and gate apply. With JSX there is nothing to gate until the full artifact exists.

WHAT FYD CAN HARVEST:
1. The exact patch line contract (`op` in set/add/replace/remove, JSON-pointer `path`, `value`) as the shape of FYD's typed patch stream, with validation between every patch and render.
2. Catalog-driven prompting: generate the agent's system prompt from the component catalog so the prompt and the validator can never drift.
3. Targeted repair on validation failure: ask the agent for focused patches, not full rewrites.
4. Deterministic directives (`$format`, `$math`, `$count`, `$pluralize`) so agents pick evidence and phrasing while the machine computes numbers: directly relevant to FYD sections that render business data.
5. `createSpecStreamCompiler` incremental compilation as the pattern for FYD's PREVIEW stage: progressive render during the patch stream.

---

## 3. Vercel AI SDK UI (vercel/ai, ai-sdk.dev)

PRIMITIVE: Provider-agnostic TypeScript toolkit for AI apps: one API for text, structured objects, and tool calls, with first-class streaming and UI hooks. It is the transport and structure layer for agent-driven UI, not a UI framework itself.

LICENSE: Apache-2.0. Verified across docs; repo https://github.com/vercel/ai.

MATURITY: De facto standard for TypeScript AI apps. Core functions: `generateText`, `streamText`, `generateObject`, `streamObject`, `tool()`. UI hooks: `useChat`, `useCompletion`, `useObject` for React, Vue, Svelte. Agent support: `ToolLoopAgent` (model plus tools in a loop with typed stream parts). Runs on Node and edge runtimes, framework-agnostic despite the Vercel name.

DEPENDENCY COST: `ai` plus provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, ...). Zod (or compatible) for schemas. The cost is architectural: conversation memory is caller-owned (no memory primitive; history must be persisted externally and passed back). Using it as a transport means owning session storage and the tool-execution sandbox.

DATA MODEL: Structured outputs bound to Zod schemas via `generateObject` (returns typed `.object`) and `streamObject` (incremental, each yield fully typed). In 4.x, validation is strict: partial matches fail and retry inside the loop rather than being tolerated. Message shapes are typed (`CoreMessage`) and compose with external storage.

MUTATION MODEL: Not a mutation framework. Tools are the mutation path: the model emits `tool-call` stream parts, the application executes, results feed back into the loop (`maxSteps` bounds rounds). The 4.x line emits typed `text-delta` / `tool-call` / `tool-result` stream parts so a UI can reflect tool execution in real time.

UNDO MODEL: None. Undo belongs to whatever system the tools mutate.

PREVIEW MODEL: `useObject` streams a partially-typed object into React state as the model emits; `useChat` streams messages including tool-call parts. Preview of a patch stream is trivially built on `useObject`/`useChat` by mapping stream parts to patch lines.

COMPONENT MODEL: None shipped. The SDK deliberately stops at the stream; rendering is the application's job. This is the seam where json-render-style catalogs or FYD's own renderer attach.

THEME MODEL: None.

AGENT MODEL: `ToolLoopAgent` runs the model/tool loop with per-tool approval hooks. Tool-level `needsApproval` (boolean or async predicate on input) is the gate; the security-critical property is that the unapproved path cannot reach `execute` and authorization checks live inside the tool, not in the UI: approval is consent, never authorization. Memory is external. Retrieval tools are the canonical long-term memory pattern.

COLLABORATION MODEL: None.

EXPORT MODEL: None; the SDK produces values (text, objects, tool results), and the application persists them.

WHAT FYD CAN HARVEST:
1. `generateObject`/`streamObject` with Zod schemas as the typing layer for patch payloads: the agent's patch stream values can be schema-bound at generation time, not just validated after.
2. Typed stream parts (`text-delta`/`tool-call`/`tool-result`) as the wire shape for the AGENT -> PATCH STREAM -> VALIDATE -> PREVIEW stages: one stream carries narration and mutations distinctly.
3. The approval/authorization separation: per-tool `needsApproval` gates execution, but entitlement checks stay inside the mutation contract. For FYD this is the formal argument for the Paperboy principle: the agent's patch stream must pass through the same validate/authorize/apply path as every other writer.
4. Caller-owned memory as a design constraint: FYD's conversation and patch history belong in PING events, not in the SDK.

---

## 4. Payload CMS (payloadcms/payload)

PRIMITIVE: Code-first headless CMS and full-stack TypeScript app framework. Collections and fields defined in TypeScript; auto-generates admin panel, REST/GraphQL APIs, and TypeScript types. v3 runs natively inside a Next.js app via the Local API. Repo: https://github.com/payloadcms/payload

LICENSE: MIT. Verified in official docs ("fully open source with an MIT license") and multiple current skill files.

MATURITY: High. 25k+ stars. v3 is the Next.js-native line (no standalone Express server). April 2026 shipped an AI evaluation suite (measures how well AI tools generate Payload code) and AI auto-embedding for RAG. Postgres, MongoDB, SQLite adapters; S3/R2 storage adapters. Jobs queue for scheduled publishing.

DEPENDENCY COST: Heavy if adopted as a product (full framework, Next.js-coupled in v3). Harvest-only cost: patterns, not packages. Do NOT turn FYD into Payload; the task explicitly forbids it.

DATA MODEL: Collections (repeatable document groups: Pages, Posts, Media, Users), Globals (singletons: site settings, nav, footer), and a rich field system: text, richText (Lexical), relationship (auto-resolved, validated references instead of manual IDs), upload, array, group, blocks (layout builder: pages composed from predefined block types like Hero/Content/CTA/Media/Archive/Banner/Code/Form), code, select, date. Relationships preferred over manual ID references: the CMS resolves and validates them.

MUTATION MODEL: Mutations go through the Local API or REST/GraphQL, all passing through field validation, access control, and hooks (`beforeChange`, `afterChange`, `afterDelete`). Security rule with teeth: the Local API skips access control by default, so every caller-reachable path must pass `overrideAccess: false` plus the authenticated user; `overrideAccess: true` is only acceptable for trusted server-internal work (seeds, migrations, system jobs). Client-triggered mutations go through server functions, never an exposed raw surface.

UNDO MODEL: Versions. `versions: { drafts: true }` gives draft/published states plus full revision history (`maxPerDoc` configurable, e.g. 50). `_status` field (`draft` | `published`) is injected automatically. Version restore is the undo path. `schedulePublish` uses the jobs queue.

PREVIEW MODEL: Draft preview flows through `admin.preview` to a `/next/preview` route that verifies a preview secret, authenticates the user, enables Next.js Draft Mode, and queries with `draft: true`. Live preview uses autosave (e.g. `autosave.interval: 100`) so the frontend refreshes on save. Public reads filter `_status: 'published'`; draft content is only reachable in preview mode. After publish, `afterChange` hooks revalidate affected paths/tags.

COMPONENT MODEL: Blocks. One file per block exporting both the block config (slug, fields, interfaceName) and the React render component. `RenderBlocks` maps a page's block array to components by `blockType`. A standard block library pattern: Hero (with variants), Content (column layouts), CTA, Media, Archive, Banner, Code, FormBlock.

THEME MODEL: Not a Payload concern; theming is frontend-owned.

AGENT MODEL: April 2026 AI turn: built-in eval suite measuring AI codegen quality against Payload configs, plus AI auto-embedding for RAG. Agents operate through the same Local/REST APIs as humans, subject to the same access control.

COLLABORATION MODEL: Database-backed optimistic concurrency at the document level; autosave drafts; no CRDT.

EXPORT MODEL: Content is database rows exposed via typed APIs; migration via forward migrations and seed scripts.

WHAT FYD CAN HARVEST (patterns only, never the product):
1. versions + drafts + `_status` as the canonical shape for FYD's VALIDATE -> PREVIEW -> APPROVE -> APPLY: every patch stream produces a draft version; approve flips `_status` to published; versions give free undo and audit.
2. Composable access primitives (`anyone`, `authenticated`, `authenticatedOrPublished`) defined once and combined per collection: FYD's owner visibility override and per-section visibility rules should be one composable set, not inline logic.
3. `overrideAccess: false` by default discipline: every FYD mutation path, including the agent's, must carry the actor and pass access control; a privileged internal path exists only for trusted system work and is labeled as such. This is the enforcement detail behind the Paperboy principle.
4. Preview-secret + Draft Mode pattern: preview is a separate, signed, authenticated read path (`draft: true`), never a flag the public API can stumble into. Public keys see published only: the no-leak boundary.
5. `afterChange` revalidation hooks: after apply, invalidate exactly the affected routes/projections. FYD's compiler should emit its own invalidation set per patch batch.

---

## 5. Automerge (automerge/automerge)

PRIMITIVE: Local-first sync engine built on CRDTs (RGA + LWW for maps, Peritext for rich text, counters). JSON-like documents with automatic conflict-free merging, offline-first, and a Git-like change DAG.

LICENSE: MIT. Verified across multiple 2026 sources.

MATURITY: Production. v3.x stable since Automerge 2.0 (Jan 2023); ~85K weekly npm downloads; 4.2K stars. Packages: `@automerge/automerge` (Rust core compiled to WASM, ~320 kB min+gz), `@automerge/automerge-repo` (Repo, DocHandle, NetworkAdapter, StorageAdapter), `@automerge/react` (hooks), storage adapters (IndexedDB, NodeFS), network adapters (WebSocket, BroadcastChannel, MessageChannel), `@automerge/prosemirror`. Note the bundle cost: ~320 kB WASM is heavy for a customer-facing site bundle.

DEPENDENCY COST: WASM build pipeline (vite-plugin-wasm, top-level await), network adapter choice, storage adapter choice. No built-in cryptographic signing: authorship is asserted, not verified. Awareness/presence is DIY (no built-in ephemeral state, unlike Yjs/Loro).

DATA MODEL: JSON-like: Maps (LWW per key), Lists (RGA), Text (Peritext collaborative spans), Counters, plus ImmutableString for atomic non-collaborative values, bytes, dates. Changes form a content-addressed DAG (SHA-256 per change, actor ID + sequence number, dependencies array): full Git-like history, diffable, replayable.

MUTATION MODEL: Local changes applied immediately, synced as changes to peers; concurrent edits merge automatically with deterministic semantics. Sync protocol is peer-to-peer (state or op based). No central validation: convergence is structural, not semantic.

UNDO MODEL: Strong. The change DAG makes undo/redo natural (Automerge ships undo support on top of history): revert to a prior change set deterministically.

PREVIEW MODEL: None native; preview is whatever the application renders from the local doc.

COMPONENT MODEL: None.

THEME MODEL: None.

AGENT MODEL: None native; an agent is just another actor ID in the change DAG.

COLLABORATION MODEL: This IS the collaboration layer: offline-first, multi-writer, automatic merge, cross-tab via BroadcastChannel, P2P via WebSocket adapters. The reason FYD would ever consider it.

EXPORT MODEL: Binary format plus JSON export of document state; history is the audit trail.

WHERE THE SEAM SITS FOR FYD: strictly optional, strictly above the PING canonical events, and only in the SiteSpec editing layer. Shape: two or more editors (human in visual editor + agent proposing patches) co-edit a draft SiteSpec document via Automerge for live convergence; when the draft is ready, the merged document is projected through FYD's own typed patch stream into VALIDATE -> PREVIEW -> APPROVE -> APPLY. The Automerge doc is a scratch convergence surface, never the record: canonical truth remains the approved SiteSpec version plus the PING event log. Do not let CRDT merge semantics decide published content; merge resolves editing conflicts, approval decides truth. The heavy WASM bundle and lack of signing also argue for keeping it out of the customer-facing render path: use it only in the editor surface, if ever.

WHAT FYD CAN HARVEST:
1. The change DAG as the model for patch-stream auditability: every applied patch records actor, sequence, and dependencies, making the approval history replayable.
2. Actor-labeled changes as the provenance pattern: human vs agent edits are distinguishable in history (cf. Paperboy's agent badges).
3. ImmutableString for atomic non-collaborative values: a useful primitive for fields where last-writer-wins is wrong and merge is meaningless (e.g. a published boolean must be set atomically, not merged).
4. Nothing else until multi-editor real-time collaboration is a real product requirement. Yjs remains the alternative if text-heavy co-editing ever matters; Automerge wins if history/audit is the priority.

---

## 6. Paperboy (hybriden/paperboy)

PRIMITIVE: Open-source, headless, editor-first CMS for teams of humans and agents. TypeScript monorepo: Fastify v5 Management + Delivery API, React 19 admin with visual on-page editing, Next.js reference frontend, stdio MCP server, all on PostgreSQL + Drizzle. Repo: https://github.com/hybriden/paperboy

LICENSE: MIT. Verified on repo page.

MATURITY: Early but unusually rigorous. Created 2026-06-01, 451 commits, 1 star, CI green, test-enforced MCP<->API parity. No releases yet. Ideas and contracts are the harvest, not the codebase.

DEPENDENCY COST: If taken as a product: Postgres 16, Node 24, Fastify, Drizzle, React admin. As a harvest source: zero; take the patterns.

DATA MODEL: Data-driven content types (pages, blocks, globals defined as data, not code). Content areas with inline + shared blocks and per-field allowed types. Multisite: several brands in one instance, partition enforced deny-by-default in the same chokepoints. Locales with document-level i18n and fallback chain. No-leak Delivery API: one read chokepoint with a `perspective`; public keys see published only, private fields never serialize, preview keys see drafts. SEO and schema.org computed server-side per page (title/description/canonical/robots/OG/Twitter, per-@type JSON-LD with breadcrumb trail), driven by field-level SEO roles.

MUTATION MODEL: One Zod schema per route drives runtime validation + response serialization + OpenAPI 3.1, so the three can never drift. The MCP server imports the same `@paperboy/db` query layer and calls the same functions as the API, inheriting RBAC + validation + the no-leak chokepoint + audit. DB invariants are encoded as partial unique indexes (one live published + one draft per variant). All object-level authorization lives in the data layer, deny-by-default. Forms are content: delivered as schema, never markup; submissions validated server-side against the current published definition; unknown fields rejected, not quietly stored.

UNDO MODEL: Version history + restore, trash/restore, duplicate. Every version records human-vs-agent provenance (agent badges), and agent drafts carry a review flag with an opt-in gate that keeps agents from publishing unreviewed work.

PREVIEW MODEL: Signed, short-lived preview token: admin requests a token from its own API and passes it as `?pbt=`; verification runs through `@paperboycms/client/preview-token`, a separate subpath whose first argument is the preview secret, so nothing browser-bound can hold it. Preview responses are always `noindex`. Visual on-page editing via `@paperboycms/preview`: framework-agnostic, zero-dependency bridge; single source of truth for the admin<->frontend postMessage protocol and the `data-pb-*` DOM contract; edits patch live in preview.

COMPONENT MODEL: Content types and blocks defined as data. Delivery items ship `fieldTypes` (the declared type per public field) so frontends switch on schema instead of sniffing value shapes. Render helpers read schema, never values.

THEME MODEL: Token-based design system (CSS variables), light/dark themes with system preference plus persistence, self-hosted fonts. Theme is frontend-owned; the CMS ships tokens, not pixels.

AGENT MODEL: Agents are first-class editors, not an integration afterthought. The MCP server drives the whole CMS and its parity with the REST API is test-enforced (`apps/api/test/mcp-parity.test.ts`). Agent provenance is recorded per version. An optional AI writing assistant (improve/rewrite/summarize, vision alt text from actual image bytes, schema.org suggestions) refuses honestly with a clear error when no API key is configured instead of faking output.

COLLABORATION MODEL: Database-backed; no CRDT. Multi-user safety comes from versions, drafts, and the single-write-path contract.

EXPORT MODEL: Typed Delivery API SDK (`@paperboycms/client`, published to npm, ETag-aware) so frontends integrate against a contract, not the CMS codebase. Publish webhooks (HMAC) for downstream invalidation.

WHAT FYD CAN HARVEST:
1. The single-mutation-contract principle, stated precisely: every write path (visual editor, REST, MCP, agent) calls the same data-layer functions and therefore inherits the same validation, the same permissions, and the same audit trail; parity between the agent path and the API path is enforced by tests, not by convention. There is no privileged AI backdoor: the agent's patches enter through the identical typed, validated, authorized, audited pipeline as a human's click.
2. The no-leak read chokepoint: one read path with a perspective; public sees published, preview sees drafts, private fields never serialize. FYD's owner visibility override should be this chokepoint, not a flag checked in components.
3. Agent provenance per version plus an agent-publish gate: every applied patch records whether a human or an agent wrote it, and agent-authored drafts require one-click approval before publish. This maps directly onto FYD's APPROVE stage.
4. Forms-as-schema: interactive structures (forms, and by extension configurators/booking widgets) are delivered as validated schemas, never markup. The renderer styles them; the contract owns them. Relevant to FYD's service-business widgets.
5. Honest refusal: the optional AI layer refuses with a clear error when unconfigured instead of faking output. A standing rule worth adopting for any FYD agent surface.

---

## INDEPENDENT SITESPEC IR vs FYD SITESPEC: the 3-5 sharpest portable ideas

FYD's SiteSpec already owns: deterministic IR, binding verifier, object references and queries over copied facts, the typed patch stream mutation direction, and zero customer-specific renderer code. The independent project is earlier-stage and Astro-coupled, but it has spent its design budget on IR surface area FYD has not yet covered. The portable ideas, sharpest first:

1. Controlled section composition with archetypes. Their Page Spec declares `archetype:` (e.g. `detail`, `article`) plus an explicit sections list with `use:` references. The archetype constrains which sections are legal and in what order; the sections list composes the page. FYD should adopt archetypes as a validation-time contract on its page specs: an archetype is a named, testable promise about page shape (hero + services + proof + contact for a trade detail page), which makes both the binding verifier and the agent's patch generator dramatically more constrained. The agent stops guessing page structure and starts filling archetype slots.

2. Resolution-before-render as an explicit, staged pipeline with named reference kinds. They resolve `entry:` refs, `query:` refs, `param:` refs, relations, sorting, pagination, and draft filtering in core, in a fixed order, and components receive final props only. FYD's direction matches, but naming the reference kinds and fixing the resolution order as a versioned contract (their specVersion) turns "resolve before rendering" from an architectural intention into a testable pipeline. Adopt: a named, ordered resolution stage list that the binding verifier asserts against, plus draft/published filtering as a built-in query semantic rather than a per-query concern.

3. Design System as spec data: semantic tokens, variant x state contracts, controlled token extensions, and a Design Lab that renders the system itself. FYD's zero-customer-renderer-code floor is about components; the independent project shows the theme layer deserves the same treatment: themes and states as validated data the agent can mutate through the patch stream (change a token, preview the state matrix) instead of as code or as free-form props. The Design Lab concept (render tokens, state matrices, stress fixtures directly from the installed design system, with no preview behavior leaking into production routes) is the shape FYD's PREVIEW stage should grow into for design changes.

4. Dynamic route expansion discipline: every production path declared up front in `page.paths`, no runtime route discovery. If FYD ever generates location/service detail pages from business data, the patch stream should declare the full path set at generation time. Deterministic route sets keep builds, previews, sitemaps, and the binding verifier reproducible.

5. Evidence-first migration as a staged pipeline (audit -> DOM segmentation -> design-system analysis -> non-destructive staging -> materialize). FYD's onboarding story for existing customer sites should be a pipeline of patch-stream batches, each stage reviewable, not a single big-bang import. The key transferable discipline: staging is non-destructive and each stage has explicit human review gates before materialization.

What NOT to take: the Astro coupling, the Git-as-database mutation model (FYD's typed patch stream with versions/drafts is strictly stronger and matches the Payload/Paperboy harvest), and the single-writer assumption.

---

## Cross-project decision summary

- Patch stream shape: adopt json-render's `{"op","path","value"}` JSONL line contract with JSON-pointer paths into the SiteSpec document. Validation between every patch; targeted repair on failure.
- Prompt/validator unity: generate the agent's system prompt from the component/section catalog (json-render's `catalog.prompt()`), so prompt and validator cannot drift.
- Single mutation contract (Paperboy): visual editor, chat customization, REST/API, agent, and MCP all emit the same typed patches through the same validate -> authorize -> apply path, with test-enforced parity. No privileged AI backdoor.
- Versions as undo (Payload/Paperboy): every patch batch produces a draft version; `_status` draft/published; version restore is undo; agent provenance recorded per version with a publish gate.
- No-leak preview (Paperboy/Payload): preview is a signed, separate read path; public sees published only; owner visibility override is a chokepoint, not a component flag.
- CRDT stays future-optional (Automerge): seam sits in the SiteSpec editing layer above PING events, as a scratch convergence surface only. Canonical truth remains approved versions plus PING canonical events. No signing, heavy WASM, and merge-semantics-must-not-decide-truth all argue against any deeper role.
- Structured generation typing (AI SDK): schema-bind patch payloads at generation time with Zod; keep approval (consent) separate from authorization (entitlement inside the mutation contract).
