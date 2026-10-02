# Ecosystem Harvest: Builder / AI-SDK / Acquisition Verdict Sheets

Date: 2026-09-22. Lane: read-only research. No product code changed, no commits, no pushes, no new authorities.
PING repo searched FIRST for every overlap (Pig `/home/nolan/projects/ping`, branch `fyd/builder-composition`, HEAD `c4652be2`).

Rule for every sheet: PING stays canonical. These are adapters, vocabularies, or patterns. Nothing here becomes a truth authority. No `AdAuthority`, no `ClaimAuthority` created or proposed.

---

## 1. vercel-labs/json-render — ADAPT (patterns only; do not adopt the package)

**What:** Generative-UI framework. Developer defines a component catalog with Zod prop schemas (constrained vocabulary); AI generates flat-tree JSON specs limited to the catalog; a runtime registry renders them. Streaming via SpecStream (JSONL carrying RFC 6902 ops). Data binding via `$state` / `$bindState` / `$item` / `$index`. Named events map to action handlers.

**Version:** `@json-render/core` 0.21.0 (npm, verified 2026-09-22). **License:** Apache-2.0 (verified via npm).

**PING overlap (searched first):** HIGH. `src/fyd/components/registry.ts` already implements the typed catalog: seventeen section components plus GenericObjectCard, schema-to-component mapping, `eligibleComponents()`, validator and renderer consuming one mapping, `editableProperties`, `variants`, responsive constraints. `src/fyd/sitespec/schemas.ts` + `validator.ts` are the constrained vocabulary. `src/fyd/proceduralize/generator.ts` is the spec producer.

**Duplication vs PING/FYD:** Adopting the package would duplicate an already-built, evidence-bound registry. FYD's registry binds components to schema roles from the object graph; json-render's catalog binds them to whatever a prompt says.

**Lock-in risk:** Low-medium. Apache-2.0, but the catalog/spec format is Vercel's; migrating off is a rewrite of every spec producer.

**Canonicality risk:** MEDIUM-HIGH if adopted naively. json-render's mental model is prompt-driven ("AI generates UI"); FYD's invariant is evidence → objects → SiteSpec → deterministic render, with AI producing only typed `SitePatch` / `AnswerWithEvidence`. Letting the catalog outrank the object graph would collapse Layer 1 into Layer 2.

**Harvestable primitives:**
1. `catalog.prompt()` — generating a compact prompt plus JSON Schema FROM the component catalog. This is the actual gap: FYD's customize-intent path needs to tell the model what it may propose. Harvest the direction (catalog → prompt), not the package.
2. SpecStream JSONL patch streaming (RFC 6902 ops) for progressive rendering of long generations.
3. Render-boundary Zod validation of generated specs — the mechanical form of FYD's binding verifier ("no invented claims" at the render edge).
4. `$state`-style binding vocabulary as a projection-layer convention, kept out of canonical state.

**Tiny proof (proposed, not run):** In a scratch script, translate three FYD registry entries (name, acceptsSchemas, editableProperties) into a json-render-style catalog shape, generate the JSON Schema, and assert it accepts a valid FYDSection and rejects a hallucinated component name. Pass = the pattern ports; fail = the vocabularies are incompatible.

**Assumption falsified:** "json-render gives us the typed catalog we lack." FYD already has the catalog (`registry.ts` + `schemas.ts`). The harvestable part is catalog-derived prompting and boundary validation, not the catalog itself.

**Verdict: ADAPT the four primitives into FYD's own registry; REJECT adopting the package.** The object graph stays above the catalog, always.

---

## 2. puckeditor/puck — ADAPT (narrow: editing-surface patterns only; never canonical truth)

**What:** Modular MIT visual editor for React. `config` declares components with typed `fields` and a `render`; `<Puck>` is the drag-drop editor, `<Render>` is the read-only renderer; data is plain JSON the developer owns.

**Version:** `@puckeditor/core` 0.23.0 (npm, verified 2026-09-22). **License:** MIT (verified via npm and repo README).

**PING overlap (searched first):** Partial. `src/fyd/customize/` (`propose.ts`, `apply-layer.ts`, `intent.ts`) plus `src/fyd/owner-mode/customize-panel.tsx` is FYD's editing surface, but it is proposal-based (intent → SitePatch → approval → digest-bound application), not drag-drop. Puck's `fields` config overlaps `registry.ts`'s `editableProperties`/`variants`.

**Duplication vs PING/FYD:** Puck duplicates nothing in the decision pipeline; the genuine gap is a visual direct-manipulation affordance for owners. The customize panel is the current surface; Puck-shaped config is a candidate input device for it.

**Lock-in risk:** Low. MIT; "you own your data, no vendor lock-in" is the project's stated position and the data format is plain JSON.

**Canonicality risk:** HIGH if misused, and this is the hard boundary: Puck data is a page document. FYD's canonical truth is Layer 1 (objects, relationships, evidence). If Puck's JSON ever became the source of truth, the evidence graph dies. Any Puck-shaped input must enter through the normal proposal/transition seams as a `SitePatch` and survive the digest-bound approval loop like every other owner edit. Editing surface only. Never canonical truth.

**Harvestable primitives:**
1. Component config schema (typed fields → editable properties → validation) as the shape for exposing registry entries to an owner UI.
2. The Puck/Render split: the editor writes data, a SEPARATE deterministic renderer reads it. This validates FYD's Layer 2/3 split from an independent implementation.
3. Drag-drop reorder as an event source that emits structured section move/add/remove operations.

**Tiny proof (proposed, not run):** Map one FYD registry entry to a Puck `config` block in a scratch app, perform a drag-drop reorder, and verify the resulting JSON diff is expressible as FYD SitePatch ops (add/remove/move section). No integration; mapping proof only.

**Assumption falsified:** "Puck replaces the customize panel." FYD's owner edits are evidence-bound proposals with stale-base detection (`STALE PROPOSAL`); Puck has no such seam. Puck is an input device, not a decision system.

**Verdict: ADAPT the config-driven editing pattern and the editor/renderer data split. No integration now; any future use emits SitePatch through owner-mode seams.**

---

## 3. buildingopen/openpage — ADAPT (harvest the JSON-patch agent API; reject the "single source of truth" doctrine)

**What:** MIT open-source AI website builder. "JSON as the single source of truth": a Framer-like visual editor plus AI site generation, both operating on one structured typed JSON config. Humans edit visually; AI agents edit via JSON patches. 13 block components, `blocks/registry.tsx`, Zustand + immer, `@dnd-kit`, React 19, Tailwind v4.

**Version:** App repo, no published package version (README current within ~198 days). **License:** MIT (badge on README).

**PING overlap (searched first):** HIGH at the thesis level. `src/fyd/sitespec/` (types, schemas, validator, render-model) IS the JSON-first human+AI shared interface; `generator.ts` is the AI producer; `components/registry.ts` is the block registry. FYD already built OpenPage's thesis.

**Duplication vs PING/FYD:** OpenPage's site JSON ≈ FYD's SiteSpec; its `blocks/registry.tsx` ≈ FYD's `components/registry.ts`. Nothing to adopt; it is an app, not a library.

**Lock-in risk:** Low (MIT, and there is no dependency surface anyway).

**Canonicality risk:** MEDIUM, and this is the doctrinal point: OpenPage's slogan "JSON as the single source of truth" is the OPPOSITE of FYD's truth-layers doctrine (source truth / derived truth / presented truth + evidence). FYD's SiteSpec is deliberately Layer 2, derived from Layer 1 objects and evidence. Collapsing them into one JSON truth would destroy evidence binding and the "no invented claims" verifier's job.

**Harvestable primitives:**
1. JSON Patch (RFC 6902) as the agent edit API against the site JSON — the same op family as json-render's SpecStream. FYD's SitePatch ops (add/remove/move section, change variant/binding, feature object, change token/owner copy) map cleanly onto it; consider standardizing the wire shape.
2. Version history / undo-redo over the JSON document. FYD's proposal → approval → digest chain is the stronger, evidence-bound version; OpenPage's simpler history is a UX reference for presenting it.
3. Block metadata (`lib/block-metadata`) as a sibling of `registry.ts`'s `operationalEvidence` — usage/failure/shape-fit telemetry per component.

**Tiny proof (proposed, not run):** Express one FYD owner intent ("move services section above testimonials") as an RFC 6902 JSON Patch against a SiteSpec-shaped document; verify `customize/propose.ts` accepts the op sequence as a valid SitePatch. Pass = vocabulary compatibility.

**Assumption falsified:** "JSON as single source of truth is the goal." The layered truth model is the point; a single JSON truth is a regression dressed as simplicity.

**Verdict: ADAPT the JSON-patch agent API and versioned-history UX as patterns. REJECT the single-source-of-truth doctrine. SiteSpec stays derived, never canonical.**

---

## 4. Webstudio — REJECT (code/dependency); patterns only, reimplemented from scratch

**What:** Advanced open-source visual builder (Webflow-class): full CSS property support, headless-CMS-backed, self-hostable.

**Version:** webstudio-is/webstudio (SaaS + self-host; no single npm version). **License:** AGPL-3.0-or-later for core; the `sdk-components-animation` package is proprietary under a EULA. Per Nolan's directive: patterns only, NEVER copy code.

**PING overlap (searched first):** Low-medium. FYD has no CSS design-token system and no instance-style model; `sitespec` tokens and registry responsive constraints are the nearest neighbors. FYD's Layer 3 is deterministic rendering from SiteSpec, not a free-form style editor, so the overlap is adjacent, not direct.

**Duplication vs PING/FYD:** No current duplication; the risk is future temptation to lift the style engine.

**Lock-in risk:** HIGH if code were used, which it will not be. AGPL-3.0: network use of a modified version triggers source-disclosure obligations. Combined with the proprietary animation package, any integration is a legal minefield for a commercial product. The directive's "never copy code" stands.

**Canonicality risk:** Low as pure patterns; not applicable as a dependency since there will be none.

**Harvestable patterns (from public docs/architecture discussion, never from code):**
1. Style-source cascade: design tokens → component styles → instance overrides. A candidate shape for a future SiteSpec token layer, where a typography change propagates without touching business truth (Layer 2/3 separation made concrete).
2. Component-instance tree with prop bindings as the unit of rendering.
3. Builder → static-output publishing pipeline as a deployment-shape reference.

**Tiny proof (proposed, not run):** Architecture sketch only: show a FYD SiteSpec token change (typography scale) flowing through a style-source cascade to rendered output while the Layer 1 business objects remain byte-identical. No Webstudio code involved at any step.

**Assumption falsified:** "Webstudio is the fastest path to a visual builder." The AGPL makes it the most expensive path legally; the harvest is ideas, reimplemented, or nothing.

**Verdict: REJECT as code source and dependency. Documented architectural patterns may be reimplemented from scratch under FYD's own invariants. This is the strictest sheet on the page by design.**

---

## 5. Vercel AI SDK — ADOPT (normal paths only: structured output + provider abstraction)

**What:** TypeScript toolkit: `generateText`, `generateObject` / `streamObject` (Zod-validated structured output), `streamText`, `tool()` with Zod input schemas, provider abstraction (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, …), `useChat`/`useCompletion` hooks, RSC generative UI (`createStreamableUI`).

**Version:** `ai` 7.0.109, `@ai-sdk/anthropic` 4.0.59 (npm, verified 2026-09-22). **License:** Apache-2.0 (verified via npm).

**PING overlap (searched first):** None found. No `ai` SDK in `package.json` (only `@vercel/blob`), no provider abstraction in `src/`. This is a genuine gap: every future intelligence call (Ask FYD answers, planner SitePatches, customize intent classification) needs typed structured output and swappable providers.

**Duplication vs PING/FYD:** Low. Nothing to displace; it fills the empty "intelligence produces data" slot.

**Lock-in risk:** Low for the core (one-line provider swap is the design goal). MEDIUM for AI Gateway string model references (`model: "xai/grok-…"`) — that binds routing to Vercel's gateway. Rule: use explicit provider packages, never Gateway string refs.

**Canonicality risk:** LOW-MEDIUM, managed by construction. The SDK produces typed data; FYD validates it against SiteSpec/schemas at the boundary (the binding verifier). The model is an intelligence producer, never a truth authority. Risk appears only if raw model text is ever rendered without validation — which the renderer contract already forbves.

**Adopt (normal paths):**
1. `generateObject` + Zod = the mechanical form of FYD's invariant "AI produces typed `SitePatch` / `AnswerWithEvidence`, never arbitrary JSX." Define the Zod schemas once; every intelligence call returns validated data or fails closed.
2. Provider abstraction = no OpenAI/Anthropic lock-in; model choice becomes config, and evals can run the same prompt across providers.
3. `streamObject` for progressive Ask FYD answers with partial validation.

**Explicitly REJECT:** RSC generative UI / `createStreamableUI` and any model-written-component execution. That is the experimental path Nolan flagged against: it puts arbitrary model output inside the render path and violates "deterministic renderer produces UI."

**Tiny proof (proposed, not run):** Define Zod schemas for `SitePatch` and `AnswerWithEvidence`; call `generateObject` with the same prompt against two providers via their explicit packages; assert both outputs validate and the provider swap was exactly one import line. Pass = the FYD intelligence contract holds across providers.

**Assumption falsified:** "We need a custom LLM wrapper for FYD's typed outputs." The SDK is the boring-infrastructure choice (FYD's stated preference for boring infra over ornamental complexity); a hand-rolled wrapper would be the ornamental complexity.

**Verdict: ADOPT the normal paths (`generateObject`/`streamObject`/`generateText` + explicit provider packages). REJECT Gateway string refs and RSC generative UI.**

---

## 6. Crawl4AI — CONFIRM prior in-repo verdict (no re-evaluation needed)

**What:** Python async crawler with hardened extraction engine (SSRF validation, Shadow DOM flattening, 40+ CMP consent-dismissal list, anti-bot detection tiers).

**Version:** 0.9.3 (PyPI, per `src/fyd/proceduralize/ACQUISITION-STACK.md`). **License:** Apache-2.0 (per same doc, line 76).

**PING overlap (searched first):** The verdict sheet ALREADY EXISTS and is thorough: `src/fyd/proceduralize/ACQUISITION-STACK.md` (2026-09-21), referenced by `STRUCTURED-DATA.md` and `PUBLIC-SOCIAL-DATA-FABRIC.md`. Decisions: HARVEST design only (SSRF destination validation, declarative request trust boundary, DomainMapper/AsyncUrlSeeder, prefetch fast-discovery, Shadow DOM flattening, CMP list, 3-tier anti-bot *detection*); REJECT Docker API server (history of RCE/SSRF/auth-bypass/file-write advisories); REJECT LLM extraction (nondeterministic, prompt-injection surface, second provider-policy path); REJECT anti-bot circumvention and proxy escalation. Benchmarks vs current stack: HELD per Nolan's 2026-09-21 FOCUS NOW directive; trigger is "current stack cannot acquire required evidence" after the structured-data repair.

**Duplication vs PING/FYD:** None. Python library; FYD is TypeScript; the decision was always design-harvest, never dependency.

**Lock-in risk:** N/A — no dependency is taken.

**Canonicality risk:** Low for the adopted design harvest. The REJECTED LLM extraction was the canonicality risk (untrusted page text → prompt injection → invented claims at scale); it stays rejected.

**My contribution:** Confirm the sheet stands. Evidence it is still current: the two gaps closed by today's R2 fix were terminal-state write-path defects in the tandem pipeline, not acquisition failures — the benchmark trigger has NOT fired. No new information changes the 2026-09-21 decisions.

**Tiny proof (already exists in-repo):** The harvested patterns are re-implemented in the L0-L4 adapter semantics; the verdict sheet is the proof record.

**Assumption falsified:** "Crawl4AI needs re-evaluation from scratch in this lane." It does not. The prior sheet is complete, current, and consistent with everything observed today.

**Verdict: CONFIRM — HARVEST design only; REJECT Docker server, LLM extraction, and circumvention. Benchmarks remain HELD until the trigger fires.**

---

## 7. Lightpanda — REJECT as default dependency; CONDITIONAL escalation-ladder rung only

**What:** Headless browser written from scratch in Zig (not a Chromium fork). No rendering engine: fetches pages, runs JS via V8 against an in-memory DOM, drops the graphics pipeline. CDP-compatible (works with puppeteer-core / Playwright as a drop-in endpoint). Claims 11x faster execution, 9x lower memory than Chrome. Ships `fetch` (robots.txt-respecting), `serve` (CDP/WebDriver BiDi), `agent`, `mcp`, and `page.extract(schema)` structured extraction.

**Version:** Nightly builds only; no stable semver to pin. **License: AGPL-3.0** — verified live 2026-09-22 from the LICENSE file at github.com/lightpanda-io/browser (GNU Affero General Public License v3, 19 November 2007). Same copyleft class as Webstudio: patterns-only discipline applies; running a modified version as a network service triggers source disclosure.

**PING overlap (searched first):** Partial. `ACQUISITION-STACK.md` pins Playwright 1.63.0 as the L2 engine ("a real renderer"); `PUBLIC-SOCIAL-DATA-FABRIC.md` notes Crawl4AI-vs-Lightpanda-vs-current benchmarks HELD. Lightpanda would compete for the L2 acquisition slot, not the proof slot.

**Duplication vs PING/FYD:** Would duplicate Playwright's L2 role if adopted as the renderer. It does not duplicate anything as a fast DOM-only fetcher — that rung is currently the static fetcher / L0-L1 path.

**Lock-in risk:** HIGH. AGPL-3.0 plus nightly-only releases (no stable pin) violates FYD's pin-everything discipline — the Playwright sheet pins 1.63 precisely because "1.63's tracing wire changes broke unpinned third-party drivers; we do not repeat that." Depending on a nightly AGPL binary is the opposite of that lesson.

**Canonicality risk:** Low. It is an acquisition tool; it emits observations, not claims.

**Decisive falsification:** Lightpanda has NO rendering engine by design. Element position is simulated from DOM depth, not real layout; `Page.captureScreenshot` returns a placeholder, not a render. It can NEVER serve FYD's visual-proof requirement (browser evidence at five widths, machine-readable DOM + real pixels) or any pixel-dependent extraction. For bulk DOM acquisition it competes with Playwright on speed/memory; for proof it is disqualified by architecture. This is not a tunable parameter; it is the product's defining choice.

**Harvestable primitives:**
1. The "machines don't need pixels" argument as the CRITERION for splitting the stack: DOM-only bulk acquisition (Lightpanda-eligible) vs. visual proof (headed Chrome, never Lightpanda). The architecture gives us the vocabulary for the split.
2. `page.extract(schema)` built-in structured extraction as a pattern for the L0/L1 fast path.
3. Robots-respecting fetch as the default posture (matches the adapter's existing `check_robots_txt=true` default).

**Tiny proof (proposed, gated):** IF the benchmark trigger ever fires ("current stack cannot acquire required evidence" after structured-data repair): run the same 10-page DOM-text extraction through pinned Playwright 1.63 and a pinned-by-hash Lightpanda nightly; compare extracted-text equality, wall-clock, and RSS. Until the trigger fires: no runs, per Nolan's HELD directive.

**Assumption falsified:** "Lightpanda is a faster Playwright." It is a different KIND of tool: a DOM machine, not a browser. Faster at what it does; incapable of what FYD's proof loop needs.

**Verdict: REJECT as a default dependency (AGPL-3.0 + nightly-only + no rendering). CONDITIONAL ADAPT as an escalation-ladder rung for DOM-only bulk acquisition IF the trigger fires, behind a real benchmark and legal review of AGPL implications for our deployment shape. Never for visual proof. Never a default.**

---

## Cross-cutting record

- **PING searched first for every item** (bridge greps over `src/`, `package.json`, FYD docs) before any external lookup. Overlaps found: registry/sitespec/generator (json-render, openpage), customize/owner-mode (puck), ACQUISITION-STACK verdict sheet (crawl4ai, lightpanda, playwright). No overlaps: Vercel AI SDK (genuine gap), Webstudio (adjacent only).
- **Versions/licenses verified live 2026-09-22:** `@puckeditor/core` 0.23.0 MIT; `@json-render/core` 0.21.0 Apache-2.0; `ai` 7.0.109 Apache-2.0; `@ai-sdk/anthropic` 4.0.59 Apache-2.0; Crawl4AI 0.9.3 Apache-2.0 (in-repo record); Lightpanda AGPL-3.0 (LICENSE read live); Webstudio core AGPL-3.0-or-later (repo statement); OpenPage MIT (README badge).
- **No new authorities.** Nothing here becomes a truth, claim, projection, or ad authority. json-render's catalog is a vocabulary, not a ClaimAuthority; the render-boundary binding verifier keeps that job.
- **Truth layers hold:** OpenPage's "single source of truth" and json-render's prompt-driven catalog both had to be bent to fit FYD's source/derived/presented layering. The doctrine survived contact with all seven.
- **AGPL items (Webstudio, Lightpanda):** patterns only, never code; no dependency; legal review required before any deployment-shaped use.
- **Nothing executed beyond read-only research.** No code changed, no commits, no pushes. Tiny proofs are specified as future falsifiable checks, not run, except where this sheet says "verified."
